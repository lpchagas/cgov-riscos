# LAC-03 — KRI obrigatório e completo no risco crítico, com grupo de correlatos: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nenhum risco crítico (`status_critico` `'sim'` ou `'pendente_dar'`) chega à validação, à homologação ou à aprovação sem um KRI completo ligado a ele; um KRI pode servir a vários riscos do mesmo objeto; o sistema para de inventar valores de KRI.

**Architecture:** O KRI passa a pertencer ao objeto (`indicadores_kri.objeto_id`), e a tabela `kri_riscos` liga cada KRI a um ou mais riscos do mesmo objeto. A exigência entra como **3º motivo** da trava da LAC-13, dos dois lados: `verificarTravaRiscoCritico` (TypeScript) e `public.fn_trava_risco_critico` (banco). Como todas as portas da LAC-13 já chamam essa trava, a exigência vale em envio, validação, homologação, `salvar_ficha_risco` e reavaliação pela DAR sem mexer nelas uma a uma. Uma só migração nova, `20261122004_lac03_kri_obrigatorio.sql`, escrita em duas tarefas (estrutura; depois funções e remoção de `risco_id`).

**Tech Stack:** Vue 3 + TypeScript, Vitest + @vue/test-utils, PostgreSQL/plpgsql (Supabase), pgTAP (`npm run test:db`).

**Spec:** [[2026-11-22-lac-03-kri-obrigatorio-design]] (`docs/superpowers/specs/2026-11-22-lac-03-kri-obrigatorio-design.md`)

## Global Constraints

- "Risco crítico", para a trava: `status_critico IN ('sim', 'pendente_dar')`. O `pendente_dar` trava **por regra do sistema** (decisão do responsável); nos textos, nunca chamá-lo de risco crítico pela norma.
- **KRI completo** = `nome_indicador`, `formula_calculo`, `fonte_dados`, `periodicidade`, `limite_alerta` e `responsavel_medicao` preenchidos. Meta opcional. Não conta como preenchido: `NULL`, vazio, só espaços, `A definir`, `A definir pela unidade` (comparação sem diferença de maiúsculas, depois de `trim`).
- Grupo só **dentro do mesmo objeto**. Ligação entre objetos é recusada (23514).
- Rascunho, `devolvido` e `preliminar_cgov` continuam livres para gravar. Risco não crítico pode ter KRI incompleto.
- A migração **não muda o `status_fluxo`** de nenhum risco (aprovados antigos fora da regra ficam e são listados).
- O sistema nunca grava valor de KRI que ninguém definiu: nada de "A definir", "100%", "< 80%", "Trimestral" por padrão.
- Não tocar em `calculadoraRiscoRadar.ts` nem em `trigger_calcular_risco_radar`. Migração nova: **só** `supabase/migrations/20261122004_lac03_kri_obrigatorio.sql`. Não editar migrações antigas.
- Nada na nuvem sem **[AUTORIZAÇÃO]** a cada passo (Tarefa 9). Nunca abrir `_temp/`.
- Comentários didáticos em português do Brasil. "Crítico" só como fora da DAR (nunca a faixa 18 a 25, que é **Extremo**). Nunca "PGR" para o Plano de Gestão de Riscos.
- Commit por tarefa, `tipo(lac-03): resumo` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O hook roda `vue-tsc` + `vitest`, **não** o pgTAP: nas tarefas 2 e 3, rode `npm run db:reset && npm run test:db` antes do commit.
- Revisão: tarefas 2 e 3 (banco, RLS, fluxo) e 1, 4, 5, 6, 7, revisão completa por tarefa; tarefa 8 (docs), revisor `sonnet`. No fim da Fase 1, `/code-review` nível `medium` na branch e PR `Fase 1: LAC-03 KRI obrigatório (código e banco local)`.

**Fases:** Fase 1 = tarefas 1 a 8 (código, banco local, docs). Fase 2 = tarefa 9 (nuvem do piloto).

**Texto fixo**

