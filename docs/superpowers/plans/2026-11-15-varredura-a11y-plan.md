# Varredura de acessibilidade (`npm run test:a11y`) — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development ou
> superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas
> de seleção (`- [ ]`) para acompanhar o andamento.

**Objetivo:** trazer para o repositório a varredura axe-core + rolagem lateral (13 telas × 4 larguras ×
3 temas = 156 combinações), executável com `npm run test:a11y` e com falha quando houver violação.

**Arquitetura:** o Playwright Test sobe o `vite` na porta 5199. Um arquivo de dados lista as telas, e um
arquivo de testes gera um teste por combinação (tema × largura × tela) com `@axe-core/playwright`.
Dois testes de autoverificação provam que a varredura de fato detecta problemas. O Vitest passa a
olhar só para `tests/unit/`.

**Tecnologias:** `@playwright/test` 1.48.2, `@axe-core/playwright` 4.10.2, Vite 5, Vitest 2.

**Spec:** [`docs/superpowers/specs/2026-11-15-varredura-a11y-design.md`](../specs/2026-11-15-varredura-a11y-design.md)

> **Revisão durante a execução:** versão final `@playwright/test` e `playwright-core` **1.64.1**
> (a 1.48.2 tem o alerta GHSA-7mvr-c777-76hp). Correção do progresso do Plano de ação incluída a
> pedido do usuário. Ver o registro no ESTADO-ATUAL.

## Restrições globais

- Telas (nome → rota): `painel /` · `dar /dar` · `riscos /riscos` · `ficha /riscos/risco-anexo-ii-01` · `ficha-bowtie /riscos/risco-anexo-ii-01?aba=bowtie` · `novo /riscos/novo` · `objetos /objetos` · `monitoramento /monitoramento` · `plano /monitoramento?aba=plano` · `aprovacoes /aprovacoes` · `auditoria /auditoria` · `importar /importar` · `sobre /sobre`.
- Larguras: `360, 768, 1280, 1920`. Altura da janela: `900`.
- Temas: `claro, escuro, contraste`. São gravados em `localStorage['radar.preferencias-interface.v1'] = {"tema": <tema>, "menuRecolhido": false}`. O app aplica o tema como `<html data-theme="<tema>">`.
- Tags do axe: `['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']`.
- Porta: `5199`, com `--strictPort`. `reuseExistingServer: true`.
- Versões fixas (sem `^`): `@playwright/test@1.48.2` (usa o `chromium-1140` já instalado) e `@axe-core/playwright@4.10.2`.
- Não tocar em `src/utils/calculadoraRiscoRadar.ts` nem em `supabase/migrations/`. Usar apenas dados de demonstração.
- Comentários e documentação didáticos, em português do Brasil.
- **Sem commits intermediários.** Um único commit no fim, e só quando o usuário pedir, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Pontos de atenção na revisão

1. **Tema que não pega:** se a chave do `localStorage` mudar de nome, os 3 temas testariam a mesma tela clara sem ninguém perceber. Cada teste confere `html[data-theme]` igual ao tema esperado (Tarefa 1).
2. **Página que não carrega:** uma rota quebrada (ficha inexistente, erro de JavaScript) poderia "passar" no axe com a página vazia. Cada teste espera um `<h1>` visível com texto, com limite de 10 s, e falha se ele não aparecer (Tarefa 1).
3. **Varredura cega:** se o axe não for injetado corretamente, tudo daria 0 violações. A autoverificação injeta uma `<img>` sem `alt` e exige que o axe a acuse (Tarefa 1).
4. **Detector de rolagem cego:** a autoverificação injeta um `<div>` de 3000 px e exige que a checagem acuse rolagem lateral (Tarefa 2).
5. **Outro programa na porta 5199:** com `reuseExistingServer`, a varredura usaria qualquer coisa que estivesse na porta. O ponto 2 (`<h1>` + `data-theme`) faz falhar nesse caso, e o guia (Tarefa 3) explica o que fazer.

