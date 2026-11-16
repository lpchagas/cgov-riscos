/**
 * ============================================================================
 * TESTES DAS TELAS DE ACESSO (/entrar, /entrar/retorno, /acesso-nao-liberado)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Montamos cada tela com uma "store de mentira" (um objeto simples que responde
 * o que o teste mandar) e um roteador de memória. Assim conferimos os TEXTOS
 * que a pessoa lê e para onde ela é levada, sem Supabase e sem navegador.
 * Só e-mails fictícios (@radar.test).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

// Store simulada, criada ANTES do vi.mock (vi.hoisted) para o mock poder usá-la.
const loja = vi.hoisted(() => ({
  estado: {} as Record<string, unknown>,
}));

vi.mock('../../src/stores/authStore', () => ({
  CHAVE_VOLTA: 'radar.volta-apos-login',
  useAuthStore: () => loja.estado,
}));

import EntrarView from '../../src/views/EntrarView.vue';
import EntrarRetornoView from '../../src/views/EntrarRetornoView.vue';
import AcessoNaoLiberadoView from '../../src/views/AcessoNaoLiberadoView.vue';

/** Guarda a volta como a store faz: `{ volta, em }` no localStorage. */
function guardar(volta: string, em = Date.now()) {
  localStorage.setItem('radar.volta-apos-login', JSON.stringify({ volta, em }));
}

const VAZIA = { template: '<div />' };
let roteador: Router;

function novaLoja(parte: Record<string, unknown> = {}) {
  loja.estado = reactive({
    modo: 'real',
    situacao: 'anonimo',
    enviarLink: vi.fn(async () => 'enviado'),
    concluirRetorno: vi.fn(async () => 'ok'),
    sair: vi.fn(async () => undefined),
    ...parte,
  });
}

async function montar(componente: object, caminho: string) {
  await roteador.push(caminho);
  await roteador.isReady();
  return mount(componente, { global: { plugins: [roteador] } });
}

beforeEach(() => {
  localStorage.clear();
  novaLoja();
  roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'painel-cgov', component: VAZIA },
      { path: '/riscos', name: 'riscos-lista', component: VAZIA },
      { path: '/entrar', name: 'entrar', component: VAZIA },
      { path: '/entrar/retorno', name: 'entrar-retorno', component: VAZIA },
      { path: '/acesso-nao-liberado', name: 'acesso-nao-liberado', component: VAZIA },
    ],
  });
});

