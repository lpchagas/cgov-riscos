# Requisitos funcionais do RADAR (RF)

Um **requisito funcional** (`RF-NNN`) diz **o que o sistema deve fazer**: "O sistema deve…". Ele é
diferente da **regra de negócio** ([[regras-negocio]], `RN-NNN`), que vale com ou sem sistema e não fala
de tela ("o risco residual deve ser…"). Exemplo: a RN-004 diz que controle sem evidência não passa de
Fraco; o RF-044 diz que o **sistema** aplica essa trava no cálculo. Cada linha traz **um** "deve"
(requisito singular, ISO/IEC/IEEE 29148:2018), escrito sem histórias de usuário. Casos de uso
(`casos-de-uso/`), [[rastreabilidade]] e backlog citam estes requisitos pelo ID.

**Como ler a tabela.** As colunas são sempre `ID | Enunciado | Prioridade | RN relacionadas | Origem |
Situação | Verificação`. Os títulos são curtos porque o teste da documentação reconhece o catálogo pelos
nomes exatos "ID", "Enunciado" e "Origem":

- **Enunciado:** começa sempre por "O sistema deve…".
- **Prioridade (MoSCoW)**, decidida nesta ordem: **Must** quando o requisito já está implementado e é
  usado no piloto (inclusive o parcial cuja parte feita já é usada), ou quando cumpre o que pede uma lacuna de severidade "bloqueia homologação" (LAC-03,
  LAC-08, LAC-12, LAC-13, LAC-14 e LAC-15; a severidade vale para a lacuna inteira, inclusive a parte de
  omissão), ou quando a norma saneada o exige sem lacuna aberta; **Should** quando cumpre o que pede uma
  lacuna "importante" (LAC-01, LAC-02, LAC-04 a LAC-07, LAC-09 a LAC-11: o RADAR é omisso e a tarefa pode
  ser feita fora dele no piloto), pendência registrada à espera de decisão da CGOV, ou divergência do
  "Contrato com o Importar" que grava **em silêncio** um valor diferente do que a skill entregou, descarta uma linha ou deixa de
  cobrar uma regra; **Could**
  quando é melhoria ou conforto, inclusive o RF que só acrescenta automação a uma lacuna sem ser exigido
  por ela (RF-110) e a proposta ainda sem decisão (RF-187); **Won't** quando fica fora deste ciclo (a
  célula diz por quê). Quando o RF cita lacunas de severidades diferentes, vale a mais alta.
- **Sem lacuna:** as divergências do importador (módulo 14) que não estão numa LAC citam o "Contrato com o
  Importar" e o cartão do Backlog "Importador: recusas e conversões silenciosas" ([[quadro]]).
- **RN relacionadas:** IDs do [[regras-negocio]]; "—" quando nenhuma regra se aplica.
- **Origem:** de onde vem o requisito. `Fn.NN` é a atividade de um fluxo ([[F1-ciclo-gestao-riscos]],
  [[F2-avaliacao-tratamento]], [[F3-aprovacao-dar-plano]], [[F4-monitoramento-relato-avaliacao]],
  [[FS-01-validacao-interna-risco]], [[FS-02-analise-ato-por-skills]]); "Matriz §7, linha X" é a linha da
  tabela telas × perfis da [[matriz-acesso-responsabilidades]]; `LAC-NN` é a lacuna do
  [[lacunas-norma-sistema]]; P1 a P8, P-B1-n, D1, D2, B11-n, B3-n, R9 e R18 são decisões da CGOV
  ([[matriz-acesso-responsabilidades]] §9, [[decisoes-tecnicas-b1]], [[decisoes-tecnicas-b2]],
  [[decisoes-tecnicas-b3]]); "Contrato, col. N" é a coluna N da seção "Contrato com o Importar" do FS-02.
- **Situação:** **implementado** só com um teste citado; **parcial** diz o que falta (na célula ou em
  nota numerada abaixo da tabela); **não iniciado** cita a lacuna ou a pendência. Na citação do teste,
  `000` a `082` são os arquivos pgTAP de `supabase/tests/`, com o bloco ("bl."); `*.spec.ts` ficam em
  `tests/unit/`, salvo os marcados `integracao/` (em `tests/integracao/`). Conferido no código em
  21/11/2026.
- **Verificação:** uma letra, como na [[ERS-radar]] §8: **I** (inspeção), **A** (análise), **D**
  (demonstração) ou **T** (teste automatizado). Requisito implementado com teste automatizado é sempre T.

Abreviações: du = dias úteis; CIG = Comitê Interno de Governança; CTGRIC = Comitê Técnico de Governança
de Riscos, Integridade e Controles; DAR = Declaração de Apetite a Riscos; KRI = Indicador-Chave de Risco.
"Risco crítico" é sempre o de residual **fora do apetite da DAR**, nunca uma faixa do Quadro 8. Os módulos
são os da [[ERS-radar]] §6.2; a carga da estrutura e das atribuições, que a ERS põe em "Importação", fica
aqui em Estrutura e em Acesso, junto dos casos de uso UC-02 e UC-03.

## 1. Acesso

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | O sistema deve permitir a entrada somente por link de acesso enviado ao e-mail de uma conta já cadastrada, sem senha. | Must | RN-026, RN-030 | Matriz §7, linha "Entrar"; decisão P6; UC-01 | implementado — `integracao/login.spec.ts` "para `gestor.uc@radar.test`, o Mailpit recebe o link de acesso"; `telasAcesso.spec.ts` "EntrarRetornoView" | T |
| RF-002 | O sistema deve responder ao pedido de link com a mesma mensagem, exista ou não a conta, sem criar conta nova. | Must | RN-030 | Matriz §7, linha "Entrar"; decisão P6 | implementado — `telasAcesso.spec.ts` "enviar mostra a resposta única, sem revelar se o e-mail existe"; `integracao/login.spec.ts` "para ninguem…, nenhuma conta é criada e o Mailpit não recebe nada" | T |
| RF-003 | O sistema deve barrar, com a tela "Acesso não liberado", a conta sem perfil ou com perfil suspenso. | Must | RN-026 | Matriz §7 (legenda "—"); decisão P6 | implementado — `authStoreReal.spec.ts` "sessão sem perfil e sem linha própria: sem_perfil" e "TOKEN_REFRESHED relê o perfil: quem foi suspenso vira inativo"; `telasAcesso.spec.ts` "AcessoNaoLiberadoView" | T |
| RF-004 | O sistema deve permitir que só a CGOV cadastre conta, com nome, e-mail, unidade e perfil. | Must | RN-030, RN-031 | Matriz §7, linha "Usuários e perfis" (CGOV E); decisão P6; UC-02 | implementado — `integracao/gerenciarAcesso.spec.ts` "a CGOV cria a conta (201)…" e "`gestor.uc@radar.test` recebe 403"; `usuariosPerfisPagina.spec.ts` "cadastrar: gerência regional pré-seleciona o perfil…" | T |
| RF-005 | O sistema deve permitir que só a CGOV altere o perfil, a unidade, a situação (ativa ou suspensa) e a chave de titular de uma conta. | Must | RN-030, RN-031, RN-032 | Matriz §7, linha "Usuários e perfis"; decisão P6; UC-02 | implementado — `041` bl. 9; `usuariosPerfisPagina.spec.ts` "editar: ligar Titular em unidade com titular avisa e grava os dois…" | T |
| RF-006 | O sistema deve permitir à CGOV enviar o convite de acesso a várias contas de uma vez. | Must | RN-030 | Matriz §7, linha "Usuários e perfis"; decisão P6; UC-02 | implementado — `integracao/gerenciarAcesso.spec.ts` "um lote de 35 contas recebe o link de uma vez"; `usuariosPerfisPagina.spec.ts` "convites em lote: confirma e mostra o resultado parcial com as falhas" | T |
| RF-007 | O sistema deve mostrar à CGOV a situação de cada conta: pendente, convite enviado, já entrou ou suspensa. | Must | RN-030 | Matriz §7, linha "Usuários e perfis"; UC-02 | implementado — `situacaoConta.spec.ts` "suspenso vence tudo" e seguintes; `integracao/gerenciarAcesso.spec.ts` "listar_situacao traz convite_enviado_em preenchido" | T |
| RF-008 | O sistema deve criar as contas e os perfis a partir da lista de titulares e substitutos das unidades (comando `sync:atribuicoes`). | Must | RN-030, RN-031 | Decisões P6, B2-4 e P-B2-1 ([[decisoes-tecnicas-b2]]); UC-02 | implementado — `integracao/syncAtribuicoes.spec.ts` "aplicar cria as contas com os papéis certos" | T |
| RF-009 | O sistema deve dar a cada pessoa um único perfil na carga das atribuições, preferindo a unidade em que ela é titular à de substituto e, entre titularidades, a de maior alcance. | Must | RN-031 | Decisão B2-4 e ordem de desempate confirmada ([[decisoes-tecnicas-b2]]) | implementado — `syncAtribuicoes.spec.ts` "regra 3: pessoa em várias unidades escolhe titular antes de substituto" e "regra 3: entre dois titulares, vence o de maior alcance" | T |
| RF-010 | O sistema deve desligar a chave de titular do antigo titular quando a lista indicar outro, sem apagar o perfil. | Must | RN-032 | Regra 6 do importador (T9, P-B2-1 e P-B2-2, [[decisoes-tecnicas-b2]]) | implementado — `syncAtribuicoes.spec.ts` "regra 6: troca de titular desliga a chave do antigo, sem apagar o perfil"; `integracao/syncAtribuicoes.spec.ts` "trocar o titular da GR3…" | T |
| RF-011 | O sistema deve descartar a matrícula dos servidores ao ler a lista de atribuições. | Must | RN-100 | `AGENTS.md` (dados pessoais; regras do piloto) | implementado — `syncAtribuicoes.spec.ts` "nunca copia matrícula" | T |
| RF-012 | O sistema deve mostrar a cada pessoa só os riscos, os objetos e os registros filhos das unidades do alcance do seu perfil. | Must | RN-021, RN-022, RN-023, RN-024, RN-025, RN-026 | Matriz §7 (colunas V, V\* e E+); decisões P1, P1b, P2, P3 e P8 | implementado — `030` bl. 2 a 12; `040` bl. 2, 3 e 5; `integracao/fonteSupabaseLeitura.spec.ts` "gestor.uc@ vê só os riscos do alcance" | T |
| RF-013 | O sistema deve permitir gravar fichas de risco, controles, tratamentos, KRIs e medições só na própria unidade de quem grava. | Must | RN-027, RN-028 | Matriz §7 (legenda E e E+); Política art. 17, § 1º | implementado — `041` bl. 1, 2 e 6 | T |
| RF-014 | O sistema deve impedir a AUDIT de gravar fora dos objetos da própria AUDIT. | Must | RN-029 | Matriz §7 (nota "AUDIT nunca edita riscos de outras unidades"); decisão P3 | implementado — `041` bl. 3; `acessoPorPerfil.spec.ts` "AUDIT é somente leitura fora da unidade" | T |
| RF-015 | O sistema deve esconder do menu e bloquear a rota de cada tela que o perfil não pode abrir. | Must | RN-030, RN-033 | Matriz §7 (legenda "—") e §8, item 6 | implementado — `guardaRotas.spec.ts` "ativo + gestor em importar-skill: Painel com o aviso 'exclusiva da CGOV'"; `shellPorPerfil.spec.ts` "gestor não vê 'Importar riscos' nem 'Usuários e perfis'…" | T |

