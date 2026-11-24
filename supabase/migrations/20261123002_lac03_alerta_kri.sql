-- ============================================================================
-- LAC-03 (3ª migração) — alerta do KRI: limite numérico, abertura e prazos
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Esta migração é montada por SEÇÕES, uma por tarefa do plano
-- (docs/superpowers/specs/2026-11-23-alerta-kri-comunicacoes-design.md, seção 4):
--   Seção 1: feriados e dias úteis (esta parte);
--   Seções 2 a 4: acrescentadas pelas tarefas seguintes.
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
CREATE FUNCTION public.fn_somar_dias_uteis(d date, n integer)
RETURNS date
LANGUAGE plpgsql
STABLE
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
CREATE FUNCTION public.fn_dias_uteis_entre(inicio date, fim date)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT count(*)::integer
    FROM generate_series(inicio + 1, fim, interval '1 day') AS g(dia)
   WHERE extract(isodow FROM g.dia) < 6
     AND NOT EXISTS (SELECT 1 FROM public.feriados f WHERE f.data = g.dia::date);
$$;

GRANT EXECUTE ON FUNCTION public.fn_somar_dias_uteis(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dias_uteis_entre(date, date) TO authenticated;
