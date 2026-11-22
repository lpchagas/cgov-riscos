/**
 * ============================================================================
 * CONVERSORES BANCO ⇄ FRONT (`src/services/dados/conversores.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * O banco (PostgreSQL) dá nomes de coluna em "snake_case" (`nivel_residual`)
 * e usa `null` para "sem valor". O front (TypeScript) usa "camelCase"
 * (`nivelResidual`) e prefere "campo ausente" (`undefined`).
 *
 * Aqui ficam funções PURAS que traduzem de um lado para o outro:
 *   - recebem dados, devolvem dados (não chamam o banco nem mexem na tela);
 *   - por isso são fáceis de testar (tests/unit/conversores.spec.ts).
 *
 * Regra de ouro: estes conversores NÃO recalculam o risco. O que é calculado
 * (inerente, residual, classificação, criticidade) vem GRAVADO pelo banco e é
 * apenas copiado. E na volta (`fichaParaJson`) os campos calculados nunca vão.
 *
 * Exemplo:
 *   riscoDoBanco({ nivel_residual: 12, status_fluxo: 'aprovado', ... }, filhos)
 *     -> { nivelResidual: 12, statusFluxo: 'aprovado', ... }
 */
import type {
  AcoesFluxo,
  CategoriaRisco,
  ControleExistente,
  FichaRisco,
  HistoricoFluxoItem,
  IndicadorKri,
  MedicaoKri,
  ObjetoContexto,
  ProcessoCadeiaValor,
  RespostaTratamento5W2H,
  UnidadeOrganizacional,
} from '../../types/radar.types';
import type { LinhaImportadaSkill } from '../../utils/importadorSkillMarkdown';
import type { EventoAuditoria, EventoFluxo, FichaParaSalvar } from './tipos';

/** Uma linha qualquer vinda do banco (as chaves são os nomes das colunas). */
export type LinhaBanco = Record<string, unknown>;

// ---------------------------------------------------------------------------
// PEQUENOS AJUDANTES DE LEITURA
// ---------------------------------------------------------------------------
// Cada coluna pode chegar como texto, número, booleano ou null. Estes
// ajudantes dizem "o que fazer com o null" em um lugar só.

/** Texto obrigatório: null vira ''. */
const texto = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** Texto opcional: null vira undefined (campo "ausente" no front). */
const textoOpcional = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

/** Texto que pode ser null no front (ex.: `processoId: string | null`). */
const textoOuNulo = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

/**
 * Número. O PostgREST manda colunas `numeric` às vezes como texto ("12.00"):
 * `Number("12.00")` = 12. Ex.: nivel_residual "10.20" -> 10.2.
 */
const numero = (v: unknown): number => Number(v ?? 0);

const booleano = (v: unknown): boolean => v === true;

// ---------------------------------------------------------------------------
// LINHAS SIMPLES (unidade, categoria, processo, objeto)
// ---------------------------------------------------------------------------

/** Linha de `unidades` -> `UnidadeOrganizacional`. */
export function unidadeDoBanco(l: LinhaBanco): UnidadeOrganizacional {
  return {
    id: texto(l.id),
    sigla: texto(l.sigla),
    nome: texto(l.nome),
    tipo: texto(l.tipo) as UnidadeOrganizacional['tipo'],
    unidadePaiId: textoOpcional(l.unidade_pai_id),
    ativa: l.ativa !== false, // coluna NOT NULL DEFAULT true
  };
}

/**
 * Linha de `categorias_risco` -> `CategoriaRisco`.
 * (As subcategorias do Quadro 3 não vêm mais aqui: desde a migração
 * 20261122001 elas ficam na tabela `subcategorias_risco`.)
 */
export function categoriaDoBanco(l: LinhaBanco): CategoriaRisco {
  return {
    id: numero(l.id),
    nome: texto(l.nome),
    descricaoNormativa: texto(l.descricao_normativa),
    apetiteDeclarado: (textoOpcional(l.apetite_declarado) ?? 'pendente_dar') as CategoriaRisco['apetiteDeclarado'],
    justificativaDar: texto(l.justificativa_dar),
  };
}

