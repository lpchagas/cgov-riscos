# Importador antes da primeira carga real: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O importador da tabela da skill passa a ler o formato de 18 colunas (Teste de Integridade e evidência explícita), continua aceitando o de 16, e mostra na prévia, como aviso ou erro, tudo o que antes adivinhava ou fazia em silêncio.

**Architecture:** Leitura por posição, como hoje, em `src/utils/importadorSkillMarkdown.ts`; a versão é decidida por linha, pela quantidade de colunas. As regras novas usam o motor que já existe (`calcularRiscoCompletoRadar`, `validarRegraIntegridade`), sem mudar o cálculo. A gravação (`fichaDaSkillParaSalvar`) leva os campos novos. Nenhuma migração.

**Tech Stack:** Vue 3 + TypeScript, Vitest + @vue/test-utils.

**Spec:** [[2026-11-23-importador-primeira-carga-design]] (`docs/superpowers/specs/2026-11-23-importador-primeira-carga-design.md`)

## Global Constraints

- Leitura **por posição**; colunas numeradas de 1 a 18 nos textos (no código, índice 0 a 17).
- Versão por linha: 18 ou mais → formato novo (excedentes ignoradas); 17 → formato novo com col. 18 vazia; 10 a 12 e 14 a 16 → formato de hoje; 13 → erro do Regime A; menos de 10 → aviso de linha ignorada. Linha separadora (`|---|`) e linha de cabeçalho (1ª célula "ID", "Código" ou "Codigo") não contam.
- `N` nos textos = número da linha no texto colado (1 = primeira linha do texto, contando as linhas que não são de tabela).
- Erros bloqueiam o lote (como hoje); avisos não bloqueiam.
- Não mudar `calculadoraRiscoRadar.ts`, banco, RLS nem migrações. Não implementar o RF-187.
- Comparação sem diferença de acento e de maiúsculas sempre que o texto abaixo disser "sem diferença de acento".
- Testes só com dados de demonstração. Nunca abrir `_temp/`.
- Comentários didáticos em português do Brasil. "Crítico" só como fora da DAR (nunca a faixa > 17 a 25, que é **Extremo**). Nunca "PGR" para o Plano de Gestão de Riscos.
- Commit por tarefa, `tipo(importador): resumo` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O hook roda `vue-tsc` + `vitest`.
- Revisão: tarefas 1 a 3 com revisão completa por tarefa; tarefa 4 (docs), revisor `sonnet`. No fim, `/code-review` nível `medium` na branch e PR `Importador antes da primeira carga real`.

**Texto fixo** (`R-07` = código da linha, col. 1; `N` = número da linha no texto)

- Regime A (erro): `Linha N: a tabela parece ser do Regime A (13 colunas, sem 'Objeto de GR'). O RADAR só importa a matriz do Regime B (16 ou 18 colunas).`
- Linha curta (aviso): `Linha N ignorada: tem X colunas; a matriz do Regime B tem 16 ou 18.`
- Sintaxe (aviso, substitui o de hoje): `Linha R-07: a descrição não segue a sintaxe do item 4.2.1; a frase foi gravada como evento, e causa, consequência e objetivo ficam em branco para a unidade completar.`
- Evidência não lida (aviso): `Linha R-07: não foi possível ler se o controle tem evidência comprovada; o RADAR considerou sem evidência (eficácia máxima Fraco, Quadro 6).`
- Trava de evidência (aviso): `Linha R-07: a eficácia '<lida>' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6).` `<lida>` = nível e fator, ex.: `Mediano (0,75)`.
- Cálculo divergente (aviso): `Linha R-07: a skill informou inerente <a> e residual <b>; o RADAR calculou inerente <c> e residual <d> (Quadro 7 e Quadro 6). Valem os números do RADAR.` Números com vírgula decimal, na mesma formatação que a prévia já usa para o residual.
- Estratégia (aviso): `Linha R-07: estratégia '<lida>' não reconhecida; o RADAR gravou 'Mitigar'. Confira na ficha.` Célula vazia: `<lida>` = `(vazia)`.
- Col. 17 inválida (erro): `Linha R-07: o Teste de Integridade (col. 17) deve ser 'Sim' ou 'Não'.`
- Formato de 16 (aviso por linha): `Linha R-07: a tabela não traz o Teste de Integridade (formato de 16 colunas); confira na ficha se o risco envolve decisão sobre beneficiário, licença, fiscalização ou contratação (RN-006).`
- Prévia: `Formato: 18 colunas (com Teste de Integridade)` · `Formato: 16 colunas (sem Teste de Integridade; veja os avisos)` · `Formato: misto (linhas de 16 e de 18 colunas)`.

