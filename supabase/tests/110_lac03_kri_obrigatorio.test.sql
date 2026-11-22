-- ============================================================================
-- TESTE DA LAC-03 (pgTAP) — KRI do objeto, ligação muitos para muitos e RLS
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Metodologia (4.7.1), o risco crítico (residual fora do apetite da DAR)
-- precisa de um Indicador-Chave de Risco (KRI) completo. A LAC-03 muda o
-- desenho do KRI no banco (migração 20261122004):
--   - o KRI passa a ser do OBJETO de gestão de riscos (indicadores_kri.objeto_id);
--   - a tabela kri_riscos liga um KRI a VÁRIOS riscos do MESMO objeto
--     (ex.: o KRI "% de processos com prazo vencido" serve aos riscos R-01 e
--     R-04 da mesma FLONA);
--   - ligar ou desligar um KRI é "mexer na ficha" do risco ligado (reabre o
--     aprovado; é recusado em validação ou homologação);
--   - quando a última ligação some, o KRI e as medições dele são apagados.
-- Esta é a 1ª parte (Tarefa 2): estrutura, funções de "KRI completo",
-- gatilhos e RLS. A trava do risco crítico com o KRI vem na Tarefa 3.
--
-- Este teste roda DEPOIS da migração, sobre a semente de demonstração (que
-- não tem KRIs). A cópia dos dados antigos (risco_id → kri_riscos) foi provada
-- à mão no banco local (Step 4b do plano; números na mensagem do commit).
--
-- Objetos usados (semente): A = ...b000-000000000001 (FLONA de Caçador,
-- gestor.uc@ grava; valida ct@) e B = ...b000-000000000004 (CT Curitiba).
-- gestor.base@ (Base Avançada Belterra) é o "gestor de outra unidade".
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(53);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
-- inserir_risco(código, objeto, estado): risco Baixo (P=1, I=1, categoria 2),
-- não crítico, que nasce em rascunho e vai ao estado pedido pelo fluxo.
create or replace function pg_temp.inserir_risco(p_codigo text, p_objeto uuid, p_status text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual,
     status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração',
          'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
          2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho')
  returning id into v_id;
  if p_status <> 'rascunho' then
    perform public.fn_fluxo_mudar_estado(v_id, p_status);
  end if;
  return v_id;
end;
$$;

-- inserir_kri(nome, objeto): KRI completo do objeto, ainda sem ligação.
create or replace function pg_temp.inserir_kri(p_nome text, p_objeto uuid)
returns uuid
language sql
as $$
  insert into public.indicadores_kri
    (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
     meta_alvo, limite_alerta, responsavel_medicao)
  values (p_objeto, p_nome, 'atrasados / total', 'Planilha da unidade', 'Mensal',
          '0%', '> 10%', 'Chefia da unidade')
  returning id;
$$;

-- ligar_sem_fluxo(kri, risco): ligação feita "por fora" do fluxo (sinal
-- radar.fluxo ligado), para montar o cenário sem reabrir nada.
create or replace function pg_temp.ligar_sem_fluxo(p_kri uuid, p_risco uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('radar.fluxo', 'on', true);
  insert into public.kri_riscos (kri_id, risco_id) values (p_kri, p_risco);
  perform set_config('radar.fluxo', '', true);
end;
$$;

select '00000000-0000-4000-b000-000000000001'::uuid as obj_a,
       '00000000-0000-4000-b000-000000000004'::uuid as obj_b
\gset

-- ----------------------------------------------------------------------------
-- 1. Estrutura
-- ----------------------------------------------------------------------------
select has_table('public', 'kri_riscos', '1. a tabela kri_riscos existe');
select col_not_null('public', 'indicadores_kri', 'objeto_id', '1. indicadores_kri.objeto_id é obrigatório');
select col_is_null('public', 'indicadores_kri', 'formula_calculo', '1. formula_calculo aceita vazio (NULL)');
select col_is_null('public', 'indicadores_kri', 'fonte_dados', '1. fonte_dados aceita vazio (NULL)');
select col_is_null('public', 'indicadores_kri', 'periodicidade', '1. periodicidade aceita vazio (NULL)');
select col_is_null('public', 'indicadores_kri', 'meta_alvo', '1. meta_alvo aceita vazio (NULL)');
select col_is_null('public', 'indicadores_kri', 'limite_alerta', '1. limite_alerta aceita vazio (NULL)');
select col_is_null('public', 'indicadores_kri', 'responsavel_medicao', '1. responsavel_medicao aceita vazio (NULL)');
select has_trigger('public', 'kri_riscos', 'trg_kri_riscos_mesmo_objeto', '1. gatilho do mesmo objeto');
select has_trigger('public', 'kri_riscos', 'trg_kri_riscos_trava_reabertura', '1. gatilho de trava e reabertura');
select has_trigger('public', 'kri_riscos', 'trg_kri_riscos_apaga_orfao', '1. gatilho do KRI órfão');
select has_trigger('public', 'kri_riscos', 'trg_auditoria_kri_riscos', '1. gatilho de auditoria');
-- A periodicidade continua presa à lista (o CHECK não saiu).
select throws_ok(format($$insert into public.indicadores_kri (objeto_id, nome_indicador, periodicidade)
                          values (%L, 'periodicidade inventada', 'Quinzenal')$$, :'obj_a'),
                 '23514', null, '1. periodicidade fora da lista continua recusada');

-- ----------------------------------------------------------------------------
-- 2. "Texto preenchido" e "KRI completo" (mesma regra do travaRiscoCritico.ts)
-- ----------------------------------------------------------------------------
select is(public.fn_texto_preenchido(null), false, '2. NULL não é texto preenchido');
select is(public.fn_texto_preenchido(''), false, '2. vazio não é texto preenchido');
select is(public.fn_texto_preenchido('   '), false, '2. só espaços não é texto preenchido');
select is(public.fn_texto_preenchido(' a definir '), false, '2. " a definir " (caixa e espaços) não é texto preenchido');
select is(public.fn_texto_preenchido('A definir pela unidade'), false, '2. "A definir pela unidade" não é texto preenchido');
select is(public.fn_texto_preenchido('Mensal'), true, '2. "Mensal" é texto preenchido');

-- kri(campos): monta uma linha de indicadores_kri só na memória (não grava).
create or replace function pg_temp.kri(p_campos jsonb)
returns public.indicadores_kri
language sql
as $$
  select jsonb_populate_record(null::public.indicadores_kri,
    jsonb_build_object('nome_indicador', 'Prazo vencido', 'formula_calculo', 'atrasados / total',
                       'fonte_dados', 'Planilha', 'periodicidade', 'Mensal', 'meta_alvo', '0%',
                       'limite_alerta', '> 10%', 'responsavel_medicao', 'Chefia') || p_campos);
$$;

select is(public.fn_kri_completo(pg_temp.kri('{}')), true, '2. os 6 campos preenchidos: KRI completo');
select is(public.fn_kri_completo(pg_temp.kri('{"meta_alvo": null}')), true, '2. sem meta continua completo (meta é opcional)');
select is(public.fn_kri_completo(pg_temp.kri('{"fonte_dados": " a definir "}')), false, '2. fonte " a definir ": KRI incompleto');
select is(public.fn_kri_completo(pg_temp.kri('{"limite_alerta": null}')), false, '2. sem limite de alerta: KRI incompleto');
select is(public.fn_kri_completo(pg_temp.kri('{"responsavel_medicao": "   "}')), false, '2. responsável só com espaços: KRI incompleto');

-- ----------------------------------------------------------------------------
-- 3. Ligação só dentro do mesmo objeto
-- ----------------------------------------------------------------------------
select pg_temp.inserir_kri('T110 KRI do objeto A', :'obj_a') as k_a \gset
select pg_temp.inserir_risco('T110-B-RASC', :'obj_b', 'rascunho') as r_b \gset
select pg_temp.inserir_risco('T110-A-RASC', :'obj_a', 'rascunho') as r_a \gset

select throws_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_a', :'r_b'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '3. ligar KRI do objeto A a risco do objeto B é recusado (23514)');
select lives_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_a', :'r_a'),
                '3. ligar KRI do objeto A a risco do objeto A passa');
select throws_ok(format($$update public.kri_riscos set risco_id = %L where kri_id = %L$$, :'r_b', :'k_a'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '3. trocar a ligação para risco de outro objeto também é recusado');

-- O grupo também não quebra quando o KRI ou o risco muda de objeto.
select throws_ok(format($$update public.indicadores_kri set objeto_id = %L where id = %L$$, :'obj_b', :'k_a'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '3. levar para outro objeto um KRI ligado é recusado');
select throws_ok(format($$update public.riscos set objeto_id = %L where id = %L$$, :'obj_b', :'r_a'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '3. levar para outro objeto um risco ligado a KRI é recusado');

-- ----------------------------------------------------------------------------
-- 4. KRI órfão: desligar 1 de 2 mantém; desligar o último apaga (com medições)
-- ----------------------------------------------------------------------------
select pg_temp.inserir_kri('T110 KRI compartilhado', :'obj_a') as k_g \gset
select pg_temp.inserir_risco('T110-A-R1', :'obj_a', 'rascunho') as r1 \gset
select pg_temp.inserir_risco('T110-A-R2', :'obj_a', 'rascunho') as r2 \gset
insert into public.kri_riscos (kri_id, risco_id) values (:'k_g', :'r1'), (:'k_g', :'r2');
insert into public.medicoes_kri (kri_id, valor_apurado) values (:'k_g', '7%'), (:'k_g', '12%');

delete from public.kri_riscos where kri_id = :'k_g' and risco_id = :'r1';
select is((select count(*)::int from public.indicadores_kri where id = :'k_g'), 1,
          '4. desligar 1 de 2 riscos: o KRI continua');
select is((select count(*)::int from public.medicoes_kri where kri_id = :'k_g'), 2,
          '4. desligar 1 de 2 riscos: as medições continuam');
delete from public.kri_riscos where kri_id = :'k_g' and risco_id = :'r2';
select is((select count(*)::int from public.indicadores_kri where id = :'k_g'), 0,
          '4. desligar o último risco: o KRI é apagado');
select is((select count(*)::int from public.medicoes_kri where kri_id = :'k_g'), 0,
          '4. desligar o último risco: as medições somem junto');

-- ----------------------------------------------------------------------------
-- 5. Excluir rascunho que compartilha KRI com um aprovado
-- ----------------------------------------------------------------------------
-- O KRI nasce do jeito antigo (risco_id = o rascunho), como os KRIs copiados
-- pela migração. A ponte da Tarefa 2 preenche objeto_id e cria a ligação.
select pg_temp.inserir_risco('T110-A-RASC2', :'obj_a', 'rascunho') as r_rasc \gset
select pg_temp.inserir_risco('T110-A-APROV', :'obj_a', 'aprovado') as r_aprov \gset
insert into public.indicadores_kri
  (risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, limite_alerta, responsavel_medicao)
values (:'r_rasc', 'T110 KRI antigo', 'a / b', 'Planilha', 'Mensal', '> 1', 'Chefia');
select (select id from public.indicadores_kri where nome_indicador = 'T110 KRI antigo') as k_old \gset
select is((select objeto_id from public.indicadores_kri where id = :'k_old'), :'obj_a'::uuid,
          '5. KRI gravado só com risco_id ganha o objeto_id do risco (ponte)');
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_old' and risco_id = :'r_rasc'), 1,
          '5. KRI gravado só com risco_id ganha a ligação ao risco (ponte)');
select pg_temp.ligar_sem_fluxo(:'k_old', :'r_aprov');
-- Ponte: o risco_id antigo não se troca mais (quem manda é kri_riscos).
select throws_ok(format($$update public.indicadores_kri set risco_id = %L where id = %L$$, :'r_aprov', :'k_old'),
                 '42501', null, '5. trocar o risco_id antigo do KRI é recusado (42501)');

delete from public.riscos where id = :'r_rasc';
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_old' and risco_id = :'r_aprov'), 1,
          '5. o KRI continua ligado ao risco aprovado');
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_old'), 1,
          '5. a ligação do rascunho apagado sumiu');
select is((select status_fluxo from public.riscos where id = :'r_aprov'), 'aprovado',
          '5. o risco aprovado segue aprovado');

-- ----------------------------------------------------------------------------
-- 6. Ligar KRI é "mexer na ficha": reabre o aprovado; recusa em validação
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('T110-A-APROV2', :'obj_a', 'aprovado') as r_ap2 \gset
select pg_temp.inserir_risco('T110-A-VALID', :'obj_a', 'em_validacao_cg') as r_val \gset
select pg_temp.inserir_kri('T110 KRI para ligar', :'obj_a') as k_l \gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_l', :'r_ap2'),
                '6. gestor.uc@ liga o KRI ao risco aprovado da própria unidade');
