---
tags: [aprendizado, login, sessao, seguranca, supabase, vue-router]
---

# 🎓 Aula 5: Login, Sessão e Guardas de Rota

Na Aula 2 você viu a **RLS**, a segurança dentro do banco. Esta aula explica **como a pessoa chega
até lá**: como ela prova quem é (login), como o sistema se lembra dela (sessão) e por que esconder um
item do menu **não** é segurança. São quatro ideias:

1. **link mágico:** entrar sem senha, só com o e-mail;
2. **sessão e renovação:** como o sistema "lembra" de você;
3. **guarda de rota e menu:** quem vê qual tela, e por que isso é só conforto;
4. **os dois modos:** com e sem Supabase.

> Decisões e motivos: [[decisoes-tecnicas-b2]]. Como rodar: [[guia-supabase-local]], seção 8.

---

## 1. O que é um link mágico

### O problema das senhas

Senha dá trabalho: precisa ser criada, guardada, trocada e pode vazar. No RADAR, **só quem a CGOV
convidou** pode entrar, e todos têm e-mail institucional. Então basta provar que **você lê aquele
e-mail**.

### Como funciona

1. Você digita seu e-mail em `/entrar` (`src/views/EntrarView.vue`).
2. O sistema pede ao Supabase Auth um link. **Só existe link para quem já tem conta**: o pedido usa
   `shouldCreateUser: false`, então digitar um e-mail desconhecido não cria conta nem envia nada.
