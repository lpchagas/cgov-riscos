# Design — Etapa C: Painel no celular

> **Data:** 2026-11-16 · **Tamanho:** pequeno/médio (uma tela, sem banco) · **Branch:** `feat/c-painel-celular` (a partir da `main`, com B1, B2, B1.1 e B3 mescladas)
> · **Base:** [[ESTADO-ATUAL]], [[decisoes-tecnicas-b3]] §3, [[design-system]] §9 (modo cartão e meta de 3.500 px)

## 1. Por que

No celular (390 px) o Painel mede **4.104 px** (perfil CGOV) e 4.185 px (Gestor). A meta anotada na Fase 4 era
3.500 px, mas exigia tirar cartões, e essa decisão é da CGOV. Além da altura, há alvos de toque pequenos
(14 de 49 elementos clicáveis com lado menor abaixo de 44 px) e o bloco acionável ("Precisa da sua atenção")
vem depois da Matriz. No modo real o problema é maior: "Maiores riscos" mostra até 5 cartões de ~290 px
(a demonstração só tem 3), levando o Painel a mais de 4.600 px.

**Sucesso:** o Painel fica usável em 390 px com **todas as funções que a CGOV usa no computador**,
no modo demonstração e no real, com carregamento, vazio e erro da B3 intactos.

## 2. Medição de partida (390 px, demonstração, perfil CGOV)

Cabeçalho do sistema 108 · título/Ver como 186 · indicadores 430 · Matriz 589 · Atenção 512 · Maiores riscos 867 ·
Nível residual 215 · DAR 188 · Atividade 242 · rodapé 512. Sem rolagem horizontal (página nem blocos internos).
Alvos < 44 px: 5 códigos `RADAR-…` (15 px), 6 links de ação (21 px), "Fundamento" (32), "Mostrar mais" (40), "Ver como" (42).

## 3. Objetivos, não objetivos e anti-objetivos

**Objetivos**
1. Altura em 390 px próxima de **3.500 px** na demonstração, **sem remover nenhum cartão** nem função.
2. Ordem no celular: indicadores → **Precisa da sua atenção** → Matriz → Maiores riscos → resumos.
3. Alvos de toque de pelo menos **44 px** nos elementos do Painel.
4. Teto de altura também no modo real (poucos ou muitos riscos).

**Não objetivos:** mudar o computador (≥ 768 px fica igual); mudar cálculo (Quadros 6, 7 e 8, `calculadoraRiscoRadar.ts`,
gatilho), alcance, RLS, fluxo ou migração; tocar em outras telas; rodapé e cabeçalho do sistema (já enxutos na Fase 4).

**Anti-objetivos:** esconder algo sem caminho de volta; perder carregando/vazio/erro da B3; regredir a varredura
de acessibilidade (0 violações) em qualquer largura ou tema.

## 4. Abordagens consideradas

| | O que | Troca | Decisão |
|---|---|---|---|
| **A. Recolher, sem remover nada** | Resumos finais viram blocos recolhíveis; indicadores compactos; limite de 3 cartões em Maiores riscos | Um toque a mais para ver os 3 resumos | **Escolhida pela CGOV** |
| B. Só o essencial | Resumos saem do celular (ficam nas páginas DAR e Auditoria) | ~3.350 px, mas perde função no celular | Descartada |
| C. Tudo aberto, compactado | Só reduzir espaços | ~3.800 px; não atinge a meta | Descartada |

## 5. Decisões da CGOV (2026-11-16)

- **D-C1:** estratégia A (recolher sem remover).
- **D-C2:** no celular, "Precisa da sua atenção" vem **antes** da Matriz.
- **D-C3:** indicadores **compactos 2×2 sem descrição**: número, rótulo e link; o cartão inteiro é o alvo de toque.
  A descrição continua disponível ao leitor de tela (texto de apoio visualmente oculto).

## 6. Desenho (no celular, < 768 px)

```
[Título + Fundamento + Ver como]
[4 indicadores compactos 2×2]        ~230 px (hoje 430)
[Precisa da sua atenção]             3 itens + "Mostrar mais"
[Matriz 5×5 + legenda]
[Maiores riscos]                     até 3 cartões + "Mostrar mais N" se houver mais
[▸ Riscos por nível residual]        recolhidos: 1 linha cada
[▸ Apetite a riscos (DAR)]
[▸ Atividade recente]
[Rodapé]
```

No computador nada muda: os blocos recolhíveis aparecem sempre abertos e sem botão.

## 7. Calls do design (minhas, para você revisar)

1. **Ordem por CSS (`order`) só no celular**, sem mudar o HTML. Custo: no celular, a ordem do teclado/leitor de tela
   (Matriz primeiro) difere da visual. É onde o uso é por toque; evita mudar a ordem no computador. Se a CGOV preferir
   ordem real igual nas duas, a alternativa é trocar o HTML e reposicionar no computador, com o mesmo custo invertido.
2. **Blocos recolhíveis** com o padrão já usado em "Mostrar mais" (botão + `aria-expanded` + `aria-controls`), num
   componente `BlocoRecolhivel` em `src/components/ui/`, aberto e sem botão ≥ 768 px (CSS, sem piscar).
   Estado aberto/fechado só na tela (não persiste).
3. **Estimativa de altura:** demonstração ~3.400–3.500 px; modo real com 5+ riscos, teto ~3.700 px. A medição final
   entra no resumo; a meta de 3.500 px **não** vira teste que reprova (continua só informando), como hoje.
4. **Alvos de 44 px:** `min-height: 44px` (área clicável, com `padding`/`inline-flex`) nos links de ação, nos códigos
   dentro dos cartões, em "Fundamento" e "Mostrar mais", **apenas no celular**.
5. **Estados da B3:** esqueleto, vazio e erro da página e o estado próprio da Atividade continuam; dentro de um bloco
   recolhido o estado de carregamento/erro da Atividade segue valendo ao abrir (mantém a leitura já feita).
6. **Figma:** seguir o fluxo de cópia de trabalho — a tela "Original" do Painel no celular fica travada; as mudanças
   são desenhadas na cópia "Trabalho" (pasta/exemplos de layout 619366367 e biblioteca RADAR, equipe "cgov"), e o
   Code Connect só é atualizado para componentes novos (tabela de 4 colunas). Figma é referência visual; a medição
   em código manda.

## 8. Verificação

- Medição repetida em 390 px (CGOV e Gestor, demonstração) e com 5+ riscos simulados; alvos < 44 px = 0 no Painel.
- Testes de unidade: regras puras (limite de cartões, ordem) e `BlocoRecolhivel` (abre/fecha, `aria-expanded`).
- `npm test`, `npm run build`, `npm run test:a11y` (0 violações; Painel em 360/390? mantém as 4 larguras e
  carregando/erro), `npm run test:integracao` (com `db:funcoes`), `npm run db:reset && npm run test:db`.
  Sem migração.
- Documentação: [[ESTADO-ATUAL]], [[design-system]] §9 e decisões da etapa C, com os números medidos.

## 9. O que fica para quem executar

Nomes de classes e componentes, detalhes de CSS, texto exato dos botões (em português claro) e a forma de
simular 5+ riscos na medição (script fora do repositório ou teste de unidade).
