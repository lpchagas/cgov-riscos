# P-10 — Registrar a publicação da DAR e do Plano de Gestão de Riscos: plano do desenho no Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar a página ✏️ Trabalho — Publicação (DAR e Plano) no arquivo RADAR — Painel, com 6 quadros, para a CGOV aprovar antes do código.

**Architecture:** só Figma, pelo MCP (`create_session`, `search_design_system`, `use_figma`, `get_screenshot`), com instâncias dos componentes da biblioteca. Nenhum arquivo de `src/` nem migração. Não há 📌 Original: ela nasce depois do código (como na P-03).

**Tech Stack:** Figma (arquivo `T1AuuL9jEfqkP7uoAPTUFF`), skills `figma:figma-use` e `figma:figma-generate-design`.

**Spec:** `docs/superpowers/specs/2026-11-27-p10-publicacao-dar-plano-design.md`

## Global Constraints

- Só componentes da biblioteca: `BrMessage`, `Chip`, `FormField`, `BrButton`, `Dialog`, `DataTable`, `RiskBadge` (e a moldura `BrHeader`, `ItemMenu`, `BrFooter`). Falta de variante vira nota no quadro, nunca componente novo.
- Tamanhos: computador 1440, celular 390. Tokens e textos em pt-BR.
- "Risco Crítico" = residual fora do apetite da DAR; nunca chamar o nível > 17 a 25 de "Crítico" (é "Extremo"). "Plano de Gestão de Riscos" por extenso, nunca a sigla.
- Apetite só "Baixo" ou "Moderado", ou "Pendente de DAR".
- Dados claramente fictícios ("Portaria nº 000/2026 (exemplo)"), sem nome de pessoa e sem imitar um ato real.
- Sem `add_code_connect_map`.

## Review Focus

1. Celular 390: os três blocos e os campos empilham em largura total; a lista "Categorias que mudam" vira linhas "Categoria: vigente → minuta", sem tabela larga.
2. Blocos 2 e 3 (Plano): os campos aparecem travados, com o aviso "Depende da tela do Plano de Gestão de Riscos (P-04)", e sem botão ativo.
3. Diálogo de confirmação: repete número, data e link, e avisa que os riscos aprovados das categorias que mudaram são reavaliados e os que passarem a ser críticos voltam à homologação.
4. Diálogo "Retificar": motivo obrigatório, e o aviso "A retificação corrige o registro. O apetite e a criticidade não mudam."
5. Quadro "Publicada": "Retificar" é secundário, o formulário some, e o histórico mostra data, perfil (CGOV) e motivo, sem nome de pessoa.

---

### Task 1: Reconhecimento do arquivo

- [ ] **Step 1:** `create_session` no arquivo `T1AuuL9jEfqkP7uoAPTUFF`; carregar a skill `figma:figma-use`.
- [ ] **Step 2:** listar as páginas; ler a moldura (cabeçalho, menu e rodapé) de um quadro da ✏️ Trabalho — Comunicações (P-03), para copiar o padrão de página nova.
- [ ] **Step 3:** `search_design_system` para cada componente das restrições; anotar a chave e as variantes de `Chip`, `FormField` (estado desabilitado) e `Dialog`. Esperado: todos encontrados; o que faltar vai para a lista de notas.

### Task 2: Página nova e quadros "P-10 · Pronta para registrar", 1440 e 390

- [ ] **Step 1:** criar a página "✏️ Trabalho — Publicação (DAR e Plano)".
- [ ] **Step 2:** computador: moldura; título "Publicação da DAR e do Plano de Gestão de Riscos"; `BrMessage` informativo "O Presidente publica os atos fora do RADAR. A CGOV registra aqui o que foi publicado."; bloco 1 conforme a spec §4.2 (`Chip` "Pronta para registrar", deliberação do CIG em 05/12/2026 com link para Apetite (DAR), categorias que mudam, efeito "2 riscos entram e 1 sai do Risco Crítico" com "Ver", três `FormField`, `BrButton` primário "Registrar portaria"); blocos 2 e 3 conforme a §4.3, travados (Review Focus 2).
- [ ] **Step 3:** celular com o mesmo conteúdo empilhado (Review Focus 1).
- [ ] **Step 4:** `get_screenshot` dos dois; conferir os itens 1 e 2 do Review Focus.

### Task 3: Quadro "P-10 · Confirmar o registro", 1440

- [ ] **Step 1:** o quadro de computador escurecido com o `Dialog` "Confirmar o registro da portaria da DAR": os dados digitados, o aviso da spec §4.2 e os botões "Voltar" e "Registrar portaria".
- [ ] **Step 2:** `get_screenshot`; conferir o item 3 do Review Focus.

### Task 4: Quadros "P-10 · Publicada, com histórico", 1440 e 390, e "P-10 · Retificar", 1440

- [ ] **Step 1:** computador: bloco 1 com `Chip` "Publicada", "Portaria nº 000/2026 (exemplo), de 10/12/2026", link, `BrButton` secundário "Retificar" e o histórico (registro em 10/12/2026 e retificação em 11/12/2026, com o motivo "erro de digitação no número"); blocos 2 e 3 travados.
- [ ] **Step 2:** celular empilhado.
- [ ] **Step 3:** `Dialog` "Retificar o registro da portaria": número, data e link editáveis, motivo obrigatório e o aviso (Review Focus 4).
- [ ] **Step 4:** `get_screenshot`; conferir os itens 4 e 5 do Review Focus.

### Task 5: Fechamento

- [ ] **Step 1:** atualizar a linha P-10 do [[mapa-telas]] §2 (página Figma, "desenhada em 2026-11-27, aguardando a CGOV", componentes usados), o cartão P-10 do [[quadro]] (com os nós dos quadros) e o [[ESTADO-ATUAL]].
- [ ] **Step 2:** commit `docs(p10): ...` (o hook roda o `documentacao.spec.ts`).
