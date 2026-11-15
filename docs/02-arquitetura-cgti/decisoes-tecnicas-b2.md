# Decisões técnicas da etapa B2 (login por link de e-mail e perfis)

> **Para que serve este documento:** registrar, num lugar só e versionado, as decisões tomadas
> durante a etapa B2 que **mudam o comportamento** do login, das telas de acesso, da Edge Function e
> do importador de atribuições. É o irmão de [[decisoes-tecnicas-b1]]. Os comentários do código e dos
> testes citam estas decisões pelo código (ex.: "B2-8", "T1"). Cada linha diz **o que** foi decidido,
> **por quê** e **qual o custo ou efeito**.
>
> Base: spec [[2026-11-15-etapa-b2-login-perfis-design]], plano [[2026-11-15-etapa-b2-login-perfis-plan]],
> matriz [[matriz-acesso-responsabilidades]]. Normas: minutas da Política (SEI `024241420`) e da
> Metodologia (SEI `024421455`), até a publicação.
>
> Códigos: **B2-n** = decisão do dono do produto (CGOV), tomada antes da execução; **(minha)** =
> decisão minha na spec, que foi confirmada ou alterada; **T** = decisão técnica tomada durante a
> execução.

## 1. Decisões do dono do produto (2026-11-15)

| Código | Decisão | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **B2-1** | **Dois modos.** Com `.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`): login real e o simulador de perfis some. Sem `.env`: "Modo demonstração", com faixa de aviso e o simulador dos 10 perfis. | A varredura de acessibilidade e a apresentação offline continuam funcionando sem Docker. | O código tem dois caminhos (`authStore.modo`). A varredura a11y não testa o login real; quem testa é a integração. |
| **B2-2** | O importador define o perfil **pelo tipo da unidade** (tabela em `src/utils/perfilPorUnidade.ts`). O relatório mostra tudo antes de gravar; a CGOV corrige pela tela. | A lista do SharePoint não traz perfil. | Casos fora do padrão são corrigidos à mão em "Usuários e perfis". |
| **B2-3** | O importador **cria contas e perfis, mas não envia e-mail.** A CGOV envia pela tela, por unidade ou em lote. | Permite piloto (ex.: GR5 e CT Curitiba) e impede e-mail sem autorização. | Depois da carga todos ficam "Convite pendente" até a CGOV enviar. |
| **B2-4** | Pessoa em mais de uma unidade na lista **fica na de maior alcance**; o relatório lista as outras e avisa quando uma unidade fica **sem titular**. | Uma pessoa, um perfil. Regras da B1 inalteradas. | Unidade sem titular não consegue validar riscos (achado para a CGOV, seção 3). |
| **B2-5** | O substituto **não é titular.** Só o titular recebe `titular_chefia = true`; o substituto entra como `gestor` da unidade. A CGOV liga a chave pela tela quando ele assume (fica na trilha). | Quem valida é decidido pela chave, e ela não deve ser dada por engano. | Trabalho manual da CGOV em cada substituição. |
| **B2-6** | Titular que mudou na nova carga: quem saiu **perde a chave e continua** com conta e perfil. O relatório mostra a mudança. Nada é apagado. | A Política manda guardar o histórico (art. 15, VI). | A CGOV decide se desativa a pessoa que saiu. |
| **B2-7** | A situação do convite fica **no Supabase Auth** (`app_metadata.convite_enviado_em`; último acesso = `last_sign_in_at`). | Sem migração e sem copiar dado que o Auth já tem. | A tela precisa consultar a Edge Function (`listar_situacao`). |
| **B2-8** | Pessoa que **já tem perfil** e aparece na lista: só se for **titular** e estiver lotada em outra unidade o importador a **move** (relatório: "mudou de unidade"). Substituta não é mexida (só aviso). **Nunca reativa** suspenso (só aviso). | Na B1, `e_titular_de` exige que o titular esteja lotado na unidade. | Divergências viram aviso e a CGOV resolve pela tela. |
| **B2-9** | Substituto **em exercício** (chave ligada pela CGOV) na próxima carga: **preserva e avisa.** O importador só tira a chave de quem **não aparece** na linha daquela unidade. | Não desfazer, sem querer, uma decisão da CGOV. | Aparece no relatório em "substitutos em exercício". |

