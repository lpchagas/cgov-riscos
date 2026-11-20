# F4 v2, parte 3 – Relatórios, avaliação gerencial anual e avaliação independente

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v2, 20/11/2026
**Substitui:** F4 do projeto no Mermaid
**Escopo:** Relatórios trimestrais, avaliação gerencial anual da CGOV e avaliação independente da AUDIT (Metodologia, item 5).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F4 v2, parte 3 – Relatórios, avaliação gerencial anual e avaliação independente](08_F4_v2_parte3_relatorios-avaliacao-anual.png)

```mermaid
---
title: F4 v2, parte 3 – Relatórios, avaliação gerencial anual e avaliação independente
---
graph TD
IN(["Entrada: informações consolidadas pela CGOV"])
R1["CGOV: relatório trimestral ao CTGRIC e ao CIG com carteira de riscos críticos, controles e KRI. Sem a maturidade"]
INST["CTGRIC supervisiona o monitoramento do Plano; CIG aprecia os reportes"]
GA(["Gatilho: avaliação anual. ⚠️ F4-17: data-base não definida"])
A1["CGOV: avaliação gerencial anual de efetividade, adequação e maturidade"]
A2["CGOV: relatório gerencial com recomendações ao CTGRIC e ao CIG"]
A3["CGOV: dá ciência da avaliação gerencial à AUDIT. ⚠️ Prazo não previsto"]
AU1["AUDIT: prioriza a avaliação independente no PAINT"]
AU2("AUDIT: avaliação independente da eficácia, na 3ª linha")
T3(["⚠️ F4-18: destino da avaliação independente fora do fluxo"])
FIM(["Fim do ciclo: o monitoramento continua"])
IN --> R1 --> INST --> FIM
GA --> A1 --> A2 --> INST
A2 --> A3 --> AU1 --> AU2
AU2 -.-> T3
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class T3 lacuna
```

Os nós em amarelo marcam lacunas apontadas pela modelagem.

## Alertas do tipo F4-NN (títulos; o estado de cada um está no documento de origem e no `NT_ESTADO.md`)

- **F4-01** · "Relevantes" sem definição
- **F4-02** · O alerta do KRI não tem consequência
- **F4-03** · Reavaliação periódica citada e não definida
- **F4-10** · Prazo para definir o KRI de risco que passa a ser crítico
- **F4-11** · Dois relógios de 10 dias úteis para o mesmo fato
- **F4-12** · A cobrança não tem gatilho nem periodicidade, e a CGOV só cobra o que vê
- **F4-13** · O acompanhamento e a cobrança alcançam só a carteira crítica, e a reavaliação anual alcança todo risco registrado
- **F4-14** · A decisão da CGOV sobre revisão do Plano não tem prazo, forma nem critério além do 4.6.9
- **F4-15** · Revisão substancial reprovada pelo CIG fica sem desfecho (lacuna terminal)
- **F4-16** · A informação ao CTGRIC sobre a pendência persistente chega só no relatório trimestral seguinte
- **F4-17** · Avaliação anual sem data-base e ciência à AUDIT sem prazo
- **F4-18** · O destinatário da avaliação independente da AUDIT está fora do fluxo
