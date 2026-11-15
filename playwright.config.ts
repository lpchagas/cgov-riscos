/**
 * Configuração do Playwright Test — usado SÓ pela varredura de acessibilidade (`npm run test:a11y`).
 *
 * Os testes de unidade continuam no Vitest (`npm test`, pasta `tests/unit/`).
 * Aqui o Playwright abre um navegador de verdade (Chromium), visita cada tela do RADAR e
 * pede ao axe-core que procure problemas de acessibilidade.
 *
 * Guia completo: docs/04-ux/varredura-acessibilidade.md
 */
import { defineConfig, devices } from '@playwright/test';

/** Porta fixa do servidor da varredura (a mesma usada nas medições das Fases 3 e 4). */
const PORTA = 5199;

export default defineConfig({
  // Onde estão os testes e qual terminação de arquivo eles usam.
  // A terminação `.a11y.ts` evita que o Vitest tente rodá-los.
  testDir: 'tests/a11y',
  testMatch: '**/*.a11y.ts',

  // Terminal: uma linha por teste. HTML: relatório navegável em `playwright-report/`
  // (abra com `npx playwright show-report`; ele não abre sozinho).
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // Com isto, `page.goto('/dar')` vira `http://localhost:5199/dar`.
    baseURL: `http://localhost:${PORTA}`,
  },

  // Só o Chromium: o axe-core avalia o HTML e o CSS, que são iguais entre navegadores
  // para as regras da WCAG. Um navegador basta e deixa a varredura mais rápida.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // O Playwright SOBE o servidor sozinho antes dos testes e o DESLIGA no fim.
  // `--strictPort`: se a porta estiver ocupada, o Vite falha em vez de escolher outra.
  // `reuseExistingServer`: se você já deixou um `npx vite --port 5199` aberto, ele é reaproveitado.
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
