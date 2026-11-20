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
- Commit a cada tarefa concluída, mensagem `tipo(escopo): resumo` em português, com a linha `Co-Authored-By`. Nunca versionar `_temp/`, `.env` ou dado pessoal. Push e PR só com pedido explícito.
- Nenhuma mudança em `src/`, `supabase/migrations/` ou nos cálculos nesta reestruturação: só documentação e o teste da documentação.

## Review Focus

1. **Fonte normativa defasada:** o requisito ou a regra cita o texto de 15/09 quando o texto saneado diz outra coisa. Cada RN deve citar a versão da fonte (`Metodologia saneada 4.6` × `Minuta 024421455 4.6`); o revisor confere 100% das RN dos itens 4.6 a 5 e dos arts. 3, 9, 12 a 15.
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

- [ ] **Step 1: Responsável pelo projeto copia as fontes para o repositório.** Ou anexa o computador à sessão pelo Remote Control. Arquivos: `NT_ESTADO.md`, `contexto-revisao-politica-metodologia.md`, `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`, os 3 relatórios `Saneamento_Legistica_*` e os fluxos (BPMN/imagens/PDF) da pasta `SEI_02070.001696_2026-31_gestao-riscos`.
- [ ] **Step 2: Conferir dados pessoais antes do commit.** Rode `grep -rniE "cpf|matr[ií]cula|@icmbio\.gov\.br" docs/01-normativos/revisao-2026/`. O resultado esperado é só `planejamento@icmbio.gov.br`. Qualquer outro e-mail ou CPF deve ser removido ou o arquivo vai para `_temp/`.
- [ ] **Step 3: Escrever o `README.md` da pasta.** Ele deve ter uma tabela `Arquivo | Origem | Data | Versão | Substitui`.
- [ ] **Step 4: Corrigir o `ESTADO-ATUAL.md`.** Registrar que a etapa C foi mesclada pelo PR #8 (`a127b08`) e que a fase atual é "reestruturação da documentação + 4ª rodada normativa". Anunciar que a etapa D fica suspensa até a Tarefa 18.
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
  - `nenhum documento fora de AGENTS.md, CLAUDE.md e superpowers/ contém a palavra PGR`.
  - `nenhum documento dos níveis 10–50 usa "Operacional com interface de Integridade"`.
  - `nenhum documento dos níveis chama de "Crítico" a faixa 18–25`: a expressão regular `/(nível|faixa)\s+Crítico/i` não pode aparecer.
- [ ] **Step 2: Rodar `npx vitest run tests/unit/documentacao.spec.ts`.** Esperado: FAIL no teste do ADR-0001 (ainda não existe).
- [ ] **Step 3: Criar as pastas, os modelos e o ADR-0001.** O ADR-0001 tem status `Accepted` e diz: "Nós vamos registrar decisões arquiteturalmente significativas em ADRs no modelo de Nygard, em `docs/adr/`, numerados e imutáveis". Ele cita como contexto os 4 `decisoes-tecnicas-*` sem formato comum. No `_modelo.md` de caso de uso, explicar que "Pós-condições" = garantias mínimas e "Pós-condição de sucesso" = garantia de sucesso (Cockburn).
- [ ] **Step 4: Reorganizar o `MOC-Radar.md` por nível** (seções 0 a 5 + ADR + Kanban + Caderno) e atualizar `CLAUDE.md`/`AGENTS.md`.
- [ ] **Step 5: Rodar `npm test`.** Esperado: todos passam (540 antigos + os novos).
- [ ] **Step 6: Commit** `docs(estrutura): níveis 1–5, modelo de ADR e teste da documentação`

### Tarefa 3: Quadro Kanban e políticas

**Files:**
- Create: `docs/90-kanban/quadro.md`, `docs/90-kanban/politicas.md`, `docs/adr/0002-gerir-trabalho-em-kanban-no-obsidian.md` (status `Proposed` até o responsável aprovar)

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
- Produces: uma tabela `ID | Alerta | Decisão da 4ª rodada | Dispositivo (Política art./Metodologia item) | Impacto no RADAR (tabela/tela/regra) | Situação`, com os IDs F4-10 a F4-18 e F5-11 a F5-17.

- [ ] **Step 1: Transcrever os 16 alertas e as decisões da 4ª rodada** de `Modelagem_F4_v2_e_F3_v3_2026-11-20.md`.
- [ ] **Step 2: Preencher, para cada alerta, a coluna "Impacto no RADAR".** Indicar as migrações, as telas e os testes afetados, ou "nenhum", com justificativa.
- [ ] **Step 3: Completar `matriz-regras-regime-b.md`** com os Quadros 1 a 5 e o Anexo III, a partir da Metodologia saneada. Corrigir a descrição no MOC ("Quadros 1 a 8" passa a ser verdadeira).
- [ ] **Step 4: Validar.** Rode `grep -c "^| F[45]-" docs/01-normativos/revisao-2026/registro-alertas-f4-f5.md`. Esperado: `16`.
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
- Create: `docs/10-nivel1-negocio/mapa-processos.md`, `docs/10-nivel1-negocio/fluxos/F-01-ciclo-gestao-riscos.md`, `F-02-validacao-aprovacao-risco.md`, `F-03-consolidacao-plano-gestao-riscos.md`, `F-04-monitoramento-relato.md`, `F-05-declaracao-apetite.md`, `F-06-avaliacao-gestao-riscos.md`

