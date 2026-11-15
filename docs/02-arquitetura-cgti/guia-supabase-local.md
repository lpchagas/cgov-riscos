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


## 6. Os testes do banco (arquivos `000` a `060`)

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
