import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, CHAVE_PERFIL_DEMO } from '../../src/stores/authStore';
import { PAPEIS } from '../../src/utils/acessoPorPerfil';

describe('AuthStore — simulador dos 10 perfis do RADAR (modo demonstração)', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('o padrão continua sendo a CGOV', () => {
    expect(useAuthStore().usuarioAtual.papel).toBe('cgov');
  });

  it('há um perfil de demonstração para cada um dos 10 papéis', () => {
    const store = useAuthStore();
    for (const p of PAPEIS) expect(store.perfisDisponiveisDemo[p].papel).toBe(p);
  });

  it('alterna entre os 10 perfis e as capacidades mudam junto', () => {
    const store = useAuthStore();
    for (const p of PAPEIS) {
      store.alternarPerfilDemo(p);
      expect(store.usuarioAtual.papel).toBe(p);
      expect(store.capacidades.importa).toBe(p === 'cgov');
      expect(store.podeAprovarCg).toBe(store.capacidades.podeValidar);
      expect(store.podeHomologarDiretoria).toBe(store.capacidades.podeHomologar);
      expect(store.isCgov).toBe(p === 'cgov');
    }
  });

  it('a CGOV deixa de validar e de homologar (mudança da spec 8.4)', () => {
    const store = useAuthStore();
    store.alternarPerfilDemo('cgov');
    expect(store.podeAprovarCg).toBe(false);
    expect(store.podeHomologarDiretoria).toBe(false);
    store.alternarPerfilDemo('coordenador_geral');
    expect(store.podeAprovarCg).toBe(true);
    expect(store.podeHomologarDiretoria).toBe(false);
    store.alternarPerfilDemo('diretor');
    expect(store.podeHomologarDiretoria).toBe(true);
  });

  it('guarda o papel simulado no localStorage e o relê ao iniciar', () => {
    useAuthStore().alternarPerfilDemo('auditoria');
    expect(localStorage.getItem(CHAVE_PERFIL_DEMO)).toBe('auditoria');
    setActivePinia(createPinia());
    expect(useAuthStore().usuarioAtual.papel).toBe('auditoria');
  });

  it('valor inválido no localStorage cai no padrão cgov', () => {
    localStorage.setItem(CHAVE_PERFIL_DEMO, 'lider_cg');
    expect(useAuthStore().usuarioAtual.papel).toBe('cgov');
  });

  it('sair() no modo demonstração não faz nada: a situação continua ativa', async () => {
    const store = useAuthStore();
    await store.sair();
    expect(store.situacao).toBe('ativo');
    expect(store.usuarioAtual.papel).toBe('cgov');
  });
});
