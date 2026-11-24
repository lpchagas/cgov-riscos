/**
 * ============================================================================
 * TESTES DA STORE ASSÍNCRONA (`tests/unit/riscosStore.spec.ts`) — Etapa B3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A store agora só conversa com uma "fonte de dados". Aqui usamos uma fonte
 * FALSA (a de demonstração, com algumas funções trocadas por espiãs `vi.fn`)
 * para conferir, sem banco:
 *   - o ciclo carregando → pronto / erro → "Tentar de novo";
 *   - que uma carga lenta que termina DEPOIS de sair é jogada fora;
 *   - que cada ação chama a fonte e depois relê o risco;
 *   - que as filas seguem as `acoes` (o que eu posso fazer), não a situação;
 *   - que uma ação recusada não muda nada e devolve o erro à tela.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, reactive } from 'vue';
import { definirFonteParaTeste, ligarCarteiraASessao, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { Carteira, FonteDados } from '../../src/services/dados/tipos';
import { ErroRadar, MENSAGEM_REDE } from '../../src/services/dados/errosBanco';
import { PERFIS_DEMO_ICMBIO } from '../../src/stores/authStore';
import type { AcoesFluxo } from '../../src/types/radar.types';

const ID_001 = () => useRiscosStore().riscos.find((r) => r.codigoRadar === 'RADAR-2026-001')!.id;

/** Fonte de demonstração (como Coordenação-Geral) com as trocas pedidas pelo teste. */
function fonteFalsa(trocas: Partial<FonteDados> = {}): FonteDados {
  const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.coordenador_geral });
  const fonte = { ...base, ...trocas };
  definirFonteParaTeste(fonte);
  return fonte;
}

/** Promessa que o próprio teste resolve quando quiser (simula o banco lento). */
function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => (resolver = r));
  return { promessa, resolver };
}

