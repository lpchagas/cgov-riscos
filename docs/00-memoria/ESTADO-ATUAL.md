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
| LAC-03 — KRI obrigatório e completo no risco crítico, por grupo de correlatos | **Implementada no código e no banco local em 2026-11-22; aplicada na nuvem do piloto em 2026-11-23.** Fase 1 do plano (Tarefas 1 a 8) na branch de trabalho, aguardando a revisão de fim de fase e a PR. Cartão em "Homologação CGOV". Detalhes na seção 4. |
| Etapa D — homologação na CGTI | Só depois das 6 lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15; a LAC-14 e a LAC-15 já estão resolvidas no código, no banco local e na nuvem do piloto; a LAC-13 também, e a LAC-03 está no código e no banco local), pelo [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti\|ADR-0017]]. |
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
| `npm test` (Vitest, inclui o teste da documentação) | Vitest: 57 arquivos, 856 testes, todos passando (2026-11-23, depois dos achados da revisão final da LAC-03). |
| `npm run build` (`vue-tsc` + Vite) | ok. |
| `npm run test:db` (pgTAP) | 20 arquivos, 1064 testes, `PASS` (2026-11-23, depois dos achados da revisão final da LAC-03, com a imagem 17.11.0.006; a 17.6.1.104 derruba o `030` e o `050`, ver §5). |
| `npm run test:a11y` | 329 testes passaram, 0 violações em 315 combinações ((17 + 4) telas × 5 larguras × 3 temas, com a etapa 3 do formulário), medido em 2026-11-22, depois da LAC-12; **re-medir**: a etapa 4 do formulário e o monitoramento mudaram na LAC-03. |
| Documentação | 115 RN, 195 RF (124 implementados, 7 parciais, 64 não iniciados), 51 RNF, 26 casos de uso, 19 ADRs, 17 migrações em `supabase/migrations/` (o DER lista as 14 que mudam a estrutura; a `20261122002` só troca funções, a `20261122003` só acrescenta um gatilho e a `20261123001` só põe travas de linha nos gatilhos de `kri_riscos`). |
| Kanban | 72 cartões: 65 no Backlog, 0 em "Pronto para iniciar", 2 em "Homologação CGOV" (LAC-13 e LAC-03) e 5 concluídos (LAC-11, LAC-12, LAC-14, LAC-15 e a dívida das subcategorias em JSONB). |

**Pendente de prova real:** as mudanças da cópia (um único `pg_dump`, parcial exclusivo, TLS obrigatório na
nuvem) passaram nos testes, mas a primeira prova completa do [[guia-copia-restauracao]] (seção 8) ainda não
rodou com Docker.

## 4. Próximo trabalho

Vem do [[quadro]], na ordem da [[analise-lacunas-codigo-requisitos]]. "Pronto para iniciar" está vazio: a LAC-12 foi concluída em 2026-11-22 (só no código), a LAC-13 e a LAC-03 estão na coluna "Homologação CGOV" (a LAC-13, aplicada na nuvem do piloto em 2026-11-22; a LAC-03, com a `20261122004` aplicada na nuvem do piloto em 2026-11-23).

1. **PR #17 (Fase 1 da LAC-03) aberta**, com a triagem do CodeRabbit corrigida em 2026-11-23; o merge depende de pedido do responsável.
2. **Aplicar a `20261123001` (travas de linha da LAC-03) na nuvem do piloto, [AUTORIZAÇÃO]:** hoje só no banco local; registro no [[guia-supabase-nuvem]]. (A Tarefa 9 da LAC-03, com a `20261122004`, já foi feita em 2026-11-23.)
3. Cartão do Figma: atualizar a etapa 4 do formulário e o monitoramento com os campos do KRI e o KRI compartilhado (Backlog).
4. Cartão do alerta do KRI (RF-102, com o RF-109 e a LAC-04), que espera o desenho P-02 (Backlog). A LAC-08 (rito da DAR) espera os desenhos P-01 e P-10 no Figma, aprovados pela CGOV. Em paralelo, a etapa D segue com a Task 7 da D1.

PR #16 (LAC-13) mesclada na `main` em 2026-11-22 (merge `dcb4a7a`), depois da triagem do CodeRabbit. Desenho da LAC-03 em `docs/superpowers/specs/2026-11-22-lac-03-kri-obrigatorio-design.md` e plano em `docs/superpowers/plans/2026-11-22-lac-03-kri-obrigatorio-plan.md`.

