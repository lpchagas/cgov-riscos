# 📊 Tabelas Oficiais de Cálculo — Regime B (Metodologia SEI `024421455`)

Fonte canônica para o motor `src/utils/calculadoraRiscoRadar.ts` e para as funções SQL em `supabase/migrations/`.

**O que há nesta página:** os Quadros 6, 7 e 8 (seções 1 e 2, que alimentam o cálculo), os Quadros 1 a 5 e o Anexo III (seções 3 a 8, copiados da minuta da Metodologia (versão de 26/03/2026, revisada em 21/10/2026), SEI `024421455`; o saneamento de 20/11/2026 não mexeu nos Quadros), as regras que o sistema aplica sem base literal nas minutas (seção 9) e os erros materiais da minuta (seção 10). Os alertas citados (F2-03, F2-04, LS-01 etc.) estão no [[registro-alertas-f4-f5]].

## 1. Matriz de Risco Assimétrica (Quadro 7) e Faixas (Quadro 8)

- **Faixas do Quadro 8 (aplicadas sem arredondar):**
  - `1 a 5` → **Baixo**
  - `> 5 a 10` → **Médio**
  - `> 10 a 17` → **Alto**
  - `> 17 a 25` → **Extremo**

| Impacto ↓ \ Probabilidade → | (1) Raro | (2) Pouco provável | (3) Provável | (4) Muito provável | (5) Praticamente certo |
|---|---|---|---|---|---|
| **(5) Muito alto** | 15 · Alto | 19 · Extremo | 22 · Extremo | 24 · Extremo | 25 · Extremo |
| **(4) Alto** | 10 · Médio | 14 · Alto | 18 · Extremo | 21 · Extremo | 23 · Extremo |
| **(3) Médio** | 6 · Médio | 9 · Médio | 13 · Alto | 17 · Alto | 20 · Extremo |
| **(2) Baixo** | 3 · Baixo | 5 · Baixo | 8 · Médio | 12 · Alto | 16 · Alto |
| **(1) Muito baixo** | 1 · Baixo | 2 · Baixo | 4 · Baixo | 7 · Médio | 11 · Alto |

## 2. Fator de Avaliação dos Controles Existentes (Quadro 6)

$$\text{Risco Residual} = \text{Risco Inerente} \times \text{Fator de Avaliação dos Controles}$$

| Eficácia do Controle | Fator | Regra de Evidência (Skill `cgov-gestao-riscos-v4`) |
|---|---|---|
| **Inexistente** | `1,0` | Controles inexistentes, mal desenhados ou não funcionais. |
| **Fraco** | `0,9` | Controle manual/individual. **Limite máximo caso não haja evidência comprovada de funcionamento.** |
| **Mediano** | `0,75` | Exige evidência comprovada de funcionamento. Mitiga alguns aspectos. |
| **Satisfatório** | `0,6` | Exige evidência comprovada de funcionamento. Sustentado por ferramentas adequadas. |
| **Forte** | `0,5` | Exige evidência comprovada de funcionamento. Melhor prática. |

## 3. Atributos dos objetos de gestão de riscos (Quadro 1)

Fonte: Metodologia, item 4.1 (minuta original). O Quadro é um modelo em branco, para o gestor descrever cada objeto.

| TIPOS DE OBJETO DE GR(\*) | DESCRIÇÃO DO OBJETO | PRINCIPAIS RESULTADOS/OBJETIVOS ASSOCIADOS AO OBJETO | RECURSOS NECESSÁRIOS PARA ENTREGA EFICIENTE |
|---|---|---|---|
| | | | |

(\*) Processos de Trabalho, Metas, Atividades, Projetos, outros

**Como o RADAR usa:** a tabela `objetos_contexto` (tela `/objetos`) guarda o tipo (`tipo_objeto`: Macroprocesso, Processo, Projeto, Plano, Ação ou Unidade), o nome, o objetivo associado e insumos, entregas e partes interessadas. Os tipos do RADAR não são os do Quadro 1 ("Processos de Trabalho, Metas, Atividades, Projetos, outros"), mas o próprio Quadro deixa a lista aberta ("outros").

