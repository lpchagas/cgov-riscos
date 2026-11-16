import { describe, it, expect } from 'vitest';
import { ICMBIO_ID_ESPECIAIS, ORDEM_ALCANCE, sugerirPapel, tipoSuspeito } from '../../src/utils/perfilPorUnidade';

describe('perfilPorUnidade — perfil sugerido pelo tipo da unidade (spec B2, seção 8.8)', () => {
  it('as unidades específicas são achadas pelo icmbio_id, não pela sigla', () => {
    expect(ICMBIO_ID_ESPECIAIS).toEqual({ assessoriaPresidencia: '10.0001', cgge: '10.0007', cgov: '10.0008', audit: '10.0034' });
  });

  const casos: [string, { tipo: string; icmbioId: string | null }, string][] = [
    ['presidencia', { tipo: 'presidencia', icmbioId: '10.0000' }, 'presidencia'],
    ['Assessoria da Presidência (10.0001)', { tipo: 'coordenacao-assessoramento', icmbioId: '10.0001' }, 'presidencia'],
    ['diretoria', { tipo: 'diretoria', icmbioId: '10.0002' }, 'diretor'],
    ['gerencia-regional', { tipo: 'gerencia-regional', icmbioId: '23.0001' }, 'gerente_regional'],
    ['coordenacao-territorial', { tipo: 'coordenacao-territorial', icmbioId: '23.3005' }, 'coordenador_territorial'],
    ['coordenacao-geral comum', { tipo: 'coordenacao-geral', icmbioId: '10.0010' }, 'coordenador_geral'],
    ['CGGE (10.0007)', { tipo: 'coordenacao-geral', icmbioId: '10.0007' }, 'cgge'],
    ['CGOV (10.0008)', { tipo: 'coordenacao', icmbioId: '10.0008' }, 'cgov'],
    ['gabinete', { tipo: 'gabinete', icmbioId: '10.0003' }, 'gabin'],
    ['AUDIT (10.0034)', { tipo: 'orgao-assistencia', icmbioId: '10.0034' }, 'auditoria'],
    ['outro órgão de assistência (10.0035)', { tipo: 'orgao-assistencia', icmbioId: '10.0035' }, 'gestor'],
    ['uc', { tipo: 'uc', icmbioId: '21.0001' }, 'gestor'],
    ['ngi', { tipo: 'ngi', icmbioId: '21.5001' }, 'gestor'],
    ['base-avancada', { tipo: 'base-avancada', icmbioId: '21.0002' }, 'gestor'],
    ['centro-pesquisa', { tipo: 'centro-pesquisa', icmbioId: '10.0020' }, 'gestor'],
    ['divisão sem icmbio_id', { tipo: 'divisao', icmbioId: null }, 'gestor'],
  ];
  it.each(casos)('%s', (_nome, unidade, esperado) => {
    expect(sugerirPapel(unidade)).toBe(esperado);
  });

  it('o icmbio_id especial vale mais que o tipo', () => {
    // A CGGE tem tipo "coordenacao-geral", mas o perfil é cgge, não coordenador_geral.
    expect(sugerirPapel({ tipo: 'coordenacao-geral', icmbioId: '10.0007' })).toBe('cgge');
  });

  it('ordem de alcance: presidencia > diretor > cgov = cgge = gabin = auditoria > gerente_regional > coordenador_geral > coordenador_territorial > gestor', () => {
    const o = ORDEM_ALCANCE;
    expect(o.presidencia).toBeGreaterThan(o.diretor);
    expect(o.diretor).toBeGreaterThan(o.cgov);
    expect(o.cgov).toBe(o.cgge);
    expect(o.cgge).toBe(o.gabin);
    expect(o.gabin).toBe(o.auditoria);
    expect(o.auditoria).toBeGreaterThan(o.gerente_regional);
    expect(o.gerente_regional).toBeGreaterThan(o.coordenador_geral);
    expect(o.coordenador_geral).toBeGreaterThan(o.coordenador_territorial);
    expect(o.coordenador_territorial).toBeGreaterThan(o.gestor);
  });

  it('tipoSuspeito avisa da CT gravada como coordenacao-geral dentro de uma GR (caso CT Cuiabá)', () => {
    const aviso = tipoSuspeito({ tipo: 'coordenacao-geral', icmbioId: '23.3005', tipoPai: 'gerencia-regional' });
    expect(aviso).toContain('confira o tipo no SharePoint');
  });

  it('tipoSuspeito devolve null para uma CG da Sede', () => {
    expect(tipoSuspeito({ tipo: 'coordenacao-geral', icmbioId: '10.0010', tipoPai: 'diretoria' })).toBeNull();
    expect(tipoSuspeito({ tipo: 'coordenacao-geral', icmbioId: '10.0010' })).toBeNull();
  });
});
