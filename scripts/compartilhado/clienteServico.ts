/**
 * CLIENTE DO SUPABASE COM A CHAVE DE SERVIÇO (compartilhado pelos importadores)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Os importadores (`sync:estrutura` e `sync:atribuicoes`) precisam gravar no
 * banco ignorando o RLS, por isso usam a chave de serviço (`service_role`).
 * Esta função fica num lugar só para os dois usarem a MESMA lógica:
 *   - se existirem SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, usa as duas;
 *   - senão, pergunta ao Supabase local (`supabase status -o env`).
 * A chave NUNCA é gravada em arquivo nem impressa na tela.
 * A trava do `--sim` (só banco local) é feita por quem chama, com
 * `conferirDestinoDoSim(url, opcoes)` (ver `sync-estrutura/destino.ts`).
 * ============================================================================
 */
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function criarClienteServico(): { cliente: SupabaseClient; url: string } {
  let url = process.env.SUPABASE_URL;
  let chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    // Pergunta ao Supabase local. A saída tem linhas como: API_URL="http://127.0.0.1:54321"
    const saida = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const variaveis = new Map<string, string>();
    for (const linha of saida.split('\n')) {
      const achado = /^([A-Z_]+)="?(.*?)"?$/.exec(linha.trim());
      if (achado) variaveis.set(achado[1], achado[2]);
    }
    url = url || variaveis.get('API_URL');
    chave = chave || variaveis.get('SERVICE_ROLE_KEY');
  }
  if (!url || !chave) {
    throw new Error('RADAR: não achei o Supabase. Rode `npm run db:start` ou defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  return { cliente: createClient(url, chave, { auth: { persistSession: false } }), url };
}
