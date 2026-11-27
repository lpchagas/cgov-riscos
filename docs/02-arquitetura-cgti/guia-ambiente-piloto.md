# Guia do Ambiente do Piloto da Sede (etapa D1)

> Este guia diz **o que existe na nuvem** para o piloto do RADAR na Sede, **como republicar o front**,
> **onde ficam as chaves** e **como conferir** que está tudo certo. Escrito para quem nunca fez isso:
> cada comando vem com uma frase dizendo o que ele faz. Desenho: seção 6.2 de
> [[2026-11-17-etapa-d0-d1-piloto-sede-design]]. Decisões: [[decisoes-tecnicas-d]] (D1-5, D1-10 e D1-11).
> Banco: [[guia-supabase-nuvem]]. Cópia: [[guia-copia-restauracao]].

> [!warning] Ainda sem usuários
> Em 2026-11-27 o site está no ar, mas **ninguém consegue entrar**: não há contas, o cadastro avulso
> está desligado e o RADAR pede o link de acesso com `shouldCreateUser: false` (nenhum e-mail sai para
> quem não está cadastrado). As contas vêm na D2, e os dados reais só depois do Registro de Decisão
> assinado ([[registro-decisao-piloto-sede]]).

## 1. O que existe na nuvem

| Peça | Onde | Detalhe |
| --- | --- | --- |
| Banco, login e API | Supabase, projeto `cgov-riscos-v3.0` (ref `bekqcwaolpbhpxzcdyhx`), plano gratuito | 19 migrações, a última `20261123003` (2026-11-25); sem dados reais; cadastro avulso e login anônimo desligados. |
| Front (site) | Cloudflare Pages, projeto `radar-icmbio`, na conta **pessoal** do responsável (D1-11) | <https://radar-icmbio.pages.dev>; publicado em 2026-11-27; ramo de produção `main`. |
| Site URL do login | Supabase → *Authentication* → *URL Configuration* | Site URL `https://radar-icmbio.pages.dev`; URL de retorno `https://radar-icmbio.pages.dev/entrar/retorno` (2026-11-27). |
| Edge Function `gerenciar-acesso` | **não publicada** | Vai na D2. |

> [!note] Por que o Cloudflare e não o Power Pages
> O teste das 4 condições ([[guia-teste-power-pages]]) falhou na condição 2: o único ambiente onde o
> responsável cria sites é de **Desenvolvedor**, cujos sites não podem ser públicos (D1-10).

## 2. Onde ficam as chaves

| Chave | Pode aparecer no site? | Onde fica |
| --- | --- | --- |
| Endereço do projeto (`https://bekqcwaolpbhpxzcdyhx.supabase.co`) | Sim, é público | No pacote do front (variável `VITE_SUPABASE_URL`, gravada no build). |
| Chave **publicável** (`sb_publishable_…`) | Sim, é feita para isso | No pacote do front (`VITE_SUPABASE_ANON_KEY`). Quem protege os dados é a RLS do banco, não a chave. Pega no painel (*Project Settings → API Keys*) ou pelo MCP `get_publishable_keys`. |
| Chave secreta / `service_role`, senha do banco, URL de conexão | **Nunca** | Só no painel da Supabase e no gerenciador de senhas do responsável. Nunca em arquivo do repositório, log, captura ou conversa. O `npm run conferir:dist` reprova o pacote se ela aparecer. |
| Login do Cloudflare (`wrangler`) | Não se aplica | Fica no computador de quem publica (`npx wrangler login`); hoje, o responsável. |

## 3. Como republicar o front

Faça isso sempre que o código do front mudar e for preciso levar a mudança para o piloto.
**[AUTORIZAÇÃO]** do responsável a cada publicação.

1. Atualize a branch e as dependências:
   ```bash
   git pull --ff-only   # traz a versão mais nova do código
   npm ci               # instala as dependências exatamente como no package-lock.json
   ```
2. Gere o pacote em **modo real** (sem as duas variáveis, o build sai em modo demonstração):
   ```bash
   VITE_SUPABASE_URL=https://bekqcwaolpbhpxzcdyhx.supabase.co \
   VITE_SUPABASE_ANON_KEY=<chave publicável sb_publishable_…> \
   npm run build        # gera a pasta dist/ ligada ao banco do piloto
   ```
3. Confira que nenhum segredo entrou no pacote:
   ```bash
   npm run conferir:dist   # deve dizer "nenhum segredo encontrado"
   ```
4. Gere os arquivos do Cloudflare (`_redirects`, para as rotas do Vue, e `_headers`, com a CSP):
   ```bash
   npm run preparar:publicacao -- --destino cloudflare --origem https://bekqcwaolpbhpxzcdyhx.supabase.co
   ```
5. Publique:
   ```bash
   npx wrangler whoami   # confira que é a conta certa
   npx wrangler pages deploy dist --project-name radar-icmbio --branch main
   ```
   Não use `--force` aqui: ele só foi preciso na criação do projeto, porque o `wrangler` 4.169 tenta
   mandar projetos novos para o Cloudflare Workers.

Cada publicação também ganha um endereço próprio (ex.: `12a54103.radar-icmbio.pages.dev`). O login só
funciona no endereço principal, que é o único cadastrado como URL de retorno.

## 4. Como conferir

| O que conferir | Comando ou lugar | Esperado |
| --- | --- | --- |
| A política de segurança (CSP) não bloqueia nada | `npm run conferir:csp -- https://radar-icmbio.pages.dev/entrar` | "nenhuma violação de CSP nem erro de página" (ok em 2026-11-27). |
| Os cabeçalhos de segurança | `curl -sI https://radar-icmbio.pages.dev/entrar` | `HTTP/2 200`, `content-security-policy` com `connect-src` para `bekqcwaolpbhpxzcdyhx.supabase.co`, `x-frame-options: SAMEORIGIN`, `x-content-type-options: nosniff`, `referrer-policy` (ok em 2026-11-27). |
| O site está em modo real | Abrir <https://radar-icmbio.pages.dev/entrar> | Tela "Entrar no RADAR" **sem** a faixa "Modo demonstração" (ok em 2026-11-27). |
| O banco | [[guia-supabase-nuvem]], seção 7.5 | Migrações, RLS e *Advisors*. |

## 5. Pendências conhecidas

- **Aba "Site" no Teams (D3/D4):** a CSP tem `frame-ancestors 'self'` e o cabeçalho `X-Frame-Options:
  SAMEORIGIN`, que impedem o site de abrir **dentro** do Teams. Quando a aba entrar, será preciso
  liberar o Teams nessa regra (em `scripts/compartilhado/csp.ts`) ou usar a aba como link que abre no
  navegador.
- **Conta pessoal do Cloudflare (D1-11):** na migração para a CGTI (D6), o front sai dessa conta.
- **Cópia agendada e ensaio local:** Task 8 da D1, no desktop institucional.
