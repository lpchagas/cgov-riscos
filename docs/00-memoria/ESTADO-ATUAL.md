# Estado Atual do Projeto — Sistema RADAR (`cgov-riscos`)

> **Última atualização:** 2026-11-22
> Este arquivo é um **retrato**: onde o projeto está agora, os números da última verificação e para onde
> olhar. O diário das etapas (A a D1 e Fases 0 a 5 da reestruturação) está em [[historico-etapas]]; o
> trabalho a fazer, no [[quadro]] (Kanban); as decisões, em `docs/adr/` (índice no `README.md` da pasta).

## 1. Onde estamos

| Frente | Situação |
| --- | --- |
| Implementação (etapas A, B1, B2, B1.1, B3 e C) | Mescladas na `main` (PRs #7 e #8, 2026-11-16). |
| Etapa D — piloto da Sede (D0/D1) | **Em curso.** D1, Tasks 1 a 6 feitas: build em modo real, CSP única, pacote de publicação, Registro de Decisão, cópia cifrada e banco do piloto na nuvem, conferido ([[guia-supabase-nuvem]], [[decisoes-tecnicas-d]]). Próxima: Task 7 (front publicado, **[AUTORIZAÇÃO]**). A Task 8 e a Fase 0 precisam do desktop institucional. A D2 (login por senha temporária) ainda vai ser desenhada. |
| LAC-14 e LAC-15 — categorias do Quadro 2 e subcategorias do Quadro 3 | **Concluída.** Fases 1 e 2 feitas (código, banco local e banco do piloto na nuvem) e mescladas na `main` (PR #14, "Fase 1: Categorias do Quadro 2 e subcategorias do Quadro 3", em 2026-11-22, merge `ef7fb9e`, depois de 2 rodadas do CodeRabbit e 1 do Codex). Entregue em 2026-11-22: listas literais no front, importador sem conversão silenciosa, migração `20261122001` (tabela `subcategorias_risco`, chave estrangeira, gatilho e trava de reclassificação), sementes e testes pgTAP `090` ([[0019-categorias-e-subcategorias-literais-sem-conversao-automatica\|ADR-0019]]). Aplicada no banco do piloto em 2026-11-22, com autorização a cada passo, e conferida por leitura ([[guia-supabase-nuvem]] §4 e §7.1.1). |
| Etapa D — homologação na CGTI | Só depois das 6 lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15; a LAC-14 e a LAC-15 já estão resolvidas no código, no banco local e na nuvem do piloto), pelo [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti\|ADR-0017]]. |
| Reestruturação da documentação em 5 níveis | **Concluída.** Fases 0 a 6 mescladas na `main` (PRs #9 a #13; a #13, "Fase 6: Fechamento e retomada da implementação", em 2026-11-22, merge `4be60d7`, depois de 3 rodadas do CodeRabbit e do Codex). |

Branch de trabalho: `claude/icmbio-risk-policy-modeling-q840ho`.

## 2. Decisões mais recentes

- [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]] (2026-11-22): as 6 lacunas em que o
  RADAR contradiz a norma vêm antes da homologação na CGTI; as omissões vêm depois, quando a portaria for
  publicada; o piloto segue em paralelo.
- [[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1|ADR-0018]] (2026-11-22): o fluxo interno de 3
  degraus fica como etapa anterior à comunicação do item 4.6.1; a LAC-11 está resolvida, sem mudança no
  código.
- [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]] (2026-11-22): categorias e
  subcategorias literais do Quadro 2 e do Quadro 3; o Anexo III vale só como sinônimo na importação; a
  migração recusa e lista os riscos a reclassificar, sem converter nada.

## 3. Números da verificação (2026-11-22)

| Verificação | Resultado |
| --- | --- |
| `npm test` (Vitest, inclui o teste da documentação) | Vitest: 759 testes, todos passando (2026-11-22, depois da LAC-13). |
| `npm run build` (`vue-tsc` + Vite) | ok. |
| `npm run test:db` (pgTAP) | 19 arquivos, 929 testes, `PASS` (2026-11-22, depois da LAC-13, com a migração `20261122002` e o teste `100`; a medição anterior, de 18 arquivos e 883 testes, foi feita com a migração `20261122001` e o teste `090`, já com as correções da revisão de fim da Fase 1; rodado com o Postgres local 17.11.0.006, ver a pendência do ambiente local na seção 5: a nuvem roda o Postgres 17.6.1.104). **Re-medir** na próxima mudança de banco. |
| `npm run test:a11y` | 329 testes passaram, 0 violações em 315 combinações ((17 + 4) telas × 5 larguras × 3 temas, com a etapa 3 do formulário), medido em 2026-11-22, depois da LAC-12. |
| Documentação | 115 RN, 195 RF (118 implementados, 8 parciais, 69 não iniciados), 51 RNF, 26 casos de uso, 19 ADRs, 14 migrações em `supabase/migrations/` (o DER lista as 13 que mudam a estrutura; a `20261122002` só troca funções). |
| Kanban | 71 cartões: 64 no Backlog, 1 em "Pronto para iniciar", 1 em "Homologação CGOV" (LAC-13) e 5 concluídos (LAC-11, LAC-12, LAC-14, LAC-15 e a dívida das subcategorias em JSONB). |

