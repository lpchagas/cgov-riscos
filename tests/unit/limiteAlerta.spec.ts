import { describe, it, expect } from 'vitest';
import { passaDoLimite, textoLimite, converterLimiteTexto, numeroDaLeitura } from '../../src/utils/limiteAlerta';

describe('passaDoLimite', () => {
  it('compara com os 4 operadores (limite < 80: 79 passa, 80 não)', () => {
    expect(passaDoLimite(79, '<', 80)).toBe(true);
    expect(passaDoLimite(80, '<', 80)).toBe(false);
    expect(passaDoLimite(80, '<=', 80)).toBe(true);
    expect(passaDoLimite(81, '>', 80)).toBe(true);
    expect(passaDoLimite(80, '>', 80)).toBe(false);
    expect(passaDoLimite(80, '>=', 80)).toBe(true);
  });
});

describe('textoLimite', () => {
  it('escreve o operador por extenso, com a unidade', () => {
    expect(textoLimite('<', 80, '%')).toBe('menor que 80 %');
    expect(textoLimite('<=', 3)).toBe('menor ou igual a 3');
    expect(textoLimite('>', 7.5, 'dias')).toBe('maior que 7.5 dias');
    expect(textoLimite('>=', 2)).toBe('maior ou igual a 2');
  });
});

describe('converterLimiteTexto (mesmos casos de fn_converter_limite_texto, teste 120)', () => {
  it.each([
    ['< 80%', { operador: '<', valor: 80, unidade: '%' }],
    ['Abaixo de 70%', { operador: '<', valor: 70, unidade: '%' }],
    ['Acima de 5%', { operador: '>', valor: 5, unidade: '%' }],
    ['>= 2,5 dias', { operador: '>=', valor: 2.5, unidade: 'dias' }],
    ['<=3', { operador: '<=', valor: 3, unidade: undefined }],
    ['MAIOR QUE 7.5 dias', { operador: '>', valor: 7.5, unidade: 'dias' }],
    ['menor que 4', { operador: '<', valor: 4, unidade: undefined }],
    ['> 10 dias', { operador: '>', valor: 10, unidade: 'dias' }],
  ])('converte %j', (texto, esperado) => {
    expect(converterLimiteTexto(texto)).toEqual(esperado);
  });

  it.each([
    'Até 10%',
    'Entre 5 e 10',
    'Abaixo de 70% ou acima de 90%',
    '> 5 ou',
    '< 5 e',
    '',
    '> 1.000 hectares',
    '< 1,000',
    '> 10 mil',
    'Acima de 2 milhões',
    'Abaixo de 3 bilhões',
  ])('deixa %j a converter (nulo)', (texto) => {
    expect(converterLimiteTexto(texto)).toBeNull();
  });

  it('espaço especial (NBSP) fica a converter, como no banco', () => {
    expect(converterLimiteTexto('<\u00a080')).toBeNull();
    expect(converterLimiteTexto('< 80\u00a0%')).toBeNull();
    expect(converterLimiteTexto('abaixo de\u00a070')).toBeNull();
  });

  it('número grande demais (Infinity) fica a converter', () => {
    expect(converterLimiteTexto('< ' + '9'.repeat(400))).toBeNull();
  });

  it('texto nulo ou indefinido fica a converter', () => {
    expect(converterLimiteTexto(null as unknown as string)).toBeNull();
    expect(converterLimiteTexto(undefined as unknown as string)).toBeNull();
  });
});

describe('numeroDaLeitura (espelho de fn_numero_de_texto)', () => {
  it('aceita número com vírgula ou ponto e % opcional', () => {
    expect(numeroDaLeitura('12,5%')).toBe(12.5);
    expect(numeroDaLeitura(' 80 ')).toBe(80);
    expect(numeroDaLeitura('7.5')).toBe(7.5);
  });
  it('texto com palavras, milhar ambíguo ou vazio fica sem número', () => {
    expect(numeroDaLeitura('cerca de 80')).toBeUndefined();
    expect(numeroDaLeitura('12 dias')).toBeUndefined();
    expect(numeroDaLeitura('1.000')).toBeUndefined();
    expect(numeroDaLeitura('2,500')).toBeUndefined();
    expect(numeroDaLeitura('')).toBeUndefined();
  });
});
