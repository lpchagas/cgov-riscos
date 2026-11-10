<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE MENSAGEM E ALERTA CONTEXTUAL (`div.br-message`) — @govbr-ds/core
 * ============================================================================
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    state?: 'info' | 'success' | 'warning' | 'danger';
    titulo?: string;
  }>(),
  {
    state: 'info',
    titulo: '',
  }
);

const estiloEstado = computed(() => {
  switch (props.state) {
    case 'success':
      return {
        bg: '#e3f5e1',
        borda: '#168821',
        cor: '#168821',
        icone: 'fas fa-check-circle',
      };
    case 'warning':
      return {
        bg: '#fff5c2',
        borda: '#ffcd07',
        cor: '#8a6d00',
        icone: 'fas fa-exclamation-triangle',
      };
    case 'danger':
      return {
        bg: '#fde0db',
        borda: '#e52207',
        cor: '#c91c00',
        icone: 'fas fa-times-circle',
      };
    default:
      return {
        bg: '#dbe8fb',
        borda: '#1351b4',
        cor: '#071d41',
        icone: 'fas fa-info-circle',
      };
  }
});
</script>

<template>
  <div
    class="br-message p-3 mb-3 rounded d-flex align-items-start gap-2"
    :class="state"
    role="alert"
    :style="{
      backgroundColor: estiloEstado.bg,
      borderLeft: `4px solid ${estiloEstado.borda}`,
      color: estiloEstado.cor,
    }"
  >
    <div class="icon mt-1">
      <i :class="estiloEstado.icone" aria-hidden="true"></i>
    </div>
    <div class="content text-down-01 flex-fill">
      <strong v-if="titulo" class="message-title d-block mb-1">{{ titulo }}</strong>
      <span class="message-body"><slot /></span>
    </div>
  </div>
</template>
