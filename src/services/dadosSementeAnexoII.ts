/**
 * ============================================================================
 * DADOS SEMENTE OFICIAIS DO SISTEMA RADAR (QUADROS 2, 3 E ANEXO II DA PORTARIA)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Este arquivo fornece os dados iniciais do ICMBio para que o aplicativo já
 * abra populado com exemplos reais da Portaria (inclusive em demonstrações
 * offline para a CGTI):
 * 1. A estrutura de Unidades do ICMBio incluindo a categoria `coordenacao-geral`
 *    (responsável pela supervisão dos Macroprocessos);
 * 2. As 8 Categorias de Risco do Quadro 2 e as 6 Subcategorias de Integridade
 *    do Quadro 3 (Programa Integra+ — Portaria ICMBio nº 253/2026);
 * 3. O Caso de Controle completo do Anexo II da Metodologia RADAR:
 *    - Risco Operacional, P=3, I=5 -> Inerente 22 (Extremo), Sem controles (1.0)
 *    - Residual 22 (Extremo), Estratégia Mitigar, 3 KRIs trimestrais.
 */

import type {
  CategoriaRisco,
  FichaRisco,
  ObjetoContexto,
  UnidadeOrganizacional,
} from '../types/radar.types';
import { SUBCATEGORIAS_INTEGRIDADE_QUADRO_3 } from '../utils/calculadoraRiscoRadar';

/**
 * Unidades Organizacionais representativas do ICMBio (com `coordenacao-geral`).
 */
export const UNIDADES_SEMENTE: UnidadeOrganizacional[] = [
  {
    id: 'uni-presidencia',
    sigla: 'PRESIDÊNCIA',
    nome: 'Presidência do ICMBio / Comitê Interno de Governança (CIG)',
    tipo: 'presidencia',
  },
  {
    id: 'uni-diplan',
    sigla: 'DIPLAN',
    nome: 'Diretoria de Planejamento, Administração e Logística',
    tipo: 'diretoria',
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-dibio',
    sigla: 'DIBIO',
    nome: 'Diretoria de Pesquisa, Avaliação e Monitoramento da Biodiversidade',
    tipo: 'diretoria',
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-cgge',
    sigla: 'CGGE',
    nome: 'Coordenação-Geral de Gestão Estratégica (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgfin',
    sigla: 'CGFIN',
    nome: 'Coordenação-Geral de Finanças e Orçamento (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgti',
    sigla: 'CGTI',
    nome: 'Coordenação-Geral de Tecnologia da Informação (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgov',
    sigla: 'CGOV',
    nome: 'Coordenação de Governança e Gestão de Riscos (2ª Linha — Unidade Central)',
    tipo: 'coordenacao',
    unidadePaiId: 'uni-cgge',
  },
  {
    id: 'uni-gr1',
    sigla: 'GR-1 Norte',
    nome: 'Gerência Regional 1 — Amazônia',
    tipo: 'gerencia-regional',
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-parna-bsb',
    sigla: 'PARNA Brasília',
    nome: 'Parque Nacional de Brasília (Unidade de Conservação)',
    tipo: 'uc',
    unidadePaiId: 'uni-presidencia',
  },
];

/**
 * As 8 Categorias de Risco do Quadro 2 da Metodologia SEI 024421455
 * combinadas com o Apetite Declarado na DAR (Anexo III).
 */
