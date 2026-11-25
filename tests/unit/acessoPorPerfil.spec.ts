import { describe, it, expect } from 'vitest';
import { PAPEIS, ROTAS_SO_CGOV, ROTULOS_PAPEL, capacidades, podeAbrirRota } from '../../src/utils/acessoPorPerfil';

const TELAS_ABERTAS = [
  'painel-cgov',
  'dar-apetite',
  'riscos-lista',
  'novo-risco',
  'ficha-bowtie-detalhe',
  'catalogo-objetos',
  'monitoramento-kris',
  'comunicacoes',
  'validacao-um-clique',
  'trilha-auditoria',
  'sobre-radar',
];

describe('acessoPorPerfil — tabela única de acesso (spec B2, seção 8.4)', () => {
  it('as 10 chaves batem com o CHECK do banco', () => {
    expect([...PAPEIS]).toEqual([
      'gestor',
      'coordenador_territorial',
      'gerente_regional',
      'coordenador_geral',
      'diretor',
      'presidencia',
      'auditoria',
      'cgov',
      'cgge',
      'gabin',
    ]);
  });

  it('todo perfil tem rótulo e linha', () => {
    for (const p of PAPEIS) {
      expect(ROTULOS_PAPEL[p].rotulo.length).toBeGreaterThan(0);
      expect(ROTULOS_PAPEL[p].linha.length).toBeGreaterThan(0);
    }
  });

  it('Importar e Usuários são só da CGOV (matriz, seção 7)', () => {
    expect([...ROTAS_SO_CGOV]).toEqual(['importar-skill', 'usuarios-perfis']);
    for (const p of PAPEIS) {
      for (const rota of ['importar-skill', 'usuarios-perfis']) {
        expect(podeAbrirRota(p, rota)).toBe(p === 'cgov');
      }
    }
  });

  it('as demais telas abrem para os 10 perfis', () => {
    for (const p of PAPEIS) {
      for (const rota of TELAS_ABERTAS) expect(podeAbrirRota(p, rota)).toBe(true);
    }
  });

  it('quem valida e homologa segue a spec B1 7.1', () => {
    const valida = PAPEIS.filter((p) => capacidades(p).podeValidar);
    const homologa = PAPEIS.filter((p) => capacidades(p).podeHomologar);
    expect(valida).toEqual(['coordenador_territorial', 'gerente_regional', 'coordenador_geral', 'diretor', 'presidencia']);
    expect(homologa).toEqual(['gerente_regional', 'diretor', 'presidencia']);
    expect(capacidades('cgov').podeValidar).toBe(false);
    expect(capacidades('cgov').podeHomologar).toBe(false);
  });

  it('DAR, catálogo, importação e usuários só na CGOV', () => {
    for (const p of PAPEIS) {
      const c = capacidades(p);
      const ehCgov = p === 'cgov';
      expect(c.editaDar).toBe(ehCgov);
      expect(c.editaCatalogoObjetos).toBe(ehCgov);
      expect(c.importa).toBe(ehCgov);
      expect(c.gerenciaUsuarios).toBe(ehCgov);
    }
  });

  it('Comunicações à CGOV (LAC-04): todos enviam menos a AUDIT; só a CGOV registra a ciência', () => {
    for (const p of PAPEIS) {
      expect(capacidades(p).enviaComunicacao).toBe(p !== 'auditoria');
      expect(capacidades(p).registraCienciaComunicacao).toBe(p === 'cgov');
    }
  });

  it('AUDIT é somente leitura fora da unidade', () => {
    for (const p of PAPEIS) {
      expect(capacidades(p).somenteLeituraForaDaUnidade).toBe(p === 'auditoria');
    }
  });
});
