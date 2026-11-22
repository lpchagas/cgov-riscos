---
tipo: diagnostico
fase: "Revisão de aderência ao GovBR-DS (antes do plano de implementação)"
data: 2026-11-22
relacionados: "[[design-system]] · [[diagnostico-ui-2026-11]] · [[varredura-acessibilidade]] · [[mapa-telas]]"
tags: [ux, acessibilidade, govbr-ds, radar, tokens]
---

# Revisão da interface do RADAR frente ao Padrão Digital de Governo (GovBR-DS)

> **Para que serve este documento?** Ele compara a interface **atual** do RADAR (depois das Fases 1 a 4
> da reformulação) com as regras oficiais do GovBR-DS e aponta o que ajustar, em ordem de prioridade.
> É a base do próximo plano de implementação.
>
> **Escopo decidido pelo responsável (2026-11-22):**
> 1. Abordagem **híbrida gradual**: os tokens próprios (`src/styles/tokens.css`) passam a usar os
>    valores oficiais, e os componentes próprios continuam, ajustados ao visual e ao comportamento dos `br-*`.
> 2. Telas da primeira rodada: **Novo risco** (`FormularioRiscoView.vue`), **Riscos** (`RiscosListaView.vue`)
>    e **Painel** (`PainelConsolidadoCgovView.vue`).
> 3. Relatório em arquivo, neste nível 3 da documentação.
>
> **Fora do escopo:** cálculo (Quadros 6, 7 e 8), banco, RLS e qualquer ação na nuvem.

## 1. Como a revisão foi feita

| Etapa | O que foi feito |
| --- | --- |
| Fontes oficiais | 27 páginas do GovBR-DS (Markdown publicado em `docs-ds.estaleiro.serpro.gov.br`): formulário, erro, densidade, cores, tipografia, espaçamento, grid, acessibilidade e os componentes input, select, textarea, checkbox, radio, button, message, table, modal, card, tag, header, menu, breadcrumb, tab, list, pagination, loading e tooltip. |
| Tokens oficiais | Valores lidos direto do `@govbr-ds/core` instalado (`node_modules/@govbr-ds/core/dist/core.min.css`). |
| Capturas | Playwright, tema claro, 390 px (celular) e 1280 px (notebook), **só com dados de demonstração** (modo demonstração, sem login). |
| Acessibilidade | axe-core (WCAG 2.0, 2.1 e 2.2, níveis A e AA) nas 3 telas × 3 temas (claro, escuro, contraste) × 2 larguras = 18 combinações. |
| Código | Leitura de `tokens.css`, `base.css`, `FormField.vue` e dos 3 arquivos de tela; contagem de valores fixos. |

> ⚠️ **Limitação das capturas.** A fonte Rawline vem de um servidor externo
> (`cdngovbr-ds.estaleiro.serpro.gov.br`, ligado em `index.html`), que o ambiente da revisão bloqueia. As
> capturas saíram com a fonte substituta do sistema. Tamanhos e espaços valem; o desenho das letras, não.

**Escala de severidade** (a mesma do [[diagnostico-ui-2026-11]]): **4** = impede a tarefa · **3** = atrapalha
muito ou contraria regra explícita do GovBR-DS · **2** = incomoda ou diverge do padrão · **1** = acabamento.

## 2. Resumo executivo

O RADAR já está **acessível** (zero violações automáticas nas 18 combinações) e **organizado**. O que falta
é **falar a mesma língua visual do gov.br**. Os quatro pontos que mais pesam:

