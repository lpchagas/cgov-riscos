-- ============================================================================
-- LAC-14 e LAC-15 — Categorias do Quadro 2 e subcategorias do Quadro 3 no banco
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A Metodologia de Gestão de Riscos (Minuta SEI 024421455) define:
--   - Quadro 2: as 8 categorias de risco (item 4.2.2). Cada risco tem UMA.
--   - Quadro 3: as 6 subcategorias dos riscos para a integridade (item
--     4.2.2.1). Todo risco da categoria Integridade precisa de uma delas.
--
-- Até aqui o banco aceitava qualquer nome de categoria e guardava as
-- subcategorias numa lista JSON (`categorias_risco.subcategorias_permitidas`)
-- que ninguém conferia: `riscos.subcategoria_integridade` aceitava texto livre.
-- Esta migração faz o banco GARANTIR as duas regras:
--   1. CHECK nos nomes de `categorias_risco`: só os 8 do Quadro 2.
--   2. Tabela nova `subcategorias_risco` (uma linha por subcategoria, ligada à
--      categoria dona). Hoje só a Integridade (id 5) tem subcategorias.
--   3. Chave estrangeira em `riscos`: o par (categoria_id,
--      subcategoria_integridade) precisa existir em `subcategorias_risco`.
--      Ex.: (5, 'Nepotismo') passa; (5, 'Corrupção e Fraude') e
--      (2, 'Nepotismo') são recusados (erro 23503).
--   4. Gatilho: risco de categoria que TEM subcategorias (a Integridade) não
--      pode ficar sem uma. Ex.: categoria 5 com subcategoria vazia → erro
--      "RADAR: risco da categoria Integridade exige uma das subcategorias do
--      Quadro 3." (código 23514). A chave estrangeira sozinha não pega esse
--      caso: com um dos lados nulo, o PostgreSQL não confere a chave.
--
-- Decisões do responsável (2026-11-22): grafia literal do Quadro 2; risco
-- gravado em categoria que sai (1 Estratégico, 7 Socioambiental, 8 Tecnologia
-- da Informação) ou com subcategoria antiga NÃO é convertido sozinho: a
-- migração para e lista os códigos, para reclassificação humana.
--
-- Ids das categorias: ficam 2 Operacional, 3 Financeiro/Orçamentário, 4 Legal,
-- 5 Integridade e 6 Reputação (com o apetite e a justificativa da DAR que já
-- têm); saem 1, 7 e 8; entram 9 Riscos da visitação, 10 Ocupacionais e
-- 11 Privacidade e Proteção de Dados, com apetite 'pendente_dar'.
--
-- O cálculo (Quadros 6, 7 e 8 e o gatilho trg_calcular_risco_radar) NÃO muda.
--
-- Tudo roda numa transação só (o Supabase aplica cada migração assim): se um
-- bloco falhar, nada desta migração fica gravado.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TRAVA DE RECLASSIFICAÇÃO (antes de mexer em qualquer coisa)
-- ----------------------------------------------------------------------------
-- Se existir risco numa categoria que vai sair (1, 7 ou 8) ou com subcategoria
-- fora das 6 do Quadro 3, a migração PARA com erro e lista os códigos. Nada é
-- trocado de categoria sem decisão humana.
-- Ex.: RADAR-2026-010 na categoria 7 → "RADAR: ... RADAR-2026-010 ...".
-- Na nuvem (conferido em 2026-11-22) não há nenhum risco, então ela não dispara.
-- ATENÇÃO: o teste supabase/tests/090_categorias_subcategorias.test.sql tem uma
-- CÓPIA deste bloco (pg_temp.travar_reclassificacao). Mudou aqui, mude lá.
DO $$
DECLARE
  v_codigos text;
