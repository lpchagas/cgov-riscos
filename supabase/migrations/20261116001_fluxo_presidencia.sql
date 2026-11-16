-- ============================================================================
-- ETAPA B1.1 / TAREFA 1 — Fluxo da Presidência (decisão P-B1-1, CGOV, 2026-11-15)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela árvore da B1, a Presidência não tem chefia acima (ninguém validava os
-- riscos dela) e a Assessoria da Presidência (icmbio_id 10.0001) seria
-- validada pelo próprio Presidente. A CGOV decidiu uma exceção consciente:
--
--   Riscos da PRESIDÊNCIA (tipo `presidencia`) e da ASSESSORIA DA PRESIDÊNCIA:
--     2º degrau (VALIDA)   → o titular do GABIN (icmbio_id 10.0002);
--     3º degrau (HOMOLOGA) → o titular da Presidência (icmbio_id 10.0000).
--
--   (O GABIN é subordinado ao Presidente na árvore; por isso é uma exceção.)
--
-- Só duas funções mudam, recriadas com CREATE OR REPLACE (mesma assinatura,
-- SECURITY DEFINER, search_path vazio; os GRANT/REVOKE da migração
-- 20261115002 são mantidos pelo próprio CREATE OR REPLACE):
--
--   chefia_imediata(u): Presidência ou Assessoria → GABIN.
--   homologador_de(u):  Presidência ou Assessoria → a Presidência.
--
-- O resto do fluxo (migração 20261115004) NÃO é tocado. Ele já chama essas
-- duas funções, e a segregação D1 ("sobe um nível") passa a funcionar sozinha:
--
--   Exemplo 1 — gestor da Assessoria envia um risco CRÍTICO:
--     validador   = GABIN (titular do GABIN valida) → em_homologacao_dir
--     homologador = Presidência (Presidente homologa) → aprovado.
--   Exemplo 2 — o PRÓPRIO Presidente envia um risco crítico da Presidência:
--     valida o titular do GABIN, mas o homologador "sobe um nível": a
--     Presidência é do Presidente (quem enviou) e acima dela não há ninguém.
--     fn_fluxo_homologador_efetivo devolve nulo e validar_risco recusa com
--     "RADAR: o risco ... exige homologação, mas a unidade não tem ..."
--     (55000). O Presidente nunca homologa o próprio risco.
--   Exemplo 3 — o GABIN em si (unidade filha da Presidência): continua como
--     antes (chefia = Presidência), pois a exceção vale só para a Presidência
--     e a Assessoria.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8) nem em migrações antigas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. chefia_imediata(unidade): quem VALIDA (2º degrau)
-- ----------------------------------------------------------------------------
-- Regra nova (1º WHEN): Presidência (tipo `presidencia`) ou Assessoria da
-- Presidência (icmbio_id '10.0001') → a unidade GABIN (icmbio_id '10.0002').
-- Se a unidade GABIN não existir (árvore sem ela), o subselect devolve nulo e
-- o envio é recusado com a mensagem de "sem chefia imediata" (já existente).
-- Demais unidades: regra anterior (CT quando a mãe é GR e há vínculo; senão a mãe).
CREATE OR REPLACE FUNCTION public.chefia_imediata(unidade uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
           WHEN u.tipo = 'presidencia' OR u.icmbio_id = '10.0001'
             THEN (SELECT g.id FROM public.unidades AS g WHERE g.icmbio_id = '10.0002')
           WHEN u.coordenacao_territorial_id IS NOT NULL AND mae.tipo = 'gerencia-regional'
             THEN u.coordenacao_territorial_id
           ELSE u.unidade_pai_id
         END
    FROM public.unidades AS u
    LEFT JOIN public.unidades AS mae ON mae.id = u.unidade_pai_id
   WHERE u.id = unidade;
$$;

-- ----------------------------------------------------------------------------
-- 2. homologador_de(unidade): quem HOMOLOGA (3º degrau)
-- ----------------------------------------------------------------------------
-- Regra nova: para a Presidência e a Assessoria, o homologador é a Presidência
-- (a própria, no caso da Presidência — antes seria nulo, pois não tem
-- ancestral). Para as demais unidades, a busca pelos ancestrais é a mesma de
-- antes: 1º Gerência Regional, 2º Diretoria, 3º Presidência.
CREATE OR REPLACE FUNCTION public.homologador_de(unidade uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE ancestrais(id, tipo, nivel, caminho) AS (
    -- nível 1: a mãe da unidade
    SELECT mae.id, mae.tipo, 1, ARRAY[u.id, mae.id]
      FROM public.unidades AS u
      JOIN public.unidades AS mae ON mae.id = u.unidade_pai_id
     WHERE u.id = unidade
    UNION ALL
    -- nível seguinte: a mãe da mãe, e assim por diante (sem repetir unidade)
    SELECT avo.id, avo.tipo, a.nivel + 1, a.caminho || avo.id
      FROM ancestrais AS a
      JOIN public.unidades AS atual ON atual.id = a.id
      JOIN public.unidades AS avo   ON avo.id = atual.unidade_pai_id
     WHERE NOT (avo.id = ANY (a.caminho))
  )
  SELECT coalesce(
    -- Exceção P-B1-1: Presidência e Assessoria → a unidade da Presidência.
    (SELECT p.id
       FROM public.unidades AS u
       JOIN public.unidades AS p ON p.tipo = 'presidencia'
      WHERE u.id = unidade
        AND (u.tipo = 'presidencia' OR u.icmbio_id = '10.0001')
      ORDER BY p.icmbio_id
      LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'gerencia-regional' ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'diretoria'         ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'presidencia'       ORDER BY a.nivel LIMIT 1));
$$;

-- ----------------------------------------------------------------------------
-- 3. Homologador efetivo: sair assim que a subida não avança (ponto fixo)
-- ----------------------------------------------------------------------------
-- Agora homologador_de(Presidência) = Presidência (ponto fixo). Se quem enviou
-- é o titular da Presidência, o "sobe um nível" ficaria girando 51 vezes até
-- desistir. Saímos já quando homologador_de(v) = v: não há nível acima -> nulo.
CREATE OR REPLACE FUNCTION public.fn_fluxo_homologador_efetivo(p_unidade uuid, p_quem_enviou uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unidade uuid := public.homologador_de(p_unidade);
  v_acima   uuid;
  v_subidas int  := 0;
BEGIN
  WHILE v_unidade IS NOT NULL AND public.fn_fluxo_titular_da_unidade(p_quem_enviou, v_unidade) LOOP
    v_acima := public.homologador_de(v_unidade);
    IF v_acima IS NOT DISTINCT FROM v_unidade THEN
      RETURN NULL;              -- ponto fixo (Presidência): ninguém acima
    END IF;
    v_unidade := v_acima;
    v_subidas := v_subidas + 1;
    IF v_subidas > 50 THEN
      RETURN NULL;
    END IF;
  END LOOP;
  RETURN v_unidade;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. enviar_para_validacao: recusa já no ENVIO o risco que não teria quem homologue
-- ----------------------------------------------------------------------------
-- Exemplo: o Presidente envia um risco CRÍTICO da Presidência. Valida o GABIN,
-- mas ninguém acima do Presidente poderia homologar: o risco ficaria preso em
-- validação. Então o envio é recusado (55000) com mensagem clara. A
-- criticidade é recalculada na hora (mesma técnica de validar_risco: um UPDATE
-- "estado -> mesmo estado" que reaciona o cálculo existente, sem alterá-lo).
CREATE OR REPLACE FUNCTION public.enviar_para_validacao(risco uuid)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = enviar_para_validacao.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', enviar_para_validacao.risco USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.pode_escrever_objeto(v_risco.objeto_id) THEN
    RAISE EXCEPTION 'RADAR: só a unidade dona do risco % pode enviá-lo para validação.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo NOT IN ('rascunho', 'devolvido') THEN
    RAISE EXCEPTION 'RADAR: estado não permite enviar o risco % para validação (está em "%"; só se envia rascunho ou devolvido).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  IF public.chefia_imediata(v_unidade) IS NULL THEN
    RAISE EXCEPTION 'RADAR: a unidade do risco % não tem chefia imediata acima dela na árvore; não há quem valide. Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  -- D1: quem envia não valida o próprio risco.
  IF public.fn_fluxo_validador_efetivo(v_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: não há quem valide o risco %: quem envia é o titular da chefia imediata e não existe nível acima na árvore (quem envia não valida o próprio risco). Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- P-B1-1 (correção da revisão): risco que exige homologação precisa de
  -- homologador efetivo. Criticidade fresca (a DAR pode ter mudado).
  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, v_risco.status_fluxo);
  IF (v_risco.is_critico OR v_risco.status_critico = 'pendente_dar')
     AND public.fn_fluxo_homologador_efetivo(v_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: o risco % exige homologação e quem envia é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor da unidade que envie a ficha.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'em_validacao_cg');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'submissao_1a_linha', 'submetido',
    'Ficha enviada pela 1ª linha para validação da chefia imediata.');
  RETURN v_risco;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. validar_risco: rede de segurança com mensagem melhor
-- ----------------------------------------------------------------------------
-- Mantida a checagem "exige homologação sem homologador" (a DAR pode ter
-- tornado o risco crítico enquanto ele esperava validação). A mensagem agora
-- distingue: (a) a unidade nem tem homologador na árvore; (b) quem enviou é o
-- titular do homologador (ex.: o Presidente).
CREATE OR REPLACE FUNCTION public.validar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco      public.riscos;
  v_unidade    uuid;
  v_enviou     uuid;
  v_chefia     uuid;
  v_homologa   uuid;
  v_exige      boolean;
  v_parecer    text := nullif(btrim(coalesce(validar_risco.parecer, '')), '');
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = validar_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', validar_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  v_enviou   := public.fn_fluxo_quem_enviou(v_risco.id);
  v_chefia   := public.fn_fluxo_validador_efetivo(v_unidade, v_enviou);
  v_homologa := public.fn_fluxo_homologador_efetivo(v_unidade, v_enviou);

  IF v_chefia IS NULL THEN
    RAISE EXCEPTION 'RADAR: não há quem valide o risco %: não existe chefia acima de quem o enviou (quem envia não valida o próprio risco). Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NOT public.e_titular_de(v_chefia) THEN
    RAISE EXCEPTION 'RADAR: só o titular da chefia que valida o risco % pode validá-lo (quem enviou o risco não o valida).', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo <> 'em_validacao_cg' THEN
    RAISE EXCEPTION 'RADAR: estado não permite validar o risco % (está em "%"; só se valida risco em validação). Ele pode já ter sido validado por outro titular.',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- Criticidade atual (a DAR pode ter mudado durante a espera): ver a
  -- explicação na migração 20261115004.
  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, v_risco.status_fluxo);

  v_exige := v_risco.is_critico OR v_risco.status_critico = 'pendente_dar';

  IF NOT v_exige THEN
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado',
      concat_ws(' ', 'Validado pela chefia imediata. Risco dentro do apetite da DAR: não exige homologação.', v_parecer));

  ELSIF v_homologa IS NULL THEN
    IF public.homologador_de(v_unidade) IS NULL THEN
      RAISE EXCEPTION 'RADAR: o risco % exige homologação, mas a unidade não tem Gerência Regional, Diretoria ou Presidência acima dela. Procure a CGOV.',
        v_risco.codigo_radar
        USING ERRCODE = 'object_not_in_prerequisite_state';
    ELSE
      RAISE EXCEPTION 'RADAR: o risco % exige homologação, mas quem o enviou é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Devolva a ficha para que outro servidor da unidade a envie.',
        v_risco.codigo_radar
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

  ELSIF v_homologa = v_chefia THEN
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado_e_homologado',
      concat_ws(' ', 'Validado e homologado pela mesma chefia.', v_parecer));

  ELSE
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'em_homologacao_dir');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado',
      concat_ws(' ', 'Validado pela chefia imediata e encaminhado para homologação.', v_parecer));
  END IF;

  RETURN v_risco;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Reabertura: também exige homologador se o risco aprovado é crítico
