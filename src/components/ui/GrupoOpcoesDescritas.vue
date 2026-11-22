<script setup lang="ts" generic="V extends string | number">
/**
 * ============================================================================
 * GRUPO DE OPÇÕES COM DESCRIÇÃO (`GrupoOpcoesDescritas.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um grupo de botões de rádio em que CADA opção mostra, além do nome, uma
 * descrição por extenso. Serve para escalas em que o nome sozinho não basta,
 * como a Probabilidade (Quadro 4) e o Impacto (Quadro 5) do risco:
 *
 *   (•) Raro  — Acontece apenas em situações excepcionais...
 *   ( ) Pouco provável — O histórico conhecido aponta para baixa frequência...
 *
 * Por que `<input type="radio">` nativo?
 *   - o navegador já cuida do teclado (setas mudam a opção, Tab entra e sai do
 *     grupo): não reimplementamos nada;
 *   - o `<fieldset>` + `<legend>` dão ao grupo o nome que o leitor de tela lê;
 *   - o `<label>` envolve o rádio e o rótulo, então clicar no nome marca a opção;
 *     a descrição fica fora do label (não entra no nome acessível) e é ligada ao
 *     rádio por `aria-describedby`.
 *
 * Ligações de acessibilidade (mesmo padrão do `FormField`):
 *   - `aria-describedby` no fieldset → anuncia a ajuda e o erro;
 *   - `aria-invalid="true"` em cada rádio quando há erro (é o que o
 *     `focarPrimeiroErro` do formulário procura para levar o foco ao campo);
 *   - o erro aparece num `<p role="alert">`.
 *
 * Exemplo:
 *   <GrupoOpcoesDescritas v-model="probabilidade" legenda="Probabilidade" obrigatorio
 *     :opcoes="[{ valor: 1, rotulo: 'Raro', descricao: 'Acontece apenas em situações excepcionais.' }]"
 *     :erro="erros.probabilidade" />
 */
import { computed, useId } from 'vue';
import type { OpcaoDescrita } from './tipos';

const props = defineProps<{
  /** Valor escolhido; `null` enquanto a pessoa ainda não escolheu. */
  modelValue: V | null;
  opcoes: OpcaoDescrita<V>[];
  /** Nome do grupo (aparece como título e é lido pelo leitor de tela). */
  legenda: string;
  obrigatorio?: boolean;
  ajuda?: string;
  erro?: string;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', valor: V): void }>();

const idGerado = useId();
const idBase = computed(() => `grupo-${idGerado}`);
const idAjuda = computed(() => `${idBase.value}-ajuda`);
const idErro = computed(() => `${idBase.value}-erro`);

/** Ids da ajuda e do erro que existem na tela, separados por espaço. */
const descritores = computed(
  () => [props.ajuda ? idAjuda.value : '', props.erro ? idErro.value : ''].filter(Boolean).join(' ') || undefined,
);

/** Id da descrição da opção de posição `indice` (ligado ao rádio por aria-describedby). */
function idDescricao(indice: number): string {
  return `${idBase.value}-desc-${indice}`;
}

/**
 * Ids que o leitor de tela lê junto com o rádio: a descrição da opção, a ajuda
 * e o erro do grupo. Assim o erro é anunciado quando o foco cai no 1º rádio.
 */
function descritoresDaOpcao(indice: number): string {
  return [idDescricao(indice), descritores.value].filter(Boolean).join(' ');
}
</script>

<template>
  <fieldset class="grupo" :class="{ 'grupo--erro': erro }" :aria-describedby="descritores">
    <legend class="grupo__legenda">
      {{ legenda }}
      <span v-if="obrigatorio" class="grupo__obrigatorio" aria-hidden="true">*</span>
      <span v-if="obrigatorio" class="radar-so-leitor">(obrigatório)</span>
    </legend>
    <p v-if="ajuda" :id="idAjuda" class="grupo__ajuda">{{ ajuda }}</p>

    <div
      v-for="(opcao, indice) in opcoes"
      :key="String(opcao.valor)"
      class="grupo__opcao"
      :class="{ 'grupo__opcao--marcada': opcao.valor === modelValue }"
    >
      <!-- O label envolve só o rádio e o rótulo: o nome acessível é "3 — Provável".
           A descrição é um irmão com id, lido como descrição (aria-describedby). -->
      <label class="grupo__label">
        <input
          type="radio"
          class="grupo__radio"
          :name="idBase"
          :value="opcao.valor"
          :checked="opcao.valor === modelValue"
          :required="obrigatorio || undefined"
          :aria-invalid="erro ? 'true' : undefined"
          :aria-describedby="descritoresDaOpcao(indice)"
          @change="emit('update:modelValue', opcao.valor)"
        />
        <strong class="grupo__rotulo">{{ opcao.rotulo }}</strong>
      </label>
      <span :id="idDescricao(indice)" class="grupo__descricao">{{ opcao.descricao }}</span>
    </div>

    <p v-if="erro" :id="idErro" class="grupo__erro" role="alert">
      <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
      {{ erro }}
    </p>
  </fieldset>
</template>

<style scoped>
.grupo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.grupo__legenda {
  padding: 0;
  margin-bottom: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.grupo__obrigatorio {
  margin-left: var(--esp-1);
  color: var(--cor-perigo);
}

.grupo__ajuda {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

/* Cada opção é um cartão: rádio + rótulo (clicáveis) e a descrição abaixo. */
.grupo__opcao {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: var(--alvo-minimo);
  padding: var(--esp-2) var(--esp-3);
  border: 1px solid var(--borda-forte);
  border-radius: var(--raio-md);
  background: var(--superficie);
  cursor: pointer;
}

.grupo__opcao:hover {
  background: var(--superficie-alta);
}

.grupo__opcao--marcada {
  background: var(--cor-primaria-suave);
  border-color: var(--cor-primaria);
}

.grupo__label {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-width: 0;
  cursor: pointer;
}

.grupo__radio {
  flex: none;
}

.grupo__rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.grupo__descricao {
  /* Alinha a descrição com o texto do rótulo (largura do rádio + espaço). */
  padding-left: calc(var(--esp-3) + 13px);
  overflow-wrap: anywhere;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.grupo__erro {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
  margin: 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  color: var(--cor-perigo);
}

.grupo--erro .grupo__opcao {
  border-color: var(--cor-perigo);
}
</style>
