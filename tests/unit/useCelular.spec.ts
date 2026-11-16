/**
 * TESTES DO COMPOSABLE `useCelular` (etapa C, Painel no celular).
 * Montamos um componente mínimo que usa o composable e mexemos na "largura"
 * com o `matchMedia` falso da fixture.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, type Ref } from 'vue';
import { useCelular } from '../../src/composables/useCelular';
import { instalarMatchMediaFalso, type MatchMediaFalso } from './fixtures/matchMediaFalso';

let tela: MatchMediaFalso | null = null;

/** Monta um componente mínimo e devolve a ref do composable. */
function montar() {
  let celular!: Ref<boolean>;
  const Comp = defineComponent({
    setup() {
      celular = useCelular();
      return () => null;
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, celular };
}

afterEach(() => {
  tela?.restaurar();
  tela = null;
});

describe('useCelular', () => {
  it('começa true quando a janela é de celular', () => {
    tela = instalarMatchMediaFalso(true);
    expect(montar().celular.value).toBe(true);
  });

  it('começa false no computador', () => {
    tela = instalarMatchMediaFalso(false);
    expect(montar().celular.value).toBe(false);
  });

  it('acompanha a mudança de largura', async () => {
    tela = instalarMatchMediaFalso(false);
    const { celular } = montar();
    tela.definir(true);
    await nextTick();
    expect(celular.value).toBe(true);
    tela.definir(false);
    await nextTick();
    expect(celular.value).toBe(false);
  });

  it('remove o ouvinte ao desmontar', () => {
    tela = instalarMatchMediaFalso(false);
    const { wrapper } = montar();
    expect(tela.ouvintes()).toBe(1);
    wrapper.unmount();
    expect(tela.ouvintes()).toBe(0);
  });

  it('sem matchMedia devolve false', () => {
    const original = window.matchMedia;
    (window as any).matchMedia = undefined;
    try {
      expect(montar().celular.value).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
