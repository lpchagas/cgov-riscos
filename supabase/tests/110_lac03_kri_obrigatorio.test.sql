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
-- Seções 1 a 8 (Tarefa 2): estrutura, funções de "KRI completo", gatilhos e
-- RLS. Seções 9 a 16 (Tarefa 3): a trava do risco crítico passa a exigir um
-- KRI completo (3º motivo), salvar_ficha_risco liga o KRI do objeto, a
-- definição de KRI compartilhado trava/reabre TODOS os riscos ligados, a DAR
-- devolve com o motivo real e a coluna antiga risco_id sai.
--
-- Este teste roda DEPOIS da migração, sobre a semente de demonstração. A cópia dos dados antigos (risco_id → kri_riscos) foi provada
-- à mão no banco local (Step 4b do plano; números na mensagem do commit).
--
-- Objetos usados (semente): A = ...b000-000000000001 (FLONA de Caçador,
-- gestor.uc@ grava; valida ct@) e B = ...b000-000000000004 (CT Curitiba).
-- gestor.base@ (Base Avançada Belterra) é o "gestor de outra unidade".
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(116);

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
-- O KRI do objeto é ligado aos dois riscos (o rascunho e o aprovado).
select pg_temp.inserir_risco('T110-A-RASC2', :'obj_a', 'rascunho') as r_rasc \gset
select pg_temp.inserir_risco('T110-A-APROV', :'obj_a', 'aprovado') as r_aprov \gset
select pg_temp.inserir_kri('T110 KRI de dois riscos', :'obj_a') as k_old \gset
select pg_temp.ligar_sem_fluxo(:'k_old', :'r_rasc');
select pg_temp.ligar_sem_fluxo(:'k_old', :'r_aprov');

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

-- ----------------------------------------------------------------------------
-- 9. A coluna antiga e a ponte saíram (Tarefa 3)
-- ----------------------------------------------------------------------------
select hasnt_column('public', 'indicadores_kri', 'risco_id', '9. indicadores_kri não tem mais a coluna risco_id');
select hasnt_trigger('public', 'indicadores_kri', 'trg_kris_ponte_preenche_objeto', '9. a ponte (preenche objeto) saiu');
select hasnt_trigger('public', 'indicadores_kri', 'trg_kris_ponte_liga_risco', '9. a ponte (liga risco) saiu');
select has_trigger('public', 'indicadores_kri', 'trg_kris_trava_reabertura', '9. o KRI continua com o gatilho de trava e reabertura');
-- Nenhuma função viva lê indicadores_kri.risco_id: nem escrito por extenso,
-- nem por um apelido (ex.: "indicadores_kri AS k" ... "k.risco_id"), nem pelo
-- NEW/OLD de um gatilho da tabela. (A lista à mão está no relatório da Tarefa 3.)
select is((select string_agg(p.proname, ', ' order by p.proname)
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosrc ~* 'indicadores_kri\.risco_id'),
          null, '9. nenhuma função cita indicadores_kri.risco_id');
select is((select string_agg(p.proname, ', ' order by p.proname)
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.prosrc ~* 'indicadores_kri\s+(as\s+)?([a-z_][a-z0-9_]*)\M.*\m\2\.risco_id'),
          null, '9. nenhuma função lê risco_id por um apelido de indicadores_kri');
select is((select string_agg(distinct p.proname, ', ')
             from pg_trigger t join pg_proc p on p.oid = t.tgfoid
            where t.tgrelid = 'public.indicadores_kri'::regclass and not t.tgisinternal
              and p.prosrc ~ '(NEW|OLD)\.risco_id'),
          null, '9. nenhum gatilho de indicadores_kri lê NEW/OLD.risco_id');
-- Sobra da LAC-13: a linha da categoria fica presa (FOR SHARE) antes de ler o apetite.
select ok(pg_get_functiondef('public.fn_base_enviar_para_validacao(uuid)'::regprocedure) like '%FOR SHARE%',
          '9. fn_base_enviar_para_validacao trava a categoria (FOR SHARE)');
