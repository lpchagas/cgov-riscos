/**
 * Testes da fonte de demonstração (`src/services/dados/fonteDemonstracao.ts`).
 *
 * EXPLICAÇÃO DIDÁTICA:
 * No modo demonstração (sem banco), os dados moram na memória do navegador.
 * A fonte de demonstração imita o que o banco faria: calcula pela
 * `calculadoraRiscoRadar.ts`, simula o fluxo de aprovação e recalcula a
 * criticidade quando a DAR muda. Estes testes garantem que o comportamento
 * de hoje (antes da etapa B3) continua igual depois da mudança de lugar.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { criarFonteDemonstracao } from '../../src/services/dados/fonteDemonstracao';
import { criarFonteDados, CHAVE_ESTADO_DEMO } from '../../src/services/dados';
import { ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';
import { MENSAGEM_TRAVA_CRITICO, MENSAGEM_TRAVA_KRI } from '../../src/utils/travaRiscoCritico';
import { PERFIS_DEMO_ICMBIO } from '../../src/stores/authStore';
import { RISCOS_SEMENTE_ANEXO_II, CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import type { PapelGovernanca } from '../../src/types/radar.types';

/** Fonte com um perfil fixo (sem depender do localStorage). */
const fonteComo = (papel: PapelGovernanca) =>
  criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO[papel] });

const ANO = new Date().getFullYear();

/** KRI completo (os 6 campos da trava), sem `id`: a fonte cria o id. */
const KRI_OK = {
  nomeIndicador: 'Taxa de falhas',
  formulaCalculo: 'falhas / total',
  fonteDados: 'SEI',
  periodicidade: 'Mensal' as const,
  limiteAlerta: '> 5%',
  responsavelMedicao: 'Chefe da unidade',
};

/** Espera a promessa rejeitar e devolve o erro (para conferir `tipo`). */
async function erroDe(p: Promise<unknown>): Promise<ErroRadar> {
  try {
    await p;
  } catch (e) {
    return e as ErroRadar;
  }
  throw new Error('era para ter rejeitado');
}

describe('carregarCarteira', () => {
  it('traz os riscos do Anexo II e as listas de apoio', async () => {
    const c = await fonteComo('cgov').carregarCarteira();
    // Observação: a semente do MODO DEMONSTRAÇÃO tem os riscos do Anexo II
    // (RISCOS_SEMENTE_ANEXO_II); os 10 riscos "RADAR-DEMO-*" são do banco local.
    expect(c.riscos.map((r) => r.codigoRadar)).toEqual(RISCOS_SEMENTE_ANEXO_II.map((r) => r.codigoRadar));
    expect(c.categorias).toHaveLength(CATEGORIAS_QUADRO_2_SEMENTE.length);
    expect(c.objetos.length).toBeGreaterThan(0);
    expect(c.unidades.length).toBeGreaterThan(0);
    expect(Array.isArray(c.processos)).toBe(true);
  });

  it('devolve cópias: mexer no resultado não muda a fonte', async () => {
    const fonte = fonteComo('cgov');
    const c = await fonte.carregarCarteira();
    c.riscos[0].causas = 'alterado fora da fonte';
    c.riscos.pop();
    const de_novo = await fonte.carregarCarteira();
    expect(de_novo.riscos).toHaveLength(RISCOS_SEMENTE_ANEXO_II.length);
    expect(de_novo.riscos[0].causas).not.toBe('alterado fora da fonte');
  });

  it("estado 'erro' rejeita com ErroRadar de rede", async () => {
    const e = await erroDe(criarFonteDemonstracao('erro').carregarCarteira());
    expect(e).toBeInstanceOf(ErroRadar);
    expect(e.tipo).toBe('rede');
    expect(e.message).toBe(MENSAGEM_REDE);
  });

  it("estado 'carregando' nunca resolve", async () => {
    const resultado = await Promise.race([
      criarFonteDemonstracao('carregando').carregarCarteira().then(() => 'resolveu'),
      new Promise((r) => setTimeout(() => r('ainda carregando'), 30)),
    ]);
    expect(resultado).toBe('ainda carregando');
  });

  it('duas fontes não compartilham dados', async () => {
    const a = fonteComo('cgov');
    const b = fonteComo('cgov');
    await a.salvarFicha({ objetoId: 'obj-anexo-ii', causas: 'só na fonte A' });
    await a.alterarApetite(4, 'moderado'); // categoria 4 = Legal (apetite baixo)
    const cb = await b.carregarCarteira();
    expect(cb.riscos).toHaveLength(RISCOS_SEMENTE_ANEXO_II.length);
    expect(cb.categorias.find((c) => c.id === 4)?.apetiteDeclarado).toBe('baixo');
  });
});

