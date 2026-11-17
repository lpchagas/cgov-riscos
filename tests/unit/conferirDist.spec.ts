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
