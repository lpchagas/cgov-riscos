-- ============================================================================
-- TESTE DA LAC-04 (pgTAP) — comunicações à CGOV, imutáveis, com ciência da CGOV
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A unidade comunica à CGOV um evento (hipóteses I a VI da Política) ou um
-- alerta de KRI vencido/ocorrido. A comunicação é um REGISTRO IMUTÁVEL: depois
-- de enviada, só a CGOV pode acrescentar a "ciência" (data, autor, observação).
-- Este teste cobre: tabelas e CHECKs, a RPC enviar_comunicacao, o encerramento
-- do alerta, a imutabilidade, a RLS (unidade, AUDIT, CGOV), a ciência da CGOV,
-- a visão com o prazo em dias úteis e a trilha de auditoria.
-- Objeto A = ...b000-000000000001 (FLONA de Caçador; gestor.uc@ grava).
-- gestor.base@ é o "gestor de outra unidade". Só dados de demonstração.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(137);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select '00000000-0000-4000-b000-000000000001'::uuid as obj_a \gset
select unidade_id as un_a from public.objetos_contexto where id = :'obj_a' \gset

-- Um risco do objeto A (rascunho, Baixo) para ligar às comunicações.
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
values ('T121-R1', :'obj_a', 'Responsável de demonstração', 'causa', 'evento', 'consequência',
        'objetivo', 'x', 2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho');
select id as r1 from public.riscos where codigo_radar = 'T121-R1' \gset

-- kri_alerta(nome): KRI "maior que 10 %" do objeto A, com UMA leitura em
-- alerta (20 %): o banco abre o alerta (ciência = hoje). Devolve o id do KRI.
create or replace function pg_temp.kri_alerta(p_nome text, p_objeto uuid default '00000000-0000-4000-b000-000000000001')
returns uuid
language plpgsql
as $$
declare
  v_kri uuid;
begin
  insert into public.indicadores_kri
    (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
     meta_alvo, responsavel_medicao, limite_operador, limite_valor, limite_unidade)
  values (p_objeto, p_nome, 'a / b', 'Planilha', 'Mensal',
          '0%', 'Chefia', '>', 10, '%')
  returning id into v_kri;
  insert into public.medicoes_kri (kri_id, valor_apurado, valor_numerico)
  values (v_kri, '20%', 20);
  return v_kri;
end;
$$;

select pg_temp.kri_alerta('T121 KRI 1') as k1 \gset
select pg_temp.kri_alerta('T121 KRI 2') as k2 \gset
select pg_temp.kri_alerta('T121 KRI 3') as k3 \gset
select pg_temp.kri_alerta('T121 KRI 4') as k4 \gset
select pg_temp.kri_alerta('T121 KRI B', '00000000-0000-4000-b000-000000000004') as kb \gset
select id as al4 from public.alertas_kri where kri_id = :'k4' \gset
select id as al_b from public.alertas_kri where kri_id = :'kb' \gset
select unidade_id as un_b from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000004' \gset
select p.unidade_id as un_aud from public.perfis_usuarios p join auth.users u on u.id = p.id
 where u.email = 'auditor@radar.test' \gset
-- Risco do objeto B (outra unidade), para o teste de ligação indevida.
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
values ('T121-RB', '00000000-0000-4000-b000-000000000004', 'Responsável de demonstração', 'causa', 'evento',
        'consequência', 'objetivo', 'x', 2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho');
select id as rb from public.riscos where codigo_radar = 'T121-RB' \gset
select id as al1, ciencia_em as ci1 from public.alertas_kri where kri_id = :'k1' \gset
select id as al2, ciencia_em as ci2 from public.alertas_kri where kri_id = :'k2' \gset
select id as al3 from public.alertas_kri where kri_id = :'k3' \gset

-- Item 19 (fica no começo do arquivo: ALTER TABLE não roda com eventos de gatilho
-- adiados pendentes, e as comunicações de teste os criam): se o UPDATE não encerra o alerta, a comunicação não fica gravada.
-- Como administrador desligamos o gatilho de validação para forçar um alerta
-- já encerrado (a seguir religamos; tudo é desfeito no rollback).
select pg_temp.kri_alerta('T121 KRI 19') as k19 \gset
select id as al19 from public.alertas_kri where kri_id = :'k19' \gset
update public.alertas_kri set encerrado_em = public.fn_hoje() where id = :'al19';
alter table public.comunicacoes_cgov disable trigger trg_comunicacao_antes_de_inserir;
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'alerta já encerrado', %L)$$, :'un_a', :'al19'),
  'P0001', 'O alerta não pôde ser encerrado; a comunicação não foi gravada',
  '12. comunicação que não consegue encerrar o alerta é recusada');
alter table public.comunicacoes_cgov enable trigger trg_comunicacao_antes_de_inserir;

-- ----------------------------------------------------------------------------
-- 1. Estrutura e permissões
-- ----------------------------------------------------------------------------
select has_table('public', 'comunicacoes_cgov', '1. a tabela comunicacoes_cgov existe');
select has_table('public', 'comunicacoes_riscos', '1. a tabela comunicacoes_riscos existe');
select has_view('public', 'comunicacoes_cgov_situacao', '1. a visão comunicacoes_cgov_situacao existe');
select has_function('public', 'enviar_comunicacao', array['jsonb'], '1. enviar_comunicacao(jsonb) existe');
select has_function('public', 'registrar_ciencia_comunicacao', array['uuid', 'text'],
                    '1. registrar_ciencia_comunicacao(uuid, text) existe');
