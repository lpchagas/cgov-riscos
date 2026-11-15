# Etapa B2 — Login e perfis: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (escolhida pelo
> usuário) para executar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`) para
> acompanhamento.

**Objetivo:** permitir que só os convidados entrem no RADAR por link de e-mail, que cada um veja o menu
e as telas do seu perfil, que a CGOV cadastre e convide pessoas e que a lista de atribuições do
SharePoint marque os titulares.

**Arquitetura:** a `authStore` passa a ter dois modos: **real**, com `.env` e Supabase local, e
**demonstração**, sem `.env`, com simulador dos 10 perfis. Uma tabela pura (`acessoPorPerfil.ts`) é lida
pelo guarda das rotas, pelo menu e pelos botões. A chave secreta fica só na Edge Function
`gerenciar-acesso` e no importador Node `sync:atribuicoes`. O link de e-mail usa `token_hash` e a tela
`/entrar/retorno` chama `verifyOtp`. Não há migração nova.

**Tecnologias:** Vue 3, TypeScript, Pinia, vue-router 4, `@supabase/supabase-js` 2, Supabase CLI 2.122
(Docker, Edge Runtime em Deno, Mailpit), Vitest, Playwright + axe-core, `csv-parse`.

**Spec:** [[2026-11-15-etapa-b2-login-perfis-design]]
(`docs/superpowers/specs/2026-11-15-etapa-b2-login-perfis-design.md`). Quem executa lê a spec e este plano.

## Restrições globais

- **Nunca abrir, listar nem ler `_temp/`.** O CSV real de atribuições só é lido pelo importador, na
  máquina do usuário. Fixtures só com pessoas fictícias (`@radar.test` nos testes de unidade,
  `@integracao.radar.test` na integração).
- **Nenhuma migração nova** (`supabase/migrations/` não muda). Se uma tarefa achar que precisa de uma,
  pare e avise.
- **Não alterar** cálculo (Quadros 6, 7 e 8; `src/utils/calculadoraRiscoRadar.ts`), alcance, RLS nem
  fluxo da B1.
- A `service_role` **nunca** aparece em código de `src/` nem em variável `VITE_*`.
- E-mails só pelo Mailpit local (`http://127.0.0.1:54324`).
- Comentários e textos didáticos em **português do Brasil**; o mantenedor é iniciante. Cada arquivo
  novo começa com um bloco "EXPLICAÇÃO DIDÁTICA", no padrão dos existentes.
- Nunca escrever a sigla "PGR" para o Plano de Gestão de Riscos. Nível 18–25 é "Extremo", nunca "Crítico".
- Front com `@govbr-ds/core` e os componentes de `src/components/ui/`. Sem cores fixas (tokens de
  `src/styles/tokens.css`; há teste de higiene de CSS).
- Mensagens de erro do servidor começam com `RADAR:`.
- **Sem commits por tarefa.** Regra do usuário: um único commit da etapa, no fim, só quando ele pedir,
  com `Co-Authored-By`. As tarefas terminam com os testes passando e as mudanças na árvore de trabalho.
- Verificação final: `npm test`, `npm run build`, `npm run test:a11y` (0 violações),
  `npm run test:integracao` e, por último, `npm run db:reset && npm run test:db`.

## Foco da revisão

Casos que a spec implica, mas que nenhum teste "óbvio" pega. Cada um ganhou teste na tarefa dona:

1. **`/entrar` com falha de rede ou limite de envio (429):** a pessoa vê "Não foi possível enviar
   agora…" ou "Muitas tentativas. Aguarde um minuto.". Para e-mail existente **e** inexistente, a
   mensagem é a mesma (Tarefa 2).
2. **Link aberto em outro navegador, repetido ou vencido:** o link de outro navegador entra e vai ao
   Painel, porque não há `volta` guardado. O link usado ou vencido volta a `/entrar` com a mensagem de
   link expirado (Tarefa 3).
3. **CGOV suspende alguém que está logado:** na próxima renovação do token ou quando a janela volta ao
   foco, o perfil é relido e a pessoa vai para `/acesso-nao-liberado` (Tarefas 2 e 4).
4. **CSV com BOM, CRLF, quebra de linha entre aspas, e-mail com maiúsculas e espaços, e titular igual
   ao substituto na mesma linha:** uma pessoa só, como titular (Tarefa 7).
