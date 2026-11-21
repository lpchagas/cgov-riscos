---
tipo: requisitos
data: 2026-11-21
status: "Rascunho — catálogos RN, RF, RNF e casos de uso entram nas Tarefas 9 a 13"
fontes:
  - "ISO/IEC/IEEE 29148:2018, seção 9.6 (conteúdo da especificação de requisitos de software)"
  - "[[visao-produto]], [[mapa-processos]], [[lacunas-norma-sistema]] (Nível 1)"
  - "[[matriz-acesso-responsabilidades]]"
relacionados: "[[visao-produto]] · [[matriz-acesso-responsabilidades]] · [[GLOSSARIO-ACESSIVEL]]"
tags: [nivel2, ers, requisitos, iso-29148]
---

# ERS do RADAR — Especificação de Requisitos de Software

> **Em uma frase:** a ERS (Especificação de Requisitos de Software) é o documento-base que diz **o que o sistema RADAR deve fazer e com que qualidade**, sem dizer como será programado. Ela organiza os catálogos de regras e requisitos: quem ler só este arquivo já sabe onde achar cada coisa.

> **Situação normativa (2026-11-21):** a Política (SEI `024241420`) e a Metodologia (SEI `024421455`) são **minutas na PFE, ainda não publicadas**. Até a publicação, o **Regime B** (essas minutas, com o texto saneado de 20/11/2026) é a base do sistema, conforme o `AGENTS.md`. Depois da publicação haverá revisão sistêmica (seção 9).

## 1. Propósito

Esta ERS reúne, em um só lugar, os requisitos do RADAR no padrão **ISO/IEC/IEEE 29148:2018** (seção 9.6), sem histórias de usuário. Serve a três públicos:

- a **CGOV**, para conferir se o sistema cumpre a Política e a Metodologia;
- a **CGTI**, para avaliar o que será homologado (ver [[guia-docker-cgti]]);
- o **desenvolvedor**, para saber o que construir e testar.

A visão de negócio (problema, objetivos, partes interessadas) está em [[visao-produto]]; esta ERS não a repete.

## 2. Escopo

**O produto** é o sistema web **RADAR** (Rede de Avaliação, Diagnóstico e Ação em Riscos) da CGOV/ICMBio. Ele registra, calcula, valida e acompanha riscos como a Política e a Metodologia mandam, com rastro de quem decidiu o quê ([[visao-produto]], seção 1).

**Dentro do escopo** (ciclo 2026–2027, [[visao-produto]], seção 5): as funções listadas na seção 6.2, o piloto com dados reais da Sede (Presidência, DIPLAN, DIMAN, DISAT e DIBIO) e a entrega em contêiner Docker para homologação da CGTI.

**Fora do escopo** ([[visao-produto]], seção 4): a análise de risco feita por inteligência artificial dentro do sistema (o RADAR **recebe** as fichas preliminares geradas fora dele); e a ferramenta do Programa de Gestão para Resultados e Inovação (Portaria ICMBio nº 1.572/2023), que é outro assunto.

**Lacunas conhecidas:** onde a norma pede algo que o sistema ainda não faz, o registro está em [[lacunas-norma-sistema]] (LAC-01 a LAC-15). Cada lacuna aberta vira requisito nos catálogos das Tarefas 9 a 13.

## 3. Definições

Os termos e siglas estão em [[GLOSSARIO-ACESSIVEL]]. Os essenciais para ler esta ERS:

| Termo | Significado curto |
| --- | --- |
| **RADAR** | Nome da Política de Gestão de Riscos do ICMBio (minuta SEI `024241420`) e do sistema que a operacionaliza |
| **DAR** | Declaração de Apetite a Riscos (Anexo III da Metodologia) |
| **KRI** | Indicador-Chave de Risco |
| **Risco Crítico** | Risco cujo nível residual está **fora do apetite** definido na DAR. Não é sinônimo do nível Extremo |
| **Plano de Gestão de Riscos** | Documento que consolida a carteira de riscos críticos. Escreve-se por extenso, nunca por sigla |
| **Regime B** | Modelo da Política RADAR e da nova Metodologia (minutas), base do sistema |

Os níveis de classificação (Quadro 8) são **Baixo (1 a 5), Médio (> 5 a 10), Alto (> 10 a 17) e Extremo (> 17 a 25)**. Ver [[matriz-regras-regime-b]].

## 4. Referências

