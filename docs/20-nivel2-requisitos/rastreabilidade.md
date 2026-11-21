# Matriz de rastreabilidade do RADAR

**Rastreabilidade** é poder seguir um requisito nos dois sentidos: da norma até o teste que o prova, e do
teste de volta até a norma. A matriz abaixo faz esse caminho em uma única tabela: o **dispositivo
normativo** (artigo, item ou decisão da CGOV) leva à **regra de negócio** ([[regras-negocio]], `RN-NNN`), que
leva ao **requisito funcional** ([[requisitos-funcionais]], `RF-NNN`), ao **caso de uso**
([[casos-de-uso/README|casos de uso]], `UC-NN`), à **tela** (rota), à **tabela ou função do banco** e ao
**teste automatizado**. A CGTI usa a matriz na auditoria (ISO/IEC/IEEE 29148:2018) para responder a três
perguntas: toda norma virou requisito? todo requisito implementado tem teste? e o que ainda falta fazer?

**Como ler.** Há **uma linha por requisito funcional** (195 linhas), agrupadas pelos 14 módulos do catálogo.
Os requisitos de qualidade (`RNF-NNN`, [[requisitos-nao-funcionais]]) ficam em tabela própria, mais abaixo.

- **Dispositivo normativo:** vem da coluna Origem da regra de negócio relacionada (com o rótulo
  "texto saneado" quando a redação é a do saneamento de 20/11/2026) ou, se o requisito não tem regra, da
  Origem do próprio requisito. "Regra do sistema (...)" quer dizer que a regra vem de uma decisão da CGOV
  ou do `AGENTS.md`, sem texto literal nas minutas (Política SEI `024241420`; Metodologia SEI `024421455`).
  Com duas regras de origens diferentes, a linha mostra as duas primeiras, com a norma literal na frente.
- **UC:** os casos de uso cuja linha de metadados cita o requisito.
- **Tela (rota):** a rota de `src/router/index.ts`. "—" quando o requisito é só de banco ou de comando de
  linha (`sync:estrutura`, `sync:atribuicoes`); **"a prototipar"** quando o requisito precisa de uma tela que
  ainda não existe.
- **Tabela/função SQL:** nome conferido nas migrações de `supabase/migrations/`. Quando a lógica está no
  navegador (e não no banco), a célula diz isso.
- **Teste:** o teste citado na Situação do requisito. Os `*.spec.ts` ficam em `tests/unit/` (os marcados
  `integracao/`, em `tests/integracao/`); `pgTAP NNN` é o arquivo de `supabase/tests/` com o bloco ("bl.") ou
  o item entre parênteses. "(parcial)" quer dizer que o teste cobre só o trecho já feito. "— (não iniciado,
  LAC-NN)" é requisito sem implementação, ligado à lacuna do [[lacunas-norma-sistema]].

As colunas de dados (tabelas e funções) e de tela (rotas) ainda serão completadas pelas tarefas do Nível 3
e do Nível 4 ([[MOC-Radar]]); o que está aqui foi conferido no código em 21/11/2026.

## Matriz por requisito funcional

### 1. Acesso

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema ([[matriz-acesso-responsabilidades]] §8) / Regra do sistema (decisões P6 e B2-3) | RN-026, RN-030 | RF-001 | UC-01 | `/entrar`; `/entrar/retorno` | `perfis_usuarios` | `integracao/login.spec.ts`; `telasAcesso.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) | RN-030 | RF-002 | UC-01 | `/entrar` | — (Supabase Auth) | `telasAcesso.spec.ts`; `integracao/login.spec.ts` |
| Regra do sistema ([[matriz-acesso-responsabilidades]] §8) | RN-026 | RF-003 | UC-01 | `/acesso-nao-liberado` | `meu_perfil`; `perfis_usuarios` | `authStoreReal.spec.ts`; `telasAcesso.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) / Regra do sistema ([[matriz-acesso-responsabilidades]] §5, "uma pessoa, uma unidade, um perfil") | RN-030, RN-031 | RF-004 | UC-02 | `/usuarios` | Edge Function `gerenciar-acesso`; `perfis_usuarios` | `integracao/gerenciarAcesso.spec.ts`; `usuariosPerfisPagina.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) / Regra do sistema ([[matriz-acesso-responsabilidades]] §5, "uma pessoa, uma unidade, um perfil") / … | RN-030, RN-031, RN-032 | RF-005 | UC-02 | `/usuarios` | Edge Function `gerenciar-acesso`; `perfis_usuarios` | pgTAP `041` bl. 9; `usuariosPerfisPagina.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) | RN-030 | RF-006 | UC-02 | `/usuarios` | Edge Function `gerenciar-acesso`; `perfis_usuarios` | `integracao/gerenciarAcesso.spec.ts`; `usuariosPerfisPagina.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) | RN-030 | RF-007 | UC-02 | `/usuarios` | Edge Function `gerenciar-acesso`; `perfis_usuarios` | `situacaoConta.spec.ts`; `integracao/gerenciarAcesso.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) / Regra do sistema ([[matriz-acesso-responsabilidades]] §5, "uma pessoa, uma unidade, um perfil") | RN-030, RN-031 | RF-008 | UC-02 | — (comando `sync:atribuicoes`) | `perfis_usuarios` | `integracao/syncAtribuicoes.spec.ts` |
| Regra do sistema ([[matriz-acesso-responsabilidades]] §5, "uma pessoa, uma unidade, um perfil") | RN-031 | RF-009 | UC-02 | — (comando `sync:atribuicoes`) | `perfis_usuarios` | `syncAtribuicoes.spec.ts` |
| Regra do sistema (decisões B2-5 e B2-9) | RN-032 | RF-010 | UC-02 | — (comando `sync:atribuicoes`) | `perfis_usuarios` | `syncAtribuicoes.spec.ts`; `integracao/syncAtribuicoes.spec.ts` |
| Regra do sistema (spec da etapa B2) | RN-100 | RF-011 | UC-02 | — (comando `sync:atribuicoes`) | — (a matrícula não é gravada) | `syncAtribuicoes.spec.ts` |
| Regra do sistema (decisões D3 e P8) / Regra do sistema (decisão P2, com base no Regimento Interno art. 16) / … | RN-021, RN-022, RN-023, RN-024, RN-025, RN-026 | RF-012 | UC-01, UC-20 | — (vale em todas as telas) | `unidades_visiveis`; `pode_ler_objeto`; políticas RLS | pgTAP `030` bl. 2 a 12; pgTAP `040` bl. 2, 3 e 5; `integracao/fonteSupabaseLeitura.spec.ts` |
| Metodologia 4.6.2 (texto saneado) / Regra do sistema ([[matriz-acesso-responsabilidades]] §8, item 5) | RN-027, RN-028 | RF-013 | UC-05 | — (vale em todas as telas) | `pode_escrever_unidade`; `pode_escrever_objeto` | pgTAP `041` bl. 1, 2 e 6 |
| Regra do sistema (decisão P3, com base na Política art. 16, minuta original) | RN-029 | RF-014 | — | — (vale em todas as telas) | `pode_escrever_objeto` | pgTAP `041` bl. 3; `acessoPorPerfil.spec.ts` |
| Regra do sistema (decisões P6 e B2-3) / Regra do sistema (decisão P5) | RN-030, RN-033 | RF-015 | UC-01 | todas as rotas (guarda em `src/router/index.ts`) | — | `guardaRotas.spec.ts`; `shellPorPerfil.spec.ts` |

