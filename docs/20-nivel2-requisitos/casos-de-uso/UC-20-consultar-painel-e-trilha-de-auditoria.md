# UC-20 — Consultar painel e trilha de auditoria

> Origem: etapa b3; [[matriz-acesso-responsabilidades]] §7, linhas "Painel", "Riscos — lista" e "Auditoria — trilha" · RF: RF-012, RF-052, RF-053, RF-144, RF-145, RF-146, RF-153, RF-154, RF-155, RF-156, RF-157, RF-158, RF-159 · RN: RN-001, RN-002, RN-005, RN-021, RN-022, RN-023, RN-024, RN-025, RN-026, RN-095, RN-096, RN-097, RN-098 · Situação: implementado

## Título

Consultar painel e trilha de auditoria.

## Ator principal

Qualquer perfil com acesso ativo (gestor, chefias, Diretor, Presidência, AUDIT, CGOV, CGGE, GABIN).

## Pré-condições

- A pessoa entrou no RADAR com perfil ativo ([[UC-01-entrar-por-link-de-email]]).

## Pós-condições

- A consulta não altera nenhum dado.
- Ninguém vê dados fora do alcance do seu perfil (RN-021 a RN-025).
- Ninguém grava nem altera a trilha de auditoria (RN-097).

## Fluxo principal de sucesso

1. A pessoa pede a visão geral dos riscos.
2. O sistema mostra, só com os riscos do alcance do perfil (RN-021 a RN-025): a matriz do Quadro 7 com a quantidade de riscos de cada célula (RN-001), a distribuição pelo nível residual do Quadro 8 (RN-002) e o que precisa da atenção da pessoa, conforme as ações do fluxo que ela pode executar.
3. A pessoa filtra a lista de riscos por célula da matriz, objeto, busca ou risco crítico.
4. O sistema mostra os riscos filtrados; o filtro "crítico" traz os de residual fora do apetite da DAR, e não os da faixa Extremo (RN-005).
5. A pessoa abre a trilha de auditoria.
6. O sistema mostra os eventos do alcance da pessoa (RN-098), com quem agiu, quando e o que mudou (RN-095, RN-096), em linguagem simples, agrupados por dia, do mais recente ao mais antigo.
7. A pessoa filtra a trilha por tabela e por período e exporta em CSV os eventos carregados.

## Fluxos alternativos e de exceção

- 1a. A pessoa não tem perfil ativo: o sistema não mostra nenhum dado (RN-026; [[UC-01-entrar-por-link-de-email]], exceção 5a).
- 6a. A pessoa é da CGOV: o sistema mostra a trilha inteira, inclusive as linhas sem objeto, como as de perfis e da DAR (RN-098).
- 6b. Alguém tenta gravar ou alterar a trilha diretamente: o banco recusa (RN-097).
- 7a. Um evento tem texto que começa como fórmula de planilha: o CSV o grava protegido, para não ser executado ao abrir.

## Pós-condição de sucesso

- A pessoa viu o painel, a lista e a trilha do seu alcance, e, se pediu, tem o CSV dos eventos filtrados.
