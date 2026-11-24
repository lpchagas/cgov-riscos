/**
 * ============================================================================
 * TESTES DA PÁGINA COMUNICAÇÕES À CGOV — P-03, LAC-04 (`comunicacoesPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A tela `/comunicacoes` tem duas partes: a LISTA (filtro Todas · Novas · Ciência
 * registrada) e o PAINEL LATERAL (nova comunicação ou comunicação recebida).
 * Conferimos aqui o que o desenho aprovado pede:
 *   - colunas da P-03 (a CGOV vê também a Unidade);
 *   - hipótese I exige risco; IV não;
 *   - prazo "dia N de 10 dias úteis" e o aviso fora do prazo, que NÃO bloqueia;
 *   - `?alerta=<id>` (vindo do Monitoramento) abre o painel já preenchido;
 *   - clique duplo não grava duas vezes; a recusa do banco aparece na tela;
 *   - só a CGOV registra ciência; a AUDIT só lê.
 * Usamos a fonte de DEMONSTRAÇÃO (dados fictícios da semente), com o perfil escolhido.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { useComunicacoesStore } from '../../src/stores/comunicacoesStore';
import { PERFIS_DEMO_ICMBIO, useAuthStore } from '../../src/stores/authStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar } from '../../src/services/dados/errosBanco';
import { dataCurta } from '../../src/utils/painelResumo';
import { hojeEmBrasilia, somarDiasUteis, subtrairDiasUteis } from '../../src/utils/diasUteis';
import ComunicacoesView from '../../src/views/ComunicacoesView.vue';
import type { PapelGovernanca } from '../../src/types/radar.types';

let montado: VueWrapper | null = null;

afterEach(() => {
  montado?.unmount();
  montado = null;
  definirFonteParaTeste(null);
  document.body.innerHTML = '';
});

/** Monta a página com o perfil `papel` e (opcional) uma fonte ajustada. */
async function montar(papel: PapelGovernanca, caminho = '/comunicacoes', ajuste: Partial<FonteDados> = {}) {
  const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO[papel] });
  definirFonteParaTeste({ ...base, ...ajuste });
  setActivePinia(createPinia());
  useAuthStore().alternarPerfilDemo(papel);
  await useRiscosStore().carregar();
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/comunicacoes', name: 'comunicacoes', component: ComunicacoesView, meta: { titulo: 'Comunicações à CGOV' } },
      { path: '/:qualquer(.*)*', component: { template: '<div />' } },
    ],
  });
  router.push(caminho);
  await router.isReady();
  const w = mount(ComunicacoesView, { global: { plugins: [router] }, attachTo: document.body });
  montado = w;
  await flushPromises();
  return { w, router, base };
}

// Ajudantes de leitura da tela (o painel é "teleportado" para o <body>).
const painel = () => document.body.querySelector('[role="dialog"]') as HTMLElement | null;
const botao = (raiz: ParentNode, texto: string) =>
  [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement | undefined;
const cabecalhos = (w: VueWrapper) => w.findAll('thead th').map((th) => th.text().trim());
const linhas = (w: VueWrapper) => w.findAll('tbody tr');
function campo<T extends HTMLElement>(rotulo: string): T {
  const label = [...painel()!.querySelectorAll('label')].find((l) => l.textContent?.includes(rotulo))!;
  return document.getElementById(label.getAttribute('for')!) as T;
}
function preencher(rotulo: string, valor: string): void {
  const el = campo<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(rotulo);
  el.value = valor;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}

describe('Página Comunicações à CGOV — lista', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('filtro Todas · Novas · Ciência registrada, com o número de novas', async () => {
    const { w } = await montar('cgov');
    const opcoes = w.findAll('[role="radiogroup"] [role="radio"]').map((b) => b.text());
    expect(opcoes).toEqual(['Todas', 'Novas (1)', 'Ciência registrada']);
    expect(linhas(w)).toHaveLength(3);
    await w.findAll('[role="radio"]')[1].trigger('click');
    expect(linhas(w)).toHaveLength(1);
    expect(linhas(w)[0].text()).toContain('Nova');
    await w.findAll('[role="radio"]')[2].trigger('click');
    expect(linhas(w)).toHaveLength(2);
    expect(linhas(w).every((l) => l.text().includes('Ciência registrada'))).toBe(true);
  });

  it('colunas da P-03; só a CGOV vê a Unidade; prazo "no prazo" / "fora do prazo"', async () => {
    const { w } = await montar('cgov');
    expect(cabecalhos(w)).toEqual(['Hipótese', 'Unidade', 'Risco', 'Ciência', 'Comunicação', 'Prazo', 'Situação']);
    const texto = w.find('tbody').text();
    expect(texto).toContain('fora do prazo'); // com-demo-2: 15 dias úteis
    expect(texto).toContain('no prazo');
    expect(texto).toContain('RADAR-');
    w.unmount();
    montado = null;

    const g = await montar('gestor');
    expect(cabecalhos(g.w)).toEqual(['Hipótese', 'Risco', 'Ciência', 'Comunicação', 'Prazo', 'Situação']);
  });

  it('mostra a regra do prazo (Metodologia 4.7.2) e que a comunicação gravada não se apaga', async () => {
    const { w } = await montar('gestor');
    expect(w.text()).toContain('Comunique à CGOV em até 10 dias úteis da ciência do fato');
    expect(w.text()).toContain('A comunicação gravada não se apaga');
  });

  it('celular: a tabela vira cartões (cada célula leva o nome da coluna) e o painel é o SideSheet de tela cheia', async () => {
    const { w } = await montar('gestor');
    const celulas = linhas(w)[0].findAll('td');
    expect(celulas.map((td) => td.attributes('data-rotulo'))).toEqual(['Hipótese', 'Risco', 'Ciência', 'Comunicação', 'Prazo', 'Situação']);
    await w.findAll('tbody tr')[0].trigger('click');
    await flushPromises();
    // O SideSheet ocupa a tela toda no celular (largura min(100%, ...)); aqui só provamos que é ele.
    expect(painel()?.classList.contains('painel-lateral')).toBe(true);
  });
});

