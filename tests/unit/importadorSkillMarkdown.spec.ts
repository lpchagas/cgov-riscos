import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_OFICIAIS_QUADRO_2,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
} from '../../src/utils/calculadoraRiscoRadar';
import {
  importarTabelaMarkdownSkill,
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
});
