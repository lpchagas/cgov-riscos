# Visão de produto do RADAR

> **Em uma frase:** o RADAR (sistema web) é o lugar onde a CGOV e os gestores do ICMBio registram, calculam, validam e acompanham os riscos, do jeito que a Política de Gestão de Riscos e a Metodologia mandam, com rastro de quem decidiu o quê.
>
> **Situação normativa (2026-11-20):** a Política (SEI `024241420`) e a Metodologia (SEI `024421455`) são **minutas que seguiram para a PFE e ainda não foram publicadas** (ver [[NT_ESTADO]], pasta `docs/01-normativos/revisao-2026/`). Até a publicação, o **Regime B** (essas minutas) é a base dos fluxos do sistema, conforme o `AGENTS.md`. Continua **em aberto** a regra de transição com a Portaria ICMBio nº 975/2021, que a minuta não revoga (alerta **F1-04**, ver [[registro-alertas-f4-f5]]). Quando as normas forem publicadas, haverá revisão sistêmica das regras e uma nova versão desta visão.
>
> **Como ler as citações:** "Art. Nº" sem outra indicação é a minuta da Política. Quando o texto do artigo mudou no saneamento de legística de 2026-11-20, a citação traz os dois textos e diz qual vale: **vale o texto saneado**, por ser a redação proposta mais recente (fontes: [[Saneamento_Legistica_Aprovacao_Plano_DAR_2026-11-20]] §3.1 e [[Saneamento_Legistica_F4-05_a_F4-09_2026-11-20]] §3.1, 3.2 e 3.4). Como a minuta ainda não foi publicada, nenhum dos dois textos é norma vigente.

## 1. Problema

O ICMBio está trocando o modelo antigo de gestão de riscos (Regime A: Portarias nº 255/2020 e nº 975/2021; a minuta da Política revoga só a nº 255/2020, Art. 20, e a nº 975/2021 não é revogada, alerta F1-04) pelo modelo novo da Política RADAR (Regime B). Sem uma ferramenta, a troca esbarra em quatro dificuldades práticas:

1. **Tela em branco para o gestor.** O gestor de riscos (1ª linha) precisa identificar, analisar, avaliar, tratar, monitorar e comunicar riscos (Art. 17, I), mas não tem onde fazer isso de forma padronizada.
2. **Cálculo que costuma dar errado.** A Metodologia exige a matriz assimétrica (Quadro 7), os fatores de controle com trava de evidência (Quadro 6) e as faixas sem arredondamento (Quadro 8). Multiplicar Probabilidade × Impacto é proibido (`AGENTS.md`, regra 2): o Quadro 7 é uma tabela fixa, e uma planilha solta não impede o erro.
3. **Decisão sem rastro.** A carteira de **riscos críticos** (riscos fora dos limites da Declaração de Apetite a Riscos, **DAR**; Art. 8º, §1º) precisa chegar à CGOV, ser consolidada no Plano de Gestão de Riscos e ser acompanhada. Sem sistema, não há registro de quem validou, quem homologou e quando.
4. **Alcance diferente por cargo.** Presidência, Diretorias, Coordenações-Gerais, Gerências Regionais e unidades enxergam e decidem coisas diferentes ([[matriz-acesso-responsabilidades]]).

Para não deixar o gestor diante da tela em branco, a equipe da CGOV gera **fichas preliminares de risco** fora do sistema, com a skill `cgov-gestao-riscos`, e o RADAR as recebe pela tela Importar. O sistema **recebe** o produto dessa análise; não executa a análise por inteligência artificial (origem: design v2.0, §1.1 e §3.2, em [[2026-11-09-cgov-riscos-radar-design]]).

Além disso, o projeto tem três propósitos registrados no design v2.0 (§1.2): operacionalizar a Política e a Metodologia (acima), e mais dois, práticos: ser um **protótipo validável pela CGTI** (empacotado em Docker, pronto para homologação) e servir de **escola prática** para o responsável, com o cofre Obsidian como memória.

## 2. Partes interessadas

A tabela usa as competências da minuta da Política (Cap. V) e a [[matriz-acesso-responsabilidades]] para os perfis do sistema. A coluna "Usa o sistema?" separa quem **opera** o RADAR de quem **decide fora dele**.

