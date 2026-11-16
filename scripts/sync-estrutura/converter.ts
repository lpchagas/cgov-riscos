/**
 * CONVERSOR DAS LISTAS DO SHAREPOINT PARA O FORMATO DO RADAR (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * As linhas lidas do CSV são "texto cru" com os nomes de colunas do SharePoint.
 * Este módulo transforma esse texto nos objetos que o banco do RADAR entende:
 *
 *   linha do SharePoint                       →  UnidadeImportada
 *   { tipo: 'Núcleo de Gestão Integrada',     →  { tipo: 'ngi',
 *     status: 'Ativo', id_mae: '23.1000' }        ativa: true, id_mae: '23.1000' }
 *
 * Também "limpa" a lista, conforme a seção 7.2 do desenho da etapa B1:
 *  - o "Comitê Gestor" é um colegiado (não é unidade) e fica de fora;
 *  - as unidades sem tipo recebem o tipo deduzido pela tabela CORRESPONDENCIA_TIPOS;
 *  - as unidades com mãe inexistente (ou sem mãe) são ligadas ao "pai do grupo"
 *    (microgrupo ou mesogrupo) e listadas como aviso no relatório;
 *  - ciclos na árvore (A é mãe de B, que é mãe de A) são RECUSADOS com erro;
 *    a unidade que é "mãe de si mesma" é tratada como mãe inválida (aviso);
 *  - o microgrupo "CT ..." vira o vínculo com a Coordenação Territorial
 *    (decisão R9 em decisoes-tecnicas-b1.md), separado da mãe.
 *
 * Nada aqui fala com o banco: são funções "puras", fáceis de testar.
 * ============================================================================
 */

/**
 * Os 16 tipos de unidade aceitos pelo banco (CHECK `unidades_tipo_check`,
 * migração 20261115001). O tipo `TipoUnidade` do front-end (src/types) ainda
 * tem só os 8 originais, por isso este tipo fica aqui, junto do importador.
 */
export type TipoUnidadeBanco =
  | 'presidencia'
  | 'diretoria'
  | 'coordenacao-geral'
  | 'gerencia-regional'
  | 'coordenacao'
  | 'centro-pesquisa'
  | 'ngi'
  | 'uc'
  | 'coordenacao-territorial'
  | 'coordenacao-assessoramento'
  | 'orgao-assistencia'
  | 'gabinete'
  | 'divisao'
  | 'servico'
  | 'setor'
  | 'base-avancada';

/** Uma unidade pronta para ir ao banco (chave natural: `icmbio_id`). */
export interface UnidadeImportada {
  icmbio_id: string;
  /** `icmbio_id` da unidade-mãe já resolvido (ou null para a raiz). */
  id_mae: string | null;
  sigla: string | null;
  nome: string;
  nome_completo: string | null;
  tipo: TipoUnidadeBanco;
  hierarquia: string | null;
  /** GR de vínculo (ex.: 'GR1'), tirada do mesogrupo/microgrupo. */
  grupo_regional: string | null;
  /**
   * `icmbio_id` da Coordenação Territorial de vínculo (decisão R9 em decisoes-tecnicas-b1.md), tirado do
   * microgrupo "CT ..." — ou null. Não é a mãe: a árvore continua em `id_mae`.
   * O nome segue o padrão "snake_case" dos outros campos porque este objeto
   * vai direto, sem tradução, para a função SQL `sincronizar_estrutura`.
   */
  coordenacao_territorial_icmbio_id: string | null;
  ativa: boolean;
}

/** Um processo da Cadeia de Valor pronto para ir ao banco (chave: `proc_id`). */
export interface ProcessoImportado {
  proc_id: string;
  nome: string;
  macro_id: string | null;
  macroprocesso: string | null;
  proc_tipo: string | null;
  /** `icmbio_id` da unidade líder. */
  lider_icmbio_id: string | null;
  /** `icmbio_id` da unidade supervisora (resolvida pela sigla). */
  supervisor_icmbio_id: string | null;
  ativo: boolean;
}

// ----------------------------------------------------------------------------
// 1. TIPOS
// ----------------------------------------------------------------------------

/**
 * Tipo escrito na lista do SharePoint → tipo do RADAR.
 * A grafia "Assesoria" (com um "s") é a que aparece na lista real.
 */
