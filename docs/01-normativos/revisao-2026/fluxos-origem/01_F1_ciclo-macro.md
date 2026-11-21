# F1 – Ciclo de gestão de riscos (macro)

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v2, atualizado em 20/11/2026
**Substitui:** F1 do projeto no Mermaid (antes das escolhas de F4-01, F4-06 e F5-08)
**Escopo:** Visão macro do ciclo: contexto, análise, avaliação, tratamento, aprovação do Plano, monitoramento e avaliação (Metodologia, itens 4.1 a 5).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F1 – Ciclo de gestão de riscos (macro)](01_F1_ciclo-macro.png)

```mermaid
---
title: F1 – Ciclo de gestão de riscos (macro)
---
graph TD
INICIO([Gatilho do ciclo: não definido nas minutas])
CIG_DAR(CIG: define o apetite e aprova a DAR)
DAR_OK{DAR formalizada?}
FIM_TRAVADO([⚠️ Lacuna: sem DAR não há regra para definir risco crítico])
GES_CTX(Gestor de riscos: contexto e identificação)
GES_AN(Gestor de riscos: análise com risco inerente, controle e residual)
GES_AV{Residual acima do limite da categoria?}
FIM_ACEITO([Fim: risco aceito, monitorado quando médio])
GES_TRAT(Gestor de riscos: tratamento e KRI, só para risco crítico)
CGOV_PLANO(CGOV, CTGRIC, CIG e Presidente: consolidação, manifestação, aprovação e publicação do Plano)
GES_MON(Gestor de riscos: monitoramento, KRI, registro e comunicação em 10 dias úteis)
CGOV_REL(CGOV: relatórios trimestrais ao CTGRIC e ao CIG e avaliação gerencial anual, com a maturidade)
FIM([Fim: ciclo seguinte])

INICIO --> GES_CTX
CIG_DAR -.-> DAR_OK
GES_CTX --> GES_AN
GES_AN --> DAR_OK
DAR_OK -->|Não| FIM_TRAVADO
DAR_OK -->|Sim| GES_AV
GES_AV -->|Não| FIM_ACEITO
GES_AV -->|Sim: risco crítico| GES_TRAT
GES_TRAT --> CGOV_PLANO
CGOV_PLANO --> GES_MON
GES_MON -->|Risco emergente ou perda de eficácia do controle| GES_AN
GES_MON -->|Mudança substancial do Plano| CGOV_PLANO
GES_MON --> CGOV_REL
CGOV_REL --> FIM
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class FIM_TRAVADO lacuna
```

Os nós em amarelo marcam lacunas apontadas pela modelagem.

## Alertas do tipo F1-NN (títulos; o estado de cada um está no documento de origem e no `NT_ESTADO.md`)

- **F1-01** · Gatilho e seleção dos objetos indefinidos
- **F1-02** · A DAR não tem fluxo nem regra de transição
- **F1-03** · Quase nenhum prazo
- **F1-04** · Portaria 975/2021 não é revogada
- **F1-05** · Competências (levar à AUDITORIA_COMPETENCIAS)
