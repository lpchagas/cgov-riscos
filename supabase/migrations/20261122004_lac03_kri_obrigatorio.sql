-- ============================================================================
-- LAC-03 — KRI do objeto, ligação muitos para muitos e KRI completo
-- (1ª parte: estrutura, dados, gatilhos e RLS — seções 1 a 5;
--  2ª parte: trava com KRI completo, ficha, DAR e remoção de risco_id — 6 a 10)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Metodologia (4.7.1), o risco crítico (residual fora do apetite da DAR)
-- precisa de um Indicador-Chave de Risco (KRI). Até aqui, cada KRI pertencia a
-- UM risco (indicadores_kri.risco_id) e os campos do KRI eram obrigatórios —
-- o que levava o sistema a gravar valores que ninguém definiu ("A definir",
-- e o importador inventava "100%" e "< 80%"). A LAC-03 muda isso:
--
--   1. O KRI passa a ser do OBJETO de gestão de riscos (indicadores_kri.objeto_id)
--      e a nova tabela `kri_riscos` liga um KRI a VÁRIOS riscos do MESMO objeto.
--      Ex.: na FLONA de Caçador, o KRI "% de autorizações emitidas fora do
--      prazo" serve aos riscos R-01 (atraso na análise) e R-04 (pressão
--      externa): mede-se uma vez, e os dois riscos o acompanham.
--   2. Ligar um KRI a risco de OUTRO objeto é recusado (23514), com o texto
--      "RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de
--      riscos.". O gatilho enxerga tudo (SECURITY DEFINER), então nem quem
--      não lê o KRI consegue ligá-lo.
--   3. Ligar ou desligar um KRI é "mexer na ficha" do risco: reabre o risco
--      aprovado (volta a em_validacao_cg) e é recusado quando o risco está em
--      validação ou homologação ("ficha travada") — o mesmo gatilho das outras
--      tabelas filhas (fn_trava_reabertura_ficha).
--   4. KRI órfão: quando a ÚLTIMA ligação some (desligado do último risco, ou
--      esse risco foi apagado), o KRI e as medições dele são apagados. Desligar
--      1 de 2 riscos mantém o KRI e as medições.
--   5. Os campos fórmula, fonte, periodicidade, meta, limite de alerta e
--      responsável passam a aceitar vazio (NULL). O CHECK da periodicidade
--      continua (Mensal, Trimestral, Semestral, Anual) e aceita NULL.
--      Os marcadores antigos ("A definir", "A definir pela unidade", vazio, só
--      espaços, em qualquer caixa) viram NULL. Os 4 valores que o importador
--      inventava (fórmula "Definido preliminarmente via skill CGOV", fonte
--      "SEI / Sistema Setorial", meta "100%", alerta "< 80%") viram NULL SÓ
--      quando os quatro aparecem JUNTOS na mesma linha — a "assinatura" do
--      importador. Se a unidade já editou um deles (ex.: a meta deixou de ser
--      "100%"), nada é zerado.
--   6. Duas funções dizem o que é "KRI completo", com a MESMA regra do
--      aplicativo (src/utils/travaRiscoCritico.ts, textoPreenchido/kriCompleto):
--      fn_texto_preenchido(t) e fn_kri_completo(k). Completo = nome, fórmula,
--      fonte, periodicidade, limite de alerta e responsável preenchidos (a
--      meta é opcional). A trava do risco crítico passa a usá-las na 2ª parte.
--   7. RLS com o mesmo alcance de hoje, trocando o caminho "KRI → risco →
--      objeto" por "KRI → objeto".
--
-- PONTE TEMPORÁRIA (só até a 2ª parte, Tarefa 3): a coluna risco_id CONTINUA
-- nesta parte, porque salvar_ficha_risco, a trava e outras funções ainda a
-- usam. Para o banco não ficar incoerente nesse meio-tempo:
--   - risco_id passa a aceitar NULL e o FK passa de ON DELETE CASCADE para
--     ON DELETE SET NULL: apagar um rascunho que divide o KRI com um aprovado
--     não apaga o KRI do aprovado (quem decide o órfão é kri_riscos);
--   - um KRI gravado do jeito antigo (só com risco_id) ganha sozinho o
--     objeto_id do risco e a ligação em kri_riscos (fn_kri_ponte_*);
--   - o risco_id fica congelado: trocá-lo por UPDATE é recusado (42501),
--     porque quem diz a que riscos o KRI serve agora é kri_riscos.
-- E, para o grupo nunca sair do objeto, também é recusado (23514) levar para
-- outro objeto um KRI ligado ou um risco ligado a KRI (fn_kri_grupo_mesmo_objeto).
-- A 2ª parte (seções 6 a 10) reescreve essas funções, apaga a ponte e remove
-- risco_id.
--
-- O QUE NÃO MUDA: o cálculo (Quadros 6, 7 e 8; trigger_calcular_risco_radar),
-- o status_fluxo de qualquer risco (a limpeza dos dados roda com o sinal
-- radar.fluxo ligado, então nenhum aprovado é reaberto) e a medição do KRI,
-- que continua livre em qualquer estado do fluxo.
--
-- TRILHA DE AUDITORIA: as atualizações feitas por esta migração em
-- indicadores_kri (objeto_id preenchido e marcadores limpos) passam pelo
-- gatilho de auditoria e ficam na trilha com usuario_id NULO ("Sistema/
-- administrador"). É de propósito: a limpeza fica registrada. A cópia das
-- ligações para kri_riscos é feita ANTES de o gatilho de auditoria da tabela
-- nova existir: é a mesma informação de risco_id, agora em outra tabela.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Estrutura: KRI do objeto e campos que aceitam vazio
-- ----------------------------------------------------------------------------
ALTER TABLE public.indicadores_kri
  ADD COLUMN objeto_id uuid REFERENCES public.objetos_contexto(id) ON DELETE CASCADE;

-- Preenche o objeto a partir do risco de hoje. O UPDATE passa pelo gatilho de
-- trava e reabertura de indicadores_kri; com o sinal radar.fluxo ligado (só
-- dentro deste bloco), ele não reabre nem trava nada.
DO $$
DECLARE
  v_sinal text := coalesce(current_setting('radar.fluxo', true), '');
BEGIN
  PERFORM set_config('radar.fluxo', 'on', true);
  UPDATE public.indicadores_kri AS k
     SET objeto_id = r.objeto_id
    FROM public.riscos AS r
   WHERE r.id = k.risco_id;
  PERFORM set_config('radar.fluxo', v_sinal, true);
END;
$$;

ALTER TABLE public.indicadores_kri ALTER COLUMN objeto_id SET NOT NULL;
CREATE INDEX idx_indicadores_kri_objeto ON public.indicadores_kri (objeto_id);

-- Campos que podem ficar vazios (NULL): ninguém é obrigado a inventar valor.
-- O CHECK da periodicidade continua; um CHECK com NULL dá "desconhecido", que
-- o PostgreSQL aceita, então a periodicidade vazia passa e "Quinzenal" não.
ALTER TABLE public.indicadores_kri
  ALTER COLUMN formula_calculo     DROP NOT NULL,
  ALTER COLUMN fonte_dados         DROP NOT NULL,
  ALTER COLUMN periodicidade       DROP NOT NULL,
  ALTER COLUMN meta_alvo           DROP NOT NULL,
  ALTER COLUMN limite_alerta       DROP NOT NULL,
  ALTER COLUMN responsavel_medicao DROP NOT NULL;

-- Ponte temporária (ver cabeçalho): risco_id opcional e sem cascata.
ALTER TABLE public.indicadores_kri ALTER COLUMN risco_id DROP NOT NULL;
ALTER TABLE public.indicadores_kri DROP CONSTRAINT indicadores_kri_risco_id_fkey;
ALTER TABLE public.indicadores_kri
  ADD CONSTRAINT indicadores_kri_risco_id_fkey
  FOREIGN KEY (risco_id) REFERENCES public.riscos(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2. O que é "texto preenchido" e "KRI completo"
-- ----------------------------------------------------------------------------
-- Mesma regra de textoPreenchido/kriCompleto (src/utils/travaRiscoCritico.ts).
-- O `trim` do JavaScript tira espaços, tabulações e quebras de linha das
-- pontas; aqui o regexp_replace com \s faz o mesmo.
-- Ex.: fn_texto_preenchido('Mensal') → true;
--      fn_texto_preenchido(NULL), (''), ('   '), (' a definir '),
--      ('A definir pela unidade') → false.
CREATE OR REPLACE FUNCTION public.fn_texto_preenchido(t text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT t IS NOT NULL
     AND lower(regexp_replace(t, '^\s+|\s+$', '', 'g'))
         NOT IN ('', 'a definir', 'a definir pela unidade');
$$;

-- KRI completo: os 6 campos preenchidos (a meta fica de fora, é opcional).
-- Ex.: KRI com fonte_dados = ' a definir ' → false; sem meta → true.
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
     AND public.fn_texto_preenchido(k.limite_alerta)
     AND public.fn_texto_preenchido(k.responsavel_medicao);
$$;

-- Funções puras (não leem tabela): podem ser chamadas por quem está logado.
REVOKE EXECUTE ON FUNCTION public.fn_texto_preenchido(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fn_kri_completo(public.indicadores_kri) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_texto_preenchido(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_kri_completo(public.indicadores_kri) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Ligação KRI ↔ risco (`kri_riscos`) e os gatilhos dela
-- ----------------------------------------------------------------------------
CREATE TABLE public.kri_riscos (
  kri_id    uuid NOT NULL REFERENCES public.indicadores_kri(id) ON DELETE CASCADE,
  risco_id  uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kri_id, risco_id)
);
-- A chave primária já serve para "os riscos deste KRI"; este índice serve
-- para "os KRIs deste risco" (a ficha e a trava procuram por risco).
CREATE INDEX idx_kri_riscos_risco ON public.kri_riscos (risco_id);

COMMENT ON TABLE public.kri_riscos IS
  'RADAR (LAC-03): liga um KRI (indicadores_kri) a cada risco do MESMO objeto que ele acompanha. Ver migração 20261122004.';

-- 3.1 Cópia das ligações de hoje: cada KRI fica ligado ao risco que já era dele.
-- (Antes dos gatilhos da tabela nova: não reabre nada nem duplica a trilha.)
INSERT INTO public.kri_riscos (kri_id, risco_id)
SELECT k.id, k.risco_id
  FROM public.indicadores_kri AS k
 WHERE k.risco_id IS NOT NULL;

-- 3.2 Só dentro do mesmo objeto.
-- SECURITY DEFINER: lê o KRI e o risco sem depender da RLS de quem grava.
-- Sem isso, quem não enxerga o KRI "não acharia" o objeto dele e a conferência
-- passaria em branco. Só devolve erro ou nada: não vaza dado.
-- Ex.: KRI da FLONA de Caçador + risco da CT Curitiba → recusa (23514).
CREATE OR REPLACE FUNCTION public.fn_kri_riscos_mesmo_objeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_objeto_kri   uuid;
  v_objeto_risco uuid;
BEGIN
  SELECT k.objeto_id INTO v_objeto_kri   FROM public.indicadores_kri AS k WHERE k.id = NEW.kri_id;
  SELECT r.objeto_id INTO v_objeto_risco FROM public.riscos          AS r WHERE r.id = NEW.risco_id;
  -- KRI ou risco inexistente: quem recusa é a chave estrangeira (23503).
  IF v_objeto_kri IS DISTINCT FROM v_objeto_risco
     AND v_objeto_kri IS NOT NULL AND v_objeto_risco IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.'
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN NEW;
END;
$$;

-- 3.3 Trava e reabertura: recriada igual à de 20261115004, com um rótulo a
-- mais ('ligação do KRI ao risco'), para o histórico dizer de onde veio a
-- reabertura. kri_riscos tem risco_id, então a função serve sem outra mudança.
-- Ex.: gestor.uc@ liga um KRI a um risco aprovado → o risco volta a
--      em_validacao_cg, com "alteração: inclusão em ligação do KRI ao risco".
CREATE OR REPLACE FUNCTION public.fn_trava_reabertura_ficha()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_origem text;
BEGIN
  IF coalesce(current_setting('radar.fluxo', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- UPDATE que não muda nada: nada a travar nem reabrir.
    IF to_jsonb(NEW) = to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;
    -- Só o status de execução da ação de tratamento mudou: livre.
    IF TG_TABLE_NAME = 'respostas_tratamento'
       AND (to_jsonb(NEW) - 'status_execucao') = (to_jsonb(OLD) - 'status_execucao') THEN
      RETURN NEW;
    END IF;
  END IF;

  v_origem := CASE TG_OP WHEN 'INSERT' THEN 'inclusão' WHEN 'UPDATE' THEN 'alteração' ELSE 'exclusão' END
              || ' em '
              || CASE TG_TABLE_NAME
                   WHEN 'controles_existentes' THEN 'controles existentes'
                   WHEN 'respostas_tratamento' THEN 'tratamento (5W2H)'
                   WHEN 'indicadores_kri'      THEN 'definição do KRI'
                   WHEN 'kri_riscos'           THEN 'ligação do KRI ao risco'
                   ELSE TG_TABLE_NAME
                 END;

  -- O risco "de antes" (UPDATE/DELETE) e o "de depois" (INSERT, ou UPDATE que
  -- troca o risco_id) passam pela trava.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.fn_fluxo_aplicar_trava(OLD.risco_id, v_origem);
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.risco_id IS DISTINCT FROM OLD.risco_id) THEN
    PERFORM public.fn_fluxo_aplicar_trava(NEW.risco_id, v_origem);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 3.4 KRI órfão: depois de apagar uma ligação, se o KRI não tem mais nenhuma,
-- ele é apagado (e as medições vão junto, pela cascata de medicoes_kri).
-- SECURITY DEFINER: o KRI sem ligação não pode sobrar só porque quem desligou
-- não tem DELETE no KRI (ex.: o risco foi apagado em cascata).
-- Ex.: KRI ligado a R-01 e R-04; desliga R-01 → fica; desliga R-04 → some.
CREATE OR REPLACE FUNCTION public.fn_kri_riscos_apaga_orfao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.indicadores_kri AS k
   WHERE k.id = OLD.kri_id
     AND NOT EXISTS (SELECT 1 FROM public.kri_riscos AS l WHERE l.kri_id = OLD.kri_id);
  RETURN NULL;   -- gatilho AFTER: o valor de retorno é ignorado
END;
$$;

-- 3.5 Trilha de auditoria: recriada igual à de 20261115005, com duas mudanças:
--   - indicadores_kri: o objeto vem do próprio KRI (objeto_id), e não mais do
--     risco — assim a linha da trilha não perde o objeto quando o risco some;
--   - medicoes_kri: medição → KRI → objeto;
--   - kri_riscos (nova): o objeto vem do risco ligado. A tabela não tem
--     coluna `id`, então o registro_id fica NULO (como nas linhas de
--     categorias_risco); o par (kri_id, risco_id) está em dados_novos /
--     dados_anteriores. Não usamos o id do KRI como registro_id para não
--     misturar a linha da ligação com as linhas do próprio KRI.
--     Ex.: select * from auditoria_log
--           where tabela_afetada = 'kri_riscos' and dados_novos->>'kri_id' = '<id>';
CREATE OR REPLACE FUNCTION public.fn_registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linha  jsonb;   -- a ficha (NEW em INSERT/UPDATE; OLD em DELETE)
  v_id     uuid;
  v_objeto uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_linha := to_jsonb(OLD);
  ELSE
    v_linha := to_jsonb(NEW);
  END IF;

  -- categorias_risco tem id numérico: não cabe em registro_id (uuid).
  -- kri_riscos não tem id (a chave é o par kri_id + risco_id).
  IF TG_TABLE_NAME IN ('categorias_risco', 'kri_riscos') THEN
    v_id := NULL;
  ELSE
    v_id := (v_linha ->> 'id')::uuid;
  END IF;

  -- Descobre o objeto de contexto. Se a consulta não achar nada, fica NULL.
  IF TG_TABLE_NAME = 'objetos_contexto' THEN
    v_objeto := v_id;
  ELSIF TG_TABLE_NAME IN ('riscos', 'indicadores_kri') THEN
    v_objeto := (v_linha ->> 'objeto_id')::uuid;
  ELSIF TG_TABLE_NAME IN ('controles_existentes', 'respostas_tratamento', 'kri_riscos') THEN
    SELECT r.objeto_id INTO v_objeto
      FROM public.riscos AS r
     WHERE r.id = (v_linha ->> 'risco_id')::uuid;
  ELSIF TG_TABLE_NAME = 'medicoes_kri' THEN
    SELECT k.objeto_id INTO v_objeto
      FROM public.indicadores_kri AS k
     WHERE k.id = (v_linha ->> 'kri_id')::uuid;
  END IF;

  INSERT INTO public.auditoria_log
    (tabela_afetada, registro_id, operacao, objeto_id, usuario_id, dados_anteriores, dados_novos)
  VALUES
    (TG_TABLE_NAME, v_id, TG_OP, v_objeto, auth.uid(),
     CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
     CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);

  RETURN NULL;   -- gatilho AFTER: o valor de retorno é ignorado
END;
$$;

-- 3.5b O grupo continua no mesmo objeto quando o objeto muda.
-- O gatilho 3.2 olha a ligação. Mas o mesmo grupo quebraria se, depois de
-- ligado, o KRI ou o risco mudasse de objeto. Este gatilho recusa:
--   - indicadores_kri: trocar o objeto_id de um KRI ligado a risco de outro
--     objeto;
--   - riscos: levar para outro objeto um risco ligado a KRI do objeto antigo
--     (desligue o KRI antes de mudar o risco de objeto).
-- Mesma mensagem e mesmo código (23514) da ligação entre objetos.
CREATE OR REPLACE FUNCTION public.fn_kri_grupo_mesmo_objeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.objeto_id IS NOT DISTINCT FROM OLD.objeto_id THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'indicadores_kri' THEN
    PERFORM 1
       FROM public.kri_riscos AS l
       JOIN public.riscos AS r ON r.id = l.risco_id
      WHERE l.kri_id = NEW.id AND r.objeto_id IS DISTINCT FROM NEW.objeto_id;
  ELSE  -- riscos
    PERFORM 1
       FROM public.kri_riscos AS l
       JOIN public.indicadores_kri AS k ON k.id = l.kri_id
      WHERE l.risco_id = NEW.id AND k.objeto_id IS DISTINCT FROM NEW.objeto_id;
  END IF;
  IF FOUND THEN
    RAISE EXCEPTION 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.'
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kris_grupo_mesmo_objeto
BEFORE UPDATE OF objeto_id ON public.indicadores_kri
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_grupo_mesmo_objeto();

CREATE TRIGGER trg_riscos_kri_mesmo_objeto
BEFORE UPDATE OF objeto_id ON public.riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_grupo_mesmo_objeto();

-- 3.6 Os gatilhos de kri_riscos. Os BEFORE rodam em ordem alfabética do nome:
-- "mesmo_objeto" antes de "trava_reabertura", então a ligação entre objetos é
-- recusada antes de qualquer reabertura.
CREATE TRIGGER trg_kri_riscos_mesmo_objeto
BEFORE INSERT OR UPDATE ON public.kri_riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_riscos_mesmo_objeto();

CREATE TRIGGER trg_kri_riscos_trava_reabertura
BEFORE INSERT OR UPDATE OR DELETE ON public.kri_riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_reabertura_ficha();

CREATE TRIGGER trg_kri_riscos_apaga_orfao
AFTER DELETE ON public.kri_riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_riscos_apaga_orfao();

CREATE TRIGGER trg_auditoria_kri_riscos
AFTER INSERT OR UPDATE OR DELETE ON public.kri_riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

-- 3.7 Ponte temporária (apagada na Tarefa 3, junto com risco_id).
-- a) BEFORE INSERT: KRI gravado só com risco_id ganha o objeto_id do risco.
--    SECURITY DEFINER só para LER o objeto do risco; quem decide se a pessoa
--    pode gravar continua sendo a RLS (que confere a linha já completa).
--    BEFORE UPDATE: o risco_id fica CONGELADO. Quem diz a que riscos o KRI
--    serve agora é kri_riscos; trocar o risco_id deixaria as funções antigas
--    (que ainda leem risco_id) vendo o KRI num risco sem ligação — e a RLS
--    nova, que olha o objeto, não barraria isso. Só a chave estrangeira pode
--    zerá-lo (ON DELETE SET NULL, quando o risco é apagado).
--    Ex.: update indicadores_kri set risco_id = <outro risco> → 42501.
CREATE OR REPLACE FUNCTION public.fn_kri_ponte_preenche_objeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.risco_id IS DISTINCT FROM OLD.risco_id AND NEW.risco_id IS NOT NULL THEN
      RAISE EXCEPTION 'RADAR: o risco do KRI não se troca mais pela coluna risco_id; ligue ou desligue o KRI do risco (kri_riscos).'
        USING ERRCODE = 'insufficient_privilege';   -- 42501
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.objeto_id IS NULL AND NEW.risco_id IS NOT NULL THEN
    SELECT r.objeto_id INTO NEW.objeto_id FROM public.riscos AS r WHERE r.id = NEW.risco_id;
  END IF;
  RETURN NEW;
END;
$$;

-- b) AFTER INSERT: e ganha a ligação ao risco em kri_riscos.
--    SECURITY INVOKER de propósito: a ligação passa pela RLS de kri_riscos
--    com os poderes de quem gravou (ex.: a CGOV não liga KRI a risco comum).
CREATE OR REPLACE FUNCTION public.fn_kri_ponte_liga_risco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.risco_id IS NOT NULL THEN
    INSERT INTO public.kri_riscos (kri_id, risco_id)
    VALUES (NEW.id, NEW.risco_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_kris_ponte_preenche_objeto
BEFORE INSERT OR UPDATE OF risco_id ON public.indicadores_kri
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_ponte_preenche_objeto();

CREATE TRIGGER trg_kris_ponte_liga_risco
AFTER INSERT ON public.indicadores_kri
FOR EACH ROW EXECUTE FUNCTION public.fn_kri_ponte_liga_risco();

-- Só o banco chama as funções de gatilho. Ninguém as executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_kri_riscos_mesmo_objeto()   FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_reabertura_ficha()    FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_riscos_apaga_orfao()    FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_grupo_mesmo_objeto()    FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_registrar_auditoria()       FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_ponte_preenche_objeto() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_ponte_liga_risco()      FROM public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. RLS: o mesmo alcance de hoje, pelo caminho "KRI → objeto"
-- ----------------------------------------------------------------------------
-- 4.0 Ajudante da CGOV: "sou CGOV e este KRI é só de risco preliminar?"
-- Antes (20261116003) a CGOV gravava o KRI do risco `preliminar_cgov`. Agora o
-- KRI é do objeto e pode servir a vários riscos. A CGOV grava o KRI quando:
--   - o objeto do KRI tem pelo menos um risco preliminar dela, E
--   - o KRI NÃO está ligado a nenhum risco que não seja preliminar.
-- Assim a CGOV prepara o KRI da ficha preliminar, mas não mexe num KRI que já
-- serve a um risco da unidade. Num KRI novo (INSERT), ainda não há ligação: a
-- ligação em si passa pela política de kri_riscos (só a risco preliminar).
-- Ex.: cgov@ + KRI ligado só ao preliminar → true; o mesmo KRI ligado também
--      a um rascunho da unidade → false; gestor.uc@ → sempre false.
CREATE OR REPLACE FUNCTION public.cgov_grava_no_kri_preliminar(p_kri uuid, p_objeto uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((public.meu_perfil()).papel_governanca = 'cgov', false)
     AND EXISTS (SELECT 1 FROM public.riscos AS r
                  WHERE r.objeto_id = p_objeto AND r.status_fluxo = 'preliminar_cgov')
     AND NOT EXISTS (SELECT 1
                       FROM public.kri_riscos AS l
                       JOIN public.riscos AS r ON r.id = l.risco_id
                      WHERE l.kri_id = p_kri AND r.status_fluxo <> 'preliminar_cgov');
$$;

REVOKE EXECUTE ON FUNCTION public.cgov_grava_no_kri_preliminar(uuid, uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.cgov_grava_no_kri_preliminar(uuid, uuid) TO authenticated;

-- 4.1 indicadores_kri: as políticas antigas (pelo risco_id) saem.
DROP POLICY "KRIs: leitura no alcance"                ON public.indicadores_kri;
DROP POLICY "KRIs: cria no risco da própria unidade"  ON public.indicadores_kri;
DROP POLICY "KRIs: altera no risco da própria unidade" ON public.indicadores_kri;
DROP POLICY "KRIs: apaga no risco da própria unidade" ON public.indicadores_kri;
DROP POLICY "KRIs: CGOV cria no risco preliminar"     ON public.indicadores_kri;
DROP POLICY "KRIs: CGOV altera no risco preliminar"   ON public.indicadores_kri;
DROP POLICY "KRIs: CGOV apaga no risco preliminar"    ON public.indicadores_kri;

-- Leitura: o objeto está no alcance (a mesma regra dos riscos: o objeto
-- aparece na consulta a objetos_contexto, que já tem RLS).
CREATE POLICY "KRIs: leitura no alcance"
  ON public.indicadores_kri FOR SELECT TO authenticated
  USING (objeto_id IN (SELECT o.id FROM public.objetos_contexto AS o));

CREATE POLICY "KRIs: cria no objeto da própria unidade"
  ON public.indicadores_kri FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(objeto_id));

CREATE POLICY "KRIs: altera no objeto da própria unidade"
  ON public.indicadores_kri FOR UPDATE TO authenticated
  USING      (public.pode_escrever_objeto(objeto_id))
  WITH CHECK (public.pode_escrever_objeto(objeto_id));

CREATE POLICY "KRIs: apaga no objeto da própria unidade"
  ON public.indicadores_kri FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(objeto_id));

CREATE POLICY "KRIs: CGOV cria no objeto com risco preliminar"
  ON public.indicadores_kri FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_kri_preliminar(id, objeto_id));

CREATE POLICY "KRIs: CGOV altera o KRI do risco preliminar"
  ON public.indicadores_kri FOR UPDATE TO authenticated
  USING      (public.cgov_grava_no_kri_preliminar(id, objeto_id))
  WITH CHECK (public.cgov_grava_no_kri_preliminar(id, objeto_id));

CREATE POLICY "KRIs: CGOV apaga o KRI do risco preliminar"
  ON public.indicadores_kri FOR DELETE TO authenticated
  USING (public.cgov_grava_no_kri_preliminar(id, objeto_id));

-- 4.2 kri_riscos (nova): leitura quando o risco está no alcance; escrita por
-- quem escreve no objeto do risco (o gatilho 3.2 garante que o KRI é do mesmo
-- objeto). A CGOV liga e desliga KRI só no risco preliminar dela.
ALTER TABLE public.kri_riscos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kri_riscos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kri_riscos TO authenticated;

CREATE POLICY "Ligações KRI: leitura no alcance"
  ON public.kri_riscos FOR SELECT TO authenticated
  USING (risco_id IN (SELECT r.id FROM public.riscos AS r));

CREATE POLICY "Ligações KRI: cria no risco da própria unidade"
  ON public.kri_riscos FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = kri_riscos.risco_id)));

