---
tipo: manual
data: 2026-11-14
publico: "Desenvolvedor(a) da CGOV — iniciante em programação"
relacionados: "[[design-system]] · [[2026-11-14-reformulacao-ui-radar-plan]]"
tags: [figma, code-connect, mcp, fluxo-de-trabalho, vscode, claude-code]
---

# Manual do fluxo Figma ↔ VS Code do RADAR

> **Em uma frase:** você desenha e testa no **Figma**, cola o link do quadro no **Claude Code**
> (dentro do VS Code), e o Claude descobre o que mudou, ajusta o código Vue, roda os testes e
> atualiza a cópia original no Figma.

---

## 1. O mapa do fluxo

```
   FIGMA (arquivo "RADAR — Painel")                       VS CODE (projeto cgov-riscos)
 ┌────────────────────────────────────┐               ┌─────────────────────────────────────┐
 │ 📌 Original — <tela>  (travada)    │──── compara ──▶│ Claude Code lê os dois quadros pelo │
 │ ✏️ Trabalho — <tela>  (você edita) │                │ MCP do Figma, lista as diferenças,  │
 │ Componentes RADAR  (biblioteca)    │◀── Code ──────│ edita os .vue, roda npm test/build  │
 │   + variáveis "RADAR · tokens"     │    Connect     │ e mostra o resultado no npm run dev │
 └────────────────────────────────────┘               └─────────────────────────────────────┘
          ▲                                                          │
          └────── o Claude atualiza a "Original" depois que você aprova ┘
```

**Por que existem duas cópias de cada tela?** O Figma só mostra ao Claude como o quadro está
**agora** — não guarda um "antes e depois" que ele consiga ler. A página **📌 Original** é o
retrato do código atual; a **✏️ Trabalho** é onde você mexe. Comparando as duas, o Claude
encontra exatamente o que você mudou.

---

## 2. Onde fica cada coisa

| O quê | Onde | Observação |
|---|---|---|
| Arquivo do Figma | equipe **cgov** → "RADAR — Painel" | Sempre trabalhe na equipe **cgov** (plano Education, 200 consultas/dia). A outra equipe só tem 20 consultas **por mês**. |
| Página **Componentes RADAR** | dentro do arquivo | É a **biblioteca** publicada. Cada componente está ligado a um `.vue` pelo Code Connect. |
| Variáveis **RADAR · tokens** | painel *Variables* | Espelham `src/styles/tokens.css`. No Dev Mode, cada cor mostra o nome do código, ex.: `var(--cor-primaria)`. |
| Páginas **📌 Original — &lt;tela&gt;** | dentro do arquivo | **Travadas. Não edite.** Uma por tela: Painel, Apetite (DAR), Aprovações, Monitoramento, Ficha do risco, Novo risco, Objetos de gestão, Auditoria, Importar riscos e Sobre o RADAR. |
| Páginas **✏️ Trabalho — &lt;tela&gt;** | dentro do arquivo | Aqui você testa ideias. Cada uma tem o quadro de computador (1440) e o de celular (390). |
| Projeto | VS Code → pasta `cgov-riscos` | O Claude Code fica no painel lateral (ícone do Claude). |
| Regras de negócio | `AGENTS.md` | O Claude **não** muda cálculos por causa de um desenho (ver §8). |

---

## 3. As 6 regras de ouro

1. **Edite só na página "✏️ Trabalho"** (ou na página "Componentes RADAR", quando for mudar um componente).
2. **Cores, espaços e cantos: use as variáveis** (painel direito → ícone de variável ◇) em vez de
   digitar um código de cor. Assim o Claude sabe qual *token* mudar no código.
3. **Prefira trocar propriedades da instância** (texto, variante, "Com ícone"…) a "desmontar" o
   componente (*Detach instance*). Instância desmontada perde a ligação com o código.
4. **Uma mudança por pedido** (ou um grupo pequeno e relacionado). Pedidos menores = revisão mais fácil.
5. **Sempre mande o link do quadro** (não da página inteira) — ver §4.
6. **Diga o que mudou e por quê.** O Claude encontra as diferenças, mas o *porquê* ajuda a
   decidir o melhor jeito de implementar (ex.: "para caber no celular").

---

## 4. Como copiar o link certo

