# F3 – Validação e aprovação do Plano (minuta atual, como está no texto)

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v1, conferido em 20/11/2026 (sem alteração; retrato da minuta, não da proposta)
**Substitui:** —
**Escopo:** Retrato fiel do item 4.6 da minuta, com as lacunas. Serve de base de comparação para o F3 v3.
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F3 – Validação e aprovação do Plano (minuta atual, como está no texto)](03_F3_minuta-atual.png)

```mermaid
---
title: F3 – Validação e aprovação do Plano (minuta atual, como está no texto)
---
graph TD
P0([Gatilho: gestor identifica risco crítico])
P1[Gestor: comunica o risco crítico à CGOV]
P2[CGOV: verifica completude e consistência metodológica]
P3{Informações completas e consistentes?}
P_TRAVA1([⚠️ Lacuna: devolução, prazo e responsável não previstos])
P4(CGOV: consolida o Plano de Gestão de Riscos único)
P5[CTGRIC: manifesta-se sobre o Plano]
P6{CIG aprova o Plano?}
P_TRAVA2([⚠️ Lacuna: a minuta não diz o que ocorre na reprovação])
P7([Fim: Plano aprovado, segue para monitoramento])

P0 --> P1
P1 --> P2
P2 --> P3
P3 -->|Não| P_TRAVA1
P3 -->|Sim| P4
P4 --> P5
P5 --> P6
P6 -->|Sim| P7
P6 -->|Não| P_TRAVA2
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class P_TRAVA1,P_TRAVA2 lacuna
```

Os nós em amarelo marcam lacunas apontadas pela modelagem.

## Alertas do tipo F3-NN (títulos; o estado de cada um está no documento de origem e no `NT_ESTADO.md`)

- **F3-01** · CTGRIC fora do 4.6
- **F3-02** · Sem devolução nem reprovação
- **F3-03** · Cadência do CIG e revisões
- **F3-04** · O fluxo do aplicativo não tem base nas minutas