5. **Lote de convites com falha parcial** (uma conta apagada no meio): a resposta lista enviados e
   falhas, e a tela mostra as duas coisas sem perder o resto do lote (Tarefas 5 e 6).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/types/radar.types.ts` (mod.) | `PapelGovernanca` com 10 valores |
| `src/utils/acessoPorPerfil.ts` (novo) | `PAPEIS`, `ROTULOS_PAPEL`, `podeAbrirRota`, `capacidades` |
| `src/utils/perfilPorUnidade.ts` (novo) | `sugerirPapel`, `ORDEM_ALCANCE`, `tipoSuspeito` (importador e tela) |
| `src/services/supabase.ts` (mod.) | cliente opcional, sem detecção de sessão na URL |
| `src/stores/authStore.ts` (reescrito) | modos, sessão, perfil, situação, demo de 10 perfis |
| `src/router/guarda.ts` (novo) | `decidirNavegacao` (pura) |
| `src/router/index.ts`, `meta.d.ts` (mod.) | rotas novas, `meta.publica`, `meta.semMenu`, guarda global |
| `src/views/EntrarView.vue`, `EntrarRetornoView.vue`, `AcessoNaoLiberadoView.vue` (novos) | telas de acesso |
| `src/views/UsuariosPerfisView.vue` (novo) + `src/components/radar/FormularioPessoa.vue` (novo) | tela da CGOV |
| `src/services/acessoUsuarios.ts` (novo) | leitura e gravação de perfis + chamadas à Edge Function |
| `src/utils/situacaoConta.ts` (novo) | `situacaoConta` (pura) |
| `src/App.vue`, `BrHeader.vue`, `BrMenu.vue`, `PainelConsolidadoCgovView.vue` (mod.) | shell por modo e perfil |
| `supabase/config.toml` (mod.), `supabase/templates/link-acesso.html` (novo) | Auth local |
| `supabase/functions/_shared/validacoesAcesso.ts` (novo) | validação pura (sem Deno) |
| `supabase/functions/gerenciar-acesso/index.ts` (novo) | Edge Function (Deno) |
| `scripts/compartilhado/clienteServico.ts` (novo) | cliente `service_role` (extraído do `sync-estrutura`) |
| `scripts/sync-atribuicoes/{lerAtribuicoes,planejar,relatorio,aplicar,index}.ts` (novos) | importador |
| `tests/unit/fixtures/sharepoint/atribuicoes.csv` (novo) | fixture fictícia |
| `vitest.integracao.config.ts`, `tests/integracao/*` (novos) | testes com Supabase local |
| `tests/a11y/telas.ts`, `varredura.a11y.ts` (mod.) | telas novas e menu do gestor |
| docs (ver Tarefa 11) | guia, decisões, aula, estado |

---

### Tarefa 1: os 10 perfis e a tabela de acesso no front

**Arquivos:**
- Criar: `src/utils/acessoPorPerfil.ts`, `src/utils/perfilPorUnidade.ts`
- Modificar: `src/types/radar.types.ts:118`, `src/stores/authStore.ts`, `src/utils/painelResumo.ts:163-175`,
  `src/utils/auditoriaCsv.ts:33`, `src/services/dadosSementeAnexoII.ts:488,609`,
  `src/components/govbr/BrHeader.vue:76-81`, `src/views/PainelConsolidadoCgovView.vue:65-75`,
  `src/views/CatalogoObjetosView.vue` (botão "Novo objeto")
- Testes: `tests/unit/acessoPorPerfil.spec.ts`, `tests/unit/perfilPorUnidade.spec.ts`; ajustar
  `tests/unit/authStore.spec.ts`, `fluxoValidacao.spec.ts`, `painelPiloto.spec.ts` (`lider_cg` →
  `coordenador_geral`)

**Interfaces:**
- Produz:
  - `type PapelGovernanca = 'gestor' | 'coordenador_territorial' | 'gerente_regional' | 'coordenador_geral' | 'diretor' | 'presidencia' | 'auditoria' | 'cgov' | 'cgge' | 'gabin'`
  - `acessoPorPerfil.ts`: `PAPEIS: readonly PapelGovernanca[]` (nessa ordem);
    `ROTULOS_PAPEL: Record<PapelGovernanca, { rotulo: string; linha: string }>`;
    `ROTAS_SO_CGOV: readonly string[] = ['importar-skill', 'usuarios-perfis']`;
    `podeAbrirRota(papel: PapelGovernanca, nomeRota: string): boolean`;
    `interface Capacidades { podeValidar: boolean; podeHomologar: boolean; editaDar: boolean; editaCatalogoObjetos: boolean; importa: boolean; gerenciaUsuarios: boolean; somenteLeituraForaDaUnidade: boolean }`;
    `capacidades(papel: PapelGovernanca): Capacidades`
  - `perfilPorUnidade.ts`: `interface UnidadeParaPerfil { tipo: string; icmbioId: string | null; tipoPai?: string | null }`;
    `ICMBIO_ID_ESPECIAIS = { assessoriaPresidencia: '10.0001', cgge: '10.0007', cgov: '10.0008', audit: '10.0034' }`;
    `sugerirPapel(u: UnidadeParaPerfil): PapelGovernanca`;
    `ORDEM_ALCANCE: Record<PapelGovernanca, number>` (maior número = maior alcance);
    `tipoSuspeito(u: UnidadeParaPerfil): string | null` (devolve o aviso ou `null`)
  - `authStore` (modo demonstração, mantendo nomes atuais): `usuarioAtual: { id; nome; cargo; unidadeSigla; papel }`,
    `alternarPerfilDemo(papel)`, `perfisDisponiveisDemo: Record<PapelGovernanca, PerfilUsuarioDemo>`,
    `capacidades: ComputedRef<Capacidades>`; `CHAVE_PERFIL_DEMO = 'radar.perfil-demo.v1'` (o papel
    simulado fica em `localStorage`, lido no início dentro de try/catch; sem valor válido, o padrão
    continua `cgov`, como hoje; a varredura da Tarefa 10 usa esta chave); `podeAprovarCg = capacidades.podeValidar`,
    `podeHomologarDiretoria = capacidades.podeHomologar`, `isCgov = papel === 'cgov'` (mantidos para não
    mexer nas views)

- [ ] **Passo 1: escrever os testes que falham**

`tests/unit/acessoPorPerfil.spec.ts`:
- `it('as 10 chaves batem com o CHECK do banco')`: `PAPEIS` igual a
  `['gestor','coordenador_territorial','gerente_regional','coordenador_geral','diretor','presidencia','auditoria','cgov','cgge','gabin']`.
- `it('Importar e Usuários são só da CGOV (matriz, seção 7)')`: para cada papel ≠ `cgov`,
  `podeAbrirRota(p,'importar-skill')` e `podeAbrirRota(p,'usuarios-perfis')` são `false`; para `cgov`, `true`.
- `it('as demais telas abrem para os 10 perfis')`: `painel-cgov`, `dar-apetite`, `riscos-lista`,
  `novo-risco`, `ficha-bowtie-detalhe`, `catalogo-objetos`, `monitoramento-kris`, `validacao-um-clique`,
  `trilha-auditoria`, `sobre-radar` → `true` para todos.
- `it('quem valida e homologa segue a spec B1 7.1')`: `podeValidar` só em CT, GR, CG, diretor e
  presidencia; `podeHomologar` só em GR, diretor e presidencia; `cgov` não valida nem homologa.
- `it('DAR, catálogo, importação e usuários só na CGOV')` e `it('AUDIT é somente leitura fora da unidade')`.

`tests/unit/perfilPorUnidade.spec.ts`: um `it` por linha da tabela da spec 8.8, por exemplo
`{tipo:'coordenacao-geral', icmbioId:'10.0007'}` → `cgge`, `{tipo:'coordenacao', icmbioId:'10.0008'}` →
`cgov`, `{tipo:'orgao-assistencia', icmbioId:'10.0034'}` → `auditoria`, `{tipo:'orgao-assistencia', icmbioId:'10.0035'}`
→ `gestor`, `{tipo:'coordenacao-assessoramento', icmbioId:'10.0001'}` → `presidencia`, `uc`/`ngi`/`base-avancada` → `gestor`.
Mais: `ORDEM_ALCANCE.presidencia > diretor > cgov === cgge === gabin === auditoria > gerente_regional > coordenador_geral > coordenador_territorial > gestor`;
`tipoSuspeito({tipo:'coordenacao-geral', icmbioId:'23.3005', tipoPai:'gerencia-regional'})` devolve texto
com "confira o tipo no SharePoint" (caso real da CT Cuiabá, gravada como `coordenacao-geral`);
`tipoSuspeito` de uma CG da Sede devolve `null`.

`authStore.spec.ts`: o simulador alterna entre os 10 perfis; `capacidades` muda junto; `cgov` deixa de
ter `podeAprovarCg` (mudança da spec 8.4).

- [ ] **Passo 2:** `npx vitest run tests/unit/acessoPorPerfil.spec.ts tests/unit/perfilPorUnidade.spec.ts tests/unit/authStore.spec.ts` → FALHA (módulos inexistentes).
- [ ] **Passo 3: implementar.** `sugerirPapel` confere primeiro os `icmbioId` especiais e depois o tipo.
  Troque `lider_cg` por `coordenador_geral` em todo o `src/` e nos testes. Em `painelResumo.itensDeAtencao`,
  `papel === 'lider_cg'` vira `capacidades(papel).podeValidar` e o ramo da CGOV continua informativo.
  `BrHeader` e `Painel` montam as opções do simulador a partir de `PAPEIS` + `ROTULOS_PAPEL`. Nos 10
  `PERFIS_DEMO_ICMBIO`, use nomes genéricos ("Gestor(a) de unidade — demonstração"). No Catálogo, o botão
  "Novo objeto" só aparece com `capacidades.editaCatalogoObjetos`.
- [ ] **Passo 4:** `npm test` → todos passam; `npm run build` → sem erro de tipo.

---

### Tarefa 2: Auth local, cliente e `authStore` no modo real

**Arquivos:**
- Modificar: `supabase/config.toml`, `src/services/supabase.ts`, `src/stores/authStore.ts`, `.env.example`
- Criar: `supabase/templates/link-acesso.html`
- Teste: `tests/unit/authStoreReal.spec.ts`

**Interfaces:**
- Consome: `capacidades`, `PapelGovernanca` (Tarefa 1).
- Produz:
  - `supabase.ts`: `isSupabaseConfigurado: boolean`; `supabaseClient: SupabaseClient | null`, criado com
    `{ auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } }`.
  - `authStore`:
    - `type ModoAuth = 'real' | 'demonstracao'`;
    - `type SituacaoAcesso = 'carregando' | 'anonimo' | 'sem_perfil' | 'inativo' | 'ativo' | 'erro'`;
    - `interface PerfilRadar { id: string; nome: string; email: string; cargo: string | null; papel: PapelGovernanca; unidadeId: string; unidadeSigla: string; unidadeNome: string; titularChefia: boolean; ativo: boolean }`;
    - `modo: ModoAuth`, `situacao: Ref<SituacaoAcesso>`, `perfil: Ref<PerfilRadar | null>`,
      `mensagemErro: Ref<string | null>`;
    - `iniciar(): Promise<void>` (idempotente: chamadas repetidas devolvem a mesma promessa);
    - `recarregarPerfil(): Promise<void>`;
    - `enviarLink(email: string, volta: string): Promise<ResultadoEnvio>`, em que
      `type ResultadoEnvio = 'enviado' | 'limite' | 'falha_rede'`;
    - `concluirRetorno(tokenHash: string | null, tipo: string | null): Promise<'ok' | 'link_invalido'>`;
    - `sair(): Promise<void>`;
    - `CHAVE_VOLTA = 'radar.volta-apos-login'` (em `sessionStorage`).
  - No modo real, `usuarioAtual` vem de `perfil`, no mesmo formato do demo.

- [ ] **Passo 1: configurar o Auth local** (`supabase/config.toml`):
  - `site_url = "http://localhost:5173"`;
  - `additional_redirect_urls = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5199", "http://127.0.0.1:5199"]`;
  - `[auth] enable_signup = false` e `[auth.email] enable_signup = false`;
  - `[auth.rate_limit] email_sent = 1000` (comentário: valor só do ambiente local; produção na etapa D);
  - `[auth.email.template.magic_link] subject = "Seu link de acesso ao RADAR"`, com
    `content_path = "./supabase/templates/link-acesso.html"`.

  O modelo leva a `{{ .SiteURL }}/entrar/retorno?token_hash={{ .TokenHash }}&type=email` e diz em
  português: o link vale 1 hora, só funciona uma vez e "se você não pediu, ignore este e-mail". Os
  testes de integração conferem o template; os testes de unidade, não. Rode `npm run db:stop && npm run db:start`
  e confira que sobe sem erro.
- [ ] **Passo 2: escrever os testes que falham** (`tests/unit/authStoreReal.spec.ts`, com
  `vi.mock('../../src/services/supabase')` devolvendo um cliente falso com `auth.getSession`,
  `auth.onAuthStateChange`, `auth.signInWithOtp`, `auth.verifyOtp`, `auth.signOut` e `rpc`/`from`):
  - `sem sessão → situacao 'anonimo'`;
  - `meu_perfil vazio e própria linha inexistente → 'sem_perfil'`;
  - `meu_perfil vazio e própria linha com ativo=false → 'inativo'`;
  - `perfil ativo → 'ativo'`, com `perfil.unidadeSigla` vinda de `unidades` e `usuarioAtual.papel` igual ao papel;
  - `erro de rede ao ler o perfil → 'erro'` e `mensagemErro` começando com "Não foi possível falar com o RADAR";
  - `enviarLink` chama `signInWithOtp({ email: 'ana@radar.test', options: { shouldCreateUser: false } })`
    (e-mail com espaços e maiúsculas é normalizado) e grava `volta` em `sessionStorage`;
  - `enviarLink` devolve `'enviado'` também quando o Auth responde "Signups not allowed for otp" ou
    "user not found" (não revela quem existe);
  - `enviarLink` devolve `'limite'` com status 429 e `'falha_rede'` quando a chamada lança erro;
  - `concluirRetorno('abc','email')` chama `verifyOtp({ token_hash: 'abc', type: 'email' })` e devolve `'ok'`;
    com erro ou `tokenHash` nulo, devolve `'link_invalido'`;
  - evento `TOKEN_REFRESHED` chama `recarregarPerfil`; perfil que virou inativo → `'inativo'` (Foco 3);
  - evento `SIGNED_OUT` → `'anonimo'` e `perfil` nulo;
  - `iniciar()` chamado duas vezes faz uma única leitura de sessão.
- [ ] **Passo 3:** `npx vitest run tests/unit/authStoreReal.spec.ts` → FALHA.
- [ ] **Passo 4: implementar.** Sem cliente (`isSupabaseConfigurado = false`), `modo = 'demonstracao'`
  e `situacao = 'ativo'` com o perfil simulado. A leitura do perfil usa `rpc('meu_perfil')`; se vier
  vazia, `from('perfis_usuarios').select('ativo').eq('id', uid).maybeSingle()`; a unidade vem de
  `from('unidades').select('sigla,nome').eq('id', unidade_id).single()`. Use sigla vazia → nome.
- [ ] **Passo 5:** `npm test` e `npm run build` → passam.

---

### Tarefa 3: guarda das rotas e telas de acesso

**Arquivos:**
- Criar: `src/router/guarda.ts`, `src/views/EntrarView.vue`, `src/views/EntrarRetornoView.vue`,
  `src/views/AcessoNaoLiberadoView.vue`
- Modificar: `src/router/index.ts`, `src/router/meta.d.ts`
- Testes: `tests/unit/guardaRotas.spec.ts`, `tests/unit/telasAcesso.spec.ts`

**Interfaces:**
- Consome: `authStore` (Tarefa 2), `podeAbrirRota` (Tarefa 1).
- Produz:
  - `RouteMeta`: `publica?: boolean` (abre sem login), `semMenu?: boolean` (shell sem menu lateral).
  - Rotas novas: `{ path: '/entrar', name: 'entrar' }`, `{ path: '/entrar/retorno', name: 'entrar-retorno' }`,
    `{ path: '/acesso-nao-liberado', name: 'acesso-nao-liberado' }` (as três com `publica` e `semMenu`),
    e `{ path: '/usuarios', name: 'usuarios-perfis', meta.titulo: 'Usuários e perfis' }` (componente na
    Tarefa 6; até lá, `EmptyState` provisório).
  - `guarda.ts`: `interface ContextoGuarda { modo: ModoAuth; situacao: SituacaoAcesso; papel: PapelGovernanca | null; nomeRota: string; publica: boolean; caminhoCompleto: string }`;
    `type DecisaoGuarda = { tipo: 'seguir' } | { tipo: 'ir'; para: RouteLocationRaw; aviso?: string }`;
    `decidirNavegacao(ctx: ContextoGuarda): DecisaoGuarda`.
  - `AVISO_SO_CGOV = 'Esta tela é exclusiva da CGOV.'`

- [ ] **Passo 1: escrever os testes que falham.** `guardaRotas.spec.ts` (função pura):
  - modo real e `anonimo` em `/riscos?status=x` → `{ name: 'entrar', query: { volta: '/riscos?status=x' } }`;
  - rota pública → `seguir` em qualquer situação;
  - `sem_perfil` ou `inativo` em rota protegida → `{ name: 'acesso-nao-liberado' }`;
  - `ativo` e logado abrindo `/entrar` → Painel;
  - `ativo` + `gestor` em `importar-skill` → Painel com `aviso: AVISO_SO_CGOV`;
  - demonstração + perfil simulado `gestor` em `usuarios-perfis` → Painel com aviso;
  - demonstração em `acesso-nao-liberado` → `seguir` (a varredura precisa abrir);
  - `situacao 'erro'` → `seguir` (a tela de erro é mostrada pelo shell, na Tarefa 4).

  `telasAcesso.spec.ts` (montagem com `@vue/test-utils` e store simulada):
  - `EntrarView`: enviar → texto exato "Se o e-mail estiver cadastrado, você receberá um link em instantes. Ele vale por 1 hora.";
    `'limite'` → "Muitas tentativas. Aguarde um minuto e tente de novo."; `'falha_rede'` →
    "Não foi possível enviar agora. Confira sua conexão e tente de novo." (Foco 1); e-mail vazio ou sem
    "@" → erro no campo, sem chamada; no modo demonstração, o botão vira "Entrar no modo demonstração" e
    leva ao Painel.
  - `EntrarRetornoView`: lê `token_hash` e `type` da URL; `'ok'` com `sessionStorage[CHAVE_VOLTA] = '/riscos'`
    → vai para `/riscos` e apaga a chave; `'ok'` sem chave (link aberto em outro navegador) → Painel;
    `'link_invalido'` → `/entrar?motivo=link` (Foco 2). Ignora `volta` que não começa com `/` ou que
    começa com `//` (não redireciona para fora).
  - `EntrarView` com `?motivo=link` mostra "Este link expirou ou já foi usado. Peça um novo."; com
    `?motivo=sessao`, mostra "Sua sessão terminou. Entre de novo."
  - `AcessoNaoLiberadoView`: `sem_perfil` → "Sua conta ainda não tem acesso ao RADAR"; `inativo` →
    "Seu acesso está suspenso"; os dois mostram "planejamento@icmbio.gov.br" e o botão **Sair**, que chama
    `sair()` e vai a `/entrar`. No modo demonstração, `?exemplo=inativo` escolhe a variante.
- [ ] **Passo 2:** rodar os dois arquivos → FALHA.
- [ ] **Passo 3: implementar.** No `router/index.ts`, `beforeEach` assíncrono: `await authStore.iniciar()`,
  monta o `ContextoGuarda`, aplica a decisão e mostra o `aviso` com `useToast().mostrar({ mensagem, tom: 'aviso' })`.
  As telas usam `FormField`, `BrButton` e `BrMessage` e têm `<h1>`: "Entrar no RADAR",
  "Conferindo seu link", "Acesso não liberado".
- [ ] **Passo 4:** `npm test` e `npm run build` → passam.

---

### Tarefa 4: shell por modo e perfil (menu, cabeçalho, faixa e sessão)

**Arquivos:**
- Modificar: `src/App.vue`, `src/components/govbr/BrMenu.vue:47-105`, `src/components/govbr/BrHeader.vue`,
  `src/views/PainelConsolidadoCgovView.vue`
- Teste: `tests/unit/shellPorPerfil.spec.ts`

**Interfaces:**
- Consome: `podeAbrirRota`, `ROTULOS_PAPEL`, `authStore` (`modo`, `situacao`, `perfil`, `sair`,
  `recarregarPerfil`), `meta.semMenu`.
- Produz: item de menu `{ nomeRota: 'usuarios-perfis', rotulo: 'Usuários e perfis', icone: 'fa-solid fa-users-gear' }`
  no grupo "Ferramentas"; grupos vazios não aparecem.

- [ ] **Passo 1: escrever os testes que falham:**
  - menu do `gestor` sem "Importar riscos" e sem "Usuários e perfis"; sem o grupo "Ferramentas";
  - menu da `cgov` com os dois;
  - modo demonstração: faixa com o texto exato "Modo demonstração: dados fictícios, sem login" e o
    simulador dos 10 perfis no menu da conta; sem "Sair";
  - modo real: sem faixa e sem simulador; o menu da conta mostra `perfil.nome`, `cargo` e sigla da
    unidade e tem **Sair**;
  - o seletor de perfil do Painel só existe no modo demonstração;
  - rota com `meta.semMenu` não mostra o menu lateral nem a trilha;
  - `situacao 'erro'`: o conteúdo mostra `BrMessage` com `mensagemErro` e o botão "Tentar de novo", que
    chama `iniciar`/`recarregarPerfil`;
  - evento `SIGNED_OUT` (saída em outra aba) com o usuário numa rota protegida leva a `/entrar`;
  - janela volta ao foco (`visibilitychange` para visível) → `recarregarPerfil` (Foco 3); se o perfil
    passar a `inativo`, vai para `/acesso-nao-liberado`.
- [ ] **Passo 2:** rodar → FALHA.
- [ ] **Passo 3: implementar.** O filtro do menu usa `podeAbrirRota(authStore.usuarioAtual.papel, item.nomeRota)`.
  A reação à `situacao` fica num `watch` no `App.vue`, que só redireciona quando a rota atual não é pública.
- [ ] **Passo 4:** `npm test` e `npm run build` → passam. Abra `npm run dev` sem `.env` e confira a
  faixa e o simulador.

---

### Tarefa 5: Edge Function `gerenciar-acesso` e serviço do front

**Arquivos:**
- Criar: `supabase/functions/_shared/validacoesAcesso.ts`, `supabase/functions/gerenciar-acesso/index.ts`,
  `src/services/acessoUsuarios.ts`
- Teste: `tests/unit/validacoesAcesso.spec.ts`, `tests/unit/acessoUsuarios.spec.ts`

**Interfaces:**
- Consome: `PAPEIS` (Tarefa 1). Só o teste os compara; o `_shared` tem a própria lista, porque o Deno
  não importa de `src/`.
- Produz:
  - `validacoesAcesso.ts` (TypeScript puro, sem Deno nem imports externos):
    - `PAPEIS_VALIDOS: readonly string[]`;
    - `LIMITE_IDS_POR_PEDIDO = 200`;
    - `normalizarEmail(s: string): string`;
    - `eEmailValido(s: string): boolean`;
    - `type PedidoAcesso = { acao: 'criar'; nome: string; email: string; unidade_id: string; papel: string; titular: boolean; cargo?: string | null; enviar_link: boolean } | { acao: 'enviar_link'; ids: string[] } | { acao: 'listar_situacao'; ids: string[] }`;
    - `validarPedido(corpo: unknown): { ok: true; pedido: PedidoAcesso } | { ok: false; mensagem: string }`
      (mensagens começam com `RADAR:`).
  - Respostas HTTP da função:
    - `criar` → `201 { id }`;
    - `enviar_link` → `200 { enviados: string[]; falhas: { id: string; motivo: string }[] }`;
    - `listar_situacao` → `200 { situacoes: Record<string, { convite_enviado_em: string | null; ultimo_acesso_em: string | null }> }`;
    - erros: `400` (pedido inválido), `401` (sem login), `403 'RADAR: só a CGOV gerencia acessos.'`,
      `409 'RADAR: já existe uma conta com este e-mail.'`.
  - `acessoUsuarios.ts`:
    - `interface PerfilListado { id; nome; email; cargo: string | null; papel: PapelGovernanca; unidadeId; unidadeSigla; unidadeNome; titularChefia: boolean; ativo: boolean }`;
    - `interface UnidadeOpcao { id; nome; sigla: string | null; tipo: string; icmbioId: string | null; tipoPai: string | null }`;
    - `listarPerfis(): Promise<PerfilListado[]>`;
    - `listarUnidadesAtivas(): Promise<UnidadeOpcao[]>`;
    - `atualizarPerfil(id: string, mudancas: Partial<{ papel: PapelGovernanca; unidadeId: string; titularChefia: boolean; ativo: boolean; cargo: string | null }>): Promise<void>`;
    - `criarPessoa(p: { nome; email; unidadeId; papel; titular: boolean; cargo?: string | null; enviarLink: boolean }): Promise<{ id: string }>`;
    - `enviarLinks(ids: string[]): Promise<{ enviados: string[]; falhas: { id: string; motivo: string }[] }>`
      (divide em lotes de 200);
    - `listarSituacao(ids: string[]): Promise<Record<string, { conviteEnviadoEm: string | null; ultimoAcessoEm: string | null }>>`;
    - erros lançados como `Error` com a mensagem `RADAR:` do servidor.

- [ ] **Passo 1: escrever os testes que falham:**
  - `validacoesAcesso.spec.ts`: `PAPEIS_VALIDOS` igual a `PAPEIS`; e-mail normalizado
    (`'  Ana@Radar.TEST '` → `'ana@radar.test'`); `criar` sem nome, com papel `'lider_cg'` ou com e-mail
    inválido → `ok:false`; `ids` vazio ou com 201 itens → `ok:false`; ação desconhecida → `ok:false`.
  - `acessoUsuarios.spec.ts` (cliente simulado): `enviarLinks` com 450 ids faz 3 chamadas e junta
    `enviados` e `falhas` (Foco 5); a resposta 409 vira `Error('RADAR: já existe uma conta com este e-mail.')`;
    `atualizarPerfil` traduz `unidadeId`/`titularChefia` para `unidade_id`/`titular_chefia`.
- [ ] **Passo 2:** rodar → FALHA.
- [ ] **Passo 3: implementar a função (Deno),** com `import { createClient } from 'npm:@supabase/supabase-js@2'`
  e `import { validarPedido } from '../_shared/validacoesAcesso.ts'`. Responda CORS (`OPTIONS`) para o
  `localhost`. Os dois clientes:
  - **cliente do chamador:** `SUPABASE_URL` + `SUPABASE_ANON_KEY` + o cabeçalho `Authorization` recebido.
    Confere `rpc('meu_perfil')`, que precisa ter `papel_governanca === 'cgov'` (senão 403), e grava o
    perfil, para que a RLS e a trilha registrem a CGOV como autora;
  - **cliente admin:** `SUPABASE_SERVICE_ROLE_KEY`.

  As ações:
  - `criar`: `admin.auth.admin.createUser({ email, email_confirm: true })`. Se o e-mail já existir, 409.
    Depois, insert em `perfis_usuarios` pelo cliente do chamador. Se o insert falhar, chama
    `admin.auth.admin.deleteUser(id)` e repassa o erro. Com `enviar_link`, envia como em `enviar_link`.
  - `enviar_link`: para cada id, `admin.auth.admin.getUserById`; depois um cliente anon envia
    `signInWithOtp({ email, options: { shouldCreateUser: false } })`, e então
    `admin.auth.admin.updateUserById(id, { app_metadata: { convite_enviado_em: new Date().toISOString() } })`.
    Uma falha numa conta vai para `falhas` e o lote continua.
  - `listar_situacao`: `getUserById` de cada id → `app_metadata.convite_enviado_em` e `last_sign_in_at`.
- [ ] **Passo 4: implementar `acessoUsuarios.ts`** com `supabaseClient.functions.invoke('gerenciar-acesso', { body })`
  e consultas pela RLS (`perfis_usuarios` com `unidades(sigla,nome)`; `unidades` com `ativa = true` e
  `unidade_pai:unidade_pai_id(tipo)`).
- [ ] **Passo 5:** `npm test`, `npm run build`. Com `npm run db:start`, rode
  `curl -s -X OPTIONS http://127.0.0.1:54321/functions/v1/gerenciar-acesso -o /dev/null -w '%{http_code}'`
  → `200`. Se der 404, a CLI não serve a função sozinha: acrescente ao `package.json`
  `"db:funcoes": "supabase functions serve"` e registre no guia (Tarefa 11).

---

### Tarefa 6: tela "Usuários e perfis"

**Arquivos:**
- Criar: `src/views/UsuariosPerfisView.vue`, `src/components/radar/FormularioPessoa.vue`,
  `src/utils/situacaoConta.ts`
- Modificar: `src/router/index.ts` (componente real de `usuarios-perfis`)
- Testes: `tests/unit/situacaoConta.spec.ts`, `tests/unit/usuariosPerfisPagina.spec.ts`

**Interfaces:**
- Consome: `acessoUsuarios.ts` (Tarefa 5), `sugerirPapel`, `tipoSuspeito`, `ROTULOS_PAPEL` (Tarefa 1),
  `authStore` (`modo`, `perfil`).
- Produz:
  - `type SituacaoConta = 'pendente' | 'enviado' | 'entrou' | 'suspenso'`;
  - `situacaoConta(p: { ativo: boolean }, auth: { conviteEnviadoEm: string | null; ultimoAcessoEm: string | null } | undefined): SituacaoConta`;
  - `rotuloSituacao(s: SituacaoConta, auth?): string`, que devolve "Convite pendente",
    "Convite enviado em dd/mm/aaaa", "Entrou em dd/mm/aaaa" ou "Suspenso".

- [ ] **Passo 1: escrever os testes que falham:**
  - `situacaoConta.spec.ts`: suspenso vence tudo; `ultimoAcessoEm` → `entrou`; só `conviteEnviadoEm` →
    `enviado`; nada → `pendente`; datas formatadas em `pt-BR`.
  - `usuariosPerfisPagina.spec.ts` (serviço simulado):
    - a tabela lista nome, e-mail, unidade, perfil (rótulo), titular e situação;
    - os filtros por unidade, perfil e situação vão para a URL (`?perfil=gestor&situacao=pendente`);
    - "Enviar convites (N)" conta só as linhas filtradas em `pendente` e pede confirmação (`Dialog`)
      com "Enviar o link de acesso para N pessoas?";
    - o resultado parcial mostra um toast "X convites enviados; Y falharam" e a lista das falhas (Foco 5);
    - "Cadastrar pessoa": escolher a unidade `{tipo:'gerencia-regional'}` pré-seleciona
      `gerente_regional`; a unidade com `tipoSuspeito` mostra o aviso; "Enviar o link agora" vem marcado;
      e-mail inválido bloqueia o envio; 409 mostra a mensagem no campo e-mail;
    - "Editar" na própria linha (perfil logado) desabilita `ativo` e `papel`, com o texto "Você não pode
      suspender nem mudar o próprio perfil.";
    - ligar "Titular" numa unidade que já tem titular ativo mostra "Esta unidade já tem titular: <nome>." e a
      opção "Tirar a chave do titular anterior" (grava os dois);
    - ligar "Titular" sugere o papel `sugerirPapel(unidade)` sem trocar sozinho;
    - modo demonstração: lista os 10 perfis simulados e as ações mostram "Indisponível no modo demonstração.".
- [ ] **Passo 2:** rodar → FALHA.
- [ ] **Passo 3: implementar** com `PageHeader` (`cabecalhoProprio`), `DataTable` (modo cartão abaixo de
  768 px), `SideSheet`, `Dialog`, `FormField`, `Chip`, `EmptyState` e `Skeleton` durante o carregamento.
  A unidade é um campo de busca com lista filtrada (mínimo de 2 letras, até 20 resultados, por nome ou
  sigla). O e-mail não é editável no "Editar".
- [ ] **Passo 4:** `npm test` e `npm run build` → passam.

---

### Tarefa 7: importador de atribuições — leitura e planejamento (puros)

**Arquivos:**
- Criar: `scripts/sync-atribuicoes/lerAtribuicoes.ts`, `scripts/sync-atribuicoes/planejar.ts`,
  `tests/unit/fixtures/sharepoint/atribuicoes.csv`
- Teste: `tests/unit/syncAtribuicoes.spec.ts`

**Interfaces:**
- Consome: `lerTextoListaSharepoint` (`scripts/sync-estrutura/lerListaSharepoint.ts`); `sugerirPapel`,
  `ORDEM_ALCANCE`, `tipoSuspeito` (Tarefa 1); `normalizarEmail`, `eEmailValido` (Tarefa 5).
- Produz:
  - `COLUNAS_ATRIBUICOES = { unidade: ['uorg_nome','ourg_nome'], titularNome: ['titular','pessoa'], titularEmail: ['titular_email'], substitutoNome: ['substituto'], substitutoEmail: ['substituto_email'] }`.
    Matrículas e o resto nunca são copiados.
  - `interface PessoaListada { linha: number; unidadeNome: string; funcao: 'titular' | 'substituto'; nome: string; email: string }`
  - `interface AvisoCarga { tipo: 'linha_vazia' | 'sem_email' | 'email_invalido' | 'unidade_inexistente' | 'unidade_inativa' | 'tipo_suspeito' | 'varias_unidades' | 'divergencia' | 'suspenso_na_lista' | 'sem_titular'; linha?: number; email?: string; unidade?: string; detalhe: string }`
  - `lerAtribuicoes(linhas: Record<string,string>[]): { pessoas: PessoaListada[]; avisos: AvisoCarga[] }`.
    Lança `Error('RADAR: coluna obrigatória ausente: ...')` se faltar a coluna da unidade ou as de e-mail.
  - `interface UnidadeRef { id: string; icmbioId: string | null; nome: string; tipo: string; ativa: boolean; paiId: string | null }`
  - `interface PerfilAtual { id: string; email: string; nome: string; unidadeId: string; papel: PapelGovernanca; titular: boolean; ativo: boolean }`
  - `interface PlanoCarga { contasNovas: { email; nome; unidadeId; papel; titular: boolean }[]; mudancasUnidade: { perfilId; email; deUnidadeId; paraUnidadeId; papel }[]; ligarChave: { perfilId; email; unidadeId }[]; desligarChave: { perfilId; email; unidadeId }[]; substitutosEmExercicio: { email; unidadeId }[]; unidadesSemTitular: string[]; avisos: AvisoCarga[]; contagemPorPapel: Record<PapelGovernanca, number> }`
  - `planejarCarga(pessoas: PessoaListada[], unidades: UnidadeRef[], perfis: PerfilAtual[]): PlanoCarga`
  - `planoVazio(p: PlanoCarga): boolean`: nada a gravar (só avisos).

**Regras de `planejarCarga`** (spec 8.8, B2-2 a B2-9). A ordem é esta:
1. Resolver a unidade pelo `nome` exato (sem espaços nas pontas). Unidade inexistente ou inativa → aviso, e
   a pessoa sai. `tipoSuspeito` → aviso, e a pessoa continua.
2. Na mesma linha, titular e substituto com o mesmo e-mail → fica só como titular.
3. Pessoa em várias unidades: escolher pela ordem (titular antes de substituto; maior `ORDEM_ALCANCE` do
   `sugerirPapel`; menor profundidade na árvore, medida subindo `paiId`; menor `icmbioId`). As outras
   viram aviso `varias_unidades`.
4. Sem perfil → `contasNovas`: titular → `sugerirPapel`; substituto → `gestor`. `titular` só para
   quem é titular.
5. Com perfil (B2-8):
   - suspenso → aviso `suspenso_na_lista`, e nada muda;
   - titular lotado em outra unidade → `mudancasUnidade`, com papel `sugerirPapel`, mais `ligarChave`;
   - titular lotado na unidade → `ligarChave`, se a chave estiver desligada; se o papel for diferente do
     sugerido, aviso `divergencia`;
   - substituto lotado em outra unidade → aviso `divergencia`;
   - substituto com a chave ligada na unidade → `substitutosEmExercicio`.
6. `desligarChave` (B2-6/B2-9): perfis com `titular = true` numa unidade da lista cujo e-mail não está
   na linha dessa unidade.
7. `unidadesSemTitular`: unidades da lista que, depois do plano, não têm perfil ativo com a chave.

- [ ] **Passo 1: criar a fixture.** `atribuicoes.csv` começa com BOM e a linha `ListSchema=...`, usa
  CRLF e usa os **nomes internos** no cabeçalho. Unidades da fixture `estrutura.csv` (`Instituto de Teste`,
  `Diretoria de Planejamento, Administração e Logística de Teste`, `ICMBio Serra Imaginária`), com pessoas
  `@radar.test`. Casos:
  - linha completa;
  - linha vazia;
  - substituto sem titular;
  - titular igual ao substituto com maiúsculas e espaços;
  - pessoa em duas unidades;
  - e-mail inválido;
  - unidade inexistente;
  - nome de pessoa entre aspas com quebra de linha (Foco 4).

  No teste, faça uma cópia do cabeçalho com os **nomes exibidos** (por substituição de texto).
- [ ] **Passo 2: escrever os testes que falham** (um `it` por regra 1 a 7 e por caso da fixture):
  - cabeçalho interno e exibido dão o mesmo resultado;
  - nenhum campo de `PessoaListada` contém a matrícula (o teste procura os números da fixture em
    `JSON.stringify(resultado)`);
  - troca de titular: o antigo vai para `desligarChave`, e o perfil continua (não aparece em mais nada);
  - substituto em exercício: fica fora de `desligarChave` e entra em `substitutosEmExercicio`;
  - titular já cadastrado em outra unidade → `mudancasUnidade`;
  - suspenso → só aviso;
  - **idempotência:** aplicar o plano a um estado simulado e planejar de novo → `planoVazio === true`.
- [ ] **Passo 3:** `npx vitest run tests/unit/syncAtribuicoes.spec.ts` → FALHA.
- [ ] **Passo 4:** implementar.
- [ ] **Passo 5:** rodar → PASSA; `npm run build` → passa.

---

### Tarefa 8: importador de atribuições — relatório, gravação e comando

**Arquivos:**
- Criar: `scripts/compartilhado/clienteServico.ts`, `scripts/sync-atribuicoes/relatorio.ts`,
  `scripts/sync-atribuicoes/aplicar.ts`, `scripts/sync-atribuicoes/index.ts`
- Modificar: `scripts/sync-estrutura/index.ts` (usar `criarClienteServico`), `package.json`
  (`"sync:atribuicoes": "vite-node scripts/sync-atribuicoes/index.ts"`)
- Teste: acrescentar em `tests/unit/syncAtribuicoes.spec.ts`

**Interfaces:**
- Consome: `PlanoCarga`, `planejarCarga`, `lerAtribuicoes` (Tarefa 7); `conferirDestinoDoSim`
  (`scripts/sync-estrutura/destino.ts`); `lerListaSharepoint`.
- Produz:
  - `criarClienteServico(): { cliente: SupabaseClient; url: string }`, que move a lógica atual de
    `criarCliente` do `sync-estrutura`, sem mudar o comportamento;
  - `formatarRelatorioAtribuicoes(plano: PlanoCarga, limite?: number): string`;
  - `carregarEstado(cliente): Promise<{ unidades: UnidadeRef[]; perfis: PerfilAtual[] }>`;
  - `aplicarPlano(cliente, plano): Promise<{ contasCriadas: number; perfisAlterados: number }>`;
  - opções do comando: `--arquivo <caminho>` (obrigatório), `--so-relatorio`, `--sim`, `--permitir-remoto`.

- [ ] **Passo 1: escrever os testes que falham:**
  - o relatório tem as seções "Contas novas", "Mudaram de unidade", "Ganham a chave de titular",
    "Perdem a chave de titular", "Substitutos em exercício (preservados)", "Unidades sem titular",
    "Pessoas em várias unidades", "Linhas ignoradas" e "Contagem por perfil";
  - o relatório **não contém** nenhum nome de pessoa da fixture, só os e-mails;
  - o relatório termina com "As gravações do importador aparecem na trilha de auditoria sem autor (usuario_id nulo).";
  - o comando sem `--arquivo` sai com "RADAR: informe o arquivo com --arquivo <caminho>.";
  - um `lerOpcoes` exportado de `index.ts` interpreta as opções.
- [ ] **Passo 2:** rodar → FALHA.
- [ ] **Passo 3: implementar.** `aplicarPlano` faz as operações nesta ordem: desligar chaves → mudanças
  de unidade → ligar chaves → contas novas. Cada conta nova: `auth.admin.createUser({ email, email_confirm: true })`
  e depois insert em `perfis_usuarios`; se o insert falhar, `deleteUser` e para com
  `RADAR: parei em <email>; já gravado: ...`. Nada de envio de e-mail. O comando:
  1. lê o arquivo;
  2. planeja;
  3. imprime o relatório;
  4. com `--so-relatorio`, termina;
  5. se o plano estiver vazio, diz "Nada a gravar." e termina;
  6. `conferirDestinoDoSim(url, …)`;
  7. pergunta "Aplicar? (s/N)", salvo com `--sim`;
  8. aplica e imprime o resumo.

  Nunca grava o relatório em arquivo.
- [ ] **Passo 3a:** `npm test` (inclusive `syncEstrutura.spec.ts`, que não pode mudar de resultado).
- [ ] **Passo 4:** com o banco local ligado, rode `npm run sync:atribuicoes -- --arquivo tests/unit/fixtures/sharepoint/atribuicoes.csv --so-relatorio`.
  Esperado: relatório com as unidades da fixture como **inexistentes** (o banco tem as unidades reais),
  sem erro. É a prova de fumaça; a gravação de verdade é testada na Tarefa 9.

---

### Tarefa 9: testes de integração com o Supabase local

**Arquivos:**
- Criar: `vitest.integracao.config.ts` (`environment: 'node'`, `include: ['tests/integracao/**/*.spec.ts']`,
  `fileParallelism: false`, `testTimeout: 30000`), `tests/integracao/ajudantes.ts`,
  `tests/integracao/fixtures/atribuicoes-integracao.csv`, `tests/integracao/login.spec.ts`,
  `tests/integracao/gerenciarAcesso.spec.ts`, `tests/integracao/syncAtribuicoes.spec.ts`
