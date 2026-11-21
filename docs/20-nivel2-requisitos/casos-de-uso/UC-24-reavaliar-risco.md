# UC-24 — Reavaliar risco (anual ou por fato)

> Origem: F4.03 ([[F4-monitoramento-relato-avaliacao]]); Metodologia 4.7 (3º parágrafo e parágrafo novo) · RF: RF-103, RF-104, RF-105, RF-106, RF-045 · RN: RN-087, RN-088, RN-084, RN-086, RN-013, RN-051
>
> Situação: proposto (LAC-10)

## Título

Reavaliar risco, anualmente ou por fato.

## Ator principal

Gestor de riscos (1ª linha).

## Pré-condições

- O risco está registrado no RADAR.
- A reavaliação venceu (anual ou período menor fixado), houve alerta do KRI ou houve fato do item 4.7.2.

## Pós-condições

- Os valores calculados continuam sendo os do banco (RN-013).
- A data e o motivo de cada reavaliação ficam registrados.

## Fluxo principal de sucesso

1. O sistema sinaliza ao gestor o risco cuja reavaliação anual, ou a do período menor fixado, venceu (RN-087).
2. O gestor revisa a probabilidade, o impacto, os controles e o tratamento ([[UC-06-analisar-risco-e-avaliar-controles]], [[UC-07-definir-tratamento-plano-de-acao-e-kri]]).
3. O gestor registra a reavaliação, com o motivo: anual, alerta do KRI ou fato do item 4.7.2.
4. O sistema recalcula o risco (RN-013) e grava a data da última reavaliação.

## Fluxos alternativos e de exceção

- 1a. O gestor fixa, no registro do risco, período de reavaliação menor que um ano (RN-088); o sistema passa a sinalizar por esse período.
- 1b. A reavaliação é antecipada por alerta do KRI ou por fato do item 4.7.2 (RN-087, RN-084): começa no passo 2, vinda do [[UC-15-registrar-medicao-de-kri-e-tratar-alerta]] ou do [[UC-16-comunicar-fato-de-risco-a-cgov]].
- 4a. A reavaliação muda o nível residual ou o enquadramento no apetite: o gestor comunica à CGOV (hipótese I; RN-086; [[UC-16-comunicar-fato-de-risco-a-cgov]]).
- 4b. O risco estava aprovado e a reavaliação mudou a ficha: o risco reabre para validação ([[UC-08-enviar-risco-para-validacao]], exceção 1a; RN-051).
- 4c. **Hoje:** o RADAR guarda só a data da última alteração, que não prova reavaliação, e não sinaliza vencimento (LAC-10; não tratado pelo sistema; cartão LAC-10 no Kanban). Quem verifica a reavaliação dos riscos não críticos também não está definido (alerta F4-13, aberto).

## Pós-condição de sucesso

- A reavaliação está registrada, com data e motivo, e o risco foi recalculado; o próximo vencimento é contado a partir dela.
