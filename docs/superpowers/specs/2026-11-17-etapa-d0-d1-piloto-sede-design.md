# Design — Etapa D0 e D1: decisões do piloto da Sede e ambiente do piloto

> **Data:** 2026-11-17 · **Tamanho:** projeto (infraestrutura + documentação, sem mudança de cálculo, alcance, RLS ou fluxo)
> · **Branch sugerida:** `feat/d1-ambiente-piloto` (a partir da `main`, com B1, B1.1, B2, B3 e C mescladas)
> · **Base:** [[ESTADO-ATUAL]], [[guia-docker-cgti]], [[guia-supabase-local]], [[decisoes-tecnicas-b2]] §4.3, [[decisoes-tecnicas-b3]] §3, [[matriz-acesso-responsabilidades]]
> · **Etapas seguintes (fora deste documento):** D2 login por senha temporária · D3 escopo Sede · D4 operação da CGOV · D5 piloto assistido · D6 dossiê e homologação da CGTI.

## 1. Por que

A CGOV vai usar o RADAR com **dados reais** para testar e operacionalizar o sistema antes de levá-lo à CGTI.
Ela processa atos normativos com a skill `cgov-gestao-riscos`, importa as fichas (tela Importar → riscos
`preliminar_cgov`), as Coordenações-Gerais validam e os Diretores homologam. O recorte é a **Sede** (no retrato do
SharePoint, macrogrupo "Sede": 152 unidades ativas; Presidência 40, DIPLAN 43, DIMAN 28, DISAT 23, DIBIO 18).
Ficam fora GRs, Centros de Pesquisa, CTs, UCs e NGIs.

O **D0** fixa as decisões que precisam existir antes de qualquer dado real entrar (base legal, guarda, cópias,
retenção, acesso, critério de sucesso). A **D1** monta o ambiente onde o piloto roda (nuvem) e o ensaio no
computador local, com cópia e **restauração testadas**.

## 2. Decisões já tomadas pelo responsável (não reabrir)

1. **Dois ambientes:** (a) **nuvem** (Supabase) = piloto da CGOV com dados reais da Sede; (b) **computador local**
   do ICMBio = o mesmo sistema em Docker, para ensaio e para a CGTI avaliar, com dados de demonstração ou cópia
   autorizada pelo responsável.
2. **Login por senha temporária** no piloto (detalhado na D2, não aqui).
3. **Escopo Sede** pelo alcance e pelas atribuições (detalhado na D3).

## 3. Decisões do D0 (tomadas em 2026-11-17, nesta conversa)

