-- ============================================================================
-- ETAPA B1.1 / TAREFA 4 — DAR alterada reavalia os riscos aprovados (P-B1-8)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A Declaração de Apetite a Riscos (DAR) fica em `categorias_risco`, na coluna
-- `apetite_declarado` ('baixo', 'moderado' ou 'pendente_dar'). Pelo cálculo
-- existente (trigger_calcular_risco_radar, migração 20261109001), o apetite só
-- decide a criticidade de um risco de residual MÉDIO:
--   residual Alto/Extremo → sempre crítico;  residual Baixo → nunca crítico;
--   residual Médio + apetite 'baixo'        → crítico (fora do apetite);
--   residual Médio + apetite 'moderado'     → não crítico (dentro do apetite);
--   residual Médio + apetite 'pendente_dar' → 'pendente_dar'.
--
-- Antes desta migração, mudar a DAR não mexia nos riscos já APROVADOS: a
-- criticidade gravada neles ficava velha até alguém editar a ficha.
-- Regra P-B1-8 (decisão da CGOV): quando o apetite de uma categoria muda, o
-- banco reavalia, na hora, os riscos `aprovado` daquela categoria:
--   - os que PASSAM A SER CRÍTICOS (is_critico era falso e passou a
--     verdadeiro — texto literal da spec, §2) voltam para
--     `em_homologacao_dir`, com uma linha no histórico do fluxo
--     (etapa 'reabertura_nota', ação NOVA 'reaberto_mudanca_dar').
--     Inclui o caso mais comum: a PRIMEIRA publicação da DAR (categoria
--     'pendente_dar' → 'baixo'), em que um Médio aprovado vira crítico.
--     Ir para 'pendente_dar' sem virar crítico NÃO reabre (o risco segue
--     aprovado, só com status_critico atualizado);
--   - os que deixam de ser críticos só têm a criticidade atualizada e
--     CONTINUAM aprovados (sem linha no histórico; a trilha de auditoria
--     registra a mudança);
--   - os que continuam como estavam: nada muda no fluxo.
-- Riscos em outros estados e de outras categorias NÃO são tocados (os que
-- estão em validação têm a criticidade recalculada por validar_risco).
--
-- Exemplo: a CGOV muda a categoria Operacional de 'moderado' para 'baixo'.
--   RADAR-X (aprovado, P=2, I=3 → residual 9,00, Médio) passa a crítico →
--   vai para em_homologacao_dir; o histórico diz "DAR alterada: categoria
--   Operacional com apetite moderado → baixo...". O titular da GR homologa
--   de novo (homologar_risco) e ele volta a aprovado.
--
-- COMO O RECÁLCULO É FEITO SEM MEXER NA FÓRMULA:
-- Para cada risco aprovado da categoria, chamamos
--     fn_fluxo_mudar_estado(risco, 'aprovado')
-- ou seja, um UPDATE "estado → o mesmo estado", com o sinal `radar.fluxo`
-- ligado. É a mesma técnica de validar_risco (migração 20261115004): o UPDATE
-- dispara trigger_calcular_risco_radar, que relê o apetite NOVO (o gatilho é
-- AFTER, a linha da categoria já está gravada) e recalcula is_critico e
-- status_critico. Nenhuma regra do cálculo é copiada aqui.
-- Com o sinal ligado, o gatilho trg_riscos_trava_reabertura LIBERA o UPDATE:
-- o risco NÃO passa pela "reabertura por edição" (que o mandaria para
-- em_validacao_cg com 'reaberto_mudanca_nota'). Quem decide para onde ele vai
-- é esta função: em_homologacao_dir, se passou a exigir homologação.
--
-- QUEM ASSINA O HISTÓRICO: fn_fluxo_registrar_historico grava meu_perfil() e
-- auth.uid() — ou seja, quem mudou a DAR (a CGOV; só ela grava em
-- categorias_risco, pela RLS da migração 20261115003). A ação nova
-- 'reaberto_mudanca_dar' NÃO entra em fn_fluxo_quem_enviou (que só olha
-- 'submetido' e 'reaberto_mudanca_nota'): quem ENVIOU o risco continua sendo
-- quem o enviou antes, e o homologador efetivo (D1, "sobe um nível") é
-- calculado a partir dessa pessoa — a CGOV não vira "remetente".
--
-- E SE NÃO HOUVER HOMOLOGADOR EFETIVO? (decisão do controlador da etapa)
-- Ex.: risco da Presidência que o PRÓPRIO Presidente enviou: ninguém acima
-- dele homologa (fn_fluxo_homologador_efetivo devolve nulo); ou unidade fora
-- da árvore. Nesses casos o risco VAI MESMO ASSIM para em_homologacao_dir
-- (a fila de homologação o mostra) e o texto do histórico registra o
-- problema. A mudança da DAR NÃO é abortada: a DAR é decisão da governança e
-- não pode ficar refém de um cadastro incompleto de uma unidade.
-- A SAÍDA REAL desse impasse está no item 3 abaixo: devolver_risco passa a
-- aceitar que a CGOV DEVOLVA a ficha à unidade quando o estado atual não tem
-- ator efetivo (sem homologador em em_homologacao_dir, ou sem validador em
-- em_validacao_cg). A unidade ajusta e reenvia (outro servidor, se for o caso).
--
-- TRILHA DE AUDITORIA (efeito aceito): TODO risco aprovado da categoria
-- recebe o UPDATE de recálculo — inclusive os de residual Alto/Extremo/Baixo,
-- cuja criticidade não muda. Cada um ganha uma linha em auditoria_log e tem
-- `atualizado_em` renovado. Filtrar só os Médios duplicaria uma regra do
-- cálculo; o impacto é baixo porque mudanças da DAR são raras.
--
-- Tabela historico_fluxo: a coluna `acao` não tem CHECK (texto livre gravado
-- só pelas funções do fluxo), então a ação nova não exige alterar restrição.
--
-- NÃO altera o cálculo (Quadros 6, 7 e 8 / trigger_calcular_risco_radar) nem
-- migrações anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. A função do gatilho
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: precisa atualizar riscos de QUALQUER unidade (a CGOV, pela
-- RLS, não grava riscos fora do preliminar). Roda como o dono e ignora a RLS;
-- por isso só é chamada como gatilho (EXECUTE revogado de todos, abaixo).
-- SET search_path = '': todos os nomes qualificados com `public.`.
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

    IF v_exige AND NOT v_exigia THEN
      -- Passou a ser Risco Crítico: volta ao 3º degrau.
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
    -- crítico, ou nada mudou): o UPDATE acima já
    -- gravou a criticidade nova; o risco continua aprovado.
  END LOOP;

  RETURN NULL;   -- gatilho AFTER: o valor de retorno é ignorado
