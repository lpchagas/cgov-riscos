/**
 * INTEGRAÇÃO: LOGIN POR LINK NO E-MAIL (Etapa B2, Tarefa 9)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Prova, contra o Supabase local de verdade, que:
 *   1. quem TEM conta recebe o e-mail "Seu link de acesso ao RADAR" com o link
 *      `/entrar/retorno?token_hash=...`;
 *   2. quem NÃO tem conta não ganha conta e não recebe e-mail (o cadastro livre
 *      está bloqueado: `shouldCreateUser: false`).
 * ============================================================================
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  DOMINIO_TESTE,
  acharLogin,
  apagarMensagensPara,
  clienteAnon,
  garantirSupabaseNoAr,
  limparContasDeTeste,
  mensagensPara,
} from './ajudantes';

describe('login por link no e-mail (Supabase local)', () => {
  beforeAll(async () => {
    await garantirSupabaseNoAr();
    await apagarMensagensPara('gestor.uc@radar.test');
  });
  afterAll(async () => {
    await apagarMensagensPara('gestor.uc@radar.test');
    await limparContasDeTeste();
  });

  it('para gestor.uc@radar.test, o Mailpit recebe o link de acesso', async () => {
    const r = await clienteAnon().auth.signInWithOtp({
      email: 'gestor.uc@radar.test',
      options: { shouldCreateUser: false },
    });
    expect(r.error).toBeNull();
    const msgs = await mensagensPara('gestor.uc@radar.test');
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    expect(msgs[0].assunto).toBe('Seu link de acesso ao RADAR');
    expect(msgs[0].texto).toContain('/entrar/retorno?token_hash=');
  });

  it(`para ninguem${DOMINIO_TESTE}, nenhuma conta é criada e o Mailpit não recebe nada`, async () => {
    const email = `ninguem${DOMINIO_TESTE}`;
    await clienteAnon().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    expect(await acharLogin(email)).toBeNull();
    expect(await mensagensPara(email)).toHaveLength(0);
  });
});
