# UC-13 — Importar riscos da tabela da skill

> Origem: FS-02 ([[FS-02-analise-ato-por-skills]]), atividades FS-02.15 a FS-02.18 e seção "Contrato com o Importar"; decisões P5 e P-B1-5 da CGOV · RF: RF-160, RF-161, RF-162, RF-163, RF-164, RF-165, RF-166, RF-167, RF-168, RF-193, RF-169, RF-170, RF-171, RF-172, RF-173 a RF-188, RF-194 · RN: RN-033, RN-104, RN-048, RN-099, RN-014, RN-015, RN-016, RN-017, RN-001, RN-002, RN-003, RN-004, RN-013, RN-018, RN-034 · Situação: implementado

## Título

Importar riscos da tabela da skill.

## Ator principal

Gestor de riscos / CGOV, como na tabela do plano. **Hoje só a CGOV importa** (RN-033; [[matriz-acesso-responsabilidades]] §7, decisão P5: "pode ser liberado para os gestores numa versão futura"). O gestor de riscos recebe o resultado como ficha preliminar e a assume ([[UC-12-elaborar-ficha-preliminar-de-risco]], passos 5 e 6).

## Pré-condições

- O analista da CGOV tem a tabela de 16 colunas do Regime B produzida pela skill `cgov-gestao-riscos` (FS-02.14).
- Há objeto de gestão de unidade ativa para receber os riscos ([[UC-04-cadastrar-objeto-de-gestao]]).

## Pós-condições

- A prévia nunca grava nada.
- Os valores calculados gravados são os do RADAR, não os da skill (RN-013).
- A recusa de uma linha pelo banco não desfaz nem duplica as linhas que entraram.

## Fluxo principal de sucesso

1. A CGOV cola a tabela ou envia o arquivo `.md`, `.txt` ou `.markdown` (RN-033).
2. A CGOV pede a prévia.
3. O sistema lê a tabela pela posição das colunas e separa a descrição em causa, evento, consequência e objetivo (RN-014).
4. O sistema confere a categoria de cada linha contra a lista do RADAR (RN-015, RN-016, RN-017).
5. O sistema recalcula cada ficha pelos Quadros 7, 6 e 8, com a trava de evidência, e frente à DAR do RADAR (RN-001 a RN-004, RN-013), sem gravar nada.
6. O sistema mostra a prévia, com erros e avisos, e avisa que o código da skill será trocado pelo do RADAR (RN-099).
7. A CGOV escolhe o objeto de destino, entre objetos de unidades ativas (RN-034), e confirma.
8. O sistema grava cada linha em separado como risco preliminar da CGOV (RN-104, RN-048), com o código do RADAR (RN-099), e mostra quantas entraram.

## Fluxos alternativos e de exceção

Os itens marcados "hoje" descrevem o comportamento atual, que diverge do "Contrato com o Importar"; todos estão no cartão "Importador: recusas e conversões silenciosas" do Kanban.

- 1a. Quem não é da CGOV tenta abrir a importação: o sistema o leva à visão geral inicial e avisa que a função é exclusiva da CGOV (RN-033).
- 3a. Linha com menos de 10 colunas: hoje é ignorada sem aviso (RF-186). Barra vertical dentro do texto de uma célula desloca as colunas seguintes.
- 3b. Descrição fora da sintaxe do item 4.2.1: o sistema avisa, sem bloquear (RN-014); hoje grava textos genéricos como causa, consequência e objetivo (RF-182).
- 3c. Tabela do Regime A (13 colunas): as colunas ficam deslocadas e a linha é recusada por categoria inválida, com mensagem que não fala de regime (RF-188).
- 4a. **Lote recusado por categoria fora do Quadro 2.** Categoria que não é uma das 8 do Quadro 2 (ou um dos 3 sinônimos do Anexo III, sem diferença de maiúsculas) vira erro, e **qualquer erro bloqueia a importação inteira**. O analista corrige a tabela à mão e volta ao passo 1 (LAC-14, resolvida em 2026-11-22; RF-172, RF-173). A proposta de importar só as linhas válidas (RF-187) aguarda decisão da CGOV.
- 4b. Categoria mista que junta Operacional e Integridade: erro, que bloqueia o lote (RN-016).
- 4c. **Subcategoria fora do Quadro 3 ou ausente.** "Integridade:" com subcategoria fora das 6 do Quadro 3 vira erro com a lista das 6; "Integridade" sozinho vira erro que pede uma das 6 subcategorias do Quadro 3, sem listá-las; o sistema não grava subcategoria padrão (LAC-15, resolvida em 2026-11-22; RN-017; RF-174, RF-175).
- 5a. **Conversões silenciosas da análise.** Hoje, sem erro nem aviso: probabilidade ou impacto sem número, ilegível ou 0 vira 3, acima de 5 vira 5, negativo vira 1 (LAC-12; RF-176, RF-177); a evidência do controle é deduzida por palavras-chave (RF-178); a trava de evidência é aplicada sem aviso na prévia (RN-004; RF-179); o inerente e o residual da skill diferentes do recálculo passam sem aviso (RF-180).
- 5b. **Conversões silenciosas do tratamento.** Hoje: estratégia vazia ou desconhecida vira "Mitigar" (RF-181); "Aceitar" em risco crítico é aceito (LAC-13); todo risco ganha um KRI, com fórmula, fonte, meta e limite inventados, ou "Indicador a definir" quando a célula está vazia (LAC-03; RF-183, RF-184); o Teste de Integridade é tratado como não aplicável e a justificativa não é cobrada (RN-018; RF-185, RF-194).
- 7a. Sem objeto escolhido: o sistema não grava. A coluna "Objeto de GR" da tabela é ignorada: todas as linhas vão para o objeto escolhido.
- 8a. O banco recusa uma linha (por exemplo, por permissão): só ela fica de fora; o sistema mostra "N de M importados" e oferece importar de novo só as recusadas, sem duplicar as que entraram (RF-169, RF-170).

## Pós-condição de sucesso

- Os riscos da tabela estão gravados como preliminares da CGOV no objeto escolhido, com código do RADAR e valores recalculados, prontos para a unidade assumir ([[UC-12-elaborar-ficha-preliminar-de-risco]]).