/** Linha de `processos_cadeia_valor` -> `ProcessoCadeiaValor`. */
export function processoDoBanco(l: LinhaBanco): ProcessoCadeiaValor {
  return {
    id: texto(l.id),
    procId: texto(l.proc_id),
    nome: texto(l.nome),
    macroprocesso: textoOuNulo(l.macroprocesso),
    ativo: l.ativo !== false,
    unidadeSupervisoraId: textoOuNulo(l.unidade_supervisora_id),
  };
}

/**
 * Linha de `objetos_contexto` -> `ObjetoContexto`.
 *
 * A tabela só guarda o `processo_id` e o `unidade_id`. Para mostrar o nome do
 * processo e as marcas "processo inativo" / "unidade inativa", quem chama
 * passa o processo e a unidade já convertidos (achados pelo id).
 * Ex.: objetoDoBanco(linha, { processo, unidade })
 */
export function objetoDoBanco(
  l: LinhaBanco,
  apoio: { processo?: ProcessoCadeiaValor | null; unidade?: UnidadeOrganizacional | null }
): ObjetoContexto {
  const processoId = textoOuNulo(l.processo_id);
  // Só usa o processo informado se ele for mesmo o do objeto.
  const processo = processoId && apoio.processo?.id === processoId ? apoio.processo : null;
  return {
    id: texto(l.id),
    tipoObjeto: texto(l.tipo_objeto) as ObjetoContexto['tipoObjeto'],
    nomeObjeto: texto(l.nome_objeto),
    unidadeId: texto(l.unidade_id),
    macroprocessoSupervisorId: textoOuNulo(l.macroprocesso_supervisor_id),
    diretoriaId: textoOuNulo(l.diretoria_id),
    processoId,
    processoNome: processo ? processo.nome : null,
    processoAtivo: processo ? processo.ativo : null,
    // Sem a unidade em mãos, supomos ativa (a lista de unidades vem do mesmo carregamento).
    unidadeAtiva: apoio.unidade ? apoio.unidade.ativa : true,
    objetivoEstrategicoAssociado: texto(l.objetivo_estrategico_associado),
    insumosPrincipais: texto(l.insumos_principais),
    entregasPrincipais: texto(l.entregas_principais),
    partesInteressadas: texto(l.partes_interessadas),
    cicloAno: numero(l.ciclo_ano),
  };
}

// ---------------------------------------------------------------------------
// FILHOS DO RISCO
// ---------------------------------------------------------------------------

function controleDoBanco(l: LinhaBanco): ControleExistente {
  return {
    id: texto(l.id),
    descricaoControle: texto(l.descricao_controle),
    evidenciaFuncionamento: texto(l.evidencia_funcionamento),
    possuiEvidenciaComprovada: booleano(l.possui_evidencia_comprovada),
    desenhoAdequado: booleano(l.desenho_adequado),
    operacaoComprovada: booleano(l.operacao_comprovada),
  };
}

function respostaDoBanco(l: LinhaBanco): RespostaTratamento5W2H {
  return {
    id: texto(l.id),
    estrategia: texto(l.estrategia) as RespostaTratamento5W2H['estrategia'],
    acaoOQue: texto(l.acao_o_que),
    justificativaPorQue: textoOpcional(l.justificativa_por_que),
    localOnde: textoOpcional(l.local_onde),
    responsavelQuem: texto(l.responsavel_quem),
    prazoQuando: texto(l.prazo_quando), // DATE chega como 'AAAA-MM-DD'
    procedimentoComo: texto(l.procedimento_como),
    custoQuanto: textoOpcional(l.custo_quanto),
    statusExecucao: texto(l.status_execucao) as RespostaTratamento5W2H['statusExecucao'],
  };
}

function medicaoDoBanco(l: LinhaBanco): MedicaoKri {
  return {
    id: texto(l.id),
    dataMedicao: texto(l.data_medicao),
    valorApurado: texto(l.valor_apurado),
    emAlerta: booleano(l.em_alerta),
    observacao: textoOpcional(l.observacao),
  };
}

function kriDoBanco(l: LinhaBanco, medicoes: LinhaBanco[]): IndicadorKri {
  return {
    id: texto(l.id),
    nomeIndicador: texto(l.nome_indicador),
    formulaCalculo: texto(l.formula_calculo),
    fonteDados: texto(l.fonte_dados),
    periodicidade: texto(l.periodicidade) as IndicadorKri['periodicidade'],
    metaAlvo: texto(l.meta_alvo),
    limiteAlerta: texto(l.limite_alerta),
    responsavelMedicao: texto(l.responsavel_medicao),
    // Só as medições DESTE KRI, da mais recente para a mais antiga.
    medicoes: medicoes
      .filter((m) => texto(m.kri_id) === texto(l.id))
      .map(medicaoDoBanco)
      .sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao)),
  };
}

