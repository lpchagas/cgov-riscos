# Plano de Reformulação da Interface — Sistema RADAR (`cgov-riscos`)

## Contexto

A interface atual funciona, mas é difícil de usar:
- **Sem sistema visual:** ~165 atributos `style=` com hex fixos (`#1351b4`, `#071d41`…) espalhados em 9 views e 13 componentes; não há tokens, espaçamento consistente nem modo escuro.
- **Excesso de informação por tela:** o Painel (`PainelConsolidadoCgovView.vue`, 377 linhas) empilha KPIs, Matriz, simulador da DAR **e** a carteira inteira, com memória de cálculo e KRIs dentro de cada card de risco.
- **Arquitetura de informação confusa:** não existe uma página "Riscos" (lista); o menu leva a "Ficha Bow Tie" do *primeiro* risco; os títulos são longos e cheios de referências normativas ("Caixa de Validação e Homologação em 1 Clique", "Quadro 7 — SEI 024421455").
- **Pouco padrão de interação moderno:** formulários longos sem validação em linha, tabelas sem ordenação/paginação, nenhum estado vazio, de carregamento ou de erro.

**Decisões já tomadas com você:**
1. Base visual = **Gov.br DS modernizado**: `@govbr-ds/core` continua sendo a identidade (cores, fonte Rawline, header/footer, alto contraste), com padrões modernos inspirados em Material 3 e Ant Design (tokens, app shell, data tables, drawers, densidade).
2. Entrega em fases = **Fundação + piloto (Painel) primeiro**, com aprovação antes de migrar as outras 8 páginas.

**Regras invioláveis preservadas (AGENTS.md):** nada muda em `src/utils/calculadoraRiscoRadar.ts`, nas stores ou nas migrations. A UI só **exibe** os valores. A nomenclatura continua igual: "Plano de Gestão de Riscos" por extenso, nunca "PGR"; Baixo/Médio/Alto/Extremo; "Crítico" = fora da DAR. Todo código novo leva comentários didáticos em pt-BR.

---

## Skills que vou usar em cada etapa

| Etapa | Skill | Para quê |
|---|---|---|
| Diagnóstico | `design:design-critique` | Crítica heurística (Nielsen + hierarquia visual) de cada página atual |
| Diagnóstico | `design:accessibility-review` | Auditoria WCAG 2.2 AA / eMAG (contraste, foco, teclado, ARIA) |
| Diagnóstico | `design:ux-copy` | Reescrita de títulos, rótulos e microcopy em linguagem simples |
| Fundação | `design:design-system` | Tokens, escalas e inventário de componentes |
| Piloto | `artifact-design` + Artifact | Mockup navegável do Painel para você aprovar antes do código |
| Domínio | `cgov-escritorio:cgov-gestao-riscos` | Checar que rótulos e fluxos respeitam o Regime B |
| Execução | `superpowers:writing-plans` → `superpowers:executing-plans` | Plano detalhado por tarefa e execução com checkpoints |
| Qualidade | `superpowers:verification-before-completion`, `code-review` | Verificar build, testes e regressões antes de cada entrega |

---

## Fase 0 — Diagnóstico (só leitura, ~1 sessão)

Entregável: `docs/04-ux/diagnostico-ui-2026-11.md` no cofre Obsidian.
- Uma ficha por página: objetivo, perfil de usuário (1ª Linha, CGOV, CG, Diretoria), tarefas principais, problemas com severidade de 0 a 4 e capturas de tela (via skill `run`).
- Relatório de acessibilidade com cada achado ligado a um critério WCAG.
- Glossário de microcopy (rótulo atual → rótulo proposto); a referência normativa fica num tooltip "ⓘ Fundamento", fora do título.

## Fase 1 — Fundação (design system + app shell)

