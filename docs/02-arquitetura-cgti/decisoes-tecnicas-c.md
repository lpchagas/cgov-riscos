# Decisões técnicas da etapa C (Painel no celular)

> **Arquivo congelado em 2026-11-21 (histórico).** Decisões vigentes: nenhum ADR novo: as decisões do Painel no celular continuam valendo aqui; a interface segue ADR-0004 e ADR-0015. Não edite este arquivo; novas decisões vão em `docs/adr/`.

> **Para que serve este documento:** registrar, num lugar só e versionado, as decisões da etapa C que
> **mudam o comportamento** do Painel em telas pequenas. É o irmão de [[decisoes-tecnicas-b3]]. Cada
> linha diz **o que** foi decidido, **por quê** e **qual o custo ou efeito**.
>
> Base: spec [[2026-11-16-etapa-c-painel-celular-design]], plano [[2026-11-16-etapa-c-painel-celular-plan]].
> Normas: minutas da Política (SEI `024241420`) e da Metodologia (SEI `024421455`), até a publicação.
> Esta etapa **não** mexe em cálculo (Quadros 6, 7 e 8), alcance, RLS, fluxo nem migração.
>
> Códigos: **D-C1 a D-C3** = decisões do dono do produto (CGOV) em 2026-11-16, antes da execução;
> **C-1 em diante** = calls tomadas no plano e na execução (cada uma com o custo se estiver errada).

## 1. Decisões da CGOV (2026-11-16)

| Código | O que | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **D-C1** | **Recolher sem remover:** os três resumos finais ("Riscos por nível residual", "Apetite a riscos (DAR)", "Atividade recente") viram blocos recolhíveis no celular, **fechados** ao abrir. Nenhum cartão sai do Painel. | O Painel de 4.104 px estava longo, mas tirar cartões tiraria função da CGOV no celular. | Um toque a mais para ver cada resumo. No computador nada muda (abertos, sem botão). |
| **D-C2** | **"Precisa da sua atenção" vem antes da Matriz** no celular. | É o bloco acionável: quem abre o Painel no celular quer ver primeiro o que precisa de ação. | A Matriz desce cerca de 600 px. Ver C-2 (ordem só por CSS). |
| **D-C3** | **Indicadores compactos 2×2, sem descrição:** número, rótulo e link; o cartão inteiro é o alvo de toque. | Os 4 indicadores ocupavam 430 px; compactos ocupam cerca de metade. | A descrição agora só existe para **leitor de tela** (texto de apoio visualmente oculto). Quem enxerga não lê mais a descrição no celular. |

## 2. Calls do plano e da execução

| Código | O que | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **C-1** | **Breakpoint do celular em 639,98 px** (consulta `max-width: 639.98px`), **não** 768 px. O gancho `useCelular()` e o CSS usam a mesma consulta (`CONSULTA_CELULAR`). | O Painel já tinha regras de celular nesse ponto de corte; de 640 a 767 px é tablet, e a tabela vira cartão sozinha abaixo de 768 px. O decimal evita que 640 px caia nos dois lados. | O "modo cartão" das tabelas (< 768 px, Fase 4) e o "modo celular" do Painel têm cortes diferentes. É um desvio declarado da spec (que dizia menos de 768 px). |
| **C-2** | **Ordem só por CSS (`order`), sem mudar o HTML.** | Muda só o celular e não mexe no computador. | **No celular, a ordem do teclado e do leitor de tela (Matriz antes da Atenção) é diferente da ordem visual.** Se a CGOV preferir ordem real igual nas duas, é preciso trocar o HTML e reposicionar no computador (mesmo custo, invertido). **Aprovada pelo responsável pelo projeto** ao aprovar o design da etapa C em 2026-11-16 (spec §7, call 1, que descrevia a decisão com esse custo). Se a CGOV mudar de ideia: trocar a ordem no HTML e reposicionar no computador. |
| **C-3** | **`BlocoRecolhivel`** (`src/components/ui/BlocoRecolhivel.vue`): botão com `aria-expanded` e `aria-controls`, padrão já usado em "Mostrar mais". O estado aberto/fechado **não é salvo**. Só recolhe no celular; no computador o título é `h2` e o corpo fica sempre visível. | Um componente só, testável, no padrão que a equipe já conhece. | Ao recarregar a página os blocos voltam fechados. |
| **C-4** | **Alvos de toque de 44 px no celular, inclusive no `PageHeader` compartilhado** (link "Fundamento"). | WCAG 2.5.8 pede alvo mínimo; o `PageHeader` é usado por todas as telas. | **Todas as telas** ganham a altura de 44 px no "Fundamento" no celular. Os alvos custaram cerca de **150 px** de altura no Painel (ver seção 3). |
| **C-5** | **O 390 px entrou na varredura de acessibilidade.** As larguras passam a ser 360, 390, 768, 1280 e 1920. | Medimos e projetamos para 390 px; a varredura tem de olhar a mesma largura. | Mais combinações e mais tempo (ver [[varredura-acessibilidade]]). |
| **C-6** | **A meta de 3.500 px só informa**, não reprova teste. O teste `painelCelular` registra a altura. | A altura depende de dado e de texto real; um teste que quebra por 1 px de conteúdo seria ruído. | **A meta NÃO foi atingida** (ver seção 3). |
| **C-7** | **Limite de 3 cartões em "Maiores riscos residuais"** no celular, com "Mostrar mais N". Vale também no modo real. | No modo real a lista chegava a 5 cartões de ~290 px (Painel acima de 4.600 px). | Quem tem mais de 3 riscos toca em "Mostrar mais" para ver o resto. |
| **C-8** | **`StatCard` ganhou a propriedade `compacto`** (não uma variante nova de componente). | Reaproveita o cartão existente. | Na biblioteca do Figma a variante "compacto" ainda não existe (ver seção 4). |

