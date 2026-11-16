# Etapa B1.1 — Regras do banco: plano de implementação

> **Para agentes:** executar com superpowers:subagent-driven-development, uma tarefa por vez, com
> revisão. **Commit automático** ao fim de cada tarefa aprovada (AGENTS.md).

**Objetivo:** implementar no banco as 7 regras decididas em 2026-11-15 (P-B1-1 a P-B1-6 e P-B1-8),
com testes pgTAP, sem mudar o cálculo.

**Spec:** [[2026-11-15-etapa-b1-1-regras-banco-design]] (`docs/superpowers/specs/2026-11-15-etapa-b1-1-regras-banco-design.md`) — seções 2 a 4.

## Restrições globais

- Nunca abrir, listar nem ler `_temp/`.
- Não alterar migrações antigas nem o cálculo (Quadros 6, 7 e 8; `trigger_calcular_risco_radar`; `src/utils/calculadoraRiscoRadar.ts`).
- Migrações novas `supabase/migrations/2026111600N_<assunto>.sql`, comentadas em português, didáticas.
- Funções novas `SECURITY DEFINER` com `SET search_path = ''` e `REVOKE … FROM public, anon` (padrão da B1).
- Erros `RADAR: …` com `ERRCODE` (`insufficient_privilege` / `object_not_in_prerequisite_state`).
- Testes pgTAP em `supabase/tests/` com `\ir ajudantes.psql`; usuários da semente (`@radar.test`).
- Ao fim de cada tarefa: `npm run db:reset && npm run test:db` → `Result: PASS`.

---

### Tarefa 1: fluxo da Presidência (P-B1-1)
**Arquivos:** criar `supabase/migrations/20261116001_fluxo_presidencia.sql`; criar `supabase/tests/070_fluxo_presidencia.test.sql`; semente (`supabase/seed-demonstracao.sql`) ganha, se faltar, um titular fictício do GABIN (`gabin@radar.test` passa a `titular_chefia = true`, ou usuário novo) e um objeto/risco de demonstração na Presidência ou Assessoria.
- `chefia_imediata(u)`: Presidência (tipo `presidencia`) ou Assessoria (10.0001) → GABIN (10.0002).
- `homologador_de(u)`: nesses dois casos → a unidade da Presidência (10.0000).
- Testes: risco da Assessoria enviado por um gestor da Assessoria → valida o titular do GABIN; se crítico, homologa o Presidente; o Presidente não valida; envio feito pelo próprio Presidente de risco crítico é recusado na homologação com mensagem `RADAR:`; riscos de outras unidades não mudam (rodar 030/050 inteiros).

### Tarefa 2: objetos — unidade inativa, processo ativo e supervisor (P-B1-2, P-B1-3, P-B1-6)
**Arquivos:** criar `supabase/migrations/20261116002_objetos_regras.sql`; criar `supabase/tests/071_objetos_regras.test.sql`.
- `pode_criar_objeto_em(u)` exige `unidades.ativa`.
- Gatilho `BEFORE INSERT OR UPDATE` em `objetos_contexto`: (a) unidade nova (INSERT ou troca de `unidade_id`) precisa estar ativa; (b) `processo_id` novo (INSERT ou troca) precisa estar ativo; (c) com processo, `macroprocesso_supervisor_id := unidade_supervisora_id` do processo (ignora o valor enviado); sem processo, só a CGOV altera o campo (outros: mantém o valor antigo no UPDATE e nulo no INSERT, ou recusa — escolher recusar com `RADAR:` e registrar a escolha no comentário).
- Testes: CGOV não cria objeto em unidade inativa; objeto antigo em unidade inativa continua legível e a CGOV o reatribui a unidade ativa; vínculo a processo inativo recusado; objeto já ligado a processo que ficou inativo continua editável (sem trocar o processo) e o CG continua lendo; supervisor preenchido pelo processo; gestor não altera o supervisor.

### Tarefa 3: preliminar da CGOV (P-B1-5)
**Arquivos:** criar `supabase/migrations/20261116003_preliminar_cgov.sql`; criar `supabase/tests/072_preliminar_cgov.test.sql`.
- Políticas para `cgov` em `controles_existentes`, `respostas_tratamento`, `indicadores_kri` (INSERT/UPDATE/DELETE) e DELETE em `riscos`, só quando o risco está `preliminar_cgov`.
- Testes: CGOV grava/apaga controle, resposta e KRI de preliminar; CGOV apaga preliminar; depois de `assumir_risco_preliminar`, a CGOV não grava nem apaga mais; gestor de outra unidade continua sem acesso.

### Tarefa 4: DAR alterada recalcula os aprovados (P-B1-8)
**Arquivos:** criar `supabase/migrations/20261116004_dar_reavalia_aprovados.sql`; criar `supabase/tests/073_dar_reavalia.test.sql`.
- Gatilho em `categorias_risco` quando o apetite muda: recalcular a criticidade dos riscos `aprovado` da categoria **pelo cálculo existente**; os que passam a Críticos → `em_homologacao_dir` com linha no `historico_fluxo` (ação nova, ex. `reaberto_mudanca_dar`, se o CHECK da coluna permitir; senão, ampliar o CHECK na mesma migração); os que deixam de ser Críticos → só atualizam. Sem passar pela "reabertura por edição".
- Testes: apetite mais baixo torna um aprovado Crítico → `em_homologacao_dir` + histórico + trilha; apetite mais alto tira a criticidade → continua `aprovado`; riscos de outras categorias e não aprovados não mudam; o cálculo de 000 continua igual.

### Tarefa 5: CT de outra GR no importador (P-B1-4)
**Arquivos:** `scripts/sync-estrutura/converter.ts` (e/ou `compararEAplicar.ts`), `tests/unit/syncEstrutura.spec.ts`.
- Vínculo `microgrupo` "CT <nome>" com CT cuja GR (ancestral `gerencia-regional`) é diferente da GR da unidade → não entra (`coordenacao_territorial_id` nulo) e vira aviso no relatório ("vínculo com CT de outra GR ignorado").
- Testes com a fixture `tests/unit/fixtures/sharepoint/estrutura.csv` (acrescentar unidades fictícias se precisar). `npm test` e `npm run build`.

### Tarefa 6: documentação e verificação final
- Atualizar `docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md` §4.1 (itens implementados, com a migração de cada um), `docs/02-arquitetura-cgti/guia-supabase-local.md` (tabela de testes 070–073), `docs/02-arquitetura-cgti/modelo-dados-mer.md` (regras novas em uma linha cada), `docs/00-memoria/ESTADO-ATUAL.md` (seção "Etapa B1.1") e `docs/00-memoria/MOC-Radar.md` (links da spec e do plano).
- Verificação final: `npm test`, `npm run build`, `npm run test:a11y`, `npm run test:integracao` (com `db:funcoes`), `npm run db:reset && npm run test:db`.