| # | Achado | Severidade | Onde mexe |
| --- | --- | --- | --- |
| 1 | Tabelas com **rolagem lateral escondida** no notebook (1280 px): colunas cortadas no Painel e em Riscos. O GovBR-DS manda quebrar a linha nas células e só rolar no celular. | **3** | `DataTable.vue` |
| 2 | Formulário marca **obrigatórios e opcionais ao mesmo tempo** (asterisco vermelho + "Opcional." no texto de ajuda). O GovBR-DS proíbe isso. | **3** | `FormField.vue`, telas com formulário |
| 3 | **Tipografia fora da escala oficial**: corpo de 16 px (oficial: 14 px) e 9 tamanhos próprios (12, 13, 14, 16, 18, 20, 24, 28, 36 px) no lugar da escala de razão 1,2. Há textos de 11 px, abaixo do mínimo do próprio RADAR. | **3** | `tokens.css`, `base.css` |
| 4 | **Cinzas azulados** próprios (texto `#1b2430`, fundo `#f3f5f8`) no lugar dos cinzas neutros oficiais (texto `#333`, fundo `#f8f8f8`). | **2** | `tokens.css` |

**Boa notícia, que corrige uma suspeita anterior:** o espaçamento **não** está fora do padrão. A escala
oficial tem meios passos (`--spacing-scale-half` = 4 px, `--spacing-scale-baseh` = 12 px), e os 8 tokens
de espaço do RADAR correspondem, um a um, a tokens oficiais (ver G-02). Basta trocar os nomes.

## 3. Fundamentos visuais (tokens)

### G-01 — Tipografia fora da escala oficial · severidade 3

- **Regra oficial:** só Rawline; base de **14 px**; escala de razão 1,2: 11,66 · **14** · 16,8 · 20,16 · 24,19 ·
  29,04 · 34,83 · 41,8 px (`--font-size-scale-down-01` a `--font-size-scale-up-06`).
- **Hoje:** o `@govbr-ds/core` põe 14 px no `body`, mas o `base.css` troca para `--texto-md` (16 px). A escala
  própria usa 12 · 13 · 14 · 16 · 18 · 20 · 24 · 28 · 36 px. Os títulos h1 têm 28 px (oficial mais próximo:
  29,04) e os números dos indicadores do Painel, 36 px (oficial: 34,83 ou 41,8).
- **Valores fixos no código:** 13 px (`0.8125rem`) aparece 9 vezes e 11 px (`0.6875rem`), 2 vezes. Os 11 px
  ficam abaixo do mínimo de 12 px que o próprio `tokens.css` declara.
- **Proposta:** fazer `--texto-*`, `--titulo-*` e `--display` apontarem para `--font-size-scale-*` e trocar os
  valores fixos por tokens. **Decisão pendente:** corpo de 14 px, como no padrão, ou manter 16 px por
  legibilidade? Ver a seção 7.

### G-02 — Espaçamento: só falta trocar os nomes · severidade 1

| Token do RADAR | Valor | Token oficial equivalente |
| --- | --- | --- |
| `--esp-1` | 4 px | `--spacing-scale-half` |
| `--esp-2` | 8 px | `--spacing-scale-base` |
| `--esp-3` | 12 px | `--spacing-scale-baseh` |
| `--esp-4` | 16 px | `--spacing-scale-2x` |
| `--esp-5` | 24 px | `--spacing-scale-3x` |
| `--esp-6` | 32 px | `--spacing-scale-4x` |
| `--esp-7` | 48 px | `--spacing-scale-6x` |
| `--esp-8` | 64 px | `--spacing-scale-8x` |

- **Proposta:** `--esp-N: var(--spacing-scale-…)`. Nenhuma tela muda de aparência. Sobram poucos valores
  fixos de 2 e 3 px (`gap: 2px`, `margin-top: 3px`), que podem ficar como ajuste fino.
- **Atenção à regra do formulário:** o GovBR-DS pede `margin-bottom: var(--spacing-scale-5x)` (40 px) entre
  grupos (`fieldset`). Hoje o `fieldset` da etapa tem margem 0.

### G-03 — Cantos arredondados · severidade 1

`--raio-sm` (4 px), `--raio-md` (8 px), `--raio-xl` (16 px) e `--raio-pilula` já batem com
`--surface-rounder-sm`, `-md`, `-lg` e `-pill`. Só o `--raio-lg` (12 px) não tem equivalente oficial. A
proposta é escolher 8 ou 16 px conforme o uso.

### G-04 — Cinzas e superfícies · severidade 2