- Modificar: `package.json` (`"test:integracao": "vitest run --config vitest.integracao.config.ts"`)

**Interfaces:**
- Consome: `criarClienteServico` (Tarefa 8), `aplicarPlano`, `planejarCarga`, `carregarEstado`,
  `lerAtribuicoes` (Tarefas 7 e 8); Edge Function (Tarefa 5); template (Tarefa 2).
- Produz (`ajudantes.ts`):
  - `DOMINIO_TESTE = '@integracao.radar.test'`;
  - `clienteServico()`, `clienteAnon()`;
  - `entrarComo(email: string): Promise<SupabaseClient>`, que usa `auth.admin.generateLink({ type: 'magiclink', email })`
    e depois `verifyOtp({ token_hash, type: 'email' })` num cliente anon;
  - `mensagensPara(email: string): Promise<{ assunto: string; texto: string }[]>`, pela API do Mailpit
    `http://127.0.0.1:54324/api/v1/search?query=to:<email>`;
  - `limparContasDeTeste(): Promise<void>`, que apaga as contas cujo e-mail termina em `DOMINIO_TESTE` e
    devolve a chave de titular aos perfis da semente que o teste tenha mudado.

- [ ] **Passo 1: escrever os testes** (`beforeAll`: falha com "Rode npm run db:start antes" se o
  Supabase não responder; `afterAll`: `limparContasDeTeste`):
  - `login.spec.ts`:
    - `signInWithOtp` com `shouldCreateUser: false` para `gestor.uc@radar.test` → o Mailpit recebe um
      e-mail com assunto "Seu link de acesso ao RADAR" e um link com `/entrar/retorno?token_hash=`;
    - para `ninguem@integracao.radar.test`, nenhuma conta é criada e o Mailpit não recebe nada.
  - `gerenciarAcesso.spec.ts`:
    - chamada como `gestor.uc@radar.test` → 403;
    - sem login → 401;
    - como `cgov@radar.test`, `criar` com `nova@integracao.radar.test` e `enviar_link: true` → 201; o
      perfil existe, a trilha (`auditoria_log`, tabela `perfis_usuarios`) registra `usuario_id` igual ao
      da CGOV e o Mailpit recebe o link;
    - criar o mesmo e-mail de novo → 409;
    - `enviar_link` com um id válido e um inexistente → um em `enviados` e um em `falhas` (Foco 5);
    - `listar_situacao` traz `convite_enviado_em` preenchido.
  - `syncAtribuicoes.spec.ts`:
    - fixture com unidades reais **sem usuários da semente** (`GR3 - Gerência Regional Centro-Oeste`,
      `COAGR3`, `ICMBio Brasília-Contagem`, `GR3 - Serv. de Apoio Temático 1`) e pessoas
      `@integracao.radar.test`;
    - aplicar → as contas existem e os papéis são `gerente_regional`, `gestor`…;
    - planejar de novo → `planoVazio`;
    - trocar o titular da GR3 na fixture (cópia em memória) e aplicar → o antigo perde a chave e continua ativo.
