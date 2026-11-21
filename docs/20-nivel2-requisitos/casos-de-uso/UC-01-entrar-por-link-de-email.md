# UC-01 — Entrar no RADAR por link de e-mail

> Origem: etapa b2, decisão P6 da CGOV ([[matriz-acesso-responsabilidades]] §5 e §7, linha "Entrar"); o ADR do login por link ainda não está em `docs/adr/` · RF: RF-001, RF-002, RF-003, RF-012, RF-015 · RN: RN-021, RN-022, RN-023, RN-024, RN-025, RN-026, RN-030, RN-033 · Situação: implementado

## Título

Entrar no RADAR por link de e-mail.

## Ator principal

Servidor convidado: pessoa a quem a CGOV já cadastrou uma conta, com perfil e unidade (UC-02).

## Pré-condições

- A CGOV cadastrou a conta do servidor, com perfil e unidade ([[UC-02-gerenciar-usuarios-e-perfis]]).
- O servidor tem acesso à caixa do e-mail cadastrado.

## Pós-condições

- Nenhuma conta nova é criada pelo pedido de link (RN-030).
- A resposta ao pedido não revela se o e-mail tem conta.
- Sem perfil ativo, o servidor não lê nem grava nenhum dado de risco (RN-026).

## Fluxo principal de sucesso

1. O servidor pede o link de acesso, informando o seu e-mail.
2. O sistema responde com a mesma mensagem, exista ou não a conta, e envia o link só para o e-mail de conta já cadastrada (RN-030).
3. O servidor abre o link recebido no e-mail.
4. O sistema abre a sessão e lê o perfil e a unidade da conta.
5. O sistema confere que o perfil está ativo (RN-026).
6. O sistema leva o servidor ao endereço que ele tinha pedido antes de entrar ou, se não havia, à visão geral inicial.
7. O sistema mostra ao servidor só as funções e os dados do alcance do seu perfil (RN-021 a RN-025).

## Fluxos alternativos e de exceção

- 1a. O servidor tenta abrir um endereço do sistema sem ter entrado: o sistema guarda o endereço pedido e o leva ao pedido de link (passo 1); depois do passo 5, volta a esse endereço.
- 2a. O e-mail não tem conta: o sistema mostra a mesma mensagem do passo 2, não cria conta e não envia nada (RN-030). O caso de uso termina.
- 3a. O link já foi usado ou venceu: o sistema não abre a sessão e avisa que o link expirou ou já foi usado; o servidor pede outro (volta ao passo 1).
- 5a. A conta não tem perfil ou o perfil está suspenso: o sistema informa que o acesso não foi liberado e não mostra nenhum dado (RN-026). O servidor procura a CGOV.
- 5b. A CGOV suspende o perfil depois que o servidor entrou: na renovação da sessão, o sistema relê o perfil e passa a barrar o acesso, como no 5a.
- 7a. O servidor pede uma função que o seu perfil não pode abrir (por exemplo, importar riscos ou gerenciar usuários, só da CGOV): o sistema o leva à visão geral inicial e avisa que a função é exclusiva da CGOV (RN-030, RN-033).

## Pós-condição de sucesso

- O servidor está com a sessão aberta e vê só as funções e os dados do alcance do seu perfil.
