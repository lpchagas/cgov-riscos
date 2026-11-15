/**
 * INTEGRAÇÃO: O IMPORTADOR `sync:atribuicoes` (Etapa B2, Tarefa 9)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Usa o CSV `fixtures/atribuicoes-integracao.csv` (pessoas fictícias
 * `@integracao.radar.test` em unidades REAIS que não têm usuários da semente) e
 * confere, no banco local: as contas nascem com os papéis certos; planejar de
 * novo dá plano vazio (idempotência); trocar o titular desliga a chave do
 * antigo, que continua ativo.
 * ============================================================================
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerTextoListaSharepoint } from '../../scripts/sync-estrutura/lerListaSharepoint';
import { lerAtribuicoes } from '../../scripts/sync-atribuicoes/lerAtribuicoes';
import { aplicarPlano, carregarEstado } from '../../scripts/sync-atribuicoes/aplicar';
import { planejarCarga, planoVazio } from '../../scripts/sync-atribuicoes/planejar';
import { clienteServico, garantirSupabaseNoAr, limparContasDeTeste } from './ajudantes';

const TEXTO = readFileSync(resolve(__dirname, 'fixtures/atribuicoes-integracao.csv'), 'utf8');

async function planejar(texto: string) {
  const lida = lerAtribuicoes(lerTextoListaSharepoint(texto));
  const { unidades, perfis } = await carregarEstado(clienteServico());
  return planejarCarga(lida.pessoas, unidades, perfis, lida.unidadesVistas, lida.unidadesTitularSemEmail);
}

async function perfilDe(email: string) {
  const r = await clienteServico().from('perfis_usuarios').select('*').eq('email', email).single();
  return r.data;
}

describe('importador sync:atribuicoes (Supabase local)', () => {
  beforeAll(async () => {
    await garantirSupabaseNoAr();
    await limparContasDeTeste();
  });
  afterAll(async () => {
    await limparContasDeTeste();
  });

  it('aplicar cria as contas com os papéis certos', async () => {
    const plano = await planejar(TEXTO);
    expect(plano.contasNovas).toHaveLength(5);
    const r = await aplicarPlano(clienteServico(), plano);
    expect(r.contasCriadas).toBe(5);

    const gerente = await perfilDe('gerente.gr3@integracao.radar.test');
    expect(gerente?.papel_governanca).toBe('gerente_regional');
    expect(gerente?.titular_chefia).toBe(true);
    const subst = await perfilDe('subst.gr3@integracao.radar.test');
    expect(subst?.papel_governanca).toBe('gestor');
    expect(subst?.titular_chefia).toBe(false);
    const ngi = await perfilDe('chefe.ngi@integracao.radar.test');
    expect(ngi?.papel_governanca).toBe('gestor');
    expect(ngi?.titular_chefia).toBe(true);
    expect(await perfilDe('coord.coagr3@integracao.radar.test')).toBeTruthy();
    expect(await perfilDe('chefe.servico@integracao.radar.test')).toBeTruthy();
  });

  it('planejar de novo dá plano vazio (idempotente)', async () => {
    expect(planoVazio(await planejar(TEXTO))).toBe(true);
  });

  it('trocar o titular da GR3: o antigo perde a chave e continua ativo', async () => {
    const trocado = TEXTO
      .replace('Gerente Integração Um', 'Gerente Integração Novo')
      .replace('9980001', '9980009')
      .replace('gerente.gr3@integracao.radar.test', 'gerente.novo@integracao.radar.test');
    const plano = await planejar(trocado);
    expect(plano.desligarChave.map((d) => d.email)).toContain('gerente.gr3@integracao.radar.test');
    await aplicarPlano(clienteServico(), plano);

    const antigo = await perfilDe('gerente.gr3@integracao.radar.test');
    expect(antigo?.titular_chefia).toBe(false);
    expect(antigo?.ativo).toBe(true);
    const novo = await perfilDe('gerente.novo@integracao.radar.test');
    expect(novo?.titular_chefia).toBe(true);
  });
});
