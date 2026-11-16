import { describe, it, expect, vi } from 'vitest';
import { lerTodasAsPaginas, emLotes } from '../../src/services/dados/paginacao';
import { ErroRadar } from '../../src/services/dados/errosBanco';

/** Cria um "banco falso" com N linhas que responde a pedidos por faixa. */
function bancoFalso(total: number) {
  const linhas = Array.from({ length: total }, (_, i) => i);
  return vi.fn(async (ini: number, fim: number) => ({ data: linhas.slice(ini, fim + 1), error: null }));
}

describe('lerTodasAsPaginas', () => {
  it('junta 2.345 linhas em 3 páginas', async () => {
    const pedido = bancoFalso(2345);
    const todas = await lerTodasAsPaginas(pedido);
    expect(pedido.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(todas).toHaveLength(2345);
  });

  it('para quando a página vem exata e a seguinte vazia', async () => {
    const pedido = bancoFalso(2000);
    const todas = await lerTodasAsPaginas(pedido);
    expect(pedido).toHaveBeenCalledTimes(3);
    expect(todas).toHaveLength(2000);
  });

  it('erro vira ErroRadar', async () => {
    const pedido = async () => ({ data: null, error: { code: '42501', message: 'row-level security' } });
    await expect(lerTodasAsPaginas(pedido)).rejects.toBeInstanceOf(ErroRadar);
    await expect(lerTodasAsPaginas(pedido)).rejects.toMatchObject({ tipo: 'permissao' });
  });
});

describe('emLotes', () => {
  it('divide 2.500 ids em 3 lotes de até 1.000', async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => i);
    const tamanhos: number[] = [];
    const r = await emLotes(ids, 1000, async (lote) => {
      tamanhos.push(lote.length);
      return lote;
    });
    expect(tamanhos).toEqual([1000, 1000, 500]);
    expect(r).toHaveLength(2500);
  });
});