describe('Página Comunicações à CGOV — nova comunicação', () => {
  it('"Nova comunicação" abre o painel; hipótese I exige risco', async () => {
    const { w } = await montar('gestor');
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
    expect(painel()!.querySelector('h2')!.textContent).toContain('Nova comunicação');
    preencher('Hipótese', 'I');
    preencher('Data da ciência do fato', subtrairDiasUteis(hojeEmBrasilia(), 1));
    preencher('Descrição do fato', 'O nível residual passou a ser Risco Crítico.');
    await flushPromises();
    const antes = useComunicacoesStore().comunicacoes.length;
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(painel()!.textContent).toContain('Informe o risco ligado');
    expect(useComunicacoesStore().comunicacoes).toHaveLength(antes);
  });

  it('hipótese IV (risco emergente) grava sem risco ligado', async () => {
    const { w } = await montar('gestor');
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
    preencher('Hipótese', 'IV');
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Surgiu um risco novo na fiscalização.');
    await flushPromises();
    const antes = useComunicacoesStore().comunicacoes.length;
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(useComunicacoesStore().comunicacoes).toHaveLength(antes + 1);
    expect(painel()).toBeNull(); // fechou depois de enviar
  });

  it('prazo "dia N de 10 dias úteis"; passado o prazo, avisa sem bloquear', async () => {
    const { w } = await montar('gestor');
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
    const ciencia = subtrairDiasUteis(hojeEmBrasilia(), 3);
    preencher('Data da ciência do fato', ciencia);
    await flushPromises();
    expect(painel()!.textContent).toContain(`dia 3 de 10 dias úteis (vence em ${dataCurta(somarDiasUteis(ciencia, 10))})`);
    expect(painel()!.textContent).not.toContain('Comunicação fora do prazo');

    preencher('Data da ciência do fato', subtrairDiasUteis(hojeEmBrasilia(), 12));
    preencher('Hipótese', 'VI');
    preencher('Descrição do fato', 'Situação que pede apreciação pelas instâncias de governança.');
    await flushPromises();
    expect(painel()!.textContent).toContain('dia 12 de 10 dias úteis');
    expect(painel()!.querySelector('[role="alert"]')!.textContent).toContain('Comunicação fora do prazo de 10 dias úteis');
    const antes = useComunicacoesStore().comunicacoes.length;
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(useComunicacoesStore().comunicacoes).toHaveLength(antes + 1); // não bloqueou
  });

  it('?alerta=<id> abre o painel com a hipótese do alerta, a ciência, os riscos do KRI e as caixas I–III', async () => {
    const { w, router } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1');
    const riscos = useRiscosStore();
    const alerta = riscos.alertasKri.find((a) => a.id === 'alerta-integra-1')!;
    const ligados = riscos.riscos.filter((r) => r.kris.some((k) => k.id === alerta.kriId)).map((r) => r.codigoRadar);
    expect(ligados.length).toBeGreaterThan(0);
    const p = painel()!;
    expect(p.textContent).toContain('Alerta de indicador (KRI)');
    expect(p.textContent).toContain(dataCurta(alerta.cienciaEm));
    expect(p.textContent).toContain('dia 3 de 10 dias úteis');
    for (const codigo of ligados) expect(p.textContent).toContain(codigo);
    const caixas = [...p.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]')];
    expect(caixas.map((c) => c.value)).toEqual(['I', 'II', 'III']);
    expect(p.querySelector('fieldset legend')!.textContent).toContain('Esta comunicação supre as hipóteses I, II, III');
    // Enquanto o painel está aberto, o endereço continua o mesmo (a varredura de acessibilidade confere).
    expect(router.currentRoute.value.query.alerta).toBe('alerta-integra-1');

    caixas[0].click();
    preencher('Descrição do fato', 'Reavaliamos o risco; o nível residual passou a ser Risco Crítico.');
    await flushPromises();
    botao(p, 'Enviar à CGOV')!.click();
    await flushPromises();
    const gravada = useComunicacoesStore().comunicacoes.find((c) => c.alertaId === 'alerta-integra-1')!;
    expect(gravada.hipotese).toBe('alerta_kri');
    expect(gravada.supre).toEqual(['I']);
    expect(gravada.dataCiencia).toBe(alerta.cienciaEm);
    // R15: o alerta foi relido e agora está encerrado (o Monitoramento mostra "comunicado").
    expect(riscos.alertaAbertoDoKri(alerta.kriId)).toBeUndefined();
    // Ao fechar (depois do envio), o `?alerta=` sai do endereço: recarregar não reabre o painel.
    expect(router.currentRoute.value.query.alerta).toBeUndefined();
    expect(w.text()).not.toContain('Este alerta já foi comunicado ou não foi encontrado.');
  });

  it.each(['alerta-que-nao-existe', 'alerta-socio-1'])('?alerta=%s (desconhecido ou encerrado): lista sem painel e aviso', async (id) => {
    const { w } = await montar('gestor', `/comunicacoes?alerta=${id}`);
    expect(painel()).toBeNull();
    expect(w.text()).toContain('Este alerta já foi comunicado ou não foi encontrado.');
    expect(linhas(w).length).toBeGreaterThan(0);
  });

  it('clique duplo não grava duas vezes: o botão fica desabilitado enquanto grava', async () => {
    let chamadas = 0;
    let liberar: (id: string) => void = () => undefined;
    const { w } = await montar('gestor', '/comunicacoes', {
      enviarComunicacao: () => {
        chamadas += 1;
        return new Promise<string>((r) => (liberar = r));
      },
    });
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
    preencher('Hipótese', 'IV');
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Risco novo.');
    await flushPromises();
    const enviar = botao(painel()!, 'Enviar à CGOV')!;
    enviar.click();
    await flushPromises();
    expect(enviar.disabled).toBe(true);
    enviar.click();
    await flushPromises();
    expect(chamadas).toBe(1);
    liberar('com-novo');
    await flushPromises();
  });

  it('a recusa do banco aparece como mensagem no painel (que continua aberto)', async () => {
    const { w } = await montar('gestor', '/comunicacoes', {
      enviarComunicacao: async () => {
        throw new ErroRadar('Este alerta já foi comunicado', 'estado');
      },
    });
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
    preencher('Hipótese', 'IV');
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Risco novo.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(painel()!.querySelector('[role="alert"]')!.textContent).toContain('Este alerta já foi comunicado');
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(false);
  });
});

