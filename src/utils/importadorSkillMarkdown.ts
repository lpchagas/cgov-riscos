/**
 * ============================================================================
 * IMPORTADOR DE TABELAS MARKDOWN DA SKILL `cgov-gestao-riscos-v4` (PASSO 0)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * No Passo 0 da governança RADAR, os analistas da CGOV aplicam a skill
 * `cgov-gestao-riscos-v4` no Claude Code sobre Portarias e Instruções
 * Normativas do ICMBio. O Claude gera uma tabela em formato Markdown:
 *
 * | ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | ... |
 *
 * Este arquivo lê esse texto bruto, separa cada linha pelas barras verticais `|`,
 * extrai automaticamente as 4 partes do Bow Tie (Causas, Evento, Consequências
 * e Objetivo afetado) a partir da frase padrão, recalcula todas as notas pelo
 * nosso motor matemático oficial (`calculadoraRiscoRadar.ts`) e devolve as
 * fichas preliminares prontas para envio às Coordenações-Gerais (`preliminar_cgov`).
 */

import type {
  ApetiteDeclarado,
  ClasseRisco,
  EstrategiaTratamento,
  FatorAvaliacaoControle,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  StatusCriticidadeDAR,
} from '../types/radar.types';
import {
  calcularRiscoCompletoRadar,
  CATEGORIAS_OFICIAIS_QUADRO_2,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
  validarRegraIntegridade,
} from './calculadoraRiscoRadar';
import {
  ESCALA_IMPACTO_QUADRO_5,
  ESCALA_PROBABILIDADE_QUADRO_4,
  lerNivelDaCelula,
  type NivelDescrito,
} from './escalasProbabilidadeImpacto';

/** Monta a lista da mensagem de erro, ex.: "(1) Raro; (2) Pouco provável; ...". */
function listarEscala(escala: readonly NivelDescrito<number>[]): string {
  return escala.map((n) => `(${n.valor}) ${n.nome}`).join('; ');
}

/**
 * Compara dois textos sem ligar para maiúsculas/minúsculas e para espaços.
 * Antes de comparar, cada texto passa por:
 *   - normalize('NFC'): junta letra + acento num caractere só. Um "ç" pode
 *     chegar como "c" + cedilha (NFD, comum ao colar do macOS ou de alguns
 *     editores); na tela é igual, mas os bytes são outros;
 *   - replace(/\s+/g, ' '): espaço duplo, tabulação ou quebra no meio viram
 *     um espaço só (comum ao colar de planilha);
 *   - trim() e toLocaleLowerCase('pt-BR'): pontas e maiúsculas.
 * Não é sinônimo: só aceita a MESMA grafia escrita com bytes diferentes.
 * Ex.: igualSemCaixa(' Visitação ', 'visitação') -> true
 * Ex.: igualSemCaixa('Riscos da  visitação', 'Riscos da visitação') -> true
 */
function igualSemCaixa(a: string, b: string): boolean {
  const normalizar = (t: string) => t.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
  return normalizar(a) === normalizar(b);
}

/**
 * Sinônimos do Anexo III aceitos SÓ na importação (decisão de 2026-11-22):
 * a grafia do Anexo III vira a do Quadro 2 da Metodologia. Nenhum outro
 * sinônimo é aceito: o que não for do Quadro 2 nem desta lista é recusado.
 */
const SINONIMOS_CATEGORIA_ANEXO_III: ReadonlyArray<
  readonly [string, (typeof CATEGORIAS_OFICIAIS_QUADRO_2)[number]]
> = [
  ['Financeiro ou Orçamentário', 'Financeiro/Orçamentário'],
  ['Reputação ou Imagem', 'Reputação'],
  ['Visitação', 'Riscos da visitação'],
];

/**
 * Devolve o nome OFICIAL (Quadro 2) de uma categoria escrita na tabela, ou
 * `null` se ela não existir. NUNCA troca por uma categoria "padrão".
 *
 * Exemplos:
 *   normalizarCategoriaImportada('reputação ou imagem') -> 'Reputação'
 *   normalizarCategoriaImportada(' Visitação ')         -> 'Riscos da visitação'
 *   normalizarCategoriaImportada('Socioambiental')      -> null
 */
export function normalizarCategoriaImportada(
  bruta: string
): (typeof CATEGORIAS_OFICIAIS_QUADRO_2)[number] | null {
  const oficial = CATEGORIAS_OFICIAIS_QUADRO_2.find((c) => igualSemCaixa(c, bruta));
  if (oficial) return oficial;
  const sinonimo = SINONIMOS_CATEGORIA_ANEXO_III.find(([antigo]) => igualSemCaixa(antigo, bruta));
  return sinonimo ? sinonimo[1] : null;
}

