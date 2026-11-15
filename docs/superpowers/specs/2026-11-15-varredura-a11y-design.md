# Design — Varredura de acessibilidade no repositório (`npm run test:a11y`)

> **Data:** 2026-11-15 · **Branch:** `feat/varredura-a11y` · **Tamanho:** mudança pequena (design curto)
> Relacionados: [[design-system]] §9 · [[ESTADO-ATUAL]]

## Por que

A regra "0 violações do axe-core" vale para encerrar qualquer etapa. Hoje a varredura que mediu
as 156 combinações da Fase 4 é um script solto numa pasta temporária, fora do projeto. Ela depende
de alguém subir o servidor à mão e termina sempre como "sucesso". O objetivo é que qualquer pessoa
repita essa verificação com um único comando. Quem vai manter isso depois é a **equipe técnica da CGOV**.

## Objetivos

- `npm run test:a11y` sobe o servidor sozinho, verifica **13 telas × 4 larguras (360, 768, 1280,
  1920) × 3 temas (claro, escuro, alto contraste) = 156 combinações** e **falha** se houver violação.
- Duas checagens que reprovam: **axe-core** (WCAG 2.0, 2.1 e 2.2, níveis A e AA, as mesmas tags de
  hoje) e **rolagem lateral** da página.
- Uma checagem que só informa: **altura do Painel no celular** (hoje 4.109 px). Ela aparece no
  relatório e não reprova, porque a meta de 3.500 px depende de decisão da CGOV.
- Documentação didática: como rodar, como ler o relatório e como incluir uma tela nova.

## Fora do escopo

- Automação no GitHub (GitHub Actions). Por enquanto a verificação é só local.
- Corrigir telas. Se a varredura achar alguma violação, ela é apresentada antes de qualquer ajuste.
- Os outros scripts temporários (capturas de tela, interações): não entram.
- Nenhuma mudança em `src/utils/calculadoraRiscoRadar.ts` nem em `supabase/migrations/`.

## Abordagens consideradas

| Abordagem | Vantagem | Custo | Decisão |
|---|---|---|---|
| **1. Playwright Test + `@axe-core/playwright`** | Ferramenta padrão, com documentação oficial. Sobe o servidor sozinho, um teste por combinação, relatório em HTML, roda em paralelo | 2 dependências novas e um passo para instalar o Chromium | **Escolhida pelo usuário.** É a mais fácil de manter para a equipe da CGOV |
| 2. Trazer o `varredura.mjs` para `scripts/` | Muda pouco e tem menos conceitos | Script caseiro, sem relatório nem nome por combinação | Descartada |
| 3. Modo navegador do Vitest | Um só executor de testes | Recurso experimental | Descartada logo no início |

## Como fica (decisões tomadas por mim, que podem ser corrigidas)

- **Arquivos novos:**
  - `playwright.config.ts`: servidor, porta, relatório e largura base.
  - `tests/a11y/telas.ts`: lista das 13 telas com nome e rota. Incluir uma tela nova = acrescentar uma linha aqui.
  - `tests/a11y/varredura.a11y.ts`: gera os 156 testes com laços sobre tema × largura × tela.
  - `docs/04-ux/varredura-acessibilidade.md`: guia de uso.
- **Servidor:** o próprio Playwright roda `vite` na porta **5199**, a mesma do script antigo, com
  `--strictPort`. Se já houver um `npm run dev` nessa porta, ele aproveita esse servidor
  (`reuseExistingServer`). Escolhi o servidor de desenvolvimento, não o build, porque é mais rápido
  e foi nele que os 156 resultados da Fase 4 foram medidos. A verificação do build continua sendo
  feita pelo `npm run build`.
- **Tema:** antes de abrir a página, o teste grava `radar.preferencias-interface.v1` no navegador,
  do mesmo jeito que o script antigo fazia.
- **Espera:** o teste aguarda o `<h1>` da rota aparecer, em vez de usar uma pausa fixa de tempo.
  Assim os resultados não variam de uma execução para outra.
- **Mensagem de falha:** a lista de violações vem resumida (regra, número de elementos, primeiro
  seletor e o que corrigir), para que a mensagem já diga onde está o problema.
- **Separação dos testes:** os arquivos usam a terminação `.a11y.ts` e o Vitest passa a olhar só
  para `tests/unit/`. Assim o `npm test` continua rápido e não tenta rodar os testes do Playwright.
- **Versões:** `@playwright/test` **1.48.2**, a mesma do script antigo, que reaproveita o Chromium
  já instalado (`chromium-1140`), e `@axe-core/playwright` na versão 4.10 compatível. Instalação
  documentada: `npx playwright install chromium`.
  *Revisão durante a execução (aprovada pelo usuário):* subiu para **1.64.1**, porque a 1.48.2 tem
  alerta alto (GHSA-7mvr-c777-76hp). `playwright-core` foi fixado na mesma versão para evitar uma
  segunda cópia, que quebrava o `npm run build`.
- **Relatórios:** saída `list` no terminal e relatório HTML em `playwright-report/`, sem abrir
  sozinho. As pastas `playwright-report/` e `test-results/` entram no `.gitignore`.
- **Encerramento:** atualizar o `ESTADO-ATUAL.md` e o `design-system.md` (§9: como repetir a
  medição) e acrescentar o guia ao `MOC-Radar.md`.

## Fica para quem implementar

- O número de *workers* em paralelo (o padrão do Playwright serve).
- O texto exato das mensagens de falha.
