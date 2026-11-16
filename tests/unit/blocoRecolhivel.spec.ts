/**
 * Testes do `BlocoRecolhivel`: no computador é um bloco comum; no celular o
 * título vira um botão que abre/fecha o corpo.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BlocoRecolhivel from '@/components/ui/BlocoRecolhivel.vue';
import { instalarMatchMediaFalso, type MatchMediaFalso } from './fixtures/matchMediaFalso';

let tela: MatchMediaFalso;
afterEach(() => tela?.restaurar());

function montar(celular: boolean, props: Record<string, unknown> = {}, corpo = '<p id="conteudo">Corpo</p>') {
  tela = instalarMatchMediaFalso(celular);
  return mount(BlocoRecolhivel, {
    props: { id: 'matriz', titulo: 'Matriz de riscos', ...props },
    slots: { default: corpo, acao: '<a id="acao" href="#">Abrir DAR</a>' },
    attachTo: document.body,
  });
}

describe('BlocoRecolhivel', () => {
  it('computador: sem botão, corpo visível, título h2 e ação', () => {
    const w = montar(false);
    expect(w.find('button').exists()).toBe(false);
    expect(w.find('h2').text()).toContain('Matriz de riscos');
    expect(w.find('#conteudo').isVisible()).toBe(true);
    expect(w.find('#acao').exists()).toBe(true);
    w.unmount();
  });

  it('celular: começa fechado', () => {
    const w = montar(true);
    expect(w.find('button').attributes('aria-expanded')).toBe('false');
    expect(w.find('#matriz-corpo').isVisible()).toBe(false);
    w.unmount();
  });

  it('celular: clicar abre e clicar de novo fecha', async () => {
    const w = montar(true);
    const botao = w.find('button');
    await botao.trigger('click');
    expect(botao.attributes('aria-expanded')).toBe('true');
    expect(w.find('#matriz-corpo').isVisible()).toBe(true);
    expect(botao.attributes('aria-controls')).toBe(w.find('#matriz-corpo').attributes('id'));
    await botao.trigger('click');
    expect(botao.attributes('aria-expanded')).toBe('false');
    expect(w.find('#matriz-corpo').isVisible()).toBe(false);
    w.unmount();
  });

  it('celular com abertoNoCelular: já nasce aberto', () => {
    const w = montar(true, { abertoNoCelular: true });
    expect(w.find('button').attributes('aria-expanded')).toBe('true');
    expect(w.find('#matriz-corpo').isVisible()).toBe(true);
    w.unmount();
  });

  it('celular: ação visível mesmo fechado', () => {
    const w = montar(true);
    expect(w.find('#acao').isVisible()).toBe(true);
    w.unmount();
  });

  it('celular -> computador com bloco fechado: corpo visível e sem botão', async () => {
    const w = montar(true);
    tela.definir(false);
    await w.vm.$nextTick();
    expect(w.find('button').exists()).toBe(false);
    expect(w.find('#matriz-corpo').isVisible()).toBe(true);
    w.unmount();
  });

  it('fechado: botão interno fica dentro de elemento display:none', () => {
    const w = montar(true, {}, '<button id="interno">x</button>');
    const interno = w.find('#interno');
    expect(interno.isVisible()).toBe(false);
    expect((w.find('#matriz-corpo').element as HTMLElement).style.display).toBe('none');
    w.unmount();
  });
});
