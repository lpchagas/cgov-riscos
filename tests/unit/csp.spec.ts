import { describe, it, expect } from 'vitest';
import { montarCsp, CABECALHOS_SEGURANCA } from '../../scripts/compartilhado/csp';

describe('Política de Segurança de Conteúdo (CSP)', () => {
  it('libera a origem do Supabase em connect-src', () => {
    expect(montarCsp('https://abc.supabase.co')).toContain("connect-src 'self' https://abc.supabase.co;");
  });

  it("não permite 'unsafe-inline' em scripts", () => {
    const csp = montarCsp('https://abc.supabase.co');
    expect(csp).toContain("script-src 'self';");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('sem origem (modo demonstração) fecha connect-src só com self', () => {
    expect(montarCsp('')).toContain("connect-src 'self';");
  });

  it('expõe os cabeçalhos de segurança fixos', () => {
    expect(CABECALHOS_SEGURANCA).toEqual({
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
  });
});
