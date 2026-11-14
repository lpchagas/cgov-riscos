---
tipo: referencia
fase: "Fase 1 — Fundação da reformulação da UI"
data: 2026-11-14
plano: "[[2026-11-14-reformulacao-ui-radar-plan]]"
diagnostico: "[[diagnostico-ui-2026-11]]"
tags: [design-system, tokens, componentes, acessibilidade, govbr-ds]
---

# Design System do RADAR

> **Em uma frase:** a identidade é do **gov.br DS**; a organização segue padrões modernos de
> **Material Design 3** (tokens em camadas, navigation rail, estados) e **Ant Design** (tabelas
> densas, painéis laterais, filtros). Toda decisão visual vem de um **token**, e todo componente
> já nasce acessível (WCAG 2.2 AA).

## 1. Onde está cada coisa

| Arquivo | O que contém |
|---|---|
| `src/styles/tokens.css` | Todas as decisões visuais: cores, tipografia, espaços, raios, sombras e temas |
| `src/styles/base.css` | Estilos da página inteira, anel de foco, campos e utilitários `radar-*` |
| `src/styles/compat-legado.css` | ⚠️ Ponte **temporária** para as views antigas (apagar no fim da Fase 3) |
| `src/components/ui/` | Componentes genéricos (sem regra de negócio) |
| `src/components/radar/` | Componentes do domínio (Matriz 5×5, Memória de cálculo) |
| `src/components/govbr/` | Esqueleto gov.br: cabeçalho, menu, trilha, rodapé, skip-link |
| `src/utils/rotulosInterface.ts` | Dicionário código → texto (status, criticidade, ícones dos níveis) |
| `src/composables/` | Tema, foco em modais e avisos (toasts) |

## 2. Tokens

### 2.1 As três camadas

```
--ref-azul-70: #1351b4          ← 1. REFERÊNCIA (paleta gov.br). Nunca usar direto.
      ↓
--cor-primaria: var(--ref-azul-70)  ← 2. SEMÂNTICO (o papel). É o que os componentes usam.
      ↓                                   Cada tema redefine só esta camada.
--risco-alto-texto: #8f3a06     ← 3. DOMÍNIO RADAR (Quadro 8).
```

### 2.2 Cores semânticas (tema claro)

| Token | Uso | Contraste medido |
|---|---|---|
| `--texto` | texto principal | 15,65:1 sobre branco |
| `--texto-secundario` | descrições, rótulos de apoio | 6,91:1 sobre branco · 6,32:1 sobre o fundo |
| `--cor-primaria` | ações, links, item ativo | 7,33:1 sobre branco |
| `--borda-forte` | contorno de campos (WCAG 1.4.11) | 3,63:1 (mín. 3:1) |
| `--cor-perigo` / `--cor-sucesso` / `--cor-aviso` | feedback | ≥ 6,5:1 |
| `--superficie-fundo` → `--superficie` → `--superficie-container` → `--superficie-alta` | do fundo para a frente | — |

### 2.3 Níveis de risco (Quadro 8)

| Nível | Fundo | Texto/ícone | Contraste | Ícone (forma) |
|---|---|---|---|---|
| **Baixo** (1 a 5) | `#e3f5e1` | `#11661a` | 6,26:1 | ↓ seta para baixo |
| **Médio** (> 5 a 10) | `#fff5c2` | `#6b5200` | 6,74:1 | − traço |
| **Alto** (> 10 a 17) | `#ffe2cc` | `#8f3a06` | 6,13:1 | ↑ seta para cima |
| **Extremo** (> 17 a 25) | `#fde0db` | `#a51b00` | 6,12:1 | ⚠ triângulo |

> **Regra:** o nível nunca é comunicado só pela cor. O `RiskBadge` sempre mostra **ícone + texto**.
> E lembre: **Crítico** não é um nível. É a situação de quem está **fora do apetite da DAR**.

### 2.4 Escalas

| Escala | Valores |
|---|---|
| Espaço `--esp-1…8` | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px |
| Raio `--raio-*` | sm 4 · md 8 · lg 12 · xl 16 · pílula |
| Texto | xs 12 · sm 14 · md 16 · lg 18 · título 20/24/28 · display 36 px (em `rem`, respeita o zoom) |
| Elevação `--elevacao-0…3` | nenhuma → cartão → hover → modal |
| Alvo mínimo `--alvo-minimo` | 40 px (WCAG 2.5.8 pede 24) |
| Densidade | padrão: linha de 52 px · `data-density="compact"`: 40 px |

### 2.5 Temas

| Tema | Status | Como ativar |
|---|---|---|
| Claro | ✅ padrão | — |
| Alto contraste (gov.br) | ✅ botão ◐ no cabeçalho | `<html data-theme="contraste">` |
| Escuro | 🔒 definido, **ainda não oferecido** | será liberado no fim da Fase 3 (`TEMAS_DISPONIVEIS`) |

## 3. Componentes

### 3.1 Inventário

