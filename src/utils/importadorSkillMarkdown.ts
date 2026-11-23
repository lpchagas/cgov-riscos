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
  FATORES_QUADRO_6,
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
  validarRegraIntegridade,
} from './calculadoraRiscoRadar';
import {
  ESCALA_IMPACTO_QUADRO_5,
  ESCALA_PROBABILIDADE_QUADRO_4,
  lerNivelDaCelula,
  type NivelDescrito,
} from './escalasProbabilidadeImpacto';
import { exigeTratamento } from './travaRiscoCritico';
import { formatarNivel } from './rotulosInterface';

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
  /** Número da linha no texto colado (1 = primeira linha, contando as que não são de tabela). */
  linhaTexto: number;
  /** Versão da matriz da linha: 16 (formato de hoje) ou 18 (com Teste de Integridade e Justificativa). */
  formatoColunas: 16 | 18;
  /** Teste de Integridade informado na col. 17 (formato de 18); no formato de 16, sempre false. */
  testeIntegridadeAplicavel: boolean;
  /** Justificativa da col. 18, quando o Teste se aplica fora da categoria Integridade. */
  justificativaNaoIntegridade?: string;
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

  // Frase fora da sintaxe: NÃO inventamos causa, consequência nem objetivo
  // (antes entravam textos genéricos, como "Impacto na conformidade...", que
  // pareciam análise de verdade). A frase inteira vira o evento e o resto fica
  // em branco ('') para a unidade completar antes do envio (RF-030, RF-182).
  // Ex.: "Os atendimentos atrasam porque a fila não tem responsável."
  //   -> evento = a frase; causas = ''; consequências = ''; objetivo = ''.
  return {
    causas: '',
    eventoRisco: descricao.trim(),
    consequencias: '',
    objetivoAfetado: '',
    extraidoComSucesso: false,
  };
}

/**
 * Prepara um texto para comparação "sem diferença de acento e de maiúsculas":
 * separa letra e acento (NFD), apaga os acentos, junta espaços e põe em minúsculas.
 * Ex.: semAcento(' EVIDÊNCIA:  Não ') -> 'evidencia: nao'
 */
function semAcento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // acentos soltos (faixa Unicode dos diacríticos)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Lê, na col. 9 ("Controles e evidências"), se o controle tem evidência
 * comprovada de funcionamento (RF-178). A ordem de leitura é:
 *   1. o marcador "Evidência: sim" ou "Evidência: não", em qualquer ponto da
 *      célula, sem diferença de acento e de maiúsculas;
 *   2. sem marcador, as expressões explícitas de ausência ("sem evidência",
 *      "sem registro", "não comprovado", "inexistente", "informal") valem
 *      como SEM evidência;
 *   3. qualquer outro texto devolve `null`: não deu para ler. Quem chama
 *      considera "sem evidência" e avisa (na dúvida, a trava do Quadro 6 age).
 *
 * IMPORTANTE: a evidência NÃO é mais deduzida da eficácia (antes, "Mediano"
 * sem a palavra "sem evidência" virava "com evidência" e a trava não agia).
 *
 * Exemplos:
 *   lerEvidencia('Previsto no ato. Evidência: sim')               -> true
 *   lerEvidencia('EVIDENCIA: NAO')                                -> false
 *   lerEvidencia('previsto no ato; funcionamento não comprovado')  -> false
 *   lerEvidencia('Checklist assinado')                            -> null
 */
export function lerEvidencia(texto: string): boolean | null {
  const marcador = lerMarcadorEvidencia(texto);
  if (marcador !== null) return marcador;
  const t = semAcento(texto);
  const ausencia = ['sem evidencia', 'sem registro', 'nao comprovad', 'inexistente', 'informal'];
  if (ausencia.some((expressao) => t.includes(expressao))) return false;
  return null;
}

