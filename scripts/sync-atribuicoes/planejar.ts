/**
 * PLANEJAMENTO DA CARGA DE ATRIBUIÇÕES (Etapa B2, Tarefa 7)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Recebe as pessoas da lista (titulares e substitutos), as unidades e os perfis
 * que já existem, e DEVOLVE UM PLANO: que contas criar, quem muda de unidade,
 * em quem ligar ou desligar a "chave" de titular. Não grava nada: a Tarefa 8
 * mostra o plano à CGOV e só então grava. Por ser pura, é fácil de testar e
 * é IDEMPOTENTE: aplicar o plano e planejar de novo dá um plano vazio.
 *
 * As regras seguem a spec B2, seção 8.8 (decisões B2-2 a B2-9), nesta ordem:
 *   1. achar a unidade pelo nome (inexistente/inativa: a pessoa sai);
 *   2. titular = substituto na mesma linha: fica só como titular;
 *   3. pessoa em várias unidades: escolhe-se uma, as outras viram aviso;
 *   4. sem perfil: cria conta (titular -> papel sugerido; substituto -> gestor);
 *   5. com perfil: ajusta unidade/chave, sem nunca mexer em quem está suspenso;
 *   6. quem era titular e saiu da linha da unidade tem a chave desligada
 *      (inclusive perfil SUSPENSO que não aparece na linha: decisão P-B2-2).
 *      EXCEÇÃO (P-B2-1): se a linha da unidade tem titular sem e-mail válido,
 *      NINGUÉM perde a chave ali, e sai o aviso `titular_sem_email`;
 *   7. unidades da lista que ficam sem titular são apontadas à CGOV.
 *
 * Exemplo: lista com "novo@x" titular da Diretoria e perfil antigo titular
 *          dessa Diretoria -> contasNovas [novo], desligarChave [antigo].
 * ============================================================================
 */
import type { PapelGovernanca } from '../../src/types/radar.types';
import { ORDEM_ALCANCE, sugerirPapel, tipoSuspeito } from '../../src/utils/perfilPorUnidade';
import { normalizarEmail } from '../../supabase/functions/_shared/validacoesAcesso';
import type { AvisoCarga, PessoaListada } from './lerAtribuicoes';

export interface UnidadeRef {
  id: string;
  icmbioId: string | null;
  nome: string;
  tipo: string;
  ativa: boolean;
  paiId: string | null;
}

export interface PerfilAtual {
  id: string;
  email: string;
  nome: string;
  unidadeId: string;
  papel: PapelGovernanca;
  /** A "chave" de titular. */
  titular: boolean;
  /** `false` = conta suspensa pela CGOV. */
  ativo: boolean;
}

export interface PlanoCarga {
  contasNovas: { email: string; nome: string; unidadeId: string; papel: PapelGovernanca; titular: boolean }[];
  mudancasUnidade: { perfilId: string; email: string; deUnidadeId: string; paraUnidadeId: string; papel: PapelGovernanca }[];
  ligarChave: { perfilId: string; email: string; unidadeId: string }[];
  desligarChave: { perfilId: string; email: string; unidadeId: string }[];
  /** Só informativo: substitutos que estão com a chave ligada (exercendo a titularidade). */
  substitutosEmExercicio: { email: string; unidadeId: string }[];
  /** Nomes das unidades da lista que ficam sem titular depois do plano. */
  unidadesSemTitular: string[];
  avisos: AvisoCarga[];
  /** Quantas contas ficam com cada papel entre as criadas/movidas por este plano. */
  contagemPorPapel: Record<PapelGovernanca, number>;
}

/** Todos os papéis, para a contagem começar zerada. */
const TODOS_OS_PAPEIS: PapelGovernanca[] = [
  'gestor', 'coordenador_territorial', 'gerente_regional', 'coordenador_geral', 'diretor',
  'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin',
];

/** Nada a gravar (só avisos)? `substitutosEmExercicio` é informativo e não conta. */
export function planoVazio(p: PlanoCarga): boolean {
  return (
    p.contasNovas.length === 0 &&
    p.mudancasUnidade.length === 0 &&
    p.ligarChave.length === 0 &&
    p.desligarChave.length === 0
  );
}

