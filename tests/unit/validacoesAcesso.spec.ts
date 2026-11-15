/**
 * EXPLICAÇÃO DIDÁTICA: testa as regras de validação do pedido da função
 * `gerenciar-acesso` (arquivo puro, usado também pelo servidor Deno).
 * Só e-mails fictícios (@radar.test).
 */
import { describe, expect, it } from 'vitest';
import { PAPEIS } from '../../src/utils/acessoPorPerfil';
import {
  PAPEIS_VALIDOS,
  LIMITE_IDS_POR_PEDIDO,
  normalizarEmail,
  eEmailValido,
  validarPedido,
} from '../../supabase/functions/_shared/validacoesAcesso';

const criarBase = {
  acao: 'criar',
  nome: 'Ana Teste',
  email: 'ana@radar.test',
  unidade_id: 'u-1',
  papel: 'gestor',
  titular: false,
  enviar_link: false,
};

describe('validacoesAcesso', () => {
  it('lista de papéis igual à do front', () => {
    expect([...PAPEIS_VALIDOS]).toEqual([...PAPEIS]);
    expect(LIMITE_IDS_POR_PEDIDO).toBe(200);
  });
  it('normaliza e valida e-mail', () => {
    expect(normalizarEmail('  Ana@Radar.TEST ')).toBe('ana@radar.test');
    expect(eEmailValido('ana@radar.test')).toBe(true);
    expect(eEmailValido('ana@')).toBe(false);
  });
  it('aceita criar válido e normaliza o e-mail', () => {
    const r = validarPedido({ ...criarBase, email: ' Ana@Radar.TEST ' });
    expect(r.ok).toBe(true);
    if (r.ok && r.pedido.acao === 'criar') expect(r.pedido.email).toBe('ana@radar.test');
  });
  it('rejeita criar sem nome, papel inválido ou e-mail inválido', () => {
    for (const ruim of [{ nome: '  ' }, { papel: 'lider_cg' }, { email: 'sem-arroba' }]) {
      const r = validarPedido({ ...criarBase, ...ruim });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.mensagem.startsWith('RADAR:')).toBe(true);
    }
  });
  it('rejeita ids vazio ou acima do limite', () => {
    expect(validarPedido({ acao: 'enviar_link', ids: [] }).ok).toBe(false);
    const muitos = Array.from({ length: 201 }, (_, i) => `id-${i}`);
    expect(validarPedido({ acao: 'listar_situacao', ids: muitos }).ok).toBe(false);
    expect(validarPedido({ acao: 'enviar_link', ids: ['a'] }).ok).toBe(true);
  });
  it('rejeita ação desconhecida e corpo não-objeto', () => {
    expect(validarPedido({ acao: 'apagar' }).ok).toBe(false);
    expect(validarPedido(null).ok).toBe(false);
  });
});
