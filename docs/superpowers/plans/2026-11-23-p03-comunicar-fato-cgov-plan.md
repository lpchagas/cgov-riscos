# P-03 — Comunicações à CGOV: plano do desenho no Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar a página ✏️ Trabalho — Comunicações no arquivo RADAR — Painel, com os 4 quadros da P-03, para a CGOV aprovar antes do código.

**Architecture:** só Figma, pelo MCP (`use_figma`, `get_screenshot`), com instâncias da biblioteca. A moldura (cabeçalho, menu, rodapé) vem do quadro de trabalho do Monitoramento (`48:1786`, `48:1972`). Nenhum arquivo de `src/` nem migração.

**Tech Stack:** Figma (arquivo `T1AuuL9jEfqkP7uoAPTUFF`), skills `figma:figma-use` e `figma:figma-generate-design`.

**Spec:** `docs/superpowers/specs/2026-11-23-p03-comunicar-fato-cgov-design.md`

## Global Constraints

- Só componentes da biblioteca: `PageHeader`, `BrMessage`, `SegmentedControl`, `DataTable`, `SideSheet`, `FormField`, `BrButton`, `Chip`, `ItemMenu`. Falta de variante vira nota, nunca componente novo.
- Computador 1440, celular 390; no celular, nada passa da área útil do pai (conferir por medição, não só pela captura).
- Hipóteses com o texto do UC-16; prazo "dia N de 10 dias úteis (vence em dd/mm)"; fora do prazo avisa e não bloqueia.
- "Risco Crítico" = fora do apetite da DAR; "Plano de Gestão de Riscos" por extenso. Dados de demonstração, sem nome de pessoa.

## Review Focus

1. Risco emergente (IV) sem risco ligado: a lista mostra "—" e o formulário aceita.
2. Vindo do alerta do KRI: hipótese, ciência e riscos já preenchidos; caixas "supre I, II, III".
3. CGOV: painel só leitura com "Registrar ciência"; gestor não vê esse botão.
4. Fora do prazo: aviso, sem bloquear o envio.
5. Celular: painel em tela cheia, tabela vira lista de cartões, sem corte à direita.

---

### Task 1: Página e moldura

- [x] **Step 1:** criar a página ✏️ Trabalho — Comunicações depois de ✏️ Trabalho — Monitoramento; clonar a moldura do computador e do celular do Monitoramento; trocar a trilha e o conteúdo; acrescentar o item de menu "Comunicações à CGOV".

### Task 2: Lista do gestor (1440)

- [x] **Step 1:** `PageHeader`, `BrMessage` da regra, botão "Nova comunicação", filtro e `DataTable` com 5 linhas de demonstração (I, III, IV sem risco, V, alerta do KRI); `Chip` na situação e no prazo.

### Task 3: Painéis (1440)

- [x] **Step 1:** cópia da lista com o `SideSheet` "Nova comunicação" vindo do alerta do KRI (Review Focus 2 e 4).
- [x] **Step 2:** cópia da lista da CGOV (com Unidade) e o `SideSheet` da comunicação recebida, com "Registrar ciência" (Review Focus 3).

### Task 4: Celular (390)

- [x] **Step 1:** lista em cartões e o painel em tela cheia; medir transbordamento (Review Focus 5).

### Task 5: Fechamento

- [x] **Step 1:** nota da seção; linha P-03 do [[mapa-telas]] e cartão P-03 do [[quadro]] com os nós; commit.
