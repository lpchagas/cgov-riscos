/**
 * ============================================================================
 * TESTES DOS COMPONENTES DE UI (`tests/unit/componentesUi.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Usamos o `@vue/test-utils` para "montar" cada componente num navegador
 * simulado (jsdom) e conferir o HTML gerado — principalmente os atributos de
 * ACESSIBILIDADE, que são invisíveis na tela mas essenciais para quem usa
 * leitor de tela ou teclado.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import RiskBadge from '../../src/components/ui/RiskBadge.vue';
import FormField from '../../src/components/ui/FormField.vue';
import DataTableGenerico from '../../src/components/ui/DataTable.vue';

// O `DataTable` é um componente GENÉRICO (`generic="T"`). O `mount` do
// @vue/test-utils ainda não consegue inferir o tipo T, então "apagamos" o tipo
// só aqui no teste. O comportamento testado é exatamente o mesmo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTable = DataTableGenerico as any;
import SegmentedControl from '../../src/components/ui/SegmentedControl.vue';
import Chip from '../../src/components/ui/Chip.vue';

describe('RiskBadge', () => {
  it('mostra ícone + texto + valor com vírgula (não depende só da cor)', () => {
    const w = mount(RiskBadge, { props: { classe: 'Alto', valor: 10.2 } });
    expect(w.text()).toContain('Alto');
    expect(w.text()).toContain('10,2');
    expect(w.find('i').exists()).toBe(true);
    expect(w.classes()).toContain('risk-badge--alto');
  });

  it('usa ícones de formas diferentes para cada nível', () => {
    const icone = (classe: 'Baixo' | 'Extremo') =>
      mount(RiskBadge, { props: { classe } }).find('i').attributes('class');
    expect(icone('Baixo')).not.toEqual(icone('Extremo'));
  });
});

describe('FormField', () => {
  it('liga rótulo, ajuda e erro ao campo (for/id, aria-describedby, aria-invalid)', () => {
    const w = mount(FormField, {
      props: { rotulo: 'Evento de risco', ajuda: 'O que pode acontecer?', erro: 'Campo obrigatório', obrigatorio: true },
      slots: { default: (p) => h('input', p.attrs) },
    });
    const input = w.find('input');
    const id = input.attributes('id');
    expect(w.find('label').attributes('for')).toBe(id);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('aria-required')).toBe('true');
    const descritores = input.attributes('aria-describedby')!.split(' ');
    expect(descritores).toHaveLength(2);
    for (const d of descritores) expect(w.find(`#${d}`).exists()).toBe(true);
    expect(w.find('[role="alert"]').text()).toContain('Campo obrigatório');
  });
});

describe('DataTable', () => {
  const colunas = [
    { chave: 'codigo', rotulo: 'Código', ordenavel: true },
    { chave: 'nivel', rotulo: 'Nível', ordenavel: true },
  ];
  const linhas = [
    { id: 'a', codigo: 'RADAR-002', nivel: 15 },
    { id: 'b', codigo: 'RADAR-001', nivel: 22 },
    { id: 'c', codigo: 'RADAR-003', nivel: 4.5 },
  ];

  it('no celular vira cartões: cada célula leva o nome da coluna e a semântica de tabela fica explícita', () => {
    const w = mount(DataTable, { props: { colunas, linhas, chaveLinha: 'id', legenda: 'Riscos' } });
    expect(w.find('table').attributes('role')).toBe('table');
    expect(w.findAll('tbody tr').every((tr) => tr.attributes('role') === 'row')).toBe(true);
    const celulas = w.findAll('tbody tr')[0].findAll('td');
    expect(celulas.map((td) => td.attributes('data-rotulo'))).toEqual(['Código', 'Nível']);
    expect(celulas.every((td) => td.attributes('role') === 'cell')).toBe(true);
    expect(w.findAll('th').every((th) => th.attributes('role') === 'columnheader')).toBe(true);
  });

  it('ordena ao clicar no cabeçalho e informa a direção com aria-sort', async () => {
    const w = mount(DataTable, { props: { colunas, linhas, chaveLinha: 'id', legenda: 'Riscos' } });
    const th = w.findAll('th')[1];
    await th.find('button').trigger('click');
    expect(th.attributes('aria-sort')).toBe('ascending');
    expect(w.findAll('tbody tr').map((tr) => tr.findAll('td')[1].text())).toEqual(['4.5', '15', '22']);
    await th.find('button').trigger('click');
    expect(th.attributes('aria-sort')).toBe('descending');
    expect(w.findAll('tbody tr')[0].text()).toContain('RADAR-001');
  });

  it('pagina as linhas e mostra a faixa exibida', async () => {
    const muitas = Array.from({ length: 23 }, (_, n) => ({ id: String(n), codigo: `R-${n}`, nivel: n }));
    const w = mount(DataTable, { props: { colunas, linhas: muitas, chaveLinha: 'id', legenda: 'Riscos', tamanhoPagina: 10 } });
    expect(w.findAll('tbody tr')).toHaveLength(10);
    expect(w.text()).toContain('1–10 de 23');
    await w.find('button[aria-label="Próxima página"]').trigger('click');
    await w.find('button[aria-label="Próxima página"]').trigger('click');
    expect(w.findAll('tbody tr')).toHaveLength(3);
  });

  it('mostra o estado vazio quando não há linhas', () => {
    const w = mount(DataTable, {
      props: { colunas, linhas: [], chaveLinha: 'id', legenda: 'Riscos' },
      slots: { vazio: 'Nenhum risco encontrado' },
    });
    expect(w.text()).toContain('Nenhum risco encontrado');
  });

  it('tem legenda (caption) para leitor de tela', () => {
    const w = mount(DataTable, { props: { colunas, linhas, chaveLinha: 'id', legenda: 'Riscos do Plano' } });
    expect(w.find('caption').text()).toBe('Riscos do Plano');
  });
});

describe('SegmentedControl', () => {
  const opcoes = [
    { valor: 'baixo', rotulo: 'Baixo' },
    { valor: 'moderado', rotulo: 'Moderado' },
    { valor: 'pendente_dar', rotulo: 'Pendente' },
  ];

  it('segue o padrão radiogroup: só a opção marcada recebe Tab', () => {
    const w = mount(SegmentedControl, { props: { modelValue: 'moderado', opcoes, rotulo: 'Apetite' } });
    expect(w.find('[role="radiogroup"]').attributes('aria-label')).toBe('Apetite');
    const radios = w.findAll('[role="radio"]');
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('seta para a direita seleciona a próxima opção (e volta ao início no fim)', async () => {
    const w = mount(SegmentedControl, { props: { modelValue: 'pendente_dar', opcoes, rotulo: 'Apetite' } });
    await w.findAll('[role="radio"]')[2].trigger('keydown', { key: 'ArrowRight' });
    expect(w.emitted('update:modelValue')![0]).toEqual(['baixo']);
  });
});

describe('Chip', () => {
  it('o botão de remover tem nome acessível e emite "remover"', async () => {
    const w = mount(Chip, { props: { removivel: true, rotuloRemover: 'Remover filtro Alto' }, slots: { default: 'Alto' } });
    const botao = w.find('button');
    expect(botao.attributes('aria-label')).toBe('Remover filtro Alto');
    await botao.trigger('click');
    expect(w.emitted('remover')).toHaveLength(1);
  });
});
