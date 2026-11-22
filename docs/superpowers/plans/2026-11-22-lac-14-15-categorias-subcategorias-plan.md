# LAC-14 e LAC-15: categorias do Quadro 2 e subcategorias do Quadro 3 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o RADAR gravar só as 8 categorias do Quadro 2 e, no risco de Integridade, só as 6 subcategorias do Quadro 3, com o banco recusando qualquer outra, e sem converter em silêncio nenhum risco já gravado.

**Architecture:** uma migração nova cria a tabela `subcategorias_risco` (fecha o cartão da dívida da JSONB, 1FN), liga `riscos` a ela por chave estrangeira composta `(categoria_id, subcategoria_integridade)`, põe um gatilho que exige a subcategoria quando a categoria tem subcategorias e uma `CHECK` com os 8 nomes do Quadro 2. Os dados de referência continuam no `seed.sql` (local); a mesma migração alinha os dados quando a tabela já tem categorias (nuvem). Front, importador e dados de demonstração passam a usar as listas novas.

**Tech Stack:** PostgreSQL/Supabase (migração SQL, pgTAP), Vue 3 + TypeScript, Vitest.

**Spec (fontes da regra):**
- [[lacunas-norma-sistema]] (LAC-14 e LAC-15); [[matriz-regras-regime-b]] §4 (Quadro 2) e §5 (Quadro 3), textos literais;
- [[pendencias-ui-piloto]] D3-01 e D3-02; RF-032, RF-036, RF-172 a RF-175; RN-015 e RN-017;
- cartões do [[quadro]]: LAC-14 (linha 77), LAC-15 (linha 78), dívida da JSONB (linha 15) e a parte do importador (linha 14) que toca as LAC-14 e 15.

## Decisões do responsável (2026-11-22)

| # | Pergunta | Decisão |
| --- | --- | --- |
| 1 | Grafia das categorias (D3-01) | **Quadro 2 literal**, com as descrições literais do Quadro 2. O importador aceita a grafia do Anexo III **como sinônimo** e grava a do Quadro 2. |
| 2 | Riscos gravados em Estratégico, Socioambiental ou Tecnologia da Informação | **Recusar e reclassificar**: a migração para com erro e lista os códigos; nada muda de categoria sem decisão humana. |
| 3 | Riscos com subcategoria antiga | **Recusar e reclassificar**, mesma regra; adotar exatamente as 6 do Quadro 3. |
| 4 | Garantia no banco | **Tabela `subcategorias_risco` + chave estrangeira em `riscos` + gatilho**, resolvendo junto o cartão da JSONB. |

Situação conferida em 2026-11-22: a nuvem só tem o `seed.sql` (categorias 1 a 8) e **nenhum risco** ([[guia-supabase-nuvem]] §7.1; D1-P3 "banco vazio"). A recusa da migração não deve disparar lá; localmente, os riscos de demonstração são reclassificados à mão nesta etapa (Task 3).

## Global Constraints

