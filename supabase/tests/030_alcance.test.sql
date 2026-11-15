-- ============================================================================
-- TESTE DAS FUNÇÕES DE ALCANCE (pgTAP) — Etapa B1, Tarefa 5
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- "Alcance" responde à pergunta: DE QUAIS UNIDADES eu vejo os riscos?
-- (matriz-acesso-responsabilidades.md, seção 4). Aqui conferimos, para cada
-- usuário fictício da semente (@radar.test), o que as funções devolvem:
--
--   unidades_visiveis()      → lista de unidades que a pessoa enxerga
--   pode_ler_objeto(obj)     → a pessoa lê aquele objeto de gestão de riscos?
--   pode_escrever_objeto(obj)→ a pessoa grava nele? (só a própria unidade)
--   chefia_imediata(u)       → quem VALIDA (2º degrau) as fichas da unidade u
--   homologador_de(u)        → quem HOMOLOGA (3º degrau) os riscos críticos de u
--   e_titular_de(u)          → a pessoa é a chefe (ou substituta) de u?
--
-- COMO O TESTE SABE O NÚMERO CERTO? Antes de "logar" como cada pessoa, o
-- próprio teste calcula, com uma consulta de referência sobre a árvore real
-- importada (843 unidades), o conjunto que cada uma deveria ver, e guarda na
-- tabela temporária `_ref_alcance`. Depois compara com o que a função devolve.
--
-- Pré-requisito: `npm run db:reset` (estrutura real + semente de demonstração).
-- Tudo roda dentro de uma transação e é desfeito no final (rollback): as
-- alterações "à força" do fim do arquivo (ciclo, unidade inativa, troca de CT)
-- não vazam para o banco.
-- ============================================================================

begin;

-- Funções de apoio: entrar_como(email), entrar_como_anonimo(), sair().
\ir ajudantes.psql

select plan(102);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador): ids das unidades e conjuntos esperados
-- ----------------------------------------------------------------------------
-- `\gset` guarda o resultado da consulta em variáveis do psql, usadas depois
-- como :'nome'. Assim o teste não depende de poder ler `unidades` logado.
select
  (select id from public.unidades where icmbio_id = '21.0078') as flona_cacador,   -- UC com CT (GR5)
  (select id from public.unidades where icmbio_id = '21.0070') as esec_taim,       -- UC vizinha (GR5, CT Curitiba)
  (select id from public.unidades where icmbio_id = '21.0123') as flona_tapajos,   -- UC sem CT (GR1)
  (select id from public.unidades where icmbio_id = '26.0112') as bav_belterra,    -- Base da FLONA do Tapajós
  (select id from public.unidades where icmbio_id = '23.5005') as ct_curitiba,
  (select id from public.unidades where icmbio_id = '23.1007') as ct_manaus,
  (select id from public.unidades where icmbio_id = '22.0082') as ngi_albardao,    -- NGI vinculado à CT Curitiba
  (select id from public.unidades where icmbio_id = '23.5000') as gr5,
  (select id from public.unidades where icmbio_id = '23.1000') as gr1,
  (select id from public.unidades where icmbio_id = '10.2019') as cgpro,
  (select id from public.unidades where icmbio_id = '10.2024') as cofis,
  (select id from public.unidades where icmbio_id = '10.4000') as dibio,
  (select id from public.unidades where icmbio_id = '10.2000') as diman,
  (select id from public.unidades where icmbio_id = '24.0030') as cnpt,
  (select id from public.unidades where icmbio_id = '10.0000') as presidencia,
  (select id from public.unidades where icmbio_id = '10.0008') as cgov,
  (select id from public.unidades where icmbio_id = '10.0007') as cgge,
  (select count(*) from public.unidades) as total_unidades
\gset

-- Conjunto esperado por pessoa (consulta de referência, independente das funções).
create temp table _ref_alcance (email text, unidade_id uuid);