3. O Supabase manda um e-mail (no computador local, ele cai no **Mailpit**, em
   <http://127.0.0.1:54324>). O modelo está em `supabase/templates/link-acesso.html`.
4. O link leva a `/entrar/retorno?token_hash=...&type=email`
   (`src/views/EntrarRetornoView.vue`). O `token_hash` é um código de **uso único** que vale por 1
   hora.
5. A tela entrega o código ao Supabase (`verifyOtp`, no `src/stores/authStore.ts`). Se estiver certo,
   nasce a **sessão** e você segue para a tela que tinha pedido (ou para o Painel).

### Por que `token_hash` e não o outro modo (PKCE)

O modo PKCE só funciona se você abrir o link **no mesmo navegador** em que pediu. Mas o convite é
enviado **pelo servidor**, pela CGOV, e a pessoa abre o e-mail onde quiser. Com `token_hash`, o link
funciona em qualquer navegador (decisão T1 em [[decisoes-tecnicas-b2]]). A "tela pedida" é lembrada
por 1 hora e atravessa abas do mesmo navegador; só aberto em OUTRO navegador (ou depois de 1 hora) o link leva ao Painel.

### Mensagem sempre igual

A tela responde **a mesma frase** para e-mail com conta e sem conta: "Se o e-mail estiver
cadastrado, você receberá um link em instantes." Assim, ninguém usa a tela para descobrir quem tem
conta.

---

## 2. Sessão e renovação

Depois do login, o navegador guarda uma **sessão**: um "crachá" digital com validade curta. Dois
detalhes importantes:

- **Renovação.** O crachá é trocado por um novo automaticamente, em segundo plano. O
  `authStore` "escuta" esses eventos (`onAuthStateChange`) e, a cada renovação, **lê o perfil de
  novo**.
- **Suspensão ao vivo.** Se a CGOV suspende alguém que está logado (`ativo = false`), na próxima
  renovação, ou quando a janela volta ao foco, o perfil é relido e a pessoa é levada a
  `/acesso-nao-liberado`.

A `authStore` guarda uma **situação** (`carregando`, `anonimo`, `sem_perfil`, `inativo`, `ativo`,
`erro`). É ela que as telas e o guarda consultam. Conta sem perfil ("Sua conta ainda não tem
acesso") e perfil suspenso ("Seu acesso está suspenso") são casos diferentes, por isso há duas
mensagens.

O endereço pedido antes do login fica em `localStorage` (chave `radar.volta-apos-login`), junto com
a hora em que foi guardado: o link do e-mail abre numa **aba nova**, e o `sessionStorage` não
atravessa abas. Só vale por 1 hora (o prazo do link) e é apagado depois de usado. Ele só é
aceito se começar com `/` (função `voltaSegura`, em `src/router/guarda.ts`). Sem isso, um link
malicioso poderia levar a pessoa a um site falso logo depois do login.

---

## 3. Guarda de rota, menu e RLS: quem protege de verdade?

Esta é a ideia mais importante da aula.

| Camada | Arquivo | Para que serve | É segurança? |
| --- | --- | --- | --- |
| **Menu** | `src/components/govbr/BrMenu.vue` | Mostrar só o que a pessoa pode usar | **Não.** É conforto. |
| **Guarda de rota** | `src/router/guarda.ts` | Levar quem não pode ao lugar certo (entrar, acesso-nao-liberado, Painel com aviso) | **Não.** Também é conforto. |
| **RLS no banco** | `supabase/migrations/` | Negar a leitura e a escrita de linhas | **Sim.** É a única que conta. |

### Por que o menu não é segurança

Tudo que roda no navegador está **nas mãos de quem usa**. Uma pessoa curiosa pode editar a página,
digitar o endereço direto ou chamar a API sem passar pela tela. Esconder o botão "Usuários e perfis"
não impede ninguém de tentar. O que impede é o banco: a **RLS** recusa o dado, não importa por onde o
pedido chegou (Aula 2).

Por isso a tabela "quem vê qual tela" existe em **um lugar só**, `src/utils/acessoPorPerfil.ts`
(funções puras e testadas), lida pelo guarda, pelo menu e pelos botões. Ela espelha a tabela da seção
7 de [[matriz-acesso-responsabilidades]].

### Exemplo prático

Um perfil `gestor` não vê "Importar riscos" nem "Usuários e perfis" no menu. Se digitar `/usuarios`
na barra de endereço:

1. o guarda (`decidirNavegacao`) vê que `podeAbrirRota('gestor', 'usuarios-perfis')` é falso e leva ao
   Painel com o aviso "Esta tela é exclusiva da CGOV.";
2. mesmo que ele burlasse o guarda, o banco só devolve a ele as linhas do alcance dele; e a Edge
   Function `gerenciar-acesso` responde 403, porque confere no servidor se quem chamou é CGOV.

Resumo: **o front-end organiza a casa; o banco e o servidor trancam a porta.**

### A chave `service_role`

É a chave "mestra" do Supabase: ignora a RLS. Por isso ela **nunca** aparece em `src/` nem em variável
`VITE_*` (tudo que começa com `VITE_` vai para o navegador). Quem a usa são só os scripts
(`scripts/compartilhado/clienteServico.ts`) e a Edge Function, que rodam em servidor.

---

## 4. Os dois modos

O arquivo `src/services/supabase.ts` só cria o cliente do Supabase se existirem as duas variáveis do
`.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, a chave **anon**, pública).

| | Modo demonstração (sem `.env`) | Modo real (com `.env`) |
| --- | --- | --- |
| Login | Não existe; faixa "Modo demonstração: dados fictícios, sem login" | Link por e-mail |
| Perfil | Simulador "Ver como" com os 10 perfis | O perfil da pessoa, lido do banco |
| Dados | Fictícios, no navegador | (B3) do banco, com a RLS |
| Uso | Apresentações offline e varredura de acessibilidade | Homologação e uso real |

Por que dois modos? Para a varredura de acessibilidade (`npm run test:a11y`) e as apresentações
funcionarem **sem Docker**. O guarda e o menu têm um caminho para cada modo.

### Teste você mesmo

1. Sem `.env`, rode `npm run dev`: aparece a faixa de demonstração e o seletor "Ver como". Escolha
   `gestor` e veja o menu perder "Importar riscos".
2. Com o Supabase local e o `.env` preenchido (passo a passo em [[guia-supabase-local]], seção 8),
   entre com `cgov@radar.test` pelo Mailpit e abra "Usuários e perfis".
3. Rode `npm run test:integracao` para ver o teste que prova que e-mail desconhecido não cria conta.

### Para ler no código

- `src/stores/authStore.ts`: modos, situação, `enviarLink`, `concluirRetorno`, `sair`.
- `src/router/guarda.ts`: a função `decidirNavegacao`, pura e testada em `tests/unit/guardaRotas.spec.ts`.
- `src/utils/acessoPorPerfil.ts`: a tabela de acesso, testada em `tests/unit/acessoPorPerfil.spec.ts`.
- `supabase/functions/gerenciar-acesso/index.ts`: a Edge Function dos convites.
