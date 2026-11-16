/**
 * Testes do tradutor de erros do banco: nenhuma mensagem técnica pode chegar à tela.
 */
import { describe, it, expect } from 'vitest';
import { traduzirErroBanco, ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';

describe('traduzirErroBanco', () => {
  it('traduz a trava da ficha', () => {
    const e = traduzirErroBanco({
      code: '55000',
      message: 'RADAR: a ficha do risco RADAR-DEMO-CT está travada (estado "em_validacao_cg"): não é possível alterar o risco.',
    });
    expect(e.tipo).toBe('estado');
    expect(e.message).toBe('Este risco está em validação ou homologação e não pode ser editado agora. Peça à chefia que o devolva para ajuste.');
  });

  it('cai no código quando o trecho é desconhecido', () => {
    const e = traduzirErroBanco({ code: '42501', message: 'new row violates row-level security policy for table "riscos"' });
    expect(e.message).toBe('Você não tem permissão para esta ação.');
    expect(e.message).not.toContain('row-level');
    expect(e.tipo).toBe('permissao');
  });

  it('traduz pelos códigos 55000, 22023 e P0002', () => {
    expect(traduzirErroBanco({ code: '55000', message: 'x' }).message).toBe('O risco mudou de situação. Atualize a página e tente de novo.');
    expect(traduzirErroBanco({ code: '22023', message: 'x' }).message).toBe('Informe o motivo.');
    expect(traduzirErroBanco({ code: 'P0002', message: 'x' }).message).toBe('Risco não encontrado.');
  });

  it('RADAR: desconhecido mostra o texto sem o prefixo', () => {
    expect(traduzirErroBanco({ code: 'XX000', message: 'RADAR: algo novo aconteceu.' }).message).toBe('Algo novo aconteceu.');
  });

  it('esconde texto técnico sem prefixo RADAR e sem código conhecido', () => {
    expect(traduzirErroBanco({ message: 'duplicate key value violates unique constraint' }).message).not.toMatch(/duplicate/);
  });

  it('falha de rede', () => {
    const e = traduzirErroBanco(new TypeError('Failed to fetch'));
    expect(e.tipo).toBe('rede');
    expect(e.message).toBe('Não foi possível falar com o RADAR. Verifique sua conexão e tente de novo.');
    expect(e.message).toBe(MENSAGEM_REDE);
  });

  it('ErroRadar volta igual', () => {
    const original = new ErroRadar('já limpo', 'validacao');
    expect(traduzirErroBanco(original)).toBe(original);
  });

  it('TypeError que não é de rede vira desconhecido com a frase genérica', () => {
    const e = traduzirErroBanco(new TypeError("Cannot read properties of undefined (reading 'x')"));
    expect(e.tipo).toBe('desconhecido');
    expect(e.message).not.toContain('Cannot read');
    expect(e.message).toMatch(/^Não foi possível concluir a operação/);
  });

  it('distingue a trava de exclusão da trava de edição', () => {
    const e = traduzirErroBanco({
      code: '55000',
      message: 'RADAR: a ficha do risco X está travada (estado "em_validacao_cg"): não é possível excluir o risco enquanto ele está em validação ou homologação. Peça à chefia que devolva o risco para ajuste.',
    });
    expect(e.message).toContain('não pode ser excluído agora');
  });

  it('distingue as duas variantes de reabertura por alteração', () => {
    const semChefia = traduzirErroBanco({ code: '55000', message: 'RADAR: a alteração reabriria o risco X para validação, mas não há chefia acima de quem alterou para validá-lo (quem altera não valida a própria mudança). Procure a CGOV.' });
    const homologa = traduzirErroBanco({ code: '55000', message: 'RADAR: a alteração reabriria o risco X (que exige homologação) para validação, mas quem altera é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor da unidade que faça a alteração.' });
    expect(homologa.message).toContain('você é quem o homologaria');
    expect(semChefia.message).not.toBe(homologa.message);
  });

  it('traduz a recusa de mudar status_fluxo direto', () => {
    const e = traduzirErroBanco({ code: '42501', message: 'RADAR: o status_fluxo do risco X não pode ser alterado diretamente (de "a" para "b"). Use as ações do fluxo.' });
    expect(e.message).toBe('A situação do risco só muda pelas ações do fluxo (enviar, validar, homologar, devolver).');
  });

  it('dicionário cobre todas as mensagens RADAR: do fluxo', () => {
    // Trechos fixos copiados das migrações 20261115004, 20261116001, 20261116002 e 20261116004.
    const mensagens = [
      // enviar_para_validacao
      'RADAR: só a unidade dona do risco X pode enviá-lo para validação.',
      'RADAR: estado não permite enviar o risco X para validação (está em "y"; só se envia rascunho ou devolvido).',
      'RADAR: a unidade do risco X não tem chefia imediata acima dela na árvore; não há quem valide. Procure a CGOV.',
      'RADAR: não há quem valide o risco X: quem envia é o titular da chefia imediata e não existe nível acima na árvore (quem envia não valida o próprio risco). Procure a CGOV.',
      'RADAR: o risco X exige homologação, mas a unidade não tem Gerência Regional, Diretoria ou Presidência acima dela. Procure a CGOV.',
      'RADAR: o risco X exige homologação e quem envia é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor.',
      // validar_risco
      'RADAR: não há quem valide o risco X: não existe chefia acima de quem o enviou (quem envia não valida o próprio risco). Procure a CGOV.',
      'RADAR: só o titular da chefia que valida o risco X pode validá-lo (quem enviou o risco não o valida).',
      'RADAR: estado não permite validar o risco X (está em "y"; só se valida risco em validação). Ele pode já ter sido validado por outro titular.',
      'RADAR: o risco X exige homologação, mas quem o enviou é o titular da unidade que o homologaria (ex.: o Presidente). Devolva a ficha.',
      // reabertura por alteração
      'RADAR: a alteração reabriria o risco X para validação, mas não há chefia acima de quem alterou para validá-lo. Procure a CGOV.',
      'RADAR: a alteração reabriria o risco X (que exige homologação) para validação, mas quem altera é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor da unidade que faça a alteração.',
      'RADAR: o status_fluxo do risco X não pode ser alterado diretamente (de "a" para "b"). Use as ações do fluxo de aprovação.',
      // homologar_risco
      'RADAR: só o titular da Gerência Regional, da Diretoria ou da Presidência responsável pode homologar o risco X.',
      'RADAR: estado não permite homologar o risco X (está em "y"; só se homologa risco em homologação).',
      // devolver_risco
      'RADAR: informe o motivo da devolução (é obrigatório).',
      'RADAR: estado não permite devolver o risco X (está em "y"; só se devolve risco em validação ou homologação).',
      'RADAR: o risco X não tem quem o valide ou homologue neste estado; só a CGOV pode devolvê-lo à unidade.',
      'RADAR: só o titular que valida ou homologa o risco X neste estado pode devolvê-lo.',
      // assumir_risco_preliminar
      'RADAR: só o titular ou um gestor da unidade do risco X pode assumi-lo.',
      'RADAR: estado não permite assumir o risco X (está em "y"; só se assume risco preliminar da CGOV).',
      // reatribuir_objeto e regras_objeto_contexto
      'RADAR: a unidade está inativa; não é possível criar objeto nela nem reatribuir objeto para ela',
      'RADAR: o processo da cadeia de valor está inativo; novos vínculos só aceitam processo ativo',
      'RADAR: sem processo vinculado, só a CGOV define o supervisor do objeto',
      'RADAR: só a CGOV reatribui objeto de unidade inativa',
      'RADAR: objeto não encontrado',
      'RADAR: só objetos de unidade inativa podem ser reatribuídos',
      'RADAR: a unidade de destino não existe ou está inativa',
      // "não encontrado" dos riscos
      'RADAR: risco X não encontrado.',
      // travas
      'RADAR: o risco X está em_validacao_cg e faz parte do Plano de Gestão de Riscos: não pode ser excluído (só se exclui risco em rascunho).',
      'RADAR: a ficha do risco X está travada (estado "y"): não é possível excluir o risco enquanto ele está em validação ou homologação.',
    ];
    const genericas = new Set<string>();
    for (const message of mensagens) {
      const e = traduzirErroBanco({ code: 'P0001', message });
      // Frase própria do dicionário: nunca a genérica nem o texto original.
      expect(e.message, message).not.toMatch(/^Não foi possível concluir a operação/);
      expect(e.message, message).not.toContain('RADAR:');
      expect(e.tipo, message).not.toBe('desconhecido');
      genericas.add(e.message);
    }
    expect(genericas.size).toBeGreaterThan(20);
  });
});

describe('mensagens 22023 da migração 20261117001 (ficha e ações)', () => {
  // Cópia das partes fixas de cada RAISE EXCEPTION 'RADAR:...' que usa 22023.
  const mensagens = [
    'RADAR: no máximo 1000 riscos por consulta de ações.',
    'RADAR: a ficha do risco deve ser um objeto JSON.',
    'RADAR: "controles" da ficha deve ser uma lista.',
    'RADAR: a ficha traz um controle, resposta ou KRI que não pertence ao risco RADAR-DEMO-CT.',
  ];
  it.each(mensagens)('%s não vira "Informe o motivo." nem a frase genérica', (message) => {
    const e = traduzirErroBanco({ code: '22023', message });
    expect(e.message).not.toBe('Informe o motivo.');
    expect(e.message).not.toBe('Não foi possível concluir a operação agora. Tente de novo; se persistir, procure a CGOV.');
    expect(e.message).not.toMatch(/JSON|RADAR:/);
  });
  it('controle removido durante a edição é erro de estado', () => {
    expect(traduzirErroBanco({ code: '22023', message: mensagens[3] }).tipo).toBe('estado');
  });
});
