/**
 * TESTES DO IMPORTADOR DE ATRIBUIÇÕES (Etapa B2, Tarefa 7)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * A lista `ICMBIO_atribuicoes` diz quem é titular e quem é substituto de cada
 * unidade. O importador (`scripts/sync-atribuicoes/`) lê esse CSV e PLANEJA o
 * que fazer: criar contas, mudar de unidade, ligar/desligar a "chave" de
 * titular. Aqui testamos só as partes puras (sem banco):
 *   1. a leitura (`lerAtribuicoes`): BOM, CRLF, quebra de linha entre aspas,
 *      e-mails com maiúsculas/espaços, avisos de linha ruim;
 *   2. o planejamento (`planejarCarga`): as 7 regras, na ordem da spec 8.8.
 *
 * A fixture `fixtures/sharepoint/atribuicoes.csv` é SINTÉTICA: pessoas
 * inventadas, e-mails `@radar.test`, matrículas fictícias (999000x).
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerTextoListaSharepoint } from '../../scripts/sync-estrutura/lerListaSharepoint';
import { lerAtribuicoes, type PessoaListada } from '../../scripts/sync-atribuicoes/lerAtribuicoes';
import {
  planejarCarga,
  planoVazio,
  type PerfilAtual,
  type UnidadeRef,
} from '../../scripts/sync-atribuicoes/planejar';

const CAMINHO = resolve(__dirname, 'fixtures/sharepoint/atribuicoes.csv');
const TEXTO = readFileSync(CAMINHO, 'utf8');

const DIRETORIA = 'Diretoria de Planejamento, Administração e Logística de Teste';
const INSTITUTO = 'Instituto de Teste';
const UC = 'ICMBio Serra Imaginária';

/** Unidades fictícias, coerentes com `estrutura.csv`. */
const UNIDADES: UnidadeRef[] = [
  { id: 'u-inst', icmbioId: '90.0000', nome: INSTITUTO, tipo: 'presidencia', ativa: true, paiId: null },
  { id: 'u-dir', icmbioId: '90.1000', nome: DIRETORIA, tipo: 'diretoria', ativa: true, paiId: 'u-inst' },
  { id: 'u-uc', icmbioId: '92.0001', nome: UC, tipo: 'nucleo-gestao-integrada', ativa: true, paiId: 'u-inst' },
];

const pessoa = (
  p: Partial<PessoaListada> & Pick<PessoaListada, 'email' | 'unidadeNome' | 'funcao'>,
): PessoaListada => ({ linha: 2, nome: 'Fulano Fictício', ...p });

const perfil = (p: Partial<PerfilAtual> & Pick<PerfilAtual, 'email' | 'unidadeId'>): PerfilAtual => ({
  id: 'p-' + p.email,
  nome: 'Fulano',
  papel: 'gestor',
  titular: false,
  ativo: true,
  ...p,
});

describe('lerAtribuicoes (leitura da lista)', () => {
  const linhas = lerTextoListaSharepoint(TEXTO);
  const { pessoas, avisos, unidadesVistas, unidadesTitularSemEmail } = lerAtribuicoes(linhas);

  it('lê o cabeçalho com nomes internos e com nomes exibidos do mesmo jeito', () => {
    // Troca só o cabeçalho: os nomes internos viram os nomes exibidos.
    const exibido = TEXTO.replace('"ourg_nome"', '"uorg_nome"').replace('"pessoa"', '"titular"');
    expect(exibido).not.toBe(TEXTO); // sanidade: a troca de fato mudou o cabeçalho
    const outro = lerAtribuicoes(lerTextoListaSharepoint(exibido));
    expect(outro).toEqual({ pessoas, avisos, unidadesVistas, unidadesTitularSemEmail });
  });

  it('cobre titulares e substitutos da linha completa, com e-mail normalizado', () => {
    const l2 = pessoas.filter((p) => p.linha === 2);
    expect(l2.map((p) => [p.funcao, p.email, p.nome])).toEqual([
      ['titular', 'ana.ficticia@radar.test', 'Ana Fictícia'],
      ['substituto', 'beto.ficticio@radar.test', 'Beto Fictício'],
    ]);
  });

  it('P-B2-1: unidades com titular sem e-mail válido (inválido, ou só substituto), sem repetir e sem linha vazia', () => {
    expect(unidadesTitularSemEmail).toEqual([DIRETORIA, INSTITUTO]);
  });

  it('linha vazia vira aviso e não gera pessoa', () => {
    expect(avisos.some((a) => a.tipo === 'linha_vazia' && a.linha === 3)).toBe(true);
  });

  it('substituto sem titular: só o substituto entra', () => {
    const l4 = pessoas.filter((p) => p.linha === 4);
    expect(l4.map((p) => p.funcao)).toEqual(['substituto']);
  });

  it('e-mail com maiúsculas e espaços é normalizado', () => {
    const l5 = pessoas.filter((p) => p.linha === 5);
    expect(l5.every((p) => p.email === 'davi.ficticio@radar.test')).toBe(true);
    expect(l5.map((p) => p.funcao)).toEqual(['titular', 'substituto']);
  });

  it('e-mail inválido vira aviso e a pessoa sai', () => {
    expect(avisos.some((a) => a.tipo === 'email_invalido' && a.linha === 7)).toBe(true);
    expect(pessoas.some((p) => p.linha === 7)).toBe(false);
  });

  it('nome entre aspas com quebra de linha vem inteiro', () => {
    const h = pessoas.find((p) => p.email === 'helena.ficticia@radar.test');
    expect(h?.nome.replace(/\s+/g, ' ')).toBe('Helena Fictícia');
  });

  it('nunca copia matrícula', () => {
    const texto = JSON.stringify({ pessoas, avisos, unidadesVistas });
    for (const m of ['9990001', '9990002', '9990003', '9990004', '9990005', '9990006', '9990007', '9990008']) {
      expect(texto).not.toContain(m);
    }
  });

  it('falta de coluna obrigatória lança erro com RADAR:', () => {
    expect(() => lerAtribuicoes([{ ourg_nome: 'X' }])).toThrow(/^RADAR: coluna obrigatória ausente/);
    expect(() => lerAtribuicoes([{ titular_email: 'a@b.c', substituto_email: 'a@b.c' }])).toThrow(/RADAR: coluna obrigatória ausente/);
  });

  it('pessoa com nome mas sem e-mail gera aviso sem_email', () => {
    const r = lerAtribuicoes([
      { ourg_nome: INSTITUTO, pessoa: 'Sem Email', titular_email: '', substituto_email: '' },
    ]);
    expect(r.pessoas).toEqual([]);
    expect(r.avisos.map((a) => a.tipo)).toContain('sem_email');
  });
});

