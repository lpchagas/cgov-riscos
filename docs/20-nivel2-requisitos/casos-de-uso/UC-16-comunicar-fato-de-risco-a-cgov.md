# UC-16 — Comunicar fato de risco à CGOV (6 hipóteses)

> Origem: F4.05 ([[F4-monitoramento-relato-avaliacao]]); Metodologia 4.7.2, caput e incisos I a VI; Política art. 17, IV; decisão L-40 · RF: RF-107, RF-108, RF-192, RF-109, RF-110, RF-111 · RN: RN-086, RN-085, RN-084, RN-090
>
> Situação: proposto (LAC-04)

## Título

Comunicar fato de risco à CGOV (6 hipóteses do item 4.7.2).

## Ator principal

Gestor de riscos (1ª linha).

## Pré-condições

- O risco está registrado no RADAR.
- O gestor tomou ciência de um fato de uma das 6 hipóteses do item 4.7.2.

## Pós-condições

- A comunicação gravada não é apagada; a data da ciência fica registrada para contar o prazo.

## Fluxo principal de sucesso

1. O gestor toma ciência de um fato de uma das 6 hipóteses: (I) mudança do nível residual ou do enquadramento no apetite; (II) falha de controle de risco crítico que o reduza no Quadro 6; (III) materialização de risco crítico; (IV) risco emergente; (V) atraso ou dificuldade no tratamento; (VI) situação que possa demandar revisão do Plano (RN-086).
2. O gestor registra a comunicação, indicando a hipótese e a data em que tomou ciência do fato.
3. O sistema mostra o prazo de 10 dias úteis, contado da ciência (RN-086).
4. O sistema grava a comunicação, com a data, e a mostra à CGOV, com a hipótese, a data da ciência e a data da comunicação.
5. A CGOV recebe a comunicação e a usa no acompanhamento ([[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias]]) e na decisão sobre revisar o Plano ([[UC-23-revisar-plano-de-gestao-de-riscos]]).

## Fluxos alternativos e de exceção

- 1a. Uma gravação da ficha muda a classificação residual ou a criticidade (hipótese I): o sistema propõe ao gestor o registro da comunicação (RF-110).
- 2a. **Alerta do KRI que coincide com as hipóteses I a III.** O fato veio de alerta do KRI ([[UC-15-registrar-medicao-de-kri-e-tratar-alerta]], exceção 2a): a comunicação do resultado da reavaliação supre a das hipóteses I a III, quando coincidirem e forem feitas no mesmo prazo de 10 dias úteis contados da ciência do alerta (RN-084, RN-085; decisão L-40). O sistema registra uma só comunicação, marcando as hipóteses supridas (RF-109).
- 3a. O prazo de 10 dias úteis passou sem a comunicação: a falta vira pendência que a CGOV cobra ([[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias]]; RN-090).
- 4a. **Hoje:** o RADAR não registra nenhuma comunicação nem conta prazo; a comunicação é feita fora do sistema (LAC-04; não tratado pelo sistema; cartão LAC-04 no Kanban).

## Pós-condição de sucesso

- A comunicação está registrada, com a hipótese, a data da ciência e a data da comunicação, e está visível para a CGOV.