- Motivo no banco (3º): `falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável)`. Vai no lugar do `%` de `RADAR: o risco <código> é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %.` (mesmas mensagens da LAC-13).
- Frase ao usuário (`MENSAGEM_TRAVA_KRI`, usada por `errosBanco.ts` e pela demonstração): `Risco crítico (fora do apetite da DAR ou com DAR pendente) precisa de um KRI completo: preencha nome, fórmula, fonte dos dados, periodicidade, limite de alerta e responsável na etapa 4, ou use um KRI já definido neste objeto. Se a ficha estiver em validação ou homologação, devolva-a à unidade.`
- Ajuda da etapa 4 (`ajudaTravaCritico`): ao texto atual, acrescentar ` Ele também precisa de um KRI completo (Metodologia 4.7.1).`
- Ligação entre objetos: `RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.` (23514).
- Aviso do importador (não bloqueia): `Linha <código>: risco crítico sem KRI completo; complete o KRI na ficha antes do envio.`
- Histórico da DAR (devolução): `DAR alterada: categoria <nome> com apetite <A> → <B>. O risco aprovado (residual <n>, <classe>, <situação>) não passa na trava do risco crítico: <motivo>. Voltou para a unidade ajustar.` `<situação>` = `fora do apetite da DAR` ou `com DAR pendente; por regra do sistema, a trava do risco crítico também se aplica`. `<motivo>` = o texto devolvido por `fn_trava_risco_critico`.
- Aviso ao alterar KRI compartilhado: `Este KRI também serve aos riscos <códigos>; alterar muda o indicador de todos eles e reabre os aprovados.`

## Review Focus

1. **KRI compartilhado alterado com um dos riscos em validação:** a alteração é recusada com "ficha travada" e nada muda nos outros riscos (pgTAP na Tarefa 3).
2. **Desligar o último risco de um KRI com medições:** o KRI e as medições somem, e o formulário pediu a confirmação de sempre; desligar um de dois riscos mantém o KRI e as medições (pgTAP na Tarefa 2; Vitest na Tarefa 5).
3. **Dado antigo com marcador em caixa diferente ou com espaços** (`' a definir '`): vira `NULL` na migração e não conta como preenchido na trava (pgTAP na Tarefa 2; Vitest na Tarefa 1).
4. **KRI do importador parcialmente editado pela unidade** (só a meta mudou de "100%"): não é zerado, porque a assinatura exige os quatro valores inventados juntos (pgTAP na Tarefa 2).
5. **Excluir um risco que compartilha KRI com outro risco crítico aprovado:** o KRI continua ligado ao outro risco, que segue aprovado (pgTAP na Tarefa 2).

---

### Task 1: A regra em TypeScript e os tipos

**Files:**
- Modify: `src/utils/travaRiscoCritico.ts`, `src/types/radar.types.ts:230-242`, `src/services/dados/tipos.ts:101`, `src/services/dados/errosBanco.ts:117`
- Modify (só para compilar com os campos opcionais): consumidores apontados pelo `vue-tsc`
- Test: `tests/unit/travaRiscoCritico.spec.ts`, `tests/unit/errosBanco.spec.ts`

**Interfaces:**
- Produces:
  - `export const MARCADORES_KRI_VAZIO: readonly string[]` = `['a definir', 'a definir pela unidade']` (minúsculas).
  - `export function textoPreenchido(t: string | null | undefined): boolean` — `false` para `null`/`undefined`, vazio após `trim`, ou marcador (comparando `trim().toLowerCase()`).
  - `export type KriParaTrava = Pick<IndicadorKri, 'nomeIndicador' | 'formulaCalculo' | 'fonteDados' | 'periodicidade' | 'limiteAlerta' | 'responsavelMedicao'>`
  - `export function kriCompleto(k: KriParaTrava): boolean`
  - `MotivoTrava` ganha `'sem_kri_em_critico'`; `verificarTravaRiscoCritico(e: { statusCritico; estrategiaPrincipal; estrategiasDasAcoes; kris: KriParaTrava[] })` — ordem: Aceitar → sem ação → sem KRI completo.
  - `export const MENSAGEM_TRAVA_KRI: string` (texto fixo).
  - `IndicadorKri`: `{ id: string; objetoId: string; riscoIds: string[]; nomeIndicador: string; formulaCalculo?: string; fonteDados?: string; periodicidade?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'; metaAlvo?: string; limiteAlerta?: string; responsavelMedicao?: string; medicoes: MedicaoKri[] }`.
  - `FichaParaSalvar.kris` (tipos.ts): `Array<Omit<IndicadorKri, 'id' | 'medicoes' | 'objetoId' | 'riscoIds'> & { id?: string; apenasLigar?: boolean }>`.

