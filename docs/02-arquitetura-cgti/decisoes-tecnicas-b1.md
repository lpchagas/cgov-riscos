# Decisões técnicas da etapa B1 (banco, alcance e RLS)

> **Arquivo congelado em 2026-11-20 (histórico).** Decisões vigentes: ADR-0005, ADR-0007, ADR-0011, ADR-0012, ADR-0013 (e ADR-0003 para os valores calculados). Não edite este arquivo; novas decisões vão em `docs/adr/`.

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

**Todas as 8 foram decididas em 2026-11-15** (perguntas de múltipla escolha ao dono do produto, a CGOV).
Itens 1 a 6 e 8: **implementados na etapa B1.1** (branch `feat/b1-1-regras-banco`, migrações `20261116001` a `20261116004`;
decisões da execução na seção 5). Item 7: **feito na B2 (documentação)**. Ver também [[decisoes-tecnicas-b2]] e a
seção 9 de [[matriz-acesso-responsabilidades]].

1. **Quem valida os riscos da Presidência** (R18): **decidido em 2026-11-15**: os riscos da Presidência (Presidente e Assessoria) são **validados pelo titular do GABIN** e **homologados pelo Presidente**. É uma exceção desenhada à árvore; o GABIN é subordinado ao Presidente e a decisão foi consciente.  **Implementado na B1.1** (`20261116001_fluxo_presidencia.sql`: `chefia_imediata` e `homologador_de` recriadas; teste `070`).
2. `pode_criar_objeto_em` deixava a CGOV criar objeto em **unidade inativa**: **decidido em 2026-11-15**: **ninguém** (nem a CGOV) cria objeto novo em unidade inativa; objetos e riscos antigos continuam visíveis e a CGOV pode reatribuí-los. **Implementado na B1.1** (`20261116002_objetos_regras.sql`: `pode_criar_objeto_em` exige unidade ativa; RPC `reatribuir_objeto` para a CGOV mover objeto de unidade inativa; teste `071`).
3. A **visão por processo** do Coordenador-Geral ignorava `processos_cadeia_valor.ativo`: **decidido em 2026-11-15**: o CG **continua vendo** riscos de processos inativos, com a marca "processo inativo"; novos objetos só se ligam a processos ativos. **Implementado na B1.1**: `pode_ler_objeto` ignora `ativo` (continua vendo); novos objetos só se ligam a processo ativo (gatilho `regras_objeto_contexto`, `20261116002`; teste `071`). A marca "processo inativo" na tela fica para a B3.
4. `chefia_imediata` não conferia se a CT do vínculo é da **mesma GR** da unidade (0 casos hoje): **decidido em 2026-11-15**: o `sync:estrutura` **ignora o vínculo** com CT de outra GR e o lista no relatório; a validação sobe para a GR da própria unidade. **Implementado na B1.1** no importador (`scripts/sync-estrutura/converter.ts`, `gerenciaRegionalDe`; teste em `tests/unit/syncEstrutura.spec.ts`); não exigiu migração.
5. A CGOV não gravava controles, respostas e KRIs de risco `preliminar_cgov`, nem apagava preliminar criado por engano (spec 7.1): **decidido em 2026-11-15**: enquanto `preliminar_cgov`, a CGOV **grava controles, respostas e KRIs e pode apagar** o risco; ao ser assumido pela unidade, perde a edição (como hoje). **Implementado na B1.1** (`20261116003_preliminar_cgov.sql`: `cgov_grava_no_risco_preliminar`, DELETE em `riscos` e escrita em controles, respostas, KRIs e medições; teste `072`).
6. `macroprocesso_supervisor_id` era livre (desvio da spec 8.1): **decidido em 2026-11-15**: é **preenchido pelo banco** a partir da unidade supervisora do processo da Cadeia de Valor ligado ao objeto e **não é editável**; sem processo, fica vazio e só a CGOV preenche. **Implementado na B1.1** (`20261116002_objetos_regras.sql`: gatilho `regras_objeto_contexto` preenche o supervisor; `propagar_supervisor_processo`; teste `071`).
7. **Alinhar a matriz de acesso com D3** (alcance do gestor = todas as descendentes) e com a spec B1 7.1 (o Diretor valida Centros e Coordenações-Gerais; a Presidência valida e homologa as unidades ligadas a ela): **decidido em 2026-11-15** (atualizar a matriz para o que o sistema faz). **Feito na B2 (documentação)**: seções 4, 5, 7 e 9 de [[matriz-acesso-responsabilidades]]; a B2 já aplica a 7.1 no front.
8. **DAR mudada não reavaliava riscos aprovados**: **decidido em 2026-11-15**: ao salvar nova DAR, o banco **recalcula a criticidade** dos riscos aprovados da categoria; os que passam a Crítico **voltam para homologação** (tratamento e KRI; Política, art. 8º, § 2º); os que deixam de ser Críticos só são atualizados. **Implementado na B1.1** (`20261116004_dar_reavalia_aprovados.sql`: gatilho `trg_categorias_dar_reavalia_aprovados`, ação de histórico `reaberto_mudanca_dar`; teste `073`).

