-- ============================================================================
-- TESTE DA LAC-14 E LAC-15 (pgTAP) — Categorias do Quadro 2 e subcategorias do Quadro 3
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A migração 20261122001 faz o banco garantir duas regras da Metodologia
-- (Minuta SEI 024421455):
--   - Quadro 2: só 8 categorias, com o nome literal (CHECK no nome);
--   - Quadro 3: risco da Integridade exige uma das 6 subcategorias, e a
--     subcategoria precisa ser DA categoria do risco (tabela
--     subcategorias_risco + chave estrangeira + gatilho).
--
-- O que este arquivo prova:
--   1. as 8 categorias e as 6 subcategorias gravadas, com os ids combinados;
--   2. categoria fora do Quadro 2 é recusada (23514);
--   3. as combinações de risco × subcategoria (gatilho 23514, chave 23503);
--   4. a recusa chega pela salvar_ficha_risco como mensagem "RADAR: ..."
--      legível (Review Focus 1);
--   5. subcategorias_risco: quem tem perfil lê; ninguém logado grava;
--   6. a TRAVA (bloco 1 da migração) para se houver risco na categoria 7, da
--      Integridade sem subcategoria ou com subcategoria fora da Integridade;
--   7. o ALINHAMENTO (bloco 3 da migração) sobre a semente antiga (ids 1 a 8,
--      como está na nuvem) chega ao mesmo resultado do seed.sql e grava a
--      trilha em auditoria_log sem usuário (Review Focus 5).
--
-- Os blocos 1 e 3 da migração estão COPIADOS aqui como funções pg_temp
-- (travar_reclassificacao e alinhar_categorias_quadro_2), porque uma migração
-- não pode ser chamada de novo. ATENÇÃO: mudou o bloco na migração, mude a
-- cópia aqui.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(36);

-- ----------------------------------------------------------------------------
-- 1. Estrutura e conteúdo
-- ----------------------------------------------------------------------------
select has_table('public', 'subcategorias_risco', 'tabela subcategorias_risco existe');
select hasnt_column('public', 'categorias_risco', 'subcategorias_permitidas',
                    'a lista JSON antiga (subcategorias_permitidas) saiu');

select results_eq($$ select id, nome from public.categorias_risco order by id $$,
  $$ values (2, 'Operacional'), (3, 'Financeiro/Orçamentário'), (4, 'Legal'),
            (5, 'Integridade'), (6, 'Reputação'), (9, 'Riscos da visitação'),
            (10, 'Ocupacionais'), (11, 'Privacidade e Proteção de Dados') $$,
  'as 8 categorias do Quadro 2, com os ids combinados');

-- As 5 que ficam mantêm o apetite e a justificativa; as 3 novas nascem sem DAR.
select results_eq($$ select id, apetite_declarado, justificativa_dar is not null
                       from public.categorias_risco order by id $$,
  $$ values (2, 'moderado', true), (3, 'baixo', true), (4, 'baixo', true), (5, 'baixo', true),
            (6, 'baixo', true), (9, 'pendente_dar', false), (10, 'pendente_dar', false),
            (11, 'pendente_dar', false) $$,
  'apetite mantido nas 5 que ficam; as 3 novas em pendente_dar, sem justificativa');

-- ATENÇÃO: sequências NUNCA voltam no rollback, e um INSERT recusado (como o
-- do 041, barrado pelo CHECK) também gasta um número. Por isso aqui não se
-- espera exatamente 12 (logo depois do db:reset é 12): basta o próximo id
-- ficar acima do maior gravado (11). No bloco 7, depois do setval do
-- alinhamento, o 12 é exato.
select cmp_ok(nextval('public.categorias_risco_id_seq')::int, '>', (select max(id) from public.categorias_risco),
              'o contador de ids está acima do maior id (11): o próximo cadastro não colide');

