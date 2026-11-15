/**
 * ============================================================================
 * SERVIÇO DE GESTÃO DE ACESSOS (usado só pela tela da CGOV)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Duas formas de falar com o servidor:
 *  1. Consultas e edições simples de perfil: direto no banco; a segurança por
 *     linha (RLS) só deixa a CGOV mexer.
 *  2. Criar conta e enviar link: pela função `gerenciar-acesso`, que é a única
 *     que usa a chave secreta (nunca presente no front).
 * Erros do servidor chegam como `Error` com mensagem começando em "RADAR:".
 */
import { supabaseClient } from './supabase';
import type { PapelGovernanca } from '../types/radar.types';

export interface PerfilListado {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  papel: PapelGovernanca;
  unidadeId: string;
  unidadeSigla: string;
  unidadeNome: string;
  titularChefia: boolean;
  ativo: boolean;
}

export interface UnidadeOpcao {
  id: string;
  nome: string;
  sigla: string | null;
  tipo: string;
  icmbioId: string | null;
  tipoPai: string | null;
}

const TAMANHO_LOTE = 200;

/**
 * Tamanho de cada página de leitura. O PostgREST devolve no máximo 1.000 linhas por pedido
 * (`max_rows`); sem paginar, quem passasse da 1.000ª pessoa sumiria da tela.
 */
const TAMANHO_PAGINA = 1000;

/**
 * Lê uma tabela inteira, página por página (`.range`), até vir uma página incompleta.
 * Recebe uma função que monta o pedido de UMA página; a ordem precisa ser ESTÁVEL
 * (termina num desempate por `id`), senão linhas podem repetir ou faltar entre páginas.
 */
async function lerTodasAsPaginas(
  pedirPagina: (inicio: number, fim: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<any[]> {
  const todas: any[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await pedirPagina(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`RADAR: ${error.message}`);
    todas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) return todas;
  }
}

function cliente() {
  if (!supabaseClient) throw new Error('RADAR: o banco de dados não está configurado.');
  return supabaseClient;
}

/** Lê a mensagem RADAR devolvida pela função (corpo `{ erro }`), com plano B genérico. */
async function mensagemDoErro(erro: unknown): Promise<string> {
  const e = erro as { message?: string; context?: { json?: () => Promise<{ erro?: string }> } };
  try {
    const corpo = await e.context?.json?.();
    if (corpo?.erro) return corpo.erro;
  } catch {
    /* corpo ilegível: cai no genérico */
  }
  return 'RADAR: não foi possível concluir a operação agora.';
}

async function chamarFuncao<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await cliente().functions.invoke('gerenciar-acesso', { body });
  if (error) throw new Error(await mensagemDoErro(error));
  return data as T;
}

export async function listarPerfis(): Promise<PerfilListado[]> {
  // Ordem por nome (o que a tela mostra) + id (desempate estável entre as páginas).
  const linhas = await lerTodasAsPaginas((ini, fim) =>
    cliente()
      .from('perfis_usuarios')
      .select('id, nome_completo, email, cargo, unidade_id, papel_governanca, ativo, titular_chefia, unidades(sigla, nome)')
      .order('nome_completo')
      .order('id')
      .range(ini, fim),
  );
  return linhas.map((l) => {
    const u = Array.isArray(l.unidades) ? l.unidades[0] : l.unidades;
    return {
      id: l.id,
      nome: l.nome_completo,
      email: l.email,
      cargo: l.cargo ?? null,
      papel: l.papel_governanca,
      unidadeId: l.unidade_id,
      unidadeSigla: u?.sigla ?? '',
      unidadeNome: u?.nome ?? '',
      titularChefia: Boolean(l.titular_chefia),
      ativo: Boolean(l.ativo),
    };
  });
}

export async function listarUnidadesAtivas(): Promise<UnidadeOpcao[]> {
  const linhas = await lerTodasAsPaginas((ini, fim) =>
    cliente()
      .from('unidades')
      .select('id, nome, sigla, tipo, icmbio_id, unidade_pai:unidade_pai_id(tipo)')
      .eq('ativa', true)
      .order('nome')
      .order('id')
      .range(ini, fim),
  );
  return linhas.map((l) => {
    const pai = Array.isArray(l.unidade_pai) ? l.unidade_pai[0] : l.unidade_pai;
    return {
      id: l.id,
      nome: l.nome,
      sigla: l.sigla ?? null,
      tipo: l.tipo,
      icmbioId: l.icmbio_id ?? null,
      tipoPai: pai?.tipo ?? null,
    };
  });
}

/** Traduz os nomes do front para as colunas do banco e grava só o que mudou. */
export async function atualizarPerfil(
  id: string,
  mudancas: Partial<{
    papel: PapelGovernanca;
    unidadeId: string;
    titularChefia: boolean;
    ativo: boolean;
    cargo: string | null;
  }>,
): Promise<void> {
  const colunas: Record<string, unknown> = {};
  if (mudancas.papel !== undefined) colunas.papel_governanca = mudancas.papel;
  if (mudancas.unidadeId !== undefined) colunas.unidade_id = mudancas.unidadeId;
  if (mudancas.titularChefia !== undefined) colunas.titular_chefia = mudancas.titularChefia;
  if (mudancas.ativo !== undefined) colunas.ativo = mudancas.ativo;
  if (mudancas.cargo !== undefined) colunas.cargo = mudancas.cargo;
  const { error } = await cliente().from('perfis_usuarios').update(colunas).eq('id', id);
  if (error) throw new Error(error.message.startsWith('RADAR:') ? error.message : `RADAR: ${error.message}`);
}

export async function criarPessoa(p: {
  nome: string;
  email: string;
  unidadeId: string;
  papel: PapelGovernanca;
  titular: boolean;
  cargo?: string | null;
  enviarLink: boolean;
}): Promise<{ id: string }> {
  return chamarFuncao<{ id: string }>({
    acao: 'criar',
    nome: p.nome,
    email: p.email,
    unidade_id: p.unidadeId,
    papel: p.papel,
    titular: p.titular,
    cargo: p.cargo ?? null,
    enviar_link: p.enviarLink,
  });
}

/** Envia links em lotes de 200; uma falha num lote não perde o resto. */
export async function enviarLinks(
  ids: string[],
): Promise<{ enviados: string[]; falhas: { id: string; motivo: string }[] }> {
  const enviados: string[] = [];
  const falhas: { id: string; motivo: string }[] = [];
  for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
    const r = await chamarFuncao<{ enviados: string[]; falhas: { id: string; motivo: string }[] }>({
      acao: 'enviar_link',
      ids: ids.slice(i, i + TAMANHO_LOTE),
    });
    enviados.push(...r.enviados);
    falhas.push(...r.falhas);
  }
  return { enviados, falhas };
}

export async function listarSituacao(
  ids: string[],
): Promise<Record<string, { conviteEnviadoEm: string | null; ultimoAcessoEm: string | null }>> {
  const saida: Record<string, { conviteEnviadoEm: string | null; ultimoAcessoEm: string | null }> = {};
  for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
    const r = await chamarFuncao<{
      situacoes: Record<string, { convite_enviado_em: string | null; ultimo_acesso_em: string | null }>;
    }>({ acao: 'listar_situacao', ids: ids.slice(i, i + TAMANHO_LOTE) });
    for (const [id, s] of Object.entries(r.situacoes)) {
      saida[id] = { conviteEnviadoEm: s.convite_enviado_em, ultimoAcessoEm: s.ultimo_acesso_em };
    }
  }
  return saida;
}
