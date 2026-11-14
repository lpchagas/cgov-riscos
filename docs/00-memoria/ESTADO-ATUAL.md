# Estado Atual do Projeto — Sistema RADAR (`cgov-riscos`)

> **Última atualização:** 2026-11-14  
> **Fase atual:** Reformulação da UI — Fases 0 (diagnóstico) e 1 (fundação) concluídas; próxima: Fase 2 (piloto do Painel). Branch `feat/reformulacao-ui`.

## Concluído
- [x] Análise comparativa dos repositórios legados (`v1.1`, `v1.2` e `v2.1`).
- [x] Leitura das Minutas de Portaria (`Política SEI 024241420` e `Metodologia SEI 024421455`) e da skill `cgov-gestao-riscos-v4`.
- [x] Documento de Design e Arquitetura v2.0 aprovado e salvo no cofre Obsidian.
- [x] Plano de Implementação detalhado em 8 Tarefas elaborado e executado.
- [x] **Task 1:** Estrutura base do repositório, Vite/Vue 3/TypeScript e Segundo Cérebro no Obsidian (`CLAUDE.md`, `AGENTS.md`, `docs/`).
- [x] **Task 2:** Motor Matemático RADAR (`calculadoraRiscoRadar.ts`) com Matriz Assimétrica (Quadro 7), Trava de Evidência (Quadro 6), Faixas sem arredondamento prévio (Quadro 8), DAR e Teste de Integridade (Integra+).
- [x] **Task 3:** Importador de Tabelas Markdown da skill `cgov-gestao-riscos-v4` (`importadorSkillMarkdown.ts`).
- [x] **Task 4:** Migrations SQL para PostgreSQL/Supabase (`20261109001_schema_radar.sql`, `20261109002_rls_policies.sql`, `seed.sql`) e Dados Semente com Caso de Controle do Anexo II.
- [x] **Task 5:** Identidade Visual `@govbr-ds/core` e Simulador de Perfis de Governança (`authStore.ts`).
- [x] **Task 6:** Store de Riscos (`riscosStore.ts`), Fluxo de Aprovação em 1 Clique (3 degraus) e Matriz de Calor Assimétrica.
- [x] **Task 7:** Quatro telas principais (`PainelConsolidadoCgovView`, `FormularioRiscoView`, `ImportadorSkillView`, `CaixaValidacaoUmCliqueView`) e roteamento Vue Router.
- [x] **Task 8:** Empacotamento Docker (`Dockerfile` multi-stage, `docker-compose.yml`, `nginx.conf`), `vercel.json` e Dossiê técnico para a CGTI/ICMBio.
- [x] **Task 9 (Template Base Gov.br DS & Novas Páginas):**
  - Anatomia completa de `gov.br/ds/templates/base` em `App.vue` (`div.template-base`, `BrSkiplink.vue`, `BrHeader.vue` com busca global e alto contraste, `BrMenu.vue` hierárquico em pastas das 3 Linhas, `BrBreadcrumb.vue`, `BrFooter.vue`).
  - Componentes de alta densidade visual (`BrStep.vue`, `BrTabs.vue`, `BrMessage.vue`) e filtro interativo por célula na `MatrizCalorAssimetrica.vue`.
  - Cinco novas páginas especializadas integradas ao roteador:
    1. `DeclaracaoApetiteDarView.vue` (`/dar-apetite`) — Simulador e governança do Anexo III e Quadro 3 (Integra+).
    2. `CatalogoObjetosView.vue` (`/objetos`) — Catálogo de Objetos e Cadeia de Valor (Quadro 1).
    3. `FichaDetalheBowTieView.vue` (`/riscos/:id`) — Diagrama Visual Bow Tie (5 colunas) e dossiê executivo.
    4. `MonitoramentoKriPlanoAcaoView.vue` (`/monitoramento-kris`) — Sala de Situação de KRIs e Planos 5W2H.
    5. `TrilhaAuditoriaGovernancaView.vue` (`/auditoria`) — Trilha cronológica de auditoria das 3 Linhas.

## Reformulação da Interface (iniciada em 2026-11-14)
Plano: [[2026-11-14-reformulacao-ui-radar-plan]] · Diagnóstico: [[diagnostico-ui-2026-11]] · Referência: [[design-system]]

- [x] **Fase 0 — Diagnóstico:** crítica heurística, auditoria WCAG 2.2 AA (axe-core: 171 ocorrências) e glossário de microcopy. Causa nº 1: 26 classes do Bootstrap inexistentes no gov.br DS.
- [x] **Fase 1 — Fundação:**
  - Tokens em 3 camadas (`src/styles/tokens.css`): claro, alto contraste e escuro (escuro ainda bloqueado).
  - App shell novo: cabeçalho de 64 px, navigation rail recolhível/gaveta no celular, trilha só com páginas reais, `<h1>` automático por rota.
  - 12 componentes em `src/components/ui/` (PageHeader, StatCard, DataTable, SideSheet, Dialog, Toast, FormField, SegmentedControl, Chip, RiskBadge, EmptyState, Skeleton).
  - Nova página **Riscos** (`/riscos`) com filtros na URL e painel lateral; rotas curtas com redirecionamento das antigas.
  - Camada temporária `compat-legado.css` (apagar no fim da Fase 3) + testes de higiene de CSS.
  - Resultado: violações axe 171 → 87; rolagem lateral 9 → 0 páginas; `<h1>` 0 → 10 páginas.
- [ ] **Fase 2 — Piloto do Painel** (mockup para aprovação antes do código).
- [ ] **Fase 3 — Migração das demais páginas** (uma por commit; liberar tema escuro e apagar `compat-legado.css` ao final).
- [ ] **Fase 4 — Polimento** (meta: 0 violações axe; Painel no celular < 3.500 px).

