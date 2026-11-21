# Requisitos não funcionais — RADAR

Este catálogo registra **como o sistema deve ser**, e não o que ele faz (isso está em [[requisitos-funcionais]]). Um **requisito não funcional (RNF)** fixa uma qualidade: acessível, seguro, rápido, fácil de manter. Aqui cada RNF tem um **número** e um **comando** que o mede, para que ninguém precise acreditar na palavra de ninguém. Só entram medições que já existem no projeto; onde não há medição, o texto diz isso.

A qualidade é organizada pela norma **ISO/IEC 25010:2023**, que a divide em **9 características**. Em uma frase cada:

- **Adequação funcional:** o sistema faz o que deve, e faz certo (por exemplo, calcula o risco como a Metodologia manda).
- **Eficiência de desempenho:** responde em tempo razoável e não desperdiça recursos.
- **Compatibilidade:** convive e troca dados com outros sistemas e padrões.
- **Capacidade de interação:** a pessoa consegue usar o sistema sem errar e sem barreiras (inclui a acessibilidade).
- **Confiabilidade:** continua funcionando e não deixa dados pela metade quando algo falha.
- **Segurança da informação** (*security*): cada pessoa vê e muda só o que pode; tudo fica registrado; dados pessoais são protegidos.
- **Manutenibilidade:** é fácil entender, corrigir e testar o código.
- **Flexibilidade:** pode ser instalado e levado para outro ambiente com pouco esforço.
- **Proteção** (*safety*): o sistema evita que uma ação cause dano, como apagar uma decisão já aprovada.

**Como ler as tabelas.** Cada linha tem: `ID` (`RNF-NNN`, nunca reutilizado); `Enunciado` (o enunciado mensurável); `Subcaracterística` (nome da ISO/IEC 25010:2023 em português, "tradução livre" quando a tradução oficial não é certa); `Critério de aceitação` (o número e o comando que mede); `Origem` (de onde vem o requisito); `Verificação` (letra do método, conforme [[ERS-radar]], seção 8: **I** inspeção, **A** análise, **D** demonstração, **T** teste). As medições são as mais recentes registradas em [[ESTADO-ATUAL]] (a "verificação final da etapa C", de 2026-11-16, salvo indicação). Uma medição pode ficar velha: rode o comando para conferir o valor de hoje.

Termos: **RLS** é a regra do banco que filtra as linhas por quem está logado; **DAR**, a Declaração de Apetite a Riscos; **gov.br DS**, o Padrão Digital de Governo.

## Adequação funcional

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-001 | O risco inerente deve ser sempre o valor da tabela fixa de 25 células do Quadro 7, sem multiplicar nem somar probabilidade e impacto. | Correção | O teste de regressão do cálculo no banco (`supabase/tests/000_regressao_calculo.test.sql`, 7 verificações) e `calculadoraRiscoRadar.spec.ts` passam, com `P=1, I=5` dando 15 e `P=5, I=1` dando 11. A cobertura célula a célula das 25 não foi medida. | [[regras-negocio]] RN-001; AGENTS.md, regra 2; [[matriz-regras-regime-b]] | T |
| RNF-002 | O nível do risco deve ser classificado pelas faixas do Quadro 8 sobre o valor exato, sem arredondar antes. | Correção | `10,2` resulta em Alto e `17,1` em Extremo, no `npm test` e no teste `000` do banco (`npm run test:db`). | RN-002; AGENTS.md, regra 3; [[guia-supabase-local]] (teste `000`) | T |
| RNF-003 | O risco residual deve ser o inerente multiplicado pelo fator do Quadro 6, e controle sem evidência não pode passar de Fraco (0,9). | Correção | Controle sem evidência vira Fraco (0,90) no teste `000` (`npm run test:db`) e em `calculadoraRiscoRadar.spec.ts` (`npm test`). | RN-003; RN-004; AGENTS.md, regra 4 | T |
| RNF-004 | O cálculo no banco deve dar o mesmo resultado que o cálculo no navegador, e o navegador não grava valores calculados no modo real. | Correção | `salvar_ficha_risco` deriva o fator pela eficácia e ignora o fator vindo do JSON; teste pgTAP `081` e `fichaPagina.spec.ts` passam (`npm run test:db`, `npm test`). | [[decisoes-tecnicas-b3]] B3-8 | T |
| RNF-005 | O sistema deve ter as telas previstas para o piloto da Sede, acessíveis conforme os perfis da matriz de acesso. | Completude | 16 telas na varredura de acessibilidade (mais 4 em estado de carregamento ou erro), todas navegadas por perfil. Isto mede só as telas varridas: **não há medida de cobertura dos requisitos funcionais**. | ESTADO-ATUAL, etapa B3; [[matriz-acesso-responsabilidades]] | D |

