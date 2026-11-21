# UC-12 — Elaborar ficha preliminar de risco

> Origem: etapa b1.1, estado `preliminar_cgov`; FS-01.01 e FS-01.02 ([[FS-01-validacao-interna-risco]]); decisões P2, P5 e P-B1-5 da CGOV · RF: RF-056, RF-191, RF-057, RF-058, RF-059, RF-055, RF-047, RF-154 · RN: RN-048, RN-049, RN-050, RN-099, RN-104, RN-013, RN-095, RN-096 · Situação: implementado

## Título

Elaborar ficha preliminar de risco.

## Ator principal

CGOV (perfil `cgov`), como 2ª linha que orienta e prepara o trabalho da unidade. A unidade (gestor de riscos) é o ator que assume a ficha nos passos 5 e 6.

## Pré-condições

- A CGOV entrou no RADAR com perfil `cgov` ativo.
- Há objeto de gestão da unidade a que a ficha se destina ([[UC-04-cadastrar-objeto-de-gestao]]).

## Pós-condições

- A CGOV nunca grava em risco da unidade que não seja preliminar (RN-048).
- Os valores calculados são os do banco (RN-013).
- Toda gravação fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. A CGOV escolhe o objeto da unidade e preenche a ficha: identificação, análise, controles, tratamento e KRI (como nos [[UC-05-identificar-e-registrar-risco]] a [[UC-07-definir-tratamento-plano-de-acao-e-kri]]).
2. O sistema calcula pelos Quadros 6, 7 e 8 e frente à DAR (RN-013) e grava o risco como preliminar da CGOV, com o código `RADAR-<ano>-<NNN>` (RN-048, RN-099).
3. A CGOV inclui ou ajusta controles, tratamentos, KRIs e medições do risco preliminar (RN-048).
4. A CGOV avisa a unidade de que a ficha está pronta (fora do sistema).
5. O gestor da unidade assume o risco preliminar como rascunho próprio.
6. O sistema põe o risco em rascunho, registra `assumido` no histórico (RN-096) e retira da CGOV a edição (RN-049).

## Fluxos alternativos e de exceção

- 1a. A ficha vem da importação da tabela da skill: entra como preliminar da CGOV, já gravada ([[UC-13-importar-riscos-da-tabela-da-skill]]; RN-104). Segue no passo 3.
- 2a. A CGOV tenta criar o risco em rascunho, e não como preliminar, numa unidade: o banco recusa (RN-048; `041`, bloco 4).
- 3a. A CGOV desiste da ficha: apaga o risco preliminar, com os filhos, enquanto ele não for assumido (RN-048, RN-050; `072`, bloco 2).
- 3b. A CGOV tenta gravar controle, tratamento ou KRI de risco que não é preliminar: o banco recusa (`072`, bloco 3).
- 5a. Antes de assumir, o gestor da própria unidade ajusta a ficha preliminar (`041`, bloco 4); o gestor de outra unidade não grava nela (`072`, bloco 5).
- 5b. A CGOV tenta assumir o risco: o sistema recusa; só a unidade assume (`080`, caso 3.3).
- 6a. Depois da assunção, a CGOV tenta editar a ficha: o banco recusa (RN-049; `072`, bloco 6).

## Pós-condição de sucesso

- O risco está em rascunho da unidade, com `assumido` no histórico, e a CGOV não o edita mais; a unidade segue com o envio para validação ([[UC-08-enviar-risco-para-validacao]]).
