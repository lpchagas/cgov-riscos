/**
 * TRAVA DE SEGURANÇA DO `--sim` — para onde o importador vai gravar?
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * A opção `--sim` (usada pelo `npm run db:reset`) aplica as mudanças da
 * estrutura SEM perguntar "Aplicar? (s/N)". Isso é ótimo no banco LOCAL de
 * desenvolvimento, que é apagado e recriado o tempo todo. Mas, se a variável
 * SUPABASE_URL estiver apontando para um banco na nuvem (homologação ou
 * produção), o `--sim` gravaria lá sem ninguém confirmar.
 *
 * Regra: com `--sim`, só aceitamos endereço local (127.0.0.1, localhost ou
 * ::1). Para gravar sem perguntar num banco remoto, é preciso dizer isso de
 * propósito, com `--permitir-remoto`.
 *
 * Exemplos:
 *   npm run sync:estrutura -- --sim                        (local: segue)
 *   SUPABASE_URL=https://x.supabase.co npm run sync:estrutura -- --sim
 *                                                          (remoto: RECUSA)
 *   SUPABASE_URL=https://x.supabase.co npm run sync:estrutura -- --sim --permitir-remoto
 *                                                          (remoto, decisão explícita: segue)
 *
 * As funções aqui são "puras" (não leem o ambiente nem o banco): por isso são
 * testadas no Vitest (tests/unit/syncEstrutura.spec.ts).
 * ============================================================================
 */

/** Nomes de máquina que significam "este computador". */
const NOMES_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/**
 * A URL aponta para este computador?
 * Compara o NOME DA MÁQUINA inteiro (não um pedaço do texto): assim
 * `https://localhost.exemplo.com` NÃO passa por local.
 * Ex.: eEnderecoLocal('http://127.0.0.1:54321') → true
 */
export function eEnderecoLocal(url: string): boolean {
  try {
    return NOMES_LOCAIS.has(new URL(url).hostname);
  } catch {
    return false; // texto que nem é URL: não é local
  }
}

/**
 * Lança um erro "RADAR: ..." quando o `--sim` tentaria gravar sem perguntar
 * num banco que não é local (e não houve `--permitir-remoto`).
 * Sem `--sim`, sempre segue: o importador vai perguntar antes de gravar.
 */
export function conferirDestinoDoSim(url: string, opcoes: { sim: boolean; permitirRemoto: boolean }): void {
  if (!opcoes.sim || opcoes.permitirRemoto || eEnderecoLocal(url)) return;
  // Mostra só o nome da máquina (nunca a URL inteira, que poderia trazer senha).
  let destino = 'endereço inválido';
  try {
    destino = new URL(url).host;
  } catch {
    /* mantém "endereço inválido" */
  }
  throw new Error(
    `RADAR: o --sim grava sem perguntar e só é aceito no banco LOCAL (127.0.0.1/localhost). ` +
      `O destino agora é ${destino}. Rode sem --sim (para confirmar na tela) ` +
      `ou, se a gravação remota for mesmo intencional, acrescente --permitir-remoto.`,
  );
}