-- (a) Perfis "de árvore" (gestor, GR, CG): a própria unidade + descendentes.
--     `union` (sem `all`) descarta repetições e faz a recursão parar.
insert into _ref_alcance
with recursive d(email, id) as (
  select p.email, p.unidade_id
    from public.perfis_usuarios p
   where p.ativo and p.papel_governanca in ('gestor', 'gerente_regional', 'coordenador_geral')
  union
  select d.email, f.id from public.unidades f join d on f.unidade_pai_id = d.id
)
select email, id from d;

-- (b) Coordenador Territorial (decisão R9 em decisoes-tecnicas-b1.md): a CT + as unidades VINCULADAS a ela
--     pela coluna `coordenacao_territorial_id` (NGIs e UCs), e as descendentes.
insert into _ref_alcance
with recursive d(email, id) as (
  select p.email, u.id
    from public.perfis_usuarios p
    join public.unidades u on u.id = p.unidade_id or u.coordenacao_territorial_id = p.unidade_id
   where p.ativo and p.papel_governanca = 'coordenador_territorial'
  union
  select d.email, f.id from public.unidades f join d on f.unidade_pai_id = d.id
)
select email, id from d;

-- (c) Os 6 perfis de alcance total: todas as unidades.
insert into _ref_alcance
select p.email, u.id
  from public.perfis_usuarios p cross join public.unidades u
 where p.ativo and p.papel_governanca in ('diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin');

-- Quem estiver "logado" no teste precisa poder ler esta tabela de apoio.
grant select on _ref_alcance to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 1. Segurança: anon NÃO executa as funções; authenticated executa
-- ----------------------------------------------------------------------------
select is(has_function_privilege('anon', 'public.meu_perfil()', 'EXECUTE'), false, 'anon não executa meu_perfil');
select is(has_function_privilege('anon', 'public.unidades_descendentes(uuid)', 'EXECUTE'), false, 'anon não executa unidades_descendentes');
select is(has_function_privilege('anon', 'public.unidades_visiveis()', 'EXECUTE'), false, 'anon não executa unidades_visiveis');
select is(has_function_privilege('anon', 'public.pode_ler_objeto(uuid)', 'EXECUTE'), false, 'anon não executa pode_ler_objeto');
select is(has_function_privilege('anon', 'public.pode_escrever_objeto(uuid)', 'EXECUTE'), false, 'anon não executa pode_escrever_objeto');
select is(has_function_privilege('anon', 'public.chefia_imediata(uuid)', 'EXECUTE'), false, 'anon não executa chefia_imediata');
select is(has_function_privilege('anon', 'public.homologador_de(uuid)', 'EXECUTE'), false, 'anon não executa homologador_de');
select is(has_function_privilege('anon', 'public.e_titular_de(uuid)', 'EXECUTE'), false, 'anon não executa e_titular_de');
select is(has_function_privilege('anon', 'public.pode_escrever_unidade(uuid)', 'EXECUTE'), false, 'anon não executa pode_escrever_unidade');
select is(has_function_privilege('anon', 'public.pode_criar_objeto_em(uuid)', 'EXECUTE'), false, 'anon não executa pode_criar_objeto_em');
select is(has_function_privilege('authenticated', 'public.unidades_visiveis()', 'EXECUTE'), true, 'authenticated executa unidades_visiveis');

-- As funções rodam com os direitos do dono (SECURITY DEFINER) e com search_path vazio.
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil', 'unidades_descendentes', 'unidades_visiveis', 'pode_ler_objeto',
                        'pode_escrever_objeto', 'pode_escrever_unidade', 'pode_criar_objeto_em',
                        'chefia_imediata', 'homologador_de', 'e_titular_de')
      and p.prosecdef and p.proconfig @> array['search_path=""']),
  10, 'as 10 funções são SECURITY DEFINER com search_path vazio');

