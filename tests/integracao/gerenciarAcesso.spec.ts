/**
 * INTEGRAÇÃO: A FUNÇÃO `gerenciar-acesso` (Etapa B2, Tarefa 9)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Chama a Edge Function de verdade (`/functions/v1/gerenciar-acesso`) e confere:
 * quem pode (só a CGOV), os códigos de resposta (401, 403, 201, 409, 200), a
 * trilha de auditoria e o envio do link pelo Mailpit.
 * ATENÇÃO: a função só responde enquanto `npm run db:funcoes` estiver rodando.
 * ============================================================================
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DOMINIO_TESTE,
  acharLogin,
  chavePublica,
  clienteServico,
  entrarComo,
  garantirSupabaseNoAr,
  limparContasDeTeste,
  mensagensPara,
  urlApi,
} from './ajudantes';

const EMAIL_NOVA = `nova${DOMINIO_TESTE}`;

/** Chama a função com a sessão de `cliente` (ou sem login, se for null). */
async function chamar(cliente: SupabaseClient | null, corpo: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: chavePublica() };
  if (cliente) {
    const { data } = await cliente.auth.getSession();
    headers.Authorization = `Bearer ${data.session!.access_token}`;
  }
  const r = await fetch(`${urlApi()}/functions/v1/gerenciar-acesso`, {
    method: 'POST',
    headers,
    body: JSON.stringify(corpo),
  });
  let json: any = null;
  try {
    json = await r.json();
  } catch {
    /* corpo vazio */
  }
  return { status: r.status, json };
}

describe('Edge Function gerenciar-acesso (Supabase local)', () => {
  let cgov: SupabaseClient;
  let gestor: SupabaseClient;
  let unidadeId: string;
  let idCgov: string;
  let idNova = '';

  beforeAll(async () => {
    await garantirSupabaseNoAr();
    const opcoes = await fetch(`${urlApi()}/functions/v1/gerenciar-acesso`, { method: 'OPTIONS' });
    if (opcoes.status !== 200) {
      throw new Error('RADAR: rode `npm run db:funcoes` em outro terminal antes de `npm run test:integracao`.');
    }
    await limparContasDeTeste();
    cgov = await entrarComo('cgov@radar.test');
    gestor = await entrarComo('gestor.uc@radar.test');
    idCgov = (await cgov.auth.getUser()).data.user!.id;
    const u = await clienteServico().from('unidades').select('id').eq('icmbio_id', '23.3000').single();
    unidadeId = u.data!.id;
  });
  afterAll(async () => {
    await limparContasDeTeste();
  });

  const pedidoCriar = (email: string, extra: object = {}) => ({
    acao: 'criar',
    nome: 'Pessoa Fictícia de Integração',
    email,
    unidade_id: unidadeId,
    papel: 'gestor',
    titular: false,
    enviar_link: false,
    ...extra,
  });

  it('gestor.uc@radar.test recebe 403', async () => {
    const r = await chamar(gestor, pedidoCriar(`x${DOMINIO_TESTE}`));
    expect(r.status).toBe(403);
    expect(r.json.erro).toMatch(/^RADAR:/);
  });

  it('sem login recebe 401', async () => {
    const r = await chamar(null, pedidoCriar(`x${DOMINIO_TESTE}`));
    expect(r.status).toBe(401);
  });

  it('a CGOV cria a conta (201), com perfil, trilha e link no Mailpit', async () => {
    const r = await chamar(cgov, pedidoCriar(EMAIL_NOVA, { enviar_link: true }));
    expect(r.status).toBe(201);
    idNova = r.json.id;

    const perfil = await clienteServico().from('perfis_usuarios').select('*').eq('id', idNova).single();
    expect(perfil.data?.email).toBe(EMAIL_NOVA);
    expect(perfil.data?.papel_governanca).toBe('gestor');

    const trilha = await clienteServico()
      .from('auditoria_log')
      .select('usuario_id, operacao')
      .eq('tabela_afetada', 'perfis_usuarios')
      .eq('registro_id', idNova);
    expect(trilha.data?.length).toBeGreaterThanOrEqual(1);
    expect(trilha.data?.[0].usuario_id).toBe(idCgov);

    const msgs = await mensagensPara(EMAIL_NOVA);
    expect(msgs.some((m) => m.assunto === 'Seu link de acesso ao RADAR' && m.texto.includes('/entrar/retorno?token_hash='))).toBe(true);
  });

  it('criar o mesmo e-mail de novo recebe 409', async () => {
    const r = await chamar(cgov, pedidoCriar(EMAIL_NOVA));
    expect(r.status).toBe(409);
  });

  it('enviar_link com um id válido e um inexistente: um enviado e uma falha', async () => {
    // O Auth só reenvia link à mesma pessoa depois de `max_frequency` (1 s no config.toml);
    // o `criar` acima já enviou um, então esperamos um pouco para não tomar 429.
    await new Promise((resolver) => setTimeout(resolver, 1500));
    const inexistente = '00000000-0000-4000-8000-000000000000';
    const r = await chamar(cgov, { acao: 'enviar_link', ids: [idNova, inexistente] });
    expect(r.status).toBe(200);
    expect(r.json.enviados).toEqual([idNova]);
    expect(r.json.falhas).toHaveLength(1);
    expect(r.json.falhas[0].id).toBe(inexistente);
  });

  it('listar_situacao traz convite_enviado_em preenchido', async () => {
    const r = await chamar(cgov, { acao: 'listar_situacao', ids: [idNova] });
    expect(r.status).toBe(200);
    expect(r.json.situacoes[idNova].convite_enviado_em).toBeTruthy();
  });

  it('listar_situacao com vários ids: devolve os de cada conta e nulos para quem não tem conta', async () => {
    const inexistente = '00000000-0000-4000-8000-000000000999';
    const r = await chamar(cgov, { acao: 'listar_situacao', ids: [idNova, inexistente] });
    expect(r.status).toBe(200);
    expect(Object.keys(r.json.situacoes).sort()).toEqual([idNova, inexistente].sort());
    expect(r.json.situacoes[idNova].convite_enviado_em).toBeTruthy();
    expect(r.json.situacoes[inexistente]).toEqual({ convite_enviado_em: null, ultimo_acesso_em: null });
  });

  it('um lote de 35 contas recebe o link de uma vez (35 enviados, 0 falhas)', async () => {
    const ids: string[] = [];
    for (let i = 1; i <= 35; i++) {
      const email = `lote-${String(i).padStart(2, '0')}${DOMINIO_TESTE}`;
      const { data, error } = await clienteServico().auth.admin.createUser({ email, email_confirm: true });
      expect(error).toBeNull();
      ids.push(data.user!.id);
    }
    const r = await chamar(cgov, { acao: 'enviar_link', ids });
    expect(r.status).toBe(200);
    expect(r.json.enviados).toHaveLength(35);
    expect(r.json.falhas).toHaveLength(0);
    expect(await acharLogin(`lote-35${DOMINIO_TESTE}`)).toBe(ids[34]);
  }, 120000);
});