/** Linha de `historico_fluxo` -> `HistoricoFluxoItem`. */
export function historicoDoBanco(l: LinhaBanco): HistoricoFluxoItem {
  return {
    id: texto(l.id),
    etapa: texto(l.etapa) as HistoricoFluxoItem['etapa'],
    acao: texto(l.acao) as HistoricoFluxoItem['acao'],
    usuarioNome: texto(l.usuario_nome),
    usuarioPapel: texto(l.usuario_papel),
    despachoTexto: textoOpcional(l.despacho_texto),
    criadoEm: texto(l.criado_em),
  };
}

/** Linha de `historico_fluxo` + código do risco -> `EventoFluxo` ("atividade recente"). */
export function eventoFluxoDoBanco(l: LinhaBanco, codigoRadar: string): EventoFluxo {
  return { ...historicoDoBanco(l), riscoId: texto(l.risco_id), codigoRadar };
}

/**
 * Ordem do histórico: pela coluna `sequencia` (dada pelo banco; dentro de uma
 * transação, `criado_em` empata). Sem `sequencia`, usa `criado_em`.
 */
function compararHistorico(a: LinhaBanco, b: LinhaBanco): number {
  if (a.sequencia !== undefined && a.sequencia !== null && b.sequencia !== undefined && b.sequencia !== null) {
    return numero(a.sequencia) - numero(b.sequencia);
  }
  return texto(a.criado_em).localeCompare(texto(b.criado_em));
}

// ---------------------------------------------------------------------------
// O RISCO COMPLETO
// ---------------------------------------------------------------------------

/**
 * Os "filhos" e o apoio que acompanham uma linha de `riscos`.
 * A fonte Supabase lê cada tabela separadamente (paginada) e passa aqui só as
 * linhas deste risco — mas, por segurança, filtramos de novo por `risco_id`.
 */
export interface FilhosRiscoBanco {
  /** Objeto já convertido (dá a unidade dona e o nome do objeto). */
  objeto?: ObjetoContexto | null;
  /** Categoria já convertida (dá o nome e o apetite da DAR). */
  categoria?: CategoriaRisco | null;
  controles?: LinhaBanco[];
  respostas?: LinhaBanco[];
  kris?: LinhaBanco[];
  /** Medições de qualquer KRI deste risco (agrupadas por `kri_id`). */
  medicoes?: LinhaBanco[];
  historico?: LinhaBanco[];
}

/**
 * Frase "Mostre a Conta" montada com os valores GRAVADOS (sem refazer a conta).
 * O banco não guarda a memória de cálculo; a tela precisa dela para explicar.
 * Ex.: "P=4 e I=5 → Inerente = 24 (Extremo, Quadro 7) × Fator 0.5 (Forte, com
 *       evidência comprovada, Quadro 6) = Residual 12 (Alto, Quadro 8) → Crítico
 *       frente à DAR (baixo): SIM"
 */
function memoriaDosValoresGravados(f: Omit<FichaRisco, 'memoriaCalculo'>, apetite: string): string {
  const evidencia = f.possuiEvidenciaControle ? 'com evidência comprovada' : 'sem evidência comprovada';
  return (
    `P=${f.probabilidade} e I=${f.impacto} → Inerente = ${f.nivelInerente} (${f.classificacaoInerente}, Quadro 7)` +
    ` × Fator ${f.fatorControle} (${f.nivelEficaciaControle}, ${evidencia}, Quadro 6)` +
    ` = Residual ${f.nivelResidual} (${f.classificacaoResidual}, Quadro 8)` +
    ` → Crítico frente à DAR (${apetite}): ${f.statusCritico.toUpperCase()}`
  );
}

