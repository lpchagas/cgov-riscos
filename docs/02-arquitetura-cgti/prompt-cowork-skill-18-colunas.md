# Prompt para o Cowork: aplicar as 18 colunas na skill `cgov-gestao-riscos`

> Para colar no projeto **"Escritório CGOV — Implantação"** do Claude Cowork (repositório `cgov-geral`).
> Origem: [[pedido-skill-18-colunas]] e [[0020-tabela-da-skill-com-18-colunas|ADR-0020]]. Copie a partir da linha "Use a skill".

---

Use a skill **skill-creator** para **atualizar a skill existente** `cgov-gestao-riscos` do plugin `cgov-escritorio`, sem criar outra.

## 1. Contexto

O RADAR, o sistema web de gestão de riscos da CGOV, mudou o importador da matriz de riscos que esta skill entrega. Ele agora lê uma tabela do **Regime B** com **18 colunas**, e continua aceitando a de 16. As duas colunas novas carregam o **Teste de Integridade**, que hoje vai numa linha solta. Além disso, a coluna 9 passa a ter um **marcador fixo de evidência**, que decide a trava do Quadro 6. Sem esse marcador, o RADAR trata o controle como **sem evidência** (eficácia máxima Fraco), e o residual sobe.

O objetivo é que a skill entregue a tabela nesse formato em **qualquer** uso, com ou sem Nota Técnica, sem mudar nada do Regime A.

## 2. Antes de editar

1. Leia `AGENTS.md`, `CLAUDE.md` e `docs/INDICE.md` deste repositório e siga as regras deles. O `plano-implantacao.md` é grande: leia só a parte indicada pelo `docs/plano-indice.md`.
2. Edite a **fonte**, `plugins/cgov-escritorio/skills/cgov-gestao-riscos/SKILL.md`, e não a cópia instalada. Antes de editar, tire uma cópia da skill para servir de base de comparação nos testes (o `old_skill` da skill-creator).
3. Confira se o texto vigente abaixo bate com a fonte. A cópia instalada pode estar atrasada em relação à fonte. Se algum trecho divergir, aplique a **intenção** do pedido sobre o texto da fonte e me mostre a diferença antes de seguir.

## 3. O formato pedido (só o Regime B)

A ordem das colunas 1 a 16 **não muda**. Entram duas colunas no fim e um marcador na coluna 9. O RADAR lê as colunas **por posição**.

| Col. | Conteúdo | Regra |
| --- | --- | --- |
| 1 a 16 | ID, Objeto de GR, Descrição na sintaxe, Categoria, P, I, Inerente, Classe, Controles e evidências, Eficácia e fator, Residual, Classe residual, Apetite da categoria, Crítico?, Estratégia, KRI | sem mudança de ordem |
| 9 | Controles e evidências | **termina sempre** com `Evidência: sim` ou `Evidência: não`. Na dúvida, `não`. Qualquer "não" vale sem evidência |
| 17 | Teste de Integridade | `Sim` ou `Não`: "Sim" quando há decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação. Outro valor bloqueia a importação |
| 18 | Justificativa (Integridade) | obrigatória, com pelo menos 10 caracteres, quando a col. 17 é `Sim` e a categoria **não** é Integridade; vazia nos demais casos |

Sem barra vertical (`|`) dentro de uma célula, porque ela desloca as colunas seguintes. A tabela do **Regime A** (13 colunas) e a regra do Regime A para controles ficam **sem nenhuma alteração**.

## 4. Trechos a alterar no `SKILL.md`

O §3.9 só vale quando a skill roda como subsídio de Nota Técnica. A matriz do §4 vale em qualquer uso. Por isso, a regra das colunas novas entra nos dois lugares.

### 4.1 §3.9, item 2: substituir

Vigente:

> 2. **Teste de Integridade:** registre uma linha por risco (sim/não e subcategoria)
>    sempre que houver decisão sobre beneficiário, autorização, sanção ou atestação.
>    Não use a categoria "Operacional com interface de Integridade".