select has_trigger('public', 'comunicacoes_cgov', 'trg_auditoria_comunicacoes_cgov', '1. auditoria de comunicacoes_cgov');
select has_trigger('public', 'comunicacoes_riscos', 'trg_auditoria_comunicacoes_riscos', '1. auditoria de comunicacoes_riscos');
select is((select count(*)::int from pg_constraint
            where conrelid = 'public.alertas_kri'::regclass and contype = 'f'
              and confrelid = 'public.comunicacoes_cgov'::regclass),
          1, '1. alertas_kri.comunicacao_id agora é FK de comunicacoes_cgov');
select is((select relrowsecurity from pg_class where oid = 'public.comunicacoes_cgov'::regclass),
          true, '1. RLS ligada em comunicacoes_cgov');
select is((select relrowsecurity from pg_class where oid = 'public.comunicacoes_riscos'::regclass),
          true, '1. RLS ligada em comunicacoes_riscos');
select is((select (reloptions @> array['security_invoker=true'])
             from pg_class where oid = 'public.comunicacoes_cgov_situacao'::regclass),
          true, '1. a visão é security_invoker');
select is(has_table_privilege('authenticated', 'public.comunicacoes_cgov', 'UPDATE')
       or has_table_privilege('authenticated', 'public.comunicacoes_cgov', 'DELETE')
       or has_table_privilege('authenticated', 'public.comunicacoes_riscos', 'UPDATE')
       or has_table_privilege('authenticated', 'public.comunicacoes_riscos', 'DELETE'),
          false, '1. authenticated não tem UPDATE/DELETE nas comunicações');
select is(has_table_privilege('anon', 'public.comunicacoes_cgov', 'SELECT')
       or has_table_privilege('anon', 'public.comunicacoes_riscos', 'SELECT')
       or has_table_privilege('anon', 'public.comunicacoes_cgov_situacao', 'SELECT'),
          false, '1. anon não lê as comunicações');
select is(has_function_privilege('anon', 'public.enviar_comunicacao(jsonb)', 'EXECUTE')
       or has_function_privilege('anon', 'public.registrar_ciencia_comunicacao(uuid,text)', 'EXECUTE'),
          false, '1. anon não executa as RPCs (só se confere o privilégio)');
select is(has_function_privilege('authenticated', 'public.enviar_comunicacao(jsonb)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.registrar_ciencia_comunicacao(uuid,text)', 'EXECUTE'),
          true, '1. authenticated executa as RPCs (a regra de papel está dentro da função)');
select is((select prosecdef from pg_proc where oid = 'public.enviar_comunicacao(jsonb)'::regprocedure),
          false, '1. enviar_comunicacao é SECURITY INVOKER (a RLS vale)');
select is((select prosecdef from pg_proc where oid = 'public.registrar_ciencia_comunicacao(uuid,text)'::regprocedure),
          true, '1. registrar_ciencia_comunicacao é SECURITY DEFINER');

-- ----------------------------------------------------------------------------
-- 2. Envio pelo gestor: hipóteses, risco obrigatório e CHECKs
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');

-- IV sem risco: pode (o risco só é obrigatório em I, II, III, V e alerta_kri).
select lives_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(),
      'descricao', 'Comunicação de teste IV'))$$, :'un_a'),
  '2. hipótese IV sem risco é aceita');
select public.enviar_comunicacao(jsonb_build_object(
  'unidade_id', :'un_a', 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(),
  'descricao', 'Comunicação IV (a que a CGOV vai ciente)', 'providencias', 'Providências X',
  'documento_sei', '00000000')) as c_iv \gset
select is((select count(*)::int from public.comunicacoes_cgov where id = :'c_iv'), 1,
          '2. o gestor lê a comunicação que enviou');
select is((select supre from public.comunicacoes_cgov where id = :'c_iv'), '{}'::text[],
          '2. supre começa vazio');
select is((select autor_id from public.comunicacoes_cgov where id = :'c_iv'), auth.uid(),
          '2. o autor é quem enviou (auth.uid())');

-- Risco obrigatório em I, II, III, V e alerta_kri.
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
      'descricao', 'sem risco'))$$, :'un_a'),
  'P0001', 'Informe o risco ligado', '2. hipótese I sem risco: "Informe o risco ligado"');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'V', 'data_ciencia', public.fn_hoje(),
      'descricao', 'sem risco'))$$, :'un_a'),
  'P0001', 'Informe o risco ligado', '2. hipótese V sem risco: erro');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'VII', 'data_ciencia', public.fn_hoje(),
      'descricao', 'hipótese inexistente', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'r1'),
  'P0001', 'Hipótese inválida: use I, II, III, IV, V, VI ou alerta_kri', '2. hipótese fora da lista: mensagem clara');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'hipotese', 'IV', 'data_ciencia', public.fn_hoje(), 'descricao', 'sem unidade'))$$),
  'P0001', 'Informe a unidade que comunica', '2. sem unidade: mensagem clara');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'data_ciencia', public.fn_hoje(),
      'descricao', 'sem alerta', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'r1'),
  'P0001', 'A comunicação de alerta de KRI exige o alerta', '2. alerta_kri sem alerta_id: erro claro');

-- supre ⊆ {I, II, III} e só com alerta_kri.
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'V', 'data_ciencia', public.fn_hoje(),
      'descricao', 'supre fora de lugar', 'supre', jsonb_build_array('I'),
      'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'r1'),
  '23514', null, '2. supre = {I} com hipótese V: erro (CHECK)');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'supre inválido', 'supre', jsonb_build_array('IV'),
      'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al3', public.fn_hoje(), :'r1'),
  '23514', null, '2. supre = {IV} com alerta_kri: erro (só I, II, III)');
