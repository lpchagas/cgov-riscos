/**
 * Testes dos conversores da camada de dados (`src/services/dados/conversores.ts`).
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O banco fala "snake_case" (nivel_residual) e o front fala "camelCase"
 * (nivelResidual). Os conversores são funções puras que traduzem de um para o
 * outro. Aqui usamos linhas REAIS do banco local (a fixture
 * `fixtures/banco/riscoCofis.json`, copiada da semente) para garantir que a
 * tradução não perde nem inventa nada.
 */
import { describe, it, expect } from 'vitest';
import fixture from './fixtures/banco/riscoCofis.json';
import {
  acoesDoBanco,
  categoriaDoBanco,
  eventoAuditoriaDoBanco,
  eventoFluxoDoBanco,
  fichaParaJson,
  fichaDaSkillParaSalvar,
  fichaParaSalvarDeRisco,
  historicoDoBanco,
  objetoDoBanco,
  processoDoBanco,
  riscoDoBanco,
  soCamposCalculadosMudaram,
  unidadeDoBanco,
} from '../../src/services/dados/conversores';

// Monta a ficha do front a partir das linhas da fixture (como a fonte Supabase fará).
function fichaDaFixture() {
  const unidade = unidadeDoBanco(fixture.unidade);
  const objeto = objetoDoBanco(fixture.objeto, { unidade, processo: null });
  const categoria = categoriaDoBanco(fixture.categoria);
  return riscoDoBanco(fixture.risco, {
    objeto,
    categoria,
    controles: fixture.controles,
    respostas: fixture.respostas,
    kris: fixture.kris,
    kriRiscos: fixture.kri_riscos,
    medicoes: fixture.medicoes,
    historico: fixture.historico,
  });
}

// Colunas de ENTRADA do risco (as que a função salvar_ficha_risco aceita).
const COLUNAS_ENTRADA = [
  'objeto_id',
  'responsavel_risco_nome',
  'causas',
  'evento_risco',
  'consequencias',
  'objetivo_afetado',
  'categoria_id',
  'subcategoria_integridade',
  'teste_integridade_aplicavel',
  'justificativa_nao_integridade',
  'probabilidade',
  'justificativa_probabilidade',
  'impacto',
  'justificativa_impacto',
  'possui_evidencia_controle',
  'nivel_eficacia_controle',
  'estrategia_principal',
] as const;

describe('riscoDoBanco', () => {
  it('lê a linha real de RADAR-DEMO-COFIS sem recalcular nada', () => {
    const f = fichaDaFixture();
    expect(f.id).toBe(fixture.risco.id);
    expect(f.codigoRadar).toBe('RADAR-DEMO-COFIS');
    expect(f.objetoId).toBe(fixture.objeto.id);
    // A unidade dona vem do objeto (a tabela riscos não tem unidade_id).
    expect(f.unidadeId).toBe(fixture.objeto.unidade_id);
    expect(f.nomeObjetoCache).toBe(fixture.objeto.nome_objeto);
    expect(f.categoriaNome).toBe('Legal');
    // Valores calculados vêm GRAVADOS pelo banco (o front não refaz a conta).
    expect(f.nivelInerente).toBe(24);
    expect(f.classificacaoInerente).toBe('Extremo');
    expect(f.fatorControle).toBe(0.5);
    expect(f.nivelResidual).toBe(12);
    expect(f.classificacaoResidual).toBe('Alto');
    expect(f.statusCritico).toBe('sim');
    expect(f.isCritico).toBe(true);
    expect(f.statusFluxo).toBe('aprovado');
    expect(f.atualizadoEm).toBe(fixture.risco.atualizado_em);
    expect(f.descricaoPadrao).toBe(fixture.risco.descricao_padrao);
    // null do banco vira "ausente" no front.
    expect(f.subcategoriaIntegridade).toBeUndefined();
    expect(f.memoriaCalculo).toContain('Residual 12');
  });

  it('agrupa os filhos no risco certo (KRI com suas medições, histórico em ordem)', () => {
    const f = fichaDaFixture();
    expect(f.controlesExistentes).toHaveLength(1);
    expect(f.controlesExistentes[0].possuiEvidenciaComprovada).toBe(true);
    expect(f.respostasTratamento[0].prazoQuando).toBe('2027-03-31');
    expect(f.respostasTratamento[0].localOnde).toBeUndefined();
    expect(f.kris[0].medicoes).toHaveLength(2);
    // Medições da mais recente para a mais antiga (como a tela de Monitoramento espera).
    expect(f.kris[0].medicoes[0].dataMedicao).toBe('2026-12-31');
    // Histórico em ordem de acontecimento (pela coluna `sequencia`).
    expect(f.historicoFluxo.map((h) => h.acao)).toEqual(['submetido', 'validado']);
  });

  it('aceita números que o PostgREST manda como texto (numeric)', () => {
    const f = riscoDoBanco({ ...fixture.risco, nivel_residual: '10.20', fator_controle: '0.60' }, {});
    expect(f.nivelResidual).toBe(10.2);
    expect(f.fatorControle).toBe(0.6);
    expect(f.historicoFluxo).toEqual([]);
  });
});