END;
$$;

-- Só o banco chama esta função (como gatilho). Ninguém a executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_dar_reavaliar_aprovados() FROM public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. O gatilho
-- ----------------------------------------------------------------------------
-- AFTER UPDATE OF apetite_declarado: só quando o UPDATE cita a coluna do
-- apetite; e o WHEN garante que o valor MUDOU de fato (trocar só a
-- justificativa, ou gravar o mesmo apetite, não reavalia nada).
-- AFTER (e não BEFORE): o recálculo relê categorias_risco, então a linha
-- nova da categoria precisa já estar gravada.
-- A RLS de categorias_risco continua igual: quem não é CGOV muda 0 linhas e
-- o gatilho nem dispara.
CREATE TRIGGER trg_categorias_dar_reavalia_aprovados
AFTER UPDATE OF apetite_declarado ON public.categorias_risco
FOR EACH ROW
WHEN (OLD.apetite_declarado IS DISTINCT FROM NEW.apetite_declarado)
EXECUTE FUNCTION public.fn_dar_reavaliar_aprovados();

-- ----------------------------------------------------------------------------
-- 3. devolver_risco: saída pela CGOV quando o estado não tem ator efetivo
-- ----------------------------------------------------------------------------
-- Recriada a partir da definição vigente (migração 20261115004; a 20261116001
-- não a recriou). Mesma assinatura, SECURITY DEFINER, search_path vazio e as
-- mesmas permissões. ÚNICA diferença: se não existe ator efetivo no estado
-- atual —
--   em_homologacao_dir e fn_fluxo_homologador_efetivo(...) é NULO, ou
--   em_validacao_cg    e fn_fluxo_validador_efetivo(...)   é NULO —
-- um usuário ATIVO com papel `cgov` pode devolver o risco (→ devolvido). O
-- histórico é o mesmo de uma devolução comum ('devolucao_ajuste' /
-- 'devolvido_ajuste'), assinado pela CGOV, e o motivo continua obrigatório.
-- Quando EXISTE ator efetivo, nada muda: só o titular dele devolve, e a CGOV
-- recebe a mesma recusa 42501 de sempre.
-- Ex.: risco da Presidência enviado pelo próprio Presidente fica em
-- em_homologacao_dir após a DAR mudar (ninguém o homologaria); cgov@ devolve
-- com "Reenviar por outro servidor." → devolvido.
CREATE OR REPLACE FUNCTION public.devolver_risco(risco uuid, motivo text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
  v_quem    uuid;    -- unidade cujo titular pode devolver no estado atual
  v_motivo  text := nullif(btrim(coalesce(devolver_risco.motivo, '')), '');
BEGIN
  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'RADAR: informe o motivo da devolução (é obrigatório).'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = devolver_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', devolver_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;

  IF v_risco.status_fluxo = 'em_validacao_cg' THEN
    v_quem := public.fn_fluxo_validador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));
  ELSIF v_risco.status_fluxo = 'em_homologacao_dir' THEN
    v_quem := public.fn_fluxo_homologador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));
  ELSE
    RAISE EXCEPTION 'RADAR: estado não permite devolver o risco % (está em "%"; só se devolve risco em validação ou homologação).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF v_quem IS NULL THEN
    -- P-B1-8: ninguém pode agir neste estado → só a CGOV (perfil ativo) devolve.
    IF NOT coalesce((public.meu_perfil()).papel_governanca = 'cgov', false) THEN
      RAISE EXCEPTION 'RADAR: o risco % não tem quem o valide ou homologue neste estado; só a CGOV pode devolvê-lo à unidade.', v_risco.codigo_radar
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF NOT public.e_titular_de(v_quem) THEN
    RAISE EXCEPTION 'RADAR: só o titular que valida ou homologa o risco % neste estado pode devolvê-lo.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'devolvido');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'devolucao_ajuste', 'devolvido_ajuste', v_motivo);
  RETURN v_risco;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.devolver_risco(uuid, text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.devolver_risco(uuid, text) TO authenticated;
