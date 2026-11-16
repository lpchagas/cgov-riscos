/**
 * ============================================================================
 * TESTES DO ASSISTENTE "NOVO RISCO" — Fase 3 (`tests/unit/novoRiscoPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - regras por etapa (incluindo o Teste de Integridade do Integra+);
 *   - "Continuar" não avança com erro e põe o foco no primeiro campo inválido;
 *   - a prévia mostra a trava de evidência (controle "Forte" sem evidência → Fraco 0,9);
 *   - o fluxo completo cria o risco e o envia para validação da Coordenação-Geral.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import { useToast } from '../../src/composables/useToast';
import { CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import { dadosExemplo, dadosVazios, validarEtapa } from '../../src/utils/formularioRisco';
import FormularioRiscoView from '../../src/views/FormularioRiscoView.vue';

const CATEGORIAS = CATEGORIAS_QUADRO_2_SEMENTE;
const idCategoria = (nome: string) => CATEGORIAS.find((c) => c.nome === nome)!.id;

describe('validarEtapa', () => {
  it('etapa 1 exige os 4 elementos do Bow Tie e o objeto', () => {
    expect(Object.keys(validarEtapa(1, dadosVazios(), CATEGORIAS)).sort()).toEqual(
      ['causas', 'consequencias', 'evento', 'nomeObjeto', 'objetivo']
    );
    expect(validarEtapa(1, dadosExemplo(), CATEGORIAS)).toEqual({});
  });

  it('Integridade exige uma das 6 subcategorias do Quadro 3', () => {
    const d = { ...dadosExemplo(), categoriaId: idCategoria('Integridade') };
    expect(validarEtapa(2, d, CATEGORIAS).subcategoriaIntegridade).toBeDefined();
  });

  it('decide sobre terceiros e não é Integridade → exige justificativa (Integra+)', () => {
    const d = { ...dadosExemplo(), decideSobreTerceiros: true };
    expect(validarEtapa(2, d, CATEGORIAS).justificativaNaoIntegridade).toBeDefined();
    d.justificativaNaoIntegridade = 'Decisão técnica vinculada, sem discricionariedade.';
    expect(validarEtapa(2, d, CATEGORIAS)).toEqual({});
  });

  it('evidência marcada exige dizer onde ela está', () => {
    const d = { ...dadosExemplo(), eficacia: 'Forte' as const, descricaoControle: 'Dupla checagem', possuiEvidencia: true };
    expect(validarEtapa(3, d, CATEGORIAS).evidenciaControle).toBeDefined();
  });
});

describe('Página Novo risco', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  async function montar() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/riscos/novo', name: 'novo-risco', component: FormularioRiscoView },
        { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
      ],
    });
    router.push('/riscos/novo');
    await router.isReady();
    const w = mount(FormularioRiscoView, { global: { plugins: [router] }, attachTo: document.body });
    await flushPromises();
    return { w, router };
  }
  const botao = (w: ReturnType<typeof mount>, t: string) => w.findAll('button').find((b) => b.text().includes(t))!;

  it('"Continuar" com campos vazios não avança e foca o primeiro erro', async () => {
    const { w } = await montar();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('[aria-current="step"]').text()).toContain('Identificação');
    expect(w.findAll('[role="alert"]').length).toBeGreaterThanOrEqual(5);
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
    w.unmount();
  });

  it('a prévia mostra a trava de evidência (Forte sem evidência vira Fraco 0,9)', async () => {
    const { w } = await montar();
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 2; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    expect(w.find('[aria-current="step"]').text()).toContain('Análise');
    const eficacia = w.findAll('select').find((s) => s.html().includes('Forte (fator 0,5)'))!;
    await eficacia.setValue('Forte');
    await w.find('textarea').setValue('Dupla conferência documental');
    expect(w.find('.previa').text()).toContain('Trava de evidência');
    expect(w.find('.previa').text()).toContain('Fraco');
    w.unmount();
  });

  it('fluxo completo: cria o risco e envia para validação', async () => {
    const { w, router } = await montar();
    const store = useRiscosStore();
    const antes = store.riscos.length;
    await botao(w, 'Preencher com exemplo').trigger('click');
    for (let i = 0; i < 4; i++) { await w.find('form').trigger('submit'); await flushPromises(); }
    expect(store.riscos.length).toBe(antes + 1);
    // O nome do objeto agora vem do objeto gravado (fonte de dados), não do
    // texto livre do formulário: achamos o risco novo pelo id da ficha aberta.
    const novo = store.obterRiscoPorId(String(router.currentRoute.value.params.id))!;
    expect(novo.statusFluxo).toBe('em_validacao_cg');
    // P=3, I=4 → Quadro 7 = 18 (nunca 3 × 4 = 12)
    expect(novo.nivelInerente).toBe(18);
    expect(router.currentRoute.value.name).toBe('ficha-bowtie-detalhe');
    w.unmount();
  });

  describe('"Salvar e enviar" com envio recusado', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('grava UMA vez, avisa "Rascunho salvo…, mas não foi enviado" e abre a ficha', async () => {
      // Fonte falsa: grava normalmente, mas recusa o envio.
      const base = criarFonteDemonstracao('normal');
      const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
      const recusa = new ErroRadar('Esta unidade não tem chefia acima para validar o risco. Procure a CGOV.', 'estado');
      definirFonteParaTeste({ ...base, salvarFicha, enviar: vi.fn().mockRejectedValue(recusa) });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();

      const { w, router } = await montar();
      await botao(w, 'Preencher com exemplo').trigger('click');
      for (let i = 0; i < 4; i++) { await w.find('form').trigger('submit'); await flushPromises(); }

      expect(salvarFicha).toHaveBeenCalledTimes(1);
      const novo = store.riscos.find((r) => r.id === String(router.currentRoute.value.params.id))!;
      expect(router.currentRoute.value.name).toBe('ficha-bowtie-detalhe');
      expect(novo.statusFluxo).toBe('rascunho');
      const { toasts } = useToast();
      expect(toasts.value[toasts.value.length - 1].mensagem).toBe(
        `Rascunho salvo (${novo.codigoRadar}), mas não foi enviado: ${recusa.message}`
      );
      w.unmount();
    });
  });
});