describe('Página Comunicações à CGOV — por perfil', () => {
  it('CGOV registra a ciência (observação opcional) na comunicação nova', async () => {
    const { w } = await montar('cgov');
    expect(w.findAll('button').some((b) => b.text().includes('Nova comunicação'))).toBe(true);
    const nova = linhas(w).find((l) => l.text().includes('Nova'))!;
    await nova.trigger('click');
    await flushPromises();
    expect(painel()!.textContent).toContain('Recebida em');
    preencher('Observação da CGOV', 'Ciente.');
    botao(painel()!, 'Registrar ciência')!.click();
    await flushPromises();
    expect(useComunicacoesStore().novas).toHaveLength(0);
    expect(painel()!.textContent).toContain('Ciência registrada em');
    expect(botao(painel()!, 'Registrar ciência')).toBeUndefined();
  });

  it('gestor tem "Nova comunicação", mas não "Registrar ciência"', async () => {
    const { w } = await montar('gestor');
    expect(w.findAll('button').some((b) => b.text().includes('Nova comunicação'))).toBe(true);
    await linhas(w).find((l) => l.text().includes('Nova'))!.trigger('click');
    await flushPromises();
    expect(painel()!.textContent).toContain('Recebida em');
    expect(botao(painel()!, 'Registrar ciência')).toBeUndefined();
  });

  it('AUDIT só lê: sem "Nova comunicação" e sem "Registrar ciência"; ?alerta= não abre formulário', async () => {
    const { w } = await montar('auditoria', '/comunicacoes?alerta=alerta-integra-1');
    expect(painel()).toBeNull();
    expect(w.findAll('button').some((b) => b.text().includes('Nova comunicação'))).toBe(false);
    await linhas(w).find((l) => l.text().includes('Nova'))!.trigger('click');
    await flushPromises();
    expect(botao(painel()!, 'Registrar ciência')).toBeUndefined();
    expect(botao(painel()!, 'Enviar à CGOV')).toBeUndefined();
  });
});
