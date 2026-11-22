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
| Etapa D — homologação na CGTI | Só depois das 6 lacunas que bloqueiam a homologação (LAC-03, 08, 12, 13, 14 e 15), pelo [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti\|ADR-0017]]. |
| Reestruturação da documentação em 5 níveis | **Fases 0 a 5 mescladas** (PRs #9 a #12; a #12 em 2026-11-22, merge `8b1fa55`). **Fase 6 (Tarefa 19) concluída na branch**; **PR #13** ("Fase 6: Fechamento e retomada da implementação") aberta para a `main` (merge só a pedido). |

Branch de trabalho: `claude/icmbio-risk-policy-modeling-q840ho`.

## 2. Decisões mais recentes

- [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]] (2026-11-22): as 6 lacunas em que o
  RADAR contradiz a norma vêm antes da homologação na CGTI; as omissões vêm depois, quando a portaria for
  publicada; o piloto segue em paralelo.
- [[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1|ADR-0018]] (2026-11-22): o fluxo interno de 3
  degraus fica como etapa anterior à comunicação do item 4.6.1; a LAC-11 está resolvida, sem mudança no
  código.

## 3. Números da verificação (2026-11-22)

| Verificação | Resultado |
| --- | --- |
| `npm test` (Vitest, inclui o teste da documentação) | 54 arquivos, 622 testes, todos passando. |
| `npm run build` (`vue-tsc` + Vite) | ok. |
| `npm run test:db` (pgTAP) | Última medição: 17 arquivos, 840 testes, `PASS` (etapa C, 2026-11-16). **Re-medir** na próxima mudança de banco. |
| `npm run test:a11y` | Última medição: 0 violações em 300 combinações (etapa C). |
| Documentação | 115 RN, 195 RF (106 implementados, 13 parciais, 76 não iniciados), 51 RNF, 26 casos de uso, 18 ADRs, 12 migrações no DER. |
| Kanban | 71 cartões: 65 no Backlog, 5 em "Pronto para iniciar" e 1 concluído (a LAC-11). |

**Pendente de prova real:** as mudanças da cópia (um único `pg_dump`, parcial exclusivo, TLS obrigatório na
nuvem) passaram nos testes, mas a primeira prova completa do [[guia-copia-restauracao]] (seção 8) ainda não
rodou com Docker.

## 4. Próximo trabalho

Vem do [[quadro]], na ordem da [[analise-lacunas-codigo-requisitos]]. Em "Pronto para iniciar":

1. LAC-14 — as 8 categorias do Quadro 2 (RF-032, RF-173);
2. LAC-15 — as 6 subcategorias do Quadro 3, junto com a tabela de subcategorias (RF-036, RF-174, RF-175);
3. LAC-12 — rótulos da probabilidade do Quadro 4 (RF-037, RF-176);
4. LAC-13 — "Aceitar" proibido e ação obrigatória no risco crítico (RF-049, RF-050);
5. LAC-03 — KRI obrigatório e completo no risco crítico (RF-094 a RF-097, RF-109, RF-183, RF-184); o alerta do
   KRI (RF-102) tem cartão próprio e espera o desenho P-02.

Cada uma muda banco ou regra: antes do código, é preciso um **plano autorizado** pelo responsável
(`AGENTS.md`). A LAC-08 (rito da DAR) espera os desenhos P-01 e P-10 no Figma, aprovados pela CGOV. Em paralelo, a
etapa D segue com a Task 7 da D1.