| # | Tema | Decisão |
|---|------|---------|
| D0-1 | Plano do Supabase | **Gratuito**, região São Paulo. Sem custo. Riscos aceitos: pausa por inatividade e ausência de backup restaurável do provedor. |
| D0-2 | Cópia de segurança | **Cópia lógica diária, cifrada, feita no computador do responsável**, guardada **fora do repositório**. Retenção: 14 diárias + 1 semanal por 2 meses. **Restauração testada** na D1 e repetida uma vez por mês durante o piloto. Risco aceito: dia com o computador desligado = dia sem cópia. |
| D0-3 | Pausa por inatividade | A cópia diária acessa o banco. A D1 confirma se isso basta para o Supabase considerar o projeto ativo; se não bastar, acrescenta uma consulta leve pela API no mesmo agendamento. |
| D0-4 | Base legal (LGPD; IN GSI/PR nº 5/2021, uso de nuvem) | **Registro de Decisão da CGOV**, assinado pela Coordenação, com finalidade, dados mínimos, quem acessa, retenção, riscos aceitos e fim do piloto. **Aviso** ao encarregado de dados e à CGTI; o piloto **não espera** resposta. A carga de dados reais só acontece depois da assinatura. |
| D0-5 | Retenção | Dados do piloto na nuvem até a homologação da CGTI e a migração, **no máximo 6 meses** contados da primeira carga real. No fim: exportação para a CGOV e **exclusão do projeto em nuvem**; cópias cifradas apagadas 2 meses depois. |
| D0-6 | Quem acessa | Painel do Supabase (administração): **só o responsável**. Sistema: só contas criadas pela CGOV, com os perfis da matriz de acesso. |
| D0-7 | Sucesso do piloto | **Cobertura ampla da Sede em 2 a 3 meses:** riscos homologados nas 5 áreas (Presidência, DIPLAN, DIMAN, DISAT e DIBIO), com metas de tempo por degrau e de taxa de recusa no Importar. Os números entram no Registro de Decisão como proposta e são confirmados pelo responsável (ver §9). |
| D0-8 | Onde fica a tela (front) do piloto | **Power Pages (SPA code site), se o teste do responsável mostrar que ele consegue criar um site num ambiente da Power Platform com upload de `.js` liberado; senão, Cloudflare Pages.** Em qualquer caso, o endereço fica também numa aba "Site" do Teams da Sede. Hospedar o front não expõe dados: o navegador fala direto com o Supabase. |
| D0-9 | Ensaio no computador local | **Supabase CLI** (o mesmo `npm run db:start` de hoje) **+ container do front**. O Supabase auto-hospedado (compose oficial) fica para a D6. |
| D0-10 | Onde ficam as cópias | A **cópia agendada** fica só na **máquina institucional do ICMBio** do responsável (a mesma do ensaio local, WSL + Docker). Ver também D0-13. |
| D0-11 | Conta do Cloudflare (caminho B) | **Conta do responsável**, criada com o e-mail institucional, endereço `*.pages.dev`. O Registro de Decisão e o aviso à CGTI mencionam isso. Um domínio do ICMBio fica para a D6. |

### 3.1 Análise das licenças Microsoft (registro, 2026-11-17)

Feita a pedido do responsável, com as licenças do Coordenador de Governança (Microsoft 365 E3, Power Apps
Premium, Power Pages Internal User, Entra ID P1, SharePoint Plan 2, Teams etc.):
- **Power Pages:** único serviço que hospeda o front. Aceita SPA (exemplo oficial em Vue) por
  `pac pages upload-code-site`; o site já exige login Entra ID (conta ICMBio) antes do RADAR. Pré-requisitos da
  Microsoft: privilégio de administrador no ambiente e upload de JavaScript liberado no Dataverse.
- **SharePoint:** não serve (modo "strict" baixa `.html`; script personalizado bloqueado por padrão; SPFx exige o
  catálogo de apps do tenant).
- **Teams:** não hospeda, mas a aba "Site" facilita o acesso.
- **Entra ID P1:** login com a conta ICMBio no Supabase (provedor "Azure") é candidato para a **D6**; não altera
  a decisão da senha temporária.
- **Azure:** sem assinatura nas licenças. Power BI, Fabric, Forms, Power Automate: não se aplicam.

## 4. Objetivos, não objetivos e anti-objetivos

**Objetivos (D0)**
1. Registro de Decisão do piloto (texto pronto para assinatura) e textos dos avisos ao encarregado e à CGTI.
2. Regras do piloto acrescentadas ao `AGENTS.md` (§8), depois da aprovação deste documento.

**Objetivos (D1)**
1. **Banco do piloto** na nuvem com todas as migrações do repositório e só os dados de referência necessários
   (§6.1). Sem usuários de demonstração, sem riscos de demonstração.
2. **Front do piloto** publicado (Power Pages ou Cloudflare), em modo real, apontando para o banco do piloto,
   com HTTPS e cabeçalhos de segurança.
3. **Cópia diária cifrada** agendada e **restauração testada** num Supabase local.
4. **Ensaio no computador local:** `docker compose` sobe o front em modo real ligado ao Supabase local
   (CLI); roteiro escrito e executado.
5. **Dockerfile** capaz de gerar o front em modo real (hoje sai sempre em modo demonstração, porque o Vite grava
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no build e o Dockerfile não os recebe).
6. Documentação didática: guia do ambiente do piloto, guia de cópia e restauração, e decisões técnicas da etapa D.