## 2. Estrutura

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-016 | O sistema deve montar a árvore de unidades (unidade mãe de cada unidade) a partir da lista de estrutura do SharePoint (comando `sync:estrutura`). | Must | RN-021 | UC-03 (etapa B1); [[ERS-radar]] §6.5 (listas do SharePoint) | implementado — `syncEstrutura.spec.ts` "montarArvore — árvore de unidades"; `015` (a) | T |
| RF-017 | O sistema deve mostrar, antes de gravar a estrutura, o relatório do que muda: unidades novas, desativadas, renomeadas e que mudaram de mãe. | Must | — | UC-03 (etapa B1) | implementado — `syncEstrutura.spec.ts` "compararComBanco — relatório do que muda" | T |
| RF-018 | O sistema deve gravar a carga da estrutura por inteiro ou não gravar nada dela. | Must | — | UC-03 (etapa B1) | implementado — `015` (b) "se um passo posterior falhar, NADA do que veio antes fica gravado" | T |
| RF-019 | O sistema deve desativar, sem apagar, a unidade marcada como inativa ou ausente da lista. | Must | RN-034, RN-105 | UC-03; decisão P-B1-2 | implementado — `syncEstrutura.spec.ts` "status = 'Inativo' → aparece em desativadas" e "unidade que sumiu da lista → aparece em desativadas" | T |
| RF-020 | O sistema deve gravar o vínculo da unidade com a sua Coordenação Territorial. | Must | RN-022 | Decisões R9 ([[decisoes-tecnicas-b1]]) e P2 | implementado — `016` (a); `syncEstrutura.spec.ts` "microgrupo 'CT Teste' → vínculo com a CT Teste (a mãe continua a GR9)" | T |
| RF-190 | O sistema deve recusar o vínculo de uma unidade com outra que não seja Coordenação Territorial ou que não exista. | Must | RN-022 | Decisão R9 ([[decisoes-tecnicas-b1]]) | implementado — `016` (b) e (c) | T |
| RF-021 | O sistema deve carregar os processos da Cadeia de Valor com a unidade líder e a unidade supervisora de cada um. | Must | RN-024, RN-036 | UC-03; decisão P1b | implementado — `syncEstrutura.spec.ts` "converterProcessos — cadeia de valor"; `015` (a) | T |

## 3. Objetos

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-022 | O sistema deve permitir à CGOV cadastrar objeto de gestão de riscos no catálogo, ligado a uma unidade. | Must | RN-034 | Matriz §7, linha "Objetos de gestão" (CGOV E, catálogo); F1.01 (entrada); UC-04 | implementado — `objetosPagina.spec.ts` "cadastro: nome obrigatório; com nome, cria o objeto" e "quem não é CGOV não cadastra objeto nem reatribui" (nota 1) | T |
| RF-023 | O sistema deve recusar a criação de objeto em unidade inativa. | Must | RN-034 | Decisão P-B1-2 | implementado — `071` bl. 1; `objetosPagina.spec.ts` "o seletor de unidade não oferece unidade inativa" | T |
| RF-024 | O sistema deve permitir só à CGOV mover objeto de unidade inativa para unidade ativa. | Must | RN-105 | Decisão P-B1-2 | implementado — `objetosPagina.spec.ts` "reatribuir sem escolher a unidade não confirma; com unidade ativa, grava"; `integracao/fonteSupabaseGravacao.spec.ts` "reatribuirObjeto por gestor.uc@ → ErroRadar 'permissao'" | T |
| RF-025 | O sistema deve ligar o objeto só a processo ativo da Cadeia de Valor. | Must | RN-035 | Decisão P-B1-3 | implementado — `071` bl. 2; `objetosPagina.spec.ts` "o seletor de processo só oferece processo ativo" | T |
| RF-026 | O sistema deve preencher o supervisor do macroprocesso do objeto a partir do processo ligado, sem deixar editá-lo. | Must | RN-036 | Decisões P-B1-3 e P-B1-6 | implementado — `071` bl. 2 e 5; `objetosPagina.spec.ts` "com processo escolhido, o supervisor vira texto (nenhum select de supervisor)" | T |
| RF-027 | O sistema deve permitir só à CGOV definir o supervisor do objeto que não tem processo ligado. | Must | RN-036 | Decisão P-B1-6 | implementado — `071` bl. 3; `integracao/fonteSupabaseGravacao.spec.ts` "salvarObjeto: com processo o banco preenche o supervisor; sem processo, só a CGOV o define" | T |
| RF-028 | O sistema deve marcar com selo o objeto de unidade inativa e o objeto ligado a processo inativo. | Must | RN-034, RN-035 | Decisões P-B1-2 e P-B1-3 | implementado — `objetosPagina.spec.ts` "selos de inativo e 'Reatribuir objeto' só no objeto de unidade inativa"; `conversores.spec.ts` "objeto ligado a processo inativo e unidade inativa" | T |
| RF-029 | O sistema deve recusar a exclusão do objeto que tenha risco aprovado. | Must | RN-050 | Decisão D2 | implementado — `050` bl. 8b "apagar o objeto de um risco aprovado também é recusado (cascata)" | T |

**Nota 1.** A tela só oferece o cadastro à CGOV, como manda a Matriz §7; o banco, porém, também deixa a unidade
   criar objeto na própria unidade (`041` bl. 5). O UC-04 (Tarefa 12) escolheu a CGOV como ator, pela Matriz §5 e §7; a
   divergência com o banco (`041` bl. 5) fica para a CGOV decidir (cartão no Backlog do [[quadro]]).

