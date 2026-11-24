/**
 * ============================================================================
 * FONTE DE DADOS DO SUPABASE — LEITURAS (`src/services/dados/fonteSupabase.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES):
 * No modo real, a store pede os dados a esta fonte. Ela conversa com o banco
 * (Supabase) usando o login da pessoa; por isso o banco (RLS) já entrega só o
 * que a pessoa pode ver. Aqui não filtramos nada por perfil: confiamos no banco.
 *
 * Três cuidados importantes:
 *   1. PAGINAÇÃO: o servidor devolve no máximo 1.000 linhas por pedido. Toda
 *      lista é lida com `lerTodasAsPaginas` (ordem terminando em `id`).
 *   2. SEM "RECURSO EMBUTIDO": não pedimos `riscos(*, controles(*))` de uma vez,
 *      pois os filhos embutidos não são paginados. Lemos cada tabela separada
 *      e juntamos aqui (agrupando por `risco_id`).
 *   3. ERROS: qualquer falha vira `ErroRadar` (mensagem segura para a tela).
 *
 * GRAVAÇÕES (Task 7): a ficha vai inteira para a função `salvar_ficha_risco`
 * (um comando só: risco + controles + respostas + KRIs); as ações do fluxo são
 * as funções do banco de mesmo nome (enviar_para_validacao, validar_risco...).
 * O front NUNCA manda valores calculados nem muda o `status_fluxo` direto.
 *
 * Exemplo:
 *   const fonte = criarFonteSupabase(supabaseClient!);
 *   const { riscos } = await fonte.carregarCarteira();
 * ============================================================================
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FichaRisco, ObjetoContexto, ProcessoCadeiaValor, UnidadeOrganizacional } from '../../types/radar.types';
import {
  acoesDoBanco,
  alertaKriDoBanco,
  categoriaDoBanco,
  eventoAuditoriaDoBanco,
  eventoFluxoDoBanco,
  fichaParaJson,
  kriSemRiscoDoBanco,
  objetoDoBanco,
  processoDoBanco,
  riscoDoBanco,
  unidadeDoBanco,
  type LinhaBanco,
} from './conversores';
import { numeroDaLeitura } from '../../utils/limiteAlerta';
import { ErroRadar, traduzirErroBanco } from './errosBanco';
import { emLotes, lerTodasAsPaginas } from './paginacao';
import type { Carteira, FonteDados } from './tipos';

/** Máximo de ids por chamada de `acoes_no_fluxo` (limite da função no banco). */
const LOTE_ACOES = 1000;
/** Limite padrão de linhas por página da Auditoria. */
const LIMITE_AUDITORIA = 50;

/** Agrupa linhas por uma coluna. Ex.: controles agrupados por `risco_id`. */
function agruparPor(linhas: LinhaBanco[], coluna: string): Map<string, LinhaBanco[]> {
  const mapa = new Map<string, LinhaBanco[]>();
  for (const l of linhas) {
    const chave = String(l[coluna]);
    const lista = mapa.get(chave);
    if (lista) lista.push(l);
    else mapa.set(chave, [l]);
  }
  return mapa;
}

/**
 * Confere a resposta de uma chamada ao banco: se veio erro, lança o
 * `ErroRadar` já traduzido; senão devolve os dados.
 * Ex.: const linhas = conferir(await cliente.from('x').delete().eq('id', id).select('id'));
 */
function conferir<T>(resposta: { data: T; error: unknown }): T {
  if (resposta.error) throw traduzirErroBanco(resposta.error);
  return resposta.data;
}

/**
 * Lança `ErroRadar` quando um UPDATE/DELETE não alcançou nenhuma linha.
 *
 * Por quê? A RLS NÃO dá erro quando barra um UPDATE ou DELETE: ela apenas
 * "não acha" a linha, e o banco responde "deu certo, 0 linhas". Sem esta
 * conferência a tela diria "salvo!" sem nada ter sido gravado.
 */
function exigirLinhas(linhas: unknown[] | null, mensagem: string, tipo: ErroRadar['tipo']): void {
  if (!linhas || linhas.length === 0) throw new ErroRadar(mensagem, tipo);
}

