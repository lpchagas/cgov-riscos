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
-- SECURITY DEFINER para ler o limite do KRI qualquer que seja o chamador.
CREATE FUNCTION public.fn_medicao_calcula_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
    VALUES (NEW.kri_id, NEW.id, current_date)
    ON CONFLICT (kri_id) WHERE encerrado_em IS NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_medicao_calcula_alerta() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_medicao_abre_alerta()    FROM public, anon, authenticated;

CREATE TRIGGER trg_medicao_calcula_alerta
  BEFORE INSERT OR UPDATE OF valor_numerico ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_medicao_calcula_alerta();

CREATE TRIGGER trg_medicao_abre_alerta
  AFTER INSERT ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_medicao_abre_alerta();

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
   SELECT least(public.fn_dias_uteis_entre(a.ciencia_em, current_date), 99) AS dia_atual
 ) d;

REVOKE ALL ON public.alertas_kri_situacao FROM anon, authenticated;
GRANT SELECT ON public.alertas_kri_situacao TO authenticated;