export const TIPOS_SHAREPOINT: Record<string, TipoUnidadeBanco> = {
  'Presidência': 'presidencia',
  'Diretoria': 'diretoria',
  'Coordenação-Geral': 'coordenacao-geral',
  'Gerência Regional': 'gerencia-regional',
  'Coordenação': 'coordenacao',
  'Centro Nacional de Pesquisa': 'centro-pesquisa',
  'Núcleo de Gestão Integrada': 'ngi',
  'Unidade de Conservação': 'uc',
  'Coordenação Territorial': 'coordenacao-territorial',
  'Gabinete': 'gabinete',
  'Divisão': 'divisao',
  'Serviço': 'servico',
  'Setor': 'setor',
  'Base Avançada': 'base-avancada',
  // Órgãos de assistência direta à Presidência:
  'Assesoria da Presidência': 'orgao-assistencia',
  'Assessoria da Presidência': 'orgao-assistencia',
  'Procuradoria Federal Especializada': 'orgao-assistencia',
  'Auditoria Interna': 'orgao-assistencia',
  'Corregedoria': 'orgao-assistencia',
  'Ouvidoria': 'orgao-assistencia',
};

/** Uma regra para deduzir o tipo de uma unidade que veio com `tipo` vazio. */
export interface RegraCorrespondencia {
  /** Explicação curta, usada no relatório (ex.: "nome começa com categoria de UC"). */
  descricao: string;
  /** Teste aplicado ao nome da unidade (`uorg_nome`). */
  padraoNome: RegExp;
  tipo: TipoUnidadeBanco;
}

/**
 * TABELA DE CORRESPONDÊNCIA DOS TIPOS VAZIOS
 *
 * Montada lendo a lista real (15/11/2026): das 216 linhas sem tipo, 215 são
 * Unidades de Conservação vinculadas a um NGI ou a uma GR, cujo nome começa pela
 * categoria do SNUC (ex.: "PARNA ...", "RESEX ...", "FLONA ..."); a 216ª é o
 * Comitê Gestor, que fica de fora. As demais regras não casam com nenhuma linha
 * hoje, mas cobrem os prefixos que a lista usa para as unidades internas
 * ("Div.", "Serv.", "Coord.", "BAV" ...), caso apareçam sem tipo no futuro.
 *
 * A ORDEM IMPORTA: vale a primeira regra que casar. Exemplo:
 * "ICMBio Chico Mendes - BAV em Brasiléia" casa com a regra da Base Avançada
 * antes de chegar à regra do NGI ("ICMBio ...").
 */
export const CORRESPONDENCIA_TIPOS: RegraCorrespondencia[] = [
  {
    descricao: 'nome começa com categoria de UC (APA, ARIE, ESEC, FLONA, MONA, PARNA, REBIO, RDS, RESEX, RVS, REVIS)',
    padraoNome: /^(APA|ARIE|ESEC|FLONA|MONA|PARNA|REBIO|RDS|RESEX|RVS|REVIS)\b/,
    tipo: 'uc',
  },
  { descricao: 'nome com "BAV" ou "Base Avançada"', padraoNome: /\bBAV\b|Base Avançada/i, tipo: 'base-avancada' },
  { descricao: 'nome começa com "Div." ou "Divisão"', padraoNome: /(^|\s-\s)(Div\.|Divisão)/i, tipo: 'divisao' },
  { descricao: 'nome começa com "Serv." ou "Serviço"', padraoNome: /(^|\s-\s)(Serv\.|Serviço)/i, tipo: 'servico' },
  { descricao: 'nome começa com "Setor"', padraoNome: /(^|\s-\s)Setor\b/i, tipo: 'setor' },
  { descricao: 'nome começa com "Coordenação-Geral"', padraoNome: /^Coordenação-Geral/i, tipo: 'coordenacao-geral' },
  {
    descricao: 'nome começa com "Coord.", "Cord." ou "Coordenação"',
    padraoNome: /^(Coord\.|Cord\.|Coordenação)/i,
    tipo: 'coordenacao',
  },
  { descricao: 'nome começa com "NGI" ou "ICMBio " (Núcleo de Gestão Integrada)', padraoNome: /^(NGI\b|ICMBio\s)/, tipo: 'ngi' },
];

/**
 * Diz se a linha é o Comitê Gestor (colegiado) ou não tem `icmbio_id`.
 * Essas linhas não são unidades e ficam de fora do RADAR.
 */
