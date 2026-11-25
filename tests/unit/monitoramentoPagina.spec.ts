/**
 * ============================================================================
 * TESTES DA PÁGINA MONITORAMENTO — Fase 3 (`tests/unit/monitoramentoPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - as abas seguem o padrão WAI-ARIA (tablist/tab/tabpanel, setas do teclado);
 *   - `?aba=plano` abre direto no Plano de ação (link vindo do Painel);
 *   - registrar leitura exige o valor e NÃO reabre a validação do risco;
 *   - o semáforo usa a leitura MAIS RECENTE (não a primeira da lista).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore, definirFonteParaTeste } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import MonitoramentoKriPlanoAcaoView from '../../src/views/MonitoramentoKriPlanoAcaoView.vue';
import { useAuthStore } from '../../src/stores/authStore';
import { dataCurta } from '../../src/utils/painelResumo';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import type { IndicadorKri } from '../../src/types/radar.types';

async function montar(caminho = '/monitoramento') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/monitoramento', name: 'monitoramento-kris', component: MonitoramentoKriPlanoAcaoView },
      { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
      // Como no app: endereço sem rota (ex.: /comunicacoes, que chega na Fase 3) cai no "pega-tudo".
      { path: '/:qualquer(.*)*', component: { template: '<div />' } },
    ],
  });
  router.push(caminho);
  await router.isReady();
  const w = mount(MonitoramentoKriPlanoAcaoView, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { w, router };
}

describe('Página Monitoramento', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  it('abas acessíveis: tablist, aba selecionada e troca pelas setas', async () => {
    const { w, router } = await montar();
    const abas = w.findAll('[role="tab"]');
    expect(w.find('[role="tablist"]').exists()).toBe(true);
    expect(abas.map((a) => a.attributes('aria-selected'))).toEqual(['true', 'false']);
    expect(w.find('[role="tabpanel"]').attributes('aria-labelledby')).toBe(abas[0].attributes('id'));
    await abas[0].trigger('keydown', { key: 'ArrowRight' });
    await flushPromises();
    expect(router.currentRoute.value.query.aba).toBe('plano');
    w.unmount();
  });

  it('?aba=plano abre direto no Plano de ação', async () => {
    const { w } = await montar('/monitoramento?aba=plano');
    expect(w.find('[role="tab"][aria-selected="true"]').text()).toContain('Plano de ação');
    expect(w.find('caption').text()).toContain('Ações do plano');
    w.unmount();
  });

  it('progresso do plano: o leitor de tela ouve o mesmo texto que aparece na tela', async () => {
    // Defeito achado pela varredura axe (aria-prohibited-attr): o texto ficava num `aria-label`
    // de um <p>, que leitores de tela ignoram, e o texto visível estava escondido com aria-hidden.
    const { w } = await montar('/monitoramento?aba=plano');
    const progresso = w.find('.progresso');
    expect(progresso.attributes('aria-label')).toBeUndefined();
    const texto = progresso.findAll(':scope > span').at(-1)!; // o texto vem depois da barra
    expect(texto.attributes('aria-hidden')).toBeUndefined();
    expect(texto.text()).toMatch(/^\d+ de \d+ ações concluídas$/);
    // A barra colorida é só decoração: continua escondida do leitor de tela.
    expect(progresso.find('.progresso__trilho').attributes('aria-hidden')).toBe('true');
    w.unmount();
  });

  it('registrar leitura exige valor e não reabre a validação do risco aprovado', async () => {
    const store = useRiscosStore();
    const aprovado = store.riscos.find((r) => r.statusFluxo === 'aprovado' && r.kris.length)!;
    const kri = aprovado.kris[0];
    const antes = kri.medicoes.length;

    const { w } = await montar();
    const cartao = w.findAll('.kri').find((c) => c.text().includes(kri.nomeIndicador))!;
    await cartao.findAll('button').find((b) => b.text().includes('Registrar leitura'))!.trigger('click');
    await flushPromises();

    const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
    const salvar = () => [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Salvar leitura'))!.click();
    salvar();
    await flushPromises();
    expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('Informe o valor');
    expect(kri.medicoes).toHaveLength(antes);

    const valor = [...dialogo.querySelectorAll('input[type="text"]')][0] as HTMLInputElement;
    valor.value = '95%';
    valor.dispatchEvent(new Event('input'));
    salvar();
    await flushPromises();
    // Depois de gravar, a store RELÊ o risco: os indicadores chegam como objetos
    // novos, então procuramos o KRI de novo na store (a expectativa é a mesma).
    const kriRelido = store.obterRiscoPorId(aprovado.id)!.kris.find((k) => k.id === kri.id)!;
    expect(kriRelido.medicoes).toHaveLength(antes + 1);
    expect(aprovado.statusFluxo).toBe('aprovado');
    w.unmount();
  });

  it('o semáforo usa a leitura mais recente', async () => {
    const store = useRiscosStore();
    const r = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
    const kri = r.kris[0];
    // Leitura antiga e fora de ordem no fim da lista: não pode mandar no semáforo.
    kri.medicoes.push({ id: 'antiga', dataMedicao: '2020-01-01', valorApurado: '99%', emAlerta: false });
    const { w } = await montar();
    const cartao = w.findAll('.kri').find((c) => c.text().includes(kri.nomeIndicador))!;
    const ultima = [...kri.medicoes].sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao))[0];
    expect(cartao.text()).toContain(ultima.emAlerta ? 'Em alerta' : 'Dentro do limite');
    w.unmount();
  });

  describe('KRI compartilhado (LAC-03)', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('o KRI ligado a dois riscos aparece uma vez, com os dois códigos', async () => {
      const { w } = await montar();
      const cartoes = w.findAll('.kri').filter((c) => c.text().includes('Percentual de processos críticos com substituto capacitado ativo'));
      expect(cartoes).toHaveLength(1);
      expect(cartoes[0].text()).toContain('Riscos:');
      expect(cartoes[0].text()).toContain('RADAR-2026-001');
      expect(cartoes[0].text()).toContain('RADAR-2026-004');
      // O contador de indicadores conta cada KRI uma só vez.
      const ids = new Set(useRiscosStore().riscos.flatMap((r) => r.kris.map((k) => k.id)));
      expect(w.findAll('.kri')).toHaveLength(ids.size);
      w.unmount();
    });

    it('registrar leitura no KRI compartilhado grava uma vez e aparece nos dois riscos', async () => {
      const base = criarFonteDemonstracao('normal');
      let chamadas = 0;
      definirFonteParaTeste({
        ...base,
        registrarMedicao: async (kriId, m) => { chamadas++; return base.registrarMedicao(kriId, m); },
      });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const { w } = await montar();
      const cartao = w.findAll('.kri').find((c) => c.text().includes('Percentual de processos críticos com substituto'))!;
      await cartao.findAll('button').find((b) => b.text().includes('Registrar leitura'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const valor = dialogo.querySelector('input[type="text"]') as HTMLInputElement;
      valor.value = '90%';
      valor.dispatchEvent(new Event('input'));
      [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Salvar leitura'))!.click();
      await flushPromises();
      expect(chamadas).toBe(1);
      for (const codigo of ['RADAR-2026-001', 'RADAR-2026-004']) {
        const r = store.riscos.find((x) => x.codigoRadar === codigo)!;
        expect(r.kris.find((k) => k.id === 'kri-anexo-ii-2')!.medicoes.map((m) => m.valorApurado)).toContain('90%');
      }
      w.unmount();
    });

    it('KRI sem limite de alerta mostra "limite não definido" (e o mesmo para meta e periodicidade)', async () => {
      const store = useRiscosStore();
      const kri = store.riscos.flatMap((r) => r.kris).find((k) => k.id === 'kri-anexo-ii-2')!;
      for (const r of store.riscos) for (const k of r.kris) if (k.id === kri.id) {
        k.limiteAlerta = undefined;
        k.limiteOperador = undefined;
        k.limiteValor = undefined;
        k.metaAlvo = undefined;
        k.periodicidade = undefined;
      }
      const { w } = await montar();
      const cartao = w.findAll('.kri').find((c) => c.text().includes(kri.nomeIndicador))!;
      expect(cartao.text()).toContain('limite não definido');
      expect(cartao.text()).toContain('meta não definida');
      expect(cartao.text()).toContain('periodicidade não definida');
      expect(cartao.text()).not.toContain('undefined');
      w.unmount();
    });
  });

  describe('falha da fonte (B3)', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('medição recusada mostra a mensagem e mantém o formulário preenchido', async () => {
      const base = criarFonteDemonstracao('normal');
      definirFonteParaTeste({
        ...base,
        registrarMedicao: async () => { throw new ErroRadar('Sem permissão para lançar medição neste indicador.', 'permissao'); },
      });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const aprovado = store.riscos.find((r) => r.statusFluxo === 'aprovado' && r.kris.length)!;
      const kri = aprovado.kris[0];
      const antes = kri.medicoes.length;

      const { w } = await montar();
      const cartao = w.findAll('.kri').find((c) => c.text().includes(kri.nomeIndicador))!;
      await cartao.findAll('button').find((b) => b.text().includes('Registrar leitura'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const valor = dialogo.querySelector('input[type="text"]') as HTMLInputElement;
      valor.value = '77%';
      valor.dispatchEvent(new Event('input'));
      [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Salvar leitura'))!.click();
      await flushPromises();

      expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('Sem permissão para lançar medição');
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect((dialogo.querySelector('input[type="text"]') as HTMLInputElement).value).toBe('77%');
      expect(store.obterRiscoPorId(aprovado.id)!.kris.find((k) => k.id === kri.id)!.medicoes).toHaveLength(antes);
      w.unmount();
    });

    it('mudança de situação recusada avisa pelo aviso rápido e a ação não muda', async () => {
      const base = criarFonteDemonstracao('normal');
      definirFonteParaTeste({
        ...base,
        atualizarStatusTratamento: async () => { throw new ErroRadar('Só quem responde pela ação muda a situação.', 'permissao'); },
      });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const { w } = await montar('/monitoramento?aba=plano');
      const seletor = w.find('select.situacao');
      const antes = (seletor.element as HTMLSelectElement).value;
      await seletor.setValue(antes === 'concluida' ? 'em_andamento' : 'concluida');
      await flushPromises();
      const { useToast } = await import('../../src/composables/useToast');
      const ultimo = useToast().toasts.value.at(-1)!;
      expect(ultimo.mensagem).toContain('Só quem responde pela ação');
      // O seletor volta ao valor anterior (a tela não fica mostrando uma situação que não foi gravada).
      expect((w.find('select.situacao').element as HTMLSelectElement).value).toBe(antes);
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // P-02: alerta do KRI, prazo, filtro, ordem, páginas e atalhos (LAC-03)
  // Semente: kri-anexo-ii-1 vencido · kri-integra-1 dia 3 · kri-socio-1 comunicado
  //          · kri-anexo-ii-3 sem limite numérico · kri-anexo-ii-2 dentro do limite.
  // -------------------------------------------------------------------------
  describe('P-02: tratar alerta do KRI', () => {
    afterEach(() => {
      definirFonteParaTeste(null);
      useAuthStore().alternarPerfilDemo('cgov');
    });

    const nomeDe = (kriId: string) =>
      useRiscosStore().riscos.flatMap((r) => r.kris).find((k) => k.id === kriId)!.nomeIndicador;
    const cartaoDe = (w: VueWrapper, kriId: string): DOMWrapper<Element> =>
      w.findAll('.kri').find((c) => c.text().includes(nomeDe(kriId)))!;
    const alertaDe = (kriId: string) => useRiscosStore().alertasKri.find((a) => a.kriId === kriId)!;
    const opcaoFiltro = (w: VueWrapper, rotulo: string) =>
      w.findAll('[role="radiogroup"] [role="radio"]').find((b) => b.text().startsWith(rotulo))!;

    it('"Alertas abertos" conta só os alertas abertos e leva ao filtro "Em alerta"', async () => {
      const { w } = await montar();
      const card = w.findAll('.stat-card').find((c) => c.text().includes('Alertas abertos'))!;
      // Vencido + dia 3 = 2 (o comunicado já foi encerrado e não conta).
      expect(card.find('.stat-card__valor').text()).toBe('2');
      expect(card.attributes('href')).toBe('/monitoramento?situacao=alerta');
      w.unmount();
    });

    it('filtro Todos · Em alerta · Sem limite · Dentro do limite, com contagens', async () => {
      const { w } = await montar();
      const rotulos = w.findAll('[role="radiogroup"] [role="radio"]').map((b) => b.text());
      expect(rotulos).toEqual(['Todos (5)', 'Em alerta (2)', 'Sem limite (1)', 'Dentro do limite (1)']);
      await opcaoFiltro(w, 'Em alerta').trigger('click');
      await flushPromises();
      expect(w.findAll('.kri')).toHaveLength(2);
      await opcaoFiltro(w, 'Sem limite').trigger('click');
      await flushPromises();
      expect(w.findAll('.kri').map((c) => c.text().includes(nomeDe('kri-anexo-ii-3')))).toEqual([true]);
      w.unmount();
    });

    it('?situacao=alerta abre já filtrado (destino do "Alertas abertos")', async () => {
      const { w } = await montar('/monitoramento?situacao=alerta');
      expect(w.findAll('.kri')).toHaveLength(2);
      expect(opcaoFiltro(w, 'Em alerta').attributes('aria-checked')).toBe('true');
      w.unmount();
    });

    it('ordem por urgência: vencido → alerta → comunicado → sem limite → dentro', async () => {
      const { w } = await montar();
      const ordem = ['kri-anexo-ii-1', 'kri-integra-1', 'kri-socio-1', 'kri-anexo-ii-3', 'kri-anexo-ii-2'];
      const textos = w.findAll('.kri').map((c) => c.text());
      expect(textos.map((t) => ordem.findIndex((id) => t.includes(nomeDe(id))))).toEqual([0, 1, 2, 3, 4]);
      w.unmount();
    });

    it('faixa "Em alerta desde ... · dia N de 10 dias úteis (vence em ...)" em tom de aviso', async () => {
      const { w } = await montar();
      const a = alertaDe('kri-integra-1');
      const faixa = cartaoDe(w, 'kri-integra-1').find('.faixa-alerta');
      expect(faixa.classes()).toContain('faixa-alerta--aviso');
      expect(faixa.text()).toContain(
        `Em alerta desde ${dataCurta(a.cienciaEm)} · dia 3 de 10 dias úteis (vence em ${dataCurta(a.venceEm)})`
      );
      w.unmount();
    });

    it('no dia da ciência a faixa diz "dia 0 de 10" (número do banco, sem somar 1)', async () => {
      const { w } = await montar();
      useRiscosStore().alertasKri.find((a) => a.kriId === 'kri-integra-1')!.diaAtual = 0;
      await flushPromises();
      expect(cartaoDe(w, 'kri-integra-1').find('.faixa-alerta').text()).toContain('dia 0 de 10 dias úteis');
      w.unmount();
    });

    it('prazo vencido: faixa em tom de perigo, "Prazo vencido há N dias úteis"', async () => {
      const { w } = await montar();
      const faixa = cartaoDe(w, 'kri-anexo-ii-1').find('.faixa-alerta');
      expect(faixa.classes()).toContain('faixa-alerta--perigo');
      expect(faixa.text()).toContain(`Prazo vencido há ${alertaDe('kri-anexo-ii-1').diasUteisVencido} dias úteis`);
      w.unmount();
    });

    it('alerta comunicado: faixa em tom de sucesso, sem atalhos', async () => {
      const { w } = await montar();
      const faixa = cartaoDe(w, 'kri-socio-1').find('.faixa-alerta');
      expect(faixa.classes()).toContain('faixa-alerta--sucesso');
      expect(faixa.text()).toContain(`Alerta comunicado à CGOV em ${dataCurta(alertaDe('kri-socio-1').encerradoEm!)}`);
      expect(faixa.findAll('a')).toHaveLength(0);
      w.unmount();
    });

    it('alerta comunicado vale até a próxima leitura: leitura nova dentro do limite volta a "Dentro do limite" (D-5)', async () => {
      const { w } = await montar();
      expect(cartaoDe(w, 'kri-socio-1').find('.faixa-alerta').exists()).toBe(true);
      await cartaoDe(w, 'kri-socio-1').findAll('button').find((b) => b.text().includes('Registrar leitura'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const campo = dialogo.querySelector('input[type="text"]') as HTMLInputElement;
      campo.value = '95%'; // limite: alerta quando menor que 90 %
      campo.dispatchEvent(new Event('input'));
      [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Salvar leitura'))!.click();
      await flushPromises();
      const cartao = cartaoDe(w, 'kri-socio-1');
      expect(cartao.find('.faixa-alerta').exists()).toBe(false);
      expect(cartao.text()).toContain('Dentro do limite');
      w.unmount();
    });

    it('um "Reavaliar" por risco ligado (vai à ficha) e um "Comunicar à CGOV" (vai à P-03)', async () => {
      const { w } = await montar();
      const faixa = cartaoDe(w, 'kri-anexo-ii-1').find('.faixa-alerta');
      const reavaliar = faixa.findAll('a').filter((a) => a.text() === 'Reavaliar');
      expect(reavaliar).toHaveLength(1);
      expect(reavaliar[0].attributes('aria-label')).toBe('Reavaliar RADAR-2026-001');
      expect(reavaliar[0].attributes('href')).toBe('/riscos/risco-anexo-ii-01');
      const comunicar = faixa.findAll('a').find((a) => a.text() === 'Comunicar à CGOV')!;
      expect(comunicar.attributes('href')).toBe('/comunicacoes?alerta=alerta-anexo-ii-1');
      expect(comunicar.attributes('aria-label')).toContain(nomeDe('kri-anexo-ii-1'));
      w.unmount();
    });

    it('AUDIT vê a faixa e o prazo, sem os botões', async () => {
      useAuthStore().alternarPerfilDemo('auditoria');
      const { w } = await montar();
      const faixa = cartaoDe(w, 'kri-integra-1').find('.faixa-alerta');
      expect(faixa.text()).toContain('dia 3 de 10 dias úteis');
      expect(faixa.findAll('a')).toHaveLength(0);
      expect(faixa.text()).not.toContain('Reavaliar');
      expect(faixa.text()).not.toContain('Comunicar à CGOV');
      w.unmount();
    });

    it('"Ver detalhes" abre e fecha meta, responsável e histórico', async () => {
      const { w } = await montar();
      const detalhes = cartaoDe(w, 'kri-anexo-ii-1').find('details.kri__detalhes');
      expect(detalhes.find('summary').text()).toContain('Ver detalhes');
      expect(detalhes.text()).toContain('Meta');
      expect(detalhes.text()).toContain('Responsável');
      expect(detalhes.text()).toContain('Histórico');
      w.unmount();
    });

    it('o cartão mostra o limite por extenso ("menor que 70 %") e o caso "a converter"', async () => {
      const { w } = await montar();
      expect(cartaoDe(w, 'kri-anexo-ii-1').text()).toContain('Alerta quando menor que 70 %');
      const aConverter = cartaoDe(w, 'kri-anexo-ii-3');
      expect(aConverter.text()).toContain('Acima de 5%');
      expect(aConverter.text()).toContain('Limite a converter');
      w.unmount();
    });

    it('10 cartões por página, com números de página; o que pede ação fica na página 1', async () => {
      const store = useRiscosStore();
      const r = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-004')!;
      const extras: IndicadorKri[] = Array.from({ length: 12 }, (_, i) => ({
        id: `kri-extra-${i}`,
        objetoId: r.objetoId,
        riscoIds: [r.id],
        nomeIndicador: `Indicador extra ${String(i).padStart(2, '0')}`,
        limiteOperador: '<',
        limiteValor: 10,
        medicoes: [],
      }));
      r.kris.push(...extras);
      const { w } = await montar();
      expect(w.findAll('.kri')).toHaveLength(10);
      const nav = w.find('nav.paginacao');
      expect(nav.attributes('aria-label')).toBe('Páginas dos indicadores');
      const paginas = nav.findAll('button').filter((b) => /^\d+$/.test(b.text()));
      expect(paginas.map((b) => b.text())).toEqual(['1', '2']);
      expect(paginas[0].attributes('aria-current')).toBe('page');
      // Os dois alertas abertos estão na página 1.
      expect(w.text()).toContain(nomeDe('kri-anexo-ii-1'));
      expect(w.text()).toContain(nomeDe('kri-integra-1'));
      await paginas[1].trigger('click');
      await flushPromises();
      expect(w.findAll('.kri')).toHaveLength(7);
      expect(w.find('nav.paginacao button[aria-current="page"]').text()).toBe('2');
      // Trocar o filtro volta para a página 1.
      await opcaoFiltro(w, 'Em alerta').trigger('click');
      await flushPromises();
      expect(w.findAll('.kri')).toHaveLength(2);
      expect(w.find('nav.paginacao').exists()).toBe(false);
      w.unmount();
    });

    // I-4 / R21 (fim da Fase 3): o banco exige risco na comunicação de alerta (alerta_kri).
    // KRI órfão nunca conseguiria comunicar: no lugar do botão, a orientação.
    it('KRI sem risco ligado (órfão) com alerta continua na lista, com a orientação no lugar do "Comunicar à CGOV"', async () => {
      const base = criarFonteDemonstracao('normal');
      definirFonteParaTeste({
        ...base,
        // Simula o banco: o KRI do alerta "dia 3" perdeu o seu único risco.
        carregarCarteira: async () => {
          const c = await base.carregarCarteira();
          const orfao = c.riscos.flatMap((r) => r.kris).find((k) => k.id === 'kri-integra-1')!;
          for (const r of c.riscos) r.kris = r.kris.filter((k) => k.id !== 'kri-integra-1');
          return { ...c, krisSemRisco: [{ ...orfao, riscoIds: [], totalRiscos: 0 }] };
        },
      });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await montar();
      const cartao = w.findAll('.kri').find((c) => c.text().includes('Percentual de processos sancionadores revisados'))!;
      expect(cartao.text()).toContain('Sem risco ligado');
      const faixa = cartao.find('.faixa-alerta');
      expect(faixa.text()).toContain('dia 3 de 10 dias úteis');
      expect(faixa.findAll('a')).toHaveLength(0);
      expect(faixa.text()).toContain('Ligue o indicador a um risco para comunicar à CGOV');
      // Sem risco ligado não há onde gravar a leitura: o botão some.
      expect(cartao.findAll('button').some((b) => b.text().includes('Registrar leitura'))).toBe(false);
      w.unmount();
    });

    // I-4 (revisão de fim da Fase 2): pela RLS, o KRI é lido pelo OBJETO e a ligação,
    // pelo risco. Um KRI cujos riscos estão fora da visão da pessoa chega sem riscos
    // visíveis, mas com `totalRiscos` > 0: não é "sem risco ligado".
    it('KRI com os riscos fora da visão: a faixa diz isso (sem "Reavaliar") e o cartão não diz "Sem risco ligado"', async () => {
      const base = criarFonteDemonstracao('normal');
      definirFonteParaTeste({
        ...base,
        carregarCarteira: async () => {
          const c = await base.carregarCarteira();
          const oculto = c.riscos.flatMap((r) => r.kris).find((k) => k.id === 'kri-integra-1')!;
          for (const r of c.riscos) r.kris = r.kris.filter((k) => k.id !== 'kri-integra-1');
          return { ...c, krisSemRisco: [{ ...oculto, riscoIds: [], totalRiscos: 2 }] };
        },
      });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();
      const { w } = await montar();
      const cartao = w.findAll('.kri').find((c) => c.text().includes('Percentual de processos sancionadores revisados'))!;
      expect(cartao.text()).not.toContain('Sem risco ligado');
      expect(cartao.text()).toContain('Riscos fora da sua visão');
      const faixa = cartao.find('.faixa-alerta');
      expect(faixa.text()).toContain('Os riscos deste indicador estão fora da sua visão');
      expect(faixa.text()).not.toContain('não tem risco ligado');
      // PR #21 (E2): sem nenhum risco à vista, a pessoa não conseguiria comunicar (o painel
      // não teria risco para ligar). No lugar do atalho, a orientação de quem pode comunicar.
      expect(faixa.findAll('a')).toHaveLength(0);
      expect(faixa.text()).toContain('procure a unidade que grava nesses riscos');
      w.unmount();
    });

    describe('janela "Registrar leitura"', () => {
      async function abrirJanela(w: VueWrapper, kriId: string): Promise<HTMLElement> {
        await cartaoDe(w, kriId).findAll('button').find((b) => b.text().includes('Registrar leitura'))!.trigger('click');
        await flushPromises();
        return document.body.querySelector('[role="dialog"]') as HTMLElement;
      }
      async function digitar(dialogo: HTMLElement, valor: string): Promise<void> {
        const campo = dialogo.querySelector('input[type="text"]') as HTMLInputElement;
        campo.value = valor;
        campo.dispatchEvent(new Event('input'));
        await flushPromises();
      }

      it('não tem mais a caixa "passou do limite" (quem decide é o banco)', async () => {
        const { w } = await montar();
        const dialogo = await abrirJanela(w, 'kri-integra-1');
        expect(dialogo.querySelector('input[type="checkbox"]')).toBeNull();
        expect(dialogo.textContent).not.toContain('A leitura passou do limite');
        w.unmount();
      });

      it('mensagem automática: passa do limite / dentro do limite', async () => {
        const { w } = await montar();
        const dialogo = await abrirJanela(w, 'kri-anexo-ii-2'); // alerta quando menor que 80 %
        await digitar(dialogo, '72%');
        expect(dialogo.querySelector('.leitura-aviso')!.textContent).toContain('Esta leitura passa do limite');
        await digitar(dialogo, '85');
        expect(dialogo.querySelector('.leitura-aviso')!.textContent).toContain('Dentro do limite (alerta quando menor que 80 %)');
        w.unmount();
      });

      it('mensagem automática: KRI com limite a converter não é verificado', async () => {
        const { w } = await montar();
        const dialogo = await abrirJanela(w, 'kri-anexo-ii-3');
        await digitar(dialogo, '7%');
        expect(dialogo.querySelector('.leitura-aviso')!.textContent).toContain(
          'Sem limite numérico: o sistema não verifica o alerta'
        );
        w.unmount();
      });

      it('grava sem mandar "emAlerta" (o banco calcula)', async () => {
        const base = criarFonteDemonstracao('normal');
        const enviados: unknown[] = [];
        definirFonteParaTeste({
          ...base,
          registrarMedicao: async (kriId, m) => { enviados.push(m); return base.registrarMedicao(kriId, m); },
        });
        setActivePinia(createPinia());
        await useRiscosStore().carregar();
        const { w } = await montar();
        const dialogo = await abrirJanela(w, 'kri-anexo-ii-2');
        await digitar(dialogo, '72%');
        [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Salvar leitura'))!.click();
        await flushPromises();
        expect(enviados).toHaveLength(1);
        expect(enviados[0]).not.toHaveProperty('emAlerta');
        // A leitura abriu um alerta: agora são 3 alertas abertos.
        const card = w.findAll('.stat-card').find((c) => c.text().includes('Alertas abertos'))!;
        expect(card.find('.stat-card__valor').text()).toBe('3');
        w.unmount();
      });
    });
  });
});