/**
 * Devolve o nome OFICIAL (Quadro 3) de uma subcategoria de Integridade, ou
 * `null` se não for uma das 6. Ex.: 'conflito de interesses' -> 'Conflito de interesses'.
 */
export function normalizarSubcategoriaImportada(
  bruta: string
): (typeof SUBCATEGORIAS_INTEGRIDADE_QUADRO_3)[number] | null {
  return SUBCATEGORIAS_INTEGRIDADE_QUADRO_3.find((s) => igualSemCaixa(s, bruta)) ?? null;
}

/**
 * Estrutura de cada ficha preliminar extraída da tabela Markdown da Skill.
 */
export interface LinhaImportadaSkill {
  codigoRadar: string;
  nomeObjeto: string;
  descricaoPadrao: string;
  causas: string;
  eventoRisco: string;
  consequencias: string;
  objetivoAfetado: string;
  categoriaNome: string;
  subcategoriaIntegridade?: string;
  probabilidade: NivelProbabilidade;
  impacto: NivelImpacto;
  nivelInerente: number;
  classificacaoInerente: ClasseRisco;
  controlesTexto: string;
  possuiEvidenciaControle: boolean;
  nivelEficaciaControle: NivelEficaciaControle;
  fatorControle: FatorAvaliacaoControle;
  nivelResidual: number;
  classificacaoResidual: ClasseRisco;
  apetiteCategoria: ApetiteDeclarado;
  statusCritico: StatusCriticidadeDAR;
  estrategiaTratamento: EstrategiaTratamento;
  kriSugerido: string;
  memoriaCalculo: string;
  origemPreliminarCgov: true;
  statusFluxo: 'preliminar_cgov';
}

/**
 * Extrai Causas, Evento, Consequências e Objetivo a partir da sintaxe padrão
 * da Seção 4.2.1:
 * "Devido o(a)/a [causas], poderá ocorrer (o(a)) [evento], ocasionando (o(a)) [consequências] e impactando (o alcance do(a)) [objetivo]."
 */
function extrairBowTieDaSintaxe(descricao: string): {
  causas: string;
  eventoRisco: string;
  consequencias: string;
  objetivoAfetado: string;
  extraidoComSucesso: boolean;
} {
  const regex =
    /Devido\s+(?:o\(a\)\s+|ao?\s+|à\s+)?(.+?),\s*poderá\s+ocorrer\s+(?:o\(a\)\s+|a\s+|o\s+)?(.+?),\s*ocasionando\s+(?:o\(a\)\s+|a\s+|o\s+)?(.+?)\s+e\s+impactando\s+(?:o\s+alcance\s+d[oa]\(a\)\s+|o\s+alcance\s+d[oa]\s+)?(.+?)\.?$/i;

  const match = descricao.trim().match(regex);
  if (match) {
    return {
      causas: match[1].trim(),
      eventoRisco: match[2].trim(),
      consequencias: match[3].trim(),
      objetivoAfetado: match[4].trim(),
      extraidoComSucesso: true,
    };
  }

  return {
    causas: 'Identificado preliminarmente via análise normativa CGOV',
    eventoRisco: descricao.trim(),
    consequencias: 'Impacto na conformidade ou execução do processo',
    objetivoAfetado: 'Objetivos estratégicos vinculados ao normativo',
    extraidoComSucesso: false,
  };
}

/**
 * Converte o texto da coluna "Eficácia e fator" (ex.: "Fraco (0,9)") em um
 * NivelEficaciaControle oficial do Quadro 6.
 */
function interpretarEficaciaControle(texto: string): NivelEficaciaControle {
  const t = texto.toLowerCase();
  if (t.includes('forte') || t.includes('0,5') || t.includes('0.5')) {
    return 'Forte';
  }
  if (t.includes('satisfat') || t.includes('0,6') || t.includes('0.6')) {
    return 'Satisfatório';
  }
  if (t.includes('median') || t.includes('0,75') || t.includes('0.75')) {
    return 'Mediano';
  }
  if (t.includes('fraco') || t.includes('0,9') || t.includes('0.9')) {
    return 'Fraco';
  }
  return 'Inexistente';
}

/**
 * Avalia se o texto de "Controles e evidências" indica existência de evidência formal.
 */
function inferirEvidenciaNoTexto(
  controlesTexto: string,
  eficacia: NivelEficaciaControle
): boolean {
  const t = controlesTexto.toLowerCase();
  if (
    t.includes('sem evidência') ||
    t.includes('sem registro') ||
    t.includes('inexistente') ||
    t.includes('informal')
  ) {
    return false;
  }
  // Se a análise da skill atribuiu Mediano, Satisfatório ou Forte e não declarou falta de evidência,
  // considera-se evidência documental prevista no ato normativo:
  return eficacia === 'Mediano' || eficacia === 'Satisfatório' || eficacia === 'Forte';
}