## 4. Categorias do risco (Quadro 2)

Fonte: Metodologia, item 4.2.2. Cada risco recebe **uma** categoria, a dominante.

| Categoria | Descrição da Categoria |
|---|---|
| Operacional | Eventos que podem comprometer as atividades da ICMBio, normalmente associados a falhas, deficiência ou inadequação de processos internos, pessoas, infraestrutura e sistemas |
| Legal | Eventos derivados de alterações legislativas ou normativas que podem comprometer as atividades da ICMBio |
| Financeiro/Orçamentário | Eventos que podem comprometer a capacidade da ICMBio de contar com os recursos orçamentários e financeiros necessários à realização de suas atividades, ou eventos que possam comprometer a própria execução orçamentária, como atrasos no cronograma de licitações |
| Reputação | Eventos que podem comprometer a confiança da sociedade em relação à capacidade do ICMBio em cumprir sua missão institucional, interferem diretamente na imagem da autarquia |
| Integridade | Eventos que podem favorecer ou facilitar a ocorrência de práticas de corrupção, fraudes, irregularidades e/ou desvios éticos e de conduta, podendo comprometer os objetivos da instituição |
| Riscos da visitação | Eventos que podem comprometer a segurança dos visitantes durante atividades de uso público nas Unidades de Conservação, decorrentes de perigos inerentes ao ambiente natural ou das operações necessárias para a realização da visitação, tais como trilhas, atrativos, embarcações, atividades recreativas e serviços de apoio. |
| Ocupacionais | Eventos que podem comprometer a saúde, a integridade física ou a segurança dos servidores e colaboradores do ICMBio no desempenho de suas atividades institucionais. |
| Privacidade e Proteção de Dados | Eventos que possam comprometer a proteção, a privacidade e a segurança dos dados pessoais tratados pelo ICMBio, tais como vazamentos de informações, acessos não autorizados, uso inadequado de dados, falhas nos controles de segurança ou descumprimento das disposições da Lei nº 13.709/2013 - Lei Geral de Proteção de Dados Pessoais (LGPD) |

**Como o RADAR usa:** cada risco aponta para uma linha de `categorias_risco` (`riscos.categoria_id`), e o apetite da DAR é guardado por categoria (`apetite_declarado`). Desde 2026-11-22 (migração `20261122001`, [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]; LAC-14), as 8 categorias gravadas (`supabase/seed.sql`, `categorias_risco` e `CATEGORIAS_OFICIAIS_QUADRO_2` em `calculadoraRiscoRadar.ts`) são **exatamente as do Quadro 2**, com as descrições acima, e o banco recusa nome fora delas. O importador aceita a grafia do Anexo III ("Financeiro ou Orçamentário", "Reputação ou Imagem", "Visitação") só como sinônimo e grava a do Quadro 2. As 3 categorias novas (Riscos da visitação, Ocupacionais e Privacidade e Proteção de Dados) nascem com apetite `pendente_dar`. Os riscos que estavam em Estratégico, Socioambiental ou Tecnologia da Informação não são convertidos: a migração para com erro e lista os códigos para reclassificação humana. O banco do piloto na nuvem recebeu a migração em 2026-11-22 (Fase 2 do plano, com autorização a cada passo).

## 5. Subcategorias do risco para a integridade (Quadro 3)

Fonte: Metodologia, item 4.2.2.1. Os riscos da categoria Integridade são trabalhados no Programa Integra+ e divididos nestas 6 subcategorias.

| Subcategoria | Descrição da Subcategoria |
|---|---|
| Abuso de posição ou poder em favor de interesses privados | Conduta contrária ao interesse público, valendo-se da condição para atender interesse privado, em benefício próprio ou de terceiros. |
| Nepotismo | Uma das formas de abuso de posição ou poder em favor de interesses privados, em que se favorecem familiares. Ele pode ser presumido ou requerer apuração específica. |
| Conflito de interesses | Situação gerada pelo confronto entre interesses públicos e privados, que possa comprometer o interesse coletivo ou influenciar, de maneira imprópria, o desempenho da função pública. |
| Pressão interna ou externa ilegal para influenciar agente público | Pressões explícitas ou implícitas de natureza hierárquica (interna), de colegas de trabalho (organizacional), política ou social (externa), que podem influenciar indevidamente atuação do agente público |
| Solicitação ou recebimento de vantagem indevida | Caracteriza-se por qualquer tipo de enriquecimento ilícito, seja dinheiro ou outra utilidade, dado que ao agente público não se permite colher vantagens em virtude do exercício de suas atividades |
| Utilização de recursos públicos em favor de interesses privados | Apropriação indevida, irregularidades em contratações públicas e outras formas de utilização de recursos públicos para uso privado (exemplos: veículos oficiais, utilização imprópria de tempo de trabalho, de equipamentos do escritório, entre outros). |

