/**
 * ============================================================================
 * TRAVA DO RISCO CRÍTICO — "Aceitar" não vale para risco fora do apetite (LAC-13)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Pela Metodologia (SEI 024421455, itens 4.5 e 4.5.1 e Anexo III), um risco
 * cujo nível residual está FORA do apetite definido na DAR (Declaração de
 * Apetite a Riscos) é um "risco crítico" e precisa de tratamento. Também
 * tratamos como crítico o risco cuja categoria ainda não tem apetite na DAR
 * (`pendente_dar`). Atenção: "crítico" aqui NÃO é a faixa 18 a 25 do
 * Quadro 8 (essa se chama Extremo).
 *
 * Regras de negócio relacionadas: RN-019, RN-020, RF-049 e RF-050.
 *
 * A ficha passa na trava quando:
 *   - o risco NÃO é crítico; ou
 *   - a estratégia principal NÃO é "Aceitar" E existe pelo menos uma ação de
 *     tratamento (5W2H) cuja estratégia também NÃO é "Aceitar".
 *
 * Exemplos:
 *   status 'nao',  principal 'Aceitar', sem ações        -> ok
 *   status 'sim',  principal 'Aceitar', ['Mitigar']      -> recusa 'aceitar_em_critico'
 *   status 'sim',  principal 'Mitigar', []               -> recusa 'sem_acao_em_critico'
 *   status 'sim',  principal 'Compartilhar', ['Evitar']  -> ok
 *
 * Este módulo é função pura (sem tela, sem banco). O mesmo texto fixo vale no
 * front e no banco (migração da LAC-13).
 */

import type { EstrategiaTratamento, StatusCriticidadeDAR } from '../types/radar.types';

/** Por que a ficha foi recusada. */
export type MotivoTrava = 'aceitar_em_critico' | 'sem_acao_em_critico';

/** Resultado da verificação: passou, ou foi recusada com um motivo. */
export type ResultadoTrava = { ok: true } | { ok: false; motivo: MotivoTrava };

/** Frase mostrada ao usuário quando o banco (ou a demonstração) recusa a ficha. */
export const MENSAGEM_TRAVA_CRITICO =
  'Risco crítico (fora do apetite da DAR ou com DAR pendente) precisa de tratamento: escolha Mitigar, Compartilhar ou Evitar e inclua pelo menos uma ação 5W2H na etapa 4. Se a ficha estiver em validação ou homologação, devolva-a à unidade.';

/** Verdadeiro quando o risco é crítico para esta trava: 'sim' ou 'pendente_dar'. */
export function exigeTratamento(statusCritico: StatusCriticidadeDAR): boolean {
  return statusCritico === 'sim' || statusCritico === 'pendente_dar';
}

/**
 * Aplica a trava. Primeiro olha a estratégia principal; só depois procura
 * uma ação de tratamento que não seja "Aceitar".
 */
export function verificarTravaRiscoCritico(e: {
  statusCritico: StatusCriticidadeDAR;
  estrategiaPrincipal: EstrategiaTratamento;
  estrategiasDasAcoes: EstrategiaTratamento[];
}): ResultadoTrava {
  if (!exigeTratamento(e.statusCritico)) return { ok: true };
  if (e.estrategiaPrincipal === 'Aceitar') return { ok: false, motivo: 'aceitar_em_critico' };
  if (!e.estrategiasDasAcoes.some((estrategia) => estrategia !== 'Aceitar')) {
    return { ok: false, motivo: 'sem_acao_em_critico' };
  }
  return { ok: true };
}

/** Texto de ajuda do formulário (etapa de tratamento); null se o risco não é crítico. */
export function ajudaTravaCritico(statusCritico: StatusCriticidadeDAR): string | null {
  if (!exigeTratamento(statusCritico)) return null;
  const primeiraFrase =
    statusCritico === 'sim'
      ? 'Este risco está fora do apetite da DAR.'
      : 'A categoria deste risco ainda não tem apetite declarado na DAR, e o RADAR o trata como crítico.';
  const resto =
    ' Pela Metodologia (4.5 e Anexo III), ele precisa de tratamento: escolha Mitigar, Compartilhar ou Evitar e descreva a ação.';
  return primeiraFrase + resto;
}
