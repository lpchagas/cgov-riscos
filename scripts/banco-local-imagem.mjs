// =============================================================================
// scripts/banco-local-imagem.mjs — banco local sempre com a imagem padrão do CLI
// =============================================================================
// EXPLICAÇÃO DIDÁTICA:
// Quando alguém roda `supabase link` (para falar com a nuvem do piloto), o CLI
// grava em `supabase/.temp/postgres-version` a versão do Postgres da nuvem
// (ex.: 17.6.1.104). A partir daí, o `supabase start` sobe o banco LOCAL com
// essa mesma imagem, em vez da imagem padrão do CLI.
//
// Problema (achado em 2026-11-24): a imagem 17.6.1.104 tem um defeito na
// extensão supautils. Quando o papel `anon` ou `authenticated` chama uma
// função sem permissão, o servidor cai (segfault) em vez de responder
// "permission denied" (erro 42501). Isso derrubava os testes pgTAP 030, 050,
// 080, 081 e 082. A imagem padrão do CLI (17.11.x) não tem o defeito.
//
// Solução: antes de subir o banco local, apagamos esse arquivo de fixação.
// Ele é só um "lembrete" local (a pasta supabase/.temp não vai para o Git) e
// não afeta a ligação com a nuvem: o `project-ref` continua lá, então
// `supabase db push` e companhia seguem funcionando.
//
// Exemplo prático: no notebook, depois de um `supabase link`, o arquivo volta
// a existir; o próximo `npm run db:start` o apaga de novo e o banco sobe com
// a imagem padrão, igual ao desktop do escritório.
// =============================================================================

import { existsSync, rmSync } from 'node:fs'

const arquivoDeFixacao = 'supabase/.temp/postgres-version'

if (existsSync(arquivoDeFixacao)) {
  rmSync(arquivoDeFixacao)
  console.log(
    `[banco-local] ${arquivoDeFixacao} apagado: o banco local usa a imagem padrão do Supabase CLI.`,
  )
}
