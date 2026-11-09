/**
 * ============================================================================
 * MOTOR MATEMÁTICO E REGRAS NORMATIVAS RADAR — ICMBio (REGIME B)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Este arquivo concentra toda a "inteligência normativa" da Metodologia de
 * Gestão de Riscos do ICMBio (Minuta de Portaria SEI 024421455) e as travas de
 * qualidade da skill `cgov-gestao-riscos-v4`.
 *
 * Por que separar a matemática em um arquivo próprio?
 * 1. Porque podemos testar todas as fórmulas automaticamente em milissegundos;
 * 2. Porque qualquer tela do sistema usa exatamente a mesma conta, sem risco
 *    de uma tela calcular de um jeito e outra de outro!
 */

import type {
  ApetiteDeclarado,
  ClasseRisco,
  FatorAvaliacaoControle,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  StatusCriticidadeDAR,
} from '../types/radar.types';

/**
 * QUADRO 7 — MATRIZ ASSIMÉTRICA DE RISCOS (5x5 — 25 CÉLULAS)
 *
 * ATENÇÃO: Na Metodologia RADAR do ICMBio, é PROIBIDO multiplicar
 * Probabilidade x Impacto! O Impacto tem peso superior à Probabilidade.
 * Por exemplo:
 * - Probabilidade 1 e Impacto 5 -> Nível Inerente = 15 (Alto)
 * - Probabilidade 5 e Impacto 1 -> Nível Inerente = 11 (Alto)
 * - Probabilidade 3 e Impacto 5 -> Nível Inerente = 22 (Extremo — Caso Anexo II)
 */
export const MATRIZ_QUADRO_7: Record<
  NivelImpacto,
  Record<NivelProbabilidade, number>
> = {
  5: { 1: 15, 2: 19, 3: 22, 4: 24, 5: 25 },
  4: { 1: 10, 2: 14, 3: 18, 4: 21, 5: 23 },
  3: { 1: 6, 2: 9, 3: 13, 4: 17, 5: 20 },
  2: { 1: 3, 2: 5, 3: 8, 4: 12, 5: 16 },
  1: { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11 },
};

/**
 * QUADRO 6 — FATORES DE AVALIAÇÃO DOS CONTROLES EXISTENTES
 * Multiplicam o Risco Inerente para encontrar o Risco Residual.
 */
export const FATORES_QUADRO_6: Record<
  NivelEficaciaControle,
  FatorAvaliacaoControle
> = {
  Inexistente: 1.0,
  Fraco: 0.9,
  Mediano: 0.75,
  Satisfatório: 0.6,
  Forte: 0.5,
};

/**
 * QUADRO 2 — AS 8 CATEGORIAS OFICIAIS DE RISCO DO ICMBio
 */
export const CATEGORIAS_OFICIAIS_QUADRO_2 = [
  'Estratégico',
  'Operacional',
  'Orçamentário/Financeiro',
  'Conformidade/Legal',
  'Integridade',
  'Imagem/Reputação',
  'Socioambiental',
  'Tecnologia da Informação',
] as const;

/**
 * QUADRO 3 — AS 6 SUBCATEGORIAS OBRIGATÓRIAS DE RISCOS À INTEGRIDADE
 * (Alinhadas à Portaria ICMBio nº 253/2026 — Programa Integra+)
 */
export const SUBCATEGORIAS_INTEGRIDADE_QUADRO_3 = [
  'Corrupção e Fraude',
  'Conflito de Interesses e Nepotismo',
  'Assédio Moral, Sexual e Discriminação',
  'Vazamento ou Uso Indevido de Informação Restrita',
  'Quebra de Imparcialidade ou Favorecimento Indevido',
  'Desvio de Recursos Públicos ou Patrimoniais',
] as const;

/**
 * Resultado consolidado do cálculo completo de um risco pelo motor RADAR.
 */
export interface ResultadoCalculoRadar {
  nivelInerente: number;
  classificacaoInerente: ClasseRisco;
  eficaciaFinal: NivelEficaciaControle;
  fatorFinal: FatorAvaliacaoControle;
  travaEvidenciaAcionada: boolean;
  avisoTravaEvidencia?: string;
  nivelResidual: number;
  classificacaoResidual: ClasseRisco;
  statusCritico: StatusCriticidadeDAR;
  isCritico: boolean;
  explicacaoCriticidade: string;
  memoriaCalculo: string;
}

/**
 * 1. Obtém o Nível de Risco Inerente consultando diretamente o Quadro 7.
 */
export function obterNivelInerente(
  probabilidade: NivelProbabilidade,
  impacto: NivelImpacto
): number {
  return MATRIZ_QUADRO_7[impacto][probabilidade];
}

/**
 * 2. Classifica qualquer pontuação (Inerente ou Residual) nas 4 faixas do Quadro 8.
 *
 * REGRA CRÍTICA (SEM ARREDONDAMENTO PRÉVIO):
 * Nunca arredonde um valor residual decimal para inteiro antes de aplicar as faixas!
 * - <= 5       -> 'Baixo'
 * - > 5 e <= 10 -> 'Médio'
 * - > 10 e <= 17 -> 'Alto' (logo, 10.2 é 'Alto'!)
 * - > 17       -> 'Extremo' (logo, 17.1 é 'Extremo'!)
 */
