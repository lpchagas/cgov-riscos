# Relatório Task 1 — Build do front em modo real, sem segredos no pacote

Status: DONE (com 1 observação).

## Implementado
- `.dockerignore` (.env, .env.*, _temp, node_modules, dist, playwright-report, test-results, supabase/.temp, .git, .superpowers, .obsidian, .claude). `tests/` e `scripts/` NÃO excluídos (tsconfig inclui tests/**).
- `Dockerfile`: ARG/ENV VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vazios por padrão) só no estágio `construtor`, antes de `npm run build`, seguido de `RUN npm run conferir:dist`.
- `scripts/conferir-dist/regras.ts` (`procurarSegredos`: JWT service_role decodificando só o payload, `sb_secret_`, conexão postgres com senha; motivo nunca traz o segredo; palavra solta `service_role` não casa) e `index.ts` (pasta ausente -> exit 1 com "rode npm run build antes").
- `package.json`: script `conferir:dist`.

## TDD
- RED: `npx vitest run tests/unit/conferirDist.spec.ts tests/unit/deployConfig.spec.ts` -> 2 arquivos falharam (módulo regras inexistente; .dockerignore ausente).
- GREEN: mesmo comando -> 2 passed, 10 tests passed.
- Completo: `npm test` 50 arquivos / 559 testes passam; `npm run build` ok; `npm run conferir:dist` -> "nenhum segredo encontrado em dist".

## Step 5 (Docker)
- `docker build -t radar-teste .` passou (demo); `grep 127.0.0.1:54321` no html da imagem: 0 ocorrências.
- `docker build --build-arg VITE_SUPABASE_URL=http://127.0.0.1:54321 --build-arg VITE_SUPABASE_ANON_KEY=<anon local> -t radar-teste-real .` passou; URL embutida: 1 arquivo. Chave não impressa.

## Observação
O build do Docker emite aviso `SecretsUsedInArgOrEnv` para ANON_KEY (falso positivo: a chave anon é pública por desenho; está comentado no Dockerfile). As imagens radar-teste e radar-teste-real ficaram locais.