## 3. Medição final (390 px, demonstração, blocos fechados)

Repetida em 2026-11-16 com um navegador de verdade (Chromium, `scrollHeight`), nos perfis CGOV e Gestor.

| Perfil | Antes (partida) | Depois | Sem os alvos de 44 px | Meta |
| --- | --- | --- | --- | --- |
| CGOV | 4.104 px | **3.690 px** | 3.537 px | 3.500 px |
| Gestor | 4.185 px | **3.771 px** | 3.618 px | 3.500 px |

- **A meta de 3.500 px NÃO foi atingida.** O Painel ficou **190 px (CGOV) e 271 px (Gestor) acima** da meta,
  e a estimativa da spec (3.400 a 3.500 px) saiu otimista. Ganhamos 414 px em relação à partida (cerca de 10 %).
- Sem os alvos de 44 px (C-4) daria 3.537 / 3.618 px: os alvos custaram cerca de 150 px. Nós trocamos altura por
  facilidade de toque, de propósito.
- Alvos com lado menor que 44 px no Painel (blocos abertos): **0** nos dois perfis (antes: 14 de 49).
- Sem rolagem lateral nos dois perfis.
- **Ordem dos blocos no celular (visual):** Painel (título) → indicadores → Precisa da sua atenção → Matriz de
  riscos inerentes → Maiores riscos residuais → Riscos por nível residual → Apetite a riscos (DAR) → Atividade
  recente.
- **Modo real com 5 ou mais riscos: NÃO foi medido em navegador** (a demonstração só tem 3 riscos). O limite
  de 3 cartões em "Maiores riscos" (`maioresVisiveis`, testado com 3, 4 e 5 riscos em
  `tests/unit/painelCelular.spec.ts`) limita o teto, por lógica, a algo próximo de 3.690 px + o botão
  "Mostrar mais" (cerca de 56 px), ou seja, cerca de 3.750 px. É **estimativa, não medição**.
- O Figma (3.346 px) é um desenho com dados de exemplo; a medição no código é que vale.

## 4. Figma e Code Connect

Arquivo "RADAR — Painel" (`T1AuuL9jEfqkP7uoAPTUFF`, equipe cgov). O quadro **"Painel — celular (390) · TRABALHO"**
(nó `48:847`) foi atualizado: indicadores 2×2 compactos, Atenção antes da Matriz, Maiores riscos com 3 cartões e
"Mostrar mais", três `BlocoRecolhivel` recolhidos. Componente novo `BlocoRecolhivel` (conjunto `59:927`, página
Componentes RADAR, variantes `aberto=sim` e `aberto=nao`). Os quadros **Originais** (`6:43` e `8:307`) ficaram
intactos, como manda o fluxo de cópia de trabalho.

