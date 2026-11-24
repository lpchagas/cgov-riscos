# Guia de Migração e Integração com o Supabase na Nuvem (etapa D1)

> Este guia orienta, passo a passo, a levar o banco do RADAR do **computador local** para o **Supabase na
> nuvem**, onde vai rodar o piloto da Sede. Foi escrito para quem está começando: cada comando vem com uma
> frase dizendo o que faz e o que deve aparecer na tela. É um **guia vivo**: a cada passo feito, ele é
> atualizado com o que aconteceu de verdade.
>
> Base: Task 6 de [[2026-11-17-etapa-d1-ambiente-piloto-plan]] · desenho §6.1 de
> [[2026-11-17-etapa-d0-d1-piloto-sede-design]] · decisões em [[decisoes-tecnicas-d]] · banco local em
> [[guia-supabase-local]] · cópias em [[guia-copia-restauracao]].
>
> Documentação oficial consultada em **2026-11-20**: "Local development workflow", "Database migrations"
> e a referência da CLI (`supabase login`, `supabase link`, `supabase db push`), em
> <https://supabase.com/docs>. **Antes de repetir um passo, confira se a documentação mudou**: o painel da
> Supabase muda de layout com frequência.

---

## 1. Ideias básicas (leia uma vez)

| Termo | O que é, em uma frase |
| --- | --- |
| **Projeto Supabase** | Um "servidor" completo na nuvem: banco PostgreSQL, login (Auth), arquivos (Storage) e funções. |
| **Ref do projeto** | O identificador técnico do projeto, que aparece no endereço do painel (`.../dashboard/project/<ref>`). O nome pode mudar; o ref nunca muda. |
| **Supabase local** | O mesmo Supabase rodando no seu computador, em Docker (`npm run db:start`). É onde desenvolvemos e testamos. |
| **CLI** | O programa de linha de comando `supabase`, usado aqui por `npx supabase ...` (versão fixada no `package.json`: **2.122.0**). |
| **Migração** | Um arquivo `.sql` em `supabase/migrations/` que cria ou altera tabelas, regras e funções. Elas rodam **em ordem** pelo número no início do nome. |
| **Semente (seed)** | Dados iniciais. No RADAR há duas: `seed.sql` (dados de **referência**: as 8 categorias e o apetite padrão da DAR) e `seed-demonstracao.sql` (usuários e riscos **fictícios**). |
| **RLS** | *Row Level Security*: as regras do próprio banco que decidem quem vê e grava cada linha. É a segurança de verdade do RADAR. |
| **Token de acesso pessoal** | Chave que deixa a CLI agir na sua conta Supabase. Dá acesso a **todos** os seus projetos. |
| **Senha do banco** | Senha do usuário `postgres` do projeto. Pedida pelo `link` e pelo `db push`. |
| **Chave publicável (anon)** | Chave que pode ir para o navegador: sozinha, não abre nada; quem protege os dados é a RLS. |
| **Chave `service_role` / secreta** | Chave que **ignora a RLS**. Nunca vai para o front, para o repositório nem para a conversa. |

### Local × nuvem: quem age onde

| Comando | Onde age |
| --- | --- |
| `npm run db:start`, `npm run db:reset`, `npm run test:db` | Só no **computador** (Docker). |
| `npx supabase db push --linked` | Na **nuvem** (projeto ligado pelo `link`). Escreva sempre `--linked`: a CLI avisa que, na próxima versão principal, o padrão do `db push` passará a ser o banco **local**. |
| `npx supabase db reset` | No **computador** (padrão `--local`). **Nunca** use `--linked`: apagaria a nuvem. |

> [!tip] Regra de ouro
> A documentação da Supabase avisa que os padrões não são iguais entre os comandos (`db reset` vai no
> local; `db push`, `db pull` e `db dump` vão no projeto ligado). **Na dúvida, escreva o alvo**:
> `--local` ou `--linked`.

---

## 2. O projeto do piloto

