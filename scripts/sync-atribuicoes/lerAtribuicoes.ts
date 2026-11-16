/**
 * LEITURA DA LISTA `ICMBIO_atribuicoes` (Etapa B2, Tarefa 7)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * A lista do SharePoint `ICMBIO_atribuicoes` diz, para cada unidade, quem é o
 * titular e quem é o substituto. Ela tem DADOS PESSOAIS (nome, e-mail, matrícula
 * SIAPE). Por isso este leitor:
 *   - copia só o que o RADAR precisa: unidade, nome e e-mail de cada pessoa;
 *   - NUNCA copia matrícula nem qualquer outra coluna;
 *   - não grava nada em disco nem no banco (é uma função pura).
 *
 * O nome das colunas muda conforme a exportação: o nome INTERNO (`ourg_nome`,
 * `pessoa`) ou o nome EXIBIDO (`uorg_nome`, `titular`). Por isso `COLUNAS_ATRIBUICOES`
 * lista os nomes aceitos, e a busca ignora maiúsculas e espaços nas pontas.
 *
 * Exemplo: uma linha com titular "Ana" (ANA@radar.test) e substituto sem e-mail
 *          vira 1 PessoaListada (titular, 'ana@radar.test') e 1 aviso `sem_email`
 *          se o substituto tiver nome.
 * ============================================================================
 */
import { eEmailValido, normalizarEmail } from '../../supabase/functions/_shared/validacoesAcesso';

/** Nomes aceitos para cada coluna (a primeira que existir no cabeçalho vale). */
export const COLUNAS_ATRIBUICOES = {
  unidade: ['uorg_nome', 'ourg_nome'],
  titularNome: ['titular', 'pessoa'],
  titularEmail: ['titular_email'],
  substitutoNome: ['substituto'],
  substitutoEmail: ['substituto_email'],
} as const;

/** Uma pessoa lida da lista. Não tem matrícula, de propósito. */
export interface PessoaListada {
  /** Linha no CSV (a primeira linha de dados é a 2; o cabeçalho é a 1). */
  linha: number;
  unidadeNome: string;
  funcao: 'titular' | 'substituto';
  nome: string;
  /** Já normalizado (minúsculas, sem espaços nas pontas). */
  email: string;
}

/** Tudo o que merece a atenção da CGOV, mas não derruba a carga. */
export interface AvisoCarga {
  tipo:
    | 'linha_vazia'
    | 'sem_email'
    | 'email_invalido'
    | 'unidade_inexistente'
    | 'unidade_inativa'
    | 'tipo_suspeito'
    | 'varias_unidades'
    | 'divergencia'
    | 'suspenso_na_lista'
    | 'sem_titular'
    | 'titular_sem_email';
  linha?: number;
  email?: string;
  unidade?: string;
  detalhe: string;
}

/** Acha a chave real do cabeçalho para um dos nomes aceitos (ou `undefined`). */
function acharColuna(cabecalho: string[], aceitos: readonly string[]): string | undefined {
  for (const nome of aceitos) {
    const achada = cabecalho.find((c) => c.trim().toLowerCase() === nome);
    if (achada !== undefined) return achada;
  }
  return undefined;
}

