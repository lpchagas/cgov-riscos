-- ============================================================================
-- TESTE DA ETAPA B1.1, TAREFA 3 (pgTAP) — A CGOV e os filhos do risco preliminar (P-B1-5)
-- ============================================================================
-- Regra: enquanto o risco está `preliminar_cgov`, a CGOV grava e apaga os
-- controles, as respostas (5W2H), os KRIs e as medições dele, e apaga o próprio
-- risco. Depois que a unidade assume (vira `rascunho`), a CGOV perde tudo isso.
--
-- Atenção às políticas permissivas: o PostgreSQL combina com OU as cláusulas
-- USING e WITH CHECK separadamente. Por isso há testes de "mover o filho de um
-- risco preliminar para um risco comum", que devem falhar.
--
-- Como a RLS responde: INSERT negado → erro 42501; UPDATE/DELETE fora do
-- alcance → 0 linhas; UPDATE que leva a linha para fora → erro 42501.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(34);

-- Ids da semente: riscos comuns (rascunho) de OUTRAS unidades.
select
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT')  as r_uc_ct,   -- FLONA de Caçador
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as r_uc_sct   -- FLONA do Tapajós
\gset

-- inserir_risco(objeto, código, estado): INSERT por quem estiver logado.
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text,
                                                 p_status text default 'rascunho')
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, categoria_id, probabilidade, impacto, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 2, 2, 2, p_status);
$$;

-- Preliminares criados (como administrador): P1 na FLONA de Caçador (objeto 01),
-- P2 na mesma unidade (para o teste de apagar). Um filho de cada tipo no P1,
-- e um controle/KRI no risco COMUM r_uc_ct para os testes negativos.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T072-P1', 'preliminar_cgov');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T072-P2', 'preliminar_cgov');
select
  (select id from public.riscos where codigo_radar = 'RADAR-T072-P1') as p1,
  (select id from public.riscos where codigo_radar = 'RADAR-T072-P2') as p2
\gset

insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
values ('00000000-0000-4000-c000-000000000072', :'r_uc_ct', 'Controle do risco comum', 'Evidência'),
       ('00000000-0000-4000-c000-000000000073', :'p1', 'Controle do preliminar (sementeado)', 'Evidência');
insert into public.indicadores_kri
  (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta, responsavel_medicao)
values ('00000000-0000-4000-d000-000000000072', :'r_uc_ct', 'KRI do risco comum', 'a / b', 'Planilha', 'Mensal', '0', '1', 'Gestor'),
       ('00000000-0000-4000-d000-000000000073', :'p1', 'KRI do preliminar', 'a / b', 'Planilha', 'Mensal', '0', '1', 'Gestor');
insert into public.respostas_tratamento
  (id, risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
values ('00000000-0000-4000-e000-000000000072', :'r_uc_ct', 'Mitigar', 'Ação do risco comum', 'Gestor', '2026-12-31', 'Procedimento'),
       ('00000000-0000-4000-e000-000000000073', :'p1', 'Mitigar', 'Ação do preliminar (semeada)', 'Gestor', '2026-12-31', 'Procedimento');

-- ----------------------------------------------------------------------------
-- 1. A CGOV grava os filhos do preliminar
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');

select lives_ok(format($$insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
  values ('00000000-0000-4000-c000-000000000074', %L, 'Controle novo da CGOV', 'Evidência')$$, :'p1'),
  'CGOV cria controle no preliminar');
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'revisto'
  where id = '00000000-0000-4000-c000-000000000074'$$), 1, 'CGOV altera controle do preliminar');

select lives_ok(format($$insert into public.respostas_tratamento
  (id, risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
  values ('00000000-0000-4000-e000-000000000074', %L, 'Mitigar', 'Ação nova da CGOV', 'Gestor', '2026-12-31', 'Procedimento')$$, :'p1'),
  'CGOV cria resposta no preliminar');
select is(pg_temp.linhas_afetadas($$update public.respostas_tratamento set acao_o_que = 'revista'
  where id = '00000000-0000-4000-e000-000000000074'$$), 1, 'CGOV altera resposta do preliminar');

select lives_ok(format($$insert into public.indicadores_kri
  (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta, responsavel_medicao)
  values ('00000000-0000-4000-d000-000000000074', %L, 'KRI novo da CGOV', 'a / b', 'Planilha', 'Mensal', '0', '1', 'Gestor')$$, :'p1'),
  'CGOV cria KRI no preliminar');
select is(pg_temp.linhas_afetadas($$update public.indicadores_kri set nome_indicador = 'revisto'
  where id = '00000000-0000-4000-d000-000000000074'$$), 1, 'CGOV altera KRI do preliminar');

select lives_ok($$insert into public.medicoes_kri (id, kri_id, valor_apurado)
  values ('00000000-0000-4000-f000-000000000074', '00000000-0000-4000-d000-000000000074', '1')$$,
  'CGOV cria medição no KRI do preliminar');
select is(pg_temp.linhas_afetadas($$delete from public.medicoes_kri
  where id = '00000000-0000-4000-f000-000000000074'$$), 1, 'CGOV apaga medição do KRI do preliminar');

select is(pg_temp.linhas_afetadas($$delete from public.controles_existentes
  where id = '00000000-0000-4000-c000-000000000074'$$), 1, 'CGOV apaga controle do preliminar');
select is(pg_temp.linhas_afetadas($$delete from public.respostas_tratamento
  where id = '00000000-0000-4000-e000-000000000074'$$), 1, 'CGOV apaga resposta do preliminar');
select is(pg_temp.linhas_afetadas($$delete from public.indicadores_kri
  where id = '00000000-0000-4000-d000-000000000074'$$), 1, 'CGOV apaga KRI do preliminar');

-- ----------------------------------------------------------------------------
-- 2. A CGOV apaga o próprio risco preliminar (P2 e seus filhos em cascata)
-- ----------------------------------------------------------------------------
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'p2')),
          1, 'CGOV apaga o risco preliminar');
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'r_uc_ct')),
          0, 'CGOV NÃO apaga risco comum (rascunho) de outra unidade');

