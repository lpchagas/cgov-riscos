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
 * 1 = Muito baixa (< 10%)
 * 2 = Baixa (10% a 30%)
 * 3 = Média (31% a 60%)
 * 4 = Alta (61% a 90%)
 * 5 = Muito alta (> 90%)
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
  | 'uc';

/**
 * Papéis de usuário na governança das 3 Linhas do ICMBio.
 */
export type PapelGovernanca = 'gestor' | 'lider_cg' | 'diretor' | 'cgov';

/**
 * Representa uma Unidade Organizacional do ICMBio (Sede, Diretoria, CG, GR, Centro, NGI ou UC).
 */
export interface UnidadeOrganizacional {
  id: string;
  sigla: string;
  nome: string;
  tipo: TipoUnidade;
  unidadePaiId?: string;
}

/**
 * Representa uma das 8 Categorias de Risco do Quadro 2 da Metodologia,
 * associada ao seu apetite na DAR (Anexo III) e subcategorias (Quadro 3 para Integridade).
 */
export interface CategoriaRisco {
  id: number;
  nome: string;
  descricaoNormativa: string;
  apetiteDeclarado: ApetiteDeclarado;
  justificativaDar: string;
  subcategoriasPermitidas: string[];
}

/**
 * Representa o Objeto de Gestão de Riscos e seu Contexto (Seção 4.1 e Quadro 1 da Metodologia).
 */
export interface ObjetoContexto {
  id: string;
  tipoObjeto: 'Macroprocesso' | 'Processo' | 'Projeto' | 'Plano' | 'Ação' | 'Unidade';
  nomeObjeto: string;
  unidadeId: string;
  macroprocessoSupervisorId: string;
  diretoriaId: string;
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
  nomeIndicador: string;
  formulaCalculo: string;
  fonteDados: string;
  periodicidade: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  metaAlvo: string;
  limiteAlerta: string;
  responsavelMedicao: string;
  medicoes: MedicaoKri[];
}

/**
 * Registro de tramitação no fluxo de Aprovação em 1 Clique.
 */
export interface HistoricoFluxoItem {
  id: string;
  etapa: 'submissao_1a_linha' | 'validacao_cg' | 'homologacao_diretoria' | 'devolucao_ajuste' | 'reabertura_nota';
  acao: 'submetido' | 'aprovado_1_clique' | 'devolvido_ajuste' | 'reaberto_mudanca_nota';
  usuarioNome: string;
  usuarioPapel: PapelGovernanca;
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
  subcategoriaIntegridade?: string;
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
