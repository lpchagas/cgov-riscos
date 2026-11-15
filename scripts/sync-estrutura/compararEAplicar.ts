/**
 * COMPARAR COM O BANCO E APLICAR AS MUDANÇAS (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Antes de mexer no banco, o importador mostra À CGOV o que vai mudar. Esse
 * "relatório" separa as unidades em listas:
 *
 *   novas         → estão na lista do SharePoint e ainda não no banco
 *   renomeadas    → o nome mudou
 *   mudaramDeMae  → a unidade-mãe mudou (reestruturação)
 *   mudaramDeCt   → mudou a Coordenação Territorial de vínculo (decisão R9 em decisoes-tecnicas-b1.md)
 *   desativadas   → viraram 'Inativo' na lista OU sumiram da lista
 *   reativadas    → estavam inativas no banco e voltaram a 'Ativo'
 *   outrasMudancas→ mudou só sigla, tipo, hierarquia, nome completo ou GR
 *   semMudanca    → nada mudou (reexecutar o importador não muda nada)
 *
 * Uma mesma unidade pode aparecer em mais de uma lista (ex.: renomeada E
 * mudou de mãe). Só depois da confirmação, `aplicar` grava no banco, numa
 * única transação (função SQL `sincronizar_estrutura`):
 *  - faz "upsert" (insere se não existe, atualiza se existe) pela chave natural
 *    `icmbio_id` (unidades) e `proc_id` (processos);
 *  - NUNCA apaga linhas: o que sumiu da lista fica com `ativa = false`, para
 *    que riscos e histórico continuem visíveis (Política, art. 15, VI).
 * ============================================================================
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProcessoImportado, UnidadeImportada } from './converter';

/** Uma unidade como está hoje no banco (mesmo formato da importada). */
export type UnidadeExistente = UnidadeImportada;

/** Um processo como está hoje no banco (mesmo formato do importado). */
export type ProcessoExistente = ProcessoImportado;

/** O "antes e depois" de uma linha que mudou. */
export interface Mudanca<T> {
  antes: T;
  depois: T;
}

/** Relatório dos processos da Cadeia de Valor. */
export interface RelatorioProcessos {
  novos: ProcessoImportado[];
  alterados: Mudanca<ProcessoImportado>[];
  desativados: ProcessoImportado[];
  semMudanca: ProcessoImportado[];
}

/** Relatório das unidades (e, opcionalmente, dos processos). */
export interface Relatorio {
  novas: UnidadeImportada[];
  renomeadas: Mudanca<UnidadeImportada>[];
  mudaramDeMae: Mudanca<UnidadeImportada>[];
  /** Mudou o vínculo com a Coordenação Territorial (microgrupo "CT ..."). */
  mudaramDeCt: Mudanca<UnidadeImportada>[];
  /** Estado FINAL (já com `ativa = false`). */
  desativadas: UnidadeImportada[];
  reativadas: UnidadeImportada[];
  outrasMudancas: Mudanca<UnidadeImportada>[];
  semMudanca: UnidadeImportada[];
  processos?: RelatorioProcessos;
}

// ----------------------------------------------------------------------------
// 1. COMPARAÇÃO (funções puras, sem banco)
// ----------------------------------------------------------------------------

/** Campos "descritivos" que, se mudarem, vão para `outrasMudancas`. */
const OUTROS_CAMPOS: (keyof UnidadeImportada)[] = [
  'sigla',
  'tipo',
  'hierarquia',
  'nome_completo',
  'grupo_regional',
];

/**
 * Compara as unidades vindas da lista com as que já estão no banco.
 *
 * Exemplo: banco vazio → todas em `novas`; mesma lista de novo → todas em `semMudanca`.
 */