export function lerAtribuicoes(linhas: Record<string, string>[]): {
  pessoas: PessoaListada[];
  avisos: AvisoCarga[];
  /** Nomes (sem espaços nas pontas, sem repetir, na ordem) das unidades de toda linha não vazia, mesmo se todas as pessoas foram descartadas. */
  unidadesVistas: string[];
  /**
   * Nomes (únicos, na ordem de entrada) das unidades cuja linha tem titular SEM e-mail válido
   * (nome ou e-mail preenchido, ou só o substituto preenchido). Linha totalmente vazia não conta.
   * O planejador usa isto para NÃO tirar a chave de ninguém nessas unidades (decisão P-B2-1).
   */
  unidadesTitularSemEmail: string[];
} {
  const cabecalho = linhas.length > 0 ? Object.keys(linhas[0]) : [];
  const col = {
    unidade: acharColuna(cabecalho, COLUNAS_ATRIBUICOES.unidade),
    titularNome: acharColuna(cabecalho, COLUNAS_ATRIBUICOES.titularNome),
    titularEmail: acharColuna(cabecalho, COLUNAS_ATRIBUICOES.titularEmail),
    substitutoNome: acharColuna(cabecalho, COLUNAS_ATRIBUICOES.substitutoNome),
    substitutoEmail: acharColuna(cabecalho, COLUNAS_ATRIBUICOES.substitutoEmail),
  };

  // Só unidade e e-mails são obrigatórios; os nomes das pessoas são opcionais.
  const faltam: string[] = [];
  if (linhas.length > 0) {
    if (!col.unidade) faltam.push(COLUNAS_ATRIBUICOES.unidade.join(' ou '));
    if (!col.titularEmail) faltam.push(COLUNAS_ATRIBUICOES.titularEmail.join(''));
    if (!col.substitutoEmail) faltam.push(COLUNAS_ATRIBUICOES.substitutoEmail.join(''));
  }
  if (faltam.length > 0) {
    throw new Error(`RADAR: coluna obrigatória ausente: ${faltam.join(', ')}`);
  }

  const pessoas: PessoaListada[] = [];
  const avisos: AvisoCarga[] = [];
  const unidadesVistas: string[] = [];
  const unidadesTitularSemEmail: string[] = [];
  const valor = (l: Record<string, string>, c: string | undefined) => (c ? String(l[c] ?? '').trim() : '');

  linhas.forEach((l, i) => {
    const linha = i + 2;
    const unidadeNome = valor(l, col.unidade);
    const dados = [
      { funcao: 'titular' as const, nome: valor(l, col.titularNome), bruto: valor(l, col.titularEmail) },
      { funcao: 'substituto' as const, nome: valor(l, col.substitutoNome), bruto: valor(l, col.substitutoEmail) },
    ];

    if (!unidadeNome && dados.every((d) => !d.nome && !d.bruto)) {
      avisos.push({ tipo: 'linha_vazia', linha, detalhe: `Linha ${linha} sem unidade nem pessoas.` });
      return;
    }

    if (unidadeNome && !unidadesVistas.includes(unidadeNome)) unidadesVistas.push(unidadeNome);

    // Titular "sem e-mail válido": a linha tem alguém (titular ou substituto), mas o e-mail do
    // titular está vazio ou inválido. Ex.: titular "Ana" com e-mail "ana-sem-arroba" -> a unidade
    // entra na lista, e o importador não tira a chave de ninguém nela.
    const temAlguem = dados.some((d) => d.nome || d.bruto);
    const emailTitularValido = dados[0].bruto !== '' && eEmailValido(normalizarEmail(dados[0].bruto));
    if (unidadeNome && temAlguem && !emailTitularValido && !unidadesTitularSemEmail.includes(unidadeNome)) {
      unidadesTitularSemEmail.push(unidadeNome);
    }

    for (const d of dados) {
      if (!d.bruto) {
        // Com nome mas sem e-mail não dá para criar conta. Sem nada, é só um cargo vago.
        if (d.nome) {
          avisos.push({ tipo: 'sem_email', linha, unidade: unidadeNome, detalhe: `Linha ${linha}: ${d.funcao} sem e-mail.` });
        }
        continue;
      }
      const email = normalizarEmail(d.bruto);
      if (!eEmailValido(email)) {
        avisos.push({ tipo: 'email_invalido', linha, unidade: unidadeNome, email, detalhe: `Linha ${linha}: e-mail de ${d.funcao} inválido.` });
        continue;
      }
      pessoas.push({ linha, unidadeNome, funcao: d.funcao, nome: d.nome, email });
    }
  });

  return { pessoas, avisos, unidadesVistas, unidadesTitularSemEmail };
}
