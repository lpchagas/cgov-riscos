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
--   - os que passam a EXIGIR HOMOLOGAÇÃO (is_critico, ou status_critico =
--     'pendente_dar' — o mesmo critério de validar_risco) voltam para
--     `em_homologacao_dir`, com uma linha no histórico do fluxo
--     (etapa 'reabertura_nota', ação NOVA 'reaberto_mudanca_dar');
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
-- (a fila de homologação o mostra e a CGOV resolve — por exemplo, pedindo que
-- outro servidor reenvie), e o texto do histórico registra o problema.
-- A mudança da DAR NÃO é abortada: a DAR é decisão da governança e não pode
-- ficar refém de um cadastro incompleto de uma unidade.
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
  v_exigia       boolean;         -- exigia homologação antes?
  v_exige        boolean;         -- exige homologação agora?
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
    v_exigia := v_risco.is_critico OR v_risco.status_critico = 'pendente_dar';

    -- Reaciona o cálculo EXISTENTE (UPDATE "aprovado → aprovado" com o sinal
    -- radar.fluxo). A linha devolvida já vem com a criticidade nova.
    v_novo  := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    v_exige := v_novo.is_critico OR v_novo.status_critico = 'pendente_dar';

    IF v_exige AND NOT v_exigia THEN
      -- Passou a exigir homologação: volta ao 3º degrau.
      SELECT o.unidade_id INTO v_unidade
        FROM public.objetos_contexto AS o WHERE o.id = v_novo.objeto_id;
      v_homologa := public.fn_fluxo_homologador_efetivo(
                      v_unidade, public.fn_fluxo_quem_enviou(v_novo.id));

      v_texto := format(
        'DAR alterada: categoria %s com apetite %s → %s. O risco aprovado (residual %s, %s) passou a %s e voltou para homologação.',
        NEW.nome, OLD.apetite_declarado, NEW.apetite_declarado,
        v_novo.nivel_residual, v_novo.classificacao_residual,
        CASE WHEN v_novo.is_critico THEN 'Risco Crítico (fora do apetite)'
             ELSE 'aguardar a definição do apetite (pendente_dar)' END);
      IF v_homologa IS NULL THEN
        v_texto := v_texto || ' Atenção: não há homologador efetivo para este risco (quem o enviou é o titular da unidade que o homologaria, ou a unidade não tem GR, Diretoria ou Presidência acima). A CGOV deve resolver.';
      END IF;

      PERFORM public.fn_fluxo_mudar_estado(v_novo.id, 'em_homologacao_dir');
      PERFORM public.fn_fluxo_registrar_historico(v_novo.id, 'reabertura_nota',
                                                  'reaberto_mudanca_dar', v_texto);
    END IF;
    -- Demais casos (deixou de ser crítico, ou nada mudou): o UPDATE acima já
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
