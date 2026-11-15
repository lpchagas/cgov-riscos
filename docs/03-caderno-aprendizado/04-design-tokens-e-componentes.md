---
tags: [aprendizado, css, design-system, acessibilidade, vue]
---

# 🎓 Aula 4: Design Tokens, Componentes e Telas que Funcionam em Qualquer Tamanho

Nas Aulas 1 a 3 você viu **como o sistema funciona por dentro**: Vue, banco de dados e Docker.
Esta aula explica **como a interface foi construída** na reformulação de 2026-11. São quatro
ideias:

1. **tokens:** cores e medidas com nome, não números soltos;
2. **componentes:** peças reutilizáveis;
3. **responsividade:** a mesma tela no computador e no celular;
4. **acessibilidade:** a tela também funciona para quem usa teclado ou leitor de tela.

> Referência completa: [[design-system]]. Esta aula é a versão "do zero".

---

## 1. Design tokens: dar nome às decisões

### O problema

Antes da reformulação, o código tinha **234 cores escritas à mão**, como `#1351b4`, `#071d41` e
`#ffcd07`. Para mudar o azul principal, era preciso caçar o mesmo número em dezenas de arquivos.
E não havia como ter um **tema escuro**, porque cada cor estava "colada" no lugar.

### A solução: variáveis CSS com nome de **função**

Em `src/styles/tokens.css` cada cor ganhou um nome que diz **para que ela serve**:

```css
:root {
  --cor-primaria: var(--ref-azul-70);   /* botões e links principais */
  --superficie: var(--ref-branco);      /* fundo dos cartões */
  --texto: var(--ref-cinza-95);         /* texto comum */
  --borda: var(--ref-cinza-20);         /* linhas e contornos */
}
```

E o componente **usa o nome**, nunca o número:

```css
.cartao {
  background: var(--superficie);
  border: 1px solid var(--borda);
  color: var(--texto);
}
```

### As três camadas

| Camada | Exemplo | Quem usa |
|---|---|---|
| **Referência:** a paleta "crua" do gov.br | `--ref-azul-70`, `--ref-cinza-95` | só o `tokens.css` |
| **Semântica:** a função da cor | `--cor-primaria`, `--superficie`, `--texto-secundario` | todos os componentes |
| **Domínio RADAR:** cores dos níveis do Quadro 8 | `--risco-alto-fundo`, `--risco-extremo-texto` | selos, matriz e Bow Tie |

### Por que isso libera o tema escuro?

O tema escuro só **troca o valor** dos mesmos nomes:

```css
:root[data-theme='escuro'] {
  --superficie: #1a222c;
  --texto: #e6eaf0;
}
```

Nenhum componente muda. Quando a pessoa escolhe **Aparência → Escuro** no menu do usuário, o
sistema grava `data-theme="escuro"` no `<html>` e tudo se repinta sozinho. É por isso que um
teste automático (`higieneCss.spec.ts`) **proíbe cores fixas** nos componentes: hoje o total
é **0**.

> 💡 **Para texto, use `--texto-marca`, não `--cor-marca-escura`.** O azul-escuro da marca
> serve de **fundo**. Como texto, ele some no tema escuro. Esse foi um dos erros encontrados
> pela auditoria da Fase 3.

### Medidas também são tokens

Espaços (`--esp-1` a `--esp-8`: 4, 8, 12, 16, 24, 32, 48 e 64 px), cantos (`--raio-sm`, `--raio-md`) e o
tamanho mínimo de alvo de toque (`--alvo-minimo: 40px`). Assim todas as telas "respiram" igual.

---

## 2. Componentes: peças que se repetem

Um **componente** é um arquivo `.vue` que resolve **um** problema de interface e é usado em
várias páginas. Os genéricos ficam em `src/components/ui/`, os do padrão gov.br em
`src/components/govbr/` e os específicos de risco em `src/components/radar/`.

| Em vez de… | use… | porque ele já traz… |
|---|---|---|
| um `<span>` colorido com "Alto" | `<RiskBadge classe="Alto" :valor="10.2" />` | ícone + texto + cor e vírgula decimal (`10,2`) |
| `<label>` + `<input>` + texto de erro | `<FormField rotulo="Causas" :erro="erros.causas">` | ligação rótulo ↔ campo, `aria-invalid` e mensagem lida pelo leitor de tela |
| uma `<table>` feita à mão | `<DataTable :colunas :linhas>` | ordenação, paginação, estado vazio e **modo cartão no celular** |
| abas com `<button>` soltos | `<BrTabs v-model:abaAtiva>` | navegação pelas setas ←/→, Home e End |

**Regra de ouro:** se você está prestes a copiar e colar um bloco de HTML+CSS pela terceira vez,
ele deveria ser um componente.

### Componente só exibe, a regra mora em outro lugar

