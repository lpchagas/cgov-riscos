// Preparação comum dos testes de unidade.
// O perfil simulado (authStore) é guardado no localStorage; sem esta limpeza, o perfil de um
// teste "vazaria" para o seguinte.
import { beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});
