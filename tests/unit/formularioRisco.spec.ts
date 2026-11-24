/**
 * ============================================================================
 * TESTES DE `validarEtapa` NA ETAPA 4 — trava do risco crítico (LAC-13)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando o risco é crítico (fora do apetite da DAR, `'sim'`, ou com DAR
 * pendente, `'pendente_dar'`), a etapa 4 (Tratamento) muda de regra:
 *   - "Aceitar" não é permitido (Metodologia 4.5 e Anexo III);
 *   - a ação 5W2H (o quê, quem, quando) passa a ser obrigatória.
 * Sem o 4º argumento (`statusCritico`), a função se comporta como antes.
 */
import { describe, it, expect } from 'vitest';
import { CATEGORIAS_QUADRO_2_SEMENTE } from '../../src/services/dadosSementeAnexoII';
import {
  avisoKriCompartilhado,
  dadosExemplo,
  dadosParaFicha,
  dadosVazios,
  demaisKrisQueFicam,
  kriFicaOrfao,
  totalRiscosDoKri,
  validarEtapa,
  type DadosNovoRisco,
} from '../../src/utils/formularioRisco';
import type { FichaRisco } from '../../src/types/radar.types';
import { MENSAGEM_TRAVA_KRI } from '../../src/utils/travaRiscoCritico';

const CATEGORIAS = CATEGORIAS_QUADRO_2_SEMENTE;

/** Ficha completa, mas com a estratégia escolhida e a ação 5W2H em branco. */
const semAcao = (estrategia: DadosNovoRisco['estrategia']): DadosNovoRisco => ({
  ...dadosExemplo('obj-anexo-ii'),
  estrategia,
  acaoOQue: '',
  acaoQuem: '',
  acaoPrazo: '',
});

const ERRO_ACEITAR = 'Risco crítico não pode ser aceito: escolha Mitigar, Compartilhar ou Evitar (Metodologia 4.5 e Anexo III).';

describe('validarEtapa — etapa 4 e risco crítico (LAC-13)', () => {
  it('risco crítico (sim): "Aceitar" gera erro na estratégia', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'sim').estrategia).toBe(ERRO_ACEITAR);
  });

  it('DAR pendente (pendente_dar): "Aceitar" gera o mesmo erro', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'pendente_dar').estrategia).toBe(ERRO_ACEITAR);
  });

  it('risco dentro do apetite (nao): "Aceitar" sem ação continua valendo', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'nao')).toEqual({});
  });

  it('sem statusCritico: comportamento de antes ("Aceitar" sem ação passa)', () => {
    expect(validarEtapa(4, semAcao('Aceitar'), CATEGORIAS)).toEqual({});
  });

  it('risco crítico com "Mitigar" e ação vazia: exige o quê, quem e quando', () => {
    expect(validarEtapa(4, semAcao('Mitigar'), CATEGORIAS, 'sim')).toEqual({
      acaoOQue: 'Descreva a ação (o quê).',
      acaoQuem: 'Informe o responsável (quem).',
      acaoPrazo: 'Informe o prazo (quando).',
    });
  });

  it('risco crítico com "Aceitar": também aponta a ação que falta', () => {
    const erros = validarEtapa(4, semAcao('Aceitar'), CATEGORIAS, 'sim');
    expect(Object.keys(erros).sort()).toEqual(['acaoOQue', 'acaoPrazo', 'acaoQuem', 'estrategia']);
  });

  it('risco crítico com "Evitar" e ação preenchida: ok', () => {
    expect(validarEtapa(4, { ...dadosExemplo('obj-anexo-ii'), estrategia: 'Evitar' }, CATEGORIAS, 'sim')).toEqual({});
  });
});

