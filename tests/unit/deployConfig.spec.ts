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
});