### 2. Estrutura

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema (decisões D3 e P8) | RN-021 | RF-016 | UC-03 | — (comando `sync:estrutura`) | — (lógica em `scripts/sync-estrutura/`) | `syncEstrutura.spec.ts`; pgTAP `015` (a) |
| — | — | RF-017 | UC-03 | — (comando `sync:estrutura`) | — (lógica em `scripts/sync-estrutura/`) | `syncEstrutura.spec.ts` |
| — | — | RF-018 | UC-03 | — (comando `sync:estrutura`) | `sincronizar_estrutura`; `unidades` | pgTAP `015` (b) |
| Regra do sistema (decisão P-B1-2) / Regra do sistema (decisões P-B1-2 e B11-1) | RN-034, RN-105 | RF-019 | UC-03 | — (comando `sync:estrutura`) | `sincronizar_estrutura`; `unidades` | `syncEstrutura.spec.ts` |
| Regra do sistema (decisão P2, com base no Regimento Interno art. 16) | RN-022 | RF-020 | UC-03 | — (comando `sync:estrutura`) | `sincronizar_estrutura`; `unidades` | pgTAP `016` (a); `syncEstrutura.spec.ts` |
| Regra do sistema (decisão P2, com base no Regimento Interno art. 16) | RN-022 | RF-190 | UC-03 | — (comando `sync:estrutura`) | `sincronizar_estrutura`; `unidades` | pgTAP `016` (b) |
| Regra do sistema (decisões P1b e P-B1-3) / Regra do sistema (decisões P-B1-6, B11-2 e B11-3) | RN-024, RN-036 | RF-021 | UC-03 | — (comando `sync:estrutura`) | `sincronizar_estrutura`; `processos_cadeia_valor` | `syncEstrutura.spec.ts`; pgTAP `015` (a) |

### 3. Objetos

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema (decisão P-B1-2) | RN-034 | RF-022 | UC-04 | `/objetos` | `objetos_contexto`; `pode_criar_objeto_em` | `objetosPagina.spec.ts` |
| Regra do sistema (decisão P-B1-2) | RN-034 | RF-023 | UC-04 | `/objetos` | `pode_criar_objeto_em`; `regras_objeto_contexto` | pgTAP `071` bl. 1; `objetosPagina.spec.ts` |
| Regra do sistema (decisões P-B1-2 e B11-1) | RN-105 | RF-024 | UC-04 | `/objetos` | `reatribuir_objeto` | `objetosPagina.spec.ts`; `integracao/fonteSupabaseGravacao.spec.ts` |
| Regra do sistema (decisão P-B1-3) | RN-035 | RF-025 | UC-04 | `/objetos` | `regras_objeto_contexto`; `propagar_supervisor_processo`; `processos_cadeia_valor` | pgTAP `071` bl. 2; `objetosPagina.spec.ts` |
| Regra do sistema (decisões P-B1-6, B11-2 e B11-3) | RN-036 | RF-026 | UC-04 | `/objetos` | `regras_objeto_contexto`; `propagar_supervisor_processo`; `processos_cadeia_valor` | pgTAP `071` bl. 2 e 5; `objetosPagina.spec.ts` |
| Regra do sistema (decisões P-B1-6, B11-2 e B11-3) | RN-036 | RF-027 | UC-04 | `/objetos` | `regras_objeto_contexto`; `objetos_contexto` | pgTAP `071` bl. 3; `integracao/fonteSupabaseGravacao.spec.ts` |
| Regra do sistema (decisão P-B1-2) / Regra do sistema (decisão P-B1-3) | RN-034, RN-035 | RF-028 | UC-04 | `/objetos` | `unidades`; `processos_cadeia_valor`; `objetos_contexto` | `objetosPagina.spec.ts`; `conversores.spec.ts` |
| Regra do sistema (decisão D2, que cita o histórico do Plano) | RN-050 | RF-029 | UC-04 | `/objetos` | `objetos_contexto`; `riscos` | pgTAP `050` bl. 8b |

