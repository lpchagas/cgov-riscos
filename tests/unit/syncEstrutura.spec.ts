/**
 * TESTES DO IMPORTADOR DAS LISTAS DO SHAREPOINT (Etapa B1, Tarefa 3)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * O importador (`scripts/sync-estrutura/`) lê os CSVs exportados das listas do
 * SharePoint do ICMBio (estrutura organizacional e cadeia de valor) e atualiza
 * o banco. Aqui testamos as partes "puras" (sem banco):
 *   1. a leitura do CSV no formato real (BOM, CRLF, linha `ListSchema=`, texto
 *      entre aspas com vírgula e quebra de linha);
 *   2. a conversão dos tipos da lista para os tipos do RADAR;
 *   3. a montagem da árvore (mãe inexistente, ciclos);
 *   4. a comparação com o que já está no banco (o "relatório" do importador).
 *
 * As fixtures em `tests/unit/fixtures/sharepoint/` são SINTÉTICAS: nomes e
 * códigos inventados, sem nenhum dado pessoal.
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { lerListaSharepoint } from '../../scripts/sync-estrutura/lerListaSharepoint';
import {
  converterTipo,
  montarArvore,
  converterProcessos,
  resumirVinculosCt,
  type UnidadeImportada,
} from '../../scripts/sync-estrutura/converter';
import { conferirDestinoDoSim, eEnderecoLocal } from '../../scripts/sync-estrutura/destino';
import {
  compararComBanco,
  compararProcessos,
  unidadesParaGravar,
  type UnidadeExistente,
} from '../../scripts/sync-estrutura/compararEAplicar';

const PASTA_FIXTURES = resolve(__dirname, 'fixtures/sharepoint');

/**
 * Monta uma linha da lista de estrutura com valores padrão.
 * Exemplo: `linha({ icmbio_id: '1', tipo: 'Diretoria' })`.
 */
function linha(campos: Record<string, string>): Record<string, string> {
  return {
    uorg_nome: `Unidade ${campos.icmbio_id ?? ''}`,
    sigla: '',
    status: 'Ativo',
    'uorg_nome-completo': '',
    macrogrupo: 'Sede',
    mesogrupo: '',
    microgrupo: '',
    tipo: 'Coordenação',
    icmbio_id: '',
    id_mae: '',
    hierarquia: '',
    ...campos,
  };
}

/** Uma árvore mínima: Presidência → GR9 → CT Teste. */
const ARVORE_BASE = [
  linha({ icmbio_id: '90.0000', tipo: 'Presidência', sigla: 'ITESTE', mesogrupo: 'Presidência' }),
  linha({
    icmbio_id: '93.9000',
    id_mae: '90.0000',
    tipo: 'Gerência Regional',
    sigla: 'GR9',
    macrogrupo: 'GR',
    mesogrupo: 'GR9',
  }),
  linha({
    icmbio_id: '93.9001',
    id_mae: '93.9000',
    tipo: 'Coordenação Territorial',
    sigla: 'CT Teste',
    uorg_nome: 'CT Teste',
    macrogrupo: 'GR',
    mesogrupo: 'GR9',
  }),
];

/** Converte as unidades importadas no formato "como estão no banco". */
function comoNoBanco(unidades: UnidadeImportada[]): UnidadeExistente[] {
  return unidades.map((u) => ({ ...u }));
}

describe('lerListaSharepoint — leitura do CSV no formato real', () => {
  it('lê as 3 linhas da fixture ignorando BOM e a linha ListSchema=', () => {
    const linhas = lerListaSharepoint(resolve(PASTA_FIXTURES, 'estrutura.csv'));
    expect(linhas).toHaveLength(3);
    // O BOM não pode "grudar" no nome da primeira coluna.
    expect(Object.keys(linhas[0])[0]).toBe('uorg_nome');
    expect(linhas[0].icmbio_id).toBe('90.0000');
    // Texto entre aspas com vírgula fica inteiro em uma só coluna.
    expect(linhas[1].uorg_nome).toBe('Diretoria de Planejamento, Administração e Logística de Teste');
    // Texto entre aspas com quebra de linha também.
    expect(linhas[2]['uorg_nome-completo']).toContain('\n');
    expect(linhas[2].tipo).toBe('Núcleo de Gestão Integrada');
  });

  it('lê a lista da cadeia de valor', () => {
    const linhas = lerListaSharepoint(resolve(PASTA_FIXTURES, 'cadeia-valor.csv'));
    expect(linhas).toHaveLength(2);
    expect(linhas[0].proc).toBe('Gestão de testes, ensaios e simulações');
  });
});