export function ehLinhaIgnorada(linha: Record<string, string>): boolean {
  const semId = !(linha.icmbio_id ?? '').trim();
  const ehComite = /^Comit[êe]\b/i.test((linha.uorg_nome ?? '').trim());
  return semId || ehComite;
}

/** Procura a regra de CORRESPONDENCIA_TIPOS que casa com o nome (ou undefined). */
export function regraParaNome(nome: string): RegraCorrespondencia | undefined {
  return CORRESPONDENCIA_TIPOS.find((regra) => regra.padraoNome.test(nome.trim()));
}

/**
 * Converte o tipo da lista do SharePoint para o tipo do RADAR.
 *
 * - Comitê Gestor / linha sem `icmbio_id` → null (fica de fora).
 * - Tipo conhecido → valor de TIPOS_SHAREPOINT.
 * - Tipo vazio (ou desconhecido) → deduzido por CORRESPONDENCIA_TIPOS; se
 *   nenhuma regra casar, devolve null e a unidade é contada como "sem tipo".
 *
 * Exemplo: converterTipo('', { uorg_nome: 'PARNA da Tijuca', icmbio_id: '21.1' }) → 'uc'
 */
export function converterTipo(
  tipoSharepoint: string,
  linha: Record<string, string>
): TipoUnidadeBanco | null {
  if (ehLinhaIgnorada(linha)) return null;
  const conhecido = TIPOS_SHAREPOINT[(tipoSharepoint ?? '').trim()];
  if (conhecido) return conhecido;
  return regraParaNome(linha.uorg_nome ?? '')?.tipo ?? null;
}

// ----------------------------------------------------------------------------
// 2. ÁRVORE DE UNIDADES
// ----------------------------------------------------------------------------

/** Devolve o texto sem espaços nas pontas, ou null se ficar vazio. */
function textoOuNulo(valor: string | undefined): string | null {
  const limpo = (valor ?? '').trim();
  return limpo === '' ? null : limpo;
}

/**
 * Extrai a GR de vínculo dos campos de grupo.
 * Exemplos: 'UC na GR1' → 'GR1'; 'GR2 Sede' → 'GR2'; 'DIBIO' → null.
 */
function extrairGrupoRegional(linha: Record<string, string>): string | null {
  for (const campo of [linha.mesogrupo, linha.microgrupo]) {
    const achado = /\bGR\d+\b/.exec(campo ?? '');
    if (achado) return achado[0];
  }
  return null;
}

/** Resultado da montagem da árvore. */
export interface ResultadoArvore {
  unidades: UnidadeImportada[];
  /** Avisos para o relatório (mães inexistentes, unidades sem tipo, ids repetidos). */
  avisos: string[];
  /** Linhas deixadas de fora de propósito (Comitê Gestor, linha sem icmbio_id). */
  ignoradas: string[];
  /** Unidades que ficaram sem tipo (objetivo: zero). Não entram no banco. */
  semTipo: string[];
  /** Quantas unidades tiveram o tipo deduzido por cada regra de CORRESPONDENCIA_TIPOS. */
  tiposDeduzidos: Record<string, number>;
}

/**
 * Procura a unidade "pai do grupo" para uma unidade órfã.
 *
 * Tenta primeiro o microgrupo (ex.: 'CT Curitiba', a CT de vínculo) e depois o
 * mesogrupo (ex.: 'UC na GR2' → GR2; 'DIBIO'; 'Presidência' → raiz).
 * Só aceita quando a sigla aponta para UMA única unidade.
 */
function acharPaiDoGrupo(
  linha: Record<string, string>,
  unidades: UnidadeImportada[]
): UnidadeImportada | null {
  const candidatosDeGrupo: string[] = [];
  for (const grupo of [linha.microgrupo, linha.mesogrupo]) {
    const limpo = (grupo ?? '').trim();
    if (!limpo) continue;
    candidatosDeGrupo.push(limpo);
    const gr = /\bGR\d+\b/.exec(limpo);
    if (gr) candidatosDeGrupo.push(gr[0]);
  }

  for (const grupo of candidatosDeGrupo) {
    if (grupo === 'Presidência') {
      const raiz = unidades.filter((u) => u.tipo === 'presidencia');
      if (raiz.length === 1) return raiz[0];
      continue;
    }
    const mesmaSigla = unidades.filter(
      (u) => u.sigla === grupo && u.icmbio_id !== linha.icmbio_id.trim()
    );
    if (mesmaSigla.length === 1) return mesmaSigla[0];
  }
  return null;
}

