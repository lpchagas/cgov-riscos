/**
 * TESTES DAS REGRAS DA CÓPIA CIFRADA — scripts/copia/regras.ts
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * As regras da cópia de segurança são funções "puras" (não leem disco, banco
 * nem relógio): recebem valores e devolvem valores. Por isso dá para testá-las
 * aqui, sem banco e sem o programa `age` instalado.
 *
 * O que se confere:
 *   - o nome do arquivo usa a data de Brasília (radar-AAAA-MM-DD.tar.age);
 *   - a rotação guarda 14 diárias + a mais nova de cada semana (até 60 dias)
 *     e nunca apaga arquivo que não seja cópia (ex.: notas.txt);
 *   - a senha de uma conexão nunca aparece em mensagem de erro;
 *   - o cálculo de "há quantas horas foi a última cópia".
 * ============================================================================
 */
import { describe, expect, it } from 'vitest';
import {
  bancoEstaVazio,
  dataDaCopia,
  escolherCopiasParaApagar,
  horasDesdeUltimaCopia,
  lerConfig,
  linhaDeRegistro,
  mascararConexao,
  nomeDaCopia,
  permissaoESegura,
  variaveisDeConexao,
} from '../../scripts/copia/regras';

/** Gera os nomes das cópias diárias entre duas datas (inclusive). */
function copiasDiarias(inicio: string, fim: string): string[] {
  const nomes: string[] = [];
  const d = new Date(`${inicio}T12:00:00-03:00`);
  const ultimo = new Date(`${fim}T12:00:00-03:00`);
  while (d <= ultimo) {
    nomes.push(nomeDaCopia(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return nomes;
}

const HOJE = new Date('2026-11-17T15:00:00-03:00');

describe('nomeDaCopia / dataDaCopia', () => {
  it('usa a data de Brasília no nome', () => {
    expect(nomeDaCopia(new Date('2026-11-17T15:00:00-03:00'))).toBe('radar-2026-11-17.tar.age');
  });
  it('às 23h de Brasília ainda é o mesmo dia (em UTC já seria o dia seguinte)', () => {
    expect(nomeDaCopia(new Date('2026-11-17T23:30:00-03:00'))).toBe('radar-2026-11-17.tar.age');
  });
  it('lê a data de volta do nome (meia-noite de Brasília)', () => {
    expect(dataDaCopia('radar-2026-11-17.tar.age')?.toISOString()).toBe('2026-11-17T03:00:00.000Z');
  });
  it('devolve null para nomes fora do padrão ou datas impossíveis', () => {
    expect(dataDaCopia('notas.txt')).toBeNull();
    expect(dataDaCopia('radar-2026-02-30.tar.age')).toBeNull();
    expect(dataDaCopia('radar-2026-11-17.tar')).toBeNull();
  });
});

describe('escolherCopiasParaApagar', () => {
  it('30 diárias: ficam as 14 mais recentes + a mais nova de cada semana ISO; notas.txt nunca é apagado', () => {
    const nomes = [...copiasDiarias('2026-10-18', '2026-11-16'), 'notas.txt', 'registro.log'];
    const apagar = escolherCopiasParaApagar(nomes, HOJE);

    // As 14 mais recentes (03/11 a 16/11) ficam.
    for (const n of copiasDiarias('2026-11-03', '2026-11-16')) expect(apagar).not.toContain(n);
    // Das outras, fica só a mais nova de cada semana ISO:
    //   W42 → 18/10 (domingo); W43 → 25/10; W44 → 01/11; W45 → 02/11.
    const ficam = ['2026-10-18', '2026-10-25', '2026-11-01', '2026-11-02'].map((d) => `radar-${d}.tar.age`);
    for (const n of ficam) expect(apagar).not.toContain(n);
    // Todo o resto é apagado: 30 − 14 − 4 = 12 cópias.
    expect(apagar).toHaveLength(12);
    expect(apagar).toContain('radar-2026-10-19.tar.age');
    expect(apagar).toContain('radar-2026-10-31.tar.age');
    // Arquivos que não são cópias nunca entram na lista.
    expect(apagar).not.toContain('notas.txt');
    expect(apagar).not.toContain('registro.log');
  });

  it('cópia de 70 dias atrás, sozinha na semana, é apagada', () => {
    const antiga = nomeDaCopia(new Date('2026-09-08T12:00:00-03:00')); // 70 dias antes de 17/11
    const nomes = [antiga, ...copiasDiarias('2026-11-03', '2026-11-16')];
    expect(escolherCopiasParaApagar(nomes, HOJE)).toEqual([antiga]);
  });

  it('com 14 cópias ou menos, nada é apagado', () => {
    expect(escolherCopiasParaApagar(copiasDiarias('2026-11-10', '2026-11-16'), HOJE)).toEqual([]);
  });
});

describe('mascararConexao', () => {
  it('esconde usuário e senha (mesmo com @ dentro da senha)', () => {
    const t = mascararConexao(
      'falhou: postgresql://postgres.abc:S3nh@F0rte@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    );
    expect(t).not.toContain('S3nh');
    expect(t).not.toContain('F0rte');
    expect(t).not.toContain('postgres.abc');
    expect(t).toContain('postgresql://***:***@aws-0-sa-east-1.pooler.supabase.com');
  });
  it('também esconde o formato postgres:// e o formato password=...', () => {
    expect(mascararConexao('x postgres://u:segredo@h/db')).not.toContain('segredo');
    expect(mascararConexao('host=h password=segredo user=u')).not.toContain('segredo');
  });
  it('não mexe em texto sem conexão', () => {
    expect(mascararConexao('pg_dump: erro qualquer')).toBe('pg_dump: erro qualquer');
  });
});

describe('linhaDeRegistro', () => {
  it('sucesso: uma linha com data, OK e tamanho', () => {
    const l = linhaDeRegistro({ quando: HOJE, ok: true, bytes: 2048 });
    expect(l).toBe('2026-11-17 15:00:00 (Brasília) OK 2048 bytes');
  });
  it('erro: uma linha só, sem a senha', () => {
    const l = linhaDeRegistro({
      quando: HOJE,
      ok: false,
      erro: 'falhou\nconexão postgresql://u:S3nh4@h:5432/db recusada',
    });
    expect(l).not.toContain('\n');
    expect(l).not.toContain('S3nh4');
    expect(l.startsWith('2026-11-17 15:00:00 (Brasília) ERRO ')).toBe(true);
  });
});

describe('horasDesdeUltimaCopia', () => {
  it('sem cópias → null', () => {
    expect(horasDesdeUltimaCopia([], HOJE)).toBeNull();
    expect(horasDesdeUltimaCopia(['notas.txt'], HOJE)).toBeNull();
  });
  it('última de ontem às 00:00 e agora hoje às 12:00 → 36', () => {
    const agora = new Date('2026-11-17T12:00:00-03:00');
    const nomes = ['radar-2026-11-10.tar.age', 'radar-2026-11-16.tar.age'];
    expect(horasDesdeUltimaCopia(nomes, agora)).toBe(36);
  });
});

describe('lerConfig / permissaoESegura', () => {
  it('lê CHAVE=valor, ignora comentários e linhas vazias, tira aspas', () => {
    const c = lerConfig('# comentário\n\nRADAR_COPIA_DESTINO="/home/x/radar-copias"\nRADAR_COPIA_CHAVE_PUBLICA=age1abc\n');
    expect(c).toEqual({ RADAR_COPIA_DESTINO: '/home/x/radar-copias', RADAR_COPIA_CHAVE_PUBLICA: 'age1abc' });
  });
  it('só aceita permissão 600 (leitura e escrita só do dono)', () => {
    expect(permissaoESegura(0o100600)).toBe(true);
    expect(permissaoESegura(0o100644)).toBe(false);
    expect(permissaoESegura(0o100640)).toBe(false);
  });
});

describe('variaveisDeConexao', () => {
  it('separa a conexão em variáveis PG* (a senha nunca vai na linha de comando)', () => {
    expect(
      variaveisDeConexao('postgresql://postgres.abc:S3nh%40F0rte@aws-0.pooler.supabase.com:5432/postgres'),
    ).toEqual({
      PGHOST: 'aws-0.pooler.supabase.com',
      PGPORT: '5432',
      PGUSER: 'postgres.abc',
      PGPASSWORD: 'S3nh@F0rte',
      PGDATABASE: 'postgres',
    });
  });
  it('recusa texto que não é conexão postgres, sem repetir o texto no erro', () => {
    expect(() => variaveisDeConexao('mysql://u:segredo@h/db')).toThrow(/RADAR/);
    try {
      variaveisDeConexao('mysql://u:segredo@h/db');
    } catch (e) {
      expect(String(e)).not.toContain('segredo');
    }
  });
});

describe('bancoEstaVazio', () => {
  it('vazio só se todas as contagens forem zero', () => {
    expect(bancoEstaVazio([{ tabela: 'auth.users', linhas: 0 }, { tabela: 'public.riscos', linhas: 0 }])).toBe(true);
    expect(bancoEstaVazio([{ tabela: 'auth.users', linhas: 3 }, { tabela: 'public.riscos', linhas: 0 }])).toBe(false);
  });
});
