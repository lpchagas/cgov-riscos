// =============================================================================
// CONFERIR DIST — procura segredos dentro do pacote gerado pelo build
// =============================================================================
// Uso: npm run conferir:dist [pasta]      (padrão: dist)
// Sai com código 1 se achar algo (ou se a pasta não existir). Imprime o
// arquivo e o motivo, mas nunca o segredo.
// =============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { procurarSegredos } from './regras';

const EXTENSOES = new Set(['.js', '.css', '.html', '.json', '.map']);

/** Percorre a pasta e subpastas devolvendo os arquivos das extensões conferidas. */
function listarArquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...listarArquivos(caminho));
    else if (EXTENSOES.has(extname(nome))) achados.push(caminho);
  }
  return achados;
}

const pasta = process.argv[2] ?? 'dist';

if (!existsSync(pasta)) {
  console.error(`Pasta "${pasta}" não encontrada: rode npm run build antes.`);
  process.exit(1);
}

let problemas = 0;
for (const arquivo of listarArquivos(pasta)) {
  for (const motivo of procurarSegredos(readFileSync(arquivo, 'utf-8'))) {
    console.error(`SEGREDO em ${arquivo}: ${motivo}`);
    problemas++;
  }
}

if (problemas > 0) {
  console.error(`\n${problemas} problema(s) encontrado(s). O pacote NÃO deve ser publicado.`);
  process.exit(1);
}
console.log(`Conferência concluída: nenhum segredo encontrado em "${pasta}".`);