describe('etapa 4: KRI completo para risco crítico (LAC-03)', () => {
  const soNome: DadosNovoRisco = { ...dadosExemplo('o1'), kriFormula: '', kriFonte: '', kriPeriodicidade: '', kriLimite: '', kriResponsavel: '' };

  it('crítico (sim ou pendente_dar) com só o nome: erro com a frase da trava', () => {
    expect(validarEtapa(4, soNome, CATEGORIAS, 'sim').nomeKri).toBe(MENSAGEM_TRAVA_KRI);
    expect(validarEtapa(4, soNome, CATEGORIAS, 'pendente_dar').nomeKri).toBe(MENSAGEM_TRAVA_KRI);
  });
  it('crítico com os 6 campos (meta é opcional): sem erro', () => {
    expect(validarEtapa(4, dadosExemplo('o1'), CATEGORIAS, 'sim')).toEqual({});
  });
  it('"A definir" não conta como preenchido', () => {
    expect(validarEtapa(4, { ...dadosExemplo('o1'), kriFonte: ' a definir ' }, CATEGORIAS, 'sim').nomeKri).toBe(MENSAGEM_TRAVA_KRI);
  });
  it('KRI já definido no objeto e completo (campos copiados dele): sem erro', () => {
    expect(validarEtapa(4, { ...dadosExemplo('o1'), kriExistenteId: 'k1' }, CATEGORIAS, 'sim')).toEqual({});
  });
  // KRI escolhido e só LIGADO: quem vale é o KRI do objeto (é ele que vai ao banco),
  // não os campos da tela. Ex.: campos vazios, mas o KRI k1 completo → sem erro.
  const kriDoObjeto = {
    nomeIndicador: 'KRI do objeto', formulaCalculo: 'a / b', fonteDados: 'SEI',
    periodicidade: 'Mensal' as const, limiteAlerta: '> 10%', responsavelMedicao: 'Chefia',
  };
  const camposVazios: DadosNovoRisco = { ...soNome, nomeKri: '', kriExistenteId: 'k1' };
  it('KRI do objeto só ligado: confere o KRI escolhido, não os campos da tela', () => {
    expect(validarEtapa(4, camposVazios, CATEGORIAS, 'sim', kriDoObjeto)).toEqual({});
    expect(validarEtapa(4, { ...dadosExemplo('o1'), kriExistenteId: 'k1' }, CATEGORIAS, 'sim', { ...kriDoObjeto, fonteDados: 'A definir' }).nomeKri)
      .toBe(MENSAGEM_TRAVA_KRI);
  });
  // Triagem do CodeRabbit na PR #17: a trava do banco aceita a ficha se
  // QUALQUER KRI que continuará ligado for completo. A tela confere o 1º KRI
  // (como ficará) e também os demais KRIs da ficha, que seguem ligados.
  it('risco com [KRI só com nome, KRI completo]: a etapa 4 passa', () => {
    expect(validarEtapa(4, soNome, CATEGORIAS, 'sim', undefined, [kriDoObjeto])).toEqual({});
    expect(validarEtapa(4, soNome, CATEGORIAS, 'sim', undefined, [{ ...kriDoObjeto, fonteDados: 'A definir' }]).nomeKri)
      .toBe(MENSAGEM_TRAVA_KRI);
  });
  it('demaisKrisQueFicam: os KRIs da ficha depois do 1º, sem repetir o 1º como ficará', () => {
    const k = (id: string) => ({ id, objetoId: 'o1', riscoIds: ['r1'], nomeIndicador: id, medicoes: [] });
    const existente = { id: 'r1', objetoId: 'o1', controlesExistentes: [], respostasTratamento: [], kris: [k('k1'), k('k2'), k('k3')] } as unknown as FichaRisco;
    const ids = (lista: { id?: string }[]) => lista.map((x) => x.id);
    // Ficha com [k1 só com nome, k2, k3]: ficam k2 e k3 além do 1º.
    expect(ids(demaisKrisQueFicam({ ...soNome, kriExistenteId: '' }, existente))).toEqual(['k2', 'k3']);
    // Escolheu k3 da lista para o 1º lugar: k3 não conta duas vezes.
    expect(ids(demaisKrisQueFicam({ ...soNome, kriExistenteId: 'k3' }, existente))).toEqual(['k2']);
    // Risco novo: não há outros KRIs.
    expect(demaisKrisQueFicam(soNome, undefined)).toEqual([]);
    // Ficha de verdade: [k1 só com nome, k2 completo] passa na etapa 4.
    const comCompleto = { ...existente, kris: [k('k1'), { ...k('k2'), ...kriDoObjeto }] } as unknown as FichaRisco;
    expect(validarEtapa(4, soNome, CATEGORIAS, 'sim', undefined, demaisKrisQueFicam(soNome, comCompleto))).toEqual({});
  });
  it('não crítico: KRI incompleto não trava (rascunho e risco baixo seguem livres)', () => {
    expect(validarEtapa(4, soNome, CATEGORIAS, 'nao')).toEqual({});
    expect(validarEtapa(4, soNome, CATEGORIAS)).toEqual({});
  });
});

