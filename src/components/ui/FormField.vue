<script setup lang="ts">
/**
 * ============================================================================
 * CAMPO DE FORMULÁRIO (`FormField.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Resolve, de uma vez, os achados A1 e A2 do diagnóstico (44 campos sem rótulo).
 * Este componente cria o RÓTULO, o TEXTO DE AJUDA e a MENSAGEM DE ERRO, e liga
 * tudo ao campo pelos atributos certos:
 *   - `<label for="id">`        → o leitor de tela anuncia o nome do campo;
 *   - `aria-describedby`        → anuncia também a ajuda e o erro;
 *   - `aria-invalid="true"`     → avisa que o valor está errado.
 *
 * O campo em si vem pelo slot, que recebe os atributos prontos (`attrs`):
 *
 *   <FormField rotulo="Evento de risco" ajuda="O que pode acontecer?"
 *              :erro="erros.evento" obrigatorio v-slot="{ attrs }">
 *     <textarea v-bind="attrs" v-model="evento" />
 *   </FormField>
 */
import { computed, useId } from 'vue';

const props = defineProps<{
  rotulo: string;
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  /** Use quando o campo precisar de um id conhecido (ex.: âncora de erro). */
  idCampo?: string;
}>();

const idGerado = useId();
const id = computed(() => props.idCampo ?? `campo-${idGerado}`);
const idAjuda = computed(() => `${id.value}-ajuda`);
const idErro = computed(() => `${id.value}-erro`);

/** Atributos que o campo do slot deve receber via `v-bind="attrs"`. */
const attrs = computed(() => {
  const descritores = [props.ajuda ? idAjuda.value : '', props.erro ? idErro.value : '']
    .filter(Boolean)
    .join(' ');
  return {
    id: id.value,
    'aria-describedby': descritores || undefined,
    'aria-invalid': props.erro ? ('true' as const) : undefined,
    'aria-required': props.obrigatorio ? ('true' as const) : undefined,
  };
});
</script>

<template>
  <div class="campo" :class="{ 'campo--erro': erro }">
    <label :for="id" class="campo__rotulo">
      {{ rotulo }}
      <span v-if="obrigatorio" class="campo__obrigatorio" aria-hidden="true">*</span>
      <span v-if="obrigatorio" class="radar-so-leitor">(obrigatório)</span>
    </label>
    <p v-if="ajuda" :id="idAjuda" class="campo__ajuda">{{ ajuda }}</p>
    <slot :attrs="attrs" :id="id" />
    <p v-if="erro" :id="idErro" class="campo__erro" role="alert">
      <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
      {{ erro }}
    </p>
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 0;
}

/* Todo campo do slot ocupa a largura disponível. */
.campo :slotted(input:not([type='checkbox'], [type='radio'])),
.campo :slotted(select),
.campo :slotted(textarea) {
  width: 100%;
}

.campo__rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.campo__obrigatorio {
  margin-left: var(--esp-1);
  color: var(--cor-perigo);
}

.campo__ajuda {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.campo__erro {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
  margin: 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  color: var(--cor-perigo);
}

.campo--erro :slotted(input),
.campo--erro :slotted(select),
.campo--erro :slotted(textarea) {
  border-color: var(--cor-perigo);
  border-width: 2px;
}
</style>
