# Etapa B3 — Telas lendo e gravando no banco — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No modo real, as 13 telas do RADAR leem e gravam no Supabase (alcance pela RLS, fluxo pelas funções do banco, botões decididos por risco pelo banco); o modo demonstração continua em memória.

**Architecture:** Uma camada de dados (`src/services/dados/`) com a interface `FonteDados` e duas implementações (`fonteDemonstracao`, `fonteSupabase`). A `riscosStore` escolhe a fonte pelo `authStore.modo`, ganha estados `carregando/erro/pronto` e mantém o contrato que as telas já usam. Uma migração nova (`20261117001`) traz quatro funções (três só de leitura e uma de gravação única) e uma sequência.

**Tech Stack:** Vue 3 + TypeScript + Pinia + `@govbr-ds/core`; Supabase (PostgreSQL 15, PostgREST, `supabase-js` 2); Vitest; pgTAP; Playwright + axe-core.

**Spec:** [`docs/superpowers/specs/2026-11-16-etapa-b3-telas-banco-design.md`](../specs/2026-11-16-etapa-b3-telas-banco-design.md) — o executor lê a spec e este plano.

## Global Constraints

- **Cálculo intocável:** não alterar `src/utils/calculadoraRiscoRadar.ts`, `trigger_calcular_risco_radar`, nem os Quadros 6, 7 e 8. No modo real o front **não** grava valores calculados.
- **Banco:** só a migração `supabase/migrations/20261117001_leitura_acoes_e_gravacao_ficha.sql` (autorizada). Não mexer em políticas RLS, funções de alcance, funções do fluxo nem migrações antigas. Qualquer outra mudança de banco → parar e perguntar ao dono do produto.
- **Nunca** abrir, listar ou ler `_temp/`. E-mails só no Mailpit. Só usuários fictícios `@radar.test` / `@integracao.radar.test`.
- Comentários e documentação **didáticos em português do Brasil** (o responsável é iniciante), com exemplo prático nos blocos importantes. Migração com comentário por função, como nas migrações `20261116*`.
- Siglas: nunca "PGR" para o Plano de Gestão de Riscos; níveis Baixo/Médio/Alto/Extremo; "Crítico" = fora do apetite da DAR (nunca sinônimo de Extremo).
- Front só com tokens e componentes do design system (`src/components/ui/`, `@govbr-ds/core`); zero cor fixa (`higieneCss.spec.ts`); `npm run test:a11y` com **0 violações**.
- Paginação: toda leitura de lista no modo real usa `lerTodasAsPaginas` (1.000 por página, ordem estável terminando em `id`), exceto a Auditoria (cursor de 50).
- Mensagens ao usuário passam por `traduzirErroBanco`; nunca exibir texto do PostgreSQL/PostgREST que não começa por `RADAR:`.
- **Git:** commit ao fim de cada tarefa aprovada, mensagem `tipo(b3): resumo` em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca commitar `_temp/` nem `.env`. Sem push/PR.
- Banco local: `npm run db:start` (Docker) antes dos testes de banco/integração; `npm run db:funcoes` em outro terminal para a integração.

## Review Focus

1. **Sessão trocada/encerrada no meio da carga** (sair, entrar como outra pessoa): a store não pode mostrar riscos da pessoa anterior → teste na Tarefa 8 (`descarta carga velha ao sair`).
2. **Ação concorrente** (outro titular validou antes; risco mudou de estado entre a leitura e o clique): a recusa `55000` vira "O risco mudou de situação…", e a store relê o risco e as ações → teste na Tarefa 7 e na Tarefa 10.
3. **Mais de 1.000 linhas** (riscos, objetos, unidades com 843 linhas reais, ids em `acoes_no_fluxo`): nenhuma linha some → testes de paginação/lotes nas Tarefas 1 e 6.
4. **Importação parcial** (5 fichas, a 3ª recusada): as outras gravam e a tela diz "4 de 5 importados" com o motivo da recusada → teste na Tarefa 11.
5. **Risco apagado ou fora do alcance aberto pela URL** (`/riscos/<uuid>`): "Risco não encontrado", sem revelar qual dos dois e sem erro técnico → teste na Tarefa 10.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `src/types/radar.types.ts` | tipos de domínio (+16 tipos de unidade, ações do histórico, `AcoesFluxo`, campos novos de objeto/unidade/risco) | 1 |
| `src/utils/rotulosInterface.ts` | rótulos de tipo de unidade e das ações do histórico | 1 |
| `src/services/dados/errosBanco.ts` | `ErroRadar` + `traduzirErroBanco` | 1 |
| `src/services/dados/paginacao.ts` | `lerTodasAsPaginas`, `emLotes` (extraído de `acessoUsuarios.ts`) | 1 |
| `supabase/migrations/20261117001_leitura_acoes_e_gravacao_ficha.sql` | 4 funções + sequência | 2, 3, 4 |
| `supabase/seed-demonstracao.sql` | ajuste da sequência do código | 3 |
| `supabase/tests/080_acoes_no_fluxo.test.sql`, `081_salvar_ficha_risco.test.sql`, `082_leituras_b3.test.sql` | pgTAP | 2, 3, 4 |
| `src/services/dados/tipos.ts` | interface `FonteDados` e tipos de entrada/saída | 5 |
| `src/services/dados/conversores.ts` | linha do banco ⇄ tipos do front (puras) | 5 |
| `src/services/dados/fonteDemonstracao.ts` | lógica atual da store, em memória | 5 |
| `src/services/dados/fonteSupabase.ts` | consultas e RPCs | 6, 7 |
| `src/stores/riscosStore.ts` | estado, carga, ações assíncronas, limpeza | 8 |
| `src/components/ui/EstadoCarregamento.vue`, `src/components/ui/ErroPagina.vue` | carregando / erro de bloco / erro de página | 9 |
| views em `src/views/` | uma ou duas por tarefa | 9–14 |
| `tests/a11y/telas.ts`, `tests/a11y/varredura.a11y.ts` | estados novos na varredura | 15 |
| docs (`decisoes-tecnicas-b3.md`, MER, guia, design-system, aula 6, ESTADO, MOC) | documentação | 15 |

---

### Task 1: Tipos, rótulos, tradutor de erros e paginação

**Files:**
- Modify: `src/types/radar.types.ts`, `src/utils/rotulosInterface.ts`, `src/services/acessoUsuarios.ts` (passa a importar a paginação)
- Create: `src/services/dados/errosBanco.ts`, `src/services/dados/paginacao.ts`
- Test: `tests/unit/errosBanco.spec.ts`, `tests/unit/paginacao.spec.ts`, `tests/unit/filtrosERotulos.spec.ts` (ampliar)

