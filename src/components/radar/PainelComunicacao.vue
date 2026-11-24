<script setup lang="ts">
/**
 * ============================================================================
 * PAINEL DA COMUNICAÇÃO À CGOV (`PainelComunicacao.vue`) — tela P-03 (LAC-04)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Painel lateral (`SideSheet`) da tela `/comunicacoes`, em dois jeitos:
 *
 *   1. NOVA COMUNICAÇÃO (sem `comunicacao`): formulário com a hipótese (I a VI), a data
 *      da ciência do fato, o prazo ("dia 3 de 10 dias úteis (vence em 03/12/2026)"),
 *      o risco ligado, a descrição, as providências e o documento SEI.
 *      - Hipóteses I, II, III e V exigem risco; IV (risco emergente) e VI, não.
 *      - Passou de 10 dias úteis? Aparece o aviso "Comunicação fora do prazo de 10 dias
 *        úteis", mas o envio NÃO é bloqueado (a comunicação atrasada vale mais que nenhuma).
 *      - Vindo do alerta de um KRI (`alerta`): a hipótese é "Alerta de indicador (KRI)",
 *        a data é a da ciência do alerta (só leitura), os riscos são os ligados ao KRI e
 *        aparecem as caixas "Esta comunicação supre as hipóteses I, II, III" (RF-109).
 *      - "Enviar à CGOV" fica desabilitado enquanto grava (clique duplo não duplica);
 *        a recusa do banco aparece como mensagem e o painel continua aberto.
 *
 *   2. COMUNICAÇÃO RECEBIDA (com `comunicacao`): todos os campos, só leitura, com
 *      "Recebida em dd/mm/aaaa" e o prazo cumprido ou não. Para a CGOV, se ainda não
 *      houve ciência: observação opcional e o botão "Registrar ciência".
 *
 * A comunicação gravada é imutável: não há "Editar" nem "Excluir" (o banco também não deixa).
 * Quem barra de verdade é o banco (RLS e `enviar_comunicacao`); aqui é conforto.
 */
import { computed, ref, watch } from 'vue';
import type { AlertaKri, ComunicacaoCgov, FichaRisco, HipoteseComunicacao } from '../../types/radar.types';
import type { NovaComunicacao } from '../../services/dados/tipos';
import { useRiscosStore } from '../../stores/riscosStore';
import { useComunicacoesStore } from '../../stores/comunicacoesStore';
import { useAuthStore } from '../../stores/authStore';
import { HIPOTESES, PRAZO_COMUNICACAO_DIAS_UTEIS } from '../../utils/hipotesesComunicacao';
import { diasUteisEntre, hojeEmBrasilia, somarDiasUteis } from '../../utils/diasUteis';
import { dataCurta } from '../../utils/painelResumo';
import SideSheet from '../ui/SideSheet.vue';
import FormField from '../ui/FormField.vue';
import Chip from '../ui/Chip.vue';
import BrMessage from '../govbr/BrMessage.vue';
import BrButton from '../govbr/BrButton.vue';

const props = defineProps<{
  aberto: boolean;
  /** Comunicação já gravada (modo "recebida", só leitura). Nula = nova comunicação. */
  comunicacao: ComunicacaoCgov | null;
  /** Alerta do KRI que originou a nova comunicação (`/comunicacoes?alerta=<id>`). */
  alerta: AlertaKri | null;
  /** true só para a CGOV: mostra "Registrar ciência" na comunicação nova. */
  podeRegistrarCiencia: boolean;
}>();

const emit = defineEmits<{ (e: 'fechar'): void; (e: 'enviada', id: string): void; (e: 'ciencia-registrada'): void }>();

const riscosStore = useRiscosStore();
const comunicacoesStore = useComunicacoesStore();
const authStore = useAuthStore();

