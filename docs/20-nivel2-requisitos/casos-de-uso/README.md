# Casos de uso do RADAR (UC-01 a UC-26)

Um **caso de uso** conta, passo a passo, como um ator (perfil, não pessoa) usa o RADAR para chegar a
um resultado, e o que acontece quando algo dá errado. Cada arquivo segue o [[_modelo]] (Jacobson e
Cockburn), com as 7 seções na ordem que o teste `tests/unit/documentacao.spec.ts` exige. Os passos
citam as regras de negócio ([[regras-negocio]], `RN-NNN`); a linha de metadados no topo de cada caso
cita os requisitos funcionais atendidos ([[requisitos-funcionais]], `RF-NNN`), a origem (fluxo,
dispositivo ou decisão da CGOV) e a situação.

**Situação:** `implementado` (o sistema já faz), `parcial` (faz uma parte; a lacuna diz o que falta) ou
`proposto (LAC-NN)` (a norma exige, o sistema ainda não faz; ver [[lacunas-norma-sistema]]). Onde o
sistema ainda não trata uma exceção, o caso de uso descreve o que acontece hoje e diz "(não tratado
pelo sistema; cartão no Kanban)" ([[quadro]]).

**Quem não usa o sistema.** O CTGRIC e o CIG não entram no RADAR. O Presidente do ICMBio usa o perfil
`presidencia` só para homologar os riscos críticos ligados à Presidência (UC-10); a deliberação do CIG que ele
preside e a publicação acontecem fora do sistema. O que os colegiados decidem é registrado pela CGOV, que é a Secretaria-Executiva do CTGRIC (UC-18 e UC-25).

## Índice por ator

| Ator | UC |
| --- | --- |
| Servidor convidado | [[UC-01-entrar-por-link-de-email\|UC-01]] |
| CGOV | [[UC-02-gerenciar-usuarios-e-perfis\|UC-02]], [[UC-04-cadastrar-objeto-de-gestao\|UC-04]], [[UC-12-elaborar-ficha-preliminar-de-risco\|UC-12]], [[UC-14-propor-declaracao-de-apetite-a-riscos\|UC-14]], [[UC-17-verificar-e-consolidar-plano\|UC-17]], [[UC-19-emitir-relatorio-trimestral\|UC-19]], [[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias\|UC-22]], [[UC-23-revisar-plano-de-gestao-de-riscos\|UC-23]], [[UC-26-registrar-avaliacao-gerencial-anual\|UC-26]] |
| CGOV (técnico) | [[UC-03-sincronizar-estrutura-e-cadeia-de-valor\|UC-03]] |
| CGOV (secretaria do CTGRIC) | [[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig\|UC-18]], [[UC-25-registrar-publicacao-da-dar-e-do-plano\|UC-25]] |
| Gestor de riscos | [[UC-05-identificar-e-registrar-risco\|UC-05]], [[UC-06-analisar-risco-e-avaliar-controles\|UC-06]], [[UC-07-definir-tratamento-plano-de-acao-e-kri\|UC-07]], [[UC-08-enviar-risco-para-validacao\|UC-08]], [[UC-15-registrar-medicao-de-kri-e-tratar-alerta\|UC-15]], [[UC-16-comunicar-fato-de-risco-a-cgov\|UC-16]], [[UC-21-comunicar-risco-critico-para-o-plano\|UC-21]], [[UC-24-reavaliar-risco\|UC-24]] |
| Gestor de riscos / CGOV (hoje só a CGOV) | [[UC-13-importar-riscos-da-tabela-da-skill\|UC-13]] |
| Chefia imediata (validador: CT, GR, Coordenador-Geral, Diretor; GABIN na Presidência) | [[UC-09-validar-risco\|UC-09]], [[UC-11-devolver-risco-para-ajuste\|UC-11]] |
| Homologador (Gerente Regional, Diretor ou Presidente) | [[UC-10-homologar-risco\|UC-10]], [[UC-11-devolver-risco-para-ajuste\|UC-11]] |
| Qualquer perfil com acesso | [[UC-20-consultar-painel-e-trilha-de-auditoria\|UC-20]] |

## Lista completa

