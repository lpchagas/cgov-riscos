-- ============================================================================
-- LAC-03 (3ª migração) — alerta do KRI: limite numérico, abertura e prazos
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Esta migração é montada por SEÇÕES, uma por tarefa do plano
-- (docs/superpowers/specs/2026-11-23-alerta-kri-comunicacoes-design.md, seção 4):
--   Seção 1: feriados e dias úteis;
--   Seção 2: limite e leitura numéricos, com conversão do texto antigo;
--   Seções 3 e 4: acrescentadas pelas tarefas seguintes.
-- ============================================================================

-- ============================================================================
-- SEÇÃO 1 — Feriados e dias úteis
-- ============================================================================
-- Os prazos do alerta do KRI são contados em DIAS ÚTEIS (segunda a sexta que
-- não sejam feriado). Por isso o banco precisa saber os feriados.
-- A tabela é pequena e editável pela CGOV (um feriado novo, como um "ponto
-- facultativo" decretado, entra com um INSERT, sem nova migração).

CREATE TABLE public.feriados (
  data date PRIMARY KEY,        -- o dia do feriado (uma linha por dia)
  nome text NOT NULL            -- ex.: 'Confraternização Universal'
);

COMMENT ON TABLE public.feriados IS
  'Feriados nacionais (e pontos facultativos) que não contam como dia útil nos prazos do alerta do KRI.';

-- RLS: quem está logado lê; só a CGOV grava (mesmo padrão de categorias_risco).
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feriados: leitura por quem está logado"
  ON public.feriados FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Feriados: CGOV cria"
  ON public.feriados FOR INSERT TO authenticated
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Feriados: CGOV altera"
  ON public.feriados FOR UPDATE TO authenticated
  USING      (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false))
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Feriados: CGOV apaga"
  ON public.feriados FOR DELETE TO authenticated
  USING (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;

-- Auditoria: quem mexeu na lista de feriados fica na trilha (como na DAR).
-- A tabela não tem coluna `id`: a função de auditoria grava registro_id nulo.
CREATE TRIGGER trg_auditoria_feriados
  AFTER INSERT OR UPDATE OR DELETE ON public.feriados
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

-- Semente 2026–2027. Fixos de cada ano: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11,
-- 15/11, 20/11 e 25/12. Móveis (Carnaval segunda e terça, Sexta-feira da
-- Paixão e Corpus Christi) entram ano a ano.
INSERT INTO public.feriados (data, nome) VALUES
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval (segunda-feira)'),
  ('2026-02-17', 'Carnaval (terça-feira)'),
  ('2026-04-03', 'Sexta-feira da Paixão'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Dia da Consciência Negra'),
  ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternização Universal'),
  ('2027-02-08', 'Carnaval (segunda-feira)'),
  ('2027-02-09', 'Carnaval (terça-feira)'),
  ('2027-03-26', 'Sexta-feira da Paixão'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'),
  ('2027-05-27', 'Corpus Christi'),
  ('2027-09-07', 'Independência do Brasil'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Dia da Consciência Negra'),
  ('2027-12-25', 'Natal');

-- fn_somar_dias_uteis(d, n): o n-ésimo dia útil DEPOIS de d.
-- Exemplos: (sexta, 1) = segunda seguinte (se não for feriado);
--           ('2026-11-21' sábado, 10) = '2026-12-04'.
-- n <= 0 devolve a própria data. STABLE: lê a tabela, mas não grava nada.
-- STRICT: se d ou n for nulo, o resultado é nulo (sem STRICT, d nulo faria o
-- laço rodar para sempre).
CREATE FUNCTION public.fn_somar_dias_uteis(d date, n integer)
RETURNS date
LANGUAGE plpgsql
STABLE
STRICT
SET search_path = ''
AS $$
DECLARE
  v_dia  date := d;
  v_feitos integer := 0;
BEGIN
  WHILE v_feitos < n LOOP
    v_dia := v_dia + 1;
    -- extract(isodow): 1 = segunda ... 6 = sábado, 7 = domingo.
    IF extract(isodow FROM v_dia) < 6
       AND NOT EXISTS (SELECT 1 FROM public.feriados f WHERE f.data = v_dia) THEN
      v_feitos := v_feitos + 1;
    END IF;
  END LOOP;
  RETURN v_dia;
END;
$$;

-- fn_dias_uteis_entre(inicio, fim): dias úteis em (inicio, fim], ou seja,
-- NÃO conta o dia de início e conta o dia final. Devolve 0 se fim <= inicio.
-- Exemplo: ('2026-11-19', '2026-11-23') = 1 (20 é feriado; 21 e 22, fim de semana).
-- STRICT: com data nula, o resultado é nulo. A série usa inteiros (inicio + g)
-- para não depender do fuso horário da sessão.
CREATE FUNCTION public.fn_dias_uteis_entre(inicio date, fim date)
RETURNS integer
LANGUAGE sql
STABLE
STRICT
SET search_path = ''
AS $$
  SELECT count(*)::integer
    FROM generate_series(1, fim - inicio) AS g(n)
   WHERE extract(isodow FROM inicio + g.n) < 6
     AND NOT EXISTS (SELECT 1 FROM public.feriados f WHERE f.data = inicio + g.n);
$$;

REVOKE EXECUTE ON FUNCTION public.fn_somar_dias_uteis(date, integer) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_somar_dias_uteis(date, integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_dias_uteis_entre(date, date) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_dias_uteis_entre(date, date) TO authenticated, service_role;

-- fn_hoje(): "hoje" no calendário de BRASÍLIA.
-- Por que existe? O servidor roda com o relógio em UTC. current_date devolve o
-- dia em UTC: às 22h de Brasília ele já é o dia SEGUINTE, e a ciência do alerta
-- (início do prazo de 10 dias úteis) sairia com um dia a mais. fn_hoje() converte
-- o instante atual para o fuso America/Sao_Paulo antes de tirar a data, e não
-- depende do TimeZone da sessão. Use SEMPRE fn_hoje() para "hoje" nos prazos.
-- Ex.: às 23h de 24/11 em Brasília (02h de 25/11 em UTC): current_date = 25/11,
--      fn_hoje() = 24/11.
CREATE FUNCTION public.fn_hoje()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date $$;

REVOKE EXECUTE ON FUNCTION public.fn_hoje() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_hoje() TO authenticated, service_role;

-- ============================================================================
-- SEÇÃO 2 — Limite e leitura numéricos, com conversão
-- ============================================================================
-- Até aqui o limite de alerta do KRI era só TEXTO livre ("> 10%", "Abaixo de
-- 70%"), e o computador não consegue comparar uma leitura com um texto. Agora o
-- limite tem três partes: operador (>, >=, <, <=), valor (número) e unidade.
-- O texto antigo (`limite_alerta`) NÃO é apagado: fica como "limite antigo",
-- só para leitura, e nada que estava completo deixa de estar.

ALTER TABLE public.indicadores_kri
  ADD COLUMN limite_operador text,
  ADD COLUMN limite_valor    numeric,
  ADD COLUMN limite_unidade  text;

-- Operador só dos quatro tipos; e operador e valor andam juntos (os dois ou
-- nenhum): "menor que ..." sem número não tem sentido.
ALTER TABLE public.indicadores_kri
  ADD CONSTRAINT indicadores_kri_limite_operador_check
    CHECK (limite_operador IN ('>', '>=', '<', '<=')),
  ADD CONSTRAINT indicadores_kri_limite_completo_check
    CHECK ((limite_operador IS NULL) = (limite_valor IS NULL));

COMMENT ON COLUMN public.indicadores_kri.limite_operador IS
  'Operador do limite de alerta: >, >=, < ou <=. Junto com limite_valor, vale no lugar do texto antigo limite_alerta.';
COMMENT ON COLUMN public.indicadores_kri.limite_valor IS
  'Número do limite de alerta (ex.: 70 em "menor que 70 %").';
COMMENT ON COLUMN public.indicadores_kri.limite_unidade IS
  'Unidade do limite de alerta, opcional (ex.: %, dias).';

-- A leitura (medição) também ganha um número comparável. O texto original
-- (`valor_apurado`) continua existindo.
ALTER TABLE public.medicoes_kri ADD COLUMN valor_numerico numeric;

COMMENT ON COLUMN public.medicoes_kri.valor_numerico IS
  'Valor da leitura como número, comparado com o limite do KRI para decidir se há alerta.';

-- ----------------------------------------------------------------------------
-- fn_converter_limite_texto(t): traduz o texto antigo do limite SÓ quando ele
-- é inequívoco. Devolve UMA linha (operador, valor, unidade) ou NENHUMA.
-- A UNIDADE, quando existe, é '%' OU uma única palavra de pelo menos 3 letras
-- (dias, horas, pontos). Assim 'ou' e 'e' NÃO viram unidade: '> 5 ou' e '< 5 e'
-- ficam a converter. (O front repete esta regra em TypeScript.)
-- Aceita (sem diferenciar maiúsculas de minúsculas; vírgula ou ponto decimal;
-- unidade opcional de uma palavra, como % ou dias):
--   '< 80%'          -> (<, 80, %)          'Abaixo de 70%' -> (<, 70, %)
--   '>= 2,5 dias'    -> (>=, 2.5, dias)     'Acima de 5%'   -> (>, 5, %)
--   'menor que 4'    -> (<, 4, nada)        'Maior que 7.5' -> (>, 7.5, nada)
-- NÃO converte (fica "a converter", uma pessoa decide): 'Até 10%' (inclui ou
-- não o 10?), intervalos ('Entre 5 e 10'), dois números ('Abaixo de 70% ou
-- acima de 90%') e textos com palavras a mais.
-- IMMUTABLE: o resultado depende só do texto recebido.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.fn_converter_limite_texto(t text)
RETURNS TABLE (operador text, valor numeric, unidade text)
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE m[1]
           WHEN 'abaixo de' THEN '<'  WHEN 'menor que' THEN '<'
           WHEN 'acima de'  THEN '>'  WHEN 'maior que' THEN '>'
           ELSE m[1]
         END,
         replace(m[2], ',', '.')::numeric,
         nullif(m[3], '')
    FROM (
      SELECT coalesce(
               -- Símbolo + número: '< 80%', '>=2,5 dias' (espaço opcional).
               regexp_match(lower(btrim(t)),
                 '^(<=|>=|<|>)\s*(\d+(?:[.,]\d+)?)\s*(%|[[:alpha:]]{3,})?$'),
               -- Palavras + número: 'abaixo de 70%' (espaço obrigatório).
               regexp_match(lower(btrim(t)),
                 '^(abaixo de|acima de|menor que|maior que)\s+(\d+(?:[.,]\d+)?)\s*(%|[[:alpha:]]{3,})?$')
             ) AS m
    ) x
   WHERE m IS NOT NULL;
$$;

-- fn_numero_de_texto(t): número de uma leitura antiga em texto, SÓ quando o
-- texto é apenas um número com % opcional ('12,5%' -> 12.5; '80' -> 80).
-- 'cerca de 80' e '12 dias' ficam sem número (nulo).
CREATE FUNCTION public.fn_numero_de_texto(t text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT replace((regexp_match(t, '^\s*(\d+(?:[.,]\d+)?)\s*%?\s*$'))[1], ',', '.')::numeric;
$$;

-- fn_converter_limites_existentes(): aplica a conversão nos KRIs que têm texto
-- e ainda não têm limite numérico. Fica numa função para a migração (abaixo) e
-- o teste usarem exatamente o mesmo código. Devolve quantos converteu e
-- quantos ficaram "a converter". O texto antigo não é tocado.
-- Não é chamada pelo sistema: só pela migração e pelos testes (sem EXECUTE
-- para anon nem authenticated).
CREATE FUNCTION public.fn_converter_limites_existentes()
RETURNS TABLE (convertidos integer, a_converter integer)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_sinal text := coalesce(current_setting('radar.fluxo', true), '');
  v_conv  integer;
  v_resta integer;
BEGIN
  -- Sinal do fluxo ligado só aqui: ajustar o limite não reabre aprovações.
  PERFORM set_config('radar.fluxo', 'on', true);

  -- (O UPDATE não aceita LATERAL sobre a própria tabela; por isso a conversão
  -- é calculada num WITH e depois ligada ao KRI pelo id.)
  WITH conv AS (
    SELECT k.id, c.operador, c.valor, c.unidade
      FROM public.indicadores_kri k
     CROSS JOIN LATERAL public.fn_converter_limite_texto(k.limite_alerta) c
     WHERE k.limite_operador IS NULL
  )
  UPDATE public.indicadores_kri k
     SET limite_operador = conv.operador,
         limite_valor    = conv.valor,
         limite_unidade  = conv.unidade
    FROM conv
   WHERE k.id = conv.id;
  GET DIAGNOSTICS v_conv = ROW_COUNT;

  PERFORM set_config('radar.fluxo', v_sinal, true);

  SELECT count(*) INTO v_resta
    FROM public.indicadores_kri k
   WHERE k.limite_operador IS NULL
     AND public.fn_texto_preenchido(k.limite_alerta);

  RETURN QUERY SELECT v_conv, v_resta;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_converter_limites_existentes() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_converter_limite_texto(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_converter_limite_texto(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_numero_de_texto(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_numero_de_texto(text) TO authenticated, service_role;

-- Converte o que já existe e conta, para a CGOV saber o que sobrou.
DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.fn_converter_limites_existentes();
  RAISE NOTICE 'LAC-03: % limite(s) de KRI convertido(s) para número; % a converter por uma pessoa (texto ambíguo).',
    r.convertidos, r.a_converter;
END;
$$;

-- (Este UPDATE gera linhas de auditoria sem usuario_id: esperado, é a migração.)
-- Leituras antigas ganham o número quando o texto é só um número (% opcional).
UPDATE public.medicoes_kri
   SET valor_numerico = public.fn_numero_de_texto(valor_apurado)
 WHERE valor_numerico IS NULL
   AND public.fn_numero_de_texto(valor_apurado) IS NOT NULL;

-- fn_kri_completo: igual à da migração 20261122004, MUDANDO só o limite. Ele
-- conta como preenchido com (operador E valor) OU o texto antigo: assim nenhum
-- KRI que estava completo reabre por causa desta migração.
CREATE OR REPLACE FUNCTION public.fn_kri_completo(k public.indicadores_kri)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT public.fn_texto_preenchido(k.nome_indicador)
     AND public.fn_texto_preenchido(k.formula_calculo)
     AND public.fn_texto_preenchido(k.fonte_dados)
     AND public.fn_texto_preenchido(k.periodicidade)
     AND ((k.limite_operador IS NOT NULL AND k.limite_valor IS NOT NULL)
          OR public.fn_texto_preenchido(k.limite_alerta))
     AND public.fn_texto_preenchido(k.responsavel_medicao);
$$;

-- ============================================================================
-- SEÇÃO 3 — Alerta calculado e aberto pelo banco
-- ============================================================================
-- Quem decide se uma leitura "passa do limite" é o BANCO, não o navegador:
-- o front pode errar ou ser adulterado. Dois gatilhos em medicoes_kri:
--   1) BEFORE: compara valor_numerico com o limite do KRI e grava em_alerta;
--   2) AFTER:  se a leitura está em alerta e o KRI não tem alerta aberto,
--              abre um registro em alertas_kri (a "ciência" = hoje, que é o
--              início do prazo de 10 dias úteis).
-- As leituras antigas NÃO são recalculadas: esta migração não mexe no
-- em_alerta que já existe.

-- fn_medicao_calcula_alerta: define NEW.em_alerta, ignorando o que o cliente
-- mandou. Sem limite numérico no KRI (só o texto antigo) ou sem número na
-- leitura, o resultado é false. "Passa do limite" = valor <operador> limite:
-- com limite "< 70", a leitura 60 é alerta; a 70 não (fronteira exata).
-- SECURITY INVOKER (o padrão): quem grava a leitura já enxerga o KRI pela RLS.
CREATE FUNCTION public.fn_medicao_calcula_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_op     text;
  v_limite numeric;
BEGIN
  SELECT k.limite_operador, k.limite_valor INTO v_op, v_limite
    FROM public.indicadores_kri k
   WHERE k.id = NEW.kri_id;

  NEW.em_alerta := coalesce(
    CASE
      WHEN v_op IS NULL OR v_limite IS NULL OR NEW.valor_numerico IS NULL THEN false
      WHEN v_op = '>'  THEN NEW.valor_numerico >  v_limite
      WHEN v_op = '>=' THEN NEW.valor_numerico >= v_limite
      WHEN v_op = '<'  THEN NEW.valor_numerico <  v_limite
      WHEN v_op = '<=' THEN NEW.valor_numerico <= v_limite
      ELSE false
    END, false);
  RETURN NEW;
END;
$$;

-- alertas_kri: um registro por "episódio" de alerta de um KRI.
--   ciencia_em    = dia em que o alerta foi registrado (início dos 10 dias úteis);
--   encerrado_em  = nulo enquanto aberto (o encerramento vem em tarefa seguinte);
--   comunicacao_id = comunicação à CGOV (a FK é criada na migração das comunicações).
CREATE TABLE public.alertas_kri (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id         uuid NOT NULL REFERENCES public.indicadores_kri(id) ON DELETE CASCADE,
  medicao_id     uuid NOT NULL REFERENCES public.medicoes_kri(id),
  ciencia_em     date NOT NULL,
  encerrado_em   date,
  comunicacao_id uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alertas_kri IS
  'Alerta de um KRI: aberto pelo banco na 1ª leitura além do limite; ciencia_em inicia o prazo de 10 dias úteis.';

-- No máximo UM alerta aberto por KRI (os encerrados podem se repetir).
CREATE UNIQUE INDEX alertas_kri_um_aberto_por_kri
  ON public.alertas_kri (kri_id) WHERE encerrado_em IS NULL;

-- RLS: lê quem enxerga o KRI (a RLS de indicadores_kri já é a regra de
-- alcance). Ninguém escreve direto: só o gatilho abaixo (SECURITY DEFINER).
ALTER TABLE public.alertas_kri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alertas do KRI: leitura no alcance"
  ON public.alertas_kri FOR SELECT TO authenticated
  USING (kri_id IN (SELECT k.id FROM public.indicadores_kri AS k));

REVOKE ALL ON public.alertas_kri FROM anon, authenticated;
GRANT SELECT ON public.alertas_kri TO authenticated;

CREATE TRIGGER trg_auditoria_alertas_kri
  AFTER INSERT OR UPDATE OR DELETE ON public.alertas_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

-- fn_medicao_abre_alerta: abre o alerta se a leitura recém-gravada está em
-- alerta. ON CONFLICT DO NOTHING (índice único parcial): se já há alerta
-- aberto, ou se duas leituras chegam juntas, o segundo gatilho não falha e
-- não duplica. Leitura dentro do limite nunca encerra nada.
CREATE FUNCTION public.fn_medicao_abre_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.em_alerta THEN
    INSERT INTO public.alertas_kri (kri_id, medicao_id, ciencia_em)
    VALUES (NEW.kri_id, NEW.id, public.fn_hoje())
    ON CONFLICT (kri_id) WHERE encerrado_em IS NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_medicao_calcula_alerta() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_medicao_abre_alerta()    FROM public, anon, authenticated;

-- Dispara também ao mexer em em_alerta ou kri_id: assim o cliente não adultera
-- o alerta por UPDATE, e trocar a leitura de KRI recalcula pelo limite novo.
CREATE TRIGGER trg_medicao_calcula_alerta
  BEFORE INSERT OR UPDATE OF valor_numerico, em_alerta, kri_id ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_medicao_calcula_alerta();

CREATE TRIGGER trg_medicao_abre_alerta
  AFTER INSERT ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_medicao_abre_alerta();

-- Travas de exclusão (mensagem clara em vez do erro técnico de chave estrangeira):
--  (a) a leitura que ABRIU um alerta não pode ser apagada, porque o alerta é
--      a prova do prazo; o que se corrige é a leitura nova, não a antiga;
--  (b) um KRI com alerta já COMUNICADO à CGOV não pode ser apagado, porque a
--      comunicação é um registro imutável que cita o alerta.
-- Apagar o KRI inteiro continua funcionando quando seus alertas NÃO foram
-- comunicados: as leituras e os alertas saem juntos, em cascata. Na cascata a
-- linha do KRI já não existe quando a leitura é apagada, e é isso que a
-- trava (a) usa para deixar passar.
CREATE FUNCTION public.fn_medicao_protege_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.alertas_kri a WHERE a.medicao_id = OLD.id)
     AND EXISTS (SELECT 1 FROM public.indicadores_kri k WHERE k.id = OLD.kri_id) THEN
    RAISE EXCEPTION 'Esta leitura abriu um alerta do KRI e não pode ser apagada';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_medicao_protege_alerta
  BEFORE DELETE ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_medicao_protege_alerta();

CREATE FUNCTION public.fn_kri_protege_alerta_comunicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.alertas_kri a
              WHERE a.kri_id = OLD.id AND a.comunicacao_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este KRI tem alerta já comunicado à CGOV e não pode ser apagado';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_kri_protege_alerta_comunicado
  BEFORE DELETE ON public.indicadores_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_kri_protege_alerta_comunicado();

REVOKE EXECUTE ON FUNCTION public.fn_medicao_protege_alerta()         FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_protege_alerta_comunicado()  FROM public, anon, authenticated;

-- alertas_kri_situacao: o alerta + o prazo em dias úteis.
--   vence_em           = ciência + 10 dias úteis;
--   dia_atual          = dias úteis desde a ciência (teto 99, para a tela);
--   vencido            = só vale para alerta ABERTO e com mais de 10 dias úteis;
--   dias_uteis_vencido = dias úteis além dos 10 (0 se encerrado ou no prazo).
-- security_invoker: a visão obedece à RLS de quem consulta (gestor de outra
-- unidade não vê nada).
CREATE VIEW public.alertas_kri_situacao
WITH (security_invoker = true) AS
SELECT a.*,
       public.fn_somar_dias_uteis(a.ciencia_em, 10) AS vence_em,
       d.dia_atual,
       (a.encerrado_em IS NULL AND d.dia_atual > 10) AS vencido,
       CASE WHEN a.encerrado_em IS NULL THEN greatest(d.dia_atual - 10, 0) ELSE 0 END
         AS dias_uteis_vencido
  FROM public.alertas_kri a
 CROSS JOIN LATERAL (
   SELECT least(public.fn_dias_uteis_entre(a.ciencia_em, public.fn_hoje()), 99) AS dia_atual
 ) d;

REVOKE ALL ON public.alertas_kri_situacao FROM anon, authenticated;
GRANT SELECT ON public.alertas_kri_situacao TO authenticated;

-- ============================================================================
-- SEÇÃO 4 — salvar_ficha_risco grava o limite de alerta numérico
-- ============================================================================
-- A ficha do risco (tela do KRI) passa a gravar também o limite numérico:
--   limite_operador ('>', '>=', '<', '<='), limite_valor (número) e
--   limite_unidade (texto livre, ex.: '%').
-- Recriada CREATE OR REPLACE a partir da definição vigente (20261122004,
-- seção 8) e MUDANDO SÓ o INSERT e o UPDATE de indicadores_kri, que ganham
-- esses três campos. O texto antigo limite_alerta continua sendo gravado
-- exatamente como antes. Assinatura, SECURITY INVOKER, search_path e
-- permissões são os mesmos.
-- Como os valores vêm de jsonb_populate_record sobre indicadores_kri, o
-- número do JSON já chega como numeric; chave omitida em KRI existente
-- mantém o valor atual.
-- Ex.: {"limite_operador": "<", "limite_valor": 80, "limite_unidade": "%"}
--   grava "alerta quando a leitura ficar abaixo de 80%".
-- A trava do risco crítico não muda: um KRI sem limite numérico E sem o
-- texto antigo continua "incompleto" (fn_kri_completo, seção 2).
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
  v_kri_id  uuid;                         -- id do KRI da vez (existente ou recém-criado)
  v_objeto  uuid;                         -- objeto do risco GRAVADO (o KRI tem de ser dele)
  v_item    jsonb;                        -- o item da vez de uma lista de filhos
  v_grupo   text;                         -- nome da lista (controles, respostas, kris)
  v_novo    boolean;                      -- true = ficha nova (sem id)
  v_fator   numeric(3,2);                 -- fator do Quadro 6 (sai da eficácia)
  v_linhas  integer;                      -- linhas alteradas pelo UPDATE do risco (e do KRI, na 2c)
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

  -- Código final (na alteração, o que já estava gravado) e o objeto GRAVADO:
  -- é dele que o KRI da ficha precisa ser (LAC-03).
  SELECT r.codigo_radar, r.objeto_id INTO v_codigo, v_objeto FROM public.riscos AS r WHERE r.id = v_id;

  -- -------------------------------------------------------------------------
  -- 2. Os FILHOS — antes de tudo, nenhum id pode ser de filho de outro risco.
  --    Ex.: mandar na ficha de RADAR-2026-003 o id de um controle de
  --    RADAR-2026-002 → recusa (e nada é gravado).
  --    O KRI (LAC-03) é do OBJETO: o id tem de ser de um KRI do mesmo objeto
  --    do risco (ex.: na ficha de um risco da FLONA de Caçador, um KRI da CT
  --    Curitiba → recusa). KRI que a pessoa não lê (RLS) também "não existe".
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
                           WHERE k.id = (e.item ->> 'id')::uuid AND k.objeto_id = v_objeto))
  THEN
    RAISE EXCEPTION 'RADAR: a ficha traz um controle, resposta ou KRI que não pertence ao risco % (o KRI precisa ser do mesmo objeto de gestão de riscos).', v_codigo
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
  -- 2c. KRIs (LAC-03) — a lista diz QUAIS KRIs do objeto servem a este risco
  --     Depois de gravar, os KRIs ligados ao risco são exatamente os da lista:
  --       - item SEM id                   → KRI novo, do objeto do risco, já ligado;
  --       - item com id                   → altera a DEFINIÇÃO daquele KRI (que
  --                                         precisa ser do mesmo objeto) e o liga,
  --                                         se ainda não estava;
  --       - item com id e apenasLigar     → só liga um KRI que já existe no
  --                                         objeto, sem tocar na definição;
  --       - KRI ligado que não veio na lista → é só DESLIGADO deste risco.
  --     Nunca se apaga aqui um KRI que outro risco ainda usa: quem apaga o KRI
  --     que ficou sem nenhuma ligação (órfão, com as medições) é o gatilho de
  --     kri_riscos. Medições ficam no Monitoramento (não passam por aqui).
  --     Ex.: R-01 e R-04 da FLONA de Caçador usam o KRI "% de autorizações
  --     fora do prazo". A ficha de R-04 vem sem ele → só R-04 é desligado; o
  --     KRI e as medições continuam, ligados a R-01.
  --     Os gatilhos de sempre valem: alterar a definição trava/reabre TODOS os
  --     riscos ligados (fn_trava_reabertura_kri); ligar/desligar trava/reabre
  --     este risco; KRI de outro objeto é recusado (23514).
  -- -------------------------------------------------------------------------
  IF jsonb_typeof(ficha -> 'kris') = 'array' THEN
    -- Desliga os KRIs que saíram da lista (o órfão é apagado pelo gatilho).
    DELETE FROM public.kri_riscos AS l
     WHERE l.risco_id = v_id
       AND l.kri_id NOT IN (SELECT (e.item ->> 'id')::uuid
                              FROM jsonb_array_elements(ficha -> 'kris') AS e(item)
                             WHERE nullif(e.item ->> 'id', '') IS NOT NULL);

    FOR v_item IN SELECT e.item FROM jsonb_array_elements(ficha -> 'kris') AS e(item) LOOP
      IF nullif(v_item ->> 'id', '') IS NULL THEN
        -- KRI novo, no objeto do risco. Campo que não veio fica vazio (NULL):
        -- o sistema não inventa valor (RF-183).
        v_kri := jsonb_populate_record(NULL::public.indicadores_kri, v_item);
        INSERT INTO public.indicadores_kri AS k
          (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
           meta_alvo, limite_alerta, responsavel_medicao,
           limite_operador, limite_valor, limite_unidade)
        VALUES
          (v_objeto, v_kri.nome_indicador, v_kri.formula_calculo, v_kri.fonte_dados,
           v_kri.periodicidade, v_kri.meta_alvo, v_kri.limite_alerta, v_kri.responsavel_medicao,
           v_kri.limite_operador, v_kri.limite_valor, v_kri.limite_unidade)
        RETURNING k.id INTO v_kri_id;
      ELSE
        v_kri_id := (v_item ->> 'id')::uuid;
        IF NOT coalesce((v_item ->> 'apenasLigar')::boolean, false) THEN
          SELECT k.* INTO v_kri FROM public.indicadores_kri AS k WHERE k.id = v_kri_id;
          v_kri := jsonb_populate_record(v_kri, v_item);   -- chave omitida = mantém
          UPDATE public.indicadores_kri AS k SET
            nome_indicador      = v_kri.nome_indicador,
            formula_calculo     = v_kri.formula_calculo,
            fonte_dados         = v_kri.fonte_dados,
            periodicidade       = v_kri.periodicidade,
            meta_alvo           = v_kri.meta_alvo,
            limite_alerta       = v_kri.limite_alerta,
            responsavel_medicao = v_kri.responsavel_medicao,
            limite_operador     = v_kri.limite_operador,
            limite_valor        = v_kri.limite_valor,
            limite_unidade      = v_kri.limite_unidade
          WHERE k.id = v_kri_id AND k.objeto_id = v_objeto;
          -- A RLS não dá erro no UPDATE barrado: só "não acha" a linha. Sem
          -- esta conferência, a ficha diria "salvo" sem ter gravado o KRI.
          -- Ex.: a CGOV, na ficha preliminar, altera um KRI que também serve
          -- a um risco da unidade (ela lê o KRI, mas não pode alterá-lo).
          GET DIAGNOSTICS v_linhas = ROW_COUNT;
          IF v_linhas = 0 THEN
            RAISE EXCEPTION 'RADAR: você não pode alterar a definição do KRI "%" na ficha do risco % (o KRI serve a risco que você não pode alterar).',
              v_kri.nome_indicador, v_codigo
              USING ERRCODE = 'insufficient_privilege';   -- 42501
          END IF;
        END IF;
      END IF;

      -- Liga, se ainda não estava ligado. (Conferimos antes, em vez de usar
      -- ON CONFLICT: o gatilho BEFORE INSERT de kri_riscos roda ANTES da
      -- conferência de conflito e reabriria o aprovado à toa.)
      IF NOT EXISTS (SELECT 1 FROM public.kri_riscos AS l
                      WHERE l.kri_id = v_kri_id AND l.risco_id = v_id) THEN
        INSERT INTO public.kri_riscos (kri_id, risco_id) VALUES (v_kri_id, v_id);
      END IF;
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2d. TRAVA DO RISCO CRÍTICO (LAC-13, migração 20261122002; LAC-03)
  --     Fora do rascunho, do devolvido e do preliminar_cgov, a ficha crítica
  --     precisa de tratamento: estratégia principal diferente de "Aceitar",
  --     pelo menos uma ação 5W2H que não seja "Aceitar" e (LAC-03) pelo menos
  --     um KRI completo ligado ao risco. Roda DEPOIS da gravação dos KRIs
  --     (2c), então enxerga o KRI que acabou de ser ligado. Mesma regra de
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
    ELSIF NOT EXISTS (SELECT 1
                        FROM public.kri_riscos AS l
                        JOIN public.indicadores_kri AS k ON k.id = l.kri_id
                       WHERE l.risco_id = v_id AND public.fn_kri_completo(k)) THEN
      v_trava_motivo := 'falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável)';
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
  'RADAR (B3; LAC-13; LAC-03): grava a ficha do risco (risco + controles + respostas + ligações de KRI do objeto, com o limite de alerta numérico) num único comando, com as permissões de quem está logado; gera o código RADAR-<ano>-<NNN> na criação. Ver migrações 20261117001 (seção 2), 20261122002, 20261122004 (seção 8) e 20261123002 (seção 4).';

REVOKE EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) TO authenticated;