## Review Focus

1. **Tabela colada com linhas de texto antes dela** (título, parágrafo): o `N` das mensagens conta essas linhas (teste na Tarefa 1).
2. **Célula com "Evidência: Não" sem acento e em maiúsculas** (`EVIDENCIA: NAO`): lida como sem evidência, sem aviso de leitura (teste na Tarefa 2).
3. **Residual da skill com ponto decimal** (`10.8`) igual ao recálculo `10,8`: nenhum aviso de divergência (teste na Tarefa 2).
4. **Col. 17 "Sim" em risco de Integridade sem justificativa:** passa (a justificativa só é exigida fora da categoria Integridade) (teste na Tarefa 2).
5. **A tabela de 16 colunas da fixture de hoje** continua importando sem erro, só com avisos novos (teste na Tarefa 2).

---

### Task 1: Versão da linha, linhas ignoradas e Regime A

**Files:**
- Modify: `src/utils/importadorSkillMarkdown.ts:111-140` (tipo) e `:246-300` (laço)
- Create: `tests/unit/fixtures/skill/matriz-18-colunas.md`, `tests/unit/fixtures/skill/matriz-16-colunas.md` (dados de demonstração, 3 linhas cada: uma de Integridade, uma Operacional crítica com Mitigar, uma com frase fora da sintaxe)
- Test: `tests/unit/importadorSkillMarkdown.spec.ts`

**Interfaces:**
- Produces:
  - `LinhaImportadaSkill` ganha `linhaTexto: number` (o `N`), `formatoColunas: 16 | 18`, `testeIntegridadeAplicavel: boolean` (nesta tarefa, sempre `false`) e `justificativaNaoIntegridade?: string`.
  - `importarTabelaMarkdownSkill(...)` devolve `{ fichas, avisos, erros, formato: '16' | '18' | 'misto' | null }` (`null` quando não há ficha).
  - `export function contarFormato(fichas: LinhaImportadaSkill[]): '16' | '18' | 'misto' | null`

