# Pedido de mudança da skill `cgov-gestao-riscos`: tabela do Regime B com 18 colunas

> **Data:** 2026-11-23 · **Decisão:** [[0020-tabela-da-skill-com-18-colunas|ADR-0020]] · **Desenho:** [[2026-11-23-importador-primeira-carga-design]] (§4.1) · **Contrato atual:** [[FS-02-analise-ato-por-skills]], "Contrato com o Importar"
> **Cartão do Kanban:** "Aplicar o pedido de 18 colunas na skill `cgov-gestao-riscos` (repositório cgov-geral)".

## 1. O que este documento é, e o que ele não é

O importador do RADAR já aceita a tabela de **18 colunas** (e continua aceitando a de 16). Para o analista
receber a tabela nesse formato, a skill `cgov-gestao-riscos` precisa passar a entregá-la. Este documento traz o
**texto pronto para colar** na skill. Ele **não altera a skill**.

> **Atenção.** A skill vive em outro repositório, o `cgov-geral`. A mudança deve ser aplicada **lá, numa sessão
> própria, seguindo o processo daquele repositório**: verificação de sanitização (nenhum dado pessoal ou real
> nos exemplos), registro da decisão no diário daquele repositório e a publicação do plugin. Nada disso é feito
> a partir do `cgov-riscos`.

## 2. O formato pedido

A ordem das colunas 1 a 16 **não muda**, e o formato vale **só para o Regime B**. Entram duas colunas no fim e um marcador na col. 9. O importador lê
**por posição**.

| Col. | Conteúdo | Observação |
| --- | --- | --- |
| 1 a 16 | as mesmas de hoje (ID, Objeto de GR, Descrição na sintaxe, Categoria, P, I, Inerente, Classe, Controles e evidências, Eficácia e fator, Residual, Classe residual, Apetite da categoria, Crítico?, Estratégia, KRI) | sem mudança de ordem |
| 9 | Controles e evidências | **deve terminar com** `Evidência: sim` ou `Evidência: não` (sem diferença de acento e de maiúsculas) |
| 17 | Teste de Integridade | `Sim` ou `Não`: "Sim" quando o risco envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação (RN-006) |
| 18 | Justificativa (Integridade) | obrigatória, com pelo menos 10 caracteres, quando a col. 17 é "Sim" e a categoria não é Integridade (RN-018); vazia nos demais casos |

Regras de leitura que a skill deve respeitar:

- Sem o marcador na col. 9, o RADAR considera o controle **sem evidência** (eficácia máxima Fraco, Quadro 6) e
  avisa o analista. Qualquer "não" no marcador vale sem evidência.
- A col. 17 só aceita `Sim` ou `Não`. Outro valor, inclusive vazio, bloqueia a importação do lote.
- Sem barra vertical (`|`) dentro do texto de uma célula: ela desloca as colunas seguintes.

## 3. Trechos a alterar no `SKILL.md`

Texto **vigente** conferido em 2026-11-23 no `SKILL.md` da `cgov-gestao-riscos` (cópia instalada do plugin
`cgov-escritorio`, §3.9 e §4). Cada trecho vigente vem citado ao lado do proposto, para aplicar com segurança.

**Só o Regime B muda.** As 18 colunas valem **apenas para o Regime B**. A tabela do Regime A (13 colunas) e a regra
do Regime A para controles ficam **sem nenhuma alteração**.

**Onde cada coisa vale.** O §3.9 só se aplica quando a skill roda como subsídio de Nota Técnica. A tabela do
Regime B, porém, é entregue pelo §4 em qualquer uso. Por isso a regra da col. 17 e da col. 18 entra **nos dois
lugares**: no §3.9, item 2 (uso em NT), e no §4, item 1 (qualquer uso, inclusive fora da NT).

### 3.1 §3.9, item 2 (Teste de Integridade, uso em NT)

Texto vigente:

> 2. **Teste de Integridade:** registre uma linha por risco (sim/não e subcategoria)
>    sempre que houver decisão sobre beneficiário, autorização, sanção ou atestação.
>    Não use a categoria "Operacional com interface de Integridade".

Texto proposto (substitui o item 2):

> 2. **Teste de Integridade:** para cada risco, aplique o teste sempre que houver decisão sobre beneficiário,
>    licença ou autorização, fiscalização ou sanção, ou contratação ou atestação (gatilhos: regra adotada pelo RADAR;
>    referência normativa: Programa Integra+, Portaria ICMBio nº 253/2026, e Quadro 3 para as subcategorias). No **Regime B**, o resultado vai nas **colunas 17 e 18 da matriz** (§4, item 1), e não numa linha
>    solta: `Sim` ou `Não` na coluna 17 e, quando for `Sim` e a categoria não for Integridade, a justificativa na
>    coluna 18 (veja o §4). No Regime A, mantenha o registro de uma linha por risco (sim/não e subcategoria).
>    Não use a categoria "Operacional com interface de Integridade".

### 3.2 §3.9, item 3 (Controles): só uma frase

Texto vigente:

> 3. **Controles:** considere só os previstos no ato ou comprovados nos autos,
>    avaliados pelo desenho. No Regime A, sem evidência de funcionamento, nenhum
>    controle fica acima de **Mediano** (no Regime B vale a regra do item 3.3:
>    **Fraco**). O mesmo controle recebe a mesma eficácia em toda a matriz.

Texto proposto (acrescentar ao fim do item 3, sem mudar o resto):

>    No Regime B, termine a célula "Controles e evidências" da matriz com o marcador `Evidência: sim` ou
>    `Evidência: não` (veja o §4, item 1).

### 3.3 §4, item 1 (matriz): o bullet do Regime B

O bullet do **Regime A** não muda. Texto vigente do bullet do Regime B:

