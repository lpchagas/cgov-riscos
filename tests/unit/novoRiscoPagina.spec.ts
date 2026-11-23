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
import { fichaParaJson } from '../../src/services/dados/conversores';
import { useToast } from '../../src/composables/useToast';
import { CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import { dadosDeRisco, dadosExemplo, dadosParaFicha, dadosVazios, validarEtapa } from '../../src/utils/formularioRisco';
import type { FichaRisco } from '../../src/types/radar.types';
import { ajudaTravaCritico } from '../../src/utils/travaRiscoCritico';
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

  // Subcategoria em branco é "sem subcategoria": vai como null (o banco
  // grava nulo e o gatilho devolve a mensagem RADAR), nunca como ''. Com '',
  // o par (5, '') iria para a chave estrangeira e voltaria um erro genérico.
  it('Integridade com subcategoria em branco não leva \'\' para a ficha', () => {
    const base = { ...dadosExemplo('obj-1'), categoriaId: idCategoria('Integridade') };
    expect(dadosParaFicha({ ...base, subcategoriaIntegridade: '' }, { ehIntegridade: true }).subcategoriaIntegridade).toBeNull();
    expect(dadosParaFicha({ ...base, subcategoriaIntegridade: '   ' }, { ehIntegridade: true }).subcategoriaIntegridade).toBeNull();
    expect(dadosParaFicha({ ...base, subcategoriaIntegridade: 'Nepotismo' }, { ehIntegridade: true }).subcategoriaIntegridade).toBe('Nepotismo');
  });

  // A própria ficha montada já diz "sem subcategoria" com null explícito
  // (e não com undefined), para o JSON nunca depender de quem a monta depois.
  it('fora da Integridade ou em branco: a ficha leva null explícito e o JSON, subcategoria_integridade: null', () => {
    const operacional = dadosParaFicha({ ...dadosExemplo('obj-1'), categoriaId: idCategoria('Operacional'), subcategoriaIntegridade: 'Nepotismo' }, { ehIntegridade: false });
    expect(operacional.subcategoriaIntegridade).toBeNull();
    expect(fichaParaJson({ objetoId: 'obj-1', ...operacional } as Parameters<typeof fichaParaJson>[0])).toHaveProperty('subcategoria_integridade', null);
    const emBranco = dadosParaFicha({ ...dadosExemplo('obj-1'), categoriaId: idCategoria('Integridade'), subcategoriaIntegridade: '  ' }, { ehIntegridade: true });
    expect(emBranco.subcategoriaIntegridade).toBeNull();
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
  // Garante que uma fonte falsa de um teste nunca vaze para o próximo, mesmo se ele falhar.
  afterEach(() => definirFonteParaTeste(null));

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

  it('etapa 3 mostra os nomes e as descrições dos Quadros 4 e 5, sem percentuais', async () => {
    const { w } = await montar();
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 2; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    const texto = w.find('form').text();
    expect(texto).toContain('1 — Raro');
    expect(texto).toContain('5 — Praticamente certo');
    expect(texto).toContain('Evento esperado, de frequência reduzida');
    expect(texto).toContain('4 — Alto');
    expect(texto).not.toContain('%');
    w.unmount();
  });

  it('avançar sem probabilidade anuncia o erro e foca o primeiro botão do grupo', async () => {
    const { w } = await montar();
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 2; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    // Limpa a probabilidade (o exemplo vem com P = 3) e tenta avançar.
    (w.vm as unknown as { d: { probabilidade: number | null } }).d.probabilidade = null;
    await flushPromises();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('[aria-current="step"]').text()).toContain('Análise');
    expect(w.text()).toContain('Escolha a probabilidade (1 a 5).');
    const primeiro = w.find('fieldset input[type=radio]').element;
    expect(document.activeElement).toBe(primeiro);
    w.unmount();
  });

  it('fluxo completo: cria o risco e envia para validação', async () => {
    setActivePinia(createPinia());
    await useRiscosStore().carregar();
    const { w, router } = await montar();
    const store = useRiscosStore();
    const antes = store.riscos.length;
    await botao(w, 'Preencher com exemplo').trigger('click');
    // LAC-03: o risco do exemplo é crítico e exige KRI completo. Na etapa 4,
    // a pessoa preenche os campos do KRI pela tela (esvaziamos os do exemplo antes).
    for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    const campo = (rotulo: string) => w.findAll('label').find((l) => l.text().startsWith(rotulo))!.attributes('for')!;
    for (const r of ['Fórmula de cálculo', 'Fonte dos dados', 'Limite de alerta', 'Responsável pelo monitoramento']) await w.find(`#${campo(r)}`).setValue('');
    await w.find(`#${campo('Periodicidade de monitoramento')}`).setValue('');
    await w.find('form').trigger('submit'); // tenta enviar com o KRI incompleto
    await flushPromises();
    expect(w.text()).toContain('precisa de um KRI completo');
    expect(store.riscos.length).toBe(antes);
    await w.find(`#${campo('Fórmula de cálculo')}`).setValue('itens conformes / total');
    await w.find(`#${campo('Fonte dos dados')}`).setValue('Processos SEI');
    await w.find(`#${campo('Periodicidade de monitoramento')}`).setValue('Mensal');
    await w.find(`#${campo('Limite de alerta')}`).setValue('Abaixo de 90%');
    await w.find(`#${campo('Responsável pelo monitoramento')}`).setValue('Chefe da unidade');
    await w.find('form').trigger('submit');
    await flushPromises();
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

  describe('KRI da etapa 4 (LAC-03)', () => {
    type VmKri = { d: { objetoId: string; kriExistenteId: string; nomeKri: string } };
    /** Risco novo no objeto do Anexo II, parado na etapa 4. */
    async function ateEtapa4NoObjeto() {
      const montado = await montar();
      await botao(montado.w, 'Preencher com exemplo').trigger('click');
      (montado.w.vm as unknown as VmKri).d.objetoId = 'obj-anexo-ii';
      for (let i = 0; i < 3; i++) { await montado.w.find('form').trigger('submit'); await flushPromises(); }
      expect(montado.w.find('[aria-current="step"]').text()).toContain('Tratamento');
      return montado;
    }

    it('lista os KRIs do objeto (nome e códigos dos riscos) e o compartilhado aparece uma vez', async () => {
      const { w } = await ateEtapa4NoObjeto();
      const lista = w.findAll('select').find((s) => s.find('option[value="kri-anexo-ii-2"]').exists())!;
      expect(lista).toBeTruthy();
      expect(lista.findAll('option[value="kri-anexo-ii-2"]')).toHaveLength(1);
      expect(lista.find('option[value="kri-anexo-ii-2"]').text()).toContain('riscos: RADAR-2026-001, RADAR-2026-004');
      w.unmount();
    });

    it('escolher um KRI compartilhado deixa os campos só leitura; liberar a edição mostra o aviso fixo', async () => {
      const { w } = await ateEtapa4NoObjeto();
      const lista = w.findAll('select').find((s) => s.find('option[value="kri-anexo-ii-2"]').exists())!;
      await lista.setValue('kri-anexo-ii-2');
      const fonte = w.find(`#${w.findAll('label').find((l) => l.text().startsWith('Fonte dos dados'))!.attributes('for')}`);
      expect(fonte.attributes('readonly')).toBeDefined();
      expect(w.text()).not.toContain('Este KRI também serve aos riscos');
      await botao(w, 'Editar a definição deste KRI').trigger('click');
      expect(fonte.attributes('readonly')).toBeUndefined();
      expect(w.text()).toContain('Este KRI também serve aos riscos RADAR-2026-001, RADAR-2026-004; alterar muda o indicador de todos eles e reabre os aprovados.');
      w.unmount();
    });

    it('risco novo com KRI da lista: grava só a ligação (id + apenasLigar), sem recriar o KRI', async () => {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      definirFonteParaTeste({ ...base, salvarFicha });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await ateEtapa4NoObjeto();
      const lista = w.findAll('select').find((s) => s.find('option[value="kri-anexo-ii-2"]').exists())!;
      await lista.setValue('kri-anexo-ii-2');
      await botao(w, 'Salvar rascunho').trigger('click');
      await flushPromises();
      expect(salvarFicha).toHaveBeenCalledTimes(1);
      expect(salvarFicha.mock.calls[0][0].kris).toMatchObject([{ id: 'kri-anexo-ii-2', apenasLigar: true }]);
      w.unmount();
    });

    it('rascunho continua livre: risco crítico com KRI incompleto grava como rascunho', async () => {
      const { w } = await ateEtapa4NoObjeto();
      const rotulo = w.findAll('label').find((l) => l.text().startsWith('Fonte dos dados'))!;
      await w.find(`#${rotulo.attributes('for')}`).setValue('');
      const store = useRiscosStore();
      const antes = store.riscos.length;
      await botao(w, 'Salvar rascunho').trigger('click');
      await flushPromises();
      expect(store.riscos.length).toBe(antes + 1);
      w.unmount();
    });
  });

  describe('"Salvar e enviar" com envio recusado', () => {
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

    // EDIÇÃO (Review Focus 2): na salvar_ficha_risco, chave OMITIDA = "manter o
    // valor antigo" (jsonb_populate_record). Se a troca Integridade → Operacional
    // não mandasse subcategoria_integridade: null, o banco manteria (2,
    // 'Nepotismo') e a chave estrangeira recusaria com 23503 (erro genérico).
    it('edição: trocar um risco de Integridade (Nepotismo) para Operacional manda subcategoria_integridade: null', async () => {
      const { store, salvarFicha } = await comFonte({});
      const base = { ...dadosExemplo('obj-anexo-ii'), categoriaId: idCategoria('Integridade'), subcategoriaIntegridade: 'Nepotismo' };
      const criado = await store.salvarOuAtualizarRisco(dadosParaFicha(base, { ehIntegridade: true }));
      expect(criado.subcategoriaIntegridade).toBe('Nepotismo');

      const editado = { ...dadosDeRisco(criado), categoriaId: idCategoria('Operacional'), subcategoriaIntegridade: '' };
      await store.salvarOuAtualizarRisco(dadosParaFicha(editado, { ehIntegridade: false, existente: criado }));
      const pacote = salvarFicha.mock.calls[1][0];
      expect(pacote.id).toBe(criado.id);
      expect(fichaParaJson(pacote)).toHaveProperty('subcategoria_integridade', null);
      expect(store.obterRiscoPorId(criado.id)!.subcategoriaIntegridade).toBeUndefined();
    });

    it('trocar Integridade por Operacional limpa a subcategoria', async () => {
      const { salvarFicha } = await comFonte({});
      const { w } = await montar();
      await botao(w, 'Preencher com exemplo').trigger('click');
      await w.find('form').trigger('submit'); // etapa 1 -> etapa 2 (Categoria)
      await flushPromises();
      const seletorCategoria = () => w.findAll('select').find((s) => s.html().includes('Riscos da visitação'))!;
      await seletorCategoria().setValue(String(idCategoria('Integridade')));
      const seletorSub = () => w.findAll('select').find((s) => s.html().includes('Nepotismo'))!;
      await seletorSub().setValue('Nepotismo');
      // Sai de Integridade: a subcategoria some do formulário...
      await seletorCategoria().setValue(String(idCategoria('Operacional')));
      // ...e, se a pessoa voltar para Integridade, o campo está vazio (não "ressuscita").
      await seletorCategoria().setValue(String(idCategoria('Integridade')));
      expect((seletorSub().element as HTMLSelectElement).value).toBe('');
      // Segue por Operacional até salvar: a ficha montada diz "sem subcategoria"
      // com null explícito (assim o JSON leva subcategoria_integridade: null).
      await seletorCategoria().setValue(String(idCategoria('Operacional')));
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      expect(salvarFicha).toHaveBeenCalledTimes(1);
      expect(salvarFicha.mock.calls[0][0].subcategoriaIntegridade).toBeNull();
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
      // P e I são dois grupos de botões de opção; cada grupo (achado pela legenda)
      // tem o SEU valor marcado — assim, trocar P com I na edição reprova o teste.
      const marcadoNoGrupo = (legenda: string) => {
        // `:scope > legend`: só a legenda do PRÓPRIO fieldset (a etapa também é um fieldset).
        const grupo = w.findAll('fieldset').find((f) =>
          f.element.querySelector(':scope > legend')?.textContent?.trim().startsWith(legenda));
        expect(grupo, `grupo "${legenda}"`).toBeTruthy();
        const marcados = grupo!.findAll('input[type=radio]:checked');
        expect(marcados).toHaveLength(1);
        return (marcados[0].element as HTMLInputElement).value;
      };
      expect(marcadoNoGrupo('Probabilidade')).toBe(String(risco.probabilidade));
      expect(marcadoNoGrupo('Impacto')).toBe(String(risco.impacto));
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

    it('aprovado que continua aprovado após a releitura: NÃO diz que voltou para validação', async () => {
      const base = criarFonteDemonstracao('normal');
      // Fonte que grava mas não reabre a validação (nada mudou de verdade).
      definirFonteParaTeste({ ...base, salvarFicha: async (f) => ({ id: f.id ?? '', codigoRadar: 'RADAR-2026-003' }) });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await montar(`/riscos/novo?editar=${idAprovado}`);
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      const { toasts } = useToast();
      const ultima = toasts.value[toasts.value.length - 1].mensagem;
      expect(ultima).toContain('salvo');
      expect(ultima).not.toContain('voltou para validação');
      w.unmount();
    });

    it('recusa de tipo "estado" ao salvar relê o risco (podeEditar/motivo se atualizam)', async () => {
      const base = criarFonteDemonstracao('normal');
      const relerRisco = vi.fn((id: string) => base.relerRisco(id));
      const salvarFicha: FonteDados['salvarFicha'] = async () => { throw new ErroRadar('A ficha mudou enquanto você editava.', 'estado'); };
      definirFonteParaTeste({ ...base, salvarFicha, relerRisco });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await montar(`/riscos/novo?editar=${idAprovado}`);
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      expect(relerRisco).toHaveBeenCalledWith(idAprovado);
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

  describe('Edição: KRI compartilhado com medições (LAC-03)', () => {
    it('desligar um KRI que ainda serve a outro risco não pede confirmação (nada é apagado)', async () => {
      const store = useRiscosStore();
      const id = 'risco-anexo-ii-04';
      const kri = store.obterRiscoPorId(id)!.kris[0];
      expect(kri.riscoIds.length).toBeGreaterThan(1);
      const { w } = await montar(`/riscos/novo?editar=${id}`);
      for (let i = 0; i < 3; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
      const nome = w.findAll('input[type="text"]').find((i) => (i.element as HTMLInputElement).value === kri.nomeIndicador)!;
      await nome.setValue('');
      expect(w.text()).not.toContain('Histórico do KRI');
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // LAC-13 — risco crítico não pode ser "Aceito" (Metodologia 4.5 e Anexo III)
  // -------------------------------------------------------------------------
  // P = 5 e I = 5 com controle Inexistente → Inerente 25 × 1,0 = Residual 25
  // (Extremo). Residual Alto ou Extremo está sempre fora do apetite da DAR,
  // então o risco é crítico (status 'sim') em qualquer categoria.
  describe('Risco crítico na etapa 4 (LAC-13)', () => {
    const ERRO_ACEITAR = 'Risco crítico não pode ser aceito: escolha Mitigar, Compartilhar ou Evitar (Metodologia 4.5 e Anexo III).';
    type VmFormulario = { d: { probabilidade: number | null; impacto: number | null; eficacia: string; estrategia: string } };
    const seletorEstrategia = (w: ReturnType<typeof mount>) => w.findAll('select').find((s) => s.find('option[value="Aceitar"]').exists())!;

    /** Risco novo, preenchido com o exemplo, parado na etapa 3 (Análise). */
    async function ateEtapa3() {
      const montado = await montar();
      await botao(montado.w, 'Preencher com exemplo').trigger('click');
      for (let i = 0; i < 2; i++) { await montado.w.find('form').trigger('submit'); await flushPromises(); }
      expect(montado.w.find('[aria-current="step"]').text()).toContain('Análise');
      return montado;
    }

    it('"Aceitar" fica desabilitado, com ajuda ligada por aria-describedby, e a ação 5W2H aparece', async () => {
      const { w } = await ateEtapa3();
      const vm = w.vm as unknown as VmFormulario;
      vm.d.probabilidade = 5; vm.d.impacto = 5; vm.d.eficacia = 'Inexistente';
      await flushPromises();
      await w.find('form').trigger('submit'); await flushPromises();
      expect(w.find('[aria-current="step"]').text()).toContain('Tratamento');

      const seletor = seletorEstrategia(w);
      const aceitar = seletor.find('option[value="Aceitar"]');
      expect(aceitar.attributes('disabled')).toBeDefined();
      expect(aceitar.text()).toBe('Aceitar — indisponível: risco crítico precisa de tratamento');

      // A ajuda é anunciada junto com a lista (aria-describedby → <p id>).
      const ids = (seletor.attributes('aria-describedby') ?? '').split(' ').filter(Boolean);
      const textos = ids.map((id) => document.getElementById(id)?.textContent?.trim());
      expect(textos).toContain(ajudaTravaCritico('sim'));

      // O bloco da ação aparece — mesmo que o valor guardado ainda seja "Aceitar".
      expect(w.text()).toContain('Ação — o quê');
      vm.d.estrategia = 'Aceitar';
      await flushPromises();
      expect(w.text()).toContain('Ação — o quê');
      w.unmount();
    });

    it('edição de ficha crítica com "Aceitar": "Salvar alterações" mostra o erro e não grava', async () => {
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      // Mesma carteira da demonstração, mas o risco aprovado vira crítico e "Aceito".
      const carregarCarteira: FonteDados['carregarCarteira'] = async () => {
        const carteira = await base.carregarCarteira();
        return {
          ...carteira,
          riscos: carteira.riscos.map((r) => r.id === 'risco-socio-03'
            ? { ...r, probabilidade: 5, impacto: 5, nivelEficaciaControle: 'Inexistente', possuiEvidenciaControle: false, estrategiaPrincipal: 'Aceitar' }
            : r),
        };
      };
      definirFonteParaTeste({ ...base, salvarFicha, carregarCarteira });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();

      const { w } = await montar('/riscos/novo?editar=risco-socio-03');
      await botao(w, 'Salvar alterações').trigger('click');
      await flushPromises();
      expect(w.find('[aria-current="step"]').text()).toContain('Tratamento');
      expect(w.text()).toContain(ERRO_ACEITAR);
      expect(salvarFicha).not.toHaveBeenCalled();
      // O formulário não troca a estratégia sozinho: a pessoa decide.
      expect((seletorEstrategia(w).element as HTMLSelectElement).value).toBe('Aceitar');
      w.unmount();
    });

    it('escolheu "Aceitar" num risco baixo e depois subiu P e I: "Salvar e enviar" recusa', async () => {
      const { w } = await ateEtapa3();
      const store = useRiscosStore();
      const antes = store.riscos.length;
      const vm = w.vm as unknown as VmFormulario;
      vm.d.probabilidade = 1; vm.d.impacto = 1; vm.d.eficacia = 'Inexistente';
      await flushPromises();
      await w.find('form').trigger('submit'); await flushPromises();
      await seletorEstrategia(w).setValue('Aceitar');

      await botao(w, 'Voltar').trigger('click'); await flushPromises();
      vm.d.probabilidade = 5; vm.d.impacto = 5;
      await flushPromises();
      await w.find('form').trigger('submit'); await flushPromises();
      expect(w.find('[aria-current="step"]').text()).toContain('Tratamento');

      await w.find('form').trigger('submit'); await flushPromises(); // "Salvar e enviar"
      expect(w.text()).toContain(ERRO_ACEITAR);
      expect(store.riscos.length).toBe(antes);
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
