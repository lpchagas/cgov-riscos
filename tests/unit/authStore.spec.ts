import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/authStore';

describe('AuthStore — Perfis de Governança RADAR (1ª Linha, CG, Diretoria e CGOV)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('alterna corretamente entre Gestor (1ª linha), Líder CG, Diretor e CGOV (2ª linha)', () => {
    const store = useAuthStore();
    store.alternarPerfilDemo('gestor');
    expect(store.usuarioAtual.papel).toBe('gestor');
    expect(store.podeAprovarCg).toBe(false);

    store.alternarPerfilDemo('lider_cg');
    expect(store.podeAprovarCg).toBe(true);
    expect(store.podeHomologarDiretoria).toBe(false);

    store.alternarPerfilDemo('diretor');
    expect(store.podeHomologarDiretoria).toBe(true);

    store.alternarPerfilDemo('cgov');
    expect(store.isCgov).toBe(true);
  });
});