select is((select encerrado_em from public.alertas_kri where id = :'al3'), null,
          '2. a tentativa recusada não encerrou o alerta (transação desfeita)');

-- Data de ciência não pode ser futura.
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje() + 1,
      'descricao', 'futuro'))$$, :'un_a'),
  'P0001', 'A data de ciência não pode ser futura', '2. ciência no futuro: erro');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje()))$$, :'un_a'),
  'P0001', 'Informe a descrição do fato', '2. descrição é obrigatória (mensagem clara)');

-- Hipótese I com risco: grava a ligação em comunicacoes_riscos.
select public.enviar_comunicacao(jsonb_build_object(
  'unidade_id', :'un_a', 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
  'descricao', 'Comunicação I com risco', 'risco_ids', jsonb_build_array(:'r1'))) as c_i \gset
select is((select count(*)::int from public.comunicacoes_riscos
            where comunicacao_id = :'c_i' and risco_id = :'r1'), 1,
          '2. a comunicação I grava o risco ligado em comunicacoes_riscos');
select is((select count(*)::int from public.comunicacoes_riscos where comunicacao_id = :'c_iv'), 0,
          '2. a comunicação IV sem risco não tem ligações');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
      'descricao', 'risco inexistente',
      'risco_ids', jsonb_build_array('00000000-0000-4000-f000-0000000000ff')))$$, :'un_a'),
  'P0001', 'Risco não encontrado ou fora da unidade que comunica', '2. risco inexistente: erro claro');

-- supre válido com alerta_kri: {I, III}.
select lives_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'Alerta do KRI 3, supre I e III', 'supre', jsonb_build_array('I','III'),
      'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al3', public.fn_hoje(), :'r1'),
  '2. alerta_kri com supre = {I, III} é aceito');

-- ----------------------------------------------------------------------------
-- 3. Comunicação do alerta: encerra o alerta; 2ª comunicação é recusada
-- ----------------------------------------------------------------------------
-- Regras com alerta_id: hipótese alerta_kri, alerta aberto, ciência = a do alerta.
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'hipótese errada'))$$, :'un_a', :'al1', :'ci1'),
  'P0001', 'A comunicação de um alerta deve ter a hipótese alerta_kri', '3. com alerta_id a hipótese tem de ser alerta_kri');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'ciência trocada', 'risco_ids', jsonb_build_array(%L)))$$,
      :'un_a', :'al1', (:'ci1'::date - 1), :'r1'),
  'P0001', 'A data de ciência deve ser a do alerta', '3. a data de ciência tem de ser a do alerta');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'sem risco'))$$, :'un_a', :'al1', :'ci1'),
  'P0001', 'Informe o risco ligado', '3. alerta_kri sem risco: erro');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', '00000000-0000-4000-f000-0000000000fe',
      'data_ciencia', public.fn_hoje(), 'descricao', 'x', 'risco_ids', jsonb_build_array(%L)))$$,
      :'un_a', :'r1'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica', '3. alerta inexistente: erro claro');

select public.enviar_comunicacao(jsonb_build_object(
  'unidade_id', :'un_a', 'hipotese', 'alerta_kri', 'alerta_id', :'al1', 'data_ciencia', :'ci1'::date,
  'descricao', 'Alerta do KRI 1 comunicado no prazo', 'risco_ids', jsonb_build_array(:'r1'))) as c_al1 \gset
select is((select encerrado_em from public.alertas_kri where id = :'al1'), public.fn_hoje(),
          '3. comunicar o alerta o encerra hoje (encerrado_em)');
select is((select comunicacao_id from public.alertas_kri where id = :'al1'), :'c_al1'::uuid,
          '3. o alerta guarda a comunicação (comunicacao_id)');
select is((select alerta_id from public.comunicacoes_cgov where id = :'c_al1'), :'al1'::uuid,
          '3. a comunicação guarda o alerta (alerta_id)');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', %L,
      'descricao', 'duplicada', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al1', :'ci1', :'r1'),
  'P0001', 'Este alerta já foi comunicado', '3. 2ª comunicação do mesmo alerta: "Este alerta já foi comunicado"');

-- Fora do prazo: grava (o prazo é informação, não trava).
select pg_temp.sair();
update public.alertas_kri set ciencia_em = public.fn_hoje() - 40 where id = :'al2';
select pg_temp.entrar_como('gestor.uc@radar.test');
select public.enviar_comunicacao(jsonb_build_object(
  'unidade_id', :'un_a', 'hipotese', 'alerta_kri', 'alerta_id', :'al2',
  'data_ciencia', public.fn_hoje() - 40, 'descricao', 'Alerta do KRI 2 comunicado atrasado',
  'risco_ids', jsonb_build_array(:'r1'))) as c_al2 \gset
select isnt((select id from public.comunicacoes_cgov where id = :'c_al2'), null,
            '3. fora do prazo: a comunicação é gravada');
select is((select no_prazo from public.comunicacoes_cgov_situacao where id = :'c_al2'), false,
          '3. fora do prazo: no_prazo = false');
select ok((select prazo_dias_uteis from public.comunicacoes_cgov_situacao where id = :'c_al2') > 10,
          '3. fora do prazo: prazo_dias_uteis > 10');
select is((select no_prazo from public.comunicacoes_cgov_situacao where id = :'c_al1'), true,
          '3. no prazo: no_prazo = true');
