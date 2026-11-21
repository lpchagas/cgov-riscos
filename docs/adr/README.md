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

## Decisões antigas

As decisões das etapas B1, B2, B3, C e D estão nos arquivos `decisoes-tecnicas-*` de
`docs/02-arquitetura-cgti/`, que ficam congelados como histórico. As ainda vigentes serão migradas
para ADRs nas tarefas seguintes do plano de reestruturação.
