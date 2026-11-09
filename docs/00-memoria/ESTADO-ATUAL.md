# 📍 Estado Atual do Projeto — Sistema Web RADAR (`cgov-riscos`)

**Última atualização:** 09/11/2026  
**Fase Atual:** Implementação do Protótipo Funcional (Abordagem 1 — Vue 3 + `@govbr-ds/core` + Supabase + Docker)

## Resumo do que está definido
1. **Regime Normativo:** Regime B — Minutas da Política RADAR (SEI `024241420`) e Metodologia (SEI `024421455`), alinhado com a skill `cgov-gestao-riscos-v4`.
2. **Fluxo de Governança:**
   - **Passo 0 (Opcional):** Carga de fichas preliminares geradas pela CGOV no Claude Code via colagem de Tabela Markdown.
   - **1º Degrau:** Gestor de Riscos (1ª Linha) valida contexto, *Bow Tie*, controles existentes, tratamento 5W2H e KRIs.
   - **2º Degrau:** Coordenação-Geral (`coordenacao-geral`) / Gerência Regional aprova em **1 clique**.
   - **3º Degrau:** Diretoria homologa Riscos Críticos em **1 clique** para o **Plano de Gestão de Riscos** consolidado pela CGOV (2ª Linha).
