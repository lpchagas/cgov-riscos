# ADR-0020: Tabela da skill com 18 colunas, evidência com marcador e avisos no lugar dos silêncios do importador

## Status

Accepted

Data: 2026-11-23 (decisões do responsável pelo projeto, pela CGOV, na abertura do cartão "Importador antes da
primeira carga real").

Origem: [[2026-11-23-importador-primeira-carga-design]]; [[2026-11-23-importador-primeira-carga-plan]];
[[FS-02-analise-ato-por-skills]] ("Contrato com o Importar"); [[UC-13-importar-riscos-da-tabela-da-skill]];
[[analise-lacunas-codigo-requisitos]] (prioridade 1); [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]].

## Contexto

A primeira carga de dados reais do piloto da Sede entra pelo importador da tabela da skill
`cgov-gestao-riscos`. A conferência do "Contrato com o Importar" (2026-11-21) mostrou que o importador
**adivinhava** e **ficava calado** em pontos que mudam o cálculo e a classificação:

- deduzia a evidência do controle por palavras-chave e pela eficácia, o que podia deixar a trava de evidência
  (Quadro 6, RN-004) sem efeito;
- tratava o Teste de Integridade como "não aplicável" e não cobrava a justificativa (RN-006, RN-018), porque a
  skill entrega o teste numa linha solta do §3.9, item 2, que o importador não lê;
- gravava "Mitigar" quando a estratégia vinha vazia ou desconhecida;
- gravava textos genéricos como causa, consequência e objetivo;
- não avisava quando o seu recálculo diferia do que a skill entregou, quando a trava de evidência agiu, quando
  ignorava uma linha curta ou quando recebia a tabela do Regime A.

O importador lê **por posição**, e o formato de 16 colunas não tem lugar para o Teste de Integridade nem para
a evidência de forma fixa.

## Decisão

O responsável decidiu, em 2026-11-23:

1. **Novo formato de 18 colunas.** As 16 colunas de hoje, na mesma ordem, mais a col. 17 "Teste de Integridade"
   (`Sim` ou `Não`) e a col. 18 "Justificativa (Integridade)". A col. 9 passa a terminar com o marcador
   `Evidência: sim` ou `Evidência: não`. A leitura continua **por posição**, não pelo nome das colunas.
2. **O importador aceita os dois formatos**, decididos **por linha**: 18 ou mais colunas (as excedentes são
   ignoradas) e 17 (com a col. 18 vazia) valem como formato novo; de 10 a 12 e de 14 a 16 valem como o formato
   de hoje; 13 é erro do Regime A; menos de 10 é aviso de linha ignorada. A tabela mista é aceita.
3. **O que a tabela não entrega vira aviso ou erro, nunca valor inventado.** Evidência não lida vale
   "sem evidência" (a dedução pela eficácia acabou); estratégia desconhecida grava "Mitigar" **com aviso**;
   descrição fora da sintaxe do item 4.2.1 grava a frase como evento e deixa causa, consequência e objetivo em
   branco para a unidade completar; divergência de cálculo, trava de evidência acionada, linha ignorada e
   formato de 16 colunas (sem Teste de Integridade) geram aviso.
4. **A validação do Teste de Integridade é a de sempre** (`validarRegraIntegridade`), agora com os valores
   reais: com "Sim", categoria diferente de Integridade e justificativa de menos de 10 caracteres, é erro.
5. **Erros bloqueiam o lote, como hoje; avisos não bloqueiam.** Importar só as linhas válidas (RF-187) continua
   como proposta, à espera da CGOV.
6. **A mudança da skill é um pedido à parte**, em
   [[pedido-skill-18-colunas]], a ser aplicada no repositório `cgov-geral`, pelo rito daquele repositório.

Regras que valem a partir daqui:

- O cálculo (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`; gatilho do banco) **não muda**, e **não há migração**:
  o banco já aceita os campos gravados.
- Os valores gravados são sempre os do RADAR (RN-013); o número da skill só é comparado, para o aviso.
- A frase de "Crítico" continua só para o risco fora da DAR; o nível 18 a 25 é Extremo.

## Consequências

**Positivas**
- A trava de evidência do Quadro 6 passa a agir sobre uma leitura explícita, e a prévia mostra quando ela
  reduziu a eficácia.
- O Teste de Integridade e a justificativa entram na importação com a mesma regra do formulário.
- Cada mudança que o RADAR faz, ou dúvida que ele não consegue resolver, aparece como aviso na prévia.
- A tabela de 16 colunas que funciona hoje **continua aceita**, só com avisos novos.

**Negativas**
- Enquanto a skill não for atualizada no `cgov-geral`, toda tabela chega no formato de 16 colunas, e cada linha
  gera avisos (evidência não lida, Teste de Integridade ausente). O analista confere essas linhas na ficha.
- A leitura por posição continua frágil: uma barra vertical dentro do texto de uma célula desloca as colunas
  seguintes.
- Há dois formatos aceitos ao mesmo tempo, com mais casos de teste a manter.

**Neutras**
- O importador não lê ações de tratamento, responsável pelo risco nem o objeto de GR da tabela.
- O cartão "Aplicar o pedido de 18 colunas na skill `cgov-gestao-riscos`" fica no Backlog e depende do rito do
  repositório `cgov-geral`.

## Alternativas consideradas

- **Ler a tabela pelo cabeçalho.** Tolera colunas trocadas, mas os títulos da skill variam ("Crítico?",
  "Eficácia e fator") e a leitura falha quando o cabeçalho falta.
- **Um leitor por versão** (duas funções, 16 e 18 colunas). Fica mais legível, mas as regras de cada Quadro se
  repetem e podem divergir.
- **Manter a dedução da evidência pela eficácia.** Deixa a trava do Quadro 6 sem efeito justamente quando o
  texto é ambíguo; na dúvida, a trava deve agir.
- **Recusar a tabela de 16 colunas.** Quebraria o que funciona hoje antes de a skill ser atualizada.
