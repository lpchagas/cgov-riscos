# P-02 — Monitoramento: tratar alerta de KRI (desenho no Figma)

> **Data:** 2026-11-23 · **Cartão:** "Modelagem — P-02 Monitoramento" no [[quadro]] · **IDs:** UC-15, LAC-03, RF-098 a RF-102, RF-109, RN-083, RN-084, RN-085
> **Fontes lidas:** [[mapa-telas]] §2 (linha P-02); [[UC-15-registrar-medicao-de-kri-e-tratar-alerta]]; RN-084 e RN-085 em [[regras-negocio]]; `src/views/MonitoramentoKriPlanoAcaoView.vue`; migração `20261122004_lac03_kri_obrigatorio.sql`.
> **Entrega deste cartão:** só o desenho no Figma, para a CGOV aprovar. Nenhum código, nenhuma migração.

## 1. Por que

Pela Metodologia 4.7.1 (parágrafo do alerta, texto saneado; RN-084), passado o limite de alerta do KRI, o
gestor deve **reavaliar o risco e comunicar o resultado à CGOV em até 10 dias úteis contados da ciência do
alerta**. Hoje o RADAR só guarda uma marca "passou do limite", posta à mão na leitura; não compara o valor com
o limite, não conta o prazo e não leva o gestor à reavaliação (RF-099 parcial; RF-102 não iniciado). O motivo
de fundo: o limite de alerta é **texto livre** (ex.: `< 80%`), e o sistema não tem como comparar.

## 2. Objetivos, não-objetivos e o que seria fracasso

- **Objetivos:** o sistema detecta sozinho a leitura que passa do limite (RF-099); o cartão do KRI em alerta
  mostra desde quando, o contador "dia N de 10 dias úteis" e a data de vencimento (RF-102); dali o gestor vai
  direto à reavaliação de cada risco ligado e à comunicação à CGOV.
- **Não-objetivos:** o registro da reavaliação (tela P-09, UC-24) e o da comunicação, com "supre as hipóteses
  I a III" (tela P-03, UC-16, RF-109). Aqui só os **atalhos** para elas. O alerta no Painel ("Precisa da sua
  atenção") e a cobrança pela CGOV (P-07) também ficam fora.
- **Fracasso, mesmo que funcione:** o mesmo dado (reavaliação ou comunicação) com duas portas de entrada; um
  prazo que já nasce vencido; um alerta que some sem que a comunicação tenha sido registrada; o gestor ainda
  precisar decidir à mão se a leitura passou do limite.

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Faixa no cartão do KRI** (escolhida) | Na aba Indicadores, o cartão do KRI em alerta ganha uma faixa de aviso com o prazo e os atalhos; o `StatCard` "Em alerta" filtra esses cartões | Só componentes que já existem; o alerta fica junto da leitura que o causou |
| B. Aba nova "Alertas" | Terceira aba com a tabela dos alertas abertos | Visão de conjunto, mas separa o alerta do KRI e acrescenta uma aba |
| C. Só no Painel | O alerta aparece em "Precisa da sua atenção"; o monitoramento só mostra o selo | O gestor que mede não vê o prazo onde registra a leitura |

**Decisões do responsável (2026-11-23):**
- **Alcance:** a P-02 mostra o alerta, a ciência e o prazo, com atalhos para a P-09 (reavaliar) e a P-03
  (comunicar). Cada registro tem uma tela só.
- **Detecção:** **limite numérico, automático.** O KRI passa a ter a condição de alerta em operador + número
  (+ unidade), e o sistema compara cada leitura. Isso pede migração, que fica para o cartão do código do
  alerta (Backlog, "Alerta do KRI"), com plano autorizado.
- **Layout:** A.

## 4. O desenho

### 4.1 Etapa 4 do formulário de risco: limite de alerta numérico

```
Limite de alerta
Alerta quando o valor for  [menor que ▾]  [ 80 ]  [ % ]
                           maior que · maior ou igual a · menor que · menor ou igual a
```

