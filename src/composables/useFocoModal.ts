/**
 * ============================================================================
 * FOCO EM JANELAS MODAIS (`src/composables/useFocoModal.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA — POR QUE ISTO É IMPORTANTE?
 * Quem usa teclado ou leitor de tela navega com a tecla Tab. Quando abrimos um
 * diálogo (Dialog) ou um painel lateral (SideSheet), o foco precisa:
 *   1. ENTRAR no diálogo assim que ele abre;
 *   2. FICAR PRESO dentro dele (o Tab não pode "fugir" para a página de trás);
 *   3. FECHAR com a tecla Esc;
 *   4. VOLTAR para o botão que abriu o diálogo quando ele fechar.
 * Sem isso, o usuário de teclado se perde (WCAG 2.1.2 e 2.4.3).
 *
 * Uso:
 *   const painel = ref<HTMLElement | null>(null);
 *   useFocoModal(painel, () => props.aberto, () => emit('fechar'));
 */
import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue';

const SELETOR_FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocoModal(
  container: Ref<HTMLElement | null>,
  estaAberto: () => boolean,
  aoFechar: () => void
): void {
  let elementoAnterior: HTMLElement | null = null;

  function focaveis(): HTMLElement[] {
    if (!container.value) return [];
    return Array.from(container.value.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS));
  }

  function aoPressionarTecla(evento: KeyboardEvent): void {
    if (!estaAberto()) return;

    if (evento.key === 'Escape') {
      evento.preventDefault();
      aoFechar();
      return;
    }

    // Prende o Tab: do último elemento volta ao primeiro, e vice-versa.
    if (evento.key === 'Tab') {
      const lista = focaveis();
      if (lista.length === 0) return;
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  }

  watch(
    estaAberto,
    async (aberto) => {
      if (aberto) {
        elementoAnterior = document.activeElement as HTMLElement | null;
        document.addEventListener('keydown', aoPressionarTecla);
        document.body.style.overflow = 'hidden'; // impede a página de trás de rolar
        await nextTick();
        // Foca o primeiro campo; se não houver, o próprio contêiner.
        (focaveis()[0] ?? container.value)?.focus();
      } else {
        document.removeEventListener('keydown', aoPressionarTecla);
        document.body.style.overflow = '';
        elementoAnterior?.focus?.();
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', aoPressionarTecla);
    document.body.style.overflow = '';
  });
}
