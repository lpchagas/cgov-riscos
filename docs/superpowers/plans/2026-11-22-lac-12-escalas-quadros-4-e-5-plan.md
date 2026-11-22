# LAC-12 — Escalas dos Quadros 4 e 5: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o formulário, a matriz e o importador usarem os nomes e as descrições literais dos Quadros 4 (probabilidade) e 5 (impacto), sem percentuais, e fazer o importador recusar a probabilidade ou o impacto que não puder ler.

**Architecture:** Um módulo único (`src/utils/escalasProbabilidadeImpacto.ts`) guarda os 5 níveis de cada quadro (número, nome, descrição) e a função que lê uma célula do importador. O formulário mostra os níveis num componente novo de botões de opção com a descrição à vista (`GrupoOpcoesDescritas.vue`); a matriz e o importador leem os nomes do mesmo módulo. O banco, as migrações e o cálculo não mudam.

**Tech Stack:** Vue 3 + TypeScript, Vitest + @vue/test-utils, Playwright + @axe-core/playwright.

**Spec:** [[2026-11-22-lac-12-rotulos-quadro-4-design]] (`docs/superpowers/specs/2026-11-22-lac-12-rotulos-quadro-4-design.md`)

## Global Constraints

- Nomes e descrições **literais** da [[matriz-regras-regime-b]] §6 (Quadro 4) e §7 (Quadro 5); nenhum percentual em tela, mensagem ou comentário sobre a escala.
- Quadro 4: (1) Raro, (2) Pouco provável, (3) Provável, (4) Muito provável, (5) Praticamente certo. Quadro 5: (1) Muito baixo, (2) Baixo, (3) Médio, (4) Alto, (5) Muito alto.
- Não tocar em `src/utils/calculadoraRiscoRadar.ts`, em `supabase/` nem no gatilho do banco. Nenhuma migração.
- Comentários didáticos em português do Brasil; nunca "PGR" para o Plano de Gestão de Riscos; "Crítico" só como fora da DAR.
- Commit por tarefa, `tipo(escopo): resumo` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O hook roda `vue-tsc` + `vitest`; não rode `npm test` só para conferir antes do commit.
- Revisão: tarefas 1 a 4, uma revisão completa por tarefa; tarefa 5 (docs/Figma), revisor `sonnet`.

## Review Focus

1. **Risco já gravado aberto para edição:** a ficha com P = 3 e I = 4 abre a etapa 3 com "3 — Provável" e "4 — Alto" marcados (teste na Tarefa 4).
2. **Grafias da skill:** "Provavel", "PROVÁVEL", " provável " e "Provável (3)" valem 3; "3,5", "2 a 3" e "3 — Raro" recusam a linha (testes na Tarefa 1).
3. **Tabela antiga com P ou I vazio**, que antes passava como 3, agora recusa a linha com o motivo, e as outras linhas continuam importadas (teste na Tarefa 2).
4. **Teclado e leitor de tela na etapa 3:** Tab entra no grupo, as setas trocam a opção, o grupo tem nome e o erro é anunciado. A varredura axe cobre a etapa 3 (teste na Tarefa 4).
5. **Celular:** "Praticamente certo" no eixo da matriz não quebra a grade em 360 px. Coberto pela varredura `painelCelular.a11y.ts`, mais uma captura conferida na Tarefa 3.

---

### Task 1: Módulo único das escalas dos Quadros 4 e 5