describe('converterTipo — tipos da lista → tipos do RADAR', () => {
  it('"Núcleo de Gestão Integrada" vira ngi', () => {
    expect(converterTipo('Núcleo de Gestão Integrada', linha({ icmbio_id: '1' }))).toBe('ngi');
  });

  it('"Assesoria da Presidência" (grafia da lista) vira orgao-assistencia', () => {
    expect(converterTipo('Assesoria da Presidência', linha({ icmbio_id: '1' }))).toBe(
      'orgao-assistencia'
    );
  });

  it('o "Comitê Gestor" (colegiado, sem icmbio_id) é ignorado', () => {
    const comite = linha({ uorg_nome: 'Comitê Gestor do Instituto', icmbio_id: '', tipo: '' });
    expect(converterTipo('', comite)).toBeNull();
  });

  it('tipo vazio com nome de categoria de UC (ex.: "PARNA ...") vira uc', () => {
    const uc = linha({ icmbio_id: '21.9999', tipo: '', uorg_nome: 'PARNA da Serra Imaginária' });
    expect(converterTipo('', uc)).toBe('uc');
  });
});

describe('montarArvore — árvore de unidades', () => {
  it('mãe inexistente → pai do grupo (microgrupo/mesogrupo) e 1 aviso', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({
        icmbio_id: '21.0001',
        id_mae: '99.9999', // não existe na lista
        tipo: 'Unidade de Conservação',
        macrogrupo: 'UC',
        mesogrupo: 'UC na GR9',
        microgrupo: '',
      }),
    ];
    const { unidades, avisos } = montarArvore(linhas);
    const uc = unidades.find((u) => u.icmbio_id === '21.0001');
    expect(uc?.id_mae).toBe('93.9000'); // GR9, o pai do grupo "UC na GR9"
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('21.0001');
  });

  it('o microgrupo (CT de vínculo) tem preferência sobre o mesogrupo', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({
        icmbio_id: '22.0001',
        id_mae: '',
        tipo: 'Núcleo de Gestão Integrada',
        macrogrupo: 'UC',
        mesogrupo: 'UC na GR9',
        microgrupo: 'CT Teste',
      }),
    ];
    const { unidades } = montarArvore(linhas);
    expect(unidades.find((u) => u.icmbio_id === '22.0001')?.id_mae).toBe('93.9001');
  });

  it('ciclo A → B → A → erro com "ciclo"', () => {
    const linhas = [
      linha({ icmbio_id: 'A', id_mae: 'B' }),
      linha({ icmbio_id: 'B', id_mae: 'A' }),
    ];
    expect(() => montarArvore(linhas)).toThrow(/ciclo/);
  });

  it('unidade que é mãe de si mesma → pai do grupo + 1 aviso (não é tratada como ciclo)', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({ icmbio_id: '22.0002', id_mae: '22.0002', macrogrupo: 'UC', mesogrupo: 'UC na GR9' }),
    ];
    const { unidades, avisos } = montarArvore(linhas);
    expect(unidades.find((u) => u.icmbio_id === '22.0002')?.id_mae).toBe('93.9000');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('própria unidade');
  });

  it('o Comitê Gestor fica de fora e a GR de vínculo é preenchida', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({ uorg_nome: 'Comitê Gestor', icmbio_id: '', id_mae: '90.0000', tipo: '' }),
    ];
    const { unidades } = montarArvore(linhas);
    expect(unidades).toHaveLength(3);
    expect(unidades.find((u) => u.icmbio_id === '93.9001')?.grupo_regional).toBe('GR9');
  });
});

