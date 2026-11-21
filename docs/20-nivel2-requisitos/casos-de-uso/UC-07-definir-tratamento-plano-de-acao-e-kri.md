# UC-07 — Definir tratamento, plano de ação e KRI

> Origem: F1.06, F2.03 a F2.10; Metodologia 4.5, 4.5.1 e 4.7.1; Política art. 8º, § 2º · RF: RF-048, RF-049, RF-050, RF-051, RF-094, RF-095, RF-096, RF-097, RF-100 · RN: RN-019, RN-020, RN-082, RN-083, RN-095 · Situação: parcial (LAC-03)

## Título

Definir tratamento, plano de ação e KRI.

## Ator principal

Gestor de riscos (1ª linha) da unidade dona do risco.

## Pré-condições

- O risco foi analisado e o banco calculou a criticidade ([[UC-06-analisar-risco-e-avaliar-controles]]).
- A ficha está em rascunho, devolvida ou preliminar da CGOV, ou aprovada (com reabertura).

## Pós-condições

- A ficha travada (em validação ou homologação) não muda (RN-037).
- Toda gravação de tratamento e de KRI fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. O gestor confere que o risco é crítico, isto é, que o residual está fora do apetite da DAR (RN-005).
2. O gestor identifica as causas e consequências a tratar e avalia as medidas possíveis (F2.03, F2.04).
3. O gestor escolhe a resposta: Mitigar, Compartilhar ou Evitar (RN-020).
4. O gestor registra ao menos uma ação de tratamento, com o quê, por quê, quem, quando, onde, como e quanto (RN-019).
5. O gestor define ao menos um KRI, com métrica, fonte dos dados, periodicidade, limite de alerta e responsável (RN-082, RN-083).
6. O sistema grava a resposta, a ação e o KRI na ficha e registra na trilha de auditoria (RN-095).

## Fluxos alternativos e de exceção

- 1a. O risco não é crítico: tratamento e KRI não são exigidos (RN-082). O gestor pode registrar a estratégia "Aceitar"; segue no passo 6.
- 3a. O gestor escolhe "Aceitar" para risco crítico: a norma não permite (RN-020). Hoje o sistema aceita e dispensa a ação de tratamento (não tratado pelo sistema; cartão LAC-13 no Kanban).
- 4a. A estratégia não é "Aceitar" e falta o quê, o responsável ou o prazo da ação: o sistema não avança e diz o que falta.
- 5a. O KRI é gravado sem fonte, meta e limite de alerta definidos: hoje o sistema grava "A definir" nesses campos (RN-083; não tratado pelo sistema; cartão LAC-03 no Kanban).
- 5b. O risco crítico fica sem KRI: a norma exige (RN-082), mas hoje o sistema grava e deixa enviar (não tratado pelo sistema; cartão LAC-03 no Kanban).
- 5c. Um mesmo KRI serve a um grupo de riscos críticos correlatos: a norma permite (RN-082); o sistema liga o KRI a um só risco (não tratado pelo sistema; cartão LAC-03 no Kanban).
- 6a. A ficha está aprovada: a inclusão ou mudança de ação de tratamento ou de KRI reabre o risco para validação (RN-051); a mudança só da situação de execução de uma ação não reabre (RN-052).

## Pós-condição de sucesso

- O risco crítico tem resposta, ao menos uma ação de tratamento em 5W2H e ao menos um KRI gravados, prontos para o envio à validação ([[UC-08-enviar-risco-para-validacao]]).