/** Linha de `riscos` + filhos -> `FichaRisco` completa. */
export function riscoDoBanco(l: LinhaBanco, filhos: FilhosRiscoBanco): FichaRisco {
  const id = texto(l.id);
  const doRisco = (linhas?: LinhaBanco[]) => (linhas ?? []).filter((x) => x.risco_id === undefined || texto(x.risco_id) === id);

  const base: Omit<FichaRisco, 'memoriaCalculo'> = {
    id,
    codigoRadar: texto(l.codigo_radar),
    objetoId: texto(l.objeto_id),
    unidadeId: filhos.objeto?.unidadeId ?? '',
    atualizadoEm: textoOuNulo(l.atualizado_em),
    nomeObjetoCache: filhos.objeto?.nomeObjeto,
    responsavelRiscoNome: texto(l.responsavel_risco_nome),

    causas: texto(l.causas),
    eventoRisco: texto(l.evento_risco),
    consequencias: texto(l.consequencias),
    objetivoAfetado: texto(l.objetivo_afetado),
    descricaoPadrao: texto(l.descricao_padrao),

    categoriaId: numero(l.categoria_id),
    categoriaNome: filhos.categoria?.nome ?? '',
    subcategoriaIntegridade: textoOpcional(l.subcategoria_integridade),
    testeIntegridadeAplicavel: booleano(l.teste_integridade_aplicavel),
    justificativaNaoIntegridade: textoOpcional(l.justificativa_nao_integridade),

    probabilidade: numero(l.probabilidade) as FichaRisco['probabilidade'],
    justificativaProbabilidade: textoOpcional(l.justificativa_probabilidade),
    impacto: numero(l.impacto) as FichaRisco['impacto'],
    justificativaImpacto: textoOpcional(l.justificativa_impacto),
    nivelInerente: numero(l.nivel_inerente),
    classificacaoInerente: texto(l.classificacao_inerente) as FichaRisco['classificacaoInerente'],

    possuiEvidenciaControle: booleano(l.possui_evidencia_controle),
    nivelEficaciaControle: texto(l.nivel_eficacia_controle) as FichaRisco['nivelEficaciaControle'],
    fatorControle: numero(l.fator_controle) as FichaRisco['fatorControle'],
    nivelResidual: numero(l.nivel_residual),
    classificacaoResidual: texto(l.classificacao_residual) as FichaRisco['classificacaoResidual'],
    statusCritico: texto(l.status_critico) as FichaRisco['statusCritico'],
    isCritico: booleano(l.is_critico),

    origemPreliminarCgov: booleano(l.origem_preliminar_cgov),
    statusFluxo: texto(l.status_fluxo) as FichaRisco['statusFluxo'],
    estrategiaPrincipal: texto(l.estrategia_principal) as FichaRisco['estrategiaPrincipal'],

    controlesExistentes: doRisco(filhos.controles).map(controleDoBanco),
    respostasTratamento: doRisco(filhos.respostas).map(respostaDoBanco),
    kris: doRisco(filhos.kris).map((k) => kriDoBanco(k, filhos.medicoes ?? [])),
    historicoFluxo: [...doRisco(filhos.historico)].sort(compararHistorico).map(historicoDoBanco),
  };

  return { ...base, memoriaCalculo: memoriaDosValoresGravados(base, filhos.categoria?.apetiteDeclarado ?? '—') };
}

// ---------------------------------------------------------------------------
// RPCs DE LEITURA (acoes_no_fluxo, ler_auditoria)
// ---------------------------------------------------------------------------

/** Linha de `acoes_no_fluxo` -> `AcoesFluxo`. */
export function acoesDoBanco(l: LinhaBanco): AcoesFluxo {
  return {
    riscoId: texto(l.risco_id),
    podeEnviar: booleano(l.pode_enviar),
    podeAssumir: booleano(l.pode_assumir),
    podeValidar: booleano(l.pode_validar),
    podeHomologar: booleano(l.pode_homologar),
    podeDevolver: booleano(l.pode_devolver),
    devolucaoCgov: booleano(l.devolucao_cgov),
    podeEditar: booleano(l.pode_editar),
    podeExcluir: booleano(l.pode_excluir),
    motivo: textoOuNulo(l.motivo),
  };
}

const comoObjeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Linha de `ler_auditoria` -> `EventoAuditoria`. */
export function eventoAuditoriaDoBanco(l: LinhaBanco): EventoAuditoria {
  return {
    id: texto(l.id),
    realizadoEm: texto(l.realizado_em),
    tabela: texto(l.tabela_afetada),
    operacao: texto(l.operacao).toUpperCase() as EventoAuditoria['operacao'],
    quemNome: textoOuNulo(l.quem_nome),
    quemPapel: textoOuNulo(l.quem_papel),
    codigoRadar: textoOuNulo(l.codigo_radar),
    anteriores: comoObjeto(l.dados_anteriores),
    novos: comoObjeto(l.dados_novos),
  };
}

/**
 * Colunas de `riscos` que o BANCO calcula (spec §5.3, "Recalculado pela DAR").
 * `memoria_calculo` e `descricao_padrao` entram porque também são derivadas
 * (a descrição padrão é montada pelo gatilho a partir das causas/evento/...).
 */
const COLUNAS_CALCULADAS = new Set([
  'nivel_inerente',
  'classificacao_inerente',
  'fator_controle',
  'nivel_eficacia_controle',
  'nivel_residual',
  'classificacao_residual',
  'status_critico',
  'is_critico',
  'atualizado_em',
  'memoria_calculo',
  'descricao_padrao',
]);

/**
 * Uma alteração em `riscos` em que SÓ mudaram colunas calculadas não pode ter
 * vindo da ficha (nenhum campo de entrada mudou): foi o banco recalculando,
 * por exemplo depois de a CGOV mudar a DAR. A Auditoria mostra "recalculado
 * pela DAR", nunca "ficha editada".
 *
 * Ex.: só status_critico 'sim'→'nao' e atualizado_em mudaram -> true
 *      causas mudou (mesmo junto com status_critico)          -> false
 *      nada mudou, ou falta um dos lados                       -> false
 */
export function soCamposCalculadosMudaram(
  anteriores: Record<string, unknown> | null | undefined,
  novos: Record<string, unknown> | null | undefined
): boolean {
  if (!anteriores || !novos) return false;
  const chaves = new Set([...Object.keys(anteriores), ...Object.keys(novos)]);
  let algumaMudou = false;
  for (const chave of chaves) {
    // JSON.stringify compara também listas e objetos (ex.: jsonb).
    if (JSON.stringify(anteriores[chave]) === JSON.stringify(novos[chave])) continue;
    if (!COLUNAS_CALCULADAS.has(chave)) return false;
    algumaMudou = true;
  }
  return algumaMudou;
}

// ---------------------------------------------------------------------------
// DO FRONT PARA O BANCO (gravação da ficha)
// ---------------------------------------------------------------------------

/**
 * Copia para `destino[coluna]` só quando o valor NÃO é undefined.
 * (undefined = "não mexer"; null = "apagar"; os dois são diferentes!)
 */
function copiarSeDefinido(destino: Record<string, unknown>, coluna: string, valor: unknown): void {
  if (valor !== undefined) destino[coluna] = valor;
}

/**
 * `FichaParaSalvar` (camelCase) -> JSON da função `salvar_ficha_risco`
 * (chaves = nomes das colunas; migração 20261117001, seção 2).
 *
 * NUNCA inclui campos calculados (`nivel_residual`, `fator_controle`,
 * `descricao_padrao`...), nem `status_fluxo`, nem `codigo_radar`: quem decide
 * é o banco. Grupo de filhos ausente = chave omitida (o banco não mexe).
 *
 * Ex.: { objetoId: 'o1', causas: 'x', controles: [] }
 *   -> { objeto_id: 'o1', causas: 'x', controles: [] }
 */
