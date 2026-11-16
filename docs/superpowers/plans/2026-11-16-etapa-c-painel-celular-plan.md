# Etapa C — Painel no celular: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o Painel usável em 390 px (≈ 3.500 px de altura na demonstração, teto ≈ 3.700 px no modo real), sem remover nenhum cartão nem função, com o computador (≥ 640 px) idêntico ao de hoje.

**Architecture:** Um composable `useCelular` (matchMedia) alimenta um componente novo `BlocoRecolhivel` (só recolhe no celular) e o limite de 3 cartões em "Maiores riscos". O `StatCard` ganha um modo `compacto`. A ordem "Atenção antes da Matriz" é só CSS (`order`) dentro do media query. Nada de banco, cálculo, RLS ou fluxo.

**Tech Stack:** Vue 3 + TypeScript, Pinia, `@govbr-ds/core` + tokens de `src/styles/tokens.css`, Vitest (jsdom), Playwright + axe-core, Figma MCP.

**Spec:** `docs/superpowers/specs/2026-11-16-etapa-c-painel-celular-design.md`

## Global Constraints

- Celular = `(max-width: 639.98px)`, o mesmo ponto de corte das regras de celular que o Painel já tem (**call do plano**: a spec dizia "< 768"; 640–767 px é tablet e a tabela já vira cartão só abaixo de 768 por conta própria). Constante única `CONSULTA_CELULAR` em `useCelular.ts`.
- Computador/tablet (≥ 640 px) não muda de aparência nem de ordem de HTML.
- Não alterar `calculadoraRiscoRadar.ts`, trigger, RLS, fluxo, `supabase/migrations/` (migração nova: **proibida** neste plano).
- Nunca "PGR" para Plano de Gestão de Riscos; nunca "Crítico" para o nível 18 a 25 (é "Extremo").
- Nunca abrir, listar ou ler `_temp/`. Só dados de demonstração (`@radar.test`); nenhum e-mail fora do Mailpit.
- Só tokens (`var(--…)`), sem cores fixas (`higieneCss.spec.ts` reprova). Classes novas precisam existir no CSS (mesmo teste).
- Alvo de toque no celular: lado menor ≥ **44 px**. Texto só para leitor de tela: classe existente `radar-so-leitor`.
- Comentários didáticos em português do Brasil em todo código novo (o responsável é iniciante); exemplos práticos nos blocos importantes.
- Commits automáticos em português `tipo(escopo): resumo`, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Sem push, merge ou PR.
- Meta de 3.500 px **informa, não reprova** teste.

## Review Focus

1. Carteira vazia no celular: `EmptyState` aparece sem blocos recolhíveis soltos nem botões "Mostrar mais" (Task 4).
2. Exatamente 3 riscos → sem botão "Mostrar mais"; 4 riscos → "Mostrar mais 1"; 5 → "Mostrar mais 2" (Task 4).
3. Conteúdo recolhido não pode receber foco: "Tentar de novo" da Atividade em erro só existe no teclado depois de abrir (Tasks 2 e 4).
4. Girar/redimensionar de celular para computador com bloco aberto ou fechado: no computador o conteúdo aparece sempre e não há botão de recolher (Tasks 1 e 2).
5. Temas escuro e alto contraste: botões e indicadores compactos mantêm contraste (0 violações axe, Task 6).

---

### Task 1: Composable `useCelular`

**Files:**
- Create: `src/composables/useCelular.ts`
- Create: `tests/unit/fixtures/matchMediaFalso.ts`
- Test: `tests/unit/useCelular.spec.ts`

**Interfaces:**
- Produces: `export const CONSULTA_CELULAR = '(max-width: 639.98px)'`; `export function useCelular(consulta?: string): Ref<boolean>` — `true` quando a janela casa com a consulta; valor inicial lido na hora (sem piscar), atualizado no evento `change`, ouvinte removido ao desmontar; sem `window.matchMedia` (jsdom) devolve `ref(false)`.
- Produces (fixture): `export function instalarMatchMediaFalso(inicial: boolean): { definir(casa: boolean): void; restaurar(): void }` — troca `window.matchMedia` por um falso cujo `matches` começa em `inicial`; `definir` muda e dispara os ouvintes `change`.

