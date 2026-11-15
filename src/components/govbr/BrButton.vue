<script setup lang="ts">
/**
 * ============================================================================
 * BOTÃO GOV.BR (`BrButton.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Usa a classe oficial `br-button` do @govbr-ds/core (pílula de 40 px).
 * As variantes "perigo" e "sucesso" não existem no gov.br DS: aqui elas são
 * pintadas com TOKENS (`--cor-perigo`, `--cor-sucesso`), que têm contraste
 * ≥ 6,5:1 com o branco. Antes eram cores fixas (#e52207 = só 4,4:1).
 *
 * Desenho de referência: componente "BrButton" da biblioteca Figma RADAR
 * (primario=primary, secundario=secondary, perigo=danger, sucesso=success).
 *
 * Regra de texto: sempre um VERBO de ação ("Validar risco"), nunca "OK".
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
      'botao--perigo': variant === 'danger',
      'botao--sucesso': variant === 'success',
    }"
  >
    <i v-if="icon" :class="icon" class="botao__icone" aria-hidden="true"></i>
    <slot />
  </button>
</template>

<style scoped>
.botao__icone {
  margin-right: var(--esp-2);
}

.botao--perigo,
.botao--sucesso {
  border: 0;
  color: var(--texto-inverso);
}

.botao--perigo { background: var(--cor-perigo); }
.botao--sucesso { background: var(--cor-sucesso); }

.botao--perigo:not(:disabled):hover,
.botao--sucesso:not(:disabled):hover {
  filter: brightness(0.9);
}

/* Alto contraste: fundo preto, borda e texto na cor de destaque. */
:root[data-theme='contraste'] .botao--perigo,
:root[data-theme='contraste'] .botao--sucesso {
  background: var(--superficie);
  color: var(--cor-primaria);
  border: 2px solid var(--cor-primaria);
}
</style>
