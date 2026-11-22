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

/**
 * Unidades Organizacionais representativas do ICMBio (com `coordenacao-geral`).
 */
export const UNIDADES_SEMENTE: UnidadeOrganizacional[] = [
  {
    id: 'uni-presidencia',
    sigla: 'PRESIDÊNCIA',
    nome: 'Presidência do ICMBio / Comitê Interno de Governança (CIG)',
    tipo: 'presidencia',
    ativa: true,
  },
  {
    id: 'uni-diplan',
    sigla: 'DIPLAN',
    nome: 'Diretoria de Planejamento, Administração e Logística',
    tipo: 'diretoria',
    ativa: true,
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-dibio',
    sigla: 'DIBIO',
    nome: 'Diretoria de Pesquisa, Avaliação e Monitoramento da Biodiversidade',
    tipo: 'diretoria',
    ativa: true,
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-cgge',
    sigla: 'CGGE',
    nome: 'Coordenação-Geral de Gestão Estratégica (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    ativa: true,
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgfin',
    sigla: 'CGFIN',
    nome: 'Coordenação-Geral de Finanças e Orçamento (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    ativa: true,
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgti',
    sigla: 'CGTI',
    nome: 'Coordenação-Geral de Tecnologia da Informação (Supervisora de Macroprocesso)',
    tipo: 'coordenacao-geral',
    ativa: true,
    unidadePaiId: 'uni-diplan',
  },
  {
    id: 'uni-cgov',
    sigla: 'CGOV',
    nome: 'Coordenação de Governança e Gestão de Riscos (2ª Linha — Unidade Central)',
    tipo: 'coordenacao',
    ativa: true,
    unidadePaiId: 'uni-cgge',
  },
  {
    id: 'uni-gr1',
    sigla: 'GR-1 Norte',
    nome: 'Gerência Regional 1 — Amazônia',
    tipo: 'gerencia-regional',
    ativa: true,
    unidadePaiId: 'uni-presidencia',
  },
  {
    id: 'uni-parna-bsb',
    sigla: 'PARNA Brasília',
    nome: 'Parque Nacional de Brasília (Unidade de Conservação)',
    tipo: 'uc',
    ativa: true,
    unidadePaiId: 'uni-presidencia',
  },
];

/**
 * As 8 Categorias de Risco do Quadro 2 da Metodologia SEI 024421455
 * combinadas com o Apetite Declarado na DAR (Anexo III).
 */