Proposto:

> 2. **Teste de Integridade:** para cada risco, aplique o teste sempre que houver decisão sobre beneficiário,
>    licença ou autorização, fiscalização ou sanção, ou contratação ou atestação (Portaria ICMBio nº 253/2026;
>    Quadro 3). No **Regime B**, o resultado vai nas **colunas 17 e 18 da matriz** (§4, item 1), e não numa linha
>    solta: `Sim` ou `Não` na coluna 17 e, quando for `Sim` e a categoria não for Integridade, a justificativa na
>    coluna 18 (veja o §4). No Regime A, mantenha o registro de uma linha por risco (sim/não e subcategoria).
>    Não use a categoria "Operacional com interface de Integridade".

### 4.2 §3.9, item 3: acrescentar ao fim, sem mudar o resto

> No Regime B, termine a célula "Controles e evidências" da matriz com o marcador `Evidência: sim` ou
> `Evidência: não` (veja o §4, item 1).

### 4.3 §4, item 1: substituir só o bullet do Regime B e acrescentar o parágrafo das regras

Vigente:

> - **Regime B:** ID · Objeto de GR · Descrição na sintaxe · Categoria
>   (subcategoria, se Integridade) · P · I · Inerente (célula do Quadro 7) ·
>   Classe · Controles e evidências · Eficácia e fator · Residual · Classe
>   residual · Apetite da categoria · **Crítico?** (sim / não / pendente de DAR) ·
>   Estratégia · KRI.

Proposto:

> - **Regime B (18 colunas):** ID · Objeto de GR · Descrição na sintaxe · Categoria
>   (subcategoria, se Integridade) · P · I · Inerente (célula do Quadro 7) ·
>   Classe · Controles e evidências · Eficácia e fator · Residual · Classe
>   residual · Apetite da categoria · **Crítico?** (sim / não / pendente de DAR) ·
>   Estratégia · KRI · **Teste de Integridade** (`Sim` ou `Não`) · **Justificativa
>   (Integridade)**.
>
>   Regras das colunas novas do Regime B (valem em qualquer uso da skill, com ou sem Nota Técnica):
>   - **Controles e evidências (col. 9):** termine **sempre** com `Evidência: sim` (há evidência comprovada de que
>     o controle funciona) ou `Evidência: não` (previsto, sem comprovação de funcionamento). O marcador decide a
>     trava do Quadro 6: controle sem evidência comprovada não recebe eficácia acima de **Fraco (0,9)**. Na dúvida,
>     escreva `Evidência: não`.
>   - **Teste de Integridade (col. 17):** `Sim` quando o risco envolve decisão sobre beneficiário, licença ou
>     autorização, fiscalização ou sanção, ou contratação ou atestação; `Não` nos demais. Só `Sim` ou `Não`.
>   - **Justificativa (Integridade) (col. 18):** obrigatória, com pelo menos 10 caracteres, quando a coluna 17 é
>     `Sim` e a categoria **não** é Integridade (explique por que o risco envolve esse tipo de decisão); vazia nos
>     demais casos.
>   - Uma barra vertical (`|`) dentro do texto de uma célula desloca as colunas seguintes: não use.
>   - Os números das colunas 7, 8, 11, 12 e 14 servem de conferência: o RADAR recalcula o inerente (Quadro 7, sem
>     multiplicar P por I), o residual (inerente × fator do Quadro 6) e a classe (Quadro 8, sem arredondar) e avisa
>     o analista quando difere; valem os números do RADAR.

Se a skill tiver um modelo ou exemplo de tabela do Regime B (no corpo ou em `references/`), atualize-o para 18 colunas com estas duas linhas fictícias:

