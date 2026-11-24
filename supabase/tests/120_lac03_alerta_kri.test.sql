-- ============================================================================
-- TESTE DA LAC-03 (pgTAP) — alerta do KRI (limite numérico, abertura e prazos)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Este arquivo é montado por SEÇÕES, uma por tarefa do plano do alerta do KRI.
-- Cada tarefa acrescenta a sua seção ao final e soma os seus testes no
-- `plan(N)` abaixo (o plan é o número total de testes do arquivo).
--   Seção 1: feriados e dias úteis;
--   Seção 2: limite e leitura numéricos, com conversão do texto antigo;
--   Seção 3: o banco calcula o alerta e abre o prazo de 10 dias úteis;
--   Seção 4: a ficha do risco (salvar_ficha_risco) grava o limite numérico.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(118);

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

-- ============================================================================
-- SEÇÃO 3 — Alerta calculado e aberto pelo banco
-- ============================================================================
-- Quem decide se a leitura "passa do limite" é o BANCO (o front pode mentir ou
-- errar). Ao gravar uma leitura numérica, o gatilho compara com o limite do KRI
-- e grava `em_alerta`. A primeira leitura em alerta abre um registro em
-- `alertas_kri` com a ciência (início do prazo de 10 dias úteis) em hoje.

select pg_temp.sair();

select has_table('public', 'alertas_kri', '3. a tabela alertas_kri existe');
select has_view('public', 'alertas_kri_situacao', '3. a visão alertas_kri_situacao existe');
select has_trigger('public', 'medicoes_kri', 'trg_medicao_calcula_alerta', '3. gatilho que calcula o alerta');
select has_trigger('public', 'medicoes_kri', 'trg_medicao_abre_alerta', '3. gatilho que abre o alerta');
select has_trigger('public', 'alertas_kri', 'trg_auditoria_alertas_kri', '3. gatilho de auditoria dos alertas');
select is((select (reloptions @> array['security_invoker=true'])
             from pg_class where oid = 'public.alertas_kri_situacao'::regclass),
          true, '3. a visão é security_invoker');
select is(has_table_privilege('authenticated', 'public.alertas_kri', 'INSERT')
       or has_table_privilege('authenticated', 'public.alertas_kri', 'UPDATE')
       or has_table_privilege('authenticated', 'public.alertas_kri', 'DELETE')
       or has_table_privilege('anon', 'public.alertas_kri', 'SELECT'),
          false, '3. authenticated não escreve e anon não lê alertas_kri');

select '00000000-0000-4000-b000-000000000001'::uuid as obj_a,
       '00000000-0000-4000-b000-000000000004'::uuid as obj_b
\gset

-- Cenário: dois KRIs do objeto A ("menor que 70 %" e "maior que 10 %"), um KRI
-- só com texto antigo e um risco aprovado ligado ao KRI "menor que 70".
create or replace function pg_temp.kri_lim(p_nome text, p_op text, p_valor numeric)
returns uuid language sql as $$
  insert into public.indicadores_kri
    (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
     meta_alvo, limite_alerta, responsavel_medicao, limite_operador, limite_valor, limite_unidade)
  values ('00000000-0000-4000-b000-000000000001', p_nome, 'a / b', 'Planilha', 'Mensal',
          '100%', case when p_op is null then '> 10%' else null end, 'Chefia', p_op, p_valor,
          case when p_op is null then null else '%' end)
  returning id;
$$;

select pg_temp.kri_lim('T3 KRI menor que 70', '<', 70) as k_menor \gset
select pg_temp.kri_lim('T3 KRI maior que 10', '>', 10) as k_maior \gset
select pg_temp.kri_lim('T3 KRI só texto', null, null) as k_texto \gset
select pg_temp.kri_lim('T3 KRI limite 5', '>=', 5) as k_igual \gset