describe('compararComBanco — relatório do que muda', () => {
  it('reexecutar com a mesma entrada → só semMudanca', () => {
    const { unidades } = montarArvore(ARVORE_BASE);
    const relatorio = compararComBanco(unidades, comoNoBanco(unidades));
    expect(relatorio.semMudanca).toHaveLength(3);
    expect(relatorio.novas).toHaveLength(0);
    expect(relatorio.renomeadas).toHaveLength(0);
    expect(relatorio.mudaramDeMae).toHaveLength(0);
    expect(relatorio.desativadas).toHaveLength(0);
  });

  it('banco vazio → todas aparecem em novas', () => {
    const { unidades } = montarArvore(ARVORE_BASE);
    expect(compararComBanco(unidades, []).novas).toHaveLength(3);
  });

  it("status = 'Inativo' → aparece em desativadas", () => {
    const antes = montarArvore(ARVORE_BASE).unidades;
    const linhasDepois = ARVORE_BASE.map((l) =>
      l.icmbio_id === '93.9001' ? { ...l, status: 'Inativo' } : l
    );
    const depois = montarArvore(linhasDepois).unidades;
    const relatorio = compararComBanco(depois, comoNoBanco(antes));
    expect(relatorio.desativadas.map((u) => u.icmbio_id)).toEqual(['93.9001']);
  });

  it('unidade que sumiu da lista → aparece em desativadas', () => {
    const antes = montarArvore(ARVORE_BASE).unidades;
    const depois = montarArvore(ARVORE_BASE.slice(0, 2)).unidades;
    const relatorio = compararComBanco(depois, comoNoBanco(antes));
    expect(relatorio.desativadas.map((u) => u.icmbio_id)).toEqual(['93.9001']);
    expect(relatorio.desativadas[0].ativa).toBe(false);
  });

  it('mudança de id_mae → aparece em mudaramDeMae', () => {
    const antes = montarArvore(ARVORE_BASE).unidades;
    const linhasDepois = ARVORE_BASE.map((l) =>
      l.icmbio_id === '93.9001' ? { ...l, id_mae: '90.0000' } : l
    );
    const depois = montarArvore(linhasDepois).unidades;
    const relatorio = compararComBanco(depois, comoNoBanco(antes));
    expect(relatorio.mudaramDeMae.map((m) => m.depois.icmbio_id)).toEqual(['93.9001']);
    expect(relatorio.semMudanca).toHaveLength(2);
  });

  it('mudança de nome → aparece em renomeadas', () => {
    const antes = montarArvore(ARVORE_BASE).unidades;
    const linhasDepois = ARVORE_BASE.map((l) =>
      l.icmbio_id === '93.9000' ? { ...l, uorg_nome: 'GR9 - Novo nome' } : l
    );
    const relatorio = compararComBanco(montarArvore(linhasDepois).unidades, comoNoBanco(antes));
    expect(relatorio.renomeadas.map((m) => m.depois.nome)).toEqual(['GR9 - Novo nome']);
  });
});

describe('converterProcessos — cadeia de valor', () => {
  it('liga líder pelo icmbio_id e supervisor pela sigla; sigla desconhecida gera aviso', () => {
    const { unidades } = montarArvore(lerListaSharepoint(resolve(PASTA_FIXTURES, 'estrutura.csv')));
    const cadeia = lerListaSharepoint(resolve(PASTA_FIXTURES, 'cadeia-valor.csv'));
    const { processos, avisos } = converterProcessos(cadeia, unidades);
    expect(processos).toHaveLength(2);
    expect(processos[0]).toMatchObject({
      proc_id: '9.01.1',
      lider_icmbio_id: '90.1000',
      supervisor_icmbio_id: '90.1000',
      ativo: true,
    });
    // "XYZ" não existe → supervisor fica vazio e o caso vai para os avisos.
    expect(processos[1].supervisor_icmbio_id).toBeNull();
    expect(avisos.some((a) => a.includes('XYZ'))).toBe(true);
  });

  it('sigla repetida: prefere a unidade de nível de direção (CG, diretoria...)', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({ icmbio_id: '90.2000', id_mae: '90.0000', tipo: 'Coordenação-Geral', sigla: 'CGX' }),
      linha({ icmbio_id: '90.2001', id_mae: '90.2000', tipo: 'Divisão', sigla: 'CGX' }),
    ];
    const { unidades } = montarArvore(linhas);
    const { processos, avisos } = converterProcessos(
      [{ proc: 'P', proc_id: '1', supervisor: 'CGX', icmbio_id: '90.2001' }],
      unidades
    );
    expect(processos[0].supervisor_icmbio_id).toBe('90.2000');
    expect(avisos).toHaveLength(0);
  });

  it('reexecutar com os mesmos processos → só semMudanca', () => {
    const { unidades } = montarArvore(ARVORE_BASE);
    const { processos } = converterProcessos(
      [{ proc: 'P', proc_id: '1', supervisor: 'GR9', icmbio_id: '93.9000' }],
      unidades
    );
    const relatorio = compararProcessos(processos, processos.map((p) => ({ ...p })));
    expect(relatorio.semMudanca).toHaveLength(1);
    expect(relatorio.novos).toHaveLength(0);
  });
});

/**
 * VÍNCULO COM A COORDENAÇÃO TERRITORIAL (decisão R9 em decisoes-tecnicas-b1.md)
 * ----------------------------------------------------------------------------
 * Na lista real, nenhuma UC tem uma CT como mãe (`id_mae`): as UCs ficam sob
 * um NGI ou direto sob a GR. O vínculo com a CT só aparece no `microgrupo`
 * (ex.: "CT Curitiba"). O importador lê esse texto, procura a unidade do tipo
 * Coordenação Territorial com o MESMO nome e grava o vínculo à parte, sem
 * mexer na mãe.
 */
