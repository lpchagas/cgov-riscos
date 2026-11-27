# Mapa Central do Projeto RADAR (MOC — Map of Content)

Bem-vindo ao **Segundo Cérebro** do projeto `cgov-riscos` no Obsidian! Este arquivo conecta toda a documentação do sistema web **RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos)** do ICMBio, organizada em **níveis**: do negócio (nível 1) ao software (nível 5). Os documentos mais antigos continuam nas seções 0, 2 e 3 e serão migrados aos níveis nas tarefas do plano de reestruturação.

## 0. Memória e normativos

- [[ESTADO-ATUAL]] — Retrato do projeto: onde estamos, números da última verificação e próximo trabalho.
- [[historico-etapas]] — Diário das etapas (A a D1 e Fases 0 a 5 da reestruturação), como estava no `ESTADO-ATUAL` até 2026-11-21.
- [[prompt-etapa-d-piloto-sede]] — Prompt de partida da etapa D (nova): piloto com dados reais só na Sede, dois ambientes e login por senha temporária; depois homologação da CGTI.
- [[GLOSSARIO-ACESSIVEL]] — Explicação sem jargões dos termos de programação, das siglas oficiais da CGOV e dos termos da documentação (RN, RF, RNF, UC, LAC, ADR, MER/DER, formas normais, WIP, DoR/DoD).

- [[matriz-regras-regime-b]] — Tabelas oficiais dos Quadros 1 a 8 e do Anexo III da Metodologia (SEI `024421455`), regras do sistema sem base literal nas minutas, erros materiais da minuta, Política RADAR (SEI `024241420`) e Tabela de Apoio 25×5 da skill `cgov-gestao-riscos-v4`.
- [[registro-alertas-f4-f5]] — Registro dos alertas da revisão normativa (F1 a F5 e LS-01 a LS-06): decisão, dispositivo, impacto no RADAR e situação de cada um, mais os itens para levar à PFE.
- [[20171122_Decreto 9203_Política de Governança APF]] — Decreto nº 9.203/2017, norma que ancora o projeto (comitê interno de governança, alta administração e gestão de riscos, arts. 15-A a 19).
- [[matriz-acesso-responsabilidades]] — Quem vê e quem faz o quê: árvore de unidades do Regimento Interno, matriz RACI, tabela de acesso por tela e decisões pendentes da CGOV (base do login e da RLS).

Fontes da 4ª rodada de revisão (cópias fiéis, não editar): pasta `docs/01-normativos/revisao-2026/` (ver o `README.md` dela).

## 1. Nível 1 — Negócio

Pasta `docs/10-nivel1-negocio/` (ver o `README.md` dela): [[visao-produto]] (visão do produto), mapa de processos, fluxos F1 a F4, FS-01 e FS-02 e lacunas norma × sistema (LAC-01 a LAC-15). Os demais arquivos entram nas próximas tarefas.

- [[mapa-processos]] — Mapa de processos: fluxos no ciclo da Metodologia (4.1 a 5), na Política e na Cadeia de Valor (1.05.2, Gestão de riscos).
- [[F1-ciclo-gestao-riscos]] · [[F2-avaliacao-tratamento]] · [[F3-aprovacao-dar-plano]] · [[F4-monitoramento-relato-avaliacao]] — Fluxos oficiais (F1 v2, F2, F3 v3, F4 v2), com as atividades `Fn.NN` iguais aos passos das tabelas oficiais.
- [[FS-01-validacao-interna-risco]] — Fluxo interno de validação do RADAR (3 degraus), decisão da CGOV sem base nas minutas (LAC-11).
- [[FS-02-analise-ato-por-skills]] — Análise de ato normativo pelas skills da CGOV e importação no RADAR (prática da 2ª linha; contrato com o Importar; "um clique" pendente).
- [[lacunas-norma-sistema]] — Lacunas entre a norma saneada e o sistema (LAC-01 a LAC-15), com severidade (bloqueia homologação, importante, melhoria), alertas e atividades `Fn.NN` ligados.

Desenho e plano originais do projeto (histórico):

- [[2026-11-09-cgov-riscos-radar-design]] — Documento completo de Design e Arquitetura (Versão 2.0).
- [[2026-11-09-cgov-riscos-radar-plan]] — Plano de Implementação em 8 tarefas.

## 2. Nível 2 — Requisitos

