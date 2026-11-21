// =============================================================================
// PREPARAR PUBLICAÇÃO — regras puras (testadas em tests/unit/prepararPublicacao.spec.ts)
// =============================================================================
// Aqui ficam só funções que recebem texto e devolvem texto: sem ler disco.
// O index.ts (CLI) usa estas funções para gravar os arquivos.
// =============================================================================
import { CABECALHOS_SEGURANCA, montarCsp } from '../compartilhado/csp';

/**
 * Confere o endereço do Supabase e devolve a "origem" limpa.
 * Origem = protocolo + servidor (+ porta), sem caminho. Ex.: https://abc.supabase.co
 * Por que ser rígido? Esse texto entra na CSP: um erro aqui abriria (ou fecharia)
 * a conexão do navegador com o banco.
 */
export function validarOrigemSupabase(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Endereço inválido: "${url}". Use o formato https://<projeto>.supabase.co`);
  }
  // Só aceitamos http no próprio computador (Supabase local de desenvolvimento).
  const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) {
    throw new Error('O endereço do Supabase deve usar https (http só vale para 127.0.0.1 ou localhost).');
  }
  if (u.pathname !== '/' || u.search !== '' || u.hash !== '') {
    throw new Error('Informe só a origem (ex.: https://abc.supabase.co), sem caminho, consulta ou fragmento.');
  }
  return u.origin; // já sem a barra final
}

/**
 * Conteúdo do _redirects do Cloudflare Pages.
 * O Vue Router usa createWebHistory: endereços como /riscos NÃO existem como
 * arquivo no servidor. Sem esta regra, apertar F5 em /riscos daria "404".
 * Com ela, o servidor entrega o index.html e o Vue decide qual tela mostrar.
 */
export function arquivoRedirectsCloudflare(): string {
  return '/* /index.html 200\n';
}

/**
 * Conteúdo do _headers do Cloudflare Pages: aplica CSP e demais cabeçalhos
 * de segurança a todas as páginas ("/*"). Linhas de cabeçalho levam 2 espaços.
 */
export function arquivoHeadersCloudflare(origem: string): string {
  const linhas = [`  Content-Security-Policy: ${montarCsp(origem)}`];
  for (const [nome, valor] of Object.entries(CABECALHOS_SEGURANCA)) {
    linhas.push(`  ${nome}: ${valor}`);
  }
  return `/*\n${linhas.join('\n')}\n`;
}

/**
 * Transforma nomes com hash do Vite em padrões, para o Power Pages.
 * Ex.: assets/index-AbC12_x.js -> index-*.js
 * O hash é o ÚLTIMO trecho depois de "-"; arquivos fora de assets/ ou sem hash
 * (como favicon.ico) são ignorados.
 */
export function padroesDeBundle(arquivos: string[]): string[] {
  const padroes = new Set<string>();
  for (const arquivo of arquivos) {
    // O Vite usa hash de 8 caracteres, que PODE conter "-" (ex.: EntrarView--NHsx1234.js).
    // Tentamos primeiro esse formato; se não casar, usamos o último trecho após "-".
    const m =
      /^assets\/(.+)-[A-Za-z0-9_-]{8}\.([A-Za-z0-9]+)$/.exec(arquivo) ??
      /^assets\/(.+)-[A-Za-z0-9_]+\.([A-Za-z0-9]+)$/.exec(arquivo);
    if (m) padroes.add(`${m[1]}-*.${m[2]}`);
  }
  return [...padroes].sort();
}

/** Conteúdo do powerpages.config.json (usado na publicação via Power Platform CLI). */
export function configPowerPages(nomeSite: string, arquivos: string[]): object {
  return {
    siteName: nomeSite,
    compiledPath: 'dist',
    defaultLandingPage: 'index.html',
    bundleFilePatterns: padroesDeBundle(arquivos),
  };
}
