/**
 * ============================================================================
 * CONTRATOS E TIPOS DE DADOS DO SISTEMA RADAR — ICMBio
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * No TypeScript, um arquivo `.types.ts` funciona como o "dicionário de regras"
 * dos dados da aplicação. Antes mesmo do programa rodar, o editor (VS Code)
 * lê este arquivo e avisa se alguém tentar escrever, por exemplo, "Medio" sem
 * acento ou uma probabilidade "6" (que não existe na Portaria).
 *
 * Referências Normativas:
 * - Minuta de Portaria Política de Gestão de Riscos (SEI 024241420)
 * - Minuta de Portaria Metodologia de Gestão de Riscos RADAR (SEI 024421455)
 * - Programa de Integridade Integra+ (Portaria ICMBio nº 253/2026)
 */

/**
 * Escala de Probabilidade do Quadro 4 da Metodologia RADAR (1 a 5):
 * 1 = Raro
 * 2 = Pouco provável
 * 3 = Provável
 * 4 = Muito provável
 * 5 = Praticamente certo
 * O Quadro 4 não traz percentuais. Nomes e descrições literais ficam em
 * `src/utils/escalasProbabilidadeImpacto.ts`.
 */
export type NivelProbabilidade = 1 | 2 | 3 | 4 | 5;

/**
 * Escala de Impacto do Quadro 5 da Metodologia RADAR (1 a 5):
 * 1 = Muito baixo
 * 2 = Baixo
 * 3 = Médio
 * 4 = Alto
 * 5 = Muito alto
 */
export type NivelImpacto = 1 | 2 | 3 | 4 | 5;

/**
 * Níveis de Classificação do Risco segundo o Quadro 8 da Metodologia RADAR.
 * ATENÇÃO NORMATIVA: A faixa 18 a 25 chama-se estritamente "Extremo" (e não "Crítico").
 * "Risco Crítico" é o risco cujo residual fica fora do apetite da DAR.
 */
export type ClasseRisco = 'Baixo' | 'Médio' | 'Alto' | 'Extremo';

/**
 * Níveis de eficácia dos controles existentes segundo o Quadro 6 da Metodologia.
 */
export type NivelEficaciaControle =
  | 'Inexistente'
  | 'Fraco'
  | 'Mediano'
  | 'Satisfatório'
  | 'Forte';

/**
 * Fatores multiplicadores exatos do Quadro 6 da Metodologia RADAR:
 * - Inexistente = 1.0 (mantém 100% do risco inerente)
 * - Fraco = 0.9 (reduz 10% do risco inerente)
 * - Mediano = 0.75 (reduz 25% do risco inerente)
 * - Satisfatório = 0.6 (reduz 40% do risco inerente)
 * - Forte = 0.5 (reduz 50% do risco inerente)
 */
export type FatorAvaliacaoControle = 1.0 | 0.9 | 0.75 | 0.6 | 0.5;

/**
 * Apetite a Riscos declarado para cada uma das 8 Categorias na DAR
 * (Declaração de Apetite a Riscos — Anexo III da Metodologia):
 * - 'baixo': Aceita apenas riscos Baixos (<= 5). Riscos Médios, Altos e Extremos são Críticos.
 * - 'moderado': Aceita riscos Baixos e Médios (<= 10). Riscos Altos e Extremos são Críticos.
 * - 'pendente_dar': DAR ainda não deliberada formalmente pelo CIG para esta categoria.
 */
export type ApetiteDeclarado = 'baixo' | 'moderado' | 'pendente_dar';

/**
 * Resultado da avaliação de criticidade frente à Declaração de Apetite a Riscos (DAR).
 */
export type StatusCriticidadeDAR = 'sim' | 'nao' | 'pendente_dar';

/**
 * Estratégias oficiais de resposta/tratamento ao risco segundo a Tabela 8 da Metodologia.
 */
export type EstrategiaTratamento = 'Mitigar' | 'Compartilhar' | 'Evitar' | 'Aceitar';

/**
 * Estados do fluxo de governança em 3 degraus ("Aprovação em 1 Clique") + Passo 0 da CGOV:
 * - 'preliminar_cgov': Gerado pela CGOV no Passo 0 via skill cgov-gestao-riscos-v4.
 * - 'rascunho': Em elaboração ou revisão pelo Gestor de Riscos (1ª Linha).
 * - 'em_validacao_cg': Submetido para validação em 1 clique do Líder de Macroprocesso (CG ou GR).
 * - 'em_homologacao_dir': Risco Crítico escalado automaticamente para homologação do Diretor.
 * - 'aprovado': Integrado oficialmente ao Plano de Gestão de Riscos do ICMBio.
 * - 'devolvido': Devolvido com solicitação de ajuste rápido para a 1ª Linha.
 */