select ok(pg_get_functiondef('public.fn_base_validar_risco(uuid, text)'::regprocedure) like '%FOR SHARE%',
          '9. fn_base_validar_risco trava a categoria (FOR SHARE)');
select ok(pg_get_functiondef('public.fn_base_homologar_risco(uuid, text)'::regprocedure) like '%FOR SHARE%',
          '9. fn_base_homologar_risco trava a categoria (FOR SHARE)');
-- A ligação só se cria ou se apaga: ninguém logado faz UPDATE em kri_riscos.
select is(has_table_privilege('authenticated', 'public.kri_riscos', 'update'), false,
          '9. authenticated não tem UPDATE em kri_riscos');

-- ----------------------------------------------------------------------------
-- 10. Enviar, validar e homologar: o risco crítico precisa de KRI completo
-- ----------------------------------------------------------------------------
-- inserir_critico(código, estado): risco crítico (P=4, I=4 → 21,00, Extremo,
-- fora do apetite da DAR) no objeto A, com Mitigar e UMA ação 5W2H, sem KRI.
-- (Extremo é a faixa 18 a 25; "crítico" é estar fora do apetite da DAR.)
create or replace function pg_temp.inserir_critico(p_codigo text, p_status text, p_cat int default 2,
                                                   p_p int default 4, p_i int default 4)
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
     status_fluxo, estrategia_principal)
  values (p_codigo, '00000000-0000-4000-b000-000000000001', 'Responsável de demonstração',
          'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
          p_cat, p_p, p_i, 0, 'Baixo', 0, 'Baixo', 'rascunho', 'Mitigar')
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

select pg_temp.inserir_critico('T110-CRIT-ENV', 'rascunho') as rc_env,
       pg_temp.inserir_critico('T110-CRIT-VAL', 'em_validacao_cg') as rc_val,
       pg_temp.inserir_critico('T110-CRIT-HOM', 'em_homologacao_dir') as rc_hom,
       pg_temp.inserir_risco('T110-A-OUTRO', :'obj_a', 'rascunho') as r_outro
\gset
select is((select status_critico from public.riscos where id = :'rc_env'), 'sim',
          '10. (conferência) o risco de partida é crítico');

-- Sem KRI: o envio é recusado com o 3º motivo (texto fixo).
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'rc_env'), '23514',
                 'RADAR: o risco T110-CRIT-ENV é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável).',
                 '10. enviar crítico com Mitigar + ação e SEM KRI é recusado (23514)');
select pg_temp.sair();

-- Com KRI incompleto (sem fonte dos dados): continua recusado.
insert into public.indicadores_kri (objeto_id, nome_indicador, formula_calculo, periodicidade, limite_alerta, responsavel_medicao)
values (:'obj_a', 'T110 KRI incompleto', 'a / b', 'Mensal', '> 1', 'Chefia');
select (select id from public.indicadores_kri where nome_indicador = 'T110 KRI incompleto') as k_inc \gset
select pg_temp.ligar_sem_fluxo(:'k_inc', :'rc_env');
select pg_temp.ligar_sem_fluxo(:'k_inc', :'rc_hom');
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_like(format($$select public.enviar_para_validacao(%L)$$, :'rc_env'),
                   '%falta um KRI completo%', '10. com KRI incompleto o envio continua recusado');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'rc_env'), 'rascunho',
          '10. o risco continua em rascunho');

-- KRI completo COMPARTILHADO com outro risco do mesmo objeto: passa.
select pg_temp.inserir_kri('T110 KRI completo compartilhado', :'obj_a') as k_comp \gset
select pg_temp.ligar_sem_fluxo(:'k_comp', :'r_outro');
select pg_temp.ligar_sem_fluxo(:'k_comp', :'rc_env');
select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$select public.enviar_para_validacao(%L)$$, :'rc_env'),
                '10. com KRI completo compartilhado, o envio passa');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'rc_env'), 'em_validacao_cg',
          '10. o risco foi para em_validacao_cg');

