import { describe, expect, it } from 'vitest';
import {
  arquivoHeadersCloudflare,
  arquivoRedirectsCloudflare,
  configPowerPages,
  padroesDeBundle,
  validarOrigemSupabase,
} from '../../scripts/preparar-publicacao/regras';
import { montarCsp } from '../../scripts/compartilhado/csp';

describe('validarOrigemSupabase', () => {
  it('tira a barra final', () => {
    expect(validarOrigemSupabase('https://abc.supabase.co/')).toBe('https://abc.supabase.co');
  });
  it('aceita http apenas no computador local', () => {
    expect(validarOrigemSupabase('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321');
    expect(validarOrigemSupabase('http://localhost:54321')).toBe('http://localhost:54321');
  });
  it('recusa http em outros hosts, caminho, consulta, fragmento e texto sem protocolo', () => {
    expect(() => validarOrigemSupabase('http://abc.supabase.co')).toThrow();
    expect(() => validarOrigemSupabase('https://abc.supabase.co/rest/v1')).toThrow();
    expect(() => validarOrigemSupabase('https://abc.supabase.co/?a=1')).toThrow();
    expect(() => validarOrigemSupabase('https://abc.supabase.co/#x')).toThrow();
    expect(() => validarOrigemSupabase('abc.supabase.co')).toThrow();
  });
});

describe('padroesDeBundle', () => {
  it('gera padrões sem repetição, em ordem, ignorando arquivos sem hash', () => {
    expect(
      padroesDeBundle(['assets/index-AbC12_x.js', 'assets/index-Zz9.css', 'assets/RiscosView-k3J9a.js', 'favicon.ico']),
    ).toEqual(['RiscosView-*.js', 'index-*.css', 'index-*.js']);
  });
  it('usa só o último segmento como hash', () => {
    expect(padroesDeBundle(['assets/Riscos-Lista-AbC12_x.js'])).toEqual(['Riscos-Lista-*.js']);
  });
});

describe('arquivos do Cloudflare', () => {
  it('_redirects devolve tudo para o index.html', () => {
    expect(arquivoRedirectsCloudflare()).toBe('/* /index.html 200\n');
  });
  it('_headers traz a CSP e os demais cabeçalhos', () => {
    const t = arquivoHeadersCloudflare('https://abc.supabase.co');
    expect(t.startsWith('/*\n')).toBe(true);
    expect(t).toContain('  Content-Security-Policy: ' + montarCsp('https://abc.supabase.co'));
    expect(t).toContain('  X-Frame-Options: SAMEORIGIN');
  });
});

describe('configPowerPages', () => {
  it('aponta para a pasta dist', () => {
    const c = configPowerPages('RADAR Piloto Sede', ['assets/index-AbC12_x.js']) as Record<string, unknown>;
    expect(c.compiledPath).toBe('dist');
    expect(c.siteName).toBe('RADAR Piloto Sede');
    expect(c.bundleFilePatterns).toEqual(['index-*.js']);
  });
});

describe('padroesDeBundle com hash real do Vite (8 caracteres, pode ter "-")', () => {
  it('não corta o nome quando o hash contém hífen', () => {
    expect(padroesDeBundle(['assets/EntrarView--NHsx123.js', 'assets/Skeleton-Cm-aB3d5.css'])).toEqual([
      'EntrarView-*.js',
      'Skeleton-*.css',
    ]);
  });
});