### 1.1 Tokens de design — `src/styles/tokens.css` (novo)
Camadas no estilo M3, mapeadas sobre as variáveis do gov.br:
- **Referência:** paleta gov.br (`--blue-warm-vivid-70` etc.).
- **Semânticos:** `--surface`, `--surface-container`, `--on-surface`, `--primary`, `--outline`, `--success/warning/danger`.
- **Domínio RADAR:** `--risco-baixo|medio|alto|extremo` (fundo, texto, borda), migrados de `src/assets/main.css`.
- Escalas de espaçamento (4/8/12/16/24/32), raio (4/8/12/16), elevação (0–3), tipografia (display/título/corpo/rótulo).
- Temas: claro, escuro (`prefers-color-scheme` + `[data-theme]`) e o alto contraste gov.br reescrito sobre tokens, em vez dos `!important` atuais.
- Densidade: `[data-density="compact"]` para tabelas (padrão Ant Design).

### 1.2 Reorganização de componentes
- `src/components/govbr/` → mantidos como **wrappers finos** do DS oficial (Header, Footer, Skiplink, Breadcrumb, Message, Button). O CSS inline sai e passa a usar tokens.
- `src/components/ui/` (novo): primitivos modernos que faltam:
  - `AppShell.vue`: header gov.br compacto, **navigation rail** recolhível (ícone + rótulo; vira drawer no celular) e área de conteúdo com largura máxima.
  - `PageHeader.vue`: título curto, descrição de uma linha, ações primárias à direita e tooltip de fundamento normativo.
  - `StatCard.vue`: KPI com valor, variação e link de drill-down.
  - `DataTable.vue`: ordenação, busca, filtros em chips, paginação, seleção, densidade e estado vazio.
  - `SideSheet.vue` (drawer lateral): detalhe rápido sem sair da lista.
  - `Dialog.vue`, `Toast.vue`, `EmptyState.vue`, `Skeleton.vue`.
  - `FormField.vue`: rótulo, ajuda, erro em linha e `aria-describedby`.
  - `SegmentedControl.vue`, `Chip.vue`, `RiskBadge.vue` (substitui `BrBadge`, com ícone + texto, não só cor).
- `src/components/radar/` continua com a parte de domínio: `MatrizCalorAssimetrica`, `MemoriaCalculoBar` (reestilizados) e o novo `BowTieDiagram.vue` extraído da Ficha.

### 1.3 Nova arquitetura de informação (rotas)
Navigation rail com 3 grupos (as 3 Linhas), nomes curtos:

| Grupo | Item | Rota | Origem |
|---|---|---|---|
| Visão geral | **Painel** | `/` | Painel (só síntese) |
| | **Apetite (DAR)** | `/dar` | DeclaracaoApetiteDar + simulador que hoje está no Painel |
| Gestão | **Riscos** *(nova lista)* | `/riscos` | carteira hoje embutida no Painel |
| | Ficha do risco | `/riscos/:id` | FichaDetalheBowTie (abas: Resumo, Bow Tie, Controles, KRIs, Histórico) |
| | Novo risco | `/riscos/novo` | FormularioRisco (stepper) |
| | **Objetos** | `/objetos` | CatalogoObjetos |
| | **Monitoramento** | `/monitoramento` | KRIs + 5W2H |
| Deliberação | **Aprovações** | `/aprovacoes` | CaixaValidacaoUmClique (com badge de pendências) |
| | **Auditoria** | `/auditoria` | TrilhaAuditoria |
| Ferramentas | Importar da skill | `/importar` | ImportadorSkill |

As rotas antigas ganham `redirect` para não quebrar links. Em `src/router/index.ts`, `meta` passa a ter `titulo`, `grupo`, `icone` e `fundamento` (referência normativa).

### 1.4 Limpeza
- `src/assets/main.css` fica só com imports + tokens. As classes `.radar-grid-*` viram utilitários de layout com tokens.
- Regra de lint (stylelint ou checagem simples em teste) proibindo hex dentro de `style=` nas views.

## Fase 2 — Piloto: Painel (`/`) — ponto de aprovação

1. **Mockup primeiro:** Artifact HTML navegável do novo Painel, em tema claro e escuro, para você aprovar o visual.
2. **Novo layout:**
   - Linha de 4 `StatCard`s (Total, Críticos fora da DAR, Aguardando CG, Aguardando Diretoria), cada um com link para a lista já filtrada.
   - Grade 2 colunas: **Matriz 5×5** (células maiores, legenda Baixo/Médio/Alto/Extremo, contagem por célula; o clique leva a `/riscos?p=&i=`) e **"Precisa da sua atenção"** (KRIs em alerta + itens pendentes para o perfil logado).
   - "Top 5 riscos residuais" num `DataTable` compacto; a carteira completa sai do Painel e vai para `/riscos`.
   - O simulador da DAR sai do Painel e vai para `/dar`.
