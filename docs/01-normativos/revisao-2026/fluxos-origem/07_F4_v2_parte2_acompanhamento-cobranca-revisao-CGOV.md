# F4 v2, parte 2 – Acompanhamento, cobrança e revisão do Plano pela CGOV

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v2, 20/11/2026
**Substitui:** F4 do projeto no Mermaid
**Escopo:** Acompanhamento da carteira de riscos críticos, cobrança de pendências e revisão do Plano (Metodologia 4.7.2).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F4 v2, parte 2 – Acompanhamento, cobrança e revisão do Plano pela CGOV](07_F4_v2_parte2_acompanhamento-cobranca-revisao-CGOV.png)

```mermaid
---
title: F4 v2, parte 2 – Acompanhamento, cobrança e revisão do Plano pela CGOV
---
graph TD
IN2(["Entrada: comunicação do gestor ou registros da carteira"])
C1["CGOV: consolida as informações e elabora análises gerenciais"]
C2["CGOV: acompanha a carteira de riscos críticos. Atualização, tempestividade e consistência, sem prejuízo do mérito"]
D1{"Há pendência de atualização, relato ou comunicação?"}
C3["CGOV: cobra o gestor"]
D2{"Persiste por mais de 10 dias úteis após a cobrança?"}
C4["CGOV: dá ciência à chefia imediata e informa o CTGRIC no relatório trimestral seguinte"]
D3{"A situação demanda revisão do Plano?"}
C5["CGOV: atualiza o Plano e informa nos relatórios trimestrais"]
D4{"Mudança substancial, nos termos do item 4.6.9?"}
REV["Rito dos itens 4.6.4 a 4.6.9: CTGRIC manifesta-se e CIG aprova"]
RJ["CGOV: ajusta e reapresenta em até 30 dias. Plano anterior segue vigente, itens 4.6.8 e 4.6.9"]
OUT2(["Segue para a parte 3: relatórios e avaliações"])
IN2 --> C2 --> D1
D1 -->|Não| C1
D1 -->|Sim| C3 --> D2
D2 -->|Não| C1
D2 -->|Sim| C4 --> C1
IN2 --> C1
C1 --> D3
D3 -->|Não| OUT2
D3 -->|Sim| D4
D4 -->|Não| C5 --> OUT2
D4 -->|Sim| REV
REV -->|Aprovada pelo CIG| OUT2
REV -->|Reprovada pelo CIG| RJ --> REV
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
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