-- Validar e homologar sem KRI completo: recusa e orienta a devolver.
select pg_temp.entrar_como('ct@radar.test');
select throws_like(format($$select public.validar_risco(%L, 'ok')$$, :'rc_val'),
                   '%falta um KRI completo%Devolva a ficha à unidade para ajuste.',
                   '10. validar crítico sem KRI é recusado e orienta a devolver');
select lives_ok(format($$select public.validar_risco(%L, 'ok')$$, :'rc_env'),
                '10. validar crítico com KRI completo compartilhado passa');
select pg_temp.entrar_como('gr@radar.test');
select throws_like(format($$select public.homologar_risco(%L, 'ok')$$, :'rc_hom'),
                   '%falta um KRI completo%Devolva a ficha à unidade para ajuste.',
                   '10. homologar crítico com KRI incompleto é recusado e orienta a devolver');
select lives_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'rc_env'),
                '10. homologar crítico com KRI completo compartilhado passa');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'rc_env'), 'aprovado',
          '10. o risco com KRI completo chegou a aprovado');

-- ----------------------------------------------------------------------------
-- 11. salvar_ficha_risco: liga o KRI do objeto e não apaga KRI de outro risco
-- ----------------------------------------------------------------------------
-- Aprovado crítico com o único KRI completo: tirar o KRI da ficha é recusado.
select pg_temp.inserir_critico('T110-CRIT-APR', 'rascunho') as rc_apr \gset
select pg_temp.inserir_kri('T110 KRI único do aprovado', :'obj_a') as k_apr \gset
select pg_temp.ligar_sem_fluxo(:'k_apr', :'rc_apr');
select (public.fn_fluxo_mudar_estado(:'rc_apr', 'aprovado')).id as ok_apr \gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_like(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                          jsonb_build_object('id', :'rc_apr', 'kris', '[]'::jsonb)),
                   '%falta um KRI completo%', '11. tirar o único KRI completo de um aprovado crítico é recusado');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'rc_apr'), 'aprovado',
          '11. a ficha continua aprovada');
select is((select count(*)::int from public.kri_riscos where risco_id = :'rc_apr' and kri_id = :'k_apr'), 1,
          '11. a ligação do KRI continua');

-- apenasLigar: liga um KRI que já existe no objeto, SEM mudar a definição.
select pg_temp.inserir_risco('T110-A-LIGA', :'obj_a', 'rascunho') as r_liga \gset
select pg_temp.inserir_kri('T110 KRI do objeto B', :'obj_b') as k_b \gset
select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
                  'id', :'r_liga',
                  'kris', jsonb_build_array(jsonb_build_object('id', :'k_comp', 'apenasLigar', true,
                                                               'nome_indicador', 'nome trocado')))),
                '11. apenasLigar de KRI do mesmo objeto é aceito');
select pg_temp.sair();
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_comp' and risco_id = :'r_liga'), 1,
          '11. apenasLigar criou a ligação');
select is((select nome_indicador from public.indicadores_kri where id = :'k_comp'), 'T110 KRI completo compartilhado',
          '11. apenasLigar não mudou a definição do KRI');
select is((select status_fluxo from public.riscos where id = :'rc_env'), 'aprovado',
          '11. o aprovado que já usava o KRI não foi reaberto');

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
                   'id', :'r_liga',
                   'kris', jsonb_build_array(jsonb_build_object('id', :'k_b', 'apenasLigar', true)))),
                 '22023', null, '11. apenasLigar de KRI de outro objeto é recusado (22023)');

-- Tirar da ficha um KRI que outro risco ainda usa: só desliga (o KRI fica).
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       jsonb_build_object('id', :'r_liga', 'kris', '[]'::jsonb)),
                '11. a ficha sem o KRI compartilhado é gravada');
