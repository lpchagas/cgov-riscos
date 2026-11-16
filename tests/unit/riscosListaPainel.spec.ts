/**
 * ============================================================================
 * PAINEL LATERAL DA LISTA DE RISCOS — exclusão (correção da Tarefa 10)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Usa a store REAL com a fonte de demonstração (nada de `excluirRisco`
 * simulado). Depois de excluir, a store tira o risco da memória antes de o
 * componente de botões retomar; o painel precisa fechar sozinho.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';
import RiscosListaView from '../../src/views/RiscosListaView.vue';

describe('Lista de Riscos: excluir pelo painel lateral', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    useAuthStore().alternarPerfilDemo('coordenador_territorial');
  });

  it('fecha o painel quando o risco aberto é excluído', async () => {
    const store = useRiscosStore();
    await store.carregar();
    // A carteira de demonstração não traz rascunho: criamos um (rascunho é excluível).
    const criado = await store.salvarOuAtualizarRisco({ objetoId: store.objetosContexto[0].id, probabilidade: 2, impacto: 3 });
    const alvo = store.obterRiscoPorId(criado.id)!;
    expect(store.acoes[alvo.id]?.podeExcluir).toBe(true);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/riscos', name: 'riscos-lista', component: RiscosListaView, meta: { titulo: 'Riscos' } },
        ...['novo-risco', 'ficha-bowtie-detalhe'].map((name) => ({ path: `/${name}/:id?`, name, component: { template: '<div />' } })),
      ],
    });
    router.push('/riscos');
    await router.isReady();
    const w = mount(RiscosListaView, { global: { plugins: [router] }, attachTo: document.body });
    await flushPromises();

    await w.findAll('button.codigo-botao').find((b) => b.text() === alvo.codigoRadar)!.trigger('click');
    await flushPromises();
    const botaoTela = () => Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Excluir risco')!;
    botaoTela().click();
    await flushPromises();
    const campo = document.body.querySelector('.dialogo input') as HTMLInputElement;
    campo.value = alvo.codigoRadar;
    campo.dispatchEvent(new Event('input'));
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('.dialogo button'))
      .find((b) => b.textContent?.trim() === 'Confirmar exclusão')!.click();
    await flushPromises();

    expect(store.obterRiscoPorId(alvo.id)).toBeUndefined();
    // Painel fechado: o botão "Ver ficha completa" do painel não existe mais.
    expect(document.body.textContent).not.toContain('Ver ficha completa');
    w.unmount();
  });
});
