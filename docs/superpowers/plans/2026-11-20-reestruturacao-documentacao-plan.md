# Reestruturação da documentação do RADAR em 5 níveis — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar a documentação do RADAR em 5 níveis: (1) negócio, (2) requisitos, (3) interface, (4) dados e (5) software, com ADRs. Também alinhar a documentação à revisão normativa da 4ª rodada e entregar um backlog Kanban para retomar a implementação.

**Architecture:** Todo artefato é Markdown no cofre Obsidian (`docs/`), com diagramas em Mermaid. Cada artefato tem um identificador estável (RN-, RF-, RNF-, UC-, ADR-) e uma matriz de rastreabilidade liga norma → requisito → caso de uso → tela/tabela → teste. Um teste Vitest (`tests/unit/documentacao.spec.ts`) verifica a estrutura e a nomenclatura dos documentos, como se faz com o código.

**Tech Stack:** Markdown + Obsidian (wikilinks, plugin Kanban), Mermaid (`flowchart`, `erDiagram`, `classDiagram`, `sequenceDiagram`, `stateDiagram-v2`), Vitest (teste da documentação), Figma MCP (Nível 3), ferramenta `Mermaid_Chart validate_and_render_mermaid_diagram` para validar cada diagrama.

**Spec:** [[2026-11-20-diagnostico-documentacao-radar]] (`docs/superpowers/specs/2026-11-20-diagnostico-documentacao-radar.md`)

## Global Constraints

- Idioma: português do Brasil, linguagem acessível e didática (AGENTS.md, regra 6).
- Nunca "PGR" para Plano de Gestão de Riscos. RADAR = Política; DAR = Declaração de Apetite a Riscos; KRI = Indicador-Chave de Risco.
- Níveis do Quadro 8: **Baixo (1 a 5), Médio (> 5 a 10), Alto (> 10 a 17), Extremo (> 17 a 25)**, sem arredondar. "Risco Crítico" = residual fora do apetite da DAR (nunca sinônimo de Extremo).
- Inerente lido da tabela de 25 células do Quadro 7 (nunca P × I nem P + I). Residual = Inerente × Fator (Inexistente 1,0; Fraco 0,9; Mediano 0,75; Satisfatório 0,6; Forte 0,5). Sem evidência, no máximo Fraco (0,9).
- Proibida a categoria "Operacional com interface de Integridade"; aplicar o Teste de Integridade (6 subcategorias do Quadro 3, Portaria ICMBio nº 253/2026).
- Requisitos: ISO/IEC/IEEE 29148:2018 (atributos de requisito bem formado: necessário, apropriado, inequívoco, completo, singular, viável, verificável, correto, conforme) e SWEBOK v4 (área *Software Requirements*). **Sem histórias de usuário.**
- Qualidade: ISO/IEC 25010:2023, **9 características**: Adequação funcional; Eficiência de desempenho; Compatibilidade; Capacidade de interação; Confiabilidade; Segurança da informação (*security*); Manutenibilidade; Flexibilidade; Proteção (*safety*).
- Casos de uso (Jacobson/Cockburn), seções obrigatórias e nesta ordem: **Título (verbo no infinitivo + objeto), Ator principal, Pré-condições, Pós-condições (garantias mínimas, válidas mesmo em falha), Fluxo principal de sucesso (passos numerados), Fluxos alternativos e de exceção (numerados pelo passo de origem: `3a`, `3b`, `5a.1`), Pós-condição de sucesso**.
- ADR no modelo de Nygard: **Título, Status (`Proposed` | `Accepted` | `Deprecated` | `Superseded by ADR-NNNN`), Contexto, Decisão ("Nós vamos…"), Consequências (positivas, negativas, neutras)** + opcional **Alternativas consideradas**. Arquivo `docs/adr/NNNN-slug-em-kebab-case.md`, de 1 a 2 páginas (≤ 120 linhas). ADR `Accepted` é imutável: só o campo Status muda, quando outro ADR o substitui.
- Diagramas em Mermaid; **sem Modelo C4**. Banco: DER em `erDiagram` (pé-de-galinha).
- Mover arquivos com `git mv`; wikilinks do Obsidian resolvem pelo nome do arquivo, então **nomes de arquivo existentes não mudam**.
- Commit a cada tarefa concluída, mensagem `tipo(escopo): resumo` em português, com a linha `Co-Authored-By`. Nunca versionar `_temp/`, `.env` ou dado pessoal. PR ao fim de cada fase (regra de 2026-11-21 no `AGENTS.md`); push na `main` e merge só com pedido explícito.
- Nenhuma mudança em `src/`, `supabase/migrations/` ou nos cálculos nesta reestruturação: só documentação e o teste da documentação.

## Review Focus

1. **Fonte normativa defasada:** o requisito ou a regra cita o texto original das minutas quando o texto saneado diz outra coisa. O texto saneado **não é uma minuta consolidada** (são trechos em dois relatórios) e as decisões da 4ª rodada ainda não foram aplicadas a ele. Por isso, toda RN cita a origem com um de três rótulos: `Minuta original (dispositivo)`, `Texto saneado 20/11 (relatório §, dispositivo)` ou `Decisão 20/11 não aplicada (alerta)`. Regras do sistema sem base literal nas minutas (trava de evidência, gatilho do Teste de Integridade e proibição da categoria mista, residual abaixo de 1) usam `Regra do sistema (AGENTS.md / decisão)` e citam o alerta (F2-03, F2-04). O revisor confere 100% das RN dos itens 4.6 a 5 e dos arts. 3º, 9, 12 a 15 e 17 contra o diagnóstico §5.
2. **Requisito inventado:** o RF/UC descreve comportamento que nem a norma, nem as decisões da CGOV, nem o código sustentam. Toda linha do catálogo tem coluna `Origem` preenchida; o teste reprova se estiver vazia.
3. **Caso de uso sem exceções reais:** os fluxos de exceção devem incluir os casos já tratados no banco: cargo vago/unidade sem titular, autoaprovação ("sobe um nível"), mudança da DAR reabrindo o risco, controle sem evidência acima de Fraco e importação com categoria proibida. O revisor confere contra `supabase/tests/050`, `070` e `073`.
4. **DER divergente do banco real:** o DER é escrito a partir das migrações (estado final após `20261117001`), não do design v2.0. O teste compara a lista de tabelas do DER com os `CREATE TABLE` das migrações.
5. **ADR retroativo reescrevendo a história:** um ADR retroativo registra a decisão **como foi tomada** (data e origem). Se a decisão já mudou, registram-se dois ADRs, o original como `Superseded by` e o novo.

---

## Mapa de arquivos

| Criar | Responsabilidade |
|---|---|
| `tests/unit/documentacao.spec.ts` | teste estrutural da documentação (IDs, seções obrigatórias, nomenclatura, ADRs) |
| `docs/01-normativos/revisao-2026/` | fontes da 4ª rodada (cópias) + `registro-alertas-f4-f5.md` |
| `docs/10-nivel1-negocio/` | `visao-produto.md`, `mapa-processos.md`, `fluxos/*.md`, `lacunas-norma-sistema.md` |
| `docs/20-nivel2-requisitos/` | `ERS-radar.md`, `regras-negocio.md`, `requisitos-funcionais.md`, `requisitos-nao-funcionais.md`, `casos-de-uso/UC-NN-*.md`, `casos-de-uso/_modelo.md`, `rastreabilidade.md` |
| `docs/40-nivel4-dados/` | `mer-conceitual.md`, `der-logico.md`, `normalizacao.md`, `dicionario-dados.md` |
| `docs/50-nivel5-software/` | `uml-01-casos-de-uso.md` … `uml-05-maquina-estados.md` |
| `docs/adr/` | `README.md` (índice), `0000-modelo.md`, `0001` a `0016` |
| `docs/90-kanban/` | `quadro.md` (formato plugin Kanban), `politicas.md` |

