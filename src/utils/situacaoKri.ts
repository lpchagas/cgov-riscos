/**
 * Situação de um KRI na tela de Monitoramento (LAC-03). Só decide a "etiqueta";
 * os números do prazo vêm do banco (visão `alertas_kri_situacao`).
 */
import type { AlertaKri, IndicadorKri } from '../types/radar.types';

/**
 * - vencido: alerta ABERTO e fora do prazo de 10 dias úteis;
 * - alerta: alerta ABERTO ainda no prazo;
 * - comunicado: alerta encerrado (tem `encerradoEm` ou `comunicacaoId`);
 * - sem_limite: KRI sem limite numérico (inclui o KRI antigo só com o texto "a converter");
 * - dentro: tem limite numérico e nenhum alerta.
 */
export type SituacaoKri = 'vencido' | 'alerta' | 'comunicado' | 'sem_limite' | 'dentro';

/** Ordem de urgência, da mais urgente para a menos urgente. */
const ORDEM: SituacaoKri[] = ['vencido', 'alerta', 'comunicado', 'sem_limite', 'dentro'];

/**
 * Situação do KRI. O alerta, quando existe, é o mais recente do KRI.
 * Um alerta (aberto ou encerrado) sempre vale mais que a falta de limite.
 * Ex.: KRI com limite '< 80' e alerta aberto no dia 3 -> 'alerta'.
 */
export function situacaoKri(kri: IndicadorKri, alerta?: AlertaKri): SituacaoKri {
  if (alerta) {
    if (alerta.encerradoEm || alerta.comunicacaoId) return 'comunicado';
    return alerta.vencido ? 'vencido' : 'alerta';
  }
  // Limite numérico = operador E valor (valor 0 é válido, por isso não usamos "if (valor)").
  const temLimite =
    !!kri.limiteOperador && typeof kri.limiteValor === 'number' && Number.isFinite(kri.limiteValor);
  return temLimite ? 'dentro' : 'sem_limite';
}

/**
 * Ordena do mais urgente ao menos urgente (vencido, alerta, comunicado,
 * sem_limite, dentro). É estável (mantém a ordem original dentro do mesmo
 * grupo) e NÃO altera a lista recebida.
 */
export function ordenarPorUrgencia<T>(itens: T[], situacao: (t: T) => SituacaoKri): T[] {
  return itens
    .map((item, posicao) => ({ item, posicao, peso: ORDEM.indexOf(situacao(item)) }))
    .sort((x, y) => x.peso - y.peso || x.posicao - y.posicao)
    .map((x) => x.item);
}
