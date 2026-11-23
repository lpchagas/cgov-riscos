/**
 * INTEGRAÇÃO: FONTE SUPABASE — GRAVAÇÕES E FLUXO (Etapa B3, Tarefa 7)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Prova, contra o Supabase local de verdade e com pessoas da semente, que a
 * fonte de dados grava pelas funções do banco (salvar_ficha_risco, enviar,
 * validar, homologar, devolver, assumir...) e que TODA recusa chega à tela
 * como `ErroRadar` em português (nunca "row-level", nunca "violates").
 *
 * Quem faz o quê na semente (ver supabase/tests/050_fluxo.test.sql):
 *   FLONA de Caçador (objeto ...b000-000000000001): grava gestor.uc@,
 *   valida ct@ (CT Curitiba) e homologa gr@ (GR5).
 *
 * COMO A SUÍTE CONTINUA "REPETÍVEL" (pode rodar quantas vezes quiser):
 *   - cada teste cria os PRÓPRIOS riscos (com `salvarFicha`) e anota o id;
 *   - no `afterEach`, `apagarRiscosDeTeste` apaga esses riscos como
 *     administrador (único jeito de apagar risco aprovado: ver ajudantes.ts);
 *   - objetos criados pelo teste são apagados com o cliente de serviço;
 *   - a DAR (apetite e justificativa da categoria 2) volta ao valor original.
 *   Rastro que fica, de propósito: linhas na trilha de auditoria e a
 *   numeração RADAR-<ano>-<NNN> (a sequência não volta atrás).
 *
 * Pré-requisito: `npm run db:reset` (semente), `npm run db:start` e
 * `npm run db:funcoes` (outro terminal).
 * ============================================================================
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fichaParaSalvarDeRisco } from '../../src/services/dados/conversores';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import { criarFonteSupabase } from '../../src/services/dados/fonteSupabase';
import type { FichaParaSalvar, FonteDados } from '../../src/services/dados/tipos';
import { apagarRiscosDeTeste, clienteServico, entrarComo, garantirSupabaseNoAr } from './ajudantes';

/** Objeto da semente na FLONA de Caçador (UC com CT). */
const OBJ_UC_CT = '00000000-0000-4000-b000-000000000001';
/** Categoria 2 = Operacional (apetite "moderado" na semente). */
const CAT_OPERACIONAL = 2;
/** Categoria 4 = Legal (apetite "baixo" na semente; a 7, Socioambiental, saiu com o Quadro 2). */
const CAT_LEGAL = 4;

/** Riscos e objetos criados pelo teste da vez (apagados no afterEach). */
const riscosCriados: string[] = [];
const objetosCriados: string[] = [];
/** Toda mensagem de erro vista na suíte (conferida no fim: nada técnico). */
const mensagensVistas: string[] = [];
/** DAR original da categoria 2 (para devolver depois do teste da DAR). */
let darOriginal: { apetite_declarado: string; justificativa_dar: string | null };

/** Uma fonte logada como `email` (as chamadas passam pelo RLS dessa pessoa). */
async function fonteDe(email: string): Promise<FonteDados> {
  return criarFonteSupabase(await entrarComo(email));
}

/** Ficha mínima válida; `extra` troca o que o teste precisar. */
function ficha(extra: Partial<FichaParaSalvar> = {}): FichaParaSalvar {
  return {
    objetoId: OBJ_UC_CT,
    responsavelRiscoNome: 'Responsável de teste (Tarefa 7)',
    causas: 'Causa de teste',
    eventoRisco: 'Evento de teste',
    consequencias: 'Consequência de teste',
    objetivoAfetado: 'Objetivo de teste',
    categoriaId: CAT_OPERACIONAL,
    probabilidade: 1,
    impacto: 1,
    ...extra,
  };
}

