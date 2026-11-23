# UC-13 — Importar riscos da tabela da skill

> Origem: FS-02 ([[FS-02-analise-ato-por-skills]]), atividades FS-02.15 a FS-02.18 e seção "Contrato com o Importar"; decisões P5 e P-B1-5 da CGOV · RF: RF-160, RF-161, RF-162, RF-163, RF-164, RF-165, RF-166, RF-167, RF-168, RF-193, RF-169, RF-170, RF-171, RF-172, RF-173 a RF-188, RF-194 · RN: RN-033, RN-104, RN-048, RN-099, RN-014, RN-015, RN-016, RN-017, RN-001, RN-002, RN-003, RN-004, RN-013, RN-018, RN-034 · Situação: implementado (importador atualizado em 2026-11-23)

## Título

Importar riscos da tabela da skill.

## Ator principal

Gestor de riscos / CGOV, como na tabela do plano. **Hoje só a CGOV importa** (RN-033; [[matriz-acesso-responsabilidades]] §7, decisão P5: "pode ser liberado para os gestores numa versão futura"). O gestor de riscos recebe o resultado como ficha preliminar e a assume ([[UC-12-elaborar-ficha-preliminar-de-risco]], passos 5 e 6).

## Pré-condições

- O analista da CGOV tem a tabela do Regime B produzida pela skill `cgov-gestao-riscos` (FS-02.14), de 18 colunas (formato novo, com Teste de Integridade e a evidência com marcador) ou de 16 (formato de hoje, aceito enquanto a skill não for atualizada; [[0020-tabela-da-skill-com-18-colunas|ADR-0020]]).
- Há objeto de gestão de unidade ativa para receber os riscos ([[UC-04-cadastrar-objeto-de-gestao]]).

## Pós-condições

- A prévia nunca grava nada.
- Os valores calculados gravados são os do RADAR, não os da skill (RN-013).
- A recusa de uma linha pelo banco não desfaz nem duplica as linhas que entraram.

## Fluxo principal de sucesso

1. A CGOV cola a tabela ou envia o arquivo `.md`, `.txt` ou `.markdown` (RN-033).
2. A CGOV pede a prévia.
3. O sistema lê a tabela pela posição das colunas, reconhece o formato de cada linha (16 ou 18 colunas) e separa a descrição em causa, evento, consequência e objetivo (RN-014).
4. O sistema confere a categoria de cada linha contra a lista do RADAR (RN-015, RN-016, RN-017).
5. O sistema recalcula cada ficha pelos Quadros 7, 6 e 8, com a trava de evidência, e frente à DAR do RADAR (RN-001 a RN-004, RN-013), sem gravar nada.
6. O sistema mostra a prévia, com o formato reconhecido, os erros e os avisos, e avisa que o código da skill será trocado pelo do RADAR (RN-099).
7. A CGOV escolhe o objeto de destino, entre objetos de unidades ativas (RN-034), e confirma.
8. O sistema grava cada linha em separado como risco preliminar da CGOV (RN-104, RN-048), com o código do RADAR (RN-099), e mostra quantas entraram.

## Fluxos alternativos e de exceção

Situação: implementado no código em 2026-11-23, sem migração (cartão "Importador antes da primeira carga real", [[0020-tabela-da-skill-com-18-colunas|ADR-0020]]). O RF-187 (importar só as linhas válidas) continua como proposta.