/**
 * `ObjetoContexto` (camelCase) -> colunas de `objetos_contexto`, só com os
 * campos PRESENTES (undefined = não mexer).
 *
 * Regra do supervisor (`macroprocesso_supervisor_id`, migração 20261116002):
 *   - COM processo vinculado: o banco preenche o supervisor a partir do
 *     processo → NÃO mandamos (seria ignorado, e só confundiria).
 *   - SEM processo: mandamos o valor da tela; o banco aceita só da CGOV (para
 *     os demais, mudar o supervisor dá erro claro de permissão).
 * Ex.: { nomeObjeto: 'X', unidadeId: 'u1', processoId: 'p1', macroprocessoSupervisorId: 'u9' }
 *   -> { nome_objeto: 'X', unidade_id: 'u1', processo_id: 'p1' }   (sem supervisor)
 */
function objetoParaBanco(o: Partial<ObjetoContexto>): Record<string, unknown> {
  const linha: Record<string, unknown> = {};
  const copiar = (coluna: string, valor: unknown) => {
    if (valor !== undefined) linha[coluna] = valor;
  };
  copiar('tipo_objeto', o.tipoObjeto);
  copiar('nome_objeto', o.nomeObjeto);
  copiar('unidade_id', o.unidadeId);
  copiar('diretoria_id', o.diretoriaId);
  copiar('processo_id', o.processoId);
  if (!o.processoId) copiar('macroprocesso_supervisor_id', o.macroprocessoSupervisorId);
  copiar('objetivo_estrategico_associado', o.objetivoEstrategicoAssociado);
  copiar('insumos_principais', o.insumosPrincipais);
  copiar('entregas_principais', o.entregasPrincipais);
  copiar('partes_interessadas', o.partesInteressadas);
  copiar('ciclo_ano', o.cicloAno);
  // Nunca vão: id (vai no filtro), processoNome/processoAtivo/unidadeAtiva (só leitura).
  return linha;
}