-- Risco aprovado ligado ao KRI "menor que 70" (para o teste da RN-052).
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
values ('T120-APROV', :'obj_a', 'Responsável de demonstração', 'causa', 'evento', 'consequência',
        'objetivo', 'x', 2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho');
select id as r_aprov from public.riscos where codigo_radar = 'T120-APROV' \gset
select (public.fn_fluxo_mudar_estado(:'r_aprov', 'aprovado')).id as ok_aprov \gset
select set_config('radar.fluxo', 'on', true);
insert into public.kri_riscos (kri_id, risco_id) values (:'k_menor', :'r_aprov');
select set_config('radar.fluxo', '', true);

-- Leituras entram como o gestor da unidade, como no uso real.
select pg_temp.entrar_como('gestor.uc@radar.test');

-- 3.1 O banco ignora o que o cliente mandou em em_alerta.
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico, em_alerta)
values ('00000000-0000-4000-c000-000000000001', :'k_menor', '60%', 60, false);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000001'),
          true, '3. leitura 60 em KRI "< 70": em_alerta = true mesmo enviando false');
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico, em_alerta)
values ('00000000-0000-4000-c000-000000000002', :'k_maior', '8%', 8, true);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000002'),
          false, '3. leitura 8 em KRI "> 10": em_alerta = false mesmo enviando true');

-- 3.2 Fronteiras de cada operador.
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico)
values ('00000000-0000-4000-c000-000000000003', :'k_menor', '70%', 70);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000003'),
          false, '3. leitura 70 em "< 70": exatamente no limite não é alerta');
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico)
values ('00000000-0000-4000-c000-000000000004', :'k_igual', '5%', 5);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000004'),
          true, '3. leitura 5 em ">= 5": no limite é alerta');
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico)
values ('00000000-0000-4000-c000-000000000005', :'k_maior', '10%', 10);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000005'),
          false, '3. leitura 10 em "> 10": no limite não é alerta');
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico)
values ('00000000-0000-4000-c000-000000000006', :'k_maior', '10,5%', 10.5);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000006'),
          true, '3. leitura 10,5 em "> 10": é alerta (sem arredondar)');

-- 3.3 KRI só com texto antigo, ou leitura sem número: nunca é alerta.
insert into public.medicoes_kri (id, kri_id, valor_apurado, valor_numerico, em_alerta)
values ('00000000-0000-4000-c000-000000000007', :'k_texto', '99%', 99, true);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000007'),
          false, '3. KRI só com texto antigo: em_alerta = false');
insert into public.medicoes_kri (id, kri_id, valor_apurado, em_alerta)
values ('00000000-0000-4000-c000-000000000008', :'k_menor', 'cerca de 5', true);
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000008'),
          false, '3. leitura sem número: em_alerta = false');

-- 3.4 Os alertas abertos até aqui: 1 do KRI "< 70" e 1 do KRI ">= 5" e 1 do "> 10".
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 1,
          '3. a 1ª leitura em alerta abriu 1 alerta');
select is((select ciencia_em from public.alertas_kri where kri_id = :'k_menor'), public.fn_hoje(),
          '3. a ciência é o dia do registro (current_date)');
select is((select medicao_id from public.alertas_kri where kri_id = :'k_menor'),
          '00000000-0000-4000-c000-000000000001'::uuid, '3. o alerta aponta para a leitura que o abriu');
select is((select encerrado_em from public.alertas_kri where kri_id = :'k_menor'), null,
          '3. o alerta nasce aberto (encerrado_em nulo)');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_texto'), 0,
          '3. KRI só com texto antigo: nenhum alerta');

-- 3.5 Segunda leitura em alerta: não abre outro e não dá erro.
select lives_ok($$insert into public.medicoes_kri (kri_id, valor_apurado, valor_numerico)
                   select id, '50%', 50 from public.indicadores_kri where nome_indicador = 'T3 KRI menor que 70'$$,
                '3. 2ª leitura em alerta é gravada sem erro');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 1,
          '3. a 2ª leitura em alerta não abre outro alerta');
-- Leitura dentro do limite não encerra.
select lives_ok($$insert into public.medicoes_kri (kri_id, valor_apurado, valor_numerico)
                   select id, '90%', 90 from public.indicadores_kri where nome_indicador = 'T3 KRI menor que 70'$$,
                '3. leitura dentro do limite é gravada');
select is((select encerrado_em from public.alertas_kri where kri_id = :'k_menor'), null,
          '3. leitura dentro do limite não encerra o alerta');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 1,
          '3. leitura dentro do limite não abre nem fecha nada');

-- 3.6 Corrigir o número recalcula o alerta (UPDATE OF valor_numerico).
update public.medicoes_kri set valor_numerico = 95 where id = '00000000-0000-4000-c000-000000000001';
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000001'),
          false, '3. corrigir a leitura para 95 recalcula em_alerta = false');