BEGIN
  SELECT string_agg(r.codigo_radar, ', ' ORDER BY r.codigo_radar)
    INTO v_codigos
    FROM public.riscos AS r
   WHERE r.categoria_id IN (1, 7, 8)
      OR (r.subcategoria_integridade IS NOT NULL
          AND r.subcategoria_integridade NOT IN (
            'Abuso de posição ou poder em favor de interesses privados',
            'Nepotismo',
            'Conflito de interesses',
            'Pressão interna ou externa ilegal para influenciar agente público',
            'Solicitação ou recebimento de vantagem indevida',
            'Utilização de recursos públicos em favor de interesses privados'));

  IF v_codigos IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: há riscos em categoria que sai do Quadro 2 (Estratégico, Socioambiental ou Tecnologia da Informação) ou com subcategoria fora do Quadro 3: %; reclassifique esses riscos antes de aplicar esta migração (decisão de 2026-11-22).', v_codigos
      USING ERRCODE = 'check_violation';
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. TABELA `subcategorias_risco`, RLS e permissões
-- ----------------------------------------------------------------------------
-- Uma linha por subcategoria. `ordem` guarda a posição no Quadro 3 (a tela
-- mostra nessa ordem). UNIQUE (categoria_id, nome) é o "endereço" que a chave
-- estrangeira de `riscos` usa.
-- ON DELETE RESTRICT: não se apaga uma categoria que ainda tem subcategorias.
CREATE TABLE public.subcategorias_risco (
  id SERIAL PRIMARY KEY,
  categoria_id INT NOT NULL REFERENCES public.categorias_risco(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  descricao_normativa TEXT NOT NULL,
  ordem SMALLINT NOT NULL,
  UNIQUE (categoria_id, nome)
);

COMMENT ON TABLE public.subcategorias_risco IS
  'Subcategorias de risco (Quadro 3 da Metodologia, item 4.2.2.1: as 6 da Integridade). Lida por todos com perfil ativo; ninguém logado grava.';

-- RLS: todos com perfil ativo leem (a tela de categoria lista as opções);
-- NINGUÉM logado grava: não há política de INSERT/UPDATE/DELETE. A lista é
-- normativa e muda só por migração.
ALTER TABLE public.subcategorias_risco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategorias: leitura por quem tem perfil ativo"
  ON public.subcategorias_risco FOR SELECT TO authenticated
  USING ((SELECT (public.meu_perfil()).id) IS NOT NULL);

-- Mesmo padrão da migração 20261115003 (linhas 71-89):
--   - TRUNCATE passa por cima da RLS: retirado de anon e authenticated;
--   - o visitante sem login (anon) não tem nenhum privilégio.
-- E, como a tabela é só de leitura, authenticated fica SÓ com SELECT: um
-- INSERT/UPDATE/DELETE dá "permission denied" (42501) antes da RLS.
REVOKE TRUNCATE ON public.subcategorias_risco FROM anon, authenticated;
REVOKE ALL ON public.subcategorias_risco FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subcategorias_risco FROM authenticated;
GRANT SELECT ON public.subcategorias_risco TO authenticated;
REVOKE ALL ON SEQUENCE public.subcategorias_risco_id_seq FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. ALINHAMENTO CONDICIONAL DAS CATEGORIAS (só se a tabela já tiver linhas)
-- ----------------------------------------------------------------------------
-- Na NUVEM a tabela já tem as 8 categorias antigas do seed.sql (ids 1 a 8):
-- este bloco as alinha ao Quadro 2. LOCALMENTE (`npm run db:reset`) as
-- migrações rodam com a tabela vazia e quem grava as categorias é o
-- supabase/seed.sql, depois: aqui nada acontece.
--
-- Por que não muda o apetite? A DAR das 5 categorias que ficam continua a
-- mesma. O UPDATE abaixo só cita nome e descrição, então o gatilho
-- trg_categorias_dar_reavalia_aprovados (AFTER UPDATE OF apetite_declarado)
-- nem dispara. O gatilho de auditoria dispara e grava cada linha em
-- auditoria_log (sem usuário: quem aplica a migração não está logado).
--
-- ATENÇÃO: o teste supabase/tests/090_categorias_subcategorias.test.sql tem uma
-- CÓPIA deste bloco (pg_temp.alinhar_categorias_quadro_2), porque uma migração
-- não pode ser chamada de novo. Mudou aqui, mude lá (e no supabase/seed.sql).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.categorias_risco) THEN
    -- 3.1 As 5 que ficam: nome e descrição literais do Quadro 2.
    UPDATE public.categorias_risco AS c
       SET nome = v.nome, descricao_normativa = v.descricao
      FROM (VALUES
        (2, 'Operacional', 'Eventos que podem comprometer as atividades da ICMBio, normalmente associados a falhas, deficiência ou inadequação de processos internos, pessoas, infraestrutura e sistemas'),
        (3, 'Financeiro/Orçamentário', 'Eventos que podem comprometer a capacidade da ICMBio de contar com os recursos orçamentários e financeiros necessários à realização de suas atividades, ou eventos que possam comprometer a própria execução orçamentária, como atrasos no cronograma de licitações'),
        (4, 'Legal', 'Eventos derivados de alterações legislativas ou normativas que podem comprometer as atividades da ICMBio'),
        (5, 'Integridade', 'Eventos que podem favorecer ou facilitar a ocorrência de práticas de corrupção, fraudes, irregularidades e/ou desvios éticos e de conduta, podendo comprometer os objetivos da instituição'),
        (6, 'Reputação', 'Eventos que podem comprometer a confiança da sociedade em relação à capacidade do ICMBio em cumprir sua missão institucional, interferem diretamente na imagem da autarquia')
      ) AS v(id, nome, descricao)
     WHERE c.id = v.id;

    -- 3.2 As 3 que saem (a trava do bloco 1 garantiu que nenhum risco as usa).
    DELETE FROM public.categorias_risco WHERE id IN (1, 7, 8);

    -- 3.3 As 3 que entram, ainda sem DAR (apetite 'pendente_dar', sem justificativa).
    INSERT INTO public.categorias_risco (id, nome, descricao_normativa, apetite_declarado, justificativa_dar)
    VALUES
      (9, 'Riscos da visitação', 'Eventos que podem comprometer a segurança dos visitantes durante atividades de uso público nas Unidades de Conservação, decorrentes de perigos inerentes ao ambiente natural ou das operações necessárias para a realização da visitação, tais como trilhas, atrativos, embarcações, atividades recreativas e serviços de apoio.', 'pendente_dar', NULL),
      (10, 'Ocupacionais', 'Eventos que podem comprometer a saúde, a integridade física ou a segurança dos servidores e colaboradores do ICMBio no desempenho de suas atividades institucionais.', 'pendente_dar', NULL),
      (11, 'Privacidade e Proteção de Dados', 'Eventos que possam comprometer a proteção, a privacidade e a segurança dos dados pessoais tratados pelo ICMBio, tais como vazamentos de informações, acessos não autorizados, uso inadequado de dados, falhas nos controles de segurança ou descumprimento das disposições da Lei nº 13.709/2013 - Lei Geral de Proteção de Dados Pessoais (LGPD)', 'pendente_dar', NULL);

    -- 3.4 As 6 subcategorias da Integridade (Quadro 3, descrições literais).
    INSERT INTO public.subcategorias_risco (categoria_id, nome, descricao_normativa, ordem)
    VALUES
      (5, 'Abuso de posição ou poder em favor de interesses privados', 'Conduta contrária ao interesse público, valendo-se da condição para atender interesse privado, em benefício próprio ou de terceiros.', 1),
      (5, 'Nepotismo', 'Uma das formas de abuso de posição ou poder em favor de interesses privados, em que se favorecem familiares. Ele pode ser presumido ou requerer apuração específica.', 2),
      (5, 'Conflito de interesses', 'Situação gerada pelo confronto entre interesses públicos e privados, que possa comprometer o interesse coletivo ou influenciar, de maneira imprópria, o desempenho da função pública.', 3),
      (5, 'Pressão interna ou externa ilegal para influenciar agente público', 'Pressões explícitas ou implícitas de natureza hierárquica (interna), de colegas de trabalho (organizacional), política ou social (externa), que podem influenciar indevidamente atuação do agente público', 4),
      (5, 'Solicitação ou recebimento de vantagem indevida', 'Caracteriza-se por qualquer tipo de enriquecimento ilícito, seja dinheiro ou outra utilidade, dado que ao agente público não se permite colher vantagens em virtude do exercício de suas atividades', 5),
      (5, 'Utilização de recursos públicos em favor de interesses privados', 'Apropriação indevida, irregularidades em contratações públicas e outras formas de utilização de recursos públicos para uso privado (exemplos: veículos oficiais, utilização imprópria de tempo de trabalho, de equipamentos do escritório, entre outros).', 6);

    -- 3.5 Contador dos ids no maior id (11): o próximo cadastro recebe 12.
    PERFORM setval('public.categorias_risco_id_seq', 11);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 4. AS GARANTIAS: coluna antiga sai, CHECK, chave estrangeira e gatilho