describe('fichaParaJson', () => {
  it('ida e volta: banco → front → JSON devolve as mesmas colunas de entrada', () => {
    const json = fichaParaJson(fichaParaSalvarDeRisco(fichaDaFixture(), []));
    expect(json.id).toBe(fixture.risco.id);
    for (const coluna of COLUNAS_ENTRADA) {
      expect(json[coluna], coluna).toEqual((fixture.risco as Record<string, unknown>)[coluna]);
    }
    const controles = json.controles as Array<Record<string, unknown>>;
    expect(controles[0]).toEqual({
      id: fixture.controles[0].id,
      descricao_controle: fixture.controles[0].descricao_controle,
      evidencia_funcionamento: fixture.controles[0].evidencia_funcionamento,
      possui_evidencia_comprovada: true,
      desenho_adequado: true,
      operacao_comprovada: true,
    });
    const resposta = (json.respostas as Array<Record<string, unknown>>)[0];
    expect(resposta.acao_o_que).toBe(fixture.respostas[0].acao_o_que);
    expect(resposta.status_execucao).toBe('em_andamento');
    const kri = (json.kris as Array<Record<string, unknown>>)[0];
    expect(kri.nome_indicador).toBe(fixture.kris[0].nome_indicador);
    // Medições NÃO passam pela gravação da ficha (são do Monitoramento).
    expect(kri).not.toHaveProperty('medicoes');
  });

  it('nunca envia campos calculados nem o estado do fluxo', () => {
    const json = fichaParaJson(fichaParaSalvarDeRisco(fichaDaFixture(), []));
    for (const proibido of [
      'nivel_residual',
      'nivel_inerente',
      'classificacao_inerente',
      'classificacao_residual',
      'status_critico',
      'is_critico',
      'fator_controle',
      'status_fluxo',
      'descricao_padrao',
      'codigo_radar',
      'memoria_calculo',
    ]) {
      expect(json, proibido).not.toHaveProperty(proibido);
    }
  });

  it('texto opcional vazio ou ausente da resposta 5W2H vai como null (o banco apaga o valor)', () => {
    // Situação real: a pessoa apaga o "Por quê" de uma ação já gravada. Sem o
    // null, a chave sumiria do JSON e o banco entenderia "manter o valor antigo".
    const ficha = fichaDaFixture();
    ficha.respostasTratamento[0] = {
      ...ficha.respostasTratamento[0],
      justificativaPorQue: undefined,
      localOnde: '   ',
      custoQuanto: '',
    };
    const json = fichaParaJson(fichaParaSalvarDeRisco(ficha, []));
    const resposta = (json.respostas as Array<Record<string, unknown>>)[0];
    expect(resposta).toHaveProperty('justificativa_por_que', null);
    expect(resposta).toHaveProperty('local_onde', null);
    expect(resposta).toHaveProperty('custo_quanto', null);
    // Texto preenchido continua indo como está.
    expect(resposta.acao_o_que).toBe(fixture.respostas[0].acao_o_que);
  });

  it('filho com id vazio (criado na edição da ficha) vai SEM id: a fonte cria um novo', () => {
    // Situação real: na edição, a pessoa escreve um controle onde não havia nenhum.
    // O formulário não inventa id (um id provisório quebraria o ::uuid do banco).
    const ficha = fichaDaFixture();
    ficha.controlesExistentes = [{ ...ficha.controlesExistentes[0], id: '' }];
    ficha.respostasTratamento = [{ ...ficha.respostasTratamento[0], id: '' }];
    ficha.kris = [{ ...ficha.kris[0], id: '' }];
    const pacote = fichaParaSalvarDeRisco(ficha, []);
    expect(pacote.controles![0].id).toBeUndefined();
    expect(pacote.respostas![0].id).toBeUndefined();
    expect(pacote.kris![0].id).toBeUndefined();
    const json = fichaParaJson(pacote);
    for (const grupo of ['controles', 'respostas', 'kris']) {
      expect((json[grupo] as Array<Record<string, unknown>>)[0]).not.toHaveProperty('id');
    }
  });

  it('omite grupo de filhos ausente (= não mexer) e manda lista vazia quando pedida', () => {
    const json = fichaParaJson({ objetoId: 'obj-1', causas: 'x', controles: [] });
    expect(json).toEqual({ objeto_id: 'obj-1', causas: 'x', controles: [] });
    expect(json).not.toHaveProperty('respostas');
    expect(json).not.toHaveProperty('kris');
    expect(json).not.toHaveProperty('id');
  });

  it('ficha nova preliminar da CGOV leva preliminar_cgov e item novo vai sem id', () => {
    const json = fichaParaJson({
      objetoId: 'obj-1',
      preliminarCgov: true,
      subcategoriaIntegridade: null,
      controles: [
        {
          descricaoControle: 'Checklist',
          evidenciaFuncionamento: 'Nenhuma',
          possuiEvidenciaComprovada: false,
          desenhoAdequado: false,
          operacaoComprovada: false,
        },
      ],
    });
    expect(json.preliminar_cgov).toBe(true);
    // null explícito = apagar o valor no banco.
    expect(json.subcategoria_integridade).toBeNull();
    expect((json.controles as Array<Record<string, unknown>>)[0]).not.toHaveProperty('id');
  });
});