describe('salvarFicha', () => {
  it('sem id cria rascunho com código RADAR-<ano>-NNN e calcula pela calculadora', async () => {
    const fonte = fonteComo('gestor');
    const { id, codigoRadar } = await fonte.salvarFicha({
      objetoId: 'obj-anexo-ii',
      categoriaId: 2,
      probabilidade: 1,
      impacto: 5,
      nivelEficaciaControle: 'Forte',
      possuiEvidenciaControle: false,
    });
    // A semente usa até RADAR-2026-003: o próximo número é 004.
    expect(codigoRadar).toBe(`RADAR-${ANO}-005`); // a semente já tem 001 a 004
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('rascunho');
    // Quadro 7: P=1, I=5 → 15 (nunca P×I). Sem evidência, Forte trava em Fraco (0,9).
    expect(r?.nivelInerente).toBe(15);
    expect(r?.nivelEficaciaControle).toBe('Fraco');
    expect(r?.nivelResidual).toBe(13.5);
    expect(r?.classificacaoResidual).toBe('Alto');
    expect(r?.unidadeId).toBe('uni-cgov'); // unidade do objeto obj-anexo-ii
  });

  it('com id atualiza o mesmo risco (mantém o código e o que não veio)', async () => {
    const fonte = fonteComo('gestor');
    const criado = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii', causas: 'antes', eventoRisco: 'evento' });
    const salvo = await fonte.salvarFicha({ id: criado.id, objetoId: 'obj-anexo-ii', causas: 'depois' });
    expect(salvo).toEqual(criado);
    const r = await fonte.relerRisco(criado.id);
    expect(r?.causas).toBe('depois');
    expect(r?.eventoRisco).toBe('evento');
    expect(r?.descricaoPadrao).toContain('depois');
    expect((await fonte.carregarCarteira()).riscos).toHaveLength(RISCOS_SEMENTE_ANEXO_II.length + 1);
  });

  // Sem conversão silenciosa: categoria desconhecida é recusada (no banco, a
  // chave estrangeira recusaria). O padrão Operacional (id 2) só vale quando
  // a ficha nova não diz a categoria.
  it('categoria desconhecida é recusada, na ficha nova e na edição; sem categoria, nasce Operacional', async () => {
    const fonte = fonteComo('gestor');
    const nova = await erroDe(fonte.salvarFicha({ objetoId: 'obj-anexo-ii', categoriaId: 99 }));
    expect(nova.message).toBe('Categoria não encontrada.');
    expect((await fonte.carregarCarteira()).riscos).toHaveLength(RISCOS_SEMENTE_ANEXO_II.length);

    const criado = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii' });
    expect((await fonte.relerRisco(criado.id))?.categoriaNome).toBe('Operacional');
    const edicao = await erroDe(fonte.salvarFicha({ id: criado.id, objetoId: 'obj-anexo-ii', categoriaId: 99 }));
    expect(edicao.message).toBe('Categoria não encontrada.');
    expect((await fonte.relerRisco(criado.id))?.categoriaId).toBe(2);
  });

  it('ficha preliminar da CGOV nasce em preliminar_cgov', async () => {
    const fonte = fonteComo('cgov');
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii', preliminarCgov: true });
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('preliminar_cgov');
    expect(r?.origemPreliminarCgov).toBe(true);
  });

  it('editar risco aprovado reabre para validação (como o banco)', async () => {
    const fonte = fonteComo('gestor');
    await fonte.salvarFicha({ id: 'risco-socio-03', objetoId: 'obj-autorizacao-uc', probabilidade: 5 });
    const r = await fonte.relerRisco('risco-socio-03');
    expect(r?.statusFluxo).toBe('em_validacao_cg');
    expect(r?.historicoFluxo.at(-1)?.acao).toBe('reaberto_mudanca_nota');
  });

  it('risco em validação está travado', async () => {
    const e = await erroDe(fonteComo('gestor').salvarFicha({ id: 'risco-anexo-ii-01', objetoId: 'obj-anexo-ii', causas: 'x' }));
    expect(e.tipo).toBe('estado');
  });

  it('filhos: lista substitui, ausente mantém; medições do KRI são preservadas', async () => {
    const fonte = fonteComo('gestor');
    const antes = await fonte.relerRisco('risco-socio-03');
    const kri = antes!.kris[0];
    const { medicoes, ...semMedicoes } = kri;
    await fonte.salvarFicha({ id: 'risco-socio-03', objetoId: 'obj-autorizacao-uc', controles: [], kris: [semMedicoes] });
    const depois = await fonte.relerRisco('risco-socio-03');
    expect(depois?.controlesExistentes).toEqual([]);
    expect(depois?.kris[0].medicoes).toEqual(medicoes);
    expect(depois?.respostasTratamento).toEqual(antes?.respostasTratamento);
  });
});

