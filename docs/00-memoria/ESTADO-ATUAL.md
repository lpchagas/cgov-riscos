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
| LAC-14 e LAC-15 — categorias do Quadro 2 e subcategorias do Quadro 3 | **Fase 1 feita (código e banco local), na branch de trabalho; Fase 2 (nuvem do piloto) NÃO feita.** Entregue em 2026-11-22: listas literais no front, importador sem conversão silenciosa, migração `20261122001` (tabela `subcategorias_risco`, chave estrangeira, gatilho e trava de reclassificação), sementes e testes pgTAP `090` ([[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]). A migração ainda não foi aplicada no banco do piloto: cada passo pede **[AUTORIZAÇÃO]** ([[guia-supabase-nuvem]] §7.1.1). |
| Etapa D — homologação na CGTI | Só depois das 6 lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15; a LAC-14 e a LAC-15 já estão resolvidas no código e no banco local, falta a nuvem), pelo [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti\|ADR-0017]]. |
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
| `npm test` (Vitest, inclui o teste da documentação) | 54 arquivos, 660 testes, todos passando (2026-11-22, depois da revisão de fim da Fase 1 da LAC-14 e da LAC-15). |
| `npm run build` (`vue-tsc` + Vite) | ok. |
| `npm run test:db` (pgTAP) | 18 arquivos, 883 testes, `PASS` (2026-11-22, com a migração `20261122001` e o teste `090`, já com as correções da revisão de fim da Fase 1; rodado com o Postgres local 17.11.0.006, ver a pendência do ambiente local na seção 5: a nuvem roda o Postgres 17.6.1.104). **Re-medir** na próxima mudança de banco. |
| `npm run test:a11y` | Última medição: 0 violações em 300 combinações (etapa C). |
| Documentação | 115 RN, 195 RF (112 implementados, 10 parciais, 73 não iniciados), 51 RNF, 26 casos de uso, 19 ADRs, 13 migrações no DER. |
| Kanban | 71 cartões: 64 no Backlog, 3 em "Pronto para iniciar" e 4 concluídos (LAC-11, LAC-14, LAC-15 e a dívida das subcategorias em JSONB). |

**Pendente de prova real:** as mudanças da cópia (um único `pg_dump`, parcial exclusivo, TLS obrigatório na
nuvem) passaram nos testes, mas a primeira prova completa do [[guia-copia-restauracao]] (seção 8) ainda não
rodou com Docker.

## 4. Próximo trabalho

Vem do [[quadro]], na ordem da [[analise-lacunas-codigo-requisitos]]. Em "Pronto para iniciar":

1. LAC-12 — rótulos da probabilidade do Quadro 4 (RF-037, RF-176);
2. LAC-13 — "Aceitar" proibido e ação obrigatória no risco crítico (RF-049, RF-050);
3. LAC-03 — KRI obrigatório e completo no risco crítico (RF-094 a RF-097, RF-109, RF-183, RF-184); o alerta do
   KRI (RF-102) tem cartão próprio e espera o desenho P-02.

Cada uma muda banco ou regra: antes do código, é preciso um **plano autorizado** pelo responsável
(`AGENTS.md`). A LAC-08 (rito da DAR) espera os desenhos P-01 e P-10 no Figma, aprovados pela CGOV. Em paralelo, a
etapa D segue com a Task 7 da D1.

**Fase 2 da LAC-14 e da LAC-15 (nuvem do piloto): pendente.** Aplicar a migração `20261122001` no projeto
`cgov-riscos-v3.0` (conferência de leitura, `db push`, conferência final), cada passo com **[AUTORIZAÇÃO]**
([[guia-supabase-nuvem]] §7.1.1). A nuvem tem 0 riscos, então a trava de reclassificação não deve disparar.

## 5. Pendências abertas para o responsável

- **Ambiente local: versão do Postgres e teste `030_alcance`.** O arquivo `supabase/.temp/postgres-version`
  (gerado pelo `supabase link`, fora do Git) fixa o Postgres **17.6.1.104**, a mesma versão da nuvem. Com essa
  imagem, o teste que já existia `supabase/tests/030_alcance.test.sql` (perto da linha 124) derrubou o Postgres
  (*segmentation fault*) e levou junto o resto da rodada pgTAP. Os testes da LAC-14 e da LAC-15 rodaram com
  esse arquivo temporariamente de lado (imagem 17.11.0.006), e o arquivo foi **restaurado** depois. Por isso,
  o próximo `supabase stop`/`start` ou `db:reset` volta à 17.6.1.104 e ao problema. A causa não foi investigada e
  **não há correção definida**: decisão do responsável. Como a nuvem usa a 17.6.1.104, vale entender isso antes
  de homologar.
