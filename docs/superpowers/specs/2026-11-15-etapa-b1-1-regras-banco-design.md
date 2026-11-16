# Design — Etapa B1.1: regras do banco decididas em 2026-11-15

> **Data:** 2026-11-15 · **Tamanho:** pequeno projeto · **Base:** [[2026-11-15-etapa-b1-banco-rls-design]],
> [[decisoes-tecnicas-b1]] §4.1, [[decisoes-tecnicas-b2]] §4.2 e [[matriz-acesso-responsabilidades]] §9
> · **Branch:** `feat/b1-1-regras-banco` (parte da `feat/b2-login-perfis`)

## 1. Por que

A B1 deixou 8 pendências de regra de negócio. O dono do produto (CGOV) decidiu todas em 2026-11-15,
por perguntas de múltipla escolha. A pendência 7 (alinhar a matriz) já foi feita na B2. As outras 7
mexem no banco: exigem **migrações novas** e testes pgTAP. A B1.1 as implementa antes da B3, para as
telas da B3 já lerem o banco com as regras definitivas.

## 2. Decisões (do dono do produto — não reabrir)

| Código | Regra |
|---|---|
| **P-B1-1** | Riscos da **Presidência** (unidade do tipo `presidencia` e a Assessoria da Presidência, `icmbio_id` 10.0001): **valida o titular do GABIN** (`icmbio_id` 10.0002) e **homologa o titular da Presidência** (10.0000). Exceção consciente à árvore (o GABIN é subordinado ao Presidente). A segregação D1 ("sobe um nível") continua valendo. |
| **P-B1-8** | **DAR alterada:** ao mudar o apetite de uma categoria, o banco **recalcula a criticidade** dos riscos **aprovados** daquela categoria. Os que passam a ser Críticos **voltam para homologação** (`em_homologacao_dir`), com registro no histórico do fluxo. Os que deixam de ser Críticos só têm a criticidade atualizada e continuam aprovados. |
| **P-B1-5** | **Preliminar da CGOV:** enquanto o risco estiver `preliminar_cgov`, a CGOV **grava controles, respostas e KRIs** dele e **pode apagá-lo**. Quando a unidade assume o risco, a CGOV perde a edição (como hoje). |
| **P-B1-2** | **Unidade inativa:** **ninguém** (nem a CGOV) cria objeto novo em unidade com `ativa = false`. Objetos e riscos antigos continuam visíveis, e a CGOV pode reatribuí-los a outra unidade (ativa). |
| **P-B1-3** | **Processo inativo:** o Coordenador-Geral **continua vendo** os riscos de processos inativos na visão por processo (já é assim). **Novos vínculos** (INSERT, ou UPDATE que troca `processo_id`) só aceitam processo **ativo**. A marca "processo inativo" é da tela (B3), lendo `processos_cadeia_valor.ativo`. |
| **P-B1-4** | **CT de outra GR:** o `sync:estrutura` **não grava** o vínculo de uma unidade com CT de outra Gerência Regional e lista o caso no relatório. A validação sobe para a GR da própria unidade. |
| **P-B1-6** | **Supervisor do objeto:** `macroprocesso_supervisor_id` é **preenchido pelo banco** a partir de `processos_cadeia_valor.unidade_supervisora_id` do processo ligado ao objeto e não pode ser alterado à mão. Sem processo, só a CGOV pode preenchê-lo. |

## 3. Restrições

- **Não alterar o cálculo** (Quadros 6, 7 e 8; `trigger_calcular_risco_radar`; `calculadoraRiscoRadar.ts`). A P-B1-8 só **dispara de novo** o cálculo existente.
- Migrações novas a partir de `20261116001_…`, uma por assunto, todas com comentários didáticos em português. Nada de editar migrações antigas.
- Testes pgTAP novos ou ampliados em `supabase/tests/` (padrão `\ir ajudantes.psql`, `entrar_como`). Os 475 testes atuais continuam passando.
- Mensagens de erro começam com `RADAR:`, com `ERRCODE` adequado (`insufficient_privilege` para permissão, `object_not_in_prerequisite_state` para estado).
- Trilha de auditoria continua registrando tudo (os gatilhos da B1 já cobrem as tabelas).
- Verificação: `npm run db:reset && npm run test:db`, `npm test`, `npm run build`, `npm run test:integracao` (com `db:funcoes`).
- Commit automático a cada tarefa aprovada (AGENTS.md, "Regras de Git").

## 4. Como fica (minhas escolhas, podem ser corrigidas)

- **P-B1-1:** `chefia_imediata(u)` devolve o GABIN quando `u` é a Presidência ou a Assessoria; `homologador_de(u)` devolve a própria Presidência nesses dois casos. Se quem enviou for o próprio Presidente, a regra "sobe um nível" não acha homologador acima e o envio é recusado com mensagem clara (o Presidente não homologa o próprio risco).
- **P-B1-8:** gatilho `AFTER UPDATE OF` (apetite) em `categorias_risco`. Para não disparar a "reabertura por edição" da ficha, o recálculo usa o mesmo sinal de transação do fluxo (`radar.fluxo`) e grava no histórico a ação `reaberto_mudanca_dar` (ou equivalente) com a categoria e o apetite novo. O autor no histórico é quem alterou a DAR (a CGOV).
- **P-B1-5:** novas políticas (ou ampliação das existentes) em `controles_existentes`, `respostas_tratamento`, `indicadores_kri` e DELETE em `riscos` para `cgov` quando o risco está `preliminar_cgov`. As travas D2 continuam.
- **P-B1-2 e P-B1-3:** checagem em `pode_criar_objeto_em` (unidade ativa) e em gatilho `BEFORE INSERT OR UPDATE` de `objetos_contexto` (processo ativo; unidade ativa quando a unidade muda).
- **P-B1-6:** o mesmo gatilho de `objetos_contexto` preenche `macroprocesso_supervisor_id` quando há processo e recusa alteração manual por quem não é CGOV quando não há processo.
- **P-B1-4:** só no importador TypeScript (`scripts/sync-estrutura/`): o vínculo cruzado não entra no payload e vira aviso. `chefia_imediata` não muda para isso.

## 5. Fora do escopo

Telas (B3), mudar o cálculo, mudar alcance de leitura, dados reais.
