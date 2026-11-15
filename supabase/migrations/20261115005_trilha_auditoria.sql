-- ============================================================================
-- MIGRAÇÃO 20261115005 — TRILHA DE AUDITORIA (Etapa B1, Tarefa 8)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A tabela `auditoria_log` é o "caderno de ocorrências" do RADAR. Esta migração:
--   1. acrescenta as colunas que faltavam: `objeto_id` (de qual objeto de
--      contexto é o registro), `usuario_id` (quem mexeu) e `dados_anteriores`
--      (como o registro era antes);
--   2. cria o gatilho `fn_registrar_auditoria()` e o liga em 8 tabelas:
--      - as 6 da ficha de risco: objetos_contexto, riscos,
--        controles_existentes, respostas_tratamento, indicadores_kri e
--        medicoes_kri;
--      - perfis_usuarios: a troca de perfil, de unidade ou de TITULARIDADE
--        (`titular_chefia` decide quem valida e homologa) fica registrada,
--        como pede a matriz de acesso (seção 5: "o registro da troca fica na
--        trilha de auditoria");
--      - categorias_risco: a mudança do apetite da DAR (decide o que é
--        "risco crítico") também fica registrada;
--   3. libera a LEITURA conforme o alcance de cada pessoa e fecha a ESCRITA:
--      ninguém grava na trilha à mão, só o gatilho.
--
-- Exemplo prático: o gestor da FLONA de Caçador troca as "causas" de um risco.
-- O gatilho anota: tabela = riscos, operação = UPDATE, usuário = id do gestor,
-- objeto_id = a FLONA, dados_anteriores = ficha antes, dados_novos = ficha depois.
-- Outro: a CGOV torna servidor.gr@ substituto em exercício da GR5. O gatilho
-- anota: tabela = perfis_usuarios, usuário = id da CGOV, objeto_id = NULO
-- (perfil não pertence a um objeto), antes titular_chefia=false, depois true.
--
-- A RLS de `auditoria_log` JÁ foi ligada na Tarefa 6 (e o TRUNCATE já foi
-- revogado lá). Aqui só criamos a política de leitura e retiramos o resto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colunas novas (sem apagar nada; as linhas antigas ficam com NULL)
-- ----------------------------------------------------------------------------
ALTER TABLE public.auditoria_log
  ADD COLUMN IF NOT EXISTS objeto_id        uuid,    -- sem FK de propósito: o objeto pode ser apagado e a trilha deve sobreviver
  ADD COLUMN IF NOT EXISTS usuario_id       uuid,    -- auth.uid(); NULL quando o banco é alterado direto pelo administrador
  ADD COLUMN IF NOT EXISTS dados_anteriores jsonb;   -- NULL em INSERT

-- `registro_id` era obrigatório e do tipo uuid. A DAR (categorias_risco) usa
-- id NÚMERO (1 a 8...), que não cabe num uuid. Em vez de mudar o tipo da
-- coluna (o que quebraria consultas já escritas), ela passa a aceitar NULO:
-- nas linhas de categorias_risco, registro_id fica nulo e o id da categoria
-- está em dados_novos->>'id' (ou dados_anteriores->>'id', no DELETE).
-- Ex.: select * from auditoria_log
--       where tabela_afetada = 'categorias_risco' and dados_novos->>'id' = '2';
ALTER TABLE public.auditoria_log ALTER COLUMN registro_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_log_objeto   ON public.auditoria_log (objeto_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_registro ON public.auditoria_log (registro_id);

-- ----------------------------------------------------------------------------
-- 2. O gatilho
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: roda com os poderes do dono (postgres), que ignora a RLS.
-- É isso que permite gravar na trilha sem dar INSERT a ninguém.
-- SET search_path = '': por segurança, todo nome vem qualificado (public.xxx).
--
-- Como descobrimos o `objeto_id` (usando NEW; em DELETE, OLD):
--   objetos_contexto  → o próprio id
--   riscos            → objeto_id
--   controles / respostas / KRIs → pelo risco (risco_id)
--   medicoes_kri      → pelo KRI (kri_id) e depois pelo risco
--   perfis_usuarios, categorias_risco → NULO (não pertencem a um objeto;
--                       só a CGOV lê essas linhas — ver a política abaixo)
--
-- DELETE EM CASCATA: ao apagar um risco, o banco apaga junto controles, KRIs
-- etc. Quando o gatilho do filho roda, o risco pai JÁ foi apagado e a consulta
-- não o encontra: o `objeto_id` desse filho fica NULO (sem quebrar o DELETE).
-- Linhas com `objeto_id` nulo só a CGOV lê (ver política abaixo).
--
-- NOTA sobre `validar_risco`: ela faz um UPDATE "para o mesmo estado" (para
-- recalcular a criticidade) antes da troca real; por isso gera UMA LINHA A MAIS
-- na trilha. É esperado: a trilha registra tudo o que passou pela tabela.
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
  IF TG_TABLE_NAME = 'categorias_risco' THEN
    v_id := NULL;
  ELSE
    v_id := (v_linha ->> 'id')::uuid;
  END IF;

  -- Descobre o objeto de contexto. Se a consulta não achar nada, fica NULL.
  IF TG_TABLE_NAME = 'objetos_contexto' THEN
    v_objeto := v_id;
  ELSIF TG_TABLE_NAME = 'riscos' THEN
    v_objeto := (v_linha ->> 'objeto_id')::uuid;
  ELSIF TG_TABLE_NAME IN ('controles_existentes', 'respostas_tratamento', 'indicadores_kri') THEN
    SELECT r.objeto_id INTO v_objeto
      FROM public.riscos AS r
     WHERE r.id = (v_linha ->> 'risco_id')::uuid;
  ELSIF TG_TABLE_NAME = 'medicoes_kri' THEN
    SELECT r.objeto_id INTO v_objeto
      FROM public.indicadores_kri AS k
      JOIN public.riscos AS r ON r.id = k.risco_id
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

-- Só o banco chama esta função (como gatilho). Ninguém a executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_registrar_auditoria() FROM public, anon, authenticated;

-- Um gatilho por tabela. Rodam DEPOIS (AFTER), já com a linha gravada e com o
-- cálculo do RADAR feito, então a trilha guarda os valores finais.
CREATE TRIGGER trg_auditoria_objetos_contexto
  AFTER INSERT OR UPDATE OR DELETE ON public.objetos_contexto
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_riscos
  AFTER INSERT OR UPDATE OR DELETE ON public.riscos
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_controles_existentes
  AFTER INSERT OR UPDATE OR DELETE ON public.controles_existentes
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_respostas_tratamento
  AFTER INSERT OR UPDATE OR DELETE ON public.respostas_tratamento
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_indicadores_kri
  AFTER INSERT OR UPDATE OR DELETE ON public.indicadores_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_medicoes_kri
  AFTER INSERT OR UPDATE OR DELETE ON public.medicoes_kri
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
-- Perfis (inclusive titularidade) e DAR: objeto_id nulo → só a CGOV lê.
CREATE TRIGGER trg_auditoria_perfis_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();
CREATE TRIGGER trg_auditoria_categorias_risco
  AFTER INSERT OR UPDATE OR DELETE ON public.categorias_risco
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();

-- ----------------------------------------------------------------------------
-- 3. Quem lê e quem grava
-- ----------------------------------------------------------------------------
-- Retira TUDO de visitantes e deixa só SELECT para quem está logado. Assim
-- INSERT/UPDATE/DELETE dão "permission denied" (42501) e só o gatilho grava.
REVOKE ALL ON public.auditoria_log FROM anon, authenticated;
GRANT SELECT ON public.auditoria_log TO authenticated;

-- Leitura:
--   - a `cgov` lê TUDO, inclusive linhas sem objeto (objeto_id nulo, como os
--     filhos apagados em cascata, as trocas de perfil e as mudanças da DAR)
--     e de objetos já apagados;
--   - os demais leem a trilha dos objetos que `pode_ler_objeto` permite (os de
--     alcance total — diretor, presidencia, auditoria, cgge, gabin — passam
--     por esse atalho, mas só enquanto o objeto ainda existir).
CREATE POLICY "Auditoria: leitura pelo alcance do objeto"
  ON public.auditoria_log FOR SELECT TO authenticated
  USING (
    (SELECT (public.meu_perfil()).papel_governanca) = 'cgov'
    OR (objeto_id IS NOT NULL AND public.pode_ler_objeto(objeto_id))
  );
-- INSERT/UPDATE/DELETE: nenhuma política (e nenhum privilégio) → só o gatilho.
