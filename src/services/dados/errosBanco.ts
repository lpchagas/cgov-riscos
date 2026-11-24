/**
 * ============================================================================
 * TRADUTOR DE ERROS DO BANCO (`src/services/dados/errosBanco.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando o banco recusa uma operação, ele devolve um erro técnico em inglês
 * (ex.: "new row violates row-level security policy"). Isso NUNCA deve aparecer
 * na tela. Este arquivo transforma qualquer erro numa frase curta, em português,
 * que diz o que a pessoa deve fazer a seguir.
 *
 * Ordem de decisão (da mais específica para a mais genérica):
 *  1. Falha de rede (sem internet / servidor fora do ar).
 *  2. Mensagem "RADAR: ..." (escrita por nós nas funções do banco): procura um
 *     TRECHO conhecido no dicionário abaixo.
 *  3. Código do erro (ex.: 42501 = sem permissão).
 *  4. Se a mensagem começa com "RADAR:" mas é nova, mostra o texto sem o prefixo.
 *  5. Frase genérica.
 *
 * Exemplo: { code: '55000', message: 'RADAR: a ficha do risco X está travada ...' }
 *   -> "Este risco está em validação ou homologação e não pode ser editado agora. ..."
 */

import { MENSAGEM_TRAVA_CRITICO, MENSAGEM_TRAVA_KRI } from '../../utils/travaRiscoCritico';

/** Frase de falha de rede (a mesma usada no login, na etapa B2). */
export const MENSAGEM_REDE = 'Não foi possível falar com o RADAR. Verifique sua conexão e tente de novo.';

export type TipoErroRadar = 'permissao' | 'estado' | 'validacao' | 'nao_encontrado' | 'rede' | 'desconhecido';

/** Erro já "limpo": a `message` é segura para mostrar ao usuário. */
export class ErroRadar extends Error {
  tipo: TipoErroRadar;
  codigo: string | null;
  constructor(mensagem: string, tipo: TipoErroRadar, codigo: string | null = null) {
    super(mensagem);
    this.name = 'ErroRadar';
    this.tipo = tipo;
    this.codigo = codigo;
  }
}

type Entrada = [trecho: string, mensagem: string, tipo: TipoErroRadar];

/**
 * Dicionário: se a mensagem do banco CONTÉM o trecho, usa a frase ao lado.
 * Os trechos são cópias fiéis (sem os valores variáveis `%`) das mensagens
 * `RAISE EXCEPTION 'RADAR: ...'` das migrações do fluxo. A ordem importa: o
 * primeiro trecho que casar vence.
 */
