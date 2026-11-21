// =============================================================================
// PREPARAR PUBLICAÇÃO — gera o pacote do front para o piloto
// =============================================================================
// Uso (depois de um build em modo real):
//   npm run preparar:publicacao -- --destino cloudflare --origem https://<ref>.supabase.co
//   npm run preparar:publicacao -- --destino powerpages --origem <url> [--nome-site "RADAR Piloto Sede"]
//
// cloudflare: grava _redirects e _headers dentro de dist/.
// powerpages: recria publicacao/powerpages/ (pasta ignorada pelo git) com
//             powerpages.config.json e uma cópia de dist/; imprime a CSP.
// =============================================================================
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { montarCsp } from '../compartilhado/csp';
import {
  arquivoHeadersCloudflare,
  arquivoRedirectsCloudflare,
  configPowerPages,
  validarOrigemSupabase,
} from './regras';

/** Lê o valor que vem depois de uma opção (ex.: --origem x). */
function opcao(nome: string): string | undefined {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Lista todos os arquivos de uma pasta, com caminho relativo e barras "/". */
function listar(pasta: string, base = pasta): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...listar(caminho, base));
    else achados.push(relative(base, caminho).split('\\').join('/'));
  }
  return achados;
}

function falhar(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const destino = opcao('--destino');
const origemInformada = opcao('--origem');
const nomeSite = opcao('--nome-site') ?? 'RADAR Piloto Sede';

if (destino !== 'cloudflare' && destino !== 'powerpages') {
  falhar('Informe --destino cloudflare ou --destino powerpages.');
}
if (!origemInformada) falhar('Informe --origem <endereço do Supabase>.');

// Valida ANTES de gravar qualquer coisa.
let origem: string;
try {
  origem = validarOrigemSupabase(origemInformada);
} catch (e) {
  falhar((e as Error).message);
}

if (!existsSync('dist')) falhar('Pasta "dist" não encontrada: rode o build em modo real antes.');

if (destino === 'cloudflare') {
  writeFileSync('dist/_redirects', arquivoRedirectsCloudflare());
  writeFileSync('dist/_headers', arquivoHeadersCloudflare(origem));
  console.log('Gerados dist/_redirects e dist/_headers. Publique a pasta dist no Cloudflare Pages.');
} else {
  const saida = 'publicacao/powerpages';
  rmSync(saida, { recursive: true, force: true });
  mkdirSync(saida, { recursive: true });
  cpSync('dist', join(saida, 'dist'), { recursive: true });
  const config = configPowerPages(nomeSite, listar('dist'));
  writeFileSync(join(saida, 'powerpages.config.json'), JSON.stringify(config, null, 2) + '\n');
  console.log(`Pacote criado em ${saida}/.`);
  console.log('\nCole este texto em HTTP/Content-Security-Policy nas configurações do site:\n');
  console.log(montarCsp(origem));
}