| Componente | Quando usar | Acessibilidade embutida |
|---|---|---|
| `PageHeader` | topo de toda página (o `App.vue` já desenha a partir da rota) | um `<h1>` por página; "ⓘ Fundamento" com `aria-expanded` |
| `StatCard` | um número importante (KPI); com `para`, vira link para a lista filtrada | número primeiro, rótulo depois |
| `DataTable` | listas com mais de ~5 itens | `<caption>`, `aria-sort`, rolagem própria, paginação anunciada |
| `SideSheet` | detalhe rápido sem sair da lista; formulários curtos | foco preso, Esc fecha, foco volta ao item clicado |
| `Dialog` | decisão importante e curta (ex.: mudar apetite da DAR) | idem + `role="alertdialog"` para decisões destrutivas |
| `Toast` (`useToast`) | confirmação de ação, com "Desfazer" | `role="status"`, lido automaticamente |
| `FormField` | **todo** campo de formulário | `<label for>`, `aria-describedby`, `aria-invalid`, erro com `role="alert"` |
| `SegmentedControl` | 2 a 5 opções exclusivas, todas visíveis | padrão `radiogroup`: setas ← → |
| `Chip` | status, filtros ativos | botão ✕ com nome acessível |
| `RiskBadge` | nível Baixo/Médio/Alto/Extremo | ícone de forma + texto |
| `EmptyState` | lista vazia | diz o que é, por que está vazio e o que fazer |
| `Skeleton` | carregamento | "Carregando…" para leitor de tela |

### 3.2 Exemplos rápidos

```vue
<!-- Campo com rótulo, ajuda e erro ligados corretamente -->
<FormField rotulo="Evento de risco" ajuda="O que pode acontecer?" :erro="erros.evento" obrigatorio v-slot="{ attrs }">
  <textarea v-bind="attrs" v-model="evento" />
</FormField>

<!-- Nível de risco: nunca formate/arredonde o valor antes; a classe vem da calculadora -->
<RiskBadge :classe="risco.classificacaoResidual" :valor="risco.nivelResidual" />

<!-- Status do fluxo: sempre pelo dicionário, nunca o código cru -->
<Chip :tom="ROTULOS_STATUS_FLUXO[r.statusFluxo].tom" :icone="ROTULOS_STATUS_FLUXO[r.statusFluxo].icone">
  {{ ROTULOS_STATUS_FLUXO[r.statusFluxo].rotulo }}
</Chip>
```

### 3.3 Faça / Não faça

| ✅ Faça | ❌ Não faça |
|---|---|
| `color: var(--texto-secundario)` | `style="color: #666"` |
| Usar o `PageHeader` / `meta.titulo` da rota | Criar `<h2>` solto como título da página |
| Botões com verbo: "Validar risco" | "OK", "Aprovar em 1 Clique (Coordenação-Geral)" |
| Filtros na URL (`/riscos?critico=sim`) | Filtro guardado só na memória da página |
| Referência normativa no "ⓘ Fundamento" | Número do Quadro ou do SEI no título |
| Classes do gov.br DS (`text-weight-bold`) ou tokens | Classes do Bootstrap (`font-weight-bold`) |

## 4. App shell e navegação

- **Cabeçalho (64 px):** ☰ · gov.br | RADAR · busca global (leva a `/riscos?q=`) · ◐ alto contraste · menu do usuário (simulador de perfil).
- **Menu lateral (navigation rail):** botão "Novo risco" + 4 grupos (Visão geral, Gestão de riscos, Deliberação, Ferramentas).
  Recolhível no computador (preferência salva); gaveta fechada por padrão no celular.
- **Rotas novas** (as antigas redirecionam): `/dar`, `/riscos`, `/riscos/novo`, `/riscos/:id`, `/monitoramento`, `/aprovacoes`, `/importar`.

## 5. Proteções automáticas (testes)

| Teste | O que impede |
|---|---|
| `higieneCss.spec.ts` › classes fantasma | voltar a usar classe CSS que não existe (causa nº 1 do diagnóstico) |
| `higieneCss.spec.ts` › `components/ui` sem cor fixa | componente novo com `#hex` em vez de token |
| `higieneCss.spec.ts` › catraca de cores fixas | aumentar as cores fixas nas views antigas (hoje: **234**; meta: 0) |
| `componentesUi.spec.ts` | regressão de acessibilidade em `FormField`, `DataTable`, `SegmentedControl`, `Chip`, `RiskBadge` |
| `filtrosERotulos.spec.ts` | código interno na tela; "Crítico" confundido com "Extremo"; sigla PGR |

## 6. Resultado da Fase 1 (medido com axe-core e Playwright)

| Métrica | Antes (Fase 0) | Depois da Fase 1 | Meta (Fase 4) |
|---|---|---|---|
| Violações axe-core (WCAG 2.2 AA) | 171 | **87** (todas dentro das views antigas) | 0 |
| — alvos de clique pequenos (2.5.8) | 36 | **0** | 0 |
| Páginas com rolagem horizontal (computador e celular) | 9 / 9 | **0** | 0 |
| Páginas com `<h1>` | 0 / 9 | **10 / 10** | 10 / 10 |
| Altura do Painel no celular | 17.564 px | 8.729 px | < 3.500 px |
| Cores fixas no HTML/JS | 238* | 234 | 0 |
| Página nova `/riscos` | — | 0 violações, inclusive com o painel lateral aberto | — |

\* medida mais completa que a do diagnóstico (inclui cores definidas no `<script>`).

**O que ainda falta e por quê:** as 87 violações restantes são campos sem rótulo e cores fixas
**dentro** das views antigas (Painel, DAR, Novo risco). Elas somem quando cada view for reescrita com
`FormField` e tokens. A Fase 2 começa pelo Painel.

Capturas: [`capturas/fase1/`](capturas/fase1/).