- **Oficial:** texto `--gray-80` (`#333`); fundo alternativo `--gray-2` (`#f8f8f8`) ou `--gray-5`
  (`#f0f0f0`); bordas `--gray-20` (`#ccc`); cor primária `#1351b4`; foco dourado `#c2850c`.
- **Hoje:** a cor primária (`#1351b4`) e o anel de foco (`#c2850c`) **já seguem o padrão**. Os cinzas são
  azulados (`#1b2430`, `#4f5b6b`, `#d5dbe3`, `#f3f5f8`), um estilo próprio.
- **Proposta:** apontar `--ref-cinza-*` para `--gray-*`. O contraste continua acima de 4,5:1 (`#333` sobre
  branco dá 12,6:1). O tema escuro e o de contraste mantêm os valores próprios, porque o GovBR-DS não tem
  um tema escuro completo para sistemas.

### G-05 — Sombras · severidade 1

As `--elevacao-1` a `-3` são próprias. O padrão tem `--surface-shadow-sm`, `-md` e `-lg`. A proposta é
fazer as elevações apontarem para essas sombras.

### G-06 — Cores de estado · severidade 1

Sucesso, aviso, perigo e informação usam tons mais escuros que os oficiais (`--success`, `--warning`,
`--danger`, `--info`), escolhidos para passar no contraste do texto. **Manter** nas etiquetas e trocar só
nos ícones e nas bordas, onde o contraste exigido é 3:1. As cores dos **níveis de risco** (Baixo, Médio,
Alto, Extremo) são do domínio do RADAR e **não mudam**.

### G-07 — Fonte Rawline num servidor externo · severidade 2

A fonte vem do servidor do Serpro. Se ele cair, ou se a rede da CGTI o bloquear (como aconteceu nesta
revisão), o RADAR aparece com outra fonte. **Proposta:** servir os arquivos da Rawline junto com o
próprio RADAR (pasta `public/`) e revisar a CSP. A decisão cabe à CGTI.

## 4. Componentes e padrões de tela

### G-10 — Marcação de campos obrigatórios e opcionais · severidade 3

- **Regra oficial:** prefira todos os campos obrigatórios e diga isso no subtítulo. Marque **só** os
  opcionais, com "(Opcional)" à direita do rótulo, **ou só** os obrigatórios, com "(Obrigatório)". *"Não
  utilize as regras acima concomitantemente."*
- **Hoje:** `FormField.vue` põe um **asterisco vermelho** nos obrigatórios (e "(obrigatório)" só para o leitor
  de tela). Os opcionais ("Responsável pelo risco", "Indicador de acompanhamento (KRI)") dizem
  "Opcional." **dentro do texto de ajuda**. Ou seja, as duas marcações aparecem juntas, e o asterisco não é
  o padrão do gov.br.
- **Proposta:** a propriedade `obrigatorio` some do visual. Entra uma propriedade `opcional`, que escreve
  "(Opcional)" ao lado do rótulo, e o subtítulo da etapa ganha a frase "Todos os campos são obrigatórios,
  exceto os marcados como (Opcional)". O `aria-required` continua.

### G-11 — Posição do texto de ajuda · severidade 2

O RADAR põe o texto de ajuda **entre o rótulo e o campo**. Na anatomia oficial do Input, o texto auxiliar
(item 7) vem depois do campo e da mensagem (item 6). **A confirmar** nas imagens da documentação antes de
mudar: o texto acima do campo tem a vantagem de ser lido antes da digitação.

### G-12 — Ordem e ênfase dos botões · severidade 1

- **Regra oficial:** botões abaixo e à direita, na ordem terciário · secundário · primário. Na vertical
  (celular), o primário fica embaixo.
- **Hoje:** "Salvar rascunho" (secundário) + "Continuar" (primário) **conforme**, inclusive no celular. O
  "Voltar" é **secundário** e fica sozinho à esquerda.
- **Proposta:** "Voltar" vira **terciário**. Sem "Limpar" nem "Redefinir": conforme.

### G-13 — Foco ao abrir a etapa · severidade 1

