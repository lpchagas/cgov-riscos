# UC-07 — Definir tratamento, plano de ação e KRI

> Origem: F1.06, F2.03 a F2.10; Metodologia 4.5, 4.5.1 e 4.7.1; Política art. 8º, § 2º · RF: RF-048, RF-049, RF-050, RF-051, RF-094, RF-095, RF-096, RF-097, RF-100 · RN: RN-005, RN-019, RN-020, RN-037, RN-051, RN-052, RN-082, RN-083, RN-095 · Situação: parcial (LAC-03)

## Título

Definir tratamento, plano de ação e KRI.

## Ator principal

Gestor de riscos (1ª linha) da unidade dona do risco.

## Pré-condições

- O risco foi analisado ([[UC-06-analisar-risco-e-avaliar-controles]]). Na ficha nova, que grava identificação, análise e tratamento de uma vez (UC-05), o gestor define o tratamento a partir da **prévia** da criticidade, e o banco a confirma ao gravar; na ficha já gravada, vale a criticidade calculada pelo banco.
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
- 3a. O gestor escolhe "Aceitar" para risco crítico: a norma não permite (RN-020). Desde a LAC-13 (2026-11-22, implementado no código e no banco; migração aplicada na nuvem do piloto no mesmo dia) o sistema trava: na etapa 4 a opção "Aceitar" fica desabilitada, com texto de ajuda, e a ação 5W2H passa a ser obrigatória (`travaRiscoCritico.ts`, `validarEtapa`); no banco, `fn_trava_risco_critico` recusa o envio, a validação e a homologação (migração `20261122002`). Vale para o risco com `status_critico` `sim` ou `pendente_dar` (decisão do responsável, 2026-11-22: o Pendente de DAR também trava). O rascunho continua livre, e a ficha pode ser devolvida sempre.
- 4a. A estratégia não é "Aceitar" e falta o quê, o responsável ou o prazo da ação: o sistema não avança e diz o que falta.
- 5a. O KRI é gravado sem fonte, meta e limite de alerta definidos: hoje o sistema grava "A definir" nesses dados (RN-083; não tratado pelo sistema; cartão LAC-03 no Kanban).
- 5b. O risco crítico fica sem KRI: a norma exige (RN-082), mas hoje o sistema grava e deixa enviar (não tratado pelo sistema; cartão LAC-03 no Kanban).
- 5c. Um mesmo KRI serve a um grupo de riscos críticos correlatos: a norma permite (RN-082); o sistema liga o KRI a um só risco (não tratado pelo sistema; cartão LAC-03 no Kanban).
- 6a. A ficha está aprovada: a inclusão ou mudança de ação de tratamento ou de KRI reabre o risco para validação (RN-051); a mudança só da situação de execução de uma ação não reabre (RN-052).

## Pós-condição de sucesso

- O risco crítico tem resposta, ao menos uma ação de tratamento em 5W2H e ao menos um KRI gravados, prontos para o envio à validação ([[UC-08-enviar-risco-para-validacao]]).
