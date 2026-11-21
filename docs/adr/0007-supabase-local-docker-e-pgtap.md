# ADR-0007: Desenvolver e testar com Supabase local em Docker e pgTAP

## Status

Accepted

Data: 2026-11-15 (etapa B1); registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b1.md` (R1, R2, R4, R13); [[guia-supabase-local]]; `package.json` (`db:reset`, `test:db`).

## Contexto

As regras de acesso e de fluxo moram no banco (ver [[0005-usar-postgresql-supabase-com-rls]]) e precisam de
teste automático por perfil. O banco remoto era de uma versão antiga, incompatível com as migrações, e mexer
nele depende de autorização. Dados pessoais não podem ir para a nuvem sem aval.

## Decisão

Nós vamos desenvolver e testar contra o **Supabase local (CLI, em contêineres Docker)**, e escrever os testes
do banco em **pgTAP** (`supabase/tests/*.test.sql`, rodados por `npm run test:db`). `npm run db:reset` recria
o banco: aplica as migrações, roda o importador com o retrato público da estrutura e planta a semente de
demonstração (usuários `@radar.test`).

## Consequências

**Positivas**
- Qualquer pessoa, inclusive a CGTI, recria o banco e roda os testes sem acesso à nuvem.
- Cada regra de RLS e de fluxo tem teste por perfil.

**Negativas**
- Exige Docker instalado e um comando de reset que depende do nome do contêiner (R13).
- pgTAP é pouco conhecido; ler uma falha pede aprendizado.

**Neutras**
- Os testes do front rodam à parte, no Vitest (`npm test`).

## Alternativas consideradas

- **Testar só no banco da nuvem:** arriscado e dependente de autorização a cada passo.
- **Testar a segurança só pelo front:** não prova a RLS.
