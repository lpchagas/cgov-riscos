/**
 * TESTE DA FONTE SUPABASE (LEITURAS) COM CLIENTE FALSO
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Em vez do banco de verdade, usamos um "cliente falso" que guarda tabelas na
 * memória e respeita `.range(a, b)` (como o servidor, que corta em páginas).
 * Assim provamos, sem rede, que:
 *   - a carteira lê TODAS as páginas (1.500 riscos > limite de 1.000);
 *   - os filhos (controles) caem no risco certo;
 *   - `acoesNoFluxo` quebra 2.100 ids em 3 chamadas da função do banco.
 */
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarFonteSupabase } from '../../src/services/dados/fonteSupabase';

type Linha = Record<string, unknown>;

/** Cliente falso: `from(tabela)` devolve um pedido encadeável; `rpc` registra as chamadas. */
function clienteFalso(tabelas: Record<string, Linha[]>) {
  const chamadasRpc: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const cliente = {
    from(tabela: string) {
      const linhas = tabelas[tabela] ?? [];
      let inicio = 0;
      let fim = Infinity;
      const pedido = {
        select: () => pedido,
        order: () => pedido,
        in: () => pedido,
        eq: () => pedido,
        range(a: number, b: number) {
          inicio = a;
          fim = b;
          return pedido;
        },
        then(ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) {
          return Promise.resolve({ data: linhas.slice(inicio, fim + 1), error: null }).then(ok, falha);
        },
      };
      return pedido;
    },
    rpc(nome: string, args: Record<string, unknown>) {
      chamadasRpc.push({ nome, args });
      return Promise.resolve({ data: [], error: null });
    },
  };
  return { cliente: cliente as unknown as SupabaseClient, chamadasRpc };
}

describe('fonte Supabase — leituras (cliente falso)', () => {
  it('carregarCarteira pagina riscos acima de 1.000', async () => {
    const riscos: Linha[] = Array.from({ length: 1500 }, (_, i) => ({
      id: `r${i}`,
      codigo_radar: `RADAR-X-${i}`,
      objeto_id: 'o1',
      categoria_id: 1,
    }));
    const { cliente } = clienteFalso({
      categorias_risco: [{ id: 1, nome: 'Estratégico' }],
      unidades: [{ id: 'u1', sigla: 'UC', nome: 'UC', tipo: 'uc' }],
      objetos_contexto: [{ id: 'o1', nome_objeto: 'Obj', unidade_id: 'u1' }],
      riscos,
      controles_existentes: [
        { id: 'c1', risco_id: 'r1400', descricao_controle: 'Controle do 1400' },
        { id: 'c2', risco_id: 'r3', descricao_controle: 'Controle do 3' },
      ],
    });
    const carteira = await criarFonteSupabase(cliente).carregarCarteira();
    expect(carteira.riscos).toHaveLength(1500);
    const r1400 = carteira.riscos.find((r) => r.id === 'r1400')!;
    expect(r1400.controlesExistentes.map((c) => c.id)).toEqual(['c1']);
    expect(carteira.riscos.find((r) => r.id === 'r3')!.controlesExistentes.map((c) => c.id)).toEqual(['c2']);
    expect(carteira.riscos.find((r) => r.id === 'r0')!.controlesExistentes).toEqual([]);
  });

  it('acoesNoFluxo chama a RPC em lotes', async () => {
    const { cliente, chamadasRpc } = clienteFalso({});
    const ids = Array.from({ length: 2100 }, (_, i) => `id${i}`);
    await criarFonteSupabase(cliente).acoesNoFluxo(ids);
    expect(chamadasRpc.map((c) => (c.args.riscos as string[]).length)).toEqual([1000, 1000, 100]);
    expect(chamadasRpc.every((c) => c.nome === 'acoes_no_fluxo')).toBe(true);
  });

  it('as gravações ainda rejeitam com "não implementado"', async () => {
    const { cliente } = clienteFalso({});
    await expect(criarFonteSupabase(cliente).enviar('x')).rejects.toThrow('não implementado (Task 7)');
  });
});
