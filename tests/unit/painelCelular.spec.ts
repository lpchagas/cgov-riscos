/**
 * ============================================================================
 * TESTES DO PAINEL NO CELULAR — ETAPA C (`tests/unit/painelCelular.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * No celular o Painel fica mais curto: três blocos recolhem (nível residual,
 * DAR e atividade), "Maiores riscos" mostra só 3 linhas e a seção "Atenção"
 * sobe (só visualmente). No computador nada disso aparece.
 *
 * O jsdom não tem `matchMedia`, então instalamos um falso ANTES de montar a
 * página (`true` = celular, `false` = computador) e o devolvemos no `afterEach`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';
import { RISCOS_SEMENTE_ANEXO_II } from '../../src/services/dadosSementeAnexoII';
import PainelConsolidadoCgovView from '../../src/views/PainelConsolidadoCgovView.vue';
import { instalarMatchMediaFalso, type MatchMediaFalso } from './fixtures/matchMediaFalso';

const TITULOS_RECOLHIVEIS = ['Riscos por nível residual', 'Apetite a riscos (DAR)', 'Atividade recente'];

let tela: MatchMediaFalso | null = null;
let montado: { unmount(): void } | null = null;

afterEach(() => {
  montado?.unmount();
  montado = null;
  tela?.restaurar();
  tela = null;
  definirFonteParaTeste(null);
});

/** Fonte de demonstração com `extras` riscos a mais (cópias da semente com id e código novos). */
function fonteComRiscos(extras: number, ajuste?: Partial<FonteDados>): FonteDados {
  const base = criarFonteDemonstracao('normal');
  return {
    ...base,
    carregarCarteira: async () => {
      const carteira = await base.carregarCarteira();
      const copias = Array.from({ length: extras }, (_, n) => ({
        ...JSON.parse(JSON.stringify(RISCOS_SEMENTE_ANEXO_II[n % RISCOS_SEMENTE_ANEXO_II.length])),
        id: `risco-extra-${n}`,
        codigoRadar: `RADAR-2026-9${n}`,
      }));
      return { ...carteira, riscos: [...carteira.riscos, ...copias] };
    },
    ...ajuste,
  };
}

async function montar(celular: boolean, fonte: FonteDados = fonteComRiscos(0)) {
  tela = instalarMatchMediaFalso(celular);
  definirFonteParaTeste(fonte);
  setActivePinia(createPinia());
  await useRiscosStore().carregar();
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
  const w = mount(PainelConsolidadoCgovView, { global: { plugins: [router] }, attachTo: document.body });
  montado = w; // o `isVisible()` só funciona com a página dentro do documento
  await flushPromises();
  return w;
}

const botoesDeBloco = (w: Awaited<ReturnType<typeof montar>>) => w.findAll('button[aria-expanded]').filter((b) => TITULOS_RECOLHIVEIS.includes(b.text()));
const linhasMaiores = (w: Awaited<ReturnType<typeof montar>>) => w.findAll('#tabela-maiores tbody tr');