- 1a. Quem não é da CGOV tenta abrir a importação: o sistema o leva à visão geral inicial e avisa que a função é exclusiva da CGOV (RN-033).
- 3a. Linha com menos de 10 colunas: é ignorada, com o aviso "Linha N ignorada: tem X colunas; a matriz do Regime B tem 16 ou 18." (RF-186). Barra vertical dentro do texto de uma célula desloca as colunas seguintes.
- 3b. Descrição fora da sintaxe do item 4.2.1: o sistema avisa, sem bloquear (RN-014; RF-171), grava a frase como evento e deixa causa, consequência e objetivo em branco para a unidade completar (RF-182).
- 3c. Tabela do Regime A (13 colunas): erro que diz que a tabela parece ser do Regime A e que o RADAR só importa a do Regime B, de 16 ou 18 colunas (RF-188).
- 4a. **Lote recusado por categoria fora do Quadro 2.** Categoria que não é uma das 8 do Quadro 2 (ou um dos 3 sinônimos do Anexo III, sem diferença de maiúsculas) vira erro, e **qualquer erro bloqueia a importação inteira**. O analista corrige a tabela à mão e volta ao passo 1 (LAC-14, resolvida em 2026-11-22; RF-172, RF-173). A proposta de importar só as linhas válidas (RF-187) aguarda decisão da CGOV.
- 4b. Categoria mista que junta Operacional e Integridade: erro, que bloqueia o lote (RN-016).
- 4c. **Subcategoria fora do Quadro 3 ou ausente.** "Integridade:" com subcategoria fora das 6 do Quadro 3 vira erro com a lista das 6; "Integridade" sozinho vira erro que pede uma das 6 subcategorias do Quadro 3, sem listá-las; o sistema não grava subcategoria padrão (LAC-15, resolvida em 2026-11-22; RN-017; RF-174, RF-175).
- 5a. **Probabilidade e impacto.** Não são convertidos: o importador aceita o número ou o nome da escala (Quadros 4 e 5) e recusa a linha, com o motivo, se a célula estiver vazia, for 0, fora de 1 a 5, tiver mais de um número, tiver nome desconhecido ou o número divergir do nome (LAC-12, resolvida em 2026-11-22; RF-176, RF-177).
- 5b. **Evidência e trava.** A evidência vem do marcador `Evidência: sim|não` da col. 9; no formato de 18 colunas, sem o marcador vale sem evidência, com aviso; no de 16, sem o marcador, as expressões explícitas de ausência valem sem evidência e qualquer outro texto vale sem evidência, com aviso (RF-178). Quando a trava do Quadro 6 reduz Mediano, Satisfatório ou Forte a Fraco, a prévia avisa (RN-004; RF-179).
- 5c. **Cálculo.** O inerente ou o residual da skill que difere do recálculo do RADAR em mais de 0,01 gera aviso; valem os números do RADAR (RF-180).
- 5d. **Tratamento.** Estratégia vazia ou desconhecida grava "Mitigar" com aviso (RF-181); "Aceitar" em risco crítico é recusado desde a LAC-13 (a linha crítica com "Aceitar" vai para a lista de erros com o motivo, e a importação inteira é recusada, como em qualquer erro; `importadorSkillMarkdown.ts` e `travaRiscoCritico.ts`); desde a LAC-03 (2026-11-22) o KRI é criado só quando a linha traz um, e só com o nome, e a linha de risco crítico gera um aviso (sem bloquear) para completar o KRI na ficha antes do envio (RF-183, RF-184).
- 5e. **Teste de Integridade.** No formato de 18 colunas, a col. 17 deve ser "Sim" ou "Não" (erro se não for); com "Sim", categoria diferente de Integridade e justificativa (col. 18) com menos de 10 caracteres, é erro e bloqueia o lote (RN-006, RN-018; RF-185, RF-194). No formato de 16 colunas, o teste vale "não aplicável", com aviso por linha para o analista conferir na ficha.
- 7a. Sem objeto escolhido: o sistema não grava. A coluna "Objeto de GR" da tabela é ignorada: todas as linhas vão para o objeto escolhido.
- 8a. O banco recusa uma linha (por exemplo, por permissão): só ela fica de fora; o sistema mostra "N de M importados" e oferece importar de novo só as recusadas, sem duplicar as que entraram (RF-169, RF-170).

## Pós-condição de sucesso

- Os riscos da tabela estão gravados como preliminares da CGOV no objeto escolhido, com código do RADAR e valores recalculados, prontos para a unidade assumir ([[UC-12-elaborar-ficha-preliminar-de-risco]]).
