/**
 * ============================================================================
 * STORE CENTRAL DE GESTÃO DE RISCOS (`riscosStore.ts`) — SISTEMA RADAR
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Esta Store Pinia gerencia o ciclo completo de vida das Fichas de Risco:
 * 1. Carrega os dados iniciais do Caso de Controle do Anexo II (e salva
 *    alterações no navegador via localStorage ou no Supabase quando configurado);
 * 2. Calcula automaticamente o Risco Inerente, a Trava de Evidência de Controle,
 *    o Risco Residual e a Criticidade frente à DAR usando `calculadoraRiscoRadar.ts`;
 * 3. Opera o Fluxo de Governança em 3 Degraus ("Aprovação em 1 Clique"):
 *    - 1º Degrau (Gestor / 1ª Linha): submete para a Coordenação-Geral;
 *    - 2º Degrau (Líder de Macroprocesso / CG): aprova em 1 clique. Se o risco
 *      for Crítico (fora do apetite da DAR), escala automaticamente para o Diretor!
 *    - 3º Degrau (Diretor): homologa em 1 clique os Riscos Críticos para o
 *      Plano de Gestão de Riscos do ICMBio;
 * 4. Separa Monitoramento Contínuo (lançar KRI ou andamento de ação 5W2H mantém
 *    o status 'aprovado') de Reavaliação de Nota (alterar P, I ou Fator reabre
 *    o status para 'em_validacao_cg').
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  ApetiteDeclarado,
  CategoriaRisco,
  ClasseRisco,
  FichaRisco,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  ObjetoContexto,
  RespostaTratamento5W2H,
  UnidadeOrganizacional,
} from '../types/radar.types';
import {
  CATEGORIAS_QUADRO_2_SEMENTE,
  OBJETOS_CONTEXTO_SEMENTE,
  RISCOS_SEMENTE_ANEXO_II,
  UNIDADES_SEMENTE,
} from '../services/dadosSementeAnexoII';
import {
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
} from '../utils/calculadoraRiscoRadar';
import { importarTabelaMarkdownSkill } from '../utils/importadorSkillMarkdown';
import { riscoCorrespondeAoTermo } from '../utils/filtrosRiscos';
import { useAuthStore } from './authStore';

export const useRiscosStore = defineStore('riscos', () => {
  // Clona os dados semente para garantir isolamento entre testes e sessões:
  const riscos = ref<FichaRisco[]>(
    JSON.parse(JSON.stringify(RISCOS_SEMENTE_ANEXO_II))
  );
  const categorias = ref<CategoriaRisco[]>(
    JSON.parse(JSON.stringify(CATEGORIAS_QUADRO_2_SEMENTE))
  );
  const unidades = ref<UnidadeOrganizacional[]>(
    JSON.parse(JSON.stringify(UNIDADES_SEMENTE))
  );
  const objetosContexto = ref<ObjetoContexto[]>(
    JSON.parse(JSON.stringify(OBJETOS_CONTEXTO_SEMENTE))
  );

  // Estado reativo de busca global (br-header #main-searchbox) e filtros da Matriz 5x5:
  const termoBuscaGlobal = ref<string>('');
  const celulaMatrizSelecionada = ref<{
    p: NivelProbabilidade;
    i: NivelImpacto;
  } | null>(null);
  const categoriaFiltroId = ref<number | null>(null);

  // Getters computados para os painéis da CGOV, CGs e Diretorias:
  const riscosFiltrados = computed(() => {
    const termo = termoBuscaGlobal.value.trim().toLowerCase();
    return riscos.value.filter((r) => {
      if (
        celulaMatrizSelecionada.value &&
        (r.probabilidade !== celulaMatrizSelecionada.value.p ||
          r.impacto !== celulaMatrizSelecionada.value.i)
      ) {
        return false;
      }
      if (
        categoriaFiltroId.value !== null &&
        r.categoriaId !== categoriaFiltroId.value
      ) {
        return false;
      }
      // A regra de busca fica em `utils/filtrosRiscos.ts`, compartilhada com a página /riscos.
      return riscoCorrespondeAoTermo(r, termo);
    });
  });

  const riscosCriticosCarteira = computed(() =>
    riscos.value.filter((r) => r.statusCritico === 'sim')
  );

  const filaValidacaoCg = computed(() =>
    riscos.value.filter((r) => r.statusFluxo === 'em_validacao_cg')
  );

  const filaHomologacaoDiretoria = computed(() =>
    riscos.value.filter((r) => r.statusFluxo === 'em_homologacao_dir')
  );

  const trilhaAuditoriaGlobal = computed(() => {
    const eventos: Array<{
      id: string;
      riscoId: string;
      codigoRadar: string;
      nomeObjeto: string;
      categoriaNome: string;
      nivelResidual: number;
      classificacaoResidual: ClasseRisco;
      etapa: string;
      acao: string;
      usuarioNome: string;
      usuarioPapel: string;
      despachoTexto?: string;
      criadoEm: string;
    }> = [];

    for (const r of riscos.value) {
      for (const h of r.historicoFluxo) {
        eventos.push({
          id: h.id,
          riscoId: r.id,
          codigoRadar: r.codigoRadar,
          nomeObjeto: r.nomeObjetoCache || 'Objeto de Gestão de Riscos',
          categoriaNome: r.categoriaNome,
          nivelResidual: r.nivelResidual,
          classificacaoResidual: r.classificacaoResidual,
          etapa: h.etapa,
          acao: h.acao,
          usuarioNome: h.usuarioNome,
          usuarioPapel: h.usuarioPapel,
          despachoTexto: h.despachoTexto,
          criadoEm: h.criadoEm,
        });
      }
    }

    return eventos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  });

  const resumoPorClasse = computed(() => {
    const contagem: Record<ClasseRisco, number> = {
      Baixo: 0,
      Médio: 0,
      Alto: 0,
      Extremo: 0,
    };
    for (const r of riscos.value) {
      contagem[r.classificacaoResidual] =
        (contagem[r.classificacaoResidual] || 0) + 1;
    }
    return contagem;
  });

  function obterApetitePorCategoria(categoriaId: number): ApetiteDeclarado {
    const cat = categorias.value.find((c) => c.id === categoriaId);
    return cat ? cat.apetiteDeclarado : 'pendente_dar';
  }

  /**
   * Cria ou atualiza uma Ficha de Risco recalculando todas as notas pelo Motor RADAR.
   */
  function salvarOuAtualizarRisco(parcial: Partial<FichaRisco>): FichaRisco {
    const categoriaId = parcial.categoriaId ?? 2;
    const catObj =
      categorias.value.find((c) => c.id === categoriaId) ?? categorias.value[1];
    const p = (parcial.probabilidade ?? 3) as NivelProbabilidade;
    const i = (parcial.impacto ?? 3) as NivelImpacto;
    const eficacia = (parcial.nivelEficaciaControle ??
      'Inexistente') as NivelEficaciaControle;
    const evidencia = Boolean(parcial.possuiEvidenciaControle);

    const calculo = calcularRiscoCompletoRadar({
      probabilidade: p,
      impacto: i,
      eficaciaControle: eficacia,
      possuiEvidenciaComprovada: evidencia,
      apetiteCategoria: catObj.apetiteDeclarado,
    });

    const causas = parcial.causas ?? 'Causa em detalhamento';
    const eventoRisco = parcial.eventoRisco ?? 'Evento de risco identificado';
    const consequencias = parcial.consequencias ?? 'Impacto nas entregas';
    const objetivoAfetado =
      parcial.objetivoAfetado ?? 'Alcance dos objetivos institucionais';

    const descricaoPadrao = gerarSintaxePadraoRisco({
      causas,
      eventoRisco,
      consequencias,
      objetivoAfetado,
    });

    const existenteIdx = parcial.id
      ? riscos.value.findIndex((r) => r.id === parcial.id)
      : -1;

    const novaFicha: FichaRisco = {
      id: parcial.id ?? `risco-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      codigoRadar:
        parcial.codigoRadar ??
        `RADAR-2026-${String(riscos.value.length + 1).padStart(3, '0')}`,
      objetoId: parcial.objetoId ?? objetosContexto.value[0].id,
      nomeObjetoCache:
        parcial.nomeObjetoCache ?? objetosContexto.value[0].nomeObjeto,
      responsavelRiscoNome:
        parcial.responsavelRiscoNome ?? 'Gestor de Riscos (1ª Linha)',
      causas,
      eventoRisco,
      consequencias,
      objetivoAfetado,
      descricaoPadrao,
      categoriaId: catObj.id,
      categoriaNome: catObj.nome,
      subcategoriaIntegridade: parcial.subcategoriaIntegridade,
      testeIntegridadeAplicavel: Boolean(parcial.testeIntegridadeAplicavel),
      justificativaNaoIntegridade: parcial.justificativaNaoIntegridade,
      probabilidade: p,
      justificativaProbabilidade: parcial.justificativaProbabilidade,
      impacto: i,
      justificativaImpacto: parcial.justificativaImpacto,
      nivelInerente: calculo.nivelInerente,
      classificacaoInerente: calculo.classificacaoInerente,
      possuiEvidenciaControle: evidencia,
      nivelEficaciaControle: calculo.eficaciaFinal,
      fatorControle: calculo.fatorFinal,
      nivelResidual: calculo.nivelResidual,
      classificacaoResidual: calculo.classificacaoResidual,
      statusCritico: calculo.statusCritico,
      isCritico: calculo.isCritico,
      memoriaCalculo: calculo.memoriaCalculo,
      origemPreliminarCgov: Boolean(parcial.origemPreliminarCgov),
      statusFluxo: parcial.statusFluxo ?? 'rascunho',
      estrategiaPrincipal: parcial.estrategiaPrincipal ?? 'Mitigar',
      controlesExistentes: parcial.controlesExistentes ?? [],
      respostasTratamento: parcial.respostasTratamento ?? [],
      kris: parcial.kris ?? [],
      historicoFluxo: parcial.historicoFluxo ?? [],
    };

    if (existenteIdx >= 0) {
      riscos.value[existenteIdx] = novaFicha;
    } else {
      riscos.value.unshift(novaFicha);
    }

    return novaFicha;
  }

  /**
   * 1º Degrau -> 2º Degrau: Gestor da 1ª Linha submete para validação da Coordenação-Geral.
   */
  function submeterParaValidacaoCg(riscoId: string): void {
    const auth = useAuthStore();
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;

    risco.statusFluxo = 'em_validacao_cg';
    risco.historicoFluxo.push({
      id: `hist-${Date.now()}`,
      etapa: 'submissao_1a_linha',
      acao: 'submetido',
      usuarioNome: auth.usuarioAtual.nome,
      usuarioPapel: auth.usuarioAtual.papel,
      despachoTexto:
        'Ficha submetida pela 1ª Linha para validação da Coordenação-Geral supervisora do Macroprocesso.',
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * 2º Degrau: Líder de Macroprocesso (Coordenação-Geral ou GR) aprova em 1 clique.
   * - Se o risco for Crítico (`isCritico === true` ou `statusCritico === 'sim'`),
   *   escala automaticamente para homologação da Diretoria (`em_homologacao_dir`).
   * - Se estiver dentro do apetite da DAR, já vai direto para `'aprovado'`.
   */
  function aprovarEmUmCliqueCg(
    riscoId: string,
    despachoOpcional?: string
  ): void {
    const auth = useAuthStore();
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;

    if (risco.isCritico || risco.statusCritico === 'sim') {
      risco.statusFluxo = 'em_homologacao_dir';
    } else {
      risco.statusFluxo = 'aprovado';
    }

    risco.historicoFluxo.push({
      id: `hist-${Date.now()}`,
      etapa: 'validacao_cg',
      acao: 'aprovado_1_clique',
      usuarioNome: auth.usuarioAtual.nome,
      usuarioPapel: auth.usuarioAtual.papel,
      despachoTexto:
        despachoOpcional ||
        (risco.statusFluxo === 'em_homologacao_dir'
          ? 'Validado em 1 clique pela Coordenação-Geral e encaminhado à Diretoria por se tratar de Risco Crítico.'
          : 'Aprovado em 1 clique pela Coordenação-Geral (Risco dentro do apetite da DAR).'),
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * 3º Degrau: Diretor homologa Risco Crítico em 1 clique para o Plano de Gestão de Riscos.
   */
  function homologarEmUmCliqueDiretoria(
    riscoId: string,
    despachoOpcional?: string
  ): void {
    const auth = useAuthStore();
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;

    risco.statusFluxo = 'aprovado';
    risco.historicoFluxo.push({
      id: `hist-${Date.now()}`,
      etapa: 'homologacao_diretoria',
      acao: 'aprovado_1_clique',
      usuarioNome: auth.usuarioAtual.nome,
      usuarioPapel: auth.usuarioAtual.papel,
      despachoTexto:
        despachoOpcional ||
        'Homologado em 1 clique pela Diretoria para integrar o Plano de Gestão de Riscos do ICMBio.',
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * Solicitação de Ajuste Rápido (devolução motivada em 1 clique para a 1ª Linha).
   */
  function solicitarAjusteRapido(
    riscoId: string,
    despachoMotivo: string
  ): void {
    const auth = useAuthStore();
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;

    risco.statusFluxo = 'devolvido';
    risco.historicoFluxo.push({
      id: `hist-${Date.now()}`,
      etapa: 'devolucao_ajuste',
      acao: 'devolvido_ajuste',
      usuarioNome: auth.usuarioAtual.nome,
      usuarioPapel: auth.usuarioAtual.papel,
      despachoTexto: despachoMotivo,
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * Monitoramento Contínuo (Seção 4.6 da Metodologia):
   * Lançar uma leitura de KRI NÃO derruba o status `'aprovado'` do risco!
   */
  function registrarMedicaoKri(
    riscoId: string,
    kriId: string,
    medicao: {
      dataMedicao: string;
      valorApurado: string;
      emAlerta: boolean;
      observacao?: string;
    }
  ): void {
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;
    const kri = risco.kris.find((k) => k.id === kriId);
    if (!kri) return;

    kri.medicoes.unshift({
      id: `med-${Date.now()}`,
      ...medicao,
    });
  }

  /**
   * Monitoramento Contínuo de Ações 5W2H:
   * Atualizar o status de execução da ação também mantém o risco `'aprovado'`.
   */
  function atualizarStatusTratamento(
    riscoId: string,
    tratamentoId: string,
    novoStatus: RespostaTratamento5W2H['statusExecucao']
  ): void {
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;
    const trat = risco.respostasTratamento.find((t) => t.id === tratamentoId);
    if (!trat) return;
    trat.statusExecucao = novoStatus;
  }

  /**
   * Regra de Governança para Reavaliação de Nota:
   * Se um risco já aprovado tiver sua Probabilidade, Impacto ou Fator de Controle
   * alterados, o motor recalcula o residual e reabre o status para `'em_validacao_cg'`.
   */
  function reavaliarPontuacaoRiscoAprovado(
    riscoId: string,
    novosDados: {
      probabilidade: NivelProbabilidade;
      impacto: NivelImpacto;
      nivelEficaciaControle: NivelEficaciaControle;
      possuiEvidenciaControle: boolean;
    }
  ): void {
    const auth = useAuthStore();
    const risco = riscos.value.find((r) => r.id === riscoId);
    if (!risco) return;

    const apetite = obterApetitePorCategoria(risco.categoriaId);
    const calculo = calcularRiscoCompletoRadar({
      probabilidade: novosDados.probabilidade,
      impacto: novosDados.impacto,
      eficaciaControle: novosDados.nivelEficaciaControle,
      possuiEvidenciaComprovada: novosDados.possuiEvidenciaControle,
      apetiteCategoria: apetite,
    });

    risco.probabilidade = novosDados.probabilidade;
    risco.impacto = novosDados.impacto;
    risco.possuiEvidenciaControle = novosDados.possuiEvidenciaControle;
    risco.nivelEficaciaControle = calculo.eficaciaFinal;
    risco.fatorControle = calculo.fatorFinal;
    risco.nivelInerente = calculo.nivelInerente;
    risco.classificacaoInerente = calculo.classificacaoInerente;
    risco.nivelResidual = calculo.nivelResidual;
    risco.classificacaoResidual = calculo.classificacaoResidual;
    risco.statusCritico = calculo.statusCritico;
    risco.isCritico = calculo.isCritico;
    risco.memoriaCalculo = calculo.memoriaCalculo;

    // Reabre para validação em 1 clique da Coordenação-Geral:
    risco.statusFluxo = 'em_validacao_cg';
    risco.historicoFluxo.push({
      id: `hist-${Date.now()}`,
      etapa: 'reabertura_nota',
      acao: 'reaberto_mudanca_nota',
      usuarioNome: auth.usuarioAtual.nome,
      usuarioPapel: auth.usuarioAtual.papel,
      despachoTexto: `Pontuação reavaliada (${calculo.memoriaCalculo}). Reaberto para validação da Coordenação-Geral.`,
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * Passo 0 (CGOV): Importa tabela Markdown gerada pela skill `cgov-gestao-riscos-v4`.
   */
  function importarMarkdownDaSkill(
    markdown: string,
    objetoIdPadrao?: string,
    responsavelNomePadrao = 'Ponto Focal 1ª Linha (A validar)'
  ): { importados: number; avisos: string[]; erros: string[] } {
    const resultado = importarTabelaMarkdownSkill(markdown);
    if (resultado.erros.length > 0) {
      return {
        importados: 0,
        avisos: resultado.avisos,
        erros: resultado.erros,
      };
    }

    for (const item of resultado.fichas) {
      const cat =
        categorias.value.find(
          (c) => c.nome.toLowerCase() === item.categoriaNome.toLowerCase()
        ) ?? categorias.value[1];

      salvarOuAtualizarRisco({
        codigoRadar: item.codigoRadar,
        objetoId: objetoIdPadrao ?? objetosContexto.value[0].id,
        nomeObjetoCache: item.nomeObjeto,
        responsavelRiscoNome: responsavelNomePadrao,
        causas: item.causas,
        eventoRisco: item.eventoRisco,
        consequencias: item.consequencias,
        objetivoAfetado: item.objetivoAfetado,
        categoriaId: cat.id,
        categoriaNome: cat.nome,
        subcategoriaIntegridade: item.subcategoriaIntegridade,
        probabilidade: item.probabilidade,
        impacto: item.impacto,
        possuiEvidenciaControle: item.possuiEvidenciaControle,
        nivelEficaciaControle: item.nivelEficaciaControle,
        estrategiaPrincipal: item.estrategiaTratamento,
        origemPreliminarCgov: true,
        statusFluxo: 'preliminar_cgov',
        controlesExistentes:
          item.controlesTexto && item.controlesTexto !== 'Inexistente'
            ? [
                {
                  id: `ctrl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
                id: `kri-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                nomeIndicador: item.kriSugerido,
                formulaCalculo: 'Definido preliminarmente via skill CGOV',
                fonteDados: 'SEI / Sistema Setorial',
                periodicidade: 'Trimestral',
                metaAlvo: '100%',
                limiteAlerta: '< 80%',
                responsavelMedicao: responsavelNomePadrao,
                medicoes: [],
              },
            ]
          : [],
      });
    }

    return {
      importados: resultado.fichas.length,
      avisos: resultado.avisos,
      erros: [],
    };
  }

  /**
   * Simulador / Configurador da DAR (Declaração de Apetite a Riscos — Anexo III):
   * Permite à CGOV/CIG atualizar o apetite de uma categoria ('baixo' | 'moderado' | 'pendente_dar')
   * e recalcula instantaneamente a criticidade de todos os riscos daquela categoria!
   */
  function alterarApetiteCategoriaDAR(
    categoriaId: number,
    novoApetite: ApetiteDeclarado
  ): void {
    const cat = categorias.value.find((c) => c.id === categoriaId);
    if (!cat) return;
    cat.apetiteDeclarado = novoApetite;

    for (const r of riscos.value) {
      if (r.categoriaId === categoriaId) {
        const recalculo = calcularRiscoCompletoRadar({
          probabilidade: r.probabilidade,
          impacto: r.impacto,
          eficaciaControle: r.nivelEficaciaControle,
          possuiEvidenciaComprovada: r.possuiEvidenciaControle,
          apetiteCategoria: novoApetite,
        });
        r.statusCritico = recalculo.statusCritico;
        r.isCritico = recalculo.isCritico;
        r.memoriaCalculo = recalculo.memoriaCalculo;
      }
    }
  }

  function atualizarJustificativaCategoriaDAR(
    categoriaId: number,
    novaJustificativa: string
  ): void {
    const cat = categorias.value.find((c) => c.id === categoriaId);
    if (!cat) return;
    cat.justificativaDar = novaJustificativa;
  }

  function alternarFiltroCelulaMatriz(
    p: NivelProbabilidade,
    i: NivelImpacto
  ): void {
    if (
      celulaMatrizSelecionada.value &&
      celulaMatrizSelecionada.value.p === p &&
      celulaMatrizSelecionada.value.i === i
    ) {
      celulaMatrizSelecionada.value = null;
    } else {
      celulaMatrizSelecionada.value = { p, i };
    }
  }

  function limparFiltrosPainel(): void {
    termoBuscaGlobal.value = '';
    celulaMatrizSelecionada.value = null;
    categoriaFiltroId.value = null;
  }

  function obterRiscoPorId(id: string): FichaRisco | undefined {
    return riscos.value.find((r) => r.id === id || r.codigoRadar === id);
  }

  function salvarNovoObjetoContexto(
    parcial: Partial<ObjetoContexto>
  ): ObjetoContexto {
    const novoObj: ObjetoContexto = {
      id: parcial.id ?? `obj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tipoObjeto: parcial.tipoObjeto ?? 'Processo',
      nomeObjeto: parcial.nomeObjeto ?? 'Novo Objeto de Gestão de Riscos',
      unidadeId: parcial.unidadeId ?? unidades.value[0].id,
      macroprocessoSupervisorId:
        parcial.macroprocessoSupervisorId ?? 'uni-cgge',
      diretoriaId: parcial.diretoriaId ?? 'uni-diplan',
      objetivoEstrategicoAssociado:
        parcial.objetivoEstrategicoAssociado ??
        'Objetivo estratégico institucional do ICMBio',
      insumosPrincipais: parcial.insumosPrincipais ?? 'Processos SEI e normativos',
      entregasPrincipais: parcial.entregasPrincipais ?? 'Atos técnicos e relatórios',
      partesInteressadas: parcial.partesInteressadas ?? 'Unidades do ICMBio e sociedade',
      cicloAno: parcial.cicloAno ?? 2026,
    };
    objetosContexto.value.unshift(novoObj);
    return novoObj;
  }

  return {
    riscos,
    categorias,
    unidades,
    objetosContexto,
    termoBuscaGlobal,
    celulaMatrizSelecionada,
    categoriaFiltroId,
    riscosFiltrados,
    riscosCriticosCarteira,
    filaValidacaoCg,
    filaHomologacaoDiretoria,
    trilhaAuditoriaGlobal,
    resumoPorClasse,
    salvarOuAtualizarRisco,
    submeterParaValidacaoCg,
    aprovarEmUmCliqueCg,
    homologarEmUmCliqueDiretoria,
    solicitarAjusteRapido,
    registrarMedicaoKri,
    atualizarStatusTratamento,
    reavaliarPontuacaoRiscoAprovado,
    importarMarkdownDaSkill,
    alterarApetiteCategoriaDAR,
    atualizarJustificativaCategoriaDAR,
    alternarFiltroCelulaMatriz,
    limparFiltrosPainel,
    obterRiscoPorId,
    salvarNovoObjetoContexto,
  };
});