**Como o RADAR usa:** risco da categoria Integridade exige uma subcategoria (`riscos.subcategoria_integridade`, conferida por `validarRegraIntegridade`). Desde 2026-11-22 (migração `20261122001`, [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]; LAC-15), as 6 subcategorias gravadas na tabela `subcategorias_risco` (e em `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3`) são **exatamente as do Quadro 3**. O banco garante, por chave estrangeira composta e gatilho, que o risco de Integridade tenha uma delas e que risco de outra categoria não tenha subcategoria. O importador recusa subcategoria fora do Quadro 3 e "Integridade:" sem subcategoria, sem usar um padrão.

## 6. Escala de probabilidade (Quadro 4)

Fonte: Metodologia, item 4.3, a.

| Probabilidade | Descrição |
|---|---|
| (1) Raro | Acontece apenas em situações excepcionais. Não há histórico conhecido do evento ou não há indícios que sinalizem sua ocorrência. |
| (2) Pouco provável | O histórico conhecido aponta para baixa frequência de ocorrência no prazo associado ao objetivo. |
| (3) Provável | Evento esperado, de frequência reduzida, com histórico conhecido pela maioria dos gestores e operadores do processo. |
| (4) Muito provável | Evento usual, de ocorrência habitual, com histórico conhecido amplamente por parte dos gestores e operadores do processo. |
| (5) Praticamente certo | Evento repetitivo e constante, de ocorrência numerosa, com histórico disponível ou não, mas evidente para os que conhecem o processo. |

**Como o RADAR usa:** o número de 1 a 5 vai para `riscos.probabilidade` e, junto com o impacto, entra na tabela fixa do Quadro 7 (seção 1). A escala exibida usa os nomes e as descrições literais do Quadro 4, sem percentuais, guardados numa fonte única (`src/utils/escalasProbabilidadeImpacto.ts`): o formulário (etapa 3), o eixo da matriz e o importador leem dela (LAC-12, resolvida em 2026-11-22).

## 7. Escala de impacto (Quadro 5)

Fonte: Metodologia, item 4.3, b.

| Impacto | Descrição |
|---|---|
| (1) Muito baixo | Compromete minimamente o atingimento do objetivo; para fins práticos, não altera o alcance do objetivo/resultado. |
| (2) Baixo | Compromete em alguma medida o alcance do objetivo, mas não impede o alcance da maior parte do objetivo/resultado. |
| (3) Médio | Compromete razoavelmente o alcance do objetivo/resultado. |
| (4) Alto | Compromete a maior parte do atingimento do objetivo/resultado. |
| (5) Muito alto | Compromete totalmente ou quase totalmente o atingimento do objetivo/resultado. |

**Como o RADAR usa:** o número de 1 a 5 vai para `riscos.impacto`; os rótulos do formulário ("Muito baixo" a "Muito alto") são os do Quadro 5. No Quadro 7 o impacto pesa mais que a probabilidade (ex.: P = 1 e I = 5 dá 15; P = 5 e I = 1 dá 11).

## 8. Modelo de Declaração de Apetite a Riscos (Anexo III)

Fonte: Metodologia, Anexo III (minuta original). O texto do modelo de portaria está como na minuta, com os erros materiais (ver seção 10); a assinatura foi omitida. O texto saneado em 20/11/2026 (L-12) corrige o Art. 1º e o parágrafo único: ver `revisao-2026/Saneamento_Legistica_Aprovacao_Plano_DAR_2026-11-20.md`, seção 3.2.

