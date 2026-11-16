-- ============================================================================
-- ETAPA B1.1, TAREFA 3 — A CGOV mexe nos "filhos" do risco preliminar (P-B1-5)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
--   Um risco `preliminar_cgov` é uma ficha que a CGOV prepara em nome de uma
--   unidade, até a unidade "assumir" (função assumir_risco_preliminar). Na B1 a
--   CGOV já criava e editava a ficha (tabela `riscos`), mas não conseguia
--   preencher os controles, o plano de tratamento (5W2H) nem os KRIs dela.
--   Decisão P-B1-5: enquanto o risco está `preliminar_cgov`, a CGOV
--     - grava (INSERT/UPDATE/DELETE) controles, respostas, KRIs e medições dele;
--     - apaga o próprio risco preliminar (a regra D2 do gatilho já permite).
--   Depois que a unidade assume (vira `rascunho`), a CGOV perde tudo isso: as
--   políticas deixam de valer sozinhas, porque conferem o estado a cada comando.
--
-- SEGURANÇA — como as políticas permissivas se combinam:
--   O PostgreSQL junta as políticas permissivas de um comando com OU, e junta
--   SEPARADAMENTE as cláusulas USING (linha atual) e WITH CHECK (linha nova).
--   Num UPDATE, a linha antiga pode passar por uma política e a nova por outra.
--   Por isso cada política nova abaixo é COMPLETA nos dois lados: USING e
--   WITH CHECK exigem, ambos, "sou CGOV E o risco da linha é preliminar".
--   Análise das combinações com as políticas da B1 (que exigem
--   pode_escrever_objeto no objeto do risco, nos dois lados):
--     - USING nova + WITH CHECK da B1: a CGOV só passaria se escrevesse no
--       objeto do risco de destino, ou seja, em objeto da própria unidade
--       CGOV, onde já podia gravar. Mover filho para risco de OUTRA unidade que
--       não seja preliminar é negado (nenhuma das duas cláusulas aceita).
--     - USING da B1 + WITH CHECK nova: só leva a filho de objeto da própria CGOV
--       para um risco preliminar, algo que a CGOV já poderia criar do zero.
--   Nenhuma combinação dá à CGOV poder novo sobre riscos que não sejam
--   preliminares nem da própria CGOV. O teste 072 confere os casos.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8) nem em migrações antigas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Função auxiliar: "sou CGOV e este risco é preliminar da CGOV?"
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER para ler `riscos` sem depender da RLS (sempre devolve só um
-- booleano, sem vazar dados). Risco inexistente → false.
-- Ex.: cgov@ + risco em `preliminar_cgov` → true; depois da assunção → false;
--      gestor.uc@ + qualquer risco → false.
CREATE OR REPLACE FUNCTION public.cgov_grava_no_risco_preliminar(risco uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((public.meu_perfil()).papel_governanca = 'cgov', false)
     AND EXISTS (SELECT 1 FROM public.riscos AS r
                  WHERE r.id = risco AND r.status_fluxo = 'preliminar_cgov');
$$;

REVOKE EXECUTE ON FUNCTION public.cgov_grava_no_risco_preliminar(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.cgov_grava_no_risco_preliminar(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. riscos: a CGOV apaga o preliminar
-- ----------------------------------------------------------------------------
-- DELETE só tem USING (sem WITH CHECK), então a combinação com a política da B1
-- ("apaga os do próprio objeto") é um OU simples e inofensivo. O gatilho D2 já
-- aceita apagar `preliminar_cgov`.
CREATE POLICY "Riscos: CGOV apaga os preliminares"
  ON public.riscos FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(id));

-- ----------------------------------------------------------------------------
-- 3. Filhos do risco preliminar: INSERT / UPDATE / DELETE da CGOV
-- ----------------------------------------------------------------------------
-- 3.1 controles_existentes
CREATE POLICY "Controles: CGOV cria no risco preliminar"
  ON public.controles_existentes FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Controles: CGOV altera no risco preliminar"
  ON public.controles_existentes FOR UPDATE TO authenticated
  USING      (public.cgov_grava_no_risco_preliminar(risco_id))
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Controles: CGOV apaga no risco preliminar"
  ON public.controles_existentes FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(risco_id));

-- 3.2 respostas_tratamento
CREATE POLICY "Respostas: CGOV cria no risco preliminar"
  ON public.respostas_tratamento FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Respostas: CGOV altera no risco preliminar"
  ON public.respostas_tratamento FOR UPDATE TO authenticated
  USING      (public.cgov_grava_no_risco_preliminar(risco_id))
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "Respostas: CGOV apaga no risco preliminar"
  ON public.respostas_tratamento FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(risco_id));

-- 3.3 indicadores_kri
CREATE POLICY "KRIs: CGOV cria no risco preliminar"
  ON public.indicadores_kri FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "KRIs: CGOV altera no risco preliminar"
  ON public.indicadores_kri FOR UPDATE TO authenticated
  USING      (public.cgov_grava_no_risco_preliminar(risco_id))
  WITH CHECK (public.cgov_grava_no_risco_preliminar(risco_id));

CREATE POLICY "KRIs: CGOV apaga no risco preliminar"
  ON public.indicadores_kri FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(risco_id));

-- 3.4 medicoes_kri (o KRI do preliminar nasce vazio; a CGOV pode lançar/limpar
--     medições de teste enquanto o risco é dela). Caminho: medição → KRI → risco.
CREATE POLICY "Medições: CGOV cria no KRI do risco preliminar"
  ON public.medicoes_kri FOR INSERT TO authenticated
  WITH CHECK (public.cgov_grava_no_risco_preliminar(
    (SELECT k.risco_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: CGOV altera no KRI do risco preliminar"
  ON public.medicoes_kri FOR UPDATE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(
    (SELECT k.risco_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)))
  WITH CHECK (public.cgov_grava_no_risco_preliminar(
    (SELECT k.risco_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: CGOV apaga no KRI do risco preliminar"
  ON public.medicoes_kri FOR DELETE TO authenticated
  USING (public.cgov_grava_no_risco_preliminar(
    (SELECT k.risco_id FROM public.indicadores_kri AS k WHERE k.id = medicoes_kri.kri_id)));
