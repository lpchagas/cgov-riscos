# Decisões técnicas da etapa B1 (banco, alcance e RLS)

> **Para que serve este documento:** registrar, num lugar só e versionado, as decisões tomadas
> durante a construção da etapa B1 que **mudam o comportamento** do banco, do importador ou dos
> testes. Os comentários do código e os testes citam estas decisões pelo código (ex.: "decisão R9",
> "D1"). Cada linha diz **o que** foi decidido, **por quê** e **qual o custo ou efeito**.
>
> Base: spec [[2026-11-15-etapa-b1-banco-rls-design]], plano [[2026-11-15-etapa-b1-banco-rls-plan]],
> matriz [[matriz-acesso-responsabilidades]]. Normas: minutas da Política (SEI `024241420`) e da
> Metodologia (SEI `024421455`).
>
> Códigos: **R** = decisão técnica tomada durante a execução; **D** = decisão do dono do produto
> (CGOV) na revisão final, que tem precedência.

## 1. Decisões do dono do produto (revisão final)

| Código | Decisão | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **D1** | **Segregação "sobe um nível".** Quem **enviou** o risco (ou o **reabriu** ao editar a ficha aprovada) nunca o valida nem o homologa. Se quem enviou é o titular da chefia imediata, a validação **sobe** para a chefia da chefia (e assim por diante); o mesmo para o homologador (ex.: GR → Presidência). O atalho "validado e homologado pela mesma chefia" só vale quando validador e homologador **efetivos** coincidem — e nenhum deles é quem enviou. Sem nível acima → recusa `55000` com mensagem `RADAR:` (no envio, na validação e na edição que reabriria o risco). `devolver_risco` segue o mesmo validador/homologador efetivo. | Antes, o Gerente Regional que criava um risco num Serviço da própria GR o enviava e o validava sozinho (inclusive risco crítico, Extremo). O chefe de UC fazia o mesmo com riscos da própria Base Avançada. Isso quebra a segregação entre quem executa e quem valida (Metodologia 4.6; Decreto nº 9.203/2017). | Como foi feito: `historico_fluxo` ganhou `usuario_id` (quem agiu, `auth.uid()`) e `sequencia` (ordem das linhas). "Quem enviou" = autor da última linha `submetido` ou `reaberto_mudanca_nota`. Funções internas `fn_fluxo_validador_efetivo` e `fn_fluxo_homologador_efetivo` (migração `20261115004`). Leituras **mais seguras** escolhidas onde a decisão não dizia: (i) se o substituto de uma unidade enviou, o titular da mesma unidade também não valida — sobe; (ii) quem reabre por edição conta como quem enviou; (iii) a titularidade de quem enviou é conferida mesmo que o perfil tenha sido desativado depois; (iv) riscos sem linha de envio (os da semente de demonstração) seguem a chefia imediata normal. Efeito: mais trabalho para o nível de cima nesses casos. |
| **D2** | **Excluir risco** só em `rascunho`, `devolvido` ou `preliminar_cgov`. Risco `aprovado` não se apaga (`55000`, mensagem orientando a **editar**, o que reabre o fluxo). Em validação/homologação continua valendo a trava. Apagar o **objeto** de um risco aprovado também é recusado (a cascata não contorna a regra). | O risco aprovado faz parte do Plano de Gestão de Riscos; apagá-lo levaria junto o histórico do fluxo (cascata). Substitui a liberação anterior (R20b). | Gatilho `trg_riscos_trava_reabertura` (migração `20261115004`), que roda também nas linhas apagadas em cascata. Riscos aprovados de um objeto passam a impedir a exclusão do objeto. |
| **D3** | **Alcance do gestor** = própria unidade **e todas as descendentes**, como manda a spec (confirma R16). | A regra da P8 sai daí naturalmente; a spec é a fonte aprovada. | Um gestor não titular lotado na GR vê a GR inteira; o chefe de NGI vê as UCs abaixo. A matriz de acesso precisa ser alinhada (ver pendências). |

## 2. Decisões técnicas da execução

