# Dicionário de dados do RADAR

O **dicionário de dados** explica, coluna por coluna, o que o banco guarda: o tipo, se pode ficar vazio, os
valores aceitos, o que a coluna quer dizer em linguagem simples, a regra de negócio que a governa e se ela
guarda **dado pessoal** (Lei nº 13.709/2018, LGPD). Ele completa o [[der-logico]], que mostra as ligações
entre as tabelas, e a [[normalizacao]], que analisa as repetições.

**De onde vem:** do banco local com as 12 migrações aplicadas (até `20261117001`), lido em 2026-11-21 no
`information_schema` (colunas, tipos e nulos) e no `pg_constraint` (os valores dos `CHECK`). São **12
tabelas e 138 colunas**. Os significados foram escritos a partir dos comentários das migrações e das regras
de [[regras-negocio]].

## Como ler

- **Nulo?** "sim" quer dizer que a coluna aceita ficar vazia (`NULL`).
- **Domínio:** os valores aceitos. Os que estão entre crases vêm do `CHECK` do banco e são os **únicos**
  aceitos. "Calculado pelo banco" quer dizer que quem preenche a ficha não informa o valor (RN-013 e
  [[0003-gravar-valores-calculados-no-risco]]). "Texto livre" quer dizer que o banco aceita qualquer texto.
- **Regra:** a regra de negócio (`RN-NNN`) que a coluna atende; "—" quando nenhuma regra a cita.
- **Dado pessoal:** "sim" quando a coluna identifica ou descreve uma pessoa; "pode conter" quando é texto
  livre em que alguém pode escrever um nome. A matrícula e o CPF **não** são gravados (RN-100). Os dados
  reais só existem no ambiente do piloto (RN-101 a RN-103).

## Estados do fluxo (`riscos.status_fluxo`)

| Valor | O que quer dizer |
| --- | --- |
| `preliminar_cgov` | A CGOV criou o risco em nome de uma unidade; a CGOV ainda pode editá-lo até a unidade assumi-lo (RN-048, RN-049). |
| `rascunho` | A unidade está preenchendo a ficha; ninguém mais a analisa ainda. |
| `em_validacao_cg` | Enviado à chefia imediata para validação (CT, GR, CG ou Diretor, conforme a árvore; GABIN na Presidência; o nome do valor é antigo). A ficha fica travada (RN-037, RN-040, RN-043). |
| `em_homologacao_dir` | Validado, aguarda a homologação (GR, Diretor ou Presidência, conforme a árvore). Vale para o risco crítico e o de residual Médio pendente de DAR (RN-041 a RN-043). |
| `aprovado` | Fim do fluxo interno. Editar a ficha aprovada a **reabre** para validação (RN-051); a mudança da DAR também pode reabri-la (RN-054). |
| `devolvido` | A chefia, o homologador ou a CGOV devolveu o risco para ajuste, com motivo (RN-046, RN-047). |

O estado só muda pelas ações do fluxo e pelas reaberturas (RN-038). O fluxo inteiro está em
[[FS-01-validacao-interna-risco]].

## Colunas por tabela

### `unidades`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `unidades` | `id` | `uuid` | não | chave primária | Identificador da unidade, gerado pelo banco. | — | não |
| `unidades` | `sigla` | `text` | sim | — | Sigla da unidade (ex.: CGOV). | — | não |
| `unidades` | `nome` | `text` | não | — | Nome da unidade. | — | não |
| `unidades` | `tipo` | `text` | não | `presidencia`, `diretoria`, `coordenacao-geral`, `gerencia-regional`, `coordenacao`, `centro-pesquisa`, `ngi`, `uc`, `coordenacao-territorial`, `coordenacao-assessoramento`, `orgao-assistencia`, `gabinete`, `divisao`, `servico`, `setor`, `base-avancada` | Tipo da unidade na estrutura do Regimento Interno. | RN-021 a RN-025 | não |
| `unidades` | `unidade_pai_id` | `uuid` | sim | chave estrangeira para `unidades` | Unidade imediatamente acima na árvore; vazio só na raiz. | RN-021, RN-040 | não |
| `unidades` | `ativa` | `boolean` | não | verdadeiro ou falso | Se a unidade está em funcionamento; unidade inativa não recebe objeto novo. | RN-034 | não |
| `unidades` | `criado_em` | `timestamptz` | não | — | Data e hora da criação da linha. | — | não |
| `unidades` | `icmbio_id` | `text` | sim | único | Código oficial da unidade no cadastro do ICMBio. | — | não |
| `unidades` | `hierarquia` | `text` | sim | — | Posição da unidade na estrutura, como vem do cadastro oficial. | — | não |
| `unidades` | `nome_completo` | `text` | sim | — | Nome por extenso da unidade, como vem do cadastro oficial. | — | não |
| `unidades` | `grupo_regional` | `text` | sim | — | Gerência Regional a que a unidade pertence, como vem do cadastro oficial. | — | não |
| `unidades` | `atualizado_em` | `timestamptz` | sim | — | Data e hora da última carga ou alteração. | — | não |
| `unidades` | `coordenacao_territorial_id` | `uuid` | sim | chave estrangeira para `unidades` | Coordenação Territorial a que o NGI ou a UC está vinculado. | RN-022, RN-040 | não |

