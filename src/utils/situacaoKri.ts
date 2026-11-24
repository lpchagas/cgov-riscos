/**
 * Situação de um KRI na tela de Monitoramento (LAC-03). Só decide a "etiqueta";
 * os números do prazo vêm do banco (visão `alertas_kri_situacao`).
 */
import type { AlertaKri, IndicadorKri, MedicaoKri } from '../types/radar.types';
import { diasUteisEntre, hojeEmBrasilia, somarDiasUteis } from './diasUteis';

/** O que o banco GUARDA de um alerta (o resto — prazos — é calculado pela visão). */
export type AlertaKriBase = Pick<AlertaKri, 'id' | 'kriId' | 'cienciaEm' | 'encerradoEm' | 'comunicacaoId'>;

/**
 * Calcula os campos derivados do alerta como a visão `alertas_kri_situacao` do banco
 * (usada pela demonstração, que não tem banco):
 *   venceEm = ciência + 10 dias úteis;
 *   diaAtual = dias úteis da ciência até o encerramento (ou até hoje, se aberto; teto 99);
 *   vencido = só alerta ABERTO com mais de 10 dias úteis;
 *   diasUteisVencido = dias além dos 10 (0 se encerrado ou no prazo; sem o teto de 99).
 * Ex.: ciência 19/11/2026, hoje 24/11 -> diaAtual 1 (20 é feriado), venceEm 04/12, vencido false.
 */
export function montarAlertaKri(base: AlertaKriBase, hoje: string = hojeEmBrasilia()): AlertaKri {
  const dias = diasUteisEntre(base.cienciaEm, base.encerradoEm ?? hoje);
  const aberto = !base.encerradoEm;
  return {
    id: base.id,
    kriId: base.kriId,
    cienciaEm: base.cienciaEm,
    venceEm: somarDiasUteis(base.cienciaEm, 10),
    diaAtual: Math.min(dias, 99),
    vencido: aberto && dias > 10,
    diasUteisVencido: aberto ? Math.max(dias - 10, 0) : 0,
    encerradoEm: base.encerradoEm,
    comunicacaoId: base.comunicacaoId,
  };
}

/**
 * O alerta já foi encerrado (comunicado à CGOV)? Critério ÚNICO, usado aqui e em
 * `alertaAtualDoKri`: tem data de encerramento OU comunicação registrada.
 */
export function alertaEncerrado(a: AlertaKri): boolean {
  return !!(a.encerradoEm || a.comunicacaoId);
}

/**
 * Dia (no fuso de Brasília) em que a leitura foi REGISTRADA no sistema.
 * Usa o carimbo `registradoEm` (criado_em do banco); leitura antiga sem carimbo
 * usa a data da medição. Ex.: '2026-11-25T01:00:00Z' -> '2026-11-24' (22h em Brasília).
 */
function diaDoRegistro(m: MedicaoKri): string {
  const carimbo = m.registradoEm ? new Date(m.registradoEm) : undefined;
  // Carimbo ilegível não pode derrubar a tela: cai na data da medição.
  return carimbo && !Number.isNaN(carimbo.getTime()) ? hojeEmBrasilia(carimbo) : m.dataMedicao.slice(0, 10);
}

/**
 * - vencido: alerta ABERTO e fora do prazo de 10 dias úteis;
 * - alerta: alerta ABERTO ainda no prazo;
 * - comunicado: alerta encerrado (tem `encerradoEm` ou `comunicacaoId`), SÓ ATÉ A PRÓXIMA
 *   LEITURA (decisão D-5 do responsável, 2026-11-24). "Próxima leitura" = leitura registrada
 *   em DIA POSTERIOR ao encerramento (o banco guarda o encerramento só como data, sem hora;
 *   por isso uma leitura no mesmo dia da comunicação ainda não tira o "comunicado").
 *   Depois dela, o KRI volta ao normal (dentro / sem limite); se a leitura passou do limite,
 *   o banco abre um alerta NOVO, que é o que `alertaAtualDoKri` devolve.
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
    if (!alertaEncerrado(alerta)) return alerta.vencido ? 'vencido' : 'alerta';
    const fim = alerta.encerradoEm;
    // Sem data de encerramento não há como comparar: continua "comunicado".
    const houveLeituraNova = !!fim && kri.medicoes.some((m) => diaDoRegistro(m) > fim);
    if (!houveLeituraNova) return 'comunicado';
    // Leitura nova depois da comunicação: segue para a situação normal, abaixo.
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

/**
 * O alerta que vale para a tela: o ABERTO, se houver (há no máximo um por KRI);
 * senão o encerrado mais recente (pela ciência). `undefined` = KRI sem alerta.
 * Ex.: KRI com um alerta comunicado em outubro e um aberto hoje -> o aberto.
 */
export function alertaAtualDoKri(alertas: AlertaKri[], kriId: string): AlertaKri | undefined {
  const doKri = alertas.filter((a) => a.kriId === kriId);
  return (
    doKri.find((a) => !alertaEncerrado(a)) ??
    [...doKri].sort((a, b) => b.cienciaEm.localeCompare(a.cienciaEm))[0]
  );
}
