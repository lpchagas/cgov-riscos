-- ============================================================================
-- TESTE DO FLUXO DA PRESIDÊNCIA (pgTAP) — Etapa B1.1, Tarefa 1 (decisão P-B1-1)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Regra decidida pela CGOV em 2026-11-15: os riscos da PRESIDÊNCIA (unidade do
-- tipo `presidencia`) e da ASSESSORIA DA PRESIDÊNCIA (icmbio_id 10.0001) são
--   - VALIDADOS pelo titular do GABIN (icmbio_id 10.0002);
--   - HOMOLOGADOS pelo titular da Presidência (icmbio_id 10.0000).
-- É uma exceção consciente à árvore (o GABIN é subordinado ao Presidente).
-- A segregação D1 ("sobe um nível") continua valendo: quem envia não valida
-- nem homologa o próprio risco. Por isso, se o PRÓPRIO Presidente envia um
-- risco crítico, não há ninguém acima dele para homologar e o fluxo recusa.
--
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(32);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.unidades where icmbio_id = '10.0000') as presidencia,
  (select id from public.unidades where icmbio_id = '10.0001') as assessoria,
  (select id from public.unidades where icmbio_id = '10.0002') as gabin,
  (select id from public.unidades where icmbio_id = '10.0008') as cgov,
  (select id from public.unidades where icmbio_id = '10.0007') as cgge
\gset

-- Um gestor FICTÍCIO (não titular) na Assessoria da Presidência.
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-4000-a000-000000000070', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'gestor.assessoria@radar.test', '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
insert into public.perfis_usuarios
  (id, nome_completo, email, cargo, unidade_id, papel_governanca, ativo, titular_chefia)
values ('00000000-0000-4000-a000-000000000070', 'Gestor Fictício Assessoria', 'gestor.assessoria@radar.test',
        'Assessor', :'assessoria', 'gestor', true, false);

-- Um objeto na Assessoria e um na Presidência.
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000070', 'Unidade', 'Teste 070 — Assessoria da Presidência',
        :'assessoria', 'Objetivo de demonstração'),
       ('00000000-0000-4000-b000-000000000071', 'Unidade', 'Teste 070 — Presidência',
        :'presidencia', 'Objetivo de demonstração');

-- inserir_risco: o gatilho de cálculo preenche o resto (P=2,I=2 → baixo, não crítico;
-- P=4,I=4 na categoria 7 → Alto, crítico — mesmos valores da semente).
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text, p_p int, p_i int,
                                                 p_cat int default 2)
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 'x', p_cat, p_p, p_i, 0, 'Baixo', 0, 'Baixo', 'rascunho');
$$;

select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000070', 'RADAR-T070-A-NC', 2, 2);      -- Assessoria, não crítico
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000070', 'RADAR-T070-A-CR', 4, 4, 7);   -- Assessoria, crítico
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000071', 'RADAR-T070-P-NC', 2, 2);      -- Presidência, não crítico
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000071', 'RADAR-T070-P-CR', 4, 4, 7);   -- Presidência, crítico

select
  (select id from public.riscos where codigo_radar = 'RADAR-T070-A-NC') as a_nc,
  (select id from public.riscos where codigo_radar = 'RADAR-T070-A-CR') as a_cr,
  (select id from public.riscos where codigo_radar = 'RADAR-T070-P-NC') as p_nc,
  (select id from public.riscos where codigo_radar = 'RADAR-T070-P-CR') as p_cr
\gset

-- estado(id): lê o status_fluxo como administrador e volta a ser quem estava logado.
create or replace function pg_temp.estado(p_risco uuid)
returns text
language plpgsql
as $$
declare
  v_role   text := current_setting('role', true);
  v_claims text := current_setting('request.jwt.claims', true);
  v_estado text;
begin
  perform set_config('role', 'none', true);
  select status_fluxo into v_estado from public.riscos where id = p_risco;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('role', coalesce(nullif(v_role, ''), 'none'), true);
  return v_estado;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. As duas funções de alcance (a regra nova e o que NÃO mudou)
-- ----------------------------------------------------------------------------
select is(public.chefia_imediata(:'assessoria'),   :'gabin'::uuid, 'chefia_imediata da Assessoria é o GABIN');
select is(public.chefia_imediata(:'presidencia'),  :'gabin'::uuid, 'chefia_imediata da Presidência é o GABIN');
select is(public.homologador_de(:'assessoria'),    :'presidencia'::uuid, 'homologador_de da Assessoria é a Presidência');
select is(public.homologador_de(:'presidencia'),   :'presidencia'::uuid, 'homologador_de da Presidência é a própria Presidência');
select is(public.chefia_imediata(:'gabin'),        :'presidencia'::uuid, 'o GABIN em si continua subindo para a Presidência (árvore)');
select is(public.homologador_de(:'gabin'),         :'presidencia'::uuid, 'homologador_de do GABIN continua a Presidência');
select is(public.chefia_imediata(:'cgov'),         :'cgge'::uuid, 'outras unidades não mudam: chefia_imediata da CGOV é a CGGE');
select is(public.homologador_de(:'cgov'),          :'presidencia'::uuid, 'outras unidades não mudam: homologador_de da CGOV é a Presidência');
select is(has_function_privilege('anon', 'public.chefia_imediata(uuid)', 'EXECUTE'), false, 'anon continua sem executar chefia_imediata');
select is(has_function_privilege('authenticated', 'public.homologador_de(uuid)', 'EXECUTE'), true, 'authenticated continua executando homologador_de');

