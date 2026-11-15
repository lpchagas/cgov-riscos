-- ============================================================================
-- ETAPA B1 / TAREFA 6 — RLS por alcance (quem lê e quem grava cada linha)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A migração 20261109002 ligou a RLS ("segurança por linha") mas deixou 9
-- políticas "Leitura institucional de ..." com `USING (true)`: qualquer pessoa
-- logada lia TUDO, e ninguém conseguia gravar. Esta migração troca isso pelas
-- regras da matriz de acesso (docs/01-normativos/matriz-acesso-responsabilidades.md)
-- e da spec (seção 8.1, item 3):
--
--   LEITURA  → só no ALCANCE da pessoa (unidades_visiveis + visão por processo
--              do Coordenador-Geral). Ex.: gestor.uc@ lê 1 risco; gr@ lê 3;
--              cgov@ lê todos.
--   ESCRITA  → só na PRÓPRIA unidade e nas subunidades internas (Divisão,
--              Serviço, Setor, Base Avançada). "Quem está acima lê, valida ou
--              homologa, mas não reescreve" (Metodologia 4.6).
--   EXCEÇÃO DA CGOV → cria objetos em qualquer unidade e cria/edita riscos
--              em `preliminar_cgov` em qualquer unidade (spec 7.1).
--   status_fluxo → NUNCA muda por UPDATE direto; só pelas funções do fluxo
--              (Tarefa 7). Ver o gatilho no item 6.
--
-- Como ler uma política (CREATE POLICY):
--   FOR SELECT ... USING (condição)       → quais linhas a pessoa ENXERGA;
--   FOR INSERT ... WITH CHECK (condição)  → a linha NOVA precisa passar;
--   FOR UPDATE ... USING (...)            → quais linhas ATUAIS ela pode alterar
--                  WITH CHECK (...)       → como a linha pode FICAR depois;
--   FOR DELETE ... USING (...)            → quais linhas ela pode apagar.
-- Se nenhuma política deixa, o PostgreSQL nega: o SELECT volta vazio, o
-- UPDATE/DELETE muda 0 linhas e o INSERT dá erro 42501.
--
-- As funções de alcance (meu_perfil, unidades_visiveis, pode_ler_objeto,
-- pode_escrever_objeto, pode_escrever_unidade, pode_criar_objeto_em) são da
-- Tarefa 5 (20261115002). Elas são SECURITY DEFINER: leem as tabelas sem
-- passar pela RLS, então as políticas abaixo podem chamá-las sem cair em laço.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8 / trg_calcular_risco_radar)
-- nem reescreve migrações anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Remove as 9 políticas de "leitura total" da migração 002
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura institucional de unidades"             ON public.unidades;
DROP POLICY IF EXISTS "Leitura institucional de categorias"           ON public.categorias_risco;
DROP POLICY IF EXISTS "Leitura institucional de objetos_contexto"     ON public.objetos_contexto;
DROP POLICY IF EXISTS "Leitura institucional de riscos"               ON public.riscos;
DROP POLICY IF EXISTS "Leitura institucional de controles_existentes" ON public.controles_existentes;
DROP POLICY IF EXISTS "Leitura institucional de respostas_tratamento" ON public.respostas_tratamento;
DROP POLICY IF EXISTS "Leitura institucional de indicadores_kri"      ON public.indicadores_kri;
DROP POLICY IF EXISTS "Leitura institucional de medicoes_kri"         ON public.medicoes_kri;
DROP POLICY IF EXISTS "Leitura institucional de historico_fluxo"      ON public.historico_fluxo;