**Files:**
- Create: `src/utils/escalasProbabilidadeImpacto.ts`
- Modify: `src/types/radar.types.ts:19-25` (comentário de `NivelProbabilidade`: nomes do Quadro 4, sem percentuais; apontar para o módulo novo)
- Test: `tests/unit/escalasProbabilidadeImpacto.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface NivelDescrito<N extends number> { valor: N; nome: string; descricao: string }
  export const ESCALA_PROBABILIDADE_QUADRO_4: readonly NivelDescrito<NivelProbabilidade>[]  // 5 itens, valor 1..5 em ordem
  export const ESCALA_IMPACTO_QUADRO_5: readonly NivelDescrito<NivelImpacto>[]
  export function nomeDoNivel<N extends number>(escala: readonly NivelDescrito<N>[], valor: N): string
  export type LeituraNivel<N> = { ok: true; nivel: N } | { ok: false; motivo: string }
  export function lerNivelDaCelula<N extends number>(celula: string, escala: readonly NivelDescrito<N>[]): LeituraNivel<N>
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe('escalas dos Quadros 4 e 5', () => {
  it('Quadro 4 tem os 5 nomes literais, em ordem', () => {
    expect(ESCALA_PROBABILIDADE_QUADRO_4.map((n) => [n.valor, n.nome])).toEqual([
      [1, 'Raro'], [2, 'Pouco provável'], [3, 'Provável'], [4, 'Muito provável'], [5, 'Praticamente certo'],
    ]);
  });
  it('Quadro 5 tem os 5 nomes literais, em ordem', () => { /* Muito baixo … Muito alto */ });
  it('as descrições são as da matriz de regras', () => {
    expect(ESCALA_PROBABILIDADE_QUADRO_4[0].descricao).toBe('Acontece apenas em situações excepcionais. Não há histórico conhecido do evento ou não há indícios que sinalizem sua ocorrência.');
    expect(ESCALA_IMPACTO_QUADRO_5[4].descricao).toBe('Compromete totalmente ou quase totalmente o atingimento do objetivo/resultado.');
  });
  it('nenhum nome nem descrição tem "%"', () => { /* todas as 10 entradas */ });
  it.each([['3', 3], ['Provável', 3], ['provavel', 3], [' PROVÁVEL ', 3], ['3 — Provável', 3], ['3 - Provável', 3], ['Provável (3)', 3], ['3 (Provável)', 3], ['Praticamente certo', 5]])(
    'lê "%s" como %i', (celula, esperado) => {
      expect(lerNivelDaCelula(celula, ESCALA_PROBABILIDADE_QUADRO_4)).toEqual({ ok: true, nivel: esperado });
    });
  it.each(['', '0', '6', '-1', '3,5', '2 a 3', 'abc', 'Média', '3 — Raro'])('recusa "%s"', (celula) => {
    const r = lerNivelDaCelula(celula, ESCALA_PROBABILIDADE_QUADRO_4);
    expect(r.ok).toBe(false);
  });
  it('explica a divergência entre número e nome', () => {
    expect(lerNivelDaCelula('3 — Raro', ESCALA_PROBABILIDADE_QUADRO_4)).toEqual({ ok: false, motivo: 'o número (3) e o nome ("Raro") não concordam' });
  });
  it('nomeDoNivel devolve o nome', () => { expect(nomeDoNivel(ESCALA_IMPACTO_QUADRO_5, 4)).toBe('Alto'); });
});
```

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/escalasProbabilidadeImpacto.spec.ts`. Esperado: FAIL, porque o módulo não existe.

- [ ] **Step 3: Implementar o módulo.** As descrições são copiadas da matriz de regras §6 e §7. Regra de `lerNivelDaCelula`: tirar os espaços das pontas; vazio recusa (motivo `'célula vazia'`). Os números saem com `/-?\d+/g`: mais de um número (inclusive "3,5" e "2 a 3") recusa (`'mais de um número'`); um número fora de 1 a 5 recusa (`'fora de 1 a 5'`). O nome é o que sobra depois de tirar dígitos, `—`, `-`, `(` e `)`. Ele é comparado sem caixa, sem acento (`normalize('NFD')` sem as marcas) e com os espaços juntados. Nome desconhecido recusa (`'nome fora do quadro'`); número e nome que não concordam recusam com o motivo do teste. Comentário didático no topo, com exemplos.

- [ ] **Step 4: Rodar e ver passar.** Mesmo comando. Esperado: PASS.

- [ ] **Step 5: Commit.** `feat(lac-12): escalas literais dos Quadros 4 e 5 num módulo único`

### Task 2: Importador reconhece os nomes e recusa o que não lê (RF-176, RF-177)

**Files:**
- Modify: `src/utils/importadorSkillMarkdown.ts:335-336`
- Test: `tests/unit/importadorSkillMarkdown.spec.ts`

**Interfaces:**
- Consumes: `lerNivelDaCelula`, `ESCALA_PROBABILIDADE_QUADRO_4`, `ESCALA_IMPACTO_QUADRO_5` (Tarefa 1).

- [ ] **Step 1: Escrever os testes que falham** (reaproveitar a tabela da linha 13 e trocar só as colunas P e I):
  - `'reconhece "Provável" e "Alto" sem número (RF-176)'`: `fichas[0].probabilidade === 3`, `impacto === 4`, `nivelInerente === 18`, `erros` vazio.
  - `'recusa P vazio, 0, 6 e ilegível sem converter (RF-177)'`: 4 linhas (P = `''`, `'0'`, `'6'`, `'abc'`) + 1 linha válida. Esperado: `fichas.length === 1` e `erros.length === 4`, e `erros[0]` igual a `Linha RSC-A: probabilidade inválida (""): célula vazia. Use 1 a 5 ou um nome do Quadro 4: (1) Raro; (2) Pouco provável; (3) Provável; (4) Muito provável; (5) Praticamente certo.`
  - `'recusa impacto fora de 1 a 5'`: I = `'-1'`. O erro é `Linha RSC-X: impacto inválido ("-1"): fora de 1 a 5. Use 1 a 5 ou um nome do Quadro 5: (1) Muito baixo; (2) Baixo; (3) Médio; (4) Alto; (5) Muito alto.` (masculino: "o impacto"; feminino: "a probabilidade").
  - `'recusa número e nome que não concordam'`: P = `'3 — Raro'`; o erro contém `não concordam`.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts`.