describe('fluxo simulado', () => {
  it('validar risco crítico leva a em_homologacao_dir (aprovarEmUmCliqueCg de hoje)', async () => {
    const fonte = fonteComo('coordenador_geral');
    await fonte.validar('risco-anexo-ii-01');
    const r = await fonte.relerRisco('risco-anexo-ii-01');
    expect(r?.statusFluxo).toBe('em_homologacao_dir');
    const h = r!.historicoFluxo.at(-1)!;
    expect(h.etapa).toBe('validacao_cg');
    expect(h.acao).toBe('aprovado_1_clique');
    expect(h.usuarioPapel).toBe('coordenador_geral');
  });

  it('enviar e validar risco dentro do apetite leva direto a aprovado', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii', categoriaId: 2, probabilidade: 1, impacto: 1 });
    await fonte.enviar(id);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('em_validacao_cg');
    await fonte.validar(id, 'De acordo.');
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('aprovado');
    expect(r?.historicoFluxo.at(-1)?.despachoTexto).toBe('De acordo.');
  });

  it("validar risco Médio em categoria 'pendente_dar' leva a em_homologacao_dir (igual ao banco)", async () => {
    // Categoria 10 (Ocupacionais) nasce sem apetite na DAR. P=3, I=2 → 8 (Médio, Quadro 7).
    const fonte = fonteComo('coordenador_geral');
    // LAC-13: risco 'pendente_dar' é crítico para a trava; precisa de Mitigar + ação 5W2H para ser enviado.
    const { id } = await fonte.salvarFicha({
      objetoId: 'obj-anexo-ii',
      categoriaId: 10,
      probabilidade: 3,
      impacto: 2,
      estrategiaPrincipal: 'Mitigar',
      kris: [KRI_OK], // LAC-03: 'pendente_dar' também exige KRI completo
      respostas: [
        {
          estrategia: 'Mitigar',
          acaoOQue: 'Ação de teste',
          responsavelQuem: 'Unidade',
          prazoQuando: '2026-12-31',
          procedimentoComo: 'Como de teste',
          statusExecucao: 'nao_iniciada',
        },
      ],
    });
    await fonte.enviar(id);
    const enviado = await fonte.relerRisco(id);
    expect(enviado?.classificacaoResidual).toBe('Médio');
    expect(enviado?.statusCritico).toBe('pendente_dar');
    expect(enviado?.isCritico).toBe(false);
    await fonte.validar(id);
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('em_homologacao_dir');
    // O histórico não chama de "Risco Crítico" o que só está pendente da DAR.
    expect(r?.historicoFluxo.at(-1)?.despachoTexto).toContain('ainda não tem apetite declarado na DAR');
  });

  it('homologar leva a aprovado', async () => {
    const fonte = fonteComo('diretor');
    await fonte.homologar('risco-integra-02');
    expect((await fonte.relerRisco('risco-integra-02'))?.statusFluxo).toBe('aprovado');
  });

  it("devolver('') rejeita com tipo 'validacao'; com motivo, devolve", async () => {
    const fonte = fonteComo('diretor');
    expect((await erroDe(fonte.devolver('risco-integra-02', ''))).tipo).toBe('validacao');
    expect((await erroDe(fonte.devolver('risco-integra-02', '   '))).tipo).toBe('validacao');
    await fonte.devolver('risco-integra-02', 'Ajustar a causa.');
    const r = await fonte.relerRisco('risco-integra-02');
    expect(r?.statusFluxo).toBe('devolvido');
    expect(r?.historicoFluxo.at(-1)?.despachoTexto).toBe('Ajustar a causa.');
  });

  it('ação em risco que não está no estado certo é recusada', async () => {
    const fonte = fonteComo('coordenador_geral');
    expect((await erroDe(fonte.validar('risco-socio-03'))).tipo).toBe('estado');
    expect((await erroDe(fonte.homologar('risco-anexo-ii-01'))).tipo).toBe('estado');
    expect((await erroDe(fonte.enviar('risco-socio-03'))).tipo).toBe('estado');
    expect((await erroDe(fonte.validar('nao-existe'))).tipo).toBe('nao_encontrado');
  });

  it('assumir risco preliminar da CGOV vira rascunho', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii', preliminarCgov: true });
    await fonte.assumir(id);
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('rascunho');
    expect(r?.historicoFluxo.at(-1)?.acao).toBe('assumido');
  });

  it('excluir: só rascunho, devolvido ou preliminar', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii' });
    await fonte.excluirRisco(id);
    expect(await fonte.relerRisco(id)).toBeNull();
    expect((await erroDe(fonte.excluirRisco('risco-socio-03'))).tipo).toBe('estado');
  });
});

describe('acoesNoFluxo (botões pelo perfil e pelo estado, como hoje)', () => {
  it('Coordenação-Geral valida e devolve risco em validação', async () => {
    const [a] = await fonteComo('coordenador_geral').acoesNoFluxo(['risco-anexo-ii-01']);
    expect(a).toMatchObject({ riscoId: 'risco-anexo-ii-01', podeValidar: true, podeDevolver: true, podeHomologar: false, podeEditar: false });
  });

  it('gestor não valida e recebe o motivo', async () => {
    const [a] = await fonteComo('gestor').acoesNoFluxo(['risco-anexo-ii-01']);
    expect(a.podeValidar).toBe(false);
    expect(a.podeDevolver).toBe(false);
    expect(a.motivo).toBeTruthy();
  });

  it('Diretoria homologa; Coordenação-Geral não', async () => {
    const [d] = await fonteComo('diretor').acoesNoFluxo(['risco-integra-02']);
    expect(d.podeHomologar).toBe(true);
    const [cg] = await fonteComo('coordenador_geral').acoesNoFluxo(['risco-integra-02']);
    expect(cg.podeHomologar).toBe(false);
  });

  it('rascunho pode ser enviado, editado e excluído; aprovado só editado; ids desconhecidos são ignorados', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii' });
    const acoes = await fonte.acoesNoFluxo([id, 'risco-socio-03', 'nao-existe']);
    expect(acoes).toHaveLength(2);
    expect(acoes[0]).toMatchObject({ podeEnviar: true, podeEditar: true, podeExcluir: true, podeAssumir: false, devolucaoCgov: false });
    expect(acoes[1]).toMatchObject({ podeEnviar: false, podeEditar: true, podeExcluir: false });
  });

  it('Auditoria Interna só lê', async () => {
    const [a] = await fonteComo('auditoria').acoesNoFluxo(['risco-socio-03']);
    expect(a.podeEditar).toBe(false);
    expect(a.podeExcluir).toBe(false);
  });

  it('sem perfil injetado, lê o perfil simulado guardado no navegador', async () => {
    localStorage.setItem('radar.perfil-demo.v1', 'diretor');
    const [a] = await criarFonteDemonstracao().acoesNoFluxo(['risco-integra-02']);
    expect(a.podeHomologar).toBe(true);
  });
});

