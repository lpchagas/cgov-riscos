-- ============================================================================
-- TESTE DA LAC-03 (pgTAP) — alerta do KRI (limite numérico, abertura e prazos)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Este arquivo é montado por SEÇÕES, uma por tarefa do plano do alerta do KRI.
-- Cada tarefa acrescenta a sua seção ao final e soma os seus testes no
-- `plan(N)` abaixo (o plan é o número total de testes do arquivo).
--   Seção 1: feriados e dias úteis (esta).
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(14);

-- ============================================================================
-- SEÇÃO 1 — Feriados e dias úteis
-- ============================================================================
-- Dia útil = segunda a sexta que não está em public.feriados.
--   fn_somar_dias_uteis(d, n)  = o n-ésimo dia útil DEPOIS de d;
--   fn_dias_uteis_entre(i, f)  = dias úteis em (i, f] (exclui i, inclui f);
--                                0 se f <= i.

select has_table('public', 'feriados', '1. a tabela feriados existe');
select has_function('public', 'fn_somar_dias_uteis', array['date', 'integer'], '1. fn_somar_dias_uteis existe');
select has_function('public', 'fn_dias_uteis_entre', array['date', 'date'], '1. fn_dias_uteis_entre existe');

-- Semente: 20/11/2026 (Consciência Negra) e Carnaval de 2027 estão lá.
select is((select count(*)::int from public.feriados where data in ('2026-11-20', '2027-02-08', '2027-02-09')),
          3, '1. a semente traz 20/11/2026 e o Carnaval de 2027');

-- Pula o feriado de 20/11 e dois fins de semana.
select is(public.fn_somar_dias_uteis('2026-11-19', 10), '2026-12-04'::date,
          '1. 10 dias úteis após 19/11/2026 = 04/12/2026');
-- Ciência num sábado: o 1º dia útil seguinte é a segunda 23/11.
select is(public.fn_somar_dias_uteis('2026-11-21', 10), '2026-12-04'::date,
          '1. 10 dias úteis após o sábado 21/11/2026 = 04/12/2026');
select is(public.fn_somar_dias_uteis('2026-11-19', 0), '2026-11-19'::date,
          '1. somar 0 dia útil devolve a própria data');

-- (19/11, 23/11]: 20 é feriado, 21 e 22 são fim de semana; sobra o dia 23.
select is(public.fn_dias_uteis_entre('2026-11-19', '2026-11-23'), 1,
          '1. entre 19/11 e 23/11 há 1 dia útil');
select is(public.fn_dias_uteis_entre('2026-11-23', '2026-11-20'), 0,
          '1. fim antes do início: 0 dia útil');
select is(public.fn_dias_uteis_entre('2026-11-23', '2026-11-23'), 0,
          '1. mesmo dia: 0 dia útil');

-- RLS: gestor lê, mas não grava; CGOV grava.
select pg_temp.entrar_como('gestor.uc@radar.test');
select ok((select count(*) from public.feriados) > 0, '1. gestor lê os feriados');
select throws_ok($$insert into public.feriados (data, nome) values ('2030-01-02', 'teste')$$,
                 '42501', null, '1. gestor não insere em feriados');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$insert into public.feriados (data, nome) values ('2030-01-02', 'Feriado de teste')$$,
                '1. CGOV insere em feriados');
select is(public.fn_dias_uteis_entre('2030-01-01', '2030-01-03'), 1,
          '1. o feriado novo deixa de contar como dia útil');

select * from finish();
rollback;