| Item | Valor |
| --- | --- |
| Nome no painel | `cgov-riscos-v3.0` (antes `cgov-riscos-v2.1`) |
| Ref | `bekqcwaolpbhpxzcdyhx` |
| Endereço da API | `https://bekqcwaolpbhpxzcdyhx.supabase.co` |
| Região | São Paulo (`sa-east-1`) |
| Plano | Gratuito (limite: 2 projetos ativos por organização) |
| Postgres | 17 |
| Quem administra o painel | Só o responsável pelo projeto (decisão D0-6) |

### Onde fica cada segredo (nada disso vai para o Git)

| Segredo | Onde fica |
| --- | --- |
| Senha do banco | Gerenciador de senhas do responsável |
| Token da CLI | `~/.supabase/access-token` (ou o cofre do sistema), fora do repositório |
| Ligação com o projeto | `supabase/.temp/` (ignorada pelo Git) |
| Chave `service_role` / secreta | Só no painel da Supabase; nunca copiada para arquivo |

---

## 3. Regras do projeto para a nuvem

1. **Autorização a cada passo.** Nada é feito na nuvem sem o "sim" do responsável para **aquele** passo
   (`AGENTS.md`, "Regras do piloto da Sede").
2. **Nunca** aplicar `seed-demonstracao.sql` nem rodar `sync:estrutura -- --sim` na nuvem.
3. **Nunca** usar `npx supabase db push --include-seed` (a documentação desaconselha em produção).
4. **Nunca** usar `npx supabase db reset --linked`.
5. A Edge Function `gerenciar-acesso` **não** é publicada na D1 (ela envia e-mail; vai na D2, com trava).
6. Nenhum dado real antes do **Registro de Decisão** assinado ([[registro-decisao-piloto-sede]]).
7. Mudança de banco (campo, tabela, regra) **só por migração nova**, testada no local antes
   (seção 8 deste guia), e nunca pelo editor do painel.

---

## 4. Histórico do que já foi feito

