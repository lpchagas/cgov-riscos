# Diagnóstico da documentação do RADAR — base para a reestruturação em 5 níveis

> **Data:** 2026-11-20 · **Branch:** `claude/icmbio-risk-policy-modeling-q840ho` · **Processo SEI:** 02070.001696/2026-31
> **Plano que executa este diagnóstico:** [[2026-11-20-reestruturacao-documentacao-plan]]
> **Escopo:** tudo o que está em `docs/`, `CLAUDE.md`, `AGENTS.md`, `supabase/migrations/` e `tests/`, comparado com a estrutura em 5 níveis pedida pelo responsável pelo projeto.

---

## 0. Limite desta análise (ler antes)

A primeira versão deste diagnóstico foi escrita numa sessão na nuvem, sem acesso às fontes da **quarta rodada de revisão normativa**. Os achados que dependiam delas foram marcados com **⚠ depende da Fase 0**.

**Revisão de 2026-11-20 (sessão local, com a pasta do Drive):** as fontes foram lidas e cada achado marcado foi confrontado com elas. O resultado está na **seção 5** (confirmado / alterado / descartado / novo), e os achados abaixo já trazem a marca **✔ revisado (§5)**. As fontes reais são:

| Fonte | Onde está | O que cobre |
|---|---|---|
| `NT_ESTADO.md` | `trabalho/` | estado da NT e das 5 rodadas de escolhas (fonte principal; em conflito, vale ela) |
| `contexto-revisao-politica-metodologia.md` | Projeto Claude (não está no Drive); conteúdo colado pelo responsável | resumo do `NT_ESTADO.md`, um pouco atrás dele (L-40 e L-41 ainda como abertos) |
| `Modelagem_F4_v2_e_F3_v3_2026-11-20.md` | `trabalho/` | F4 v2 e F3 v3 (TO-BE), alertas F4-10 a F4-18 e F5-11 a F5-17, decisões da 4ª rodada (§11) |
| `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md` | `trabalho/` | F1, F2, F3 da minuta atual; alertas F1-01 a F1-05, F2-01 a F2-05, F4-01 a F4-07; conferência com as regras do RADAR |
| `Saneamento_Legistica_Aprovacao_Plano_DAR_2026-11-20.md` | `trabalho/` | texto limpo da Política (arts. 3º, 9, 12 a 15) e da Metodologia (4.6.1 a 4.6.11, Anexo III) |
| `Saneamento_Legistica_F4-05_a_F4-09_2026-11-20.md` | `trabalho/` | texto limpo **vigente** da Política (art. 3º, art. 15, IX e X, art. 17, IV) e da Metodologia (4.7 a 5) |
| `Saneamento_Legistica_Metodologia_4-7_e_5_2026-11-20.md` | `trabalho/` | texto limpo de 4.7 e 5, **em parte superado** pelo relatório anterior |
| 2 `Auditoria_Competencias_*` | `trabalho/` | conflitos C-01 a C-11, lacunas sistêmicas LS-01 a LS-06, RACI |
| Fluxos (`.mmd`, `.md`, `.png`) | `trabalho/fluxos/` (índice em `_INDICE.md`) | F1 v2, F2, F3 minuta atual, F3 v3 (partes 1 e 2), F4 v2 (partes 1 a 3) |
| Minutas transcritas (SEI 024241420 e 024421455) | `trabalho/` e `docs/01-normativos/` | **idênticas** (conferido com `diff`); versão de 15/09/2026, revisada em 21/10/2026 |

**Atenção:** o "texto saneado" **não é uma minuta consolidada**. São trechos, dispositivo por dispositivo, espalhados em dois relatórios. Além disso, as decisões da 4ª rodada (F4-14, F4-15, F5-11, F5-13 e F5-15) foram tomadas, mas **ainda não foram aplicadas** ao texto limpo (Modelagem F4 v2/F3 v3, §11).

---

## 1. Retrato do que existe hoje

