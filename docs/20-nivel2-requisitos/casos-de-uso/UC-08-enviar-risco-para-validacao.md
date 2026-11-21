# UC-08 — Enviar risco para validação

> Origem: FS-01.03 a FS-01.05 e FS-01.10 ([[FS-01-validacao-interna-risco]]); decisões P1 a P8, D1, D2, B11-7, B11-8 e P-B1-1 da CGOV · RF: RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-068, RF-069, RF-082, RF-083, RF-084, RF-154 · RN: RN-037, RN-038, RN-039, RN-040, RN-041, RN-042, RN-043, RN-044, RN-051, RN-052, RN-053, RN-096 · Situação: implementado
>
> Fluxo interno do RADAR, sem base nas minutas (LAC-11)

## Título

Enviar risco para validação.

## Ator principal

Gestor de riscos (1ª linha) da unidade dona do risco.

## Pré-condições

- A ficha está em rascunho ou devolvida e foi preenchida ([[UC-05-identificar-e-registrar-risco]] a [[UC-07-definir-tratamento-plano-de-acao-e-kri]]).
- O gestor grava na unidade do risco (RN-027).

## Pós-condições

- O estado do risco só muda pelas ações do fluxo (RN-038).
- O envio recusado deixa o risco no estado em que estava, sem ficar preso em validação.
- Toda ação aceita fica no histórico do risco, com quem agiu e quando (RN-096).

## Fluxo principal de sucesso

1. O gestor pede o envio da ficha para validação.
2. O sistema define o validador efetivo: a chefia imediata da unidade na árvore (RN-040); para a Presidência e a Assessoria, o GABIN (RN-043).
3. O sistema verifica se o risco exige homologação, isto é, se é crítico ou tem residual Médio em categoria pendente de DAR (RN-041), e, se exige, define o homologador efetivo (RN-042, RN-043).
4. O sistema confere quem está enviando: se é o titular do validador ou do homologador, o degrau sobe para a chefia acima (RN-044).
5. O sistema confere que há validador efetivo e, quando o risco exige homologação, homologador efetivo (RN-039).
6. O sistema põe o risco em validação, trava a ficha (RN-037) e registra `submetido` no histórico (RN-096).

## Fluxos alternativos e de exceção

- 1a. **Reabertura por edição.** O gestor altera a ficha de um risco aprovado (probabilidade, impacto, controles, tratamento, KRI, categoria ou objeto): o sistema reabre o risco em validação, conta quem editou como quem enviou e registra `reaberto_mudanca_nota` (RN-051). Segue no passo 2.
- 1a.1. A alteração é só uma medição de KRI ou a situação de execução de uma ação: o risco continua aprovado (RN-052).
- 1a.2. Não há validador efetivo, ou o risco é crítico e não há homologador efetivo: o sistema recusa a alteração e o risco continua aprovado, sem mudança (RN-053; `supabase/tests/070`, blocos 5c e 5d).
- 1b. O risco é preliminar da CGOV: a unidade precisa assumi-lo antes ([[UC-12-elaborar-ficha-preliminar-de-risco]], passos 5 e 6).
- 1c. **Reabertura pela mudança da DAR.** Não passa por este caso de uso: o risco aprovado que passa a ser crítico vai direto à homologação ([[UC-10-homologar-risco]], exceção 1a; RN-054).
- 2a. **Unidade sem chefia imediata na árvore:** o sistema recusa o envio e a mensagem manda procurar a CGOV (RN-039). Esse caminho não tem teste próprio desde a decisão P-B1-1 (RF-063, parcial).
- 4a. **Envio pelo próprio titular ("sobe um nível").** Quem envia é o titular da chefia imediata: o validador sobe para a chefia acima (RN-044). Exemplo (`050`, bloco 8d): o Gerente Regional envia um risco crítico de um Serviço interno da própria GR; a validação e a homologação sobem para a Presidência, que, sendo a mesma chefia, valida e homologa de uma vez (RN-045).
- 4b. Quem envia é o titular e não há nível acima (por exemplo, o Presidente envia um risco crítico da Presidência): o sistema recusa o envio, o risco continua em rascunho e a mensagem pede que outro servidor da unidade envie (`070`, bloco 5).
- 5a. **Risco crítico sem homologador efetivo:** o sistema recusa o envio e o risco fica onde estava (RN-039; decisão B11-8).
- 5b. **Titular vago (cargo vago).** A unidade do validador ou do homologador efetivo existe na árvore, mas não tem titular ativo: o envio é aceito e o risco fica parado em validação, sem ninguém que o valide; a CGOV também não pode devolvê-lo, porque o validador efetivo existe (RN-047). (Não tratado pelo sistema; cartão "Cargo vago trava o fluxo" no Kanban; RF-085.)
- 6a. Alguém tenta alterar a ficha em validação ou mudar o estado direto: o sistema recusa (RN-037, RN-038).

## Pós-condição de sucesso

- O risco está em validação, com a ficha travada, o validador (e, se for o caso, o homologador) efetivo definido, e `submetido` (ou `reaberto_mudanca_nota`) no histórico.
