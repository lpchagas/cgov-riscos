# LAC-08 — Rito da DAR: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o apetite da DAR só muda pelo registro da portaria, depois da minuta, do CTGRIC e do CIG; a tela `/dar` fica como na P-01 e a tela nova `/plano/publicacao`, como na P-10.

**Architecture:** uma migração com quatro tabelas, uma visão e sete RPCs (`SECURITY DEFINER`, só a CGOV), testada em pgTAP; `UPDATE` em `categorias_risco` fechado para a API; o gatilho de reavaliação de hoje continua fazendo o recálculo. No front, `FonteDados` ganha os métodos do rito (as duas fontes), uma store nova e duas telas com os componentes da biblioteca.

**Tech Stack:** PostgreSQL/Supabase (pgTAP), Vue 3 + TypeScript, Pinia, Vitest, Playwright (a11y).

**Spec:** `docs/superpowers/specs/2026-11-27-lac08-rito-dar-design.md` (telas: P-01 e P-10, aprovadas).

## Global Constraints

- **[AUTORIZAÇÃO]** este plano cria a migração `20261127001_lac08_rito_dar.sql` **só no banco local**. A Task 1 não começa sem o aval do responsável. Aplicar na nuvem do piloto é passo à parte, autorizado a cada vez, e é lá que a conversão da §4.3 do desenho tem efeito.
- Não mudar os Quadros 6, 7 e 8, `calculadoraRiscoRadar.ts`, o gatilho de cálculo nem `fn_dar_reavaliar_aprovados`.
- Etapas: `minuta`, `no_ctgric`, `ressalvas`, `no_cig`, `aprovada_cig`, `publicada`. Resultados: `favoravel`, `com_ressalvas`, `desfavoravel` (CTGRIC); `aprovada`, `reprovada` (CIG).
- Prazo só na etapa `ressalvas`: `dia_prazo = fn_dias_uteis_entre(data da manifestação, fn_hoje())`, `dentro_prazo = dia_prazo <= 10`.
- Datas do rito: nunca futuras (`fn_hoje()`); a de cada passo não pode ser anterior à do passo anterior.
- Textos fixos: "O apetite vigente só muda pela portaria da DAR. Para propor mudança, use a aba Proposta e rito."; "A retificação corrige o registro. O apetite e a criticidade não mudam."; "Efeito **se** a minuta for publicada".
- "Risco Crítico" = residual fora do apetite da DAR, nunca o nível Extremo; "Plano de Gestão de Riscos" por extenso; apetite "Baixo", "Moderado" ou "Pendente de DAR".
- Dados só de demonstração (`@radar.test`, "Portaria nº 000/2025 (exemplo)"); nunca `_temp/`.
- Comentários didáticos em pt-BR em todo código novo.
- Revisão: uma por tarefa; as Tasks 1 a 4 (migração e RLS) têm revisão completa. `/code-review` (medium) no fim de cada fase e PR "Fase N: …" para a `main`.

## Review Focus

1. Gestor, ou a CGOV, tenta `update categorias_risco set apetite_declarado` pela API: recusado (`42501`), e nenhum risco é reavaliado. Teste na Task 1.
2. Clique duplo em "Registrar portaria": o segundo chamado acha a minuta já `publicada` e é recusado com mensagem clara, sem reavaliar duas vezes. Teste na Task 3 (pgTAP) e na Task 7 (botão travado enquanto grava).
3. Portaria com data anterior à deliberação do CIG, ou futura: recusada, com o motivo em português. Teste na Task 3 e na Task 7 (a mensagem aparece no campo).
4. Retificação que muda a data: o apetite e a criticidade dos riscos não mudam, e o evento guarda o antes e o depois. Teste na Task 3.
5. CIG reprova: a minuta volta à etapa `minuta`, editável, e uma segunda minuta não pode ser aberta em paralelo. Teste na Task 2.

---

## Fase 1 — Banco

### Task 1: Tabelas, visão, RLS e o fim do `UPDATE` direto

