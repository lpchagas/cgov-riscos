# Nível 1 — Negócio

Guarda **o que a organização faz**, sem falar de tela nem de banco: a visão do produto, o mapa dos
processos, os fluxos oficiais (Mermaid) e as lacunas entre a norma e o sistema. Base normativa: minutas
SEI `024241420` (Política RADAR) e `024421455` (Metodologia).

## Arquivos previstos no plano

- [[visao-produto]] — para quê o RADAR existe e para quem (criada na Tarefa 5).
- [[mapa-processos]] — onde cada fluxo entra no ciclo da Metodologia (itens 4.1 a 5) e na Cadeia de Valor (processo 1.05.2, Gestão de riscos), e como os fluxos se encadeiam (criado na Tarefa 6).
- `fluxos/` — fluxos oficiais em Mermaid, com as atividades `Fn.NN` (criados na Tarefa 6):
  - [[F1-ciclo-gestao-riscos]] — F1 v2, ciclo macro (F1.01 a F1.09);
  - [[F2-avaliacao-tratamento]] — F2 v1, avaliação e tratamento (F2.01 a F2.10);
  - [[F3-aprovacao-dar-plano]] — F3 v3, partes 1 e 2, aprovação da DAR e do Plano (F3.01 a F3.15), com o retrato da minuta como histórico;
  - [[F4-monitoramento-relato-avaliacao]] — F4 v2, partes 1 a 3, monitoramento, relato e avaliação anual (F4.01 a F4.17);
  - [[FS-01-validacao-interna-risco]] — fluxo interno de 3 degraus do RADAR, sem base nas minutas (FS-01.01 a FS-01.12; LAC-11);
  - [[FS-02-analise-ato-por-skills]] — análise de ato normativo pelas skills da CGOV (plugin `cgov-escritorio`) e importação das fichas preliminares no RADAR, com o contrato com o Importar e a decisão pendente do "um clique" (FS-02.01 a FS-02.18; criado na Tarefa 7b).
- [[lacunas-norma-sistema]] — lacunas LAC-01 a LAC-15 (o que a norma saneada pede e o sistema ainda não faz), com severidade, alertas e atividades ligados (criado na Tarefa 7).
- `registro-alertas-f4-f5.md` — alertas normativos F4-NN e F5-NN.

Os demais arquivos serão criados nas tarefas seguintes do plano de reestruturação.
