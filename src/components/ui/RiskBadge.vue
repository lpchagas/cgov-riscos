<script setup lang="ts">
/**
 * ============================================================================
 * ETIQUETA DE NÍVEL DE RISCO (`RiskBadge.vue`) — Quadro 8
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Mostra o nível de um risco (Baixo, Médio, Alto ou Extremo) com TRÊS pistas
 * ao mesmo tempo: COR + ÍCONE + TEXTO. Assim, quem não distingue cores (ou usa
 * o modo alto contraste) também entende o nível (WCAG 1.4.1).
 *
 * Exemplos:
 *   <RiskBadge classe="Alto" />                   → ↑ Alto
 *   <RiskBadge classe="Alto" :valor="10.2" />     → ↑ Alto · 10,2
 *   <RiskBadge classe="Extremo" :valor="22" prefixo="Residual" />
 *
 * ⚠️ Este componente NÃO classifica nada: recebe a classe já calculada por
 * `calculadoraRiscoRadar.ts` (faixas do Quadro 8, sem arredondamento prévio).
 */
import { computed } from 'vue';
import type { ClasseRisco } from '../../types/radar.types';
import {
  ICONES_CLASSE_RISCO,
  SUFIXO_CSS_CLASSE_RISCO,
  formatarNivel,
} from '../../utils/rotulosInterface';

const props = withDefaults(
  defineProps<{
    classe: ClasseRisco;
    valor?: number;
    prefixo?: string;
    tamanho?: 'sm' | 'md';
  }>(),
  { tamanho: 'md' }
);

const sufixo = computed(() => SUFIXO_CSS_CLASSE_RISCO[props.classe]);
const textoValor = computed(() =>
  props.valor === undefined ? '' : ` · ${formatarNivel(props.valor)}`
);
</script>

<template>
  <span
    class="risk-badge"
    :class="[`risk-badge--${sufixo}`, `risk-badge--${tamanho}`]"
  >
    <i :class="ICONES_CLASSE_RISCO[classe]" aria-hidden="true"></i>
    <span>
      <template v-if="prefixo">{{ prefixo }}: </template>{{ classe }}<span class="radar-numero">{{ textoValor }}</span>
    </span>
  </span>
</template>

<style scoped>
.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  padding: 0.125rem var(--esp-2);
  border: 1px solid;
  border-radius: var(--raio-pilula);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  line-height: 1.4;
  white-space: nowrap;
}

.risk-badge--sm {
  font-size: var(--texto-xs);
  padding: 0 var(--esp-2);
}

.risk-badge i {
  font-size: 0.85em;
}

/* Cada nível lê os tokens do Quadro 8 definidos em `tokens.css`. */
.risk-badge--baixo {
  background: var(--risco-baixo-fundo);
  color: var(--risco-baixo-texto);
  border-color: var(--risco-baixo-borda);
}
.risk-badge--medio {
  background: var(--risco-medio-fundo);
  color: var(--risco-medio-texto);
  border-color: var(--risco-medio-borda);
}
.risk-badge--alto {
  background: var(--risco-alto-fundo);
  color: var(--risco-alto-texto);
  border-color: var(--risco-alto-borda);
}
.risk-badge--extremo {
  background: var(--risco-extremo-fundo);
  color: var(--risco-extremo-texto);
  border-color: var(--risco-extremo-borda);
}
</style>