**Pendências do Figma:** criar a variante `compacto` do `StatCard` na biblioteca (hoje é ajuste por instância);
atualizar os quadros de computador do Trabalho; **republicar a biblioteca** (Assets, Libraries, Publish changes)
e **ligar o Code Connect à mão** no Modo Dev (o plano atual não permite fazer isso pelo MCP).

Tabela de ligação (4 colunas):

| Componente no Figma | Arquivo no código | Component name | Add instructions for MCP |
| --- | --- | --- | --- |
| BlocoRecolhivel (variantes `aberto=nao` / `aberto=sim`) | `src/components/ui/BlocoRecolhivel.vue` | BlocoRecolhivel | Só recolhe no celular (menos de 640 px); no computador o título é h2 e o corpo fica sempre visível. Props: `id` (obrigatório), `titulo`, `abertoNoCelular` (`aberto=sim`). Slot `acao` = link do cabeçalho (ex.: "Abrir DAR", "Auditoria"); slot padrão = corpo. Botão com `aria-expanded` e `aria-controls`; alvo de toque mínimo 44 px. Estado não é salvo. Textos em pt-BR; nunca usar a sigla "PGR" para Plano de Gestão de Riscos (escrever por extenso). |
| StatCard | `src/components/ui/StatCard.vue` | StatCard | Props: `rotulo`, `valor`, `descricao`, `icone`, `tom` (neutro, info, sucesso, aviso, perigo), `para`, `compacto`. No celular usar `compacto` (só rótulo e número; descrição e "Ver lista" ficam só para leitor de tela). Cor de destaque só no número. "Crítico" = nível residual fora do apetite da DAR, nunca o nível 18 a 25 (esse é "Extremo"). |
| RiskBadge | `src/components/ui/RiskBadge.vue` | RiskBadge | Níveis: Baixo (1 a 5), Médio (> 5 a 10), Alto (> 10 a 17), Extremo (> 17 a 25) conforme o Quadro 8. Aplicar as faixas ao valor exato, sem arredondar (10,2 é Alto; 17,1 é Extremo). Nunca chamar 18 a 25 de "Crítico". Risco inerente vem da tabela fixa do Quadro 7, sem P x I. |
| MatrizCelula | `src/components/radar/MatrizCalorAssimetrica.vue` (a célula é parte deste componente; **não existe** arquivo `MatrizCelula.vue`) | MatrizCalorAssimetrica | Valores das 25 células vêm do Quadro 7 (assimétrico: P=1, I=5 -> 15; P=5, I=1 -> 11), nunca de P x I ou P + I. |
| PageHeader | `src/components/ui/PageHeader.vue` | PageHeader | Título da página + subtítulo; textos em pt-BR; escrever Plano de Gestão de Riscos por extenso (nunca "PGR"). |
| BrFooter | `src/components/govbr/BrFooter.vue` | BrFooter | Rodapé gov.br padrão; usar sempre a instância da biblioteca. |

## 5. Pendências da etapa C

- **Meta de 3.500 px não atingida** (3.690 / 3.771 px). Para descer mais seria preciso aliviar o conteúdo
  (por exemplo, abrir mão do limite de 44 px nos alvos secundários ou tirar a Matriz do celular). Decisão da CGOV.
- **Descrição dos indicadores só para leitor de tela** (D-C3). Se a CGOV sentir falta, reavaliar.
- **Ordem do teclado e do leitor de tela diferente da ordem visual no celular** (C-2).
- **Figma:** variante `compacto` do `StatCard`; quadros de computador do Trabalho; republicar a biblioteca;
  ligar o Code Connect à mão (seção 4).
- **Menores adiados nas revisões** (sem efeito para o usuário hoje):
  - Cabeçalho do `BlocoRecolhivel` usa `align-items: center`, enquanto o `.cartao__cabecalho` usa linha de base;
    conferir visualmente no computador.
  - Tipos verbosos `Awaited<ReturnType<...>>` em um teste; import de `useCelular` entre `vue` e `vue-router`.
  - A largura do botão do `BlocoRecolhivel` e o `position: relative` do `StatCard` compacto podem ser revistos.
  - O teste de 390 px diz abrir "Mostrar mais", mas só abre os blocos: os itens que aparecem depois de expandir
    "Atenção" e "Maiores riscos" não são medidos nos alvos de 44 px.
  - A checagem de computador (1280 px) confere a reordenação por posição x/y, que é uma prova fraca; o
    `boundingBox` é lido sem `toBeVisible` antes; `min-width: 44px` é redundante.
