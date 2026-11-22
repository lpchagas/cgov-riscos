import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UNIDADES_SEMENTE,
  CATEGORIAS_QUADRO_2_SEMENTE,
  RISCOS_SEMENTE_ANEXO_II,
} from '../../src/services/dadosSementeAnexoII';
import {
  CATEGORIAS_OFICIAIS_QUADRO_2,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
} from '../../src/utils/calculadoraRiscoRadar';

/** Lê um arquivo do repositório a partir da raiz. */
function lerArquivo(caminho: string): string {
  return readFileSync(resolve(__dirname, '../..', caminho), 'utf-8');
}

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

  // GUARDA CONTRA DIVERGÊNCIA (LAC-14 e LAC-15): as listas do Quadro 2 e do
  // Quadro 3 existem em três lugares (calculadora, seed.sql e migração
  // 20261122001). Se alguém mudar um texto num lugar só, este teste quebra.
  // Ex.: trocar 'Reputação' por 'Imagem/Reputação' no seed.sql → falha.
  it('seed.sql e migração usam as listas da calculadora', () => {
    const seed = lerArquivo('supabase/seed.sql');
    const migracao = lerArquivo('supabase/migrations/20261122001_categorias_subcategorias_quadros_2_3.sql');
    // O CHECK dos nomes: o trecho entre "categorias_risco_nome_quadro_2" e o fim do comando.
    const inicioCheck = migracao.indexOf('ADD CONSTRAINT categorias_risco_nome_quadro_2');
    expect(inicioCheck).toBeGreaterThan(-1);
    const check = migracao.slice(inicioCheck, migracao.indexOf(';', inicioCheck));

    for (const nome of CATEGORIAS_OFICIAIS_QUADRO_2) {
      expect(seed, `seed.sql sem a categoria ${nome}`).toContain(`'${nome}'`);
      expect(check, `CHECK da migração sem a categoria ${nome}`).toContain(`'${nome}'`);
    }
    for (const nome of SUBCATEGORIAS_INTEGRIDADE_QUADRO_3) {
      expect(seed, `seed.sql sem a subcategoria ${nome}`).toContain(`'${nome}'`);
      expect(migracao, `migração sem a subcategoria ${nome}`).toContain(`'${nome}'`);
    }
    // Nenhum nome antigo (categorias que saíram e subcategorias antigas) no seed.sql.
    const antigos = [
      'Estratégico',
      'Socioambiental',
      'Tecnologia da Informação',
      'Orçamentário/Financeiro',
      'Conformidade/Legal',
      'Imagem/Reputação',
      'Corrupção e Fraude',
      'Conflito de Interesses e Nepotismo',
      'Assédio Moral, Sexual e Discriminação',
      'Vazamento ou Uso Indevido de Informação Restrita',
      'Quebra de Imparcialidade ou Favorecimento Indevido',
      'Desvio de Recursos Públicos ou Patrimoniais',
    ];
    for (const antigo of antigos) {
      expect(seed, `seed.sql ainda tem o nome antigo ${antigo}`).not.toContain(`'${antigo}'`);
    }
  });

  // O teste pgTAP 090 tem CÓPIAS dos blocos 1 (trava) e 3 (alinhamento) da
  // migração 20261122001, porque uma migração não pode ser chamada de novo.
  // Este teste garante que as cópias continuam iguais ao original.
  it('teste 090 copia fielmente os blocos 1 e 3 da migração 20261122001', () => {
    const migracao = lerArquivo('supabase/migrations/20261122001_categorias_subcategorias_quadros_2_3.sql');
    const teste = lerArquivo('supabase/tests/090_categorias_subcategorias.test.sql');
    /** Trecho de `texto` que vai de `inicio` até `fim` (inclusive). */
    const trecho = (texto: string, inicio: string, fim: string): string => {
      const a = texto.indexOf(inicio);
      const b = texto.indexOf(fim, a);
      expect(a, `não achei "${inicio}"`).toBeGreaterThan(-1);
      expect(b, `não achei "${fim}"`).toBeGreaterThan(-1);
      return texto.slice(a, b + fim.length);
    };
    // Bloco 1 inteiro: das variáveis (DECLARE) até o fim da 2ª checagem
    // (categorias inesperadas), para que nenhuma das duas fique diferente.
    const bloco1 = (t: string) =>
      trecho(t, 'DECLARE\n  v_codigos text;', "v_inesperadas\n      USING ERRCODE = 'check_violation';\n  END IF;");
    const bloco3 = (t: string) => trecho(t, 'IF EXISTS (SELECT 1 FROM public.categorias_risco) THEN', "PERFORM setval('public.categorias_risco_id_seq', 11);\n  END IF;");
    expect(bloco1(teste)).toBe(bloco1(migracao));
    expect(bloco3(teste)).toBe(bloco3(migracao));
  });
});
