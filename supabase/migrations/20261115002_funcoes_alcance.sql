-- ============================================================================
-- ETAPA B1 / TAREFA 5 — Funções de alcance (quem vê, quem grava, quem valida)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Esta migração cria as funções que respondem às perguntas da matriz de
-- acesso (docs/01-normativos/matriz-acesso-responsabilidades.md):
--
--   meu_perfil()               → quem sou eu? (perfil ATIVO de quem está logado)
--   unidades_descendentes(u)   → a unidade u e tudo o que está abaixo dela
--   unidades_visiveis()        → de quais unidades eu vejo os riscos? (seção 4)
--   pode_ler_objeto(o)         → posso ler o objeto de gestão de riscos o?
--   pode_escrever_unidade(u)   → posso gravar fichas da unidade u?
--   pode_escrever_objeto(o)    → posso gravar no objeto o?
--   pode_criar_objeto_em(u)    → posso criar um objeto novo na unidade u?
--   chefia_imediata(u)         → que unidade VALIDA (2º degrau) as fichas de u?
--   homologador_de(u)          → que unidade HOMOLOGA (3º degrau) os riscos críticos de u?
--   e_titular_de(u)            → sou o chefe (ou substituto em exercício) de u?
--
-- As políticas de RLS (Tarefa 6), as funções do fluxo de aprovação (Tarefa 7)
-- e a trilha de auditoria (Tarefa 8) usam SEMPRE estas funções. Assim a regra
-- de alcance fica escrita num lugar só.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8) nem nas migrações anteriores.
--
-- SEGURANÇA (vale para todas as funções abaixo):
--   - SECURITY DEFINER: a função roda com os direitos do dono (postgres) e,
--     por isso, consegue ler `perfis_usuarios` e `unidades` mesmo quando a RLS
--     da Tarefa 6 bloquear a leitura direta. Sem isso, uma política de RLS que
--     chamasse a função cairia em laço (a função leria a tabela protegida pela
--     própria política).
--   - SET search_path = '' e nomes sempre com `public.`/`auth.`: ninguém
--     consegue "trocar" uma tabela por outra de mesmo nome num esquema seu.
--   - EXECUTE revogado de `public` e `anon` (visitante sem login) e concedido a
--     `authenticated` (quem fez login). Ver o fim do arquivo.
--   - Nenhuma função grava nada: todas são STABLE (só leem).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. meu_perfil(): a linha ATIVA de perfis_usuarios de quem está logado
-- ----------------------------------------------------------------------------
-- `auth.uid()` lê o id do usuário no crachá (JWT) da requisição.
-- Devolve nulo quando:
--   - a pessoa tem conta (auth.users) mas não tem perfil (ex.: sem-perfil@radar.test);
--   - o perfil existe mas está inativo (ex.: inativo@radar.test).
-- "Conta sem perfil ativo não vê nada" (spec, seção 7) começa aqui.
--
-- Exemplo de uso:  select (public.meu_perfil()).papel_governanca;  -- 'gestor'
CREATE OR REPLACE FUNCTION public.meu_perfil()
RETURNS public.perfis_usuarios
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.*
    FROM public.perfis_usuarios AS p
   WHERE p.id = auth.uid()
     AND p.ativo
   LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 2. unidades_descendentes(raiz): a raiz e TODAS as unidades abaixo dela
