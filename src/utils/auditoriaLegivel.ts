/**
 * ============================================================================
 * AUDITORIA LEGÍVEL (`src/utils/auditoriaLegivel.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O banco guarda cada alteração como uma linha "crua": tabela, operação
 * (INSERT/UPDATE/DELETE) e os valores de antes e de depois em JSON. Quem audita
 * quer ler uma frase, não JSON. Estas funções (puras, sem tela e sem banco)
 * fazem a tradução:
 *
 *   { tabela: 'controles_existentes', operacao: 'UPDATE', codigoRadar: 'RADAR-2026-003', ... }
 *     → "Controle do risco RADAR-2026-003 alterado"
 *
 *   { tabela: 'riscos', operacao: 'UPDATE', anteriores: { status_critico: 'nao' },
 *     novos: { status_critico: 'sim' } }
 *     → "Risco RADAR-2026-003 recalculado pela DAR" (mudou só campo calculado:
 *       ninguém "editou" o risco, o RADAR recalculou depois de a DAR mudar).
 */
import type { EventoAuditoria } from '../services/dados/tipos';
import { soCamposCalculadosMudaram } from '../services/dados/conversores';

export interface MudancaLegivel {
  campo: string;
  antes: string;
  depois: string;
}

export interface EventoLegivel {
  titulo: string;
  mudancas: MudancaLegivel[];
  /** true = o risco só foi recalculado pelo RADAR (efeito da DAR), ninguém o editou. */
  recalculadoPelaDar: boolean;
}

/** Quem aparece quando a alteração veio direto do banco (sem usuário). */
export const QUEM_SISTEMA = 'Sistema/administrador';

/** "Quem fez": o nome do usuário ou "Sistema/administrador" quando não há. */
export function quemFez(e: Pick<EventoAuditoria, 'quemNome'>): string {
  return e.quemNome?.trim() ? e.quemNome : QUEM_SISTEMA;
}

// ---------------------------------------------------------------------------
// DICIONÁRIOS
// ---------------------------------------------------------------------------

/** Nome legível de cada tabela auditada + o gênero (para "criado"/"criada"). */
const TABELAS: Record<string, { nome: string; feminino: boolean }> = {
  riscos: { nome: 'Risco', feminino: false },
  categorias_risco: { nome: 'Categoria', feminino: true },
  perfis_usuarios: { nome: 'Perfil', feminino: false },
  objetos_contexto: { nome: 'Objeto de gestão', feminino: false },
  controles_existentes: { nome: 'Controle', feminino: false },
  respostas_tratamento: { nome: 'Resposta ao risco', feminino: true },
  indicadores_kri: { nome: 'Indicador-chave de risco (KRI)', feminino: false },
  // LAC-03: a ligação de um KRI do objeto a cada risco que ele acompanha.
  kri_riscos: { nome: 'Ligação do KRI ao risco', feminino: true },
  medicoes_kri: { nome: 'Medição de KRI', feminino: true },
  historico_fluxo: { nome: 'Passo do fluxo', feminino: false },
};

/** Opções do filtro "Tabela" da tela (valor do banco → rótulo). */
export const ROTULOS_TABELA: Record<string, string> = {
  riscos: 'Riscos',
  categorias_risco: 'Categorias e DAR',
  perfis_usuarios: 'Perfis de usuário',
  objetos_contexto: 'Objetos de gestão',
  controles_existentes: 'Controles',
  respostas_tratamento: 'Respostas ao risco',
  indicadores_kri: 'Indicadores (KRI)',
  kri_riscos: 'Ligações de KRI a riscos',
  medicoes_kri: 'Medições de KRI',
  historico_fluxo: 'Fluxo de aprovação',
};

/** Nomes legíveis dos campos. Campo que não está aqui → nome da coluna sem "_". */
const CAMPOS: Record<string, string> = {
  nome: 'Nome',
  causas: 'Causas',
  consequencias: 'Consequências',
  descricao: 'Descrição',
  evento_risco: 'Evento de risco',
  probabilidade: 'Probabilidade',
  impacto: 'Impacto',
  nivel_inerente: 'Risco inerente',
  nivel_residual: 'Risco residual',
  classificacao_residual: 'Classificação do residual',
  status_critico: 'Crítico (fora do apetite)',
  status_fluxo: 'Situação no fluxo',
  apetite_declarado: 'Apetite',
  justificativa_dar: 'Justificativa na DAR',
  eficacia: 'Eficácia',
  possui_evidencia: 'Possui evidência',
  papel: 'Papel',
  ativo: 'Ativo',
  etapa: 'Etapa',
  acao: 'Ação',
  despacho_texto: 'Despacho',
  valor: 'Valor',
  atualizado_em: 'Atualizado em',
};