select is((select prazo_dias_uteis from public.comunicacoes_cgov_situacao where id = :'c_al1'), 0,
          '3. comunicada no mesmo dia da ciência: prazo_dias_uteis = 0');
select is((select vence_em from public.comunicacoes_cgov_situacao where id = :'c_al2'),
          public.fn_somar_dias_uteis(public.fn_hoje() - 40, 10), '3. vence_em = ciência + 10 dias úteis');
select is((select situacao from public.comunicacoes_cgov_situacao where id = :'c_iv'), 'nova',
          '3. situação "nova" enquanto a CGOV não deu ciência');

-- ----------------------------------------------------------------------------
-- 4. Imutabilidade
-- ----------------------------------------------------------------------------
select throws_ok($$update public.comunicacoes_cgov set descricao = 'adulterada' where true$$,
                 '42501', null, '4. gestor não altera a descrição (sem privilégio de UPDATE, 42501)');
select throws_ok($$delete from public.comunicacoes_cgov where true$$,
                 '42501', null, '4. gestor não apaga comunicações (sem privilégio de DELETE, 42501)');
select is((select count(*)::int from public.comunicacoes_cgov where id = :'c_iv'), 1,
          '4. depois da tentativa de DELETE a linha continua lá');
select throws_ok($$delete from public.comunicacoes_riscos where true$$,
                 '42501', null, '4. gestor não apaga ligações de risco (42501)');
select is((select count(*)::int from public.comunicacoes_riscos where comunicacao_id = :'c_i'), 1,
          '4. depois da tentativa de DELETE a ligação continua lá');

-- Como administrador (que ignora privilégios e RLS), o gatilho ainda protege.
select pg_temp.sair();
select throws_ok(
  format($$update public.comunicacoes_cgov set descricao = 'adulterada' where id = %L$$, :'c_iv'),
  'P0001', 'A comunicação é imutável: só a ciência da CGOV pode ser registrada',
  '4. o gatilho recusa mudar a descrição, mesmo como administrador');
select throws_ok(
  format($$update public.comunicacoes_cgov set comunicada_em = now() + interval '1 day' where id = %L$$, :'c_iv'),
  'P0001', null, '4. o gatilho recusa mudar a data do envio');
select throws_ok(
  format($$update public.comunicacoes_cgov set alerta_id = null where id = %L$$, :'c_al1'),
  'P0001', null, '4. o gatilho recusa soltar a comunicação do alerta');
select lives_ok(
  format($$update public.comunicacoes_cgov set observacao_cgov = 'nota' where id = %L$$, :'c_iv'),
  '4. o gatilho deixa passar a coluna da ciência (observacao_cgov)');
update public.comunicacoes_cgov set observacao_cgov = null where id = :'c_iv';

-- ----------------------------------------------------------------------------
-- 5. RLS: outra unidade, AUDIT e CGOV
-- ----------------------------------------------------------------------------
select count(*)::int as total from public.comunicacoes_cgov \gset

select pg_temp.entrar_como('gestor.base@radar.test');
select is((select count(*)::int from public.comunicacoes_cgov), 0,
          '5. gestor da unidade B não lê as comunicações da unidade A');
select is((select count(*)::int from public.comunicacoes_riscos), 0,
          '5. gestor da unidade B não lê as ligações da unidade A');
select is((select count(*)::int from public.comunicacoes_cgov_situacao), 0,
          '5. gestor da unidade B não lê a visão da unidade A');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(),
      'descricao', 'invasão'))$$, :'un_a'),
  '42501', null, '5. gestor da unidade B não insere na unidade A (RLS, 42501)');

select pg_temp.entrar_como('auditor@radar.test');
select is((select count(*)::int from public.comunicacoes_cgov), :total,
          '5. a AUDIT lê todas as comunicações');
select is((select count(*)::int from public.comunicacoes_riscos) > 0, true,
          '5. a AUDIT lê as ligações de risco');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(),
      'descricao', 'auditoria não envia'))$$, :'un_a'),
  'P0001', 'A auditoria não envia comunicação', '5. a AUDIT não envia comunicação em outra unidade');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(),
      'descricao', 'auditoria não envia'))$$, :'un_aud'),
  'P0001', 'A auditoria não envia comunicação', '5. a AUDIT não envia comunicação nem na própria unidade');

-- ----------------------------------------------------------------------------
-- 6. Ciência da CGOV
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($$select public.registrar_ciencia_comunicacao(%L, 'tentativa do gestor')$$, :'c_iv'),
  'P0001', 'Somente a CGOV registra a ciência da comunicação', '6. gestor não registra a ciência (erro da função)');
select is((select ciencia_cgov_em from public.comunicacoes_cgov where id = :'c_iv'), null,
          '6. a ciência continua vazia depois da tentativa do gestor');

select pg_temp.entrar_como('cgov@radar.test');
select is((select count(*)::int from public.comunicacoes_cgov), :total, '6. a CGOV lê todas as comunicações');
select throws_ok(
  $$select public.registrar_ciencia_comunicacao('00000000-0000-4000-f000-0000000000fd', 'x')$$,
  'P0001', 'Comunicação não encontrada', '6. ciência de comunicação inexistente: erro claro');
select lives_ok(
  format($$select public.registrar_ciencia_comunicacao(%L, 'Ciente. Acompanhar.')$$, :'c_iv'),
  '6. a CGOV registra a ciência');
select isnt((select ciencia_cgov_em from public.comunicacoes_cgov where id = :'c_iv'), null,
            '6. a data da ciência foi gravada');