| Data | Passo | Resultado |
| --- | --- | --- |
| 2026-11-20 | Escolha do projeto | O responsável decidiu **reaproveitar** o `cgov-riscos-v2.1` (zerado) em vez de criar `radar-piloto-sede`. O desenho §6.1 previa essa troca. |
| 2026-11-20 | Conferência antes de apagar (só leitura) | 14 tabelas antigas, **todas vazias**; 5 funções antigas; 1 conta de login de teste (abril/2026, sem uso); nenhuma Edge Function, arquivo ou histórico de migrações. |
| 2026-11-20 | Zerar o banco antigo | Feito pelo responsável no SQL Editor (comando na seção 5.1). Conferido depois: `public` sem tabelas, `auth.users` = 0. |
| 2026-11-20 | Renomear | `cgov-riscos-v3.0`. O ref não mudou. |
| 2026-11-20 | Senha do banco | Redefinida pelo responsável e guardada no gerenciador de senhas. |
| 2026-11-20 | Login da CLI (computador de casa) | Ok: token criado com o nome `cli_<usuário>@<computador>_<número>`. |
| 2026-11-20 | `link` com o ref `bekqcwaolpbhpxzcdyhx` | Ok (`Finished supabase link.`); **não pediu a senha**. |
| 2026-11-20 | Prévia (`db push --dry-run`) | Ok: as 12 migrações listadas, na ordem; nada aplicado. |
| 2026-11-20 | `db push --linked` | Ok: 12 migrações aplicadas (`Finished supabase db push.`). Conferido pelo MCP: histórico com as 12, na ordem; 12 tabelas no `public`, todas com RLS ligada e com políticas; 0 linhas em todas e em `auth.users`. |
| 2026-11-20 | Dados de referência (`seed.sql`) | Ok, aplicado pelo Claude via MCP (`execute_sql`, numa transação), com autorização. 8 categorias (ids 1 a 8; Integridade com 6 subcategorias); contador em 8; `auditoria_log` = 8 (a trilha registra as inclusões da DAR, como no local). |
| 2026-11-20 | Auth | Cadastro avulso **desligado** pelo responsável (estava ligado); login anônimo já estava desligado. Conferido pelo endereço público `/auth/v1/settings` (seção 7.4). Detalhe: a mudança só vale depois de clicar em **Save changes**. |
| 2026-11-20 | Conferência final (Task 6) | Ok. Nuvem igual ao local: 12 tabelas com as mesmas colunas, 49 políticas de RLS; 1 função a mais (`rls_auto_enable`, da Supabase). *Advisors*: nenhuma tabela sem RLS; avisos registrados na seção 7.5. |
| 2026-11-22 | Conferência antes da migração `20261122001` (só leitura, LAC-14 e LAC-15) | Ok, pelo Claude via MCP, com autorização: 0 riscos; categorias ids 1 a 8 antigas; coluna JSONB presente; `subcategorias_risco` ausente; `auditoria_log` = 8; 12 migrações, a última `20261117001`. |
| 2026-11-22 | `db push --linked` (1ª tentativa) | **Recusado no primeiro comando**, sem gravar nada: `LOCK TABLE can only be used in transaction blocks` (25P01). O `db push` manda o arquivo num lote só, sem `BEGIN`, e o `LOCK TABLE` solto não é aceito assim. Conferido por leitura: nuvem igual a antes. Corrigido no commit `cbbe8c3` (trava dentro de um bloco `DO`). |
| 2026-11-22 | `db push --linked` (2ª tentativa) | Ok, rodado pelo responsável: só a `20261122001` listada e aplicada (`Finished supabase db push.`). |
| 2026-11-22 | Conferência depois da migração (só leitura) | Ok: 8 categorias (2 Operacional, 3 Financeiro/Orçamentário, 4 Legal, 5 Integridade, 6 Reputação, com o apetite de antes; 9, 10 e 11 com `pendente_dar`); 6 subcategorias da Integridade; coluna JSONB ausente; `CHECK` dos nomes, chave estrangeira e gatilho `trg_riscos_exige_subcategoria` presentes; contador em 11; 0 riscos; `auditoria_log` = 19 (11 novas de `categorias_risco`: 3 exclusões, 3 inclusões e 5 alterações, todas sem usuário). |
| 2026-11-22 | Conferência antes da migração `20261122002` (só leitura, LAC-13) | Ok, pelo Claude via MCP, com autorização: 0 riscos na nuvem, logo nenhum risco crítico (ou Pendente de DAR) com "Aceitar" ou sem ação, em nenhuma situação do fluxo. Nada a decidir caso a caso. |
| 2026-11-22 | `db push --linked` (LAC-13) | Ok, pelo Claude, com autorização: prévia (`--dry-run`) listou só a `20261122002`; aplicada (`Finished supabase db push.`). |
| 2026-11-22 | Conferência depois da migração (só leitura) | Ok: 14 migrações, a última `20261122002`; as 4 funções novas presentes (`fn_trava_risco_critico` e as 3 `fn_base_*`); `authenticated` **não** executa `fn_base_validar_risco`, mas executa `validar_risco`; `salvar_ficha_risco` continua `SECURITY INVOKER`. |
| 2026-11-22 | `db push --linked` (LAC-13, 2ª migração) | Ok, pelo Claude, com autorização: prévia listou só a `20261122003` (gatilho `trg_riscos_trava_aceitar_critico`, achado da revisão final); aplicada (`Finished supabase db push.`). Conferido por leitura: 15 migrações, a última `20261122003`; gatilho presente em `riscos`; 0 riscos. |
| 2026-11-23 | Conferência antes da migração `20261122004` (só leitura, LAC-03) | Ok, pelo Claude via MCP, com autorização: 0 riscos, 0 KRIs (`indicadores_kri`), 0 medições, 0 riscos com KRI; 15 migrações, a última `20261122003`; `auditoria_log` = 19. Não há dado para mover nem aprovado antigo fora da regra. |
| 2026-11-23 | `db push --linked` (LAC-03) | Ok, pelo Claude, com autorização: prévia (`--dry-run`) listou só a `20261122004`; aplicada (`Finished supabase db push.`). |
| 2026-11-23 | Conferência depois da migração (só leitura) | Ok: 16 migrações, a última `20261122004`; `kri_riscos` presente, com RLS ligada e sem `UPDATE` para `authenticated`; `indicadores_kri` com `objeto_id` e sem `risco_id`; `fn_kri_completo` e `kri_total_riscos` presentes (`authenticated` executa, `anon` não); 0 riscos, 0 KRIs, 0 medições, 0 ligações; `auditoria_log` = 19 (igual a antes). Aprovados antigos fora da regra: nenhum (0 riscos). |
| 2026-11-23 | `db push --linked` (LAC-03, 2ª migração) | Ok, pelo Claude, com autorização: prévia listou só a `20261123001` (travas de linha nos gatilhos de `kri_riscos`, achados do CodeRabbit na PR #17); aplicada. Conferido por leitura: 17 migrações, a última `20261123001`; `fn_kri_riscos_mesmo_objeto` com `FOR SHARE` no KRI e `FOR NO KEY UPDATE` no risco, `fn_kri_grupo_mesmo_objeto` com `FOR SHARE`, `fn_kri_riscos_apaga_orfao` com `FOR UPDATE`; 0 riscos, 0 KRIs, `auditoria_log` = 19. |
| 2026-11-24 | Conferência antes de atualizar o Postgres (só leitura, seção 5.4) | Ok, pelo Claude via MCP, com autorização: versão `17.6.1.104`; 0 riscos, 0 KRIs, 0 contas em `auth.users` (sem dados reais, cópia dispensada); 17 migrações, a última `20261123001`; banco com 13 MB; nenhum *slot* de replicação; nenhuma das extensões de cuidado (`timescaledb`, `plv8`, `pgjwt`). |
| *(próximo)* | Atualizar o Postgres (seção 5.4) | Autorizado em 2026-11-24; feito pelo responsável no painel (**Upgrade project**). |
| *(próximo)* | Site URL e URLs de retorno | Task 7 (publicação do front). |

> [!note] Proteção da própria Supabase
> O projeto tem um gatilho da plataforma chamado `ensure_rls` (função `rls_auto_enable`) que **liga a RLS
> sozinho** em toda tabela nova. O Supabase local não tem esse gatilho. Isso não atrapalha: todas as
> tabelas das nossas migrações já ligam a RLS. Ele foi mantido.

---

## 5. Usar o painel da Supabase

### 5.1 Rodar SQL no painel (SQL Editor)

**Para que serve:** escrever um comando SQL e executá-lo direto no banco da nuvem. Use só para
conferências ou para passos autorizados; **mudança de estrutura vai por migração**.

1. Abra o link direto (funciona mesmo que o menu mude de nome):
   `https://supabase.com/dashboard/project/bekqcwaolpbhpxzcdyhx/sql/new`
   No painel novo (novembro/2026), o item do menu com o ícone `>_` aparece como **Explorer**; a
   documentação ainda chama a tela de **SQL Editor**.
2. Cole o comando e clique em **Run** (ou **Ctrl + Enter**).
3. Se o comando apagar algo, o painel pede confirmação de **consulta destrutiva**: leia antes de confirmar.
4. Esperado: `Success. No rows returned` (ou a tabela com o resultado). Erro em vermelho: **não repita**,
   copie a mensagem e peça ajuda.

Comando usado para zerar o projeto antigo, em 2026-11-20 (registro histórico; **não rode de novo**):

```sql
begin;  -- tudo entre begin e commit é aplicado de uma vez, ou nada
drop table if exists public.estrutura_organizacional, public.processos, public.categorias_risco,
  public.perfil_usuario, public.riscos, public.controles, public.avaliacoes_risco,
  public.planos_tratamento, public.acoes_tratamento, public.evidencias, public.revisoes_risco,
  public.eventos_risco, public.comentarios, public.auditoria cascade;
drop function if exists public.auth_email(), public.fn_set_atualizado_em(), public.auth_perfil(),
  public.auth_unidade_id(), public.fn_auditoria() cascade;
delete from auth.users;
commit;
```

### 5.2 Renomear o projeto

`https://supabase.com/dashboard/project/bekqcwaolpbhpxzcdyhx/settings/general` → campo
**Project name** → **Save**. Só o nome muda; o ref e os endereços continuam iguais.

### 5.3 Redefinir a senha do banco

`https://supabase.com/dashboard/project/bekqcwaolpbhpxzcdyhx/database/settings` → **Database password**
→ **Reset database password** → **Generate a password** → copie para o gerenciador de senhas →
**Reset password**. A documentação avisa: a senha nova **pode levar alguns minutos** para valer.

### 5.4 Atualizar a versão do Postgres **[AUTORIZAÇÃO]**

**Por quê (2026-11-24):** a imagem **17.6.1.104** tem um defeito na extensão `supautils`: quando o papel
`anon` ou `authenticated` chama uma função sem permissão, o servidor cai (*segmentation fault*) em vez de
responder "permission denied". No banco local isso derrubava 5 arquivos de teste; na nuvem, um visitante
que chamasse pela API uma função sem permissão poderia derrubar as conexões do banco. As versões 17.11 e
17.12 respondem certo. O responsável autorizou a atualização em 2026-11-24.

**Como (documentação da Supabase, "Upgrading", atualização no lugar com `pg_upgrade`):**

1. **Antes:** confira se há dados reais. Se houver, faça a cópia cifrada do [[guia-copia-restauracao]]
   antes de tudo. Se a atualização falhar, a Supabase volta o banco original sozinha, mas a cópia é a rede
   de segurança.
2. Escolha um horário sem uso: o banco e a API **ficam fora do ar** durante a atualização (minutos, num
   banco pequeno; a regra da Supabase é cerca de 100 MB por segundo).
3. Abra `https://supabase.com/dashboard/project/bekqcwaolpbhpxzcdyhx/settings/infrastructure`.
4. Na seção do Postgres, veja a versão atual (`17.6.1.104`) e a oferecida. Clique em **Upgrade project**
   e confirme. Se o botão não aparecer, o projeto ainda não tem versão nova liberada: avise o Claude e
   não faça "pausar e restaurar" (só vale para o plano gratuito e tem outros efeitos).
5. Espere o painel mostrar o projeto saudável de novo (*Healthy*).
6. **Depois:** peça ao Claude a conferência só de leitura: versão nova pelo MCP (`get_project`), lista de
   migrações igual à de antes, tabelas com RLS e o *Advisors* sem aviso novo. Registre na tabela da seção 4.

Observações: a atualização não aplica migração nenhuma (as `20261123002` e `20261123003` continuam
esperando o front da Fase 2); as senhas dos papéis da Supabase são migradas sozinhas para `scram-sha-256`;
o projeto não usa replicação lógica nem `timescaledb`/`plv8`, que a documentação lista como cuidados.

---

## 6. Aplicar as migrações na nuvem (CLI)

Abra o terminal do VS Code (**Terminal → New Terminal**) e confira que a linha termina em
`~/projetos/cgov-riscos$` (se não, `cd ~/projetos/cgov-riscos`).

### 6.1 Entrar na conta pela CLI (uma vez por computador)

```bash
npx supabase login
```
- A CLI diz `Press Enter to open browser and login automatically`: tecle **Enter**. Se o navegador não
  abrir (comum no WSL), ela mostra `Here is your login link...`: copie o link e abra no navegador.
- No navegador, entre na conta Supabase e autorize. A página mostra um **código de verificação** curto
  (8 caracteres): copie e cole no terminal em `Enter your verification code`.
- Esperado: `Token cli_... created successfully.` e `You are now logged in. Happy coding!`
- O código de verificação vale **uma vez só**; depois de usado, não serve para mais nada.
- Para ver ou apagar os tokens criados: `https://supabase.com/dashboard/account/tokens` (apague o token
  de um computador que você não usa mais).
- O aviso "A new version of Supabase CLI is available" pode ser ignorado: o projeto fixa a 2.122.0 e
  atualizar é uma decisão separada.

### 6.2 Ligar o repositório ao projeto (uma vez por computador)

```bash
npx supabase link --project-ref bekqcwaolpbhpxzcdyhx
```
- Esperado: `Finished supabase link.`
- Na CLI 2.122.0 (2026-11-20), o `link` **não pediu a senha do banco**: a CLI usou o token do passo 6.1
  (a linha `Initialising login role...` aparece no comando seguinte). A documentação ainda fala que a
  senha pode ser pedida; se pedir, digite a senha (nada aparece enquanto digita; é normal). A senha
  continua necessária para a cópia cifrada ([[guia-copia-restauracao]]).
- Se mostrar diferenças de configuração ou fizer perguntas, **não aceite**: copie a mensagem e peça ajuda.
- O `link` grava em `supabase/.temp/postgres-version` a versão do Postgres da nuvem. Desde 2026-11-24, o
  `npm run db:start` apaga esse arquivo (`scripts/banco-local-imagem.mjs`) para o banco **local** subir com
  a imagem padrão do CLI 3.3.0, sem o defeito da 17.6.1.104 (seção 5.4). A ligação com a nuvem não muda.

### 6.3 Prévia (não muda nada)

```bash
npx supabase db push --linked --dry-run
```
- `--dry-run` = "ensaio": mostra o que **seria** aplicado, sem aplicar. `--linked` = no projeto ligado.
- Esperado: `DRY RUN: migrations will *not* be pushed to the database.`, depois `Would push these
  migrations:` com a lista das **12 migrações**, de `20261109001_schema_radar.sql` a
  `20261117001_leitura_acoes_e_gravacao_ficha.sql`.
- Confira a lista antes de seguir.
- Sem `--linked`, a CLI 2.122.0 avisa: `supabase db push will target the local database by default in the
  next major version`. Por isso escrevemos o alvo.

### 6.4 Aplicar **[AUTORIZAÇÃO]**

```bash
npx supabase db push --linked
```
- Pergunta `Do you want to push these migrations to the remote database? [Y/n]`: responda `Y`.
- Na primeira vez, a CLI cria a tabela `supabase_migrations.schema_migrations`, que guarda **quais
  migrações já rodaram**. Por isso, nas próximas vezes, o `db push` aplica **só as novas**.
- Esperado: uma linha `Applying migration ...` para cada uma das 12 e `Finished supabase db push.`

Resultado real (2026-11-20): a pergunta apareceu com a lista das 12 migrações; resposta `Yes`; uma linha
`Applying migration ...` para cada uma; `Finished supabase db push.` Nenhum erro.

---

## 7. Completar o banco: referência, Auth e conferência

### 7.1 Dados de referência **[AUTORIZAÇÃO]**

Aplicar **só** o `supabase/seed.sql`: as 8 categorias do Quadro 2, com as 6 subcategorias de Integridade do Quadro 3, o apetite padrão da DAR e o acerto do contador (`setval`, para a próxima categoria ser a 12).
**Atenção ao que está na nuvem:** o `seed.sql` foi trocado em 2026-11-22 (LAC-14 e LAC-15). Em 2026-11-20 foi aplicado, na nuvem, o **seed antigo** (categorias 1 a 8, do sistema antigo); o banco do piloto **não** é refeito por este arquivo, e sim alinhado pela migração `20261122001`, na seção 7.1.1. O `seed.sql` novo vale para um banco novo (por exemplo, `db:reset` local). Aquele seed antigo foi aplicado pelo Claude via MCP, numa transação (`begin ... commit`); o seed novo também pode ser
colado no SQL Editor (seção 5.1).

- Resultado de 2026-11-20 (seed antigo): `setval` = 8; 8 linhas em `categorias_risco`; **8 linhas em `auditoria_log`** (a trilha de
  auditoria registra as inclusões da DAR; no local acontece o mesmo). Numa nuvem nova com o seed atual, o esperado é
  `setval` = 11, 8 categorias (ids 2 a 6 e 9 a 11) e 6 subcategorias.
- O comentário no topo do `seed.sql` foi corrigido em 2026-11-22: o arquivo traz só as categorias e as
  subcategorias; as unidades vêm do importador e os dados de demonstração, do `seed-demonstracao.sql`.

### 7.1.1 Alinhar as categorias e subcategorias do piloto ao Quadro 2 e ao Quadro 3 **[AUTORIZAÇÃO]**

> **Situação em 2026-11-22: aplicado na nuvem.** A migração `20261122001` ([[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]) foi aplicada no piloto na Fase 2 do plano, passo a passo e com autorização; a 1ª tentativa do `db push` foi recusada sem gravar nada (trava fora de bloco `DO`). Resultado e conferência no histórico da seção 4.

> **Antes, uma ressalva sobre a versão do Postgres.** A nuvem roda o Postgres **17.6.1.104**, o mesmo que o `supabase link` grava em `supabase/.temp/postgres-version`. Com essa imagem no computador local, o teste pgTAP `030_alcance.test.sql` (perto da linha 124) derrubou o Postgres (segmentation fault) e levou junto o resto da rodada. Os testes desta fase rodaram com a versão `17.11.0.006`. A migração em si não depende disso, mas a causa **ainda não foi investigada** (veja a pendência no [[ESTADO-ATUAL]]).

O que a migração faz, em uma transação: (1) **recusa** com erro, listando os `codigo_radar`, se houver risco nas categorias 1, 7 ou 8, com subcategoria fora do Quadro 3, de Integridade sem subcategoria ou com subcategoria fora da Integridade, e também se houver categoria que ela não sabe alinhar (id fora de 1 a 8, ou nome que não é dos 8 antigos nem dos 8 do Quadro 2: a mensagem lista "id - nome"); (2) cria `subcategorias_risco`; (3) alinha as categorias existentes (nome e descrição dos ids 2 a 6, apaga os ids 1, 7 e 8, cria os ids 9 a 11 como `pendente_dar`, cria as 6 subcategorias, `setval` = 11); (4) remove a coluna JSONB e liga o `CHECK`, a chave estrangeira e o gatilho. Não toca no apetite das categorias 2 a 6.

Passos (cada um pede o aval na hora, e o 3 é só leitura):

1. **[AUTORIZAÇÃO]** Conferência de leitura no projeto `cgov-riscos-v3.0`: `select count(*) from riscos;` e `select id, nome from categorias_risco order by id;`. Esperado: 0 riscos e os ids 1 a 8 antigos. Se houver risco, ou categoria com outro id ou outro nome, **parar** e mostrar ao responsável.
2. **[AUTORIZAÇÃO]** `npx supabase db push` (sem `--include-seed`), conferindo na lista que só a `20261122001` vai ser aplicada.
3. Conferir de novo (leitura): 8 categorias com os ids 2 a 6 e 9 a 11; 6 subcategorias; coluna JSONB ausente; linhas novas em `auditoria_log` só de `categorias_risco` (3 exclusões, 3 inclusões e 5 alterações, sem usuário logado; a tabela `subcategorias_risco` não tem gatilho de auditoria, então as 6 inclusões de subcategoria não aparecem na trilha). Registrar o resultado e a data no histórico da seção 4.

### 7.2 Desligar o cadastro avulso **[AUTORIZAÇÃO]**

1. Abra `https://supabase.com/dashboard/project/bekqcwaolpbhpxzcdyhx/auth/providers`
   (*Authentication → Sign In / Providers*, aba **Supabase Auth**).
2. No quadro **User Signups**: desligue **Allow new users to sign up**; confira que **Allow anonymous
   sign-ins** está desligada. Não mexa em **Allow manual linking** (desligada) nem em **Confirm email**
   (ligada).
3. Clique em **Save changes**. **Sem isso, nada muda** (aconteceu em 2026-11-20: a chave aparecia
   desligada na tela, mas o servidor continuava com o cadastro ligado até o clique).

Por que: só contas criadas pela CGOV podem existir (D0-6). Desligar o cadastro **não impede** a criação
de contas pelo servidor na D2.

### 7.3 Site URL e URLs de retorno

Ficam para a Task 7, quando o front tiver endereço (*Authentication → URL Configuration*).

### 7.4 Como conferir o Auth sem entrar no painel (só leitura)

O Auth tem um endereço público que **informa** a configuração e não muda nada. Precisa da chave
publicável (`sb_publishable_...`, que pode ser pública; veja em *Project Settings → API Keys*):

```bash
curl -s https://bekqcwaolpbhpxzcdyhx.supabase.co/auth/v1/settings -H "apikey: <chave publicável>"
```

- `"disable_signup": true` → cadastro avulso **desligado** (o que queremos).
- `"anonymous_users": false` (dentro de `external`) → login anônimo **desligado**.

### 7.5 Conferência final e avisos do *Advisors*

*Advisors* é o "verificador" da Supabase (menu **Advisors**, ou `get_advisors` pelo MCP): aponta riscos
de segurança e de desempenho. Resultado em 2026-11-20:

| Aviso | Quantos | Leitura |
| --- | --- | --- |
| Tabela sem RLS | **0** | ✅ O critério da Task 6. |
| SECURITY DEFINER executável por usuário logado | 21 | **Esperado.** São as funções do fluxo e do alcance (`validar_risco`, `homologar_risco`, `unidades_visiveis`...), que conferem quem chama por dentro. Decisão das etapas B1 e B3. |
| SECURITY DEFINER executável sem login (`anon`) | 1 | É a `rls_auto_enable`, **da própria Supabase** (não é nossa). Pendência D1-P1 em [[decisoes-tecnicas-d]]. |
| *search_path* mutável | 3 | `calcular_nivel_inerente_q7`, `classificar_nivel_q8`, `trigger_calcular_risco_radar`: funções do **cálculo**. Corrigir exige migração e autorização (pendência D1-P2). |
| Chave estrangeira sem índice / índice não usado | 11 / 7 | Informativos; o banco está vazio. Rever com dados reais (pendência D1-P3). |
| Várias políticas permissivas na mesma ação | 13 | **Esperado** pelo desenho (ex.: "CGOV grava no preliminar" + "a unidade grava no próprio"). |

Comparação com o local (contagem de colunas por tabela, políticas e funções): **igual**, com uma função a
mais na nuvem (`rls_auto_enable`).

---

## 8. Como levar uma mudança de banco para a nuvem no futuro

Exemplo: a revisão da interface pede um **campo novo** numa tabela.

1. Decidir e registrar a mudança (plano da etapa; mudança de cálculo, alcance, RLS ou fluxo precisa de
   autorização, conforme o `AGENTS.md`).
2. Criar a migração nova em `supabase/migrations/` (número maior que o último), com comentários
   didáticos.
3. Testar **no local**: `npm run db:reset && npm run test:db` e `npm test`. Não troque o `db:reset` por um teste
   do trecho novo dentro de um `BEGIN`: o `db push` roda o arquivo sem `BEGIN`, e comandos como `LOCK TABLE`
   solto passam num caso e falham no outro (aconteceu em 2026-11-22, seção 4).
4. Commit na branch de trabalho.
5. Na nuvem **[AUTORIZAÇÃO]**: `npx supabase db push --linked --dry-run` (deve listar **só** a migração
   nova) e depois `npx supabase db push --linked`.

> [!warning] Antes e depois dos dados reais
> Enquanto a nuvem está **vazia** (até a carga da D3), uma migração nova é só mais um `db push`. Depois que
> existirem dados reais, faça antes uma **cópia cifrada** ([[guia-copia-restauracao]]) e teste a migração
> numa restauração local dessa cópia.

---

## 9. Se der errado

| Sintoma | O que fazer |
| --- | --- |
| `password authentication failed` | Senha errada ou recém-trocada: espere alguns minutos (seção 5.3) e tente de novo. Se persistir, redefina a senha. |
| `Cannot find project ref` / pede para ligar | Rode a seção 6.2 (`link`) neste computador. |
| O `--dry-run` lista migrações que já deveriam estar na nuvem, ou acusa histórico diferente | **Pare.** Não use `migration repair` sozinho: peça ajuda ao Claude com a saída completa. |
| Erro no meio do `db push` | Cada migração roda inteira ou não roda. Copie a mensagem e peça ajuda; não edite migração que já foi aplicada. |
| Não acha uma tela no painel | Use os links diretos deste guia (seção 5) e confira a documentação atual. |
