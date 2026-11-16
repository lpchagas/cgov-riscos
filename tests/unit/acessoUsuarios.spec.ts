/**
 * EXPLICAÇÃO DIDÁTICA: testa o serviço do front que fala com a função
 * `gerenciar-acesso`, usando um cliente de mentira (sem rede).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const falso = vi.hoisted(() => {
  const estado = {
    invoke: vi.fn(),
    update: vi.fn(),
    tabela: [] as unknown[],
    faixas: [] as number[][],
  };
  const cadeiaUpdate = {
    eq: vi.fn(async () => ({ error: null })),
  };
  const cliente = {
    functions: { invoke: (...a: unknown[]) => estado.invoke(...a) },
    from: vi.fn(() => ({
      // Leitura paginada: devolve a página pedida em `.range(ini, fim)` a partir de `estado.tabela`.
      select: () => {
        const consulta: any = {
          eq: () => consulta,
          order: () => consulta,
          range: async (ini: number, fim: number) => {
            estado.faixas.push([ini, fim]);
            return { data: estado.tabela.slice(ini, fim + 1), error: null };
          },
        };
        return consulta;
      },
      update: (m: unknown) => {
        estado.update(m);
        return cadeiaUpdate;
      },
    })),
  };
  return { estado, cliente, cadeiaUpdate };
});

vi.mock('../../src/services/supabase', () => ({
  supabaseClient: falso.cliente,
  isSupabaseConfigurado: true,
}));

import { enviarLinks, criarPessoa, atualizarPerfil, listarPerfis, listarUnidadesAtivas } from '../../src/services/acessoUsuarios';

beforeEach(() => {
  falso.estado.invoke.mockReset();
  falso.estado.update.mockReset();
  falso.estado.faixas = [];
});

describe('acessoUsuarios: leitura paginada (limite de 1.000 linhas do PostgREST)', () => {
  it('listarPerfis lê 2 páginas (1.000 + 200) e junta tudo, na ordem recebida', async () => {
    falso.estado.tabela = Array.from({ length: 1200 }, (_, i) => ({
      id: `p-${i}`,
      nome_completo: `Pessoa ${i}`,
      email: `p${i}@radar.test`,
      unidade_id: 'u-1',
      papel_governanca: 'gestor',
      ativo: true,
      titular_chefia: false,
      unidades: { sigla: 'CGOV', nome: 'Coordenação de Governança' },
    }));
    const r = await listarPerfis();
    expect(r).toHaveLength(1200);
    expect(r[0].id).toBe('p-0');
    expect(r[1199].id).toBe('p-1199');
    expect(falso.estado.faixas).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('listarPerfis com exatamente 1.000 linhas pede uma 2ª página (vazia) para ter certeza', async () => {
    falso.estado.tabela = Array.from({ length: 1000 }, (_, i) => ({ id: `p-${i}`, nome_completo: 'x', unidades: null }));
    const r = await listarPerfis();
    expect(r).toHaveLength(1000);
    expect(falso.estado.faixas).toHaveLength(2);
  });

  it('listarUnidadesAtivas também pagina', async () => {
    falso.estado.tabela = Array.from({ length: 1500 }, (_, i) => ({ id: `u-${i}`, nome: `Unidade ${i}`, tipo: 'x' }));
    const r = await listarUnidadesAtivas();
    expect(r).toHaveLength(1500);
    expect(falso.estado.faixas).toHaveLength(2);
  });
});

describe('acessoUsuarios', () => {
  it('enviarLinks divide 450 ids em 3 lotes e junta o resultado', async () => {
    let n = 0;
    falso.estado.invoke.mockImplementation(async (_nome: string, { body }: { body: { ids: string[] } }) => {
      n++;
      return {
        data: { enviados: body.ids.slice(1), falhas: [{ id: body.ids[0], motivo: `falha ${n}` }] },
        error: null,
      };
    });
    const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`);
    const r = await enviarLinks(ids);
    expect(falso.estado.invoke).toHaveBeenCalledTimes(3);
    expect(r.enviados).toHaveLength(447);
    expect(r.falhas).toHaveLength(3);
  });

  it('409 vira a mensagem RADAR do servidor', async () => {
    falso.estado.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({ erro: 'RADAR: já existe uma conta com este e-mail.' }),
        },
      },
    });
    await expect(
      criarPessoa({ nome: 'Ana', email: 'ana@radar.test', unidadeId: 'u', papel: 'gestor', titular: false, enviarLink: false }),
    ).rejects.toThrow('RADAR: já existe uma conta com este e-mail.');
  });

  it('atualizarPerfil traduz os nomes para colunas do banco', async () => {
    await atualizarPerfil('p-1', { unidadeId: 'u-2', titularChefia: true, ativo: false, papel: 'cgov', cargo: null });
    expect(falso.estado.update).toHaveBeenCalledWith({
      unidade_id: 'u-2',
      titular_chefia: true,
      ativo: false,
      papel_governanca: 'cgov',
      cargo: null,
    });
    expect(falso.cadeiaUpdate.eq).toHaveBeenCalledWith('id', 'p-1');
  });
});
