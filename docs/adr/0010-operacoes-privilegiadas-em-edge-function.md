# ADR-0010: Operações privilegiadas em Edge Function; `service_role` só no servidor

## Status

Accepted

Data: 2026-11-15 (etapa B2); registrada em ADR em 2026-11-21.

Origem: spec [[2026-11-15-etapa-b2-login-perfis-design]] (§ 8.7); `decisoes-tecnicas-b2.md` (T3, T6);
`supabase/functions/gerenciar-acesso/`.

## Contexto

Criar contas de login e enviar convites exige a chave `service_role`, que ignora a RLS. Se ela chegasse ao
navegador, qualquer pessoa leria e gravaria tudo. A CGOV precisa dessas operações pela tela.

## Decisão

Nós vamos concentrar as operações privilegiadas (criar conta, enviar convite, consultar situação) na **Edge
Function `gerenciar-acesso`**, que confere no servidor se quem chama é da CGOV e só então usa a
`service_role`. Nos scripts de terminal (`sync:estrutura`, `sync:atribuicoes`), a chave vem de um cliente único
(`scripts/compartilhado/clienteServico.ts`) com proteções de destino. A `service_role` **nunca** aparece em `src/`.

## Consequências

**Positivas**
- A chave secreta fica fora do navegador; a regra "só a CGOV" é conferida no servidor.
- Validações em módulo TypeScript puro (`_shared/validacoesAcesso.ts`), testável no Vitest.

**Negativas**
- A função só responde com `npm run db:funcoes` em outro terminal; `test:integracao` exige os dois processos (T3).
- Mais uma peça para publicar e acompanhar na nuvem, sempre com autorização.

**Neutras**
- Limite de 200 ids por pedido em `listar_situacao`.

## Alternativas consideradas

- **Operar com a chave no navegador:** inaceitável.
- **Funções SQL `SECURITY DEFINER` para criar contas:** o Auth não é gerido por SQL de aplicação.
