<script setup lang="ts">
/**
 * Botão reutilizável estilizado com a classe oficial `br-button` do @govbr-ds/core.
 */
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}>();
</script>

<template>
  <button
    :type="type || 'button'"
    :disabled="disabled"
    class="br-button"
    :class="{
      primary: !variant || variant === 'primary',
      secondary: variant === 'secondary',
    }"
    :style="
      variant === 'danger'
        ? 'background-color: #e52207; color: #fff; border: none;'
        : variant === 'success'
        ? 'background-color: #168821; color: #fff; border: none;'
        : ''
    "
  >
    <i v-if="icon" :class="[icon, 'mr-1']" aria-hidden="true"></i>
    <slot />
  </button>
</template>
