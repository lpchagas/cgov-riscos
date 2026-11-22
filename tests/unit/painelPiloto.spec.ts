/**
 * ============================================================================
 * TESTES DO NOVO PAINEL — FASE 2 (`tests/unit/painelPiloto.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Três grupos de testes:
 *   1. As funções de resumo (`painelResumo.ts`), com dados pequenos e uma
 *      data FIXA ("hoje" = 14/11/2026), para o resultado nunca variar.
 *   2. A Matriz 5×5: cada célula precisa mostrar o valor do Quadro 7
 *      (e NÃO P × I) e ser um botão acessível.
 *   3. A página do Painel montada de verdade, com a store de demonstração.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';
import { PERFIS_DEMO_ICMBIO } from '../../src/stores/authStore';
import { createRouter, createMemoryHistory } from 'vue-router';
import type { AcoesFluxo, FichaRisco } from '../../src/types/radar.types';
import { RISCOS_SEMENTE_ANEXO_II } from '../../src/services/dadosSementeAnexoII';
import {
  contarRiscosPorCelula,
  descreverEventoFluxo,
  distribuicaoPorNivelResidual,
  itensDeAtencao,
  maioresRiscosResiduais,
} from '../../src/utils/painelResumo';
import MatrizCalorAssimetrica from '../../src/components/radar/MatrizCalorAssimetrica.vue';
import PainelConsolidadoCgovView from '../../src/views/PainelConsolidadoCgovView.vue';
import { useAuthStore } from '../../src/stores/authStore';

/** Cópia limpa dos riscos de demonstração (cada teste pode alterar a sua). */
const semente = (): FichaRisco[] => JSON.parse(JSON.stringify(RISCOS_SEMENTE_ANEXO_II));
const HOJE = new Date(2026, 10, 14); // 14/11/2026 (mês começa em 0)