### 4.2 Técnicas (baixa prioridade)

- **Importador:** mapa incompleto pode apagar mãe/líder/supervisor sem aviso; unidade sem tipo derruba os filhos (recomendação: parar quando `semTipo > 0`); `acharPaiDoGrupo` não filtra pai ativo; `--pasta` sem valor quebra; `ListSchema` com quebra de linha quebraria o parse; faltam testes de reativadas, 2+ ciclos independentes e de `aplicar`; `icmbio_id` nulo não é barrado no SQL; a regex compara o `microgrupo` inteiro; falta teste de CT ambígua.
- **Semente:** a guarda "2.02.3 existe" é genérica; os testes de descrição padrão são fracos.
- **Testes:** lacunas no `041` (DELETE positivo, tabelas filhas), no `050` (devolução em validação etc.) e no `030` (`homologador_de` GR→Presidência, `e_titular_de` de perfil inativo).
- **Mensagens `42501`** expõem o `codigo_radar` a quem está fora do alcance.
- `ALTER FUNCTION trigger_calcular_risco_radar SET search_path` (alternativa ao ajuste de caminho em `fn_fluxo_mudar_estado`; não muda o cálculo).
- O gatilho de auditoria usa `to_jsonb(OLD/NEW)` direto no `CASE`.
- **Risco movido entre objetos** na trilha: a linha guarda só o `objeto_id` novo (o objeto antigo não vê a saída).
- R23 (UUIDs da árvore visíveis a conta sem perfil).

## 5. Decisões técnicas da B1.1

Etapa B1.1 ("regras do banco"): as pendências 1 a 6 e 8 da seção 4.1, em quatro migrações
(`20261116001` a `20261116004`), os testes `070` a `073` e uma mudança no importador. Cada decisão abaixo
nasceu na execução (revisão por tarefa) e segue o formato "o que / por quê / custo".

| Código | O que foi decidido | Por quê | Custo |
| --- | --- | --- | --- |
| **B11-1** | Mover objeto de unidade inativa para outra é feito pela **RPC `reatribuir_objeto(objeto, nova_unidade)`** (`SECURITY DEFINER`, só CGOV, só objeto em unidade inativa, só para unidade ativa, só altera `unidade_id`), e não por política de RLS. | A primeira versão (política permissiva extra) deixava **qualquer escritor** mover o objeto para outra unidade ativa. A RPC é mais estreita e a trilha de auditoria registra a CGOV. | A B3 chama a RPC em vez de um `UPDATE`. Na mudança, o validador e o homologador de riscos em andamento do objeto mudam junto (intencional: a unidade antiga foi extinta). |
| **B11-2** | Tirar o objeto do processo (`processo_id` vai a `NULL`) **limpa o supervisor** herdado automaticamente. O gestor pode desvincular enviando a linha inteira (supervisor nulo ou igual ao antigo). | Evita valor órfão e o erro `42501` no formulário da B3, que vai enviar a linha inteira. | Quem não é CGOV não consegue "guardar" o supervisor de um objeto que saiu do processo (só a CGOV preenche sem processo). |
| **B11-3** | Gatilho `propagar_supervisor_processo` (`AFTER UPDATE OF unidade_supervisora_id` em `processos_cadeia_valor`) **propaga** o novo supervisor aos objetos do processo. | Sem ele o supervisor ficava velho até o próximo `UPDATE` do objeto. Como é `SECURITY DEFINER`, funciona também no `sync:estrutura`. Quem escreve em `processos_cadeia_valor` é só o importador (`sync:estrutura`) ou um administrador do banco; a CGOV não troca o supervisor do processo pela aplicação. | Um `UPDATE` em cada objeto do processo (uma linha de auditoria por objeto). |
| **B11-4** | Em `devolver_risco` há um **caminho da CGOV**: quando o estado atual **não tem ator efetivo** (`em_homologacao_dir` sem homologador efetivo, ou `em_validacao_cg` sem validador efetivo), só um usuário com perfil `cgov` ativo devolve o risco (motivo obrigatório). Com ator efetivo, a CGOV continua recebendo `42501`. | Dá saída real ao "a CGOV resolve" dito no aviso do histórico da DAR; sem ele o risco ficaria preso para sempre. | A CGOV ganha um poder de fluxo, restrito a esse caso. O histórico usa a mesma linha da devolução comum, assinada pela CGOV. |
| **B11-5** | A P-B1-8 usa **`is_critico` de falso para verdadeiro** como "passa a ser Crítico", **inclusive na 1ª publicação da DAR** (saída de `pendente_dar`). Ir para `pendente_dar` sem virar Crítico **não** reabre o risco. | É o literal da decisão do usuário (tratamento e KRI exigem homologação só de quem é Crítico). | Quem está em `pendente_dar` só é reaberto quando a DAR for publicada e o risco virar Crítico. |
| **B11-6** | **Ruído de auditoria aceito:** ao mudar a DAR, **todo** risco aprovado da categoria recebe o `UPDATE` de recálculo e ganha 1 linha na trilha (e `atualizado_em` novo), mesmo sem mudar de criticidade. | Filtrar só os casos afetados repetiria a regra do cálculo em outro lugar. | Trilha mais cheia depois de cada mudança de DAR. |
| **B11-7** | **D1 vale para as subunidades internas da Presidência:** se o Presidente envia risco de uma subunidade ligada a ele, o validador "sobe" ao GABIN (antes o envio era recusado). | Coerente com "sobe um nível" (D1) e com a P-B1-1; o GABIN passou a ser o degrau acima do Presidente. | Se a CGOV discordar, só `chefia_imediata` precisa mudar. |
| **B11-8** | **Recusa já no envio** quando o risco exige homologação e não há homologador efetivo (ex.: Presidente enviando risco crítico da Presidência): `enviar_para_validacao` e `fn_fluxo_exigir_validador_na_reabertura` (que ganhou o 3º parâmetro `p_critico`) recusam com `55000`; `validar_risco` mantém a checagem como rede de segurança (a DAR pode mudar na espera) e distingue "unidade sem homologador na árvore" de "quem enviou é o titular do homologador". | A primeira versão só recusava na validação e o risco ficava preso em `em_validacao_cg`. | O envio recalcula a criticidade (mesmo truque de `validar_risco`), o que grava uma linha de auditoria no mesmo estado. |
| **B11-9** | **`medicoes_kri` entra na P-B1-5**, além de controles, respostas e KRIs (via KRI → risco). | Coerência: sem a medição, a CGOV não conseguiria preencher o KRI que gravou. | Um conjunto de políticas a mais. O risco residual aceito: a CGOV pode mover filho entre um preliminar e um risco de objeto da própria CGOV (poder que ela já tinha). |