select pg_temp.sair();
select is((select count(*)::int from public.kri_riscos where kri_id = :'k_comp')
          || '/' || (select count(*)::int from public.indicadores_kri where id = :'k_comp'), '2/1',
          '11. o KRI compartilhado só foi desligado deste risco: continua, com as outras 2 ligações');

-- Item sem id: KRI novo, do objeto do risco, já ligado a ele.
select pg_temp.entrar_como('gestor.uc@radar.test');
select f.id as ok_ficha from public.salvar_ficha_risco(jsonb_build_object('id', :'r_liga', 'kris', jsonb_build_array(
         jsonb_build_object('nome_indicador', 'T110 KRI novo pela ficha', 'formula_calculo', 'a / b')))) as f \gset
select pg_temp.sair();
select is((select k.objeto_id::text || '/' || count(l.*)::text
             from public.indicadores_kri k left join public.kri_riscos l on l.kri_id = k.id and l.risco_id = :'r_liga'
            where k.nome_indicador = 'T110 KRI novo pela ficha' group by k.objeto_id),
          :'obj_a' || '/1', '11. KRI novo da ficha é do objeto do risco e já nasce ligado');

-- ----------------------------------------------------------------------------
-- 12. Definição de KRI compartilhado: trava e reabre TODOS os riscos ligados
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('T110-A-APROV3', :'obj_a', 'aprovado') as r_ap3,
       pg_temp.inserir_risco('T110-A-APROV4', :'obj_a', 'aprovado') as r_ap4,
       pg_temp.inserir_risco('T110-A-APROV5', :'obj_a', 'aprovado') as r_ap5
\gset
select pg_temp.inserir_kri('T110 KRI com risco em validação', :'obj_a') as k_sh \gset
select pg_temp.ligar_sem_fluxo(:'k_sh', :'r_val');
select pg_temp.ligar_sem_fluxo(:'k_sh', :'r_ap3');
select pg_temp.inserir_kri('T110 KRI de dois aprovados', :'obj_a') as k_sh2 \gset
select pg_temp.ligar_sem_fluxo(:'k_sh2', :'r_ap4');
select pg_temp.ligar_sem_fluxo(:'k_sh2', :'r_ap5');

-- Review Focus 1, com caminho DETERMINÍSTICO: a trava passa pelos riscos
-- ligados em ordem de risco_id. Com ids fixos, os dois casos de ordem ficam
-- provados:
--   K1: o APROVADO vem primeiro (…a110-…01) → é reaberto e, logo depois, o
--       risco em validação (…a110-…02) recusa: a reabertura também é desfeita;
--   K2: o risco EM VALIDAÇÃO vem primeiro (…a110-…03) → recusa antes de chegar
--       ao aprovado (…a110-…04).
-- inserir_risco_com_id(id, código, estado): como inserir_risco, com id fixo.
create or replace function pg_temp.inserir_risco_com_id(p_id uuid, p_codigo text, p_status text)
returns uuid
language plpgsql
as $$
begin
  insert into public.riscos
    (id, codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual,
     status_fluxo)
  values (p_id, p_codigo, '00000000-0000-4000-b000-000000000001', 'Responsável de demonstração',
          'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
          2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho');
  if p_status <> 'rascunho' then
    perform public.fn_fluxo_mudar_estado(p_id, p_status);
  end if;
  return p_id;
end;
$$;

select pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000001', 'T110-ORD-1-APROV', 'aprovado') as ro1_ap,
       pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000002', 'T110-ORD-1-VALID', 'em_validacao_cg') as ro1_va,
       pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000003', 'T110-ORD-2-VALID', 'em_validacao_cg') as ro2_va,
       pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000004', 'T110-ORD-2-APROV', 'aprovado') as ro2_ap,
       pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000005', 'T110-ORD-RASC', 'rascunho') as ro_rasc
\gset
select pg_temp.inserir_kri('T110 KRI ordem 1', :'obj_a') as k_o1,
       pg_temp.inserir_kri('T110 KRI ordem 2', :'obj_a') as k_o2
\gset
select pg_temp.ligar_sem_fluxo(:'k_o1', :'ro1_ap');
select pg_temp.ligar_sem_fluxo(:'k_o1', :'ro1_va');
select pg_temp.ligar_sem_fluxo(:'k_o1', :'ro_rasc');
select pg_temp.ligar_sem_fluxo(:'k_o2', :'ro2_va');
select pg_temp.ligar_sem_fluxo(:'k_o2', :'ro2_ap');

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_like(format($$update public.indicadores_kri set formula_calculo = 'nova fórmula' where id = %L$$, :'k_o1'),
                   '%T110-ORD-1-VALID está travada%',
                   '12. K1 (aprovado antes na ordem): alterar o KRI é recusado pelo risco em validação');
select throws_like(format($$update public.indicadores_kri set formula_calculo = 'nova fórmula' where id = %L$$, :'k_o2'),
                   '%T110-ORD-2-VALID está travada%',
                   '12. K2 (em validação antes na ordem): alterar o KRI é recusado');
-- O mesmo caso pela ficha: o RASCUNHO que divide K1 com o risco em validação
-- tenta alterar a definição de K1 → recusado, e nada muda.
select throws_like(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
                     'id', :'ro_rasc', 'causas', 'causa trocada pela ficha',
                     'kris', jsonb_build_array(jsonb_build_object('id', :'k_o1', 'formula_calculo', 'fórmula pela ficha')))),
                   '%T110-ORD-1-VALID está travada%',
                   '12. ficha de rascunho que altera KRI compartilhado com risco em validação é recusada');