describe('DAR, monitoramento e objetos', () => {
  it('alterarApetite recalcula a criticidade na memória', async () => {
    const fonte = fonteComo('cgov');
    // risco-socio-03: residual 8,4 (Médio) na categoria 2, Operacional (apetite moderado) → não é Crítico.
    expect((await fonte.relerRisco('risco-socio-03'))?.statusCritico).toBe('nao');
    await fonte.alterarApetite(2, 'baixo');
    const r = await fonte.relerRisco('risco-socio-03');
    expect(r?.statusCritico).toBe('sim');
    expect(r?.isCritico).toBe(true);
    expect((await fonte.carregarCarteira()).categorias.find((c) => c.id === 2)?.apetiteDeclarado).toBe('baixo');
  });

  it('alterarJustificativa grava o texto', async () => {
    const fonte = fonteComo('cgov');
    await fonte.alterarJustificativa(4, 'Nova justificativa');
    expect((await fonte.carregarCarteira()).categorias.find((c) => c.id === 4)?.justificativaDar).toBe('Nova justificativa');
  });

  it('medição de KRI e status de ação não reabrem o risco aprovado', async () => {
    const fonte = fonteComo('gestor');
    await fonte.registrarMedicao('kri-socio-1', { dataMedicao: '2026-12-01', valorApurado: '90%', emAlerta: false });
    await fonte.atualizarStatusTratamento('trat-socio-1', 'concluida');
    const r = await fonte.relerRisco('risco-socio-03');
    expect(r?.statusFluxo).toBe('aprovado');
    expect(r?.kris[0].medicoes[0].valorApurado).toBe('90%');
    expect(r?.respostasTratamento[0].statusExecucao).toBe('concluida');
    expect((await erroDe(fonte.registrarMedicao('kri-x', { dataMedicao: '2026-12-01', valorApurado: '1', emAlerta: false }))).tipo).toBe('nao_encontrado');
  });

  it('salvarObjeto cria e atualiza; reatribuirObjeto troca a unidade dos riscos', async () => {
    const fonte = fonteComo('cgov');
    const novo = await fonte.salvarObjeto({ nomeObjeto: 'Objeto novo', unidadeId: 'uni-cgti' });
    expect(novo.id).toBeTruthy();
    const alterado = await fonte.salvarObjeto({ id: novo.id, nomeObjeto: 'Objeto renomeado', unidadeId: 'uni-cgti' });
    expect(alterado.nomeObjeto).toBe('Objeto renomeado');
    expect((await fonte.carregarCarteira()).objetos.filter((o) => o.id === novo.id)).toHaveLength(1);

    await fonte.reatribuirObjeto('obj-anexo-ii', 'uni-cgti');
    expect((await fonte.relerRisco('risco-anexo-ii-01'))?.unidadeId).toBe('uni-cgti');
  });

  it('objetosOndeGravo lista objetos de unidades ativas', async () => {
    const ids = await fonteComo('gestor').objetosOndeGravo();
    expect(ids).toContain('obj-anexo-ii');
  });

  it('atividade recente e auditoria vêm do histórico, do mais novo para o mais antigo', async () => {
    const fonte = fonteComo('cgov');
    const atividade = await fonte.lerAtividadeRecente(2);
    expect(atividade).toHaveLength(2);
    expect(atividade[0].criadoEm >= atividade[1].criadoEm).toBe(true);
    expect(atividade[0].codigoRadar).toMatch(/^RADAR-/);

    const pagina1 = await fonte.lerAuditoria({}, 2);
    expect(pagina1).toHaveLength(2);
    const ultimo = pagina1[1];
    const pagina2 = await fonte.lerAuditoria({ antesDe: { em: ultimo.realizadoEm, id: ultimo.id } }, 2);
    expect(pagina2.map((e) => e.id)).not.toContain(ultimo.id);
    expect(pagina2[0].realizadoEm <= ultimo.realizadoEm).toBe(true);
  });
});