| Pasta | Conteúdo | Nível (alvo) a que corresponde |
|---|---|---|
| `docs/00-memoria/` | `ESTADO-ATUAL.md` (diário de etapas), `MOC-Radar.md` (índice), `GLOSSARIO-ACESSIVEL.md` | transversal |
| `docs/01-normativos/` | 2 minutas transcritas, Decreto 9.203/2017, `matriz-regras-regime-b.md` (Quadros 6, 7 e 8), `matriz-acesso-responsabilidades.md` (árvore de unidades, perfis, RACI, tela × perfil, decisões P1–P8) | Nível 1 (parcial) e Nível 2 (regras, sem IDs) |
| `docs/02-arquitetura-cgti/` | `modelo-dados-mer.md`, 4 arquivos `decisoes-tecnicas-*.md` (R1–R23, D1–D3, B11-1–9, B2-1–9, T1–T11, B3-1–17, C-1–8), guias de Supabase e Docker | Nível 4 (parcial) e Nível 5 (decisões sem formato ADR) |
| `docs/03-caderno-aprendizado/` | Aulas 1 a 6 | transversal (didático) — **manter** |
| `docs/04-ux/` | design system, diagnóstico de UI, manual Figma ↔ VS Code, varredura a11y, ~110 capturas | Nível 3 — **maduro** |
| `docs/superpowers/specs` e `plans/` | 7 designs e 8 planos por etapa (A, B1, B1.1, B2, B3, C, UI, a11y) | histórico de execução |
| `supabase/migrations/` | 12 migrações, 12 tabelas | fonte de verdade do Nível 4 |
| `tests/` e `supabase/tests/` | 48 arquivos Vitest (540 testes), 17 arquivos pgTAP (840 testes), varredura axe-core | evidência de verificação (falta ligar a requisitos) |

O **código está bem à frente da documentação de engenharia**: há regras, RLS, fluxo de 3 degraus e testes, mas os requisitos que eles cumprem nunca foram escritos como requisitos.

---

## 2. Achados, em ordem de prioridade

### A. Memória e base normativa (bloqueiam todo o resto)

| # | Achado | Evidência | Efeito |
|---|---|---|---|
| A1 | **`ESTADO-ATUAL.md` está desatualizado.** Diz que a etapa C "ainda não foi mesclada", mas a `main` contém o merge do PR #8 (`a127b08`). Última atualização: 16/11. Não menciona a revisão normativa (4ª rodada, alertas F4/F5). | linhas 3–4 e 176 | quem abre o cofre parte de um estado falso |
| A2 | **A base normativa do repositório é anterior ao saneamento.** As minutas são de 15/09 (revisadas 21/10). O texto limpo dos arts. 3, 9, 12–15 da Política e dos itens 4.6–5 da Metodologia ainda não entrou. ✔ revisado (§5) | cabeçalho YAML das minutas | regras do código podem estar presas a texto que vai mudar |
| A3 | **Os alertas F4-10 a F4-18 e F5-11 a F5-17 não têm registro no repositório**, nem o seu impacto em tabelas, telas e regras. ✔ revisado (§5) | `grep` sem resultado | decisões normativas sem rastreio até o sistema |
| A4 | **`matriz-regras-regime-b.md` cobre só os Quadros 6, 7 e 8**, embora o MOC diga "Quadros 1 a 8". Faltam Quadros 1–5 (contexto, categorias, subcategorias de integridade, escalas de P e I) e o Anexo III (DAR). | arquivo com 31 linhas | regras de negócio incompletas e índice impreciso |

### B. Nível 1 — Descoberta de produto e processos de negócio

| # | Achado | Efeito |
|---|---|---|
| B1 | **Não há visão de produto** (problema, partes interessadas, objetivos, não-objetivos e métricas de sucesso). O mais próximo é a seção 1–3 do design v2.0 de 09/11, misturada com arquitetura e código. | falta a "âncora" para priorizar o Kanban |
| B2 | **Os fluxos modelados do processo não estão no repositório** (estão só no Drive). O fluxo implementado (rascunho → validação → homologação → aprovado/devolvido) foi derivado da matriz de acesso, não dos fluxos oficiais. ✔ revisado (§5) | risco de o sistema divergir do processo oficial |
| B3 | **Lacunas entre a Metodologia (4.6 a 5) e o sistema**, já visíveis na minuta atual: (i) o sistema aprova **risco a risco**, mas a Metodologia 4.6 prevê a CGOV consolidar os riscos críticos em um **Plano de Gestão de Riscos único** submetido ao **Comitê Interno de Governança**; não há entidade "Plano de Gestão de Riscos" nem "ciclo"; (ii) 4.7.1 exige no KRI **fonte dos dados, periodicidade, limites de alerta e responsável**; (iii) 4.7.2 exige **comunicação tempestiva à CGOV** de 5 tipos de evento e **relatórios periódicos** ao CTGRIC e ao CIG; (iv) o item 5 prevê **avaliação de maturidade** periódica. Nenhum desses tem tela, tabela ou teste. ✔ revisado (§5): parte deste achado foi alterada | escopo funcional do próximo ciclo |

### C. Nível 2 — Engenharia de requisitos

