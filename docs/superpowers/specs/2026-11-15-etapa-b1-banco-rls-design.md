# Design — Etapa B1: banco com unidades, perfis, alcance e RLS

> **Data:** 2026-11-15 · **Tamanho:** projeto (design completo) · **Etapa B:** B1 (banco) → B2 (login
> e perfis) → B3 (telas lendo do banco)
> **Regra de decisão:** [[matriz-acesso-responsabilidades]] (decisões P1 a P8) · **Cálculo:**
> [[matriz-regras-regime-b]]

## 1. Por que

O RADAR vai receber **pessoas reais com login**. Cada uma pode ver e fazer só o que a matriz de acesso
permite. Quem garante isso é o **banco**, com segurança por linha (RLS), e não o menu: quem chamar o
banco direto, sem passar pelas telas, também tem de ser barrado. O B1 constrói essa tranca e prova,
com testes, que ela funciona. Só depois disso o login (B2) e as telas (B3) são ligados.

## 2. Objetivos

1. **Árvore de unidades** do Regimento Interno no banco, com todos os tipos de unidade da matriz
   (seção 8.1).
2. **10 perfis** da matriz (seção 5) em `perfis_usuarios`, ligados à conta de login do Supabase
   (`auth.users`).
3. **Função de alcance** única, usada pela RLS de todas as tabelas de risco (matriz, seções 4 e 8).
4. **RLS completa:** leitura por alcance, escrita só na própria unidade, AUDIT só lê.
5. **Fluxo de 3 degraus no banco:** enviar para validação, validar (chefia imediata), homologar
   (Gerente Regional na rede descentralizada; Diretor na Sede) e devolver. Tudo com registro em
   `historico_fluxo`.
6. **Dados de demonstração (semente):** uma fatia da árvore real e um usuário fictício por perfil,
   suficientes para os "Exemplos práticos" da matriz.
7. **Testes automáticos** que provam, perfil por perfil, o que cada um **consegue** e o que **não
   consegue** ler e gravar. Comando: `npm run test:db`.
8. **Ambiente local:** Supabase rodando no computador (Docker + Supabase CLI), recriado do zero
   com um comando.

## 3. Fora do escopo (fica para B2 e B3)

- Tela de login, envio do link por e-mail, menu e rotas por perfil (B2).
- Tela de cadastro de usuários pela CGOV (B2). No B1, os usuários de demonstração vêm da semente.
- Trocar a `riscosStore` para ler do banco, com Skeleton e mensagens de erro (B3).
- O projeto na nuvem `cgov-riscos-v2.1`: **não é tocado no B1**. Zerá-lo ou substituí-lo é uma
  decisão separada, com autorização própria.
- Dados reais de **risco** e dados **pessoais** (lista de atribuições), que só entram depois da confirmação da CGTI. A árvore de unidades e a Cadeia de Valor, que são públicas, entram já no B1 (seção 7.2).

## 4. O que não pode acontecer (anti-objetivos)

- **Mudar o cálculo.** A matriz do Quadro 7, as faixas do Quadro 8, o Quadro 6 e a trava de
  evidência (`calcular_nivel_inerente_q7`, `classificar_nivel_q8`, `trigger_calcular_risco_radar`)
  ficam **intactos**. Os testes de B1 conferem que os valores continuam iguais aos de
  [[matriz-regras-regime-b]].
- **Tranca só no menu.** Nenhuma regra de acesso pode depender só do aplicativo.
- **Chefia reescrevendo a 1ª linha.** Quem está acima lê, valida ou homologa, mas não edita a
  ficha de outra unidade (Metodologia 4.6).
- **Repetir os avisos de segurança** encontrados no projeto antigo: funções `SECURITY DEFINER` sem
  `search_path` fixo, ou executáveis por quem não está logado (`anon`).
- **Dados reais.** Só dados de demonstração e usuários fictícios.
- **O app quebrar sem `.env`.** O modo demonstração em memória continua igual (o B1 não mexe no
  front-end).

## 5. Restrições

- Regra do projeto: antes de criar cada migração, consultar [[matriz-regras-regime-b]] e **avisar o
  usuário** do que a migração faz.
- As migrações `20261109001` e `20261109002` **não são reescritas**. Tudo entra em migrações novas
  (`20261115...`), que preservam o histórico.
- O código SQL tem comentários didáticos em português do Brasil, como o resto do projeto.
- A base normativa dos fluxos são as **minutas** da Política e da Metodologia. Quando forem
  publicadas, haverá uma revisão sistêmica.
