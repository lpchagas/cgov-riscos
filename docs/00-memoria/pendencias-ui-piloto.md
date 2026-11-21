# Pendências de interface antes e durante o piloto da Sede

> **Revisão feita em:** 2026-11-20, na branch `feat/d1-ambiente-piloto`.
> **O que foi revisado:** todas as telas de `src/views/` e os componentes de `src/components/`, mais os textos que elas puxam de `src/utils/` e `src/router/`.
> **Comparado com:** [[matriz-regras-regime-b]], a minuta da Metodologia (SEI `024421455`), a minuta da Política (SEI `024241420`) e [[matriz-acesso-responsabilidades]].
> **Nada foi alterado no código.** Este documento só registra os achados.

## Como ler as classes

| Classe | Quando fazer | Precisa de quê |
|---|---|---|
| **Agora** | Antes de abrir o piloto para os usuários | Só tela e texto. Não muda banco, cálculo, alcance, RLS nem fluxo. |
| **Decidir antes da D3** | Antes da carga da estrutura real da Sede (D3) | Uma decisão da CGOV e, na maioria dos casos, uma mudança no banco ou nos dados de referência. Depois que entram dados reais, mudar fica mais caro. Passos na nuvem dependem de **[AUTORIZAÇÃO]**. |
| **Depois** | Depois do piloto, ou em etapa própria | Recurso novo (tabela nova ou tela nova). |

## Resumo

- **Achados:** 14 na classe **Agora**, 6 na classe **Decidir antes da D3** e 6 na classe **Depois**.
- **Os 3 mais graves:**
  1. **D3-01:** as 8 categorias gravadas no banco do piloto (nuvem) **não são as do Quadro 2**.
  2. **D3-02:** as 6 subcategorias de Integridade **não são as do Quadro 3**.
  3. **AG-01:** as telas dizem que "a Coordenação-Geral valida" e que "a Diretoria homologa", mas o banco segue a chefia imediata (decisões P4 e P-B1-1).
- **O que está certo (conferido):**
  - Nenhuma tela usa a sigla "PGR". O único "PGR" do código é o código de erro `PGRST116` do Supabase, que não aparece na tela.
  - "Crítico" sempre significa "residual fora do apetite da DAR". O nível de 18 a 25 se chama "Extremo" em todas as telas.
  - A matriz lê as 25 células do Quadro 7 e não calcula P × I.
  - A legenda do Quadro 8 está correta (1 a 5; acima de 5 a 10; acima de 10 a 17; acima de 17 a 25).
  - `formatarNivel` só formata o número para exibição. A classificação usa o valor exato, sem arredondar.
  - Os fatores do Quadro 6 (1,0; 0,9; 0,75; 0,6; 0,5) e o texto da trava ("limitado a Fraco (0,9)") estão corretos.
  - A categoria mista "Operacional com interface de Integridade" é rejeitada e explicada na tela.

---

## 1. Agora (só tela e texto)

