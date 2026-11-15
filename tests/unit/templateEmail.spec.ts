/**
 * TESTE DO MODELO DO E-MAIL DE ACESSO (Etapa B2)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * O Supabase lê o modelo `supabase/templates/link-acesso.html` com um motor de
 * modelos (Go) que EXECUTA tudo o que estiver entre chaves duplas, até dentro de
 * comentários HTML. Uma chave dupla "solta" num comentário faz o modelo falhar e
 * o e-mail sai com o texto padrão em inglês. Este teste garante que só existem
 * as duas variáveis esperadas (SiteURL e TokenHash), com as chaves bem fechadas.
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEXTO = readFileSync(resolve(__dirname, '../../supabase/templates/link-acesso.html'), 'utf8');

describe('modelo do e-mail link-acesso.html', () => {
  it('usa só as variáveis SiteURL e TokenHash entre chaves duplas', () => {
    const abre = TEXTO.match(/\{\{/g) ?? [];
    const fecha = TEXTO.match(/\}\}/g) ?? [];
    const acoes = [...TEXTO.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]);
    expect(abre.length).toBe(fecha.length);
    expect(abre.length).toBe(acoes.length);
    expect(acoes.sort()).toEqual(['.SiteURL', '.TokenHash']);
  });

  it('o link leva a /entrar/retorno com token_hash e type=email', () => {
    expect(TEXTO).toContain('/entrar/retorno?token_hash={{ .TokenHash }}&type=email');
  });
});
