/**
 * ============================================================================
 * TESTES DO ASSISTENTE "NOVO RISCO" — Fase 3 (`tests/unit/novoRiscoPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - regras por etapa (incluindo o Teste de Integridade do Integra+);
 *   - "Continuar" não avança com erro e põe o foco no primeiro campo inválido;
 *   - a prévia mostra a trava de evidência (controle "Forte" sem evidência → Fraco 0,9);
 *   - o fluxo completo cria o risco e o envia para validação da Coordenação-Geral;
 *   - (B3) o seletor de objeto só mostra os objetos em que a pessoa grava;
 *   - (B3) duplo clique em "Salvar" grava UMA vez (botões ocupados com aria-busy);
 *   - (B3) "Editar ficha": `/riscos/novo?editar=<id>` carrega a ficha, grava com o id
 *     e respeita o `podeEditar` vindo do RADAR.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import { useToast } from '../../src/composables/useToast';
import { CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import { dadosDeRisco, dadosExemplo, dadosParaFicha, dadosVazios, validarEtapa } from '../../src/utils/formularioRisco';
import type { FichaRisco } from '../../src/types/radar.types';
import BrBreadcrumb from '../../src/components/govbr/BrBreadcrumb.vue';
import FormularioRiscoView from '../../src/views/FormularioRiscoView.vue';

const CATEGORIAS = CATEGORIAS_QUADRO_2_SEMENTE;
const idCategoria = (nome: string) => CATEGORIAS.find((c) => c.nome === nome)!.id;

describe('validarEtapa', () => {
  it('etapa 1 exige os 4 elementos do Bow Tie e o objeto', () => {
    expect(Object.keys(validarEtapa(1, dadosVazios(), CATEGORIAS)).sort()).toEqual(
      ['causas', 'consequencias', 'evento', 'objetivo', 'objetoId']
    );
    expect(validarEtapa(1, dadosExemplo('obj-anexo-ii'), CATEGORIAS)).toEqual({});
  });

  it('Integridade exige uma das 6 subcategorias do Quadro 3', () => {
    const d = { ...dadosExemplo(), categoriaId: idCategoria('Integridade') };
    expect(validarEtapa(2, d, CATEGORIAS).subcategoriaIntegridade).toBeDefined();
  });

  it('decide sobre terceiros e não é Integridade → exige justificativa (Integra+)', () => {
    const d = { ...dadosExemplo(), decideSobreTerceiros: true };
    expect(validarEtapa(2, d, CATEGORIAS).justificativaNaoIntegridade).toBeDefined();
    d.justificativaNaoIntegridade = 'Decisão técnica vinculada, sem discricionariedade.';
    expect(validarEtapa(2, d, CATEGORIAS)).toEqual({});
  });

  it('evidência marcada exige dizer onde ela está', () => {
    const d = { ...dadosExemplo(), eficacia: 'Forte' as const, descricaoControle: 'Dupla checagem', possuiEvidencia: true };
    expect(validarEtapa(3, d, CATEGORIAS).evidenciaControle).toBeDefined();
  });
});

describe('dadosParaFicha (edição)', () => {
  it('2 controles: o 1º recebe a edição (mesmo id); o 2º vai intacto, com o seu id', () => {
    const c1 = { id: 'c1', descricaoControle: 'Dupla checagem', evidenciaFuncionamento: 'SEI 1', possuiEvidenciaComprovada: true, desenhoAdequado: true, operacaoComprovada: false };
    const c2 = { id: 'c2', descricaoControle: 'Checklist', evidenciaFuncionamento: 'SEI 2', possuiEvidenciaComprovada: false, desenhoAdequado: false, operacaoComprovada: false };
    const existente = {
      id: 'r1', objetoId: 'o1', controlesExistentes: [c1, c2], respostasTratamento: [], kris: [],
      causas: 'a', eventoRisco: 'b', consequencias: 'c', objetivoAfetado: 'd', categoriaId: 2,
      probabilidade: 3, impacto: 4, nivelEficaciaControle: 'Mediano', possuiEvidenciaControle: true, estrategiaPrincipal: 'Aceitar',
    } as unknown as FichaRisco;
    const d = { ...dadosDeRisco(existente), descricaoControle: 'Dupla checagem com assinatura' };
    const parcial = dadosParaFicha(d, { ehIntegridade: false, existente });
    expect(parcial.id).toBe('r1');
    expect(parcial.controlesExistentes).toEqual([
      { ...c1, descricaoControle: 'Dupla checagem com assinatura' }, // id c1, desenho/operação preservados
      c2,
    ]);
  });

  it('risco novo: filhos sem id (vazio) e objeto escolhido', () => {
    const parcial = dadosParaFicha({ ...dadosExemplo('obj-1'), descricaoControle: 'X' }, { ehIntegridade: false });
    expect(parcial.objetoId).toBe('obj-1');
    expect(parcial.controlesExistentes![0].id).toBe('');
    expect(parcial.respostasTratamento![0].id).toBe('');
    expect(parcial.kris![0].id).toBe('');
  });
});

describe('Página Novo risco', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  async function montar(caminho = '/riscos/novo') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
        { path: '/riscos/novo', name: 'novo-risco', component: FormularioRiscoView },
        { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
      ],
    });
    router.push(caminho);
    await router.isReady();
    const w = mount(FormularioRiscoView, { global: { plugins: [router] }, attachTo: document.body });
    await flushPromises();
    return { w, router };
  }
  const botao = (w: ReturnType<typeof mount>, t: string) => w.findAll('button').find((b) => b.text().includes(t))!;

  it('"Continuar" com campos vazios não avança e foca o primeiro erro', async () => {
    const { w } = await montar();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('[aria-current="step"]').text()).toContain('Identificação');
    expect(w.findAll('[role="alert"]').length).toBeGreaterThanOrEqual(5);
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
    w.unmount();
  });

  it('a prévia mostra a trava de evidência (Forte sem evidência vira Fraco 0,9)', async () => {
    const { w } = await montar();
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 2; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    expect(w.find('[aria-current="step"]').text()).toContain('Análise');
    const eficacia = w.findAll('select').find((s) => s.html().includes('Forte (fator 0,5)'))!;
    await eficacia.setValue('Forte');
    await w.find('textarea').setValue('Dupla conferência documental');
    expect(w.find('.previa').text()).toContain('Trava de evidência');
    expect(w.find('.previa').text()).toContain('Fraco');
    w.unmount();
  });

  it('fluxo completo: cria o risco e envia para validação', async () => {
    const { w, router } = await montar();
    const store = useRiscosStore();
    const antes = store.riscos.length;
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 4; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    expect(store.riscos.length).toBe(antes + 1);
    // O nome do objeto agora vem do objeto gravado (fonte de dados), não do
    // texto livre do formulário: achamos o risco novo pelo id da ficha aberta.
    const novo = store.obterRiscoPorId(String(router.currentRoute.value.params.id))!;
    expect(novo.statusFluxo).toBe('em_validacao_cg');
    // P=3, I=4 → Quadro 7 = 18 (nunca 3 × 4 = 12)
    expect(novo.nivelInerente).toBe(18);
    expect(router.currentRoute.value.name).toBe('ficha-bowtie-detalhe');
    w.unmount();
  });

  describe('"Salvar e enviar" com envio recusado', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('grava UMA vez, avisa "Rascunho salvo…, mas não foi enviado" e abre a ficha', async () => {
      // Fonte falsa: grava normalmente, mas recusa o envio.
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      const recusa = new ErroRadar('Esta unidade não tem chefia acima para validar o risco. Procure a CGOV.', 'estado');
      definirFonteParaTeste({ ...base, salvarFicha, enviar: vi.fn().mockRejectedValue(recusa) });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();

      const { w, router } = await montar();
      await botao(w, 'Preencher com exemplo').trigger('click');
      for (let i = 0; i < 4; i++) { await w.find('form').trigger('submit'); await flushPromises(); }

      expect(salvarFicha).toHaveBeenCalledTimes(1);
      const novo = store.riscos.find((r) => r.id === String(router.currentRoute.value.params.id))!;
      expect(router.currentRoute.value.name).toBe('ficha-bowtie-detalhe');
      expect(novo.statusFluxo).toBe('rascunho');
      const { toasts } = useToast();
      expect(toasts.value[toasts.value.length - 1].mensagem).toBe(
        `Rascunho salvo (${novo.codigoRadar}), mas não foi enviado: ${recusa.message}`
      );
      w.unmount();
    });
  });

  describe('Objeto de gestão e gravação (B3)', () => {
    afterEach(() => definirFonteParaTeste(null));

    /** Troca a fonte por uma "espiã" (mesmos dados da demonstração) e recarrega a store. */
    async function comFonte(trocas: Partial<FonteDados>) {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      definirFonteParaTeste({ ...base, salvarFicha, ...trocas });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      return { store, salvarFicha };
    }

    it('o seletor só mostra os objetos de objetosOndeGravo()', async () => {
      await comFonte({ objetosOndeGravo: vi.fn().mockResolvedValue(['obj-fiscalizacao-autos']) });
      const { w } = await montar();
      const seletor = w.find('select');
      const valores = seletor.findAll('option').map((o) => o.attributes('value')).filter((v) => v);
      expect(valores).toEqual(['obj-fiscalizacao-autos']);
      expect(seletor.text()).not.toContain('Autorização Direta');
      w.unmount();
    });

    it('sem objeto em que possa gravar: estado vazio explicando o que fazer', async () => {
      await comFonte({ objetosOndeGravo: vi.fn().mockResolvedValue([]) });
      const { w } = await montar();
      expect(w.text()).toContain('Você ainda não tem objeto de gestão em que possa criar riscos. Procure a CGOV.');
      expect(w.find('form').exists()).toBe(false);
      w.unmount();
    });

    it('a prévia avisa que o valor oficial é calculado pelo RADAR', async () => {
      const { w } = await montar();
      expect(w.find('.previa').text()).toContain('Prévia — o valor oficial é calculado pelo RADAR ao salvar');
      w.unmount();
    });

    it('duplo clique em "Salvar rascunho" grava UMA vez (botão ocupado com aria-busy)', async () => {
      const { salvarFicha } = await comFonte({});
      const { w } = await montar();
      await botao(w, 'Preencher com exemplo').trigger('click');
      const salvarBtn = botao(w, 'Salvar rascunho');
      salvarBtn.trigger('click');
      salvarBtn.trigger('click');
      await w.vm.$nextTick();
      expect(salvarBtn.attributes('aria-busy')).toBe('true');
      await flushPromises();
      expect(salvarFicha).toHaveBeenCalledTimes(1);
      w.unmount();
    });
  });

  describe('"Editar ficha" (/riscos/novo?editar=<id>)', () => {
    afterEach(() => definirFonteParaTeste(null));
    const idAprovado = 'risco-socio-03'; // RADAR-2026-003, aprovado na semente

    it('carrega a ficha nas 4 etapas, com o título "Editar risco <código>"', async () => {
      const store = useRiscosStore();
      const risco = store.obterRiscoPorId(idAprovado)!;
      const { w } = await montar(`/riscos/novo?editar=${idAprovado}`);
      expect(w.find('h1').text()).toBe(`Editar risco ${risco.codigoRadar}`);
      const textareas = () => w.findAll('textarea').map((t) => (t.element as HTMLTextAreaElement).value);
      expect(textareas()).toContain(risco.causas);
      // Etapa 3: P, I e o controle existente vêm da ficha.
      for (let i = 0; i < 2; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      expect(w.find('[aria-current="step"]').text()).toContain('Análise');
      const selects = w.findAll('select').map((s) => (s.element as HTMLSelectElement).value);
      expect(selects).toContain(String(risco.probabilidade));
      expect(selects).toContain(String(risco.impacto));
      expect(textareas()).toContain(risco.controlesExistentes[0].descricaoControle);
      // Etapa 4: ação e KRI.
      await w.find('form').trigger('submit'); await flushPromises();
      expect(textareas()).toContain(risco.respostasTratamento[0].acaoOQue);
      const inputs = w.findAll('input[type="text"]').map((i) => (i.element as HTMLInputElement).value);
      expect(inputs).toContain(risco.kris[0].nomeIndicador);
      w.unmount();
    });

    it('risco aprovado: avisa que volta para validação, grava UMA vez com o id e não oferece "Salvar e enviar"', async () => {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      definirFonteParaTeste({ ...base, salvarFicha });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const { w, router } = await montar(`/riscos/novo?editar=${idAprovado}`);
      expect(w.text()).toContain('Ao salvar, o risco volta para validação da chefia.');
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      expect(w.findAll('button').some((b) => b.text().includes('Salvar e enviar'))).toBe(false);
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      expect(salvarFicha).toHaveBeenCalledTimes(1);
      expect(salvarFicha.mock.calls[0][0].id).toBe(idAprovado);
      // Nenhum filho foi perdido nem duplicado.
      const antes = criarFonteDemonstracao('normal');
      const original = (await antes.carregarCarteira()).riscos.find((r) => r.id === idAprovado)!;
      expect(salvarFicha.mock.calls[0][0].controles).toHaveLength(original.controlesExistentes.length);
      expect(salvarFicha.mock.calls[0][0].kris).toHaveLength(original.kris.length);
      expect(store.obterRiscoPorId(idAprovado)!.statusFluxo).toBe('em_validacao_cg');
      expect(router.currentRoute.value.name).toBe('ficha-bowtie-detalhe');
      w.unmount();
    });

    it('rascunho: "Salvar e enviar" aparece na etapa 4', async () => {
      const store = useRiscosStore();
      const novo = await store.salvarOuAtualizarRisco({
        objetoId: 'obj-anexo-ii', causas: 'causa', eventoRisco: 'evento', consequencias: 'consequência', objetivoAfetado: 'objetivo',
        categoriaId: 2, probabilidade: 3, impacto: 4, estrategiaPrincipal: 'Aceitar', statusFluxo: 'rascunho',
      });
      const { w } = await montar(`/riscos/novo?editar=${novo.id}`);
      expect(w.text()).not.toContain('Ao salvar, o risco volta para validação da chefia.');
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      expect(w.find('[aria-current="step"]').text()).toContain('Tratamento');
      expect(botao(w, 'Salvar e enviar').exists()).toBe(true);
      w.unmount();
    });

    it('podeEditar = false: mostra o motivo e desliga a gravação', async () => {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      const acoesNoFluxo: FonteDados['acoesNoFluxo'] = async (ids) =>
        (await base.acoesNoFluxo(ids)).map((a) => ({ ...a, podeEditar: false, motivo: 'Este risco está em homologação.' }));
      definirFonteParaTeste({ ...base, salvarFicha, acoesNoFluxo });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await montar(`/riscos/novo?editar=${idAprovado}`);
      expect(w.text()).toContain('Este risco está em homologação.');
      const salvarBtn = botao(w, 'Salvar alterações');
      expect(salvarBtn.attributes('disabled')).toBeDefined();
      await salvarBtn.trigger('click');
      await flushPromises();
      expect(salvarFicha).not.toHaveBeenCalled();
      w.unmount();
    });

    it('id desconhecido ou fora do alcance: "Risco não encontrado" com link para a lista', async () => {
      const { w } = await montar('/riscos/novo?editar=nao-existe');
      expect(w.find('h1').text()).toBe('Risco não encontrado');
      expect(w.find('a[href="/riscos"]').exists()).toBe(true);
      expect(w.find('form').exists()).toBe(false);
      w.unmount();
    });

    it('enquanto a carteira carrega, não diz "não encontrado"', async () => {
      setActivePinia(createPinia()); // store nova: 'ocioso'
      const { w } = await montar(`/riscos/novo?editar=${idAprovado}`);
      expect(w.text()).not.toContain('Risco não encontrado');
      expect(w.find('[role="status"]').text()).toContain('Carregando');
      w.unmount();
    });
  });

  describe('Edição: KRI com medições', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('apagar o nome do KRI com medições exige confirmação antes de salvar', async () => {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      definirFonteParaTeste({ ...base, salvarFicha });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const id = 'risco-socio-03';
      const n = store.obterRiscoPorId(id)!.kris[0].medicoes.length;
      expect(n).toBeGreaterThan(0);

      const { w } = await montar(`/riscos/novo?editar=${id}`);
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      const kri = w.findAll('input[type="text"]').find((i) => (i.element as HTMLInputElement).value === store.obterRiscoPorId(id)!.kris[0].nomeIndicador)!;
      await kri.setValue('');
      const medicoes = n === 1 ? '1 medição registrada' : `${n} medições registradas`;
      expect(w.text()).toContain(`Este KRI tem ${medicoes}; ao salvar sem ele, o histórico será apagado.`);

      // Sem confirmar: não grava.
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      expect(salvarFicha).not.toHaveBeenCalled();

      // Confirmando: grava sem o KRI.
      await w.find('#confirma-apagar-medicoes').setValue(true);
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      expect(salvarFicha).toHaveBeenCalledTimes(1);
      expect(salvarFicha.mock.calls[0][0].kris).toHaveLength(0); // a semente tem 1 KRI neste risco
      w.unmount();
    });
  });

  it('a trilha (breadcrumb) diz "Editar risco" no modo edição', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'painel-cgov', component: { template: '<div />' } },
        { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
        { path: '/riscos/novo', name: 'novo-risco', component: { template: '<div />' }, meta: { titulo: 'Novo risco', migalhaPai: { rotulo: 'Riscos', nome: 'riscos-lista' } } },
      ],
    });
    router.push('/riscos/novo?editar=risco-socio-03');
    await router.isReady();
    const w = mount(BrBreadcrumb, { global: { plugins: [router] } });
    expect(w.find('[aria-current="page"]').text()).toBe('Editar risco');
    await router.push('/riscos/novo');
    await flushPromises();
    expect(w.find('[aria-current="page"]').text()).toBe('Novo risco');
  });
});
