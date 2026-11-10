import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UNIDADES_SEMENTE,
  CATEGORIAS_QUADRO_2_SEMENTE,
  RISCOS_SEMENTE_ANEXO_II,
} from '../../src/services/dadosSementeAnexoII';

describe('Migrations SQL e Dados Semente (Anexo II e Quadros 2/3)', () => {
  it('contém todas as tabelas nucleares e a função da Matriz Assimétrica no SQL de migração', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20261109001_schema_radar.sql'),
      'utf-8'
    );
    expect(sql).toContain('CREATE TABLE unidades');
    expect(sql).toContain("'coordenacao-geral'");
    expect(sql).toContain('CREATE TABLE categorias_risco');
    expect(sql).toContain('CREATE TABLE objetos_contexto');
    expect(sql).toContain('CREATE TABLE riscos');
    expect(sql).toContain('CREATE TABLE controles_existentes');
    expect(sql).toContain('CREATE TABLE respostas_tratamento');
    expect(sql).toContain('CREATE TABLE indicadores_kri');
    expect(sql).toContain('CREATE TABLE medicoes_kri');
    expect(sql).toContain('CREATE TABLE historico_fluxo');
    expect(sql).toContain('CREATE TABLE auditoria_log');
    expect(sql).toContain('calcular_nivel_inerente_q7');
  });

  it('possui as 8 categorias oficiais do Quadro 2 e unidades com coordenacao-geral no seed', () => {
    expect(CATEGORIAS_QUADRO_2_SEMENTE).toHaveLength(8);
    expect(UNIDADES_SEMENTE.some((u) => u.tipo === 'coordenacao-geral')).toBe(true);
    expect(RISCOS_SEMENTE_ANEXO_II[0].nivelInerente).toBe(22);
    expect(RISCOS_SEMENTE_ANEXO_II[0].kris).toHaveLength(3);
  });
});
