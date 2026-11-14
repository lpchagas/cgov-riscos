/**
 * ============================================================================
 * AVISOS RÁPIDOS — "TOASTS" (`src/composables/useToast.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um "toast" é aquele aviso curto que aparece no canto da tela depois de uma
 * ação ("Risco validado"). Ele pode trazer uma ação de DESFAZER, o que é mais
 * seguro e mais rápido do que perguntar "Tem certeza?" antes de toda ação.
 *
 * Os avisos são lidos pelo leitor de tela automaticamente porque a região que
 * os exibe (`ToastRegion.vue`) tem `role="status"` (WCAG 4.1.3).
 *
 * Uso:
 *   const { mostrar } = useToast();
 *   mostrar({ mensagem: 'Risco validado', tom: 'sucesso',
 *             acao: { rotulo: 'Desfazer', executar: () => desfazer() } });
 */
import { ref } from 'vue';
import type { TomVisual } from '../utils/rotulosInterface';

export interface AcaoToast {
  rotulo: string;
  executar: () => void;
}

export interface Toast {
  id: number;
  mensagem: string;
  tom: TomVisual;
  acao?: AcaoToast;
}

// Lista compartilhada por toda a aplicação.
const toasts = ref<Toast[]>([]);
let proximoId = 1;

/** Tempo na tela: 6 s, ou 10 s quando há "Desfazer" (dá tempo de reagir). */
const DURACAO_PADRAO_MS = 6000;
const DURACAO_COM_ACAO_MS = 10000;

export function useToast() {
  function fechar(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function mostrar(dados: Omit<Toast, 'id' | 'tom'> & { tom?: TomVisual }): number {
    const id = proximoId++;
    toasts.value.push({ id, tom: dados.tom ?? 'info', mensagem: dados.mensagem, acao: dados.acao });
    window.setTimeout(() => fechar(id), dados.acao ? DURACAO_COM_ACAO_MS : DURACAO_PADRAO_MS);
    return id;
  }

  return { toasts, mostrar, fechar };
}
