<script setup lang="ts" generic="V extends string | number">
/**
 * ============================================================================
 * CONTROLE SEGMENTADO (`SegmentedControl.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um grupo de botões em que só UM fica selecionado (como os botões
 * "Dia / Semana / Mês" de uma agenda). Serve para poucas opções (2 a 5),
 * todas visíveis de uma vez — melhor do que um <select>, que esconde as opções.
 *
 * Acessibilidade (padrão "radiogroup" da WAI-ARIA):
 *   - Tab entra no grupo direto na opção selecionada;
 *   - setas ← → (ou ↑ ↓) mudam a seleção;
 *   - o leitor de tela anuncia "Apetite da categoria Legal, Moderado, selecionado, 2 de 3".
 *
 * Exemplo:
 *   <SegmentedControl v-model="apetite" rotulo="Apetite da categoria Legal"
 *     :opcoes="[{ valor: 'baixo', rotulo: 'Baixo' }, { valor: 'moderado', rotulo: 'Moderado' }]" />
 */
import { ref } from 'vue';
import type { OpcaoSegmento } from './tipos';

const props = defineProps<{
  modelValue: V;
  opcoes: OpcaoSegmento<V>[];
  /** Nome do grupo para o leitor de tela (obrigatório: não há rótulo visível). */
  rotulo: string;
  desabilitado?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', valor: V): void }>();

const botoes = ref<HTMLButtonElement[]>([]);

function selecionar(indice: number): void {
  const opcao = props.opcoes[indice];
  if (!opcao || props.desabilitado) return;
  emit('update:modelValue', opcao.valor);
  botoes.value[indice]?.focus();
}

function aoTeclar(evento: KeyboardEvent, indice: number): void {
  const total = props.opcoes.length;
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
    evento.preventDefault();
    selecionar((indice + 1) % total);
  } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
    evento.preventDefault();
    selecionar((indice - 1 + total) % total);
  }
}
</script>

<template>
  <div class="segmentado" role="radiogroup" :aria-label="rotulo" :aria-disabled="desabilitado || undefined">
    <button
      v-for="(opcao, indice) in opcoes"
      :key="String(opcao.valor)"
      ref="botoes"
      type="button"
      role="radio"
      class="segmentado__opcao"
      :aria-checked="opcao.valor === modelValue"
      :tabindex="opcao.valor === modelValue ? 0 : -1"
      :disabled="desabilitado"
      @click="selecionar(indice)"
      @keydown="aoTeclar($event, indice)"
    >
      <i v-if="opcao.valor === modelValue" class="fa-solid fa-check" aria-hidden="true"></i>
      <i v-else-if="opcao.icone" :class="opcao.icone" aria-hidden="true"></i>
      {{ opcao.rotulo }}
    </button>
  </div>
</template>

<style scoped>
.segmentado {
  display: inline-flex;
  max-width: 100%;
  border: 1px solid var(--borda-forte);
  border-radius: var(--raio-pilula);
  overflow: hidden;
}

.segmentado__opcao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  min-height: var(--alvo-minimo);
  padding: 0 var(--esp-4);
  border: 0;
  border-right: 1px solid var(--borda-forte);
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  white-space: nowrap;
  cursor: pointer;
}

.segmentado__opcao:last-child {
  border-right: 0;
}

.segmentado__opcao:hover:not(:disabled) {
  background: var(--superficie-alta);
}

/* Estilo M3: a opção escolhida ganha o "container" da cor primária + ✓. */
.segmentado__opcao[aria-checked='true'] {
  background: var(--cor-primaria-suave);
  color: var(--cor-sobre-primaria-suave);
  font-weight: var(--peso-semi);
}

.segmentado__opcao:disabled {
  color: var(--texto-desabilitado);
  cursor: not-allowed;
}
</style>
