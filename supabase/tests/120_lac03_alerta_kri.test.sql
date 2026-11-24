-- ============================================================================
-- TESTE DA LAC-03 (pgTAP) — alerta do KRI (limite numérico, abertura e prazos)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Este arquivo é montado por SEÇÕES, uma por tarefa do plano do alerta do KRI.
-- Cada tarefa acrescenta a sua seção ao final e soma os seus testes no
-- `plan(N)` abaixo (o plan é o número total de testes do arquivo).
--   Seção 1: feriados e dias úteis;
--   Seção 2: limite e leitura numéricos, com conversão do texto antigo.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(56);

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
select is((select count(*)::int from public.feriados), 26, '1. a semente tem 26 feriados');
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

-- Entrada nula dá resultado nulo (STRICT), sem laço infinito.
select is(public.fn_somar_dias_uteis(null, 10), null, '1. somar dias úteis a data nula devolve nulo');
select is(public.fn_dias_uteis_entre(null, '2026-11-23'), null, '1. dias úteis com início nulo devolve nulo');
-- O resultado não depende do fuso horário da sessão.
set local timezone = 'America/Sao_Paulo';
select is(public.fn_dias_uteis_entre('2026-11-19', '2026-11-23'), 1, '1. mesmo resultado em America/Sao_Paulo');
set local timezone = 'Pacific/Auckland';
select is(public.fn_dias_uteis_entre('2026-11-19', '2026-11-23'), 1, '1. mesmo resultado em Pacific/Auckland');
-- Anon não executa as funções (só se confere o privilégio; não se chama como anon).
select is(has_function_privilege('anon', 'public.fn_somar_dias_uteis(date,integer)', 'EXECUTE')
          or has_function_privilege('anon', 'public.fn_dias_uteis_entre(date,date)', 'EXECUTE'),
          false, '1. anon não tem EXECUTE nas funções de dias úteis');

-- RLS: gestor lê, mas não grava; CGOV grava.
select pg_temp.entrar_como('gestor.uc@radar.test');
select ok((select count(*) from public.feriados) > 0, '1. gestor lê os feriados');
select throws_ok($$insert into public.feriados (data, nome) values ('2030-01-02', 'teste')$$,
                 '42501', null, '1. gestor não insere em feriados');
select is(pg_temp.linhas_afetadas($$update public.feriados set nome = 'x' where data = '2026-11-20'$$), 0,
          '1. gestor não altera feriados (0 linhas)');
select is(pg_temp.linhas_afetadas($$delete from public.feriados where data = '2026-11-20'$$), 0,
          '1. gestor não apaga feriados (0 linhas)');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$insert into public.feriados (data, nome) values ('2030-01-02', 'Feriado de teste')$$,
                '1. CGOV insere em feriados');
select is(public.fn_dias_uteis_entre('2030-01-01', '2030-01-03'), 1,
          '1. o feriado novo deixa de contar como dia útil');

-- ============================================================================
-- SEÇÃO 2 — Limite e leitura numéricos, com conversão
-- ============================================================================
-- O limite de alerta do KRI deixa de ser só texto: ganha operador (>, >=, <, <=),
-- valor e unidade. O texto antigo (`limite_alerta`) fica só para leitura.
-- fn_converter_limite_texto traduz o texto QUANDO ele é inequívoco; senão devolve
-- nenhuma linha ("a converter" por uma pessoa).

select pg_temp.sair();

select has_column('public', 'indicadores_kri', 'limite_operador', '2. indicadores_kri.limite_operador existe');
select has_column('public', 'indicadores_kri', 'limite_valor', '2. indicadores_kri.limite_valor existe');
select has_column('public', 'indicadores_kri', 'limite_unidade', '2. indicadores_kri.limite_unidade existe');
select has_column('public', 'medicoes_kri', 'valor_numerico', '2. medicoes_kri.valor_numerico existe');
select has_function('public', 'fn_converter_limite_texto', array['text'], '2. fn_converter_limite_texto existe');

-- Texto -> (operador, valor, unidade). Formato do resultado: 'op|valor|unidade'.
create or replace function pg_temp.conv(t text) returns text language sql as $$
  select operador || '|' || valor::text || '|' || coalesce(unidade, '')
    from public.fn_converter_limite_texto(t);
$$;

select is(pg_temp.conv('< 80%'), '<|80|%', '2. "< 80%" vira (<, 80, %)');
select is(pg_temp.conv('Abaixo de 70%'), '<|70|%', '2. "Abaixo de 70%" vira (<, 70, %)');
select is(pg_temp.conv('Acima de 5%'), '>|5|%', '2. "Acima de 5%" vira (>, 5, %)');
select is(pg_temp.conv('>= 2,5 dias'), '>=|2.5|dias', '2. ">= 2,5 dias" vira (>=, 2.5, dias), vírgula decimal');
select is(pg_temp.conv('<=3'), '<=|3|', '2. "<=3" (sem espaço e sem unidade) vira (<=, 3, nada)');
select is(pg_temp.conv('MAIOR QUE 7.5 dias'), '>|7.5|dias', '2. "MAIOR QUE 7.5 dias": maiúsculas e ponto decimal');
select is(pg_temp.conv('menor que 4'), '<|4|', '2. "menor que 4" vira (<, 4, nada)');
select is((select count(*)::int from public.fn_converter_limite_texto('Até 10%')), 0, '2. "Até 10%" fica a converter');
select is((select count(*)::int from public.fn_converter_limite_texto('Entre 5 e 10')), 0, '2. "Entre 5 e 10" (intervalo) fica a converter');
select is((select count(*)::int from public.fn_converter_limite_texto('Abaixo de 70% ou acima de 90%')), 0,
          '2. dois números e palavras extras: fica a converter');
