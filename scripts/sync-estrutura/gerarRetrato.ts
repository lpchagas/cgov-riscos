/**
 * GERADOR DO RETRATO VERSIONADO DAS LISTAS PÚBLICAS (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Os CSVs exportados do SharePoint ficam em `_temp/` (fora do Git, porque o
 * export traz colunas que não usamos e a pasta guarda também listas com dados
 * pessoais). Para que qualquer pessoa — inclusive a CGTI — recrie o banco sem
 * acesso ao SharePoint, guardamos no repositório um "retrato" com SÓ as colunas
 * usadas pelo importador, em `supabase/referencia/`.
 *
 * Como usar:
 *   npx vite-node scripts/sync-estrutura/gerarRetrato.ts --origem _temp/
 *   (opcional: --destino <pasta>; padrão supabase/referencia/)
 *
 * Resultado: `supabase/referencia/<data>_estrutura.csv` e
 * `supabase/referencia/<data>_cadeia-valor.csv`, onde <data> vem do início do
 * nome do arquivo de origem (ex.: 20261115).
 *
 * PRIVACIDADE: a lista de colunas abaixo é uma "lista branca". Qualquer coluna
 * que não esteja nela (titular, e-mail, matrícula, siape_nome, cargo...) NUNCA
 * vai para o retrato.
 * ============================================================================
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { lerListaSharepoint, localizarListas } from './lerListaSharepoint';

/** Colunas da lista de estrutura que vão para o retrato (lista branca). */
export const COLUNAS_ESTRUTURA = [
  'icmbio_id',
  'id_mae',
  'sigla',
  'uorg_nome',
  'uorg_nome-completo',
  'tipo',
  'hierarquia',
  'status',
  'macrogrupo',
  'mesogrupo',
  'microgrupo',
];

/** Colunas da lista da cadeia de valor que vão para o retrato (lista branca). */
export const COLUNAS_CADEIA = [
  'proc',
  'proc_id',
  'proc_tipo',
  'macroprocesso',
  'macro_id',
  'icmbio_id',
  'supervisor',
  'orientador',
  'Situacao',
];

/**
 * Escreve um valor no formato CSV: sempre entre aspas, com as aspas internas
 * duplicadas. Exemplo: Diretoria "X", Y → "Diretoria ""X"", Y"
 */
function celulaCsv(valor: string | undefined): string {
  return `"${(valor ?? '').replace(/"/g, '""')}"`;
}

/** Monta o texto CSV (cabeçalho + linhas) só com as colunas pedidas. */
export function montarCsv(linhas: Record<string, string>[], colunas: string[]): string {
  const saida = [colunas.map(celulaCsv).join(',')];
  for (const linha of linhas) saida.push(colunas.map((c) => celulaCsv(linha[c])).join(','));
  return saida.join('\n') + '\n';
}

/** Lê o valor de uma opção da linha de comando (ex.: --origem _temp/). */
function opcao(nome: string, padrao: string): string {
  const posicao = process.argv.indexOf(nome);
  return posicao >= 0 && process.argv[posicao + 1] ? process.argv[posicao + 1] : padrao;
}

/** Data do retrato: os 8 dígitos do início do nome do arquivo de origem. */
function dataDoArquivo(caminho: string): string {
  const achado = /^(\d{8})/.exec(basename(caminho));
  if (achado) return achado[1];
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function principal(): void {
  const origem = opcao('--origem', '_temp/');
  const destino = opcao('--destino', 'supabase/referencia/');
  const arquivos = localizarListas(origem);
  mkdirSync(destino, { recursive: true });

  const pares: [string, string[], string][] = [
    [arquivos.estrutura, COLUNAS_ESTRUTURA, 'estrutura'],
    [arquivos.cadeiaValor, COLUNAS_CADEIA, 'cadeia-valor'],
  ];
  for (const [arquivo, colunas, nome] of pares) {
    const linhas = lerListaSharepoint(arquivo);
    const faltando = colunas.filter((c) => linhas.length > 0 && !(c in linhas[0]));
    if (faltando.length > 0) {
      throw new Error(`RADAR: colunas ausentes em ${arquivo}: ${faltando.join(', ')}`);
    }
    const saida = join(destino, `${dataDoArquivo(arquivo)}_${nome}.csv`);
    writeFileSync(saida, montarCsv(linhas, colunas), 'utf8');
    console.log(`Retrato gravado: ${saida} (${linhas.length} linhas, ${colunas.length} colunas)`);
  }
}

principal();