-- ----------------------------------------------------------------------------
-- Se o Presidente edita um risco aprovado e crítico da Presidência, a
-- reabertura o poria em validação e ele ficaria preso (sem homologador).
-- A assinatura é mantida (os gatilhos da migração 004 a chamam); a criticidade
-- vem do risco gravado, localizado pelo código RADAR.
CREATE OR REPLACE FUNCTION public.fn_fluxo_exigir_validador_na_reabertura(p_codigo text, p_unidade uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.fn_fluxo_validador_efetivo(p_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: a alteração reabriria o risco % para validação, mas não há chefia acima de quem alterou para validá-lo (quem altera não valida a própria mudança). Procure a CGOV.',
      p_codigo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF EXISTS (SELECT 1 FROM public.riscos AS r
              WHERE r.codigo_radar = p_codigo
                AND (r.is_critico OR r.status_critico = 'pendente_dar'))
     AND public.fn_fluxo_homologador_efetivo(p_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: a alteração reabriria o risco % (que exige homologação) para validação, mas quem altera é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor da unidade que faça a alteração.',
      p_codigo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
END;
$$;

-- Garantia: as permissões continuam as da B1 (CREATE OR REPLACE já as preserva;
-- repetimos para deixar a intenção explícita).
REVOKE EXECUTE ON FUNCTION public.chefia_imediata(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.homologador_de(uuid)  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.chefia_imediata(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.homologador_de(uuid)  TO authenticated;

-- Funções internas e RPCs recriadas: mesmas permissões da migração 20261115004.
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_homologador_efetivo(uuid, uuid)            FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_exigir_validador_na_reabertura(text, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enviar_para_validacao(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.validar_risco(uuid, text)   FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.enviar_para_validacao(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.validar_risco(uuid, text)   TO authenticated;
