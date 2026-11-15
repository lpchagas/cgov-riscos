/**
 * IMPORTADOR DA ESTRUTURA E DA CADEIA DE VALOR — `npm run sync:estrutura` (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Este é o "programa principal". Ele junta as peças:
 *
 *   1. lerListaSharepoint  → lê os 2 CSVs (estrutura e cadeia de valor);
 *   2. converter           → transforma as linhas em unidades e processos do RADAR;
 *   3. compararEAplicar    → compara com o banco, mostra o relatório e grava.
 *
 * Opções da linha de comando (depois de `--` no npm):
 *   --pasta <dir>    pasta dos CSVs (padrão: supabase/referencia/, o retrato versionado).
 *                    Ex.: npm run sync:estrutura -- --pasta _temp/
 *   --sim            aplica sem perguntar (usado pelo `npm run db:reset`).
 *   --permitir-remoto  com --sim, aceita gravar num banco que NÃO é local
 *                    (127.0.0.1/localhost). Sem ele, o --sim remoto é recusado
 *                    (ver destino.ts).
 *   --so-relatorio   só mostra o relatório; não grava nada.
 *   (sem opção)      mostra o relatório e pergunta "Aplicar? (s/N)".
 *
 * Conexão com o banco: usa as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * se existirem; senão, pergunta ao Supabase local (`supabase status -o env`).
 * A chave de serviço NUNCA é gravada em arquivo nem impressa na tela.
 * ============================================================================
 */
import { createInterface } from 'node:readline/promises';
import { criarClienteServico } from '../compartilhado/clienteServico';
import { lerListaSharepoint, localizarListas } from './lerListaSharepoint';
import { converterProcessos, montarArvore, resumirVinculosCt } from './converter';
import { conferirDestinoDoSim } from './destino';
import {
  aplicar,
  carregarEstadoBanco,
  compararComBanco,
  compararProcessos,
  formatarRelatorio,
} from './compararEAplicar';

/** Opções lidas da linha de comando. */
interface Opcoes {
  pasta: string;
  sim: boolean;
  soRelatorio: boolean;
  permitirRemoto: boolean;
}

/** Lê as opções. Exemplo: ['--pasta', '_temp/', '--sim'] → { pasta: '_temp/', sim: true, ... } */
function lerOpcoes(argumentos: string[]): Opcoes {
  const posicaoPasta = argumentos.indexOf('--pasta');
  return {
    pasta: posicaoPasta >= 0 ? argumentos[posicaoPasta + 1] : 'supabase/referencia/',
    sim: argumentos.includes('--sim'),
    soRelatorio: argumentos.includes('--so-relatorio'),
    permitirRemoto: argumentos.includes('--permitir-remoto'),
  };
}

/** Pergunta "Aplicar? (s/N)" no terminal. Só "s" ou "sim" confirmam. */
async function confirmar(): Promise<boolean> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await terminal.question('Aplicar estas mudanças no banco? (s/N) ');
  terminal.close();
  return ['s', 'sim'].includes(resposta.trim().toLowerCase());
}

async function principal(): Promise<void> {
  const opcoes = lerOpcoes(process.argv.slice(2));
  const arquivos = localizarListas(opcoes.pasta);
  console.log(`Lendo ${arquivos.estrutura} e ${arquivos.cadeiaValor}`);

  // 1 e 2: ler e converter.
  const arvore = montarArvore(lerListaSharepoint(arquivos.estrutura));
  const cadeia = converterProcessos(lerListaSharepoint(arquivos.cadeiaValor), arvore.unidades);

  // 3: comparar com o banco.
  // Trava do --sim: gravar sem perguntar só no banco local (ver destino.ts).
  const { cliente, url } = criarClienteServico();
  conferirDestinoDoSim(url, opcoes);
  const estado = await carregarEstadoBanco(cliente);
  const relatorio = compararComBanco(arvore.unidades, estado.unidades);
  relatorio.processos = compararProcessos(cadeia.processos, estado.processos);

  // Relatório.
  console.log(formatarRelatorio(relatorio));
  console.log('=== LIMPEZA DA LISTA ===');
  console.log(`unidades lidas: ${arvore.unidades.length}`);
  console.log(`ignoradas (colegiado/sem icmbio_id): ${arvore.ignoradas.length} ${arvore.ignoradas.join('; ')}`);
  for (const [regra, quantidade] of Object.entries(arvore.tiposDeduzidos)) {
    console.log(`tipo deduzido (${regra}): ${quantidade}`);
  }
  console.log(`unidades sem tipo: ${arvore.semTipo.length}`);
  arvore.semTipo.forEach((s) => console.log(`   - ${s}`));

  // Vínculo com as Coordenações Territoriais (decisão R9 em decisoes-tecnicas-b1.md). As CTs sem nenhuma
  // unidade vinculada são uma lacuna a corrigir no SharePoint (microgrupo).
  const cts = resumirVinculosCt(arvore.unidades);
  console.log('=== VÍNCULO COM AS COORDENAÇÕES TERRITORIAIS ===');
  cts.porCt
    .filter((c) => c.unidades > 0)
    .forEach((c) => console.log(`   ${c.nome}: ${c.unidades} unidades vinculadas`));
  console.log(`CTs sem unidades vinculadas: ${cts.ctsSemUnidades.length} de ${cts.totalCts}`);
  if (cts.ctsSemUnidades.length > 0) console.log(`   ${cts.ctsSemUnidades.join('; ')}`);
  const avisos = [...arvore.avisos, ...cadeia.avisos];
  console.log(`avisos: ${avisos.length}`);
  avisos.forEach((a) => console.log(`   ! ${a}`));

  // 4: aplicar (ou não).
  if (opcoes.soRelatorio) {
    console.log('(--so-relatorio: nada foi gravado)');
    return;
  }
  if (!opcoes.sim && !(await confirmar())) {
    console.log('Nada foi gravado.');
    return;
  }
  const gravadas = await aplicar(relatorio, cliente);
  console.log(`Gravado: ${gravadas.unidades} unidades e ${gravadas.processos} processos.`);
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
