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
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import MonitoramentoKriPlanoAcaoView from '../../src/views/MonitoramentoKriPlanoAcaoView.vue';

async function montar(caminho = '/monitoramento') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/monitoramento', name: 'monitoramento-kris', component: MonitoramentoKriPlanoAcaoView },
      { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
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
});