- Commit só quando o usuário pedir, terminando com a linha `Co-Authored-By`.
- Antes de dizer que terminou: `npm test`, `npm run build`, `npm run test:a11y` (0 violações) e
  `npm run test:db`.

## 6. Abordagens consideradas (onde o banco roda e onde a RLS é testada)

| Abordagem | Vantagem | Custo | Decisão |
|---|---|---|---|
| **Supabase local com Docker + CLI** | Supabase completo no computador (banco, login, caixa de e-mail de teste). Recria tudo do zero com um comando. Testes com pgTAP (`supabase test db`), padrão que a CGTI reconhece. Não depende da nuvem | Instalar o Docker Desktop no Windows (com integração ao WSL; ~2 GB; pode exigir administrador) | **Escolhida pelo usuário** |
| Projeto na nuvem (`cgov-riscos-v2.1`) | Nada a instalar | Depende de internet. O plano gratuito pausa. Os testes ficam na nuvem e a senha do banco precisa ir no `.env` | Descartada |
| PostgreSQL embutido nos testes (PGlite) | Rápido, sem instalação | Não tem login nem os papéis do Supabase; seria preciso imitá-los. Risco de passar no teste e falhar no Supabase real | Descartada |

## 7. Decisões já tomadas pelo usuário

- **Login (B2):** link por e-mail, só para convidados. No B1, isso significa que todo usuário existe
  em `auth.users` e tem uma linha em `perfis_usuarios`. Quem tiver conta sem perfil **não vê nada**.
- **Ordem:** B1 → B2 → B3.
- **Ambiente:** Supabase local com Docker.
- **Acesso e fluxo:** decisões P1 a P8 da matriz (seção 9 dela). Em resumo:
  - leem tudo: `diretor`, `presidencia`, `auditoria` (só leitura), `cgov`, `cgge`, `gabin`;
  - `coordenador_geral`: própria árvore + visão por processo (`objetos_contexto.macroprocesso_supervisor_id`);
  - `gerente_regional` e `coordenador_territorial`: própria unidade + descendentes;
  - `gestor`: própria unidade + subunidades internas;
  - escrita: só na própria unidade;
  - valida a chefia imediata; homologa o Gerente Regional (rede descentralizada) ou o Diretor (Sede).

### 7.1 Decisões tomadas após a revisão do design (2026-11-15)

**Decididas pelo usuário:**
- **Quem valida:** só o **titular da unidade-mãe** imediata, ou seja, o chefe nomeado ou o substituto
  em exercício. Não basta estar lotado nela. Vale para todos os casos: a Divisão é validada pelo
  titular da Coordenação; a Base Avançada, pelo chefe da UC; o Centro, pelo Diretor da DIBIO; a COAGR
  e a CT, pelo GR; a UC sem CT, pelo GR; a CGOV, pelo titular da CGGE.
- **Quem homologa os riscos críticos:**
  - na rede descentralizada, o titular da **GR**;
  - nas unidades da Sede abaixo de uma Diretoria, o **Diretor**;
  - nas unidades ligadas diretamente à Presidência (GABIN, AUDIT, PFE, CORR, OUV, SECET, CGGE/CGOV,
    CGCS, Assessoria), o **Presidente** (titular da Presidência).
- **Riscos preliminares da CGOV:** a CGOV pode criar objetos e riscos com `status_fluxo =
  'preliminar_cgov'` em **qualquer** unidade e editá-los enquanto estiverem nesse estado. Quando o
  titular ou um gestor da unidade **assume** o risco, ele vira `rascunho` da unidade e a CGOV deixa de
  poder editá-lo. Isso preserva o mérito da 1ª linha (Metodologia 4.6).
- **Edição:** a ficha (`riscos`, `controles_existentes`, `respostas_tratamento`, `indicadores_kri`)
  fica **travada** em `em_validacao_cg` e `em_homologacao_dir`. Depois de `aprovado`, alterar
  probabilidade, impacto, controles, tratamento ou a definição dos KRIs **reabre** o fluxo: o risco
  volta a `em_validacao_cg`, como a store já faz em `reavaliarPontuacaoRiscoAprovado`. Registrar
  `medicoes_kri` e atualizar `respostas_tratamento.status_execucao` continua livre em qualquer
  estado.