### AG-01 · Quem valida e quem homologa está errado em vários textos
- **Onde:**
  - [CaixaValidacaoUmCliqueView.vue:96-98](../../src/views/CaixaValidacaoUmCliqueView.vue#L96-L98)
  - Painel, indicadores "Aguardando validação/homologação" (descrições "Com a Coordenação-Geral" e "Com a Diretoria")
  - [router/index.ts:139](../../src/router/index.ts#L139)
  - [rotulosInterface.ts](../../src/utils/rotulosInterface.ts), descrições de `em_validacao_cg` e `em_homologacao_dir`
  - Lembrete da DAR ("sobe para homologação da Diretoria")
  - [SobreRadarView.vue:74-75](../../src/views/SobreRadarView.vue#L74-L75)
  - [sobreRadar.ts:109-110](../../src/utils/sobreRadar.ts#L109-L110)
  - Rótulos "Supervisor do macroprocesso (2º degrau)" e "Diretoria (3º degrau)" no cadastro de objeto
  - Degraus do seletor "Ver como" em [acessoPorPerfil.ts:41-52](../../src/utils/acessoPorPerfil.ts#L41-L52), onde a CT aparece como "1º degrau", mas ela valida no 2º.
- **Por que confunde:** pela [[matriz-acesso-responsabilidades]] (P4 e P-B1-1), o 2º degrau é da **chefia imediata**: CT, GR, CG, Diretor ou GABIN. O 3º degrau (risco Crítico) é do **Gerente Regional, do Diretor ou do Presidente**. Um servidor de UC vai procurar a CG para validar o risco.
- **Proposta:** um texto único: "2º degrau: a chefia imediata valida. 3º degrau: o risco Crítico é homologado pelo Gerente Regional, pelo Diretor ou pelo Presidente." No seletor "Ver como", trocar o degrau pelo papel ("valida", "valida e homologa"). Nos campos do objeto, tirar "(2º degrau)" e "(3º degrau)": o fluxo segue a árvore de unidades, não esses campos.

### AG-02 · "×" entre Probabilidade e Impacto no Painel
- **Onde:** [PainelConsolidadoCgovView.vue:320](../../src/views/PainelConsolidadoCgovView.vue#L320): "Probabilidade 3 × Impacto 4 · nota 18".
- **Por que confunde:** o "×" sugere a multiplicação P × I, que a Metodologia proíbe (regra 2 do AGENTS.md). Quem fizer 3 × 4 = 12 vai achar que o 18 está errado.
- **Proposta:** "Probabilidade 3, Impacto 4 → nível 18 (Extremo), lido do Quadro 7".

### AG-03 · "Nota" no lugar de "nível"
- **Onde:**
  - Painel, linha 320
  - `aria-label` das células da matriz ([MatrizCalorAssimetrica.vue:75-76](../../src/components/radar/MatrizCalorAssimetrica.vue#L75-L76))
  - Ajuda da etapa 3 do formulário ([FormularioRiscoView.vue:511](../../src/views/FormularioRiscoView.vue#L511))
  - [SobreRadarView.vue:148](../../src/views/SobreRadarView.vue#L148)
  - Descrição da rota Auditoria ("mudanças de nota")
- **Por que confunde:** a Metodologia fala em "nível do risco". "Nota" parece avaliação de desempenho.
- **Proposta:** trocar por "nível" em todos esses lugares (inclusive no texto do leitor de tela).

### AG-04 · Nomes e percentuais da escala de Probabilidade
- **Lacuna normativa:** LAC-12 em [[lacunas-norma-sistema]] (a severidade fica lá; este item continua sendo o dono da correção de interface).
- **Onde:**
  - [FormularioRiscoView.vue:219-225](../../src/views/FormularioRiscoView.vue#L219-L225), com "1 — Muito baixa (menos de 10%)" e outras
  - Eixo da matriz ([MatrizCalorAssimetrica.vue:52-58](../../src/components/radar/MatrizCalorAssimetrica.vue#L52-L58)), com "Muito baixa…Muito alta"
  - Comentário em [radar.types.ts:19-25](../../src/types/radar.types.ts#L19-L25)
- **Por que confunde:** o Quadro 4 usa **Raro, Pouco provável, Provável, Muito provável e Praticamente certo**, e não traz percentuais. Os percentuais não têm base na minuta. Quem preenche escolhe por um critério que não é o oficial.
- **Proposta:** usar os nomes do Quadro 4 e mostrar, como ajuda do campo, a descrição de cada nível dos Quadros 4 e 5. Exemplo para Raro: "Acontece apenas em situações excepcionais…".

### AG-05 · Eficácia do controle: falta o critério, e a trava só aparece depois
- **Onde:** etapa 3 do formulário ([FormularioRiscoView.vue](../../src/views/FormularioRiscoView.vue), campo "Eficácia do controle existente").
- **Por que confunde:**
  - As opções mostram só o fator, sem a descrição do Quadro 6.
  - A caixa "Há evidência comprovada" vem **depois** do seletor. A pessoa escolhe "Forte", não marca a evidência, e o resultado vira "Fraco" sem aviso no campo. A explicação aparece só na prévia.
- **Proposta:**
  - Pôr a pergunta sobre a evidência **antes** do seletor.
  - Sem evidência, mostrar junto ao campo: "Sem evidência, o fator fica limitado a Fraco (0,9)."
  - Mostrar a descrição do nível escolhido, conforme o Quadro 6.
  - Não muda o cálculo: a trava continua na calculadora e no banco.

### AG-06 · A página do risco tem como título o nome do objeto
- **Onde:**
  - `<h1>` da Ficha ([FichaDetalheBowTieView.vue](../../src/views/FichaDetalheBowTieView.vue), `risco.nomeObjetoCache`)
  - Lista e detalhe de Aprovações
  - "Precisa da sua atenção" e célula da matriz no Painel
- **Por que confunde:** um objeto costuma ter vários riscos. Na fila de aprovação aparecem itens com o mesmo título, que só se distinguem pelo código.
- **Proposta:** título = evento de risco (resumido), com o objeto como linha de apoio.

### AG-07 · "No Plano" para qualquer risco aprovado
- **Onde:**
  - [rotulosInterface.ts](../../src/utils/rotulosInterface.ts), `aprovado`: "No Plano · Integrado ao Plano de Gestão de Riscos do ICMBio"
  - Descrição do Painel ("Situação geral do Plano de Gestão de Riscos · ciclo 2026") e `aria-label` "Indicadores do Plano de Gestão de Riscos"
  - [sobreRadar.ts:110](../../src/utils/sobreRadar.ts#L110), "Homologação e inclusão no Plano"
- **Por que confunde:** a Política (art. 7º, II, e art. 8º) diz que o Plano de Gestão de Riscos contempla a **carteira de riscos críticos**. Pela Metodologia (item 4.6), o Plano consolidado ainda vai à aprovação do CIG. Um risco Baixo aprovado não está "no Plano".
- **Proposta:**
  - Rótulo "Aprovado".
  - Descrição: "Validado e, se Crítico, homologado. Os riscos Críticos aprovados formam a carteira do Plano de Gestão de Riscos, que a CGOV consolida e o CIG aprova."
  - No Painel: "Situação da carteira de riscos", sem o "ciclo 2026" fixo no texto.

### AG-08 · Lembrete do Monitoramento sobre reabertura incompleto
- **Onde:** lembrete no topo de [MonitoramentoKriPlanoAcaoView.vue](../../src/views/MonitoramentoKriPlanoAcaoView.vue): "Só mudar Probabilidade, Impacto ou controle reabre".
- **Por que confunde:** desde a B1/B1.1, o risco aprovado também reabre quando mudam a **categoria**, o **objeto** ou a **criticidade**, e quando a DAR o torna Crítico.
- **Proposta:** "Registrar leituras e atualizar ações não reabre a validação. Mudar a análise na ficha (probabilidade, impacto, controle, categoria ou objeto) reabre, e uma mudança na DAR pode devolver o risco à homologação."

### AG-09 · Fundamento do Monitoramento cita a seção errada
- **Onde:** [router/index.ts:126](../../src/router/index.ts#L126), "Seções 4.5 e 4.6 da Metodologia".
- **Por que confunde:** a seção 4.6 trata da validação do Plano. O monitoramento e os KRIs estão na seção **4.7** (com a 4.7.1).
- **Proposta:** "Seções 4.5 (tratamento) e 4.7 (monitoramento e KRIs) da Metodologia".

### AG-10 · Textos inventados aparecem na Ficha como se a pessoa os tivesse escrito
- **Onde:** [formularioRisco.ts](../../src/utils/formularioRisco.ts), ao montar a ação e o KRI:
  - "Como" da ação = "Execução acompanhada via SEI"
  - KRI com fórmula "A definir pela unidade", fonte, meta e alerta "A definir", periodicidade fixa "Trimestral"
  - Custo com padrão do banco "Sem custo adicional"
- **Por que confunde:** a Ficha mostra "… · Execução acompanhada via SEI" e "Meta A definir · alerta A definir · Trimestral" como dados da unidade. Também **não existe tela para corrigir** meta, alerta, fórmula e periodicidade do KRI. Além disso, as justificativas de probabilidade e de impacto existem no banco, mas o formulário não as pede.
- **Proposta:**
  - Pedir no formulário os campos que já existem no banco: no 5W2H, por quê, onde, como e quanto; no KRI, fórmula, fonte, periodicidade, meta, limite de alerta e responsável pela medição; e as justificativas de P e I.
  - Enquanto não houver o campo, mostrar "não informado" em vez de um texto inventado.
  - Não precisa de migração. Atenção: o formulário só edita o 1º item de cada lista (pendência da B3).

### AG-11 · "Desenho adequado" e "Operação comprovada" copiados da caixa de evidência
- **Onde:**
  - [formularioRisco.ts:217](../../src/utils/formularioRisco.ts#L217): os dois campos recebem o mesmo valor de `possuiEvidencia`
  - Etiquetas na aba Controles da Ficha
- **Por que confunde:** a Ficha afirma "Desenho a melhorar" para todo controle sem evidência, sem que ninguém tenha avaliado o desenho.
- **Proposta:** perguntar os dois pontos no formulário (as colunas já existem) ou esconder as etiquetas até que sejam perguntados.

### AG-12 · Controles: evidência por controle × fator por risco
- **Onde:** aba Controles da Ficha.
- **Por que confunde:**
  - Cada controle mostra "Evidência comprovada" ou "Sem evidência (trava em Fraco)".
  - Mas o fator do Quadro 6 é **um só para o risco**, calculado a partir de `possui_evidencia_controle` do risco.
  - Com dois controles (um com evidência e outro sem), as etiquetas parecem contradizer a conta.
- **Proposta:** frase de abertura: "A eficácia é avaliada para o conjunto de controles do risco: {nível}, {com/sem} evidência." Nos controles, trocar "trava em Fraco" por "sem evidência registrada".

### AG-13 · Cadastro de objeto sem "Recursos necessários" (Quadro 1)
- **Onde:** cadastro lateral em [CatalogoObjetosView.vue](../../src/views/CatalogoObjetosView.vue).
- **Por que confunde:** o Quadro 1 pede "Recursos necessários para entrega eficiente". A coluna `insumos_principais` existe no banco, mas o formulário não tem o campo.
- **Proposta:** acrescentar o campo "Recursos necessários (Quadro 1)".

### AG-14 · Ajustes menores de texto e cor
- Na DAR, o indicador "Apetite Moderado" aparece com tom de **aviso** (amarelo) e o "Baixo" com tom de **sucesso**. Isso sugere que "Moderado" é um problema, quando é só uma escolha do CIG. Proposta: os dois em tom neutro.
- A descrição de "Novo risco" diz "contexto, categoria, análise e tratamento", mas a 1ª etapa se chama "Identificação". Proposta: alinhar os nomes.
- O exemplo do Importar ([ImportadorSkillView.vue:50-51](../../src/views/ImportadorSkillView.vue#L50-L51)) usa a categoria "Socioambiental" e a subcategoria "Conflito de Interesses e Nepotismo". Corrigir junto com D3-01 e D3-02.

---

## 2. Decidir antes da D3 (banco, dados de referência ou regra)

### D3-01 · As categorias do banco não são as do Quadro 2 (já estão na nuvem)
- **Lacuna normativa:** LAC-14 em [[lacunas-norma-sistema]] (a severidade fica lá; este item continua sendo o dono da correção de interface).
- **Onde:**
  - [supabase/seed.sql:6-15](../../supabase/seed.sql#L6-L15), o mesmo conteúdo que foi aplicado no banco do piloto na D1
  - Dados de demonstração em `src/services/dadosSementeAnexoII.ts`
- **O que há hoje:** Estratégico · Operacional · Orçamentário/Financeiro · Conformidade/Legal · Integridade · Imagem/Reputação · **Socioambiental** · **Tecnologia da Informação**.
- **O que a Metodologia diz (Quadro 2):** Operacional · Legal · Financeiro/Orçamentário · Reputação · Integridade · **Riscos da visitação** · **Ocupacionais** · **Privacidade e Proteção de Dados**.
- **Diferença:** sobram 3 categorias (Estratégico, Socioambiental e TI) e faltam 3 (Visitação, Ocupacionais e Privacidade). As descrições também não são as da minuta. O desenho da D1 diz "as 8 categorias do Quadro 2", mas o arquivo tem outras.
- **A decidir pela CGOV:**
  - (a) Adotar o Quadro 2 ao pé da letra (recomendado).
  - (b) Qual grafia usar onde a própria minuta varia. O Quadro 2 diz "Riscos da visitação", "Reputação" e "Financeiro/Orçamentário"; o Anexo III diz "Visitação", "Reputação ou Imagem" e "Financeiro ou Orçamentário".
- **O que muda:**
  - `seed.sql`, dados de demonstração e testes.
  - Na nuvem, um `UPDATE` de nome e descrição pelos `id`s, possível porque ainda não há risco real. **[AUTORIZAÇÃO]**
  - Conferir o mapeamento de categorias do importador da skill.

### D3-02 · As subcategorias de Integridade não são as do Quadro 3
- **Lacuna normativa:** LAC-15 em [[lacunas-norma-sistema]] (a severidade fica lá; este item continua sendo o dono da correção de interface).
- **Onde:**
  - `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3` em [calculadoraRiscoRadar.ts:81-88](../../src/utils/calculadoraRiscoRadar.ts#L81-L88) (arquivo protegido: só se altera com aval)
  - `subcategorias_permitidas` no `seed.sql`
- **O que há hoje:** Corrupção e Fraude · Conflito de Interesses e Nepotismo · Assédio Moral, Sexual e Discriminação · Vazamento ou Uso Indevido de Informação Restrita · Quebra de Imparcialidade ou Favorecimento Indevido · Desvio de Recursos Públicos ou Patrimoniais.
- **O que a Metodologia diz (Quadro 3):** Abuso de posição ou poder em favor de interesses privados · Nepotismo · Conflito de interesses · Pressão interna ou externa ilegal para influenciar agente público · Solicitação ou recebimento de vantagem indevida · Utilização de recursos públicos em favor de interesses privados.
- **A decidir pela CGOV:** confirmar que vale o Quadro 3 da minuta. A lista atual pode ter vindo de outra fonte, talvez do material do Integra+. Também decidir se o banco deve **recusar** subcategoria fora da lista. Hoje a coluna é texto livre, sem `CHECK`, e isso exigiria uma migração.
- **O que muda:** a calculadora (com aval), o `seed.sql` e a nuvem **[AUTORIZAÇÃO]**, os dados de demonstração e os testes.

### D3-03 · Apetites da DAR já preenchidos, sem deliberação do CIG
- **Onde:** `seed.sql`, que grava apetites "baixo" e "moderado" e justificativas como "Tolerância zero…". Esses valores já estão na nuvem.
- **Por que confunde:** as telas mostram "Crítico" ou "Dentro do apetite" com base numa DAR que o CIG não aprovou. O desenho da D1 prevê que a CGOV revise o apetite antes da 1ª importação, mas até lá os números parecem oficiais.
- **A decidir:**
  - (a) Zerar para "Pendente" na nuvem antes da D3, e a CGOV preenche conforme a deliberação (recomendado).
  - (b) Manter e registrar no roteiro da D4.
- **Relacionado:** a DAR do Anexo III tem **período de vigência** e é aprovada por **portaria**, após reunião do CIG. O banco não guarda período, ato nem data. Decidir se isso entra já, como colunas em `categorias_risco` ou uma tabela `dar_versoes` (migração), ou depois.

### D3-04 · A eficácia declarada se perde quando a trava age
- **Onde:** o gatilho do banco troca `nivel_eficacia_controle` para 'Fraco' ([20261109001_schema_radar.sql:301](../../supabase/migrations/20261109001_schema_radar.sql#L301)) e não guarda o que a pessoa declarou.
- **Consequências:**
  - A Ficha e as Aprovações não conseguem mostrar a explicação da trava. O `MemoriaCalculoBar` não recebe `travaAcionada` nessas telas.
  - Ao editar, o formulário volta com "Fraco", e a pessoa perde a avaliação original.
  - O validador não sabe se a unidade avaliou "Fraco" ou se avaliou "Forte" sem evidência.
- **A decidir:** criar a coluna `nivel_eficacia_declarado`. Isso exige migração e mexe no gatilho, que é área de cálculo, então precisa de aval explícito. A conta não muda.

### D3-05 · Risco Crítico sem medida de tratamento ou sem KRI
- **Onde:** etapa 4 do formulário e [validarEtapa](../../src/utils/formularioRisco.ts#L144-L150).
- **O que a norma diz:**
  - Política, art. 8º, § 2º: "Para cada risco crítico, os gestores de riscos devem elaborar **pelo menos uma medida de tratamento e um indicador-chave de risco**."
  - Metodologia, 4.5 e Tabela 8: "Somente devem ser objeto de tratamento os riscos residuais que estão acima do limite de exposição"; "Aceitar" se aplica normalmente ao risco **abaixo** do limite.
- **O que a tela faz hoje:**
  - O KRI é "Opcional" sempre.
  - "Aceitar" é permitido mesmo para risco Crítico.
  - Para risco dentro do apetite, a estratégia começa em "Mitigar" e exige ação 5W2H.
- **A decidir (é regra de fluxo):**
  - Crítico: exigir ação + KRI para enviar? Só na tela, ou também no banco (`enviar_risco`/`homologar_risco`, com migração)?
  - Crítico com "Aceitar": proibir ou exigir justificativa?
  - Dentro do apetite: começar em "Aceitar", com ação opcional?

### D3-06 · Tipos de objeto e campos do Quadro 1
- **Onde:** `CHECK` de `objetos_contexto.tipo_objeto` (Macroprocesso, Processo, Projeto, Plano, Ação, Unidade) e o cadastro de objeto.
- **O que a Metodologia diz (Quadro 1):** "Processos de Trabalho, Metas, Atividades, Projetos, outros", com **descrição do objeto**, principais resultados/objetivos e recursos necessários.
- **Diferença:** faltam os tipos Meta, Atividade e Outros, e não existe coluna para a descrição do objeto.
- **A decidir:** adotar os tipos do Quadro 1 (com "Unidade" e "Macroprocesso" como extras do RADAR?) e criar a coluna `descricao_objeto` (migração). Convém decidir antes da D3, porque os objetos da Sede entram com a carga real.

---

## 3. Depois

| ID | Assunto | Por quê | Precisa de |
|---|---|---|---|
| DP-01 | **Plano de Gestão de Riscos como registro próprio:** versão, consolidação pela CGOV, aprovação pelo CIG, revisão após manifestação do CTGRIC | Metodologia 4.6; Política art. 9º. Hoje "Plano" é só um rótulo de situação (ver AG-07). | Tabela(s) nova(s) e tela de consolidação |
| DP-02 | **Bow Tie com medidas preventivas e atenuantes** | A Figura 1 da Metodologia separa "prevenção" (antes do evento) de "mitigação" (depois). Hoje todo controle fica antes do evento, e todo o 5W2H depois. | Coluna "tipo de medida" em controles e respostas |
| DP-03 | **KRI numérico com alerta automático** | Hoje meta e limite são texto livre, e "em alerta" é marcado à mão na leitura | Colunas numéricas e sentido do limite (maior/menor) |
| DP-04 | **Matriz residual / "acima do limite" no Painel** | A Metodologia 4.4 manda localizar na matriz os riscos acima do limite da DAR. Hoje a matriz mostra só o inerente. | Só tela (alternar inerente/residual) |
| DP-05 | **Vários controles, ações e KRIs no formulário** | Pendência já registrada na B3: o formulário edita só o 1º item de cada lista | Só tela |
| DP-06 | **Mostrar o nome de quem vai decidir** ("Aguardando validação de: chefe da CT X") | Completa o AG-01 com a pessoa real | Ampliar a RPC `acoes_no_fluxo` (migração) |

---

## Próximos passos sugeridos

1. Levar **D3-01 a D3-06** à CGOV, em perguntas de múltipla escolha, antes de planejar a D3.
2. Fazer os itens **Agora** num commit por item (ou por grupo de textos), com `npm test` e `npm run test:a11y` no fim. Nenhum desses itens muda componente da biblioteca Figma, exceto se AG-03 e AG-04 mudarem o texto da `MatrizCalorAssimetrica`. Nesse caso, avisar no bloco do Figma.
3. Corrigir o desenho da D1 ([2026-11-17-etapa-d0-d1-piloto-sede-design.md](../superpowers/specs/2026-11-17-etapa-d0-d1-piloto-sede-design.md), §6), que afirma que o `seed.sql` tem "as 8 categorias do Quadro 2".