Pasta `docs/20-nivel2-requisitos/` (ver o `README.md` dela): [[ERS-radar]] (documento-base, já criado), [[regras-negocio]] (catálogo das regras de negócio RN-001 a RN-115, já criado), [[requisitos-funcionais]] (catálogo dos requisitos funcionais RF-001 a RF-195, já criado), [[requisitos-nao-funcionais]] (catálogo dos requisitos não funcionais RNF-001 a RNF-051, já criado), casos de uso UC-01 a UC-26 (índice por ator em [[casos-de-uso/README|índice dos casos de uso]], já criados) e [[rastreabilidade]] (matriz norma, RN, RF, UC, tela, banco e teste, já criada). Os demais arquivos entram nas próximas tarefas.

## 3. Nível 3 — Interface (Reformulação 2026-11)

Pasta `docs/30-nivel3-interface/` (ver o `README.md` dela; até a Tarefa 18 a pasta se chamava `04-ux`).

- [[mapa-telas]] — Mapa tela ↔ caso de uso ↔ perfil ↔ Figma: as 15 telas de hoje e as 11 telas a prototipar (P-01 a P-11).

- [[design-system]] — Tokens, componentes e resultados medidos das Fases 1 a 4.
- [[diagnostico-ui-2026-11]] — Diagnóstico inicial (heurísticas, WCAG e microcopy).
- [[manual-fluxo-figma-vscode]] — Como editar no Figma e levar a mudança para o código.
- [[varredura-acessibilidade]] — `npm run test:a11y`: como rodar, ler o relatório e incluir telas na varredura axe-core.

## 4. Nível 4 — Dados

Pasta `docs/40-nivel4-dados/` (ver o `README.md` dela): MER conceitual, DER pé-de-galinha, normalização e dicionário de dados. Por ora, o documento do banco é:

- [[modelo-dados-mer]] — Planta baixa do Banco de Dados PostgreSQL/Supabase (11 tabelas de negócio, inclusive `processos_cadeia_valor`, + a trilha `auditoria_log`; seção 3: unidades reais, perfis, funções de alcance, fluxo de 3 degraus e trilha).

## 5. Nível 5 — Software

Pasta `docs/50-nivel5-software/` (ver o `README.md` dela): diagramas UML em Mermaid (casos de uso, atividades, classes, sequência e estados). Os arquivos entram nas próximas tarefas.

### Arquitetura e entrega para a CGTI/ICMBio (guias e decisões, em `docs/02-arquitetura-cgti/`)

- [[decisoes-tecnicas-b1]] — Decisões técnicas da etapa B1 (R1 a R23) e decisões da CGOV na revisão final (D1 segregação "sobe um nível", D2 exclusão de risco, D3 alcance do gestor), com motivo, custo e as pendências para a CGOV.
- [[decisoes-tecnicas-b2]] — Decisões técnicas da etapa B2 (B2-1 a B2-9 da CGOV e T1 a T11 da execução: link com `token_hash`, dois modos, Edge Function, importador de atribuições) e achados para a CGOV (CT Cuiabá, unidades sem titular).
- [[decisoes-tecnicas-b3]] — Decisões técnicas da etapa B3 (B3-1 a B3-17: camada de dados, `acoes_no_fluxo`, `salvar_ficha_risco`, estados de tela) e pendências.
- [[decisoes-tecnicas-c]] — Decisões técnicas da etapa C (Painel no celular: D-C1 a D-C3 da CGOV, calls C-1 a C-8, medição final e tabela do Code Connect) e pendências.
- [[decisoes-tecnicas-d]] — Decisões técnicas da etapa D (piloto da Sede: D0-1 a D0-16 e decisões da execução da D1); spec: [[2026-11-17-etapa-d0-d1-piloto-sede-design]].
- [[registro-decisao-piloto-sede]] — Modelo do Registro de Decisão do piloto (para assinatura da CGOV no SEI) e dos dois avisos (encarregado de dados e CGTI).
- [[2026-11-16-etapa-c-painel-celular-design]] — Design da etapa C (Painel no celular); plano: [[2026-11-16-etapa-c-painel-celular-plan]].
- [[2026-11-16-etapa-b3-telas-banco-design]] — Design da etapa B3 (telas lendo e gravando no banco); plano: [[2026-11-16-etapa-b3-telas-banco-plan]].
- [[guia-supabase-nuvem]] — Levar o banco para o Supabase na nuvem (projeto `cgov-riscos-v3.0`): painel, CLI (`login`, `link`, `db push`), regras do piloto, histórico dos passos e como subir mudanças futuras (etapa D1, guia vivo).
- [[guia-copia-restauracao]] — Cópia cifrada diária (`age`) e restauração no Supabase local (etapa D1); a primeira prova completa com o `age` ainda está pendente.
- [[guia-ambiente-piloto]] — O que existe na nuvem do piloto (Supabase + front no Cloudflare Pages, `radar-icmbio.pages.dev`), como republicar o front, onde ficam as chaves e como conferir (etapa D1, Task 7).
- [[guia-teste-power-pages]] — Teste das 4 condições do Power Pages (decisão D0-8, Task 7 da D1): se todas passarem, o front vai para o Power Pages; senão, para o Cloudflare Pages.
- [[guia-computador-de-trabalho]] — Montar o computador de trabalho (Windows + WSL + Docker Engine) e a rotina de trocar entre o computador institucional e o de casa (etapa D1).
- [[guia-supabase-local]] — Como rodar o banco local, testar com pgTAP, importar a estrutura do SharePoint e resolver os erros comuns (etapa B1); seções novas da B2: entrar localmente pelo Mailpit, Edge Function `gerenciar-acesso` e `sync:atribuicoes`.
- [[2026-11-15-etapa-b2-login-perfis-design]] — Design da etapa B2 (login por link de e-mail e perfis); plano: [[2026-11-15-etapa-b2-login-perfis-plan]].
- [[2026-11-15-etapa-b1-1-regras-banco-design]] — Design da etapa B1.1 (regras do banco: Presidência, objetos, preliminar da CGOV, DAR); plano: [[2026-11-15-etapa-b1-1-regras-banco-plan]]; decisões B11-1 a B11-9 em [[decisoes-tecnicas-b1]] seção 5.
- [[2026-11-15-etapa-b1-banco-rls-design]] — Design da etapa B1 (banco, alcance e RLS); plano: [[2026-11-15-etapa-b1-banco-rls-plan]].
- [[guia-docker-cgti]] — Dossiê executivo e instruções de implantação via Container Docker para a CGTI.
- [[pedido-skill-18-colunas]] — Pedido de mudança da skill `cgov-gestao-riscos` (repositório `cgov-geral`): tabela de 18 colunas, com texto pronto e exemplos.

