---
tipo: diagnostico
fase: "Fase 0 — Reformulação da UI"
data: 2026-11-14
plano: "[[2026-11-14-reformulacao-ui-radar-plan]]"
tags: [ux, acessibilidade, govbr-ds, radar]
---

# Diagnóstico da Interface do Sistema RADAR (novembro/2026)

> **Para que serve este documento?** É o "raio-x" da interface **antes** da reformulação.
> Ele registra o que está ruim, **por que** está ruim e o que cada achado muda no plano.
> Quando a reformulação terminar, as mesmas medições serão repetidas para comparar.

**Método usado**
1. Leitura do código das 9 páginas (`src/views/`) e dos 13 componentes (`src/components/`).
2. Capturas de tela automáticas (Playwright) em computador (1440 px) e celular (390 px), salvas em [`capturas/antes/`](capturas/antes/).
3. Varredura automática de acessibilidade com **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, níveis A e AA) nas 9 rotas.
4. Teste de navegação por teclado (Tab) e medição de áreas de clique.
5. Crítica heurística (10 heurísticas de Nielsen + hierarquia visual) com severidade de **0 a 4**:
   `4 = catástrofe (impede a tarefa)`, `3 = grave`, `2 = moderado`, `1 = cosmético`.

---

## 1. Resumo executivo: as 5 causas da "UI ruim"

| # | Causa-raiz | Evidência | Severidade |
|---|---|---|---|
| 1 | **O código usa classes CSS do Bootstrap que não existem no gov.br DS** | 26 classes "fantasma": `font-weight-bold`, `text-muted`, `rounded`, `border`, `w-100`, `gap-2`, `table`, `table-responsive`, `table-bordered`, `rounded-pill`, `space-y-3`, `text-decoration-none`… | **4** |
| 2 | **A página transborda para os lados** em todas as telas, inclusive no computador | Rolagem horizontal nas 9 rotas (1440 px e 390 px); no celular o Painel fica com **1.365 px** de largura | **4** |
| 3 | **Cada tela tenta mostrar tudo de uma vez** | Painel no celular: **17.564 px** de altura (≈ 21 telas); no computador: 4.306 px e ~1.200 palavras | **3** |
| 4 | **Linguagem de norma em vez de linguagem de tarefa** | Títulos como "2º Degrau: Validação em 1 Clique — Coordenações-Gerais Supervisoras de Macroprocessos"; o código interno `em_validacao_cg` aparece para o usuário | **3** |
| 5 | **Nenhum sistema visual (tokens)** | ~165 atributos `style=` com cores fixas; 26 só no Painel; cards, badges e tabelas desenhados "à mão" em cada página | **3** |

> 💡 **Explicação didática da causa nº 1.** O `@govbr-ds/core` **não é** o Bootstrap. Ele tem utilitários
> parecidos (`d-flex`, `mb-3`, `p-2` funcionam), mas outros mudam de nome:
>
> | Escrito no código (Bootstrap) | Nome correto no gov.br DS | Efeito hoje |
> |---|---|---|
> | `font-weight-bold` | `text-weight-bold` | o texto **não** fica em negrito |
> | `rounded`, `rounded-pill` | `rounder-md`, `rounder-pill` | sem cantos arredondados |
> | `w-100` | — (não existe) | campos de formulário estreitos, com o texto cortado |
> | `gap-2` | — (não existe) | botões e etiquetas grudados uns nos outros |
> | `table-responsive` | — (o gov.br usa o componente `br-table`) | tabelas estouram a largura da tela |
> | `text-muted` | — (usar token de cor de texto secundário) | o texto "secundário" fica com a mesma cor do principal |
>
> Por isso a tela "parece ruim" mesmo sem nenhum erro no console: **o navegador simplesmente ignora as classes que não conhece.**
> A Fase 1 resolve isso na raiz, com tokens próprios e componentes que não dependem dessas classes.

---

## 2. Achados transversais (valem para todas as páginas)

### 2.1 Estrutura e navegação