3. Reaproveitar sem mudança: `riscosStore.riscosCriticosCarteira`, `filaValidacaoCg`, `filaHomologacaoDiretoria`, `alternarFiltroCelulaMatriz`, `authStore.isCgov`.

**⏸ Checkpoint: você aprova o piloto antes da Fase 3.**

## Fase 3 — Migração das demais páginas (uma por PR/commit)

| Página | Padrão moderno aplicado |
|---|---|
| **Riscos** (nova) | `DataTable` (código, objeto, categoria, inerente, residual com `RiskBadge`, status, responsável); filtros em chips sincronizados com a URL; linha abre `SideSheet` com resumo + `MemoriaCalculoBar`; ação "Abrir ficha" |
| **Ficha do risco** | Cabeçalho com código, badges e ações; **abas**; Bow Tie como diagrama responsivo (colunas no desktop, sanfona no celular) |
| **Novo risco** | Stepper horizontal com 4 etapas (Contexto → Identificação → Análise → Tratamento); validação por etapa; painel lateral fixo com **prévia ao vivo** do cálculo (inerente → fator → residual); a trava de evidência aparece como mensagem em linha; rascunho salvo |
| **Apetite (DAR)** | Tabela das 8 categorias com `SegmentedControl` (Baixo/Moderado/Pendente); prévia de impacto ("+3 riscos passam a Críticos") antes de confirmar em `Dialog`; card Integra+ recolhível |
| **Objetos** | Lista em cards/tabela + criação em `SideSheet` (não mais formulário fixo no topo) |
| **Monitoramento** | Abas KRIs / Planos 5W2H; semáforo com ícone + texto; registrar leitura em `Dialog`; 5W2H em tabela com progresso e prazo |
| **Aprovações** | Padrão "inbox": lista à esquerda, detalhe à direita; aprovar/devolver com atalho de teclado, confirmação e `Toast` com "Desfazer" |
| **Auditoria** | Timeline vertical com filtros (período, perfil, tipo de evento) e exportação CSV |
| **Importar** | Área de colar/soltar arquivo → prévia em tabela com erros por linha → confirmar |

## Fase 4 — Polimento e documentação
- Estados de carregamento (skeleton), vazio e erro em todas as páginas.
- Responsividade testada em 360, 768, 1280 e 1920 px.
- Nova auditoria de acessibilidade (meta: zero falhas AA).
- Atualizar `docs/00-memoria/ESTADO-ATUAL.md`, `MOC-Radar.md` e um caderno de aprendizado `docs/03-caderno-aprendizado/design-tokens-e-componentes.md` explicando tokens e componentes de forma didática.

---

## Arquivos críticos
- **Alterar:** `src/App.vue`, `src/router/index.ts`, `src/assets/main.css`, `src/components/govbr/*`, `src/components/radar/*`, as 9 views em `src/views/`.
- **Criar:** `src/styles/tokens.css`, `src/components/ui/*`, `src/views/RiscosListaView.vue`, `src/components/radar/BowTieDiagram.vue`, `docs/04-ux/*`.
- **Não tocar:** `src/utils/calculadoraRiscoRadar.ts`, `src/stores/*` (no máximo getters novos de leitura), `supabase/migrations/*`.

## Verificação
- `npm test`: os testes do motor de cálculo em `tests/unit` continuam passando, mais testes novos de componente (`@vue/test-utils`) para `DataTable`, `RiskBadge`, `FormField` e o stepper.
- `npm run build` sem erros de `vue-tsc`.
- `npm run dev` + skill `run`: capturas de antes e depois de cada página, nos temas claro, escuro e alto contraste.
- Checagem manual dos casos do Anexo II: `P=1,I=5 → 15`; residual `10,2` exibido como **Alto**; controle sem evidência limitado a **Fraco**.
- Navegação só por teclado em todas as páginas; checagem de contraste nos tokens.
