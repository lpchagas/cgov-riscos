# ADR-0014: Entregar à CGTI em contêiner Docker com Nginx

## Status

Accepted

Data: 2026-11-09 (design v2.0 § 4; `Dockerfile` criado no mesmo dia); registrada em ADR em 2026-11-21.

Origem: design v2.0 § 4; `Dockerfile`, `docker-compose.yml`, `nginx/default.conf.template`;
[[guia-docker-cgti]]; `decisoes-tecnicas-d.md` (D1-1, D1-2).

## Contexto

Um dos propósitos do projeto é ser um protótipo que a CGTI/ICMBio possa avaliar e, se aprovar, hospedar em
servidor institucional, sem instalar Node.js à mão. Durante o protótipo, a nuvem gratuita (Vercel) serve de
vitrine.

## Decisão

Nós vamos empacotar o front compilado e um servidor **Nginx** numa imagem Docker em dois estágios (construção
com Node, execução com `nginx:alpine`), com `docker-compose.yml`, para subir com `docker compose up -d --build`.
Os cabeçalhos de segurança, inclusive a CSP, saem de um modelo (`envsubst`) com a política escrita num só
lugar (`scripts/compartilhado/csp.ts`).

## Consequências

**Positivas**
- A CGTI sobe o sistema com um comando, em qualquer servidor com Docker.
- A imagem é pequena e só contém arquivos estáticos.

**Negativas**
- A CGTI precisa operar Docker e o Supabase (o contêiner só serve o front; o banco é outro assunto).
- Manter o `Dockerfile` e o `vercel.json` em paralelo duplica configuração de cabeçalhos.

**Neutras**
- O `.dockerignore` impede `_temp/` e `.env` de entrarem no contexto do build.

## Alternativas consideradas

- **Só Vercel:** não atende à exigência de hospedagem institucional.
- **Máquina virtual com Node:** instalação manual e mais frágil.