## 2. Decisões minhas da spec (marcadas "(minha)")

| Tema | Decisão da spec | Situação na execução |
| --- | --- | --- |
| Fluxo do link | PKCE, com retorno em `/entrar/retorno` | **Alterada** (T1): `token_hash` + `verifyOtp`. A rota `/entrar/retorno` foi mantida. |
| Cadastro livre | `enable_signup = false` também em `[auth.email]` | **Alterada** (T2). |
| Limite de e-mails local | `email_sent` mais alto no local (ex.: 100/h) | **Alterada** (T4): 1000/h, só local; produção fica para a etapa D. |
| Modelo de e-mail | Em português, em `supabase/templates/` | **Confirmada**, com a correção T5. |
| Telas sem menu | `/entrar`, `/entrar/retorno` e `/acesso-nao-liberado` sem menu lateral; menu da conta só com Sair | **Confirmada**; atalhos de teclado reduzidos a 2 (T10). |
| Capacidades de validar e homologar | Fonte: spec B1, seção 7.1 (o que o banco já aplica), não a tabela resumida da matriz | **Confirmada** (T10). Diferença registrada na pendência 7 da B1. |
| A CGOV não valida nem homologa no simulador | Segue a matriz (seção 7, "Aprovações": V\*) | **Confirmada** (T10): mudança de comportamento. |
| Regras de validação da Edge Function | Módulo TypeScript puro testado pelo Vitest | **Confirmada**: `supabase/functions/_shared/validacoesAcesso.ts`. |
| Edge Function e `db:start` | "`db:start` já serve a função; se a CLI exigir, acrescentar comando" | **Alterada** (T3): a CLI exige `npm run db:funcoes`. |
| Ordem de desempate (pessoa em várias unidades) | titular antes de substituta; maior alcance; unidade mais alta; menor `icmbio_id` | **Confirmada** (`ORDEM_ALCANCE` em `perfilPorUnidade.ts`). |
| Trilha das cargas | `usuario_id` nulo (administrador), dito no relatório | **Confirmada.** |
| Relatório do importador | Só e-mail (sem nome), nunca gravado em arquivo | **Confirmada.** |
| E-mail não editável na B2 | Editar muda papel, unidade, titular, ativo e cargo | **Confirmada.** |
| Aviso de titular duplicado | O formulário avisa e oferece desligar o anterior | **Confirmada.** |
| Testes de integração | `npm run test:integracao`, exige o Supabase local | **Confirmada**, com T3 (exige também `db:funcoes`). |

## 3. Decisões técnicas da execução

