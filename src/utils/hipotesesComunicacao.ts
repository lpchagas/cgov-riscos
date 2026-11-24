/**
 * Hipóteses de comunicação à CGOV (LAC-04, UC-16) e o cálculo do prazo.
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A Política (item 4.7.2) lista 6 situações em que a unidade precisa avisar a CGOV.
 * Há ainda a "comunicação de alerta de KRI" ('alerta_kri'), que leva à CGOV um alerta
 * de indicador e pode SUPRIR as hipóteses I, II ou III quando coincidirem.
 * `exigeRisco` diz se o formulário obriga ligar pelo menos um risco (o banco confere igual).
 */
import type { ComunicacaoCgov, HipoteseComunicacao } from '../types/radar.types';
import { diasUteisEntre, hojeEmBrasilia, somarDiasUteis } from './diasUteis';

export const HIPOTESES: Record<HipoteseComunicacao, { rotulo: string; explicacao: string; exigeRisco: boolean }> = {
  I: {
    rotulo: 'I - Mudança do nível residual ou do enquadramento no apetite',
    explicacao: 'O risco passou a ser, ou deixou de ser, Risco Crítico (nível residual fora do apetite da DAR).',
    exigeRisco: true,
  },
  II: {
    rotulo: 'II - Falha de controle de Risco Crítico',
    explicacao: 'Falha de controle de Risco Crítico que o reduza no Quadro 6 (Fator de Avaliação dos Controles).',
    exigeRisco: true,
  },
  III: {
    rotulo: 'III - Materialização de Risco Crítico',
    explicacao: 'O evento de um Risco Crítico aconteceu.',
    exigeRisco: true,
  },
  IV: {
    rotulo: 'IV - Risco emergente',
    explicacao: 'Surgiu um risco novo, ainda não registrado no RADAR.',
    exigeRisco: false,
  },
  V: {
    rotulo: 'V - Atraso ou dificuldade no tratamento',
    explicacao: 'O tratamento do risco está atrasado ou encontra dificuldade.',
    exigeRisco: true,
  },
  VI: {
    rotulo: 'VI - Revisão do Plano de Gestão de Riscos ou apreciação pelas instâncias de governança',
    explicacao: 'Situação que possa demandar revisão do Plano de Gestão de Riscos ou apreciação pelas instâncias de governança.',
    exigeRisco: false,
  },
  alerta_kri: {
    rotulo: 'Alerta de indicador (KRI)',
    explicacao: 'Comunicação do resultado da reavaliação após um alerta de KRI; pode suprir as hipóteses I, II ou III.',
    exigeRisco: true,
  },
};

/** Prazo da comunicação: 10 dias úteis contados da ciência. */
export const PRAZO_COMUNICACAO_DIAS_UTEIS = 10;

/** O que o banco GUARDA da comunicação; o resto (prazo e situação) é calculado, como na visão. */
export type ComunicacaoBase = Omit<ComunicacaoCgov, 'prazoDiasUteis' | 'noPrazo' | 'venceEm' | 'situacao'>;

/**
 * Calcula os campos derivados como a visão `comunicacoes_cgov_situacao`.
 * O prazo vai da ciência ao DIA DO ENVIO (em Brasília).
 * Ex.: ciência 19/11/2026, envio 24/11 -> prazoDiasUteis 1 (20 é feriado), noPrazo true.
 */
export function montarComunicacao(base: ComunicacaoBase): ComunicacaoCgov {
  const prazo = diasUteisEntre(base.dataCiencia, hojeEmBrasilia(new Date(base.comunicadaEm)));
  return {
    ...base,
    prazoDiasUteis: prazo,
    noPrazo: prazo <= PRAZO_COMUNICACAO_DIAS_UTEIS,
    venceEm: somarDiasUteis(base.dataCiencia, PRAZO_COMUNICACAO_DIAS_UTEIS),
    situacao: base.cienciaCgovEm ? 'ciencia_registrada' : 'nova',
  };
}
