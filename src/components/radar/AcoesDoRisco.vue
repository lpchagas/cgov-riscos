<script setup lang="ts">
/**
 * ============================================================================
 * BOTÕES DE FLUXO DE UM RISCO (`AcoesDoRisco.vue`) — Etapa B3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Mostra, para UM risco, exatamente os botões que a pessoa logada pode usar
 * agora. Quem decide NÃO é a tela: é o banco, pela função `acoes_no_fluxo`
 * (no modo demonstração, a fonte de demonstração reproduz a mesma regra).
 * A tela só desenha o que veio em `acoes`:
 *
 *   podeEnviar     → "Enviar para validação"
 *   podeAssumir    → "Assumir risco"
 *   podeValidar    → "Validar risco"
 *   podeHomologar  → "Homologar risco"
 *   podeDevolver   → "Devolver para ajuste" (ou "Devolver à unidade (CGOV)")
 *   podeEditar     → "Editar ficha" (só se a tela pedir, ver `mostrarEdicao`)
 *   podeExcluir    → "Excluir risco"
 *   motivo         → mensagem informativa (por que não há botão)
 *
 * Usado na Ficha do risco e no painel lateral da lista de Riscos.
 *
 * Se a ação der erro (ex.: outra pessoa mexeu no risco um instante antes e o
 * banco responde "O risco mudou de situação…"), mostramos a mensagem já
 * traduzida num aviso (Toast) e RELEMOS o risco, para os botões voltarem a
 * refletir a situação real.
 *
 * Exemplo:
 *   <AcoesDoRisco :risco="risco" :acoes="riscosStore.acoes[risco.id]" @excluido="voltarParaLista" />
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../../stores/riscosStore';
import { useToast } from '../../composables/useToast';
import { ErroRadar, traduzirErroBanco } from '../../services/dados/errosBanco';
import type { AcoesFluxo, FichaRisco } from '../../types/radar.types';
import { ROTULOS_STATUS_FLUXO } from '../../utils/rotulosInterface';
import BrButton from '../govbr/BrButton.vue';
import BrMessage from '../govbr/BrMessage.vue';
import Dialog from '../ui/Dialog.vue';
import FormField from '../ui/FormField.vue';

const props = withDefaults(
  defineProps<{
    risco: FichaRisco;
    acoes: AcoesFluxo | undefined;
    /**
     * Mostra o link "Editar ficha" (`/riscos/novo?editar=<id>`, o formulário em
     * modo edição). A Ficha e o painel lateral da lista ligam; telas de fila
     * (ex.: Aprovações) deixam desligado para não misturar decidir com editar.
     */
    mostrarEdicao?: boolean;
  }>(),
  { mostrarEdicao: false }
);

/**
 * - `excluindo`: emitido ANTES de gravar a exclusão. Quando a store relê, o risco
 *   some da memória e a tela pode desmontar este componente na hora (emits de
 *   componente desmontado são ignorados). Por isso a tela guarda "excluí daqui"
 *   neste aviso e reage ao risco que desaparece.
 * - `excluido`: emitido depois, se o componente ainda estiver na tela.
 */
const emit = defineEmits<{ (e: 'excluindo'): void; (e: 'excluido'): void }>();

const store = useRiscosStore();
const { mostrar } = useToast();

/** Só mostramos o bloco se houver algo a dizer ou a fazer. */
const temConteudo = computed(() => {
  const a = props.acoes;
  if (!a) return false;
  return (
    a.podeEnviar || a.podeAssumir || a.podeValidar || a.podeHomologar || a.podeDevolver ||
    (props.mostrarEdicao && a.podeEditar) || a.podeExcluir || a.motivo !== null
  );
});

const rotuloDevolver = computed(() =>
  props.acoes?.devolucaoCgov ? 'Devolver à unidade (CGOV)' : 'Devolver para ajuste'
);

/** Impede duplo clique enquanto uma ação está em andamento. */
const ocupado = ref(false);

/**
 * Roda uma ação da store. Sucesso → Toast de sucesso (a store já reliu o risco;
 * se a releitura falhar, o aviso global "tela desatualizada" cuida disso).
 * Erro → Toast com a mensagem traduzida + releitura do risco. Devolve `true`
 * quando deu certo (os diálogos só fecham nesse caso).
 */
async function rodar(acao: () => Promise<void>, sucesso: () => string): Promise<boolean> {
  if (ocupado.value) return false;
  ocupado.value = true;
  try {
    await acao();
  } catch (e) {
    const erro = e instanceof ErroRadar ? e : traduzirErroBanco(e);
    mostrar({ tom: 'perigo', mensagem: erro.message });
    // Pode ser que o risco tenha mudado (ou sumido): relê para os botões acompanharem.
    try {
      await store.relerRiscos([props.risco.id]);
    } catch {
      /* a releitura falhou também: mantemos só o aviso do erro original */
    }
    return false;
  } finally {
    ocupado.value = false;
  }
  mostrar({ tom: 'sucesso', mensagem: sucesso() });
  return true;
}

/** Situação atual por extenso. Ex.: "Em validação (Coordenação-Geral)". */
const situacao = () => ROTULOS_STATUS_FLUXO[props.risco.statusFluxo].rotulo;

const enviar = () =>
  rodar(() => store.submeterParaValidacaoCg(props.risco.id), () => `${props.risco.codigoRadar} enviado para validação da Coordenação-Geral. Situação: ${situacao()}.`);
const assumir = () =>
  rodar(() => store.assumirRisco(props.risco.id), () => `${props.risco.codigoRadar} assumido pela unidade. Situação: ${situacao()}.`);
const validar = () =>
  rodar(() => store.aprovarEmUmCliqueCg(props.risco.id), () => `${props.risco.codigoRadar} validado. Situação: ${situacao()}.`);
