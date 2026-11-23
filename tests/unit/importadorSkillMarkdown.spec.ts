import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_OFICIAIS_QUADRO_2,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
} from '../../src/utils/calculadoraRiscoRadar';
import {
  contarFormato,
  importarTabelaMarkdownSkill,
  lerEvidencia,
  lerMarcadorEvidencia,
  lerMarcadorFinalEvidencia,
  textoDoControleSemMarcador,
  existeControleNoTexto,
  lerNumeroSkill,
  lerSimNao,
  normalizarCategoriaImportada,
  normalizarSubcategoriaImportada,
} from '../../src/utils/importadorSkillMarkdown';

describe('Importador de Tabelas Markdown da Skill cgov-gestao-riscos-v4', () => {
  it('converte uma tabela Markdown do Regime B em fichas preliminares recalculadas pelo motor oficial', () => {
    const markdown = `
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-01 | Concessão de Autorização | Devido o(a) ausência de checklist documental, poderá ocorrer o(a) emissão de autorização indevida, ocasionando o(a) dano ambiental em UC e impactando o alcance do objetivo de conservação da biodiversidade. | Operacional | 3 | 4 | 18 | Extremo | Conferência manual sem registro formal | Fraco (0,9) | 16,2 | Alto | pendente_dar | sim | Mitigar | % de processos revisados no trimestre |
    `;

    const resultado = importarTabelaMarkdownSkill(markdown);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.fichas).toHaveLength(1);
    const ficha = resultado.fichas[0];
    expect(ficha.codigoRadar).toBe('RSC-01');
    expect(ficha.causas).toContain('ausência de checklist documental');
    expect(ficha.eventoRisco).toContain('emissão de autorização indevida');
    expect(ficha.consequencias).toContain('dano ambiental em UC');
    expect(ficha.nivelInerente).toBe(18);
    expect(ficha.nivelResidual).toBe(16.2);
    expect(ficha.classificacaoResidual).toBe('Alto');
    expect(ficha.origemPreliminarCgov).toBe(true);
    expect(ficha.statusFluxo).toBe('preliminar_cgov');
  });

  it('rejeita linha que utilize a categoria proibida "Operacional com interface de Integridade"', () => {
    const markdownInvalido = `
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-02 | Fiscalização | Devido a pressão externa, poderá ocorrer omissão em auto, ocasionando impunidade e impactando a proteção. | Operacional com interface de Integridade | 3 | 5 | 22 | Extremo | Inexistente | Inexistente (1,0) | 22 | Extremo | baixo | sim | Mitigar | Nº de autos auditados |
    `;
    const resultado = importarTabelaMarkdownSkill(markdownInvalido);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('Operacional com interface de Integridade');
  });

  // --------------------------------------------------------------------------
  // Categorias e subcategorias: sem conversão silenciosa (RF-172 a RF-175)
  // --------------------------------------------------------------------------
  const CABECALHO =
    '| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  /** Monta uma tabela de uma linha só, mudando apenas a coluna Categoria. */
  const tabelaComCategoria = (id: string, categoria: string) =>
    `${CABECALHO}\n| ${id} | Objeto | Devido a causa, poderá ocorrer evento, ocasionando consequência e impactando o objetivo. | ${categoria} | 3 | 3 | 9 | Médio | Inexistente | Inexistente (1,0) | 9 | Médio | moderado | não | Mitigar | KRI |`;

  it.each([
    ['Financeiro ou Orçamentário', 'Financeiro/Orçamentário'],
    ['reputação ou imagem', 'Reputação'],
    [' Visitação ', 'Riscos da visitação'],
  ])('aceita a grafia do Anexo III e grava a do Quadro 2 (%s)', (bruta, esperada) => {
    expect(normalizarCategoriaImportada(bruta)).toBe(esperada);
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-S1', bruta));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas[0].categoriaNome).toBe(esperada);
  });

  // A mesma palavra pode chegar com bytes diferentes: "ç" e "ã" compostos
  // (NFC, o comum) ou decompostos (NFD: "c" + cedilha; vem de alguns editores
  // e do macOS). E colar de planilha costuma deixar espaço duplo no meio.
  // Nada disso é sinônimo: é a mesma grafia, então tem de ser aceita.
  it.each([
    ['Reputação'.normalize('NFD'), 'Reputação'],
    ['Riscos da  visitação', 'Riscos da visitação'],
    ['Privacidade e\tProteção de Dados', 'Privacidade e Proteção de Dados'],
  ])('aceita a mesma grafia com Unicode decomposto ou espaço duplo (%j)', (bruta, esperada) => {
    expect(normalizarCategoriaImportada(bruta)).toBe(esperada);
  });

  it('subcategoria com Unicode decomposto e espaço duplo também é reconhecida', () => {
    expect(normalizarSubcategoriaImportada('Pressão interna ou externa  ilegal para influenciar agente público'.normalize('NFD')))
      .toBe('Pressão interna ou externa ilegal para influenciar agente público');
  });

  it('aceita as 8 do Quadro 2 (RF-173)', () => {
    const linhas = CATEGORIAS_OFICIAIS_QUADRO_2.map((nome, i) =>
      // Integridade exige subcategoria; as demais entram como estão.
      tabelaComCategoria(`RSC-Q${i}`, nome === 'Integridade' ? 'Integridade: Nepotismo' : nome)
        .split('\n')
        .slice(2)
        .join('\n')
    );
    const r = importarTabelaMarkdownSkill([CABECALHO, ...linhas].join('\n'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas.map((f) => f.categoriaNome)).toEqual([...CATEGORIAS_OFICIAIS_QUADRO_2]);
  });

  it('categoria desconhecida: diz que não é uma das 8 do Quadro 2 e lista as 8 (não fala em categoria mista)', () => {
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-X2', 'Socioambiental'));
    expect(r.erros).toEqual([
      `Linha RSC-X2: categoria inválida ("Socioambiental"): não é uma das 8 categorias do Quadro 2. Use uma destas: ${CATEGORIAS_OFICIAIS_QUADRO_2.join('; ')}.`,
    ]);
    expect(r.erros[0]).not.toContain('categorias mistas');
  });

  it.each(['Operacional com interface de Integridade', 'operacional com INTERFACE DE INTEGRIDADE'])(
    'categoria mista "%s": mantém a mensagem da categoria mista',
    (categoria) => {
      const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-X3', categoria));
      expect(r.erros).toHaveLength(1);
      expect(r.erros[0]).toContain('A Metodologia proíbe categorias mistas');
    }
  );

  it('recusa categoria fora do Quadro 2 (RF-172)', () => {
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-X1', 'Socioambiental'));
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toContain('RSC-X1');
    expect(r.erros[0]).toContain('Socioambiental');
    expect(r.fichas).toHaveLength(0);
    expect(normalizarCategoriaImportada('Socioambiental')).toBeNull();
  });

  it.each(['Integridade', 'Integridade:', 'Integridade: '])(
    'recusa Integridade sem subcategoria (RF-175): "%s"',
    (categoria) => {
      const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-I1', categoria));
      expect(r.erros).toHaveLength(1);
      expect(r.erros[0]).toContain('RSC-I1');
      expect(r.erros[0]).toContain('uma das 6 subcategorias do Quadro 3');
      expect(r.fichas).toHaveLength(0);
      expect(r.fichas.some((f) => f.subcategoriaIntegridade === 'Corrupção e Fraude')).toBe(false);
    }
  );

  it('recusa subcategoria fora do Quadro 3 (RF-174)', () => {
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-I2', 'Integridade: Corrupção e Fraude'));
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toContain('uma das 6 subcategorias do Quadro 3');
    expect(r.erros[0]).toContain(SUBCATEGORIAS_INTEGRIDADE_QUADRO_3[0]);
    expect(r.fichas).toHaveLength(0);
    expect(normalizarSubcategoriaImportada('Corrupção e Fraude')).toBeNull();
  });

  it('aceita subcategoria com caixa diferente', () => {
    expect(normalizarSubcategoriaImportada('  conflito de interesses ')).toBe('Conflito de interesses');
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-I3', 'Integridade: conflito de interesses'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas[0].categoriaNome).toBe('Integridade');
    expect(r.fichas[0].subcategoriaIntegridade).toBe('Conflito de interesses');
  });

  it('subcategoria só é aceita junto de Integridade', () => {
    const r = importarTabelaMarkdownSkill(tabelaComCategoria('RSC-I4', 'Legal: Nepotismo'));
    expect(r.erros).toHaveLength(1);
    expect(r.fichas).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Probabilidade e impacto pelos Quadros 4 e 5, sem conversão silenciosa (RF-176, RF-177)
  // --------------------------------------------------------------------------
  /** Monta uma linha mudando só as colunas P e I (o resto é válido). */
  const linhaComPI = (id: string, p: string, i: string) =>
    `| ${id} | Objeto | Devido a causa, poderá ocorrer evento, ocasionando consequência e impactando o objetivo. | Operacional | ${p} | ${i} | 9 | Médio | Inexistente | Inexistente (1,0) | 9 | Médio | moderado | não | Mitigar | KRI |`;

  it('reconhece "Provável" e "Alto" sem número (RF-176)', () => {
    const r = importarTabelaMarkdownSkill(`${CABECALHO}\n${linhaComPI('RSC-N1', 'Provável', 'Alto')}`);
    expect(r.erros).toHaveLength(0);
    expect(r.fichas[0].probabilidade).toBe(3);
    expect(r.fichas[0].impacto).toBe(4);
    expect(r.fichas[0].nivelInerente).toBe(18);
  });

  it('recusa P vazio, 0, 6 e ilegível sem converter (RF-177)', () => {
    const linhas = [
      linhaComPI('RSC-A', '', '3'),
      linhaComPI('RSC-B', '0', '3'),
      linhaComPI('RSC-C', '6', '3'),
      linhaComPI('RSC-D', 'abc', '3'),
      linhaComPI('RSC-OK', '3', '3'),
    ].join('\n');
    const r = importarTabelaMarkdownSkill(`${CABECALHO}\n${linhas}`);
    expect(r.fichas).toHaveLength(1);
    expect(r.erros).toHaveLength(4);
    expect(r.erros[0]).toBe(
      'Linha RSC-A: probabilidade inválida (""): célula vazia. Use 1 a 5 ou um nome do Quadro 4: (1) Raro; (2) Pouco provável; (3) Provável; (4) Muito provável; (5) Praticamente certo.'
    );
  });

  it('recusa P "-" com erro de linha, sem lançar exceção', () => {
    const r = importarTabelaMarkdownSkill(`${CABECALHO}\n${linhaComPI('RSC-T', '-', '3')}`);
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toContain('célula sem número nem nome');
  });

  it('recusa impacto fora de 1 a 5', () => {
    const r = importarTabelaMarkdownSkill(`${CABECALHO}\n${linhaComPI('RSC-X', '3', '-1')}`);
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toEqual([
      'Linha RSC-X: impacto inválido ("-1"): fora de 1 a 5. Use 1 a 5 ou um nome do Quadro 5: (1) Muito baixo; (2) Baixo; (3) Médio; (4) Alto; (5) Muito alto.',
    ]);
  });

  it('recusa número e nome que não concordam', () => {
    const r = importarTabelaMarkdownSkill(`${CABECALHO}\n${linhaComPI('RSC-Y', '3 — Raro', '3')}`);
    expect(r.fichas).toHaveLength(0);
    expect(r.erros[0]).toContain('não concordam');
  });

  // --------------------------------------------------------------------------
  // LAC-13: linha crítica não pode vir com a estratégia "Aceitar"
  // --------------------------------------------------------------------------
  /** Monta uma linha com P, I, apetite (col. 13) e estratégia (col. 15) à escolha. */
  const linhaTrava = (id: string, p: number, i: number, apetite: string, estrategia: string) =>
    `| ${id} | Objeto | Devido a causa, poderá ocorrer evento, ocasionando consequência e impactando o objetivo. | Operacional | ${p} | ${i} | 0 | x | Inexistente | Inexistente (1,0) | 0 | x | ${apetite} | x | ${estrategia} | KRI |`;

  it('recusa linha crítica com Aceitar e mantém as demais (LAC-13)', () => {
    const md = [
      CABECALHO,
      linhaTrava('R-01', 5, 5, 'baixo', 'Aceitar'),
      linhaTrava('R-02', 5, 5, 'baixo', 'Mitigar'),
      linhaTrava('R-03', 1, 1, 'baixo', 'Aceitar'),
    ].join('\n');
    const r = importarTabelaMarkdownSkill(md);
    expect(r.fichas.map((f) => f.codigoRadar)).toEqual(['R-02', 'R-03']);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].startsWith('Linha R-01: risco crítico (residual 25')).toBe(true);
    expect(r.erros[0]).toContain('fora do apetite da DAR');
    expect(r.erros[0]).toContain(
      'não pode ter a estratégia "Aceitar"; escolha Mitigar, Compartilhar ou Evitar na tabela da skill.'
    );
  });

  it('DAR pendente também trava o Aceitar (LAC-13)', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-04', 1, 3, 'pendente', 'Aceitar')].join('\n'));
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toContain('com DAR pendente');
  });

  // A criticidade usa o apetite da categoria na DAR do RADAR (contrato da FS-02,
  // col. 13), nunca o apetite escrito na tabela da skill. Só o residual Médio
  // depende do apetite: P=3, I=2 -> Quadro 7 [I=2][P=3] = 8 (Médio), sem controle.
  it('DAR "baixo" vale mais que "moderado" da col. 13: Médio + Aceitar é recusado (LAC-13)', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-09', 3, 2, 'moderado', 'Aceitar')].join('\n'), {
      Operacional: 'baixo',
    });
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toContain('Linha R-09: risco crítico (residual 8, Médio, fora do apetite da DAR)');
  });

  it('tabela mais rígida que a DAR: col. 13 "baixo", DAR "moderado" -> Médio + Aceitar é aceito', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-10', 3, 2, 'baixo', 'Aceitar')].join('\n'), {
      operacional: 'moderado', // a busca pelo nome não liga para maiúsculas
    });
    expect(r.erros).toEqual([]);
    expect(r.fichas).toHaveLength(1);
    expect(r.fichas[0].apetiteCategoria).toBe('moderado');
    expect(r.fichas[0].statusCritico).toBe('nao');
    expect(r.fichas[0].memoriaCalculo).toContain('Crítico frente à DAR (moderado): NAO');
    expect(r.avisos.filter((a) => a.includes('sem KRI completo'))).toEqual([]);
  });

  it('categoria sem DAR no RADAR: vale "pendente_dar", mesmo com "moderado" na col. 13', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-11', 3, 2, 'moderado', 'Aceitar')].join('\n'), {
      Legal: 'moderado',
    });
    expect(r.fichas).toHaveLength(0);
    expect(r.erros[0]).toContain('com DAR pendente');
  });

  it('aviso de KRI segue a DAR: Médio com DAR "baixo" avisa, mesmo com "moderado" na col. 13', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-12', 3, 2, 'moderado', 'Mitigar')].join('\n'), {
      Operacional: 'baixo',
    });
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].statusCritico).toBe('sim');
    expect(r.avisos).toContain('Linha R-12: risco crítico sem KRI completo; complete o KRI na ficha antes do envio.');
  });

  it.each(['aceitar', ' Aceitar ', 'Aceitar o risco'])('recusa a grafia "%s" em linha crítica (LAC-13)', (g) => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-05', 5, 5, 'baixo', g)].join('\n'));
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toHaveLength(1);
  });
  // --------------------------------------------------------------------------
  // LAC-03: o importador nunca inventa KRI (RF-183, RF-184)
  // --------------------------------------------------------------------------
  it('linha sem KRI: kriSugerido fica vazio, sem "Indicador a definir" (RF-184)', () => {
    const sem = linhaTrava('R-06', 1, 1, 'baixo', 'Mitigar').replace('| KRI |', '|  |');
    const r = importarTabelaMarkdownSkill([CABECALHO, sem].join('\n'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas[0].kriSugerido).toBe('');
    expect(JSON.stringify(r)).not.toContain('Indicador a definir com a 1ª Linha');
  });

  it('linha crítica: avisa que o KRI importado nunca é completo, sem bloquear (RF-183)', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-07', 5, 5, 'baixo', 'Mitigar')].join('\n'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas).toHaveLength(1);
    expect(r.avisos).toContain(
      'Linha R-07: risco crítico sem KRI completo; complete o KRI na ficha antes do envio.'
    );
  });

  it('linha não crítica não ganha o aviso de KRI', () => {
    const r = importarTabelaMarkdownSkill([CABECALHO, linhaTrava('R-08', 1, 1, 'baixo', 'Mitigar')].join('\n'));
    expect(r.avisos.filter((a) => a.includes('sem KRI completo'))).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// Tarefa 1 (primeira carga): versão da linha, linhas ignoradas e Regime A
// ----------------------------------------------------------------------------
describe('Importador: versão da linha (16 ou 18 colunas), linhas ignoradas e Regime A', () => {
  /** Lê uma fixture de demonstração (sem dados reais). */
  const fixture = (nome: string) =>
    readFileSync(resolve(__dirname, 'fixtures/skill', nome), 'utf-8');
  const linhasDaFixture = (nome: string) =>
    fixture(nome).split('\n').filter((l) => l.startsWith('|'));

  it('linha de 9 colunas gera aviso com o número da linha no texto (linha 4)', () => {
    const texto = ['Título', '', 'Parágrafo antes da tabela.', '| a | b | c | d | e | f | g | h | i |'].join('\n');
    const r = importarTabelaMarkdownSkill(texto);
    expect(r.fichas).toHaveLength(0);
    expect(r.avisos).toContain('Linha 4 ignorada: tem 9 colunas; a matriz do Regime B tem 16 ou 18.');
    expect(r.formato).toBeNull();
  });

  it('linha de 13 colunas gera o erro do Regime A com o N certo', () => {
    const treze = '| R-07 | ' + Array.from({ length: 12 }, (_, i) => `c${i}`).join(' | ') + ' |';
    const r = importarTabelaMarkdownSkill(`Introdução\n${treze}`);
    expect(r.erros).toContain(
      "Linha 2: a tabela parece ser do Regime A (13 colunas, sem 'Objeto de GR'). O RADAR só importa a matriz do Regime B (16 ou 18 colunas)."
    );
    expect(r.fichas).toHaveLength(0);
  });

  it('fixture de 18 colunas: formato "18" e cada ficha com formatoColunas 18', () => {
    const r = importarTabelaMarkdownSkill(fixture('matriz-18-colunas.md'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas).toHaveLength(3);
    expect(r.formato).toBe('18');
    expect(r.fichas.every((f) => f.formatoColunas === 18)).toBe(true);
    // Tarefa 2: a col. 17 passou a ser lida (R-01 e R-02 "Sim", R-03 "Não").
    expect(r.fichas.map((f) => f.testeIntegridadeAplicavel)).toEqual([true, true, false]);
  });

  it('fixture de 16 colunas: formato "16"', () => {
    const r = importarTabelaMarkdownSkill(fixture('matriz-16-colunas.md'));
    expect(r.erros).toHaveLength(0);
    expect(r.fichas).toHaveLength(3);
    expect(r.formato).toBe('16');
    expect(r.fichas.every((f) => f.formatoColunas === 16)).toBe(true);
  });

  it('uma linha de cada versão: formato "misto"', () => {
    const l16 = linhasDaFixture('matriz-16-colunas.md');
    const l18 = linhasDaFixture('matriz-18-colunas.md');
    const r = importarTabelaMarkdownSkill([l16[0], l16[1], l16[2], l18[3]].join('\n'));
    expect(r.erros).toHaveLength(0);
    expect(r.formato).toBe('misto');
  });

  it('linha de 17 colunas conta como formato de 18', () => {
    const l18 = linhasDaFixture('matriz-18-colunas.md')[2];
    // Tira a última célula (justificativa): sobram 17 colunas.
    const l17 = l18.replace(/\|[^|]*\|$/, '|');
    expect(l17.split('|').length - 2).toBe(17);
    const r = importarTabelaMarkdownSkill(l17);
    expect(r.fichas).toHaveLength(1);
    expect(r.fichas[0].formatoColunas).toBe(18);
  });

  it('o N conta as linhas de texto antes da tabela (títulos, parágrafos, linhas em branco)', () => {
    const texto = ['# Matriz', '', 'Segue a matriz gerada.', '', '| a | b | c |', '|---|---|---|'].join('\n');
    const r = importarTabelaMarkdownSkill(texto);
    expect(r.avisos).toEqual(['Linha 5 ignorada: tem 3 colunas; a matriz do Regime B tem 16 ou 18.']);
  });

  it('contarFormato resume as fichas', () => {
    const f = (n: 16 | 18) => ({ formatoColunas: n }) as never;
    expect(contarFormato([])).toBeNull();
    expect(contarFormato([f(16), f(16)])).toBe('16');
    expect(contarFormato([f(18)])).toBe('18');
    expect(contarFormato([f(16), f(18)])).toBe('misto');
  });
});

// ----------------------------------------------------------------------------
// Tarefa 2 (primeira carga): regras por coluna, avisos do que antes era silêncio
// ----------------------------------------------------------------------------
describe('Importador: descrição, evidência, trava, cálculo, estratégia e Teste de Integridade', () => {
  const fixture = (nome: string) =>
    readFileSync(resolve(__dirname, 'fixtures/skill', nome), 'utf-8');

  /**
   * Monta UMA linha da matriz com valores padrão válidos (dados de demonstração).
   * Padrão: P=1, I=1 (inerente 1, Baixo), sem controle ("Inexistente. Evidência: não",
   * com o marcador que o formato de 18 exige), residual 1, "Mitigar".
   * Se `teste` for informado, a linha ganha as cols. 17 e 18 (formato de 18).
   * Ex.: montarLinha({ p: '3', i: '4', inerente: '18', residual: '18' })
   */
  const montarLinha = (o: {
    id?: string;
    descricao?: string;
    categoria?: string;
    p?: string;
    i?: string;
    inerente?: string;
    controles?: string;
    eficacia?: string;
    residual?: string;
    estrategia?: string;
    teste?: string;
    justificativa?: string;
  } = {}) => {
    const celulas = [
      o.id ?? 'R-07',
      'Objeto de demonstração',
      o.descricao ??
        'Devido a ausência de conferência, poderá ocorrer erro no cadastro, ocasionando retrabalho e impactando o alcance do objetivo de atendimento.',
      o.categoria ?? 'Operacional',
      o.p ?? '1',
      o.i ?? '1',
      o.inerente ?? '1',
      'Baixo',
      o.controles ?? 'Inexistente. Evidência: não',
      o.eficacia ?? 'Inexistente (1,0)',
      o.residual ?? '1',
      'Baixo',
      'baixo',
      'não',
      o.estrategia ?? 'Mitigar',
      'KRI de demonstração',
    ];
    if (o.teste !== undefined) celulas.push(o.teste, o.justificativa ?? '');
    return `| ${celulas.join(' | ')} |`;
  };

  const AVISO_16 =
    'Linha R-07: a tabela não traz o Teste de Integridade (formato de 16 colunas); confira na ficha se o risco envolve decisão sobre beneficiário, licença, fiscalização ou contratação (RN-006).';
  const REGRA_3 =
    'Linha R-07: Como o evento envolve vulnerabilidade de integridade, classifique como "Integridade" ou registre justificativa formal explicando por que não se trata de risco à integridade.';
  const ERRO_COL_17 = "Linha R-07: o Teste de Integridade (col. 17) deve ser 'Sim' ou 'Não'.";

  it('linha padrão de 18 colunas não gera aviso nem erro', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ teste: 'Não' }));
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  // Col. 3: frase fora da sintaxe do item 4.2.1
  it('frase fora da sintaxe vira evento e deixa causa, consequência e objetivo vazios', () => {
    const frase = 'Os atendimentos atrasam porque a fila não tem responsável definido.';
    const r = importarTabelaMarkdownSkill(montarLinha({ descricao: frase, teste: 'Não' }));
    const ficha = r.fichas[0];
    expect(ficha.eventoRisco).toBe(frase);
    expect(ficha.causas).toBe('');
    expect(ficha.consequencias).toBe('');
    expect(ficha.objetivoAfetado).toBe('');
    expect(r.avisos).toEqual([
      'Linha R-07: a descrição não segue a sintaxe do item 4.2.1; a frase foi gravada como evento, e causa, consequência e objetivo ficam em branco para a unidade completar.',
    ]);
  });

  // Col. 9: evidência pelo marcador
  it.each([
    ['Previsto no ato. Evidência: sim', true],
    ['Evidência: Sim. Checklist arquivado no SEI', true],
    ['Checklist. Evidência: não', false],
    ['EVIDENCIA: NAO', false],
    ['sem evidencia formal', false],
    ['previsto no ato; funcionamento não comprovado', false],
    ['Conferência sem registro', false],
    ['Inexistente', false],
    ['Controle informal da chefia', false],
    ['Checklist assinado', null],
    ['', null],
    ['Evidências: sim', true],
    ['Controle A. Evidência: sim; Controle B. Evidência: não', false],
  ])('lerEvidencia(%j) -> %s', (texto, esperado) => {
    expect(lerEvidencia(texto)).toBe(esperado);
  });

  it.each([
    ['Previsto no ato. Evidência: sim', true],
    ['EVIDÊNCIAS: Sim', true],
    ['Evidência: NÃO', false],
    ['Controle A. Evidência: sim; Controle B. Evidência: não', false],
    ['Controle A. Evidência: não; Controle B. Evidência: sim', false],
    ['Conferência sem registro', null],
    ['Inexistente', null],
    ['', null],
  ])('lerMarcadorEvidencia(%j) -> %s (só o marcador)', (texto, esperado) => {
    expect(lerMarcadorEvidencia(texto)).toBe(esperado);
  });

  // K1: no formato de 18 colunas o marcador tem de ENCERRAR a célula 9
  it.each([
    ['Norma interna. Evidência: sim.', true],
    ['Norma interna. Evidência: sim ;', true],
    ['Evidência: sim; funcionamento não comprovado', null],
    ['Controle A. Evidência: não; Controle B. Evidência: sim', false],
    ['Conferência sem registro', null],
    ['', null],
  ])('lerMarcadorFinalEvidencia(%j) -> %s', (texto, esperado) => {
    expect(lerMarcadorFinalEvidencia(texto)).toBe(esperado);
  });

  it('18 colunas: marcador no meio da célula não vale; sem evidência e com aviso', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'Evidência: sim; funcionamento não comprovado', eficacia: 'Mediano (0,75)', residual: '0,75', teste: 'Não' })
    );
    expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
    expect(r.avisos).toContain(AVISO_EVIDENCIA);
  });

  // K2: o marcador não faz parte do texto do controle
  it.each([
    ['Norma interna. Evidência: não', 'Norma interna'],
    ['Inexistente. Evidência: não', 'Inexistente'],
    ['Evidência: não', ''],
  ])('textoDoControleSemMarcador(%j) -> %j', (texto, esperado) => {
    expect(textoDoControleSemMarcador(texto)).toBe(esperado);
  });

  it.each([
    ['Inexistente. Evidência: não', false],
    ['INEXISTENTE', false],
    ['Evidência: não', false],
    ['', false],
    ['Norma interna. Evidência: não', true],
  ])('existeControleNoTexto(%j) -> %s', (texto, esperado) => {
    expect(existeControleNoTexto(texto)).toBe(esperado);
  });

  it('controlesTexto sai sem o marcador de evidência', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ controles: 'Norma interna. Evidência: não' }));
    expect(r.fichas[0].controlesTexto).toBe('Norma interna');
  });

  it.each([
    ['Sim', true],
    ['s', true],
    [' SIM ', true],
    ['Não', false],
    ['nao', false],
    ['NÃO', false],
    ['N', false],
    ['Talvez', null],
    ['', null],
  ])('lerSimNao(%j) -> %s', (texto, esperado) => {
    expect(lerSimNao(texto)).toBe(esperado);
  });

  it.each([
    ['12', 12],
    ['10.8', 10.8],
    ['10,8', 10.8],
    [' 16,2 ', 16.2],
    ['—', null],
    ['', null],
    ['18 (Extremo)', null],
  ])('lerNumeroSkill(%j) -> %s', (texto, esperado) => {
    expect(lerNumeroSkill(texto)).toBe(esperado);
  });

  it('"EVIDENCIA: NAO" é lido como sem evidência, sem aviso de leitura (Review Focus 2)', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'EVIDENCIA: NAO', eficacia: 'Fraco (0,9)', residual: '0,9', teste: 'Não' })
    );
    expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
    expect(r.avisos).toEqual([]);
  });

  it('com o marcador "Evidência: sim", Mediano é mantido, sem aviso', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'Checklist. Evidência: sim', eficacia: 'Mediano (0,75)', residual: '0,75', teste: 'Não' })
    );
    expect(r.fichas[0].possuiEvidenciaControle).toBe(true);
    expect(r.fichas[0].nivelEficaciaControle).toBe('Mediano');
    expect(r.avisos).toEqual([]);
  });

  const AVISO_EVIDENCIA =
    'Linha R-07: não foi possível ler se o controle tem evidência comprovada; o RADAR considerou sem evidência (eficácia máxima Fraco, Quadro 6).';

  it.each(['Conferência sem registro', 'Inexistente', 'Controle informal', ''])(
    '18 colunas, col. 9 %j sem marcador: sem evidência e com aviso',
    (controles) => {
      const r = importarTabelaMarkdownSkill(montarLinha({ controles, teste: 'Não' }));
      expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
      expect(r.avisos).toEqual([AVISO_EVIDENCIA]);
    }
  );

  it.each(['Conferência sem registro', 'Inexistente', '', 'previsto no ato; funcionamento não comprovado'])(
    '16 colunas, col. 9 %j: expressão de ausência (ou vazia) vale sem evidência, sem aviso',
    (controles) => {
      const r = importarTabelaMarkdownSkill(montarLinha({ controles }));
      expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
      expect(r.avisos).toEqual([AVISO_16]);
    }
  );

  it('16 colunas, col. 9 sem marcador nem expressão: sem evidência e com aviso', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ controles: 'Checklist assinado' }));
    expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
    expect(r.avisos).toEqual([AVISO_16, AVISO_EVIDENCIA]);
  });

  it('marcadores contraditórios: um "Evidência: não" basta; só o aviso da trava', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({
        controles: 'Controle A. Evidência: sim; Controle B. Evidência: não',
        eficacia: 'Mediano (0,75)',
        residual: '0,9',
        teste: 'Não',
      })
    );
    expect(r.fichas[0].possuiEvidenciaControle).toBe(false);
    expect(r.fichas[0].nivelEficaciaControle).toBe('Fraco');
    expect(r.avisos).toEqual([
      "Linha R-07: a eficácia 'Mediano (0,75)' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6).",
    ]);
  });

  it('marcador no plural "Evidências: sim" (18 colunas): com evidência, sem aviso', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'Checklist. Evidências: sim', eficacia: 'Mediano (0,75)', residual: '0,75', teste: 'Não' })
    );
    expect(r.fichas[0].possuiEvidenciaControle).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  // Col. 9 + col. 10: sem marcador, vale "sem evidência" e a trava age
  it('sem marcador e com "Mediano (0,75)": sem evidência, Fraco e os dois avisos', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'Checklist assinado', eficacia: 'Mediano (0,75)', residual: '0,9', teste: 'Não' })
    );
    const ficha = r.fichas[0];
    expect(ficha.possuiEvidenciaControle).toBe(false);
    expect(ficha.nivelEficaciaControle).toBe('Fraco');
    expect(r.avisos).toEqual([
      'Linha R-07: não foi possível ler se o controle tem evidência comprovada; o RADAR considerou sem evidência (eficácia máxima Fraco, Quadro 6).',
      "Linha R-07: a eficácia 'Mediano (0,75)' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6).",
    ]);
  });

  it('trava com Forte e "Evidência: não": só o aviso da trava, com o fator 0,5', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ controles: 'Evidência: não', eficacia: 'Forte (0,5)', residual: '0,9', teste: 'Não' })
    );
    expect(r.avisos).toEqual([
      "Linha R-07: a eficácia 'Forte (0,5)' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6).",
    ]);
  });

  // Cols. 7 e 11: conferência do cálculo (Quadro 7 é [impacto][probabilidade])
  it('inerente e residual divergentes geram o aviso de cálculo (P=3, I=4 -> 18 e 18)', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ p: '3', i: '4', inerente: '12', residual: '9', teste: 'Não' })
    );
    expect(r.fichas[0].nivelInerente).toBe(18);
    expect(r.avisos).toContain(
      'Linha R-07: a skill informou inerente 12 e residual 9; o RADAR calculou inerente 18 e residual 18 (Quadro 7 e Quadro 6). Valem os números do RADAR.'
    );
  });

  it('o aviso de cálculo usa vírgula decimal (residual 16,2)', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({
        p: '3',
        i: '4',
        inerente: '18',
        residual: '16',
        controles: 'Evidência: não',
        eficacia: 'Fraco (0,9)',
        teste: 'Não',
      })
    );
    expect(r.avisos).toContain(
      'Linha R-07: a skill informou inerente 18 e residual 16; o RADAR calculou inerente 18 e residual 16,2 (Quadro 7 e Quadro 6). Valem os números do RADAR.'
    );
  });

  it.each(['10.8', '10,8', '10,81'])(
    'residual da skill %j igual (até 0,01) ao recálculo 10,8: sem aviso de cálculo (Review Focus 3)',
    (residual) => {
      // P=4, I=2 -> Quadro 7 [I=2][P=4] = 12; Fraco sem evidência -> 12 × 0,9 = 10,8.
      const r = importarTabelaMarkdownSkill(
        montarLinha({
          p: '4',
          i: '2',
          inerente: '12',
          residual,
          controles: 'Evidência: não',
          eficacia: 'Fraco (0,9)',
          teste: 'Não',
        })
      );
      expect(r.fichas[0].nivelResidual).toBe(10.8);
      expect(r.avisos.filter((a) => a.includes('a skill informou'))).toEqual([]);
    }
  );

  it('diferença acima de 0,01 gera o aviso (10,82 × 10,8)', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ p: '4', i: '2', inerente: '12', residual: '10,82', controles: 'Evidência: não', eficacia: 'Fraco (0,9)', teste: 'Não' })
    );
    expect(r.avisos.filter((a) => a.includes('a skill informou'))).toHaveLength(1);
  });

  it('célula "—" no inerente e no residual não é comparada', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ p: '3', i: '4', inerente: '—', residual: '—', teste: 'Não' })
    );
    expect(r.avisos.filter((a) => a.includes('a skill informou'))).toEqual([]);
  });

  // Col. 15: estratégia
  it('estratégia "Reduzir" vira Mitigar, com aviso', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ estrategia: 'Reduzir', teste: 'Não' }));
    expect(r.fichas[0].estrategiaTratamento).toBe('Mitigar');
    expect(r.avisos).toEqual([
      "Linha R-07: estratégia 'Reduzir' não reconhecida; o RADAR gravou 'Mitigar'. Confira na ficha.",
    ]);
  });

  it('estratégia vazia vira Mitigar, com aviso "(vazia)"', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ estrategia: '', teste: 'Não' }));
    expect(r.fichas[0].estrategiaTratamento).toBe('Mitigar');
    expect(r.avisos).toEqual([
      "Linha R-07: estratégia '(vazia)' não reconhecida; o RADAR gravou 'Mitigar'. Confira na ficha.",
    ]);
  });

  it.each([
    ['Compartilhar', 'Compartilhar'],
    ['evitar', 'Evitar'],
    ['Mitigar', 'Mitigar'],
    ['Aceitar', 'Aceitar'],
  ])('estratégia %j é reconhecida, sem aviso', (texto, esperada) => {
    const r = importarTabelaMarkdownSkill(montarLinha({ estrategia: texto, teste: 'Não' }));
    expect(r.fichas[0].estrategiaTratamento).toBe(esperada);
    expect(r.avisos).toEqual([]);
  });

  // Cols. 17 e 18: Teste de Integridade
  it('col. 17 "Sim", Operacional e justificativa curta: erro da regra 3', () => {
    const r = importarTabelaMarkdownSkill(montarLinha({ teste: 'Sim', justificativa: 'curta' }));
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toEqual([REGRA_3]);
  });

  it('col. 17 "Sim" sem a col. 18 (linha de 17 colunas): erro da regra 3', () => {
    const linha = montarLinha({ teste: 'Sim' }).replace(/\|[^|]*\|$/, '|');
    expect(linha.split('|').length - 2).toBe(17);
    const r = importarTabelaMarkdownSkill(linha);
    expect(r.erros).toEqual([REGRA_3]);
  });

  it('col. 17 "Sim" com justificativa de 10+ caracteres: passa e guarda os dois valores', () => {
    const justificativa = 'A autorização beneficia um requerente específico.';
    const r = importarTabelaMarkdownSkill(montarLinha({ teste: 'Sim', justificativa }));
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].testeIntegridadeAplicavel).toBe(true);
    expect(r.fichas[0].justificativaNaoIntegridade).toBe(justificativa);
  });

  it.each(['Talvez', ''])('col. 17 %j: erro da col. 17', (teste) => {
    const r = importarTabelaMarkdownSkill(montarLinha({ teste }));
    expect(r.fichas).toHaveLength(0);
    expect(r.erros).toEqual([ERRO_COL_17]);
  });

  it.each([
    ['S', true],
    ['n', false],
    ['NÃO', false],
  ])('col. 17 %j é aceita (sem diferença de acento e de maiúsculas)', (teste, esperado) => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ teste, justificativa: 'Não há decisão sobre beneficiário nem licença.' })
    );
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].testeIntegridadeAplicavel).toBe(esperado);
  });

  it('col. 17 "Sim" em risco de Integridade sem justificativa: passa (Review Focus 4)', () => {
    const r = importarTabelaMarkdownSkill(
      montarLinha({ categoria: 'Integridade: Nepotismo', teste: 'Sim', justificativa: '' })
    );
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].testeIntegridadeAplicavel).toBe(true);
    expect(r.fichas[0].justificativaNaoIntegridade).toBeUndefined();
  });

  it('16 colunas: Teste de Integridade "não aplicável" e o aviso do formato de 16', () => {
    const r = importarTabelaMarkdownSkill(montarLinha());
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].formatoColunas).toBe(16);
    expect(r.fichas[0].testeIntegridadeAplicavel).toBe(false);
    expect(r.avisos).toEqual([AVISO_16]);
  });

  it('fixture de 16 colunas: sem erro, só avisos novos (Review Focus 5)', () => {
    const r = importarTabelaMarkdownSkill(fixture('matriz-16-colunas.md'));
    expect(r.erros).toEqual([]);
    expect(r.fichas).toHaveLength(3);
    expect(r.avisos.filter((a) => a.includes('formato de 16 colunas'))).toHaveLength(3);
    expect(r.avisos).toContain(
      'Linha R-03: a descrição não segue a sintaxe do item 4.2.1; a frase foi gravada como evento, e causa, consequência e objetivo ficam em branco para a unidade completar.'
    );
  });

  // Robustez carregada da revisão da Tarefa 1
  it('texto com quebras de linha do Windows (\\r\\n) importa igual', () => {
    const texto = fixture('matriz-18-colunas.md').replace(/\r?\n/g, '\r\n');
    const r = importarTabelaMarkdownSkill(texto);
    expect(r.erros).toEqual([]);
    expect(r.fichas).toHaveLength(3);
    expect(r.fichas[2].kriSugerido).toBe('Tempo médio de atendimento');
    expect(r.fichas[1].justificativaNaoIntegridade).toBe('A autorização beneficia um requerente específico.');
  });

  it('linha de 19 colunas: a coluna extra é ignorada e a linha é de 18', () => {
    const linha = montarLinha({ teste: 'Não' }) + ' coluna extra |';
    expect(linha.split('|').length - 2).toBe(19);
    const r = importarTabelaMarkdownSkill(linha);
    expect(r.erros).toEqual([]);
    expect(r.fichas[0].formatoColunas).toBe(18);
    expect(r.fichas[0].testeIntegridadeAplicavel).toBe(false);
  });
});
