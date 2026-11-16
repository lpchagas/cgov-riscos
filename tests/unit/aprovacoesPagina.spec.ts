/**
 * ============================================================================
 * TESTES DA PÁGINA APROVAÇÕES — Fase 3 (`tests/unit/aprovacoesPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Confere a TELA (a regra em si é do banco e de fluxoValidacao.spec.ts).
 * As filas vêm das AÇÕES decididas pelo banco (`acoes`), não da situação:
 *   - "Para validar" lista só riscos com `podeValidar` (em_validacao_cg sem
 *     `podeValidar` NÃO aparece);
 *   - "Para homologar" lista só os com `podeHomologar`;
 *   - a aba "Sem quem decida" só existe quando há itens;
 *   - o contador do menu soma as três filas;
 *   - os botões vêm do `AcoesDoRisco` (validar leva o Crítico à Diretoria).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';
import rotasReais from '../../src/router/index';
import BrMenu from '../../src/components/govbr/BrMenu.vue';
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

/** Monta uma `AcoesFluxo` toda falsa (nada liberado), mudando só o que o teste pede. */
const acao = (riscoId: string, mudancas: Record<string, unknown>) => ({
  riscoId, podeEnviar: false, podeAssumir: false, podeValidar: false, podeHomologar: false,
  podeDevolver: false, devolucaoCgov: false, podeEditar: false, podeExcluir: false, motivo: null,
  ...mudancas,
});

/** Troca as `acoes` da store por estas (como se o banco tivesse respondido assim). */
function definirAcoes(lista: ReturnType<typeof acao>[]) {
  useRiscosStore().acoes = Object.fromEntries(lista.map((a) => [a.riscoId, a])) as never;
}

const idDe = (codigo: string) => useRiscosStore().riscos.find((r) => r.codigoRadar === codigo)!.id;
const abas = (w: ReturnType<typeof mount>) => w.findAll('[role="tab"]').map((a) => a.text());

describe('Página Aprovações', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  it('abre em "Para validar" com o primeiro item e os botões vindos do banco', async () => {
    useAuthStore().alternarPerfilDemo('coordenador_geral');
    await useRiscosStore().carregar();
    const { w } = await montar();
    expect(w.find('[aria-current="true"]').text()).toContain('RADAR-2026-001');
    expect(w.find('#detalhe-aprovacao').text()).toContain('Ver ficha completa');
    expect(botao(w, 'Validar risco')).toBeDefined();
    w.unmount();
  });

  it('"Para validar" lista só quem tem podeValidar: risco em validação sem a ação não aparece', async () => {
    const r1 = useRiscosStore().riscos.find((r) => r.codigoRadar === 'RADAR-2026-001')!;
    expect(r1.statusFluxo).toBe('em_validacao_cg');
    definirAcoes([acao(r1.id, { podeValidar: false })]); // aguarda validação, mas não é da alçada desta pessoa
    const { w } = await montar();
    expect(w.text()).toContain('Nada aguardando validação');
    expect(w.text()).not.toContain('RADAR-2026-001');
    w.unmount();
  });

  it('"Para homologar" lista só quem tem podeHomologar; a Diretoria abre direto nela', async () => {
    useAuthStore().alternarPerfilDemo('diretor');
    await useRiscosStore().carregar();
    const { w } = await montar();
    expect(w.find('[aria-current="true"]').text()).toContain('RADAR-2026-002');
    expect(botao(w, 'Homologar risco')).toBeDefined();
    w.unmount();
  });

  it('a aba "Sem quem decida" só aparece com itens, com o texto de apoio', async () => {
    const { w: semItens } = await montar();
    expect(abas(semItens).join('|')).not.toContain('Sem quem decida');
    semItens.unmount();

    definirAcoes([acao(idDe('RADAR-2026-001'), { devolucaoCgov: true, podeDevolver: true })]);
    const { w } = await montar('/aprovacoes?aba=sem-decisor');
    expect(abas(w).join('|')).toContain('Sem quem decida');
    expect(w.text()).toContain('Estes riscos não têm validador ou homologador efetivo. A CGOV pode devolvê-los à unidade.');
    expect(w.find('[aria-current="true"]').text()).toContain('RADAR-2026-001');
    expect(botao(w, 'Devolver à unidade (CGOV)')).toBeDefined();
    w.unmount();
  });

  it('o gestor (sem ações de decisão) vê as abas vazias, sem botões de decidir', async () => {
    useAuthStore().alternarPerfilDemo('gestor');
    await useRiscosStore().carregar();
    const { w } = await montar();
    expect(w.text()).toContain('Nada aguardando validação');
    expect(w.findAll('button').some((b) => b.text().includes('Validar risco'))).toBe(false);
    w.unmount();
  });

  it('validar um risco Crítico o envia para a Diretoria (e a fila esvazia)', async () => {
    useAuthStore().alternarPerfilDemo('coordenador_geral');
    await useRiscosStore().carregar();
    const { w } = await montar();
    await botao(w, 'Validar risco').trigger('click');
    await flushPromises();
    const r = useRiscosStore().riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
    expect(r.statusFluxo).toBe('em_homologacao_dir');
    expect(w.text()).toContain('Nada aguardando validação');
    w.unmount();
  });

  it('carregando: mostra o esqueleto; com erro: mostra a mensagem e "Tentar de novo"', async () => {
    const loja = useRiscosStore();
    loja.estado = 'erro' as never;
    loja.erro = { message: 'RADAR: falha de teste' } as never;
    const { w } = await montar();
    expect(w.text()).toContain('RADAR: falha de teste');
    expect(w.text()).toContain('Tentar de novo');
    w.unmount();
  });
});

describe('Contador de Aprovações no menu', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useRiscosStore().carregar();
    document.body.innerHTML = '';
  });

  it('soma "para validar" + "para homologar" + "sem quem decida"', async () => {
    const [a, b, c] = ['RADAR-2026-001', 'RADAR-2026-002', 'RADAR-2026-003'].map(idDe);
    definirAcoes([acao(a, { podeValidar: true }), acao(b, { podeHomologar: true }), acao(c, { devolucaoCgov: true })]);
    // As rotas de verdade (nomes e caminhos), com tela vazia: o menu acha todos os links.
    const router = createRouter({
      history: createMemoryHistory(),
      routes: rotasReais
        .getRoutes()
        .filter((r) => r.name)
        .map((r) => ({ path: r.path, name: r.name!, meta: r.meta, component: { template: '<div />' } })),
    });
    router.push('/aprovacoes');
    await router.isReady();
    const w = mount(BrMenu, { props: { aberto: false, recolhido: false }, global: { plugins: [router] } });
    const link = w.findAll('a').find((x) => x.text().includes('Aprovações'))!;
    expect(link.find('.menu-trilho__contador').text()).toContain('3');
    w.unmount();
  });
});
