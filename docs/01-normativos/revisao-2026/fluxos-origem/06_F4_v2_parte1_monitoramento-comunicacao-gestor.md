# F4 v2, parte 1 – Monitoramento e comunicação pelo gestor

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v2, 20/11/2026 (L-40 aplicado)
**Substitui:** F4 do projeto no Mermaid
**Escopo:** KRI, monitoramento, reavaliação e comunicação à CGOV (Metodologia 4.7.1 e 4.7.2).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F4 v2, parte 1 – Monitoramento e comunicação pelo gestor](06_F4_v2_parte1_monitoramento-comunicacao-gestor.png)

```mermaid
---
title: F4 v2, parte 1 – Monitoramento e comunicação pelo gestor
---
graph TD
GAT(["Gatilho: Plano aprovado, com risco crítico, medida de tratamento e KRI"])
G1["GES: define ao menos um KRI por risco crítico, com limite de alerta e responsável"]
G2["GES: monitora de forma contínua riscos, controles, tratamento e KRI, e registra"]
D1{"KRI no limite de alerta, fato do item 4.7.2 ou reavaliação anual vencida?"}
G3["GES: reavalia o risco. Piso anual; período menor a critério do gestor"]
D2{"Há fato do item 4.7.2, inclusive materialização de risco crítico, ou resultado de alerta a comunicar?"}
G4["GES: comunica à CGOV em até 10 dias úteis da ciência do fato ou do alerta. A comunicação do alerta supre a do 4.7.2, I a III, quando coincidirem"]
T1(["⚠️ F4-10: prazo para definir KRI de risco que passa a ser crítico não previsto"])
OUT(["Segue para a parte 2: CGOV recebe a comunicação"])
GAT --> G1 --> G2 --> D1
D1 -->|Não| G2
D1 -->|Sim| G3 --> D2
D2 -->|Não| G2
D2 -->|Sim| G4 --> OUT
G1 -.-> T1
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class T1 lacuna
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