O GovBR-DS manda pôr o foco no primeiro campo obrigatório. O RADAR põe o foco no **título da etapa** (`h2`),
o que ajuda o leitor de tela a saber em que etapa está. **Proposta:** manter o foco no título só ao trocar
de etapa e pôr no primeiro campo ao abrir a página. Os erros já levam o foco ao primeiro campo inválido
(**conforme**).

### G-14 — Aviso flutuante cobre a prévia · severidade 2

Em 1280 px, o aviso "Formulário preenchido com um exemplo de demonstração" (`ToastRegion.vue`) fica
**em cima da Memória de cálculo**, na coluna da Prévia (ver `capturas/revisao-govbr/novo-etapa3-1280.png`).
**Proposta:** levar o aviso para o canto inferior ou usar uma mensagem (`br-message`) no topo do
formulário, que é o que o padrão recomenda para retorno de ação.

### G-15 — Tabelas: rolagem lateral no notebook · severidade 3

- **Regra oficial (Table, "Responsividade"):** nas grades de 12 e 8 colunas, o conteúdo **quebra a linha**
  dentro das células. A rolagem horizontal é recomendada só na grade de 4 colunas (celular).
- **Hoje, em 1280 px:**
  - **Riscos:** a tabela tem 1159 px num espaço de 950 px. A coluna "Situação" encosta na borda.
  - **Painel, "Maiores riscos residuais":** a tabela tem 640 px num cartão de 497 px. A coluna
    "Apetite (DAR)" aparece cortada ("Dentro d…"), sem barra nem aviso visível (ver
    `capturas/revisao-govbr/painel-1280.png`).
- **Proposta:** no `DataTable.vue`, deixar as etiquetas quebrarem a linha, limitar a largura das colunas
  de texto e, no Painel, mostrar menos colunas (Código, Objeto, Residual) com o link "Ver todos os riscos".

### G-16 — Lista no celular perde a Situação · severidade 2

