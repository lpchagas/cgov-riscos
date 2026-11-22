/**
 * ============================================================================
 * RÓTULOS DA INTERFACE (`src/utils/rotulosInterface.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O banco de dados guarda códigos curtos como `em_validacao_cg`. Eles são ótimos
 * para o computador, mas péssimos para quem usa o sistema. Este arquivo é o
 * "dicionário" que traduz cada código em um texto claro (glossário da seção 5
 * de `docs/04-ux/diagnostico-ui-2026-11.md`).
 *
 * REGRA: nenhuma tela deve mostrar o código cru. Sempre passe por aqui.
 *
 * ⚠️ Este arquivo NÃO faz cálculo nenhum. A classificação (Baixo/Médio/Alto/
 * Extremo) e a criticidade vêm prontas de `calculadoraRiscoRadar.ts`.
 */
import type {
  ClasseRisco,
  StatusCriticidadeDAR,
  StatusFluxoRisco,
  TipoUnidade,
  HistoricoFluxoItem,
} from '../types/radar.types';

/** Tom visual de uma etiqueta; corresponde às variantes do componente `Chip`. */
export type TomVisual = 'neutro' | 'info' | 'sucesso' | 'aviso' | 'perigo';

export interface RotuloComTom {
  rotulo: string;
  descricao: string;
  tom: TomVisual;
  icone: string; // classe do Font Awesome 6
}

/** Status do fluxo de governança em 3 degraus. */
export const ROTULOS_STATUS_FLUXO: Record<StatusFluxoRisco, RotuloComTom> = {
  preliminar_cgov: {
    rotulo: 'Preliminar (CGOV)',
    descricao: 'Importado da skill pela CGOV; aguarda revisão da unidade',
    tom: 'neutro',
    icone: 'fa-solid fa-file-import',
  },
  rascunho: {
    rotulo: 'Rascunho',
    descricao: 'Em elaboração pela unidade (1ª Linha)',
    tom: 'neutro',
    icone: 'fa-solid fa-pen',
  },
  em_validacao_cg: {
    rotulo: 'Aguardando validação',
    descricao: 'Com a Coordenação-Geral (2º degrau)',
    tom: 'info',
    icone: 'fa-solid fa-hourglass-half',
  },
  em_homologacao_dir: {
    rotulo: 'Aguardando homologação',
    descricao: 'Risco Crítico com a Diretoria (3º degrau)',
    tom: 'aviso',
    icone: 'fa-solid fa-stamp',
  },
  aprovado: {
    rotulo: 'No Plano',
    descricao: 'Integrado ao Plano de Gestão de Riscos do ICMBio',
    tom: 'sucesso',
    icone: 'fa-solid fa-circle-check',
  },
  devolvido: {
    rotulo: 'Devolvido para ajuste',
    descricao: 'Veja o motivo no histórico da ficha',
    tom: 'perigo',
    icone: 'fa-solid fa-rotate-left',
  },
};

/**
 * Situação do risco frente à Declaração de Apetite a Riscos (DAR).
 * Lembrete normativo: "Crítico" = residual FORA do apetite da DAR.
 * Não confundir com o nível "Extremo" (18 a 25) do Quadro 8.
 */
export const ROTULOS_CRITICIDADE: Record<StatusCriticidadeDAR, RotuloComTom> = {
  sim: {
    rotulo: 'Crítico',
    descricao: 'Nível residual acima do apetite definido na DAR',
    tom: 'perigo',
    icone: 'fa-solid fa-triangle-exclamation',
  },
  nao: {
    rotulo: 'Dentro do apetite',
    descricao: 'Nível residual dentro do apetite definido na DAR',
    tom: 'sucesso',
    icone: 'fa-solid fa-circle-check',
  },
  pendente_dar: {
    rotulo: 'Apetite não definido',
    descricao: 'A categoria aguarda deliberação do CIG na DAR',
    tom: 'aviso',
    icone: 'fa-solid fa-clock',
  },
};

/**
 * Ícone de cada nível do Quadro 8. Cada nível tem um ícone de FORMA diferente,
 * para que daltônicos (e o modo alto contraste) consigam distinguir os níveis
 * sem depender da cor (WCAG 1.4.1).
 */
export const ICONES_CLASSE_RISCO: Record<ClasseRisco, string> = {
  Baixo: 'fa-solid fa-arrow-down',
  Médio: 'fa-solid fa-minus',
  Alto: 'fa-solid fa-arrow-up',
  Extremo: 'fa-solid fa-triangle-exclamation',
};

/** Sufixo CSS de cada nível, usado para montar `var(--risco-<sufixo>-fundo)`. */
export const SUFIXO_CSS_CLASSE_RISCO: Record<ClasseRisco, string> = {
  Baixo: 'baixo',
  Médio: 'medio',
  Alto: 'alto',
  Extremo: 'extremo',
};

/**
 * Formata um nível numérico no padrão brasileiro (vírgula decimal).
 * IMPORTANTE: só FORMATA para exibição; não arredonda o valor usado na
 * classificação. Ex.: 10.2 → "10,2"; 22 → "22"; 13.5 → "13,5".
 */
export function formatarNivel(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Formata uma data ISO (`2026-11-09T14:32:00Z`) como "09/11/2026 14:32". */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Nome por extenso de cada tipo de unidade (CHECK de `unidades.tipo` no banco). */
export const ROTULOS_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  presidencia: 'Presidência',
  diretoria: 'Diretoria',
  'coordenacao-geral': 'Coordenação-Geral',
  'gerencia-regional': 'Gerência Regional',
  coordenacao: 'Coordenação',
  'centro-pesquisa': 'Centro de Pesquisa',
  ngi: 'Núcleo de Gestão Integrada',
  uc: 'Unidade de Conservação',
  'coordenacao-territorial': 'Coordenação Territorial',
  'coordenacao-assessoramento': 'Coordenação de Assessoramento',
  'orgao-assistencia': 'Órgão de Assistência',
  gabinete: 'Gabinete',
  divisao: 'Divisão',
  servico: 'Serviço',
  setor: 'Setor',
  'base-avancada': 'Base Avançada',
};

/** Texto de cada ação registrada no histórico do fluxo de uma ficha. */
export const ROTULOS_ACAO_HISTORICO: Record<HistoricoFluxoItem['acao'], string> = {
  submetido: 'Enviado para validação',
  assumido: 'Risco preliminar assumido pela unidade',
  validado: 'Validado pela chefia',
  validado_e_homologado: 'Validado e homologado',
  homologado: 'Homologado',
  devolvido_ajuste: 'Devolvido para ajuste',
  reaberto_mudanca_nota: 'Reaberto por alteração na ficha',
  reaberto_mudanca_dar: 'Reaberto por mudança na DAR',
  devolvido_mudanca_dar: 'Devolvido por mudança na DAR',
  aprovado_1_clique: 'Aprovado em 1 clique',
};