describe('riscosStore assíncrona', () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => definirFonteParaTeste(null));

  it('começa ociosa e vazia; carregar passa por "carregando" e termina "pronto"', async () => {
    fonteFalsa();
    const store = useRiscosStore();
    expect(store.estado).toBe('ocioso');
    expect(store.riscos).toHaveLength(0);

    const carga = store.carregar();
    expect(store.estado).toBe('carregando');
    await carga;

    expect(store.estado).toBe('pronto');
    expect(store.riscos).toHaveLength(4);
    expect(store.categorias.length).toBeGreaterThan(0);
    expect(store.objetosContexto.length).toBeGreaterThan(0);
    expect(store.acoes[ID_001()].podeValidar).toBe(true);
  });

  it('falha na carga → estado "erro" com ErroRadar; "Tentar de novo" volta a "pronto"', async () => {
    const base = criarFonteDemonstracao('normal');
    fonteFalsa({
      carregarCarteira: vi
        .fn<() => Promise<Carteira>>()
        .mockRejectedValueOnce(new ErroRadar(MENSAGEM_REDE, 'rede'))
        .mockImplementation(() => base.carregarCarteira()),
    });
    const store = useRiscosStore();

    await store.carregar();
    expect(store.estado).toBe('erro');
    expect(store.erro).toBeInstanceOf(ErroRadar);
    expect(store.erro!.message).toBe(MENSAGEM_REDE);

    await store.tentarDeNovo();
    expect(store.estado).toBe('pronto');
    expect(store.erro).toBeNull();
    expect(store.riscos).toHaveLength(4);
  });

  it('descarta carga velha ao sair: carga lenta + limpar() antes de terminar → nada entra', async () => {
    const base = criarFonteDemonstracao('normal');
    const lenta = adiada<Carteira>();
    fonteFalsa({ carregarCarteira: () => lenta.promessa });
    const store = useRiscosStore();

    const carga = store.carregar();
    store.limpar(); // a pessoa saiu antes de a carteira chegar
    lenta.resolver(await base.carregarCarteira());
    await carga;

    expect(store.riscos).toHaveLength(0);
    expect(store.estado).toBe('ocioso');
  });

  it('carga velha também é ignorada quando uma carga mais nova começou depois', async () => {
    const base = criarFonteDemonstracao('normal');
    const lenta = adiada<Carteira>();
    const carregarCarteira = vi
      .fn<() => Promise<Carteira>>()
      .mockImplementationOnce(() => lenta.promessa)
      .mockImplementation(async () => ({ ...(await base.carregarCarteira()), riscos: [] }));
    fonteFalsa({ carregarCarteira });
    const store = useRiscosStore();

    const velha = store.carregar();
    await store.carregar(); // a nova (carteira vazia) termina primeiro
    lenta.resolver(await base.carregarCarteira());
    await velha;

    expect(store.riscos).toHaveLength(0); // a velha (4 riscos) foi descartada
    expect(store.estado).toBe('pronto');
  });

  it('limpar zera riscos, objetos, categorias e ações', async () => {
    fonteFalsa();
    const store = useRiscosStore();
    await store.carregar();
    store.termoBuscaGlobal = 'fraude';

    store.limpar();

    expect(store.riscos).toHaveLength(0);
    expect(store.objetosContexto).toHaveLength(0);
    expect(store.categorias).toHaveLength(0);
    expect(store.unidades).toHaveLength(0);
    expect(store.acoes).toEqual({});
    expect(store.estado).toBe('ocioso');
    expect(store.termoBuscaGlobal).toBe('');
  });

  it('submeterParaValidacaoCg chama fonte.enviar e DEPOIS relê o risco', async () => {
    const base = criarFonteDemonstracao('normal');
    const enviar = vi.fn((id: string) => base.enviar(id));
    const relerRisco = vi.fn((id: string) => base.relerRisco(id));
    fonteFalsa({ ...base, enviar, relerRisco });
    const store = useRiscosStore();
    await store.carregar();
    const devolvido = store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-001')!;
    // Leva o 001 para "devolvido" pela fonte, para poder enviá-lo de novo.
    await base.devolver(devolvido.id, 'Ajustar a evidência do controle.');
    await store.relerRiscos([devolvido.id]);
    relerRisco.mockClear();

    await store.submeterParaValidacaoCg(devolvido.id);

    expect(enviar).toHaveBeenCalledWith(devolvido.id);
    expect(relerRisco).toHaveBeenCalledWith(devolvido.id);
    expect(enviar.mock.invocationCallOrder[0]).toBeLessThan(relerRisco.mock.invocationCallOrder[0]);
    expect(store.obterRiscoPorId(devolvido.id)!.statusFluxo).toBe('em_validacao_cg');
  });

  it('filaValidacaoCg segue as `acoes`, não o statusFluxo', async () => {
    const base = criarFonteDemonstracao('normal');
    // A fonte diz: posso validar SÓ o RADAR-2026-003 (aprovado), e não o 001 (em validação).
    const acoesNoFluxo = async (ids: string[]): Promise<AcoesFluxo[]> => {
      const lista = await base.acoesNoFluxo(ids);
      const riscos = (await base.carregarCarteira()).riscos;
      return lista.map((a) => ({
        ...a,
        podeValidar: riscos.find((r) => r.id === a.riscoId)!.codigoRadar === 'RADAR-2026-003',
        podeHomologar: false,
        devolucaoCgov: riscos.find((r) => r.id === a.riscoId)!.codigoRadar === 'RADAR-2026-002',
      }));
    };
    fonteFalsa({ ...base, acoesNoFluxo });
    const store = useRiscosStore();
    await store.carregar();

    expect(store.filaValidacaoCg.map((r) => r.codigoRadar)).toEqual(['RADAR-2026-003']);
    expect(store.filaHomologacaoDiretoria).toHaveLength(0);
    expect(store.filaSemDecisor.map((r) => r.codigoRadar)).toEqual(['RADAR-2026-002']);
  });

  it('ação recusada mantém os dados e relança o ErroRadar', async () => {
    const recusa = new ErroRadar('Só é possível enviar risco em rascunho ou devolvido.', 'estado');
    fonteFalsa({ enviar: vi.fn().mockRejectedValue(recusa) });
    const store = useRiscosStore();
    await store.carregar();
    const antes = JSON.parse(JSON.stringify(store.riscos));

    await expect(store.submeterParaValidacaoCg(ID_001())).rejects.toBe(recusa);

    expect(JSON.parse(JSON.stringify(store.riscos))).toEqual(antes);
    expect(store.estado).toBe('pronto');
  });

  it('releitura que falha não desfaz a ação: resolve, deixa o aviso e o aviso some na próxima releitura', async () => {
    const base = criarFonteDemonstracao('normal');
    const relerRisco = vi
      .fn((id: string) => base.relerRisco(id))
      .mockRejectedValueOnce(new ErroRadar(MENSAGEM_REDE, 'rede'));
    const enviar = vi.fn().mockResolvedValue(undefined);
    fonteFalsa({ ...base, enviar, relerRisco });
    const store = useRiscosStore();
    await store.carregar();
    const id = ID_001();

    await expect(store.submeterParaValidacaoCg(id)).resolves.toBeUndefined();

    expect(enviar).toHaveBeenCalledWith(id);
    expect(store.avisoAtualizacao).toBeInstanceOf(ErroRadar);
    expect(store.avisoAtualizacao!.message).toBe(
      'A ação foi concluída, mas não foi possível atualizar a tela. Use Atualizar.'
    );
    expect(store.avisoAtualizacao!.tipo).toBe('rede');

    await store.relerRiscos([id]); // agora a releitura funciona
    expect(store.avisoAtualizacao).toBeNull();
  });

  it('alterarApetiteCategoriaDAR relê os riscos da categoria (e só eles)', async () => {
    const base = criarFonteDemonstracao('normal');
    const relerRisco = vi.fn((id: string) => base.relerRisco(id));
    fonteFalsa({ ...base, relerRisco });
    const store = useRiscosStore();
    await store.carregar();
    const socio = store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-003')!;
    expect(socio.statusCritico).toBe('nao'); // residual Médio, apetite Moderado (Operacional)

    await store.alterarApetiteCategoriaDAR(socio.categoriaId, 'baixo');

    // Operacional tem 2 riscos na semente (001 e 003): relê os dois, e nenhum de outra categoria.
    const daCategoria = store.riscos.filter((r) => r.categoriaId === socio.categoriaId).map((r) => r.id);
    expect(daCategoria).toContain(socio.id);
    expect(relerRisco.mock.calls.map(([id]) => id).sort()).toEqual([...daCategoria].sort());
    expect(store.categorias.find((c) => c.id === socio.categoriaId)!.apetiteDeclarado).toBe('baixo');
    expect(socio.statusCritico).toBe('sim'); // mesmo objeto, atualizado pela releitura
  });

  it('importar grava cada linha como preliminar e segue depois de uma recusa', async () => {
    const base = criarFonteDemonstracao('normal');
    let chamadas = 0;
    const salvarFicha = vi.fn(async (f: Parameters<FonteDados['salvarFicha']>[0]) => {
      chamadas++;
      if (chamadas === 1) throw new ErroRadar('Você não tem permissão para esta ação.', 'permissao');
      return base.salvarFicha(f);
    });
    fonteFalsa({ ...base, salvarFicha });
    const store = useRiscosStore();
    await store.carregar();
    const objetoId = store.objetosContexto[0].id;
    const linha = (n: number) =>
      `| RSC-0${n} | Concessão de Autorização | Devido a causa ${n}, poderá ocorrer o evento ${n}, ocasionando a consequência ${n} e impactando o objetivo. | Operacional | 3 | 4 | 18 | Extremo | Inexistente | Inexistente (1,0) | 18 | Extremo | pendente_dar | sim | Mitigar | |`;
    const md = [
      '| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
      linha(1),
      linha(2),
    ].join('\n');

    const res = await store.importarMarkdownDaSkill(md, objetoId);

    expect(res.total).toBe(2);
    expect(res.importados).toBe(1);
    expect(res.erros).toHaveLength(1);
    expect(res.erros[0]).toContain('Você não tem permissão');
    // O número é o da linha no texto colado (RSC-01 está na 3ª linha), não a posição entre as aceitas.
    expect(res.erros[0].startsWith('Linha 3 (RSC-01): ')).toBe(true);
    expect(salvarFicha.mock.calls.every(([f]) => f.preliminarCgov === true && f.objetoId === objetoId)).toBe(true);
    expect(store.riscos.filter((r) => r.statusFluxo === 'preliminar_cgov')).toHaveLength(1);
  });

  it('importar usa o apetite da DAR do RADAR, não o da col. 13 da tabela (LAC-13)', async () => {
    const base = criarFonteDemonstracao('normal');
    const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
    fonteFalsa({ ...base, salvarFicha });
    const store = useRiscosStore();
    await store.carregar();
    const operacional = store.categorias.find((c) => c.nome === 'Operacional')!;
    await store.alterarApetiteCategoriaDAR(operacional.id, 'baixo');
    // P=3, I=2 -> Quadro 7 = 8 (Médio). A tabela diz "moderado", a DAR diz "baixo": vale a DAR.
    const md = [
      '| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
      '| RSC-09 | Objeto | Devido a causa, poderá ocorrer evento, ocasionando consequência e impactando o objetivo. | Operacional | 3 | 2 | 8 | Médio | Inexistente | Inexistente (1,0) | 8 | Médio | moderado | não | Aceitar | |',
    ].join('\n');

    const res = await store.importarMarkdownDaSkill(md, store.objetosContexto[0].id);

    expect(res.importados).toBe(0);
    expect(res.erros[0]).toContain('fora do apetite da DAR');
    expect(salvarFicha).not.toHaveBeenCalled();
  });

  it('salvarOuAtualizarRisco com id que não está na memória recusa (não cria risco novo)', async () => {
    const base = criarFonteDemonstracao('normal');
    const salvarFicha = vi.fn((f: Parameters<FonteDados['salvarFicha']>[0]) => base.salvarFicha(f));
    fonteFalsa({ ...base, salvarFicha });
    const store = useRiscosStore();
    await store.carregar();

    const erro = await store.salvarOuAtualizarRisco({ id: 'risco-que-nao-existe', causas: 'x' }).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroRadar);
    expect(erro.tipo).toBe('nao_encontrado');
    expect(erro.message).toBe('Risco não encontrado.');
    expect(salvarFicha).not.toHaveBeenCalled();
    expect(store.riscos).toHaveLength(4);
  });

  it('relerRiscos que falha rejeita com ErroRadar (erro cru da fonte é traduzido)', async () => {
    const base = criarFonteDemonstracao('normal');
    fonteFalsa({ ...base, relerRisco: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    const store = useRiscosStore();
    await store.carregar();

    const erro = await store.relerRiscos([ID_001()]).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroRadar);
  });
});

