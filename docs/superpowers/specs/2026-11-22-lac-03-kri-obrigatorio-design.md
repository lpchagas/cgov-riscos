# LAC-03 — KRI obrigatório e completo no risco crítico, com grupo de correlatos (desenho)

> **Data:** 2026-11-22 · **Branch:** `claude/icmbio-risk-policy-modeling-q840ho`
> **Lacuna:** LAC-03 em [[lacunas-norma-sistema]] (bloqueia homologação, ADR-0017)
> **Requisitos:** RN-082, RN-083, RF-094, RF-095, RF-096, RF-097, RF-183, RF-184 · **Casos de uso:** UC-07 (5c), UC-13 (5b), UC-15 (1a)
> **Fonte:** Metodologia 4.7.1 (1º parágrafo e alíneas a a f, texto saneado de 20/11/2026); Política art. 8º, § 2º
> **Fora daqui:** o alerta do KRI (RF-102, RN-084) e a comunicação que supre as hipóteses I a III (RF-109) têm cartão próprio e esperam o desenho P-02 no Figma.

## 1. Por que

Pela Metodologia 4.7.1, o gestor define **pelo menos um KRI para cada risco crítico, ou para um grupo de riscos críticos correlatos**. O KRI tem métrica, fonte dos dados, periodicidade de monitoramento, limite de alerta e responsável pelo monitoramento e pela atualização. Hoje o RADAR:

- deixa um risco crítico chegar a `aprovado` sem KRI (`enviar_para_validacao`, `validar_risco` e `homologar_risco` não o exigem);
- grava KRI com fonte, meta e limite "A definir" (formulário, `src/utils/formularioRisco.ts:258-267`), ou com valores inventados, como meta "100%" e alerta "< 80%" (importador, `src/services/dados/conversores.ts:605-616`), e cria "Indicador a definir com a 1ª Linha" quando a célula vem vazia (`src/utils/importadorSkillMarkdown.ts:369`);
- liga cada KRI a um só risco (`indicadores_kri.risco_id`): não há grupo de correlatos.

Isso é **contradição** com a norma e bloqueia a homologação (ADR-0017).

## 2. Objetivos, não objetivos e o que seria fracasso