| Referência | Versão/data | Onde está no repositório |
| --- | --- | --- |
| ISO/IEC/IEEE 29148:2018 — Engenharia de requisitos | 2018 | Só citada (norma paga, sem cópia) |
| ISO/IEC 25010:2023 — Modelo de qualidade de produto (9 características) | 2023 | Só citada |
| SWEBOK v4 — área *Software Requirements* | v4 | Só citado |
| Minuta da Política de Gestão de Riscos (RADAR), SEI `024241420` | 15/09/2026, revisada em 21/10/2026 | `docs/01-normativos/Minuta_Portaria_Politica_Gestao_Riscos_SEI_024241420.md` |
| Minuta da Metodologia de Gestão de Riscos, SEI `024421455` | 26/03/2026 (data do cabeçalho da transcrição), revisada em 21/10/2026 | `docs/01-normativos/Minuta_Portaria_Metodologia_Gestao_Riscos_SEI_024421455.md` |
| Texto saneado da 4ª rodada (legística, auditoria de competências, modelagem) | 20/11/2026 | `docs/01-normativos/revisao-2026/` (ver `README.md`; o `NT_ESTADO.md` prevalece em conflito) |
| Alertas normativos F4 e F5 | 20/11/2026 | [[registro-alertas-f4-f5]] |
| Decreto nº 9.203/2017 — Política de Governança da APF | 2017 | [[20171122_Decreto 9203_Política de Governança APF]] |
| Portaria ICMBio nº 4.529/2025 — CTGRIC | 2025 | Não transcrita; citada em [[contexto-revisao-politica-metodologia]] e em [[F3-aprovacao-dar-plano]] |
| Portaria ICMBio nº 253/2026 — Programa Integra+ | 2026 | Não transcrita; regras de uso em [[matriz-regras-regime-b]] e no `AGENTS.md` |
| Portaria ICMBio nº 5.592/2025 — Regimento Interno | DOU 31/12/2025 | Não transcrita; árvore de unidades em [[matriz-acesso-responsabilidades]], seção 3 |
| Lei nº 13.709/2018 — LGPD | 2018 | Só citada; regras do projeto no `AGENTS.md` |
| Regras de negócio do Regime B | vigente | [[matriz-regras-regime-b]] |
| Perfis, alcance e fluxo | 2026-11-15 | [[matriz-acesso-responsabilidades]] |

## 5. Visão geral do produto

A visão de produto (problema, partes interessadas, objetivos, não-objetivos, escopo e métricas) está em [[visao-produto]]. Os processos e fluxos oficiais (F1 a F4 e o fluxo interno FS-01) estão em [[mapa-processos]] e em `docs/10-nivel1-negocio/fluxos/`. Esta ERS parte deles e não os redefine.

## 6. Perspectiva, funções, usuários, restrições e premissas

### 6.1 Perspectiva do produto

O RADAR é um **aplicativo web de página única** (Vue 3 + TypeScript) com banco e autenticação no **Supabase**, empacotado em **Docker** para a CGTI ([[guia-docker-cgti]], [[guia-supabase-local]], [[guia-supabase-nuvem]]). Não substitui o SEI: decisões de CTGRIC, CIG e Presidente acontecem fora dele (reunião, ata, portaria), e o RADAR registra o resultado ([[lacunas-norma-sistema]], LAC-02). Recebe fichas preliminares geradas fora do sistema pela tela Importar ([[visao-produto]], seção 1).

### 6.2 Funções do produto

Módulos que organizam os catálogos das Tarefas 9 a 13:

- **Acesso:** login só de convidados, cadastro de usuários e perfis pela CGOV, alcance de leitura por perfil.
- **Estrutura:** árvore de unidades e vínculo com a Coordenação Territorial.
- **Objetos:** catálogo de objetos de contexto (processos, projetos, ações) mantido pela CGOV.
- **Riscos:** ficha de risco, cálculo pelos Quadros 6, 7 e 8, controles com trava de evidência, tratamento e Teste de Integridade.
- **Fluxo interno (FS-01):** validação pela chefia e homologação, em 3 degraus ([[FS-01-validacao-interna-risco]]).
- **DAR:** apetite por categoria e identificação do risco crítico.
- **Monitoramento/KRI:** indicadores, medições e alertas.
- **Reavaliação:** reavaliação periódica e por fato relevante.
- **Comunicação de fatos:** comunicação à CGOV de mudanças, falhas e materializações.
- **Plano de Gestão de Riscos:** consolidação da carteira de riscos críticos e suas versões.
- **Acompanhamento pela CGOV:** lista de pendências e cobrança.
- **Relatórios e avaliação:** relatórios trimestrais e avaliação anual de maturidade.
- **Auditoria:** trilha de quem fez o quê e quando.
- **Importação:** carga das fichas preliminares e das tabelas de estrutura.