-- 3.6b Mexer só em em_alerta ou em kri_id também recalcula (cliente não manda).
update public.medicoes_kri set em_alerta = true where id = '00000000-0000-4000-c000-000000000002';
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000002'),
          false, '3. UPDATE de em_alerta = true numa leitura dentro do limite: continua false');
update public.medicoes_kri set em_alerta = false where id = '00000000-0000-4000-c000-000000000006';
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000006'),
          true, '3. UPDATE de em_alerta = false numa leitura em alerta: continua true');
update public.medicoes_kri set kri_id = :'k_menor' where id = '00000000-0000-4000-c000-000000000005';
select is((select em_alerta from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000005'),
          true, '3. trocar o kri_id (leitura 10 vai para "< 70") recalcula em_alerta = true');

-- 3.7 RN-052: registrar leitura não reabre o risco aprovado.
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_aprov'), 'aprovado',
          '3. registrar leituras não reabriu o risco aprovado (RN-052)');

-- 3.8 RLS dos alertas e da visão.
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 1,
          '3. gestor.uc@ lê o alerta do KRI da própria unidade');
select throws_ok(format($$insert into public.alertas_kri (kri_id, medicao_id, ciencia_em)
                          select kri_id, id, public.fn_hoje() from public.medicoes_kri where kri_id = %L limit 1$$, :'k_maior'),
                 '42501', null, '3. gestor não insere direto em alertas_kri');
select throws_ok($$update public.alertas_kri set encerrado_em = public.fn_hoje()$$,
                 '42501', null, '3. gestor não altera alertas_kri');
select throws_ok($$delete from public.alertas_kri$$,
                 '42501', null, '3. gestor não apaga de alertas_kri');
select is((select count(*)::int from public.alertas_kri_situacao where kri_id = :'k_menor'), 1,
          '3. gestor.uc@ lê a visão de situação do próprio KRI');

select pg_temp.entrar_como('gestor.base@radar.test');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 0,
          '3. gestor de outra unidade não lê o alerta');
select is((select count(*)::int from public.alertas_kri_situacao where kri_id = :'k_menor'), 0,
          '3. gestor de outra unidade não lê a visão do alerta');

-- 3.9 Visão: prazo e atraso em dias úteis (só enquanto aberto).
select pg_temp.sair();
-- Alerta antigo: ciência em 19/11/2026. vence_em = 10 dias úteis depois.
update public.alertas_kri set ciencia_em = date '2026-11-19' where kri_id = :'k_menor';
select is((select vence_em from public.alertas_kri_situacao where kri_id = :'k_menor'),
          public.fn_somar_dias_uteis(date '2026-11-19', 10), '3. vence_em = ciência + 10 dias úteis');
select is((select dia_atual from public.alertas_kri_situacao where kri_id = :'k_menor'),
          least(public.fn_dias_uteis_entre(date '2026-11-19', public.fn_hoje()), 99),
          '3. dia_atual = dias úteis desde a ciência (limitado a 99)');
select is((select vencido from public.alertas_kri_situacao where kri_id = :'k_menor'),
          public.fn_dias_uteis_entre(date '2026-11-19', public.fn_hoje()) > 10,
          '3. vencido = passou de 10 dias úteis (alerta aberto)');
select is((select dias_uteis_vencido from public.alertas_kri_situacao where kri_id = :'k_menor'),
          greatest(least(public.fn_dias_uteis_entre(date '2026-11-19', public.fn_hoje()), 99) - 10, 0),
          '3. dias_uteis_vencido = atraso além dos 10 dias');
-- Ciência de hoje: dia 0, não vencido.
update public.alertas_kri set ciencia_em = public.fn_hoje() where kri_id = :'k_menor';
select is((select vencido from public.alertas_kri_situacao where kri_id = :'k_menor'), false,
          '3. ciência de hoje: não vencido');
select is((select dias_uteis_vencido from public.alertas_kri_situacao where kri_id = :'k_menor'), 0,
          '3. ciência de hoje: 0 dia útil de atraso');
