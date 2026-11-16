/**
 * AJUDANTES DOS TESTES DE INTEGRAÇÃO (Etapa B2, Tarefa 9)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Funções usadas pelos três arquivos de teste desta pasta. Elas falam com o
 * Supabase LOCAL (Docker) e com o Mailpit local (caixa de e-mail de mentira,
 * em http://127.0.0.1:54324). Nenhum e-mail sai do seu computador.
 *
 * REGRA: toda conta criada pelos testes tem e-mail terminando em
 * `@integracao.radar.test`. Assim `limparContasDeTeste` sabe o que apagar sem
 * encostar nas contas da semente de demonstração (`@radar.test`).
 * ============================================================================
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { criarClienteServico } from '../../scripts/compartilhado/clienteServico';

export const DOMINIO_TESTE = '@integracao.radar.test';
export const URL_MAILPIT = 'http://127.0.0.1:54324';

let servico: { cliente: SupabaseClient; url: string } | null = null;
let chaveAnon: string | null = null;
/** Titulares da semente no início da suíte (para devolver depois). */
let chavesOriginais: { id: string; titular_chefia: boolean }[] = [];

/** Cliente com a chave de serviço (ignora o RLS). */
export function clienteServico(): SupabaseClient {
  if (!servico) servico = criarClienteServico();
  return servico.cliente;
}

/** Endereço da API local (ex.: http://127.0.0.1:54321). */
export function urlApi(): string {
  if (!servico) servico = criarClienteServico();
  return servico.url;
}

/** Lê a chave pública (anon) do Supabase local. */
export function chavePublica(): string {
  if (!chaveAnon) {
    const saida = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const achado = /^ANON_KEY="?(.*?)"?$/m.exec(saida);
    if (!achado) throw new Error('RADAR: Rode npm run db:start antes (não achei a ANON_KEY).');
    chaveAnon = achado[1];
  }
  return chaveAnon;
}

/** Cliente "de visitante": usa a chave pública, sem login. */
export function clienteAnon(): SupabaseClient {
  return createClient(urlApi(), chavePublica(), { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Confere se o Supabase local responde; senão, falha com instrução clara. */
export async function garantirSupabaseNoAr(): Promise<void> {
  try {
    const r = await clienteServico().from('unidades').select('id').limit(1);
    if (r.error) throw new Error(r.error.message);
  } catch {
    throw new Error('RADAR: Rode npm run db:start antes de npm run test:integracao.');
  }
  // Guarda a "chave de titular" dos perfis para devolvê-la na limpeza.
  const { data } = await clienteServico().from('perfis_usuarios').select('id, titular_chefia');
  chavesOriginais = (data ?? []) as { id: string; titular_chefia: boolean }[];
}

/**
 * Entra como `email` SEM depender do e-mail: pede um link ao admin e o troca
 * por uma sessão. Devolve um cliente já logado (as chamadas dele passam pelo RLS).
 */
export async function entrarComo(email: string): Promise<SupabaseClient> {
  const { data, error } = await clienteServico().auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`RADAR: não consegui gerar o link de ${email}: ${error?.message ?? 'sem token'}`);
  }
  const cliente = clienteAnon();
  const r = await cliente.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'email' });
  if (r.error) throw new Error(`RADAR: não consegui entrar como ${email}: ${r.error.message}`);
  return cliente;
}

