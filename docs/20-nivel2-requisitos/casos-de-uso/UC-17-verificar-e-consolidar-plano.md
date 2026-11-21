# UC-17 — Verificar e consolidar o Plano de Gestão de Riscos

> Origem: F3.03 a F3.07 ([[F3-aprovacao-dar-plano]]); Metodologia 4.6.2 e 4.6.3; decisão F5-11 (10 dias úteis por passo da CGOV, não aplicada ao texto) · RF: RF-114, RF-115, RF-116, RF-117, RF-118, RF-119, RF-120, RF-121, RF-123 · RN: RN-059, RN-063, RN-064, RN-106, RN-065, RN-066, RN-067
>
> Situação: proposto (LAC-01)

## Título

Verificar e consolidar o Plano de Gestão de Riscos.

## Ator principal

CGOV (perfil `cgov`), como 2ª linha.

## Pré-condições

- Os gestores comunicaram os riscos críticos para a carteira do ciclo ([[UC-21-comunicar-risco-critico-para-o-plano]]).

## Pós-condições

- A CGOV não altera o mérito das decisões da 1ª linha (RN-063).
- Cada verificação, devolução e ressalva fica registrada com a data.

## Fluxo principal de sucesso

1. A CGOV abre a carteira do ciclo, com os riscos críticos comunicados.
2. A CGOV verifica a completude e a consistência metodológica de cada risco, sem entrar no mérito (RN-063); o sistema registra a verificação.
3. O sistema mostra o prazo de 10 dias úteis de cada passo da CGOV (RN-066).
4. A CGOV consolida os riscos verificados num Plano de Gestão de Riscos único (RN-063).
5. O sistema guarda a versão do Plano em tramitação.
6. A CGOV encaminha o Plano consolidado ao CTGRIC, junto com a minuta da DAR (RN-067); o sistema registra o encaminhamento, com a data e a lista dos riscos consolidados com ressalva. Segue no [[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig]].

## Fluxos alternativos e de exceção

- 1a. Não há DAR vigente: o Plano será apreciado quanto à conformidade com a Política (RN-059).
- 2a. **Devolução com pendências.** O risco está incompleto ou inconsistente: a CGOV o devolve ao gestor que o comunicou, com a lista de pendências (RN-064); o sistema mostra ao gestor e à CGOV o prazo de 10 dias úteis para sanar (RN-106).
- 2a.1. O gestor sana as pendências no prazo: volta ao passo 2.
- 2a.2. **Consolidação com ressalva de incompletude.** As pendências não foram sanadas em 10 dias úteis: a CGOV consolida o risco com ressalva de incompletude, dá ciência à chefia imediata do gestor, quando houver, e informa o CTGRIC (RN-065). O sistema marca a ressalva, registra a ciência à chefia e inclui o risco na lista dos consolidados com ressalva do passo 6. O efeito da ressalva fica fora do fluxo (alerta F5-17, aberto).
- 2a.3. O mesmo risco volta a ser devolvido: a norma não limita o número de devoluções (alerta F5-12, aberto).
- 2b. **Hoje:** o RADAR não tem carteira, verificação, devolução da CGOV nem ressalva. A única devolução do sistema é a do fluxo interno ([[UC-11-devolver-risco-para-ajuste]]), feita pela chefia, sem prazo (LAC-01; não tratado pelo sistema; cartão LAC-01 no Kanban).

## Pós-condição de sucesso

- O Plano consolidado (e a minuta da DAR) está registrado como versão em tramitação e encaminhado ao CTGRIC, com a lista dos riscos consolidados com ressalva.
