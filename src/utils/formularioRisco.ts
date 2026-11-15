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
  EstrategiaTratamento,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
} from '../types/radar.types';
import { validarRegraIntegridade } from './calculadoraRiscoRadar';

/** Todos os campos do assistente (o que a pessoa digita). */
export interface DadosNovoRisco {
  nomeObjeto: string;
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
    nomeObjeto: '', responsavel: '', causas: '', evento: '', consequencias: '', objetivo: '',
    categoriaId: null, subcategoriaIntegridade: '', decideSobreTerceiros: false, justificativaNaoIntegridade: '',
    probabilidade: null, impacto: null, eficacia: 'Inexistente', possuiEvidencia: false, descricaoControle: '', evidenciaControle: '',
    estrategia: 'Mitigar', acaoOQue: '', acaoQuem: '', acaoPrazo: '', nomeKri: '',
  };
}

/** Exemplo pronto, para demonstrações e treinamentos (botão "Preencher com exemplo"). */
export function dadosExemplo(): DadosNovoRisco {
  return {
    ...dadosVazios(),
    nomeObjeto: 'Processo de Concessão e Autorização Ambiental',
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
    if (!obrigatorio(d.nomeObjeto)) erros.nomeObjeto = 'Informe o processo, projeto ou unidade (objeto de gestão).';
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
