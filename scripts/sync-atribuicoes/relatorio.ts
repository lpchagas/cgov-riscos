/**
 * RELATÓRIO EM TEXTO DO IMPORTADOR DE ATRIBUIÇÕES (Etapa B2, Tarefa 8)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Transforma o `PlanoCarga` (Tarefa 7) num texto para a CGOV conferir ANTES de
 * gravar. Regras de privacidade:
 *   - unidades aparecem pelo NOME (nunca pelo id interno);
 *   - pessoas aparecem só pelo E-MAIL (nunca pelo nome);
 *   - o relatório só é impresso na tela; nunca é gravado em arquivo.
 * As seções de MUDANÇA (contas novas, mudanças de unidade, chaves de titular e
 * unidades sem titular) saem SEMPRE completas: a CGOV precisa ver tudo o que
 * será gravado antes de responder "Aplicar? (s/N)". Só as seções de aviso
 * (substitutos, várias unidades, linhas ignoradas, outros avisos, contagem)
 * são cortadas em `limite` itens ("... e mais N"), a menos que `completo` seja
 * verdadeiro (opção `--completo`).
 *
 * Exemplo de trecho:
 *   === Contas novas (2) ===
 *     ana@radar.test  | Instituto de Teste | papel: presidencia | titular
 * ============================================================================
 */
import type { AvisoCarga } from './lerAtribuicoes';
import type { PlanoCarga, UnidadeRef } from './planejar';

/** Avisos que significam "esta linha/pessoa foi deixada de fora". */
const TIPOS_DE_LINHA_IGNORADA: AvisoCarga['tipo'][] = [
  'linha_vazia', 'sem_email', 'email_invalido', 'unidade_inexistente', 'unidade_inativa',
];

export const RODAPE_TRILHA =
  'As gravações do importador aparecem na trilha de auditoria sem autor (usuario_id nulo).';

export function formatarRelatorioAtribuicoes(
  plano: PlanoCarga,
  limite = 50,
  /** Unidades do banco, para trocar id por nome. Sem elas, o id é mostrado. */
  unidades: UnidadeRef[] = [],
  /** `true` (opção `--completo`): nenhuma seção é cortada. */
  completo = false,
): string {
  const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
  const unidade = (id: string): string => nomeDe.get(id) ?? id;
  const saida: string[] = [];

  /**
   * Escreve uma seção com título e contagem. `mudanca` = seção de coisas que SERÃO gravadas:
   * nunca é cortada. As demais mostram no máximo `limite` linhas (salvo `completo`).
   */
  const secao = (titulo: string, linhas: string[], mudanca = false): void => {
    const max = mudanca || completo ? linhas.length : limite;
    saida.push('', `=== ${titulo} (${linhas.length}) ===`);
    if (linhas.length === 0) saida.push('  (nenhuma)');
    for (const l of linhas.slice(0, max)) saida.push(`  ${l}`);
    if (linhas.length > max) saida.push(`  ... e mais ${linhas.length - max}`);
  };

  secao('Contas novas', plano.contasNovas.map(
    (c) => `${c.email} | ${unidade(c.unidadeId)} | papel: ${c.papel} | ${c.titular ? 'titular' : 'substituto'}`,
  ), true);
  secao('Mudaram de unidade', plano.mudancasUnidade.map(
    (m) => `${m.email} | ${unidade(m.deUnidadeId)} -> ${unidade(m.paraUnidadeId)} | papel: ${m.papel}`,
  ), true);
  secao('Ganham a chave de titular', plano.ligarChave.map((l) => `${l.email} | ${unidade(l.unidadeId)}`), true);
  secao('Perdem a chave de titular', plano.desligarChave.map((l) => `${l.email} | ${unidade(l.unidadeId)}`), true);
  secao('Substitutos em exercício (preservados)', plano.substitutosEmExercicio.map(
    (s) => `${s.email} | ${unidade(s.unidadeId)}`,
  ));
  secao('Unidades sem titular', plano.unidadesSemTitular, true);
  secao('Pessoas em várias unidades', plano.avisos.filter((a) => a.tipo === 'varias_unidades').map((a) => a.detalhe));
  secao('Linhas ignoradas', plano.avisos.filter((a) => TIPOS_DE_LINHA_IGNORADA.includes(a.tipo)).map((a) => a.detalhe));

  // P-B2-1: unidades cuja linha tem titular sem e-mail válido (a chave atual foi mantida). Só pelo nome da unidade.
  const titularSemEmail = plano.avisos.filter((a) => a.tipo === 'titular_sem_email');
  if (titularSemEmail.length > 0) {
    secao('Titular sem e-mail válido (chave atual mantida)', titularSemEmail.map((a) => a.unidade ?? a.detalhe));
  }

  // Outros avisos (tipo suspeito, divergências, suspensos): só aparecem se houver.
  const outros = plano.avisos.filter(
    (a) =>
      a.tipo !== 'varias_unidades' && a.tipo !== 'sem_titular' && a.tipo !== 'titular_sem_email' &&
      !TIPOS_DE_LINHA_IGNORADA.includes(a.tipo),
  );
  if (outros.length > 0) secao('Outros avisos', outros.map((a) => a.detalhe));

  secao('Contagem por perfil', Object.entries(plano.contagemPorPapel)
    .filter(([, n]) => n > 0)
    .map(([papel, n]) => `${papel}: ${n}`));

  saida.push('', RODAPE_TRILHA);
  return saida.join('\n');
}