| Modificar / mover | O quê |
|---|---|
| `docs/00-memoria/ESTADO-ATUAL.md`, `MOC-Radar.md`, `GLOSSARIO-ACESSIVEL.md` | corrigir estado; reorganizar índice por nível |
| `docs/04-ux/*` → `docs/30-nivel3-interface/` | `git mv` (nomes preservados) |
| `docs/02-arquitetura-cgti/modelo-dados-mer.md` | vira nota de redirecionamento para `40-nivel4-dados/` (conteúdo histórico preservado) |
| `docs/02-arquitetura-cgti/decisoes-tecnicas-*.md` | cabeçalho "congelado; decisões vigentes em ADR-NNNN" |
| `docs/01-normativos/matriz-regras-regime-b.md` | completar Quadros 1 a 5 e Anexo III |
| `CLAUDE.md`, `AGENTS.md` | apontar a navegação para os níveis e para `docs/adr/` |

## Convenções de identificador (usadas por todas as tarefas)

| Prefixo | Formato | Exemplo | Onde vive |
|---|---|---|---|
| Regra de negócio | `RN-NNN` | `RN-007` | `regras-negocio.md` |
| Requisito funcional | `RF-NNN` | `RF-021` | `requisitos-funcionais.md` |
| Requisito não funcional | `RNF-NNN` | `RNF-012` | `requisitos-nao-funcionais.md` |
| Caso de uso | `UC-NN` | `UC-09` | `casos-de-uso/UC-09-validar-risco.md` |
| ADR | `ADR-NNNN` | `ADR-0004` | `docs/adr/0004-*.md` |
| Alerta normativo | `F4-NN` / `F5-NN` | `F4-12` | `registro-alertas-f4-f5.md` |
| Lacuna | `LAC-NN` | `LAC-03` | `lacunas-norma-sistema.md` |

Cada catálogo (RN, RF, RNF) é uma tabela Markdown cujas **duas primeiras colunas são `ID` e `Enunciado`** e que tem uma coluna **`Origem`**. Os enunciados de RF usam "O sistema deve…"; os de RN usam "…deve/não pode…", sem citar tela.

---

## Fase 0 — Fundação

### Tarefa 1: Trazer as fontes da 4ª rodada e corrigir o estado do projeto

**Files:**
- Create: `docs/01-normativos/revisao-2026/README.md`, cópias dos arquivos da pasta `trabalho` e dos fluxos do processo
- Modify: `docs/00-memoria/ESTADO-ATUAL.md:3-4,176`

**Interfaces:**
- Produces: as fontes ficam em `docs/01-normativos/revisao-2026/` com os nomes originais, e os fluxos em `docs/01-normativos/revisao-2026/fluxos-origem/`. As tarefas 4 a 7 dependem disso.

- [ ] **Step 1: Listar as fontes na pasta adicional do Drive** (acesso configurado na extensão do Claude Code no VS Code, decisão de 2026-11-20; a pasta do Drive é **somente leitura** para o agente) e copiá-las para o repositório depois do Step 2. Fontes (nomes reais, conferidos em 2026-11-20; ver o §0 do diagnóstico):
  - de `trabalho/`: `NT_ESTADO.md`, `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`, `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md`, `Modelagem_Fluxo_Aprovacao_Plano_DAR_2026-11-20.md` (superado, mantido como histórico), os 3 relatórios `Saneamento_Legistica_*_2026-11-20.md` e os 2 `Auditoria_Competencias_*_2026-11-20.md`;
  - de `trabalho/fluxos/`: os `.mmd`, `.md` e `.png` dos 8 fluxos e o `_INDICE.md`, para `fluxos-origem/`;
  - `contexto-revisao-politica-metodologia.md`: não está no Drive; o responsável colou o conteúdo em 2026-11-20 (cópia preparada no scratchpad da sessão, sem a sigla proibida).
  
  **Não copiar:** os PDFs (`documentos-sei/` e `trabalho/*.pdf`), porque trazem assinaturas e nomes; as minutas transcritas (já estão em `docs/01-normativos/` e são idênticas); o `PROCESSO.md` (ficha do acervo da CGOV, não fonte normativa).
- [ ] **Step 2: Conferir dados pessoais antes do commit.** Rode o grep sobre as cópias numa pasta temporária, **antes** de colocá-las em `docs/`: `grep -rniE "cpf|matr[ií]cula|siape|[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]+" <pasta>`. Mostrar o resultado ao responsável antes de copiar. O esperado é só `planejamento@icmbio.gov.br`. Qualquer outro e-mail, CPF ou matrícula deve ser removido, ou o arquivo vai para `_temp/`.
- [ ] **Step 3: Escrever o `README.md` da pasta.** Ele deve ter uma tabela `Arquivo | Origem | Data | Versão | Substitui`. Deve dizer que o `NT_ESTADO.md` prevalece em caso de conflito e que o texto saneado vigente de 4.7 a 5 é o de `Saneamento_Legistica_F4-05_a_F4-09` (o de `Metodologia_4-7_e_5` está em parte superado).
- [ ] **Step 4: Corrigir o `ESTADO-ATUAL.md`.** Registrar que a etapa C foi mesclada pelo PR #8 (`a127b08`), que a D1 (piloto da Sede) foi trazida para esta branch (merge `66f974a`) e que corre em paralelo a "reestruturação da documentação + 4ª rodada normativa". **A etapa D não é suspensa** (diagnóstico §5.3, G2): as lacunas normativas entram no Kanban como `#normativo`.
- [ ] **Step 5: Commit** `docs(estado): fontes da 4ª rodada e estado corrigido após o PR #8`

### Tarefa 2: Esqueleto dos níveis, teste da documentação e ADR-0001

**Files:**
- Create: `tests/unit/documentacao.spec.ts`, `docs/adr/README.md`, `docs/adr/0000-modelo.md`, `docs/adr/0001-registrar-decisoes-em-adr-nygard.md`, `docs/20-nivel2-requisitos/casos-de-uso/_modelo.md`, `README.md` de cada pasta `10-` a `50-`, `90-kanban/`
- Modify: `docs/00-memoria/MOC-Radar.md`, `CLAUDE.md` (seção "Navegação"), `AGENTS.md` (nova seção "Documentação em níveis")

**Interfaces:**
- Produces: o teste `documentacao.spec.ts` com as funções `lerCatalogo(caminho): {id: string, origem: string}[]`, `lerAdrs(): {numero: number, status: string, secoes: string[]}[]` e `lerCasosDeUso(): {id: string, secoes: string[]}[]`. Os testes ignoram arquivos ausentes, para que cada tarefa ative a sua parte quando o arquivo passar a existir.

