<script setup lang="ts">
/**
 * ============================================================================
 * BLOCO RECOLHÍVEL (`BlocoRecolhivel.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um bloco com título e corpo que SÓ recolhe no celular:
 *   - Computador: título (h2) + corpo sempre visível, sem botão nenhum.
 *   - Celular: o título vira um botão; tocar nele abre/fecha o corpo.
 *
 * Acessibilidade: o botão usa `aria-expanded` (aberto/fechado) e
 * `aria-controls` (qual corpo ele controla). O corpo fechado usa `v-show`
 * (display: none), então some também do foco do teclado e do leitor de tela.
 *
 * Exemplo de uso:
 *   <BlocoRecolhivel id="matriz" titulo="Matriz de riscos" class="cartao">
 *     <template #acao><RouterLink to="/dar">Abrir DAR</RouterLink></template>
 *     ...conteúdo...
 *   </BlocoRecolhivel>
 *
 * O estado aberto/fechado NÃO é salvo: a cada visita o bloco volta ao padrão.
 */
import { ref } from 'vue';
import { useCelular } from '@/composables/useCelular';

const props = withDefaults(
  defineProps<{
    /** Base dos ids: gera `${id}-titulo` e `${id}-corpo`. */
    id: string;
    titulo: string;
    /** No celular, o bloco já nasce aberto? */
    abertoNoCelular?: boolean;
  }>(),
  { abertoNoCelular: false }
);

const celular = useCelular();
const aberto = ref(props.abertoNoCelular);
</script>

<template>
  <section class="bloco-recolhivel" :aria-labelledby="`${id}-titulo`">
    <header class="bloco-recolhivel__cabecalho">
      <h2 :id="`${id}-titulo`" class="bloco-recolhivel__titulo">
        <button
          v-if="celular"
          type="button"
          class="bloco-recolhivel__botao"
          :aria-expanded="aberto"
          :aria-controls="`${id}-corpo`"
          @click="aberto = !aberto"
        >
          <span>{{ titulo }}</span>
          <i
            :class="aberto ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
            aria-hidden="true"
          ></i>
        </button>
        <template v-else>{{ titulo }}</template>
      </h2>
      <slot name="acao" />
    </header>

    <!-- No computador (`!celular`) o corpo é sempre visível. -->
    <div :id="`${id}-corpo`" v-show="!celular || aberto" class="bloco-recolhivel__corpo">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.bloco-recolhivel {
  min-width: 0;
}

.bloco-recolhivel__corpo {
  min-width: 0;
}

.bloco-recolhivel__cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  flex-wrap: wrap;
}

/* Mesmo visual de `.cartao__titulo` do Painel. */
.bloco-recolhivel__titulo {
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
  color: var(--texto);
}

.bloco-recolhivel__botao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
</style>
