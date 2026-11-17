import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Artefatos de Implantação (Docker para CGTI e Vercel)', () => {
  it('possui Dockerfile multi-stage (Node build + Nginx Alpine) e docker-compose.yml comentados', () => {
    const dockerfile = readFileSync(resolve(__dirname, '../../Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('FROM node:22-alpine AS construtor');
    expect(dockerfile).toContain('FROM nginx:1.27-alpine');
    expect(existsSync(resolve(__dirname, '../../docker-compose.yml'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../nginx.conf'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../vercel.json'))).toBe(true);
  });

  it('Dockerfile recebe URL e chave anon como argumentos e confere o pacote', () => {
    const dockerfile = readFileSync(resolve(__dirname, '../../Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('ARG VITE_SUPABASE_URL');
    expect(dockerfile).toContain('ARG VITE_SUPABASE_ANON_KEY');
    expect(dockerfile).toContain('RUN npm run conferir:dist');
  });

  it('.dockerignore existe e barra segredos, dados pessoais e artefatos', () => {
    const caminho = resolve(__dirname, '../../.dockerignore');
    expect(existsSync(caminho)).toBe(true);
    const linhas = readFileSync(caminho, 'utf-8').split('\n').map((l) => l.trim());
    for (const esperada of ['.env', '.env.*', '_temp', 'node_modules', 'dist', 'playwright-report', 'test-results', 'supabase/.temp']) {
      expect(linhas).toContain(esperada);
    }
  });
});