select is((select ciencia_cgov_por from public.comunicacoes_cgov where id = :'c_iv'), auth.uid(),
          '6. quem deu ciência foi gravado (auth.uid())');
select is((select observacao_cgov from public.comunicacoes_cgov where id = :'c_iv'), 'Ciente. Acompanhar.',
          '6. a observação da CGOV foi gravada');
select is((select situacao from public.comunicacoes_cgov_situacao where id = :'c_iv'), 'ciencia_registrada',
          '6. a situação passa a "ciencia_registrada"');
select throws_ok(
  format($$select public.registrar_ciencia_comunicacao(%L, 'segunda ciência')$$, :'c_iv'),
  'P0001', 'A ciência desta comunicação já foi registrada', '6. 2ª ciência: erro');
select is((select observacao_cgov from public.comunicacoes_cgov where id = :'c_iv'), 'Ciente. Acompanhar.',
          '6. a 2ª ciência não sobrescreveu a observação');

-- O gatilho também recusa mexer na ciência já registrada, mesmo como administrador.
select pg_temp.sair();
select throws_ok(
  format($$update public.comunicacoes_cgov set observacao_cgov = 'outra' where id = %L$$, :'c_iv'),
  'P0001', null, '6. ciência registrada não muda nem como administrador');

-- O gestor da unidade A continua lendo a ciência dada pela CGOV.
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select observacao_cgov from public.comunicacoes_cgov where id = :'c_iv'), 'Ciente. Acompanhar.',
          '6. o gestor da unidade lê a ciência da CGOV');

-- ----------------------------------------------------------------------------
-- 7. Corrida (2 envios do mesmo alerta) e fuso horário da visão
-- ----------------------------------------------------------------------------
select pg_temp.sair();
-- A UNIQUE de alerta_id é a rede de segurança da corrida: o RPC traduz o erro
-- 23505 na mesma mensagem "Este alerta já foi comunicado".
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'duplicada direta', %L)$$, :'un_a', :'al1'),
  'P0001', 'Este alerta já foi comunicado', '7. INSERT direto de 2ª comunicação do mesmo alerta: recusado');
select ok(exists(select 1 from pg_constraint c
                  where c.conrelid = 'public.comunicacoes_cgov'::regclass and c.contype = 'u'
                    and c.conkey = array[(select attnum from pg_attribute
                                           where attrelid = 'public.comunicacoes_cgov'::regclass
                                             and attname = 'alerta_id')]::smallint[]),
          '7. UNIQUE exatamente em alerta_id (rede de segurança da corrida)');

-- Fuso: comunicação às 22h de 30/11 em Brasília (= 01h de 01/12 em UTC).
-- Dias úteis em (23/11, 30/11] = 5 (24, 25, 26, 27, 30). Com ::date direto,
-- UTC daria 6 (conta o dia 01/12). A visão converte para America/Sao_Paulo.
insert into public.comunicacoes_cgov (id, unidade_id, hipotese, data_ciencia, comunicada_em, descricao)
values ('00000000-0000-4000-d000-000000000001', :'un_a', 'IV', '2026-11-23',
        '2026-12-01 01:00:00+00', 'Teste do fuso horário');
set local timezone = 'UTC';
select is((select prazo_dias_uteis from public.comunicacoes_cgov_situacao
            where id = '00000000-0000-4000-d000-000000000001'), 5,
          '7. prazo calculado no dia de Brasília (sessão em UTC)');
set local timezone = 'Pacific/Auckland';
select is((select prazo_dias_uteis from public.comunicacoes_cgov_situacao
            where id = '00000000-0000-4000-d000-000000000001'), 5,
          '7. prazo igual com a sessão em Pacific/Auckland');
select is((select no_prazo from public.comunicacoes_cgov_situacao
            where id = '00000000-0000-4000-d000-000000000001'), true,
          '7. 5 dias úteis: no prazo');


-- ----------------------------------------------------------------------------
-- 9. Fechando os atalhos: INSERT direto, alerta/risco de outra unidade, travas
-- ----------------------------------------------------------------------------
-- O gestor tem INSERT na tabela (a RPC é INVOKER). Os gatilhos garantem que
-- gravar direto dá o MESMO resultado que a RPC: o que não pode ser forjado é
-- sobrescrito ou recusado.
select pg_temp.entrar_como('gestor.uc@radar.test');
insert into public.comunicacoes_cgov
  (unidade_id, hipotese, data_ciencia, descricao, comunicada_em, autor_id,
   ciencia_cgov_em, ciencia_cgov_por, observacao_cgov)
values (:'un_a', 'IV', public.fn_hoje(), 'Tentativa de forjar', '2020-01-01 00:00:00+00',
        '00000000-0000-4000-a000-0000000000aa', now(), auth.uid(), 'ciência forjada')
returning id as c_forja \gset
select is((select comunicada_em = now() from public.comunicacoes_cgov where id = :'c_forja'), true,
          '9. INSERT direto: comunicada_em retroativa é sobrescrita por agora');
select is((select autor_id from public.comunicacoes_cgov where id = :'c_forja'), auth.uid(),
          '9. INSERT direto: autor_id é sempre quem está logado');
