/**
 * ============================================================================
 * TESTES DA PÁGINA IMPORTAR RISCOS — Fase 3 (`tests/unit/importarPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - "Ver prévia" NÃO grava nada (só lê e recalcula);
 *   - categoria mista proibida aparece como erro e bloqueia a importação;
 *   - confirmar grava as fichas como Preliminar CGOV e abre a lista filtrada.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import ImportadorSkillView from '../../src/views/ImportadorSkillView.vue';

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/importar', name: 'importar-skill', component: ImportadorSkillView },
      { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
    ],
  });
  router.push('/importar');
  await router.isReady();
  const w = mount(ImportadorSkillView, { global: { plugins: [router] } });
  await flushPromises();
  return { w, router };
}
const botao = (w: ReturnType<typeof mount>, t: string) => w.findAll('button').find((b) => b.text().includes(t))!;

describe('Página Importar riscos', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  it('sem texto, "Ver prévia" pede a tabela', async () => {
    const { w } = await montar();
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.find('[role="alert"]').text()).toContain('Cole a tabela');
  });

  it('a prévia não grava nada; confirmar importa como Preliminar CGOV', async () => {
    const { w, router } = await montar();
    const store = useRiscosStore();
    const antes = store.riscos.length;
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.findAll('tbody tr')).toHaveLength(2);
    expect(store.riscos.length).toBe(antes);

    await botao(w, 'Importar 2 riscos').trigger('click');
    await flushPromises();
    expect(store.riscos.length).toBe(antes + 2);
    // O código RADAR agora é dado pela fonte de dados (o da skill, ex.: RSC-IN-01,
    // é descartado — spec B3 §5.3): conferimos os 2 riscos preliminares novos.
    expect(store.riscos.filter((r) => r.statusFluxo === 'preliminar_cgov')).toHaveLength(2);
    expect(store.riscos.some((r) => r.codigoRadar === 'RSC-IN-01')).toBe(false);
    expect(router.currentRoute.value.query.status).toBe('preliminar_cgov');
  });

  it('categoria mista proibida vira erro e bloqueia o botão de importar', async () => {
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    const area = w.find('textarea');
    await area.setValue((area.element as HTMLTextAreaElement).value.replace('| Socioambiental |', '| Operacional com interface de Integridade |'));
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.find('.mensagens--erro').text()).toContain('mista');
    expect(botao(w, 'Importar').attributes('disabled')).toBeDefined();
  });
});
