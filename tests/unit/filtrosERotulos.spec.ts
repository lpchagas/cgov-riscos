/**
 * ============================================================================
 * TESTES DOS FILTROS DA LISTA E DOS RÓTULOS DA INTERFACE
 * ============================================================================
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { filtrarRiscos, lerFiltrosDaQuery } from '../../src/utils/filtrosRiscos';
import {
  ROTULOS_CRITICIDADE,
  ROTULOS_STATUS_FLUXO,
  formatarNivel,
  ROTULOS_TIPO_UNIDADE,
  ROTULOS_ACAO_HISTORICO,
} from '../../src/utils/rotulosInterface';

describe('Filtros da lista de Riscos (/riscos)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  it('lê filtros válidos da URL e descarta valores inválidos', () => {
    expect(lerFiltrosDaQuery({ q: 'contrato', p: '3', i: '5', critico: 'sim', nivel: 'Alto' })).toEqual({
      termo: 'contrato',
      probabilidade: 3,
      impacto: 5,
      classeResidual: 'Alto',
      statusFluxo: undefined,
      apenasCriticos: true,
    });
    // Probabilidade 9 não existe (escala 1 a 5); "Crítico" não é nível do Quadro 8.
    const invalidos = lerFiltrosDaQuery({ p: '9', nivel: 'Crítico', status: 'qualquer' });
    expect(invalidos.probabilidade).toBeUndefined();
    expect(invalidos.classeResidual).toBeUndefined();
    expect(invalidos.statusFluxo).toBeUndefined();
  });

  it('filtra pela célula da Matriz (P3 × I5 = Caso de Controle do Anexo II)', () => {
    const store = useRiscosStore();
    const resultado = filtrarRiscos(store.riscos, { probabilidade: 3, impacto: 5 });
    expect(resultado.length).toBeGreaterThanOrEqual(1);
    expect(resultado.every((r) => r.probabilidade === 3 && r.impacto === 5)).toBe(true);
  });

  it('"Só Críticos" usa a criticidade frente à DAR, e não o nível Extremo', () => {
    const store = useRiscosStore();
    const criticos = filtrarRiscos(store.riscos, { apenasCriticos: true });
    expect(criticos.map((r) => r.id).sort()).toEqual(store.riscosCriticosCarteira.map((r) => r.id).sort());
  });

  it('a busca da lista e a busca da store usam a mesma regra', () => {
    const store = useRiscosStore();
    store.termoBuscaGlobal = 'RADAR-2026-001';
    expect(filtrarRiscos(store.riscos, { termo: 'RADAR-2026-001' })).toEqual(store.riscosFiltrados);
  });
});

describe('Rótulos da interface (glossário do diagnóstico)', () => {
  it('nenhum status do fluxo é exibido como código interno', () => {
    for (const [codigo, r] of Object.entries(ROTULOS_STATUS_FLUXO)) {
      expect(r.rotulo).not.toBe(codigo);
      expect(r.rotulo).not.toMatch(/_/);
    }
    expect(ROTULOS_STATUS_FLUXO.em_validacao_cg.rotulo).toBe('Aguardando validação');
  });

  it('"Crítico" é a situação fora da DAR — nunca um nível do Quadro 8', () => {
    expect(ROTULOS_CRITICIDADE.sim.rotulo).toBe('Crítico');
    expect(ROTULOS_CRITICIDADE.sim.descricao).toMatch(/apetite/i);
  });

  it('formata níveis com vírgula decimal, sem arredondar para inteiro', () => {
    expect(formatarNivel(10.2)).toBe('10,2');
    expect(formatarNivel(17.1)).toBe('17,1');
    expect(formatarNivel(22)).toBe('22');
  });

  it('não usa a sigla PGR para o Plano de Gestão de Riscos', () => {
    const textos = [...Object.values(ROTULOS_STATUS_FLUXO), ...Object.values(ROTULOS_CRITICIDADE)]
      .flatMap((r) => [r.rotulo, r.descricao])
      .join(' ');
    expect(textos).not.toMatch(/\bPGR\b/);
  });
});

describe('Rótulos de unidade e de histórico do fluxo', () => {
  it('todo tipo de unidade do banco tem rótulo', () => {
    const tipos = [
      'presidencia', 'diretoria', 'coordenacao-geral', 'gerencia-regional', 'coordenacao', 'centro-pesquisa',
      'ngi', 'uc', 'coordenacao-territorial', 'coordenacao-assessoramento', 'orgao-assistencia', 'gabinete',
      'divisao', 'servico', 'setor', 'base-avancada',
    ];
    expect(Object.keys(ROTULOS_TIPO_UNIDADE).sort()).toEqual([...tipos].sort());
    for (const t of tipos) expect(ROTULOS_TIPO_UNIDADE[t as keyof typeof ROTULOS_TIPO_UNIDADE]).toBeTruthy();
  });

  it('toda ação do histórico tem rótulo e a da DAR cita "DAR"', () => {
    const acoes = [
      'submetido', 'assumido', 'validado', 'validado_e_homologado', 'homologado',
      'devolvido_ajuste', 'reaberto_mudanca_nota', 'reaberto_mudanca_dar', 'aprovado_1_clique',
    ];
    expect(Object.keys(ROTULOS_ACAO_HISTORICO).sort()).toEqual([...acoes].sort());
    expect(ROTULOS_ACAO_HISTORICO.reaberto_mudanca_dar).toContain('DAR');
  });
});
