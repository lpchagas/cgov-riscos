---
tipo: manual
data: 2026-11-15
publico: "Equipe técnica da CGOV — inclusive quem está começando em programação"
relacionados: "[[design-system]] · [[ESTADO-ATUAL]] · [[2026-11-15-varredura-a11y-design]]"
tags: [acessibilidade, wcag, axe-core, playwright, testes]
---

# Varredura de acessibilidade do RADAR (`npm run test:a11y`)

> **Em uma frase:** um único comando abre o RADAR num navegador de verdade, passa por **(18 + 4) telas ×
> 5 larguras × 3 temas = 330 combinações** e **reprova** se encontrar qualquer problema de
> acessibilidade (WCAG 2.2, níveis A e AA) ou se alguma página rolar para o lado.

## 1. O que é isso, sem jargão

- **Acessibilidade** é garantir que todas as pessoas usem o sistema, inclusive quem é cego (e usa
  um *leitor de tela*, que lê a página em voz alta), quem tem baixa visão (e usa o tema de alto
  contraste ou amplia a tela) e quem navega só pelo teclado.
- A **WCAG 2.2** é a norma internacional com as regras de acessibilidade. O governo federal exige
  os níveis **A** e **AA** (eMAG / padrão gov.br).
- O **axe-core** é um "corretor automático" dessas regras: ele lê o HTML e as cores da página e
  aponta o que está errado. Ele não substitui o teste com pessoas, mas pega a maior parte dos erros
  comuns (contraste fraco, botão sem nome, imagem sem descrição, atributo ARIA errado…).
- O **Playwright** é o "robô" que abre o navegador (Chromium), entra em cada tela, escolhe o tema e
  a largura e chama o axe-core.

## 2. Primeira vez: instalação

```bash
npm install                      # instala tudo do package.json, inclusive o Playwright
npx playwright install chromium  # baixa o navegador do robô (só na primeira vez, ~150 MB)
```

Se o Chromium já estiver instalado (pasta `~/.cache/ms-playwright/chromium-1248`, versão do Playwright 1.64.1), o segundo
comando termina na hora.

## 3. Como rodar

```bash
npm run test:a11y
```

O que acontece:

1. O Playwright sobe o servidor do RADAR sozinho, na porta **5199** (não precisa rodar `npm run dev`).
2. Roda **344 testes**: as 330 combinações (as larguras são 360, **390**, 768, 1280 e 1920; o 390 entrou na etapa C; a etapa 3 do formulário, `novo-etapa3`, entrou com a LAC-12; a etapa 4, `novo-etapa4`, com o limite numérico de alerta do KRI, entrou com a LAC-03), 4 *autoverificações* (seção 6), o teste do menu do gestor e 9 testes de navegador do Painel no celular (`painelCelular.a11y.ts`, etapa C). Leva cerca de 6 minutos.
3. No fim, desliga o servidor e mostra o placar, por exemplo `344 passed`.

Resultado esperado hoje: **344 passed**. Qualquer `failed` reprova o comando.

**Rodar só uma parte** (o filtro `-g` procura no nome do teste; as partes do nome são separadas por espaço):

```bash
npm run test:a11y -- -g "painel"                 # o Painel em todas as larguras e temas
npm run test:a11y -- -g "escuro"                 # todas as telas no tema escuro
npm run test:a11y -- -g "contraste 360 px dar"   # uma combinação só
```

## 4. Como ler o resultado

No terminal, cada teste aparece com o nome `tema › largura › tela`, por exemplo:

```
✓  claro › 360 px › painel (1.1s)
✘  claro › 360 px › plano (1.0s)
```

Quando um teste falha, a mensagem diz **qual regra** quebrou, **quantos elementos**, **onde está o
primeiro** (seletor CSS) e **o que corrigir**:

```
violações WCAG
+   "aria-prohibited-attr (1 elementos) em .progresso: aria-label attribute cannot be used on a p with no valid role attribute.",
```

Leia assim: regra `aria-prohibited-attr`, 1 elemento, o primeiro tem a classe `.progresso`, e o
problema é usar `aria-label` num `<p>`. Para entender a regra, pesquise o nome dela: a
documentação oficial fica em `https://dequeuniversity.com/rules/axe/4.10/<nome-da-regra>`.

Se a falha for de **rolagem lateral**, a mensagem lista até 3 elementos que vazam pela direita da tela:

```
rolagem lateral: div.cartao, table.tabela
```

**Relatório visual**, com cada teste, o tempo e o erro completo:

```bash
npx playwright show-report   # abre playwright-report/index.html no navegador
```

**Altura do Painel no celular** (só informação, não reprova). Aparece no terminal assim:

```
[info] claro · 360 px · altura do Painel: 4271 px (meta da CGOV: 3.500 px)
```

A meta de 3.500 px **só informa**, não reprova. A CGOV decidiu (D-C1) **não tirar cartões** do Painel
(os resumos finais apenas recolhem). Os números atuais estão na [[design-system]] §11: 3.690 px (CGOV) e
3.771 px (Gestor) em 390 px. Esta varredura registrou 3.793 px em 360 px, uma largura mais estreita, em que
o texto quebra em mais linhas. O exemplo acima (4271 px) é antigo, de antes da etapa C.

## 5. Página nova? Inclua na varredura

Abra `tests/a11y/telas.ts` e acrescente **uma linha** na lista `TELAS`:

```ts
{ nome: 'relatorios', rota: '/relatorios', titulo: 'Relatórios' },
```