- **Categorias (texto exato, nesta ordem):** `Operacional`, `Legal`, `Financeiro/Orçamentário`, `Reputação`, `Integridade`, `Riscos da visitação`, `Ocupacionais`, `Privacidade e Proteção de Dados`. Descrições: as da [[matriz-regras-regime-b]] §4, copiadas sem mudar uma vírgula (inclusive "Lei nº 13.709/2013", erro material da minuta: não corrigir aqui).
- **Subcategorias de Integridade (texto exato, nesta ordem):** `Abuso de posição ou poder em favor de interesses privados`, `Nepotismo`, `Conflito de interesses`, `Pressão interna ou externa ilegal para influenciar agente público`, `Solicitação ou recebimento de vantagem indevida`, `Utilização de recursos públicos em favor de interesses privados`. Descrições: [[matriz-regras-regime-b]] §5, literais.
- **Ids das categorias:** mantêm-se 2 (Operacional), 3 (Financeiro/Orçamentário), 4 (Legal), 5 (Integridade) e 6 (Reputação); saem 1 (Estratégico), 7 (Socioambiental) e 8 (Tecnologia da Informação); entram 9 (Riscos da visitação), 10 (Ocupacionais) e 11 (Privacidade e Proteção de Dados). Contador (`setval`) em 11.
- **Apetite:** as 5 que ficam mantêm o apetite e a justificativa que têm; as 3 novas nascem `pendente_dar`, sem justificativa (o zeramento geral é a D3-03, fora deste plano).
- **Sinônimos aceitos só no importador (Anexo III → Quadro 2):** `Financeiro ou Orçamentário` → `Financeiro/Orçamentário`; `Reputação ou Imagem` → `Reputação`; `Visitação` → `Riscos da visitação`. Comparação sem diferença de maiúsculas e espaços nas pontas; nenhum outro sinônimo.
- **Sem conversão silenciosa:** nenhum ponto do código troca categoria ou subcategoria por um padrão (some o `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3[0]` do importador e o `?? categorias[1]` de `conversores.ts:563`).
- **Cálculo intocado:** Quadros 6, 7 e 8, `calcularRiscoCompletoRadar`, `avaliarCriticidadeDAR` e o gatilho de cálculo (`20261109001_schema_radar.sql:~290-330`) não mudam. Em `calculadoraRiscoRadar.ts` só mudam as duas listas; a autorização deste plano é o aval exigido pelo `AGENTS.md`.
- Nunca "PGR" para Plano de Gestão de Riscos; "Crítico" só para fora da DAR; comentários didáticos em português do Brasil.
- Nuvem: só na Task 5, cada passo marcado **[AUTORIZAÇÃO]** pede aval na hora.

## Review Focus

1. **Gatilho × rascunho:** salvar pela `salvar_ficha_risco` um rascunho de Integridade sem subcategoria agora falha no banco. O formulário já exige a subcategoria na etapa da categoria; o teste da Task 3 prova que a falha volta como mensagem "RADAR: ..." legível, e não como "Algum campo está fora dos valores permitidos".
2. **Troca de categoria num risco de Integridade:** mudar para Operacional mantendo a subcategoria antiga deve falhar pela chave estrangeira; o formulário precisa limpar a subcategoria quando a categoria deixa de ser Integridade (teste na Task 1).
3. **Importação com a grafia do Anexo III e com caixa diferente** ("reputação ou imagem", " Visitação "): aceita e grava a do Quadro 2 (Task 2).
4. **"Integridade:" com subcategoria antiga ou vazia** ("Integridade: Corrupção e Fraude", "Integridade:"): linha recusada, com mensagem que lista as 6 do Quadro 3 (Task 2).
5. **Migração na nuvem com categorias já existentes e trilha ligada:** o `UPDATE`/`DELETE`/`INSERT` em `categorias_risco` grava linhas em `auditoria_log` sem usuário logado, e o gatilho `trg_categorias_dar_reavalia_aprovados` não pode quebrar (não há risco aprovado). Teste pgTAP da Task 3 roda o bloco de alinhamento sobre a semente antiga.

---

## Fase 1 — Código e banco local

### Task 1: Listas do Quadro 2 e do Quadro 3 no front e nos dados de demonstração

**Files:**
- Modify: `src/utils/calculadoraRiscoRadar.ts:63-88` (só as duas constantes e os comentários delas)
- Modify: `src/services/dadosSementeAnexoII.ts` (categorias e os riscos `RADAR-2026-002` e `RADAR-2026-003`)
- Modify: `src/views/FormularioRiscoView.vue` (limpar a subcategoria ao sair de Integridade)
- Modify: `src/views/ImportadorSkillView.vue:50-51` (exemplo)
- Modify: `src/utils/darImpacto.ts:15` (comentário do exemplo)
- Test: `tests/unit/calculadoraRiscoRadar.spec.ts`, `tests/unit/dadosSementeConsistencia.spec.ts`, `tests/unit/novoRiscoPagina.spec.ts`, `tests/unit/darPagina.spec.ts`, e os demais que quebrarem por contagem de críticos

**Interfaces:**
- Produces: `CATEGORIAS_OFICIAIS_QUADRO_2` e `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3` (mesmos nomes, `as const`, valores das Global Constraints, nessa ordem). `validarRegraIntegridade` não muda de assinatura nem de lógica.

