/**
 * ============================================================================
 * REGRAS DO ASSISTENTE "NOVO RISCO" (`src/utils/formularioRisco.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O cadastro tem 4 etapas. Antes de avançar, a etapa é VALIDADA aqui — numa
 * função "pura" (sem tela), fácil de testar. Ela devolve um objeto
 * { campo: "mensagem de erro" }; objeto vazio = etapa ok.
 *
 *   1. Identificação  → objeto, causas, evento, consequências, objetivo
 *   2. Categoria      → Quadro 2 + Teste de Integridade (Integra+, Quadro 3)
 *   3. Análise        → Probabilidade, Impacto e controle (Quadros 4 a 6)
 *   4. Tratamento     → estratégia, ação 5W2H e indicador (KRI)
 *
 * A regra do Integra+ NÃO é reescrita aqui: usamos `validarRegraIntegridade`,
 * a mesma da calculadora oficial.
 */
import type {
  CategoriaRisco,
  ControleExistente,
  EstrategiaTratamento,
  FichaRisco,
  IndicadorKri,
  RespostaTratamento5W2H,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
} from '../types/radar.types';
import { validarRegraIntegridade } from './calculadoraRiscoRadar';

/** Todos os campos do assistente (o que a pessoa digita). */
export interface DadosNovoRisco {
  /** Id do objeto de gestão escolhido no seletor (só os objetos em que a pessoa grava). */
  objetoId: string;
  responsavel: string;
  causas: string;
  evento: string;
  consequencias: string;
  objetivo: string;
  categoriaId: number | null;
  subcategoriaIntegridade: string;
  decideSobreTerceiros: boolean; // beneficiário, licença, fiscalização ou contratação?
  justificativaNaoIntegridade: string;
  probabilidade: NivelProbabilidade | null;
  impacto: NivelImpacto | null;
  eficacia: NivelEficaciaControle;
  possuiEvidencia: boolean;
  descricaoControle: string;
  evidenciaControle: string;
  estrategia: EstrategiaTratamento;
  acaoOQue: string;
  acaoQuem: string;
  acaoPrazo: string;
  nomeKri: string;
}

export type ErrosEtapa = Partial<Record<keyof DadosNovoRisco, string>>;

export const ETAPAS_NOVO_RISCO = [
  { numero: 1, titulo: 'Identificação', subtitulo: 'O que pode acontecer' },
  { numero: 2, titulo: 'Categoria', subtitulo: 'Quadro 2 e Integra+' },
  { numero: 3, titulo: 'Análise', subtitulo: 'Probabilidade, impacto e controle' },
  { numero: 4, titulo: 'Tratamento', subtitulo: 'Plano de ação e indicador' },
] as const;

/** Formulário vazio (o ponto de partida de um cadastro novo). */
export function dadosVazios(): DadosNovoRisco {
  return {
    objetoId: '', responsavel: '', causas: '', evento: '', consequencias: '', objetivo: '',
    categoriaId: null, subcategoriaIntegridade: '', decideSobreTerceiros: false, justificativaNaoIntegridade: '',
    probabilidade: null, impacto: null, eficacia: 'Inexistente', possuiEvidencia: false, descricaoControle: '', evidenciaControle: '',
    estrategia: 'Mitigar', acaoOQue: '', acaoQuem: '', acaoPrazo: '', nomeKri: '',
  };
}

/**
 * Exemplo pronto, para demonstrações e treinamentos (botão "Preencher com exemplo").
 * O objeto vem de fora (a tela sabe quais objetos a pessoa pode usar).
 * Ex.: dadosExemplo('obj-anexo-ii') → formulário completo no objeto 'obj-anexo-ii'.
 */
export function dadosExemplo(objetoId = ''): DadosNovoRisco {
  return {
    ...dadosVazios(),
    objetoId,
    responsavel: 'Gestor Ponto Focal (1ª Linha)',
    causas: 'ausência de roteiro padronizado de conferência documental',
    evento: 'aprovação de processo com instrução incompleta',
    consequencias: 'questionamento pelos órgãos de controle e retrabalho',
    objetivo: 'segurança jurídica e tempestividade dos atos autorizativos',
    categoriaId: 2,
    probabilidade: 3,
    impacto: 4,
    acaoOQue: 'Instituir lista de verificação obrigatória no SEI.',
    acaoQuem: 'Coordenador do Processo',
    acaoPrazo: '2026-12-20',
    nomeKri: '% de processos instruídos com checklist assinado',
  };
}

const obrigatorio = (valor: string, minimo = 3) => valor.trim().length >= minimo;

/**
 * Valida UMA etapa. Ex.: etapa 1 com "causas" vazio →
 *   { causas: 'Descreva as causas (o que pode provocar o evento).' }
 */