describe('fichaParaJson: subcategoria em branco', () => {
  // Segunda ponta da mesma regra: mesmo que chegue '' ou só espaços, o JSON
  // leva null ("sem subcategoria"), e o banco responde com a mensagem RADAR.
  it("'' e '   ' viram null; texto de verdade passa como veio; ausente fica ausente", () => {
    expect(fichaParaJson({ objetoId: 'obj-1', subcategoriaIntegridade: '' }).subcategoria_integridade).toBeNull();
    expect(fichaParaJson({ objetoId: 'obj-1', subcategoriaIntegridade: '   ' }).subcategoria_integridade).toBeNull();
    expect(fichaParaJson({ objetoId: 'obj-1', subcategoriaIntegridade: 'Nepotismo' }).subcategoria_integridade).toBe('Nepotismo');
    expect(fichaParaJson({ objetoId: 'obj-1' })).not.toHaveProperty('subcategoria_integridade');
  });
});

describe('soCamposCalculadosMudaram ("recalculado pela DAR")', () => {
  const antes = fixture.risco as Record<string, unknown>;

  it('verdadeiro quando só status_critico e atualizado_em mudaram', () => {
    const depois = { ...antes, status_critico: 'nao', is_critico: false, atualizado_em: '2026-11-17T10:00:00+00:00' };
    expect(soCamposCalculadosMudaram(antes, depois)).toBe(true);
  });

  it('falso quando causas mudou (veio da ficha)', () => {
    const depois = { ...antes, causas: 'outra causa', status_critico: 'nao' };
    expect(soCamposCalculadosMudaram(antes, depois)).toBe(false);
  });

  it('falso quando nada mudou ou falta um dos lados', () => {
    expect(soCamposCalculadosMudaram(antes, { ...antes })).toBe(false);
    expect(soCamposCalculadosMudaram(null, antes)).toBe(false);
    expect(soCamposCalculadosMudaram(antes, null)).toBe(false);
  });

  it('memoria_calculo e descricao_padrao também contam como calculados', () => {
    const depois = { ...antes, descricao_padrao: 'nova frase', memoria_calculo: 'nova conta' };
    expect(soCamposCalculadosMudaram(antes, depois)).toBe(true);
  });
});

