/**
 * ============================================================================
 * PERFIL SUGERIDO PELO TIPO DA UNIDADE (`src/utils/perfilPorUnidade.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Quem chefia uma unidade recebe um perfil conforme o TIPO dela. Ex.: o titular
 * de uma Diretoria vira `diretor`; o de uma UC vira `gestor`. Algumas unidades
 * são exceção e são achadas pelo `icmbio_id` (código estável), nunca pela sigla,
 * que pode mudar. Por isso `sugerirPapel` confere primeiro os códigos especiais
 * e só depois o tipo. Tabela completa: spec B2, seção 8.8.
 *
 * Exemplo: { tipo: 'coordenacao-geral', icmbioId: '10.0007' } -> 'cgge'
 *          { tipo: 'coordenacao-geral', icmbioId: '10.0010' } -> 'coordenador_geral'
 */
import type { PapelGovernanca } from '../types/radar.types';

export interface UnidadeParaPerfil {
  tipo: string;
  icmbioId: string | null;
  /** Tipo da unidade-mãe, quando se sabe (usado só para detectar tipo suspeito). */
  tipoPai?: string | null;
}

/** Unidades com perfil próprio, localizadas pelo icmbio_id (decisão R3). */
export const ICMBIO_ID_ESPECIAIS = {
  assessoriaPresidencia: '10.0001',
  cgge: '10.0007',
  cgov: '10.0008',
  audit: '10.0034',
} as const;

/** Perfil pelo tipo, para as unidades que não são exceção. O que não está aqui é `gestor`. */
const PAPEL_POR_TIPO: Record<string, PapelGovernanca> = {
  presidencia: 'presidencia',
  diretoria: 'diretor',
  'gerencia-regional': 'gerente_regional',
  'coordenacao-territorial': 'coordenador_territorial',
  'coordenacao-geral': 'coordenador_geral',
  gabinete: 'gabin',
};

export function sugerirPapel(u: UnidadeParaPerfil): PapelGovernanca {
  // 1º: unidades específicas, pelo icmbio_id.
  switch (u.icmbioId) {
    case ICMBIO_ID_ESPECIAIS.assessoriaPresidencia:
      return 'presidencia';
    case ICMBIO_ID_ESPECIAIS.cgge:
      return 'cgge';
    case ICMBIO_ID_ESPECIAIS.cgov:
      return 'cgov';
    case ICMBIO_ID_ESPECIAIS.audit:
      return 'auditoria';
  }
  // 2º: o tipo. UC, NGI, Centros, Divisões, PFE, CORR, OUV etc. caem em `gestor`.
  return PAPEL_POR_TIPO[u.tipo] ?? 'gestor';
}

/** Quanto maior o número, maior o alcance. Empates são intencionais (spec B2-4). */
export const ORDEM_ALCANCE: Record<PapelGovernanca, number> = {
  presidencia: 6,
  diretor: 5,
  cgov: 4,
  cgge: 4,
  gabin: 4,
  auditoria: 4,
  gerente_regional: 3,
  coordenador_geral: 2,
  coordenador_territorial: 1,
  gestor: 0,
};

/**
 * Devolve um aviso quando o tipo gravado parece errado, ou `null`.
 * Caso real: a CT Cuiabá está no SharePoint como `coordenacao-geral`, mas fica
 * dentro de uma Gerência Regional (onde só cabem Coordenações Territoriais).
 */
export function tipoSuspeito(u: UnidadeParaPerfil): string | null {
  if (u.tipo === 'coordenacao-geral' && u.tipoPai === 'gerencia-regional') {
    return 'Coordenação-Geral dentro de uma Gerência Regional: pode ser uma Coordenação Territorial; confira o tipo no SharePoint.';
  }
  return null;
}
