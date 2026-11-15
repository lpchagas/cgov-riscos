<script setup lang="ts">
/**
 * ============================================================================
 * APROVAÇÕES (`CaixaValidacaoUmCliqueView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Padrão "caixa de entrada" (como um e-mail): a LISTA de pendências fica à
 * esquerda e o DETALHE do item escolhido à direita. No celular, um embaixo do
 * outro.
 *
 * Duas filas (os degraus do fluxo de governança da Política RADAR):
 *   - Coordenação-Geral (2º degrau): VALIDA o risco. Se ele for Crítico (fora
 *     do apetite da DAR), a store o envia sozinha para a Diretoria.
 *   - Diretoria (3º degrau): HOMOLOGA os Críticos e eles entram no Plano.
 *
 * "Devolver para ajuste" é uma ação que volta o trabalho para a unidade, por
 * isso abre uma janela de ALERTA e exige o despacho (o motivo).
 *
 * A fila e o item escolhidos ficam na URL (`/aprovacoes?fila=diretoria&id=…`):
 * dá para mandar o link de um item específico para outra pessoa.
 */
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { FichaRisco } from '../types/radar.types';
import { ROTULOS_CRITICIDADE, formatarDataHora } from '../utils/rotulosInterface';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import type { OpcaoSegmento } from '../components/ui/tipos';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import Dialog from '../components/ui/Dialog.vue';
import FormField from '../components/ui/FormField.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

type Fila = 'cg' | 'diretoria';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();

// ---------------------------------------------------------------------------
// FILA E ITEM ESCOLHIDOS (guardados na URL)
// ---------------------------------------------------------------------------
/** Fila padrão: a Diretoria abre direto na sua fila; os demais na da CG. */
const filaPadrao = (): Fila => (authStore.usuarioAtual.papel === 'diretor' ? 'diretoria' : 'cg');
const fila = computed<Fila>({
  get: () => (route.query.fila === 'diretoria' || route.query.fila === 'cg' ? route.query.fila : filaPadrao()),
  set: (f) => router.replace({ query: { fila: f } }),
});

const itens = computed<FichaRisco[]>(() =>
  fila.value === 'cg' ? riscosStore.filaValidacaoCg : riscosStore.filaHomologacaoDiretoria
);

const OPCOES_FILA = computed<OpcaoSegmento<Fila>[]>(() => [
  { valor: 'cg', rotulo: `Coordenação-Geral (${riscosStore.filaValidacaoCg.length})` },
  { valor: 'diretoria', rotulo: `Diretoria (${riscosStore.filaHomologacaoDiretoria.length})` },
]);

/** Item aberto: o da URL, se ainda estiver na fila; senão, o primeiro. */
const selecionado = computed<FichaRisco | null>(() => {
  const id = typeof route.query.id === 'string' ? route.query.id : null;
  return itens.value.find((r) => r.id === id) ?? itens.value[0] ?? null;
});

function abrir(risco: FichaRisco): void {
  router.replace({ query: { fila: fila.value, id: risco.id } });
  // No celular, leva a pessoa até o detalhe (que fica abaixo da lista).
  requestAnimationFrame(() => document.getElementById('detalhe-aprovacao')?.focus({ preventScroll: false }));
}

const podeAgir = computed(() => (fila.value === 'cg' ? authStore.podeAprovarCg : authStore.podeHomologarDiretoria));

// ---------------------------------------------------------------------------
// AÇÕES
// ---------------------------------------------------------------------------
function validar(risco: FichaRisco): void {
  riscosStore.aprovarEmUmCliqueCg(risco.id);
  const foiParaDiretoria = risco.statusFluxo === 'em_homologacao_dir';
  mostrar({
    tom: 'sucesso',
    mensagem: foiParaDiretoria
      ? `${risco.codigoRadar} validado e enviado à Diretoria (é Crítico).`
      : `${risco.codigoRadar} validado e incluído no Plano.`,
  });
}

function homologar(risco: FichaRisco): void {
  riscosStore.homologarEmUmCliqueDiretoria(risco.id);
  mostrar({ tom: 'sucesso', mensagem: `${risco.codigoRadar} homologado e incluído no Plano de Gestão de Riscos.` });
}

// Devolução: janela de alerta com despacho obrigatório
const devolvendo = ref<FichaRisco | null>(null);
const despacho = ref('');
const erroDespacho = ref<string | undefined>();

