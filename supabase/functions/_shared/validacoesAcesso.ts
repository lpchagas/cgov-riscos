/**
 * ============================================================================
 * VALIDAÇÕES DO PEDIDO DA FUNÇÃO `gerenciar-acesso` (TypeScript puro)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * A função `gerenciar-acesso` roda no servidor (Deno) e recebe pedidos do
 * front: "criar conta", "enviar link" e "listar situação". Antes de fazer
 * qualquer coisa, conferimos se o pedido está bem formado. Este arquivo NÃO
 * usa nada do Deno nem importa de `src/` (o Deno não enxerga `src/`), por isso
 * a lista de papéis é repetida aqui; um teste confere que ela é igual à do front.
 *
 * Exemplo: validarPedido({ acao: 'enviar_link', ids: [] })
 *          -> { ok: false, mensagem: 'RADAR: informe de 1 a 200 identificadores.' }
 */

/** Os 10 perfis (mesmas chaves do CHECK do banco). Igual a `PAPEIS` do front. */
export const PAPEIS_VALIDOS: readonly string[] = [
  'gestor',
  'coordenador_territorial',
  'gerente_regional',
  'coordenador_geral',
  'diretor',
  'presidencia',
  'auditoria',
  'cgov',
  'cgge',
  'gabin',
];

/** Máximo de contas por pedido (o front divide listas maiores em lotes). */
export const LIMITE_IDS_POR_PEDIDO = 200;

export type PedidoAcesso =
  | {
      acao: 'criar';
      nome: string;
      email: string;
      unidade_id: string;
      papel: string;
      titular: boolean;
      cargo?: string | null;
      enviar_link: boolean;
    }
  | { acao: 'enviar_link'; ids: string[] }
  | { acao: 'listar_situacao'; ids: string[] };

/** Tira espaços e põe em minúsculas: '  Ana@Radar.TEST ' -> 'ana@radar.test'. */
export function normalizarEmail(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

/** Conferência simples de forma (algo@dominio.ext), sem espaços. */
export function eEmailValido(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type Resultado = { ok: true; pedido: PedidoAcesso } | { ok: false; mensagem: string };

const erro = (mensagem: string): Resultado => ({ ok: false, mensagem });

export function validarPedido(corpo: unknown): Resultado {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    return erro('RADAR: pedido inválido.');
  }
  const c = corpo as Record<string, unknown>;

  if (c.acao === 'enviar_link' || c.acao === 'listar_situacao') {
    const ids = c.ids;
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > LIMITE_IDS_POR_PEDIDO ||
      !ids.every((i) => typeof i === 'string' && i.length > 0)
    ) {
      return erro(`RADAR: informe de 1 a ${LIMITE_IDS_POR_PEDIDO} identificadores.`);
    }
    return { ok: true, pedido: { acao: c.acao, ids: ids as string[] } };
  }

  if (c.acao === 'criar') {
    const nome = typeof c.nome === 'string' ? c.nome.trim() : '';
    if (!nome) return erro('RADAR: informe o nome da pessoa.');
    const email = normalizarEmail(typeof c.email === 'string' ? c.email : '');
    if (!eEmailValido(email)) return erro('RADAR: e-mail inválido.');
    if (typeof c.unidade_id !== 'string' || !c.unidade_id) return erro('RADAR: informe a unidade.');
    if (typeof c.papel !== 'string' || !PAPEIS_VALIDOS.includes(c.papel)) {
      return erro('RADAR: perfil inválido.');
    }
    const cargo = typeof c.cargo === 'string' && c.cargo.trim() ? c.cargo.trim() : null;
    return {
      ok: true,
      pedido: {
        acao: 'criar',
        nome,
        email,
        unidade_id: c.unidade_id,
        papel: c.papel,
        titular: c.titular === true,
        cargo,
        enviar_link: c.enviar_link === true,
      },
    };
  }

  return erro('RADAR: ação desconhecida.');
}
