-- ============================================================================
-- LAC-03 — KRI do objeto, ligação muitos para muitos e KRI completo
-- (1ª parte: estrutura, dados, gatilhos e RLS — seções 1 a 5)
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
-- A Tarefa 3 reescreve essas funções, apaga a ponte e remove risco_id.
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