/**
 * Monta a árvore de unidades a partir das linhas da lista de estrutura.
 *
 * Passos:
 *  1. converte cada linha (tipo, nomes, status) e separa as ignoradas e as sem tipo;
 *  2. resolve a mãe de cada unidade: se a `id_mae` não existe na lista (ou está
 *     vazia e a unidade não é a Presidência), usa o pai do grupo e gera 1 aviso;
 *  3. percorre a árvore de baixo para cima e lança erro se achar um ciclo.
 */
export function montarArvore(linhas: Record<string, string>[]): ResultadoArvore {
  const avisos: string[] = [];
  const ignoradas: string[] = [];
  const semTipo: string[] = [];
  const tiposDeduzidos: Record<string, number> = {};
  const unidades: UnidadeImportada[] = [];
  const linhaPorId = new Map<string, Record<string, string>>();

  // --- Passo 1: conversão linha a linha ---------------------------------------
  for (const linha of linhas) {
    const nome = (linha.uorg_nome ?? '').trim();
    if (ehLinhaIgnorada(linha)) {
      ignoradas.push(nome || '(linha sem nome)');
      continue;
    }
    const icmbioId = linha.icmbio_id.trim();
    if (linhaPorId.has(icmbioId)) {
      avisos.push(`icmbio_id repetido ${icmbioId} ("${nome}"): mantida só a primeira linha`);
      continue;
    }

    const tipoLista = (linha.tipo ?? '').trim();
    const tipo = converterTipo(tipoLista, linha);
    if (!tipo) {
      semTipo.push(`${icmbioId} "${nome}" (tipo na lista: "${tipoLista}")`);
      continue;
    }
    if (!TIPOS_SHAREPOINT[tipoLista]) {
      // O tipo foi deduzido por uma regra: contamos para o relatório.
      const regra = regraParaNome(nome);
      if (regra) tiposDeduzidos[regra.descricao] = (tiposDeduzidos[regra.descricao] ?? 0) + 1;
    }

    linhaPorId.set(icmbioId, linha);
    unidades.push({
      icmbio_id: icmbioId,
      id_mae: textoOuNulo(linha.id_mae), // provisório; resolvido no passo 2
      sigla: textoOuNulo(linha.sigla),
      nome,
      nome_completo: textoOuNulo(linha['uorg_nome-completo']),
      tipo,
      hierarquia: textoOuNulo(linha.hierarquia),
      grupo_regional: extrairGrupoRegional(linha),
      coordenacao_territorial_icmbio_id: null, // resolvido no passo 4
      ativa: (linha.status ?? '').trim().toLowerCase() !== 'inativo',
    });
  }

  // --- Passo 2: resolver a mãe -------------------------------------------------
  for (const unidade of unidades) {
    // Uma unidade que aponta para si mesma (id_mae = icmbio_id) é erro de
    // digitação na lista (a lista real de 15/11/2026 tem 1 caso). Tratamos como
    // mãe inválida (pai do grupo + aviso), e não como o ciclo do passo 3, que
    // envolve duas ou mais unidades e é recusado.
    const apontaParaSi = unidade.id_mae === unidade.icmbio_id;
    const maeExiste = unidade.id_mae !== null && !apontaParaSi && linhaPorId.has(unidade.id_mae);
    if (maeExiste) continue;
    // A Presidência (raiz da árvore) é a única que pode ficar sem mãe.
    if (unidade.id_mae === null && unidade.tipo === 'presidencia') continue;

    const motivo =
      unidade.id_mae === null
        ? 'sem id_mae'
        : apontaParaSi
          ? 'id_mae aponta para a própria unidade'
          : `mãe ${unidade.id_mae} inexistente na lista`;
    const pai = acharPaiDoGrupo(linhaPorId.get(unidade.icmbio_id)!, unidades);
    unidade.id_mae = pai ? pai.icmbio_id : null;
    avisos.push(
      pai
        ? `${unidade.icmbio_id} "${unidade.nome}": ${motivo} → ligada ao pai do grupo ${pai.icmbio_id} (${pai.sigla ?? pai.nome})`
        : `${unidade.icmbio_id} "${unidade.nome}": ${motivo} e pai do grupo não encontrado → fica sem mãe`
    );
  }

  // --- Passo 3: recusar ciclos -------------------------------------------------
  // Para cada unidade, subimos de mãe em mãe. Se voltarmos a uma unidade já vista
  // NESTE caminho, há um ciclo. `semCiclo` guarda as que já sabemos que chegam à
  // raiz, para não repetir o trabalho (a lista real tem ~840 unidades).
  const maePorId = new Map(unidades.map((u) => [u.icmbio_id, u.id_mae]));
  const semCiclo = new Set<string>();
  for (const unidade of unidades) {
    const caminho = new Set<string>();
    let atual: string | null = unidade.icmbio_id;
    while (atual !== null && !semCiclo.has(atual)) {
      if (caminho.has(atual)) throw new Error(`RADAR: ciclo na árvore em ${atual}`);
      caminho.add(atual);
      atual = maePorId.get(atual) ?? null;
    }
    caminho.forEach((id) => semCiclo.add(id));
  }

  // --- Passo 4: vínculo com a Coordenação Territorial (decisão R9 em decisoes-tecnicas-b1.md) -------------
  avisos.push(...vincularCoordenacoesTerritoriais(unidades, linhaPorId));

  return { unidades, avisos, ignoradas, semTipo, tiposDeduzidos };
}