-- ----------------------------------------------------------------------------
-- 2. Liga a RLS nas tabelas que ainda estavam abertas
-- ----------------------------------------------------------------------------
-- Sem RLS, o Supabase deixa `anon` (visitante sem login) e `authenticated`
-- lerem e gravarem estas tabelas pela API. Com RLS ligada e sem política,
-- ninguém de fora acessa; o importador (service_role) e o administrador
-- (postgres) continuam passando, porque ignoram a RLS.
--   - perfis_usuarios: dados de pessoas (e-mail, cargo, perfil);
--   - processos_cadeia_valor: catálogo da Cadeia de Valor (importador);
--   - auditoria_log: a trilha. A política de leitura dela vem na Tarefa 8
--     (que cria a coluna objeto_id); até lá, ninguém logado a lê.
ALTER TABLE public.perfis_usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos_cadeia_valor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_log          ENABLE ROW LEVEL SECURITY;

-- TRUNCATE ("esvaziar a tabela") é a única operação que passa POR CIMA da RLS.
-- O Supabase o concede por padrão a `anon` e `authenticated`; nenhuma tela
-- precisa dele, então retiramos.
REVOKE TRUNCATE ON public.unidades, public.categorias_risco, public.perfis_usuarios,
                   public.objetos_contexto, public.riscos, public.controles_existentes,
                   public.respostas_tratamento, public.indicadores_kri, public.medicoes_kri,
                   public.historico_fluxo, public.auditoria_log, public.processos_cadeia_valor
  FROM anon, authenticated;

-- DEFESA EM PROFUNDIDADE: o visitante sem login (`anon`) não usa nenhuma tela
-- do RADAR (todas exigem login gov.br). A RLS já nega tudo a ele, mas o
-- Supabase concede, por padrão, SELECT/INSERT/UPDATE/DELETE a `anon` em toda
-- tabela nova do esquema public. Retiramos TODOS os privilégios: assim, se um
-- dia alguém escrever uma política "TO public" por engano, o anon continua
-- sem acesso — ele recebe "permission denied" (42501) antes mesmo da RLS.
-- Ex.: anon → select count(*) from public.riscos;   -- ERRO 42501
-- (A trilha auditoria_log entra na lista; a migração 20261115005 repete o
-- REVOKE para ela ao criar as colunas novas.)
-- ATENÇÃO para as próximas migrações: o padrão do Supabase continua dando
-- privilégios a `anon` em toda tabela NOVA. Cada tabela nova de negócio
-- precisa repetir o REVOKE ALL ... FROM anon.
REVOKE ALL ON public.unidades, public.categorias_risco, public.perfis_usuarios,
              public.objetos_contexto, public.riscos, public.controles_existentes,
              public.respostas_tratamento, public.indicadores_kri, public.medicoes_kri,
              public.historico_fluxo, public.auditoria_log, public.processos_cadeia_valor
  FROM anon;

-- ----------------------------------------------------------------------------
-- 3. Tabelas "públicas por dentro": árvore, Cadeia de Valor e DAR
-- ----------------------------------------------------------------------------
-- Qualquer pessoa logada COM PERFIL ATIVO lê (spec 8.1). Quem não tem perfil,
-- ou está inativo, não lê nada (meu_perfil() devolve nulo para essas pessoas).
--
-- Por que `(SELECT (public.meu_perfil()).id)` entre parênteses com SELECT?
-- Assim o PostgreSQL calcula o valor UMA vez por consulta (e não uma vez por
-- linha). Com 843 unidades, faz diferença.
CREATE POLICY "Unidades: leitura por quem tem perfil ativo"
  ON public.unidades FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);
-- Escrita em `unidades`: nenhuma política → só o importador (service_role).

CREATE POLICY "Processos: leitura por quem tem perfil ativo"
  ON public.processos_cadeia_valor FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);
-- Escrita em `processos_cadeia_valor`: nenhuma política → só o importador.

-- DAR (categorias_risco): todos com perfil ativo leem; só a CGOV grava
-- (simula e registra a proposta — RACI linha 13). Ex.: gestor.uc@ tenta
-- mudar o apetite da categoria Operacional → 0 linhas.
CREATE POLICY "Categorias: leitura por quem tem perfil ativo"
  ON public.categorias_risco FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);