- [ ] **Step 1: Write the failing tests:** linha de 9 colunas na linha 4 do texto → `avisos` contém `Linha 4 ignorada: tem 9 colunas; a matriz do Regime B tem 16 ou 18.`; linha de 13 colunas → `erros` contém o texto do Regime A com o `N` certo; a fixture de 18 → `formato: '18'` e cada ficha com `formatoColunas: 18`; a fixture de 16 → `formato: '16'`; uma de cada → `'misto'`; linha de 17 colunas → `formatoColunas: 18`; texto com 2 parágrafos antes da tabela → o `N` conta essas linhas (Review Focus 1).
- [ ] **Step 2: Run** `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Numere as linhas **antes** de filtrar as que começam e terminam com `|`. A decisão de versão segue a tabela das Global Constraints. Mantenha o resto do laço como está.
- [ ] **Step 4: Run** `npx vue-tsc --noEmit && npx vitest run` — Expected: PASS (os testes de hoje continuam passando).
- [ ] **Step 5: Commit** `feat(importador): versão da linha (16 ou 18 colunas), linhas ignoradas e Regime A`

### Task 2: Regras por coluna (descrição, evidência, trava, cálculo, estratégia, Integridade)

**Files:**
- Modify: `src/utils/importadorSkillMarkdown.ts` (`extrairBowTieDaSintaxe` ~:145-177, `inferirEvidenciaNoTexto` ~:199-218, `normalizarEstrategia` ~:220-229, laço)
- Test: `tests/unit/importadorSkillMarkdown.spec.ts`

**Interfaces:**
- Consumes: Tarefa 1 (`formatoColunas`, `linhaTexto`).
- Produces:
  - `export function lerEvidencia(texto: string): boolean | null` — `true`/`false` pelo marcador `Evidência: sim|não` (sem diferença de acento e de maiúsculas, em qualquer ponto da célula); sem marcador, `false` para as expressões "sem evidência", "sem registro", "não comprovado", "inexistente", "informal" (sem diferença de acento); `null` nos demais casos (o chamador usa `false` e avisa).
  - `export function lerSimNao(texto: string): boolean | null` — "Sim"/"S" → `true`, "Não"/"Nao"/"N" → `false`, sem diferença de acento e de maiúsculas; outro → `null`.
  - `export function lerNumeroSkill(texto: string): number | null` — aceita vírgula ou ponto decimal; texto não numérico → `null`.
  - `normalizarEstrategia` passa a devolver `{ estrategia: EstrategiaTratamento; reconhecida: boolean }`.
- Regras (spec §4.3): frase fora da sintaxe → evento = frase inteira, causa/consequência/objetivo = `''`; evidência pela `lerEvidencia` (some a dedução pela eficácia); aviso de trava quando o nível lido é Mediano, Satisfatório ou Forte e a evidência é `false`; aviso de cálculo quando `|skill − RADAR| > 0,01` no inerente ou no residual (célula não numérica não é comparada); col. 17/18 só no formato 18, passadas a `validarRegraIntegridade` com os valores reais; aviso do formato de 16 em cada linha de 16.

- [ ] **Step 1: Write the failing tests** (um `it` por item, com o texto fixo exato):
  - frase fora da sintaxe → `causas === ''`, `consequencias === ''`, `objetivoAfetado === ''`, `eventoRisco` = frase, aviso de sintaxe;
  - `lerEvidencia('Previsto no ato. Evidência: sim')` → `true`; `'EVIDENCIA: NAO'` → `false` (Review Focus 2); `'sem evidencia formal'` → `false`; `'previsto no ato; funcionamento não comprovado'` → `false`; `'Checklist assinado'` → `null`;
  - célula sem marcador com "Mediano (0,75)" → `possuiEvidenciaControle === false`, `nivelEficaciaControle === 'Fraco'`, avisos de evidência não lida **e** de trava com `'Mediano (0,75)'`;
  - skill com inerente 12 e residual 9 para P=3, I=4, sem controle (RADAR: 18 e 18, Quadro 7 `[I=4][P=3]`) → aviso de cálculo; P=2, I=4 (inerente 12), controle Fraco com `Evidência: não`, skill com inerente `12` e residual `10.8` × RADAR `10,8` → sem aviso (Review Focus 3); célula `—` → sem aviso;
  - estratégia `Reduzir` → `Mitigar` + aviso com `'Reduzir'`; vazia → aviso com `(vazia)`; `Compartilhar` → sem aviso;
  - 18 colunas, col. 17 `Sim`, Operacional, col. 18 `curta` → erro da regra 3 de `validarRegraIntegridade`; col. 18 com 10+ caracteres → passa, `testeIntegridadeAplicavel === true`, `justificativaNaoIntegridade` preenchida; col. 17 `Talvez` ou vazia → erro da col. 17; col. 17 `Sim`, `Integridade: Nepotismo`, col. 18 vazia → passa (Review Focus 4);
  - 16 colunas → `testeIntegridadeAplicavel === false` e o aviso do formato de 16;
  - a fixture de 16 colunas da Tarefa 1 → `erros` vazio (Review Focus 5).
- [ ] **Step 2: Run** `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as interfaces e regras acima. Testes de hoje que dependiam da dedução da evidência pela eficácia mudam de expectativa (agora "sem evidência" + avisos): ajuste-os e diga quais no relatório.
- [ ] **Step 4: Run** `npx vue-tsc --noEmit && npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(importador): evidência, Teste de Integridade e avisos do que antes era silêncio`