- [ ] **Step 1: Escrever os testes (falham)** em `tests/unit/useCelular.spec.ts`, montando um componente mínimo com `useCelular()`:
  - `'começa true quando a janela é de celular'`: `instalarMatchMediaFalso(true)` → `ref.value === true` já na primeira renderização.
  - `'começa false no computador'`: `instalarMatchMediaFalso(false)` → `false`.
  - `'acompanha a mudança de largura'`: `definir(true)` depois de montar → `true` após `nextTick`; `definir(false)` → `false`.
  - `'remove o ouvinte ao desmontar'`: após `unmount()`, o falso não tem mais ouvintes (exponha `ouvintes()` ou conte `removeEventListener`).
  - `'sem matchMedia devolve false'`: `window.matchMedia = undefined`.
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/useCelular.spec.ts` → esperado: FAIL (módulo não existe).
- [ ] **Step 3: Implementar** `useCelular.ts` e a fixture (assinaturas acima). Comentário didático: "por que ler `matches` na criação evita o piscar".
- [ ] **Step 4: Rodar** o mesmo comando → PASS.
- [ ] **Step 5: Commit** `feat(painel): composable useCelular para reagir à largura da janela`.

---

### Task 2: Componente `BlocoRecolhivel`

**Files:**
- Create: `src/components/ui/BlocoRecolhivel.vue`
- Test: `tests/unit/blocoRecolhivel.spec.ts`

**Interfaces:**
- Consumes: `useCelular()` da Task 1; `instalarMatchMediaFalso` da fixture.
- Produces: `<BlocoRecolhivel id="…" titulo="…" :aberto-no-celular="false">` com slots `default` (corpo) e `acao` (link opcional do cabeçalho, ex.: "Abrir DAR"). Renderiza uma `<section class="bloco-recolhivel" :aria-labelledby="`${id}-titulo`">` (aceita `class="cartao"` do pai, fallthrough no elemento raiz).
  - **Computador:** `<h2 :id="`${id}-titulo`">` com o texto, slot `acao` ao lado, corpo sempre visível, **nenhum `<button>`**.
  - **Celular:** o `<h2>` contém um `<button type="button" aria-expanded aria-controls="`${id}-corpo`">` com o título e um chevron (`fa-chevron-down`/`fa-chevron-up`, `aria-hidden`); corpo `<div :id="`${id}-corpo`">` com `v-show` (some do foco e do leitor quando fechado); slot `acao` continua no cabeçalho. Estado interno `aberto`, inicia em `abertoNoCelular`; não persiste.
  - Botão com `min-height: 44px`; só tokens; estilos próprios (título com o mesmo visual de `.cartao__titulo`: `--titulo-sm`, `--peso-forte`).

- [ ] **Step 1: Escrever os testes (falham)**:
  - computador: sem `button`; corpo visível; `h2` com o título; slot `acao` renderizado.
  - celular: `button[aria-expanded="false"]`, corpo com `display: none` (`isVisible() === false`).
  - celular: clicar → `aria-expanded="true"`, corpo visível, `aria-controls` igual ao `id` do corpo; clicar de novo fecha.
  - celular com `abertoNoCelular`: já abre.
  - celular: slot `acao` visível mesmo fechado.
  - mudar de celular para computador (`definir(false)`) com o bloco fechado: corpo visível e sem botão.
  - corpo fechado com um `<button>` dentro: o botão está dentro de elemento `display: none` (não focável).
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/blocoRecolhivel.spec.ts` → FAIL.
- [ ] **Step 3: Implementar** o componente conforme Interfaces (padrão "botão + aria-expanded + aria-controls" já usado em `atencao__mais`).
- [ ] **Step 4: Rodar** → PASS; rodar também `npx vitest run tests/unit/higieneCss.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(painel): componente BlocoRecolhivel (recolhe só no celular)`.

---

### Task 3: `StatCard` compacto

**Files:**
- Modify: `src/components/ui/StatCard.vue`
- Test: `tests/unit/componentesUi.spec.ts` (acrescentar casos)

**Interfaces:**
- Produces: nova prop opcional `compacto?: boolean` (padrão `false`). Com `compacto`, **no celular** (`@media (max-width: 639.98px)`): a `descricao` e o "Ver lista →" ficam só para leitor de tela (mesmo DOM, aplicar `.radar-so-leitor`-equivalente por CSS escopado — não duplicar texto), `padding` menor (`var(--esp-3)`), cartão inteiro com `min-height: 44px`. Computador: igual a hoje. O nome acessível do link continua contendo rótulo, valor e descrição.