| Achado | Heurística / WCAG | Sev. | Recomendação |
|---|---|---|---|
| Nenhuma página tem `<h1>`. Os títulos de card são `<h3>`, e não há `<h2>` | WCAG 1.3.1, 2.4.6 | 3 | `PageHeader` com um único `<h1>` por página; seções com `<h2>` |
| O cabeçalho ocupa **~185 px** (gov.br + título em CAIXA ALTA + subtítulo com nº SEI) antes de qualquer conteúdo | Estética e design minimalista | 2 | Cabeçalho compacto de 64 px; nome "RADAR" + seletor de perfil no menu do usuário |
| No celular, o menu lateral **abre por cima do conteúdo** ao carregar (`menuAberto = true`) | Controle do usuário | 3 | Menu fechado por padrão abaixo de 992 px; usar navigation rail/drawer |
| O item de menu "Ficha Visual Bow Tie" sempre abre **o primeiro risco** da lista | Correspondência com o mundo real | 3 | Criar a página **Riscos** (lista); a ficha é aberta a partir dela |
| A trilha de navegação (breadcrumb) repete "1. Governança & Estratégia (2ª Linha)", que não é uma página real | Consistência | 1 | Breadcrumb só com páginas reais: Início › Riscos › RADAR-2026-001 |
| Elementos de desenvolvimento visíveis em produção: "Modo CGTI (Seed Oficial Anexo II)", "Navegação por Etapas (`.br-step`)", "Regras Invioláveis Ativas" no rodapé do menu | Estética e design minimalista | 2 | Mover para um "modo desenvolvedor" ou remover |
| O seletor de perfil ("Papel") ocupa espaço nobre no cabeçalho e fica **antes** do menu na ordem do Tab | WCAG 2.4.3 | 2 | Levar para o menu do usuário (avatar) |

### 2.2 Hierarquia visual

- **Títulos de card em CAIXA ALTA e enormes**, enquanto o dado (o número do KPI) é pequeno e fica no fim do card. Nos 4 KPIs do Painel, o olho lê "TOTAL NO PLANO DE GESTÃO DE RISCOS" antes do número **3**. O correto é o inverso: número grande, rótulo curto e discreto.
- **Tudo tem o mesmo peso:** o botão "Aprovar" (verde, grande) e o "Solicitar Ajuste" (vermelho, grande) competem lado a lado. A ação destrutiva/secundária deve ser menos chamativa.
- **Excesso de faixas coloridas:** toda caixa tem uma borda superior ou lateral colorida (`destaque-cor`). Quando tudo é destacado, nada é.
- **Texto corrido muito longo** dentro de cards (descrição padronizada com 60–80 palavras) sem truncamento nem "ver mais".

### 2.3 Consistência

| Elemento | Problema | Recomendação |
|---|---|---|
| Cores | Mesmo papel com cores diferentes: "Médio" é `#8a6d00` no badge e `#7a5c00` na matriz; "Extremo" é `#e52207` e `#c91c00` | Tokens `--risco-*` únicos |
| Botões-link | "Abrir Ficha Bow Tie", "Abrir Dossiê Bow Tie", "← Voltar ao Painel" e "+ Mapear Risco" têm 4 estilos diferentes | `BrButton` / `RouterLink` com as mesmas variantes |
| Formulários | Campos com `<label>` solto, sem `for`/`id`; alguns usam `placeholder` como rótulo | Componente `FormField` |
| Nome do mesmo objeto | "Ficha", "Dossiê", "Ficha Executiva", "Ficha de Risco" | Usar só **Ficha do risco** |
| Ação de aprovar | "Validar em 1 Clique", "Aprovar em 1 Clique", "Homologar em 1 Clique" | **Validar** (CG) e **Homologar** (Diretoria), sempre |

---

## 3. Acessibilidade (WCAG 2.2 AA)

**Resultado automático (axe-core):** 4 tipos de violação, **171 ocorrências**, presentes em todas as 9 páginas.

| # | Problema | Critério WCAG | Sev. | Ocorrências | Recomendação |
|---|---|---|---|---|---|
| A1 | Campos `<select>` sem nome acessível (DAR, Painel, Novo risco) | 4.1.2 Nome, função, valor | 🔴 Crítico | 25 | `FormField` com `<label for>`; nas tabelas, `aria-label` com o nome da categoria |
| A2 | Campos de texto sem rótulo associado (DAR, Novo risco, Importar) | 4.1.2 / 3.3.2 | 🔴 Crítico | 19 | Idem |
| A3 | Contraste insuficiente: amarelo-escuro `#8a6d00` sobre `#fff5c2` = **4,47:1** em texto de 11 px; cinza `#666` em subtítulos | 1.4.3 Contraste mínimo | 🟠 Grave | 91 | Tokens com contraste calculado (mín. 4,5:1); texto mínimo de 12 px |
| A4 | Áreas de clique com 16 px de altura (itens do menu, links da breadcrumb, códigos RADAR) | 2.5.8 Tamanho do alvo (mín.) | 🟠 Grave | 36 | Altura mínima de 40 px para itens de navegação |
| A5 | Rolagem horizontal em 320–390 px (reflow) | 1.4.10 Refluxo | 🟠 Grave | 9 páginas | Grids com `minmax(min(100%, 340px), 1fr)`; tabelas com rolagem própria |
| A6 | Nenhum `<h1>`; hierarquia de títulos começa em `<h3>` | 1.3.1 / 2.4.6 | 🟡 Moderado | 9 páginas | Ver 2.1 |
| A7 | O nível do risco só é diferenciado por cor nas células da matriz e nas leituras de KRI (verde/vermelho) | 1.4.1 Uso de cor | 🟡 Moderado | — | `RiskBadge` com ícone + texto; KRI com ícone ✓/⚠ |
| A8 | A busca global tem `outline: none` no foco (só sombra sutil) | 2.4.7 Foco visível | 🟡 Moderado | 1 | Anel de foco por token (`--focus-ring`) |
| A9 | Células da matriz clicáveis são `<td>` com `@click`, sem `button`/`tabindex`: **inacessíveis por teclado** | 2.1.1 Teclado | 🔴 Crítico | 25 células | Cada célula vira `<button>` com `aria-pressed` e `aria-label` "P3 × I5, nota 22, Extremo, 1 risco" |
| A10 | Filtro aplicado e risco aprovado não são anunciados ao leitor de tela | 4.1.3 Mensagens de status | 🟡 Moderado | — | `Toast` com `role="status"` |

