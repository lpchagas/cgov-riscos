# Instruções Operacionais para Agentes (Claude Code e Google Antigravity) — `cgov-riscos`

Este repositório contém o código-fonte (Vue.js 3 + TypeScript + `@govbr-ds/core` + Supabase + Docker) e o **Segundo Cérebro no Obsidian** do Sistema Web **RADAR** (Rede de Avaliação, Diagnóstico e Ação em Riscos) da **CGOV/ICMBio**.

## Regras Invioláveis de Negócio e Nomenclatura (Regime B — RADAR)

1. **Disciplina de Siglas da CGOV:**
   - **NUNCA** use a sigla `"PGR"` para se referir ao Plano de Gestão de Riscos. No ICMBio, **PGR** é exclusivamente o *Programa de Gestão para Resultados e Inovação* (Portaria ICMBio nº 1.572/2023). Escreva sempre **Plano de Gestão de Riscos** por extenso.
   - Use **RADAR** para a Política de Gestão de Riscos, **DAR** para a Declaração de Apetite a Riscos e **KRI** para Indicador-Chave de Risco.
2. **Matriz de Risco Assimétrica (Quadro 7 da Metodologia SEI `024421455`):**
   - É expressamente proibido calcular o Risco Inerente pela multiplicação ou soma de Probabilidade × Impacto. O valor deve ser lido da tabela fixa de 25 células do Quadro 7, onde o Impacto pesa mais que a Probabilidade (ex.: `P=1, I=5 -> 15`; `P=5, I=1 -> 11`).
3. **Classificação sem Arredondamento Prévio (Quadro 8):**
   - Os 4 níveis de classificação chamam-se **Baixo (1 a 5)**, **Médio (> 5 a 10)**, **Alto (> 10 a 17)** e **Extremo (> 17 a 25)**.
   - Nunca chame o nível 18–25 de "Crítico". **Risco Crítico** é o conceito de risco cujo nível residual está fora do apetite definido na **DAR**.
   - Aplique as faixas ao valor residual exato, sem arredondar para inteiro (`10,2` é **Alto**; `17,1` é **Extremo**).
4. **Fator de Avaliação dos Controles e Trava de Evidência (Quadro 6):**
   - Fórmula: `Risco Residual = Risco Inerente × Fator de Avaliação dos Controles` (`Inexistente = 1,0`, `Fraco = 0,9`, `Mediano = 0,75`, `Satisfatório = 0,6`, `Forte = 0,5`).
   - **Trava obrigatória:** Controle sem evidência comprovada de funcionamento não pode receber eficácia superior a **Fraco (0,9)**.
5. **Teste de Integridade — Programa Integra+ (Portaria ICMBio nº 253/2026):**
   - É proibido usar a categoria mista `"Operacional com interface de Integridade"`. Se houver decisão sobre beneficiário, licença/autorização, fiscalização/sanção ou contratação/atestação, aplica-se o Teste de Integridade com as 6 subcategorias do Quadro 3.
6. **Diretriz Didática:**
   - Mantenha todos os arquivos de código e documentação em linguagem acessível em **português do Brasil**, comentando blocos importantes com exemplos práticos.

## Regras de Git (decisão do responsável pelo projeto, 2026-11-15)

- **Commits automáticos:** faça um commit sempre que concluir uma alteração relevante (uma tarefa de plano revisada, uma correção, uma etapa de documentação), sem esperar pedido. Revoga a regra anterior de "um único commit no fim da etapa".
- Mensagem em português, no padrão `tipo(escopo): resumo` (ex.: `feat(b2): ...`, `fix(importador): ...`, `docs(estado): ...`), terminando com a linha `Co-Authored-By` indicada pela ferramenta.
- Nunca faça commit de `_temp/`, `.env` ou de qualquer dado pessoal. Push, merge e abertura de PR continuam dependendo de pedido explícito.

## Regras do Figma — biblioteca de componentes "RADAR — Painel" (decisão do responsável, 2026-11-16)

Arquivo: `RADAR — Painel` (fileKey `T1AuuL9jEfqkP7uoAPTUFF`, equipe Figma "cgov"). O Code Connect é ligado **à mão** pelo responsável, no Dev Mode (o plano não permite `add_code_connect_map` pelo MCP: não chame essa ferramenta).

**Sempre que criar, alterar, renomear, mover ou mudar variantes/propriedades de um componente da biblioteca**, termine a resposta com o bloco **"O que você precisa fazer no Figma"**, neste formato:

1. **Republicar a biblioteca** (*Assets → Libraries → Publish changes*). Diga quais componentes novos e quais mudanças vão aparecer. Antes, confirme com `search_design_system` se o componente já está publicado, e diga o resultado.
2. **No *Connect components*** (Dev Mode), **ligar** os componentes novos com a tabela abaixo.
3. **Atualizar a linha** dos componentes que já estavam ligados e mudaram (props, variantes ou nome).

Depois, a tabela, com **exatamente** estas 4 colunas e só com os componentes novos ou alterados:

| Componente no Figma | Arquivo no código | Component name | Add instructions for MCP |
| --- | --- | --- | --- |

Como preencher:
- **Arquivo no código:** caminho real, conferido no repositório antes de escrever (ex.: `src/components/ui/SegmentedControl.vue`).
- **Component name:** nome do arquivo `.vue` sem extensão (ex.: `MatrizCelula` no Figma → `MatrizCalorAssimetrica`), nunca o nome do Figma.
- **Add instructions for MCP:** texto curto, em português do Brasil, que explique (a) o que cada variante do Figma significa e a qual propriedade do código corresponde (ex.: `selecionada` ↔ `v-model`), (b) o que o componente faz de acessibilidade/comportamento, (c) o que **não** fazer ("não recrie com botões soltos"), e (d) as regras de negócio quando se aplicarem (Quadro 7 sem P × I; Quadro 8 sem arredondar; "Crítico" = fora da DAR e nunca o nível 18 a 25; nunca "PGR" para Plano de Gestão de Riscos).
- O conjunto **`Icone`** fica sem ligação (*Skip connection*): no código os ícones são Font Awesome.
- Continua valendo o fluxo de cópia: a tela **Original** fica travada e as mudanças vão na cópia **Trabalho** (ver [[manual-fluxo-figma-vscode]]).