export function validarEtapa(etapa: number, d: DadosNovoRisco, categorias: CategoriaRisco[]): ErrosEtapa {
  const erros: ErrosEtapa = {};

  if (etapa === 1) {
    if (!d.objetoId) erros.objetoId = 'Escolha o objeto de gestão (processo, projeto ou unidade) do risco.';
    if (!obrigatorio(d.causas)) erros.causas = 'Descreva as causas (o que pode provocar o evento).';
    if (!obrigatorio(d.evento)) erros.evento = 'Descreva o evento de risco (o que pode acontecer).';
    if (!obrigatorio(d.consequencias)) erros.consequencias = 'Descreva as consequências.';
    if (!obrigatorio(d.objetivo)) erros.objetivo = 'Informe o objetivo afetado.';
  }

  if (etapa === 2) {
    const categoria = categorias.find((c) => c.id === d.categoriaId);
    if (!categoria) {
      erros.categoriaId = 'Escolha uma das 8 categorias do Quadro 2.';
    } else {
      const regra = validarRegraIntegridade({
        categoriaNome: categoria.nome,
        subcategoriaIntegridade: d.subcategoriaIntegridade,
        testeIntegridadeAplicavel: d.decideSobreTerceiros,
        justificativaNaoIntegridade: d.justificativaNaoIntegridade,
      });
      if (!regra.valido) {
        // Aponta o erro para o campo que a pessoa precisa corrigir.
        if (categoria.nome === 'Integridade') erros.subcategoriaIntegridade = 'Escolha uma das 6 subcategorias de Integridade (Quadro 3).';
        else erros.justificativaNaoIntegridade = 'Explique por que não é risco de Integridade (pelo menos 10 caracteres) — ou escolha a categoria Integridade.';
      }
    }
  }

  if (etapa === 3) {
    if (!d.probabilidade) erros.probabilidade = 'Escolha a probabilidade (1 a 5).';
    if (!d.impacto) erros.impacto = 'Escolha o impacto (1 a 5).';
    if (d.eficacia !== 'Inexistente' && !obrigatorio(d.descricaoControle)) erros.descricaoControle = 'Descreva o controle que existe hoje.';
    if (d.possuiEvidencia && !obrigatorio(d.evidenciaControle)) erros.evidenciaControle = 'Diga onde está a evidência (ex.: processo SEI, relatório).';
  }

  if (etapa === 4) {
    if (d.estrategia !== 'Aceitar') {
      if (!obrigatorio(d.acaoOQue)) erros.acaoOQue = 'Descreva a ação (o quê).';
      if (!obrigatorio(d.acaoQuem)) erros.acaoQuem = 'Informe o responsável (quem).';
      if (!d.acaoPrazo) erros.acaoPrazo = 'Informe o prazo (quando).';
    }
  }

  return erros;
}


// ---------------------------------------------------------------------------
// EDIÇÃO: da ficha gravada para o formulário, e de volta
// ---------------------------------------------------------------------------
/**
 * Preenche o formulário com um risco que já existe ("Editar ficha").
 * O formulário tem UM controle, UMA ação 5W2H e UM KRI: usamos o PRIMEIRO de
 * cada lista. Os demais itens não somem — `dadosParaFicha` os devolve intactos.
 * Ex.: risco com P=3, I=4 e controle "Dupla checagem" →
 *      { probabilidade: 3, impacto: 4, descricaoControle: 'Dupla checagem', ... }
 */
export function dadosDeRisco(r: FichaRisco): DadosNovoRisco {
  const controle = r.controlesExistentes[0];
  const resposta = r.respostasTratamento[0];
  const kri = r.kris[0];
  return {
    objetoId: r.objetoId,
    responsavel: r.responsavelRiscoNome ?? '',
    causas: r.causas ?? '',
    evento: r.eventoRisco ?? '',
    consequencias: r.consequencias ?? '',
    objetivo: r.objetivoAfetado ?? '',
    categoriaId: r.categoriaId ?? null,
    subcategoriaIntegridade: r.subcategoriaIntegridade ?? '',
    decideSobreTerceiros: r.testeIntegridadeAplicavel ?? false,
    justificativaNaoIntegridade: r.justificativaNaoIntegridade ?? '',
    probabilidade: r.probabilidade ?? null,
    impacto: r.impacto ?? null,
    eficacia: r.nivelEficaciaControle ?? 'Inexistente',
    possuiEvidencia: r.possuiEvidenciaControle ?? false,
    descricaoControle: controle?.descricaoControle ?? '',
    evidenciaControle: controle?.evidenciaFuncionamento ?? '',
    estrategia: r.estrategiaPrincipal ?? 'Mitigar',
    acaoOQue: resposta?.acaoOQue ?? '',
    acaoQuem: resposta?.responsavelQuem ?? '',
    acaoPrazo: resposta?.prazoQuando ?? '',
    nomeKri: kri?.nomeIndicador ?? '',
  };
}