**LAC-03 (KRI obrigatório e completo no risco crítico, por grupo de correlatos): implementada no código e no banco local em 2026-11-22; aplicada na nuvem do piloto em 2026-11-23.** O KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável; a meta é opcional; "A definir" não conta) é o 3º motivo da trava da LAC-13: `kriCompleto` em `src/utils/travaRiscoCritico.ts` e, no banco, `fn_kri_completo` e `fn_trava_risco_critico` (migração `20261122004_lac03_kri_obrigatorio.sql`), em todas as portas (enviar, validar, homologar, `salvar_ficha_risco` fora do rascunho, do devolvido e do preliminar da CGOV) e na reavaliação pela DAR, que devolve à unidade o risco aprovado que falha, com o motivo real no histórico. KRI do objeto (`indicadores_kri.objeto_id`) e ligação muitos para muitos com os riscos do mesmo objeto (`kri_riscos`; `risco_id` saiu); campos do KRI aceitam `NULL`; órfão apagado com as medições. Formulário (etapa 4 com todos os campos e "Usar um KRI já definido neste objeto"; em risco novo o KRI escolhido só é ligado), importador (KRI só com o nome e só quando a linha traz um; aviso na linha crítica), monitoramento (uma linha por KRI, com os riscos ligados), demonstração e sementes; pgTAP `110_lac03_kri_obrigatorio.test.sql`. Decisões do responsável (2026-11-22): modelo muitos para muitos no mesmo objeto; meta opcional; a exigência entra na trava da LAC-13 (Pendente de DAR também trava); aprovados antigos sem KRI completo não mudam de estado (a migração só os lista, por consulta de leitura). Sobras da LAC-13 resolvidas junto: `FOR SHARE` da categoria em `fn_base_*`, histórico da DAR com o motivo real e riscos críticos de `supabase/seed-demonstracao.sql` com ação e KRI completo. Triagem do CodeRabbit na PR #17 (2026-11-23): 2ª migração `20261123001_lac03_travas_ligacao_kri.sql` (só local; **ainda não aplicada na nuvem**, pede [AUTORIZAÇÃO]), com travas de linha (`FOR SHARE`/`FOR NO KEY UPDATE`/`FOR UPDATE`) em `fn_kri_riscos_mesmo_objeto`, `fn_kri_grupo_mesmo_objeto` e `fn_kri_riscos_apaga_orfao` para gravações simultâneas (pgTAP `111_lac03_travas_ligacao_kri.test.sql`); etapa 4 aceita qualquer KRI completo que continuará ligado; a demonstração libera o risco reaberto pela própria gravação; cartão novo no Backlog para confirmar no banco antes de apagar as medições do KRI órfão. Sobra conhecida: `acoes_no_fluxo` não olha o KRI. Fica fora, no cartão do alerta (Backlog): o alerta do KRI (RF-102) e a comunicação à CGOV (RF-109, LAC-04).

**LAC-13 (trava do "Aceitar" no risco crítico): implementada no código em 2026-11-22; aplicada na nuvem do piloto em 2026-11-22.** Regra única em `src/utils/travaRiscoCritico.ts`; formulário (etapa 4, opção desabilitada com ajuda), importador (recusa a linha), banco (migração `20261122002_lac13_trava_aceitar_critico.sql`: `fn_trava_risco_critico` nos envoltórios de `enviar_para_validacao`, `validar_risco` e `homologar_risco`; trava embutida em `salvar_ficha_risco`; `fn_dar_reavaliar_aprovados` devolve à unidade; 2ª migração `20261122003_lac13_gatilho_estrategia_critico.sql`, achado da revisão final: o gatilho `trg_riscos_trava_aceitar_critico` recusa o UPDATE direto em `riscos` que põe "Aceitar" em risco crítico fora do rascunho, devolvido e preliminar) e demonstração; pgTAP `100_lac13_trava_critico.test.sql`. Decisões do responsável (2026-11-22): o Pendente de DAR também trava; DAR alterada devolve à unidade. Sobra conhecida: `acoes_no_fluxo` ainda diz "sim" em `pode_enviar`, `pode_validar` e `pode_homologar` para risco crítico sem tratamento (o clique é recusado com mensagem); a outra sobra, os riscos críticos de `supabase/seed-demonstracao.sql` sem ação, foi resolvida na LAC-03. A migração `20261122002` já foi aplicada na nuvem do piloto em 2026-11-22 (registro no [[guia-supabase-nuvem]]); a `20261122003`: aplicada na nuvem do piloto em 2026-11-22.

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
  de homologar. Na LAC-03 (2026-11-23), a 17.6.1.104 derrubou também o `050_fluxo.test.sql`, não só o `030`:
  os testes rodaram com a imagem 17.11.0.006, e o arquivo foi restaurado depois.