select is((select ciencia_cgov_em is null and ciencia_cgov_por is null and observacao_cgov is null
             from public.comunicacoes_cgov where id = :'c_forja'), true,
          '9. INSERT direto: a ciência da CGOV não pode ser forjada');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'IV', public.fn_hoje() + 1, 'futura')$$, :'un_a'),
  'P0001', 'A data de ciência não pode ser futura', '9. INSERT direto: ciência no futuro é recusada');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'alerta de outra unidade', %L)$$, :'un_a', :'al_b'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica',
  '9. INSERT direto: alerta de outra unidade é recusado');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje() - 1, 'ciência trocada', %L)$$, :'un_a', :'al4'),
  'P0001', 'A data de ciência deve ser a do alerta', '9. INSERT direto: ciência diferente da do alerta é recusada');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'IV', public.fn_hoje(), 'hipótese errada', %L)$$, :'un_a', :'al4'),
  'P0001', 'A comunicação de um alerta deve ter a hipótese alerta_kri',
  '9. D-2: alerta_id com hipótese diferente de alerta_kri é recusado');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'alerta_kri', public.fn_hoje(), 'sem alerta')$$, :'un_a'),
  '23514', null, '9. D-2: alerta_kri sem alerta_id é recusado (CHECK)');
select pg_temp.sair();
select is((select count(*)::int from public.alertas_kri where id in (:'al_b', :'al4') and encerrado_em is null), 2,
          '9. os alertas visados nas tentativas seguem abertos');

-- I-1 pela RPC: alerta visível, mas de outra unidade (a CT lê a FLONA, mas não é ela).
select pg_temp.entrar_como('ct@radar.test');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', public.fn_hoje(),
      'descricao', 'CT comunicando alerta da FLONA', 'risco_ids', jsonb_build_array(%L)))$$,
      :'un_b', :'al4', :'r1'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica', '9. RPC: alerta de outra unidade é recusado');
-- D-1: risco visível, mas de fora da unidade que comunica.
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
      'descricao', 'CT ligando risco da FLONA', 'risco_ids', jsonb_build_array(%L)))$$, :'un_b', :'r1'),
  'P0001', 'Risco não encontrado ou fora da unidade que comunica', '9. RPC: risco de outra unidade é recusado');

-- I-2: ligações só nascem junto com a comunicação, e são imutáveis.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($$insert into public.comunicacoes_riscos (comunicacao_id, risco_id)
           values ('00000000-0000-4000-d000-0000000000ff', %L)$$, :'r1'),
  'P0001', 'Só é possível ligar riscos na mesma transação que cria a comunicação',
  '9. não se liga risco a comunicação que não é desta transação (aqui: inexistente)');
-- (Desde a 2ª rodada, "já enviada" = criada em OUTRA transação, pelo xmin. Num
-- arquivo pgTAP tudo é uma transação só, então o caso "de transação anterior"
-- é coberto pelo teste direto de fn_xmin_e_da_transacao_atual, no fim do arquivo.)
select throws_ok(
  format($$insert into public.comunicacoes_riscos (comunicacao_id, risco_id) values (%L, %L)$$, :'c_forja', :'rb'),
  'P0001', 'Risco não encontrado ou fora da unidade que comunica', '9. INSERT direto de vínculo com risco de outra unidade é recusado');
select lives_ok(
  format($$insert into public.comunicacoes_riscos (comunicacao_id, risco_id) values (%L, %L)$$, :'c_forja', :'r1'),
  '9. vínculo com risco da unidade, na mesma transação, é aceito');
select pg_temp.sair();
select throws_ok(
  format($$update public.comunicacoes_riscos set risco_id = %L where comunicacao_id = %L$$, :'rb', :'c_forja'),
  'P0001', 'As ligações da comunicação são imutáveis', '9. UPDATE em comunicacoes_riscos é recusado (até como administrador)');
select throws_ok(
  format($$delete from public.comunicacoes_riscos where comunicacao_id = %L$$, :'c_forja'),
  'P0001', 'As ligações da comunicação são imutáveis', '9. DELETE em comunicacoes_riscos é recusado (até como administrador)');

-- D-4: travas de exclusão com mensagem clara.
select throws_ok(format($$delete from public.riscos where id = %L$$, :'r1'),
  'P0001', 'Este risco foi citado em uma comunicação à CGOV e não pode ser apagado',
  '9. risco citado em comunicação não é apagado');
select throws_ok(format($$delete from public.indicadores_kri where id = %L$$, :'k1'),
  'P0001', 'Este KRI tem alerta já comunicado à CGOV e não pode ser apagado',
  '9. KRI com alerta comunicado não é apagado');
select throws_ok(format($$delete from public.medicoes_kri where kri_id = %L$$, :'k1'),
  'P0001', 'Esta leitura abriu um alerta do KRI e não pode ser apagada',
  '9. leitura que abriu o alerta não é apagada');
select throws_ok(format($$delete from public.indicadores_kri where id = %L$$, :'kb'),
  'P0001', 'Este KRI tem alerta em aberto: comunique à CGOV antes de apagar',
  '9. B: KRI com alerta em aberto também não é apagado');

-- C-1: hipótese que exige risco, gravada direto sem risco, é barrada no fim da
-- transação (gatilho deferido). SET CONSTRAINTS ... IMMEDIATE força a checagem agora.
select pg_temp.entrar_como('gestor.uc@radar.test');
insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
values (:'un_a', 'I', public.fn_hoje(), 'hipótese I direto, sem risco');
select throws_ok($$set constraints all immediate$$, 'P0001', 'Informe o risco ligado',
                 '9. INSERT direto de hipótese I sem risco é barrado ao fim da transação');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 10. Alcance = o de escrita: a unidade + subunidades INTERNAS (não a árvore toda)
-- ----------------------------------------------------------------------------
-- Fixture (administrador): sob a unidade A criamos uma DIVISÃO (interna) e uma
-- UC filha (não interna), cada uma com um objeto, um risco e um KRI em alerta.
select pg_temp.sair();
insert into public.unidades (icmbio_id, nome, tipo, unidade_pai_id)
values ('T121-DIV', 'Divisão de teste', 'divisao', :'un_a'),
       ('T121-UCF', 'UC filha de teste', 'uc', :'un_a');