### `perfis_usuarios`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `perfis_usuarios` | `id` | `uuid` | não | chave primária e chave estrangeira para `auth.users` | Mesmo identificador da conta de login (`auth.users`); apagada a conta, apaga o perfil. | RN-030 | sim (identifica a pessoa) |
| `perfis_usuarios` | `nome_completo` | `text` | não | — | Nome da pessoa. | — | sim |
| `perfis_usuarios` | `email` | `text` | não | único | E-mail institucional usado no login. | RN-030 | sim |
| `perfis_usuarios` | `cargo` | `text` | sim | — | Cargo ou função da pessoa. | — | sim |
| `perfis_usuarios` | `unidade_id` | `uuid` | não | chave estrangeira para `unidades` | Unidade em que a pessoa está lotada no sistema (uma só). | RN-031 | não |
| `perfis_usuarios` | `papel_governanca` | `text` | não | `gestor`, `coordenador_territorial`, `gerente_regional`, `coordenador_geral`, `diretor`, `presidencia`, `auditoria`, `cgov`, `cgge`, `gabin` | Perfil de acesso, que decide o que a pessoa lê e grava. | RN-021 a RN-030 | não |
| `perfis_usuarios` | `criado_em` | `timestamptz` | não | — | Data e hora do cadastro. | — | não |
| `perfis_usuarios` | `ativo` | `boolean` | não | verdadeiro ou falso | Se o perfil está liberado; sem perfil ativo não há acesso. | RN-026 | não |
| `perfis_usuarios` | `titular_chefia` | `boolean` | não | verdadeiro ou falso | Se a pessoa é titular da unidade, ou substituta em exercício, e pode validar ou homologar. | RN-032 | não |

### `processos_cadeia_valor`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `processos_cadeia_valor` | `id` | `uuid` | não | chave primária | Identificador do processo, gerado pelo banco. | — | não |
| `processos_cadeia_valor` | `proc_id` | `text` | não | único | Código do processo na Cadeia de Valor. | — | não |
| `processos_cadeia_valor` | `nome` | `text` | não | — | Nome do processo. | — | não |
| `processos_cadeia_valor` | `macro_id` | `text` | sim | — | Código do macroprocesso. | — | não |
| `processos_cadeia_valor` | `macroprocesso` | `text` | sim | — | Nome do macroprocesso (repete-se em cada processo; ver normalização § 3.8). | — | não |
| `processos_cadeia_valor` | `proc_tipo` | `text` | sim | texto livre | Tipo do processo: finalístico, de apoio ou gerencial. | — | não |
| `processos_cadeia_valor` | `unidade_lider_id` | `uuid` | sim | chave estrangeira para `unidades` | Unidade que lidera o processo. | — | não |
| `processos_cadeia_valor` | `unidade_supervisora_id` | `uuid` | sim | chave estrangeira para `unidades` | Coordenação-Geral que supervisiona o macroprocesso. | RN-024, RN-036 | não |
| `processos_cadeia_valor` | `ativo` | `boolean` | não | verdadeiro ou falso | Se o processo está vigente; só processo ativo recebe vínculo novo. | RN-035 | não |
| `processos_cadeia_valor` | `atualizado_em` | `timestamptz` | sim | — | Data e hora da última carga. | — | não |

