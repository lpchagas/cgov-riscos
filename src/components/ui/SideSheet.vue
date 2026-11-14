<script setup lang="ts">
/**
 * ============================================================================
 * PAINEL LATERAL (`SideSheet.vue`) — "drawer" do Material / Ant Design
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Painel que desliza da DIREITA, por cima da página. Serve para:
 *   - ver o resumo de um item SEM sair da lista (ex.: clicar num risco da
 *     tabela mostra a memória de cálculo ao lado);
 *   - formulários curtos de criação (ex.: "Novo objeto de gestão").
 * O usuário não perde o lugar onde estava na lista — ao fechar, o foco volta
 * para a linha que ele clicou.
 *
 * No celular, o painel ocupa a tela toda.
 *
 * Exemplo:
 *   <SideSheet :aberto="!!riscoSelecionado" titulo="RADAR-2026-001" @fechar="riscoSelecionado = null">
 *     ...conteúdo...
 *     <template #acoes><BrButton>Ver ficha completa</BrButton></template>
 *   </SideSheet>
 */
import { ref, useId } from 'vue';
import { useFocoModal } from '../../composables/useFocoModal';

const props = withDefaults(
  defineProps<{
    aberto: boolean;
    titulo: string;
    subtitulo?: string;
    largura?: string;
  }>(),
  { largura: '30rem' }
);

const emit = defineEmits<{ (e: 'fechar'): void }>();

const painel = ref<HTMLElement | null>(null);
const idTitulo = `painel-lateral-titulo-${useId()}`;

useFocoModal(painel, () => props.aberto, () => emit('fechar'));
</script>

<template>
  <Teleport to="body">
    <Transition name="painel">
      <div v-if="aberto" class="painel-lateral__veu" @click.self="emit('fechar')">
        <aside
          ref="painel"
          class="painel-lateral"
          :style="{ '--largura-painel': largura }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          tabindex="-1"
        >
          <header class="painel-lateral__cabecalho">
            <div>
              <h2 :id="idTitulo" class="painel-lateral__titulo">{{ titulo }}</h2>
              <p v-if="subtitulo" class="painel-lateral__subtitulo">{{ subtitulo }}</p>
            </div>
            <button type="button" class="painel-lateral__fechar" aria-label="Fechar painel" @click="emit('fechar')">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <div class="painel-lateral__corpo">
            <slot />
          </div>
          <footer v-if="$slots.acoes" class="painel-lateral__acoes">
            <slot name="acoes" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.painel-lateral__veu {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  background: var(--veu-modal);
}

.painel-lateral {
  width: min(100%, var(--largura-painel));
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  color: var(--texto);
  border-left: 1px solid var(--borda);
  box-shadow: var(--elevacao-3);
}

.painel-lateral__cabecalho {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-3);
  padding: var(--esp-5);
  border-bottom: 1px solid var(--borda);
}

.painel-lateral__titulo {
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.painel-lateral__subtitulo {
  margin: var(--esp-1) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.painel-lateral__fechar {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--texto-secundario);
  cursor: pointer;
}

.painel-lateral__fechar:hover {
  background: var(--superficie-alta);
}

.painel-lateral__corpo {
  flex: 1;
  overflow-y: auto;
  padding: var(--esp-5);
}

.painel-lateral__acoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--esp-2);
  padding: var(--esp-4) var(--esp-5);
  border-top: 1px solid var(--borda);
}

/* Desliza da direita para a esquerda ao abrir. */
.painel-enter-active,
.painel-leave-active {
  transition: opacity var(--duracao-media) var(--curva-padrao);
}
.painel-enter-active .painel-lateral,
.painel-leave-active .painel-lateral {
  transition: transform var(--duracao-media) var(--curva-padrao);
}
.painel-enter-from,
.painel-leave-to {
  opacity: 0;
}
.painel-enter-from .painel-lateral,
.painel-leave-to .painel-lateral {
  transform: translateX(100%);
}
</style>
