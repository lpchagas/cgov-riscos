# Design — Etapa B2: login por link de e-mail e perfis

> **Data:** 2026-11-15 · **Tamanho:** projeto (design completo) · **Etapa B:** B1 (banco, mesclada
> pelo PR #4) → **B2 (login e perfis)** → B3 (telas lendo do banco)
> **Regra de decisão:** [[matriz-acesso-responsabilidades]] (seções 5 e 7) · **Base técnica:**
> [[2026-11-15-etapa-b1-banco-rls-design]] (seções 3, 7 e 7.2) e [[decisoes-tecnicas-b1]]

## 1. Por que

A B1 construiu a tranca no banco: perfis, alcance, RLS e fluxo de 3 degraus, todos testados. Ainda
não existe porta. O app usa um **simulador** de 4 perfis, sem login, e o cliente do Supabase em
`src/services/supabase.ts` não é usado por nenhuma tela. A B2 cria essa porta:

- só entra quem a CGOV convidou, por um link enviado ao e-mail (sem senha);
- o app sabe **quem** entrou e **qual perfil** a pessoa tem (`meu_perfil()`) e mostra só o que a
  matriz de acesso libera;
- a CGOV cadastra, convida e ajusta pessoas por uma tela própria (decisão P6);
- os titulares de chefia, que decidem quem valida e homologa (spec B1, 7.1), vêm da lista oficial do
  SharePoint `ICMBIO_atribuicoes` por um importador que roda só na máquina da CGOV.

As telas de risco continuam com os dados de demonstração do navegador. Ler e gravar riscos no banco
é a **B3**.

## 2. Objetivos

1. **Entrar por link de e-mail**, só para quem já tem conta: tela `/entrar`, envio do link, retorno
   do link, sessão, renovação automática e **Sair**.
2. **Perfil no app**: depois do login, o app lê `meu_perfil()` e a unidade da pessoa. Conta sem
   perfil ou com perfil inativo vê só a página "Acesso não liberado".
3. **Menu e rotas por perfil** a partir de uma única tabela de acesso
   (`src/utils/acessoPorPerfil.ts`), a seção 7 da matriz transformada em código.
4. **Dois modos de funcionamento**: com Supabase configurado (`.env`), login real; sem ele, **modo
   demonstração** com simulador dos **10 perfis** (hoje são 4) e aviso visível.
5. **Tela "Usuários e perfis"** (só CGOV): listar, cadastrar e convidar; editar papel, unidade,
   `titular_chefia` e `ativo`; reenviar o link; ver a situação da conta.
6. **Edge Function local `gerenciar-acesso`**: cria a conta de login e envia o link. É a única peça
   que usa a chave secreta (`service_role`).
7. **Importador `npm run sync:atribuicoes`**: lê o CSV da lista de atribuições informado na hora,
   marca os titulares, cria contas e perfis e **não envia convites**.
8. **E-mails só pelo Mailpit local** (porta 54324), com modelos em português.
9. Telas novas na **varredura de acessibilidade**, com 0 violações.

## 3. Fora do escopo

- Telas de risco lendo e gravando no banco, `Skeleton` de carregamento e `TipoUnidade` com 16 valores
  (B3).
- Regras precisas "posso validar **este** risco?". Elas dependem do risco no banco, por exemplo da
  segregação D1, e entram na B3. Na B2 o front decide só pelo perfil (seção 8.4).
- Login gov.br ou conta institucional do ICMBio (CGTI, etapa D), envio de e-mail real e projeto na
  nuvem `cgov-riscos-v2.1`.
- Mudar alcance, RLS, fluxo ou cálculo da B1 (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`).
- Várias unidades por pessoa (decidido: continua "uma pessoa, uma unidade, um perfil").
- Leitura direta do SharePoint pelo Microsoft Graph (etapa D).

## 4. O que não pode acontecer (anti-objetivos)

- **Dado pessoal no repositório ou na nuvem.** O CSV real de atribuições fica em `_temp/` (no
  `.gitignore`) e só o importador o lê, na máquina da CGOV, em tempo de execução. Testes e fixtures
  usam só pessoas fictícias `@radar.test`. A matrícula SIAPE nunca é gravada.
- **Chave secreta no navegador.** A `service_role` existe só na Edge Function e no importador
  (Node). Nenhuma variável `VITE_*` a contém.
- **Cadastro livre.** Quem não tem conta não recebe link, e a resposta da tela não revela se o e-mail
  existe.
- **E-mail real.** Só Mailpit.
- **Confiar no menu como segurança.** Esconder uma tela é conforto. Quem barra de verdade é a RLS da
  B1.
- **Trancar a CGOV para fora.** A pessoa da CGOV não pode desativar a si mesma nem tirar o próprio
  papel `cgov` pela tela.
- **Migração nova.** A B2 não precisa de nenhuma (decisão do usuário: a situação do convite fica no
  Supabase Auth). Se o plano descobrir que precisa, para e pergunta.

## 5. Restrições

- Vue 3 + TypeScript + Pinia + vue-router 4 + `@supabase/supabase-js` 2 (já instalado) +
  `@govbr-ds/core` e componentes de `src/components/ui/`.
- Supabase local (CLI 2.122, Docker). A Edge Function roda no `edge_runtime` local, que já está
  ligado no `config.toml`.
- `npm run test:a11y` com 0 violações; telas novas entram em `tests/a11y/telas.ts`.
- Comentários e documentação didáticos em português do Brasil, porque o mantenedor é iniciante.
- Proibido usar a sigla "PGR" para o Plano de Gestão de Riscos.
- Verificação final: `npm test`, `npm run build`, `npm run test:a11y` (0 violações) e
  `npm run db:reset && npm run test:db`.
- Um único commit da etapa, só quando o usuário pedir, com a linha `Co-Authored-By`.

## 6. Abordagens consideradas

### 6.1 Como criar a conta e enviar o convite

| Abordagem | Como é | Por que sim / não |
|---|---|---|
| **Edge Function local `gerenciar-acesso`** (escolhida) | Função do próprio Supabase que recebe o login de quem chama, confere se é CGOV e usa a `service_role` para criar a conta e enviar o link. | Mantém a chave secreta fora do navegador, envia e-mail pelo Auth (Mailpit) e não precisa de migração. |
| Função SQL que escreve em `auth.users` | Função `SECURITY DEFINER` numa migração. | O Supabase não aceita esse uso, ela não envia e-mail e exigiria migração. Descartada. |
| Convite só pelo terminal | A CGOV roda um comando para cada pessoa. | Contraria o escopo, que pede uma tela da CGOV. Descartada. |

### 6.2 Situação do convite

| Abordagem | Escolha |
|---|---|
| **Metadados da conta no Supabase Auth** (`app_metadata.convite_enviado_em`; último acesso = `last_sign_in_at`, que o Auth já guarda) | **Escolhida pelo usuário.** Sem migração. |
| Colunas novas em `perfis_usuarios` (migração) | Descartada: copia um dado que o Auth já tem e exige migração. |

### 6.3 Onde mora a regra "quem vê qual tela"

Há um único caminho sensato: **uma tabela em código** (`src/utils/acessoPorPerfil.ts`), com funções
puras e testadas, lida pelo guarda das rotas, pelo menu, pelo simulador e pelos botões. A
alternativa, uma tabela de permissões no banco, exigiria migração e seria uma segunda fonte para a
mesma regra que a RLS já garante.

### 6.4 Sem Supabase configurado

**Escolhida pelo usuário: dois modos.** As alternativas eram "sempre exigir login" (a varredura de
acessibilidade passaria a depender do Docker e acabaria a apresentação offline) e "login real com
'ver como' da CGOV" (mistura perfil real e simulado).

## 7. Decisões do usuário (2026-11-15)

| # | Pergunta | Decisão |
|---|---|---|
| **B2-1** | O que fazer sem Supabase configurado? | **Dois modos.** Com `.env`: login real e simulador some. Sem `.env`: "Modo demonstração" com aviso e simulador dos 10 perfis; a varredura a11y roda nesse modo. |
| **B2-2** | Como o importador define o perfil? | **Pelo tipo da unidade** (tabela na seção 8.6). O relatório mostra tudo antes de gravar e a CGOV corrige pela tela. |
| **B2-3** | O que o importador faz com os convites? | **Cria contas e perfis, não envia.** A CGOV envia pela tela, por unidade ou em lote (permite piloto, por exemplo a GR5 e a CT Curitiba). |
| **B2-4** | Pessoa em mais de uma unidade na lista? | **Fica na de maior alcance**, e o relatório lista as outras e avisa quando uma unidade fica **sem titular** (ninguém valida os riscos dela). Regras da B1 inalteradas. |
| **B2-5** | O substituto é titular? | **Não.** Só o titular recebe `titular_chefia = true`. O substituto entra como `gestor` da unidade, e a CGOV liga a chave pela tela quando ele assume (fica na trilha). |
| **B2-6** | Titular mudou na nova carga? | Quem saiu **perde a chave e continua** com a conta e o perfil. O relatório mostra a mudança e a CGOV decide se desativa. Nada é apagado. |
| **B2-7** | Onde guardar a situação do convite? | **No Supabase Auth**, sem migração (6.2). |
| **B2-8** | Pessoa que **já tem perfil** e aparece na lista? | **Só se for titular** na lista e estiver lotada em outra unidade: o importador a **move** para a unidade da lista e ajusta o perfil pela regra (relatório: "mudou de unidade"). Se for só substituta, não mexe e avisa a divergência. **Nunca reativa** quem está suspenso; só avisa. Motivo: na B1, `e_titular_de` exige que o titular esteja lotado na unidade. |
| **B2-9** | Substituto em exercício (chave ligada pela CGOV) na próxima carga? | **Preserva e avisa.** O importador só tira a chave de quem **não aparece** na lista daquela unidade. O substituto listado e com a chave ligada continua titular e aparece no relatório em "substitutos em exercício". |

## 8. Como fica

As decisões marcadas **(minha)** foram tomadas por mim e podem ser corrigidas.

### 8.1 Configuração local do Supabase (`supabase/config.toml`; não é migração)

- `site_url = "http://localhost:5173"` e `additional_redirect_urls` com `localhost` e `127.0.0.1`
  nas portas 5173 (dev) e 5199 (varredura).
- `[auth] enable_signup = false` e `[auth.email] enable_signup = false`. O link só vai para contas
  existentes; as APIs de administrador (Edge Function e importador) continuam criando contas.
- `[auth.rate_limit] email_sent` mais alto no ambiente local (ex.: 100 por hora) para testar convites
  em lote. Vale só para o local; o valor de produção fica para a etapa D. **(minha)**
- Modelos de e-mail em português em `supabase/templates/` (link de acesso), ligados por
  `[auth.email.template.magic_link]`. Texto: "Seu link de acesso ao RADAR", validade e aviso "se não
  foi você, ignore". **(minha)**
- `otp_expiry = 3600` (1 hora) mantido.

### 8.2 Cliente e sessão (`src/services/supabase.ts`, `src/stores/authStore.ts`)

- O cliente continua opcional: existe só com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
  (chave **anon** pública). `isSupabaseConfigurado` decide o modo (B2-1).
- Fluxo PKCE do supabase-js. O link volta para `/entrar/retorno`, que troca o código pela sessão e
  segue para a rota pedida antes do login (ou o Painel). **(minha)**
- A `authStore` passa a ter:
  - `modo`: `'real' | 'demonstracao'`;
  - `sessao` (Supabase), `perfil` (linha de `meu_perfil()` + nome e sigla da unidade) e `situacao`:
    `'carregando' | 'anonimo' | 'sem_perfil' | 'inativo' | 'ativo' | 'erro'`;
  - `iniciar()`: lê a sessão guardada, escuta `onAuthStateChange` (login, renovação, saída em outra
    aba) e recarrega o perfil;
  - `enviarLink(email)`, `sair()`;
  - no modo demonstração, `alternarPerfilDemo(papel)` com os 10 perfis.
- Para separar "sem perfil" de "inativo", o app lê `meu_perfil()` (só traz perfil ativo) e, se vier
  vazio, a própria linha em `perfis_usuarios`. A RLS já deixa ler a própria linha mesmo inativa,
  justamente para isso (comentário na migração `20261115003`).
- O nome e o cargo mostrados no cabeçalho vêm do perfil (`nome_completo`, `cargo`, sigla da unidade).
- O tipo `PapelGovernanca` do front passa a ter os **10 valores** do banco (`lider_cg` vira
  `coordenador_geral`). Os dados de demonstração e o histórico local acompanham a troca.

### 8.3 Telas de acesso

| Rota | Quem abre | O que mostra |
|---|---|---|
| `/entrar` | público | Campo de e-mail e botão "Enviar link de acesso". Resposta **sempre igual**: "Se o e-mail estiver cadastrado, você receberá um link em instantes. Ele vale por 1 hora." No modo demonstração, a tela abre (para a varredura), mas o botão avisa que o login está desligado e leva ao Painel. |
| `/entrar/retorno` | público | "Conferindo seu link…" e, depois, segue adiante. Link vencido ou já usado: volta a `/entrar` com a mensagem "Este link expirou ou já foi usado. Peça um novo." |
| `/acesso-nao-liberado` | logado sem perfil ativo | "Sua conta ainda não tem acesso ao RADAR" (sem perfil) ou "Seu acesso está suspenso" (inativo), "Procure a CGOV: planejamento@icmbio.gov.br" e o botão **Sair**. |

Essas três telas não mostram o menu lateral. O cabeçalho continua, com o menu da conta reduzido a
Sair. **(minha)**

**Erros:** sem conexão com o Supabase, aparece uma mensagem com "Tentar de novo" (componente
`BrMessage`). Sessão vencida que não renova leva a `/entrar` com "Sua sessão terminou. Entre de novo."

### 8.4 Tabela de acesso (`src/utils/acessoPorPerfil.ts`)

É a tabela da seção 7 da matriz transformada em funções puras:

- `rotasPermitidas(papel)` / `podeAbrirRota(papel, nomeRota)`: todas as telas para os 10 perfis,
  **exceto** "Importar riscos" e "Usuários e perfis", que são só da CGOV (as colunas "—" da matriz).
- `capacidades(papel)`, usada pelos botões que hoje leem `podeAprovarCg`, `podeHomologarDiretoria` e
  `isCgov`:
  - `podeValidar`: `coordenador_territorial`, `gerente_regional`, `coordenador_geral`, `diretor`,
    `presidencia` (os perfis que validam pela chefia imediata, spec B1 7.1);
  - `podeHomologar`: `gerente_regional`, `diretor`, `presidencia`;
  - **Fonte destes dois itens: a spec B1, seção 7.1, que o banco já aplica**, e não a tabela
    resumida da seção 7 da matriz. A matriz diz que o Diretor só homologa e a Presidência só vê. A
    7.1 diz que o Diretor valida os Centros e as Coordenações-Gerais e que a Presidência valida e
    homologa as unidades ligadas a ela. A diferença entra na pendência 7 da B1 ("alinhar a matriz").
    Os testes de `acessoPorPerfil` conferem as rotas contra a seção 7 da matriz e as capacidades de
    validar e homologar contra a 7.1. **(minha)**
  - **Ressalva:** o titular de uma UC também valida a Base Avançada dela (spec B1 7.1), mas tem
    perfil `gestor`. Esse caso só aparece na B3, quando a decisão vier do banco risco a risco.
  - `editaDar`, `editaCatalogoObjetos`, `importa`, `gerenciaUsuarios`: só `cgov`;
  - `somenteLeitura` fora da própria unidade: `auditoria`.
- **Mudança de comportamento:** hoje, no simulador, a CGOV valida e homologa. Pela matriz (seção 7,
  "Aprovações": V\* para a CGOV), ela só vê. A B2 segue a matriz. **(minha)**
- Na B2, esses botões continuam atuando sobre os dados de demonstração. A decisão "esta pessoa pode
  validar **este** risco" vem do banco na B3.

### 8.5 Menu e guarda das rotas

- Cada rota ganha `meta.publica` (telas da 8.3) ou é protegida. A permissão por perfil vem de
  `acessoPorPerfil.ts`, e não de uma lista repetida em cada rota. **(minha)**
- Guarda global (`router.beforeEach`):
  1. modo demonstração: aplica `podeAbrirRota` ao perfil simulado;
  2. modo real: espera `iniciar()` terminar; anônimo → `/entrar?volta=<rota>`; sem perfil ou inativo
     → `/acesso-nao-liberado`; rota não permitida → Painel com aviso (toast) "Esta tela é exclusiva da
     CGOV".
- O `BrMenu` mostra só os itens permitidos. Novo item **Usuários e perfis** no grupo "Ferramentas"
  (só CGOV).
- Menu da conta (`BrHeader`): nome, cargo e unidade do perfil; **Sair** no modo real; simulador de
  perfis só no modo demonstração. O seletor de perfil do Painel também só existe no modo
  demonstração.
- Faixa fixa "Modo demonstração: dados fictícios, sem login" no topo, no modo demonstração.

### 8.6 Tela "Usuários e perfis" (`/usuarios`, só CGOV)

Rascunho em texto:

```text
Usuários e perfis                                      [+ Cadastrar pessoa]
Quem acessa o RADAR, com qual perfil e em qual unidade. (Decisão P6)

[Buscar nome ou e-mail]  [Unidade ▾]  [Perfil ▾]  [Situação ▾]   [Enviar convites (12)]

Nome            E-mail              Unidade        Perfil            Titular  Situação           Ações
Ana Exemplo     ana@radar.test      GR5            gerente_regional  sim      Entrou em 14/11    [Editar]
Beto Exemplo    beto@radar.test     CT Curitiba    coord. territ.    sim      Convite pendente   [Editar] [Enviar link]
Caio Exemplo    caio@radar.test     FLONA Caçador  gestor            não      Suspenso           [Editar]
```

- **Lista** (`DataTable`, modo cartão abaixo de 768 px): lê `perfis_usuarios` + `unidades` pela RLS
  (a CGOV lê todos) e a situação da conta pela Edge Function (`listar-situacao`). Filtros na URL, como
  em `/riscos`.
- **Situações:** "Convite pendente" (conta criada, link nunca enviado), "Convite enviado em dd/mm"
  (enviado, nunca entrou), "Entrou em dd/mm", "Suspenso" (`ativo = false`).
- **Cadastrar pessoa** (`SideSheet`): nome, e-mail, unidade (busca entre as unidades ativas), perfil
  (já sugerido pelo tipo da unidade, como no importador), titular sim/não, cargo (opcional) e
  "Enviar o link agora" (marcado por padrão). Chama `gerenciar-acesso` → `criar`.
- **Editar** (`SideSheet`): papel, unidade, `titular_chefia`, `ativo` e cargo. Grava **direto pela
  RLS** com o login da CGOV; a trilha de auditoria da B1 registra quem mudou. Ao ligar "titular",
  o formulário sugere o perfil do tipo da unidade (ex.: substituto da GR passa a `gerente_regional`),
  sem forçar. O e-mail não é editável na B2. **(minha)**
- **Enviar link / Enviar convites (lote)**: chama `gerenciar-acesso` → `enviar_link` para uma pessoa
  ou para as filtradas que estão "Convite pendente", com confirmação (`Dialog`) mostrando quantas
  pessoas.
- **Trava contra autobloqueio:** na própria linha, `ativo` e `papel` ficam desabilitados, com a
  explicação.
- **Aviso de titular duplicado:** ao ligar `titular_chefia` numa unidade que já tem titular ativo, o
  formulário avisa e oferece desligar o anterior. **(minha)**
- **Modo demonstração:** a tela abre com os 10 perfis simulados, só para leitura, e as ações avisam
  "Indisponível no modo demonstração". Isso permite a varredura de acessibilidade.

### 8.7 Edge Function `gerenciar-acesso` (`supabase/functions/gerenciar-acesso/`)

- Recebe o `Authorization` de quem chamou, cria um cliente **com o login dessa pessoa** e confere
  `meu_perfil().papel_governanca = 'cgov'`. Se não for CGOV: resposta 403 com mensagem `RADAR:`.
- Ações:
  - `criar { nome, email, unidade_id, papel, titular, cargo?, enviar_link }`: valida os campos,
    cria a conta com a `service_role` (`email_confirm: true`, para o link seguinte ser de acesso e não
    de confirmação), grava o perfil **com o cliente da CGOV** (assim passa pela RLS e a trilha
    registra a CGOV como autora) e, se pedido, envia o link. Se o perfil falhar, apaga a conta recém-
    criada (sem conta órfã). E-mail já existente: 409 "Já existe uma conta com este e-mail".
  - `enviar_link { ids[] }`: para cada conta, envia o link de acesso e grava
    `app_metadata.convite_enviado_em`. Devolve quantos foram enviados e quais falharam.
  - `listar_situacao { ids[] }`: devolve `convite_enviado_em` e `last_sign_in_at` de cada conta.
- Código pequeno e comentado. As validações (e-mail, papel válido) ficam num módulo TypeScript puro
  testado pelo Vitest, que a função importa. **(minha)**
- `npm run db:start` já serve a função. Se a CLI exigir `supabase functions serve`, o plano
  acrescenta o comando ao `package.json` e ao [[guia-supabase-local]].

### 8.8 Importador de atribuições (`npm run sync:atribuicoes`, `scripts/sync-atribuicoes/`)

**Uso:**

```bash
npm run sync:atribuicoes -- --arquivo _temp/<arquivo>.csv --so-relatorio   # só mostra
npm run sync:atribuicoes -- --arquivo _temp/<arquivo>.csv                  # mostra e pergunta "Aplicar? (s/N)"
```

- `--arquivo` é obrigatório: não há caminho padrão nem procura em pastas. `--sim` (sem perguntar) só
  vale para banco **local**, com a mesma proteção do `sync:estrutura` (`destino.ts`). Reaproveita o
  leitor `lerListaSharepoint.ts`.
- **Colunas** (aceita o nome exibido **ou** o interno, porque a exportação pode trazer qualquer um):

  | Dado | Exibido | Interno | Uso |
  |---|---|---|---|
  | Unidade | `uorg_nome` | `ourg_nome` | comparado com `unidades.nome` (os 844 nomes do retrato são únicos) |
  | Nome do titular | `titular` | `pessoa` | `nome_completo` |
  | E-mail do titular | `titular_email` | `titular_email` | conta e `email` |
  | Nome do substituto | `substituto` | `substituto` | `nome_completo` |
  | E-mail do substituto | `substituto_email` | `substituto_email` | conta e `email` |
  | Matrículas | `titular_mat`, `substituto_mat` | `matricula`, `substituto_matricula` | **ignoradas, nunca gravadas** |
  | Outras | `Título`, `Content Type`, `Attachments` | `Title`, `ContentType`, `Attachments` | ignoradas |

- **Leitura:** cada linha vira até duas pessoas (titular e substituto). Linhas sem nenhuma das duas
  são ignoradas. E-mail em minúsculas e sem espaços. Pessoa sem e-mail ou com e-mail inválido → aviso
  no relatório e não entra. Unidade não encontrada ou inativa → aviso e não entra.
- **Perfil pelo tipo da unidade (B2-2):**

  | Unidade (tipo no banco, ou a unidade específica) | Perfil |
  |---|---|
  | `presidencia`; Assessoria da Presidência (10.0001) | `presidencia` |
  | `diretoria` | `diretor` |
  | `gerencia-regional` | `gerente_regional` |
  | `coordenacao-territorial` | `coordenador_territorial` |
  | `coordenacao-geral`, exceto a CGGE (10.0007) | `coordenador_geral` |
  | CGGE (10.0007) | `cgge` |
  | CGOV (10.0008) | `cgov` |
  | `gabinete` | `gabin` |
  | AUDIT (10.0034) | `auditoria` |
  | todas as demais (UC, NGI, Centros, Coordenações, Divisões, PFE, CORR, OUV…) | `gestor` |

  As unidades específicas são localizadas pelo `icmbio_id`, não pela sigla (decisão R3).
  O **substituto** recebe sempre `gestor` (B2-5).
- **Pessoa em várias unidades (B2-4):** vale, nesta ordem: (1) onde é titular, antes de onde é
  substituta; (2) o perfil de maior alcance (`presidencia` > `diretor` > `gabin`/`cgge`/`cgov`/
  `auditoria` > `gerente_regional` > `coordenador_geral` > `coordenador_territorial` > `gestor`);
  (3) a unidade mais alta na árvore; (4) o menor `icmbio_id`. **(minha, a ordem)**
- **Pessoa nova** (e-mail sem conta): cria a conta (`service_role`, `email_confirm: true`, sem enviar
  nada) e o perfil (`ativo = true`, papel e unidade pela regra, `titular_chefia` só se titular). Fica
  "Convite pendente" (B2-3).
- **Pessoa que já tem perfil (B2-8):**
  - titular na lista e lotada em outra unidade → muda para a unidade da lista, perfil pela regra,
    chave ligada; o relatório mostra "mudou de unidade (de → para)";
  - titular na lista e já lotada nela → só liga a chave, se estiver desligada. O papel não é
    reescrito, para preservar as correções feitas pela tela, e uma diferença em relação à regra vira
    aviso;
  - substituta na lista → nada muda; se estiver lotada em outra unidade, vira aviso;
  - perfil suspenso (`ativo = false`) → nada muda e vira aviso ("na lista, mas suspenso").
- **Titulares (B2-6 e B2-9):** em cada unidade da lista, perde a chave quem a tem e **não aparece**
  na linha daquela unidade (nem como titular nem como substituto). Continua no sistema. O substituto
  listado com a chave ligada (em exercício) é **preservado** e aparece no relatório.
  > **Atualização de 2026-11-15 (decisões P-B2-1 e P-B2-2, ver [[decisoes-tecnicas-b2]] §4.2):**
  > (a) se o titular da linha estiver sem e-mail válido (inclusive linha só com substituto), ninguém
  > perde a chave naquela unidade e sai o aviso "titular sem e-mail válido: chave atual mantida";
  > (b) perfil suspenso que tem a chave e **não** aparece na linha da unidade também perde a chave
  > (o suspenso que aparece na lista continua sem mudança, B2-8).
- **Pessoas que não estão na lista** (por exemplo, analistas da CGOV cadastrados à mão): o importador
  não toca nelas, exceto para tirar a chave de titular de uma unidade cuja lista indica outra pessoa.
- **Gravação:** usa o cliente `service_role`. Como `auth.uid()` fica nulo, a trilha registra
  `usuario_id` nulo, o que a migração `20261115005` já prevê para o administrador. O relatório diz isso. **(minha)**
  Se uma conta falhar no meio, o importador para e informa o que já foi gravado. Rodar de novo é
  seguro, porque cada passo confere o estado antes de mudar (é idempotente).
- **Relatório** (antes de gravar e no fim): contas novas; perfis que ganham ou perdem a chave de
  titular; quem mudou de unidade; substitutos em exercício; divergências e suspensos; pessoas em várias unidades (onde ficaram e quais ignoradas); **unidades da lista sem
  titular**; linhas ignoradas e o motivo; contagem por perfil. O relatório mostra só o e-mail, sem
  nome, e nunca é gravado em arquivo. **(minha)**
- **Testes:** fixture fictícia `tests/unit/fixtures/sharepoint/atribuicoes.csv`, com as unidades da
  fixture `estrutura.csv` e pessoas `@radar.test`. Os casos cobrem cabeçalho exibido e interno, linha
  vazia, substituto sem titular, pessoa em duas unidades, e-mail inválido, unidade inexistente, troca
  de titular, titular já cadastrado em outra unidade, substituto em exercício preservado e perfil
  suspenso. A lógica de planejamento (o que muda) é pura e testada sem banco, como no
  `sync:estrutura`.

### 8.9 Usuários de demonstração e varredura

- A semente da B1 já tem 19 usuários `@radar.test` em `auth.users`. Para entrar como um deles no
  modo real: `/entrar` → e-mail → Mailpit (`http://127.0.0.1:54324`) → link. O guia explica.
- Simulador do modo demonstração: um perfil fictício por papel (10), com nomes genéricos como hoje.
- Varredura de acessibilidade (modo demonstração): acrescenta `/entrar`, `/acesso-nao-liberado` (em
  demonstração, abre com um parâmetro de exemplo) e `/usuarios` (como CGOV). Também confere que o
  menu de um `gestor` não mostra "Importar riscos" nem "Usuários e perfis". **(minha)**

### 8.10 Testes

- **Vitest:** `acessoPorPerfil` (10 perfis × rotas e capacidades, conferidos contra a seção 7 da
  matriz), guarda das rotas nos dois modos (cliente Supabase simulado), `authStore` (situações),
  telas `/entrar`, `/acesso-nao-liberado` e `/usuarios`, validações da Edge Function e importador
  (fixture).
- **Integração com o Supabase local** (`npm run test:integracao`, novo, exige `db:start`): a Edge
  Function recusa quem não é CGOV, cria conta e perfil, e o link chega ao Mailpit (pela API do
  Mailpit); o login só funciona para conta existente; o importador aplica a fixture no banco local e,
  rodado de novo, não muda nada. Entra na lista de verificação final. **(minha)**
- `npm run test:db` continua igual (nenhuma migração nova).

### 8.11 Documentação

- [[guia-supabase-local]]: como entrar com um usuário de demonstração pelo Mailpit, a Edge Function e
  o `sync:atribuicoes` (com o aviso sobre dados pessoais).
- [[decisoes-tecnicas-b1]] ganha um irmão: `decisoes-tecnicas-b2.md` (decisões B2-1 a B2-9 e as
  **(minha)** que forem confirmadas ou mudadas na execução).
- Caderno de aprendizado: Aula 5, "Login, sessão e guardas de rota" (o que é um link mágico, o que é
  sessão e por que o menu não é segurança).
- [[ESTADO-ATUAL]] e [[MOC-Radar]] atualizados no fim.

## 9. Deixado para quem implementar

- Divisão em tarefas, ordem e nomes de arquivos internos (exceto os citados acima).
- Visual exato das telas, dentro do design system (`docs/04-ux/design-system.md`) e dos componentes de
  `src/components/ui/`.
- Como simular o cliente Supabase nos testes do Vitest.
- Textos curtos de interface que não estão aqui, seguindo o glossário de microcopy.

## 10. Pendências da B1 (seção 4.1 de [[decisoes-tecnicas-b1]])

A B2 **não resolve** nenhuma das 8 regras de negócio pendentes. Elas continuam abertas e são
relevantes para a B3:

1. Quem valida os riscos da Presidência.
2. CGOV cria objeto em unidade inativa.
3. Visão por processo ignora `processos_cadeia_valor.ativo`.
4. `chefia_imediata` não confere a GR da CT.
5. CGOV e risco `preliminar_cgov` (controles, respostas, KRIs, exclusão).
6. `macroprocesso_supervisor_id` livre.
7. Alinhar a matriz de acesso com D3 e também com a spec B1 7.1 sobre quem valida e homologa
   (Diretor valida Centros e CGs; Presidência valida e homologa as unidades ligadas a ela). Ver 8.4.
8. DAR mudada não reavalia riscos aprovados.

**Toca a B2 indiretamente:** o importador e a tela podem deixar unidades **sem titular**. Nesses
casos, `enviar_para_validacao` funciona, mas ninguém consegue validar. O relatório do importador
expõe esses casos para a CGOV.
