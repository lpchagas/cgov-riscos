-- ============================================================================
-- LAC-13 — Risco Crítico não aceita "Aceitar" e exige ação de tratamento
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Metodologia de Gestão de Riscos (Minuta SEI 024421455, item 4.5 e
-- Anexo III), o Risco Crítico precisa de TRATAMENTO. Duas regras de negócio:
--   RN-019 (RF-049): a estratégia principal de um risco crítico não pode ser
--                    "Aceitar";
--   RN-020 (RF-050): o risco crítico precisa de pelo menos uma ação de
--                    tratamento (5W2H) cuja estratégia não seja "Aceitar".
--                    (A estratégia da ação NÃO precisa ser igual à principal:
--                    a norma não pede isso.)
-- "Risco crítico", PARA ESTA TRAVA, é status_critico = 'sim' (fora do apetite
-- da DAR) OU 'pendente_dar' (a categoria ainda não tem apetite declarado; o
-- RADAR a trata como crítica, coerente com a homologação, que já a sobe à
-- Diretoria). Atenção: "crítico" NÃO é a faixa 18 a 25 do Quadro 8 (essa é
-- "Extremo"); é estar fora do apetite da DAR.
--
-- Exemplo: P=4, I=4 → Quadro 7 = 21 → residual 21,00 (Extremo) → fora do
-- apetite (status_critico = 'sim'). Com "Aceitar", ou sem ação, o envio é
-- recusado:
--   RADAR: o risco RADAR-2026-004 é crítico (fora do apetite da DAR ou com
--   DAR pendente) e precisa de tratamento: a estratégia "Aceitar" não é
--   permitida.
-- O front (src/services/dados/errosBanco.ts) reconhece o trecho "é crítico
-- (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento" e
-- mostra a frase de MENSAGEM_TRAVA_CRITICO (src/utils/travaRiscoCritico.ts).
--
-- ONDE A TRAVA ENTRA (a "porta" de cada caminho até a aprovação):
--   1. fn_trava_risco_critico(risco): a regra, num lugar só. Devolve NULL se
--      passa, ou o motivo (primeiro "Aceitar", depois "falta uma ação").
--   2. enviar_para_validacao, validar_risco, homologar_risco: ENVOLTÓRIOS.
--      A função original vira uma "base" (fn_base_...), copiada sem mudar a
--      lógica (só o nome; ver a seção 2 sobre por que não RENAME).
--      O envoltório, com o nome, a assinatura e o retorno de sempre, chama a
--      base (que faz todas as checagens de hoje e recalcula a criticidade) e,
--      no fim, consulta a trava. Se a trava recusar, a exceção desfaz TUDO o
--      que a base fez (mudança de estado e histórico), porque a chamada inteira
--      é uma transação. Em validar e homologar, a mensagem orienta a DEVOLVER a
--      ficha: é a rede de segurança para a ficha que já estava no caminho antes
--      desta migração. Devolver (devolver_risco) continua sempre possível.
--      Ex.: ct@ tenta validar RADAR-X (crítico, "Aceitar") → recusa 23514 "...
--      Devolva a ficha à unidade para ajuste." → ct@ devolve → devolvido.
--   3. salvar_ficha_risco: grava a estratégia e as ações direto. Ela recusa
--      gravar ficha crítica que não passa na trava quando a ficha NÃO está em
--      rascunho, devolvido ou preliminar_cgov (esses continuam livres: o
--      gestor salva e corrige depois). Assim, uma chamada direta não põe
--      "Aceitar" num aprovado. POR QUE ESTA FOI COPIADA, E NÃO ENVOLVIDA:
--      salvar_ficha_risco é SECURITY INVOKER (roda com a RLS de quem está
--      logado). Um envoltório SECURITY DEFINER rodaria a base como o dono do
--      banco, que IGNORA a RLS: qualquer pessoa logada gravaria ficha de
--      qualquer unidade. E um envoltório INVOKER exigiria deixar a base
--      executável por `authenticated`, exposta como RPC — bastaria chamá-la
--      direto para pular a trava. Por isso ela foi recriada (CREATE OR
--      REPLACE) a partir do corpo vigente (20261117001), com a trava escrita
--      no fim, em consultas simples que respeitam a RLS de quem grava (quem
--      grava lê o próprio risco). A regra é a mesma de fn_trava_risco_critico.
--   4. fn_dar_reavaliar_aprovados (gatilho da DAR, 20261116004): depois do
--      recálculo, PRIMEIRO consulta a trava. O aprovado que não passa volta
--      para a unidade (devolvido), com a linha 'devolvido_mudanca_dar' no
--      histórico. Isso inclui o que passou a 'pendente_dar' e o aprovado
--      antigo que já era crítico e estava com "Aceitar". O que passa na trava
--      segue o caminho de hoje (volta à homologação se passou a crítico; nos
--      demais casos, fica aprovado). A trava é consultada ANTES de decidir o
--      destino: nunca há exceção no meio do laço, e a mudança da DAR sempre
--      termina.
--
-- O QUE NÃO MUDA: o cálculo (Quadros 6, 7 e 8; trigger_calcular_risco_radar;
-- src/utils/calculadoraRiscoRadar.ts), a RLS, devolver_risco,
-- assumir_risco_preliminar, as permissões das RPCs (mesmos REVOKE/GRANT) e o
-- risco que NÃO é crítico ("Aceitar" sem ação continua valendo para ele).
-- acoes_no_fluxo (botões da tela) também não muda: o botão continua
-- aparecendo, e o clique mostra a recusa traduzida, que diz o que fazer.
--
-- CONFERÊNCIAS FEITAS ANTES DE ESCREVER (2026-11-22):
--   a) Versões vigentes: enviar_para_validacao e validar_risco em 20261116001;
--      homologar_risco em 20261115004; salvar_ficha_risco em 20261117001;
--      fn_dar_reavaliar_aprovados em 20261116004. Nenhuma migração posterior
--      as redefine (grep "FUNCTION public.<nome>" em supabase/migrations).
--   b) Nenhuma função chama enviar_para_validacao, validar_risco,
--      homologar_risco ou salvar_ficha_risco pelo nome (grep em
--      supabase/migrations, supabase/functions e src): nenhum chamador interno
--      passa a cair no envoltório sem querer.
--   c) A passagem aprovado → devolvido dentro do gatilho da DAR NÃO é barrada:
--      fn_fluxo_mudar_estado liga o sinal radar.fluxo; com ele,
--      fn_trava_reabertura_risco (20261116001) libera o UPDATE logo no início
--      e fn_bloquear_status_fluxo_direto (trg_riscos_status_fluxo_so_pelo_fluxo,
--      20261115003) só recusa sem o sinal. O CHECK de status_fluxo aceita
--      'devolvido'. Nada precisou ser aberto.
--   d) historico_fluxo.etapa e .acao não têm CHECK (texto livre): a ação nova
--      'devolvido_mudanca_dar' não exige mudar restrição. Ela NÃO entra em
--      fn_fluxo_quem_enviou (que só olha 'submetido' e 'reaberto_mudanca_nota').
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. fn_trava_risco_critico: a regra da trava, num lugar só
-- ----------------------------------------------------------------------------
-- Lê o risco COMO ELE ESTÁ: quem chama garante que a criticidade é a atual
-- (os envoltórios chamam depois da base, que já recalculou; o gatilho da DAR
-- chama depois do recálculo).
-- Devolve:
--   NULL                                        → passa (não é crítico, ou tem tratamento);
--   'a estratégia "Aceitar" não é permitida'   → crítico com "Aceitar";
--   'falta uma ação de tratamento (5W2H)'      → crítico sem ação que não seja "Aceitar".
-- Ex.: crítico, Mitigar, uma ação Compartilhar → NULL (passa).
-- SECURITY DEFINER: lê qualquer risco (o gatilho da DAR roda como o dono).
-- Ninguém logado a executa (REVOKE abaixo): só as funções deste arquivo.
CREATE OR REPLACE FUNCTION public.fn_trava_risco_critico(p_risco uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status_critico text;
  v_estrategia     text;
BEGIN
  SELECT r.status_critico, r.estrategia_principal
    INTO v_status_critico, v_estrategia
    FROM public.riscos AS r
   WHERE r.id = p_risco;

  -- Risco inexistente ou NÃO crítico: a trava não se aplica.
  IF NOT FOUND OR v_status_critico NOT IN ('sim', 'pendente_dar') THEN
    RETURN NULL;
  END IF;

  -- 1º motivo: a estratégia principal.
  IF v_estrategia = 'Aceitar' THEN
    RETURN 'a estratégia "Aceitar" não é permitida';
  END IF;

  -- 2º motivo: pelo menos uma ação 5W2H que não seja "Aceitar".
  IF NOT EXISTS (SELECT 1 FROM public.respostas_tratamento AS t
                  WHERE t.risco_id = p_risco AND t.estrategia <> 'Aceitar') THEN
    RETURN 'falta uma ação de tratamento (5W2H)';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_trava_risco_critico(uuid) FROM public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. As três RPCs do fluxo: a original vira "base"; o envoltório confere a trava
-- ----------------------------------------------------------------------------
-- As bases são CÓPIAS FIÉIS das versões vigentes (enviar_para_validacao e
-- validar_risco de 20261116001; homologar_risco de 20261115004), com UMA
-- diferença mecânica: o nome. Por que não ALTER FUNCTION ... RENAME TO?
-- Foi a primeira tentativa, e quebrou: no PL/pgSQL, o nome da função serve
-- de "rótulo" dos parâmetros (ex.: `enviar_para_validacao.risco`), e esse
-- rótulo segue o nome NOVO. Depois do RENAME, o corpo antigo procurava
-- `enviar_para_validacao.risco` e dava erro 42P01. Então cada base é
-- recriada com o rótulo trocado (`fn_base_enviar_para_validacao.risco`) e
-- NADA mais. As mensagens, as checagens e o recálculo são os de hoje.
-- Ninguém logado executa as bases (REVOKE abaixo): só o envoltório, que roda
-- como o dono. Assim ninguém "pula" a trava chamando a base direto.

-- 2.0a fn_base_enviar_para_validacao (cópia de 20261116001, seção 4)
CREATE OR REPLACE FUNCTION public.fn_base_enviar_para_validacao(risco uuid)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = fn_base_enviar_para_validacao.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', fn_base_enviar_para_validacao.risco USING ERRCODE = 'no_data_found';
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
    IF public.homologador_de(v_unidade) IS NULL THEN
      RAISE EXCEPTION 'RADAR: o risco % exige homologação, mas a unidade não tem Gerência Regional, Diretoria ou Presidência acima dela. Procure a CGOV.',
        v_risco.codigo_radar
        USING ERRCODE = 'object_not_in_prerequisite_state';
    ELSE
      RAISE EXCEPTION 'RADAR: o risco % exige homologação e quem envia é o titular da unidade que o homologaria (ex.: o Presidente não homologa o próprio risco). Peça a outro servidor da unidade que envie a ficha.',
        v_risco.codigo_radar
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'em_validacao_cg');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'submissao_1a_linha', 'submetido',
    'Ficha enviada pela 1ª linha para validação da chefia imediata.');
  RETURN v_risco;