| Código | Decisão | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **R1** | `npm run db:reset` = `supabase db reset` + importador (`sync:estrutura -- --sim`) + semente de demonstração. | Um comando só recria o banco completo para os testes. | Nenhum. |
| **R2** | Ajudantes dos testes em `supabase/tests/ajudantes.psql`, incluídos com `\ir ajudantes.psql`. | O `supabase test db` roda como teste todo arquivo `.sql` da pasta. | Nenhum. |
| **R3** | A semente localiza unidades por `icmbio_id`. | A `sigla` não é única na árvore real. | Nenhum. |
| **R4** | A CLI 2.122 não tem `supabase db execute`; usa-se `supabase db query --file` ou `psql` na porta 54322. | Comando inexistente na versão instalada. | Nenhum. |
| **R5** | Unidade com `id_mae` igual ao próprio id (caso real 22.0078) vira "mãe inválida" (aviso + pai do grupo), não ciclo. Ciclos de 2 ou mais unidades continuam recusados. | Não travar a importação inteira por um erro da lista. | A CGOV precisa corrigir a lista (o aviso aparece no relatório). |
| **R6** | Processo com várias unidades líderes: guarda a 1ª e avisa. | O modelo tem uma unidade líder por processo. | A visão por processo pode omitir colíderes (rever na B3). |
| **R7** | O `TipoUnidade` do front (16 valores) fica para a B3. | A B1 não mexe no front. | Nenhum agora. |
| **R8** | Gravação **atômica** do importador pela função `sincronizar_estrutura` (SECURITY DEFINER, `search_path = ''`, só `service_role`), na migração `20261115001`. | Uma chamada de função = uma transação: ou grava tudo, ou nada. | Nenhum relevante. |
| **R9** | Vínculo com a Coordenação Territorial pela coluna `unidades.coordenacao_territorial_id`, preenchida a partir do `microgrupo` "CT &lt;nome&gt;". A árvore continua sendo `id_mae`. Alcance da CT = descendentes da CT + descendentes das unidades vinculadas. `chefia_imediata(u)` = CT quando há vínculo e a mãe é a GR. | Na lista do SharePoint a CT não é mãe das UCs; o vínculo só existe no texto do `microgrupo`. | Só a CT Curitiba tem unidades vinculadas até a CGOV completar a lista. |
| **R10** | Nenhuma categoria da semente tem apetite `pendente_dar`; o caso é testado no `050` mudando a categoria dentro da transação. | A DAR semeada já define todos os apetites. | Nenhum. |
| **R12 / R14** | Usuários da semente: `gestor.uc@` = FLONA de Caçador (21.0078, GR5, vínculo CT Curitiba); `ct@` = titular da CT Curitiba; `gr@` = titular da GR5. "UC sem CT" e "Base Avançada" ficam na GR1 (FLONA do Tapajós 21.0123, BAV Belterra 26.0112), com o usuário extra `gr1@`. | A GR5 não tem UC sem vínculo de CT. | 19 usuários fictícios em vez de 18. |
| **R13** | A etapa da semente no `db:reset` usa `docker exec -i supabase_db_cgov-riscos psql -v ON_ERROR_STOP=1`. | `supabase db query --file` não aceita vários comandos. | Depende do nome do contêiner (ver [[guia-supabase-local]]). |
| **R15** | Os ajudantes de teste seguem R2 (não `_ajudantes.sql`). | Evitar que o runner o trate como teste. | Nenhum. |
| **R16** | Alcance do gestor = própria unidade + descendentes (spec). Confirmado por **D3**. | Ver D3. | Ver D3. |
| **R17** | Funções extras `pode_escrever_unidade(u)` e `pode_criar_objeto_em(u)`. | O `WITH CHECK` da RLS precisa testar a unidade da linha NOVA, que ainda não está gravada. | Nenhum. |
| **R18** | `homologador_de` não conta a própria unidade (GR/Diretoria → Presidência) e devolve nulo para a Presidência. `enviar_para_validacao` recusa (`55000`) risco sem chefia acima. | Ninguém homologa a si mesmo; a Presidência não tem chefia na árvore. | Riscos da Presidência ainda não têm fluxo (pendência da CGOV). |
| **R19** | Leitura de objetos/riscos por `unidade_id IN (SELECT unidades_visiveis())` (calculado uma vez por consulta); `pode_ler_objeto` linha a linha só na visão por processo do CG. `pode_criar_objeto_em` só no INSERT; o UPDATE usa `pode_escrever_objeto` (linha atual) + `pode_escrever_unidade` (linha nova). | Desempenho e impedir que a exceção da CGOV (criar em qualquer unidade) vire edição de objetos alheios. | Nenhum. |
| **R20** | As funções do fluxo ligam o sinal `radar.fluxo` só em volta do UPDATE de estado e o desligam logo depois. A parte "DELETE de risco aprovado liberado" (R20b) foi **substituída por D2**. | O sinal não pode "vazar" para o resto da transação. | Nenhum. |
| **R22** | A trilha de auditoria também registra `perfis_usuarios` (troca de perfil, unidade e **titularidade**) e `categorias_risco` (mudanças da DAR), com `objeto_id` nulo — só a CGOV lê. Em `categorias_risco` (id numérico), `registro_id` fica nulo e o id está em `dados_novos->>'id'`. | Matriz, seção 5: "o registro da troca fica na trilha". `titular_chefia` decide quem valida e homologa. | `auditoria_log.registro_id` passou a aceitar nulo (migração `20261115005`). |
| **R23** | As funções `unidades_descendentes`, `chefia_imediata` e `homologador_de` devolvem UUIDs da árvore a uma conta logada **sem perfil**. Aceito, sem mudança. | O vazamento é só de identificadores (sem nomes, sem riscos). | Registrado como pendência técnica de baixa prioridade. |