| Código | Decisão | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **T1** | **Link de acesso com `token_hash` + `verifyOtp` (`type: 'email'`)** em vez de PKCE. O modelo de e-mail monta `.../entrar/retorno?token_hash=...&type=email`. A rota de destino pedida antes do login (`volta`) fica em **`localStorage`** (chave `radar.volta-apos-login`), como `{ volta, em }`, aceita por **1 hora** (o prazo do link) e sempre filtrada por `voltaSegura`; é apagada depois de usada. | O PKCE exige que o link seja aberto **no mesmo navegador** que pediu o login. O convite é enviado pelo **servidor** (Edge Function) e a pessoa costuma abrir o e-mail em outro lugar. O link do e-mail abre numa **aba nova**, e o `sessionStorage` é separado por aba; por isso a `volta` usa `localStorage`. | Link aberto em **outro navegador** (ou depois de 1 hora) entra e vai ao **Painel** (não há `volta` aproveitável). Link usado ou vencido volta a `/entrar` com "Este link expirou ou já foi usado". |
| **T2** | **`[auth.email] enable_signup = true`** (desvio da spec 8.1). | Na CLI 2.122, `false` nesse bloco desliga **todo** login por e-mail, inclusive de quem já tem conta. | O cadastro livre continua barrado por `[auth] enable_signup = false` e por `shouldCreateUser: false` no pedido de link. **Provado** pelo teste de integração: e-mail desconhecido não cria conta nem recebe e-mail. |
| **T3** | A Edge Function só responde com **`npm run db:funcoes`** (`supabase functions serve`) rodando **em outro terminal**. | `db:start` sozinho devolve 404 para `gerenciar-acesso`. | `npm run test:integracao` exige `db:start` **e** `db:funcoes`. Documentado no [[guia-supabase-local]]. |
| **T4** | Limites locais: `[auth.rate_limit] email_sent = 1000` (só local). `[auth.email] max_frequency = "1s"`. | Testar lote grande de convites. Medição: lote de **200** convites → 200 enviados, 0 falhas. | Reenviar ao **mesmo** e-mail em menos de 1 s dá 429 (a tela mostra "Muitas tentativas. Aguarde um minuto."). Valor de produção: etapa D. |
| **T5** | **Chaves duplas dentro de comentário HTML quebram o modelo de e-mail.** O motor de modelos do Auth (Go) executa `{{ }}` mesmo em comentário; o e-mail saía no padrão em inglês. Corrigido. | Defeito real encontrado na execução. | `tests/unit/templateEmail.spec.ts` impede a volta do defeito. **Mudança no modelo ou no `config.toml` exige `db:stop` e `db:start`.** |
| **T6** | O cliente `service_role` dos scripts foi extraído para `scripts/compartilhado/clienteServico.ts` (usado por `sync:estrutura` e `sync:atribuicoes`). | Um único lugar para a chave e para as proteções de destino. | Comportamento do `sync:estrutura` inalterado. A `service_role` **nunca** aparece em `src/`. |
| **T7** | **`tipoSuspeito`** (`perfilPorUnidade.ts`): unidade do tipo `coordenacao-geral` cuja mãe é Gerência Regional gera o aviso "confira o tipo no SharePoint". | Caso real: **CT Cuiabá (23.3005)** está como "Coordenação-Geral" (ver achados). | Só aviso: o importador e a tela de cadastro não mudam o perfil sozinhos. |
| **T8** | Importador: leitura do banco **paginada** (lotes de 500, `.order('id')`). Ao achar e-mail já cadastrado **sem perfil** (conta "órfã"), reaproveita a conta e cria só o perfil. A limpeza `deleteUser` é conferida e a mensagem de parada cita conta órfã. Resumo final: `contasCriadas` / `perfisCriados` / `perfisAlterados`. | O PostgREST devolve no máximo 1000 linhas por consulta; rodar de novo precisa ser seguro. | Mais código, mas a carga é idempotente. |
| **T9** | Importador, regra 6 (perda da chave): "linha da unidade" = **todos os listados naquela unidade** (antes de escolher a de maior alcance). `unidadesSemTitular` inclui unidades cujas linhas foram **todas descartadas** na leitura (e-mail ausente ou inválido). | Para **não tirar a chave** de substituto em exercício (B2-9) só porque ele ficou em outra unidade. | Ajustada em 2026-11-15 por P-B2-1 e P-B2-2 (seção 4.2). |
| **T10** | Front: a CGOV deixa de validar/homologar no simulador (matriz, seção 7); **Diretor e Presidência validam** (spec B1 7.1). O seletor de perfil do Painel virou `<select>` "Ver como" (10 opções não cabiam). Telas sem menu têm só 2 atalhos de teclado (conteúdo e rodapé). Sessão que termina sozinha leva a `/entrar?motivo=sessao`. | Coerência com a matriz e com o banco; acessibilidade. | Mudança visível no modo demonstração. |
| **T11** | **Sem commits por tarefa** (regra do usuário): um único commit da etapa, no fim, só quando ele pedir. A revisão de cada tarefa foi feita sobre retratos da árvore de trabalho. | Regra do usuário. | O histórico do Git terá um commit só para a B2. |

### 3.1 Correções da revisão final da B2