select pg_temp.sair();
select is((select string_agg(status_fluxo, ',' order by id) from public.riscos
            where id in (:'ro1_ap', :'ro1_va', :'ro2_va', :'ro2_ap', :'ro_rasc')),
          'aprovado,em_validacao_cg,em_validacao_cg,aprovado,rascunho',
          '12. nos dois casos e pela ficha, nenhum risco mudou de estado (a reabertura de K1 foi desfeita)');
select is((select string_agg(formula_calculo, ',' order by nome_indicador) from public.indicadores_kri
            where id in (:'k_o1', :'k_o2')), 'atrasados / total,atrasados / total',
          '12. a definição dos dois KRIs não mudou');
select is((select causas from public.riscos where id = :'ro_rasc') || '/'
          || (select count(*) from public.kri_riscos where risco_id = :'ro_rasc'),
          'causa de teste/1', '12. a ficha recusada não gravou nada (texto do risco e ligação como antes)');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'ro1_ap'), 0,
          '12. K1: o histórico do aprovado não ganhou linha de reabertura');

select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.indicadores_kri set formula_calculo = formula_calculo where id = %L$$, :'k_sh')),
          1, '12. UPDATE que não muda nada continua livre');
select lives_ok(format($$update public.indicadores_kri set formula_calculo = 'nova fórmula' where id = %L$$, :'k_sh2'),
                '12. alterar KRI de dois aprovados passa');
select lives_ok(format($$insert into public.indicadores_kri (objeto_id, nome_indicador) values (%L, 'T110 KRI solto')$$, :'obj_a'),
                '12. criar KRI (ainda sem ligação) é livre');
select pg_temp.sair();
select is((select string_agg(status_fluxo, ',' order by codigo_radar) from public.riscos where id in (:'r_ap4', :'r_ap5')),
          'em_validacao_cg,em_validacao_cg', '12. os dois aprovados do KRI alterado reabriram');

