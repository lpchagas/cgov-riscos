# UC-11 — Devolver risco para ajuste

> Origem: FS-01.07, FS-01.09 e FS-01.12 ([[FS-01-validacao-interna-risco]]); decisões D1 e B11-4 da CGOV · RF: RF-076, RF-077, RF-078, RF-080, RF-061, RF-062, RF-085, RF-154 · RN: RN-044, RN-046, RN-047, RN-096 · Situação: implementado
>
> Fluxo interno do RADAR, sem base nas minutas (LAC-11)

## Título

Devolver risco para ajuste.

## Ator principal

Validador efetivo (risco em validação) ou homologador efetivo (risco em homologação). A CGOV atua só quando o estado atual do risco não tem validador ou homologador efetivo (exceções 3d e 3e).

## Pré-condições

- O risco está em validação ou em homologação.
- O ator é o validador ou o homologador efetivo do estado atual (RN-046), ou a CGOV, no caso das exceções 3d e 3e (RN-047).

## Pós-condições

- A devolução recusada deixa o risco no estado em que estava.
- Nenhuma devolução é aceita sem motivo (RN-046).
- Toda devolução aceita fica no histórico, com o motivo (RN-096).

## Fluxo principal de sucesso

1. O ator escolhe um risco que está no seu degrau (em validação, se validador; em homologação, se homologador).
2. O ator informa o motivo da devolução.
3. O sistema confere que o motivo não está vazio e que o ator é o efetivo do estado atual (RN-046).
4. O sistema põe o risco em devolvido, destrava a ficha e registra `devolvido_ajuste` com o motivo no histórico (RN-096).
5. O gestor da unidade vê o motivo, ajusta a ficha ([[UC-05-identificar-e-registrar-risco]] a [[UC-07-definir-tratamento-plano-de-acao-e-kri]]) e a reenvia ([[UC-08-enviar-risco-para-validacao]]).

## Fluxos alternativos e de exceção

- 2a. O motivo está vazio ou nulo: o sistema recusa (RN-046; `050`, bloco 10).
- 3a. O validador tenta devolver risco que já está em homologação: o sistema recusa; só o homologador devolve nesse estado (RN-046).
- 3b. **Envio pelo próprio titular ("sobe um nível").** Quem enviou o risco tenta devolvê-lo: o sistema recusa, porque ele não é o ator efetivo (RN-044; `050`, bloco 8d).
- 3c. **Validação sem homologador efetivo (caminho real).** A validação foi recusada por falta de homologador efetivo e o risco seguiu em validação ([[UC-09-validar-risco]], exceção 4c): quem devolve é o **validador**, com motivo. A CGOV que tenta devolver recebe recusa, porque há validador efetivo (RN-047). Depois, a unidade reenvia, por outro servidor se quem enviou era o titular do homologador.
- 3d. **Risco reaberto pela mudança da DAR sem homologador efetivo.** O risco está preso em homologação sem homologador efetivo ([[UC-10-homologar-risco]], exceção 1b): só a **CGOV** devolve, com motivo (RN-047). O Presidente ou outro titular que tenta devolver recebe recusa (`073`, bloco 3b).
- 3e. Risco em validação sem validador efetivo: só a CGOV devolve, com motivo (RN-047). A regra está no banco, mas esse caso não tem teste (RF-078, parcial).
- 3f. A CGOV tenta devolver risco que tem validador ou homologador efetivo no estado atual: o sistema recusa (RN-047).
- 3g. **Titular vago (cargo vago).** O ator efetivo existe na árvore, mas a unidade está sem titular ativo: ninguém devolve, nem a CGOV (RN-047). (Não tratado pelo sistema; cartão "Cargo vago trava o fluxo" no Kanban; RF-085.)
- 5a. A ficha é devolvida de novo depois do reenvio: o sistema não limita o número de devoluções (alerta F5-12, aberto).

## Pós-condição de sucesso

- O risco está devolvido, com a ficha destravada para a unidade e o motivo no histórico.
