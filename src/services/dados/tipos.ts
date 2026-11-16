/**
 * ============================================================================
 * CONTRATO DA CAMADA DE DADOS (`src/services/dados/tipos.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * O RADAR tem duas "fontes" de dados:
 *   1. a de DEMONSTRAÇÃO (tudo na memória do navegador, sem banco);
 *   2. a do SUPABASE (o banco de verdade, com RLS, fluxo e trilha).
 *
 * A store (`riscosStore.ts`) não quer saber qual das duas está em uso. Ela só
 * conversa com uma `FonteDados`: uma "tomada" com o mesmo formato nas duas.
 * Este arquivo descreve essa tomada (a interface) e os tipos que entram e saem.
 * Não há lógica aqui — só o contrato.
 *
 * Regras que valem para TODAS as funções da interface:
 *   - todas são assíncronas (devolvem `Promise`);
 *   - em caso de falha, rejeitam com `ErroRadar` (mensagem já em português
 *     claro, pronta para a tela, e um `tipo`: permissao, estado, validacao…).
 *
 * Exemplo de uso (na store):
 *   const fonte = criarFonteDados(authStore.modo);
 *   const carteira = await fonte.carregarCarteira();
 *   await fonte.validar(risco.id, 'De acordo.');
 */
import type {
  AcoesFluxo,
  ApetiteDeclarado,
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

/** Tudo o que as telas precisam ao abrir: riscos visíveis (com filhos) e listas de apoio. */
export interface Carteira {
  riscos: FichaRisco[];
  objetos: ObjetoContexto[];
  categorias: CategoriaRisco[];
  unidades: UnidadeOrganizacional[];
  processos: ProcessoCadeiaValor[];
}

/**
 * O que a tela manda para gravar uma ficha (criar ou alterar).
 *
 * Só campos de ENTRADA: os calculados (inerente, residual, classificação,
 * criticidade, fator, descrição padrão) NUNCA vão — quem calcula é o banco
 * (ou a calculadora, no modo demonstração).
 *
 * - `id` ausente = ficha nova; presente = alterar a ficha existente.
 * - Campo ausente (undefined) = "não mexer" (na criação: valor padrão).
 * - `null` nos textos opcionais = apagar o valor.
 * - Grupo de filhos ausente = não mexer no grupo; lista presente = a lista
 *   passa a ser exatamente esta (item sem id = novo; item que sumiu = apagado).
 */
export interface FichaParaSalvar {
  id?: string;
  objetoId: string;
  /** Só na criação: a CGOV grava a ficha como preliminar (Passo 0, Importar). */
  preliminarCgov?: boolean;

  responsavelRiscoNome?: string;
  causas?: string;
  eventoRisco?: string;
  consequencias?: string;
  objetivoAfetado?: string;
  categoriaId?: number;
  subcategoriaIntegridade?: string | null;
  testeIntegridadeAplicavel?: boolean;
  justificativaNaoIntegridade?: string | null;
  probabilidade?: FichaRisco['probabilidade'];
  justificativaProbabilidade?: string | null;
  impacto?: FichaRisco['impacto'];
  justificativaImpacto?: string | null;
  possuiEvidenciaControle?: boolean;
  nivelEficaciaControle?: FichaRisco['nivelEficaciaControle'];
  estrategiaPrincipal?: FichaRisco['estrategiaPrincipal'];

  controles?: Array<Omit<ControleExistente, 'id'> & { id?: string }>;
  respostas?: Array<Omit<RespostaTratamento5W2H, 'id'> & { id?: string }>;
  /** As medições do KRI não passam por aqui (são do Monitoramento). */
  kris?: Array<Omit<IndicadorKri, 'id' | 'medicoes'> & { id?: string }>;
}

/** Uma linha da trilha de auditoria (função `ler_auditoria` do banco). */
export interface EventoAuditoria {
  id: string;
  realizadoEm: string;
  tabela: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE';
  /** null quando quem alterou foi o administrador do banco ("Sistema/administrador"). */
  quemNome: string | null;
  quemPapel: string | null;
  codigoRadar: string | null;
  anteriores: Record<string, unknown> | null;
  novos: Record<string, unknown> | null;
}

/**
 * Filtros da Auditoria. `antesDe` é o "cursor": a data e o id da última linha
 * já recebida (a próxima página começa logo depois dela).
 * Ex.: { de: '2026-11-01', tabela: 'riscos', antesDe: { em: '2026-11-10T10:00:00Z', id: 'abc' } }
 */
export interface FiltrosAuditoria {
  de?: string;
  ate?: string;
  tabela?: string;
  antesDe?: { em: string; id: string };
}

/** Um passo do fluxo de aprovação, com o código do risco (para a "atividade recente"). */
export interface EventoFluxo {
  id: string;
  riscoId: string;
  codigoRadar: string;
  etapa: HistoricoFluxoItem['etapa'];
  acao: HistoricoFluxoItem['acao'];
  usuarioNome: string;
  usuarioPapel: string;
  despachoTexto?: string;
  criadoEm: string;
}

/** A "tomada" comum às duas fontes (demonstração e Supabase). */
export interface FonteDados {
  /** Riscos do alcance da pessoa (com filhos), objetos, categorias, unidades e processos. */
  carregarCarteira(): Promise<Carteira>;
  /** Relê um risco. `null` = não existe OU está fora do alcance (sem dizer qual). */
  relerRisco(id: string): Promise<FichaRisco | null>;
  /** O que a pessoa logada pode fazer com cada risco (ids desconhecidos são ignorados). */
  acoesNoFluxo(ids: string[]): Promise<AcoesFluxo[]>;
  /** Ids dos objetos em que a pessoa pode criar risco (seletor do "Novo risco"). */
  objetosOndeGravo(): Promise<string[]>;

  salvarFicha(f: FichaParaSalvar): Promise<{ id: string; codigoRadar: string }>;
  excluirRisco(id: string): Promise<void>;

  // Fluxo de aprovação (Aprovação em 1 Clique):
  enviar(id: string): Promise<void>;
  assumir(id: string): Promise<void>;
  validar(id: string, parecer?: string): Promise<void>;
  homologar(id: string, parecer?: string): Promise<void>;
  devolver(id: string, motivo: string): Promise<void>;

  // Monitoramento (não reabre o risco aprovado):
  registrarMedicao(kriId: string, m: Omit<MedicaoKri, 'id'>): Promise<void>;
  atualizarStatusTratamento(respostaId: string, status: RespostaTratamento5W2H['statusExecucao']): Promise<void>;

  // Objetos de gestão de riscos:
  salvarObjeto(o: Partial<ObjetoContexto> & { nomeObjeto: string; unidadeId: string }): Promise<ObjetoContexto>;
  reatribuirObjeto(objetoId: string, novaUnidadeId: string): Promise<void>;

  // DAR (Declaração de Apetite a Riscos):
  alterarApetite(categoriaId: number, apetite: ApetiteDeclarado): Promise<void>;
  alterarJustificativa(categoriaId: number, texto: string): Promise<void>;

  // Leituras de histórico:
  lerAuditoria(f: FiltrosAuditoria, limite?: number): Promise<EventoAuditoria[]>;
  lerAtividadeRecente(n: number): Promise<EventoFluxo[]>;
}