>    - **Regime B:** ID · Objeto de GR · Descrição na sintaxe · Categoria
>      (subcategoria, se Integridade) · P · I · Inerente (célula do Quadro 7) ·
>      Classe · Controles e evidências · Eficácia e fator · Residual · Classe
>      residual · Apetite da categoria · **Crítico?** (sim / não / pendente de DAR) ·
>      Estratégia · KRI.

Texto proposto (substitui só esse bullet; depois dele, acrescentar o parágrafo seguinte, que vale em qualquer uso):

>    - **Regime B (18 colunas):** ID · Objeto de GR · Descrição na sintaxe · Categoria
>      (subcategoria, se Integridade) · P · I · Inerente (célula do Quadro 7) ·
>      Classe · Controles e evidências · Eficácia e fator · Residual · Classe
>      residual · Apetite da categoria · **Crítico?** (sim / não / pendente de DAR) ·
>      Estratégia · KRI · **Teste de Integridade** (`Sim` ou `Não`) · **Justificativa
>      (Integridade)**.
>
>    Regras das colunas novas do Regime B (valem em qualquer uso da skill, com ou sem Nota Técnica):
>    - **Controles e evidências (col. 9):** termine **sempre** com `Evidência: sim` (há evidência comprovada de que
>      o controle funciona) ou `Evidência: não` (previsto, sem comprovação de funcionamento). O marcador decide a
>      trava do Quadro 6: controle sem evidência comprovada não recebe eficácia acima de **Fraco (0,9)**. Na dúvida,
>      escreva `Evidência: não`.
>    - **Teste de Integridade (col. 17):** `Sim` quando o risco envolve decisão sobre beneficiário, licença ou
>      autorização, fiscalização ou sanção, ou contratação ou atestação; `Não` nos demais. Só `Sim` ou `Não`.
>    - **Justificativa (Integridade) (col. 18):** obrigatória, com pelo menos 10 caracteres, quando a coluna 17 é
>      `Sim` e a categoria **não** é Integridade (explique por que o risco envolve esse tipo de decisão); vazia nos
>      demais casos.
>    - Uma barra vertical (`|`) dentro do texto de uma célula desloca as colunas seguintes: não use.
>    - Os números das colunas 7, 8, 11, 12 e 14 servem de conferência: o RADAR recalcula o inerente (Quadro 7, sem
>      multiplicar P por I), o residual (inerente × fator do Quadro 6) e a classe (Quadro 8, sem arredondar) e avisa
>      o analista quando difere; valem os números do RADAR.

## 4. Duas linhas de exemplo (dados de demonstração)

Dados fictícios, sem pessoa, processo ou número SEI reais. Para a skill, cole só as linhas de exemplo, não o
cabeçalho repetido.

```markdown
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI | Teste de Integridade | Justificativa (Integridade) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-01 | Concessão de autorização (demonstração) | Devido a ausência de checklist documental, poderá ocorrer a emissão de autorização indevida, ocasionando dano ambiental em unidade de conservação e impactando o alcance do objetivo de conservação da biodiversidade. | Operacional | 5 | 5 | 25 | Extremo | Conferência manual sem registro formal. Evidência: não | Fraco (0,9) | 22,5 | Extremo | pendente de DAR | pendente de DAR | Mitigar | % de processos revisados no trimestre | Sim | A autorização beneficia um requerente específico e depende da decisão do analista. |
| RSC-02 | Seleção de cargos de confiança (demonstração) | Devido a ausência de critério objetivo na escolha de pessoal, poderá ocorrer a nomeação de parente em cargo de confiança, ocasionando favorecimento indevido e impactando o alcance do objetivo de integridade institucional. | Integridade: Nepotismo | 3 | 4 | 18 | Extremo | Norma interna de seleção, com registro das nomeações conferido. Evidência: sim | Mediano (0,75) | 13,5 | Alto | pendente de DAR | pendente de DAR | Mitigar | % de nomeações com critério registrado | Sim | |
```

O que cada linha mostra:

- **RSC-01** (Operacional, Teste de Integridade "Sim"): como a categoria não é Integridade, a col. 18 é
  obrigatória, com pelo menos 10 caracteres. Sem evidência, a eficácia fica em Fraco (0,9): 25 × 0,9 = 22,5, que
  é **Extremo** (> 17 a 25).
- **RSC-02** (Integridade, subcategoria do Quadro 3): a col. 18 fica vazia, porque a categoria já é Integridade.
  Com evidência, o Mediano (0,75) vale: 18 × 0,75 = 13,5, que é **Alto** (> 10 a 17). "Crítico?" só se decide
  frente à DAR, por isso "pendente de DAR" enquanto o apetite não estiver declarado.

## 5. Como aplicar no repositório `cgov-geral`

1. Abrir uma sessão própria no `cgov-geral` e ler o processo daquele repositório.
2. No `SKILL.md` da `cgov-gestao-riscos`, aplicar os três trechos da seção 3: o item 2 do §3.9, a frase final do
   item 3 do §3.9 e o **bullet do Regime B** do item 1 do §4 (com o parágrafo das colunas novas). Não mexer no
   Regime A. Atualizar também o modelo da tabela, se houver, com as 18 colunas e as duas linhas de exemplo.
3. Rodar a verificação de sanitização exigida lá (nenhum dado pessoal ou real nos exemplos).
4. Registrar a decisão no diário de decisões daquele repositório e publicar o plugin pelo rito dele.
5. No RADAR, atualizar a data e a versão da skill lidas no [[FS-02-analise-ato-por-skills]] (cabeçalho e
   "Contrato com o Importar") e mover o cartão do Kanban.

Até a skill ser atualizada, o analista continua usando a tabela de 16 colunas, e o RADAR avisa, linha a linha,
o que a tabela não traz.
