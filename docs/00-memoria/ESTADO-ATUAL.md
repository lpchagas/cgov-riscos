# Estado Atual do Projeto — Sistema RADAR (`cgov-riscos`)

> **Última atualização:** 2026-11-15  
> **Fase atual:** Reformulação da UI — Fases 0 a 4 concluídas. Pendente: decisão da CGOV sobre encurtar o Painel no celular (meta de 3.500 px). Branch `feat/reformulacao-ui`.

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
- [x] **Fase 2 — Piloto do Painel** (código pronto; aguardando aprovação da CGOV antes da Fase 3):
  - Protótipo aprovado em canvas (6 versões) → implementado em Vue.
  - Cabeçalho em duas faixas (barra gov.br que some ao rolar + barra do sistema ICMBio | RADAR, busca centralizada, conta com largura fixa de 240 px) e rodapé institucional azul-escuro (CGGE, CGOV, CTGRIC, Painéis Integrados, DIGITECA), no padrão do Painel BI da CGOV.
  - Painel novo: 4 indicadores com links para a lista filtrada; Matriz 5×5 com células-botão (lidas do Quadro 7); "Precisa da sua atenção" por perfil; maiores residuais; distribuição por nível; resumo da DAR; atividade recente. Regras em `src/utils/painelResumo.ts` (funções puras, testadas).
  - Saíram do Painel: carteira completa (→ `/riscos`), simulador da DAR (→ `/dar`), "Enviar para validação" e "Reavaliar controle" (→ painel lateral de `/riscos`).
  - Correções: atalho "Ir para o menu" e "Ir para a busca" no celular; menu lateral não encolhe mais com conteúdo largo.
  - **RADAR-2026-003 corrigido** na semente (P2·I4 → Inerente 14, Residual 8,4 Médio, ainda Crítico pela DAR Baixo) e protegido por `dadosSementeConsistencia.spec.ts`.
  - Resultado: axe-core **0 violações** no Painel (computador, celular e alto contraste) e em `/riscos` com painel lateral; altura do Painel no celular 8.729 → 4.666 px (862 px são do rodapé); cores fixas 234 → 175; 59 testes.
  - **Fluxo híbrido Figma ↔ código:** arquivo Figma "RADAR — Painel" (equipe cgov) com biblioteca publicada de 20 componentes ligados aos `.vue` pelo Code Connect (Vue), variáveis espelhando `tokens.css` e telas em pares Original (travada) × Trabalho. Manual: [[manual-fluxo-figma-vscode]].
  - **Pendências da CGOV:** ~~e-mail de contato~~ (resolvido: planejamento@icmbio.gov.br, na página Sobre); endereços dos "Painéis Integrados" e das redes sociais; arquivos oficiais das marcas gov.br/ICMBio.
- [x] **Fase 3 — Migração das demais páginas** (uma por commit):
  - DAR (prévia do impacto + Desfazer), Aprovações (caixa de entrada), Monitoramento (abas, semáforo pela leitura mais recente), Ficha do risco (abas + `BowTieDiagram`), Novo risco (assistente em 4 etapas com prévia ao vivo), Objetos (tabela + cadastro lateral), Auditoria (linha do tempo + CSV), Importar (colar/enviar → prévia → confirmar).
  - Tema escuro liberado (menu do usuário → Aparência); `compat-legado.css`, `BrCard` e `BrBadge` apagados; ponte das variáveis do gov.br para os tokens.
  - Resultado: axe-core 0 violações em 12 telas × 2 tamanhos × 3 temas; cores fixas 175 → **0**; 98 testes.
  - Figma (2026-11-15): BrTabs, BrStep (passoAtivo 1–4), BrMessage (4 estados) e BowTieDiagram (nível Baixo/Médio/Alto/Extremo) criados na página "Componentes RADAR", com peças internas `_BrTabs · Aba` e `_BrStep · Etapa` (não publicadas). As 8 páginas migradas também estão no Figma em pares 📌 Original (travada) × ✏️ Trabalho, cada uma com quadro de computador (1440) e celular (390). Na biblioteca: BrMessage e PageHeader passaram a quebrar linha e o SegmentedControl ganhou a variante `selecionada=1…4`. Falta: republicar a biblioteca e ligar os 4 componentes novos no Code Connect.
- [x] **Fase 4 — Polimento** ([[design-system]] §9):
  - Varredura com axe-core: 13 telas × 4 larguras (360, 768, 1280, 1920) × 3 temas = 156 combinações, **0 violações** e nenhuma rolagem lateral.
  - `DataTable` em **modo cartão** abaixo de 768 px. Corrige um defeito em 5 páginas: no celular o Residual e o Apetite ficavam escondidos por rolagem interna.
  - Painel no celular: "Mostrar mais" na atenção e 2 eventos recentes. 4.819 → **4.109 px** em 390 px. A meta de 3.500 px exige tirar cartões, e essa decisão é da CGOV.
  - **Rodapé enxuto** (862 → 512 px no celular) e nova página **Sobre o RADAR** (`/sobre`): versão, normas correlatas, fontes de dados, governança e painéis, no layout de relatório do Template V3. Dados em `src/utils/sobreRadar.ts`.
  - Figma: BrFooter da biblioteca no formato enxuto e trocado por instâncias nas 18 Originais; Original do Painel, DAR e Objetos no celular com o modo cartão; novo par Original × Trabalho "Sobre o RADAR". As cópias de Trabalho anteriores ainda têm o rodapé antigo.
  - Aula 4 do caderno: [[04-design-tokens-e-componentes]]. 105 testes.
  - Carregamento/erro: o `Skeleton` entra quando a store passar a usar o Supabase (hoje os dados são síncronos).

