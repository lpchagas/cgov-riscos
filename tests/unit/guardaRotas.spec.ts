/**
 * ============================================================================
 * TESTES DA GUARDA DAS ROTAS (`src/router/guarda.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A decisão da guarda é uma função "pura": recebe os fatos (modo, situação,
 * perfil, rota) e devolve "seguir" ou "ir para outro lugar". Sem tela, sem
 * banco: por isso é fácil testar todos os caminhos aqui.
 */
import { describe, expect, it } from 'vitest';
import { AVISO_SO_CGOV, decidirNavegacao, type ContextoGuarda } from '../../src/router/guarda';

const base: ContextoGuarda = {
  modo: 'real',
  situacao: 'ativo',
  papel: 'cgov',
  nomeRota: 'riscos-lista',
  publica: false,
  caminhoCompleto: '/riscos',
};
const com = (parte: Partial<ContextoGuarda>): ContextoGuarda => ({ ...base, ...parte });

describe('decidirNavegacao', () => {
  it('modo real e anônimo em rota protegida: vai a /entrar guardando a volta (com a query)', () => {
    const r = decidirNavegacao(com({ situacao: 'anonimo', papel: null, caminhoCompleto: '/riscos?status=x' }));
    expect(r).toEqual({ tipo: 'ir', para: { name: 'entrar', query: { volta: '/riscos?status=x' } } });
  });

  it.each(['carregando', 'anonimo', 'sem_perfil', 'inativo', 'ativo', 'erro'] as const)(
    'rota pública segue em qualquer situação (%s)',
    (situacao) => {
      const r = decidirNavegacao(com({ situacao, publica: true, nomeRota: 'entrar-retorno', papel: null }));
      expect(r).toEqual({ tipo: 'seguir' });
    },
  );

  it.each(['sem_perfil', 'inativo'] as const)('%s em rota protegida vai a /acesso-nao-liberado', (situacao) => {
    expect(decidirNavegacao(com({ situacao, papel: null }))).toEqual({
      tipo: 'ir',
      para: { name: 'acesso-nao-liberado' },
    });
  });

  it('ativo e logado abrindo /entrar vai ao Painel', () => {
    const r = decidirNavegacao(com({ publica: true, nomeRota: 'entrar', caminhoCompleto: '/entrar' }));
    expect(r).toEqual({ tipo: 'ir', para: { name: 'painel-cgov' } });
  });

  it('ativo + gestor em importar-skill: Painel com o aviso "exclusiva da CGOV"', () => {
    const r = decidirNavegacao(com({ papel: 'gestor', nomeRota: 'importar-skill', caminhoCompleto: '/importar' }));
    expect(r).toEqual({ tipo: 'ir', para: { name: 'painel-cgov' }, aviso: AVISO_SO_CGOV });
    expect(AVISO_SO_CGOV).toBe('Esta tela é exclusiva da CGOV.');
  });

  it('ativo + cgov em importar-skill: segue', () => {
    expect(decidirNavegacao(com({ nomeRota: 'importar-skill' }))).toEqual({ tipo: 'seguir' });
  });

  it('demonstração + perfil simulado gestor em usuarios-perfis: Painel com aviso', () => {
    const r = decidirNavegacao(
      com({ modo: 'demonstracao', situacao: 'ativo', papel: 'gestor', nomeRota: 'usuarios-perfis', caminhoCompleto: '/usuarios' }),
    );
    expect(r).toEqual({ tipo: 'ir', para: { name: 'painel-cgov' }, aviso: AVISO_SO_CGOV });
  });

  it('demonstração em acesso-nao-liberado: segue (a varredura precisa abrir)', () => {
    const r = decidirNavegacao(
      com({ modo: 'demonstracao', publica: true, nomeRota: 'acesso-nao-liberado', caminhoCompleto: '/acesso-nao-liberado' }),
    );
    expect(r).toEqual({ tipo: 'seguir' });
  });

  it('demonstração em /entrar: segue (não redireciona ao Painel)', () => {
    const r = decidirNavegacao(com({ modo: 'demonstracao', publica: true, nomeRota: 'entrar', caminhoCompleto: '/entrar' }));
    expect(r).toEqual({ tipo: 'seguir' });
  });

  it.each(['gestor', 'auditoria', 'cgov'] as const)('%s abre /comunicacoes (LAC-04: tela aberta aos perfis; o banco filtra)', (papel) => {
    const r = decidirNavegacao(com({ papel, nomeRota: 'comunicacoes', caminhoCompleto: '/comunicacoes?alerta=a1' }));
    expect(r).toEqual({ tipo: 'seguir' });
  });

  it('anônimo em /comunicacoes?alerta=... vai a /entrar guardando o alerta na volta', () => {
    const r = decidirNavegacao(com({ situacao: 'anonimo', papel: null, nomeRota: 'comunicacoes', caminhoCompleto: '/comunicacoes?alerta=a1' }));
    expect(r).toEqual({ tipo: 'ir', para: { name: 'entrar', query: { volta: '/comunicacoes?alerta=a1' } } });
  });

  it("situação 'erro' segue (a tela de erro é mostrada pelo shell)", () => {
    expect(decidirNavegacao(com({ situacao: 'erro', papel: null }))).toEqual({ tipo: 'seguir' });
  });
});
