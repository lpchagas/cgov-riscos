/**
 * ============================================================================
 * TESTES DA PÁGINA APROVAÇÕES — Fase 3 (`tests/unit/aprovacoesPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Confere o fluxo em degraus pela TELA (a regra em si é testada em
 * fluxoValidacao.spec.ts):
 *   - a Diretoria abre direto na sua fila;
 *   - validar um risco Crítico o envia para a Diretoria (e não para o Plano);
 *   - devolver exige despacho; sem ele, aparece erro e nada muda;
 *   - quem não tem o papel certo vê os botões desabilitados.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';
import CaixaValidacaoUmCliqueView from '../../src/views/CaixaValidacaoUmCliqueView.vue';

async function montar(caminho = '/aprovacoes') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/aprovacoes', name: 'validacao-um-clique', component: CaixaValidacaoUmCliqueView },
      { path: '/riscos/:id', name: 'ficha-bowtie-detalhe', component: { template: '<div />' } },
    ],
  });
  router.push(caminho);
  await router.isReady();
  const w = mount(CaixaValidacaoUmCliqueView, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { w, router };
}

const botao = (w: ReturnType<typeof mount>, texto: string) => w.findAll('button').find((b) => b.text().includes(texto))!;

describe('Página Aprovações', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  it('abre na fila da Coordenação-Geral com o primeiro item selecionado', async () => {
    const { w } = await montar();
    expect(w.find('[aria-current="true"]').text()).toContain('RADAR-2026-001');
    expect(w.find('#detalhe-aprovacao').text()).toContain('Validar risco');
    w.unmount();
  });

  it('a Diretoria abre direto na sua fila', async () => {
    useAuthStore().alternarPerfilDemo('diretor');
    const { w } = await montar();
    expect(w.find('[aria-current="true"]').text()).toContain('RADAR-2026-002');
    expect(w.find('#detalhe-aprovacao').text()).toContain('Homologar risco');
    w.unmount();
  });

  it('validar um risco Crítico o envia para a Diretoria', async () => {
    const { w } = await montar();
    await botao(w, 'Validar risco').trigger('click');
    await flushPromises();
    const r = useRiscosStore().riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
    expect(r.statusFluxo).toBe('em_homologacao_dir');
    expect(w.text()).toContain('Nada aguardando validação');
    w.unmount();
  });

  it('devolver exige despacho; com despacho, o risco volta para a unidade', async () => {
    const { w } = await montar();
    await botao(w, 'Devolver para ajuste').trigger('click');
    await flushPromises();
    const dialogo = document.body.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialogo).not.toBeNull();

    const confirmar = () => [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Devolver risco'))!.click();
    confirmar();
    await flushPromises();
    expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('pelo menos 10 caracteres');
    expect(useRiscosStore().riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!.statusFluxo).toBe('em_validacao_cg');

    const campo = dialogo.querySelector('textarea')!;
    campo.value = 'Detalhar a evidência do controle de POP.';
    campo.dispatchEvent(new Event('input'));
    confirmar();
    await flushPromises();
    expect(useRiscosStore().riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!.statusFluxo).toBe('devolvido');
    w.unmount();
  });

  it('o gestor (1ª Linha) não pode validar: botões desabilitados e aviso', async () => {
    useAuthStore().alternarPerfilDemo('gestor');
    const { w } = await montar();
    expect(botao(w, 'Validar risco').attributes('disabled')).toBeDefined();
    expect(w.text()).toContain('Só a Coordenação-Geral ou a CGOV validam');
    w.unmount();
  });
});