/** As 6 hipóteses do item 4.7.2 da Política (o 'alerta_kri' só vem pelo alerta). */
const HIPOTESES_DO_FORMULARIO: HipoteseComunicacao[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const SUPRIVEIS = ['I', 'II', 'III'] as const;

const hoje = hojeEmBrasilia();
const codigo = (id: string) => riscosStore.obterRiscoPorId(id)?.codigoRadar ?? 'risco fora da sua visão';
const sigla = (id: string) => riscosStore.unidades.find((u) => u.id === id)?.sigla ?? '—';
/** Momento ISO → "24/11/2026" no calendário de Brasília. */
const diaDe = (iso: string) => dataCurta(hojeEmBrasilia(new Date(iso)));

// ---------------------------------------------------------------------------
// FORMULÁRIO DA NOVA COMUNICAÇÃO
// ---------------------------------------------------------------------------
const hipotese = ref<HipoteseComunicacao | ''>('');
const dataCiencia = ref('');
const riscoId = ref('');
const descricao = ref('');
const providencias = ref('');
const documentoSei = ref('');
const supre = ref<Array<'I' | 'II' | 'III'>>([]);
const erros = ref<{ hipotese?: string; data?: string; risco?: string; descricao?: string }>({});
const erroEnvio = ref<string | null>(null);
const enviando = ref(false);
// Campos do "Registrar ciência" (comunicação recebida), reiniciados junto com o formulário.
const observacao = ref('');
const erroCiencia = ref<string | null>(null);
const registrando = ref(false);


/**
 * R18: riscos que a pessoa pode ESCREVER (objetos onde grava: a unidade e as subunidades).
 * Se a leitura falhar, oferecemos os riscos visíveis: o banco recusa os de fora do alcance.
 */
const objetosOndeGravo = ref<Set<string> | null>(null);
const riscosDisponiveis = computed<FichaRisco[]>(() =>
  objetosOndeGravo.value ? riscosStore.riscos.filter((r) => objetosOndeGravo.value!.has(r.objetoId)) : riscosStore.riscos
);

/** Riscos ligados ao KRI do alerta (e que a pessoa pode escrever). */
const riscosDoAlerta = computed<FichaRisco[]>(() => {
  if (!props.alerta) return [];
  const kriId = props.alerta.kriId;
  return riscosDisponiveis.value.filter((r) => r.kris.some((k) => k.id === kriId));
});
const nomeDoKri = computed(() => {
  const id = props.alerta?.kriId;
  if (!id) return '';
  const kri = riscosStore.riscos.flatMap((r) => r.kris).find((k) => k.id === id) ?? riscosStore.krisSemRisco.find((k) => k.id === id);
  return kri?.nomeIndicador ?? '';
});

/** Hipótese efetiva (com alerta, sempre 'alerta_kri'). */
const hipoteseEfetiva = computed<HipoteseComunicacao | ''>(() => (props.alerta ? 'alerta_kri' : hipotese.value));
const exigeRisco = computed(() => (hipoteseEfetiva.value ? HIPOTESES[hipoteseEfetiva.value].exigeRisco : false));
const cienciaEfetiva = computed(() => (props.alerta ? props.alerta.cienciaEm : dataCiencia.value));

/**
 * Prazo de 10 dias úteis contados da ciência. O dia N NÃO soma 1: no dia da ciência é "dia 0".
 * Ex.: ciência 18/11/2026, hoje 24/11 → "dia 3 de 10 dias úteis (vence em 03/12/2026)".
 */
const prazo = computed(() => {
  const c = cienciaEfetiva.value;
  if (!c || c > hoje) return null;
  const dia = diasUteisEntre(c, hoje);
  return {
    texto: `dia ${dia} de ${PRAZO_COMUNICACAO_DIAS_UTEIS} dias úteis (vence em ${dataCurta(somarDiasUteis(c, PRAZO_COMUNICACAO_DIAS_UTEIS))})`,
    foraDoPrazo: dia > PRAZO_COMUNICACAO_DIAS_UTEIS,
  };
});

/** Volta o formulário ao começo e lê os riscos onde a pessoa grava, a cada abertura. */
function reiniciar(): void {
  hipotese.value = '';
  dataCiencia.value = '';
  riscoId.value = '';
  descricao.value = '';
  providencias.value = '';
  documentoSei.value = '';
  supre.value = [];
  erros.value = {};
  erroEnvio.value = null;
  observacao.value = '';
  erroCiencia.value = null;
  if (!props.comunicacao) {
    riscosStore
      .objetosOndeGravo()
      .then((ids) => (objetosOndeGravo.value = new Set(ids)))
      .catch(() => (objetosOndeGravo.value = null));
  }
}
watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) reiniciar();
  },
  { immediate: true }
);
// Trocou a hipótese? O erro do risco da tentativa anterior deixa de valer.
watch(hipotese, () => (erros.value = { ...erros.value, hipotese: undefined, risco: undefined }));