| Parte interessada | Papel (linha) | Base normativa | O que espera do RADAR | Usa o sistema? |
| --- | --- | --- | --- | --- |
| **CIG** (Comitê Interno de Governança) | Alta administração; decide | Art. 12. Texto da minuta: XI "apreciar reportes periódicos". Texto saneado: XI "aprovar, em deliberações sucessivas na mesma reunião e nesta ordem, a DAR e o Plano de Gestão de Riscos, após manifestação do CTGRIC" e XII "apreciar reportes". **Vale o saneado.** Art. 12, V: define os níveis de apetite | Receber da CGOV a DAR e o Plano prontos para deliberar, e os relatórios periódicos | **Não diretamente.** A CGOV registra a deliberação (caso de uso previsto, UC-18, ver [[2026-11-20-reestruturacao-documentacao-plan]]) |
| **CTGRIC** (Comitê Técnico de Governança de Riscos, Integridade e Controles) | Órgão consultivo e propositivo | Art. 13, II (supervisiona a elaboração e o monitoramento do Plano). Texto saneado: §1º (manifestação prévia à deliberação do CIG), §2º (a CGOV não vota sobre o Plano) e §3º (a AUDIT não vota sobre a DAR nem sobre o Plano) | Ter a carteira de riscos críticos e a maturidade da gestão de riscos para se manifestar | **Não diretamente.** A CGOV registra a manifestação (UC-18) |
| **CGGE** (Coordenação-Geral de Governança e Gestão Estratégica) | Supervisão | Art. 14, I. Texto saneado do inciso II: atua na Unidade Setorial do SITAI quanto aos riscos para a integridade (a minuta dizia "supervisionar... as atividades" da unidade setorial). **Vale o saneado** | Acompanhar a implantação da Política | **Sim.** Perfil `cgge`: lê todas as unidades e edita só as fichas da própria CGGE; não age no fluxo de aprovação ([[matriz-acesso-responsabilidades]] §5, §8 item 3 e §7; função de alcance em `20261115002_funcoes_alcance.sql`) |
| **CGOV** (Coordenação de Governança) | **2ª linha**; dona do produto | Art. 15. Texto saneado do inciso IX: "**acompanhar** a carteira de riscos críticos... sem prejuízo do mérito das decisões de risco adotadas na 1ª linha"; a minuta dizia "monitorar". Inciso X saneado: reportar a maturidade ao CTGRIC anualmente. **Vale o saneado.** Incisos I a VII: instrumentos, orientação técnica, reporte ao CIG | Importar fichas, consolidar o Plano de Gestão de Riscos, simular a DAR, cobrar pendências, manter o catálogo de objetos, cadastrar usuários | **Sim.** Perfil `cgov` |
| **Gestores de riscos** (Presidente, Diretores, Coordenadores-Gerais, Coordenadores, Gerentes Regionais, chefes de unidades e responsáveis por processos) | **1ª linha** | Art. 17, caput e incisos I a VI; §1º (lista de gestores). Texto saneado do inciso IV: comunicar à CGOV "nos prazos e nas hipóteses da Metodologia" os riscos emergentes e as falhas de controles (a minuta dizia "tempestivamente") | Uma ficha guiada, com o cálculo certo, e aprovação sem burocracia | **Sim.** Perfis `gestor`, `coordenador_territorial`, `gerente_regional`, `coordenador_geral`, `diretor` e `presidencia` (matriz §5). O `gabin` valida os riscos da Presidência |
| **Chefias imediatas** | 1ª linha, no papel de validador | Decisão da CGOV P1 a P8 ([[matriz-acesso-responsabilidades]] §9); a minuta da Política não trata de validação hierárquica | Validar as fichas da sua unidade com um clique | **Sim.** Mesmos perfis acima, no fluxo de aprovação |
| **Presidente do ICMBio** | Alta administração; gestor de riscos da Presidência | Art. 17, §1º (é gestor de riscos no seu âmbito); Art. 12, VII (CIG atua em articulação com o Presidente) | Ver os riscos da Presidência e decidir o que é dele | **Sim, no fluxo interno de validação (FS-01), para homologar (3º degrau) os riscos da Presidência** (perfil `presidencia`; decisão P-B1-1, [[matriz-acesso-responsabilidades]] §5 e §9; migração `20261116001_fluxo_presidencia.sql`). **Não** na deliberação do CIG nem na publicação da DAR e do Plano (Metodologia 4.6.7), que a CGOV registra |
| **AUDIT** (Auditoria Interna) | **3ª linha**; avaliação independente | Art. 16 (serviços de avaliação e consultoria, após priorização no PAINT); Art. 15, parágrafo único da minuta (apoio à CGOV) foi suprimido no saneamento | Consultar os dados de todas as unidades para planejar o PAINT | **Sim.** Perfil `auditoria`: lê todas as unidades e só edita fichas da própria AUDIT (§5; §8 item 5: "nunca grava fora da própria unidade"). A tabela de telas da matriz (§7) mostra Riscos e Ficha como só leitura (V\*) para a AUDIT e Novo risco como edição (E): essa diferença interna da matriz fica a esclarecer. O sistema **não** faz a avaliação independente |
| **PFE** (Procuradoria Federal Especializada) | Consultoria jurídica | [[NT_ESTADO]]: as minutas seguiram para a PFE com a Nota Técnica da CGOV | Receber minutas e quesitos claros | **Não.** É parte interessada da norma, não do sistema |
| **CGTI** (Coordenação-Geral de Tecnologia da Informação) | Homologação e hospedagem | Decisões D0 do piloto ([[2026-11-17-etapa-d0-d1-piloto-sede-design]] §3); nenhum artigo da Política trata da CGTI | Receber o sistema em Docker, com dossiê, para homologar e hospedar | **Não no uso.** Operadora da conta institucional na homologação (matriz, P6) |
| **Servidores em geral** | Todos os agentes públicos e colaboradores | Art. 18: contribuir comunicando fragilidades, incidentes e oportunidades aos gestores. Observação: o Art. 18 ficou **sem alteração** no saneamento | Um jeito simples de avisar o gestor | **Não diretamente.** Não há perfil para eles; o aviso vai ao gestor, que registra no sistema |

