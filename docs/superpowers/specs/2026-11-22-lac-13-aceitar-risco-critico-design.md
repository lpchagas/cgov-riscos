# LAC-13 — "Aceitar" proibido e ação obrigatória no risco crítico (desenho)

> **Data:** 2026-11-22 · **Branch:** `claude/icmbio-risk-policy-modeling-q840ho`
> **Lacuna:** LAC-13 em [[lacunas-norma-sistema]] (bloqueia homologação, ADR-0017)
> **Requisitos:** RN-019, RN-020, RF-049, RF-050 · **Casos de uso:** UC-07 (3a), UC-13 (5b)
> **Fonte:** Metodologia 4.5 ("somente devem ser objeto de tratamento os riscos residuais que estão acima do limite de exposição") e 4.5.1 (Tabela 8 da minuta); Anexo III (diretrizes para tratamento); Política art. 8º, § 2º

## 1. Por que

Pela Metodologia e pelo Anexo III, o risco residual fora do apetite da DAR (risco crítico) **deve ser tratado**. Ele não pode ser aceito sem tratamento. Hoje o RADAR aceita "Aceitar" em risco crítico em três pontos: no formulário (que então dispensa a ação 5W2H, `src/utils/formularioRisco.ts:144-150`), no banco (`riscos.estrategia_principal` e `respostas_tratamento.estrategia` aceitam os 4 valores sem condição) e no importador da tabela da skill (`normalizarEstrategia`, `src/utils/importadorSkillMarkdown.ts:219-225`). Com isso, o Plano de Gestão de Riscos pode ter um risco crítico sem tratamento, e a homologação fica bloqueada (ADR-0017).

## 2. Objetivos, não objetivos e o que seria fracasso

**Objetivos**
- **RF-049:** o RADAR recusa "Aceitar" como estratégia de risco crítico.
- **RF-050:** o RADAR exige pelo menos uma ação de tratamento (5W2H) em risco crítico.
- "Risco crítico", **para esta trava**, é o risco com `status_critico = 'sim'` **ou** `'pendente_dar'` (decisão do responsável: a categoria ainda sem apetite na DAR é tratada como crítica, coerente com a homologação, que já a sobe para a Diretoria).
- A trava vale no formulário, no importador e no banco. No banco, ela vale nas passagens do fluxo, e não na gravação do rascunho.
- O risco **aprovado** que passa a ser crítico porque a DAR mudou, e que não passa na trava, **volta para a unidade** (`devolvido`), com o motivo no histórico (decisão do responsável). O risco que passa na trava continua como hoje: volta para a homologação da Diretoria.

**Não objetivos**
- Não muda o cálculo (Quadros 6, 7 e 8), `calculadoraRiscoRadar.ts`, o gatilho `trigger_calcular_risco_radar` nem a RLS.
- Não cria regra para a aceitação excepcional nem para a alçada de "Evitar" (F2-05, LS-03, ainda sem norma).
- Não exige KRI. Isso é a LAC-03, que tem cartão próprio.
- Não muda o risco que não é crítico: "Aceitar" continua valendo, sem ação, como hoje.

**Fracasso, mesmo que funcione**
- Um risco crítico chegar a `aprovado` com "Aceitar" ou sem ação, por qualquer caminho (formulário, importador, chamada direta ao banco, mudança da DAR).
- A mudança da DAR falhar, ou ficar pela metade, por causa da trava. Ela precisa terminar e devolver os riscos afetados.
- O rascunho deixar de ser salvo por causa da trava. O gestor precisa poder salvar e corrigir depois.
- O gestor receber a recusa sem entender o motivo nem o que fazer.
- Chamar a faixa 18 a 25 de "Crítico", ou chamar o Plano de Gestão de Riscos de "PGR".

## 3. Abordagens consideradas

| Abordagem | Troca | Escolha |
| --- | --- | --- |
| **Trava em camadas:** formulário + importador + banco nas passagens do fluxo + reavaliação da DAR que devolve | uma migração (troca de funções, sem tabela nova); cobre todos os caminhos | **escolhida pelo responsável** |
| Proibição direta na tabela (CHECK ou gatilho na linha de `riscos`) | a mais curta; quebra a reavaliação da DAR (o recálculo de um aprovado com "Aceitar" falharia no meio) e impede salvar rascunho | descartada |
| Só formulário e importador | sem migração; o banco aceitaria por fora, e o caso da DAR alterada ficaria aberto | descartada |

## 4. O desenho

### 4.1 A regra, num lugar só de cada lado

- **Front:** uma função pura em `src/utils/` diz se a ficha passa na trava, a partir de `statusCritico`, da estratégia principal e das ações. Ela devolve `{ ok: true }` ou `{ ok: false; motivo }`. O formulário, o importador e a fonte de demonstração (`fonteDemonstracao.ts`) usam essa função.
- **Banco:** uma função auxiliar interna (sem `GRANT` a `authenticated`) diz o mesmo para um risco gravado. A ficha passa na trava quando o risco não é crítico, ou quando é crítico, tem `estrategia_principal <> 'Aceitar'` e tem pelo menos uma linha em `respostas_tratamento` com `estrategia <> 'Aceitar'`.
- A criticidade usada é sempre a **atual**, recalculada no momento, porque a DAR pode ter mudado. O envio já faz isso (`enviar_para_validacao`, migração `20261116001`, linha ~192).

