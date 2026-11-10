<script setup lang="ts">
/**
 * Cartão informativo oficial no padrão `br-card` do @govbr-ds/core.
 */
defineProps<{
  titulo?: string;
  subtitulo?: string;
  destaqueCor?: string;
}>();
</script>

<template>
  <div
    class="br-card mb-3"
    :style="{
      borderRadius: '8px',
      borderTop: destaqueCor ? `4px solid ${destaqueCor}` : '1px solid #e0e0e0',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      padding: '1.25rem',
    }"
  >
    <div v-if="titulo" class="card-header pb-2 mb-3" style="border-bottom: 1px solid #eee;">
      <h3 class="h5 mb-0" style="color: #071d41; font-weight: 700;">{{ titulo }}</h3>
      <p v-if="subtitulo" class="mb-0 text-down-01" style="color: #666;">{{ subtitulo }}</p>
    </div>
    <div class="card-content">
      <slot />
    </div>
  </div>
</template>