### Task 3: Gravação e tela Importar

**Files:**
- Modify: `src/services/dados/conversores.ts:620-670` (`fichaDaSkillParaSalvar`), `src/views/ImportadorSkillView.vue` (resumo da prévia e texto de ajuda)
- Test: `tests/unit/conversores.spec.ts`, `tests/unit/importarPagina.spec.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2 (`formato`, `testeIntegridadeAplicavel`, `justificativaNaoIntegridade`, campos vazios, `possuiEvidenciaControle`).
- Produces: `fichaDaSkillParaSalvar` leva `testeIntegridadeAplicavel`, `justificativaNaoIntegridade`, `causas`/`consequencias`/`objetivoAfetado` como vieram (inclusive `''`) e a evidência lida no controle (`possuiEvidenciaComprovada`) e em `possuiEvidenciaControle`. A tela mostra a linha do formato (texto fixo) e o total de avisos e erros.

- [ ] **Step 1: Write the failing tests:** `conversores.spec.ts` — item com `testeIntegridadeAplicavel: true` e justificativa → a ficha leva os dois; item com causa `''` → `causas === ''`. `importarPagina.spec.ts` — enviar arquivo `.md`, `.txt` e `.markdown` (via `input type=file`) carrega a prévia (RF-162); colar a fixture de 18 mostra `Formato: 18 colunas (com Teste de Integridade)`; a de 16 mostra o texto do formato de 16 e o aviso de sintaxe (RF-171); o texto de ajuda cita 18 colunas.
- [ ] **Step 2: Run** `npx vitest run tests/unit/conversores.spec.ts tests/unit/importarPagina.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Só componentes que já existem na tela.
- [ ] **Step 4: Run** `npx vue-tsc --noEmit && npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(importador): gravação do Teste de Integridade e prévia com o formato`

### Task 4: Documentação, ADR-0020 e pedido da skill

**Files:**
- Create: `docs/adr/0020-tabela-da-skill-com-18-colunas.md` (modelo de Nygard, Status `Accepted`, como os ADRs vizinhos), `docs/02-arquitetura-cgti/pedido-skill-18-colunas.md` (texto pronto para o §3.9 e o §4 da `cgov-gestao-riscos`, a tabela do spec §4.1 e duas linhas de exemplo com dados de demonstração)
- Modify: `docs/10-nivel1-negocio/fluxos/FS-02-analise-ato-por-skills.md` ("Contrato com o Importar"), `docs/20-nivel2-requisitos/casos-de-uso/UC-13-importar-riscos-da-tabela-da-skill.md`, `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-162, RF-171, RF-178 a RF-182, RF-185, RF-186, RF-188, RF-194), `docs/20-nivel2-requisitos/rastreabilidade.md`, `docs/90-kanban/quadro.md` (cartão do importador → "Homologação CGOV"; cartão novo no Backlog "Aplicar o pedido de 18 colunas na skill `cgov-gestao-riscos` (repositório cgov-geral)"), `docs/90-kanban/analise-lacunas-codigo-requisitos.md`, `docs/00-memoria/ESTADO-ATUAL.md` (contagens de RF e de ADRs recontadas)
- Test: `tests/unit/documentacao.spec.ts`

- [ ] **Step 1:** Atualize os documentos (situação: "implementado no código em 2026-11-23; sem migração").
- [ ] **Step 2: Run** `npx vitest run tests/unit/documentacao.spec.ts` — Expected: PASS (sequência de ADRs, IDs, siglas).
- [ ] **Step 3: Commit** `docs(importador): contrato de 18 colunas, ADR-0020, requisitos e Kanban`
- [ ] **Step 4 (fim):** `/code-review` nível `medium` na branch; corrija o procedente; push da branch (repositório público: confira o diff); PR `Importador antes da primeira carga real` com o que entregou, os testes rodados e o que fica (pedido da skill no cgov-geral; RF-187).