- [ ] **Step 1: Escrever os testes que falham** em `calculadoraRiscoRadar.spec.ts`:
  - `'Quadro 2: as 8 categorias, na grafia literal'` → `expect([...CATEGORIAS_OFICIAIS_QUADRO_2]).toEqual([ ...as 8 das Global Constraints ])`;
  - `'Quadro 3: as 6 subcategorias, na grafia literal'` → idem com as 6;
  - `'categorias que saíram são recusadas'` → `it.each(['Estratégico','Socioambiental','Tecnologia da Informação','Conformidade/Legal','Imagem/Reputação','Orçamentário/Financeiro'])` com `validarRegraIntegridade({ categoriaNome: x, testeIntegridadeAplicavel: false }).valido === false`;
  - `'Riscos da visitação é aceita'` → `valido === true`.
  - Em `novoRiscoPagina.spec.ts`: `'trocar Integridade por Operacional limpa a subcategoria'` — escolhe Integridade + "Nepotismo", troca para Operacional, e a ficha montada tem `subcategoriaIntegridade` `undefined`.
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/calculadoraRiscoRadar.spec.ts tests/unit/novoRiscoPagina.spec.ts` — esperado: FAIL nos testes novos.
- [ ] **Step 3: Implementar.** Trocar as duas constantes. Em `dadosSementeAnexoII.ts`, `CATEGORIAS_QUADRO_2_SEMENTE` fica com os ids e apetites das Global Constraints e as descrições literais; `RADAR-2026-002` passa a `subcategoriaIntegridade: 'Conflito de interesses'` (o evento fala em conflito de interesses); `RADAR-2026-003` passa à categoria 2 (Operacional, `moderado`): 8,4 Médio deixa de ser crítico (`statusCritico: 'nao'`, `isCritico: false`, `memoriaCalculo` e comentário refeitos pelo motor, nunca à mão). No formulário, um `watch` da categoria zera a subcategoria quando o nome deixa de ser `Integridade`. Exemplo do Importar: `Socioambiental` → `Operacional`; `Integridade: Conflito de Interesses e Nepotismo` → `Integridade: Conflito de interesses`. `darPagina.spec.ts`: o grupo "Socioambiental" vira "Legal" (também `baixo`).
- [ ] **Step 4: Rodar** `npx vitest run` — esperado: PASS. Contagens de críticos que mudaram por causa do `RADAR-2026-003` são atualizadas no teste, com comentário dizendo por quê.
- [ ] **Step 5: Commit** — `feat(lac-14-15): categorias do Quadro 2 e subcategorias do Quadro 3 no front`.

### Task 2: Importador sem conversão silenciosa (RF-172 a RF-175)

**Files:**
- Modify: `src/utils/importadorSkillMarkdown.ts:226-246`
- Modify: `src/services/dados/conversores.ts:562-563`
- Test: `tests/unit/importadorSkillMarkdown.spec.ts`, `tests/unit/importarPagina.spec.ts`, `tests/unit/conversores.spec.ts`

**Interfaces:**
- Consumes: as constantes da Task 1.
- Produces (exportadas de `importadorSkillMarkdown.ts`):
  - `normalizarCategoriaImportada(bruta: string): (typeof CATEGORIAS_OFICIAIS_QUADRO_2)[number] | null` — Quadro 2 ou sinônimo do Anexo III, sem caixa e com `trim`; fora disso, `null`;
  - `normalizarSubcategoriaImportada(bruta: string): (typeof SUBCATEGORIAS_INTEGRIDADE_QUADRO_3)[number] | null` — só as 6, sem caixa e com `trim`.
- `fichaDaSkillParaSalvar` mantém a assinatura, mas **lança** `Error` com a mensagem `RADAR: a categoria "<nome>" não existe no banco.` quando não acha a categoria.

- [ ] **Step 1: Testes que falham** (`importadorSkillMarkdown.spec.ts`):
  - `'aceita a grafia do Anexo III e grava a do Quadro 2'` — `it.each([['Financeiro ou Orçamentário','Financeiro/Orçamentário'],['reputação ou imagem','Reputação'],[' Visitação ','Riscos da visitação']])`;
  - `'aceita as 8 do Quadro 2'` (RF-173) — uma linha por categoria; nenhuma vai para `erros`;
  - `'recusa categoria fora do Quadro 2'` (RF-172) — `Socioambiental` gera erro com o código da linha e a linha não entra nas fichas;
  - `'recusa Integridade sem subcategoria'` (RF-175) — `Integridade` e `Integridade:` geram erro contendo `uma das 6 subcategorias do Quadro 3`; nenhuma ficha com `Corrupção e Fraude`;
  - `'recusa subcategoria fora do Quadro 3'` (RF-174) — `Integridade: Corrupção e Fraude` gera erro;
  - `'aceita subcategoria com caixa diferente'` — `Integridade: conflito de interesses` grava `Conflito de interesses`.
  - `conversores.spec.ts`: `'fichaDaSkillParaSalvar recusa categoria desconhecida em vez de trocar por Operacional'` — `toThrow('RADAR: a categoria "Socioambiental" não existe no banco.')`.
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts tests/unit/conversores.spec.ts` — esperado: FAIL.
- [ ] **Step 3: Implementar** as duas funções e usá-las no laço do importador antes de `validarRegraIntegridade`; apagar o ramo que atribui `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3[0]`; trocar o `?? categorias[1] ?? categorias[0]` pelo `throw`. A mensagem de subcategoria inválida lista as 6 do Quadro 3. Na `ImportadorSkillView`, o erro lançado na gravação aparece na lista de erros da linha (o `importarPagina.spec.ts` confere).
- [ ] **Step 4: Rodar** `npx vitest run` — esperado: PASS.
- [ ] **Step 5: Commit** — `fix(importador): categorias e subcategorias sem conversão silenciosa (RF-172 a RF-175)`.

