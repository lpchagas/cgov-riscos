// =============================================================================
// CONFERIR CSP — abre uma página no navegador e procura violações da CSP
// =============================================================================
// Uso: npm run conferir:csp -- <url>      (ex.: http://localhost:8080)
// Abre a URL no Chromium do Playwright, espera a rede ficar ociosa e lista
// mensagens do console que citam "Content Security Policy" e erros de página.
// Sai com código 1 se achar qualquer uma (a CSP estaria bloqueando algo).
// =============================================================================
import { chromium } from '@playwright/test';

const url = process.argv[2];
if (!url) {
  console.error('Informe a URL: npm run conferir:csp -- http://localhost:8080');
  process.exit(1);
}

const problemas: string[] = [];
const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage();
  pagina.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
      problemas.push(`CSP: ${msg.text()}`);
    }
  });
  pagina.on('pageerror', (erro) => problemas.push(`Erro de página: ${erro.message}`));
  await pagina.goto(url, { waitUntil: 'networkidle' });
} finally {
  await navegador.close();
}

if (problemas.length > 0) {
  for (const p of problemas) console.error(p);
  console.error(`\n${problemas.length} problema(s) em ${url}.`);
  process.exit(1);
}
console.log(`OK: nenhuma violação de CSP nem erro de página em ${url}.`);
