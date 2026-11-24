# P-01 — Apetite (DAR), aba "Proposta e rito": plano do desenho no Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** desenhar 5 quadros novos na página ✏️ Trabalho — Apetite (DAR) do arquivo RADAR — Painel, para a CGOV aprovar antes do código.

**Architecture:** só Figma, pelo MCP (`create_session`, `search_design_system`, `use_figma`, `get_screenshot`), com instâncias dos componentes da biblioteca. Nenhum arquivo de `src/` nem migração. A 📌 Original fica intocada.

**Tech Stack:** Figma (arquivo `T1AuuL9jEfqkP7uoAPTUFF`), skills `figma:figma-use` e `figma:figma-generate-design`.

**Spec:** `docs/superpowers/specs/2026-11-23-p01-dar-proposta-e-rito-design.md`

## Global Constraints

- Só componentes da biblioteca: `BrTabs`, `BrStep`, `SegmentedControl`, `DataTable`, `Dialog`, `BrMessage`, `StatCard`, `BrButton`, `RiskBadge` (e a moldura `BrHeader`, `ItemMenu`, `BrFooter`). Falta de variante vira nota no quadro, nunca componente novo.
- Tamanhos: computador 1440, celular 390. Tokens e textos em pt-BR.
- "Risco Crítico" = residual fora do apetite da DAR; nunca chamar o nível > 17 a 25 de "Crítico" (é "Extremo"). "Plano de Gestão de Riscos" por extenso, nunca a sigla.
- Apetite só "Baixo" ou "Moderado", ou "Pendente de DAR".
- Dados de demonstração, sem nome de pessoa.
- Sem `add_code_connect_map`.

## Review Focus

1. Celular 390: a tabela das 8 categorias com 5 colunas não cabe; esperado: cada categoria vira um cartão empilhado, e o `BrStep` fica vertical.
2. Aba Vigente para a CGOV: nenhum controle editável aparece (o `SegmentedControl` some).
3. Etapa 2 (aguardando o CTGRIC): a minuta aparece travada, e as etapas 2 a 4 têm link para a P-05 e a P-10, sem botão de registro na própria aba.
4. Prazo: nenhum contador na etapa 1; o contador aparece só em "incorporar as ressalvas" (decisão de 2026-11-23).
5. Diálogo "Encaminhar ao CTGRIC": traz o aviso "O Plano de Gestão de Riscos segue por fora até a tela P-04".

---

### Task 1: Reconhecimento do arquivo

- [ ] **Step 1:** `create_session` no arquivo `T1AuuL9jEfqkP7uoAPTUFF`; carregar a skill `figma:figma-use`.
- [ ] **Step 2:** listar as páginas e achar a ✏️ Trabalho — Apetite (DAR) e os quadros que já estão nela (ids e posição), para pôr os novos ao lado, sem sobrepor.
- [ ] **Step 3:** `search_design_system` para cada componente das restrições; anotar a chave e as variantes de `BrTabs`, `BrStep` e `SegmentedControl`. Esperado: todos encontrados; o que faltar vai para a lista de notas.

### Task 2: Quadros "Vigente (só leitura)", 1440 e 390

- [ ] **Step 1:** criar o quadro de computador com a moldura, `BrTabs` (Vigente ativa), selo "sem DAR publicada", `BrMessage` informativo ("O apetite vigente só muda pela portaria da DAR. Para propor mudança, use a aba Proposta e rito."), `StatCard`s e a lista das 8 categorias com o apetite em texto e a portaria ("—" quando pendente).
- [ ] **Step 2:** criar o de celular com o mesmo conteúdo empilhado.
- [ ] **Step 3:** `get_screenshot` dos dois; conferir o item 2 do Review Focus.

### Task 3: Quadros "Proposta e rito — etapa 1, minuta em edição", 1440 e 390

- [ ] **Step 1:** computador: `BrTabs` (Proposta e rito ativa); `BrStep` com 5 etapas (Minuta da CGOV ativa; CTGRIC, com "incorporar as ressalvas"; CIG; Portaria do Presidente; Vigente); `DataTable` com as 8 categorias (Vigente, Proposto com `SegmentedControl`, Efeito na criticidade, "Editar"); `BrButton` "Salvar minuta" (secundário) e "Encaminhar ao CTGRIC" (primário).
- [ ] **Step 2:** ao lado, o `Dialog` de confirmação do encaminhamento, com a data e o aviso do Plano (Review Focus 5).
- [ ] **Step 3:** celular: `BrStep` vertical, um cartão por categoria (Review Focus 1), botões em largura total.
- [ ] **Step 4:** `get_screenshot`; conferir os itens 1, 4 e 5 do Review Focus.

### Task 4: Quadro "Proposta e rito — etapa 2, aguardando o CTGRIC", 1440

- [ ] **Step 1:** `BrStep` com a etapa 1 cumprida (data do encaminhamento) e a 2 ativa; tabela sem `SegmentedControl`; link "Registrar na tela do rito (P-05)" nas etapas 2 e 3 e "Registrar publicação (P-10)" na 4; `BrMessage` "Minuta encaminhada ao CTGRIC em <data>; fica só de leitura até voltar com as ressalvas ou com a reprovação do CIG."
- [ ] **Step 2:** `get_screenshot`; conferir o item 3 do Review Focus.

### Task 5: Fechamento

- [ ] **Step 1:** atualizar a linha P-01 do [[mapa-telas]] §2 (página Figma "desenhada em 2026-11-23, aguardando a CGOV"; componentes usados) e o cartão P-01 do [[quadro]] (coluna Modelagem, com os nós dos quadros).
- [ ] **Step 2:** commit `docs(p-01): ...` (o hook roda o `documentacao.spec.ts`).
