/**
 * ============================================================================
 * STORE CENTRAL DE GESTÃO DE RISCOS (`riscosStore.ts`) — SISTEMA RADAR
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Esta Store Pinia é a "memória compartilhada" das telas: guarda a carteira de
 * riscos, os objetos, as categorias (DAR), as unidades e os processos, e
 * oferece as ações do fluxo ("Aprovação em 1 Clique").
 *
 * Desde a etapa B3 ela NÃO calcula nem decide nada sozinha. Quem faz isso é a
 * FONTE DE DADOS (`src/services/dados/`):
 *   - modo demonstração → `fonteDemonstracao.ts` (memória + calculadora oficial);
 *   - modo real         → `fonteSupabase.ts` (banco: RLS, fluxo, trigger de cálculo).
 * A store só: (1) pede os dados à fonte, (2) guarda o que veio, (3) depois de
 * cada ação RELÊ o(s) risco(s) afetado(s), para a tela mostrar o que o banco
 * de fato gravou.
 *
 * Ciclo de vida da carteira (`estado`):
 *   'ocioso'     → nada carregado (antes de entrar, ou depois de sair);
 *   'carregando' → `carregar()` em andamento;
 *   'pronto'     → dados na memória;
 *   'erro'       → a carga falhou (`erro` tem a mensagem pronta para a tela;
 *                  `tentarDeNovo()` repete a carga).
 *
 * Quem chama `carregar()` e `limpar()`? O `App.vue`, observando a sessão
 * (`authStore.situacao`): ficou 'ativo' → carrega; deixou de ser 'ativo'
 * (saiu, sessão venceu, conta suspensa) → limpa. Assim nenhum dado de uma
 * pessoa fica na memória para a próxima.
 *
 * Exemplo de uso numa tela:
 *   const riscosStore = useRiscosStore();
 *   try {
 *     await riscosStore.submeterParaValidacaoCg(risco.id);
 *   } catch (e) {
 *     mostrar({ tom: 'perigo', mensagem: (e as ErroRadar).message });
 *   }
 */

import { defineStore } from 'pinia';
import { computed, ref, watch, type WatchStopHandle } from 'vue';
import type {
  AcoesFluxo,
  AlertaKri,
  ApetiteDeclarado,
  CategoriaRisco,
  ClasseRisco,
  FichaRisco,
  IndicadorKri,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  ObjetoContexto,
  ProcessoCadeiaValor,
  RespostaTratamento5W2H,
  UnidadeOrganizacional,
} from '../types/radar.types';
import { criarFonteDados } from '../services/dados';
import type {
  EventoAuditoria,
  EventoFluxo,
  FichaParaSalvar,
  FiltrosAuditoria,
  FonteDados,
  NovaMedicaoKri,
} from '../services/dados/tipos';
import { fichaDaSkillParaSalvar, fichaParaSalvarDeRisco } from '../services/dados/conversores';
import { ErroRadar, traduzirErroBanco } from '../services/dados/errosBanco';
import { apetitesDaDAR, importarTabelaMarkdownSkill } from '../utils/importadorSkillMarkdown';
import { riscoCorrespondeAoTermo } from '../utils/filtrosRiscos';
import { alertaEncerrado } from '../utils/situacaoKri';
import { useAuthStore } from './authStore';

export type EstadoCarteira = 'ocioso' | 'carregando' | 'pronto' | 'erro';

// ---------------------------------------------------------------------------
// INJEÇÃO DA FONTE (SÓ PARA TESTES)
// ---------------------------------------------------------------------------
/** Fonte falsa usada pelos testes no lugar da fonte do modo atual. */
let fonteDeTeste: FonteDados | null = null;

/**
 * SÓ PARA TESTES: faz a store usar uma fonte falsa (ex.: uma que demora ou
 * falha de propósito). Passe `null` para voltar à fonte normal.
 * Ex.: definirFonteParaTeste(fonteQueFalha); await useRiscosStore().carregar();
 */
export function definirFonteParaTeste(f: FonteDados | null): void {
  fonteDeTeste = f;
}

/** Garante que todo erro que sai da store é um `ErroRadar` (mensagem pronta para a tela). */
function comoErroRadar(e: unknown): ErroRadar {
  return e instanceof ErroRadar ? e : traduzirErroBanco(e);
}

/** Converte uma lista de `AcoesFluxo` num dicionário por id do risco. */
function porRisco(lista: AcoesFluxo[]): Record<string, AcoesFluxo> {
  return Object.fromEntries(lista.map((a) => [a.riscoId, a]));
}

/**
 * Monta o pacote de gravação (só campos de ENTRADA) a partir do formato
 * antigo das telas (`Partial<FichaRisco>`). Os campos calculados (inerente,
 * residual, criticidade…) são ignorados: quem calcula é a fonte.
 *
 * - Risco que já existe: parte da ficha atual + o que a tela mudou.
 * - Risco novo: só o que a tela mandou; os filhos perdem o id provisório
 *   da tela (ex.: 'ctrl-1731760000000'), porque quem dá o id é a fonte.
 */