---

### Task 1 (Tarefa 1): Infraestrutura + verificação axe nas 156 combinações

**Arquivos:**
- Modificar: `package.json` (script `"test:a11y": "playwright test"` e as 2 dependências de desenvolvimento)
- Modificar: `vite.config.ts` (`test.include: ['tests/unit/**/*.spec.ts']`)
- Modificar: `.gitignore` (`playwright-report/`, `test-results/`)
- Criar: `playwright.config.ts`
- Criar: `tests/a11y/telas.ts`
- Criar: `tests/a11y/varredura.a11y.ts`

**Interfaces:**
- Produz (`tests/a11y/telas.ts`):
  - `export type Tema = 'claro' | 'escuro' | 'contraste'`
  - `export interface Tela { nome: string; rota: string }`
  - `export const TELAS: Tela[]`, `export const LARGURAS: number[]`, `export const TEMAS: Tema[]`, `export const CHAVE_PREFERENCIAS = 'radar.preferencias-interface.v1'`, `export const TAGS_WCAG: string[]`
- Produz (`tests/a11y/varredura.a11y.ts`):
  - `async function abrirTela(page: Page, rota: string, tema: Tema): Promise<void>`: grava o tema com `page.addInitScript`, faz `goto`, espera `h1` visível e não vazio (10 s) e confere `data-theme`.
  - `function resumirViolacoes(v: Result[]): string[]`: transforma cada violação em uma linha `"<id> (<n> elementos) em <1º seletor>: <1ª linha do failureSummary>"`.

`playwright.config.ts`: `testDir: 'tests/a11y'`, `testMatch: '**/*.a11y.ts'`, `use.baseURL: 'http://localhost:5199'`, só o projeto `chromium` (Desktop Chrome), `reporter: [['list'], ['html', { open: 'never' }]]`, `webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: true, timeout: 60_000 }`.

- [ ] **Passo 1: Instalar as dependências**

Rodar: `npm install -D @playwright/test@1.48.2 @axe-core/playwright@4.10.2 --save-exact`
Esperado: o `package.json` lista as duas sem `^`. `npx playwright --version` mostra `Version 1.48.2`.

- [ ] **Passo 2: Escrever a autoverificação (deve falhar enquanto a varredura não existe)**

Em `varredura.a11y.ts`, teste `"autoverificação: o axe acusa uma imagem sem texto alternativo"`:
abre `/` no tema `claro`, injeta `<img src="x.png">` no `<main>` e roda o axe com `TAGS_WCAG`.
Asserção: `expect(resultado.violations.map(v => v.id)).toContain('image-alt')`.

- [ ] **Passo 3: Rodar e ver falhar**

Rodar: `npx playwright test -g autoverificação`
Esperado: FALHA (`telas.ts`, `abrirTela` ou a configuração ainda não existem).

- [ ] **Passo 4: Escrever `telas.ts`, `playwright.config.ts`, `abrirTela`, `resumirViolacoes` e o laço dos 156 testes**

Laço: `for tema of TEMAS → test.describe(tema)`, `for largura of LARGURAS → test.describe(\`${largura} px\`)` com `test.use({ viewport: { width: largura, height: 900 } })`, e `for tela of TELAS → test(tela.nome)`.
Cada teste roda `abrirTela` e depois `new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze()`.
Asserção: `expect(resumirViolacoes(r.violations), 'violações WCAG').toEqual([])`.
Mais `package.json`, `vite.config.ts` e `.gitignore` conforme a lista acima.

- [ ] **Passo 5: Rodar a autoverificação e ver passar**

Rodar: `npx playwright test -g autoverificação`
Esperado: 1 passou.

- [ ] **Passo 6: Rodar a varredura completa**

Rodar: `npm run test:a11y`
Esperado: 157 passaram (156 + autoverificação). **Se aparecer qualquer violação, parar e mostrar ao usuário antes de corrigir** (corrigir telas está fora do escopo).

