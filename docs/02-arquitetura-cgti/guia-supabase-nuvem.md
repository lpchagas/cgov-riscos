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
| *(próximo)* | `db push --linked` | Seção 6.4. |

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

*(Resultado real: a preencher quando o passo for feito.)*

---

## 7. Próximos passos da Task 6 *(a detalhar quando forem feitos)*

1. **Dados de referência [AUTORIZAÇÃO]:** aplicar **só** o `supabase/seed.sql` (8 categorias e apetite
   padrão da DAR).
2. **Auth [AUTORIZAÇÃO]:** no painel, desligar o cadastro avulso e o login anônimo. O "Site URL" fica para
   a Task 7 (publicação do front).
3. **Conferência (só leitura):** lista de migrações igual à do repositório; tabelas do `public` iguais às
   do local; contagens `categorias_risco` = 8 e `perfis`, `riscos`, `unidades`, `auth.users` = 0; avisos
   de segurança e desempenho (*Advisors*) sem RLS desligada.

---

## 8. Como levar uma mudança de banco para a nuvem no futuro

Exemplo: a revisão da interface pede um **campo novo** numa tabela.

1. Decidir e registrar a mudança (plano da etapa; mudança de cálculo, alcance, RLS ou fluxo precisa de
   autorização, conforme o `AGENTS.md`).
2. Criar a migração nova em `supabase/migrations/` (número maior que o último), com comentários
   didáticos.
3. Testar **no local**: `npm run db:reset && npm run test:db` e `npm test`.
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
