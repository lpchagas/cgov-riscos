-- ============================================================================
-- ETAPA B1.1, TAREFA 2 — Regras dos objetos de gestão de riscos
--   P-B1-2  unidade inativa      P-B1-3  processo inativo
--   P-B1-6  supervisor do objeto preenchido pelo banco
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
--   1. Ninguém (nem a CGOV) cria objeto NOVO em unidade com `ativa = false`.
--      Objetos antigos continuam legíveis; a CGOV pode reatribuí-los a uma
--      unidade ativa pela função reatribuir_objeto (seção 3).
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
--      Se o objeto SAI do processo (processo_id vira nulo), o supervisor herdado
--      do processo é limpo automaticamente. Se o supervisor do processo mudar (só o
--      importador sync:estrutura ou um administrador do banco escrevem em
--      processos_cadeia_valor; a CGOV não altera pela aplicação), os objetos ligados a ele são atualizados
--      (gatilho em processos_cadeia_valor, seção 4).
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
  ELSIF TG_OP = 'UPDATE' AND OLD.processo_id IS NOT NULL
        AND (NEW.macroprocesso_supervisor_id IS NULL
             OR NEW.macroprocesso_supervisor_id IS NOT DISTINCT FROM OLD.macroprocesso_supervisor_id) THEN
    -- O objeto SAIU do processo (processo_id foi a nulo) e o cliente não mexeu no
    -- supervisor (ou o mandou como nulo, que é o mesmo efeito): o valor antigo era "emprestado" do processo, então é limpo
    -- automaticamente, sem erro. (Se o cliente mandou outro valor, cai na regra abaixo.)
    NEW.macroprocesso_supervisor_id := NULL;
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
-- 3. reatribuir_objeto(objeto, nova_unidade): a CGOV move objeto de unidade INATIVA
-- ----------------------------------------------------------------------------
-- Por que uma função e não uma política de RLS? Uma política permissiva extra
-- deixaria QUALQUER escritor mover o próprio objeto para outra unidade (o
-- WITH CHECK das políticas permissivas se combinam com OU) e quebraria a regra
-- da B1 "ninguém empurra objeto para outra unidade" (os riscos herdam a unidade
-- do objeto: mover o objeto muda quem valida e homologa). A RLS original fica
-- intacta: UPDATE direto de unidade_id continua barrado. Esta função muda
-- SOMENTE unidade_id; o gatilho da seção 2 e a trilha de auditoria rodam
-- normalmente (auth.uid() é a pessoa da CGOV, então ela aparece como autora).
CREATE OR REPLACE FUNCTION public.reatribuir_objeto(objeto uuid, nova_unidade uuid)
RETURNS public.objetos_contexto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_obj   public.objetos_contexto;
  v_ativa boolean;
BEGIN
  IF NOT coalesce((public.meu_perfil()).papel_governanca = 'cgov', false) THEN
    RAISE EXCEPTION 'RADAR: só a CGOV reatribui objeto de unidade inativa'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT o.* INTO v_obj FROM public.objetos_contexto AS o WHERE o.id = objeto FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: objeto não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT u.ativa INTO v_ativa FROM public.unidades AS u WHERE u.id = v_obj.unidade_id;
  IF coalesce(v_ativa, false) THEN
    RAISE EXCEPTION 'RADAR: só objetos de unidade inativa podem ser reatribuídos'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  SELECT u.ativa INTO v_ativa FROM public.unidades AS u WHERE u.id = nova_unidade;
  IF NOT coalesce(v_ativa, false) THEN
    RAISE EXCEPTION 'RADAR: a unidade de destino não existe ou está inativa'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  UPDATE public.objetos_contexto SET unidade_id = nova_unidade
   WHERE id = objeto
  RETURNING * INTO v_obj;
  RETURN v_obj;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reatribuir_objeto(uuid, uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.reatribuir_objeto(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Supervisor do processo mudou: atualiza os objetos ligados a ele
-- ----------------------------------------------------------------------------
-- Sem isto, o supervisor antigo continuaria lendo os objetos (pela visão por
-- processo) até o próximo UPDATE de cada objeto. Roda também quando quem muda
-- é o importador (sincronizar_estrutura, service_role): é SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.propagar_supervisor_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.objetos_contexto
     SET macroprocesso_supervisor_id = NEW.unidade_supervisora_id
   WHERE processo_id = NEW.id
     AND macroprocesso_supervisor_id IS DISTINCT FROM NEW.unidade_supervisora_id;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.propagar_supervisor_processo() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_propagar_supervisor_processo ON public.processos_cadeia_valor;
CREATE TRIGGER trg_propagar_supervisor_processo
  AFTER UPDATE OF unidade_supervisora_id ON public.processos_cadeia_valor
  FOR EACH ROW
  WHEN (OLD.unidade_supervisora_id IS DISTINCT FROM NEW.unidade_supervisora_id)
  EXECUTE FUNCTION public.propagar_supervisor_processo();
