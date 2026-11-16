/**
 * ============================================================================
 * TESTES DOS ESTADOS DE CARREGAMENTO E ERRO (Etapa B3, Tarefa 9)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Com a store assíncrona, toda tela passa por 3 momentos: carregando, erro e
 * pronto. Aqui conferimos os dois componentes que desenham esses momentos
 * (`EstadoCarregamento` e `ErroPagina`) e o aviso global de "tela desatualizada"
 * mostrado pelo App quando a releitura depois de uma ação falha.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import EstadoCarregamento from '../../src/components/ui/EstadoCarregamento.vue';
import ErroPagina from '../../src/components/ui/ErroPagina.vue';
import { ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import AvisoAtualizacao from '../../src/components/ui/AvisoAtualizacao.vue';

describe('EstadoCarregamento', () => {
  it('carregando: tem role="status" e o texto "Carregando…"', () => {
    const w = mount(EstadoCarregamento, { props: { estado: 'carregando' } });
    const status = w.find('[role="status"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Carregando…');
  });

  it('erro: mostra a mensagem do ErroRadar e "Tentar de novo" emite o evento', async () => {
    const w = mount(EstadoCarregamento, {
      props: { estado: 'erro', erro: new ErroRadar(MENSAGEM_REDE, 'rede') },
    });
    expect(w.text()).toContain(MENSAGEM_REDE);
    const botao = w.findAll('button').find((b) => b.text() === 'Tentar de novo')!;
    await botao.trigger('click');
    expect(w.emitted('tentar-de-novo')).toHaveLength(1);
  });

  it('pronto: mostra o conteúdo do slot', () => {
    const w = mount(EstadoCarregamento, { props: { estado: 'pronto' }, slots: { default: '<p>conteúdo</p>' } });
    expect(w.text()).toContain('conteúdo');
    expect(w.find('[role="status"]').exists()).toBe(false);
  });
});

describe('ErroPagina', () => {
  it('tem um <h1> com o título, o texto, "Tentar de novo" e o link para a página principal', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });
    const w = mount(ErroPagina, {
      props: { titulo: 'Não foi possível carregar os riscos', texto: 'Tente de novo.' },
      global: { plugins: [router] },
    });
    expect(w.findAll('h1')).toHaveLength(1);
    expect(w.find('h1').text()).toBe('Não foi possível carregar os riscos');
    expect(w.text()).toContain('Tente de novo.');
    expect(w.find('a[href="/"]').text()).toContain('Ir para a Página Principal');
    expect(w.find('img, svg').attributes('aria-hidden') ?? w.find('img').attributes('alt')).toBeDefined();
    expect(w.text()).not.toMatch(/feedback/i);
    await w.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click');
    expect(w.emitted('tentar-de-novo')).toHaveLength(1);
  });
});

describe('AvisoAtualizacao (aviso global de tela desatualizada)', () => {
  afterEach(() => definirFonteParaTeste(null));

  it('só aparece com avisoAtualizacao e o botão "Atualizar" recarrega a carteira', async () => {
    setActivePinia(createPinia());
    const store = useRiscosStore();
    const w = mount(AvisoAtualizacao);
    expect(w.text()).toBe('');

    store.avisoAtualizacao = new ErroRadar('A ação foi concluída, mas não foi possível atualizar a tela. Use Atualizar.', 'rede');
    await flushPromises();
    expect(w.text()).toContain('não foi possível atualizar a tela');
    await w.findAll('button').find((b) => b.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(store.estado).toBe('pronto');
    expect(store.avisoAtualizacao).toBeNull();
    expect(w.text()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// LISTA DE RISCOS: selo "processo inativo", vazio e erro
// ---------------------------------------------------------------------------
import RiscosListaView from '../../src/views/RiscosListaView.vue';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { createRouter as criarRoteador, createMemoryHistory as criarHistorico } from 'vue-router';

describe('Lista de Riscos (estados)', () => {
  afterEach(() => definirFonteParaTeste(null));

  async function montarLista(fonte: FonteDados) {
    definirFonteParaTeste(fonte);
    setActivePinia(createPinia());
    const store = useRiscosStore();
    await store.carregar();
    const router = criarRoteador({
      history: criarHistorico(),
      routes: [
        { path: '/riscos', name: 'riscos-lista', component: RiscosListaView, meta: { titulo: 'Riscos' } },
        ...['novo-risco', 'ficha-bowtie-detalhe'].map((name) => ({ path: `/${name}/:id?`, name, component: { template: '<div />' } })),
      ],
    });
    router.push('/riscos');
    await router.isReady();
    const w = mount(RiscosListaView, { global: { plugins: [router] } });
    await flushPromises();
    return { w, store };
  }

  it('mostra o selo "processo inativo" só para objeto com processoAtivo: false', async () => {
    const base = criarFonteDemonstracao('normal');
    const carteira = await base.carregarCarteira();
    const alvo = carteira.riscos[0].objetoId;
    const objetos = carteira.objetos.map((o) => (o.id === alvo ? { ...o, processoAtivo: false } : o));
    const { w } = await montarLista({ ...base, carregarCarteira: async () => ({ ...carteira, objetos }) });
    expect(w.findAll('tbody tr').length).toBe(carteira.riscos.length);
    expect(w.text().match(/processo inativo/g)).toHaveLength(carteira.riscos.filter((r) => r.objetoId === alvo).length);
  });

  it('carteira vazia mostra "Nenhum risco no seu alcance"; erro mostra a página de erro', async () => {
    const base = criarFonteDemonstracao('normal');
    const vazia = await montarLista({ ...base, carregarCarteira: async () => ({ ...(await base.carregarCarteira()), riscos: [] }) });
    expect(vazia.w.text()).toContain('Nenhum risco no seu alcance');
    expect(vazia.w.text()).not.toContain('Nenhum risco encontrado');

    const falha = await montarLista({ ...base, carregarCarteira: () => Promise.reject(new ErroRadar(MENSAGEM_REDE, 'rede')) });
    expect(falha.w.find('h1').text()).toBe('Não foi possível carregar os riscos');
    expect(falha.w.text()).toContain(MENSAGEM_REDE);
  });
});