export function compararComBanco(
  importadas: UnidadeImportada[],
  existentes: UnidadeExistente[]
): Relatorio {
  const relatorio: Relatorio = {
    novas: [],
    renomeadas: [],
    mudaramDeMae: [],
    mudaramDeCt: [],
    desativadas: [],
    reativadas: [],
    outrasMudancas: [],
    semMudanca: [],
  };
  const existentePorId = new Map(existentes.map((u) => [u.icmbio_id, u]));
  const idsImportados = new Set<string>();

  for (const depois of importadas) {
    idsImportados.add(depois.icmbio_id);
    const antes = existentePorId.get(depois.icmbio_id);
    if (!antes) {
      relatorio.novas.push(depois);
      continue;
    }
    let mudou = false;
    if (antes.nome !== depois.nome) {
      relatorio.renomeadas.push({ antes, depois });
      mudou = true;
    }
    if (antes.id_mae !== depois.id_mae) {
      relatorio.mudaramDeMae.push({ antes, depois });
      mudou = true;
    }
    // `?? null`: tolera um estado antigo sem o campo (antes da decisão R9 em decisoes-tecnicas-b1.md).
    if ((antes.coordenacao_territorial_icmbio_id ?? null) !== depois.coordenacao_territorial_icmbio_id) {
      relatorio.mudaramDeCt.push({ antes, depois });
      mudou = true;
    }
    if (antes.ativa && !depois.ativa) {
      relatorio.desativadas.push(depois);
      mudou = true;
    }
    if (!antes.ativa && depois.ativa) {
      relatorio.reativadas.push(depois);
      mudou = true;
    }
    if (OUTROS_CAMPOS.some((campo) => antes[campo] !== depois[campo])) {
      relatorio.outrasMudancas.push({ antes, depois });
      mudou = true;
    }
    if (!mudou) relatorio.semMudanca.push(depois);
  }

  // Unidades do banco que sumiram da lista: desativadas (nunca apagadas).
  for (const antes of existentes) {
    if (idsImportados.has(antes.icmbio_id)) continue;
    if (antes.ativa) relatorio.desativadas.push({ ...antes, ativa: false });
    else relatorio.semMudanca.push(antes); // já estava inativa: nada a fazer
  }

  return relatorio;
}

/** Compara dois processos campo a campo. */
function processosIguais(a: ProcessoImportado, b: ProcessoImportado): boolean {
  return (Object.keys(a) as (keyof ProcessoImportado)[]).every((campo) => a[campo] === b[campo]);
}

/** Compara os processos da lista com os do banco (mesma lógica das unidades). */
export function compararProcessos(
  importados: ProcessoImportado[],
  existentes: ProcessoExistente[]
): RelatorioProcessos {
  const relatorio: RelatorioProcessos = { novos: [], alterados: [], desativados: [], semMudanca: [] };
  const existentePorId = new Map(existentes.map((p) => [p.proc_id, p]));
  const idsImportados = new Set<string>();

  for (const depois of importados) {
    idsImportados.add(depois.proc_id);
    const antes = existentePorId.get(depois.proc_id);
    if (!antes) relatorio.novos.push(depois);
    else if (processosIguais(antes, depois)) relatorio.semMudanca.push(depois);
    else relatorio.alterados.push({ antes, depois });
  }
  for (const antes of existentes) {
    if (idsImportados.has(antes.proc_id)) continue;
    if (antes.ativo) relatorio.desativados.push({ ...antes, ativo: false });
    else relatorio.semMudanca.push(antes);
  }
  return relatorio;
}

/**
 * Junta, sem repetir, todas as unidades que precisam ser gravadas
 * (novas + qualquer tipo de mudança). As `semMudanca` não são tocadas.
 */
export function unidadesParaGravar(relatorio: Relatorio): UnidadeImportada[] {
  const porId = new Map<string, UnidadeImportada>();
  const incluir = (u: UnidadeImportada) => porId.set(u.icmbio_id, u);
  relatorio.novas.forEach(incluir);
  relatorio.renomeadas.forEach((m) => incluir(m.depois));
  relatorio.mudaramDeMae.forEach((m) => incluir(m.depois));
  relatorio.mudaramDeCt.forEach((m) => incluir(m.depois));
  relatorio.outrasMudancas.forEach((m) => incluir(m.depois));
  relatorio.reativadas.forEach(incluir);
  relatorio.desativadas.forEach(incluir);
  return [...porId.values()];
}

