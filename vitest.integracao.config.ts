/**
 * CONFIGURAÇÃO DOS TESTES DE INTEGRAÇÃO (Vitest)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Estes testes falam com o Supabase LOCAL de verdade (Docker), por isso ficam
 * separados dos testes de unidade (`vite.config.ts`, que só olha `tests/unit/`).
 *   - ambiente `node` (sem navegador simulado);
 *   - um arquivo de cada vez (`fileParallelism: false`), porque todos mexem no
 *     mesmo banco e na mesma caixa de e-mail (Mailpit);
 *   - tempo maior por teste (30 s), pois há envio de e-mail e chamadas de rede.
 * Como rodar: `npm run db:start`, `npm run db:funcoes` (outro terminal) e
 * `npm run test:integracao`.
 * ============================================================================
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integracao/**/*.spec.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