## Eficiência de desempenho

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-006 | Toda leitura de lista no banco deve percorrer **todas** as páginas, porque o servidor devolve no máximo 1.000 linhas por pedido. | Capacidade | `lerTodasAsPaginas` lê em páginas de 1.000 linhas, com ordem terminando em `id`; `paginacao.spec.ts` passa (`npm test`). Lotes de ações: 1.000 ids por chamada (2.100 ids = 3 chamadas). | `src/services/dados/paginacao.ts`; `src/services/dados/fonteSupabase.ts` (cabeçalho); [[decisoes-tecnicas-b3]] | T |
| RNF-007 | A trilha de auditoria deve ser lida por cursor, em páginas de 50 linhas por padrão (máximo 100), e não de uma vez. | Comportamento temporal | `ler_auditoria(p_limite => 50)` é o padrão; o máximo de 100 consta no comentário da função; testes `060` e `082` e `auditoriaPagina.spec.ts` passam. | Migração `20261117001_leitura_acoes_e_gravacao_ficha.sql` (seção 3); RN-098 | T |
| RNF-008 | A lista de riscos deve recusar consultas com mais de 1.000 riscos, avisando a pessoa para filtrar. | Utilização de recursos | Mensagem "no máximo 1.000 riscos" tratada em `errosBanco.ts`; `errosBanco.spec.ts` passa. | `src/services/dados/errosBanco.ts` | T |
| RNF-009 | O Painel no celular (390 px) deve ficar o mais curto possível. A medida atual é registrada; **a meta de 3.500 px é decisão pendente da CGOV**, e este catálogo não fixa meta. | Utilização de recursos | Medida atual, em 390 px, com dados de demonstração e blocos fechados: CGOV 3.690 px e Gestor 3.771 px (etapa C, 2026-11-16). Em 360 px, 4.271 px (varredura, só informação). Meta de 3.500 px **não atingida**. | ESTADO-ATUAL, etapa C ("Altura medida do Painel") | A |
| RNF-010 | O servidor deve entregar o front como arquivos estáticos leves, sem Node.js em produção. | Utilização de recursos | Imagem final só com Nginx 1.27 Alpine e a pasta `dist/` (Dockerfile, etapa 2); front de cerca de 150 KB comprimido, conforme o guia (valor do guia, sem comando de medida). | `Dockerfile`; [[guia-docker-cgti]] | I |

## Compatibilidade

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-011 | A interface deve usar o Padrão Digital de Governo (gov.br DS, `@govbr-ds/core`) e seus tokens, sem cores fixas fora dos tokens. | Coexistência (tradução livre, no sentido de aderência ao padrão do governo) | Cores fixas: 0 (medido na Fase 3, de 234 para 175 e então 0); `higieneCss.spec.ts` passa (`npm test`). | [[design-system]]; ESTADO-ATUAL, Fase 3 | T |
| RNF-012 | O sistema deve importar a ficha preliminar gerada pela skill `cgov-gestao-riscos-v4` em tabela Markdown, recusando linhas inválidas. | Interoperabilidade | `importadorSkillMarkdown.spec.ts` e `importarPagina.spec.ts` passam (`npm test`); a importação entra como preliminar da CGOV. | RN-033; RN-104; ESTADO-ATUAL, Task 3 | T |
| RNF-013 | A estrutura de unidades e processos deve poder ser reimportada das listas do SharePoint por um importador. | Interoperabilidade | `npm run sync:estrutura` carrega 843 unidades e 90 processos do retrato em `supabase/referencia/`; `syncEstrutura.spec.ts` e o teste `015` passam. | ESTADO-ATUAL, etapa B1; [[guia-supabase-local]] | T |
| RNF-014 | O banco deve ser PostgreSQL 15 ou mais novo, com SQL puro nas migrações, para rodar também na CGTI. | Interoperabilidade | O guia da CGTI declara PostgreSQL 15+; o Supabase local usa a versão 17 (`supabase/config.toml`, `major_version = 17`). Não há teste automático em outras versões. | [[guia-docker-cgti]] (quadro de arquitetura); `supabase/config.toml` | I |