**Interfaces:**
- Produces (tipos):
  - `TipoUnidade` = os 16 valores do CHECK de `20261115001` (`presidencia`, `diretoria`, `coordenacao-geral`, `gerencia-regional`, `coordenacao`, `centro-pesquisa`, `ngi`, `uc`, `coordenacao-territorial`, `coordenacao-assessoramento`, `orgao-assistencia`, `gabinete`, `divisao`, `servico`, `setor`, `base-avancada`).
  - `UnidadeOrganizacional` + `ativa: boolean`.
  - `ObjetoContexto` + `processoId: string | null`, `processoNome: string | null`, `processoAtivo: boolean | null`, `unidadeAtiva: boolean`; `macroprocessoSupervisorId` e `diretoriaId` passam a `string | null`.
  - `FichaRisco` + `unidadeId: string`, `atualizadoEm: string | null`.
  - `HistoricoFluxoItem.etapa` += `'assuncao_preliminar'`; `.acao` = `'submetido' | 'assumido' | 'validado' | 'validado_e_homologado' | 'homologado' | 'devolvido_ajuste' | 'reaberto_mudanca_nota' | 'reaberto_mudanca_dar' | 'aprovado_1_clique'`; `.usuarioPapel: PapelGovernanca | string`.
  - `interface AcoesFluxo { riscoId: string; podeEnviar: boolean; podeAssumir: boolean; podeValidar: boolean; podeHomologar: boolean; podeDevolver: boolean; devolucaoCgov: boolean; podeEditar: boolean; podeExcluir: boolean; motivo: string | null }`
  - `interface ProcessoCadeiaValor { id: string; procId: string; nome: string; macroprocesso: string | null; ativo: boolean; unidadeSupervisoraId: string | null }`
- Produces (funções):
  - `class ErroRadar extends Error { tipo: TipoErroRadar; codigo: string | null }` com `type TipoErroRadar = 'permissao' | 'estado' | 'validacao' | 'nao_encontrado' | 'rede' | 'desconhecido'`.
  - `traduzirErroBanco(erro: unknown): ErroRadar` (aceita `PostgrestError`, `Error`, `TypeError` de rede, `ErroRadar` — este volta igual).
  - `lerTodasAsPaginas<T>(pedirPagina: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: unknown }>, tamanho?: number): Promise<T[]>` (padrão 1.000; erro → `traduzirErroBanco`).
  - `emLotes<T, R>(itens: T[], tamanho: number, fazer: (lote: T[]) => Promise<R[]>): Promise<R[]>`.

- [ ] **Step 1: Testes que falham** — `tests/unit/errosBanco.spec.ts`:
  - `"traduz a trava da ficha"`: `{ code: '55000', message: 'RADAR: a ficha do risco RADAR-DEMO-CT está travada (estado "em_validacao_cg"): …' }` → `tipo === 'estado'` e `message === 'Este risco está em validação ou homologação e não pode ser editado agora. Peça à chefia que o devolva para ajuste.'`.
  - `"cai no código quando o trecho é desconhecido"`: `{ code: '42501', message: 'new row violates row-level security policy for table "riscos"' }` → `message === 'Você não tem permissão para esta ação.'` e a mensagem **não contém** `row-level`.
  - `"55000 sem trecho conhecido"` → `'O risco mudou de situação. Atualize a página e tente de novo.'`; `"22023"` → `'Informe o motivo.'`; `"P0002"` → `'Risco não encontrado.'`.
  - `"RADAR: desconhecido mostra o texto sem o prefixo"`: `{ code: 'XX000', message: 'RADAR: algo novo aconteceu.' }` → `'Algo novo aconteceu.'` (primeira letra maiúscula).
  - `"falha de rede"`: `new TypeError('Failed to fetch')` → `tipo === 'rede'` e a mensagem igual a `MENSAGEM_REDE` da B2 (`'Não foi possível falar com o RADAR. Verifique sua conexão e tente de novo.'`).
  - `"dicionário cobre todas as mensagens RADAR: do fluxo"`: para cada trecho fixo das mensagens `RADAR:` de `enviar_para_validacao`, `validar_risco`, `homologar_risco`, `devolver_risco`, `assumir_risco_preliminar`, `reatribuir_objeto`, `regras_objeto_contexto` e das travas (lista no próprio teste, copiada das migrações `20261115004`, `20261116001`, `20261116002`, `20261116004`), a tradução não é a frase genérica do código.
  - `tests/unit/paginacao.spec.ts`: `"junta 2.345 linhas em 3 páginas"` (pedido falso que devolve fatias de um array de 2.345; espera 3 chamadas com `(0,999)`, `(1000,1999)`, `(2000,2999)` e 2.345 itens); `"para quando a página vem exata e a seguinte vazia"` (2.000 itens → 3 chamadas); `"erro vira ErroRadar"`; `"emLotes divide 2.500 ids em 3 lotes de até 1.000"`.
  - `filtrosERotulos.spec.ts`: todo `TipoUnidade` tem rótulo; toda `acao` do histórico tem rótulo, e o de `reaberto_mudanca_dar` contém "DAR".
