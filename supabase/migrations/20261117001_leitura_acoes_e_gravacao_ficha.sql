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