describe('Painel no celular: blocos recolhíveis', () => {
  it('no celular, os três blocos começam fechados e a DAR abre ao tocar', async () => {
    const w = await montar(true);
    const botoes = botoesDeBloco(w);
    expect(botoes.map((b) => b.text())).toEqual(TITULOS_RECOLHIVEIS);
    botoes.forEach((b) => expect(b.attributes('aria-expanded')).toBe('false'));

    // Os links do cabeçalho ficam visíveis mesmo com o bloco fechado.
    const links = w.findAll('a').filter((a) => ['Abrir DAR', 'Auditoria'].includes(a.text()));
    expect(links).toHaveLength(2);
    links.forEach((a) => expect(a.isVisible()).toBe(true));

    const dar = botoes[1];
    expect(w.find('#bloco-dar-corpo').isVisible()).toBe(false);
    await dar.trigger('click');
    expect(dar.attributes('aria-expanded')).toBe('true');
    expect(w.find('#bloco-dar-corpo').isVisible()).toBe(true);
    expect(w.find('#bloco-dar-corpo').text()).toContain('categorias');
  });

  it('no computador, não há botões de bloco, o texto está todo lá e a ordem dos h2 não mudou', async () => {
    const w = await montar(false);
    expect(botoesDeBloco(w)).toHaveLength(0);
    expect(w.text()).toContain('categorias');
    TITULOS_RECOLHIVEIS.forEach((t) => expect(w.text()).toContain(t));
    expect(w.find('#bloco-dar-corpo').isVisible()).toBe(true);

    const ordem = w.findAll('h2').map((h) => h.text());
    expect(ordem.indexOf('Matriz de riscos inerentes')).toBeLessThan(ordem.indexOf('Precisa da sua atenção'));
    expect(ordem).toEqual([
      'Matriz de riscos inerentes',
      'Precisa da sua atenção',
      'Maiores riscos residuais',
      'Riscos por nível residual',
      'Apetite a riscos (DAR)',
      'Atividade recente',
    ]);
  });

  it('a seção "Atenção" leva a classe que a faz subir no celular', async () => {
    const w = await montar(true);
    expect(w.find('section[aria-labelledby="titulo-atencao"]').classes()).toContain('painel__atencao');
  });

  it('com a Atividade em erro, "Tentar de novo" só fica visível depois de abrir o bloco', async () => {
    const w = await montar(
      true,
      fonteComRiscos(0, { lerAtividadeRecente: () => Promise.reject(new ErroRadar(MENSAGEM_REDE, 'rede')) })
    );
    const tentar = () => w.findAll('button').find((b) => b.text() === 'Tentar de novo')!;
    expect(tentar().isVisible()).toBe(false);
    await botoesDeBloco(w)[2].trigger('click');
    expect(tentar().isVisible()).toBe(true);
  });
});

describe('Painel no celular: Maiores riscos (limite de 3)', () => {
  it('com 3 riscos (semente) não há botão e a tabela tem 3 linhas', async () => {
    const w = await montar(true);
    expect(w.find('.painel__maiores-mais').exists()).toBe(false);
    expect(linhasMaiores(w)).toHaveLength(3);
  });

  it('com 5 riscos, o celular mostra 3 e o botão abre e fecha o resto', async () => {
    const w = await montar(true, fonteComRiscos(2));
    expect(linhasMaiores(w)).toHaveLength(3);
    const botao = w.find('.painel__maiores-mais');
    expect(botao.text()).toContain('Mostrar mais 2');
    expect(botao.attributes('aria-expanded')).toBe('false');
    expect(botao.attributes('aria-controls')).toBe('tabela-maiores');

    await botao.trigger('click');
    expect(linhasMaiores(w)).toHaveLength(5);
    expect(botao.text()).toContain('Mostrar menos');
    expect(botao.attributes('aria-expanded')).toBe('true');
  });

  it('com 4 riscos o botão diz "Mostrar mais 1"', async () => {
    const w = await montar(true, fonteComRiscos(1));
    expect(w.find('.painel__maiores-mais').text()).toContain('Mostrar mais 1');
  });

  it('no computador mostra os 5 e não tem botão', async () => {
    const w = await montar(false, fonteComRiscos(2));
    expect(linhasMaiores(w)).toHaveLength(5);
    expect(w.find('.painel__maiores-mais').exists()).toBe(false);
  });

  it('carteira vazia no celular: só o estado vazio, sem botões de bloco nem de "mostrar mais"', async () => {
    const base = criarFonteDemonstracao('normal');
    const w = await montar(true, {
      ...base,
      carregarCarteira: async () => ({ ...(await base.carregarCarteira()), riscos: [] }),
    });
    expect(w.text()).toContain('Nenhum risco no seu alcance');
    expect(botoesDeBloco(w)).toHaveLength(0);
    expect(w.find('.painel__maiores-mais').exists()).toBe(false);
  });
});

describe('Painel no celular: indicadores compactos', () => {
  it('os 4 StatCards são compactos e os links continuam os mesmos', async () => {
    const w = await montar(true);
    expect(w.findAll('.painel__kpis .stat-card--compacto')).toHaveLength(4);
    expect(w.findAll('.painel__kpis a').map((a) => a.attributes('href'))).toEqual([
      '/riscos-lista',
      '/riscos-lista?critico=sim',
      '/riscos-lista?status=em_validacao_cg',
      '/riscos-lista?status=em_homologacao_dir',
    ]);
  });
});