function montarFichaParaSalvar(
  parcial: Partial<FichaRisco>,
  existente: FichaRisco | undefined,
  objetoPadrao: string,
  kriOriginaisDoObjeto: IndicadorKri[] = []
): FichaParaSalvar {
  // Edição: o KRI cuja definição NÃO mudou vai só como "ligação" (`apenasLigar`),
  // para não fazer UPDATE à toa num KRI que pode ser de outros riscos (falso
  // "sem permissão" para a CGOV; sobrescrita de edição simultânea). Os originais
  // para comparar: os KRIs da ficha e os do mesmo objeto (o escolhido na lista).
  if (existente) return fichaParaSalvarDeRisco({ ...existente, ...parcial }, [...existente.kris, ...kriOriginaisDoObjeto]);

  const ficha: FichaParaSalvar = {
    objetoId: parcial.objetoId ?? objetoPadrao,
    preliminarCgov: parcial.origemPreliminarCgov || parcial.statusFluxo === 'preliminar_cgov' || undefined,
    responsavelRiscoNome: parcial.responsavelRiscoNome,
    causas: parcial.causas,
    eventoRisco: parcial.eventoRisco,
    consequencias: parcial.consequencias,
    objetivoAfetado: parcial.objetivoAfetado,
    categoriaId: parcial.categoriaId,
    subcategoriaIntegridade: parcial.subcategoriaIntegridade,
    testeIntegridadeAplicavel: parcial.testeIntegridadeAplicavel,
    justificativaNaoIntegridade: parcial.justificativaNaoIntegridade,
    probabilidade: parcial.probabilidade,
    justificativaProbabilidade: parcial.justificativaProbabilidade,
    impacto: parcial.impacto,
    justificativaImpacto: parcial.justificativaImpacto,
    possuiEvidenciaControle: parcial.possuiEvidenciaControle,
    nivelEficaciaControle: parcial.nivelEficaciaControle,
    estrategiaPrincipal: parcial.estrategiaPrincipal,
    controles: parcial.controlesExistentes?.map(({ id: _id, ...c }) => c),
    respostas: parcial.respostasTratamento?.map(({ id: _id, ...x }) => x),
    // KRI novo: sem id (a fonte dá um). KRI que já existe no objeto e só é ligado
    // (`apenasLigar`) mantém o id: é ele que a fonte vai ligar ao risco novo.
    kris: parcial.kris?.map(({ id, medicoes: _m, objetoId: _o, riscoIds: _r, apenasLigar, ...k }) =>
      apenasLigar && id ? { ...k, id, apenasLigar: true } : k
    ),
  };
  // Tira as chaves vazias: undefined = "não mexer / usar o padrão" na fonte.
  return Object.fromEntries(Object.entries(ficha).filter(([, v]) => v !== undefined)) as FichaParaSalvar;
}

/** O mínimo da sessão de que a ligação precisa (a `authStore` real serve). */
export interface SessaoParaCarteira {
  situacao: string;
  usuarioAtual: { id: string; papel: string };
}
/** O mínimo da carteira de que a ligação precisa (a `riscosStore` real serve). */
export interface CarteiraLigavel {
  carregar(): Promise<void>;
  limpar(): void;
}

/**
 * Liga a carteira de riscos à sessão (chamada uma vez pelo `App.vue`):
 *   - sessão 'ativo' → `carregar()` (na demonstração já nasce 'ativo');
 *   - qualquer outra situação (saiu, sessão venceu, conta suspensa, erro) → `limpar()`;
 *   - outra pessoa (id) ou outro perfil (papel) com a sessão ativa → recarrega.
 *
 * ATENÇÃO (por que três fontes "primitivas"): a `authStore` remonta o objeto
 * `usuarioAtual` toda vez que relê o perfil (ao voltar à aba, ao renovar o
 * token). Se observássemos o objeto ou uma lista nova a cada leitura, o Vue
 * acharia que "mudou" e recarregaria a carteira inteira a cada foco da aba.
 * Observando só textos (situação, id, papel), nada acontece quando o perfil
 * relido é igual ao anterior.
 * Ex.: perfil relido com o mesmo id e papel → nenhuma recarga;
 *      papel trocado de 'gestor' para 'diretor' → recarrega.
 */
export function ligarCarteiraASessao(
  sessao: SessaoParaCarteira = useAuthStore(),
  carteira: CarteiraLigavel = useRiscosStore()
): WatchStopHandle {
  return watch(
    [() => sessao.situacao, () => sessao.usuarioAtual.id, () => sessao.usuarioAtual.papel],
    ([situacao]) => {
      if (situacao === 'ativo') void carteira.carregar();
      else carteira.limpar();
    },
    { immediate: true }
  );
}

