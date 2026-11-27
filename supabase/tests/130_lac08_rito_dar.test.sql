-- ============================================================================
-- TESTE DA LAC-08 (pgTAP) — o rito da DAR no banco
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Política (minuta SEI 024241420) e pela Metodologia (SEI 024421455), o
-- apetite da DAR só vale depois da PORTARIA do Presidente. Antes dela vêm a
-- MINUTA (feita pela CGOV), a manifestação do CTGRIC e a deliberação do CIG.
-- Este teste confere que o banco só aceita esse caminho:
--   1. tabelas, visão, RLS e o fim da gravação direta do apetite (Task 1);
--   2. minuta, CTGRIC e CIG (Task 2);
--   3. portaria e retificação (Task 3);
--   4. conversão dos apetites gravados sem portaria (Task 4).
-- Só dados de demonstração (@radar.test, "Portaria nº 000/2025 (exemplo)").
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(36);

-- ============================================================================
-- 1. Tabelas, visão, RLS e o fim do UPDATE direto (Task 1)
-- ============================================================================

-- 1.1 As peças existem.
select has_table('public', 'dar_minutas',           'tabela dar_minutas existe');
select has_table('public', 'dar_minuta_categorias', 'tabela dar_minuta_categorias existe');
select has_table('public', 'dar_rito_eventos',      'tabela dar_rito_eventos existe');
select has_table('public', 'dar_portarias',         'tabela dar_portarias existe');
select has_view ('public', 'dar_situacao',          'visão dar_situacao existe');

-- 1.2 A semente: uma DAR de exemplo já publicada, com os apetites de hoje.
select is((select count(*)::int from public.dar_minutas where etapa = 'publicada'), 1,
          'semente: 1 minuta publicada');
select is((select count(*)::int from public.dar_minutas where etapa <> 'publicada'), 0,
          'semente: nenhuma minuta em andamento');
select is((select p.numero from public.dar_portarias p), '000/2025 (exemplo)',
          'semente: a portaria de exemplo');
select is((select string_agg(id || '=' || apetite_declarado, ',' order by id) from public.categorias_risco),
          '2=moderado,3=baixo,4=baixo,5=baixo,6=baixo,9=pendente_dar,10=pendente_dar,11=pendente_dar',
          'semente: os apetites de hoje (2 moderado; 3 a 6 baixo; 9 a 11 pendentes)');
select is((select string_agg(categoria_id || '=' || apetite_proposto, ',' order by categoria_id)
             from public.dar_minuta_categorias),
          '2=moderado,3=baixo,4=baixo,5=baixo,6=baixo,9=pendente_dar,10=pendente_dar,11=pendente_dar',
          'semente: a minuta publicada guarda os mesmos apetites');

-- 1.3 Quem tem perfil lê; anônimo não.
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.dar_minutas), 1, 'gestor.uc lê a minuta');
select is((select count(*)::int from public.dar_minuta_categorias), 8, 'gestor.uc lê as 8 categorias da minuta');
select ok((select count(*) from public.dar_rito_eventos) >= 4, 'gestor.uc lê os eventos do rito');
select is((select count(*)::int from public.dar_portarias), 1, 'gestor.uc lê a portaria');
select is((select etapa || '/' || portaria_numero from public.dar_situacao), 'publicada/000/2025 (exemplo)',
          'gestor.uc lê a situação: publicada, com a portaria de exemplo');
select is((select dia_prazo from public.dar_situacao), null::int, 'fora de "ressalvas" não há contador de prazo');
select pg_temp.entrar_como('sem-perfil@radar.test');
select is((select count(*)::int from public.dar_minutas), 0, 'sem-perfil não lê nada');
select pg_temp.entrar_como_anonimo();
select throws_ok($$select count(*) from public.dar_minutas$$, '42501', null, 'anônimo: sem acesso');

-- 1.4 Ninguém grava direto: nem o gestor, nem a CGOV. Tudo passa pelas RPCs.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok($$insert into public.dar_minutas default values$$, '42501', null,
                 'gestor.uc não cria minuta direto');
select throws_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$, '42501', null,
                 'gestor.uc não muda o apetite direto (42501)');
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok($$insert into public.dar_minutas default values$$, '42501', null,
                 'CGOV não cria minuta direto');
select throws_ok($$update public.dar_minutas set etapa = 'minuta'$$, '42501', null,
                 'CGOV não muda a etapa direto');
select throws_ok($$delete from public.dar_minuta_categorias$$, '42501', null,
                 'CGOV não apaga categorias da minuta direto');
select throws_ok($$update public.dar_rito_eventos set observacao = 'x'$$, '42501', null,
                 'CGOV não altera evento do rito direto');
select throws_ok($$update public.dar_portarias set numero = '1/2026'$$, '42501', null,
                 'CGOV não altera a portaria direto');
select throws_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$, '42501', null,
                 'CGOV também não muda o apetite direto: só pela portaria (42501)');
select throws_ok($$update public.categorias_risco set justificativa_dar = 'x' where id = 2$$, '42501', null,
                 'CGOV não muda a justificativa direto');
select throws_ok($$delete from public.categorias_risco where id = 9$$, '42501', null,
                 'CGOV não apaga categoria (apagar e recriar mudaria o apetite sem portaria)');
select pg_temp.sair();
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'o apetite da categoria 2 continua moderado');

-- 1.5 Regras que valem até para o dono do banco.
select lives_ok($$insert into public.dar_minutas (etapa) values ('minuta')$$,
                'dono: abre uma minuta em andamento');
select throws_ok($$insert into public.dar_minutas (etapa) values ('no_ctgric')$$, '23505', null,
                 'índice único: só uma minuta fora de "publicada" por vez');
select throws_ok($$insert into public.dar_minutas (etapa) values ('vigente')$$, '23514', null,
                 'etapa fora da lista é recusada (CHECK)');
select throws_ok($$update public.dar_rito_eventos set observacao = 'x'$$, 'P0001', null,
                 'evento do rito é imutável, até para o dono (update)');
select throws_ok($$delete from public.dar_rito_eventos$$, 'P0001', null,
                 'evento do rito é imutável, até para o dono (delete)');
select throws_ok($$delete from public.dar_portarias$$, 'P0001', null,
                 'a portaria não pode ser apagada, nem pelo dono');

-- 1.6 O ajudante de teste grava o apetite como dono e mantém o autor (auth.uid()).
select pg_temp.entrar_como('cgov@radar.test');
select pg_temp.publicar_dar_teste(9, 'moderado');
select is((select apetite_declarado from public.categorias_risco where id = 9), 'moderado',
          'ajudante publicar_dar_teste grava o apetite (só nos testes)');
select pg_temp.sair();

select * from finish();
rollback;