- Três campos (`FormField`): operador (lista com as 4 opções), número e unidade (texto curto, opcional, ex.:
  `%`, `dias`). A frase lida em voz alta é "Alerta quando o valor for menor que 80 %".
- O KRI só é completo (trava da LAC-03, RN-083) com operador e número preenchidos.
- **KRI antigo com limite em texto** *(chamada do Claude)*: aparece o texto antigo só para leitura, com o
  aviso "Limite a converter: informe o operador e o número". Até ser convertido, conta como limite não
  definido e não gera alerta.

### 4.2 Janela "Registrar leitura" (`Dialog`)

- Sai a caixa "A leitura passou do limite de alerta". No lugar, um `BrMessage` que muda enquanto o gestor
  digita o valor: "Dentro do limite (alerta quando menor que 80 %)" ou "**Esta leitura passa do limite**: ao
  gravar, o KRI entra em alerta e começa o prazo de 10 dias úteis."
- KRI com limite a converter: a leitura grava, e a mensagem diz "Sem limite numérico: o sistema não verifica
  o alerta".

### 4.3 Aba Indicadores: cartão do KRI em alerta

Base: o monitoramento **como o código está hoje** (uma linha por KRI, com os riscos ligados, "limite não
definido"; LAC-03). Sobre ela, o cartão em alerta:

```
┌ KRI · Taxa de vistorias no prazo ─────────────── ⚠ Em alerta ┐
│ Alerta quando menor que 80 %  ·  Última leitura: 72 % (21/11) │
│ ┌ ⚠ Em alerta desde 21/11 · dia 3 de 10 dias úteis           ┐ │
│ │   (vence em 05/12)                                         │ │
│ │ Reavalie os riscos ligados e comunique o resultado à CGOV. │ │
│ │ R-012 · Fiscalização ambiental   [Reavaliar]               │ │
│ │ R-019 · Autos de infração        [Reavaliar]               │ │
│ │                                  [Comunicar à CGOV]        │ │
│ └────────────────────────────────────────────────────────────┘ │
│ Leituras: 72 % (21/11) · 81 % (21/10) · …    [Registrar leitura] │
└────────────────────────────────────────────────────────────────┘
```

- **Ciência do alerta** *(chamada do Claude)*: o dia em que a leitura em alerta foi **registrada no sistema**,
  não a data da medição (que pode ser antiga); assim o prazo nunca nasce vencido.
- **Prazo:** "dia N de 10 dias úteis" e "vence em dd/mm". Vencido: a faixa passa de aviso a perigo, com
  "Prazo vencido há N dias úteis" (não bloqueia nada). Dias úteis: segunda a sexta, sem feriados nacionais
  *(chamada do Claude; o calendário de feriados é do cartão do código)*.
- **Um botão "Reavaliar" por risco ligado** *(chamada do Claude: o KRI pode valer para vários riscos do mesmo
  objeto, e a reavaliação é por risco)*. Leva à ficha do risco, ação "Reavaliar" (P-09).
- **"Comunicar à CGOV"** leva à P-03 já com o motivo "Resultado da reavaliação por alerta do KRI" escolhido.
- **Fim do alerta** *(chamada do Claude)*: quando a comunicação é registrada na P-03, a faixa vira "Alerta
  comunicado à CGOV em dd/mm" (sucesso). Nova leitura em alerta com um alerta ainda aberto não reinicia o
  prazo; leitura dentro do limite não encerra o alerta aberto.
- **Topo:** o `StatCard` "Em alerta" passa a contar os alertas abertos e, ao clicar, filtra a aba (só os
  cartões em alerta).
- **Celular (390):** a faixa ocupa a largura do cartão; os botões "Reavaliar" ficam empilhados, um por risco,
  e "Comunicar à CGOV" no fim, em largura total.
- **Perfis:** quem só lê (AUDIT, por exemplo) vê a faixa e o prazo, sem os botões (segue a linha
  "Monitoramento" da Matriz §7).

### 4.3.1 Revisão do responsável sobre a lista (2026-11-23)

Depois de ver os quadros, o responsável achou a lista longa demais e os cartões difíceis de separar. Decidiu:

- **Navegação: urgência + filtro + páginas.** A lista vem por urgência (prazo vencido, em alerta, alerta
  comunicado, sem limite numérico, dentro do limite), com filtro por situação e contagem (`SegmentedControl`:
  Todos · Em alerta · Sem limite · Dentro do limite) e páginas numeradas de 10 cartões, no padrão da
  paginação do `DataTable`. O que pede ação nunca cai na página 2. Ficaram de fora: só paginar, sem ordem
  (o alerta podia sumir na página 2), e rolagem com cartões compactos.
- **Separação: cartão + faixa de cor.** Cada KRI é um cartão com borda e cantos arredondados, com fundo
  cinza-claro entre eles e uma faixa à esquerda na cor do selo (vermelho em alerta, verde dentro do limite,
  cinza sem limite). Ficaram de fora: cartão só com borda, e fundo alternado.
- **Cartão compacto** *(chamada do Claude)*: meta, responsável e histórico de leituras vão para "Ver
  detalhes", que abre e fecha (como o `<details>` de hoje); no cartão ficam o limite, a última leitura e a
  faixa de alerta.
- **Nome do indicador do topo** *(chamada do Claude)*: "Alertas abertos" (prazo correndo), para não
  confundir com o filtro "Em alerta" (KRIs cuja última leitura passou do limite).
- **Para o código:** os números das páginas não existem no `DataTable` de hoje (ele mostra a faixa e as
  setas); o cartão do código acrescenta os números aos dois.

### 4.4 Quadros a desenhar na página ✏️ Trabalho — Monitoramento

A 📌 Original fica **intocada**. Na ✏️ Trabalho:

0. **Base alinhada ao código** (fecha o cartão do Backlog "Atualizar no Figma a etapa 4 do formulário e o
   monitoramento com os campos do KRI"): o monitoramento com uma linha por KRI e os riscos ligados, e a etapa 4
   do formulário com os campos do KRI e "Usar um KRI já definido neste objeto".
1. "P-02 · Indicadores com KRI em alerta" — computador 1440 e celular 390: um KRI dentro do limite, um em
   alerta (dia 3 de 10), um com prazo vencido e um comunicado.
2. "P-02 · Registrar leitura, passa do limite" — computador 1440 (o `Dialog` com a mensagem automática).
3. "P-02 · Etapa 4, limite de alerta numérico" — computador 1440 e celular 390 (com o caso "limite a converter").

Só componentes da biblioteca RADAR — Painel (`StatCard`, `BrTabs`, `BrMessage`, `BrButton`, `Dialog`,
`FormField`, `Chip`, `RiskBadge`), pelas skills `figma:figma-use` e `figma:figma-generate-design`. Se faltar
variante, texto ao lado e nota, sem componente novo neste cartão. Dados de demonstração, sem nome de pessoa.

## 5. Regras que o desenho respeita

Risco Crítico é o residual fora do apetite da DAR, nunca o nível Extremo (> 17 a 25); classes pelo Quadro 8,
sem arredondar; inerente pelo Quadro 7, nunca P × I; "Plano de Gestão de Riscos" por extenso. Registrar
leitura não reabre o risco aprovado (RN-052); a reavaliação que muda P, I ou controle reabre (RN-051, na P-09).

## 6. O que fica para o cartão do código (Backlog, "Alerta do KRI")

Migração do limite (operador, número, unidade) e conversão dos limites em texto; data de ciência e
encerramento do alerta no banco; calendário de dias úteis; teste de que a medição grava `em_alerta` pela
comparação (fecha o RF-099); atualizar RF-099, RF-102 e o UC-15 (fluxo 2), que hoje dizem "marcado à mão".