- [ ] **Step 1: Escrever os testes que falham:**
  - `ADRs numerados em sequência sem lacunas a partir de 0001`.
  - `todo ADR tem as seções Status, Contexto, Decisão e Consequências`.
  - `Status do ADR é Proposed, Accepted, Deprecated ou "Superseded by ADR-NNNN" e aponta para ADR existente`.
  - `todo caso de uso tem as 7 seções obrigatórias na ordem do modelo`.
  - `toda linha dos catálogos RN/RF/RNF tem ID único no formato e Origem não vazia`.
  - `todo ID citado em rastreabilidade.md existe no catálogo correspondente`.
  - `RNF cobre as 9 características da ISO/IEC 25010:2023`.
  - `nenhum documento fora de AGENTS.md, CLAUDE.md, superpowers/ e 01-normativos/revisao-2026/ contém a palavra PGR` (a pasta `revisao-2026/` guarda cópias fiéis das fontes, que citam a sigla na regra que a proíbe).
  - `nenhum documento dos níveis 10–50 usa "Operacional com interface de Integridade"`.
  - `nenhum documento dos níveis chama de "Crítico" a faixa 18–25`: a expressão regular `/(nível|faixa)\s+Crítico/i` não pode aparecer.
- [ ] **Step 2: Rodar `npx vitest run tests/unit/documentacao.spec.ts`.** Esperado: FAIL no teste do ADR-0001 (ainda não existe).
- [ ] **Step 3: Criar as pastas, os modelos e o ADR-0001.** O ADR-0001 tem status `Accepted` e diz: "Nós vamos registrar decisões arquiteturalmente significativas em ADRs no modelo de Nygard, em `docs/adr/`, numerados e imutáveis". Ele cita como contexto os 4 `decisoes-tecnicas-*` sem formato comum. No `_modelo.md` de caso de uso, explicar que "Pós-condições" = garantias mínimas e "Pós-condição de sucesso" = garantia de sucesso (Cockburn).
- [ ] **Step 4: Reorganizar o `MOC-Radar.md` por nível** (seções 0 a 5 + ADR + Kanban + Caderno) e atualizar `CLAUDE.md`/`AGENTS.md`.
- [ ] **Step 5: Rodar `npm test`.** Esperado: todos passam (540 antigos + os novos).
- [ ] **Step 6: Commit** `docs(estrutura): níveis 1–5, modelo de ADR e teste da documentação`

### Tarefa 3: Quadro Kanban e políticas

**Files:**
- Create: `docs/90-kanban/quadro.md`, `docs/90-kanban/politicas.md`, `docs/adr/0002-gerir-trabalho-em-kanban-no-obsidian.md` (status `Accepted`: decisão do responsável em 2026-11-20, Markdown no Obsidian com o plugin Kanban)

**Interfaces:**
- Produces: as colunas abaixo, exatamente nesta grafia. As tarefas 17 e 18 criam cartões nelas.

- [ ] **Step 1: Criar `quadro.md` no formato do plugin Kanban do Obsidian.** O arquivo começa com o *front matter* `kanban-plugin: basic` e tem uma `## Coluna` por coluna e um `- [ ] cartão` por cartão. As colunas e os limites de WIP são:
  - Backlog (sem limite)
  - Pronto para iniciar (máx. 5)
  - Modelagem (máx. 3)
  - Desenvolvimento (máx. 2)
  - Revisão (máx. 2)
  - Homologação CGOV (máx. 3)
  - Concluído

  Cartão: `[tipo] título · IDs ligados (RF-, UC-, LAC-) · #classe`.
- [ ] **Step 2: Escrever `politicas.md`.**
  - Classes de serviço: `#normativo` (passa à frente quando a portaria é publicada), `#data-fixa`, `#padrao` e `#divida`.
  - Definição de Pronto (DoR): o cartão liga pelo menos um RF/RN/LAC e, se toca dados, cita a tabela.
  - Definição de Concluído (DoD): testes verdes (`npm test`, `test:db`, `test:a11y` quando houver tela), rastreabilidade atualizada, ADR quando houver decisão e `ESTADO-ATUAL` atualizado.
  - Métricas: lead time e vazão semanal, registradas à mão no fim do arquivo.
- [ ] **Step 3: Carregar no Backlog as pendências dispersas** (diagnóstico C5 e D3), com origem no texto:
  - cargo vago;
  - formulário edita só o 1º controle/ação/KRI;
  - divergência de criticidade em `acoes_no_fluxo` após mudança da DAR;
  - meta de 3.500 px;
  - lacunas do SharePoint (CT Cuiabá, CTs sem unidades);
  - 4 itens do Figma;
  - errata das migrações `004`/`005`;
  - CSV da auditoria sem guarda contra fórmula.
- [ ] **Step 4: Commit** `docs(kanban): quadro, políticas e pendências consolidadas`

---

## Fase 1 — Nível 1: Descoberta de produto e processos de negócio

### Tarefa 4: Base normativa saneada e registro dos alertas F4/F5

**Files:**
- Create: `docs/01-normativos/revisao-2026/registro-alertas-f4-f5.md`
- Modify: `docs/01-normativos/matriz-regras-regime-b.md` (adicionar Quadros 1 a 5 e Anexo III), `docs/01-normativos/Minuta_Portaria_*` (as transcrições ganham uma nota apontando para o texto saneado; o texto original não é alterado)

**Interfaces:**
- Consumes: as fontes da Tarefa 1.
- Produces: uma tabela `ID | Alerta | Rodada | Decisão | Dispositivo (Política art./Metodologia item) | Impacto no RADAR (tabela/tela/regra) | Situação`. Situação é uma de: `resolvido no texto saneado`, `decidido, não aplicado`, `aberto`, `fora das minutas`. IDs: F1-01 a F1-05, F2-01 a F2-05, F4-01 a F4-18, F5-01 a F5-17 (com F5-01b, F5-03b, F5-08b e F5-09b) e as lacunas sistêmicas LS-01 a LS-06 da auditoria de competências (diagnóstico §5.1, A3).

- [ ] **Step 1: Transcrever os alertas e as decisões das 5 rodadas** de `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md` (F1, F2, F4-01 a F4-07), `Modelagem_F4_v2_e_F3_v3_2026-11-20.md` (F4-10 a F4-18, F5-11 a F5-17 e §11), `Saneamento_Legistica_Aprovacao_Plano_DAR_2026-11-20.md` e `NT_ESTADO.md` (F5-01 a F5-10, F4-08 e F4-09) e `Auditoria_Competencias_*` (LS-01 a LS-06). Acrescentar uma seção "Para levar à PFE" com os itens do `NT_ESTADO.md` e do contexto (inclusive "supervisionar" no art. 3º, III, da Portaria 4.529/2025).
- [ ] **Step 2: Preencher, para cada alerta, a coluna "Impacto no RADAR".** Indicar as migrações, as telas e os testes afetados, ou "nenhum", com justificativa. Atenção aos que tocam o cálculo: F2-01 (o RADAR já compara o residual), F2-02 (apetite `baixo`/`moderado`/`pendente_dar`), F2-03 (`classificar_nivel_q8` classifica abaixo de 1 como Baixo) e F2-04/LS-01 (trava de evidência sem base literal).
- [ ] **Step 3: Completar `matriz-regras-regime-b.md`** com os Quadros 1 a 5 e o Anexo III, a partir da minuta original (o saneamento não alterou os Quadros), e registrar os erros materiais: Anexo II "faixa 18 a 25" × Quadro 8 "> 17"; "Tabela 6/8" no lugar de Quadro; Anexo III com "Comitê Gestor" (deve ser CIG). Corrigir a descrição no MOC ("Quadros 1 a 8" passa a ser verdadeira).
- [ ] **Step 4: Validar.** Contar os IDs nas fontes e no registro: `grep -oE "\b(F[1245]-[0-9]{2}b?|LS-0[1-6])\b" <fontes> | sort -u | wc -l` deve ser igual a `grep -cE "^\| (F[1245]-|LS-)" docs/01-normativos/revisao-2026/registro-alertas-f4-f5.md`.
- [ ] **Step 5: Commit** `docs(normativos): alertas F4/F5 da 4ª rodada e matriz de regras completa`

