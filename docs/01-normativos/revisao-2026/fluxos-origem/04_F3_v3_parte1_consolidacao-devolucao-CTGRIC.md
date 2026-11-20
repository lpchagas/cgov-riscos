# F3 v3, parte 1 – Consolidação, devolução e manifestação do CTGRIC

**Processo:** SEI 02070.001696/2026-31 (revisão da Política RADAR e da Metodologia de Gestão de Riscos)
**Versão:** v3, 20/11/2026
**Substitui:** F3 v1 e F3 v2 do projeto no Mermaid
**Escopo:** Aprovação da DAR e do Plano com as escolhas de F5-01 a F5-10 e as decisões de F5-11 e F5-13 (Metodologia 4.6.1 a 4.6.5).
**Análise completa (atores, passos, alertas e veredito):** `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`
**Estado das decisões:** `NT_ESTADO.md`, seção "Estado da revisão em 20/11/2026"

## Diagrama

![F3 v3, parte 1 – Consolidação, devolução e manifestação do CTGRIC](04_F3_v3_parte1_consolidacao-devolucao-CTGRIC.png)

```mermaid
---
title: F3 v3, parte 1 – Consolidação, devolução e manifestação do CTGRIC
---
graph TD
GAT(["Gatilho: calendário anual proposto pela CGOV ou fato que demande atualização"])
GES["GES: comunicam os riscos críticos"]
CGOV1["CGOV: verifica completude e consistência e consolida a DAR e o Plano único, sem prejuízo do mérito"]
D1{"Completo e consistente?"}
DEV["CGOV: devolve ao gestor com as pendências"]
D2{"Gestor sanou em 10 dias úteis?"}
RESS["CGOV: consolida com ressalva de incompletude, dá ciência à chefia e informa o CTGRIC"]
CTG["CTGRIC: manifesta-se sobre a DAR e o Plano. AUDIT se abstém; CGOV se abstém no Plano"]
RES["CGOV: incorpora as ressalvas. Desfavorável à integralidade segue com parecer"]
T1(["⚠️ F5-11: prazo do Presidente para publicar não previsto. CGOV: 10 dias úteis por passo"])
OUT(["Segue para a parte 2: deliberação do CIG"])
GAT --> GES --> CGOV1 --> D1
D1 -->|Sim| CTG
D1 -->|Não| DEV --> D2
D2 -->|Sim| CGOV1
D2 -->|Não| RESS --> CTG
CTG --> RES --> OUT
CGOV1 -.-> T1
classDef lacuna fill:#fff3cd,stroke:#b58900,color:#000
class T1 lacuna
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