> Art. 1º. Aprova a Declaração de Apetite a Riscos do Instituto Chico Mendes de Conservação da Biodiversidade – ICMBio, do período a 202X-202X, para fins do Plano de Gestão de Riscos, na forma do Anexo desta Portaria.
>
> Parágrafo único. A Declaração mencionada no caput foi previamente aprovada pelo Comitê Gestor do ICMBio na reunião realizada no dia XX/XX/202X.
>
> Art. 2º Esta Portaria entra em vigor na data de sua publicação.

**Diretrizes para tratamento dos riscos**

| Apetite | Diretriz |
|---|---|
| Baixo | Riscos residuais médios, altos ou extremos devem ser objeto de tratamento. |
| Moderado | Riscos residuais altos ou extremos devem ser objeto de tratamento. |

**Declaração de apetite a riscos por tipologia** (em branco no modelo)

| Categoria | Apetite Declarado |
|---|---|
| Operacional | |
| Legal | |
| Financeiro ou Orçamentário | |
| Reputação ou Imagem | |
| Integridade | |
| Privacidade e Proteção de Dados | |
| Visitação | |
| Ocupacionais | |

> O apetite a riscos representa o nível de exposição ao risco que o Comitê Interno de Governança está disposto a aceitar para determinada categoria de riscos durante o período de vigência do Plano de Gestão de Riscos. Os gestores de riscos deverão utilizar o apetite declarado como referência para definição das estratégias de tratamento dos riscos residuais identificados.

**Como o RADAR usa:** o apetite de cada categoria fica em `categorias_risco.apetite_declarado` (`baixo`, `moderado` ou `pendente_dar`), alterado pela CGOV na tela `/dar`. O gatilho `trigger_calcular_risco_radar` aplica as duas diretrizes: residual Alto ou Extremo é sempre fora do apetite (Risco Crítico); residual Médio é crítico só com apetite Baixo; residual Baixo nunca é crítico. O valor `pendente_dar` (categoria ainda sem apetite) é regra do sistema, sem base na minuta (alerta F2-02). Mudar o apetite reavalia os riscos aprovados da categoria (`20261116004_dar_reavalia_aprovados.sql`). O rito da DAR (CTGRIC, CIG e portaria) não existe no sistema (LAC-08).

## 9. Regras do sistema sem base literal nas minutas

Estas regras estão no código e no `AGENTS.md`, mas **não estão escritas** nas minutas originais nem no texto saneado de 20/11/2026. Na origem das regras de negócio, usam o rótulo `Regra do sistema (AGENTS.md / decisão)` e citam o alerta.

| Regra | O que a minuta diz | Alerta | Onde está no código |
|---|---|---|---|
| **Trava de evidência:** controle sem evidência comprovada de funcionamento não passa de Fraco (fator 0,9). | O item 4.3, c, só cita "evidências de funcionamento" entre os aspectos da avaliação da eficácia; não há teto. Ninguém confere as evidências. | F2-04 e LS-01 | Gatilho `trigger_calcular_risco_radar` (passo 3, `20261109001_schema_radar.sql`): se `possui_evidencia_controle = false` e `fator_controle < 0.90`, grava Fraco e 0,90. No front, `validarFatorControle` (`calculadoraRiscoRadar.ts`). Testes: `supabase/tests/000_regressao_calculo.test.sql` (item 3) e `tests/unit/calculadoraRiscoRadar.spec.ts`. |
| **Gatilho do Teste de Integridade:** se o objeto envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação, aplica-se o Teste de Integridade. | A minuta só classifica o risco de Integridade nas 6 subcategorias do Quadro 3 (4.2.2.1, que **estão** na minuta) e remete ao Integra+, sem descrever o teste nem o gatilho. | F2-04 (conferência com as regras de negócio, `Modelagem_Fluxos_Gestao_Riscos_2026-11-20.md`) | A pergunta dos 4 gatilhos aparece ao usuário em `FormularioRiscoView.vue` ("O processo decide sobre beneficiário, licença/autorização, fiscalização/sanção ou contratação/atestação?") e é guardada em `decideSobreTerceiros` (`formularioRisco.ts`); no banco, `riscos.teste_integridade_aplicavel` e `justificativa_nao_integridade`; regra 3 de `validarRegraIntegridade` (`calculadoraRiscoRadar.ts`): teste aplicável e outra categoria exigem justificativa. |
| **Proibição da categoria mista** "Operacional com interface de Integridade". | A minuta diz que um risco pode afetar mais de uma categoria e que se escolhe a dominante (4.2.2); não fala em categoria mista. | F2-04 (mesma conferência) | Regra 1 de `validarRegraIntegridade`: recusa nome que contenha "interface de integridade" ou que não esteja na lista de categorias. Teste em `tests/unit/calculadoraRiscoRadar.spec.ts`. |
| **Residual abaixo de 1 é Baixo.** Inerente 1 com fator 0,5 a 0,9 dá 0,5 a 0,9, e o Quadro 8 começa em 1. | O Quadro 8 diz "1 a 5" para Baixo; não classifica valores abaixo de 1. | F2-03 | `classificar_nivel_q8` (`valor <= 5` → Baixo) e `classificarNivelRisco` (`<= 5` → Baixo). Sem teste específico para valor abaixo de 1. |

