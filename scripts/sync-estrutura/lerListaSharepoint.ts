/**
 * LEITOR DAS LISTAS DO SHAREPOINT EXPORTADAS EM CSV (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Quando a CGOV exporta uma lista do SharePoint para CSV, o arquivo vem assim:
 *
 *   <BOM>ListSchema={"schemaXmlList":[ ...definição das colunas... ]}   ← linha 1
 *   "uorg_nome","sigla","status",...                                    ← linha 2 (cabeçalho)
 *   "CT Manaus","CT Manaus","Ativo",...                                 ← dados
 *
 * - O BOM é um caractere invisível (U+FEFF) que alguns programas põem no
 *   início de arquivos UTF-8. Se não for retirado, a primeira coluna passaria a
 *   se chamar "﻿uorg_nome" e nunca seria encontrada.
 * - A linha `ListSchema=` não é dado: é o esquema da lista. Pulamos ela.
 * - As linhas terminam em CRLF (padrão do Windows) e alguns textos entre aspas
 *   têm vírgulas e até quebras de linha. Por isso usamos uma biblioteca de CSV
 *   de verdade (`csv-parse`) em vez de `split(',')`, que quebraria esses casos.
 *
 * O retrato versionado em `supabase/referencia/` é um CSV comum (sem a linha
 * `ListSchema=`). Este leitor aceita os dois formatos.
 * ============================================================================
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

/** Prefixo da primeira linha dos CSVs exportados do SharePoint. */
const PREFIXO_ESQUEMA = 'ListSchema=';

/**
 * Lê o TEXTO de uma lista (já carregado na memória) e devolve uma linha por
 * registro, indexada pelo nome da coluna do cabeçalho.
 *
 * Exemplo: lerTextoListaSharepoint('"a","b"\r\n"1","2"') → [{ a: '1', b: '2' }]
 */
export function lerTextoListaSharepoint(texto: string): Record<string, string>[] {
  // 1. Retira o BOM, se houver.
  let conteudo = texto.replace(/^﻿/, '');

  // 2. Pula a linha de esquema, se houver (só existe no arquivo original).
  if (conteudo.startsWith(PREFIXO_ESQUEMA)) {
    const fimDaLinha = conteudo.indexOf('\n');
    conteudo = fimDaLinha === -1 ? '' : conteudo.slice(fimDaLinha + 1);
  }

  // 3. Interpreta o CSV. `columns: true` usa a 1ª linha restante como cabeçalho
  //    e devolve objetos { coluna: valor }. `skip_empty_lines` ignora linhas em
  //    branco no fim do arquivo.
  return parse(conteudo, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

/**
 * Lê um arquivo CSV exportado do SharePoint (ou o retrato versionado) do disco.
 *
 * Exemplo: lerListaSharepoint('supabase/referencia/20261115_estrutura.csv')
 */
export function lerListaSharepoint(caminho: string): Record<string, string>[] {
  return lerTextoListaSharepoint(readFileSync(caminho, 'utf8'));
}

/** Caminhos dos dois CSVs usados pelo importador dentro de uma pasta. */
export interface ArquivosDasListas {
  estrutura: string;
  cadeiaValor: string;
}

/**
 * Acha, dentro de `pasta`, o CSV da estrutura e o da cadeia de valor.
 *
 * Os nomes têm data no início (ex.: `20261115_estrutura.csv` no retrato, ou
 * `20261115_listaSharepoint_ICMBIO_estrutura.csv` no export original). Se houver
 * vários, fica o de nome "maior" em ordem alfabética, que é o mais recente.
 *
 * ATENÇÃO (dados pessoais): só procuramos arquivos com "estrutura" ou
 * "cadeia-valor" no nome. Outros arquivos da pasta (como a lista de
 * atribuições, que tem nomes e e-mails) nunca são abertos.
 */
export function localizarListas(pasta: string): ArquivosDasListas {
  const arquivos = readdirSync(pasta).sort();
  const ultimo = (padrao: RegExp, descricao: string): string => {
    const achados = arquivos.filter((nome) => padrao.test(nome));
    if (achados.length === 0) {
      throw new Error(`RADAR: nenhum CSV de ${descricao} encontrado em ${pasta}`);
    }
    return join(pasta, achados[achados.length - 1]);
  };
  return {
    estrutura: ultimo(/estrutura\.csv$/i, 'estrutura'),
    cadeiaValor: ultimo(/cadeia-valor\.csv$/i, 'cadeia de valor'),
  };
}
