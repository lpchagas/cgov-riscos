<script setup lang="ts">
/**
 * ============================================================================
 * COMUNICAÇÕES À CGOV (`ComunicacoesView.vue`) — tela P-03 (LAC-04, UC-16)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Pela Metodologia (item 4.7.2; Minuta SEI 024421455) e pela Política RADAR (art. 17, IV;
 * Minuta SEI 024241420), a unidade avisa a CGOV em até 10 dias úteis
 * quando acontece uma das 6 situações (hipóteses I a VI) ou quando reavalia os
 * riscos depois do alerta de um KRI. Esta tela tem:
 *
 *   - a LISTA, com o filtro Todas · Novas · Ciência registrada. O prazo aparece
 *     como "no prazo" ou "fora do prazo" (da ciência até a data do envio);
 *   - o PAINEL LATERAL (`PainelComunicacao.vue`): "Nova comunicação" ou a
 *     comunicação recebida, onde a CGOV registra a ciência.
 *
 * Quem vê o quê (a RLS do banco é quem filtra de verdade):
 *   - gestor e demais perfis: as comunicações da própria unidade e "Nova comunicação";
 *   - CGOV: todas, com a coluna Unidade, e "Registrar ciência";
 *   - AUDIT: só lê (sem botões).
 *
 * Vindo do Monitoramento (`/comunicacoes?alerta=<id>`), o painel abre já com o
 * alerta do KRI. Alerta desconhecido ou já comunicado: fica a lista, com um aviso (R16).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useComunicacoesStore } from '../stores/comunicacoesStore';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { AlertaKri, ComunicacaoCgov } from '../types/radar.types';
import { HIPOTESES, diaDoMomento, siglaDaUnidade } from '../utils/hipotesesComunicacao';
import { dataCurta } from '../utils/painelResumo';
import PageHeader from '../components/ui/PageHeader.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela, OpcaoSegmento } from '../components/ui/tipos';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import Chip from '../components/ui/Chip.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import BrButton from '../components/govbr/BrButton.vue';
import PainelComunicacao from '../components/radar/PainelComunicacao.vue';

const route = useRoute();
const router = useRouter();
const comunicacoesStore = useComunicacoesStore();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();

const podeEnviar = computed(() => authStore.capacidades.enviaComunicacao);
const ehCgov = computed(() => authStore.capacidades.registraCienciaComunicacao);

// A tela sempre relê ao abrir (para a CGOV a lista já pode estar na memória, pelo menu).
// `abrirTela` também avisa a store de que a tela está aberta: se a sessão mudar depois
// (ex.: F5 no modo real), a ligação com a sessão relê a lista para qualquer perfil (I-1).
onMounted(() => void comunicacoesStore.abrirTela());
onUnmounted(() => comunicacoesStore.fecharTela());

/** Carregando → esqueleto; erro (das comunicações ou da carteira) → mensagem e "Tentar de novo". */
const estadoBloco = computed<'carregando' | 'erro' | 'pronto'>(() => {
  if (comunicacoesStore.erro || riscosStore.estado === 'erro') return 'erro';
  if (comunicacoesStore.carregando || riscosStore.estado !== 'pronto') return 'carregando';
  return 'pronto';
});
function tentarDeNovo(): void {
  if (riscosStore.estado === 'erro') void riscosStore.tentarDeNovo();
  void comunicacoesStore.carregar();
}

// ---------------------------------------------------------------------------
// LISTA + FILTRO
// ---------------------------------------------------------------------------
type Filtro = 'todas' | 'novas' | 'ciencia';
const filtro = ref<Filtro>('todas');
const opcoesFiltro = computed<OpcaoSegmento<Filtro>[]>(() => [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'novas', rotulo: `Novas (${comunicacoesStore.novas.length})` },
  { valor: 'ciencia', rotulo: 'Ciência registrada' },
]);
const linhas = computed(() => {
  const todas = comunicacoesStore.comunicacoes;
  if (filtro.value === 'novas') return todas.filter((c) => c.situacao === 'nova');
  if (filtro.value === 'ciencia') return todas.filter((c) => c.situacao === 'ciencia_registrada');
  return todas;
});

