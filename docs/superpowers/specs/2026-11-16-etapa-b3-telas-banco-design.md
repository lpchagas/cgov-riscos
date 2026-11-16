# Design — Etapa B3: telas lendo e gravando no banco

> **Data:** 2026-11-16 · **Tamanho:** projeto · **Branch:** `feat/b3-telas-banco` (a partir da `main`, com B1, B2 e B1.1 mescladas)
> · **Base:** [[ESTADO-ATUAL]] (notas para a B3), [[matriz-acesso-responsabilidades]], [[decisoes-tecnicas-b1]] §4 e §5,
> [[decisoes-tecnicas-b2]], [[modelo-dados-mer]] §3, [[guia-supabase-local]], [[design-system]]
> · **Normas:** minutas da Política (SEI `024241420`) e da Metodologia (SEI `024421455`), até a publicação.

## 1. Por que

Até a B2, as telas do RADAR funcionam só com os **dados de demonstração em memória**: o login real existe, mas
quem entra vê os riscos fictícios do Anexo II e o fluxo de aprovação é simulado na tela. A B1 e a B1.1 já
deixaram no banco tudo o que manda de verdade: alcance (RLS), fluxo de 3 degraus com segregação D1, trilha de
auditoria e regras da DAR. A B3 **liga as telas ao banco**, para o RADAR poder ir à homologação na CGTI
(etapa D) funcionando de ponta a ponta.

**Sucesso:** no modo real, cada pessoa vê só o seu alcance, grava só onde pode, os botões de fluxo aparecem
exatamente para quem o banco aceita, e qualquer recusa do banco vira uma frase clara na tela. O modo
demonstração continua funcionando igual (apresentação offline e varredura de acessibilidade).

## 2. Objetivos, não objetivos e anti-objetivos

**Objetivos**
1. No modo real, a `riscosStore` lê e grava no Supabase: objetos, riscos, controles, respostas, KRIs,
   medições, histórico do fluxo e categorias (DAR). Leitura paginada (o PostgREST devolve no máximo 1.000 linhas).
2. Fluxo só pelas funções do banco: `enviar_para_validacao`, `validar_risco`, `homologar_risco`,
   `devolver_risco` (inclusive a saída da CGOV, B11-4), `assumir_risco_preliminar` e `reatribuir_objeto`.
3. Botões de fluxo **decididos por risco** pelo banco (D1 "sobe um nível", titular da chefia, Presidência → GABIN).
4. Telas com dados do banco: Painel, Riscos, Ficha, Novo risco, Objetos, Monitoramento, Aprovações, DAR,
   Auditoria (lendo `auditoria_log`) e Importar (grava riscos `preliminar_cgov`).
5. Estados de carregamento (`Skeleton`), vazio (`EmptyState`) e erro (com "Tentar de novo") em todas essas telas.
6. Tipos do front alinhados ao banco: `TipoUnidade` com os 16 valores; `HistoricoFluxoItem` com todas as ações.
7. Notas da B1.1: seletores sem unidades inativas; supervisor do objeto só leitura para quem não é CGOV;
   `atualizado_em` mudado pela DAR não é "ficha editada"; marca "processo inativo"; "Reatribuir objeto";
   oferta de "Devolver" à CGOV quando não há homologador efetivo.

**Não objetivos**
- Atualização em tempo real (Supabase Realtime). A tela relê depois de cada ação e tem "Atualizar".
- Painel no celular (etapa C) e homologação/SMTP de produção (etapa D).
- Resolver as pendências novas da B1.1 que dependem da CGOV (cargo vago, delegação).
- Mudar o modo demonstração: continua em memória e com botões pelo perfil.

**Anti-objetivos (seria fracasso mesmo funcionando)**
- Repetir no TypeScript a regra de quem valida/homologa (D1, Presidência). A regra mora só no banco.
- Calcular criticidade, residual ou nível no front **no modo real** e gravar esse valor: no modo real quem
  calcula é o gatilho do banco; a tela só mostra a prévia (já existente) e depois lê o que o banco gravou.
- Mensagens técnicas na tela (`42501`, `violates row-level security policy`, nome de função).
- Uma tela que mostra dados de demonstração para quem está logado de verdade.
- Ficha salva pela metade (risco gravado e controles não).

## 3. Restrições

