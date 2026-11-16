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
| `src/components/ui/` | Componentes genéricos (sem regra de negócio) |
| `src/components/radar/` | Componentes do domínio (Matriz 5×5, Memória de cálculo, Bow Tie) |
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
| Alto contraste (gov.br) | ✅ botão ◐ no cabeçalho (volta ao tema anterior) | `<html data-theme="contraste">` |
| Escuro | ✅ liberado no fim da Fase 3 | menu do usuário → Aparência (`<html data-theme="escuro">`) |

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
| `higieneCss.spec.ts` › cores fixas | **qualquer** cor fixa (`#hex`) no HTML/JS — a catraca chegou a **0** na Fase 3 |
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

## 7. Resultado da Fase 2 — Piloto do Painel

| Métrica | Fase 1 | Fase 2 | Meta (Fase 4) |
|---|---|---|---|
| Violações axe-core no Painel (computador / celular / alto contraste) | 87 no sistema | **0 / 0 / 0** | 0 |
| Altura do Painel no celular | 8.729 px | **4.666 px** (862 px de rodapé) | < 3.500 px |
| Cores fixas no HTML/JS (catraca) | 234 | **175** | 0 |
| Testes automatizados | 41 | **59** | — |

**Novos tokens:** `--faixa-*` (barra gov.br e rodapé), `--cor-marca-icmbio` (verde, 6,47:1 sobre branco)
e `--altura-faixa-gov` (44 px). A barra gov.br some ao rolar porque o `<header>` é `sticky` com
`top: -44px`.

**Nova regra de layout:** o menu lateral tem `flex: none`. Sem isso, um conteúdo largo
(grade de 12 colunas) espremia o menu até ~18 px.

Capturas: [`capturas/fase2/`](capturas/fase2/).


## 8. Resultado da Fase 3 — todas as páginas migradas

Uma página por commit: Apetite (DAR) → Aprovações → Monitoramento → Ficha do risco → Novo risco →
Objetos → Auditoria → Importar. Depois: tema escuro liberado e camada `compat-legado.css` apagada.

| Métrica | Fase 2 | Fase 3 |
|---|---|---|
| Violações axe-core (12 telas × computador e celular) | 0 no Painel | **0 em todas, nos 3 temas** (claro, escuro, alto contraste) |
| Cores fixas no HTML/JS | 175 | **0** (regra absoluta no teste) |
| Páginas com rolagem lateral | 0 | 0 |
| Testes automatizados | 59 | **98** |
| Camada `compat-legado.css` | existia | **apagada** (nenhuma classe órfã) |

**Componentes novos ou reescritos na Fase 3:**

| Componente | O que faz |
|---|---|
| `BrTabs` | abas WAI-ARIA (tablist, setas ← →, Home/End); aba na URL |
| `BrStep` | indicador de etapas com `aria-current="step"`; "Etapa 2 de 4" no celular |
| `BrMessage` | mensagem de página só com tokens; `alert` para perigo/aviso, `status` para info/sucesso |
| `BowTieDiagram` | Bow Tie como lista ordenada de 5 passos; colunas no computador, empilhado no celular |
| `MemoriaCalculoBar`, `BrButton` | migrados para tokens (vírgula pt-BR, trava explicada, perigo/sucesso com contraste ≥ 6,5:1) |
| `BrCard`, `BrBadge` | **removidos** (sem uso) |