- [ ] **Passo 7: Conferir que o Vitest continua igual**

Rodar: `npm test`
Esperado: 105 testes passando e nenhum arquivo de `tests/a11y/` na lista.

### Task 2 (Tarefa 2): Rolagem lateral (reprova) e altura do Painel (só informa)

**Arquivos:**
- Modificar: `tests/a11y/varredura.a11y.ts`

**Interfaces:**
- Consome: `abrirTela`, `TELAS`, `LARGURAS` e `TEMAS` da Tarefa 1.
- Produz: `async function medirRolagemLateral(page: Page): Promise<{ rola: boolean; culpados: string[] }>`. `rola` = `document.documentElement.scrollWidth > innerWidth`. `culpados` = até 3 elementos `tag.classe` com `getBoundingClientRect().right > innerWidth + 1`, largura > 0, que não sejam `position: fixed` e que não estejam dentro de `[class*=abas__lista]` (mesma regra do script antigo).

- [ ] **Passo 1: Escrever a autoverificação da rolagem**

Teste `"autoverificação: a checagem acusa rolagem lateral"`: abre `/` em 360 px, injeta `<div style="width:3000px;height:1px">` no `<main>`.
Asserção: `expect((await medirRolagemLateral(page)).rola).toBe(true)`.

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `npx playwright test -g "rolagem lateral"`
Esperado: FALHA (`medirRolagemLateral` não existe).

- [ ] **Passo 3: Implementar `medirRolagemLateral` e incluí-la em cada um dos 156 testes**

Depois do axe: `expect(rolagem.rola, \`rolagem lateral: ${rolagem.culpados.join(', ')}\`).toBe(false)`.
Na tela `painel` com largura `360`, registrar `test.info().annotations.push({ type: 'altura do Painel (px)', description: String(scrollHeight) })` e também `console.log` da altura (meta de 3.500 px, só informação, sem reprovar).

- [ ] **Passo 4: Rodar tudo**

Rodar: `npm run test:a11y`
Esperado: 158 passaram. O terminal mostra a altura do Painel em 360 px nos 3 temas. Anotar o valor para a documentação (a Fase 4 mediu 4.109 px em **390** px; o número em 360 px deve ser maior).

### Task 3 (Tarefa 3): Documentação e verificação final

**Arquivos:**
- Criar: `docs/04-ux/varredura-acessibilidade.md`
- Modificar: `docs/04-ux/design-system.md` (§9: parágrafo "Como repetir a medição" com o link para o guia)
- Modificar: `docs/00-memoria/ESTADO-ATUAL.md` (novo item concluído com as medições reais da Tarefa 2)
- Modificar: `docs/00-memoria/MOC-Radar.md` (seção 5: `[[varredura-acessibilidade]]`)

O guia `varredura-acessibilidade.md` cobre, com linguagem para iniciantes: o que é o axe-core e a WCAG 2.2 AA; instalação (`npm install` + `npx playwright install chromium`, só se o Chromium não estiver instalado); como rodar (`npm run test:a11y`, uma tela só com `-g "painel"` e um tema com `-g "escuro"`); como abrir o relatório (`npx playwright show-report`); como ler uma falha (exemplo de linha de `resumirViolacoes`); como incluir uma tela nova (uma linha em `TELAS`); o que fazer se a porta 5199 estiver ocupada por outro programa; por que as duas autoverificações existem.

- [ ] **Passo 1: Escrever e atualizar os 4 documentos**

- [ ] **Passo 2: Verificação final**

Rodar, nesta ordem: `npm test`, `npm run build` e `npm run test:a11y`.
Esperado: 105 testes passando, build sem erros e 158 passaram com 0 violações.

- [ ] **Passo 3: Mostrar o resultado ao usuário e esperar o pedido de commit**

Quando o usuário pedir, um único commit: `feat(a11y): varredura axe-core no repositório (npm run test:a11y)`, terminando com a linha `Co-Authored-By`.