describe('KRI compartilhado: total real de riscos (revisão final da LAC-03)', () => {
  const codigo = (id: string) => ({ r1: 'RADAR-2026-001', r4: 'RADAR-2026-004' } as Record<string, string>)[id];
  it('totalRiscosDoKri usa o total do banco quando ele é maior que os visíveis', () => {
    expect(totalRiscosDoKri({ riscoIds: ['r1'], totalRiscos: 3 })).toBe(3);
    expect(totalRiscosDoKri({ riscoIds: ['r1', 'r4'] })).toBe(2);
  });
  it('kriFicaOrfao só é verdadeiro se nenhum outro risco (visível ou não) usa o KRI', () => {
    expect(kriFicaOrfao({ riscoIds: ['r1'] }, 'r1')).toBe(true);
    expect(kriFicaOrfao({ riscoIds: ['r1'], totalRiscos: 2 }, 'r1')).toBe(false);
    expect(kriFicaOrfao({ riscoIds: ['r1', 'r4'] }, 'r1')).toBe(false);
  });
  it('avisoKriCompartilhado: frase fixa para os visíveis e o acréscimo dos ocultos', () => {
    expect(avisoKriCompartilhado({ riscoIds: ['r1'] }, 'r1', codigo)).toBe('');
    expect(avisoKriCompartilhado({ riscoIds: ['r1', 'r4'] }, 'r1', codigo)).toBe(
      'Este KRI também serve aos riscos RADAR-2026-004; alterar muda o indicador de todos eles e reabre os aprovados.',
    );
    expect(avisoKriCompartilhado({ riscoIds: ['r1', 'r4'], totalRiscos: 4 }, 'r1', codigo)).toBe(
      'Este KRI também serve aos riscos RADAR-2026-004; alterar muda o indicador de todos eles e reabre os aprovados.' +
        ' Ele também serve a 2 outros riscos que você não pode ver.',
    );
    expect(avisoKriCompartilhado({ riscoIds: ['r1'], totalRiscos: 2 }, 'r1', codigo)).toBe(
      'Este KRI também serve a 1 risco que você não pode ver; alterar muda o indicador de todos eles e reabre os aprovados.',
    );
  });
});