-- Na prática: o visitante anônimo recebe "permissão negada" (código 42501).
select pg_temp.entrar_como_anonimo();
select throws_ok('select * from public.unidades_visiveis()', '42501', null, 'anon: unidades_visiveis é negada');
select throws_ok($$select public.pode_ler_objeto('00000000-0000-4000-b000-000000000001')$$, '42501', null,
                 'anon: pode_ler_objeto é negada');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 2. gestor.uc — chefe da FLONA de Caçador (UC com CT, GR5)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*) from public.unidades_visiveis()),
          (select count(*) from _ref_alcance where email = 'gestor.uc@radar.test'),
          'gestor.uc: número de unidades visíveis = referência');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'gestor.uc@radar.test'$$,
              'gestor.uc: conjunto de unidades visíveis = referência');
select ok(:'flona_cacador'::uuid in (select * from public.unidades_visiveis()), 'gestor.uc vê a própria UC');
select ok(:'esec_taim'::uuid not in (select * from public.unidades_visiveis()), 'gestor.uc NÃO vê a UC vizinha (ESEC do Taim)');
select is((public.meu_perfil()).unidade_id, :'flona_cacador'::uuid, 'gestor.uc: meu_perfil traz a unidade de lotação');
select ok(public.e_titular_de(:'flona_cacador'), 'gestor.uc é titular da FLONA de Caçador');
select ok(public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'), 'gestor.uc escreve no objeto da própria UC');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000005'), 'gestor.uc NÃO escreve no objeto da GR5');
select ok(not public.pode_ler_objeto('00000000-0000-4000-b000-000000000005'), 'gestor.uc NÃO lê o objeto da GR5');

-- ----------------------------------------------------------------------------
-- 3. gestor.uc-sem-ct — chefe da FLONA do Tapajós (UC sem CT, GR1)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'gestor.uc-sem-ct@radar.test'$$,
              'gestor.uc-sem-ct: unidades visíveis = referência');
select ok(:'flona_tapajos'::uuid in (select * from public.unidades_visiveis()), 'gestor.uc-sem-ct vê a própria UC');
select ok(:'bav_belterra'::uuid in (select * from public.unidades_visiveis()), 'gestor.uc-sem-ct vê a Base Avançada da UC');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000003'), 'gestor.uc-sem-ct lê o objeto da Base');
select ok(public.pode_escrever_objeto('00000000-0000-4000-b000-000000000003'),
          'gestor.uc-sem-ct escreve na Base (subunidade interna, P8)');

-- ----------------------------------------------------------------------------
-- 4. gestor.base — chefe da BAV Belterra (só a Base)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.base@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'gestor.base@radar.test'$$,
              'gestor.base: unidades visíveis = referência');
select ok(:'flona_tapajos'::uuid not in (select * from public.unidades_visiveis()), 'gestor.base NÃO vê a UC-mãe');

-- ----------------------------------------------------------------------------
-- 5. ct — Coordenador Territorial de Curitiba (vínculo por coordenacao_territorial_id)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('ct@radar.test');
select is((select count(*) from public.unidades_visiveis()),
          (select count(*) from _ref_alcance where email = 'ct@radar.test'),
          'ct: número de unidades visíveis = referência');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'ct@radar.test'$$,
              'ct: conjunto de unidades visíveis = referência');
select ok(:'flona_cacador'::uuid in (select * from public.unidades_visiveis()), 'ct vê a UC vinculada (FLONA de Caçador)');
select ok(:'esec_taim'::uuid in (select * from public.unidades_visiveis()), 'ct vê a outra UC vinculada (ESEC do Taim)');
select ok(:'ngi_albardao'::uuid in (select * from public.unidades_visiveis()), 'ct vê o NGI vinculado (ICMBio Albardão)');
select ok(:'gr5'::uuid not in (select * from public.unidades_visiveis()), 'ct NÃO vê a GR5 (unidade de cima)');
select ok(:'flona_tapajos'::uuid not in (select * from public.unidades_visiveis()), 'ct NÃO vê UC de outra GR');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'), 'ct lê o objeto da UC vinculada');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'), 'ct NÃO escreve no objeto da UC (só lê)');

