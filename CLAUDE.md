# CLAUDE.md — Instruções do Projeto `cgov-riscos` (Sistema Web RADAR / ICMBio)

@AGENTS.md

## Sobre este repositório

Aplicativo web e cofre Obsidian do **Sistema RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos)** da Coordenação de Governança (**CGOV/ICMBio**), construído para operacionalizar a **Política de Gestão de Riscos (Minuta SEI `024241420`)** e a **Metodologia de Gestão de Riscos (Minuta SEI `024421455`)** do ICMBio (**Regime B**), em conformidade com as regras analíticas da skill `cgov-gestao-riscos-v4`.

## Comandos Principais

- **Rodar servidor local de desenvolvimento:** `npm run dev`
- **Executar todos os testes automatizados:** `npm test` (ou `npx vitest run`)
- **Gerar build de produção (TypeScript + Vite):** `npm run build`
- **Subir container Docker para homologação CGTI:** `docker compose up -d --build`
- **Verificação antes do commit:** automática, pelo hook `.githooks/pre-commit` (instalado pelo `npm ci` via script `prepare`). Commit só de docs roda o `documentacao.spec.ts`; os demais rodam `vue-tsc` + `vitest`. Fica calado quando passa.

## Revisões (decisão do responsável, 2026-11-21)

Objetivo: menos tokens do Claude e menos ruído do CodeRabbit, sem perder rigor. Cada camada faz uma coisa só:

1. **Hook de commit (mecânico, sem IA):** tipos, testes e estrutura/siglas dos docs. Não rode `npm test` "só para conferir" logo antes do commit: o hook já roda. Os revisores não precisam rodar testes, mas **apontam** erro de tipo ou de teste que encontrarem, porque o hook tem limites: é local, pode ser pulado com `--no-verify`, só existe depois do `npm ci`, e o `vue-tsc` não cobre `scripts/` nem `supabase/functions/` (fora do `include` do `tsconfig.json`). Não há CI no GitHub.
2. **Claude, por tarefa (lógica):** **uma** revisão por tarefa, juntando aderência ao plano e qualidade (não duas rodadas separadas). Tarefa só de documentação ou configuração: revisor com modelo mais barato (`sonnet`) ou só a autorrevisão do diff, se for trivial. Cálculo (Quadros 6, 7 e 8), RLS, migrações e Edge Functions: revisão completa, sempre.
3. **Claude, no fim da fase:** um `/code-review` (nível `medium`) no diff da branch antes de abrir a PR. Os níveis `max`/`ultra` ficam só a pedido.
4. **CodeRabbit, na PR (visão ampla):** regras do Regime B, segurança, dados pessoais e coerência entre documentos (`.coderabbit.yaml`). Faça a triagem dos comentários **em lote**, numa passada só: leia todos, classifique em procedente/improcedente, corrija os procedentes num commit e responda os improcedentes na PR.

## Navegação pelo Segundo Cérebro (Obsidian)

1. Comece sempre lendo [`docs/00-memoria/ESTADO-ATUAL.md`](docs/00-memoria/ESTADO-ATUAL.md) e [`docs/00-memoria/MOC-Radar.md`](docs/00-memoria/MOC-Radar.md).
2. Consulte [`docs/01-normativos/matriz-regras-regime-b.md`](docs/01-normativos/matriz-regras-regime-b.md) antes de alterar qualquer cálculo em `src/utils/calculadoraRiscoRadar.ts` ou `supabase/migrations/`.
3. A documentação está organizada em **níveis**: `docs/10-nivel1-negocio/` (negócio), `docs/20-nivel2-requisitos/` (requisitos e casos de uso), `docs/30-nivel3-interface/` (interface: telas, design system, Figma e o mapa de telas), `docs/40-nivel4-dados/` (dados), `docs/50-nivel5-software/` (UML) e `docs/90-kanban/`. As decisões de arquitetura novas vão em **ADRs** (`docs/adr/`, modelo de Nygard, imutáveis). As fontes da 4ª rodada de revisão ficam, como cópias fiéis, em `docs/01-normativos/revisao-2026/`.
4. Todo código novo deve ser escrito de forma didática, com comentários claros em português do Brasil para apoiar o aprendizado do desenvolvedor e a auditoria técnica da CGTI/ICMBio.