describe('demais conversores', () => {
  it('unidade, categoria e processo', () => {
    const u = unidadeDoBanco(fixture.unidade);
    expect(u).toEqual({
      id: fixture.unidade.id,
      sigla: 'COFIS',
      nome: 'Cord. de Fiscalização',
      tipo: 'coordenacao',
      unidadePaiId: fixture.unidade.unidade_pai_id,
      ativa: true,
    });
    const c = categoriaDoBanco(fixture.categoria);
    expect(c.apetiteDeclarado).toBe('baixo');
    expect(categoriaDoBanco({ ...fixture.categoria, justificativa_dar: null }).justificativaDar).toBe('');
    const p = processoDoBanco(fixture.processo);
    expect(p).toEqual({
      id: fixture.processo.id,
      procId: '2.02.3',
      nome: 'Fiscalização ambiental',
      macroprocesso: 'Proteção',
      ativo: true,
      unidadeSupervisoraId: fixture.processo.unidade_supervisora_id,
    });
  });

  it('objeto ligado a processo inativo e unidade inativa', () => {
    const processo = { ...processoDoBanco(fixture.processo), ativo: false };
    const unidade = { ...unidadeDoBanco(fixture.unidade), ativa: false };
    const o = objetoDoBanco(fixture.objetoComProcesso, { processo, unidade });
    expect(o.processoId).toBe(fixture.processo.id);
    expect(o.processoNome).toBe('Fiscalização ambiental');
    expect(o.processoAtivo).toBe(false);
    expect(o.unidadeAtiva).toBe(false);
    expect(o.insumosPrincipais).toBe('');
    const semProcesso = objetoDoBanco(fixture.objeto, {});
    expect(semProcesso.processoId).toBeNull();
    expect(semProcesso.processoAtivo).toBeNull();
    expect(semProcesso.unidadeAtiva).toBe(true);
  });

  it('ações do fluxo, histórico e evento de auditoria', () => {
    const a = acoesDoBanco({
      risco_id: 'r1',
      pode_enviar: false,
      pode_assumir: false,
      pode_validar: true,
      pode_homologar: false,
      pode_devolver: true,
      devolucao_cgov: false,
      pode_editar: false,
      pode_excluir: false,
      motivo: null,
    });
    expect(a).toEqual({
      riscoId: 'r1',
      podeEnviar: false,
      podeAssumir: false,
      podeValidar: true,
      podeHomologar: false,
      podeDevolver: true,
      devolucaoCgov: false,
      podeEditar: false,
      podeExcluir: false,
      motivo: null,
    });

    const h = historicoDoBanco(fixture.historico[1]);
    expect(h).toEqual({
      id: fixture.historico[1].id,
      etapa: 'submissao_1a_linha',
      acao: 'submetido',
      usuarioNome: 'Gestor(a) de unidade — demonstração',
      usuarioPapel: 'gestor',
      despachoTexto: 'Enviado para validação.',
      criadoEm: '2026-11-09T10:00:00+00:00',
    });
    const ev = eventoFluxoDoBanco(fixture.historico[0], 'RADAR-DEMO-COFIS');
    expect(ev.riscoId).toBe(fixture.risco.id);
    expect(ev.codigoRadar).toBe('RADAR-DEMO-COFIS');
    expect(ev.despachoTexto).toBeUndefined();

    const aud = eventoAuditoriaDoBanco({
      id: 'a1',
      realizado_em: '2026-11-16T10:00:00+00:00',
      tabela_afetada: 'riscos',
      operacao: 'UPDATE',
      registro_id: fixture.risco.id,
      objeto_id: fixture.objeto.id,
      usuario_id: null,
      quem_nome: null,
      quem_papel: null,
      codigo_radar: 'RADAR-DEMO-COFIS',
      dados_anteriores: { causas: 'a' },
      dados_novos: { causas: 'b' },
    });
    expect(aud).toEqual({
      id: 'a1',
      realizadoEm: '2026-11-16T10:00:00+00:00',
      tabela: 'riscos',
      operacao: 'UPDATE',
      quemNome: null,
      quemPapel: null,
      codigoRadar: 'RADAR-DEMO-COFIS',
      anteriores: { causas: 'a' },
      novos: { causas: 'b' },
    });
  });
});