export function classificarNivelRisco(valorExato: number): ClasseRisco {
  if (valorExato <= 5) {
    return 'Baixo';
  }
  if (valorExato <= 10) {
    return 'Médio';
  }
  if (valorExato <= 17) {
    return 'Alto';
  }
  return 'Extremo';
}

/**
 * 3. Aplica a Trava Normativa de Evidência de Controle (Quadro 6 + Seção 4.3.2):
 * "Sem evidência comprovada de operação, o controle não pode receber classificação
 * superior a Fraco (fator 0,9), salvo justificativa expressa e documentada."
 */
export function validarFatorControle(
  eficaciaEscolhida: NivelEficaciaControle,
  possuiEvidenciaComprovada: boolean
): {
  eficaciaFinal: NivelEficaciaControle;
  fatorFinal: FatorAvaliacaoControle;
  travaAcionada: boolean;
  avisoTrava?: string;
} {
  const fatorOriginal = FATORES_QUADRO_6[eficaciaEscolhida];

  // Se não possui evidência e tentou escolher Mediano (0.75), Satisfatório (0.6) ou Forte (0.5):
  if (!possuiEvidenciaComprovada && fatorOriginal < 0.9) {
    return {
      eficaciaFinal: 'Fraco',
      fatorFinal: 0.9,
      travaAcionada: true,
      avisoTrava:
        'Trava Normativa (Quadro 6): Sem evidência comprovada de funcionamento, o controle não pode ultrapassar o nível Fraco (fator 0,9).',
    };
  }

  return {
    eficaciaFinal: eficaciaEscolhida,
    fatorFinal: fatorOriginal,
    travaAcionada: false,
  };
}

/**
 * 4. Avalia se o Risco Residual é Crítico frente à Declaração de Apetite a Riscos (DAR — Anexo III).
 *
 * Regras da Metodologia e da Skill `cgov-gestao-riscos-v4` (§4):
 * - Risco Residual 'Alto' ou 'Extremo' é SEMPRE Crítico ('sim'), mesmo quando a DAR está pendente,
 *   pois na metodologia do ICMBio nenhuma categoria admite apetite Alto ou Extremo.
 * - Risco Residual 'Baixo' nunca é crítico ('nao').
 * - Risco Residual 'Médio' depende do apetite da categoria:
 *   - Se apetite = 'baixo' -> 'sim' (ultrapassou o apetite baixo);
 *   - Se apetite = 'moderado' -> 'nao' (dentro do apetite moderado);
 *   - Se apetite = 'pendente_dar' -> 'pendente_dar' (aguarda deliberação do CIG).
 */
export function avaliarCriticidadeDAR(
  classeResidual: ClasseRisco,
  apetiteCategoria: ApetiteDeclarado
): {
  statusCritico: StatusCriticidadeDAR;
  explicacao: string;
} {
  if (classeResidual === 'Alto' || classeResidual === 'Extremo') {
    return {
      statusCritico: 'sim',
      explicacao: `Risco Crítico: nível residual ${classeResidual} exige tratamento prioritário obrigatório.`,
    };
  }

  if (classeResidual === 'Baixo') {
    return {
      statusCritico: 'nao',
      explicacao: 'Dentro do apetite institucional (Nível Residual Baixo).',
    };
  }

  // Caso Classe Residual === 'Médio':
  if (apetiteCategoria === 'baixo') {
    return {
      statusCritico: 'sim',
      explicacao:
        'Risco Crítico: nível residual Médio supera o apetite Baixo declarado na DAR para esta categoria (ex.: Integridade).',
    };
  }

  if (apetiteCategoria === 'moderado') {
    return {
      statusCritico: 'nao',
      explicacao:
        'Dentro do apetite Moderado declarado na DAR para esta categoria.',
    };
  }

  return {
    statusCritico: 'pendente_dar',
    explicacao:
      'Pendente de DAR: risco residual Médio aguarda aprovação da Declaração de Apetite a Riscos pelo CIG.',
  };
}

/**
 * 5. Executa o cálculo completo do risco (Inerente -> Trava de Controle -> Residual -> DAR)
 * e gera a frase didática "Mostre a Conta" (§5 da Skill cgov-gestao-riscos-v4).
 */
