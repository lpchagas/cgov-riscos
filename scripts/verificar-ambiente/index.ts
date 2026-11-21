/**
 * VERIFICADOR DO AMBIENTE — `npm run verificar:ambiente`
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Roda um comando de cada ferramenta, entrega o texto às regras (regras.ts) e
 * imprime uma linha por ferramenta: ✔ (ok) ou ✘ (com a dica de como consertar).
 * Termina com código 1 se alguma falhar. Nunca imprime variáveis de ambiente.
 * ============================================================================
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { avaliarAmbiente, type Ferramenta, type Leitura } from './regras';

/** Roda um comando (tempo-limite de 20 s; o `npx supabase` pode baixar na 1ª vez). */
function rodar(ferramenta: Ferramenta, comando: string): Leitura {
  try {
    const saida = execSync(comando, {
      encoding: 'utf8',
      timeout: 20_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ferramenta, saida: saida.trim() };
  } catch (e) {
    const err = e as { stderr?: string; message?: string; stdout?: string };
    // `gh auth status` escreve "not logged in" na saída mesmo falhando: repassamos o texto.
    return { ferramenta, saida: null, erro: `${err.stderr ?? ''} ${err.message ?? ''}`.trim() };
  }
}

/**
 * `gh auth status` pode imprimir em stdout ou stderr; juntamos os dois.
 * `--hostname github.com`: confere o login no GitHub do projeto. Sem isso, um
 * login em outro servidor (GitHub Enterprise) bastaria para aprovar.
 */
function lerGh(): Leitura {
  const l = rodar('gh', 'gh auth status --hostname github.com 2>&1');
  return l.saida === null && l.erro ? { ...l, saida: l.erro } : l;
}

/** Chromium: devolve o caminho do executável só se o arquivo existir. */
function lerChromium(): Leitura {
  try {
    const caminho = chromium.executablePath();
    return { ferramenta: 'chromium', saida: existsSync(caminho) ? caminho : null };
  } catch (e) {
    return { ferramenta: 'chromium', saida: null, erro: String(e) };
  }
}

// Versão do Supabase CLI fixada no package.json (a que todos devem usar).
const pacote = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies: Record<string, string>;
};
const versaoSupabase = pacote.devDependencies.supabase.replace(/^[^\d]*/, '');

const leituras: Leitura[] = [
  rodar('node', 'node --version'),
  rodar('npm', 'npm --version'),
  rodar('git', 'git --version'),
  lerGh(),
  rodar('docker', "docker version --format '{{.Server.Version}}|{{.Server.Platform.Name}}'"),
  rodar('supabase', 'npx supabase --version'),
  lerChromium(),
];

const veredito = avaliarAmbiente(leituras, versaoSupabase);
for (const v of veredito) {
  console.log(`${v.ok ? '✔' : '✘'} ${v.ferramenta.padEnd(9)} ${v.mensagem}`);
  if (!v.ok && v.dica) console.log(`    → ${v.dica}`);
}
const falhas = veredito.filter((v) => !v.ok).length;
console.log(falhas === 0 ? '\nAmbiente pronto.' : `\n${falhas} item(ns) precisam de atenção.`);
process.exit(falhas === 0 ? 0 : 1);