**Pendente de prova real:** as mudanças da cópia (um único `pg_dump`, parcial exclusivo, TLS obrigatório na
nuvem) passaram nos testes, mas a primeira prova completa do [[guia-copia-restauracao]] (seção 8) ainda não
rodou com Docker.

## 4. Próximo trabalho

Vem do [[quadro]], na ordem da [[analise-lacunas-codigo-requisitos]]. Em "Pronto para iniciar" (a LAC-12 foi concluída em 2026-11-22, só no código, sem migração; a LAC-13 está implementada no código e na coluna "Homologação CGOV", já aplicada na nuvem do piloto em 2026-11-22):

1. LAC-03 — KRI obrigatório e completo no risco crítico (RF-094 a RF-097, RF-109, RF-183, RF-184); o alerta do
   KRI (RF-102) tem cartão próprio e espera o desenho P-02.

A LAC-03 muda banco e regra: antes do código, é preciso um **plano autorizado** pelo responsável
(`AGENTS.md`). A LAC-08 (rito da DAR) espera os desenhos P-01 e P-10 no Figma, aprovados pela CGOV. Em paralelo, a
etapa D segue com a Task 7 da D1.

**LAC-13 (trava do "Aceitar" no risco crítico): implementada no código em 2026-11-22; aplicada na nuvem do piloto em 2026-11-22.** Regra única em `src/utils/travaRiscoCritico.ts`; formulário (etapa 4, opção desabilitada com ajuda), importador (recusa a linha), banco (migração `20261122002_lac13_trava_aceitar_critico.sql`: `fn_trava_risco_critico` nos envoltórios de `enviar_para_validacao`, `validar_risco` e `homologar_risco`; trava embutida em `salvar_ficha_risco`; `fn_dar_reavaliar_aprovados` devolve à unidade) e demonstração; pgTAP `100_lac13_trava_critico.test.sql`. Decisões do responsável (2026-11-22): o Pendente de DAR também trava; DAR alterada devolve à unidade. Sobras conhecidas: `acoes_no_fluxo` ainda mostra Validar/Homologar para risco crítico sem tratamento (o clique é recusado com mensagem) e os riscos críticos de `supabase/seed-demonstracao.sql` não têm ação (só local). A migração `20261122002` já foi aplicada na nuvem do piloto em 2026-11-22 (registro no [[guia-supabase-nuvem]]).

**Fase 2 da LAC-14 e da LAC-15 (nuvem do piloto): feita em 2026-11-22.** A migração `20261122001` está no
projeto `cgov-riscos-v3.0`, conferida por leitura (8 categorias do Quadro 2, 6 subcategorias, coluna JSONB
removida, 11 linhas novas na trilha). A 1ª tentativa do `db push` foi recusada sem gravar nada, por causa da
trava de escrita fora de um bloco `DO`; corrigida no commit `cbbe8c3` ([[guia-supabase-nuvem]] §4). PR #14 mesclada na `main` em 2026-11-22 (merge `ef7fb9e`).

## 5. Pendências abertas para o responsável

- **Ambiente local: versão do Postgres e teste `030_alcance`.** O arquivo `supabase/.temp/postgres-version`
  (gerado pelo `supabase link`, fora do Git) fixa o Postgres **17.6.1.104**, a mesma versão da nuvem. Com essa
  imagem, o teste que já existia `supabase/tests/030_alcance.test.sql` (perto da linha 124) derrubou o Postgres
  (*segmentation fault*) e levou junto o resto da rodada pgTAP. Os testes da LAC-14 e da LAC-15 rodaram com
  esse arquivo temporariamente de lado (imagem 17.11.0.006), e o arquivo foi **restaurado** depois. Por isso,
  o próximo `supabase stop`/`start` ou `db:reset` volta à 17.6.1.104 e ao problema. A causa não foi investigada e
  **não há correção definida**: decisão do responsável. Como a nuvem usa a 17.6.1.104, vale entender isso antes
  de homologar.