/** Cria a ficha e anota o id para a faxina. */
async function criar(fonte: FonteDados, f: FichaParaSalvar) {
  const r = await fonte.salvarFicha(f);
  riscosCriados.push(r.id);
  return r;
}

/** Espera que a promessa FALHE com ErroRadar; guarda a mensagem para a conferência final. */
async function erroDe(p: Promise<unknown>): Promise<ErroRadar> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ErroRadar);
    mensagensVistas.push((e as ErroRadar).message);
    return e as ErroRadar;
  }
  throw new Error('era esperado um erro, mas a operação deu certo');
}

describe('fonte Supabase — gravações e fluxo (Supabase local)', () => {
  beforeAll(async () => {
    await garantirSupabaseNoAr();
    const { data, error } = await clienteServico()
      .from('categorias_risco')
      .select('apetite_declarado, justificativa_dar')
      .eq('id', CAT_OPERACIONAL)
      .single();
    if (error) throw new Error(error.message);
    darOriginal = data as typeof darOriginal;
  });

  afterEach(async () => {
    // 1) Riscos do teste (qualquer estado, inclusive aprovado).
    apagarRiscosDeTeste(riscosCriados.splice(0));
    // 2) Objetos do teste (já sem riscos).
    const objs = objetosCriados.splice(0);
    if (objs.length) await clienteServico().from('objetos_contexto').delete().in('id', objs);
    // 3) DAR da categoria 2 de volta ao original (só se mudou).
    const { data: atual } = await clienteServico()
      .from('categorias_risco')
      .select('apetite_declarado, justificativa_dar')
      .eq('id', CAT_OPERACIONAL)
      .single();
    if (
      atual?.apetite_declarado !== darOriginal.apetite_declarado ||
      atual?.justificativa_dar !== darOriginal.justificativa_dar
    ) {
      await clienteServico().from('categorias_risco').update(darOriginal).eq('id', CAT_OPERACIONAL);
    }
  });

  afterAll(() => {
    // Nenhuma mensagem mostrada à pessoa pode trazer texto técnico do banco.
    for (const m of mensagensVistas) {
      expect(m).not.toMatch(/row-level|violates/i);
    }
  });

  it('ciclo completo: cria, apaga o "Por quê", envia, valida, homologa; histórico e atividade recente', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    // P=4, I=4 na Legal (apetite baixo) → Alto → Risco Crítico → exige homologação.
    const { id, codigoRadar } = await criar(
      gestor,
      ficha({
        categoriaId: CAT_LEGAL,
        probabilidade: 4,
        impacto: 4,
        respostas: [
          {
            estrategia: 'Mitigar',
            acaoOQue: 'Ação de teste',
            justificativaPorQue: 'Motivo que será apagado',
            localOnde: 'Sede',
            responsavelQuem: 'Responsável',
            prazoQuando: '2026-12-31',
            procedimentoComo: 'Procedimento',
            custoQuanto: 'Sem custo adicional',
            statusExecucao: 'nao_iniciada',
          },
        ],
        kris: [
          {
            nomeIndicador: 'KRI de teste',
            formulaCalculo: 'a / b',
            fonteDados: 'Planilha',
            periodicidade: 'Mensal',
            metaAlvo: '0',
            limiteAlerta: '1',
            responsavelMedicao: 'Responsável',
          },
        ],
      }),
    );
    expect(codigoRadar).toMatch(/^RADAR-\d{4}-\d{3,}$/);

    // Apagar o "Por quê" de uma resposta JÁ gravada → o banco fica com null.
    const lido = (await gestor.relerRisco(id))!;
    expect(lido.statusFluxo).toBe('rascunho');
    expect(lido.isCritico).toBe(true);
    lido.respostasTratamento[0] = { ...lido.respostasTratamento[0], justificativaPorQue: undefined };
    await gestor.salvarFicha(fichaParaSalvarDeRisco(lido, []));
    const { data: resp } = await clienteServico()
      .from('respostas_tratamento')
      .select('justificativa_por_que, local_onde')
      .eq('risco_id', id)
      .single();
    expect(resp).toEqual({ justificativa_por_que: null, local_onde: 'Sede' });

    // Fluxo: enviar (gestor.uc@) → validar (ct@) → homologar (gr@).
    await gestor.enviar(id);
    await (await fonteDe('ct@radar.test')).validar(id, 'De acordo.');
    expect((await gestor.relerRisco(id))!.statusFluxo).toBe('em_homologacao_dir');
    await (await fonteDe('gr@radar.test')).homologar(id, 'Homologado.');

    const aprovado = (await gestor.relerRisco(id))!;
    expect(aprovado.statusFluxo).toBe('aprovado');
    expect(aprovado.historicoFluxo.map((h) => h.acao)).toEqual(['submetido', 'validado', 'homologado']);

    // Atividade recente (mais nova primeiro) traz os mesmos passos com o código certo.
    const recentes = await (await fonteDe('cgov@radar.test')).lerAtividadeRecente(5);
    const meus = recentes.filter((e) => e.riscoId === id);
    expect(meus.map((e) => e.acao)).toEqual(['homologado', 'validado', 'submetido']);
    expect(meus.every((e) => e.codigoRadar === codigoRadar)).toBe(true);

    // Monitoramento: medição de KRI e andamento da ação NÃO reabrem o risco aprovado.
    await gestor.registrarMedicao(aprovado.kris[0].id, {
      dataMedicao: '2026-11-16',
      valorApurado: '0,5',
      emAlerta: false,
      observacao: 'Medição de teste',
    });
    await gestor.atualizarStatusTratamento(aprovado.respostasTratamento[0].id, 'em_andamento');
    const monitorado = (await gestor.relerRisco(id))!;
    expect(monitorado.statusFluxo).toBe('aprovado');
    expect(monitorado.kris[0].medicoes).toHaveLength(1);
    expect(monitorado.respostasTratamento[0].statusExecucao).toBe('em_andamento');

    // Edição do risco aprovado (P e controles) numa só chamada → volta à validação.
    await gestor.salvarFicha({
      ...fichaParaSalvarDeRisco(monitorado, []),
      probabilidade: 3,
      controles: [
        {
          descricaoControle: 'Controle novo',
          evidenciaFuncionamento: 'Relatório',
          possuiEvidenciaComprovada: true,
          desenhoAdequado: true,
          operacaoComprovada: true,
        },
      ],
    });
    const reaberto = (await gestor.relerRisco(id))!;
    expect(reaberto.statusFluxo).toBe('em_validacao_cg');
    expect(reaberto.probabilidade).toBe(3);
    expect(reaberto.controlesExistentes).toHaveLength(1);
  });

  it('KRI (LAC-03): cria só com o nome, liga a outro risco, desliga e some quando fica órfão', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    // Rascunho é livre: um KRI só com o nome é aceito e os campos vazios ficam NULL.
    const a = await criar(gestor, ficha({ kris: [{ nomeIndicador: 'KRI só com nome (teste)' }] }));
    const lidoA = (await gestor.relerRisco(a.id))!;
    expect(lidoA.kris).toHaveLength(1);
    const kri = lidoA.kris[0];
    expect(kri.nomeIndicador).toBe('KRI só com nome (teste)');
    expect(kri.formulaCalculo).toBeUndefined();
    expect(kri.periodicidade).toBeUndefined();
    expect(kri.limiteAlerta).toBeUndefined();
    expect(kri.riscoIds).toEqual([a.id]);

    // Outro risco do mesmo objeto só LIGA o KRI existente.
    const b = await criar(gestor, ficha({ kris: [{ id: kri.id, nomeIndicador: kri.nomeIndicador, apenasLigar: true }] }));
    const lidoB = (await gestor.relerRisco(b.id))!;
    expect(lidoB.kris.map((k) => k.id)).toEqual([kri.id]);
    expect([...lidoB.kris[0].riscoIds].sort()).toEqual([a.id, b.id].sort());
    // A carteira mostra o mesmo KRI nos dois riscos.
    const carteira = await gestor.carregarCarteira();
    for (const id of [a.id, b.id]) {
      expect(carteira.riscos.find((r) => r.id === id)!.kris.map((k) => k.id)).toEqual([kri.id]);
    }

    // Desligar do B (lista de KRIs vazia): o KRI continua no A.
    await gestor.salvarFicha({ ...fichaParaSalvarDeRisco(lidoB, []), kris: [] });
    expect((await gestor.relerRisco(b.id))!.kris).toEqual([]);
    expect((await gestor.relerRisco(a.id))!.kris.map((k) => k.id)).toEqual([kri.id]);

    // Desligar do último risco: o KRI órfão some.
    await gestor.salvarFicha({ ...fichaParaSalvarDeRisco((await gestor.relerRisco(a.id))!, []), kris: [] });
    const { data: sobrou } = await clienteServico().from('indicadores_kri').select('id').eq('id', kri.id);
    expect(sobrou).toEqual([]);
  });

  it('devolver sem motivo → ErroRadar "validacao"', async () => {
    const ct = await fonteDe('ct@radar.test');
    const erro = await erroDe(ct.devolver('00000000-0000-4000-8000-000000000000', '   '));
    expect(erro.tipo).toBe('validacao');
    expect(erro.message).toMatch(/motivo/i);
  });

  it('concorrência: dois titulares validam ao mesmo tempo → um passa, o outro recebe "estado"', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    // P=1, I=1, Operacional (moderado) → Baixo, não crítico → validar já aprova.
    const { id } = await criar(gestor, ficha());
    await gestor.enviar(id);
    // Duas sessões do mesmo titular (como duas abas abertas). Os logins são um
    // após o outro: um link novo invalida o anterior ainda não usado.
    const aba1 = await fonteDe('ct@radar.test');
    const aba2 = await fonteDe('ct@radar.test');
    const resultados = await Promise.allSettled([aba1.validar(id), aba2.validar(id)]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const falha = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    const erro = await erroDe(Promise.reject(falha.reason));
    expect(erro.tipo).toBe('estado');
    expect(erro.message).toMatch(/não está mais em validação|mudou de situação/);
    expect((await gestor.relerRisco(id))!.statusFluxo).toBe('aprovado');
  });

  it('cgov@ devolve risco sem homologador efetivo (preparado como no teste 073)', async () => {
    const servico = clienteServico();
    const { data: presidencia } = await servico.from('unidades').select('id').eq('icmbio_id', '10.0000').single();
    const { data: presidente } = await servico
      .from('perfis_usuarios')
      .select('id, nome_completo')
      .eq('email', 'presidente@radar.test')
      .single();
    // Objeto na Presidência + risco "enviado pelo próprio Presidente", em homologação.
    const obj = await servico
      .from('objetos_contexto')
      .insert({
        tipo_objeto: 'Unidade',
        nome_objeto: 'Teste Tarefa 7 — Presidência',
        unidade_id: presidencia!.id,
        objetivo_estrategico_associado: 'Objetivo de teste',
      })
      .select('id')
      .single();
    if (obj.error) throw new Error(obj.error.message);
    objetosCriados.push(obj.data.id);
    const risco = await servico
      .from('riscos')
      .insert({
        codigo_radar: `RADAR-T7-E-${Date.now()}`,
        objeto_id: obj.data.id,
        responsavel_risco_nome: 'Responsável de teste',
        causas: 'causa',
        evento_risco: 'evento',
        consequencias: 'consequência',
        objetivo_afetado: 'objetivo',
        descricao_padrao: 'x',
        categoria_id: CAT_OPERACIONAL,
        probabilidade: 2,
        impacto: 3,
        nivel_inerente: 0,
        classificacao_inerente: 'Baixo',
        nivel_residual: 0,
        classificacao_residual: 'Baixo',
        status_fluxo: 'em_homologacao_dir',
      })
      .select('id')
      .single();
    if (risco.error) throw new Error(risco.error.message);
    riscosCriados.push(risco.data.id);
    const hist = await servico.from('historico_fluxo').insert({
      risco_id: risco.data.id,
      etapa: 'submissao_1a_linha',
      acao: 'submetido',
      usuario_nome: presidente!.nome_completo,
      usuario_papel: 'presidencia',
      despacho_texto: 'Envio de teste',
      usuario_id: presidente!.id,
    });
    if (hist.error) throw new Error(hist.error.message);

    // Quem não é CGOV não usa essa saída.
    const erro = await erroDe((await fonteDe('gr@radar.test')).devolver(risco.data.id, 'Ajustar.'));
    expect(erro.tipo).not.toBe('desconhecido');

    const cgov = await fonteDe('cgov@radar.test');
    await cgov.devolver(risco.data.id, 'Reenviar por outro servidor da unidade.');
    const relido = (await cgov.relerRisco(risco.data.id))!;
    expect(relido.statusFluxo).toBe('devolvido');
    expect(relido.historicoFluxo.at(-1)?.acao).toBe('devolvido_ajuste');
  });

  it('assumir risco preliminar da CGOV; depois excluir (e excluir de novo → "nao_encontrado")', async () => {
    const cgov = await fonteDe('cgov@radar.test');
    const { id } = await criar(cgov, ficha({ preliminarCgov: true }));
    const gestor = await fonteDe('gestor.uc@radar.test');
    expect((await gestor.relerRisco(id))!.statusFluxo).toBe('preliminar_cgov');

    await gestor.assumir(id);
    const assumido = (await gestor.relerRisco(id))!;
    expect(assumido.statusFluxo).toBe('rascunho');
    expect(assumido.historicoFluxo.map((h) => h.acao)).toEqual(['assumido']);

    await gestor.excluirRisco(id);
    expect(await gestor.relerRisco(id)).toBeNull();
    const erro = await erroDe(gestor.excluirRisco(id));
    expect(erro.tipo).toBe('nao_encontrado');
  });

  it('excluir risco aprovado → ErroRadar "estado" (Plano de Gestão de Riscos)', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    const { id } = await criar(gestor, ficha());
    await gestor.enviar(id);
    await (await fonteDe('ct@radar.test')).validar(id);
    const erro = await erroDe(gestor.excluirRisco(id));
    expect(erro.tipo).toBe('estado');
    expect(erro.message).toMatch(/Plano de Gestão de Riscos/);
  });

  it('reatribuirObjeto por gestor.uc@ → ErroRadar "permissao"', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    const { data: gr5 } = await clienteServico().from('unidades').select('id').eq('icmbio_id', '23.5000').single();
    const erro = await erroDe(gestor.reatribuirObjeto(OBJ_UC_CT, gr5!.id));
    expect(erro.tipo).toBe('permissao');
  });

  it('DAR: cgov@ muda o apetite → risco aprovado da categoria relido com a criticidade nova', async () => {
    const gestor = await fonteDe('gestor.uc@radar.test');
    // P=2, I=3, Operacional (moderado) → Médio, dentro do apetite → validar aprova.
    // LAC-03: ao virar crítico com a DAR nova, o risco só segue para a homologação se já tiver
    // tratamento (LAC-13) e KRI completo; por isso a ficha já nasce com os dois.
    const { id } = await criar(
      gestor,
      ficha({
        probabilidade: 2,
        impacto: 3,
        respostas: [
          {
            estrategia: 'Mitigar',
            acaoOQue: 'Ação de teste',
            responsavelQuem: 'Responsável',
            prazoQuando: '2026-12-31',
            procedimentoComo: 'Procedimento',
            statusExecucao: 'nao_iniciada',
          },
        ],
        kris: [
          {
            nomeIndicador: 'KRI completo (teste)',
            formulaCalculo: 'a / b',
            fonteDados: 'Planilha',
            periodicidade: 'Mensal',
            limiteAlerta: '1',
            responsavelMedicao: 'Responsável',
          },
        ],
      }),
    );
    await gestor.enviar(id);
    await (await fonteDe('ct@radar.test')).validar(id);
    const antes = (await gestor.relerRisco(id))!;
    expect(antes.statusFluxo).toBe('aprovado');
    expect(antes.isCritico).toBe(false);

    // Quem não é CGOV não muda a DAR.
    const erro = await erroDe(gestor.alterarApetite(CAT_OPERACIONAL, 'baixo'));
    expect(erro.tipo).toBe('permissao');

    const cgov = await fonteDe('cgov@radar.test');
    await cgov.alterarApetite(CAT_OPERACIONAL, 'baixo');
    await cgov.alterarJustificativa(CAT_OPERACIONAL, 'Justificativa de teste (Tarefa 7).');
    const depois = (await gestor.relerRisco(id))!;
    expect(depois.isCritico).toBe(true);
    expect(depois.statusFluxo).toBe('em_homologacao_dir');
    expect(depois.historicoFluxo.at(-1)?.acao).toBe('reaberto_mudanca_dar');
    const cat = (await cgov.carregarCarteira()).categorias.find((c) => c.id === CAT_OPERACIONAL)!;
    expect(cat.apetiteDeclarado).toBe('baixo');
    expect(cat.justificativaDar).toBe('Justificativa de teste (Tarefa 7).');
  });

  it('salvarObjeto: com processo o banco preenche o supervisor; sem processo, só a CGOV o define', async () => {
    const servico = clienteServico();
    const { data: flona } = await servico.from('objetos_contexto').select('unidade_id').eq('id', OBJ_UC_CT).single();
    const { data: proc } = await servico
      .from('processos_cadeia_valor')
      .select('id, unidade_supervisora_id')
      .eq('ativo', true)
      .order('id')
      .limit(1)
      .single();
    const gestor = await fonteDe('gestor.uc@radar.test');

    // Com processo: mesmo mandando um supervisor qualquer, vale o do processo.
    const criado = await gestor.salvarObjeto({
      tipoObjeto: 'Processo',
      nomeObjeto: 'Objeto de teste (Tarefa 7)',
      unidadeId: flona!.unidade_id,
      processoId: proc!.id,
      macroprocessoSupervisorId: flona!.unidade_id,
      objetivoEstrategicoAssociado: 'Objetivo de teste',
    });
    objetosCriados.push(criado.id);
    expect(criado.macroprocessoSupervisorId).toBe(proc!.unidade_supervisora_id);
    expect(criado.processoId).toBe(proc!.id);
    expect(criado.processoNome).toBeTruthy();

    // Alterar (com id) devolve o objeto atualizado.
    const alterado = await gestor.salvarObjeto({ ...criado, nomeObjeto: 'Objeto de teste (Tarefa 7) — alterado' });
    expect(alterado.id).toBe(criado.id);
    expect(alterado.nomeObjeto).toBe('Objeto de teste (Tarefa 7) — alterado');

    // Sem processo, quem não é CGOV não define o supervisor.
    const erro = await erroDe(
      gestor.salvarObjeto({
        tipoObjeto: 'Processo',
        nomeObjeto: 'Objeto sem processo (Tarefa 7)',
        unidadeId: flona!.unidade_id,
        processoId: null,
        macroprocessoSupervisorId: flona!.unidade_id,
        objetivoEstrategicoAssociado: 'Objetivo de teste',
      }),
    );
    expect(erro.tipo).toBe('permissao');
  });
});
