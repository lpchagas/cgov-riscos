-- ============================================================================
-- ETAPA B3 — Leituras para as telas e gravação única da ficha
-- (autorizada pelo dono do produto em 2026-11-16; spec
--  docs/superpowers/specs/2026-11-16-etapa-b3-telas-banco-design.md, §6)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Na B3 as telas passam a ler e gravar no banco de verdade. Para isso, esta
-- migração cria quatro funções (e uma sequência), em quatro seções:
--
--   Seção 1 — acoes_no_fluxo(riscos uuid[])      (só leitura)
--             Para cada risco, diz quais botões do fluxo a pessoa logada
--             veria: enviar, assumir, validar, homologar, devolver, editar,
--             excluir — e, quando um botão esperado some, o MOTIVO.
--   Seção 2 — salvar_ficha_risco(ficha jsonb) + sequência riscos_codigo_seq
--             Grava a ficha inteira (risco + controles + respostas + KRIs)
--             num único comando e gera o código RADAR-<ano>-<NNN>.
--   Seção 3 — ler_auditoria(...)                   (só leitura)
--             Lê a trilha de auditoria com cursor (50 por página).
--   Seção 4 — objetos_onde_gravo()                 (só leitura)
--             Lista os objetos de gestão de riscos em que a pessoa grava.
--
-- O QUE ESTA MIGRAÇÃO NÃO FAZ: não mexe em políticas de RLS, nas funções de
-- alcance, nas regras do fluxo nem no cálculo do risco (Quadros 6, 7 e 8 /
-- trigger_calcular_risco_radar). As leituras só devolvem o que a pessoa já
-- pode ler.
-- ============================================================================