const DICIONARIO: Entrada[] = [
  // --- Travas da ficha (20261115004) ---
  // A variante de EXCLUSÃO vem antes da genérica (que fala em "editar").
  ['não é possível excluir o risco enquanto ele está em validação', 'Este risco está em validação ou homologação e não pode ser excluído agora. Peça à chefia que o devolva para ajuste.', 'estado'],
  ['está travada', 'Este risco está em validação ou homologação e não pode ser editado agora. Peça à chefia que o devolva para ajuste.', 'estado'],
  ['faz parte do Plano de Gestão de Riscos: não pode ser excluído', 'Risco que já está no Plano de Gestão de Riscos não pode ser excluído. Para mudá-lo, edite a ficha: a edição reabre a validação.', 'estado'],

  // --- Enviar para validação ---
  ['só a unidade dona do risco', 'Só a unidade dona do risco pode enviá-lo para validação.', 'permissao'],
  ['só se envia rascunho ou devolvido', 'Só é possível enviar risco em rascunho ou devolvido. Atualize a página para ver a situação atual.', 'estado'],
  ['não tem chefia imediata acima dela', 'Esta unidade não tem chefia acima para validar o risco. Procure a CGOV.', 'estado'],
  ['quem envia é o titular da chefia imediata', 'Quem envia não pode validar o próprio risco e não há nível acima. Procure a CGOV.', 'estado'],
  ['quem envia é o titular da unidade que o homologaria', 'Quem homologaria o risco é quem o está enviando. Peça a outro servidor da unidade que envie a ficha.', 'estado'],
  ['exige homologação, mas a unidade não tem', 'Este risco exige homologação, mas a unidade não tem Gerência Regional, Diretoria ou Presidência acima. Procure a CGOV.', 'estado'],

  // --- Validar ---
  ['não há quem valide o risco', 'Não há chefia acima de quem enviou o risco para validá-lo. Procure a CGOV.', 'estado'],
  ['só o titular da chefia que valida', 'Só o titular da chefia que valida este risco pode validá-lo (quem o enviou não valida).', 'permissao'],
  ['só se valida risco em validação', 'Este risco não está mais em validação (talvez outro titular já o tenha validado). Atualize a página.', 'estado'],
  ['mas quem o enviou é o titular da unidade que o homologaria', 'Quem enviou o risco é quem o homologaria. Devolva a ficha para que outro servidor da unidade a envie.', 'estado'],

  // --- Reabertura por alteração da ficha ---
  // Variante em que quem altera é quem homologaria (vem antes da genérica, que casa em "reabriria o risco").
  ['(que exige homologação) para validação, mas quem altera é o titular', 'Esta alteração reabriria o risco, mas você é quem o homologaria e não pode aprovar a própria alteração. Procure a CGOV.', 'estado'],
  ['a alteração reabriria o risco', 'Esta alteração reabriria o risco para validação, mas não há quem o valide sem ser você. Procure a CGOV ou peça a outro servidor da unidade que altere.', 'estado'],

  // --- Homologar ---
  ['só o titular da Gerência Regional, da Diretoria ou da Presidência', 'Só o titular da Gerência Regional, da Diretoria ou da Presidência responsável pode homologar este risco.', 'permissao'],
  ['só se homologa risco em homologação', 'Este risco não está mais em homologação. Atualize a página.', 'estado'],

  // --- Devolver ---
  ['informe o motivo da devolução', 'Informe o motivo da devolução.', 'validacao'],
  ['só se devolve risco em validação ou homologação', 'Só é possível devolver risco que está em validação ou homologação. Atualize a página.', 'estado'],
  ['não tem quem o valide ou homologue neste estado', 'Este risco não tem quem o valide ou homologue agora; só a CGOV pode devolvê-lo à unidade.', 'estado'],
  ['só o titular que valida ou homologa o risco', 'Só o titular que valida ou homologa este risco neste estado pode devolvê-lo.', 'permissao'],

  // --- Assumir risco preliminar (20261116001) ---
  ['só o titular ou um gestor da unidade do risco', 'Só o titular ou um gestor da unidade do risco pode assumi-lo.', 'permissao'],
  ['só se assume risco preliminar da CGOV', 'Só é possível assumir risco preliminar da CGOV. Atualize a página.', 'estado'],

  // --- Objetos, unidades e processos (20261116002) ---
  ['a unidade está inativa', 'A unidade está inativa. Escolha outra unidade para o objeto.', 'validacao'],
  ['o processo da cadeia de valor está inativo', 'O processo da cadeia de valor está inativo. Escolha um processo ativo.', 'validacao'],
  ['sem processo vinculado, só a CGOV define o supervisor', 'Sem processo vinculado, só a CGOV define o supervisor do objeto. Vincule um processo ou procure a CGOV.', 'permissao'],
  ['só a CGOV reatribui objeto de unidade inativa', 'Só a CGOV reatribui objeto de unidade inativa.', 'permissao'],
  ['só objetos de unidade inativa podem ser reatribuídos', 'Só objetos de unidade inativa podem ser reatribuídos.', 'estado'],
  ['a unidade de destino não existe ou está inativa', 'A unidade de destino não existe ou está inativa. Escolha outra.', 'validacao'],
  ['não pode ser alterado diretamente', 'A situação do risco só muda pelas ações do fluxo (enviar, validar, homologar, devolver).', 'estado'],
  ['objeto não encontrado', 'Objeto não encontrado. Atualize a página.', 'nao_encontrado'],
  // --- Leitura de ações e gravação da ficha (20261117001) ---
  // Estas mensagens usam o código 22023, que no plano B significa "Informe o motivo."
  // (errado para elas). Por isso precisam estar AQUI, antes do plano B por código.
  ['não pertence ao risco', 'A ficha mudou enquanto você editava (um controle, resposta ou KRI foi removido). Atualize a página e refaça a alteração.', 'estado'],
  ['deve ser um objeto JSON', 'Não foi possível enviar a ficha por um erro interno do RADAR. Tente de novo; se persistir, procure a CGOV.', 'desconhecido'],
  ['deve ser uma lista', 'Não foi possível enviar a ficha por um erro interno do RADAR. Tente de novo; se persistir, procure a CGOV.', 'desconhecido'],
  ['no máximo 1000 riscos', 'A consulta pediu riscos demais de uma vez (máximo de 1.000). Filtre a lista e tente de novo.', 'validacao'],
  // --- Categorias e subcategorias (20261122001) ---
  // Código 23514 (check_violation), que no plano B por código viraria a frase
  // genérica "Algum campo está fora dos valores permitidos". Por isso fica AQUI.
  // Ex.: rascunho da Integridade salvo sem subcategoria.
  ['exige uma das subcategorias do Quadro 3', 'Risco da categoria Integridade precisa de uma das 6 subcategorias do Quadro 3. Escolha a subcategoria na etapa da categoria.', 'validacao'],
  // --- Trava do risco crítico (LAC-13, 20261122002) ---
  // Também 23514: precisa vir antes do plano B por código. Casa nas duas
  // variantes (envio/gravação e validação/homologação, que pede a devolução).
  // Ex.: "RADAR: o risco RADAR-2026-004 é crítico (...) e precisa de tratamento:
  // a estratégia "Aceitar" não é permitida."
  // LAC-03: 3º motivo (falta KRI completo). Vem ANTES da entrada genérica abaixo.
  ['precisa de tratamento: falta um KRI completo', MENSAGEM_TRAVA_KRI, 'validacao'],
  ['é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento', MENSAGEM_TRAVA_CRITICO, 'validacao'],
  // LAC-03: ligação de KRI entre objetos (23514). Vem antes do plano B por código.
  ['o KRI só pode ser ligado a riscos do mesmo objeto', 'O KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos. Escolha um KRI deste objeto ou crie um novo.', 'validacao'],
  ['não encontrado', 'Risco não encontrado.', 'nao_encontrado'], // "risco ... não encontrado"
];