## Capacidade de interação

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-015 | Todas as telas devem atender à WCAG 2.2 níveis A e AA, sem violação detectada pelo axe-core. | Acessibilidade | `npm run test:a11y`: **0 violações** em (16 + 4) telas × 5 larguras × 3 temas = 300 combinações; **314 testes passaram** em 5,8 min na última medição (etapa C, 2026-11-16); **precisa ser re-medido**. | [[varredura-acessibilidade]]; [[design-system]]; ESTADO-ATUAL, etapa C | T |
| RNF-016 | Nenhuma tela deve rolar para o lado em qualquer largura da varredura. | Acessibilidade | Larguras 360, 390, 768, 1280 e 1920 px; o teste reprova rolagem lateral (`tests/a11y/varredura.a11y.ts`). Última medição registrada (etapa C, 2026-11-16): a varredura passou, ou seja, sem rolagem lateral; precisa ser re-medida. | [[varredura-acessibilidade]]; `tests/a11y/telas.ts` | T |
| RNF-017 | A interface deve funcionar nos 3 temas: claro, escuro e alto contraste, com 0 violações em cada um. | Acessibilidade | Mesma varredura do RNF-015, com `TEMAS` = claro, escuro e contraste; `temas.spec.ts` passa (`npm test`). | [[design-system]] (Fase 3); `tests/a11y/telas.ts` | T |
| RNF-018 | Todo alvo de toque (botão, link, controle) no Painel do celular deve ter lado menor de pelo menos 44 px. | Acessibilidade | Alvos com lado menor que 44 px: **0** (antes eram 14 de 49), medido na etapa C (2026-11-16); teste `painelCelular.a11y.ts` e `painelCelular.spec.ts`. Fora do Painel, a medição não é automática. | ESTADO-ATUAL, etapa C; [[decisoes-tecnicas-c]] | T |
| RNF-019 | O sistema deve mostrar estado de carregamento e de erro, e avisar quando os dados foram atualizados, em vez de tela em branco. | Proteção contra erro do usuário | Painel e Riscos varridos também em `carregando` e `erro` (4 das 20 telas); `estadosCarregamento.spec.ts` passa. | ESTADO-ATUAL, etapa B3 (componentes `EstadoCarregamento`, `ErroPagina`, `AvisoAtualizacao`) | T |
| RNF-020 | Antes de apagar medições de um indicador (KRI), o formulário deve exigir confirmação explícita da pessoa. | Proteção contra erro do usuário | O formulário de risco bloqueia o salvamento enquanto a caixa de confirmação não for marcada (`confirmaApagarMedicoes`); `novoRiscoPagina.spec.ts` cobre a edição. | `src/views/FormularioRiscoView.vue`; ESTADO-ATUAL, etapa B3 | D |

