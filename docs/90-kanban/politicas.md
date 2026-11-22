# Políticas do quadro Kanban do RADAR

O quadro está em [[quadro]] (plugin **Kanban** do Obsidian). Esta página diz como ele funciona.
Decisão de adotar o Kanban: [[0002-gerir-trabalho-em-kanban-no-obsidian]].

## Formato do cartão

`[tipo] título · origem · IDs ligados (RF-, UC-, LAC-) · #classe`

**Tipos:** `[normativo]`, `[funcional]`, `[dados]`, `[interface]`, `[figma]`, `[documentação]`, `[dívida]`.

**IDs ligados:** as lacunas LAC-01 a LAC-15 já existem ([[lacunas-norma-sistema]], Tarefa 7); RF e UC vêm nas Tarefas 10 e 12 do plano de reestruturação.
Os cartões `[normativo]` citam a LAC e os RF da lacuna. Os demais trazem a **origem** (arquivo e código da
pendência, ex.: `decisoes-tecnicas-b3 §3`) e os RF, RN ou RNF que ganharam na Tarefa 19. Fica `—` só onde
não há requisito a ligar (errata de comentário, decisão de documentação); esses cartões não vão para
"Pronto para iniciar", porque a Definição de Pronto exige o ID.

**Falta de requisito:** se o cartão trata de algo que nenhum RF, RN ou RNF cobre (ex.: senha do banco na
linha de comando), o primeiro passo é escrever o requisito que falta no catálogo, com a coluna Origem, e
ligar o cartão ao ID novo. Só então ele cumpre a Definição de Pronto.

## Ordem do Backlog

Definida na Tarefa 19 ([[analise-lacunas-codigo-requisitos]] e
[[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]]). O Backlog fica de cima para baixo nesta
ordem, e quem puxa trabalho pega o primeiro cartão que cumpre a Definição de Pronto:

1. **Prioridade 1:** lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15), os desenhos do
   Figma de que elas dependem (P-01 e P-02 e, só pelo RF-130 da LAC-08, o P-10, cuja outra parte é da
   LAC-02) e o importador antes da primeira carga real.
2. **Prioridade 2:** dívida de dados que muda o esquema (para não migrar duas vezes).
3. **Prioridade 3:** o restante: lacunas omissas (puxadas quando a portaria for publicada), ajustes
   funcionais, testes, Figma e documentação.

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
- liga pelo menos um RF, RN, RNF ou LAC;
- se mexe em dados, cita a tabela; e
- as dependências que o cartão indica já estão cumpridas (ex.: o desenho aprovado no Figma pela CGOV,
  antes de um cartão que pede tela nova).

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