- **Não alterar o cálculo** (Quadros 6, 7 e 8; `calculadoraRiscoRadar.ts`; `trigger_calcular_risco_radar`).
- **Uma migração nova** autorizada pelo dono do produto (2026-11-16), descrita na seção 6. Ela **não** muda
  alcance, RLS, regras do fluxo nem cálculo. Qualquer outra mudança de banco exige perguntar antes.
- `@govbr-ds/core` + tokens; `npm run test:a11y` com **0 violações**; telas alteradas continuam na varredura.
- Nunca abrir `_temp/`; e-mails só no Mailpit; só usuários fictícios `@radar.test`.
- Código e documentação com comentários didáticos em português do Brasil (o responsável é iniciante).
- Siglas: nunca "PGR" para o Plano de Gestão de Riscos; "Crítico" ≠ "Extremo".
- Commits automáticos por tarefa aprovada (`tipo(escopo): resumo`); push/PR só com pedido.

## 4. Abordagens consideradas

| Abordagem | Como seria | Troca | Decisão |
|---|---|---|---|
| **A. Camada de dados dupla** | `src/services/dados/` com uma interface (`FonteDados`) e duas implementações: `fonteDemonstracao` (memória, a lógica de hoje) e `fonteSupabase`. A store escolhe uma ao iniciar e ganha estados `carregando/erro/pronto`. | Mais arquivos, cada um pequeno e testável isoladamente. | **Escolhida** pelo dono do produto. |
| B. `if` na store | Cada função da store com "modo real → Supabase; senão → como hoje". | A store (653 linhas) dobraria de tamanho misturando as duas lógicas. | Descartada. |
| C. Telas direto no banco | Cada tela chama o Supabase; store só na demonstração. | Repete código em 13 telas; Painel e menu perdem a fonte única. | Descartada. |

Duas decisões de banco também tiveram alternativas (dono do produto, 2026-11-16):
- **Botões por risco:** função de leitura nova (**escolhida**) × calcular na tela (duplica D1) × só pelo perfil (botão que dá erro).
- **Gravar a ficha:** função de gravação única (**escolhida**) × pedidos separados (a trava do risco aprovado
  recusa o 2º pedido — a trava vale por *comando*, `fn_fluxo_reaberto_neste_comando` — e uma queda deixa a ficha pela metade).

## 5. Arquitetura no front

### 5.1 Camada de dados (`src/services/dados/`)

```text
src/services/dados/
├── tipos.ts               ← interface FonteDados + tipos de entrada/saída (sem lógica)
├── fonteDemonstracao.ts   ← lógica atual da store (memória), movida para cá
├── fonteSupabase.ts       ← consultas e RPCs; converte snake_case ⇄ camelCase
├── conversores.ts         ← linha do banco ⇄ FichaRisco/ObjetoContexto/… (funções puras, testadas)
├── paginacao.ts           ← lerTodasAsPaginas (extraído de acessoUsuarios.ts e reaproveitado)
└── errosBanco.ts          ← tradutor das recusas do banco para frases claras (seção 5.4)
```

A interface `FonteDados` tem, no mínimo: `carregarCarteira()` (riscos visíveis com filhos, objetos, categorias,
unidades ativas e processos), `relerRisco(id)`, `salvarFicha(dados)`, `excluirRisco(id)`,
`enviar/validar/homologar/devolver/assumir(id, texto?)`, `acoesNoFluxo(ids)`, `registrarMedicao`,
`atualizarStatusTratamento`, `salvarObjeto`, `reatribuirObjeto`, `alterarApetite`/`alterarJustificativa`,
`importarPreliminares(fichas, objetoId)`, `lerAuditoria(pagina, filtros)` e `lerAtividadeRecente(n)`.
Todas assíncronas e todas lançam `ErroRadar` (com `mensagem` já traduzida e `tipo`) em caso de falha.

A **fonte de demonstração** implementa a mesma interface sobre os arrays de hoje, devolvendo promessas já
resolvidas, com o comportamento atual (botões pelo perfil: `acoesNoFluxo` usa `capacidades()` e o estado).
A escolha da fonte segue `authStore.modo` (B2-1).

### 5.2 Store (`riscosStore.ts`)

