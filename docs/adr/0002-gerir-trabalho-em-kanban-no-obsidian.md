# ADR-0002: Gerir o trabalho do RADAR em Kanban no Obsidian

## Status

Accepted

Data: 2026-11-20

## Contexto

O projeto andou por etapas lineares (A, B1, B1.1, B2, B3, C, D), cada uma com um plano grande. As
pendências ficaram espalhadas em vários arquivos (`ESTADO-ATUAL`, `decisoes-tecnicas-*`, design system),
sem lista única, sem limite de trabalho em andamento e sem regra de entrada e saída. A documentação já
vive no cofre Obsidian, versionada no Git. O responsável é iniciante e quer uma ferramenta simples.

## Decisão

Decisão do responsável pelo projeto: nós vamos gerir o trabalho do RADAR em Kanban, num quadro Markdown
no Obsidian com o plugin Kanban, em `docs/90-kanban/`. O quadro é `quadro.md` e as regras (colunas,
limites de WIP, classes de serviço, DoR e DoD) estão em `politicas.md`.

## Consequências

**Positivas**
- Uma única lista de pendências, visível e versionada junto com o código e a documentação.
- Sem custo, sem conta externa e sem dado do ICMBio fora do repositório.

**Negativas**
- O limite de WIP não é imposto pela ferramenta: depende de disciplina.
- Métricas (lead time, vazão) são anotadas à mão.
- Sem notificações, atribuição de pessoas nem integração automática com o Git.

**Neutras**
- Os cartões apontam para RF, UC e LAC por ID, então o quadro depende da rastreabilidade em dia.

## Alternativas consideradas

- GitHub Projects: exige conta e mantém o fluxo fora do cofre onde o trabalho é lido.
- Planilha: sem colunas visuais nem histórico em texto simples no Git.
- Trello ou Jira: serviço externo, com custo e dados do órgão fora do repositório.