| # | Achado | Efeito |
|---|---|---|
| C1 | **Não existe Especificação de Requisitos (ERS).** Os requisitos estão espalhados em 6 lugares: `AGENTS.md` (regras invioláveis), `matriz-regras-regime-b.md`, `matriz-acesso-responsabilidades.md` (RACI e tela × perfil), design v2.0 (§3), os 4 `decisoes-tecnicas-*` e os próprios testes. | impossível dizer "o que falta" |
| C2 | **Não há identificadores** (RF-, RNF-, RN-, UC-) nem **matriz de rastreabilidade** norma → regra → requisito → caso de uso → tela/tabela → teste (exigência central da ISO/IEC/IEEE 29148, §5.2.8 e §6.6, e da área de Requisitos do SWEBOK v4). | auditoria da CGTI sem fio condutor |
| C3 | **Requisitos não funcionais existem de fato, mas não estão escritos como RNF**: WCAG 2.2 AA (0 violações axe), alvo de toque de 44 px, RLS por alcance, `service_role` só no servidor, LGPD (`_temp/`, nada pessoal no Git), paginação de 1.000 linhas, Docker para a CGTI. Nenhum está organizado pelas **9 características da ISO/IEC 25010:2023**. | qualidade verificada sem critério declarado |
| C4 | **Não há casos de uso.** Os "fluxos" estão em prosa no design (§6.4) e na matriz de acesso. | o fluxo alternativo/de exceção (o mais valioso segundo Cockburn) está só no código e nos testes pgTAP |
| C5 | **Pendências de negócio dispersas** em 5 arquivos (cargo vago trava o fluxo; formulário edita só o 1º controle/ação/KRI; criticidade em `acoes_no_fluxo` pode divergir após mudança da DAR; meta de 3.500 px; lacunas do SharePoint). | backlog invisível |

### D. Nível 3 — Interface (UI/UX)

| # | Achado | Efeito |
|---|---|---|
| D1 | **Nível mais maduro**: design system em 3 camadas de tokens, biblioteca Figma com Code Connect, pares Original × Trabalho, varredura axe-core automatizada. | manter e só reorganizar |
| D2 | Organizado **por fase histórica** (Fase 0 a 4, B3, C), não por tela/caso de uso. Não há mapa "tela ↔ caso de uso ↔ quadro Figma". | difícil saber que tela atende a que requisito |
| D3 | Pendências do Figma (republicar biblioteca, Code Connect de 4 componentes, variante `compacto`, quadros de computador) estão só no `ESTADO-ATUAL`. | viram cartões do Kanban |

### E. Nível 4 — Modelagem de dados

| # | Achado | Efeito |
|---|---|---|
| E1 | `modelo-dados-mer.md` chama de "MER" um **diagrama lógico simplificado**: 9 entidades, **sem atributos, sem PK/FK, sem cardinalidade mínima explícita** e **sem** `perfis_usuarios`, `processos_cadeia_valor` e `auditoria_log` (o texto diz 11 + 1 tabelas). Não há separação entre MER (conceitual) e DER (lógico). | modelo não serve para auditoria |
| E2 | **Não há análise de normalização.** Pontos já visíveis nas migrações: | decisões de desnormalização sem justificativa registrada |
| | • **1FN:** `categorias_risco.subcategorias_permitidas` é `JSONB` (lista multivalorada); `objetos_contexto.insumos_principais`, `entregas_principais` e `partes_interessadas` são texto livre com listas. | |
| | • **2FN:** sem violações aparentes (todas as PKs são simples — UUID/SERIAL); a análise precisa confirmar as chaves candidatas naturais (`codigo_radar`, `email`). | |
| | • **3FN:** em `riscos`, `fator_controle` depende de `nivel_eficacia_controle`; `classificacao_*` depende de `nivel_*`; `nivel_inerente` depende de (`probabilidade`, `impacto`); `is_critico` e `status_critico` dependem de `classificacao_residual` + apetite da categoria (e são **redundantes entre si**). Em `objetos_contexto`, `macroprocesso_supervisor_id` depende do processo e `diretoria_id` da árvore de unidades. Em `riscos`, `possui_evidencia_controle` repete a evidência que já está em `controles_existentes`. | |
| | Parte disso é **desnormalização deliberada** (cálculo gravado pelo gatilho para auditoria do valor histórico) e deve virar ADR; parte é **dívida** (`responsavel_risco_nome` texto livre em vez de FK para pessoa/perfil; `is_critico` × `status_critico`). | |
| E3 | **Não há dicionário de dados** (domínios dos `CHECK`, significado de cada estado de `status_fluxo`, unidades e regras de preenchimento). | |

### F. Nível 5 — Software e arquitetura

| # | Achado | Efeito |
|---|---|---|
| F1 | **Não há nenhum diagrama UML.** O fluxo de aprovação é uma **máquina de estados** real (`status_fluxo` com 6 estados + reaberturas `reaberto_mudanca_dar` etc.) descrita só em prosa e SQL. | o artefato UML mais útil do projeto não existe |
| F2 | **Há ~70 decisões registradas, mas nenhuma em formato ADR.** Estão em 4 arquivos por etapa, com séries de numeração diferentes (R, D, B11, B2, T, B3, C), misturadas com pendências, e algumas foram alteradas depois (ex.: regra de commit único revogada em 15/11) sem marca de "substituída". | memória de decisão difícil de auditar; nada é imutável |
| F3 | O MOC lista specs/plans do `superpowers` como documentos de arquitetura; o design v2.0 contém código e decisões já superadas (perfis simulados, 4 papéis). | documento "vivo" e histórico misturados |