select results_eq($$ select ordem::int, nome from public.subcategorias_risco
                      where categoria_id = 5 order by ordem $$,
  $$ values (1, 'Abuso de posição ou poder em favor de interesses privados'),
            (2, 'Nepotismo'),
            (3, 'Conflito de interesses'),
            (4, 'Pressão interna ou externa ilegal para influenciar agente público'),
            (5, 'Solicitação ou recebimento de vantagem indevida'),
            (6, 'Utilização de recursos públicos em favor de interesses privados') $$,
  'as 6 subcategorias do Quadro 3 na Integridade, na ordem do quadro');

select is((select count(*)::int from public.subcategorias_risco where categoria_id <> 5), 0,
          'nenhuma subcategoria em outra categoria');

-- ----------------------------------------------------------------------------
-- 2. CHECK do nome (Quadro 2)
-- ----------------------------------------------------------------------------
select throws_ok($$insert into public.categorias_risco (nome, descricao_normativa) values ('Estratégico', 'x')$$,
                 '23514', null, 'categoria "Estratégico" (fora do Quadro 2) é recusada');

-- ----------------------------------------------------------------------------
-- 3. Risco × subcategoria (como administrador: vale para todos)
-- ----------------------------------------------------------------------------
-- inserir_risco(código, categoria, subcategoria): rascunho na FLONA de Caçador.
create or replace function pg_temp.inserir_risco(p_codigo text, p_cat int, p_sub text)
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, subcategoria_integridade, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
  values (p_codigo, '00000000-0000-4000-b000-000000000001', 'Responsável de demonstração',
          'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
          p_cat, p_sub, 2, 3, 0, 'Baixo', 0, 'Baixo', 'rascunho');
$$;

select throws_ok($$select pg_temp.inserir_risco('RADAR-T090-SEM', 5, null)$$,
                 '23514', 'RADAR: risco da categoria Integridade exige uma das subcategorias do Quadro 3.',
                 'Integridade sem subcategoria: recusado pelo gatilho, com mensagem RADAR');
select throws_ok($$select pg_temp.inserir_risco('RADAR-T090-ANTIGA', 5, 'Corrupção e Fraude')$$,
                 '23503', null, 'Integridade com subcategoria antiga (Corrupção e Fraude): recusado pela chave');
select throws_ok($$select pg_temp.inserir_risco('RADAR-T090-OP', 2, 'Nepotismo')$$,
                 '23503', null, 'Operacional com subcategoria da Integridade (Nepotismo): recusado pela chave');
select lives_ok($$select pg_temp.inserir_risco('RADAR-T090-NEP', 5, 'Nepotismo')$$,
                'Integridade com Nepotismo: gravado');

select throws_ok($$update public.riscos set subcategoria_integridade = null where codigo_radar = 'RADAR-T090-NEP'$$,
                 '23514', 'RADAR: risco da categoria Integridade exige uma das subcategorias do Quadro 3.',
                 'apagar a subcategoria de um risco da Integridade: recusado pelo gatilho');
select throws_ok($$update public.riscos set categoria_id = 2 where codigo_radar = 'RADAR-T090-NEP'$$,
                 '23503', null, 'Integridade → Operacional sem limpar a subcategoria: recusado pela chave');
select lives_ok($$update public.riscos set categoria_id = 2, subcategoria_integridade = null
                   where codigo_radar = 'RADAR-T090-NEP'$$,
                'Integridade → Operacional limpando a subcategoria: gravado');

-- ----------------------------------------------------------------------------
-- 4. Pela salvar_ficha_risco (o caminho da tela), como gestor.uc@ (Review Focus 1)
-- ----------------------------------------------------------------------------
-- O rascunho da Integridade sem subcategoria volta com a mensagem RADAR (que o
-- tradutor errosBanco.ts mostra legível), e não com um erro genérico.
create or replace function pg_temp.ficha_integridade(p_sub text)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'objeto_id', '00000000-0000-4000-b000-000000000001',
    'responsavel_risco_nome', 'Responsável fictício',
    'causas', 'falta de rodízio na comissão',
    'evento_risco', 'favorecimento de parente na seleção',
    'consequencias', 'nulidade do processo',
    'objetivo_afetado', 'objetivo de demonstração',
    'categoria_id', 5,
    'subcategoria_integridade', p_sub,
    'probabilidade', 2,
    'impacto', 3);
