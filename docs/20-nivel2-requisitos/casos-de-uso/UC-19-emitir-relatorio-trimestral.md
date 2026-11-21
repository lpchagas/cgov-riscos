# UC-19 — Emitir relatório trimestral ao CTGRIC e ao CIG

> Origem: F4.09, F4.13 e F4.14 ([[F4-monitoramento-relato-avaliacao]]); Metodologia 4.7.2 (parágrafo da CGOV) · RF: RF-147, RF-148, RF-149, RF-138 · RN: RN-091, RN-109, RN-112
>
> Situação: proposto (LAC-05)

## Título

Emitir relatório trimestral ao CTGRIC e ao CIG.

## Ator principal

CGOV (perfil `cgov`).

## Pré-condições

- Há Plano de Gestão de Riscos vigente, com carteira de riscos críticos.
- O trimestre a relatar terminou.

## Pós-condições

- O relatório usa os dados gravados no RADAR, sem alterá-los.

## Fluxo principal de sucesso

1. A CGOV pede os dados da carteira de riscos críticos do trimestre.
2. O sistema fornece os dados recortados pelo trimestre, com o histórico de cada risco no período.
3. O sistema gera o relatório com a evolução da carteira de riscos críticos, a efetividade dos controles e o desempenho dos KRI, sem a maturidade, que fica para a avaliação anual (RN-091).
4. O sistema inclui no relatório as pendências que persistiram depois da cobrança (RN-112) e as atualizações não substanciais do Plano feitas no trimestre (RN-109).
5. A CGOV revisa o relatório e o encaminha ao CTGRIC e ao CIG, que o apreciam nas suas reuniões (fora do sistema).

## Fluxos alternativos e de exceção

- 4a. A pendência passou a persistir depois que o relatório do trimestre foi fechado: entra no relatório seguinte (RN-112; alerta F4-16, aberto).
- 5a. **Hoje:** o RADAR não recorta dados por trimestre nem gera o relatório; a CGOV o faz fora do sistema, com os dados das telas (LAC-05; não tratado pelo sistema; cartão LAC-05 no Kanban).

## Pós-condição de sucesso

- O relatório trimestral está gerado, com a carteira crítica, os controles, os KRI, as pendências persistentes e as atualizações não substanciais, e foi encaminhado ao CTGRIC e ao CIG.