### Tarefa 5: Visão de produto

**Files:**
- Create: `docs/10-nivel1-negocio/visao-produto.md`

- [ ] **Step 1: Escrever as seções:**
  - Problema;
  - Partes interessadas, com as instâncias da Política (CIG, CTGRIC, CGOV, gestores de risco, 1ª/2ª/3ª linhas, AUDIT);
  - Objetivos do produto (ligados aos objetivos da Política, cap. III);
  - Não-objetivos;
  - Escopo do ciclo 2026–2027;
  - Métricas de sucesso. Exemplo: "% de unidades com riscos críticos reportados no ciclo".
  
  Reaproveitar o design v2.0 §1–3 e apontar para ele como histórico.
- [ ] **Step 2: Commit** `docs(nivel1): visão de produto do RADAR`

### Tarefa 6: Mapa de processos e fluxos em Mermaid

**Files:**
- Create: `docs/10-nivel1-negocio/mapa-processos.md`, `docs/10-nivel1-negocio/fluxos/F1-ciclo-gestao-riscos.md`, `F2-avaliacao-tratamento.md`, `F3-aprovacao-dar-plano.md`, `F4-monitoramento-relato-avaliacao.md`, `FS-01-validacao-interna-risco.md`

**Interfaces:**
- Consumes: `fluxos-origem/` (Tarefa 1).
- Produces: os IDs **oficiais** de fluxo (diagnóstico §5.2): `F1` (v2), `F2`, `F3` (v3, partes 1 e 2; a DAR tramita com o Plano), `F4` (v2, partes 1 a 3; inclui a avaliação anual) e `FS-01` (fluxo interno do RADAR, de 3 degraus, sem base nas minutas). Cada atividade recebe o ID `Fn.NN`, com **ponto**, igual ao número do passo na tabela oficial (ex.: `F3.07` = CGOV encaminha ao CTGRIC). O hífen fica reservado aos alertas (`F4-10`). Os casos de uso citam `Fn.NN` como origem.

- [ ] **Step 1: Para cada fluxo oficial, copiar o diagrama do `.mmd` de `fluxos-origem/`** (não redesenhar) e montar abaixo a tabela `Atividade (Fn.NN) | Executor | Entrada | Saída | Regra (Política art./Metodologia item) | Prazo`, a partir da tabela de passos da modelagem (F3 v3 §7 e F4 v2 §2). O F1 e o F2 não têm tabela numerada: numerar pelos nós do diagrama e marcar `> Numeração atribuída nesta documentação`. O `FS-01` é derivado das migrações `20261115004`, `20261116001` e `20261116003` e da matriz P1–P8, marcado `> Origem: decisão da CGOV, sem base nas minutas (LAC-11)`.
- [ ] **Step 2: Validar cada diagrama** com `Mermaid_Chart validate_and_render_mermaid_diagram`. Esperado: renderiza sem erro.
- [ ] **Step 3: Escrever o `mapa-processos.md`.** Ele posiciona os 5 fluxos na Cadeia de Valor (`supabase/referencia/20261115_cadeia-valor.csv`) e no ciclo da Metodologia (itens 4.1 a 5), e mostra onde o `FS-01` se encaixa (antes da comunicação do 4.6.1).
- [ ] **Step 4: Commit** `docs(nivel1): mapa de processos e fluxos oficiais F1 a F4 e FS-01`

### Tarefa 7: Lacunas entre a norma e o sistema

**Files:**
- Create: `docs/10-nivel1-negocio/lacunas-norma-sistema.md`

**Interfaces:**
- Produces: a tabela `LAC-NN | Dispositivo | O que a norma exige | O que o RADAR faz hoje (arquivo:linha ou "nada") | Severidade (bloqueia homologação / importante / melhoria)`.

- [ ] **Step 1: Registrar no mínimo as 11 lacunas do diagnóstico §5.4**, já confrontadas com o texto saneado:
  - LAC-01: Plano de Gestão de Riscos único (carteira, consolidação, devolução em 10 du, ressalva de incompletude, versões, calendário);
  - LAC-02: manifestação do CTGRIC e deliberação do CIG (DAR antes do Plano), publicação e reapresentação;
  - LAC-03: KRI obrigatório para risco crítico, por grupo de riscos correlatos, com consequência do alerta (a tabela `indicadores_kri` **já tem** fonte, periodicidade, limite e responsável);
  - LAC-04: comunicação das **6** hipóteses do 4.7.2 em 10 du (a hipótese I pode ser detectada pelo `is_critico`);
  - LAC-05: relatórios trimestrais ao CTGRIC e ao CIG (sem a maturidade);
  - LAC-06: avaliação gerencial anual (registro e dados; atividade fora do sistema);
  - LAC-07: revisão do Plano (decisão da CGOV em 10 du; substancial × ordinária);
  - LAC-08: rito da DAR (hoje a CGOV altera o apetite direto em `/dar`);
  - LAC-09: acompanhamento da carteira crítica e cobrança de pendências pela CGOV;
  - LAC-10: reavaliação anual de todo risco registrado;
  - LAC-11: fluxo interno de 3 degraus sem base nas minutas (decisão da CGOV).
  
  Acrescentar as lacunas que vierem dos alertas (Tarefa 4) e dos fluxos (Tarefa 6).
- [ ] **Step 2: Criar um cartão no Backlog para cada LAC**, com classe `#normativo`.
- [ ] **Step 3: Commit** `docs(nivel1): lacunas entre a norma saneada e o sistema`

### Tarefa 7b: Fluxo FS-02 — análise de ato normativo pelas skills da CGOV e importação no RADAR (incluída em 2026-11-21)

> Incluída por decisão do responsável em 2026-11-21: não há especificação da cadeia de skills do escritório virtual da CGOV (plugin `cgov-escritorio`) que analisa atos normativos e gera as fichas preliminares; o RADAR só documenta a importação (UC-13, RN-033, RN-104, `importadorSkillMarkdown.ts`). Objetivo de longo prazo: um serviço de análise de riscos "em um clique".

**Files:**
- Create: `docs/10-nivel1-negocio/fluxos/FS-02-analise-ato-por-skills.md`
- Modify: `docs/10-nivel1-negocio/mapa-processos.md`, `docs/10-nivel1-negocio/README.md`, `docs/00-memoria/MOC-Radar.md`, `docs/90-kanban/quadro.md`

**Interfaces:**
- Produces: o ID de fluxo `FS-02` e as atividades `FS-02.NN`, que a Tarefa 10 (RF de Importação) e a Tarefa 12 (UC-13) citam como origem; o "contrato com o Importar" (colunas e formatos que a skill entrega × que o importador aceita).