/**
 * Monta o pacote que a tela entrega à store (`salvarOuAtualizarRisco`).
 * Só dados de ENTRADA: quem calcula inerente, residual e criticidade é o RADAR.
 *
 * - Risco NOVO (`existente` ausente): cria as listas com um item cada (se preenchido).
 * - EDIÇÃO (`existente` presente): o 1º item de cada lista recebe o que a pessoa
 *   editou (mantendo o id e os campos que o formulário não mostra) e os outros
 *   itens seguem como estavam. Item novo vai com id vazio (`''`) = "crie um id".
 *   Ex.: risco com 2 controles; a pessoa muda o texto do 1º →
 *        controlesExistentes: [{ id: 'c1', descricaoControle: 'novo texto', ... }, { id: 'c2', ... }]
 */
export function dadosParaFicha(
  d: DadosNovoRisco,
  opcoes: { ehIntegridade: boolean; existente?: FichaRisco }
): Partial<FichaRisco> {
  const { ehIntegridade, existente } = opcoes;
  const responsavel = d.responsavel || 'Gestor de riscos da unidade (1ª Linha)';

  // CONTROLE (Quadro 6)
  const controleAntigo = existente?.controlesExistentes[0];
  const controle: ControleExistente | undefined = d.descricaoControle
    ? {
        ...(controleAntigo ?? { id: '', desenhoAdequado: d.possuiEvidencia, operacaoComprovada: d.possuiEvidencia }),
        descricaoControle: d.descricaoControle,
        evidenciaFuncionamento: d.evidenciaControle,
        possuiEvidenciaComprovada: d.possuiEvidencia,
      }
    : undefined;

  // AÇÃO DE TRATAMENTO (5W2H)
  const respostaAntiga = existente?.respostasTratamento[0];
  const resposta: RespostaTratamento5W2H | undefined = d.acaoOQue
    ? {
        ...(respostaAntiga ?? { id: '', procedimentoComo: 'Execução acompanhada via SEI', statusExecucao: 'nao_iniciada' as const }),
        estrategia: d.estrategia,
        acaoOQue: d.acaoOQue,
        responsavelQuem: d.acaoQuem,
        prazoQuando: d.acaoPrazo,
      }
    : undefined;

  // INDICADOR (KRI)
  const kriAntigo = existente?.kris[0];
  const kri: IndicadorKri | undefined = d.nomeKri
    ? {
        ...(kriAntigo ?? {
          id: '', formulaCalculo: 'A definir pela unidade', fonteDados: 'A definir', periodicidade: 'Trimestral' as const,
          metaAlvo: 'A definir', limiteAlerta: 'A definir', responsavelMedicao: d.responsavel || 'Unidade', medicoes: [],
        }),
        nomeIndicador: d.nomeKri,
      }
    : undefined;

  /** Junta o 1º item (editado ou removido) com os demais, intactos. */
  const lista = <T>(primeiro: T | undefined, antigos: T[] | undefined): T[] =>
    [...(primeiro ? [primeiro] : []), ...(antigos ?? []).slice(1)];

  return {
    ...(existente ? { id: existente.id } : { objetoId: d.objetoId, statusFluxo: 'rascunho' as const }),
    responsavelRiscoNome: responsavel,
    causas: d.causas,
    eventoRisco: d.evento,
    consequencias: d.consequencias,
    objetivoAfetado: d.objetivo,
    categoriaId: d.categoriaId ?? undefined,
    // Subcategoria só na Integridade. Fora dela, ou em branco ('' ou espaços),
    // vai null EXPLÍCITO ("sem subcategoria"), nunca '' nem undefined:
    //   - '' iria para a chave estrangeira e voltaria um erro genérico (23503);
    //   - undefined some do JSON, e na EDIÇÃO a salvar_ficha_risco mantém o
    //     valor antigo: Integridade/Nepotismo → Operacional ficaria (2, 'Nepotismo').
    // Com null, o banco apaga a subcategoria (ou, na Integridade, responde
    // "RADAR: ... exige uma das subcategorias do Quadro 3").
    // Ex.: Operacional -> null; Integridade + '' -> null; Integridade + 'Nepotismo' -> 'Nepotismo'.
    subcategoriaIntegridade: ehIntegridade && d.subcategoriaIntegridade.trim() ? d.subcategoriaIntegridade : null,
    testeIntegridadeAplicavel: d.decideSobreTerceiros,
    justificativaNaoIntegridade: d.justificativaNaoIntegridade || undefined,
    probabilidade: d.probabilidade ?? undefined,
    impacto: d.impacto ?? undefined,
    possuiEvidenciaControle: d.possuiEvidencia,
    nivelEficaciaControle: d.eficacia,
    estrategiaPrincipal: d.estrategia,
    controlesExistentes: lista(controle, existente?.controlesExistentes),
    respostasTratamento: lista(resposta, existente?.respostasTratamento),
    kris: lista(kri, existente?.kris),
  };
}
