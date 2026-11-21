# UC-14 — Propor a Declaração de Apetite a Riscos

> Origem: F3.03 e F3.07 ([[F3-aprovacao-dar-plano]]); FS-01.11; alerta LS-02; Política arts. 7º, IV, 8º, § 1º, e 12, V; Metodologia 4.6.4 a 4.6.7 e Anexo III · RF: RF-086, RF-089, RF-090, RF-091, RF-092, RF-093, RF-122, RF-195, RF-153 · RN: RN-055, RN-056, RN-005, RN-010, RN-054, RN-061, RN-066, RN-095 · Situação: parcial (LAC-08: hoje a CGOV altera o apetite direto)

## Título

Propor a Declaração de Apetite a Riscos (DAR).

## Ator principal

CGOV (perfil `cgov`), que elabora a minuta da DAR e a encaminha ao CTGRIC.

## Pré-condições

- A CGOV entrou no RADAR com perfil `cgov` ativo.
- As categorias de risco estão cadastradas.

## Pós-condições

- Só a CGOV grava o apetite de uma categoria (RN-056).
- Toda mudança de apetite fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. A CGOV consulta o apetite vigente de cada categoria.
2. A CGOV simula um novo apetite, Baixo ou Moderado, para uma categoria (RN-055).
3. O sistema mostra a prévia dos riscos que entram e saem da criticidade com o apetite simulado (RN-005).
4. A CGOV grava a proposta como minuta da DAR, separada do apetite vigente (hoje não existe; RF-092).
5. A CGOV encaminha a minuta da DAR ao CTGRIC junto com o Plano, em até 10 dias úteis (RN-061, RN-066); o sistema registra o encaminhamento com a data (hoje não existe; RF-122, RF-195). Segue no [[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig]].
6. Depois de registrada a publicação da DAR ([[UC-25-registrar-publicacao-da-dar-e-do-plano]]), o sistema aplica o novo apetite e reavalia os riscos aprovados da categoria (RN-054; hoje não existe; RF-093).

## Fluxos alternativos e de exceção

- 2a. Quem não é da CGOV tenta gravar o apetite: o banco não grava e nada se mexe (RN-056; `073`, bloco 1).
- 2b. A CGOV muda só o texto da DAR, sem mudar o apetite: nada é reavaliado (`073`, bloco 2).
- 4a. **Como o sistema faz hoje (LAC-08).** Em vez de guardar a minuta, a gravação da CGOV vale na hora, sem CTGRIC, CIG nem portaria. O banco reavalia na hora os riscos aprovados da categoria (RN-054): o que passa a ser crítico volta à homologação, com `reaberto_mudanca_dar` ([[UC-10-homologar-risco]], exceção 1a); o que deixa de ser crítico só tem a criticidade atualizada (`073`, blocos 3 a 5). (Não tratado pelo sistema; cartão LAC-08 no Kanban.)
- 4a.1. O risco reaberto não tem homologador efetivo: fica preso em homologação até a CGOV devolvê-lo ([[UC-11-devolver-risco-para-ajuste]], exceção 3d).
- 4a.2. O risco estava em validação quando o apetite mudou e passou a exigir homologação sem homologador efetivo: a validação é recusada e quem devolve é o validador ([[UC-09-validar-risco]], exceção 4c).
- 4b. A categoria passa a pendente de DAR sem que o risco vire crítico: o risco aprovado não é reaberto; o residual Médio fica pendente de DAR (RN-010; `073`, bloco 5).

## Pós-condição de sucesso

- A minuta da DAR está registrada, separada do apetite vigente, e encaminhada ao CTGRIC; o apetite vigente só muda depois da publicação.
