# UC-15 — Registrar medição de KRI e tratar alerta

> Origem: F4.02 e F4.04 ([[F4-monitoramento-relato-avaliacao]]); Metodologia 4.7.1 (parágrafo do alerta) e 4.7.2 (1º parágrafo); decisão L-40 · RF: RF-098, RF-099, RF-100, RF-101, RF-102, RF-106, RF-109 · RN: RN-027, RN-095, RN-115, RN-052, RN-083, RN-084, RN-085, RN-086, RN-051 · Situação: implementado no código e no banco local, **exceto o RF-106** (registro da reavaliação com motivo, não iniciado, LAC-10) (LAC-03: o KRI completo em 2026-11-22; o alerta, RF-102, e a comunicação, RF-109, em 2026-11-24 e 25; nuvem do piloto: o KRI completo, `20261122004`, aplicado em 2026-11-23; `20261123002` e `20261123003`, aplicadas em 2026-11-25). Desenho: [[0021-alerta-do-kri-e-comunicacoes-no-banco|ADR-0021]]

## Título

Registrar medição de KRI e tratar alerta.

## Ator principal

Gestor de riscos (1ª linha), responsável pelo monitoramento do KRI.

## Pré-condições

- O risco tem KRI cadastrado ([[UC-07-definir-tratamento-plano-de-acao-e-kri]]).
- O gestor grava na unidade do risco (RN-027).

## Pós-condições

- Lançar medição ou mudar a situação de execução de uma ação não reabre o risco aprovado (RN-052).
- Toda medição gravada fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. O gestor registra a medição do KRI, com a data e o valor apurado (RN-115).
2. O gestor informa o valor como número, na mesma unidade do limite do KRI (o sistema mostra a unidade ao lado; ela é só para exibição e o banco não a confere). O **banco** compara esse número com o operador e o valor do limite e marca a leitura em alerta; o gestor não marca o alerta à mão (RN-084).
3. O sistema grava a medição sem reabrir o risco aprovado (RN-052).
4. O gestor atualiza a situação de execução das ações de tratamento (RN-115).
5. O sistema mostra as ações com prazo próximo ou vencido, a mais urgente primeiro.

## Fluxos alternativos e de exceção

- 1a. O KRI não tem limite de alerta numérico definido (dado antigo em texto, vazio ou "limite a converter"): não há como saber se a medição está em alerta (RN-083). A migração converte só os textos sem ambiguidade (ex.: `> 10%`); os demais aparecem como "limite a converter" na etapa 4 do formulário, com o texto antigo à vista, e a unidade corrige. Desde a LAC-03 (2026-11-22, implementado no código e no banco local; nuvem do piloto: aplicada em 2026-11-23) a tela de monitoramento mostra "limite não definido" e nada é mais gravado como "A definir"; o risco crítico não é enviado, validado nem homologado sem KRI completo. A tela mostra cada KRI uma vez, com os riscos ligados, e a medição vale para todos eles.
- 2a. **O KRI passou do limite de alerta.** O gestor deve reavaliar o risco ([[UC-24-reavaliar-risco]]) e comunicar o resultado à CGOV em até 10 dias úteis contados da ciência do alerta (RN-084). O sistema abre o alerta na primeira leitura além do limite, com a ciência no dia do registro, e mostra na tela de Monitoramento a faixa de alerta com o "dia N de 10 dias úteis" (dias úteis = segunda a sexta sem os feriados da tabela `feriados`), o vencimento e dois atalhos: "Reavaliar" (leva à ficha do risco, até existir a tela própria de reavaliação, UC-24) e "Comunicar à CGOV" (leva a `/comunicacoes?alerta=<id>`). Leitura posterior dentro do limite não encerra o alerta e nova leitura em alerta não reinicia o prazo; o alerta só se encerra com a comunicação à CGOV, e "comunicado" vale até a próxima leitura em alerta (RF-099, RF-102; LAC-03). Um alerta de KRI **sem risco ligado** aparece na lista, mas sem "Comunicar à CGOV": a tela orienta ligar o KRI a um risco (decisão D-7, 2026-11-25).
- 2a.1. **Alerta que coincide com as hipóteses I a III.** Se o resultado da reavaliação for também uma das hipóteses I a III do item 4.7.2 (mudança do nível residual ou do enquadramento no apetite; falha de controle de risco crítico; materialização de risco crítico), uma só comunicação basta: a do resultado do alerta supre a da hipótese, desde que feita no mesmo prazo de 10 dias úteis (RN-085, RN-086; decisão L-40). O registro é o do [[UC-16-comunicar-fato-de-risco-a-cgov]], exceção 2a (implementado; RF-109; LAC-03 e LAC-04).
- 2a.2. A reavaliação muda a probabilidade, o impacto ou o controle de risco aprovado: o risco reabre para validação ([[UC-08-enviar-risco-para-validacao]], exceção 1a; RN-051).

## Pós-condição de sucesso

- A medição está gravada, com a marca de alerta calculada pelo banco, e a situação das ações está atualizada, sem reabrir o risco aprovado. Se houve alerta, há um registro de alerta com o prazo em dias úteis.