/**
 * Normaliza a estratégia de tratamento lida da tabela para uma das 4 oficiais da Tabela 8.
 */
function normalizarEstrategia(texto: string): EstrategiaTratamento {
  const t = texto.trim().toLowerCase();
  if (t.startsWith('compartilh')) return 'Compartilhar';
  if (t.startsWith('evit')) return 'Evitar';
  if (t.startsWith('aceit')) return 'Aceitar';
  return 'Mitigar';
}

/**
 * Normaliza o apetite da categoria lido da tabela.
 */
function normalizarApetite(
  texto: string,
  apetitePadrao: ApetiteDeclarado
): ApetiteDeclarado {
  const t = texto.trim().toLowerCase();
  if (t === 'baixo') return 'baixo';
  if (t === 'moderado') return 'moderado';
  if (t.includes('pendente')) return 'pendente_dar';
  return apetitePadrao;
}

/**
 * Função principal: analisa uma tabela Markdown no padrão do §4 (Regime B) da skill
 * `cgov-gestao-riscos-v4` e retorna as fichas recalculadas + eventuais avisos ou erros.
 */
export function importarTabelaMarkdownSkill(
  markdownBruto: string,
  apetitePadrao: ApetiteDeclarado = 'pendente_dar'
): {
  fichas: LinhaImportadaSkill[];
  avisos: string[];
  erros: string[];
} {
  const fichas: LinhaImportadaSkill[] = [];
  const avisos: string[] = [];
  const erros: string[] = [];

  const linhas = markdownBruto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Ignora linha separadora de Markdown (ex.: |---|---|)
    if (/^\|[\s\-:|]+\|$/.test(linha)) {
      continue;
    }

    const colunas = linha
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (colunas.length < 10) {
      continue;
    }

    // Ignora a linha de cabeçalho da tabela
    const primeiraColunaLower = colunas[0].toLowerCase();
    if (
      primeiraColunaLower === 'id' ||
      primeiraColunaLower === 'código' ||
      primeiraColunaLower === 'codigo'
    ) {
      continue;
    }

    // Mapeamento das 16 colunas do §4 (Regime B) da skill `cgov-gestao-riscos-v4`:
    // 0: ID | 1: Objeto de GR | 2: Descrição na sintaxe | 3: Categoria |
    // 4: P  | 5: I            | 6: Inerente             | 7: Classe    |
    // 8: Controles e evidências | 9: Eficácia e fator   | 10: Residual |
    // 11: Classe residual | 12: Apetite da categoria | 13: Crítico? | 14: Estratégia | 15: KRI
    const codigoRadar = colunas[0] || `RSC-SKILL-${fichas.length + 1}`;
    const nomeObjeto = colunas[1] || 'Processo Normativo Analisado';
    const descricaoPadrao = colunas[2] || '';
    const categoriaBruta = colunas[3]; // vazia = recusada (não há categoria "padrão")

    // Categoria e subcategoria SEM conversão silenciosa (RF-172 a RF-175):
    // ou casam com o Quadro 2 / Quadro 3, ou a linha é recusada com o motivo.
    // "Integridade: Nepotismo" traz a subcategoria depois dos dois-pontos.
    const comSubcategoria = /^integridade\s*:(.*)$/i.exec(categoriaBruta);
    const nomeDaCategoria = comSubcategoria ? 'Integridade' : categoriaBruta;
    const categoriaOficial = normalizarCategoriaImportada(nomeDaCategoria);

    if (!categoriaOficial) {
      // Passa o texto original adiante: a regra do motor explica o erro
      // (inclusive o da categoria mista "Operacional com interface de Integridade").
      const rejeicao = validarRegraIntegridade({
        categoriaNome: categoriaBruta,
        testeIntegridadeAplicavel: false,
      });
      erros.push(`Linha ${codigoRadar}: ${rejeicao.erro ?? `Categoria inválida ("${categoriaBruta}").`}`);
      continue;
    }

    const categoriaNome: string = categoriaOficial;
    let subcategoriaIntegridade: string | undefined;

    if (categoriaOficial === 'Integridade') {
      const subcategoriaBruta = comSubcategoria?.[1]?.trim() ?? '';
      if (subcategoriaBruta) {
        const subcategoriaOficial = normalizarSubcategoriaImportada(subcategoriaBruta);
        if (!subcategoriaOficial) {
          erros.push(
            `Linha ${codigoRadar}: subcategoria de Integridade inválida ("${subcategoriaBruta}"). Use uma das 6 subcategorias do Quadro 3: ${SUBCATEGORIAS_INTEGRIDADE_QUADRO_3.join('; ')}.`
          );
          continue;
        }
        subcategoriaIntegridade = subcategoriaOficial;
      }
      // Sem subcategoria: a validação abaixo recusa ("uma das 6 subcategorias do Quadro 3").
    }

    const validacaoCat = validarRegraIntegridade({
      categoriaNome,
      subcategoriaIntegridade,
      testeIntegridadeAplicavel: false,
    });

    if (!validacaoCat.valido) {
      erros.push(`Linha ${codigoRadar}: ${validacaoCat.erro}`);
      continue;
    }

    // P e I vêm dos Quadros 4 e 5: aceita número (1 a 5), nome ("Provável") ou os dois.
    // Célula vazia, fora de 1 a 5 ou ilegível NÃO vira 3: a linha é recusada.
    const leituraP = lerNivelDaCelula(colunas[4] ?? '', ESCALA_PROBABILIDADE_QUADRO_4);
    if (!leituraP.ok) {
      erros.push(
        `Linha ${codigoRadar}: probabilidade inválida ("${colunas[4] ?? ''}"): ${leituraP.motivo}. Use 1 a 5 ou um nome do Quadro 4: ${listarEscala(ESCALA_PROBABILIDADE_QUADRO_4)}.`
      );
      continue;
    }
    const leituraI = lerNivelDaCelula(colunas[5] ?? '', ESCALA_IMPACTO_QUADRO_5);
    if (!leituraI.ok) {
      erros.push(
        `Linha ${codigoRadar}: impacto inválido ("${colunas[5] ?? ''}"): ${leituraI.motivo}. Use 1 a 5 ou um nome do Quadro 5: ${listarEscala(ESCALA_IMPACTO_QUADRO_5)}.`
      );
      continue;
    }
    const pNum: NivelProbabilidade = leituraP.nivel;
    const iNum: NivelImpacto = leituraI.nivel;
    const controlesTexto = colunas[8] || 'Inexistente';
    const eficaciaTexto = colunas[9] || 'Inexistente (1,0)';
    const apetiteTexto = colunas[12] || apetitePadrao;
    const estrategiaTexto = colunas[14] || 'Mitigar';
    const kriSugerido = colunas[15] || 'Indicador a definir com a 1ª Linha';

    const eficaciaLida = interpretarEficaciaControle(eficaciaTexto);
    const possuiEvidencia = inferirEvidenciaNoTexto(controlesTexto, eficaciaLida);
    const apetiteCategoria = normalizarApetite(apetiteTexto, apetitePadrao);

    // Recalcula sempre pelo Motor Matemático Oficial RADAR:
    const calculo = calcularRiscoCompletoRadar({
      probabilidade: pNum,
      impacto: iNum,
      eficaciaControle: eficaciaLida,
      possuiEvidenciaComprovada: possuiEvidencia,
      apetiteCategoria,
    });

    const bowTie = extrairBowTieDaSintaxe(descricaoPadrao);
    if (!bowTie.extraidoComSucesso) {
      avisos.push(
        `Linha ${codigoRadar}: A descrição não seguiu estritamente o modelo "Devido a... poderá ocorrer...". Verifique os campos Causas e Consequências.`
      );
    }

    fichas.push({
      codigoRadar,
      nomeObjeto,
      descricaoPadrao,
      causas: bowTie.causas,
      eventoRisco: bowTie.eventoRisco,
      consequencias: bowTie.consequencias,
      objetivoAfetado: bowTie.objetivoAfetado,
      categoriaNome,
      subcategoriaIntegridade,
      probabilidade: pNum,
      impacto: iNum,
      nivelInerente: calculo.nivelInerente,
      classificacaoInerente: calculo.classificacaoInerente,
      controlesTexto,
      possuiEvidenciaControle: possuiEvidencia,
      nivelEficaciaControle: calculo.eficaciaFinal,
      fatorControle: calculo.fatorFinal,
      nivelResidual: calculo.nivelResidual,
      classificacaoResidual: calculo.classificacaoResidual,
      apetiteCategoria,
      statusCritico: calculo.statusCritico,
      estrategiaTratamento: normalizarEstrategia(estrategiaTexto),
      kriSugerido,
      memoriaCalculo: calculo.memoriaCalculo,
      origemPreliminarCgov: true,
      statusFluxo: 'preliminar_cgov',
    });
  }

  return { fichas, avisos, erros };
}
