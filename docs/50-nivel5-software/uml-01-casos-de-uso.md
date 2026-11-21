---
tipo: uml
nivel: 5
data: 2026-11-21
---

# UML 1 — Casos de uso

> Mermaid não tem diagrama de casos de uso nativo ([[0016-diagramas-em-mermaid-sem-c4]]). Por isso usamos
> `flowchart LR`: **ator** = nó fora da caixa; **fronteira do sistema** = `subgraph RADAR`; **caso de uso** = nó
> arredondado dentro dela; `-. «include» .->` e `-. «extend» .->` são as relações entre casos de uso.
>
> Os 26 casos de uso estão em [[casos-de-uso/README|docs/20-nivel2-requisitos/casos-de-uso]]. Como passam de 25
> nós, o desenho é dividido por grupo de atores. **Linha tracejada em volta e rótulo "(proposto)"** = caso de uso
> que ainda não existe no sistema (situação "proposto" na lacuna LAC-NN indicada em cada UC).

## Visão geral: quem faz o quê

```mermaid
flowchart LR
  conv([Servidor convidado])
  ges([Gestor de riscos<br/>1ª linha])
  che([Chefia imediata e<br/>homologador efetivo])
  cgov([CGOV<br/>2ª linha])
  todos([Qualquer perfil<br/>com acesso ativo])
  subgraph RADAR[Sistema RADAR]
    g1[UC-01 a UC-04<br/>Acesso, perfis, estrutura e objetos]
    g2[UC-05 a UC-08, UC-15, UC-16, UC-21, UC-24<br/>Ficha, análise, tratamento, KRI]
    g3[UC-09 a UC-11<br/>Validar, homologar, devolver]
    g4[UC-12 a UC-14, UC-17 a UC-19, UC-22, UC-23, UC-25, UC-26<br/>Preliminar, importação, DAR, Plano]
    g5[UC-20<br/>Painel e trilha de auditoria]
  end
  conv --- g1
  ges --- g2
  che --- g3
  cgov --- g1
  cgov --- g4
  todos --- g5
```

## 1. Gestor de riscos (1ª linha)

```mermaid
flowchart LR
  ges([Gestor de riscos])
  subgraph RADAR[Sistema RADAR]
    uc05([UC-05 Identificar e registrar risco])
    uc06([UC-06 Analisar risco e avaliar controles])
    uc07([UC-07 Definir tratamento, plano de ação e KRI])
    uc08([UC-08 Enviar risco para validação])
    uc15([UC-15 Registrar medição de KRI e tratar alerta])
    uc16([UC-16 Comunicar fato de risco à CGOV<br/>proposto, LAC-04])
    uc21([UC-21 Comunicar risco crítico para o Plano<br/>proposto, LAC-01])
    uc24([UC-24 Reavaliar risco<br/>proposto, LAC-10])
  end
  ges --- uc05 & uc06 & uc07 & uc08 & uc15 & uc16 & uc21 & uc24
  uc24 -. «include» .-> uc06
  uc16 -. «extend» .-> uc15
  uc08 -. «include» .-> uc06
  classDef proposto stroke-dasharray: 5 5
  class uc16,uc21,uc24 proposto
```

## 2. Chefias (validação e homologação)

```mermaid
flowchart LR
  val([Chefia imediata<br/>validador efetivo])
  hom([Homologador efetivo<br/>GR, Diretoria ou Presidência])
  subgraph RADAR[Sistema RADAR]
    uc09([UC-09 Validar risco])
    uc10([UC-10 Homologar risco])
    uc11([UC-11 Devolver risco para ajuste])
  end
  val --- uc09
  hom --- uc10
  val --- uc11
  hom --- uc11
  uc11 -. «extend» .-> uc09
  uc11 -. «extend» .-> uc10
```

## 3. CGOV (2ª linha, Secretaria-Executiva do CTGRIC)

```mermaid
flowchart LR
  cgov([CGOV])
  subgraph RADAR[Sistema RADAR]
    uc02([UC-02 Gerenciar usuários e perfis])
    uc03([UC-03 Sincronizar estrutura e Cadeia de Valor])
    uc04([UC-04 Cadastrar objeto de gestão])
    uc12([UC-12 Elaborar ficha preliminar])
    uc13([UC-13 Importar riscos da tabela da skill])
    uc14([UC-14 Propor a DAR])
    uc17([UC-17 Verificar e consolidar o Plano<br/>proposto, LAC-01])
    uc18([UC-18 Registrar manifestação do CTGRIC e deliberação do CIG<br/>proposto, LAC-02])
    uc19([UC-19 Emitir relatório trimestral<br/>proposto, LAC-05])
    uc22([UC-22 Acompanhar carteira crítica<br/>proposto, LAC-09])
    uc23([UC-23 Revisar o Plano<br/>proposto, LAC-07])
    uc25([UC-25 Registrar publicação da DAR e do Plano<br/>proposto, LAC-02])
    uc26([UC-26 Registrar avaliação gerencial anual<br/>proposto, LAC-06])
  end
  cgov --- uc02 & uc03 & uc04 & uc12 & uc13 & uc14 & uc17 & uc18 & uc19 & uc22 & uc23 & uc25 & uc26
  uc12 -. «include» .-> uc05
  uc13 -. «include» .-> uc12
  classDef proposto stroke-dasharray: 5 5
  class uc17,uc18,uc19,uc22,uc23,uc25,uc26 proposto
```

## 4. Acesso e consulta (todos os perfis)

```mermaid
flowchart LR
  conv([Servidor convidado])
  todos([Qualquer perfil com acesso ativo])
  subgraph RADAR[Sistema RADAR]
    uc01([UC-01 Entrar por link de e-mail])
    uc20([UC-20 Consultar painel e trilha de auditoria])
  end
  conv --- uc01
  todos --- uc20
  uc20 -. «include» .-> uc01
```

> **Atores que não usam o sistema:** CTGRIC, CIG e Presidente decidem fora do RADAR; a CGOV registra o resultado
> (UC-18 e UC-25). Por isso não aparecem como atores.
