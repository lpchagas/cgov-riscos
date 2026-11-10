<script setup lang="ts">
/**
 * Etiqueta visual semafórica para os 4 níveis do Quadro 8 (Baixo, Médio, Alto, Extremo).
 */
import { computed } from 'vue';
import type { ClasseRisco } from '../../types/radar.types';

const props = defineProps<{
  classeRisco?: ClasseRisco;
  texto?: string;
}>();

const classeCss = computed(() => {
  switch (props.classeRisco) {
    case 'Baixo':
      return 'badge-risco-baixo';
    case 'Médio':
      return 'badge-risco-medio';
    case 'Alto':
      return 'badge-risco-alto';
    case 'Extremo':
      return 'badge-risco-extremo';
    default:
      return '';
  }
});
</script>

<template>
  <span
    class="px-2 py-1 rounded font-weight-bold text-down-01 d-inline-block"
    :class="classeCss"
  >
    {{ texto || classeRisco }}
  </span>
</template>