**Não objetivos**
- Login por senha, tela de gestão de senhas, publicação da Edge Function `gerenciar-acesso` (→ **D2**).
- Carga da estrutura real, atribuições e perfis da Sede (→ **D3**).
- Roteiro da CGOV, treinamento e runbook de operação (→ **D4**).
- Supabase auto-hospedado, SMTP e dossiê da CGTI (→ **D6**).

**Anti-objetivos (falha mesmo que "funcione")**
- Qualquer dado real (nome, e-mail, matrícula, ficha de risco) no repositório, em teste, em captura de tela, no
  Figma ou em documento.
- Qualquer e-mail enviado pelo sistema a servidor do ICMBio.
- A chave `service_role`, a senha do banco ou a chave da cópia em arquivo versionado, log ou relatório.
- Cópia que nunca foi restaurada contada como backup.
- Usuários `@radar.test` ou riscos de demonstração no banco da nuvem.
- Qualquer mudança em cálculo (Quadros 6, 7 e 8), alcance, RLS ou fluxo.

## 5. Restrições

- **Autorização a cada passo na nuvem:** criar ou zerar projeto, aplicar migração, mudar configuração do Auth,
  gravar segredo, publicar front e agendar a cópia contra a nuvem só com autorização explícita do responsável
  **naquele passo**. O plano marca esses passos com **[AUTORIZAÇÃO]** e para ali.
- Nunca abrir, listar nem ler a pasta `_temp/`.
- Testes, desenvolvimento e varredura continuam com dados de demonstração (`@radar.test`).
- Commits automáticos em português (`tipo(escopo): resumo`); push, merge e PR só a pedido.
- Código e documentação com comentários didáticos em português do Brasil (o responsável é iniciante).
- Siglas: nunca "PGR" para Plano de Gestão de Riscos; nunca "Crítico" para o nível 18 a 25.

## 6. Desenho da D1

### 6.1 Banco do piloto (nuvem)

- **Projeto:** *(minha decisão)* criar um **projeto novo** `radar-piloto-sede` na região São Paulo, em vez de
  zerar o `cgov-riscos-v2.1`. O plano gratuito permite 2 projetos ativos por organização (conferido em
  2026-11-17: `cgov-riscos-v2.1` ativo e `CGOV_Conselhos_v2` pausado, que não conta; reativar este último depois
  esbarraria no limite). Assim nada é apagado e
  o projeto antigo (14 tabelas vazias de uma versão antiga) pode ser pausado e excluído depois, também com
  autorização. Se o responsável preferir zerar o antigo, o plano troca só este passo. **[AUTORIZAÇÃO]**
- **Migrações:** todas as de `supabase/migrations/` (`20261109001` a `20261117001`), na ordem, pelo Supabase CLI
  (`supabase link` + `supabase db push`). **[AUTORIZAÇÃO]**
- **Dados de referência:** só o conteúdo de `supabase/seed.sql` (as 8 categorias do Quadro 2 com as
  subcategorias de integridade e o apetite padrão da DAR, mais o acerto da sequência). **Não** aplicar
  `seed-demonstracao.sql`, **não** rodar `sync:estrutura -- --sim`. A estrutura real da Sede entra na D3.
  O apetite da DAR é revisto pela CGOV na tela DAR antes da primeira importação (registro no roteiro da D4).
- **Verificação depois de aplicar:** lista de migrações do projeto igual à do repositório; contagem de
  tabelas; `get_advisors` (segurança e desempenho) sem alerta novo de RLS desligada; nenhuma linha em
  `perfis`, `riscos`, `unidades` e `auth.users`.
- **Auth na nuvem** **[AUTORIZAÇÃO]**: cadastro avulso desligado (equivalente a `enable_signup = false`),
  login anônimo desligado, "Site URL" e URLs de retorno = endereço do front do piloto. A política de senha e o
  bloqueio por tentativas são da D2.
