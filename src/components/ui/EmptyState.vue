<script setup lang="ts">
/**
 * ============================================================================
 * ESTADO VAZIO (`EmptyState.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando uma lista não tem nada para mostrar, uma tela em branco confunde
 * ("deu erro?"). O estado vazio responde a 3 perguntas:
 *   1. O que é isto?      → `titulo`
 *   2. Por que está vazio? → `descricao`
 *   3. O que eu faço agora? → slot `acoes` (ex.: botão "Limpar filtros")
 */
withDefaults(
  defineProps<{
    titulo: string;
    descricao?: string;
    icone?: string;
  }>(),
  { icone: 'fa-regular fa-folder-open' }
);
</script>

<template>
  <div class="estado-vazio">
    <i :class="icone" class="estado-vazio__icone" aria-hidden="true"></i>
    <p class="estado-vazio__titulo">{{ titulo }}</p>
    <p v-if="descricao" class="estado-vazio__descricao">{{ descricao }}</p>
    <div v-if="$slots.acoes" class="estado-vazio__acoes">
      <slot name="acoes" />
    </div>
  </div>
</template>

<style scoped>
.estado-vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-2);
  padding: var(--esp-7) var(--esp-4);
  text-align: center;
  color: var(--texto-secundario);
}

.estado-vazio__icone {
  font-size: 2rem;
  margin-bottom: var(--esp-2);
}

.estado-vazio__titulo {
  margin: 0;
  font-size: var(--texto-lg);
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.estado-vazio__descricao {
  margin: 0;
  max-width: 48ch;
}

.estado-vazio__acoes {
  margin-top: var(--esp-3);
}
</style>
