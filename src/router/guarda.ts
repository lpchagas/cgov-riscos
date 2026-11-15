/**
 * ============================================================================
 * GUARDA DAS ROTAS (`src/router/guarda.ts`) — QUEM PODE ABRIR CADA TELA
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Pense em um porteiro. Antes de abrir qualquer tela, o roteador pergunta a ele:
 * "esta pessoa pode entrar aqui?". A resposta é uma de duas:
 *   - `seguir`: pode abrir a tela pedida;
 *   - `ir`: não pode; leve-a para OUTRO lugar (e, às vezes, mostre um aviso).
 *
 * Esta função é "pura": não mexe em tela, em banco nem na store. Só recebe os
 * fatos (`ContextoGuarda`) e devolve a decisão. Por isso é fácil de testar.
 * Quem junta os fatos e executa a decisão é o `router/index.ts`.
 *
 * EXEMPLOS PRÁTICOS:
 *  - Pessoa sem login pede `/riscos?status=x`  -> vai a `/entrar?volta=/riscos?status=x`.
 *  - Conta sem perfil cadastrado pela CGOV     -> vai a `/acesso-nao-liberado`.
 *  - Gestor pede "Importar riscos" (só CGOV)   -> vai ao Painel com o aviso
 *    "Esta tela é exclusiva da CGOV."
 */
import type { RouteLocationRaw } from 'vue-router';
import type { PapelGovernanca } from '../types/radar.types';
import type { ModoAuth, SituacaoAcesso } from '../stores/authStore';
import { podeAbrirRota } from '../utils/acessoPorPerfil';

/** Texto do aviso (toast) quando o perfil não pode abrir uma tela exclusiva da CGOV. */
export const AVISO_SO_CGOV = 'Esta tela é exclusiva da CGOV.';

/** Os fatos que a guarda precisa para decidir. */
export interface ContextoGuarda {
  modo: ModoAuth;
  situacao: SituacaoAcesso;
  /** Perfil de quem está usando (null quando ainda não há perfil). */
  papel: PapelGovernanca | null;
  /** Nome da rota pedida (ex.: 'riscos-lista'). */
  nomeRota: string;
  /** A rota abre sem login (`meta.publica`)? */
  publica: boolean;
  /** Endereço completo pedido, com a query (ex.: '/riscos?status=x'). */
  caminhoCompleto: string;
}

export type DecisaoGuarda = { tipo: 'seguir' } | { tipo: 'ir'; para: RouteLocationRaw; aviso?: string };

const SEGUIR: DecisaoGuarda = { tipo: 'seguir' };
const PAINEL: RouteLocationRaw = { name: 'painel-cgov' };

export function decidirNavegacao(ctx: ContextoGuarda): DecisaoGuarda {
  // 1) Modo demonstração: não há login. Só vale a tabela de acesso do perfil simulado.
  if (ctx.modo === 'demonstracao') {
    if (ctx.publica) return SEGUIR; // as telas de acesso abrem (a varredura de acessibilidade usa)
    return ctx.papel && !podeAbrirRota(ctx.papel, ctx.nomeRota)
      ? { tipo: 'ir', para: PAINEL, aviso: AVISO_SO_CGOV }
      : SEGUIR;
  }

  // 2) Modo real. Quem já entrou não precisa da tela de login.
  if (ctx.publica) {
    return ctx.situacao === 'ativo' && ctx.nomeRota === 'entrar' ? { tipo: 'ir', para: PAINEL } : SEGUIR;
  }

  switch (ctx.situacao) {
    case 'anonimo':
      // Guardamos o endereço pedido para voltar a ele depois do login.
      return { tipo: 'ir', para: { name: 'entrar', query: { volta: ctx.caminhoCompleto } } };
    case 'sem_perfil':
    case 'inativo':
      return { tipo: 'ir', para: { name: 'acesso-nao-liberado' } };
    case 'ativo':
      return ctx.papel && !podeAbrirRota(ctx.papel, ctx.nomeRota)
        ? { tipo: 'ir', para: PAINEL, aviso: AVISO_SO_CGOV }
        : SEGUIR;
    default:
      // 'carregando' e 'erro': a tela de erro/espera é do shell (Tarefa 4); não prendemos a navegação.
      return SEGUIR;
  }
}

/**
 * Aceita como "volta" só endereços DENTRO do RADAR: começam com uma barra e não com duas.
 * Sem isto, um link malicioso (`?volta=//site-falso.com`) levaria a pessoa para fora do sistema
 * logo depois do login. Qualquer coisa fora do padrão vira a raiz ('/').
 */
export function voltaSegura(valor: unknown): string {
  return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/';
}
