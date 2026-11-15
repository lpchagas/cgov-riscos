import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

/**
 * Configuração do Vite (empacotador rápido para Vue 3) e do Vitest (testes automatizados).
 * O alias '@' aponta para a pasta 'src/', facilitando importações no código.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Só os testes de unidade. A varredura de acessibilidade (tests/a11y/) roda no Playwright.
    include: ['tests/unit/**/*.spec.ts'],
  },
});
