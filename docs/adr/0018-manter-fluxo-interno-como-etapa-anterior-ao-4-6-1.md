# ADR-0018: Manter o fluxo interno de 3 degraus como etapa anterior à comunicação do item 4.6.1

## Status

Accepted

Data: 2026-11-22 (decisão do responsável pelo projeto, pela CGOV, na Tarefa 19 do plano de reestruturação
da documentação).

Origem: [[2026-11-20-reestruturacao-documentacao-plan]] ("Decisões que dependem do responsável", item 6);
[[lacunas-norma-sistema]] (LAC-11); [[FS-01-validacao-interna-risco]];
[[0011-fluxo-em-tres-degraus-com-segregacao|ADR-0011]].

## Contexto

O RADAR tem um fluxo interno de 3 degraus ([[0011-fluxo-em-tres-degraus-com-segregacao|ADR-0011]]): o
gestor envia, a chefia imediata valida e a autoridade superior homologa (sempre o risco crítico e o de
residual Médio em categoria pendente de DAR). O fluxo está no banco (`riscos.status_fluxo` e as funções
`enviar_para_validacao`, `validar_risco`, `homologar_risco` e `devolver_risco`), na tela `/aprovacoes` e
nos testes pgTAP `050`, `070` e `073`, e o piloto da Sede já o usa.

As minutas não preveem esse fluxo. A Metodologia (SEI `024421455`), item 4.6.1, manda o gestor **comunicar
os riscos críticos à CGOV**, que os verifica e consolida no Plano de Gestão de Riscos (4.6.2). A LAC-11
ficou "importante, condicionada à decisão da CGOV": seria contradição se o fluxo interno substituísse a
comunicação do 4.6.1, e não é contradição se vier antes dela.

## Decisão

Nós vamos **manter o fluxo interno de 3 degraus como controle de qualidade da própria unidade, anterior à
comunicação do item 4.6.1**. O risco aprovado no fluxo interno é o que o gestor pode comunicar à CGOV para a
carteira do Plano (RF-113, LAC-01). O fluxo interno não substitui a verificação, a devolução nem a
consolidação feitas pela CGOV no rito do Plano.

Nada muda no código agora. A LAC-11 fica resolvida por esta decisão.

## Consequências

**Positivas**
- O piloto continua sem mudança de estados, funções ou telas, e a segregação "sobe um nível" segue valendo.
- O risco chega à CGOV já conferido pela chefia, e o rito do 4.6.1 a 4.6.3 (verificar, devolver e
  consolidar) fica mais leve.
- A fronteira fica clara: o fluxo interno termina no estado `aprovado`; o rito do Plano (LAC-01 e LAC-02)
  começa na comunicação à CGOV.

**Negativas**
- O RADAR mantém uma etapa sem base literal nas minutas, que precisa ser explicada à CGTI, à AUDIT e às
  unidades como prática interna, e não como exigência da norma.
- Haverá duas devoluções diferentes: a do fluxo interno (chefia ou homologador) e a da CGOV no rito do Plano
  (RF-116, com prazo de 10 dias úteis). A tela e os textos têm de distinguir as duas.
- Se a portaria publicada vedar etapas intermediárias, um novo ADR terá de substituir este.

**Neutras**
- O cartão `#normativo` da LAC-11 sai do Backlog. A comunicação do 4.6.1 continua como trabalho da LAC-01
  (RF-113), depois das lacunas que bloqueiam a homologação ([[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]]).
- O [[0011-fluxo-em-tres-degraus-com-segregacao|ADR-0011]] continua `Accepted`: este ADR não muda o fluxo,
  só diz onde ele fica em relação ao rito da norma.

## Alternativas consideradas

- **Adaptar o fluxo ao rito das minutas** (trocar os 3 degraus pelo "gestor comunica, CGOV verifica").
  Muda estados, banco, telas e testes no meio do piloto, por um texto que ainda não foi publicado.
- **Deixar a decisão para depois.** A LAC-11 continuaria com severidade indefinida, e a modelagem do
  Plano (LAC-01) não saberia de onde partem os riscos comunicados.