- Mantém o **mesmo contrato público** que as telas já usam (`riscos`, `categorias`, `objetosContexto`,
  `unidades`, filas, `resumoPorClasse`, filtros…), para mudar o mínimo nas telas. As ações passam a ser
  `async` e devolvem `Promise`.
- Ganha `estado: 'ocioso' | 'carregando' | 'pronto' | 'erro'`, `erro: ErroRadar | null`, `carregar()`,
  `tentarDeNovo()` e `acoes: Record<riscoId, AcoesFluxo>` (resultado de `acoesNoFluxo`).
- `carregar()` roda quando a sessão fica `ativo` (modo real) ou na abertura (demonstração); ao **sair**,
  a store é limpa (nenhum dado de uma pessoa fica para a próxima).
- Depois de cada ação de fluxo ou gravação: relê o(s) risco(s) afetado(s) e as `acoes` deles (os demais
  riscos da mesma categoria são relidos depois de mudar a DAR).
- **No modo real, a store não calcula nem decide.** `salvarOuAtualizarRisco`, `alterarApetiteCategoriaDAR`
  e `reavaliarPontuacaoRiscoAprovado` mandam os dados de entrada ao banco e relêem o resultado. A prévia de
  cálculo nas telas (Novo risco, Reavaliar, DAR) continua usando `calculadoraRiscoRadar.ts`, como hoje,
  marcada como prévia.

### 5.3 Telas

| Tela | O que muda no modo real |
|---|---|
| Painel (`/`) | Indicadores, Matriz, "Precisa da sua atenção" (pelas `acoes`), maiores residuais, DAR e atividade recente (histórico do fluxo, `lerAtividadeRecente`). `Skeleton` nos cartões. |
| Riscos (`/riscos`) | Lista do alcance; painel lateral com os botões de `acoes`; "Reavaliar" grava por `salvarFicha`. Coluna/selo "processo inativo" quando o objeto está ligado a processo inativo. |
| Ficha (`/riscos/:id`) | Lê do banco (por id). Botões Enviar, Assumir, Validar, Homologar, Devolver pelas `acoes`. Risco inexistente ou fora do alcance → "Risco não encontrado" (sem dizer qual dos dois). Excluir só quando o estado permite (D2). |
| Novo risco (`/riscos/novo`) | Objeto escolhido entre os objetos em que a pessoa grava; grava por `salvarFicha` (código gerado no banco); "Salvar e enviar" = `salvarFicha` + `enviar`. |
| Objetos (`/objetos`) | Lista do banco; cadastro só com unidades **ativas** e processos **ativos**; supervisor **só leitura** para quem não é CGOV (mostra o valor preenchido pelo banco); "Reatribuir objeto" (só CGOV, só objeto de unidade inativa, `reatribuir_objeto`); marca "processo inativo"; marca "unidade inativa". |
| Monitoramento (`/monitoramento`) | Medições de KRI e status das ações gravados no banco (não reabrem o risco aprovado). |
| Aprovações (`/aprovacoes`) | Filas montadas pelas `acoes` (o que **eu** posso validar, homologar ou devolver), não só pelo estado. A CGOV vê a fila "Sem quem decida" (riscos com `devolucao_cgov`) e devolve com motivo. |
| DAR (`/dar`) | Lê as categorias; a CGOV grava apetite e justificativa; depois relê a carteira. Aviso: "Os riscos aprovados da categoria foram recalculados pelo banco; os que passaram a Crítico voltaram para homologação." |
| Auditoria (`/auditoria`) | Lê a trilha pela função `ler_auditoria` (seção 6.3), paginada ("Carregar mais", 50 por vez, ordem decrescente), com filtros de período e tabela. Cada linha: quando, quem (nome de quem agiu, devolvido pela função), o quê (ex.: "Controle do risco RADAR-2026-003 alterado") e "o que mudou" (campos com nome legível, antes → depois). **"Recalculado pela DAR"** (regra minha, sem marca no banco): uma alteração em `riscos` em que **só** mudaram campos calculados (`nivel_inerente`, `classificacao_inerente`, `fator_controle`, `nivel_eficacia_controle`, `nivel_residual`, `classificacao_residual`, `status_critico`, `is_critico`, `atualizado_em`) não pode ter vindo da ficha, porque nenhum campo de entrada mudou; aparece como "recalculado pela DAR", nunca como "ficha editada". CSV continua. |
| Importar (`/importar`) | A CGOV escolhe o objeto (qualquer unidade **ativa**) e grava os riscos como `preliminar_cgov` por `salvarFicha`; o código vem do banco (o da skill é descartado e citado na prévia). |
| Menu lateral | Contadores das filas pelas `acoes`. |