### 4.2 Formulário (etapa 4, `FormularioRiscoView.vue`)

- A prévia da etapa 3 já calcula `calculo.statusCritico`. Quando ele é `'sim'` ou `'pendente_dar'`:
  - a opção "Aceitar" fica **desabilitada** na lista, com o rótulo "Aceitar — indisponível: risco crítico precisa de tratamento";
  - um texto de ajuda, ligado à lista por `aria-describedby`, explica: "Este risco está fora do apetite da DAR (ou a categoria ainda não tem apetite declarado). Pela Metodologia (4.5 e Anexo III), ele precisa de tratamento: escolha Mitigar, Compartilhar ou Evitar e descreva a ação." Quando for `'pendente_dar'`, o texto diz isso;
  - a ação 5W2H passa a ser obrigatória, mesmo que o valor guardado seja "Aceitar".
- Se a ficha **já estiver** com "Aceitar" (risco antigo aberto para edição, ou P, I ou controle mudados na etapa 3), a validação da etapa 4 mostra um erro no campo da estratégia e não deixa avançar. A ficha não é trocada para "Mitigar" sem aviso.
- `validarEtapa` (em `formularioRisco.ts`) passa a receber a criticidade calculada. A regra da ação continua a mesma para o risco que não é crítico.
- **Salvar rascunho continua livre.** Hoje o rascunho só exige a etapa 1 (`salvar`, `FormularioRiscoView.vue:331-342`), e isso não muda. A trava da etapa 4 vale ao avançar, ao "Salvar e enviar" e ao editar uma ficha que já passou do rascunho (que hoje já exige todas as etapas).
- **Edição de ficha que já passou do rascunho** (ex.: aprovada): o banco a reabre pelo caminho de hoje (`fn_trava_reabertura_risco`, migração `20261116001`). A trava do banco não pode impedir essa reabertura. Ela só age quando a ficha for de novo validada ou homologada, e é o formulário que impede gravar "Aceitar" ali.

### 4.3 Importador (`importadorSkillMarkdown.ts`)

- A linha com estratégia "Aceitar" e `statusCritico` `'sim'` ou `'pendente_dar'`, calculado pelo motor oficial, é **recusada**, com o motivo em `erros`. As demais linhas continuam sendo importadas, como na LAC-12. Exemplo de motivo: `Linha R-07: risco crítico (residual 12, Alto, fora do apetite da DAR) não pode ter a estratégia "Aceitar"; escolha Mitigar, Compartilhar ou Evitar na tabela da skill.`
- A criticidade é a que o importador já calcula (o apetite lido da tabela, ou o apetite padrão). A linha recusada aparece na lista de erros e não entra na contagem de fichas importadas, como as linhas recusadas da LAC-12.
- O que vira "Mitigar" sem aviso (célula vazia ou nome desconhecido, RF-181) **não** muda aqui. É outro item do cartão do importador.
- As fichas importadas entram como `preliminar_cgov`. A exigência da ação 5W2H vale no envio (4.4), quando a unidade completar a ficha.

### 4.4 Banco (uma migração nova, `2026112200N_lac13_trava_aceitar_critico.sql`)

A trava entra nas três passagens que levam o risco em direção à aprovação. Cada uma levanta exceção com a mensagem `RADAR: ...` e `ERRCODE = 'check_violation'`, que o front já mostra ao usuário:

1. **`enviar_para_validacao`:** depois do recálculo da criticidade, recusa o envio com a mensagem "o risco X é crítico (fora do apetite da DAR ou com DAR pendente) e não pode ser enviado com a estratégia 'Aceitar' / sem ação de tratamento; ajuste a etapa 4 e envie de novo".
2. **`validar_risco`** (chefia imediata) e **`homologar_risco`** (Diretoria): recusam aprovar ou validar a ficha que não passa na trava. A mensagem orienta a **devolver** a ficha à unidade. É a rede de segurança para a ficha que já estava no caminho antes da migração. Devolver continua sempre possível.
3. **Reavaliação da DAR** (`fn_dar_reavaliar_aprovados`, migração `20261116004`): a decisão passa a olhar **a trava**, e não só a passagem de `is_critico` de falso para verdadeiro. Depois do recálculo, todo aprovado da categoria que **não passa na trava** vai para `devolvido`, e não para `em_homologacao_dir`. Isso inclui o que passou a `pendente_dar` e o aprovado antigo, que já era crítico e estava com "Aceitar" (*decisão do construtor, conferir na leitura*). O aprovado que passa na trava segue exatamente o caminho de hoje: volta para a homologação se passou a crítico, ou fica aprovado nos demais casos, inclusive quando passou a `pendente_dar`. O histórico recebe uma linha com o texto "DAR alterada: categoria X com apetite A → B. O risco aprovado passou a Risco Crítico e está com a estratégia 'Aceitar' (ou sem ação de tratamento), que a Metodologia não permite para risco crítico. Voltou para a unidade escolher outra estratégia e incluir a ação." Se passar na trava, segue o caminho de hoje.