```markdown
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI | Teste de Integridade | Justificativa (Integridade) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-01 | Concessão de autorização (demonstração) | Devido a ausência de checklist documental, poderá ocorrer a emissão de autorização indevida, ocasionando dano ambiental em unidade de conservação e impactando o alcance do objetivo de conservação da biodiversidade. | Operacional | 5 | 5 | 25 | Extremo | Conferência manual sem registro formal. Evidência: não | Fraco (0,9) | 22,5 | Extremo | pendente de DAR | pendente de DAR | Mitigar | % de processos revisados no trimestre | Sim | A autorização beneficia um requerente específico e depende da decisão do analista. |
| RSC-02 | Seleção de cargos de confiança (demonstração) | Devido a ausência de critério objetivo na escolha de pessoal, poderá ocorrer a nomeação de parente em cargo de confiança, ocasionando favorecimento indevido e impactando o alcance do objetivo de integridade institucional. | Integridade: Nepotismo | 3 | 4 | 18 | Extremo | Norma interna de seleção, com registro das nomeações conferido. Evidência: sim | Mediano (0,75) | 13,5 | Alto | pendente de DAR | pendente de DAR | Mitigar | % de nomeações com critério registrado | Sim | |
```

Não mude o `name` nem a `description` da skill. Se precisar mexer na `description`, respeite o limite de 1.024 caracteres e me mostre antes.

## 5. Testes com a skill-creator

- O arquivo `evals/evals.json` que já existe é do responsável: **não edite**. Rode os casos dele junto com os novos.
- Crie 3 casos novos, em pastas de caso no formato da skill-creator:
  1. **NT de ato de autorização** (Regime B, subsídio de Nota Técnica, ato fictício). Esperado:
     - matriz de 18 colunas;
     - toda célula da col. 9 termina com o marcador de evidência;
     - col. 17 com `Sim` onde há decisão de autorização;
     - col. 18 com 10 caracteres ou mais nas linhas fora de Integridade com `Sim`;
     - nenhuma linha solta de Teste de Integridade.
  2. **Mapeamento de riscos fora de NT**, com um risco de Integridade (subcategoria do Quadro 3). Esperado: 18 colunas; col. 18 vazia na linha de Integridade; regras das colunas novas aplicadas mesmo sem NT.
  3. **Pedido em Regime A** (Portaria 975/2021). Esperado: tabela do Regime A com 13 colunas, igual à de hoje, sem as colunas 17 e 18.
- Base de comparação: a cópia da versão antiga (`old_skill`).
- No Cowork, gere o visualizador com `eval-viewer/generate_review.py --static` e me mande o link **antes** de você mesmo avaliar e corrigir.
- Saídas de teste vão para `local/pilots/`, nunca para as áreas operacionais.
- Prompts e saídas só com **dados fictícios**: nenhum nome de pessoa, nenhum número SEI real e nenhum processo real.

## 6. Antes do commit (gate do repositório)

1. `py scripts\verificar_sanitizacao.py --staged` com resultado APROVADO.
2. `py scripts\gerar_indices_docs.py` e `py scripts\verificar_docs.py` com 0 erros.
3. Registre a decisão no diário de decisões (`docs/governance/decision-log.md`) e nos lugares que o `AGENTS.md` pede: plano, catálogo, pendências e `CHANGELOG.md` do plugin. Suba a versão do plugin em `plugin.json`, se o rito pedir.
4. Commit e push na `main` só depois do gate, como manda o `AGENTS.md`.
5. **Não publique.** `publicar_operacao.py --publicar --executar` depende da minha decisão: me pergunte antes.

## 7. O que me devolver

- O diff do `SKILL.md`, com os três trechos aplicados.
- O resultado dos testes: link do visualizador e taxa de acerto da versão nova contra a antiga.
- A nova versão do plugin e o hash do commit.
- Uma linha para eu levar ao RADAR: "skill `cgov-gestao-riscos` vX.Y.Z, lida em AAAA-MM-DD, com a matriz do Regime B em 18 colunas". Ela atualiza o FS-02 ("Contrato com o Importar") e move o cartão do Kanban.