- [ ] **Step 1: Ler, só para consulta, os `SKILL.md` das skills da cadeia** (autorizado pelo responsável em 2026-11-21): `cgov-transcrever-normativos`, `cgov-triagem-processo-sei`, `cgov-cadeia-valor`, `cgov-modelar-fluxo`, `cgov-auditoria-competencias`, `cgov-saneamento-legistica`, `cgov-integridade` e `cgov-gestao-riscos` (itens 3.9 e 4). Extrair de cada uma: gatilho, entrada, saída, regras que afetam o risco. Não alterar o plugin.
- [ ] **Step 2: Ler o importador** (`src/utils/importadorSkillMarkdown.ts`, a tela de importação e `tests/unit/importadorSkillMarkdown.spec.ts`) e extrair o formato aceito: colunas, sintaxe da descrição, validações e motivos de recusa.
- [ ] **Step 3: Escrever o FS-02.** Cabeçalho com a origem (`prática da CGOV com as skills do plugin; ferramenta da 2ª linha, sem base nas minutas`); diagrama `flowchart TD` com raias (analista da CGOV, skills, RADAR); atividades `FS-02.NN` numa tabela `Atividade | Executor (pessoa ou skill) | Entrada | Saída | Regra | Observação`; seção "Contrato de dados" (o que cada passo entrega ao seguinte); seção "Contrato com o Importar" (colunas da tabela do Regime B da skill × colunas aceitas pelo importador, com cada divergência); seção "Onde fica o clique (decisão pendente)" com as duas alternativas — skill orquestradora no plugin × botão no RADAR chamando o Claude por Edge Function (dados a serviço externo, CGTI, LGPD, custo, choque com o não-objetivo da visão de produto) — sem decidir.
- [ ] **Step 4: Validar o diagrama** com `Mermaid_Chart validate_and_render_mermaid_diagram`.
- [ ] **Step 5: Atualizar o mapa de processos** (o FS-02 vem antes do FS-01: a ficha preliminar nasce no FS-02 e entra no FS-01), o README do Nível 1 e o MOC; criar no Backlog o cartão `[documentação] Decidir onde fica o "um clique" da análise de atos (ADR) · IDs: — · origem: FS-02 · #padrao`.
- [ ] **Step 6: Rodar `npx vitest run tests/unit/documentacao.spec.ts`** e fazer o commit `docs(nivel1): fluxo FS-02 da análise de atos pelas skills da CGOV`.

---

## Fase 2 — Nível 2: Engenharia de requisitos

### Tarefa 8: ERS — documento-base (ISO/IEC/IEEE 29148)

**Files:**
- Create: `docs/20-nivel2-requisitos/ERS-radar.md`

- [ ] **Step 1: Escrever as seções da ERS (29148:2018, §9.6):**
  1. Propósito;
  2. Escopo;
  3. Definições (apontando para o glossário);
  4. Referências (normas e minutas, com versão);
  5. Visão geral do produto (aponta para a Tarefa 5);
  6. Perspectiva, funções, usuários (os 10 perfis da `matriz-acesso-responsabilidades`), restrições (gov.br DS, CGTI/Docker, LGPD), premissas e dependências (SharePoint, SMTP, publicação das portarias);
  7. Requisitos específicos, que apontam para os catálogos RN, RF e RNF e para os casos de uso;
  8. Verificação: método por requisito, um de **Inspeção, Análise, Demonstração ou Teste**;
  9. Gestão de mudanças: requisito alterado ganha nova versão na tabela, e o ID antigo nunca é reutilizado.
- [ ] **Step 2: Commit** `docs(nivel2): ERS do RADAR (estrutura ISO/IEC/IEEE 29148)`

### Tarefa 9: Catálogo de Regras de Negócio (RN)

**Files:**
- Create: `docs/20-nivel2-requisitos/regras-negocio.md`

**Interfaces:**
- Produces: a tabela `ID | Enunciado | Tipo (cálculo / restrição / autorização / derivação / fato) | Origem (dispositivo + versão) | Implementação (arquivo/função SQL) | Teste`.

- [ ] **Step 1: Extrair as RN** de `AGENTS.md`, da `matriz-regras-regime-b.md` completa, da `matriz-acesso-responsabilidades.md` (§4, §9), de `decisoes-tecnicas-b1` (D1–D3, B11-*), do registro F4/F5 e do texto saneado. A numeração começa pelos cálculos:
  - RN-001: Inerente pelo Quadro 7;
  - RN-002: faixas do Quadro 8 sem arredondamento;
  - RN-003: Residual = Inerente × Fator;
  - RN-004: trava de evidência (origem `Regra do sistema (AGENTS.md)` + alerta F2-04/LS-01: **não está escrita nas minutas**);
  - RN-005: Risco Crítico = residual fora da DAR;
  - RN-006: Teste de Integridade e categoria proibida (as 6 subcategorias têm origem `Minuta original (4.2.2.1, Quadro 3)`; o gatilho do teste e a proibição da categoria mista têm origem `Regra do sistema (AGENTS.md)`, sem base literal nas minutas);
  - RN-007: residual abaixo de 1 classificado como Baixo (origem `Regra do sistema (classificar_nivel_q8)` + alerta F2-03).
  
  Seguir com alcance, segregação "sobe um nível", exclusão, DAR que reabre aprovados, etc. Depois, as regras do texto saneado: prazos de 10 du (devolução, comunicação, alerta do KRI, cobrança, decisões da CGOV), 30 dias da reapresentação, "mudança substancial" (4.6.9, I a III), DAR antes do Plano (F5-13), abstenções no CTGRIC, reavaliação ao menos anual, KRI só para risco crítico e as 6 hipóteses do 4.7.2. As regras da 4ª rodada ainda não aplicadas ao texto levam o rótulo `Decisão 20/11 não aplicada (alerta)`.
- [ ] **Step 2: Para cada RN implementada, apontar a função** (ex.: `calcular_nivel_inerente_q7`, `calculadoraRiscoRadar.ts`) e o teste (ex.: `supabase/tests/000_regressao_calculo.test.sql`). Se não houver implementação, escrever "—" e ligar a uma LAC.
- [ ] **Step 3: Rodar `npx vitest run tests/unit/documentacao.spec.ts`.** Esperado: PASS (IDs únicos, Origem preenchida).
- [ ] **Step 4: Commit** `docs(nivel2): catálogo de regras de negócio`

### Tarefa 10: Catálogo de Requisitos Funcionais (RF)

**Files:**
- Create: `docs/20-nivel2-requisitos/requisitos-funcionais.md`

**Interfaces:**
- Produces: a tabela `ID | Enunciado ("O sistema deve…") | Prioridade (MoSCoW) | RN relacionadas | Origem (Fn.NN / LAC / decisão) | Situação (implementado / parcial / não iniciado) | Verificação (I/A/D/T)`, agrupada pelos módulos: Acesso, Estrutura, Objetos, Riscos, Fluxo interno (FS-01), DAR, Monitoramento/KRI, Reavaliação, Comunicação de fatos, Plano de Gestão de Riscos (consolidação, colegiados, publicação, revisão), Acompanhamento pela CGOV, Relatórios e avaliação, Auditoria e Importação.

- [ ] **Step 1: Derivar um RF de cada atividade sistêmica dos fluxos F1 a F4, FS-01 e FS-02**, de cada linha "faz" da tabela tela × perfil e de cada LAC. Cada RF deve ser singular, ou seja, um "deve" por linha (29148, §5.2.5).
- [ ] **Step 2: Marcar a Situação conferindo o código.** "Implementado" exige um teste citado.
- [ ] **Step 3: Rodar o teste da documentação.** Esperado: PASS.
- [ ] **Step 4: Commit** `docs(nivel2): catálogo de requisitos funcionais`

### Tarefa 11: Catálogo de Requisitos Não Funcionais (ISO/IEC 25010:2023)

**Files:**
- Create: `docs/20-nivel2-requisitos/requisitos-nao-funcionais.md`

**Interfaces:**
- Produces: uma seção por característica (os 9 nomes exatos de Global Constraints) e a tabela `ID | Subcaracterística | Enunciado mensurável | Critério de aceitação | Origem | Verificação`.

