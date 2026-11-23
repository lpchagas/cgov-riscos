# UC-07 — Definir tratamento, plano de ação e KRI

> Origem: F1.06, F2.03 a F2.10; Metodologia 4.5, 4.5.1 e 4.7.1; Política art. 8º, § 2º · RF: RF-048, RF-049, RF-050, RF-051, RF-094, RF-095, RF-096, RF-097, RF-100 · RN: RN-005, RN-019, RN-020, RN-037, RN-051, RN-052, RN-082, RN-083, RN-095 · Situação: parcial (RF-048: falta o teste que grave cada estratégia; a parte do KRI foi implementada na LAC-03, em 2026-11-22, no código e no banco local)

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
- 3a. O gestor escolhe "Aceitar" para risco crítico: a norma não permite (RN-020). Desde a LAC-13 (2026-11-22, implementado no código e no banco; migração aplicada na nuvem do piloto no mesmo dia) o sistema trava: na etapa 4 a opção "Aceitar" fica desabilitada, com texto de ajuda, e a ação 5W2H passa a ser obrigatória (`travaRiscoCritico.ts`, `validarEtapa`); no banco, `fn_trava_risco_critico` recusa o envio, a validação e a homologação (migração `20261122002`). Vale para o risco crítico (`status_critico` `sim`) e, por regra do sistema, para o risco com DAR pendente (`pendente_dar`), que não é risco crítico pela norma (decisão do responsável, 2026-11-22: o Pendente de DAR também trava). O rascunho continua livre, e a ficha pode ser devolvida sempre.
- 4a. A estratégia não é "Aceitar" e falta o quê, o responsável ou o prazo da ação: o sistema não avança e diz o que falta.
- 5a. O KRI é preenchido sem fonte, fórmula, periodicidade, limite de alerta ou responsável: a norma exige esses dados (RN-083). Desde a LAC-03 (2026-11-22, implementado no código e no banco local; nuvem do piloto: aplicada em 2026-11-23) a etapa 4 tem todos os campos e nada é gravado como "A definir"; o campo vazio vai vazio. A meta é opcional. No risco crítico (ou Pendente de DAR) o KRI incompleto impede avançar da etapa 4 fora do rascunho, e o banco o recusa no envio, na validação e na homologação (`kriCompleto`, `fn_kri_completo`).
- 5b. O risco crítico fica sem KRI: a norma exige (RN-082). Desde a LAC-03 o sistema recusa: o 3º motivo da trava da LAC-13 (`fn_trava_risco_critico`) vale em todas as portas (enviar, validar, homologar, `salvar_ficha_risco` fora do rascunho, do devolvido e do preliminar da CGOV) e na reavaliação pela DAR, que devolve à unidade o risco aprovado que passou a ser crítico sem KRI completo, com o motivo no histórico. Isso responde, na prática, ao F4-10 (prazo do KRI do risco que passa a ser crítico): sem KRI, o risco não volta a ser aprovado. O risco aprovado antigo sem KRI completo não muda de estado na migração; uma consulta só de leitura os lista para a CGOV cobrar das unidades.
- 5c. Um mesmo KRI serve a um grupo de riscos críticos correlatos: a norma permite (RN-082). Desde a LAC-03 o KRI pertence ao objeto e liga-se a vários riscos **do mesmo objeto** (tabela `kri_riscos`); na etapa 4, "Usar um KRI já definido neste objeto" liga o KRI existente sem alterar a definição (em risco novo o KRI escolhido só é ligado). Alterar a definição de um KRI compartilhado reabre os riscos aprovados ligados a ele. Grupo entre objetos ou entre unidades não existe.
- 6a. A ficha está aprovada: a inclusão ou mudança de ação de tratamento ou de KRI reabre o risco para validação (RN-051); a mudança só da situação de execução de uma ação não reabre (RN-052).

## Pós-condição de sucesso

- O risco crítico tem resposta, ao menos uma ação de tratamento em 5W2H e ao menos um KRI gravados, prontos para o envio à validação ([[UC-08-enviar-risco-para-validacao]]).