A `MemoriaCalculoBar` mostra "P e I → Inerente × Fator = Residual", mas **não calcula nada**. Os
números chegam prontos da `calculadoraRiscoRadar.ts`, que segue o AGENTS.md: o Quadro 7 é uma
**tabela**, nunca P × I. Separar "mostrar" de "calcular" impede que um ajuste visual quebre uma
regra da Metodologia.

---

## 3. Responsividade: a mesma tela em 360 px e em 1920 px

### Media queries

Uma **media query** aplica um CSS só quando a tela tem certo tamanho:

```css
/* Vale só em telas com até 639 px de largura (celulares). */
@media (max-width: 639.98px) {
  .painel__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

O RADAR usa três pontos de quebra: **640 px** (celular), **768 px** (tabelas) e **1180 px**
(colunas do Painel).

### Caso real da Fase 4: a tabela que escondia o Residual

No celular, a `DataTable` **rolava para o lado dentro do cartão**. Quem abria a lista de Riscos
via Código e Objeto, mas o **Residual e o Apetite ficavam fora da tela**, sem nenhum aviso. Isso
acontecia em 5 páginas.

A solução foi o **modo cartão**: abaixo de 768 px, cada linha vira um bloco e cada célula mostra
o nome da coluna ao lado:

```text
RADAR-2026-001
Objeto de gestão   Gestão e Execução de Processos Críticos…
Residual           ▲ Extremo · 22
Apetite (DAR)      ▲ Crítico
```

O truque está em duas linhas. O HTML guarda o nome da coluna num atributo, e o CSS o exibe:

```html
<td data-rotulo="Residual">…</td>
```

```css
td::before { content: attr(data-rotulo); }  /* escreve "Residual" antes do valor */
```

### Mostrar menos, sem esconder de vez

No Painel do celular, "Precisa da sua atenção" começa com **3 itens** e um botão
**"Mostrar mais 3"**. O botão informa ao leitor de tela se a lista está aberta:

```html
<button aria-controls="lista-atencao" :aria-expanded="verTodaAtencao">Mostrar mais 3</button>
```

Resultado: o Painel no celular caiu de **8.729 px** (antes da reformulação) para **4.109 px**,
sem apagar nenhuma informação. Parte do ganho veio do rodapé: as normas, o contato e os painéis
mudaram para a página **Sobre o RADAR** (`/sobre`), e o rodapé só aponta para lá.

---

## 4. Acessibilidade: a tela precisa funcionar para todo mundo

O governo federal segue o **eMAG** e a **WCAG 2.2 nível AA**. Na prática, o RADAR verifica:

| Regra | Exemplo no RADAR |
|---|---|
| **Contraste** mínimo de 4,5:1 para texto | por isso os tokens do tema escuro são diferentes, não "o claro invertido" |
| **Nunca só pela cor** | o `RiskBadge` tem ícone ▲/▼/— além da cor |
| **Tudo pelo teclado** | Tab chega a todos os botões; as setas trocam de aba |
| **Alvo de toque** ≥ 24 px (usamos 40 px) | `--alvo-minimo` nos botões de ordenar da tabela |
| **Nomes para o leitor de tela** | as células da Matriz dizem "Probabilidade 2, impacto 4, nota 14, Alto, 1 risco" |

> ⚠️ **Cuidado com `display: block` em tabelas.** Quando o CSS muda o `display` de uma
> `<table>`, o navegador pode "esquecer" que aquilo é uma tabela. Por isso a `DataTable` declara
> `role="table"`, `role="row"` e `role="cell"` de forma explícita.

### Como sabemos que está tudo certo?

Um robô (Playwright) abre as 13 telas em **4 larguras** (360, 768, 1280 e 1920 px) e **3 temas**
(claro, escuro e alto contraste), ou seja, 156 combinações. Em cada uma ele roda o **axe-core**,
o verificador de acessibilidade usado no mundo todo. Resultado da Fase 4: **0 violações** e
**nenhuma rolagem lateral**.

---

## 5. Onde o Figma entra

As variáveis **RADAR · tokens** no Figma têm os mesmos nomes do `tokens.css`, e cada componente
da biblioteca está ligado ao seu `.vue` pelo **Code Connect**. Assim, quando você muda algo na
página ✏️ Trabalho, o Claude consegue traduzir de volta para o código com os mesmos tokens.
Veja o passo a passo em [[manual-fluxo-figma-vscode]].

---

## ✍️ Exercícios

1. Abra `src/components/ui/Chip.vue` e encontre quais tokens ele usa. Algum número de cor
   aparece escrito à mão? (Resposta esperada: não, o teste de higiene não deixaria.)
2. No navegador, abra `/riscos`, aperte **F12** e ative o modo celular (390 px). Veja a tabela
   virar cartões. Depois aumente para 800 px e veja voltar a ser tabela.
3. No menu do usuário, troque **Aparência** para **Escuro** e procure, no `tokens.css`, o bloco
   que mudou o fundo dos cartões.
4. Navegue pelo Painel **só com o teclado** (Tab, Shift+Tab, Enter e as setas na Matriz). Você
   consegue chegar ao botão "Mostrar mais"?
