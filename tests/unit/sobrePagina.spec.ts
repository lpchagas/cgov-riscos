/**
 * ============================================================================
 * TESTES DA PÁGINA "SOBRE O RADAR" E DO RODAPÉ ENXUTO (Fase 4)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O rodapé deixou de repetir normas, contato e painéis em todas as páginas:
 * agora ele traz atalhos (âncoras) para a página `/sobre`. Os testes garantem:
 *   1. cada atalho do rodapé aponta para uma seção que EXISTE na página;
 *   2. a versão mostrada é a do `package.json` (não um número digitado à mão);
 *   3. as normas-base do Regime B estão lá e a sigla "PGR" nunca aparece.
 */
import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { version } from '../../package.json';
import SobreRadarView from '../../src/views/SobreRadarView.vue';
import BrFooter from '../../src/components/govbr/BrFooter.vue';

async function montar(componente: typeof SobreRadarView | typeof BrFooter) {
  const vazio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sobre', name: 'sobre-radar', component: SobreRadarView },
      { path: '/auditoria', name: 'trilha-auditoria', component: vazio },
    ],
  });
  router.push('/sobre');
  await router.isReady();
  const w = mount(componente, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

describe('Página Sobre o RADAR', () => {
  it('mostra a versão do package.json e o endereço do código-fonte', async () => {
    const w = await montar(SobreRadarView);
    expect(w.text()).toContain(`RADAR · versão ${version}`);
    expect(w.find('a[href="https://github.com/lpchagas/cgov-riscos"]').exists()).toBe(true);
  });

  it('lista as normas-base do Regime B e nunca usa a sigla PGR', async () => {
    const w = await montar(SobreRadarView);
    const texto = w.text();
    expect(texto).toContain('Minuta SEI 024241420');
    expect(texto).toContain('Minuta SEI 024421455');
    expect(texto).toContain('Portaria ICMBio nº 253/2026');
    expect(texto).not.toMatch(/\bPGR\b/);
    expect(texto).toContain('Plano de Gestão de Riscos');
  });

  it('cada seção tem um h2 ligado por aria-labelledby (estrutura de relatório)', async () => {
    const w = await montar(SobreRadarView);
    const secoes = w.findAll('section.relatorio__secao');
    expect(secoes).toHaveLength(5);
    for (const s of secoes) {
      const h2 = s.find('h2');
      expect(h2.attributes('id')).toBe(s.attributes('aria-labelledby'));
    }
  });
});

describe('Rodapé enxuto', () => {
  it('cada atalho do rodapé leva a uma seção que existe na página Sobre', async () => {
    const rodape = await montar(BrFooter);
    const pagina = await montar(SobreRadarView);
    const hrefs = rodape.findAll('.rodape__atalhos a').map((a) => a.attributes('href'));
    expect(hrefs).toHaveLength(5);
    for (const href of hrefs) {
      const [caminho, ancora] = href!.split('#');
      expect(caminho).toBe('/sobre');
      expect(pagina.find(`section#${ancora}`).exists()).toBe(true);
    }
  });

  it('mantém CGGE, CGOV e CTGRIC e não repete mais normas e DIGITECA', async () => {
    const w = await montar(BrFooter);
    for (const sigla of ['CGGE', 'CGOV', 'CTGRIC']) expect(w.text()).toContain(sigla);
    expect(w.text()).not.toContain('Minuta SEI');
    expect(w.text()).not.toContain('DIGITECA');
  });
});
