# Guia do Supabase Local (para quem está começando)

> Este guia explica como rodar, no seu computador, uma cópia do banco de dados do RADAR e como
> testar as regras de cálculo dele. Tudo é local: nada aqui toca em dados reais do ICMBio.

## 1. O que é o "Supabase local" e por que usar

O RADAR guarda os riscos em um banco de dados PostgreSQL (o Supabase é o pacote que o envolve). Para
desenvolver com segurança, rodamos uma cópia descartável dele no seu computador, dentro do **Docker**
(um programa que roda "caixinhas" isoladas de software). Se algo der errado, basta recriar a cópia.

## 2. Instalar o Docker Desktop com WSL (Windows)

1. Baixe e instale o Docker Desktop em <https://www.docker.com/products/docker-desktop/>.
2. Em **Settings > General**, deixe ligada a opção **Use the WSL 2 based engine**.
3. Em **Settings > Resources > WSL integration**, ligue a integração com a sua distribuição Ubuntu.
4. Abra o Docker Desktop e espere o ícone indicar que ele está rodando.
5. No terminal do Ubuntu, confira:

```bash
docker version
```

Você deve ver duas seções: `Client` e `Server`. Se aparecer só `Client` ou um erro, o Docker Desktop
não está aberto ou a integração com o Ubuntu não foi ligada. Sem Docker, nada mais deste guia funciona.

## 3. Comandos do dia a dia

Rode sempre na pasta do projeto (`cgov-riscos`). A Supabase CLI já vem instalada como dependência do
projeto, então não precisa instalar nada além do Docker.

| Comando | O que faz |
| --- | --- |
| `npm run db:start` | Liga o banco local. Na primeira vez baixa várias imagens e demora alguns minutos. |
| `npm run db:stop` | Desliga o banco local (os dados do banco são mantidos). |
| `npm run db:reset` | Apaga o banco local e o recria do zero em 3 passos: (1) aplica as migrações de `supabase/migrations/` e a semente das categorias (`supabase/seed.sql`); (2) importa a estrutura e a Cadeia de Valor (`npm run sync:estrutura -- --sim`); (3) carrega a semente de demonstração (`supabase/seed-demonstracao.sql`: 19 usuários fictícios `@radar.test` e 10 riscos). |
| `npm run sync:estrutura` | Importa a árvore de unidades e a Cadeia de Valor a partir dos CSVs do SharePoint (ver seção 7). |
| `npm run test:db` | Roda os testes do banco (arquivos em `supabase/tests/`). |
| `npm run db:funcoes` | Serve a **Edge Function** `gerenciar-acesso` (convites). Rode **em outro terminal** e deixe aberto (ver seção 8). |
| `npm run test:integracao` | Testes de integração do login, da Edge Function e do importador de atribuições. Exige `db:start` **e** `db:funcoes` ligados (ver seção 8). |
| `npm run sync:atribuicoes` | Importa titulares e substitutos (pessoas) a partir da lista de atribuições (ver seção 9). |
| `npx supabase status` | Mostra os endereços e chaves locais (`API URL`, `DB URL`, `Studio URL`). |

Dica: use `db:reset` sempre que mudar uma migração, para provar que o banco nasce correto do zero.

### Problemas comuns (e o que fazer)

- **Porta ocupada ou "timeout" no primeiro `npm run db:start`.** O Supabase local usa várias portas
  (54321 a 54324, entre outras). Se outro programa (ou outro Supabase) já usa uma delas, o início
  falha. Rode `npm run db:stop`, feche o outro programa e tente de novo. O primeiro início também
  pode estourar o tempo por causa do download das imagens: basta rodar `npm run db:start` outra vez.
- **Falha logo depois do reset** (`DbSetupError ... exit 1` ou `ECONNRESET`). Os serviços do Supabase
  reiniciam depois do `supabase db reset` e, por alguns segundos, recusam conexões. **Espere cerca
  de 20 segundos e rode `npm run db:reset` de novo.** É transitório; não indica erro nas migrações.
- **O `db:reset` usa o nome fixo do contêiner `supabase_db_cgov-riscos`.** Esse nome é formado a
  partir do `project_id` do `supabase/config.toml` (`supabase_db_` + `project_id`). Se alguém trocar
  o `project_id`, o passo 3 (semente de demonstração) deixa de achar o contêiner: ajuste o nome no
  script `db:reset` do `package.json`. Para conferir o nome: `docker ps --format '{{.Names}}'`.