## 3. Objetivos do produto

Cada objetivo do produto serve a um inciso do **Art. 5º** da Política (objetivos da Política, Cap. III). Os IDs `OP-NN` são locais deste documento.

| ID | Objetivo do produto | Objetivo da Política (Art. 5º, inciso) | Como medir |
| --- | --- | --- | --- |
| OP-01 | Dar a quem decide, em todos os níveis, acesso rápido aos riscos da sua unidade e da sua árvore (Painel, lista de riscos, alcance por perfil) | **I** – informações tempestivas e suficientes aos responsáveis pela decisão | Métrica M3 (tempo por degrau) e M4 (cobertura) |
| OP-02 | Calcular o risco sempre pelas regras do Regime B e apontar quais riscos estão fora do apetite da DAR | **II** – reduzir os riscos a níveis aceitáveis | Métrica M2 (todo risco crítico com tratamento e KRI) |
| OP-03 | Registrar o tratamento e as consequências de cada risco crítico, e reavaliar o risco após mudança da DAR | **III** – tratamento adequado dos riscos e dos impactos de sua materialização | Métricas M2 e M5 |
| OP-04 | Guardar o histórico de quem validou, homologou ou devolveu cada ficha e de toda alteração (trilha de auditoria) | **V** – melhorar a governança (a trilha mostra quem decidiu o quê, o que dá transparência e responsabilização) | Métrica M1 (unidades com riscos críticos reportados e homologados) |
| OP-05 | Registrar controles com a trava de evidência e monitorar KRIs | **VI** – melhorar o controle interno da gestão | Métrica M6 (KRIs com leitura em dia) |
| OP-06 | Poupar trabalho: importar fichas preliminares da CGOV e aprovar em 1 clique | **VII** – melhorar a eficácia e a eficiência operacional | Métrica M3 (tempo por degrau) |

**O inciso IV do Art. 5º** ("facilitar a identificação de oportunidades e ameaças") **não tem objetivo de produto próprio**: o RADAR hoje trata ameaças (riscos) e não tem recurso para registrar oportunidades. Fica como ponto a decidir pela CGOV, não como compromisso.