/** Mensagens recebidas por `email` no Mailpit (assunto e texto). */
export async function mensagensPara(email: string): Promise<{ assunto: string; texto: string }[]> {
  const busca = await fetch(`${URL_MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  if (!busca.ok) throw new Error(`RADAR: o Mailpit não respondeu (HTTP ${busca.status}).`);
  const lista = (await busca.json()) as { messages?: { ID: string; Subject: string }[] };
  const saida: { assunto: string; texto: string }[] = [];
  for (const m of lista.messages ?? []) {
    const det = await fetch(`${URL_MAILPIT}/api/v1/message/${m.ID}`);
    const corpo = (await det.json()) as { Text?: string; HTML?: string };
    saida.push({ assunto: m.Subject, texto: `${corpo.Text ?? ''}\n${corpo.HTML ?? ''}` });
  }
  return saida;
}

/** Apaga do Mailpit as mensagens de um e-mail (para a próxima rodada começar limpa). */
export async function apagarMensagensPara(email: string): Promise<void> {
  await fetch(`${URL_MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, { method: 'DELETE' });
}

/** Procura o id de login de um e-mail (null se não existir). */
export async function acharLogin(email: string): Promise<string | null> {
  for (let pagina = 1; ; pagina++) {
    const r = await clienteServico().auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (r.error) throw new Error(r.error.message);
    const achado = r.data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (achado) return achado.id;
    if (r.data.users.length < 1000) return null;
  }
}

/**
 * Faxina: apaga perfis e logins `@integracao.radar.test`, as mensagens deles
 * no Mailpit, e devolve a chave de titular dos perfis da semente que mudaram.
 */
export async function limparContasDeTeste(): Promise<void> {
  const c = clienteServico();
  const ids: string[] = [];
  const emails: string[] = [];
  for (let pagina = 1; ; pagina++) {
    const r = await c.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (r.error) throw new Error(r.error.message);
    for (const u of r.data.users) {
      if ((u.email ?? '').toLowerCase().endsWith(DOMINIO_TESTE)) {
        ids.push(u.id);
        emails.push(u.email!);
      }
    }
    if (r.data.users.length < 1000) break;
  }
  if (ids.length) {
    // Perfis primeiro (por lotes, para a URL não ficar enorme); depois os logins.
    for (let i = 0; i < ids.length; i += 50) {
      await c.from('perfis_usuarios').delete().in('id', ids.slice(i, i + 50));
    }
    for (const id of ids) await c.auth.admin.deleteUser(id);
  }
  // Perfis `@integracao` sem login (não deveria existir, mas não custa).
  await c.from('perfis_usuarios').delete().like('email', `%${DOMINIO_TESTE}`);
  for (const e of emails) await apagarMensagensPara(e);
  // Devolve a chave de titular da semente, se algum teste a mudou.
  for (const o of chavesOriginais) {
    await c.from('perfis_usuarios').update({ titular_chefia: o.titular_chefia }).eq('id', o.id).neq('titular_chefia', o.titular_chefia);
  }
}

/** Nome do contêiner do banco local (o mesmo usado pelo script `db:reset`). */
const CONTEINER_BANCO = 'supabase_db_cgov-riscos';

/**
 * Roda SQL como ADMINISTRADOR do banco local (psql dentro do contêiner).
 *
 * POR QUE EXISTE? Algumas faxinas não são possíveis nem com a chave de serviço:
 * o gatilho D2 recusa apagar risco APROVADO (e risco em validação fica
 * "travado"), mesmo para o administrador. Só uma TRANSAÇÃO que liga o sinal
 * `radar.fluxo` consegue devolver o risco a rascunho e apagá-lo — e a API
 * (supabase-js) não deixa ligar esse sinal, pois cada chamada é uma transação
 * separada. Uso EXCLUSIVO dos testes de integração, no banco local.
 *
 * Ex.: sqlComoAdministrador("select count(*) from public.riscos") -> "10"
 */
export function sqlComoAdministrador(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', CONTEINER_BANCO, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}

/**
 * Faxina dos riscos criados por um teste, em QUALQUER estado (inclusive
 * aprovado). Numa transação só: liga o sinal `radar.fluxo`, devolve os riscos
 * a rascunho e os apaga (controles, respostas, KRIs, medições e histórico do
 * fluxo vão junto, em cascata). A trilha de auditoria guarda o registro dessas
 * operações — é o "rastro" que fica, de propósito (a trilha não se apaga).
 */
export function apagarRiscosDeTeste(ids: string[]): void {
  const validos = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!validos.length) return;
  const lista = validos.map((id) => `'${id}'`).join(', ');
  sqlComoAdministrador(`
    begin;
    select set_config('radar.fluxo', 'on', true);
    update public.riscos set status_fluxo = 'rascunho' where id in (${lista}) and status_fluxo <> 'rascunho';
    delete from public.riscos where id in (${lista});
    commit;
  `);
}