$$;

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok($$select public.salvar_ficha_risco(pg_temp.ficha_integridade(null))$$,
                 '23514', 'RADAR: risco da categoria Integridade exige uma das subcategorias do Quadro 3.',
                 'salvar_ficha_risco: rascunho da Integridade sem subcategoria volta com a mensagem RADAR');
select f.id as r_ficha
  from public.salvar_ficha_risco(pg_temp.ficha_integridade('Conflito de interesses')) as f
\gset
select pg_temp.sair();
select is((select subcategoria_integridade from public.riscos where id = :'r_ficha'), 'Conflito de interesses',
          'salvar_ficha_risco: Integridade com Conflito de interesses gravada');

-- ----------------------------------------------------------------------------
-- 5. subcategorias_risco: leitura por quem tem perfil; ninguém logado grava
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.subcategorias_risco), 6, 'gestor.uc lê as 6 subcategorias');
select throws_ok($$insert into public.subcategorias_risco (categoria_id, nome, descricao_normativa, ordem)
                   values (5, 'Subcategoria indevida', 'x', 7)$$,
                 '42501', null, 'gestor.uc NÃO cria subcategoria');
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok($$update public.subcategorias_risco set nome = 'Nepotismo cruzado' where nome = 'Nepotismo'$$,
                 '42501', null, 'nem a CGOV altera subcategoria (só por migração)');
select throws_ok($$delete from public.subcategorias_risco where nome = 'Nepotismo'$$,
                 '42501', null, 'nem a CGOV apaga subcategoria (só por migração)');
select pg_temp.entrar_como('sem-perfil@radar.test');
select is((select count(*)::int from public.subcategorias_risco), 0, 'sem-perfil: 0 subcategorias');
select pg_temp.entrar_como_anonimo();
select throws_ok($$select count(*) from public.subcategorias_risco$$, '42501', null, 'anon: sem acesso');
select pg_temp.sair();
select is((select count(*)::int from pg_policies
            where schemaname = 'public' and tablename = 'subcategorias_risco' and cmd <> 'SELECT'), 0,
          'subcategorias_risco não tem política de escrita');

-- ----------------------------------------------------------------------------
-- 6 e 7. Migração na NUVEM: trava e alinhamento sobre a semente antiga
-- ----------------------------------------------------------------------------
-- Cópia do BLOCO 1 da migração 20261122001 (mantenha igual).
create or replace function pg_temp.travar_reclassificacao()
returns void
language plpgsql
as $$
DECLARE
  v_codigos text;
BEGIN
  SELECT string_agg(r.codigo_radar, ', ' ORDER BY r.codigo_radar)
    INTO v_codigos
    FROM public.riscos AS r
   WHERE r.categoria_id IN (1, 7, 8)
      -- Integridade sem subcategoria (o gatilho do bloco 4 recusaria a próxima gravação).
      OR (r.categoria_id = 5 AND r.subcategoria_integridade IS NULL)
      -- Subcategoria fora da Integridade (a chave do bloco 4 não aceitaria a linha).
      OR (r.categoria_id <> 5 AND r.subcategoria_integridade IS NOT NULL)
      OR (r.subcategoria_integridade IS NOT NULL
          AND r.subcategoria_integridade NOT IN (
            'Abuso de posição ou poder em favor de interesses privados',
            'Nepotismo',
            'Conflito de interesses',
            'Pressão interna ou externa ilegal para influenciar agente público',
            'Solicitação ou recebimento de vantagem indevida',
            'Utilização de recursos públicos em favor de interesses privados'));

  IF v_codigos IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: há riscos em categoria que sai do Quadro 2 (Estratégico, Socioambiental ou Tecnologia da Informação) ou com subcategoria fora do Quadro 3, da Integridade sem subcategoria ou com subcategoria fora da Integridade: %; reclassifique esses riscos antes de aplicar esta migração (decisão de 2026-11-22).', v_codigos
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Cópia do BLOCO 3 da migração 20261122001 (mantenha igual).
create or replace function pg_temp.alinhar_categorias_quadro_2()
returns void
language plpgsql
as $$
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
END;
$$;