-- ----------------------------------------------------------------------------
-- 2. Risco da ASSESSORIA, não crítico: gestor envia, GABIN valida e aprova
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.assessoria@radar.test');
select is((select status_fluxo from public.enviar_para_validacao(:'a_nc')), 'em_validacao_cg',
          'gestor da Assessoria envia o risco para validação');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'a_nc'), '42501', null,
                 'o gestor da Assessoria NÃO valida o próprio risco');

select pg_temp.entrar_como('presidente@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'a_nc'), '42501', null,
                 'o Presidente NÃO valida risco da Assessoria (quem valida é o GABIN)');

select pg_temp.sair();
-- gabin@ é servidor, não titular: não valida (só o TITULAR do GABIN valida).
update public.perfis_usuarios set titular_chefia = false where email = 'gabin@radar.test';
select pg_temp.entrar_como('gabin@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'a_nc'), '42501', null,
                 'servidor do GABIN que não é titular NÃO valida');
select pg_temp.sair();
update public.perfis_usuarios set titular_chefia = true where email = 'gabin@radar.test';

select pg_temp.entrar_como('gabin@radar.test');
select is((select status_fluxo from public.validar_risco(:'a_nc', 'Ficha consistente.')), 'aprovado',
          'o titular do GABIN valida o risco não crítico da Assessoria: vai direto a aprovado');

-- ----------------------------------------------------------------------------
-- 3. Risco da ASSESSORIA, crítico: GABIN valida, Presidente homologa
-- ----------------------------------------------------------------------------
select is((select is_critico from public.riscos where id = :'a_cr'), true,
          'P=4, I=4 na categoria 7 é crítico (fora do apetite)');
select pg_temp.entrar_como('gestor.assessoria@radar.test');
select is((select status_fluxo from public.enviar_para_validacao(:'a_cr')), 'em_validacao_cg',
          'gestor da Assessoria envia o risco crítico');
select pg_temp.entrar_como('gabin@radar.test');
select is((select status_fluxo from public.validar_risco(:'a_cr', 'Validado.')), 'em_homologacao_dir',
          'o titular do GABIN valida o crítico: vai para homologação');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'a_cr'), '42501', null,
                 'o titular do GABIN NÃO homologa (quem homologa é a Presidência)');
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.homologar_risco(:'a_cr', 'Homologado.')), 'aprovado',
          'o Presidente homologa o risco crítico da Assessoria');

-- ----------------------------------------------------------------------------
-- 4. Risco da PRESIDÊNCIA enviado pelo Presidente (não crítico): GABIN valida
-- ----------------------------------------------------------------------------
select is((select status_fluxo from public.enviar_para_validacao(:'p_nc')), 'em_validacao_cg',
          'o Presidente envia risco da Presidência: agora há quem valide (o GABIN)');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'p_nc'), '42501', null,
                 'o Presidente NÃO valida o próprio risco');
select pg_temp.entrar_como('gabin@radar.test');
select is((select status_fluxo from public.validar_risco(:'p_nc', 'Ok.')), 'aprovado',
          'o titular do GABIN valida o risco não crítico da Presidência');

-- ----------------------------------------------------------------------------
-- 5. Risco CRÍTICO da Presidência enviado pelo Presidente: recusado na homologação
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.enviar_para_validacao(:'p_cr')), 'em_validacao_cg',
          'o Presidente envia o risco crítico da Presidência');
select pg_temp.entrar_como('gabin@radar.test');
select throws_like(format($$select public.validar_risco(%L, 'ok')$$, :'p_cr'),
                   'RADAR:%homologação%',
                   'crítico enviado pelo Presidente: sem ninguém acima para homologar, a validação é recusada com mensagem RADAR');
select is(pg_temp.estado(:'p_cr'), 'em_validacao_cg', 'o risco recusado continua em validação (nada mudou)');
select pg_temp.entrar_como('presidente@radar.test');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'p_cr'), '42501', null,
                 'o Presidente NÃO homologa o próprio risco');

-- ----------------------------------------------------------------------------
-- 6. Efeito colateral: riscos de outras unidades continuam como antes
-- ----------------------------------------------------------------------------
select pg_temp.sair();
select is(public.fn_fluxo_validador_efetivo(:'cgov', null), :'cgge'::uuid,
          'validador efetivo da CGOV continua a CGGE');
select is(public.fn_fluxo_homologador_efetivo(:'cgov', null), :'presidencia'::uuid,
          'homologador efetivo da CGOV continua a Presidência');
select is(public.fn_fluxo_validador_efetivo(:'assessoria', '00000000-0000-4000-a000-000000000070'), :'gabin'::uuid,
          'validador efetivo da Assessoria (enviado pelo gestor) é o GABIN');
select is(public.fn_fluxo_homologador_efetivo(:'presidencia', '00000000-0000-4000-a000-000000000012'), null::uuid,
          'homologador efetivo da Presidência, se o Presidente enviou, não existe (D1)');
select is(public.fn_fluxo_homologador_efetivo(:'assessoria', '00000000-0000-4000-a000-000000000012'), null::uuid,
          'o mesmo vale para a Assessoria se o Presidente enviou (D1)');

select * from finish();
rollback;
