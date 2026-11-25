/**
 * ============================================================================
 * TESTES DO "SHELL" POR MODO E POR PERFIL (menu, cabeçalho, faixa e sessão)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O "shell" é o esqueleto do sistema (`App.vue`): faixa, cabeçalho, menu lateral e
 * conteúdo. Aqui conferimos que ele muda conforme o MODO (demonstração × real) e o
 * PERFIL de quem está usando:
 *   - gestor não vê "Importar riscos" nem "Usuários e perfis"; a CGOV vê os dois;
 *   - só a demonstração tem faixa "Modo demonstração" e simulador de perfil;
 *   - só o modo real tem o botão "Sair";
 *   - telas de acesso (`meta.semMenu`) não mostram menu lateral nem trilha;
 *   - erro de conexão mostra mensagem com "Tentar de novo";
 *   - sessão que termina sozinha leva a `/entrar?motivo=sessao`.
 *
 * Usamos uma "store de mentira" (objeto reativo simples) no lugar do Supabase,
 * e um roteador de memória. Só pessoas fictícias (@radar.test).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

// Store simulada, criada ANTES do vi.mock (vi.hoisted) para o mock poder usá-la.
const loja = vi.hoisted(() => ({ estado: {} as Record<string, any> }));

vi.mock('../../src/stores/authStore', () => ({
  CHAVE_VOLTA: 'radar.volta-apos-login',
  useAuthStore: () => loja.estado,
}));

import rotasReais from '../../src/router/index';
import App from '../../src/App.vue';
import PainelConsolidadoCgovView from '../../src/views/PainelConsolidadoCgovView.vue';
import type { PapelGovernanca } from '../../src/types/radar.types';

const VAZIA = { template: '<p>conteudo da tela</p>' };

/**
 * As rotas de verdade do RADAR (nomes, caminhos e `meta`), mas com uma tela vazia no lugar de
 * cada view. Assim o menu acha todos os links e o teste usa os mesmos `meta.semMenu`/`publica`.
 */
const ROTAS_REAIS = rotasReais
  .getRoutes()
  .filter((r) => r.name)
  .map((r) => ({ path: r.path, name: r.name!, meta: r.meta, component: VAZIA }));
let roteador: Router;

