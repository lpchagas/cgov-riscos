# F3 v3, parte 2 – Deliberação do CIG, publicação e reapresentação

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v3, 20/11/2026
**Substitui:** F3 v1 e F3 v2 do projeto no Mermaid
**Escopo:** Deliberação do CIG (DAR e depois Plano), publicação pelo Presidente, divulgação pela CGOV e reapresentação (Metodologia 4.6.6 a 4.6.9).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F3 v3, parte 2 – Deliberação do CIG, publicação e reapresentação](05_F3_v3_parte2_CIG-publicacao-reapresentacao.png)

```mermaid
---
title: F3 v3, parte 2 – Deliberação do CIG, publicação e reapresentação
---
graph TD
IN(["Entrada: DAR e Plano com a manifestação do CTGRIC"])
CIG1{"CIG aprova a DAR?"}
CIG2{"CIG aprova o Plano?"}
PRES["Presidente: publica a DAR por portaria e o ato de aprovação do Plano"]
DIV["CGOV: divulga o Plano na intranet e em transparência ativa"]
AUD("AUDIT: ciência e avaliação independente por PAINT, fora da aprovação")
AJU["CGOV: ajusta conforme a deliberação e reapresenta em até 30 dias"]
D3{"Mudança substancial, nos termos do item 4.6.9?"}
CTG["CTGRIC: nova manifestação"]
CIGN["CIG: delibera na primeira reunião, ordinária ou extraordinária"]
SUSP["Plano não é votado: DAR e Plano voltam à CGOV e são reapresentados juntos"]
FIM(["Fim: DAR e Plano vigentes, segue para o monitoramento no F4"])
IN --> CIG1
CIG1 -->|Sim| CIG2
CIG1 -->|Não| SUSP --> AJU
CIG2 -->|Sim| PRES --> DIV --> FIM
PRES -.->|Ciência| AUD
CIG2 -->|Não| AJU
AJU --> D3
D3 -->|Sim| CTG --> CIGN
D3 -->|Não| CIGN
CIGN --> CIG1
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
```

Os nós em amarelo marcam lacunas apontadas pela modelagem.

## Alertas do tipo F5-NN (títulos; o estado de cada um está no documento de origem e no `NT_ESTADO.md`)

- **F5-11** · Só o gestor tem prazo; a CGOV e o Presidente não têm
- **F5-12** · O laço de devolução não diz quantas vezes pode ocorrer
- **F5-13** · DAR reprovada e destino do Plano na mesma reunião
- **F5-14** · A definição de "mudança substancial" está no parágrafo da reapresentação, mas é usada também na revisão do Plano
- **F5-15** · Todo risco crítico novo ou excluído depende do CTGRIC e do CIG
- **F5-16** · A abstenção da CGOV vale só para o Plano, e a CGOV prepara também a DAR; o quórum não foi conferido
- **F5-17** · Efeito da ressalva de incompletude fora do fluxo