- [ ] **Step 1: Registrar como RNF os critérios já medidos**, com valor numérico:
  - **Capacidade de interação:** WCAG 2.2 AA com 0 violações axe; alvos de 44 px; 5 larguras e 3 temas.
  - **Segurança da informação:** RLS por alcance; `service_role` só no servidor; login só de convidado; trilha de auditoria.
  - **Confiabilidade:** transação de `salvar_ficha_risco`.
  - **Eficiência de desempenho:** paginação de 1.000 linhas e cursor de 50.
  - **Flexibilidade:** contêiner Docker e PostgreSQL 15+.
  - **Manutenibilidade:** testes Vitest/pgTAP e comentários didáticos.
  - **Compatibilidade:** gov.br DS e importação da skill.
  - **Adequação funcional:** exatidão do cálculo com 25 células testadas.
  - **Proteção (*safety*):** decisões de risco não podem ser apagadas depois de aprovadas, e há confirmação antes de ações destrutivas.
  
  Acrescentar LGPD (dados pessoais fora do Git).
- [ ] **Step 2: Rodar o teste da documentação.** Esperado: PASS no teste das 9 características.
- [ ] **Step 3: Commit** `docs(nivel2): requisitos não funcionais pela ISO/IEC 25010:2023`

### Tarefa 12: Casos de uso

**Files:**
- Create: `docs/20-nivel2-requisitos/casos-de-uso/UC-NN-*.md` (um por caso), `casos-de-uso/README.md` (índice por ator)

**Interfaces:**
- Consumes: os RF (Tarefa 10), as RN (Tarefa 9) e as atividades Fn.NN dos fluxos (Tarefa 6).
- Produces: os IDs abaixo, revisados contra os fluxos oficiais em 2026-11-20 (diagnóstico §5). Os colegiados (CTGRIC e CIG) e o Presidente **não usam o sistema**: o que eles decidem é registrado pela CGOV, que é a Secretaria-Executiva do CTGRIC. Se, ao escrever, for preciso unir ou dividir casos, registrar o motivo no `README.md`.

| UC | Título | Ator principal | Origem | Situação |
|---|---|---|---|---|
| UC-01 | Entrar no RADAR por link de e-mail | Servidor convidado | ADR/b2 | implementado |
| UC-02 | Gerenciar usuários e perfis | CGOV | b2 | implementado |
| UC-03 | Sincronizar estrutura organizacional e Cadeia de Valor | CGOV (técnico) | b1 | implementado |
| UC-04 | Cadastrar objeto de gestão de riscos | Gestor de riscos | F1; 4.1 | implementado |
| UC-05 | Identificar e registrar risco (com Teste de Integridade) | Gestor de riscos | F1; 4.2 | implementado |
| UC-06 | Analisar risco e avaliar controles existentes | Gestor de riscos | F1, F2; 4.3 | implementado |
| UC-07 | Definir tratamento, plano de ação e KRI | Gestor de riscos | F2; 4.5, 4.7.1 | parcial (LAC-03) |
| UC-08 | Enviar risco para validação | Gestor de riscos | **FS-01** (matriz P1–P8) | implementado; fluxo interno sem base nas minutas (LAC-11) |
| UC-09 | Validar risco | Chefia imediata / Coordenador-Geral | **FS-01** (P1–P8, D1) | idem |
| UC-10 | Homologar risco | Diretor / Presidente | **FS-01** (P1–P8, B11) | idem |
| UC-11 | Devolver risco para ajuste | Validador ou homologador | **FS-01** | idem |
| UC-12 | Elaborar ficha preliminar de risco | CGOV | b1.1 (`preliminar_cgov`) | implementado |
| UC-13 | Importar riscos da tabela da skill | Gestor de riscos / CGOV | FS-02 (Tarefa 7b) | implementado |
| UC-14 | Propor a Declaração de Apetite a Riscos | CGOV | F3.03, F3.07; LS-02 | parcial (LAC-08: hoje a CGOV altera o apetite direto) |
| UC-15 | Registrar medição de KRI e tratar alerta | Gestor de riscos | F4.02, F4.04; 4.7.1 (L-40) | parcial (LAC-03) |
| UC-16 | Comunicar fato de risco à CGOV (6 hipóteses) | Gestor de riscos | F4.05; 4.7.2, I a VI | proposto (LAC-04) |
| UC-17 | Verificar e consolidar o Plano de Gestão de Riscos | CGOV | F3.03 a F3.06; 4.6.2, 4.6.3 | proposto (LAC-01) |
| UC-18 | Registrar a manifestação do CTGRIC e a deliberação do CIG sobre a DAR e o Plano | CGOV (secretaria) | F3.08 a F3.10, F3.13, F3.14; 4.6.4 a 4.6.9 | proposto (LAC-02) |
| UC-19 | Emitir relatório trimestral ao CTGRIC e ao CIG | CGOV | F4.13; 4.7.2 | proposto (LAC-05) |
| UC-20 | Consultar painel e trilha de auditoria | Qualquer perfil com acesso | b3 | implementado |
| UC-21 | Comunicar risco crítico para composição do Plano | Gestor de riscos | F3.02; 4.6.1 | proposto (LAC-01) |
| UC-22 | Acompanhar a carteira crítica e cobrar pendências | CGOV | F4.06 a F4.08; Política art. 15, IX | proposto (LAC-09) |
| UC-23 | Revisar o Plano de Gestão de Riscos | CGOV | F4.10 a F4.12; Política art. 9º; 4.7.2 | proposto (LAC-07) |
| UC-24 | Reavaliar risco (anual ou por fato) | Gestor de riscos | F4.03; 4.7 | proposto (LAC-10) |
| UC-25 | Registrar a publicação da DAR e do Plano | CGOV | F3.11, F3.12; 4.6.7 | proposto (LAC-02) |
| UC-26 | Registrar a avaliação gerencial anual | CGOV | F4.15, F4.16; item 5 | proposto (LAC-06) |

- [ ] **Step 1: Escrever os UC a partir do `_modelo.md`**, com as 7 seções obrigatórias. Os passos do fluxo principal usam a forma "ator faz / sistema faz" (Cockburn), e cada passo que aplica uma regra cita o `RN-NNN`. Os fluxos de exceção obrigatórios:
  - UC-08 a UC-11: titular vago ou unidade sem titular; envio pelo próprio titular (segregação "sobe um nível"); risco reaberto por mudança da DAR sem homologador efetivo;
  - UC-06: tentativa de eficácia acima de Fraco sem evidência;
  - UC-17: devolução com pendências (gestor sana em 10 du) e consolidação com ressalva de incompletude (sem sanar), com ciência à chefia e ao CTGRIC;
  - UC-18: DAR reprovada (o Plano não é votado; os dois voltam juntos, F5-13); Plano reprovado (reapresentação em 30 dias; volta ao CTGRIC só se a mudança for substancial, 4.6.9); manifestação desfavorável à integralidade;
  - UC-15/UC-16: alerta do KRI que coincide com as hipóteses I a III (uma comunicação supre a outra, L-40).
- [ ] **Step 2: Marcar com `> Situação: proposto (LAC-NN)`** os UC de situação "proposto" na tabela. Nos UC-08 a UC-11, acrescentar `> Fluxo interno do RADAR, sem base nas minutas (LAC-11)`.
- [ ] **Step 3: Rodar o teste da documentação.** Esperado: PASS (7 seções em ordem em todos os UC).
- [ ] **Step 4: Commit** `docs(nivel2): casos de uso UC-01 a UC-26`

### Tarefa 13: Matriz de rastreabilidade

**Files:**
- Create: `docs/20-nivel2-requisitos/rastreabilidade.md`

**Interfaces:**
- Produces: a tabela `Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste`. As tarefas 14 a 18 completam as colunas de dados e de tela.