### 4. Riscos

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.2.1 | RN-014 | RF-030 | UC-05 | `/riscos/novo` | `riscos` | `novoRiscoPagina.spec.ts` |
| Metodologia 4.2.1 | RN-014 | RF-031 | UC-05 | `/riscos/novo` | — (descrição montada no navegador) | `calculadoraRiscoRadar.spec.ts`; pgTAP `020` bl. 10 |
| Metodologia 4.2.2, Quadro 2 | RN-015 | RF-032 | UC-05 | `/riscos/novo` | `categorias_risco`; `riscos` | — (parcial, sem teste do trecho feito) |
| Regra do sistema (AGENTS.md, regra 5) | RN-016 | RF-033 | UC-05 | `/riscos/novo` | — (regra no navegador: `calculadoraRiscoRadar.ts`) | `calculadoraRiscoRadar.spec.ts` |
| Regra do sistema (AGENTS.md, regra 5) | RN-006 | RF-034 | UC-05 | `/riscos/novo` | `riscos` | `calculadoraRiscoRadar.spec.ts`; `novoRiscoPagina.spec.ts` |
| Regra do sistema (AGENTS.md, regra 5) | RN-018 | RF-035 | UC-05 | `/riscos/novo` | `riscos` | `novoRiscoPagina.spec.ts` (parcial) |
| Metodologia 4.2.2.1, Quadro 3; Portaria ICMBio nº 253/2026 | RN-017 | RF-036 | UC-05 | `/riscos/novo` | `riscos` | `novoRiscoPagina.spec.ts` (parcial) |
| Metodologia 4.3, a, Quadro 4 | RN-011 | RF-037 | UC-06 | `/riscos/novo` | `riscos` | — (não iniciado, LAC-12) |
| Metodologia 4.3, b, Quadro 5 | RN-012 | RF-038 | UC-06 | `/riscos/novo` | `riscos` | — (parcial, sem teste do trecho feito) |
| Metodologia 4.3, c, e fórmula do residual / Regra do sistema (AGENTS.md, regra 4) | RN-003, RN-004 | RF-039 | UC-06 | `/riscos/novo` | `controles_existentes`; `salvar_ficha_risco` | pgTAP `050` bl. 8; `novoRiscoPagina.spec.ts` |
| Regra do sistema (AGENTS.md, regra 4) | RN-004 | RF-040 | UC-06 | `/riscos/novo` | `controles_existentes`; `salvar_ficha_risco` | `novoRiscoPagina.spec.ts` |
| Metodologia 4.3, Quadro 7 | RN-001 | RF-041 | UC-06 | `/riscos/novo` | `calcular_nivel_inerente_q7` | `calculadoraRiscoRadar.spec.ts`; pgTAP `000` bl. 1 |
| Metodologia 4.3, c, e fórmula do residual | RN-003 | RF-042 | UC-06 | `/riscos/novo` | `trigger_calcular_risco_radar` | `calculadoraRiscoRadar.spec.ts` |
| Metodologia 4.3, Quadro 8 / Regra do sistema (`classificar_nivel_q8`) | RN-002, RN-007 | RF-043 | UC-06 | `/riscos/novo` | `classificar_nivel_q8` | `calculadoraRiscoRadar.spec.ts`; pgTAP `000` bl. 2 |
| Regra do sistema (AGENTS.md, regra 4) | RN-004 | RF-044 | UC-06 | `/riscos/novo` | `trigger_calcular_risco_radar` | `calculadoraRiscoRadar.spec.ts`; pgTAP `000` bl. 3; `novoRiscoPagina.spec.ts` |
| Regra do sistema (decisão B3-8) | RN-013 | RF-045 | UC-06, UC-24 | `/riscos/novo` | `trigger_calcular_risco_radar`; `salvar_ficha_risco` | pgTAP `081` (h); `conversores.spec.ts` |
| Regra do sistema (decisão B3-8) | RN-013 | RF-046 | UC-06 | `/riscos/novo` | — (prévia no navegador) | `novoRiscoPagina.spec.ts` |
| Regra do sistema (decisão B3-9) | RN-099 | RF-047 | UC-05, UC-12 | `/riscos/novo` | `salvar_ficha_risco`; `riscos` | pgTAP `081` (a)/(b); `fonteDemonstracao.spec.ts` |
| Metodologia 4.5.1 | RN-020 | RF-048 | UC-07 | `/riscos/novo` | `riscos` | `conversores.spec.ts` (parcial) |
| Política art. 8º, § 2º; Metodologia 4.5 / Metodologia 4.5.1 | RN-019, RN-020 | RF-049 | UC-07 | `/riscos/novo` | `riscos`; `respostas_tratamento` | — (não iniciado, LAC-13) |
| Política art. 8º, § 2º; Metodologia 4.5 | RN-019 | RF-050 | UC-07 | `/riscos/novo` | `riscos`; `respostas_tratamento` | — (parcial, sem teste do trecho feito) |
| Política art. 8º, § 2º; Metodologia 4.5 | RN-019 | RF-051 | UC-07 | `/riscos/novo` | `respostas_tratamento` | `conversores.spec.ts`; `integracao/fonteSupabaseGravacao.spec.ts` |
| Matriz §7, linha "Riscos — lista" | — | RF-052 | UC-20 | `/riscos` | — (filtros no navegador) | `filtrosERotulos.spec.ts`; `objetosPagina.spec.ts` |
| Metodologia item 2, V; Política art. 8º, § 1º | RN-005 | RF-053 | UC-20 | `/riscos` | `riscos` | `filtrosERotulos.spec.ts` |
| Metodologia 4.2.1 | RN-014 | RF-054 | — | `/riscos/:id` | `riscos`; `controles_existentes`; `respostas_tratamento`; `indicadores_kri` | `fichaPagina.spec.ts` |
| Regra do sistema (decisão D2, que cita o histórico do Plano) | RN-050 | RF-055 | UC-12 | `/riscos/:id` | `riscos` | pgTAP `050` bl. 8b; `acoesDoRisco.spec.ts` |

