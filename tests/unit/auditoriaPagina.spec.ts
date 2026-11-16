/**
 * ============================================================================
 * TESTES DA PÁGINA AUDITORIA — Fase 3 (`tests/unit/auditoriaPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - o CSV abre bem no Excel em português (BOM, ponto e vírgula, aspas dobradas,
 *     vírgula decimal);
 *   - os filtros reduzem a linha do tempo e a contagem acompanha.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useRiscosStore, definirFonteParaTeste } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { EventoAuditoria, FiltrosAuditoria, FonteDados } from '../../src/services/dados/tipos';
import { createRouter, createMemoryHistory } from 'vue-router';
import { eventosAuditoriaParaCsv, campo } from '../../src/utils/auditoriaCsv';
import TrilhaAuditoriaGovernancaView from '../../src/views/TrilhaAuditoriaGovernancaView.vue';

describe('campo (proteção contra fórmulas de planilha)', () => {
  it('textos que começam com = + - @ tab ou CR ganham apóstrofo; aspas continuam dobradas', () => {
    expect(campo('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    for (const ini of ['+1', '-1', '@soma', '\tabc', '\rabc']) expect(campo(ini)).toBe(`"'${ini}"`);
    expect(campo('Texto normal = ok')).toBe('"Texto normal = ok"');
  });
});

describe('eventosAuditoriaParaCsv', () => {
  it('exporta as colunas legíveis (título, mudanças e "Sistema/administrador")', () => {
    const csv = eventosAuditoriaParaCsv([{
      id: '1', realizadoEm: '2026-11-16T10:00:00Z', tabela: 'riscos', operacao: 'UPDATE', quemNome: null, quemPapel: null,
      codigoRadar: 'RADAR-2026-003', anteriores: { causas: 'A' }, novos: { causas: 'B' },
    }]);
    const linha = csv.split('\r\n')[1];
    expect(linha).toContain('"Risco RADAR-2026-003 alterado"');
    expect(linha).toContain('"Causas: A → B"');
    expect(linha).toContain('"Sistema/administrador"');
  });
});

describe('Página Auditoria', () => {
  afterEach(() => definirFonteParaTeste(null));
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  async function montar() {
    await useRiscosStore().carregar();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/auditoria', name: 'trilha-auditoria', component: TrilhaAuditoriaGovernancaView },
        { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
      ],
    });
    router.push('/auditoria');
    await router.isReady();
    const w = mount(TrilhaAuditoriaGovernancaView, { global: { plugins: [router] } });
    await flushPromises();
    return w;
  }

  it('mostra todos os eventos agrupados por dia, do mais recente ao mais antigo', async () => {
    const w = await montar();
    expect(w.findAll('.evento')).toHaveLength(6);
    expect(w.findAll('.dia__titulo').length).toBeGreaterThan(1);
    expect(w.find('.evento').text()).toContain('RADAR-2026-001');
  });

  it('filtro por tabela recomeça a lista; período sem eventos mostra o estado vazio', async () => {
    const w = await montar();
    const tabela = w.find('select');
    await tabela.setValue('riscos'); // a demonstração só tem passos do fluxo
    await flushPromises();
    expect(w.text()).toContain('Nenhum evento encontrado');
    await tabela.setValue('');
    await flushPromises();
    expect(w.findAll('.evento')).toHaveLength(6);
    await w.findAll('input[type="date"]')[0].setValue('2030-01-01');
    await flushPromises();
    expect(w.text()).toContain('Nenhum evento encontrado');
  });

  it('"Carregar mais" chama a fonte com o cursor do último evento e acrescenta sem repetir', async () => {
    const mk = (n: number): EventoAuditoria => ({
      id: `id-${String(n).padStart(3, '0')}`, realizadoEm: `2026-11-16T10:${String(59 - (n % 60)).padStart(2, '0')}:00Z`,
      tabela: 'controles_existentes', operacao: 'UPDATE', quemNome: null, quemPapel: null,
      codigoRadar: 'RADAR-2026-001', anteriores: { nome: 'a' }, novos: { nome: 'b' },
    });
    const pagina1 = Array.from({ length: 50 }, (_, i) => mk(i));
    const pagina2 = [mk(50), mk(51)];
    const chamadas: unknown[] = [];
    const demo = criarFonteDemonstracao();
    definirFonteParaTeste({
      ...demo,
      async lerAuditoria(f: FiltrosAuditoria) {
        chamadas.push(f);
        return f.antesDe ? pagina2 : pagina1;
      },
    } as FonteDados);
    const w = await montar();
    expect(w.findAll('.evento')).toHaveLength(50);
    await w.findAll('button').find((b) => b.text() === 'Carregar mais')!.trigger('click');
    await flushPromises();
    expect(chamadas[1]).toMatchObject({ antesDe: { em: pagina1[49].realizadoEm, id: pagina1[49].id } });
    expect(w.findAll('.evento')).toHaveLength(52);
    expect(w.text()).toContain('Sistema/administrador');
    // Menos de 50 na última página: acabou, o botão some.
    expect(w.findAll('button').some((b) => b.text() === 'Carregar mais')).toBe(false);
    // Trocar o filtro recomeça do zero (sem cursor).
    await w.find('select').setValue('controles_existentes');
    await flushPromises();
    expect(chamadas[chamadas.length - 1]).not.toHaveProperty('antesDe');
    expect(w.findAll('.evento')).toHaveLength(50);
  });
});