-- ----------------------------------------------------------------------------

-- 4.1 A lista JSON antiga dá lugar à tabela `subcategorias_risco`.
ALTER TABLE public.categorias_risco DROP COLUMN subcategorias_permitidas;

-- 4.2 Só os 8 nomes do Quadro 2, na grafia literal.
-- Ex.: INSERT ... nome = 'Estratégico' → erro 23514 (check_violation).
ALTER TABLE public.categorias_risco
  ADD CONSTRAINT categorias_risco_nome_quadro_2 CHECK (nome IN (
    'Operacional',
    'Legal',
    'Financeiro/Orçamentário',
    'Reputação',
    'Integridade',
    'Riscos da visitação',
    'Ocupacionais',
    'Privacidade e Proteção de Dados'
  ));

-- 4.3 A subcategoria do risco precisa existir NA categoria do risco.
-- NO ACTION (e não CASCADE) dos dois lados: renomear ou apagar uma
-- subcategoria em uso exige reclassificar os riscos antes. Um CASCADE mudaria
-- fichas aprovadas sem ninguém decidir (e dispararia a reabertura delas).
-- Com subcategoria nula a chave não é conferida (MATCH SIMPLE, o padrão):
-- é o caso de todo risco fora da Integridade.
ALTER TABLE public.riscos
  ADD CONSTRAINT riscos_subcategoria_fk
  FOREIGN KEY (categoria_id, subcategoria_integridade)
  REFERENCES public.subcategorias_risco (categoria_id, nome)
  ON UPDATE NO ACTION ON DELETE NO ACTION;