- **Por que os ajudantes de teste são `supabase/tests/ajudantes.psql` e não `.sql`?** O comando
  `npm run test:db` trata **todo arquivo `.sql`** da pasta como um teste. O arquivo de ajudantes
  (`entrar_como`, etc.) não é um teste; com a extensão `.psql` o runner o ignora, e cada teste o
  inclui com `\ir ajudantes.psql`.

## 4. O Studio local

O **Studio** é uma página web que mostra o banco como planilhas e permite rodar consultas SQL.
Com o banco ligado, abra no navegador o endereço `Studio URL` mostrado por `npx supabase status`
(normalmente <http://127.0.0.1:54323>). Lá você vê as tabelas, as linhas e o editor SQL.

## 5. Como ler uma falha de pgTAP

Os testes do banco usam o **pgTAP**. Cada arquivo termina em `ok` (passou) ou mostra `Failed test` (falhou).
Exemplo de falha (aqui o teste esperava 14 em vez de 15, só para ilustrar):

```text
supabase/tests/000_regressao_calculo.test.sql ..
# Failed test 1: "Quadro 7: P=1 e I=5 resulta em 15"
#         have: 15
#         want: 14
Failed 1/7 subtests
```

Como interpretar:

- `Failed test 1: "..."`: é a verificação número 1 e a frase entre aspas diz o que ela protege.
- `have`: o valor que o banco **realmente** devolveu.
- `want`: o valor que o teste **esperava**.
- No final, o resumo `Failed 1/7 subtests` diz quantas falharam.

Regra de ouro: se um teste de regressão falha, primeiro descubra por que o cálculo mudou. Só altere
o teste se a regra normativa (Metodologia SEI 024421455) tiver mudado de fato.


## 6. Os testes do banco (arquivos `000` a `073`)

`npm run test:db` roda, em ordem, os arquivos de `supabase/tests/`. Rode antes `npm run db:reset`,
porque vários testes usam a semente de demonstração.

| Arquivo | O que protege |
| --- | --- |
| `000_regressao_calculo` | O cálculo (Quadros 6, 7 e 8) continua igual: `P=1, I=5 -> 15`, `P=5, I=1 -> 11`, `10,2` é Alto, `17,1` é Extremo, controle sem evidência vira Fraco (0,90). |
| `010_esquema_unidades_perfis` | Colunas novas, os 16 tipos de unidade e os 10 perfis. |
| `015_sincronizar_estrutura` | A função do importador: atômica, nunca apaga, recusa mãe inexistente. |
| `016_vinculo_ct` | O vínculo da unidade com a Coordenação Territorial. |
| `020_semente` | A semente de demonstração (usuários, unidades reais, riscos). |
| `030_alcance` | As funções de alcance (quem vê o quê, quem valida, quem homologa). |
| `040_rls_leitura` / `041_rls_escrita` | A segurança por linha: leitura e escrita por perfil. |
| `050_fluxo` | O fluxo de 3 degraus, a trava, a reabertura (inclusive por categoria e objeto), a segregação "sobe um nível" (D1) e a exclusão de risco (D2). |
| `060_auditoria` | A trilha de auditoria (inclusive perfis/titularidade e DAR). |
| `070_fluxo_presidencia` | A Presidência: o GABIN valida e o Presidente homologa; recusa no envio quando não há homologador efetivo (inclusive na reabertura). |
| `071_objetos_regras` | Objeto só em unidade e processo ativos; supervisor preenchido pelo banco e propagado; RPC `reatribuir_objeto` (só CGOV, só unidade inativa). |
| `072_preliminar_cgov` | A CGOV grava controles, respostas, KRIs e medições e apaga o risco enquanto `preliminar_cgov`; perde isso ao ser assumido. |
| `073_dar_reavalia` | DAR alterada recalcula os aprovados da categoria; quem vira Crítico volta à homologação (`reaberto_mudanca_dar`); a CGOV devolve risco sem ator efetivo. |

Resultado esperado: `All tests successful` e `Result: PASS`.

## 7. Atualizar a estrutura a partir do SharePoint

A árvore de unidades (843) e a Cadeia de Valor (90 processos) vêm de duas listas do SharePoint.
Um retrato público delas fica versionado em `supabase/referencia/` (`20261115_estrutura.csv` e
`20261115_cadeia-valor.csv`). O `db:reset` já importa esse retrato.

Para importar uma exportação mais nova (a pasta `_temp/` não vai para o Git):

```bash
npm run sync:estrutura -- --pasta _temp/ --so-relatorio   # só mostra o relatório
npm run sync:estrutura -- --pasta _temp/                  # mostra e pergunta "Aplicar? (s/N)"
```

A opção `--sim` (usada pelo `db:reset`) grava **sem perguntar** e, por segurança, só é aceita no
banco **local** (127.0.0.1/localhost). Se `SUPABASE_URL` apontar para um banco remoto, o importador
recusa com uma mensagem `RADAR:`; para gravar sem perguntar num banco remoto é preciso acrescentar
`--permitir-remoto` de propósito.

O importador **nunca apaga**: unidade ou processo que sumiu da lista fica `ativa = false`
(a Política, art. 15, VI, manda guardar o histórico). A gravação é **atômica**: se algo estiver
errado, nada é gravado (é uma única chamada à função `sincronizar_estrutura`).

### O que fazer quando o importador reclama

- **Ciclo na árvore** (A é mãe de B e B é mãe de A): o importador **recusa** a importação e lista as
  unidades do laço. Corrija o campo `id_mae` na lista do SharePoint e exporte de novo.
- **Mãe inexistente** (o `id_mae` aponta para uma unidade que não está na lista): vira **aviso**; a
  unidade fica sob o "pai do grupo". Corrija o `id_mae` no SharePoint.
- **`id_mae` igual à própria unidade** (caso real da 22.0078): tratado como mãe inválida, com aviso,
  e não como ciclo, para não travar a importação inteira por um erro só.
- **Processo com várias unidades líderes**: o importador guarda a primeira e avisa. Hoje o modelo
  tem uma unidade líder por processo.

### Lacuna de dados do SharePoint (precisa de correção pela CGOV)

- Das **11 Coordenações Territoriais (CTs)**, só a **CT Curitiba** tem unidades vinculadas (73
  unidades: 45 UCs, 12 NGIs e 16 subunidades). Na lista, o vínculo com a CT existe apenas no texto da
  coluna `microgrupo` (ex.: "CT Curitiba"); o importador o grava em
  `unidades.coordenacao_territorial_id` (decisão R9, ver [[decisoes-tecnicas-b1]]).
- O `microgrupo` **"CT Cuiabá"** (42 unidades) **não tem CT correspondente** na lista de unidades.
- Consequência: para as outras 10 CTs, o alcance da CT fica só com a própria árvore e a validação
  das UCs sobe direto à Gerência Regional. Os avisos do importador (mãe inexistente, `id_mae` igual
  à própria unidade, processos com várias unidades líderes) listam o que a CGOV precisa corrigir.


## 8. Entrar no RADAR localmente (etapa B2)

O aplicativo tem **dois modos** (decisão B2-1, ver [[decisoes-tecnicas-b2]]):

- **Sem `.env`:** "Modo demonstração". Dados fictícios, sem login, com o simulador dos 10 perfis.
- **Com `.env`:** login real pelo Supabase local. O simulador some.

Para entrar de verdade com um usuário de demonstração (os 19 `@radar.test` criados pelo `db:reset`):

1. Ligue o banco: `npm run db:start` (e, se for testar convites, `npm run db:funcoes` em outro terminal).
2. Rode `npx supabase status` e copie dois valores: `API URL` (normalmente `http://127.0.0.1:54321`)
   e a chave `anon` (também chamada "publishable").
3. Copie `.env.example` para `.env` e preencha:

   ```text
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<a chave anon do passo 2>
   ```

   O próprio `.env.example` explica os dois modos. **Use só a chave `anon` (pública).** A
   `service_role` **nunca** vai para este arquivo nem para nada que comece com `VITE_`.
4. Rode `npm run dev` e abra o endereço mostrado. Você cai em `/entrar`.
5. Digite o e-mail de um usuário de demonstração (por exemplo `cgov@radar.test`) e clique em
   "Enviar link de acesso".
6. Abra o **Mailpit** em <http://127.0.0.1:54324>. É uma "caixa de entrada de mentira" que recebe todos
   os e-mails do Supabase local. Abra o e-mail "Seu link de acesso ao RADAR" e clique no botão. Você
   entra no RADAR com o perfil daquele usuário.

Se mudar o `.env`, pare e rode `npm run dev` de novo. O link vale 1 hora e só funciona uma vez.

Se você digitar um e-mail que **não** tem conta, a tela responde a mesma frase e **nenhum e-mail
chega** ao Mailpit (de propósito: ninguém descobre quem tem conta).

### A Edge Function `gerenciar-acesso`

É a "ponte" que deixa a CGOV criar contas e enviar convites **sem** colocar a chave `service_role` no
navegador. A tela "Usuários e perfis" (`/usuarios`, só CGOV) chama a função; a função confere se quem
chamou é CGOV e só então usa a chave secreta, que mora no servidor. Código em
`supabase/functions/gerenciar-acesso/` (regras de validação em `supabase/functions/_shared/`).

- Ações: `criar`, `enviar_link` e `listar_situacao`.
- **Só responde com `npm run db:funcoes` rodando em outro terminal** (decisão T3). Só com `db:start`, a
  tela de usuários recebe 404.
- Quem não é CGOV recebe 403 com mensagem `RADAR: ...`.
- Teste: `npm run test:integracao` (com `db:start` e `db:funcoes` ligados). Ele usa e-mails
  `@integracao.radar.test`, confere o recebimento pela API do Mailpit e recusa quem não é CGOV.
- Se você mudar `supabase/config.toml` ou o modelo de e-mail em `supabase/templates/`, faça
  `npm run db:stop` e `npm run db:start` (decisão T5).

## 9. Importar titulares e substitutos: `sync:atribuicoes`

> **ATENÇÃO — dados pessoais. Leia antes de rodar.**
>
> - O arquivo **real** (com nomes e e-mails de servidores) fica **somente** em `_temp/`, que o Git
>   ignora. **Nunca** o copie para outra pasta do repositório e **nunca** o commite.
> - O **relatório nunca é salvo** em arquivo: ele só aparece na tela. Mostra só e-mails, sem nomes.
> - A **matrícula nunca é guardada**: o importador ignora essas colunas.
> - O importador **nunca envia e-mail.** Ele cria as contas e os perfis; os convites são enviados
>   pela CGOV, na tela "Usuários e perfis" (decisão B2-3).
> - **Nenhum e-mail pode ser enviado a servidores do ICMBio antes da aprovação da CGTI.** Hoje todos
>   os e-mails vão só para o Mailpit local.

Comandos (`--arquivo` é obrigatório; não existe caminho padrão):

```bash
npm run sync:atribuicoes -- --arquivo _temp/<arquivo>.csv --so-relatorio   # só mostra o relatório
npm run sync:atribuicoes -- --arquivo _temp/<arquivo>.csv                  # mostra e pergunta "Aplicar? (s/N)"
```

Como no `sync:estrutura`, `--sim` grava sem perguntar e só vale para banco **local**; para um banco
remoto é preciso acrescentar `--permitir-remoto` de propósito. Peça sempre o `--so-relatorio` primeiro.

O que ele faz (resumo; a lista completa está em [[decisoes-tecnicas-b2]]):

- Define o perfil pelo **tipo da unidade** (B2-2). O titular recebe a chave de titular; o substituto
  entra como `gestor` (B2-5).
- Pessoa em várias unidades fica na de maior alcance (B2-4).
- Quem saiu da titularidade perde a chave e continua no sistema (B2-6); substituto em exercício é
  preservado (B2-9).
- Se o **e-mail do titular** da unidade estiver vazio ou inválido na planilha, **ninguém perde a chave
  ali** e o relatório mostra "Titular sem e-mail válido (chave atual mantida)" (P-B2-1).
- Perfil **suspenso** que tem a chave e não aparece na linha da unidade **também perde a chave**
  (P-B2-2); suspenso que aparece na lista só gera aviso.
- Rodar de novo é seguro: cada passo confere o estado antes de mudar.
- No relatório, leia com atenção "Unidades sem titular" e os avisos de tipo suspeito (por exemplo, a
  CT Cuiabá cadastrada como Coordenação-Geral).
