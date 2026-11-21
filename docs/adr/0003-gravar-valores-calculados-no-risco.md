# ADR-0003: Gravar os valores calculados no risco

## Status

Accepted

Data: 2026-11-09 (gatilho de cálculo, migração `20261109001`), completada em 2026-11-15 (trilha com antes e
depois, `20261115005`), 2026-11-16 (recálculo pela DAR, `20261116004`) e 2026-11-17 (fator lido na gravação
da ficha, `20261117001`); registrada em ADR em 2026-11-21. A migração de 2026-11-09 só diz que o banco
"calcula sozinho": a justificativa abaixo foi **reconstruída em 2026-11-21**, a partir das migrações seguintes.

Origem: `supabase/migrations/20261109001_schema_radar.sql` (gatilho `trigger_calcular_risco_radar`),
`20261116004_dar_reavalia_aprovados.sql` e `20261117001_leitura_acoes_e_gravacao_ficha.sql`; achado E2 do
diagnóstico [[2026-11-20-diagnostico-documentacao-radar]]; análise em [[normalizacao]] § 2.2.

## Contexto

O nível do risco sai de regras fixas da Metodologia (SEI `024421455`): o inerente é lido no Quadro 7
pelo par probabilidade e impacto; o residual é o inerente vezes o fator do Quadro 6; as classificações vêm
das faixas do Quadro 8, sem arredondar; e a criticidade depende do apetite da categoria na DAR. Pela
terceira forma normal (3FN), valores que dependem de outras colunas não deveriam ser gravados: bastaria
calculá-los na leitura.

Forças em jogo:

- Toda mudança do nível ou da criticidade de um risco precisa **deixar rastro**: qual era o valor, qual
  passou a ser, quando e por quê. As regras podem mudar (nova versão dos Quadros) e a DAR muda o apetite das
  categorias. O valor gravado **não fica congelado**: a cada gravação, e quando a DAR muda, o banco o
  recalcula; o que se ganha é que cada recálculo aparece na trilha.
- A trilha de auditoria (`auditoria_log`, com o antes e o depois desde `20261115005`) só registra a
  mudança de um valor que esteja gravado.
- Telas, filtros e as funções do fluxo (que decidem se o risco vai à homologação) consultam o residual e a
  criticidade com frequência.
- Quem preenche a ficha não pode escolher o resultado do cálculo (RN-013).

## Decisão

Nós vamos gravar `nivel_inerente`, `classificacao_inerente`, `nivel_residual`, `classificacao_residual`,
`status_critico`, `is_critico` e `descricao_padrao` na própria linha de `riscos`, calculados pelo gatilho do
banco, e o `fator_controle` (lido do Quadro 6 pela gravação da ficha, e não pelo gatilho, que só aplica a trava), para preservar o valor histórico auditável: cada valor e cada recálculo ficam
registrados na trilha.

- O gatilho `trigger_calcular_risco_radar` recalcula a cada gravação o texto padrão, o inerente, as
  classificações, a trava de evidência, o residual e a criticidade.
- A função de gravação da ficha lê o fator no Quadro 6 a partir da eficácia escolhida e ignora os valores
  calculados enviados pela tela.
- A mudança do apetite de uma categoria na DAR recalcula os riscos aprovados da categoria (RN-054).

## Consequências

**Positivas**
- O valor de cada momento fica gravado e cada mudança dele aparece na trilha de auditoria, com o antes e o
  depois (inclusive o recálculo feito pela mudança da DAR).
- Telas e filtros leem o resultado direto, sem refazer o cálculo.
- O cálculo fica num lugar só, no banco, e vale para a tela, a importação e a semente.

**Negativas**
- **Violação controlada da 3FN:** o mesmo fato existe duas vezes (a causa e o resultado). Se o gatilho
  falhar ou for contornado, os dois divergem.
- **Obrigação de recalcular** quando muda uma regra fora da linha: a mudança da DAR exigiu um gatilho
  próprio (`20261116004`); uma nova versão dos Quadros exigirá migração que recalcule todos os riscos.
- O gatilho não deriva o fator a partir da eficácia e a trava confere o fator, não a eficácia; quem grava
  `riscos` sem a função de gravação da ficha pode deixar o par incoerente, inclusive "Forte" sem evidência.
  É dívida registrada no Kanban ([[normalizacao]] § 2.2).
- `is_critico` repete `status_critico` ([[normalizacao]] § 2.3, dívida).

**Neutras**
- A tabela de 25 células do Quadro 7 existe no banco e em TypeScript (`calculadoraRiscoRadar.ts`); a do
  banco é a que grava.

## Alternativas consideradas

- **Calcular só na leitura (visão ou função):** atende à 3FN, mas o nível e a criticidade mudariam quando a
  regra ou a DAR mudasse sem que a trilha registrasse o antes e o depois, e sem reabrir o risco aprovado.
- **Colunas geradas (`GENERATED ALWAYS AS`):** não servem para a criticidade, que depende de outra tabela
  (o apetite da categoria), nem para a trava, que muda dois valores juntos.
- **Calcular no navegador e gravar:** quem preenche escolheria o resultado; contraria a RN-013.