- [ ] **Passo 2:** `npm run db:start` e `npm run test:integracao` → os testes passam. A Tarefa 9 é escrita
  depois das Tarefas 5, 7 e 8; se algo falhar, corrija na tarefa dona.
- [ ] **Passo 3:** `npm run db:reset && npm run test:db` → `Result: PASS` (prova que a integração não deixou
  sujeira que quebre a semente).

---

### Tarefa 10: varredura de acessibilidade das telas novas

**Arquivos:**
- Modificar: `tests/a11y/telas.ts`, `tests/a11y/varredura.a11y.ts`; o guia
  `docs/04-ux/varredura-acessibilidade.md` (contagem de telas)

**Interfaces:**
- Consome: rotas e telas das Tarefas 3, 4 e 6 (modo demonstração).
- Produz: campo opcional `perfil?: PapelGovernanca` em `Tela`, gravado em `localStorage` sob
  `CHAVE_PERFIL_DEMO` (Tarefa 1) antes de a página abrir.

- [ ] **Passo 1:** acrescente em `TELAS`:
  - `{ nome: 'entrar', rota: '/entrar', titulo: 'Entrar no RADAR' }`;
  - `{ nome: 'acesso-nao-liberado', rota: '/acesso-nao-liberado?exemplo=inativo', titulo: 'Acesso não liberado' }`;
  - `{ nome: 'usuarios', rota: '/usuarios', titulo: 'Usuários e perfis', perfil: 'cgov' }`.

  Acrescente também o teste avulso "menu do gestor não mostra ferramentas da CGOV": com perfil `gestor`,
  o menu não tem os links "Importar riscos" e "Usuários e perfis", e `/importar` volta ao Painel. As
  telas sem `perfil` abrem com o padrão `cgov`, então `/importar` continua na varredura.