/**
 * Unidade que comunica. No modo real é a unidade do perfil (o banco confere o alcance).
 * Na demonstração o perfil simulado não tem unidade cadastrada: usamos a do risco escolhido
 * ou, sem risco, a de um risco que a pessoa pode escrever.
 */
function unidadeQueComunica(riscoIds: string[]): string {
  return (
    authStore.perfil?.unidadeId ??
    riscosStore.obterRiscoPorId(riscoIds[0] ?? '')?.unidadeId ??
    riscosStore.unidades.find((u) => u.sigla === authStore.usuarioAtual.unidadeSigla)?.id ??
    riscosDisponiveis.value[0]?.unidadeId ??
    ''
  );
}

function validar(riscoIds: string[]): boolean {
  const e: typeof erros.value = {};
  if (!hipoteseEfetiva.value) e.hipotese = 'Escolha a hipótese da comunicação.';
  if (!cienciaEfetiva.value) e.data = 'Informe a data da ciência do fato.';
  else if (cienciaEfetiva.value > hoje) e.data = 'A data da ciência não pode ser futura.';
  if (exigeRisco.value && riscoIds.length === 0) e.risco = 'Informe o risco ligado (obrigatório nesta hipótese).';
  if (!descricao.value.trim()) e.descricao = 'Descreva o fato comunicado.';
  erros.value = e;
  return Object.keys(e).length === 0;
}

async function enviar(): Promise<void> {
  if (enviando.value) return; // clique duplo: a segunda chamada não faz nada
  const riscoIds = props.alerta ? riscosDoAlerta.value.map((r) => r.id) : riscoId.value ? [riscoId.value] : [];
  if (!validar(riscoIds)) return;
  const dados: NovaComunicacao = {
    unidadeId: unidadeQueComunica(riscoIds),
    hipotese: hipoteseEfetiva.value as HipoteseComunicacao,
    dataCiencia: cienciaEfetiva.value,
    descricao: descricao.value.trim(),
    providencias: providencias.value.trim() || undefined,
    documentoSei: documentoSei.value.trim() || undefined,
    alertaId: props.alerta?.id,
    riscoIds,
    supre: props.alerta ? SUPRIVEIS.filter((h) => supre.value.includes(h)) : [],
  };
  enviando.value = true;
  erroEnvio.value = null;
  try {
    const id = await comunicacoesStore.enviar(dados);
    emit('enviada', id);
  } catch (e) {
    // Recusa do banco (já em português): o painel fica aberto com o motivo.
    erroEnvio.value = (e as Error).message;
  } finally {
    enviando.value = false;
  }
}

// ---------------------------------------------------------------------------
// COMUNICAÇÃO RECEBIDA: REGISTRAR CIÊNCIA (só a CGOV)
// ---------------------------------------------------------------------------
async function registrarCiencia(): Promise<void> {
  const c = props.comunicacao;
  if (!c || registrando.value) return;
  registrando.value = true;
  erroCiencia.value = null;
  try {
    await comunicacoesStore.registrarCiencia(c.id, observacao.value.trim() || undefined);
    emit('ciencia-registrada');
  } catch (e) {
    erroCiencia.value = (e as Error).message;
  } finally {
    registrando.value = false;
  }
}

const titulo = computed(() => (props.comunicacao ? HIPOTESES[props.comunicacao.hipotese].rotulo : 'Nova comunicação'));
const subtitulo = computed(() =>
  props.comunicacao ? `Recebida em ${diaDe(props.comunicacao.comunicadaEm)}` : 'Comunicação de fato à CGOV (Política, item 4.7.2)'
);
</script>