-- ============================================================================
-- SEÇÃO 1 — acoes_no_fluxo(riscos uuid[]): quais botões a pessoa vê
-- ============================================================================
-- PARA QUE SERVE:
-- A tela de riscos precisa saber, risco a risco, se mostra os botões
-- "Enviar", "Assumir", "Validar", "Homologar", "Devolver", "Editar" e
-- "Excluir". Se a tela adivinhasse com regras próprias, um dia ela
-- discordaria do banco: o botão apareceria e o clique daria erro. Por isso o
-- próprio banco responde, usando AS MESMAS funções internas que as ações usam.
--
-- REGRA DE OURO (spec §6.1): cada coluna diz "sim" SE E SOMENTE SE a ação de
-- verdade passaria. O teste supabase/tests/080_acoes_no_fluxo.test.sql prova
-- isso para todas as pessoas da semente, tentando cada ação de verdade.
--
-- COLUNAS (e a ação que cada uma espelha):
--   pode_enviar    ← enviar_para_validacao (20261116001)
--                    estado rascunho/devolvido, pode_escrever_objeto, existe
--                    chefia_imediata, há validador efetivo (com a pessoa
--                    logada como quem envia) e, se o risco exige homologação,
--                    há homologador efetivo.
--   pode_assumir   ← assumir_risco_preliminar (20261115004)
--                    estado preliminar_cgov e pode_escrever_objeto (a unidade).
--   pode_validar   ← validar_risco (20261116001)
--                    estado em_validacao_cg, a pessoa é titular do validador
--                    efetivo (calculado a partir de QUEM ENVIOU, regra D1) e,
--                    se exige homologação, há homologador efetivo.
--   pode_homologar ← homologar_risco (20261115004)
--                    estado em_homologacao_dir e a pessoa é titular do
--                    homologador efetivo.
--   pode_devolver  ← devolver_risco (20261116004)
--                    titular do ator efetivo do estado (validador ou
--                    homologador), OU a saída da CGOV (coluna abaixo).
--   devolucao_cgov ← devolver_risco, caminho P-B1-8
--                    estado de decisão SEM ator efetivo e perfil `cgov` ativo.
--   pode_editar    ← UPDATE da ficha (RLS "Riscos: altera..." + gatilho
--                    fn_trava_reabertura_risco + fn_fluxo_exigir_validador_na_reabertura)
--                    quem escreve no objeto (ou a CGOV no preliminar), fora da
--                    trava (em_validacao_cg/em_homologacao_dir) e, se o risco
--                    está aprovado, a reabertura seria aceita.
--   pode_excluir   ← DELETE (RLS "Riscos: apaga..." e "CGOV apaga os
--                    preliminares" + regra D2 do gatilho)
--                    quem escreve no objeto (ou a CGOV no preliminar) e estado
--                    rascunho, devolvido ou preliminar_cgov.
--   motivo         frase curta quando um botão esperado some por regra do banco.
--
-- EXEMPLOS COM A SEMENTE:
--   gestor.uc@ e RADAR-DEMO-UC-CT (rascunho, Baixo, FLONA de Caçador):
--     pode_enviar, pode_editar e pode_excluir = true; o resto false.
--   gr1@ e RADAR-DEMO-UC-SCT (em validação, FLONA do Tapajós): a chefia
--     imediata da FLONA (sem CT) é a GR1 → pode_validar e pode_devolver = true.
--   gestor.uc-sem-ct@ no mesmo risco: tudo false e
--     motivo = 'Ficha em validação ou homologação: peça a devolução para editar.'
--   presidente@ e um rascunho CRÍTICO da Presidência: quem valida é o GABIN,
--     mas o homologador "sobe" e não há ninguém acima do Presidente →
--     pode_enviar = false e motivo = 'Não há quem homologue este risco; a
--     CGOV pode devolvê-lo.'
--
-- "EXIGE HOMOLOGAÇÃO" E UMA DIFERENÇA CONHECIDA (decisão do controlador, opção 1):
--   As ações calculam "exige homologação" como
--       is_critico OR status_critico = 'pendente_dar'
--   mas ANTES recalculam a criticidade (um UPDATE "estado → mesmo estado" que
--   reaciona o gatilho de cálculo). Uma função só de leitura não pode fazer
--   UPDATE, e copiar a regra "residual Médio × apetite da DAR" duplicaria o
--   cálculo (proibido). Então aqui usamos a criticidade GRAVADA no risco.
--   As duas só diferem numa janela rara: a CGOV mudou a DAR (apetite de uma
--   categoria) e um risco NÃO aprovado daquela categoria, com residual Médio,
--   ainda não foi gravado de novo. (Os aprovados são recalculados na hora pelo
--   gatilho fn_dar_reavaliar_aprovados, migração 20261116004.) Nessa janela o
--   botão pode divergir da ação: a tela mostra a recusa traduzida da ação
--   ("RADAR: ..."), e qualquer edição do risco recalcula a criticidade.
--   O teste 080 prova que, na semente recém-carregada, gravado = recalculado.
--
-- POR QUE SECURITY DEFINER AQUI É SEGURO:
--   A função roda como o dono (postgres) porque precisa chamar funções
--   internas que ninguém logado executa (fn_fluxo_validador_efetivo,
--   fn_fluxo_quem_enviou...). Mas ela:
--     - só LÊ (é STABLE: o PostgreSQL recusa qualquer gravação nela);
--     - só devolve riscos que a pessoa já lê (pode_ler_objeto do objeto); os
--       demais ids — e os inexistentes — são ignorados, sem erro, para não
--       revelar se um risco existe;
--     - devolve apenas booleanos e frases fixas, nunca dados do risco;
--     - responde sempre sobre a pessoa LOGADA (auth.uid()), nunca sobre outra.
--   search_path vazio e nomes com `public.`; EXECUTE só para `authenticated`.
--
-- LIMITE: no máximo 1.000 ids por chamada (a store chama em lotes). Mais que
-- isso → erro 22023 'RADAR: no máximo 1000 riscos por consulta de ações.'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.acoes_no_fluxo(riscos uuid[])
RETURNS TABLE (
  risco_id       uuid,
  pode_enviar    boolean,
  pode_assumir   boolean,
  pode_validar   boolean,
  pode_homologar boolean,
  pode_devolver  boolean,
  devolucao_cgov boolean,
  pode_editar    boolean,
  pode_excluir   boolean,
  motivo         text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Quem está logado e se é da CGOV (perfil ATIVO — meu_perfil() ignora inativos).
  v_eu          uuid    := auth.uid();
  v_sou_cgov    boolean := coalesce((public.meu_perfil()).papel_governanca = 'cgov', false);

  r             record;   -- o risco da vez (com a unidade do objeto)
  v_escreve     boolean;  -- pode_escrever_objeto (a unidade dona do risco)
  v_cgov_prelim boolean;  -- exceção da CGOV no risco preliminar
  v_exige       boolean;  -- exige homologação (criticidade GRAVADA — ver acima)
  v_decisao     boolean;  -- estado de decisão (em validação ou em homologação)

  -- Atores "se EU enviasse/reabrisse agora" (envio e reabertura por edição).
  v_valida_eu   uuid;
  v_homologa_eu uuid;

  -- Atores do estado de decisão, a partir de QUEM ENVIOU (regra D1).
  v_enviou      uuid;
  v_validador   uuid;
  v_homologador uuid;
  v_ator        uuid;     -- quem decide no estado atual (validador ou homologador)

  -- Frases fixas do campo `motivo` (as mesmas que a tela mostra).
  c_sem_chefia      CONSTANT text := 'Não há chefia acima para validar este risco; procure a CGOV.';
  c_sem_homologador CONSTANT text := 'Não há quem homologue este risco; a CGOV pode devolvê-lo.';
  c_sem_decisor     CONSTANT text := 'Não há quem decida este risco agora; a CGOV pode devolvê-lo à unidade.';
  c_travada         CONSTANT text := 'Ficha em validação ou homologação: peça a devolução para editar.';
BEGIN
  IF cardinality(acoes_no_fluxo.riscos) > 1000 THEN
    RAISE EXCEPTION 'RADAR: no máximo 1000 riscos por consulta de ações.'
      USING ERRCODE = 'invalid_parameter_value';   -- 22023
  END IF;

  -- Só os riscos que a pessoa LÊ (ids repetidos saem uma vez; inexistentes somem).
  FOR r IN
    SELECT rk.id, rk.objeto_id, rk.status_fluxo, rk.is_critico, rk.status_critico,
           o.unidade_id
      FROM public.riscos AS rk
      JOIN public.objetos_contexto AS o ON o.id = rk.objeto_id
     WHERE rk.id = ANY (acoes_no_fluxo.riscos)
       AND public.pode_ler_objeto(rk.objeto_id)
     ORDER BY rk.id
  LOOP
    -- Valores iniciais da linha de saída.
    risco_id       := r.id;
    pode_enviar    := false;
    pode_assumir   := false;
    pode_validar   := false;
    pode_homologar := false;
    pode_devolver  := false;
    devolucao_cgov := false;
    pode_editar    := false;
    pode_excluir   := false;
    motivo         := NULL;

    v_escreve     := public.pode_escrever_objeto(r.objeto_id);
    -- Mesma condição das políticas de UPDATE/DELETE da CGOV (20261115003 §5.4 e 20261116003).
    v_cgov_prelim := public.cgov_grava_no_risco_preliminar(r.id);
    -- Mesma expressão das ações: is_critico OR status_critico = 'pendente_dar'.
    v_exige       := coalesce(r.is_critico OR r.status_critico = 'pendente_dar', false);
    v_decisao     := r.status_fluxo IN ('em_validacao_cg', 'em_homologacao_dir');

    -- ---------------------------------------------------------------------
    -- (a) ENVIAR — espelha enviar_para_validacao, na mesma ordem de checagens.
    -- ---------------------------------------------------------------------
    IF v_escreve AND r.status_fluxo IN ('rascunho', 'devolvido') THEN
      v_valida_eu   := public.fn_fluxo_validador_efetivo(r.unidade_id, v_eu);
      v_homologa_eu := public.fn_fluxo_homologador_efetivo(r.unidade_id, v_eu);
      IF public.chefia_imediata(r.unidade_id) IS NULL OR v_valida_eu IS NULL THEN
        motivo := c_sem_chefia;
      ELSIF v_exige AND v_homologa_eu IS NULL THEN
        motivo := c_sem_homologador;
      ELSE
        pode_enviar := true;
      END IF;
    END IF;

    -- ---------------------------------------------------------------------
    -- (b) ASSUMIR — espelha assumir_risco_preliminar.
    -- ---------------------------------------------------------------------
    pode_assumir := v_escreve AND r.status_fluxo = 'preliminar_cgov';

    -- ---------------------------------------------------------------------
    -- (c) VALIDAR / HOMOLOGAR / DEVOLVER — atores a partir de QUEM ENVIOU.
    --     Ex.: SAT1-GR5 enviado por gr@ → o validador "sobe" para a Presidência.
    -- ---------------------------------------------------------------------
    IF v_decisao THEN
      v_enviou      := public.fn_fluxo_quem_enviou(r.id);
      v_validador   := public.fn_fluxo_validador_efetivo(r.unidade_id, v_enviou);
      v_homologador := public.fn_fluxo_homologador_efetivo(r.unidade_id, v_enviou);
      v_ator := CASE r.status_fluxo WHEN 'em_validacao_cg' THEN v_validador ELSE v_homologador END;

      IF r.status_fluxo = 'em_validacao_cg' THEN
        -- validar_risco: titular do validador e, se exige, há homologador.
        pode_validar := v_validador IS NOT NULL
                        AND public.e_titular_de(v_validador)
                        AND NOT (v_exige AND v_homologador IS NULL);
      ELSE
        -- homologar_risco: titular do homologador efetivo.
        pode_homologar := v_homologador IS NOT NULL
                          AND public.e_titular_de(v_homologador);
      END IF;

      -- devolver_risco: sem ator efetivo, só a CGOV (P-B1-8); com ator, só o titular dele.
      devolucao_cgov := v_ator IS NULL AND v_sou_cgov;
      pode_devolver  := devolucao_cgov
                        OR (v_ator IS NOT NULL AND public.e_titular_de(v_ator));

      -- Motivo: primeiro o impasse (ninguém decide); depois validação que
      -- esbarraria na falta de homologador; por fim, a ficha travada para a unidade.
      IF v_ator IS NULL THEN
        motivo := c_sem_decisor;
      ELSIF r.status_fluxo = 'em_validacao_cg' AND v_exige AND v_homologador IS NULL THEN
        motivo := c_sem_homologador;
      ELSIF v_escreve OR v_cgov_prelim THEN
        motivo := c_travada;
      END IF;
    END IF;

    -- ---------------------------------------------------------------------
    -- (d) EDITAR — RLS de UPDATE + trava + checagem da reabertura.
    -- Em risco APROVADO a edição da ficha (P, I, controles...) reabre o fluxo
    -- tendo a pessoa logada como "quem enviou"; fn_fluxo_exigir_validador_na_reabertura
    -- recusaria se não houvesse validador efetivo ou, sendo crítico, homologador
    -- efetivo. Checamos os MESMOS predicados, sem disparar o erro.
    -- Ex.: presidente@ num aprovado crítico da Presidência → false.
    -- ---------------------------------------------------------------------
    IF (v_escreve OR v_cgov_prelim) AND NOT v_decisao THEN
      IF r.status_fluxo = 'aprovado' THEN
        v_valida_eu   := public.fn_fluxo_validador_efetivo(r.unidade_id, v_eu);
        v_homologa_eu := public.fn_fluxo_homologador_efetivo(r.unidade_id, v_eu);
        IF v_valida_eu IS NULL THEN
          motivo := c_sem_chefia;
        ELSIF v_exige AND v_homologa_eu IS NULL THEN
          motivo := c_sem_homologador;
        ELSE
          pode_editar := true;
        END IF;
      ELSE
        pode_editar := true;
      END IF;
    END IF;

    -- ---------------------------------------------------------------------
    -- (e) EXCLUIR — RLS de DELETE + regra D2 (só rascunho, devolvido, preliminar).
    -- ---------------------------------------------------------------------
    pode_excluir := (v_escreve OR v_cgov_prelim)
                    AND r.status_fluxo IN ('rascunho', 'devolvido', 'preliminar_cgov');

    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.acoes_no_fluxo(uuid[]) IS
  'RADAR (B3): para cada risco legível, quais ações do fluxo a pessoa logada pode fazer e, se um botão some, o motivo. Só leitura; usa a criticidade gravada (ver comentário da migração 20261117001).';

-- Só quem fez login executa. (O Supabase concede EXECUTE a anon por padrão em
-- funções novas do esquema public; por isso revogamos explicitamente.)
REVOKE EXECUTE ON FUNCTION public.acoes_no_fluxo(uuid[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.acoes_no_fluxo(uuid[]) TO authenticated;


-- ============================================================================
-- SEÇÃO 2 — salvar_ficha_risco(ficha jsonb) + sequência riscos_codigo_seq
-- ============================================================================
-- PARA QUE SERVE:
-- A tela "Ficha do risco" grava, de uma vez, o risco e os seus "filhos":
-- controles existentes, respostas de tratamento (5W2H) e KRIs. Em vez de a
-- tela mandar vários comandos (um UPDATE no risco, um INSERT por controle...),
-- ela chama UMA função, que faz tudo dentro de UM comando do cliente.
--
-- POR QUE UM COMANDO SÓ (a regra "reaberto neste comando"):
--   Editar um risco APROVADO reabre o fluxo (volta para em_validacao_cg) e,
--   daí em diante, a ficha fica TRAVADA (fn_fluxo_aplicar_trava, migração
--   20261115004). A trava só deixa passar as demais gravações que acontecem
--   no MESMO comando que reabriu o risco (fn_fluxo_reaberto_neste_comando, que
--   compara statement_timestamp()). Uma chamada de função é um único comando
--   do cliente, então todas as gravações aqui dentro compartilham o carimbo.
--   Exemplo (semente): coord.cofis@ muda P de RADAR-DEMO-COFIS (aprovado) e
--   troca os controles. Com a função: reabre UMA vez e grava tudo. Com dois
--   comandos separados: o 1º reabre e o 2º é recusado com erro 55000 ("ficha
--   travada"). O teste 081, item (d), prova esse motivo.
--   E mais: qualquer recusa no meio (ex.: KRI com periodicidade 'Diária')
--   desfaz TUDO, porque o comando inteiro é uma transação.
--
-- SECURITY INVOKER (roda como QUEM ESTÁ LOGADO, não como o dono):
--   A função não "fura" nenhuma regra. Valem normalmente:
--     - a RLS de riscos e dos filhos (quem não grava no objeto → erro 42501);
--     - o gatilho trg_riscos_status_fluxo_so_pelo_fluxo (status só pelo fluxo);
--     - o gatilho de cálculo trigger_calcular_risco_radar (Quadros 6, 7 e 8);
--     - as travas e a reabertura (fn_trava_reabertura_risco / _ficha);
--     - a trilha de auditoria (fn_registrar_auditoria).
--
-- FORMATO DA FICHA (as chaves têm o nome das colunas do banco):
--   {
--     "id": "...",                 ← AUSENTE = ficha nova; PRESENTE = alterar
--     "objeto_id": "...",
--     "preliminar_cgov": true,     ← só na criação; a RLS aceita só da CGOV
--     "responsavel_risco_nome", "causas", "evento_risco", "consequencias",
--     "objetivo_afetado", "categoria_id", "subcategoria_integridade",
--     "teste_integridade_aplicavel", "justificativa_nao_integridade",
--     "probabilidade", "justificativa_probabilidade", "impacto",
--     "justificativa_impacto", "possui_evidencia_controle",
--     "nivel_eficacia_controle", "estrategia_principal",
--     "controles": [ { "id"?, "descricao_controle", "evidencia_funcionamento",
--                      "possui_evidencia_comprovada", "desenho_adequado",
--                      "operacao_comprovada" } ],
--     "respostas": [ { "id"?, "estrategia", "acao_o_que", "justificativa_por_que",
--                      "local_onde", "responsavel_quem", "prazo_quando",
--                      "procedimento_como", "custo_quanto", "status_execucao" } ],
--     "kris":      [ { "id"?, "nome_indicador", "formula_calculo", "fonte_dados",
--                      "periodicidade", "meta_alvo", "limite_alerta",
--                      "responsavel_medicao" } ]
--   }
--   - Na ALTERAÇÃO, chave omitida = mantém o valor atual (vale para o risco e
--     para cada filho com id).
--   - Na CRIAÇÃO, chave omitida = valor padrão da tabela (ex.: eficácia
--     'Inexistente', custo 'Sem custo adicional').
--   - Grupo de filhos AUSENTE (ou null) = não mexe naquele grupo.
--     Lista PRESENTE = sincroniza: item sem id → insere; item com id deste
--     risco → atualiza; filho deste risco que NÃO veio na lista → apaga.
--     Lista vazia [] apaga todos daquele grupo.
--   - Item com id de filho de OUTRO risco (ou inexistente) → recusa 22023.
--     Nunca "mudamos" um filho de risco.
--   - Medições de KRI NÃO passam por aqui (são do Monitoramento).
--
-- O QUE A FUNÇÃO NUNCA GRAVA A PARTIR DO JSON:
--   status_fluxo (exceto o estado inicial na criação: rascunho, ou
--   preliminar_cgov quando pedido), codigo_radar e as colunas calculadas
--   (descricao_padrao, nivel_inerente, classificacao_inerente, nivel_residual,
--   classificacao_residual, status_critico, is_critico, fator_controle).
--   Se a tela mandar "nivel_residual": 1, o valor é ignorado e o gatilho
--   calcula o de verdade.
--
-- E O fator_controle?
--   O gatilho de cálculo NÃO deriva o fator a partir da eficácia: ele só
--   aplica a trava de evidência (sem evidência e fator < 0,90 → Fraco, 0,90)
--   e multiplica. Quem informa o fator é quem grava — a semente faz o mesmo
--   (ver seed-demonstracao.sql, seção 5). Por isso aqui o fator é LIDO do
--   Quadro 6 a partir da eficácia escolhida (nunca do JSON):
--     Inexistente 1,00 | Fraco 0,90 | Mediano 0,75 | Satisfatório 0,60 | Forte 0,50
--   Exemplo: P=2, I=3 → Quadro 7 = 9. Forte com evidência → 9 × 0,5 = 4,5
--   (Baixo). Forte SEM evidência → o gatilho trava em Fraco → 9 × 0,9 = 8,1
--   (Médio). O cálculo em si continua todo no gatilho.
--
-- CÓDIGO DO RISCO (só na criação):
--   'RADAR-' || ano atual (horário de Brasília) || '-' || número da sequência com 3 dígitos.
--   Ex.: RADAR-2026-002. A numeração é GLOBAL e NÃO recomeça a cada ano
--   (simples e sem colisão): em 2027 o próximo poderia ser RADAR-2027-153.
--   Acima de 999 o lpad não corta: RADAR-2027-1000.
--   A semente (seed-demonstracao.sql) ajusta a sequência para depois do maior
--   número já usado no formato RADAR-<4 dígitos>-<número>.
--   Atenção: sequência não volta em rollback (um número pode "pular").
--
-- DEVOLVE: uma linha (id, codigo_radar) do risco gravado.
-- ============================================================================

-- Sequência do código. Só "usar" (nextval) é permitido a quem fez login;
-- ninguém de fora reinicia a numeração (setval exige UPDATE, que revogamos).
CREATE SEQUENCE IF NOT EXISTS public.riscos_codigo_seq;

COMMENT ON SEQUENCE public.riscos_codigo_seq IS
  'RADAR (B3): número global do código RADAR-<ano>-<NNN> (não recomeça por ano). Ajustada pela semente.';

REVOKE ALL   ON SEQUENCE public.riscos_codigo_seq FROM public, anon, authenticated;
GRANT  USAGE ON SEQUENCE public.riscos_codigo_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.salvar_ficha_risco(ficha jsonb)
RETURNS TABLE (id uuid, codigo_radar text)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_id      uuid;                         -- id do risco (novo ou existente)
  v_codigo  text;                         -- codigo_radar do risco
  v_risco   public.riscos;                -- o risco "montado" a partir do JSON
  v_ctrl    public.controles_existentes;  -- um controle "montado" (alteração)
  v_resp    public.respostas_tratamento;  -- uma resposta "montada" (alteração)
  v_kri     public.indicadores_kri;       -- um KRI "montado" (alteração)
  v_item    jsonb;                        -- o item da vez de uma lista de filhos
  v_grupo   text;                         -- nome da lista (controles, respostas, kris)
  v_novo    boolean;                      -- true = ficha nova (sem id)
  v_fator   numeric(3,2);                 -- fator do Quadro 6 (sai da eficácia)
  v_linhas  integer;                      -- linhas alteradas pelo UPDATE do risco

  -- Valores padrão das tabelas, usados na CRIAÇÃO quando a chave não veio.
  -- (São os mesmos DEFAULT das colunas em 20261109001_schema_radar.sql.)
  c_padrao_risco     CONSTANT jsonb := '{"teste_integridade_aplicavel": false,
                                         "possui_evidencia_controle": false,
                                         "nivel_eficacia_controle": "Inexistente",
                                         "estrategia_principal": "Mitigar"}';
  c_padrao_controle  CONSTANT jsonb := '{"possui_evidencia_comprovada": false,
                                         "desenho_adequado": false,
                                         "operacao_comprovada": false}';
  c_padrao_resposta  CONSTANT jsonb := '{"custo_quanto": "Sem custo adicional",
                                         "status_execucao": "nao_iniciada"}';
BEGIN
  -- -------------------------------------------------------------------------
  -- 0. Conferência do formato
  -- -------------------------------------------------------------------------
  IF ficha IS NULL OR jsonb_typeof(ficha) <> 'object' THEN
    RAISE EXCEPTION 'RADAR: a ficha do risco deve ser um objeto JSON.'
      USING ERRCODE = 'invalid_parameter_value';   -- 22023
  END IF;
  FOREACH v_grupo IN ARRAY ARRAY['controles', 'respostas', 'kris'] LOOP
    IF jsonb_typeof(ficha -> v_grupo) NOT IN ('array', 'null') THEN
      RAISE EXCEPTION 'RADAR: "%" da ficha deve ser uma lista.', v_grupo
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 1. O RISCO — primeiro "montamos" a linha (v_risco); depois gravamos.
  -- -------------------------------------------------------------------------
  v_novo := nullif(ficha ->> 'id', '') IS NULL;

  IF v_novo THEN
    -- 1a. CRIAÇÃO. jsonb_populate_record "monta" uma linha de riscos a partir
    --     do JSON (padrões || ficha: o que veio na ficha vence o padrão).
    v_risco := jsonb_populate_record(NULL::public.riscos, c_padrao_risco || ficha);
  ELSE
    -- 1b. ALTERAÇÃO. Lemos o risco atual (só se a pessoa o LÊ — RLS) e
    --     "montamos" por cima dele: chave omitida mantém o valor atual.
    v_id := (ficha ->> 'id')::uuid;
    SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'RADAR: risco não encontrado ou fora do seu alcance.'
        USING ERRCODE = 'insufficient_privilege';   -- 42501
    END IF;
    -- Guardamos o código GRAVADO antes de misturar o JSON: um "codigo_radar"
    -- enviado na ficha não pode aparecer nas mensagens de erro.
    v_codigo := v_risco.codigo_radar;
    v_risco  := jsonb_populate_record(v_risco, ficha);
  END IF;

  -- Fator do Quadro 6 a partir da eficácia escolhida (ver comentário acima),
  -- calculado UMA vez e usado tanto na criação quanto na alteração.
  -- Ex.: 'Forte' → 0,50. (A trava de evidência continua no gatilho.)
  v_fator := CASE v_risco.nivel_eficacia_controle
               WHEN 'Inexistente'  THEN 1.00
               WHEN 'Fraco'        THEN 0.90
               WHEN 'Mediano'      THEN 0.75
               WHEN 'Satisfatório' THEN 0.60
               WHEN 'Forte'        THEN 0.50
             END;

  -- search_path: o gatilho de cálculo (20261109001) usa nomes SEM `public.`
  -- (calcular_nivel_inerente_q7, categorias_risco...). Com o caminho vazio
  -- desta função ele não os acharia. Então, SÓ durante a gravação do risco,
  -- o caminho vira "public, pg_temp" (pg_temp por último, como em
  -- fn_fluxo_mudar_estado, 20261115004) e depois volta a ficar vazio.
  IF v_novo THEN
    -- Ano do código pelo horário de Brasília: o servidor roda em UTC, e entre
    -- 21h e 24h de 31/12 (Brasília) o ano em UTC já seria o seguinte.
    v_codigo := 'RADAR-' || extract(year FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int || '-'
                || lpad(nextval('public.riscos_codigo_seq')::text, 3, '0');

    -- Só as colunas de ENTRADA. As calculadas ficam de fora (o gatilho de
    -- cálculo as preenche antes de o banco conferir os NOT NULL).
    -- status_fluxo: 'rascunho', ou 'preliminar_cgov' se pedido — a política de
    -- INSERT só aceita este último vindo da CGOV (senão: erro 42501).
    PERFORM set_config('search_path', 'public, pg_temp', true);
    INSERT INTO public.riscos AS r
      (codigo_radar, objeto_id, responsavel_risco_nome,
       causas, evento_risco, consequencias, objetivo_afetado,
       categoria_id, subcategoria_integridade, teste_integridade_aplicavel,
       justificativa_nao_integridade,
       probabilidade, justificativa_probabilidade, impacto, justificativa_impacto,
       possui_evidencia_controle, nivel_eficacia_controle, fator_controle,
       estrategia_principal, origem_preliminar_cgov, status_fluxo)
    VALUES
      (v_codigo, v_risco.objeto_id, v_risco.responsavel_risco_nome,
       v_risco.causas, v_risco.evento_risco, v_risco.consequencias, v_risco.objetivo_afetado,
       v_risco.categoria_id, v_risco.subcategoria_integridade, v_risco.teste_integridade_aplicavel,
       v_risco.justificativa_nao_integridade,
       v_risco.probabilidade, v_risco.justificativa_probabilidade, v_risco.impacto,
       v_risco.justificativa_impacto,
       v_risco.possui_evidencia_controle, v_risco.nivel_eficacia_controle, v_fator,
       v_risco.estrategia_principal,
       coalesce((ficha ->> 'preliminar_cgov')::boolean, false),
       CASE WHEN coalesce((ficha ->> 'preliminar_cgov')::boolean, false)
            THEN 'preliminar_cgov' ELSE 'rascunho' END)
    RETURNING r.id INTO v_id;
    PERFORM set_config('search_path', '', true);

  ELSE
    -- Nunca status_fluxo, codigo_radar ou calculadas. Se este UPDATE mudar
    -- P, I, eficácia... de um risco aprovado, o gatilho de trava o REABRE
    -- (em_validacao_cg) e marca "reaberto neste comando" — os filhos abaixo
    -- passam pela trava por estarem no mesmo comando.
    PERFORM set_config('search_path', 'public, pg_temp', true);
    UPDATE public.riscos AS r SET
      objeto_id                     = v_risco.objeto_id,
      responsavel_risco_nome        = v_risco.responsavel_risco_nome,
      causas                        = v_risco.causas,
      evento_risco                  = v_risco.evento_risco,
      consequencias                 = v_risco.consequencias,
      objetivo_afetado              = v_risco.objetivo_afetado,
      categoria_id                  = v_risco.categoria_id,
      subcategoria_integridade      = v_risco.subcategoria_integridade,
      teste_integridade_aplicavel   = v_risco.teste_integridade_aplicavel,
      justificativa_nao_integridade = v_risco.justificativa_nao_integridade,
      probabilidade                 = v_risco.probabilidade,
      justificativa_probabilidade   = v_risco.justificativa_probabilidade,
      impacto                       = v_risco.impacto,
      justificativa_impacto         = v_risco.justificativa_impacto,
      possui_evidencia_controle     = v_risco.possui_evidencia_controle,
      nivel_eficacia_controle       = v_risco.nivel_eficacia_controle,
      fator_controle                = v_fator,
      estrategia_principal          = v_risco.estrategia_principal
    WHERE r.id = v_id;
    -- Contamos as linhas ANTES do PERFORM abaixo: todo PERFORM reescreve a
    -- variável FOUND, então "IF NOT FOUND" depois dele nunca seria verdadeiro.
    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    PERFORM set_config('search_path', '', true);

    -- A RLS não dá erro no UPDATE barrado: ela só "não acha" a linha.
    -- Aqui transformamos isso num erro claro (42501), com o código GRAVADO.
    IF v_linhas = 0 THEN
      RAISE EXCEPTION 'RADAR: você não pode alterar a ficha do risco %.', v_codigo
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Código final (na alteração, o que já estava gravado).
  SELECT r.codigo_radar INTO v_codigo FROM public.riscos AS r WHERE r.id = v_id;

  -- -------------------------------------------------------------------------
  -- 2. Os FILHOS — antes de tudo, nenhum id pode ser de filho de outro risco.
  --    Ex.: mandar na ficha de RADAR-2026-003 o id de um controle de
  --    RADAR-2026-002 → recusa (e nada é gravado).
  -- -------------------------------------------------------------------------
  IF EXISTS (
       SELECT 1
         FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ficha -> 'controles') = 'array'
                                        THEN ficha -> 'controles' ELSE '[]' END) AS e(item)
        WHERE nullif(e.item ->> 'id', '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.controles_existentes AS c
                           WHERE c.id = (e.item ->> 'id')::uuid AND c.risco_id = v_id))
  OR EXISTS (
       SELECT 1
         FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ficha -> 'respostas') = 'array'
                                        THEN ficha -> 'respostas' ELSE '[]' END) AS e(item)
        WHERE nullif(e.item ->> 'id', '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.respostas_tratamento AS t
                           WHERE t.id = (e.item ->> 'id')::uuid AND t.risco_id = v_id))
  OR EXISTS (
       SELECT 1
         FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ficha -> 'kris') = 'array'
                                        THEN ficha -> 'kris' ELSE '[]' END) AS e(item)
        WHERE nullif(e.item ->> 'id', '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.indicadores_kri AS k
                           WHERE k.id = (e.item ->> 'id')::uuid AND k.risco_id = v_id))
  THEN
    RAISE EXCEPTION 'RADAR: a ficha traz um controle, resposta ou KRI que não pertence ao risco %.', v_codigo
      USING ERRCODE = 'invalid_parameter_value';   -- 22023
  END IF;

  -- -------------------------------------------------------------------------
  -- 2a. CONTROLES EXISTENTES (só se a lista veio)
  --     Ordem: apaga os que saíram → atualiza os que têm id → insere os novos.
  -- -------------------------------------------------------------------------
  IF jsonb_typeof(ficha -> 'controles') = 'array' THEN
    DELETE FROM public.controles_existentes AS c
     WHERE c.risco_id = v_id
       AND c.id NOT IN (SELECT (e.item ->> 'id')::uuid
                          FROM jsonb_array_elements(ficha -> 'controles') AS e(item)
                         WHERE nullif(e.item ->> 'id', '') IS NOT NULL);

    FOR v_item IN SELECT e.item FROM jsonb_array_elements(ficha -> 'controles') AS e(item)
                   WHERE nullif(e.item ->> 'id', '') IS NOT NULL LOOP
      SELECT c.* INTO v_ctrl FROM public.controles_existentes AS c
       WHERE c.id = (v_item ->> 'id')::uuid;
      v_ctrl := jsonb_populate_record(v_ctrl, v_item);   -- chave omitida = mantém
      UPDATE public.controles_existentes AS c SET
        descricao_controle          = v_ctrl.descricao_controle,
        evidencia_funcionamento     = v_ctrl.evidencia_funcionamento,
        possui_evidencia_comprovada = v_ctrl.possui_evidencia_comprovada,
        desenho_adequado            = v_ctrl.desenho_adequado,
        operacao_comprovada         = v_ctrl.operacao_comprovada
      WHERE c.id = (v_item ->> 'id')::uuid AND c.risco_id = v_id;
    END LOOP;

    INSERT INTO public.controles_existentes
      (risco_id, descricao_controle, evidencia_funcionamento,
       possui_evidencia_comprovada, desenho_adequado, operacao_comprovada)
    SELECT v_id, n.descricao_controle, n.evidencia_funcionamento,
           n.possui_evidencia_comprovada, n.desenho_adequado, n.operacao_comprovada
      FROM jsonb_array_elements(ficha -> 'controles') AS e(item)
     CROSS JOIN LATERAL jsonb_populate_record(NULL::public.controles_existentes,
                                              c_padrao_controle || e.item) AS n
     WHERE nullif(e.item ->> 'id', '') IS NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2b. RESPOSTAS DE TRATAMENTO — 5W2H (só se a lista veio)
  -- -------------------------------------------------------------------------
  IF jsonb_typeof(ficha -> 'respostas') = 'array' THEN
    DELETE FROM public.respostas_tratamento AS t
     WHERE t.risco_id = v_id
       AND t.id NOT IN (SELECT (e.item ->> 'id')::uuid
                          FROM jsonb_array_elements(ficha -> 'respostas') AS e(item)
                         WHERE nullif(e.item ->> 'id', '') IS NOT NULL);

    FOR v_item IN SELECT e.item FROM jsonb_array_elements(ficha -> 'respostas') AS e(item)
                   WHERE nullif(e.item ->> 'id', '') IS NOT NULL LOOP
      SELECT t.* INTO v_resp FROM public.respostas_tratamento AS t
       WHERE t.id = (v_item ->> 'id')::uuid;
      v_resp := jsonb_populate_record(v_resp, v_item);
      UPDATE public.respostas_tratamento AS t SET
        estrategia            = v_resp.estrategia,
        acao_o_que            = v_resp.acao_o_que,
        justificativa_por_que = v_resp.justificativa_por_que,
        local_onde            = v_resp.local_onde,
        responsavel_quem      = v_resp.responsavel_quem,
        prazo_quando          = v_resp.prazo_quando,
        procedimento_como     = v_resp.procedimento_como,
        custo_quanto          = v_resp.custo_quanto,
        status_execucao       = v_resp.status_execucao
      WHERE t.id = (v_item ->> 'id')::uuid AND t.risco_id = v_id;
    END LOOP;

    INSERT INTO public.respostas_tratamento
      (risco_id, estrategia, acao_o_que, justificativa_por_que, local_onde,
       responsavel_quem, prazo_quando, procedimento_como, custo_quanto, status_execucao)
    SELECT v_id, n.estrategia, n.acao_o_que, n.justificativa_por_que, n.local_onde,
           n.responsavel_quem, n.prazo_quando, n.procedimento_como, n.custo_quanto, n.status_execucao
      FROM jsonb_array_elements(ficha -> 'respostas') AS e(item)
     CROSS JOIN LATERAL jsonb_populate_record(NULL::public.respostas_tratamento,
                                              c_padrao_resposta || e.item) AS n
     WHERE nullif(e.item ->> 'id', '') IS NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2c. KRIs — só a DEFINIÇÃO do indicador (medições ficam no Monitoramento)
  -- -------------------------------------------------------------------------
  IF jsonb_typeof(ficha -> 'kris') = 'array' THEN
    DELETE FROM public.indicadores_kri AS k
     WHERE k.risco_id = v_id
       AND k.id NOT IN (SELECT (e.item ->> 'id')::uuid
                          FROM jsonb_array_elements(ficha -> 'kris') AS e(item)
                         WHERE nullif(e.item ->> 'id', '') IS NOT NULL);

    FOR v_item IN SELECT e.item FROM jsonb_array_elements(ficha -> 'kris') AS e(item)
                   WHERE nullif(e.item ->> 'id', '') IS NOT NULL LOOP
      SELECT k.* INTO v_kri FROM public.indicadores_kri AS k
       WHERE k.id = (v_item ->> 'id')::uuid;
      v_kri := jsonb_populate_record(v_kri, v_item);
      UPDATE public.indicadores_kri AS k SET
        nome_indicador      = v_kri.nome_indicador,
        formula_calculo     = v_kri.formula_calculo,
        fonte_dados         = v_kri.fonte_dados,
        periodicidade       = v_kri.periodicidade,
        meta_alvo           = v_kri.meta_alvo,
        limite_alerta       = v_kri.limite_alerta,
        responsavel_medicao = v_kri.responsavel_medicao
      WHERE k.id = (v_item ->> 'id')::uuid AND k.risco_id = v_id;
    END LOOP;

    INSERT INTO public.indicadores_kri
      (risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
       meta_alvo, limite_alerta, responsavel_medicao)
    SELECT v_id, n.nome_indicador, n.formula_calculo, n.fonte_dados, n.periodicidade,
           n.meta_alvo, n.limite_alerta, n.responsavel_medicao
      FROM jsonb_array_elements(ficha -> 'kris') AS e(item)
     CROSS JOIN LATERAL jsonb_populate_record(NULL::public.indicadores_kri, e.item) AS n
     WHERE nullif(e.item ->> 'id', '') IS NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Devolve o id e o código do risco gravado.
  -- -------------------------------------------------------------------------
  id           := v_id;
  codigo_radar := v_codigo;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.salvar_ficha_risco(jsonb) IS
  'RADAR (B3): grava a ficha do risco (risco + controles + respostas + KRIs) num único comando, com as permissões de quem está logado; gera o código RADAR-<ano>-<NNN> na criação. Ver comentário da migração 20261117001, seção 2.';

-- Só quem fez login executa (o Supabase concede EXECUTE a anon por padrão).
REVOKE EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) TO authenticated;
