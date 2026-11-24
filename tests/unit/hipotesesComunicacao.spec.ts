/** Testes das hipóteses de comunicação à CGOV e do cálculo do prazo (LAC-04, UC-16). */
import { describe, it, expect } from 'vitest';
import { HIPOTESES, montarComunicacao, type ComunicacaoBase } from '../../src/utils/hipotesesComunicacao';

describe('HIPOTESES', () => {
  it('traz os rótulos do UC-16', () => {
    expect(HIPOTESES.I.rotulo).toContain('Mudança do nível residual');
    expect(HIPOTESES.II.rotulo).toContain('Falha de controle');
    expect(HIPOTESES.III.rotulo).toContain('Materialização');
    expect(HIPOTESES.IV.rotulo).toContain('Risco emergente');
    expect(HIPOTESES.V.rotulo).toContain('Atraso ou dificuldade no tratamento');
    expect(HIPOTESES.VI.rotulo).toContain('Plano de Gestão de Riscos');
    expect(HIPOTESES.alerta_kri.rotulo).toContain('KRI');
  });

  it('exige risco em I, II, III, V e alerta_kri (e só nelas)', () => {
    const exigem = Object.entries(HIPOTESES).filter(([, h]) => h.exigeRisco).map(([k]) => k);
    expect(exigem).toEqual(['I', 'II', 'III', 'V', 'alerta_kri']);
  });

  it('nunca usa a sigla PGR', () => {
    expect(JSON.stringify(HIPOTESES)).not.toMatch(/\bPGR\b/);
  });
});

describe('montarComunicacao', () => {
  const base: ComunicacaoBase = {
    id: 'c1',
    unidadeId: 'u1',
    hipotese: 'V',
    supre: [],
    dataCiencia: '2026-11-19',
    comunicadaEm: '2026-11-24T15:00:00.000Z',
    descricao: 'x',
    riscoIds: ['r1'],
  };

  it('conta os dias úteis da ciência ao dia do envio e marca no prazo', () => {
    const c = montarComunicacao(base);
    expect(c.prazoDiasUteis).toBe(2); // 20/11 é feriado; 23 e 24 contam
    expect(c.noPrazo).toBe(true);
    expect(c.venceEm).toBe('2026-12-04');
    expect(c.situacao).toBe('nova');
  });

  it('fora do prazo quando passa de 10 dias úteis; ciência da CGOV muda a situação', () => {
    const c = montarComunicacao({ ...base, dataCiencia: '2026-10-01', cienciaCgovEm: '2026-11-25T15:00:00.000Z' });
    expect(c.noPrazo).toBe(false);
    expect(c.situacao).toBe('ciencia_registrada');
  });
});
