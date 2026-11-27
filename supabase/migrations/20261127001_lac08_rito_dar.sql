-- ============================================================================
-- LAC-08 — O RITO DA DAR NO BANCO (migração 20261127001)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Até aqui a CGOV gravava o apetite da DAR direto em `categorias_risco`, e ele
-- valia na hora. Pela Política (minuta SEI 024241420) e pela Metodologia
-- (minuta SEI 024421455), o caminho é outro:
--
--   1. a CGOV elabora a MINUTA da DAR;
--   2. o CTGRIC se manifesta (favorável, com ressalvas ou desfavorável);
--      com ressalvas, a CGOV incorpora as ressalvas e encaminha ao CIG;
--   3. o CIG delibera (aprova ou reprova; reprovada, a minuta volta à CGOV);
--   4. o Presidente publica a PORTARIA. Só aí o apetite passa a valer.
--
-- Esta migração faz do rito o ÚNICO jeito de mudar o apetite:
--   Seção 1 — as quatro tabelas do rito;
--   Seção 2 — a visão `dar_situacao` (a etapa, as datas e o prazo);
--   Seção 3 — RLS: todos com perfil ativo leem; ninguém grava direto; e o fim
--             do UPDATE direto em `categorias_risco`;
--   Seção 4 — as RPCs da minuta, do CTGRIC e do CIG;
--   Seção 5 — as RPCs da portaria e da retificação;
--   Seção 6 — a conversão dos apetites gravados sem portaria.
--
-- O que NÃO muda: os Quadros 6, 7 e 8, o gatilho de cálculo do risco e o
-- gatilho `trg_categorias_dar_reavalia_aprovados`, que continua reavaliando os
-- riscos aprovados quando o apetite muda (agora, só dentro da RPC da portaria).
--
-- Desenho: docs/superpowers/specs/2026-11-27-lac08-rito-dar-design.md
-- ============================================================================


-- ============================================================================
-- SEÇÃO 1 — Tabelas do rito
-- ============================================================================

-- 1.1 dar_minutas: uma linha por rodada do rito.
-- `numero` é o "nº da minuta" que a tela mostra (minuta nº 1, nº 2...).
-- Etapas, na ordem:
--   minuta → no_ctgric → (ressalvas →) no_cig → aprovada_cig → publicada
-- Ex.: CTGRIC "com ressalvas" leva a `ressalvas`; "favorável" ou
-- "desfavorável" leva direto a `no_cig` (o CIG decide mesmo assim).
CREATE TABLE public.dar_minutas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  etapa       text NOT NULL DEFAULT 'minuta'
                CONSTRAINT dar_minutas_etapa_check
                CHECK (etapa IN ('minuta', 'no_ctgric', 'ressalvas', 'no_cig', 'aprovada_cig', 'publicada')),
  criada_em   timestamptz NOT NULL DEFAULT now(),
  criada_por  uuid DEFAULT auth.uid()
);
COMMENT ON TABLE public.dar_minutas IS
  'LAC-08: uma rodada do rito da DAR (minuta → CTGRIC → CIG → portaria). Só muda pelas RPCs.';

-- Só UMA minuta fora de "publicada" por vez. O índice é "parcial" (WHERE) e
-- a chave é a constante `true`: duas linhas em andamento teriam a mesma chave
-- e a segunda é recusada (erro 23505).
CREATE UNIQUE INDEX dar_minutas_uma_em_andamento
  ON public.dar_minutas ((true))
  WHERE etapa <> 'publicada';

