<script setup lang="ts">
/**
 * ============================================================================
 * REGIÃO DE AVISOS RÁPIDOS (`ToastRegion.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Fica montada UMA vez em `App.vue` e mostra os avisos criados com
 * `useToast().mostrar(...)` em qualquer lugar do sistema.
 *
 * `role="status"` + `aria-live="polite"`: o leitor de tela lê o aviso assim que
 * ele aparece, sem interromper o que o usuário está fazendo (WCAG 4.1.3).
 */
import { useToast } from '../../composables/useToast';

const { toasts, fechar } = useToast();

const ICONES: Record<string, string> = {
  neutro: 'fa-solid fa-circle-info',
  info: 'fa-solid fa-circle-info',
  sucesso: 'fa-solid fa-circle-check',
  aviso: 'fa-solid fa-triangle-exclamation',
  perigo: 'fa-solid fa-circle-exclamation',
};

function executarAcao(id: number, executar: () => void): void {
  executar();
  fechar(id);
}
</script>

<template>
  <div class="regiao-avisos" role="status" aria-live="polite">
    <TransitionGroup name="aviso">
      <div v-for="t in toasts" :key="t.id" class="aviso" :class="`aviso--${t.tom}`">
        <i :class="ICONES[t.tom]" class="aviso__icone" aria-hidden="true"></i>
        <span class="aviso__mensagem">{{ t.mensagem }}</span>
        <button
          v-if="t.acao"
          type="button"
          class="aviso__acao"
          @click="executarAcao(t.id, t.acao.executar)"
        >
          {{ t.acao.rotulo }}
        </button>
        <button type="button" class="aviso__fechar" aria-label="Fechar aviso" @click="fechar(t.id)">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.regiao-avisos {
  position: fixed;
  right: var(--esp-4);
  bottom: var(--esp-4);
  left: var(--esp-4);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--esp-2);
  pointer-events: none; /* a região não bloqueia cliques na página… */
}

.aviso {
  pointer-events: auto; /* …mas cada aviso é clicável */
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  width: min(100%, 28rem);
  padding: var(--esp-3) var(--esp-3) var(--esp-3) var(--esp-4);
  border-radius: var(--raio-md);
  background: var(--superficie-inversa);
  color: var(--texto-inverso);
  box-shadow: var(--elevacao-3);
}

.aviso__icone {
  flex: none;
}

.aviso__mensagem {
  flex: 1;
  font-size: var(--texto-sm);
}

.aviso__acao {
  flex: none;
  min-height: 2rem;
  padding: 0 var(--esp-3);
  border: 0;
  border-radius: var(--raio-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
  text-decoration: underline;
  cursor: pointer;
}

.aviso__fechar {
  flex: none;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.aviso-enter-active,
.aviso-leave-active {
  transition: opacity var(--duracao-media) var(--curva-padrao),
    transform var(--duracao-media) var(--curva-padrao);
}
.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