-- Fotografia do resultado do seed.sql (o alvo do alinhamento).
create temp table _semente_cat as
  select id, nome, descricao_normativa, apetite_declarado, justificativa_dar from public.categorias_risco;
create temp table _semente_sub as
  select categoria_id, nome, descricao_normativa, ordem from public.subcategorias_risco;

-- Recria o estado da NUVEM: as 8 categorias antigas (ids 1 a 8) do seed.sql
-- anterior e nenhuma subcategoria. Os riscos de demonstração usam as
-- categorias 2 e 4, então não dá para apagá-las: as 5 que ficam voltam aos
-- nomes e descrições antigos por UPDATE (o apetite e a justificativa nunca
-- mudaram). Para gravar os nomes antigos, o CHECK novo sai (o rollback do
-- fim o devolve). Os riscos de teste deste arquivo saem antes, senão a chave
-- estrangeira não deixaria apagar as subcategorias.
delete from public.riscos where codigo_radar like 'RADAR-T090-%' or id = :'r_ficha';
alter table public.categorias_risco drop constraint categorias_risco_nome_quadro_2;
delete from public.subcategorias_risco;
delete from public.categorias_risco where id in (9, 10, 11);
update public.categorias_risco as c
   set nome = v.nome, descricao_normativa = v.descricao
  from (values
    (2, 'Operacional', 'Falhas, deficiências ou inadequações em processos internos, pessoas ou sistemas.'),
    (3, 'Orçamentário/Financeiro', 'Eventos que comprometem a execução orçamentária, financeira ou contratual.'),
    (4, 'Conformidade/Legal', 'Descumprimento de leis, portarias, instruções normativas ou determinações de órgãos de controle.'),
    (5, 'Integridade', 'Vulnerabilidades relacionadas a corrupção, fraude, nepotismo, conflito de interesses ou assédio (Portaria 253/2026 — Integra+).'),
    (6, 'Imagem/Reputação', 'Eventos que abalam a credibilidade e a confiança da sociedade no ICMBio.')
  ) as v(id, nome, descricao)
 where c.id = v.id;
insert into public.categorias_risco (id, nome, descricao_normativa, apetite_declarado, justificativa_dar)
values
  (1, 'Estratégico', 'Eventos que afetam objetivos estratégicos e a missão institucional do ICMBio.', 'moderado', 'Admite-se risco residual até Médio em iniciativas estratégicas sob monitoramento.'),
  (7, 'Socioambiental', 'Eventos que impactam ecossistemas, unidades de conservação ou populações tradicionais.', 'baixo', 'Missão finalística de conservação da biodiversidade.'),
  (8, 'Tecnologia da Informação', 'Indisponibilidade de sistemas, incidentes cibernéticos ou perda de dados institucionais.', 'moderado', 'Sistemas suportam risco residual até Médio com plano de contingência ativo.');
select setval('public.categorias_risco_id_seq', 8);

-- 6. TRAVA: um risco na categoria 7 (Socioambiental) faz o bloco 1 parar.
select pg_temp.inserir_risco('RADAR-T090-TRAVA', 7, null);
select throws_like($$select pg_temp.travar_reclassificacao()$$, '%RADAR-T090-TRAVA%',
                   'trava: risco na categoria 7 para a migração e o código aparece na mensagem');
delete from public.riscos where codigo_radar = 'RADAR-T090-TRAVA';

-- Integridade sem subcategoria: no estado antigo não há linhas em
-- subcategorias_risco, então o gatilho deixa gravar (como na nuvem hoje).
select pg_temp.inserir_risco('RADAR-T090-TRAVA-INT', 5, null);
select throws_like($$select pg_temp.travar_reclassificacao()$$, '%RADAR-T090-TRAVA-INT%',
                   'trava: risco da Integridade sem subcategoria para a migração');
delete from public.riscos where codigo_radar = 'RADAR-T090-TRAVA-INT';

