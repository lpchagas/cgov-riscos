-- ============================================================================
-- ETAPA B1.1 / TAREFA 1 — Fluxo da Presidência (decisão P-B1-1, CGOV, 2026-11-15)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela árvore da B1, a Presidência não tem chefia acima (ninguém validava os
-- riscos dela) e a Assessoria da Presidência (icmbio_id 10.0001) seria
-- validada pelo próprio Presidente. A CGOV decidiu uma exceção consciente:
--
--   Riscos da PRESIDÊNCIA (tipo `presidencia`) e da ASSESSORIA DA PRESIDÊNCIA:
--     2º degrau (VALIDA)   → o titular do GABIN (icmbio_id 10.0002);
--     3º degrau (HOMOLOGA) → o titular da Presidência (icmbio_id 10.0000).
--
--   (O GABIN é subordinado ao Presidente na árvore; por isso é uma exceção.)
--
-- Só duas funções mudam, recriadas com CREATE OR REPLACE (mesma assinatura,
-- SECURITY DEFINER, search_path vazio; os GRANT/REVOKE da migração
-- 20261115002 são mantidos pelo próprio CREATE OR REPLACE):
--
--   chefia_imediata(u): Presidência ou Assessoria → GABIN.
--   homologador_de(u):  Presidência ou Assessoria → a Presidência.
--
-- O resto do fluxo (migração 20261115004) NÃO é tocado. Ele já chama essas
-- duas funções, e a segregação D1 ("sobe um nível") passa a funcionar sozinha:
--
--   Exemplo 1 — gestor da Assessoria envia um risco CRÍTICO:
--     validador   = GABIN (titular do GABIN valida) → em_homologacao_dir
--     homologador = Presidência (Presidente homologa) → aprovado.
--   Exemplo 2 — o PRÓPRIO Presidente envia um risco crítico da Presidência:
--     valida o titular do GABIN, mas o homologador "sobe um nível": a
--     Presidência é do Presidente (quem enviou) e acima dela não há ninguém.
--     fn_fluxo_homologador_efetivo devolve nulo e validar_risco recusa com
--     "RADAR: o risco ... exige homologação, mas a unidade não tem ..."
--     (55000). O Presidente nunca homologa o próprio risco.
--   Exemplo 3 — o GABIN em si (unidade filha da Presidência): continua como
--     antes (chefia = Presidência), pois a exceção vale só para a Presidência
--     e a Assessoria.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8) nem em migrações antigas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. chefia_imediata(unidade): quem VALIDA (2º degrau)
-- ----------------------------------------------------------------------------
-- Regra nova (1º WHEN): Presidência (tipo `presidencia`) ou Assessoria da
-- Presidência (icmbio_id '10.0001') → a unidade GABIN (icmbio_id '10.0002').
-- Se a unidade GABIN não existir (árvore sem ela), o subselect devolve nulo e
-- o envio é recusado com a mensagem de "sem chefia imediata" (já existente).
-- Demais unidades: regra anterior (CT quando a mãe é GR e há vínculo; senão a mãe).
CREATE OR REPLACE FUNCTION public.chefia_imediata(unidade uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
           WHEN u.tipo = 'presidencia' OR u.icmbio_id = '10.0001'
             THEN (SELECT g.id FROM public.unidades AS g WHERE g.icmbio_id = '10.0002')
           WHEN u.coordenacao_territorial_id IS NOT NULL AND mae.tipo = 'gerencia-regional'
             THEN u.coordenacao_territorial_id
           ELSE u.unidade_pai_id
         END
    FROM public.unidades AS u
    LEFT JOIN public.unidades AS mae ON mae.id = u.unidade_pai_id
   WHERE u.id = unidade;
$$;

-- ----------------------------------------------------------------------------
-- 2. homologador_de(unidade): quem HOMOLOGA (3º degrau)
-- ----------------------------------------------------------------------------
-- Regra nova: para a Presidência e a Assessoria, o homologador é a Presidência
-- (a própria, no caso da Presidência — antes seria nulo, pois não tem
-- ancestral). Para as demais unidades, a busca pelos ancestrais é a mesma de
-- antes: 1º Gerência Regional, 2º Diretoria, 3º Presidência.
CREATE OR REPLACE FUNCTION public.homologador_de(unidade uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE ancestrais(id, tipo, nivel, caminho) AS (
    -- nível 1: a mãe da unidade
    SELECT mae.id, mae.tipo, 1, ARRAY[u.id, mae.id]
      FROM public.unidades AS u
      JOIN public.unidades AS mae ON mae.id = u.unidade_pai_id
     WHERE u.id = unidade
    UNION ALL
    -- nível seguinte: a mãe da mãe, e assim por diante (sem repetir unidade)
    SELECT avo.id, avo.tipo, a.nivel + 1, a.caminho || avo.id
      FROM ancestrais AS a
      JOIN public.unidades AS atual ON atual.id = a.id
      JOIN public.unidades AS avo   ON avo.id = atual.unidade_pai_id
     WHERE NOT (avo.id = ANY (a.caminho))
  )
  SELECT coalesce(
    -- Exceção P-B1-1: Presidência e Assessoria → a unidade da Presidência.
    (SELECT p.id
       FROM public.unidades AS u
       JOIN public.unidades AS p ON p.tipo = 'presidencia'
      WHERE u.id = unidade
        AND (u.tipo = 'presidencia' OR u.icmbio_id = '10.0001')
      ORDER BY p.icmbio_id
      LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'gerencia-regional' ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'diretoria'         ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'presidencia'       ORDER BY a.nivel LIMIT 1));
$$;

-- Garantia: as permissões continuam as da B1 (CREATE OR REPLACE já as preserva;
-- repetimos para deixar a intenção explícita).
REVOKE EXECUTE ON FUNCTION public.chefia_imediata(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.homologador_de(uuid)  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.chefia_imediata(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.homologador_de(uuid)  TO authenticated;
