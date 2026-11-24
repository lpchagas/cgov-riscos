-- ============================================================================
-- LAC-04 — Comunicações à CGOV (imutáveis, com ciência da CGOV)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Quando acontece um evento previsto na Política (hipóteses I a VI) ou quando
-- um alerta de KRI precisa ser levado à CGOV, a unidade ENVIA uma comunicação.
-- Ela vale como registro: depois de enviada NÃO se edita nem se apaga. A única
-- coisa que muda é a CIÊNCIA da CGOV (quando, quem e uma observação), dada uma
-- única vez.
--
-- O que esta migração cria:
--   1. comunicacoes_cgov   — a comunicação (uma linha por envio);
--   2. comunicacoes_riscos — os riscos ligados a cada comunicação (N:N);
--   3. FK de alertas_kri.comunicacao_id (coluna criada na migração anterior);
--   4. gatilho de imutabilidade e gatilho que ENCERRA o alerta do KRI;
--   5. enviar_comunicacao(jsonb)  — a gravação, numa transação só;
--   6. registrar_ciencia_comunicacao(uuid, text) — só a CGOV;
--   7. a visão comunicacoes_cgov_situacao, com o prazo em dias úteis;
--   8. RLS, auditoria e permissões.
-- Nenhuma regra de cálculo de risco (Quadros 6, 7 e 8) é tocada aqui.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. comunicacoes_cgov
-- ----------------------------------------------------------------------------
-- hipotese: 'I' a 'VI' (hipóteses da Política) ou 'alerta_kri' (comunicação
--   de um alerta de KRI).
-- supre: quais hipóteses I, II ou III esta comunicação "supre" (cobre). Só faz
--   sentido na comunicação de alerta de KRI; nas demais fica vazio.
-- data_ciencia: o dia em que a unidade tomou ciência do fato (inicia o prazo
--   de 10 dias úteis). Obrigatória: sem ela não há como medir o prazo.
-- alerta_id: o alerta do KRI comunicado (no máximo UMA comunicação por alerta).
CREATE TABLE public.comunicacoes_cgov (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id       uuid NOT NULL REFERENCES public.unidades(id),
  hipotese         text NOT NULL
                     CONSTRAINT comunicacoes_cgov_hipotese_check
                     CHECK (hipotese IN ('I', 'II', 'III', 'IV', 'V', 'VI', 'alerta_kri')),
  supre            text[] NOT NULL DEFAULT '{}',
  data_ciencia     date NOT NULL,
  comunicada_em    timestamptz NOT NULL DEFAULT now(),
  descricao        text NOT NULL,
  providencias     text,
  documento_sei    text,
  alerta_id        uuid UNIQUE REFERENCES public.alertas_kri(id),
  autor_id         uuid DEFAULT auth.uid(),
  ciencia_cgov_em  timestamptz,
  ciencia_cgov_por uuid,
  observacao_cgov  text,
  -- supre só aceita I, II e III...
  CONSTRAINT comunicacoes_cgov_supre_valores
    CHECK (supre <@ ARRAY['I', 'II', 'III']::text[]),
  -- ...e só quando a comunicação é de alerta de KRI.
  CONSTRAINT comunicacoes_cgov_supre_so_alerta
    CHECK (supre = '{}'::text[] OR hipotese = 'alerta_kri'),
  -- A hipótese alerta_kri EXIGE o alerta, e só ela tem alerta.
  CONSTRAINT comunicacoes_cgov_alerta_so_com_hipotese
    CHECK ((hipotese = 'alerta_kri') = (alerta_id IS NOT NULL))
);

COMMENT ON TABLE public.comunicacoes_cgov IS
  'Comunicação da unidade à CGOV (hipóteses I a VI ou alerta de KRI). Imutável; só a ciência da CGOV muda, uma vez.';

