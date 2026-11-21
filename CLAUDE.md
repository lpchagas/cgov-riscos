# CLAUDE.md — Instruções do Projeto `cgov-riscos` (Sistema Web RADAR / ICMBio)

@AGENTS.md

## Sobre este repositório

Aplicativo web e cofre Obsidian do **Sistema RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos)** da Coordenação de Governança (**CGOV/ICMBio**), construído para operacionalizar a **Política de Gestão de Riscos (Minuta SEI `024241420`)** e a **Metodologia de Gestão de Riscos (Minuta SEI `024421455`)** do ICMBio (**Regime B**), em conformidade com as regras analíticas da skill `cgov-gestao-riscos-v4`.

## Comandos Principais

- **Rodar servidor local de desenvolvimento:** `npm run dev`
- **Executar todos os testes automatizados:** `npm test` (ou `npx vitest run`)
- **Gerar build de produção (TypeScript + Vite):** `npm run build`
- **Subir container Docker para homologação CGTI:** `docker compose up -d --build`

## Navegação pelo Segundo Cérebro (Obsidian)

1. Comece sempre lendo [`docs/00-memoria/ESTADO-ATUAL.md`](docs/00-memoria/ESTADO-ATUAL.md) e [`docs/00-memoria/MOC-Radar.md`](docs/00-memoria/MOC-Radar.md).
2. Consulte [`docs/01-normativos/matriz-regras-regime-b.md`](docs/01-normativos/matriz-regras-regime-b.md) antes de alterar qualquer cálculo em `src/utils/calculadoraRiscoRadar.ts` ou `supabase/migrations/`.
3. A documentação está organizada em **níveis**: `docs/10-nivel1-negocio/` (negócio), `docs/20-nivel2-requisitos/` (requisitos e casos de uso), nível 3 de interface (hoje `docs/04-ux/`, vira `docs/30-nivel3-interface/` na Tarefa 18 do plano), `docs/40-nivel4-dados/` (dados), `docs/50-nivel5-software/` (UML) e `docs/90-kanban/`. As decisões de arquitetura novas vão em **ADRs** (`docs/adr/`, modelo de Nygard, imutáveis). As fontes da 4ª rodada de revisão ficam, como cópias fiéis, em `docs/01-normativos/revisao-2026/`.
4. Todo código novo deve ser escrito de forma didática, com comentários claros em português do Brasil para apoiar o aprendizado do desenvolvedor e a auditoria técnica da CGTI/ICMBio.