### 5. Fluxo interno (FS-01)

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema (decisões P-B1-5 e B11-9) | RN-048 | RF-056 | UC-12 | `/riscos/novo` | `salvar_ficha_risco`; `riscos` | pgTAP `050` bl. 11; pgTAP `081` (f) |
| Regra do sistema (decisões P-B1-5 e B11-9) | RN-048 | RF-191 | UC-12 | `/riscos/:id` | `cgov_grava_no_risco_preliminar` | pgTAP `072` bl. 1 |
| Regra do sistema (decisões P-B1-5 e B11-9) / Regra do sistema (decisão D2, que cita o histórico do Plano) | RN-048, RN-050 | RF-057 | UC-12 | `/riscos/:id` | `riscos` | pgTAP `072` bl. 2 |
| Regra do sistema (decisões P-B1-5 e B11-9) | RN-048 | RF-058 | UC-12 | `/riscos/:id` | `assumir_risco_preliminar` | pgTAP `050` bl. 11; pgTAP `072` bl. 6; `fonteDemonstracao.spec.ts` |
| Regra do sistema (decisão P-B1-5) | RN-049 | RF-059 | UC-12 | `/riscos/:id` | `cgov_grava_no_risco_preliminar` | pgTAP `072` bl. 6 |
| Regra do sistema ([[matriz-acesso-responsabilidades]] §8, item 5) / Regra do sistema (fluxo FS-01, migração `20261115004`) | RN-027, RN-037 | RF-060 | — | `/riscos/novo?editar=<id>` | `salvar_ficha_risco` | pgTAP `050` bl. 1 |
| Regra do sistema (fluxo FS-01, atividades FS-01.07 e FS-01.09) | RN-046 | RF-061 | UC-11 | `/riscos/:id` | `historico_fluxo` | `acoesDoRisco.spec.ts` |
| Regra do sistema (decisão R20) | RN-038 | RF-062 | UC-08, UC-11 | `/riscos/:id`; `/riscos/novo` | `enviar_para_validacao` | pgTAP `050` bl. 1; `novoRiscoPagina.spec.ts` |
| Regra do sistema (decisões R18 e B11-8) | RN-039 | RF-063 | UC-08 | `/riscos/:id` | `enviar_para_validacao`; `fn_fluxo_validador_efetivo`; `fn_fluxo_homologador_efetivo` | pgTAP `070` bl. 5 (parcial) |
| Regra do sistema (fluxo FS-01, migração `20261115004`) | RN-037 | RF-064 | UC-08 | `/riscos/:id` | `fn_fluxo_aplicar_trava` | pgTAP `050` bl. 3; `fichaPagina.spec.ts` |
| Regra do sistema (decisão R20) | RN-038 | RF-065 | UC-08 | — | `fn_bloquear_status_fluxo_direto`; `fn_fluxo_mudar_estado` | pgTAP `041` bl. 7 |
| Regra do sistema (decisão P4) | RN-040 | RF-066 | UC-08, UC-09 | — | `chefia_imediata`; `fn_fluxo_validador_efetivo` | pgTAP `030` bl. 13; pgTAP `050` bl. 1, 4, 5 e 6 |
| Regra do sistema (decisão P4) | RN-042 | RF-067 | UC-08, UC-10 | — | `homologador_de`; `fn_fluxo_homologador_efetivo` | pgTAP `030` bl. 13; pgTAP `050` bl. 1 e 5 |
| Regra do sistema (decisão D1, "sobe um nível") | RN-044 | RF-068 | UC-08, UC-09, UC-10 | — | `fn_fluxo_validador_efetivo`; `fn_fluxo_quem_enviou` | pgTAP `050` bl. 8d |
| Regra do sistema (decisões P-B1-1 e B11-7) | RN-043 | RF-069 | UC-08, UC-09, UC-10 | — | `fn_fluxo_validador_efetivo`; `fn_fluxo_homologador_efetivo` | pgTAP `070` bl. 2 a 4; pgTAP `050` bl. 12 |
| Regra do sistema (decisões B2-5 e B2-9) | RN-032 | RF-070 | UC-09, UC-10 | `/aprovacoes` | `e_titular_de`; `fn_fluxo_titular_da_unidade`; `validar_risco`; `homologar_risco` | pgTAP `030` bl. 8; pgTAP `050` bl. 4 |
| Regra do sistema (decisão P4) | RN-041 | RF-071 | UC-09 | `/aprovacoes`; `/riscos/:id` | `validar_risco`; `fn_fluxo_homologador_efetivo` | pgTAP `050` bl. 6; pgTAP `070` bl. 2 |
| Regra do sistema (decisão P4) / Regra do sistema (valor `pendente_dar`, migração `20261109001`) | RN-041, RN-010 | RF-072 | UC-09 | `/aprovacoes`; `/riscos/:id` | `validar_risco`; `fn_fluxo_homologador_efetivo` | pgTAP `050` bl. 1 e 10; `aprovacoesPagina.spec.ts` |
| Regra do sistema (decisão D1) | RN-045 | RF-073 | UC-09 | `/aprovacoes`; `/riscos/:id` | `validar_risco`; `fn_fluxo_homologador_efetivo` | pgTAP `050` bl. 4 |
| Regra do sistema (decisões R18 e B11-8) | RN-039 | RF-074 | UC-09 | `/aprovacoes`; `/riscos/:id` | `validar_risco`; `fn_fluxo_homologador_efetivo` | pgTAP `070` bl. 5b; pgTAP `050` bl. 10b |
| Regra do sistema (decisão P4) | RN-041 | RF-075 | UC-10 | `/aprovacoes`; `/riscos/:id` | `homologar_risco` | pgTAP `050` bl. 1, 5 e 9; pgTAP `070` bl. 3 |
| Regra do sistema (fluxo FS-01, atividades FS-01.07 e FS-01.09) | RN-046 | RF-076 | UC-11 | `/aprovacoes`; `/riscos/:id` | `devolver_risco` | pgTAP `050` bl. 10; `acoesDoRisco.spec.ts` |
| Regra do sistema (fluxo FS-01, atividades FS-01.07 e FS-01.09) / Regra do sistema (decisão D1, "sobe um nível") | RN-046, RN-044 | RF-077 | UC-11 | `/aprovacoes`; `/riscos/:id` | `devolver_risco` | pgTAP `050` bl. 8d e 10; pgTAP `080` bl. 2 |
| Regra do sistema (decisão B11-4) | RN-047 | RF-078 | UC-11 | `/aprovacoes`; `/riscos/:id` | `devolver_risco` | — (parcial, sem teste do trecho feito) |
| Regra do sistema (decisão P4) | RN-040, RN-042 | RF-079 | UC-09, UC-10 | `/aprovacoes` | `acoes_no_fluxo` | `aprovacoesPagina.spec.ts` |
| Regra do sistema (decisão B11-4) | RN-047 | RF-080 | UC-10, UC-11 | `/aprovacoes` | `acoes_no_fluxo` | `aprovacoesPagina.spec.ts` |
| Regra do sistema (decisão R20) | RN-038 | RF-081 | UC-09, UC-10 | `/riscos/:id`; `/aprovacoes` | `acoes_no_fluxo` | pgTAP `080` bl. 2; `acoesDoRisco.spec.ts` |
| Regra do sistema (decisão D1, leitura ii) | RN-051 | RF-082 | UC-08 | `/riscos/:id` | `fn_trava_reabertura_ficha`; `fn_trava_reabertura_risco`; `fn_fluxo_marcar_reaberto` | pgTAP `050` bl. 2, 7, 8 e 8c; `fonteDemonstracao.spec.ts` |
| Regra do sistema (migração `20261115004`) | RN-052 | RF-083 | UC-08 | `/monitoramento` | `fn_trava_reabertura_risco` | pgTAP `050` bl. 7; `monitoramentoPagina.spec.ts`; `fluxoValidacao.spec.ts` |
| Regra do sistema (decisões D1 e B11-8) | RN-053 | RF-084 | UC-08 | `/riscos/:id` | `fn_fluxo_exigir_validador_na_reabertura` | pgTAP `070` bl. 5d; pgTAP `080` bl. 3 |
| Regra do sistema (decisões B2-5 e B2-9) | RN-032 | RF-085 | UC-09, UC-10, UC-11 | a prototipar | — | — (não iniciado) |

### 6. DAR

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia Anexo III, diretrizes e tabela por tipologia / Regra do sistema (valor `pendente_dar`, migração `20261109001`) | RN-055, RN-010 | RF-086 | UC-14 | `/dar` | `categorias_risco` | pgTAP `073` bl. 3; `darPagina.spec.ts` |
| Metodologia item 2, V; Política art. 8º, § 1º / Metodologia Anexo III, diretriz do apetite Baixo / … | RN-005, RN-008, RN-009 | RF-087 | UC-06 | `/dar`; `/riscos` | `trigger_calcular_risco_radar`; `categorias_risco` | `darPagina.spec.ts`; `filtrosERotulos.spec.ts` |
| Regra do sistema (valor `pendente_dar`, migração `20261109001`) | RN-010 | RF-088 | UC-06 | `/dar`; `/riscos` | `trigger_calcular_risco_radar`; `categorias_risco` | `calculadoraRiscoRadar.spec.ts` |
| Regra do sistema (decisões P-B1-8 e B11-5, que citam a Política art. 8º, § 2º, minuta original) | RN-054 | RF-089 | UC-14 | `/dar` | — (prévia no navegador) | `darPagina.spec.ts` |
| Regra do sistema ([[matriz-acesso-responsabilidades]] §5) | RN-056 | RF-090 | UC-14 | `/dar` | `categorias_risco` | pgTAP `041` bl. 8; pgTAP `073` bl. 1; `darPagina.spec.ts` |
| Regra do sistema (decisões P-B1-8 e B11-5, que citam a Política art. 8º, § 2º, minuta original) | RN-054 | RF-091 | UC-10, UC-14, UC-25 | `/dar` | `fn_dar_reavaliar_aprovados` | pgTAP `073` bl. 3 a 5; `integracao/fonteSupabaseGravacao.spec.ts` |
| Metodologia 4.6.4; Política art. 13, § 1º (texto saneado) | RN-061 | RF-092 | UC-14 | a prototipar | — | — (não iniciado, LAC-08) |
| Política art. 12, XI; Metodologia 4.6.6 (texto saneado) / Metodologia 4.6.7 (texto saneado) | RN-057, RN-060 | RF-093 | UC-14, UC-25 | `/dar` (hoje vale na hora) | `categorias_risco` | — (não iniciado, LAC-08) |