describe('dadosParaFicha: KRI (LAC-03)', () => {
  it('campo vazio vira undefined, nunca "A definir"', () => {
    const f = dadosParaFicha({ ...dadosExemplo('o1'), kriFonte: '', kriMeta: '' }, { ehIntegridade: false });
    expect(f.kris![0].fonteDados).toBeUndefined();
    expect(f.kris![0].metaAlvo).toBeUndefined();
    expect(JSON.stringify(f.kris)).not.toContain('A definir');
    expect(f.kris![0].apenasLigar).toBeUndefined();
  });
  it('só com o nome: nada de "Trimestral" nem outros valores por padrão', () => {
    const f = dadosParaFicha({ ...dadosVazios(), objetoId: 'o1', nomeKri: 'Meu KRI' }, { ehIntegridade: false });
    expect(f.kris![0].nomeIndicador).toBe('Meu KRI');
    expect(f.kris![0].periodicidade).toBeUndefined();
    expect(f.kris![0].formulaCalculo).toBeUndefined();
  });
  it('kriExistenteId: só liga ({ id, apenasLigar: true, nomeIndicador })', () => {
    const f = dadosParaFicha({ ...dadosExemplo('o1'), kriExistenteId: 'k1' }, { ehIntegridade: false });
    expect(f.kris![0]).toMatchObject({ id: 'k1', apenasLigar: true, nomeIndicador: dadosExemplo().nomeKri });
  });
  it('KRI escolhido e depois editado: vai como edição da definição (sem apenasLigar)', () => {
    const escolhido = { id: 'k1', objetoId: 'o1', riscoIds: ['r9'], nomeIndicador: 'N', formulaCalculo: 'F', fonteDados: 'S', periodicidade: 'Mensal' as const, limiteAlerta: 'L', responsavelMedicao: 'R', medicoes: [] };
    const d: DadosNovoRisco = { ...dadosVazios(), objetoId: 'o1', kriExistenteId: 'k1', nomeKri: 'N', kriFormula: 'F', kriFonte: 'S', kriPeriodicidade: 'Mensal', kriLimite: 'L', kriResponsavel: 'R' };
    expect(dadosParaFicha(d, { ehIntegridade: false, krisDoObjeto: [escolhido] }).kris![0].apenasLigar).toBe(true);
    const existente = { id: 'r1', objetoId: 'o1', controlesExistentes: [], respostasTratamento: [], kris: [] } as unknown as FichaRisco;
    const editado = dadosParaFicha({ ...d, kriLimite: 'Novo' }, { ehIntegridade: false, existente, krisDoObjeto: [escolhido] });
    expect(editado.kris![0]).toMatchObject({ id: 'k1', limiteAlerta: 'Novo' });
    expect(editado.kris![0].apenasLigar).toBeUndefined();
  });
  it('risco EXISTENTE escolhe KRI com limite numérico sem mudar nada: mantém apenasLigar (LAC-03)', () => {
    const escolhido = { id: 'k1', objetoId: 'o1', riscoIds: ['r9'], nomeIndicador: 'N', formulaCalculo: 'F', fonteDados: 'S', periodicidade: 'Mensal' as const, limiteAlerta: 'Abaixo de 70%', limiteOperador: '<' as const, limiteValor: 70, limiteUnidade: '%', responsavelMedicao: 'R', medicoes: [] };
    const d: DadosNovoRisco = { ...dadosVazios(), objetoId: 'o1', kriExistenteId: 'k1', nomeKri: 'N', kriFormula: 'F', kriFonte: 'S', kriPeriodicidade: 'Mensal', kriLimite: 'Abaixo de 70%', kriResponsavel: 'R' };
    const existente = { id: 'r1', objetoId: 'o1', controlesExistentes: [], respostasTratamento: [], kris: [] } as unknown as FichaRisco;
    const f = dadosParaFicha(d, { ehIntegridade: false, existente, krisDoObjeto: [escolhido] });
    expect(f.kris![0]).toMatchObject({ id: 'k1', apenasLigar: true, limiteOperador: '<', limiteValor: 70 });
  });
  it('risco NOVO com KRI da lista: sempre só liga, mesmo com campos alterados', () => {
    const escolhido = { id: 'k1', objetoId: 'o1', riscoIds: ['r9'], nomeIndicador: 'N', formulaCalculo: 'F', fonteDados: 'S', periodicidade: 'Mensal' as const, limiteAlerta: 'L', responsavelMedicao: 'R', medicoes: [] };
    const d: DadosNovoRisco = { ...dadosVazios(), objetoId: 'o1', kriExistenteId: 'k1', nomeKri: 'N', kriFormula: 'F', kriFonte: 'S', kriPeriodicidade: 'Mensal', kriLimite: 'Outro', kriResponsavel: 'R' };
    expect(dadosParaFicha(d, { ehIntegridade: false, krisDoObjeto: [escolhido] }).kris![0]).toMatchObject({ id: 'k1', apenasLigar: true });
  });
});