## 10. Erros materiais da minuta

Erros do texto da minuta original da Metodologia que afetam a leitura das regras. O RADAR segue a leitura correta indicada na última coluna; nenhum deles muda o cálculo.

| Onde | O que está escrito | Leitura correta | Efeito no RADAR |
|---|---|---|---|
| Anexo II, seção "4. Avaliação do risco" do exemplo (não é o item 4 da Metodologia) | Residual 22 "na faixa de maior criticidade (18 a 25)" | Quadro 8: Extremo é "> 17 a 25". Com residual decimal, 17,5 é Extremo, e não ficaria em faixa nenhuma pela leitura "18 a 25". | `classificar_nivel_q8` usa o Quadro 8 (`> 17` → Extremo). A faixa nunca se chama "crítica": Risco Crítico é o residual fora do apetite da DAR. |
| Item 4.3 (fórmula do residual) e item 4.5.1 | "valor definido na Tabela 6"; "Tabela 8 – Estratégias para Tratamento do Risco" | Os quadros são numerados como Quadro: "Tabela 6" é o Quadro 6. A "Tabela 8" é um quadro sem número próprio (o Quadro 8 é a Classificação do Risco). | Nenhum. Na documentação, citar "Quadro 6" e "item 4.5.1 (Tabela 8 da minuta)". |
| Anexo III, parágrafo único do modelo de portaria | "previamente aprovada pelo Comitê Gestor do ICMBio" | Comitê Interno de Governança (CIG), como no próprio Anexo III (último parágrafo), no item 4.6 e na Política. Corrigido no texto saneado (L-12); vai à PFE. | Nenhum no cálculo. |
| Item 4.3, b (escala de impacto) | "O quadro abaixo define a escala de probabilidade a ser utilizada" | "escala de impacto" (o quadro que segue é o Quadro 5). | Nenhum. |
| Anexo II, seção "2. Identificação do risco" do exemplo, lista de causas (não é o item 2 da Metodologia) | "Evento de risco" listado como se fosse uma das causas | É o rótulo do evento de risco ("Adoecimento, afastamento, férias, licença ou outra ausência do servidor responsável"), que ficou dentro da lista de causas. | Nenhum; o importador e a ficha separam causa, evento e consequência. |
| Quadro 2 × Anexo III | Quadro 2: "Financeiro/Orçamentário", "Reputação", "Riscos da visitação"; Anexo III: "Financeiro ou Orçamentário", "Reputação ou Imagem", "Visitação" | Mesmas categorias com grafias diferentes; a CGOV decidiu em 2026-11-22 usar a do Quadro 2 (D3-01, [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica\|ADR-0019]]). | Ver seção 4: o RADAR grava a grafia do Quadro 2 e aceita a do Anexo III só como sinônimo na importação (decisão de 2026-11-22). |
| Quadro 2, "Privacidade e Proteção de Dados" | "Lei nº 13.709/2013" | A LGPD é a Lei nº 13.709/2018. | Nenhum. |