-- ----------------------------------------------------------------------------
-- 6. gr — Gerente Regional da GR5: tudo o que está abaixo da GR5
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gr@radar.test');
select is((select count(*) from public.unidades_visiveis()),
          (select count(*) from _ref_alcance where email = 'gr@radar.test'),
          'gr: número de unidades visíveis = referência');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'gr@radar.test'$$,
              'gr: vê tudo da GR5 (= referência)');
select ok(:'ct_curitiba'::uuid in (select * from public.unidades_visiveis()), 'gr vê a CT Curitiba');
select ok(:'flona_cacador'::uuid in (select * from public.unidades_visiveis()), 'gr vê a UC com CT');
select ok(public.e_titular_de(:'gr5'), 'gr é titular da GR5');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'), 'gr NÃO escreve no objeto da UC');
select ok(public.pode_escrever_objeto('00000000-0000-4000-b000-000000000005'), 'gr escreve no objeto da própria GR');

-- ----------------------------------------------------------------------------
-- 7. gr1 — Gerente Regional da GR1: inclui a UC sem CT e a Base
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gr1@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'gr1@radar.test'$$,
              'gr1: vê tudo da GR1 (= referência)');
select ok(:'bav_belterra'::uuid in (select * from public.unidades_visiveis()), 'gr1 vê a Base da UC sem CT');

-- ----------------------------------------------------------------------------
-- 8. servidor.gr — servidor (não titular) lotado na GR5, perfil gestor
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('servidor.gr@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'servidor.gr@radar.test'$$,
              'servidor.gr: unidades visíveis = referência');
select ok(not public.e_titular_de(:'gr5'), 'servidor.gr NÃO é titular da GR5 (não valida nem homologa)');

-- ----------------------------------------------------------------------------
-- 9. cg.cgpro — Coordenador-Geral da CGPRO: árvore + visão por processo (P1b)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cg.cgpro@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'cg.cgpro@radar.test'$$,
              'cg.cgpro: unidades visíveis = referência (CGPRO e descendentes)');
select ok(:'cofis'::uuid in (select * from public.unidades_visiveis()), 'cg.cgpro vê a COFIS');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000002'),
          'cg.cgpro lê o objeto da UC ligado ao processo 2.02.3 (visão por processo)');
select ok(not public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'),
          'cg.cgpro NÃO lê o objeto de UC sem ligação com processo da CGPRO');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000006'), 'cg.cgpro lê o objeto da COFIS (árvore)');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000002'),
          'cg.cgpro NÃO escreve no objeto da UC (a visão por processo é só leitura)');

-- ----------------------------------------------------------------------------
-- 10. coord.cofis e centro — gestores da Sede
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('coord.cofis@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'coord.cofis@radar.test'$$,
              'coord.cofis: unidades visíveis = referência');
select pg_temp.entrar_como('centro@radar.test');
select set_eq('select * from public.unidades_visiveis()',
              $$select unidade_id from _ref_alcance where email = 'centro@radar.test'$$,
              'centro: unidades visíveis = referência');

