# 📊 Tabelas Oficiais de Cálculo — Regime B (Metodologia SEI `024421455`)

Fonte canônica para o motor `src/utils/calculadoraRiscoRadar.ts` e para as funções SQL em `supabase/migrations/`.

## 1. Matriz de Risco Assimétrica (Quadro 7) e Faixas (Quadro 8)

- **Faixas do Quadro 8 (aplicadas sem arredondar):**
  - `1 a 5` → **Baixo**
  - `> 5 a 10` → **Médio**
  - `> 10 a 17` → **Alto**
  - `> 17 a 25` → **Extremo**

| Impacto ↓ \ Probabilidade → | (1) Raro | (2) Pouco provável | (3) Provável | (4) Muito provável | (5) Praticamente certo |
|---|---|---|---|---|---|
| **(5) Muito alto** | 15 · Alto | 19 · Extremo | 22 · Extremo | 24 · Extremo | 25 · Extremo |
| **(4) Alto** | 10 · Médio | 14 · Alto | 18 · Extremo | 21 · Extremo | 23 · Extremo |
| **(3) Médio** | 6 · Médio | 9 · Médio | 13 · Alto | 17 · Alto | 20 · Extremo |
| **(2) Baixo** | 3 · Baixo | 5 · Baixo | 8 · Médio | 12 · Alto | 16 · Alto |
| **(1) Muito baixo** | 1 · Baixo | 2 · Baixo | 4 · Baixo | 7 · Médio | 11 · Alto |

## 2. Fator de Avaliação dos Controles Existentes (Quadro 6)

$$\text{Risco Residual} = \text{Risco Inerente} \times \text{Fator de Avaliação dos Controles}$$

| Eficácia do Controle | Fator | Regra de Evidência (Skill `cgov-gestao-riscos-v4`) |
|---|---|---|
| **Inexistente** | `1,0` | Controles inexistentes, mal desenhados ou não funcionais. |
| **Fraco** | `0,9` | Controle manual/individual. **Limite máximo caso não haja evidência comprovada de funcionamento.** |
| **Mediano** | `0,75` | Exige evidência comprovada de funcionamento. Mitiga alguns aspectos. |
| **Satisfatório** | `0,6` | Exige evidência comprovada de funcionamento. Sustentado por ferramentas adequadas. |
| **Forte** | `0,5` | Exige evidência comprovada de funcionamento. Melhor prática. |
