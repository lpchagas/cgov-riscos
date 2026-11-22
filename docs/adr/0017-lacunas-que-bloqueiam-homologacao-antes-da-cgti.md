# ADR-0017: Fechar as lacunas que bloqueiam a homologação antes de levar o RADAR à CGTI

## Status

Accepted

Data: 2026-11-22 (decisão do responsável pelo projeto, na Tarefa 19, Step 2, do plano de reestruturação
da documentação).

Origem: [[2026-11-20-reestruturacao-documentacao-plan]] (Tarefa 19 e "Decisões que dependem do
responsável", item 3); [[2026-11-20-diagnostico-documentacao-radar]] §5.3 (achado G2);
[[lacunas-norma-sistema]] (severidades).

## Contexto

A etapa D tem duas partes: o **piloto da Sede** (D0 a D5, com dados reais, em curso desde 2026-11-17) e a
**homologação na CGTI**. A 4ª rodada normativa achou 15 lacunas entre a norma (minutas da Política, SEI
`024241420`, e da Metodologia, SEI `024421455`, com o texto saneado de 20/11) e o sistema. Cada lacuna tem
uma severidade:

- **bloqueia homologação** (6): o RADAR **contradiz** a norma e, se usado assim, grava registros fora dela.
  São a LAC-03 (KRI obrigatório para risco crítico), a LAC-08 (rito da DAR no lugar da alteração direta do
  apetite), a LAC-12 (rótulos da probabilidade do Quadro 4), a LAC-13 ("Aceitar" em risco crítico), a
  LAC-14 (as 8 categorias do Quadro 2) e a LAC-15 (as 6 subcategorias do Quadro 3);
- **importante** (9): o RADAR é **omisso**. Falta apoio a um dever que, no piloto, pode ser cumprido fora
  do sistema (SEI, planilha, reunião): LAC-01, 02, 04 a 07 e 09 a 11.

As minutas ainda não foram publicadas e podem mudar até a publicação. O diagnóstico (§5.3) decidiu que a
etapa D **não é suspensa** e deixou para esta tarefa a ordem entre a homologação e as lacunas.

## Decisão

Nós vamos **fechar as 6 lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15) antes de
submeter o RADAR à homologação da CGTI**. As 8 lacunas importantes ainda abertas (LAC-01, 02, 04 a 07, 09 e
10; a nona, LAC-11, foi decidida no [[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1|ADR-0018]]) entram depois, como
evolução: o cartão `#normativo` passa à frente quando a portaria for publicada.

O piloto da Sede **continua** com as regras de hoje, em paralelo.

## Consequências

**Positivas**
- A CGTI homologa um sistema que não grava nada contra a norma: categorias, subcategorias, rótulos, tratamento
  do risco crítico, KRI e apetite seguem os Quadros 2 a 4, o Anexo III, o item 4.7.1 e o rito da DAR.
- As lacunas bloqueantes que mudam o esquema (LAC-14, LAC-15, LAC-03 e LAC-08) entram antes da carga de
  muitos dados reais, e a migração dos dados fica menor.
- O trabalho grande das omissões (Plano único, colegiados, relatórios) espera o texto publicado e não é
  refeito se as minutas mudarem.

**Negativas**
- A homologação na CGTI fica mais longe: a LAC-08 pede tela nova (P-01, que a CGOV ainda precisa aprovar no Figma
  antes do código) e migração; a LAC-03, regras novas no envio do risco crítico.
- No piloto, os riscos gravados antes das mudanças (categorias e subcategorias antigas) vão precisar de
  conversão, com regra combinada com a CGOV.
- Até as 8 omissões abertas entrarem, a CGOV mantém por SEI o rito do Plano, dos colegiados e dos relatórios.

**Neutras**
- A ordem do Kanban segue esta decisão: os cartões das 6 lacunas bloqueantes vêm primeiro no Backlog e em
  "Pronto para iniciar" ([[analise-lacunas-codigo-requisitos]]).
- Mudanças de cálculo, de fluxo, de RLS ou de esquema continuam a pedir pergunta ao responsável e plano
  autorizado (`AGENTS.md`).

## Alternativas consideradas

- **Homologar primeiro, lacunas depois.** Mais rápido, mas a CGTI homologaria telas que contradizem a norma,
  e os dados do piloto cresceriam com categorias e rótulos errados.
- **Fechar as 15 lacunas antes.** Mais fiel à norma, mas adia muito a homologação e arrisca refazer o rito do
  Plano e dos colegiados se as minutas mudarem antes da publicação.