export const CATEGORIAS_QUADRO_2_SEMENTE: CategoriaRisco[] = [
  {
    id: 1,
    nome: 'Estratégico',
    descricaoNormativa:
      'Eventos que afetam objetivos estratégicos e a missão institucional do ICMBio.',
    apetiteDeclarado: 'moderado',
    justificativaDar:
      'Admite-se risco residual até Médio em iniciativas estratégicas sob monitoramento.',
    subcategoriasPermitidas: [],
  },
  {
    id: 2,
    nome: 'Operacional',
    descricaoNormativa:
      'Falhas, deficiências ou inadequações em processos internos, pessoas ou sistemas.',
    apetiteDeclarado: 'moderado',
    justificativaDar:
      'Processos operacionais toleram nível residual até Médio; níveis Alto e Extremo são críticos.',
    subcategoriasPermitidas: [],
  },
  {
    id: 3,
    nome: 'Orçamentário/Financeiro',
    descricaoNormativa:
      'Eventos que comprometem a execução orçamentária, financeira ou contratual.',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Rigor fiscal e conformidade na execução de recursos públicos.',
    subcategoriasPermitidas: [],
  },
  {
    id: 4,
    nome: 'Conformidade/Legal',
    descricaoNormativa:
      'Descumprimento de leis, portarias, instruções normativas ou determinações de órgãos de controle.',
    apetiteDeclarado: 'baixo',
    justificativaDar: 'Baixa tolerância a desvios normativos e sanções legais.',
    subcategoriasPermitidas: [],
  },
  {
    id: 5,
    nome: 'Integridade',
    descricaoNormativa:
      'Vulnerabilidades relacionadas a corrupção, fraude, nepotismo, conflito de interesses ou assédio (Portaria ICMBio nº 253/2026 — Integra+).',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Apetite Baixo: qualquer risco residual acima de Baixo (Médio, Alto ou Extremo) é considerado Crítico.',
    subcategoriasPermitidas: [...SUBCATEGORIAS_INTEGRIDADE_QUADRO_3],
  },
  {
    id: 6,
    nome: 'Imagem/Reputação',
    descricaoNormativa:
      'Eventos que abalam a credibilidade e a confiança da sociedade no ICMBio.',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Preservação da credibilidade técnico-científica e socioambiental da Autarquia.',
    subcategoriasPermitidas: [],
  },
  {
    id: 7,
    nome: 'Socioambiental',
    descricaoNormativa:
      'Eventos que impactam ecossistemas, unidades de conservação ou populações tradicionais.',
    apetiteDeclarado: 'baixo',
    justificativaDar: 'Missão finalística de conservação da biodiversidade.',
    subcategoriasPermitidas: [],
  },
  {
    id: 8,
    nome: 'Tecnologia da Informação',
    descricaoNormativa:
      'Indisponibilidade de sistemas, incidentes cibernéticos ou perda de dados institucionais.',
    apetiteDeclarado: 'moderado',
    justificativaDar:
      'Sistemas suportam risco residual até Médio com plano de contingência ativo.',
    subcategoriasPermitidas: [],
  },
];

/**
 * Objetos de Gestão de Riscos iniciais (Quadro 1 da Metodologia).
 */
export const OBJETOS_CONTEXTO_SEMENTE: ObjetoContexto[] = [
  {
    id: 'obj-anexo-ii',
    tipoObjeto: 'Processo',
    nomeObjeto:
      'Gestão e Execução de Processos Críticos da Unidade (Caso de Controle Anexo II)',
    unidadeId: 'uni-cgov',
    macroprocessoSupervisorId: 'uni-cgge',
    diretoriaId: 'uni-diplan',
    objetivoEstrategicoAssociado:
      'Garantir a continuidade operacional e a governança dos processos institucionais do ICMBio.',
    insumosPrincipais:
      'Demandas via SEI, normativos internos e orientações técnicas.',
    entregasPrincipais:
      'Pareceres técnicos, despachos decisórios e relatórios gerenciais.',
    partesInteressadas:
      'Diretorias, Coordenações-Gerais, Unidades de Conservação e sociedade.',
    cicloAno: 2026,
  },
];

/**
 * Caso de Controle Oficial do Anexo II da Metodologia de Gestão de Riscos (SEI 024421455)
 * + um segundo risco de Integridade em estado `preliminar_cgov` para demonstrar o Passo 0.
 */
