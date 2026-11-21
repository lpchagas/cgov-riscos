# UC-09 — Validar risco

> Origem: FS-01.05 e FS-01.06 ([[FS-01-validacao-interna-risco]]); decisões P4, D1, B11-7 e P-B1-1 da CGOV · RF: RF-066, RF-068, RF-069, RF-070, RF-071, RF-072, RF-073, RF-074, RF-079, RF-081, RF-085, RF-154 · RN: RN-028, RN-032, RN-040, RN-041, RN-043, RN-044, RN-045, RN-046, RN-047, RN-054, RN-096 · Situação: implementado
>
> Fluxo interno do RADAR, sem base nas minutas (LAC-11)

## Título

Validar risco.

## Ator principal

Chefia imediata (validador efetivo): o titular, ou o substituto em exercício com a chave de titular, da Coordenação Territorial, da Gerência Regional, da Coordenação-Geral ou da Diretoria acima da unidade; para a Presidência e a Assessoria, o titular do GABIN (RN-040, RN-043).

## Pré-condições

- O risco está em validação ([[UC-08-enviar-risco-para-validacao]]).
- O ator é titular, ou substituto com a chave, da unidade do validador efetivo (RN-032).

## Pós-condições

- A ficha não é reescrita por quem valida: ele lê e decide, sem mudar o mérito (RN-028).
- A validação recusada deixa o risco em validação, sem mudança.
- Toda ação aceita fica no histórico do risco (RN-096).

## Fluxo principal de sucesso

1. O validador pede os riscos que pode validar.
2. O sistema lista os riscos em validação cujo validador efetivo é a unidade de que ele é titular (RN-032, RN-040, RN-044).
3. O validador lê a ficha e valida.
4. O sistema recalcula a criticidade e verifica se o risco exige homologação (RN-041).
5. O risco não exige homologação: o sistema o aprova e registra `validado` no histórico (RN-096).

## Fluxos alternativos e de exceção

- 2a. **Envio pelo próprio titular ("sobe um nível").** O validador é quem enviou ou reabriu o risco: o risco não aparece para ele, o degrau sobe para a chefia acima, e a tentativa direta de validar é recusada (RN-044; `050`, bloco 8d).
- 2b. Quem tenta validar não é titular nem substituto com a chave: o sistema recusa (RN-032).
- 2c. **Titular vago (cargo vago).** A unidade do validador efetivo está sem titular ativo: ninguém pode validar, o risco fica parado em validação, e a CGOV não pode devolvê-lo, porque o validador efetivo existe (RN-047). (Não tratado pelo sistema; cartão "Cargo vago trava o fluxo" no Kanban; RF-085.)
- 3a. A ficha precisa de ajuste: o validador a devolve com motivo ([[UC-11-devolver-risco-para-ajuste]]).
- 4a. O risco exige homologação: o sistema o põe em homologação e registra `validado` ([[UC-10-homologar-risco]]).
- 4b. O validador e o homologador efetivos são a mesma chefia: o sistema aprova de uma vez e registra `validado_e_homologado` (RN-045). Exemplo (`050`, bloco 4): UC sem Coordenação Territorial, em que a Gerência Regional valida e homologa.
- 4c. **Validação sem homologador efetivo (caminho real).** A DAR mudou durante a espera e o risco passou a exigir homologação, mas não há homologador efetivo (por exemplo, o Presidente enviou um risco da Presidência que ficou pendente de DAR): o sistema recusa a validação e o risco **segue em validação**. A mensagem manda o **validador** devolver a ficha para que outro servidor da unidade a envie ([[UC-11-devolver-risco-para-ajuste]], exceção 3c). A CGOV **não** pode devolver, porque o validador efetivo existe (RN-046, RN-047). Teste: `070`, bloco 5b (a validação é recusada e o risco segue em validação). A recusa à CGOV decorre de `devolver_risco` (`20261116004`) e não tem teste.
- 4d. Risco de residual Médio em categoria pendente de DAR: exige homologação como o crítico (RN-041); segue no 4a (`050`, bloco 10).

## Pós-condição de sucesso

- O risco está aprovado (`validado` ou `validado_e_homologado`) ou em homologação (`validado`), com a ação no histórico.