function pedirDevolucao(risco: FichaRisco): void {
  devolvendo.value = risco;
  despacho.value = '';
  erroDespacho.value = undefined;
}

function confirmarDevolucao(): void {
  if (!devolvendo.value) return;
  if (despacho.value.trim().length < 10) {
    erroDespacho.value = 'Explique o ajuste necessário (pelo menos 10 caracteres).';
    return;
  }
  const r = devolvendo.value;
  riscosStore.solicitarAjusteRapido(r.id, despacho.value.trim());
  devolvendo.value = null;
  mostrar({ tom: 'aviso', mensagem: `${r.codigoRadar} devolvido à unidade para ajuste.` });
}

// Se a fila esvaziar ou o item sair dela, limpa o id da URL.
watch(selecionado, (s) => {
  if (!s && route.query.id) router.replace({ query: { fila: fila.value } });
});

/** Data em que o risco entrou na fila atual (último evento do histórico). */
const enviadoEm = (r: FichaRisco) => {
  const ultimo = r.historicoFluxo[r.historicoFluxo.length - 1];
  return ultimo ? formatarDataHora(ultimo.criadoEm) : '—';
};
</script>

<template>
  <div class="aprovacoes">
    <div class="aprovacoes__topo">
      <SegmentedControl v-model="fila" :opcoes="OPCOES_FILA" rotulo="Fila de aprovação" />
      <p class="texto-apoio">
        {{ fila === 'cg' ? '2º degrau: a Coordenação-Geral valida. Críticos seguem para a Diretoria.' : '3º degrau: a Diretoria homologa os riscos Críticos.' }}
      </p>
    </div>

    <p v-if="!podeAgir" class="aviso-perfil" role="note">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      {{ fila === 'cg' ? 'Só a Coordenação-Geral ou a CGOV validam.' : 'Só a Diretoria ou a CGOV homologam.' }}
      Para testar, troque o perfil no menu do usuário.
    </p>

    <div v-if="itens.length" class="caixa">
      <!-- LISTA -->
      <nav class="caixa__lista" aria-label="Pendências">
        <ul>
          <li v-for="r in itens" :key="r.id">
            <button
              type="button"
              class="item"
              :class="{ 'item--ativo': selecionado?.id === r.id }"
              :aria-current="selecionado?.id === r.id ? 'true' : undefined"
              @click="abrir(r)"
            >
              <span class="item__linha">
                <span class="codigo">{{ r.codigoRadar }}</span>
                <RiskBadge :classe="r.classificacaoResidual" :valor="r.nivelResidual" tamanho="sm" />
              </span>
              <span class="item__objeto">{{ r.nomeObjetoCache }}</span>
              <span class="item__meta">{{ r.categoriaNome }} · enviado em {{ enviadoEm(r) }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- DETALHE -->
      <section
        v-if="selecionado"
        id="detalhe-aprovacao"
        class="caixa__detalhe"
        tabindex="-1"
        :aria-label="`Detalhe de ${selecionado.codigoRadar}`"
      >
        <header class="detalhe__cabecalho">
          <div>
            <p class="codigo">{{ selecionado.codigoRadar }}</p>
            <h2 class="detalhe__titulo">{{ selecionado.nomeObjetoCache }}</h2>
            <p class="texto-apoio">
              {{ selecionado.categoriaNome }}
              <template v-if="selecionado.subcategoriaIntegridade">· {{ selecionado.subcategoriaIntegridade }}</template>
              · {{ selecionado.responsavelRiscoNome }}
            </p>
          </div>
          <Chip :tom="ROTULOS_CRITICIDADE[selecionado.statusCritico].tom" :icone="ROTULOS_CRITICIDADE[selecionado.statusCritico].icone">
            {{ ROTULOS_CRITICIDADE[selecionado.statusCritico].rotulo }}
          </Chip>
        </header>

        <h3 class="detalhe__subtitulo">O risco</h3>
        <p class="detalhe__texto">{{ selecionado.descricaoPadrao }}</p>

        <h3 class="detalhe__subtitulo">A conta</h3>
        <MemoriaCalculoBar
          :probabilidade="selecionado.probabilidade"
          :impacto="selecionado.impacto"
          :nivel-inerente="selecionado.nivelInerente"
          :classificacao-inerente="selecionado.classificacaoInerente"
          :eficacia-controle="selecionado.nivelEficaciaControle"
          :fator-controle="selecionado.fatorControle"
          :possui-evidencia="selecionado.possuiEvidenciaControle"
          :nivel-residual="selecionado.nivelResidual"
          :classificacao-residual="selecionado.classificacaoResidual"
          :status-critico="selecionado.statusCritico"
        />

        <footer class="detalhe__acoes">
          <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: selecionado.id } }" class="link-acao">
            Ver ficha completa <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </RouterLink>
          <span class="detalhe__botoes">
            <BrButton variant="secondary" icon="fa-solid fa-rotate-left" :disabled="!podeAgir" @click="pedirDevolucao(selecionado)">
              Devolver para ajuste
            </BrButton>
            <BrButton
              v-if="fila === 'cg'"
              variant="primary"
              icon="fa-solid fa-check"
              :disabled="!podeAgir"
              @click="validar(selecionado)"
            >
              Validar risco
            </BrButton>
            <BrButton v-else variant="primary" icon="fa-solid fa-stamp" :disabled="!podeAgir" @click="homologar(selecionado)">
              Homologar risco
            </BrButton>
          </span>
        </footer>
      </section>
    </div>

    <EmptyState
      v-else
      class="cartao"
      :titulo="fila === 'cg' ? 'Nada aguardando validação' : 'Nada aguardando homologação'"
      descricao="Quando uma unidade enviar um risco, ele aparece aqui."
      icone="fa-regular fa-circle-check"
    />

    <!-- DEVOLUÇÃO (ação que volta o trabalho para a unidade) -->
    <Dialog
      :aberto="devolvendo !== null"
      tipo="alerta"
      :titulo="devolvendo ? `Devolver ${devolvendo.codigoRadar} para ajuste?` : ''"
      @fechar="devolvendo = null"
    >
      <p class="detalhe__texto">A unidade receberá o risco de volta com o seu despacho. A ação fica registrada na auditoria.</p>
      <FormField rotulo="Despacho (o que precisa ser ajustado)" :erro="erroDespacho" obrigatorio v-slot="{ attrs }">
        <textarea v-bind="attrs" v-model="despacho" rows="3"></textarea>
      </FormField>
      <template #acoes>
        <BrButton variant="secondary" @click="devolvendo = null">Cancelar</BrButton>
        <BrButton variant="danger" @click="confirmarDevolucao">Devolver risco</BrButton>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.aprovacoes {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.aprovacoes__topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2) var(--esp-4);
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.aviso-perfil {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  padding: var(--esp-2) var(--esp-3);
  background: var(--superficie-container);
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.cartao {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
}

.codigo {
  margin: 0;
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
}

.link-acao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

/* --- Caixa de entrada: lista (1/3) + detalhe (2/3) --- */
.caixa {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) minmax(0, 2fr);
  overflow: hidden;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.caixa__lista {
  border-right: 1px solid var(--borda);
  background: var(--superficie-container);
}

.caixa__lista ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  width: 100%;
  padding: var(--esp-3) var(--esp-4);
  border: 0;
  border-bottom: 1px solid var(--borda);
  border-left: 4px solid transparent;
  background: transparent;
  color: var(--texto);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.item:hover {
  background: var(--superficie-alta);
}

.item--ativo {
  border-left-color: var(--cor-primaria);
  background: var(--superficie);
}

.item__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2);
}

.item__objeto {
  font-weight: var(--peso-semi);
  line-height: 1.3;
}

.item__meta {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.caixa__detalhe {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  min-width: 0;
  padding: var(--esp-5);
}

.caixa__detalhe:focus {
  outline: none;
}

.detalhe__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-3);
}

.detalhe__titulo {
  margin: var(--esp-1) 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
  line-height: 1.3;
}

.detalhe__subtitulo {
  margin: var(--esp-2) 0 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detalhe__texto {
  margin: 0;
  line-height: 1.55;
}

.detalhe__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  margin-top: var(--esp-2);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--borda);
}

.detalhe__botoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

@media (max-width: 991.98px) {
  .caixa {
    grid-template-columns: minmax(0, 1fr);
  }
  .caixa__lista {
    border-right: 0;
    border-bottom: 1px solid var(--borda);
  }
  .caixa__detalhe {
    padding: var(--esp-4);
  }
}
</style>
