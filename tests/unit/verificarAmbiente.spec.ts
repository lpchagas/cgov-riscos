/**
 * Testes do verificador do ambiente (scripts/verificar-ambiente/regras.ts).
 * Só testam as regras puras: nenhum comando é executado aqui.
 */
import { describe, expect, it } from 'vitest';
import {
  avaliarAmbiente,
  compararVersoes,
  lerVersao,
  type Ferramenta,
  type Leitura,
} from '../../scripts/verificar-ambiente/regras';

/** Avalia uma única leitura e devolve o veredito dela. */
function avaliar(l: Leitura, esperada = '2.122.0') {
  return avaliarAmbiente([l], esperada)[0];
}
const leitura = (ferramenta: Ferramenta, saida: string | null, erro?: string): Leitura => ({
  ferramenta,
  saida,
  erro,
});

describe('lerVersao', () => {
  it('extrai a primeira versão X.Y.Z', () => {
    expect(lerVersao('v24.21.0')).toBe('24.21.0');
    expect(lerVersao('Docker version 28.1.1, build 4eba377')).toBe('28.1.1');
    expect(lerVersao('gh version 2.63.0 (2025-01-01)')).toBe('2.63.0');
  });
  it('devolve null sem número', () => {
    expect(lerVersao('sem número')).toBeNull();
  });
});

describe('compararVersoes', () => {
  it('compara numericamente', () => {
    expect(compararVersoes('22.0.0', '24.21.0')).toBeLessThan(0);
    expect(compararVersoes('10.9.2', '10.9.2')).toBe(0);
    expect(compararVersoes('10.10.0', '10.9.0')).toBeGreaterThan(0);
  });
});

describe('avaliarAmbiente', () => {
  it('node 20 reprova e 24 aprova', () => {
    const velho = avaliar(leitura('node', 'v20.11.0'));
    expect(velho.ok).toBe(false);
    expect(velho.mensagem).toContain('22');
    expect(avaliar(leitura('node', 'v24.21.0')).ok).toBe(true);
  });

  it('docker parado: avisa e dá as duas dicas', () => {
    const v = avaliar(leitura('docker', null, 'failed to connect to the docker API'));
    expect(v.ok).toBe(false);
    expect(v.mensagem).toContain('não está respondendo');
    expect(v.dica).toContain('sudo service docker start');
    expect(v.dica).toContain('abra o Docker Desktop');
  });

  it('docker não instalado', () => {
    const v = avaliar(leitura('docker', null, 'docker: command not found'));
    expect(v.ok).toBe(false);
    expect(v.mensagem).toContain('não instalado');
  });

  it('docker Engine e Desktop são reconhecidos', () => {
    const e = avaliar(leitura('docker', '28.1.1|Docker Engine - Community'));
    expect(e.ok).toBe(true);
    expect(e.mensagem).toContain('Docker Engine');
    const d = avaliar(leitura('docker', '28.1.1|Docker Desktop 4.40.0 (187762)'));
    expect(d.ok).toBe(true);
    expect(d.mensagem).toContain('Docker Desktop');
  });

  it('supabase com versão diferente da esperada reprova com dica npm ci', () => {
    const v = avaliar(leitura('supabase', '2.120.0'));
    expect(v.ok).toBe(false);
    expect(v.dica).toContain('npm ci');
    expect(avaliar(leitura('supabase', '2.122.0')).ok).toBe(true);
    expect(avaliar(leitura('supabase', null)).dica).toContain('npm ci');
  });

  it('gh logado e não logado', () => {
    expect(avaliar(leitura('gh', 'github.com\n  ✓ Logged in to github.com account x')).ok).toBe(true);
    const v = avaliar(leitura('gh', 'You are not logged into any GitHub hosts'));
    expect(v.ok).toBe(false);
    expect(v.dica).toContain('gh auth login');
  });

  it('npm, git e chromium', () => {
    expect(avaliar(leitura('npm', '9.8.0')).ok).toBe(false);
    expect(avaliar(leitura('npm', '10.9.2')).ok).toBe(true);
    expect(avaliar(leitura('git', 'git version 2.43.0')).ok).toBe(true);
    expect(avaliar(leitura('git', null)).ok).toBe(false);
    expect(avaliar(leitura('chromium', '/x/chrome')).ok).toBe(true);
    const c = avaliar(leitura('chromium', null));
    expect(c.ok).toBe(false);
    expect(c.dica).toContain('npx playwright install --with-deps chromium');
  });
});
