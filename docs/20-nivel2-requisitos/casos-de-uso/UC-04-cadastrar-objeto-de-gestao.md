# UC-04 — Cadastrar objeto de gestão de riscos

> Origem: F1.01 (o objeto é a entrada do contexto, Metodologia 4.1); [[matriz-acesso-responsabilidades]] §5 (perfil `cgov`: "mantém o catálogo de objetos") e §7, linha "Objetos de gestão"; decisões P-B1-2, P-B1-3 e P-B1-6 · RF: RF-022, RF-023, RF-024, RF-025, RF-026, RF-027, RF-028, RF-029 · RN: RN-034, RN-035, RN-036, RN-105, RN-050, RN-095 · Situação: implementado

## Título

Cadastrar objeto de gestão de riscos.

## Ator principal

**CGOV** (perfil `cgov`), que mantém o catálogo de objetos.

Por que a CGOV, e não o gestor de riscos da tabela do plano: as minutas não dizem quem seleciona os objetos (o alerta LS-04, aberto, registra que "ninguém inicia o ciclo nem seleciona os objetos"; F1.01 só recebe o objeto como entrada). Na falta de regra na norma, vale a decisão da CGOV na [[matriz-acesso-responsabilidades]]: o catálogo é da CGOV (§5 e §7, "E (catálogo)" só na coluna CGOV; os demais perfis só veem). O gestor de riscos usa o objeto ao registrar o risco ([[UC-05-identificar-e-registrar-risco]]) e pode editá-lo depois de criado, porque o objeto é da unidade. A divergência entre a tela e o banco fica registrada na exceção 1b (nota 1 de [[requisitos-funcionais]]).

## Pré-condições

- A CGOV entrou no RADAR com perfil `cgov` ativo.
- A unidade responsável e, se houver, o processo da Cadeia de Valor estão carregados ([[UC-03-sincronizar-estrutura-e-cadeia-de-valor]]).

## Pós-condições

- Nenhum objeto fica em unidade inativa nem ligado a processo inativo por este caso de uso (RN-034, RN-035).
- Toda inclusão ou alteração de objeto fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. A CGOV informa o nome e o tipo do objeto (processo, projeto ou unidade), a unidade responsável e o objetivo associado.
2. O sistema oferece e aceita só unidades ativas (RN-034).
3. A CGOV liga o objeto a um processo da Cadeia de Valor.
4. O sistema oferece e aceita só processos ativos (RN-035).
5. O sistema preenche o supervisor do macroprocesso a partir da unidade supervisora do processo, sem deixar editá-lo (RN-036).
6. O sistema grava o objeto no catálogo e registra a inclusão na trilha de auditoria (RN-095).

## Fluxos alternativos e de exceção

- 1a. A unidade escolhida está inativa: o sistema não a oferece e o banco recusa a gravação (RN-034).
- 1b. **Divergência tela × banco.** Um gestor de riscos (perfil sem acesso ao catálogo) tenta cadastrar objeto: o sistema não lhe oferece o cadastro (Matriz §7). O banco, porém, aceita que a unidade crie objeto na própria unidade (`supabase/tests/041`, bloco 5) e recusa em outra unidade. A diferença não é corrigida aqui: fica para a CGOV decidir se o banco passa a seguir a Matriz ou se a Matriz passa a permitir o cadastro pela unidade (nota 1 de [[requisitos-funcionais]]; cartão "Decidir quem cadastra objeto de gestão de riscos" no Kanban).
- 3a. O objeto não tem processo da Cadeia de Valor: o supervisor fica vazio e só a CGOV pode preenchê-lo (RN-036).
- 4a. O processo ligado fica inativo depois: o objeto mantém o vínculo (histórico) e recebe o selo de processo inativo; a troca de processo só aceita processo ativo (RN-035).
- 5a. A unidade supervisora do processo muda: o banco atualiza o supervisor dos objetos ligados a ele (RN-036).
- 6a. Depois de criado, o objeto passa a ser da unidade: a CGOV não o edita mais; o gestor da unidade, sim (`041`, bloco 4).
- 6b. A unidade do objeto fica inativa: o objeto recebe o selo de unidade inativa, e só a CGOV pode movê-lo para uma unidade ativa (RN-105).
- 6c. Alguém tenta excluir objeto que tem risco aprovado: o sistema recusa (RN-050).

## Pós-condição de sucesso

- O objeto está no catálogo, ligado a uma unidade ativa e, quando houver, a um processo ativo, com o supervisor preenchido pelo banco; a inclusão está na trilha de auditoria.
