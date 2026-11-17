# Etapa D1 — Ambiente do piloto da Sede — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar o ambiente do piloto (banco na nuvem com as migrações, front publicado em modo real, cópia diária cifrada com restauração testada) e o ensaio completo no computador local, sem nenhum dado real e sem nenhum login possível até a D2.

**Architecture:** O front continua sendo um site estático (Vite) e ganha um build em **modo real** por argumentos de build, com conferência automática de que nenhum segredo entrou no pacote. A mesma política de segurança (CSP) é gerada por uma única função e usada no Nginx do container, no `_headers` do Cloudflare e na configuração do Power Pages. A cópia é um script Node que chama `pg_dump`/`pg_restore` (imagem `postgres:17`) e `age`, com as regras de nome e de rotação em funções puras testadas. Tudo o que toca a nuvem é feito pelo responsável ou com a autorização dele **a cada passo**.

**Tech Stack:** Vue 3 + Vite, Docker (Nginx 1.27 com `templates/` + `envsubst`), Supabase CLI 2.122.0, Supabase MCP (só leitura nas verificações), Postgres 17 (`pg_dump`/`pg_restore` em container), `age` (cifra), Playwright 1.64.1 (conferência de CSP), Vitest, `wrangler` (Cloudflare) ou `pac` (Power Pages), Agendador de Tarefas do Windows.

**Spec:** `docs/superpowers/specs/2026-11-17-etapa-d0-d1-piloto-sede-design.md`
**Plano irmão:** `docs/superpowers/plans/2026-11-17-etapa-d1-fase0-computador-institucional-plan.md` (Fase 0). As Tasks 1 a 6 deste plano podem rodar em qualquer computador; a **Task 7** (cópia agendada e restauração) e a **Task 8** (ensaio) exigem a Fase 0 concluída.

## Global Constraints

- Branch: `feat/d1-ambiente-piloto` (a partir da `main`). Push da branch no fim de cada sessão (D0-12); merge e PR só a pedido.
- Nunca abrir, listar nem ler `_temp/`. Nenhum dado real em repositório, teste, captura, Figma ou documento.
- **[AUTORIZAÇÃO]**: o executor **para** e pede autorização ao responsável antes do passo, um por um. Sem resposta, não faz.
- Não publicar a Edge Function `gerenciar-acesso` na nuvem (vai na D2). Não aplicar `seed-demonstracao.sql` nem `sync:estrutura -- --sim` na nuvem.
- A chave `service_role`, a senha do banco, a URL de conexão e a chave privada do `age` nunca em arquivo versionado, log, relatório ou saída de terminal colada na conversa.
- Sem mudança em cálculo (Quadros 6, 7 e 8), alcance, RLS, fluxo ou migrações.
- Projeto na nuvem: novo, `radar-piloto-sede`, região São Paulo (`sa-east-1`), plano gratuito, na organização que já contém `cgov-riscos-v2.1`.
- Cópia: nome `radar-AAAA-MM-DD.tar.age`; pasta `~/radar-copias/`; retenção 14 diárias + 1 por semana ISO até 60 dias; configuração local em `~/.config/radar-copias/config.env` (permissão `600`, fora do repositório).
- Origem da fonte do gov.br: `https://cdngovbr-ds.estaleiro.serpro.gov.br` (estilos e fontes, ver `index.html`).
- Verificação antes de dizer que terminou: `npm test`, `npm run build`, `npm run test:a11y` (0 violações), `npm run test:integracao` (com `npm run db:funcoes`), `npm run db:reset && npm run test:db`.
- Comentários didáticos em português do Brasil; commits `tipo(escopo): resumo` + `Co-Authored-By`.

## Review Focus