// ---------------------------------------------------------------------------
// 1. FUNÇÕES DE RESUMO
// ---------------------------------------------------------------------------
describe('painelResumo', () => {
  it('conta os riscos por célula usando P e I da ficha', () => {
    expect(contarRiscosPorCelula(semente())).toEqual({ '3-5': 1, '2-5': 1, '2-4': 1 });
  });

  it('ordena os maiores residuais do maior para o menor sem alterar a lista original', () => {
    const lista = semente();
    const ordemOriginal = lista.map((r) => r.codigoRadar);
    expect(maioresRiscosResiduais(lista, 2).map((r) => r.nivelResidual)).toEqual([22, 17.1]);
    expect(lista.map((r) => r.codigoRadar)).toEqual(ordemOriginal);
  });

  it('distribui por nível residual usando a classificação gravada (8,4 é Médio)', () => {
    const d = distribuicaoPorNivelResidual(semente());
    expect(d.map((f) => [f.classe, f.quantidade])).toEqual([
      ['Extremo', 2],
      ['Alto', 0],
      ['Médio', 1],
      ['Baixo', 0],
    ]);
    expect(d[0].percentual).toBe(100);
    expect(d[2].percentual).toBe(50);
  });

  /** As `acoes` que a fonte de demonstração devolveria para cada perfil (como o banco faria). */
  async function acoesDoPerfil(papel: keyof typeof PERFIS_DEMO_ICMBIO, riscos: FichaRisco[]) {
    const fonte = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO[papel] });
    const lista = await fonte.acoesNoFluxo(riscos.map((r) => r.id));
    return Object.fromEntries(lista.map((a) => [a.riscoId, a]));
  }

  it('"Precisa da sua atenção" muda conforme o perfil', async () => {
    const lista = semente();
    const tipos = async (papel: Parameters<typeof itensDeAtencao>[1]) =>
      itensDeAtencao(lista, papel, HOJE, await acoesDoPerfil(papel as keyof typeof PERFIS_DEMO_ICMBIO, lista)).map(
        (i) => i.tipo
      );

    // CGOV supervisiona o que está parado no fluxo (itens neutros), sem decidir.
    expect(await tipos('cgov')).toEqual(['validacao', 'homologacao', 'kri', 'prazo', 'prazo']);
    // A Coordenação-Geral vê a SUA fila de validação, não a da Diretoria.
    expect(await tipos('coordenador_geral')).toEqual(['validacao', 'kri', 'prazo', 'prazo']);
    // A Diretoria vê a SUA homologação (e também valida, spec B1 7.1) e não recebe alertas de KRI.
    expect(await tipos('diretor')).toEqual(['validacao', 'homologacao', 'prazo', 'prazo']);
    // O gestor (1ª Linha) não vê filas de aprovação dos degraus de cima.
    expect(await tipos('gestor')).toEqual(['kri', 'prazo', 'prazo']);
  });

  it('fala com a pessoa: "aguardando a sua validação" para a Coordenação-Geral', async () => {
    const lista = semente();
    const [primeiro] = itensDeAtencao(lista, 'coordenador_geral', HOJE, await acoesDoPerfil('coordenador_geral', lista));
    expect(primeiro.titulo).toBe('1 risco aguardando a sua validação');
    expect(primeiro.acao).toBe('Validar agora');
  });

  it('conta e lista só os riscos que a pessoa pode decidir (um acionável, outro não)', () => {
    const [a, b] = semente().filter((r) => r.statusFluxo === 'em_validacao_cg' || r.statusFluxo === 'em_homologacao_dir');
    // Os dois aguardam decisão, mas o banco só libera o primeiro para esta pessoa.
    const dois = [
      { ...a, statusFluxo: 'em_validacao_cg' as const },
      { ...b, statusFluxo: 'em_validacao_cg' as const },
    ];
    const acoes = { [dois[0].id]: { podeValidar: true } as AcoesFluxo, [dois[1].id]: { podeValidar: false } as AcoesFluxo };
    const fila = itensDeAtencao(dois, 'coordenador_geral', HOJE, acoes).find((i) => i.tipo === 'validacao')!;
    expect(fila.titulo).toBe('1 risco aguardando a sua validação');
    expect(fila.detalhe).toBe(dois[0].codigoRadar);
    expect(fila.detalhe).not.toContain(dois[1].codigoRadar);
  });

  it('prazos: mostra dias restantes, a mais urgente primeiro, e marca atrasos', () => {
    const prazos = itensDeAtencao(semente(), 'cgov', HOJE).filter((i) => i.tipo === 'prazo');
    expect(prazos[0].titulo).toMatch(/^Ação vence em 31 dias:/);
    expect(prazos[1].titulo).toMatch(/^Ação vence em 36 dias:/);

    // Um mês depois, a primeira ação já está atrasada.
    const depois = itensDeAtencao(semente(), 'cgov', new Date(2026, 11, 20));
    const atrasada = depois.find((i) => i.tipo === 'prazo' && i.titulo.startsWith('Ação atrasada'));
    expect(atrasada?.tom).toBe('perigo');
  });

  it('descreve eventos do histórico em linguagem simples', () => {
    expect(descreverEventoFluxo({ etapa: 'homologacao_diretoria', acao: 'aprovado_1_clique' })).toBe(
      'homologado pela Diretoria e incluído no Plano'
    );
    expect(descreverEventoFluxo({ etapa: 'submissao_1a_linha', acao: 'submetido' })).toContain('1ª Linha');
  });
});

