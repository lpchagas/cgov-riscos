# Guia do Computador de Trabalho (Windows + WSL + Docker Engine)

> Este guia leva você, passo a passo, de um Windows "limpo" até um computador que roda o RADAR por
> inteiro: banco local, testes e o Claude Code. Foi escrito para quem nunca usou Docker. Cada comando
> vem com uma frase dizendo o que ele faz. Para o dia a dia do banco, veja [[guia-supabase-local]];
> para o contêiner de homologação da CGTI, veja [[guia-docker-cgti]].

**Regra de ouro:** copie e cole os comandos um de cada vez e leia a resposta antes do próximo.
Linhas que começam com `PS>` são digitadas no **PowerShell do Windows**; as demais, no terminal do
**Ubuntu (WSL)**.

## 1. Antes de começar: permissão de administrador

Instalar o WSL exige direito de administrador no Windows.

**Como saber se você tem:** clique em Iniciar, digite `PowerShell`, clique com o botão direito em
**Windows PowerShell** e escolha **Executar como administrador**. Se o Windows pedir só uma
confirmação ("Sim"), você é administrador. Se pedir usuário e senha de outra pessoa, não é.

Se não tiver o direito, abra um chamado à CGTI com o texto abaixo:

> **Assunto:** Habilitação do WSL2 (Ubuntu) e instalação do Docker Engine no WSL
>
> Solicito a habilitação do recurso WSL2 com a distribuição Ubuntu neste computador e a permissão
> para instalar o Docker Engine dentro do Ubuntu/WSL.
>
> **Justificativa:** desenvolvimento do sistema RADAR (Rede de Avaliação, Diagnóstico e Ação em
> Riscos) da Coordenação de Governança (CGOV). O Docker Engine é software livre, sem licença paga
> (o Docker Desktop, que exige licença para organizações do porte do ICMBio, não será usado).
> Nenhum serviço será exposto na rede: o banco e a aplicação rodam apenas no próprio computador
> (localhost).

## 2. WSL e Ubuntu

O **WSL** é o "Linux dentro do Windows". O projeto roda nele.

1. No PowerShell como administrador:

```powershell
PS> wsl --install -d Ubuntu
```

Instala o WSL e o Ubuntu. Reinicie o computador se o Windows pedir.

2. Ao abrir o Ubuntu pela primeira vez, ele pede um **nome de usuário** e uma **senha**. Anote a
   senha: ela será pedida sempre que um comando começar com `sudo`. (Ao digitar a senha, nada
   aparece na tela; isso é normal.)
3. Ligue o `systemd` (o "gerente de serviços" do Linux, necessário para o Docker iniciar sozinho):

```bash
sudo nano /etc/wsl.conf
```

Abre o arquivo de configuração do WSL no editor `nano`. Escreva exatamente:

```ini
[boot]
systemd=true
```

Salve com `Ctrl+O`, `Enter`, e saia com `Ctrl+X`.

4. No PowerShell:

```powershell
PS> wsl --shutdown
```

Desliga o WSL por completo para que a configuração valha. Abra o Ubuntu de novo em seguida.

## 3. Docker Engine no WSL

> **Por que não o Docker Desktop (decisão D0-14).** O Docker Desktop exige assinatura paga em
> organizações do tamanho do ICMBio. O **Docker Engine** instalado dentro do WSL é livre, gratuito e
> faz o mesmo trabalho para o RADAR. Por isso usamos só o Engine.

Siga os passos do repositório oficial da Docker para Ubuntu.

```bash
sudo apt update
```

Atualiza a lista de programas disponíveis.

```bash
sudo apt install -y ca-certificates curl
```

