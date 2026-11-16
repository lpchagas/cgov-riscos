/**
 * ============================================================================
 * ESCOLHA DA FONTE DE DADOS (`src/services/dados/index.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A store pede "me dê a fonte de dados do modo atual" e recebe uma
 * `FonteDados`, sem precisar saber de onde os dados vêm:
 *   - modo 'demonstracao' (sem `.env`): dados na memória do navegador;
 *   - modo 'real' (com Supabase): o banco de verdade.
 *
 * No modo demonstração dá para simular as telas de carregamento e de erro
 * gravando no navegador (DevTools → Application → Local Storage):
 *   radar.demo-estado.v1 = 'carregando'  → a carteira nunca termina de carregar
 *   radar.demo-estado.v1 = 'erro'        → a carteira falha (como sem internet)
 * Qualquer outro valor (ou nenhum) = 'normal'.
 *
 * Exemplo:
 *   const fonte = criarFonteDados(useAuthStore().modo);
 */
import type { ModoAuth } from '../../stores/authStore';
import { criarFonteDemonstracao, type EstadoDemonstracao } from './fonteDemonstracao';
import type { FonteDados } from './tipos';

export type * from './tipos';
export { criarFonteDemonstracao } from './fonteDemonstracao';

/** Chave do localStorage com o estado simulado da demonstração (a varredura de acessibilidade usa a mesma). */
export const CHAVE_ESTADO_DEMO = 'radar.demo-estado.v1';

/** Lê o estado simulado; qualquer falha ou valor estranho vira 'normal'. */
function lerEstadoDemo(): EstadoDemonstracao {
  try {
    const valor = localStorage.getItem(CHAVE_ESTADO_DEMO);
    if (valor === 'carregando' || valor === 'erro') return valor;
  } catch {
    // localStorage bloqueado (janela privada): segue no estado normal.
  }
  return 'normal';
}

export function criarFonteDados(modo: ModoAuth): FonteDados {
  if (modo === 'real') {
    // A fonte Supabase chega na Task 6 (criarFonteSupabase(supabaseClient!)).
    throw new Error('Fonte de dados do Supabase ainda não implementada.');
  }
  return criarFonteDemonstracao(lerEstadoDemo());
}