export function fichaParaJson(f: FichaParaSalvar): Record<string, unknown> {
  const json: Record<string, unknown> = {};
  copiarSeDefinido(json, 'id', f.id);
  json.objeto_id = f.objetoId;
  copiarSeDefinido(json, 'preliminar_cgov', f.preliminarCgov);
  copiarSeDefinido(json, 'responsavel_risco_nome', f.responsavelRiscoNome);
  copiarSeDefinido(json, 'causas', f.causas);
  copiarSeDefinido(json, 'evento_risco', f.eventoRisco);
  copiarSeDefinido(json, 'consequencias', f.consequencias);
  copiarSeDefinido(json, 'objetivo_afetado', f.objetivoAfetado);
  copiarSeDefinido(json, 'categoria_id', f.categoriaId);
  copiarSeDefinido(json, 'subcategoria_integridade', f.subcategoriaIntegridade);
  copiarSeDefinido(json, 'teste_integridade_aplicavel', f.testeIntegridadeAplicavel);
  copiarSeDefinido(json, 'justificativa_nao_integridade', f.justificativaNaoIntegridade);
  copiarSeDefinido(json, 'probabilidade', f.probabilidade);
  copiarSeDefinido(json, 'justificativa_probabilidade', f.justificativaProbabilidade);
  copiarSeDefinido(json, 'impacto', f.impacto);
  copiarSeDefinido(json, 'justificativa_impacto', f.justificativaImpacto);
  copiarSeDefinido(json, 'possui_evidencia_controle', f.possuiEvidenciaControle);
  copiarSeDefinido(json, 'nivel_eficacia_controle', f.nivelEficaciaControle);
  copiarSeDefinido(json, 'estrategia_principal', f.estrategiaPrincipal);

  if (f.controles !== undefined) {
    json.controles = f.controles.map((c) => {
      const item: Record<string, unknown> = {};
      copiarSeDefinido(item, 'id', c.id);
      item.descricao_controle = c.descricaoControle;
      item.evidencia_funcionamento = c.evidenciaFuncionamento;
      item.possui_evidencia_comprovada = c.possuiEvidenciaComprovada;
      item.desenho_adequado = c.desenhoAdequado;
      item.operacao_comprovada = c.operacaoComprovada;
      return item;
    });
  }

  if (f.respostas !== undefined) {
    json.respostas = f.respostas.map((r) => {
      const item: Record<string, unknown> = {};
      copiarSeDefinido(item, 'id', r.id);
      item.estrategia = r.estrategia;
      item.acao_o_que = r.acaoOQue;
      copiarSeDefinido(item, 'justificativa_por_que', r.justificativaPorQue);
      copiarSeDefinido(item, 'local_onde', r.localOnde);
      item.responsavel_quem = r.responsavelQuem;
      item.prazo_quando = r.prazoQuando;
      item.procedimento_como = r.procedimentoComo;
      copiarSeDefinido(item, 'custo_quanto', r.custoQuanto);
      item.status_execucao = r.statusExecucao;
      return item;
    });
  }

  if (f.kris !== undefined) {
    json.kris = f.kris.map((k) => {
      const item: Record<string, unknown> = {};
      copiarSeDefinido(item, 'id', k.id);
      item.nome_indicador = k.nomeIndicador;
      item.formula_calculo = k.formulaCalculo;
      item.fonte_dados = k.fonteDados;
      item.periodicidade = k.periodicidade;
      item.meta_alvo = k.metaAlvo;
      item.limite_alerta = k.limiteAlerta;
      item.responsavel_medicao = k.responsavelMedicao;
      return item; // medições ficam de fora (são do Monitoramento)
    });
  }

  return json;
}

/**
 * `FichaRisco` já existente -> `FichaParaSalvar` com TODOS os campos de entrada
 * e os filhos (com id). Útil para "Reavaliar": parte-se da ficha atual e
 * troca-se só o que mudou.
 * Ex.: { ...fichaParaSalvarDeRisco(risco), probabilidade: 5 }
 */
