// =============================================================================
// REGRAS DA CONFERÊNCIA DE SEGREDOS NO PACOTE (dist/)
// =============================================================================
// O pacote do front-end é PÚBLICO: qualquer pessoa pode baixar os arquivos .js.
// Por isso ele só pode conter a chave "anon" (pública por desenho). Chaves
// "service_role" / "sb_secret_" e senhas de banco jamais podem ir para lá.
//
// `procurarSegredos` recebe o texto de UM arquivo e devolve a lista de MOTIVOS
// (lista vazia = limpo). Atenção: o motivo NUNCA contém o segredo em si, para
// não vazar a chave nos logs do build.
// =============================================================================
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Percorre a pasta e as subpastas e devolve TODOS os arquivos, de qualquer
 * extensão. Não filtramos por extensão de propósito: um `config.txt` ou um
 * arquivo sem extensão também é publicado junto com o pacote, e uma chave
 * esquecida nele vazaria do mesmo jeito.
 * Ex.: dist/index.html, dist/assets/app.js, dist/assets/config.txt.
 */
export function listarArquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) achados.push(...listarArquivos(caminho));
    else if (info.isFile()) achados.push(caminho);
  }
  return achados;
}

/** Lê só o "miolo" (payload) de um JWT e devolve o `role`, ou null se não for JWT. */
function papelDoJwt(token: string): string | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const json = Buffer.from(partes[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null; // não era JSON válido: não é um JWT do Supabase
  }
}

export function procurarSegredos(conteudo: string): string[] {
  const motivos: string[] = [];

  // 1) JWT: três pedaços base64url separados por ponto. O cabeçalho de JWT
  //    começa sempre com "eyJ" (é o texto `{"` em base64).
  const jwts = conteudo.match(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{3,}/g) ?? [];
  if (jwts.some((t) => papelDoJwt(t) === 'service_role')) {
    motivos.push('JWT com role service_role (chave de administrador do Supabase)');
  }

  // 2) Chave secreta no formato novo do Supabase.
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(conteudo)) {
    motivos.push('chave secreta do Supabase (sb_secret_)');
  }

  // 3) String de conexão com usuário e senha: postgresql://usuario:senha@host
  if (/postgres(?:ql)?:\/\/[^\s:@/"']+:[^\s@/"']+@/.test(conteudo)) {
    motivos.push('string de conexão com senha do banco de dados');
  }

  return motivos;
}