-- ----------------------------------------------------------------------------
-- 11. Os 6 perfis de alcance total veem TODAS as unidades
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('diretor.dibio@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'diretor (DIBIO) vê todas as unidades');
select pg_temp.entrar_como('diretor.diman@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'diretor (DIMAN) vê todas as unidades');
select pg_temp.entrar_como('presidente@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'presidencia vê todas as unidades');
select pg_temp.entrar_como('auditor@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'auditoria vê todas as unidades');
select ok(public.pode_escrever_objeto('00000000-0000-4000-b000-000000000010'), 'auditor escreve no objeto da própria AUDIT');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'), 'auditor NÃO escreve fora da AUDIT');
select pg_temp.entrar_como('cgov@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'cgov vê todas as unidades');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'),
          'cgov NÃO escreve em objeto já existente de outra unidade');
select ok(public.pode_criar_objeto_em(:'flona_cacador'), 'cgov pode CRIAR objeto em qualquer unidade (exceção da CGOV)');
select pg_temp.entrar_como('cgge@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'cgge vê todas as unidades');
select pg_temp.entrar_como('gabin@radar.test');
select is((select count(*) from public.unidades_visiveis()), :'total_unidades'::bigint, 'gabin vê todas as unidades');

-- Quem não é da CGOV só cria objeto na própria unidade.
select pg_temp.entrar_como('gestor.uc@radar.test');
select ok(not public.pode_criar_objeto_em(:'esec_taim'), 'gestor.uc NÃO cria objeto em outra unidade');

-- ----------------------------------------------------------------------------
-- 12. sem-perfil e inativo veem 0 (conta sem perfil ativo não vê nada)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('sem-perfil@radar.test');
select is((select count(*) from public.unidades_visiveis()), 0::bigint, 'sem-perfil vê 0 unidades');
select ok(public.meu_perfil() is null, 'sem-perfil: meu_perfil é nulo');
select ok(not public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'), 'sem-perfil não lê objeto nenhum');
select pg_temp.entrar_como('inativo@radar.test');
select is((select count(*) from public.unidades_visiveis()), 0::bigint, 'inativo vê 0 unidades');
select ok(public.meu_perfil() is null, 'inativo: meu_perfil é nulo');
select ok(not public.pode_escrever_objeto('00000000-0000-4000-b000-000000000001'), 'inativo não escreve em objeto nenhum');

-- ----------------------------------------------------------------------------
-- 13. chefia_imediata (quem valida) e homologador_de (quem homologa)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(public.chefia_imediata(:'flona_tapajos'), :'gr1'::uuid, 'chefia_imediata da UC sem CT é a GR');
select is(public.chefia_imediata(:'flona_cacador'), :'ct_curitiba'::uuid, 'chefia_imediata da UC com CT é a CT (R9)');
select is(public.chefia_imediata(:'bav_belterra'), :'flona_tapajos'::uuid, 'chefia_imediata da Base é a UC');
select is(public.chefia_imediata(:'cnpt'), :'dibio'::uuid, 'chefia_imediata do Centro é a DIBIO');
select is(public.chefia_imediata(:'cgov'), :'cgge'::uuid, 'chefia_imediata da CGOV é a CGGE');
select is(public.chefia_imediata(:'ct_curitiba'), :'gr5'::uuid, 'chefia_imediata da CT é a GR');
select is(public.homologador_de(:'cgov'), :'presidencia'::uuid, 'homologador_de da CGOV é a Presidência');
select is(public.homologador_de(:'cofis'), :'diman'::uuid, 'homologador_de da COFIS é a DIMAN');
select is(public.homologador_de(:'flona_tapajos'), :'gr1'::uuid, 'homologador_de da UC (sem CT) é a GR');
select is(public.homologador_de(:'flona_cacador'), :'gr5'::uuid, 'homologador_de da UC com CT é a GR');
select is(public.homologador_de(:'bav_belterra'), :'gr1'::uuid, 'homologador_de da Base é a GR');
select is(public.homologador_de(:'cnpt'), :'dibio'::uuid, 'homologador_de do Centro é a DIBIO');

-- ----------------------------------------------------------------------------
-- 14. Pontos de atenção (alterações "à força", desfeitas pelo rollback final)
-- ----------------------------------------------------------------------------
-- Ponto 1 — CICLO na árvore: fazemos a GR1 virar "filha" da FLONA do Tapajós,
-- que já é filha da GR1 (GR1 → FLONA → GR1 → ...). A função tem de terminar.
select pg_temp.sair();
update public.unidades set unidade_pai_id = :'flona_tapajos' where id = :'gr1';
select pg_temp.entrar_como('gr1@radar.test');
select is((select count(*) from public.unidades_descendentes(:'gr1')),
          (select count(*) from _ref_alcance where email = 'gr1@radar.test'),
          'ponto 1: com ciclo, unidades_descendentes termina e não repete ids');
select is((select count(*) from public.unidades_descendentes(:'gr1')),
          (select count(distinct x) from public.unidades_descendentes(:'gr1') x),
          'ponto 1: nenhum id repetido');
select is(public.homologador_de(:'bav_belterra'), :'gr1'::uuid, 'ponto 1: homologador_de também termina com ciclo');
select pg_temp.sair();
update public.unidades set unidade_pai_id = :'presidencia' where id = :'gr1';   -- desfaz o ciclo

-- Ponto 2 — unidade INATIVA: o importador desativou a FLONA de Caçador, mas o
-- chefe lotado nela continua vendo a própria unidade e o objeto dela.
update public.unidades set ativa = false where id = :'flona_cacador';
select pg_temp.entrar_como('gestor.uc@radar.test');
select ok(:'flona_cacador'::uuid in (select * from public.unidades_visiveis()),
          'ponto 2: lotado em unidade inativa continua vendo a própria unidade');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'),
          'ponto 2: e continua lendo o objeto dela');
select pg_temp.sair();
update public.unidades set ativa = true where id = :'flona_cacador';

-- Ponto 3 — UC muda de CT: a FLONA de Caçador passa da CT Curitiba para a CT
-- Manaus (como numa reimportação). A CT antiga deixa de vê-la.
update public.unidades set coordenacao_territorial_id = :'ct_manaus' where id = :'flona_cacador';
select pg_temp.entrar_como('ct@radar.test');
select ok(:'flona_cacador'::uuid not in (select * from public.unidades_visiveis()),
          'ponto 3: a UC movida sai do alcance da CT antiga');
select ok(not public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'),
          'ponto 3: e a CT antiga deixa de ler o objeto da UC');
select ok(:'esec_taim'::uuid in (select * from public.unidades_visiveis()),
          'ponto 3: as outras UCs da CT antiga continuam no alcance');
select is(public.chefia_imediata(:'flona_cacador'), :'ct_manaus'::uuid, 'ponto 3: a chefia imediata passa a ser a CT nova');

-- Ponto 3b — UC muda de MÃE na árvore (unidade_pai_id): a FLONA de Caçador
-- passa da GR5 para a GR1 (como numa reimportação em que a lista do
-- SharePoint trocou a gerência). O alcance segue a árvore NOVA: a GR antiga
-- deixa de ver a UC e a GR nova passa a vê-la — sem nenhum ajuste à mão.
select pg_temp.sair();
update public.unidades set unidade_pai_id = :'gr1' where id = :'flona_cacador';
select pg_temp.entrar_como('gr@radar.test');
select ok(:'flona_cacador'::uuid not in (select * from public.unidades_visiveis()),
          'ponto 3b: a UC movida sai do alcance da GR antiga (gr@, GR5)');
select ok(not public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'),
          'ponto 3b: e a GR antiga deixa de ler o objeto da UC');
select pg_temp.entrar_como('gr1@radar.test');
select ok(:'flona_cacador'::uuid in (select * from public.unidades_visiveis()),
          'ponto 3b: a UC movida entra no alcance da GR nova (gr1@, GR1)');
select ok(public.pode_ler_objeto('00000000-0000-4000-b000-000000000001'),
          'ponto 3b: e a GR nova passa a ler o objeto da UC');
select is(public.homologador_de(:'flona_cacador'), :'gr1'::uuid, 'ponto 3b: quem homologa passa a ser a GR nova');

select * from finish();
rollback;
