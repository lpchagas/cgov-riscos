# LAC-12 — Escalas de probabilidade e impacto pelos Quadros 4 e 5 (desenho curto)

> **Data:** 2026-11-22 · **Branch:** `claude/icmbio-risk-policy-modeling-q840ho`
> **Lacuna:** LAC-12 em [[lacunas-norma-sistema]] (bloqueia homologação) · **Pendência de interface:** AG-04 em [[pendencias-ui-piloto]]
> **Requisitos:** RN-011, RN-012, RF-037, RF-176, RF-177 · **Fonte:** Metodologia 4.3, a (Quadro 4) e b (Quadro 5); [[matriz-regras-regime-b]] §6 e §7

## 1. Por que

O formulário e a matriz chamam a escala de probabilidade de "Muito baixa (menos de 10%)" até "Muito alta (mais de 90%)". A minuta usa **Raro, Pouco provável, Provável, Muito provável e Praticamente certo**, cada nível descrito pelo **histórico do evento**, sem percentuais. Com os rótulos atuais, o gestor escolhe a probabilidade por um critério que não é o oficial, e a homologação fica bloqueada (ADR-0017). O número gravado (1 a 5) já está certo; o que diverge é o que se mostra e se lê.

## 2. Objetivos, não objetivos e o que seria fracasso

**Objetivos**
- Formulário, matriz, comentários do código e importador usam os nomes do Quadro 4 (probabilidade) e do Quadro 5 (impacto), sem percentual nenhum.
- No formulário, o gestor vê **a descrição oficial de cada nível** dos Quadros 4 e 5 na hora de escolher (decisão do responsável: botões de opção com o texto à vista).
- O importador reconhece o nível pelo nome quando a célula vem sem número (RF-176) e **recusa a linha**, informando o motivo, quando a probabilidade ou o impacto não puder ser lido, for 0 ou ficar fora de 1 a 5 (RF-177). Hoje esses casos viram 3, 5 ou 1 sem aviso.

**Não objetivos**
- Não muda o cálculo (Quadros 6, 7 e 8), o banco, as migrações, a RLS nem o fluxo. Nenhuma migração.
- Não mexe nos outros itens do cartão do Importador (RF-178 a RF-188, evidência do controle, KRI).
- Não troca a eficácia do controle por botões de opção (AG-05 é outra pendência).

**Fracasso, mesmo que funcione**
- Sobrar em alguma tela ou mensagem um percentual ou um nome antigo ("Muito baixa", "Média", "Alta").
- Os nomes ficarem copiados em vários arquivos, sem uma fonte única, e voltarem a divergir.
- O importador continuar gravando um 3 inventado.
- Botões de opção que pioram a acessibilidade: sem grupo com nome, sem o erro anunciado ou sem navegação pelas setas.

## 3. Abordagens consideradas

| Abordagem | Troca | Escolha |
| --- | --- | --- |
| Lista suspensa com a descrição do nível escolhido abaixo | muda pouco a tela; só se vê um nível por vez | não escolhida |
| Lista suspensa + quadro recolhível com os 5 níveis | dá para comparar, mas com um clique a mais | não escolhida |
| **Botões de opção, cada um com o texto do nível à vista** | é a comparação mais fácil; a etapa 3 fica mais longa e o trabalho de acessibilidade aumenta | **escolhida pelo responsável** |

Para a fonte dos nomes, só há uma forma sensata: um módulo único, com os nomes e as descrições literais dos Quadros 4 e 5, que o formulário, a matriz e o importador leem. Copiar os nomes em cada arquivo é o que causou a divergência. Guardar os nomes no banco seria exagero, porque eles não mudam por unidade nem por ciclo.

## 4. O desenho

1. **Fonte única dos nomes:** um módulo novo em `src/utils/` (fora de `calculadoraRiscoRadar.ts`, para não tocar no arquivo do cálculo) com, para cada nível de 1 a 5, o nome e a descrição **literais** da [[matriz-regras-regime-b]] §6 (Quadro 4) e §7 (Quadro 5). Ali ficam também as funções do importador que leem uma célula ("3", "Provável", "3 — Provável", "Provável (3)", sem diferenciar maiúsculas de minúsculas nem considerar acentos) e devolvem o nível ou o motivo da recusa.
2. **Componente de botões de opção com descrição** (novo, em `src/components/ui/`): `fieldset` + `legend` com botões de opção nativos (a navegação pelas setas vem do navegador). Cada opção mostra "N — Nome" e, abaixo, a descrição. Aceita valor vazio (nada marcado no cadastro novo), a marca de obrigatório e o erro anunciado (`aria-describedby` no grupo e `role="alert"`), no mesmo padrão do `FormField`. Serve para a probabilidade e para o impacto.
3. **Formulário** (`FormularioRiscoView.vue`, etapa 3): a probabilidade e o impacto trocam a lista suspensa pelo componente novo. O texto da etapa passa a dizer que o nível é escolhido pelo histórico do evento (Quadro 4) e pelo efeito no objetivo (Quadro 5). A validação que já existe (campo obrigatório) continua igual, e o foco no primeiro erro cai no primeiro botão do grupo.
4. **Matriz** (`MatrizCalorAssimetrica.vue`): os nomes do eixo e do texto do leitor de tela passam a vir do módulo único. Conferir se "Praticamente certo" cabe no eixo do celular sem quebrar a grade.
5. **Comentário do tipo** (`radar.types.ts`): sem percentuais, com os nomes do Quadro 4.
6. **Importador** (`importadorSkillMarkdown.ts`): probabilidade e impacto passam pelas funções do item 1. Se a célula tiver número **e** nome e eles não concordarem ("3 — Raro"), a linha também é recusada (decisão minha: não dá para saber qual dos dois a skill quis dizer). Para o usuário, a recusa aparece do mesmo jeito que a da categoria já aparece: "Linha X: probabilidade inválida ("…"). Use 1 a 5 ou um nome do Quadro 4: Raro; …".
7. **Documentação:** LAC-12 passa a resolvida; RN-011, RF-037, RF-176 e RF-177 ganham a situação nova; UC-06 (1a) e UC-13 (5a) são atualizados, junto com a rastreabilidade, a nota de atenção da matriz §6, a AG-04, o Kanban (cartão da LAC-12 concluído; o RF-177 sai do cartão do Importador) e o `ESTADO-ATUAL.md`.
8. **Figma:** a `MatrizCalorAssimetrica` muda de texto (eixo da probabilidade). A mudança vai na cópia **Trabalho** e termina com o bloco "O que você precisa fazer no Figma". O componente novo de botões de opção só entra na biblioteca se o responsável pedir (decisão minha: a LAC-12 é norma, não biblioteca).

## 5. Testes

- Unidade: o módulo único (nomes literais iguais aos da matriz de regras; leitura das células, incluindo os casos de recusa), o componente novo (seleção, valor vazio, erro anunciado), o formulário (os 5 nomes do Quadro 4 aparecem e nenhum "%"), a matriz (nomes do eixo) e o importador ("Provável" vira 3; "0", "6", "-1", "abc", vazio e "3 — Raro" recusam a linha).
- Ajustar os testes atuais que procuram `select` de probabilidade ou impacto (ex.: `novoRiscoPagina.spec.ts:312`).
- Acessibilidade: `npm run test:a11y` no formulário (etapa 3) e na matriz.

## 6. O que fica para quem executar

O nome do componente e do módulo, a disposição dos botões de opção no celular e no computador (uma coluna; duas colunas para P e I lado a lado, se couber), o texto exato da ajuda da etapa e a divisão em tarefas do plano.