- [ ] **Step 2:** `npx vitest run tests/unit/errosBanco.spec.ts tests/unit/paginacao.spec.ts tests/unit/filtrosERotulos.spec.ts` → FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar os tipos, rótulos, `errosBanco.ts` (dicionário `[trecho, mensagem, tipo][]`; frases curtas com o que fazer) e `paginacao.ts`; `acessoUsuarios.ts` passa a importar `lerTodasAsPaginas` (comportamento igual). Corrigir o que o `vue-tsc` acusar pelos campos novos (valores nos dados de demonstração: `ativa: true`, `processoId: null`, etc.).
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): tipos do banco, tradutor de erros e paginação`.

---

### Task 2: Migração — `acoes_no_fluxo`

**Files:**
- Create: `supabase/migrations/20261117001_leitura_acoes_e_gravacao_ficha.sql` (seção 1)
- Test: `supabase/tests/080_acoes_no_fluxo.test.sql`

**Interfaces:**
- Produces: `public.acoes_no_fluxo(riscos uuid[]) RETURNS TABLE (risco_id uuid, pode_enviar boolean, pode_assumir boolean, pode_validar boolean, pode_homologar boolean, pode_devolver boolean, devolucao_cgov boolean, pode_editar boolean, pode_excluir boolean, motivo text)` — `STABLE`, `SECURITY DEFINER`, `SET search_path = ''`; `REVOKE … FROM public, anon`; `GRANT EXECUTE … TO authenticated`. Mais de 1.000 ids → `RAISE EXCEPTION 'RADAR: no máximo 1000 riscos por consulta de ações.' USING ERRCODE = '22023'`. Ids que a pessoa não lê (`pode_ler_objeto`) ou inexistentes são omitidos.
- Semântica das colunas: spec §6.1 (cada coluna chama as mesmas funções internas que a ação: `pode_escrever_objeto`, `chefia_imediata`, `fn_fluxo_validador_efetivo`, `fn_fluxo_homologador_efetivo`, `fn_fluxo_quem_enviou`, `fn_fluxo_titular_da_unidade`, `cgov_grava_no_risco_preliminar`; "exige homologação" recalculado como em `enviar_para_validacao` de `20261116001`). Não reescrever a regra com outra lógica.
- `motivo` (frases exatas): sem chefia acima no envio → `'Não há chefia acima para validar este risco; procure a CGOV.'`; exige homologação sem homologador efetivo → `'Não há quem homologue este risco; a CGOV pode devolvê-lo.'`; estado de decisão sem ator efetivo → `'Não há quem decida este risco agora; a CGOV pode devolvê-lo à unidade.'`; ficha travada → `'Ficha em validação ou homologação: peça a devolução para editar.'`; demais → `null`.

- [ ] **Step 1: Teste que falha** — `080_acoes_no_fluxo.test.sql` (padrão do `072`: `begin; \ir ajudantes.psql; select plan(n); … rollback`). Algoritmo do teste "se e somente se" (escrever como função `pg_temp.conferir_acao(email, risco, acao)`):

```sql
-- Para cada pessoa da semente e cada risco da semente, em SAVEPOINT:
--   1) entrar_como(email); ler a coluna de acoes_no_fluxo(array[risco]);
--   2) tentar a ação de verdade (enviar/assumir/validar/homologar/devolver com motivo 'teste';
--      editar = UPDATE riscos SET causas = causas || ' ' WHERE id = risco, conferindo 1 linha;
--      excluir = DELETE … conferindo 1 linha);
--   3) ROLLBACK TO SAVEPOINT; devolver (coluna = passou).
-- Um is() por (pessoa × ação) agregado: "gestor.uc@ pode_enviar bate com a ação em todos os riscos".
```

  Pessoas: as 18 com perfil da semente (lista em `seed-demonstracao.sql`, sem `sem-perfil@`). Ações: enviar, assumir, validar, homologar, devolver, editar, excluir. Mais casos nomeados: `presidente@` em risco crítico da Presidência → `pode_enviar = false` e `motivo` = frase de "Não há quem homologue…"; `cgov@` em risco `em_homologacao_dir` sem homologador efetivo → `devolucao_cgov = true`; `auditor@` não vê risco fora do alcance (linha omitida); `anon` não executa (`throws_ok … '42501'`); 1.001 ids → `throws_ok … '22023'`. Inclua um risco `preliminar_cgov` criado no próprio teste (como no `072`) para `pode_assumir`, `pode_editar`/`pode_excluir` da CGOV.
- [ ] **Step 2:** `npm run db:reset && npm run test:db` → FAIL em `080` (função não existe).
- [ ] **Step 3:** Escrever a seção 1 da migração com comentários didáticos (o que é, exemplo com usuários da semente, por que `SECURITY DEFINER` aqui é seguro: só lê e só devolve riscos legíveis).
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS (todos os arquivos, inclusive os 630 antigos).
- [ ] **Step 5:** Commit `feat(b3): função acoes_no_fluxo e teste 080`.

---

### Task 3: Migração — `salvar_ficha_risco` e código do risco

**Files:**
- Modify: `supabase/migrations/20261117001_leitura_acoes_e_gravacao_ficha.sql` (seção 2), `supabase/seed-demonstracao.sql` (fim do arquivo)
- Test: `supabase/tests/081_salvar_ficha_risco.test.sql`

**Interfaces:**
- Produces: sequência `public.riscos_codigo_seq` (`GRANT USAGE … TO authenticated`); `public.salvar_ficha_risco(ficha jsonb) RETURNS TABLE (id uuid, codigo_radar text)` — `VOLATILE`, `SECURITY INVOKER`, `SET search_path = ''`, `EXECUTE` só `authenticated`.
- Formato de `ficha` (chaves = colunas do banco): `id` (opcional), `objeto_id`, `preliminar_cgov` (bool, opcional), `responsavel_risco_nome`, `causas`, `evento_risco`, `consequencias`, `objetivo_afetado`, `categoria_id`, `subcategoria_integridade`, `teste_integridade_aplicavel`, `justificativa_nao_integridade`, `probabilidade`, `justificativa_probabilidade`, `impacto`, `justificativa_impacto`, `possui_evidencia_controle`, `nivel_eficacia_controle`, `estrategia_principal`; `controles[]` (`id?`, `descricao_controle`, `evidencia_funcionamento`, `possui_evidencia_comprovada`, `desenho_adequado`, `operacao_comprovada`); `respostas[]` (`id?` + colunas de `respostas_tratamento` sem `risco_id`/`criado_em`); `kris[]` (`id?` + colunas de `indicadores_kri` sem `risco_id`/`criado_em`). Chave de filho **ausente** = não mexe naquele grupo; lista presente = sincroniza (insere sem id, atualiza com id, apaga os do risco que não vieram).
- Código: `'RADAR-' || extract(year from now())::int || '-' || lpad(nextval('public.riscos_codigo_seq')::text, 3, '0')` (o `lpad` não corta acima de 999).
- Nunca grava `status_fluxo` (exceto o estado inicial `preliminar_cgov` no INSERT pedido) nem colunas calculadas (`descricao_padrao`, níveis, classificações, fator, criticidade): o gatilho de cálculo as preenche.
- `seed-demonstracao.sql`: `select setval('public.riscos_codigo_seq', greatest(1, coalesce(max((regexp_match(codigo_radar, '^RADAR-\d{4}-(\d+)$'))[1]::int), 0)), …)` com comentário didático.

- [ ] **Step 1: Teste que falha** — `081`: (a) `gestor.uc@` cria ficha com 2 controles, 1 resposta, 1 KRI → devolve `codigo_radar` no padrão `^RADAR-\d{4}-\d{3,}$`, estado `rascunho`, 2+1+1 filhos; o código seguinte é maior; (b) o primeiro código depois do `db:reset` é `RADAR-<ano>-002` (a semente tem `RADAR-2026-001`) — usar o ano corrente no teste; (c) **risco aprovado**: o titular da unidade de `RADAR-DEMO-COFIS` muda P e troca os controles numa chamada → estado `em_validacao_cg`, **uma** linha `reaberto_mudanca_nota` no histórico, filhos trocados; (d) a mesma alteração feita por dois `UPDATE` separados (sem a função) é recusada no 2º com `55000` — prova o motivo da função; (e) recusa no meio desfaz tudo: ficha com KRI de `periodicidade = 'Diária'` → erro e nenhum risco novo nem controle; (f) `gestor.uc@` tenta `preliminar_cgov` → `42501`; `cgov@` cria `preliminar_cgov` em objeto de outra unidade → passa; (g) quem não grava no objeto → `42501`; (h) valores calculados enviados no JSON são ignorados (enviar `nivel_residual = 1` e conferir o valor do gatilho); (i) `anon` não executa.
- [ ] **Step 2:** `npm run db:reset && npm run test:db` → FAIL em `081`.
- [ ] **Step 3:** Seção 2 da migração + ajuste da sequência na semente, com comentários didáticos (por que um comando só: a regra "reaberto neste comando").
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS (tudo).
- [ ] **Step 5:** Commit `feat(b3): função salvar_ficha_risco, código do risco e teste 081`.

---

### Task 4: Migração — `ler_auditoria` e `objetos_onde_gravo`

**Files:**
- Modify: `supabase/migrations/20261117001_leitura_acoes_e_gravacao_ficha.sql` (seções 3 e 4)
- Test: `supabase/tests/082_leituras_b3.test.sql`

**Interfaces:**
- Produces: `public.ler_auditoria(p_de timestamptz DEFAULT NULL, p_ate timestamptz DEFAULT NULL, p_tabela text DEFAULT NULL, p_antes_em timestamptz DEFAULT NULL, p_antes_id uuid DEFAULT NULL, p_limite int DEFAULT 50) RETURNS TABLE (id uuid, realizado_em timestamptz, tabela_afetada text, operacao text, registro_id uuid, objeto_id uuid, usuario_id uuid, quem_nome text, quem_papel text, codigo_radar text, dados_anteriores jsonb, dados_novos jsonb)` — `STABLE`, `SECURITY DEFINER`, `search_path = ''`; ordem `realizado_em DESC, id DESC`; cursor = linhas estritamente "antes" de `(p_antes_em, p_antes_id)`; `p_limite` limitado a 100. Filtro de visibilidade **idêntico** à política de SELECT de `auditoria_log` em `20261115005` (CGOV: tudo; demais: `objeto_id` com `pode_ler_objeto`). `codigo_radar`: de `riscos` pelo `registro_id` (tabela `riscos`) ou pelo `risco_id` dos dados (filhos); se o risco não existe mais, de `dados_anteriores->>'codigo_radar'`/`dados_novos->>'codigo_radar'` quando houver; senão nulo.
- Produces: `public.objetos_onde_gravo() RETURNS SETOF uuid` — `STABLE`, `SECURITY DEFINER`, `search_path = ''`; ids de `objetos_contexto` com `pode_escrever_objeto(id)`.

- [ ] **Step 1: Teste que falha** — `082`: `ler_auditoria` devolve, para cada uma de `cgov@`, `gestor.uc@`, `auditor@`, `diretor.dibio@`, **o mesmo conjunto de ids** que `select id from auditoria_log` lido como essa pessoa (comparação com `results_eq` ordenada); `quem_nome` preenchido para `gestor.uc@` em linha feita pela CGOV no objeto dele; `codigo_radar` presente numa linha de `controles_existentes` e numa linha de risco apagado (apagar um rascunho no próprio teste); paginação: duas chamadas com `p_limite = 2` e cursor não repetem nem pulam linhas; `p_limite = 500` devolve no máximo 100; `objetos_onde_gravo` para `gestor.uc@` = `select id from objetos_contexto where pode_escrever_objeto(id)` como ele; `anon` não executa as duas.
- [ ] **Step 2:** `npm run db:reset && npm run test:db` → FAIL em `082`.
- [ ] **Step 3:** Seções 3 e 4 da migração, comentadas.
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS (tudo).
- [ ] **Step 5:** Commit `feat(b3): funções ler_auditoria e objetos_onde_gravo e teste 082`.

---

### Task 5: Camada de dados — interface, conversores e fonte de demonstração

**Files:**
- Create: `src/services/dados/tipos.ts`, `src/services/dados/conversores.ts`, `src/services/dados/fonteDemonstracao.ts`, `src/services/dados/index.ts` (`criarFonteDados(modo)`)
- Test: `tests/unit/conversores.spec.ts`, `tests/unit/fonteDemonstracao.spec.ts`

**Interfaces:**
- Produces (`tipos.ts`):

```ts
export interface Carteira { riscos: FichaRisco[]; objetos: ObjetoContexto[]; categorias: CategoriaRisco[]; unidades: UnidadeOrganizacional[]; processos: ProcessoCadeiaValor[] }
export interface FichaParaSalvar { id?: string; objetoId: string; preliminarCgov?: boolean; /* campos de entrada de FichaRisco (sem calculados) */
  controles?: Array<Omit<ControleExistente, 'id'> & { id?: string }>;
  respostas?: Array<Omit<RespostaTratamento5W2H, 'id'> & { id?: string }>;
  kris?: Array<Omit<IndicadorKri, 'id' | 'medicoes'> & { id?: string }> }