END;
$$;

-- 2.0b fn_base_validar_risco (cópia de 20261116001, seção 5)
CREATE OR REPLACE FUNCTION public.fn_base_validar_risco(risco uuid, parecer text)
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
  v_parecer    text := nullif(btrim(coalesce(fn_base_validar_risco.parecer, '')), '');
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = fn_base_validar_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', fn_base_validar_risco.risco USING ERRCODE = 'no_data_found';
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

-- 2.0c fn_base_homologar_risco (cópia de 20261115004, seção 4.4)
CREATE OR REPLACE FUNCTION public.fn_base_homologar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco    public.riscos;
  v_unidade  uuid;
  v_homologa uuid;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = fn_base_homologar_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', fn_base_homologar_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  v_homologa := public.fn_fluxo_homologador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));

  IF v_homologa IS NULL OR NOT public.e_titular_de(v_homologa) THEN
    RAISE EXCEPTION 'RADAR: só o titular da Gerência Regional, da Diretoria ou da Presidência responsável pode homologar o risco %.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo <> 'em_homologacao_dir' THEN
    RAISE EXCEPTION 'RADAR: estado não permite homologar o risco % (está em "%"; só se homologa risco em homologação).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'homologacao_diretoria', 'homologado',
    concat_ws(' ', 'Homologado para integrar o Plano de Gestão de Riscos.',
              nullif(btrim(coalesce(fn_base_homologar_risco.parecer, '')), '')));
  RETURN v_risco;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_base_enviar_para_validacao(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_base_validar_risco(uuid, text)   FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_base_homologar_risco(uuid, text) FROM public, anon, authenticated;

-- 2.1 enviar_para_validacao: rascunho/devolvido → em_validacao_cg
-- Ex.: gestor.uc@ envia rascunho crítico com "Aceitar" → recusa 23514; o
-- risco continua em rascunho (a exceção desfaz a mudança feita pela base).
CREATE OR REPLACE FUNCTION public.enviar_para_validacao(risco uuid)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v        public.riscos;
  v_motivo text;
BEGIN
  -- Todas as checagens de hoje (e o recálculo da criticidade) ficam na base.
  v := public.fn_base_enviar_para_validacao(enviar_para_validacao.risco);
  v_motivo := public.fn_trava_risco_critico(v.id);
  IF v_motivo IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %.',
      v.codigo_radar, v_motivo
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN v;
END;
$$;

-- 2.2 validar_risco: em_validacao_cg → aprovado ou em_homologacao_dir
-- Rede de segurança para a ficha que já estava em validação antes desta
-- migração: a mensagem orienta a devolver a ficha à unidade.
CREATE OR REPLACE FUNCTION public.validar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v        public.riscos;
  v_motivo text;
BEGIN
  v := public.fn_base_validar_risco(validar_risco.risco, validar_risco.parecer);
  v_motivo := public.fn_trava_risco_critico(v.id);
  IF v_motivo IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %. Devolva a ficha à unidade para ajuste.',
      v.codigo_radar, v_motivo
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN v;
END;
$$;

-- 2.3 homologar_risco: em_homologacao_dir → aprovado
CREATE OR REPLACE FUNCTION public.homologar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v        public.riscos;
  v_motivo text;
BEGIN
  v := public.fn_base_homologar_risco(homologar_risco.risco, homologar_risco.parecer);
  v_motivo := public.fn_trava_risco_critico(v.id);
  IF v_motivo IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %. Devolva a ficha à unidade para ajuste.',
      v.codigo_radar, v_motivo
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN v;
END;
$$;

-- Mesmas permissões de hoje (20261115004 e 20261116001): só quem fez login.
REVOKE EXECUTE ON FUNCTION public.enviar_para_validacao(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.validar_risco(uuid, text)   FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.homologar_risco(uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.enviar_para_validacao(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.validar_risco(uuid, text)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.homologar_risco(uuid, text) TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. salvar_ficha_risco: recriada (SECURITY INVOKER) com a trava no fim
-- ----------------------------------------------------------------------------
-- Corpo IGUAL ao da migração 20261117001 (ver lá a explicação completa), com
-- uma única diferença: o bloco "2d. TRAVA DO RISCO CRÍTICO" (e as 4 variáveis
-- v_trava_* que ele usa), antes de
-- devolver o resultado. Por que copiada, e não envolvida: ver o cabeçalho
-- (a RLS de quem grava precisa continuar valendo).
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
  -- Trava do risco crítico (LAC-13, bloco 2d): o risco como ficou gravado.
  v_trava_estado     text;
  v_trava_critico    text;
  v_trava_estrategia text;
  v_trava_motivo     text;

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
  -- 2d. TRAVA DO RISCO CRÍTICO (LAC-13, migração 20261122002)
  --     Fora do rascunho, do devolvido e do preliminar_cgov, a ficha crítica
  --     precisa de tratamento: estratégia principal diferente de "Aceitar" e
  --     pelo menos uma ação 5W2H que não seja "Aceitar". Mesma regra de
  --     fn_trava_risco_critico, escrita aqui em consultas simples porque esta
  --     função é SECURITY INVOKER: as leituras passam pela RLS de quem grava
  --     (que lê o próprio risco). Relemos o risco GRAVADO: o gatilho de
  --     cálculo já atualizou a criticidade, e a edição de um aprovado pode tê-lo
  --     reaberto (em_validacao_cg) neste mesmo comando.
  --     Ex.: aprovado crítico gravado com "Aceitar" → recusa 23514, e o
  --     comando inteiro é desfeito (a ficha continua aprovada como estava).
  -- -------------------------------------------------------------------------
  SELECT r.status_fluxo, r.status_critico, r.estrategia_principal
    INTO v_trava_estado, v_trava_critico, v_trava_estrategia
    FROM public.riscos AS r WHERE r.id = v_id;

  IF v_trava_estado NOT IN ('rascunho', 'devolvido', 'preliminar_cgov')
     AND v_trava_critico IN ('sim', 'pendente_dar') THEN
    IF v_trava_estrategia = 'Aceitar' THEN
      v_trava_motivo := 'a estratégia "Aceitar" não é permitida';
    ELSIF NOT EXISTS (SELECT 1 FROM public.respostas_tratamento AS t
                       WHERE t.risco_id = v_id AND t.estrategia <> 'Aceitar') THEN
      v_trava_motivo := 'falta uma ação de tratamento (5W2H)';
    END IF;
    IF v_trava_motivo IS NOT NULL THEN
      RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %.',
        v_codigo, v_trava_motivo
        USING ERRCODE = 'check_violation';   -- 23514
    END IF;
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


-- ----------------------------------------------------------------------------
-- 4. fn_dar_reavaliar_aprovados: o aprovado que não passa na trava volta à unidade
-- ----------------------------------------------------------------------------
-- Recriada a partir da migração 20261116004 (ver lá a explicação completa).
-- ÚNICA mudança, no laço, depois do recálculo:
--   PRIMEIRO a trava: se o risco (já com a criticidade nova) é crítico e está
--   com "Aceitar" ou sem ação → devolvido + linha 'devolvido_mudanca_dar'.
--   SENÃO, o caminho de hoje: passou a crítico → em_homologacao_dir.
-- A trava é consultada ANTES de decidir o destino (e nenhuma passagem aqui
-- confere a trava), então a mudança da DAR nunca é abortada por ela.
-- Ex.: a CGOV muda Operacional de 'moderado' para 'baixo'. RADAR-A (aprovado,
--   residual 9,00 Médio, "Aceitar") passa a crítico → devolvido; RADAR-B (o
--   mesmo, com Mitigar + ação) → em_homologacao_dir, como antes.
CREATE OR REPLACE FUNCTION public.fn_dar_reavaliar_aprovados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco        public.riscos;   -- risco ANTES do recálculo
  v_novo         public.riscos;   -- risco DEPOIS do recálculo
  v_exigia       boolean;         -- era crítico antes?
  v_exige        boolean;         -- é crítico agora?
  v_unidade      uuid;
  v_homologa     uuid;            -- homologador efetivo (D1)
  v_texto        text;
BEGIN
  -- FOR UPDATE: segura as linhas até o fim da transação, para que uma edição
  -- ou homologação simultânea não "passe por baixo" da reavaliação.
  -- ORDER BY id: ordem fixa de bloqueio (evita impasse entre duas mudanças).
  FOR v_risco IN
    SELECT r.*
      FROM public.riscos AS r
     WHERE r.categoria_id = NEW.id
       AND r.status_fluxo = 'aprovado'
     ORDER BY r.id
       FOR UPDATE
  LOOP
    v_exigia := v_risco.is_critico;

    -- Reaciona o cálculo EXISTENTE (UPDATE "aprovado → aprovado" com o sinal
    -- radar.fluxo). A linha devolvida já vem com a criticidade nova.
    v_novo  := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    v_exige := v_novo.is_critico;

    IF public.fn_trava_risco_critico(v_novo.id) IS NOT NULL THEN
      -- LAC-13: crítico (ou com DAR pendente) sem tratamento não pode seguir
      -- aprovado nem subir à homologação: volta para a unidade ajustar.
      v_texto := format(
        'DAR alterada: categoria %s com apetite %s → %s. O risco aprovado (residual %s, %s) passou a Risco Crítico e está com a estratégia "Aceitar" ou sem ação de tratamento, que a Metodologia não permite para risco crítico. Voltou para a unidade escolher outra estratégia e incluir a ação.',
        NEW.nome, OLD.apetite_declarado, NEW.apetite_declarado,
        v_novo.nivel_residual, v_novo.classificacao_residual);
      PERFORM public.fn_fluxo_mudar_estado(v_novo.id, 'devolvido');
      PERFORM public.fn_fluxo_registrar_historico(v_novo.id, 'reabertura_nota',
                                                  'devolvido_mudanca_dar', v_texto);

    ELSIF v_exige AND NOT v_exigia THEN
      -- Passou a ser Risco Crítico (e tem tratamento): volta ao 3º degrau.
      SELECT o.unidade_id INTO v_unidade
        FROM public.objetos_contexto AS o WHERE o.id = v_novo.objeto_id;
      v_homologa := public.fn_fluxo_homologador_efetivo(
                      v_unidade, public.fn_fluxo_quem_enviou(v_novo.id));

      v_texto := format(
        'DAR alterada: categoria %s com apetite %s → %s. O risco aprovado (residual %s, %s) passou a Risco Crítico (fora do apetite) e voltou para homologação.',
        NEW.nome, OLD.apetite_declarado, NEW.apetite_declarado,
        v_novo.nivel_residual, v_novo.classificacao_residual);
      IF v_homologa IS NULL THEN
        v_texto := v_texto || ' Atenção: não há homologador efetivo para este risco (quem o enviou é o titular da unidade que o homologaria, ou a unidade não tem GR, Diretoria ou Presidência acima). A CGOV pode devolver a ficha à unidade para ajuste e reenvio.';
      END IF;

      PERFORM public.fn_fluxo_mudar_estado(v_novo.id, 'em_homologacao_dir');
      PERFORM public.fn_fluxo_registrar_historico(v_novo.id, 'reabertura_nota',
                                                  'reaberto_mudanca_dar', v_texto);
    END IF;
    -- Demais casos (deixou de ser crítico, foi para pendente_dar sem virar
    -- crítico e com tratamento, ou nada mudou): o UPDATE acima já gravou a
    -- criticidade nova; o risco continua aprovado.
  END LOOP;

  RETURN NULL;   -- gatilho AFTER: o valor de retorno é ignorado
END;
$$;

-- Só o banco chama esta função (como gatilho). Ninguém a executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_dar_reavaliar_aprovados() FROM public, anon, authenticated;