-- O alerta passa a apontar de fato para a comunicação que o encerrou.
ALTER TABLE public.alertas_kri
  ADD CONSTRAINT alertas_kri_comunicacao_fk
  FOREIGN KEY (comunicacao_id) REFERENCES public.comunicacoes_cgov(id);

-- ----------------------------------------------------------------------------
-- 2. comunicacoes_riscos (chave dupla: uma ligação por par)
-- ----------------------------------------------------------------------------
-- A FK do risco é restritiva (sem cascata) de propósito: um risco que foi
-- comunicado à CGOV não some em silêncio e leva o registro junto.
CREATE TABLE public.comunicacoes_riscos (
  comunicacao_id uuid NOT NULL REFERENCES public.comunicacoes_cgov(id),
  risco_id       uuid NOT NULL REFERENCES public.riscos(id),
  PRIMARY KEY (comunicacao_id, risco_id)
);

-- ----------------------------------------------------------------------------
-- 3. Imutabilidade: BEFORE UPDATE
-- ----------------------------------------------------------------------------
-- Além de não haver política nem privilégio de UPDATE para quem usa o sistema,
-- este gatilho protege até de quem ignora a RLS (administrador, service_role):
--   - qualquer coluna fora das três da ciência não pode mudar;
--   - com a ciência já registrada, nada mais muda (a ciência é dada uma vez).
-- Truque: to_jsonb(linha) - colunas compara "a linha inteira, menos a ciência".
CREATE FUNCTION public.fn_comunicacao_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_ciencia text[] := ARRAY['ciencia_cgov_em', 'ciencia_cgov_por', 'observacao_cgov'];
BEGIN
  IF (to_jsonb(NEW) - v_ciencia) IS DISTINCT FROM (to_jsonb(OLD) - v_ciencia) THEN
    RAISE EXCEPTION 'A comunicação é imutável: só a ciência da CGOV pode ser registrada';
  END IF;
  IF OLD.ciencia_cgov_em IS NOT NULL THEN
    RAISE EXCEPTION 'A ciência desta comunicação já foi registrada e não pode ser alterada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comunicacao_imutavel
  BEFORE UPDATE ON public.comunicacoes_cgov
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_imutavel();