### 7. Monitoramento/KRI

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.7.1, alíneas c a f (texto saneado) | RN-083 | RF-094 | UC-07 | `/riscos/novo` | `indicadores_kri` | — (parcial, sem teste do trecho feito) |
| Metodologia 4.7.1, 1º parágrafo e alínea a (texto saneado) | RN-082 | RF-095 | UC-07 | `/riscos/novo` | `indicadores_kri` | — (não iniciado, LAC-03) |
| Metodologia 4.7.1, alíneas c a f (texto saneado) | RN-083 | RF-096 | UC-07 | `/riscos/novo` | `indicadores_kri` | — (não iniciado, LAC-03) |
| Metodologia 4.7.1, 1º parágrafo e alínea a (texto saneado) | RN-082 | RF-097 | UC-07 | `/riscos/novo` | `indicadores_kri` | — (não iniciado, LAC-03) |
| Metodologia 4.7.2, 1º parágrafo (texto saneado) | RN-115 | RF-098 | UC-15 | `/monitoramento` | `medicoes_kri` | `monitoramentoPagina.spec.ts`; pgTAP `041` bl. 6 |
| Metodologia 4.7.1, parágrafo do alerta (texto saneado) | RN-084 | RF-099 | UC-15 | `/monitoramento` | `medicoes_kri` | `monitoramentoPagina.spec.ts` (parcial) |
| Metodologia 4.7.2, 1º parágrafo (texto saneado) | RN-115 | RF-100 | UC-07, UC-15 | `/monitoramento` | `respostas_tratamento` | `monitoramentoPagina.spec.ts`; pgTAP `050` bl. 7 |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) | RN-086 | RF-101 | UC-15 | `/` | `respostas_tratamento` | `painelPiloto.spec.ts` |
| Metodologia 4.7.1, parágrafo do alerta (texto saneado) | RN-084 | RF-102 | UC-15 | `/monitoramento` | `medicoes_kri` | — (não iniciado, LAC-03) |

### 8. Reavaliação

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.7, 3º parágrafo (texto saneado) | RN-087 | RF-103 | UC-24 | a prototipar | — (hoje só `riscos.atualizado_em`) | — (não iniciado, LAC-10) |
| Metodologia 4.7, parágrafo novo (texto saneado) | RN-088 | RF-104 | UC-24 | a prototipar | — | — (não iniciado, LAC-10) |
| Metodologia 4.7, 3º parágrafo (texto saneado) / Metodologia 4.7, parágrafo novo (texto saneado) | RN-087, RN-088 | RF-105 | UC-24 | a prototipar | — | — (não iniciado, LAC-10) |
| Metodologia 4.7.1, parágrafo do alerta (texto saneado) / Metodologia 4.7, 3º parágrafo (texto saneado) | RN-084, RN-087 | RF-106 | UC-15, UC-24 | a prototipar | — | — (não iniciado, LAC-10) |

### 9. Comunicação de fatos

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) | RN-086 | RF-107 | UC-16 | a prototipar | — | — (não iniciado, LAC-04) |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) | RN-086 | RF-108 | UC-16 | a prototipar | — | — (não iniciado, LAC-04) |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) | RN-086 | RF-192 | UC-16 | a prototipar | — | — (não iniciado, LAC-04) |
| Metodologia 4.7.1, parágrafo do alerta (texto saneado) | RN-084, RN-085 | RF-109 | UC-15, UC-16 | a prototipar | — | — (não iniciado, LAC-03, LAC-04) |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) | RN-086 | RF-110 | UC-16 | a prototipar | — | — (não iniciado, LAC-04) |
| Metodologia 4.7.2, I a VI; Política art. 17, IV (texto saneado) / Política art. 15, IX; Política art. 3º, I (texto saneado) | RN-086, RN-089 | RF-111 | UC-16, UC-22 | a prototipar | — | — (não iniciado, LAC-04) |

### 10. Plano de Gestão de Riscos (consolidação, colegiados, publicação, revisão)

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.6.11 (texto saneado) | RN-076 | RF-112 | UC-21 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.1 (texto saneado) | RN-062 | RF-113 | UC-21 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.2 (texto saneado) | RN-063 | RF-114 | UC-17, UC-21 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.2 (texto saneado) | RN-063 | RF-115 | UC-17 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.3, 1ª frase (texto saneado) | RN-064 | RF-116 | UC-17 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.3, 1ª frase (texto saneado) | RN-106 | RF-117 | UC-17 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.3 (texto saneado) | RN-065 | RF-118 | UC-17 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.3 (texto saneado) | RN-065 | RF-119 | UC-17 | a prototipar | — | — (não iniciado, LAC-01) |
| Decisão 20/11 não aplicada (F5-11) | RN-066 | RF-120 | UC-17 | a prototipar | — | — (não iniciado, LAC-01, LAC-02) |
| Decisão 20/11 não aplicada (F5-11) | RN-066 | RF-195 | UC-14, UC-18 | a prototipar | — | — (não iniciado, LAC-08) |
| Metodologia 4.6.8 (texto saneado) / Decisão 20/11 não aplicada (F4-15) | RN-071, RN-110 | RF-121 | UC-17, UC-18, UC-23, UC-25 | a prototipar | — | — (não iniciado, LAC-01) |
| Metodologia 4.6.4; Política art. 13, § 1º (texto saneado) | RN-061 | RF-122 | UC-14 | a prototipar | — | — (não iniciado, LAC-08) |
| Metodologia 4.6.3 (texto saneado) / Metodologia 4.6.4; Política art. 13, § 1º (texto saneado) | RN-065, RN-067 | RF-123 | UC-17 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.4; Política art. 13, § 1º (texto saneado) / Política art. 13, § 3º (texto saneado) | RN-061, RN-070 | RF-124 | UC-18 | a prototipar | — | — (não iniciado, LAC-08) |
| Metodologia 4.6.4; Política art. 13, § 1º (texto saneado) / Política art. 13, § 2º (texto saneado) / … | RN-067, RN-069, RN-070 | RF-125 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.5; Política art. 13, § 1º (texto saneado) | RN-068, RN-107 | RF-126 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Política art. 12, XI; Metodologia 4.6.6 (texto saneado) | RN-057 | RF-127 | UC-18 | a prototipar | — | — (não iniciado, LAC-08) |
| Política art. 12, XI; Metodologia 4.6.6 (texto saneado) | RN-057 | RF-128 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Decisão 20/11 não aplicada (F5-13) | RN-058 | RF-129 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.7 (texto saneado) | RN-060 | RF-130 | UC-25 | a prototipar | — | — (não iniciado, LAC-08) |
| Metodologia 4.6.7 (texto saneado) | RN-060 | RF-131 | UC-25 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.7 (texto saneado) | RN-075 | RF-132 | UC-25 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.8 (texto saneado) | RN-071 | RF-133 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.6.9, caput (texto saneado) / Metodologia 4.6.9, I a III (texto saneado) / … | RN-072, RN-073, RN-074 | RF-134 | UC-18, UC-23 | a prototipar | — | — (não iniciado, LAC-07) |
| Metodologia 4.6.9, parágrafo final (texto saneado) | RN-108 | RF-135 | UC-18 | a prototipar | — | — (não iniciado, LAC-02) |
| Metodologia 4.7.1, parágrafo do alerta, e 4.7.2, último parágrafo (texto saneado) / Decisão 20/11 não aplicada (F4-14) | RN-078, RN-079 | RF-136 | UC-23 | a prototipar | — | — (não iniciado, LAC-07) |
| Decisão 20/11 não aplicada (F4-14) | RN-079 | RF-137 | UC-23 | a prototipar | — | — (não iniciado, LAC-07) |
| Política art. 9º; Metodologia 4.7.2, último parágrafo (texto saneado) | RN-109 | RF-138 | UC-19, UC-23 | a prototipar | — | — (não iniciado, LAC-07) |
| Política art. 9º; Metodologia 4.7.2, último parágrafo (texto saneado) / Decisão 20/11 não aplicada (F4-15) | RN-077, RN-080, RN-110 | RF-139 | UC-23 | a prototipar | — | — (não iniciado, LAC-07) |