describe('vínculo com a Coordenação Territorial (microgrupo "CT ...")', () => {
  /** UC sob a GR9 (mãe) e vinculada à CT pelo microgrupo. */
  const ucDaCt = (microgrupo: string) =>
    linha({
      icmbio_id: '21.0100',
      id_mae: '93.9000',
      tipo: 'Unidade de Conservação',
      uorg_nome: 'PARNA de Teste',
      macrogrupo: 'UC',
      mesogrupo: 'UC na GR9',
      microgrupo,
    });

  it('microgrupo "CT Teste" → vínculo com a CT Teste (a mãe continua a GR9)', () => {
    // Espaços e maiúsculas diferentes não atrapalham a comparação.
    const { unidades, avisos } = montarArvore([...ARVORE_BASE, ucDaCt('  ct   teste ')]);
    const uc = unidades.find((u) => u.icmbio_id === '21.0100');
    expect(uc?.coordenacao_territorial_icmbio_id).toBe('93.9001');
    expect(uc?.id_mae).toBe('93.9000');
    expect(avisos).toHaveLength(0);
  });

  it('a própria CT (microgrupo = seu nome) não fica vinculada a si mesma', () => {
    const linhas = ARVORE_BASE.map((l) =>
      l.icmbio_id === '93.9001' ? { ...l, microgrupo: 'CT Teste' } : l
    );
    const ct = montarArvore(linhas).unidades.find((u) => u.icmbio_id === '93.9001');
    expect(ct?.coordenacao_territorial_icmbio_id).toBeNull();
  });

  it('microgrupo sem CT correspondente → 1 aviso agregado e nenhum vínculo', () => {
    const linhas = [
      ...ARVORE_BASE,
      ucDaCt('CT Inexistente'),
      { ...ucDaCt('CT Inexistente'), icmbio_id: '21.0101', uorg_nome: 'REBIO de Teste' },
    ];
    const { unidades, avisos } = montarArvore(linhas);
    expect(unidades.every((u) => u.coordenacao_territorial_icmbio_id === null)).toBe(true);
    expect(avisos).toEqual([
      "microgrupo 'CT Inexistente' sem CT correspondente: 2 unidades sem vínculo",
    ]);
  });

  // P-B1-4: a CT precisa ser da MESMA Gerência Regional da unidade.
  const GR8_E_CT_OUTRA = [
    linha({ icmbio_id: '93.8000', id_mae: '90.0000', tipo: 'Gerência Regional', sigla: 'GR8', macrogrupo: 'GR', mesogrupo: 'GR8' }),
    linha({
      icmbio_id: '93.8001',
      id_mae: '93.8000',
      tipo: 'Coordenação Territorial',
      sigla: 'CT Outra',
      uorg_nome: 'CT Outra',
      macrogrupo: 'GR',
      mesogrupo: 'GR8',
    }),
  ];

  it('CT de outra GR → vínculo null e aviso "vínculo com CT de outra GR ignorado"', () => {
    // A UC está sob a GR9, mas o microgrupo aponta para a CT da GR8.
    const { unidades, avisos } = montarArvore([...ARVORE_BASE, ...GR8_E_CT_OUTRA, ucDaCt('CT Outra')]);
    const uc = unidades.find((u) => u.icmbio_id === '21.0100');
    expect(uc?.coordenacao_territorial_icmbio_id).toBeNull();
    expect(avisos).toEqual([
      'vínculo com CT de outra GR ignorado: 21.0100 "PARNA de Teste" (GR 93.9000) → CT 93.8001 "CT Outra" (GR 93.8000)',
    ]);
  });

  it('CT da mesma GR continua vinculada, mesmo com outra GR na lista', () => {
    const { unidades, avisos } = montarArvore([...ARVORE_BASE, ...GR8_E_CT_OUTRA, ucDaCt('CT Teste')]);
    expect(unidades.find((u) => u.icmbio_id === '21.0100')?.coordenacao_territorial_icmbio_id).toBe('93.9001');
    expect(avisos).toHaveLength(0);
  });

  it('unidade sem GR ancestral (ligada direto à Presidência) mantém o vínculo', () => {
    // Sem GR de um dos lados não dá para afirmar que é "outra GR": mantém o comportamento anterior.
    const uc = { ...ucDaCt('CT Teste'), id_mae: '90.0000' };
    const { unidades, avisos } = montarArvore([...ARVORE_BASE, uc]);
    expect(unidades.find((u) => u.icmbio_id === '21.0100')?.coordenacao_territorial_icmbio_id).toBe('93.9001');
    expect(avisos).toHaveLength(0);
  });

  it('unidade sem microgrupo de CT → vínculo null', () => {
    const { unidades } = montarArvore(ARVORE_BASE);
    expect(unidades.every((u) => u.coordenacao_territorial_icmbio_id === null)).toBe(true);
  });

  it('resumo: conta as unidades de cada CT e lista as CTs sem unidades vinculadas', () => {
    const linhas = [
      ...ARVORE_BASE,
      linha({
        icmbio_id: '93.9002',
        id_mae: '93.9000',
        tipo: 'Coordenação Territorial',
        uorg_nome: 'CT Vazia',
        mesogrupo: 'GR9',
      }),
      ucDaCt('CT Teste'),
    ];
    const resumo = resumirVinculosCt(montarArvore(linhas).unidades);
    expect(resumo.totalCts).toBe(2);
    expect(resumo.porCt).toEqual([
      { icmbio_id: '93.9001', nome: 'CT Teste', unidades: 1 },
      { icmbio_id: '93.9002', nome: 'CT Vazia', unidades: 0 },
    ]);
    expect(resumo.ctsSemUnidades).toEqual(['CT Vazia']);
  });

  it('reexecutar com o vínculo → só semMudanca', () => {
    const { unidades } = montarArvore([...ARVORE_BASE, ucDaCt('CT Teste')]);
    const relatorio = compararComBanco(unidades, comoNoBanco(unidades));
    expect(relatorio.semMudanca).toHaveLength(4);
    expect(relatorio.mudaramDeCt).toHaveLength(0);
    expect(relatorio.outrasMudancas).toHaveLength(0);
  });

  it('mudança do vínculo com a CT → aparece em mudaramDeCt (e é gravada)', () => {
    const antes = montarArvore([...ARVORE_BASE, ucDaCt('')]).unidades;
    const depois = montarArvore([...ARVORE_BASE, ucDaCt('CT Teste')]).unidades;
    const relatorio = compararComBanco(depois, comoNoBanco(antes));
    expect(relatorio.mudaramDeCt.map((m) => m.depois.icmbio_id)).toEqual(['21.0100']);
    expect(relatorio.mudaramDeCt[0].antes.coordenacao_territorial_icmbio_id).toBeNull();
    expect(relatorio.semMudanca).toHaveLength(3);
    expect(unidadesParaGravar(relatorio).map((u) => u.icmbio_id)).toEqual(['21.0100']);
  });
});