/**
 * Lê SÓ o marcador explícito "Evidência: sim|não" (ou "Evidências:"), sem
 * diferença de acento e de maiúsculas. Sem marcador, devolve `null`.
 * É a regra do formato de 18 colunas: lá, só o marcador vale (RF-178).
 * Se a célula tiver mais de um marcador e QUALQUER um for "não", vale
 * "sem evidência" (na dúvida, a trava do Quadro 6 age).
 * Ex.: lerMarcadorEvidencia('Evidências: SIM')                                -> true
 * Ex.: lerMarcadorEvidencia('Controle A. Evidência: sim; Controle B. Evidência: não') -> false
 * Ex.: lerMarcadorEvidencia('Conferência sem registro')                       -> null
 */
export function lerMarcadorEvidencia(texto: string): boolean | null {
  const respostas = [...semAcento(texto).matchAll(/evidencias?\s*:\s*(sim|nao)\b/g)].map((m) => m[1]);
  if (respostas.length === 0) return null;
  return !respostas.includes('nao');
}

/**
 * Lê uma célula de "Sim" ou "Não" (col. 17, Teste de Integridade).
 * Aceita "Sim"/"S" e "Não"/"Nao"/"N", sem diferença de acento e de maiúsculas.
 * Ex.: lerSimNao(' SIM ') -> true; lerSimNao('NÃO') -> false; lerSimNao('Talvez') -> null.
 */
export function lerSimNao(texto: string): boolean | null {
  const t = semAcento(texto);
  if (t === 'sim' || t === 's') return true;
  if (t === 'nao' || t === 'n') return false;
  return null;
}

/**
 * Lê um número escrito pela skill, com vírgula ou ponto decimal.
 * Célula que não é só um número devolve `null` (e não é comparada).
 * Ex.: lerNumeroSkill('10,8') -> 10.8; lerNumeroSkill('10.8') -> 10.8;
 *      lerNumeroSkill('—') -> null; lerNumeroSkill('18 (Extremo)') -> null.
 */
