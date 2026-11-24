# P-02 — Monitoramento, tratar alerta de KRI: plano do desenho no Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** alinhar a página ✏️ Trabalho — Monitoramento (e a etapa 4 do formulário) ao código da LAC-03 e desenhar ao lado os quadros da P-02, para a CGOV aprovar antes do código.

**Architecture:** só Figma, pelo MCP (`create_session`, `search_design_system`, `use_figma`, `get_screenshot`), com instâncias dos componentes da biblioteca. Nenhum arquivo de `src/` nem migração. As páginas 📌 Original ficam intocadas.

**Tech Stack:** Figma (arquivo `T1AuuL9jEfqkP7uoAPTUFF`), skills `figma:figma-use` e `figma:figma-generate-design`.

**Spec:** `docs/superpowers/specs/2026-11-23-p02-tratar-alerta-kri-design.md`

## Global Constraints

- Só componentes da biblioteca: `StatCard`, `BrTabs`, `BrMessage`, `BrButton`, `Dialog`, `FormField`, `Chip`, `RiskBadge` (e a moldura `BrHeader`, `ItemMenu`, `BrFooter`). Falta de variante vira nota no quadro, nunca componente novo.
- Tamanhos: computador 1440, celular 390. Textos em pt-BR.
- Frase do limite: "Alerta quando o valor for <operador> <número> <unidade>"; operadores: "maior que", "maior ou igual a", "menor que", "menor ou igual a".
- Prazo: "dia N de 10 dias úteis" e "vence em dd/mm"; vencido: "Prazo vencido há N dias úteis" (tom perigo, sem bloquear).
- "Risco Crítico" = residual fora do apetite da DAR; nunca chamar o nível > 17 a 25 de "Crítico". "Plano de Gestão de Riscos" por extenso.
- Dados de demonstração, sem nome de pessoa. Sem `add_code_connect_map`.

## Review Focus

1. KRI ligado a vários riscos: um botão "Reavaliar" por risco, e um só "Comunicar à CGOV" por alerta.
2. Celular 390: a faixa cabe na largura do cartão; os botões ficam empilhados em largura total.
3. Os quatro estados do cartão aparecem lado a lado: dentro do limite, em alerta (dia 3 de 10), prazo vencido, alerta comunicado.
4. KRI com "limite a converter": a etapa 4 mostra o texto antigo só para leitura com o aviso; a leitura diz "Sem limite numérico: o sistema não verifica o alerta".
5. Janela "Registrar leitura": não há mais caixa de marcar "passou do limite".

---

### Task 1: Reconhecimento do arquivo

- [x] **Step 1:** `create_session` no arquivo `T1AuuL9jEfqkP7uoAPTUFF`; carregar a skill `figma:figma-use`.
- [x] **Step 2:** achar a ✏️ Trabalho — Monitoramento e a ✏️ Trabalho — Novo risco (etapa 4) e os quadros que já estão nelas (ids e posição).
- [x] **Step 3:** `search_design_system` para cada componente das restrições; anotar as variantes de `BrMessage` (tons), `FormField` (lista, número) e `StatCard`. O que faltar vai para as notas.

### Task 2: Base alinhada ao código (fecha o cartão "Atualizar no Figma a etapa 4 … KRI compartilhado")

- [x] **Step 1:** na ✏️ Trabalho — Monitoramento, ajustar a aba Indicadores: um cartão por KRI, com "Riscos ligados" e "limite não definido" quando vazio (como `MonitoramentoKriPlanoAcaoView.vue`).
- [x] **Step 2:** na ✏️ Trabalho — Novo risco, etapa 4: campos do KRI (nome, fórmula, fonte, periodicidade, meta opcional, limite de alerta, responsável), "Usar um KRI já definido neste objeto" e o aviso do KRI compartilhado.
- [x] **Step 3:** `get_screenshot` dos quadros alterados.

### Task 3: "P-02 · Indicadores com KRI em alerta", 1440 e 390

- [x] **Step 1:** computador: `StatCard` "Em alerta" (alertas abertos); 4 cartões de KRI nos estados do Review Focus 3; no cartão em alerta, `BrMessage` aviso com o prazo, a linha de cada risco ligado com `BrButton` "Reavaliar" e `BrButton` primário "Comunicar à CGOV"; nota do quadro: ciência = dia do registro da leitura; quem só lê não vê os botões.
- [x] **Step 2:** celular com o mesmo conteúdo empilhado (Review Focus 2).
- [x] **Step 3:** `get_screenshot`; conferir os itens 1 a 3 do Review Focus.

### Task 4: "P-02 · Registrar leitura, passa do limite", 1440

- [x] **Step 1:** `Dialog` com data, valor (72), `BrMessage` aviso "Esta leitura passa do limite: ao gravar, o KRI entra em alerta e começa o prazo de 10 dias úteis." e, ao lado, a variante dentro do limite e a "Sem limite numérico".
- [x] **Step 2:** `get_screenshot`; conferir os itens 4 e 5 do Review Focus.

### Task 5: "P-02 · Etapa 4, limite de alerta numérico", 1440 e 390

- [x] **Step 1:** campo do limite em três `FormField` (operador, número, unidade) com a frase lida; segundo estado com "Limite a converter: informe o operador e o número" e o texto antigo só para leitura.
- [x] **Step 2:** celular empilhado; `get_screenshot`.

### Task 6: Fechamento

- [x] **Step 1:** atualizar a linha P-02 do [[mapa-telas]] §2 (nós dos quadros, componentes, "desenhado em 2026-11-23, aguardando a CGOV"); cartão P-02 do [[quadro]] com os nós; mover para Concluído o cartão "Atualizar no Figma a etapa 4 … KRI compartilhado".
- [x] **Step 2:** commit `docs(p-02): ...` (o hook roda o `documentacao.spec.ts`).
