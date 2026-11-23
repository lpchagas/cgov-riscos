# Importador antes da primeira carga real (desenho)

> **Data:** 2026-11-23 · **Branch:** `claude/icmbio-risk-policy-modeling-q840ho`
> **Cartão:** "Importador antes da primeira carga real" (prioridade 1 da [[analise-lacunas-codigo-requisitos]], ADR-0017)
> **Requisitos:** RF-162, RF-171, RF-178, RF-179, RF-180, RF-181, RF-182, RF-185, RF-186, RF-188, RF-194 · RN-004, RN-006, RN-014, RN-018, RN-020 · **Casos de uso:** UC-13 · **Fluxo:** FS-02 ("Contrato com o Importar")
> **Fora daqui:** RF-187 (importar só as linhas válidas: proposta que aguarda a CGOV, nota 4 dos RF).

## 1. Por que

A primeira carga de dados reais do piloto vai entrar pelo importador da tabela da skill `cgov-gestao-riscos`. Hoje o importador **adivinha** e **fica calado** em pontos que mudam o cálculo e a classificação:

- deduz a evidência do controle por palavras-chave e pela eficácia, o que pode deixar a trava de evidência (RN-004) sem efeito;
- trata o Teste de Integridade como "não aplicável" e não cobra a justificativa (RN-006, RN-018);
- grava "Mitigar" quando a estratégia vem vazia ou desconhecida;
- grava textos genéricos como causa, consequência e objetivo;
- não avisa quando o seu recálculo difere do que a skill entregou, quando a trava de evidência agiu, quando ignora uma linha curta ou quando recebe a tabela do Regime A.

Antes da carga real, as mesmas regras do formulário precisam valer na importação, e o analista precisa ver na prévia tudo o que o RADAR mudou ou não conseguiu ler.

## 2. Objetivos, não objetivos e o que seria fracasso

**Objetivos**
- **Novo formato da tabela, com 18 colunas** (decisão do responsável, 2026-11-23): as 16 colunas de hoje, mais a col. 17 "Teste de Integridade" (Sim/Não) e a col. 18 "Justificativa (Integridade)". A col. 9 passa a trazer a evidência de forma fixa: `Evidência: sim` ou `Evidência: não`.
- O importador **continua aceitando a tabela de 16 colunas** enquanto a skill nova não for publicada. Nesse caso, o que ela não entrega vira aviso, não um valor inventado.
- Leitura **por posição**, como hoje (decisão do responsável, 2026-11-23).
- Cada mudança ou dúvida aparece na prévia como **aviso** (não bloqueia) ou **erro** (bloqueia o lote, como hoje).
- Um **pedido de mudança da skill**, com o formato exato das 18 colunas, para ser aplicado no repositório `cgov-geral` numa sessão própria, pelo rito daquele repositório.