/** O jsdom não tem `matchMedia`; o App usa para saber se é computador ou celular. */
function simularMatchMedia(): void {
  window.matchMedia = ((consulta: string) => ({
    matches: true,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

/** Monta a store simulada. `papel` define quem está usando. */
function novaLoja(modo: 'real' | 'demonstracao', papel: PapelGovernanca, parte: Record<string, unknown> = {}) {
  loja.estado = reactive({
    modo,
    situacao: 'ativo',
    mensagemErro: null,
    perfil:
      modo === 'real'
        ? { nome: 'Ana Teste', cargo: 'Analista', unidadeSigla: 'CGOV', email: 'ana@radar.test', papel }
        : null,
    usuarioAtual: {
      id: 'u1',
      nome: modo === 'real' ? 'Ana Teste' : 'Analista da CGOV — demonstração',
      cargo: modo === 'real' ? 'Analista' : 'Equipe Técnica',
      unidadeSigla: 'CGOV',
      papel,
    },
    podeAprovarCg: false,
    podeHomologarDiretoria: false,
    isCgov: papel === 'cgov',
    iniciar: vi.fn(async () => undefined),
    recarregarPerfil: vi.fn(async () => undefined),
    sair: vi.fn(async () => undefined),
    alternarPerfilDemo: vi.fn(),
    ...parte,
  });
}

async function montarApp(caminho = '/'): Promise<VueWrapper> {
  await roteador.push(caminho);
  await roteador.isReady();
  return mount(App, { global: { plugins: [roteador], stubs: { RouterView: false } }, attachTo: document.body });
}

beforeEach(() => {
  document.body.innerHTML = '';
  simularMatchMedia();
  setActivePinia(createPinia());
  novaLoja('real', 'cgov');
  roteador = createRouter({
    history: createMemoryHistory(),
    routes: ROTAS_REAIS,
  });
});

const itensDoMenu = (w: VueWrapper) => w.findAll('#main-navigation .menu-trilho__item').map((a) => a.text());
const titulosDeGrupo = (w: VueWrapper) => w.findAll('.menu-trilho__titulo-grupo').map((p) => p.text());

describe('menu lateral por perfil', () => {
  it('gestor não vê "Importar riscos" nem "Usuários e perfis", e não tem o grupo "Ferramentas"', async () => {
    novaLoja('real', 'gestor');
    const w = await montarApp();
    const itens = itensDoMenu(w).join('|');
    expect(itens).not.toContain('Importar riscos');
    expect(itens).not.toContain('Usuários e perfis');
    expect(titulosDeGrupo(w)).not.toContain('Ferramentas');
  });

  it('a CGOV vê os dois itens no grupo "Ferramentas"', async () => {
    const w = await montarApp();
    const itens = itensDoMenu(w).join('|');
    expect(itens).toContain('Importar riscos');
    expect(itens).toContain('Usuários e perfis');
    expect(titulosDeGrupo(w)).toContain('Ferramentas');
    expect(w.find('a[href="/usuarios"] i').classes()).toContain('fa-users-gear');
  });
});

describe('menu "Comunicações à CGOV" (LAC-04, P-03)', () => {
  it('fica no grupo Gestão de riscos, logo depois de Monitoramento, para todos os perfis', async () => {
    for (const papel of ['gestor', 'auditoria', 'cgov'] as const) {
      novaLoja('real', papel);
      const w = await montarApp();
      const itens = itensDoMenu(w);
      const i = itens.findIndex((t) => t.startsWith('Monitoramento'));
      expect(itens[i + 1]).toMatch(/^Comunicações à CGOV/);
      expect(w.find('a[href="/comunicacoes"] i').classes()).toContain('fa-paper-plane');
      w.unmount();
    }
  });

  it('a CGOV vê o número de comunicações novas; o gestor não vê número', async () => {
    novaLoja('demonstracao', 'cgov');
    const w = await montarApp();
    await flushPromises();
    // Semente da demonstração: 1 comunicação sem ciência da CGOV (com-demo-3).
    const item = w.find('a[href="/comunicacoes"]');
    // PR #21 (E1): uma só no singular ("1 comunicação nova"); duas ou mais, no plural.
    expect(item.find('.menu-trilho__contador').text()).toBe('1 comunicação nova');
    w.unmount();

    novaLoja('demonstracao', 'gestor');
    const w2 = await montarApp();
    await flushPromises();
    expect(w2.find('a[href="/comunicacoes"] .menu-trilho__contador').exists()).toBe(false);
    w2.unmount();
  });
});

describe('modo demonstração', () => {
  beforeEach(() => novaLoja('demonstracao', 'cgov'));

  it('mostra a faixa com o texto exato', async () => {
    const w = await montarApp();
    expect(w.text()).toContain('Modo demonstração: dados fictícios, sem login');
  });

  it('o menu da conta tem o simulador com os 10 perfis e não tem "Sair"', async () => {
    const w = await montarApp();
    expect(w.findAll('input[name="perfil-demo"]')).toHaveLength(10);
    expect(w.find('#menu-usuario').text()).not.toContain('Sair');
  });

  it('o seletor de perfil do Painel existe (select com rótulo "Ver como")', async () => {
    const p = mount(PainelConsolidadoCgovView, { global: { plugins: [roteador] } });
    const select = p.find('select#painel-ver-como');
    expect(select.exists()).toBe(true);
    expect(p.find('label[for="painel-ver-como"]').text()).toBe('Ver como');
    expect(select.findAll('option')).toHaveLength(10);
    await select.setValue('diretor');
    expect(loja.estado.alternarPerfilDemo).toHaveBeenCalledWith('diretor');
  });
});

describe('modo real', () => {
  it('não tem faixa nem simulador; o menu da conta mostra nome, cargo e unidade e tem "Sair"', async () => {
    const w = await montarApp();
    expect(w.text()).not.toContain('Modo demonstração');
    expect(w.find('input[name="perfil-demo"]').exists()).toBe(false);
    const conta = w.find('#menu-usuario').text();
    expect(conta).toContain('Ana Teste');
    expect(conta).toContain('Analista');
    expect(conta).toContain('CGOV');
    expect(conta).toContain('Sair');
  });

  it('o seletor de perfil do Painel NÃO existe', async () => {
    const p = mount(PainelConsolidadoCgovView, { global: { plugins: [roteador] } });
    expect(p.find('select#painel-ver-como').exists()).toBe(false);
  });

  it('"Sair" encerra a sessão e vai a /entrar SEM motivo', async () => {
    const w = await montarApp('/riscos');
    const sair = w.findAll('#menu-usuario button').find((b) => b.text().includes('Sair'))!;
    await sair.trigger('click');
    await flushPromises();
    expect(loja.estado.sair).toHaveBeenCalled();
    expect(roteador.currentRoute.value.name).toBe('entrar');
    expect(roteador.currentRoute.value.query.motivo).toBeUndefined();
  });
});

describe('telas de acesso (meta.semMenu)', () => {
  it('não mostram o menu lateral nem a trilha', async () => {
    novaLoja('real', 'gestor', { situacao: 'anonimo', perfil: null });
    const w = await montarApp('/entrar');
    expect(w.find('#main-navigation').exists()).toBe(false);
    expect(w.find('nav.trilha').exists()).toBe(false);
    expect(w.find('#header-navigation').exists()).toBe(false);
  });

  it('com conta sem perfil, o cabeçalho tem só o "Sair" (sem busca)', async () => {
    novaLoja('real', 'gestor', { situacao: 'sem_perfil', perfil: null });
    const w = await montarApp('/acesso-nao-liberado');
    expect(w.find('#searchbox-radar').exists()).toBe(false);
    expect(w.find('.barra__sair').text()).toContain('Sair');
  });

  it('com erro persistente, o cabeçalho também tem o "Sair" (quem está preso no erro consegue sair)', async () => {
    novaLoja('real', 'gestor', { situacao: 'erro', perfil: null, mensagemErro: 'Falha.' });
    const w = await montarApp('/riscos');
    expect(w.find('.barra__sair').text()).toContain('Sair');
  });

  it('sem login, o cabeçalho não mostra conta nem "Sair"', async () => {
    novaLoja('real', 'gestor', { situacao: 'anonimo', perfil: null });
    const w = await montarApp('/entrar');
    expect(w.find('.barra__usuario').exists()).toBe(false);
    expect(w.find('.barra__sair').exists()).toBe(false);
  });
});

describe('atalhos de teclado (skip links)', () => {
  const rotulos = (w: VueWrapper) => w.findAll('nav.br-skiplink a').map((a) => a.text().replace(/\s+/g, ' ').trim());

  it('numa tela normal ficam os 4 atalhos originais', async () => {
    const w = await montarApp('/riscos');
    expect(rotulos(w)).toEqual([
      'Ir para o conteúdo (1/4)1',
      'Ir para o menu (2/4)2',
      'Ir para a busca (3/4)3',
      'Ir para o rodapé (4/4)4',
    ]);
  });

  it('numa tela semMenu ficam só conteúdo e rodapé, renumerados', async () => {
    novaLoja('real', 'gestor', { situacao: 'anonimo', perfil: null });
    const w = await montarApp('/entrar');
    expect(rotulos(w)).toEqual(['Ir para o conteúdo (1/2)1', 'Ir para o rodapé (2/2)2']);
  });
});

describe('erro de conexão', () => {
  it('mostra a mensagem do erro e "Tentar de novo" chama recarregarPerfil', async () => {
    novaLoja('real', 'cgov', { situacao: 'erro', perfil: null, mensagemErro: 'Não foi possível falar com o RADAR.' });
    const w = await montarApp('/riscos');
    expect(w.find('[role="alert"]').text()).toContain('Não foi possível falar com o RADAR.');
    expect(w.text()).not.toContain('conteudo da tela');
    const botao = w.findAll('button').find((b) => b.text().includes('Tentar de novo'))!;
    await botao.trigger('click');
    expect(loja.estado.recarregarPerfil).toHaveBeenCalledTimes(1);
  });
});

describe('sessão', () => {
  it('SIGNED_OUT em outra aba (ativo -> anônimo) numa rota protegida leva a /entrar?motivo=sessao&volta=...', async () => {
    await montarApp('/riscos');
    loja.estado.situacao = 'anonimo';
    loja.estado.perfil = null;
    await flushPromises();
    const rota = roteador.currentRoute.value;
    expect(rota.name).toBe('entrar');
    expect(rota.query.motivo).toBe('sessao');
    expect(rota.query.volta).toBe('/riscos');
  });

  it('numa rota pública, a sessão que termina não redireciona', async () => {
    novaLoja('real', 'gestor', { situacao: 'sem_perfil', perfil: null });
    await montarApp('/acesso-nao-liberado');
    loja.estado.situacao = 'anonimo';
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('acesso-nao-liberado');
  });

  it('a janela volta ao foco: relê o perfil e, se foi suspenso, vai a /acesso-nao-liberado', async () => {
    await montarApp('/riscos');
    loja.estado.recarregarPerfil = vi.fn(async () => {
      loja.estado.perfil = null;
      loja.estado.situacao = 'inativo';
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    await nextTick();
    expect(loja.estado.recarregarPerfil).toHaveBeenCalled();
    expect(roteador.currentRoute.value.name).toBe('acesso-nao-liberado');
  });

  it('conta reativada: quem está em /acesso-nao-liberado vai ao Painel', async () => {
    novaLoja('real', 'gestor', { situacao: 'inativo', perfil: null });
    await montarApp('/acesso-nao-liberado');
    loja.estado.situacao = 'ativo';
    loja.estado.perfil = { nome: 'Ana Teste', cargo: 'Analista', unidadeSigla: 'CGOV', email: 'ana@radar.test', papel: 'gestor' };
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
  });

  it('erro -> ativo numa tela só da CGOV com perfil sem permissão: vai ao Painel (a guarda não rodou)', async () => {
    novaLoja('real', 'gestor', { situacao: 'erro', perfil: null });
    await montarApp('/usuarios');
    expect(roteador.currentRoute.value.name).toBe('usuarios-perfis');
    loja.estado.situacao = 'ativo';
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
  });

  it('perfil trocado no simulador estando numa tela só da CGOV: vai ao Painel', async () => {
    novaLoja('demonstracao', 'cgov');
    await montarApp('/usuarios');
    expect(roteador.currentRoute.value.name).toBe('usuarios-perfis');
    loja.estado.usuarioAtual.papel = 'gestor';
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
  });

  it('janela escondida não relê o perfil; no modo demonstração também não', async () => {
    await montarApp('/riscos');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loja.estado.recarregarPerfil).not.toHaveBeenCalled();

    novaLoja('demonstracao', 'cgov');
    await montarApp('/');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loja.estado.recarregarPerfil).not.toHaveBeenCalled();
  });
});