- [ ] **Step 1: Testes (falham)** em `componentesUi.spec.ts`: com `compacto`, o elemento raiz tem a classe `stat-card--compacto`; sem `compacto`, não tem; a `descricao` e "Ver lista" continuam no DOM (texto presente em `w.text()`), para o leitor de tela.
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/componentesUi.spec.ts` → novos casos FAIL.
- [ ] **Step 3: Implementar** a prop e o CSS escopado (classe `stat-card--compacto`; texto oculto por técnica visualmente-oculta no media query).
- [ ] **Step 4: Rodar** → PASS (e `higieneCss`).
- [ ] **Step 5: Commit** `feat(painel): StatCard compacto para o celular`.

---

### Task 4: Montar o Painel (ordem, recolhíveis, limite de 3, indicadores)

**Files:**
- Modify: `src/views/PainelConsolidadoCgovView.vue`
- Test: `tests/unit/painelCelular.spec.ts` (novo; copie o `montarPainel` de `painelPiloto.spec.ts`, instalando o falso de `matchMedia` antes de montar)

**Interfaces:**
- Consumes: `useCelular`, `BlocoRecolhivel` (`id`, `titulo`, slots `default`/`acao`), `StatCard` com `compacto`.
- Produces (na view): `const LIMITE_MAIORES_CELULAR = 3`; `const verTodosMaiores = ref(false)`; `const maioresVisiveis = computed(() => celular.value && !verTodosMaiores.value ? maiores.value.slice(0, LIMITE_MAIORES_CELULAR) : maiores.value)`; botão `.painel__maiores-mais` (`aria-expanded`, `aria-controls="tabela-maiores"`, texto "Mostrar mais N" / "Mostrar menos", N = `maiores.length - 3`) só quando `celular && maiores.length > 3`. A seção "Atenção" ganha a classe `painel__atencao`; no `@media (max-width: 639.98px)` `.painel__atencao { order: -1 }` (só visual; HTML intocado).
- Os três cartões finais ("Riscos por nível residual", "Apetite a riscos (DAR)", "Atividade recente") passam a usar `<BlocoRecolhivel class="cartao" …>` (`ids`: `bloco-nivel`, `bloco-dar`, `bloco-atividade`; links "Abrir DAR" e "Auditoria" no slot `acao`). O `EstadoCarregamento` da Atividade e o `watch` que lê a atividade **não mudam** (a leitura acontece mesmo recolhido).
- Os 4 `StatCard` do Painel recebem `compacto`.

- [ ] **Step 1: Testes (falham)** em `painelCelular.spec.ts`:
  - celular (`instalarMatchMediaFalso(true)`): três `button[aria-expanded="false"]` com os textos "Riscos por nível residual", "Apetite a riscos (DAR)", "Atividade recente"; clicar no da DAR mostra "categorias" e `aria-expanded="true"`; links "Abrir DAR" e "Auditoria" visíveis fechados.
  - computador (`false`): nenhum desses três botões; todo o texto dos três blocos presente; mesma ordem de `h2` de hoje (Matriz antes de Atenção).
  - 3 riscos (semente): **sem** `.painel__maiores-mais`; 3 linhas na tabela.
  - 5 riscos (acrescente 2 cópias com `id` e `codigoRadar` novos à fonte): celular mostra 3 linhas e "Mostrar mais 2"; clicar mostra 5 e "Mostrar menos"; computador mostra 5 e sem botão. Com 4: "Mostrar mais 1".
  - carteira vazia no celular: `EmptyState` "Nenhum risco no seu alcance", zero botões de bloco e zero `.painel__maiores-mais`.
  - Atividade em erro (fonte que falha em `lerAtividadeRecente`, como em `painelPiloto`): fechada, o botão "Tentar de novo" não é visível; depois de abrir, é visível.
  - `StatCard`s: os 4 têm `stat-card--compacto`; os `href` continuam os mesmos de `painelPiloto`.
  - A classe `painel__atencao` está na seção cujo `aria-labelledby` é `titulo-atencao`.
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/painelCelular.spec.ts` → FAIL.
- [ ] **Step 3: Implementar** na view conforme Interfaces; atualizar o comentário do topo ("Ordem dos blocos") e o comentário do CSS de celular (a antiga "meta < 3.500 px").
- [ ] **Step 4: Rodar** `npx vitest run tests/unit/painelCelular.spec.ts tests/unit/painelPiloto.spec.ts tests/unit/higieneCss.spec.ts` → tudo PASS (o `painelPiloto` mostra que o computador não regrediu; ajuste só o que for inevitável e justifique no commit).
- [ ] **Step 5: Commit** `feat(painel): Painel no celular com blocos recolhíveis, ordem e limite de 3 riscos`.

