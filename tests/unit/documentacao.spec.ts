/**
 * Teste da documentação do RADAR.
 *
 * Para quê serve: a documentação é organizada em níveis (docs/10-... a 50-...), com
 * catálogos de requisitos, casos de uso e ADRs (registros de decisão). Este teste "vigia" a
 * estrutura, para que ninguém quebre as regras sem perceber (ex.: ADR fora de sequência,
 * caso de uso sem seção, ID repetido, uso da sigla proibida).
 *
 * Regra de ouro: se o arquivo ainda não existe, o teste PASSA. Cada tarefa do plano de
 * reestruturação "liga" a sua parte quando cria o arquivo correspondente.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '../..');
const DOCS = join(RAIZ, 'docs');

// ---------------------------------------------------------------------------
// Utilitários de leitura
// ---------------------------------------------------------------------------

/** Lista recursivamente todos os .md de uma pasta (devolve [] se a pasta não existir). */
function listarMd(pasta: string): string[] {
  if (!existsSync(pasta)) return [];
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...listarMd(caminho));
    else if (nome.endsWith('.md')) achados.push(caminho);
  }
  return achados;
}

/** Caminho relativo à raiz do repositório, com "/" (para mensagens de erro). */
const rel = (caminho: string) => relative(RAIZ, caminho).split('\\').join('/');

/** Pastas dos níveis 1 a 5 que existirem (10-*, 20-*, 30-*, 40-*, 50-*). */
function pastasDosNiveis(): string[] {
  return readdirSync(DOCS)
    .filter((n) => /^[1-5]0-/.test(n))
    .map((n) => join(DOCS, n))
    .filter((p) => statSync(p).isDirectory());
}