**Ponte com o gov.br DS (`base.css`):** o core pinta títulos e parágrafos com `--color` (#333 fixo) e
links com `#1351b4`. Agora `--color` e `a` apontam para os tokens `--texto` e `--texto-link`, e o novo
token `--texto-marca` substitui `--cor-marca-escura` quando a cor da marca é usada em **texto**.
`scroll-padding-top` reserva a altura do cabeçalho fixo em toda rolagem automática (WCAG 2.4.11).

Capturas: [`capturas/fase3/`](capturas/fase3/).

## 9. Resultado da Fase 4 — polimento

| Métrica | Fase 3 | Fase 4 |
|---|---|---|
| Combinações verificadas com axe-core | 12 telas × 2 larguras × 3 temas = 72 | **13 telas** (com `/sobre`) × **4 larguras (360, 768, 1280, 1920)** × 3 temas = **156** |
| Violações axe-core (WCAG 2.2 A/AA) | 0 | **0** |
| Páginas com rolagem lateral | 0 | 0 |
| Tabelas com colunas escondidas por rolagem interna no celular | 5 páginas (não medido antes) | **0** |
| Altura do Painel no celular (390 px) | 4.819 px | **4.109 px** (meta de 3.500 não atingida, ver abaixo; a etapa C mediu 3.690 px, ver § 11) |
| Altura do rodapé no celular | 862 px | **512 px** |
| Testes automatizados | 98 | **105** |

**`DataTable` em modo cartão (< 768 px).** A varredura achou um defeito que o teste de rolagem não
pegava: no celular, a tabela rolava para o lado *dentro* do cartão e o **Residual** e o **Apetite**
ficavam fora da tela em Painel, DAR, Riscos, Objetos e Plano de ação. Agora cada linha vira um bloco
com "rótulo · valor" (`data-rotulo` + `td::before`). As colunas ordenáveis viram botões
"Ordenar por:". A tabela declara `role="table|row|cell"` para não perder a semântica quando o CSS
troca o `display`.

**Painel mais curto no celular, sem apagar informação:** "Precisa da sua atenção" mostra 3 itens e
o botão "Mostrar mais N" (`aria-expanded`). "Atividade recente" mostra os 2 eventos mais novos, e o
histórico completo fica no link Auditoria.

**Rodapé enxuto + página Sobre o RADAR (`/sobre`).** A pedido da CGOV, o rodapé ficou só com gov.br, unidades
(CGGE, CGOV, CTGRIC), atalhos e base com versão e redes. Normas correlatas, fontes de dados, contato, painéis e
DIGITECA foram para `/sobre`, no layout de relatório em duas colunas do *Template V3 — Relatórios* (Figma
Community): texto à esquerda e painel cinza com tabelas à direita. O rodapé e a página leem as mesmas listas de
`src/utils/sobreRadar.ts`, e a versão vem do `package.json`.

**Por que não chegamos a 3.500 px:** o que sobra é conteúdo, sem espaço vazio. Os blocos são
cabeçalho com simulador de perfil (229), indicadores (430), Matriz (589), atenção (512), maiores
residuais (~700, agora com todas as colunas visíveis), três resumos (645) e rodapé (512). Para
descer mais seria preciso **tirar cartões do Painel no celular**, por exemplo os resumos
"Riscos por nível residual" e "DAR", que já têm página própria. Essa é uma decisão da CGOV.

**Estados de carregamento e erro:** hoje a store lê os dados de demonstração em memória, de forma
síncrona, e nada "carrega". Os componentes `Skeleton` e `EmptyState` já existem. O `Skeleton`
entra quando a store passar a buscar no Supabase. Os estados vazios já estão em 8 telas.

**Como repetir a medição:** `npm run test:a11y` (desde 2026-11-15, dentro do repositório). Ele roda
as mesmas 156 combinações, reprova se houver violação do axe ou rolagem lateral e mostra a altura do
Painel em 360 px (**4.271 px**; os 4.109 px acima foram medidos em 390 px). Na primeira execução,
o axe-core 4.10.3 encontrou uma violação que a versão anterior não acusava, no progresso do Plano
de ação (`aria-label` em `<p>`). Ela já foi corrigida. Guia: [[varredura-acessibilidade]].

## 10. Estados de carregamento, erro e aviso (etapa B3)

Antes da B3 os dados eram síncronos e nada "carregava". Agora a store é assíncrona e cada tela tem
os três momentos: carregando, erro e pronto. Componentes (em `src/components/ui/`, exceto o último):

| Componente | Para quê | Detalhes |
| --- | --- | --- |
| `EstadoCarregamento` | Um **bloco** da tela (cartões, tabela) | `estado` = `carregando` (esqueleto `Skeleton`, "Carregando…" para leitor de tela), `erro` (mensagem + "Tentar de novo") ou `pronto` (slot). `formato` = `cartao` ou `tabela`. |
| `ErroPagina` | **Página inteira** que não pôde carregar (Template V3 — Erro do gov.br) | O título é o `<h1>`; a tela não desenha o `PageHeader` junto. Ações: "Tentar de novo" e "Ir para a Página Principal". Ilustração só com tokens e `aria-hidden`. |
| `AvisoAtualizacao` | Aviso global quando a **ação deu certo mas a releitura falhou** | Fica no `App.vue`; botão "Atualizar"; some quando a releitura funciona. |
| `AcoesDoRisco` (`src/components/radar/`) | Botões do fluxo de um risco (enviar, assumir, validar, homologar, devolver, editar, excluir) | Só mostra o que `acoes_no_fluxo` permite e explica pelo `motivo`; confirmação em diálogo. Usado no painel lateral e na Ficha. |

**Varredura de acessibilidade:** passou de 16 para **(16 + 4) telas** × 4 larguras × 3 temas, com o
Painel e Riscos também em `carregando` e em `erro`. O estado é simulado pela chave
`radar.demo-estado.v1` do navegador (`carregando` ou `erro`), gravada antes da página abrir
(`tests/a11y/telas.ts`, campo `estadoDemo`). Decisões: [[decisoes-tecnicas-b3]].


## 11. Painel no celular (etapa C)

O Painel passou a ter um modo próprio abaixo de **640 px** (celular). No computador nada mudou.
Decisões e custos em [[decisoes-tecnicas-c]]; desenho em [[2026-11-16-etapa-c-painel-celular-design]].

| Métrica (390 px, demonstração, blocos fechados) | Partida (spec da etapa C) | Etapa C |
|---|---|---|
| Altura do Painel, perfil CGOV | 4.104 px | **3.690 px** |
| Altura do Painel, perfil Gestor | 4.185 px | **3.771 px** |
| Alvos de toque com lado menor que 44 px | 14 de 49 | **0** |

Sobre a coluna "Partida": os **4.109 px** da § 9 são a medida da Fase 4. Os **4.104 px** são a nova medição
de partida da etapa C (mesmo Painel, medida em 2026-11-16), por isso os dois números diferem um pouco.

**Modo real com 5 ou mais riscos: NÃO foi medido em navegador** (a demonstração só tem 3 riscos). O limite de
3 cartões em "Maiores riscos" (`maioresVisiveis`, testado com 3, 4 e 5 riscos em `tests/unit/painelCelular.spec.ts`)
faz o teto ficar, por lógica, perto de 3.690 px + o botão "Mostrar mais" (cerca de 56 px), ou seja, cerca de
3.750 px. Isso é **estimativa, não medição**.

**A meta de 3.500 px da Fase 4 continua NÃO atingida:** o Painel ficou 190 px (CGOV) e 271 px (Gestor) acima.
Sem os alvos de 44 px seria 3.537 / 3.618 px; escolhemos gastar cerca de 150 px em alvos de toque.

- **Componente novo `BlocoRecolhivel`** (`src/components/ui/`): os três resumos finais recolhem no celular
  (botão com `aria-expanded` e `aria-controls`, estado não salvo) e ficam sempre abertos no computador.
- **`StatCard` com `compacto`:** indicadores 2×2 só com número e rótulo; a descrição fica só para leitor de tela.
- **Ordem no celular:** indicadores, Precisa da sua atenção, Matriz, Maiores riscos (até 3 + "Mostrar mais N"),
  resumos recolhidos. A ordem é só visual (CSS): o teclado e o leitor de tela seguem Matriz antes da Atenção.
- **Alvos de 44 px no celular**, inclusive o "Fundamento" do `PageHeader`, que é compartilhado: todas as telas ganham.
- **Figma:** `BlocoRecolhivel` novo na biblioteca; falta republicar a biblioteca e ligar o Code Connect (tabela
  em [[decisoes-tecnicas-c]] seção 4).
