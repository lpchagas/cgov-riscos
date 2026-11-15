# Etapa B1 — Banco com unidades, perfis, alcance e RLS — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado)
> ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas
> de seleção (`- [ ]`).

**Objetivo:** Supabase local com a árvore real do ICMBio (importada das listas do SharePoint), os
10 perfis da matriz, uma função de alcance, RLS de leitura e escrita, fluxo de 3 degraus, trilha de
auditoria e testes por perfil (`npm run test:db`).

**Arquitetura:**
- Migrações novas `20261115*` sobre as de `20261109`, sem reescrevê-las.
- Funções `SECURITY DEFINER` com `search_path = ''` concentram o alcance e o fluxo. A RLS usa essas
  funções.
- Um importador em TypeScript (rodado com `vite-node`) lê os CSVs do SharePoint e atualiza
  `unidades` e `processos_cadeia_valor`.
- Os testes de banco são pgTAP (`supabase test db`). Os do importador, Vitest.

**Tecnologias:** Supabase CLI `2.122.0`, PostgreSQL 17, pgTAP, TypeScript, `vite-node` (já vem com
o Vitest), `@supabase/supabase-js` (já instalado) e um leitor de CSV (`csv-parse`).

**Spec:** [`docs/superpowers/specs/2026-11-15-etapa-b1-banco-rls-design.md`](../specs/2026-11-15-etapa-b1-banco-rls-design.md) · Regra de decisão: [`docs/01-normativos/matriz-acesso-responsabilidades.md`](../../01-normativos/matriz-acesso-responsabilidades.md)

> **Aviso prévio de migrações (regra do projeto):** este plano consultou
> `docs/01-normativos/matriz-regras-regime-b.md` e lista abaixo **todas** as migrações do B1. Ao
> aprovar o plano, o usuário autoriza essas migrações. Nenhuma delas altera
> `calcular_nivel_inerente_q7`, `classificar_nivel_q8`, `trigger_calcular_risco_radar` ou
> `src/utils/calculadoraRiscoRadar.ts`. A Task 1 cria um teste de regressão que trava esses valores.

## Restrições globais