- [ ] **Step 3: Implementar.** Trocar as duas linhas `Math.min(5, Math.max(1, parseInt(...) || 3))` por `lerNivelDaCelula`. Se a leitura falhar, `erros.push(...)` com o texto do teste (a lista do quadro é montada a partir da escala) e `continue`, igual à recusa de categoria. Atualizar o comentário do cabeçalho do arquivo, se ele falar em conversão para 3.

- [ ] **Step 4: Rodar o arquivo e `tests/unit/importarPagina.spec.ts`.** Esperado: PASS. Se algum exemplo antigo tinha P ou I vazio, corrija o exemplo; não afrouxe a regra.

- [ ] **Step 5: Commit.** `fix(importador): probabilidade e impacto pelos Quadros 4 e 5, sem conversão silenciosa`

### Task 3: Componente `GrupoOpcoesDescritas` e matriz com os nomes novos

**Files:**
- Create: `src/components/ui/GrupoOpcoesDescritas.vue`
- Modify: `src/components/ui/tipos.ts` (tipo `OpcaoDescrita`)
- Modify: `src/components/radar/MatrizCalorAssimetrica.vue:44-58` (apagar `NOME_IMPACTO` e `NOME_PROBABILIDADE`; usar `nomeDoNivel`)
- Test: `tests/unit/componentesUi.spec.ts` (novo `describe('GrupoOpcoesDescritas')`), `tests/unit/painelPiloto.spec.ts` (bloco `MatrizCalorAssimetrica`, linha 134)

**Interfaces:**
- Consumes: `nomeDoNivel` e as escalas (Tarefa 1).
- Produces:
  ```ts
  // tipos.ts
  export interface OpcaoDescrita<T> { valor: T; rotulo: string; descricao: string }
  // GrupoOpcoesDescritas.vue — <script setup generic="V extends string | number">
  props: { modelValue: V | null; opcoes: OpcaoDescrita<V>[]; legenda: string; obrigatorio?: boolean; ajuda?: string; erro?: string }
  emits: { 'update:modelValue': [valor: V] }
  ```
  Estrutura: `<fieldset>` com `aria-describedby` (ids da ajuda e do erro, como no `FormField`). Dentro, a `<legend>` com `*` e "(obrigatório)" só para o leitor de tela, e um `<label>` por opção, que envolve o `<input type="radio">` nativo (mesmo `name`, gerado com `useId`), o rótulo em negrito e a descrição. Com erro, todo `input` recebe `aria-invalid="true"` (é o que o `focarPrimeiroErro` do formulário procura), e o erro aparece num `<p role="alert">`. Estilos com os tokens já usados no `FormField`.