-- 1.2 dar_minuta_categorias: o apetite PROPOSTO de cada categoria do Quadro 2.
-- O vigente continua em `categorias_risco`; a minuta fica separada (RF-092).
CREATE TABLE public.dar_minuta_categorias (
  minuta_id         uuid NOT NULL REFERENCES public.dar_minutas(id),
  categoria_id      integer NOT NULL REFERENCES public.categorias_risco(id),
  apetite_proposto  text NOT NULL
                      CONSTRAINT dar_minuta_categorias_apetite_check
                      CHECK (apetite_proposto IN ('baixo', 'moderado', 'pendente_dar')),
  justificativa     text,
  PRIMARY KEY (minuta_id, categoria_id)
);
COMMENT ON TABLE public.dar_minuta_categorias IS
  'LAC-08: apetite proposto por categoria na minuta da DAR. Só muda nas etapas minuta e ressalvas, pela RPC.';

-- 1.3 dar_rito_eventos: o histórico do rito (IMUTÁVEL).
-- `id` é um contador: dá a ordem exata dos eventos, mesmo quando dois são
-- gravados na mesma transação (o now() seria igual).
-- `antes`/`depois` e `motivo` só existem na retificação da portaria.
CREATE TABLE public.dar_rito_eventos (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  minuta_id       uuid NOT NULL REFERENCES public.dar_minutas(id),
  tipo            text NOT NULL
                    CONSTRAINT dar_rito_eventos_tipo_check
                    CHECK (tipo IN ('encaminhada_ctgric', 'manifestacao_ctgric', 'encaminhada_cig',
                                    'deliberacao_cig', 'portaria_registrada', 'portaria_retificada')),
  data_evento     date NOT NULL
                    CONSTRAINT dar_rito_eventos_data_finita
                    CHECK (isfinite(data_evento) AND data_evento >= date '2000-01-01'),
  resultado       text,
  observacao      text,
  antes           jsonb,
  depois          jsonb,
  motivo          text,
  registrado_por  uuid DEFAULT auth.uid(),
  registrado_em   timestamptz NOT NULL DEFAULT now(),
  -- O resultado só existe na manifestação do CTGRIC e na deliberação do CIG,
  -- e cada um tem a sua lista.
  CONSTRAINT dar_rito_eventos_resultado_check CHECK (
    CASE tipo
      WHEN 'manifestacao_ctgric' THEN resultado IN ('favoravel', 'com_ressalvas', 'desfavoravel')
      WHEN 'deliberacao_cig'     THEN resultado IN ('aprovada', 'reprovada')
      ELSE resultado IS NULL
    END),
  -- A retificação guarda o antes, o depois e o motivo; os outros não.
  CONSTRAINT dar_rito_eventos_retificacao_check CHECK (
    CASE tipo
      WHEN 'portaria_retificada' THEN antes IS NOT NULL AND depois IS NOT NULL
                                      AND motivo IS NOT NULL AND btrim(motivo) <> ''
      ELSE antes IS NULL AND depois IS NULL AND motivo IS NULL
    END)
);
COMMENT ON TABLE public.dar_rito_eventos IS
  'LAC-08: histórico imutável do rito da DAR (encaminhamentos, CTGRIC, CIG, portaria e retificações).';

-- 1.4 dar_portarias: a portaria de cada minuta publicada.
-- Só a RPC de retificação a altera, e cada mudança vira um evento
-- `portaria_retificada` com o antes e o depois.
CREATE TABLE public.dar_portarias (
  minuta_id        uuid PRIMARY KEY REFERENCES public.dar_minutas(id),
  numero           text NOT NULL
                     CONSTRAINT dar_portarias_numero_preenchido CHECK (btrim(numero) <> ''),
  data_publicacao  date NOT NULL
                     CONSTRAINT dar_portarias_data_finita
                     CHECK (isfinite(data_publicacao) AND data_publicacao >= date '2000-01-01'),
  link             text,
  registrada_em    timestamptz NOT NULL DEFAULT now(),
  registrada_por   uuid DEFAULT auth.uid()
);
COMMENT ON TABLE public.dar_portarias IS
  'LAC-08: a portaria do Presidente que publica a DAR. Só a RPC de retificação a altera.';