describe('EntrarView', () => {
  it('tem o <h1> "Entrar no RADAR"', async () => {
    const w = await montar(EntrarView, '/entrar');
    expect(w.find('h1').text()).toBe('Entrar no RADAR');
  });

  it('enviar mostra a resposta única, sem revelar se o e-mail existe', async () => {
    const w = await montar(EntrarView, '/entrar?volta=/riscos');
    await w.find('input[type="email"]').setValue('ana@radar.test');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect((loja.estado.enviarLink as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('ana@radar.test', '/riscos');
    expect(w.text()).toContain('Se o e-mail estiver cadastrado, você receberá um link em instantes. Ele vale por 1 hora.');
  });

  it("'limite' mostra a mensagem de muitas tentativas", async () => {
    novaLoja({ enviarLink: vi.fn(async () => 'limite') });
    const w = await montar(EntrarView, '/entrar');
    await w.find('input[type="email"]').setValue('ana@radar.test');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Muitas tentativas. Aguarde um minuto e tente de novo.');
  });

  it("'falha_rede' mostra a mensagem de conexão", async () => {
    novaLoja({ enviarLink: vi.fn(async () => 'falha_rede') });
    const w = await montar(EntrarView, '/entrar');
    await w.find('input[type="email"]').setValue('ana@radar.test');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Não foi possível enviar agora. Confira sua conexão e tente de novo.');
  });

  it.each(['', '   ', 'sem-arroba'])('e-mail %j: erro no campo e nenhuma chamada', async (valor) => {
    const w = await montar(EntrarView, '/entrar');
    await w.find('input[type="email"]').setValue(valor);
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('.campo__erro').exists()).toBe(true);
    expect(loja.estado.enviarLink).not.toHaveBeenCalled();
  });

  it('volta fora do sistema (//, http) é ignorada: usa a raiz', async () => {
    const w = await montar(EntrarView, '/entrar?volta=//evil.test');
    await w.find('input[type="email"]').setValue('ana@radar.test');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(loja.estado.enviarLink).toHaveBeenCalledWith('ana@radar.test', '/');
  });

  it('no modo demonstração o botão leva ao Painel', async () => {
    novaLoja({ modo: 'demonstracao', situacao: 'ativo' });
    const w = await montar(EntrarView, '/entrar');
    const botao = w.find('button[type="submit"]');
    expect(botao.text()).toBe('Entrar no modo demonstração');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
    expect(loja.estado.enviarLink).not.toHaveBeenCalled();
  });

  it('?motivo=link mostra o aviso de link expirado', async () => {
    const w = await montar(EntrarView, '/entrar?motivo=link');
    expect(w.text()).toContain('Este link expirou ou já foi usado. Peça um novo.');
  });

  it('?motivo=sessao mostra o aviso de sessão terminada', async () => {
    const w = await montar(EntrarView, '/entrar?motivo=sessao');
    expect(w.text()).toContain('Sua sessão terminou. Entre de novo.');
  });
});

describe('EntrarRetornoView', () => {
  const URL_OK = '/entrar/retorno?token_hash=abc&type=email';

  it('tem o <h1> "Conferindo seu link"', async () => {
    novaLoja({ concluirRetorno: vi.fn(() => new Promise(() => undefined)) });
    const w = await montar(EntrarRetornoView, URL_OK);
    expect(w.find('h1').text()).toBe('Conferindo seu link');
  });

  it("'ok' com volta guardada vai para ela e apaga a chave", async () => {
    guardar('/riscos');
    await montar(EntrarRetornoView, URL_OK);
    await flushPromises();
    expect(loja.estado.concluirRetorno).toHaveBeenCalledWith('abc', 'email');
    expect(roteador.currentRoute.value.fullPath).toBe('/riscos');
    expect(localStorage.getItem('radar.volta-apos-login')).toBeNull();
  });

  it('volta guardada há mais de 1 hora (vencida) é ignorada: vai ao Painel e apaga a chave', async () => {
    guardar('/riscos', Date.now() - 61 * 60 * 1000);
    await montar(EntrarRetornoView, URL_OK);
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
    expect(localStorage.getItem('radar.volta-apos-login')).toBeNull();
  });

  it("'ok' sem volta (link aberto em outro navegador) vai ao Painel", async () => {
    await montar(EntrarRetornoView, URL_OK);
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
  });

  it.each(['//evil.test', 'https://evil.test', 'riscos'])('ignora volta insegura %j', async (volta) => {
    guardar(volta);
    await montar(EntrarRetornoView, URL_OK);
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('painel-cgov');
    expect(localStorage.getItem('radar.volta-apos-login')).toBeNull();
  });

  it("'link_invalido' volta a /entrar?motivo=link", async () => {
    novaLoja({ concluirRetorno: vi.fn(async () => 'link_invalido') });
    await montar(EntrarRetornoView, URL_OK);
    await flushPromises();
    expect(roteador.currentRoute.value.name).toBe('entrar');
    expect(roteador.currentRoute.value.query.motivo).toBe('link');
  });
});

describe('AcessoNaoLiberadoView', () => {
  it('sem_perfil: título e contato da CGOV', async () => {
    novaLoja({ situacao: 'sem_perfil' });
    const w = await montar(AcessoNaoLiberadoView, '/acesso-nao-liberado');
    expect(w.find('h1').text()).toBe('Acesso não liberado');
    expect(w.text()).toContain('Sua conta ainda não tem acesso ao RADAR');
    expect(w.text()).toContain('planejamento@icmbio.gov.br');
  });

  it('inativo: mensagem de suspensão', async () => {
    novaLoja({ situacao: 'inativo' });
    const w = await montar(AcessoNaoLiberadoView, '/acesso-nao-liberado');
    expect(w.text()).toContain('Seu acesso está suspenso');
    expect(w.text()).toContain('planejamento@icmbio.gov.br');
  });

  it('o botão Sair chama sair() e vai a /entrar', async () => {
    novaLoja({ situacao: 'inativo' });
    const w = await montar(AcessoNaoLiberadoView, '/acesso-nao-liberado');
    const sair = w.findAll('button').find((b) => b.text() === 'Sair')!;
    await sair.trigger('click');
    await flushPromises();
    expect(loja.estado.sair).toHaveBeenCalled();
    expect(roteador.currentRoute.value.name).toBe('entrar');
  });

  it('modo demonstração: ?exemplo=inativo escolhe a variante', async () => {
    novaLoja({ modo: 'demonstracao', situacao: 'ativo' });
    const w = await montar(AcessoNaoLiberadoView, '/acesso-nao-liberado?exemplo=inativo');
    expect(w.text()).toContain('Seu acesso está suspenso');
    const w2 = await montar(AcessoNaoLiberadoView, '/acesso-nao-liberado');
    expect(w2.text()).toContain('Sua conta ainda não tem acesso ao RADAR');
  });
});