export type StatusFluxoRisco =
  | 'preliminar_cgov'
  | 'rascunho'
  | 'em_validacao_cg'
  | 'em_homologacao_dir'
  | 'aprovado'
  | 'devolvido';

/**
 * Tipos de Unidades Organizacionais do ICMBio, incluindo explicitamente
 * 'coordenacao-geral' (responsável pela supervisão dos Macroprocessos).
 */
export type TipoUnidade =
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

/**
 * Os 10 perfis de usuário do RADAR. As chaves são idênticas ao CHECK da coluna
 * `perfis.papel` no banco (migração 20261115001): mudar uma aqui exige mudar lá.
 */
export type PapelGovernanca =
  | 'gestor'
  | 'coordenador_territorial'
  | 'gerente_regional'
  | 'coordenador_geral'
  | 'diretor'
  | 'presidencia'
  | 'auditoria'
  | 'cgov'
  | 'cgge'
  | 'gabin';

/**
 * Representa uma Unidade Organizacional do ICMBio (Sede, Diretoria, CG, GR, Centro, NGI ou UC).
 */
export interface UnidadeOrganizacional {
  id: string;
  sigla: string;
  nome: string;
  tipo: TipoUnidade;
  unidadePaiId?: string;
  /** Unidade desativada some das listas de escolha, mas o histórico continua. */
  ativa: boolean;
}

/**
 * Representa uma das 8 Categorias de Risco do Quadro 2 da Metodologia,
 * associada ao seu apetite na DAR (Anexo III). As subcategorias do Quadro 3
 * (Integridade) ficam na tabela `subcategorias_risco` do banco e em
 * `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3` (calculadoraRiscoRadar.ts).
 */
export interface CategoriaRisco {
  id: number;
  nome: string;
  descricaoNormativa: string;
  apetiteDeclarado: ApetiteDeclarado;
  justificativaDar: string;
}

/**
 * Representa o Objeto de Gestão de Riscos e seu Contexto (Seção 4.1 e Quadro 1 da Metodologia).
 */
export interface ObjetoContexto {
  id: string;
  tipoObjeto: 'Macroprocesso' | 'Processo' | 'Projeto' | 'Plano' | 'Ação' | 'Unidade';
  nomeObjeto: string;
  unidadeId: string;
  macroprocessoSupervisorId: string | null;
  diretoriaId: string | null;
  /** Processo da cadeia de valor ao qual o objeto está vinculado (null = sem vínculo). */
  processoId: string | null;
  processoNome: string | null;
  processoAtivo: boolean | null;
  /** false quando a unidade do objeto foi desativada (só a CGOV reatribui). */
  unidadeAtiva: boolean;
  objetivoEstrategicoAssociado: string;
  insumosPrincipais: string;
  entregasPrincipais: string;
  partesInteressadas: string;
  cicloAno: number;
}

/**
 * Representa um Controle Interno existente avaliado na análise do risco (Quadro 6).
 */
export interface ControleExistente {
  id: string;
  descricaoControle: string;
  evidenciaFuncionamento: string;
  possuiEvidenciaComprovada: boolean;
  desenhoAdequado: boolean;
  operacaoComprovada: boolean;
}

/**
 * Representa uma Ação de Tratamento no formato 5W2H (Seção 4.5 da Metodologia).
 */
export interface RespostaTratamento5W2H {
  id: string;
  estrategia: EstrategiaTratamento;
  acaoOQue: string;
  justificativaPorQue?: string;
  localOnde?: string;
  responsavelQuem: string;
  prazoQuando: string;
  procedimentoComo: string;
  custoQuanto?: string;
  statusExecucao: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
}

/**
 * Representa uma leitura periódica de um Indicador-Chave de Risco (KRI).
 */
export interface MedicaoKri {
  id: string;
  dataMedicao: string;
  valorApurado: string;
  emAlerta: boolean;
  observacao?: string;
}

/**
 * Representa um Indicador-Chave de Risco (KRI — Seção 4.5.1 da Metodologia).
 */
export interface IndicadorKri {
  id: string;
  /** Objeto de gestão de riscos dono do KRI (o KRI só se liga a riscos do mesmo objeto). */
  objetoId: string;
  /** Riscos aos quais o KRI está ligado (um KRI pode servir a vários riscos do objeto). */
  riscoIds: string[];
  /**
   * Quantos riscos o KRI serve DE VERDADE, contando os que a pessoa não vê
   * (`riscoIds` só traz os visíveis, por causa da RLS). Vem da função do banco
   * `kri_total_riscos`; ausente = use `riscoIds.length`.
   * Ex.: riscoIds ['r1'] e totalRiscos 2 → o KRI também serve a 1 risco fora da visão.
   */
  totalRiscos?: number;
  nomeIndicador: string;
  // Campos opcionais: o sistema nunca grava valor que ninguém definiu (LAC-03).
  formulaCalculo?: string;
  fonteDados?: string;
  periodicidade?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  metaAlvo?: string;
  limiteAlerta?: string;
  responsavelMedicao?: string;
  medicoes: MedicaoKri[];
  /**
   * SÓ NA GRAVAÇÃO (o formulário marca; a leitura nunca preenche): `true` =
   * "apenas ligue este KRI que já existe no objeto, sem mexer na definição".
   * Ausente = o KRI com id é uma EDIÇÃO da definição (LAC-03).
   */
  apenasLigar?: boolean;
}