---

### Task 5: Alvos de toque de 44 px no celular

**Files:**
- Modify: `src/views/PainelConsolidadoCgovView.vue` (CSS), `src/components/ui/PageHeader.vue` (CSS do botão "Fundamento")
- Test: coberto pelo teste de navegador da Task 6 (CSS não é visível no jsdom).

**Interfaces:**
- Produces: dentro de `@media (max-width: 639.98px)`: `--alvo-toque: 44px` no `.painel`; `min-height`/`min-width` ≥ 44 em `.link-acao` (já `inline-flex`), `.codigo` (vira `inline-flex; align-items: center`), `.atencao__mais`, `.painel__maiores-mais`, `.painel__perfil-select` e, em `PageHeader`, no botão `cabecalho-pagina__fundamento-botao`. **Exceção deliberada:** links dentro de frase (`.painel__dica a`) ficam como estão (WCAG 2.5.8, exceção de texto corrido). Só celular; computador intocado.

- [ ] **Step 1:** Escrever o teste de navegador da Task 6 primeiro (passo "alvos < 44 px") e rodá-lo: deve FALHAR listando os elementos (rodar após o Step 1 da Task 6; as tasks 5 e 6 se fecham juntas).
- [ ] **Step 2: Implementar** o CSS acima.
- [ ] **Step 3: Rodar** `npx vitest run` (todos) → PASS.
- [ ] **Step 4: Commit** `feat(painel): alvos de toque de 44 px no celular`.

---

### Task 6: Teste de navegador em 390 px e varredura com 390 px

**Files:**
- Create: `tests/a11y/painelCelular.a11y.ts`
- Modify: `tests/a11y/telas.ts` (`LARGURAS` ganha `390`), `tests/a11y/varredura.a11y.ts` (a nota de altura vale para 360 e 390)

**Interfaces:**
- Consumes: `abrirTela` não é exportada; o novo arquivo faz o seu próprio `page.addInitScript` com `CHAVE_PREFERENCIAS`, `CHAVE_PERFIL_DEMO` (de `telas.ts`) e confere `h1` "Painel".
- Produces: testes em viewport 390×844 (perfis `cgov` e `gestor`) e 1280×900:
  - **390:** `y` do `h2` "Precisa da sua atenção" < `y` do `h2` "Matriz de riscos inerentes"; os 3 botões de bloco existem com `aria-expanded="false"`; clicar em cada um abre; nenhum `a`, `button`, `select` dentro de `.painel`, visível e fora de `.painel__dica`, com lado menor < 44 px (a mensagem de falha lista tag, classe, texto e tamanho); sem rolagem lateral; altura do documento registrada em `test.info().annotations` e `console.log` (não reprova).
  - **1280:** `h2` da Matriz antes do da Atenção; nenhum botão de bloco; os três blocos finais visíveis.
  - Teste da varredura de 390: nenhuma violação axe no Painel nos 3 temas já vem de `LARGURAS` (390 entra no laço).

- [ ] **Step 1: Escrever** `painelCelular.a11y.ts` e ajustar `telas.ts`/`varredura.a11y.ts`.
- [ ] **Step 2: Rodar** `npx playwright test painelCelular` → falha só no item "alvos < 44 px" (se a Task 5 ainda não foi feita) e passa nos demais.
- [ ] **Step 3: Conferir** que passa depois da Task 5; rodar `npx playwright test -g "painel"` (todas as larguras/temas do Painel, inclusive `painel-carregando` e `painel-erro`) → 0 violações.
- [ ] **Step 4: Commit** `test(painel): teste de navegador em 390 px e varredura em 390 px`.

---

### Task 7: Figma (cópia de trabalho, tela original travada)

**Files:** nenhum no repositório (Figma: arquivo "RADAR — Painel", equipe `cgov`; exemplos de layout na pasta `619366367`).