**Padrões visuais (Figma, Templates V3 do gov.br):**
- *Erro de página inteira* (carteira não carregou): layout do **Template V3 — Erro** (ilustração, título,
  subtítulo, texto curto, ações "Tentar de novo" e "Ir para a Página Principal"), sem busca nem "Envie um feedback".
- *Erro de bloco* (só um cartão ou lista falhou): `BrMessage` de perigo dentro do bloco + botão "Tentar de novo".
- *Decisões* ("Devolver", "Reatribuir objeto", "Excluir risco"): `Dialog` com campo obrigatório, no padrão
  dos diálogos de "Adicionar/Editar Usuário" do **Template V3 — Consistência Visual**.
- *Formulários*: rótulos em cima e texto explicativo ao lado (já usado no Novo risco).
- *Carregamento*: `Skeleton` no formato do conteúdo (cartões, linhas de tabela), com "Carregando…" para leitor de tela.

### 5.4 Mensagens do banco em linguagem clara (`errosBanco.ts`)

O banco responde com `code` (SQLSTATE) e `message` começando por `RADAR:`. O tradutor:
1. Usa um dicionário por **trecho conhecido** da mensagem `RADAR:` → frase curta + o que fazer.
   Ex.: "a ficha do risco … está travada" → "Este risco está em validação ou homologação e não pode ser
   editado agora. Peça à chefia que o devolva para ajuste."
2. Sem trecho conhecido, cai no **código**: `42501` → "Você não tem permissão para esta ação."; `55000` →
   "O risco mudou de situação. Atualize a página e tente de novo."; `22023` → "Informe o motivo."; `P0002` →
   "Risco não encontrado."; falha de rede → mensagem de rede da B2.
3. Se a mensagem começa por `RADAR:` e não está no dicionário, mostra o texto **sem** o prefixo (já está em
   português) — melhor que uma frase genérica.
4. Nunca mostra o texto de erro do PostgreSQL/PostgREST que não começa por `RADAR:`.

A mensagem aparece em `Toast` (ações) ou `BrMessage` (formulários), lida pelo leitor de tela.

## 6. A migração nova (`20261117001_leitura_acoes_e_gravacao_ficha.sql`)

Autorizada pelo dono do produto em 2026-11-16 (escopo ampliado no mesmo dia, depois da revisão do construtor:
`ler_auditoria`, colunas `pode_editar`/`pode_excluir` e `objetos_onde_gravo`). Quatro funções e uma
sequência, comentários didáticos, testes pgTAP novos (`080_acoes_no_fluxo.sql`, `081_salvar_ficha_risco.sql`,
`082_leituras_b3.sql`). Não mexe em políticas, alcance, regras do fluxo nem cálculo; as leituras só devolvem
o que a pessoa já pode ler.

### 6.1 `acoes_no_fluxo(riscos uuid[])` — só leitura

`STABLE`, `SECURITY DEFINER`, `search_path = ''`, `EXECUTE` só para `authenticated`. Para cada id da lista
**que a pessoa pode ler** (`pode_ler_objeto` do objeto do risco; os demais são ignorados, sem erro), devolve:

