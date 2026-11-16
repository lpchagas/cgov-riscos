/**
 * ============================================================================
 * PAGINAÇÃO DE LEITURAS (`src/services/dados/paginacao.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O servidor (PostgREST) devolve no máximo 1.000 linhas por pedido. Se a tabela
 * tiver 2.345 linhas e pedirmos tudo de uma vez, as 1.345 últimas "somem" da
 * tela sem aviso. A solução é pedir em páginas (0-999, 1000-1999, ...) e juntar.
 *
 * REGRA: a ordem do pedido precisa ser ESTÁVEL (terminar com `.order('id')`),
 * senão linhas podem repetir ou faltar entre uma página e outra.
 */
import { traduzirErroBanco } from './errosBanco';

/** Quantas linhas pedir por página (igual ao limite do servidor). */
export const TAMANHO_PAGINA = 1000;

/**
 * Lê uma lista inteira, página por página, até vir uma página incompleta.
 * `pedirPagina(inicio, fim)` monta o pedido de UMA página (ex.: `.range(inicio, fim)`).
 * Exemplo: 2.345 linhas -> pedidos (0,999), (1000,1999), (2000,2999) -> 3 chamadas.
 * Qualquer erro vira `ErroRadar` (mensagem segura para a tela).
 */
export async function lerTodasAsPaginas<T>(
  pedirPagina: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamanho: number = TAMANHO_PAGINA,
): Promise<T[]> {
  if (tamanho <= 0) throw new Error('O tamanho da página deve ser maior que zero.');
  const todas: T[] = [];
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await pedirPagina(inicio, inicio + tamanho - 1);
    if (error) throw traduzirErroBanco(error);
    todas.push(...(data ?? []));
    // Página incompleta = acabou. (Página exata faz mais um pedido, que vem vazio.)
    if (!data || data.length < tamanho) return todas;
  }
}

/**
 * Divide uma lista em lotes e processa um de cada vez (em ordem), juntando os resultados.
 * Útil para pedidos do tipo `.in('id', [...])`: 2.500 ids viram 3 pedidos (1.000, 1.000, 500),
 * pois listas enormes estouram o tamanho máximo do endereço (URL).
 */
export async function emLotes<T, R>(
  itens: T[],
  tamanho: number,
  fazer: (lote: T[]) => Promise<R[]>,
): Promise<R[]> {
  if (tamanho <= 0) throw new Error('O tamanho do lote deve ser maior que zero.');
  const resultado: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    resultado.push(...(await fazer(itens.slice(i, i + tamanho))));
  }
  return resultado;
}
