/**
 * ============================================================================
 * TESTES DE "HIGIENE" DO CSS (`tests/unit/higieneCss.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Estes testes não verificam regras de negócio; eles impedem que os problemas
 * encontrados no diagnóstico da Fase 0 VOLTEM a acontecer:
 *
 *  1. CLASSES FANTASMA: toda classe CSS escrita num `.vue` precisa existir em
 *     algum lugar (gov.br DS, Font Awesome ou nossos arquivos). Foi uma classe
 *     inexistente (`w-100`) que deixava os campos estreitos e cortados.
 *
 *  2. CORES FIXAS: os componentes novos (`src/components/ui/`) só podem usar
 *     tokens (`var(--cor-…)`). Nas views antigas, a quantidade de cores fixas
 *     só pode DIMINUIR (técnica de "catraca"), até chegar a zero na Fase 3.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const raiz = resolve(__dirname, '../..');

function listarArquivos(dir: string, extensao: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...listarArquivos(caminho, extensao));
    else if (caminho.endsWith(extensao)) saida.push(caminho);
  }
  return saida;
}

const arquivosVue = listarArquivos(join(raiz, 'src'), '.vue');

/** Todas as classes DEFINIDAS em alguma folha de estilo do projeto. */
function classesDefinidas(): Set<string> {
  const folhas = [
    readFileSync(join(raiz, 'node_modules/@govbr-ds/core/dist/core.min.css'), 'utf-8'),
    readFileSync(join(raiz, 'node_modules/@fortawesome/fontawesome-free/css/all.min.css'), 'utf-8'),
    ...listarArquivos(join(raiz, 'src'), '.css').map((f) => readFileSync(f, 'utf-8')),
    // Blocos <style> dentro dos componentes .vue:
    ...arquivosVue.flatMap((f) =>
      [...readFileSync(f, 'utf-8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
    ),
  ];
  const definidas = new Set<string>();
  for (const css of folhas) {
    for (const m of css.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) definidas.add(m[1]);
  }
  return definidas;
}

/** Classes ESTÁTICAS usadas em `class="..."` (ignora `:class`, que é dinâmico). */
function classesUsadas(conteudo: string): string[] {
  const usadas: string[] = [];
  for (const m of conteudo.matchAll(/(?<![:\w-])class="([^"]*)"/g)) {
    usadas.push(...m[1].split(/\s+/).filter(Boolean));
  }
  return usadas;
}

describe('Higiene do CSS — proteção contra os achados do diagnóstico', () => {
  it('não usa nenhuma classe CSS inexistente ("classe fantasma")', () => {
    const definidas = classesDefinidas();
    const fantasmas: string[] = [];
    for (const arquivo of arquivosVue) {
      for (const classe of classesUsadas(readFileSync(arquivo, 'utf-8'))) {
        if (!definidas.has(classe)) fantasmas.push(`${arquivo.replace(raiz, '')}: ${classe}`);
      }
    }
    expect(fantasmas, `Classes sem definição:\n${fantasmas.join('\n')}`).toEqual([]);
  });

  it('os componentes novos (src/components/ui) não têm nenhuma cor fixa', () => {
    const comCor = listarArquivos(join(raiz, 'src/components/ui'), '.vue').filter((f) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, 'utf-8').replace(/<!--[\s\S]*?-->/g, ''))
    );
    expect(comCor).toEqual([]);
  });

  it('a quantidade de cores fixas nas views e componentes antigos só diminui (catraca)', () => {
    // Medição da Fase 1 (2026-11-14): 238 → 234 após migrar o selo de
    // criticidade da MemoriaCalculoBar. Fase 2: 234 → 175 com o novo Painel e
    // a nova Matriz 5×5. Fase 3: 175 → 133 com a página DAR, BrButton e
    // MemoriaCalculoBar. Ao migrar uma view, DIMINUA este número.
    const LIMITE_ATUAL = 28; // Objetos migrada
    let total = 0;
    for (const arquivo of arquivosVue) {
      const texto = readFileSync(arquivo, 'utf-8');
      const template = texto.match(/<template>[\s\S]*<\/template>/)?.[0] ?? '';
      const atributosEstilo = template.match(/:?style="[^"]*"/g) ?? [];
      total += atributosEstilo.join(' ').match(/#[0-9a-fA-F]{3,8}\b/g)?.length ?? 0;
      const script = texto.match(/<script[\s\S]*?<\/script>/)?.[0] ?? '';
      total += script.match(/["']#[0-9a-fA-F]{3,8}["']/g)?.length ?? 0;
    }
    expect(total).toBeLessThanOrEqual(LIMITE_ATUAL);
  });
});