-- 4.4 Gatilho: categoria com subcategorias exige uma delas.
-- SECURITY DEFINER com search_path vazio: a consulta a subcategorias_risco
-- não depende da RLS de quem grava (e nomes sem esquema não são sequestrados).
-- Ex.: gestor salva rascunho da Integridade sem subcategoria →
--   "RADAR: risco da categoria Integridade exige uma das subcategorias do Quadro 3."
-- (o tradutor src/services/dados/errosBanco.ts transforma em frase de tela).
CREATE OR REPLACE FUNCTION public.fn_exige_subcategoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_categoria text;
BEGIN
  IF NEW.subcategoria_integridade IS NULL
     AND EXISTS (SELECT 1 FROM public.subcategorias_risco AS s
                  WHERE s.categoria_id = NEW.categoria_id) THEN
    SELECT c.nome INTO v_categoria
      FROM public.categorias_risco AS c WHERE c.id = NEW.categoria_id;
    RAISE EXCEPTION 'RADAR: risco da categoria % exige uma das subcategorias do Quadro 3.', v_categoria
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Só o banco chama esta função (como gatilho). Ninguém a executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_exige_subcategoria() FROM public, anon, authenticated;

-- BEFORE INSERT OR UPDATE OF ...: só confere quando a ficha cita a categoria
-- ou a subcategoria. Mudar só o estado do fluxo (enviar, validar...) não
-- passa por aqui.
CREATE TRIGGER trg_riscos_exige_subcategoria
BEFORE INSERT OR UPDATE OF categoria_id, subcategoria_integridade ON public.riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_exige_subcategoria();