## 4. Não-objetivos

O RADAR **não** é, e não será nesta etapa:

- **Substituto do SEI.** O processo SEI e a norma são referenciados por campo de texto; não há integração com o SEI, o SIAPE nem o PETRVS (design v2.0, §3.2).
- **Sistema da AUDIT.** A avaliação independente da eficácia da gestão de riscos é da AUDIT, na 3ª linha (Art. 16). A avaliação gerencial da CGOV não a substitui (Metodologia, item 5, texto saneado). A AUDIT só **consulta** o sistema.
- **Ferramenta do Programa de Gestão para Resultados e Inovação.** O programa é outro assunto (Portaria ICMBio nº 1.572/2023). Escreve-se sempre por extenso, nunca por sigla, para não confundir com o Plano de Gestão de Riscos.
- **Calculadora do risco de entrega do PGD.** O risco operacional de entregas individuais do PGD pertence ao projeto `pgd-icmbio`, como distingue a skill (design v2.0, §3.2).
- **Canal de e-mail para servidores antes da aprovação da CGTI.** Em desenvolvimento só se usa o Mailpit; envio real só ao responsável, com o aval dele ([[AGENTS]], regras do piloto).
- **Guardião de dados pessoais além do necessário.** O sistema guarda só o que o login e o perfil exigem (nome, e-mail institucional, unidade, perfil). A matrícula é ignorada na importação das atribuições (`npm run sync:atribuicoes`, [[ESTADO-ATUAL]], etapa B2). A base legal do piloto é o Registro de Decisão da CGOV (LGPD), com retenção máxima de 6 meses (D0-4 e D0-5, [[2026-11-17-etapa-d0-d1-piloto-sede-design]]).
- **Robô de IA dentro do site.** A skill roda fora do sistema; o RADAR recebe o resultado.
- **Cálculo pela fórmula antiga.** Nunca P × I nem P + I: o Quadro 7 é uma tabela fixa de 25 células.

## 5. Escopo do ciclo 2026–2027

Fonte do que existe: [[ESTADO-ATUAL]]. Não há prazos prometidos.

### Já entregue (etapas A a C e D1)

| Etapa | O que ficou pronto |
| --- | --- |
| A | Protótipo com o motor de cálculo (`src/utils/calculadoraRiscoRadar.ts`: Quadros 6, 7 e 8, DAR, Integra+), importador de tabelas, migrações iniciais, telas e empacotamento Docker; reformulação da interface (tokens, componentes, tema escuro, acessibilidade medida com axe-core). |
| B1 e B1.1 | Banco com unidades, perfis e processos, alcance por perfil, RLS, fluxo de aprovação em 3 degraus, trilha de auditoria e regras da Presidência, de objetos e da DAR. |
| B2 | Login por link de e-mail só para convidados, perfis, tela Usuários e perfis (só CGOV) e Edge Function `gerenciar-acesso`. |
| B3 | Telas lendo e gravando no banco (Painel, Riscos, Ficha, Novo risco, Importar, Aprovações, Objetos, Monitoramento, DAR, Auditoria). |
| C | Painel pensado para o celular (blocos recolhíveis, alvos de toque de 44 px). |
| D1 | Trazida para esta branch (merge `66f974a`, [[ESTADO-ATUAL]]). Pelos guias da D1: banco do piloto na nuvem com as 12 migrações aplicadas e conferidas em 2026-11-20 ([[guia-supabase-nuvem]]); scripts de cópia cifrada prontos, mas a **primeira prova completa com o `age` ainda está pendente**, então a cópia não deve ser contada como testada ([[guia-copia-restauracao]]). |

### Em curso: piloto da Sede (D0 a D5)

Piloto com dados reais da Sede (Presidência, DIPLAN, DIMAN, DISAT e DIBIO; 152 unidades ativas no retrato do SharePoint). Desenho em [[2026-11-17-etapa-d0-d1-piloto-sede-design]]: a D0 fixa as decisões e a D1 monta o ambiente (ver acima o que já consta). Seguem D2 (login por senha temporária), D3 (escopo Sede), D4 (operação da CGOV) e D5 (piloto assistido). A D6 (dossiê e homologação da CGTI) vem depois. Critério de sucesso proposto: riscos homologados nas 5 áreas em 2 a 3 meses (D0-7). Nenhum dado real entra antes do Registro de Decisão da CGOV assinado.