### `objetos_contexto`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `objetos_contexto` | `id` | `uuid` | não | chave primária | Identificador do objeto de gestão, gerado pelo banco. | — | não |
| `objetos_contexto` | `tipo_objeto` | `text` | não | `Macroprocesso`, `Processo`, `Projeto`, `Plano`, `Ação`, `Unidade` | Tipo do objeto cujos riscos se avaliam (Quadro 1). | — | não |
| `objetos_contexto` | `nome_objeto` | `text` | não | — | Nome do objeto. | — | não |
| `objetos_contexto` | `unidade_id` | `uuid` | não | chave estrangeira para `unidades` | Unidade dona do objeto (1ª linha), que decide quem lê e grava. | RN-021 a RN-027, RN-034 | não |
| `objetos_contexto` | `macroprocesso_supervisor_id` | `uuid` | sim | chave estrangeira para `unidades` | Coordenação-Geral que supervisiona: copiada do processo pelo banco ou, sem processo, definida pela CGOV. | RN-024, RN-036 | não |
| `objetos_contexto` | `diretoria_id` | `uuid` | sim | chave estrangeira para `unidades` | Diretoria acima da unidade (não conferida com a árvore; ver normalização § 2.5). | — | não |
| `objetos_contexto` | `objetivo_estrategico_associado` | `text` | não | — | Objetivo estratégico a que o objeto serve. | — | não |
| `objetos_contexto` | `insumos_principais` | `text` | sim | — | Principais insumos, em texto livre. | — | não |
| `objetos_contexto` | `entregas_principais` | `text` | sim | — | Principais entregas, em texto livre. | — | não |
| `objetos_contexto` | `partes_interessadas` | `text` | sim | — | Partes interessadas, em texto livre. | — | pode conter (texto livre) |
| `objetos_contexto` | `ciclo_ano` | `integer` | não | — | Ano do ciclo de gestão de riscos do objeto; padrão: o ano corrente. | — | não |
| `objetos_contexto` | `criado_em` | `timestamptz` | não | — | Data e hora da criação. | — | não |
| `objetos_contexto` | `processo_id` | `uuid` | sim | chave estrangeira para `processos_cadeia_valor` | Processo da Cadeia de Valor a que o objeto se liga. | RN-035, RN-036 | não |

### `categorias_risco`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `categorias_risco` | `id` | `integer` | não | chave primária, sequencial | Número da categoria. | — | não |
| `categorias_risco` | `nome` | `text` | não | único | Nome da categoria (Quadro 2; alinhamento pendente, LAC-14). | RN-015 | não |
| `categorias_risco` | `descricao_normativa` | `text` | não | — | Descrição da categoria segundo a Metodologia. | — | não |
| `categorias_risco` | `apetite_declarado` | `text` | não | `baixo`, `moderado`, `pendente_dar` | Apetite da DAR para a categoria; `pendente_dar` enquanto não declarado. | RN-005, RN-008 a RN-010, RN-055, RN-056 | não |
| `categorias_risco` | `justificativa_dar` | `text` | sim | — | Justificativa do apetite declarado. | — | não |
| `categorias_risco` | `subcategorias_permitidas` | `jsonb` | sim | lista JSON; padrão `[]` | Lista das subcategorias aceitas (lista em JSON; ver normalização § 2.1). | RN-017 | não |