Outros detalhes de implementação: a semente ganhou o titular do GABIN (`gabin@radar.test`, cargo "Chefe de Gabinete"); a
Presidência é achada por `icmbio_id` fixo (`10.0000` Presidência, `10.0001` Assessoria, `10.0002` GABIN), porque as
siglas se repetem; o gatilho dos objetos só confere unidade e processo ativos quando o valor muda (o histórico segue
editável); `auth.uid()` nulo (semente, importador, `service_role`) passa nas travas.

### Pendências novas (a decidir ou a fazer depois)

1. **Cargo vago trava o fluxo.** Se a unidade que valida ou homologa **não tem titular ativo** (cargo vago), o risco fica parado; só a CGOV o desbloqueia, e apenas no caso sem ator efetivo (B11-4). Decisão futura: delegação ou substituto.
2. **Ramo "validador sem ator efetivo" sem teste.** O caminho da B11-4 em `em_validacao_cg` não tem teste (o do `em_homologacao_dir` tem), pois exige uma unidade sem GABIN ou sem validador na árvore.
3. **Tipo TypeScript do histórico.** `HistoricoFluxoItem.acao` (`src/types/radar.types.ts`) não lista `reaberto_mudanca_dar` (nem outras ações da B1, como `validado` e `homologado`). **B3.**
4. **`atualizado_em` muda em aprovados não alterados** (consequência de B11-6). A tela da B3 não deve ler isso como "ficha editada". **B3.**
5. **TOCTOU "assumir" × escrita da CGOV** (nota): a unidade pode assumir o risco preliminar no mesmo instante em que a CGOV grava nele. As políticas da CGOV dependem do estado `preliminar_cgov` lido na hora de cada comando, então a gravação que chegar depois da assunção é recusada; não há teste de concorrência. Registrado como risco conhecido e baixo.
6. **Errata de comentários antigos.** Comentários das migrações `20261115004` e `20261115005` ficaram desatualizados e **não foram reescritos** (migração aplicada não se edita): (a) na `004`, os comentários que descrevem a Presidência como sem validador e `chefia_imediata`/`homologador_de` sem exceção para ela; (b) na `005` (linhas 73 a 75), a afirmação sobre o que `enviar_para_validacao` registra na trilha: agora ele também grava uma linha de `UPDATE` no mesmo estado, pelo recálculo da criticidade (B11-8). Vale o que dizem as migrações `20261116001` a `20261116004` e esta seção.
7. **IDs fixos `10.0000`, `10.0001` e `10.0002`.** `chefia_imediata` e `homologador_de` localizam a Presidência, a Assessoria e o GABIN por esses `icmbio_id`. O `sync:estrutura` precisa **manter esses IDs** (hoje mantém; se o SharePoint os mudar, a regra da Presidência para de valer).