<template>
  <SideSheet :aberto="aberto" :titulo="titulo" :subtitulo="subtitulo" largura="34rem" @fechar="emit('fechar')">
    <!-- ======================= COMUNICAÇÃO RECEBIDA (só leitura) ======================= -->
    <template v-if="comunicacao">
      <dl class="detalhes">
        <div>
          <dt>Situação</dt>
          <dd>
            <Chip v-if="comunicacao.situacao === 'nova'" tom="aviso" icone="fa-solid fa-envelope">Nova</Chip>
            <Chip v-else tom="sucesso" icone="fa-solid fa-check">
              Ciência registrada em {{ comunicacao.cienciaCgovEm ? diaDe(comunicacao.cienciaCgovEm) : '—' }}
            </Chip>
          </dd>
        </div>
        <div>
          <dt>Unidade</dt>
          <dd>{{ sigla(comunicacao.unidadeId) }}</dd>
        </div>
        <div>
          <dt>Riscos ligados</dt>
          <dd>{{ comunicacao.riscoIds.length ? comunicacao.riscoIds.map(codigo).join(', ') : 'Nenhum (risco ainda sem ficha)' }}</dd>
        </div>
        <div v-if="comunicacao.supre.length">
          <dt>Supre as hipóteses</dt>
          <dd>{{ comunicacao.supre.join(', ') }}</dd>
        </div>
        <div>
          <dt>Ciência do fato</dt>
          <dd>{{ dataCurta(comunicacao.dataCiencia) }}</dd>
        </div>
        <div>
          <dt>Recebida em</dt>
          <dd>{{ diaDe(comunicacao.comunicadaEm) }}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd>
            {{ comunicacao.noPrazo ? 'No prazo' : 'Fora do prazo' }}: dia {{ comunicacao.prazoDiasUteis }} de 10 dias úteis
            (vencia em {{ dataCurta(comunicacao.venceEm) }})
          </dd>
        </div>
        <div>
          <dt>Descrição do fato</dt>
          <dd class="detalhes__texto">{{ comunicacao.descricao }}</dd>
        </div>
        <div v-if="comunicacao.providencias">
          <dt>Providências ou resultado da reavaliação</dt>
          <dd class="detalhes__texto">{{ comunicacao.providencias }}</dd>
        </div>
        <div v-if="comunicacao.documentoSei">
          <dt>Documento SEI</dt>
          <dd>{{ comunicacao.documentoSei }}</dd>
        </div>
        <div v-if="comunicacao.observacaoCgov">
          <dt>Observação da CGOV</dt>
          <dd class="detalhes__texto">{{ comunicacao.observacaoCgov }}</dd>
        </div>
      </dl>

      <form
        v-if="podeRegistrarCiencia && comunicacao.situacao === 'nova'"
        id="form-ciencia"
        class="formulario"
        novalidate
        @submit.prevent="registrarCiencia"
      >
        <BrMessage v-if="erroCiencia" state="danger">{{ erroCiencia }}</BrMessage>
        <FormField rotulo="Observação da CGOV" ajuda="Opcional. Fica registrada junto com a ciência." v-slot="{ attrs }">
          <textarea v-bind="attrs" v-model="observacao" rows="3"></textarea>
        </FormField>
      </form>
    </template>

    <!-- ============================== NOVA COMUNICAÇÃO ============================== -->
    <form v-else id="form-comunicacao" class="formulario" novalidate @submit.prevent="enviar">
      <BrMessage v-if="erroEnvio" state="danger" titulo="A comunicação não foi gravada">{{ erroEnvio }}</BrMessage>

      <!-- Vindo do alerta: hipótese e data fixas (só leitura). -->
      <dl v-if="alerta" class="detalhes detalhes--destaque">
        <div>
          <dt>Hipótese</dt>
          <dd>{{ HIPOTESES.alerta_kri.rotulo }}<template v-if="nomeDoKri"> · {{ nomeDoKri }}</template></dd>
        </div>
        <div>
          <dt>Data da ciência do alerta</dt>
          <dd>{{ dataCurta(alerta.cienciaEm) }}</dd>
        </div>
      </dl>
      <template v-else>
        <FormField
          rotulo="Hipótese"
          :ajuda="hipotese ? HIPOTESES[hipotese].explicacao : 'Qual das situações do item 4.7.2 da Política aconteceu?'"
          :erro="erros.hipotese"
          obrigatorio
          v-slot="{ attrs }"
        >
          <select v-bind="attrs" v-model="hipotese">
            <option value="">Selecione a hipótese</option>
            <option v-for="h in HIPOTESES_DO_FORMULARIO" :key="h" :value="h">{{ HIPOTESES[h].rotulo }}</option>
          </select>
        </FormField>
        <FormField rotulo="Data da ciência do fato" ajuda="Dia em que a unidade soube do fato. O prazo começa aqui." :erro="erros.data" obrigatorio v-slot="{ attrs }">
          <input v-bind="attrs" v-model="dataCiencia" type="date" :max="hoje" />
        </FormField>
      </template>

      <!-- Prazo: informa sempre; fora do prazo, AVISA sem bloquear o envio. -->
      <p v-if="prazo" class="prazo"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Prazo: {{ prazo.texto }}</p>
      <BrMessage v-if="prazo?.foraDoPrazo" state="warning">
        Comunicação fora do prazo de 10 dias úteis. Envie mesmo assim e explique o atraso na descrição.
      </BrMessage>

      <div v-if="alerta" class="riscos-alerta">
        <p class="riscos-alerta__rotulo">Riscos ligados ao indicador</p>
        <p v-if="riscosDoAlerta.length">{{ riscosDoAlerta.map((r) => r.codigoRadar).join(', ') }}</p>
        <p v-else class="texto-apoio">Nenhum risco do indicador está no seu alcance.</p>
        <p v-if="erros.risco" class="erro" role="alert">{{ erros.risco }}</p>
      </div>
      <FormField
        v-else
        rotulo="Risco ligado"
        :ajuda="exigeRisco ? 'Obrigatório nesta hipótese.' : 'Opcional: o risco emergente ainda não tem ficha.'"
        :erro="erros.risco"
        :obrigatorio="exigeRisco"
        v-slot="{ attrs }"
      >
        <select v-bind="attrs" v-model="riscoId">
          <option value="">{{ exigeRisco ? 'Selecione o risco' : 'Nenhum risco ligado' }}</option>
          <option v-for="r in riscosDisponiveis" :key="r.id" :value="r.id">{{ r.codigoRadar }} — {{ r.eventoRisco }}</option>
        </select>
      </FormField>

      <!-- RF-109 / RN-085: a comunicação do alerta pode suprir as hipóteses I, II e III. -->
      <fieldset v-if="alerta" class="supre">
        <legend>Esta comunicação supre as hipóteses I, II, III</legend>
        <p class="texto-apoio">Marque as que a reavaliação também comunica (opcional).</p>
        <label v-for="h in SUPRIVEIS" :key="h" class="supre__opcao">
          <input v-model="supre" type="checkbox" :value="h" />
          {{ HIPOTESES[h].rotulo }}
        </label>
      </fieldset>

      <FormField rotulo="Descrição do fato" :erro="erros.descricao" obrigatorio v-slot="{ attrs }">
        <textarea v-bind="attrs" v-model="descricao" rows="4"></textarea>
      </FormField>
      <FormField rotulo="Providências ou resultado da reavaliação" v-slot="{ attrs }">
        <textarea v-bind="attrs" v-model="providencias" rows="3"></textarea>
      </FormField>
      <FormField rotulo="Documento SEI" ajuda="Opcional. Ex.: 02070.000000/2026-00." v-slot="{ attrs }">
        <input v-bind="attrs" v-model="documentoSei" type="text" />
      </FormField>
      <p class="texto-apoio">A data da comunicação é a do envio, posta pelo sistema. Depois de enviada, a comunicação não se altera.</p>
    </form>

    <template #acoes>
      <template v-if="comunicacao">
        <BrButton variant="secondary" @click="emit('fechar')">Fechar</BrButton>
        <BrButton
          v-if="podeRegistrarCiencia && comunicacao.situacao === 'nova'"
          variant="primary"
          type="submit"
          form="form-ciencia"
          :disabled="registrando"
          :aria-busy="registrando"
        >
          Registrar ciência
        </BrButton>
      </template>
      <template v-else>
        <BrButton variant="secondary" @click="emit('fechar')">Cancelar</BrButton>
        <BrButton variant="primary" type="submit" form="form-comunicacao" icon="fa-solid fa-paper-plane" :disabled="enviando" :aria-busy="enviando">
          Enviar à CGOV
        </BrButton>
      </template>
    </template>
  </SideSheet>
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.detalhes {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin: 0 0 var(--esp-4);
}

.detalhes--destaque {
  margin: 0;
  padding: var(--esp-3);
  background: var(--superficie-container);
  border: 1px solid var(--borda);
  border-radius: var(--raio-md);
}

.detalhes dt {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

.detalhes dd {
  margin: 0;
}

.detalhes__texto {
  white-space: pre-line;
}

.prazo {
  margin: 0;
  font-weight: var(--peso-semi);
}

.riscos-alerta p {
  margin: 0;
}

.riscos-alerta__rotulo {
  font-weight: var(--peso-semi);
}

.supre {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: var(--esp-3);
  border: 1px solid var(--borda);
  border-radius: var(--raio-md);
}

.supre legend {
  padding: 0 var(--esp-1);
  font-weight: var(--peso-semi);
}

.supre__opcao {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.erro {
  margin: 0;
  color: var(--cor-perigo);
  font-size: var(--texto-sm);
}
</style>