describe('criarFonteDados', () => {
  it('demonstração lê o estado guardado no navegador', async () => {
    localStorage.setItem(CHAVE_ESTADO_DEMO, 'erro');
    const e = await erroDe(criarFonteDados('demonstracao').carregarCarteira());
    expect(e.tipo).toBe('rede');
  });

  it('valor estranho no navegador cai no estado normal', async () => {
    localStorage.setItem(CHAVE_ESTADO_DEMO, 'qualquer-coisa');
    const c = await criarFonteDados('demonstracao').carregarCarteira();
    expect(c.riscos.length).toBeGreaterThan(0);
  });

  it('modo real devolve a fonte Supabase (as leituras estão na Task 6)', () => {
    const fonte = criarFonteDados('real');
    expect(typeof fonte.carregarCarteira).toBe('function');
    expect(typeof fonte.lerAuditoria).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// LAC-13: trava do risco crítico ("Aceitar" não vale fora do apetite da DAR)
// ---------------------------------------------------------------------------
describe('trava do risco crítico (LAC-13)', () => {
  /** Ação 5W2H mínima para os testes. */
  const acao = (estrategia: 'Mitigar' | 'Aceitar') => ({
    estrategia,
    acaoOQue: 'Ação de teste',
    responsavelQuem: 'Unidade',
    prazoQuando: '2026-12-31',
    procedimentoComo: 'Como de teste',
    statusExecucao: 'nao_iniciada' as const,
  });
  /** Ficha crítica: categoria 2 (apetite moderado), P=5 e I=5 → residual Extremo → 'sim'. */
  const critica = (estrategiaPrincipal: 'Mitigar' | 'Aceitar', respostas: ReturnType<typeof acao>[] = []) => ({
    objetoId: 'obj-anexo-ii',
    categoriaId: 2,
    probabilidade: 5 as const,
    impacto: 5 as const,
    nivelEficaciaControle: 'Inexistente' as const,
    estrategiaPrincipal,
    respostas,
    kris: [KRI_OK], // LAC-03: crítico precisa de KRI completo
  });

  it('enviar rascunho crítico com Aceitar é recusado e a ficha não muda', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica('Aceitar'));
    const e = await erroDe(fonte.enviar(id));
    expect(e.message).toBe(MENSAGEM_TRAVA_CRITICO);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('rascunho');
  });

  it('enviar rascunho crítico com Mitigar mas sem ação é recusado', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica('Mitigar'));
    expect((await erroDe(fonte.enviar(id))).message).toBe(MENSAGEM_TRAVA_CRITICO);
  });

  it('enviar crítico com Mitigar + ação vai para em_validacao_cg', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica('Mitigar', [acao('Mitigar')]));
    await fonte.enviar(id);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('em_validacao_cg');
  });

  it('salvar ficha APROVADA crítica com Aceitar é recusado e a ficha guardada não muda', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha(critica('Mitigar', [acao('Mitigar')]));
    await fonte.enviar(id);
    await fonte.validar(id); // crítico sobe para a Diretoria
    await fonte.homologar(id);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('aprovado');
    const e = await erroDe(fonte.salvarFicha({ id, objetoId: 'obj-anexo-ii', estrategiaPrincipal: 'Aceitar' }));
    expect(e.message).toBe(MENSAGEM_TRAVA_CRITICO);
    const depois = await fonte.relerRisco(id);
    expect(depois?.estrategiaPrincipal).toBe('Mitigar');
    expect(depois?.statusFluxo).toBe('aprovado');
  });

  // Achado do CodeRabbit (PR #16): na recusa, um campo opcional que a ficha
  // não tinha (ex.: justificativaProbabilidade) também não pode ficar gravado.
  it('na recusa, campo opcional novo enviado junto com Aceitar não fica na ficha', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha(critica('Mitigar', [acao('Mitigar')]));
    await fonte.enviar(id);
    await fonte.validar(id);
    await fonte.homologar(id);
    expect((await fonte.relerRisco(id))?.justificativaProbabilidade).toBeUndefined();
    await erroDe(
      fonte.salvarFicha({
        id,
        objetoId: 'obj-anexo-ii',
        estrategiaPrincipal: 'Aceitar',
        justificativaProbabilidade: 'Texto rejeitado',
      })
    );
    expect((await fonte.relerRisco(id))?.justificativaProbabilidade).toBeUndefined();
  });

  it('salvar rascunho crítico com Aceitar continua livre', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica('Aceitar'));
    await expect(
      fonte.salvarFicha({ id, objetoId: 'obj-anexo-ii', estrategiaPrincipal: 'Aceitar' })
    ).resolves.toBeDefined();
  });

  describe('validar, homologar e devolver ficha que não passa (semente antiga)', () => {
    afterEach(() => {
      vi.doUnmock('../../src/services/dadosSementeAnexoII');
      vi.resetModules();
    });

    /** Fonte cuja semente tem os riscos 01 (validação) e 02 (homologação) com "Aceitar". */
    async function fonteComSementeAceitar() {
      vi.resetModules();
      vi.doMock('../../src/services/dadosSementeAnexoII', async (orig) => {
        const real = await orig<typeof import('../../src/services/dadosSementeAnexoII')>();
        return {
          ...real,
          RISCOS_SEMENTE_ANEXO_II: real.RISCOS_SEMENTE_ANEXO_II.map((r) =>
            r.id === 'risco-anexo-ii-01' || r.id === 'risco-integra-02'
              ? { ...r, estrategiaPrincipal: 'Aceitar' as const, respostasTratamento: [] }
              : r
          ),
        };
      });
      const modulo = await import('../../src/services/dados/fonteDemonstracao');
      return modulo.criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.cgov });
    }

    it('validar recusa e a ficha continua em validação', async () => {
      const fonte = await fonteComSementeAceitar();
      expect((await erroDe(fonte.validar('risco-anexo-ii-01'))).message).toBe(MENSAGEM_TRAVA_CRITICO);
      expect((await fonte.relerRisco('risco-anexo-ii-01'))?.statusFluxo).toBe('em_validacao_cg');
    });

    it('homologar recusa e a ficha continua em homologação', async () => {
      const fonte = await fonteComSementeAceitar();
      expect((await erroDe(fonte.homologar('risco-integra-02'))).message).toBe(MENSAGEM_TRAVA_CRITICO);
      expect((await fonte.relerRisco('risco-integra-02'))?.statusFluxo).toBe('em_homologacao_dir');
    });

    it('devolver continua funcionando', async () => {
      const fonte = await fonteComSementeAceitar();
      await fonte.devolver('risco-anexo-ii-01', 'Escolha outra estratégia.');
      expect((await fonte.relerRisco('risco-anexo-ii-01'))?.statusFluxo).toBe('devolvido');
    });
  });

  describe('mudança da DAR sobre riscos aprovados', () => {
    /** Cria um risco aprovado de residual Médio (P=3, I=2 → 8) ou Baixo (P=1, I=1 → 1) na categoria 2. */
    async function aprovado(
      fonte: ReturnType<typeof fonteComo>,
      p: 1 | 3,
      i: 1 | 2,
      estrategia: 'Aceitar' | 'Mitigar',
      respostas: ReturnType<typeof acao>[]
    ) {
      const { id } = await fonte.salvarFicha({
        objetoId: 'obj-anexo-ii',
        categoriaId: 2,
        probabilidade: p,
        impacto: i,
        nivelEficaciaControle: 'Inexistente',
        estrategiaPrincipal: estrategia,
        respostas,
        kris: [KRI_OK], // LAC-03: se a DAR o tornar crítico, o KRI já está lá
      });
      await fonte.enviar(id);
      await fonte.validar(id);
      expect((await fonte.relerRisco(id))?.statusFluxo).toBe('aprovado');
      return id;
    }

    it('baixo: A (Aceitar sem ação) volta devolvido; B e C ficam aprovados', async () => {
      const fonte = fonteComo('coordenador_geral');
      const a = await aprovado(fonte, 3, 2, 'Aceitar', []);
      const b = await aprovado(fonte, 3, 2, 'Mitigar', [acao('Mitigar')]);
      const c = await aprovado(fonte, 1, 1, 'Aceitar', []);
      await fonte.alterarApetite(2, 'baixo');
      const ra = await fonte.relerRisco(a);
      expect(ra?.statusFluxo).toBe('devolvido');
      const h = ra!.historicoFluxo.at(-1)!;
      expect(h.etapa).toBe('reabertura_nota');
      expect(h.acao).toBe('devolvido_mudanca_dar');
      // Texto fixo igual ao do banco (LAC-03): situação + motivo da trava.
      expect(h.despachoTexto).toBe(
        `DAR alterada: categoria Operacional com apetite moderado → baixo. O risco aprovado (residual ${ra!.nivelResidual}, ${ra!.classificacaoResidual}, fora do apetite da DAR) não passa na trava do risco crítico: a estratégia "Aceitar" não é permitida. Voltou para a unidade ajustar.`
      );
      // B: comportamento de hoje da demonstração (só recalcula a criticidade).
      expect((await fonte.relerRisco(b))?.statusFluxo).toBe('aprovado');
      expect((await fonte.relerRisco(b))?.statusCritico).toBe('sim');
      // C: continua dentro do apetite.
      const rc = await fonte.relerRisco(c);
      expect(rc?.statusFluxo).toBe('aprovado');
      expect(rc?.statusCritico).toBe('nao');
    });

    it('pendente_dar: Médio com Aceitar volta devolvido; com Mitigar + ação continua aprovado', async () => {
      const fonte = fonteComo('coordenador_geral');
      const a = await aprovado(fonte, 3, 2, 'Aceitar', []);
      const b = await aprovado(fonte, 3, 2, 'Mitigar', [acao('Mitigar')]);
      await fonte.alterarApetite(2, 'pendente_dar');
      expect((await fonte.relerRisco(a))?.statusFluxo).toBe('devolvido');
      expect((await fonte.relerRisco(b))?.statusFluxo).toBe('aprovado');
    });
  });
});