### G. Gestão do trabalho (Kanban)

| # | Achado | Efeito |
|---|---|---|
| G1 | O projeto anda por **etapas lineares** (A, B1, B1.1, B2, B3, C, D) com um plano grande por etapa. Não há quadro, limite de WIP, política de entrada/saída, nem lista única de pendências. | a mudança para Kanban pede um quadro e políticas explícitas |
| G2 | Próxima etapa prevista (D — homologação na CGTI) **não deve começar** antes de a base normativa saneada ser confrontada com o sistema (A2, B3). | reordenar prioridades |

### H. Conformidade com as regras invioláveis (`AGENTS.md`)

- Sigla "PGR": só aparece **dentro das próprias regras que a proíbem**. ✔
- "Operacional com interface de Integridade": só em testes e no plano que **rejeitam** a categoria. ✔
- "Crítico" × "Extremo": uso correto nos documentos lidos. ✔
- Recomendação: transformar essas verificações em **teste automatizado da documentação** (Tarefa 2 do plano), para que valham também para os novos documentos.

---

## 3. Estrutura-alvo da documentação

```
docs/
├── 00-memoria/            ESTADO-ATUAL, MOC, glossário (atualizados)
├── 01-normativos/         minutas saneadas, matriz de regras (Quadros 1–8 + Anexo III),
│   └── revisao-2026/      fontes da 4ª rodada + registro dos alertas F4/F5
├── 10-nivel1-negocio/     visão de produto, mapa de processos, fluxos (Mermaid), lacunas norma × sistema
├── 20-nivel2-requisitos/  ERS (29148), RN, RF, RNF (25010:2023), casos de uso, rastreabilidade
├── 30-nivel3-interface/   (conteúdo atual de 04-ux) + mapa tela ↔ caso de uso ↔ Figma
├── 40-nivel4-dados/       MER conceitual, DER pé-de-galinha, normalização, dicionário de dados
├── 50-nivel5-software/    UML: casos de uso, atividades, classes, sequência, estados
├── adr/                   0000-modelo.md, 0001-..., README (índice)
├── 90-kanban/             quadro, políticas, DoR/DoD, métricas de fluxo
├── 02-arquitetura-cgti/   guias operacionais (Supabase, Docker) + decisoes-tecnicas-* (congelados, apontando para os ADRs)
├── 03-caderno-aprendizado/ (sem mudança)
└── superpowers/           specs e planos (histórico de execução)
```

Notação: **Mermaid** para todos os diagramas (fluxos, ER pé-de-galinha, UML). Mermaid não tem diagrama de casos de uso nativo; ele será desenhado com `flowchart` (ator = nó, fronteira do sistema = `subgraph`, «include»/«extend» como rótulo de seta) — essa escolha vira ADR. **Sem Modelo C4.**

---

## 4. Ordem de execução recomendada (e por quê)

1. **Fase 0 — Fundação:** trazer as fontes, corrigir o `ESTADO-ATUAL`, criar a estrutura, o teste da documentação, o ADR-0001 e o quadro Kanban. *Sem as fontes, os Níveis 1 e 2 seriam escritos sobre texto que já mudou.*
2. **Fase 1 — Nível 1:** normativo saneado → alertas F4/F5 → visão de produto → fluxos → lacunas norma × sistema.
3. **Fase 2 — Nível 2:** RN → RF → RNF → casos de uso → rastreabilidade. *RN antes de RF porque as regras vêm direto da norma; RF referenciam RN; UC referenciam RF.*
4. **Fase 3 — Nível 4 (dados):** MER → DER → normalização → dicionário. *Antes da UI, porque as lacunas do B3 (Plano de Gestão de Riscos, ciclo, KRI completo) mudam o modelo.*
5. **Fase 4 — Nível 5:** ADRs retroativos → 5 diagramas UML.
6. **Fase 5 — Nível 3:** reorganizar UX e mapear telas ↔ UC ↔ Figma; cartões de protótipo para as lacunas.
7. **Fase 6 — Fechamento:** análise de lacunas código × requisitos → backlog do Kanban para retomar a implementação; MOC e `ESTADO-ATUAL` finais.

O Nível 3 vai depois do 4 e do 5 de propósito: a interface já existe e está boa; o que falta é saber **quais telas novas** as lacunas normativas exigem, e isso só sai dos níveis 1, 2 e 4.
