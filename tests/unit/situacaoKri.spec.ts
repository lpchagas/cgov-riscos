import { describe, it, expect } from 'vitest';
import { situacaoKri, ordenarPorUrgencia, montarAlertaKri, alertaAtualDoKri, type SituacaoKri } from '../../src/utils/situacaoKri';
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
  // D-5 (decisão do responsável, 2026-11-24): "comunicado" vale SÓ ATÉ A PRÓXIMA LEITURA,
  // isto é, uma leitura REGISTRADA (registradoEm = criado_em do banco) em dia posterior ao encerramento.
  describe('comunicado vale até a próxima leitura (D-5)', () => {
    const comunicado: AlertaKri = { ...alertaBase, encerradoEm: '2026-11-24', comunicacaoId: 'c1' };
    const leitura = (registradoEm: string | undefined, emAlerta = false, dataMedicao = '2026-11-20') => ({
      id: `m-${registradoEm}`, dataMedicao, valorApurado: '85%', emAlerta, ...(registradoEm ? { registradoEm } : {}),
    });

    it('sem leitura nova -> comunicado (leitura registrada antes ou no dia do encerramento não conta)', () => {
      expect(situacaoKri(comLimite, comunicado)).toBe('comunicado');
      const antes = { ...comLimite, medicoes: [leitura('2026-11-21T13:00:00Z', true)] };
      expect(situacaoKri(antes, comunicado)).toBe('comunicado');
      const mesmoDia = { ...comLimite, medicoes: [leitura('2026-11-24T15:00:00Z')] };
      expect(situacaoKri(mesmoDia, comunicado)).toBe('comunicado');
    });

    it('leitura nova dentro do limite -> dentro (e sem limite numérico -> sem_limite)', () => {
      const depois = { ...comLimite, medicoes: [leitura('2026-11-25T13:00:00Z')] };
      expect(situacaoKri(depois, comunicado)).toBe('dentro');
      expect(situacaoKri({ ...kriBase, medicoes: depois.medicoes }, comunicado)).toBe('sem_limite');
    });

    it('o dia do registro é o de Brasília: 25/11 01:00 UTC ainda é 24/11 em Brasília', () => {
      const noite = { ...comLimite, medicoes: [leitura('2026-11-25T01:00:00Z')] };
      expect(situacaoKri(noite, comunicado)).toBe('comunicado');
    });

    it('leitura antiga sem carimbo de registro usa a data da medição', () => {
      expect(situacaoKri({ ...comLimite, medicoes: [leitura(undefined, false, '2026-11-25')] }, comunicado)).toBe('dentro');
      expect(situacaoKri({ ...comLimite, medicoes: [leitura(undefined, false, '2026-11-24')] }, comunicado)).toBe('comunicado');
    });

    it('leitura nova em alerta (o banco abre alerta novo) -> alerta', () => {
      const kri = { ...comLimite, medicoes: [leitura('2026-11-26T13:00:00Z', true)] };
      const novo: AlertaKri = { ...alertaBase, id: 'a2', cienciaEm: '2026-11-26', diaAtual: 0 };
      const atual = alertaAtualDoKri([{ ...comunicado }, novo], 'k1');
      expect(atual?.id).toBe('a2');
      expect(situacaoKri(kri, atual)).toBe('alerta');
    });
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

describe('montarAlertaKri (imita a visão alertas_kri_situacao)', () => {
  it('aberto no prazo: ciência 19/11, hoje 24/11 -> dia 2 (20/11 é feriado; 23 e 24 contam), vence em 04/12', () => {
    const a = montarAlertaKri({ id: 'a', kriId: 'k', cienciaEm: '2026-11-19' }, '2026-11-24');
    expect(a).toMatchObject({ diaAtual: 2, vencido: false, diasUteisVencido: 0, venceEm: '2026-12-04' });
  });
  it('aberto vencido: dia 11 em diante; dias além do prazo contam sem o teto de 99', () => {
    const v = montarAlertaKri({ id: 'a', kriId: 'k', cienciaEm: '2026-11-19' }, '2026-12-07');
    expect(v).toMatchObject({ diaAtual: 11, vencido: true, diasUteisVencido: 1 });
    const longe = montarAlertaKri({ id: 'a', kriId: 'k', cienciaEm: '2026-01-02' }, '2027-06-30');
    expect(longe.diaAtual).toBe(99);
    expect(longe.diasUteisVencido).toBeGreaterThan(89);
  });
  it('encerrado: conta até o encerramento e nunca fica vencido', () => {
    const e = montarAlertaKri({ id: 'a', kriId: 'k', cienciaEm: '2026-11-19', encerradoEm: '2026-12-09', comunicacaoId: 'c' }, '2027-03-01');
    expect(e).toMatchObject({ diaAtual: 13, vencido: false, diasUteisVencido: 0, comunicacaoId: 'c' });
  });
});

describe('alertaAtualDoKri', () => {
  it('com um comunicado antigo e um aberto novo no mesmo KRI, mostra o aberto', () => {
    const antigo: AlertaKri = { ...alertaBase, id: 'velho', cienciaEm: '2026-10-01', encerradoEm: '2026-10-05', comunicacaoId: 'c0' };
    const aberto: AlertaKri = { ...alertaBase, id: 'novo', cienciaEm: '2026-11-19' };
    expect(alertaAtualDoKri([antigo, aberto], 'k1')?.id).toBe('novo');
    expect(alertaAtualDoKri([aberto, antigo], 'k1')?.id).toBe('novo');
  });
  it('sem aberto, devolve o encerrado mais recente; sem alerta, undefined', () => {
    const a1: AlertaKri = { ...alertaBase, id: 'a1', cienciaEm: '2026-09-01', encerradoEm: '2026-09-03' };
    const a2: AlertaKri = { ...alertaBase, id: 'a2', cienciaEm: '2026-10-01', encerradoEm: '2026-10-03' };
    expect(alertaAtualDoKri([a1, a2], 'k1')?.id).toBe('a2');
    expect(alertaAtualDoKri([a1], 'outro')).toBeUndefined();
  });
  it('mesmo critério de "aberto" que situacaoKri: alerta só com comunicacaoId conta como encerrado (M-5a)', () => {
    const comunicadoSemData: AlertaKri = { ...alertaBase, id: 'c', cienciaEm: '2026-09-01', comunicacaoId: 'c1' };
    const recente: AlertaKri = { ...alertaBase, id: 'recente', cienciaEm: '2026-10-01', encerradoEm: '2026-10-05' };
    // Nenhum dos dois está aberto: vale o mais recente, e não "o primeiro sem encerradoEm".
    expect(alertaAtualDoKri([comunicadoSemData, recente], 'k1')?.id).toBe('recente');
  });
});
