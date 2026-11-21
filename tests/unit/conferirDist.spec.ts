import { describe, it, expect } from 'vitest';
import { procurarSegredos } from '../../scripts/conferir-dist/regras';

// Monta um JWT de mentira (cabeçalho.payload.assinatura) só para o teste.
function jwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.assinaturaFalsa123`;
}

describe('procurarSegredos (conferência do pacote dist/)', () => {
  it('detecta JWT com role service_role', () => {
    const motivos = procurarSegredos(`const k="${jwt({ role: 'service_role' })}";`);
    expect(motivos.join(' ')).toContain('service_role');
  });

  it('aceita JWT com role anon (chave pública)', () => {
    expect(procurarSegredos(`const k="${jwt({ role: 'anon' })}";`)).toEqual([]);
  });

  it('detecta chave secreta sb_secret_', () => {
    const motivos = procurarSegredos('x="sb_secret_' + 'A'.repeat(24) + '"');
    expect(motivos.join(' ')).toContain('chave secreta');
  });

  it('aceita chave publicável sb_publishable_', () => {
    expect(procurarSegredos('x="sb_publishable_abcdefghijklmnopqrstuvwx"')).toEqual([]);
  });

  it('detecta string de conexão com senha', () => {
    const motivos = procurarSegredos('url="postgresql://postgres:senha@db.exemplo.com:5432/postgres"');
    expect(motivos.join(' ')).toContain('conexão');
  });

  it('não devolve o segredo dentro do motivo', () => {
    const token = jwt({ role: 'service_role' });
    expect(procurarSegredos(token).join(' ')).not.toContain(token);
  });

  it('não acusa a palavra solta service_role', () => {
    expect(procurarSegredos('// usa service_role no servidor')).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// listarArquivos: a conferência olha TODOS os arquivos do pacote, sem filtro de
// extensão. Antes, um .txt com chave secreta passava sem ser lido (revisão do
// CodeRabbit na PR #9).
// -----------------------------------------------------------------------------
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listarArquivos } from '../../scripts/conferir-dist/regras';

describe('listarArquivos (pacote dist/)', () => {
  it('inclui arquivos de qualquer extensão, também em subpastas', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'dist-'));
    try {
      mkdirSync(join(pasta, 'assets'));
      writeFileSync(join(pasta, 'index.html'), '<html></html>');
      writeFileSync(join(pasta, 'assets', 'config.txt'), 'sb_secret_abcdefghijklmnopqrstuvwx');
      writeFileSync(join(pasta, 'robots'), 'sem extensão');
      const nomes = listarArquivos(pasta).map((c) => c.slice(pasta.length + 1)).sort();
      expect(nomes).toEqual(['assets/config.txt', 'index.html', 'robots']);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it('um .txt com chave sb_secret_ reprova; chave publicável continua permitida', () => {
    expect(procurarSegredos('chave=sb_secret_abcdefghijklmnopqrstuvwx')).not.toEqual([]);
    expect(procurarSegredos('chave=sb_publishable_abcdefghijklmnopqrstuvwx')).toEqual([]);
  });
});
