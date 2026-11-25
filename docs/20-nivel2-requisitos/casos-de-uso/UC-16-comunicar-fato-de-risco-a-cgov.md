# UC-16 — Comunicar fato de risco à CGOV (6 hipóteses)

> Origem: F4.05 ([[F4-monitoramento-relato-avaliacao]]); Metodologia 4.7.2, caput e incisos I a VI; Política art. 17, IV; decisão L-40 · RF: RF-107, RF-108, RF-192, RF-109, RF-110, RF-111 · RN: RN-086, RN-085, RN-084, RN-090
>
> Situação: implementado no código e no banco local em 2026-11-25 (LAC-04; nuvem do piloto: a aplicar, com autorização), exceto o RF-110 (propor a comunicação da hipótese I). Desenho: [[0021-alerta-do-kri-e-comunicacoes-no-banco|ADR-0021]]. Decisões do responsável de 2026-11-25: **D-6** a CGOV também mantém o botão "Nova comunicação" (o banco permite); **D-7** alerta de KRI sem risco ligado continua sem "Comunicar à CGOV" (a tela orienta), sem migração nova

## Título

Comunicar fato de risco à CGOV (6 hipóteses do item 4.7.2).

## Ator principal

Gestor de riscos (1ª linha).

## Pré-condições

- O risco está registrado no RADAR.
- O gestor tomou ciência de um fato de uma das 6 hipóteses do item 4.7.2.

## Pós-condições

- A comunicação gravada não é apagada; a data da ciência fica registrada para contar o prazo.

## Fluxo principal de sucesso

1. O gestor toma ciência de um fato de uma das 6 hipóteses: (I) mudança do nível residual ou do enquadramento no apetite, de modo que o risco passe a ser ou deixe de ser crítico; (II) falha de controle de risco crítico que o reduza no Quadro 6; (III) materialização de risco crítico; (IV) risco emergente; (V) atraso ou dificuldade no tratamento; (VI) situação que possa demandar revisão do Plano ou apreciação pelas instâncias de governança (RN-086).
2. O gestor abre "Nova comunicação" na tela `/comunicacoes`, escolhe a hipótese, informa a data em que tomou ciência do fato, descreve o fato e, nas hipóteses I, II, III e V, escolhe os riscos comunicados (a lista traz só os riscos da unidade e das subunidades; nas hipóteses IV e VI o risco é opcional).
3. O sistema mostra o prazo de 10 dias úteis, contado da ciência (RN-086).
4. O sistema grava a comunicação, com a data, numa só transação com os riscos ligados (`enviar_comunicacao`), e a mostra à CGOV, com a hipótese, a data da ciência e a data da comunicação. Fora do prazo, **grava mesmo assim** e marca "fora do prazo": o prazo é informação, não trava. A comunicação enviada não se edita nem se apaga.
5. A CGOV vê as comunicações de todas as unidades, com o número de novas no menu, e registra a **ciência** (uma só vez, com observação opcional). Ela usa a comunicação no acompanhamento ([[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias]]) e na decisão sobre revisar o Plano ([[UC-23-revisar-plano-de-gestao-de-riscos]]).

## Fluxos alternativos e de exceção

- 1a. Uma gravação da ficha muda a classificação residual ou a criticidade (hipótese I): o sistema propõe ao gestor o registro da comunicação (RF-110).
- 2a. **Alerta do KRI que coincide com as hipóteses I a III.** O fato veio de alerta do KRI ([[UC-15-registrar-medicao-de-kri-e-tratar-alerta]], exceção 2a): a comunicação do resultado da reavaliação supre a das hipóteses I a III, quando coincidirem e forem feitas no mesmo prazo de 10 dias úteis contados da ciência do alerta (RN-084, RN-085; decisão L-40). O sistema registra uma só comunicação, marcando as hipóteses supridas (RF-109).
- 3a. O prazo de 10 dias úteis passou sem a comunicação: a falta vira pendência que a CGOV cobra ([[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias]]; RN-090).
- 2b. **Comunicação vinda do alerta do KRI.** O gestor chega por "Comunicar à CGOV" do Monitoramento (`/comunicacoes?alerta=<id>`): o painel abre com a hipótese "Resultado da reavaliação por alerta do KRI", a ciência do alerta e os riscos do KRI; o gestor pode marcar quais das hipóteses I a III a comunicação supre. Ao enviar, o banco encerra o alerta (uma comunicação por alerta). A unidade que comunica é a do objeto do KRI; se faltar, a do primeiro risco; se faltar, a do perfil.
- 2c. **Alerta de KRI sem risco ligado** (D-7): o Monitoramento mostra o alerta, mas sem "Comunicar à CGOV"; a tela orienta ligar o KRI a um risco. O banco não aceita comunicação do alerta sem risco.
- 2d. **CGOV como autora** (D-6): a CGOV também tem o botão "Nova comunicação" (o banco permite; a semente de demonstração traz uma). A AUDIT só lê e não envia.
- 4a. **Apagar risco ou KRI comunicado:** o banco recusa apagar risco que foi comunicado e KRI com alerta aberto ou comunicado, com aviso claro, para a comunicação não perder o registro.

## Pós-condição de sucesso

- A comunicação está registrada, com a hipótese, a data da ciência e a data da comunicação, e está visível para a CGOV.
