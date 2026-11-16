/**
 * ============================================================================
 * TESTES DA PÁGINA OBJETOS DE GESTÃO — Fase 3 (`tests/unit/objetosPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - a busca filtra a tabela;
 *   - o cadastro abre num painel lateral, exige o nome e cria o objeto;
 *   - "Ver riscos" leva à lista de Riscos filtrada pelo nome do objeto.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import CatalogoObjetosView from '../../src/views/CatalogoObjetosView.vue';

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/objetos', name: 'catalogo-objetos', component: CatalogoObjetosView, meta: { titulo: 'Objetos de gestão' } },
      { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
    ],
  });
  router.push('/objetos');
  await router.isReady();
  const w = mount(CatalogoObjetosView, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return w;
}

describe('Página Objetos de gestão', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  it('um h1 e a busca filtra a tabela', async () => {
    const w = await montar();
    expect(w.findAll('h1')).toHaveLength(1);
    const total = w.findAll('tbody tr').length;
    expect(total).toBe(useRiscosStore().objetosContexto.length);
    await w.find('input[type="search"]').setValue('autorização');
    expect(w.findAll('tbody tr').length).toBeLessThan(total);
    expect(w.find('tbody').text().toLowerCase()).toContain('autorização');
    w.unmount();
  });

  it('cadastro: nome obrigatório; com nome, cria o objeto', async () => {
    const w = await montar();
    const store = useRiscosStore();
    const antes = store.objetosContexto.length;
    await w.findAll('button').find((b) => b.text().includes('Novo objeto'))!.trigger('click');
    await flushPromises();
    const form = document.body.querySelector('#form-objeto') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('nome do objeto');
    expect(store.objetosContexto.length).toBe(antes);

    const nome = form.querySelectorAll('input[type="text"]')[0] as HTMLInputElement;
    nome.value = 'Gestão de contratos de apoio às UCs';
    nome.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(store.objetosContexto.length).toBe(antes + 1);
    expect(store.objetosContexto[0].nomeObjeto).toBe('Gestão de contratos de apoio às UCs');
    w.unmount();
  });

  it('"Ver riscos" leva à lista filtrada pelo objeto', async () => {
    const w = await montar();
    const link = w.find('a[aria-label^="Ver "]');
    expect(link.attributes('href')).toMatch(/^\/riscos\?q=/);
    w.unmount();
  });
});
