/**
 * EXPLICAÇÃO DIDÁTICA: testa a regra que decide a "situação" de uma conta
 * (pendente, enviado, entrou, suspenso) e o texto mostrado na tabela.
 */
import { describe, expect, it } from 'vitest';
import { situacaoConta, rotuloSituacao } from '../../src/utils/situacaoConta';

describe('situacaoConta', () => {
  it('suspenso vence tudo', () => {
    expect(situacaoConta({ ativo: false }, { conviteEnviadoEm: 'x', ultimoAcessoEm: 'y' })).toBe('suspenso');
  });
  it('ultimoAcessoEm -> entrou', () => {
    expect(situacaoConta({ ativo: true }, { conviteEnviadoEm: '2026-11-01T12:00:00Z', ultimoAcessoEm: '2026-11-14T12:00:00Z' })).toBe('entrou');
  });
  it('só conviteEnviadoEm -> enviado', () => {
    expect(situacaoConta({ ativo: true }, { conviteEnviadoEm: '2026-11-01T12:00:00Z', ultimoAcessoEm: null })).toBe('enviado');
  });
  it('nada (ou sem dados) -> pendente', () => {
    expect(situacaoConta({ ativo: true }, { conviteEnviadoEm: null, ultimoAcessoEm: null })).toBe('pendente');
    expect(situacaoConta({ ativo: true }, undefined)).toBe('pendente');
  });
});

describe('rotuloSituacao', () => {
  it('formata as datas em pt-BR', () => {
    expect(rotuloSituacao('pendente')).toBe('Convite pendente');
    expect(rotuloSituacao('suspenso')).toBe('Suspenso');
    expect(rotuloSituacao('enviado', { conviteEnviadoEm: '2026-11-03T15:00:00Z', ultimoAcessoEm: null })).toBe('Convite enviado em 03/11/2026');
    expect(rotuloSituacao('entrou', { conviteEnviadoEm: null, ultimoAcessoEm: '2026-11-14T15:00:00Z' })).toBe('Entrou em 14/11/2026');
  });
});