select id as un_div from public.unidades where icmbio_id = 'T121-DIV' \gset
select id as un_ucf from public.unidades where icmbio_id = 'T121-UCF' \gset
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado, ciclo_ano)
values ('00000000-0000-4000-b000-0000000000d1', 'Processo', 'Objeto da divisão', :'un_div', 'obj', 2026),
       ('00000000-0000-4000-b000-0000000000d2', 'Processo', 'Objeto da UC filha', :'un_ucf', 'obj', 2026);
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
select c, o, 'Responsável de demonstração', 'causa', 'evento', 'consequência', 'objetivo', 'x', 2, 1, 1,
       0, 'Baixo', 0, 'Baixo', 'rascunho'
  from (values ('T121-RDIV', '00000000-0000-4000-b000-0000000000d1'::uuid),
               ('T121-RUCF', '00000000-0000-4000-b000-0000000000d2'::uuid)) as v(c, o);
select id as r_div from public.riscos where codigo_radar = 'T121-RDIV' \gset
select id as r_ucf from public.riscos where codigo_radar = 'T121-RUCF' \gset
select pg_temp.kri_alerta('T121 KRI DIV', '00000000-0000-4000-b000-0000000000d1') as k_div \gset
select pg_temp.kri_alerta('T121 KRI UCF', '00000000-0000-4000-b000-0000000000d2') as k_ucf \gset
select id as al_div from public.alertas_kri where kri_id = :'k_div' \gset
select id as al_ucf from public.alertas_kri where kri_id = :'k_ucf' \gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
      'descricao', 'risco da UC filha', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'r_ucf'),
  'P0001', 'Risco não encontrado ou fora da unidade que comunica',
  '10. risco de uma UC filha (não é subunidade interna) é recusado');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', public.fn_hoje(),
      'descricao', 'alerta da UC filha', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al_ucf', :'r1'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica',
  '10. alerta de uma UC filha é recusado');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'direto, UC filha', %L)$$, :'un_a', :'al_ucf'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica',
  '10. INSERT direto com alerta de UC filha é recusado');
select lives_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'I', 'data_ciencia', public.fn_hoje(),
      'descricao', 'risco da divisão', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'r_div'),
  '10. risco de uma divisão (subunidade interna) é aceito');
select lives_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', public.fn_hoje(),
      'descricao', 'alerta da divisão', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al_div', :'r_div'),
  '10. alerta de uma divisão (subunidade interna) é aceito e encerrado');
select pg_temp.sair();
select is((select encerrado_em from public.alertas_kri where id = :'al_div'), public.fn_hoje(),
          '10. o alerta da divisão foi encerrado');
select is((select encerrado_em from public.alertas_kri where id = :'al_ucf'), null,
          '10. o alerta da UC filha segue aberto');
select is(has_function_privilege('authenticated', 'public.fn_unidade_do_alerta(uuid)', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.fn_unidades_de_escrita(uuid)', 'EXECUTE'),
          false, '10. authenticated não executa os auxiliares internos');

-- ----------------------------------------------------------------------------
-- 8. Trilha de auditoria
-- ----------------------------------------------------------------------------
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'comunicacoes_cgov' and operacao = 'INSERT'
              and registro_id = :'c_iv'), 1, '8. o envio da comunicação foi auditado');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'comunicacoes_cgov' and operacao = 'UPDATE'
              and registro_id = :'c_iv'
              and dados_novos->>'ciencia_cgov_em' is not null), 1,
          '8. a ciência da CGOV foi auditada');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'comunicacoes_riscos' and operacao = 'INSERT'
              and dados_novos->>'comunicacao_id' = :'c_i'), 1, '8. a ligação com o risco foi auditada');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'alertas_kri' and operacao = 'UPDATE'
              and registro_id = :'al1' and dados_novos->>'comunicacao_id' = :'c_al1'), 1,
          '8. o encerramento do alerta foi auditado');

-- ----------------------------------------------------------------------------
-- 11. F5: desligar da ficha um KRI órfão com alerta comunicado
-- ----------------------------------------------------------------------------
-- O KRI que fica sem ligação costuma ser apagado. Se ele tem alerta já
-- comunicado à CGOV, fica guardado como prova (D-4) e a ficha salva normalmente.
select pg_temp.sair();
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
values ('T121-R5', :'obj_a', 'Responsável de demonstração', 'causa', 'evento', 'consequência',
        'objetivo', 'x', 2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho');
select id as r5 from public.riscos where codigo_radar = 'T121-R5' \gset
select pg_temp.kri_alerta('T121 KRI 5') as k5 \gset
select id as al5 from public.alertas_kri where kri_id = :'k5' \gset
select set_config('radar.fluxo', 'on', true);
insert into public.kri_riscos (kri_id, risco_id) values (:'k5', :'r5');
select set_config('radar.fluxo', '', true);

select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'alerta_kri', 'alerta_id', %L, 'data_ciencia', public.fn_hoje(),
      'descricao', 'alerta do KRI 5', 'risco_ids', jsonb_build_array(%L)))$$, :'un_a', :'al5', :'r5'),
  '11. F5: comunica o alerta do KRI 5');
select lives_ok(
  format($$select public.salvar_ficha_risco(jsonb_build_object('id', %L, 'kris', '[]'::jsonb))$$, :'r5'),
  '11. F5: desligar da ficha o KRI com alerta comunicado salva sem erro');