-- ----------------------------------------------------------------------------
-- 3b. Auxiliares de alcance (DEFINER: leem sem passar pela RLS do chamador)
-- ----------------------------------------------------------------------------
-- fn_unidade_do_alerta(alerta): a unidade dona do KRI do alerta (a do objeto).
CREATE FUNCTION public.fn_unidade_do_alerta(p_alerta uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.unidade_id
    FROM public.alertas_kri AS a
    JOIN public.indicadores_kri AS k ON k.id = a.kri_id
    JOIN public.objetos_contexto AS o ON o.id = k.objeto_id
   WHERE a.id = p_alerta;
$$;

-- fn_unidades_de_escrita(unidade): a unidade + suas subunidades INTERNAS.
-- É o MESMO alcance de public.pode_escrever_unidade (20261115002, seção 5): a
-- própria unidade e, descendo a árvore, só as filhas de tipo divisao, servico,
-- setor ou base-avancada. Quem comunica por uma unidade só pode tratar do que
-- essa unidade também pode gravar: uma Gerência Regional NÃO comunica o alerta
-- nem liga os riscos de uma UC que está sob ela (isso é da UC), enquanto um
-- Setor dentro da própria unidade é dela. Por isso NÃO usamos
-- unidades_descendentes (a árvore inteira). pode_escrever_unidade parte da
-- lotação da pessoa logada; esta parte da unidade que comunica (parâmetro).
-- Mantida igual de propósito: se a regra de escrita mudar, mude as duas.
CREATE FUNCTION public.fn_unidades_de_escrita(p_unidade uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE propria(id) AS (
    SELECT p_unidade
    UNION
    SELECT filha.id
      FROM public.unidades AS filha
      JOIN propria AS pr ON filha.unidade_pai_id = pr.id
     WHERE filha.tipo IN ('divisao', 'servico', 'setor', 'base-avancada')
  )
  SELECT propria.id FROM propria;
$$;

-- fn_risco_na_unidade(risco, unidade): o risco é da unidade ou de uma
-- subunidade INTERNA dela? (fn_unidades_de_escrita, acima.)
CREATE FUNCTION public.fn_risco_na_unidade(p_risco uuid, p_unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.riscos AS r
      JOIN public.objetos_contexto AS o ON o.id = r.objeto_id
     WHERE r.id = p_risco
       AND o.unidade_id IN (SELECT public.fn_unidades_de_escrita(p_unidade)));
$$;

-- fn_alerta_na_unidade(alerta, unidade): o alerta é de um KRI da unidade (ou de subunidade interna)?
CREATE FUNCTION public.fn_alerta_na_unidade(p_alerta uuid, p_unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(public.fn_unidade_do_alerta(p_alerta)
                  IN (SELECT public.fn_unidades_de_escrita(p_unidade)), false);
$$;

-- fn_unidade_do_alerta e fn_unidades_de_escrita só são chamadas por dentro das
-- funções DEFINER acima: ninguém de fora precisa executá-las. As outras duas
-- ficam com authenticated porque a RPC (INVOKER) as chama.
REVOKE EXECUTE ON FUNCTION public.fn_unidade_do_alerta(uuid)          FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_unidades_de_escrita(uuid)        FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_risco_na_unidade(uuid, uuid)     FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fn_alerta_na_unidade(uuid, uuid)    FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_risco_na_unidade(uuid, uuid)     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_alerta_na_unidade(uuid, uuid)    TO authenticated;

-- ----------------------------------------------------------------------------
-- 3c. BEFORE INSERT em comunicacoes_cgov: gravar direto = gravar pela RPC
-- ----------------------------------------------------------------------------
-- A RPC é SECURITY INVOKER (a RLS vale), então o gestor TEM INSERT na tabela.
-- Sem este gatilho ele poderia gravar direto e forjar a ciência da CGOV, uma
-- data de envio retroativa (para parecer "no prazo"), outro autor, ou encerrar
-- o alerta de OUTRA unidade. Aqui o banco impõe as regras, venha o INSERT de
-- onde vier:
--   - a auditoria não envia (só lê);
--   - comunicada_em, autor_id e as 3 colunas de ciência não são do cliente:
--     valem agora, quem está logado e vazio. (Só quando há usuário logado:
--     cargas administrativas, sem auth.uid(), ficam como foram escritas.)
--   - data_ciencia não é futura;
--   - com alerta: hipótese alerta_kri, alerta aberto, da unidade que comunica
--     e com a data de ciência do alerta.
CREATE FUNCTION public.fn_comunicacao_antes_de_inserir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_al public.alertas_kri%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF (SELECT m.papel_governanca FROM public.meu_perfil() AS m) = 'auditoria' THEN
      RAISE EXCEPTION 'A auditoria não envia comunicação';
    END IF;
    NEW.comunicada_em    := now();
    NEW.autor_id         := auth.uid();
    NEW.ciencia_cgov_em  := NULL;
    NEW.ciencia_cgov_por := NULL;
    NEW.observacao_cgov  := NULL;
  END IF;

  IF NEW.data_ciencia > public.fn_hoje() THEN
    RAISE EXCEPTION 'A data de ciência não pode ser futura';
  END IF;

  IF NEW.alerta_id IS NOT NULL THEN
    SELECT * INTO v_al FROM public.alertas_kri WHERE id = NEW.alerta_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alerta não encontrado';
    END IF;
    IF NEW.hipotese IS DISTINCT FROM 'alerta_kri' THEN
      RAISE EXCEPTION 'A comunicação de um alerta deve ter a hipótese alerta_kri';
    END IF;
    IF v_al.encerrado_em IS NOT NULL THEN
      RAISE EXCEPTION 'Este alerta já foi comunicado';
    END IF;
    IF NOT public.fn_alerta_na_unidade(NEW.alerta_id, NEW.unidade_id) THEN
      RAISE EXCEPTION 'O alerta não pertence à unidade que comunica';
    END IF;
    IF NEW.data_ciencia <> v_al.ciencia_em THEN
      RAISE EXCEPTION 'A data de ciência deve ser a do alerta';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comunicacao_antes_de_inserir
  BEFORE INSERT ON public.comunicacoes_cgov
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_antes_de_inserir();

-- 3d. Risco obrigatório, conferido no FIM da transação. Os vínculos entram
-- DEPOIS da comunicação, então a checagem precisa ser adiada (DEFERRABLE
-- INITIALLY DEFERRED): vale tanto para a RPC quanto para o INSERT direto.
CREATE FUNCTION public.fn_comunicacao_exige_risco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.hipotese IN ('I', 'II', 'III', 'V', 'alerta_kri')
     AND NOT EXISTS (SELECT 1 FROM public.comunicacoes_riscos x WHERE x.comunicacao_id = NEW.id) THEN
    RAISE EXCEPTION 'Informe o risco ligado';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_comunicacao_exige_risco
  AFTER INSERT ON public.comunicacoes_cgov
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_exige_risco();

-- 3e. comunicacoes_riscos: vínculos só nascem junto com a comunicação e só
-- com riscos da unidade que comunica; depois, são imutáveis.
-- "Junto com a comunicação" = na mesma transação: now() é constante dentro da
-- transação e comunicada_em recebeu now() no INSERT da comunicação.
CREATE FUNCTION public.fn_comunicacao_risco_antes_de_inserir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_com public.comunicacoes_cgov%ROWTYPE;
BEGIN
  SELECT * INTO v_com FROM public.comunicacoes_cgov WHERE id = NEW.comunicacao_id;
  IF NOT FOUND OR v_com.comunicada_em <> now() THEN
    RAISE EXCEPTION 'Só é possível ligar riscos na mesma transação que cria a comunicação';
  END IF;
  IF NOT public.fn_risco_na_unidade(NEW.risco_id, v_com.unidade_id) THEN
    RAISE EXCEPTION 'O risco não pertence à unidade que comunica';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comunicacao_risco_antes_de_inserir
  BEFORE INSERT ON public.comunicacoes_riscos
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_risco_antes_de_inserir();

CREATE FUNCTION public.fn_comunicacao_risco_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'As ligações da comunicação são imutáveis';
END;
$$;

CREATE TRIGGER trg_comunicacao_risco_imutavel
  BEFORE UPDATE OR DELETE ON public.comunicacoes_riscos
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_risco_imutavel();

-- D-4: risco citado em comunicação não é apagado (mensagem clara, em vez do
-- erro técnico de chave estrangeira).
CREATE FUNCTION public.fn_risco_protege_comunicacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.comunicacoes_riscos x WHERE x.risco_id = OLD.id) THEN
    RAISE EXCEPTION 'Este risco foi citado em uma comunicação à CGOV e não pode ser apagado';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_risco_protege_comunicacao
  BEFORE DELETE ON public.riscos
  FOR EACH ROW EXECUTE FUNCTION public.fn_risco_protege_comunicacao();

REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_antes_de_inserir()        FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_exige_risco()             FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_risco_antes_de_inserir()  FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_risco_imutavel()          FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_risco_protege_comunicacao()           FROM public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Encerramento do alerta: AFTER INSERT (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
-- Comunicar o alerta é o que o encerra: grava a data (hoje) e a comunicação em
-- alertas_kri. É SECURITY DEFINER porque ninguém (nem o gestor) tem permissão
-- de escrever em alertas_kri. A tabela tem o próprio gatilho de auditoria, que
-- registra este UPDATE.
CREATE FUNCTION public.fn_comunicacao_encerra_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.alerta_id IS NOT NULL THEN
    UPDATE public.alertas_kri
       SET encerrado_em = public.fn_hoje(),
           comunicacao_id = NEW.id
     WHERE id = NEW.alerta_id
       AND encerrado_em IS NULL
       AND public.fn_alerta_na_unidade(NEW.alerta_id, NEW.unidade_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comunicacao_encerra_alerta
  AFTER INSERT ON public.comunicacoes_cgov
  FOR EACH ROW EXECUTE FUNCTION public.fn_comunicacao_encerra_alerta();

REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_imutavel()        FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_comunicacao_encerra_alerta()  FROM public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. RLS e permissões das tabelas
-- ----------------------------------------------------------------------------
-- Leitura: quem tem a unidade no alcance (AUDIT e CGOV enxergam todas).
-- Inserção: quem pode gravar na unidade (pode_escrever_unidade); a AUDIT nunca
-- envia (papel 'auditoria' é só leitura, mesmo na própria unidade).
-- Não há política de UPDATE nem de DELETE, e o privilégio também é revogado:
-- tentar alterar ou apagar dá "permission denied" (42501).
ALTER TABLE public.comunicacoes_cgov ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacoes_riscos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comunicações: leitura no alcance"
  ON public.comunicacoes_cgov FOR SELECT TO authenticated
  USING (unidade_id IN (SELECT public.unidades_visiveis()));

CREATE POLICY "Comunicações: envio na própria unidade"
  ON public.comunicacoes_cgov FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_unidade(unidade_id)
              AND (SELECT m.papel_governanca FROM public.meu_perfil() AS m) IS DISTINCT FROM 'auditoria');

-- As ligações seguem a comunicação-mãe (a subconsulta já passa pela RLS dela).
CREATE POLICY "Ligações da comunicação: leitura no alcance"
  ON public.comunicacoes_riscos FOR SELECT TO authenticated
  USING (comunicacao_id IN (SELECT c.id FROM public.comunicacoes_cgov AS c));

CREATE POLICY "Ligações da comunicação: envio na própria unidade"
  ON public.comunicacoes_riscos FOR INSERT TO authenticated
  WITH CHECK (comunicacao_id IN (
    SELECT c.id FROM public.comunicacoes_cgov AS c
     WHERE public.pode_escrever_unidade(c.unidade_id))
    AND (SELECT m.papel_governanca FROM public.meu_perfil() AS m) IS DISTINCT FROM 'auditoria');

REVOKE ALL ON public.comunicacoes_cgov   FROM anon, authenticated;
REVOKE ALL ON public.comunicacoes_riscos FROM anon, authenticated;
GRANT SELECT, INSERT ON public.comunicacoes_cgov   TO authenticated;
GRANT SELECT, INSERT ON public.comunicacoes_riscos TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Auditoria
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_comunicacoes_cgov
  AFTER INSERT OR UPDATE OR DELETE ON public.comunicacoes_cgov
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

CREATE TRIGGER trg_auditoria_comunicacoes_riscos
  AFTER INSERT OR UPDATE OR DELETE ON public.comunicacoes_riscos
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

-- ----------------------------------------------------------------------------
-- 7. enviar_comunicacao(p jsonb) → uuid   (SECURITY INVOKER: a RLS vale)
-- ----------------------------------------------------------------------------
-- Chaves de p: unidade_id, hipotese, data_ciencia, descricao, providencias,
--   documento_sei, supre (lista), alerta_id, risco_ids (lista de uuid).
-- Ex.: {"unidade_id": "...", "hipotese": "I", "data_ciencia": "2026-11-20",
--       "descricao": "...", "risco_ids": ["<uuid do risco>"]}
-- Regras:
--   - risco obrigatório nas hipóteses I, II, III, V e alerta_kri;
--   - com alerta_id: hipótese alerta_kri, alerta aberto, data_ciencia igual à
--     do alerta (o prazo corre desde a ciência do alerta);
--   - data_ciencia não pode ser futura (comparada com fn_hoje(), o dia de Brasília);
--   - os riscos são da unidade que comunica ou de subunidades INTERNAS dela;
--   - fora do prazo de 10 dias úteis GRAVA mesmo assim (o prazo é informação
--     que a visão mostra, não uma trava).
-- Tudo roda numa transação: se qualquer passo falha, nada fica gravado.
CREATE FUNCTION public.enviar_comunicacao(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_hip      text := p ->> 'hipotese';
  v_unidade  uuid := nullif(p ->> 'unidade_id', '')::uuid;
  v_ciencia  date := nullif(p ->> 'data_ciencia', '')::date;
  v_alerta   uuid := nullif(p ->> 'alerta_id', '')::uuid;
  v_riscos   uuid[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(
                               coalesce(p -> 'risco_ids', '[]'::jsonb))::uuid);
  v_supre    text[] := ARRAY(SELECT jsonb_array_elements_text(
                               coalesce(p -> 'supre', '[]'::jsonb)));
  v_al       public.alertas_kri%ROWTYPE;
  v_dentro   int;
  v_id       uuid;
BEGIN
  IF v_unidade IS NULL THEN
    RAISE EXCEPTION 'Informe a unidade que comunica';
  END IF;
  IF v_hip IS NULL OR v_hip NOT IN ('I', 'II', 'III', 'IV', 'V', 'VI', 'alerta_kri') THEN
    RAISE EXCEPTION 'Hipótese inválida: use I, II, III, IV, V, VI ou alerta_kri';
  END IF;
  IF v_ciencia IS NULL THEN
    RAISE EXCEPTION 'Informe a data de ciência';
  END IF;
  IF v_ciencia > public.fn_hoje() THEN
    RAISE EXCEPTION 'A data de ciência não pode ser futura';
  END IF;

  IF v_hip = 'alerta_kri' AND v_alerta IS NULL THEN
    RAISE EXCEPTION 'A comunicação de alerta de KRI exige o alerta';
  END IF;
  IF v_alerta IS NOT NULL THEN
    SELECT * INTO v_al FROM public.alertas_kri WHERE id = v_alerta;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alerta não encontrado';
    END IF;
    IF v_hip IS DISTINCT FROM 'alerta_kri' THEN
      RAISE EXCEPTION 'A comunicação de um alerta deve ter a hipótese alerta_kri';
    END IF;
    IF v_al.encerrado_em IS NOT NULL THEN
      RAISE EXCEPTION 'Este alerta já foi comunicado';
    END IF;
    IF NOT public.fn_alerta_na_unidade(v_alerta, v_unidade) THEN
      RAISE EXCEPTION 'O alerta não pertence à unidade que comunica';
    END IF;
    IF v_ciencia <> v_al.ciencia_em THEN
      RAISE EXCEPTION 'A data de ciência deve ser a do alerta';
    END IF;
  END IF;

  IF v_hip IN ('I', 'II', 'III', 'V', 'alerta_kri') AND cardinality(v_riscos) = 0 THEN
    RAISE EXCEPTION 'Informe o risco ligado';
  END IF;

  -- Só liga riscos da unidade que comunica (ou de subunidades internas) que a
  -- pessoa enxerga (a RLS de riscos filtra o resto).
  SELECT count(*) INTO v_dentro
    FROM public.riscos AS r
   WHERE r.id = ANY (v_riscos)
     AND public.fn_risco_na_unidade(r.id, v_unidade);
  IF v_dentro <> cardinality(v_riscos) THEN
    RAISE EXCEPTION 'Risco não encontrado ou fora da unidade que comunica';
  END IF;

  BEGIN
    INSERT INTO public.comunicacoes_cgov
      (unidade_id, hipotese, supre, data_ciencia, descricao, providencias,
       documento_sei, alerta_id)
    VALUES
      (v_unidade, v_hip, v_supre, v_ciencia, p ->> 'descricao', p ->> 'providencias',
       p ->> 'documento_sei', v_alerta)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- Corrida: dois envios do mesmo alerta ao mesmo tempo; a UNIQUE de
    -- alerta_id barrou o segundo. Mesma mensagem da checagem acima.
    RAISE EXCEPTION 'Este alerta já foi comunicado';
  END;

  INSERT INTO public.comunicacoes_riscos (comunicacao_id, risco_id)
  SELECT v_id, r FROM unnest(v_riscos) AS r;

  RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. registrar_ciencia_comunicacao(p_id, p_observacao)   (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
-- Só a CGOV. É DEFINER porque ninguém tem UPDATE na tabela; a regra de quem
-- pode está AQUI (papel_governanca = 'cgov'), e o EXECUTE fica liberado para
-- quem fez login. A ciência é dada uma vez só.
CREATE FUNCTION public.registrar_ciencia_comunicacao(p_id uuid, p_observacao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_papel text;
  v_ciente timestamptz;
BEGIN
  SELECT m.papel_governanca INTO v_papel
    FROM public.meu_perfil() AS m
   WHERE m.id IS NOT NULL;
  IF v_papel IS DISTINCT FROM 'cgov' THEN
    RAISE EXCEPTION 'Somente a CGOV registra a ciência da comunicação';
  END IF;

  SELECT c.ciencia_cgov_em INTO v_ciente
    FROM public.comunicacoes_cgov AS c WHERE c.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicação não encontrada';
  END IF;
  IF v_ciente IS NOT NULL THEN
    RAISE EXCEPTION 'A ciência desta comunicação já foi registrada';
  END IF;

  UPDATE public.comunicacoes_cgov
     SET ciencia_cgov_em = now(),
         ciencia_cgov_por = auth.uid(),
         observacao_cgov = p_observacao
   WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_comunicacao(jsonb)                       FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_ciencia_comunicacao(uuid, text)       FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.enviar_comunicacao(jsonb)                       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.registrar_ciencia_comunicacao(uuid, text)       TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. Visão comunicacoes_cgov_situacao
-- ----------------------------------------------------------------------------
--   prazo_dias_uteis = dias úteis entre a ciência e o envio;
--   no_prazo         = prazo_dias_uteis <= 10;
--   vence_em         = ciência + 10 dias úteis;
--   situacao         = 'nova' (CGOV ainda não deu ciência) ou 'ciencia_registrada'.
-- FUSO HORÁRIO: comunicada_em é timestamptz. Converter com ::date usa o fuso da
-- SESSÃO (no servidor, UTC): um envio às 22h de Brasília cairia no dia seguinte
-- e contaria um dia útil a mais. Por isso convertemos explicitamente para o
-- dia de Brasília: (comunicada_em AT TIME ZONE 'America/Sao_Paulo')::date.
-- security_invoker: a visão obedece à RLS de quem consulta.
CREATE VIEW public.comunicacoes_cgov_situacao
WITH (security_invoker = true) AS
SELECT c.*,
       d.prazo_dias_uteis,
       (d.prazo_dias_uteis <= 10) AS no_prazo,
       public.fn_somar_dias_uteis(c.data_ciencia, 10) AS vence_em,
       CASE WHEN c.ciencia_cgov_em IS NULL THEN 'nova' ELSE 'ciencia_registrada' END AS situacao
  FROM public.comunicacoes_cgov AS c
 CROSS JOIN LATERAL (
   SELECT public.fn_dias_uteis_entre(
            c.data_ciencia,
            (c.comunicada_em AT TIME ZONE 'America/Sao_Paulo')::date) AS prazo_dias_uteis
 ) AS d;

REVOKE ALL ON public.comunicacoes_cgov_situacao FROM anon, authenticated;
GRANT SELECT ON public.comunicacoes_cgov_situacao TO authenticated;
