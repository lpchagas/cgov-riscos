---
tipo: uml
nivel: 5
data: 2026-11-21
---

# UML 4 — Diagramas de sequência

> Dois `sequenceDiagram`, no modo real (Supabase). Os nomes de funções, RPCs e tabelas são os do código
> (`riscosStore.ts`, `fonteSupabase.ts`, migrações `20261115004`, `20261116001`, `20261116004` e `20261117001`).

## (a) UC-08 → UC-09 → UC-10: do envio à homologação

O gestor envia, a chefia valida e, se o risco for **Crítico** (residual fora do apetite da DAR), o homologador
aprova. A tela pergunta antes ao banco o que cada pessoa pode fazer (`acoes_no_fluxo`).

```mermaid
sequenceDiagram
  autonumber
  actor G as Gestor (UC-08)
  actor C as Chefia imediata (UC-09)
  actor H as Homologador (UC-10)
  participant T as Tela (Caixa de Validação)
  participant S as riscosStore
  participant F as fonteSupabase
  participant R as RPC (enviar_para_validacao, validar_risco, homologar_risco)
  participant L as RLS e funções de alcance
  participant G2 as Gatilho de cálculo
  participant A as historico_fluxo e auditoria_log
  G->>T: Clica em "Enviar para validação"
  T->>S: submeterParaValidacaoCg(riscoId)
  S->>F: enviar(id)
  F->>R: rpc enviar_para_validacao(risco)
  R->>L: pode_escrever_objeto? chefia acima de quem envia?
  alt sem chefia acima, sem homologador efetivo (Crítico ou pendente_dar), estado inválido ou sem permissão
    R-->>F: RADAR: ... (55000 ou 42501)
    F-->>S: ErroRadar traduzido (traduzirErroBanco)
    S-->>T: mensagem em português
  else permitido
    R->>G2: recalcula criticidade (UPDATE no mesmo estado)
    R->>A: ação "submetido" e linha de auditoria
    R-->>F: risco em em_validacao_cg
    F-->>S: ok
    S->>F: relerRisco e acoesNoFluxo
    S-->>T: ficha e botões atualizados
  end
  C->>T: Clica em "Validar"
  T->>S: aprovarEmUmCliqueCg(riscoId, parecer)
  S->>F: validar(id, parecer)
  F->>R: rpc validar_risco(risco, parecer)
  R->>L: é titular do validador efetivo? (quem enviou não valida)
  R->>G2: criticidade atual (a DAR pode ter mudado)
  alt Crítico ou pendente_dar, e homologador efetivo diferente da chefia
    R->>A: ação "validado" (encaminha à homologação)
    R-->>F: em_homologacao_dir
    H->>T: Clica em "Homologar"
    T->>S: homologarEmUmCliqueDiretoria(riscoId, parecer)
    S->>F: homologar(id, parecer)
    F->>R: rpc homologar_risco(risco, parecer)
    R->>A: ação "homologado"
    R-->>F: aprovado
  else Crítico ou pendente_dar, e o mesmo titular valida e homologa
    R->>A: ação "validado_e_homologado"
    R-->>F: aprovado
  else não Crítico e apetite definido
    R->>A: ação "validado" (não exige homologação)
    R-->>F: aprovado
  end
  F-->>S: ok, a store relê o risco e as ações
```

## (b) UC-13: importar riscos da tabela da skill

Hoje só a CGOV importa. A prévia não grava nada; cada linha é gravada sozinha, e uma linha recusada não
impede as outras (a tela oferece tentar de novo só as recusadas).

```mermaid
sequenceDiagram
  autonumber
  actor U as CGOV
  participant T as ImportadorSkillView
  participant S as riscosStore.importarMarkdownDaSkill
  participant I as importarTabelaMarkdownSkill
  participant F as fonteSupabase.salvarFicha
  participant R as RPC salvar_ficha_risco
  participant G as Gatilho de cálculo
  U->>T: Cola a tabela e escolhe o objeto
  T->>I: importarTabelaMarkdownSkill(markdown) (prévia, na própria tela)
  alt erros de leitura (ex.: categoria proibida)
    I-->>T: erros
    T-->>U: mostra os erros, nada é gravado
  else leitura ok
    I-->>T: fichas e avisos
    T-->>U: prévia com avisos, confirma?
    U->>T: Confirma
    T->>S: importarMarkdownDaSkill(markdown, objetoId, somenteLinhas)
    S->>I: relê a tabela
    loop cada linha da tabela
      S->>F: salvarFicha(fichaDaSkillParaSalvar)
      F->>R: rpc salvar_ficha_risco(ficha jsonb)
      alt banco recusa (RLS, regra)
        R-->>F: erro RADAR
        F-->>S: ErroRadar
        S->>S: guarda a linha em "recusadas"
      else gravada
        R->>G: calcula inerente, residual e criticidade
        R-->>F: id e codigoRadar (estado preliminar_cgov)
      end
    end
    S->>S: relerDepoisDaAcao(ids novos), que chama relerRisco e acoesNoFluxo
    S-->>T: importados, total, avisos, erros, recusadas
    T-->>U: resumo, botão "tentar de novo as recusadas"
  end
```
