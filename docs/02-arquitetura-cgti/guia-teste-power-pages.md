# Guia do Teste do Power Pages (etapa D1, Task 7, passo 1)

> Este guia serve para o responsável decidir **onde publicar o front do piloto** (decisão D0-8 de
> [[decisoes-tecnicas-d]]). O front vai para o **Power Pages** só se as **quatro condições** abaixo
> forem verdadeiras. Se qualquer uma falhar, ele vai para o **Cloudflare Pages**. Desenho: seção 6.2 de
> [[2026-11-17-etapa-d0-d1-piloto-sede-design]]. Plano: Task 7 de
> `docs/superpowers/plans/2026-11-17-etapa-d1-ambiente-piloto-plan.md`.
>
> Conferido na documentação da Microsoft em 2026-11-27 (Microsoft Learn: "Create and deploy a
> single-page application in Power Pages", "Site visibility in Power Pages", "Power Pages FAQs").

> [!important] O que este teste **não** faz
> Não publica o RADAR, não liga nada ao Supabase e não usa dado nenhum. Você cria um **site de teste
> vazio**, confere as 4 condições e depois pode apagá-lo. A publicação de verdade é o passo 4 da
> Task 7, com **[AUTORIZAÇÃO]**.

## As 4 condições, em uma frase cada

| # | Condição | Por que importa |
| --- | --- | --- |
| 1 | Você consegue **criar um site** em `make.powerpages.microsoft.com` | Sem isso não há onde publicar. |
| 2 | O ambiente é de **produção** | Um ambiente de **avaliação** (*Trial*) expira em cerca de 30 dias, antes do fim do piloto. |
| 3 | O upload de arquivos **`.js`** é permitido | O RADAR é feito de arquivos `.js`; o Dataverse bloqueia essa extensão por padrão. |
| 4 | Um **Coordenador-Geral ou Diretor da Sede** consegue **entrar** no site de teste com a conta do ICMBio | Quem vai usar o piloto precisa conseguir passar do login da Microsoft, com a licença que tiver. |

## Passo a passo

### Condição 1 — criar um site de teste

1. Abra <https://make.powerpages.microsoft.com/> e entre com a sua conta do ICMBio.
2. No alto, à direita, veja o **ambiente** escolhido (o nome aparece ao lado de "Ambiente"). Anote o nome.
3. Clique em **+ Criar um site** (ou *Start from blank*, "começar do zero"). Dê o nome `teste-radar` e
   aceite o endereço sugerido (`*.powerappsportals.com`).
4. Espere a criação (pode levar alguns minutos).

**Passou** se o site aparece na lista **Sites ativos**. **Falhou** se aparecer aviso de que você não
tem permissão para criar sites, ou se nenhum ambiente estiver disponível.

### Condição 2 — o ambiente é de produção

1. Abra o centro de administração: <https://admin.powerplatform.microsoft.com/>.
2. No menu da esquerda, clique em **Gerenciar** → **Ambientes**.
3. Procure o ambiente anotado na condição 1 e olhe a coluna **Tipo**.

**Passou** se o tipo for **Produção** (*Production*). **Falhou** se for **Avaliação** (*Trial*, expira),
**Desenvolvedor** (*Developer*, de uso pessoal) ou se você não conseguir abrir o centro de
administração. *Sandbox* não serve: é ambiente de teste, não de produção.

> [!note] Se você não tem acesso ao centro de administração
> Pergunte à equipe de TI que cuida do Microsoft 365 qual é o **tipo** do ambiente. Sem essa resposta,
> marque a condição 2 como **não confirmada** (vale como falha).

### Condição 3 — upload de `.js` liberado

Ainda no centro de administração, com o ambiente escolhido:

1. Na barra de cima, clique em **Configurações**.
2. Abra **Produto** → **Privacidade + Segurança**.
3. Procure a seção **Anexos bloqueados** (*Blocked Attachments*) e veja se `js` está na lista.

**Passou** se `js` **não** está na lista, ou se você (ou a TI) puder retirá-lo **só ele** e salvar.
**Falhou** se `js` está na lista e ninguém pode tirá-lo. Não mude nenhuma outra extensão.

> [!warning] Mudança no ambiente
> Tirar `js` da lista muda uma configuração do ambiente inteiro, não só do site. Faça só se o ambiente
> for seu ou com o aval da TI.

### Condição 4 — um CG ou Diretor da Sede consegue entrar

1. Volte a <https://make.powerpages.microsoft.com/>, abra o site `teste-radar` e clique em **Editar**.
2. No painel da esquerda, clique em **Segurança** → **Visibilidade do site**. Deixe o site **Privado**
   (é o padrão).
3. No cartão **Conceder acesso ao site**, digite o e-mail institucional de **um** Coordenador-Geral ou
   Diretor da Sede que topou ajudar e clique em **Compartilhar**.
4. Mande para essa pessoa só o endereço do site (`https://teste-radar….powerappsportals.com`) e peça que
   ela abra e entre com a conta do ICMBio.

**Passou** se ela vê a página do site depois do login. **Falhou** se aparecer a mensagem *"You don't have
a valid license to access this website"* ("você não tem licença válida para acessar este site") ou
qualquer outro bloqueio. Essa mensagem quer dizer que falta licença do Power Apps/Power Pages para
usuários internos, e o piloto teria de pedir licenças para cada pessoa.

## Depois do teste

1. Anote o resultado de cada condição (passou, falhou ou não confirmada) e o **tipo** do ambiente.
2. Volte ao Claude Code com, por exemplo: *"Teste do Power Pages: 1 passou, 2 passou (Produção), 3
   falhou, 4 passou."* O Claude registra o resultado em [[decisoes-tecnicas-d]] (D0-8) e segue a
   Task 7 pelo caminho certo, pedindo autorização a cada passo.
3. Se quiser, apague o site de teste: em **Sites ativos**, nos três pontinhos do `teste-radar`,
   **Excluir**.

| Resultado | Caminho |
| --- | --- |
| As 4 passaram | **A, Power Pages**: `pac pages upload-code-site` com o `powerpages.config.json`, site privado com login Entra ID, CSP em `HTTP/Content-Security-Policy`. |
| Qualquer uma falhou ou não foi confirmada | **B, Cloudflare Pages**: conta do responsável (e-mail institucional), endereço `*.pages.dev`, `_headers` e `_redirects` já gerados pelo `preparar:publicacao`. |