/** Cabeçalhos de segundo nível (`## Título`) de um texto Markdown, na ordem. */
function secoes(texto: string): string[] {
  return texto
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

// ---------------------------------------------------------------------------
// Funções exportáveis (assinaturas combinadas no plano)
// ---------------------------------------------------------------------------

/**
 * Lê um catálogo (RN, RF ou RNF): uma tabela Markdown cujas duas primeiras colunas são
 * `ID` e `Enunciado` e que tem uma coluna `Origem` (localizada pelo nome no cabeçalho).
 * Devolve [] se o arquivo não existir.
 */
export function lerCatalogo(caminho: string): { id: string; origem: string }[] {
  if (!existsSync(caminho)) return [];
  const linhas = readFileSync(caminho, 'utf8').split('\n');
  const resultado: { id: string; origem: string }[] = [];
  let indiceOrigem = -1;
  for (const linha of linhas) {
    if (!linha.trim().startsWith('|')) {
      indiceOrigem = -1; // saiu da tabela
      continue;
    }
    const celulas = linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (celulas[0] === 'ID' && celulas[1] === 'Enunciado') {
      indiceOrigem = celulas.indexOf('Origem'); // cabeçalho: descobre onde está a Origem
      continue;
    }
    if (indiceOrigem === -1 || /^:?-+:?$/.test(celulas[0])) continue; // fora da tabela ou separador
    resultado.push({ id: celulas[0], origem: celulas[indiceOrigem] ?? '' });
  }
  return resultado;
}

/** Lê todos os ADRs (docs/adr/NNNN-*.md), ignorando o 0000-modelo.md. */
export function lerAdrs(): { numero: number; status: string; secoes: string[] }[] {
  const pasta = join(DOCS, 'adr');
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((n) => /^\d{4}-.*\.md$/.test(n) && !n.startsWith('0000-'))
    .sort()
    .map((nome) => {
      const texto = readFileSync(join(pasta, nome), 'utf8');
      const partes = texto.split(/^##\s+Status\s*$/m);
      // Status = primeira linha não vazia depois do cabeçalho "## Status".
      const status = (partes[1] ?? '').split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
      return { numero: Number(nome.slice(0, 4)), status, secoes: secoes(texto) };
    });
}

/** Lê os casos de uso (UC-NN-*.md); ignora `_modelo.md` e README.md. */
export function lerCasosDeUso(): { id: string; secoes: string[] }[] {
  const pasta = join(DOCS, '20-nivel2-requisitos', 'casos-de-uso');
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((n) => /^UC-\d{2}.*\.md$/.test(n))
    .sort()
    .map((nome) => ({
      id: nome.match(/^UC-\d{2}/)![0],
      secoes: secoes(readFileSync(join(pasta, nome), 'utf8')),
    }));
}

// ---------------------------------------------------------------------------
// ADRs
// ---------------------------------------------------------------------------

describe('ADRs (modelo de Nygard)', () => {
  const adrs = lerAdrs();

  it('existe ao menos o ADR-0001', () => {
    expect(adrs.some((a) => a.numero === 1)).toBe(true);
  });

  it('ADRs numerados em sequência sem lacunas a partir de 0001', () => {
    adrs.forEach((a, i) => expect(a.numero, `ADR na posição ${i + 1}`).toBe(i + 1));
  });

  it('todo ADR tem as seções Status, Contexto, Decisão e Consequências', () => {
    for (const a of adrs) {
      for (const s of ['Status', 'Contexto', 'Decisão', 'Consequências']) {
        expect(a.secoes, `ADR-${a.numero} sem a seção "${s}"`).toContain(s);
      }
    }
  });

  it('Status do ADR é Proposed, Accepted, Deprecated ou "Superseded by ADR-NNNN" e aponta para ADR existente', () => {
    const numeros = new Set(adrs.map((a) => a.numero));
    for (const a of adrs) {
      const m = a.status.match(/^(Proposed|Accepted|Deprecated|Superseded by ADR-(\d{4}))$/);
      expect(m, `ADR-${a.numero}: status inválido "${a.status}"`).not.toBeNull();
      if (m?.[2]) expect(numeros.has(Number(m[2])), `ADR-${a.numero} cita ADR inexistente`).toBe(true);
    }
  });

  it('cada ADR tem no máximo 120 linhas', () => {
    const pasta = join(DOCS, 'adr');
    if (!existsSync(pasta)) return;
    for (const nome of readdirSync(pasta).filter((n) => /^\d{4}-.*\.md$/.test(n) && !n.startsWith('0000-'))) {
      const linhas = readFileSync(join(pasta, nome), 'utf8').split('\n').length;
      expect(linhas, `${nome} tem ${linhas} linhas`).toBeLessThanOrEqual(120);
    }
  });
});

// ---------------------------------------------------------------------------
// Casos de uso
// ---------------------------------------------------------------------------

const SECOES_UC = [
  'Título',
  'Ator principal',
  'Pré-condições',
  'Pós-condições',
  'Fluxo principal de sucesso',
  'Fluxos alternativos e de exceção',
  'Pós-condição de sucesso',
];

/** Confere que `obrigatorias` aparecem em `secoesDoArquivo`, nessa ordem (podem haver outras no meio). */
function naOrdem(secoesDoArquivo: string[], obrigatorias: string[]): boolean {
  let pos = -1;
  for (const o of obrigatorias) {
    pos = secoesDoArquivo.findIndex((s, i) => i > pos && s.startsWith(o));
    if (pos === -1) return false;
  }
  return true;
}

describe('casos de uso', () => {
  it('o modelo _modelo.md tem as 7 seções na ordem', () => {
    const modelo = join(DOCS, '20-nivel2-requisitos', 'casos-de-uso', '_modelo.md');
    if (!existsSync(modelo)) return; // ativado quando o modelo existir (esta tarefa)
    expect(naOrdem(secoes(readFileSync(modelo, 'utf8')), SECOES_UC)).toBe(true);
  });

  it('todo caso de uso tem as 7 seções obrigatórias na ordem do modelo', () => {
    // Tarefas 10 a 12 criam os UC-NN; até lá a lista é vazia e o teste passa.
    for (const uc of lerCasosDeUso()) {
      expect(naOrdem(uc.secoes, SECOES_UC), `${uc.id}: seções fora do modelo`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Catálogos e rastreabilidade
// ---------------------------------------------------------------------------

const NIVEL2 = join(DOCS, '20-nivel2-requisitos');
const CATALOGOS: [string, string, RegExp][] = [
  ['RN', join(NIVEL2, 'regras-negocio.md'), /^RN-\d{3}$/],
  ['RF', join(NIVEL2, 'requisitos-funcionais.md'), /^RF-\d{3}$/],
  ['RNF', join(NIVEL2, 'requisitos-nao-funcionais.md'), /^RNF-\d{3}$/],
];

describe('catálogos RN/RF/RNF', () => {
  it('toda linha tem ID único no formato e Origem não vazia', () => {
    // Arquivos criados nas tarefas 7 a 9; ausentes => lista vazia => passa.
    for (const [nome, caminho, formato] of CATALOGOS) {
      const linhas = lerCatalogo(caminho);
      const vistos = new Set<string>();
      for (const l of linhas) {
        expect(l.id, `${nome}: ID fora do formato`).toMatch(formato);
        expect(vistos.has(l.id), `${nome}: ID repetido ${l.id}`).toBe(false);
        vistos.add(l.id);
        expect(l.origem, `${nome}: ${l.id} sem Origem`).not.toBe('');
      }
    }
  });

  it('todo ID citado em rastreabilidade.md existe no catálogo correspondente', () => {
    const arq = join(NIVEL2, 'rastreabilidade.md');
    if (!existsSync(arq)) return; // ativado quando a rastreabilidade for criada
    const texto = readFileSync(arq, 'utf8');
    const existentes = new Set(CATALOGOS.flatMap(([, c]) => lerCatalogo(c).map((l) => l.id)));
    for (const id of new Set(texto.match(/\b(RN|RF|RNF)-\d{3}\b/g) ?? [])) {
      expect(existentes.has(id), `${id} citado na rastreabilidade mas ausente do catálogo`).toBe(true);
    }
  });

  it('RNF cobre as 9 características da ISO/IEC 25010:2023', () => {
    const arq = join(NIVEL2, 'requisitos-nao-funcionais.md');
    if (!existsSync(arq)) return; // ativado quando o catálogo de RNF existir
    const texto = readFileSync(arq, 'utf8').toLowerCase();
    for (const c of [
      'adequação funcional', 'eficiência de desempenho', 'compatibilidade', 'capacidade de interação',
      'confiabilidade', 'segurança da informação', 'manutenibilidade', 'flexibilidade', 'proteção',
    ]) {
      expect(texto, `RNF sem a característica "${c}"`).toContain(c);
    }
  });
});

// ---------------------------------------------------------------------------
// Disciplina de siglas e de termos
// ---------------------------------------------------------------------------

describe('disciplina de siglas e termos', () => {
  it('a sigla PGR só aparece em linhas que a proíbem', () => {
    // Algumas páginas citam "PGR" justamente para PROIBIR o uso. Essas linhas têm um marcador
    // de proibição. Qualquer outra ocorrência reprova. As cópias fiéis das fontes
    // (revisao-2026/) e o histórico (superpowers/) ficam de fora.
    const marcadores = /nunca|proib|proíb|sigla|troca|⛔|não use/i;
    const arquivos = [
      ...listarMd(DOCS).filter((c) => !/\/(superpowers|01-normativos\/revisao-2026)\//.test(rel(c) + '/')),
      join(RAIZ, 'AGENTS.md'),
      join(RAIZ, 'CLAUDE.md'),
    ];
    const problemas: string[] = [];
    for (const arq of arquivos) {
      readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
        if (/\bPGR\b/.test(linha) && !marcadores.test(linha)) problemas.push(`${rel(arq)}:${i + 1}`);
      });
    }
    expect(problemas, `PGR sem marcador de proibição em: ${problemas.join(', ')}`).toEqual([]);
  });

  it('nenhum documento dos níveis usa "Operacional com interface de Integridade"', () => {
    const problemas = pastasDosNiveis().flatMap(listarMd).filter((c) =>
      /Operacional com interface de Integridade/i.test(readFileSync(c, 'utf8')));
    expect(problemas.map(rel)).toEqual([]);
  });

  it('nenhum documento dos níveis chama de "Crítico" a faixa 18–25', () => {
    const problemas: string[] = [];
    for (const arq of pastasDosNiveis().flatMap(listarMd)) {
      readFileSync(arq, 'utf8').split('\n').forEach((l, i) => {
        if (/(nível|faixa)\s+Crítico/i.test(l)) problemas.push(`${rel(arq)}:${i + 1}`);
      });
    }
    expect(problemas).toEqual([]);
  });
});