-- 1.5 Imutabilidade, até para o dono do banco.
-- Evento do rito: nem UPDATE nem DELETE (como em comunicacoes_cgov).
CREATE FUNCTION public.fn_dar_evento_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'RADAR: o histórico do rito da DAR é imutável (não se altera nem se apaga).';
END;
$$;
CREATE TRIGGER trg_dar_evento_imutavel
  BEFORE UPDATE OR DELETE ON public.dar_rito_eventos
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_evento_imutavel();

-- Minuta, categorias da minuta e portaria: podem mudar (pelas RPCs), mas
-- nunca ser apagadas. Apagar o registro do rito é "fracasso" no desenho (§2).
CREATE FUNCTION public.fn_dar_sem_apagar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'RADAR: o registro do rito da DAR não pode ser apagado.';
END;
$$;
CREATE TRIGGER trg_dar_minutas_sem_apagar
  BEFORE DELETE ON public.dar_minutas
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_sem_apagar();
CREATE TRIGGER trg_dar_minuta_categorias_sem_apagar
  BEFORE DELETE ON public.dar_minuta_categorias
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_sem_apagar();
CREATE TRIGGER trg_dar_portarias_sem_apagar
  BEFORE DELETE ON public.dar_portarias
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_sem_apagar();

REVOKE EXECUTE ON FUNCTION public.fn_dar_evento_imutavel() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dar_sem_apagar()      FROM public, anon, authenticated;


-- ============================================================================
-- SEÇÃO 2 — Visão dar_situacao
-- ============================================================================
-- Uma linha: a minuta EM ANDAMENTO ou, se não houver, a ÚLTIMA PUBLICADA.
-- Traz a etapa, a data de cada passo da rodada atual, a portaria desta minuta
-- e a portaria VIGENTE (a da última minuta publicada, que é o que vale hoje).
--
-- "Rodada atual": se o CIG reprovou a minuta, ela volta à etapa `minuta` e o
-- rito recomeça. As datas mostradas são só as dos eventos DEPOIS da última
-- reprovação (o histórico completo continua em dar_rito_eventos).
--
-- Prazo (RF-195, em parte; decisão de 2026-11-23): só a etapa `ressalvas` tem
-- contador. dia_prazo = dias úteis desde a manifestação do CTGRIC até hoje
-- (Brasília); dentro_prazo = dia_prazo <= 10. Ex.: manifestação numa
-- segunda-feira, hoje na segunda seguinte → dia 5 de 10, dentro do prazo.
--
-- security_invoker: a visão lê as tabelas com os direitos de QUEM CONSULTA
-- (a RLS das tabelas vale aqui também).
CREATE VIEW public.dar_situacao
WITH (security_invoker = true) AS
WITH alvo AS (
  SELECT m.*
    FROM public.dar_minutas AS m
   ORDER BY (m.etapa <> 'publicada') DESC, m.numero DESC
   LIMIT 1
),
rodada AS (
  -- id do último evento de reprovação pelo CIG (0 se não houve).
  SELECT a.id AS minuta_id,
         coalesce(max(e.id) FILTER (WHERE e.tipo = 'deliberacao_cig' AND e.resultado = 'reprovada'), 0) AS desde
    FROM alvo AS a
    LEFT JOIN public.dar_rito_eventos AS e ON e.minuta_id = a.id
   GROUP BY a.id
),
ev AS (
  SELECT e.*
    FROM public.dar_rito_eventos AS e
    JOIN rodada AS r ON r.minuta_id = e.minuta_id AND e.id > r.desde
),
passos AS (
  SELECT
    (SELECT ev.data_evento FROM ev WHERE ev.tipo = 'encaminhada_ctgric'  ORDER BY ev.id DESC LIMIT 1) AS data_encaminhada_ctgric,
    (SELECT ev.data_evento FROM ev WHERE ev.tipo = 'manifestacao_ctgric' ORDER BY ev.id DESC LIMIT 1) AS data_manifestacao_ctgric,
    (SELECT ev.resultado   FROM ev WHERE ev.tipo = 'manifestacao_ctgric' ORDER BY ev.id DESC LIMIT 1) AS resultado_ctgric,
    (SELECT ev.data_evento FROM ev WHERE ev.tipo = 'encaminhada_cig'     ORDER BY ev.id DESC LIMIT 1) AS data_encaminhada_cig,
    (SELECT ev.data_evento FROM ev WHERE ev.tipo = 'deliberacao_cig'     ORDER BY ev.id DESC LIMIT 1) AS data_deliberacao_cig,
    (SELECT ev.resultado   FROM ev WHERE ev.tipo = 'deliberacao_cig'     ORDER BY ev.id DESC LIMIT 1) AS resultado_cig
),
vigente AS (
  SELECT p.numero, p.data_publicacao, p.link
    FROM public.dar_portarias AS p
    JOIN public.dar_minutas AS m ON m.id = p.minuta_id
   ORDER BY m.numero DESC
   LIMIT 1
)
SELECT a.id                        AS minuta_id,
       a.numero                    AS minuta_numero,
       a.etapa,
       ps.data_encaminhada_ctgric,
       ps.data_manifestacao_ctgric,
       ps.resultado_ctgric,
       ps.data_encaminhada_cig,
       ps.data_deliberacao_cig,
       ps.resultado_cig,
       p.numero                    AS portaria_numero,
       p.data_publicacao           AS portaria_data,
       p.link                      AS portaria_link,
       CASE WHEN a.etapa = 'ressalvas' AND ps.data_manifestacao_ctgric IS NOT NULL
            THEN public.fn_dias_uteis_entre(ps.data_manifestacao_ctgric, public.fn_hoje())
       END                         AS dia_prazo,
       CASE WHEN a.etapa = 'ressalvas' AND ps.data_manifestacao_ctgric IS NOT NULL
            THEN public.fn_dias_uteis_entre(ps.data_manifestacao_ctgric, public.fn_hoje()) <= 10
       END                         AS dentro_prazo,
       v.numero                    AS portaria_vigente_numero,
       v.data_publicacao           AS portaria_vigente_data,
       v.link                      AS portaria_vigente_link
  FROM alvo AS a
 CROSS JOIN passos AS ps
  LEFT JOIN public.dar_portarias AS p ON p.minuta_id = a.id
  LEFT JOIN vigente AS v ON true;