select is((select status_fluxo from public.riscos where id = :'r_ap2'), 'em_validacao_cg',
          '6. ligar KRI a risco aprovado reabre o risco (em_validacao_cg)');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'r_ap2' and despacho_texto like '%ligação do KRI ao risco%'), 1,
          '6. o histórico diz que a reabertura veio da ligação do KRI ao risco');
select throws_like(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_l', :'r_val'),
                   '%travada%', '6. ligar KRI a risco em validação é recusado (ficha travada)');

-- ----------------------------------------------------------------------------
-- 7. RLS: gestor de outra unidade não lê nem liga
-- ----------------------------------------------------------------------------
select pg_temp.sair();
insert into public.medicoes_kri (kri_id, valor_apurado) values (:'k_a', '3%');

select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.indicadores_kri where id = :'k_a'), 1,
          '7. gestor.uc@ lê o KRI do próprio objeto');
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_a'), 1,
          '7. gestor.uc@ lê a ligação do próprio objeto');
select is((select count(*)::int from public.medicoes_kri where kri_id = :'k_a'), 1,
          '7. gestor.uc@ lê a medição do KRI do próprio objeto');

select pg_temp.entrar_como('gestor.base@radar.test');
select is((select count(*)::int from public.riscos where objeto_id = :'obj_a'), 0,
          '7. (conferência) gestor.base@ não alcança o objeto A');
