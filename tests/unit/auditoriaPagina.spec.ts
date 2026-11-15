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
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { eventosParaCsv } from '../../src/utils/auditoriaCsv';
import TrilhaAuditoriaGovernancaView from '../../src/views/TrilhaAuditoriaGovernancaView.vue';

describe('eventosParaCsv', () => {
  const evento = {
    criadoEm: '2026-11-07T16:45:00Z', codigoRadar: 'RADAR-2026-003', nomeObjeto: 'Autorização "direta"',
    categoriaNome: 'Socioambiental', nivelResidual: 8.4, classificacaoResidual: 'Médio',
    etapa: 'homologacao_diretoria', acao: 'aprovado_1_clique', usuarioNome: 'Diretor(a)', usuarioPapel: 'diretor',
    despachoTexto: 'Homologado; ok',
  };

  it('BOM + ponto e vírgula + aspas dobradas + vírgula decimal', () => {
    const csv = eventosParaCsv([evento]);
    expect(csv.startsWith('﻿"Data e hora";"Risco"')).toBe(true);
    const linha = csv.split('\r\n')[1];
    expect(linha).toContain('"Autorização ""direta"""');
    expect(linha).toContain('"8,4"');
    expect(linha).toContain('"homologado pela Diretoria e incluído no Plano"');
    expect(linha).toContain('"Homologado; ok"'); // ; dentro de aspas não quebra a coluna
  });
});

describe('Página Auditoria', () => {
  beforeEach(() => setActivePinia(createPinia()));

  async function montar() {
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

  it('filtrar por tipo e por papel reduz a lista', async () => {
    const w = await montar();
    const [tipo, papel] = w.findAll('select');
    await tipo.setValue('homologacao_diretoria');
    expect(w.findAll('.evento')).toHaveLength(1);
    expect(w.find('.barra__contagem').text()).toContain('1 evento com os filtros aplicados');
    await tipo.setValue('');
    await papel.setValue('gestor');
    expect(w.findAll('.evento').every((e) => e.text().includes('Gestor da unidade'))).toBe(true);
  });

  it('período sem eventos mostra o estado vazio', async () => {
    const w = await montar();
    const datas = w.findAll('input[type="date"]');
    await datas[0].setValue('2030-01-01');
    expect(w.text()).toContain('Nenhum evento encontrado');
  });
});
