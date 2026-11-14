<script setup lang="ts">
/**
 * ============================================================================
 * ESQUELETO DE CARREGAMENTO (`Skeleton.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Enquanto os dados chegam do Supabase, mostramos "blocos cinza" no formato
 * do conteúdo. Isso parece mais rápido do que um ícone girando e evita que a
 * página "pule" quando o conteúdo aparece.
 *
 * Exemplo: <Skeleton :linhas="5" />
 */
withDefaults(defineProps<{ linhas?: number; altura?: string }>(), {
  linhas: 3,
  altura: '1rem',
});
</script>

<template>
  <div class="esqueleto" role="status" aria-live="polite">
    <span class="radar-so-leitor">Carregando…</span>
    <span
      v-for="n in linhas"
      :key="n"
      class="esqueleto__linha"
      :style="{ height: altura, width: n === linhas && linhas > 1 ? '60%' : '100%' }"
      aria-hidden="true"
    ></span>
  </div>
</template>

<style scoped>
.esqueleto {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
}

.esqueleto__linha {
  display: block;
  border-radius: var(--raio-sm);
  background: linear-gradient(
    90deg,
    var(--superficie-alta) 25%,
    var(--superficie-container) 50%,
    var(--superficie-alta) 75%
  );
  background-size: 200% 100%;
  animation: brilho 1.4s ease-in-out infinite;
}

@keyframes brilho {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .esqueleto__linha {
    animation: none;
  }
}
</style>