**Files:** Create `supabase/migrations/20261127001_lac08_rito_dar.sql` (seções 1 a 3); Create `supabase/tests/130_lac08_rito_dar.test.sql`; Modify `supabase/seed.sql`; Modify os pgTAP que gravam o apetite como CGOV (`041` bl. 8, `060`, `073` bl. 1 a 5, `100`, `110`).

**Produces:** `public.dar_minutas`, `public.dar_minuta_categorias`, `public.dar_rito_eventos`, `public.dar_portarias` (desenho §4.1); visão `public.dar_situacao` (`minuta_id`, `etapa`, `data_encaminhada_ctgric`, `data_manifestacao_ctgric`, `resultado_ctgric`, `data_encaminhada_cig`, `data_deliberacao_cig`, `resultado_cig`, `portaria_numero`, `portaria_data`, `portaria_link`, `dia_prazo`, `dentro_prazo`); ajudante de teste `pg_temp.publicar_dar_teste(categoria int, apetite text)` em `supabase/tests/ajudantes.psql` (grava como dono, para os testes que só precisam de um apetite).

- [ ] **Step 1: testes que falham:** as 4 tabelas e a visão existem; gestor e CGOV leem; ninguém faz `insert`/`update`/`delete` direto nelas (`42501`); CGOV e gestor: `update categorias_risco set apetite_declarado = 'baixo'` → `42501`; índice único recusa uma segunda minuta fora de `publicada`; `dar_rito_eventos` recusa `update` e `delete` mesmo como dono (gatilho de imutabilidade, como em `comunicacoes_cgov`); depois do `db:reset`, a semente tem 1 minuta `publicada`, com portaria "000/2025 (exemplo)" e os apetites de hoje (2 `moderado`; 3, 4, 5 e 6 `baixo`; 9, 10 e 11 `pendente_dar`).
- [ ] **Step 2:** `npm run db:reset && npm run test:db` → o `130` falha.
- [ ] **Step 3:** seções 1 a 3 da migração (tabelas com CHECKs, índice único parcial, gatilho de imutabilidade, visão `security_invoker`, RLS e `REVOKE UPDATE ON public.categorias_risco FROM anon, authenticated`); semente com a DAR de exemplo, gravada **antes** de qualquer risco (o gatilho não reavalia nada); troca dos `update categorias_risco` feitos como CGOV, nos pgTAP listados, pelo ajudante ou pelo caminho das RPCs (o que cada bloco testa decide; os blocos 1 a 5 do `073` passam a usar `registrar_portaria_dar`, depois da Task 3).
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → o `130` e os outros 23 arquivos passam (o `073` pode ficar com os blocos 3 a 5 marcados `todo` até a Task 3).
- [ ] **Step 5:** commit `feat(lac-08): tabelas do rito da DAR e fim da gravação direta do apetite`.

### Task 2: Minuta, CTGRIC e CIG

**Files:** Modify a migração (seção 4); Test `130` (seção 2).

**Consumes:** as tabelas da Task 1. **Produces:** `salvar_minuta_dar(p jsonb) returns uuid` (`p = {categorias: [{categoria_id, apetite_proposto, justificativa}]}`), `encaminhar_minuta_dar_ctgric(p_data date)`, `registrar_manifestacao_ctgric_dar(p_resultado text, p_data date, p_observacao text)`, `encaminhar_minuta_dar_cig(p_data date)`, `registrar_deliberacao_cig_dar(p_resultado text, p_data date, p_observacao text)`; todas `returns void`, exceto a primeira.

- [ ] **Step 1: testes que falham:** gestor chama cada RPC → `42501`; CGOV salva a minuta (cria na 1ª vez, atualiza na 2ª, sem duplicar); salvar em `no_ctgric` → recusado ("A minuta foi encaminhada ao CTGRIC e está só para leitura."); encaminhar com data futura → recusado; manifestação `com_ressalvas` → etapa `ressalvas`, e `dar_situacao.dia_prazo` conta os dias úteis desde ela; `favoravel` e `desfavoravel` → `no_cig`; deliberação com data anterior à manifestação → recusada; `reprovada` → volta a `minuta` e aceita `salvar_minuta_dar`; `aprovada` → `aprovada_cig`; cada passo grava 1 evento em `dar_rito_eventos`, com `registrado_por = auth.uid()`; abrir minuta nova com outra em andamento → recusado.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** as 5 RPCs (`SECURITY DEFINER`, `SET search_path = ''`, `FOR UPDATE` na minuta, checagem de CGOV antes de olhar a etapa, mensagens em português, `EXECUTE` só para `authenticated`).
- [ ] **Step 4:** rodar a suíte inteira → PASS.
- [ ] **Step 5:** commit `feat(lac-08): minuta da DAR, manifestação do CTGRIC e deliberação do CIG`.

