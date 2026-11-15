/**
 * IMPORTADOR DE ATRIBUIÇÕES — `npm run sync:atribuicoes` (Etapa B2, Tarefa 8)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Lê o CSV da lista `ICMBIO_atribuicoes` (titulares e substitutos de cada
 * unidade), planeja o que mudar, MOSTRA o relatório e só grava se a CGOV
 * confirmar. Passos: ler -> planejar -> imprimir -> (confirmar) -> gravar.
 *
 * Opções (depois de `--` no npm):
 *   --arquivo <caminho>  CSV da lista (obrigatório).
 *   --so-relatorio       só mostra o relatório; não grava nada.
 *   --sim                grava sem perguntar (só em banco local, ver destino.ts).
 *   --permitir-remoto    com --sim, aceita um banco que não é local.
 *   --completo           não corta nenhuma lista do relatório (por padrão, só os avisos
 *                        são cortados em 50 linhas; as mudanças saem sempre completas).
 *
 * Privacidade: o relatório só aparece na tela (nunca vira arquivo) e mostra
 * pessoas só pelo e-mail. Nenhum e-mail é enviado por este programa.
 * ============================================================================
 */
import { createInterface } from 'node:readline/promises';
import { lerListaSharepoint } from '../sync-estrutura/lerListaSharepoint';
import { conferirDestinoDoSim } from '../sync-estrutura/destino';
import { criarClienteServico } from '../compartilhado/clienteServico';
import { lerAtribuicoes } from './lerAtribuicoes';
import { planejarCarga, planoVazio } from './planejar';
import { formatarRelatorioAtribuicoes } from './relatorio';
import { aplicarPlano, carregarEstado } from './aplicar';

export interface Opcoes {
  arquivo: string | undefined;
  soRelatorio: boolean;
  sim: boolean;
  permitirRemoto: boolean;
  completo: boolean;
}

/** Lê as opções. Ex.: ['--arquivo', 'a.csv', '--sim'] -> { arquivo: 'a.csv', sim: true, ... } */
export function lerOpcoes(argumentos: string[]): Opcoes {
  const posicao = argumentos.indexOf('--arquivo');
  const valor = posicao >= 0 ? argumentos[posicao + 1] : undefined;
  return {
    // Um valor que parece outra opção (--sim) não conta como caminho.
    arquivo: valor && !valor.startsWith('--') ? valor : undefined,
    soRelatorio: argumentos.includes('--so-relatorio'),
    sim: argumentos.includes('--sim'),
    permitirRemoto: argumentos.includes('--permitir-remoto'),
    completo: argumentos.includes('--completo'),
  };
}

/** Exige o `--arquivo`; devolve as opções com `arquivo` garantido. */
export function validarOpcoes(opcoes: Opcoes): Opcoes & { arquivo: string } {
  if (!opcoes.arquivo) throw new Error('RADAR: informe o arquivo com --arquivo <caminho>.');
  return opcoes as Opcoes & { arquivo: string };
}

/** Pergunta "Aplicar? (s/N)". Só "s" ou "sim" confirmam. */
async function confirmar(): Promise<boolean> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await terminal.question('Aplicar? (s/N) ');
  terminal.close();
  return ['s', 'sim'].includes(resposta.trim().toLowerCase());
}

async function principal(): Promise<void> {
  const opcoes = validarOpcoes(lerOpcoes(process.argv.slice(2)));

  // 1. Ler e 2. planejar.
  const lida = lerAtribuicoes(lerListaSharepoint(opcoes.arquivo));
  const { cliente, url } = criarClienteServico();
  const estado = await carregarEstado(cliente);
  const plano = planejarCarga(lida.pessoas, estado.unidades, estado.perfis, lida.unidadesVistas, lida.unidadesTitularSemEmail);
  plano.avisos.unshift(...lida.avisos);

  // 3. Imprimir o relatório (só na tela).
  console.log(formatarRelatorioAtribuicoes(plano, 50, estado.unidades, opcoes.completo));

  // 4 e 5. Parar aqui, se for o caso.
  if (opcoes.soRelatorio) {
    console.log('(--so-relatorio: nada foi gravado)');
    return;
  }
  if (planoVazio(plano)) {
    console.log('Nada a gravar.');
    return;
  }

  // 6 e 7. Trava do --sim e confirmação.
  conferirDestinoDoSim(url, opcoes);
  if (!opcoes.sim && !(await confirmar())) {
    console.log('Nada foi gravado.');
    return;
  }

  // 8. Gravar e resumir.
  const feito = await aplicarPlano(cliente, plano);
  console.log(`Gravado: ${feito.contasCriadas} contas criadas, ${feito.perfisCriados} perfis criados em logins que já existiam e ${feito.perfisAlterados} perfis alterados.`);
}

// Nos testes (Vitest) o arquivo só é importado para usar `lerOpcoes`; não executa o comando.
if (!process.env.VITEST) {
  principal().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
