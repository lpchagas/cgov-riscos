# Etapa D1 — Fase 0: desktop institucional e trabalho em dois computadores — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o desktop institucional do ICMBio pronto para desenvolver, testar e rodar o RADAR (WSL + Docker Engine + Supabase local), com um verificador automático do ambiente e uma rotina simples de troca entre o computador de casa e o institucional.

**Architecture:** O GitHub é o ponto de encontro dos dois computadores (pull no início, push da branch no fim, D0-12). Um script `npm run verificar:ambiente` confere as ferramentas e diz, em português, o que falta. No desktop, o Docker é o **Docker Engine dentro do WSL** (D0-14), não o Docker Desktop. As tarefas marcadas **[RESPONSÁVEL]** são feitas por ele, com o Claude Code guiando passo a passo.

**Tech Stack:** Windows 11 + WSL2 (Ubuntu), Docker Engine (pacote `docker-ce`), Node 24 (via `nvm`), Git + GitHub CLI (`gh`), VS Code + extensões "WSL" e "Claude Code", Supabase CLI 2.122.0 (já é dependência do projeto, roda por `npx`), Playwright 1.64.1, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-etapa-d0-d1-piloto-sede-design.md` (§10, D0-12 a D0-16)

## Global Constraints

- Nunca abrir, listar nem ler a pasta `_temp/`. A cópia da `_temp/` para o desktop é feita **pelo responsável** (pen drive ou OneDrive do ICMBio), nunca pelo GitHub.
- Dados reais podem existir nos dois computadores **até o encerramento da D5**; depois, só no institucional (D0-13).
- Docker no desktop institucional: **Docker Engine no WSL**; não instalar Docker Desktop nele (licença paga para o porte do ICMBio).
- Push automático só da **branch de trabalho**, nunca da `main` (D0-12). Merge e PR só a pedido.
- Mesmo caminho do projeto nos dois computadores: `~/projetos/cgov-riscos` (mantém iguais os comandos dos guias).
- Node: mínimo **22** (o Dockerfile usa `node:22-alpine`); versão recomendada **24** (`.nvmrc`).
- Código e documentação com comentários didáticos em português do Brasil. Commits `tipo(escopo): resumo` com a linha `Co-Authored-By`.

## Review Focus

- Docker instalado mas **parado** (o WSL abriu sem o serviço): o verificador deve dizer "Docker não está respondendo" com a dica `sudo service docker start`, e não "Docker não instalado".
- Docker Desktop no computador de casa: o verificador **aceita** (é outro computador, D0-14 vale só para o institucional), mas apenas informa qual motor encontrou.
- Supabase CLI chamado por `npx` sem internet ou sem `npm ci`: a saída vem vazia ou com erro; o verificador deve dizer "rode `npm ci`", e não travar.
- Saída de versão com prefixo ou texto extra (`v24.21.0`, `Docker version 28.1.1, build 4eba377`, `gh version 2.63.0 (2025-...)`): a leitura da versão precisa funcionar nos três formatos.
- `git pull --ff-only` que falha (o mesmo arquivo foi mudado nos dois computadores): o guia diz para **parar e pedir ajuda ao Claude**, nunca forçar.

---

### Task 1: Verificador do ambiente (`npm run verificar:ambiente`)

**Files:**
- Create: `scripts/verificar-ambiente/regras.ts` (funções puras, testadas)
- Create: `scripts/verificar-ambiente/index.ts` (roda os comandos e imprime o resultado)
- Create: `.nvmrc` (conteúdo: `24`)
- Modify: `package.json` (script `"verificar:ambiente": "vite-node scripts/verificar-ambiente/index.ts"` e `"engines": { "node": ">=22" }`)
- Test: `tests/unit/verificarAmbiente.spec.ts`

**Interfaces:**
- Produces (em `regras.ts`):
  - `type Ferramenta = 'node' | 'npm' | 'git' | 'gh' | 'docker' | 'supabase' | 'chromium'`
  - `interface Leitura { ferramenta: Ferramenta; saida: string | null; erro?: string }` (`saida` = texto que o comando imprimiu; `null` se o comando não existe ou falhou)
  - `interface Veredito { ferramenta: Ferramenta; ok: boolean; mensagem: string; dica?: string }`
  - `lerVersao(saida: string): string | null`: primeira versão `X.Y.Z` encontrada no texto
  - `compararVersoes(a: string, b: string): number` (negativo, zero ou positivo)
  - `avaliarAmbiente(leituras: Leitura[], versaoSupabaseEsperada: string): Veredito[]`
- Regras de `avaliarAmbiente`:
  - node ≥ 22.0.0; npm ≥ 10.0.0; git qualquer versão.
  - gh: ok se a saída contém `Logged in`; senão, dica `gh auth login`.
  - docker: a leitura vem de `docker version --format '{{.Server.Version}}|{{.Server.Platform.Name}}'`. `null` com erro contendo `Cannot connect`, `failed to connect` ou `daemon` → mensagem "Docker não está respondendo", dica `sudo service docker start` (Engine no WSL) ou "abra o Docker Desktop" (computador de casa). Comando inexistente → "Docker não instalado", dica com o guia. Ok → a mensagem informa se é "Docker Engine" ou "Docker Desktop" (pelo nome da plataforma).
  - supabase: versão igual à de `devDependencies.supabase` do `package.json` (hoje `2.122.0`); `null` → dica `npm ci`.
  - chromium: a leitura é o caminho do executável do Playwright (`chromium.executablePath()`) e se o arquivo existe; ausente → dica `npx playwright install --with-deps chromium`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/unit/verificarAmbiente.spec.ts`:
  - `lerVersao('v24.21.0') === '24.21.0'`; `lerVersao('Docker version 28.1.1, build 4eba377') === '28.1.1'`; `lerVersao('gh version 2.63.0 (2025-01-01)') === '2.63.0'`; `lerVersao('sem número') === null`.
  - `compararVersoes('22.0.0', '24.21.0') < 0`; `compararVersoes('10.9.2', '10.9.2') === 0`.
  - node `v20.11.0` → `ok: false` e mensagem com "22"; node `v24.21.0` → `ok: true`.
  - docker `saida: null, erro: 'failed to connect to the docker API'` → `ok: false`, mensagem contém "não está respondendo", dica contém `sudo service docker start`.
  - docker `saida: '28.1.1|Docker Engine - Community'` → `ok: true`, mensagem contém "Docker Engine".
  - docker `saida: '28.1.1|Docker Desktop 4.40.0 (187762)'` → `ok: true`, mensagem contém "Docker Desktop".
  - supabase `saida: '2.120.0'` com esperada `2.122.0` → `ok: false`, dica contém `npm ci`.
  - gh `saida: 'github.com\n  ✓ Logged in to github.com account x'` → `ok: true`; `saida: 'You are not logged into any GitHub hosts'` → dica `gh auth login`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run tests/unit/verificarAmbiente.spec.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar `regras.ts`** com as assinaturas acima, comentado em português (cada regra com um exemplo).
