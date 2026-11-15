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
