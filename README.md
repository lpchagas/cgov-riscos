# Sistema Web RADAR (`cgov-riscos`) — Gestão de Riscos do ICMBio

> **Rede de Avaliação, Diagnóstico e Ação em Riscos (RADAR)**  
> Ferramenta web para operacionalização da **Política de Gestão de Riscos (`SEI 024241420`)** e da **Metodologia de Gestão de Riscos (`SEI 024421455` — Regime B)** do Instituto Chico Mendes de Conservação da Biodiversidade (**ICMBio**), alinhada ao **Programa de Integridade Integra+ (`Portaria ICMBio nº 253/2026`)** e à skill analítica **`cgov-gestao-riscos-v4`**.

---

## 1. Principais Funcionalidades Implementadas

1. **Motor Matemático 100% Aderente ao Regime B (`src/utils/calculadoraRiscoRadar.ts`):**
   - **Matriz Assimétrica de 25 Células (Quadro 7):** proibida multiplicação simples `P × I`; o Impacto possui peso superior à Probabilidade (ex.: Caso de Controle do Anexo II com `P=3, I=5` gera nota `22 — Extremo`).
   - **Fatores Multiplicadores de Controles com Trava de Evidência (Quadro 6):** fatores `1,0 | 0,9 | 0,75 | 0,6 | 0,5`. Sem evidência comprovada de funcionamento, o controle fica travado no máximo em **Fraco (`0,9`)**.
   - **Classificação sem Arredondamento Prévio (Quadro 8):** avalia valores decimais residuais diretamente nas faixas (`Baixo <= 5`, `Médio > 5 e <= 10`, `Alto > 10 e <= 17`, `Extremo > 17`).
   - **Declaração de Apetite a Riscos (DAR — Anexo III):** avalia a criticidade (`sim | nao | pendente_dar`) para as **8 Categorias Oficiais do Quadro 2** e as **6 Subcategorias de Integridade do Quadro 3**.
2. **Passo 0 — Importador de Tabelas Markdown da Skill `cgov-gestao-riscos-v4` (`/importar-skill`):**
   - Permite colar a tabela Markdown de 16 colunas gerada no Claude Code sobre Portarias e Instruções Normativas do ICMBio, convertendo-a em fichas preliminares (`preliminar_cgov`).
3. **Fluxo de Governança em 3 Degraus ("Aprovação em 1 Clique") (`/validacao-um-clique`):**
   - **1º Degrau:** Gestor de Riscos (1ª Linha) elabora e submete.
   - **2º Degrau:** Coordenação-Geral (`coordenacao-geral`) supervisora do Macroprocesso valida em 1 clique. **Riscos Críticos** sobem automaticamente para a Diretoria.
   - **3º Degrau:** Diretor homologa em 1 clique para consolidar no **Plano de Gestão de Riscos** do ICMBio.

---

## 2. Como Executar no seu Computador (WSL / Linux)

```bash
# 1. Instalar dependências
npm install

# 2. Rodar os testes automatizados do motor matemático e de fluxo
npm test

# 3. Iniciar o servidor de desenvolvimento (http://localhost:5173)
npm run dev
```

---

## 3. Como Empacotar e Rodar com Docker (Apresentação à CGTI/ICMBio)

```bash
docker compose up --build -d
# Acesse em: http://localhost:8080
```