describe('fichaDaSkillParaSalvar (importação)', () => {
  const linha = {
    codigoRadar: 'RSC-X',
    nomeObjeto: 'Objeto',
    descricaoPadrao: '',
    causas: 'c',
    eventoRisco: 'e',
    consequencias: 'q',
    objetivoAfetado: 'o',
    categoriaNome: 'Socioambiental',
    probabilidade: 3,
    impacto: 3,
    controlesTexto: 'Inexistente',
    possuiEvidenciaControle: false,
    nivelEficaciaControle: 'Inexistente',
    estrategiaTratamento: 'Mitigar',
  } as unknown as Parameters<typeof fichaDaSkillParaSalvar>[0];
  const categorias = [
    categoriaDoBanco({ ...fixture.categoria, id: 2, nome: 'Operacional' }),
    categoriaDoBanco({ ...fixture.categoria, id: 4, nome: 'Legal' }),
  ];

  it('fichaDaSkillParaSalvar recusa categoria desconhecida em vez de trocar por Operacional', () => {
    expect(() => fichaDaSkillParaSalvar(linha, categorias, 'obj-1')).toThrow(
      'RADAR: a categoria "Socioambiental" não existe no banco.'
    );
  });

  it('acha a categoria sem diferença de maiúsculas', () => {
    const ficha = fichaDaSkillParaSalvar({ ...linha, categoriaNome: 'legal' }, categorias, 'obj-1');
    expect(ficha.categoriaId).toBe(4);
  });
  it('KRI sugerido vira só o nome do indicador, sem inventar outros campos (RF-183)', () => {
    const ficha = fichaDaSkillParaSalvar({ ...linha, categoriaNome: 'legal', kriSugerido: 'X' }, categorias, 'obj-1');
    expect(ficha.kris).toEqual([{ nomeIndicador: 'X' }]);
  });

  it('sem KRI sugerido, não cria KRI', () => {
    const ficha = fichaDaSkillParaSalvar({ ...linha, categoriaNome: 'legal', kriSugerido: '' }, categorias, 'obj-1');
    expect(ficha.kris).toEqual([]);
  });

  it('leva o Teste de Integridade e a justificativa lidos da tabela de 18 colunas', () => {
    const ficha = fichaDaSkillParaSalvar(
      { ...linha, categoriaNome: 'legal', testeIntegridadeAplicavel: true, justificativaNaoIntegridade: 'Beneficia um requerente específico.' },
      categorias,
      'obj-1'
    );
    expect(ficha.testeIntegridadeAplicavel).toBe(true);
    expect(ficha.justificativaNaoIntegridade).toBe('Beneficia um requerente específico.');
  });

  it('sem justificativa, não envia texto vazio (fica ausente)', () => {
    const ficha = fichaDaSkillParaSalvar({ ...linha, categoriaNome: 'legal', testeIntegridadeAplicavel: false }, categorias, 'obj-1');
    expect(ficha.testeIntegridadeAplicavel).toBe(false);
    expect(ficha.justificativaNaoIntegridade).toBeUndefined();
  });

  it('causa, consequência e objetivo em branco seguem em branco (sem inventar texto)', () => {
    const ficha = fichaDaSkillParaSalvar(
      { ...linha, categoriaNome: 'legal', causas: '', consequencias: '', objetivoAfetado: '' },
      categorias,
      'obj-1'
    );
    expect(ficha.causas).toBe('');
    expect(ficha.consequencias).toBe('');
    expect(ficha.objetivoAfetado).toBe('');
  });

  it('a evidência lida vai para o risco e para o controle', () => {
    const ficha = fichaDaSkillParaSalvar(
      { ...linha, categoriaNome: 'legal', controlesTexto: 'Norma interna', possuiEvidenciaControle: true, nivelEficaciaControle: 'Mediano' },
      categorias,
      'obj-1'
    );
    expect(ficha.possuiEvidenciaControle).toBe(true);
    expect(ficha.controles?.[0].possuiEvidenciaComprovada).toBe(true);
    const sem = fichaDaSkillParaSalvar({ ...linha, categoriaNome: 'legal', controlesTexto: 'Planilha', possuiEvidenciaControle: false }, categorias, 'obj-1');
    expect(sem.controles?.[0].possuiEvidenciaComprovada).toBe(false);
  });
});

