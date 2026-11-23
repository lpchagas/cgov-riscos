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

A ordem das colunas 1 a 16 **não muda**. Entram duas colunas no fim e um marcador na col. 9. O importador lê
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

## 3. Texto proposto

### 3.1 Para o §3.9, item 2 (Teste de Integridade)

> **Substituir** a linha solta do Teste de Integridade pelo texto abaixo.
>
> 2. **Teste de Integridade (Portaria ICMBio nº 253/2026; Quadro 3).** Para cada risco, aplique o Teste de
>    Integridade: se houver decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou
>    contratação ou atestação, o resultado é **Sim**; caso contrário, **Não**. O resultado vai na **coluna 17**
>    da matriz ("Teste de Integridade"), escrito exatamente como `Sim` ou `Não`. Quando o resultado for "Sim" e a
>    categoria do risco **não** for Integridade, escreva na **coluna 18** ("Justificativa (Integridade)") uma
>    frase de pelo menos 10 caracteres que explique por que o risco, embora de outra categoria, envolve decisão
>    desse tipo. Nos demais casos, deixe a coluna 18 vazia. Nunca use a categoria mista "Operacional com
>    interface de Integridade"; quando a categoria for Integridade, informe a subcategoria do Quadro 3 na
>    coluna 4 (`Integridade: <subcategoria>`).

### 3.2 Para o §3.9, item 3, e o §4, item 1 (colunas da matriz do Regime B)

> **Substituir** a lista de 16 colunas por esta, de 18:
>
> A matriz do Regime B tem **18 colunas**, nesta ordem, em tabela Markdown de uma linha por risco:
> 1. ID (`RSC-NN`); 2. Objeto de GR; 3. Descrição na sintaxe do item 4.2.1; 4. Categoria (`Integridade:
> <subcategoria>` quando for o caso); 5. P; 6. I; 7. Inerente (célula do Quadro 7); 8. Classe; 9. Controles e
> evidências; 10. Eficácia e fator; 11. Residual; 12. Classe residual; 13. Apetite da categoria; 14. Crítico?;
> 15. Estratégia; 16. KRI; 17. Teste de Integridade (`Sim` ou `Não`); 18. Justificativa (Integridade).
>
> **Coluna 9.** Descreva os controles existentes e termine **sempre** com o marcador `Evidência: sim` (há
> evidência comprovada de que o controle funciona) ou `Evidência: não` (o controle está previsto, mas não há
> comprovação de funcionamento). O marcador decide a trava do Quadro 6: controle sem evidência comprovada não
> recebe eficácia acima de **Fraco (0,9)**. Se houver mais de um controle, o marcador vale para o conjunto; na
> dúvida, escreva `Evidência: não`.
>
> **Colunas 17 e 18.** Veja o §3.9, item 2.
>
> Os números das colunas 7, 8, 11, 12 e 14 servem de conferência: o RADAR recalcula o risco inerente (Quadro 7,
> sem multiplicar P por I), o residual (inerente × fator do Quadro 6) e a classe (Quadro 8, sem arredondar) e
> **avisa** o analista quando o seu número difere do da skill. Valem os números do RADAR.

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
2. Colar os textos das seções 3.1 e 3.2 no `SKILL.md` da `cgov-gestao-riscos` (§3.9 e §4) e atualizar o modelo
   da tabela com as 18 colunas e as duas linhas de exemplo.
3. Rodar a verificação de sanitização exigida lá (nenhum dado pessoal ou real nos exemplos).
4. Registrar a decisão no diário de decisões daquele repositório e publicar o plugin pelo rito dele.
5. No RADAR, atualizar a data e a versão da skill lidas no [[FS-02-analise-ato-por-skills]] (cabeçalho e
   "Contrato com o Importar") e mover o cartão do Kanban.

Até a skill ser atualizada, o analista continua usando a tabela de 16 colunas, e o RADAR avisa, linha a linha,
o que a tabela não traz.
