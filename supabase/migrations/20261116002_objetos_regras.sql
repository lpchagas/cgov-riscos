-- ============================================================================
-- ETAPA B1.1, TAREFA 2 — Regras dos objetos de gestão de riscos
--   P-B1-2  unidade inativa      P-B1-3  processo inativo
--   P-B1-6  supervisor do objeto preenchido pelo banco
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
--   1. Ninguém (nem a CGOV) cria objeto NOVO em unidade com `ativa = false`.
--      Objetos antigos continuam legíveis; a CGOV pode reatribuí-los a uma
--      unidade ativa (política nova, abaixo).
--   2. Um vínculo NOVO com processo da cadeia de valor só vale para processo
--      ATIVO. Quem já estava ligado a um processo que depois foi inativado
--      continua editável (desde que não troque unidade nem processo), e o
--      Coordenador-Geral continua lendo (pode_ler_objeto ignora `ativo`).
--   3. `macroprocesso_supervisor_id`:
--        - COM processo: o banco grava sempre `unidade_supervisora_id` do
--          processo; o valor enviado pelo cliente é ignorado em silêncio.
--        - SEM processo: só a CGOV preenche/altera. Outra pessoa que tente
--          recebe erro `RADAR:` (escolha de projeto: recusar é mais honesto do
--          que ignorar sem avisar).
--   4. Conexões sem usuário (auth.uid() nulo: semente, importador service_role,
--      migrações) não passam pela regra "só a CGOV", pois não são pessoas; as
--      regras de unidade ativa e processo ativo valem para todos.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8) nem em migrações antigas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. pode_criar_objeto_em(u): agora exige unidade ATIVA
-- ----------------------------------------------------------------------------
-- Mesma função da B1 (20261115002) com um requisito a mais. A CGOV continua
-- criando em qualquer unidade existente — desde que ativa.
CREATE OR REPLACE FUNCTION public.pode_criar_objeto_em(unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.unidades AS u WHERE u.id = unidade AND u.ativa)
     AND (    public.pode_escrever_unidade(unidade)
           OR coalesce((public.meu_perfil()).papel_governanca = 'cgov', false));
$$;

REVOKE EXECUTE ON FUNCTION public.pode_criar_objeto_em(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.pode_criar_objeto_em(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Gatilho de regras de objetos_contexto
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regras_objeto_contexto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ativa      boolean;
  v_proc_ativo boolean;
  v_supervisora uuid;
  v_e_cgov     boolean;
BEGIN
  -- (a) Unidade NOVA (INSERT ou troca de unidade_id) precisa estar ativa.
  --     Um UPDATE que não troca a unidade passa direto (edição de histórico).
  IF TG_OP = 'INSERT' OR NEW.unidade_id IS DISTINCT FROM OLD.unidade_id THEN
    SELECT u.ativa INTO v_ativa FROM public.unidades AS u WHERE u.id = NEW.unidade_id;
    IF NOT coalesce(v_ativa, false) THEN
      RAISE EXCEPTION 'RADAR: a unidade está inativa; não é possível criar objeto nela nem reatribuir objeto para ela'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  END IF;

  -- (b) Vínculo NOVO com processo (INSERT ou troca de processo_id) exige processo ativo.
  --     Quem já tinha o vínculo e só edita outros campos não é barrado.
  IF NEW.processo_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.processo_id IS DISTINCT FROM OLD.processo_id) THEN
    SELECT p.ativo INTO v_proc_ativo
      FROM public.processos_cadeia_valor AS p WHERE p.id = NEW.processo_id;
    IF NOT coalesce(v_proc_ativo, false) THEN
      RAISE EXCEPTION 'RADAR: o processo da cadeia de valor está inativo; novos vínculos só aceitam processo ativo'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  END IF;

  -- (c) Supervisor do objeto.
  IF NEW.processo_id IS NOT NULL THEN
    -- Com processo: o banco decide; o valor enviado é ignorado em silêncio.
    SELECT p.unidade_supervisora_id INTO v_supervisora
      FROM public.processos_cadeia_valor AS p WHERE p.id = NEW.processo_id;
    NEW.macroprocesso_supervisor_id := v_supervisora;
  ELSIF (TG_OP = 'INSERT' AND NEW.macroprocesso_supervisor_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.macroprocesso_supervisor_id IS DISTINCT FROM OLD.macroprocesso_supervisor_id) THEN
    -- Sem processo: só a CGOV preenche/altera. auth.uid() nulo = semente,
    -- importador (service_role) ou administrador, que não são pessoas logadas.
    v_e_cgov := coalesce((public.meu_perfil()).papel_governanca = 'cgov', false);
    IF auth.uid() IS NOT NULL AND NOT v_e_cgov THEN
      RAISE EXCEPTION 'RADAR: sem processo vinculado, só a CGOV define o supervisor do objeto'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regras_objeto_contexto() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_regras_objeto_contexto ON public.objetos_contexto;
CREATE TRIGGER trg_regras_objeto_contexto
  BEFORE INSERT OR UPDATE ON public.objetos_contexto
  FOR EACH ROW EXECUTE FUNCTION public.regras_objeto_contexto();

-- ----------------------------------------------------------------------------
-- 3. Política: a CGOV reatribui objeto de UNIDADE INATIVA a uma unidade ativa
-- ----------------------------------------------------------------------------
-- Política PERMISSIVA somada à "Objetos: altera os da própria unidade" (as
-- permissivas se combinam com OU). USING: o objeto está hoje numa unidade
-- inativa; WITH CHECK: depois do UPDATE ele está numa unidade ATIVA. Na
-- prática a CGOV só consegue MOVER o objeto — qualquer outra edição de objeto
-- de unidade inativa deixaria a unidade inativa e seria recusada.
DROP POLICY IF EXISTS "Objetos: CGOV reatribui objeto de unidade inativa" ON public.objetos_contexto;
CREATE POLICY "Objetos: CGOV reatribui objeto de unidade inativa"
  ON public.objetos_contexto FOR UPDATE TO authenticated
  USING (
    coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false)
    AND EXISTS (SELECT 1 FROM public.unidades AS u
                 WHERE u.id = objetos_contexto.unidade_id AND NOT u.ativa)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.unidades AS u
             WHERE u.id = objetos_contexto.unidade_id AND u.ativa)
  );
