import { describe, expect, it } from 'vitest';
import type { EstrategiaTratamento, StatusCriticidadeDAR } from '../../src/types/radar.types';
import {
  MARCADORES_KRI_VAZIO,
  MENSAGEM_TRAVA_CRITICO,
  MENSAGEM_TRAVA_KRI,
  ajudaTravaCritico,
  exigeTratamento,
  kriCompleto,
  textoPreenchido,
  verificarTravaRiscoCritico,
  type KriParaTrava,
} from '../../src/utils/travaRiscoCritico';

const KRI_OK: KriParaTrava = {
  nomeIndicador: 'Taxa de falhas',
  formulaCalculo: 'falhas / total',
  fonteDados: 'SEI',
  periodicidade: 'Mensal',
  limiteAlerta: '> 5%',
  responsavelMedicao: 'Chefe da unidade',
};

describe('trava do risco crítico (LAC-13)', () => {
  it.each([['sim', true], ['pendente_dar', true], ['nao', false]] as const)('exigeTratamento(%s) = %s', (s, esperado) => {
    expect(exigeTratamento(s)).toBe(esperado);
  });
  it('não crítico com Aceitar e sem ação passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'nao', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: [], kris: [] })).toEqual({ ok: true });
  });
  it('crítico com Aceitar é recusado antes de olhar as ações', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: ['Mitigar'], kris: [] }))
      .toEqual({ ok: false, motivo: 'aceitar_em_critico' });
  });
  it('pendente de DAR com Mitigar e sem ação é recusado', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'pendente_dar', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: [], kris: [] }))
      .toEqual({ ok: false, motivo: 'sem_acao_em_critico' });
  });
  it('ação só com Aceitar não conta como tratamento', () => {
    // KRI completo: a recusa só pode vir da ação (e não da falta de KRI).
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: ['Aceitar'], kris: [KRI_OK] }))
      .toEqual({ ok: false, motivo: 'sem_acao_em_critico' });
  });
  it('crítico com Compartilhar e uma ação Evitar passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Compartilhar', estrategiasDasAcoes: ['Evitar'], kris: [KRI_OK] })).toEqual({ ok: true });
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

  it('ajuda do crítico lembra o KRI completo', () => {
    expect(ajudaTravaCritico('sim')!.endsWith(' Ele também precisa de um KRI completo (Metodologia 4.7.1).')).toBe(true);
  });
});

describe('KRI completo como 3º motivo da trava (LAC-03)', () => {
  const base: { statusCritico: StatusCriticidadeDAR; estrategiaPrincipal: EstrategiaTratamento; estrategiasDasAcoes: EstrategiaTratamento[]; kris: KriParaTrava[] } = {
    statusCritico: 'sim',
    estrategiaPrincipal: 'Mitigar',
    estrategiasDasAcoes: ['Mitigar'],
    kris: [KRI_OK],
  };

  it('marcadores de vazio ficam em minúsculas', () => {
    expect(MARCADORES_KRI_VAZIO).toEqual(['a definir', 'a definir pela unidade']);
  });
  it.each([[null], [undefined], [''], ['   '], ['A definir'], [' a definir '], ['A definir pela unidade']])(
    'textoPreenchido(%j) = false',
    (t) => expect(textoPreenchido(t)).toBe(false),
  );
  it('textoPreenchido aceita texto real', () => {
    expect(textoPreenchido(' Mensal ')).toBe(true);
  });
  it('kriCompleto: true com os 6 campos e sem meta', () => {
    expect(kriCompleto(KRI_OK)).toBe(true);
  });
  it.each(['nomeIndicador', 'formulaCalculo', 'fonteDados', 'periodicidade', 'limiteAlerta', 'responsavelMedicao'] as const)(
    'kriCompleto: false quando %s está vazio ou com marcador',
    (campo) => {
      for (const v of [undefined, '', '   ', 'A definir', ' a definir ', 'A definir pela unidade']) {
        expect(kriCompleto({ ...KRI_OK, [campo]: v } as KriParaTrava)).toBe(false);
      }
    },
  );
  // R11: espelho de fn_kri_completo no banco: (operador E número) OU texto antigo.
  it('kriCompleto: o limite numérico (operador + valor) vale no lugar do texto antigo', () => {
    const { limiteAlerta: _t, ...semTexto } = KRI_OK;
    expect(kriCompleto(semTexto)).toBe(false);
    expect(kriCompleto({ ...semTexto, limiteOperador: '<', limiteValor: 80 })).toBe(true);
    expect(kriCompleto({ ...semTexto, limiteOperador: '<' })).toBe(false); // falta o número
    expect(kriCompleto({ ...semTexto, limiteValor: 80 })).toBe(false); // falta o operador
    expect(kriCompleto({ ...KRI_OK })).toBe(true); // só o texto antigo continua valendo
  });
  it('crítico sem KRI é recusado', () => {
    expect(verificarTravaRiscoCritico({ ...base, kris: [] })).toEqual({ ok: false, motivo: 'sem_kri_em_critico' });
  });
  it('um KRI incompleto e outro completo passam', () => {
    expect(verificarTravaRiscoCritico({ ...base, kris: [{ ...KRI_OK, fonteDados: 'A definir' }, KRI_OK] })).toEqual({ ok: true });
  });
  it('Aceitar vem antes do KRI na ordem', () => {
    expect(verificarTravaRiscoCritico({ ...base, estrategiaPrincipal: 'Aceitar', kris: [] }))
      .toEqual({ ok: false, motivo: 'aceitar_em_critico' });
  });
  it('sem ação vem antes do KRI na ordem', () => {
    expect(verificarTravaRiscoCritico({ ...base, estrategiasDasAcoes: [], kris: [] }))
      .toEqual({ ok: false, motivo: 'sem_acao_em_critico' });
  });
  it('não crítico sem KRI passa', () => {
    expect(verificarTravaRiscoCritico({ ...base, statusCritico: 'nao', kris: [] })).toEqual({ ok: true });
  });
  it('pendente_dar sem KRI é recusado', () => {
    expect(verificarTravaRiscoCritico({ ...base, statusCritico: 'pendente_dar', kris: [] }))
      .toEqual({ ok: false, motivo: 'sem_kri_em_critico' });
  });
  it('crítico com ação e KRI completo passa', () => {
    expect(verificarTravaRiscoCritico({ ...base })).toEqual({ ok: true });
  });
  it('a mensagem fixa não usa PGR', () => {
    expect(MENSAGEM_TRAVA_KRI).not.toMatch(/PGR/);
  });
});