// ----------------------------------------------------------------------------
// 2-A. VÍNCULO COM A COORDENAÇÃO TERRITORIAL (decisão R9 em decisoes-tecnicas-b1.md)
// ----------------------------------------------------------------------------

/**
 * Normaliza um nome para comparar sem ligar para maiúsculas e espaços.
 * Exemplo: '  CT   curitiba ' → 'ct curitiba'.
 */
function normalizarNome(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Sobe pela `id_mae` até o ancestral mais próximo do tipo gerencia-regional
 * (a própria unidade conta, se for uma GR). Devolve null se não houver.
 * Exemplo: UC → NGI → GR9 devolve a GR9. (Ciclos já foram recusados no passo 3.)
 */
function gerenciaRegionalDe(
  unidade: UnidadeImportada,
  unidadePorId: Map<string, UnidadeImportada>
): UnidadeImportada | null {
  let atual: UnidadeImportada | undefined = unidade;
  while (atual) {
    if (atual.tipo === 'gerencia-regional') return atual;
    atual = atual.id_mae ? unidadePorId.get(atual.id_mae) : undefined;
  }
  return null;
}

/**
 * Preenche `coordenacao_territorial_icmbio_id` de cada unidade a partir do
 * microgrupo e devolve os avisos.
 *
 * Por quê? Na lista real nenhuma UC tem a CT como mãe; o vínculo só aparece no
 * microgrupo. Exemplo:
 *   microgrupo 'CT Curitiba' → procura a unidade do tipo coordenacao-territorial
 *   cujo nome (uorg_nome) é 'CT Curitiba' → vínculo com o icmbio_id dela.
 *
 * - A própria CT (que às vezes tem o seu nome no microgrupo) não é vinculada a si.
 * - Se não houver CT com aquele nome, NENHUMA unidade é vinculada e sai UM aviso
 *   por microgrupo, com a contagem (ex.: "microgrupo 'CT Cuiabá' sem CT
 *   correspondente: 42 unidades sem vínculo") — um aviso por unidade afogaria o
 *   relatório.
 */
function vincularCoordenacoesTerritoriais(
  unidades: UnidadeImportada[],
  linhaPorId: Map<string, Record<string, string>>
): string[] {
  // Índice "nome normalizado → CT". Duas CTs com o mesmo nome seriam ambíguas:
  // nesse caso não vinculamos e avisamos (não chutamos).
  const ctsPorNome = new Map<string, UnidadeImportada[]>();
  for (const u of unidades) {
    if (u.tipo !== 'coordenacao-territorial') continue;
    const chave = normalizarNome(u.nome);
    ctsPorNome.set(chave, [...(ctsPorNome.get(chave) ?? []), u]);
  }

  // Contagem das unidades que ficaram sem vínculo, por texto do microgrupo.
  const unidadePorId = new Map(unidades.map((u) => [u.icmbio_id, u]));
  const avisosCtOutraGr: string[] = [];
  const semCorrespondente = new Map<string, number>();
  const ambiguos = new Map<string, number>();
  const somar = (mapa: Map<string, number>, chave: string) => mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  for (const unidade of unidades) {
    const microgrupo = (linhaPorId.get(unidade.icmbio_id)?.microgrupo ?? '').trim();
    if (!/^CT\s+(.+)$/i.test(microgrupo)) continue;

    const candidatas = ctsPorNome.get(normalizarNome(microgrupo)) ?? [];
    if (candidatas.length === 1) {
      const ct = candidatas[0];
      if (ct.icmbio_id === unidade.icmbio_id) continue;
      // P-B1-4: a CT precisa ser da MESMA Gerência Regional da unidade. Só
      // descartamos quando as DUAS GRs são conhecidas e diferentes; se um dos
      // lados não tem GR ancestral (ex.: unidade ligada direto à Presidência),
      // não dá para afirmar que é "outra GR" e o vínculo segue como antes.
      const grUnidade = gerenciaRegionalDe(unidade, unidadePorId);
      const grCt = gerenciaRegionalDe(ct, unidadePorId);
      if (grUnidade && grCt && grUnidade.icmbio_id !== grCt.icmbio_id) {
        avisosCtOutraGr.push(
          `vínculo com CT de outra GR ignorado: ${unidade.icmbio_id} "${unidade.nome}" (GR ${grUnidade.icmbio_id}) → CT ${ct.icmbio_id} "${ct.nome}" (GR ${grCt.icmbio_id})`
        );
        continue;
      }
      unidade.coordenacao_territorial_icmbio_id = ct.icmbio_id;
      continue;
    }
    // Nenhuma CT (ou mais de uma) com esse nome: fica sem vínculo.
    somar(candidatas.length === 0 ? semCorrespondente : ambiguos, microgrupo);
  }

  return [
    ...avisosCtOutraGr,
    ...[...semCorrespondente].map(
      ([grupo, n]) => `microgrupo '${grupo}' sem CT correspondente: ${n} unidades sem vínculo`
    ),
    ...[...ambiguos].map(
      ([grupo, n]) => `microgrupo '${grupo}' casa com mais de uma CT: ${n} unidades sem vínculo`
    ),
  ];
}

/** Uma CT e quantas unidades ficaram vinculadas a ela. */
export interface ResumoCt {
  icmbio_id: string;
  nome: string;
  unidades: number;
}

/**
 * Resume os vínculos de CT para o relatório do importador.
 *
 * `ctsSemUnidades` lista as CTs que não receberam nenhuma unidade — uma lacuna
 * que a CGOV precisa corrigir no SharePoint (preenchendo o microgrupo das UCs).
 * Só usa dados públicos (nome e código das CTs).
 */
export function resumirVinculosCt(unidades: UnidadeImportada[]): {
  totalCts: number;
  porCt: ResumoCt[];
  ctsSemUnidades: string[];
} {
  const porCt: ResumoCt[] = unidades
    .filter((u) => u.tipo === 'coordenacao-territorial')
    .map((ct) => ({
      icmbio_id: ct.icmbio_id,
      nome: ct.nome,
      unidades: unidades.filter((u) => u.coordenacao_territorial_icmbio_id === ct.icmbio_id).length,
    }));
  return {
    totalCts: porCt.length,
    porCt,
    ctsSemUnidades: porCt.filter((c) => c.unidades === 0).map((c) => c.nome),
  };
}

// ----------------------------------------------------------------------------
// 3. PROCESSOS DA CADEIA DE VALOR
// ----------------------------------------------------------------------------

/**
 * Tipos de unidade preferidos para o SUPERVISOR de um processo. Na lista da
 * Cadeia de Valor o supervisor vem como sigla (ex.: "GABIN", "CGGE"), mas a
 * mesma sigla pode se repetir na árvore; então olhamos primeiro estes tipos.
 */
const TIPOS_SUPERVISOR: TipoUnidadeBanco[] = [
  'diretoria',
  'coordenacao-geral',
  'gabinete',
  'presidencia',
  'orgao-assistencia',
];

/**
 * Resolve a sigla do supervisor para um `icmbio_id`.
 * 1º) entre as unidades dos TIPOS_SUPERVISOR (se houver mais de uma, fica a ativa);
 * 2º) se nenhuma desses tipos tiver a sigla, aceita uma unidade única de outro tipo.
 * Ambíguo ou não encontrado → null (o chamador registra o aviso; nunca chuta).
 */
function resolverSupervisor(
  sigla: string,
  unidades: UnidadeImportada[]
): { icmbioId: string | null; problema?: string } {
  const candidatas = unidades.filter((u) => (u.sigla ?? '').toUpperCase() === sigla.toUpperCase());
  let preferidas = candidatas.filter((u) => TIPOS_SUPERVISOR.includes(u.tipo));
  if (preferidas.length > 1) preferidas = preferidas.filter((u) => u.ativa);
  if (preferidas.length === 1) return { icmbioId: preferidas[0].icmbio_id };
  if (preferidas.length > 1) return { icmbioId: null, problema: `sigla ambígua (${preferidas.length} unidades)` };
  if (candidatas.length === 1) return { icmbioId: candidatas[0].icmbio_id };
  if (candidatas.length > 1) return { icmbioId: null, problema: `sigla ambígua (${candidatas.length} unidades)` };
  return { icmbioId: null, problema: 'sigla não encontrada na estrutura' };
}

/**
 * Converte as linhas da lista da Cadeia de Valor em processos.
 *
 * - `icmbio_id` é o da unidade LÍDER. Alguns processos têm mais de um líder
 *   ("10.2011; 10.2012"): usamos o primeiro que existe na árvore e avisamos.
 * - `supervisor` é uma sigla (ver resolverSupervisor).
 * - Todo processo presente na lista entra como ativo; os que sumirem da lista
 *   são desativados pelo comparador. A coluna `Situacao` (vazia em alguns) não
 *   decide nada nesta etapa.
 */
export function converterProcessos(
  linhas: Record<string, string>[],
  unidades: UnidadeImportada[]
): { processos: ProcessoImportado[]; avisos: string[] } {
  const avisos: string[] = [];
  const processos: ProcessoImportado[] = [];
  const idsUnidades = new Set(unidades.map((u) => u.icmbio_id));
  const vistos = new Set<string>();

  for (const linha of linhas) {
    const procId = (linha.proc_id ?? '').trim();
    if (!procId) {
      avisos.push(`processo sem proc_id ("${(linha.proc ?? '').trim()}"): ignorado`);
      continue;
    }
    if (vistos.has(procId)) {
      avisos.push(`proc_id repetido ${procId}: mantida só a primeira linha`);
      continue;
    }
    vistos.add(procId);

    // Líder: um ou mais icmbio_id separados por ";" ou ",".
    const lideres = (linha.icmbio_id ?? '')
      .split(/[;,]/)
      .map((id) => id.trim())
      .filter(Boolean);
    const liderNaArvore = lideres.find((id) => idsUnidades.has(id)) ?? null;
    if (lideres.length > 1) {
      avisos.push(
        `processo ${procId}: ${lideres.length} unidades líderes (${lideres.join('; ')}) → usada ${liderNaArvore ?? 'nenhuma'}`
      );
    } else if (lideres.length === 1 && !liderNaArvore) {
      avisos.push(`processo ${procId}: líder ${lideres[0]} não existe na estrutura → fica sem líder`);
    } else if (lideres.length === 0) {
      avisos.push(`processo ${procId}: sem unidade líder`);
    }

    // Supervisor: sigla.
    const siglaSupervisor = (linha.supervisor ?? '').trim();
    let supervisor: string | null = null;
    if (siglaSupervisor) {
      const resolvido = resolverSupervisor(siglaSupervisor, unidades);
      supervisor = resolvido.icmbioId;
      if (resolvido.problema) {
        avisos.push(`processo ${procId}: supervisor "${siglaSupervisor}" — ${resolvido.problema} → fica sem supervisor`);
      }
    } else {
      avisos.push(`processo ${procId}: sem supervisor na lista`);
    }

    processos.push({
      proc_id: procId,
      nome: (linha.proc ?? '').trim(),
      macro_id: textoOuNulo(linha.macro_id),
      macroprocesso: textoOuNulo(linha.macroprocesso),
      proc_tipo: textoOuNulo(linha.proc_tipo),
      lider_icmbio_id: liderNaArvore,
      supervisor_icmbio_id: supervisor,
      ativo: true,
    });
  }

  return { processos, avisos };
}