### Task 3: Migração, sementes e testes do banco

**Files:**
- Create: `supabase/migrations/20261122001_categorias_subcategorias_quadros_2_3.sql`
- Create: `supabase/tests/090_categorias_subcategorias.test.sql`
- Modify: `supabase/seed.sql` (categorias e subcategorias; corrigir também o comentário do topo, pendência D1-P4)
- Modify: `supabase/seed-demonstracao.sql:172` (`RADAR-DEMO-CENTRO`: categoria 7 → 2)
- Modify: `supabase/tests/020_semente.test.sql`, `050_fluxo.test.sql`, `060_auditoria.test.sql`, `070_fluxo_presidencia.test.sql`, `073_dar_reavalia.test.sql` e os demais que usem os ids 1, 7 ou 8
- Modify: `src/types/radar.types.ts:162` e `src/services/dados/conversores.ts:84-91` (sai `subcategoriasPermitidas`); `tests/unit/fixtures/banco/riscoCofis.json`; `tests/unit/conversores.spec.ts:260`; `tests/integracao/fonteSupabaseGravacao.spec.ts:38` (categoria 7 → 4, Legal, também `baixo`)
- Modify: `tests/unit/schemaSql.spec.ts` (guarda contra divergência)

**Interfaces:**
- Consumes: as constantes da Task 1 (o teste de guarda compara o texto do SQL com elas).
- Produces (banco):
  - tabela `public.subcategorias_risco (id SERIAL PK, categoria_id INT NOT NULL REFERENCES categorias_risco(id) ON DELETE RESTRICT, nome TEXT NOT NULL, descricao_normativa TEXT NOT NULL, ordem SMALLINT NOT NULL, UNIQUE (categoria_id, nome))`, RLS ligada, só `SELECT` para `authenticated`, sem política de escrita e com os mesmos `REVOKE` de `20261115003_rls_alcance.sql:71-89`;
  - `riscos_subcategoria_fk`: `FOREIGN KEY (categoria_id, subcategoria_integridade) REFERENCES subcategorias_risco (categoria_id, nome)`, `ON UPDATE NO ACTION ON DELETE NO ACTION` (renomear subcategoria em uso também exige reclassificar; nada de `CASCADE`, que dispararia a reabertura dos aprovados);
  - função `fn_exige_subcategoria()` + gatilho `trg_riscos_exige_subcategoria BEFORE INSERT OR UPDATE OF categoria_id, subcategoria_integridade ON riscos`: se a categoria tem linhas em `subcategorias_risco` e a subcategoria é nula, `RAISE EXCEPTION 'RADAR: risco da categoria % exige uma das subcategorias do Quadro 3.' USING ERRCODE = 'check_violation'`;
  - `categorias_risco_nome_quadro_2`: `CHECK (nome IN (<as 8>))`;
  - sai a coluna `categorias_risco.subcategorias_permitidas`.

