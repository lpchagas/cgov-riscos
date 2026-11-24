import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { somarDiasUteis, diasUteisEntre, hojeEmBrasilia } from '../../src/utils/diasUteis';
import { FERIADOS_NACIONAIS } from '../../src/utils/feriadosNacionais';

describe('somarDiasUteis (espelho de fn_somar_dias_uteis)', () => {
  it('10 dias úteis após 19/11/2026 = 04/12/2026 (pula 20/11 e dois fins de semana)', () => {
    expect(somarDiasUteis('2026-11-19', 10)).toBe('2026-12-04');
  });
  it('ciência num sábado (21/11): o 1º dia útil é a segunda 23/11 -> 04/12', () => {
    expect(somarDiasUteis('2026-11-21', 10)).toBe('2026-12-04');
  });
  it('somar 0 (ou negativo) devolve a própria data', () => {
    expect(somarDiasUteis('2026-11-19', 0)).toBe('2026-11-19');
    expect(somarDiasUteis('2026-11-19', -3)).toBe('2026-11-19');
  });
  it('respeita uma lista de feriados informada', () => {
    expect(somarDiasUteis('2030-01-01', 2, new Set(['2030-01-02']))).toBe('2030-01-04');
  });
});

describe('diasUteisEntre (espelho de fn_dias_uteis_entre)', () => {
  it('(19/11, 23/11] = 1: o dia 20 é feriado e 21 e 22 são fim de semana', () => {
    expect(diasUteisEntre('2026-11-19', '2026-11-23')).toBe(1);
  });
  it('fim antes do início = 0', () => {
    expect(diasUteisEntre('2026-11-23', '2026-11-20')).toBe(0);
  });
  it('mesmo dia = 0', () => {
    expect(diasUteisEntre('2026-11-23', '2026-11-23')).toBe(0);
  });
  it('feriado novo deixa de contar (como no teste do banco)', () => {
    expect(diasUteisEntre('2030-01-01', '2030-01-03', new Set(['2030-01-02']))).toBe(1);
    expect(diasUteisEntre('2030-01-01', '2030-01-03', new Set())).toBe(2);
  });
  it('é coerente com somarDiasUteis: entre(d, somar(d, 10)) = 10', () => {
    expect(diasUteisEntre('2026-11-19', somarDiasUteis('2026-11-19', 10))).toBe(10);
  });
});

describe('hojeEmBrasilia (espelho de fn_hoje)', () => {
  it('às 23h de 24/11 em Brasília (02h de 25/11 em UTC) ainda é 24/11', () => {
    expect(hojeEmBrasilia(new Date('2026-11-25T02:00:00Z'))).toBe('2026-11-24');
  });
  it('às 02h59 UTC de 25/11 (23h59 em Brasília) ainda é 24/11; às 03h00 UTC vira 25/11', () => {
    expect(hojeEmBrasilia(new Date('2026-11-25T02:59:00Z'))).toBe('2026-11-24');
    expect(hojeEmBrasilia(new Date('2026-11-25T03:00:00Z'))).toBe('2026-11-25');
  });
});

describe('FERIADOS_NACIONAIS', () => {
  it('tem as mesmas datas da semente da migração do banco', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20261123002_lac03_alerta_kri.sql'),
      'utf-8'
    );
    const bloco = sql.split('INSERT INTO public.feriados')[1].split(';')[0];
    const datasDoBanco = [...bloco.matchAll(/\('(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]);
    expect(datasDoBanco.length).toBeGreaterThan(20);
    expect([...FERIADOS_NACIONAIS].sort()).toEqual([...datasDoBanco].sort());
  });
});