## 4. Riscos

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-030 | O sistema deve registrar o risco num objeto de gestão, com causa, evento de risco, consequência e objetivo afetado. | Must | RN-014 | F1.01; Matriz §7, linha "Novo risco" (E para todos) | implementado — `novoRiscoPagina.spec.ts` "etapa 1 exige os 4 elementos do Bow Tie e o objeto" | T |
| RF-031 | O sistema deve montar a descrição do risco na sintaxe do item 4.2.1 da Metodologia. | Must | RN-014 | F1.01 | implementado — `calculadoraRiscoRadar.spec.ts` "gera a sintaxe obrigatória da seção 4.2.1 da Metodologia"; `020` bl. 10 | T |
| RF-032 | O sistema deve oferecer como categoria do risco somente as 8 categorias do Quadro 2, uma por risco. | Must | RN-015 | F1.01; LAC-14 | implementado — o banco tem as 8 categorias do Quadro 2 com as descrições literais (migração `20261122001`), recusa nome fora delas (`CHECK`) e a tela lê a mesma lista (`CATEGORIAS_OFICIAIS_QUADRO_2`); nenhuma conversão automática ([[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]; LAC-14). Falta aplicar a migração na nuvem do piloto (Fase 2, **[AUTORIZAÇÃO]**) | T |
| RF-033 | O sistema deve recusar a categoria mista que junta Operacional e Integridade. | Must | RN-016 | F1.01; `AGENTS.md`, regra 5 | implementado — `calculadoraRiscoRadar.spec.ts` "valida as regras do Programa Integra+ (Portaria 253/2026) e proíbe categoria mista" | T |
| RF-034 | O sistema deve aplicar a todo risco o Teste de Integridade, perguntando se o objeto envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação. | Must | RN-006 | F1.01; `AGENTS.md`, regra 5; Portaria ICMBio nº 253/2026 | implementado — `calculadoraRiscoRadar.spec.ts` "valida as regras do Programa Integra+…"; `novoRiscoPagina.spec.ts` "decide sobre terceiros e não é Integridade → exige justificativa (Integra+)" | T |
| RF-035 | O sistema deve exigir justificativa de pelo menos 10 caracteres quando o Teste de Integridade se aplicar e o risco não for da categoria Integridade. | Must | RN-018 | F1.01; `AGENTS.md`, regra 5 | parcial — a regra está em `calculadoraRiscoRadar.ts` e `formularioRisco.ts`, e `novoRiscoPagina.spec.ts` "decide sobre terceiros e não é Integridade → exige justificativa (Integra+)" cobre o texto vazio; falta teste na fronteira (9 e 10 caracteres) | T |
| RF-036 | O sistema deve exigir, no risco da categoria Integridade, uma das 6 subcategorias do Quadro 3. | Must | RN-017 | F1.01; LAC-15 | implementado — lista do Quadro 3 no front (`novoRiscoPagina.spec.ts`, `calculadoraRiscoRadar.spec.ts`) e no banco: tabela `subcategorias_risco`, chave estrangeira composta e gatilho (`090_categorias_subcategorias.test.sql`, `schemaSql.spec.ts`, `errosBanco.spec.ts`); a tela limpa a subcategoria ao sair da Integridade ([[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]; LAC-15). Falta aplicar a migração na nuvem (Fase 2) | T |
| RF-037 | O sistema deve oferecer a escala de probabilidade com os rótulos do Quadro 4, sem percentuais. | Must | RN-011 | F1.02; LAC-12 | não iniciado (LAC-12): a escala é rotulada "Muito baixa (menos de 10%)" a "Muito alta (mais de 90%)" (`FormularioRiscoView.vue:220-224`; `MatrizCalorAssimetrica.vue`) | I |
| RF-038 | O sistema deve oferecer a escala de impacto com os rótulos do Quadro 5. | Must | RN-012 | F1.02 | parcial — os rótulos de `IMPACTOS` em `FormularioRiscoView.vue` já são os do Quadro 5 ("Muito baixo" a "Muito alto"), mas nenhum teste os confere | I |
| RF-039 | O sistema deve registrar cada controle existente do risco com descrição, eficácia do Quadro 6 e indicação de evidência. | Must | RN-003, RN-004 | F1.02 | implementado — `050` bl. 8 (dois controles num só comando); `novoRiscoPagina.spec.ts` "2 controles: o 1º recebe a edição (mesmo id); o 2º vai intacto" | T |
| RF-040 | O sistema deve exigir, no controle marcado como tendo evidência, a indicação de onde a evidência está. | Must | RN-004 | Regra do sistema (`AGENTS.md`, regra 4; alertas F2-04 e LS-01) | implementado — `novoRiscoPagina.spec.ts` "evidência marcada exige dizer onde ela está" | T |
| RF-041 | O sistema deve calcular o risco inerente pela tabela fixa de 25 células do Quadro 7, sem multiplicar nem somar probabilidade e impacto. | Must | RN-001 | F1.02; `AGENTS.md`, regra 2 | implementado — `calculadoraRiscoRadar.spec.ts` "respeita a assimetria do Quadro 7 (… P=1,I=5 é 15; P=5,I=1 é 11)"; `000` bl. 1 | T |
| RF-042 | O sistema deve calcular o risco residual como o inerente multiplicado pelo fator de avaliação dos controles do Quadro 6. | Must | RN-003 | F1.02; `AGENTS.md`, regra 4 | implementado — `calculadoraRiscoRadar.spec.ts` "reproduz exatamente o Caso de Controle do Anexo II…" | T |
| RF-043 | O sistema deve classificar o inerente e o residual pelas faixas do Quadro 8 sobre o valor exato, sem arredondar antes. | Must | RN-002, RN-007 | F1.02; `AGENTS.md`, regra 3 | implementado — `calculadoraRiscoRadar.spec.ts` "classifica decimais de fronteira sem arredondar antes das faixas (10.2 é Alto; 17.1 é Extremo)"; `000` bl. 2 | T |
| RF-044 | O sistema deve limitar a Fraco (fator 0,9) a eficácia do controle sem evidência comprovada de funcionamento. | Must | RN-004 | F1.02; `AGENTS.md`, regra 4; alerta F2-04 | implementado — `calculadoraRiscoRadar.spec.ts` "aciona a trava de evidência…"; `000` bl. 3; `novoRiscoPagina.spec.ts` "a prévia mostra a trava de evidência (Forte sem evidência vira Fraco 0,9)" | T |
| RF-045 | O sistema deve recalcular no banco, a cada gravação, o inerente, as classificações, o fator, o residual e a criticidade, ignorando valores calculados enviados por quem preenche. | Must | RN-013 | F1.02 | implementado — `081` (h); `conversores.spec.ts` "nunca envia campos calculados nem o estado do fluxo" | T |
| RF-046 | O sistema deve mostrar a prévia do cálculo durante o preenchimento, com o aviso de que o valor oficial é o calculado pelo RADAR. | Must | RN-013 | F1.02 | implementado — `novoRiscoPagina.spec.ts` "a prévia avisa que o valor oficial é calculado pelo RADAR" | T |
| RF-047 | O sistema deve dar a cada risco novo o código `RADAR-<ano>-<NNN>`, em sequência única para todo o sistema. | Must | RN-099 | Decisão B3-9 | implementado — `081` (a)/(b) "o número do código novo é MAIOR"; `fonteDemonstracao.spec.ts` "sem id cria rascunho com código `RADAR-<ano>-NNN`…" | T |
| RF-048 | O sistema deve registrar a estratégia de resposta ao risco: Mitigar, Compartilhar, Evitar ou Aceitar. | Must | RN-020 | F2.06, F2.08 e F2.09 | parcial — o campo existe (`riscos.estrategia_principal`, com os 4 valores) e o conversor o leva ao banco (`conversores.spec.ts` "ida e volta…"); falta teste que grave cada estratégia e a releia | T |
| RF-049 | O sistema deve recusar "Aceitar" como resposta ao risco crítico. | Must | RN-019, RN-020 | F2.02; LAC-13; Contrato, col. 15 | não iniciado (LAC-13): banco, formulário e importador aceitam "Aceitar" em risco crítico | T |
| RF-050 | O sistema deve exigir pelo menos uma ação de tratamento para o risco crítico. | Must | RN-019 | F2.10; LAC-13 | parcial — o formulário pede a ação 5W2H, mas a dispensa quando a estratégia é "Aceitar" (`formularioRisco.ts:144-150`), e o banco não a exige (LAC-13) | T |
| RF-051 | O sistema deve registrar cada ação de tratamento com o quê, por quê, quem, quando, onde, como e quanto (5W2H). | Must | RN-019 | F2.10; Metodologia 4.5 | implementado — `conversores.spec.ts` "texto opcional vazio ou ausente da resposta 5W2H vai como null"; `integracao/fonteSupabaseGravacao.spec.ts` "ciclo completo: cria, apaga o 'Por quê', envia…" | T |
| RF-052 | O sistema deve listar os riscos do alcance com filtros guardados no endereço da página (célula da matriz, objeto e busca). | Must | — | Matriz §7, linha "Riscos — lista" | implementado — `filtrosERotulos.spec.ts` "lê filtros válidos da URL e descarta valores inválidos" e "filtra pela célula da Matriz (P3 × I5…)"; `objetosPagina.spec.ts` "'Ver riscos' leva à lista filtrada pelo objeto" | T |
| RF-053 | O sistema deve filtrar a lista pelos riscos críticos, isto é, pelos de residual fora do apetite da DAR, e não pela faixa Extremo. | Must | RN-005 | Matriz §7, linha "Riscos — lista"; LAC-09 (recurso que a CGOV usa hoje para ver a carteira crítica) | implementado — `filtrosERotulos.spec.ts` "'Só Críticos' usa a criticidade frente à DAR, e não o nível Extremo" | T |
| RF-054 | O sistema deve mostrar a ficha do risco em Bow Tie, com causas, evento, consequências, controles e tratamento. | Must | RN-014 | Matriz §7, linha "Ficha do risco" | implementado — `fichaPagina.spec.ts` "Bow Tie: lista ordenada de 5 blocos; aba guardada na URL" | T |
| RF-055 | O sistema deve permitir excluir o risco só quando ele estiver em rascunho, devolvido ou preliminar da CGOV. | Must | RN-050 | FS-01.03; decisão D2 | implementado — `050` bl. 8b; `acoesDoRisco.spec.ts` "'Excluir' só confirma com o código digitado" | T |

## 5. Fluxo interno (FS-01)

Todo este módulo vem de decisão da CGOV sem base nas minutas (**LAC-11**, alerta F3-04): os RF descrevem
o fluxo do piloto tal como está no banco ([[FS-01-validacao-interna-risco]]).

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-056 | O sistema deve permitir à CGOV criar risco preliminar em nome de uma unidade. | Must | RN-048 | FS-01.01; decisão P-B1-5; LAC-11 | implementado — `050` bl. 11; `081` (f) "preliminar_cgov: só a CGOV" | T |
| RF-191 | O sistema deve permitir à CGOV gravar os controles, os tratamentos, os KRIs e as medições do risco preliminar enquanto ele for preliminar. | Must | RN-048 | FS-01.01; decisões P-B1-5 e B11-9 | implementado — `072` bl. 1 "A CGOV grava os filhos do preliminar" e bl. 3 (não grava nos filhos de risco comum) | T |
| RF-057 | O sistema deve permitir à CGOV apagar o risco preliminar enquanto ele não for assumido pela unidade. | Must | RN-048, RN-050 | FS-01.01; decisão P-B1-5 | implementado — `072` bl. 2 | T |
| RF-058 | O sistema deve permitir à unidade assumir o risco preliminar da CGOV como rascunho próprio. | Must | RN-048 | FS-01.02; LAC-11 | implementado — `050` bl. 11; `072` bl. 6; `fonteDemonstracao.spec.ts` "assumir risco preliminar da CGOV vira rascunho" | T |
| RF-059 | O sistema deve retirar da CGOV a edição do risco preliminar depois que a unidade o assumir. | Must | RN-049 | FS-01.02 | implementado — `072` bl. 6 "Depois da assunção pela unidade, a CGOV perde a escrita" | T |
| RF-060 | O sistema deve permitir à unidade alterar qualquer campo da ficha (risco, controles, tratamento e KRIs), sem passar pelo fluxo, quando ela estiver em rascunho ou devolvida. | Must | RN-027, RN-037 | FS-01.03; Matriz §7, linha "Ficha do risco" | implementado — `050` bl. 1 (rascunho livre) e 10 (devolvido não travado) | T |
| RF-061 | O sistema deve mostrar à unidade o motivo da devolução do risco. | Must | RN-046 | FS-01.03 | implementado — `acoesDoRisco.spec.ts` "o motivo aparece como mensagem informativa" | T |
| RF-062 | O sistema deve permitir à unidade enviar a ficha em rascunho ou devolvida para validação. | Must | RN-038 | FS-01.04; LAC-11 | implementado — `050` bl. 1; `novoRiscoPagina.spec.ts` "fluxo completo: cria o risco e envia para validação" | T |
| RF-063 | O sistema deve recusar o envio para validação quando não houver validador efetivo ou, no risco que exige homologação, homologador efetivo. | Must | RN-039 | FS-01.04; decisões R18 e B11-8 | parcial — a recusa por falta de homologador efetivo tem teste (`070` bl. 5); a recusa por falta de validador efetivo (unidade sem chefia imediata, R18) existe em `enviar_para_validacao`, mas não tem teste próprio desde a P-B1-1 | T |
| RF-064 | O sistema deve travar a ficha (risco, controles, tratamento e KRIs) enquanto o risco estiver em validação ou em homologação. | Must | RN-037 | FS-01.04 | implementado — `050` bl. 3; `fichaPagina.spec.ts` "'Editar ficha' NÃO aparece quando a ficha está travada (em validação)" | T |
| RF-065 | O sistema deve mudar o estado do risco no fluxo só pelas ações do fluxo e pelas reaberturas automáticas. | Must | RN-038 | FS-01 (estados); LAC-11 | implementado — `041` bl. 7 "status_fluxo NÃO muda por UPDATE direto" | T |
| RF-066 | O sistema deve definir o validador efetivo do risco pela chefia imediata da unidade na árvore. | Must | RN-040 | FS-01.05; decisão P4 | implementado — `030` bl. 13; `050` bl. 1, 4, 5 e 6 | T |
| RF-067 | O sistema deve definir o homologador efetivo do risco pela árvore (Gerente Regional, Diretor ou Presidente). | Must | RN-042 | FS-01.05; decisão P4 | implementado — `030` bl. 13; `050` bl. 1 e 5 | T |
| RF-068 | O sistema deve subir o degrau para a chefia acima quando quem enviou ou reabriu o risco for o titular do validador ou do homologador. | Must | RN-044 | FS-01.05; decisão D1 | implementado — `050` bl. 8d | T |
| RF-069 | O sistema deve encaminhar os riscos da Presidência e da Assessoria à validação do titular do GABIN e à homologação do Presidente. | Must | RN-043 | FS-01.05; decisão P-B1-1 | implementado — `070` bl. 2 a 4; `050` bl. 12 | T |
| RF-070 | O sistema deve permitir validar e homologar só ao titular, ou ao substituto em exercício com a chave de titular, da unidade do validador ou do homologador efetivo. | Must | RN-032 | FS-01.06 e FS-01.08; decisão P4 | implementado — `030` bl. 8; `050` bl. 4 ("servidor.gr… NÃO titular não valida") | T |
| RF-071 | O sistema deve aprovar, com a validação, o risco que não exige homologação. | Must | RN-041 | FS-01.06; decisão P4 | implementado — `050` bl. 6; `070` bl. 2 | T |
| RF-072 | O sistema deve enviar à homologação, depois da validação, o risco crítico e o de residual Médio em categoria pendente de DAR. | Must | RN-041, RN-010 | FS-01.06 | implementado — `050` bl. 1 e 10; `aprovacoesPagina.spec.ts` "validar um risco Crítico o envia para a Diretoria (e a fila esvazia)" | T |
| RF-073 | O sistema deve aprovar de uma vez o risco que exige homologação quando o validador e o homologador efetivos forem a mesma chefia. | Must | RN-045 | FS-01.06 | implementado — `050` bl. 4 | T |
| RF-074 | O sistema deve recusar a validação do risco que exige homologação e não tem homologador efetivo, mantendo-o em validação. | Must | RN-039 | FS-01.06; decisão B11-8 | implementado — `070` bl. 5b; `050` bl. 10b | T |
| RF-075 | O sistema deve permitir ao homologador efetivo homologar o risco em homologação, que passa a aprovado. | Must | RN-041 | FS-01.08; decisão P4 | implementado — `050` bl. 1, 5 e 9; `070` bl. 3 | T |
| RF-076 | O sistema deve exigir motivo na devolução do risco para ajuste. | Must | RN-046 | FS-01.07 e FS-01.09 | implementado — `050` bl. 10; `acoesDoRisco.spec.ts` "'Devolver' sem motivo não confirma e mostra erro de campo" | T |
| RF-077 | O sistema deve permitir devolver o risco só ao validador efetivo, com o risco em validação, e ao homologador efetivo, com o risco em homologação. Exceção: sem validador ou homologador efetivo, só a CGOV devolve, com motivo (RF-078). | Must | RN-046, RN-044, RN-047 | FS-01.07 e FS-01.09; decisão D1 | implementado — `050` bl. 8d e 10; `080` bl. 2 | T |
| RF-078 | O sistema deve permitir à CGOV devolver, com motivo, o risco cujo estado atual não tem validador ou homologador efetivo. | Must | RN-047 | FS-01.12; decisão B11-4 | parcial — nota 2 | T |
| RF-079 | O sistema deve listar a cada pessoa, em separado, os riscos que ela pode validar e os que pode homologar. | Must | RN-040, RN-042 | Matriz §7, linha "Aprovações" (A) | implementado — `aprovacoesPagina.spec.ts` "'Para validar' lista só quem tem podeValidar…" e "'Para homologar' lista só quem tem podeHomologar…" | T |
| RF-080 | O sistema deve listar à parte os riscos parados sem validador ou homologador efetivo. | Must | RN-047 | FS-01.12; decisão B11-4 | implementado — `aprovacoesPagina.spec.ts` "a aba 'Sem quem decida' só aparece com itens, com o texto de apoio" | T |
| RF-081 | O sistema deve oferecer, em cada risco, só as ações do fluxo que a pessoa pode de fato executar. | Must | RN-038 | Matriz §7, linha "Aprovações"; FS-01 | implementado — `080` bl. 2 (varredura "se e somente se"); `acoesDoRisco.spec.ts` "só mostra os botões das colunas verdadeiras" | T |
| RF-082 | O sistema deve reabrir para validação o risco aprovado cuja ficha for alterada (probabilidade, impacto, controles, tratamento, KRI, categoria ou objeto). | Must | RN-051 | FS-01.10; decisão D1 | implementado — `050` bl. 2, 7, 8 e 8c; `fonteDemonstracao.spec.ts` "editar risco aprovado reabre para validação (como o banco)" | T |
| RF-083 | O sistema deve manter aprovado o risco quando só se lançar medição de KRI ou se mudar a situação de execução de uma ação. | Must | RN-052 | FS-01.10 | implementado — `050` bl. 7; `monitoramentoPagina.spec.ts` "registrar leitura exige valor e não reabre a validação do risco aprovado"; `fluxoValidacao.spec.ts` "mantém status 'aprovado' ao lançar medição de KRI…" | T |
| RF-084 | O sistema deve recusar a alteração que reabriria o risco aprovado quando não houver validador efetivo ou, no risco crítico, homologador efetivo. | Must | RN-053 | FS-01.10 | implementado — `070` bl. 5d; `080` bl. 3.8 | T |
| RF-085 | O sistema deve permitir que o risco parado em validação ou em homologação, cuja unidade do validador ou do homologador efetivo está sem titular ativo (cargo vago), seja decidido ou devolvido por [TBD: ator a definir pela CGOV, delegado ou substituto]. | Should | RN-032 | FS-01, exceção "Cargo vago"; [[decisoes-tecnicas-b1]] §5, pendência 1 | não iniciado (pendência sem LAC; o ator fica TBD até a decisão da CGOV) | T |

**Nota 2.** O banco já tem a regra para os dois casos (`devolver_risco`, `20261116004`), e a tela lista esses
   riscos (RF-080). O caso **da homologação** tem teste: `073` bl. 3b e `integracao/fonteSupabaseGravacao.spec.ts`
   "cgov@ devolve risco sem homologador efetivo". O caso **da validação** (sem validador efetivo) não tem
   teste ([[decisoes-tecnicas-b1]] §5, pendência 2): falta esse teste para o RF ficar "implementado".

## 6. DAR

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-086 | O sistema deve guardar o apetite declarado de cada categoria como Baixo ou Moderado, ou pendente de DAR quando não houver declaração. | Must | RN-055, RN-010 | F1.03; Matriz §7, linha "Apetite a riscos — DAR" (V: vigente) | implementado — `073` bl. 3 (moderado → baixo), 4 (baixo → moderado) e 5 (pendente_dar); `darPagina.spec.ts` "mostra as 8 categorias, cada uma com o controle de apetite rotulado" | T |
| RF-087 | O sistema deve marcar como crítico o risco cujo residual está fora do apetite da DAR para a sua categoria. | Must | RN-005, RN-008, RN-009 | F1.05; F2.02 | implementado — `darPagina.spec.ts` "prevê que o RADAR-2026-003 deixa de ser Crítico com apetite Moderado" e "Extremo continua Crítico em qualquer apetite…"; `filtrosERotulos.spec.ts` "'Crítico' é a situação fora da DAR — nunca um nível do Quadro 8" | T |
| RF-088 | O sistema deve marcar como pendente de DAR o risco de residual Médio em categoria sem apetite declarado. | Must | RN-010 | F1.04; F2.01; alerta F1-02 | implementado — `calculadoraRiscoRadar.spec.ts` "avalia corretamente o estado pendente_dar para riscos Médios vs Altos/Extremos" | T |
| RF-089 | O sistema deve mostrar à CGOV, antes de gravar uma mudança de apetite, a prévia dos riscos que entram e saem da criticidade. | Must | RN-054 | Matriz §7, linha "Apetite a riscos — DAR" (CGOV E: "simular e propor") | implementado — `darPagina.spec.ts` "mudar o apetite abre a prévia; confirmar aplica; Desfazer volta" e "a prévia bate com o que a store aplica (mesma regra oficial)" | T |
| RF-090 | O sistema deve permitir só à CGOV gravar o apetite de uma categoria. | Must | RN-056 | Matriz §7, linha "Apetite a riscos — DAR"; FS-01.11 | implementado — `041` bl. 8; `073` bl. 1; `darPagina.spec.ts` "fora do perfil CGOV, os controles ficam desabilitados" (nota 3) | T |
| RF-091 | O sistema deve recalcular a criticidade dos riscos aprovados da categoria quando o apetite mudar, levando de volta à homologação os que passarem a ser críticos. | Must | RN-054 | FS-01.11; decisões P-B1-8, B11-5 e B11-6 | implementado — `073` bl. 3 a 5; `integracao/fonteSupabaseGravacao.spec.ts` "DAR: cgov@ muda o apetite → risco aprovado da categoria relido com a criticidade nova" | T |
| RF-092 | O sistema deve guardar o apetite proposto pela CGOV como minuta da DAR, separado do apetite vigente. | Must | RN-061 | F3.03; LAC-08 | não iniciado (LAC-08) | T |
| RF-093 | O sistema deve aplicar o apetite da minuta ao cálculo da criticidade só depois de registrada a publicação da DAR por portaria do Presidente. | Must | RN-057, RN-060 | F3.11; F1.03; LAC-08 | não iniciado (LAC-08): hoje a mudança feita em `/dar` vale na hora | T |

**Nota 3.** Hoje a gravação do apetite pela CGOV vale na hora, sem CTGRIC, CIG nem portaria (LAC-08, "bloqueia
   homologação"). O RF-090 continua válido depois da correção (a CGOV é quem grava), mas o efeito sobre a
   criticidade passa a depender do RF-093 e do registro do rito da DAR (RF-122, RF-124, RF-127 e RF-130).

## 7. Monitoramento/KRI

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-094 | O sistema deve registrar o KRI com métrica, fonte dos dados, periodicidade, meta, limite de alerta e responsável pelo monitoramento. | Must | RN-083 | F4.01; Matriz §7, linha "Monitoramento" | parcial — os campos existem (`indicadores_kri`), mas o formulário grava fonte, meta e limite como "A definir" (`formularioRisco.ts:241-242`) (LAC-03) | T |
| RF-095 | O sistema deve exigir pelo menos um KRI para cada risco crítico. | Must | RN-082 | F1.06; F2.10; F4.01; LAC-03 | não iniciado (LAC-03): envio, validação e formulário não exigem KRI | T |
| RF-096 | O sistema deve recusar o KRI de risco crítico com fonte, periodicidade, limite de alerta ou responsável não definidos. | Must | RN-083 | F4.01; LAC-03 | não iniciado (LAC-03) | T |
| RF-097 | O sistema deve permitir ligar um KRI a um grupo de riscos críticos correlatos. | Must | RN-082 | F4.01; LAC-03 | não iniciado (LAC-03): cada KRI pertence a um só risco (`indicadores_kri.risco_id`) | T |
| RF-098 | O sistema deve registrar a medição do KRI com data e valor apurado. | Must | RN-115 | F4.02; Matriz §7, linha "Monitoramento" (E) | implementado — `monitoramentoPagina.spec.ts` "registrar leitura exige valor e não reabre a validação do risco aprovado"; `041` bl. 6 | T |
| RF-099 | O sistema deve registrar, em cada medição, se o KRI passou do limite de alerta. | Must | RN-084 | F4.04 | parcial — o campo `medicoes_kri.em_alerta` é marcado à mão (`MonitoramentoKriPlanoAcaoView.vue:351`) e a tela o exibe (`monitoramentoPagina.spec.ts` "o semáforo usa a leitura mais recente", com dado da semente); falta teste que grave uma medição em alerta e releia o campo | T |
| RF-100 | O sistema deve registrar a situação de execução de cada ação de tratamento. | Must | RN-115 | F4.02; Matriz §7, linha "Monitoramento" (aba Plano de ação) | implementado — `monitoramentoPagina.spec.ts` "mudança de situação recusada avisa pelo aviso rápido e a ação não muda"; `050` bl. 7 | T |
| RF-101 | O sistema deve mostrar as ações de tratamento com prazo próximo ou vencido, a mais urgente primeiro. | Must | RN-086 | F4.02; LAC-04 (inciso V, atraso no tratamento) | implementado — `painelPiloto.spec.ts` "prazos: mostra dias restantes, a mais urgente primeiro, e marca atrasos" | T |
| RF-102 | O sistema deve sinalizar ao gestor, quando uma medição passar do limite de alerta, o prazo de 10 du, contado da ciência do alerta, para reavaliar o risco e comunicar o resultado à CGOV. | Must | RN-084 | F4.04; LAC-03 | não iniciado (LAC-03): `medicoes_kri.em_alerta` não gera reavaliação, comunicação nem prazo | T |

## 8. Reavaliação

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-103 | O sistema deve registrar a data da última reavaliação de cada risco. | Should | RN-087 | F4.03; F1.08; LAC-10 | não iniciado (LAC-10): só há `atualizado_em`, que muda a cada gravação | T |
| RF-104 | O sistema deve permitir ao gestor fixar, no registro do risco, período de reavaliação menor que um ano. | Should | RN-088 | F4.03; LAC-10 | não iniciado (LAC-10) | T |
| RF-105 | O sistema deve sinalizar o risco cuja reavaliação anual, ou a do período menor fixado, venceu. | Should | RN-087, RN-088 | F4.03; LAC-10 | não iniciado (LAC-10) | T |
| RF-106 | O sistema deve registrar a reavaliação do risco com o motivo: anual, alerta do KRI ou fato do item 4.7.2. | Should | RN-084, RN-087 | F4.03; F4.04; LAC-10 | não iniciado (LAC-10) | D |

## 9. Comunicação de fatos

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-107 | O sistema deve permitir ao gestor registrar a comunicação à CGOV de fato de uma das 6 hipóteses do item 4.7.2, indicando a hipótese. | Should | RN-086 | F4.05; F1.08; LAC-04 | não iniciado (LAC-04) | D |
| RF-108 | O sistema deve registrar a data em que o gestor tomou ciência do fato comunicado. | Should | RN-086 | F4.05; LAC-04 | não iniciado (LAC-04) | T |
| RF-192 | O sistema deve mostrar ao gestor o prazo de 10 du, contado da ciência do fato, para comunicá-lo à CGOV. | Should | RN-086 | F4.05; LAC-04 | não iniciado (LAC-04) | T |
| RF-109 | O sistema deve registrar a comunicação do resultado da reavaliação por alerta do KRI como suprindo as hipóteses I a III do item 4.7.2, quando coincidirem e forem feitas no mesmo prazo. | Must | RN-084, RN-085 | F4.04; LAC-03; LAC-04 | não iniciado (LAC-03, LAC-04) | T |
| RF-110 | O sistema deve propor ao gestor o registro da comunicação da hipótese I quando uma gravação mudar a classificação residual ou a criticidade do risco. | Could | RN-086 | F4.05; LAC-04 (coluna do sistema: a hipótese I "já pode ser detectada" pelo gatilho de cálculo) | não iniciado (LAC-04) | T |
| RF-111 | O sistema deve mostrar à CGOV as comunicações recebidas, com a hipótese, a data da ciência e a data da comunicação. | Should | RN-086, RN-089 | F4.06; F4.09; LAC-04 | não iniciado (LAC-04) | D |

## 10. Plano de Gestão de Riscos (consolidação, colegiados, publicação, revisão)

CTGRIC, CIG e Presidente decidem **fora** do sistema (reunião, ata, portaria): os RF de colegiado pedem
que a CGOV **registre** o resultado (UC-18 e UC-25). Os passos da DAR são Must (corrigem a LAC-08, que
bloqueia homologação); os do Plano são Should (LAC-01, LAC-02 e LAC-07, importantes).

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-112 | O sistema deve registrar o calendário anual das reuniões ordinárias do CTGRIC e do CIG proposto pela CGOV. | Should | RN-076 | F3.01; LAC-01 | não iniciado (LAC-01) | D |
| RF-113 | O sistema deve permitir ao gestor comunicar à CGOV os riscos críticos da sua unidade para a carteira do Plano. | Should | RN-062 | F3.02; LAC-01; LAC-11 | não iniciado (LAC-01): hoje cada risco termina sozinho no estado aprovado | D |
| RF-114 | O sistema deve reunir os riscos críticos comunicados na carteira de um Plano de Gestão de Riscos único por ciclo. | Should | RN-063 | F3.03; F1.07; LAC-01 | não iniciado (LAC-01): não há entidade "Plano" nem carteira | T |
| RF-115 | O sistema deve registrar a verificação de completude e de consistência metodológica feita pela CGOV em cada risco da carteira. | Should | RN-063 | F3.03; LAC-01 | não iniciado (LAC-01) | D |
| RF-116 | O sistema deve permitir à CGOV devolver o risco da carteira ao gestor, com a lista de pendências. | Should | RN-064 | F3.04; LAC-01 | não iniciado (LAC-01; a devolução que existe é a do fluxo interno, RF-076) | T |
| RF-117 | O sistema deve mostrar ao gestor e à CGOV o prazo de 10 du para sanar as pendências do risco devolvido pela CGOV. | Should | RN-106 | F3.05; LAC-01 | não iniciado (LAC-01) | T |
| RF-118 | O sistema deve marcar com ressalva de incompletude o risco consolidado com pendência não sanada no prazo. | Should | RN-065 | F3.06; LAC-01 | não iniciado (LAC-01) | T |
| RF-119 | O sistema deve registrar a ciência dada à chefia imediata do gestor sobre o risco consolidado com ressalva. | Should | RN-065 | F3.06; LAC-01 | não iniciado (LAC-01) | D |
| RF-120 | O sistema deve mostrar o prazo de 10 du de cada passo da CGOV no rito do Plano (verificar, consolidar, registrar a ressalva, encaminhar ao CTGRIC, incorporar as ressalvas e divulgar). | Should | RN-066 | F3.03, F3.06, F3.07, F3.09 e F3.12 (decisão não aplicada F5-11); LAC-01; LAC-02 | não iniciado (LAC-01, LAC-02) | T |
| RF-195 | O sistema deve mostrar o prazo de 10 du de cada passo da CGOV no rito da DAR (consolidar a minuta da DAR, encaminhar ao CTGRIC e incorporar as ressalvas). | Must | RN-066 | F3.03, F3.07 e F3.09 (decisão não aplicada F5-11); LAC-08 | não iniciado (LAC-08) | T |
| RF-121 | O sistema deve guardar as versões do Plano de Gestão de Riscos: vigente, em tramitação e reapresentada. | Should | RN-071, RN-110 | F3.13; LAC-01 (Metodologia 4.6.8 e 4.6.10) | não iniciado (LAC-01) | D |
| RF-122 | O sistema deve registrar o encaminhamento da minuta da DAR ao CTGRIC, com a data. | Must | RN-061 | F3.07; LAC-08; LAC-02 | não iniciado (LAC-08) | D |
| RF-123 | O sistema deve registrar o encaminhamento do Plano consolidado ao CTGRIC, com a data e a lista dos riscos consolidados com ressalva. | Should | RN-065, RN-067 | F3.06; F3.07; LAC-01; LAC-02 | não iniciado (LAC-02) | D |
| RF-124 | O sistema deve registrar a manifestação do CTGRIC sobre a minuta da DAR (favorável, com ressalvas ou desfavorável). | Must | RN-061, RN-070 | F3.08; LAC-08; LAC-02 | não iniciado (LAC-08) | D |
| RF-125 | O sistema deve registrar a manifestação do CTGRIC sobre o Plano (favorável, com ressalvas ou desfavorável). | Should | RN-067, RN-069, RN-070 | F3.08; LAC-02 | não iniciado (LAC-02) | D |
| RF-126 | O sistema deve guardar, com os instrumentos encaminhados ao CIG, as ressalvas incorporadas e o parecer da manifestação desfavorável do CTGRIC. | Should | RN-068, RN-107 | F3.09; LAC-02 | não iniciado (LAC-02) | D |
| RF-127 | O sistema deve registrar a deliberação do CIG sobre a DAR. | Must | RN-057 | F3.10; LAC-08; LAC-02 | não iniciado (LAC-08) | D |
| RF-128 | O sistema deve registrar a deliberação do CIG sobre o Plano. | Should | RN-057 | F3.10; LAC-02 | não iniciado (LAC-02) | D |
| RF-129 | O sistema deve impedir o registro de deliberação do Plano na reunião em que a DAR for reprovada. | Should | RN-058 | F3.10 (decisão não aplicada F5-13); LAC-02 | não iniciado (LAC-02) | T |
| RF-130 | O sistema deve registrar o número e a data da portaria do Presidente que publica a DAR. | Must | RN-060 | F3.11; LAC-08 | não iniciado (LAC-08) | D |
| RF-131 | O sistema deve registrar o número e a data do ato do Presidente que aprova o Plano. | Should | RN-060 | F3.11; LAC-02 | não iniciado (LAC-02) | D |
| RF-132 | O sistema deve registrar a divulgação do Plano aprovado na intranet e em transparência ativa. | Should | RN-075 | F3.12; LAC-02 | não iniciado (LAC-02) | D |
| RF-133 | O sistema deve mostrar o prazo de 30 dias para a CGOV reapresentar ao CIG a DAR e o Plano não aprovados. | Should | RN-071 | F3.13; LAC-02 | não iniciado (LAC-02) | T |
| RF-134 | O sistema deve indicar se a mudança na DAR ou no Plano é substancial pelos critérios do item 4.6.9 (apetite de categoria, inclusão ou exclusão de risco crítico, resposta ao risco crítico). | Should | RN-072, RN-073, RN-074 | F3.14; F4.12; LAC-07 (critérios calculáveis com campos que já existem) | não iniciado (LAC-07) | T |
| RF-135 | O sistema deve registrar a reclassificação da mudança, substancial ou não, feita pelo CIG. | Should | RN-108 | F3.14; LAC-02 | não iniciado (LAC-02) | D |
| RF-136 | O sistema deve registrar a decisão da CGOV sobre a revisão do Plano (sem revisão, revisão não substancial ou substancial), com a data e a ciência ao gestor. | Should | RN-078, RN-079 | F4.10; LAC-07 | não iniciado (LAC-07) | D |
| RF-137 | O sistema deve mostrar o prazo de 10 du para a CGOV decidir sobre a revisão do Plano. | Should | RN-079 | F4.10 (decisão não aplicada F4-14); LAC-07 | não iniciado (LAC-07) | T |
| RF-138 | O sistema deve registrar a atualização não substancial do Plano feita pela CGOV como nova versão, para ser informada no relatório trimestral. | Should | RN-109 | F4.11; LAC-07 | não iniciado (LAC-07) | D |
| RF-139 | O sistema deve manter vigente o Plano anterior enquanto a revisão substancial não for aprovada pelo CIG. | Should | RN-077, RN-080, RN-110 | F4.12 (decisão não aplicada F4-15); LAC-07 | não iniciado (LAC-07) | T |

## 11. Acompanhamento pela CGOV

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-140 | O sistema deve listar à CGOV os riscos críticos com pendência de atualização, de relato ou de comunicação. | Should | RN-089 | F4.06; LAC-09 | não iniciado (LAC-09): a CGOV só filtra os críticos (RF-053) | T |
| RF-141 | O sistema deve registrar a cobrança da CGOV ao gestor, com a data. | Should | RN-090 | F4.07; LAC-09 | não iniciado (LAC-09) | D |
| RF-142 | O sistema deve sinalizar à CGOV a pendência que persistir por mais de 10 du depois da cobrança. | Should | RN-112 | F4.08; LAC-09 | não iniciado (LAC-09) | T |
| RF-143 | O sistema deve registrar a ciência dada à chefia imediata do gestor sobre a pendência persistente. | Should | RN-112 | F4.08; LAC-09 | não iniciado (LAC-09) | D |

## 12. Relatórios e avaliação

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-144 | O sistema deve mostrar no Painel a matriz de calor do Quadro 7, com a quantidade de riscos de cada célula. | Must | RN-001 | Matriz §7, linha "Painel" | implementado — `painelPiloto.spec.ts` "tem 25 botões e lê o valor do Quadro 7, nunca P × I" e "conta os riscos por célula usando P e I da ficha" | T |
| RF-145 | O sistema deve mostrar no Painel a distribuição dos riscos pelo nível residual do Quadro 8. | Must | RN-002 | Matriz §7, linha "Painel" | implementado — `painelPiloto.spec.ts` "distribui por nível residual usando a classificação gravada (8,4 é Médio)" | T |
| RF-146 | O sistema deve mostrar no Painel o que precisa da atenção da pessoa, conforme as ações do fluxo que ela pode executar. | Must | RN-040, RN-042 | Matriz §7, linha "Painel" | implementado — `painelPiloto.spec.ts` "'Precisa da sua atenção' segue as ações liberadas (acoes), não o perfil" | T |
| RF-147 | O sistema deve fornecer os dados da carteira de riscos críticos recortados por trimestre, com o histórico de cada risco no período. | Should | RN-091 | F4.09; LAC-05 | não iniciado (LAC-05): o Painel conta só os riscos do momento | T |
| RF-148 | O sistema deve gerar o relatório trimestral ao CTGRIC e ao CIG com a carteira de riscos críticos, a efetividade dos controles e o desempenho dos KRI, sem a maturidade. | Should | RN-091 | F4.13; F1.09; LAC-05 | não iniciado (LAC-05) | D |
| RF-149 | O sistema deve incluir no relatório trimestral seguinte as pendências que persistiram depois da cobrança. | Should | RN-112 | F4.08; LAC-09; LAC-05 | não iniciado (LAC-05, LAC-09) | D |
| RF-150 | O sistema deve registrar a avaliação gerencial anual da CGOV (efetividade, adequação e maturidade) e o relatório com recomendações ao CTGRIC e ao CIG. | Should | RN-092, RN-093 | F4.15; F1.09; LAC-06 | não iniciado (LAC-06) | D |
| RF-151 | O sistema deve fornecer os dados do ano da gestão de riscos para a avaliação gerencial anual. | Should | RN-092 | F4.15; LAC-06 | não iniciado (LAC-06) | D |
| RF-152 | O sistema deve registrar a ciência da avaliação gerencial anual dada à AUDIT, com a data. | Should | RN-094 | F4.16; LAC-06 | não iniciado (LAC-06) | D |

## 13. Auditoria

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-153 | O sistema deve registrar na trilha de auditoria toda inclusão, alteração e exclusão em objetos, riscos, controles, tratamentos, KRIs, medições, perfis e categorias da DAR. | Must | RN-095 | Matriz §7, linha "Auditoria — trilha"; UC-20 (etapa B3) | implementado — `060` bl. 1 a 3 e 7 | T |
| RF-154 | O sistema deve guardar no histórico do risco cada ação do fluxo, com quem agiu, quando e, na devolução, o motivo. | Must | RN-096 | FS-01 (`historico_fluxo`); UC-20 | implementado — `060` bl. 6; `integracao/fonteSupabaseGravacao.spec.ts` "ciclo completo: …; histórico e atividade recente"; `conversores.spec.ts` "agrupa os filhos no risco certo (… histórico em ordem)" | T |
| RF-155 | O sistema deve impedir a gravação direta na trilha de auditoria. | Must | RN-097 | UC-20 | implementado — `060` bl. 5 | T |
| RF-156 | O sistema deve mostrar a cada pessoa só a trilha do seu alcance e à CGOV a trilha inteira, inclusive as linhas sem objeto. | Must | RN-098 | Matriz §7, linha "Auditoria — trilha" (V e V\*) | implementado — `060` bl. 4; `082` bl. 1 | T |
| RF-157 | O sistema deve mostrar os eventos da trilha em linguagem simples, agrupados por dia, do mais recente ao mais antigo. | Must | RN-095 | Matriz §7, linha "Auditoria — trilha"; UC-20 | implementado — `auditoriaPagina.spec.ts` "mostra todos os eventos agrupados por dia…"; `auditoriaLegivel.spec.ts` "descreverEvento" | T |
| RF-158 | O sistema deve filtrar a trilha por tabela e por período. | Must | — | Matriz §7, linha "Auditoria — trilha"; UC-20 | implementado — `auditoriaPagina.spec.ts` "filtro por tabela recomeça a lista; período sem eventos mostra o estado vazio" | T |
| RF-159 | O sistema deve exportar em CSV os eventos da trilha carregados na tela, protegidos contra fórmulas de planilha. | Must | — | UC-20 (etapa B3) | implementado — `auditoriaPagina.spec.ts` "eventosAuditoriaParaCsv" e "campo (proteção contra fórmulas de planilha)" | T |

## 14. Importação

Origens no [[FS-02-analise-ato-por-skills]]: atividades FS-02.15 a FS-02.18 e a seção "Contrato com o
Importar" ("col. N" = linha N da tabela "Coluna a coluna"; os demais itens citam o tópico da lista
"Formato, validações e recusas do importador"). RF-160 a RF-172, RF-193 e a parte do RF-168 descrevem o
que o importador faz hoje; RF-173 a RF-186, RF-188 e RF-194 corrigem as divergências do contrato (RF-172 a RF-175 já corrigidos em 2026-11-22); o RF-187 é
proposta (nota 4). As divergências sem LAC citam o cartão do Backlog "Importador: recusas e conversões
silenciosas" ([[quadro]], commit `22b872a`), que reúne todas elas.

| ID | Enunciado | Prioridade | RN relacionadas | Origem | Situação | Verificação |
| --- | --- | --- | --- | --- | --- | --- |
| RF-160 | O sistema deve permitir só à CGOV importar fichas de risco em lote. | Must | RN-033 | Matriz §7, linha "Importar riscos" (CGOV E); decisão P5; FS-02.15 | implementado — `acessoPorPerfil.spec.ts` "Importar e Usuários são só da CGOV (matriz, seção 7)"; `guardaRotas.spec.ts` "ativo + cgov em importar-skill: segue" | T |
| RF-161 | O sistema deve receber a tabela da skill colada na tela Importar. | Must | RN-033 | FS-02.15 | implementado — `importarPagina.spec.ts` "sem texto, 'Ver prévia' pede a tabela" e "a prévia não grava nada; confirmar importa como Preliminar CGOV" | T |
| RF-162 | O sistema deve receber a tabela da skill em arquivo `.md`, `.txt` ou `.markdown`. | Must | RN-033 | FS-02.15 | parcial — `ImportadorSkillView.vue` (`lerArquivo`) aceita as três extensões, mas nenhum teste envia arquivo | T |
| RF-163 | O sistema deve ler a tabela de 16 colunas do Regime B pela posição das colunas. | Must | RN-014 | FS-02.16; Contrato (abertura e "Coluna a coluna") | implementado — `importadorSkillMarkdown.spec.ts` "converte uma tabela Markdown do Regime B em fichas preliminares recalculadas pelo motor oficial" | T |
| RF-164 | O sistema deve mostrar a prévia das fichas importadas, recalculadas pelos Quadros 6, 7 e 8, sem gravar nada. | Must | RN-001, RN-002, RN-003, RN-004, RN-013 | FS-02.16 | implementado — `importarPagina.spec.ts` "a prévia não grava nada; confirmar importa como Preliminar CGOV"; `importadorSkillMarkdown.spec.ts` (inerente 18, residual 16,2) | T |
| RF-165 | O sistema deve recusar na importação a linha com a categoria mista que junta Operacional e Integridade. | Must | RN-016 | FS-02.16; Contrato, col. 4 | implementado — `importadorSkillMarkdown.spec.ts` "rejeita linha que utilize a categoria proibida…"; `importarPagina.spec.ts` "categoria mista proibida vira erro e bloqueia o botão de importar" | T |
| RF-166 | O sistema deve exigir a escolha de um objeto de destino, só entre objetos de unidades ativas. | Must | RN-034 | FS-02.17 | implementado — `importarPagina.spec.ts` "o seletor de destino só oferece objetos de unidades ativas" e "sem objeto escolhido, 'Importar' não grava…" | T |
| RF-167 | O sistema deve gravar cada ficha importada como risco preliminar da CGOV. | Must | RN-104, RN-048 | FS-02.18; decisões P5 e P-B1-5 | implementado — `importarPagina.spec.ts` "a prévia não grava nada; confirmar importa como Preliminar CGOV"; `riscosStore.spec.ts` "importar grava cada linha como preliminar e segue depois de uma recusa" | T |
| RF-168 | O sistema deve gravar a ficha importada com o código do RADAR, descartando o código da skill. | Must | RN-099 | FS-02.18; Contrato, col. 1 | implementado — `importarPagina.spec.ts` "a prévia não grava nada; confirmar importa como Preliminar CGOV" (confere que o código `RSC-IN-01` não é gravado) | T |
| RF-193 | O sistema deve avisar na prévia que o código da skill será trocado pelo do RADAR. | Must | RN-099 | FS-02.16; Contrato, col. 1 | implementado — `importarPagina.spec.ts` "a prévia avisa que o código da skill será trocado pelo do RADAR" | T |
| RF-169 | O sistema deve gravar cada linha importada em separado, de modo que a recusa do banco a uma linha não impeça as outras. | Must | — | FS-02.18; Contrato ("Na gravação") | implementado — `importarPagina.spec.ts` "5 fichas, a 3ª recusada → '4 de 5 importados'…"; `riscosStore.spec.ts` "importar grava cada linha como preliminar e segue depois de uma recusa" | T |
| RF-170 | O sistema deve oferecer a nova tentativa só das linhas recusadas, sem duplicar as que já entraram. | Must | — | FS-02.18; Contrato ("Na gravação") | implementado — `importarPagina.spec.ts` "5 fichas, a 3ª recusada…" (botão "Importar de novo só as recusadas") | T |
| RF-171 | O sistema deve avisar na prévia, sem bloquear, a linha cuja descrição não segue a sintaxe do item 4.2.1. | Must | RN-014 | Contrato, col. 3 ("Avisos") | parcial — o aviso existe (`importadorSkillMarkdown.ts`, lista `avisos`), mas nenhum teste o confere | T |
| RF-172 | O sistema deve recusar na importação a linha de categoria fora da lista do sistema. | Must | RN-015 | Contrato, col. 4 ("Erros") | implementado — a linha de categoria fora do Quadro 2 (e das 3 grafias do Anexo III aceitas como sinônimo) é recusada, inclusive a coluna vazia (`importadorSkillMarkdown.spec.ts`, `importarPagina.spec.ts`) | T |
| RF-173 | O sistema deve aceitar na importação as 8 categorias do Quadro 2, com a grafia que a skill entrega. | Must | RN-015 | Contrato, col. 4; LAC-14 | implementado — as 8 categorias do Quadro 2 são aceitas; "Financeiro ou Orçamentário", "Reputação ou Imagem" e "Visitação" são aceitas como sinônimos, sem diferença de maiúsculas e de espaços nas pontas, e gravam a grafia do Quadro 2 (`importadorSkillMarkdown.spec.ts`, `conversores.spec.ts`; [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]) | T |
| RF-174 | O sistema deve conferir a subcategoria de Integridade importada contra as 6 do Quadro 3 e recusar a linha com subcategoria fora delas. | Must | RN-017 | Contrato, col. 4a; LAC-15 | implementado — subcategoria fora das 6 do Quadro 3 recusa a linha, com mensagem que lista as 6 (`importadorSkillMarkdown.spec.ts`; LAC-15) | T |
| RF-175 | O sistema deve recusar a linha de Integridade sem subcategoria, em vez de atribuir uma subcategoria padrão. | Must | RN-017 | Contrato, col. 4a e "Silêncios"; LAC-15 | implementado — "Integridade:" sem subcategoria é recusada; o ramo que gravava uma subcategoria padrão foi removido, e a gravação com categoria inexistente falha em vez de usar outra (`importadorSkillMarkdown.spec.ts`, `conversores.spec.ts`; LAC-15) | T |
| RF-176 | O sistema deve reconhecer a probabilidade pelos rótulos do Quadro 4 e o impacto pelos do Quadro 5 quando vierem sem número. | Must | RN-011, RN-012 | Contrato, col. 5 e 6; LAC-12 | não iniciado (LAC-12) | T |
| RF-177 | O sistema deve tratar como erro da linha, e não converter em silêncio, a probabilidade ou o impacto ilegível, igual a zero ou fora de 1 a 5. | Should | RN-011, RN-012 | Contrato, col. 5 e 6 e "Silêncios" | não iniciado: hoje vira 3, 5 ou 1 sem aviso | T |
| RF-178 | O sistema deve avisar na prévia quando não conseguir ler da célula se o controle tem evidência comprovada, em vez de deduzir a evidência pela eficácia ou por palavras-chave. | Should | RN-004 | Contrato, col. 9 e "Silêncios" | não iniciado | T |
| RF-179 | O sistema deve avisar na prévia quando a trava de evidência reduzir a eficácia de um controle importado. | Should | RN-004 | Contrato, col. 10; FS-02, "Alertas e lacunas" (item sem ID) | não iniciado | T |
| RF-180 | O sistema deve avisar na prévia quando o inerente ou o residual informado pela skill diferir do recálculo do RADAR. | Should | RN-001, RN-003 | Contrato, col. 7 e 11; FS-02, "Alertas e lacunas" (item sem ID) | não iniciado: o comentário da tela promete o aviso, mas o código não compara | T |
| RF-181 | O sistema deve avisar na prévia quando a estratégia estiver vazia ou fora de Mitigar, Compartilhar, Evitar e Aceitar, em vez de gravar Mitigar em silêncio. | Should | RN-020 | Contrato, col. 15 e "Silêncios" | não iniciado | T |
| RF-182 | O sistema deve gravar como texto vazio (as colunas `causas`, `consequencias` e `objetivo_afetado` são `NOT NULL` em `20261109001_schema_radar.sql`), para a unidade completar antes do envio (RF-030), a causa, a consequência e o objetivo que não conseguir ler da frase da skill, em vez de gravar texto genérico. | Should | RN-014 | Contrato, col. 3 | não iniciado: grava textos padrão ("Identificado preliminarmente via análise normativa CGOV"…) | T |
| RF-183 | O sistema deve gravar o KRI importado só com os campos que a skill entregou, sem preencher fórmula, fonte, periodicidade, meta e limite de alerta que ninguém definiu. | Must | RN-083 | Contrato, col. 16; LAC-03 | não iniciado (LAC-03): grava meta "100%" e alerta "< 80%" | T |
| RF-184 | O sistema deve criar KRI na importação só quando a linha trouxer um KRI. | Must | RN-082 | Contrato, col. 16; LAC-03 | não iniciado (LAC-03): célula vazia gera "Indicador a definir com a 1ª Linha" | T |
| RF-185 | O sistema deve aplicar na importação a resposta do Teste de Integridade entregue pela skill, em vez de tratar o teste como "não aplicável". | Should | RN-006 | Contrato, linha "Teste de Integridade" | não iniciado: o importador chama a validação com "teste não aplicável" | T |
| RF-194 | O sistema deve exigir na importação a justificativa de pelo menos 10 caracteres quando o Teste de Integridade se aplicar e o risco não for da categoria Integridade. | Should | RN-018 | Contrato, linha "Teste de Integridade" | não iniciado: a justificativa não é cobrada na importação | T |
| RF-186 | O sistema deve avisar na prévia a linha de tabela ignorada por ter menos de 10 colunas. | Should | — | Contrato ("Linhas lidas") | não iniciado: a linha some sem aviso | T |
| RF-187 | O sistema deve permitir importar as linhas válidas quando outras linhas da tabela tiverem erro, recusando só as linhas com erro. | Could | — | FS-02, Contrato com o Importar (uma recusa bloqueia o lote) + proposta da reestruturação, a decidir pela CGOV | não iniciado (nota 4) | T |
| RF-188 | O sistema deve informar, quando receber a tabela do Regime A, que só importa a tabela do Regime B. | Could | — | FS-02.12; Contrato ("Tabela do Regime A") | não iniciado: a linha é recusada por categoria inválida, sem falar de regime | T |
| RF-189 | O sistema deve executar, dentro do RADAR, a análise de ato normativo pelas skills, por Edge Function que chama a API do Claude. | Won't | — | FS-02, "Onde fica o clique" (alternativa B) | não iniciado. Won't: contraria o não-objetivo da [[visao-produto]] §4 ("robô de IA dentro do site") e depende de ADR, aval da CGTI e análise de LGPD; a decisão está pendente no Backlog | I |

**Nota 4.** O RF-187 **não é exigência** da norma nem decisão da CGOV: é proposta desta reestruturação.
Hoje (FS-02.16) qualquer erro bloqueia o lote, e o caminho previsto é o analista corrigir a tabela e
reimportar (seta "Sim: corrige a tabela" do diagrama do FS-02). O RF-187 é alternativa a esse
comportamento e só entra no backlog se a CGOV a escolher (levar ao UC-13).
