# F2 – Avaliação e tratamento do risco

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v1, conferido em 20/11/2026 (sem alteração)
**Substitui:** —
**Escopo:** Avaliação do residual contra o limite da categoria e escolha da resposta (Metodologia, itens 4.4 e 4.5 e Tabela 8). Continua válido: risco acima do limite é o risco crítico, que já exige KRI (F4-01).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F2 – Avaliação e tratamento do risco](02_F2_avaliacao-tratamento.png)

```mermaid
---
title: F2 – Avaliação e tratamento do risco
---
graph TD
A0([Gatilho: risco residual calculado])
A1{DAR formalizada?}
A_TRAVA([⚠️ Lacuna: a minuta não prevê este caminho])
A2{Residual acima do limite da categoria?}
A3([Fim: aceitar, sem novo controle])
A4[Gestor: identifica causas e consequências]
A5[Gestor: levanta medidas e avalia viabilidade]
A6{Controle com custo-benefício adequado?}
A7(Mitigar: implementar controles)
A8{Há quem compartilhe o risco?}
A9(Compartilhar: terceirizar ou segurar)
A10(Evitar: encerrar o processo)
A11[Gestor: plano de implementação e ao menos um KRI]
A12([Fim: segue para comunicação à CGOV])

A0 --> A1
A1 -->|Não| A_TRAVA
A1 -->|Sim| A2
A2 -->|Não| A3
A2 -->|Sim| A4
A4 --> A5
A5 --> A6
A6 -->|Sim| A7
A6 -->|Não| A8
A8 -->|Sim| A9
A8 -->|Não| A10
A7 --> A11
A9 --> A11
A10 --> A11
A11 --> A12
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class A_TRAVA lacuna
```

Os nós em amarelo marcam lacunas apontadas pela modelagem.

## Alertas do tipo F2-NN (títulos; o estado de cada um está no documento de origem e no `NT_ESTADO.md`)

- **F2-01** · A avaliação compara o nível errado
- **F2-02** · O limite é por categoria e binário
- **F2-03** · Faixa sem classificação
- **F2-04** · A eficácia do controle é autodeclarada
- **F2-05** · Sem saída para risco acima do limite com todas as respostas inviáveis, e sem alçada