## Confiabilidade

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-021 | A gravação de uma ficha de risco deve ser atômica: ou grava tudo (risco, controles, respostas, KRIs, ações) ou não grava nada. | Tolerância a falhas | `salvar_ficha_risco(ficha jsonb)` roda numa só transação; teste pgTAP `081` passa (`npm run test:db`: 17 arquivos, 840 testes, `Result: PASS`, etapa C). | [[decisoes-tecnicas-b3]] B3-3 | T |
| RNF-022 | A carga das estruturas de unidades deve ser atômica e nunca apagar dados já existentes. | Tolerância a falhas | A função do importador é atômica, não apaga e recusa mãe inexistente; teste `015` passa. | [[guia-supabase-local]] (teste `015`) | T |
| RNF-023 | O banco de dados deve ter cópia de segurança diária, cifrada, que possa ser restaurada. **Situação real: a primeira prova completa da cópia, com a ferramenta de cifragem `age`, está pendente; até lá, a cópia não deve ser tratada como testada.** | Recuperabilidade | Meta do piloto: restauração testada e repetida todo mês; rotação das 14 cópias mais recentes. Medida atual: **nenhuma restauração completa provada** (nada a medir ainda). Comandos prontos: `npm run copia:fazer`, `copia:restaurar`, `copia:conferir`. | [[guia-copia-restauracao]] (aviso de prova pendente, seção 8); [[registro-decisao-piloto-sede]] | D |
| RNF-024 | O sistema deve avisar quando a última cópia de segurança passar de 36 horas. | Recuperabilidade | Regra de horas desde a última cópia testada em `copiaRegras.spec.ts` (`npm test`). O aviso real depende da prova da cópia (RNF-023). | [[registro-decisao-piloto-sede]] (riscos do piloto); `scripts/copia/` | T |
| RNF-025 | O sistema deve continuar utilizável na falha do banco, mostrando erro claro, e voltar ao normal quando o banco voltar. | Disponibilidade | Sem meta de disponibilidade medida (sem percentual, sem monitoramento). Há tela de erro com "tentar de novo" (`ErroPagina`). A meta de disponibilidade é decisão pendente. | ESTADO-ATUAL, etapa B3 | D |
| RNF-026 | A suíte de testes deve rodar completa e passar a cada etapa entregue. | Maturidade | `npm test`: **54 arquivos e 611 testes passando**, medido em 2026-11-21 (histórico: 48 e 540 na etapa C, 2026-11-16). Última medição, etapa C (2026-11-16), **a re-medir** (exigem Docker): `npm run test:integracao` 5 arquivos e 29 testes; `npm run test:db` 840 testes, `Result: PASS`. | ESTADO-ATUAL, "Verificação final da etapa C"; `npx vitest run` em 2026-11-21 | T |

## Segurança da informação

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-027 | Cada pessoa deve ler e gravar só os riscos do seu alcance, imposto pelo próprio banco (RLS) e não só pela tela. | Confidencialidade | Testes pgTAP `030`, `040` e `041` passam (`npm run test:db`: 17 arquivos, 840 testes, `Result: PASS`, etapa C); `anon` sem privilégio nas tabelas de negócio. | RN-025; RN-026; RN-027; ESTADO-ATUAL, etapa B1 | T |
| RNF-028 | A chave `service_role` nunca deve ir para o navegador nem para a imagem Docker: o front usa só a chave pública (`anon`). | Confidencialidade | `grep -rn "service_role\|SERVICE_ROLE" src/` encontra só o comentário em `src/services/supabase.ts`; `npm run conferir:dist` faz o build falhar se o pacote tiver chave de administrador (`conferirDist.spec.ts` passa). | `src/services/supabase.ts`; `Dockerfile`; ESTADO-ATUAL, etapa C (verificação) | T |
| RNF-029 | O login deve ser só para convidados: não pode haver cadastro livre. | Autenticidade | `enable_signup = false` e `enable_anonymous_sign_ins = false` na seção `[auth]` de `supabase/config.toml`; só a CGOV cria contas, pela Edge Function `gerenciar-acesso`; `acessoUsuarios.spec.ts` e `validacoesAcesso.spec.ts` passam. | RN-030; ESTADO-ATUAL, etapa B2 | T |
| RNF-030 | Toda inclusão, alteração e exclusão em objetos, riscos, controles, tratamentos, KRIs, medições, perfis e categorias deve ficar na trilha de auditoria, e ninguém pode escrever nela diretamente. | Responsabilização | Gatilhos de auditoria (migração `20261115005`); teste pgTAP `060` passa (`npm run test:db`). | RN-095; RN-097; ESTADO-ATUAL, etapa B1 | T |
| RNF-031 | O histórico do fluxo deve guardar quem agiu, quando e, na devolução, o motivo; quem envia não valida o próprio risco. | Não repúdio | Testes `050`, `070` e `073` passam (`npm run test:db`); o histórico guarda `usuario_id` e `sequencia`. | RN-096; ESTADO-ATUAL, revisão final da B1 (D1) | T |
| RNF-032 | O servidor web deve enviar cabeçalhos de segurança, com política de conteúdo (CSP) que só liberam a própria origem, o gov.br DS e o endereço do Supabase configurado. | Integridade | `nginx/default.conf.template` define `Content-Security-Policy` (`default-src 'self'`; `connect-src` só com `${RADAR_SUPABASE_ORIGEM}`); `csp.spec.ts` e `deployConfig.spec.ts` passam (`npm run conferir:csp`). | `nginx/default.conf.template`; `Dockerfile` | T |
| RNF-033 | Dados pessoais reais nunca podem ir para o Git: a pasta `_temp/` e o arquivo `.env` ficam ignorados e testes usam só dados fictícios (`@radar.test`). | Confidencialidade | `.gitignore` lista `_temp/` e `.env`; `git status --porcelain \| grep -i '_temp'` retorna vazio (verificado na etapa C, 2026-11-16); `dadosSementeConsistencia.spec.ts` passa. | RN-101; AGENTS.md, Regras do piloto; ESTADO-ATUAL (verificações) | I |
| RNF-034 | A matrícula e o CPF dos servidores não podem ser gravados no sistema. | Confidencialidade | Nenhuma tabela tem campo de CPF; o importador `sync:atribuicoes` não copia a matrícula (ver `lerAtribuicoes.ts`); o código de `scripts/sync-atribuicoes/lerAtribuicoes.ts` declara que nunca copia a matrícula nem outra coluna; `syncAtribuicoes.spec.ts` passa. | RN-100; [[registro-decisao-piloto-sede]] §3 | T |
| RNF-035 | Os dados reais do piloto só podem ser carregados depois do Registro de Decisão da CGOV assinado, e mantidos por no máximo 6 meses contados da primeira carga. | Confidencialidade | Prazo máximo de 6 meses; no fim, exportação para a CGOV e exclusão do projeto em nuvem; as cópias cifradas são apagadas 2 meses depois. É procedimento fora do sistema, sem teste automático. | RN-102; RN-103; RN-113; RN-114; [[registro-decisao-piloto-sede]] (decisão D0-5) | I |
| RNF-036 | Nenhum e-mail do sistema pode chegar a servidores do ICMBio antes da aprovação da CGTI. Em desenvolvimento, só o Mailpit (porta 54324); envio real só ao responsável, com o aval dele. | Confidencialidade | Nenhum SMTP externo configurado em `supabase/config.toml` (bloco `[auth.email.smtp]` comentado); o ambiente local usa o Mailpit. Sem teste automático de envio. | AGENTS.md, Regras do piloto | I |
| RNF-037 | O importador de estrutura deve recusar a carga de demonstração (`--sim`) em banco remoto, salvo opção explícita. | Integridade | Regra testada em `syncEstrutura.spec.ts` e `verificarAmbiente.spec.ts` (`npm test`). | ESTADO-ATUAL, revisão final da B1 | T |

