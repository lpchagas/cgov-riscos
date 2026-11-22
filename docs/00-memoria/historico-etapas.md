# Histórico das etapas do RADAR (`cgov-riscos`)

> Este arquivo guarda o **diário das etapas**, como ele estava no [[ESTADO-ATUAL]] até 2026-11-21. Na
> Tarefa 19 do [[2026-11-20-reestruturacao-documentacao-plan]] (2026-11-22), o `ESTADO-ATUAL` virou um
> retrato curto, e as seções abaixo vieram para cá **sem mudança de conteúdo**. Daqui em diante, o
> andamento fica no [[quadro]] (Kanban) e as decisões novas, em ADRs (`docs/adr/`).

O cabeçalho do diário, na última versão (2026-11-21), dizia:

> **Última atualização:** 2026-11-21  
> **Fase atual:** B1, B2, B1.1 e **B3** mescladas na `main` (a B3 entrou pelo **PR #7**, merge `ea8e239`, em 2026-11-16). A **etapa C (Painel no celular)** foi mesclada na `main` pelo **PR #8** (merge `a127b08`, 2026-11-16). Próxima: D (homologação na CGTI). A **D1 (piloto da Sede)** foi trazida para esta branch (merge `66f974a`) e corre em paralelo à **reestruturação da documentação em 5 níveis + 4ª rodada normativa** (plano [[2026-11-20-reestruturacao-documentacao-plan]], diagnóstico [[2026-11-20-diagnostico-documentacao-radar]]). A etapa D **não é suspensa** (diagnóstico §5.3); as lacunas normativas entram no Kanban como `#normativo`.

## Concluído
- [x] Análise comparativa dos repositórios legados (`v1.1`, `v1.2` e `v2.1`).
- [x] Leitura das Minutas de Portaria (`Política SEI 024241420` e `Metodologia SEI 024421455`) e da skill `cgov-gestao-riscos-v4`.
- [x] Documento de Design e Arquitetura v2.0 aprovado e salvo no cofre Obsidian.
- [x] Plano de Implementação detalhado em 8 Tarefas elaborado e executado.
- [x] **Task 1:** Estrutura base do repositório, Vite/Vue 3/TypeScript e Segundo Cérebro no Obsidian (`CLAUDE.md`, `AGENTS.md`, `docs/`).
- [x] **Task 2:** Motor Matemático RADAR (`calculadoraRiscoRadar.ts`) com Matriz Assimétrica (Quadro 7), Trava de Evidência (Quadro 6), Faixas sem arredondamento prévio (Quadro 8), DAR e Teste de Integridade (Integra+).
- [x] **Task 3:** Importador de Tabelas Markdown da skill `cgov-gestao-riscos-v4` (`importadorSkillMarkdown.ts`).
- [x] **Task 4:** Migrations SQL para PostgreSQL/Supabase (`20261109001_schema_radar.sql`, `20261109002_rls_policies.sql`, `seed.sql`) e Dados Semente com Caso de Controle do Anexo II.
- [x] **Task 5:** Identidade Visual `@govbr-ds/core` e Simulador de Perfis de Governança (`authStore.ts`).
- [x] **Task 6:** Store de Riscos (`riscosStore.ts`), Fluxo de Aprovação em 1 Clique (3 degraus) e Matriz de Calor Assimétrica.
- [x] **Task 7:** Quatro telas principais (`PainelConsolidadoCgovView`, `FormularioRiscoView`, `ImportadorSkillView`, `CaixaValidacaoUmCliqueView`) e roteamento Vue Router.
- [x] **Task 8:** Empacotamento Docker (`Dockerfile` multi-stage, `docker-compose.yml`, `nginx.conf`), `vercel.json` e Dossiê técnico para a CGTI/ICMBio.
- [x] **Task 9 (Template Base Gov.br DS & Novas Páginas):**
  - Anatomia completa de `gov.br/ds/templates/base` em `App.vue` (`div.template-base`, `BrSkiplink.vue`, `BrHeader.vue` com busca global e alto contraste, `BrMenu.vue` hierárquico em pastas das 3 Linhas, `BrBreadcrumb.vue`, `BrFooter.vue`).
  - Componentes de alta densidade visual (`BrStep.vue`, `BrTabs.vue`, `BrMessage.vue`) e filtro interativo por célula na `MatrizCalorAssimetrica.vue`.
  - Cinco novas páginas especializadas integradas ao roteador:
    1. `DeclaracaoApetiteDarView.vue` (`/dar-apetite`) — Simulador e governança do Anexo III e Quadro 3 (Integra+).
    2. `CatalogoObjetosView.vue` (`/objetos`) — Catálogo de Objetos e Cadeia de Valor (Quadro 1).
    3. `FichaDetalheBowTieView.vue` (`/riscos/:id`) — Diagrama Visual Bow Tie (5 colunas) e dossiê executivo.
    4. `MonitoramentoKriPlanoAcaoView.vue` (`/monitoramento-kris`) — Sala de Situação de KRIs e Planos 5W2H.
    5. `TrilhaAuditoriaGovernancaView.vue` (`/auditoria`) — Trilha cronológica de auditoria das 3 Linhas.

## Reformulação da Interface (iniciada em 2026-11-14)
Plano: [[2026-11-14-reformulacao-ui-radar-plan]] · Diagnóstico: [[diagnostico-ui-2026-11]] · Referência: [[design-system]]

- [x] **Fase 0 — Diagnóstico:** crítica heurística, auditoria WCAG 2.2 AA (axe-core: 171 ocorrências) e glossário de microcopy. Causa nº 1: 26 classes do Bootstrap inexistentes no gov.br DS.
- [x] **Fase 1 — Fundação:**
  - Tokens em 3 camadas (`src/styles/tokens.css`): claro, alto contraste e escuro (escuro ainda bloqueado).
  - App shell novo: cabeçalho de 64 px, navigation rail recolhível/gaveta no celular, trilha só com páginas reais, `<h1>` automático por rota.
  - 12 componentes em `src/components/ui/` (PageHeader, StatCard, DataTable, SideSheet, Dialog, Toast, FormField, SegmentedControl, Chip, RiskBadge, EmptyState, Skeleton).
  - Nova página **Riscos** (`/riscos`) com filtros na URL e painel lateral; rotas curtas com redirecionamento das antigas.
  - Camada temporária `compat-legado.css` (apagar no fim da Fase 3) + testes de higiene de CSS.
  - Resultado: violações axe 171 → 87; rolagem lateral 9 → 0 páginas; `<h1>` 0 → 10 páginas.
- [x] **Fase 2 — Piloto do Painel** (código pronto; aguardando aprovação da CGOV antes da Fase 3):
  - Protótipo aprovado em canvas (6 versões) → implementado em Vue.
  - Cabeçalho em duas faixas (barra gov.br que some ao rolar + barra do sistema ICMBio | RADAR, busca centralizada, conta com largura fixa de 240 px) e rodapé institucional azul-escuro (CGGE, CGOV, CTGRIC, Painéis Integrados, DIGITECA), no padrão do Painel BI da CGOV.
  - Painel novo: 4 indicadores com links para a lista filtrada; Matriz 5×5 com células-botão (lidas do Quadro 7); "Precisa da sua atenção" por perfil; maiores residuais; distribuição por nível; resumo da DAR; atividade recente. Regras em `src/utils/painelResumo.ts` (funções puras, testadas).
  - Saíram do Painel: carteira completa (→ `/riscos`), simulador da DAR (→ `/dar`), "Enviar para validação" e "Reavaliar controle" (→ painel lateral de `/riscos`).
  - Correções: atalho "Ir para o menu" e "Ir para a busca" no celular; menu lateral não encolhe mais com conteúdo largo.
  - **RADAR-2026-003 corrigido** na semente (P2·I4 → Inerente 14, Residual 8,4 Médio, ainda Crítico pela DAR Baixo) e protegido por `dadosSementeConsistencia.spec.ts`.
  - Resultado: axe-core **0 violações** no Painel (computador, celular e alto contraste) e em `/riscos` com painel lateral; altura do Painel no celular 8.729 → 4.666 px (862 px são do rodapé); cores fixas 234 → 175; 59 testes.
  - **Fluxo híbrido Figma ↔ código:** arquivo Figma "RADAR — Painel" (equipe cgov) com biblioteca publicada de 20 componentes ligados aos `.vue` pelo Code Connect (Vue), variáveis espelhando `tokens.css` e telas em pares Original (travada) × Trabalho. Manual: [[manual-fluxo-figma-vscode]].
  - **Pendências da CGOV:** ~~e-mail de contato~~ (resolvido: planejamento@icmbio.gov.br, na página Sobre); endereços dos "Painéis Integrados" e das redes sociais; arquivos oficiais das marcas gov.br/ICMBio.
- [x] **Fase 3 — Migração das demais páginas** (uma por commit):
  - DAR (prévia do impacto + Desfazer), Aprovações (caixa de entrada), Monitoramento (abas, semáforo pela leitura mais recente), Ficha do risco (abas + `BowTieDiagram`), Novo risco (assistente em 4 etapas com prévia ao vivo), Objetos (tabela + cadastro lateral), Auditoria (linha do tempo + CSV), Importar (colar/enviar → prévia → confirmar).
  - Tema escuro liberado (menu do usuário → Aparência); `compat-legado.css`, `BrCard` e `BrBadge` apagados; ponte das variáveis do gov.br para os tokens.
  - Resultado: axe-core 0 violações em 12 telas × 2 tamanhos × 3 temas; cores fixas 175 → **0**; 98 testes.
  - Figma (2026-11-15): BrTabs, BrStep (passoAtivo 1–4), BrMessage (4 estados) e BowTieDiagram (nível Baixo/Médio/Alto/Extremo) criados na página "Componentes RADAR", com peças internas `_BrTabs · Aba` e `_BrStep · Etapa` (não publicadas). As 8 páginas migradas também estão no Figma em pares 📌 Original (travada) × ✏️ Trabalho, cada uma com quadro de computador (1440) e celular (390). Na biblioteca: BrMessage e PageHeader passaram a quebrar linha e o SegmentedControl ganhou a variante `selecionada=1…4`. Falta: republicar a biblioteca e ligar os 4 componentes novos no Code Connect.
- [x] **Fase 4 — Polimento** ([[design-system]] §9):
  - Varredura com axe-core: 13 telas × 4 larguras (360, 768, 1280, 1920) × 3 temas = 156 combinações, **0 violações** e nenhuma rolagem lateral.
  - `DataTable` em **modo cartão** abaixo de 768 px. Corrige um defeito em 5 páginas: no celular o Residual e o Apetite ficavam escondidos por rolagem interna.
  - Painel no celular: "Mostrar mais" na atenção e 2 eventos recentes. 4.819 → **4.109 px** em 390 px. A meta de 3.500 px exige tirar cartões, e essa decisão é da CGOV.
  - **Rodapé enxuto** (862 → 512 px no celular) e nova página **Sobre o RADAR** (`/sobre`): versão, normas correlatas, fontes de dados, governança e painéis, no layout de relatório do Template V3. Dados em `src/utils/sobreRadar.ts`.
  - Figma: BrFooter da biblioteca no formato enxuto e trocado por instâncias nas 18 Originais; Original do Painel, DAR e Objetos no celular com o modo cartão; novo par Original × Trabalho "Sobre o RADAR". As cópias de Trabalho anteriores ainda têm o rodapé antigo.
  - Aula 4 do caderno: [[04-design-tokens-e-componentes]]. 105 testes.
  - Carregamento/erro: o `Skeleton` entra quando a store passar a usar o Supabase (hoje os dados são síncronos).
- [x] **PR #1 mesclado na `main`** (2026-11-15).

## Varredura de acessibilidade no repositório (2026-11-15, branch `feat/varredura-a11y`)
Design: [[2026-11-15-varredura-a11y-design]] · Plano: [[2026-11-15-varredura-a11y-plan]] · Guia: [[varredura-acessibilidade]]

- [x] `npm run test:a11y` (Playwright Test 1.64.1 + `@axe-core/playwright` 4.10.2): sobe o servidor sozinho na porta 5199 e roda 13 telas × 4 larguras × 3 temas = 156 combinações + 4 autoverificações. **160 passaram, 0 violações**, em cerca de 3 minutos. Reprova por violação WCAG 2.2 A/AA ou rolagem lateral. Cada tela confere o título exato, o endereço final, a aba e o tema antes do axe (achado da revisão final: "qualquer `<h1>`" deixava passar redirecionamento e "Risco não encontrado").
- [x] Playwright atualizado de 1.48.2 para **1.64.1**: a 1.48.2 tinha alerta de severidade alta (GHSA-7mvr-c777-76hp: download do navegador sem verificar o certificado). `npm audit` igual ao da `main` (13 alertas já existentes, nenhum novo). `playwright-core` fixado na mesma versão para o `@axe-core/playwright` não puxar uma segunda cópia, que quebrava o `npm run build`.
- [x] Altura do Painel em 360 px: **4.271 px** (só informação; meta de 3.500 px aguarda a CGOV).
- [x] Defeito encontrado e corrigido: progresso do **Plano de ação** usava `aria-label` em `<p>` (ignorado por leitores de tela). O axe-core 4.10.3 acusa o caso; o script antigo (4.10.2) não acusava.
- [x] Vitest restrito a `tests/unit/`. **107 testes**.
- Só local, sem GitHub Actions. Quem vai manter: equipe técnica da CGOV.
- **Próximas opções:** B (Supabase de verdade), D (homologação na CGTI).

## Preparação da etapa B — acesso por perfil (2026-11-15)
- [x] Conexão com o Supabase verificada: projeto `cgov-riscos-v2.1` ativo (São Paulo, plano gratuito). O banco remoto tem 14 tabelas **vazias** de uma versão antiga, incompatíveis com as migrações do repositório, que nunca foram aplicadas. Zerar e aplicar as migrações depende de autorização.
- [x] Análise do Regimento Interno (Portaria nº 5.592/2025) com as orientações da CGOV sobre visibilidade: [[matriz-acesso-responsabilidades]] (árvore de unidades, perfis, RACI e tabela de acesso por tela).
- [x] Decisões da CGOV P1 a P8 tomadas (2026-11-15), registradas na seção 9 da matriz. Principais: **Diretores, Presidência, AUDIT (só leitura), CGOV, CGGE e GABIN veem todas as unidades** (Decreto nº 9.203/2017, art. 17: alta administração); CGs veem a própria árvore + **visão por processo**; CT vê NGIs e UCs; valida a chefia imediata e **homologa o Gerente Regional** nas unidades descentralizadas.
- [x] Decreto nº 9.203/2017 copiado para `docs/01-normativos/` como norma que ancora o projeto.
- **Base normativa dos fluxos:** as minutas da Política (SEI 024241420) e da Metodologia (SEI 024421455). Quando forem publicadas: revisão sistêmica das regras de decisão e nova versão do projeto.
- Ordem proposta da etapa B: decisões da matriz → preparar o Supabase → login e perfis → RLS completa com testes → telas lendo do banco.

## Etapa B1 — banco, alcance e RLS (planejada em 2026-11-15, branch `feat/b1-banco-rls`)
Design: [[2026-11-15-etapa-b1-banco-rls-design]] (aprovado) · Plano: [[2026-11-15-etapa-b1-banco-rls-plan]] (aprovado, 9 tarefas)
- Decisões: login por link de e-mail só para convidados (B2); ordem B1 → B2 → B3; Supabase **local com Docker**; estrutura e Cadeia de Valor vêm das listas do SharePoint por importador (`npm run sync:estrutura`), com retrato público versionado em `supabase/referencia/`; lista de atribuições (dados pessoais) só no B2 e nunca no repositório (`_temp/` no `.gitignore`).
- Execução escolhida: **por subagentes** (superpowers:subagent-driven-development).
- **Situação: etapa B1 concluída, aguardando commit** (a regra do usuário é um único commit no fim, só quando ele pedir). Tudo está na árvore de trabalho da branch `feat/b1-banco-rls`. Entregas:
  - Supabase local com Docker (`npm run db:start`, `db:reset`, `test:db`) e importador `npm run sync:estrutura` (843 unidades e 90 processos do retrato em `supabase/referencia/`).
  - Migrações `20261115001` a `20261115005`: unidades/perfis/processos e vínculo com a CT; funções de alcance; RLS por alcance; fluxo de 3 degraus com trava e reabertura; trilha de auditoria.
  - Semente de demonstração com 19 usuários fictícios `@radar.test` e 10 riscos; testes pgTAP `000` a `060` (`npm run test:db`).
  - Documentação: [[guia-supabase-local]], [[modelo-dados-mer]] (seção 3) e Aula 2 do caderno ([[02-entendendo-o-supabase-sql]], seção 4).
  - Decisões técnicas da B1 (R1 a R23) e decisões da CGOV na revisão final (D1 a D3), com motivo e custo: [[decisoes-tecnicas-b1]].
- **Revisão final da B1 (onda única de correção):**
  - **D1 — segregação "sobe um nível":** quem envia (ou reabre ao editar) não valida nem homologa o próprio risco; se é o titular da chefia, o degrau sobe (ex.: `gr@` envia risco do SAT1-GR5 → valida e homologa a Presidência). O histórico do fluxo passou a guardar `usuario_id` e `sequencia`.
  - **D2 — excluir risco:** só em rascunho, devolvido ou preliminar da CGOV; risco aprovado não se apaga (nem pela exclusão do objeto).
  - **D3 — alcance do gestor:** mantida a spec (todas as descendentes).
  - Risco aprovado também reabre quando muda a **categoria**, o **objeto** ou a criticidade calculada.
  - Trilha de auditoria também em **perfis** (inclusive titularidade) e na **DAR** (`categorias_risco`).
  - `anon` sem privilégio nas tabelas de negócio; sequência de `categorias_risco` acertada no `seed.sql`; importador recusa `--sim` em banco remoto (salvo `--permitir-remoto`).
- **Lacuna de dados para a CGOV (SharePoint):** das 11 CTs, só a **CT Curitiba** tem unidades vinculadas (73 unidades: 45 UCs, 12 NGIs e 16 subunidades, pelo `microgrupo`, gravado em `coordenacao_territorial_id`, decisão R9); o `microgrupo` "CT Cuiabá" (42 unidades) não tem CT correspondente na lista; os avisos do importador (mãe inexistente, `id_mae` igual à própria unidade 22.0078, processos com várias unidades líderes) precisam de correção na lista.
- **Pendências da B1 (decididas em 2026-11-15, a implementar na B1.1):** são **8**, listadas na seção 4.1 de [[decisoes-tecnicas-b1]] (a B2 não resolveu nenhuma). Em resumo: (1) quem valida os riscos da Presidência; (2) CGOV cria objeto em unidade inativa; (3) visão por processo do Coordenador-Geral ignora `ativo`; (4) `chefia_imediata` não confere a GR da CT; (5) CGOV não grava controles/KRIs de risco `preliminar_cgov`; (6) `macroprocesso_supervisor_id` livre; (7) alinhar a matriz de acesso com a D3 e com a spec B1 7.1; (8) DAR mudada não reavalia riscos aprovados.
- **Situação seguinte:** a B1 foi mesclada na `main` pelo PR #4 e a **B2 está concluída** (ver a seção da B2 abaixo). Próximas: **B3** (telas lendo e gravando no banco, `TipoUnidade` com os 16 valores, `Skeleton`), depois C (Painel no celular) e D (homologação na CGTI).
- **Verificação final da B1 (após a onda de correção):** `npm test` **139 testes** (23 arquivos) passando; `npm run build` ok; `npm run test:a11y` **160 passaram, 0 violações**; `npm run db:reset && npm run test:db` **10 arquivos (`000` a `060`), 475 testes, `Result: PASS`** (2026-11-15).

## Etapa B2 — login e perfis (2026-11-15, branch `feat/b2-login-perfis`)
Design: [[2026-11-15-etapa-b2-login-perfis-design]] · Plano: [[2026-11-15-etapa-b2-login-perfis-plan]] · Decisões: [[decisoes-tecnicas-b2]] · Aula: [[05-login-sessao-e-guardas]]
- **Situação: etapa B2 concluída e registrada em commit na branch `feat/b2-login-perfis`** (a partir daqui os commits são automáticos a cada alteração relevante; ver AGENTS.md, "Regras de Git"). Nenhuma migração nova (`supabase/migrations/` igual à `main`).
- **Entregas:**
  - **Login por link de e-mail só para convidados** (`/entrar`, `/entrar/retorno`, `/acesso-nao-liberado`), com `token_hash` + `verifyOtp` (funciona com convite enviado pelo servidor e em outro navegador); modelo de e-mail em português em `supabase/templates/`.
  - **Dois modos** (B2-1): sem `.env`, "Modo demonstração" com o simulador "Ver como" dos 10 perfis; com `.env`, login real. Explicado no `.env.example`.
  - **Tabela de acesso por perfil** (`src/utils/acessoPorPerfil.ts`), guarda das rotas (`src/router/guarda.ts`) e menu filtrado. O menu é conforto; a segurança é a RLS.
  - **Tela "Usuários e perfis"** (`/usuarios`, só CGOV): cadastrar, editar, enviar link (um ou lote) e ver a situação do convite.
  - **Edge Function `gerenciar-acesso`** (`criar`, `enviar_link`, `listar_situacao`), servida por `npm run db:funcoes`; a `service_role` fica só no servidor.
  - **Importador `npm run sync:atribuicoes`**: cria contas e perfis a partir da lista de atribuições (arquivo real só em `_temp/`, relatório nunca salvo, matrícula ignorada, nunca envia e-mail).
  - Documentação: [[guia-supabase-local]] (seções 8 e 9), [[decisoes-tecnicas-b2]] (B2-1 a B2-9 e T1 a T11), Aula 5 ([[05-login-sessao-e-guardas]]).
- **Achados para a CGOV (SharePoint):** a **CT Cuiabá (23.3005)** está com o tipo "Coordenação-Geral" (o titular receberia `coordenador_geral`; o importador e a tela avisam); **unidades sem titular** não conseguem validar riscos (o relatório do importador as lista).
- **Decisões de 2026-11-15 sobre as pendências (CGOV):** as duas do importador estão **implementadas** (P-B2-1: titular com e-mail vazio/inválido não tira a chave de ninguém na unidade e gera o aviso `titular_sem_email`; P-B2-2: perfil suspenso com a chave que não está na linha da unidade a perde). As **8 pendências da B1** estão **decididas, a implementar na B1.1** (item 7, a matriz, já foi feito): Presidência validada pelo GABIN e homologada pelo Presidente; DAR nova recalcula riscos aprovados e os que viram Crítico voltam à homologação; CGOV grava e apaga enquanto `preliminar_cgov`; ninguém cria objeto em unidade inativa; CG vê processo inativo com marca; `sync:estrutura` ignora CT de outra GR; `macroprocesso_supervisor_id` preenchido pelo banco. Ver [[decisoes-tecnicas-b1]] 4.1 e [[decisoes-tecnicas-b2]] 4.2.
- **Achado CT Cuiabá:** a CGOV confirmou que o tipo "Coordenação-Geral" da CT Cuiabá (23.3005) está errado e vai corrigir a lista do SharePoint e as circunscrições (UCs e NGIs) de cada CT; depois basta `npm run sync:estrutura -- --pasta _temp/`. Nenhum e-mail pode ser enviado a servidores do ICMBio antes da aprovação da CGTI.
- **Verificação final da B2 (2026-11-15, nesta ordem):**
  - `npm test`: **35 arquivos, 346 testes passando** (recontado depois das decisões de 2026-11-15).
  - `npm run build`: ok (`vue-tsc` + `vite build`).
  - `npm run test:a11y`: **197 passaram, 0 violações** (16 telas × 4 larguras × 3 temas = 192 + 4 autoverificações + 1 teste de menu), em 3,9 min.
  - `npm run test:integracao` (com `db:start` e `db:funcoes`): **3 arquivos, 13 testes passando**.
  - `npm run db:reset && npm run test:db`: **10 arquivos, 475 testes, `Result: PASS`**.
  - `git status --porcelain | grep -i '_temp'`: vazio. `git diff --stat main -- supabase/migrations`: vazio. `grep -rn "service_role\|SERVICE_ROLE" src/`: só **1 comentário** em `src/services/supabase.ts` linha 36 ("a chave `service_role` NUNCA vai para o front"); nenhum uso de código.
- **Próxima etapa:** B2 registrada em commit (`8eebbe8`); a **B1.1** foi feita em seguida (ver a seção da B1.1). Depois: **B3** (telas lendo e gravando no banco, `TipoUnidade` com os 16 valores, `Skeleton`), C (Painel no celular) e D (homologação na CGTI, limites e SMTP de produção).

## Etapa B1.1 — regras do banco (2026-11-15, branch `feat/b1-1-regras-banco`)
Design: [[2026-11-15-etapa-b1-1-regras-banco-design]] · Plano: [[2026-11-15-etapa-b1-1-regras-banco-plan]] · Decisões: [[decisoes-tecnicas-b1]] seção 5 (B11-1 a B11-9)
- **Situação: etapa B1.1 concluída** (commits automáticos na branch). Implementa as pendências P-B1-1 a P-B1-6 e P-B1-8.
- **Entregas:**
  - `20261116001_fluxo_presidencia.sql`: o GABIN valida e o Presidente homologa os riscos da Presidência; recusa no envio e na reabertura quando não há homologador efetivo.
  - `20261116002_objetos_regras.sql`: objeto só em unidade e processo ativos; supervisor preenchido pelo banco, propagado e limpo ao sair do processo; RPC `reatribuir_objeto` (só CGOV).
  - `20261116003_preliminar_cgov.sql`: a CGOV grava controles, respostas, KRIs e medições e apaga o risco enquanto `preliminar_cgov`.
  - `20261116004_dar_reavalia_aprovados.sql`: DAR alterada recalcula os aprovados da categoria; quem vira Crítico volta à homologação (`reaberto_mudanca_dar`); `devolver_risco` aceita a CGOV quando não há ator efetivo.
  - Importador `sync:estrutura` ignora o vínculo com CT de outra GR e avisa no relatório.
  - Testes pgTAP `070` a `073`; documentação em [[decisoes-tecnicas-b1]], [[guia-supabase-local]] e [[modelo-dados-mer]] (3.6).
- **Pendências novas** (detalhe em [[decisoes-tecnicas-b1]], "Pendências novas"): cargo vago trava o fluxo; ramo "validador sem ator efetivo" sem teste; tipo TS do histórico sem `reaberto_mudanca_dar` (B3); `atualizado_em` muda em aprovados não alterados (B3); TOCTOU assumir × escrita da CGOV (nota); errata dos comentários das migrações `004` e `005`; IDs fixos `10.0000`, `10.0001` e `10.0002` que o `sync:estrutura` precisa manter.
- **Notas para a B3:**
  - Os seletores de unidade escondem unidades inativas.
  - O campo "supervisor" do objeto é somente leitura/oculto para quem não é CGOV (o valor é ignorado quando há processo).
  - Mover objeto de unidade inativa usa a RPC `reatribuir_objeto`.
  - O tipo TS `HistoricoFluxoItem.acao` precisa de `reaberto_mudanca_dar`.
  - `atualizado_em` muda em todos os riscos aprovados da categoria quando a DAR muda (não significa "ficha editada").
  - Risco reaberto pela DAR sem homologador efetivo recebe recusa genérica em `homologar_risco`; a tela deve oferecer "devolver" à CGOV.
- **Verificação final da B1.1 (2026-11-15, nesta ordem):**
  - `npm test`: **35 arquivos, 349 testes passando**.
  - `npm run build`: ok (`vue-tsc` + `vite build`).
  - `npm run test:a11y`: **197 passaram, 0 violações** (3,9 min).
  - `npm run test:integracao` (com `db:funcoes`): **3 arquivos, 13 testes passando**.
  - `npm run db:reset && npm run test:db`: **14 arquivos (`000` a `073`), 630 testes, `Result: PASS`**.

## Etapa B3 — telas lendo e gravando no banco (2026-11-16, mesclada na `main` pelo PR #7)
Design: [[2026-11-16-etapa-b3-telas-banco-design]] · Plano: [[2026-11-16-etapa-b3-telas-banco-plan]] · Decisões: [[decisoes-tecnicas-b3]] · Aula: [[06-camada-de-dados-e-async]]
- **Situação: etapa B3 concluída e mesclada na `main`** (PR #7, merge `ea8e239`). Migração única: `20261117001_leitura_acoes_e_gravacao_ficha.sql`.
- **Entregas:**
  - **Camada de dados** (`src/services/dados/`) com duas fontes (demonstração e Supabase), tradução de erros do banco (`traduzirErroBanco`) e leitura paginada (`lerTodasAsPaginas`, 1.000 por página).
  - **Banco:** `acoes_no_fluxo` (quem pode o quê, com `motivo`), `salvar_ficha_risco` (ficha numa transação, fator do Quadro 6 derivado), `riscos_codigo_seq`, `ler_auditoria` (cursor de 50) e `objetos_onde_gravo`. Cálculo e RLS intocados.
  - **Store assíncrona** com estados carregando/erro/pronto e `avisoAtualizacao`; componentes `EstadoCarregamento`, `ErroPagina` e `AvisoAtualizacao`.
  - **Telas no banco:** Painel, Riscos, Ficha (com excluir), Novo risco e **edição** (`/riscos/novo?editar=<id>`), Importar (tentar de novo só as recusadas), Aprovações, Objetos (reatribuir), Monitoramento, DAR e Auditoria.
  - **Varredura de acessibilidade** com Painel e Riscos também em `carregando` e `erro` (`radar.demo-estado.v1`): (16 + 4) telas.
  - Documentação: [[decisoes-tecnicas-b3]] (B3-1 a B3-17 e pendências), [[06-camada-de-dados-e-async]], [[modelo-dados-mer]] (3.7), [[guia-supabase-local]] (seção 10) e [[design-system]] (seção 10).
- **Pendências principais** (detalhe em [[decisoes-tecnicas-b3]], seção 3): criticidade gravada em `acoes_no_fluxo` pode divergir após mudança da DAR em risco não aprovado e não editado; formulário edita só o 1º controle/ação/KRI; reimportar a tabela inteira após nova prévia duplica (deliberado); cargo vago da B1.1 segue aberto; ajustes pequenos de interface (coluna Ações no celular; o CSV da auditoria já tem guarda contra fórmula, em `auditoriaCsv.ts`).
- **Verificação final da B3 (2026-11-16, nesta ordem):**
  - `npm test`: **45 arquivos, 514 testes passando** (após a rodada de correções da revisão final, commit `937b17d`; reverificado em 2026-11-16).
  - `npm run build`: ok (`vue-tsc` + `vite build`).
  - `npm run test:a11y`: **245 passaram, 0 violações** ((16 + 4) telas × 4 larguras × 3 temas = 240 + 4 autoverificações + 1 teste de menu), em 6,8 min.
  - `npm run test:integracao` (com `db:start` e `db:funcoes`): **5 arquivos, 29 testes passando**.
  - `npm run db:reset && npm run test:db`: **17 arquivos (`000` a `082`), 840 testes, `Result: PASS`**.
  - `git status --porcelain | grep -i '_temp'`: vazio. `git diff --stat main -- supabase/migrations`: só `20261117001_leitura_acoes_e_gravacao_ficha.sql`. `grep -rn "service_role\|SERVICE_ROLE" src/`: só o comentário existente em `src/services/supabase.ts` linha 36.


## Etapa C — Painel no celular (2026-11-16, branch `feat/c-painel-celular`)
Design: [[2026-11-16-etapa-c-painel-celular-design]] · Plano: [[2026-11-16-etapa-c-painel-celular-plan]] · Decisões: [[decisoes-tecnicas-c]] · Design system: [[design-system]] (seção 11)
- **Situação: etapa C concluída e mesclada na `main` (PR #8, merge `a127b08`, 2026-11-16).** Sem migração, sem mudança de cálculo, alcance ou RLS.
- **Decisões da CGOV:** D-C1 recolher sem remover; D-C2 "Precisa da sua atenção" antes da Matriz no celular; D-C3 indicadores compactos 2×2 sem descrição.
- **Entregas:** `useCelular` (breakpoint 639,98 px); `BlocoRecolhivel` (três resumos fechados no celular, abertos no computador); `StatCard` com `compacto`; Painel reordenado só por CSS; "Maiores riscos" com até 3 cartões e "Mostrar mais N"; alvos de toque de 44 px (inclusive o "Fundamento" do `PageHeader` compartilhado); teste de navegador `painelCelular.a11y.ts`; 390 px na varredura; Figma atualizado (quadro Trabalho do celular e componente `BlocoRecolhivel`).
- **Altura medida do Painel em 390 px (demonstração, blocos fechados):** CGOV **3.690 px** (antes 4.104) e Gestor **3.771 px** (antes 4.185). **A meta de 3.500 px NÃO foi atingida:** ficou 190 px e 271 px acima. Sem os alvos de 44 px seria 3.537 / 3.618 px (os alvos custaram cerca de 150 px). Alvos com lado menor que 44 px: 0 (antes 14 de 49). Sem rolagem lateral.
- **Pendências:** meta de 3.500 px (decisão da CGOV: mais cortes de conteúdo ou alvos menores); descrição dos indicadores agora só para leitor de tela; no celular a ordem do teclado e do leitor de tela (Matriz antes da Atenção) difere da ordem visual; Figma: variante `compacto` do `StatCard`, quadros de computador do Trabalho, republicar a biblioteca e ligar o Code Connect à mão; menores adiados nas revisões (lista em [[decisoes-tecnicas-c]], seção 5).
- **Verificação final da etapa C (2026-11-16, nesta ordem):**
  - `npm test`: **48 arquivos, 540 testes passando**.
  - `npm run build`: ok (`vue-tsc` + `vite build`).
  - `npm run test:a11y`: **314 passaram, 0 violações** ((16 + 4) telas × 5 larguras × 3 temas = 300 + 4 autoverificações + 1 teste de menu + 9 testes do Painel no celular), em 5,8 min.
  - `npm run test:integracao` (com `db:start` e `db:funcoes`): **5 arquivos, 29 testes passando**.
  - `npm run db:reset && npm run test:db`: **17 arquivos (`000` a `082`), 840 testes, `Result: PASS`**.
  - `git status --porcelain | grep -i '_temp'`: vazio. `git diff --stat main -- supabase/migrations`: vazio. `grep -rn "service_role\|SERVICE_ROLE" src/`: só o comentário em `src/services/supabase.ts` linha 36.

## Reestruturação da documentação (2026-11-20)
- As fontes da 4ª rodada normativa estão em `docs/01-normativos/revisao-2026/` (ver o `README.md` da pasta: cópias fiéis, somente leitura; o `NT_ESTADO.md` prevalece em conflito).
- A revisão do diagnóstico está no §5 de [[2026-11-20-diagnostico-documentacao-radar]] (11 lacunas normativas). Plano: [[2026-11-20-reestruturacao-documentacao-plan]].
- **Fases 0, 1 e 2 do plano concluídas e mescladas na `main` pelo PR #9** (merge `d3bd1e6`, 2026-11-21). É a primeira PR pela regra "uma PR a cada mudança de fase" (`AGENTS.md`). Antes do merge, o **CodeRabbit** (configurado em `.coderabbit.yaml`, em teste) e o Codex revisaram a PR em 3 rodadas: 45 + 8 comentários, todos tratados (correções nos documentos de nível 1 e 2, nos scripts de cópia, de conferência do pacote e de verificação do ambiente; decisões de 2026-11-21 sobre retenção, restauração de teste e categorias sem equivalente). Dois cartões novos no Kanban: troca de titular em operação única e cópia com `verify-full`.
- **Pendente de prova real:** as mudanças da cópia (um único `pg_dump`, parcial exclusivo, TLS obrigatório na nuvem) passaram nos testes, mas não rodaram com Docker; a primeira prova completa do [[guia-copia-restauracao]] (seção 8) confere.
- [x] **Tarefa 14 (Fase 3, Nível 4):** [[mer-conceitual]] (13 entidades do negócio + 5 propostas pelas LAC-01 a LAC-07 e LAC-10) e [[der-logico]] (as 12 tabelas, em 3 blocos, colunas conferidas no banco local com as 12 migrações). Novo teste: o DER tem exatamente as tabelas dos `CREATE TABLE` das migrações. [[modelo-dados-mer]] virou histórico.
- [x] **Tarefa 15 (Fase 3):** [[normalizacao]] (12 tabelas × 1FN/2FN/3FN, os 7 pontos do E2 com proposta "antes × depois" e 10 pontos novos), [[dicionario-dados]] (138 colunas, com domínio, regra RN e dado pessoal) e [[0003-gravar-valores-calculados-no-risco]]. 11 cartões `#divida` no Kanban. Achado: o gatilho não deriva o fator do Quadro 6 a partir da eficácia, e um `UPDATE` direto em `riscos` pode gravar par incoerente (cartão; mexe no cálculo, depende de pergunta ao responsável).
- **PR #10** (Fase 3: Nível 4 — Modelagem de dados) **mesclada na `main`** em 2026-11-21 (merge `a8f13d5`), depois da revisão final (5 achados importantes corrigidos em `0760bfc`) e da triagem do CodeRabbit (6 procedentes corrigidos em `1b54063`, 1 improcedente respondido na PR). O `.gitignore` passou a ignorar links de skills, plugins e preferências locais do Obsidian.
- [x] **Tarefa 16 (Fase 4):** ADRs retroativos 0004 a 0016 (Vue/gov.br DS, Supabase com RLS, Quadro 7 no banco, Supabase local e pgTAP, login por link, dois modos, Edge Function, fluxo em 3 degraus, DAR reabre aprovados, importação com retrato versionado, Docker/Nginx, Figma ↔ código, Mermaid sem C4). `decisoes-tecnicas-b1/b2/b3/c` congelados com ponteiro para os ADRs.
- [x] **Tarefa 17 (Fase 4):** 5 diagramas UML em `docs/50-nivel5-software/` (casos de uso por grupo de atores, atividades, classes, sequência, máquina de estados do risco e proposta do ciclo do Plano). Achado: a mudança da DAR leva o aprovado **que passa a ser Crítico** **direto a `em_homologacao_dir`** (quem continua não Crítico fica `aprovado`) (sem passar pela validação); o desenho do plano falava em reabrir "para a validação".
- **Revisões reorganizadas (2026-11-21):** hook nativo do git `.githooks/pre-commit` (tipos + testes antes de cada commit, sem IA, calado quando passa; instalado pelo `npm ci` via `prepare`), seção "Revisões" no `CLAUDE.md` (uma revisão do Claude por tarefa, `/code-review` no fim da fase, CodeRabbit na PR, triagem em lote) e `.coderabbit.yaml` afinado contra ruído (ferramentas de estilo desligadas, `docs/superpowers/` fora, resumo enxuto; segue no esquema v2, validado contra o esquema oficial). No outro computador, o `npm ci` instala o hook.
- **Revisão final da Fase 4 (2026-11-21):** `/code-review` nível medium no diff da branch, com 6 achados, todos procedentes e corrigidos: o hook passou a considerar arquivos apagados; as regras de revisão agora mandam apontar erro de tipo e de teste, porque o hook é local e o `vue-tsc` não cobre `scripts/` nem `supabase/functions/`; o UC-05 entrou na fronteira do diagrama 3 de casos de uso; no F1, com a DAR pendente, residual Alto/Extremo vai ao tratamento e só o Médio aguarda; o ADR-0011 passou o "validar e homologar num passo só" para a Decisão; a data de congelamento dos `decisoes-tecnicas-*` virou 2026-11-21.
- **PR #11** (Fase 4: Nível 5, software e arquitetura) aberta para a `main`. **Triagem em lote (2026-11-21):** 15 achados (11 do CodeRabbit na 1ª rodada, 1 da revisão incremental, fora do diff, e 3 do Codex): **14 procedentes**, corrigidos num commit (uml-02: F1.03 como lacuna LAC-08, recusa por falta de homologador no envio e na validação, prazo sem resposta e ajuste sem mudança substancial no F3; uml-04: validação só no ramo do envio permitido e releitura logo após `validar_risco`; uml-05: `aprovado` é o fim do fluxo interno, não a inclusão no Plano; ADR-0013: ciclo interrompe a carga e unidade sem tipo fica de fora; ADR-0014: `docker compose up` sobe só a demonstração e a CSP tem duas cópias comparadas pelo teste; os 14 blocos Mermaid de `uml-01` a `uml-05` revalidados no renderizador do Mermaid Chart, todos válidos). **1 improcedente**, respondido na PR (o «include» do UC-20 ao UC-01: todo usuário é convidado e não há outro login). Os ADRs 0013 e 0014 mudaram antes do merge, só com esclarecimentos que conferem com o código.
- **PR #11 mesclada na `main`** em 2026-11-21 (merge `63bd5fb`), a pedido do responsável.
- [x] **Tarefa 18 (Fase 5, Nível 3):** `docs/04-ux` virou `docs/30-nivel3-interface` (`git mv`, nomes preservados, com `README.md`). Novo [[mapa-telas]]: as 15 telas de hoje (rota, view, UC, perfis da matriz §7, par 📌 Original × ✏️ Trabalho e componentes do Code Connect, conferidos no Figma só por leitura: 10 pares de páginas e os 23 conjuntos da biblioteca ligados) e 11 telas a prototipar (P-01 a P-11) para os UC-14 a UC-19 e UC-21 a UC-26. Cinco telas não têm par no Figma (`/riscos`, `/usuarios` e as três de acesso). A [[rastreabilidade]] ganhou a coluna **Tela**; o Kanban, 11 cartões `[figma] Modelagem` (no Backlog, porque a coluna Modelagem tem limite de 3). O comentário de `src/utils/rotulosInterface.ts:10` ainda cita a pasta antiga (cartão `[dívida]`; a tarefa não mexe em `src/`). Revisão da tarefa (`sonnet`): 4 achados, corrigidos. Achado à parte: um `;` no rótulo do diagrama de estados (uml-05), corrigido.
- **Revisão final da Fase 5 (2026-11-21):** `/code-review` nível medium. Nos arquivos da fase, o único achado foi o comentário de `src/` (já no Kanban). Como a `main` local não existe nesta máquina, a base ficou antiga e a revisão também pegou 8 achados em código já mesclado (cópia cifrada, perfil `real-local` do Docker, `verificar-ambiente`, `ref` do projeto do piloto no repositório público). Eles viraram 6 cartões no Backlog, sem correção nesta fase.
- **Próximo:** **PR #12** ("Fase 5: Nível 3, interface") aberta para a `main` (merge só a pedido); depois Fase 6 (Tarefa 19, lacunas código × requisitos e backlog priorizado).

## Depois do diário (2026-11-22)

- **PR #12 mesclada na `main`** em 2026-11-22 (merge `8b1fa55`), a pedido do responsável. Na triagem, o
  CodeRabbit (na PR e na revisão local pela CLI, sobre os commits da branch) e o Codex não acharam nada.
- **Fase 6 (Tarefa 19):** análise de lacunas código × requisitos, backlog priorizado e ADRs 0017 e 0018.
  O andamento segue no [[ESTADO-ATUAL]] (retrato) e no [[quadro]].
