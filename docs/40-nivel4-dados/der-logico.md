# DER lógico do RADAR (notação pé-de-galinha)

O **DER lógico** (Diagrama Entidade-Relacionamento) é o desenho **do banco que existe**: cada caixa é uma
tabela do PostgreSQL/Supabase, cada linha dentro da caixa é uma coluna com o seu tipo, e cada traço entre
caixas é uma chave estrangeira. Ele traduz o [[mer-conceitual]] para tabelas.

**De onde vem:** do **estado final das 14 migrações que mudam a estrutura** de `supabase/migrations/` (de `20261109001` até
`20261122004`; a `20261122002` só troca funções, a `20261122003` só acrescenta um gatilho e a `20261123001` só põe travas de linha nos gatilhos de `kri_riscos`), e não do design v2.0. As colunas, os tipos e as chaves foram conferidos no banco local
com as 12 primeiras migrações aplicadas (consulta ao `information_schema` e ao `pg_constraint`, só a estrutura, em
2026-11-21); a 13ª (`20261122001`, tabela `subcategorias_risco`, chave estrangeira composta e fim da coluna `subcategorias_permitidas`, [[0019-categorias-e-subcategorias-literais-sem-conversao-automatica|ADR-0019]]) foi acrescentada a partir do próprio arquivo da migração, e a 14ª (`20261122004`, LAC-03: `indicadores_kri.objeto_id`, tabela `kri_riscos`, fim de `indicadores_kri.risco_id`, campos do KRI que aceitam vazio) também. O teste `tests/unit/documentacao.spec.ts` ("DER contém exatamente as tabelas criadas nas
migrações") reprova se uma tabela for criada numa migração e não aparecer aqui, ou o contrário.

O documento anterior, [[modelo-dados-mer]], fica como histórico das migrações.

## Como ler

- **Tipos:** `uuid` (identificador único gerado pelo banco), `text`, `integer`, `bigint`, `numeric`
  (número com casas decimais), `boolean` (sim/não), `date`, `timestamptz` (data e hora com fuso) e `jsonb`
  (lista ou objeto JSON).
- **Chaves:** `PK` = chave primária (identifica a linha); `FK` = chave estrangeira (aponta para outra
  tabela); `UK` = valor único (não se repete na tabela).
- **Obrigatório ou não:** o comentário `"opcional"` marca a coluna que aceita vazio (`NULL`); as demais são
  `NOT NULL`. O domínio de cada coluna (os valores do `CHECK`) fica no `dicionario-dados.md` (Tarefa 15).
- **Pontas das linhas:** `||` exatamente um, `o|` zero ou um, `|{` um ou mais, `o{` zero ou mais (ver a
  tabela do [[mer-conceitual]]). Linha **cheia** (`--`) = chave estrangeira declarada no banco; linha
  **tracejada** (`..`) = ligação lógica **sem** chave estrangeira, de propósito.
- **Calculado pelo banco:** o comentário `"gatilho"` marca a coluna que o banco preenche sozinho; quem
  preenche a ficha não informa esse valor (RN-013).

O desenho foi dividido em **3 blocos** para ficar legível. Uma tabela aparece com as colunas no seu bloco
e, nos outros blocos, só como caixa vazia, para mostrar a ligação.

## Bloco 1 — Organização e acesso

```mermaid
erDiagram
    unidades {
        uuid id PK
        text sigla "opcional"
        text nome
        text tipo "presidencia, diretoria, coordenacao-geral, gerencia-regional, ngi, uc etc."
        uuid unidade_pai_id FK "opcional, unidade-mãe"
        boolean ativa
        timestamptz criado_em
        text icmbio_id UK "opcional, código da estrutura oficial"
        text hierarquia "opcional"
        text nome_completo "opcional"
        text grupo_regional "opcional"
        timestamptz atualizado_em "opcional"
        uuid coordenacao_territorial_id FK "opcional, CT do NGI ou UC"
    }
    perfis_usuarios {
        uuid id PK, FK "mesmo id da conta em auth.users"
        text nome_completo
        text email UK
        text cargo "opcional"
        uuid unidade_id FK
        text papel_governanca "gestor, chefias, diretor, presidencia, auditoria, cgov, cgge, gabin"
        timestamptz criado_em
        boolean ativo
        boolean titular_chefia "titular ou substituto em exercício"
    }
    processos_cadeia_valor {
        uuid id PK
        text proc_id UK "código do processo na Cadeia de Valor"
        text nome
        text macro_id "opcional"
        text macroprocesso "opcional"
        text proc_tipo "opcional"
        uuid unidade_lider_id FK "opcional"
        uuid unidade_supervisora_id FK "opcional"
        boolean ativo
        timestamptz atualizado_em "opcional"
    }
    objetos_contexto {
        uuid id PK
        text tipo_objeto "Macroprocesso, Processo, Projeto, Plano, Ação, Unidade"
        text nome_objeto
        uuid unidade_id FK "unidade dona (1ª linha)"
        uuid macroprocesso_supervisor_id FK "opcional, gatilho"
        uuid diretoria_id FK "opcional"
        text objetivo_estrategico_associado
        text insumos_principais "opcional"
        text entregas_principais "opcional"
        text partes_interessadas "opcional"
        integer ciclo_ano
        timestamptz criado_em
        uuid processo_id FK "opcional"
    }

    auth_users ||--o| perfis_usuarios : "id (apagada a conta, apaga o perfil)"
    unidades |o--o{ unidades : "unidade_pai_id"
    unidades |o--o{ unidades : "coordenacao_territorial_id"
    unidades ||--o{ perfis_usuarios : "unidade_id"
    unidades |o--o{ processos_cadeia_valor : "unidade_lider_id"
    unidades |o--o{ processos_cadeia_valor : "unidade_supervisora_id"
    unidades ||--o{ objetos_contexto : "unidade_id"
    unidades |o--o{ objetos_contexto : "macroprocesso_supervisor_id"
    unidades |o--o{ objetos_contexto : "diretoria_id"
    processos_cadeia_valor |o--o{ objetos_contexto : "processo_id"
```

`auth_users` representa a tabela `auth.users`, do Supabase (fora do esquema `public`): é a conta de login,
e por isso aparece sem colunas.

## Bloco 2 — Risco e tratamento

```mermaid
erDiagram
    categorias_risco {
        integer id PK "número sequencial"
        text nome UK
        text descricao_normativa
        text apetite_declarado "baixo, moderado, pendente_dar"
        text justificativa_dar "opcional"
    }
    subcategorias_risco {
        integer id PK "número sequencial"
        integer categoria_id FK
        text nome "UK com categoria_id"
        text descricao_normativa
        smallint ordem "posição no Quadro 3"
    }
    feriados {
        date data PK "um dia por linha"
        text nome
    }
    riscos {
        uuid id PK
        text codigo_radar UK "ex.: RADAR-2026-003"
        uuid objeto_id FK
        text responsavel_risco_nome
        text causas
        text evento_risco
        text consequencias
        text objetivo_afetado
        text descricao_padrao
        integer categoria_id FK
        text subcategoria_integridade "FK com categoria_id; obrigatória na Integridade"
        boolean teste_integridade_aplicavel
        text justificativa_nao_integridade "opcional"
        integer probabilidade "1 a 5"
        text justificativa_probabilidade "opcional"
        integer impacto "1 a 5"
        text justificativa_impacto "opcional"
        integer nivel_inerente "gatilho, Quadro 7"
        text classificacao_inerente "gatilho, Quadro 8"
        boolean possui_evidencia_controle
        text nivel_eficacia_controle "Inexistente a Forte, Quadro 6, a trava pode baixar para Fraco"
        numeric fator_controle "1,0 a 0,5, lido do Quadro 6 pela gravação da ficha, o gatilho só aplica a trava"
        numeric nivel_residual "gatilho"
        text classificacao_residual "gatilho, Quadro 8"
        text status_critico "gatilho, sim, nao, pendente_dar"
        boolean is_critico "gatilho"
        boolean origem_preliminar_cgov
        text status_fluxo "rascunho, em_validacao_cg, em_homologacao_dir, aprovado, devolvido, preliminar_cgov"
        text estrategia_principal "Mitigar, Compartilhar, Evitar, Aceitar"
        timestamptz criado_em
        timestamptz atualizado_em
    }
    controles_existentes {
        uuid id PK
        uuid risco_id FK
        text descricao_controle
        text evidencia_funcionamento
        boolean possui_evidencia_comprovada
        boolean desenho_adequado
        boolean operacao_comprovada
        timestamptz criado_em
    }
    respostas_tratamento {
        uuid id PK
        uuid risco_id FK
        text estrategia "Mitigar, Compartilhar, Evitar, Aceitar"
        text acao_o_que "5W2H: o quê"
        text justificativa_por_que "opcional, por quê"
        text local_onde "opcional, onde"
        text responsavel_quem "quem"
        date prazo_quando "quando"
        text procedimento_como "como"
        text custo_quanto "opcional, quanto"
        text status_execucao "nao_iniciada, em_andamento, concluida, atrasada"
        timestamptz criado_em
    }
    indicadores_kri {
        uuid id PK
        uuid objeto_id FK "LAC-03: o KRI é do objeto"
        text nome_indicador
        text formula_calculo "opcional"
        text fonte_dados "opcional"
        text periodicidade "Mensal, Trimestral, Semestral, Anual (opcional)"
        text meta_alvo "opcional"
        text limite_alerta "opcional"
        text responsavel_medicao "opcional"
        timestamptz criado_em
    }
    kri_riscos {
        uuid kri_id PK, FK
        uuid risco_id PK, FK
        timestamptz criado_em
    }
    medicoes_kri {
        uuid id PK
        uuid kri_id FK
        date data_medicao
        text valor_apurado
        boolean em_alerta
        text observacao "opcional"
        numeric valor_numerico "leitura como número (20261123002)"
        timestamptz criado_em
    }
    alertas_kri {
        uuid id PK
        uuid kri_id FK
        uuid medicao_id FK
        date ciencia_em "início do prazo de 10 dias úteis"
        date encerrado_em "nulo = aberto"
        uuid comunicacao_id "FK vem na migração das comunicações"
        timestamptz criado_em
    }

    objetos_contexto ||--o{ riscos : "objeto_id (apagado o objeto, apaga os riscos)"
    categorias_risco ||--o{ riscos : "categoria_id"
    categorias_risco ||--o{ subcategorias_risco : "categoria_id (não apaga categoria com subcategorias)"
    subcategorias_risco |o--o{ riscos : "(categoria_id, subcategoria_integridade)"
    riscos ||--o{ controles_existentes : "risco_id (em cascata)"
    riscos ||--o{ respostas_tratamento : "risco_id (em cascata)"
    objetos_contexto ||--o{ indicadores_kri : "objeto_id (em cascata)"
    indicadores_kri ||--o{ kri_riscos : "kri_id (em cascata)"
    riscos ||--o{ kri_riscos : "risco_id (em cascata)"
    indicadores_kri ||--o{ medicoes_kri : "kri_id (em cascata)"
    indicadores_kri ||--o{ alertas_kri : "kri_id (em cascata)"
    medicoes_kri ||--o{ alertas_kri : "medicao_id (a leitura que abriu o alerta)"
```

"Em cascata" (`ON DELETE CASCADE`) quer dizer que, ao apagar a linha de cima, o banco apaga também as de
baixo. Exemplo: apagar um risco em rascunho apaga os seus controles, ações e as ligações dele com os KRIs
(`kri_riscos`). O KRI em si só é apagado, com as medições dele, quando fica **órfão**, isto é, sem nenhum
risco ligado (gatilho da migração `20261122004`, com a trava de linha da `20261123001` para duas remoções ao mesmo tempo); um KRI que ainda serve a outro risco do objeto continua.
O risco aprovado não pode ser apagado (RN-050).

## Bloco 3 — Fluxo e auditoria

```mermaid
erDiagram
    historico_fluxo {
        uuid id PK
        uuid risco_id FK
        text etapa
        text acao
        text usuario_nome "nome gravado no momento da ação"
        text usuario_papel "papel gravado no momento da ação"
        text despacho_texto "opcional, motivo ou despacho"
        timestamptz criado_em
        uuid usuario_id "opcional, sem FK"
        bigint sequencia "gerado pelo banco, ordem das ações"
    }
    auditoria_log {
        uuid id PK
        text tabela_afetada
        uuid registro_id "opcional, sem FK, vazio na DAR"
        text operacao "INSERT, UPDATE, DELETE"
        jsonb dados_novos "opcional, vazio no DELETE"
        timestamptz realizado_em
        uuid objeto_id "opcional, sem FK"
        uuid usuario_id "opcional, sem FK"
        jsonb dados_anteriores "opcional, vazio no INSERT"
    }

    riscos ||--o{ historico_fluxo : "risco_id (em cascata)"
    perfis_usuarios |o..o{ historico_fluxo : "usuario_id, sem FK"
    perfis_usuarios |o..o{ auditoria_log : "usuario_id, sem FK"
    objetos_contexto |o..o{ auditoria_log : "objeto_id, sem FK"
```

**Por que a trilha não tem chave estrangeira:** `auditoria_log` precisa sobreviver à exclusão do que ela
registra. Se `objeto_id` fosse chave estrangeira, apagar um objeto obrigaria a apagar (ou a esvaziar) a
sua história. Por isso `objeto_id`, `usuario_id` e `registro_id` são só `uuid`, sem `FK`
(`20261115005_trilha_auditoria.sql`). O `usuario_id` guarda o `auth.uid()` de quem mexeu, que é o mesmo `id`
de `perfis_usuarios`, e fica vazio quando o administrador altera o banco direto. Nas linhas da DAR
(`categorias_risco`, de id numérico), `registro_id` fica vazio e o id vai no retrato da linha: em
`dados_novos->>'id'` nas operações `INSERT` e `UPDATE`, e em `dados_anteriores->>'id'` no `DELETE`, em que
`dados_novos` fica vazio.

Em `historico_fluxo`, `usuario_nome` e `usuario_papel` são gravados como texto para mostrar quem agiu e
com que papel **naquele dia**, mesmo que a pessoa mude de perfil depois.

## Resumo das 15 tabelas

| Tabela | Bloco | Criada em | Chaves estrangeiras declaradas |
| --- | --- | --- | --- |
| `unidades` | 1 | `20261109001` (colunas novas em `20261115001`) | `unidade_pai_id`, `coordenacao_territorial_id` → `unidades` |
| `perfis_usuarios` | 1 | `20261109001` (colunas novas em `20261115001`) | `id` → `auth.users` (em cascata); `unidade_id` → `unidades` |
| `processos_cadeia_valor` | 1 | `20261115001` | `unidade_lider_id`, `unidade_supervisora_id` → `unidades` |
| `objetos_contexto` | 1 | `20261109001` (`processo_id` em `20261115001`) | `unidade_id`, `macroprocesso_supervisor_id`, `diretoria_id` → `unidades`; `processo_id` → `processos_cadeia_valor` |
| `categorias_risco` | 2 | `20261109001` | nenhuma |
| `subcategorias_risco` | 2 | `20261122001` | `categoria_id` → `categorias_risco` |
| `feriados` | 2 | `20261123002` | nenhuma (lista de feriados que não contam como dia útil nos prazos do alerta do KRI, LAC-03) |
| `riscos` | 2 | `20261109001` | `objeto_id` → `objetos_contexto` (em cascata); `categoria_id` → `categorias_risco`; (`categoria_id`, `subcategoria_integridade`) → `subcategorias_risco` (`20261122001`) |
| `controles_existentes` | 2 | `20261109001` | `risco_id` → `riscos` (em cascata) |
| `respostas_tratamento` | 2 | `20261109001` | `risco_id` → `riscos` (em cascata) |
| `indicadores_kri` | 2 | `20261109001` (`objeto_id` em `20261122004`) | `objeto_id` → `objetos_contexto` (em cascata); a ligação aos riscos fica em `kri_riscos` (`risco_id` saiu em `20261122004`) |
| `kri_riscos` | 2 | `20261122004` | `kri_id` → `indicadores_kri` (em cascata); `risco_id` → `riscos` (em cascata) |
| `medicoes_kri` | 2 | `20261109001` (`valor_numerico` em `20261123002`) | `kri_id` → `indicadores_kri` (em cascata) |
| `alertas_kri` | 2 | `20261123002` | `kri_id` → `indicadores_kri` (em cascata); `medicao_id` → `medicoes_kri` (a leitura que abriu o alerta) |
| `historico_fluxo` | 3 | `20261109001` (`usuario_id` e `sequencia` em `20261115004`) | `risco_id` → `riscos` (em cascata) |
| `auditoria_log` | 3 | `20261109001` (`objeto_id`, `usuario_id`, `dados_anteriores` em `20261115005`) | nenhuma, de propósito |

As entidades **propostas** pelas lacunas (Ciclo, Plano de Gestão de Riscos, Comunicação de evento,
Relatório e Avaliação de maturidade) **não** entram aqui: o DER mostra só o que existe no banco. Elas estão
no [[mer-conceitual]].