-- ----------------------------------------------------------------------------
-- Consulta recursiva sobre a árvore (`unidade_pai_id` = "quem é a mãe").
-- Exemplo: unidades_descendentes(FLONA do Tapajós) =
--   { FLONA do Tapajós, BAV Belterra, Serviço da FLONA }.
--
-- PROTEÇÃO CONTRA CICLO (ponto de atenção 1): se, por erro de cadastro, A for
-- mãe de B e B for mãe de A, uma recursão comum giraria para sempre. Aqui
-- usamos `UNION` (e não `UNION ALL`): o PostgreSQL descarta toda linha que já
-- apareceu antes, então, quando a volta do ciclo tenta trazer A de novo, nada
-- de novo entra e a recursão PARA. De quebra, nenhum id sai repetido.
--
-- Unidade inexistente (ou nula) → lista vazia.
CREATE OR REPLACE FUNCTION public.unidades_descendentes(raiz uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE descendentes(id) AS (
    -- ponto de partida: a própria raiz (se existir)
    SELECT u.id FROM public.unidades AS u WHERE u.id = raiz
    UNION
    -- passo: as filhas de quem já está na lista
    SELECT filha.id
      FROM public.unidades AS filha
      JOIN descendentes AS d ON filha.unidade_pai_id = d.id
  )
  SELECT d.id FROM descendentes AS d;
$$;

-- ----------------------------------------------------------------------------
-- 3. unidades_visiveis(): de quais unidades a pessoa logada vê os riscos
-- ----------------------------------------------------------------------------
-- Regras (matriz, seção 4; spec, seção 8.1; decisão R9 em decisoes-tecnicas-b1.md):
--   - sem perfil ativo ......................... nenhuma unidade;
--   - diretor, presidencia, auditoria, cgov,
--     cgge, gabin (alcance total) .............. TODAS as unidades;
--   - coordenador_territorial ................... a CT e suas descendentes
--       + as unidades VINCULADAS à CT pela coluna `coordenacao_territorial_id`
--         (NGIs e UCs, que na árvore ficam sob a GR) e as descendentes delas;
--   - demais (gestor, gerente_regional,
--     coordenador_geral) ........................ a própria unidade e as descendentes.
--
-- Exemplos com a semente:
--   gestor.uc@ (FLONA de Caçador) → a FLONA (não vê a ESEC do Taim, vizinha);
--   ct@ (CT Curitiba)             → a CT + FLONA de Caçador, ESEC do Taim, NGIs...;
--   gr@ (GR5)                     → tudo o que está abaixo da GR5.
--
-- Unidade INATIVA (ponto de atenção 2): não filtramos `ativa`. Quem está
-- lotado numa unidade desativada pelo importador continua vendo-a, e os riscos
-- antigos continuam visíveis (o histórico não some — Política, art. 15, VI).
CREATE OR REPLACE FUNCTION public.unidades_visiveis()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH eu AS (
    -- `meu_perfil()` devolve uma linha "toda nula" quando não há perfil ativo;
    -- o filtro `id IS NOT NULL` transforma isso em "nenhuma linha".
    SELECT p.papel_governanca AS papel, p.unidade_id
      FROM public.meu_perfil() AS p
     WHERE p.id IS NOT NULL
  ),
  raizes AS (
    -- a própria unidade (para quem NÃO tem alcance total)...
    SELECT eu.unidade_id AS id
      FROM eu
     WHERE eu.papel NOT IN ('diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin')
    UNION
    -- ...e, para o Coordenador Territorial, as unidades vinculadas à CT dele.
    SELECT vinculada.id
      FROM eu
      JOIN public.unidades AS vinculada ON vinculada.coordenacao_territorial_id = eu.unidade_id
     WHERE eu.papel = 'coordenador_territorial'
  )
  -- Cada raiz "abre" a sua subárvore...
  SELECT d.id
    FROM raizes AS r
   CROSS JOIN LATERAL public.unidades_descendentes(r.id) AS d(id)
  UNION
  -- ...e os perfis de alcance total recebem todas as unidades.
  SELECT u.id
    FROM public.unidades AS u
   WHERE EXISTS (SELECT 1 FROM eu
                  WHERE eu.papel IN ('diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin'));
$$;

-- ----------------------------------------------------------------------------
-- 4. pode_ler_objeto(objeto): a pessoa logada lê este objeto (e seus riscos)?
-- ----------------------------------------------------------------------------
-- Verdadeiro quando:
--   (a) a unidade do objeto está em unidades_visiveis(); ou
--   (b) VISÃO POR PROCESSO (decisão P1b), só para `coordenador_geral`: o objeto
--       está ligado a um processo/macroprocesso supervisionado pela CG dele (ou
--       por uma unidade abaixo da CG). Olhamos as duas colunas:
--         - objetos_contexto.macroprocesso_supervisor_id, e
--         - processos_cadeia_valor.unidade_supervisora_id do processo do objeto.
--
-- Exemplo: o objeto "Fiscalização ambiental na FLONA do Tapajós" está ligado ao
-- processo 2.02.3 (supervisor: CGPRO). A UC não está na árvore da CGPRO, mas o
-- cg.cgpro@ lê o objeto pela visão por processo. Já o objeto da FLONA de
-- Caçador (sem processo) ele não lê.
--
-- Ler NÃO dá direito de gravar: isso é pode_escrever_objeto().
CREATE OR REPLACE FUNCTION public.pode_ler_objeto(objeto uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil      public.perfis_usuarios;
  v_unidade     uuid;   -- unidade dona do objeto
  v_macro_sup   uuid;   -- objetos_contexto.macroprocesso_supervisor_id
  v_proc_sup    uuid;   -- processos_cadeia_valor.unidade_supervisora_id
BEGIN
  v_perfil := public.meu_perfil();
  IF v_perfil.id IS NULL THEN
    RETURN false;                       -- sem perfil ativo: não lê nada
  END IF;

  SELECT o.unidade_id, o.macroprocesso_supervisor_id, pc.unidade_supervisora_id
    INTO v_unidade, v_macro_sup, v_proc_sup
    FROM public.objetos_contexto AS o
    LEFT JOIN public.processos_cadeia_valor AS pc ON pc.id = o.processo_id
   WHERE o.id = objeto;
  IF NOT FOUND THEN
    RETURN false;                       -- objeto inexistente
  END IF;

  -- Atalho para os perfis de alcance total (evita montar a lista de 843 unidades).
  IF v_perfil.papel_governanca IN ('diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin') THEN
    RETURN true;
  END IF;

  -- (a) alcance pela árvore
  IF v_unidade IN (SELECT public.unidades_visiveis()) THEN
    RETURN true;
  END IF;

  -- (b) visão por processo do Coordenador-Geral
  IF v_perfil.papel_governanca = 'coordenador_geral' THEN
    RETURN coalesce(
      v_macro_sup IN (SELECT public.unidades_descendentes(v_perfil.unidade_id))
      OR v_proc_sup IN (SELECT public.unidades_descendentes(v_perfil.unidade_id)),
      false);
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. pode_escrever_unidade(unidade): a pessoa grava fichas desta unidade?
-- ----------------------------------------------------------------------------
-- Regra (spec 8.1; matriz, seção 2 e decisão P8): só a PRÓPRIA unidade, que
-- inclui as subunidades internas dela — `divisao`, `servico`, `setor` e
-- `base-avancada` —, em qualquer profundidade, desde que o caminho só passe
-- por subunidades internas.
--
-- Exemplos:
--   gestor.uc-sem-ct@ (FLONA do Tapajós) grava na FLONA e na BAV Belterra;
--   gr@ (GR5) grava na GR5 e nos Serviços/Setores dela, mas NÃO na UC nem na CT
--     ("quem está acima lê, valida ou homologa, mas não reescreve");
--   auditor@ grava só na AUDIT (e subunidades), nunca fora dela.
--
-- Esta função existe (além de pode_escrever_objeto) porque, na RLS, o
-- INSERT/UPDATE precisa testar a unidade da linha NOVA, que ainda não está
-- gravada na tabela (Tarefa 6).
CREATE OR REPLACE FUNCTION public.pode_escrever_unidade(unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE propria(id) AS (
    -- ponto de partida: a unidade de lotação (só se o perfil estiver ativo)
    SELECT p.unidade_id FROM public.meu_perfil() AS p WHERE p.id IS NOT NULL
    UNION                                   -- UNION também protege contra ciclo
    -- passo: só desce para filhas que sejam subunidades internas
    SELECT filha.id
      FROM public.unidades AS filha
      JOIN propria AS pr ON filha.unidade_pai_id = pr.id
     WHERE filha.tipo IN ('divisao', 'servico', 'setor', 'base-avancada')
  )
  SELECT EXISTS (SELECT 1 FROM propria WHERE propria.id = unidade);
$$;

-- ----------------------------------------------------------------------------
-- 6. pode_escrever_objeto(objeto): a pessoa grava neste objeto (e seus riscos)?
-- ----------------------------------------------------------------------------
-- É a regra de pode_escrever_unidade() aplicada à unidade dona do objeto.
-- A CGOV NÃO tem exceção aqui: um objeto que já existe numa UC é da UC
-- (Metodologia 4.6: preserva o mérito da 1ª linha). A exceção da CGOV vale
-- só para CRIAR objetos (pode_criar_objeto_em, abaixo); a dos riscos
-- `preliminar_cgov` fica na RLS da Tarefa 6.
CREATE OR REPLACE FUNCTION public.pode_escrever_objeto(objeto uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT public.pode_escrever_unidade(o.unidade_id)
       FROM public.objetos_contexto AS o
      WHERE o.id = objeto),
    false);                                 -- objeto inexistente → false
$$;

-- ----------------------------------------------------------------------------
-- 7. pode_criar_objeto_em(unidade): a pessoa cria um objeto NOVO nesta unidade?
-- ----------------------------------------------------------------------------
-- Todos criam na própria unidade (pode_escrever_unidade). EXCEÇÃO DA CGOV
-- (spec 7.1): a CGOV, como 2ª linha, mantém o catálogo de objetos e pode criar
-- objeto em QUALQUER unidade existente — mas, depois de criado, não o edita
-- (ver pode_escrever_objeto).
-- Exemplo: cgov@ cria um objeto na FLONA de Caçador → true;
--          gestor.uc@ tenta criar na ESEC do Taim  → false.
CREATE OR REPLACE FUNCTION public.pode_criar_objeto_em(unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.pode_escrever_unidade(unidade)
      OR (    coalesce((public.meu_perfil()).papel_governanca = 'cgov', false)
          AND EXISTS (SELECT 1 FROM public.unidades AS u WHERE u.id = unidade));
$$;

-- ----------------------------------------------------------------------------
-- 8. chefia_imediata(unidade): que unidade VALIDA (2º degrau) as fichas desta
-- ----------------------------------------------------------------------------
-- Regra (spec 7.1; decisão P4; decisão R9 em decisoes-tecnicas-b1.md):
--   - se a unidade tem vínculo com uma CT (`coordenacao_territorial_id`) e a
--     mãe dela na árvore é a GR, quem valida é a CT;
--   - senão, quem valida é a unidade-mãe na árvore.
-- Quem valida de fato é o TITULAR dessa unidade (ver e_titular_de).
--
-- Exemplos com a árvore real:
--   FLONA de Caçador (mãe GR5, vínculo CT Curitiba) → CT Curitiba;
--   FLONA do Tapajós (mãe GR1, sem CT)              → GR1;
--   BAV Belterra (mãe FLONA do Tapajós)             → FLONA do Tapajós;
--   CNPT (Centro, mãe DIBIO)                        → DIBIO;
--   CGOV (mãe CGGE)                                 → CGGE.
-- A Presidência (sem mãe) → nulo.
CREATE OR REPLACE FUNCTION public.chefia_imediata(unidade uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
           WHEN u.coordenacao_territorial_id IS NOT NULL AND mae.tipo = 'gerencia-regional'
             THEN u.coordenacao_territorial_id
           ELSE u.unidade_pai_id
         END
    FROM public.unidades AS u
    LEFT JOIN public.unidades AS mae ON mae.id = u.unidade_pai_id
   WHERE u.id = unidade;
$$;

-- ----------------------------------------------------------------------------
-- 9. homologador_de(unidade): que unidade HOMOLOGA os riscos críticos desta
-- ----------------------------------------------------------------------------
-- Regra (spec 7.1 e 8.1), olhando os ANCESTRAIS da unidade (mãe, avó, ...),
-- nesta ordem de preferência:
--   1º a Gerência Regional (rede descentralizada);
--   2º senão, a Diretoria (unidades da Sede abaixo de uma Diretoria);
--   3º senão, a Presidência (GABIN, AUDIT, CGGE/CGOV... ligadas direto a ela).
--
-- Exemplos: FLONA do Tapajós → GR1; BAV Belterra → GR1; COFIS → DIMAN
-- (COFIS → CGPRO → DIMAN); CNPT → DIBIO; CGOV → Presidência (CGOV → CGGE →
-- Presidência).
--
-- Contamos só os ancestrais, não a própria unidade: o risco da GR é
-- homologado pela Presidência (a GR não homologa a si mesma), e o da Diretoria
-- também. A Presidência (sem ancestral) → nulo.
--
-- Proteção contra ciclo: cada passo guarda o `caminho` já percorrido e não
-- volta a uma unidade que já está nele.
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
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'gerencia-regional' ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'diretoria'         ORDER BY a.nivel LIMIT 1),
    (SELECT a.id FROM ancestrais AS a WHERE a.tipo = 'presidencia'       ORDER BY a.nivel LIMIT 1));
$$;

-- ----------------------------------------------------------------------------
-- 10. e_titular_de(unidade): a pessoa logada é o titular desta unidade?
-- ----------------------------------------------------------------------------
-- Titular = chefe nomeado OU substituto em exercício (`titular_chefia = true`),
-- com perfil ATIVO e LOTADO na unidade. Só o titular valida e homologa
-- (spec 7.1): estar lotado não basta.
-- Exemplos: gr@ é titular da GR5 → true; servidor.gr@ (lotado na GR5, mas não
-- titular) → false; inativo@ → false.
CREATE OR REPLACE FUNCTION public.e_titular_de(unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.perfis_usuarios AS p
     WHERE p.id = auth.uid()
       AND p.ativo
       AND p.titular_chefia
       AND p.unidade_id = unidade);
$$;

-- ----------------------------------------------------------------------------
-- 11. Quem pode executar as funções
-- ----------------------------------------------------------------------------
-- No PostgreSQL, toda função nova nasce executável por PUBLIC (todo mundo), e o
-- Supabase ainda concede EXECUTE a `anon` por padrão. Por isso revogamos dos
-- dois e concedemos só a quem fez login (`authenticated`).
-- (O `service_role` — uso administrativo da CGOV — mantém o acesso padrão.)
REVOKE EXECUTE ON FUNCTION public.meu_perfil()                  FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.unidades_descendentes(uuid)   FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.unidades_visiveis()           FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.pode_ler_objeto(uuid)         FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.pode_escrever_unidade(uuid)   FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.pode_escrever_objeto(uuid)    FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.pode_criar_objeto_em(uuid)    FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.chefia_imediata(uuid)         FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.homologador_de(uuid)          FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.e_titular_de(uuid)            FROM public, anon;

GRANT EXECUTE ON FUNCTION public.meu_perfil()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.unidades_descendentes(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.unidades_visiveis()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ler_objeto(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_escrever_unidade(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_escrever_objeto(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_criar_objeto_em(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.chefia_imediata(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.homologador_de(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_titular_de(uuid)             TO authenticated;