### Task 3: Portaria e retificação

**Files:** Modify a migração (seção 5); Test `130` (seção 3); Modify `073` (blocos 3 a 5 pelo caminho novo).

**Consumes:** Task 2. **Produces:** `registrar_portaria_dar(p_numero text, p_data date, p_link text)`, `retificar_portaria_dar(p_numero text, p_data date, p_link text, p_motivo text)`; as duas `returns void`.

- [ ] **Step 1: testes que falham:** portaria com a minuta fora de `aprovada_cig` → recusada; data futura ou anterior à deliberação → recusada; número vazio → recusado; CGOV registra → etapa `publicada`, `dar_portarias` com 1 linha, `categorias_risco` com o apetite e a justificativa da minuta só nas categorias que mudaram; risco aprovado Médio de Operacional com a minuta `baixo` → passa a crítico e volta a `em_homologacao_dir` com `reaberto_mudanca_dar` (o gatilho de hoje); 2º registro → recusado e nenhum risco reavaliado de novo; retificar sem motivo → recusado; retificar a data → `dar_portarias` atualizada, evento `portaria_retificada` com `antes` e `depois`, e `is_critico` de todos os riscos igual ao de antes; retificar uma portaria que não é a última publicada → recusado.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** as duas RPCs. A da portaria faz o `UPDATE categorias_risco … WHERE apetite_declarado IS DISTINCT FROM proposto` como dono (`SECURITY DEFINER`), e o gatilho de hoje reavalia.
- [ ] **Step 4:** rodar a suíte inteira (sem `todo` no `073`) → PASS.
- [ ] **Step 5:** commit `feat(lac-08): registro e retificação da portaria da DAR`.

### Task 4: Conversão dos apetites sem portaria

**Files:** Modify a migração (seção 6, a última); Test `130` (seção 4).

**Produces:** `public.fn_dar_converter_sem_portaria() returns table(categorias int, riscos_mudados int)` (só o dono executa), chamada uma vez no fim da migração com `RAISE NOTICE`.

- [ ] **Step 1: testes que falham:** num banco com a semente (já com portaria) → `(0, 0)` e nada muda; apagando, como dono dentro da transação de teste, a DAR de exemplo e deixando o apetite de hoje → cria a minuta nº 1 em `minuta` com os apetites e as justificativas de hoje, põe as 8 categorias em `pendente_dar` sem justificativa, devolve `(5, N)`, e nenhum risco vai para `em_homologacao_dir`; chamada como CGOV → `42501`.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** a função e a chamada no fim da migração (com o `NOTICE` "LAC-08: X categorias voltaram a Pendente de DAR; Y riscos aprovados reavaliados; a minuta nº 1 guarda os valores anteriores.").
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS; o `NOTICE` do reset local diz `0 categorias`.
- [ ] **Step 5:** commit `feat(lac-08): apetite sem portaria volta a Pendente de DAR e vira a primeira minuta`.
- [ ] **Step 6:** `/code-review` (medium) na fase; PR "Fase 1: Rito da DAR no banco".

## Fase 2 — Dados e a tela `/dar` (P-01)

### Task 5: Tipos, fontes e store

**Files:** Modify `src/services/dados/tipos.ts`, `fonteSupabase.ts`, `fonteDemonstracao.ts`, `conversores.ts`, `errosBanco.ts`; Create `src/stores/darStore.ts`; Modify `src/stores/riscosStore.ts` (sai `alterarApetiteCategoriaDAR`); Test `tests/unit/darStore.spec.ts`, `tests/unit/fonteDemonstracao.spec.ts`, `tests/unit/conversores.spec.ts`.

