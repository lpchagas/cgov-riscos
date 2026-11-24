/**
 * Regras do limite de alerta do KRI (LAC-03), espelho em TypeScript das
 * regras do banco (`supabase/migrations/20261123002_lac03_alerta_kri.sql`).
 * O banco é a fonte da verdade; se uma regra mudar lá, mude aqui também.
 */

/** Os 4 operadores aceitos. Ex.: '<' com valor 80 = "alerta quando a leitura for menor que 80". */
export type OperadorLimite = '>' | '>=' | '<' | '<=';

/**
 * A leitura passa do limite (há alerta)?
 * Ex.: passaDoLimite(79, '<', 80) = true; passaDoLimite(80, '<', 80) = false.
 */
export function passaDoLimite(valor: number, op: OperadorLimite, limite: number): boolean {
  switch (op) {
    case '>':
      return valor > limite;
    case '>=':
      return valor >= limite;
    case '<':
      return valor < limite;
    case '<=':
      return valor <= limite;
  }
}

const TEXTO_DO_OPERADOR: Record<OperadorLimite, string> = {
  '>': 'maior que',
  '>=': 'maior ou igual a',
  '<': 'menor que',
  '<=': 'menor ou igual a',
};

/**
 * Escreve o limite por extenso. Ex.: textoLimite('<', 80, '%') = "menor que 80 %";
 * textoLimite('>=', 2) = "maior ou igual a 2".
 */
export function textoLimite(op: OperadorLimite, valor: number, unidade?: string): string {
  const base = `${TEXTO_DO_OPERADOR[op]} ${valor}`;
  return unidade ? `${base} ${unidade}` : base;
}

/** Palavras que mudam o tamanho do número ("10 mil" = 10.000): nunca são unidade. */
const MAGNITUDES = new Set([
  'mil', 'milhao', 'milhão', 'milhoes', 'milhões',
  'bilhao', 'bilhão', 'bilhoes', 'bilhões',
  'trilhao', 'trilhão', 'trilhoes', 'trilhões',
]);

// Símbolo + número: '< 80%', '>=2,5 dias' (espaço opcional).
// A unidade é "%" OU uma palavra de 3+ letras (assim "ou" e "e" não viram unidade).
const COM_SIMBOLO = /^(<=|>=|<|>)\s*(\d+(?:[.,]\d+)?)\s*(%|\p{L}{3,})?$/u;
// Palavras + número: 'abaixo de 70%' (espaço obrigatório depois da expressão).
const COM_PALAVRAS =
  /^(abaixo de|acima de|menor que|maior que)\s+(\d+(?:[.,]\d+)?)\s*(%|\p{L}{3,})?$/u;

const OPERADOR_DA_PALAVRA: Record<string, OperadorLimite> = {
  'abaixo de': '<',
  'menor que': '<',
  'acima de': '>',
  'maior que': '>',
};

/**
 * Traduz o texto antigo do limite SÓ quando ele é inequívoco (mesma regra de
 * `fn_converter_limite_texto` no banco). Devolve nulo quando uma pessoa precisa decidir.
 *
 * Converte: '< 80%' -> {<, 80, '%'}; 'Abaixo de 70%' -> {<, 70, '%'};
 *           '>= 2,5 dias' -> {>=, 2.5, 'dias'}; 'menor que 4' -> {<, 4}.
 * Não converte (nulo): 'Até 10%', 'Entre 5 e 10', '> 5 ou', '> 10 mil',
 *           '< 1,000' (milhar ou decimal? ponto/vírgula + exatamente 3 dígitos é ambíguo).
 */
export function converterLimiteTexto(
  t: string
): { operador: OperadorLimite; valor: number; unidade?: string } | null {
  if (typeof t !== 'string') return null;
  // Como o banco: tira só espaços das pontas e ignora maiúsculas.
  const texto = t.replace(/^ +| +$/g, '').toLowerCase();
  const m = COM_SIMBOLO.exec(texto) ?? COM_PALAVRAS.exec(texto);
  if (!m) return null;

  const [, op, numero, unidade] = m;
  if (/[.,]\d{3}$/.test(numero)) return null; // '1.000' / '2,500': ambíguo
  if (unidade && MAGNITUDES.has(unidade)) return null; // '10 mil' não é unidade

  const operador = (OPERADOR_DA_PALAVRA[op] ?? op) as OperadorLimite;
  const resultado: { operador: OperadorLimite; valor: number; unidade?: string } = {
    operador,
    valor: Number(numero.replace(',', '.')),
  };
  if (unidade) resultado.unidade = unidade;
  return resultado;
}
