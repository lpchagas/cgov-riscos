# ADR-0015: Fluxo híbrido Figma ↔ código com Code Connect

## Status

Accepted

Data: 2026-11-14 (manual do fluxo) e 2026-11-16 (regras do Figma no AGENTS.md); registrada em ADR em 2026-11-21.

Origem: [[manual-fluxo-figma-vscode]]; AGENTS.md ("Regras do Figma"); [[ESTADO-ATUAL]] (Fase 2 da reformulação da interface).

## Contexto

O responsável é iniciante em programação e desenha melhor no Figma do que em CSS. As telas precisam
continuar fiéis aos componentes Vue e aos tokens (`tokens.css`). O plano do Figma não permite que o Claude
ligue o Code Connect pelo MCP.

## Decisão

Nós vamos trabalhar num arquivo Figma ("RADAR — Painel") com a **biblioteca de componentes** ligada aos `.vue`
pelo **Code Connect**, variáveis espelhando os tokens e cada tela em um par **Original (travada) × Trabalho
(editável)**. O responsável liga o Code Connect **à mão**, no Dev Mode; ao mudar um componente, o Claude
entrega a lista "O que você precisa fazer no Figma" e a tabela de 4 colunas.

## Consequências

**Positivas**
- Desenho e código evoluem juntos; a Original travada permite comparar o que mudou.
- Componentes e tokens têm fonte única.

**Negativas**
- Passos manuais: republicar a biblioteca e ligar o Code Connect.
- O Figma pode ficar defasado do código (ex.: cópias de Trabalho com rodapé antigo).

**Neutras**
- O conjunto `Icone` fica sem ligação; no código os ícones são Font Awesome.

## Alternativas consideradas

- **Só código, sem Figma:** a revisão visual pela CGOV fica mais difícil.
- **Ligar o Code Connect pelo MCP:** não permitido pelo plano atual.