**Produces:**
- tipos `EtapaDar`, `SituacaoDar` (os campos da visão, em camelCase, mais `categorias: { categoriaId, apetiteProposto, justificativa }[]` e `eventos: EventoRitoDar[]`), `EventoRitoDar`, `NovaPortariaDar { numero, data, link? }`;
- em `FonteDados`, no lugar de `alterarApetite` e `alterarJustificativa`: `lerSituacaoDar(): Promise<SituacaoDar | null>`, `salvarMinutaDar(c: SituacaoDar['categorias']): Promise<void>`, `encaminharMinutaDarCtgric(data: string): Promise<void>`, `registrarPortariaDar(p: NovaPortariaDar): Promise<void>`, `retificarPortariaDar(p: NovaPortariaDar & { motivo: string }): Promise<void>`;
- `useDarStore()` com `situacao`, `carregando`, `gravando`, `carregar()`, e as 4 ações, que relêem a situação e os riscos depois de gravar.

- [ ] **Step 1: testes que falham:** a demonstração imita o banco (etapa errada, data futura, data antes do CIG e 2º registro recusados com as mesmas mensagens; a portaria aplica o apetite e reavalia na memória; a retificação não reavalia); a store trava `gravando` durante a ação; `errosBanco` traduz as mensagens novas.
- [ ] **Step 2:** `npx vitest run tests/unit/darStore.spec.ts tests/unit/fonteDemonstracao.spec.ts` → falha.
- [ ] **Step 3:** implementar. A demonstração começa com a DAR de exemplo publicada e uma minuta nº 2 em `minuta` (para as telas terem o que mostrar).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** commit `feat(lac-08): rito da DAR nas fontes de dados e na store`.

### Task 6: `/dar` com as abas Vigente e Proposta e rito

**Files:** Modify `src/views/DeclaracaoApetiteDarView.vue`; Test `tests/unit/darPagina.spec.ts` (reescrito).

**Consumes:** `useDarStore`, `simularImpactoDar` (`src/utils/darImpacto.ts`, sem mudança).

- [ ] **Step 1: testes que falham:** aba Vigente sem controle editável para nenhum perfil, com a portaria (ou "sem DAR publicada") e o texto fixo das restrições; aba Proposta e rito: `BrStep` com 5 etapas; na etapa `minuta` e para a CGOV, `SegmentedControl` Baixo/Moderado por categoria, prévia com o título "Efeito se a minuta for publicada" e o vigente inalterado; "Salvar minuta" e "Encaminhar ao CTGRIC" (diálogo com a data e o aviso "O Plano de Gestão de Riscos segue por fora até a tela P-04"); fora da CGOV, tudo só leitura; em `no_ctgric`, minuta travada, com links "Registrar na tela do rito (P-05)" desabilitado e "Registrar publicação (P-10)" para `/plano/publicacao`; em `ressalvas`, "dia N de 10" e aviso quando passa de 10, sem bloquear.
- [ ] **Step 2:** `npx vitest run tests/unit/darPagina.spec.ts` → falha.
- [ ] **Step 3:** reescrever a view com `BrTabs`, `BrStep`, `DataTable`, `SegmentedControl`, `Dialog`, `BrMessage`, `StatCard`, `RiskBadge` e `BrButton`, como na P-01 (seção `104:1846` da ✏️ Trabalho — Apetite (DAR)).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** commit `feat(lac-08): tela Apetite (DAR) com o vigente e a proposta separados (P-01)`.
- [ ] **Step 6:** `/code-review` (medium) na fase; PR "Fase 2: Tela Apetite (DAR) com o rito".

## Fase 3 — Publicação (P-10)

### Task 7: Página `/plano/publicacao`

**Files:** Create `src/views/PublicacaoDarPlanoView.vue`; Modify `src/router/index.ts`, `src/components/govbr/BrMenu.vue`, `src/utils/acessoPorPerfil.ts`, `tests/a11y/telas.ts`; Test `tests/unit/publicacaoPagina.spec.ts`, `tests/unit/acessoPorPerfil.spec.ts`, `tests/unit/guardaRotas.spec.ts`.

**Consumes:** `useDarStore`.

