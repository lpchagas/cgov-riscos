import { describe, it, expect } from 'vitest';
import { situacaoKri, ordenarPorUrgencia, type SituacaoKri } from '../../src/utils/situacaoKri';
import type { AlertaKri, IndicadorKri } from '../../src/types/radar.types';

const kriBase: IndicadorKri = {
  id: 'k1',
  objetoId: 'o1',
  riscoIds: ['r1'],
  nomeIndicador: 'KRI de teste',
  medicoes: [],
};
const comLimite: IndicadorKri = { ...kriBase, limiteOperador: '<', limiteValor: 80, limiteUnidade: '%' };
const alertaBase: AlertaKri = {
  id: 'a1', kriId: 'k1', cienciaEm: '2026-11-19', venceEm: '2026-12-04',
  diaAtual: 3, vencido: false, diasUteisVencido: 0,
};

describe('situacaoKri', () => {
  it('vencido: alerta aberto e vencido', () => {
    expect(situacaoKri(comLimite, { ...alertaBase, vencido: true, diaAtual: 11, diasUteisVencido: 1 })).toBe('vencido');
  });
  it('alerta: alerta aberto no prazo', () => {
    expect(situacaoKri(comLimite, alertaBase)).toBe('alerta');
  });
  it('comunicado: alerta encerrado (encerradoEm) ou com comunicação', () => {
    expect(situacaoKri(comLimite, { ...alertaBase, encerradoEm: '2026-11-24' })).toBe('comunicado');
    expect(situacaoKri(comLimite, { ...alertaBase, comunicacaoId: 'c1' })).toBe('comunicado');
    // Encerrado vence o "vencido": já foi comunicado.
    expect(situacaoKri(comLimite, { ...alertaBase, vencido: true, encerradoEm: '2026-12-10' })).toBe('comunicado');
  });
  it('sem_limite: sem limite numérico (inclui só texto antigo)', () => {
    expect(situacaoKri(kriBase)).toBe('sem_limite');
    expect(situacaoKri({ ...kriBase, limiteAlerta: 'Abaixo de 70%' })).toBe('sem_limite');
    expect(situacaoKri({ ...kriBase, limiteOperador: '<' })).toBe('sem_limite');
    expect(situacaoKri({ ...kriBase, limiteValor: 0 })).toBe('sem_limite');
  });
  it('dentro: limite numérico e nenhum alerta (limite 0 é válido)', () => {
    expect(situacaoKri(comLimite)).toBe('dentro');
    expect(situacaoKri({ ...kriBase, limiteOperador: '>', limiteValor: 0 })).toBe('dentro');
  });
});

describe('ordenarPorUrgencia', () => {
  const sit = (t: { s: SituacaoKri }) => t.s;
  const itens = [
    { n: 1, s: 'dentro' as const }, { n: 2, s: 'alerta' as const },
    { n: 3, s: 'comunicado' as const }, { n: 4, s: 'vencido' as const },
    { n: 5, s: 'sem_limite' as const }, { n: 6, s: 'alerta' as const },
    { n: 7, s: 'vencido' as const },
  ];
  it('ordena vencido, alerta, comunicado, sem_limite, dentro, mantendo a ordem original dentro do grupo', () => {
    expect(ordenarPorUrgencia(itens, sit).map((i) => i.n)).toEqual([4, 7, 2, 6, 3, 5, 1]);
  });
  it('não altera a lista recebida', () => {
    const copia = [...itens];
    ordenarPorUrgencia(itens, sit);
    expect(itens).toEqual(copia);
  });
});
