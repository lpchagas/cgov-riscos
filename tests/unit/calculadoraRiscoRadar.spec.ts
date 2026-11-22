import { describe, it, expect } from 'vitest';
import {
  obterNivelInerente,
  classificarNivelRisco,
  validarFatorControle,
  avaliarCriticidadeDAR,
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
  validarRegraIntegridade,
  CATEGORIAS_OFICIAIS_QUADRO_2,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
} from '../../src/utils/calculadoraRiscoRadar';

describe('Motor Matemático RADAR — Metodologia SEI 024421455 e Skill cgov-gestao-riscos-v4', () => {
  it('reproduz exatamente o Caso de Controle do Anexo II (P=3, I=5 -> Inerente 22 Extremo, Fator 1.0 -> Residual 22 Extremo)', () => {
    const resultado = calcularRiscoCompletoRadar({
      probabilidade: 3,
      impacto: 5,
      eficaciaControle: 'Inexistente',
      possuiEvidenciaComprovada: false,
      apetiteCategoria: 'moderado',
    });
    expect(resultado.nivelInerente).toBe(22);
    expect(resultado.classificacaoInerente).toBe('Extremo');
    expect(resultado.fatorFinal).toBe(1.0);
    expect(resultado.nivelResidual).toBe(22);
    expect(resultado.classificacaoResidual).toBe('Extremo');
    expect(resultado.statusCritico).toBe('sim');
  });

  it('respeita a assimetria do Quadro 7 (Impacto pesa mais que Probabilidade: P=1,I=5 é 15; P=5,I=1 é 11)', () => {
    expect(obterNivelInerente(1, 5)).toBe(15);
    expect(obterNivelInerente(5, 1)).toBe(11);
  });

  it('classifica decimais de fronteira sem arredondar antes das faixas (10.2 é Alto; 17.1 é Extremo)', () => {
    expect(classificarNivelRisco(5.0)).toBe('Baixo');
    expect(classificarNivelRisco(5.1)).toBe('Médio');
    expect(classificarNivelRisco(10.0)).toBe('Médio');
    expect(classificarNivelRisco(10.2)).toBe('Alto');
    expect(classificarNivelRisco(17.0)).toBe('Alto');
    expect(classificarNivelRisco(17.1)).toBe('Extremo');
  });

  it('aciona a trava de evidência: controle sem evidência não passa de Fraco (0.9)', () => {
    const semEvidencia = validarFatorControle('Forte', false);
    expect(semEvidencia.travaAcionada).toBe(true);
    expect(semEvidencia.eficaciaFinal).toBe('Fraco');
    expect(semEvidencia.fatorFinal).toBe(0.9);
    expect(semEvidencia.avisoTrava).toContain('Fraco');

    const comEvidencia = validarFatorControle('Forte', true);
    expect(comEvidencia.travaAcionada).toBe(false);
    expect(comEvidencia.fatorFinal).toBe(0.5);
  });

  it('avalia corretamente o estado pendente_dar para riscos Médios vs Altos/Extremos', () => {
    expect(avaliarCriticidadeDAR('Médio', 'pendente_dar').statusCritico).toBe('pendente_dar');
    expect(avaliarCriticidadeDAR('Alto', 'pendente_dar').statusCritico).toBe('sim');
    expect(avaliarCriticidadeDAR('Médio', 'baixo').statusCritico).toBe('sim');
    expect(avaliarCriticidadeDAR('Médio', 'moderado').statusCritico).toBe('nao');
  });

  it('valida as regras do Programa Integra+ (Portaria 253/2026) e proíbe categoria mista', () => {
    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional com interface de Integridade',
        testeIntegridadeAplicavel: true,
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Integridade',
        subcategoriaIntegridade: '',
        testeIntegridadeAplicavel: true,
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional',
        testeIntegridadeAplicavel: true,
        justificativaNaoIntegridade: '',
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional',
        testeIntegridadeAplicavel: true,
        justificativaNaoIntegridade: 'Trata-se apenas de erro material de digitação sem margem para favorecimento.',
      }).valido
    ).toBe(true);
  });

  it('gera a sintaxe obrigatória da seção 4.2.1 da Metodologia', () => {
    const frase = gerarSintaxePadraoRisco({
      causas: 'concentração do conhecimento em um único servidor',
      eventoRisco: 'afastamento do servidor responsável',
      consequencias: 'paralisação do processo',
      objetivoAfetado: 'execução contínua das atividades da unidade',
    });
    expect(frase).toBe(
      'Devido o(a) concentração do conhecimento em um único servidor, poderá ocorrer o(a) afastamento do servidor responsável, ocasionando o(a) paralisação do processo e impactando o alcance do execução contínua das atividades da unidade.'
    );
  });
});

describe('Listas oficiais: Quadro 2 (categorias) e Quadro 3 (subcategorias de Integridade)', () => {
  it('Quadro 2: as 8 categorias, na grafia literal', () => {
    expect([...CATEGORIAS_OFICIAIS_QUADRO_2]).toEqual([
      'Operacional',
      'Legal',
      'Financeiro/Orçamentário',
      'Reputação',
      'Integridade',
      'Riscos da visitação',
      'Ocupacionais',
      'Privacidade e Proteção de Dados',
    ]);
  });

  it('Quadro 3: as 6 subcategorias, na grafia literal', () => {
    expect([...SUBCATEGORIAS_INTEGRIDADE_QUADRO_3]).toEqual([
      'Abuso de posição ou poder em favor de interesses privados',
      'Nepotismo',
      'Conflito de interesses',
      'Pressão interna ou externa ilegal para influenciar agente público',
      'Solicitação ou recebimento de vantagem indevida',
      'Utilização de recursos públicos em favor de interesses privados',
    ]);
  });

  it.each([
    'Estratégico',
    'Socioambiental',
    'Tecnologia da Informação',
    'Conformidade/Legal',
    'Imagem/Reputação',
    'Orçamentário/Financeiro',
  ])('categoria que saiu é recusada: %s', (nome) => {
    expect(validarRegraIntegridade({ categoriaNome: nome, testeIntegridadeAplicavel: false }).valido).toBe(false);
  });

  it('Riscos da visitação é aceita', () => {
    expect(
      validarRegraIntegridade({ categoriaNome: 'Riscos da visitação', testeIntegridadeAplicavel: false }).valido
    ).toBe(true);
  });
});