- [ ] **Step 1: Uma linha por RF**, com as colunas de tela e de teste preenchidas pela inspeção de `src/router/index.ts`, de `tests/` e de `supabase/tests/`.
- [ ] **Step 2: Rodar o teste da documentação.** Esperado: PASS (nenhum ID órfão).
- [ ] **Step 3: Commit** `docs(nivel2): matriz de rastreabilidade`

---

## Fase 3 — Nível 4: Modelagem de dados

### Tarefa 14: MER conceitual e DER lógico (pé-de-galinha)

**Files:**
- Create: `docs/40-nivel4-dados/mer-conceitual.md`, `docs/40-nivel4-dados/der-logico.md`
- Modify: `docs/02-arquitetura-cgti/modelo-dados-mer.md` (cabeçalho "substituído por [[mer-conceitual]] e [[der-logico]]"; o conteúdo das seções 3.x é mantido como histórico das migrações)
- Test: `tests/unit/documentacao.spec.ts` (novo caso)

- [ ] **Step 1: Escrever o teste que falha:** `DER contém exatamente as tabelas criadas nas migrações`. O teste lê os `CREATE TABLE` de `supabase/migrations/*.sql` e as entidades do bloco `erDiagram` de `der-logico.md`, e compara os dois conjuntos (hoje são 12 tabelas).
- [ ] **Step 2: Rodar.** Esperado: FAIL ("der-logico.md ausente").
- [ ] **Step 3: Escrever o `mer-conceitual.md`.** Entidades de negócio sem tipos (Unidade, Pessoa/Perfil, Processo da Cadeia de Valor, Objeto, Risco, Causa/Consequência, Controle, Resposta/Ação, KRI, Medição, Categoria/DAR, Movimentação do fluxo, Registro de auditoria). Incluir as entidades **propostas** pelas LAC (Plano de Gestão de Riscos, Ciclo, Comunicação de evento, Relatório, Avaliação de maturidade), marcadas com `%% proposta LAC-NN`. Mostrar a cardinalidade em `erDiagram` e explicar cada relacionamento em uma frase.
- [ ] **Step 4: Escrever o `der-logico.md` a partir do estado final das migrações** (até `20261117001`). Mostrar todos os atributos com tipo, `PK`/`FK`/`UK` e as cardinalidades pé-de-galinha (`||--o{`, `|o--o{`). Validar com `Mermaid_Chart`. Se o diagrama único ficar ilegível, dividir em 3 blocos (Organização e acesso · Risco e tratamento · Fluxo e auditoria), mantendo-os todos no mesmo arquivo para o teste.
- [ ] **Step 5: Rodar `npm test`.** Esperado: PASS.
- [ ] **Step 6: Commit** `docs(nivel4): MER conceitual e DER lógico em notação pé-de-galinha`

### Tarefa 15: Normalização (1FN, 2FN, 3FN) e dicionário de dados

**Files:**
- Create: `docs/40-nivel4-dados/normalizacao.md`, `docs/40-nivel4-dados/dicionario-dados.md`, `docs/adr/0003-gravar-valores-calculados-no-risco.md`

- [ ] **Step 1: Escrever o `normalizacao.md`.** Para cada tabela, verificar 1FN (atomicidade), 2FN (dependência parcial: listar as chaves candidatas) e 3FN (dependência transitiva: listar as dependências funcionais `X → Y`). O resultado de cada forma normal é um entre "conforme", "desnormalização deliberada (ADR-NNNN)" e "dívida (cartão no Kanban)". Os pontos do diagnóstico E2 são o ponto de partida obrigatório. Cada um deve terminar com uma proposta de esquema normalizado, em um bloco `erDiagram` "antes × depois":
  - `subcategorias_permitidas` em JSONB;
  - os campos calculados de `riscos`;
  - `is_critico` × `status_critico`;
  - `possui_evidencia_controle` repetido em `riscos`;
  - `macroprocesso_supervisor_id` e `diretoria_id`;
  - `responsavel_risco_nome`;
  - listas em texto em `objetos_contexto`.
- [ ] **Step 2: Escrever o ADR-0003 (`Accepted`).** Decisão: "Nós vamos gravar `nivel_inerente`, `classificacao_*`, `fator_controle` e `nivel_residual` no risco, calculados por gatilho, para preservar o valor histórico auditável". Consequências: violação controlada da 3FN e a obrigação de recalcular quando a DAR muda (`20261116004`).
- [ ] **Step 3: Escrever o `dicionario-dados.md`.** Para cada coluna: tabela, coluna, tipo, nulo?, domínio (os valores do `CHECK`), significado em linguagem simples, regra (`RN-NNN`) e dado pessoal (sim/não, LGPD).
- [ ] **Step 4: Criar os cartões `#divida`** das dívidas encontradas.
- [ ] **Step 5: Commit** `docs(nivel4): normalização, dicionário de dados e ADR-0003`

---

## Fase 4 — Nível 5: Software e arquitetura

### Tarefa 16: ADRs retroativos

**Files:**
- Create: `docs/adr/0004` a `0016` (o `0002` sai da Tarefa 3 e o `0003` da Tarefa 15; o número segue a ordem de registro, não a data da decisão — a data original vai no corpo)
- Modify: `docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md`, `-b2.md`, `-b3.md` e `-c.md` (cabeçalho "Arquivo congelado em 2026-11-20. Decisões vigentes: ADR-…"), `docs/adr/README.md`

**Interfaces:**
- Produces: a numeração abaixo. Todos têm status `Accepted`, a data original da decisão e uma linha `Origem:` com o arquivo e o código (ex.: `decisoes-tecnicas-b1.md R9`).

| ADR | Decisão | Origem |
|---|---|---|
| 0004 | Usar Vue 3 + TypeScript + `@govbr-ds/core` | design v2.0 §5 |
| 0005 | Usar PostgreSQL/Supabase com RLS como fronteira de segurança | b1, matriz §8 |
| 0006 | Ler o Inerente da tabela do Quadro 7 no banco, com espelho em TypeScript | design v2.0, migração `001` |
| 0007 | Desenvolver e testar com Supabase local em Docker e pgTAP | b1 |
| 0008 | Login por link de e-mail só para convidados (`token_hash`) | b2 |
| 0009 | Dois modos: demonstração (sem `.env`) e real | b2 B2-1 |
| 0010 | Operações privilegiadas em Edge Function; `service_role` só no servidor | b2 |
| 0011 | Fluxo em 3 degraus com segregação "sobe um nível" | b1 D1, B11 |
| 0012 | Mudança da DAR recalcula aprovados e reabre os que viram Críticos | B11 |
| 0013 | Estrutura e Cadeia de Valor importadas do SharePoint, com retrato versionado | b1 R-série |
| 0014 | Entregar à CGTI em contêiner Docker com Nginx | design v2.0 §4 |
| 0015 | Fluxo híbrido Figma ↔ código com Code Connect | ESTADO Fase 2 |
| 0016 | Diagramas em Mermaid, UML sem Modelo C4; casos de uso em `flowchart` | este plano |

- [ ] **Step 1: Escrever cada ADR** (≤ 120 linhas). O Contexto registra as forças em tom neutro, e as Consequências trazem pelo menos um efeito negativo. Uma decisão que já mudou gera um par de ADRs, `Superseded by` + novo (Review Focus 5).
- [ ] **Step 2: Rodar o teste da documentação.** Esperado: PASS (sequência 0001–0016 sem lacuna; status válidos).
- [ ] **Step 3: Commit** `docs(adr): ADRs retroativos 0004 a 0016 e decisões técnicas congeladas`