export interface EventoAuditoria { id: string; realizadoEm: string; tabela: string; operacao: 'INSERT' | 'UPDATE' | 'DELETE'; quemNome: string | null; quemPapel: string | null; codigoRadar: string | null; anteriores: Record<string, unknown> | null; novos: Record<string, unknown> | null }
export interface FiltrosAuditoria { de?: string; ate?: string; tabela?: string; antesDe?: { em: string; id: string } }
export interface EventoFluxo { id: string; riscoId: string; codigoRadar: string; etapa: HistoricoFluxoItem['etapa']; acao: HistoricoFluxoItem['acao']; usuarioNome: string; usuarioPapel: string; despachoTexto?: string; criadoEm: string }
export interface FonteDados {
  carregarCarteira(): Promise<Carteira>;
  relerRisco(id: string): Promise<FichaRisco | null>;
  acoesNoFluxo(ids: string[]): Promise<AcoesFluxo[]>;
  objetosOndeGravo(): Promise<string[]>;
  salvarFicha(f: FichaParaSalvar): Promise<{ id: string; codigoRadar: string }>;
  excluirRisco(id: string): Promise<void>;
  enviar(id: string): Promise<void>; assumir(id: string): Promise<void>;
  validar(id: string, parecer?: string): Promise<void>; homologar(id: string, parecer?: string): Promise<void>;
  devolver(id: string, motivo: string): Promise<void>;
  registrarMedicao(kriId: string, m: Omit<MedicaoKri, 'id'>): Promise<void>;
  atualizarStatusTratamento(respostaId: string, status: RespostaTratamento5W2H['statusExecucao']): Promise<void>;
  salvarObjeto(o: Partial<ObjetoContexto> & { nomeObjeto: string; unidadeId: string }): Promise<ObjetoContexto>;
  reatribuirObjeto(objetoId: string, novaUnidadeId: string): Promise<void>;
  alterarApetite(categoriaId: number, apetite: ApetiteDeclarado): Promise<void>;
  alterarJustificativa(categoriaId: number, texto: string): Promise<void>;
  lerAuditoria(f: FiltrosAuditoria, limite?: number): Promise<EventoAuditoria[]>;
  lerAtividadeRecente(n: number): Promise<EventoFluxo[]>;
}
```

- `conversores.ts`: `riscoDoBanco(linha, filhos): FichaRisco`, `fichaParaJson(f: FichaParaSalvar): Record<string, unknown>` (camelCase → chaves da Task 3; **sem** campos calculados), `objetoDoBanco`, `unidadeDoBanco`, `categoriaDoBanco`, `processoDoBanco`, `acoesDoBanco`, `eventoAuditoriaDoBanco`, `historicoDoBanco`, e `soCamposCalculadosMudaram(anteriores, novos): boolean` (lista exata da spec §5.3: `nivel_inerente`, `classificacao_inerente`, `fator_controle`, `nivel_eficacia_controle`, `nivel_residual`, `classificacao_residual`, `status_critico`, `is_critico`, `atualizado_em`, mais `memoria_calculo` e `descricao_padrao` se existirem nas linhas).
- `fonteDemonstracao.ts`: `criarFonteDemonstracao(estado?: 'normal' | 'carregando' | 'erro'): FonteDados` — move a lógica de hoje da store (cálculo pela calculadora, fluxo simulado, DAR recalculando na memória, importação). `acoesNoFluxo` usa `capacidades(papel)` + estado (comportamento atual dos botões). Estado `'carregando'` → `carregarCarteira` nunca resolve; `'erro'` → rejeita com `ErroRadar` tipo `'rede'`.
- `index.ts`: `criarFonteDados(modo: ModoAuth): FonteDados` (real → `criarFonteSupabase(supabaseClient!)`, Task 6; até lá lança "não implementado"); lê `radar.demo-estado.v1` do `localStorage` (com try/catch) para o estado da demonstração. Exporta `CHAVE_ESTADO_DEMO = 'radar.demo-estado.v1'`.

- [ ] **Step 1: Testes que falham** — `conversores.spec.ts`: ida e volta de uma linha real da semente (copiar uma linha de `RADAR-DEMO-COFIS` como fixture em `tests/unit/fixtures/`); `fichaParaJson` não contém `nivel_residual`, `status_fluxo` nem `descricao_padrao`; `soCamposCalculadosMudaram` verdadeiro quando só `status_critico`/`atualizado_em` mudaram e falso quando `causas` mudou. `fonteDemonstracao.spec.ts`: carteira tem os 10 riscos do Anexo II; `salvarFicha` sem id cria `RADAR-2026-0NN` e com id atualiza; `validar` de risco crítico leva a `em_homologacao_dir` (comportamento atual de `aprovarEmUmCliqueCg`); `devolver('')` rejeita com tipo `'validacao'`; `alterarApetite` recalcula criticidade na memória; estado `'erro'` rejeita `carregarCarteira`; dois `criarFonteDemonstracao()` não compartilham dados.
- [ ] **Step 2:** `npx vitest run tests/unit/conversores.spec.ts tests/unit/fonteDemonstracao.spec.ts` → FAIL.
- [ ] **Step 3:** Implementar. A store ainda não muda (Task 8).
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): camada de dados com fonte de demonstração`.

