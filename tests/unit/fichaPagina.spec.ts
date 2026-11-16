/**
 * ============================================================================
 * TESTES DA FICHA DO RISCO — Fase 3 (`tests/unit/fichaPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - endereço inexistente mostra "Risco não encontrado" (antes caía no 1º risco);
 *   - a ação do topo depende da situação no fluxo;
 *   - o Bow Tie é uma lista ORDENADA de 5 passos e o evento mostra o nível;
 *   - a aba aberta fica na URL.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';
import FichaDetalheBowTieView from '../../src/views/FichaDetalheBowTieView.vue';

async function montar(caminho: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: FichaDetalheBowTieView },
      { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
      { path: '/monitoramento', name: 'monitoramento-kris', component: { template: '<div />' } },
    ],
  });
  router.push(caminho);
  await router.isReady();
  const w = mount(FichaDetalheBowTieView, { global: { plugins: [router] } });
  await flushPromises();
  return { w, router };
}

const idDe = (codigo: string) => useRiscosStore().riscos.find((r) => r.codigoRadar === codigo)!.id;

describe('Ficha do risco', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    useAuthStore().alternarPerfilDemo('coordenador_territorial');
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  it('endereço inexistente avisa "Risco não encontrado"', async () => {
    const { w } = await montar('/riscos/nao-existe');
    expect(w.find('h1').text()).toBe('Risco não encontrado');
  });

  it('risco excluído ou fora do alcance (id de verdade, mas ausente): mesmo título, sem texto técnico', async () => {
    const { w } = await montar('/riscos/00000000-0000-4000-8000-000000000000');
    expect(w.find('h1').text()).toBe('Risco não encontrado');
    expect(w.text()).not.toMatch(/PostgreSQL|PostgREST|RADAR:|row-level/i);
    expect(w.find('.ficha__acao').exists()).toBe(false);
  });

  it('enquanto a carteira carrega, mostra o esqueleto e não "não encontrado"', async () => {
    setActivePinia(createPinia()); // store nova: estado 'ocioso'
    const { w } = await montar('/riscos/qualquer');
    expect(w.text()).not.toContain('Risco não encontrado');
    expect(w.find('[role="status"]').text()).toContain('Carregando');
  });

  it('um único h1 com o nome do objeto; selos com nível escrito', async () => {
    const { w } = await montar(`/riscos/${idDe('RADAR-2026-003')}`);
    expect(w.findAll('h1')).toHaveLength(1);
    expect(w.find('h1').text()).toContain('Autorização Direta');
    expect(w.find('.ficha__selos').text()).toContain('Médio · 8,4');
  });

  it('a ação do topo segue a situação no fluxo', async () => {
    const valida = await montar(`/riscos/${idDe('RADAR-2026-001')}`);
    // Demonstração: a chefia da Coordenação Territorial vê "Validar risco" no risco em validação.
    expect(valida.w.find('.ficha__acao').text()).toContain('Validar risco');
    // As ações são lidas por perfil: ao trocar de perfil, a carteira é relida.
    useAuthStore().alternarPerfilDemo('diretor');
    await useRiscosStore().carregar();
    const homologa = await montar(`/riscos/${idDe('RADAR-2026-002')}`);
    expect(homologa.w.find('.ficha__acao').text()).toContain('Homologar risco');
    const aprovado = await montar(`/riscos/${idDe('RADAR-2026-003')}`);
    expect(aprovado.w.find('.ficha__acao').exists()).toBe(false);
  });

  it('Bow Tie: lista ordenada de 5 blocos; aba guardada na URL', async () => {
    const { w, router } = await montar(`/riscos/${idDe('RADAR-2026-001')}?aba=bowtie`);
    const blocos = w.findAll('ol.bowtie > li');
    expect(blocos).toHaveLength(5);
    expect(blocos.map((b) => b.find('h3').text())).toEqual([
      '1 Causas', '2 Controles', '3 Evento de risco', expect.stringMatching(/^4 Resposta/), '5 Consequências',
    ]);
    expect(blocos[2].text()).toContain('Extremo');
    await w.findAll('[role="tab"]').find((t) => t.text().startsWith('Histórico'))!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.aba).toBe('historico');
  });
});