- [ ] **Step 1:** Carregar as skills `figma:figma-use` e `figma:figma-generate-design`; `create_session` no arquivo; **não tocar** no quadro "📌 Original" do Painel (travado).
- [ ] **Step 2:** Na cópia "✏️ Trabalho" do Painel no celular (390), reproduzir o resultado final das Tasks 4–5 (indicadores compactos 2×2, Atenção antes da Matriz, Maiores riscos com 3 + "Mostrar mais", três blocos recolhidos), usando instâncias da biblioteca RADAR (StatCard, PageHeader, BrFooter etc.).
- [ ] **Step 3:** Componente novo `BlocoRecolhivel` na página "Componentes RADAR" (variantes `aberto=sim/não`, celular) e entrada na tabela de 4 colunas do Code Connect (nome Figma | arquivo `.vue` | props | observação); ligar com `get_code_connect_map`/`add_code_connect_map` **só** se a biblioteca estiver publicada; se faltar publicar, registrar como pendência (a CGOV publica a biblioteca).
- [ ] **Step 4:** Anotar nos documentos (Task 8) os nós alterados. Commit só se algum arquivo do repositório mudar (`docs(figma): …`).

---

### Task 8: Documentação, medição final e verificação

**Files:**
- Modify: `docs/00-memoria/ESTADO-ATUAL.md`, `docs/04-ux/design-system.md` (§9 e nova decisão), `docs/02-arquitetura-cgti/decisoes-tecnicas-b3.md` (§3.1: remover "Painel no celular" das pendências, apontando para a etapa C), `docs/00-memoria/MOC-Radar.md` (links do design e do plano), `docs/04-ux/varredura-acessibilidade.md` (390 px e contagem de combinações)
- Create: `docs/02-arquitetura-cgti/decisoes-tecnicas-c.md` (decisões D-C1 a D-C3 da CGOV e as calls do plano: breakpoint 640 px, ordem só por CSS, alvos de 44 px inclusive no `PageHeader`, 390 entra na varredura, meta só informa; com **por quê** e **custo** de cada uma)

- [ ] **Step 1: Medição final** em 390 px (perfis CGOV e Gestor, demonstração) com o script de medição (reaproveite a lógica de `tests/a11y/painelCelular.a11y.ts`, sem salvar dados): altura total, ordem dos blocos, alvos < 44 px (esperado: 0). Registrar antes × depois (4.104/4.185 px de partida). Se ficar acima de 3.500 px, **informar o número real** (não arredondar para a meta).
- [ ] **Step 2: Verificação final, nesta ordem, anotando os números reais:**
  - `npm test`
  - `npm run build`
  - `npm run test:a11y` (esperado: 0 violações; o total de testes aumenta com a largura 390)
  - `npm run db:start && npm run db:funcoes` (em outro terminal/background) e `npm run test:integracao`
  - `npm run db:reset && npm run test:db`
  - `git status --porcelain | grep -i '_temp'` (vazio); `git diff --stat main -- supabase/migrations` (vazio); `grep -rn "service_role\|SERVICE_ROLE" src/` (só o comentário de `src/services/supabase.ts`)
- [ ] **Step 3:** Atualizar os documentos acima com os números reais e as pendências (inclua: biblioteca Figma a republicar; descrição do indicador agora só para leitor de tela; ordem do teclado ≠ ordem visual no celular).
- [ ] **Step 4: Commit** `docs(estado): etapa C (Painel no celular) concluída` e mostrar o resumo ao responsável (decisões e pendências).

---

## Self-review (feita)

- **Cobertura da spec:** §3 obj. 1 (altura) → Tasks 3–4, medida na 8; obj. 2 (ordem) → 4; obj. 3 (44 px) → 5/6; obj. 4 (teto no real) → 4 (limite de 3, testado com 4 e 5 riscos); §5 D-C1/2/3 → 4 e 3; §7 calls 1–6 → Tasks 4, 2, 8, 5, 4 e 7; §8 → 6 e 8.
- **Consistência de tipos:** `useCelular(): Ref<boolean>`, `CONSULTA_CELULAR`, `BlocoRecolhivel` (`id`, `titulo`, `abertoNoCelular`, slots `default`/`acao`), `StatCard.compacto`, `LIMITE_MAIORES_CELULAR` usados com os mesmos nomes nas Tasks 1–6.
- **Desvios da spec, declarados:** breakpoint 640 px (não 768); a classe de `Fundamento` muda no `PageHeader` compartilhado (todas as telas ganham o alvo de 44 px no celular).