## 3. Outras correções da revisão final

| Item | O que mudou | Onde |
| --- | --- | --- |
| Reabertura por categoria/objeto | Risco aprovado também volta à validação quando muda `categoria_id`, `objeto_id`, ou quando o cálculo muda `is_critico`/`status_critico`. Antes, trocar a categoria podia deixá-lo aprovado e crítico sem homologação. | `20261115004` (gatilho do risco) |
| Visitante sem login (`anon`) | `REVOKE ALL` nas 12 tabelas de negócio (defesa em profundidade: a RLS já negava). O anon recebe erro `42501` em vez de "0 linhas". | `20261115003`, seção 2 |
| Sequência das categorias | `setval` no fim do `supabase/seed.sql`: o 1º cadastro de categoria pela CGOV não colide mais com os ids 1 a 8. | `supabase/seed.sql` |
| Importador com `--sim` | Com `--sim`, só grava sem perguntar em banco local (127.0.0.1/localhost); banco remoto exige `--permitir-remoto`. | `scripts/sync-estrutura/destino.ts` |
| Cláusula morta | Removido `OR e_titular_de(homologador)` de `validar_risco` (reescrito conforme D1). | `20261115004` |

## 4. Pendências para decisão da CGOV

Itens conhecidos, **não implementados** na B1. Cada um precisa de decisão antes da B2/B3.

### 4.1 Regras de negócio

1. **Quem valida os riscos da Presidência** (R18): hoje o envio é recusado (`55000`).
2. `pode_criar_objeto_em` deixa a CGOV criar objeto em **unidade inativa**.
3. A **visão por processo** do Coordenador-Geral ignora `processos_cadeia_valor.ativo`.
4. `chefia_imediata` não confere se a CT do vínculo é da **mesma GR** da unidade (0 casos hoje).
5. A CGOV não grava controles, respostas e KRIs de risco `preliminar_cgov`, nem apaga preliminar criado por engano (spec 7.1).
6. `macroprocesso_supervisor_id` é livre para quem escreve no objeto (desvio da spec 8.1, que pede preenchê-lo a partir do processo).
7. **Alinhar a matriz de acesso com D3** (alcance do gestor = todas as descendentes).
8. **DAR mudada não reavalia riscos aprovados**: a reavaliação só acontece na próxima edição da ficha (que agora reabre o risco se a criticidade mudou) ou na validação.

### 4.2 Técnicas (baixa prioridade)

- **Importador:** mapa incompleto pode apagar mãe/líder/supervisor sem aviso; unidade sem tipo derruba os filhos (recomendação: parar quando `semTipo > 0`); `acharPaiDoGrupo` não filtra pai ativo; `--pasta` sem valor quebra; `ListSchema` com quebra de linha quebraria o parse; faltam testes de reativadas, 2+ ciclos independentes e de `aplicar`; `icmbio_id` nulo não é barrado no SQL; a regex compara o `microgrupo` inteiro; falta teste de CT ambígua.
- **Semente:** a guarda "2.02.3 existe" é genérica; os testes de descrição padrão são fracos.
- **Testes:** lacunas no `041` (DELETE positivo, tabelas filhas), no `050` (devolução em validação etc.) e no `030` (`homologador_de` GR→Presidência, `e_titular_de` de perfil inativo).
- **Mensagens `42501`** expõem o `codigo_radar` a quem está fora do alcance.
- `ALTER FUNCTION trigger_calcular_risco_radar SET search_path` (alternativa ao ajuste de caminho em `fn_fluxo_mudar_estado`; não muda o cálculo).
- O gatilho de auditoria usa `to_jsonb(OLD/NEW)` direto no `CASE`.
- **Risco movido entre objetos** na trilha: a linha guarda só o `objeto_id` novo (o objeto antigo não vê a saída).
- R23 (UUIDs da árvore visíveis a conta sem perfil).