### `riscos`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `riscos` | `id` | `uuid` | não | chave primária | Identificador do risco, gerado pelo banco. | — | não |
| `riscos` | `codigo_radar` | `text` | não | único | Código do risco no formato `RADAR-<ano>-<NNN>`. | RN-099 | não |
| `riscos` | `objeto_id` | `uuid` | não | chave estrangeira para `objetos_contexto` | Objeto de gestão do risco; apagado o objeto, apaga os riscos. | RN-050 | não |
| `riscos` | `responsavel_risco_nome` | `text` | não | — | Nome do responsável pelo risco, em texto livre (ver normalização § 2.6). | — | sim |
| `riscos` | `causas` | `text` | não | — | Causa ou causas do evento (sintaxe do item 4.2.1). | RN-014 | não |
| `riscos` | `evento_risco` | `text` | não | — | O evento incerto. | RN-014 | não |
| `riscos` | `consequencias` | `text` | não | — | Consequência ou consequências do evento. | RN-014 | não |
| `riscos` | `objetivo_afetado` | `text` | não | — | Objetivo que o evento afeta. | RN-014 | não |
| `riscos` | `descricao_padrao` | `text` | não | calculado pelo banco | Frase padrão do item 4.2.1, montada pelo gatilho ("Devido o(a)..."); não se informa. | RN-013, RN-014 | não |
| `riscos` | `categoria_id` | `integer` | não | chave estrangeira para `categorias_risco` | Categoria dominante do risco. | RN-015, RN-016 | não |
| `riscos` | `subcategoria_integridade` | `text` | sim | texto livre | Subcategoria do Quadro 3, para risco de Integridade (texto livre hoje, LAC-15). | RN-017 | não |
| `riscos` | `teste_integridade_aplicavel` | `boolean` | não | verdadeiro ou falso | Se o objeto envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação. | RN-006 | não |
| `riscos` | `justificativa_nao_integridade` | `text` | sim | — | Por que o risco não foi classificado como Integridade quando o teste se aplica. | RN-018 | não |
| `riscos` | `probabilidade` | `integer` | não | 1 a 5 | Probabilidade na escala do Quadro 4. | RN-011 | não |
| `riscos` | `justificativa_probabilidade` | `text` | sim | — | Justificativa da probabilidade escolhida. | — | não |
| `riscos` | `impacto` | `integer` | não | 1 a 5 | Impacto na escala do Quadro 5. | RN-012 | não |
| `riscos` | `justificativa_impacto` | `text` | sim | — | Justificativa do impacto escolhido. | — | não |
| `riscos` | `nivel_inerente` | `integer` | não | 1 a 25; calculado pelo banco | Risco inerente lido na tabela de 25 células do Quadro 7 (nunca P × I). | RN-001, RN-013 | não |
| `riscos` | `classificacao_inerente` | `text` | não | `Baixo`, `Médio`, `Alto`, `Extremo`; calculado pelo banco | Faixa do Quadro 8 do inerente. | RN-002, RN-013 | não |
| `riscos` | `possui_evidencia_controle` | `boolean` | não | verdadeiro ou falso | Se há evidência comprovada de funcionamento dos controles; sem ela, a eficácia vai no máximo a Fraco. | RN-004 | não |
| `riscos` | `nivel_eficacia_controle` | `text` | não | `Inexistente`, `Fraco`, `Mediano`, `Satisfatório`, `Forte` | Eficácia dos controles no Quadro 6. O gatilho a troca por Fraco quando não há evidência e o fator é menor que 0,90. | RN-003, RN-004 | não |
| `riscos` | `fator_controle` | `numeric` | não | `1.00`, `0.90`, `0.75`, `0.60`, `0.50`; calculado pela gravação da ficha | Fator do Quadro 6 que multiplica o inerente. Lido do Quadro 6 pela função de gravação da ficha (`20261117001`); o gatilho só aplica a trava (sem evidência e fator abaixo de 0,90 → Fraco, 0,90). Quem grava `riscos` direto informa o fator (ver normalização § 2.2). | RN-003, RN-004, RN-013 | não |
| `riscos` | `nivel_residual` | `numeric` | não | calculado pelo banco | Risco residual = inerente × fator, com 2 casas, sem arredondar antes da faixa. | RN-003, RN-007, RN-013 | não |
| `riscos` | `classificacao_residual` | `text` | não | `Baixo`, `Médio`, `Alto`, `Extremo`; calculado pelo banco | Faixa do Quadro 8 do residual, sobre o valor exato (10,2 é Alto). | RN-002, RN-007, RN-013 | não |
| `riscos` | `status_critico` | `text` | não | `sim`, `nao`, `pendente_dar`; calculado pelo banco | Situação perante a DAR: `sim` (risco crítico, fora do apetite), `nao` ou `pendente_dar` (residual Médio em categoria sem apetite). | RN-005, RN-008 a RN-010 | não |
| `riscos` | `is_critico` | `boolean` | não | calculado pelo banco | Verdadeiro quando `status_critico` é `sim` (repete a coluna; ver normalização § 2.3). | RN-005 | não |
| `riscos` | `origem_preliminar_cgov` | `boolean` | não | verdadeiro ou falso | Se o risco nasceu como preliminar da CGOV. | RN-048, RN-049 | não |
| `riscos` | `status_fluxo` | `text` | não | `preliminar_cgov`, `rascunho`, `em_validacao_cg`, `em_homologacao_dir`, `aprovado`, `devolvido` | Estado do risco no fluxo interno (ver a tabela abaixo). | RN-037, RN-038, RN-041 | não |
| `riscos` | `estrategia_principal` | `text` | não | `Mitigar`, `Compartilhar`, `Evitar`, `Aceitar` | Resposta escolhida para o risco. | RN-020 | não |
| `riscos` | `criado_em` | `timestamptz` | não | — | Data e hora da criação. | — | não |
| `riscos` | `atualizado_em` | `timestamptz` | não | calculado pelo banco | Data e hora da última gravação (não prova reavaliação, LAC-10). | — | não |