### 11. Acompanhamento pela CGOV

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Política art. 15, IX; Política art. 3º, I (texto saneado) | RN-089 | RF-140 | UC-22 | a prototipar | — | — (não iniciado, LAC-09) |
| Metodologia 4.7.2, parágrafo da cobrança (texto saneado) | RN-090 | RF-141 | UC-22 | a prototipar | — | — (não iniciado, LAC-09) |
| Metodologia 4.7.2, parágrafo da cobrança (texto saneado) | RN-112 | RF-142 | UC-22 | a prototipar | — | — (não iniciado, LAC-09) |
| Metodologia 4.7.2, parágrafo da cobrança (texto saneado) | RN-112 | RF-143 | UC-22 | a prototipar | — | — (não iniciado, LAC-09) |

### 12. Relatórios e avaliação

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Metodologia 4.3, Quadro 7 | RN-001 | RF-144 | UC-20 | `/` | `riscos` | `painelPiloto.spec.ts` |
| Metodologia 4.3, Quadro 8 | RN-002 | RF-145 | UC-20 | `/` | `riscos` | `painelPiloto.spec.ts` |
| Regra do sistema (decisão P4) | RN-040, RN-042 | RF-146 | UC-20 | `/` | `acoes_no_fluxo` | `painelPiloto.spec.ts` |
| Metodologia 4.7.2 (texto saneado) | RN-091 | RF-147 | UC-19 | a prototipar | — | — (não iniciado, LAC-05) |
| Metodologia 4.7.2 (texto saneado) | RN-091 | RF-148 | UC-19 | a prototipar | — | — (não iniciado, LAC-05) |
| Metodologia 4.7.2, parágrafo da cobrança (texto saneado) | RN-112 | RF-149 | UC-19, UC-22 | a prototipar | — | — (não iniciado, LAC-05, LAC-09) |
| Metodologia item 5; Política art. 15, X (texto saneado) / Metodologia item 5, 3º parágrafo (texto saneado) | RN-092, RN-093 | RF-150 | UC-26 | a prototipar | — | — (não iniciado, LAC-06) |
| Metodologia item 5; Política art. 15, X (texto saneado) | RN-092 | RF-151 | UC-26 | a prototipar | — | — (não iniciado, LAC-06) |
| Metodologia item 5, 3º parágrafo; prazo aberto (texto saneado) | RN-094 | RF-152 | UC-26 | a prototipar | — | — (não iniciado, LAC-06) |

### 13. Auditoria

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema (decisão R22) | RN-095 | RF-153 | UC-02, UC-05, UC-14, UC-20 | `/auditoria` | `auditoria_log`; `fn_registrar_auditoria` | pgTAP `060` bl. 1 a 3 e 7 |
| Regra do sistema (decisão D1) | RN-096 | RF-154 | UC-08, UC-09, UC-10, UC-11, UC-12, UC-20 | `/riscos/:id` | `historico_fluxo`; `fn_fluxo_registrar_historico` | pgTAP `060` bl. 6; `integracao/fonteSupabaseGravacao.spec.ts`; `conversores.spec.ts` |
| Regra do sistema (decisão R22) | RN-097 | RF-155 | UC-20 | — | `auditoria_log` | pgTAP `060` bl. 5 |
| Regra do sistema (decisão R22) | RN-098 | RF-156 | UC-20 | `/auditoria` | `ler_auditoria`; `auditoria_log` | pgTAP `060` bl. 4; pgTAP `082` bl. 1 |
| Regra do sistema (decisão R22) | RN-095 | RF-157 | UC-20 | `/auditoria` | `ler_auditoria`; `auditoria_log` | `auditoriaPagina.spec.ts`; `auditoriaLegivel.spec.ts` |
| Matriz §7, linha "Auditoria — trilha" | — | RF-158 | UC-20 | `/auditoria` | `ler_auditoria`; `auditoria_log` | `auditoriaPagina.spec.ts` |
| — | — | RF-159 | UC-20 | `/auditoria` | `ler_auditoria`; `auditoria_log` | `auditoriaPagina.spec.ts` |

### 14. Importação