/** Uma pessoa já ligada à sua unidade resolvida. */
interface Candidata {
  pessoa: PessoaListada;
  unidade: UnidadeRef;
  papelSugerido: PapelGovernanca;
  profundidade: number;
  ordemEntrada: number;
}

export function planejarCarga(
  pessoas: PessoaListada[],
  unidades: UnidadeRef[],
  perfis: PerfilAtual[],
  /** Unidades vistas na leitura, mesmo sem nenhuma pessoa aproveitável (só entram na regra 7). */
  unidadesVistas: string[] = [],
  /**
   * Unidades cuja linha tem titular sem e-mail válido (P-B2-1). Sem saber quem é o titular
   * de verdade, não dá para dizer quem "saiu": a regra 6 não roda nelas. Elas seguem na regra 7.
   */
  unidadesTitularSemEmail: string[] = [],
): PlanoCarga {
  const avisos: AvisoCarga[] = [];
  const porId = new Map(unidades.map((u) => [u.id, u]));
  const porNome = new Map<string, UnidadeRef>();
  for (const u of unidades) if (!porNome.has(u.nome.trim())) porNome.set(u.nome.trim(), u);

  /** Profundidade = quantos ancestrais a unidade tem (com guarda contra ciclo). */
  const profundidade = (u: UnidadeRef): number => {
    const visitados = new Set<string>([u.id]);
    let atual = u.paiId ? porId.get(u.paiId) : undefined;
    let n = 0;
    while (atual && !visitados.has(atual.id)) {
      visitados.add(atual.id);
      n++;
      atual = atual.paiId ? porId.get(atual.paiId) : undefined;
    }
    return n;
  };

  // ---- Regra 1: resolver a unidade --------------------------------------
  const unidadesSuspeitasAvisadas = new Set<string>();
  const candidatas: Candidata[] = [];
  /** Unidades que aparecem na lista (para as regras 6 e 7), na ordem de entrada. */
  const unidadesDaLista: UnidadeRef[] = [];

  pessoas.forEach((pessoa, i) => {
    const nomeUnidade = pessoa.unidadeNome.trim();
    const unidade = porNome.get(nomeUnidade);
    if (!unidade) {
      avisos.push({ tipo: 'unidade_inexistente', linha: pessoa.linha, email: pessoa.email, unidade: nomeUnidade, detalhe: `Linha ${pessoa.linha}: unidade "${nomeUnidade}" não existe no RADAR.` });
      return;
    }
    if (!unidade.ativa) {
      avisos.push({ tipo: 'unidade_inativa', linha: pessoa.linha, email: pessoa.email, unidade: unidade.nome, detalhe: `Linha ${pessoa.linha}: unidade "${unidade.nome}" está inativa.` });
      return;
    }
    const tipoPai = unidade.paiId ? porId.get(unidade.paiId)?.tipo ?? null : null;
    const suspeito = tipoSuspeito({ tipo: unidade.tipo, icmbioId: unidade.icmbioId, tipoPai });
    if (suspeito && !unidadesSuspeitasAvisadas.has(unidade.id)) {
      unidadesSuspeitasAvisadas.add(unidade.id);
      avisos.push({ tipo: 'tipo_suspeito', linha: pessoa.linha, unidade: unidade.nome, detalhe: suspeito });
    }
    if (!unidadesDaLista.includes(unidade)) unidadesDaLista.push(unidade);
    candidatas.push({
      pessoa,
      unidade,
      papelSugerido: sugerirPapel({ tipo: unidade.tipo, icmbioId: unidade.icmbioId, tipoPai }),
      profundidade: profundidade(unidade),
      ordemEntrada: i,
    });
  });

  // ---- Regra 2: mesmo e-mail na mesma linha e unidade = só titular -------
  const semRepetidasNaLinha = candidatas.filter(
    (c) =>
      !(
        c.pessoa.funcao === 'substituto' &&
        candidatas.some(
          (o) =>
            o.pessoa.funcao === 'titular' &&
            o.pessoa.linha === c.pessoa.linha &&
            o.unidade.id === c.unidade.id &&
            o.pessoa.email === c.pessoa.email,
        )
      ),
  );

  // ---- Regra 3: uma unidade por pessoa -----------------------------------
  const grupos = new Map<string, Candidata[]>();
  for (const c of semRepetidasNaLinha) {
    const lista = grupos.get(c.pessoa.email) ?? [];
    lista.push(c);
    grupos.set(c.pessoa.email, lista);
  }
  const comparar = (a: Candidata, b: Candidata): number => {
    const titA = a.pessoa.funcao === 'titular' ? 0 : 1;
    const titB = b.pessoa.funcao === 'titular' ? 0 : 1;
    if (titA !== titB) return titA - titB;
    const alc = ORDEM_ALCANCE[b.papelSugerido] - ORDEM_ALCANCE[a.papelSugerido];
    if (alc !== 0) return alc;
    if (a.profundidade !== b.profundidade) return a.profundidade - b.profundidade;
    const ia = a.unidade.icmbioId, ib = b.unidade.icmbioId;
    if (ia !== ib) {
      if (ia === null) return 1;
      if (ib === null) return -1;
      return ia < ib ? -1 : 1;
    }
    return a.ordemEntrada - b.ordemEntrada;
  };

  const escolhidas: Candidata[] = [];
  for (const [email, lista] of grupos) {
    const ordenada = [...lista].sort(comparar);
    const vencedora = ordenada[0];
    escolhidas.push(vencedora);
    // Repetições na MESMA unidade não são problema; só avisamos de unidades diferentes.
    const outras = ordenada.filter((c) => c.unidade.id !== vencedora.unidade.id);
    const nomesOutras = [...new Set(outras.map((c) => c.unidade.nome))];
    if (nomesOutras.length > 0) {
      avisos.push({
        tipo: 'varias_unidades',
        email,
        unidade: vencedora.unidade.nome,
        detalhe: `${email} aparece em várias unidades; ficou em "${vencedora.unidade.nome}". Ignoradas: ${nomesOutras.join('; ')}.`,
      });
    }
  }
  escolhidas.sort((a, b) => a.ordemEntrada - b.ordemEntrada);

  // ---- Regras 4 e 5: contas novas e ajustes em perfis existentes ---------
  const perfilPorEmail = new Map(perfis.map((p) => [normalizarEmail(p.email), p]));
  const plano: PlanoCarga = {
    contasNovas: [],
    mudancasUnidade: [],
    ligarChave: [],
    desligarChave: [],
    substitutosEmExercicio: [],
    unidadesSemTitular: [],
    avisos,
    contagemPorPapel: Object.fromEntries(TODOS_OS_PAPEIS.map((p) => [p, 0])) as Record<PapelGovernanca, number>,
  };

  for (const c of escolhidas) {
    const { pessoa, unidade, papelSugerido } = c;
    const ehTitular = pessoa.funcao === 'titular';
    const atual = perfilPorEmail.get(pessoa.email);

    if (!atual) {
      const papel = ehTitular ? papelSugerido : 'gestor';
      plano.contasNovas.push({ email: pessoa.email, nome: pessoa.nome, unidadeId: unidade.id, papel, titular: ehTitular });
      plano.contagemPorPapel[papel]++;
      continue;
    }

    if (!atual.ativo) {
      avisos.push({ tipo: 'suspenso_na_lista', linha: pessoa.linha, email: pessoa.email, unidade: unidade.nome, detalhe: `${pessoa.email} está suspenso(a) no RADAR, mas consta na lista; nada foi alterado.` });
      continue;
    }

    const naMesmaUnidade = atual.unidadeId === unidade.id;
    if (ehTitular) {
      if (!naMesmaUnidade) {
        plano.mudancasUnidade.push({ perfilId: atual.id, email: pessoa.email, deUnidadeId: atual.unidadeId, paraUnidadeId: unidade.id, papel: papelSugerido });
        plano.contagemPorPapel[papelSugerido]++;
        plano.ligarChave.push({ perfilId: atual.id, email: pessoa.email, unidadeId: unidade.id });
      } else {
        if (!atual.titular) plano.ligarChave.push({ perfilId: atual.id, email: pessoa.email, unidadeId: unidade.id });
        if (atual.papel !== papelSugerido) {
          avisos.push({ tipo: 'divergencia', linha: pessoa.linha, email: pessoa.email, unidade: unidade.nome, detalhe: `${pessoa.email} tem o papel "${atual.papel}", mas a unidade sugere "${papelSugerido}"; mantido.` });
        }
      }
    } else if (!naMesmaUnidade) {
      avisos.push({ tipo: 'divergencia', linha: pessoa.linha, email: pessoa.email, unidade: unidade.nome, detalhe: `${pessoa.email} é substituto(a) de "${unidade.nome}", mas está lotado(a) em outra unidade; mantido.` });
    } else if (atual.titular) {
      plano.substitutosEmExercicio.push({ email: pessoa.email, unidadeId: unidade.id });
    }
  }

  // ---- Regra 6: desligar a chave de quem saiu da linha da unidade --------
  const idsDasUnidadesDaLista = new Set(unidadesDaLista.map((u) => u.id));
  // A "linha" da unidade é TUDO o que está listado para ela (antes da regra 3):
  // quem é listado numa unidade e também em outra de maior alcance continua nela.
  const naLinhaDaUnidade = new Set(semRepetidasNaLinha.map((c) => `${c.unidade.id}|${c.pessoa.email}`));
  const quemMuda = new Set(plano.mudancasUnidade.map((m) => m.perfilId));
  // P-B2-1: unidades com titular sem e-mail válido (regra 6 não roda nelas) + um aviso por unidade.
  const idsSemRegra6 = new Set<string>();
  for (const nome of unidadesTitularSemEmail) {
    const u = porNome.get(nome.trim());
    if (!u || !u.ativa) continue; // unidade inexistente/inativa já não entra na carga
    idsSemRegra6.add(u.id);
    avisos.push({ tipo: 'titular_sem_email', unidade: u.nome, detalhe: 'titular sem e-mail válido: chave atual mantida' });
  }
  for (const p of perfis) {
    // P-B2-2: perfil SUSPENSO com a chave também é avaliado aqui (antes era isento).
    if (!p.titular || quemMuda.has(p.id)) continue;
    if (!idsDasUnidadesDaLista.has(p.unidadeId) || idsSemRegra6.has(p.unidadeId)) continue;
    const email = normalizarEmail(p.email);
    if (naLinhaDaUnidade.has(`${p.unidadeId}|${email}`)) {
      // Suspenso que aparece na lista segue a B2-8: nada muda (só o aviso `suspenso_na_lista`).
      if (!p.ativo) continue;
      // Em exercício só quem está listado como SUBSTITUTO (e não como titular) nesta unidade.
      const ehTitularListado = semRepetidasNaLinha.some(
        (c) => c.unidade.id === p.unidadeId && c.pessoa.email === email && c.pessoa.funcao === 'titular',
      );
      if (ehTitularListado) continue;
      const jaTem = plano.substitutosEmExercicio.some((x) => x.email === email && x.unidadeId === p.unidadeId);
      if (!jaTem) plano.substitutosEmExercicio.push({ email, unidadeId: p.unidadeId });
      continue;
    }
    plano.desligarChave.push({ perfilId: p.id, email: p.email, unidadeId: p.unidadeId });
  }

  // ---- Regra 7: unidades da lista que ficam sem titular ------------------
  // Estado depois do plano: quem tem a chave em cada unidade.
  const comChave = new Set<string>(); // ids de unidades com titular ativo
  const desligados = new Set(plano.desligarChave.map((d) => d.perfilId));
  const movidos = new Map(plano.mudancasUnidade.map((m) => [m.perfilId, m.paraUnidadeId]));
  const ligados = new Set(plano.ligarChave.map((l) => l.perfilId));
  for (const p of perfis) {
    if (!p.ativo || desligados.has(p.id)) continue;
    if (p.titular || ligados.has(p.id)) comChave.add(movidos.get(p.id) ?? p.unidadeId);
  }
  for (const c of plano.contasNovas) if (c.titular) comChave.add(c.unidadeId);

  // Unidades vistas só na leitura (todas as pessoas descartadas) entram aqui, e NÃO na regra 6.
  const paraRegra7 = [...unidadesDaLista];
  for (const nome of unidadesVistas) {
    const u = porNome.get(nome.trim());
    if (u && u.ativa && !paraRegra7.includes(u)) paraRegra7.push(u);
  }
  for (const u of paraRegra7) {
    if (comChave.has(u.id)) continue;
    plano.unidadesSemTitular.push(u.nome);
    avisos.push({ tipo: 'sem_titular', unidade: u.nome, detalhe: `A unidade "${u.nome}" ficará sem titular com a chave ligada.` });
  }

  return plano;
}