/** Colunas de controle que só atrapalham a leitura. */
const CAMPOS_IGNORADOS = new Set(['id', 'criado_em', 'atualizado_em']);

const VERBO: Record<EventoAuditoria['operacao'], [string, string]> = {
  INSERT: ['criado', 'criada'],
  UPDATE: ['alterado', 'alterada'],
  DELETE: ['removido', 'removida'],
};

// ---------------------------------------------------------------------------
// AJUDANTES
// ---------------------------------------------------------------------------

/** Ex.: 'status_critico' → "Crítico (fora do apetite)"; 'campo_novo' → "campo novo". */
export function nomeLegivelDoCampo(coluna: string): string {
  return CAMPOS[coluna] ?? coluna.replace(/_/g, ' ');
}

/** Valor em texto: vazio → "—", booleano → Sim/Não, lista → itens separados por vírgula. */
export function valorLegivel(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.length ? v.map(valorLegivel).join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Como a tabela é citada no título: com o código RADAR, ou com o nome (categorias, perfis...). */
function referencia(e: EventoAuditoria): string {
  if (e.codigoRadar) return e.codigoRadar;
  const base = e.novos ?? e.anteriores;
  const nome = base?.nome;
  return typeof nome === 'string' ? nome : '';
}

function listarMudancas(e: EventoAuditoria): MudancaLegivel[] {
  const antes = e.anteriores ?? {};
  const depois = e.novos ?? {};
  const colunas = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].filter(
    (c) => !CAMPOS_IGNORADOS.has(c)
  );
  return colunas
    .filter((c) => e.operacao !== 'UPDATE' || JSON.stringify(antes[c]) !== JSON.stringify(depois[c]))
    .map((c) => ({ campo: nomeLegivelDoCampo(c), antes: valorLegivel(antes[c]), depois: valorLegivel(depois[c]) }));
}

// ---------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL
// ---------------------------------------------------------------------------

/**
 * Transforma uma linha da auditoria em título + lista de mudanças.
 *
 * Exemplos:
 *   - "Controle do risco RADAR-2026-003 alterado"
 *   - "Risco RADAR-2026-003 criado"
 *   - "Apetite da categoria Integridade alterado"
 *   - "Risco RADAR-2026-003 recalculado pela DAR"
 */
export function descreverEvento(e: EventoAuditoria): EventoLegivel {
  const mudancas = listarMudancas(e);
  const recalculadoPelaDar =
    e.tabela === 'riscos' && e.operacao === 'UPDATE' && soCamposCalculadosMudaram(e.anteriores, e.novos);
  const ref = referencia(e);
  const [masc, fem] = VERBO[e.operacao];

  let titulo: string;
  if (recalculadoPelaDar) {
    titulo = `Risco ${ref} recalculado pela DAR`;
  } else if (e.tabela === 'categorias_risco') {
    // Na DAR, quase sempre o que muda é o apetite; só a justificativa tem título próprio.
    const soJustificativa =
      e.operacao === 'UPDATE' && mudancas.length > 0 && mudancas.every((m) => m.campo === CAMPOS.justificativa_dar);
    if (e.operacao !== 'UPDATE') titulo = `Categoria ${ref} ${fem}`;
    else if (soJustificativa) titulo = `Justificativa da categoria ${ref} ${fem}`;
    else titulo = `Apetite da categoria ${ref} ${masc}`;
  } else if (e.tabela === 'riscos') {
    titulo = `Risco ${ref} ${masc}`;
  } else if (e.tabela === 'historico_fluxo') {
    titulo = `Passo do fluxo no risco ${ref} registrado`;
  } else if (e.tabela === 'perfis_usuarios') {
    titulo = `Perfil de ${ref || 'usuário'} ${masc}`;
  } else if (e.tabela === 'objetos_contexto') {
    titulo = `Objeto de gestão ${ref} ${masc}`;
  } else if (e.tabela === 'kri_riscos') {
    // O nome já termina em "ao risco": "Ligação do KRI ao risco RADAR-2026-003 criada"
    // (e não "Ligação do KRI ao risco do risco ...").
    titulo = ref ? `${TABELAS.kri_riscos.nome} ${ref} ${fem}` : `${TABELAS.kri_riscos.nome} ${fem}`;
  } else {
    const t = TABELAS[e.tabela];
    const nome = t?.nome ?? e.tabela.replace(/_/g, ' ');
    const verbo = (t?.feminino ?? false) ? fem : masc;
    // "Controle do risco RADAR-2026-003 alterado"
    titulo = ref ? `${nome} do risco ${ref} ${verbo}` : `${nome} ${verbo}`;
  }
  return { titulo: titulo.trim(), mudancas, recalculadoPelaDar };
}