-- Subcategoria fora da Integridade: na nuvem a coluna aceitava texto livre,
-- mas aqui a chave estrangeira já existe e recusaria a linha. Para recriar a
-- linha antiga, desligamos gatilhos e chaves (session_replication_role =
-- replica) SÓ neste INSERT e religamos logo depois (o rollback desfaz tudo).
set local session_replication_role = replica;
select pg_temp.inserir_risco('RADAR-T090-TRAVA-OP', 2, 'Nepotismo');
set local session_replication_role = origin;
select throws_like($$select pg_temp.travar_reclassificacao()$$, '%RADAR-T090-TRAVA-OP%',
                   'trava: risco Operacional com subcategoria para a migração');
delete from public.riscos where codigo_radar = 'RADAR-T090-TRAVA-OP';

select lives_ok($$select pg_temp.travar_reclassificacao()$$,
                'trava: sem risco em categoria que sai, a migração segue (caso da nuvem)');

-- 7. ALINHAMENTO sobre a semente antiga.
create temp table _audit_antes as select id from public.auditoria_log;
create temp table _hist_antes as select count(*)::int as n from public.historico_fluxo;

-- ATENÇÃO: aqui o bloco 3 roda sobre o esquema DEPOIS da migração (com a
-- chave riscos_subcategoria_fk, o gatilho trg_riscos_exige_subcategoria e sem
-- a coluna subcategorias_permitidas), e não sobre o esquema antigo, como na
-- nuvem. O resultado é o mesmo: o bloco 3 só grava em categorias_risco
-- (nome, descrição, apetite, justificativa) e em subcategorias_risco; não
-- cita a coluna removida, não grava em riscos (então o gatilho não dispara) e
-- nenhum risco usa as categorias 1, 7 e 8 apagadas (a chave não interfere).
-- Só o CHECK dos nomes atrapalharia, e por isso ele foi retirado acima.
select lives_ok($$select pg_temp.alinhar_categorias_quadro_2()$$,
                'alinhamento roda sobre as 8 categorias antigas, sem usuário logado');
select results_eq(
  $$ select id, nome, descricao_normativa, apetite_declarado, justificativa_dar from public.categorias_risco order by id $$,
  $$ select id, nome, descricao_normativa, apetite_declarado, justificativa_dar from _semente_cat order by id $$,
  'alinhamento: categorias iguais às do seed.sql (nome, descrição, apetite e justificativa)');
select results_eq(
  $$ select categoria_id, nome, descricao_normativa, ordem from public.subcategorias_risco order by ordem $$,
  $$ select categoria_id, nome, descricao_normativa, ordem from _semente_sub order by ordem $$,
  'alinhamento: subcategorias iguais às do seed.sql');
select is(nextval('public.categorias_risco_id_seq')::int, 12, 'alinhamento: contador em 11 (próximo id 12)');
select lives_ok($$alter table public.categorias_risco
  add constraint categorias_risco_nome_quadro_2 check (nome in (
    'Operacional', 'Legal', 'Financeiro/Orçamentário', 'Reputação', 'Integridade',
    'Riscos da visitação', 'Ocupacionais', 'Privacidade e Proteção de Dados'))$$,
  'alinhamento: depois dele o CHECK do bloco 4 cabe (todos os nomes no Quadro 2)');

-- Trilha: 5 UPDATE (as que ficam), 3 DELETE (as que saem), 3 INSERT (as novas).
select results_eq(
  $$ select operacao, count(*)::int from public.auditoria_log
      where tabela_afetada = 'categorias_risco' and id not in (select id from _audit_antes)
      group by operacao order by operacao $$,
  $$ values ('DELETE', 3), ('INSERT', 3), ('UPDATE', 5) $$,
  'alinhamento: a trilha registra 5 alterações, 3 exclusões e 3 inclusões de categoria');
select is((select count(*)::int from public.auditoria_log
            where id not in (select id from _audit_antes) and usuario_id is not null), 0,
          'alinhamento: linhas da trilha sem usuário (quem aplica a migração não está logado)');
select is((select count(*)::int from public.historico_fluxo), (select n from _hist_antes),
          'alinhamento: o apetite não muda, então nenhum risco é reaberto (gatilho da DAR não dispara)');

select * from finish();
rollback;