4. **`salvar_ficha_risco`** (migração `20261117001`): grava direto a estratégia e as ações. Por isso ela recusa gravar uma ficha crítica que não passa na trava **quando a ficha não é** `rascunho`, `devolvido` nem `preliminar_cgov`. Assim, uma chamada direta não põe "Aceitar" num aprovado. Rascunho, devolvido e preliminar continuam livres (*decisão do construtor, conferir na leitura*).

Como a trava lê as ações (*decisão do construtor*): ela exige `estrategia_principal <> 'Aceitar'` e pelo menos uma ação com `estrategia <> 'Aceitar'`. A estratégia de cada ação não precisa ser igual à principal, porque a norma não pede isso.

Regras de construção:
- Conferir, antes de escrever a migração, se `fn_fluxo_mudar_estado` e `fn_trava_reabertura_risco` deixam um gatilho mudar o risco de `aprovado` para `devolvido`. Se não deixarem, a migração abre essa passagem só para a reavaliação da DAR, com o mesmo sinal interno que ela já usa (`radar.fluxo`), e um teste cobre a passagem.
- As funções são trocadas com `CREATE OR REPLACE`, a partir da **versão mais recente** de cada uma (`enviar_para_validacao` e `validar_risco` em `20261116001`; `homologar_risco` em `20261115004`, conferir se nenhuma migração posterior a redefine; `fn_dar_reavaliar_aprovados` em `20261116004`). As permissões (`REVOKE`/`GRANT`) são mantidas como estão.
- O construtor escolhe entre pôr a verificação em cada função ou num ponto único de passagem de estado (`fn_fluxo_mudar_estado`, só quando o estado muda para `em_validacao_cg`, `em_homologacao_dir` ou `aprovado`). Se escolher o ponto único, a reavaliação da DAR tem de consultar a trava **antes** de decidir o destino, para nunca levantar exceção no meio do laço.
- A etapa e a ação do histórico usadas na devolução pela DAR devem caber nas restrições atuais da tabela do histórico. Se for preciso um valor novo, a migração amplia a restrição de forma explícita e o comenta.
- Testes de banco (pgTAP ou o padrão já usado no repositório para as migrações de fluxo) cobrem: envio recusado (Aceitar; sem ação), envio aceito com Mitigar + ação, validação e homologação recusadas, DAR alterada devolvendo o aprovado com Aceitar e mantendo o caminho de hoje para o aprovado com Mitigar + ação, e rascunho salvo com Aceitar em risco crítico.

### 4.5 Fonte de demonstração (`fonteDemonstracao.ts`)

O modo de demonstração imita o fluxo do banco. `enviar`, `validar`, `homologar` e `alterarApetite` aplicam a mesma trava com a função pura de 4.1, e as mensagens são as mesmas do banco. As sementes de demonstração que tiverem risco crítico com "Aceitar" são corrigidas.

### 4.6 Nuvem do piloto

- Antes de aplicar a migração, uma consulta **só de leitura** conta os riscos críticos (ou pendentes de DAR) com "Aceitar" ou sem ação, por estado do fluxo. Só a contagem, sem nenhum dado pessoal. O resultado entra no guia da nuvem. **[AUTORIZAÇÃO]**
- Aplicar a migração na nuvem: **[AUTORIZAÇÃO]**, passo separado.
- A migração **não altera** riscos já aprovados. O aprovado que fere a trava só é tocado se a DAR da categoria dele mudar. O construtor registra no plano o que fazer se a contagem achar aprovados nessa situação: listar para a CGOV decidir, sem mudança automática.

### 4.7 Documentação

Atualizar o estado de RF-049, RF-050, RN-019 e RN-020; UC-07 (3a) e UC-13 (5b); a linha da LAC-13 em [[lacunas-norma-sistema]] e em `analise-lacunas-codigo-requisitos.md`; [[rastreabilidade]]; o cartão no [[quadro]]; [[ESTADO-ATUAL]]; e o FS-02 (coluna 15). A etapa 4 do formulário no Figma (cópia ✏️ Trabalho) recebe a opção desabilitada e o texto de ajuda, pelo [[manual-fluxo-figma-vscode]]. Se nenhum componente da biblioteca mudar, não é preciso republicar a biblioteca.

## 5. O que fica para o construtor

- O nome da função pura e da auxiliar do banco, e o arquivo de cada uma.
- Verificação por função ou em ponto único (4.4), com a ressalva da DAR.
- O formato exato das mensagens, desde que digam o motivo e o que fazer.
- A ordem das tarefas e os testes de cada uma. A revisão de banco e fluxo é completa (`CLAUDE.md`, Revisões).