COMMENT ON VIEW public.dar_situacao IS
  'LAC-08: a minuta da DAR em andamento (ou a última publicada), com as datas do rito, a portaria e o prazo das ressalvas.';


-- ============================================================================
-- SEÇÃO 3 — RLS e permissões
-- ============================================================================
-- Todos com perfil ativo leem; ninguém grava direto (nem a CGOV): tudo passa
-- pelas RPCs SECURITY DEFINER das seções 4 e 5, que rodam como dono.
ALTER TABLE public.dar_minutas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dar_minuta_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dar_rito_eventos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dar_portarias         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DAR minutas: leitura por quem tem perfil ativo"
  ON public.dar_minutas FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);
CREATE POLICY "DAR categorias da minuta: leitura por quem tem perfil ativo"
  ON public.dar_minuta_categorias FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);
CREATE POLICY "DAR eventos do rito: leitura por quem tem perfil ativo"
  ON public.dar_rito_eventos FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);
CREATE POLICY "DAR portarias: leitura por quem tem perfil ativo"
  ON public.dar_portarias FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);

-- O padrão do Supabase dá privilégios a `anon` e `authenticated` em toda
-- tabela nova: tiramos tudo e devolvemos só a leitura.
REVOKE ALL ON public.dar_minutas, public.dar_minuta_categorias,
              public.dar_rito_eventos, public.dar_portarias, public.dar_situacao
  FROM anon, authenticated;
GRANT SELECT ON public.dar_minutas, public.dar_minuta_categorias,
                public.dar_rito_eventos, public.dar_portarias, public.dar_situacao
  TO authenticated;

