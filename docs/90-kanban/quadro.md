---

kanban-plugin: basic

---

## Backlog

- [ ] [dados] Troca de titular em duas gravações: se a retirada da chave do anterior falhar, a unidade fica com dois titulares; fazer a troca numa operação única no banco (migração; pede plano autorizado) · origem: revisão do CodeRabbit na PR #9 e UC-02 (exceção 5a.2) · IDs: UC-02 · #padrao
- [ ] [dívida] Cópia agendada com `sslmode=verify-full`: baixar o certificado do Supabase no painel e montá-lo no contêiner do `pg_dump` (hoje a conexão exige TLS, mas não confere o certificado) · origem: revisão do CodeRabbit na PR #9 e guia-copia-restauracao §4 · IDs: — · #padrao
- [ ] [funcional] Cargo vago trava o fluxo: sem titular na chefia, o risco não sobe (decisão futura: delegação ou substituto) · origem: decisoes-tecnicas-b1 (Pendências novas, item 1), decisoes-tecnicas-b3 §3.1 e FS-01-validacao-interna-risco (Caminhos de exceção, "Cargo vago") · IDs: — · #padrao
- [ ] [funcional] Formulário de risco edita só o 1º controle, a 1ª ação e o 1º KRI; os demais são preservados, mas não editáveis ali · origem: decisoes-tecnicas-b3 §3.2 (B3-11) · IDs: — · #padrao
- [ ] [dados] Criticidade gravada em `acoes_no_fluxo` pode divergir após mudança da DAR, em risco não aprovado e não editado depois · origem: decisoes-tecnicas-b3 §3.2 (B3-7) · IDs: — (tabela: `acoes_no_fluxo`) · #padrao
- [ ] [interface] Meta de 3.500 px de altura do Painel no celular não atingida (3.690 / 3.771 px); decisão da CGOV: cortar conteúdo ou reduzir alvos de toque · origem: decisoes-tecnicas-c §5 e ESTADO-ATUAL (etapa C) · IDs: — · #padrao
- [ ] [dados] Lacuna do SharePoint: a CT Cuiabá (23.3005) está com tipo errado e o `microgrupo` "CT Cuiabá" (42 unidades) não tem CT correspondente · origem: ESTADO-ATUAL (etapa B2, achados para a CGOV) · IDs: — · #padrao
- [ ] [dados] Lacuna do SharePoint: só a CT Curitiba tem unidades vinculadas; as demais CTs estão sem unidades (a CGOV vai corrigir as circunscrições) · origem: ESTADO-ATUAL (etapa B2, lacuna de dados) · IDs: — · #padrao
- [ ] [figma] Republicar a biblioteca "RADAR — Painel" no Figma (Assets → Libraries → Publish changes) · origem: ESTADO-ATUAL (reformulação da interface) e decisoes-tecnicas-c §5 · IDs: — · #padrao
- [ ] [figma] Ligar no Code Connect, à mão, os 4 componentes BrTabs, BrStep, BrMessage e BowTieDiagram · origem: ESTADO-ATUAL (reformulação da interface) · IDs: — · #padrao
- [ ] [figma] Criar na biblioteca a variante `compacto` do `StatCard` · origem: decisoes-tecnicas-c §5 e ESTADO-ATUAL (etapa C) · IDs: — · #padrao
- [ ] [figma] Atualizar o quadro de computador (1440) da cópia "Trabalho" do Painel (nó `48:549`) para o estado atual do código. Conferido em 2026-11-20: a etapa C não mudou nada no computador, mas o quadro ficou atrás das etapas B2/B3 — "Ver como" virou lista de seleção (no Figma ainda é SegmentedControl de 4 opções), falta o item "Usuários e perfis" no menu, o selo "3" do Apetite (DAR) no menu está em vermelho no código, os ícones das redes no rodapé mudaram e falta a faixa "Modo demonstração". Textos e quantidades da "Precisa da sua atenção" e da "Atividade recente" variam com a data e os dados de demonstração (não são diferença de desenho) · origem: decisoes-tecnicas-c §5 e conferência no Figma de 2026-11-20 · IDs: — · #padrao
- [ ] [documentação] Errata dos comentários das migrações `20261115004` e `20261115005` (migração aplicada não se edita: registrar a correção só na documentação) · origem: decisoes-tecnicas-b1 (Pendências novas, item 6) · IDs: — · #divida
- [ ] [interface] Pendências de interface do piloto da Sede (etapa D): a lista própria, com classes Agora/Depois, fica no arquivo apontado; não copiar item a item · origem: docs/00-memoria/pendencias-ui-piloto.md · IDs: — · #padrao
- [ ] [normativo] Plano de Gestão de Riscos único: carteira, consolidação, devolução em 10 dias úteis, ressalva de incompletude, versões e calendário · IDs: LAC-01 · origem: Metodologia 4.6.1 a 4.6.3, 4.6.8, 4.6.10 e 4.6.11 · #normativo
- [ ] [normativo] Registrar a manifestação do CTGRIC, a deliberação do CIG (DAR antes do Plano), a publicação e a reapresentação · IDs: LAC-02 · origem: Política arts. 9º, 12, XI, e 13; Metodologia 4.6.4 a 4.6.9 · #normativo
- [ ] [normativo] KRI obrigatório para risco crítico, por grupo de riscos correlatos, com consequência do alerta (reavaliar e comunicar em 10 dias úteis) · IDs: LAC-03 · origem: Metodologia 4.7.1; Política art. 8º, § 2º · #normativo
- [ ] [normativo] Comunicação à CGOV das 6 hipóteses do 4.7.2 em até 10 dias úteis da ciência do fato · IDs: LAC-04 · origem: Metodologia 4.7.2, I a VI; Política art. 17, IV · #normativo
- [ ] [normativo] Dados para os relatórios trimestrais da CGOV ao CTGRIC e ao CIG (carteira crítica, controles e KRI) · IDs: LAC-05 · origem: Metodologia 4.7.2 · #normativo
- [ ] [normativo] Registro e dados da avaliação gerencial anual da CGOV, com ciência à AUDIT · IDs: LAC-06 · origem: Metodologia item 5; Política art. 15, X · #normativo
- [ ] [normativo] Revisão do Plano: decisão da CGOV em 10 dias úteis e separação entre revisão substancial e atualização ordinária · IDs: LAC-07 · origem: Política art. 9º; Metodologia 4.6.9 e 4.7.2 · #normativo
- [ ] [normativo] Rito da DAR (CGOV, CTGRIC, CIG e portaria) no lugar da alteração direta do apetite em /dar · IDs: LAC-08 · origem: Política arts. 7º, IV, 8º, § 1º, 12, V e XI, e 13, § 1º; Metodologia 4.6.4 a 4.6.7 e Anexo III · #normativo
- [ ] [normativo] Acompanhamento da carteira de riscos críticos e cobrança de pendências pela CGOV (ciência à chefia após 10 dias úteis) · IDs: LAC-09 · origem: Política art. 15, IX; Metodologia 4.7.2 · #normativo
- [ ] [normativo] Reavaliação anual de todo risco registrado, com período menor opcional no registro do risco · IDs: LAC-10 · origem: Metodologia 4.7 · #normativo
- [ ] [normativo] Decisão da CGOV sobre manter o fluxo interno de 3 degraus (FS-01) antes do 4.6.1 · IDs: LAC-11 · origem: Metodologia 4.6.1 e 4.6.2; Política art. 17 · #normativo
- [ ] [normativo] Rótulos da escala de probabilidade iguais aos do Quadro 4 (Raro a Praticamente certo, sem percentuais) · IDs: LAC-12 · origem: Metodologia 4.3, a (Quadro 4); pendência AG-04 · #normativo
- [ ] [normativo] Risco crítico com "Aceitar" sem tratamento (Anexo III, diretrizes) · IDs: LAC-13 · origem: Metodologia 4.5 e 4.5.1 (Tabela 8 da minuta); Anexo III (diretrizes) · #normativo
- [ ] [normativo] Categorias do risco iguais às 8 do Quadro 2 (base do apetite da DAR) · IDs: LAC-14 · origem: Metodologia 4.2.2 (Quadro 2) e Anexo III; pendência D3-01 · #normativo
- [ ] [normativo] Subcategorias de Integridade iguais às 6 do Quadro 3 · IDs: LAC-15 · origem: Metodologia 4.2.2.1 (Quadro 3); Portaria ICMBio nº 253/2026; pendência D3-02 · #normativo
- [ ] [dívida] Teste pgTAP para a recusa do envio quando a unidade não tem chefia imediata na árvore (FS-01.04; sem teste próprio desde a P-B1-1) · origem: FS-01-validacao-interna-risco (Caminhos de exceção) · IDs: — · #divida
- [ ] [dívida] Teste pgTAP para a devolução pela CGOV de risco em validação sem validador efetivo (FS-01.12; só o caso da homologação tem teste, `073` bloco 3b) · origem: FS-01-validacao-interna-risco (FS-01.12) e decisoes-tecnicas-b1 §5, pendência 2 · IDs: — · #divida
- [ ] [documentação] Decidir onde fica o "um clique" da análise de atos (ADR) · IDs: — · origem: FS-02 · #padrao
- [ ] [funcional] Importador: recusas e conversões silenciosas antes da primeira carga real do piloto (6 das 8 categorias da skill recusadas e bloqueiam o lote; "Integridade" vira "Corrupção e Fraude"; P/I só com o nome da escala, 0, acima de 5 ou negativo convertidos sem aviso; meta e limite do KRI inventados; "sem evidencia" sem acento lido como com evidência; "inexistente" minúsculo cria controle; aviso de divergência do número prometido e não implementado; RADAR só lê o Regime B) · IDs: LAC-03, LAC-12, LAC-14, LAC-15 · origem: FS-02, seção "Contrato com o Importar" (conferido por script na revisão de 2026-11-21) · #padrao
- [ ] [documentação] Decidir quem cadastra objeto de gestão de riscos: só a CGOV (Matriz §5/§7) ou também a unidade (o banco aceita, teste 041 bloco 5) · IDs: UC-04, RF (nota 1) · origem: revisão da Tarefa 12 · #padrao
- [ ] [dívida] Testar as 25 células do Quadro 7 (hoje só P=1, I=5 e P=5, I=1 têm teste), no TypeScript (`calculadoraRiscoRadar.ts`) e no banco (`calcular_nivel_inerente_q7`, pgTAP `000`), comparando as duas implementações · IDs: RN-001 · origem: revisão da Tarefa 11 (2026-11-21), requisitos-nao-funcionais.md, Adequação funcional · #divida
- [ ] [documentação] Matriz de acesso §7: a tabela de telas mostra Riscos e Ficha como só leitura para a AUDIT e Novo risco como edição; esclarecer a diferença · origem: visao-produto (Partes interessadas, linha da AUDIT) · IDs: — · #divida
- [ ] [dívida] Fator × eficácia: o gatilho de cálculo não lê o fator do Quadro 6 a partir da eficácia; um `UPDATE` direto em `riscos` grava par incoerente (ex.: Forte com 1,00), e a trava confere o fator, não a eficácia: "Forte" sem evidência com fator 1,00 passa (contraria a RN-004). Fazer o gatilho derivar o fator (mexe no cálculo: perguntar ao responsável; migração autorizada) · origem: normalizacao §2.2 e ADR-0003 · IDs: RN-003, RN-013 · tabela `riscos` · #divida
- [ ] [dívida] Evidência do risco desligada dos controles: `riscos.possui_evidencia_controle` não é derivada de `controles_existentes.possui_evidencia_comprovada`, e a trava do Quadro 6 usa só a do risco. Derivar dos controles (regra "pelo menos um" a confirmar com a CGOV) · origem: normalizacao §2.4 · IDs: RN-004 · tabelas `riscos`, `controles_existentes` · #divida
- [ ] [dívida] `is_critico` repete `status_critico`: transformar em coluna gerada (`status_critico = 'sim'`) · origem: normalizacao §2.3 · IDs: RN-005 · tabela `riscos` · #divida
- [ ] [dívida] Subcategorias em JSONB (1FN): criar tabela de subcategorias do Quadro 3 com chave estrangeira em `riscos` (junto com a LAC-15) · origem: normalizacao §2.1 · IDs: RN-017, LAC-15 · tabelas `categorias_risco`, `riscos` · #divida
- [ ] [dívida] `objetos_contexto.diretoria_id` sem conferência com a árvore: obter a Diretoria pela árvore de unidades (função ou visão) e tirar a coluna · origem: normalizacao §2.5 · IDs: — · tabela `objetos_contexto` · #divida
- [ ] [dívida] `macroprocesso_supervisor_id` é desnormalização sem ADR: registrar o ADR (cópia do processo mantida por gatilho para a leitura do CG) ou separar o supervisor do objeto sem processo · origem: normalizacao §2.5 · IDs: RN-024, RN-036 · tabela `objetos_contexto` · #divida
- [ ] [dívida] Responsáveis em texto livre (`riscos.responsavel_risco_nome`, `respostas_tratamento.responsavel_quem`, `indicadores_kri.responsavel_medicao`): chave estrangeira opcional para `perfis_usuarios`, com nome em texto só para quem não tem conta (dado pessoal) · origem: normalizacao §2.6 · IDs: — · tabelas `riscos`, `respostas_tratamento`, `indicadores_kri` · #divida
- [ ] [dívida] Listas em texto em `objetos_contexto` (insumos, entregas, partes interessadas) (1FN, prioridade baixa): tabela de itens do contexto do objeto · origem: normalizacao §2.7 · IDs: — · tabela `objetos_contexto` · #divida
- [ ] [dívida] Causas e consequências num texto só (1FN): tabelas de causas e de consequências, uma linha por item, com a frase do 4.2.1 montada a partir delas · origem: normalizacao §3.1 · IDs: RN-014 · tabela `riscos` · #divida
- [ ] [dívida] `processos_cadeia_valor.macroprocesso` repete o nome por processo (`macro_id → macroprocesso`, 3FN, prioridade baixa): tabela de macroprocessos · origem: normalizacao §3.8 · IDs: — · tabela `processos_cadeia_valor` · #divida
- [ ] [dívida] `perfis_usuarios.email` repete o e-mail da conta (`auth.users`): sincronizar na troca de e-mail ou ler só da conta · origem: normalizacao §3.10 · IDs: RN-030 · tabela `perfis_usuarios` · #divida


## Pronto para iniciar (WIP 5)



## Modelagem (WIP 3)



## Desenvolvimento (WIP 2)



## Revisão (WIP 2)



## Homologação CGOV (WIP 3)



## Concluído

**Complete**




%% kanban:settings
```
{"kanban-plugin":"basic"}
```
%%