Ordem obrigatória dentro da migração (uma transação):
1. **Trava de reclassificação:** se houver risco com `categoria_id IN (1, 7, 8)` ou com `subcategoria_integridade` fora das 6, `RAISE EXCEPTION` com `string_agg` dos `codigo_radar` e a orientação "reclassifique esses riscos antes de aplicar esta migração (decisão de 2026-11-22)".
2. Criar `subcategorias_risco`, RLS e permissões.
3. **Alinhamento condicional** (só faz algo se `categorias_risco` tiver linhas, caso da nuvem): `UPDATE` de nome e descrição dos ids 2 a 6; `DELETE` dos ids 1, 7 e 8; `INSERT` dos ids 9 a 11 (`pendente_dar`); `INSERT` das 6 subcategorias na categoria 5; `setval` em 11. Localmente a tabela está vazia nesse ponto e quem grava é o `seed.sql`.
4. `DROP COLUMN subcategorias_permitidas`; `CHECK` dos nomes; chave estrangeira; gatilho.

- [ ] **Step 1: Teste pgTAP que falha** (`090_categorias_subcategorias.test.sql`), com `plan(n)` exato:
  - as 8 categorias, por id e nome, iguais às Global Constraints; `nextval` da sequência dá 12;
  - as 6 subcategorias da categoria 5, por `ordem` e nome; nenhuma em outra categoria;
  - `INSERT` de categoria "Estratégico" falha (`23514`);
  - risco de Integridade sem subcategoria falha com mensagem que começa por `RADAR: risco da categoria`;
  - risco de Integridade com `Corrupção e Fraude` falha (`23503`);
  - risco Operacional com `Nepotismo` falha (`23503`);
  - risco de Integridade com `Nepotismo` grava;
  - trocar a categoria de um risco de Integridade para Operacional sem limpar a subcategoria falha (`23503`);
  - `authenticated` lê `subcategorias_risco` e não consegue `INSERT`/`UPDATE`/`DELETE` (RLS);
  - coluna `subcategorias_permitidas` não existe (`hasnt_column`);
  - **alinhamento sobre a semente antiga:** dentro do teste, recria o estado da nuvem (apaga as categorias, insere as 8 antigas com os ids 1 a 8), roda o bloco de alinhamento (exposto como função `pg_temp` no teste, cópia do bloco 3 da migração) e confere o resultado igual ao do `seed.sql`, mais as linhas novas em `auditoria_log`;
  - **trava:** com um risco na categoria 7, o bloco 1 levanta erro contendo o `codigo_radar`.
- [ ] **Step 2: Rodar** `npm run db:reset && npm run test:db` — esperado: FAIL no `090` (tabela inexistente). Precisa do Docker ligado; sem ele, a tarefa para aqui e avisa.
- [ ] **Step 3: Escrever a migração e as sementes**; ajustar os testes pgTAP antigos trocando os ids 1, 7 e 8 por um id que fica com o mesmo apetite (1 Estratégico `moderado` → 2 Operacional; 7 Socioambiental `baixo` → 4 Legal ou 6 Reputação; 8 TI → o apetite que o teste espera, definido no próprio teste) ou definindo o apetite no começo do teste, com comentário. Tirar `subcategoriasPermitidas` do tipo, do conversor, da fixture e do teste.
- [ ] **Step 4: Teste de guarda** em `schemaSql.spec.ts`: `'seed.sql e migração usam as listas da calculadora'` — cada item de `CATEGORIAS_OFICIAIS_QUADRO_2` aparece no `seed.sql` e no `CHECK` da migração; cada item de `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3` aparece no `seed.sql` e na migração; nenhum dos nomes antigos aparece no `seed.sql`.
- [ ] **Step 5: Rodar** `npm run db:reset && npm run test:db && npx vitest run && npm run build` — esperado: tudo PASS; anotar o número de arquivos e testes do pgTAP (re-medição pedida no ESTADO-ATUAL).
- [ ] **Step 6: Commit** — `feat(banco): subcategorias_risco, chave estrangeira e Quadro 2 no banco (LAC-14, LAC-15)`. Revisão completa desta tarefa (migração e RLS), pela regra do `CLAUDE.md`.