| Mudança | O que mudou | Por quê |
| --- | --- | --- |
| **Volta em `localStorage`** (ver T1) | `{ volta, em }`, validade de 1 hora, `voltaSegura` na leitura, apagada ao usar; `src/utils/voltaAposLogin.ts`. | O link do e-mail abre em outra aba; o `sessionStorage` se perdia. |
| **Sair só deste navegador** | `authStore.sair()` usa `signOut({ scope: 'local' })`. | "Sair" não deve derrubar a sessão da pessoa em outros aparelhos. |
| **Importador: relatório sem corte nas mudanças** | "Contas novas", "Mudaram de unidade", "Ganham/Perdem a chave" e "Unidades sem titular" saem sempre completas; o limite (50) vale só para avisos e linhas ignoradas; `--completo` mostra tudo. | A CGOV precisa ver tudo o que será gravado antes do "Aplicar? (s/N)" (B2-2). |
| **`listar_situacao` em páginas** | A função lê `auth.admin.listUsers({ page, perPage: 1000 })` e filtra pelos ids pedidos (antes: um `getUserById` por pessoa). Contrato e limite de 200 ids por pedido iguais. | ~1.200 chamadas em sequência a cada carga da tela. |
| Também | Listas de perfis e de unidades paginadas (`.range`, 1.000 por vez, ordem por nome e `id`); salvar na tela de usuários grava primeiro a principal e só depois tira a chave do titular anterior; botão Sair também na situação `erro`. | Limite de 1.000 linhas do PostgREST; evitar unidade sem titular num 409. |

## 4. Achados e pendências para a CGOV

### 4.1 Achados nos dados do SharePoint

1. **"CT Cuiabá" (23.3005)** está cadastrada com o tipo **"Coordenação-Geral"**. Pela regra do tipo, o
   titular receberia o perfil `coordenador_geral`, e não `coordenador_territorial`. O importador e a
   tela de cadastro **avisam** (T7). **A CGOV confirmou em 2026-11-15** que o tipo está errado e vai
   corrigir a lista do SharePoint e atualizar as circunscrições (UCs e NGIs) de cada CT; depois basta
   rodar `npm run sync:estrutura -- --pasta _temp/`.
2. **Unidades sem titular** não conseguem validar riscos. O relatório do importador lista "Unidades
   sem titular" para a CGOV completar a lista.

### 4.2 Decisões de 2026-11-15 sobre as pendências

Tomadas pelo dono do produto (CGOV) por perguntas de múltipla escolha, antes do commit da B2. Os
itens do importador estão **implementados**; os do banco **só documentados** (viram migrações na B1.1).

| Código | Decisão | Efeito |
| --- | --- | --- |
| **P-B2-1** | **Titular com e-mail vazio ou inválido** na linha da unidade: o importador **não tira a chave de ninguém naquela unidade** (a regra 6 não roda para ela) e gera o aviso `titular_sem_email` ("titular sem e-mail válido: chave atual mantida", sem nome de pessoa nem o valor rejeitado). Vale quando a linha tem titular (nome ou e-mail preenchido) ou só o substituto. Linha totalmente vazia não conta. | **Implementada.** `lerAtribuicoes` devolve `unidadesTitularSemEmail`; `planejarCarga(..., unidadesVistas, unidadesTitularSemEmail)`. A unidade segue na regra 7 (pode sair em "Unidades sem titular"). O substituto válido é processado normalmente. O relatório tem a seção "Titular sem e-mail válido (chave atual mantida)". |
| **P-B2-2** | **Perfil suspenso com a chave** numa unidade da lista que **não aparece** na linha dela **perde a chave** (antes era isento). Suspenso que aparece na lista segue a B2-8 (só aviso `suspenso_na_lista`). | **Implementada** na regra 6 de `planejar.ts`. |
| **P-B1-1 a P-B1-8** | Pendências de regra de negócio da B1 (A B2 não resolveu nenhuma; a CGOV decidiu as 8). | **Decididas; implementação na etapa B1.1 (início da B3)**, com spec, plano e revisão próprios (exigem migrações). O item 7 (matriz) já foi feito. Ver [[decisoes-tecnicas-b1]] seção 4.1 e [[matriz-acesso-responsabilidades]] seção 9. |

### 4.3 Antes de usar de verdade

- **Nenhum e-mail pode ser enviado a servidores do ICMBio antes da aprovação da CGTI.** Hoje todos os
  e-mails passam só pelo Mailpit local.
- Limites e SMTP de produção ficam para a etapa D (homologação na CGTI).