1. No Figma, clique no quadro (o retângulo da tela inteira ou o componente).
2. Botão direito → **Copiar/colar como → Copiar link da seleção** (*Copy link to selection*).
3. O link tem este formato — o pedaço `node-id` é o "endereço" do quadro:

```
https://www.figma.com/design/T1AuuL9jEfqkP7uoAPTUFF/RADAR-—-Painel?node-id=48-549
                                 └── arquivo ──┘                      └ quadro ┘
```

> ⚠️ Link **sem** `node-id` (o da barra de endereço da página) obriga o Claude a procurar o quadro
> e gasta mais consultas do seu limite diário.

---

## 5. Receita A — mudar o layout de uma PÁGINA

### Passo a passo
1. Abra **✏️ Trabalho — Painel** e faça a mudança no quadro de computador e/ou celular.
2. Copie o link do quadro alterado (§4).
3. No VS Code, abra o painel do **Claude Code** e escreva o pedido (exemplos abaixo).
4. O Claude vai: ler o quadro de trabalho e o original → **listar as diferenças** → perguntar se
   algo for ambíguo → editar o código → rodar `npm test` e `npm run build` → mostrar capturas.
5. Confira com `npm run dev` (ou nas capturas que ele mostrar).
6. Se aprovar, diga **"aprovado, atualize a Original"**. O Claude copia a tela de trabalho para a
   página Original e trava de novo.
7. Quando quiser guardar no Git: **"faça o commit"**.

### Exemplos de pedidos (copie e adapte)

**Mudança visual simples**
```text
Ajustei o Painel no Figma: troquei a ordem dos indicadores (Críticos agora é o primeiro)
e aumentei o espaço entre os cartões para 24 px.
Link: https://www.figma.com/design/T1AuuL9jEfqkP7uoAPTUFF/...?node-id=48-549
Compare com a Original e aplique no código.
```

**Mudança de responsividade (celular)**
```text
No quadro de celular do Painel, coloquei "Precisa da sua atenção" ANTES da Matriz,
porque no celular o gestor precisa ver as pendências primeiro. No computador fica como está.
Link: https://www.figma.com/design/T1AuuL9jEfqkP7uoAPTUFF/...?node-id=48-847
```

**Texto (microcopy)**
```text
Mudei os textos do cartão "Aguardando homologação" no Figma. Aplique no código e
confira se o mesmo texto aparece em outros lugares (menu, aprovações) para manter igual.
Link: ...?node-id=48-549
```

**Só quero opinião antes de mexer no código**
```text
Fiz duas versões da tabela "Maiores riscos residuais" na página Trabalho (quadros A e B).
Avalie acessibilidade e padrão gov.br e recomende uma. NÃO altere o código ainda.
Links: ...?node-id=XX-YY  e  ...?node-id=XX-ZZ
```

---

## 6. Receita B — mudar um COMPONENTE da biblioteca

Use quando a mudança deve valer **em todas as telas** (ex.: o cantinho do StatCard, a cor do Chip).

1. Vá na página **Componentes RADAR** e altere o componente principal (o de contorno roxo ◆).
2. **Publique**: *Assets → Libraries → Publish changes*.
3. Copie o link do componente (§4) e peça ao Claude.
4. O Claude altera o `.vue` correspondente (ele sabe qual é pelo Code Connect) e, se preciso, o
   `tokens.css`; roda os testes de componente (`componentesUi.spec.ts`) e de higiene de CSS.

**Exemplo**
```text
Mudei o componente StatCard na biblioteca: o número agora fica ao lado do rótulo (e não embaixo)
e o link "Ver lista" virou um ícone de seta no canto. Já publiquei.
Link: https://www.figma.com/design/T1AuuL9jEfqkP7uoAPTUFF/...?node-id=5-47
Atualize o StatCard.vue mantendo a acessibilidade (o cartão inteiro continua sendo o link).
```

**Exemplo com token**
```text
Na variável "cor/primaria-suave" troquei o azul-claro por um tom um pouco mais forte.
Atualize --ref-azul-10 / --cor-primaria-suave no tokens.css e confira o contraste (WCAG AA).
```

---

## 7. Receita C — o caminho inverso (código → Figma)

Quando o Claude cria ou migra uma página no código (ex.: Fase 3), peça para levá-la ao Figma:

```text
Leve a página "Apetite (DAR)" para o Figma: versões computador e celular,
com cópia Original travada e cópia de Trabalho, usando os componentes da biblioteca RADAR.
```