### Task 4: Documentação, ADR e Kanban

**Files:**
- Create: `docs/adr/0019-categorias-e-subcategorias-literais-sem-conversao-automatica.md` (Nygard, `Accepted`; contexto D3-01/D3-02, as 4 decisões, consequências: recusa da migração, sinônimos só no importador, novas categorias em `pendente_dar`)
- Modify: `docs/adr/README.md` (índice), `docs/00-memoria/MOC-Radar.md` (seção ADR)
- Modify: `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (LAC-14 e LAC-15: "resolvida em 2026-11-22", com a migração e o ADR-0019; situação normativa da LAC-14 deixa de ser "aberto")
- Modify: `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-032, RF-036, RF-172 a RF-175 → implementado, com os testes), `regras-negocio.md` (RN-015, RN-017 e a pendência da linha 239), `rastreabilidade.md`
- Modify: `docs/01-normativos/matriz-regras-regime-b.md` §4 e §5 (trocar o "Atenção" por como o RADAR usa agora; a linha 163 cita a decisão)
- Modify: `docs/00-memoria/pendencias-ui-piloto.md` (D3-01, D3-02 e o item da linha 148 resolvidos)
- Modify: `docs/40-nivel4-dados/` (`mer-conceitual.md`, `der-logico.md`, `dicionario-dados.md`, `normalizacao.md` §2.1) com a tabela nova e a coluna que sai; contagem de migrações 12 → 13
- Modify: `docs/10-nivel1-negocio/fluxos/FS-02-analise-ato-por-skills.md:183` (as linhas das 3 categorias novas passam a ser importadas)
- Modify: `docs/02-arquitetura-cgti/guia-supabase-nuvem.md` (§7.1: tirar o "Atenção"; nova subseção do passo da Task 6, marcada **[AUTORIZAÇÃO]**)
- Modify: `docs/90-kanban/quadro.md` (cartões das linhas 15, 77 e 78 para concluído; a linha 14 perde os itens já resolvidos) e `docs/00-memoria/ESTADO-ATUAL.md` (números novos)

- [ ] **Step 1:** escrever o ADR e atualizar os documentos acima.
- [ ] **Step 2:** `npx vitest run tests/unit/documentacao.spec.ts` — esperado: PASS (sequência do ADR-0019, IDs, siglas, sem "PGR").
- [ ] **Step 3: Commit** — `docs(lac-14-15): ADR-0019 e documentação das categorias e subcategorias`. Revisão: `sonnet` ou autorrevisão do diff.

### Fim da Fase 1

- [ ] `/code-review` nível `medium` no diff da branch; corrigir o que for procedente.
- [ ] Conferir o que vai sair (repositório público: sem `_temp/`, `.env` ou dado pessoal), push da branch e PR `Fase 1: Categorias do Quadro 2 e subcategorias do Quadro 3 (LAC-14 e LAC-15)`, com o que a fase entregou, os testes rodados e o que fica para a Fase 2. Merge só a pedido.

---

## Fase 2 — Nuvem do piloto (cada passo pede autorização)

### Task 5: Aplicar a migração no banco do piloto

- [x] **Step 1 [AUTORIZAÇÃO]:** conferência só de leitura no projeto `cgov-riscos-v3.0`: `select count(*) from riscos;` e `select id, nome from categorias_risco order by id;`. Esperado: 0 riscos e os ids 1 a 8 antigos. Se houver risco, parar e mostrar os códigos ao responsável.
- [x] **Step 2 [AUTORIZAÇÃO]:** `npx supabase db push` (sem `--include-seed`), conferindo que a lista mostra só a `20261122001`.
- [x] **Step 3:** conferir de novo (leitura): 8 categorias com os ids 2 a 6 e 9 a 11, 6 subcategorias, coluna JSONB ausente, linhas novas em `auditoria_log`. Registrar resultado e data no histórico do [[guia-supabase-nuvem]] e no ESTADO-ATUAL; commit `docs(nuvem): migração das categorias aplicada no piloto`.