**O que já funciona bem:** o skip-link do gov.br (4 atalhos), `lang="pt-BR"`, `<title>` descritivo, landmarks `main`/`nav` e o modo de alto contraste (embora implementado com `!important`).

---

## 4. Fichas por página

> Formato: **objetivo** · **quem usa** · **primeira impressão (2 s)** · problemas · o que preservar.

### 4.1 Painel (`/`) — `PainelConsolidadoCgovView.vue`
- **Objetivo:** saber, em 10 segundos, "como está o Plano de Gestão de Riscos e o que precisa de mim".
- **Quem usa:** todos os perfis; principalmente CGOV e Diretoria.
- **Primeira impressão:** 4 cards com títulos gigantes em CAIXA ALTA; os números ficam pequenos; nada abaixo da dobra.
- **Problemas:**
  - (3) A página faz 4 coisas: KPIs, Matriz, **simulador da DAR** e **a carteira inteira**, cada risco com memória de cálculo e KRIs. São 4.306 px de altura.
  - (3) Editar o apetite da DAR no Painel é perigoso: muda a classificação de toda a carteira sem confirmação.
  - (2) Os KPIs não são clicáveis (não levam à lista filtrada).
  - (2) O filtro pela matriz rola a página para baixo sem avisar onde está o resultado.
- **Preservar:** a ideia da matriz como filtro; os 4 indicadores escolhidos.

### 4.2 Apetite — DAR (`/dar-apetite`) — `DeclaracaoApetiteDarView.vue`
- **Objetivo:** consultar e (perfil CGOV) calibrar o apetite por categoria.
- **Problemas:**
  - (3) A mudança de apetite é aplicada no `@change` do select, **sem pré-visualização nem confirmação**, e é uma decisão institucional.
  - (2) A justificativa é um `<input>` de uma linha que salva no `blur`, sem feedback de "salvo".
  - (2) Os 4 KPIs repetem informação da tabela logo abaixo.
  - (1) O aviso "Risco Crítico não é Extremo" é ótimo conteúdo, mas fica num bloco azul longo; seria melhor uma dica curta + "Saiba mais".
- **Preservar:** a coluna "Riscos / Críticos" por categoria; o aviso conceitual.

### 4.3 Objetos (`/objetos`) — `CatalogoObjetosView.vue`
- **Problemas:** (2) o formulário de cadastro empurra a lista para baixo; (2) o subtítulo de cada card é uma cadeia longa "1ª Linha → 2º Degrau (CG) → 3º Degrau (Diretoria)"; (2) `space-y-3` não existe, então os cards ficam colados; (1) não há busca nem filtro por tipo.
- **Preservar:** os riscos vinculados como chips clicáveis com nível; o atalho "Mapear risco neste objeto".

### 4.4 Novo risco (`/novo-risco`) — `FormularioRiscoView.vue`
- **Objetivo:** cadastrar um risco sem conhecer a Metodologia de cor.
- **Primeira impressão:** um wizard com 4 passos, mas o checkbox "Exibir todas as 4 etapas simultaneamente" vem **marcado**, e o assistente vira um formulário gigante.
- **Problemas:**
  - (4) Os campos são estreitos (`w-100` inexistente) e cortam o texto já preenchido: "Processo de Concessão e A|".
  - (3) Não há validação por etapa nem indicação de campo obrigatório. O erro só aparece no fim, como "Bloqueio Normativo RADAR".
  - (3) 15 campos sem rótulo acessível.
  - (2) A memória de cálculo aparece **entre** as etapas 3 e 4, mesmo quando o usuário está na etapa 1.
  - (2) Os textos de ajuda são números de quadro ("Quadro 4 — 1 a 5") em vez de explicação.