- [ ] **Step 1: Escrever os testes que falham**
  - `GrupoOpcoesDescritas`: a legenda aparece; 5 `input[type=radio]`, nenhum marcado com `modelValue: null`; marcar o 3º emite `update:modelValue` com `3`; com `modelValue: 2`, o 2º fica `checked`; com `erro: 'Escolha'`, há `[role=alert]` com o texto, o `fieldset` tem `aria-describedby` com o id do erro e todo radio tem `aria-invalid="true"`; a descrição de cada opção fica dentro do `label` dela.
  - `MatrizCalorAssimetrica`: o eixo mostra `Raro` e `Praticamente certo`; o `aria-label` da célula P = 1, I = 5 começa com `Probabilidade 1 (Raro), impacto 5 (Muito alto)`; o texto da matriz não tem `Muito baixa` nem `Média`.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/componentesUi.spec.ts tests/unit/painelPiloto.spec.ts`.

- [ ] **Step 3: Implementar o componente e trocar os nomes na matriz.**

- [ ] **Step 4: Rodar e ver passar.** Mesmo comando. Depois, `npx playwright test tests/a11y/painelCelular.a11y.ts`, e uma captura do Painel em 360 px (skill `run`) para conferir que "Praticamente certo" não quebra a grade. Se quebrar, ajuste só o CSS do eixo (quebra de linha ou fonte menor), sem abreviar o nome.

- [ ] **Step 5: Commit.** `feat(ui): GrupoOpcoesDescritas e eixo da matriz com os nomes do Quadro 4`

### Task 4: Etapa 3 do formulário com os botões de opção

**Files:**
- Modify: `src/views/FormularioRiscoView.vue:219-231` (apagar `PROBABILIDADES` e `IMPACTOS`; montar as opções das escalas com `rotulo: \`${valor} — ${nome}\``), `:518-532` (trocar os dois `FormField` + `select` por `GrupoOpcoesDescritas`) e `:519` (texto da etapa)
- Test: `tests/unit/novoRiscoPagina.spec.ts:310-312`, `tests/a11y/telas.ts` + `tests/a11y/varredura.a11y.ts` (cobertura da etapa 3)

**Interfaces:**
- Consumes: `GrupoOpcoesDescritas`, `OpcaoDescrita` (Tarefa 3); escalas (Tarefa 1). `d.probabilidade` e `d.impacto` continuam `NivelProbabilidade | null` e `NivelImpacto | null`; os erros continuam `erros.probabilidade` e `erros.impacto`, de `formularioRisco.ts:138-139`.

