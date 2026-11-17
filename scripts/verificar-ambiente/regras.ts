/**
 * REGRAS DO VERIFICADOR DO AMBIENTE — `npm run verificar:ambiente`
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Antes de desenvolver o RADAR num computador novo, é preciso ter algumas
 * ferramentas instaladas (Node, npm, git, gh, Docker, Supabase CLI, Chromium).
 * Este arquivo só contém as REGRAS (funções puras, sem rodar comando nenhum):
 * recebe o texto que cada comando imprimiu e decide "está ok?" com uma dica
 * em português. Quem roda os comandos é o `index.ts`. Assim as regras podem
 * ser testadas sem precisar das ferramentas instaladas.
 * ============================================================================
 */

/** As ferramentas que o verificador confere. */
export type Ferramenta = 'node' | 'npm' | 'git' | 'gh' | 'docker' | 'supabase' | 'chromium';

/** O que o comando de uma ferramenta devolveu. */
export interface Leitura {
  ferramenta: Ferramenta;
  /** Texto que o comando imprimiu; `null` se o comando não existe ou falhou. */
  saida: string | null;
  /** Mensagem de erro do comando (quando `saida` é `null`). */
  erro?: string;
}

/** Resultado da conferência de uma ferramenta. */
export interface Veredito {
  ferramenta: Ferramenta;
  ok: boolean;
  mensagem: string;
  /** O que fazer para consertar (só quando `ok` é falso). */
  dica?: string;
}

/**
 * Acha a primeira versão `X.Y.Z` dentro de um texto.
 * Ex.: 'v24.21.0' → '24.21.0'; 'Docker version 28.1.1, build 4eba377' → '28.1.1';
 * 'sem número' → null.
 */
export function lerVersao(saida: string): string | null {
  const achado = /(\d+)\.(\d+)\.(\d+)/.exec(saida);
  return achado ? achado[0] : null;
}

/**
 * Compara duas versões `X.Y.Z` número a número (não como texto!).
 * Devolve negativo se a < b, zero se iguais, positivo se a > b.
 * Ex.: '22.0.0' vs '24.21.0' → negativo; '10.10.0' vs '10.9.0' → positivo
 * (como texto, "10.10" ficaria antes de "10.9": por isso comparamos números).
 */
export function compararVersoes(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diferenca = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}

/** Regra comum a node e npm: precisa existir e ter versão mínima. */
function avaliarVersaoMinima(
  l: Leitura,
  nome: string,
  minima: string,
  dicaInstalar: string,
): Veredito {
  const versao = l.saida ? lerVersao(l.saida) : null;
  if (!versao) {
    return { ferramenta: l.ferramenta, ok: false, mensagem: `${nome} não encontrado`, dica: dicaInstalar };
  }
  // Ex.: node v20.11.0 com mínima 22.0.0 → reprova.
  if (compararVersoes(versao, minima) < 0) {
    return {
      ferramenta: l.ferramenta,
      ok: false,
      mensagem: `${nome} ${versao} é antigo: precisa da versão ${minima.split('.')[0]} ou mais nova`,
      dica: dicaInstalar,
    };
  }
  return { ferramenta: l.ferramenta, ok: true, mensagem: `${nome} ${versao}` };
}

/** Docker: distingue "parado", "não instalado", Engine (WSL) e Desktop (casa). */
function avaliarDocker(l: Leitura): Veredito {
  if (l.saida === null) {
    const erro = l.erro ?? '';
    // Ex.: "failed to connect to the docker API" → instalado, mas o motor está parado.
    if (/Cannot connect|failed to connect|daemon/i.test(erro)) {
      return {
        ferramenta: 'docker',
        ok: false,
        mensagem: 'Docker não está respondendo',
        dica:
          'No WSL com Docker Engine: sudo service docker start. ' +
          'No computador de casa: abra o Docker Desktop e espere ele iniciar.',
      };
    }
    // Ex.: "docker: command not found" → não está instalado.
    return {
      ferramenta: 'docker',
      ok: false,
      mensagem: 'Docker não instalado',
      dica: 'Siga o guia de instalação do Docker em docs/ (Docker Engine no WSL ou Docker Desktop).',
    };
  }
  // A leitura vem no formato "versão|nome da plataforma".
  const [versaoBruta, plataforma = ''] = l.saida.split('|');
  const versao = lerVersao(versaoBruta) ?? versaoBruta.trim();
  const tipo = /Desktop/i.test(plataforma) ? 'Docker Desktop' : 'Docker Engine';
  return { ferramenta: 'docker', ok: true, mensagem: `${tipo} (servidor ${versao})` };
}

/**
 * Junta as regras de todas as ferramentas.
 * @param leituras o que cada comando imprimiu
 * @param versaoSupabaseEsperada versão de `devDependencies.supabase` no package.json
 */
export function avaliarAmbiente(leituras: Leitura[], versaoSupabaseEsperada: string): Veredito[] {
  return leituras.map((l): Veredito => {
    switch (l.ferramenta) {
      case 'node':
        return avaliarVersaoMinima(l, 'Node', '22.0.0', 'Instale o Node 24 (ex.: nvm install; o arquivo .nvmrc indica a versão).');
      case 'npm':
        return avaliarVersaoMinima(l, 'npm', '10.0.0', 'Atualize o Node: o npm 10 ou mais novo já vem com ele.');
      case 'git': {
        const versao = l.saida ? lerVersao(l.saida) : null;
        return versao
          ? { ferramenta: 'git', ok: true, mensagem: `git ${versao}` }
          : { ferramenta: 'git', ok: false, mensagem: 'git não encontrado', dica: 'Instale: sudo apt install git' };
      }
      case 'gh': {
        // Ex.: "✓ Logged in to github.com account x" → ok.
        if (l.saida && l.saida.includes('Logged in')) {
          return { ferramenta: 'gh', ok: true, mensagem: 'gh autenticado no GitHub' };
        }
        return {
          ferramenta: 'gh',
          ok: false,
          mensagem: 'gh não instalado ou sem login',
          dica: 'Instale o GitHub CLI e rode: gh auth login',
        };
      }
      case 'docker':
        return avaliarDocker(l);
      case 'supabase': {
        const versao = l.saida ? lerVersao(l.saida) : null;
        const dica = 'Rode npm ci para instalar a versão fixada no package.json.';
        if (!versao) {
          return { ferramenta: 'supabase', ok: false, mensagem: 'Supabase CLI não encontrado', dica };
        }
        // Ex.: instalada 2.120.0, esperada 2.122.0 → reprova (versões diferentes geram migrações diferentes).
        if (compararVersoes(versao, versaoSupabaseEsperada) !== 0) {
          return {
            ferramenta: 'supabase',
            ok: false,
            mensagem: `Supabase CLI ${versao}, mas o projeto usa ${versaoSupabaseEsperada}`,
            dica,
          };
        }
        return { ferramenta: 'supabase', ok: true, mensagem: `Supabase CLI ${versao}` };
      }
      case 'chromium':
        // `saida` é o caminho do executável, só preenchido se o arquivo existe.
        return l.saida
          ? { ferramenta: 'chromium', ok: true, mensagem: 'Chromium do Playwright instalado' }
          : {
              ferramenta: 'chromium',
              ok: false,
              mensagem: 'Chromium do Playwright ausente',
              dica: 'Rode: npx playwright install --with-deps chromium',
            };
    }
  });
}