- [ ] **Step 4: Rodar e ver passar:** mesmo comando → PASS.
- [ ] **Step 5: Implementar `index.ts`:** roda cada comando com `execSync` dentro de `try/catch` (tempo-limite de 20 s cada; `npx supabase --version` pode baixar na primeira vez), monta as `Leitura`s, imprime uma linha por ferramenta (`✔`/`✘`, mensagem, dica) e sai com código 1 se houver algum `ok: false`. Nunca imprime variáveis de ambiente.
- [ ] **Step 6: Rodar no computador de casa:** `npm run verificar:ambiente` → todas as linhas `✔` (o Docker Desktop pode estar parado: aí a linha do docker é `✘` com a dica "abra o Docker Desktop", o comportamento esperado). Depois `npm test` → todos passando.
- [ ] **Step 7: Commit:** `git add .nvmrc package.json scripts/verificar-ambiente tests/unit/verificarAmbiente.spec.ts && git commit -m "feat(ambiente): verificador das ferramentas de desenvolvimento"`

### Task 2: Guia do computador de trabalho e rotina dos dois computadores

**Files:**
- Create: `docs/02-arquitetura-cgti/guia-computador-de-trabalho.md`
- Modify: `docs/00-memoria/MOC-Radar.md` (link na seção 3)

**Interfaces:**
- Consumes: `npm run verificar:ambiente` (Task 1).
- Produces: o guia seguido na Task 3; as seções têm estes títulos exatos, citados depois: "1. Antes de começar: permissão de administrador", "2. WSL e Ubuntu", "3. Docker Engine no WSL", "4. Node, Git e GitHub", "5. VS Code e Claude Code", "6. Baixar o projeto", "7. Conferir", "8. Trocar de computador", "9. Dados reais e a pasta _temp/", "10. Se der errado".