### Próximo: lacunas entre a norma e o sistema (LAC-01 a LAC-11)

Aprovadas no diagnóstico ([[2026-11-20-diagnostico-documentacao-radar]] §5). São o que a minuta pede e o sistema ainda não faz:

| ID | Lacuna |
| --- | --- |
| LAC-01 | Plano de Gestão de Riscos único: carteira, consolidação, devolução, ressalva, versões, calendário |
| LAC-02 | Manifestação do CTGRIC e deliberação do CIG (DAR antes do Plano), publicação e reapresentação |
| LAC-03 | KRI obrigatório para risco crítico, grupo de riscos correlatos, consequência do alerta |
| LAC-04 | Comunicação das 6 hipóteses à CGOV em 10 dias úteis |
| LAC-05 | Relatórios trimestrais ao CTGRIC e ao CIG |
| LAC-06 | Avaliação gerencial anual (registro e dados) |
| LAC-07 | Revisão do Plano (decisão da CGOV em 10 dias úteis; substancial × ordinária) |
| LAC-08 | Rito da DAR (proposta da CGOV, CTGRIC, CIG, portaria) |
| LAC-09 | Acompanhamento da carteira crítica e cobrança de pendências pela CGOV |
| LAC-10 | Reavaliação anual de todo risco registrado |
| LAC-11 | Fluxo interno de 3 degraus sem base nas minutas (decisão da CGOV sobre mantê-lo) |

A lista completa (com as LAC-12 a LAC-15, achadas depois do diagnóstico), a severidade de cada lacuna e o que o sistema faz hoje estão em [[lacunas-norma-sistema]].

## 6. Métricas de sucesso

Nenhuma meta numérica foi definida: **meta a definir pela CGOV**. "Mensurável hoje" significa que o dado já é gravado pelo sistema.

| ID | Métrica | Definição | Fonte no sistema | Mensurável hoje? |
| --- | --- | --- | --- | --- |
| M1 | % de unidades com riscos críticos reportados no ciclo | Unidades com ao menos um risco crítico (fora do apetite da DAR) homologado, dividido pelas unidades do escopo | tabelas `riscos` e `unidades`; a homologação fica em `historico_fluxo` (gravada pela função `homologar_risco`, migração `20261115004_fluxo_aprovacao.sql`) | **sim**, no escopo da Sede; para o Instituto todo depende de LAC-01 (carteira consolidada) |
| M2 | % de riscos críticos com ao menos uma medida de tratamento e um KRI | Exigência do Art. 8º, §2º | `riscos`, `respostas_tratamento`, `indicadores_kri` | **sim** |
| M3 | Tempo mediano por degrau do fluxo e taxa de devolução | Dias entre envio, validação e homologação; fichas devolvidas ÷ enviadas | `historico_fluxo` | **sim** |
| M4 | Cobertura da Sede | Áreas (Presidência, DIPLAN, DIMAN, DISAT, DIBIO) com riscos homologados (critério do piloto, D0-7) | `riscos` e `unidades` | **sim** |
| M5 | % de riscos reavaliados em até 12 meses | Riscos registrados com reavaliação no último ano (Metodologia, 4.7) | `riscos`, `auditoria_log` | **depende de LAC-10** |
| M6 | % de KRIs de risco crítico com leitura em dia | KRIs com medição no período esperado | `indicadores_kri`, `medicoes_kri` | **depende de LAC-03** |

## Histórico

Esta visão aproveita as seções 1 a 3 do documento de origem [[2026-11-09-cgov-riscos-radar-design]] (Design v2.0, intenção, diagnóstico, objetivos e não-objetivos). Esse documento está **superado em parte**: foi escrito antes dos perfis reais, do banco com RLS, do login e das lacunas apontadas em 2026-11-20, e ainda descreve o fluxo de 3 degraus como requisito, quando a minuta não o prevê (LAC-11). Em conflito, vale esta visão.
