# UC-21 — Comunicar risco crítico para composição do Plano

> Origem: F3.02 ([[F3-aprovacao-dar-plano]]); Metodologia 4.6.1; Política art. 17, II · RF: RF-113, RF-114, RF-112 · RN: RN-062, RN-005, RN-076
>
> Situação: proposto (LAC-01)

## Título

Comunicar risco crítico para composição do Plano de Gestão de Riscos.

## Ator principal

Gestor de riscos (1ª linha).

## Pré-condições

- O ciclo do Plano foi aberto pela CGOV, conforme o calendário anual das reuniões do CTGRIC e do CIG (RN-076), ou por fato que demande atualização.
- O gestor tem riscos críticos, com tratamento e KRI ([[UC-07-definir-tratamento-plano-de-acao-e-kri]]). Se a CGOV mantiver o fluxo interno de validação, esses riscos já passaram por ele ([[UC-08-enviar-risco-para-validacao]] a [[UC-10-homologar-risco]]; LAC-11).

## Pós-condições

- O risco comunicado não muda de mérito ao entrar na carteira.

## Fluxo principal de sucesso

1. O gestor seleciona os riscos críticos dos processos, projetos e ações sob sua responsabilidade, isto é, os de residual fora do apetite da DAR (RN-005).
2. O gestor comunica esses riscos à CGOV, para a carteira do Plano (RN-062).
3. O sistema reúne os riscos comunicados na carteira do Plano de Gestão de Riscos único do ciclo.
4. A CGOV recebe a carteira para verificar e consolidar ([[UC-17-verificar-e-consolidar-plano]]).

## Fluxos alternativos e de exceção

- 1a. O risco deixou de ser crítico antes da comunicação: não entra na carteira (RN-005).
- 2a. O risco é comunicado sem tratamento ou sem KRI: entra na carteira, e a CGOV o devolve com as pendências na verificação ([[UC-17-verificar-e-consolidar-plano]], exceção 2a).
- 2b. Risco crítico novo depois do Plano aprovado: entra pela revisão do Plano ([[UC-23-revisar-plano-de-gestao-de-riscos]]).
- 3a. **Hoje:** o risco termina aprovado no fluxo interno, sem comunicação à CGOV nem carteira do Plano (LAC-01; não tratado pelo sistema; cartão LAC-01 no Kanban).

## Pós-condição de sucesso

- Os riscos críticos do gestor estão na carteira do Plano do ciclo, à espera da verificação da CGOV.