Conteúdo obrigatório (linguagem para iniciante: cada comando com uma frase sobre o que faz):
- §1: como saber se a conta tem direito de administrador no Windows e o **texto pronto do chamado à CGTI** caso não tenha: pedir a habilitação do WSL2 com Ubuntu e a permissão para instalar o Docker Engine dentro do WSL, com a justificativa (desenvolvimento do sistema RADAR da CGOV; nenhum serviço exposto na rede; Docker Engine é software livre, sem licença paga).
- §2: `wsl --install -d Ubuntu`, criar usuário, ligar o `systemd` em `/etc/wsl.conf` (`[boot]` + `systemd=true`) e `wsl --shutdown`.
- §3: instalação pelo repositório oficial da Docker para Ubuntu (`docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`), `sudo usermod -aG docker $USER`, `sudo systemctl enable --now docker`, teste `docker run hello-world`. Uma caixa "Por que não o Docker Desktop" (D0-14).
- §4: `nvm` → `nvm install` (lê o `.nvmrc`); `git config --global user.name/user.email` (o responsável digita o próprio e-mail; o guia não traz e-mail); `sudo apt install gh` e `gh auth login`.
- §5: VS Code no Windows, extensões "WSL" e "Claude Code"; abrir o projeto com `code .` de dentro do WSL; entrar na conta do Claude. Aviso: a memória do Claude Code é de cada computador; as regras do projeto estão no `AGENTS.md` (D0-16).
- §6: `mkdir -p ~/projetos && cd ~/projetos && gh repo clone lpchagas/cgov-riscos`; `npm ci`; `npx playwright install --with-deps chromium`.
- §7: `npm run verificar:ambiente`, depois `npm run db:start` e a sequência de verificação do projeto (os cinco comandos do `CLAUDE.md`/ESTADO-ATUAL).
- §8 (rotina): **ao chegar:** `git switch <branch>` e `git pull --ff-only`, `npm ci` se o `package-lock.json` mudou, `npm run db:start`. **Ao sair:** pedir ao Claude "encerrar a sessão" (commit + push da branch). Se o pull falhar: não forçar, pedir ajuda ao Claude. Um quadro "o que viaja pelo GitHub e o que não viaja" (código e documentos: sim; `.env`, `_temp/`, banco local, memória do Claude, cópias: não).
- §9: dados reais nos dois até o fim da D5 (D0-13); a `_temp/` é copiada pelo responsável por pen drive ou OneDrive do ICMBio; depois da D5, apagar no computador de casa (comando `rm -rf ~/projetos/cgov-riscos/_temp` digitado por ele).
- §10: problemas comuns (Docker parado, porta 54321 ocupada, `npx` sem internet, `wsl` sem espaço em disco).

- [ ] **Step 1: Escrever o guia** com as seções acima.
- [ ] **Step 2: Conferir** que todo comando citado existe no `package.json` ou é padrão do sistema: `grep -o 'npm run [a-z:]*' docs/02-arquitetura-cgti/guia-computador-de-trabalho.md | sort -u` → cada script aparece em `package.json`.
- [ ] **Step 3: Conferir** que o guia não tem e-mail nem dado pessoal: `grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' docs/02-arquitetura-cgti/guia-computador-de-trabalho.md` → só endereços `@radar.test` (se houver).
- [ ] **Step 4: Linkar no MOC** (seção 3) e fazer o commit: `git commit -m "docs(ambiente): guia do computador de trabalho e rotina dos dois computadores"`

### Task 3: [RESPONSÁVEL] Preparar o desktop institucional

Feita pelo responsável no desktop, com o Claude Code (no computador de casa ou, a partir do §5, no próprio desktop) guiando. Não há código.

- [ ] **Step 1:** Seguir o §1 do guia. Se não houver permissão de administrador, abrir o chamado à CGTI com o texto pronto e **parar a Fase 0 aqui** (as Tasks 1 a 6 do plano da D1 podem continuar no computador de casa).
- [ ] **Step 2:** Seguir os §2 a §6. Ao fim do §5, o Claude Code passa a rodar no próprio desktop.
- [ ] **Step 3:** Rodar `npm run verificar:ambiente` → todas as linhas `✔`, com docker = "Docker Engine".
- [ ] **Step 4:** O responsável copia a `_temp/` para `~/projetos/cgov-riscos/_temp/` no desktop (§9). O Claude **não** confere o conteúdo; confere só que o Git a ignora: `git check-ignore -q _temp && echo ignorada` → `ignorada`.

### Task 4: Primeira verificação completa no desktop e teste da troca de computador

**Files:**
- Create: `docs/02-arquitetura-cgti/decisoes-tecnicas-d.md` (seção "Fase 0", com os resultados; o plano da D1 acrescenta as outras seções)
- Modify: `docs/00-memoria/ESTADO-ATUAL.md` (nova seção "Etapa D", com a Fase 0)

- [ ] **Step 1:** No desktop, na ordem: `npm test`, `npm run build`, `npm run test:a11y`, `npm run db:start` e `npm run db:funcoes` (em outro terminal) + `npm run test:integracao`, `npm run db:reset && npm run test:db`. Esperado: os mesmos números da última verificação da etapa C (540 testes; a11y 314 passaram com 0 violações; integração 29; pgTAP 840 com `Result: PASS`), ou mais, se a Task 1 acrescentou testes.
- [ ] **Step 2:** Registrar os números e o tempo da varredura em `decisoes-tecnicas-d.md` (seção "Fase 0"), com as decisões D0-12 a D0-16.
- [ ] **Step 3:** Teste da troca: commit no desktop (`docs(estado): fase 0 da D1 concluída no desktop institucional`), push da branch; no computador de casa, `git pull --ff-only` traz o commit. Esperado: sem conflito.