---

### Task 6: Fonte Supabase — leituras

**Files:**
- Create: `src/services/dados/fonteSupabase.ts` (leituras), `tests/integracao/fonteSupabaseLeitura.spec.ts`
- Modify: `src/services/dados/index.ts`, `tests/integracao/ajudantes.ts` (se precisar de `fonteComo(email)`)
- Test: `tests/unit/fonteSupabaseLeitura.spec.ts` (cliente falso)

**Interfaces:**
- Consumes: Task 1 (`lerTodasAsPaginas`, `emLotes`, `traduzirErroBanco`), Task 5 (`FonteDados`, conversores), Tasks 2 e 4 (RPCs).
- Produces: `criarFonteSupabase(cliente: SupabaseClient): FonteDados` com `carregarCarteira`, `relerRisco`, `acoesNoFluxo` (lotes de 1.000), `objetosOndeGravo`, `lerAuditoria` (RPC `ler_auditoria`, limite 50), `lerAtividadeRecente` (histórico do fluxo, `order('criado_em', desc).order('id', desc).limit(n)`, com `codigo_radar` do risco). As gravações lançam "não implementado" até a Task 7.
- `carregarCarteira`: categorias, unidades (`ativa`), processos, objetos (com processo e `unidadeAtiva`) e riscos com filhos — cada tabela por `lerTodasAsPaginas` com ordem terminando em `id`; filhos e histórico lidos por tabela e agrupados por `risco_id` no front (não usar recurso embutido sem paginação).
- `relerRisco(id)`: devolve `null` quando a RLS esconde ou o risco não existe (sem distinguir).

- [ ] **Step 1: Testes que falham** — unitário com cliente falso: `"carregarCarteira pagina riscos acima de 1.000"` (1.500 riscos falsos → 1.500 na carteira, filhos agrupados no risco certo); `"acoesNoFluxo chama a RPC em lotes"` (2.100 ids → 3 chamadas). Integração (`npm run test:integracao`): `gestor.uc@` vê só os riscos do alcance (conjunto de `codigo_radar` igual ao de `select` com o cliente dele); `cgov@` vê os 10; `relerRisco` de risco fora do alcance → `null`; `acoesNoFluxo` de `ct@` em `RADAR-DEMO-CT`… (escolher pela semente um caso `pode_validar = true` e um `false`); `lerAuditoria` paginada sem repetir; `objetosOndeGravo` de `gestor.uc@` não vazio.
- [ ] **Step 2:** `npx vitest run tests/unit/fonteSupabaseLeitura.spec.ts` → FAIL; `npm run test:integracao` → FAIL no arquivo novo.
- [ ] **Step 3:** Implementar as leituras.
- [ ] **Step 4:** `npm test`, `npm run build`, `npm run test:integracao` (com `db:start` e `db:funcoes`) → PASS.
- [ ] **Step 5:** Commit `feat(b3): fonte Supabase — leituras paginadas`.

---

### Task 7: Fonte Supabase — gravações e fluxo

**Files:**
- Modify: `src/services/dados/fonteSupabase.ts`
- Create: `tests/integracao/fonteSupabaseGravacao.spec.ts`

**Interfaces:**
- Produces: as gravações de `FonteDados` pelas RPCs/tabelas: `salvarFicha` → `rpc('salvar_ficha_risco', { ficha: fichaParaJson(f) })`; `enviar`/`assumir`/`validar`/`homologar`/`devolver` → RPCs de mesmo nome (`risco`, `parecer`, `motivo`); `excluirRisco` → `delete` (0 linhas → `ErroRadar` `'nao_encontrado'`); `registrarMedicao` → insert em `medicoes_kri`; `atualizarStatusTratamento` → update em `respostas_tratamento`; `salvarObjeto` → insert/update em `objetos_contexto` **sem enviar `macroprocesso_supervisor_id` quando há processo** (o banco preenche); `reatribuirObjeto` → `rpc('reatribuir_objeto', …)`; `alterarApetite`/`alterarJustificativa` → update em `categorias_risco`. Todo erro passa por `traduzirErroBanco`.