export const useRiscosStore = defineStore('riscos', () => {
  // ---------------------------------------------------------------------------
  // A FONTE DE DADOS
  // ---------------------------------------------------------------------------
  // Criada só na primeira vez em que é usada e mantida enquanto a store viver:
  // na demonstração é ELA que guarda os dados (recriar = perder o que foi feito).
  let fonteDoModo: FonteDados | null = null;
  function fonte(): FonteDados {
    if (fonteDeTeste) return fonteDeTeste;
    fonteDoModo ??= criarFonteDados(useAuthStore().modo);
    return fonteDoModo;
  }

  // ---------------------------------------------------------------------------
  // DADOS (começam vazios: só se enchem depois de `carregar()`)
  // ---------------------------------------------------------------------------
  const riscos = ref<FichaRisco[]>([]);
  const categorias = ref<CategoriaRisco[]>([]);
  const unidades = ref<UnidadeOrganizacional[]>([]);
  const objetosContexto = ref<ObjetoContexto[]>([]);
  const processos = ref<ProcessoCadeiaValor[]>([]);
  /** O que a pessoa logada pode fazer com cada risco. Ex.: acoes.value['risco-1'].podeValidar */
  const acoes = ref<Record<string, AcoesFluxo>>({});
  /** Alertas dos KRIs (LAC-03): abertos e encerrados, com o prazo já calculado pela fonte. */
  const alertasKri = ref<AlertaKri[]>([]);
  /**
   * KRIs sem nenhum risco ligado à vista (P-02). Ex.: o risco do KRI foi
   * excluído, mas o alerta ainda não foi comunicado. Atualiza a cada `carregar()`.
   */
  const krisSemRisco = ref<IndicadorKri[]>([]);

  const estado = ref<EstadoCarteira>('ocioso');
  const erro = ref<ErroRadar | null>(null);
  /**
   * Aviso de "tela desatualizada": a ação FOI gravada, mas a releitura depois
   * dela falhou (ex.: a rede caiu entre as duas). A ação NÃO é dada como
   * falha (a pessoa não deve repetir o que já foi feito); a tela mostra este
   * aviso e sugere "Atualizar". Some na próxima carga ou releitura que der certo.
   */
  const avisoAtualizacao = ref<ErroRadar | null>(null);
  const MENSAGEM_TELA_DESATUALIZADA = 'A ação foi concluída, mas não foi possível atualizar a tela. Use Atualizar.';
  /** Aviso da carga em que só os alertas dos KRIs falharam (a carteira abriu sem eles). */
  const MENSAGEM_ALERTAS_INDISPONIVEIS =
    'A carteira foi carregada, mas não foi possível ler os alertas dos indicadores (KRI). Use Atualizar.';

  // Estado reativo de busca global (br-header #main-searchbox) e filtros da Matriz 5x5:
  const termoBuscaGlobal = ref<string>('');
  const celulaMatrizSelecionada = ref<{
    p: NivelProbabilidade;
    i: NivelImpacto;
  } | null>(null);
  const categoriaFiltroId = ref<number | null>(null);

  // ---------------------------------------------------------------------------
  // CARGA, NOVA TENTATIVA E LIMPEZA
  // ---------------------------------------------------------------------------
  /**
   * "Número da geração" dos dados. Sobe a cada `carregar()` e a cada `limpar()`.
   * Uma leitura guarda o número de quando começou; se, ao terminar, o número
   * mudou, o resultado é VELHO e vai para o lixo.
   * Ex.: carga lenta começa (geração 1) → pessoa sai → `limpar()` (geração 2)
   *      → a carga termina: 1 ≠ 2, nada é gravado (a próxima pessoa não vê
   *      os riscos de quem saiu). Mesma ideia de `authStore.lerPerfil`.
   */
  let geracao = 0;

  /** Lê a carteira inteira e as ações possíveis de cada risco. Nunca lança: falha vira `estado = 'erro'`. */
  async function carregar(): Promise<void> {
    const minha = ++geracao;
    const velha = () => minha !== geracao;
    estado.value = 'carregando';
    erro.value = null;
    try {
      const carteira = await fonte().carregarCarteira();
      if (velha()) return;
      // Os alertas dos KRIs são dado SECUNDÁRIO (N-7 da revisão da Fase 2): se só a
      // leitura deles falhar (ex.: a visão `alertas_kri_situacao` ainda não existe na
      // nuvem), a carteira abre mesmo assim, sem alertas, com o aviso para "Atualizar".
      let falhaAlertas: ErroRadar | null = null;
      const [listaAcoes, listaAlertas] = await Promise.all([
        fonte().acoesNoFluxo(carteira.riscos.map((r) => r.id)),
        fonte().listarAlertasKri().catch((e: unknown): AlertaKri[] => {
          falhaAlertas = comoErroRadar(e);
          return [];
        }),
      ]);
      if (velha()) return;
      riscos.value = carteira.riscos;
      objetosContexto.value = carteira.objetos;
      categorias.value = carteira.categorias;
      unidades.value = carteira.unidades;
      processos.value = carteira.processos;
      acoes.value = porRisco(listaAcoes);
      alertasKri.value = listaAlertas;
      krisSemRisco.value = carteira.krisSemRisco ?? [];
      // (Lido por uma variável à parte: o TypeScript não "vê" a troca feita dentro do catch acima.)
      const erroDosAlertas = falhaAlertas as ErroRadar | null;
      avisoAtualizacao.value = erroDosAlertas ? new ErroRadar(MENSAGEM_ALERTAS_INDISPONIVEIS, erroDosAlertas.tipo) : null;
      estado.value = 'pronto';
    } catch (e) {
      if (velha()) return;
      erro.value = comoErroRadar(e);
      estado.value = 'erro';
    }
  }

  /** Botão "Tentar de novo" das telas de erro. */
  function tentarDeNovo(): Promise<void> {
    return carregar();
  }

  /** Esvazia tudo (ao sair). Qualquer leitura ainda em andamento será descartada. */
  function limpar(): void {
    geracao++;
    riscos.value = [];
    objetosContexto.value = [];
    categorias.value = [];
    unidades.value = [];
    processos.value = [];
    acoes.value = {};
    alertasKri.value = [];
    krisSemRisco.value = [];
    estado.value = 'ocioso';
    erro.value = null;
    avisoAtualizacao.value = null;
    limparFiltrosPainel();
  }

  /**
   * Relê da fonte os riscos indicados e as ações possíveis deles.
   * - Risco que voltou: substitui o da memória MANTENDO o mesmo objeto (assim
   *   uma tela que guardou a referência, ex.: o painel lateral da lista, se
   *   atualiza sozinha).
   * - Risco novo (ex.: acabou de ser criado): entra no topo da lista.
   * - `null` (excluído ou fora do alcance): sai da lista.
   * Se a pessoa saiu no meio da leitura, o resultado é descartado.
   */
  async function relerRiscos(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const minha = geracao;
    let lidos: Array<FichaRisco | null>;
    let listaAcoes: AcoesFluxo[];
    try {
      lidos = await Promise.all(ids.map((id) => fonte().relerRisco(id)));
      if (minha !== geracao) return;
      const presentes = lidos.filter((r): r is FichaRisco => r !== null);
      listaAcoes = await fonte().acoesNoFluxo(presentes.map((r) => r.id));
      if (minha !== geracao) return;
    } catch (e) {
      // Como as demais ações públicas: quem chama recebe sempre um ErroRadar.
      throw comoErroRadar(e);
    }

    ids.forEach((id, i) => {
      const novo = lidos[i];
      const idx = riscos.value.findIndex((r) => r.id === id);
      if (!novo) {
        if (idx >= 0) riscos.value.splice(idx, 1);
        delete acoes.value[id];
        return;
      }
      if (idx >= 0) {
        const atual = riscos.value[idx] as unknown as Record<string, unknown>;
        // Apaga campos que deixaram de existir (ex.: subcategoria apagada) e copia os novos.
        for (const chave of Object.keys(atual)) if (!(chave in novo)) delete atual[chave];
        Object.assign(atual, novo);
      } else {
        riscos.value.unshift(novo);
      }
    });
    for (const a of listaAcoes) acoes.value[a.riscoId] = a;
    // Esta releitura NÃO lê os alertas dos KRIs. Então só limpa o aviso se ele não for o de
    // "alertas indisponíveis": esse só some quando os alertas forem lidos de verdade (carregar).
    if (avisoAtualizacao.value?.message !== MENSAGEM_ALERTAS_INDISPONIVEIS) avisoAtualizacao.value = null;
  }

  /**
   * Relê DEPOIS de uma gravação que deu certo. Se a releitura falhar, não
   * lança: guarda o aviso "tela desatualizada" (com o tipo do erro original).
   * Ex.: enviar() gravou, relerRisco() caiu por rede → a ação resolve e
   *      avisoAtualizacao.message = 'A ação foi concluída, mas não foi possível…'
   */
  async function relerDepoisDaAcao(ids: string[]): Promise<void> {
    try {
      await relerRiscos(ids);
    } catch (e) {
      avisoAtualizacao.value = new ErroRadar(MENSAGEM_TELA_DESATUALIZADA, comoErroRadar(e).tipo);
    }
  }

  /**
   * Roda uma gravação na fonte e, se der certo, relê os riscos afetados.
   * - Se a fonte RECUSAR a gravação, NADA muda na memória e o `ErroRadar` é
   *   relançado para a tela mostrar a mensagem.
   * - Se a gravação deu certo e só a RELEITURA falhou, a ação resolve
   *   normalmente e fica o `avisoAtualizacao` (ver `relerDepoisDaAcao`).
   */
  async function executar(acao: () => Promise<unknown>, idsParaReler: () => string[]): Promise<void> {
    try {
      await acao();
    } catch (e) {
      throw comoErroRadar(e);
    }
    await relerDepoisDaAcao(idsParaReler());
  }

  /**
   * Relê os alertas dos KRIs (uma leitura nova pode ter aberto um). Como `relerDepoisDaAcao`:
   * não lança; se falhar, guarda o aviso "tela desatualizada". Descarta o resultado se a
   * pessoa saiu no meio (mesma "geração" dos dados).
   */
  async function relerAlertasDepoisDaAcao(): Promise<void> {
    const minha = geracao;
    try {
      const lidos = await fonte().listarAlertasKri();
      if (minha !== geracao) return;
      alertasKri.value = lidos;
    } catch (e) {
      avisoAtualizacao.value = new ErroRadar(MENSAGEM_TELA_DESATUALIZADA, comoErroRadar(e).tipo);
    }
  }

  /**
   * Relê os KRIs SEM risco ligado e os alertas (I-1 da revisão da Fase 2). Usada depois
   * de excluir um risco ou de salvar uma ficha que mexeu nos KRIs: um KRI pode ter
   * perdido o seu último risco e, se tiver alerta, continua no Monitoramento.
   * Ex.: o KRI k1 (alerta aberto) só servia ao risco X; X é excluído → k1 entra em
   *      `krisSemRisco` na hora, sem esperar a página recarregar.
   * Como `relerAlertasDepoisDaAcao`: não lança; se falhar, fica o aviso "tela desatualizada".
   */
  async function relerKrisSemRiscoDepoisDaAcao(): Promise<void> {
    const minha = geracao;
    try {
      const [soltos, lidos] = await Promise.all([fonte().listarKrisSemRisco(), fonte().listarAlertasKri()]);
      if (minha !== geracao) return;
      krisSemRisco.value = soltos;
      alertasKri.value = lidos;
    } catch (e) {
      avisoAtualizacao.value = new ErroRadar(MENSAGEM_TELA_DESATUALIZADA, comoErroRadar(e).tipo);
    }
  }

  /**
   * O alerta ABERTO de um KRI, ou `undefined`. Há no máximo um por KRI.
   * "Encerrado" segue a MESMA regra de `situacaoKri` (`alertaEncerrado`): tem data de
   * encerramento OU já tem comunicação à CGOV ligada.
   * Ex.: alertaAbertoDoKri('kri-integra-1')?.diaAtual -> 3
   */
  function alertaAbertoDoKri(kriId: string): AlertaKri | undefined {
    return alertasKri.value.find((a) => a.kriId === kriId && !alertaEncerrado(a));
  }

  // ---------------------------------------------------------------------------
  // GETTERS (filtros, filas e resumos)
  // ---------------------------------------------------------------------------
  const riscosFiltrados = computed(() => {
    const termo = termoBuscaGlobal.value.trim().toLowerCase();
    return riscos.value.filter((r) => {
      if (
        celulaMatrizSelecionada.value &&
        (r.probabilidade !== celulaMatrizSelecionada.value.p ||
          r.impacto !== celulaMatrizSelecionada.value.i)
      ) {
        return false;
      }
      if (
        categoriaFiltroId.value !== null &&
        r.categoriaId !== categoriaFiltroId.value
      ) {
        return false;
      }
      // A regra de busca fica em `utils/filtrosRiscos.ts`, compartilhada com a página /riscos.
      return riscoCorrespondeAoTermo(r, termo);
    });
  });

  const riscosCriticosCarteira = computed(() =>
    riscos.value.filter((r) => r.statusCritico === 'sim')
  );

  /**
   * As filas seguem as `acoes` (o que EU posso fazer), não só a situação do
   * risco. Ex.: um risco em validação de outra Coordenação-Geral não entra na
   * minha fila, porque `acoes[id].podeValidar` vem `false` para mim.
   */
  const filaValidacaoCg = computed(() =>
    riscos.value.filter((r) => acoes.value[r.id]?.podeValidar)
  );

  const filaHomologacaoDiretoria = computed(() =>
    riscos.value.filter((r) => acoes.value[r.id]?.podeHomologar)
  );

  /** Riscos sem chefia que decida: a CGOV devolve direto à unidade. */
  const filaSemDecisor = computed(() =>
    riscos.value.filter((r) => acoes.value[r.id]?.devolucaoCgov)
  );

  /** Só as unidades ativas (as inativas somem das listas de escolha). */
  const unidadesAtivas = computed(() => unidades.value.filter((u) => u.ativa));

  const trilhaAuditoriaGlobal = computed(() => {
    const eventos: Array<{
      id: string;
      riscoId: string;
      codigoRadar: string;
      nomeObjeto: string;
      categoriaNome: string;
      nivelResidual: number;
      classificacaoResidual: ClasseRisco;
      etapa: string;
      acao: string;
      usuarioNome: string;
      usuarioPapel: string;
      despachoTexto?: string;
      criadoEm: string;
    }> = [];

    for (const r of riscos.value) {
      for (const h of r.historicoFluxo) {
        eventos.push({
          id: h.id,
          riscoId: r.id,
          codigoRadar: r.codigoRadar,
          nomeObjeto: r.nomeObjetoCache || 'Objeto de Gestão de Riscos',
          categoriaNome: r.categoriaNome,
          nivelResidual: r.nivelResidual,
          classificacaoResidual: r.classificacaoResidual,
          etapa: h.etapa,
          acao: h.acao,
          usuarioNome: h.usuarioNome,
          usuarioPapel: h.usuarioPapel,
          despachoTexto: h.despachoTexto,
          criadoEm: h.criadoEm,
        });
      }
    }

    return eventos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  });

  const resumoPorClasse = computed(() => {
    const contagem: Record<ClasseRisco, number> = {
      Baixo: 0,
      Médio: 0,
      Alto: 0,
      Extremo: 0,
    };
    for (const r of riscos.value) {
      contagem[r.classificacaoResidual] =
        (contagem[r.classificacaoResidual] || 0) + 1;
    }
    return contagem;
  });

  function obterApetitePorCategoria(categoriaId: number): ApetiteDeclarado {
    const cat = categorias.value.find((c) => c.id === categoriaId);
    return cat ? cat.apetiteDeclarado : 'pendente_dar';
  }

  function obterRiscoPorId(id: string): FichaRisco | undefined {
    return riscos.value.find((r) => r.id === id || r.codigoRadar === id);
  }

  // ---------------------------------------------------------------------------
  // GRAVAÇÃO DA FICHA
  // ---------------------------------------------------------------------------
  /**
   * KRIs já definidos num objeto de gestão de riscos, vistos pelos riscos
   * carregados (LAC-03: o KRI pode ser compartilhado dentro do mesmo objeto).
   * Um KRI ligado a 3 riscos aparece UMA vez só (sem repetir o `id`).
   * Ex.: krisDoObjeto('obj-1') → [{ id: 'k1', nomeIndicador: '% com checklist', riscoIds: ['r1', 'r2'], ... }]
   */
  function krisDoObjeto(objetoId: string): IndicadorKri[] {
    const porId = new Map<string, IndicadorKri>();
    for (const r of riscos.value) {
      if (r.objetoId !== objetoId) continue;
      for (const k of r.kris) if (!porId.has(k.id)) porId.set(k.id, k);
    }
    return [...porId.values()];
  }

  /**
   * Ids dos riscos na memória ligados a algum destes KRIs (LAC-03).
   * Ex.: riscosLigadosAosKris(new Set(['k1'])) → ['r1', 'r4'] (os dois dividem o k1)
   */
  function riscosLigadosAosKris(kriIds: Set<string>): string[] {
    if (!kriIds.size) return [];
    return riscos.value.filter((r) => r.kris.some((k) => kriIds.has(k.id))).map((r) => r.id);
  }

  /**
   * Cria (sem `id`) ou altera (com `id`) uma Ficha de Risco. Manda só os dados
   * de ENTRADA; a fonte calcula (Quadros 6, 7 e 8 e DAR) e a store relê.
   * Ex.: const ficha = await salvarOuAtualizarRisco({ objetoId: 'obj-1', probabilidade: 1, impacto: 5 });
   *      ficha.nivelInerente → 15 (Quadro 7, calculado pela fonte)
   */
  async function salvarOuAtualizarRisco(parcial: Partial<FichaRisco>): Promise<FichaRisco> {
    const existente = parcial.id ? riscos.value.find((r) => r.id === parcial.id) : undefined;
    // Pediram para ALTERAR um risco que não está na memória (excluído, fora do
    // alcance ou id errado): recusamos, em vez de criar um risco novo por engano.
    if (parcial.id && !existente) throw new ErroRadar('Risco não encontrado.', 'nao_encontrado');
    const pacote = montarFichaParaSalvar(
      parcial,
      existente,
      objetosContexto.value[0]?.id ?? '',
      existente ? krisDoObjeto(existente.objetoId) : []
    );
    // KRIs que esta gravação pode mexer: os que o risco tinha ANTES e os que vão
    // no pacote (ligados, editados ou desligados). Os outros riscos ligados a eles
    // também mudam (reabertura do aprovado, `riscoIds`), então são relidos juntos.
    const krisMexidos = new Set<string>([
      ...(existente?.kris.map((k) => k.id) ?? []),
      ...(pacote.kris ?? []).map((k) => k.id ?? '').filter(Boolean),
    ]);
    let gravado = { id: '', codigoRadar: '' };
    await executar(
      async () => {
        gravado = await fonte().salvarFicha(pacote);
      },
      () => [...new Set([gravado.id, ...riscosLigadosAosKris(krisMexidos)])]
    );
    // Algum KRI mexido pode ter ficado sem risco ligado (ex.: desligado da ficha).
    if (krisMexidos.size) await relerKrisSemRiscoDepoisDaAcao();
    const salvo = riscos.value.find((r) => r.id === gravado.id);
    if (salvo) return salvo;
    // A ficha FOI gravada, mas a releitura falhou (há `avisoAtualizacao`):
    // devolvemos o que sabemos (o que a tela mandou + id e código da fonte),
    // para a tela seguir sem pedir que a pessoa grave de novo.
    return { ...existente, ...parcial, id: gravado.id, codigoRadar: gravado.codigoRadar } as FichaRisco;
  }

  /**
   * Reavaliação de nota: grava a nova P, I e eficácia do controle. A fonte
   * recalcula e, se o risco estava aprovado, reabre para validação da
   * Coordenação-Geral.
   */
  async function reavaliarPontuacaoRiscoAprovado(
    riscoId: string,
    novosDados: {
      probabilidade: NivelProbabilidade;
      impacto: NivelImpacto;
      nivelEficaciaControle: NivelEficaciaControle;
      possuiEvidenciaControle: boolean;
    }
  ): Promise<void> {
    await salvarOuAtualizarRisco({ id: riscoId, ...novosDados });
  }

  /**
   * Exclui o risco e relê também quem dividia KRI com ele (o `riscoIds` desses
   * KRIs perde o risco excluído). O excluído relido volta `null` e sai da memória.
   */
  async function excluirRisco(id: string): Promise<void> {
    const krisDoExcluido = new Set(riscos.value.find((r) => r.id === id)?.kris.map((k) => k.id) ?? []);
    await executar(
      () => fonte().excluirRisco(id),
      () => [...new Set([id, ...riscosLigadosAosKris(krisDoExcluido)])]
    );
    // O KRI que só servia ao excluído (e tem alerta) vira "sem risco ligado".
    if (krisDoExcluido.size) await relerKrisSemRiscoDepoisDaAcao();
  }

  // ---------------------------------------------------------------------------
  // FLUXO DE APROVAÇÃO ("Aprovação em 1 Clique")
  // ---------------------------------------------------------------------------
  /** 1º degrau: a 1ª Linha envia para validação da Coordenação-Geral. */
  async function submeterParaValidacaoCg(riscoId: string): Promise<void> {
    await executar(() => fonte().enviar(riscoId), () => [riscoId]);
  }

  /** A unidade assume o risco preliminar da CGOV (vira rascunho dela). */
  async function assumirRisco(riscoId: string): Promise<void> {
    await executar(() => fonte().assumir(riscoId), () => [riscoId]);
  }

  /** 2º degrau: valida em 1 clique (Crítico sobe para a Diretoria — quem decide é a fonte). */
  async function aprovarEmUmCliqueCg(riscoId: string, despachoOpcional?: string): Promise<void> {
    await executar(() => fonte().validar(riscoId, despachoOpcional), () => [riscoId]);
  }

  /** 3º degrau: a Diretoria homologa o Risco Crítico para o Plano de Gestão de Riscos. */
  async function homologarEmUmCliqueDiretoria(riscoId: string, despachoOpcional?: string): Promise<void> {
    await executar(() => fonte().homologar(riscoId, despachoOpcional), () => [riscoId]);
  }

  /** Devolução para ajuste (motivo obrigatório). */
  async function devolverRisco(riscoId: string, motivo: string): Promise<void> {
    await executar(() => fonte().devolver(riscoId, motivo), () => [riscoId]);
  }

  /** Nome antigo da devolução, mantido para as telas que já o usam. */
  function solicitarAjusteRapido(riscoId: string, despachoMotivo: string): Promise<void> {
    return devolverRisco(riscoId, despachoMotivo);
  }

  // ---------------------------------------------------------------------------
  // MONITORAMENTO CONTÍNUO (não reabre o risco aprovado)
  // ---------------------------------------------------------------------------
  async function registrarMedicaoKri(
    riscoId: string,
    kriId: string,
    medicao: NovaMedicaoKri
  ): Promise<void> {
    // Um KRI pode servir a vários riscos: relemos todos os ligados a ele, não só o informado.
    await executar(
      () => fonte().registrarMedicao(kriId, medicao),
      () => {
        const ligados = riscos.value.filter((r) => r.kris.some((k) => k.id === kriId)).map((r) => r.id);
        return [...new Set([riscoId, ...ligados])];
      }
    );
    // A leitura pode ter aberto um alerta (quem decide é o banco): atualiza a lista.
    await relerAlertasDepoisDaAcao();
  }

  async function atualizarStatusTratamento(
    riscoId: string,
    tratamentoId: string,
    novoStatus: RespostaTratamento5W2H['statusExecucao']
  ): Promise<void> {
    await executar(() => fonte().atualizarStatusTratamento(tratamentoId, novoStatus), () => [riscoId]);
  }

  // ---------------------------------------------------------------------------
  // PASSO 0 (CGOV): IMPORTAR A TABELA DA SKILL
  // ---------------------------------------------------------------------------
  /**
   * Lê a tabela Markdown da skill `cgov-gestao-riscos-v4` e grava cada linha
   * como risco PRELIMINAR da CGOV no objeto escolhido. Uma linha recusada não
   * impede as outras: o motivo vai para `erros`.
   * Ex.: { importados: 2, total: 3, avisos: [], erros: ['Linha 5 (RSC-03): Você não tem permissão…'], recusadas: [2] }
   *
   * `recusadas` são as posições (0 = 1ª linha) das linhas que o RADAR recusou.
   * Para tentar de novo SÓ essas (sem duplicar as que já entraram), a tela
   * chama outra vez passando `somenteLinhas`:
   *   await importarMarkdownDaSkill(md, 'obj-1', [2]);  // grava só a 3ª linha
   * Nesse caso `total` é o número de linhas tentadas (ex.: 1).
   */
  async function importarMarkdownDaSkill(
    markdown: string,
    objetoId: string,
    somenteLinhas?: number[]
  ): Promise<{ importados: number; total: number; avisos: string[]; erros: string[]; recusadas: number[] }> {
    // A criticidade (trava do "Aceitar" e aviso de KRI) usa o apetite ATUAL da DAR do RADAR.
    const lido = importarTabelaMarkdownSkill(markdown, apetitesDaDAR(categorias.value));
    if (lido.erros.length > 0) {
      return { importados: 0, total: lido.fichas.length, avisos: lido.avisos, erros: lido.erros, recusadas: [] };
    }

    // Quais linhas gravar: todas, ou só as pedidas (nova tentativa das recusadas).
    const alvo = [...lido.fichas.entries()].filter(([i]) => !somenteLinhas || somenteLinhas.includes(i));
    const erros: string[] = [];
    const recusadas: number[] = [];
    const novos: string[] = [];
    for (const [i, item] of alvo) {
      try {
        const { id } = await fonte().salvarFicha(fichaDaSkillParaSalvar(item, categorias.value, objetoId));
        novos.push(id);
      } catch (e) {
        // Número da linha no TEXTO colado (o mesmo das mensagens da prévia), não a posição entre as aceitas.
        erros.push(`Linha ${item.linhaTexto} (${item.codigoRadar}): ${comoErroRadar(e).message}`);
        recusadas.push(i);
      }
    }
    // Relê na ordem inversa: o primeiro da tabela fica no topo da lista.
    // (Releitura que falha não desfaz a importação: vira `avisoAtualizacao`.)
    await relerDepoisDaAcao([...novos].reverse());
    return { importados: novos.length, total: alvo.length, avisos: lido.avisos, erros, recusadas };
  }

  // ---------------------------------------------------------------------------
  // DAR (Declaração de Apetite a Riscos)
  // ---------------------------------------------------------------------------
  /**
   * A CGOV muda o apetite de uma categoria. A fonte recalcula a criticidade
   * de TODOS os riscos dela; a store relê os riscos da categoria.
   */
  async function alterarApetiteCategoriaDAR(categoriaId: number, novoApetite: ApetiteDeclarado): Promise<void> {
    await executar(
      async () => {
        await fonte().alterarApetite(categoriaId, novoApetite);
        // O apetite é dado de ENTRADA (o que a CGOV escolheu): copiamos para a memória.
        const cat = categorias.value.find((c) => c.id === categoriaId);
        if (cat) cat.apetiteDeclarado = novoApetite;
      },
      () => riscos.value.filter((r) => r.categoriaId === categoriaId).map((r) => r.id)
    );
  }

  async function atualizarJustificativaCategoriaDAR(categoriaId: number, novaJustificativa: string): Promise<void> {
    await executar(
      async () => {
        await fonte().alterarJustificativa(categoriaId, novaJustificativa);
        const cat = categorias.value.find((c) => c.id === categoriaId);
        if (cat) cat.justificativaDar = novaJustificativa;
      },
      () => []
    );
  }

  // ---------------------------------------------------------------------------
  // OBJETOS DE GESTÃO DE RISCOS
  // ---------------------------------------------------------------------------
  /** Cria (ou altera, com `id`) um objeto. Devolve o objeto como a fonte gravou. */
  async function salvarNovoObjetoContexto(parcial: Partial<ObjetoContexto>): Promise<ObjetoContexto> {
    try {
      const salvo = await fonte().salvarObjeto({
        ...parcial,
        nomeObjeto: parcial.nomeObjeto ?? 'Novo Objeto de Gestão de Riscos',
        unidadeId: parcial.unidadeId ?? unidadesAtivas.value[0]?.id ?? '',
      });
      const idx = objetosContexto.value.findIndex((o) => o.id === salvo.id);
      if (idx >= 0) objetosContexto.value[idx] = salvo;
      else objetosContexto.value.unshift(salvo);
      return salvo;
    } catch (e) {
      throw comoErroRadar(e);
    }
  }

  /**
   * Só CGOV: leva um objeto (e os riscos dele) para outra unidade ativa.
   * Depois, a unidade do objeto é atualizada na memória e os riscos dele relidos.
   */
  async function reatribuirObjeto(objetoId: string, novaUnidadeId: string): Promise<void> {
    await executar(
      async () => {
        await fonte().reatribuirObjeto(objetoId, novaUnidadeId);
        const obj = objetosContexto.value.find((o) => o.id === objetoId);
        if (obj) {
          obj.unidadeId = novaUnidadeId;
          obj.unidadeAtiva = unidades.value.find((u) => u.id === novaUnidadeId)?.ativa ?? true;
        }
      },
      () => riscos.value.filter((r) => r.objetoId === objetoId).map((r) => r.id)
    );
  }

  // ---------------------------------------------------------------------------
  // LEITURAS QUE SÓ REPASSAM À FONTE
  // ---------------------------------------------------------------------------
  /** Ids dos objetos em que a pessoa pode criar risco (seletor do "Novo risco"). */
  async function objetosOndeGravo(): Promise<string[]> {
    try {
      return await fonte().objetosOndeGravo();
    } catch (e) {
      throw comoErroRadar(e);
    }
  }

  /** Uma página da trilha de auditoria (50 por vez, do mais novo para o mais antigo). */
  async function lerAuditoria(f: FiltrosAuditoria): Promise<EventoAuditoria[]> {
    try {
      return await fonte().lerAuditoria(f);
    } catch (e) {
      throw comoErroRadar(e);
    }
  }

  /** Os `n` passos mais recentes do fluxo (cartão "Atividade recente" do Painel). */
  async function lerAtividadeRecente(n: number): Promise<EventoFluxo[]> {
    try {
      return await fonte().lerAtividadeRecente(n);
    } catch (e) {
      throw comoErroRadar(e);
    }
  }

  // ---------------------------------------------------------------------------
  // FILTROS DO PAINEL (só memória, não vão à fonte)
  // ---------------------------------------------------------------------------
  function alternarFiltroCelulaMatriz(p: NivelProbabilidade, i: NivelImpacto): void {
    if (
      celulaMatrizSelecionada.value &&
      celulaMatrizSelecionada.value.p === p &&
      celulaMatrizSelecionada.value.i === i
    ) {
      celulaMatrizSelecionada.value = null;
    } else {
      celulaMatrizSelecionada.value = { p, i };
    }
  }

  function limparFiltrosPainel(): void {
    termoBuscaGlobal.value = '';
    celulaMatrizSelecionada.value = null;
    categoriaFiltroId.value = null;
  }

  return {
    // dados
    riscos,
    categorias,
    unidades,
    unidadesAtivas,
    objetosContexto,
    processos,
    acoes,
    alertasKri,
    krisSemRisco,
    estado,
    erro,
    avisoAtualizacao,
    // filtros
    termoBuscaGlobal,
    celulaMatrizSelecionada,
    categoriaFiltroId,
    // getters
    riscosFiltrados,
    riscosCriticosCarteira,
    filaValidacaoCg,
    filaHomologacaoDiretoria,
    filaSemDecisor,
    trilhaAuditoriaGlobal,
    resumoPorClasse,
    obterRiscoPorId,
    obterApetitePorCategoria,
    alertaAbertoDoKri,
    // ciclo de vida
    carregar,
    tentarDeNovo,
    limpar,
    relerRiscos,
    // ações
    salvarOuAtualizarRisco,
    krisDoObjeto,
    reavaliarPontuacaoRiscoAprovado,
    excluirRisco,
    submeterParaValidacaoCg,
    assumirRisco,
    aprovarEmUmCliqueCg,
    homologarEmUmCliqueDiretoria,
    devolverRisco,
    solicitarAjusteRapido,
    registrarMedicaoKri,
    atualizarStatusTratamento,
    importarMarkdownDaSkill,
    alterarApetiteCategoriaDAR,
    atualizarJustificativaCategoriaDAR,
    salvarNovoObjetoContexto,
    reatribuirObjeto,
    // leituras repassadas
    objetosOndeGravo,
    lerAuditoria,
    lerAtividadeRecente,
    // filtros do painel
    alternarFiltroCelulaMatriz,
    limparFiltrosPainel,
  };
});