/** Frases por código de erro do PostgreSQL / PostgREST (plano B). */
const POR_CODIGO: Record<string, [string, TipoErroRadar]> = {
  '42501': ['Você não tem permissão para esta ação.', 'permissao'],
  '55000': ['O risco mudou de situação. Atualize a página e tente de novo.', 'estado'],
  '22023': ['Informe o motivo.', 'validacao'],
  P0002: ['Risco não encontrado.', 'nao_encontrado'],
  '23505': ['Já existe um registro com estes dados.', 'validacao'],
  '23503': ['Este registro está ligado a outro e não pode ser alterado assim.', 'validacao'],
  '23514': ['Algum campo está fora dos valores permitidos. Revise o preenchimento.', 'validacao'],
  PGRST116: ['Registro não encontrado.', 'nao_encontrado'],
};

const GENERICA = 'Não foi possível concluir a operação agora. Tente de novo; se persistir, procure a CGOV.';

/** Erros de rede do navegador chegam como TypeError ("Failed to fetch", "Load failed"...). */
function ehFalhaDeRede(erro: unknown, mensagem: string): boolean {
  // TypeError só é rede quando a mensagem lembra rede; outros TypeError são bugs (nunca mostrar o texto).
  return /fetch|network|failed to fetch|networkerror|load failed/i.test(mensagem);
}

