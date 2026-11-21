# UC-10 — Homologar risco

> Origem: FS-01.08, FS-01.09, FS-01.11 e FS-01.12 ([[FS-01-validacao-interna-risco]]); decisões P4, P-B1-1, P-B1-8, B11-4 a B11-6 da CGOV · RF: RF-067, RF-068, RF-069, RF-070, RF-075, RF-079, RF-080, RF-081, RF-085, RF-091, RF-154 · RN: RN-032, RN-042, RN-043, RN-044, RN-046, RN-047, RN-054, RN-096 · Situação: implementado
>
> Fluxo interno do RADAR, sem base nas minutas (LAC-11)

## Título

Homologar risco.

## Ator principal

Homologador efetivo: o titular, ou o substituto em exercício com a chave de titular, da Gerência Regional acima da unidade; sem GR, o Diretor da Diretoria acima; sem nenhum dos dois, o Presidente (RN-042). Os riscos da Presidência e da Assessoria são homologados pelo Presidente (RN-043).

## Pré-condições

- O risco está em homologação: validado e crítico, ou Médio pendente de DAR ([[UC-09-validar-risco]], exceção 4a), ou aprovado e reaberto pela mudança da DAR (exceção 1a).
- O ator é titular, ou substituto com a chave, da unidade do homologador efetivo (RN-032).

## Pós-condições

- A homologação recusada deixa o risco em homologação, sem mudança.
- Toda ação aceita fica no histórico do risco (RN-096).

## Fluxo principal de sucesso

1. O homologador pede os riscos que pode homologar.
2. O sistema lista os riscos em homologação cujo homologador efetivo é a unidade de que ele é titular (RN-032, RN-042, RN-044).
3. O homologador lê a ficha e homologa.
4. O sistema aprova o risco e registra `homologado` no histórico (RN-096).

## Fluxos alternativos e de exceção

- 1a. **Reabertura pela mudança da DAR.** A CGOV mudou o apetite da categoria e um risco aprovado passou a ser crítico: o sistema o pôs em homologação e registrou `reaberto_mudanca_dar` (RN-054). O homologador homologa de novo, como no fluxo principal (`073`, blocos 3 e 3b).
- 1b. **Risco reaberto pela mudança da DAR sem homologador efetivo.** Isso acontece em dois casos: quem enviou o risco é o titular do homologador e não há nível acima (por exemplo, o Presidente com um risco da Presidência), ou a unidade não tem Gerência Regional, Diretoria nem Presidência acima. Nos dois, o risco fica em homologação sem ninguém que o homologue e aparece na lista de riscos parados sem ator efetivo (RF-080). Só a CGOV pode devolvê-lo, com motivo ([[UC-11-devolver-risco-para-ajuste]], exceção 3d; RN-047; `073`, bloco 3b).
- 2a. **Envio pelo próprio titular ("sobe um nível").** O homologador é quem enviou ou reabriu o risco: a homologação sobe para a chefia acima; o Presidente nunca homologa o próprio risco (RN-044; `050`, bloco 8d; `070`, blocos 2 a 5d).
- 2b. Quem tenta homologar não é titular nem substituto com a chave: o sistema recusa (RN-032).
- 2c. **Titular vago (cargo vago).** A unidade do homologador efetivo está sem titular ativo: ninguém homologa, o risco fica parado em homologação, e a CGOV não pode devolvê-lo, porque o homologador efetivo existe (RN-047). (Não tratado pelo sistema; cartão "Cargo vago trava o fluxo" no Kanban; RF-085.)
- 3a. A ficha precisa de ajuste: o homologador a devolve com motivo ([[UC-11-devolver-risco-para-ajuste]]); o validador não devolve risco em homologação (RN-046).

## Pós-condição de sucesso

- O risco está aprovado, com `homologado` no histórico.