### Tarefa 17: Os 5 diagramas UML

**Files:**
- Create: `docs/50-nivel5-software/uml-01-casos-de-uso.md`, `uml-02-atividades.md`, `uml-03-classes.md`, `uml-04-sequencia.md`, `uml-05-maquina-estados.md`

- [ ] **Step 1: Casos de uso.** Um `flowchart LR` com os atores fora de um `subgraph RADAR`, os UC-01 a UC-26 dentro e as setas `-. «include» .->` / `-. «extend» .->`. Um diagrama geral e um por grupo de atores, se passar de 25 nós.
- [ ] **Step 2: Atividades.** Um `flowchart TD` com raias (`subgraph`) para o ciclo F1 (4.1 a 5) e para a aprovação F3 (consolidação, CTGRIC, CIG), com decisões em losango (`{}`) e barras de paralelismo como nó `fork`/`join`.
- [ ] **Step 3: Classes.** Um `classDiagram` do domínio com os tipos de `src/types/radar.types.ts`, as stores e os serviços de `src/services/dados/`. As operações levam o nome real das funções (ex.: `calcularRiscoResidual`).
- [ ] **Step 4: Sequência.** Dois `sequenceDiagram`: (a) UC-08 → UC-09 → UC-10, passando pela tela, pela store, pela fonte Supabase, pela RPC, pela RLS, pelo gatilho e pela `auditoria_log`; (b) UC-13 Importar (prévia → recusas → gravação).
- [ ] **Step 5: Máquina de estados.** Um `stateDiagram-v2` de `riscos.status_fluxo` com os 6 estados e todas as transições de `20261115004_fluxo_aprovacao.sql`, `20261116001_fluxo_presidencia.sql`, `20261116003_preliminar_cgov.sql` e `20261116004_dar_reavalia_aprovados.sql`, cada uma rotulada com a ação de `historico_fluxo.acao` (inclusive `reaberto_mudanca_dar`) e a guarda (`[sem homologador efetivo]`). Um segundo diagrama, marcado como **proposta LAC-01/02**, para o ciclo do Plano de Gestão de Riscos.
- [ ] **Step 6: Validar os 5 arquivos** com `Mermaid_Chart validate_and_render_mermaid_diagram`. Conferir as transições da máquina de estados contra `supabase/tests/050_fluxo.test.sql` e `073_dar_reavalia.test.sql`: toda transição testada aparece no diagrama.
- [ ] **Step 7: Commit** `docs(nivel5): diagramas UML de casos de uso, atividades, classes, sequência e estados`

---

## Fase 5 — Nível 3: Interface

### Tarefa 18: Reorganizar UX e mapear tela ↔ caso de uso ↔ Figma

**Files:**
- Move: `git mv docs/04-ux docs/30-nivel3-interface`
- Create: `docs/30-nivel3-interface/mapa-telas.md`
- Modify: `docs/20-nivel2-requisitos/rastreabilidade.md` (coluna Tela), `docs/30-nivel3-interface/manual-fluxo-figma-vscode.md` (caminhos)

- [ ] **Step 1: Mover a pasta e procurar caminhos quebrados.** Rode `grep -rn "04-ux/" --include=*.md --include=*.ts --exclude-dir=node_modules --exclude-dir=superpowers --exclude-dir=revisao-2026 .` (os planos, as specs e as cópias fiéis guardam o caminho antigo como histórico). Esperado: nenhum resultado depois de corrigir.
- [ ] **Step 2: Montar o `mapa-telas.md`** com a tabela `Rota | View (.vue) | UC atendidos | Perfis (matriz §7) | Página Figma (Original/Trabalho) | Componentes Code Connect | Situação`. Linhas novas para as telas exigidas pelos UC de situação "proposto" (UC-14 a UC-19 e UC-21 a UC-26; Situação "a prototipar").
- [ ] **Step 3: Criar um cartão "Modelagem" para cada tela a prototipar.** O cartão segue o fluxo de [[manual-fluxo-figma-vscode]] pelo MCP do Figma (skills `figma:figma-use` e `figma:figma-generate-design`).
- [ ] **Step 4: Rodar `npm test` e `npm run build`.** Esperado: PASS (nenhum import aponta para `docs/`).
- [ ] **Step 5: Commit** `docs(nivel3): UX como nível 3 e mapa de telas, casos de uso e Figma`

---

## Fase 6 — Fechamento e retomada da implementação

### Tarefa 19: Análise de lacunas código × requisitos e backlog priorizado

**Files:**
- Modify: `docs/90-kanban/quadro.md`, `docs/00-memoria/ESTADO-ATUAL.md`, `docs/00-memoria/MOC-Radar.md`, `docs/00-memoria/GLOSSARIO-ACESSIVEL.md`

- [ ] **Step 1: Para cada RF com Situação "parcial" ou "não iniciado", criar ou ligar um cartão.** Priorizar nesta ordem:
  1. `#normativo` que bloqueia a homologação;
  2. dívida de dados que muda o esquema (para não migrar duas vezes);
  3. o restante.
  
  Mover para "Pronto para iniciar" no máximo 5 cartões que cumprem a DoR.
- [ ] **Step 2: Decidir com a CGOV** se a etapa D (homologação CGTI) entra antes ou depois das LAC-01 a LAC-11. Registrar a decisão em ADR. Lembrar que o piloto da Sede (D0/D1) já está em curso e não foi suspenso (diagnóstico §5.3).
- [ ] **Step 3: Atualizar o `ESTADO-ATUAL`.** Ele deixa de ser um diário de etapas: vira um "retrato" com a fase, os números da verificação e o link para o quadro. O histórico das etapas vai para `docs/00-memoria/historico-etapas.md`, movendo as seções existentes.
- [ ] **Step 4: Atualizar o glossário** (RF, RNF, RN, UC, ADR, MER/DER, formas normais, WIP, DoR/DoD, em linguagem simples).
- [ ] **Step 5: Verificação final, nesta ordem:**
  - `npm test`: PASS;
  - `npm run build`: ok;
  - `grep -rn "\bPGR\b" docs | grep -v superpowers`: só as regras que proíbem a sigla;
  - `git status --porcelain | grep -i _temp`: vazio;
  - `git diff --stat main -- src supabase/migrations`: vazio.
- [ ] **Step 6: Commit** `docs(estado): documentação em 5 níveis concluída e backlog Kanban priorizado`

---

## Decisões que dependem do responsável pelo projeto

1. ~~Acesso às fontes da Tarefa 1~~ — **decidido (2026-11-20):** pasta do Drive adicionada à sessão local na extensão do Claude Code no VS Code.
2. ~~Onde fica o quadro Kanban~~ — **decidido (2026-11-20):** Markdown no Obsidian com o plugin Kanban (ADR-0002).
3. **Etapa D antes ou depois das lacunas normativas** (Tarefa 19, Step 2). Até lá, a D segue (decidido em 2026-11-20: a etapa D não é suspensa; diagnóstico §5.3).
4. ~~Base da branch~~ — **decidido (2026-11-20):** a `feat/d1-ambiente-piloto` foi mesclada nesta branch (`66f974a`).
5. **Onde fica o "um clique" da análise de atos pelas skills (FS-02):** skill orquestradora no plugin × botão no RADAR. Decisão da CGOV, registrada em ADR (cartão criado na Tarefa 7b).
6. **Destino do fluxo interno de 3 degraus (LAC-11):** mantê-lo como etapa interna anterior à comunicação do 4.6.1 ou adaptá-lo ao rito das minutas. Decisão da CGOV, a tomar na Tarefa 7 ou na Tarefa 19.