describe('KRI obrigatório e grupo (LAC-03)', () => {
  const acao = {
    estrategia: 'Mitigar' as const,
    acaoOQue: 'Ação de teste',
    responsavelQuem: 'Unidade',
    prazoQuando: '2026-12-31',
    procedimentoComo: 'Como de teste',
    statusExecucao: 'nao_iniciada' as const,
  };
  /** Ficha crítica (P=5, I=5 na categoria 2) com Mitigar + ação; `kris` à escolha. */
  const critica = (kris: NonNullable<Parameters<ReturnType<typeof fonteComo>['salvarFicha']>[0]['kris']>) => ({
    objetoId: 'obj-anexo-ii',
    categoriaId: 2,
    probabilidade: 5 as const,
    impacto: 5 as const,
    nivelEficaciaControle: 'Inexistente' as const,
    estrategiaPrincipal: 'Mitigar' as const,
    respostas: [acao],
    kris,
  });
  /** Ficha NÃO crítica (P=3, I=2 → 8, Médio; apetite moderado), com os KRIs dados. */
  const media = (kris: NonNullable<Parameters<ReturnType<typeof fonteComo>['salvarFicha']>[0]['kris']>) => ({
    objetoId: 'obj-anexo-ii',
    categoriaId: 2,
    probabilidade: 3 as const,
    impacto: 2 as const,
    nivelEficaciaControle: 'Inexistente' as const,
    estrategiaPrincipal: 'Mitigar' as const,
    respostas: [acao],
    kris,
  });
  const kriDe = async (f: ReturnType<typeof fonteComo>, riscoId: string) => (await f.relerRisco(riscoId))!.kris;

  /** Dois riscos (A e B) do mesmo objeto que dividem um KRI; devolve os ids. */
  async function grupo(f: ReturnType<typeof fonteComo>) {
    const a = await f.salvarFicha(media([KRI_OK]));
    const kriId = (await kriDe(f, a.id))[0].id;
    const b = await f.salvarFicha(media([{ ...KRI_OK, id: kriId, apenasLigar: true }]));
    return { a: a.id, b: b.id, kriId };
  }

  it('enviar crítico sem KRI é recusado com a frase do KRI e a ficha não muda', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica([]));
    expect((await erroDe(fonte.enviar(id))).message).toBe(MENSAGEM_TRAVA_KRI);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('rascunho');
  });

  it('KRI incompleto (fonte "A definir") também é recusado', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica([{ ...KRI_OK, fonteDados: 'A definir' }]));
    expect((await erroDe(fonte.enviar(id))).message).toBe(MENSAGEM_TRAVA_KRI);
  });

  it('enviar crítico com KRI completo vai para em_validacao_cg', async () => {
    const fonte = fonteComo('gestor');
    const { id } = await fonte.salvarFicha(critica([KRI_OK]));
    await fonte.enviar(id);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('em_validacao_cg');
  });

  it('dois riscos do mesmo objeto mostram o mesmo KRI; a medição aparece nos dois', async () => {
    const fonte = fonteComo('gestor');
    const { a, b, kriId } = await grupo(fonte);
    const ka = (await kriDe(fonte, a))[0];
    const kb = (await kriDe(fonte, b))[0];
    expect(ka.id).toBe(kriId);
    expect(kb.id).toBe(kriId);
    expect([...ka.riscoIds].sort()).toEqual([a, b].sort());
    await fonte.registrarMedicao(kriId, { dataMedicao: '2026-12-01', valorApurado: '3%', emAlerta: false });
    expect((await kriDe(fonte, a))[0].medicoes).toHaveLength(1);
    expect((await kriDe(fonte, b))[0].medicoes).toHaveLength(1);
  });

  it('desligar do 2º risco mantém o KRI no 1º; desligar do último apaga o KRI e as medições', async () => {
    const fonte = fonteComo('gestor');
    const { a, b, kriId } = await grupo(fonte);
    await fonte.registrarMedicao(kriId, { dataMedicao: '2026-12-01', valorApurado: '3%', emAlerta: false });
    await fonte.salvarFicha({ id: b, objetoId: 'obj-anexo-ii', kris: [] });
    expect(await kriDe(fonte, b)).toEqual([]);
    const restante = (await kriDe(fonte, a))[0];
    expect(restante.riscoIds).toEqual([a]);
    expect(restante.medicoes).toHaveLength(1);
    await fonte.salvarFicha({ id: a, objetoId: 'obj-anexo-ii', kris: [] });
    expect(await kriDe(fonte, a)).toEqual([]);
    expect((await erroDe(fonte.registrarMedicao(kriId, { dataMedicao: '2026-12-02', valorApurado: '1', emAlerta: false }))).tipo).toBe('nao_encontrado');
  });

  it('ligar a KRI de outro objeto é recusado e nada muda', async () => {
    const fonte = fonteComo('gestor');
    const kriId = (await kriDe(fonte, 'risco-anexo-ii-01'))[0].id;
    const { id } = await fonte.salvarFicha({ objetoId: 'obj-autorizacao-uc' });
    const e = await erroDe(fonte.salvarFicha({ id, objetoId: 'obj-autorizacao-uc', kris: [{ ...KRI_OK, id: kriId, apenasLigar: true }] }));
    expect(e.message).toMatch(/mesmo objeto/);
    expect(await kriDe(fonte, id)).toEqual([]);
    expect((await kriDe(fonte, 'risco-anexo-ii-01')).find((k) => k.id === kriId)!.riscoIds).not.toContain(id);
  });

  it('excluir um risco desliga o KRI dele; o último a sair leva o KRI', async () => {
    const fonte = fonteComo('gestor');
    const { a, b, kriId } = await grupo(fonte);
    await fonte.excluirRisco(b);
    expect((await kriDe(fonte, a))[0].riscoIds).toEqual([a]);
    await fonte.excluirRisco(a);
    expect((await erroDe(fonte.registrarMedicao(kriId, { dataMedicao: '2026-12-02', valorApurado: '1', emAlerta: false }))).tipo).toBe('nao_encontrado');
  });

  it('semente: o KRI compartilhado serve a dois riscos', async () => {
    const c = await fonteComo('gestor').carregarCarteira();
    const por = (id: string) => c.riscos.find((r) => r.id === id)!;
    const k1 = por('risco-anexo-ii-01').kris.find((k) => k.id === 'kri-anexo-ii-2')!;
    const k4 = por('risco-anexo-ii-04').kris.find((k) => k.id === 'kri-anexo-ii-2')!;
    expect(k1.riscoIds.sort()).toEqual(['risco-anexo-ii-01', 'risco-anexo-ii-04']);
    expect(k4.riscoIds.sort()).toEqual(k1.riscoIds);
  });

  describe('alterar a definição de um KRI compartilhado', () => {
    const editar = (f: ReturnType<typeof fonteComo>, riscoId: string, kriId: string, limite: string) =>
      f.salvarFicha({ id: riscoId, objetoId: 'obj-anexo-ii', kris: [{ ...KRI_OK, id: kriId, limiteAlerta: limite }] });

    it('reabre os riscos aprovados ligados (aprovado → em_validacao_cg)', async () => {
      const fonte = fonteComo('coordenador_geral');
      const { a, b, kriId } = await grupo(fonte);
      await fonte.enviar(a);
      await fonte.validar(a);
      expect((await fonte.relerRisco(a))?.statusFluxo).toBe('aprovado');
      await editar(fonte, b, kriId, '> 9%');
      const ra = await fonte.relerRisco(a);
      expect(ra?.statusFluxo).toBe('em_validacao_cg');
      expect(ra?.historicoFluxo.at(-1)?.acao).toBe('reaberto_mudanca_nota');
      expect((await kriDe(fonte, a))[0].limiteAlerta).toBe('> 9%');
    });

    it('é recusada se algum risco ligado está em validação, sem mudar nada', async () => {
      const fonte = fonteComo('coordenador_geral');
      const { a, b, kriId } = await grupo(fonte);
      await fonte.enviar(a); // A fica em validação
      const e = await erroDe(editar(fonte, b, kriId, '> 9%'));
      expect(e.tipo).toBe('estado');
      expect((await kriDe(fonte, a))[0].limiteAlerta).toBe(KRI_OK.limiteAlerta);
      expect((await fonte.relerRisco(a))?.statusFluxo).toBe('em_validacao_cg');
    });

    it('edição que não muda nada é livre (não reabre ninguém)', async () => {
      const fonte = fonteComo('coordenador_geral');
      const { a, b, kriId } = await grupo(fonte);
      await fonte.enviar(a);
      await fonte.validar(a);
      await editar(fonte, b, kriId, KRI_OK.limiteAlerta);
      expect((await fonte.relerRisco(a))?.statusFluxo).toBe('aprovado');
    });
  });

  it('na recusa da trava, desligar o KRI de um risco aprovado crítico volta tudo ao que era', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha(critica([KRI_OK]));
    await fonte.enviar(id);
    await fonte.validar(id);
    await fonte.homologar(id);
    const kriId = (await kriDe(fonte, id))[0].id;
    await fonte.registrarMedicao(kriId, { dataMedicao: '2026-12-01', valorApurado: '3%', emAlerta: false });
    const e = await erroDe(fonte.salvarFicha({ id, objetoId: 'obj-anexo-ii', kris: [] }));
    expect(e.message).toBe(MENSAGEM_TRAVA_KRI);
    const depois = await fonte.relerRisco(id);
    expect(depois?.statusFluxo).toBe('aprovado');
    expect(depois?.kris.map((k) => k.id)).toEqual([kriId]);
    expect(depois?.kris[0].medicoes).toHaveLength(1);
  });

  it('trocar o objeto de um risco que ainda tem KRI ligado é recusado e nada muda', async () => {
    const fonte = fonteComo('gestor');
    const a = await fonte.salvarFicha(media([KRI_OK]));
    const e = await erroDe(fonte.salvarFicha({ id: a.id, objetoId: 'obj-autorizacao-uc' }));
    expect(e.message).toMatch(/mesmo objeto/);
    const depois = await fonte.relerRisco(a.id);
    expect(depois?.objetoId).toBe('obj-anexo-ii');
    expect(depois?.kris).toHaveLength(1);
  });

  it('trocar o objeto soltando os KRIs antigos e criando um novo KRI funciona', async () => {
    const fonte = fonteComo('gestor');
    const a = await fonte.salvarFicha(media([KRI_OK]));
    await fonte.salvarFicha({ id: a.id, objetoId: 'obj-autorizacao-uc', kris: [{ ...KRI_OK, nomeIndicador: 'KRI do objeto novo' }] });
    const depois = await fonte.relerRisco(a.id);
    expect(depois?.objetoId).toBe('obj-autorizacao-uc');
    expect(depois?.kris.map((k) => k.nomeIndicador)).toEqual(['KRI do objeto novo']);
    expect(depois?.kris[0].objetoId).toBe('obj-autorizacao-uc');
  });

  it('DAR com apetite pendente: o histórico usa a variante "com DAR pendente"', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha(media([]));
    await fonte.enviar(id);
    await fonte.validar(id);
    await fonte.alterarApetite(2, 'pendente_dar');
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('devolvido');
    expect(r?.historicoFluxo.at(-1)?.despachoTexto).toContain(
      'com DAR pendente; por regra do sistema, a trava do risco crítico também se aplica) não passa na trava do risco crítico: falta um KRI completo'
    );
  });

  it('DAR: aprovado que vira crítico sem KRI completo volta devolvido, com o motivo do KRI', async () => {
    const fonte = fonteComo('coordenador_geral');
    const { id } = await fonte.salvarFicha(media([]));
    await fonte.enviar(id);
    await fonte.validar(id);
    expect((await fonte.relerRisco(id))?.statusFluxo).toBe('aprovado');
    await fonte.alterarApetite(2, 'baixo');
    const r = await fonte.relerRisco(id);
    expect(r?.statusFluxo).toBe('devolvido');
    expect(r?.historicoFluxo.at(-1)?.despachoTexto).toContain(
      'não passa na trava do risco crítico: falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável). Voltou para a unidade ajustar.'
    );
  });
});