| UC | Título | Ator principal | Situação |
| --- | --- | --- | --- |
| [[UC-01-entrar-por-link-de-email\|UC-01]] | Entrar no RADAR por link de e-mail | Servidor convidado | implementado |
| [[UC-02-gerenciar-usuarios-e-perfis\|UC-02]] | Gerenciar usuários e perfis | CGOV | implementado |
| [[UC-03-sincronizar-estrutura-e-cadeia-de-valor\|UC-03]] | Sincronizar estrutura organizacional e Cadeia de Valor | CGOV (técnico) | implementado |
| [[UC-04-cadastrar-objeto-de-gestao\|UC-04]] | Cadastrar objeto de gestão de riscos | CGOV (ver a decisão no próprio UC) | implementado |
| [[UC-05-identificar-e-registrar-risco\|UC-05]] | Identificar e registrar risco (com Teste de Integridade) | Gestor de riscos | implementado |
| [[UC-06-analisar-risco-e-avaliar-controles\|UC-06]] | Analisar risco e avaliar controles existentes | Gestor de riscos | implementado |
| [[UC-07-definir-tratamento-plano-de-acao-e-kri\|UC-07]] | Definir tratamento, plano de ação e KRI | Gestor de riscos | parcial (LAC-03) |
| [[UC-08-enviar-risco-para-validacao\|UC-08]] | Enviar risco para validação | Gestor de riscos | implementado; fluxo interno sem base nas minutas (LAC-11) |
| [[UC-09-validar-risco\|UC-09]] | Validar risco | Chefia imediata / Coordenador-Geral | implementado; fluxo interno sem base nas minutas (LAC-11) |
| [[UC-10-homologar-risco\|UC-10]] | Homologar risco | Diretor / Presidente (homologador efetivo) | implementado; fluxo interno sem base nas minutas (LAC-11) |
| [[UC-11-devolver-risco-para-ajuste\|UC-11]] | Devolver risco para ajuste | Validador ou homologador (CGOV sem ator efetivo) | implementado; fluxo interno sem base nas minutas (LAC-11) |
| [[UC-12-elaborar-ficha-preliminar-de-risco\|UC-12]] | Elaborar ficha preliminar de risco | CGOV | implementado |
| [[UC-13-importar-riscos-da-tabela-da-skill\|UC-13]] | Importar riscos da tabela da skill | Gestor de riscos / CGOV | implementado |
| [[UC-14-propor-declaracao-de-apetite-a-riscos\|UC-14]] | Propor a Declaração de Apetite a Riscos | CGOV | parcial (LAC-08: hoje a CGOV altera o apetite direto) |
| [[UC-15-registrar-medicao-de-kri-e-tratar-alerta\|UC-15]] | Registrar medição de KRI e tratar alerta | Gestor de riscos | parcial (LAC-03) |
| [[UC-16-comunicar-fato-de-risco-a-cgov\|UC-16]] | Comunicar fato de risco à CGOV (6 hipóteses) | Gestor de riscos | proposto (LAC-04) |
| [[UC-17-verificar-e-consolidar-plano\|UC-17]] | Verificar e consolidar o Plano de Gestão de Riscos | CGOV | proposto (LAC-01) |
| [[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig\|UC-18]] | Registrar a manifestação do CTGRIC e a deliberação do CIG sobre a DAR e o Plano | CGOV (secretaria) | proposto (LAC-02) |
| [[UC-19-emitir-relatorio-trimestral\|UC-19]] | Emitir relatório trimestral ao CTGRIC e ao CIG | CGOV | proposto (LAC-05) |
| [[UC-20-consultar-painel-e-trilha-de-auditoria\|UC-20]] | Consultar painel e trilha de auditoria | Qualquer perfil com acesso | implementado |
| [[UC-21-comunicar-risco-critico-para-o-plano\|UC-21]] | Comunicar risco crítico para composição do Plano | Gestor de riscos | proposto (LAC-01) |
| [[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias\|UC-22]] | Acompanhar a carteira crítica e cobrar pendências | CGOV | proposto (LAC-09) |
| [[UC-23-revisar-plano-de-gestao-de-riscos\|UC-23]] | Revisar o Plano de Gestão de Riscos | CGOV | proposto (LAC-07) |
| [[UC-24-reavaliar-risco\|UC-24]] | Reavaliar risco (anual ou por fato) | Gestor de riscos | proposto (LAC-10) |
| [[UC-25-registrar-publicacao-da-dar-e-do-plano\|UC-25]] | Registrar a publicação da DAR e do Plano | CGOV (secretaria) | proposto (LAC-02) |
| [[UC-26-registrar-avaliacao-gerencial-anual\|UC-26]] | Registrar a avaliação gerencial anual | CGOV | proposto (LAC-06) |

## Uniões e divisões

A lista do plano (26 casos, revisada contra os fluxos oficiais em 20/11/2026) foi **mantida**: nenhum
caso foi unido nem dividido. Três ajustes de leitura, sem mudar a lista:

- **UC-04:** o ator principal ficou **CGOV**, e não o gestor de riscos da tabela do plano. As minutas não
  dizem quem seleciona os objetos (alerta LS-04, aberto), e a [[matriz-acesso-responsabilidades]] (§5 e
  §7) dá o catálogo à CGOV. A divergência com o banco, que aceita objeto criado pela unidade na própria
  unidade (`supabase/tests/041`, bloco 5), está na exceção 1b do UC-04 e na nota 1 de
  [[requisitos-funcionais]], para a CGOV decidir.
- **UC-13:** o ator continua "Gestor de riscos / CGOV", como no plano, mas hoje só a CGOV importa (RN-033;
  decisão P5); o gestor recebe o resultado como ficha preliminar (UC-12).
- **UC-05, UC-06 e UC-07:** no sistema, a ficha é preenchida em etapas e gravada de uma vez. Os três
  casos ficaram separados porque a norma separa identificação (4.2), análise (4.3 e 4.4) e tratamento
  (4.5 e 4.7.1).