-- 12b. KRI que a pessoa LÊ mas não pode ALTERAR: a ficha avisa (42501)
-- A CGOV lê todos os objetos e grava a ficha do risco preliminar dela. Mas o
-- KRI abaixo também serve a um rascunho da unidade, então a CGOV não pode
-- alterá-lo (cgov_grava_no_kri_preliminar). A RLS só "não acha" a linha no
-- UPDATE; sem a conferência do ROW_COUNT, a ficha diria "salvo" sem gravar.
select pg_temp.inserir_risco_com_id('00000000-0000-4000-a110-000000000006', 'T110-PRELIM', 'preliminar_cgov') as r_prel \gset
select pg_temp.inserir_kri('T110 KRI do preliminar e da unidade', :'obj_a') as k_cg \gset
select pg_temp.ligar_sem_fluxo(:'k_cg', :'r_prel');
select pg_temp.ligar_sem_fluxo(:'k_cg', :'ro_rasc');
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
                   'id', :'r_prel',
                   'kris', jsonb_build_array(jsonb_build_object('id', :'k_cg', 'formula_calculo', 'fórmula da CGOV')))),
                 '42501', null, '12b. CGOV altera, pela ficha preliminar, KRI que também é da unidade → recusa 42501');
select pg_temp.sair();
select is((select formula_calculo from public.indicadores_kri where id = :'k_cg'), 'atrasados / total',
          '12b. a definição do KRI não mudou');

-- ----------------------------------------------------------------------------
-- 13. kri_riscos: sem UPDATE; desligar reabre ou trava; órfão pelo gestor
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('T110-A-APROV6', :'obj_a', 'aprovado') as r_ap6,
       pg_temp.inserir_risco('T110-A-RASC6', :'obj_a', 'rascunho') as r_ra6
\gset
select pg_temp.ligar_sem_fluxo(:'k_sh', :'r_ap6');
select pg_temp.inserir_kri('T110 KRI órfão', :'obj_a') as k_orf \gset
select pg_temp.ligar_sem_fluxo(:'k_orf', :'r_ra6');
insert into public.medicoes_kri (kri_id, valor_apurado) values (:'k_orf', '1%');

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$update public.kri_riscos set risco_id = %L where kri_id = %L and risco_id = %L$$,
                        :'r_ra6', :'k_sh', :'r_ap6'),
                 '42501', null, '13. UPDATE em kri_riscos pelo gestor é recusado (42501)');
select lives_ok(format($$delete from public.kri_riscos where kri_id = %L and risco_id = %L$$, :'k_sh', :'r_ap6'),
                '13. o gestor desliga o KRI do risco aprovado');
select is((select status_fluxo from public.riscos where id = :'r_ap6'), 'em_validacao_cg',
          '13. desligar o KRI de um aprovado o reabre (em_validacao_cg)');
select throws_like(format($$delete from public.kri_riscos where kri_id = %L and risco_id = %L$$, :'k_sh', :'r_val'),
                   '%travada%', '13. desligar o KRI de risco em validação é recusado (ficha travada)');
select lives_ok(format($$delete from public.kri_riscos where kri_id = %L$$, :'k_orf'),
                '13. o gestor desliga a última ligação do KRI');
select pg_temp.sair();
select is((select count(*)::int from public.indicadores_kri where id = :'k_orf')
          + (select count(*)::int from public.medicoes_kri where kri_id = :'k_orf'), 0,
          '13. o KRI órfão e a medição foram apagados (gestor comum, não o administrador)');

-- ----------------------------------------------------------------------------
-- 14. DAR: o aprovado que não passa na trava volta com o motivo real
-- ----------------------------------------------------------------------------
-- Categorias 11 e 9 nascem 'pendente_dar'; damos 'moderado' só dentro do teste.
update public.categorias_risco set apetite_declarado = 'moderado' where id in (9, 11);
-- A: já crítico (21,00) na categoria 11, Mitigar + ação, SEM KRI.
-- B: o mesmo, COM KRI completo. C: Médio (9,00) na categoria 9, sem KRI.
select pg_temp.inserir_critico('T110-DAR-A', 'aprovado', 11) as rd_a,
       pg_temp.inserir_critico('T110-DAR-B', 'rascunho', 11) as rd_b,
       pg_temp.inserir_critico('T110-DAR-C', 'aprovado', 9, 2, 3) as rd_c