/** Primeira letra maiúscula (para mostrar um "RADAR: algo novo" sem o prefixo). */
function capitalizar(texto: string): string {
  const t = texto.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function traduzirErroBanco(erro: unknown): ErroRadar {
  // Já traduzido antes: devolve igual (evita traduzir duas vezes).
  if (erro instanceof ErroRadar) return erro;

  const e = (erro ?? {}) as { message?: unknown; code?: unknown };
  const mensagem = typeof e.message === 'string' ? e.message : '';
  const codigo = typeof e.code === 'string' ? e.code : null;

  if (ehFalhaDeRede(erro, mensagem)) return new ErroRadar(MENSAGEM_REDE, 'rede', codigo);

  // 2) Mensagem escrita por nós: procura o trecho conhecido.
  if (mensagem.startsWith('RADAR:')) {
    for (const [trecho, frase, tipo] of DICIONARIO) {
      if (mensagem.includes(trecho)) return new ErroRadar(frase, tipo, codigo);
    }
  }

  // 3) Código do erro.
  if (codigo && POR_CODIGO[codigo]) {
    const [frase, tipo] = POR_CODIGO[codigo];
    return new ErroRadar(frase, tipo, codigo);
  }

  // 4) "RADAR:" novo, ainda fora do dicionário: mostra o texto sem o prefixo.
  if (mensagem.startsWith('RADAR:')) {
    const semPrefixo = mensagem.slice('RADAR:'.length);
    if (semPrefixo.trim()) return new ErroRadar(capitalizar(semPrefixo), 'desconhecido', codigo);
  }

  // 5) Qualquer outro texto técnico NUNCA é exibido.
  return new ErroRadar(GENERICA, 'desconhecido', codigo);
}

/**
 * Mensagens da RPC `enviar_comunicacao` e de `registrar_ciencia_comunicacao`: o banco as escreve
 * em português claro, SEM o prefixo "RADAR:". Só estas (prefixos conhecidos) são repassadas
 * à tela; qualquer outro texto técnico continua escondido por `traduzirErroBanco`.
 * Ex.: { message: 'Este alerta já foi comunicado' } -> ErroRadar('Este alerta já foi comunicado', 'estado')
 */
const MENSAGENS_COMUNICACAO: Array<[string, TipoErroRadar]> = [
  ['A auditoria não envia', 'permissao'],
  ['Sem permissão para comunicar', 'permissao'],
  ['Somente a CGOV', 'permissao'],
  ['Comunicação não encontrada', 'nao_encontrado'],
  ['Alerta não encontrado', 'nao_encontrado'],
  ['Risco não encontrado', 'nao_encontrado'],
  ['Este alerta já foi comunicado', 'estado'],
  ['A ciência desta comunicação já foi registrada', 'estado'],
  ['A comunicação é imutável', 'estado'],
  ['Informe', 'validacao'],
  ['Hipótese inválida', 'validacao'],
  ['A data de ciência', 'validacao'],
  ['A comunicação de', 'validacao'],
];

/** Como `traduzirErroBanco`, mas repassa as mensagens em português da comunicação. */
export function traduzirErroComunicacao(erro: unknown): ErroRadar {
  if (erro instanceof ErroRadar) return erro;
  const mensagem = (erro as { message?: unknown } | null)?.message;
  if (typeof mensagem === 'string') {
    const achada = MENSAGENS_COMUNICACAO.find(([prefixo]) => mensagem.startsWith(prefixo));
    if (achada) return new ErroRadar(mensagem, achada[1]);
  }
  return traduzirErroBanco(erro);
}