// ---------------------------------------------------------------------------
// 2. MATRIZ 5×5 (Quadro 7)
// ---------------------------------------------------------------------------
describe('MatrizCalorAssimetrica', () => {
  const rotulo = (w: ReturnType<typeof mount>, p: number, i: number) =>
    w.find(`button[aria-label^="Probabilidade ${p} "][aria-label*="impacto ${i} "]`);

  it('tem 25 botões e lê o valor do Quadro 7, nunca P × I', () => {
    const w = mount(MatrizCalorAssimetrica, { props: { riscos: [] } });
    expect(w.findAll('button.matriz__celula')).toHaveLength(25);
    // Os casos da regra inviolável: P=1,I=5 → 15 e P=5,I=1 → 11 (P × I daria 5 nos dois).
    expect(rotulo(w, 1, 5).text()).toBe('15');
    expect(rotulo(w, 5, 1).text()).toBe('11');
    expect(rotulo(w, 2, 4).text()).toBe('14');
  });

  it('o nome acessível diz nota, nível e quantidade de riscos', () => {
    const w = mount(MatrizCalorAssimetrica, { props: { riscos: semente() } });
    expect(rotulo(w, 3, 5).attributes('aria-label')).toBe(
      'Probabilidade 3 (Provável), impacto 5 (Muito alto): nota 22, Extremo, 1 risco'
    );
  });

  it('os eixos usam os nomes do Quadro 4 e do Quadro 5', () => {
    const w = mount(MatrizCalorAssimetrica, { props: { riscos: [] } });
    expect(w.text()).toContain('Raro');
    expect(w.text()).toContain('Praticamente certo');
    expect(rotulo(w, 1, 5).attributes('aria-label')).toMatch(/^Probabilidade 1 \(Raro\), impacto 5 \(Muito alto\)/);
    expect(w.text()).not.toContain('Muito baixa');
    expect(w.text()).not.toContain('Média');
  });

  it('marca a célula escolhida com aria-pressed e avisa o clique', async () => {
    const w = mount(MatrizCalorAssimetrica, { props: { riscos: [], celulaAtiva: { p: 2, i: 4 } } });
    expect(rotulo(w, 2, 4).attributes('aria-pressed')).toBe('true');
    expect(rotulo(w, 1, 1).attributes('aria-pressed')).toBe('false');
    await rotulo(w, 1, 5).trigger('click');
    expect(w.emitted('selecionar-celula')![0]).toEqual([{ p: 1, i: 5 }]);
  });
});

// ---------------------------------------------------------------------------
// 3. A PÁGINA DO PAINEL
// ---------------------------------------------------------------------------
describe('Painel (página)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  async function montarPainel() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'painel-cgov', component: PainelConsolidadoCgovView, meta: { titulo: 'Painel' } },
        // Rotas de destino dos links (o conteúdo não importa aqui).
        ...['riscos-lista', 'ficha-bowtie-detalhe', 'dar-apetite', 'trilha-auditoria', 'monitoramento-kris', 'validacao-um-clique'].map(
          (name) => ({ path: `/${name}/:id?`, name, component: { template: '<div />' } })
        ),
      ],
    });
    router.push('/');
    await router.isReady();
    const w = mount(PainelConsolidadoCgovView, { global: { plugins: [router] } });
    await flushPromises();
    return w;
  }

  it('tem um único h1 e os 4 indicadores com links para a lista filtrada', async () => {
    const w = await montarPainel();
    expect(w.findAll('h1')).toHaveLength(1);
    const hrefs = w.findAll('.painel__kpis a').map((a) => a.attributes('href'));
    expect(hrefs).toEqual([
      '/riscos-lista',
      '/riscos-lista?critico=sim',
      '/riscos-lista?status=em_validacao_cg',
      '/riscos-lista?status=em_homologacao_dir',
    ]);
  });

  it('não tem mais o simulador da DAR nem a carteira completa (foram para /dar e /riscos)', async () => {
    const w = await montarPainel();
    // O único <select> do Painel é o "Ver como" (perfil de demonstração).
    expect(w.findAll('select').map((s) => s.attributes('id'))).toEqual(['painel-ver-como']);
    expect(w.text()).not.toContain('Lançar Medição');
  });

  it('trocar o perfil no seletor "Ver como" muda "Precisa da sua atenção"', async () => {
    const w = await montarPainel();
    // A CGOV (perfil padrão) só supervisiona: texto neutro, nunca "a sua validação".
    expect(w.text()).toContain('aguardando validação nas unidades');
    expect(w.text()).not.toContain('a sua validação');

    await w.find('select#painel-ver-como').setValue('diretor');
    // No sistema, o App recarrega a carteira ao trocar de perfil (as `acoes` mudam); aqui fazemos o mesmo.
    await useRiscosStore().carregar();
    await flushPromises();
    expect(useAuthStore().usuarioAtual.papel).toBe('diretor');
    expect(w.text()).toContain('aguardando a sua homologação');
    expect(w.text()).not.toContain('Indicador em alerta');
  });

  it('escolher uma célula mostra os riscos dela e o link para a lista filtrada', async () => {
    const w = await montarPainel();
    await w.find('button[aria-label^="Probabilidade 2 (Pouco provável), impacto 4"]').trigger('click');
    const resultado = w.find('[role="status"]');
    expect(resultado.text()).toContain('nota 14 (Alto)');
    expect(resultado.text()).toContain('RADAR-2026-003');
    expect(resultado.find('a.link-acao').attributes('href')).toBe('/riscos-lista?p=2&i=4');
  });

  it('no celular, "Mostrar mais" abre e fecha os itens além dos 3 primeiros (aria-expanded)', async () => {
    const w = await montarPainel();
    const itens = w.findAll('#lista-atencao .atencao__item');
    expect(itens.length).toBeGreaterThan(3); // a demonstração tem pendências suficientes
    const botao = w.find('button.atencao__mais');
    expect(botao.attributes('aria-controls')).toBe('lista-atencao');
    expect(botao.attributes('aria-expanded')).toBe('false');
    expect(botao.text()).toContain(`Mostrar mais ${itens.length - 3}`);

    await botao.trigger('click');
    expect(botao.attributes('aria-expanded')).toBe('true');
    expect(w.find('#lista-atencao').classes()).toContain('atencao--aberta');
    expect(botao.text()).toContain('Mostrar menos');
  });

  it('nunca usa a sigla PGR para o Plano de Gestão de Riscos', async () => {
    const w = await montarPainel();
    expect(w.text()).not.toMatch(/\bPGR\b/);
    expect(w.text()).toContain('Plano de Gestão de Riscos');
  });
});

