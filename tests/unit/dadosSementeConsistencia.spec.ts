/**
 * TESTE DE CONSISTÊNCIA DOS DADOS DE DEMONSTRAÇÃO (SEMENTE)
 *
 * Por que este teste existe?
 * Os riscos de demonstração em `dadosSementeAnexoII.ts` guardam os números
 * já calculados (Inerente, Residual, classificações, criticidade). Se alguém
 * digitar um desses valores à mão, ele pode divergir das regras normativas
 * sem que ninguém perceba.
 *
 * Exemplo real que este teste passou a impedir: o RADAR-2026-003 tinha
 * P=2 e I=4, mas Inerente 17 gravado direto. Pelo Quadro 7, P=2 e I=4 dá 14.
 * O valor 17 corresponde a P=4 e I=3, o que contradiz as justificativas.
 *
 * Aqui, cada risco é recalculado pelo motor oficial
 * (`calcularRiscoCompletoRadar`) e o resultado tem de bater com o gravado.
 */
import { describe, it, expect } from 'vitest';
import {
  RISCOS_SEMENTE_ANEXO_II,
  CATEGORIAS_QUADRO_2_SEMENTE,
} from '../../src/services/dadosSementeAnexoII';
import { calcularRiscoCompletoRadar } from '../../src/utils/calculadoraRiscoRadar';
import { verificarTravaRiscoCritico } from '../../src/utils/travaRiscoCritico';

describe('Dados de demonstração coerentes com os Quadros 6, 7 e 8 e a DAR', () => {
  // `it.each` gera um teste por risco, com o código RADAR no nome do teste,
  // para que a falha aponte direto qual ficha está errada.
  it.each(RISCOS_SEMENTE_ANEXO_II.map((r) => [r.codigoRadar, r] as const))(
    '%s: valores gravados batem com o motor de cálculo',
    (_codigo, risco) => {
      // O apetite vem da DAR da categoria do risco (Quadro 2 + DAR).
      const categoria = CATEGORIAS_QUADRO_2_SEMENTE.find(
        (c) => c.id === risco.categoriaId
      );
      expect(categoria, 'categoria do risco não encontrada').toBeDefined();

      const calculado = calcularRiscoCompletoRadar({
        probabilidade: risco.probabilidade,
        impacto: risco.impacto,
        eficaciaControle: risco.nivelEficaciaControle,
        possuiEvidenciaComprovada: risco.possuiEvidenciaControle,
        apetiteCategoria: categoria!.apetiteDeclarado,
      });

      // Quadro 7: o Inerente deve ser lido da tabela, nunca digitado à mão.
      expect(risco.nivelInerente).toBe(calculado.nivelInerente);
      expect(risco.classificacaoInerente).toBe(calculado.classificacaoInerente);

      // Quadro 6: fator do controle (já com a trava de evidência aplicada).
      expect(risco.fatorControle).toBe(calculado.fatorFinal);

      // Quadro 8: Residual exato e sua faixa, sem arredondamento prévio.
      expect(risco.nivelResidual).toBe(calculado.nivelResidual);
      expect(risco.classificacaoResidual).toBe(calculado.classificacaoResidual);

      // DAR: Risco Crítico = residual fora do apetite da categoria.
      expect(risco.statusCritico).toBe(calculado.statusCritico);
      expect(risco.isCritico).toBe(calculado.statusCritico === 'sim');
    }
  );

  // O HISTÓRICO também precisa contar a mesma história do cálculo. Risco que
  // NÃO é crítico (residual dentro do apetite da DAR) é aprovado pela CG e
  // não sobe à Diretoria (spec 7.1; migração 20261115004). Então não pode ter
  // etapa de homologação da Diretoria, nem despacho dizendo "Risco Crítico"
  // ou "acima do apetite".
  // Ex.: o RADAR-2026-003 (Operacional, Moderado, 8,4 Médio) dizia "acima do
  // apetite Baixo da DAR — Risco Crítico" depois de mudar de categoria.
  it.each(
    RISCOS_SEMENTE_ANEXO_II.filter((r) => r.statusCritico === 'nao').map((r) => [r.codigoRadar, r] as const)
  )('%s: risco não crítico tem histórico sem homologação e sem "Risco Crítico"', (_codigo, risco) => {
    for (const h of risco.historicoFluxo) {
      expect(h.etapa, `${h.id}: risco não crítico não passa pela Diretoria`).not.toBe('homologacao_diretoria');
      expect(h.despachoTexto ?? '', `${h.id}: despacho diz que é crítico`).not.toMatch(/acima do apetite|—\s*Risco Crítico/);
    }
  });

  // LAC-13: a trava do risco crítico vale também para a semente. Ficha
  // aprovada, em validação ou em homologação não pode estar crítica com
  // "Aceitar" nem sem ação de tratamento (5W2H) que não seja "Aceitar".
  it.each(
    RISCOS_SEMENTE_ANEXO_II.filter((r) =>
      ['aprovado', 'em_validacao_cg', 'em_homologacao_dir'].includes(r.statusFluxo)
    ).map((r) => [r.codigoRadar, r] as const)
  )('%s: passa na trava do risco crítico (LAC-13)', (_codigo, risco) => {
    const resultado = verificarTravaRiscoCritico({
      statusCritico: risco.statusCritico,
      estrategiaPrincipal: risco.estrategiaPrincipal,
      estrategiasDasAcoes: risco.respostasTratamento.map((a) => a.estrategia),
    });
    expect(resultado).toEqual({ ok: true });
  });
});