- **Preservar:** a frase padronizada gerada em tempo real (é excelente); a trava de evidência explicada.

### 4.5 Ficha do risco (`/riscos/:id`) — `FichaDetalheBowTieView.vue`
- **Problemas:**
  - (3) O status aparece como código interno: **"Status: em_validacao_cg"**.
  - (2) Para trocar de risco há um `<select>` com o título completo de todos os riscos; o certo é voltar à lista.
  - (2) O Bow Tie em 5 colunas com `auto-fit` vira 5 blocos empilhados sem setas no celular, e a metáfora da "gravata" se perde.
  - (2) As ações "Validar/Homologar" ficam no rodapé do card, longe do topo.
  - (1) Emoji 🎯 no título da coluna central.
- **Preservar:** o Bow Tie como visualização central; o histórico por ficha.

### 4.6 Monitoramento (`/monitoramento-kris`) — `MonitoramentoKriPlanoAcaoView.vue`
- **Problemas:** (2) "Registrar leitura" abre um formulário em linha sem rótulos (só placeholders); (2) o histórico de medições são pílulas verde/vermelho que dependem só da cor; (2) o status da ação 5W2H muda no `@change` sem confirmação; (1) as abas têm rótulos de 50 caracteres.
- **Preservar:** a divisão KRIs / Planos de ação em abas; os 4 KPIs (aqui fazem sentido).

### 4.7 Aprovações (`/validacao-um-clique`) — `CaixaValidacaoUmCliqueView.vue`
- **Objetivo:** a CG valida e a Diretoria homologa, rápido e com segurança.
- **Problemas:**
  - (3) "Aprovar" e "Solicitar ajuste" têm o mesmo peso visual e ficam lado a lado, o que facilita o clique errado; não há confirmação nem "desfazer".
  - (3) A devolução usa um texto padrão escondido ("Solicitado ajuste na descrição dos controles.") quando o campo fica vazio. O motivo deveria ser **obrigatório**.
  - (2) As duas filas (CG e Diretoria) aparecem para todos os perfis, mas com botões desabilitados sem explicação.
- **Preservar:** a memória de cálculo junto da decisão (é exatamente o que quem aprova precisa ver).

### 4.8 Auditoria (`/auditoria`) e 4.9 Importar (`/importar-skill`)
- **Auditoria:** (2) tabela sem paginação nem exportação; (1) datas em formato ISO cortado (`2026-11-09 14:32`).
- **Importar:** (2) não há prévia do que será importado nem relato de erros por linha; (2) a `<textarea>` não tem rótulo; (1) o título "Passo 0" não diz nada a quem não conhece a skill.

---

## 5. Linguagem (microcopy): glossário de transição

Regras de escrita adotadas:
1. **Título = tarefa, não norma.** A referência normativa vai para o ícone ⓘ "Fundamento".
2. **Termos obrigatórios do Regime B são mantidos:** *Plano de Gestão de Riscos* (por extenso, **nunca** a sigla do Programa de Gestão para Resultados), *DAR*, *KRI*, níveis *Baixo / Médio / Alto / Extremo* e *Crítico* = fora do apetite da DAR.
3. **Botões começam com verbo** e dizem o resultado ("Validar risco", não "Aprovar em 1 Clique (Coordenação-Geral)").
4. **Nunca mostrar códigos internos** (`em_validacao_cg`, `pendente_dar`).

### 5.1 Menu e títulos de página

| Hoje | Proposto | ⓘ Fundamento (tooltip) |
|---|---|---|
| Painel do Plano de Gestão de Riscos / "Painel Consolidado do Plano de Gestão de Riscos" | **Painel** | Plano de Gestão de Riscos do ICMBio — Política (SEI 024241420) |
| Declaração de Apetite (DAR) / "Declaração de Apetite a Riscos (DAR — Anexo III)" | **Apetite a riscos (DAR)** | Anexo III da Metodologia (SEI 024421455) |
| Catálogo de Objetos & Processos | **Objetos de gestão** | Seção 4.1 e Quadro 1 |
| — (não existe) | **Riscos** | — |
| Assistente Guiado Bow Tie | **Novo risco** | Seções 4.2 a 4.5 |
| Ficha Visual Bow Tie & Dossiê | **Ficha do risco** (sai do menu; é aberta pela lista) | Seção 4.2.1 |
| Sala de Situação KRIs & 5W2H | **Monitoramento** | Seções 4.5 e 4.6 |
| Caixa Validação em 1 Clique | **Aprovações** | Fluxo de 3 degraus da Política |
| Trilha de Auditoria | **Auditoria** | — |
| Passo 0: Importador Skill CGOV | **Importar riscos** | skill `cgov-gestao-riscos-v4` |

