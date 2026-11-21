# ADR-0016: Diagramas em Mermaid, UML sem Modelo C4, casos de uso em `flowchart`

## Status

Accepted

Data: 2026-11-20 (diagnóstico e plano da reestruturação); registrada em ADR em 2026-11-21.

Origem: [[2026-11-20-diagnostico-documentacao-radar]] § 4; plano [[2026-11-20-reestruturacao-documentacao-plan]].

## Contexto

A documentação vive no cofre Obsidian, em Markdown versionado no Git, e precisa de diagramas que qualquer pessoa
edite como texto e que o Obsidian e o GitHub renderizem. O responsável é iniciante. O Mermaid não tem
diagrama de casos de uso nativo.

## Decisão

Nós vamos desenhar **todos os diagramas em Mermaid**: fluxos em `flowchart`, o DER em `erDiagram`
(pé-de-galinha) e a UML em `classDiagram`, `sequenceDiagram` e `stateDiagram-v2`. O **diagrama de casos de
uso** será um `flowchart` (ator = nó, fronteira do sistema = `subgraph`, «include» e «extend» como rótulo de
seta). **Não usaremos o Modelo C4.** Cada diagrama é validado antes de entrar no repositório.

## Consequências

**Positivas**
- Diagramas em texto: revisáveis em diff, sem ferramenta paga nem arquivo binário.
- Obsidian e GitHub renderizam sem plugin extra.

**Negativas**
- Layout limitado: diagramas grandes ficam difíceis de ler.
- O caso de uso em `flowchart` é uma convenção nossa, não a notação UML padrão.

**Neutras**
- A visão geral da arquitetura vai em texto, sem C4.

## Alternativas consideradas

- **PlantUML ou draw.io:** exigem ferramenta externa ou arquivo binário.
- **Modelo C4:** decisão do responsável de não adotar.