- [ ] **Step 1: testes que falham:** rota `publicacao-dar-plano` aberta aos 10 perfis; item "Publicação (DAR e Plano)" no grupo Deliberação; bloco 1 com o `Chip` "Aguardando o CIG" (campos travados, link para `/dar`), "Pronta para registrar" ou "Publicada"; categorias que mudam e o efeito no Risco Crítico; número e data obrigatórios; data futura ou anterior ao CIG com erro no campo; diálogo de confirmação com os dados e o aviso de reavaliação; botão travado enquanto grava; depois de registrada, "Retificar" (só a CGOV) com motivo obrigatório e o aviso fixo, e o histórico com data, perfil e motivo; blocos 2 e 3 travados, com "Depende da tela do Plano de Gestão de Riscos (P-04)"; fora da CGOV, nenhum campo nem botão de ação.
- [ ] **Step 2:** `npx vitest run tests/unit/publicacaoPagina.spec.ts` → falha.
- [ ] **Step 3:** view, rota (com `titulo`, `descricao` e `fundamento` da P-10), menu e regra de acesso, como na P-10 (seção `130:1475` da ✏️ Trabalho — Publicação (DAR e Plano)). O diálogo "Retificar" usa o `Dialog.vue` com os campos no slot.
- [ ] **Step 4:** `npm test` e `npm run test:a11y` → PASS (sem violação nova).
- [ ] **Step 5:** commit `feat(lac-08): página de publicação da DAR e do Plano (P-10)`.

### Task 8: Integração com o banco local

**Files:** Modify `tests/integracao/fonteSupabaseGravacao.spec.ts`.

- [ ] **Step 1: testes que falham:** `cgov@` salva a minuta e encaminha ao CTGRIC pela fonte; o rito avança no CTGRIC e no CIG por SQL do ajudante (até a P-05); `cgov@` registra a portaria pela fonte → o risco aprovado da categoria é relido com a criticidade nova (substitui o teste "DAR: cgov@ muda o apetite …"); `gestor@` recebe a mensagem traduzida ao tentar registrar; a retificação não muda a criticidade.
- [ ] **Step 2:** `npm run db:reset && npm run test:integracao` → falha.
- [ ] **Step 3:** ajustar o que faltar nas fontes.
- [ ] **Step 4:** `npm run test:integracao` → PASS.
- [ ] **Step 5:** commit `test(lac-08): rito da DAR de ponta a ponta no banco local`.
- [ ] **Step 6:** `/code-review` (medium) na fase; PR "Fase 3: Publicação da DAR (P-10)".

## Fase 4 — Documentação

### Task 9: Requisitos, dados, decisões e quadro

**Files:** Modify `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-086, RF-089 a RF-093, RF-122, RF-124, RF-127, RF-130 e RF-195), `regras-negocio.md` (RN-054, RN-056, RN-057, RN-060, RN-061), `rastreabilidade.md`, `casos-de-uso/UC-14-…`, `UC-25-…`; `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (LAC-08), fluxos F1, F3 e FS-01; `docs/40-nivel4-dados/` (tabelas novas); `docs/30-nivel3-interface/mapa-telas.md` e a matriz de acesso; Create `docs/adr/0022-rito-da-dar-no-banco.md`; Modify `docs/90-kanban/quadro.md` e `docs/00-memoria/ESTADO-ATUAL.md`.

- [ ] **Step 1:** atualizar os documentos (situação "implementado", com o teste que prova cada um; RF-124 e RF-127 "implementado no banco; tela na P-05"; RF-195 "em parte").
- [ ] **Step 2:** ADR-0022: o apetite só muda pela RPC da portaria; o `UPDATE` direto foi fechado; os apetites sem portaria voltaram a Pendente (decisão de 2026-11-27).
- [ ] **Step 3:** cartão da LAC-08 em "Homologação CGOV"; cartão novo "Modelagem — P-05 (parte da DAR)"; na Figma, as 📌 Original de Apetite (DAR) e de Publicação passam a ser cópias dos desenhos aprovados (travadas).
- [ ] **Step 4:** commit `docs(lac-08): requisitos, dados, ADR-0022 e quadro` (o hook roda o `documentacao.spec.ts`); PR "Fase 4: Documentação da LAC-08".