- [ ] **Passo 2:** `npm run test:a11y` → **0 violações**, e o total passa a 16 telas × 4 larguras × 3
  temas = 192 combinações, mais as autoverificações e o teste do menu. Corrija as violações nas telas
  (nunca relaxe a regra).
- [ ] **Passo 3:** atualize o guia com as contagens novas.

---

### Tarefa 11: documentação e verificação final

**Arquivos:**
- Criar: `docs/02-arquitetura-cgti/decisoes-tecnicas-b2.md`, `docs/03-caderno-aprendizado/05-login-sessao-e-guardas.md`
- Modificar: `docs/02-arquitetura-cgti/guia-supabase-local.md`, `docs/01-normativos/matriz-acesso-responsabilidades.md`
  (nota da pendência 7 na seção 7), `docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md` (seção 4.1, item 7,
  aponta para a B2), `docs/00-memoria/ESTADO-ATUAL.md`, `docs/00-memoria/MOC-Radar.md`, `.env.example`

- [ ] **Passo 1: `decisoes-tecnicas-b2.md`**, no formato do da B1:
  - as decisões do usuário B2-1 a B2-9;
  - as minhas da spec (marcadas como "(minha)"), confirmadas ou alteradas;
  - as decisões técnicas da execução (código `T1`, `T2`…): `token_hash` + `verifyOtp` em vez de PKCE
    (funciona com convite enviado pelo servidor e em outro navegador); `volta` em `sessionStorage`;
    `email_sent = 1000` local; cliente compartilhado dos scripts; mapeamento `tipoSuspeito`.
  - **Achado para a CGOV:** a "CT Cuiabá" (23.3005) está com o tipo "Coordenação-Geral" no SharePoint.