Instala duas ferramentas de que o próximo passo precisa (certificados e download).

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Cria a pasta de chaves e baixa a chave que prova que os pacotes da Docker são autênticos.

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
```

Registra o repositório oficial da Docker e atualiza a lista de programas de novo.

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Instala o Docker Engine, a linha de comando, o Buildx e o Compose.

```bash
sudo usermod -aG docker $USER
```

Permite que o seu usuário use o Docker sem `sudo`. Feche e abra o Ubuntu para valer.

```bash
sudo systemctl enable --now docker
```

Liga o Docker agora e faz com que ele inicie sozinho nas próximas vezes.

```bash
docker run hello-world
```

Teste final: baixa uma imagem minúscula e imprime "Hello from Docker!". Se aparecer, o Docker
funciona.

## 4. Node, Git e GitHub

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Instala o `nvm`, que gerencia versões do Node.js. Feche e abra o Ubuntu depois.

Mais adiante (seção 6), dentro da pasta do projeto, você rodará:

```bash
nvm install
```

Instala a versão do Node indicada no arquivo `.nvmrc` do projeto (hoje, a 24).

Identifique-se para o Git (**digite o seu próprio nome e e-mail**; este guia não traz nenhum):

```bash
git config --global user.name "Seu Nome"
git config --global user.email "SEU-EMAIL-AQUI"
```

Gravam quem assina os seus commits (as "fotografias" do código).

```bash
sudo apt install -y gh
```

Instala o `gh`, a ferramenta de linha de comando do GitHub.

```bash
gh auth login
```

Entra na sua conta do GitHub (escolha GitHub.com, HTTPS e o login pelo navegador).

## 5. VS Code e Claude Code

1. Instale o **VS Code no Windows** (não dentro do Ubuntu).
2. No VS Code, abra a aba de extensões e instale **WSL** e **Claude Code**.
3. Depois de baixar o projeto (seção 6), abra-o **de dentro do Ubuntu**:

```bash
cd ~/projetos/cgov-riscos
code .
```

Abre o VS Code já conectado ao WSL, na pasta do projeto.

4. No painel do Claude Code, entre na sua conta do Claude.

> **Atenção (D0-16):** a **memória** do Claude Code é guardada **em cada computador** e não viaja
> entre eles. As regras do projeto ficam no arquivo `AGENTS.md`, que vem junto com o código; é ele
> que garante o mesmo comportamento nos dois computadores.

## 6. Baixar o projeto

```bash
mkdir -p ~/projetos && cd ~/projetos && gh repo clone lpchagas/cgov-riscos
```

Cria a pasta `projetos` e baixa o repositório do GitHub para dentro dela.

```bash
cd ~/projetos/cgov-riscos
nvm install
```

Entra na pasta do projeto e instala o Node da versão certa.

```bash
npm ci
```

Instala exatamente as bibliotecas travadas no `package-lock.json`.

```bash
npx playwright install --with-deps chromium
```

Baixa o navegador usado nos testes de acessibilidade (pode pedir a senha do `sudo`).

## 7. Conferir

```bash
npm run verificar:ambiente
```

Confere Node, Git, Docker e demais ferramentas e diz o que falta.

```bash
npm run db:start
```

Liga o banco local (a primeira vez baixa imagens e demora alguns minutos).

Depois, a sequência de verificação do projeto:

```bash
npm test
```

Roda os testes unitários.

```bash
npm run build
```

Confere os tipos (TypeScript) e gera o build de produção.

```bash
npm run test:a11y
```

Roda os testes de acessibilidade no navegador.

```bash
npm run db:funcoes
```

Serve a Edge Function de convites. **Deixe aberto e use outro terminal** para o próximo comando.

```bash
npm run test:integracao
```

Roda os testes de integração (exige `db:start` e `db:funcoes` ligados).

```bash
npm run db:reset && npm run test:db
```

Recria o banco do zero e roda os testes do banco.

Tudo verde? O computador está pronto.

## 8. Trocar de computador

O **GitHub é o ponto de encontro** entre o computador institucional e o de casa. Existe autorização
permanente para `git pull --ff-only` no início da sessão e para o push da branch de trabalho (nunca
da `main`) ao final.

**Ao chegar:**

```bash
cd ~/projetos/cgov-riscos
git switch <nome-da-branch>
git pull --ff-only
```

Vai para a branch de trabalho e traz as novidades do GitHub, só se for um avanço limpo (sem
misturas).

```bash
npm ci
```

Rode **só se** o `package-lock.json` mudou no pull: reinstala as bibliotecas.

```bash
npm run db:start
```

Liga o banco local.

**Ao sair:** peça ao Claude **"encerrar a sessão"**. Ele faz o commit e o push da branch.

**Se o `git pull --ff-only` falhar:** não force nada (nada de `--force` ou `reset --hard`). Peça
ajuda ao Claude; a falha quer dizer que os dois computadores mexeram na mesma branch.

| O que viaja pelo GitHub | O que NÃO viaja |
| --- | --- |
| Código-fonte | Arquivo `.env` |
| Documentos e o cofre Obsidian (`docs/`) | Pasta `_temp/` (dados reais) |
| `AGENTS.md`, `CLAUDE.md` e as regras do projeto | Banco de dados local |
| Migrações e testes | Memória do Claude Code |
| | Cópias de trabalho de arquivos fora do Git |

## 9. Dados reais e a pasta _temp/

Pela decisão D0-13, os **dados reais** podem ficar nos **dois** computadores até o **fim da etapa
D5**. Depois disso, só no computador institucional.

A pasta `_temp/` **não** vai para o GitHub. Quem a copia é você, por **pen drive** ou pelo
**OneDrive do ICMBio**, colocando-a em `~/projetos/cgov-riscos/_temp`.

Ao fim da D5, apague-a no computador de casa, digitando você mesmo:

```bash
rm -rf ~/projetos/cgov-riscos/_temp
```

Apaga a pasta e tudo o que há nela, sem ir para a lixeira. Confira o caminho antes de apertar Enter.

## 10. Se der errado

- **"Cannot connect to the Docker daemon" / Docker parado.** Rode `sudo service docker start` e
  tente de novo (liga o Docker na hora). Se o `systemctl` reclamar, confira o `systemd=true` da
  seção 2.
- **Porta 54321 (ou vizinhas) ocupada.** Outro programa ou outro Supabase usa a porta. Rode
  `npm run db:stop`, feche o outro programa e tente `npm run db:start` outra vez.
- **`npx` ou `npm` sem internet.** Provavelmente o proxy da rede do ICMBio. Teste `curl -I https://registry.npmjs.org`;
  se falhar, peça à CGTI a liberação ou o endereço do proxy.
- **`wsl` sem espaço em disco.** Libere espaço no disco C: e rode `docker system prune` no Ubuntu
  (apaga imagens e contêineres parados; o banco local pode precisar de `npm run db:start` de novo).
- **Dúvida sobre o banco.** Veja [[guia-supabase-local]].