-- Alerta encerrado nunca aparece como vencido, mesmo antigo.
update public.alertas_kri set ciencia_em = date '2020-01-06', encerrado_em = date '2020-03-02' where kri_id = :'k_menor';
select is((select vencido from public.alertas_kri_situacao where kri_id = :'k_menor'), false,
          '3. alerta encerrado não é vencido');
select is((select dias_uteis_vencido from public.alertas_kri_situacao where kri_id = :'k_menor'), 0,
          '3. alerta encerrado: 0 dia útil de atraso');
-- Com o alerta encerrado, uma nova leitura em alerta abre OUTRO alerta.
insert into public.medicoes_kri (kri_id, valor_apurado, valor_numerico) values (:'k_menor', '40%', 40);
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 2,
          '3. depois de encerrado, nova leitura em alerta abre um novo alerta');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor' and encerrado_em is null), 1,
          '3. no máximo um alerta aberto por KRI (índice único parcial)');
select throws_ok(format($$insert into public.alertas_kri (kri_id, medicao_id, ciencia_em)
                          select kri_id, id, public.fn_hoje() from public.medicoes_kri where kri_id = %L limit 1$$, :'k_menor'),
                 '23505', null, '3. o índice único parcial recusa 2 alertas abertos do mesmo KRI');

-- 3.10 Auditoria do alerta aberto.
select ok((select count(*) from public.auditoria_log where tabela_afetada = 'alertas_kri' and operacao = 'INSERT') >= 1,
          '3. a abertura do alerta fica na trilha de auditoria');

-- ============================================================================
-- SEÇÃO 4 — salvar_ficha_risco grava o limite de alerta numérico
-- ============================================================================
-- A ficha do risco passa a gravar limite_operador, limite_valor e
-- limite_unidade no KRI (novo ou existente), sem deixar de gravar o texto
-- antigo limite_alerta. A trava do risco crítico (LAC-03) não muda.

-- Risco crítico (P=4, I=4 -> 21,00, Extremo), aprovado, com um KRI completo
-- (texto antigo) ligado; e um risco crítico em rascunho para gravar KRI novo.
create or replace function pg_temp.crit4(p_codigo text, p_status text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual,
     status_fluxo, estrategia_principal)
  values (p_codigo, '00000000-0000-4000-b000-000000000001', 'Responsável de demonstração',
          'causa', 'evento', 'consequência', 'objetivo', 'x', 2, 4, 4, 0, 'Baixo', 0, 'Baixo',
          'rascunho', 'Mitigar')
  returning id into v_id;
  insert into public.respostas_tratamento
    (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
  values (v_id, 'Mitigar', 'ação de teste', 'Chefia', '2027-06-30', 'como de teste');
  if p_status <> 'rascunho' then
    perform public.fn_fluxo_mudar_estado(v_id, p_status);
  end if;
  return v_id;
end;
$$;

select pg_temp.crit4('T4-CRIT-RASC', 'rascunho') as r4_rasc \gset
select pg_temp.crit4('T4-CRIT-APR', 'rascunho') as r4_apr \gset
select pg_temp.kri_lim('T4 KRI do aprovado', null, null) as k4_apr \gset
select set_config('radar.fluxo', 'on', true);
insert into public.kri_riscos (kri_id, risco_id) values (:'k4_apr', :'r4_apr');
select set_config('radar.fluxo', '', true);
select (public.fn_fluxo_mudar_estado(:'r4_apr', 'aprovado')).id as ok4_apr \gset

select pg_temp.entrar_como('gestor.uc@radar.test');

-- 4.1 KRI novo com limite numérico + texto antigo: os campos persistem.
select f.id as ok4_a from public.salvar_ficha_risco(jsonb_build_object('id', :'r4_rasc', 'kris', jsonb_build_array(
         jsonb_build_object('nome_indicador', 'T4 KRI numérico', 'formula_calculo', 'a / b',
                            'fonte_dados', 'Planilha', 'periodicidade', 'Mensal',
                            'responsavel_medicao', 'Chefia', 'limite_alerta', 'abaixo de 80%',
                            'limite_operador', '<', 'limite_valor', 80, 'limite_unidade', '%')))) as f \gset
select pg_temp.sair();
select is((select limite_operador || '|' || limite_valor::text || '|' || limite_unidade
             from public.indicadores_kri where nome_indicador = 'T4 KRI numérico'),
          '<|80|%', '4. a ficha grava operador, valor e unidade do KRI novo');
select is((select limite_alerta from public.indicadores_kri where nome_indicador = 'T4 KRI numérico'),
          'abaixo de 80%', '4. a ficha continua gravando o texto antigo limite_alerta');

-- 4.2 KRI existente: a ficha muda o limite; chave omitida mantém.
select id as k4_num from public.indicadores_kri where nome_indicador = 'T4 KRI numérico' \gset
select pg_temp.entrar_como('gestor.uc@radar.test');
select f.id as ok4_b from public.salvar_ficha_risco(jsonb_build_object('id', :'r4_rasc', 'kris', jsonb_build_array(
         jsonb_build_object('id', :'k4_num', 'limite_operador', '>=', 'limite_valor', 12.5)))) as f \gset
select pg_temp.sair();
select is((select limite_operador || '|' || limite_valor::text from public.indicadores_kri where id = :'k4_num'),
          '>=|12.5', '4. a ficha altera o limite numérico de um KRI existente');
select is((select limite_unidade from public.indicadores_kri where id = :'k4_num'),
          '%', '4. chave omitida (limite_unidade) mantém o valor anterior');

-- 4.3 A trava do risco crítico não mudou.
select pg_temp.entrar_como('gestor.uc@radar.test');
-- (a) aprovado crítico trocando o KRI completo por um KRI novo sem limite
--     nenhum (nem numérico, nem texto): continua barrado.
select throws_like(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                   jsonb_build_object('id', :'r4_apr', 'kris', jsonb_build_array(
                     jsonb_build_object('nome_indicador', 'T4 KRI sem limite', 'formula_calculo', 'a / b',
                                        'fonte_dados', 'Planilha', 'periodicidade', 'Mensal',
                                        'responsavel_medicao', 'Chefia')))),
                   '%falta um KRI completo%',
                   '4. KRI novo sem limite numérico nem texto não destrava o risco crítico');
