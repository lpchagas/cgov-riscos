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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
import { useToast } from '../../src/composables/useToast';
import { hojeEmBrasilia, somarDiasUteis, subtrairDiasUteis } from '../../src/utils/diasUteis';
import ComunicacoesView from '../../src/views/ComunicacoesView.vue';
import type { PapelGovernanca } from '../../src/types/radar.types';
import type { NovaComunicacao } from '../../src/services/dados/tipos';
import router from '../../src/router/index';

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
    expect(texto).toContain('fora do prazo'); // com-demo-2: 13 dias úteis
    expect(texto).toContain('no prazo');
    expect(texto).toContain('RADAR-');
    w.unmount();
    montado = null;

    const g = await montar('gestor');
    expect(cabecalhos(g.w)).toEqual(['Hipótese', 'Risco', 'Ciência', 'Comunicação', 'Prazo', 'Situação']);
    // I-3: a mais recente primeiro (a semente envia com-demo-3 por último).
    const envios = useComunicacoesStore().comunicacoes.map((c) => c.comunicadaEm);
    expect(envios).toEqual([...envios].sort().reverse());
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
    expect(p.textContent).toContain('Resultado da reavaliação por alerta do KRI'); // m10: rótulo da P-03 §4.2
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

// ============================================================================
// Pacote de correções do fim da Fase 3 (code-review + minors da Task 11)
// ============================================================================
describe('Página Comunicações à CGOV — correções do fim da Fase 3', () => {
  async function abrirNovaComunicacao(w: VueWrapper): Promise<void> {
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
  }

  // I-2 / R20: a unidade que comunica é a do OBJETO do KRI do alerta; sem alerta, a do 1º
  // risco escolhido; só no fim a do perfil. (O perfil pode estar acima do risco.)
  it('com alerta: unidadeId é a unidade do objeto do KRI, não a do perfil', async () => {
    const enviados: NovaComunicacao[] = [];
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    const { w } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1', {
      enviarComunicacao: async (d) => {
        enviados.push(d);
        return base.enviarComunicacao(d);
      },
    });
    // Simula o modo real: perfil lotado em OUTRA unidade (ex.: a unidade-mãe).
    useAuthStore().perfil = { ...perfilFalso(), unidadeId: 'uni-de-lotacao' };
    const riscos = useRiscosStore();
    const alerta = riscos.alertasKri.find((a) => a.id === 'alerta-integra-1')!;
    const kri = riscos.riscos.flatMap((r) => r.kris).find((k) => k.id === alerta.kriId)!;
    const esperada = riscos.objetosContexto.find((o) => o.id === kri.objetoId)!.unidadeId;
    preencher('Descrição do fato', 'Reavaliamos o risco.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(enviados[0].unidadeId).toBe(esperada);
    w.unmount();
    montado = null;
  });

  it('sem alerta: unidadeId é a unidade do risco escolhido, não a do perfil', async () => {
    const enviados: NovaComunicacao[] = [];
    const { w } = await montar('gestor', '/comunicacoes', {
      enviarComunicacao: async (d) => {
        enviados.push(d);
        return 'com-x';
      },
    });
    useAuthStore().perfil = { ...perfilFalso(), unidadeId: 'uni-de-lotacao' };
    await abrirNovaComunicacao(w);
    preencher('Hipótese', 'V');
    preencher('Data da ciência do fato', hojeEmBrasilia());
    const opcao = campo<HTMLSelectElement>('Risco ligado').querySelectorAll('option')[1];
    preencher('Risco ligado', opcao.value);
    preencher('Descrição do fato', 'Tratamento atrasado.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(enviados[0].unidadeId).toBe(useRiscosStore().obterRiscoPorId(opcao.value)!.unidadeId);
  });

  // I-4 / R21: alerta de KRI sem risco no alcance não pode ser comunicado (o banco exige risco).
  it('alerta de KRI órfão: "Enviar à CGOV" desabilitado, com a orientação ligada ao botão', async () => {
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    await montar('gestor', '/comunicacoes?alerta=alerta-integra-1', {
      carregarCarteira: async () => {
        const c = await base.carregarCarteira();
        const orfao = c.riscos.flatMap((r) => r.kris).find((k) => k.id === 'kri-integra-1')!;
        for (const r of c.riscos) r.kris = r.kris.filter((k) => k.id !== 'kri-integra-1');
        return { ...c, krisSemRisco: [{ ...orfao, riscoIds: [], totalRiscos: 0 }] };
      },
    });
    const enviar = botao(painel()!, 'Enviar à CGOV')!;
    expect(enviar.disabled).toBe(true);
    const orientacao = document.getElementById(enviar.getAttribute('aria-describedby')!)!;
    expect(orientacao.textContent).toContain('Ligue o indicador a um risco para comunicar à CGOV');
  });

  it('alerta com riscos fora do alcance: "Enviar à CGOV" desabilitado e explicado', async () => {
    await montar('gestor', '/comunicacoes?alerta=alerta-integra-1', { objetosOndeGravo: async () => [] });
    const enviar = botao(painel()!, 'Enviar à CGOV')!;
    expect(enviar.disabled).toBe(true);
    expect(document.getElementById(enviar.getAttribute('aria-describedby')!)!.textContent).toContain('fora do seu alcance');
  });

  // m1: enquanto lê os objetos onde a pessoa grava, nada de oferecer riscos de fora nem enviar.
  it('enquanto lê os riscos onde a pessoa grava: sem opções de risco e "Enviar" desabilitado', async () => {
    let liberar: (ids: string[]) => void = () => undefined;
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    const { w } = await montar('gestor', '/comunicacoes', {
      objetosOndeGravo: () => new Promise<string[]>((r) => (liberar = r)),
    });
    await abrirNovaComunicacao(w);
    preencher('Hipótese', 'V');
    await flushPromises();
    expect(campo<HTMLSelectElement>('Risco ligado').querySelectorAll('option')).toHaveLength(1);
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(true);
    expect(painel()!.textContent).toContain('Carregando os riscos');
    liberar(await base.objetosOndeGravo());
    await flushPromises();
    expect(campo<HTMLSelectElement>('Risco ligado').querySelectorAll('option').length).toBeGreaterThan(1);
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(false);
  });

  // N-1 (m2): "hoje" é relido a cada abertura do painel (a aba pode ficar aberta de um dia para o outro).
  it('"hoje" é recalculado a cada abertura do painel', async () => {
    // O relógio volta 3 dias úteis ANTES de montar (o Vue compara a hora dos eventos com a
    // hora em que o ouvinte foi ligado; montar no "passado" mantém essa conta coerente).
    const ciencia = subtrairDiasUteis(hojeEmBrasilia(), 3);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(`${ciencia}T15:00:00.000Z`));
      const { w } = await montar('gestor');
      await abrirNovaComunicacao(w);
      preencher('Data da ciência do fato', ciencia);
      await flushPromises();
      expect(painel()!.textContent).toContain('dia 0 de 10 dias úteis');
      botao(painel()!, 'Cancelar')!.click();
      await flushPromises();
      vi.useRealTimers();
      await abrirNovaComunicacao(w);
      preencher('Data da ciência do fato', ciencia);
      await flushPromises();
      expect(painel()!.textContent).toContain('dia 3 de 10 dias úteis');
    } finally {
      vi.useRealTimers();
    }
  });

  // N-5: "risco ainda sem ficha" só faz sentido na hipótese IV (risco emergente).
  it.each([
    ['IV', 'Nenhum (risco ainda sem ficha)'],
    ['VI', 'Nenhum'],
  ])('comunicação %s sem risco: "Riscos ligados" mostra "%s"', async (hipotese, texto) => {
    const { w } = await montar('gestor');
    await abrirNovaComunicacao(w);
    preencher('Hipótese', hipotese);
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Fato sem risco ligado.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    const nova = useComunicacoesStore().comunicacoes.find((c) => c.descricao === 'Fato sem risco ligado.')!;
    await linhas(w).find((l) => l.text().includes(dataCurta(nova.dataCiencia)) && l.text().startsWith(hipotese))!.trigger('click');
    await flushPromises();
    const dd = [...painel()!.querySelectorAll('dt')].find((dt) => dt.textContent === 'Riscos ligados')!.nextElementSibling!;
    expect(dd.textContent!.trim()).toBe(texto);
  });

  // m4: 2º envio do mesmo alerta pelo caminho da tela. Outra pessoa comunicou o alerta
  // enquanto o painel estava aberto; a recusa aparece clara e o painel fica aberto.
  it('alerta comunicado por outra pessoa enquanto o painel estava aberto: mensagem clara', async () => {
    const { base } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1');
    const riscos = useRiscosStore();
    const alerta = riscos.alertasKri.find((a) => a.id === 'alerta-integra-1')!;
    const kri = riscos.riscos.flatMap((r) => r.kris).find((k) => k.id === alerta.kriId)!;
    await base.enviarComunicacao({
      unidadeId: riscos.obterRiscoPorId(kri.riscoIds[0])!.unidadeId,
      hipotese: 'alerta_kri',
      dataCiencia: alerta.cienciaEm,
      descricao: 'Enviada em outra aba.',
      alertaId: alerta.id,
      riscoIds: [kri.riscoIds[0]],
      supre: [],
    });
    preencher('Descrição do fato', 'Reavaliamos o risco.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    expect(painel()!.querySelector('[role="alert"]')!.textContent).toContain('Este alerta já foi comunicado');
  });

  // m8: a linha do prazo descreve o campo de data (o leitor de tela lê o prazo junto).
  it('a linha do prazo está ligada ao campo de data (aria-describedby)', async () => {
    const { w } = await montar('gestor');
    await abrirNovaComunicacao(w);
    preencher('Data da ciência do fato', subtrairDiasUteis(hojeEmBrasilia(), 2));
    await flushPromises();
    const ids = campo<HTMLInputElement>('Data da ciência do fato').getAttribute('aria-describedby')!.split(' ');
    const textos = ids.map((id) => document.getElementById(id)?.textContent ?? '');
    expect(textos.some((t) => t.includes('dia 2 de 10 dias úteis'))).toBe(true);
  });

  // N-4: o item 4.7.2 é da Metodologia (Minuta SEI 024421455); a Política entra pelo art. 17, IV.
  it('cita a Metodologia, item 4.7.2 (no painel e no fundamento da rota)', async () => {
    const { w } = await montar('gestor');
    await abrirNovaComunicacao(w);
    expect(painel()!.textContent).toContain('Metodologia, item 4.7.2');
    expect(painel()!.textContent).not.toContain('Política, item 4.7.2');
    const fundamento = String(router.getRoutes().find((r) => r.name === 'comunicacoes')!.meta.fundamento);
    expect(fundamento).toBe('Item 4.7.2 da Metodologia (Minuta SEI 024421455) e art. 17, IV, da Política RADAR (Minuta SEI 024241420).');
  });
});