Fonte da lista: [[visao-produto]] (seção 5), [[mapa-processos]] e [[lacunas-norma-sistema]]. O que cada módulo faz hoje e o que falta está nesses documentos.

### 6.3 Usuários

São **10 perfis**, conferidos em [[matriz-acesso-responsabilidades]] (seção 5) e na regra `CHECK` do campo `papel_governanca` da tabela `perfis_usuarios` (`supabase/migrations/20261115001_unidades_perfis_processos.sql`, linhas 85 a 90). Todo perfil é, no mínimo, gestor de riscos da própria unidade (matriz, achado A5).

| Perfil | Quem representa | Base |
| --- | --- | --- |
| `gestor` | Chefes de UC e NGI, Coordenadores, chefes de Divisão/Serviço/Setor, Coordenadores de Centro, Chefe da ACADEBio, responsáveis por processo, Procurador-Chefe, Corregedor, Ouvidor, CGCS | Matriz, seção 5; Política art. 17, § 1º |
| `coordenador_territorial` | Coordenador Territorial; valida fichas dos NGIs e UCs da CT | Matriz, seção 5; Regimento art. 16 e 193 |
| `gerente_regional` | Gerente Regional; valida e homologa na GR | Matriz, seção 5; Regimento art. 191 |
| `coordenador_geral` | Coordenadores-Gerais; leitura também por macroprocesso | Matriz, seções 4 e 5; Regimento art. 4º e 185 |
| `diretor` | Diretores; alta administração, leitura total, valida e homologa na Sede | Matriz, seção 5; Decreto 9.203/2017, art. 17 |
| `presidencia` | Presidente e Assessoria; leitura total, homologa riscos ligados a ela | Matriz, seção 5 (decisão P-B1-1) |
| `auditoria` | Auditor-Chefe e AUDIT (3ª linha); leitura total, somente leitura | Matriz, seção 5; Decreto art. 18; Política art. 16 |
| `cgov` | Servidores da CGOV (2ª linha); consolida o Plano, simula a DAR, importa, mantém objetos e cadastra usuários | Matriz, seção 5; Política art. 15 |
| `cgge` | Servidores da CGGE; supervisão, leitura total | Matriz, seção 5; Política art. 14 |
| `gabin` | Chefe de Gabinete e equipe; valida os riscos da Presidência | Matriz, seção 5 (decisão P-B1-1) |

CIG, CTGRIC e Presidente (quando decide por portaria) **decidem fora do sistema** e não têm perfil próprio ([[visao-produto]], seção 2).

### 6.4 Restrições

- **Interface:** gov.br Design System (`@govbr-ds/core`) e acessibilidade WCAG ([[design-system]]).
- **Entrega:** contêiner Docker, para homologação da CGTI ([[guia-docker-cgti]]).
- **LGPD e dados pessoais:** dados reais só no ambiente do piloto e em cópias cifradas fora do Git; nunca no repositório, nos testes ou nos documentos (`AGENTS.md`, regras do piloto; Lei nº 13.709/2018).
- **E-mail:** nenhum e-mail do sistema a servidores do ICMBio antes da aprovação da CGTI; em desenvolvimento só o Mailpit (`AGENTS.md`).
- **Cálculo:** Risco Inerente lido da tabela fixa de 25 células do Quadro 7 (nunca Probabilidade × Impacto); Residual = Inerente × Fator do Quadro 6, com trava de evidência (sem evidência, no máximo Fraco, 0,9); níveis do Quadro 8 aplicados **sem arredondar** (`AGENTS.md`, regras 2 a 4; [[matriz-regras-regime-b]]).
- **Risco Crítico:** é o risco com nível residual **fora do apetite da DAR**; nunca a faixa 18 a 25 (`AGENTS.md`, regra 3).
- **Integridade:** é proibida a categoria mista de operacional com integridade; aplica-se o Teste de Integridade com as 6 subcategorias do Quadro 3 (`AGENTS.md`, regra 5).
- **Nuvem:** nada é aplicado ao banco, publicado ou configurado na nuvem sem autorização explícita a cada passo (`AGENTS.md`).

### 6.5 Premissas e dependências