- **Edge Function:** *(minha decisão)* **não é publicada na D1.** A versão atual de `gerenciar-acesso` tem a ação
  `enviar_link`, que manda e-mail (`signInWithOtp`); publicada agora, poderia mandar e-mail a servidores. Ela vai
  para a nuvem na D2, com o login por senha e uma trava de servidor contra envio de e-mail.
- **Consequência:** ao fim da D1 o ambiente está pronto, mas **ninguém entra** até a D2. O teste de ponta a
  ponta da D1 é de infraestrutura (§7).

### 6.2 Front do piloto

- **Build em modo real:** o Dockerfile passa a aceitar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como
  argumentos de build (`ARG`), só com a chave **anon/publicável**. Sem os argumentos, continua gerando o modo
  demonstração (comportamento atual preservado). Um teste automatizado confere que a chave `service_role` não
  aparece no `dist/` gerado.
- **Caminho A, Power Pages** (se o teste do responsável der certo): `powerpages.config.json` com
  `compiledPath: dist`, `defaultLandingPage: index.html` e `bundleFilePatterns` para limpar os pacotes antigos;
  publicação com `pac pages upload-code-site`, feita pelo responsável. Site com login Entra ID (conta ICMBio).
  CSP pela configuração do site (`HTTP/Content-Security-Policy`), liberando `connect-src` para o endereço do
  projeto Supabase. O roteamento do Vue (`createWebHistory`) funciona: o Power Pages devolve a página raiz em
  qualquer atualização (F5) e o roteador abre a rota certa.
