# P-01 — Apetite (DAR): aba "Proposta e rito" (desenho no Figma)

> **Data:** 2026-11-23 · **Cartão:** "Modelagem — P-01 Apetite (DAR)" no [[quadro]] · **IDs:** UC-14, LAC-08, RF-086, RF-089 a RF-093, RF-122, RF-195
> **Fontes lidas:** [[mapa-telas]] §2 (linha P-01); [[UC-14-propor-declaracao-de-apetite-a-riscos]]; LAC-08 em [[lacunas-norma-sistema]]; fluxo F3 (F3.03 a F3.14); `src/views/DeclaracaoApetiteDarView.vue`.
> **Entrega deste cartão:** só o desenho no Figma, para a CGOV aprovar. Nenhum código, nenhuma migração.

## 1. Por que

Hoje a CGOV muda o apetite de uma categoria em `/dar` e a mudança vale **na hora**, reavaliando os riscos
aprovados, sem manifestação do CTGRIC, deliberação do CIG nem portaria do Presidente (LAC-08, contradição que
bloqueia a homologação). Pela Política (arts. 7º, IV, 8º, § 1º, 12, V e XI, e 13, § 1º) e pela Metodologia
(4.6.4 a 4.6.7), a CGOV **elabora a minuta** da DAR, e o apetite só vale depois da portaria. A tela precisa
separar a **minuta** (o que a CGOV propõe) do **apetite vigente** (o que vale para calcular o Risco Crítico).

## 2. Objetivos, não-objetivos e o que seria fracasso

- **Objetivos:** a CGOV monta a minuta com a prévia de quem entra e sai da criticidade (RF-089, RF-092);
  registra o encaminhamento ao CTGRIC com a data (RF-122); vê em que etapa do rito a DAR está e o prazo de
  10 dias úteis do passo dela (RF-195).
- **Não-objetivos:** registrar a manifestação do CTGRIC e a deliberação do CIG (tela P-05, UC-18) e a
  portaria (tela P-10, UC-25, RF-130). Aqui essas etapas aparecem **só para leitura**, com link para a tela
  que as registra. O Plano de Gestão de Riscos (P-04) também fica fora.
- **Fracasso, mesmo que funcione:** qualquer caminho em que a gravação da CGOV mude o apetite vigente antes da
  portaria; o mesmo dado do rito com duas portas de entrada; chamar o nível 18–25 de "Crítico".

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Etapas no topo + tabela** (escolhida) | `BrStep` horizontal com as etapas do rito e o prazo do passo atual; abaixo, a tabela das 8 categorias "Vigente → Proposto" com o efeito na criticidade; ações da CGOV no rodapé | Tudo numa tela; no celular o `BrStep` fica vertical |
| B. Duas colunas | Tabela da minuta à esquerda, linha do tempo vertical fixa à direita | Bom no computador; no celular a linha do tempo desce para o fim e some do topo |
| C. Assistente passo a passo | Uma etapa por vez, como o formulário de risco | As etapas do CTGRIC, do CIG e da portaria não têm o que preencher aqui; a minuta e o rito nunca aparecem juntos |

**Decisões do responsável (2026-11-23):** a aba mostra o rito inteiro como linha do tempo, e a CGOV só age nos
passos dela (CTGRIC, CIG e portaria só para leitura, com link para P-05 e P-10); layout A.

## 4. O desenho

### 4.1 Abas da tela `/dar` (`BrTabs`)

- **Vigente:** a tela de hoje (resumo em `StatCard`, "Apetite por categoria", "Riscos Críticos agora"), mas
  **só de leitura para todos, inclusive a CGOV**: o `SegmentedControl` vira texto (`RiskBadge`/rótulo) com a
  data e o número da portaria que fixou o apetite. Um `BrMessage` informativo: "O apetite vigente só muda pela
  portaria da DAR. Para propor mudança, use a aba Proposta e rito." *(chamada do Claude: segue da LAC-08.)*
- **Proposta e rito:** a aba nova, descrita abaixo. Quem não é CGOV vê a aba só para leitura *(chamada do
  Claude; os perfis da P-01 estão "fora da matriz" no [[mapa-telas]] e ficam para a CGOV confirmar)*.

### 4.2 Aba "Proposta e rito"

```
[ Vigente ] [ Proposta e rito ]

(1) Minuta ── (2) CTGRIC ── (3) CIG ── (4) Portaria ── (5) Vigente
 ● atual: Minuta da CGOV (sem contador de prazo nesta etapa; ver §6)

Categoria                  Vigente    Proposto        Efeito na criticidade   Texto
Operacional                Moderado   [Baixo|Moderado]  +2 riscos críticos     [Editar]
Legal                      Baixo      [Baixo|Moderado]  sem efeito             [Editar]
Integridade                Pendente   [Baixo|Moderado]  +1 risco crítico       [Editar]
… (as 8 do Quadro 2)

[Salvar minuta]                                  [Encaminhar ao CTGRIC]
```