**Objetivos**
- **RF-095:** todo risco crítico tem pelo menos um KRI **completo** ligado a ele para ser enviado, validado e homologado.
- **RF-096 / RN-083 — "completo"** (decisão do responsável, 2026-11-22): `nome_indicador` (a métrica), `formula_calculo`, `fonte_dados`, `periodicidade`, `limite_alerta` e `responsavel_medicao` preenchidos. A **meta** (`meta_alvo`) fica **opcional**. Texto vazio, só espaços, ou um dos marcadores antigos ("A definir", "A definir pela unidade") **não** conta como preenchido.
- **RF-097 — grupo de correlatos** (decisões do responsável, 2026-11-22): um KRI pode ser ligado a **vários riscos do mesmo objeto de gestão de riscos**, pelo modelo **muitos para muitos**. O KRI passa a pertencer ao **objeto**, e uma tabela de ligação diz a quais riscos ele serve. A medição é registrada uma vez, no KRI, e vale para todos os riscos ligados.
- "Risco crítico", **para esta trava**, é o mesmo da LAC-13: `status_critico = 'sim'` (residual fora do apetite da DAR) e, por regra do sistema (decisão do responsável), `'pendente_dar'`, que não é risco crítico pela norma.
- **A exigência do KRI entra na trava da LAC-13** (decisão do responsável, 2026-11-22): vale nas mesmas portas (enviar, validar, homologar, `salvar_ficha_risco` fora do rascunho, devolvido e preliminar da CGOV) e na reavaliação pela DAR. O risco aprovado que passa a ser crítico (a DAR mudou) e não tem KRI completo **volta para a unidade**. A ficha editada reabre e só é validada com o KRI. Assim o F4-10 (prazo do KRI do risco que vira crítico depois) fica respondido na prática: sem KRI, o risco não volta a ser aprovado.
- **RF-183 / RF-184:** o importador só cria KRI quando a linha traz um, e só com o que a skill entregou: o **nome**. Os demais campos ficam vazios, sem nada inventado.
- **Sobras da LAC-13** (triagem da PR #16, decisão do responsável): (a) bloqueio `FOR SHARE` da linha de `categorias_risco` em `fn_base_enviar_para_validacao`, `fn_base_validar_risco` e `fn_base_homologar_risco`, antes de ler o apetite, para fechar a corrida com a mudança da DAR; (b) o histórico de `fn_dar_reavaliar_aprovados` (e o da demonstração) passa a dizer o **motivo real** da devolução (o que `fn_trava_risco_critico` devolveu) e a criticidade atual, sem dizer "passou a Risco Crítico" quando o risco já era crítico, e sem atribuir à Metodologia a regra do Pendente de DAR.

**Não objetivos**
- O alerta do KRI (comparar valor com limite, prazo de 10 dias úteis, reavaliação): RF-102, cartão próprio.
- Grupo entre objetos ou entre unidades.
- Mudar o cálculo (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`; `trigger_calcular_risco_radar`).
- KRI obrigatório para risco **não** crítico (a norma não exige; RN-082).

**Fracasso** (mesmo que "funcione")
- Um risco crítico chega a `aprovado`, por qualquer caminho (formulário, importação, RPC, chamada direta ao banco, mudança da DAR), sem um KRI completo ligado a ele.
- O sistema grava um valor de KRI que ninguém definiu.
- Uma medição de KRI some na migração, ou um KRI existente perde a ligação com o risco que tinha.
- Um gestor lê, liga ou altera um KRI de objeto fora do próprio alcance.

## 3. Abordagens consideradas

1. **"Usar o KRI de outro risco"**: o KRI continua de um risco, e cada risco ganha uma coluna opcional que aponta para o KRI de outro risco do mesmo objeto. Migração pequena, mas o KRI tem um "dono" artificial, e excluir esse risco tira o KRI de todos.
2. **Muitos para muitos (escolhida pelo responsável, 2026-11-22).** O KRI passa a ser do objeto (`indicadores_kri.objeto_id`), e a tabela nova `kri_riscos (kri_id, risco_id)` liga cada KRI aos riscos. É o modelo mais fiel ao "grupo de correlatos": nenhum risco é dono do KRI. O custo é mover os dados, refazer a RLS do KRI e das medições e reescrever a parte dos KRIs em `salvar_ficha_risco` e no gatilho de reabertura.
3. **Cadastro de grupos**: uma entidade "grupo de correlatos" com membros, e o KRI pertence ao grupo. Modela além do que a norma pede (a norma não pede o grupo como cadastro).

## 4. O desenho

### 4.1 A regra, num lugar só de cada lado

- **TypeScript:** `src/utils/travaRiscoCritico.ts` ganha o 3º motivo: depois da estratégia e da ação, "falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável)". A função que diz se um KRI está completo (`kriCompleto`) fica no mesmo arquivo e é usada pelo formulário, pelo importador e pela demonstração.
- **Banco:** `fn_trava_risco_critico(p_risco)` ganha o mesmo 3º motivo, olhando `kri_riscos` + `indicadores_kri`. Uma função auxiliar `fn_kri_completo(indicadores_kri)` (IMMUTABLE) aplica a mesma definição de "completo". Como as portas da LAC-13 já chamam `fn_trava_risco_critico`, a exigência passa a valer em todas sem mexer nelas uma a uma.
- Ordem dos motivos (a 1ª que falha é a mensagem): estratégia "Aceitar" → falta ação 5W2H → falta KRI completo.

### 4.2 Banco (uma migração nova, `20261122004_lac03_kri_obrigatorio.sql`)

**Estrutura**
- `indicadores_kri.objeto_id uuid NOT NULL REFERENCES objetos_contexto(id) ON DELETE CASCADE`, preenchido a partir do risco de hoje.
- Tabela `kri_riscos (kri_id uuid REFERENCES indicadores_kri ON DELETE CASCADE, risco_id uuid REFERENCES riscos ON DELETE CASCADE, PRIMARY KEY (kri_id, risco_id))`, preenchida com o par atual `(id, risco_id)` de cada KRI.
- Gatilho em `kri_riscos` que recusa ligar um KRI a um risco de **outro objeto** (`kri.objeto_id <> risco.objeto_id`).
- `indicadores_kri.risco_id` é **removida** depois da cópia.
- `formula_calculo`, `fonte_dados`, `periodicidade`, `meta_alvo`, `limite_alerta` e `responsavel_medicao` passam a aceitar `NULL` (o `CHECK` da periodicidade continua, aceitando também `NULL`; *decisão do construtor*: o RF-183 proíbe inventar a periodicidade). Os marcadores antigos ("A definir", "A definir pela unidade") e os valores que o importador inventava (fórmula "Definido preliminarmente via skill CGOV", fonte "SEI / Sistema Setorial", meta "100%" e alerta "< 80%", **só quando os quatro aparecem juntos**, que é a assinatura do importador) viram `NULL`.
- **Aprovados antigos fora da regra** (decisão do responsável, 2026-11-22): a migração **não muda o estado** de nenhum risco. O risco aprovado e crítico que fica sem KRI completo continua aprovado, e só volta ao fluxo quando a ficha for editada ou a DAR mudar (como a LAC-13 fez com os aprovados antigos). Uma consulta só de leitura, registrada no [[guia-supabase-nuvem]], lista esses riscos para a CGOV cobrar das unidades.
- KRI órfão (sem nenhuma ligação): quando a última ligação some, o KRI e as medições dele são apagados (gatilho `AFTER DELETE` em `kri_riscos`). O formulário já pede confirmação antes de apagar medições (`FormularioRiscoView.vue:105-118`).

**RLS** (mesmo alcance de hoje, trocando o caminho "KRI → risco → objeto" por "KRI → objeto")
- `indicadores_kri`: leitura quando o objeto está no alcance; escrita com `pode_escrever_objeto(objeto_id)`.
- `kri_riscos`: leitura quando o risco está no alcance; escrita com `pode_escrever_objeto` do objeto do risco.
- `medicoes_kri`: o caminho passa a ser medição → KRI → objeto.

**Reabertura e trava das tabelas filhas** (`fn_trava_reabertura_ficha`)
- `kri_riscos` ganha o gatilho de reabertura: ligar ou desligar um KRI é "mexer na ficha" do risco ligado.
- Alterar a **definição** de um KRI (`indicadores_kri`) aplica a trava e a reabertura a **todos os riscos ligados** a ele (hoje é só ao `risco_id`). Se algum risco ligado estiver em validação ou homologação, a alteração é recusada ("ficha travada"), como hoje. Medir continua livre em qualquer estado.

**`salvar_ficha_risco`** (parte 2c, KRIs)
- A ficha manda `kris` como hoje. Um item sem `id` **cria** um KRI novo no objeto do risco e o liga ao risco. Um item com `id` **altera** a definição daquele KRI, que precisa ser do mesmo objeto. Um item com `id` e `apenasLigar: true` só **liga** um KRI que já existe no objeto, sem alterar a definição.
- Os KRIs ligados hoje que não vierem na lista são **desligados** deste risco. Se ficarem órfãos, são apagados (com as medições), pelo gatilho acima.
- A trava embutida (parte 2d) passa a enxergar o KRI, porque roda depois da gravação dos KRIs.

**Sobras da LAC-13**
- `FOR SHARE` da categoria nas três `fn_base_*`, antes de ler o apetite.
- `fn_dar_reavaliar_aprovados`: histórico com o motivo de `fn_trava_risco_critico`. Exemplos:
  - já crítico, sem KRI: "DAR alterada: categoria X com apetite A → B. O risco aprovado (residual 12, Alto, fora do apetite da DAR) falta um KRI completo, exigido para risco crítico. Voltou para a unidade."
  - Pendente de DAR: "... (residual 8, Médio, com DAR pendente: por regra do sistema, a trava do risco crítico também se aplica) ..."
- O texto exato fica com o construtor, desde que diga o motivo, diga a criticidade atual e não use "Crítico" para a faixa 18 a 25 (que é "Extremo").

### 4.3 Formulário (etapa 4, `FormularioRiscoView.vue` e `formularioRisco.ts`)

- O bloco "Indicador de acompanhamento (KRI)" passa a ter os campos: nome, fórmula, fonte dos dados, periodicidade (lista: Mensal, Trimestral, Semestral, Anual), meta (opcional), limite de alerta e responsável. Os componentes são os que já existem (`FormField`, `input`, `select`).
- Opção "Usar um KRI já definido neste objeto": uma lista com os KRIs do objeto (nome + riscos a que já serve). Escolhido um, os campos mostram a definição dele, só para leitura, e a ficha manda `apenasLigar`. Para alterar a definição de um KRI compartilhado, há um aviso: "Este KRI também serve aos riscos R-…; alterar muda o indicador de todos eles e reabre os aprovados."
- Risco crítico (ou Pendente de DAR): o KRI é obrigatório para **avançar da etapa 4** fora do rascunho, com mensagem de ajuda, como a trava do "Aceitar" (`validarEtapa`). No rascunho, continua livre. Risco não crítico: o KRI continua opcional e pode ser salvo incompleto (os campos vazios vão `NULL`, nunca "A definir"; *decisão do construtor*, para não criar atrito novo onde a norma não exige o KRI).
- O formulário continua com um KRI por ficha na tela (o 1º). KRIs a mais, vindos de outro caminho, continuam intactos, como hoje (`lista(...)`).

### 4.4 Importador

- `importadorSkillMarkdown.ts`: a coluna 16 vazia não gera KRI (`kriSugerido` fica vazio, RF-184).
- `conversores.ts`: o KRI importado leva só o nome. Fórmula, fonte, periodicidade, meta, limite e responsável vão vazios (`NULL`).
- A linha crítica **não** é recusada por falta de KRI completo: a skill não entrega os demais campos, e a importação cria fichas em estado livre (preliminar da CGOV). A trava age no envio. Um aviso (que não bloqueia) diz: "Linha R-07: risco crítico; o KRI precisa ser completado na ficha antes do envio."

### 4.5 Monitoramento (`MonitoramentoKriPlanoAcaoView.vue`)

- A lista passa a ter **uma linha por KRI**, e não uma por par risco × KRI, com os códigos dos riscos ligados ("Riscos: R-01, R-04"). A medição continua sendo registrada por KRI. A RPC/a fonte deixam de pedir o `riscoId` para medir, ou passam a aceitar qualquer risco ligado (escolha do construtor).
- KRI sem limite de alerta (dado antigo, `NULL`) aparece com "limite não definido" (UC-15, 1a).

### 4.6 Tipos, conversores e fontes

- `IndicadorKri` ganha `objetoId` e `riscoIds: string[]`. Os campos que podem vir vazios passam a ser opcionais (`formulaCalculo?`, `fonteDados?`, `metaAlvo?`, `limiteAlerta?`, `responsavelMedicao?`).
- `fonteSupabase.ts` lê `kri_riscos` para montar `risco.kris` (o mesmo KRI aparece em cada risco ligado) e a lista de KRIs do objeto.
- `fonteDemonstracao.ts` imita o banco: KRIs por objeto, ligação muitos para muitos, trava com o 3º motivo, órfão apagado, histórico novo da DAR e devolução com o motivo. As sementes (`dadosSementeAnexoII.ts`) ganham KRIs completos nos riscos críticos, e um par de riscos críticos do mesmo objeto passa a compartilhar um KRI, para a demonstração mostrar o grupo.
- `supabase/seed-demonstracao.sql`: os riscos críticos ganham KRI completo (fecha parte da sobra da LAC-13, que lá não tinham ação: a ação também entra).

### 4.7 Testes

- Vitest: `travaRiscoCritico.spec.ts` (3º motivo e `kriCompleto`, inclusive "A definir" e espaços), `formularioRisco.spec.ts`, `importadorSkillMarkdown.spec.ts` (RF-183, RF-184), `fonteDemonstracao.spec.ts` (ligar, desligar, órfão, trava, DAR) e `dadosSementeConsistencia.spec.ts` (todo crítico da semente tem KRI completo).
- pgTAP `110_lac03_kri_obrigatorio.test.sql`: migração dos dados (contagem de KRIs, ligações e medições igual antes e depois; marcadores viram `NULL`); envio, validação e homologação recusados sem KRI completo; ligação entre objetos recusada; RLS (gestor de outra unidade não lê nem liga); reabertura de todos os aprovados ligados quando a definição muda; órfão apagado; DAR devolve com o motivo novo; `FOR SHARE` presente (por leitura da definição da função).
- Os testes pgTAP que usam `indicadores_kri.risco_id` são ajustados.
- A consulta dos aprovados antigos fora da regra (4.2) tem um teste que a roda sobre um caso montado.

### 4.8 Nuvem do piloto

- Aplicar a `20261122004` no projeto do piloto é **[AUTORIZAÇÃO]**: o plano para e pede, depois dos testes locais. Antes de aplicar, uma consulta só de leitura conta os KRIs, ligações e medições do piloto, para comparar depois. O registro vai no [[guia-supabase-nuvem]].
- Front: a publicação segue o rito de sempre, também com **[AUTORIZAÇÃO]**.

### 4.9 Documentação

RF-094 a RF-097, RF-183, RF-184 (situação), RN-082 e RN-083 (aplicação), UC-07 (5c), UC-13 (5b), UC-15 (1a), LAC-03 na [[lacunas-norma-sistema]], MER, DER, dicionário e normalização (`kri_riscos`, `objeto_id`, campos que aceitam vazio), [[quadro]], [[analise-lacunas-codigo-requisitos]] e [[ESTADO-ATUAL]]. Não é preciso ADR novo: a mudança segue o ADR-0017 e o modelo da LAC-13.

## 5. O que fica para o construtor

- O texto exato das mensagens e do histórico, dentro das regras do 4.2 e do `AGENTS.md`.
- Como `registrarMedicao` identifica o KRI (só `kriId`, ou `kriId` + um risco ligado), desde que a medição continue livre em qualquer estado e respeite a RLS.
- A ordem das tarefas, desde que a migração e o pgTAP venham antes do front, e o passo da nuvem fique por último, marcado **[AUTORIZAÇÃO]**.
- Se o gatilho de órfão é `AFTER DELETE` em `kri_riscos` ou se fica dentro de `salvar_ficha_risco`, desde que um KRI nunca fique sem ligação.