describe('planejarCarga (as 7 regras)', () => {
  it('regra 1: unidade inexistente ou inativa gera aviso e a pessoa sai', () => {
    const unidades = UNIDADES.map((u) => (u.id === 'u-uc' ? { ...u, ativa: false } : u));
    const plano = planejarCarga(
      [
        pessoa({ email: 'a@radar.test', unidadeNome: 'Nenhuma', funcao: 'titular' }),
        pessoa({ email: 'b@radar.test', unidadeNome: UC, funcao: 'titular' }),
      ],
      unidades,
      [],
    );
    expect(plano.contasNovas).toEqual([]);
    expect(plano.avisos.map((a) => a.tipo).sort()).toEqual(['unidade_inativa', 'unidade_inexistente']);
  });

  it('regra 1: nome da unidade é comparado sem espaços nas pontas', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: `  ${INSTITUTO} `, funcao: 'titular' })],
      UNIDADES,
      [],
    );
    expect(plano.contasNovas).toHaveLength(1);
  });

  it('regra 1: tipo suspeito gera aviso, mas a pessoa continua', () => {
    const unidades: UnidadeRef[] = [
      { id: 'gr', icmbioId: '91.0000', nome: 'GR de Teste', tipo: 'gerencia-regional', ativa: true, paiId: null },
      { id: 'ct', icmbioId: '91.0001', nome: 'CT de Teste', tipo: 'coordenacao-geral', ativa: true, paiId: 'gr' },
    ];
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: 'CT de Teste', funcao: 'titular' })],
      unidades,
      [],
    );
    expect(plano.avisos.map((a) => a.tipo)).toContain('tipo_suspeito');
    expect(plano.contasNovas).toHaveLength(1);
  });

  it('regra 2: titular e substituto com o mesmo e-mail na mesma linha ficam só como titular', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'd@radar.test', unidadeNome: UC, funcao: 'titular', linha: 5 }),
        pessoa({ email: 'd@radar.test', unidadeNome: UC, funcao: 'substituto', linha: 5 }),
      ],
      UNIDADES,
      [],
    );
    expect(plano.contasNovas).toHaveLength(1);
    expect(plano.contasNovas[0].titular).toBe(true);
    expect(plano.avisos.filter((a) => a.tipo === 'varias_unidades')).toEqual([]);
  });

  it('regra 3: pessoa em várias unidades escolhe titular antes de substituto', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto', linha: 2 }),
        pessoa({ email: 'a@radar.test', unidadeNome: UC, funcao: 'titular', linha: 3 }),
      ],
      UNIDADES,
      [],
    );
    expect(plano.contasNovas).toHaveLength(1);
    expect(plano.contasNovas[0]).toMatchObject({ unidadeId: 'u-uc', titular: true });
    expect(plano.avisos.filter((a) => a.tipo === 'varias_unidades')).toHaveLength(1);
  });

  it('regra 3: entre dois titulares, vence o de maior alcance', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'a@radar.test', unidadeNome: UC, funcao: 'titular', linha: 2 }),
        pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular', linha: 3 }),
      ],
      UNIDADES,
      [],
    );
    expect(plano.contasNovas[0]).toMatchObject({ unidadeId: 'u-dir', papel: 'diretor' });
  });

  it('regra 3: com alcance igual, vence a unidade menos profunda e depois o menor icmbioId', () => {
    const unidades: UnidadeRef[] = [
      { id: 'raiz', icmbioId: '95.0000', nome: 'Raiz', tipo: 'presidencia', ativa: true, paiId: null },
      { id: 'a', icmbioId: '95.0009', nome: 'A', tipo: 'divisao', ativa: true, paiId: 'raiz' },
      { id: 'b', icmbioId: '95.0002', nome: 'B', tipo: 'divisao', ativa: true, paiId: 'a' },
      { id: 'c', icmbioId: '95.0001', nome: 'C', tipo: 'divisao', ativa: true, paiId: 'a' },
    ];
    // A (profundidade 1) vence B e C (profundidade 2).
    const p1 = planejarCarga(
      [
        pessoa({ email: 'x@radar.test', unidadeNome: 'B', funcao: 'titular' }),
        pessoa({ email: 'x@radar.test', unidadeNome: 'A', funcao: 'titular' }),
      ],
      unidades,
      [],
    );
    expect(p1.contasNovas[0].unidadeId).toBe('a');
    // B e C empatam em profundidade: vence o menor icmbioId (C).
    const p2 = planejarCarga(
      [
        pessoa({ email: 'x@radar.test', unidadeNome: 'B', funcao: 'titular' }),
        pessoa({ email: 'x@radar.test', unidadeNome: 'C', funcao: 'titular' }),
      ],
      unidades,
      [],
    );
    expect(p2.contasNovas[0].unidadeId).toBe('c');
  });

  it('regra 3: ciclo na árvore não trava a contagem de profundidade', () => {
    const unidades: UnidadeRef[] = [
      { id: 'a', icmbioId: '96.0001', nome: 'A', tipo: 'divisao', ativa: true, paiId: 'b' },
      { id: 'b', icmbioId: '96.0002', nome: 'B', tipo: 'divisao', ativa: true, paiId: 'a' },
    ];
    const plano = planejarCarga(
      [
        pessoa({ email: 'x@radar.test', unidadeNome: 'A', funcao: 'titular' }),
        pessoa({ email: 'x@radar.test', unidadeNome: 'B', funcao: 'titular' }),
      ],
      unidades,
      [],
    );
    expect(plano.contasNovas).toHaveLength(1);
  });

  it('regra 4: sem perfil, titular recebe o papel sugerido e substituto vira gestor', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' }),
        pessoa({ email: 'b@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' }),
      ],
      UNIDADES,
      [],
    );
    expect(plano.contasNovas).toEqual([
      { email: 'a@radar.test', nome: 'Fulano Fictício', unidadeId: 'u-dir', papel: 'diretor', titular: true },
      { email: 'b@radar.test', nome: 'Fulano Fictício', unidadeId: 'u-dir', papel: 'gestor', titular: false },
    ]);
    expect(plano.contagemPorPapel.diretor).toBe(1);
    expect(plano.contagemPorPapel.gestor).toBe(1);
  });

  it('regra 5: suspenso gera só aviso e nada muda', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [perfil({ email: 'a@radar.test', unidadeId: 'u-uc', ativo: false })],
    );
    expect(plano.avisos.map((a) => a.tipo)).toContain('suspenso_na_lista');
    expect(planoVazio(plano)).toBe(true);
  });

  it('regra 5: titular já cadastrado em outra unidade muda de unidade e liga a chave', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [perfil({ email: 'a@radar.test', unidadeId: 'u-uc' })],
    );
    expect(plano.mudancasUnidade).toEqual([
      { perfilId: 'p-a@radar.test', email: 'a@radar.test', deUnidadeId: 'u-uc', paraUnidadeId: 'u-dir', papel: 'diretor' },
    ]);
    expect(plano.ligarChave).toEqual([{ perfilId: 'p-a@radar.test', email: 'a@radar.test', unidadeId: 'u-dir' }]);
  });

  it('regra 5: titular na unidade com chave desligada liga a chave; papel diferente vira divergência', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [perfil({ email: 'a@radar.test', unidadeId: 'u-dir', papel: 'gestor' })],
    );
    expect(plano.ligarChave).toHaveLength(1);
    expect(plano.avisos.map((a) => a.tipo)).toContain('divergencia');
    expect(plano.mudancasUnidade).toEqual([]);
  });

  it('regra 5: substituto lotado em outra unidade gera divergência', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'b@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' })],
      UNIDADES,
      [perfil({ email: 'b@radar.test', unidadeId: 'u-uc' })],
    );
    expect(plano.avisos.map((a) => a.tipo)).toContain('divergencia');
    expect(planoVazio(plano)).toBe(true);
  });

  it('regra 5: substituto com a chave ligada fica em substitutosEmExercicio e fora de desligarChave', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'novo@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' }),
        pessoa({ email: 'b@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' }),
      ],
      UNIDADES,
      [perfil({ email: 'b@radar.test', unidadeId: 'u-dir', titular: true })],
    );
    expect(plano.substitutosEmExercicio).toEqual([{ email: 'b@radar.test', unidadeId: 'u-dir' }]);
    expect(plano.desligarChave).toEqual([]);
  });

  it('regra 6: troca de titular desliga a chave do antigo, sem apagar o perfil', () => {
    const antigo = perfil({ email: 'antigo@radar.test', unidadeId: 'u-dir', papel: 'diretor', titular: true });
    const plano = planejarCarga(
      [pessoa({ email: 'novo@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [antigo],
    );
    expect(plano.desligarChave).toEqual([{ perfilId: antigo.id, email: antigo.email, unidadeId: 'u-dir' }]);
    expect(plano.contasNovas.map((c) => c.email)).toEqual(['novo@radar.test']);
    // o antigo não aparece em mais nada
    const resto = JSON.stringify([plano.mudancasUnidade, plano.ligarChave, plano.substitutosEmExercicio]);
    expect(resto).not.toContain('antigo@radar.test');
  });

  it('regra 6: unidade que não está na lista não tem chave desligada', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [perfil({ email: 'o@radar.test', unidadeId: 'u-uc', titular: true })],
    );
    expect(plano.desligarChave).toEqual([]);
  });

  it('regra 7: unidades da lista sem titular são listadas pelo nome, sem repetir', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'b@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' }),
        pessoa({ email: 'c@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' }),
        pessoa({ email: 'a@radar.test', unidadeNome: INSTITUTO, funcao: 'titular' }),
      ],
      UNIDADES,
      [],
    );
    expect(plano.unidadesSemTitular).toEqual([DIRETORIA]);
    expect(plano.avisos.some((a) => a.tipo === 'sem_titular' && a.unidade === DIRETORIA)).toBe(true);
  });

  it('regra 6: substituto lotado e listado na unidade, também listado em unidade maior, mantém a chave', () => {
    const plano = planejarCarga(
      [
        pessoa({ email: 'novo@radar.test', unidadeNome: UC, funcao: 'titular' }),
        pessoa({ email: 'ps@radar.test', unidadeNome: UC, funcao: 'substituto', linha: 2 }),
        pessoa({ email: 'ps@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto', linha: 3 }),
      ],
      UNIDADES,
      [perfil({ email: 'ps@radar.test', unidadeId: 'u-uc', titular: true })],
    );
    expect(plano.desligarChave).toEqual([]);
    expect(plano.substitutosEmExercicio).toEqual([{ email: 'ps@radar.test', unidadeId: 'u-uc' }]);
  });

  it('regra 6: titular listado que mantém a chave não é reportado como substituto em exercício', () => {
    const plano = planejarCarga(
      [pessoa({ email: 'a@radar.test', unidadeNome: UC, funcao: 'titular' })],
      UNIDADES,
      [perfil({ email: 'a@radar.test', unidadeId: 'u-uc', titular: true })],
    );
    expect(plano.substitutosEmExercicio).toEqual([]);
    expect(plano.desligarChave).toEqual([]);
  });

  it('regra 7: unidade vista só na leitura (pessoas descartadas) aparece sem titular e não perde chave', () => {
    const lido = lerAtribuicoes([
      { ourg_nome: UC, pessoa: 'Sem Valor', titular_email: 'invalido', substituto_email: '' },
    ]);
    expect(lido.pessoas).toEqual([]);
    expect(lido.unidadesVistas).toEqual([UC]);
    const plano = planejarCarga(
      lido.pessoas,
      UNIDADES,
      [perfil({ email: 'o@radar.test', unidadeId: 'u-uc', titular: true })],
      lido.unidadesVistas,
    );
    expect(plano.desligarChave).toEqual([]);
    expect(plano.unidadesSemTitular).toEqual([]); // o perfil existente ainda tem a chave
    const semPerfil = planejarCarga(lido.pessoas, UNIDADES, [], lido.unidadesVistas);
    expect(semPerfil.unidadesSemTitular).toEqual([UC]);
  });

  // ---- Decisões de 2026-11-15 (P-B2-1 e P-B2-2) --------------------------
  it('P-B2-1: titular com e-mail inválido + substituto válido: ninguém perde a chave e sai o aviso', () => {
    const lido = lerAtribuicoes([
      { ourg_nome: DIRETORIA, pessoa: 'Titular X', titular_email: 'sem-arroba', substituto: 'Sub Y', substituto_email: 'sub@radar.test' },
    ]);
    expect(lido.unidadesTitularSemEmail).toEqual([DIRETORIA]);
    const antigo = perfil({ email: 'antigo@radar.test', unidadeId: 'u-dir', titular: true });
    const plano = planejarCarga(lido.pessoas, UNIDADES, [antigo], lido.unidadesVistas, lido.unidadesTitularSemEmail);
    expect(plano.desligarChave).toEqual([]);
    const aviso = plano.avisos.find((a) => a.tipo === 'titular_sem_email');
    expect(aviso?.unidade).toBe(DIRETORIA);
    expect(aviso?.detalhe).toBe('titular sem e-mail válido: chave atual mantida');
    expect(JSON.stringify(aviso)).not.toContain('sem-arroba');
    expect(JSON.stringify(aviso)).not.toContain('Titular X');
    // O substituto válido é processado normalmente (conta nova de gestor).
    expect(plano.contasNovas.map((c) => [c.email, c.papel, c.titular])).toEqual([['sub@radar.test', 'gestor', false]]);
    // A unidade continua valendo na regra 7: o antigo ainda tem a chave, então não está sem titular.
    expect(plano.unidadesSemTitular).toEqual([]);
  });

  it('P-B2-1: titular com e-mail vazio (com nome) tem o mesmo efeito; sem perfil com chave a unidade fica sem titular', () => {
    const lido = lerAtribuicoes([
      { ourg_nome: DIRETORIA, pessoa: 'Titular X', titular_email: '', substituto: 'Sub Y', substituto_email: 'sub@radar.test' },
    ]);
    expect(lido.unidadesTitularSemEmail).toEqual([DIRETORIA]);
    const antigo = perfil({ email: 'antigo@radar.test', unidadeId: 'u-dir', titular: true });
    const plano = planejarCarga(lido.pessoas, UNIDADES, [antigo], lido.unidadesVistas, lido.unidadesTitularSemEmail);
    expect(plano.desligarChave).toEqual([]);
    const semChave = planejarCarga(lido.pessoas, UNIDADES, [], lido.unidadesVistas, lido.unidadesTitularSemEmail);
    expect(semChave.unidadesSemTitular).toEqual([DIRETORIA]);
  });

  it('P-B2-1: linha totalmente vazia ou só com cargo vago não conta; titular válido também não', () => {
    const lido = lerAtribuicoes([
      { ourg_nome: '', pessoa: '', titular_email: '', substituto_email: '' },
      { ourg_nome: UC, pessoa: '', titular_email: '', substituto_email: '' },
      { ourg_nome: INSTITUTO, pessoa: 'Ok', titular_email: 'ok@radar.test', substituto_email: '' },
    ]);
    expect(lido.unidadesTitularSemEmail).toEqual([]);
  });

  it('P-B2-1: o planejador sem a lista nova mantém o comportamento antigo (a chave é desligada)', () => {
    const antigo = perfil({ email: 'antigo@radar.test', unidadeId: 'u-dir', titular: true });
    const plano = planejarCarga(
      [pessoa({ email: 'sub@radar.test', unidadeNome: DIRETORIA, funcao: 'substituto' })],
      UNIDADES,
      [antigo],
    );
    expect(plano.desligarChave.map((d) => d.email)).toEqual(['antigo@radar.test']);
  });

  it('P-B2-2: suspenso com a chave que não está na linha da unidade perde a chave', () => {
    const suspenso = perfil({ email: 'susp@radar.test', unidadeId: 'u-dir', titular: true, ativo: false });
    const plano = planejarCarga(
      [pessoa({ email: 'novo@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [suspenso],
    );
    expect(plano.desligarChave.map((d) => d.email)).toEqual(['susp@radar.test']);
  });

  it('P-B2-2: suspenso que aparece na lista segue a B2-8 (só aviso, a chave fica)', () => {
    const suspenso = perfil({ email: 'susp@radar.test', unidadeId: 'u-dir', titular: true, ativo: false });
    const plano = planejarCarga(
      [pessoa({ email: 'susp@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })],
      UNIDADES,
      [suspenso],
    );
    expect(plano.desligarChave).toEqual([]);
    expect(plano.avisos.map((a) => a.tipo)).toContain('suspenso_na_lista');
  });

  it('P-B2-2: depois de desligar a chave do suspenso, planejar de novo não deixa nada a gravar', () => {
    const pessoas = [pessoa({ email: 'novo@radar.test', unidadeNome: DIRETORIA, funcao: 'titular' })];
    const suspenso = perfil({ email: 'susp@radar.test', unidadeId: 'u-dir', titular: true, ativo: false });
    const plano1 = planejarCarga(pessoas, UNIDADES, [suspenso]);
    const estado = [
      { ...suspenso, titular: false },
      perfil({ email: 'novo@radar.test', unidadeId: 'u-dir', papel: plano1.contasNovas[0].papel, titular: true }),
    ];
    expect(planoVazio(planejarCarga(pessoas, UNIDADES, estado))).toBe(true);
  });

  it('idempotência: aplicar o plano e planejar de novo não deixa nada a gravar', () => {
    const pessoas = lerAtribuicoes(lerTextoListaSharepoint(TEXTO)).pessoas;
    const antigo = perfil({ email: 'antigo@radar.test', unidadeId: 'u-inst', papel: 'presidencia', titular: true });
    const movel = perfil({ email: 'eva.ficticia@radar.test', unidadeId: 'u-uc' });
    const plano1 = planejarCarga(pessoas, UNIDADES, [antigo, movel]);
    expect(planoVazio(plano1)).toBe(false);

    // Estado simulado depois de gravar o plano.
    let estado: PerfilAtual[] = [antigo, movel];
    for (const c of plano1.contasNovas) {
      estado.push(perfil({ email: c.email, nome: c.nome, unidadeId: c.unidadeId, papel: c.papel, titular: c.titular }));
    }
    estado = estado.map((p) => {
      let q = { ...p };
      const m = plano1.mudancasUnidade.find((x) => x.perfilId === p.id);
      if (m) q = { ...q, unidadeId: m.paraUnidadeId, papel: m.papel };
      if (plano1.ligarChave.some((x) => x.perfilId === p.id)) q.titular = true;
      if (plano1.desligarChave.some((x) => x.perfilId === p.id)) q.titular = false;
      return q;
    });

    const plano2 = planejarCarga(pessoas, UNIDADES, estado);
    expect(planoVazio(plano2)).toBe(true);
  });
});

// ===========================================================================
// TAREFA 8: relatório de texto e opções do comando (partes puras, sem banco)
// ===========================================================================
import { formatarRelatorioAtribuicoes } from '../../scripts/sync-atribuicoes/relatorio';
import { lerOpcoes, validarOpcoes } from '../../scripts/sync-atribuicoes/index';

describe('formatarRelatorioAtribuicoes (relatório do importador)', () => {
  // Plano feito a partir da fixture: cobre contas novas, avisos e contagem.
  const { pessoas, avisos, unidadesVistas } = lerAtribuicoes(lerTextoListaSharepoint(TEXTO));
  const plano = planejarCarga(pessoas, UNIDADES, [], unidadesVistas);
  plano.avisos.unshift(...avisos);
  // Preenche as seções que a fixture sozinha não gera.
  plano.mudancasUnidade.push({ perfilId: 'x', email: 'mudou@radar.test', deUnidadeId: 'u-uc', paraUnidadeId: 'u-dir', papel: 'diretor' });
  plano.ligarChave.push({ perfilId: 'x', email: 'liga@radar.test', unidadeId: 'u-dir' });
  plano.desligarChave.push({ perfilId: 'y', email: 'desliga@radar.test', unidadeId: 'u-inst' });
  plano.substitutosEmExercicio.push({ email: 'exerce@radar.test', unidadeId: 'u-uc' });
  const texto = formatarRelatorioAtribuicoes(plano, 50, UNIDADES);

  it('traz todas as seções', () => {
    for (const secao of [
      'Contas novas', 'Mudaram de unidade', 'Ganham a chave de titular', 'Perdem a chave de titular',
      'Substitutos em exercício (preservados)', 'Unidades sem titular', 'Pessoas em várias unidades',
      'Linhas ignoradas', 'Contagem por perfil',
    ]) expect(texto).toContain(secao);
  });

  it('mostra unidades pelo nome e pessoas só pelo e-mail, nunca pelo nome', () => {
    expect(texto).toContain('ana.ficticia@radar.test');
    expect(texto).toContain(INSTITUTO);
    for (const p of pessoas) expect(texto).not.toContain(p.nome);
    expect(texto).not.toContain('u-dir'); // ids internos não aparecem
  });

  it('P-B2-1: mostra a seção do titular sem e-mail válido só com o nome da unidade', () => {
    const plano2 = planejarCarga([], UNIDADES, [], [], [DIRETORIA]);
    const t = formatarRelatorioAtribuicoes(plano2, 50, UNIDADES);
    expect(t).toContain('Titular sem e-mail válido (chave atual mantida) (1)');
    expect(t).toContain(DIRETORIA);
    expect(t).not.toContain('Outros avisos');
  });

  it('termina com o aviso sobre a trilha de auditoria', () => {
    expect(texto.trimEnd().endsWith('As gravações do importador aparecem na trilha de auditoria sem autor (usuario_id nulo).')).toBe(true);
  });

  it('as seções de MUDANÇA saem completas mesmo acima do limite (a CGOV vê tudo antes do "Aplicar?")', () => {
    const grande = {
      ...plano,
      contasNovas: Array.from({ length: 7 }, (_, i) => ({ email: `n${i}@radar.test`, nome: 'N', unidadeId: 'u-uc', papel: 'gestor' as const, titular: false })),
      ligarChave: Array.from({ length: 7 }, (_, i) => ({ perfilId: `l${i}`, email: `l${i}@radar.test`, unidadeId: 'u-dir' })),
      desligarChave: Array.from({ length: 7 }, (_, i) => ({ perfilId: `d${i}`, email: `d${i}@radar.test`, unidadeId: 'u-inst' })),
      mudancasUnidade: Array.from({ length: 7 }, (_, i) => ({ perfilId: `m${i}`, email: `m${i}@radar.test`, deUnidadeId: 'u-uc', paraUnidadeId: 'u-dir', papel: 'diretor' as const })),
      unidadesSemTitular: Array.from({ length: 7 }, (_, i) => `Unidade sem titular ${i}`),
    };
    const t = formatarRelatorioAtribuicoes(grande, 3, UNIDADES);
    for (const p of ['n', 'l', 'd', 'm']) expect(t).toContain(`${p}6@radar.test`);
    expect(t).toContain('Unidade sem titular 6');
    expect(t).not.toContain('e mais');
  });

  it('avisos e linhas ignoradas são cortados no limite, e --completo (completo=true) mostra tudo', () => {
    const avisosMuitos = Array.from({ length: 7 }, (_, i) => ({ tipo: 'sem_email' as const, detalhe: `linha ignorada ${i}` }));
    const grande = { ...plano, avisos: avisosMuitos };
    const cortado = formatarRelatorioAtribuicoes(grande, 3, UNIDADES);
    expect(cortado).toContain('linha ignorada 0');
    expect(cortado).not.toContain('linha ignorada 6');
    expect(cortado).toContain('e mais 4');
    const tudo = formatarRelatorioAtribuicoes(grande, 3, UNIDADES, true);
    expect(tudo).toContain('linha ignorada 6');
    expect(tudo).not.toContain('e mais 4');
  });
});

describe('lerOpcoes (comando sync:atribuicoes)', () => {
  it('interpreta as opções', () => {
    expect(lerOpcoes(['--arquivo', 'a.csv', '--so-relatorio', '--sim', '--permitir-remoto'])).toEqual({
      arquivo: 'a.csv', soRelatorio: true, sim: true, permitirRemoto: true, completo: false,
    });
    expect(lerOpcoes(['--completo']).completo).toBe(true);
    expect(lerOpcoes([])).toEqual({ arquivo: undefined, soRelatorio: false, sim: false, permitirRemoto: false, completo: false });
  });

  it('sem --arquivo, recusa com a mensagem do RADAR', () => {
    expect(() => validarOpcoes(lerOpcoes(['--sim']))).toThrow('RADAR: informe o arquivo com --arquivo <caminho>.');
    expect(() => validarOpcoes(lerOpcoes(['--arquivo']))).toThrow('RADAR: informe o arquivo com --arquivo <caminho>.');
    expect(validarOpcoes(lerOpcoes(['--arquivo', 'a.csv'])).arquivo).toBe('a.csv');
  });
});

// ===========================================================================
// CORREÇÃO DA REVISÃO DA TAREFA 8: paginação e contas órfãs (cliente falso)
// ===========================================================================
import { aplicarPlano, carregarEstado } from '../../scripts/sync-atribuicoes/aplicar';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanoCarga } from '../../scripts/sync-atribuicoes/planejar';

/** Cliente falso: registra as chamadas e devolve o que cada teste configurar. */
function clienteFalso(cfg: {
  tabelas?: Record<string, Record<string, unknown>[]>;
  createUser?: (a: { email: string }) => unknown;
  deleteUser?: () => unknown;
  listUsers?: (a: { page: number }) => unknown;
  insertErro?: string;
  perfilExistente?: boolean;
}) {
  const log: string[] = [];
  const faixas: [string, number, number][] = [];
  const cliente = {
    from(tabela: string) {
      let faixa: [number, number] = [0, 9999];
      const b: any = {
        select: () => b,
        order: () => b,
        range: (i: number, f: number) => { faixa = [i, f]; faixas.push([tabela, i, f]); return b; },
        update: (v: any) => { log.push(`update ${JSON.stringify(v)}`); return b; },
        eq: () => b,
        maybeSingle: async () => ({ data: cfg.perfilExistente ? { id: 'x' } : null, error: null }),
        insert: async (v: any) => { log.push(`insert ${v.email}`); return { error: cfg.insertErro ? { message: cfg.insertErro } : null }; },
        then: (res: any) => res(
          faixa && cfg.tabelas?.[tabela]
            ? { data: cfg.tabelas[tabela].slice(faixa[0], faixa[1] + 1), error: null }
            : { data: null, error: null },
        ),
      };
      return b;
    },
    auth: { admin: {
      createUser: async (a: any) => { log.push(`createUser ${a.email}`); return cfg.createUser ? cfg.createUser(a) : { data: { user: { id: 'novo-id' } }, error: null }; },
      deleteUser: async (id: string) => { log.push(`deleteUser ${id}`); return cfg.deleteUser ? cfg.deleteUser() : { error: null }; },
      listUsers: async (a: any) => (cfg.listUsers ? cfg.listUsers(a) : { data: { users: [] }, error: null }),
    } },
  } as unknown as SupabaseClient;
  return { cliente, log, faixas };
}

const planoCom = (p: Partial<PlanoCarga>): PlanoCarga => ({
  contasNovas: [], mudancasUnidade: [], ligarChave: [], desligarChave: [],
  substitutosEmExercicio: [], unidadesSemTitular: [], avisos: [],
  contagemPorPapel: {} as PlanoCarga['contagemPorPapel'], ...p,
});
const contaNova = { email: 'nova@radar.test', nome: 'N', unidadeId: 'u-dir', papel: 'gestor' as const, titular: false };

describe('carregarEstado (paginação)', () => {
  it('lê todas as páginas das duas tabelas, com a mesma ordem estável', async () => {
    const unidades = Array.from({ length: 505 }, (_, i) => ({ id: `u${i}`, icmbio_id: null, nome: `U${i}`, tipo: 'x', ativa: true, unidade_pai_id: null }));
    const perfis = Array.from({ length: 1005 }, (_, i) => ({ id: `p${i}`, email: `p${i}@radar.test`, nome_completo: 'N', unidade_id: 'u0', papel_governanca: 'gestor', ativo: true, titular_chefia: false }));
    const { cliente, faixas } = clienteFalso({ tabelas: { unidades, perfis_usuarios: perfis } });
    const estado = await carregarEstado(cliente);
    expect(estado.unidades).toHaveLength(505);
    expect(estado.perfis).toHaveLength(1005);
    expect(estado.perfis[1004].id).toBe('p1004');
    expect(faixas.filter((f) => f[0] === 'perfis_usuarios')).toHaveLength(3); // 500 + 500 + 5
  });
});

describe('aplicarPlano (gravação)', () => {
  it('grava na ordem: desligar, mudar unidade, ligar, contas novas', async () => {
    const { cliente, log } = clienteFalso({});
    const r = await aplicarPlano(cliente, planoCom({
      desligarChave: [{ perfilId: 'a', email: 'a@radar.test', unidadeId: 'u-inst' }],
      mudancasUnidade: [{ perfilId: 'b', email: 'b@radar.test', deUnidadeId: 'u-uc', paraUnidadeId: 'u-dir', papel: 'diretor' }],
      ligarChave: [{ perfilId: 'b', email: 'b@radar.test', unidadeId: 'u-dir' }],
      contasNovas: [contaNova],
    }));
    expect(log[0]).toContain('"titular_chefia":false');
    expect(log[1]).toContain('unidade_id');
    expect(log[2]).toContain('"titular_chefia":true');
    expect(log.slice(3)).toEqual(['createUser nova@radar.test', 'insert nova@radar.test']);
    expect(r).toEqual({ contasCriadas: 1, perfisCriados: 0, perfisAlterados: 3 });
  });

  it('falha no perfil: apaga o login criado e para com a mensagem do RADAR', async () => {
    const { cliente, log } = clienteFalso({ insertErro: 'quebrou' });
    await expect(aplicarPlano(cliente, planoCom({ contasNovas: [contaNova] }))).rejects.toThrow(/RADAR: parei em nova@radar.test; já gravado: 0 contas criadas/);
    expect(log).toContain('deleteUser novo-id');
  });

  it('falha ao apagar o login: a mensagem avisa da conta órfã', async () => {
    const { cliente } = clienteFalso({ insertErro: 'quebrou', deleteUser: () => ({ error: { message: 'sem rede' } }) });
    await expect(aplicarPlano(cliente, planoCom({ contasNovas: [contaNova] }))).rejects.toThrow(/a conta de login nova@radar.test ficou sem perfil/);
  });

  it('e-mail já cadastrado: reaproveita o login e cria só o perfil', async () => {
    const { cliente, log } = clienteFalso({
      createUser: () => ({ data: { user: null }, error: { code: 'email_exists', status: 422, message: 'already registered' } }),
      listUsers: () => ({ data: { users: [{ id: 'velho-id', email: 'NOVA@radar.test' }] }, error: null }),
    });
    const r = await aplicarPlano(cliente, planoCom({ contasNovas: [contaNova] }));
    expect(log).toEqual(['createUser nova@radar.test', 'insert nova@radar.test']);
    expect(r).toEqual({ contasCriadas: 0, perfisCriados: 1, perfisAlterados: 0 });
  });

  it('e-mail já cadastrado e já com perfil: para sem apagar nada', async () => {
    const { cliente, log } = clienteFalso({
      createUser: () => ({ data: { user: null }, error: { code: 'email_exists', status: 422, message: 'already registered' } }),
      listUsers: () => ({ data: { users: [{ id: 'velho-id', email: 'nova@radar.test' }] }, error: null }),
      perfilExistente: true,
    });
    await expect(aplicarPlano(cliente, planoCom({ contasNovas: [contaNova] }))).rejects.toThrow(/já tem perfil/);
    expect(log.some((l) => l.startsWith('deleteUser'))).toBe(false);
  });
});
