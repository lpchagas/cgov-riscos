/**
 * ============================================================================
 * PRÉVIA DO IMPACTO DE MUDAR O APETITE DA DAR (`src/utils/darImpacto.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Antes de a CGOV confirmar uma mudança de apetite, a tela mostra o que vai
 * acontecer: "2 riscos passam a ser Críticos; 1 deixa de ser".
 *
 * Esta função NÃO altera nada: ela só PREVÊ, usando a MESMA regra oficial que a
 * store usa ao aplicar a mudança (`avaliarCriticidadeDAR`, da calculadora).
 * O nível residual de cada ficha não muda com a DAR — só a criticidade muda.
 *
 * Exemplo (dados de demonstração):
 *   Um risco com residual 8,4 (Médio) numa categoria de apetite Baixo é Crítico:
 *   Apetite Baixo    → Médio supera Baixo → Crítico.
 *   Apetite Moderado → Médio cabe em Moderado → deixa de ser Crítico.
 */
import type { ApetiteDeclarado, FichaRisco, StatusCriticidadeDAR } from '../types/radar.types';
import { avaliarCriticidadeDAR } from './calculadoraRiscoRadar';

/** Textos curtos de cada opção de apetite, para botões e mensagens. */
export const ROTULOS_APETITE: Record<ApetiteDeclarado, { rotulo: string; limite: string }> = {
  baixo: { rotulo: 'Baixo', limite: 'aceita residual até 5' },
  moderado: { rotulo: 'Moderado', limite: 'aceita residual até 10' },
  pendente_dar: { rotulo: 'Pendente', limite: 'aguarda deliberação do CIG' },
};

export interface MudancaCriticidade {
  risco: FichaRisco;
  de: StatusCriticidadeDAR;
  para: StatusCriticidadeDAR;
}

export interface ImpactoDar {
  /** Riscos da categoria (todos). */
  total: number;
  /** Passam a ser Críticos com o novo apetite. */
  passamACriticos: MudancaCriticidade[];
  /** Deixam de ser Críticos. */
  deixamDeSerCriticos: MudancaCriticidade[];
  /** Mudam entre "dentro do apetite" e "pendente" (sem entrar/sair de Crítico). */
  outrasMudancas: MudancaCriticidade[];
}

/**
 * Calcula o impacto de trocar o apetite de UMA categoria.
 * @param riscos lista completa de fichas (a função filtra pela categoria)
 */
export function simularImpactoDar(
  riscos: FichaRisco[],
  categoriaId: number,
  novoApetite: ApetiteDeclarado
): ImpactoDar {
  const daCategoria = riscos.filter((r) => r.categoriaId === categoriaId);
  const impacto: ImpactoDar = { total: daCategoria.length, passamACriticos: [], deixamDeSerCriticos: [], outrasMudancas: [] };

  for (const risco of daCategoria) {
    const de = risco.statusCritico;
    const para = avaliarCriticidadeDAR(risco.classificacaoResidual, novoApetite).statusCritico;
    if (de === para) continue;
    const mudanca = { risco, de, para };
    if (para === 'sim') impacto.passamACriticos.push(mudanca);
    else if (de === 'sim') impacto.deixamDeSerCriticos.push(mudanca);
    else impacto.outrasMudancas.push(mudanca);
  }
  return impacto;
}

/** Frase-resumo da prévia. Ex.: "1 risco deixa de ser Crítico." */
export function resumirImpactoDar(impacto: ImpactoDar): string {
  const partes: string[] = [];
  const n = (q: number, s: string, p: string) => `${q} ${q === 1 ? s : p}`;
  if (impacto.passamACriticos.length) partes.push(`${n(impacto.passamACriticos.length, 'risco passa', 'riscos passam')} a ser Crítico${impacto.passamACriticos.length === 1 ? '' : 's'}`);
  if (impacto.deixamDeSerCriticos.length) partes.push(`${n(impacto.deixamDeSerCriticos.length, 'risco deixa', 'riscos deixam')} de ser Crítico${impacto.deixamDeSerCriticos.length === 1 ? '' : 's'}`);
  if (impacto.outrasMudancas.length) partes.push(`${n(impacto.outrasMudancas.length, 'risco muda', 'riscos mudam')} de situação`);
  if (!partes.length) return impacto.total ? 'Nenhum risco muda de situação.' : 'Esta categoria ainda não tem riscos.';
  return partes.join('; ') + '.';
}
