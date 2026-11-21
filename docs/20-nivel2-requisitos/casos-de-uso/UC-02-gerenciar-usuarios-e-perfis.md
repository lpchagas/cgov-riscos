# UC-02 — Gerenciar usuários e perfis

> Origem: etapa b2, decisões P6, B2-4, P-B2-1 e P-B2-2 ([[matriz-acesso-responsabilidades]] §5 e §7, linha "Usuários e perfis"; [[decisoes-tecnicas-b2]]) · RF: RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-153 · RN: RN-030, RN-031, RN-032, RN-095, RN-100 · Situação: implementado

## Título

Gerenciar usuários e perfis.

## Ator principal

CGOV (perfil `cgov`), como responsável por cadastrar as contas e atribuir perfil e unidade.

## Pré-condições

- O servidor da CGOV entrou no RADAR com perfil `cgov` ativo ([[UC-01-entrar-por-link-de-email]]).
- A árvore de unidades está carregada ([[UC-03-sincronizar-estrutura-e-cadeia-de-valor]]).

## Pós-condições

- Ninguém além da CGOV cria conta ou muda perfil, unidade, situação ou chave de titular (RN-030).
- Cada pessoa continua com um único perfil, ligado a uma única unidade (RN-031).
- A matrícula e o CPF não são gravados (RN-100).
- Toda mudança de perfil fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. A CGOV pede a lista das contas, com a situação de cada uma.
2. O sistema mostra as contas e a situação: pendente, convite enviado, já entrou ou suspensa.
3. A CGOV informa nome, e-mail, unidade e perfil de uma pessoa nova.
4. O sistema confere que quem pede é da CGOV (RN-030) e cria a conta com um único perfil, numa única unidade (RN-031).
5. A CGOV indica se a pessoa é titular da unidade ou substituto em exercício com a chave de titular (RN-032).
6. O sistema grava a chave de titular e registra a mudança na trilha de auditoria (RN-095).
7. A CGOV escolhe uma ou várias contas e pede o envio do convite de acesso.
8. O sistema envia o link de acesso a cada conta escolhida e mostra quais receberam e quais falharam.

## Fluxos alternativos e de exceção

- 1a. Carga inicial pela lista de titulares e substitutos: a CGOV (técnico) roda o comando `sync:atribuicoes`; o sistema cria as contas e os perfis, dá a cada pessoa um único perfil (primeiro onde é titular, depois onde é substituto; entre titularidades, a de maior alcance) e descarta a matrícula (RN-031, RN-100). Segue no passo 7.
- 1b. A lista de atribuições indica outro titular para uma unidade: o sistema desliga a chave de titular do antigo titular, sem apagar o perfil dele (RN-032).
- 4a. Quem pede não é da CGOV: o sistema recusa o pedido e não grava nada (RN-030).
- 4b. Já existe conta com o mesmo e-mail: o sistema recusa e avisa; nenhuma conta é criada.
- 4c. Falta o nome, a unidade, o perfil, ou o e-mail é inválido: o sistema recusa e diz o que falta.
- 5a. A unidade já tem titular: o sistema avisa quem é o titular atual e sugere o perfil do cargo, sem trocá-lo sozinho. A CGOV pode pedir que a chave do titular anterior seja tirada; o sistema grava primeiro a pessoa nova e só depois tira a chave do anterior.
- 5a.1. A gravação da pessoa nova falha: a chave do anterior não é tirada.
- 5a.2. A gravação da pessoa nova passa, mas a retirada da chave do anterior falha: as duas pessoas ficam como titulares da unidade. O sistema mostra o erro e recarrega a lista, que passa a exibir os dois titulares; a CGOV tira a chave do anterior à mão, editando o perfil dele. Enquanto isso, o titular anterior continua podendo validar e homologar pela unidade (as duas gravações não são uma operação única no banco; não tratado pelo sistema).
- 6a. A CGOV altera o perfil, a unidade ou a situação (ativa ou suspensa) de uma conta existente: o sistema grava e registra na trilha (RN-030, RN-095). A conta suspensa perde o acesso na renovação da sessão (UC-01, 5b).
- 8a. Parte dos convites falha (por exemplo, a conta foi apagada): o sistema mostra o resultado parcial, com o motivo de cada falha; os enviados não são reenviados.

## Pós-condição de sucesso

- A conta existe com um único perfil e uma única unidade, a chave de titular está correta, e o convite foi enviado; a mudança está na trilha de auditoria.
