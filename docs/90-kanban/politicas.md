# Políticas do quadro Kanban do RADAR

O quadro está em [[quadro]] (plugin **Kanban** do Obsidian). Esta página diz como ele funciona.
Decisão de adotar o Kanban: [[0002-gerir-trabalho-em-kanban-no-obsidian]].

## Formato do cartão

`[tipo] título · origem · IDs ligados (RF-, UC-, LAC-) · #classe`

**Tipos:** `[normativo]`, `[funcional]`, `[dados]`, `[interface]`, `[figma]`, `[documentação]`, `[dívida]`.

**IDs ligados:** as lacunas LAC-01 a LAC-15 já existem ([[lacunas-norma-sistema]], Tarefa 7); RF e UC vêm nas Tarefas 10 e 12 do plano de reestruturação.
Os cartões `[normativo]` já citam a LAC. Os demais trazem a **origem** (arquivo e código da pendência, ex.:
`decisoes-tecnicas-b3 §3`) e `—` no lugar dos IDs. Eles ficam no **Backlog** até ganharem IDs
(Tarefa 19), pois a Definição de Pronto exige o ID.

## Colunas e limites de trabalho em andamento (WIP)

O plugin não impõe o limite: ele vai no nome da coluna e depende de disciplina.

| Coluna | Limite (WIP) |
| --- | --- |
| Backlog | sem limite |
| Pronto para iniciar | máx. 5 |
| Modelagem | máx. 3 |
| Desenvolvimento | máx. 2 |
| Revisão | máx. 2 |
| Homologação CGOV | máx. 3 |
| Concluído | sem limite |

Coluna cheia: ninguém puxa cartão novo para ela. Primeiro se termina (ou destrava) o que já está lá.

## Classes de serviço

| Classe | Significado |
| --- | --- |
| `#normativo` | Lacuna de norma: passa à frente quando a portaria é publicada. |
| `#data-fixa` | Tem prazo externo que não muda. |
| `#padrao` | Trabalho comum, na ordem de chegada. |
| `#divida` | Dívida técnica: arrumar a casa, sem mudar o que o usuário vê. Vale também para errata de documentação e de comentários. |

## Definição de Pronto (DoR)

O cartão só vai para "Pronto para iniciar" se:
- liga pelo menos um RF, RN ou LAC; e
- se mexe em dados, cita a tabela.

## Definição de Concluído (DoD)

O cartão só vai para "Concluído" se:
- os testes estão verdes: `npm test`, `test:db` e, quando houver tela, `test:a11y`;
- a rastreabilidade está atualizada;
- há ADR, quando houve decisão; e
- o `ESTADO-ATUAL` está atualizado.

## Métricas

Anotar à mão, no fim deste arquivo: **lead time** (dias entre entrar no quadro e chegar em Concluído)
e **vazão semanal** (cartões concluídos por semana).

| Semana | Cartões concluídos | Lead time médio (dias) |
| --- | --- | --- |
| — | — | — |