- [ ] **Step 1: Escrever e ajustar os testes**
  - Trocar a verificação das linhas 310-312: `w.find('input[type=radio][value="3"]:checked')`. A leitura deve achar os dois radios marcados, o de P (`risco.probabilidade`) e o de I (`risco.impacto`), um em cada grupo.
  - Novo: `'etapa 3 mostra os nomes e as descrições dos Quadros 4 e 5, sem percentuais'`. O texto da etapa contém `1 — Raro`, `5 — Praticamente certo`, `Evento esperado, de frequência reduzida` e `4 — Alto`, e não contém `%`.
  - Novo: `'avançar sem probabilidade anuncia o erro e foca o primeiro botão do grupo'`. Aparece `Escolha a probabilidade (1 a 5).` e `document.activeElement` é o primeiro radio da probabilidade (montar com `attachTo: document.body`).
  - Varredura axe da etapa 3: acrescentar a `Tela` um campo opcional `avancarEtapas?: number`; em `abrirTela`, clicar em "Avançar" esse número de vezes antes de rodar o axe; incluir em `TELAS` `{ nome: 'novo-etapa3', rota: '/riscos/novo?editar=risco-anexo-ii-01', titulo: 'Editar risco …', avancarEtapas: 2 }` (o título exato vem do código da semente).

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/novoRiscoPagina.spec.ts`.

- [ ] **Step 3: Implementar.** Texto da etapa: `Escolha a probabilidade pelo histórico do evento (Quadro 4) e o impacto pelo efeito no objetivo (Quadro 5). A nota inerente vem da tabela do Quadro 7: o impacto pesa mais que a probabilidade.` Os dois grupos ficam um abaixo do outro no celular; no computador, decida entre uma coluna e duas, pelo que for legível.

- [ ] **Step 4: Rodar e ver passar.** `npx vitest run tests/unit/novoRiscoPagina.spec.ts` e `npm run test:a11y`. Esperado: PASS e nenhuma violação nova.

- [ ] **Step 5: Commit.** `fix(lac-12): etapa 3 do formulário com as escalas dos Quadros 4 e 5`

### Task 5: Documentação, Kanban e Figma

**Files:**
- Modify: `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (linhas 49 e 75: LAC-12 resolvida em 2026-11-22, com a situação antes da correção, no molde das LAC-14 e LAC-15)
- Modify: `docs/20-nivel2-requisitos/regras-negocio.md:59` (RN-011), `requisitos-funcionais.md:110, 326, 327` (RF-037, RF-176, RF-177: implementados), `rastreabilidade.md:94, 289`
- Modify: `docs/20-nivel2-requisitos/casos-de-uso/UC-06-analisar-risco-e-avaliar-controles.md:35`, `UC-13-importar-riscos-da-tabela-da-skill.md:46` (só a parte de P e I do 5a)
- Modify: `docs/01-normativos/matriz-regras-regime-b.md:91` (tirar o "Atenção"; dizer que o RADAR usa os nomes e as descrições do quadro)
- Modify: `docs/00-memoria/pendencias-ui-piloto.md` (AG-04 resolvida), `docs/90-kanban/quadro.md` (linha 76 concluída; linha 14: tirar LAC-12 e RF-177 e a parte "P/I só com o nome da escala, 0, acima de 5 ou negativo convertidos sem aviso"), `docs/90-kanban/analise-lacunas-codigo-requisitos.md:50`, `docs/00-memoria/ESTADO-ATUAL.md:51`

- [ ] **Step 1: Atualizar os documentos.** Use `grep -rn "LAC-12\|Muito baixa\|90%" docs` para não esquecer nenhuma menção. Os percentuais só podem sobrar no trecho que descreve a situação antes da correção.
- [ ] **Step 2: Rodar `npx vitest run tests/unit/documentacao.spec.ts`.** Esperado: PASS.
- [ ] **Step 3: Commit.** `docs(lac-12): LAC-12 resolvida; RF-037, RF-176 e RF-177 implementados`
- [ ] **Step 4: Figma** (skill `figma:figma-use` antes de `use_figma`; `create_session` com o fileKey `T1AuuL9jEfqkP7uoAPTUFF`). Com `search_design_system`, ache o componente da matriz e diga se ele está publicado. Na cópia **Trabalho**, troque o texto do eixo da probabilidade por Raro … Praticamente certo. Não crie o `GrupoOpcoesDescritas` na biblioteca. Termine a resposta com o bloco "O que você precisa fazer no Figma" e a tabela de 4 colunas só com a `MatrizCalorAssimetrica` (`src/components/radar/MatrizCalorAssimetrica.vue`). Nas instruções para o MCP: eixo P com os nomes do Quadro 4 sem percentuais; nota lida do Quadro 7, nunca P × I; Quadro 8 sem arredondar; "Crítico" = fora da DAR.
