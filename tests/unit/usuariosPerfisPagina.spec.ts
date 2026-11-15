/**
 * ============================================================================
 * TESTES DA TELA "USUÁRIOS E PERFIS" (`tests/unit/usuariosPerfisPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O serviço (`acessoUsuarios`) é trocado por um "de mentira": a tela nunca
 * fala com o servidor aqui. Só e-mails fictícios (@radar.test).
 * Cobrimos: lista, filtros na URL, convites em lote (inclusive falha parcial),
 * cadastro, edição (autobloqueio, titular duplicado) e o modo demonstração.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';

const falso = vi.hoisted(() => ({
  configurado: true,
  listarPerfis: vi.fn(),
  listarUnidadesAtivas: vi.fn(),
  listarSituacao: vi.fn(),
  enviarLinks: vi.fn(),
  criarPessoa: vi.fn(),
  atualizarPerfil: vi.fn(),
}));

vi.mock('../../src/services/supabase', () => ({
  get isSupabaseConfigurado() {
    return falso.configurado;
  },
  get supabaseClient() {
    return falso.configurado ? {} : null;
  },
}));
vi.mock('../../src/services/acessoUsuarios', () => ({
  listarPerfis: falso.listarPerfis,
  listarUnidadesAtivas: falso.listarUnidadesAtivas,
  listarSituacao: falso.listarSituacao,
  enviarLinks: falso.enviarLinks,
  criarPessoa: falso.criarPessoa,
  atualizarPerfil: falso.atualizarPerfil,
}));

import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/composables/useToast';
import UsuariosPerfisView from '../../src/views/UsuariosPerfisView.vue';

const base = { cargo: null, ativo: true, titularChefia: false };
const PERFIS = [
  { ...base, id: 'p-eu', nome: 'Leo Exemplo', email: 'leo@radar.test', papel: 'cgov', unidadeId: 'u-cgov', unidadeSigla: 'CGOV', unidadeNome: 'Coordenação de Governança', titularChefia: true },
  { ...base, id: 'p-ana', nome: 'Ana Exemplo', email: 'ana@radar.test', papel: 'gerente_regional', unidadeId: 'u-gr5', unidadeSigla: 'GR5', unidadeNome: 'Gerência Regional 5', titularChefia: true },
  { ...base, id: 'p-beto', nome: 'Beto Exemplo', email: 'beto@radar.test', papel: 'gestor', unidadeId: 'u-uc', unidadeSigla: 'FLONA X', unidadeNome: 'Floresta Nacional X' },
  { ...base, id: 'p-caio', nome: 'Caio Exemplo', email: 'caio@radar.test', papel: 'gestor', unidadeId: 'u-uc', unidadeSigla: 'FLONA X', unidadeNome: 'Floresta Nacional X', ativo: false },
  { ...base, id: 'p-dani', nome: 'Dani Exemplo', email: 'dani@radar.test', papel: 'gestor', unidadeId: 'u-uc', unidadeSigla: 'FLONA X', unidadeNome: 'Floresta Nacional X' },
  { ...base, id: 'p-eva', nome: 'Eva Exemplo', email: 'eva@radar.test', papel: 'gestor', unidadeId: 'u-uc', unidadeSigla: 'FLONA X', unidadeNome: 'Floresta Nacional X' },
];
const UNIDADES = [
  { id: 'u-cgov', nome: 'Coordenação de Governança', sigla: 'CGOV', tipo: 'coordenacao-geral', icmbioId: '10.0008', tipoPai: null },
  { id: 'u-gr5', nome: 'Gerência Regional 5', sigla: 'GR5', tipo: 'gerencia-regional', icmbioId: '20.0005', tipoPai: null },
  { id: 'u-ct', nome: 'Coordenação Cuiabá', sigla: 'CT Cuiabá', tipo: 'coordenacao-geral', icmbioId: '30.0001', tipoPai: 'gerencia-regional' },
  { id: 'u-uc', nome: 'Floresta Nacional X', sigla: 'FLONA X', tipo: 'unidade-conservacao', icmbioId: '40.0001', tipoPai: null },
];
const SITUACOES = {
  'p-eu': { conviteEnviadoEm: null, ultimoAcessoEm: '2026-11-10T15:00:00Z' },
  'p-ana': { conviteEnviadoEm: '2026-11-01T15:00:00Z', ultimoAcessoEm: '2026-11-14T15:00:00Z' },
  'p-dani': { conviteEnviadoEm: '2026-11-03T15:00:00Z', ultimoAcessoEm: null },
  // beto e eva: sem registro => convite pendente
};

async function montar(url = '/usuarios') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/usuarios', name: 'usuarios-perfis', component: UsuariosPerfisView, meta: { titulo: 'Usuários e perfis', descricao: 'Quem acessa o RADAR.', cabecalhoProprio: true } },
    ],
  });
  router.push(url);
  await router.isReady();
  const w = mount(UsuariosPerfisView, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { w, router };
}

const botao = (w: ReturnType<typeof mount>, texto: string) => w.findAll('button').find((b) => b.text().includes(texto))!;
const botaoDoc = (texto: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

beforeEach(() => {
  falso.configurado = true;
  Object.values(falso).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset());
  falso.listarPerfis.mockResolvedValue(PERFIS);
  falso.listarUnidadesAtivas.mockResolvedValue(UNIDADES);
  falso.listarSituacao.mockResolvedValue(SITUACOES);
  falso.enviarLinks.mockResolvedValue({ enviados: [], falhas: [] });
  falso.criarPessoa.mockResolvedValue({ id: 'novo' });
  falso.atualizarPerfil.mockResolvedValue(undefined);
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.perfil = { ...PERFIS[0] } as never;
  useToast().toasts.value = [];
  document.body.innerHTML = '';
});

describe('Tela Usuários e perfis (modo real)', () => {
  it('lista nome, e-mail, unidade, perfil, titular e situação', async () => {
    const { w } = await montar();
    expect(w.findAll('h1')).toHaveLength(1);
    const linhaAna = w.findAll('tbody tr').find((l) => l.text().includes('Ana Exemplo'))!;
    const t = linhaAna.text();
    expect(t).toContain('ana@radar.test');
    expect(t).toContain('GR5');
    expect(t).toContain('Gerência Regional');
    expect(t).toContain('sim');
    expect(t).toContain('Entrou em 14/11/2026');
    const txt = w.text();
    expect(txt).toContain('Convite pendente');
    expect(txt).toContain('Convite enviado em 03/11/2026');
    expect(txt).toContain('Suspenso');
    w.unmount();
  });

  it('os filtros vão para a URL e filtram a tabela', async () => {
    const { w, router } = await montar();
    await w.find('[data-teste="filtro-perfil"]').setValue('gestor');
    await flushPromises();
    expect(router.currentRoute.value.query.perfil).toBe('gestor');
    await w.find('[data-teste="filtro-situacao"]').setValue('pendente');
    await flushPromises();
    expect(router.currentRoute.value.query.situacao).toBe('pendente');
    const nomes = w.findAll('tbody tr').map((l) => l.text());
    expect(nomes).toHaveLength(2); // beto e eva
    expect(nomes.join(' ')).not.toContain('Ana Exemplo');
    w.unmount();
  });

  it('lê os filtros da URL e conta só os pendentes em "Enviar convites (N)"', async () => {
    const { w } = await montar('/usuarios?perfil=gestor&situacao=pendente');
    expect(w.findAll('tbody tr')).toHaveLength(2);
    expect(botao(w, 'Enviar convites').text()).toContain('Enviar convites (2)');
    w.unmount();
  });

  it('convites em lote: confirma e mostra o resultado parcial com as falhas', async () => {
    falso.enviarLinks.mockResolvedValue({
      enviados: ['p-beto'],
      falhas: [{ id: 'p-eva', motivo: 'RADAR: a conta foi apagada.' }],
    });
    const { w } = await montar('/usuarios?situacao=pendente');
    await botao(w, 'Enviar convites').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Enviar o link de acesso para 2 pessoas?');
    botaoDoc('Enviar links').click();
    await flushPromises();
    expect(falso.enviarLinks).toHaveBeenCalledWith(['p-beto', 'p-eva']);
    expect(useToast().toasts.value.map((t) => t.mensagem)).toContain('1 convite enviado; 1 falhou');
    expect(w.text()).toContain('Eva Exemplo');
    expect(w.text()).toContain('a conta foi apagada');
    w.unmount();
  });

  it('microcopy no singular e no plural: "para 1 pessoa?" e "1 convite enviado" / "2 convites enviados"', async () => {
    falso.enviarLinks.mockResolvedValue({ enviados: ['p-beto'], falhas: [] });
    const { w } = await montar('/usuarios?situacao=pendente&q=beto');
    await botao(w, 'Enviar convites').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Enviar o link de acesso para 1 pessoa?');
    botaoDoc('Enviar links').click();
    await flushPromises();
    expect(useToast().toasts.value.map((t) => t.mensagem)).toContain('1 convite enviado');
    w.unmount();

    document.body.innerHTML = '';
    falso.enviarLinks.mockResolvedValue({ enviados: ['p-beto', 'p-eva'], falhas: [] });
    const outra = await montar('/usuarios?situacao=pendente');
    await botao(outra.w, 'Enviar convites').trigger('click');
    await flushPromises();
    botaoDoc('Enviar links').click();
    await flushPromises();
    expect(useToast().toasts.value.map((t) => t.mensagem)).toContain('2 convites enviados');
    outra.w.unmount();
  });

  it('cadastrar: gerência regional pré-seleciona o perfil; aviso de tipo suspeito; envio marcado', async () => {
    const { w } = await montar();
    await botao(w, 'Cadastrar pessoa').trigger('click');
    await flushPromises();
    const body = document.body;
    const caixaEnviar = [...body.querySelectorAll('label')].find((l) => l.textContent?.includes('Enviar o link agora'))!
      .querySelector('input') as HTMLInputElement;
    expect(caixaEnviar.checked).toBe(true);

    const busca = body.querySelector('#form-pessoa input[type="search"]') as HTMLInputElement;
    busca.value = 'gr5';
    busca.dispatchEvent(new Event('input'));
    await flushPromises();
    (body.querySelector('.form-pessoa__resultados button') as HTMLButtonElement).click();
    await flushPromises();
    const select = body.querySelector('#form-pessoa select') as HTMLSelectElement;
    expect(select.value).toBe('gerente_regional');

    busca.value = 'cuiab';
    busca.dispatchEvent(new Event('input'));
    await flushPromises();
    (body.querySelector('.form-pessoa__resultados button') as HTMLButtonElement).click();
    await flushPromises();
    expect(body.textContent).toContain('Coordenação-Geral dentro de uma Gerência Regional');
    w.unmount();
  });

  it('cadastrar: e-mail inválido bloqueia; 409 mostra a mensagem no campo e-mail', async () => {
    const { w } = await montar();
    await botao(w, 'Cadastrar pessoa').trigger('click');
    await flushPromises();
    const body = document.body;
    const preencher = async (seletor: string, valor: string) => {
      const el = body.querySelector(seletor) as HTMLInputElement;
      el.value = valor;
      el.dispatchEvent(new Event('input'));
      await flushPromises();
    };
    await preencher('#form-pessoa input[type="text"]', 'Fulano Exemplo');
    await preencher('#form-pessoa input[type="email"]', 'sem-arroba');
    await preencher('#form-pessoa input[type="search"]', 'flona');
    (body.querySelector('.form-pessoa__resultados button') as HTMLButtonElement).click();
    await flushPromises();
    (body.querySelector('#form-pessoa') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(falso.criarPessoa).not.toHaveBeenCalled();
    expect(body.textContent).toContain('Informe um e-mail válido.');

    falso.criarPessoa.mockRejectedValue(new Error('RADAR: já existe uma conta com este e-mail.'));
    await preencher('#form-pessoa input[type="email"]', 'fulano@radar.test');
    (body.querySelector('#form-pessoa') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(falso.criarPessoa).toHaveBeenCalledTimes(1);
    const erroEmail = body.querySelector('#form-pessoa [id$="-erro"]');
    expect(erroEmail?.textContent).toContain('já existe uma conta com este e-mail');
    w.unmount();
  });

  it('editar a própria linha trava ativo e perfil, com explicação', async () => {
    const { w } = await montar();
    const linha = w.findAll('tbody tr').find((l) => l.text().includes('Leo Exemplo'))!;
    await linha.findAll('button').find((b) => b.text().includes('Editar'))!.trigger('click');
    await flushPromises();
    const body = document.body;
    expect((body.querySelector('#form-pessoa select') as HTMLSelectElement).disabled).toBe(true);
    const ativo = [...body.querySelectorAll('#form-pessoa label')].find((l) => l.textContent?.includes('Perfil ativo'))!
      .querySelector('input') as HTMLInputElement;
    expect(ativo.disabled).toBe(true);
    expect(body.textContent).toContain('Você não pode suspender nem mudar o próprio perfil.');
    w.unmount();
  });

  it('editar: ligar Titular em unidade com titular avisa e grava os dois; sugere o perfil sem trocar', async () => {
    // Beto passa a ser titular da GR5, onde Ana já é titular.
    const { w } = await montar();
    const linha = w.findAll('tbody tr').find((l) => l.text().includes('Beto Exemplo'))!;
    await linha.findAll('button').find((b) => b.text().includes('Editar'))!.trigger('click');
    await flushPromises();
    const body = document.body;
    const busca = body.querySelector('#form-pessoa input[type="search"]') as HTMLInputElement;
    busca.value = 'GR5';
    busca.dispatchEvent(new Event('input'));
    await flushPromises();
    (body.querySelector('.form-pessoa__resultados button') as HTMLButtonElement).click();
    await flushPromises();
    const titular = [...body.querySelectorAll('#form-pessoa label')].find((l) => l.textContent?.includes('Titular (chefia)'))!
      .querySelector('input') as HTMLInputElement;
    titular.click();
    await flushPromises();
    expect(body.textContent).toContain('Esta unidade já tem titular: Ana Exemplo.');
    // Sugere, mas NÃO troca sozinho.
    expect((body.querySelector('#form-pessoa select') as HTMLSelectElement).value).toBe('gestor');
    expect(body.textContent).toContain('Gerência Regional');
    const tirar = [...body.querySelectorAll('#form-pessoa label')].find((l) => l.textContent?.includes('Tirar a chave do titular anterior'))!
      .querySelector('input') as HTMLInputElement;
    tirar.click();
    await flushPromises();
    (body.querySelector('#form-pessoa') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
    // Ordem: a gravação principal (Beto) vem ANTES de tirar a chave de Ana.
    expect(falso.atualizarPerfil).toHaveBeenNthCalledWith(1, 'p-beto', { unidadeId: 'u-gr5', titularChefia: true });
    expect(falso.atualizarPerfil).toHaveBeenNthCalledWith(2, 'p-ana', { titularChefia: false });
    expect(useToast().toasts.value.map((t) => t.mensagem)).toContain('Perfil atualizado.');
    w.unmount();
  });

  /** Abre a edição do Beto, passa para a GR5 como titular e marca "Tirar a chave do titular anterior". */
  async function prepararTrocaDeTitular() {
    const r = await montar();
    const linha = r.w.findAll('tbody tr').find((l) => l.text().includes('Beto Exemplo'))!;
    await linha.findAll('button').find((b) => b.text().includes('Editar'))!.trigger('click');
    await flushPromises();
    const body = document.body;
    const busca = body.querySelector('#form-pessoa input[type="search"]') as HTMLInputElement;
    busca.value = 'GR5';
    busca.dispatchEvent(new Event('input'));
    await flushPromises();
    (body.querySelector('.form-pessoa__resultados button') as HTMLButtonElement).click();
    await flushPromises();
    const caixa = (texto: string) =>
      [...body.querySelectorAll('#form-pessoa label')].find((l) => l.textContent?.includes(texto))!.querySelector('input') as HTMLInputElement;
    caixa('Titular (chefia)').click();
    await flushPromises();
    caixa('Tirar a chave do titular anterior').click();
    await flushPromises();
    (body.querySelector('#form-pessoa') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
    return r;
  }

  it('troca de titular: se a gravação principal falha (409), a chave do anterior NÃO é tirada', async () => {
    falso.atualizarPerfil.mockRejectedValueOnce(new Error('RADAR: não foi possível salvar.'));
    const { w } = await prepararTrocaDeTitular();
    expect(falso.atualizarPerfil).toHaveBeenCalledTimes(1);
    expect(falso.atualizarPerfil).toHaveBeenCalledWith('p-beto', { unidadeId: 'u-gr5', titularChefia: true });
    w.unmount();
  });

  it('troca de titular: se a 2ª gravação falha, a lista é recarregada para refletir o banco', async () => {
    falso.atualizarPerfil.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('RADAR: falhou.'));
    const { w } = await prepararTrocaDeTitular();
    expect(falso.atualizarPerfil).toHaveBeenCalledTimes(2);
    // 1ª carga ao abrir a tela + 1 recarga depois da falha.
    expect(falso.listarPerfis).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain('RADAR: falhou.');
    w.unmount();
  });

  it('se a situação não puder ser lida, mostra os perfis com aviso e "—"', async () => {
    falso.listarSituacao.mockRejectedValue(new Error('RADAR: falhou'));
    const { w } = await montar();
    expect(w.findAll('tbody tr').length).toBeGreaterThan(0);
    expect(w.text()).toContain('Não foi possível ler a situação das contas');
    expect(botao(w, 'Enviar convites').text()).toContain('(0)');
    w.unmount();
  });
});

describe('Tela Usuários e perfis (modo demonstração)', () => {
  it('lista os 10 perfis simulados, sem chamar o serviço, e as ações avisam', async () => {
    falso.configurado = false;
    setActivePinia(createPinia());
    const { w } = await montar();
    expect(w.findAll('tbody tr')).toHaveLength(10);
    expect(falso.listarPerfis).not.toHaveBeenCalled();
    await botao(w, 'Cadastrar pessoa').trigger('click');
    await flushPromises();
    expect(useToast().toasts.value.map((t) => t.mensagem)).toContain('Indisponível no modo demonstração.');
    w.unmount();
  });
});