CREATE POLICY "Categorias: CGOV cria"
  ON public.categorias_risco FOR INSERT TO authenticated
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Categorias: CGOV altera"
  ON public.categorias_risco FOR UPDATE TO authenticated
  USING      (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false))
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Categorias: CGOV apaga"
  ON public.categorias_risco FOR DELETE TO authenticated
  USING (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

-- ----------------------------------------------------------------------------
-- 4. perfis_usuarios: cada pessoa lê a própria linha; a CGOV lê e grava todas
-- ----------------------------------------------------------------------------
-- Decisão P6: a CGOV cadastra as pessoas e define perfil e unidade.
-- Ninguém mais grava aqui — nem a própria linha. Assim um gestor não consegue
-- "se promover" a cgov mudando o próprio papel_governanca.
-- A própria linha é lida mesmo se o perfil estiver INATIVO: isso permite ao
-- aplicativo (B2) explicar "seu perfil está inativo; procure a CGOV". Os
-- riscos, a árvore e a DAR continuam invisíveis para quem está inativo.
CREATE POLICY "Perfis: cada um lê o próprio; CGOV lê todos"
  ON public.perfis_usuarios FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false)
  );

CREATE POLICY "Perfis: CGOV cria"
  ON public.perfis_usuarios FOR INSERT TO authenticated
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Perfis: CGOV altera"
  ON public.perfis_usuarios FOR UPDATE TO authenticated
  USING      (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false))
  WITH CHECK (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

CREATE POLICY "Perfis: CGOV apaga"
  ON public.perfis_usuarios FOR DELETE TO authenticated
  USING (coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false));

-- ----------------------------------------------------------------------------
-- 5. objetos_contexto e riscos (o coração do alcance)
-- ----------------------------------------------------------------------------
-- 5.1 Objetos — LEITURA
-- Duas portas (spec 8.1; decisão R19 em decisoes-tecnicas-b1.md):
--   (a) a unidade do objeto está no meu alcance. `unidades_visiveis()` roda
--       uma vez por consulta e vira uma lista; cada linha só confere se a
--       unidade está na lista (rápido, mesmo com milhares de objetos);
--   (b) VISÃO POR PROCESSO (P1b), só para o Coordenador-Geral: aí, sim,
--       chamamos pode_ler_objeto(id) linha a linha. O teste do papel vem
--       antes e é calculado uma vez, então os outros perfis nem chegam a
--       chamar a função.
-- Ex.: cg.cgpro@ lê o objeto "Fiscalização ambiental na FLONA do Tapajós"
-- (processo 2.02.3, supervisor CGPRO) pela porta (b); gestor.uc@ não lê.
CREATE POLICY "Objetos: leitura no alcance"
  ON public.objetos_contexto FOR SELECT TO authenticated
  USING (
    unidade_id IN (SELECT public.unidades_visiveis())
    OR (
      coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'coordenador_geral', false)
      AND public.pode_ler_objeto(id)
    )
  );

-- 5.2 Objetos — ESCRITA
-- INSERT: na própria unidade, ou em QUALQUER unidade se for a CGOV
--   (pode_criar_objeto_em — usada SÓ aqui, decisão R19 em decisoes-tecnicas-b1.md).
-- UPDATE: USING olha a linha ATUAL (o objeto é da minha unidade?) e WITH
--   CHECK olha a linha NOVA (a unidade continua sendo minha?). Assim ninguém
--   "empurra" um objeto para outra unidade. A CGOV não tem exceção aqui: o
--   objeto que ela criou numa UC passa a ser da UC.
-- DELETE: só a própria unidade. (Os riscos do objeto saem junto, pelo
--   ON DELETE CASCADE — e eles são da mesma unidade.)
CREATE POLICY "Objetos: cria na própria unidade (CGOV em qualquer uma)"
  ON public.objetos_contexto FOR INSERT TO authenticated
  WITH CHECK (public.pode_criar_objeto_em(unidade_id));

CREATE POLICY "Objetos: altera os da própria unidade"
  ON public.objetos_contexto FOR UPDATE TO authenticated
  USING      (public.pode_escrever_objeto(id))
  WITH CHECK (public.pode_escrever_unidade(unidade_id));

