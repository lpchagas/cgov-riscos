import { describe, it, expect } from 'vitest';
import { importarTabelaMarkdownSkill } from '../../src/utils/importadorSkillMarkdown';

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
});