describe('KRI ligado a riscos (LAC-03)', () => {
  const RISCO_A = fixture.risco.id;
  const RISCO_B = 'e58bb8dd-ca88-4b6a-bc37-7fcfd0f72142';
  const KRI = fixture.kris[0].id;

  it('um KRI ligado a dois riscos aparece nos dois, com o mesmo id e os dois riscoIds', () => {
    const kriRiscos = [
      { kri_id: KRI, risco_id: RISCO_A },
      { kri_id: KRI, risco_id: RISCO_B },
    ];
    const a = riscoDoBanco(fixture.risco, { kris: fixture.kris, kriRiscos, medicoes: fixture.medicoes });
    const b = riscoDoBanco({ ...fixture.risco, id: RISCO_B }, { kris: fixture.kris, kriRiscos, medicoes: fixture.medicoes });
    for (const ficha of [a, b]) {
      expect(ficha.kris).toHaveLength(1);
      expect(ficha.kris[0].id).toBe(KRI);
      expect([...ficha.kris[0].riscoIds].sort()).toEqual([RISCO_A, RISCO_B]);
      expect(ficha.kris[0].objetoId).toBe(fixture.kris[0].objeto_id);
    }
  });

  it('KRI não ligado ao risco não entra na ficha dele', () => {
    const f = riscoDoBanco(fixture.risco, { kris: fixture.kris, kriRiscos: [], medicoes: [] });
    expect(f.kris).toEqual([]);
  });

  it('NULL do banco vira undefined (nada de texto vazio nem periodicidade inventada)', () => {
    const kri = {
      ...fixture.kris[0],
      formula_calculo: null,
      fonte_dados: null,
      periodicidade: null,
      meta_alvo: null,
      limite_alerta: null,
      responsavel_medicao: null,
    };
    const f = riscoDoBanco(fixture.risco, { kris: [kri], kriRiscos: fixture.kri_riscos, medicoes: [] });
    const k = f.kris[0];
    expect(k.nomeIndicador).toBe(fixture.kris[0].nome_indicador);
    expect(k.formulaCalculo).toBeUndefined();
    expect(k.fonteDados).toBeUndefined();
    expect(k.periodicidade).toBeUndefined();
    expect(k.metaAlvo).toBeUndefined();
    expect(k.limiteAlerta).toBeUndefined();
    expect(k.responsavelMedicao).toBeUndefined();
  });

  it('fichaParaJson: apenasLigar vai como { id, apenasLigar: true } (booleano)', () => {
    const json = fichaParaJson({ objetoId: 'o1', kris: [{ id: KRI, nomeIndicador: 'X', apenasLigar: true }] });
    expect(json.kris).toEqual([{ id: KRI, apenasLigar: true }]);
  });

  it('fichaParaJson: KRI novo com campos vazios manda null, nunca "A definir"', () => {
    const json = fichaParaJson({
      objetoId: 'o1',
      kris: [{ nomeIndicador: 'X', formulaCalculo: '  ', limiteAlerta: undefined }],
    });
    expect(json.kris).toEqual([
      {
        nome_indicador: 'X',
        formula_calculo: null,
        fonte_dados: null,
        periodicidade: null,
        meta_alvo: null,
        limite_alerta: null,
        responsavel_medicao: null,
      },
    ]);
  });
});