describe('ligarCarteiraASessao (carga e limpeza pela sessão)', () => {
  /** Sessão e carteira falsas: só o que a ligação usa. */
  function montar() {
    const sessao = reactive({ situacao: 'ativo', usuarioAtual: { id: 'u1', papel: 'gestor' } });
    const carteira = { carregar: vi.fn(async () => {}), limpar: vi.fn() };
    const parar = ligarCarteiraASessao(sessao, carteira);
    return { sessao, carteira, parar };
  }

  it('sessão ativa carrega na hora (immediate)', () => {
    const { carteira, parar } = montar();
    expect(carteira.carregar).toHaveBeenCalledTimes(1);
    parar();
  });

  it('perfil relido IGUAL (objeto novo, mesmo id e papel) NÃO recarrega', async () => {
    const { sessao, carteira, parar } = montar();
    sessao.usuarioAtual = { id: 'u1', papel: 'gestor' }; // ex.: foco na aba
    await nextTick();
    sessao.usuarioAtual = { id: 'u1', papel: 'gestor' }; // ex.: token renovado
    await nextTick();
    expect(carteira.carregar).toHaveBeenCalledTimes(1);
    expect(carteira.limpar).not.toHaveBeenCalled();
    parar();
  });

  it('outra pessoa ou outro papel recarrega; sair da situação ativo limpa', async () => {
    const { sessao, carteira, parar } = montar();
    sessao.usuarioAtual = { id: 'u2', papel: 'gestor' };
    await nextTick();
    expect(carteira.carregar).toHaveBeenCalledTimes(2);
    sessao.usuarioAtual = { id: 'u2', papel: 'diretor' };
    await nextTick();
    expect(carteira.carregar).toHaveBeenCalledTimes(3);
    sessao.situacao = 'anonimo';
    await nextTick();
    expect(carteira.limpar).toHaveBeenCalledTimes(1);
    expect(carteira.carregar).toHaveBeenCalledTimes(3);
    parar();
  });

  describe('KRI compartilhado (LAC-03)', () => {
    it('krisDoObjeto lista cada KRI do objeto uma vez só (o compartilhado não se repete)', async () => {
      fonteFalsa();
      const store = useRiscosStore();
      await store.carregar();
      const ids = store.krisDoObjeto('obj-anexo-ii').map((k) => k.id);
      expect(ids).toContain('kri-anexo-ii-2'); // ligado aos riscos 001 e 004
      expect(new Set(ids).size).toBe(ids.length);
      expect(store.krisDoObjeto('objeto-que-nao-existe')).toEqual([]);
    });

    it('editar sem mexer nos KRIs: todos vão como apenasLigar (nenhum UPDATE à toa)', async () => {
      const f = fonteFalsa({ salvarFicha: vi.fn((x) => criarFonteDemonstracao('normal').salvarFicha(x)) });
      const store = useRiscosStore();
      await store.carregar();
      const id = store.riscos.find((r) => r.codigoRadar === 'RADAR-2026-004')!.id;
      await store.salvarOuAtualizarRisco({ id, causas: 'causa nova' });
      const kris = vi.mocked(f.salvarFicha).mock.calls[0][0].kris!;
      expect(kris.length).toBeGreaterThan(0);
      expect(kris.every((k) => k.id && k.apenasLigar === true)).toBe(true);
    });

    it('o formulário muda a definição do 1º KRI: só ele vai como edição; os demais, apenasLigar', async () => {
      // Só registra o pacote (o risco 001 está em validação e a fonte o recusaria).
      const f = fonteFalsa({ salvarFicha: vi.fn(async () => ({ id: 'x', codigoRadar: 'x' })) });
      const store = useRiscosStore();
      await store.carregar();
      const r = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
      expect(r.kris.length).toBeGreaterThan(1);
      const kris = r.kris.map((k, i) => (i === 0 ? { ...k, limiteAlerta: 'Abaixo de 42%' } : k));
      await store.salvarOuAtualizarRisco({ id: r.id, kris });
      const enviados = vi.mocked(f.salvarFicha).mock.calls[0][0].kris!;
      expect(enviados[0].apenasLigar).toBeUndefined();
      expect(enviados[0].limiteAlerta).toBe('Abaixo de 42%');
      expect(enviados.slice(1).every((k) => k.apenasLigar === true)).toBe(true);
    });

    // Revisão final: uma gravação pode mudar OUTROS riscos do mesmo KRI (alterar a
    // definição reabre os aprovados ligados; ligar/desligar muda o `riscoIds` de todos).
    it('salvar a ficha relê também os riscos que dividem KRI com ela', async () => {
      const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.coordenador_geral });
      const relerRisco = vi.fn((id: string) => base.relerRisco(id));
      const store = useRiscosStore();
      fonteFalsa({ relerRisco, salvarFicha: vi.fn(async () => ({ id: ID_001(), codigoRadar: 'RADAR-2026-001' })) });
      await store.carregar();
      const r1 = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
      const r4 = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-004')!;
      expect(r1.kris.some((k) => k.riscoIds.includes(r4.id))).toBe(true); // dividem o KRI
      // Desliga TODOS os KRIs do 001: o 004 perde um risco no `riscoIds` do KRI.
      await store.salvarOuAtualizarRisco({ id: r1.id, kris: [] });
      const relidos = relerRisco.mock.calls.map((c) => c[0]);
      expect(relidos).toContain(r1.id);
      expect(relidos).toContain(r4.id);
    });

    it('excluir um risco relê os riscos que dividiam KRI com ele', async () => {
      const base = criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO.coordenador_geral });
      const relerRisco = vi.fn((id: string) => base.relerRisco(id));
      const store = useRiscosStore();
      fonteFalsa({ relerRisco, excluirRisco: vi.fn(async () => {}) });
      await store.carregar();
      const r1 = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-001')!;
      const r4 = store.riscos.find((x) => x.codigoRadar === 'RADAR-2026-004')!;
      await store.excluirRisco(r4.id);
      const relidos = relerRisco.mock.calls.map((c) => c[0]);
      expect(relidos).toContain(r4.id);
      expect(relidos).toContain(r1.id);
    });
  });

  describe('alertas do KRI (LAC-03)', () => {
    it('carregar() traz os alertas; alertaAbertoDoKri acha o aberto e ignora o encerrado', async () => {
      fonteFalsa();
      const store = useRiscosStore();
      await store.carregar();
      expect(store.alertasKri.length).toBeGreaterThan(0);
      const aberto = store.alertasKri.find((a) => !a.encerradoEm)!;
      expect(store.alertaAbertoDoKri(aberto.kriId)?.id).toBe(aberto.id);
      const encerrado = store.alertasKri.find((a) => a.encerradoEm)!;
      expect(store.alertaAbertoDoKri(encerrado.kriId)).toBeUndefined();
      expect(store.alertaAbertoDoKri('kri-inexistente')).toBeUndefined();
    });

    it('limpar() esvazia os alertas', async () => {
      fonteFalsa();
      const store = useRiscosStore();
      await store.carregar();
      store.limpar();
      expect(store.alertasKri).toEqual([]);
    });

    it('registrar uma leitura em alerta atualiza os alertas da store', async () => {
      fonteFalsa();
      const store = useRiscosStore();
      await store.carregar();
      const antes = store.alertasKri.length;
      // kri-anexo-ii-2 ("menor que 80") não tem alerta na semente.
      expect(store.alertaAbertoDoKri('kri-anexo-ii-2')).toBeUndefined();
      await store.registrarMedicaoKri('risco-anexo-ii-01', 'kri-anexo-ii-2', {
        dataMedicao: '2026-12-01', valorApurado: '50', valorNumerico: 50,
      });
      expect(store.alertasKri.length).toBe(antes + 1);
      expect(store.alertaAbertoDoKri('kri-anexo-ii-2')).toBeDefined();
    });

    it('falha ao ler os alertas leva a carteira ao estado de erro (sem dados pela metade)', async () => {
      fonteFalsa({ listarAlertasKri: async () => { throw new ErroRadar(MENSAGEM_REDE, 'rede'); } });
      const store = useRiscosStore();
      await store.carregar();
      expect(store.estado).toBe('erro');
    });
  });
});