### 5.2 Status do fluxo (substituem os códigos internos)

| Código | Rótulo | Descrição curta (tooltip) |
|---|---|---|
| `rascunho` | **Rascunho** | Em elaboração pela unidade (1ª Linha) |
| `em_validacao_cg` | **Aguardando validação** | Com a Coordenação-Geral (2º degrau) |
| `em_homologacao_dir` | **Aguardando homologação** | Risco Crítico com a Diretoria (3º degrau) |
| `aprovado` | **No Plano** | Integrado ao Plano de Gestão de Riscos |
| `devolvido` | **Devolvido para ajuste** | Ver o motivo no histórico |

| Situação frente à DAR | Rótulo |
|---|---|
| `sim` | **Crítico** · fora do apetite |
| `nao` | **Dentro do apetite** |
| `pendente_dar` | **Apetite não definido** · aguarda o CIG |

### 5.3 Ações e mensagens

| Hoje | Proposto |
|---|---|
| Aprovar em 1 Clique (Coordenação-Geral) | **Validar risco** |
| Homologar em 1 Clique para o Plano de Gestão de Riscos (Diretoria) | **Homologar risco** |
| Solicitar Ajuste Rápido | **Devolver para ajuste** (abre diálogo com motivo obrigatório) |
| Salvar e Submeter à Coordenação-Geral (1 Clique) | **Enviar para validação** |
| Salvar como Rascunho (1ª Linha) | **Salvar rascunho** |
| Abrir Ficha Bow Tie / Abrir Dossiê Bow Tie | **Ver ficha** |
| Bloqueio Normativo RADAR: … | Erro no campo: "Escolha uma das 6 subcategorias de Integridade. Riscos de Integridade precisam de subcategoria (Quadro 3)." |
| Trava de Evidência Acionada (Quadro 6): … | "Sem evidência comprovada, a eficácia fica limitada a **Fraco (0,9)**." |
| Diálogo ao mudar apetite (novo) | "Mudar o apetite de **Legal** para **Moderado**? **2 riscos** deixam de ser Críticos." [Mudar apetite] [Cancelar] |
| Fila vazia (novo) | "Nenhum risco aguardando sua validação. Quando uma unidade enviar um risco, ele aparece aqui." |

> ⚠️ **Achado de conteúdo (fora da UI):** a frase padronizada gerada traz "Devido o(a) concentração…" e "ocasionando o(a) paralisação". O gerador deveria flexionar o artigo ou usar uma forma neutra ("Devido a…"). Registrado para tratar no motor de texto, **sem** alterar o cálculo.

---

## 6. O que este diagnóstico muda no plano

1. **Fase 1 ganha uma tarefa 1.0, "Saneamento de classes"**: substituir as 26 classes fantasma por utilitários reais do gov.br DS ou por tokens, e adicionar um **teste automatizado** que falha se uma classe desconhecida voltar a aparecer (o checador usado aqui vira teste em `tests/unit`).
2. **Tabelas:** usar o componente oficial `br-table` como base do `DataTable`, e não `table-responsive`.
3. **Matriz 5×5:** células como `<button>` (achado A9, crítico).
4. **Fluxo de aprovação:** o motivo da devolução passa a ser obrigatório. Isso é só UI; a store `solicitarAjusteRapido` já recebe o motivo.
5. **Metas para a Fase 4** (repetir estas medições):

| Métrica | Antes | Meta |
|---|---|---|
| Violações axe-core (WCAG 2.2 AA) | 171 | **0** |
| Páginas com rolagem horizontal | 9 / 9 | **0** |
| Páginas com `<h1>` | 0 / 9 | **9 / 9** |
| Altura do Painel no celular | 17.564 px | **< 3.500 px** |
| Atributos `style=` com cor fixa | ~165 | **0** |
| Campos de formulário sem rótulo | 44 | **0** |

---

*Capturas:* [`capturas/antes/`](capturas/antes/) — `desktop-*.png` (página inteira, 1440 px) e `mobile-*.png` (primeira dobra, 390 px).
*Próximo passo:* [[2026-11-14-reformulacao-ui-radar-plan|Fase 1 — Fundação]].