export function calcularRiscoCompletoRadar(params: {
  probabilidade: NivelProbabilidade;
  impacto: NivelImpacto;
  eficaciaControle: NivelEficaciaControle;
  possuiEvidenciaComprovada: boolean;
  apetiteCategoria: ApetiteDeclarado;
}): ResultadoCalculoRadar {
  const nivelInerente = obterNivelInerente(params.probabilidade, params.impacto);
  const classificacaoInerente = classificarNivelRisco(nivelInerente);

  const validacaoControle = validarFatorControle(
    params.eficaciaControle,
    params.possuiEvidenciaComprovada
  );

  // Multiplicação com arredondamento apenas de ponto flutuante (2 casas decimais exatas):
  const nivelResidual = Number(
    (nivelInerente * validacaoControle.fatorFinal).toFixed(2)
  );
  const classificacaoResidual = classificarNivelRisco(nivelResidual);

  const avaliacaoDar = avaliarCriticidadeDAR(
    classificacaoResidual,
    params.apetiteCategoria
  );

  const textoEvidencia = params.possuiEvidenciaComprovada
    ? 'com evidência comprovada'
    : 'sem evidência comprovada';

  const memoriaCalculo = `P=${params.probabilidade} e I=${params.impacto} → Inerente = ${nivelInerente} (${classificacaoInerente}, Quadro 7) × Fator ${validacaoControle.fatorFinal} (${validacaoControle.eficaciaFinal}, ${textoEvidencia}, Quadro 6) = Residual ${nivelResidual} (${classificacaoResidual}, Quadro 8) → Crítico frente à DAR (${params.apetiteCategoria}): ${avaliacaoDar.statusCritico.toUpperCase()}`;

  return {
    nivelInerente,
    classificacaoInerente,
    eficaciaFinal: validacaoControle.eficaciaFinal,
    fatorFinal: validacaoControle.fatorFinal,
    travaEvidenciaAcionada: validacaoControle.travaAcionada,
    avisoTravaEvidencia: validacaoControle.avisoTrava,
    nivelResidual,
    classificacaoResidual,
    statusCritico: avaliacaoDar.statusCritico,
    isCritico: avaliacaoDar.statusCritico === 'sim',
    explicacaoCriticidade: avaliacaoDar.explicacao,
    memoriaCalculo,
  };
}

/**
 * 6. Constrói automaticamente a frase padrão da Seção 4.2.1 da Metodologia RADAR:
 * "Devido o(a) [causas], poderá ocorrer o(a) [evento de risco], ocasionando o(a)
 *  [consequências] e impactando o alcance do [objetivo ou resultado afetado]."
 */
export function gerarSintaxePadraoRisco(params: {
  causas: string;
  eventoRisco: string;
  consequencias: string;
  objetivoAfetado: string;
}): string {
  const c = params.causas.trim();
  const e = params.eventoRisco.trim();
  const q = params.consequencias.trim();
  const o = params.objetivoAfetado.trim();

  return `Devido o(a) ${c}, poderá ocorrer o(a) ${e}, ocasionando o(a) ${q} e impactando o alcance do ${o}.`;
}

/**
 * 7. Valida a Regra do Programa Integra+ (Portaria ICMBio nº 253/2026 e Quadro 3):
 * - Proíbe categorias híbridas como "Operacional com interface de Integridade";
 * - Exige subcategoria do Quadro 3 quando a categoria for "Integridade";
 * - Quando o Teste de Integridade for aplicável (há potencial de fraude, favorecimento,
 *   conflito de interesses ou uso indevido de informação) e o usuário escolher outra
 *   categoria (ex.: "Operacional"), exige justificativa expressa!
 */
export function validarRegraIntegridade(params: {
  categoriaNome: string;
  subcategoriaIntegridade?: string;
  testeIntegridadeAplicavel: boolean;
  justificativaNaoIntegridade?: string;
}): { valido: boolean; erro?: string } {
  const nomeLimpo = params.categoriaNome.trim();

  // Regra 1: Proibir categoria mista "Operacional com interface de Integridade"
  if (
    nomeLimpo.toLowerCase().includes('interface de integridade') ||
    !CATEGORIAS_OFICIAIS_QUADRO_2.includes(
      nomeLimpo as (typeof CATEGORIAS_OFICIAIS_QUADRO_2)[number]
    )
  ) {
    return {
      valido: false,
      erro: `Categoria inválida ("${nomeLimpo}"). A Metodologia proíbe categorias mistas como "Operacional com interface de Integridade". Escolha uma das 8 categorias oficiais do Quadro 2.`,
    };
  }

  // Regra 2: Se for Integridade, a subcategoria do Quadro 3 é obrigatória
  if (nomeLimpo === 'Integridade') {
    if (!params.subcategoriaIntegridade || !params.subcategoriaIntegridade.trim()) {
      return {
        valido: false,
        erro: 'Para riscos de Integridade, é obrigatório selecionar uma das 6 subcategorias do Quadro 3 (Portaria ICMBio nº 253/2026 — Integra+).',
      };
    }
    return { valido: true };
  }

  // Regra 3: Se o teste de integridade for aplicável mas escolheu outra categoria, exige justificativa
  if (
    params.testeIntegridadeAplicavel &&
    (!params.justificativaNaoIntegridade ||
      params.justificativaNaoIntegridade.trim().length < 10)
  ) {
    return {
      valido: false,
      erro: 'Como o evento envolve vulnerabilidade de integridade, classifique como "Integridade" ou registre justificativa formal explicando por que não se trata de risco à integridade.',
    };
  }

  return { valido: true };
}
