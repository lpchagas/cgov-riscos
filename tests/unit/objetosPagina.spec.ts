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
import { useAuthStore } from '../../src/stores/authStore';
import { ErroRadar } from '../../src/services/dados/errosBanco';
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

  // ---------------------------------------------------------------------------
  // B3 — unidade/processo inativos, supervisor somente leitura, reatribuição
  // ---------------------------------------------------------------------------
  describe('catálogo ligado ao banco (B3)', () => {
    /** Desativa uma unidade e marca os objetos dela (como o banco devolveria). */
    function desativarUnidadeDoPrimeiroObjeto() {
      const store = useRiscosStore();
      const objeto = store.objetosContexto[0];
      const unidade = store.unidades.find((u) => u.id === objeto.unidadeId)!;
      unidade.ativa = false;
      for (const o of store.objetosContexto) if (o.unidadeId === unidade.id) o.unidadeAtiva = false;
      return { objeto, unidade };
    }

    const abrirCadastro = async (w: Awaited<ReturnType<typeof montar>>) => {
      await w.findAll('button').find((b) => b.text().includes('Novo objeto'))!.trigger('click');
      await flushPromises();
      return document.body.querySelector('#form-objeto') as HTMLFormElement;
    };

    it('o seletor de unidade não oferece unidade inativa', async () => {
      const { unidade } = desativarUnidadeDoPrimeiroObjeto();
      const w = await montar();
      const form = await abrirCadastro(w);
      const rotulos = [...form.querySelectorAll('option')].map((o) => o.textContent ?? '');
      expect(rotulos.some((t) => t.includes(`${unidade.sigla} —`))).toBe(false);
      w.unmount();
    });

    it('o seletor de processo só oferece processo ativo', async () => {
      const store = useRiscosStore();
      store.processos.push(
        { id: 'p-ativo', procId: 'P1', nome: 'Processo vivo', macroprocesso: null, ativo: true, unidadeSupervisoraId: 'uni-cgge' },
        { id: 'p-velho', procId: 'P2', nome: 'Processo antigo', macroprocesso: null, ativo: false, unidadeSupervisoraId: null }
      );
      const w = await montar();
      const form = await abrirCadastro(w);
      const texto = form.textContent ?? '';
      expect(texto).toContain('Processo vivo');
      expect(texto).not.toContain('Processo antigo');
      w.unmount();
    });

    it('com processo escolhido, o supervisor vira texto (nenhum select de supervisor)', async () => {
      const store = useRiscosStore();
      store.processos.push({ id: 'p-ativo', procId: 'P1', nome: 'Processo vivo', macroprocesso: null, ativo: true, unidadeSupervisoraId: 'uni-cgge' });
      const w = await montar();
      const form = await abrirCadastro(w);
      const rotulosSelect = () => [...form.querySelectorAll('label')].map((l) => l.textContent ?? '');
      // Sem processo, a CGOV escolhe o supervisor.
      expect(rotulosSelect().some((t) => t.includes('Supervisor do macroprocesso'))).toBe(true);
      expect(form.querySelector('#supervisor-leitura')).toBeNull();
      // Escolhe o processo: o campo vira texto vindo do RADAR.
      const seletorProcesso = [...form.querySelectorAll('select')].find((s) => s.textContent?.includes('Processo vivo'))!;
      seletorProcesso.value = 'p-ativo';
      seletorProcesso.dispatchEvent(new Event('change'));
      await flushPromises();
      const leitura = form.querySelector('#supervisor-leitura') as HTMLElement;
      expect(leitura.textContent).toContain('Preenchido pelo RADAR a partir do processo da Cadeia de Valor');
      expect(leitura.textContent).toContain(store.unidades.find((u) => u.id === 'uni-cgge')!.sigla);
      expect([...form.querySelectorAll('select')].some((s) => s.closest('.formulario__supervisor'))).toBe(false);
      w.unmount();
    });

    it('quem não é CGOV não cadastra objeto nem reatribui', async () => {
      useAuthStore().alternarPerfilDemo('coordenador_geral');
      desativarUnidadeDoPrimeiroObjeto();
      const w = await montar();
      expect(w.findAll('button').some((b) => b.text().includes('Novo objeto'))).toBe(false);
      expect(w.findAll('button').some((b) => b.text().includes('Reatribuir objeto'))).toBe(false);
      w.unmount();
    });

    it('selos de inativo e "Reatribuir objeto" só no objeto de unidade inativa', async () => {
      const store = useRiscosStore();
      store.processos.push({ id: 'p-velho', procId: 'P2', nome: 'Processo antigo', macroprocesso: null, ativo: false, unidadeSupervisoraId: null });
      const { objeto } = desativarUnidadeDoPrimeiroObjeto();
      const outro = store.objetosContexto.find((o) => o.unidadeAtiva)!;
      outro.processoId = 'p-velho'; outro.processoNome = 'Processo antigo'; outro.processoAtivo = false;
      const w = await montar();
      const linhas = w.findAll('tbody tr');
      const botoes = linhas.filter((l) => l.text().includes('Reatribuir objeto'));
      expect(botoes).toHaveLength(store.objetosContexto.filter((o) => !o.unidadeAtiva).length);
      expect(botoes[0].text()).toContain(objeto.nomeObjeto);
      expect(w.find('tbody').text()).toContain('Unidade inativa');
      expect(w.find('tbody').text()).toContain('Processo inativo');
      w.unmount();
    });

    it('reatribuir sem escolher a unidade não confirma; com unidade ativa, grava', async () => {
      const store = useRiscosStore();
      const { objeto } = desativarUnidadeDoPrimeiroObjeto();
      const w = await montar();
      await w.findAll('button').find((b) => b.text().includes('Reatribuir objeto'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const confirmar = () => [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Confirmar'))!.click();
      confirmar();
      await flushPromises();
      expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('unidade');
      expect(store.objetosContexto.find((o) => o.id === objeto.id)!.unidadeAtiva).toBe(false);

      const seletor = dialogo.querySelector('select') as HTMLSelectElement;
      const opcoes = [...seletor.querySelectorAll('option')].filter((o) => o.value);
      // só unidades ativas
      expect(opcoes.every((o) => store.unidadesAtivas.some((u) => u.id === o.value))).toBe(true);
      seletor.value = opcoes[0].value;
      seletor.dispatchEvent(new Event('change'));
      confirmar();
      await flushPromises();
      const depois = store.objetosContexto.find((o) => o.id === objeto.id)!;
      expect(depois.unidadeAtiva).toBe(true);
      expect(depois.unidadeId).toBe(opcoes[0].value);
      w.unmount();
    });

    it('o erro "Escolha a unidade" some ao escolher uma unidade no seletor', async () => {
      desativarUnidadeDoPrimeiroObjeto();
      const w = await montar();
      await w.findAll('button').find((b) => b.text().includes('Reatribuir objeto'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Confirmar'))!.click();
      await flushPromises();
      expect(dialogo.querySelector('[role="alert"]')).not.toBeNull();
      const seletor = dialogo.querySelector('select') as HTMLSelectElement;
      seletor.value = [...seletor.querySelectorAll('option')].find((o) => o.value)!.value;
      seletor.dispatchEvent(new Event('change'));
      await flushPromises();
      expect(dialogo.querySelector('[role="alert"]')).toBeNull();
      w.unmount();
    });

    it('a coluna "Ações" (Reatribuir objeto) não é escondida no celular', async () => {
      desativarUnidadeDoPrimeiroObjeto();
      const w = await montar();
      const botao = w.findAll('button').find((b) => b.text().includes('Reatribuir objeto'))!;
      expect(botao.element.closest('[role="cell"]')!.classList.contains('ocultar-celular')).toBe(false);
      w.unmount();
    });

    it('recusa do banco na reatribuição aparece traduzida e o painel continua aberto', async () => {
      const store = useRiscosStore();
      desativarUnidadeDoPrimeiroObjeto();
      store.reatribuirObjeto = (async () => { throw new ErroRadar('Só a CGOV reatribui objeto.', 'permissao'); }) as never;
      const w = await montar();
      await w.findAll('button').find((b) => b.text().includes('Reatribuir objeto'))!.trigger('click');
      await flushPromises();
      const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const seletor = dialogo.querySelector('select') as HTMLSelectElement;
      seletor.value = [...seletor.querySelectorAll('option')].find((o) => o.value)!.value;
      seletor.dispatchEvent(new Event('change'));
      [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Confirmar'))!.click();
      await flushPromises();
      expect(dialogo.textContent).toContain('Só a CGOV reatribui objeto.');
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      w.unmount();
    });
  });
});
