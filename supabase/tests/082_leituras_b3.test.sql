-- ============================================================================
-- TESTE DA ETAPA B3, TAREFA 4 (pgTAP) — ler_auditoria e objetos_onde_gravo
-- ============================================================================
-- Prova que:
--   1. ler_auditoria devolve EXATAMENTE as linhas que `select ... from
--      auditoria_log` deixa a pessoa ver (mesma política de leitura);
--   2. o nome de quem agiu e o código do risco vêm preenchidos;
--   3. a paginação por cursor não repete nem pula linhas e o limite é 100;
--   4. objetos_onde_gravo = objetos com pode_escrever_objeto;
--   5. visitante (anon) não executa nenhuma das duas.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(16);

-- Ids da semente.
select
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT') as r_uc_ct,
  (select id from auth.users where email = 'cgov@radar.test')            as id_cgov
\gset

-- ----------------------------------------------------------------------------
-- Preparação (como administrador, mas "assinando" como a CGOV: o gatilho de
-- auditoria grava auth.uid(), que vem do crachá JWT).
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', :'id_cgov', 'role', 'authenticated')::text, true);

-- Um controle no risco da FLONA de Caçador (objeto do gestor.uc@).
insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
values ('00000000-0000-4000-c000-000000000082', :'r_uc_ct', 'Controle do teste 082', 'Evidência');

-- Um rascunho que será apagado (a linha de DELETE guarda o código nos dados).
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, categoria_id, probabilidade, impacto, status_fluxo)
values ('RADAR-T082-APAGADO', '00000000-0000-4000-b000-000000000001', 'Responsável de teste',
        'causa', 'evento', 'consequência', 'objetivo', 2, 2, 2, 'rascunho');
delete from public.riscos where codigo_radar = 'RADAR-T082-APAGADO';

-- ----------------------------------------------------------------------------
-- 1. Mesmo conjunto de ids que a política de leitura de auditoria_log
--    (ambos lados lidos COM o papel da pessoa ativo)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select results_eq(
  $$select id from public.ler_auditoria(p_limite => 100)$$,
  $$select id from public.auditoria_log order by realizado_em desc, id desc limit 100$$,
  'cgov@: mesmas linhas que auditoria_log');

select pg_temp.entrar_como('gestor.uc@radar.test');
select results_eq(
  $$select id from public.ler_auditoria(p_limite => 100)$$,
  $$select id from public.auditoria_log order by realizado_em desc, id desc limit 100$$,
  'gestor.uc@: mesmas linhas que auditoria_log');

select pg_temp.entrar_como('auditor@radar.test');
select results_eq(
  $$select id from public.ler_auditoria(p_limite => 100)$$,
  $$select id from public.auditoria_log order by realizado_em desc, id desc limit 100$$,
  'auditor@: mesmas linhas que auditoria_log');

select pg_temp.entrar_como('diretor.dibio@radar.test');
select results_eq(
  $$select id from public.ler_auditoria(p_limite => 100)$$,
  $$select id from public.auditoria_log order by realizado_em desc, id desc limit 100$$,
  'diretor.dibio@: mesmas linhas que auditoria_log');

-- ----------------------------------------------------------------------------
-- 2. Nome de quem agiu e código do risco
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select ok(exists (select 1 from public.ler_auditoria(p_limite => 100)
                   where usuario_id = :'id_cgov' and quem_nome is not null and quem_papel = 'cgov'),
  'gestor.uc@ vê o nome e o papel da CGOV numa linha feita por ela no objeto dele');

select is((select codigo_radar from public.ler_auditoria(p_tabela => 'controles_existentes')
            where registro_id = '00000000-0000-4000-c000-000000000082'),
  'RADAR-DEMO-UC-CT', 'linha de controles_existentes traz o código do risco (via risco_id)');

select pg_temp.entrar_como('cgov@radar.test');
select is((select codigo_radar from public.ler_auditoria(p_tabela => 'riscos')
            where operacao = 'DELETE' and dados_anteriores ->> 'codigo_radar' = 'RADAR-T082-APAGADO'),
  'RADAR-T082-APAGADO', 'linha de risco apagado traz o código guardado nos dados');

select is((select count(*)::int from public.ler_auditoria(p_tabela => 'controles_existentes')
            where tabela_afetada <> 'controles_existentes'),
  0, 'o filtro por tabela só devolve a tabela pedida');

-- ----------------------------------------------------------------------------
-- 3. Paginação por cursor e limite máximo
-- ----------------------------------------------------------------------------
-- Última linha da 1ª página (2 linhas) vira o cursor da 2ª.
select realizado_em as cur_em, id as cur_id
  from public.ler_auditoria(p_limite => 2) order by realizado_em, id limit 1
\gset

select is((select count(*)::int from public.ler_auditoria(p_limite => 2)), 2, 'página de 2 linhas');

select results_eq(
  format($$select id from public.ler_auditoria(p_antes_em => %L, p_antes_id => %L, p_limite => 2)$$,
         :'cur_em', :'cur_id'),
  $$select id from public.ler_auditoria(p_limite => 4) offset 2$$,
  '2ª página (cursor) = linhas 3 e 4: sem repetir nem pular');

select is((select count(*)::int from public.ler_auditoria(p_limite => 2)
            where id = :'cur_id'), 1, 'o cursor é a última linha da 1ª página');

-- Gera mais de 100 linhas de auditoria (como CGOV, para ver todas).
select pg_temp.sair();
select set_config('request.jwt.claims',
  json_build_object('sub', :'id_cgov', 'role', 'authenticated')::text, true);
do $$
begin
  for i in 1..105 loop
    update public.controles_existentes set descricao_controle = 'Controle 082 v' || i
     where id = '00000000-0000-4000-c000-000000000082';
  end loop;
end $$;
select pg_temp.entrar_como('cgov@radar.test');
select is((select count(*)::int from public.ler_auditoria(p_limite => 500)), 100,
  'p_limite = 500 devolve no máximo 100 linhas');

-- ----------------------------------------------------------------------------
-- 4. objetos_onde_gravo
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select results_eq(
  $$select o from public.objetos_onde_gravo() as o order by 1$$,
  $$select id from public.objetos_contexto where public.pode_escrever_objeto(id) order by 1$$,
  'gestor.uc@: objetos_onde_gravo = objetos com pode_escrever_objeto');

select ok((select count(*) from public.objetos_onde_gravo()) >= 1, 'gestor.uc@ grava em pelo menos um objeto');

-- ----------------------------------------------------------------------------
-- 5. anon não executa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como_anonimo();
select throws_ok($$select * from public.ler_auditoria()$$, '42501', null, 'anon não executa ler_auditoria');
select throws_ok($$select * from public.objetos_onde_gravo()$$, '42501', null, 'anon não executa objetos_onde_gravo');
select pg_temp.sair();

select * from finish();
rollback;