CREATE POLICY "Objetos: apaga os da própria unidade"
  ON public.objetos_contexto FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(id));

-- 5.3 Riscos — LEITURA
-- "Leio o risco se leio o objeto dele." Em vez de repetir a regra, a
-- subconsulta abaixo lê `objetos_contexto` — e essa leitura JÁ passa pela
-- política 5.1. O resultado é o mesmo de pode_ler_objeto(objeto_id), mas o
-- PostgreSQL monta a lista de objetos legíveis uma vez só por consulta.
CREATE POLICY "Riscos: leitura no alcance do objeto"
  ON public.riscos FOR SELECT TO authenticated
  USING (objeto_id IN (SELECT o.id FROM public.objetos_contexto AS o));

-- 5.4 Riscos — ESCRITA
-- Regra geral: só quem escreve no objeto (própria unidade + subunidades).
-- EXCEÇÃO DA CGOV (spec 7.1): cria e edita riscos `preliminar_cgov` em
-- qualquer unidade. Quando a unidade assume o risco (vira `rascunho`, pela
-- função da Tarefa 7), a condição deixa de valer e a CGOV não edita mais.
--
-- INSERT: além da unidade, o ESTADO inicial é conferido — todo risco nasce
-- `rascunho` (o padrão da coluna) ou, só para a CGOV, `preliminar_cgov`.
-- Sem isso, alguém poderia criar um risco já "aprovado", pulando o fluxo.
-- Ex.: cgov@ cria 'preliminar_cgov' na FLONA de Caçador → passa;
--      cgov@ cria 'rascunho' na FLONA de Caçador → erro 42501;
--      gestor.uc@ cria 'rascunho' na própria UC → passa.
CREATE POLICY "Riscos: cria no próprio objeto (CGOV: preliminar em qualquer um)"
  ON public.riscos FOR INSERT TO authenticated
  WITH CHECK (
    (public.pode_escrever_objeto(objeto_id) AND status_fluxo = 'rascunho')
    OR (    coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false)
        AND status_fluxo = 'preliminar_cgov')
  );

-- UPDATE: USING = linha atual; WITH CHECK = linha nova (ninguém leva o risco
-- para o objeto de outra unidade). A mudança de `status_fluxo` é barrada à
-- parte, pelo gatilho do item 6.
CREATE POLICY "Riscos: altera os do próprio objeto (CGOV: os preliminares)"
  ON public.riscos FOR UPDATE TO authenticated
  USING (
    public.pode_escrever_objeto(objeto_id)
    OR (    coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false)
        AND status_fluxo = 'preliminar_cgov')
  )
  WITH CHECK (
    public.pode_escrever_objeto(objeto_id)
    OR (    coalesce((SELECT (public.meu_perfil()).papel_governanca) = 'cgov', false)
        AND status_fluxo = 'preliminar_cgov')
  );

-- DELETE: só quem escreve no objeto (a exceção da CGOV é só INSERT/UPDATE).
CREATE POLICY "Riscos: apaga os do próprio objeto"
  ON public.riscos FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(objeto_id));

