/**
 * ============================================================================
 * ESCALAS LITERAIS DOS QUADROS 4 (PROBABILIDADE) E 5 (IMPACTO) — RADAR
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Este é o ÚNICO lugar do código que guarda os nomes e as descrições das
 * escalas de 1 a 5 da Metodologia (SEI 024421455, item 4.3). O importador, o
 * componente de seleção e a matriz de risco leem daqui, então os textos nunca
 * ficam diferentes de uma tela para outra.
 *
 * Os textos são copiados literalmente de
 * `docs/01-normativos/matriz-regras-regime-b.md` (§6 e §7). O Quadro 4 NÃO
 * tem percentuais: nada de "< 10%" ou "> 90%".
 *
 * `lerNivelDaCelula` entende a célula de uma planilha escrita de vários jeitos:
 *   "3", "Provável", "provavel", " PROVÁVEL ", "3 — Provável", "Provável (3)"
 * e recusa, com um motivo em português, o que não faz sentido:
 *   "6" (fora de 1 a 5), "3,5" (mais de um número), "3 — Raro" (número e nome
 *   que não concordam), "Média" (nome que não está no quadro).
 *
 * Esta leitura NÃO calcula risco: só descobre qual nível (1 a 5) a pessoa quis
 * dizer. O valor do Risco Inerente continua vindo da tabela fixa do Quadro 7.
 */

import type { NivelImpacto, NivelProbabilidade } from '../types/radar.types';

/** Um nível de escala: número, nome literal e descrição literal do quadro. */
export interface NivelDescrito<N extends number> {
  valor: N;
  nome: string;
  descricao: string;
}

/** Quadro 4: probabilidade (1 = Raro ... 5 = Praticamente certo). */
export const ESCALA_PROBABILIDADE_QUADRO_4: readonly NivelDescrito<NivelProbabilidade>[] = [
  { valor: 1, nome: 'Raro', descricao: 'Acontece apenas em situações excepcionais. Não há histórico conhecido do evento ou não há indícios que sinalizem sua ocorrência.' },
  { valor: 2, nome: 'Pouco provável', descricao: 'O histórico conhecido aponta para baixa frequência de ocorrência no prazo associado ao objetivo.' },
  { valor: 3, nome: 'Provável', descricao: 'Evento esperado, de frequência reduzida, com histórico conhecido pela maioria dos gestores e operadores do processo.' },
  { valor: 4, nome: 'Muito provável', descricao: 'Evento usual, de ocorrência habitual, com histórico conhecido amplamente por parte dos gestores e operadores do processo.' },
  { valor: 5, nome: 'Praticamente certo', descricao: 'Evento repetitivo e constante, de ocorrência numerosa, com histórico disponível ou não, mas evidente para os que conhecem o processo.' },
];

/** Quadro 5: impacto (1 = Muito baixo ... 5 = Muito alto). */
export const ESCALA_IMPACTO_QUADRO_5: readonly NivelDescrito<NivelImpacto>[] = [
  { valor: 1, nome: 'Muito baixo', descricao: 'Compromete minimamente o atingimento do objetivo; para fins práticos, não altera o alcance do objetivo/resultado.' },
  { valor: 2, nome: 'Baixo', descricao: 'Compromete em alguma medida o alcance do objetivo, mas não impede o alcance da maior parte do objetivo/resultado.' },
  { valor: 3, nome: 'Médio', descricao: 'Compromete razoavelmente o alcance do objetivo/resultado.' },
  { valor: 4, nome: 'Alto', descricao: 'Compromete a maior parte do atingimento do objetivo/resultado.' },
  { valor: 5, nome: 'Muito alto', descricao: 'Compromete totalmente ou quase totalmente o atingimento do objetivo/resultado.' },
];

/** Devolve o nome literal de um nível. Ex.: `nomeDoNivel(ESCALA_IMPACTO_QUADRO_5, 4)` -> "Alto". */
export function nomeDoNivel<N extends number>(escala: readonly NivelDescrito<N>[], valor: N): string {
  const nivel = escala.find((n) => n.valor === valor);
  if (!nivel) throw new Error(`Nível ${valor} não existe na escala`);
  return nivel.nome;
}

/** Resultado da leitura de uma célula: o nível, ou o motivo da recusa. */
export type LeituraNivel<N> = { ok: true; nivel: N } | { ok: false; motivo: string };

/** Tira caixa, acentos e espaços repetidos, para comparar nomes. */
function normalizarNome(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lê uma célula (número, nome, ou os dois) e devolve o nível da escala.
 * Ver exemplos no comentário do topo do arquivo.
 */
export function lerNivelDaCelula<N extends number>(
  celula: string,
  escala: readonly NivelDescrito<N>[],
): LeituraNivel<N> {
  const texto = celula.trim();
  if (texto === '') return { ok: false, motivo: 'célula vazia' };

  // Números na célula: "3,5" e "2 a 3" têm dois, então são recusados.
  const numeros = texto.match(/-?\d+/g) ?? [];
  if (numeros.length > 1) return { ok: false, motivo: 'mais de um número' };

  let porNumero: NivelDescrito<N> | undefined;
  if (numeros.length === 1) {
    const numero = Number(numeros[0]);
    porNumero = escala.find((n) => n.valor === numero);
    if (!porNumero) return { ok: false, motivo: 'fora de 1 a 5' };
  }

  // O que sobra sem dígitos e sem separadores (— - ( )) é o nome.
  const nomeBruto = normalizarNome(texto.replace(/[\d—\-()]/g, ' '));
  if (nomeBruto === '') {
    // Só número (já validado acima).
    return { ok: true, nivel: (porNumero as NivelDescrito<N>).valor };
  }

  const porNome = escala.find((n) => normalizarNome(n.nome) === nomeBruto);
  if (!porNome) return { ok: false, motivo: 'nome fora do quadro' };

  if (porNumero && porNumero.valor !== porNome.valor) {
    return {
      ok: false,
      motivo: `o número (${porNumero.valor}) e o nome ("${porNome.nome}") não concordam`,
    };
  }
  return { ok: true, nivel: porNome.valor };
}