const homologar = () =>
  rodar(() => store.homologarEmUmCliqueDiretoria(props.risco.id), () => `${props.risco.codigoRadar} homologado e incluído no Plano de Gestão de Riscos. Situação: ${situacao()}.`);

// ---------------------------------------------------------------------------
// DIÁLOGO "DEVOLVER" (motivo obrigatório)
// ---------------------------------------------------------------------------
const devolvendo = ref(false);
const motivo = ref('');
const erroMotivo = ref('');

function abrirDevolver(): void {
  motivo.value = '';
  erroMotivo.value = '';
  devolvendo.value = true;
}

async function confirmarDevolucao(): Promise<void> {
  if (ocupado.value) return; // Enter repetido durante a gravação não faz nada
  const texto = motivo.value.trim();
  if (!texto) {
    erroMotivo.value = 'Informe o motivo da devolução.';
    return;
  }
  erroMotivo.value = '';
  const ok = await rodar(
    () => store.devolverRisco(props.risco.id, texto),
    () => `${props.risco.codigoRadar} devolvido para ajuste. Situação: ${situacao()}.`
  );
  // Em caso de erro o diálogo também fecha: o Toast já explicou e o risco foi relido.
  devolvendo.value = false;
  if (ok) motivo.value = '';
}

// ---------------------------------------------------------------------------
// DIÁLOGO "EXCLUIR" (confirmação digitando o código)
// ---------------------------------------------------------------------------
const excluindo = ref(false);
const codigoDigitado = ref('');
const erroCodigo = ref('');

function abrirExcluir(): void {
  codigoDigitado.value = '';
  erroCodigo.value = '';
  excluindo.value = true;
}

async function confirmarExclusao(): Promise<void> {
  if (ocupado.value) return;
  // Ex.: o risco é RADAR-2026-004; só confirma se a pessoa digitar exatamente isso.
  if (codigoDigitado.value.trim() !== props.risco.codigoRadar) {
    erroCodigo.value = `Digite ${props.risco.codigoRadar} para confirmar a exclusão.`;
    return;
  }
  erroCodigo.value = '';
  const codigo = props.risco.codigoRadar;
  emit('excluindo');
  const ok = await rodar(() => store.excluirRisco(props.risco.id), () => `${codigo} excluído.`);
  excluindo.value = false;
  if (ok) emit('excluido');
}
</script>

<template>
  <div v-if="temConteudo" class="acoes-risco">
    <BrMessage v-if="acoes?.motivo" state="info">{{ acoes.motivo }}</BrMessage>

    <div class="acoes-risco__botoes">
      <BrButton v-if="acoes?.podeEnviar" variant="primary" icon="fa-solid fa-paper-plane" :disabled="ocupado" @click="enviar">Enviar para validação</BrButton>
      <BrButton v-if="acoes?.podeAssumir" variant="primary" icon="fa-solid fa-hand" :disabled="ocupado" @click="assumir">Assumir risco</BrButton>
      <BrButton v-if="acoes?.podeValidar" variant="primary" icon="fa-solid fa-check" :disabled="ocupado" @click="validar">Validar risco</BrButton>
      <BrButton v-if="acoes?.podeHomologar" variant="primary" icon="fa-solid fa-stamp" :disabled="ocupado" @click="homologar">Homologar risco</BrButton>
      <BrButton v-if="acoes?.podeDevolver" variant="secondary" icon="fa-solid fa-rotate-left" :disabled="ocupado" @click="abrirDevolver">{{ rotuloDevolver }}</BrButton>
      <RouterLink
        v-if="mostrarEdicao && acoes?.podeEditar"
        :to="{ name: 'novo-risco', query: { editar: risco.id } }"
        class="br-button secondary"
      >Editar ficha</RouterLink>
      <BrButton v-if="acoes?.podeExcluir" variant="danger" icon="fa-solid fa-trash" :disabled="ocupado" @click="abrirExcluir">Excluir risco</BrButton>
    </div>

    <Dialog :aberto="devolvendo" :titulo="rotuloDevolver" @fechar="devolvendo = false">
      <form id="form-devolver" novalidate @submit.prevent="confirmarDevolucao">
        <FormField rotulo="Motivo da devolução" obrigatorio :erro="erroMotivo" v-slot="{ attrs }">
          <textarea v-bind="attrs" v-model="motivo" rows="4"></textarea>
        </FormField>
      </form>
      <template #acoes>
        <BrButton variant="secondary" @click="devolvendo = false">Cancelar</BrButton>
        <BrButton variant="primary" :disabled="ocupado" @click="confirmarDevolucao">Devolver</BrButton>
      </template>
    </Dialog>

    <Dialog :aberto="excluindo" tipo="alerta" titulo="Excluir risco" @fechar="excluindo = false">
      <p>
        Esta ação não pode ser desfeita. Para confirmar a exclusão, digite o código
        <strong>{{ risco.codigoRadar }}</strong>.
      </p>
      <form id="form-excluir" novalidate @submit.prevent="confirmarExclusao">
        <FormField rotulo="Código do risco" obrigatorio :erro="erroCodigo" v-slot="{ attrs }">
          <input v-bind="attrs" v-model="codigoDigitado" type="text" autocomplete="off" />
        </FormField>
      </form>
      <template #acoes>
        <BrButton variant="secondary" @click="excluindo = false">Cancelar</BrButton>
        <BrButton variant="danger" :disabled="ocupado" @click="confirmarExclusao">Confirmar exclusão</BrButton>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.acoes-risco {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
}

.acoes-risco :deep(.mensagem) {
  margin-bottom: 0;
}

.acoes-risco__botoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}
</style>
