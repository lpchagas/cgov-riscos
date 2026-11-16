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
 * As gravações (salvar, enviar, validar...) chegam na Task 7: por ora rejeitam
 * com "não implementado (Task 7)".
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
  categoriaDoBanco,
  eventoAuditoriaDoBanco,
  eventoFluxoDoBanco,
  objetoDoBanco,
  processoDoBanco,
  riscoDoBanco,
  unidadeDoBanco,
  type LinhaBanco,
} from './conversores';
import { traduzirErroBanco } from './errosBanco';
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

/** Gravação ainda não disponível (chega na Task 7). */
const naoImplementado = (): Promise<never> => Promise.reject(new Error('não implementado (Task 7)'));

export function criarFonteSupabase(cliente: SupabaseClient): FonteDados {
  /** Lê uma tabela inteira, paginada, com a ordem pedida (sempre terminando em `id`). */
  const lerTabela = (tabela: string, ordem: string[] = ['id']) =>
    lerTodasAsPaginas<LinhaBanco>((ini, fim) => {
      let q = cliente.from(tabela).select('*');
      for (const col of ordem) q = q.order(col, { ascending: true });
      return q.range(ini, fim);
    });

  /** Lê as linhas de uma tabela filha de UM risco ou de um conjunto de ids (em lotes). */
  const lerFilhosPorIds = (tabela: string, coluna: string, ids: string[]) =>
    emLotes(ids, 200, (lote) =>
      lerTodasAsPaginas<LinhaBanco>((ini, fim) =>
        cliente.from(tabela).select('*').in(coluna, lote).order('id', { ascending: true }).range(ini, fim),
      ),
    );

  /** Monta a ficha de um risco a partir das linhas já lidas. */
  function montarRisco(
    l: LinhaBanco,
    apoio: {
      objetos: Map<string, ObjetoContexto>;
      categorias: Map<number, ReturnType<typeof categoriaDoBanco>>;
      controles: Map<string, LinhaBanco[]>;
      respostas: Map<string, LinhaBanco[]>;
      kris: Map<string, LinhaBanco[]>;
      medicoesPorKri: Map<string, LinhaBanco[]>;
      historico: Map<string, LinhaBanco[]>;
    },
  ): FichaRisco {
    const id = String(l.id);
    const kris = apoio.kris.get(id) ?? [];
    // Medições dos KRIs deste risco (a tabela de medições só tem `kri_id`).
    const medicoes = kris.flatMap((k) => apoio.medicoesPorKri.get(String(k.id)) ?? []);
    return riscoDoBanco(l, {
      objeto: apoio.objetos.get(String(l.objeto_id)) ?? null,
      categoria: apoio.categorias.get(Number(l.categoria_id)) ?? null,
      controles: apoio.controles.get(id),
      respostas: apoio.respostas.get(id),
      kris,
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

  return {
    async carregarCarteira(): Promise<Carteira> {
      const [catL, uniL, procL, objL, risL, conL, resL, kriL, medL, hisL] = await Promise.all([
        lerTabela('categorias_risco'),
        lerTabela('unidades'),
        lerTabela('processos_cadeia_valor'),
        lerTabela('objetos_contexto'),
        lerTabela('riscos'),
        lerTabela('controles_existentes'),
        lerTabela('respostas_tratamento'),
        lerTabela('indicadores_kri'),
        lerTabela('medicoes_kri'),
        lerTabela('historico_fluxo'),
      ]);
      const categorias = catL.map(categoriaDoBanco);
      const unidades = uniL.map(unidadeDoBanco);
      const processos = procL.map(processoDoBanco);
      const objetos = montarObjetos(objL, processos, unidades);
      const apoio = {
        objetos: new Map(objetos.map((o) => [o.id, o])),
        categorias: new Map(categorias.map((c) => [c.id, c])),
        controles: agruparPor(conL, 'risco_id'),
        respostas: agruparPor(resL, 'risco_id'),
        kris: agruparPor(kriL, 'risco_id'),
        medicoesPorKri: agruparPor(medL, 'kri_id'),
        historico: agruparPor(hisL, 'risco_id'),
      };
      const riscos = risL.map((l) => montarRisco(l, apoio));
      return { riscos, objetos, categorias, unidades, processos };
    },

    async relerRisco(id: string): Promise<FichaRisco | null> {
      // `maybeSingle`: 0 linhas = null (não existe OU a RLS escondeu; não distinguimos).
      const { data, error } = await cliente.from('riscos').select('*').eq('id', id).maybeSingle();
      if (error) throw traduzirErroBanco(error);
      if (!data) return null;
      const risco = data as LinhaBanco;
      const [con, res, kri, his, cat, obj] = await Promise.all([
        lerFilhosPorIds('controles_existentes', 'risco_id', [id]),
        lerFilhosPorIds('respostas_tratamento', 'risco_id', [id]),
        lerFilhosPorIds('indicadores_kri', 'risco_id', [id]),
        lerFilhosPorIds('historico_fluxo', 'risco_id', [id]),
        cliente.from('categorias_risco').select('*').eq('id', risco.categoria_id).maybeSingle(),
        cliente.from('objetos_contexto').select('*').eq('id', risco.objeto_id).maybeSingle(),
      ]);
      if (cat.error) throw traduzirErroBanco(cat.error);
      if (obj.error) throw traduzirErroBanco(obj.error);
      const med = await lerFilhosPorIds('medicoes_kri', 'kri_id', kri.map((k) => String(k.id)));
      // Unidade e processo do objeto (para as marcas "inativo").
      let objeto: ObjetoContexto | null = null;
      if (obj.data) {
        const o = obj.data as LinhaBanco;
        const [uni, proc] = await Promise.all([
          cliente.from('unidades').select('*').eq('id', o.unidade_id).maybeSingle(),
          o.processo_id
            ? cliente.from('processos_cadeia_valor').select('*').eq('id', o.processo_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (uni.error) throw traduzirErroBanco(uni.error);
        if (proc.error) throw traduzirErroBanco(proc.error);
        objeto = objetoDoBanco(o, {
          unidade: uni.data ? unidadeDoBanco(uni.data as LinhaBanco) : null,
          processo: proc.data ? processoDoBanco(proc.data as LinhaBanco) : null,
        });
      }
      return riscoDoBanco(risco, {
        objeto,
        categoria: cat.data ? categoriaDoBanco(cat.data as LinhaBanco) : null,
        controles: con,
        respostas: res,
        kris: kri,
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

    salvarFicha: naoImplementado,
    excluirRisco: naoImplementado,
    enviar: naoImplementado,
    assumir: naoImplementado,
    validar: naoImplementado,
    homologar: naoImplementado,
    devolver: naoImplementado,
    registrarMedicao: naoImplementado,
    atualizarStatusTratamento: naoImplementado,
    salvarObjeto: naoImplementado,
    reatribuirObjeto: naoImplementado,
    alterarApetite: naoImplementado,
    alterarJustificativa: naoImplementado,
  };
}