- **Build com `.env` presente no computador:** sem `.dockerignore`, o `COPY . .` leva `.env` e `_temp/` para o build, e o Vite grava o `.env` no pacote. Esperado: o `.env` e a `_temp/` nunca entram no build (Task 1 testa o `.dockerignore`).
- **Origem do Supabase mal digitada** (com barra no fim, `http://` na nuvem, caminho `/rest/v1`): a CSP bloquearia todas as chamadas e o site pareceria "quebrado sem erro". Esperado: `validarOrigemSupabase` recusa com mensagem clara (Task 3).
- **Restauração com gatilhos ligados:** restaurar dados dispara a trilha de auditoria e o recálculo da criticidade, criando linhas que não existiam na origem. Esperado: restaurar com gatilhos desligados e contagens idênticas, inclusive na tabela de auditoria (Task 5).
- **Cópia que falha em silêncio** (computador desligado, senha trocada, disco cheio): esperado: `copia:conferir` diz há quantas horas foi a última cópia boa e sai com erro acima de 36 h; o registro grava a falha sem a URL (Task 5).
- **Nomes de pacote do Vite que mudam a cada build** (`index-AbC123.js`): no Power Pages, pacotes antigos se acumulariam. Esperado: `padroesDeBundle` gera os curingas a partir da pasta `dist/` real (Task 3).

---

### Task 1: Build do front em modo real, sem segredos no pacote

**Files:**
- Create: `.dockerignore`
- Modify: `Dockerfile` (argumentos de build e conferência)
- Create: `scripts/conferir-dist/regras.ts`, `scripts/conferir-dist/index.ts`
- Modify: `package.json` (script `"conferir:dist": "vite-node scripts/conferir-dist/index.ts"`)
- Test: `tests/unit/conferirDist.spec.ts`, `tests/unit/deployConfig.spec.ts`

**Interfaces:**
- Produces: `procurarSegredos(conteudo: string): string[]` (lista de motivos; vazia = limpo); `npm run conferir:dist [pasta]` (padrão `dist`; sai com código 1 e lista arquivo + motivo, **sem imprimir o segredo**).
- Produces (Dockerfile): `ARG VITE_SUPABASE_URL=""` e `ARG VITE_SUPABASE_ANON_KEY=""`, expostos como `ENV` só no estágio `construtor`, antes de `RUN npm run build`, seguido de `RUN npm run conferir:dist`. Sem os argumentos, o build continua em modo demonstração.

- [ ] **Step 1: Testes que falham** em `conferirDist.spec.ts`:
  - um JWT cujo payload (base64url) tem `"role":"service_role"` → motivo contendo `service_role`;
  - um JWT com `"role":"anon"` → `[]`;
  - texto com `sb_secret_` seguido de 20+ caracteres → motivo contendo `chave secreta`;
  - texto com `sb_publishable_abc...` → `[]`;
  - texto com `postgresql://postgres:senha@` → motivo contendo `conexão`.
  E em `deployConfig.spec.ts`: o `Dockerfile` contém `ARG VITE_SUPABASE_URL`, `ARG VITE_SUPABASE_ANON_KEY` e `RUN npm run conferir:dist`; o `.dockerignore` existe e tem as linhas `.env`, `.env.*`, `_temp`, `node_modules`, `dist`, `playwright-report`, `test-results`, `supabase/.temp`.
- [ ] **Step 2:** `npx vitest run tests/unit/conferirDist.spec.ts tests/unit/deployConfig.spec.ts` → FAIL.
- [ ] **Step 3: Implementar** `regras.ts` (JWT: três partes base64url; decodificar só a do meio; nunca devolver o token no motivo), `index.ts` (percorre `.js`, `.css`, `.html`, `.json`, `.map` da pasta), `.dockerignore` (com comentário: "a `_temp/` tem dados pessoais e o `.env` seria gravado no pacote pelo Vite") e o `Dockerfile`.
- [ ] **Step 4:** `npx vitest run tests/unit/conferirDist.spec.ts tests/unit/deployConfig.spec.ts` → PASS.
- [ ] **Step 5: Prova com Docker:** `docker build -t radar-teste .` → passa (modo demonstração); `docker build --build-arg VITE_SUPABASE_URL=http://127.0.0.1:54321 --build-arg VITE_SUPABASE_ANON_KEY=<anon local de npx supabase status> -t radar-teste-real .` → passa; `npm run build && npm run conferir:dist` → "nenhum segredo encontrado". Se o texto `service_role` aparecer dentro da biblioteca `supabase-js` no pacote, a regra deve casar só os padrões dos testes (JWT, `sb_secret_`, conexão), não a palavra solta.
- [ ] **Step 6: Commit** `feat(d1): build do front em modo real e conferência de segredos no pacote`