### `controles_existentes`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `controles_existentes` | `id` | `uuid` | não | chave primária | Identificador do controle. | — | não |
| `controles_existentes` | `risco_id` | `uuid` | não | chave estrangeira para `riscos` | Risco que o controle reduz; apagado o risco, apaga o controle. | — | não |
| `controles_existentes` | `descricao_controle` | `text` | não | — | O que o controle faz. | — | não |
| `controles_existentes` | `evidencia_funcionamento` | `text` | não | — | Onde está a prova de que o controle funciona. | RN-004 | não |
| `controles_existentes` | `possui_evidencia_comprovada` | `boolean` | não | verdadeiro ou falso | Se a evidência foi comprovada (não alimenta a trava; ver normalização § 2.4). | RN-004 | não |
| `controles_existentes` | `desenho_adequado` | `boolean` | não | verdadeiro ou falso | Se o desenho do controle é adequado ao risco. | — | não |
| `controles_existentes` | `operacao_comprovada` | `boolean` | não | verdadeiro ou falso | Se o controle opera na prática. | — | não |
| `controles_existentes` | `criado_em` | `timestamptz` | não | — | Data e hora da criação. | — | não |

### `respostas_tratamento`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `respostas_tratamento` | `id` | `uuid` | não | chave primária | Identificador da ação. | — | não |
| `respostas_tratamento` | `risco_id` | `uuid` | não | chave estrangeira para `riscos` | Risco tratado; apagado o risco, apaga a ação. | RN-019 | não |
| `respostas_tratamento` | `estrategia` | `text` | não | `Mitigar`, `Compartilhar`, `Evitar`, `Aceitar` | Estratégia da ação. | RN-020 | não |
| `respostas_tratamento` | `acao_o_que` | `text` | não | — | 5W2H, o quê: a ação. | — | não |
| `respostas_tratamento` | `justificativa_por_que` | `text` | sim | — | 5W2H, por quê. | — | não |
| `respostas_tratamento` | `local_onde` | `text` | sim | — | 5W2H, onde. | — | não |
| `respostas_tratamento` | `responsavel_quem` | `text` | não | — | 5W2H, quem: nome do responsável, em texto livre. | — | sim |
| `respostas_tratamento` | `prazo_quando` | `date` | não | — | 5W2H, quando: o prazo. | — | não |
| `respostas_tratamento` | `procedimento_como` | `text` | não | — | 5W2H, como. | — | não |
| `respostas_tratamento` | `custo_quanto` | `text` | sim | padrão: "Sem custo adicional" | 5W2H, quanto custa. | — | não |
| `respostas_tratamento` | `status_execucao` | `text` | não | `nao_iniciada`, `em_andamento`, `concluida`, `atrasada` | Situação da ação; mudá-la não reabre o risco aprovado. | RN-052 | não |
| `respostas_tratamento` | `criado_em` | `timestamptz` | não | — | Data e hora da criação. | — | não |

### `indicadores_kri`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `indicadores_kri` | `id` | `uuid` | não | chave primária | Identificador do KRI. | — | não |
| `indicadores_kri` | `risco_id` | `uuid` | não | chave estrangeira para `riscos` | Risco monitorado; apagado o risco, apaga o KRI. | RN-082 | não |
| `indicadores_kri` | `nome_indicador` | `text` | não | — | Nome do KRI. | RN-083 | não |
| `indicadores_kri` | `formula_calculo` | `text` | não | — | Métrica: como o valor é calculado. | RN-083 | não |
| `indicadores_kri` | `fonte_dados` | `text` | não | — | De onde vêm os dados. | RN-083 | não |
| `indicadores_kri` | `periodicidade` | `text` | não | `Mensal`, `Trimestral`, `Semestral`, `Anual` | Frequência da medição. | RN-083 | não |
| `indicadores_kri` | `meta_alvo` | `text` | não | texto livre | Valor desejado. | — | não |
| `indicadores_kri` | `limite_alerta` | `text` | não | texto livre | Valor que, ultrapassado, dispara a reavaliação do risco. | RN-083, RN-084 | não |
| `indicadores_kri` | `responsavel_medicao` | `text` | não | — | Nome de quem mede, em texto livre. | RN-083 | sim |
| `indicadores_kri` | `criado_em` | `timestamptz` | não | — | Data e hora da criação. | — | não |

