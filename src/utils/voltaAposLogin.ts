/**
 * ============================================================================
 * "VOLTA APÓS O LOGIN" — LEMBRAR A TELA PEDIDA ANTES DE ENTRAR
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Quem pede `/riscos` sem estar logado é levado a `/entrar`. Para devolvê-lo a
 * `/riscos` depois do login, guardamos o endereço no navegador.
 *
 * Por que `localStorage` e não `sessionStorage`? O link do e-mail costuma abrir
 * em OUTRA ABA (às vezes outra janela do mesmo navegador). O `sessionStorage` é
 * separado por aba: a aba nova não o enxergaria. O `localStorage` é comum a todas
 * as abas do mesmo navegador.
 *
 * Cuidados:
 *  - guardamos `{ volta, em }` (o endereço e a hora) e só aceitamos por 1 HORA,
 *    o mesmo prazo de validade do link do e-mail (otp_expiry): um endereço
 *    esquecido de ontem não leva ninguém a lugar nenhum;
 *  - ao ler, o valor SEMPRE passa por `voltaSegura` (só endereços internos);
 *  - depois de usado (ou vencido), o item é apagado;
 *  - o acesso ao storage fica em try/catch: se o navegador bloquear, a pessoa
 *    simplesmente cai no Painel.
 *
 * Exemplo: guardarVolta('/riscos') ... lerEApagarVolta() -> '/riscos'  (e some)
 */
import { voltaSegura } from '../router/guarda';

/** Chave do localStorage onde guardamos a tela pedida antes do login (para voltar a ela). */
export const CHAVE_VOLTA = 'radar.volta-apos-login';

/** Validade da volta guardada: 1 hora (igual ao prazo do link do e-mail). */
export const VALIDADE_VOLTA_MS = 60 * 60 * 1000;

export function guardarVolta(volta: string): void {
  try {
    localStorage.setItem(CHAVE_VOLTA, JSON.stringify({ volta, em: Date.now() }));
  } catch {
    // Sem armazenamento a pessoa cai no Painel depois do login. Sem problema.
  }
}

/** Devolve a volta guardada (ou '/' se não há, venceu ou é insegura) e apaga o item. */
export function lerEApagarVolta(): string {
  try {
    const bruto = localStorage.getItem(CHAVE_VOLTA);
    localStorage.removeItem(CHAVE_VOLTA);
    if (!bruto) return '/';
    const { volta, em } = JSON.parse(bruto) as { volta?: unknown; em?: unknown };
    if (typeof em !== 'number' || Date.now() - em > VALIDADE_VOLTA_MS) return '/';
    return voltaSegura(volta);
  } catch {
    return '/';
  }
}
