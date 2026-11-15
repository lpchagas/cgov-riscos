<script setup lang="ts">
/**
 * ============================================================================
 * DIÁLOGO / JANELA MODAL (`Dialog.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Janela que aparece por cima da página para uma decisão IMPORTANTE e CURTA.
 * Exemplo do RADAR: "Mudar o apetite de Legal para Moderado? 2 riscos deixam
 * de ser Críticos." Use com moderação: para ações reversíveis, prefira o
 * Toast com "Desfazer".
 *
 * Boas práticas embutidas:
 *   - título vira o nome acessível do diálogo (`aria-labelledby`);
 *   - foco entra, fica preso e volta ao fechar (`useFocoModal`);
 *   - Esc ou clique no fundo escuro fecham;
 *   - os botões dizem a AÇÃO ("Mudar apetite"), nunca só "OK".
 *
 * Exemplo:
 *   <Dialog :aberto="confirmar" titulo="Mudar o apetite?" @fechar="confirmar = false">
 *     <p>2 riscos deixam de ser Críticos.</p>
 *     <template #acoes>
 *       <BrButton variant="secondary" @click="confirmar = false">Cancelar</BrButton>
 *       <BrButton variant="primary" @click="aplicar">Mudar apetite</BrButton>
 *     </template>
 *   </Dialog>
 */
import { ref, useId } from 'vue';
import { useFocoModal } from '../../composables/useFocoModal';

const props = defineProps<{
  aberto: boolean;
  titulo: string;
  /** 'alerta' usa role="alertdialog" para decisões destrutivas. */
  tipo?: 'padrao' | 'alerta';
}>();

const emit = defineEmits<{ (e: 'fechar'): void }>();

const caixa = ref<HTMLElement | null>(null);
const idTitulo = `dialogo-titulo-${useId()}`;

useFocoModal(caixa, () => props.aberto, () => emit('fechar'));
</script>

<template>
  <Teleport to="body">
    <Transition name="dialogo">
      <div v-if="aberto" class="dialogo__veu" @click.self="emit('fechar')">
        <div
          ref="caixa"
          class="dialogo"
          :role="tipo === 'alerta' ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          tabindex="-1"
        >
          <header class="dialogo__cabecalho">
            <h2 :id="idTitulo" class="dialogo__titulo">{{ titulo }}</h2>
            <button type="button" class="dialogo__fechar" aria-label="Fechar" @click="emit('fechar')">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <div class="dialogo__corpo">
            <slot />
          </div>
          <footer v-if="$slots.acoes" class="dialogo__acoes">
            <slot name="acoes" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialogo__veu {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: var(--esp-4);
  background: var(--veu-modal);
}

.dialogo {
  width: min(100%, 32rem);
  max-height: calc(100vh - 2 * var(--esp-4));
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--borda);
  border-radius: var(--raio-xl);
  box-shadow: var(--elevacao-3);
}

.dialogo__cabecalho {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-3);
  padding: var(--esp-5) var(--esp-5) var(--esp-3);
}

.dialogo__titulo {
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.dialogo__fechar {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  margin: calc(var(--esp-2) * -1) calc(var(--esp-2) * -1) 0 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--texto-secundario);
  cursor: pointer;
}

.dialogo__fechar:hover {
  background: var(--superficie-alta);
}

.dialogo__corpo {
  padding: 0 var(--esp-5);
  overflow-y: auto;
}

.dialogo__acoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--esp-2);
  padding: var(--esp-5);
}

/* Animação de entrada/saída (desligada se o usuário pedir menos movimento). */
.dialogo-enter-active,
.dialogo-leave-active {
  transition: opacity var(--duracao-media) var(--curva-padrao);
}
.dialogo-enter-from,
.dialogo-leave-to {
  opacity: 0;
}
</style>