-- ----------------------------------------------------------------------------
-- 3. Negativos: a CGOV NÃO grava nos filhos de risco comum
-- ----------------------------------------------------------------------------
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
  values (%L, 'invasão', 'x')$$, :'r_uc_ct'), '42501', null, 'CGOV NÃO cria controle em risco comum');
select throws_ok(format($$insert into public.respostas_tratamento (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
  values (%L, 'Mitigar', 'invasão', 'x', '2026-12-31', 'x')$$, :'r_uc_ct'), '42501', null, 'CGOV NÃO cria resposta em risco comum');
select throws_ok(format($$insert into public.indicadores_kri (risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta, responsavel_medicao)
  values (%L, 'invasão', 'a', 'b', 'Mensal', '0', '1', 'x')$$, :'r_uc_ct'), '42501', null, 'CGOV NÃO cria KRI em risco comum');
select throws_ok($$insert into public.medicoes_kri (kri_id, valor_apurado)
  values ('00000000-0000-4000-d000-000000000072', '1')$$, '42501', null, 'CGOV NÃO cria medição em KRI de risco comum');
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'invasão'
  where id = '00000000-0000-4000-c000-000000000072'$$), 0, 'CGOV NÃO altera controle de risco comum');
select is(pg_temp.linhas_afetadas($$delete from public.respostas_tratamento
  where id = '00000000-0000-4000-e000-000000000072'$$), 0, 'CGOV NÃO apaga resposta de risco comum');
select is(pg_temp.linhas_afetadas($$delete from public.indicadores_kri
  where id = '00000000-0000-4000-d000-000000000072'$$), 0, 'CGOV NÃO apaga KRI de risco comum');

-- ----------------------------------------------------------------------------
-- 4. Combinação de políticas: mover filho do preliminar para risco comum
-- ----------------------------------------------------------------------------
select throws_ok(format($$update public.controles_existentes set risco_id = %L
  where id = '00000000-0000-4000-c000-000000000073'$$, :'r_uc_ct'), '42501', null,
  'CGOV NÃO move controle do preliminar para risco comum');
select throws_ok(format($$update public.respostas_tratamento set risco_id = %L
  where id = '00000000-0000-4000-e000-000000000073'$$, :'r_uc_ct'), '42501', null,
  'CGOV NÃO move resposta do preliminar para risco comum');
select throws_ok(format($$update public.indicadores_kri set risco_id = %L
  where id = '00000000-0000-4000-d000-000000000073'$$, :'r_uc_ct'), '42501', null,
  'CGOV NÃO move KRI do preliminar para risco comum');
-- E no sentido inverso: puxar filho de risco comum para o preliminar (USING falha: 0 linhas).
select is(pg_temp.linhas_afetadas(format($$update public.controles_existentes set risco_id = %L
  where id = '00000000-0000-4000-c000-000000000072'$$, :'p1')), 0,
  'CGOV NÃO puxa controle de risco comum para o preliminar');

-- ----------------------------------------------------------------------------
-- 5. Outro gestor continua sem acesso de escrita ao preliminar
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');   -- gestor de OUTRA unidade
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'invasão'
  where id = '00000000-0000-4000-c000-000000000073'$$), 0, 'gestor de outra unidade NÃO altera controle do preliminar');
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
  values (%L, 'invasão', 'x')$$, :'p1'), '42501', null, 'gestor de outra unidade NÃO cria controle no preliminar');
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'p1')), 0,
  'gestor de outra unidade NÃO apaga o preliminar');

-- ----------------------------------------------------------------------------
-- 6. Depois da assunção pela unidade, a CGOV perde a escrita
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');          -- gestor da FLONA de Caçador
select is((select status_fluxo from public.assumir_risco_preliminar(:'p1')), 'rascunho', 'a unidade assume o preliminar');

select pg_temp.entrar_como('cgov@radar.test');
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'tarde demais'
  where id = '00000000-0000-4000-c000-000000000073'$$), 0, 'após assumir, CGOV NÃO altera controle');
select is(pg_temp.linhas_afetadas($$delete from public.respostas_tratamento
  where id = '00000000-0000-4000-e000-000000000073'$$), 0, 'após assumir, CGOV NÃO apaga resposta');
select is(pg_temp.linhas_afetadas($$delete from public.indicadores_kri
  where id = '00000000-0000-4000-d000-000000000073'$$), 0, 'após assumir, CGOV NÃO apaga KRI');
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
  values (%L, 'tarde demais', 'x')$$, :'p1'), '42501', null, 'após assumir, CGOV NÃO cria controle');
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'p1')), 0,
  'após assumir, CGOV NÃO apaga o risco');

-- A unidade continua gravando normalmente.
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'da unidade'
  where id = '00000000-0000-4000-c000-000000000073'$$), 1, 'a unidade altera o controle depois de assumir');

select * from finish();
rollback;
