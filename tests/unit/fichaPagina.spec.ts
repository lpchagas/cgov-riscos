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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import { useAuthStore } from '../../src/stores/authStore';
import FichaDetalheBowTieView from '../../src/views/FichaDetalheBowTieView.vue';

async function montar(caminho: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/riscos/novo', name: 'novo-risco', component: { template: '<div />' } },
      { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: FichaDetalheBowTieView },
      { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
      { path: '/monitoramento', name: 'monitoramento-kris', component: { template: '<div />' } },
    ],
  });
  router.push(caminho);
  await router.isReady();
  const w = mount(FichaDetalheBowTieView, { global: { plugins: [router] }, attachTo: document.body });
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

  it('aba Monitoramento: KRI com campos opcionais em branco mostra "não definido", sem valores vazios', async () => {
    const r = useRiscosStore().riscos.find((x) => x.codigoRadar === 'RADAR-2026-003')!;
    const k = r.kris[0];
    k.metaAlvo = undefined;
    k.limiteAlerta = undefined;
    k.limiteOperador = undefined;
    k.limiteValor = undefined;
    k.periodicidade = undefined;
    const { w } = await montar(`/riscos/${r.id}?aba=monitoramento`);
    const linha = w.findAll('.item-cartao').find((li) => li.text().includes(k.nomeIndicador))!;
    expect(linha.text()).toMatch(/meta não definida/i);
    expect(linha.text()).toContain('limite não definido');
    expect(linha.text()).toContain('periodicidade não definida');
    expect(linha.text()).not.toMatch(/Meta\s+·|alerta\s+·/);
  });

  it('aba Monitoramento: limite numérico por extenso; limite antigo em texto marcado "a converter"', async () => {
    const store = useRiscosStore();
    const r = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
    const { w } = await montar(`/riscos/${r.id}?aba=monitoramento`);
    const linhaDe = (kriId: string) =>
      w.findAll('.item-cartao').find((li) => li.text().includes(r.kris.find((k) => k.id === kriId)!.nomeIndicador))!;
    // kri-anexo-ii-1: operador '<' e valor 70 com '%'.
    expect(linhaDe('kri-anexo-ii-1').text()).toContain('alerta menor que 70 %');
    // kri-anexo-ii-3: só o texto antigo "Acima de 5%".
    expect(linhaDe('kri-anexo-ii-3').text()).toContain('alerta Acima de 5% — limite a converter');
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
    // Aprovado: nenhuma decisão de fluxo; só "Editar ficha" (B3: editar reabre a validação).
    const acaoAprovado = aprovado.w.find('.ficha__acao');
    expect(acaoAprovado.findAll('button').map((b) => b.text())).toEqual([]);
    expect(acaoAprovado.text()).toBe('Editar ficha');
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

  it('excluir (store REAL, fonte de demonstração): volta para a lista de riscos', async () => {
    const store = useRiscosStore();
    // A carteira de demonstração não traz rascunho: criamos um (rascunho é excluível).
    const criado = await store.salvarOuAtualizarRisco({ objetoId: store.objetosContexto[0].id, probabilidade: 2, impacto: 3 });
    const alvo = store.obterRiscoPorId(criado.id)!;
    expect(store.acoes[alvo.id]?.podeExcluir).toBe(true);
    const { w, router } = await montar(`/riscos/${alvo.id}`);
    const botao = w.findAll('button').find((b) => b.text() === 'Excluir risco')!;
    await botao.trigger('click');
    const campo = document.body.querySelector('.dialogo input') as HTMLInputElement;
    campo.value = alvo.codigoRadar;
    campo.dispatchEvent(new Event('input'));
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('.dialogo button'))
      .find((b) => b.textContent?.trim() === 'Confirmar exclusão')!.click();
    await flushPromises();
    expect(store.obterRiscoPorId(alvo.id)).toBeUndefined();
    expect(router.currentRoute.value.name).toBe('riscos-lista');
  });

  it('excluir recusado pelo banco: continua na ficha e, se o risco sumir depois por outro motivo, não navega', async () => {
    const store = useRiscosStore();
    const criado = await store.salvarOuAtualizarRisco({ objetoId: store.objetosContexto[0].id, probabilidade: 2, impacto: 3 });
    const alvo = store.obterRiscoPorId(criado.id)!;
    vi.spyOn(store, 'excluirRisco').mockRejectedValue(new ErroRadar('Exclusão recusada.', 'estado'));
    vi.spyOn(store, 'relerRiscos').mockResolvedValue();
    const { w, router } = await montar(`/riscos/${alvo.id}`);
    await w.findAll('button').find((b) => b.text() === 'Excluir risco')!.trigger('click');
    const campo = document.body.querySelector('.dialogo input') as HTMLInputElement;
    campo.value = alvo.codigoRadar;
    campo.dispatchEvent(new Event('input'));
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('.dialogo button'))
      .find((b) => b.textContent?.trim() === 'Confirmar exclusão')!.click();
    await flushPromises();
    expect(router.currentRoute.value.name).not.toBe('riscos-lista');
    // Outra pessoa exclui o risco: a ficha mostra "não encontrado" em vez de voltar à lista.
    store.riscos = store.riscos.filter((r) => r.id !== alvo.id);
    await flushPromises();
    expect(router.currentRoute.value.name).not.toBe('riscos-lista');
  });

  it('"Editar ficha" aparece quando o RADAR libera a edição (e leva ao formulário em modo edição)', async () => {
    const id = idDe('RADAR-2026-003'); // aprovado: editável na demonstração
    expect(useRiscosStore().acoes[id]?.podeEditar).toBe(true);
    const { w } = await montar(`/riscos/${id}`);
    const link = w.findAll('a').find((a) => a.text().includes('Editar ficha'));
    expect(link?.attributes('href')).toBe(`/riscos/novo?editar=${id}`);
    w.unmount();
  });

  it('"Editar ficha" NÃO aparece quando a ficha está travada (em validação)', async () => {
    const id = idDe('RADAR-2026-001');
    expect(useRiscosStore().acoes[id]?.podeEditar).toBe(false);
    const { w } = await montar(`/riscos/${id}`);
    expect(w.findAll('a').some((a) => a.text().includes('Editar ficha'))).toBe(false);
    w.unmount();
  });
});