E quando surgir um **componente novo**, o Claude cria na biblioteca e entrega a tabela de Code
Connect com 4 colunas — **Componente no Figma | Arquivo no código | Component name | Add
instructions for MCP**. Você então: publica a biblioteca → *Dev Mode → Connect components* →
preenche os campos.

> **Component name** é sempre o nome do arquivo `.vue` sem extensão (ex.: `MatrizCalorAssimetrica`),
> mesmo quando o nome no Figma é outro (ex.: `MatrizCelula`).

---

## 8. O que o Figma NÃO muda sozinho (regras invioláveis)

O desenho manda na **aparência**; as **regras de negócio** vêm das Minutas e do `AGENTS.md`.
Se um desenho contradizer uma regra, o Claude vai **avisar e não aplicar**. Exemplos:

| No Figma você… | O Claude faz |
|---|---|
| muda o número de uma célula da Matriz (ex.: 14 → 8) | **Não aplica.** O valor vem do Quadro 7 (`MATRIZ[impacto][probabilidade]`), nunca de P × I. |
| escreve "Crítico" num selo de nível 18–25 | **Corrige para "Extremo".** "Crítico" é estar fora do apetite da DAR. |
| arredonda "8,4" para "8" num selo | **Mantém 8,4.** O Quadro 8 é aplicado sem arredondar. |
| escreve "PGR" | **Troca por "Plano de Gestão de Riscos".** |
| tira o texto de um selo e deixa só a cor | **Mantém o texto.** Nível nunca é comunicado só por cor (WCAG 1.4.1). |
| coloca texto cinza-claro sobre branco | **Avisa** e propõe um token com contraste ≥ 4,5:1. |

---

## 9. Depois que o código mudou

1. **Veja funcionando:** `npm run dev` → abra o endereço mostrado no terminal.
2. **Peça a atualização da Original:** "aprovado, atualize a Original do Painel".
3. **Guarde no Git:** "faça o commit" (o Claude escreve a mensagem explicando a mudança).
4. **Publique quando quiser:** "faça o push" (envia ao GitHub).

---

## 10. Limites e cuidados

| Limite | O que significa na prática |
|---|---|
| 200 consultas do MCP por dia (equipe cgov) | Um pedido de página costuma usar de 3 a 10. Links com `node-id` economizam. |
| Code Connect: 1 biblioteca + 1 framework | A biblioteca é a **RADAR — Painel**, framework **Vue**. O kit gov.br serve como referência visual, sem ligação. |
| O Claude não consegue ligar componentes pelo MCP neste plano | As ligações do Code Connect são feitas **por você** na janela *Connect components*. |
| Conta pessoal (Gmail) no Figma | Use dados de demonstração. Antes de levar dados reais de riscos, confirme com a CGTI. |
| Fonte | A **Rawline** está instalada; se um texto aparecer em outra fonte, avise. |

---

## 11. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Rate limit" / Claude não consegue ler o Figma | Arquivo fora da equipe cgov, ou limite diário | Mova o arquivo para a equipe **cgov**; espere o dia seguinte. |
| O Claude diz que não achou o quadro | Link sem `node-id` | Copie o link pela opção *Copy link to selection*. |
| Componente mudou no Figma mas o Claude não percebeu | Biblioteca não publicada | *Assets → Libraries → Publish changes*. |
| Em uma tela, um componente parou de atualizar | Instância desmontada (*Detach*) | Troque por uma instância nova do componente. |
| Código e Figma divergem "do nada" | A Original não foi atualizada após um commit | Peça: "atualize a Original da página X a partir do código". |

---

## 12. Glossário rápido

- **Quadro (frame):** o retângulo que contém uma tela ou parte dela.
- **Componente / instância:** o componente é o "molde" (na biblioteca); a instância é a cópia usada na tela.
- **Variante:** versões de um mesmo componente (ex.: Chip `tom=perigo`, `tom=sucesso`).
- **Variável (token):** um valor com nome (ex.: `cor/primaria`) usado no Figma e no código.
- **Code Connect:** a ligação "componente do Figma ↔ arquivo `.vue`".
- **MCP:** o "conector" que deixa o Claude ler e escrever no Figma.
- **Dev Mode:** o modo do Figma voltado para desenvolvedores (`</>` na barra inferior).