export const CATEGORIAS_QUADRO_2_SEMENTE: CategoriaRisco[] = [
  {
    id: 2,
    nome: 'Operacional',
    descricaoNormativa:
      'Eventos que podem comprometer as atividades da ICMBio, normalmente associados a falhas, deficiência ou inadequação de processos internos, pessoas, infraestrutura e sistemas',
    apetiteDeclarado: 'moderado',
    justificativaDar:
      'Processos operacionais toleram nível residual até Médio; níveis Alto e Extremo são críticos.',
  },
  {
    id: 4,
    nome: 'Legal',
    descricaoNormativa:
      'Eventos derivados de alterações legislativas ou normativas que podem comprometer as atividades da ICMBio',
    apetiteDeclarado: 'baixo',
    justificativaDar: 'Baixa tolerância a desvios normativos e sanções legais.',
  },
  {
    id: 3,
    nome: 'Financeiro/Orçamentário',
    descricaoNormativa:
      'Eventos que podem comprometer a capacidade da ICMBio de contar com os recursos orçamentários e financeiros necessários à realização de suas atividades, ou eventos que possam comprometer a própria execução orçamentária, como atrasos no cronograma de licitações',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Rigor fiscal e conformidade na execução de recursos públicos.',
  },
  {
    id: 6,
    nome: 'Reputação',
    descricaoNormativa:
      'Eventos que podem comprometer a confiança da sociedade em relação à capacidade do ICMBio em cumprir sua missão institucional, interferem diretamente na imagem da autarquia',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Preservação da credibilidade técnico-científica e socioambiental da Autarquia.',
  },
  {
    id: 5,
    nome: 'Integridade',
    descricaoNormativa:
      'Eventos que podem favorecer ou facilitar a ocorrência de práticas de corrupção, fraudes, irregularidades e/ou desvios éticos e de conduta, podendo comprometer os objetivos da instituição',
    apetiteDeclarado: 'baixo',
    justificativaDar:
      'Apetite Baixo: qualquer risco residual acima de Baixo (Médio, Alto ou Extremo) é considerado Crítico.',
  },
  // As 3 categorias abaixo entraram com o Quadro 2: nascem sem apetite
  // (`pendente_dar`) e sem justificativa; a CGOV decide na DAR.
  {
    id: 9,
    nome: 'Riscos da visitação',
    descricaoNormativa:
      'Eventos que podem comprometer a segurança dos visitantes durante atividades de uso público nas Unidades de Conservação, decorrentes de perigos inerentes ao ambiente natural ou das operações necessárias para a realização da visitação, tais como trilhas, atrativos, embarcações, atividades recreativas e serviços de apoio.',
    apetiteDeclarado: 'pendente_dar',
    justificativaDar: '',
  },
  {
    id: 10,
    nome: 'Ocupacionais',
    descricaoNormativa:
      'Eventos que podem comprometer a saúde, a integridade física ou a segurança dos servidores e colaboradores do ICMBio no desempenho de suas atividades institucionais.',
    apetiteDeclarado: 'pendente_dar',
    justificativaDar: '',
  },
  {
    id: 11,
    nome: 'Privacidade e Proteção de Dados',
    // Texto literal do Quadro 2 (a "Lei nº 13.709/2013" é erro material da
    // minuta: a LGPD é de 2018; não corrigir aqui, ver matriz-regras-regime-b).
    descricaoNormativa:
      'Eventos que possam comprometer a proteção, a privacidade e a segurança dos dados pessoais tratados pelo ICMBio, tais como vazamentos de informações, acessos não autorizados, uso inadequado de dados, falhas nos controles de segurança ou descumprimento das disposições da Lei nº 13.709/2013 - Lei Geral de Proteção de Dados Pessoais (LGPD)',
    apetiteDeclarado: 'pendente_dar',
    justificativaDar: '',
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
    processoId: null,
    processoNome: null,
    processoAtivo: null,
    unidadeAtiva: true,
  },
  {
    id: 'obj-fiscalizacao-autos',
    tipoObjeto: 'Macroprocesso',
    nomeObjeto:
      'Lavratura e Julgamento de Autos de Infração Ambiental em Unidades de Conservação',
    unidadeId: 'uni-parna-bsb',
    macroprocessoSupervisorId: 'uni-cgge',
    diretoriaId: 'uni-diplan',
    objetivoEstrategicoAssociado:
      'Assegurar a integridade, rastreabilidade e efetividade punitiva contra ilícitos ambientais.',
    insumosPrincipais:
      'Relatórios de fiscalização em campo, autos de infração e defesas administrativas.',
    entregasPrincipais:
      'Decisões de instrução e julgamento tempestivas e livres de conflito de interesses.',
    partesInteressadas:
      'Unidades de Conservação, Procuradoria Federal Especializada, Corregedoria e sociedade.',
    cicloAno: 2026,
    processoId: null,
    processoNome: null,
    processoAtivo: null,
    unidadeAtiva: true,
  },
  {
    id: 'obj-autorizacao-uc',
    tipoObjeto: 'Processo',
    nomeObjeto:
      'Autorização Direta de Uso Público e Eventos em Unidades de Conservação',
    unidadeId: 'uni-gr1',
    macroprocessoSupervisorId: 'uni-cgge',
    diretoriaId: 'uni-dibio',
    objetivoEstrategicoAssociado:
      'Conciliar visitação ordenada e conservação da biodiversidade sem impactos socioambientais adversos.',
    insumosPrincipais:
      'Requerimentos no SEI, Planos de Manejo e pareceres técnicos das UCs.',
    entregasPrincipais:
      'Autorizações emitidas com condicionantes socioambientais monitoradas.',
    partesInteressadas:
      'Chefias de UCs, comunidades tradicionais, pesquisadores e visitantes.',
    cicloAno: 2026,
    processoId: null,
    processoNome: null,
    processoAtivo: null,
    unidadeAtiva: true,
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
    unidadeId: 'uni-cgov',
    atualizadoEm: null,
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
  {
    id: 'risco-integra-02',
    codigoRadar: 'RADAR-2026-002',
    objetoId: 'obj-fiscalizacao-autos',
    unidadeId: 'uni-parna-bsb',
    atualizadoEm: null,
    nomeObjetoCache:
      'Lavratura e Julgamento de Autos de Infração Ambiental em Unidades de Conservação',
    responsavelRiscoNome: 'Coordenação de Fiscalização Setorial (1ª Linha)',
    causas:
      'ausência de segregação formal de funções na revisão de processos sancionadores e falta de declaração automatizada de impedimento no SEI',
    eventoRisco:
      'atuação de servidor em instrução de auto de infração com potencial conflito de interesses ou pressão externa indevida',
    consequencias:
      'nulidade processual, prescrição da pretensão punitiva e dano severo à credibilidade institucional do ICMBio',
    objetivoAfetado:
      'integridade e efetividade da fiscalização ambiental (Programa Integra+ — Portaria ICMBio nº 253/2026)',
    descricaoPadrao:
      'Devido o(a) ausência de segregação formal de funções na revisão de processos sancionadores e falta de declaração automatizada de impedimento no SEI, poderá ocorrer o(a) atuação de servidor em instrução de auto de infração com potencial conflito de interesses ou pressão externa indevida, ocasionando o(a) nulidade processual, prescrição da pretensão punitiva e dano severo à credibilidade institucional do ICMBio e impactando o alcance do integridade e efetividade da fiscalização ambiental (Programa Integra+ — Portaria ICMBio nº 253/2026).',
    categoriaId: 5,
    categoriaNome: 'Integridade',
    subcategoriaIntegridade: 'Conflito de interesses',
    testeIntegridadeAplicavel: true,
    probabilidade: 2,
    justificativaProbabilidade:
      'Probabilidade Baixa (2): há supervisão hierárquica, mas sem trava sistêmica de impedimento.',
    impacto: 5,
    justificativaImpacto:
      'Impacto Muito Alto (5): compromete a integridade decisória e a imagem institucional.',
    nivelInerente: 19,
    classificacaoInerente: 'Extremo',
    possuiEvidenciaControle: true,
    nivelEficaciaControle: 'Fraco',
    fatorControle: 0.9,
    nivelResidual: 17.1,
    classificacaoResidual: 'Extremo',
    statusCritico: 'sim',
    isCritico: true,
    memoriaCalculo:
      'P=2 e I=5 → Inerente = 19 (Extremo, Quadro 7) × Fator 0,9 (Fraco, com evidência comprovada, Quadro 6) = Residual 17,1 (Extremo, Quadro 8, sem arredondamento prévio) → Crítico frente à DAR (baixo): SIM',
    origemPreliminarCgov: true,
    statusFluxo: 'em_homologacao_dir',
    estrategiaPrincipal: 'Mitigar',
    controlesExistentes: [
      {
        id: 'ctrl-integra-01',
        descricaoControle:
          'Despacho de encaminhamento individual da chefia imediata no SEI.',
        evidenciaFuncionamento:
          'Amostragem de 10 processos sancionadores instruídos no 3º trimestre.',
        possuiEvidenciaComprovada: true,
        desenhoAdequado: false,
        operacaoComprovada: true,
      },
    ],
    respostasTratamento: [
      {
        id: 'trat-integra-1',
        estrategia: 'Mitigar',
        acaoOQue:
          'Instituir revisão colegiada em dupla assinatura e termo obrigatório de ausência de conflito de interesses no SEI.',
        justificativaPorQue:
          'Atender ao Programa Integra+ (Portaria ICMBio nº 253/2026) e blindar o processo decisório.',
        localOnde: 'Fluxo SEI de Instrução e Julgamento',
        responsavelQuem: 'Coordenador-Geral de Fiscalização',
        prazoQuando: '2026-12-20',
        procedimentoComo:
          'Inclusão de bloco de assinatura obrigatória com checklist de integridade.',
        custoQuanto: 'Sem custo adicional',
        statusExecucao: 'em_andamento',
      },
    ],
    kris: [
      {
        id: 'kri-integra-1',
        nomeIndicador:
          'Percentual de processos sancionadores revisados em dupla assinatura com termo de integridade',
        formulaCalculo:
          '(Nº de processos com dupla revisão e termo assinado / Total de processos julgados) × 100',
        fonteDados: 'Relatório de Conformidade SEI',
        periodicidade: 'Trimestral',
        metaAlvo: '100%',
        limiteAlerta: 'Abaixo de 95%',
        responsavelMedicao: 'Ponto Focal de Integridade',
        medicoes: [
          {
            id: 'med-integra-1',
            dataMedicao: '2026-10-30',
            valorApurado: '96%',
            emAlerta: false,
            observacao: '48 de 50 processos com dupla assinatura verificada.',
          },
        ],
      },
    ],
    historicoFluxo: [
      {
        id: 'hist-integra-1',
        etapa: 'submissao_1a_linha',
        acao: 'submetido',
        usuarioNome: 'CGOV — Passo 0 (Skill cgov-gestao-riscos-v4)',
        usuarioPapel: 'cgov',
        despachoTexto:
          'Risco preliminar identificado a partir da análise normativa e validado pela 1ª Linha.',
        criadoEm: '2026-11-08T14:20:00Z',
      },
      {
        id: 'hist-integra-2',
        etapa: 'validacao_cg',
        acao: 'aprovado_1_clique',
        usuarioNome: 'Coordenador-Geral (2º Degrau — CG)',
        usuarioPapel: 'coordenador_geral',
        despachoTexto:
          'Validado em 1 clique pela Coordenação-Geral e escalado à Diretoria por se tratar de Risco Crítico (Residual 17,1 Extremo > Apetite Baixo).',
        criadoEm: '2026-11-09T09:15:00Z',
      },
    ],
  },
  {
    id: 'risco-socio-03',
    codigoRadar: 'RADAR-2026-003',
    objetoId: 'obj-autorizacao-uc',
    unidadeId: 'uni-gr1',
    atualizadoEm: null,
    nomeObjetoCache:
      'Autorização Direta de Uso Público e Eventos em Unidades de Conservação',
    responsavelRiscoNome: 'Gestor da Unidade de Conservação (1ª Linha)',
    causas:
      'atraso na consolidação dos relatórios de monitoramento de impacto em trilhas de alta visitação',
    eventoRisco:
      'emissão de autorização de evento com capacidade de carga desatualizada em área sensível da UC',
    consequencias:
      'degradação pontual de habitat e necessidade de suspensão temporária de atrativos',
    objetivoAfetado:
      'conservação da biodiversidade e qualidade da experiência de visitação nas UCs',
    descricaoPadrao:
      'Devido o(a) atraso na consolidação dos relatórios de monitoramento de impacto em trilhas de alta visitação, poderá ocorrer o(a) emissão de autorização de evento com capacidade de carga desatualizada em área sensível da UC, ocasionando o(a) degradação pontual de habitat e necessidade de suspensão temporária de atrativos e impactando o alcance do conservação da biodiversidade e qualidade da experiência de visitação nas UCs.',
    categoriaId: 2,
    categoriaNome: 'Operacional',
    testeIntegridadeAplicavel: true,
    justificativaNaoIntegridade:
      'A vulnerabilidade decorre de defasagem técnica nos parâmetros biofísicos de capacidade de carga, sem indício de favorecimento ilícito ou desvio ético.',
    probabilidade: 2,
    justificativaProbabilidade:
      'Probabilidade Baixa (2): ocorre apenas em picos sazonais de alta temporada.',
    impacto: 4,
    justificativaImpacto:
      'Impacto Alto (4): afeta área sensível de conservação (P=2, I=4 -> Inerente 14 no Quadro 7).',
    // Lido do Quadro 7 (linha I=4, coluna P=2). Conferido pelo teste
    // tests/unit/dadosSementeConsistencia.spec.ts — não digite à mão.
    nivelInerente: 14,
    classificacaoInerente: 'Alto',
    possuiEvidenciaControle: true,
    nivelEficaciaControle: 'Satisfatório',
    fatorControle: 0.6,
    // 14 × 0,6 = 8,4 → Médio (Quadro 8). Na categoria Operacional o apetite da
    // DAR é Moderado e Médio cabe nele: este risco NÃO é Crítico. (Valores
    // conferidos rodando o motor `calcularRiscoCompletoRadar`.)
    nivelResidual: 8.4,
    classificacaoResidual: 'Médio',
    statusCritico: 'nao',
    isCritico: false,
    memoriaCalculo:
      'P=2 e I=4 → Inerente = 14 (Alto, Quadro 7) × Fator 0,6 (Satisfatório, com evidência comprovada, Quadro 6) = Residual 8,4 (Médio, Quadro 8) → Crítico frente à DAR (moderado): NAO',
    origemPreliminarCgov: false,
    statusFluxo: 'aprovado',
    estrategiaPrincipal: 'Mitigar',
    controlesExistentes: [
      {
        id: 'ctrl-socio-01',
        descricaoControle:
          'Parecer técnico prévio fundamentado no Plano de Manejo da Unidade de Conservação.',
        evidenciaFuncionamento:
          'Despachos técnicos anexados aos processos SEI de autorização do último semestre.',
        possuiEvidenciaComprovada: true,
        desenhoAdequado: true,
        operacaoComprovada: true,
      },
    ],
    respostasTratamento: [
      {
        id: 'trat-socio-1',
        estrategia: 'Mitigar',
        acaoOQue:
          'Integrar painel semestral de indicadores de impacto de visitação ao checklist de análise de autorizações.',
        justificativaPorQue:
          'Reduzir o nível residual de 8,4 (Médio) para a faixa Baixo (≤ 5).',
        localOnde: 'Gerência Regional e Chefias de UC',
        responsavelQuem: 'Coordenador de Uso Público',
        prazoQuando: '2026-11-30',
        procedimentoComo:
          'Atualização semestral obrigatória da planilha de capacidade de carga no SEI.',
        custoQuanto: 'Sem custo adicional',
        statusExecucao: 'concluida',
      },
    ],
    kris: [
      {
        id: 'kri-socio-1',
        nomeIndicador:
          'Percentual de autorizações emitidas com laudo de capacidade de carga atualizado nos últimos 6 meses',
        formulaCalculo:
          '(Nº de autorizações com laudo vigente / Total de autorizações emitidas) × 100',
        fonteDados: 'Processos SEI de Autorização de Uso Público',
        periodicidade: 'Trimestral',
        metaAlvo: '100%',
        limiteAlerta: 'Abaixo de 90%',
        responsavelMedicao: 'Analista Ambiental — Uso Público',
        medicoes: [
          {
            id: 'med-socio-1',
            dataMedicao: '2026-11-01',
            valorApurado: '100%',
            emAlerta: false,
            observacao: 'Todas as 18 autorizações do trimestre conferidas.',
          },
        ],
      },
    ],
    historicoFluxo: [
      {
        id: 'hist-socio-1',
        etapa: 'submissao_1a_linha',
        acao: 'submetido',
        usuarioNome: 'Gestor da UC (1ª Linha)',
        usuarioPapel: 'gestor',
        despachoTexto:
          'Submetido com justificativa formal do Teste de Integridade e evidência de controle Satisfatório (0,6).',
        criadoEm: '2026-11-05T11:00:00Z',
      },
      {
        id: 'hist-socio-2',
        etapa: 'validacao_cg',
        acao: 'aprovado_1_clique',
        usuarioNome: 'Coordenador-Geral (2º Degrau — CG)',
        usuarioPapel: 'coordenador_geral',
        // Operacional tem apetite Moderado na DAR: o residual 8,4 (Médio) cabe
        // nele, então o risco NÃO é crítico e a aprovação da CG encerra o
        // fluxo, sem homologação da Diretoria (spec 7.1; migração 20261115004).
        // Por isso não há um 3º registro de homologação.
        despachoTexto:
          'Aprovado em 1 clique pela CG para compor o Plano de Gestão de Riscos do ICMBio (Residual 8,4 = Médio, dentro do apetite Moderado da DAR da categoria Operacional: não é Risco Crítico e não exige homologação da Diretoria).',
        criadoEm: '2026-11-06T15:30:00Z',
      },
    ],
  },
];
