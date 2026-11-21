# ADR-0006: Ler o Inerente da tabela do Quadro 7 no banco, com espelho em TypeScript

## Status

Accepted

Data: 2026-11-09 (design v2.0 § 5 e migração `20261109001`); registrada em ADR em 2026-11-21.

Origem: design v2.0 § 5; `supabase/migrations/20261109001_schema_radar.sql`; `src/utils/calculadoraRiscoRadar.ts`;
teste `supabase/tests/000_regressao_calculo.test.sql`; AGENTS.md, regras 2 a 4.

## Contexto

A Metodologia (SEI `024421455`) manda ler o Risco Inerente de uma tabela fixa de 25 células (Quadro 7), em que o
Impacto pesa mais que a Probabilidade (`P=1, I=5 → 15`; `P=5, I=1 → 11`). Multiplicar ou somar P e I é
proibido. O residual é o inerente vezes o fator do Quadro 6, e as faixas do Quadro 8 valem sem arredondar.
A tela precisa mostrar o resultado enquanto a pessoa digita; o banco precisa garantir o valor gravado.

## Decisão

Nós vamos guardar a **tabela de 25 células no banco** e calcular nele, pelo gatilho de `riscos`, o inerente, o
residual e as classificações; e manter um **espelho em TypeScript** (`calculadoraRiscoRadar.ts`) só para a
prévia instantânea na tela. O teste de regressão confere os dois lados contra os mesmos casos.

## Consequências

**Positivas**
- O valor gravado nunca depende do navegador.
- A prévia na tela é imediata, sem ida ao servidor.

**Negativas**
- A mesma tabela existe em dois lugares: mudar o Quadro 7 exige mexer em ambos e rodar os testes.
- Há cópias parciais em outros pontos (o `CASE` do Quadro 6 em `salvar_ficha_risco`, ver [[0003-gravar-valores-calculados-no-risco]]).

**Neutras**
- Mudança de cálculo só ocorre com consulta a [[matriz-regras-regime-b]].

## Alternativas consideradas

- **Só no navegador:** quem preenche escolheria o resultado.
- **Só no banco:** a tela perderia a prévia ao vivo.