const sigla = (id: string) => siglaDaUnidade(riscosStore.unidades, id);
/** Códigos dos riscos ligados. Ex.: "RADAR-2026-001, RADAR-2026-004"; sem risco: "—". */
const codigos = (c: ComunicacaoCgov) =>
  c.riscoIds.map((id) => riscosStore.obterRiscoPorId(id)?.codigoRadar).filter(Boolean).join(', ') || '—';
/** Momento ISO → "24/11/2026" (calendário de Brasília). */
const diaDe = diaDoMomento;

/** Colunas da P-03. A CGOV, que recebe de todas as unidades, vê também a Unidade. */
const colunas = computed<ColunaTabela<ComunicacaoCgov>[]>(() => [
  { chave: 'hipotese', rotulo: 'Hipótese' },
  ...(ehCgov.value ? [{ chave: 'unidadeId', rotulo: 'Unidade' }] : []),
  { chave: 'riscoIds', rotulo: 'Risco' },
  { chave: 'dataCiencia', rotulo: 'Ciência', ordenavel: true },
  { chave: 'comunicadaEm', rotulo: 'Comunicação', ordenavel: true },
  { chave: 'noPrazo', rotulo: 'Prazo' },
  { chave: 'situacao', rotulo: 'Situação' },
]);

// ---------------------------------------------------------------------------
// PAINEL (nova comunicação ou comunicação recebida)
// ---------------------------------------------------------------------------
const painelNovoAberto = ref(false);
const alertaDoPainel = ref<AlertaKri | null>(null);
/** Guardamos o ID (e não o objeto): depois de registrar a ciência a store relê a lista. */
const selecionadaId = ref<string | null>(null);
const selecionada = computed(() => comunicacoesStore.comunicacoes.find((c) => c.id === selecionadaId.value) ?? null);
const painelAberto = computed(() => painelNovoAberto.value || selecionada.value !== null);

function abrirNova(alerta: AlertaKri | null = null): void {
  selecionadaId.value = null;
  alertaDoPainel.value = alerta;
  painelNovoAberto.value = true;
}
function abrirComunicacao(c: ComunicacaoCgov): void {
  painelNovoAberto.value = false;
  selecionadaId.value = c.id;
}
function fecharPainel(): void {
  painelNovoAberto.value = false;
  alertaDoPainel.value = null;
  selecionadaId.value = null;
  // Ao fechar, tira o `?alerta=` do endereço: recarregar a página não reabre o painel
  // (e, depois do envio, não mostra o aviso de "alerta já comunicado").
  if (route.query.alerta !== undefined) {
    const { alerta: _usado, ...resto } = route.query;
    void router.replace({ query: resto });
  }
}
function aoEnviar(): void {
  fecharPainel();
  mostrar({ tom: 'sucesso', mensagem: 'Comunicação enviada à CGOV.' });
}
function aoRegistrarCiencia(): void {
  mostrar({ tom: 'sucesso', mensagem: 'Ciência registrada.' });
}

// ---------------------------------------------------------------------------
// ?alerta=<id> — vindo da faixa do alerta no Monitoramento
// ---------------------------------------------------------------------------
const avisoAlerta = ref(false);
/**
 * Espera a carteira (com os alertas) estar pronta e então:
 *   - alerta ABERTO → abre "Nova comunicação" já preenchida;
 *   - desconhecido ou já encerrado → só a lista, com o aviso (R16).
 * Quem só lê (AUDIT) não recebe formulário. O `?alerta=` sai do endereço quando o painel fecha.
 */