\gset
select pg_temp.ligar_sem_fluxo(pg_temp.inserir_kri('T110 KRI do DAR-B', :'obj_a'), :'rd_b');
select (public.fn_fluxo_mudar_estado(:'rd_b', 'aprovado')).id as ok_b \gset
select is((select string_agg(status_critico, ',' order by codigo_radar) from public.riscos
            where id in (:'rd_a', :'rd_b', :'rd_c')), 'sim,sim,nao',
          '14. ponto de partida: A e B já críticos; C dentro do apetite');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 11$$,
                '14. a mudança da DAR (moderado → baixo) termina sem exceção');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'rd_a'), 'devolvido',
          '14. A (já crítico, sem KRI) volta para a unidade (devolvido)');
select is((select despacho_texto from public.historico_fluxo where risco_id = :'rd_a' and acao = 'devolvido_mudanca_dar'),
          (select format('DAR alterada: categoria %s com apetite moderado → baixo. O risco aprovado (residual %s, %s, fora do apetite da DAR) não passa na trava do risco crítico: falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável). Voltou para a unidade ajustar.',
                         c.nome, r.nivel_residual, r.classificacao_residual)
             from public.riscos r join public.categorias_risco c on c.id = r.categoria_id where r.id = :'rd_a'),
          '14. A: o histórico traz o texto fixo com o motivo real');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'rd_a' and despacho_texto like '%passou a Risco Crítico%'), 0,
          '14. A: o histórico não diz "passou a Risco Crítico" (ele já era crítico)');
select is((select status_fluxo from public.riscos where id = :'rd_b'), 'aprovado',
          '14. B (já crítico, com KRI completo) continua aprovado');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'pendente_dar' where id = 9$$,
                '14. a categoria 9 passa a pendente_dar sem exceção');
select pg_temp.sair();
select is((select status_fluxo || '/' || status_critico from public.riscos where id = :'rd_c'), 'devolvido/pendente_dar',
          '14. C (DAR pendente, sem KRI) volta para a unidade');
select ok((select despacho_texto like '%(residual %, com DAR pendente; por regra do sistema, a trava do risco crítico também se aplica) não passa na trava do risco crítico: falta um KRI completo%'
             from public.historico_fluxo where risco_id = :'rd_c' and acao = 'devolvido_mudanca_dar'),
          '14. C: o histórico diz que a trava vale por regra do sistema');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'rd_c' and despacho_texto like '%Metodologia%'), 0,
          '14. C: o histórico não atribui à Metodologia a regra da DAR pendente');

-- ----------------------------------------------------------------------------
-- 15. ler_auditoria entende kri_riscos (sem indicadores_kri.risco_id)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select is((select a.codigo_radar from public.ler_auditoria(p_tabela => 'kri_riscos', p_limite => 100) a
            where a.operacao = 'INSERT' and a.dados_novos ->> 'kri_id' = :'k_a'),
          'T110-A-RASC', '15. a linha da ligação mostra o código do risco ligado');
select is((select a.codigo_radar from public.ler_auditoria(p_tabela => 'medicoes_kri', p_limite => 100) a
            where a.operacao = 'INSERT' and a.dados_novos ->> 'kri_id' = :'k_a'),
          'T110-A-RASC', '15. a medição de KRI com um só risco mostra o código desse risco');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 16. Consulta dos aprovados antigos fora da regra (vai para o guia)
-- ----------------------------------------------------------------------------
select pg_temp.inserir_critico('T110-ANTIGO', 'aprovado') as rc_antigo \gset
select ok(:'rc_antigo'::uuid in (select id from public.riscos
                                  where status_fluxo = 'aprovado' and status_critico in ('sim', 'pendente_dar')
                                    and public.fn_trava_risco_critico(id) is not null),
          '16. o aprovado crítico sem KRI aparece na consulta');
select ok(:'rc_apr'::uuid not in (select id from public.riscos
                                   where status_fluxo = 'aprovado' and status_critico in ('sim', 'pendente_dar')
                                     and public.fn_trava_risco_critico(id) is not null),
          '16. o aprovado crítico com KRI completo não aparece');

select * from finish();
rollback;