- [ ] **Passo 2: `guia-supabase-local.md`:**
  - seção "Entrar no RADAR localmente": `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
    (do `npx supabase status`), `/entrar` → Mailpit em `http://127.0.0.1:54324` → link;
  - seção da Edge Function;
  - seção do `sync:atribuicoes`, com o aviso em destaque: o arquivo real fica em `_temp/`, nunca é
    commitado e o relatório nunca é salvo;
  - `npm run test:integracao` na tabela de comandos.
- [ ] **Passo 3: Aula 5:** o que é um link mágico; sessão e renovação; por que o menu não é segurança
  (a RLS é); os dois modos. Inclua exemplos com os arquivos reais.
- [ ] **Passo 4:** ESTADO-ATUAL (seção da B2: entregas, verificação, pendências da B1 4.1 que continuam
  abertas, achado da CT Cuiabá) e MOC (links novos). `.env.example` explica os dois modos.
- [ ] **Passo 5: verificação final**, nesta ordem, com a saída registrada no ESTADO-ATUAL:
  - `npm test` → todos passam;
  - `npm run build` → ok;
  - `npm run test:a11y` → 0 violações;
  - `npm run db:start && npm run test:integracao` → passam;
  - `npm run db:reset && npm run test:db` → `Result: PASS`;
  - `git status --porcelain | grep -i '_temp'` → vazio;
  - `grep -rn "service_role\|SERVICE_ROLE" src/` → vazio;
  - `git diff --stat main -- supabase/migrations` → vazio.
- [ ] **Passo 6:** não commitar. Avise o usuário e espere o pedido de commit.
