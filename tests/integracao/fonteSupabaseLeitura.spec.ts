/**
 * INTEGRAÇÃO: FONTE SUPABASE — LEITURAS (Etapa B3, Tarefa 6)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Prova, contra o Supabase local de verdade e com pessoas da semente, que a
 * fonte de dados entrega a cada uma só o que o RLS permite. Os testes só LEEM:
 * nada fica gravado, então a suíte pode rodar quantas vezes quiser.
 * Pré-requisito: `npm run db:reset` (semente de demonstração) e `db:funcoes`.
 * ============================================================================
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { criarFonteSupabase } from '../../src/services/dados/fonteSupabase';
import { entrarComo, garantirSupabaseNoAr } from './ajudantes';

describe('fonte Supabase — leituras (Supabase local)', () => {
  beforeAll(async () => {
    await garantirSupabaseNoAr();
  });

  it('gestor.uc@ vê só os riscos do alcance (igual ao select dele)', async () => {
    const cliente = await entrarComo('gestor.uc@radar.test');
    const carteira = await criarFonteSupabase(cliente).carregarCarteira();
    const { data } = await cliente.from('riscos').select('codigo_radar');
    const esperado = (data ?? []).map((r) => r.codigo_radar as string).sort();
    expect(esperado.length).toBeGreaterThan(0);
    expect(carteira.riscos.map((r) => r.codigoRadar).sort()).toEqual(esperado);
    expect(carteira.riscos.length).toBeLessThan(10);
  });

  it('cgov@ vê os 10 riscos, com listas de apoio preenchidas', async () => {
    const carteira = await criarFonteSupabase(await entrarComo('cgov@radar.test')).carregarCarteira();
    expect(carteira.riscos).toHaveLength(10);
    expect(carteira.categorias.length).toBeGreaterThan(0);
    expect(carteira.unidades.length).toBeGreaterThan(0);
    expect(carteira.objetos.length).toBeGreaterThan(0);
  });

  it('relerRisco devolve null para risco fora do alcance e a ficha para risco do alcance', async () => {
    const cgov = criarFonteSupabase(await entrarComo('cgov@radar.test'));
    const todos = (await cgov.carregarCarteira()).riscos;
    const gestor = criarFonteSupabase(await entrarComo('gestor.uc@radar.test'));
    const visiveis = new Set((await gestor.carregarCarteira()).riscos.map((r) => r.id));
    const fora = todos.find((r) => !visiveis.has(r.id))!;
    const dentro = todos.find((r) => visiveis.has(r.id))!;
    expect(await gestor.relerRisco(fora.id)).toBeNull();
    expect((await gestor.relerRisco(dentro.id))?.codigoRadar).toBe(dentro.codigoRadar);
    expect(await gestor.relerRisco('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('cada KRI lido traz totalRiscos (função kri_total_riscos), nunca menor que os riscos visíveis', async () => {
    const { riscos } = await criarFonteSupabase(await entrarComo('gestor.uc@radar.test')).carregarCarteira();
    const kris = riscos.flatMap((r) => r.kris);
    for (const k of kris) {
      expect(typeof k.totalRiscos).toBe('number');
      expect(k.totalRiscos!).toBeGreaterThanOrEqual(k.riscoIds.length);
    }
  });

  it('acoesNoFluxo: gr@ pode validar RADAR-DEMO-CT; ct@ não', async () => {
    async function podeValidar(email: string): Promise<boolean> {
      const fonte = criarFonteSupabase(await entrarComo(email));
      const risco = (await fonte.carregarCarteira()).riscos.find((r) => r.codigoRadar === 'RADAR-DEMO-CT')!;
      const acoes = await fonte.acoesNoFluxo([risco.id]);
      expect(acoes).toHaveLength(1);
      return acoes[0].podeValidar;
    }
    expect(await podeValidar('gr@radar.test')).toBe(true);
    expect(await podeValidar('ct@radar.test')).toBe(false);
  });

  it('lerAuditoria pagina por cursor sem repetir linhas', async () => {
    const fonte = criarFonteSupabase(await entrarComo('cgov@radar.test'));
    const p1 = await fonte.lerAuditoria({}, 5);
    expect(p1).toHaveLength(5);
    const ultima = p1[p1.length - 1];
    const p2 = await fonte.lerAuditoria({ antesDe: { em: ultima.realizadoEm, id: ultima.id } }, 5);
    expect(p2.length).toBeGreaterThan(0);
    const ids1 = new Set(p1.map((e) => e.id));
    expect(p2.some((e) => ids1.has(e.id))).toBe(false);
  });

  it('objetosOndeGravo de gestor.uc@ não é vazio', async () => {
    const ids = await criarFonteSupabase(await entrarComo('gestor.uc@radar.test')).objetosOndeGravo();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lerAtividadeRecente devolve uma lista (vazia se não há histórico)', async () => {
    const lista = await criarFonteSupabase(await entrarComo('cgov@radar.test')).lerAtividadeRecente(5);
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBeLessThanOrEqual(5);
  });
});
