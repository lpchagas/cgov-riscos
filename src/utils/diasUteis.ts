/**
 * Dias úteis do prazo do alerta do KRI, espelho de `fn_somar_dias_uteis`,
 * `fn_dias_uteis_entre` e `fn_hoje` do banco. Dia útil = segunda a sexta que
 * não seja feriado. Datas são textos ISO (aaaa-mm-dd), sem fuso horário.
 */
import { FERIADOS_NACIONAIS } from './feriadosNacionais';

// Nota: as travas do SQL (n > 3660, intervalo > 36600 dias, data infinita) não são
// replicadas aqui, porque o front só usa n = 10 e datas vindas do banco.
const FERIADOS_PADRAO: ReadonlySet<string> = new Set(FERIADOS_NACIONAIS);

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** ISO -> dia contado a partir de 1970 (inteiro; evita qualquer problema de fuso). */
function paraDias(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / DIA_EM_MS);
}

/** Dia contado a partir de 1970 -> ISO. */
function paraIso(dias: number): string {
  return new Date(dias * DIA_EM_MS).toISOString().slice(0, 10);
}

/** true = segunda a sexta e não feriado. (1/1/1970 foi quinta-feira.) */
function ehDiaUtil(dias: number, feriados: ReadonlySet<string>): boolean {
  const diaDaSemana = (((dias + 4) % 7) + 7) % 7; // 0 = domingo ... 6 = sábado
  return diaDaSemana >= 1 && diaDaSemana <= 5 && !feriados.has(paraIso(dias));
}

/**
 * O n-ésimo dia útil DEPOIS de `d`. n <= 0 devolve a própria data.
 * Ex.: somarDiasUteis('2026-11-19', 10) = '2026-12-04' (pula o feriado de 20/11
 * e dois fins de semana); somarDiasUteis('2026-11-21', 10) (sábado) = '2026-12-04'.
 */
export function somarDiasUteis(
  d: string,
  n: number,
  feriados: ReadonlySet<string> = FERIADOS_PADRAO
): string {
  let dia = paraDias(d);
  let feitos = 0;
  while (feitos < n) {
    dia += 1;
    if (ehDiaUtil(dia, feriados)) feitos += 1;
  }
  return paraIso(dia);
}

/**
 * Dias úteis em (a, b]: NÃO conta o dia `a`, conta o dia `b`. Se b <= a, devolve 0.
 * Ex.: diasUteisEntre('2026-11-19', '2026-11-23') = 1 (20 é feriado; 21 e 22, fim de semana).
 */
export function diasUteisEntre(
  a: string,
  b: string,
  feriados: ReadonlySet<string> = FERIADOS_PADRAO
): number {
  const inicio = paraDias(a);
  const fim = paraDias(b);
  let total = 0;
  for (let dia = inicio + 1; dia <= fim; dia += 1) {
    if (ehDiaUtil(dia, feriados)) total += 1;
  }
  return total;
}

/**
 * "Hoje" no calendário de Brasília (America/Sao_Paulo), como `fn_hoje()` do banco.
 * Às 23h de 24/11 em Brasília já é 25/11 em UTC, mas a resposta é '2026-11-24'.
 * Aceita uma data para os testes (padrão: agora).
 */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  // 'en-CA' formata como aaaa-mm-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/**
 * Volta `n` dias úteis a partir de `d`: devolve o dia útil `x` tal que
 * `diasUteisEntre(x, d) === n`. Serve à semente de demonstração: "alerta no dia 3"
 * = ciência 3 dias úteis antes de hoje, em qualquer data.
 * Ex.: subtrairDiasUteis('2026-11-24', 3) = '2026-11-18'
 *      (24 conta 1; 23 conta 2; 22 e 21 são fim de semana; 20 é feriado; 19 conta 3;
 *      a ciência é o dia anterior ao 19, o dia 18).
 * n <= 0 devolve a própria data.
 */
export function subtrairDiasUteis(
  d: string,
  n: number,
  feriados: ReadonlySet<string> = FERIADOS_PADRAO
): string {
  if (n <= 0) return d;
  let dia = paraDias(d);
  let contados = 0;
  // Conta os dias úteis de `d` para trás: o n-ésimo é o primeiro dia do intervalo (x, d].
  while (contados < n) {
    if (ehDiaUtil(dia, feriados)) contados += 1;
    dia -= 1;
  }
  // `dia` está um dia antes do n-ésimo dia útil. A ciência real é sempre num dia útil:
  // se caiu em fim de semana ou feriado, continua voltando (a contagem não muda).
  while (!ehDiaUtil(dia, feriados)) dia -= 1;
  return paraIso(dia);
}