| Dispositivo normativo | RN | RF | UC | Tela (rota) | Tabela/função SQL | Teste |
| --- | --- | --- | --- | --- | --- | --- |
| Regra do sistema (decisão P5) | RN-033 | RF-160 | UC-13 | `/importar` | — | `acessoPorPerfil.spec.ts`; `guardaRotas.spec.ts` |
| Regra do sistema (decisão P5) | RN-033 | RF-161 | UC-13 | `/importar` | — | `importarPagina.spec.ts` |
| Regra do sistema (decisão P5) | RN-033 | RF-162 | UC-13 | `/importar` | — | — (parcial, sem teste do trecho feito) |
| Metodologia 4.2.1 | RN-014 | RF-163 | UC-13 | `/importar` | — | `importadorSkillMarkdown.spec.ts` |
| Metodologia 4.3, Quadro 7 / Metodologia 4.3, Quadro 8 / … | RN-001, RN-002, RN-003, RN-004, RN-013 | RF-164 | UC-13 | `/importar` | — | `importarPagina.spec.ts`; `importadorSkillMarkdown.spec.ts` |
| Regra do sistema (AGENTS.md, regra 5) | RN-016 | RF-165 | UC-13 | `/importar` | — | `importadorSkillMarkdown.spec.ts`; `importarPagina.spec.ts` |
| Regra do sistema (decisão P-B1-2) | RN-034 | RF-166 | UC-13 | `/importar` | `objetos_onde_gravo` | `importarPagina.spec.ts` |
| Regra do sistema (decisões P5 e P-B1-5) / Regra do sistema (decisões P-B1-5 e B11-9) | RN-104, RN-048 | RF-167 | UC-13 | `/importar` | `salvar_ficha_risco`; `riscos` | `importarPagina.spec.ts`; `riscosStore.spec.ts` |
| Regra do sistema (decisão B3-9) | RN-099 | RF-168 | UC-13 | `/importar` | `salvar_ficha_risco`; `riscos` | `importarPagina.spec.ts` |
| Regra do sistema (decisão B3-9) | RN-099 | RF-193 | UC-13 | `/importar` | — | `importarPagina.spec.ts` |
| FS-02.18; Contrato ("Na gravação") | — | RF-169 | UC-13 | `/importar` | `salvar_ficha_risco`; `riscos` | `importarPagina.spec.ts`; `riscosStore.spec.ts` |
| FS-02.18; Contrato ("Na gravação") | — | RF-170 | UC-13 | `/importar` | `salvar_ficha_risco`; `riscos` | `importarPagina.spec.ts` |
| Metodologia 4.2.1 | RN-014 | RF-171 | UC-13 | `/importar` | — | — (parcial, sem teste do trecho feito) |
| Metodologia 4.2.2, Quadro 2 | RN-015 | RF-172 | UC-13 | `/importar` | — | — (parcial, sem teste do trecho feito) |
| Metodologia 4.2.2, Quadro 2 | RN-015 | RF-173 | UC-13 | `/importar` | `categorias_risco`; `riscos` | — (não iniciado, LAC-14) |
| Metodologia 4.2.2.1, Quadro 3; Portaria ICMBio nº 253/2026 | RN-017 | RF-174 | UC-13 | `/importar` | `categorias_risco`; `riscos` | — (não iniciado, LAC-15) |
| Metodologia 4.2.2.1, Quadro 3; Portaria ICMBio nº 253/2026 | RN-017 | RF-175 | UC-13 | `/importar` | `categorias_risco`; `riscos` | — (não iniciado, LAC-15) |
| Metodologia 4.3, a, Quadro 4 / Metodologia 4.3, b, Quadro 5 | RN-011, RN-012 | RF-176 | UC-13 | `/importar` | — | — (não iniciado, LAC-12) |
| Metodologia 4.3, a, Quadro 4 / Metodologia 4.3, b, Quadro 5 | RN-011, RN-012 | RF-177 | UC-13 | `/importar` | — | — (não iniciado) |
| Regra do sistema (AGENTS.md, regra 4) | RN-004 | RF-178 | UC-13 | `/importar` | — | — (não iniciado) |
| Regra do sistema (AGENTS.md, regra 4) | RN-004 | RF-179 | UC-13 | `/importar` | — | — (não iniciado) |
| Metodologia 4.3, Quadro 7 / Metodologia 4.3, c, e fórmula do residual | RN-001, RN-003 | RF-180 | UC-13 | `/importar` | — | — (não iniciado) |
| Metodologia 4.5.1 | RN-020 | RF-181 | UC-13 | `/importar` | — | — (não iniciado) |
| Metodologia 4.2.1 | RN-014 | RF-182 | UC-13 | `/importar` | `riscos` | — (não iniciado) |
| Metodologia 4.7.1, alíneas c a f (texto saneado) | RN-083 | RF-183 | UC-13 | `/importar` | `indicadores_kri` | — (não iniciado, LAC-03) |
| Metodologia 4.7.1, 1º parágrafo e alínea a (texto saneado) | RN-082 | RF-184 | UC-13 | `/importar` | `indicadores_kri` | — (não iniciado, LAC-03) |
| Regra do sistema (AGENTS.md, regra 5) | RN-006 | RF-185 | UC-13 | `/importar` | — | — (não iniciado) |
| Regra do sistema (AGENTS.md, regra 5) | RN-018 | RF-194 | UC-13 | `/importar` | — | — (não iniciado) |
| Contrato ("Linhas lidas") | — | RF-186 | UC-13 | `/importar` | — | — (não iniciado) |
| FS-02, Contrato com o Importar (uma recusa bloqueia o lote) + proposta da reestruturação, a decidir pela CGOV | — | RF-187 | UC-13 | `/importar` | — | — (não iniciado) |
| FS-02.12; Contrato ("Tabela do Regime A") | — | RF-188 | UC-13 | `/importar` | — | — (não iniciado) |
| FS-02, "Onde fica o clique" (alternativa B) | — | RF-189 | — | — | — | — (não iniciado) |

## RF sem caso de uso

Requisitos que nenhum caso de uso cita na linha de metadados (4):

RF-014, RF-054, RF-060, RF-189

Os três primeiros (RF-014, RF-054, RF-060) são requisitos implementados cujo caso de uso ainda não os
lista: convém revisar os UC-05 e UC-08 na próxima passada. O RF-189 é "Won't" (fora deste ciclo).

## Requisitos não funcionais

Os 51 RNF seguem as 9 características da ISO/IEC 25010:2023. A coluna "Teste ou comando" cita só o que o
critério de aceitação do [[requisitos-nao-funcionais]] já nomeia; "—" quer dizer que a verificação é por
inspeção, análise ou demonstração, sem comando próprio (ver o critério no catálogo). `pgTAP NNN` é o
arquivo de `supabase/tests/`.