describe('conferirDestinoDoSim — o --sim só grava sem perguntar no banco LOCAL', () => {
  // Por quê? O `--sim` (usado pelo `npm run db:reset`) aplica as mudanças sem
  // perguntar. Se SUPABASE_URL estiver apontando para a nuvem por engano, o
  // importador gravaria na base REAL sem confirmação. Por isso, com `--sim`,
  // só aceitamos 127.0.0.1/localhost — salvo `--permitir-remoto` explícito.
  it('reconhece endereços locais', () => {
    expect(eEnderecoLocal('http://127.0.0.1:54321')).toBe(true);
    expect(eEnderecoLocal('http://localhost:54321')).toBe(true);
    expect(eEnderecoLocal('http://[::1]:54321')).toBe(true);
    expect(eEnderecoLocal('https://abcd.supabase.co')).toBe(false);
    // Truque de nome: "localhost" como subdomínio de outro servidor NÃO é local.
    expect(eEnderecoLocal('https://localhost.exemplo.com')).toBe(false);
    expect(eEnderecoLocal('não é URL')).toBe(false);
  });

  it('--sim com URL local → segue', () => {
    expect(() => conferirDestinoDoSim('http://127.0.0.1:54321', { sim: true, permitirRemoto: false })).not.toThrow();
  });

  it('--sim com URL remota → recusa com mensagem RADAR: clara', () => {
    expect(() => conferirDestinoDoSim('https://abcd.supabase.co', { sim: true, permitirRemoto: false })).toThrow(
      /RADAR:.*--sim.*--permitir-remoto/,
    );
  });

  it('--sim com URL remota e --permitir-remoto → segue (decisão explícita)', () => {
    expect(() => conferirDestinoDoSim('https://abcd.supabase.co', { sim: true, permitirRemoto: true })).not.toThrow();
  });

  it('sem --sim → segue (o importador pergunta "Aplicar? (s/N)" antes de gravar)', () => {
    expect(() => conferirDestinoDoSim('https://abcd.supabase.co', { sim: false, permitirRemoto: false })).not.toThrow();
  });
});