- **Listas do SharePoint** (estrutura de unidades e Cadeia de Valor): fonte da carga inicial; o retrato atual tem 152 unidades ativas ([[visao-produto]], seção 5).
- **SMTP:** serviço de e-mail para o login por link; só depende de aprovação da CGTI para servidores ([[visao-produto]], seção 4; `AGENTS.md`).
- **Supabase:** banco, autenticação e Edge Functions ([[guia-supabase-nuvem]]).
- **Publicação das portarias:** a Política e a Metodologia seguiram como minutas para a PFE. Se o texto publicado mudar, os requisitos são revistos (seção 9). Continua em aberto a transição com a Portaria ICMBio nº 975/2021 (alerta F1-04, [[registro-alertas-f4-f5]]).
- **Conta institucional:** a CGTI cuida do login institucional na homologação ([[matriz-acesso-responsabilidades]], P6).
- **Registro de Decisão da CGOV** assinado antes da primeira carga de dados reais (`AGENTS.md`; [[registro-decisao-piloto-sede]]).

## 7. Requisitos específicos

Os requisitos ficam em catálogos próprios, criados nas **Tarefas 9 a 13** do plano ([[2026-11-20-reestruturacao-documentacao-plan]]). **Ainda não existem**; os links abaixo passam a funcionar quando cada tarefa terminar.

| Catálogo | Conteúdo | Formato do ID | Tarefa |
| --- | --- | --- | --- |
| [[regras-negocio]] | Regras de negócio vindas da norma ("…deve/não pode…", sem citar tela) | `RN-NNN` (ex.: `RN-007`) | 9 |
| [[requisitos-funcionais]] | O que o sistema faz ("O sistema deve…") | `RF-NNN` (ex.: `RF-021`) | 10 |
| [[requisitos-nao-funcionais]] | Qualidade, pelas 9 características da ISO/IEC 25010:2023 | `RNF-NNN` (ex.: `RNF-012`) | 11 |
| Pasta `casos-de-uso/` (modelo em [[_modelo]]) | Um arquivo por caso de uso | `UC-NN` (ex.: `UC-09`) | 12 |
| [[rastreabilidade]] | Liga norma, RN, RF, UC, tela e teste | — | 13 |

Cada catálogo de RN, RF e RNF é uma tabela Markdown cujas **colunas obrigatórias** são `ID`, `Enunciado` e `Origem` (as duas primeiras, nessa ordem). A **Origem** diz de onde vem o requisito (artigo da norma, alerta F4/F5, lacuna LAC-NN, decisão da CGOV). Um bom requisito é necessário, apropriado, inequívoco, completo, singular, viável, verificável, correto e conforme (ISO/IEC/IEEE 29148:2018).

## 8. Verificação

Cada requisito leva, no catálogo, **uma letra** com o método pelo qual se prova que foi atendido:

| Letra | Método | Em linguagem simples | Exemplo no RADAR |
| --- | --- | --- | --- |
| **I** | Inspeção | Olhar o documento, o código ou a configuração | Conferir que o texto das telas diz "Plano de Gestão de Riscos" por extenso |
| **A** | Análise | Raciocinar ou calcular a partir dos dados e da norma | Comparar a tabela do Quadro 7 do banco com a da Metodologia |
| **D** | Demonstração | Usar o sistema diante de quem confere, sem medir | A CGOV mostra a importação de uma ficha preliminar em demonstração |
| **T** | Teste | Rodar um teste automatizado que passa ou falha | `npm test` (regras e documentação), `npm run test:db` (banco e RLS), `npm run test:a11y` (acessibilidade) |

Os comandos estão em `package.json` (`test`, `test:db`, `test:a11y`, `test:integracao`).

## 9. Gestão de mudanças

- **Versão do requisito:** requisito alterado ganha **nova versão** na tabela do catálogo, com a data e o motivo.
- **ID nunca reutilizado:** o número de um requisito (`RN-007`, `RF-021`…) nunca volta a ser usado, mesmo depois de retirado.
- **Requisito retirado** continua na tabela com a situação **"retirado"**, para preservar a rastreabilidade.
- **Mudança de norma:** quando a Política ou a Metodologia forem publicadas, ou mudarem, faz-se a **revisão sistêmica** das regras e dos requisitos, como manda o `AGENTS.md`; o projeto passa para uma nova versão.
- **Decisão arquitetural:** vira um **ADR** em `docs/adr/` ([[0001-registrar-decisoes-em-adr-nygard]]); ADR `Accepted` é imutável.
- **Cálculo, alcance, RLS e fluxo:** não se alteram sem decisão da CGOV (`AGENTS.md`).