| RNF | Característica | Como é verificado | Teste ou comando |
| --- | --- | --- | --- |
| RNF-001 | Adequação funcional | Teste automatizado (Correção) | `supabase/tests/000_regressao_calculo.test.sql`, `calculadoraRiscoRadar.spec.ts` |
| RNF-002 | Adequação funcional | Teste automatizado (Correção) | `npm test`, pgTAP `000`, `npm run test:db` |
| RNF-003 | Adequação funcional | Teste automatizado (Correção) | pgTAP `000`, `npm run test:db`, `calculadoraRiscoRadar.spec.ts`, `npm test` |
| RNF-004 | Adequação funcional | Teste automatizado (Correção) | pgTAP `081`, `fichaPagina.spec.ts`, `npm run test:db`, `npm test` |
| RNF-005 | Adequação funcional | Demonstração (Completude) | — |
| RNF-006 | Eficiência de desempenho | Teste automatizado (Capacidade) | `paginacao.spec.ts`, `npm test` |
| RNF-007 | Eficiência de desempenho | Teste automatizado (Comportamento temporal) | pgTAP `060`, pgTAP `082`, `auditoriaPagina.spec.ts` |
| RNF-008 | Eficiência de desempenho | Teste automatizado (Utilização de recursos) | `errosBanco.spec.ts` |
| RNF-009 | Eficiência de desempenho | Análise (Utilização de recursos) | — |
| RNF-010 | Eficiência de desempenho | Inspeção (Utilização de recursos) | — |
| RNF-011 | Compatibilidade | Teste automatizado (Coexistência (tradução livre, no sentido de aderência ao padrão do governo)) | `higieneCss.spec.ts`, `npm test` |
| RNF-012 | Compatibilidade | Teste automatizado (Interoperabilidade) | `importadorSkillMarkdown.spec.ts`, `importarPagina.spec.ts`, `npm test` |
| RNF-013 | Compatibilidade | Teste automatizado (Interoperabilidade) | `npm run sync:estrutura`, `syncEstrutura.spec.ts`, pgTAP `015` |
| RNF-014 | Compatibilidade | Inspeção (Interoperabilidade) | — |
| RNF-015 | Capacidade de interação | Teste automatizado (Acessibilidade) | `npm run test:a11y` |
| RNF-016 | Capacidade de interação | Teste automatizado (Acessibilidade) | — |
| RNF-017 | Capacidade de interação | Teste automatizado (Acessibilidade) | `temas.spec.ts`, `npm test` |
| RNF-018 | Capacidade de interação | Teste automatizado (Acessibilidade) | `painelCelular.spec.ts` |
| RNF-019 | Capacidade de interação | Teste automatizado (Proteção contra erro do usuário) | `estadosCarregamento.spec.ts` |
| RNF-020 | Capacidade de interação | Demonstração (Proteção contra erro do usuário) | `novoRiscoPagina.spec.ts` |
| RNF-021 | Confiabilidade | Teste automatizado (Tolerância a falhas) | pgTAP `081`, `npm run test:db` |
| RNF-022 | Confiabilidade | Teste automatizado (Tolerância a falhas) | pgTAP `015` |
| RNF-023 | Confiabilidade | Demonstração (Recuperabilidade) | `npm run copia:fazer` |
| RNF-024 | Confiabilidade | Teste automatizado (Recuperabilidade) | `copiaRegras.spec.ts`, `npm test` |
| RNF-025 | Confiabilidade | Demonstração (Disponibilidade) | — |
| RNF-026 | Confiabilidade | Teste automatizado (Maturidade) | `npm test`, `npm run test:integracao`, `npm run test:db` |
| RNF-027 | Segurança da informação | Teste automatizado (Confidencialidade) | pgTAP `030`, pgTAP `040`, pgTAP `041`, `npm run test:db` |
| RNF-028 | Segurança da informação | Teste automatizado (Confidencialidade) | `npm run conferir:dist`, `conferirDist.spec.ts` |
| RNF-029 | Segurança da informação | Teste automatizado (Autenticidade) | `acessoUsuarios.spec.ts`, `validacoesAcesso.spec.ts` |
| RNF-030 | Segurança da informação | Teste automatizado (Responsabilização) | pgTAP `060`, `npm run test:db` |
| RNF-031 | Segurança da informação | Teste automatizado (Não repúdio) | pgTAP `050`, pgTAP `070`, pgTAP `073`, `npm run test:db` |
| RNF-032 | Segurança da informação | Teste automatizado (Integridade) | `csp.spec.ts`, `deployConfig.spec.ts`, `npm run conferir:csp` |
| RNF-033 | Segurança da informação | Inspeção (Confidencialidade) | `dadosSementeConsistencia.spec.ts` |
| RNF-034 | Segurança da informação | Teste automatizado (Confidencialidade) | `syncAtribuicoes.spec.ts` |
| RNF-035 | Segurança da informação | Inspeção (Confidencialidade) | — |
| RNF-036 | Segurança da informação | Inspeção (Confidencialidade) | — |
| RNF-037 | Segurança da informação | Teste automatizado (Integridade) | `syncEstrutura.spec.ts`, `verificarAmbiente.spec.ts`, `npm test` |
| RNF-038 | Manutenibilidade | Teste automatizado (Testabilidade) | `npm test`, `npm run test:db` |
| RNF-039 | Manutenibilidade | Teste automatizado (Analisabilidade) | `tests/unit/documentacao.spec.ts`, `npm test` |
| RNF-040 | Manutenibilidade | Inspeção (Analisabilidade) | — |
| RNF-041 | Manutenibilidade | Teste automatizado (Reusabilidade) | `componentesUi.spec.ts`, `higieneCss.spec.ts` |
| RNF-042 | Manutenibilidade | Teste automatizado (Modularidade) | `fonteDemonstracao.spec.ts`, `fonteSupabaseLeitura.spec.ts` |
| RNF-043 | Manutenibilidade | Inspeção (Modificabilidade) | — |
| RNF-044 | Flexibilidade | Demonstração (Instalabilidade) | `docker compose up -d --build`, `deployConfig.spec.ts` |
| RNF-045 | Flexibilidade | Teste automatizado (Adaptabilidade) | `verificarAmbiente.spec.ts` |
| RNF-046 | Flexibilidade | Teste automatizado (Substituibilidade) | `npm run db:reset`, `schemaSql.spec.ts` |
| RNF-047 | Flexibilidade | Análise (Escalabilidade) | — |
| RNF-048 | Proteção (*safety*) | Teste automatizado (Restrição operacional (tradução livre)) | pgTAP `041`, pgTAP `050`, pgTAP `072`, `npm run test:db` |
| RNF-049 | Proteção (*safety*) | Teste automatizado (Fail safe (tradução livre)) | pgTAP `050`, pgTAP `073`, pgTAP `080`, `npm run test:db` |
| RNF-050 | Proteção (*safety*) | Demonstração (Aviso de perigo) | `objetosPagina.spec.ts` |
| RNF-051 | Proteção (*safety*) | Teste automatizado (Identificação de risco) | pgTAP `073`, pgTAP `080`, `npm run test:db` |

## Cobertura

Contagens feitas por script sobre os catálogos em 21/11/2026 (o script não é versionado).

| Medida | Quantidade | IDs |
| --- | --- | --- |
| Requisitos funcionais no catálogo | 195 | RF-001 a RF-195 |
| RF implementados | 106 | — |
| RF parciais | 13 | RF-032, RF-035, RF-036, RF-038, RF-048, RF-050, RF-063, RF-078, RF-094, RF-099, RF-162, RF-171, RF-172 |
| RF não iniciados | 76 | ver as linhas "— (não iniciado, ...)" da matriz |
| RF com teste citado (implementados e parciais com teste do trecho feito) | 111 | 106 implementados + 5 parciais (RF-035, RF-036, RF-048, RF-063, RF-099) |
| RF implementados sem teste | 0 | nenhum |
| RF parciais sem teste do trecho feito | 8 | RF-032, RF-038, RF-050, RF-078, RF-094, RF-162, RF-171, RF-172 |
| RF sem caso de uso | 4 | RF-014, RF-054, RF-060, RF-189 |
| RN sem nenhum RF | 8 | RN-059, RN-081, RN-101, RN-102, RN-103, RN-111, RN-113, RN-114 |
| UC sem RF | 0 | todos os 26 casos de uso citam ao menos um RF |

Leitura das lacunas de cobertura:

- **RN sem RF:** RN-101, RN-102, RN-103, RN-113 e RN-114 são regras do piloto da Sede (dados fictícios,
  Registro de Decisão antes da carga real, retenção máxima de 6 meses, exclusão no fim do piloto e das cópias
  cifradas); são cumpridas por procedimento, não por função do sistema. RN-059, RN-081 e RN-111 são regras do
  rito do Plano e da DAR (conformidade sem DAR vigente, reunião extraordinária por urgência, manter o KRI
  durante a revisão) que nenhum RF pede ainda. Cabe à CGOV decidir se viram requisito.
- **RF parciais sem teste:** o trecho que falta fazer não tem teste porque ainda não existe; o trecho já
  feito deve ganhar teste próprio quando o requisito for completado.
- Esta matriz mede **ligação** (existe teste citado), não **cobertura de código**: a cobertura de linhas e
  de ramos não é medida no projeto (ver [[requisitos-nao-funcionais]]).