**Interfaces:**
- Consumes: `fluxos-origem/` (Tarefa 1).
- Produces: os IDs de fluxo `F-01`…`F-06`. Cada atividade recebe o ID `F-NN.AA` (ex.: `F-02.03`), que os casos de uso citam como origem.

- [ ] **Step 1: Para cada fluxo modelado, transcrever em Mermaid `flowchart TD`.** Usar um `subgraph` por raia (unidade/papel) e numerar as atividades `F-NN.AA` no rótulo. Abaixo do diagrama, montar a tabela `Atividade | Executor | Entrada | Saída | Regra (Política art./Metodologia item)`. Se o fluxo de origem não existir para algum dos 6, derivar da Metodologia saneada e marcar `> Origem: derivado do texto, sem modelagem oficial`.
- [ ] **Step 2: Validar cada diagrama** com `Mermaid_Chart validate_and_render_mermaid_diagram`. Esperado: renderiza sem erro.
- [ ] **Step 3: Escrever o `mapa-processos.md`.** Ele posiciona os 6 fluxos na Cadeia de Valor (`supabase/referencia/20261115_cadeia-valor.csv`) e no ciclo da Metodologia (itens 4.1 a 5).
- [ ] **Step 4: Commit** `docs(nivel1): mapa de processos e fluxos F-01 a F-06 em Mermaid`

### Tarefa 7: Lacunas entre a norma e o sistema

**Files:**
- Create: `docs/10-nivel1-negocio/lacunas-norma-sistema.md`

**Interfaces:**
- Produces: a tabela `LAC-NN | Dispositivo | O que a norma exige | O que o RADAR faz hoje (arquivo:linha ou "nada") | Severidade (bloqueia homologação / importante / melhoria)`.

- [ ] **Step 1: Registrar no mínimo as lacunas do diagnóstico B3**, confirmadas contra o texto saneado:
  - LAC-01: Plano de Gestão de Riscos único consolidado pela CGOV;
  - LAC-02: aprovação pelo CIG;
  - LAC-03: KRI com fonte, periodicidade, limites e responsável;
  - LAC-04: comunicação tempestiva dos 5 eventos;
  - LAC-05: relatórios periódicos ao CTGRIC/CIG;
  - LAC-06: avaliação de maturidade (item 5).
  
  Acrescentar as lacunas que vierem dos alertas F4/F5 (Tarefa 4) e dos fluxos (Tarefa 6).
- [ ] **Step 2: Criar um cartão no Backlog para cada LAC**, com classe `#normativo`.
- [ ] **Step 3: Commit** `docs(nivel1): lacunas entre a norma saneada e o sistema`

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
  - RN-004: trava de evidência;
  - RN-005: Risco Crítico = residual fora da DAR;
  - RN-006: Teste de Integridade e categoria proibida.
  
  Seguir com alcance, segregação "sobe um nível", exclusão, DAR que reabre aprovados, etc.
- [ ] **Step 2: Para cada RN implementada, apontar a função** (ex.: `calcular_nivel_inerente_q7`, `calculadoraRiscoRadar.ts`) e o teste (ex.: `supabase/tests/000_regressao_calculo.test.sql`). Se não houver implementação, escrever "—" e ligar a uma LAC.
- [ ] **Step 3: Rodar `npx vitest run tests/unit/documentacao.spec.ts`.** Esperado: PASS (IDs únicos, Origem preenchida).
- [ ] **Step 4: Commit** `docs(nivel2): catálogo de regras de negócio`

### Tarefa 10: Catálogo de Requisitos Funcionais (RF)

**Files:**
- Create: `docs/20-nivel2-requisitos/requisitos-funcionais.md`

**Interfaces:**
- Produces: a tabela `ID | Enunciado ("O sistema deve…") | Prioridade (MoSCoW) | RN relacionadas | Origem (F-NN.AA / LAC / decisão) | Situação (implementado / parcial / não iniciado) | Verificação (I/A/D/T)`, agrupada pelos módulos: Acesso, Estrutura, Objetos, Riscos, Fluxo, DAR, Monitoramento/KRI, Plano de Gestão de Riscos, Relato, Auditoria e Importação.

