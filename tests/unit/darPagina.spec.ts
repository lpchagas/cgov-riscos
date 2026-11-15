/**
 * ============================================================================
 * TESTES DA PÁGINA APETITE (DAR) — Fase 3 (`tests/unit/darPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * 1. A prévia (`simularImpactoDar`) tem de concordar com o que a store faz de
 *    verdade ao aplicar a mudança — senão a tela "prometeria" uma coisa e
 *    faria outra.
 * 2. A página: só a CGOV edita; mudar o apetite abre a janela de prévia;
 *    confirmar aplica; "Desfazer" volta ao apetite anterior.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/composables/useToast';
import { simularImpactoDar, resumirImpactoDar } from '../../src/utils/darImpacto';
import DeclaracaoApetiteDarView from '../../src/views/DeclaracaoApetiteDarView.vue';

const SOCIOAMBIENTAL = 7; // RADAR-2026-003: residual 8,4 (Médio), apetite Baixo → Crítico

describe('simularImpactoDar', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('prevê que o RADAR-2026-003 deixa de ser Crítico com apetite Moderado', () => {
    const store = useRiscosStore();
    const impacto = simularImpactoDar(store.riscos, SOCIOAMBIENTAL, 'moderado');
    expect(impacto.deixamDeSerCriticos.map((m) => m.risco.codigoRadar)).toEqual(['RADAR-2026-003']);
    expect(impacto.passamACriticos).toHaveLength(0);
    expect(resumirImpactoDar(impacto)).toBe('1 risco deixa de ser Crítico.');
  });

  it('a prévia bate com o que a store aplica (mesma regra oficial)', () => {
    const store = useRiscosStore();
    for (const apetite of ['baixo', 'moderado', 'pendente_dar'] as const) {
      const previsto = simularImpactoDar(store.riscos, SOCIOAMBIENTAL, apetite);
      const esperadoCriticos = store.riscos.filter((r) => r.categoriaId === SOCIOAMBIENTAL && r.statusCritico === 'sim').length
        + previsto.passamACriticos.length - previsto.deixamDeSerCriticos.length;
      store.alterarApetiteCategoriaDAR(SOCIOAMBIENTAL, apetite);
      const real = store.riscos.filter((r) => r.categoriaId === SOCIOAMBIENTAL && r.statusCritico === 'sim').length;
      expect(real).toBe(esperadoCriticos);
    }
  });

  it('Extremo continua Crítico em qualquer apetite (nenhuma categoria aceita Alto/Extremo)', () => {
    const store = useRiscosStore();
    const integridade = store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-002')!;
    const impacto = simularImpactoDar(store.riscos, integridade.categoriaId, 'moderado');
    expect(impacto.deixamDeSerCriticos.map((m) => m.risco.codigoRadar)).not.toContain('RADAR-2026-002');
  });
});

describe('Página Apetite (DAR)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  async function montar() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dar', name: 'dar-apetite', component: DeclaracaoApetiteDarView },
        ...['riscos-lista', 'ficha-bowtie-detalhe'].map((name) => ({ path: `/${name}/:id?`, name, component: { template: '<div />' } })),
      ],
    });
    router.push('/dar');
    await router.isReady();
    const w = mount(DeclaracaoApetiteDarView, { global: { plugins: [router] }, attachTo: document.body });
    await flushPromises();
    return w;
  }

  const grupoSocioambiental = (w: Awaited<ReturnType<typeof montar>>) =>
    w.find('[role="radiogroup"][aria-label="Apetite da categoria Socioambiental"]');

  it('mostra as 8 categorias, cada uma com o controle de apetite rotulado', async () => {
    const w = await montar();
    expect(w.findAll('.categoria')).toHaveLength(8);
    expect(grupoSocioambiental(w).exists()).toBe(true);
  });

  it('fora do perfil CGOV, os controles ficam desabilitados', async () => {
    useAuthStore().alternarPerfilDemo('gestor');
    const w = await montar();
    expect(grupoSocioambiental(w).findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(w.text()).toContain('Só a CGOV');
  });

  it('mudar o apetite abre a prévia; confirmar aplica; Desfazer volta', async () => {
    const w = await montar();
    const store = useRiscosStore();
    const moderado = grupoSocioambiental(w).findAll('button').find((b) => b.text().includes('Moderado'))!;
    await moderado.trigger('click');
    await flushPromises();

    // A janela de prévia está aberta e o apetite AINDA não mudou.
    const dialogo = document.body.querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain('1 risco deixa de ser Crítico');
    expect(store.categorias.find((c) => c.id === SOCIOAMBIENTAL)!.apetiteDeclarado).toBe('baixo');

    // Confirmar
    const confirmar = [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.includes('Mudar apetite'))!;
    confirmar.click();
    await flushPromises();
    expect(store.categorias.find((c) => c.id === SOCIOAMBIENTAL)!.apetiteDeclarado).toBe('moderado');
    expect(store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-003')!.statusCritico).toBe('nao');

    // Desfazer pelo aviso
    const { toasts } = useToast();
    const aviso = toasts.value[toasts.value.length - 1];
    aviso.acao!.executar();
    expect(store.categorias.find((c) => c.id === SOCIOAMBIENTAL)!.apetiteDeclarado).toBe('baixo');
    expect(store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-003')!.statusCritico).toBe('sim');
    w.unmount();
  });
});