select is((select count(*)::int from public.indicadores_kri where id = :'k_a'), 0,
          '7. gestor.base@ NÃO lê o KRI de outra unidade');
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_a'), 0,
          '7. gestor.base@ NÃO lê a ligação de outra unidade');
select is((select count(*)::int from public.medicoes_kri where kri_id = :'k_a'), 0,
          '7. gestor.base@ NÃO lê a medição de outra unidade');
select throws_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_a', :'r1'),
                 '42501', null, '7. gestor.base@ NÃO liga KRI a risco de outra unidade (42501)');
-- Mesmo sem enxergar o KRI, ele não consegue ligá-lo a um risco do próprio
-- objeto: o gatilho do mesmo objeto enxerga tudo (SECURITY DEFINER).
select throws_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$,
                        :'k_a', (select id from public.riscos where codigo_radar = 'RADAR-DEMO-BASE')),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '7. gestor.base@ NÃO liga KRI de outra unidade a risco próprio (23514)');

-- ----------------------------------------------------------------------------
-- 8. Trilha de auditoria da ligação
-- ----------------------------------------------------------------------------
select pg_temp.sair();
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'kri_riscos' and operacao = 'INSERT'
              and dados_novos ->> 'kri_id' = :'k_a' and objeto_id = :'obj_a'), 1,
          '8. a ligação do KRI ao risco fica na trilha, com o objeto A');

select * from finish();
rollback;
