/**
 * ============================================================================
 * FILTROS DA LISTA DE RISCOS (`src/utils/filtrosRiscos.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Funções "puras" (recebem dados e devolvem dados, sem efeitos colaterais) que
 * decidem quais riscos aparecem numa lista. Por serem puras, são fáceis de
 * testar e podem ser usadas tanto pela store quanto pelas páginas.
 *
 * Os filtros vêm da URL (ex.: `/riscos?q=contrato&critico=sim&p=3&i=5`), o que
 * permite COMPARTILHAR um link já filtrado com um colega.
 *
 * ⚠️ Aqui só FILTRAMOS valores que já foram calculados pela
 * `calculadoraRiscoRadar.ts`. Nenhuma nota é recalculada.
 */
import type {
  ClasseRisco,
  FichaRisco,
  NivelImpacto,
  NivelProbabilidade,
  StatusFluxoRisco,
} from '../types/radar.types';

export interface FiltrosListaRiscos {
  termo?: string;
  probabilidade?: NivelProbabilidade;
  impacto?: NivelImpacto;
  classeResidual?: ClasseRisco;
  statusFluxo?: StatusFluxoRisco;
  apenasCriticos?: boolean;
}

/**
 * O risco contém o termo buscado? (ignora maiúsculas/minúsculas)
 * Procura no código, objeto, categoria, descrição, responsável e KRIs.
 * Ex.: termo "radar-2026-001" encontra o risco de código "RADAR-2026-001".
 */
export function riscoCorrespondeAoTermo(risco: FichaRisco, termoBruto: string): boolean {
  const termo = termoBruto.trim().toLowerCase();
  if (!termo) return true;
  return (
    risco.codigoRadar.toLowerCase().includes(termo) ||
    (risco.nomeObjetoCache || '').toLowerCase().includes(termo) ||
    risco.categoriaNome.toLowerCase().includes(termo) ||
    risco.descricaoPadrao.toLowerCase().includes(termo) ||
    risco.responsavelRiscoNome.toLowerCase().includes(termo) ||
    risco.kris.some((k) => k.nomeIndicador.toLowerCase().includes(termo))
  );
}

/** Aplica todos os filtros de uma vez. Filtro ausente = não filtra. */
export function filtrarRiscos(riscos: FichaRisco[], filtros: FiltrosListaRiscos): FichaRisco[] {
  return riscos.filter((r) => {
    if (filtros.probabilidade && r.probabilidade !== filtros.probabilidade) return false;
    if (filtros.impacto && r.impacto !== filtros.impacto) return false;
    if (filtros.classeResidual && r.classificacaoResidual !== filtros.classeResidual) return false;
    if (filtros.statusFluxo && r.statusFluxo !== filtros.statusFluxo) return false;
    if (filtros.apenasCriticos && r.statusCritico !== 'sim') return false;
    return riscoCorrespondeAoTermo(r, filtros.termo ?? '');
  });
}

/** Valores válidos para validar o que chega pela URL. */
const CLASSES: ClasseRisco[] = ['Baixo', 'Médio', 'Alto', 'Extremo'];
const STATUS: StatusFluxoRisco[] = [
  'preliminar_cgov',
  'rascunho',
  'em_validacao_cg',
  'em_homologacao_dir',
  'aprovado',
  'devolvido',
];

function nivel1a5(valor: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as 1 | 2 | 3 | 4 | 5) : undefined;
}

/**
 * Converte a query da URL em filtros, DESCARTANDO valores inválidos
 * (ex.: `?p=9` é ignorado, pois a probabilidade vai de 1 a 5).
 */
export function lerFiltrosDaQuery(query: Record<string, unknown>): FiltrosListaRiscos {
  const texto = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const classe = texto(query.nivel);
  const status = texto(query.status);
  return {
    termo: texto(query.q),
    probabilidade: nivel1a5(query.p),
    impacto: nivel1a5(query.i),
    classeResidual: CLASSES.includes(classe as ClasseRisco) ? (classe as ClasseRisco) : undefined,
    statusFluxo: STATUS.includes(status as StatusFluxoRisco) ? (status as StatusFluxoRisco) : undefined,
    apenasCriticos: query.critico === 'sim',
  };
}