// ============================================================================
// Achados do CodeRabbit na PR #21 (E3 a E8)
// ============================================================================
describe('Página Comunicações à CGOV — achados da PR #21', () => {
  async function abrirNovaComunicacao(w: VueWrapper): Promise<void> {
    await w.findAll('button').find((b) => b.text().includes('Nova comunicação'))!.trigger('click');
    await flushPromises();
  }
  const caixasSupre = () => [...painel()!.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]')];

  // E3: se a leitura dos objetos onde a pessoa grava falhar, NADA de liberar os riscos
  // visíveis (podem estar fora do alcance de escrita): falha à vista + "Tentar de novo".
  it('E3: leitura do alcance falhou → envio bloqueado, falha à vista e "Tentar de novo" que libera', async () => {
    let falhar = true;
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    await montar('gestor', '/comunicacoes?alerta=alerta-integra-1', {
      objetosOndeGravo: async () => {
        if (falhar) throw new ErroRadar('A conexão caiu.', 'rede');
        return base.objetosOndeGravo();
      },
    });
    const enviar = botao(painel()!, 'Enviar à CGOV')!;
    expect(enviar.disabled).toBe(true);
    expect(painel()!.textContent).toContain('Não foi possível ler os riscos em que você pode gravar');
    expect(painel()!.textContent).not.toContain('fora do seu alcance'); // não é falta de alcance
    expect(painel()!.querySelector('.riscos-alerta')!.textContent).not.toContain('RADAR-');
    falhar = false;
    botao(painel()!, 'Tentar de novo')!.click();
    await flushPromises();
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(false);
    expect(painel()!.querySelector('.riscos-alerta')!.textContent).toContain('RADAR-');
  });

  it('E3: sem alerta, a falha da leitura também não oferece riscos de fora do alcance', async () => {
    const { w } = await montar('gestor', '/comunicacoes', {
      objetosOndeGravo: async () => {
        throw new ErroRadar('A conexão caiu.', 'rede');
      },
    });
    await abrirNovaComunicacao(w);
    preencher('Hipótese', 'V');
    await flushPromises();
    expect(campo<HTMLSelectElement>('Risco ligado').querySelectorAll('option')).toHaveLength(1);
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(true);
    expect(botao(painel()!, 'Tentar de novo')).toBeDefined();
  });

  // Ajuste E3 (decisão do controlador): a falha só trava as hipóteses que EXIGEM risco.
  it.each([
    ['IV', false],
    ['I', true],
  ])('Ajuste E3: leitura do alcance falhou, hipótese %s → envio travado = %s; aviso e "Tentar de novo" à vista', async (h, travado) => {
    const { w } = await montar('gestor', '/comunicacoes', {
      objetosOndeGravo: async () => {
        throw new ErroRadar('A conexão caiu.', 'rede');
      },
    });
    // Modo real: o perfil traz a unidade de lotação (sem risco, IV e VI comunicam por ela).
    useAuthStore().perfil = { ...perfilFalso(), unidadeId: useRiscosStore().riscos[0].unidadeId };
    await abrirNovaComunicacao(w);
    preencher('Hipótese', h);
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Fato com a leitura do alcance falha.');
    await flushPromises();
    expect(painel()!.textContent).toContain('Não foi possível ler os riscos em que você pode gravar');
    expect(botao(painel()!, 'Tentar de novo')).toBeDefined();
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(travado);
    if (!travado) {
      const antes = useComunicacoesStore().comunicacoes.length;
      botao(painel()!, 'Enviar à CGOV')!.click();
      await flushPromises();
      expect(useComunicacoesStore().comunicacoes).toHaveLength(antes + 1);
    }
  });

  // E4: o painel aberto atravessa a meia-noite de Brasília: "hoje" vira sozinho (sem apagar
  // o rascunho) e a validação do envio usa a data do MOMENTO do envio.
  it('E4: virada do dia com o painel aberto atualiza o limite da data e mantém o rascunho', async () => {
    // 23:59 em Brasília (UTC-3) = 02:59 UTC do dia seguinte.
    const ontem = '2026-12-01';
    const amanha = '2026-12-02';
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date(`${amanha}T02:59:00.000Z`));
      const { w } = await montar('gestor');
      await abrirNovaComunicacao(w);
      preencher('Descrição do fato', 'Rascunho que atravessa a meia-noite.');
      expect(campo<HTMLInputElement>('Data da ciência do fato').max).toBe(ontem);
      vi.setSystemTime(new Date(`${amanha}T03:01:00.000Z`)); // 00:01 em Brasília
      vi.advanceTimersByTime(60_000);
      await flushPromises();
      expect(campo<HTMLInputElement>('Data da ciência do fato').max).toBe(amanha);
      expect(campo<HTMLTextAreaElement>('Descrição do fato').value).toBe('Rascunho que atravessa a meia-noite.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('E4: depois da meia-noite, a data de "hoje" é aceita no envio mesmo antes do relógio do painel virar', async () => {
    const amanha = '2026-12-02';
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date(`${amanha}T02:59:30.000Z`));
      const { w } = await montar('gestor');
      await abrirNovaComunicacao(w);
      vi.setSystemTime(new Date(`${amanha}T03:00:10.000Z`)); // virou, mas o intervalo ainda não rodou
      preencher('Hipótese', 'IV');
      preencher('Data da ciência do fato', amanha);
      preencher('Descrição do fato', 'Risco novo logo depois da meia-noite.');
      await flushPromises();
      const antes = useComunicacoesStore().comunicacoes.length;
      botao(painel()!, 'Enviar à CGOV')!.click();
      await flushPromises();
      expect(document.body.textContent).not.toContain('A data da ciência não pode ser futura');
      expect(useComunicacoesStore().comunicacoes).toHaveLength(antes + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  // E5: a URL troca de alerta com o painel aberto → formulário novo; mesmo alerta → rascunho fica.
  it('E5: trocar o alerta na URL reinicia o formulário; o mesmo alerta mantém o rascunho', async () => {
    const { router } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1');
    preencher('Descrição do fato', 'Reavaliação do alerta A.');
    caixasSupre()[0].click();
    await flushPromises();
    // Mesmo alerta (ex.: a carteira foi relida): nada se perde.
    await useRiscosStore().carregar();
    await flushPromises();
    expect(campo<HTMLTextAreaElement>('Descrição do fato').value).toBe('Reavaliação do alerta A.');
    expect(caixasSupre()[0].checked).toBe(true);
    // Outro alerta: começa do zero.
    await router.push('/comunicacoes?alerta=alerta-anexo-ii-1');
    await flushPromises();
    expect(painel()).not.toBeNull();
    expect(campo<HTMLTextAreaElement>('Descrição do fato').value).toBe('');
    expect(caixasSupre().some((c) => c.checked)).toBe(false);
  });

  // E6: o resultado de um envio pertence à abertura que o iniciou.
  it.each([
    ['grava', 'A comunicação anterior foi enviada à CGOV.'],
    ['falha', 'A comunicação anterior não foi gravada'],
  ])('E6: envio de A (%s) depois de cancelar e abrir B não mexe em B; um aviso global informa A', async (desfecho, aviso) => {
    let liberar: (id: string) => void = () => undefined;
    let recusar: (e: Error) => void = () => undefined;
    const { w } = await montar('gestor', '/comunicacoes', {
      enviarComunicacao: () =>
        new Promise<string>((ok, nao) => {
          liberar = ok;
          recusar = nao;
        }),
    });
    useToast().toasts.value = [];
    await abrirNovaComunicacao(w);
    preencher('Hipótese', 'IV');
    preencher('Data da ciência do fato', hojeEmBrasilia());
    preencher('Descrição do fato', 'Comunicação A.');
    await flushPromises();
    botao(painel()!, 'Enviar à CGOV')!.click();
    await flushPromises();
    botao(painel()!, 'Cancelar')!.click();
    await flushPromises();
    await abrirNovaComunicacao(w);
    preencher('Descrição do fato', 'Rascunho B.');
    await flushPromises();
    expect(botao(painel()!, 'Enviar à CGOV')!.disabled).toBe(false); // B não herda o "gravando" de A
    if (desfecho === 'grava') liberar('com-a');
    else recusar(new ErroRadar('Recusa do banco para A.', 'validacao'));
    await flushPromises();
    expect(painel()).not.toBeNull(); // B continua aberto
    expect(campo<HTMLTextAreaElement>('Descrição do fato').value).toBe('Rascunho B.');
    expect(painel()!.textContent).not.toContain('A comunicação não foi gravada');
    expect(painel()!.textContent).not.toContain('Recusa do banco para A.');
    expect(useToast().toasts.value.some((t) => t.mensagem.includes(aviso))).toBe(true);
  });

  // E7: falha ao LER os alertas não é "alerta inexistente": oferece nova tentativa e guarda o ?alerta.
  it('E7: falha na leitura dos alertas → mensagem própria, "Tentar de novo" e o painel abre quando a leitura funciona', async () => {
    let falhar = true;
    const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.gestor });
    const { w, router } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1', {
      listarAlertasKri: async () => {
        if (falhar) throw new ErroRadar('A conexão caiu.', 'rede');
        return base.listarAlertasKri();
      },
    });
    expect(painel()).toBeNull();
    expect(w.text()).not.toContain('Este alerta já foi comunicado ou não foi encontrado.');
    expect(w.text()).toContain('Não foi possível ler os alertas dos indicadores');
    expect(router.currentRoute.value.query.alerta).toBe('alerta-integra-1');
    falhar = false;
    await w.findAll('button').find((b) => b.text().includes('Tentar de novo'))!.trigger('click');
    await flushPromises();
    expect(painel()!.textContent).toContain('Resultado da reavaliação por alerta do KRI');
    expect(w.text()).not.toContain('Não foi possível ler os alertas dos indicadores');
  });

  // E8: com o painel de A aberto, a URL passa a um alerta inválido → fecha o painel e mostra o aviso.
  it('E8: URL muda para alerta inválido com o painel aberto → fecha o painel e mostra o aviso (R16)', async () => {
    const { w, router } = await montar('gestor', '/comunicacoes?alerta=alerta-integra-1');
    expect(painel()).not.toBeNull();
    await router.push('/comunicacoes?alerta=alerta-que-nao-existe');
    await flushPromises();
    expect(painel()).toBeNull();
    expect(w.text()).toContain('Este alerta já foi comunicado ou não foi encontrado.');
  });
});

/** Perfil do modo real (só os campos; no modo demonstração ele só pesa na unidade que comunica). */
function perfilFalso() {
  return {
    id: 'p1', nome: 'Pessoa de teste', email: 'pessoa@radar.test', cargo: null, papel: 'gestor' as const,
    unidadeId: 'uni-x', unidadeSigla: 'X', unidadeNome: 'Unidade X', titularChefia: false, ativo: true,
  };
}