CREATE POLICY "Ligações KRI: altera no risco da própria unidade"
  ON public.kri_riscos FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = kri_riscos.risco_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = kri_riscos.risco_id)));

CREATE POLICY "Ligações KRI: apaga no risco da própria unidade"
  ON public.kri_riscos FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = kri_riscos.risco_id)));

CREATE POLICY "Ligações KRI: CGOV cria no risco preliminar"
  ON public.kri_riscos FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Ligações KRI: CGOV altera no risco preliminar"
  ON public.kri_riscos FOR UPDATE TO authenticated
  USING      (public.cgov_grava_no_risco_preliminar(risco_id))
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Ligações KRI: CGOV apaga no risco preliminar"
  ON public.kri_riscos FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(risco_id));

-- 4.3 medicoes_kri: o caminho passa a ser medição → KRI → objeto.
-- (A leitura "kri_id IN (SELECT k.id FROM indicadores_kri)" não usava
-- risco_id e continua como está: segue a nova leitura do KRI.)
DROP POLICY "Medições: cria no KRI da própria unidade"     ON public.medicoes_kri;
DROP POLICY "Medições: altera no KRI da própria unidade"   ON public.medicoes_kri;
DROP POLICY "Medições: apaga no KRI da própria unidade"    ON public.medicoes_kri;
DROP POLICY "Medições: CGOV cria no KRI do risco preliminar"   ON public.medicoes_kri;
DROP POLICY "Medições: CGOV altera no KRI do risco preliminar" ON public.medicoes_kri;
DROP POLICY "Medições: CGOV apaga no KRI do risco preliminar"  ON public.medicoes_kri;