### `medicoes_kri`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `medicoes_kri` | `id` | `uuid` | não | chave primária | Identificador da medição. | — | não |
| `medicoes_kri` | `kri_id` | `uuid` | não | chave estrangeira para `indicadores_kri` | KRI medido; apagado o KRI, apaga a medição. | — | não |
| `medicoes_kri` | `data_medicao` | `date` | não | — | Data da leitura; padrão: hoje. | — | não |
| `medicoes_kri` | `valor_apurado` | `text` | não | texto livre | Valor medido. | — | não |
| `medicoes_kri` | `em_alerta` | `boolean` | não | verdadeiro ou falso | Se a leitura passou do limite de alerta (marcado à mão). | RN-084 | não |
| `medicoes_kri` | `observacao` | `text` | sim | — | Comentário sobre a leitura. | — | pode conter (texto livre) |
| `medicoes_kri` | `criado_em` | `timestamptz` | não | — | Data e hora do lançamento; lançar medição não reabre o risco aprovado. | RN-052 | não |

### `historico_fluxo`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `historico_fluxo` | `id` | `uuid` | não | chave primária | Identificador da movimentação. | — | não |
| `historico_fluxo` | `risco_id` | `uuid` | não | chave estrangeira para `riscos` | Risco movimentado; apagado o risco, apaga o histórico. | RN-096 | não |
| `historico_fluxo` | `etapa` | `text` | não | texto livre, gravado pelas funções do fluxo | Etapa do fluxo em que a ação ocorreu. | RN-096 | não |
| `historico_fluxo` | `acao` | `text` | não | texto livre, gravado pelas funções do fluxo | Ação feita (enviar, validar, homologar, devolver, reabrir...). | RN-038, RN-096 | não |
| `historico_fluxo` | `usuario_nome` | `text` | não | — | Nome de quem agiu, gravado no dia da ação. | RN-096 | sim |
| `historico_fluxo` | `usuario_papel` | `text` | não | — | Papel de quem agiu, gravado no dia da ação. | RN-096 | não |
| `historico_fluxo` | `despacho_texto` | `text` | sim | — | Despacho ou motivo; obrigatório na devolução. | RN-046, RN-096 | pode conter (texto livre) |
| `historico_fluxo` | `criado_em` | `timestamptz` | não | — | Data e hora da ação. | RN-096 | não |
| `historico_fluxo` | `usuario_id` | `uuid` | sim | uuid, sem chave estrangeira | Identificador de quem agiu (`auth.uid()`), sem chave estrangeira. | RN-096 | sim (identifica a pessoa) |
| `historico_fluxo` | `sequencia` | `bigint` | não | gerado pelo banco (identidade) | Número em ordem crescente, gerado pelo banco, que ordena as ações. | — | não |

### `auditoria_log`

| Tabela | Coluna | Tipo | Nulo? | Domínio | Significado | Regra | Dado pessoal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `auditoria_log` | `id` | `uuid` | não | chave primária | Identificador do registro. | — | não |
| `auditoria_log` | `tabela_afetada` | `text` | não | uma das 8 tabelas auditadas | Tabela em que houve a mudança. | RN-095 | não |
| `auditoria_log` | `registro_id` | `uuid` | sim | uuid, sem chave estrangeira | Identificador da linha alterada; vazio nas linhas da DAR (id numérico vai no JSON). | RN-095 | não |
| `auditoria_log` | `operacao` | `text` | não | `INSERT`, `UPDATE` ou `DELETE` (gravado pelo gatilho) | Tipo da mudança. | RN-095 | não |
| `auditoria_log` | `dados_novos` | `jsonb` | sim | JSON | Retrato da linha depois da mudança; vazio na exclusão. | RN-095 | sim (retrato da linha) |
| `auditoria_log` | `realizado_em` | `timestamptz` | não | — | Data e hora da mudança. | RN-095 | não |
| `auditoria_log` | `objeto_id` | `uuid` | sim | uuid, sem chave estrangeira | Objeto de gestão a que a mudança pertence; vazio em perfis e DAR (só a CGOV lê essas linhas). | RN-098 | não |
| `auditoria_log` | `usuario_id` | `uuid` | sim | uuid, sem chave estrangeira | Quem fez a mudança (`auth.uid()`); vazio quando o administrador altera o banco direto. | RN-095 | sim (identifica a pessoa) |
| `auditoria_log` | `dados_anteriores` | `jsonb` | sim | JSON | Retrato da linha antes da mudança; vazio na inclusão. | RN-095 | sim (retrato da linha) |
