# UC-03 — Sincronizar estrutura organizacional e Cadeia de Valor

> Origem: etapa b1, decisões P1b, P-B1-2 e R9 ([[decisoes-tecnicas-b1]]); [[ERS-radar]] §6.5 (listas do SharePoint) · RF: RF-016, RF-017, RF-018, RF-019, RF-020, RF-190, RF-021 · RN: RN-021, RN-022, RN-024, RN-034, RN-035, RN-036, RN-105 · Situação: implementado

## Título

Sincronizar estrutura organizacional e Cadeia de Valor.

## Ator principal

CGOV (técnico): quem roda o comando `sync:estrutura` com as listas exportadas do SharePoint (estrutura das unidades e processos da Cadeia de Valor).

## Pré-condições

- As duas listas do SharePoint (estrutura e Cadeia de Valor) foram exportadas em CSV.
- O técnico tem acesso ao banco de destino (local, ou na nuvem com autorização expressa a cada passo, conforme o `AGENTS.md`).

## Pós-condições

- A carga é gravada por inteiro ou não é gravada (RF-018): o banco nunca fica com metade da estrutura.
- Nenhuma unidade é apagada: a que sai da lista é desativada (RN-034).

## Fluxo principal de sucesso

1. O técnico indica a pasta das listas e pede a sincronização.
2. O sistema lê as listas e monta a árvore de unidades (a unidade mãe de cada uma), que define o alcance de leitura (RN-021).
3. O sistema lê o vínculo de cada unidade com a sua Coordenação Territorial (RN-022).
4. O sistema lê os processos da Cadeia de Valor, com a unidade líder e a unidade supervisora de cada um (RN-024, RN-036).
5. O sistema compara com o banco e mostra o relatório do que muda: unidades novas, desativadas, renomeadas e que mudaram de mãe, e os processos.
6. O técnico confere o relatório e confirma a gravação.
7. O sistema grava tudo numa só operação e desativa, sem apagar, as unidades marcadas como inativas ou ausentes da lista (RN-034).

## Fluxos alternativos e de exceção

- 1a. O técnico pede só o relatório: o sistema faz os passos 2 a 5 e não grava nada. O caso de uso termina.
- 3a. O vínculo aponta para unidade que não é Coordenação Territorial, ou que não existe: o banco recusa o vínculo (RN-022) e, como a carga é única, nada é gravado.
- 6a. O técnico não confirma: nada é gravado.
- 7a. Um passo da gravação falha: nada do que veio antes fica gravado (RF-018).
- 7b. Uma unidade com objetos de gestão é desativada: os objetos continuam, com o selo de unidade inativa; só a CGOV pode movê-los para unidade ativa (RN-105, [[UC-04-cadastrar-objeto-de-gestao]]).
- 7c. Um processo da Cadeia de Valor fica inativo: os objetos já ligados a ele mantêm o vínculo (histórico), mas nenhum objeto novo pode ser ligado a ele (RN-035).
- 7d. Gravação em banco que não é o local sem a opção que a permite: o sistema recusa a gravação automática.

## Pós-condição de sucesso

- A árvore de unidades, os vínculos com as Coordenações Territoriais e os processos da Cadeia de Valor do banco correspondem às listas; as unidades que saíram estão desativadas, sem perda de histórico.