watch(
  [() => route.query.alerta, () => riscosStore.estado],
  ([idAlerta, estado]) => {
    if (typeof idAlerta !== 'string' || estado !== 'pronto' || !podeEnviar.value) return;
    const alerta = riscosStore.alertasKri.find((a) => a.id === idAlerta);
    const aberto = alerta && riscosStore.alertaAbertoDoKri(alerta.kriId)?.id === alerta.id;
    if (alerta && aberto) {
      avisoAlerta.value = false;
      abrirNova(alerta);
    } else {
      avisoAlerta.value = true;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="comunicacoes">
    <PageHeader :titulo="route.meta.titulo ?? 'Comunicações à CGOV'" :descricao="route.meta.descricao" :fundamento="route.meta.fundamento">
      <template #acoes>
        <BrButton v-if="podeEnviar" variant="primary" icon="fa-solid fa-plus" @click="abrirNova()">Nova comunicação</BrButton>
      </template>
    </PageHeader>

    <BrMessage state="info">
      Comunique à CGOV em até 10 dias úteis da ciência do fato (Metodologia 4.7.2). A comunicação gravada não se apaga.
    </BrMessage>
    <BrMessage v-if="avisoAlerta" state="warning">Este alerta já foi comunicado ou não foi encontrado.</BrMessage>

    <EstadoCarregamento
      v-if="estadoBloco !== 'pronto'"
      :estado="estadoBloco"
      :erro="comunicacoesStore.erro ?? riscosStore.erro"
      formato="tabela"
      :linhas="5"
      @tentar-de-novo="tentarDeNovo"
    />
    <template v-else>
      <SegmentedControl v-model="filtro" :opcoes="opcoesFiltro" rotulo="Filtrar comunicações pela situação" />

      <DataTable :colunas="colunas" :linhas="linhas" chave-linha="id" legenda="Comunicações à CGOV" linha-clicavel @clique-linha="abrirComunicacao">
        <template #celula-hipotese="{ linha }">
          <span class="hipotese">
            {{ HIPOTESES[linha.hipotese].rotulo }}
            <span v-if="linha.supre.length" class="texto-apoio">supre {{ linha.supre.join(', ') }}</span>
          </span>
        </template>
        <template #celula-unidadeId="{ linha }">{{ sigla(linha.unidadeId) }}</template>
        <template #celula-riscoIds="{ linha }">{{ codigos(linha) }}</template>
        <template #celula-dataCiencia="{ linha }">{{ dataCurta(linha.dataCiencia) }}</template>
        <template #celula-comunicadaEm="{ linha }">{{ diaDe(linha.comunicadaEm) }}</template>
        <template #celula-noPrazo="{ linha }">
          <Chip v-if="linha.noPrazo" tom="sucesso" icone="fa-solid fa-check">no prazo</Chip>
          <Chip v-else tom="perigo" icone="fa-solid fa-clock">fora do prazo</Chip>
        </template>
        <template #celula-situacao="{ linha }">
          <Chip v-if="linha.situacao === 'nova'" tom="aviso" icone="fa-solid fa-envelope">Nova</Chip>
          <Chip v-else tom="sucesso" icone="fa-solid fa-check-double">Ciência registrada</Chip>
        </template>
        <template #vazio>
          <EmptyState
            :titulo="filtro === 'todas' ? 'Nenhuma comunicação' : 'Nenhuma comunicação neste filtro'"
            :descricao="filtro === 'todas' ? 'Quando a unidade comunicar um fato à CGOV, ele aparece aqui.' : 'Escolha outro filtro.'"
          />
        </template>
      </DataTable>
    </template>

    <PainelComunicacao
      :aberto="painelAberto"
      :comunicacao="selecionada"
      :alerta="alertaDoPainel"
      :pode-registrar-ciencia="ehCgov"
      @fechar="fecharPainel"
      @enviada="aoEnviar"
      @ciencia-registrada="aoRegistrarCiencia"
    />
  </div>
</template>

<style scoped>
.comunicacoes {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.hipotese {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 12rem;
}

.texto-apoio {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}
</style>