**Não objetivos**
- Importar só as linhas válidas (RF-187).
- Ler as ações de tratamento (5W2H, bow tie), o responsável pelo risco ou o objeto de GR da tabela.
- Mudar o cálculo (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`) ou o banco: **nenhuma migração**.
- Ler a tabela pelo nome das colunas.

**Fracasso** (mesmo que "funcione")
- Um controle importado sem evidência lida fica com eficácia acima de Fraco.
- Um risco com Teste de Integridade aplicável, fora da categoria Integridade e sem justificativa de pelo menos 10 caracteres, entra no RADAR.
- O RADAR grava, sem avisar, um valor que a skill não entregou (estratégia, causa, consequência, objetivo, evidência).
- A tabela de 16 colunas que funciona hoje passa a ser recusada.

## 3. Abordagens consideradas

1. **Estender a leitura por posição (escolhida pelo responsável).** O importador reconhece a versão pela quantidade de colunas da linha: 18, 16 (de 10 a 16, como hoje), 13 (Regime A) e menos de 10. É a menor mudança e preserva os testes de hoje. O formato de 18 colunas contém o de 16.
2. **Ler pelo cabeçalho.** Acha cada coluna pelo título. Tolera colunas trocadas, mas os títulos da skill variam ("Crítico?", "Eficácia e fator"), e a leitura falha quando o cabeçalho falta.
3. **Um leitor por versão.** Duas funções, para 16 e 18 colunas, com as validações em comum. Fica mais legível, mas as regras de cada Quadro se repetem.

## 4. O desenho

### 4.1 O formato de 18 colunas (pedido à skill)

| Col. | Conteúdo | Observação |
| --- | --- | --- |
| 1 a 16 | as mesmas de hoje (FS-02, "Contrato com o Importar") | sem mudança de ordem |
| 9 | Controles e evidências | **deve terminar com** `Evidência: sim` ou `Evidência: não` (sem diferença de acento e de maiúsculas) |
| 17 | Teste de Integridade | `Sim` ou `Não`: "Sim" quando o risco envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação (RN-006) |
| 18 | Justificativa (Integridade) | obrigatória, com pelo menos 10 caracteres, quando a col. 17 é "Sim" e a categoria não é Integridade (RN-018); vazia nos demais casos |

O pedido vai em `docs/02-arquitetura-cgti/pedido-skill-18-colunas.md`, com o texto pronto para o §3.9 e o §4 da `cgov-gestao-riscos` e exemplos das duas linhas. A decisão do contrato vai num ADR novo (**ADR-0020**, "Tabela da skill com 18 colunas"), porque muda a interface entre a skill e o RADAR.

### 4.2 Como cada linha é lida

A versão é decidida **por linha**, pela quantidade de colunas:

| Colunas | Tratamento |
| --- | --- |
| 18 (ou mais: as excedentes são ignoradas, como hoje) | formato novo |
| 17 | formato novo, com a col. 18 vazia *(decisão do construtor)* |
| 14 a 16, e 10 a 12 | formato de hoje (as que faltam recebem o tratamento de hoje, com os avisos do 4.3) |
| 13 | **erro**: "Linha N: a tabela parece ser do Regime A (13 colunas, sem 'Objeto de GR'). O RADAR só importa a matriz do Regime B (16 ou 18 colunas)." (RF-188) |
| menos de 10 | **aviso**: "Linha N ignorada: tem X colunas; a matriz do Regime B tem 16 ou 18." (RF-186). A linha separadora e a linha vazia não contam |

`N` é o número da linha no texto colado (1 = primeira linha).

### 4.3 Regras por coluna (valem nos dois formatos, salvo indicação)

- **Col. 3, descrição (RF-182, RF-171).** Se a frase seguir a sintaxe do 4.2.1, tudo fica como hoje. Se não seguir, a frase inteira vira o **evento**, e causa, consequência e objetivo vão **vazios** (`''`), para a unidade completar antes do envio (RF-030). O aviso de hoje passa a dizer isso: "Linha R-07: a descrição não segue a sintaxe do item 4.2.1; a frase foi gravada como evento, e causa, consequência e objetivo ficam em branco para a unidade completar."
- **Col. 9, evidência (RF-178).**
  - Formato novo: lê o marcador `Evidência: sim|não`. Sem marcador, vale **sem evidência**, com o aviso "Linha R-07: não foi possível ler se o controle tem evidência comprovada; o RADAR considerou **sem evidência** (eficácia máxima Fraco, Quadro 6)."
  - Formato de hoje: o marcador também é lido, se existir. Sem ele, as expressões explícitas de ausência ("sem evidência", "sem registro", "não comprovado", "inexistente", "informal"; sem diferença de acento) valem como sem evidência, sem aviso. Qualquer outro texto vale **sem evidência**, com o mesmo aviso. Acaba a dedução pela eficácia: *decisão do construtor*, porque na dúvida a trava de evidência deve agir.
- **Col. 10, eficácia e trava (RF-179).** Quando a trava de evidência reduz a eficácia lida, aparece o aviso: "Linha R-07: a eficácia 'Mediano (0,75)' foi reduzida a 'Fraco (0,9)' porque o controle não tem evidência comprovada (trava do Quadro 6)."
- **Cols. 7 e 11, conferência do cálculo (RF-180).** O inerente (inteiro) e o residual (decimal, com vírgula ou ponto) da skill são comparados com o recálculo do RADAR. Diferença acima de 0,01 gera o aviso: "Linha R-07: a skill informou inerente 12 e residual 9,0; o RADAR calculou inerente 14 e residual 10,5 (Quadro 7 e Quadro 6). Valem os números do RADAR." A célula que não é número não é comparada nem gera aviso.
- **Col. 15, estratégia (RF-181).** Se vier vazia ou fora de Mitigar, Compartilhar, Evitar e Aceitar, grava **Mitigar** e mostra o aviso: "Linha R-07: estratégia 'Reduzir' não reconhecida; o RADAR gravou 'Mitigar'. Confira na ficha." A trava da LAC-13 continua valendo antes disso: "Aceitar" em risco crítico é erro.
- **Cols. 17 e 18, Teste de Integridade (RF-185, RF-194).** Só no formato novo.
  - Col. 17 "Sim" ou "Não" (aceita também "S" e "N", sem diferença de acento e de maiúsculas). Qualquer outro valor, inclusive vazio, é **erro**: "Linha R-07: o Teste de Integridade (col. 17) deve ser 'Sim' ou 'Não'."
  - O valor vai para `testeIntegridadeAplicavel`, e a col. 18 vai para `justificativaNaoIntegridade`. A validação é a de sempre, `validarRegraIntegridade`, agora com os valores reais: com "Sim", categoria diferente de Integridade e justificativa com menos de 10 caracteres, é **erro**, com a mensagem da regra 3.
  - No formato de hoje, vale "não aplicável", como hoje, com o aviso por linha: "Linha R-07: a tabela não traz o Teste de Integridade (formato de 16 colunas); confira na ficha se o risco envolve decisão sobre beneficiário, licença, fiscalização ou contratação (RN-006)." *(Decisão do construtor:* um aviso por linha, para ele aparecer junto da linha na prévia; se isso poluir, a prévia pode agrupar.)*

### 4.4 Prévia (`ImportadorSkillView.vue`)

- A prévia mostra o formato reconhecido: "Formato: 18 colunas (com Teste de Integridade)" ou "Formato: 16 colunas (sem Teste de Integridade; veja os avisos)".
- Os avisos continuam na lista que já existe, agora com mais tipos. O resumo diz quantos avisos e erros há.
- O texto de ajuda da tela (o que colar, quantas colunas) passa a citar as 18 colunas e a aceitação das 16.
- A tela não muda de estrutura (só componentes que já existem): **não precisa de Figma antes**. O cartão de Figma da tela Importar recebe uma nota, se existir.

### 4.5 Gravação (`conversores.ts`, `fichaDaSkillParaSalvar`)

- Leva `testeIntegridadeAplicavel` e `justificativaNaoIntegridade` lidos.
- Leva causa, consequência e objetivo vazios quando a frase não seguiu a sintaxe.
- Leva a evidência lida (ou "sem evidência") no controle e em `possuiEvidenciaControle`.
- O banco já aceita tudo isso: `teste_integridade_aplicavel`, `justificativa_nao_integridade`, e texto vazio nas colunas `NOT NULL`. Nenhuma migração.

### 4.6 Testes

- `importadorSkillMarkdown.spec.ts`: um caso por regra do 4.2 e do 4.3, nos dois formatos, com o texto exato de cada aviso e erro. A tabela de 16 colunas que passa hoje continua passando (com os avisos novos).
- `conversores.spec.ts`: a gravação dos campos novos e dos textos vazios.
- `importarPagina.spec.ts`: o envio de arquivo `.md`, `.txt` e `.markdown` (RF-162); a linha do formato na prévia; os avisos aparecem.
- A fixture de 18 colunas vira um arquivo em `tests/unit/fixtures/`, só com dados de demonstração.

### 4.7 Documentação

- FS-02, "Contrato com o Importar": as colunas 17 e 18, a col. 9 com marcador e os "silêncios" que viraram avisos.
- UC-13 (5b e as exceções novas), RF-162, RF-171, RF-178 a RF-182, RF-185, RF-186, RF-188 e RF-194.
- ADR-0020 e o pedido da skill.
- Kanban: o cartão do importador vai para "Homologação CGOV", e entra um cartão novo, "Aplicar o pedido de 18 colunas na skill `cgov-gestao-riscos` (repositório cgov-geral)", que fica fora deste repositório.
- [[ESTADO-ATUAL]].

## 5. O que fica para o construtor

- O texto exato dos avisos, dentro do sentido do 4.3. O aviso sempre diz a linha, o que foi lido e o que o RADAR fez.
- Como guardar o formato reconhecido no resultado de `importarTabelaMarkdownSkill`, por exemplo um campo `formato: 16 | 18`. A tabela mista (linhas de 16 e de 18) é aceita, e a prévia mostra "misto".
- A tolerância numérica do RF-180, desde que 0,01 ou menor.