export const RISCOS_SEMENTE_ANEXO_II: FichaRisco[] = [
  {
    id: 'risco-anexo-ii-01',
    codigoRadar: 'RADAR-2026-001',
    objetoId: 'obj-anexo-ii',
    nomeObjetoCache:
      'Gestão e Execução de Processos Críticos da Unidade (Caso de Controle Anexo II)',
    responsavelRiscoNome: 'Gestor de Riscos da Unidade (1ª Linha)',
    causas:
      'concentração do conhecimento técnico em um único servidor, ausência de manuais operacionais padronizados e inexistência de substituto formalmente capacitado',
    eventoRisco:
      'afastamento inesperado ou rotatividade do servidor responsável pela condução do processo crítico',
    consequencias:
      'paralisação das entregas da unidade, atraso no cumprimento de prazos legais e perda de memória técnica institucional',
    objetivoAfetado:
      'continuidade e tempestividade das entregas previstas no Planejamento Estratégico do ICMBio',
    descricaoPadrao:
      'Devido o(a) concentração do conhecimento técnico em um único servidor, ausência de manuais operacionais padronizados e inexistência de substituto formalmente capacitado, poderá ocorrer o(a) afastamento inesperado ou rotatividade do servidor responsável pela condução do processo crítico, ocasionando o(a) paralisação das entregas da unidade, atraso no cumprimento de prazos legais e perda de memória técnica institucional e impactando o alcance do continuidade e tempestividade das entregas previstas no Planejamento Estratégico do ICMBio.',
    categoriaId: 2,
    categoriaNome: 'Operacional',
    testeIntegridadeAplicavel: false,
    probabilidade: 3,
    justificativaProbabilidade:
      'Probabilidade Média (3): processo depende atualmente de um único ponto focal sem documentação de backup.',
    impacto: 5,
    justificativaImpacto:
      'Impacto Muito Alto (5): a interrupção paralisa entregas críticas da unidade sem alternativa imediata.',
    nivelInerente: 22,
    classificacaoInerente: 'Extremo',
    possuiEvidenciaControle: false,
    nivelEficaciaControle: 'Inexistente',
    fatorControle: 1.0,
    nivelResidual: 22,
    classificacaoResidual: 'Extremo',
    statusCritico: 'sim',
    isCritico: true,
    memoriaCalculo:
      'P=3 e I=5 → Inerente = 22 (Extremo, Quadro 7) × Fator 1 (Inexistente, sem evidência comprovada, Quadro 6) = Residual 22 (Extremo, Quadro 8) → Crítico frente à DAR (moderado): SIM',
    origemPreliminarCgov: false,
    statusFluxo: 'em_validacao_cg',
    estrategiaPrincipal: 'Mitigar',
    controlesExistentes: [],
    respostasTratamento: [
      {
        id: 'trat-anexo-ii-1',
        estrategia: 'Mitigar',
        acaoOQue:
          'Elaborar e publicar Procedimento Operacional Padrão (POP) passo a passo das rotinas críticas.',
        justificativaPorQue:
          'Eliminar a dependência exclusiva da memória individual do servidor.',
        localOnde: 'Base de Conhecimento no SEI / Wiki Institucional',
        responsavelQuem: 'Coordenador da Unidade',
        prazoQuando: '2026-12-15',
        procedimentoComo:
          'Mapeamento do fluxo em conjunto com a equipe e validação pela Coordenação-Geral.',
        custoQuanto: 'Sem custo adicional',
        statusExecucao: 'em_andamento',
      },
      {
        id: 'trat-anexo-ii-2',
        estrategia: 'Mitigar',
        acaoOQue:
          'Designar e capacitar servidor suplente mediante rodízio assistido de processos.',
        justificativaPorQue:
          'Garantir continuidade imediata em férias, licenças ou movimentações.',
        localOnde: 'Unidade Organizacional',
        responsavelQuem: 'Chefe de Divisão / Coordenador',
        prazoQuando: '2026-12-30',
        procedimentoComo:
          'Instrução conjunta de pelo menos 5 processos reais no SEI com registro de revisão.',
        custoQuanto: 'Sem custo adicional',
        statusExecucao: 'nao_iniciada',
      },
    ],
    kris: [
      {
        id: 'kri-anexo-ii-1',
        nomeIndicador: 'Percentual de atividades críticas documentadas em POP',
        formulaCalculo:
          '(Nº de atividades críticas com POP publicado / Total de atividades críticas) × 100',
        fonteDados: 'Processo SEI de Gestão da Qualidade da Unidade',
        periodicidade: 'Trimestral',
        metaAlvo: '100%',
        limiteAlerta: 'Abaixo de 70%',
        responsavelMedicao: 'Ponto Focal de Gestão de Riscos',
        medicoes: [
          {
            id: 'med-1',
            dataMedicao: '2026-10-15',
            valorApurado: '60%',
            emAlerta: true,
            observacao: '3 de 5 fluxos críticos já documentados.',
          },
        ],
      },
      {
        id: 'kri-anexo-ii-2',
        nomeIndicador:
          'Percentual de processos críticos com substituto capacitado ativo',
        formulaCalculo:
          '(Nº de processos com pelo menos 2 servidores habilitados / Total de processos críticos) × 100',
        fonteDados: 'Matriz de Polivalência da Coordenação',
        periodicidade: 'Trimestral',
        metaAlvo: '100%',
        limiteAlerta: 'Abaixo de 80%',
        responsavelMedicao: 'Coordenador da Unidade',
        medicoes: [],
      },
      {
        id: 'kri-anexo-ii-3',
        nomeIndicador:
          'Taxa de processos críticos com prazo vencido por ausência do titular',
        formulaCalculo:
          '(Nº de processos atrasados em períodos de afastamento / Total de processos no período) × 100',
        fonteDados: 'Painel de Controle de Processos SEI',
        periodicidade: 'Trimestral',
        metaAlvo: '0%',
        limiteAlerta: 'Acima de 5%',
        responsavelMedicao: 'Ponto Focal de Gestão de Riscos',
        medicoes: [],
      },
    ],
    historicoFluxo: [
      {
        id: 'hist-1',
        etapa: 'submissao_1a_linha',
        acao: 'submetido',
        usuarioNome: 'Gestor de Riscos (1ª Linha)',
        usuarioPapel: 'gestor',
        despachoTexto:
          'Ficha elaborada conforme Caso de Controle do Anexo II da Metodologia RADAR.',
        criadoEm: '2026-11-09T10:00:00Z',
      },
    ],
  },
];
