<script setup lang="ts">
/**
 * ============================================================================
 * CHIP / ETIQUETA (`Chip.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Etiqueta pequena e arredondada para STATUS ("Aguardando validação") ou para
 * FILTROS ativos ("Categoria: Legal ✕"). Quando `removivel` é verdadeiro,
 * aparece um botão ✕ acessível que emite o evento `remover`.
 *
 * Exemplos:
 *   <Chip tom="info" icone="fa-solid fa-hourglass-half">Aguardando validação</Chip>
 *   <Chip removivel @remover="limparFiltro()">Célula P3 × I5</Chip>
 */
import type { TomVisual } from '../../utils/rotulosInterface';

withDefaults(
  defineProps<{
    tom?: TomVisual;
    icone?: string;
    removivel?: boolean;
    /** Texto do botão ✕ para leitor de tela. Ex.: "Remover filtro de categoria". */
    rotuloRemover?: string;
    titulo?: string;
  }>(),
  { tom: 'neutro', rotuloRemover: 'Remover' }
);

const emit = defineEmits<{ (e: 'remover'): void }>();
</script>

<template>
  <span class="chip" :class="`chip--${tom}`" :title="titulo">
    <i v-if="icone" :class="icone" aria-hidden="true"></i>
    <span><slot /></span>
    <button
      v-if="removivel"
      type="button"
      class="chip__remover"
      :aria-label="rotuloRemover"
      @click="emit('remover')"
    >
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  min-height: 1.75rem;
  padding: 0 var(--esp-3);
  border: 1px solid var(--borda);
  border-radius: var(--raio-pilula);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  white-space: nowrap;
  background: var(--superficie-container);
  color: var(--texto);
}

.chip i {
  font-size: 0.85em;
}

.chip--info {
  background: var(--cor-info-suave);
  color: var(--cor-sobre-primaria-suave);
  border-color: var(--cor-primaria-suave);
}
.chip--sucesso {
  background: var(--cor-sucesso-suave);
  color: var(--cor-sucesso);
  border-color: transparent;
}
.chip--aviso {
  background: var(--cor-aviso-suave);
  color: var(--cor-aviso);
  border-color: transparent;
}
.chip--perigo {
  background: var(--cor-perigo-suave);
  color: var(--cor-perigo);
  border-color: transparent;
}

.chip__remover {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: calc(var(--esp-2) * -1);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.chip__remover:hover {
  background: var(--superficie-alta);
}
</style>