- [ ] **Step 1: Testes que falham (integração; cada teste devolve o banco ao estado da semente no `afterEach` pelo cliente de serviço ou usa riscos criados no próprio teste):** ciclo completo com usuários da semente — `gestor.uc@` cria ficha e envia; o validador efetivo (pela semente) valida; se crítico, o homologador homologa → `aprovado`; `devolver` sem motivo → `ErroRadar` tipo `'validacao'`; **concorrência**: validar duas vezes o mesmo risco → a 2ª dá `ErroRadar` tipo `'estado'` com a frase de "mudou de situação"/dicionário; edição de risco aprovado com controles numa só chamada → `em_validacao_cg`; `cgov@` devolve risco sem homologador efetivo (preparar com o cliente de serviço como no `073`); `assumir` de `preliminar_cgov`; `reatribuirObjeto` por `gestor.uc@` → `'permissao'`; DAR alterada por `cgov@` → risco aprovado da categoria relido com criticidade nova; nenhuma mensagem contém `row-level` ou `violates`.
- [ ] **Step 2:** `npm run test:integracao` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm run test:integracao`, `npm test`, `npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): fonte Supabase — gravações e fluxo`.

---

### Task 8: Store assíncrona com estados e limpeza

**Files:**
- Modify: `src/stores/riscosStore.ts`, `src/main.ts` ou `src/App.vue` (disparar `carregar()` quando a sessão fica `ativo`; limpar em `anonimo`)
- Modify (só o mínimo para compilar/aguardar): views e `BrMenu.vue` que chamam ações da store
- Test: `tests/unit/riscosStore.spec.ts` (novo), testes de página existentes ajustados para `await`/`flushPromises`

**Interfaces:**
- Consumes: `criarFonteDados`, `FonteDados`, `AcoesFluxo`, `ErroRadar`.
- Produces (store): mantém `riscos`, `categorias`, `unidades`, `objetosContexto`, `termoBuscaGlobal`, `celulaMatrizSelecionada`, `categoriaFiltroId`, `riscosFiltrados`, `riscosCriticosCarteira`, `resumoPorClasse`, `trilhaAuditoriaGlobal`, `alternarFiltroCelulaMatriz`, `limparFiltrosPainel`, `obterRiscoPorId`, `obterApetitePorCategoria`. Novos: `estado: Ref<'ocioso'|'carregando'|'pronto'|'erro'>`, `erro: Ref<ErroRadar|null>`, `processos`, `acoes: Ref<Record<string, AcoesFluxo>>`, `unidadesAtivas` (computed), `carregar(): Promise<void>`, `tentarDeNovo()`, `limpar()`, `relerRiscos(ids: string[])`, `objetosOndeGravo(): Promise<string[]>`, `lerAuditoria(f: FiltrosAuditoria): Promise<EventoAuditoria[]>`, `lerAtividadeRecente(n: number): Promise<EventoFluxo[]>` (repassam à fonte), `excluirRisco(id)`, `assumirRisco(id)`, `devolverRisco(id, motivo)`, `reatribuirObjeto(objId, unidadeId)`. Ações existentes viram `async` com o mesmo nome e argumentos (`salvarOuAtualizarRisco(parcial): Promise<FichaRisco>`, `submeterParaValidacaoCg`, `aprovarEmUmCliqueCg`, `homologarEmUmCliqueDiretoria`, `solicitarAjusteRapido`, `registrarMedicaoKri`, `atualizarStatusTratamento`, `reavaliarPontuacaoRiscoAprovado`, `importarMarkdownDaSkill(md, objetoId): Promise<{ importados: number; total: number; avisos: string[]; erros: string[] }>`, `alterarApetiteCategoriaDAR`, `atualizarJustificativaCategoriaDAR`, `salvarNovoObjetoContexto`). Filas: `filaValidacaoCg` = riscos com `acoes[id].podeValidar`; `filaHomologacaoDiretoria` = `podeHomologar`; nova `filaSemDecisor` = `devolucaoCgov`. Depois de cada ação: `relerRiscos([id])` (DAR: todos da categoria). Ações relançam o `ErroRadar` para a tela mostrar.
- Fonte para testes: `useRiscosStore` aceita injeção (`definirFonteParaTeste(f: FonteDados)` exportada só para testes).

- [ ] **Step 1: Testes que falham** — `riscosStore.spec.ts` com fonte falsa: `carregar` passa por `carregando` → `pronto`; falha → `erro` com `ErroRadar` e `tentarDeNovo` volta a `pronto`; **"descarta carga velha ao sair"** (carga lenta + `limpar()` antes de resolver → `riscos` vazio e `estado = 'ocioso'`); `limpar` zera riscos, objetos e ações; `submeterParaValidacaoCg` chama `fonte.enviar` e depois `relerRiscos`; `filaValidacaoCg` segue `acoes`, não o `statusFluxo`; ação que falha mantém os dados e relança o erro; `alterarApetiteCategoriaDAR` relê os riscos da categoria.
- [ ] **Step 2:** `npx vitest run tests/unit/riscosStore.spec.ts` → FAIL.
- [ ] **Step 3:** Reescrever a store sobre a fonte (a lógica de memória já está na fonte de demonstração; a store não calcula); ligar `carregar/limpar` à `authStore.situacao` (demonstração: carrega ao abrir). Ajustar as chamadas nas views com `await` (sem redesenho ainda).
- [ ] **Step 4:** `npm test && npm run build` → PASS (os testes de página antigos continuam passando no modo demonstração).
- [ ] **Step 5:** Commit `refactor(b3): riscosStore assíncrona sobre a camada de dados`.

---

### Task 9: Estados de carregamento e erro + Painel e Riscos

**Files:**
- Create: `src/components/ui/EstadoCarregamento.vue`, `src/components/ui/ErroPagina.vue`
- Modify: `src/views/PainelConsolidadoCgovView.vue`, `src/views/RiscosListaView.vue`, `src/App.vue` (erro de página quando a carteira falha)
- Test: `tests/unit/componentesUi.spec.ts` (ampliar), `tests/unit/painelPiloto.spec.ts`, `tests/unit/estadosCarregamento.spec.ts` (novo)

**Interfaces:**
- Produces: `EstadoCarregamento` — props `{ estado: 'carregando' | 'erro' | 'pronto'; erro?: ErroRadar | null; linhas?: number; formato?: 'cartao' | 'tabela' }`, emite `tentar-de-novo`, slot padrão quando `pronto`. Erro de bloco = `BrMessage` tipo perigo com a mensagem + botão "Tentar de novo". `ErroPagina` — props `{ titulo: string; texto: string }`, emite `tentar-de-novo`, layout do Template V3 — Erro (ilustração decorativa com `alt=""`, `<h1>` com o título, texto, ações "Tentar de novo" e link "Ir para a Página Principal"); sem busca e sem "Envie um feedback". Título fixo da página quando a carteira falha: **"Não foi possível carregar os riscos"**.
- Painel: cartões e Matriz com `Skeleton` no formato; "Precisa da sua atenção" usa `acoes`; atividade recente por `store.lerAtividadeRecente(5)` com estado próprio de bloco. Riscos: tabela com `Skeleton` de linhas; `EmptyState` "Nenhum risco no seu alcance" quando `pronto` e vazio (texto diferente de "nenhum risco com estes filtros"); selo "processo inativo" (Chip neutro) quando `objeto.processoAtivo === false`.

- [ ] **Step 1: Testes que falham** — `estadosCarregamento.spec.ts`: `EstadoCarregamento` em `carregando` tem `role="status"` e "Carregando…"; em `erro` mostra a mensagem do `ErroRadar` e o botão "Tentar de novo" emite o evento; `ErroPagina` tem um `<h1>` e o link para `/`. `painelPiloto.spec.ts`: com fonte falsa em erro, o Painel mostra "Não foi possível carregar os riscos" e "Tentar de novo" recarrega; com carteira vazia, mostra estado vazio (sem zeros enganosos na Matriz). Lista: selo "processo inativo" aparece para objeto com `processoAtivo: false`.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar (tokens; ilustração simples em SVG inline com tokens, sem cor fixa).
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): estados de carregamento e erro no Painel e em Riscos`.