-- O fim da gravação direta do apetite.
-- Antes, a política "Categorias: CGOV altera" deixava a CGOV mudar o apetite
-- pela API, e ele valia na hora. Agora nem a CGOV grava em categorias_risco:
-- o apetite e a justificativa só mudam dentro de registrar_portaria_dar.
-- INSERT e DELETE também saem: apagar uma categoria e recriá-la com outro
-- apetite seria um atalho sem portaria. (As 8 categorias do Quadro 2 já estão
-- gravadas; o importador e a semente rodam como dono e não dependem disto.)
-- Ex.: cgov@ tenta `update categorias_risco set apetite_declarado = 'baixo'`
--      → erro 42501 (sem permissão), e nenhum risco é reavaliado.
DROP POLICY IF EXISTS "Categorias: CGOV cria"   ON public.categorias_risco;
DROP POLICY IF EXISTS "Categorias: CGOV altera" ON public.categorias_risco;
DROP POLICY IF EXISTS "Categorias: CGOV apaga"  ON public.categorias_risco;
REVOKE INSERT, UPDATE, DELETE ON public.categorias_risco FROM anon, authenticated;


-- ============================================================================
-- SEÇÃO 4 — RPCs da minuta, do CTGRIC e do CIG
-- ============================================================================
-- Todas seguem o mesmo molde (como as da LAC-04):
--   * SECURITY DEFINER: rodam como dono, porque ninguém logado grava direto
--     nas tabelas do rito (Seção 3);
--   * SET search_path = '': todo nome vem com o esquema (public.…), para
--     ninguém "trocar" uma tabela por outra de mesmo nome;
--   * 1º a checagem de CGOV (erro 42501), SÓ DEPOIS a etapa: quem não é CGOV
--     não descobre em que etapa a minuta está;
--   * FOR UPDATE na minuta: dois cliques ao mesmo tempo esperam um pelo
--     outro, e o segundo já vê a etapa nova (e é recusado com mensagem clara);
--   * mensagens "RADAR: …" em português (o front mostra o texto sem o prefixo).
--
-- Códigos de erro usados:
--   42501 (insufficient_privilege)            → não é a CGOV;
--   55000 (object_not_in_prerequisite_state)  → etapa errada;
--   22023 (invalid_parameter_value)           → valor ou data inválidos;
--   P0002 (no_data_found)                     → não há minuta em andamento.

-- 4.1 Ajudantes internos (ninguém logado os chama direto).

-- fn_dar_exigir_cgov(): para tudo se quem chama não é a CGOV com perfil ativo.
CREATE FUNCTION public.fn_dar_exigir_cgov()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT coalesce((SELECT m.papel_governanca FROM public.meu_perfil() AS m WHERE m.id IS NOT NULL) = 'cgov', false) THEN
    RAISE EXCEPTION 'RADAR: somente a CGOV registra o rito da DAR.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- fn_dar_etapa_legivel(etapa): o nome da etapa para as mensagens.