export function lerNumeroSkill(texto: string): number | null {
  const t = texto.trim();
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
  return Number(t.replace(',', '.'));
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
 * Normaliza a estratégia de tratamento lida da tabela para uma das 4 oficiais da Tabela 8.
 * `reconhecida` diz se o texto era mesmo uma das 4; se não era (ou se veio
 * vazio), grava-se "Mitigar" e quem chama AVISA (RF-181), em vez de trocar em silêncio.
 * Ex.: 'Compartilhar o risco' -> { estrategia: 'Compartilhar', reconhecida: true }
 * Ex.: 'Reduzir'              -> { estrategia: 'Mitigar', reconhecida: false }
 */
function normalizarEstrategia(texto: string): {
  estrategia: EstrategiaTratamento;
  reconhecida: boolean;
} {
  const t = semAcento(texto);
  if (t.startsWith('compartilh')) return { estrategia: 'Compartilhar', reconhecida: true };
  if (t.startsWith('evit')) return { estrategia: 'Evitar', reconhecida: true };
  if (t.startsWith('aceit')) return { estrategia: 'Aceitar', reconhecida: true };
  if (t.startsWith('mitig')) return { estrategia: 'Mitigar', reconhecida: true };
  return { estrategia: 'Mitigar', reconhecida: false };
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
 * Resume a versão da matriz de um lote de fichas.
 * Ex.: duas fichas de 16 colunas -> '16'; uma de 16 e uma de 18 -> 'misto'; nenhuma -> null.
 */
export function contarFormato(fichas: LinhaImportadaSkill[]): '16' | '18' | 'misto' | null {
  if (fichas.length === 0) return null;
  const tem16 = fichas.some((f) => f.formatoColunas === 16);
  const tem18 = fichas.some((f) => f.formatoColunas === 18);
  if (tem16 && tem18) return 'misto';
  return tem18 ? '18' : '16';
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
  formato: '16' | '18' | 'misto' | null;
} {
  const fichas: LinhaImportadaSkill[] = [];
  const avisos: string[] = [];
  const erros: string[] = [];

  // Numera as linhas ANTES de filtrar as de tabela: o número que aparece nas
  // mensagens é o da linha no texto colado (1 = primeira linha, mesmo que seja
  // um título ou parágrafo). Assim o analista acha a linha no texto.
  const linhas = markdownBruto
    // /\r?\n/: aceita quebra de linha do Windows (\r\n) e do Linux/macOS (\n).
    .split(/\r?\n/)
    .map((texto, indice) => ({ texto: texto.trim(), numero: indice + 1 }))
    .filter((l) => l.texto.startsWith('|') && l.texto.endsWith('|'));

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].texto;
    const linhaTexto = linhas[i].numero;

    // Ignora linha separadora de Markdown (ex.: |---|---|)
    if (/^\|[\s\-:|]+\|$/.test(linha)) {
      continue;
    }

    const colunas = linha
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    // Ignora a linha de cabeçalho da tabela (vem antes da contagem de colunas)
    const primeiraColunaLower = (colunas[0] ?? '').toLowerCase();
    if (
      primeiraColunaLower === 'id' ||
      primeiraColunaLower === 'código' ||
      primeiraColunaLower === 'codigo'
    ) {
      continue;
    }

    // Versão da linha, pelo número de colunas:
    //   18 ou mais -> formato novo (as colunas além da 18 são ignoradas);
    //   17         -> formato novo, com a Justificativa (col. 18) vazia;
    //   10 a 12 e 14 a 16 -> formato de 16 colunas (o de hoje);
    //   13         -> tabela do Regime A: erro, o RADAR só importa o Regime B;
    //   menos de 10 -> linha curta demais: ignorada, mas com aviso (nunca em silêncio).
    const total = colunas.length;
    if (total === 13) {
      erros.push(
        `Linha ${linhaTexto}: a tabela parece ser do Regime A (13 colunas, sem 'Objeto de GR'). O RADAR só importa a matriz do Regime B (16 ou 18 colunas).`
      );
      continue;
    }
    if (total < 10) {
      avisos.push(`Linha ${linhaTexto} ignorada: tem ${total} colunas; a matriz do Regime B tem 16 ou 18.`);
      continue;
    }
    const formatoColunas: 16 | 18 = total >= 17 ? 18 : 16;

    // Mapeamento das colunas do §4 (Regime B) da skill `cgov-gestao-riscos-v4`
    // (índice no código = número da coluna − 1):
    // 0: ID | 1: Objeto de GR | 2: Descrição na sintaxe | 3: Categoria |
    // 4: P  | 5: I            | 6: Inerente             | 7: Classe    |
    // 8: Controles e evidências | 9: Eficácia e fator   | 10: Residual |
    // 11: Classe residual | 12: Apetite da categoria | 13: Crítico? | 14: Estratégia | 15: KRI |
    // Só no formato de 18: 16: Teste de Integridade (Sim/Não) | 17: Justificativa
    const codigoRadar = colunas[0] || `RSC-SKILL-${fichas.length + 1}`;
    const nomeObjeto = colunas[1] || 'Processo Normativo Analisado';
    const descricaoPadrao = colunas[2] || '';
    const categoriaBruta = colunas[3]; // vazia = recusada (não há categoria "padrão")

    // Cols. 17 e 18, Teste de Integridade (RF-185, RF-194): só no formato de 18.
    // Col. 17 tem de ser "Sim" ou "Não" (aceita "S"/"N"); outro valor, inclusive
    // vazio, recusa a linha. No formato de 16, vale "não aplicável", como antes
    // (e a linha ganha um aviso mais abaixo).
    let testeIntegridadeAplicavel = false;
    let justificativaNaoIntegridade: string | undefined;
    if (formatoColunas === 18) {
      const teste = lerSimNao(colunas[16] ?? '');
      if (teste === null) {
        erros.push(`Linha ${codigoRadar}: o Teste de Integridade (col. 17) deve ser 'Sim' ou 'Não'.`);
        continue;
      }
      testeIntegridadeAplicavel = teste;
      // Linha de 17 colunas: a col. 18 não existe e fica vazia (undefined).
      justificativaNaoIntegridade = colunas[17]?.trim() || undefined;
    }

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
        testeIntegridadeAplicavel,
        justificativaNaoIntegridade,
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

    // Validação de sempre, agora com os valores REAIS das cols. 17 e 18.
    // Ex.: col. 17 "Sim", categoria "Operacional" e justificativa "curta" (menos
    // de 10 caracteres) -> erro da regra 3. Em risco de Integridade, a
    // justificativa não é exigida (a categoria já é a de Integridade).
    const validacaoCat = validarRegraIntegridade({
      categoriaNome,
      subcategoriaIntegridade,
      testeIntegridadeAplicavel,
      justificativaNaoIntegridade,
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
    // Sem valor padrão: estratégia vazia é lida como vazia e gera aviso (RF-181).
    const estrategiaTexto = colunas[14] ?? '';
    // LAC-03: o importador NUNCA inventa KRI. Coluna vazia = sem KRI sugerido ('').
    // (O texto antigo "Indicador a definir com a 1ª Linha" foi removido: virava um KRI falso.)
    const kriSugerido = colunas[15] ?? '';

    const eficaciaLida = interpretarEficaciaControle(eficaciaTexto);
    // Evidência da col. 9 (RF-178). `null` = não deu para ler: vale "sem
    // evidência" (na dúvida, a trava do Quadro 6 age) e há aviso.
    //   - formato de 18: SÓ o marcador "Evidência: sim|não" vale; sem ele
    //     (inclusive célula vazia ou "sem registro"), aviso;
    //   - formato de 16: o marcador, se houver; senão as expressões de
    //     ausência ("sem registro", "inexistente"...) valem sem aviso.
    const evidenciaLida =
      formatoColunas === 18 ? lerMarcadorEvidencia(colunas[8] ?? '') : lerEvidencia(controlesTexto);
    const possuiEvidencia = evidenciaLida ?? false;
    const apetiteCategoria = normalizarApetite(apetiteTexto, apetitePadrao);

    // Recalcula sempre pelo Motor Matemático Oficial RADAR:
    const calculo = calcularRiscoCompletoRadar({
      probabilidade: pNum,
      impacto: iNum,
      eficaciaControle: eficaciaLida,
      possuiEvidenciaComprovada: possuiEvidencia,
      apetiteCategoria,
    });

    // Trava da LAC-13: risco crítico (fora do apetite da DAR ou com DAR pendente)
    // não pode vir com "Aceitar". A linha é recusada, como nas outras validações.
    // Ex.: P=5, I=5, sem controle -> residual 25; "Aceitar" é recusado.
    const { estrategia, reconhecida: estrategiaReconhecida } = normalizarEstrategia(estrategiaTexto);
    if (estrategia === 'Aceitar' && exigeTratamento(calculo.statusCritico)) {
      const situacao = calculo.statusCritico === 'sim' ? 'fora do apetite da DAR' : 'com DAR pendente';
      const residual = String(calculo.nivelResidual).replace('.', ',');
      erros.push(
        `Linha ${codigoRadar}: risco crítico (residual ${residual}, ${calculo.classificacaoResidual}, ${situacao}) não pode ter a estratégia "Aceitar"; escolha Mitigar, Compartilhar ou Evitar na tabela da skill.`
      );
      continue;
    }

    // A partir daqui a linha é ACEITA. Os avisos abaixo não bloqueiam: dizem
    // o que foi lido e o que o RADAR fez, em vez de corrigir em silêncio.
    // Seguem a ordem das colunas, para o analista achar o ponto na tabela.

    // Formato de 16: a tabela não traz o Teste de Integridade (RN-006).
    if (formatoColunas === 16) {
      avisos.push(
        `Linha ${codigoRadar}: a tabela não traz o Teste de Integridade (formato de 16 colunas); confira na ficha se o risco envolve decisão sobre beneficiário, licença, fiscalização ou contratação (RN-006).`
      );
    }

    // Col. 3: descrição fora da sintaxe do item 4.2.1 (RF-182).
    const bowTie = extrairBowTieDaSintaxe(descricaoPadrao);
    if (!bowTie.extraidoComSucesso) {
      avisos.push(
        `Linha ${codigoRadar}: a descrição não segue a sintaxe do item 4.2.1; a frase foi gravada como evento, e causa, consequência e objetivo ficam em branco para a unidade completar.`
      );
    }

    // Col. 9: não deu para ler a evidência (RF-178).
    if (evidenciaLida === null) {
      avisos.push(
        `Linha ${codigoRadar}: não foi possível ler se o controle tem evidência comprovada; o RADAR considerou sem evidência (eficácia máxima Fraco, Quadro 6).`
      );
    }

    // Col. 10: a trava de evidência reduziu a eficácia lida (RF-179).
    // Ex.: "Mediano (0,75)" sem evidência -> "Fraco (0,9)".
    if (calculo.travaEvidenciaAcionada) {
      const lida = `${eficaciaLida} (${formatarNivel(FATORES_QUADRO_6[eficaciaLida])})`;
      avisos.push(
        `Linha ${codigoRadar}: a eficácia '${lida}' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6).`
      );
    }

    // Cols. 7 e 11: conferência do cálculo da skill com o do RADAR (RF-180).
    // Só compara a célula que é número; a tolerância é de 0,01 (o "+ 1e-9"
    // absorve o erro de ponto flutuante: 10,81 − 10,8 dá 0,0100000000001).
    // Ex.: P=3, I=4 (Quadro 7: 18), skill com inerente 12 -> aviso.
    const inerenteSkill = lerNumeroSkill(colunas[6] ?? '');
    const residualSkill = lerNumeroSkill(colunas[10] ?? '');
    const diverge = (skill: number | null, radar: number) =>
      skill !== null && Math.abs(skill - radar) > 0.01 + 1e-9;
    if (diverge(inerenteSkill, calculo.nivelInerente) || diverge(residualSkill, calculo.nivelResidual)) {
      // Célula não numérica aparece como foi escrita; número, com vírgula decimal.
      const comoSkill = (n: number | null, bruto: string) => (n === null ? bruto : formatarNivel(n));
      avisos.push(
        `Linha ${codigoRadar}: a skill informou inerente ${comoSkill(inerenteSkill, colunas[6] ?? '')} e residual ${comoSkill(residualSkill, colunas[10] ?? '')}; o RADAR calculou inerente ${formatarNivel(calculo.nivelInerente)} e residual ${formatarNivel(calculo.nivelResidual)} (Quadro 7 e Quadro 6). Valem os números do RADAR.`
      );
    }

    // Col. 15: estratégia vazia ou fora das 4 da Tabela 8 (RF-181).
    if (!estrategiaReconhecida) {
      const lida = estrategiaTexto.trim() || '(vazia)';
      avisos.push(
        `Linha ${codigoRadar}: estratégia '${lida}' não reconhecida; o RADAR gravou 'Mitigar'. Confira na ficha.`
      );
    }

    // LAC-03: o KRI importado traz, no máximo, o NOME do indicador; falta fórmula, fonte,
    // periodicidade, limite e responsável. Em risco crítico isso trava o envio, então avisamos
    // já na importação (não bloqueia: a linha entra como preliminar e a unidade completa o KRI).
    if (exigeTratamento(calculo.statusCritico)) {
      avisos.push(`Linha ${codigoRadar}: risco crítico sem KRI completo; complete o KRI na ficha antes do envio.`);
    }

    fichas.push({
      linhaTexto,
      formatoColunas,
      testeIntegridadeAplicavel,
      justificativaNaoIntegridade,
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
      estrategiaTratamento: estrategia,
      kriSugerido,
      memoriaCalculo: calculo.memoriaCalculo,
      origemPreliminarCgov: true,
      statusFluxo: 'preliminar_cgov',
    });
  }

  return { fichas, avisos, erros, formato: contarFormato(fichas) };
}
