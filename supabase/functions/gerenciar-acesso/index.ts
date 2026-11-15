/**
 * ============================================================================
 * EDGE FUNCTION `gerenciar-acesso` (roda no servidor, em Deno)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Criar conta de outra pessoa exige a chave secreta (`service_role`), que NUNCA
 * pode ir para o navegador. Por isso este é o ÚNICO lugar que a usa: um
 * pequeno servidor que só atende a CGOV.
 *
 * Usamos DOIS clientes:
 *  - cliente do CHAMADOR (chave pública + o login de quem chamou): confere se
 *    quem chama é da CGOV (`meu_perfil`) e grava o perfil. Assim a segurança
 *    por linha (RLS) e a trilha registram a CGOV como autora.
 *  - cliente ADMIN (chave secreta): cria/apaga a conta e lê a situação.
 *
 * Ações: criar | enviar_link | listar_situacao (ver `_shared/validacoesAcesso.ts`).
 * Este arquivo é Deno: não entra no `vue-tsc` (o tsconfig só inclui src/ e tests/).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validarPedido } from '../_shared/validacoesAcesso.ts';

// Sites autorizados a chamar a função pelo navegador (desenvolvimento local).
const ORIGENS_PERMITIDAS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5199',
  'http://127.0.0.1:5199',
];

function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS_PERMITIDAS.includes(origem) ? origem : ORIGENS_PERMITIDAS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function responder(req: Request, status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), 'Content-Type': 'application/json' },
  });
}

const erroJson = (req: Request, status: number, mensagem: string) =>
  responder(req, status, { erro: mensagem });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cabecalhosCors(req) });
  if (req.method !== 'POST') return erroJson(req, 405, 'RADAR: método não permitido.');

  const url = Deno.env.get('SUPABASE_URL')!;
  const chaveAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const chaveAdmin = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const autorizacao = req.headers.get('Authorization');
  if (!autorizacao) return erroJson(req, 401, 'RADAR: entre no sistema para continuar.');

  // 1) Cliente do chamador: tudo o que ele fizer passa pela RLS e pela trilha.
  const doChamador = createClient(url, chaveAnon, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: usuario, error: erroUsuario } = await doChamador.auth.getUser();
  if (erroUsuario || !usuario?.user) return erroJson(req, 401, 'RADAR: entre no sistema para continuar.');

  const { data: meuPerfil } = await doChamador.rpc('meu_perfil');
  const perfil = Array.isArray(meuPerfil) ? meuPerfil[0] : meuPerfil;
  if (!perfil || perfil.papel_governanca !== 'cgov') {
    return erroJson(req, 403, 'RADAR: só a CGOV gerencia acessos.');
  }

  // 2) Valida o pedido.
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return erroJson(req, 400, 'RADAR: pedido inválido.');
  }
  const validado = validarPedido(corpo);
  if (!validado.ok) return erroJson(req, 400, validado.mensagem);
  const pedido = validado.pedido;

  // 3) Cliente admin (chave secreta) e cliente anônimo para enviar o link.
  const admin = createClient(url, chaveAdmin, { auth: { persistSession: false, autoRefreshToken: false } });

  /** Envia o link de acesso a uma conta existente e marca a data do convite. */
  async function enviarUm(id: string): Promise<string | null> {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data?.user?.email) return 'conta não encontrada';
    // Cliente anônimo novo por envio: não herda sessão de ninguém.
    const anon = createClient(url, chaveAnon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: erroEnvio } = await anon.auth.signInWithOtp({
      email: data.user.email,
      options: { shouldCreateUser: false },
    });
    if (erroEnvio) return erroEnvio.message;
    const { error: erroMarca } = await admin.auth.admin.updateUserById(id, {
      app_metadata: { ...(data.user.app_metadata ?? {}), convite_enviado_em: new Date().toISOString() },
    });
    return erroMarca ? erroMarca.message : null;
  }

  async function enviarLote(ids: string[]) {
    const enviados: string[] = [];
    const falhas: { id: string; motivo: string }[] = [];
    for (const id of ids) {
      try {
        const motivo = await enviarUm(id);
        if (motivo) falhas.push({ id, motivo });
        else enviados.push(id);
      } catch (e) {
        falhas.push({ id, motivo: e instanceof Error ? e.message : 'falha inesperada' });
      }
    }
    return { enviados, falhas };
  }

  try {
    if (pedido.acao === 'criar') {
      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
        email: pedido.email,
        email_confirm: true,
      });
      if (erroCriar || !criado?.user) {
        const jaExiste = erroCriar?.status === 422 || /already|registered|exist/i.test(erroCriar?.message ?? '');
        if (jaExiste) return erroJson(req, 409, 'RADAR: já existe uma conta com este e-mail.');
        return erroJson(req, 500, `RADAR: não foi possível criar a conta (${erroCriar?.message ?? 'erro'}).`);
      }
      const id = criado.user.id;
      const { error: erroPerfil } = await doChamador.from('perfis_usuarios').insert({
        id,
        nome_completo: pedido.nome,
        email: pedido.email,
        cargo: pedido.cargo ?? null,
        unidade_id: pedido.unidade_id,
        papel_governanca: pedido.papel,
        titular_chefia: pedido.titular,
        ativo: true,
      });
      if (erroPerfil) {
        // Desfaz a conta para não sobrar usuário sem perfil.
        await admin.auth.admin.deleteUser(id);
        const msg = erroPerfil.message.startsWith('RADAR:') ? erroPerfil.message : `RADAR: ${erroPerfil.message}`;
        return erroJson(req, 400, msg);
      }
      if (pedido.enviar_link) await enviarLote([id]);
      return responder(req, 201, { id });
    }

    if (pedido.acao === 'enviar_link') {
      return responder(req, 200, await enviarLote(pedido.ids));
    }

    // listar_situacao
    // Em vez de 1 chamada por pessoa (`getUserById`, ~1.200 por carga da tela), lemos as
    // contas em PÁGINAS de 1.000 (`listUsers`) e guardamos só as dos ids pedidos.
    // Quem não tem conta continua na resposta, com os dois campos nulos (contrato igual ao anterior).
    const situacoes: Record<string, { convite_enviado_em: string | null; ultimo_acesso_em: string | null }> = {};
    const faltam = new Set<string>(pedido.ids);
    for (const id of pedido.ids) situacoes[id] = { convite_enviado_em: null, ultimo_acesso_em: null };
    const POR_PAGINA = 1000;
    for (let pagina = 1; faltam.size > 0; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        if (!faltam.has(u.id)) continue;
        faltam.delete(u.id);
        situacoes[u.id] = {
          convite_enviado_em: (u.app_metadata?.convite_enviado_em as string | undefined) ?? null,
          ultimo_acesso_em: u.last_sign_in_at ?? null,
        };
      }
      if (data.users.length < POR_PAGINA) break; // última página
    }
    return responder(req, 200, { situacoes });
  } catch (e) {
    return erroJson(req, 500, `RADAR: erro inesperado (${e instanceof Error ? e.message : 'desconhecido'}).`);
  }
});
