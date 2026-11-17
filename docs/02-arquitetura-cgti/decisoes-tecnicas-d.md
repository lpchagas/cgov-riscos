# Decisões técnicas da etapa D (piloto da Sede)

> **Para que serve este documento:** reunir, num lugar só e versionado, as decisões da etapa D (D0 e D1) que
> preparam o piloto do RADAR com dados reais da **Sede**. É o irmão de [[decisoes-tecnicas-c]]. Cada linha diz
> **o que** foi decidido; o motivo e as alternativas estão na spec.
>
> Base: [[2026-11-17-etapa-d0-d1-piloto-sede-design]]. Modelo do documento assinado pela Coordenação:
> [[registro-decisao-piloto-sede]].
> Esta etapa **não** mexe em cálculo (Quadros 6, 7 e 8), alcance, RLS nem fluxo.
>
> Códigos: **D0-1 a D0-11** = decisões do responsável pelo projeto em 2026-11-17, antes da execução;
> **D0-12 a D0-16** = decisões sobre os dois computadores de trabalho (mesma data); **D1-1 em diante** =
> decisões tomadas durante a execução da D1.

## 1. Decisões do D0

| # | Tema | Resumo da decisão | Onde está |
| --- | --- | --- | --- |
| D0-1 | Plano do Supabase | Gratuito, região São Paulo; riscos aceitos: pausa por inatividade e falta de backup restaurável do provedor. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-2 | Cópia de segurança | Cópia lógica diária e cifrada, feita no computador do responsável, fora do repositório; 14 diárias + 1 semanal por 2 meses; restauração testada na D1 e repetida todo mês. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 e §6.3 |
| D0-3 | Pausa por inatividade | A cópia diária já acessa o banco; a D1 confirma se basta e, se não, acrescenta uma consulta leve pela API. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-4 | Base legal | Registro de Decisão da CGOV assinado pela Coordenação; aviso ao encarregado de dados e à CGTI, sem esperar resposta; dados reais só depois da assinatura. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-5 | Retenção | Até a homologação da CGTI e a migração, no máximo 6 meses desde a primeira carga real; no fim, exportação e exclusão do projeto em nuvem; cópias apagadas 2 meses depois. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-6 | Quem acessa | Painel do Supabase só o responsável; sistema só contas criadas pela CGOV, com os perfis da matriz de acesso. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-7 | Sucesso do piloto | Cobertura ampla da Sede em 2 a 3 meses, com riscos homologados nas 5 áreas e metas de tempo e de recusa no Importar (números a confirmar pela CGOV). | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 e §9 |
| D0-8 | Onde fica o front | Power Pages se o teste do responsável passar nas 4 condições; senão, Cloudflare Pages; aba "Site" no Teams em qualquer caso. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 e §6.2 |
| D0-9 | Ensaio local | Supabase CLI (`npm run db:start`) + container do front; Supabase auto-hospedado fica para a D6. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 e §6.4 |
| D0-10 | Onde ficam as cópias | A cópia agendada fica só na máquina institucional do responsável (WSL + Docker). | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-11 | Conta do Cloudflare | Conta do responsável, criada com e-mail institucional, endereço `*.pages.dev`; domínio do ICMBio fica para a D6. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3 |
| D0-12 | Sincronização entre computadores | Pelo GitHub; `git pull` no início e push da branch de trabalho (nunca a `main`) no fim; merge, PR e push na `main` só a pedido. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §10 |
| D0-13 | Dados reais nos dois computadores | Permitidos nos dois até o encerramento da D5; depois, só no institucional (o de casa é apagado). | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §10 |
| D0-14 | Docker no institucional | Docker Engine dentro do WSL (Ubuntu), gratuito, em vez do Docker Desktop (licença paga). | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §10 |
| D0-15 | Ordem | A preparação do desktop é a Fase 0 da D1, com plano próprio; só bloqueia as tarefas que exigem a máquina institucional. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §10 |
| D0-16 | Memória do agente | Fica em cada computador e não vai pelo GitHub; as regras que valem para o projeto passam para o `AGENTS.md`, sem dados pessoais. | [[2026-11-17-etapa-d0-d1-piloto-sede-design]] §10 |

A análise das licenças Microsoft que sustenta a D0-8 está na spec, §3.1.

## 2. Fase 0

*(a preencher no desktop institucional)*

## 3. Decisões da execução da D1

| # | O que | Detalhe |
| --- | --- | --- |
| D1-1 | `.dockerignore` | Foi criado, porque antes não existia e `_temp/` e `.env` iam para o contexto do build. A imagem agora também roda `npm run conferir:dist` no build. |
| D1-2 | CSP única | A política de segurança de conteúdo (CSP) fica num só lugar, `scripts/compartilhado/csp.ts`, e é usada no Nginx (modelo com `envsubst`), no `_headers` do Cloudflare e na configuração do Power Pages. |
| D1-3 | Hash do Vite | O hash é detectado como 8 caracteres `[A-Za-z0-9_-]` no fim do nome do arquivo (podem conter `-`), com recuo para o último segmento. |
| D1-4 | Perfil `real-local` | O perfil `real-local` do compose usa a porta 8081 e sobe com `docker compose --env-file .env.conteiner-local --profile real-local up`. |

*(as próximas tarefas da D1 acrescentam linhas aqui)*