export function criarFonteSupabase(cliente: SupabaseClient): FonteDados {
  /** Lê uma tabela inteira, paginada, com a ordem pedida (sempre terminando em `id`). */
  const lerTabela = (tabela: string, ordem: string[] = ['id']) =>
    lerTodasAsPaginas<LinhaBanco>((ini, fim) => {
      let q = cliente.from(tabela).select('*');
      for (const col of ordem) q = q.order(col, { ascending: true });
      return q.range(ini, fim);
    });

  /** Lê as linhas de uma tabela filha de UM risco ou de um conjunto de ids (em lotes). */
  const lerFilhosPorIds = (tabela: string, coluna: string, ids: string[], ordem: string[] = ['id']) =>
    emLotes(ids, 200, (lote) =>
      lerTodasAsPaginas<LinhaBanco>((ini, fim) => {
        let q = cliente.from(tabela).select('*').in(coluna, lote);
        for (const col of ordem) q = q.order(col, { ascending: true });
        return q.range(ini, fim);
      }),
    );

  /**
   * Quantos riscos cada KRI serve DE VERDADE (função `kri_total_riscos` do
   * banco). A leitura comum de `kri_riscos` passa pela RLS e só mostra as
   * ligações dos riscos que a pessoa vê; o total vem da função, que só
   * responde pelos KRIs que a pessoa já lê.
   * Ex.: totaisDosKris(['k1']) → Map { 'k1' => 3 }
   */
  async function totaisDosKris(ids: string[]): Promise<Map<string, number>> {
    const linhas = await emLotes(ids, LOTE_ACOES, async (lote) => {
      const { data, error } = await cliente.rpc('kri_total_riscos', { p_kris: lote });
      if (error) throw traduzirErroBanco(error);
      return (data ?? []) as LinhaBanco[];
    });
    return new Map(linhas.map((l) => [String(l.kri_id), Number(l.total)]));
  }

  /** Monta a ficha de um risco a partir das linhas já lidas. */
  function montarRisco(
    l: LinhaBanco,
    apoio: {
      objetos: Map<string, ObjetoContexto>;
      categorias: Map<number, ReturnType<typeof categoriaDoBanco>>;
      controles: Map<string, LinhaBanco[]>;
      respostas: Map<string, LinhaBanco[]>;
      /** Todos os KRIs lidos (o risco só mostra os ligados a ele, via `kriRiscos`). */
      kris: LinhaBanco[];
      kriRiscos: LinhaBanco[];
      /** Total real de riscos de cada KRI (inclui os que a pessoa não vê). */
      totaisKri: Map<string, number>;
      medicoesPorKri: Map<string, LinhaBanco[]>;
      historico: Map<string, LinhaBanco[]>;
    },
  ): FichaRisco {
    const id = String(l.id);
    // KRIs ligados a este risco (LAC-03: ligação N:N em `kri_riscos`).
    const idsLigados = new Set(apoio.kriRiscos.filter((x) => String(x.risco_id) === id).map((x) => String(x.kri_id)));
    const kris = apoio.kris.filter((k) => idsLigados.has(String(k.id)));
    // Medições dos KRIs deste risco (a tabela de medições só tem `kri_id`).
    const medicoes = kris.flatMap((k) => apoio.medicoesPorKri.get(String(k.id)) ?? []);
    return riscoDoBanco(l, {
      objeto: apoio.objetos.get(String(l.objeto_id)) ?? null,
      categoria: apoio.categorias.get(Number(l.categoria_id)) ?? null,
      controles: apoio.controles.get(id),
      respostas: apoio.respostas.get(id),
      kris,
      kriRiscos: apoio.kriRiscos,
      totaisKri: apoio.totaisKri,
      medicoes,
      historico: apoio.historico.get(id),
    });
  }

  /** Converte objetos ligando cada um ao seu processo e à sua unidade. */
  function montarObjetos(linhas: LinhaBanco[], processos: ProcessoCadeiaValor[], unidades: UnidadeOrganizacional[]) {
    const porProcesso = new Map(processos.map((p) => [p.id, p]));
    const porUnidade = new Map(unidades.map((u) => [u.id, u]));
    return linhas.map((l) =>
      objetoDoBanco(l, {
        processo: l.processo_id ? porProcesso.get(String(l.processo_id)) : null,
        unidade: porUnidade.get(String(l.unidade_id)),
      }),
    );
  }

  /** Uma linha de `objetos_contexto` -> `ObjetoContexto`, lendo a unidade e o processo dela. */
  async function completarObjeto(o: LinhaBanco): Promise<ObjetoContexto> {
    const [uni, proc] = await Promise.all([
      cliente.from('unidades').select('*').eq('id', o.unidade_id).maybeSingle(),
      o.processo_id
        ? cliente.from('processos_cadeia_valor').select('*').eq('id', o.processo_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (uni.error) throw traduzirErroBanco(uni.error);
    if (proc.error) throw traduzirErroBanco(proc.error);
    return objetoDoBanco(o, {
      unidade: uni.data ? unidadeDoBanco(uni.data as LinhaBanco) : null,
      processo: proc.data ? processoDoBanco(proc.data as LinhaBanco) : null,
    });
  }

  /**
   * Chama uma função do fluxo no banco e só confere o erro.
   * Ex.: acaoDoFluxo('validar_risco', { risco: id, parecer: 'De acordo.' })
   */
  async function acaoDoFluxo(funcao: string, parametros: Record<string, unknown>): Promise<void> {
    conferir(await cliente.rpc(funcao, parametros));
  }

  return {
    async carregarCarteira(): Promise<Carteira> {
      const [catL, uniL, procL, objL, risL, conL, resL, kriL, kriRiscosL, medL, hisL] = await Promise.all([
        lerTabela('categorias_risco'),
        lerTabela('unidades'),
        lerTabela('processos_cadeia_valor'),
        lerTabela('objetos_contexto'),
        lerTabela('riscos'),
        lerTabela('controles_existentes'),
        lerTabela('respostas_tratamento'),
        lerTabela('indicadores_kri'),
        // `kri_riscos` não tem coluna `id`: a ordem estável é pela chave composta.
        lerTabela('kri_riscos', ['kri_id', 'risco_id']),
        lerTabela('medicoes_kri'),
        lerTabela('historico_fluxo'),
      ]);
      // Depois de saber quais KRIs a pessoa lê, pedimos o total real de riscos de cada um.
      const totaisKri = await totaisDosKris(kriL.map((k) => String(k.id)));
      const categorias = catL.map(categoriaDoBanco);
      const unidades = uniL.map(unidadeDoBanco);
      const processos = procL.map(processoDoBanco);
      const objetos = montarObjetos(objL, processos, unidades);
      const apoio = {
        objetos: new Map(objetos.map((o) => [o.id, o])),
        categorias: new Map(categorias.map((c) => [c.id, c])),
        controles: agruparPor(conL, 'risco_id'),
        respostas: agruparPor(resL, 'risco_id'),
        kris: kriL,
        kriRiscos: kriRiscosL,
        totaisKri,
        medicoesPorKri: agruparPor(medL, 'kri_id'),
        historico: agruparPor(hisL, 'risco_id'),
      };
      const riscos = risL.map((l) => montarRisco(l, apoio));
      // KRIs sem nenhuma ligação à vista (P-02): o Monitoramento mostra os que têm alerta.
      const ligados = new Set(kriRiscosL.map((x) => String(x.kri_id)));
      const krisSemRisco = kriL
        .filter((k) => !ligados.has(String(k.id)))
        .map((k) => kriSemRiscoDoBanco(k, medL, totaisKri.get(String(k.id))));
      return { riscos, objetos, categorias, unidades, processos, krisSemRisco };
    },

    async relerRisco(id: string): Promise<FichaRisco | null> {
      // `maybeSingle`: 0 linhas = null (não existe OU a RLS escondeu; não distinguimos).
      const { data, error } = await cliente.from('riscos').select('*').eq('id', id).maybeSingle();
      if (error) throw traduzirErroBanco(error);
      if (!data) return null;
      const risco = data as LinhaBanco;
      const [con, res, ligacoesDoRisco, his, cat, obj] = await Promise.all([
        lerFilhosPorIds('controles_existentes', 'risco_id', [id]),
        lerFilhosPorIds('respostas_tratamento', 'risco_id', [id]),
        lerFilhosPorIds('kri_riscos', 'risco_id', [id], ['kri_id']),
        lerFilhosPorIds('historico_fluxo', 'risco_id', [id]),
        cliente.from('categorias_risco').select('*').eq('id', risco.categoria_id).maybeSingle(),
        cliente.from('objetos_contexto').select('*').eq('id', risco.objeto_id).maybeSingle(),
      ]);
      if (cat.error) throw traduzirErroBanco(cat.error);
      if (obj.error) throw traduzirErroBanco(obj.error);
      // KRIs ligados a este risco; depois as ligações desses KRIs que a pessoa vê (`riscoIds`),
      // o total real de riscos de cada um (`totalRiscos`) e as medições deles.
      const idsKri = ligacoesDoRisco.map((x) => String(x.kri_id));
      const [kri, kriRiscos, med, totaisKri] = await Promise.all([
        lerFilhosPorIds('indicadores_kri', 'id', idsKri),
        lerFilhosPorIds('kri_riscos', 'kri_id', idsKri, ['kri_id', 'risco_id']),
        lerFilhosPorIds('medicoes_kri', 'kri_id', idsKri),
        totaisDosKris(idsKri),
      ]);
      // Unidade e processo do objeto (para as marcas "inativo").
      const objeto = obj.data ? await completarObjeto(obj.data as LinhaBanco) : null;
      return riscoDoBanco(risco, {
        objeto,
        categoria: cat.data ? categoriaDoBanco(cat.data as LinhaBanco) : null,
        controles: con,
        respostas: res,
        kris: kri,
        kriRiscos,
        totaisKri,
        medicoes: med,
        historico: his,
      });
    },

    async acoesNoFluxo(ids) {
      // Lotes de 1.000 ids: 2.100 ids = 3 chamadas da função do banco.
      const linhas = await emLotes(ids, LOTE_ACOES, async (lote) => {
        const { data, error } = await cliente.rpc('acoes_no_fluxo', { riscos: lote });
        if (error) throw traduzirErroBanco(error);
        return (data ?? []) as LinhaBanco[];
      });
      return linhas.map(acoesDoBanco);
    },

    async objetosOndeGravo() {
      const { data, error } = await cliente.rpc('objetos_onde_gravo');
      if (error) throw traduzirErroBanco(error);
      // A função devolve "setof uuid": a lista chega como texto ou como { objetos_onde_gravo: id }.
      return ((data ?? []) as unknown[]).map((v) =>
        typeof v === 'object' && v !== null ? String(Object.values(v)[0]) : String(v),
      );
    },

    async lerAuditoria(f, limite = LIMITE_AUDITORIA) {
      const { data, error } = await cliente.rpc('ler_auditoria', {
        p_de: f.de ?? null,
        p_ate: f.ate ?? null,
        p_tabela: f.tabela ?? null,
        p_antes_em: f.antesDe?.em ?? null,
        p_antes_id: f.antesDe?.id ?? null,
        p_limite: limite,
      });
      if (error) throw traduzirErroBanco(error);
      return ((data ?? []) as LinhaBanco[]).map(eventoAuditoriaDoBanco);
    },

    async lerAtividadeRecente(n) {
      // Mais recentes primeiro; `id` desempata linhas com o mesmo instante.
      const { data, error } = await cliente
        .from('historico_fluxo')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })
        .limit(n);
      if (error) throw traduzirErroBanco(error);
      const linhas = (data ?? []) as LinhaBanco[];
      // O código RADAR vem da tabela de riscos (uma leitura só, por lotes).
      const riscoIds = [...new Set(linhas.map((l) => String(l.risco_id)))];
      const riscos = await lerFilhosPorIds('riscos', 'id', riscoIds);
      const codigos = new Map(riscos.map((r) => [String(r.id), String(r.codigo_radar)]));
      return linhas.flatMap((l) => {
        const codigo = codigos.get(String(l.risco_id));
        return codigo ? [eventoFluxoDoBanco(l, codigo)] : [];
      });
    },

    // -----------------------------------------------------------------------
    // GRAVAÇÕES (Task 7)
    // -----------------------------------------------------------------------

    /**
     * Grava a ficha inteira num comando só (função `salvar_ficha_risco`).
     * Sem `id` = cria (o banco gera o código RADAR-<ano>-<NNN>); com `id` =
     * altera. Se a alteração mexer na avaliação de um risco aprovado, o
     * próprio banco o reabre para validação.
     * Ex.: await fonte.salvarFicha({ objetoId, causas, ..., probabilidade: 3 })
     *   -> { id: '…', codigoRadar: 'RADAR-2026-012' }
     */
    async salvarFicha(f) {
      const linhas = conferir(await cliente.rpc('salvar_ficha_risco', { ficha: fichaParaJson(f) })) as
        | LinhaBanco[]
        | null;
      const linha = linhas?.[0];
      if (!linha) throw new ErroRadar('Não foi possível confirmar a gravação da ficha. Atualize a página.', 'desconhecido');
      return { id: String(linha.id), codigoRadar: String(linha.codigo_radar) };
    },

    /**
     * Exclui o risco. A regra D2 fica no banco: aprovado ou em validação dá
     * erro claro ("faz parte do Plano de Gestão de Riscos", "está travada").
     * 0 linhas apagadas = não existe ou está fora do alcance → "não encontrado".
     */
    async excluirRisco(id) {
      const apagadas = conferir(await cliente.from('riscos').delete().eq('id', id).select('id'));
      exigirLinhas(apagadas, 'Risco não encontrado.', 'nao_encontrado');
    },

    // Fluxo de aprovação: cada botão chama a função de mesmo papel no banco,
    // que confere QUEM pode e em que ESTADO (aqui não decidimos nada).
    async enviar(id) {
      await acaoDoFluxo('enviar_para_validacao', { risco: id });
    },
    async assumir(id) {
      await acaoDoFluxo('assumir_risco_preliminar', { risco: id });
    },
    async validar(id, parecer) {
      await acaoDoFluxo('validar_risco', { risco: id, parecer: parecer ?? null });
    },
    async homologar(id, parecer) {
      await acaoDoFluxo('homologar_risco', { risco: id, parecer: parecer ?? null });
    },
    async devolver(id, motivo) {
      // Motivo vazio: quem recusa é o banco ("informe o motivo da devolução").
      await acaoDoFluxo('devolver_risco', { risco: id, motivo });
    },

    /** Monitoramento: nova medição do KRI (não reabre o risco aprovado). */
    async registrarMedicao(kriId, m) {
      conferir(
        await cliente.from('medicoes_kri').insert({
          kri_id: kriId,
          data_medicao: m.dataMedicao,
          valor_apurado: m.valorApurado,
          // LAC-03: o número da leitura (a vírgula decimal vale: '65,5%' -> 65.5). NÃO mandamos
          // `em_alerta`: o gatilho do banco compara com o limite do KRI e abre o alerta.
          valor_numerico: m.valorNumerico ?? numeroDaLeitura(m.valorApurado) ?? null,
          observacao: m.observacao ?? null,
        }),
      );
    },

    /** Alertas dos KRIs (visão com prazos em dias úteis; a RLS já limita ao alcance da pessoa). */
    async listarAlertasKri() {
      const linhas = await lerTabela('alertas_kri_situacao', ['ciencia_em', 'id']);
      return linhas.map(alertaKriDoBanco);
    },

    /** Monitoramento: andamento da ação 5W2H (mudar só o status não reabre o risco). */
    async atualizarStatusTratamento(respostaId, status) {
      const linhas = conferir(
        await cliente.from('respostas_tratamento').update({ status_execucao: status }).eq('id', respostaId).select('id'),
      );
      exigirLinhas(linhas, 'Ação de tratamento não encontrada.', 'nao_encontrado');
    },

    /**
     * Cria (sem `id`) ou altera (com `id`) um objeto de gestão de riscos e
     * devolve o objeto como ficou NO BANCO (com o supervisor que o banco
     * preencheu e as marcas de unidade/processo inativos).
     */
    async salvarObjeto(o) {
      const linha = objetoParaBanco(o);
      const resposta = o.id
        ? await cliente.from('objetos_contexto').update(linha).eq('id', o.id).select('*')
        : await cliente.from('objetos_contexto').insert(linha).select('*');
      const linhas = conferir(resposta) as LinhaBanco[] | null;
      exigirLinhas(linhas, 'Objeto não encontrado ou fora do seu alcance. Atualize a página.', 'nao_encontrado');
      return completarObjeto(linhas![0]);
    },

    /** Só a CGOV, só objeto de unidade inativa (regras na função do banco). */
    async reatribuirObjeto(objetoId, novaUnidadeId) {
      conferir(await cliente.rpc('reatribuir_objeto', { objeto: objetoId, nova_unidade: novaUnidadeId }));
    },

    /**
     * DAR: muda o apetite da categoria. O BANCO recalcula a criticidade dos
     * riscos aprovados dela (e devolve à homologação os que viraram Crítico).
     * Quem não é CGOV: a RLS barra em silêncio (0 linhas) → erro de permissão.
     */
    async alterarApetite(categoriaId, apetite) {
      const linhas = conferir(
        await cliente.from('categorias_risco').update({ apetite_declarado: apetite }).eq('id', categoriaId).select('id'),
      );
      exigirLinhas(linhas, 'Só a CGOV altera a Declaração de Apetite a Riscos (DAR).', 'permissao');
    },

    async alterarJustificativa(categoriaId, texto) {
      const linhas = conferir(
        await cliente.from('categorias_risco').update({ justificativa_dar: texto }).eq('id', categoriaId).select('id'),
      );
      exigirLinhas(linhas, 'Só a CGOV altera a Declaração de Apetite a Riscos (DAR).', 'permissao');
    },
  };
}