export function fichaParaSalvarDeRisco(r: FichaRisco): FichaParaSalvar {
  // Opcional ausente no front (undefined) vira null: "sem valor" no banco.
  const ouNulo = (v: string | undefined) => v ?? null;
  // Nos FILHOS (ação 5W2H), texto opcional ausente OU em branco também vira
  // null: assim o banco APAGA o valor antigo (chave omitida = "manter").
  // Ex.: '   ' -> null; 'Reduzir fraudes' -> 'Reduzir fraudes'.
  const vazioViraNulo = (v: string | undefined) => (v && v.trim() ? v : null);
  return {
    id: r.id,
    objetoId: r.objetoId,
    responsavelRiscoNome: r.responsavelRiscoNome,
    causas: r.causas,
    eventoRisco: r.eventoRisco,
    consequencias: r.consequencias,
    objetivoAfetado: r.objetivoAfetado,
    categoriaId: r.categoriaId,
    subcategoriaIntegridade: ouNulo(r.subcategoriaIntegridade),
    testeIntegridadeAplicavel: r.testeIntegridadeAplicavel,
    justificativaNaoIntegridade: ouNulo(r.justificativaNaoIntegridade),
    probabilidade: r.probabilidade,
    justificativaProbabilidade: ouNulo(r.justificativaProbabilidade),
    impacto: r.impacto,
    justificativaImpacto: ouNulo(r.justificativaImpacto),
    possuiEvidenciaControle: r.possuiEvidenciaControle,
    nivelEficaciaControle: r.nivelEficaciaControle,
    estrategiaPrincipal: r.estrategiaPrincipal,
    // Filho com id VAZIO ('') é filho NOVO (criado na edição da ficha): vai
    // sem id, e a fonte cria um. Ex.: { id: '', descricaoControle: 'X' } → { descricaoControle: 'X' }.
    controles: r.controlesExistentes.map((c) => ({ ...c, id: c.id || undefined })),
    respostas: r.respostasTratamento.map((x) => ({
      ...x,
      id: x.id || undefined,
      justificativaPorQue: vazioViraNulo(x.justificativaPorQue),
      localOnde: vazioViraNulo(x.localOnde),
      custoQuanto: vazioViraNulo(x.custoQuanto),
    })),
    // Tira as medições: elas não passam pela gravação da ficha.
    kris: r.kris.map(({ medicoes: _medicoes, ...k }) => ({ ...k, id: k.id || undefined })),
  };
}

/**
 * Importação (Passo 0 da CGOV): uma linha da tabela da skill
 * `cgov-gestao-riscos-v4` -> `FichaParaSalvar` preliminar.
 *
 * O código RADAR da skill é DESCARTADO: quem gera o código é a fonte (banco ou
 * demonstração). Os valores calculados da skill também são descartados — a
 * fonte recalcula a partir de P, I, eficácia e evidência.
 *
 * Categoria que não existe no banco: LANÇA erro (nunca troca por outra).
 *
 * Ex.: fichaDaSkillParaSalvar(linha, categorias, 'obj-1', 'Ponto Focal')
 *   -> { objetoId: 'obj-1', preliminarCgov: true, probabilidade: 3, ... }
 */
export function fichaDaSkillParaSalvar(
  item: LinhaImportadaSkill,
  categorias: CategoriaRisco[],
  objetoId: string,
  responsavelNome = 'Ponto Focal 1ª Linha (A validar)'
): FichaParaSalvar {
  const categoria = categorias.find((c) => c.nome.toLowerCase() === item.categoriaNome.toLowerCase());
  // Sem conversão silenciosa: categoria que o banco não tem NÃO vira "Operacional".
  // O erro "RADAR: ..." aparece na lista de erros da linha na tela de importação.
  if (!categoria) {
    throw new Error(`RADAR: a categoria "${item.categoriaNome}" não existe no banco.`);
  }
  const temControle = Boolean(item.controlesTexto) && item.controlesTexto !== 'Inexistente';
  return {
    objetoId,
    preliminarCgov: true,
    responsavelRiscoNome: responsavelNome,
    causas: item.causas,
    eventoRisco: item.eventoRisco,
    consequencias: item.consequencias,
    objetivoAfetado: item.objetivoAfetado,
    categoriaId: categoria.id,
    subcategoriaIntegridade: item.subcategoriaIntegridade,
    probabilidade: item.probabilidade,
    impacto: item.impacto,
    possuiEvidenciaControle: item.possuiEvidenciaControle,
    nivelEficaciaControle: item.nivelEficaciaControle,
    estrategiaPrincipal: item.estrategiaTratamento,
    controles: temControle
      ? [
          {
            descricaoControle: item.controlesTexto,
            evidenciaFuncionamento: item.possuiEvidenciaControle
              ? 'Previsto no ato normativo analisado'
              : 'Sem evidência documental comprovada',
            possuiEvidenciaComprovada: item.possuiEvidenciaControle,
            desenhoAdequado: item.possuiEvidenciaControle,
            operacaoComprovada: item.possuiEvidenciaControle,
          },
        ]
      : [],
    kris: item.kriSugerido
      ? [
          {
            nomeIndicador: item.kriSugerido,
            formulaCalculo: 'Definido preliminarmente via skill CGOV',
            fonteDados: 'SEI / Sistema Setorial',
            periodicidade: 'Trimestral',
            metaAlvo: '100%',
            limiteAlerta: '< 80%',
            responsavelMedicao: responsavelNome,
          },
        ]
      : [],
  };
}
