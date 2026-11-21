// =============================================================================
// CONFERIR DIST — procura segredos dentro do pacote gerado pelo build
// =============================================================================
// Uso: npm run conferir:dist [pasta]      (padrão: dist)
// Sai com código 1 se achar algo (ou se a pasta não existir). Imprime o
// arquivo e o motivo, mas nunca o segredo.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { listarArquivos, procurarSegredos } from './regras';

// Todos os arquivos do pacote são conferidos, de qualquer extensão (ver
// `listarArquivos`). Imagens e fontes também são lidas como texto: o conteúdo
// binário vira "lixo" para a busca e não gera alarme falso.

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