/**
 * Registro de tramitação no fluxo de Aprovação em 1 Clique.
 */
export interface HistoricoFluxoItem {
  id: string;
  etapa: 'submissao_1a_linha' | 'validacao_cg' | 'homologacao_diretoria' | 'devolucao_ajuste' | 'reabertura_nota' | 'assuncao_preliminar';
  acao:
    | 'submetido'
    | 'assumido'
    | 'validado'
    | 'validado_e_homologado'
    | 'homologado'
    | 'devolvido_ajuste'
    | 'reaberto_mudanca_nota'
    | 'reaberto_mudanca_dar'
    | 'devolvido_mudanca_dar'
    | 'aprovado_1_clique';
  usuarioNome: string;
  usuarioPapel: PapelGovernanca | string;
  despachoTexto?: string;
  criadoEm: string;
}

/**
 * Ficha completa de um Risco no Sistema RADAR (Anexo II da Metodologia).
 */
export interface FichaRisco {
  id: string;
  codigoRadar: string;
  objetoId: string;
  /** Unidade dona do risco (vem do objeto; usada para filtrar e para o alcance). */
  unidadeId: string;
  /** Momento da última gravação no banco (null no modo demonstração). */
  atualizadoEm: string | null;
  nomeObjetoCache?: string;
  responsavelRiscoNome: string;

  // Bow Tie e Sintaxe Obrigatória (Seção 4.2.1):
  causas: string;
  eventoRisco: string;
  consequencias: string;
  objetivoAfetado: string;
  descricaoPadrao: string;

  // Categorização e Programa Integra+ (Quadros 2 e 3 / Portaria 253/2026):
  categoriaId: number;
  categoriaNome: string;
  /**
   * Subcategoria do Quadro 3 (só na Integridade). `null` = "sem subcategoria"
   * dito de propósito: na edição, vira `subcategoria_integridade: null` no
   * JSON e o banco APAGA o valor antigo (chave omitida = manter).
   */
  subcategoriaIntegridade?: string | null;
  testeIntegridadeAplicavel: boolean;
  justificativaNaoIntegridade?: string;

  // Análise Inerente (Quadros 4, 5, 7 e 8):
  probabilidade: NivelProbabilidade;
  justificativaProbabilidade?: string;
  impacto: NivelImpacto;
  justificativaImpacto?: string;
  nivelInerente: number;
  classificacaoInerente: ClasseRisco;

  // Controles e Análise Residual (Quadros 6 e 8 + DAR):
  possuiEvidenciaControle: boolean;
  nivelEficaciaControle: NivelEficaciaControle;
  fatorControle: FatorAvaliacaoControle;
  nivelResidual: number;
  classificacaoResidual: ClasseRisco;
  statusCritico: StatusCriticidadeDAR;
  isCritico: boolean;
  memoriaCalculo: string;

  // Passo 0 (Skill CGOV) e Governança em 3 Degraus:
  origemPreliminarCgov: boolean;
  statusFluxo: StatusFluxoRisco;
  estrategiaPrincipal: EstrategiaTratamento;

  // Listas filhas (1:N):
  controlesExistentes: ControleExistente[];
  respostasTratamento: RespostaTratamento5W2H[];
  kris: IndicadorKri[];
  historicoFluxo: HistoricoFluxoItem[];
}

/**
 * O que a pessoa logada pode fazer com um risco, já decidido pelo banco
 * (a tela só mostra ou esconde botões conforme estes campos).
 */
export interface AcoesFluxo {
  riscoId: string;
  podeEnviar: boolean;
  podeAssumir: boolean;
  podeValidar: boolean;
  podeHomologar: boolean;
  podeDevolver: boolean;
  /** true quando quem devolve é a CGOV (devolve direto à unidade). */
  devolucaoCgov: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  /** Explicação curta quando nenhuma ação está liberada (null = nada a explicar). */
  motivo: string | null;
}

/** Processo da Cadeia de Valor do ICMBio ao qual um objeto de risco pode ser vinculado. */
export interface ProcessoCadeiaValor {
  id: string;
  procId: string;
  nome: string;
  macroprocesso: string | null;
  ativo: boolean;
  unidadeSupervisoraId: string | null;
}
