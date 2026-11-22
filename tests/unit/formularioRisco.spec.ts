/**
 * ============================================================================
 * TESTES DE `validarEtapa` NA ETAPA 4 — trava do risco crítico (LAC-13)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando o risco é crítico (fora do apetite da DAR, `'sim'`, ou com DAR
 * pendente, `'pendente_dar'`), a etapa 4 (Tratamento) muda de regra:
 *   - "Aceitar" não é permitido (Metodologia 4.5 e Anexo III);
 *   - a ação 5W2H (o quê, quem, quando) passa a ser obrigatória.
 * Sem o 4º argumento (`statusCritico`), a função se comporta como antes.
 */
import { describe, it, expect } from 'vitest';
import { CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import { dadosExemplo, validarEtapa, type DadosNovoRisco } from '../../src/utils/formularioRisco';

const CATEGORIAS = CATEGORIAS_QUADRO_2_SEMENTE;

/** Ficha completa, mas com a estratégia escolhida e a ação 5W2H em branco. */
const semAcao = (estrategia: DadosNovoRisco['estrategia']): DadosNovoRisco => ({
  ...dadosExemplo('obj-anexo-ii'),
  estrategia,
  acaoOQue: '',
  acaoQuem: '',
  acaoPrazo: '',
});

const ERRO_ACEITAR = 'Risco crítico não pode ser aceito: escolha Mitigar, Compartilhar ou Evitar (Metodologia 4.5 e Anexo III).';

describe('validarEtapa — etapa 4 e risco crítico (LAC-13)', () => {
  it('risco crítico (sim): "Aceitar" gera erro na estratégia', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'sim').estrategia).toBe(ERRO_ACEITAR);
  });

  it('DAR pendente (pendente_dar): "Aceitar" gera o mesmo erro', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'pendente_dar').estrategia).toBe(ERRO_ACEITAR);
  });

  it('risco dentro do apetite (nao): "Aceitar" sem ação continua valendo', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'nao')).toEqual({});
  });

  it('sem statusCritico: comportamento de antes ("Aceitar" sem ação passa)', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS)).toEqual({});
  });

  it('risco crítico com "Mitigar" e ação vazia: exige o quê, quem e quando', () => {
    expect(validarEtapa(4, semAcao('Mitigar'), CATEGORIAS, 'sim')).toEqual({
      acaoOQue: 'Descreva a ação (o quê).',
      acaoQuem: 'Informe o responsável (quem).',
      acaoPrazo: 'Informe o prazo (quando).',
    });
  });

  it('risco crítico com "Aceitar": também aponta a ação que falta', () => {
    const erros = validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'sim');
    expect(Object.keys(erros).sort()).toEqual(['acaoOQue', 'acaoPrazo', 'acaoQuem', 'estrategia']);
  });

  it('risco crítico com "Evitar" e ação preenchida: ok', () => {
    expect(validarEtapa(4, { ...dadosExemplo('obj-anexo-ii'), estrategia: 'Evitar' }, CATEGORIAS, 'sim')).toEqual({});
  });
});