---

### Task 10: Ficha e painel lateral — botões por risco

**Files:**
- Modify: `src/views/FichaDetalheBowTieView.vue`, `src/views/RiscosListaView.vue` (painel lateral)
- Create: `src/components/radar/AcoesDoRisco.vue` (botões + diálogos, usado na Ficha e no lateral)
- Test: `tests/unit/fichaPagina.spec.ts`, `tests/unit/acoesDoRisco.spec.ts`

**Interfaces:**
- Consumes: `store.acoes`, ações da store (Task 8), `Dialog`, `useToast`.
- Produces: `AcoesDoRisco` — props `{ risco: FichaRisco; acoes: AcoesFluxo | undefined }`. Botões (só os com `true`): "Enviar para validação", "Assumir risco", "Validar risco", "Homologar risco", "Devolver para ajuste" (rótulo "Devolver à unidade (CGOV)" quando `devolucaoCgov`), "Editar ficha" (link para `/riscos/novo?editar=<id>` ou fluxo atual de edição), "Excluir risco". Quando `motivo` não é nulo, `BrMessage` informativo com o texto. "Devolver" e "Excluir" abrem `Dialog` (`tipo="alerta"` para excluir) com campo obrigatório (motivo; para excluir, confirmação digitando o código). Sucesso → `Toast`; erro → `Toast` com a mensagem traduzida e releitura do risco.
- Ficha: carrega pelo id; enquanto `store.estado = 'carregando'` mostra `Skeleton`; risco ausente (`null` ou fora do alcance) → título **"Risco não encontrado"** (mesmo título de hoje) e nada além disso.

- [ ] **Step 1: Testes que falham** — `acoesDoRisco.spec.ts`: só os botões das colunas verdadeiras aparecem; `motivo` aparece como mensagem; "Devolver" sem motivo não confirma (erro de campo com `role="alert"`); `devolucaoCgov` muda o rótulo; erro `55000` da fonte → toast "O risco mudou de situação…" e `relerRiscos` chamado. `fichaPagina.spec.ts`: `/riscos/<id inexistente>` → "Risco não encontrado"; no modo demonstração, comportamento atual mantido (perfil `ct` vê "Validar risco" em risco `em_validacao_cg`).
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): botões de fluxo por risco na Ficha e no painel lateral`.

---

### Task 11: Novo risco e Importar

**Files:**
- Modify: `src/views/FormularioRiscoView.vue`, `src/views/ImportadorSkillView.vue`
- Test: `tests/unit/novoRiscoPagina.spec.ts`, `tests/unit/importarPagina.spec.ts`

**Interfaces:**
- Consumes: `store.objetosOndeGravo()`, `store.salvarOuAtualizarRisco`, `store.submeterParaValidacaoCg`, `store.importarMarkdownDaSkill(md, objetoId)`, `store.unidadesAtivas`.
- Novo risco: seletor de objeto só com os ids de `objetosOndeGravo()` (estado de carregamento próprio; lista vazia → `EmptyState` "Você ainda não tem objeto de gestão em que possa criar riscos. Procure a CGOV."); a prévia de cálculo continua da calculadora com o rótulo "Prévia — o valor oficial é calculado pelo RADAR ao salvar"; "Salvar rascunho" e "Salvar e enviar" (salva e envia; se o envio falhar, o rascunho fica salvo e a tela diz isso). Botões desabilitados e com `aria-busy` durante a gravação (sem duplo envio).
- Importar: passo novo "Objeto de destino" (objetos de unidades ativas; obrigatório); prévia avisa "O código da skill será substituído pelo código do RADAR"; resultado "N de M importados" + lista das recusadas com a mensagem traduzida.

- [ ] **Step 1: Testes que falham** — Novo risco: objeto fora de `objetosOndeGravo` não aparece; duplo clique em "Salvar" chama a fonte uma vez; envio que falha após salvar mostra "Rascunho salvo, mas não foi possível enviar: <mensagem>". Importar: **importação parcial** — 5 fichas, fonte falsa recusa a 3ª → "4 de 5 importados" e a recusada listada com o motivo; sem objeto escolhido, "Importar" fica bloqueado com mensagem de campo.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): Novo risco e Importar gravando no banco`.

---

### Task 12: Aprovações e contadores do menu

**Files:**
- Modify: `src/views/CaixaValidacaoUmCliqueView.vue`, `src/components/govbr/BrMenu.vue`
- Test: `tests/unit/aprovacoesPagina.spec.ts`, `tests/unit/shellPorPerfil.spec.ts`

**Interfaces:**
- Consumes: `filaValidacaoCg`, `filaHomologacaoDiretoria`, `filaSemDecisor`, `AcoesDoRisco` (Task 10).
- Aprovações: abas "Para validar", "Para homologar" e, só quando `filaSemDecisor` não está vazia, "Sem quem decida" (texto: "Estes riscos não têm validador ou homologador efetivo. A CGOV pode devolvê-los à unidade."). Cada item usa `AcoesDoRisco`. Estados de carregamento/erro/vazio. Menu: contador de Aprovações = validar + homologar + sem decisor.