## Manutenibilidade

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-038 | O código deve ter testes automáticos de unidade e de banco que rodam com um comando cada. | Testabilidade | `npm test` (Vitest): **54 arquivos, 611 testes passando**, medido em 2026-11-21 nesta branch (na etapa C, 2026-11-16, eram 48 arquivos e 540 testes). `npm run test:db` (pgTAP): 17 arquivos, **840 testes** na etapa C (2026-11-16); **precisa ser re-medido**. | `package.json` (scripts `test`, `test:db`); ESTADO-ATUAL, etapa C | T |
| RNF-039 | A documentação deve ter estrutura protegida por teste (sequência dos ADRs, seções, IDs, siglas). | Analisabilidade | `tests/unit/documentacao.spec.ts` passa em `npm test`; a disciplina de siglas (Plano de Gestão de Riscos por extenso) é verificada por ele. | AGENTS.md, "Documentação em níveis"; `tests/unit/documentacao.spec.ts` | T |
| RNF-040 | Todo código novo deve ter comentários didáticos em português do Brasil, com exemplos, para apoiar o aprendizado do responsável e a auditoria da CGTI. | Analisabilidade | Sem medida automática; conferida na revisão do código (as migrações, o `Dockerfile` e os serviços trazem comentários explicativos). | CLAUDE.md, item 4; AGENTS.md, regra 6 | I |
| RNF-041 | A tela deve ser feita com componentes reutilizáveis e tokens de design, e não com estilos soltos. | Reusabilidade | Biblioteca de componentes (`src/components/ui/`) ligada ao Figma; `componentesUi.spec.ts` e `higieneCss.spec.ts` passam. | [[design-system]]; AGENTS.md, regras do Figma | T |
| RNF-042 | A camada de dados deve separar a fonte de demonstração da fonte do Supabase, para o front funcionar com ou sem banco. | Modularidade | Duas fontes (`fonteDemonstracao`, `fonteSupabase`) atrás da mesma interface; `fonteDemonstracao.spec.ts` e `fonteSupabaseLeitura.spec.ts` passam. | [[decisoes-tecnicas-b3]]; `src/services/dados/` | T |
| RNF-043 | Toda decisão de arquitetura nova deve ser registrada em ADR e toda mudança de cálculo deve consultar a matriz de regras antes. | Modificabilidade | ADR numerados em sequência, com teste da sequência; `docs/01-normativos/matriz-regras-regime-b.md` consultada antes de mexer em `calculadoraRiscoRadar.ts` ou nas migrações. | [[0001-registrar-decisoes-em-adr-nygard]]; CLAUDE.md, item 2 | I |