- `titulo` é o texto **exato** do `<h1>` da página. O RADAR cria esse título a partir do campo
  `titulo` da rota em `src/router/index.ts`, então basta copiar de lá.
- Tela de assistente (`avancarEtapas`)? Declare também `provaEtapa`: o elemento que só existe na
  etapa certa (ex.: `{ papel: 'combobox', nome: /Alerta quando o valor for/ }` na etapa 4). Sem ele,
  um clique que não avançasse faria a varredura medir a etapa errada (falso verde).
- Se a página abrir direto numa aba pelo endereço (`?aba=...`), acrescente `aba: 'Rótulo da aba'`.

Pronto: ela passa a ser testada nas 5 larguras × 3 temas (15 testes novos). Se o título da página
mudar, atualize aqui também; senão o teste falha com "não mostrou o título esperado".

## 6. Por que existem as 4 "autoverificações"

Um teste que nunca falha não prova nada. Se o axe-core deixasse de carregar, todas as telas dariam
"0 violações" e pareceria que está tudo certo. Por isso, antes das 330 combinações:

- **"o axe acusa uma imagem sem texto alternativo"** coloca de propósito uma imagem sem descrição
  no Painel e exige que o axe a acuse;
- **"a checagem acusa rolagem lateral"** coloca um bloco de 3.000 px num celular e exige que a
  rolagem seja detectada;
- **"rota inexistente não passa por engano"** abre um endereço que não existe. O RADAR redireciona
  para o Painel, e a varredura precisa perceber que caiu na tela errada;
- **"ficha de risco inexistente não passa por engano"** abre a Ficha de um risco que não existe
  ("Risco não encontrado") e exige que a varredura reprove.

Além disso, cada teste das 330 combinações confere quatro coisas antes de rodar o axe:
1. o `<h1>` tem o título **exato** da tela;
2. o endereço final é o pedido (sem redirecionamento);
3. a aba certa está selecionada, quando a tela abre numa aba;
4. o tema pedido foi aplicado (`<html data-theme="escuro">`, por exemplo).

**Teste do menu do gestor.** Além das telas, um teste avulso abre o Painel com o perfil `gestor`
(gravado no navegador antes da página abrir) e exige que o menu **não** tenha "Importar riscos" nem
"Usuários e perfis", e que abrir `/importar` leve de volta ao Painel. Telas sem o campo `perfil`
em `telas.ts` abrem com o perfil padrão `cgov`; "Usuários e perfis" é só da CGOV.

## 7. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `Port 5199 is already in use` ou "Timed out waiting… from config.webServer" | Outro programa está usando a porta 5199 | Feche-o. Se quiser reaproveitar um servidor, ele precisa ser `npx vite --port 5199` **desta mesma pasta** |
| Todos os testes falham com "não mostrou o título esperado" ou "o tema não foi aplicado" | A porta 5199 está servindo **outro** sistema, ou o RADAR não abriu | Confira `http://localhost:5199` no navegador |
| `Executable doesn't exist at …chromium…` | O navegador do robô não foi instalado | `npx playwright install chromium` |
| `npm run build` falha com "Type 'Page' is missing the following properties" | `@playwright/test` e `playwright-core` ficaram em versões diferentes | Atualize os dois **juntos**, na mesma versão: `npm install -D @playwright/test@X playwright-core@X --save-exact` e depois `npx playwright install chromium` |
| A varredura passa, mas uma correção que você acabou de fazer "não aparece" | Ficou aberto na porta 5199 um servidor do RADAR de **outra pasta ou outra branch**, e a varredura o reaproveitou | Feche todos os `vite` antes de rodar (ou confira, no terminal onde ele está aberto, que é **esta** pasta). Na dúvida, não deixe servidor aberto: a varredura sobe o dela |
| Um teste passou ontem e falha hoje sem mudança na tela | Atualização do axe-core com regra mais rigorosa | Leia a regra (seção 4). Foi assim que apareceu o defeito do progresso do plano (seção 8) |

## 8. Histórico

- **2026-11-15 — varredura entra no repositório.** Até a Fase 4 ela era um script temporário,
  fora do projeto. Ao trocar pelo `@axe-core/playwright` 4.10.2 (que usa o axe-core **4.10.3**), a
  varredura encontrou um defeito que a versão anterior (axe-core 4.10.2) não acusava. Na aba
  **Plano de ação** do Monitoramento, o progresso ("1 de 4 ações concluídas") ficava num
  `aria-label` de um `<p>`, que leitores de tela ignoram, e o texto visível estava escondido deles.
  Corrigido: o texto visível agora é lido por todos, e um teste de unidade protege contra a volta do
  erro (`tests/unit/monitoramentoPagina.spec.ts`).
- **2026-11-15 — Playwright 1.48.2 → 1.64.1.** A 1.48.2 tinha um alerta de segurança de severidade
  alta: baixava o navegador sem verificar o certificado do servidor (GHSA-7mvr-c777-76hp). Com o
  navegador novo, as 158 verificações continuaram passando.

## 9. Onde está cada coisa

| Arquivo | Para quê |
|---|---|
| `playwright.config.ts` | Configuração: porta, servidor automático, navegador, relatórios |
| `tests/a11y/telas.ts` | **O que** é verificado: telas, larguras, temas e regras WCAG |
| `tests/a11y/varredura.a11y.ts` | **Como** é verificado: abrir a tela, rodar o axe, medir a rolagem |
| `playwright-report/`, `test-results/` | Saídas geradas (não vão para o Git) |