-- (b) KRI só com o texto antigo continua valendo (nada reabre).
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                jsonb_build_object('id', :'r4_apr', 'kris', jsonb_build_array(
                  jsonb_build_object('nome_indicador', 'T4 KRI só texto', 'formula_calculo', 'a / b',
                                     'fonte_dados', 'Planilha', 'periodicidade', 'Mensal',
                                     'responsavel_medicao', 'Chefia', 'limite_alerta', '> 10%')))),
                '4. KRI só com o texto antigo continua completo para a trava');
select pg_temp.sair();

-- ============================================================================
-- SEÇÃO 5 — "hoje" de Brasília e travas de exclusão
-- ============================================================================
-- fn_hoje() é o "hoje" do calendário de Brasília, igual em qualquer fuso da
-- sessão (o servidor roda em UTC: current_date erraria o dia à noite).
select pg_temp.sair();
select has_function('public', 'fn_hoje', array[]::text[], '5. fn_hoje() existe');
select is(public.fn_hoje(), (now() at time zone 'America/Sao_Paulo')::date,
          '5. fn_hoje() é o dia de Brasília');
set local timezone = 'UTC';
select is(public.fn_hoje(), (now() at time zone 'America/Sao_Paulo')::date, '5. fn_hoje() igual com a sessão em UTC');
set local timezone = 'Pacific/Auckland';
select is(public.fn_hoje(), (now() at time zone 'America/Sao_Paulo')::date, '5. fn_hoje() igual com a sessão em Pacific/Auckland');
set local timezone = 'UTC';

-- A leitura que abriu um alerta não pode ser apagada (mensagem clara).
select throws_ok($$delete from public.medicoes_kri where id = '00000000-0000-4000-c000-000000000001'$$,
                 'P0001', 'Esta leitura abriu um alerta do KRI e não pode ser apagada',
                 '5. a leitura que abriu o alerta não é apagada');
-- Apagar o KRI inteiro (sem alerta comunicado) continua funcionando em cascata.
select lives_ok(format($$delete from public.indicadores_kri where id = %L$$, :'k_menor'),
                '5. apagar o KRI com alerta não comunicado funciona (cascata)');
select is((select count(*)::int from public.alertas_kri where kri_id = :'k_menor'), 0,
          '5. os alertas do KRI apagado saíram junto');

select * from finish();
rollback;