select is((select count(*)::int from public.fn_converter_limite_texto('> 5 ou')), 0, '2. "> 5 ou": conectivo não é unidade');
select is((select count(*)::int from public.fn_converter_limite_texto('< 5 e')), 0, '2. "< 5 e": conectivo não é unidade');
select is((select count(*)::int from public.fn_converter_limite_texto('')), 0, '2. texto vazio: fica a converter');
select is((select count(*)::int from public.fn_converter_limite_texto(null)), 0, '2. texto nulo: fica a converter');

-- Número de um texto de leitura antiga: só número, com % opcional.
select is(public.fn_numero_de_texto('12,5%'), 12.5::numeric, '2. "12,5%" vira 12.5');
select is(public.fn_numero_de_texto(' 80 '), 80::numeric, '2. " 80 " vira 80');
select is(public.fn_numero_de_texto('cerca de 80'), null::numeric, '2. "cerca de 80" não vira número');
select is(public.fn_numero_de_texto('12 dias'), null::numeric, '2. "12 dias" não vira número (só % é aceito)');

-- CHECKs: operador e valor andam juntos.
select throws_ok($$insert into public.indicadores_kri
    (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta,
     responsavel_medicao, limite_operador)
  select id, 'KRI t', 'f', 'fonte', 'Mensal', '0', 'x', 'r', '<' from public.objetos_contexto limit 1$$,
  '23514', null, '2. CHECK recusa operador sem valor');
select throws_ok($$insert into public.indicadores_kri
    (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta,
     responsavel_medicao, limite_operador, limite_valor)
  select id, 'KRI t', 'f', 'fonte', 'Mensal', '0', 'x', 'r', '!=', 5 from public.objetos_contexto limit 1$$,
  '23514', null, '2. CHECK recusa operador fora de > >= < <=');

-- O UPDATE de conversão da migração (encapsulado em fn_converter_limites_existentes).
insert into public.indicadores_kri
  (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta, responsavel_medicao)
select id, n, 'f', 'fonte', 'Mensal', '0', l, 'r'
  from (select id from public.objetos_contexto limit 1) o,
       (values ('KRI-T2 claro', 'Abaixo de 70%'), ('KRI-T2 duvidoso', 'Até 10%')) v(n, l);

create temp table t2_res as select * from public.fn_converter_limites_existentes();

select is((select convertidos from t2_res), 1, '2. a conversão converteu 1 KRI de teste (o claro)');
select cmp_ok((select a_converter from t2_res), '>=', 1, '2. a conversão deixou pelo menos 1 KRI a converter (o duvidoso)');
select is((select limite_operador || '|' || limite_valor::text || '|' || limite_unidade
             from public.indicadores_kri where nome_indicador = 'KRI-T2 claro'),
          '<|70|%', '2. o KRI "Abaixo de 70%" ficou com (<, 70, %)');
select is((select limite_operador from public.indicadores_kri where nome_indicador = 'KRI-T2 duvidoso'),
          null, '2. o KRI "Até 10%" continua sem limite numérico');
select is((select limite_alerta from public.indicadores_kri where nome_indicador = 'KRI-T2 claro'),
          'Abaixo de 70%', '2. o texto antigo é preservado');

-- fn_kri_completo: aceita limite numérico OU o texto antigo.
select is((select public.fn_kri_completo(k) from public.indicadores_kri k where nome_indicador = 'KRI-T2 duvidoso'),
          true, '2. KRI só com o texto antigo continua completo');
update public.indicadores_kri set limite_alerta = '', limite_operador = '>', limite_valor = 1
 where nome_indicador = 'KRI-T2 duvidoso';
select is((select public.fn_kri_completo(k) from public.indicadores_kri k where nome_indicador = 'KRI-T2 duvidoso'),
          true, '2. KRI só com o limite numérico é completo');
update public.indicadores_kri set limite_operador = null, limite_valor = null
 where nome_indicador = 'KRI-T2 duvidoso';
select is((select public.fn_kri_completo(k) from public.indicadores_kri k where nome_indicador = 'KRI-T2 duvidoso'),
          false, '2. KRI sem limite numérico e sem texto: incompleto');
select is(public.fn_kri_completo(k), true, '2. KRI da demonstração (texto antigo + limite numérico) completo')
  from public.indicadores_kri k where limite_operador = '>' and limite_valor = 10 limit 1;

select * from finish();
rollback;