### Task 2: Cabeçalhos de segurança únicos (CSP) no container, e perfil "real-local" no compose

**Files:**
- Create: `scripts/compartilhado/csp.ts`
- Move: `nginx.conf` → `nginx/default.conf.template` (`git mv`)
- Modify: `Dockerfile` (`COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template` e `ENV RADAR_SUPABASE_ORIGEM=""` no estágio final)
- Modify: `docker-compose.yml` (serviço novo `radar-web-real-local`, `profiles: ["real-local"]`, porta `8081:80`, `build.args` lidos de `.env.conteiner-local`, `environment: RADAR_SUPABASE_ORIGEM: http://127.0.0.1:54321`)
- Create: `.env.conteiner-local.example` (só as duas variáveis do Vite, em branco, com explicação)
- Modify: `.gitignore` (`.env.conteiner-local`)
- Create: `scripts/conferir-csp/index.ts` e script `"conferir:csp": "vite-node scripts/conferir-csp/index.ts"` em `package.json`
- Modify: `docs/02-arquitetura-cgti/guia-docker-cgti.md` (argumentos de build, perfil real-local, CSP)
- Test: `tests/unit/csp.spec.ts`, `tests/unit/deployConfig.spec.ts`

**Interfaces:**
- Produces: `montarCsp(origemSupabase: string): string` e `CABECALHOS_SEGURANCA: Record<string, string>` (sem a CSP: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
- CSP exata (com `<origem>` = argumento): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdngovbr-ds.estaleiro.serpro.gov.br; font-src 'self' data: https://cdngovbr-ds.estaleiro.serpro.gov.br; img-src 'self' data:; connect-src 'self' <origem>; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`. Origem vazia → `connect-src 'self'` (modo demonstração).
- Produces: `npm run conferir:csp -- <url>`: abre a URL no Chromium do Playwright, espera a rede ficar ociosa, sai com código 1 se houver mensagem de console com `Content Security Policy` ou erro de página; imprime a lista.

- [ ] **Step 1: Testes que falham:** `csp.spec.ts`: `montarCsp('https://abc.supabase.co')` contém `connect-src 'self' https://abc.supabase.co;` e `script-src 'self';` (sem `unsafe-inline` em script); `montarCsp('')` contém `connect-src 'self';`. `deployConfig.spec.ts`: o template do Nginx contém `add_header Content-Security-Policy "` + `montarCsp('${RADAR_SUPABASE_ORIGEM}')` + `" always;` e cada item de `CABECALHOS_SEGURANCA`; o `docker-compose.yml` tem `real-local` e a porta `8081`; o teste antigo passa a apontar para `nginx/default.conf.template`.
- [ ] **Step 2:** rodar os dois arquivos → FAIL.
- [ ] **Step 3: Implementar** `csp.ts`, o template (mesmos `try_files` e gzip de hoje, comentários didáticos sobre o `envsubst` da imagem oficial), Dockerfile, compose, exemplo do `.env`, `.gitignore`, `conferir-csp`.
- [ ] **Step 4:** rodar os dois arquivos → PASS; `npm test` → tudo passando.
- [ ] **Step 5: Prova com container:** `docker compose up -d --build` e `npm run conferir:csp -- http://localhost:8080` → 0 violações (modo demonstração). Com `npm run db:start` e `.env.conteiner-local` preenchido com a anon local: `docker compose --profile real-local up -d --build` e `npm run conferir:csp -- http://localhost:8081/entrar` → 0 violações, e a tela de entrar aparece sem a faixa "Modo demonstração". `curl -sI http://localhost:8081 | grep -i content-security` mostra a CSP com `http://127.0.0.1:54321`.
- [ ] **Step 6: Commit** `feat(d1): cabeçalhos de segurança e perfil real-local no container`

### Task 3: Pacote de publicação do piloto (Cloudflare Pages ou Power Pages)

**Files:**
- Create: `scripts/preparar-publicacao/regras.ts`, `scripts/preparar-publicacao/index.ts`
- Modify: `package.json` (script `"preparar:publicacao": "vite-node scripts/preparar-publicacao/index.ts"`)
- Modify: `.gitignore` (`publicacao/`)
- Test: `tests/unit/prepararPublicacao.spec.ts`

**Interfaces:**
- Consumes: `montarCsp`, `CABECALHOS_SEGURANCA` (Task 2).
- Produces (em `regras.ts`):
  - `validarOrigemSupabase(url: string): string`: devolve a origem normalizada (`https://<ref>.supabase.co`) ou lança `Error` em português. Aceita `http://127.0.0.1:<porta>` e `http://localhost:<porta>`; recusa `http://` para outros hosts, caminho além de `/`, consulta ou fragmento. Tira a barra final.
  - `arquivoRedirectsCloudflare(): string` → `"/* /index.html 200\n"`.
  - `arquivoHeadersCloudflare(origem: string): string` → bloco `/*` com a CSP e os `CABECALHOS_SEGURANCA`, dois espaços de recuo por linha.
  - `padroesDeBundle(arquivos: string[]): string[]`: para cada arquivo de `dist/assets/` com sufixo de hash do Vite (`nome-HASH.ext`), gera `nome-*.ext`; sem repetição; ordem alfabética.
  - `configPowerPages(nomeSite: string, arquivos: string[]): object` → `{ siteName, compiledPath: "dist", defaultLandingPage: "index.html", bundleFilePatterns: padroesDeBundle(arquivos) }`.
- Produces (CLI): `npm run preparar:publicacao -- --destino cloudflare|powerpages --origem <url> [--nome-site "RADAR Piloto Sede"]` (pressupõe `dist/` gerado com o build real): **cloudflare** grava `_redirects` e `_headers` dentro de `dist/`; **powerpages** cria `publicacao/powerpages/` com `powerpages.config.json` e uma cópia de `dist/` e imprime o texto da CSP para colar na configuração `HTTP/Content-Security-Policy` do site.

- [ ] **Step 1: Testes que falham** em `prepararPublicacao.spec.ts`:
  - `validarOrigemSupabase('https://abc.supabase.co/') === 'https://abc.supabase.co'`; lança para `http://abc.supabase.co`, `https://abc.supabase.co/rest/v1` e `abc.supabase.co`; aceita `http://127.0.0.1:54321`.
  - `padroesDeBundle(['assets/index-AbC12_x.js', 'assets/index-Zz9.css', 'assets/RiscosView-k3J9a.js', 'favicon.ico'])` → `['RiscosView-*.js', 'index-*.css', 'index-*.js']`.
  - `arquivoHeadersCloudflare('https://abc.supabase.co')` começa com `/*\n` e contém `  Content-Security-Policy: ` + `montarCsp('https://abc.supabase.co')`.
  - `configPowerPages('RADAR Piloto Sede', [...]).compiledPath === 'dist'`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: Implementar** `regras.ts` e `index.ts` (comentários explicando cada arquivo gerado e por que o `_redirects` é necessário para o `createWebHistory`).
- [ ] **Step 4:** rodar → PASS; `npm test` → tudo passando.
- [ ] **Step 5: Commit** `feat(d1): pacote de publicação do front para Cloudflare Pages e Power Pages`

### Task 4: Registro de Decisão do piloto (D0) e decisões técnicas da etapa D

**Files:**
- Create: `docs/02-arquitetura-cgti/registro-decisao-piloto-sede.md` (modelo, sem dados pessoais)
- Modify: `docs/02-arquitetura-cgti/decisoes-tecnicas-d.md` (criado na Fase 0; se ainda não existir, criar com a seção "Fase 0" vazia)
- Modify: `docs/00-memoria/MOC-Radar.md`

Conteúdo do modelo (para assinatura da Coordenação da CGOV; a versão assinada vai ao SEI, não ao repositório):
- Finalidade; recorte (Sede, 152 unidades); **dados tratados** (nome, e-mail institucional e unidade dos usuários; fichas de risco, inclusive de integridade); dados que **não** entram (matrícula, CPF).
- Onde ficam: Supabase (São Paulo, plano gratuito, conta do responsável); front no Power Pages ou Cloudflare Pages (conta do responsável, D0-11); cópias cifradas na máquina institucional (D0-10); dados reais também no computador pessoal do responsável até o encerramento da D5 (D0-13).
- Quem acessa (D0-6); retenção de até 6 meses e exclusão (D0-5); riscos aceitos (pausa, falta de backup do provedor, dia sem cópia, equipamento pessoal até a D5) e medidas (cópia cifrada, restauração mensal, RLS, senha forte e bloqueio da D2, nenhum e-mail).
- Critérios de sucesso (D0-7) com **números propostos, marcados "a confirmar pela CGOV"**: tempo de validação pela CG ≤ 10 dias úteis; tempo de homologação pelo Diretor ≤ 10 dias úteis; taxa de recusa no Importar ≤ 10 % das linhas; ao menos um risco homologado em cada uma das 5 áreas.
- Base: LGPD (Lei nº 13.709/2018), IN GSI/PR nº 5/2021, Decreto nº 9.203/2017 (art. 17).
- Dois avisos curtos prontos para envio pelo responsável: ao encarregado de dados e à CGTI.
- `decisoes-tecnicas-d.md`: tabela D0-1 a D0-16 (resumo com link para a spec) e uma seção "Decisões da execução da D1", preenchida pelas tarefas seguintes.

- [ ] **Step 1:** Escrever os dois documentos e linkar no MOC (seção 3).
- [ ] **Step 2:** Conferir que não há e-mail nem nome de pessoa: `grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' docs/02-arquitetura-cgti/registro-decisao-piloto-sede.md` → vazio; não usar "PGR" para Plano de Gestão de Riscos.
- [ ] **Step 3: Commit** `docs(d0): modelo do Registro de Decisão do piloto e decisões técnicas da etapa D`
- [ ] **Step 4 [RESPONSÁVEL]:** levar o modelo ao SEI, colher a assinatura e enviar os avisos. **Nenhuma carga de dados reais (D3) antes disso.**

### Task 5: Cópia cifrada e restauração (scripts)

**Files:**
- Create: `scripts/copia/regras.ts`, `scripts/copia/index.ts`
- Modify: `package.json` (scripts `"copia:fazer"`, `"copia:restaurar"`, `"copia:conferir"`, todos `vite-node scripts/copia/index.ts <subcomando>`)
- Test: `tests/unit/copiaRegras.spec.ts`

**Interfaces:**
- Produces (em `regras.ts`):
  - `nomeDaCopia(data: Date): string` → `radar-AAAA-MM-DD.tar.age` (data local de Brasília).
  - `dataDaCopia(nome: string): Date | null`.
  - `escolherCopiasParaApagar(nomes: string[], hoje: Date): string[]`: guarda as 14 mais recentes; das demais, guarda a **mais nova de cada semana ISO** com idade ≤ 60 dias; apaga o resto; ignora nomes fora do padrão (nunca os apaga).
  - `mascararConexao(texto: string): string`: troca qualquer `postgres(ql)://usuario:senha@` por `postgresql://***:***@`.
  - `linhaDeRegistro(r: { quando: Date; ok: boolean; bytes?: number; erro?: string }): string`: uma linha, erro passado por `mascararConexao`.
  - `horasDesdeUltimaCopia(nomes: string[], agora: Date): number | null`.
- Produces (CLI), configuração lida de `~/.config/radar-copias/config.env` (`RADAR_COPIA_CONEXAO`, `RADAR_COPIA_DESTINO`, `RADAR_COPIA_CHAVE_PUBLICA`); o script recusa rodar se o arquivo não tiver permissão `600`:
  - `copia:fazer`: com a imagem `postgres:17`, dois `pg_dump --format=custom --data-only`: (1) esquema `public`; (2) tabelas `auth.users` e `auth.identities`. Junta os dois num `.tar`, cifra com `age -r <chave pública>` direto para `RADAR_COPIA_DESTINO/<nomeDaCopia>`, sem arquivo intermediário em claro no disco (usar *pipe* ou pasta temporária em `/dev/shm` apagada no `finally`). Depois aplica `escolherCopiasParaApagar` e grava `linhaDeRegistro` em `RADAR_COPIA_DESTINO/registro.log`.
  - `copia:restaurar -- <arquivo> [--identidade <arquivo da chave privada>]`: **só aceita destino local** (`127.0.0.1`/`localhost`, mesma regra de `scripts/sync-estrutura/destino.ts`); exige o Supabase local acabado de zerar **sem** semente (`npx supabase db reset --no-seed`); decifra para `/dev/shm`; restaura primeiro `auth` e depois `public` com `pg_restore --data-only --disable-triggers` conectado como `supabase_admin` local; apaga os arquivos decifrados no `finally`.
  - `copia:conferir`: imprime há quantas horas foi a última cópia e sai com código 1 se for > 36 h ou se não houver nenhuma.
  - Subcomando auxiliar `copia:contar -- <conexao>`: contagem de linhas por tabela de `public` + `auth.users`, em ordem alfabética, para comparar origem × restauração (nunca imprime conteúdo).

- [ ] **Step 1: Testes que falham** em `copiaRegras.spec.ts`:
  - `nomeDaCopia(new Date('2026-11-17T15:00:00-03:00')) === 'radar-2026-11-17.tar.age'`.
  - Com 30 cópias diárias consecutivas de 2026-10-18 a 2026-11-16 e `hoje` = 2026-11-17: as 14 mais recentes ficam; das outras, fica só a mais nova de cada semana ISO; `'notas.txt'` nunca aparece na lista de apagar.
  - Cópia de 70 dias atrás, sozinha na semana → apagada.
  - `mascararConexao('falhou: postgresql://postgres.abc:S3nh@F0rte@aws-0-sa-east-1.pooler.supabase.com:5432/postgres')` não contém `S3nh` nem `F0rte`.
  - `horasDesdeUltimaCopia([], agora) === null`; com a última de ontem às 00:00 e agora hoje às 12:00 → `36`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: Implementar** `regras.ts` e depois `index.ts` (cada comando externo com comentário do que faz; nenhuma linha imprime a conexão).
- [ ] **Step 4:** rodar → PASS; `npm test` → tudo passando.
- [ ] **Step 5: Prova local (dados de demonstração, sem nuvem):** `npm run db:reset`; criar `~/.config/radar-copias/config.env` apontando para o banco **local** e para `~/radar-copias-teste/`; gerar um par de chaves de teste `age-keygen`; `npm run copia:fazer`; `npm run copia:contar -- <local>` → anotar; `npx supabase db reset --no-seed`; `npm run copia:restaurar -- <arquivo> --identidade <chave de teste>`; `npm run copia:contar -- <local>` → **contagens idênticas**, inclusive a tabela de auditoria (prova de que os gatilhos não dispararam); entrar no app local com `cgov@radar.test` e ver os riscos. Apagar `~/radar-copias-teste/` e a chave de teste.
- [ ] **Step 6:** Escrever `docs/02-arquitetura-cgti/guia-copia-restauracao.md` (instalar `age`; gerar a chave **definitiva** e guardar a privada no gerenciador de senhas; criar o `config.env` com `chmod 600`; fazer, conferir e restaurar; conta de teste local para a amostra pela RLS; o que fazer se a cópia falhar) e linkar no MOC.
- [ ] **Step 7: Commit** `feat(d1): cópia cifrada diária e restauração testada (scripts e guia)`

### Task 6: [AUTORIZAÇÃO] Banco do piloto na nuvem

Sem código novo; o resultado é registrado em `docs/02-arquitetura-cgti/guia-ambiente-piloto.md` (criar) e em `decisoes-tecnicas-d.md`.

- [ ] **Step 1 [AUTORIZAÇÃO][RESPONSÁVEL]:** o responsável cria o projeto `radar-piloto-sede` no painel do Supabase (região São Paulo, plano gratuito) e guarda a senha do banco no gerenciador de senhas. O Claude não vê a senha.
- [ ] **Step 2 [AUTORIZAÇÃO]:** `npx supabase link --project-ref <ref>` e `npx supabase db push` (a senha é digitada pelo responsável no terminal). Esperado: as 12 migrações aplicadas.
- [ ] **Step 3 [AUTORIZAÇÃO]:** aplicar só o `supabase/seed.sql` (pelo MCP `execute_sql` com o conteúdo do arquivo, ou `psql` pela imagem `postgres:17`).
- [ ] **Step 4 [AUTORIZAÇÃO][RESPONSÁVEL]:** no painel, *Authentication*: cadastro avulso **desligado**, login anônimo desligado. "Site URL" fica para a Task 7.
- [ ] **Step 5 (só leitura, sem autorização extra):** pelo MCP: `list_migrations` = as 12 do repositório, na ordem; `list_tables` do `public` igual ao local; `execute_sql` com contagens: `categorias_risco` = 8, `perfis` = 0, `riscos` = 0, `unidades` = 0, `auth.users` = 0; `get_advisors` (security e performance): nenhum alerta de RLS desligada. Registrar o resultado (sem segredos) no `guia-ambiente-piloto.md`.
- [ ] **Step 6: Commit** `docs(d1): banco do piloto criado e conferido`

### Task 7: [AUTORIZAÇÃO] Front do piloto publicado

- [ ] **Step 1 [RESPONSÁVEL] — porta de decisão do Power Pages (spec §6.2):** as quatro condições (criar site, ambiente de **produção**, upload de `.js` liberado, um CG ou Diretor da Sede consegue entrar num site de teste). Registrar o resultado e o caminho escolhido em `decisoes-tecnicas-d.md`.
- [ ] **Step 2:** `VITE_SUPABASE_URL=https://<ref>.supabase.co VITE_SUPABASE_ANON_KEY=<publicável do projeto> npm run build` (a chave publicável vem do MCP `get_publishable_keys` ou do painel) e `npm run conferir:dist` → limpo.
- [ ] **Step 3:** `npm run preparar:publicacao -- --destino <cloudflare|powerpages> --origem https://<ref>.supabase.co`.
- [ ] **Step 4 [AUTORIZAÇÃO][RESPONSÁVEL]:** publicar. Cloudflare: `npx wrangler login` e `npx wrangler pages deploy dist --project-name radar-piloto-sede`. Power Pages: `pac auth create`, `pac pages upload-code-site --rootPath publicacao/powerpages`, reativar o site, colar a CSP em `HTTP/Content-Security-Policy` e restringir o acesso a usuários autenticados.
- [ ] **Step 5 [AUTORIZAÇÃO][RESPONSÁVEL]:** no Supabase, "Site URL" e URLs de retorno = endereço publicado.
- [ ] **Step 6:** `npm run conferir:csp -- https://<endereço>/entrar` → 0 violações (no Power Pages, depois do login Entra no navegador do responsável, a conferência é manual: DevTools → Console sem erro de CSP; Rede: chamadas indo para `<ref>.supabase.co`). A tela "Entrar" aparece sem a faixa "Modo demonstração".
- [ ] **Step 7:** completar o `guia-ambiente-piloto.md` (o que existe na nuvem, como republicar o front, onde ficam os segredos e com quem, como verificar) e fazer o commit `docs(d1): front do piloto publicado`.

### Task 8: Cópia agendada, primeira restauração da nuvem e ensaio local (precisa da Fase 0)

- [ ] **Step 1 [RESPONSÁVEL]:** no desktop institucional: `sudo apt install age`; `age-keygen` da chave **definitiva**; privada no gerenciador de senhas e **fora** do desktop; `~/.config/radar-copias/config.env` com a conexão do *pooler* de sessão do projeto e `chmod 600`.
- [ ] **Step 2 [AUTORIZAÇÃO]:** `npm run copia:fazer` contra a nuvem (ainda sem dados reais) → arquivo criado e linha `ok` no `registro.log`.
- [ ] **Step 3:** restaurar essa cópia no Supabase local (`npx supabase db reset --no-seed` + `copia:restaurar`) e comparar `copia:contar` da nuvem × local → idênticos.
- [ ] **Step 4 [RESPONSÁVEL]:** criar a tarefa diária no Agendador de Tarefas do Windows (comando `schtasks` do guia, chamando `wsl.exe` com `npm run copia:fazer` às 12h30). Se a política da máquina não permitir: `cron` no WSL e `npm run copia:conferir` ao abrir o terminal (linha no `~/.bashrc`). Anotar qual caminho valeu.
- [ ] **Step 5:** depois de 7 dias corridos, conferir (MCP `get_project`) se o projeto continua ativo só com a cópia diária (D0-3). Se for pausado, acrescentar ao `copia:fazer` uma consulta leve pela API REST com a chave publicável e registrar a decisão.
- [ ] **Step 6: Ensaio local (roteiro, no desktop):** `npm run db:start`, `npm run db:reset`, `npm run db:funcoes`, `docker compose --profile real-local up -d --build`, entrar em `http://localhost:8081` com `cgov@radar.test` (link pelo Mailpit, `http://127.0.0.1:54324`), importar uma tabela de demonstração, validar e homologar com os usuários de demonstração e ver o Painel. Escrever o roteiro em `guia-ambiente-piloto.md` (seção "Ensaio no computador local").
- [ ] **Step 7: Commit** `docs(d1): cópia agendada, restauração da nuvem e ensaio local`

### Task 9: Verificação final e registro

- [ ] **Step 1:** `npm test`, `npm run build`, `npm run test:a11y` (0 violações), `npm run db:start` + `npm run db:funcoes` + `npm run test:integracao`, `npm run db:reset && npm run test:db` → todos passando; anotar os números.
- [ ] **Step 2:** `git status --porcelain | grep -i '_temp'` → vazio; `git diff --stat main -- supabase/migrations` → vazio; `grep -rn "service_role\|SERVICE_ROLE" src/` → só o comentário de `src/services/supabase.ts`; `git ls-files | grep -E '\.env$|config\.env|\.age$'` → vazio.
- [ ] **Step 3:** atualizar `ESTADO-ATUAL.md` (seção "Etapa D": D0 e D1 com entregas, autorizações usadas, números e pendências) e `decisoes-tecnicas-d.md`.
- [ ] **Step 4:** commit `docs(estado): etapa D1 concluída` e push da branch.