## Flexibilidade

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-044 | O sistema deve poder ser instalado em um container Docker com um comando. | Instalabilidade | `docker compose up -d --build` sobe o front na porta 8080 em modo demonstração; imagem em duas etapas (Node 22 e Nginx 1.27). `deployConfig.spec.ts` passa. | `Dockerfile`; `docker-compose.yml`; CLAUDE.md (comandos) | D |
| RNF-045 | O mesmo front deve funcionar em modo demonstração (sem banco) e em modo real (com Supabase), escolhido na construção da imagem. | Adaptabilidade | Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` vazias dão modo demonstração; `verificarAmbiente.spec.ts` passa. | `Dockerfile` (argumentos de build); [[guia-docker-cgti]] | T |
| RNF-046 | O banco deve poder ser levado de um ambiente para outro por migrações em SQL versionadas. | Substituibilidade | 12 arquivos em `supabase/migrations/`, aplicados do zero por `npm run db:reset`; `schemaSql.spec.ts` passa. | `supabase/migrations/`; [[guia-supabase-local]]; [[guia-supabase-nuvem]] | T |
| RNF-047 | A escala prevista é a do piloto da Sede (843 unidades e 90 processos importados, 19 usuários de demonstração, 10 riscos). | Escalabilidade | Sem teste de carga e sem meta de usuários simultâneos: **não há medição** de escalabilidade. A paginação (RNF-006) evita o limite de 1.000 linhas. | ESTADO-ATUAL, etapa B1 | A |

## Proteção (*safety*)

Aqui "proteção" é evitar dano a quem usa o sistema e às decisões de governança: não perder nem apagar o que foi decidido.

| ID | Enunciado | Subcaracterística | Critério de aceitação | Origem | Verificação |
| --- | --- | --- | --- | --- | --- |
| RNF-048 | O risco aprovado não pode ser apagado, nem pela exclusão do objeto. Só se exclui risco em rascunho, devolvido ou preliminar da CGOV. | Restrição operacional (tradução livre) | Testes pgTAP `041`, `050` e `072` passam (`npm run test:db`); a tela de objetos recusa a exclusão com risco aprovado. | RN-050; RF-029; RF-055; ESTADO-ATUAL, revisão final da B1 (D2) | T |
| RNF-049 | Risco aprovado que mude de categoria, de objeto ou de criticidade calculada deve reabrir o fluxo, e não mudar em silêncio. Exceção: o risco que deixa de ser crítico por mudança do apetite só tem a criticidade atualizada (RN-054). | Fail safe (tradução livre) | Gatilho do fluxo em `20261115004_fluxo_aprovacao.sql`; testes `050`, `073` e `080` passam (`npm run test:db`). | ESTADO-ATUAL, revisão final da B1; RN-038; RN-054 | T |
| RNF-050 | Ações destrutivas ou que mudam a responsabilidade devem pedir confirmação: apagar medições de KRI e reatribuir objeto. | Aviso de perigo | Confirmação marcada em `FormularioRiscoView.vue` e botão "Confirmar reatribuição" em `CatalogoObjetosView.vue`; `objetosPagina.spec.ts` passa. Não há medição de que toda exclusão tenha confirmação. | `src/views/FormularioRiscoView.vue`; `src/views/CatalogoObjetosView.vue` | D |
| RNF-051 | O risco com residual fora do apetite da DAR deve ser identificado como risco crítico e seguir para homologação, e a categoria sem DAR deve ficar marcada como pendente. | Identificação de risco | Testes `073` e `080` passam (`npm run test:db`); RN-005, RN-010 e RN-041 registram a regra. "Crítico" nunca é o nome de uma faixa do Quadro 8. | RN-005; RN-010; RN-041; AGENTS.md, regra 3 | T |