// ---------------------------------------------------------------------------
// 4. ESTADOS DE CARREGAMENTO, ERRO E VAZIO DO PAINEL (Etapa B3, Tarefa 9)
// ---------------------------------------------------------------------------
describe('Painel (estados da carteira)', () => {
  afterEach(() => definirFonteParaTeste(null));

  async function montarComFonte(fonte: FonteDados) {
    definirFonteParaTeste(fonte);
    setActivePinia(createPinia());
    const store = useRiscosStore();
    await store.carregar();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'painel-cgov', component: PainelConsolidadoCgovView, meta: { titulo: 'Painel' } },
        ...['riscos-lista', 'ficha-bowtie-detalhe', 'dar-apetite', 'trilha-auditoria', 'monitoramento-kris', 'validacao-um-clique'].map(
          (name) => ({ path: `/${name}/:id?`, name, component: { template: '<div />' } })
        ),
      ],
    });
    router.push('/');
    await router.isReady();
    const w = mount(PainelConsolidadoCgovView, { global: { plugins: [router] } });
    await flushPromises();
    return { w, store };
  }

  it('com a fonte em erro, mostra "Não foi possível carregar os riscos" e "Tentar de novo" recarrega', async () => {
    const base = criarFonteDemonstracao('normal');
    let falhar = true;
    const { w, store } = await montarComFonte({
      ...base,
      carregarCarteira: () => (falhar ? Promise.reject(new ErroRadar(MENSAGEM_REDE, 'rede')) : base.carregarCarteira()),
    });
    expect(store.estado).toBe('erro');
    expect(w.find('h1').text()).toBe('Não foi possível carregar os riscos');
    expect(w.findAll('h1')).toHaveLength(1);

    falhar = false;
    await w.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click');
    await flushPromises();
    expect(store.estado).toBe('pronto');
    expect(w.text()).not.toContain('Não foi possível carregar os riscos');
    expect(w.text()).toContain('Riscos mapeados');
  });

  it('com a carteira vazia, mostra estado vazio e nenhuma Matriz com zeros enganosos', async () => {
    const base = criarFonteDemonstracao('normal');
    const { w } = await montarComFonte({
      ...base,
      carregarCarteira: async () => ({ ...(await base.carregarCarteira()), riscos: [] }),
    });
    expect(w.text()).toContain('Nenhum risco no seu alcance');
    expect(w.findAll('button.matriz__celula')).toHaveLength(0);
  });

  it('"Precisa da sua atenção" segue as ações liberadas (acoes), não o perfil', async () => {
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    const { w } = await montarComFonte({
      ...base,
      acoesNoFluxo: async (ids) => (await base.acoesNoFluxo(ids)).map((a) => ({ ...a, podeValidar: true })),
    });
    // O perfil é o do simulador (gestor), mas o banco disse que ele pode validar.
    expect(w.text()).toContain('aguardando a sua validação');
  });
});