| coluna | verdadeira quando |
|---|---|
| `risco_id` | — |
| `pode_enviar` | todas as checagens de `enviar_para_validacao` passariam: estado `rascunho`/`devolvido`, `pode_escrever_objeto`, existe `chefia_imediata`, o validador efetivo (com a pessoa logada como quem envia) não é nulo e, se o risco exige homologação (critério recalculado como a própria função faz), o homologador efetivo não é nulo |
| `pode_assumir` | estado `preliminar_cgov` e `pode_escrever_objeto` (a unidade) |
| `pode_validar` | estado `em_validacao_cg`, a pessoa é titular do **validador efetivo** (`fn_fluxo_validador_efetivo` com `fn_fluxo_quem_enviou`) e, se o risco exige homologação, o homologador efetivo não é nulo |
| `pode_homologar` | estado `em_homologacao_dir` e a pessoa é titular do **homologador efetivo** |
| `pode_devolver` | titular do validador/homologador efetivo no estado de decisão, **ou** `devolucao_cgov` |
| `devolucao_cgov` | estado de decisão **sem ator efetivo** e a pessoa tem perfil `cgov` ativo (mesma condição de `devolver_risco`, B11-4) |
| `pode_editar` | o `UPDATE` da ficha passaria: `pode_escrever_objeto` (ou CGOV com risco `preliminar_cgov`) **e** estado fora de `em_validacao_cg`/`em_homologacao_dir` (trava) **e**, se `aprovado`, há validador efetivo para a reabertura (a mesma checagem de `fn_fluxo_exigir_validador_na_reabertura`, com a pessoa logada como quem altera) |
| `pode_excluir` | o `DELETE` passaria: `pode_escrever_objeto` (ou CGOV em `preliminar_cgov`) e estado `rascunho`, `devolvido` ou `preliminar_cgov` (D2) |
| `motivo` | texto curto quando um botão esperado **não** aparece por regra do banco (ex.: "Não há chefia acima para validar este risco; procure a CGOV.", "Não há quem homologue este risco; a CGOV pode devolvê-lo."); nulo nos demais casos |

Regra de ouro: cada coluna chama **as mesmas funções internas** que a ação correspondente usa (sem reescrever a
regra); o teste pgTAP prova, para os usuários da semente (inclusive Presidência, GABIN, COMET e CGOV), que
cada coluna diz "sim" **se e somente se** a ação correspondente passa. Quando a coluna diz "não", o botão
**some** e a tela mostra o `motivo`, se houver. Limite: no máximo 1.000 ids por chamada (a store chama em lotes).

### 6.2 `salvar_ficha_risco(ficha jsonb)` — gravação única

`SECURITY INVOKER` (roda com as permissões de quem está logado: RLS, travas, recálculo e trilha valem
como hoje), `EXECUTE` só para `authenticated`. Num único comando:
1. Sem `id`: insere o risco (estado `rascunho`, ou `preliminar_cgov` quando pedido — a RLS só aceita esse
   estado para a CGOV) e **gera o `codigo_radar`** `RADAR-<ano atual>-<NNN>` a partir de uma sequência nova
   global (`riscos_codigo_seq`, `USAGE` para `authenticated`). A numeração **não recomeça** a cada ano (decisão
   minha: simples e sem colisão). O `seed-demonstracao.sql` (aplicado pelo `db:reset` depois das migrações)
   ajusta a sequência para acima do maior `NNN` dos códigos no formato `RADAR-<4 dígitos>-<número>`; códigos
   fora desse formato (`RADAR-DEMO-*`, `RADAR-T0xx-*`) são ignorados no ajuste.
2. Com `id`: atualiza os campos de entrada do risco (nunca `status_fluxo`, nem os campos calculados).
3. Sincroniza os filhos enviados (`controles`, `respostas`, `kris`): insere os novos, atualiza os existentes
   e apaga os que saíram da lista. Medições de KRI **não** passam por aqui (são do Monitoramento).
4. Devolve o `id` e o `codigo_radar`.

Como é um único comando do cliente, a reabertura do risco aprovado acontece **uma vez** e as demais linhas
passam pela regra "reaberto neste comando" já existente. Qualquer recusa desfaz tudo (transação).

### 6.3 `ler_auditoria(...)` — só leitura

`STABLE`, `SECURITY DEFINER`, `search_path = ''`, `EXECUTE` só para `authenticated`. Parâmetros: período
(de/até), tabela (opcional), `limite` (máx. 100) e cursor (`antes_de` = data/id da última linha recebida).
Devolve **só as linhas que a política de leitura de `auditoria_log` já deixa a pessoa ver** (CGOV: todas;
demais: as de objetos com `pode_ler_objeto`), acrescidas de:

- `quem_nome` e `quem_papel` (de `perfis_usuarios`; nulo quando `usuario_id` é nulo → a tela mostra "Sistema/administrador");
- `codigo_radar` do risco envolvido, quando houver (pela linha de `riscos`, ou pelos `dados_novos`/`dados_anteriores`
  quando o risco já foi apagado).
É a única forma de quem não é CGOV ver o nome de quem agiu, e só em linhas que já enxerga.