- [ ] **Step 1: Derivar um RF de cada atividade sistêmica dos fluxos F-01 a F-06**, de cada linha "faz" da tabela tela × perfil e de cada LAC. Cada RF deve ser singular, ou seja, um "deve" por linha (29148, §5.2.5).
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
- Consumes: os RF (Tarefa 10), as RN (Tarefa 9) e os fluxos F-NN.AA (Tarefa 6).
- Produces: os IDs abaixo. A lista é preliminar: confirme-a contra os fluxos oficiais e una ou divida casos no Step 1, registrando o motivo no `README.md`.

| UC | Título | Ator principal |
|---|---|---|
| UC-01 | Entrar no RADAR por link de e-mail | Servidor convidado |
| UC-02 | Gerenciar usuários e perfis | CGOV |
| UC-03 | Sincronizar estrutura organizacional e Cadeia de Valor | CGOV (técnico) |
| UC-04 | Cadastrar objeto de gestão de riscos | Gestor de riscos |
| UC-05 | Identificar e registrar risco (com Teste de Integridade) | Gestor de riscos |
| UC-06 | Analisar risco e avaliar controles existentes | Gestor de riscos |
| UC-07 | Definir tratamento e plano de ação | Gestor de riscos |
| UC-08 | Enviar risco para validação | Gestor de riscos |
| UC-09 | Validar risco | Chefia imediata / Coordenador-Geral |
| UC-10 | Homologar risco | Diretor / Presidente |
| UC-11 | Devolver risco para ajuste | Validador ou homologador |
| UC-12 | Elaborar ficha preliminar de risco | CGOV |
| UC-13 | Importar riscos da tabela da skill | Gestor de riscos / CGOV |
| UC-14 | Declarar apetite a riscos por categoria | CGOV (proposta) / CIG (aprovação) |
| UC-15 | Registrar medição de KRI e acompanhar plano de ação | Gestor de riscos |
| UC-16 | Comunicar evento de risco à CGOV | Gestor de riscos |
| UC-17 | Consolidar o Plano de Gestão de Riscos | CGOV |
| UC-18 | Aprovar o Plano de Gestão de Riscos | Comitê Interno de Governança |
| UC-19 | Emitir relatório gerencial de riscos | CGOV |
| UC-20 | Consultar painel e trilha de auditoria | Qualquer perfil com acesso |

- [ ] **Step 1: Escrever os UC a partir do `_modelo.md`**, com as 7 seções obrigatórias. Os passos do fluxo principal usam a forma "ator faz / sistema faz" (Cockburn), e cada passo que aplica uma regra cita o `RN-NNN`. Os fluxos de exceção do UC-08 ao UC-11 incluem obrigatoriamente: titular vago ou unidade sem titular; envio pelo próprio titular (segregação "sobe um nível"); risco reaberto por mudança da DAR sem homologador efetivo; e tentativa de eficácia acima de Fraco sem evidência (UC-06).
- [ ] **Step 2: Marcar com `> Situação: proposto (LAC-NN)`** os UC-16 a UC-19, porque dependem das lacunas.
- [ ] **Step 3: Rodar o teste da documentação.** Esperado: PASS (7 seções em ordem em todos os UC).
- [ ] **Step 4: Commit** `docs(nivel2): casos de uso UC-01 a UC-20`

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

- [ ] **Step 1: Casos de uso.** Um `flowchart LR` com os atores fora de um `subgraph RADAR`, os UC-01 a UC-20 dentro e as setas `-. «include» .->` / `-. «extend» .->`. Um diagrama geral e um por grupo de atores, se passar de 25 nós.
- [ ] **Step 2: Atividades.** Um `flowchart TD` com raias (`subgraph`) para o ciclo F-01 (4.1 a 4.7) e para a consolidação F-03, com decisões em losango (`{}`) e barras de paralelismo como nó `fork`/`join`.
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

- [ ] **Step 1: Mover a pasta e procurar caminhos quebrados.** Rode `grep -rn "04-ux/" --include=*.md --include=*.ts .`. Esperado: nenhum resultado depois de corrigir.
- [ ] **Step 2: Montar o `mapa-telas.md`** com a tabela `Rota | View (.vue) | UC atendidos | Perfis (matriz §7) | Página Figma (Original/Trabalho) | Componentes Code Connect | Situação`. Linhas novas para as telas exigidas pelos UC-16 a UC-19 (Situação "a prototipar").
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
- [ ] **Step 2: Decidir com a CGOV** se a etapa D (homologação CGTI) entra antes ou depois das LAC-01 a LAC-06. Registrar a decisão em ADR.
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

1. **Acesso às fontes da Tarefa 1:** copiar para o repositório ou anexar o computador à sessão (Remote Control).
2. **Onde fica o quadro Kanban:** Markdown no Obsidian (proposto no ADR-0002) ou GitHub Projects com issues. O Markdown mantém tudo no cofre; o GitHub dá automação, mas exige conta e permissões.
3. **Etapa D antes ou depois das lacunas normativas** (Tarefa 19, Step 2).