-- ----------------------------------------------------------------------------
-- 6. Gatilho: status_fluxo só muda pelas funções do fluxo (spec 8.2)
-- ----------------------------------------------------------------------------
-- Uma política de RLS diz SE a pessoa pode alterar a linha, mas não DE QUAL
-- estado PARA QUAL. Por isso a troca de estado fica com as funções da
-- Tarefa 7 (enviar, validar, homologar, devolver, assumir), que conferem quem
-- é a pessoa e registram o histórico. Antes de mudar o estado, elas ligam um
-- sinal válido só até o fim da transação:
--
--     PERFORM set_config('radar.fluxo', 'on', true);   -- true = "local"
--
-- Este gatilho recusa qualquer mudança de status_fluxo SEM esse sinal — vale
-- até para o administrador. Ex.:
--     UPDATE riscos SET status_fluxo = 'aprovado' WHERE ...;   -- erro "RADAR: ..."
--
-- Ele roda só quando o valor MUDA (cláusula WHEN), não mexe em NEW e não toca
-- no INSERT: o gatilho de cálculo (trg_calcular_risco_radar) segue igual.
--
-- `current_setting('radar.fluxo', true)`: o `true` = "se o sinal não
-- existir, devolva nulo em vez de dar erro".
CREATE OR REPLACE FUNCTION public.fn_bloquear_status_fluxo_direto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF coalesce(current_setting('radar.fluxo', true), '') <> 'on' THEN
    RAISE EXCEPTION 'RADAR: o status_fluxo do risco % não pode ser alterado diretamente (de "%" para "%"). Use as ações do fluxo de aprovação: enviar para validação, validar, homologar, devolver ou assumir o risco preliminar.',
      OLD.codigo_radar, OLD.status_fluxo, NEW.status_fluxo
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Função de gatilho não é chamada pela API, mas revogamos por coerência com
-- as demais (ninguém de fora precisa executá-la).
REVOKE EXECUTE ON FUNCTION public.fn_bloquear_status_fluxo_direto() FROM public, anon;

CREATE TRIGGER trg_riscos_status_fluxo_so_pelo_fluxo
BEFORE UPDATE ON public.riscos
FOR EACH ROW
WHEN (OLD.status_fluxo IS DISTINCT FROM NEW.status_fluxo)
EXECUTE FUNCTION public.fn_bloquear_status_fluxo_direto();

-- ----------------------------------------------------------------------------
-- 7. Tabelas "filhas" do risco: seguem o objeto do risco
-- ----------------------------------------------------------------------------
-- LEITURA: "leio o controle se leio o risco dele" — a subconsulta em `riscos`
-- passa pela política 5.3, que passa pela 5.1. Mesmo resultado de
-- pode_ler_objeto(objeto do risco).
--
-- ESCRITA: pode_escrever_objeto(objeto do risco). A subconsulta descobre o
-- objeto a partir do risco (ou do KRI, no caso das medições). Se a pessoa nem
-- enxerga o risco, a subconsulta volta nula e a função responde "não".
-- Ex.: gestor.uc@ cria controle no risco da FLONA de Caçador → passa;
--      no risco da ESEC do Taim (vizinha) → erro 42501.
-- A exceção da CGOV para `preliminar_cgov` vale só para a tabela `riscos`
-- (spec 7.1); controles, KRIs e respostas são da unidade. Se a CGOV deve
-- também gravar os filhos do preliminar é pendência listada em
-- docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md.

-- 7.1 controles_existentes
CREATE POLICY "Controles: leitura no alcance"
  ON public.controles_existentes FOR SELECT TO authenticated
  USING (risco_id IN (SELECT r.id FROM public.riscos AS r));

CREATE POLICY "Controles: cria no risco da própria unidade"
  ON public.controles_existentes FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = controles_existentes.risco_id)));

CREATE POLICY "Controles: altera no risco da própria unidade"
  ON public.controles_existentes FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = controles_existentes.risco_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = controles_existentes.risco_id)));

CREATE POLICY "Controles: apaga no risco da própria unidade"
  ON public.controles_existentes FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = controles_existentes.risco_id)));

-- 7.2 respostas_tratamento (plano 5W2H)
CREATE POLICY "Respostas: leitura no alcance"
  ON public.respostas_tratamento FOR SELECT TO authenticated
  USING (risco_id IN (SELECT r.id FROM public.riscos AS r));

CREATE POLICY "Respostas: cria no risco da própria unidade"
  ON public.respostas_tratamento FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = respostas_tratamento.risco_id)));

CREATE POLICY "Respostas: altera no risco da própria unidade"
  ON public.respostas_tratamento FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = respostas_tratamento.risco_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = respostas_tratamento.risco_id)));

CREATE POLICY "Respostas: apaga no risco da própria unidade"
  ON public.respostas_tratamento FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = respostas_tratamento.risco_id)));