- **Branch:** `feat/b1-banco-rls`, criado a partir de `docs/matriz-acesso` (PR #3). Se o PR #3 for
  mesclado antes, rebasear na `main`.
- **Perfis** (`perfis_usuarios.papel_governanca`, exatamente estes 10): `gestor`,
  `coordenador_territorial`, `gerente_regional`, `coordenador_geral`, `diretor`, `presidencia`,
  `auditoria`, `cgov`, `cgge`, `gabin`. Conversão dos antigos: `lider_cg` → `coordenador_geral`.
- **Alcance total** (leem todas as unidades): `diretor`, `presidencia`, `auditoria`, `cgov`, `cgge`,
  `gabin`.
- **`unidades.tipo`:** os 8 atuais (`presidencia`, `diretoria`, `coordenacao-geral`,
  `gerencia-regional`, `coordenacao`, `centro-pesquisa`, `ngi`, `uc`) mais
  `coordenacao-territorial`, `coordenacao-assessoramento`, `orgao-assistencia`, `gabinete`,
  `divisao`, `servico`, `setor`, `base-avancada`.
- **Subunidades internas** (contam como "própria unidade" na escrita): `divisao`, `servico`,
  `setor`, `base-avancada`.
- **Estados de `riscos.status_fluxo`** (sem mudar os nomes): `preliminar_cgov`, `rascunho`,
  `em_validacao_cg`, `em_homologacao_dir`, `aprovado`, `devolvido`.
- **Exige homologação:** `is_critico = true` OU `status_critico = 'pendente_dar'`.
- **Regressão do cálculo (valores exatos):** Q7 `(P=1,I=5) → 15`, `(P=5,I=1) → 11`; Q8 `10,2 →
  Alto`, `17,1 → Extremo`; sem evidência → `nivel_eficacia_controle = 'Fraco'`,
  `fator_controle = 0,90`.
- **Toda função `SECURITY DEFINER`:** `SET search_path = ''`, nomes qualificados com `public.`,
  `REVOKE EXECUTE ... FROM public, anon` e `GRANT EXECUTE ... TO authenticated`.
- **Mensagens de erro** em português, com o prefixo `RADAR:` (por exemplo, `RADAR: só o titular da
  unidade superior pode validar este risco.`).
- **Dados pessoais:** `ICMBIO_atribuicoes` não é lida no B1 e nunca é versionada. `_temp/` está no
  `.gitignore`. Os usuários de teste são fictícios, com e-mails `@radar.test`.
- **Comentários didáticos** em português do Brasil em todo SQL e TypeScript.
- **Commits:** nenhum commit intermediário. Um commit único no fim, só quando o usuário pedir, com a
  linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Verificação final:** `npm test`, `npm run build`, `npm run test:a11y` (0 violações) e
  `npm run test:db`.

## Pontos de atenção na revisão

1. **Ciclo na árvore:** se o SharePoint tiver um `id_mae` que forme um laço (A → B → A), a consulta
   recursiva entraria em laço infinito. O importador precisa recusar com um relatório claro (Task 3),
   e `unidades_descendentes` deve parar mesmo assim (Task 5).
2. **Usuário em unidade inativa:** quem está lotado numa unidade desativada pelo importador continua
   vendo os riscos dela e não perde o acesso sem aviso (Task 5).
3. **Unidade que muda de mãe:** depois de uma reimportação, os riscos acompanham a unidade, e o
   alcance da antiga chefia deixa de incluí-los (Task 5).
4. **Dois titulares ativos na mesma unidade** (titular e substituto em exercício): qualquer um deles
   valida, mas uma vez só. O segundo recebe "estado não permite" (Task 7).
5. **CSV real do SharePoint:** BOM, quebras de linha CRLF, a linha `ListSchema=` e textos entre aspas
   com vírgulas e quebras de linha precisam ser lidos sem erro (Task 3).

---

### Task 1: Ambiente local do Supabase e regressão do cálculo

**Arquivos:**
- Modificar: `package.json` (dependência de desenvolvimento `supabase@2.122.0`; scripts `db:start`,
  `db:stop`, `db:reset`, `test:db`)
- Criar: `supabase/config.toml` (gerado por `supabase init`, com `project_id = "cgov-riscos"`)
- Criar: `supabase/tests/000_regressao_calculo.test.sql`
- Criar: `docs/02-arquitetura-cgti/guia-supabase-local.md` (seções: instalar Docker Desktop com WSL,
  comandos, Studio local, como ler uma falha de pgTAP)

**Interfaces:**
- Produz: `npm run db:reset` (= `supabase db reset`; a Task 3 acrescenta o importador e a semente) e
  `npm run test:db` (= `supabase test db`).

- [ ] **Passo 1: Pré-requisito do usuário.** Guiar a instalação do Docker Desktop no Windows, com
  "Use the WSL 2 based engine" e a integração com a distribuição Ubuntu ligadas.
  Rodar: `docker version`
  Esperado: seções `Client` e `Server`. **Se falhar, parar e pedir ajuda ao usuário.** Sem Docker,
  nenhuma outra tarefa roda.
- [ ] **Passo 2:** Rodar `npm install -D supabase@2.122.0 --save-exact` e
  `npx supabase init`. Depois, `npm run db:start`.
  Esperado: `supabase status` mostra `API URL` e `DB URL`.
- [ ] **Passo 3: Escrever o teste de regressão** `000_regressao_calculo.test.sql` com pgTAP:
  `calcular_nivel_inerente_q7(1,5) = 15`, `calcular_nivel_inerente_q7(5,1) = 11`,
  `classificar_nivel_q8(10.2) = 'Alto'`, `classificar_nivel_q8(17.1) = 'Extremo'`. Mais um `INSERT`
  de risco com `possui_evidencia_controle = false` e `nivel_eficacia_controle = 'Forte'`, que deve
  sair com `'Fraco'` e `0.90`.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: **todos passam**. É um teste de proteção do que já existe, não de algo novo. Para provar
  que ele falha quando deve, trocar temporariamente o 15 esperado por 14, ver FALHAR e voltar a 15.
- [ ] **Passo 5:** Rodar `npm test`.
  Esperado: os 107 testes de sempre, sem mudança.

### Task 2: Migração de unidades, perfis e processos

**Arquivos:**
- Criar: `supabase/migrations/20261115001_unidades_perfis_processos.sql`
- Criar: `supabase/tests/010_esquema_unidades_perfis.test.sql`

**Interfaces:**
- Produz, em `unidades`, as colunas novas `icmbio_id TEXT UNIQUE`, `hierarquia TEXT`,
  `nome_completo TEXT`, `grupo_regional TEXT` e `atualizado_em TIMESTAMPTZ`. A `sigla` passa a ser
  opcional e não única. O `tipo` passa a aceitar a lista das Restrições globais.
- Produz a tabela `processos_cadeia_valor(id uuid pk, proc_id text unique not null, nome text not
  null, macro_id text, macroprocesso text, proc_tipo text, unidade_lider_id uuid → unidades,
  unidade_supervisora_id uuid → unidades, ativo boolean not null default true, atualizado_em
  timestamptz)`.
- Produz `objetos_contexto.processo_id uuid → processos_cadeia_valor` (opcional).
- Produz, em `perfis_usuarios`: FK `id → auth.users(id) ON DELETE CASCADE`, colunas `ativo boolean
  not null default true` e `titular_chefia boolean not null default false`, e o `CHECK` de
  `papel_governanca` com os 10 perfis.

- [ ] **Passo 1: Teste que falha.** Em `010`, com `has_column`, `col_is_unique` e `throws_ok`:
  - as colunas e a tabela nova existem;
  - um `INSERT` em `unidades` com `tipo = 'coordenacao-territorial'` funciona;
  - `papel_governanca = 'lider_cg'` é recusado e `'coordenador_territorial'` é aceito;
  - duas unidades com a mesma `sigla` e `icmbio_id` diferentes são aceitas.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA (colunas inexistentes).
- [ ] **Passo 3:** Escrever a migração. Converter `lider_cg` → `coordenador_geral` antes de trocar o
  `CHECK`. Criar índices em `unidades(unidade_pai_id)`, `objetos_contexto(unidade_id)` e
  `objetos_contexto(processo_id)`.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` e `010` passam.

### Task 3: Importador das listas do SharePoint e retrato versionado

**Arquivos:**
- Criar: `scripts/sync-estrutura/lerListaSharepoint.ts`, `scripts/sync-estrutura/converter.ts`,
  `scripts/sync-estrutura/compararEAplicar.ts`, `scripts/sync-estrutura/index.ts`,
  `scripts/sync-estrutura/gerarRetrato.ts`
- Criar: `supabase/referencia/20261115_estrutura.csv` e `supabase/referencia/20261115_cadeia-valor.csv`
  (gerados por `gerarRetrato.ts` a partir de `_temp/`)
- Criar: `tests/unit/syncEstrutura.spec.ts` e `tests/unit/fixtures/sharepoint/*.csv`
- Modificar: `package.json` (`sync:estrutura` = `vite-node scripts/sync-estrutura/index.ts`;
  `db:reset` = `supabase db reset && npm run sync:estrutura -- --sim && supabase db execute --file supabase/seed-demonstracao.sql`)
  (se o `supabase db execute` não existir nesta versão da CLI, aplicar o mesmo arquivo com o cliente
  `psql` do contêiner `supabase_db_cgov-riscos`)

**Interfaces:**
- `lerListaSharepoint(caminho: string): Record<string, string>[]`: ignora o BOM e a linha
  `ListSchema=` e devolve as linhas pelo nome do cabeçalho.
- `converterTipo(tipoSharepoint: string, linha: Record<string,string>): TipoUnidade | null`:
  devolve `null` para o "Comitê Gestor". Os tipos vazios são deduzidos pela tabela
  `CORRESPONDENCIA_TIPOS`, montada lendo a lista real. O retrato informa quantas unidades ficaram
  sem tipo, e o objetivo é zero.
- `montarArvore(linhas): { unidades: UnidadeImportada[]; avisos: string[] }`: aponta para o pai do
  grupo as mães inexistentes e **recusa ciclos** (lança `Error('RADAR: ciclo na árvore em <id>')`).
- `compararComBanco(importadas, existentes): Relatorio` com as listas `novas`, `renomeadas`,
  `mudaramDeMae`, `desativadas` e `semMudanca`.
- `aplicar(relatorio, cliente)`: faz upsert por `icmbio_id` e `proc_id`, com `ativa = false` para
  `status = 'Inativo'` ou ausência na lista. Nunca apaga linhas.
- Opções da linha de comando: `--pasta <dir>` (padrão `supabase/referencia/`), `--sim` e
  `--so-relatorio`.
- `gerarRetrato.ts --origem _temp/`: grava em `supabase/referencia/` só as colunas `icmbio_id`,
  `id_mae`, `sigla`, `uorg_nome`, `uorg_nome-completo`, `tipo`, `hierarquia`, `status`,
  `macrogrupo`, `mesogrupo`, `microgrupo` (estrutura) e `proc`, `proc_id`, `proc_tipo`,
  `macroprocesso`, `macro_id`, `icmbio_id`, `supervisor`, `orientador`, `Situacao` (cadeia).

- [ ] **Passo 1: Testes que falham** em `syncEstrutura.spec.ts`, com fixtures pequenas no formato
  real (BOM, CRLF, `ListSchema=`, texto entre aspas com vírgula e quebra de linha):
  - lê 3 linhas sem erro;
  - "Núcleo de Gestão Integrada" → `ngi`; "Assesoria da Presidência" → `orgao-assistencia`;
    "Comitê Gestor" → ignorado;
  - mãe inexistente → pai do grupo + 1 aviso;
  - ciclo A → B → A → erro com "ciclo";
  - reexecutar com a mesma entrada → relatório só com `semMudanca`;
  - `status = 'Inativo'` → aparece em `desativadas`;
  - mudança de `id_mae` → aparece em `mudaramDeMae`.
- [ ] **Passo 2:** Rodar `npx vitest run tests/unit/syncEstrutura.spec.ts`.
  Esperado: FALHA (módulos inexistentes).
- [ ] **Passo 3:** Implementar os módulos. Para o leitor de CSV, instalar `csv-parse` com versão
  exata publicada há pelo menos 2 semanas.
- [ ] **Passo 4:** Rodar de novo o teste do Passo 2.
  Esperado: PASSA.
- [ ] **Passo 5:** Rodar `npx vite-node scripts/sync-estrutura/gerarRetrato.ts --origem _temp/`.
  Conferir que os 2 CSVs gerados **não têm** colunas `titular`, `email`, `mat`, `siape_nome` nem
  `cargo`.
  Rodar: `grep -c "@" supabase/referencia/*.csv`
  Esperado: 0 nos dois.
- [ ] **Passo 6:** Rodar `npm run db:reset`, depois `npm run sync:estrutura -- --so-relatorio`.
  Esperado: o relatório mostra `semMudanca` igual ao número de unidades ativas mais as inativas,
  e nenhuma unidade sem tipo.

### Task 4: Semente de demonstração (usuários fictícios em unidades reais)

**Arquivos:**
- Criar: `supabase/seed-demonstracao.sql` (o `supabase/seed.sql` atual continua com as 8 categorias)
- Criar: `supabase/tests/020_semente.test.sql`

**Interfaces:**
- Produz os usuários fictícios, em `auth.users` e `perfis_usuarios` (com unidades buscadas por
  `icmbio_id` ou `sigla` na árvore real), que as Tasks 5 a 8 usam pelo e-mail:
  - `gestor.uc@radar.test`: chefe titular de uma UC com CT;
  - `gestor.uc-sem-ct@radar.test`: chefe titular de uma UC ligada direto à GR;
  - `gestor.base@radar.test`: chefe de uma Base Avançada dessa UC;
  - `ct@radar.test`: `coordenador_territorial` titular;
  - `gr@radar.test`: `gerente_regional` titular;
  - `servidor.gr@radar.test`: `gestor` **não titular** na mesma GR;
  - `cg.cgpro@radar.test`: `coordenador_geral` titular da CGPRO;
  - `coord.cofis@radar.test`: `gestor` titular da COFIS;
  - `diretor.dibio@radar.test`: `diretor` titular da DIBIO;
  - `diretor.diman@radar.test`: `diretor` titular da DIMAN;
  - `centro@radar.test`: `gestor` titular de um Centro Nacional;
  - `presidente@radar.test`: `presidencia` titular;
  - `auditor@radar.test`: `auditoria`;
  - `cgov@radar.test`: `cgov`;
  - `cgge@radar.test`: `cgge` titular;
  - `gabin@radar.test`: `gabin`;
  - `sem-perfil@radar.test`: só em `auth.users`;
  - `inativo@radar.test`: `gestor` com `ativo = false`.
- Produz os objetos e riscos de demonstração:
  - pelo menos um risco em cada uma destas unidades: UC com CT, UC sem CT, Base, CT, GR, COFIS,
    CGPRO, Centro, CGOV e AUDIT;
  - um objeto de UC ligado a um processo `2.02.x` (Proteção, supervisor CGPRO);
  - o Caso de Controle do Anexo II;
  - pelo menos um risco crítico e um `pendente_dar`.

- [ ] **Passo 1: Teste que falha** `020`: os 18 e-mails existem; cada perfil tem a unidade e o
  `titular_chefia` esperados; a UC sem CT tem a GR como mãe; existe objeto com
  `processo_id` de proc_id `2.02.%`.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA.
- [ ] **Passo 3:** Escrever a semente. Os riscos entram por `INSERT` comum, e o gatilho calcula
  inerente e residual.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` a `020` passam.

### Task 5: Funções de alcance

**Arquivos:**
- Criar: `supabase/migrations/20261115002_funcoes_alcance.sql`
- Criar: `supabase/tests/030_alcance.test.sql` e `supabase/tests/_ajudantes.sql` (função de teste
  `entrar_como(email text)`, que faz `set local role authenticated` e grava o `sub` do usuário em
  `request.jwt.claims`)

**Interfaces** (todas `SECURITY DEFINER`, conforme as Restrições globais):
- `public.meu_perfil() returns public.perfis_usuarios`: a linha ativa do `auth.uid()`, ou `null`.
- `public.unidades_descendentes(raiz uuid) returns setof uuid`: a raiz e todas as descendentes.
  Consulta recursiva **com proteção contra ciclo**, sem repetir ids.
- `public.unidades_visiveis() returns setof uuid`.
- `public.pode_ler_objeto(objeto uuid) returns boolean`, com a visão por processo para
  `coordenador_geral`, via `processos_cadeia_valor.unidade_supervisora_id` ou
  `objetos_contexto.macroprocesso_supervisor_id`.
- `public.pode_escrever_objeto(objeto uuid) returns boolean`, com a exceção da CGOV só para criar
  objetos. A exceção para riscos preliminares fica na RLS da Task 6.
- `public.chefia_imediata(unidade uuid) returns uuid` e
  `public.homologador_de(unidade uuid) returns uuid`, este com a ordem GR → Diretoria → Presidência.
- `public.e_titular_de(unidade uuid) returns boolean`: o usuário atual está ativo, tem
  `titular_chefia = true` e está lotado na unidade.

- [ ] **Passo 1: Testes que falham** em `030`, um bloco por usuário da semente. Cada bloco confere
  o número de unidades em `unidades_visiveis()` (calculado pela árvore real com uma consulta de
  referência no próprio teste), e mais:
  - `gestor.uc` vê a UC e a Base, e não vê a UC vizinha;
  - `ct` vê os NGIs e as UCs da CT;
  - `gr` vê tudo da GR;
  - `cg.cgpro` lê o objeto da UC ligado ao processo 2.02.x, mas não lê um objeto de UC sem ligação;
  - os 6 perfis de alcance total veem todas as unidades;
  - `sem-perfil` e `inativo` veem 0;
  - `anon` não executa as funções;
  - `chefia_imediata` da UC sem CT é a GR; a da Base é a UC; a do Centro é a DIBIO; a da CGOV é a CGGE;
  - `homologador_de` da CGOV é a Presidência, o da COFIS é a DIMAN e o da UC é a GR;
  - (ponto de atenção 1) com um ciclo criado à força numa transação, `unidades_descendentes`
    termina;
  - (ponto 2) usuário lotado numa unidade com `ativa = false` continua vendo a própria unidade;
  - (ponto 3) mover uma UC de CT, dentro da transação, tira a UC do alcance da CT antiga.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA.
- [ ] **Passo 3:** Escrever a migração.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` a `030` passam.

### Task 6: RLS de leitura e escrita

**Arquivos:**
- Criar: `supabase/migrations/20261115003_rls_alcance.sql`
- Criar: `supabase/tests/040_rls_leitura.test.sql` e `supabase/tests/041_rls_escrita.test.sql`

**Interfaces:**
- Consome todas as funções da Task 5.
- Remove as 9 políticas "Leitura institucional de ..." da migração `20261109002`.
- Cria as políticas da spec, seção 8.1, item 3. Exceção da CGOV: `INSERT`/`UPDATE` em `riscos` com
  `status_fluxo = 'preliminar_cgov'` em qualquer unidade.
- `UPDATE` em `riscos` não pode mudar `status_fluxo`. A regra é um gatilho `BEFORE UPDATE`, que
  recusa quando o valor muda fora das funções de fluxo (Task 7). Essas funções sinalizam com
  `set_config('radar.fluxo','on',true)`.

- [ ] **Passo 1: Testes que falham:**
  - **040:** contagem de riscos lidos por usuário da semente, igual aos 7 "Exemplos práticos" da
    matriz; o mesmo para controles, KRIs, medições e respostas; `anon` lê 0.
  - **041:**
    - cada gestor grava na própria unidade e recebe erro, ou 0 linhas, na unidade vizinha;
    - `gr` não edita risco da UC; `auditor` não grava fora da AUDIT;
    - `cgov` cria risco `preliminar_cgov` numa UC, mas não edita um risco `rascunho` da UC;
    - `cgov` cria objeto numa UC; `gestor.uc` não cria objeto em outra unidade;
    - `UPDATE riscos SET status_fluxo = 'aprovado'` direto é recusado;
    - só `cgov` grava `categorias_risco`; só `cgov` lê `perfis_usuarios` de outras pessoas.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA.
- [ ] **Passo 3:** Escrever a migração.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` a `041` passam.

### Task 7: Fluxo de 3 degraus, trava e reabertura

**Arquivos:**
- Criar: `supabase/migrations/20261115004_fluxo_aprovacao.sql`
- Criar: `supabase/tests/050_fluxo.test.sql`

**Interfaces** (RPC `SECURITY DEFINER`; cada uma grava em `historico_fluxo` e devolve o risco
atualizado):
- `public.assumir_risco_preliminar(risco uuid)`: `preliminar_cgov` → `rascunho`.
- `public.enviar_para_validacao(risco uuid)`: `rascunho` ou `devolvido` → `em_validacao_cg`.
- `public.validar_risco(risco uuid, parecer text)` → `em_homologacao_dir` ou `aprovado`. Vai direto
  para `aprovado` quando o risco não exige homologação ou quando o titular da `chefia_imediata` é
  também o titular de `homologador_de`. Nesse caso, o histórico registra "validado e homologado pela
  mesma chefia".
- `public.homologar_risco(risco uuid, parecer text)`: `em_homologacao_dir` → `aprovado`.
- `public.devolver_risco(risco uuid, motivo text)` → `devolvido`. Motivo vazio é recusado.
- Gatilho de trava e reabertura em `riscos`, `controles_existentes`, `respostas_tratamento` e
  `indicadores_kri`:
  - recusa `UPDATE`/`DELETE` em `em_validacao_cg` e `em_homologacao_dir`;
  - em `aprovado`, alterações em `probabilidade`, `impacto`, `possui_evidencia_controle`,
    `nivel_eficacia_controle`, nas tabelas de controles e KRIs ou nos campos de tratamento (exceto
    `status_execucao`) levam o risco para `em_validacao_cg` e registram no histórico;
  - `medicoes_kri` e `respostas_tratamento.status_execucao` não travam nem reabrem.

- [ ] **Passo 1: Testes que falham** em `050`:
  - caminho feliz UC com CT: gestor envia, `ct` valida, `gr` homologa (risco crítico);
  - UC sem CT: `gr` valida e o risco crítico vai direto para `aprovado`, com o registro de
    "mesma chefia";
  - `servidor.gr` (não titular) não valida;
  - Base: o titular da UC valida;
  - Centro: `diretor.dibio` valida;
  - COFIS: `cg.cgpro` valida e `diretor.diman` homologa;
  - risco crítico da CGOV: `cgge` valida e `presidente` homologa;
  - risco não crítico: a validação leva a `aprovado`;
  - `pendente_dar` sobe para homologação;
  - a `cgov` cria o preliminar, a unidade assume, e a `cgov` não edita mais;
  - edição recusada em `em_validacao_cg`;
  - mudar a probabilidade de um risco aprovado reabre o fluxo; nova medição de KRI não reabre;
  - (ponto 4) dois titulares: o segundo `validar_risco` recebe "estado não permite";
  - devolver sem motivo é recusado;
  - `anon` não executa as RPCs.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA.
- [ ] **Passo 3:** Escrever a migração.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` a `050` passam.

### Task 8: Trilha de auditoria

**Arquivos:**
- Criar: `supabase/migrations/20261115005_trilha_auditoria.sql`
- Criar: `supabase/tests/060_auditoria.test.sql`

**Interfaces:**
- `auditoria_log` ganha a coluna `objeto_id uuid` e RLS ligada (leitura por
  `pode_ler_objeto(objeto_id)`; sem `INSERT`/`UPDATE`/`DELETE` para `authenticated`).
- Gatilho `public.fn_registrar_auditoria()` (`SECURITY DEFINER`) em `AFTER INSERT OR UPDATE OR
  DELETE` de `objetos_contexto`, `riscos`, `controles_existentes`, `respostas_tratamento`,
  `indicadores_kri` e `medicoes_kri`. Grava a tabela, o id do registro, o `objeto_id` (descoberto
  pelo risco ou pelo KRI), a operação, o `auth.uid()`, os dados antes e depois e a data.

- [ ] **Passo 1: Testes que falham** em `060`:
  - um `UPDATE` do `gestor.uc` gera 1 linha com o `objeto_id` certo;
  - `gestor.uc` lê só a trilha dos seus objetos; `cgov` lê tudo;
  - ninguém grava direto na trilha;
  - as funções de fluxo também geram linha.
- [ ] **Passo 2:** Rodar `npm run test:db`.
  Esperado: FALHA.
- [ ] **Passo 3:** Escrever a migração.
- [ ] **Passo 4:** Rodar `npm run db:reset && npm run test:db`.
  Esperado: `000` a `060` passam.

### Task 9: Documentação e verificação final

**Arquivos:**
- Modificar: `docs/02-arquitetura-cgti/guia-supabase-local.md` (completar: `db:reset`, testes,
  "Atualizar a estrutura a partir do SharePoint", o que fazer se o importador achar ciclo ou mãe
  inexistente)
- Modificar: `docs/02-arquitetura-cgti/modelo-dados-mer.md` (colunas e tabela novas, funções de
  alcance, fluxo e trilha)
- Modificar: `docs/03-caderno-aprendizado/02-entendendo-o-supabase-sql.md` (seção nova: "RLS com
  função de alcance e testes com pgTAP", com um exemplo da semente)
- Modificar: `docs/00-memoria/ESTADO-ATUAL.md` e `docs/00-memoria/MOC-Radar.md`

- [ ] **Passo 1:** Escrever e atualizar os documentos.
- [ ] **Passo 2: Verificação final.** Rodar, nesta ordem, `npm test`, `npm run build`,
  `npm run test:a11y` e `npm run db:reset && npm run test:db`.
  Esperado: todos verdes; a11y com 160 passed e 0 violações; o `test:db` lista os arquivos `000` a
  `060`.
- [ ] **Passo 3:** Rodar `git status --short`.
  Esperado: nenhum arquivo de `_temp/` e nenhum `.env` na lista.
- [ ] **Passo 4:** Mostrar o resultado e esperar o pedido de commit.
