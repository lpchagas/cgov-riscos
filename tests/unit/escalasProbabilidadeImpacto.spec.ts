/**
 * Testes das escalas literais dos Quadros 4 (probabilidade) e 5 (impacto).
 * Os textos esperados vêm de docs/01-normativos/matriz-regras-regime-b.md (§6 e §7).
 */
import { describe, expect, it } from 'vitest';
import {
  ESCALA_IMPACTO_QUADRO_5,
  ESCALA_PROBABILIDADE_QUADRO_4,
  lerNivelDaCelula,
  nomeDoNivel,
} from '../../src/utils/escalasProbabilidadeImpacto';

describe('escalas dos Quadros 4 e 5', () => {
  it('Quadro 4 tem os 5 nomes literais, em ordem', () => {
    expect(ESCALA_PROBABILIDADE_QUADRO_4.map((n) => [n.valor, n.nome])).toEqual([
      [1, 'Raro'], [2, 'Pouco provável'], [3, 'Provável'], [4, 'Muito provável'], [5, 'Praticamente certo'],
    ]);
  });

  it('Quadro 5 tem os 5 nomes literais, em ordem', () => {
    expect(ESCALA_IMPACTO_QUADRO_5.map((n) => [n.valor, n.nome])).toEqual([
      [1, 'Muito baixo'], [2, 'Baixo'], [3, 'Médio'], [4, 'Alto'], [5, 'Muito alto'],
    ]);
  });

  it('as descrições são as da matriz de regras', () => {
    expect(ESCALA_PROBABILIDADE_QUADRO_4[0].descricao).toBe('Acontece apenas em situações excepcionais. Não há histórico conhecido do evento ou não há indícios que sinalizem sua ocorrência.');
    expect(ESCALA_PROBABILIDADE_QUADRO_4[4].descricao).toBe('Evento repetitivo e constante, de ocorrência numerosa, com histórico disponível ou não, mas evidente para os que conhecem o processo.');
    expect(ESCALA_IMPACTO_QUADRO_5[0].descricao).toBe('Compromete minimamente o atingimento do objetivo; para fins práticos, não altera o alcance do objetivo/resultado.');
    expect(ESCALA_IMPACTO_QUADRO_5[4].descricao).toBe('Compromete totalmente ou quase totalmente o atingimento do objetivo/resultado.');
  });

  it('nenhum nome nem descrição tem "%"', () => {
    for (const n of [...ESCALA_PROBABILIDADE_QUADRO_4, ...ESCALA_IMPACTO_QUADRO_5]) {
      expect(n.nome).not.toContain('%');
      expect(n.descricao).not.toContain('%');
    }
  });

  it.each([
    ['3', 3], ['Provável', 3], ['provavel', 3], [' PROVÁVEL ', 3], ['3 — Provável', 3],
    ['3 - Provável', 3], ['Provável (3)', 3], ['3 (Provável)', 3], ['Praticamente certo', 5],
  ])('lê "%s" como %i', (celula, esperado) => {
    expect(lerNivelDaCelula(celula, ESCALA_PROBABILIDADE_QUADRO_4)).toEqual({ ok: true, nivel: esperado });
  });

  it.each(['', '0', '6', '-1', '3,5', '2 a 3', 'abc', 'Média', '3 — Raro'])('recusa "%s"', (celula) => {
    expect(lerNivelDaCelula(celula, ESCALA_PROBABILIDADE_QUADRO_4).ok).toBe(false);
  });

  it('explica a divergência entre número e nome', () => {
    expect(lerNivelDaCelula('3 — Raro', ESCALA_PROBABILIDADE_QUADRO_4)).toEqual({
      ok: false, motivo: 'o número (3) e o nome ("Raro") não concordam',
    });
  });

  it('nomeDoNivel devolve o nome', () => {
    expect(nomeDoNivel(ESCALA_IMPACTO_QUADRO_5, 4)).toBe('Alto');
  });

  it('devolve os motivos exatos de recusa', () => {
    const q4 = ESCALA_PROBABILIDADE_QUADRO_4;
    expect(lerNivelDaCelula('', q4)).toEqual({ ok: false, motivo: 'célula vazia' });
    expect(lerNivelDaCelula('6', q4)).toEqual({ ok: false, motivo: 'fora de 1 a 5' });
    expect(lerNivelDaCelula('3,5', q4)).toEqual({ ok: false, motivo: 'mais de um número' });
    expect(lerNivelDaCelula('abc', q4)).toEqual({ ok: false, motivo: 'nome fora do quadro' });
  });

  it('lê células também na escala de impacto (Quadro 5)', () => {
    expect(lerNivelDaCelula('Alto', ESCALA_IMPACTO_QUADRO_5)).toEqual({ ok: true, nivel: 4 });
    expect(lerNivelDaCelula('Média', ESCALA_IMPACTO_QUADRO_5).ok).toBe(false);
  });

  it('nomeDoNivel falha para um valor que não existe na escala', () => {
    expect(() => nomeDoNivel(ESCALA_IMPACTO_QUADRO_5, 9 as never)).toThrow('Nível 9 não existe na escala');
  });
});
