/**
 * TESTES DA AUDITORIA LEGÍVEL (`src/utils/auditoriaLegivel.ts`)
 * Traduzem linhas cruas do banco em frases que a Auditoria Interna entende.
 */
import { describe, it, expect } from 'vitest';
import { descreverEvento, quemFez } from '../../src/utils/auditoriaLegivel';
import type { EventoAuditoria } from '../../src/services/dados/tipos';

const base: EventoAuditoria = {
  id: 'a1', realizadoEm: '2026-11-16T10:00:00Z', tabela: 'riscos', operacao: 'UPDATE',
  quemNome: 'Ana', quemPapel: 'gestor', codigoRadar: 'RADAR-2026-003', anteriores: null, novos: null,
};

describe('descreverEvento', () => {
  it('só status_critico e atualizado_em mudaram: recalculado pela DAR (e não "editado")', () => {
    const r = descreverEvento({
      ...base,
      anteriores: { status_critico: 'nao', atualizado_em: '2026-11-01' },
      novos: { status_critico: 'sim', atualizado_em: '2026-11-16' },
    });
    expect(r.recalculadoPelaDar).toBe(true);
    expect(r.titulo).toBe('Risco RADAR-2026-003 recalculado pela DAR');
    expect(r.titulo).not.toContain('editad');
  });

  it('mudou o campo causas: não é recálculo e a mudança aparece como "Causas: antes → depois"', () => {
    const r = descreverEvento({ ...base, anteriores: { causas: 'A' }, novos: { causas: 'B' } });
    expect(r.recalculadoPelaDar).toBe(false);
    expect(r.titulo).toBe('Risco RADAR-2026-003 alterado');
    expect(r.mudancas).toEqual([{ campo: 'Causas', antes: 'A', depois: 'B' }]);
  });

  it('títulos por tabela e operação', () => {
    expect(descreverEvento({ ...base, tabela: 'controles_existentes' }).titulo).toBe('Controle do risco RADAR-2026-003 alterado');
    expect(descreverEvento({ ...base, operacao: 'INSERT', novos: { nome: 'x' } }).titulo).toBe('Risco RADAR-2026-003 criado');
    expect(
      descreverEvento({
        ...base, tabela: 'categorias_risco', codigoRadar: null,
        anteriores: { nome: 'Integridade', apetite_declarado: 'baixo' }, novos: { nome: 'Integridade', apetite_declarado: 'moderado' },
      }).titulo
    ).toBe('Apetite da categoria Integridade alterado');
  });

  it('campo desconhecido usa o nome da coluna sem "_"; booleano vira Sim/Não; vazio vira "—"', () => {
    const r = descreverEvento({ ...base, anteriores: { campo_novo: null, possui_evidencia: false }, novos: { campo_novo: 'x', possui_evidencia: true } });
    expect(r.mudancas).toContainEqual({ campo: 'campo novo', antes: '—', depois: 'x' });
    expect(r.mudancas).toContainEqual({ campo: 'Possui evidência', antes: 'Não', depois: 'Sim' });
  });
});

describe('quemFez', () => {
  it('quemNome nulo → "Sistema/administrador"', () => {
    expect(quemFez({ quemNome: null })).toBe('Sistema/administrador');
    expect(quemFez({ quemNome: 'Ana' })).toBe('Ana');
  });
});