### 6.4 `objetos_onde_gravo()` — só leitura

`STABLE`, `SECURITY DEFINER`, `search_path = ''`, `EXECUTE` só para `authenticated`. Devolve os ids dos
objetos em que a pessoa pode criar risco (`pode_escrever_objeto`), para o seletor do "Novo risco". Para a CGOV
no Importar, a tela usa a lista de objetos de unidades ativas (ela grava `preliminar_cgov` em qualquer objeto).

## 7. Tipos do front

- `TipoUnidade` com os 16 valores do banco (`coordenacao-territorial`, `coordenacao-assessoramento`,
  `orgao-assistencia`, `gabinete`, `divisao`, `servico`, `setor`, `base-avancada` além dos 8 atuais), com
  rótulos em `rotulosInterface.ts`.
- `HistoricoFluxoItem.acao`: `submetido`, `assumido`, `validado`, `validado_e_homologado`, `homologado`,
  `devolvido_ajuste`, `reaberto_mudanca_nota`, `reaberto_mudanca_dar` (e `aprovado_1_clique`, usado só pela
  demonstração); `etapa` com `assuncao_preliminar`. Rótulos claros no dicionário.
- `usuarioPapel` no histórico aceita texto (o banco grava o papel de quem agiu).
- Tipo novo `AcoesFluxo` (seção 6.1) e `ErroRadar` (seção 5.4).

## 8. Testes e verificação

- **Vitest (unitário):** conversores, tradutor de erros, paginação, fonte de demonstração (contrato) e store
  (estados carregando/erro/pronto, limpeza ao sair) com a fonte falsa.
- **Integração (`npm run test:integracao`):** `fonteSupabase` contra o Supabase local com usuários da semente:
  ler só o alcance; salvar ficha; enviar → validar → homologar; devolver; saída da CGOV; assumir preliminar;
  reatribuir objeto; DAR; mensagem traduzida de recusa.
- **pgTAP:** `080`, `081` e `082` (seção 6); os 630 testes atuais continuam passando.
- **Acessibilidade:** a varredura roda no modo demonstração. Para cobrir os estados novos, a fonte de
  demonstração aceita uma chave de teste no `localStorage` (`radar.demo-estado.v1` = `carregando` | `erro`),
  como a chave de perfil que a varredura já usa; a varredura ganha Painel e Riscos nesses dois estados.
- **Antes de dizer que terminou:** `npm test`, `npm run build`, `npm run test:a11y` (0 violações),
  `npm run test:integracao` (com `npm run db:funcoes`), `npm run db:reset && npm run test:db`.

## 9. Documentação

`decisoes-tecnicas-b3.md` (novo, decisões B3-n), [[modelo-dados-mer]] §3.7 (funções novas),
[[guia-supabase-local]] (rodar o app no modo real com a semente), [[design-system]] (estados de carregamento e
erro), Aula 6 do caderno (camada de dados, `async/await`, paginação), [[ESTADO-ATUAL]] e [[MOC-Radar]].

## 10. Decidido × deixado ao construtor

**Decidido pelo dono do produto (2026-11-16):** abordagem A; função `acoes_no_fluxo`; função
`salvar_ficha_risco`; ampliação da migração com `ler_auditoria`, `pode_editar`/`pode_excluir` e
`objetos_onde_gravo`; resumo de dados (carregamento, auditoria, atividade recente, importar, erros,
demonstração) confirmado; referência visual nos Templates V3 do gov.br.

**Calls minhas, registradas aqui:** botão só aparece quando a ação passaria (colunas repetem as checagens
chamando as mesmas funções internas) e a tela explica pelo `motivo`; "recalculado pela DAR" pela regra "só
campos calculados mudaram", sem marca no banco; código gerado no banco por sequência global que não recomeça
por ano; atividade recente pelo histórico do fluxo; auditoria em páginas de 50; chave de teste
`radar.demo-estado.v1`; sem tempo real; reler depois de cada ação; nome e número da migração.

**Ao construtor:** formato exato do JSON da `salvar_ficha_risco`; consultas com recursos embutidos do
PostgREST ou leituras separadas por tabela (desde que paginadas); divisão em tarefas; textos finais do
dicionário de erros (seguindo o glossário de microcopy).
