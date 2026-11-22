---
tipo: uml
nivel: 5
data: 2026-11-21
---

# UML 2 — Diagramas de atividades

> Mermaid: `flowchart TD` com **raias** (`subgraph`), decisões em losango `{}` (sem paralelismo: o fluxo da norma é sequencial). Origem: [[F1-ciclo-gestao-riscos]] (atividades F1.01 a F1.09),
> [[F3-aprovacao-dar-plano]] e [[FS-01-validacao-interna-risco]]. Mostra a **norma**: onde o RADAR ainda não
> implementa a etapa, ela vem tracejada (lacunas [[lacunas-norma-sistema]]).

## 1. Ciclo de gestão de riscos (F1)

```mermaid
flowchart TD
  ini([Início do ciclo])
  subgraph CIG[CIG]
    dar[F1.03 Definir o apetite e aprovar a DAR]
  end
  subgraph GES[Gestor de riscos - 1ª linha]
    ctx[F1.01 Contexto e identificação<br/>causa, evento, consequência]
    ana[F1.02 Análise: inerente Quadro 7,<br/>fator do Quadro 6, residual, Quadro 8]
    dok{F1.04 DAR formalizada?}
    ava{F1.05 Residual fora do<br/>apetite da categoria?}
    trat[F1.06 Tratamento e KRI]
    mon[F1.08 Monitoramento, KRI e<br/>comunicação em 10 dias úteis]
  end
  subgraph CG[CGOV, CTGRIC, CIG e Presidente]
    plano[F1.07 Consolidar, manifestar,<br/>aprovar e publicar o Plano]
    rel[F1.09 Relatórios trimestrais e<br/>avaliação gerencial anual]
  end
  aceito([Fim: risco aceito,<br/>monitorado quando Médio])
  travado([Lacuna: DAR pendente.<br/>Médio aguarda a DAR])
  fim([Fim: ciclo seguinte])
  ini --> ctx --> ana --> dok
  dar -.-> dok
  dok -->|Não, residual Alto ou Extremo:<br/>sempre Risco Crítico| trat
  dok -->|Não, residual Médio| travado
  dok -->|Não, residual Baixo| aceito
  dok -->|Sim| ava
  ava -->|Não| aceito
  ava -->|Sim: Risco Crítico| trat --> plano --> mon
  mon -->|Risco emergente ou controle perdeu eficácia| ana
  mon -->|Mudança substancial do Plano| plano
  mon --> rel --> fim
  classDef lacuna stroke-dasharray: 5 5
  class plano,rel,travado lacuna
```

> No RADAR de hoje, o trecho `F1.01 a F1.06` e a decisão `F1.05` estão implementados; `F1.07` e `F1.09` não
> (LAC-01, LAC-02, LAC-05). Em `F1.05`, "Risco Crítico" é o residual fora do apetite da DAR, não o nível Extremo.

## 2. Validação interna do risco (FS-01), implementada

```mermaid
flowchart TD
  subgraph GES[Gestor de riscos]
    env[Envia para validação]
  end
  subgraph VAL[Chefia imediata - validador efetivo]
    v{Há quem valide acima<br/>de quem enviou?}
    val[Valida o risco]
    crit{Risco Crítico<br/>ou pendente_dar?}
  end
  subgraph HOM[Homologador efetivo]
    h{Mesmo titular<br/>valida e homologa?}
    hom[Homologa]
  end
  rec([Recusa 55000: procure a CGOV])
  apr([Aprovado])
  env --> v
  v -->|Não| rec
  v -->|Sim| val --> crit
  crit -->|Não| apr
  crit -->|Sim| h
  h -->|Sim: validado e homologado| apr
  h -->|Não| hom --> apr
```

## 3. Aprovação do Plano e da DAR (F3), proposta

```mermaid
flowchart TD
  subgraph CGOV[CGOV]
    cons[Consolida o Plano e minuta a DAR]
    ver{Completo e<br/>consistente?}
    dev[Devolve com pendências]
    enc[Encaminha ao CTGRIC]
    inc[Incorpora as ressalvas]
    pub[Divulga a portaria]
  end
  subgraph GESTOR[Gestor de riscos]
    san[Sana em até 10 dias úteis]
  end
  subgraph CTG[CTGRIC]
    man[Manifesta-se<br/>CGOV e AUDIT se abstêm]
  end
  subgraph CIGp[CIG e Presidente]
    del{CIG aprova na mesma reunião:<br/>primeiro a DAR, depois o Plano?}
    por[Presidente publica por portaria]
  end
  cons --> ver
  ver -->|Não| dev --> san --> ver
  ver -->|Sim| enc --> man --> inc --> del
  del -->|Sim| por --> pub
  del -->|Não| aj[CGOV ajusta e reapresenta em até 30 dias]
  aj --> enc
```

> Todo o diagrama 3 é **proposta** (LAC-01 e LAC-02): hoje esse rito acontece fora do RADAR, por SEI e reunião.