- **Caminho B, Cloudflare Pages:** publicação do `dist/` gerado localmente (sem ligar o repositório do GitHub),
  arquivo `_redirects` para o roteamento do Vue e `_headers` com os cabeçalhos de segurança (CSP com
  `connect-src` para o Supabase, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
- **Teste do responsável (porta de decisão):** o caminho A só é escolhido se as **quatro** condições forem
  verdadeiras: (1) consegue criar um site em `make.powerpages.microsoft.com`; (2) o ambiente é de **produção**
  (um de avaliação expira em cerca de 30 dias, antes do fim do piloto); (3) o upload de `.js` está liberado no
  Dataverse; (4) um Coordenador-Geral ou Diretor da Sede (com a licença que tiver) consegue **entrar** num site
  de teste com a conta ICMBio. Se qualquer uma falhar, segue o caminho B. O plano para nesse passo.
  **[AUTORIZAÇÃO]** para publicar em qualquer um dos dois.
- **Teams:** aba "Site" no canal da Sede com o endereço do front (feita pelo responsável, quando o piloto abrir
  na D3/D4).
- O `nginx.conf` do container ganha os mesmos cabeçalhos de segurança, para o ensaio local e a CGTI.

### 6.3 Cópia de segurança e restauração

- **O que copiar:** os dados de `public` **e** as contas de `auth` (usuários e identidades), porque `perfis`
  aponta para `auth.users`. A estrutura (schema) vem das migrações do repositório; a cópia pode guardar também
  o schema para conferência.
- **Como:** `pg_dump` com versão de cliente igual ou maior que a do servidor (Postgres 17), pela conexão do
  *pooler* de sessão (o plano gratuito só dá IPv6 na conexão direta). Cifra com chave pública (`age`): o
  script só tem a **chave pública**; a **chave privada** fica com o responsável fora do computador de uso
  diário (gerenciador de senhas ou mídia separada). Assim, quem tiver acesso à pasta das cópias não lê os dados.
- **Onde:** pasta fora do repositório (proposta: `~/radar-copias/`), permissão só do dono. Rotação automática
  (14 diárias + semanais por 2 meses).
- **Segredo de conexão:** a senha do banco fica num arquivo local fora do repositório com permissão `600` (ou no
  cofre de credenciais do sistema). Nunca no `.env` do projeto, nunca em log.
- **Agendamento:** na máquina institucional (D0-10). O WSL só roda `cron` com o WSL aberto; por isso
  *(minha decisão)* o disparo diário vem do **Agendador de Tarefas do Windows**, chamando o script dentro do WSL.
  Se a política da máquina não permitir criar a tarefa, o plano B é `cron` no WSL + aviso quando a última cópia
  tiver mais de 36 horas.
- **Conta de teste na restauração:** nunca usar a credencial de uma pessoa real. Depois de restaurar, cria-se
  uma conta de teste **só no banco local**, com o perfil CGOV, para a leitura de amostra pela RLS. Cada execução grava um registro curto
  (data, tamanho, sucesso ou erro, **sem dados**).
- **Restauração (testada na D1 com dados de demonstração e, depois da primeira carga real, uma vez por mês):**
  decifrar → restaurar num Supabase **local** (CLI) limpo, com as migrações aplicadas → conferir as contagens
  por tabela contra a origem e ler uma amostra entrando com um usuário (passando pela RLS). Os testes pgTAP
  (`test:db`) não servem aqui, porque dependem da semente de demonstração. Roteiro passo a passo no guia.
- **Primeira prova:** antes de haver dados reais, a cópia e a restauração são provadas no projeto da nuvem
  ainda vazio + no Supabase local com a semente de demonstração.

### 6.4 Ensaio no computador local

- `docker-compose.yml` passa a ter um perfil (ou arquivo de sobreposição) "real-local": front construído com o
  endereço e a chave anon do Supabase **local** (`npm run db:start`). O compose de hoje (modo demonstração,
  porta 8080) continua funcionando.
- Roteiro do ensaio: subir o Supabase local, `db:reset`, `db:funcoes`, subir o front em container, entrar com um
  usuário `@radar.test` (link pelo Mailpit enquanto a D2 não chega), percorrer Importar → Aprovações → Painel.
- O mesmo roteiro serve para restaurar uma cópia e abrir o sistema sobre ela (com autorização do responsável
  quando a cópia tiver dados reais).

### 6.5 Documentação

- `docs/02-arquitetura-cgti/decisoes-tecnicas-d.md`: decisões D0-1 a D0-9, as minhas decisões e as pendências.
- `docs/02-arquitetura-cgti/guia-ambiente-piloto.md`: o que existe na nuvem, como publicar o front (dois caminhos),
  segredos (onde ficam, quem tem), como verificar.
- `docs/02-arquitetura-cgti/guia-copia-restauracao.md`: cópia, agendamento, rotação, restauração e conferência.
- `docs/02-arquitetura-cgti/registro-decisao-piloto-sede.md`: **modelo** do Registro de Decisão e dos avisos
  (sem dados pessoais; o documento assinado fica no SEI, não no repositório).
- `ESTADO-ATUAL.md` e `MOC-Radar.md` atualizados; `guia-docker-cgti.md` com os argumentos de build.

## 7. Como saber que a D1 terminou

1. Projeto da nuvem com as 12 migrações, só os dados do `seed.sql`, Auth configurado, `get_advisors` sem alerta
   novo de segurança.
2. Front do piloto abre pelo endereço público, em modo real (sem a faixa "Modo demonstração"), mostra a tela de
   entrar e conversa com o banco do piloto (verificado no navegador: requisições indo ao projeto certo, CSP sem
   bloqueio).
3. Uma cópia cifrada gerada pelo agendamento e **restaurada** no Supabase local com contagens conferidas.
4. Ensaio local executado pelo roteiro.
5. Verificações de sempre: `npm test`, `npm run build`, `npm run test:a11y` (0 violações),
   `npm run test:integracao` (com `npm run db:funcoes`), `npm run db:reset && npm run test:db`.
6. `git status` sem `_temp/`; `grep` sem `service_role` fora do comentário conhecido; nenhum segredo versionado.

## 8. Regras do piloto para o `AGENTS.md` (gravar depois da aprovação deste documento)

Nova seção "Regras do piloto da Sede (etapa D)":
- Nunca abrir, listar nem ler a pasta `_temp/` (dados pessoais).
- Dados reais só existem no ambiente do piloto (nuvem), nas cópias cifradas fora do repositório e em `_temp/`
  quando for preciso importar: nunca no repositório, nos testes, nas capturas, no Figma nem nos documentos.
  Testes, desenvolvimento e varredura continuam com dados de demonstração (`@radar.test`).
- Nenhum e-mail do sistema a servidores do ICMBio antes da aprovação da CGTI. Em desenvolvimento, só Mailpit.
  Envio real só para o responsável, com o aval dele.
- Na nuvem, nada sem autorização explícita a cada passo: aplicar no banco, publicar Edge Function ou front,
  criar contas, mudar plano, Auth ou segredos. Push, merge e PR só a pedido.
- Não alterar cálculo (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`; trigger do banco), alcance, RLS ou fluxo
  sem perguntar. Migração nova só se o plano da etapa a autorizar.
- Registro de Decisão assinado antes da primeira carga de dados reais; retenção máxima de 6 meses.

## 9. O que fica para quem constrói (decisões de execução)

- Nomes exatos de scripts, arquivos e variáveis; formato do registro da cópia.
- Ferramenta para rodar `pg_dump` 17 (cliente instalado ou imagem Docker `postgres:17`).
- Se a consulta leve contra a pausa é necessária (D0-3) e como ela é feita.
- Proposta dos números de D0-7 (tempo por degrau e taxa de recusa) no modelo do Registro de Decisão, marcados
  como "a confirmar pelo responsável".

## 10. Dois computadores de trabalho (decisões de 2026-11-17, após a aprovação do desenho)

O responsável recebeu um **desktop institucional** e quer trabalhar ora nele, ora no computador de casa
(pessoal, onde o projeto foi feito até agora), sem ordem fixa.

| # | Tema | Decisão |
|---|------|---------|
| D0-12 | Sincronização | Pelo **GitHub**. **Autorização permanente**: `git pull` no início de cada sessão e **push da branch de trabalho** (nunca a `main`) no fim. Merge, PR e push na `main` continuam só a pedido. |
| D0-13 | Dados reais nos dois computadores | Permitidos **nos dois até o encerramento da D5** (piloto assistido). Depois, só no institucional; o responsável apaga os do computador de casa. O Registro de Decisão menciona o equipamento pessoal até essa data. A cópia agendada fica só no institucional (D0-10). |
| D0-14 | Docker no institucional | *(minha decisão)* **Docker Engine dentro do WSL (Ubuntu)**, gratuito, em vez do Docker Desktop, cuja licença é paga para organizações do porte do ICMBio. O computador de casa continua como está. |
| D0-15 | Ordem | *(minha decisão)* A preparação do desktop é a **Fase 0 da D1**, com plano próprio. Ela só bloqueia as tarefas da D1 que precisam da máquina institucional (cópia agendada, restauração, ensaio); as demais podem andar em qualquer computador. |
| D0-16 | Memória do agente | A memória do Claude Code fica em cada computador e **não** vai pelo GitHub. As regras dela que valem para o projeto passam para o `AGENTS.md` (sem dados pessoais), e assim chegam aos dois computadores. |

## 11. Abordagens consideradas

**Plano e cópia:** (a) Pro + cópia própria: sem pausa e com backup do provedor, mas com custo e a questão de
quem paga; (b) **gratuito + cópia diária própria (escolhida)**: custo zero, mas a restauração é manual e depende
do computador do responsável; (c) consultar a CGTI antes: mais seguro do ponto de vista formal, mas atrasa o
piloto.

**Base legal:** (a) **termo da CGOV + aviso (escolhida)**; (b) esperar aval formal antes da carga; (c) reduzir os
dados sem aval.

**Front do piloto:** (a) Cloudflare Pages; (b) Vercel (termos do plano gratuito são para uso pessoal);
(c) servidor do ICMBio (antecipa a CGTI); (d) **Power Pages se der, Cloudflare se não (escolhida)**: institucional
e com login ICMBio na frente, sem depender da CGTI se o responsável já tiver o ambiente.

**Ensaio local:** (a) **Supabase CLI + front (escolhida)**: pouco trabalho novo, testes já existem;
(b) Supabase auto-hospedado agora: mais perto do que a CGTI vai operar, mas atrasa o piloto (fica para a D6).
