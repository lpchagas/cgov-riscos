# Dossiê de Implantação em Container Docker — Avaliação da CGTI/ICMBio

> **Destinatário:** Coordenação-Geral de Tecnologia da Informação (CGTI/DIPLAN/ICMBio)  
> **Unidade Proponente:** Coordenação de Governança e Gestão de Riscos (CGOV/CGGE/DIPLAN)  
> **Sistema:** RADAR — Rede de Avaliação, Diagnóstico e Ação em Riscos (`cgov-riscos`)

---

## 1. Resumo Arquitetural para a CGTI

O protótipo funcional do **Sistema Web RADAR** foi desenvolvido seguindo os padrões modernos de engenharia de software recomendados para o Governo Federal:

| Camada | Tecnologia Adotada | Benefício para a Infraestrutura da CGTI |
|---|---|---|
| **Identidade Visual** | `@govbr-ds/core` (v3.7) | 100% aderente ao Padrão Digital de Governo Federal (acessibilidade e responsividade). |
| **Frontend (SPA)** | Vue.js 3 + TypeScript + Vite | Compilação estática (`dist/`) leve (~150 KB comprimido), sem exigência de runtime Node.js em produção. |
| **Banco de Dados** | PostgreSQL 15+ (Supabase / Nativo) | Scripts SQL puros (`supabase/migrations/`) compatíveis com qualquer instância PostgreSQL on-premises da CGTI. |
| **Containerização** | Docker Multi-Stage (`nginx:1.27-alpine`) | Imagem final imutável, sem ferramentas de compilação expostas e pronta para Rancher/Kubernetes/Docker Swarm. |

---

## 2. Comandos para Homologação em Ambiente CGTI

```bash
# Construir a imagem de produção
docker build -t icmbio/cgov-radar:1.0.0 .

# Executar o container na porta 8080
docker run -d --name cgov-radar -p 8080:80 icmbio/cgov-radar:1.0.0
```

---

## 3. Modo demonstração x modo real (argumentos de build)

O Vite grava `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` dentro do JavaScript **na hora do build**. Por isso elas entram como argumentos de build (somente a chave **anon**, pública; nunca a `service_role`):

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=<chave anon> \
  -t icmbio/cgov-radar:real .
```

Sem os argumentos, o app sobe em **modo demonstração** (sem banco). O build termina com `npm run conferir:dist`, que **reprova** a imagem se achar chave de administrador ou senha de banco no pacote.

## 4. Perfil `real-local` do Docker Compose

Serve para provar, no seu computador, o container falando com o Supabase local:

```bash
npm run db:start
cp .env.conteiner-local.example .env.conteiner-local   # preencha a chave anon (npx supabase status)
docker compose --env-file .env.conteiner-local --profile real-local up -d --build
# abra http://localhost:8081
```

O serviço `radar-web-real-local` só sobe com `--profile real-local`; o `docker compose up` simples continua subindo apenas a demonstração (porta 8080). O arquivo `.env.conteiner-local` está no `.gitignore`.

## 5. Cabeçalhos de segurança e CSP

O Nginx envia, em todas as respostas: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e a **Política de Segurança de Conteúdo (CSP)**, que limita de onde o navegador carrega scripts, estilos, fontes e para onde o app pode enviar dados (`connect-src`).

- O texto da CSP nasce em `scripts/compartilhado/csp.ts` e o modelo do Nginx fica em `nginx/default.conf.template`; um teste automatizado garante que os dois são idênticos.
- Em `connect-src` entra o endereço do Supabase, vindo da variável de ambiente **`RADAR_SUPABASE_ORIGEM`** (a imagem oficial do Nginx a aplica no modelo ao iniciar). Em modo real: `docker run -e RADAR_SUPABASE_ORIGEM=https://xxxx.supabase.co ...`. Vazia = só o próprio servidor.
- Scripts só do próprio servidor (sem `unsafe-inline`); `unsafe-inline` existe apenas em estilos, porque o Vue grava `style="..."`.
- Conferência: com o container no ar, `npm run conferir:csp -- http://localhost:8080` abre a página no Chromium e falha (código 1) se houver violação da CSP ou erro de página.
