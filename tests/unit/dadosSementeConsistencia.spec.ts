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
});
