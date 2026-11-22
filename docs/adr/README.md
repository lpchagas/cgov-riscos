# Registros de Decisão Arquitetural (ADR)

Um **ADR** é uma ficha curta (1 a 2 páginas) que explica *uma* decisão importante do sistema: o
problema, o que foi decidido e o que isso custa. Usamos o modelo de Michael Nygard.

## Regras em linguagem simples

1. Arquivo: `docs/adr/NNNN-slug-em-kebab-case.md`, numeração em sequência, sem lacunas.
2. Seções: Status, Contexto, Decisão, Consequências (e, opcionalmente, Alternativas consideradas).
3. Status possíveis: `Proposed`, `Accepted`, `Deprecated` ou `Superseded by ADR-NNNN`.
4. ADR `Accepted` é **imutável**: só o Status muda, quando outro ADR o substitui.
5. Para criar um novo, copie [[0000-modelo]].
6. O teste `tests/unit/documentacao.spec.ts` confere sequência, seções, status e tamanho (até 120 linhas).

## Índice

| ADR | Título | Status |
| --- | --- | --- |
| [[0001-registrar-decisoes-em-adr-nygard]] | Registrar decisões arquiteturalmente significativas em ADRs | Accepted |
| [[0002-gerir-trabalho-em-kanban-no-obsidian]] | Gerir o trabalho do RADAR em Kanban no Obsidian | Accepted |
| [[0003-gravar-valores-calculados-no-risco]] | Gravar os valores calculados no risco | Accepted |
| [[0004-usar-vue3-typescript-govbr-ds]] | Usar Vue 3, TypeScript e `@govbr-ds/core` no front-end | Accepted |
| [[0005-usar-postgresql-supabase-com-rls]] | Usar PostgreSQL/Supabase com RLS como fronteira de segurança | Accepted |
| [[0006-ler-inerente-do-quadro-7-no-banco-com-espelho-em-typescript]] | Ler o Inerente da tabela do Quadro 7 no banco, com espelho em TypeScript | Accepted |
| [[0007-supabase-local-docker-e-pgtap]] | Desenvolver e testar com Supabase local em Docker e pgTAP | Accepted |
| [[0008-login-por-link-de-email-so-para-convidados]] | Login por link de e-mail só para convidados (`token_hash`) | Accepted |
| [[0009-dois-modos-demonstracao-e-real]] | Dois modos de execução: demonstração (sem `.env`) e real | Accepted |
| [[0010-operacoes-privilegiadas-em-edge-function]] | Operações privilegiadas em Edge Function; `service_role` só no servidor | Accepted |
| [[0011-fluxo-em-tres-degraus-com-segregacao]] | Fluxo em 3 degraus com segregação "sobe um nível" | Accepted |
| [[0012-mudanca-da-dar-recalcula-e-reabre-aprovados]] | Mudança da DAR recalcula os aprovados e reabre os que viram Críticos | Accepted |
| [[0013-estrutura-e-cadeia-de-valor-importadas-com-retrato-versionado]] | Estrutura e Cadeia de Valor importadas do SharePoint, com retrato versionado | Accepted |
| [[0014-entregar-em-conteiner-docker-com-nginx]] | Entregar à CGTI em contêiner Docker com Nginx | Accepted |
| [[0015-fluxo-hibrido-figma-codigo-com-code-connect]] | Fluxo híbrido Figma ↔ código com Code Connect | Accepted |
| [[0016-diagramas-em-mermaid-sem-c4]] | Diagramas em Mermaid, UML sem Modelo C4, casos de uso em `flowchart` | Accepted |
| [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti]] | Fechar as lacunas que bloqueiam a homologação antes de levar o RADAR à CGTI | Accepted |
| [[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1]] | Manter o fluxo interno de 3 degraus como etapa anterior à comunicação do item 4.6.1 | Accepted |
| [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica]] | Categorias do Quadro 2 e subcategorias do Quadro 3 literais, sem conversão automática | Accepted |

## Decisões antigas

As decisões das etapas B1, B2, B3, C e D estão nos arquivos `decisoes-tecnicas-*` de
`docs/02-arquitetura-cgti/`, **congelados em 2026-11-21** como histórico (cada um aponta para os ADRs vigentes).
Os ADRs 0004 a 0016 são retroativos: registram cada decisão como foi tomada, com a data original.
O `decisoes-tecnicas-d.md` também já está congelado (ADR-0001): decisões novas da etapa D vão em ADRs.