-- Ex.: 'no_ctgric' → 'no CTGRIC'.
CREATE FUNCTION public.fn_dar_etapa_legivel(p_etapa text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_etapa
    WHEN 'minuta'       THEN 'minuta'
    WHEN 'no_ctgric'    THEN 'no CTGRIC'
    WHEN 'ressalvas'    THEN 'incorporação das ressalvas'
    WHEN 'no_cig'       THEN 'no CIG'
    WHEN 'aprovada_cig' THEN 'aprovada pelo CIG'
    WHEN 'publicada'    THEN 'publicada'
    ELSE p_etapa
  END;
$$;

-- fn_dar_conferir_data(minuta, data, rótulo): a data do passo precisa existir,
-- não pode ser futura (hoje em Brasília, fn_hoje()) nem anterior à do passo
-- anterior desta minuta (o maior data_evento já gravado nela).
-- Ex.: CIG deliberou em 10/03; portaria de 05/03 → recusada.
CREATE FUNCTION public.fn_dar_conferir_data(p_minuta uuid, p_data date, p_rotulo text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_anterior date;
BEGIN
  IF p_data IS NULL THEN
    RAISE EXCEPTION 'RADAR: informe a data %.', p_rotulo
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT isfinite(p_data) OR p_data < date '2000-01-01' THEN
    RAISE EXCEPTION 'RADAR: a data % é inválida.', p_rotulo
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_data > public.fn_hoje() THEN
    RAISE EXCEPTION 'RADAR: a data % não pode ser futura.', p_rotulo
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT max(e.data_evento) INTO v_anterior
    FROM public.dar_rito_eventos AS e
   WHERE e.minuta_id = p_minuta
     AND e.tipo <> 'portaria_retificada';
  IF v_anterior IS NOT NULL AND p_data < v_anterior THEN
    RAISE EXCEPTION 'RADAR: a data % não pode ser anterior à do passo anterior (%).',
      p_rotulo, to_char(v_anterior, 'DD/MM/YYYY')
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
END;
$$;

-- fn_dar_minuta_em_andamento(): a minuta fora de "publicada", travada
-- (FOR UPDATE) até o fim da transação. Sem minuta em andamento → erro.
CREATE FUNCTION public.fn_dar_minuta_em_andamento()
RETURNS public.dar_minutas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m public.dar_minutas;
BEGIN
  SELECT m.* INTO v_m
    FROM public.dar_minutas AS m
   WHERE m.etapa <> 'publicada'
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: não há minuta da DAR em andamento.'
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v_m;
END;
$$;

-- fn_dar_exigir_etapa(minuta, etapa esperada, ação): recusa a etapa errada.
-- Ex.: encaminhar ao CTGRIC com a minuta "no CIG" →
--   'RADAR: não é possível encaminhar ao CTGRIC: a minuta está na etapa "no CIG".'
CREATE FUNCTION public.fn_dar_exigir_etapa(p_m public.dar_minutas, p_etapa text, p_acao text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_m.etapa IS DISTINCT FROM p_etapa THEN
    RAISE EXCEPTION 'RADAR: não é possível %: a minuta está na etapa "%".',
      p_acao, public.fn_dar_etapa_legivel(p_m.etapa)
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_dar_exigir_cgov()                                FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dar_etapa_legivel(text)                          FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dar_conferir_data(uuid, date, text)              FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dar_minuta_em_andamento()                        FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_dar_exigir_etapa(public.dar_minutas, text, text) FROM public, anon, authenticated;

-- 4.2 salvar_minuta_dar(p): cria a minuta (se não houver) ou atualiza a que
-- está em andamento. Só nas etapas "minuta" e "ressalvas".
-- p = {"categorias": [{"categoria_id": 2, "apetite_proposto": "baixo",
--                      "justificativa": "..."}, ...]}
-- Na 1ª vez, a minuta nasce com as 8 categorias copiadas do VIGENTE; depois,
-- só as categorias enviadas mudam. Devolve o id da minuta.
-- Ex.: salvar_minuta_dar('{"categorias": [{"categoria_id": 2,
--        "apetite_proposto": "baixo", "justificativa": "Proposta."}]}')
--      → a minuta passa a propor "baixo" para Operacional; o vigente não muda.
CREATE FUNCTION public.salvar_minuta_dar(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m     public.dar_minutas;
  v_item  jsonb;
  v_cat   integer;
  v_ap    text;
BEGIN
  PERFORM public.fn_dar_exigir_cgov();

  IF p IS NULL OR jsonb_typeof(p -> 'categorias') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'RADAR: envie a lista de categorias da minuta.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT m.* INTO v_m
    FROM public.dar_minutas AS m
   WHERE m.etapa <> 'publicada'
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Não há minuta em andamento: abre a próxima, partindo do vigente.
    -- (Dois cliques ao mesmo tempo: o índice único recusa a 2ª.)
    BEGIN
      INSERT INTO public.dar_minutas (etapa) VALUES ('minuta') RETURNING * INTO v_m;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'RADAR: outra minuta da DAR acabou de ser aberta. Atualize a página.'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END;
    INSERT INTO public.dar_minuta_categorias (minuta_id, categoria_id, apetite_proposto, justificativa)
    SELECT v_m.id, c.id, c.apetite_declarado, c.justificativa_dar
      FROM public.categorias_risco AS c;
  ELSIF v_m.etapa = 'no_ctgric' THEN
    RAISE EXCEPTION 'RADAR: A minuta foi encaminhada ao CTGRIC e está só para leitura.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  ELSIF v_m.etapa = 'no_cig' THEN
    RAISE EXCEPTION 'RADAR: A minuta foi encaminhada ao CIG e está só para leitura.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  ELSIF v_m.etapa = 'aprovada_cig' THEN
    RAISE EXCEPTION 'RADAR: A minuta foi aprovada pelo CIG e aguarda a portaria; está só para leitura.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p -> 'categorias') LOOP
    v_cat := CASE WHEN jsonb_typeof(v_item -> 'categoria_id') = 'number'
                  THEN (v_item ->> 'categoria_id')::numeric::integer END;
    v_ap  := v_item ->> 'apetite_proposto';
    IF v_cat IS NULL OR NOT EXISTS (SELECT 1 FROM public.categorias_risco AS c WHERE c.id = v_cat) THEN
      RAISE EXCEPTION 'RADAR: a categoria % não está no Quadro 2.', coalesce(v_item ->> 'categoria_id', '(vazia)')
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF v_ap IS NULL OR v_ap NOT IN ('baixo', 'moderado', 'pendente_dar') THEN
      RAISE EXCEPTION 'RADAR: apetite proposto inválido: use baixo, moderado ou pendente_dar.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    INSERT INTO public.dar_minuta_categorias (minuta_id, categoria_id, apetite_proposto, justificativa)
    VALUES (v_m.id, v_cat, v_ap, nullif(btrim(coalesce(v_item ->> 'justificativa', '')), ''))
    ON CONFLICT (minuta_id, categoria_id) DO UPDATE
      SET apetite_proposto = EXCLUDED.apetite_proposto,
          justificativa    = EXCLUDED.justificativa;
  END LOOP;

  RETURN v_m.id;
END;
$$;

-- 4.3 encaminhar_minuta_dar_ctgric(data): minuta → no_ctgric.
CREATE FUNCTION public.encaminhar_minuta_dar_ctgric(p_data date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m public.dar_minutas;
BEGIN
  PERFORM public.fn_dar_exigir_cgov();
  v_m := public.fn_dar_minuta_em_andamento();
  PERFORM public.fn_dar_exigir_etapa(v_m, 'minuta', 'encaminhar ao CTGRIC');
  PERFORM public.fn_dar_conferir_data(v_m.id, p_data, 'do encaminhamento ao CTGRIC');
  INSERT INTO public.dar_rito_eventos (minuta_id, tipo, data_evento)
  VALUES (v_m.id, 'encaminhada_ctgric', p_data);
  UPDATE public.dar_minutas SET etapa = 'no_ctgric' WHERE id = v_m.id;
END;
$$;

-- 4.4 registrar_manifestacao_ctgric_dar(resultado, data, observação):
-- no_ctgric → ressalvas (com ressalvas) ou no_cig (favorável/desfavorável;
-- o CIG decide mesmo com manifestação desfavorável).
CREATE FUNCTION public.registrar_manifestacao_ctgric_dar(p_resultado text, p_data date, p_observacao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m public.dar_minutas;
BEGIN
  PERFORM public.fn_dar_exigir_cgov();
  v_m := public.fn_dar_minuta_em_andamento();
  PERFORM public.fn_dar_exigir_etapa(v_m, 'no_ctgric', 'registrar a manifestação do CTGRIC');
  IF p_resultado IS NULL OR p_resultado NOT IN ('favoravel', 'com_ressalvas', 'desfavoravel') THEN
    RAISE EXCEPTION 'RADAR: resultado do CTGRIC inválido: use favoravel, com_ressalvas ou desfavoravel.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  PERFORM public.fn_dar_conferir_data(v_m.id, p_data, 'da manifestação do CTGRIC');
  INSERT INTO public.dar_rito_eventos (minuta_id, tipo, data_evento, resultado, observacao)
  VALUES (v_m.id, 'manifestacao_ctgric', p_data, p_resultado, nullif(btrim(coalesce(p_observacao, '')), ''));
  UPDATE public.dar_minutas
     SET etapa = CASE WHEN p_resultado = 'com_ressalvas' THEN 'ressalvas' ELSE 'no_cig' END
   WHERE id = v_m.id;
END;
$$;

-- 4.5 encaminhar_minuta_dar_cig(data): ressalvas → no_cig (depois de
-- incorporar as ressalvas do CTGRIC).
CREATE FUNCTION public.encaminhar_minuta_dar_cig(p_data date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m public.dar_minutas;
BEGIN
  PERFORM public.fn_dar_exigir_cgov();
  v_m := public.fn_dar_minuta_em_andamento();
  PERFORM public.fn_dar_exigir_etapa(v_m, 'ressalvas', 'encaminhar ao CIG');
  PERFORM public.fn_dar_conferir_data(v_m.id, p_data, 'do encaminhamento ao CIG');
  INSERT INTO public.dar_rito_eventos (minuta_id, tipo, data_evento)
  VALUES (v_m.id, 'encaminhada_cig', p_data);
  UPDATE public.dar_minutas SET etapa = 'no_cig' WHERE id = v_m.id;
END;
$$;

-- 4.6 registrar_deliberacao_cig_dar(resultado, data, observação):
-- no_cig → aprovada_cig; reprovada → volta a "minuta" (a CGOV ajusta; o
-- ajuste em 30 dias da F3.13 não tem contador, decisão de 2026-11-23).
CREATE FUNCTION public.registrar_deliberacao_cig_dar(p_resultado text, p_data date, p_observacao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_m public.dar_minutas;
BEGIN
  PERFORM public.fn_dar_exigir_cgov();
  v_m := public.fn_dar_minuta_em_andamento();
  PERFORM public.fn_dar_exigir_etapa(v_m, 'no_cig', 'registrar a deliberação do CIG');
  IF p_resultado IS NULL OR p_resultado NOT IN ('aprovada', 'reprovada') THEN
    RAISE EXCEPTION 'RADAR: resultado do CIG inválido: use aprovada ou reprovada.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  PERFORM public.fn_dar_conferir_data(v_m.id, p_data, 'da deliberação do CIG');
  INSERT INTO public.dar_rito_eventos (minuta_id, tipo, data_evento, resultado, observacao)
  VALUES (v_m.id, 'deliberacao_cig', p_data, p_resultado, nullif(btrim(coalesce(p_observacao, '')), ''));
  UPDATE public.dar_minutas
     SET etapa = CASE WHEN p_resultado = 'aprovada' THEN 'aprovada_cig' ELSE 'minuta' END
   WHERE id = v_m.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.salvar_minuta_dar(jsonb)                              FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.encaminhar_minuta_dar_ctgric(date)                    FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_manifestacao_ctgric_dar(text, date, text)   FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.encaminhar_minuta_dar_cig(date)                       FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_deliberacao_cig_dar(text, date, text)       FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.salvar_minuta_dar(jsonb)                              TO authenticated;
GRANT  EXECUTE ON FUNCTION public.encaminhar_minuta_dar_ctgric(date)                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.registrar_manifestacao_ctgric_dar(text, date, text)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.encaminhar_minuta_dar_cig(date)                       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.registrar_deliberacao_cig_dar(text, date, text)       TO authenticated;
