/**
 * ============================================================================
 * TESTES DOS BOTÕES DE FLUXO (`AcoesDoRisco`) — Etapa B3, Tarefa 10
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O componente só desenha o que `acoes_no_fluxo` liberou. Aqui passamos
 * `acoes` montadas à mão e conferimos: só aparecem os botões verdadeiros,
 * o `motivo` vira mensagem, "Devolver" exige motivo, "Excluir" exige o código
 * e um erro de "o risco mudou de situação" vira aviso + releitura do risco.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useToast } from '../../src/composables/useToast';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import type { AcoesFluxo, FichaRisco } from '../../src/types/radar.types';
import AcoesDoRisco from '../../src/components/radar/AcoesDoRisco.vue';

const NENHUMA: Omit<AcoesFluxo, 'riscoId'> = {
  podeEnviar: false, podeAssumir: false, podeValidar: false, podeHomologar: false,
  podeDevolver: false, devolucaoCgov: false, podeEditar: false, podeExcluir: false, motivo: null,
};

let risco: FichaRisco;
const montados: VueWrapper[] = [];

async function montar(parcial: Partial<AcoesFluxo>, mostrarEdicao = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/riscos/novo', name: 'novo-risco', component: { template: '<div />' } }],
  });
  const w = mount(AcoesDoRisco, {
    props: { risco, acoes: { ...NENHUMA, riscoId: risco.id, ...parcial }, mostrarEdicao },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  montados.push(w);
  await flushPromises();
  return w;
}

const botoes = (w: VueWrapper) => w.findAll('button').map((b) => b.text());
/** Os diálogos vão para o <body> (Teleport): procuramos lá. */
const noCorpo = (sel: string) => document.body.querySelector(sel);
const botaoDoDialogo = (texto: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('.dialogo button')).find((b) => b.textContent?.trim() === texto)!;

describe('AcoesDoRisco', () => {
  beforeEach(async () => {
    montados.splice(0).forEach((w) => w.unmount());
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    const store = useRiscosStore();
    await store.carregar();
    risco = store.riscos[0];
    useToast().toasts.value = [];
  });

  it('só mostra os botões das colunas verdadeiras', async () => {
    const w = await montar({ podeEnviar: true, podeExcluir: true });
    expect(botoes(w)).toEqual(['Enviar para validação', 'Excluir risco']);
    const w2 = await montar({ podeValidar: true, podeDevolver: true });
    expect(botoes(w2)).toEqual(['Validar risco', 'Devolver para ajuste']);
    const w3 = await montar({ podeAssumir: true });
    expect(botoes(w3)).toEqual(['Assumir risco']);
    const w4 = await montar({ podeHomologar: true });
    expect(botoes(w4)).toEqual(['Homologar risco']);
  });

  it('sem nenhuma ação e sem motivo, não desenha nada', async () => {
    const w = await montar({});
    expect(w.find('.acoes-risco').exists()).toBe(false);
  });

  it('o motivo aparece como mensagem informativa', async () => {
    const w = await montar({ motivo: 'Seu perfil não valida riscos.' });
    expect(w.find('[role="status"]').text()).toContain('Seu perfil não valida riscos.');
    expect(w.findAll('button')).toHaveLength(0);
  });

  it('devolução da CGOV muda o rótulo', async () => {
    const w = await montar({ podeDevolver: true, devolucaoCgov: true });
    expect(botoes(w)).toEqual(['Devolver à unidade (CGOV)']);
  });

  it('"Editar ficha" só aparece quando a tela pede e a ficha é editável', async () => {
    const sem = await montar({ podeEditar: true });
    expect(sem.text()).not.toContain('Editar ficha');
    const com = await montar({ podeEditar: true }, true);
    expect(com.find('a').text()).toBe('Editar ficha');
    const travada = await montar({ podeEditar: false }, true);
    expect(travada.text()).not.toContain('Editar ficha');
  });

  it('"Devolver" sem motivo não confirma e mostra erro de campo', async () => {
    const store = useRiscosStore();
    const devolver = vi.spyOn(store, 'devolverRisco').mockResolvedValue();
    const w = await montar({ podeDevolver: true });
    await w.find('button').trigger('click');
    await flushPromises();
    botaoDoDialogo('Devolver').click();
    await flushPromises();
    expect(devolver).not.toHaveBeenCalled();
    expect(noCorpo('.dialogo [role="alert"]')?.textContent).toContain('Informe o motivo');
  });

  it('"Devolver" com motivo chama a store e avisa o sucesso', async () => {
    const store = useRiscosStore();
    const devolver = vi.spyOn(store, 'devolverRisco').mockResolvedValue();
    const w = await montar({ podeDevolver: true });
    await w.find('button').trigger('click');
    await flushPromises();
    const campo = noCorpo('.dialogo textarea') as HTMLTextAreaElement;
    campo.value = 'Faltou evidência do controle.';
    campo.dispatchEvent(new Event('input'));
    botaoDoDialogo('Devolver').click();
    await flushPromises();
    expect(devolver).toHaveBeenCalledWith(risco.id, 'Faltou evidência do controle.');
    expect(useToast().toasts.value.at(-1)?.tom).toBe('sucesso');
  });

  it('"Excluir" só confirma com o código digitado', async () => {
    const store = useRiscosStore();
    const excluir = vi.spyOn(store, 'excluirRisco').mockResolvedValue();
    const w = await montar({ podeExcluir: true });
    await w.find('button').trigger('click');
    await flushPromises();
    expect(noCorpo('[role="alertdialog"]')).not.toBeNull();
    botaoDoDialogo('Confirmar exclusão').click();
    await flushPromises();
    expect(excluir).not.toHaveBeenCalled();
    expect(noCorpo('.dialogo [role="alert"]')?.textContent).toContain(risco.codigoRadar);

    const campo = noCorpo('.dialogo input') as HTMLInputElement;
    campo.value = risco.codigoRadar;
    campo.dispatchEvent(new Event('input'));
    botaoDoDialogo('Confirmar exclusão').click();
    await flushPromises();
    expect(excluir).toHaveBeenCalledWith(risco.id);
    expect(w.emitted('excluido')).toHaveLength(1);
  });

  it('erro de estado (55000): toast com a mensagem traduzida e releitura do risco', async () => {
    const store = useRiscosStore();
    vi.spyOn(store, 'submeterParaValidacaoCg').mockRejectedValue(
      new ErroRadar('O risco mudou de situação. Atualize a página e tente de novo.', 'estado', '55000')
    );
    const reler = vi.spyOn(store, 'relerRiscos').mockResolvedValue();
    const w = await montar({ podeEnviar: true });
    await w.find('button').trigger('click');
    await flushPromises();
    const aviso = useToast().toasts.value.at(-1)!;
    expect(aviso.tom).toBe('perigo');
    expect(aviso.mensagem).toContain('O risco mudou de situação');
    expect(reler).toHaveBeenCalledWith([risco.id]);
  });
});