## ADR — Registros de decisão

- [[adr/README]] — Índice dos ADRs (`docs/adr/`), modelo de Nygard, imutáveis.
- [[0000-modelo]] — Modelo para novos ADRs.
- [[0001-registrar-decisoes-em-adr-nygard]] — Por que registramos decisões em ADRs; os arquivos `decisoes-tecnicas-*` ficam congelados como histórico.
- [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti]] — As 6 lacunas que contradizem a norma vêm antes da homologação na CGTI; o piloto segue.
- [[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1]] — O fluxo interno de 3 degraus fica como etapa anterior ao item 4.6.1 (LAC-11 resolvida).
- [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica]] — Categorias do Quadro 2 e subcategorias do Quadro 3 literais; a migração recusa o que precisa de reclassificação (LAC-14 e LAC-15 resolvidas).
- [[0020-tabela-da-skill-com-18-colunas]] — Tabela da skill com 18 colunas (Teste de Integridade e evidência com marcador); o importador aceita 16 e 18 e avisa em vez de adivinhar.
- [[0021-alerta-do-kri-e-comunicacoes-no-banco]] — Alerta do KRI e comunicações à CGOV calculados e guardados no banco (limite numérico, prazo em dias úteis, comunicação imutável).

## Kanban

Pasta `docs/90-kanban/` (ver o `README.md` dela).

- [[quadro]] — O quadro Kanban (plugin do Obsidian), com o Backlog em ordem de prioridade.
- [[politicas]] — Formato do cartão, limites de WIP, classes de serviço, DoR, DoD, métricas e ordem do Backlog.
- [[analise-lacunas-codigo-requisitos]] — Os 89 RF parciais ou não iniciados, cada um ligado a um cartão, e a ordem de prioridade (Tarefa 19).

## Caderno de Aprendizado (Do Zero ao Deploy)

- [[01-como-funciona-o-vue3]] — Aula 1: O que são Componentes, Estado Reativo (`ref`, `computed`) e Pinia no Vue.js 3.
- [[02-entendendo-o-supabase-sql]] — Aula 2: Como funcionam Tabelas Relacionais, Chaves Estrangeiras (`FK`) e Segurança por Linha (`RLS`), com a seção nova sobre função de alcance e testes com pgTAP.
- [[03-empacotando-com-docker]] — Aula 3: Como o `Dockerfile` empacota o Vue.js com o servidor Nginx para rodar em qualquer máquina.
- [[04-design-tokens-e-componentes]] — Aula 4: Tokens de design, componentes, telas responsivas (modo cartão das tabelas) e acessibilidade.
- [[05-login-sessao-e-guardas]] — Aula 5: link mágico, sessão e renovação, por que o menu não é segurança (a RLS é) e os dois modos (demonstração e real).
- [[06-camada-de-dados-e-async]] — Aula 6: camada de dados com duas fontes, `async/await`, estados de carregamento e erro, paginação de 1.000 linhas e por que a ficha é gravada por uma função.