No celular, cada risco vira um cartão (bom), mas o cartão mostra só Código, Objeto, Residual e Apetite.
**Categoria** e **Situação no fluxo** somem, e a Situação é o que o gestor mais procura ("Aguardando
validação"). **Proposta:** incluir a Situação no cartão.

### G-17 — Atributo ARIA proibido na rolagem da tabela · severidade 2

O axe marcou como "incompleto" o `div.tabela-dados__rolagem`: ele tem `aria-label`, mas não tem papel
(`role`). Pela ARIA 1.2, `aria-label` num `div` genérico é proibido, e o leitor de tela pode ignorá-lo.
**Proposta:** acrescentar `role="region"`. Isso vale para o Painel e para Riscos.

### G-18 — Duas formas de etiqueta para a mesma família de informação · severidade 1

O nível de risco usa uma etiqueta pequena com borda (`RiskBadge.vue`). O apetite e a situação usam uma
pílula maior (`Chip.vue`). Na mesma linha da tabela, os dois estilos competem. **Proposta:** seguir o
`br-tag` (uma altura só, densidade média) nos dois, sem mudar as cores dos níveis.

### G-19 — Campos nativos com visual próprio · severidade 2

No DOM das 3 telas só aparecem `br-button`, `br-tag`, `br-item` e `br-skiplink`. Os campos de texto, as
listas de escolha e as caixas de marcar são nativos, com estilo próprio. Na abordagem híbrida, **manter
os campos nativos** (o `<select>` nativo é mais acessível que o `br-select` personalizado) e alinhar
altura (40 px na densidade média), borda, raio e estados (foco, erro, desabilitado) ao `br-input`.

## 5. Acessibilidade (axe-core)

| Tela | Claro | Escuro | Contraste | Rolagem lateral |
| --- | --- | --- | --- | --- |
| Painel (390 e 1280 px) | 0 violações | 0 | 0 | não |
| Riscos (390 e 1280 px) | 0 violações | 0 | 0 | não |
| Novo risco (390 e 1280 px) | 0 violações | 0 | 0 | não |

Itens que o axe **não conseguiu decidir sozinho** (conferência manual):
- `aria-prohibited-attr` no Painel e em Riscos: é o G-17.
- `color-contrast` nos campos de texto do Novo risco: o axe não descobriu a cor de fundo porque o campo
  fica dentro de um cartão com sombra. Na conferência visual o contraste está adequado (texto escuro
  sobre branco).

> Nesta revisão o axe rodou com um script próprio, porque o `npm run test:a11y` pede o Chromium da versão
> 1.64.1 do Playwright, que não está instalado neste ambiente. As regras (tags WCAG) são as mesmas da
> varredura oficial.

## 6. O que já está conforme (preservar)

- Rótulo sempre visível acima do campo; nenhum placeholder no lugar do rótulo.
- `fieldset` + `legend` em cada etapa; uma coluna, com Probabilidade e Impacto lado a lado (campos que se
  completam, como o padrão permite).
- Erro por campo, com ícone, ligado por `aria-describedby`, e foco no primeiro campo inválido.
- Assistente em 4 etapas (`BrStep`), como o padrão sugere para formulários longos.
- Prévia com a frase padronizada e a memória de cálculo; no exemplo da etapa 3, o Quadro 7 deu o valor
  da tabela fixa (P = 3, I = 4 → 18), e não P × I. O cálculo não foi revisado aqui (fora do escopo).
- "Crítico" usado só para "fora do apetite da DAR"; a faixa de 18 a 25 se chama Extremo.
- Cor primária, anel de foco, cabeçalho, rodapé, trilha (breadcrumb) e link para pular conteúdo (skiplink).

## 7. Decisões para o responsável (antes do plano)

1. **Tamanho do corpo do texto:** 14 px (padrão oficial) ou manter 16 px? Recomendação: **14 px** no corpo e
   nas tabelas, com a escala oficial nos títulos. O usuário que precisar pode ampliar pelo navegador, e o
   `html { font-size: 100% }` continua respeitando essa escolha.
2. **Cinzas neutros oficiais** (G-04) só no tema claro, ou também revisar o escuro? Recomendação: **só o
   claro** nesta rodada.
3. **Fonte Rawline local** (G-07): levar à CGTI agora ou deixar para a homologação?

## 8. Ordem sugerida para o plano de implementação

| Fase | Conteúdo | Achados |
| --- | --- | --- |
| 1 — Tokens | Apontar `--esp-*`, `--raio-*`, `--elevacao-*`, `--ref-cinza-*` e a tipografia para os tokens oficiais; trocar os valores fixos. | G-01 a G-06 |
| 2 — Formulário | `FormField` com "(Opcional)", subtítulo, "Voltar" terciário, espaço entre grupos, foco inicial, aviso fora da prévia. | G-10 a G-14, G-19 |
| 3 — Tabelas e etiquetas | `DataTable` sem rolagem no notebook, `role="region"`, Situação no cartão, etiquetas unificadas. | G-15 a G-18 |
| Fechamento | Varredura `npm run test:a11y` completa (300 combinações), capturas de "depois", `/code-review` medium e PR. | — |

## 9. Comparação com o diagnóstico anterior

Feita **só no fim**, para a revisão ficar independente. O [[diagnostico-ui-2026-11]] (14/11) retratava a
interface **antes** da reformulação. As 5 causas-raiz dele (classes do Bootstrap inexistentes, página
transbordando para os lados, telas que mostravam tudo de uma vez, linguagem de norma e falta de tokens)
**não aparecem mais**. Não há rolagem lateral da página nas 18 combinações, o formulário valida por etapa
e os campos têm rótulo.

O que esta revisão acrescenta: o diagnóstico anterior criou os tokens, mas não os ligou aos valores
oficiais do GovBR-DS. Esta revisão faz essa ponte (G-01 a G-06) e aponta regras do padrão de formulário
e de tabela que o anterior não cobria (G-10, G-11, G-15). A rolagem lateral voltou só **dentro** das
tabelas (G-15), e não na página inteira.

## Capturas desta revisão

Pasta `capturas/revisao-govbr/` (dados de demonstração):
`painel-1280.png` · `riscos-1280.png` · `riscos-390.png` · `novo-erros-1280.png` · `novo-etapa3-1280.png`.