CREATE POLICY "Medições: cria no KRI da própria unidade"
  ON public.medicoes_kri FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: altera no KRI da própria unidade"
  ON public.medicoes_kri FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: apaga no KRI da própria unidade"
  ON public.medicoes_kri FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: CGOV cria no KRI do risco preliminar"
  ON public.medicoes_kri FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_kri_preliminar(medicoes_kri.kri_id,
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: CGOV altera no KRI do risco preliminar"
  ON public.medicoes_kri FOR UPDATE TO authenticated
  USING (public.cgov_grava_no_kri_preliminar(medicoes_kri.kri_id,
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)))
  WITH CHECK (public.cgov_grava_no_kri_preliminar(medicoes_kri.kri_id,
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: CGOV apaga no KRI do risco preliminar"
  ON public.medicoes_kri FOR DELETE TO authenticated
  USING (public.cgov_grava_no_kri_preliminar(medicoes_kri.kri_id,
    (SELECT k.objeto_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

-- ----------------------------------------------------------------------------
-- 5. Limpeza dos valores que ninguém definiu
-- ----------------------------------------------------------------------------
-- Com o sinal radar.fluxo ligado (só neste bloco): o gatilho de trava e
-- reabertura de indicadores_kri não reabre aprovados nem recusa a limpeza de
-- KRIs de riscos em validação. Nenhum status_fluxo muda. Só as linhas que de
-- fato mudam são atualizadas (cada uma deixa um registro na trilha).
DO $$
DECLARE
  v_sinal text := coalesce(current_setting('radar.fluxo', true), '');
BEGIN
  PERFORM set_config('radar.fluxo', 'on', true);

  -- 5.1 A assinatura do importador: os QUATRO valores inventados juntos.
  -- Ex.: ('Definido preliminarmente via skill CGOV', 'SEI / Sistema Setorial',
  --      '100%', '< 80%') → os quatro viram NULL. Se a meta já foi trocada
  --      pela unidade (ex.: '95%'), a linha fica como está.
  UPDATE public.indicadores_kri
     SET formula_calculo = NULL,
         fonte_dados     = NULL,
         meta_alvo       = NULL,
         limite_alerta   = NULL
   WHERE formula_calculo = 'Definido preliminarmente via skill CGOV'
     AND fonte_dados     = 'SEI / Sistema Setorial'
     AND meta_alvo       = '100%'
     AND limite_alerta   = '< 80%';

  -- 5.2 Marcadores ("A definir", "A definir pela unidade", vazio, só espaços;
  -- qualquer caixa): o campo que não é NULL e não está preenchido vira NULL.
  -- O nome do indicador continua obrigatório (NOT NULL) e não é tocado.
  UPDATE public.indicadores_kri
     SET formula_calculo     = CASE WHEN public.fn_texto_preenchido(formula_calculo)     THEN formula_calculo     END,
         fonte_dados         = CASE WHEN public.fn_texto_preenchido(fonte_dados)         THEN fonte_dados         END,
         periodicidade       = CASE WHEN public.fn_texto_preenchido(periodicidade)       THEN periodicidade       END,
         meta_alvo           = CASE WHEN public.fn_texto_preenchido(meta_alvo)           THEN meta_alvo           END,
         limite_alerta       = CASE WHEN public.fn_texto_preenchido(limite_alerta)       THEN limite_alerta       END,
         responsavel_medicao = CASE WHEN public.fn_texto_preenchido(responsavel_medicao) THEN responsavel_medicao END
   WHERE (formula_calculo     IS NOT NULL AND NOT public.fn_texto_preenchido(formula_calculo))
      OR (fonte_dados         IS NOT NULL AND NOT public.fn_texto_preenchido(fonte_dados))
      OR (periodicidade       IS NOT NULL AND NOT public.fn_texto_preenchido(periodicidade))
      OR (meta_alvo           IS NOT NULL AND NOT public.fn_texto_preenchido(meta_alvo))
      OR (limite_alerta       IS NOT NULL AND NOT public.fn_texto_preenchido(limite_alerta))
      OR (responsavel_medicao IS NOT NULL AND NOT public.fn_texto_preenchido(responsavel_medicao));

  PERFORM set_config('radar.fluxo', v_sinal, true);
END;
$$;


-- ============================================================================
-- 2ª PARTE (Tarefa 3) — a trava exige KRI completo; a ficha liga o KRI do
-- objeto; a DAR devolve com o motivo real; risco_id sai (seções 6 a 10)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
--   6. fn_trava_risco_critico ganha o 3º motivo: o risco crítico (fora do
--      apetite da DAR ou, por regra do sistema, com DAR pendente) precisa de
--      pelo menos um KRI COMPLETO ligado a ele (Metodologia 4.7.1). A ordem
--      dos motivos continua a da LAC-13: "Aceitar" → sem ação → sem KRI.
--      Ex.: crítico com Mitigar + uma ação e sem KRI → recusa 23514:
--        RADAR: o risco RADAR-2026-004 é crítico (fora do apetite da DAR ou
--        com DAR pendente) e precisa de tratamento: falta um KRI completo
--        (nome, fórmula, fonte, periodicidade, limite de alerta e responsável).
--      Como os envoltórios (enviar, validar, homologar) já chamam essa
--      função, eles passam a exigir o KRI sem mudar uma linha.
--      As três bases (fn_base_*) são recriadas iguais às de 20261122002, com
--      uma linha a mais: a categoria do risco fica presa (FOR SHARE) antes de
--      qualquer leitura do apetite (sobra da LAC-13: fecha a corrida com uma
--      mudança simultânea da DAR).
--   7. Alterar ou excluir a DEFINIÇÃO de um KRI passa pela trava e pela
--      reabertura de CADA risco ligado a ele (fn_trava_reabertura_kri). Se um
--      deles estiver em validação ou homologação, nada é gravado ("ficha
--      travada"); os aprovados reabrem. Criar KRI (ainda sem ligação) e o
--      UPDATE que não muda nada continuam livres. A ligação (kri_riscos) só
--      se cria ou se apaga: sai o UPDATE.
--   8. salvar_ficha_risco: a lista "kris" da ficha passa a dizer QUAIS KRIs do
--      objeto servem ao risco (criar, alterar, só ligar, desligar). Ela nunca
--      apaga um KRI que outro risco ainda usa: só desliga. A trava embutida
--      (2d) também exige o KRI completo.
--   9. fn_dar_reavaliar_aprovados: o histórico da devolução diz o motivo real
--      (o que fn_trava_risco_critico devolveu) e a situação atual do risco.
--      ler_auditoria passa a achar o código do risco pelas ligações.
--  10. A ponte temporária da 1ª parte sai e a coluna indicadores_kri.risco_id
--      é removida. Fica, num comentário, a consulta dos aprovados antigos fora
--      da regra (a migração não muda o estado de nenhum risco).
--
-- CONFERÊNCIA FEITA ANTES DE REMOVER risco_id (2026-11-22): grep em
-- supabase/migrations e varredura de pg_proc.prosrc no banco local. As
-- funções vivas que liam indicadores_kri.risco_id eram salvar_ficha_risco,
-- ler_auditoria, fn_trava_reabertura_ficha (pelo gatilho trg_kris_trava_
-- reabertura de indicadores_kri) e as duas da ponte; todas são recriadas,
-- religadas ou apagadas abaixo. As outras que citam "risco_id" junto de
-- indicadores_kri leem o risco_id de kri_riscos, controles ou respostas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6. A trava do risco crítico exige KRI completo
-- ----------------------------------------------------------------------------
-- 6.1 fn_trava_risco_critico: recriada igual à de 20261122002, com o 3º motivo.
-- Devolve:
--   NULL                                     → passa;
--   'a estratégia "Aceitar" não é permitida' → crítico com "Aceitar";
--   'falta uma ação de tratamento (5W2H)'    → crítico sem ação que não seja "Aceitar";
--   'falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de
--    alerta e responsável)'                  → crítico sem KRI completo ligado.
-- O KRI pode ser compartilhado com outros riscos do mesmo objeto: basta UM
-- KRI completo ligado (ex.: o mesmo KRI serve a R-01 e R-04 → os dois passam).
-- SECURITY DEFINER: lê qualquer risco (o gatilho da DAR roda como o dono).
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

  -- 3º motivo (LAC-03): pelo menos um KRI completo ligado ao risco.
  IF NOT EXISTS (SELECT 1
                   FROM public.kri_riscos AS l
                   JOIN public.indicadores_kri AS k ON k.id = l.kri_id
                  WHERE l.risco_id = p_risco AND public.fn_kri_completo(k)) THEN
    RETURN 'falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável)';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_trava_risco_critico(uuid) FROM public, anon, authenticated;

-- 6.2 As três bases, com a categoria presa (FOR SHARE). Corpo igual ao de
-- 20261122002 (seção 2); a única linha nova vem logo depois de ler e travar a
-- ficha. Os envoltórios e as permissões não mudam.
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

  -- LAC-03 (sobra da LAC-13): segura a linha da categoria (FOR SHARE) ANTES
  -- de qualquer leitura do apetite. Uma mudança simultânea da DAR espera este
  -- comando terminar (ou este espera a DAR), e o recálculo nunca usa um
  -- apetite que está sendo trocado no mesmo instante.
  PERFORM 1 FROM public.categorias_risco AS c WHERE c.id = v_risco.categoria_id FOR SHARE;

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

  -- LAC-03 (sobra da LAC-13): segura a linha da categoria (FOR SHARE) ANTES
  -- de qualquer leitura do apetite. Uma mudança simultânea da DAR espera este
  -- comando terminar (ou este espera a DAR), e o recálculo nunca usa um
  -- apetite que está sendo trocado no mesmo instante.
  PERFORM 1 FROM public.categorias_risco AS c WHERE c.id = v_risco.categoria_id FOR SHARE;

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

  -- LAC-03 (sobra da LAC-13): segura a linha da categoria (FOR SHARE) ANTES
  -- de qualquer leitura do apetite. Uma mudança simultânea da DAR espera este
  -- comando terminar (ou este espera a DAR), e o recálculo nunca usa um
  -- apetite que está sendo trocado no mesmo instante.
  PERFORM 1 FROM public.categorias_risco AS c WHERE c.id = v_risco.categoria_id FOR SHARE;

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

-- ----------------------------------------------------------------------------
-- 7. Trava e reabertura da DEFINIÇÃO do KRI (todos os riscos ligados)
-- ----------------------------------------------------------------------------
-- Antes, o gatilho trg_kris_trava_reabertura usava fn_trava_reabertura_ficha,
-- que olha UM risco (indicadores_kri.risco_id). Agora o KRI pode servir a
-- vários riscos do objeto, então a trava passa por CADA um deles.
--   - INSERT: livre (KRI novo ainda não tem ligação; ligar é que "mexe na
--     ficha", pelo gatilho de kri_riscos);
--   - UPDATE que não muda nada: livre;
--   - UPDATE/DELETE: fn_fluxo_aplicar_trava em cada risco ligado. Risco em
--     validação ou homologação → recusa (e o comando inteiro é desfeito, até
--     a reabertura de outro risco ligado); aprovado → reabre.
-- Ordem fixa (por risco_id), para dois comandos simultâneos travarem os
-- riscos na mesma ordem.
-- Ex.: KRI ligado a R-01 (aprovado) e R-04 (em validação). Mudar a fórmula →
--      "a ficha do risco R-04 está travada"; R-01 continua aprovado.
--      KRI ligado a dois aprovados → os dois voltam a em_validacao_cg.
-- Quando o KRI é apagado porque ficou órfão (gatilho de kri_riscos), ele já
-- não tem ligação: nada a travar.
CREATE OR REPLACE FUNCTION public.fn_trava_reabertura_kri()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco  uuid;
  v_origem text;
BEGIN
  IF coalesce(current_setting('radar.fluxo', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) = to_jsonb(OLD) THEN
    RETURN NEW;                    -- nada mudou: nada a travar nem reabrir
  END IF;

  v_origem := CASE TG_OP WHEN 'UPDATE' THEN 'alteração' ELSE 'exclusão' END
              || ' em definição do KRI';

  FOR v_risco IN
    SELECT l.risco_id FROM public.kri_riscos AS l WHERE l.kri_id = OLD.id ORDER BY l.risco_id
  LOOP
    PERFORM public.fn_fluxo_aplicar_trava(v_risco, v_origem);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_trava_reabertura_kri() FROM public, anon, authenticated;

DROP TRIGGER trg_kris_trava_reabertura ON public.indicadores_kri;
CREATE TRIGGER trg_kris_trava_reabertura
BEFORE UPDATE OR DELETE ON public.indicadores_kri
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_reabertura_kri();

-- 7.1 kri_riscos sem UPDATE: uma ligação só se cria ou se apaga. Com UPDATE,
-- trocar o kri_id de uma ligação deixaria o KRI antigo sem ligação (órfão)
-- sem passar pelo gatilho que apaga o órfão (ele é AFTER DELETE).
DROP POLICY "Ligações KRI: altera no risco da própria unidade" ON public.kri_riscos;
DROP POLICY "Ligações KRI: CGOV altera no risco preliminar"    ON public.kri_riscos;
REVOKE UPDATE ON public.kri_riscos FROM authenticated;

-- ----------------------------------------------------------------------------
-- 8. salvar_ficha_risco: a ficha liga o KRI do objeto
-- ----------------------------------------------------------------------------
-- Recriada a partir do corpo de 20261122002 (seção 3), com estas mudanças:
--   - v_objeto: o objeto do risco GRAVADO (o KRI tem de ser dele);
--   - a conferência dos ids: o KRI tem de ser do objeto do risco (não mais
--     "do risco"); a mensagem continua com "não pertence ao risco" (o front,
--     errosBanco.ts, reconhece esse trecho);
--   - 2c reescrita (ver o comentário dentro da função);
--   - 2d com o 3º motivo da trava (KRI completo).
-- Continua SECURITY INVOKER: a RLS de quem grava vale em tudo (ver 20261122002).
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
           meta_alvo, limite_alerta, responsavel_medicao)
        VALUES
          (v_objeto, v_kri.nome_indicador, v_kri.formula_calculo, v_kri.fonte_dados,
           v_kri.periodicidade, v_kri.meta_alvo, v_kri.limite_alerta, v_kri.responsavel_medicao)
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
            responsavel_medicao = v_kri.responsavel_medicao
          WHERE k.id = v_kri_id AND k.objeto_id = v_objeto;
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
  'RADAR (B3; LAC-13; LAC-03): grava a ficha do risco (risco + controles + respostas + ligações de KRI do objeto) num único comando, com as permissões de quem está logado; gera o código RADAR-<ano>-<NNN> na criação. Ver migrações 20261117001 (seção 2), 20261122002 e 20261122004 (seção 8).';

REVOKE EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.salvar_ficha_risco(jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. DAR com o motivo real; trilha de auditoria pelas ligações
-- ----------------------------------------------------------------------------
-- 9.1 fn_dar_reavaliar_aprovados: recriada igual à de 20261122002 (seção 4),
-- mudando SÓ o texto do ramo da devolução. Texto fixo:
--   DAR alterada: categoria <nome> com apetite <A> → <B>. O risco aprovado
--   (residual <n>, <classe>, <situação>) não passa na trava do risco crítico:
--   <motivo>. Voltou para a unidade ajustar.
-- <situação> = "fora do apetite da DAR" ou "com DAR pendente; por regra do
-- sistema, a trava do risco crítico também se aplica"; <motivo> = o texto de
-- fn_trava_risco_critico.
-- Ex.: a CGOV muda Privacidade de 'moderado' para 'baixo'. RADAR-X (aprovado,
--   residual 21,00, Extremo, já crítico, Mitigar + ação, sem KRI) → devolvido,
--   "... (residual 21.00, Extremo, fora do apetite da DAR) não passa na trava
--   do risco crítico: falta um KRI completo (...). Voltou para a unidade ajustar."
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
  v_motivo       text;            -- o que fn_trava_risco_critico devolveu (NULL = passa)
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

    v_motivo := public.fn_trava_risco_critico(v_novo.id);

    IF v_motivo IS NOT NULL THEN
      -- LAC-13/LAC-03: crítico (ou com DAR pendente) sem tratamento ou sem KRI
      -- completo não pode seguir aprovado nem subir à homologação: volta para
      -- a unidade ajustar. O texto diz o MOTIVO REAL e a situação atual, sem
      -- dizer "passou a Risco Crítico" (ele pode já ser crítico antes) e sem
      -- atribuir à Metodologia a regra da DAR pendente (é regra do sistema).
      v_texto := format(
        'DAR alterada: categoria %s com apetite %s → %s. O risco aprovado (residual %s, %s, %s) não passa na trava do risco crítico: %s. Voltou para a unidade ajustar.',
        NEW.nome, OLD.apetite_declarado, NEW.apetite_declarado,
        v_novo.nivel_residual, v_novo.classificacao_residual,
        CASE WHEN v_novo.status_critico = 'pendente_dar'
             THEN 'com DAR pendente; por regra do sistema, a trava do risco crítico também se aplica'
             ELSE 'fora do apetite da DAR' END,
        v_motivo);
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

REVOKE EXECUTE ON FUNCTION public.fn_dar_reavaliar_aprovados() FROM public, anon, authenticated;

-- 9.2 ler_auditoria: recriada igual à de 20261117001 (seção 3), mudando SÓ o
-- jeito de achar o código do risco (coluna codigo_radar):
--   - riscos                                       → pelo registro_id;
--   - controles, respostas e kri_riscos (nova)     → pelo risco_id dos dados;
--   - indicadores_kri → pelo risco_id dos dados (linhas antigas da trilha,
--     gravadas quando o KRI ainda tinha risco_id) ou, nas linhas novas, pelo
--     risco ligado ao KRI, QUANDO ele é um só;
--   - medicoes_kri    → pelo risco ligado ao KRI da medição, quando é um só.
-- KRI compartilhado por vários riscos: o código fica nulo (a linha é do KRI,
-- que serve a todos eles; a tela mostra o KRI, não um risco escolhido ao acaso).
-- Se o risco já foi apagado, vale o codigo_radar guardado nos dados (como antes).
CREATE OR REPLACE FUNCTION public.ler_auditoria(
  p_de        timestamptz DEFAULT NULL,
  p_ate       timestamptz DEFAULT NULL,
  p_tabela    text        DEFAULT NULL,
  p_antes_em  timestamptz DEFAULT NULL,
  p_antes_id  uuid        DEFAULT NULL,
  p_limite    int         DEFAULT 50
)
RETURNS TABLE (
  id               uuid,
  realizado_em     timestamptz,
  tabela_afetada   text,
  operacao         text,
  registro_id      uuid,
  objeto_id        uuid,
  usuario_id       uuid,
  quem_nome        text,
  quem_papel       text,
  codigo_radar     text,
  dados_anteriores jsonb,
  dados_novos      jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- 1) A página: filtra, aplica a visibilidade, ordena e limita.
  WITH pagina AS (
    SELECT a.*
      FROM public.auditoria_log AS a
     WHERE (
             (SELECT (public.meu_perfil()).papel_governanca) = 'cgov'
             OR (a.objeto_id IS NOT NULL AND public.pode_ler_objeto(a.objeto_id))
           )
       AND (p_de     IS NULL OR a.realizado_em >= p_de)
       AND (p_ate    IS NULL OR a.realizado_em <= p_ate)
       AND (p_tabela IS NULL OR a.tabela_afetada = p_tabela)
       AND (p_antes_em IS NULL
            OR a.realizado_em < p_antes_em
            OR (a.realizado_em = p_antes_em AND a.id < p_antes_id))
     ORDER BY a.realizado_em DESC, a.id DESC
     LIMIT least(greatest(coalesce(p_limite, 50), 1), 100)
  )
  -- 2) Só nas linhas da página: nome de quem agiu e código do risco.
  SELECT pg.id, pg.realizado_em, pg.tabela_afetada, pg.operacao, pg.registro_id,
         pg.objeto_id, pg.usuario_id,
         pf.nome_completo, pf.papel_governanca,
         coalesce(
           r.codigo_radar,
           pg.dados_anteriores ->> 'codigo_radar',
           pg.dados_novos ->> 'codigo_radar'
         ),
         pg.dados_anteriores, pg.dados_novos
    FROM pagina AS pg
    LEFT JOIN public.perfis_usuarios AS pf ON pf.id = pg.usuario_id
    -- O risco ligado ao KRI (da linha do KRI ou da medição), só quando é UM.
    -- (min(texto)::uuid: nem toda versão do PostgreSQL tem min() para uuid.)
    LEFT JOIN LATERAL (
      SELECT CASE WHEN count(*) = 1 THEN min(l.risco_id::text)::uuid END AS risco_id
        FROM public.kri_riscos AS l
       WHERE pg.tabela_afetada IN ('indicadores_kri', 'medicoes_kri')
         AND l.kri_id = CASE WHEN pg.tabela_afetada = 'indicadores_kri' THEN pg.registro_id
                             ELSE (coalesce(pg.dados_novos, pg.dados_anteriores) ->> 'kri_id')::uuid
                        END
    ) AS lk ON true
    LEFT JOIN public.riscos AS r
           ON r.id = CASE
                WHEN pg.tabela_afetada = 'riscos' THEN pg.registro_id
                WHEN pg.tabela_afetada IN ('controles_existentes', 'respostas_tratamento', 'kri_riscos')
                  THEN (coalesce(pg.dados_novos, pg.dados_anteriores) ->> 'risco_id')::uuid
                WHEN pg.tabela_afetada = 'indicadores_kri'
                  THEN coalesce((coalesce(pg.dados_novos, pg.dados_anteriores) ->> 'risco_id')::uuid, lk.risco_id)
                WHEN pg.tabela_afetada = 'medicoes_kri' THEN lk.risco_id
              END
   ORDER BY pg.realizado_em DESC, pg.id DESC;
$$;

COMMENT ON FUNCTION public.ler_auditoria(timestamptz, timestamptz, text, timestamptz, uuid, int) IS
  'RADAR (B3; LAC-03): trilha de auditoria paginada por cursor (máx. 100), só com as linhas que a política de auditoria_log já permite, acrescida do nome de quem agiu e do código do risco (pelas ligações de KRI quando é um só). Ver migrações 20261117001 (seção 3) e 20261122004 (seção 9.2).';

REVOKE EXECUTE ON FUNCTION public.ler_auditoria(timestamptz, timestamptz, text, timestamptz, uuid, int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ler_auditoria(timestamptz, timestamptz, text, timestamptz, uuid, int) TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. Fim da ponte: a coluna indicadores_kri.risco_id sai
-- ----------------------------------------------------------------------------
-- Quem diz a que riscos o KRI serve é kri_riscos (copiada na seção 3.1). Os
-- gatilhos e as funções da ponte (seção 3.7) e o congelamento do risco_id saem
-- junto. A chave estrangeira e o índice da coluna caem com ela.
DROP TRIGGER trg_kris_ponte_preenche_objeto ON public.indicadores_kri;
DROP TRIGGER trg_kris_ponte_liga_risco      ON public.indicadores_kri;
DROP FUNCTION public.fn_kri_ponte_preenche_objeto();
DROP FUNCTION public.fn_kri_ponte_liga_risco();

ALTER TABLE public.indicadores_kri DROP COLUMN risco_id;

-- 10.1 Aprovados antigos fora da regra (consulta SÓ DE LEITURA, para a CGOV
-- cobrar das unidades; vai para o guia-supabase-nuvem na Tarefa 9). A migração
-- não muda o estado de nenhum risco: o aprovado crítico sem KRI completo (ou
-- sem tratamento) continua aprovado até a ficha ser editada ou a DAR mudar.
-- Pronta para copiar no SQL Editor (como administrador):
--
--   select r.codigo_radar, r.status_critico, r.nivel_residual, r.classificacao_residual,
--          public.fn_trava_risco_critico(r.id) as motivo, o.unidade_id
--     from public.riscos as r
--     join public.objetos_contexto as o on o.id = r.objeto_id
--    where r.status_fluxo = 'aprovado'
--      and r.status_critico in ('sim', 'pendente_dar')
--      and public.fn_trava_risco_critico(r.id) is not null
--    order by r.codigo_radar;