select pg_temp.sair();
select is((select count(*)::int from public.indicadores_kri where id = :'k5'), 1,
          '11. F5: o KRI órfão com alerta comunicado continua existindo');
select is((select count(*)::int from public.kri_riscos where kri_id = :'k5'), 0,
          '11. F5: a ligação do KRI com o risco foi desfeita');

-- ----------------------------------------------------------------------------
-- 12. Triagem da PR #19
-- ----------------------------------------------------------------------------
-- Item 14: descrição não pode ser vazia nem só espaços.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', public.fn_hoje(), 'descricao', '   '))$$, :'un_a'),
  'P0001', 'Informe a descrição do fato', '12. descrição só com espaços: mensagem clara');
select pg_temp.sair();
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'IV', public.fn_hoje(), '')$$, :'un_a'),
  '23514', null, '12. INSERT direto com descrição vazia: CHECK (23514)');

-- Item 15: os auxiliares de alcance não são chamáveis por quem está logado.
select is(has_function_privilege('authenticated', 'public.fn_risco_na_unidade(uuid,uuid)', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.fn_alerta_na_unidade(uuid,uuid)', 'EXECUTE'),
          false, '12. authenticated não executa fn_risco_na_unidade nem fn_alerta_na_unidade');

-- Item 16: data de ciência infinita (ou absurdamente antiga) é recusada.
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'IV', '-infinity', 'ciência infinita')$$, :'un_a'),
  '23514', null, '12. INSERT direto com ciência -infinity: CHECK (23514)');
select throws_ok(
  format($$select public.enviar_comunicacao(jsonb_build_object(
      'unidade_id', %L, 'hipotese', 'IV', 'data_ciencia', '-infinity', 'descricao', 'x'))$$, :'un_a'),
  '23514', null, '12. RPC com ciência -infinity: recusada (23514)');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'IV', '1900-01-01', 'ciência antiga demais')$$, :'un_a'),
  '23514', null, '12. ciência de 1900 recusada (a visão calcula prazos em dias úteis)');
select lives_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao)
           values (%L, 'IV', '2026-01-05', 'ciência antiga, mas razoável')$$, :'un_a'),
  '12. ciência finita no passado continua aceita (fora do prazo grava)');

-- Item 17: INSERT direto não vaza se o alerta existe, nem se já foi comunicado.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'sonda', %L)$$, :'un_b', :'al1'),
  '42501', 'Sem permissão para comunicar por esta unidade',
  '12. INSERT direto por unidade onde não escreve: "Sem permissão"');
select throws_ok(
  format($$insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, descricao, alerta_id)
           values (%L, 'alerta_kri', public.fn_hoje(), 'sonda', %L)$$, :'un_a', :'al_b'),
  'P0001', 'Alerta não encontrado ou fora da unidade que comunica',
  '12. INSERT direto com alerta de outra unidade: mensagem genérica (não revela se já foi comunicado)');
select pg_temp.sair();

-- Item 18: carga administrativa (sem usuário logado) com data de envio histórica
-- fecha o vínculo com o risco. (Num arquivo pgTAP tudo roda numa transação só:
-- "outra transação" é simulada por comunicada_em <> now().)
insert into public.comunicacoes_cgov (unidade_id, hipotese, data_ciencia, comunicada_em, descricao)
values (:'un_a', 'I', '2025-01-06', '2025-01-10 12:00:00+00', 'Carga histórica hipótese I')
returning id as c_hist \gset
select lives_ok(
  format($$insert into public.comunicacoes_riscos (comunicacao_id, risco_id) values (%L, %L)$$, :'c_hist', :'r1'),
  '12. carga administrativa histórica liga o risco (comunicada_em antigo)');

-- Item 21: nem o administrador apaga uma comunicação (o gatilho vale em DELETE).
select throws_ok(
  format($$delete from public.comunicacoes_cgov where id = %L$$, :'c_iv'),
  'P0001', 'A comunicação é imutável e não pode ser apagada',
  '12. DELETE de comunicação sem riscos ligados é recusado até como administrador');

-- 2ª rodada do CodeRabbit (PR #19), M3: o vínculo só vale na MESMA transação
-- que criou a comunicação, identificada pelo xmin da linha. Num arquivo pgTAP
-- tudo roda numa transação só (não dá para ter uma comunicação "de transação
-- anterior"), então testamos a função de checagem diretamente: o xmin de uma
-- linha já confirmada (catálogo do sistema) NÃO é da transação atual; o de
-- linhas criadas aqui é, inclusive dentro de um SAVEPOINT/bloco EXCEPTION
-- (é o caso da RPC enviar_comunicacao).
select is(public.fn_xmin_e_da_transacao_atual((select xmin from pg_class limit 1)), false,
          '12. M3: xmin de linha de transação anterior (confirmada) não é da transação atual');
select is(public.fn_xmin_e_da_transacao_atual((select xmin from public.comunicacoes_cgov where id = :'c_hist')),
          true, '12. M3: xmin da comunicação criada nesta transação é da transação atual');
do $$ begin
  begin
    create temp table _m3_sub on commit drop as select 1 as x;
    perform set_config('radar.m3_sub', (select public.fn_xmin_e_da_transacao_atual(xmin)::text from _m3_sub), true);
  exception when others then null;
  end;
end $$;
select is(current_setting('radar.m3_sub'), 'true',
          '12. M3: linha criada dentro de bloco EXCEPTION (subtransação) também conta');

select * from finish();
rollback;
