import { describe, expect, it } from 'vitest';
import {
  MENSAGEM_TRAVA_CRITICO,
  ajudaTravaCritico,
  exigeTratamento,
  verificarTravaRiscoCritico,
} from '../../src/utils/travaRiscoCritico';

describe('trava do risco crítico (LAC-13)', () => {
  it.each([['sim', true], ['pendente_dar', true], ['nao', false]] as const)('exigeTratamento(%s) = %s', (s, esperado) => {
    expect(exigeTratamento(s)).toBe(esperado);
  });
  it('não crítico com Aceitar e sem ação passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'nao', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: [] })).toEqual({ ok: true });
  });
  it('crítico com Aceitar é recusado antes de olhar as ações', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: ['Mitigar'] }))
      .toEqual({ ok: false, motivo: 'aceitar_em_critico' });
  });
  it('pendente de DAR com Mitigar e sem ação é recusado', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'pendente_dar', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: [] }))
      .toEqual({ ok: false, motivo: 'sem_acao_em_critico' });
  });
  it('ação só com Aceitar não conta como tratamento', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: ['Aceitar'] }).ok).toBe(false);
  });
  it('crítico com Compartilhar e uma ação Evitar passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Compartilhar', estrategiasDasAcoes: ['Evitar'] })).toEqual({ ok: true });
  });
  it('ajuda: texto de sim, de pendente e null para não crítico', () => {
    expect(ajudaTravaCritico('sim')).toMatch(/^Este risco está fora do apetite da DAR\./);
    expect(ajudaTravaCritico('pendente_dar')).toMatch(/^A categoria deste risco ainda não tem apetite declarado na DAR/);
    expect(ajudaTravaCritico('nao')).toBeNull();
  });
  it('nenhum texto chama o risco de PGR nem usa "Crítico" para a faixa 18 a 25', () => {
    for (const t of [MENSAGEM_TRAVA_CRITICO, ajudaTravaCritico('sim')!, ajudaTravaCritico('pendente_dar')!]) {
      expect(t).not.toMatch(/PGR|18 a 25|Extremo/);
    }
  });
});