-- 7.3 indicadores_kri (KRI)
CREATE POLICY "KRIs: leitura no alcance"
  ON public.indicadores_kri FOR SELECT TO authenticated
  USING (risco_id IN (SELECT r.id FROM public.riscos AS r));

CREATE POLICY "KRIs: cria no risco da própria unidade"
  ON public.indicadores_kri FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = indicadores_kri.risco_id)));

CREATE POLICY "KRIs: altera no risco da própria unidade"
  ON public.indicadores_kri FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = indicadores_kri.risco_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = indicadores_kri.risco_id)));

CREATE POLICY "KRIs: apaga no risco da própria unidade"
  ON public.indicadores_kri FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id FROM public.riscos AS r WHERE r.id = indicadores_kri.risco_id)));

-- 7.4 medicoes_kri — o caminho é medição → KRI → risco → objeto.
CREATE POLICY "Medições: leitura no alcance"
  ON public.medicoes_kri FOR SELECT TO authenticated
  USING (kri_id IN (SELECT k.id FROM public.indicadores_kri AS k));

CREATE POLICY "Medições: cria no KRI da própria unidade"
  ON public.medicoes_kri FOR INSERT TO authenticated
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id
       FROM public.indicadores_kri AS k
       JOIN public.riscos AS r ON r.id = k.risco_id
      WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: altera no KRI da própria unidade"
  ON public.medicoes_kri FOR UPDATE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id
       FROM public.indicadores_kri AS k
       JOIN public.riscos AS r ON r.id = k.risco_id
      WHERE k.id = medicoes_kri.kri_id)))
  WITH CHECK (public.pode_escrever_objeto(
    (SELECT r.objeto_id
       FROM public.indicadores_kri AS k
       JOIN public.riscos AS r ON r.id = k.risco_id
      WHERE k.id = medicoes_kri.kri_id)));

CREATE POLICY "Medições: apaga no KRI da própria unidade"
  ON public.medicoes_kri FOR DELETE TO authenticated
  USING (public.pode_escrever_objeto(
    (SELECT r.objeto_id
       FROM public.indicadores_kri AS k
       JOIN public.riscos AS r ON r.id = k.risco_id
      WHERE k.id = medicoes_kri.kri_id)));

-- 7.5 historico_fluxo — só LEITURA para quem está logado.
-- Quem grava o histórico são as funções do fluxo (Tarefa 7, SECURITY
-- DEFINER, que passam por cima da RLS). Se o gestor pudesse gravar aqui,
-- poderia forjar uma linha "aprovado pelo Diretor".
CREATE POLICY "Histórico: leitura no alcance"
  ON public.historico_fluxo FOR SELECT TO authenticated
  USING (risco_id IN (SELECT r.id FROM public.riscos AS r));

-- ----------------------------------------------------------------------------
-- Resumo (para conferência da CGTI)
-- ----------------------------------------------------------------------------
-- Tabela                 | SELECT                | INSERT/UPDATE/DELETE
-- -----------------------+-----------------------+--------------------------------------
-- unidades               | perfil ativo          | ninguém (importador/service_role)
-- processos_cadeia_valor | perfil ativo          | ninguém (importador/service_role)
-- categorias_risco (DAR) | perfil ativo          | só cgov
-- perfis_usuarios        | a própria linha; cgov | só cgov
-- objetos_contexto       | alcance + visão CG    | própria unidade (cgov cria em qualquer)
-- riscos                 | alcance do objeto     | própria unidade (cgov: preliminar_cgov)
-- controles/respostas/   | alcance do objeto     | própria unidade (pelo objeto do risco)
--   KRIs/medições        |                       |
-- historico_fluxo        | alcance do objeto     | ninguém (só as funções do fluxo)
-- auditoria_log          | ninguém (Tarefa 8)    | ninguém (só os gatilhos da Tarefa 8)
-- anon                   | nada (sem privilégio) | nada (sem privilégio)