- **Etapas (`BrStep`):** (1) Minuta da CGOV · (2) Manifestação do CTGRIC, com o passo da CGOV "incorporar as
  ressalvas" dentro dela (F3.09) · (3) Deliberação do CIG · (4) Portaria do Presidente · (5) Vigente. Cada
  etapa mostra a data em que foi cumprida. As etapas 2 a 4 têm link "Registrar na tela do rito" (P-05) ou
  "Registrar publicação" (P-10).
- **Prazo (RF-195):** nos passos da CGOV (consolidar a minuta, encaminhar ao CTGRIC, incorporar as ressalvas),
  "dia N de 10 dias úteis" e a data de início. Passado o prazo, `BrMessage` de aviso (não bloqueia).
- **Tabela (`DataTable`):** uma linha por categoria do Quadro 2: apetite vigente, apetite proposto
  (`SegmentedControl` Baixo/Moderado, só na etapa 1 e só para a CGOV), efeito na criticidade (quantos riscos
  aprovados entram e saem do Risco Crítico com o apetite proposto, pela mesma regra oficial da prévia de hoje)
  e "Editar" o texto da DAR da categoria (`Dialog`).
- **Prévia (`Dialog`):** ao trocar o proposto, a mesma prévia de hoje (lista dos riscos que entram e saem),
  com o título "Efeito **se** a minuta for publicada": nada muda no vigente.
- **Ações (`BrButton`):** "Salvar minuta" (secundário) e "Encaminhar ao CTGRIC" (primário; `Dialog` de
  confirmação com a data do encaminhamento, RF-122). Depois de encaminhada, a minuta fica só de leitura até
  voltar com as ressalvas ou com a reprovação do CIG (ajuste em 30 dias, F3.13).
- **Uma minuta por vez** *(chamada do Claude)*: enquanto houver minuta em andamento, não se abre outra.

### 4.3 Quadros a desenhar na página ✏️ Trabalho — Apetite (DAR)

A 📌 Original fica **intocada** (é o retrato do código atual). Na ✏️ Trabalho, quadros **novos**, ao lado
dos que já estão lá *(chamada do Claude)*:

1. "Vigente (só leitura)" — computador 1440 e celular 390;
2. "Proposta e rito — etapa 1, minuta em edição" — computador 1440 e celular 390;
3. "Proposta e rito — etapa 2, aguardando o CTGRIC" — só computador 1440 (mostra a minuta travada e as datas).

Só componentes da biblioteca RADAR — Painel (`BrTabs`, `BrStep`, `SegmentedControl`, `DataTable`, `Dialog`,
`BrMessage`, `StatCard`, `BrButton`, `RiskBadge`), pelas skills `figma:figma-use` e
`figma:figma-generate-design`. Se faltar variante (ex.: `BrStep` com prazo), o quadro usa texto ao lado e a
falta vira nota, sem criar componente novo neste cartão. Dados de demonstração, sem nome de pessoa.

## 5. Regras que o desenho respeita

Risco Crítico é o residual fora do apetite da DAR, nunca o nível Extremo (> 17 a 25); classes pelo Quadro 8,
sem arredondar; inerente pelo Quadro 7, nunca P × I; "Plano de Gestão de Riscos" por extenso; apetite só Baixo
ou Moderado, ou pendente de DAR (RN-055, RN-010).

## 6. Decisões do responsável sobre os pontos em aberto (2026-11-23)

- **Prazo (RF-195): sem prazo na etapa da minuta.** O contador de 10 dias úteis aparece só em "incorporar as
  ressalvas", contado da data da manifestação do CTGRIC (registrada na P-05). O passo "encaminhar ao CTGRIC"
  fica sem contador no desenho, porque sem data de início da minuta não há de onde contar; o RF-195 fica
  cumprido só em parte, e isso vai anotado no quadro.
- **Sem DAR publicada: mantém a regra atual.** Categoria "pendente de DAR"; residual Alto ou Extremo é Risco
  Crítico (fora de qualquer apetite); residual Médio fica pendente (RN-010; [[matriz-regras-regime-b]] §8). A
  aba Vigente mostra o selo "sem DAR publicada".
- **Perfis: a CGOV edita e todos leem.** Os 10 perfis veem a aba e o andamento do rito; só a CGOV monta, salva
  e encaminha.
- **Encaminhar ao CTGRIC: a DAR sozinha, com aviso.** O `Dialog` de confirmação traz o aviso "O Plano de Gestão
  de Riscos segue por fora até a tela P-04" (Metodologia 4.6.4 manda os dois juntos).