/** Junta os processos que precisam ser gravados. */
export function processosParaGravar(relatorio: RelatorioProcessos): ProcessoImportado[] {
  return [...relatorio.novos, ...relatorio.alterados.map((m) => m.depois), ...relatorio.desativados];
}

/** Texto curto de uma unidade para o relatório: "23.1000 GR1 - Gerência Regional Norte". */
function rotulo(u: UnidadeImportada): string {
  return `${u.icmbio_id} ${u.nome}`;
}

/**
 * Monta o texto do relatório para mostrar no terminal.
 * Mostra a contagem de cada lista e até `limite` exemplos de cada uma.
 */
export function formatarRelatorio(relatorio: Relatorio, limite = 15): string {
  const linhas: string[] = ['=== RELATÓRIO DO IMPORTADOR (unidades) ==='];
  const secao = (titulo: string, itens: string[]) => {
    linhas.push(`${titulo}: ${itens.length}`);
    itens.slice(0, limite).forEach((item) => linhas.push(`   - ${item}`));
    if (itens.length > limite) linhas.push(`   ... e mais ${itens.length - limite}`);
  };
  secao('novas', relatorio.novas.map(rotulo));
  secao('renomeadas', relatorio.renomeadas.map((m) => `${m.antes.icmbio_id} "${m.antes.nome}" → "${m.depois.nome}"`));
  secao('mudaramDeMae', relatorio.mudaramDeMae.map((m) => `${rotulo(m.depois)}: ${m.antes.id_mae} → ${m.depois.id_mae}`));
  secao(
    'mudaramDeCt',
    relatorio.mudaramDeCt.map(
      (m) =>
        `${rotulo(m.depois)}: ${m.antes.coordenacao_territorial_icmbio_id ?? '(sem CT)'} → ${m.depois.coordenacao_territorial_icmbio_id ?? '(sem CT)'}`
    )
  );
  secao('desativadas', relatorio.desativadas.map(rotulo));
  secao('reativadas', relatorio.reativadas.map(rotulo));
  secao('outrasMudancas', relatorio.outrasMudancas.map((m) => rotulo(m.depois)));
  linhas.push(`semMudanca: ${relatorio.semMudanca.length}`);

  if (relatorio.processos) {
    const p = relatorio.processos;
    linhas.push('=== RELATÓRIO DO IMPORTADOR (processos da Cadeia de Valor) ===');
    secao('novos', p.novos.map((x) => `${x.proc_id} ${x.nome}`));
    secao('alterados', p.alterados.map((m) => `${m.depois.proc_id} ${m.depois.nome}`));
    secao('desativados', p.desativados.map((x) => `${x.proc_id} ${x.nome}`));
    linhas.push(`semMudanca: ${p.semMudanca.length}`);
  }
  return linhas.join('\n');
}

// ----------------------------------------------------------------------------
// 2. BANCO (leitura do estado atual e gravação)
// ----------------------------------------------------------------------------

/** Tamanho de cada página lida do banco. */
const TAMANHO_LOTE = 500;

/** Lê todas as linhas de uma tabela, página por página (a API limita a 1.000 por vez). */
async function lerTudo<T>(cliente: SupabaseClient, tabela: string, colunas: string): Promise<T[]> {
  const todas: T[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_LOTE) {
    const { data, error } = await cliente
      .from(tabela)
      .select(colunas)
      .order('id')
      .range(inicio, inicio + TAMANHO_LOTE - 1);
    if (error) throw new Error(`RADAR: erro ao ler ${tabela}: ${error.message}`);
    todas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAMANHO_LOTE) return todas;
  }
}

/** Linha da tabela `unidades` como vem do banco. */
interface LinhaUnidadeBanco {
  id: string;
  icmbio_id: string | null;
  sigla: string | null;
  nome: string;
  nome_completo: string | null;
  tipo: UnidadeImportada['tipo'];
  hierarquia: string | null;
  grupo_regional: string | null;
  ativa: boolean;
  unidade_pai_id: string | null;
  coordenacao_territorial_id: string | null;
}