**Decididas por mim (podem ser corrigidas):**
- **Mesma pessoa valida e homologa** (UC sem CT, em que o GR valida e homologa; risco de uma CG,
  validado e homologado pelo Diretor): a validação já leva a `aprovado`, e o `historico_fluxo`
  registra "validado e homologado pela mesma chefia". A pessoa não precisa agir duas vezes.
- **O que exige homologação:** `is_critico = true` **ou** `status_critico = 'pendente_dar'`. É a
  opção prudente: enquanto a DAR não estiver formalizada, o risco sobe para o 3º degrau.
- **Trilha de auditoria entra no B1:** `auditoria_log` ganha a coluna `objeto_id` (preenchida pelos
  gatilhos), RLS ligada e leitura pelo mesmo alcance do objeto. Ganha também gatilhos de
  INSERT/UPDATE/DELETE em `objetos_contexto`, `riscos`, `controles_existentes`,
  `respostas_tratamento`, `indicadores_kri` e `medicoes_kri`. A tela Auditoria (B3) depende disso.
- **Branch:** o B1 parte do branch `docs/matriz-acesso` (PR #3), que contém a matriz. Se o PR #3 for
  mesclado antes, o B1 é rebaseado na `main`.

### 7.2 Listas do SharePoint do ICMBio como fonte da estrutura (2026-11-15)

O ICMBio mantém, na intranet, listas do SharePoint atualizadas sempre que mudam a estrutura, a
Cadeia de Valor ou o Regimento (links em `_temp/listas-sharepoint-icmbio.md`). A CGOV exporta essas
listas em CSV, com o esquema na primeira linha.

| Lista | Conteúdo | Uso no RADAR |
|---|---|---|
| `ICMBIO_estrutura` | 844 unidades (839 ativas): `icmbio_id`, `id_mae`, `tipo`, `hierarquia`, `sigla`, nomes, `status`, `macrogrupo`/`mesogrupo`/`microgrupo` (GR e CT de vínculo) | árvore de unidades (B1) |
| `ICMBIO_cadeiavalor` | 90 processos: `proc_id`, `macro_id`, unidade líder (`icmbio_id`), `supervisor`, `orientador`, situação | catálogo de processos e visão por processo dos CGs (B1) |
| `ICMBIO_atribuicoes` | titular e substituto de 598 unidades, com nome, e-mail e matrícula SIAPE | titulares e convites do login (**B2**) |
| `ICMBIO_regimento` | 1.815 competências e incumbências por unidade | consulta futura (fora do B1) |

**Decididas pelo usuário:**
- **Importador a partir do CSV.** O comando `npm run sync:estrutura` lê as listas `estrutura` e
  `cadeia-valor` e atualiza o banco pela chave natural (`icmbio_id` e `proc_id`), sem apagar o
  histórico. A CGOV roda de novo sempre que o SharePoint mudar.
- **Atualização:** exportar o CSV e rodar o importador. Antes de aplicar, o importador mostra o que
  muda (unidades novas, renomeadas, que mudaram de mãe e desativadas) e só aplica com confirmação.
  A leitura direta do SharePoint (Microsoft Graph) fica para a homologação com a CGTI (etapa D).
- **Unidade inativa:** marcada como `ativa = false`. Sai das listas de escolha, mas os riscos e o
  histórico continuam visíveis no alcance de quem já via (Política, art. 15, VI). A CGOV reatribui
  depois, se for o caso.
- **Atribuições (dados pessoais):** **não entram no B1** e **nunca** vão para o repositório. No B2, o
  importador as lê da pasta local para marcar titulares e gerar convites. Nada pessoal vai para a
  nuvem antes do aval da CGTI. A pasta `_temp/` está no `.gitignore`.

**Decididas por mim (podem ser corrigidas):**
- **Retrato versionado das listas públicas.** `estrutura` e `cadeia-valor` não têm dados pessoais (a
  estrutura organizacional é pública no SIORG). Para que qualquer pessoa, inclusive a CGTI, recrie o
  banco e rode os testes sem acesso ao SharePoint, o repositório guarda uma cópia **só com as colunas
  usadas** em `supabase/referencia/` (CSV, com data no nome). O importador lê dessa pasta por padrão
  e aceita outra pasta como parâmetro, por exemplo `_temp/`.
- **Limpeza dos dados da lista:**
  - **Unidades sem tipo:** as 216 recebem o tipo pela posição na árvore e pela sigla, conforme uma
    tabela de correspondência no próprio importador.
  - **Comitê Gestor:** é um colegiado, não uma unidade, e fica de fora.
  - **Unidades com mãe inexistente:** as 2 entram com o pai do grupo (`mesogrupo`/`microgrupo`) e
    são listadas no relatório do importador.
  - **Tipos da lista:** cada tipo é convertido para o `unidades.tipo` do RADAR, por exemplo
    "Núcleo de Gestão Integrada" → `ngi` e "Assesoria da Presidência" → `orgao-assistencia`.
- **Semente (`db:reset`):** aplica as migrações, roda o importador com o retrato versionado e, por
  fim, a semente de demonstração (usuários fictícios em unidades **reais**, objetos e riscos de
  demonstração). Isso substitui a "fatia escrita à mão" da seção 8.3.

## 8. Como fica (decisões tomadas por mim, que podem ser corrigidas)

### 8.1 Migrações novas

1. **`..._unidades_e_perfis.sql`**
   - `unidades.tipo` passa a aceitar também: `coordenacao-territorial`, `coordenacao-assessoramento`,
     `orgao-assistencia` (PFE, CORR, AUDIT, OUV, SECET, Assessoria), `divisao`, `servico`, `setor`,
     `base-avancada`, `gabinete`.
   - `perfis_usuarios.papel_governanca` passa para os 10 perfis: `gestor`, `coordenador_territorial`,
     `gerente_regional`, `coordenador_geral`, `diretor`, `presidencia`, `auditoria`, `cgov`, `cgge`,
     `gabin`. Os valores antigos são convertidos assim: `lider_cg` → `coordenador_geral`; os outros
     mantêm o nome.
   - `perfis_usuarios.id` passa a referenciar `auth.users(id)` (com `ON DELETE CASCADE`), e ganha
     as colunas `ativo BOOLEAN NOT NULL DEFAULT true` (perfil inativo não vê nada) e
     `titular_chefia BOOLEAN NOT NULL DEFAULT false` (chefe nomeado ou substituto em exercício;
     usada na validação e na homologação, seção 7.1).
   - `unidades` ganha `icmbio_id TEXT UNIQUE` (chave do SharePoint), `hierarquia TEXT`,
     `sigla` deixa de ser obrigatória e única (há unidades sem sigla e siglas repetidas na lista;
     a unicidade passa para `icmbio_id`), `nome_completo`, `grupo_regional` (GR de vínculo) e
     `atualizado_em`.
   - Tabela nova `processos_cadeia_valor` (`proc_id` único, nome, `macro_id`, macroprocesso, tipo,
     `unidade_lider_id`, `unidade_supervisora_id`, `ativo`). `objetos_contexto` ganha
     `processo_id` opcional, e `macroprocesso_supervisor_id` passa a ser preenchido a partir do
     supervisor do processo.
   - Índices em `unidades(unidade_pai_id)` e `objetos_contexto(unidade_id)`.
2. **`..._funcoes_alcance.sql`** (todas `SECURITY DEFINER`, com `SET search_path = ''` e nomes de
   tabela qualificados com `public.`; `EXECUTE` revogado de `anon` e `public` e concedido só a
   `authenticated`):
   - `meu_perfil()` → a linha ativa de `perfis_usuarios` do `auth.uid()`, ou nada.
   - `unidades_descendentes(raiz uuid)` → a raiz e todas as descendentes (consulta recursiva). A
     regra da P8 (subunidades internas) sai daqui naturalmente: as Bases, Serviços e Setores são
     filhos da unidade na árvore.
   - `unidades_visiveis()` → todas as unidades, para os 6 perfis de alcance total; senão
     `unidades_descendentes(minha unidade)`.
   - `pode_ler_objeto(objeto uuid)` → verdadeiro se a unidade do objeto está em `unidades_visiveis()`
     **ou**, para `coordenador_geral`, se `objetos_contexto.macroprocesso_supervisor_id` está em
     `unidades_descendentes(minha unidade)`.
   - `pode_escrever_objeto(objeto uuid)` → verdadeiro se a unidade do objeto é a minha unidade
     exata **ou** uma subunidade interna dela (tipos `divisao`, `servico`, `setor`, `base-avancada`).
     Nunca para `auditoria` fora da própria unidade. **Exceção da CGOV:** pode criar objetos em
     qualquer unidade e escrever em riscos com `status_fluxo = 'preliminar_cgov'` (seção 7.1).
   - `chefia_imediata(unidade uuid)` → a unidade-mãe imediata na árvore. Quem valida é a pessoa
     com `titular_chefia = true` e perfil ativo lotada nela.
   - `homologador_de(unidade uuid)` → a GR, se a unidade descende de uma GR; senão, a Diretoria
     ancestral; senão (unidades ligadas direto à Presidência), a Presidência. Quem homologa é o
     titular dessa unidade.
3. **`..._rls_alcance.sql`**
   - Remove as políticas "Leitura institucional" da `002` (que liberam leitura total).
   - **Leitura:** `riscos`, `controles_existentes`, `respostas_tratamento`, `indicadores_kri`,
     `medicoes_kri` e `historico_fluxo` só se `pode_ler_objeto(...)` do objeto do risco. Em
     `objetos_contexto`, o mesmo teste no próprio objeto. `unidades` e `categorias_risco`: leitura
     para qualquer pessoa logada com perfil ativo (a árvore e a DAR são públicas por dentro).
   - **Escrita (INSERT, UPDATE, DELETE):** nas mesmas tabelas, só se `pode_escrever_objeto(...)`.
     `UPDATE` em `riscos` **não pode** mudar `status_fluxo` diretamente (ver 8.2).
   - `perfis_usuarios`: cada pessoa lê a própria linha; `cgov` lê e grava todas (decisão P6).
   - `categorias_risco` (DAR): só `cgov` grava (simular e propor).
   - `auditoria_log`: RLS ligada, leitura pelo mesmo alcance do objeto (`objeto_id`); ninguém grava
     direto, só os gatilhos da seção 7.1.
4. **`..._fluxo_aprovacao.sql`** — funções chamadas pelo app (RPC), com as mesmas regras de
   segurança do item 2:
   - `assumir_risco_preliminar(risco uuid)`: titular ou gestor da unidade do risco;
     `preliminar_cgov` → `rascunho`.
   - `enviar_para_validacao(risco uuid)`: quem pode escrever no objeto; `rascunho` ou `devolvido`
     → `em_validacao_cg`.
   - `validar_risco(risco uuid, parecer text)`: só o titular da `chefia_imediata` da unidade do
     risco; `em_validacao_cg` → `em_homologacao_dir`, se o risco exige homologação (seção 7.1), ou →
     `aprovado`, se não exige ou se o validador é também o homologador.
   - `homologar_risco(risco uuid, parecer text)`: só o titular da unidade `homologador_de`;
     `em_homologacao_dir` → `aprovado`.
   - **Trava e reabertura (gatilho):** `UPDATE`/`DELETE` na ficha é recusado em `em_validacao_cg` e
     `em_homologacao_dir`. Em `aprovado`, a alteração dos campos de avaliação, dos controles, do
     tratamento ou dos KRIs volta o risco para `em_validacao_cg` e registra no histórico. Medições
     de KRI e `status_execucao` não travam nem reabrem.
   - `devolver_risco(risco uuid, motivo text)`: quem pode validar ou homologar naquele estado;
     → `devolvido`. O motivo é obrigatório.
   - Cada função grava uma linha em `historico_fluxo` e recusa com mensagem clara em português
     quando a pessoa não tem permissão ou o estado não permite.
   - Os nomes de estado atuais (`em_validacao_cg`, `em_homologacao_dir`) **ficam** para não quebrar
     a store. Na prática, "validação" passa a ser da chefia imediata e "homologação" do GR ou do
     Diretor.

### 8.2 Por que o fluxo vai em funções, e não em políticas de UPDATE

Uma política de RLS diz *se* a pessoa pode alterar a linha, mas não *de qual estado para qual*. As
funções verificam quem é a pessoa, o estado atual e o próximo, e registram o histórico numa única
operação. A RLS de `riscos` impede que alguém pule o fluxo editando `status_fluxo` direto.

### 8.3 Semente de demonstração (`supabase/seed.sql`) — ajustada pela seção 7.2

- Mantém as 8 categorias do Quadro 2 que já existem.
- A árvore **inteira** vem do importador (seção 7.2). A semente escolhe, dentro dela, as unidades
  usadas nos testes. Exemplo do que precisa existir (antes, essa lista seria escrita à mão): Presidência,
  GABIN, AUDIT, CGGE → CGOV, DIMAN → CGPRO → COFIS → uma Divisão, DIBIO → CGCON e um Centro Nacional
  com uma Base Avançada, e uma GR com COAGR, duas CTs, um NGI e três UCs (uma delas **sem CT**, para
  o achado A4), uma UC com Base Avançada.
- Titulares (`titular_chefia = true`) para as unidades que validam ou homologam na fatia, e
  pelo menos um gestor **não titular** numa GR, para provar que ele não valida.
- **Um usuário fictício por perfil** em `auth.users` e `perfis_usuarios` (e-mails do domínio
  reservado `@radar.test`), cobrindo cada linha dos "Exemplos práticos" da matriz.
- Objetos e riscos de demonstração espalhados pela árvore, com pelo menos um objeto de UC ligado ao
  macroprocesso da CGPRO (visão por processo) e o Caso de Controle do Anexo II.
- Os riscos entram pela tabela, e o gatilho calcula inerente e residual como sempre.

### 8.4 Testes (`supabase/tests/*.sql`, pgTAP)

- **Um arquivo por perfil.** Cada teste se passa por um usuário fictício (`set local role
  authenticated` + `request.jwt.claims` com o `sub` dele) e confere:
  - quantos e quais riscos ele lê (o número exato esperado pela semente);
  - que ele grava na própria unidade e **falha** ao gravar em outra;
  - o que ele pode e não pode fazer no fluxo.
- Casos obrigatórios: os 7 "Exemplos práticos" da matriz; UC sem CT (validada e homologada pelo GR
  numa só ação); gestor não titular da GR **não** valida; Centro validado pelo Diretor da DIBIO;
  risco crítico da CGOV homologado pelo Presidente; preliminar da CGOV assumido pela unidade e
  depois fora do alcance de escrita da CGOV; ficha travada em validação; edição de risco aprovado
  reabre o fluxo, e medição de KRI não reabre; trilha de auditoria lida só no alcance; AUDIT não
  grava fora da AUDIT; usuário logado **sem perfil** e perfil **inativo** não veem nada; `anon` não
  vê nada e não executa as funções; ninguém altera `status_fluxo` por `UPDATE` direto.
- **Regressão do cálculo:** `P=1, I=5 → 15`; `P=5, I=1 → 11`; residual `10,2` → Alto; `17,1` →
  Extremo; controle sem evidência limitado a Fraco (0,9).
- `npm run test:db` roda `supabase test db`. O `npm test` (Vitest) continua igual.

### 8.5 Ambiente local

- **Pré-requisito (feito pelo usuário, com o meu passo a passo):** instalar o Docker Desktop no
  Windows e ligar a integração com o WSL.
- O Supabase CLI entra no projeto como dependência de desenvolvimento, com versão fixa, e é
  inicializado com `supabase init`. O `config.toml` vai para o repositório.
- Novos comandos no `package.json`: `db:start`, `db:stop`, `db:reset` (aplica as migrações e a
  semente do zero) e `test:db`.
- O guia `docs/02-arquitetura-cgti/guia-supabase-local.md` explica, para iniciantes, instalação,
  comandos, como ver o banco no Studio local e como ler uma falha de teste.
- O `modelo-dados-mer.md`, a Aula 2 do caderno e o `ESTADO-ATUAL` são atualizados.

## 9. Deixado para quem implementar

- A forma exata da consulta recursiva e dos índices, desde que os testes provem o alcance.
- Os nomes das unidades e dos riscos fictícios da semente, respeitando a fatia descrita em 8.3.
- A versão exata do Supabase CLI: a mais recente com pelo menos duas semanas de publicação.
- Mensagens de erro das funções, desde que em português e claras para iniciantes.

### 8.6 Importador das listas (`scripts/sync-estrutura/`)

- Escrito em TypeScript e executado pelo Node, com o mesmo cliente do Supabase. Usa a chave de
  serviço **local**, que vem do `supabase status` e nunca vai para o repositório.
- Etapas: ler o CSV (ignorando a linha `ListSchema=`), validar, converter os tipos, montar a árvore,
  comparar com o banco, mostrar o relatório de mudanças, pedir confirmação e aplicar numa transação.
- Tem **testes de unidade (Vitest)** com CSVs pequenos de exemplo: conversão de tipos, mãe
  inexistente, unidade desativada, renomeação e mudança de mãe, Comitê Gestor ignorado e
  reexecução sem mudanças (resultado idêntico).
- Opções: `--pasta <dir>` (padrão `supabase/referencia/`), `--sim` (aplica sem perguntar, usado no
  `db:reset`) e `--so-relatorio` (só mostra o que mudaria).
- O guia `docs/02-arquitetura-cgti/guia-supabase-local.md` ganha a seção "Atualizar a estrutura a
  partir do SharePoint".