- [ ] **Step 1: Write the failing tests** em `travaRiscoCritico.spec.ts`:
  - `kriCompleto` é `true` com os 6 campos preenchidos e `metaAlvo` ausente; `false` quando qualquer um dos 6 é `undefined`, `''`, `'   '`, `'A definir'`, `' a definir '` ou `'A definir pela unidade'`.
  - `verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: ['Mitigar'], kris: [] })` → `{ ok: false, motivo: 'sem_kri_em_critico' }`; com um KRI incompleto e outro completo → `{ ok: true }`; com `'Aceitar'` e sem KRI → motivo `'aceitar_em_critico'` (ordem); `statusCritico: 'nao'` e `kris: []` → `{ ok: true }`; `'pendente_dar'` sem KRI → `'sem_kri_em_critico'`.
  - `ajudaTravaCritico('sim')` termina com `Ele também precisa de um KRI completo (Metodologia 4.7.1).`
  - Em `errosBanco.spec.ts`: a mensagem `RADAR: o risco RADAR-2026-004 é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável).` vira `MENSAGEM_TRAVA_KRI`; a de "Aceitar" continua virando `MENSAGEM_TRAVA_CRITICO`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/travaRiscoCritico.spec.ts tests/unit/errosBanco.spec.ts` — Expected: FAIL (`kriCompleto` não existe).
- [ ] **Step 3: Implement** as interfaces acima. Em `errosBanco.ts`, a entrada com o trecho `precisa de tratamento: falta um KRI completo` → `MENSAGEM_TRAVA_KRI` fica **antes** da entrada genérica da LAC-13 (o dicionário usa a 1ª que bate). Em `fonteDemonstracao.ts:108`, `travaDaFicha` passa `kris: r.kris` (o resto da demonstração é a Tarefa 5). Ajuste os consumidores que o `vue-tsc` apontar só para compilar (ex.: `?? ''` na exibição); não mude comportamento aqui.
- [ ] **Step 4: Run** `npx vue-tsc --noEmit && npx vitest run` — Expected: PASS. Testes antigos que montam `IndicadorKri` ganham `objetoId`/`riscoIds`.
- [ ] **Step 5: Commit** `feat(lac-03): KRI completo como 3º motivo da trava em TypeScript`

### Task 2: Banco — estrutura, dados e RLS (1ª parte da migração)

**Files:**
- Create: `supabase/migrations/20261122004_lac03_kri_obrigatorio.sql` (seções 1 a 5)
- Create: `supabase/tests/110_lac03_kri_obrigatorio.test.sql`
- Modify: `src/utils/auditoriaLegivel.ts:56,69` (nome legível de `kri_riscos`)
- Test: `supabase/tests/110_lac03_kri_obrigatorio.test.sql`, `tests/unit/auditoriaLegivel.spec.ts`

**Interfaces:**
- Produces (banco):
  - `indicadores_kri.objeto_id uuid NOT NULL REFERENCES public.objetos_contexto(id) ON DELETE CASCADE` (preenchido do risco atual).
  - `public.kri_riscos (kri_id uuid NOT NULL REFERENCES public.indicadores_kri(id) ON DELETE CASCADE, risco_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE, criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (kri_id, risco_id))`, com índice em `risco_id`; preenchida com `(id, risco_id)` de cada KRI.
  - `formula_calculo`, `fonte_dados`, `periodicidade`, `meta_alvo`, `limite_alerta`, `responsavel_medicao` sem `NOT NULL` (o `CHECK` de `periodicidade` continua e aceita `NULL`).
  - `public.fn_texto_preenchido(t text) RETURNS boolean IMMUTABLE` e `public.fn_kri_completo(k public.indicadores_kri) RETURNS boolean IMMUTABLE` — mesma definição da Tarefa 1.
  - Gatilhos em `kri_riscos`: `trg_kri_riscos_mesmo_objeto` (BEFORE INSERT OR UPDATE; recusa com o texto fixo), `trg_kri_riscos_trava_reabertura` (BEFORE INSERT OR UPDATE OR DELETE, `fn_trava_reabertura_ficha()`, que já usa `risco_id`), `trg_kri_riscos_apaga_orfao` (AFTER DELETE; apaga o KRI sem nenhuma ligação restante), e o gatilho de auditoria no padrão de `20261115005_trilha_auditoria.sql:144`.
  - RLS: `indicadores_kri` por `objeto_id` (leitura: objeto no alcance; escrita: `pode_escrever_objeto(objeto_id)`); `kri_riscos` (leitura: `risco_id IN (SELECT r.id FROM public.riscos r)`; escrita: `pode_escrever_objeto` do objeto do risco); `medicoes_kri` pelo caminho medição → KRI → `objeto_id`. As políticas antigas que usam `indicadores_kri.risco_id` são trocadas (`DROP POLICY` + `CREATE POLICY`).
  - `indicadores_kri.risco_id` **continua** existindo nesta tarefa (só sai na Tarefa 3).
- Limpeza de dados (seção 5): campos iguais a um marcador (`fn_texto_preenchido` falso, sem ser `NULL`) viram `NULL`; os quatro valores do importador (`formula_calculo = 'Definido preliminarmente via skill CGOV'`, `fonte_dados = 'SEI / Sistema Setorial'`, `meta_alvo = '100%'`, `limite_alerta = '< 80%'`) viram `NULL` **só quando os quatro aparecem juntos** na mesma linha. Tudo dentro de bloco `DO` com `radar.fluxo = 'on'` local, para os gatilhos de reabertura não reabrirem aprovados (nenhum `status_fluxo` muda).

- [ ] **Step 1: Write the failing pgTAP** em `110_lac03_kri_obrigatorio.test.sql` (use `ajudantes.psql`; o pgTAP roda depois da migração, sobre tabelas vazias, então ele cobre funções, gatilhos e RLS; a cópia dos dados é provada no Step 4b):
  - `fn_kri_completo` falso para `' a definir '`; `fn_texto_preenchido('A definir pela unidade')` falso;
  - `INSERT` em `kri_riscos` ligando KRI do objeto A a risco do objeto B → `throws_ok(..., '23514')`;
  - desligar 1 de 2 riscos: KRI e medições ficam; desligar o último: KRI e medições somem;
  - excluir um risco em rascunho que compartilha KRI com um aprovado: o KRI continua ligado ao aprovado, que segue `aprovado`;
  - RLS: gestor de outra unidade não lê o KRI, não lê a ligação e não insere ligação (`set local role authenticated` + `request.jwt.claims`, como em `041_rls_escrita.test.sql`);
  - ligar um KRI a um risco aprovado reabre o risco (`em_validacao_cg`); ligar a risco em validação é recusado ("travada").
- [ ] **Step 2: Run** `npm run db:reset && npm run test:db` — Expected: FAIL em `110` (tabela `kri_riscos` não existe).
- [ ] **Step 3: Implement** as seções 1 a 5 da migração, com cabeçalho didático no padrão de `20261122003` (o que muda, por quê, exemplo, o que não muda). Ajuste `auditoriaLegivel.ts` (`kri_riscos: { nome: 'Ligação do KRI ao risco', feminino: true }` e o rótulo do grupo) com o teste correspondente.
- [ ] **Step 4: Run** `npm run db:reset && npm run test:db && npx vitest run` — Expected: PASS em tudo, inclusive `040`, `041`, `050`, `060`, `072` e `081` (ainda usam `risco_id`, que continua).
- [ ] **Step 4b: Prova da cópia dos dados (banco local, só dados de demonstração):** `supabase db reset --version 20261122003`, depois a semente (`docker exec -i supabase_db_cgov-riscos psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/seed-demonstracao.sql`), depois, por `psql`, inclua 3 KRIs de teste num risco da semente: um com `fonte_dados = ' a definir '`, um com os 4 valores do importador juntos e um com só `meta_alvo = '100%'`. Anote `count(*)` de `indicadores_kri`, de `medicoes_kri` e a lista `(id, risco_id)`. Rode `supabase migration up`. Expected: as mesmas contagens; `kri_riscos` com exatamente os pares anotados; `objeto_id` igual ao objeto do risco; o 1º KRI com `fonte_dados IS NULL`; o 2º com os 4 campos `NULL`; o 3º com `meta_alvo = '100%'`; nenhum `status_fluxo` mudou (compare `select id, status_fluxo from riscos` antes e depois). Termine com `npm run db:reset`. Cole os números na mensagem do commit.
- [ ] **Step 5: Commit** `feat(lac-03): KRI do objeto, ligação muitos para muitos e RLS`

### Task 3: Banco — trava, ficha, DAR e remoção de `risco_id` (2ª parte da migração)

**Files:**
- Modify: `supabase/migrations/20261122004_lac03_kri_obrigatorio.sql` (seções 6 a 10)
- Modify: `supabase/tests/110_lac03_kri_obrigatorio.test.sql`, `supabase/tests/040_rls_leitura.test.sql`, `041_rls_escrita.test.sql`, `050_fluxo.test.sql`, `060_auditoria.test.sql`, `072_preliminar_cgov.test.sql`, `081_salvar_ficha_risco.test.sql`, `100_lac13_trava_critico.test.sql`, `supabase/seed-demonstracao.sql`
- Test: os mesmos

**Interfaces:**
- Consumes: Tarefa 2 (`kri_riscos`, `fn_kri_completo`, `objeto_id`).
- Produces (banco):
  - `fn_trava_risco_critico(p_risco uuid) RETURNS text`: 3º motivo (texto fixo) quando não existe `kri_riscos` do risco cujo KRI passe em `fn_kri_completo`.
  - `fn_base_enviar_para_validacao`, `fn_base_validar_risco`, `fn_base_homologar_risco`: recriadas iguais às de `20261122002`, com `PERFORM 1 FROM public.categorias_risco AS c WHERE c.id = v_risco.categoria_id FOR SHARE;` logo depois de ler/travar a ficha e antes de qualquer leitura do apetite. Envoltórios e `GRANT`/`REVOKE` inalterados.
  - `salvar_ficha_risco(ficha jsonb)`, parte 2c reescrita: item sem `id` → `INSERT` em `indicadores_kri` com `objeto_id` do risco + ligação; item com `id` e `apenasLigar: true` → só a ligação (o KRI precisa ser do mesmo objeto; o gatilho já recusa); item com `id` sem `apenasLigar` → `UPDATE` da definição (KRI do mesmo objeto); ligações atuais do risco fora da lista → `DELETE` em `kri_riscos` (o órfão é apagado pelo gatilho). A conferência "KRI que não pertence ao risco" (linha 631 de `20261122002`) passa a ser "KRI que não pertence ao objeto do risco". A trava embutida (2d) continua depois da gravação dos KRIs.
  - `fn_trava_reabertura_kri()` + `trg_kris_trava_reabertura` recriado em `indicadores_kri` (BEFORE UPDATE OR DELETE): aplica `fn_fluxo_aplicar_trava(risco, 'alteração em definição do KRI' | 'exclusão em definição do KRI')` a **cada** risco ligado; INSERT livre (KRI sem ligação ainda); UPDATE que não muda nada é livre (como hoje).
  - `fn_dar_reavaliar_aprovados()`: o ramo de devolução usa o texto fixo do histórico, com `<motivo>` = `fn_trava_risco_critico(v_novo.id)`. Os outros ramos não mudam.
  - `ALTER TABLE public.indicadores_kri DROP COLUMN risco_id` no fim.
  - Seção final: a consulta só de leitura dos aprovados antigos fora da regra, num comentário pronto para copiar (`status_fluxo = 'aprovado' AND status_critico IN ('sim','pendente_dar') AND fn_trava_risco_critico(id) IS NOT NULL`), que vai para o guia na Tarefa 9.

- [ ] **Step 1: Write the failing pgTAP** em `110`:
  - enviar, validar e homologar risco crítico com Mitigar + ação e **sem** KRI → `throws_ok` com `%falta um KRI completo%`; com KRI incompleto → idem; com KRI completo **compartilhado** com outro risco do objeto → passa;
  - `salvar_ficha_risco` de aprovado crítico tirando o único KRI completo → recusado, nada muda;
  - `salvar_ficha_risco` com `apenasLigar` de KRI do mesmo objeto cria só a ligação (a definição não muda); com KRI de outro objeto → recusado;
  - alterar a definição de KRI compartilhado com um risco em validação → recusado ("travada"); com dois aprovados → os dois reabrem;
  - DAR muda: aprovado já crítico, com Mitigar + ação e sem KRI → `devolvido`, histórico `LIKE '%não passa na trava do risco crítico: falta um KRI completo%'` e sem `passou a Risco Crítico`; aprovado em `pendente_dar` → histórico com `por regra do sistema`; a mudança da DAR termina sem exceção;
  - `pg_get_functiondef` das três `fn_base_*` contém `FOR SHARE`;
  - `indicadores_kri` não tem a coluna `risco_id` (`hasnt_column`);
  - nenhuma função em `pg_proc` do esquema `public` cita `indicadores_kri` junto com `risco_id` fora de `kri_riscos` (consulta em `prosrc`; conferir a lista à mão no passo 3).
- [ ] **Step 2: Run** `npm run db:reset && npm run test:db` — Expected: FAIL em `110`.
- [ ] **Step 3: Implement** as seções 6 a 10. Antes do `DROP COLUMN`, rode `grep -n "risco_id" supabase/migrations/*.sql | grep -i kri` e confira que todas as funções vivas que liam `indicadores_kri.risco_id` foram recriadas nesta migração. Ajuste os pgTAP antigos que inserem KRI com `risco_id` (passam a inserir com `objeto_id` + `kri_riscos`) e dê KRI completo + ação aos riscos críticos de `seed-demonstracao.sql`, para continuarem andando no fluxo.
- [ ] **Step 4: Run** `npm run db:reset && npm run test:db && npx vitest run tests/unit/schemaSql.spec.ts` — Expected: PASS em todos os arquivos pgTAP.
- [ ] **Step 5: Commit** `feat(lac-03): trava exige KRI completo; ficha liga KRI do objeto; DAR com motivo real`

### Task 4: Leitura e gravação pelo Supabase, conversores e importador

**Files:**
- Modify: `src/services/dados/fonteSupabase.ts:140-260`, `src/services/dados/conversores.ts:184-200,271-320,430-500,540-616`, `src/utils/importadorSkillMarkdown.ts:369,380-395`
- Test: `tests/unit/conversores.spec.ts`, `tests/unit/fonteSupabaseLeitura.spec.ts`, `tests/unit/importadorSkillMarkdown.spec.ts`, `tests/integracao/fonteSupabaseGravacao.spec.ts`

**Interfaces:**
- Consumes: Tarefas 1 a 3.
- Produces:
  - `kriDoBanco(l, medicoes, riscoIds: string[]): IndicadorKri` — `NULL` vira `undefined`; `objetoId` de `objeto_id`.
  - `FilhosRiscoBanco` ganha `kriRiscos?: LinhaBanco[]`; `riscoDoBanco` monta `kris` pelos KRIs ligados ao risco (o mesmo KRI aparece em cada risco ligado, com o mesmo `id` e `riscoIds` completo).
  - `fichaParaJson`: KRI com `apenasLigar: true` vai como `{ id, apenasLigar: true }`; campos `undefined` ou vazios vão `null` (nunca "A definir").
  - `fichaDaSkillParaSalvar`: KRI só com `nomeIndicador` quando `kriSugerido` não está vazio; nenhum outro campo.
  - `importarTabelaMarkdownSkill`: coluna 15 vazia → `kriSugerido = ''`; linha crítica (`exigeTratamento`) → aviso fixo em `avisos` (o KRI importado nunca é completo).

- [ ] **Step 1: Write the failing tests:**
  - `importadorSkillMarkdown.spec.ts`: linha sem KRI → `kriSugerido === ''` e nenhum `'Indicador a definir com a 1ª Linha'` (RF-184); linha crítica → `avisos` contém `Linha R-07: risco crítico sem KRI completo; complete o KRI na ficha antes do envio.` e `erros` vazio.
  - `conversores.spec.ts`: `fichaDaSkillParaSalvar` com `kriSugerido: 'X'` → `kris` igual a `[{ nomeIndicador: 'X' }]` (RF-183); com `''` → `[]`; `fichaParaJson` com `apenasLigar` → `{ id, apenasLigar: true }`; `kriDoBanco` com `limite_alerta: null` → `limiteAlerta` `undefined`; `riscoDoBanco` de dois riscos com o mesmo KRI → os dois têm o KRI com `riscoIds` dos dois.
  - `fonteSupabaseLeitura.spec.ts`: a carga lê `kri_riscos` e agrupa por risco.
- [ ] **Step 2: Run** `npx vitest run tests/unit/conversores.spec.ts tests/unit/importadorSkillMarkdown.spec.ts tests/unit/fonteSupabaseLeitura.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Em `fonteSupabase.ts`, trocar `agruparPor(kriL, 'risco_id')` e `lerFilhosPorIds('indicadores_kri', 'risco_id', …)` por leitura de `kri_riscos` + KRIs por `id`. `registrarMedicao(kriId, m)` não muda.
- [ ] **Step 4: Run** `npx vitest run` e, com o banco local no ar, `npm run test:integracao` — Expected: PASS (inclui gravar ficha com KRI novo, ligar KRI existente e desligar).
- [ ] **Step 5: Commit** `feat(lac-03): Supabase lê KRI por ligação; importador sem KRI inventado`

### Task 5: Fonte de demonstração e sementes

**Files:**
- Modify: `src/services/dados/fonteDemonstracao.ts` (`travaDaFicha`, `salvarFicha`, `registrarMedicao`, reavaliação da DAR em ~`:610-640`, exclusão de risco), `src/services/dadosSementeAnexoII.ts`
- Test: `tests/unit/fonteDemonstracao.spec.ts`, `tests/unit/dadosSementeConsistencia.spec.ts`, `tests/unit/schemaSql.spec.ts:43`

**Interfaces:**
- Consumes: Tarefa 1 (`verificarTravaRiscoCritico` com `kris`, `MENSAGEM_TRAVA_KRI`), Tarefa 4 (forma de `kris` em `FichaParaSalvar`, `apenasLigar`).
- Produces: a demonstração imita o banco: KRIs guardados por objeto, ligações muitos para muitos, órfão apagado com as medições, trava com 3º motivo (recusa com `MENSAGEM_TRAVA_KRI`), alteração de KRI compartilhado reabre os aprovados ligados e é recusada se algum estiver em validação, histórico da DAR com o texto fixo. Exclusão de risco desliga os KRIs dele.

- [ ] **Step 1: Write the failing tests** em `fonteDemonstracao.spec.ts` (bloco `describe('KRI obrigatório e grupo (LAC-03)')`): enviar crítico com Mitigar + ação e sem KRI → `MENSAGEM_TRAVA_KRI`; com KRI completo → `em_validacao_cg`; salvar 2º risco do mesmo objeto com `{ id: kriDoPrimeiro, apenasLigar: true }` → os dois riscos mostram o mesmo `kri.id`; medir uma vez → a medição aparece nos dois; desligar do 2º → o 1º mantém; desligar do último → KRI some; DAR muda com aprovado crítico sem KRI → `devolvido` e histórico com `não passa na trava do risco crítico: falta um KRI completo`. Em `dadosSementeConsistencia.spec.ts`: todo risco da semente com `exigeTratamento(statusCritico)` tem ao menos um KRI com `kriCompleto`; existe pelo menos um KRI com `riscoIds.length >= 2`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/fonteDemonstracao.spec.ts tests/unit/dadosSementeConsistencia.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Nas sementes, completar os KRIs dos riscos críticos e fazer dois riscos críticos do mesmo objeto compartilharem um KRI. Ajustar `schemaSql.spec.ts:43` se a contagem de KRIs do 1º risco mudar.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(lac-03): demonstração com KRI do objeto e trava do KRI`

### Task 6: Formulário, etapa 4

**Files:**
- Modify: `src/utils/formularioRisco.ts` (`DadosNovoRisco`, `validarEtapa`, `dadosDeRisco` ~`:182-215`, `montarFicha` ~`:257-299`), `src/views/FormularioRiscoView.vue:580-600`, `src/stores/riscosStore.ts`
- Test: `tests/unit/formularioRisco.spec.ts`, `tests/unit/novoRiscoPagina.spec.ts`, `tests/unit/riscosStore.spec.ts`

**Interfaces:**
- Consumes: Tarefas 1, 4 e 5.
- Produces:
  - `DadosNovoRisco` ganha `kriFormula`, `kriFonte`, `kriPeriodicidade: '' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'`, `kriMeta`, `kriLimite`, `kriResponsavel` (strings, `''` = vazio) e `kriExistenteId: string` (`''` = definir um novo).
  - `validarEtapa(4, d, categorias, statusCritico)`: com `exigeTratamento(statusCritico)` e sem KRI completo (novo: os 6 campos; existente: o KRI escolhido passa em `kriCompleto`) → `erros.nomeKri = MENSAGEM_TRAVA_KRI`. Não crítico: sem erro, mesmo incompleto.
  - `riscosStore.krisDoObjeto(objetoId: string): IndicadorKri[]` — KRIs dos riscos carregados daquele objeto, sem repetir `id`.
  - `montarFicha`: `kriExistenteId` preenchido → `{ id: kriExistenteId, apenasLigar: true, nomeIndicador }`; novo → campos vazios viram `undefined` (nunca "A definir"; some o padrão de `formularioRisco.ts:261-263`).
  - Na tela: o bloco do KRI ganha os campos (`FormField` + `input`/`select`, rótulos "Fórmula de cálculo", "Fonte dos dados", "Periodicidade de monitoramento", "Meta (opcional)", "Limite de alerta", "Responsável pelo monitoramento"); um `select` "Usar um KRI já definido neste objeto" com `nomeIndicador — riscos: <códigos>`; com KRI existente escolhido, os campos ficam só leitura; editar KRI com `riscoIds.length > 1` mostra o aviso fixo (`BrMessage state="warning"`). A ajuda "Opcional" muda para "Obrigatório para risco crítico." quando `exigeTratamento`. O aviso de medições apagadas (`:105-118`) continua.

- [ ] **Step 1: Write the failing tests:** `formularioRisco.spec.ts` — etapa 4 crítica com só o nome → erro `MENSAGEM_TRAVA_KRI`; com os 6 campos → sem erro; com `kriExistenteId` de KRI completo → sem erro; não crítica só com o nome → sem erro; `montarFicha` com nome e fonte vazia → `fonteDados` `undefined` (nunca `'A definir'`); com `kriExistenteId` → `apenasLigar: true`. `novoRiscoPagina.spec.ts` — a lista de KRIs do objeto aparece e, escolhido um compartilhado, o aviso fixo aparece ao liberar a edição. `riscosStore.spec.ts` — `krisDoObjeto` não repete o KRI compartilhado.
- [ ] **Step 2: Run** `npx vitest run tests/unit/formularioRisco.spec.ts tests/unit/novoRiscoPagina.spec.ts tests/unit/riscosStore.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as interfaces acima, com comentários didáticos.
- [ ] **Step 4: Run** `npx vue-tsc --noEmit && npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(lac-03): etapa 4 com KRI completo e KRI compartilhado do objeto`

### Task 7: Monitoramento, uma linha por KRI

**Files:**
- Modify: `src/views/MonitoramentoKriPlanoAcaoView.vue:56-135`
- Test: `tests/unit/monitoramentoPagina.spec.ts`

**Interfaces:**
- Consumes: `IndicadorKri.riscoIds`; `riscosStore.registrarMedicaoKri(riscoId, kriId, medicao)` (passe o 1º risco ligado como `riscoId`, que só serve para reler).
- Produces: `LinhaKri` = `{ kri: IndicadorKri; riscos: FichaRisco[]; leituras; semaforo }`, uma por `kri.id`, com "Riscos: R-01, R-04"; KRI com `limiteAlerta` não preenchido mostra `limite não definido`.

- [ ] **Step 1: Write the failing test:** com a semente da Tarefa 5, o KRI compartilhado aparece **uma** vez, com os dois códigos; registrar uma leitura nele chama `registrarMedicaoKri` uma vez; KRI sem limite mostra `limite não definido`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/monitoramentoPagina.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** o agrupamento por `kri.id` no `computed` `kris`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(lac-03): monitoramento mostra cada KRI uma vez, com os riscos ligados`

### Task 8: Documentação

**Files:**
- Modify: `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-094 a RF-097, RF-183, RF-184), `regras-negocio.md` (RN-082, RN-083), `casos-de-uso/UC-07-…md` (5c), `UC-13-…md` (5b), `UC-15-…md` (1a), `rastreabilidade.md`, `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (LAC-03; F4-10 respondido na prática), `docs/40-nivel4-dados/` (MER, DER com a migração `20261122004`, dicionário e normalização: `kri_riscos`, `objeto_id`, campos que aceitam `NULL`), `docs/90-kanban/quadro.md` (cartão da LAC-03 para "Homologação CGOV"; sobras da LAC-13 resolvidas; novo cartão no Backlog: "Atualizar no Figma a etapa 4 do formulário e o monitoramento com os campos do KRI e o KRI compartilhado"), `docs/90-kanban/analise-lacunas-codigo-requisitos.md`, `docs/00-memoria/ESTADO-ATUAL.md` (contagens de RF, migrações 16)
- Test: `tests/unit/documentacao.spec.ts`

- [ ] **Step 1:** Atualize os documentos com a situação "implementado no código e no banco local (LAC-03, 2026-11-22); nuvem: pendente".
- [ ] **Step 2: Run** `npx vitest run tests/unit/documentacao.spec.ts` — Expected: PASS (siglas, IDs, seções).
- [ ] **Step 3: Commit** `docs(lac-03): requisitos, dados, Kanban e estado`
- [ ] **Step 4 (fim da Fase 1):** `/code-review` nível `medium` na branch; corrija o procedente num commit; push da branch (o repositório é público: confira o diff); abra a PR `Fase 1: LAC-03 KRI obrigatório (código e banco local)` com o que a fase entregou, os testes rodados e o que fica (Tarefa 9, cartão do alerta RF-102, Figma).

### Task 9: Nuvem do piloto (Fase 2)

**Files:**
- Modify: `docs/02-arquitetura-cgti/guia-supabase-nuvem.md`, `docs/00-memoria/ESTADO-ATUAL.md`, `docs/90-kanban/quadro.md`, `docs/20-nivel2-requisitos/requisitos-funcionais.md`, `docs/10-nivel1-negocio/lacunas-norma-sistema.md`

- [ ] **Step 1 [AUTORIZAÇÃO]:** pare e peça para rodar, só leitura, no projeto do piloto: contagem de `indicadores_kri`, de `medicoes_kri` e de riscos com KRI. Anote os números no guia.
- [ ] **Step 2 [AUTORIZAÇÃO]:** pare e peça para aplicar a `20261122004` (`supabase db push`, como no [[guia-supabase-nuvem]] §4).
- [ ] **Step 3 [AUTORIZAÇÃO]:** pare e peça para conferir por leitura: as mesmas contagens, `count(*)` de `kri_riscos` igual ao de KRIs, coluna `risco_id` ausente, e a consulta dos aprovados antigos fora da regra (da Tarefa 3), com o resultado registrado só como número (sem dados pessoais) no guia.
- [ ] **Step 4 [AUTORIZAÇÃO]:** publicação do front, se o responsável quiser, pelo rito de sempre.
- [ ] **Step 5:** atualize os documentos com "aplicada na nuvem do piloto em <data>"; commit `docs(nuvem): migração da LAC-03 aplicada no piloto`; abra a PR `Fase 2: LAC-03 na nuvem do piloto`.