/** Linha da tabela `processos_cadeia_valor` como vem do banco. */
interface LinhaProcessoBanco {
  id: string;
  proc_id: string;
  nome: string;
  macro_id: string | null;
  macroprocesso: string | null;
  proc_tipo: string | null;
  unidade_lider_id: string | null;
  unidade_supervisora_id: string | null;
  ativo: boolean;
}

/** Estado atual do banco, já no formato do importador. */
export interface EstadoBanco {
  unidades: UnidadeExistente[];
  processos: ProcessoExistente[];
}

/**
 * Lê o estado atual do banco e o traduz para o formato do importador
 * (troca os UUIDs internos pelos `icmbio_id`). Unidades sem `icmbio_id`
 * (criadas à mão, fora do importador) são ignoradas.
 */
export async function carregarEstadoBanco(cliente: SupabaseClient): Promise<EstadoBanco> {
  const linhasUnidades = await lerTudo<LinhaUnidadeBanco>(
    cliente,
    'unidades',
    'id, icmbio_id, sigla, nome, nome_completo, tipo, hierarquia, grupo_regional, ativa, unidade_pai_id, coordenacao_territorial_id'
  );
  const icmbioPorUuid = new Map(linhasUnidades.map((u) => [u.id, u.icmbio_id]));
  const deUuid = (uuid: string | null) => (uuid ? icmbioPorUuid.get(uuid) ?? null : null);

  const unidades: UnidadeExistente[] = linhasUnidades
    .filter((u) => u.icmbio_id)
    .map((u) => ({
      icmbio_id: u.icmbio_id as string,
      id_mae: deUuid(u.unidade_pai_id),
      sigla: u.sigla,
      nome: u.nome,
      nome_completo: u.nome_completo,
      tipo: u.tipo,
      hierarquia: u.hierarquia,
      grupo_regional: u.grupo_regional,
      coordenacao_territorial_icmbio_id: deUuid(u.coordenacao_territorial_id),
      ativa: u.ativa,
    }));

  const linhasProcessos = await lerTudo<LinhaProcessoBanco>(
    cliente,
    'processos_cadeia_valor',
    'id, proc_id, nome, macro_id, macroprocesso, proc_tipo, unidade_lider_id, unidade_supervisora_id, ativo'
  );
  const processos: ProcessoExistente[] = linhasProcessos.map((p) => ({
    proc_id: p.proc_id,
    nome: p.nome,
    macro_id: p.macro_id,
    macroprocesso: p.macroprocesso,
    proc_tipo: p.proc_tipo,
    lider_icmbio_id: deUuid(p.unidade_lider_id),
    supervisor_icmbio_id: deUuid(p.unidade_supervisora_id),
    ativo: p.ativo,
  }));

  return { unidades, processos };
}

/**
 * Grava no banco o que o relatório mandou mudar, numa ÚNICA transação.
 *
 * Em vez de várias chamadas à API (que, se uma falhasse no meio, deixariam o
 * banco pela metade), enviamos tudo de uma vez para a função SQL
 * `public.sincronizar_estrutura` (migração 20261115001). No PostgreSQL, uma
 * chamada de função é um único comando, e um comando é uma transação: ou grava
 * tudo, ou não grava nada. A função também faz as "duas passadas" das unidades
 * (primeiro os dados, depois a ligação com a mãe) e troca os `icmbio_id` pelos
 * UUIDs internos.
 *
 * Só vão no envio as linhas novas ou alteradas (as `semMudanca` ficam como estão).
 * Devolve quantas linhas foram gravadas.
 */
export async function aplicar(
  relatorio: Relatorio,
  cliente: SupabaseClient
): Promise<{ unidades: number; processos: number }> {
  const unidades = unidadesParaGravar(relatorio);
  const processos = relatorio.processos ? processosParaGravar(relatorio.processos) : [];
  if (unidades.length === 0 && processos.length === 0) return { unidades: 0, processos: 0 };

  const { data, error } = await cliente.rpc('sincronizar_estrutura', {
    p_unidades: unidades,
    p_processos: processos,
  });
  if (error) throw new Error(`RADAR: erro ao aplicar (nada foi gravado): ${error.message}`);
  const contagem = data as { unidades: number; processos: number };
  return { unidades: contagem.unidades, processos: contagem.processos };
}