- [ ] **Step 1: Testes que falham** — com `acoes` falsas: a aba "Para validar" lista só riscos com `podeValidar` (um risco `em_validacao_cg` sem `podeValidar` **não** aparece); aba "Sem quem decida" só aparece com itens; contador do menu soma as três filas.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): Aprovações e contadores pelas ações do banco`.

---

### Task 13: Objetos e Monitoramento

**Files:**
- Modify: `src/views/CatalogoObjetosView.vue`, `src/views/MonitoramentoKriPlanoAcaoView.vue`
- Test: `tests/unit/objetosPagina.spec.ts`, `tests/unit/monitoramentoPagina.spec.ts`

**Interfaces:**
- Consumes: `store.unidadesAtivas`, `store.processos`, `store.salvarNovoObjetoContexto`, `store.reatribuirObjeto`, `store.registrarMedicaoKri`, `store.atualizarStatusTratamento`, `authStore.capacidades.editaCatalogoObjetos`.
- Objetos: seletores de unidade só com `ativa`; processo só com `ativo`; campo "Supervisor do macroprocesso" **somente leitura** (texto, não campo editável) para quem não é CGOV e sempre que há processo ("Preenchido pelo RADAR a partir do processo da Cadeia de Valor"); CGOV sem processo pode escolher. Selos "Unidade inativa" e "Processo inativo". Ação "Reatribuir objeto" (só CGOV, só objeto com `unidadeAtiva === false`) em `Dialog` com seletor de unidade ativa obrigatório.
- Monitoramento: registrar medição e mudar status gravam pela store, com estado de gravação e erro traduzido; texto explicativo "Lançar medição ou atualizar ação não reabre o risco aprovado." mantido.

- [ ] **Step 1: Testes que falham** — Objetos: unidade inativa não aparece no seletor; gestor vê supervisor como texto (nenhum `select` com rótulo de supervisor); CGOV vê "Reatribuir objeto" só no objeto de unidade inativa; reatribuir sem unidade escolhida não confirma. Monitoramento: falha da fonte ao registrar medição mostra a mensagem e mantém o formulário preenchido.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): Objetos e Monitoramento com dados do banco`.

---

### Task 14: DAR e Auditoria

**Files:**
- Modify: `src/views/DeclaracaoApetiteDarView.vue`, `src/views/TrilhaAuditoriaGovernancaView.vue`
- Create: `src/utils/auditoriaLegivel.ts` (funções puras)
- Test: `tests/unit/darPagina.spec.ts`, `tests/unit/auditoriaPagina.spec.ts`, `tests/unit/auditoriaLegivel.spec.ts`

**Interfaces:**
- Consumes: `store.alterarApetiteCategoriaDAR`, `store.lerAuditoria(filtros)` (Task 8), `soCamposCalculadosMudaram`.
- Produces: `descreverEvento(e: EventoAuditoria): { titulo: string; mudancas: Array<{ campo: string; antes: string; depois: string }>; recalculadoPelaDar: boolean }` — títulos como "Controle do risco RADAR-2026-003 alterado", "Risco RADAR-2026-003 criado", "Apetite da categoria Integridade alterado"; nomes legíveis dos campos (dicionário; campo desconhecido → nome da coluna sem `_`); `recalculadoPelaDar = tabela === 'riscos' && operacao === 'UPDATE' && soCamposCalculadosMudaram(...)`, com título "Risco RADAR-… recalculado pela DAR". `quemNome` nulo → "Sistema/administrador".
- DAR: depois de salvar, aviso fixo: "Os riscos aprovados da categoria foram recalculados pelo RADAR; os que passaram a Crítico voltaram para homologação." Prévia da tela continua (rotulada como prévia). A ação "Desfazer" grava o apetite anterior pela mesma via.
- Auditoria: lista com "Carregar mais" (cursor do último evento), filtros de período e tabela (mudar filtro recomeça a lista), estados de carregamento/erro/vazio; CSV exporta os eventos já carregados com as colunas legíveis.

- [ ] **Step 1: Testes que falham** — `auditoriaLegivel.spec.ts`: UPDATE de `riscos` mudando só `status_critico` e `atualizado_em` → `recalculadoPelaDar = true` e o título não contém "editad"; UPDATE mudando `causas` → `false` e a mudança "Causas: antes → depois"; `quemNome` nulo → "Sistema/administrador". `auditoriaPagina.spec.ts`: "Carregar mais" chama a fonte com `antesDe` do último evento e acrescenta (sem repetir); trocar o filtro recomeça. `darPagina.spec.ts`: após salvar, aviso exibido e riscos da categoria relidos.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(b3): DAR e Auditoria com dados do banco`.

---

### Task 15: Varredura de acessibilidade, documentação e verificação final

**Files:**
- Modify: `tests/a11y/telas.ts`, `tests/a11y/varredura.a11y.ts` (gravar `radar.demo-estado.v1` antes de abrir, como faz com o perfil)
- Create: `docs/02-arquitetura-cgti/decisoes-tecnicas-b3.md`, `docs/03-caderno-aprendizado/06-camada-de-dados-e-async.md`
- Modify: `docs/02-arquitetura-cgti/modelo-dados-mer.md` (§3.7), `docs/02-arquitetura-cgti/guia-supabase-local.md` (seção "Rodar o RADAR no modo real com a semente"), `docs/04-ux/design-system.md` (§10 estados), `docs/00-memoria/ESTADO-ATUAL.md`, `docs/00-memoria/MOC-Radar.md`

**Interfaces:**
- `Tela` ganha `estadoDemo?: 'carregando' | 'erro'`; quatro telas novas na lista: Painel e Riscos em `carregando` e em `erro` (título exato esperado em erro: "Não foi possível carregar os riscos"; em carregando, o título da rota). Total = (16 + 4) telas × 4 larguras × 3 temas.
- `decisoes-tecnicas-b3.md`: decisões B3-1 a B3-n no formato "o que / por quê / custo" (as da spec §10 e as surgidas na execução) + pendências.

- [ ] **Step 1:** Acrescentar as telas na varredura; `npm run test:a11y` → corrigir até **0 violações** e sem rolagem lateral.
- [ ] **Step 2:** Escrever a documentação (didática; ESTADO-ATUAL com seção "Etapa B3" e verificação final; MOC com links novos).
- [ ] **Step 3: Verificação final, nesta ordem, registrando os números no ESTADO-ATUAL:**
  - `npm test` → todos passando;
  - `npm run build` → ok;
  - `npm run test:a11y` → 0 violações;
  - `npm run db:start`, `npm run db:funcoes` (outro terminal), `npm run test:integracao` → todos passando;
  - `npm run db:reset && npm run test:db` → `Result: PASS` (arquivos `000` a `082`);
  - `git status --porcelain | grep -i '_temp'` → vazio; `git diff --stat main -- supabase/migrations` → só `20261117001`;
  - `grep -rn "service_role\|SERVICE_ROLE" src/` → só o comentário já existente.
- [ ] **Step 4:** Commit `docs(b3): decisões, guia, aula 6 e estado da etapa B3`.
