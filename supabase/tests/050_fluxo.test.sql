-- ============================================================================
-- TESTE DO FLUXO DE 3 DEGRAUS, DA TRAVA E DA REABERTURA (pgTAP) — Etapa B1, Tarefa 7
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- O risco anda por estes estados (spec, seção 8.1, item 4):
--
--   preliminar_cgov ──assumir──► rascunho ──enviar──► em_validacao_cg
--                                   ▲                    │  validar (titular da chefia imediata)
--                                   │                    ▼
--                               devolvido ◄──devolver── em_homologacao_dir ──homologar──► aprovado
--                                                         (só se exige homologação)        │
--   em_validacao_cg ──validar──► aprovado (risco que não exige homologação,               │
--                                ou "mesma chefia" valida e homologa)                     │
--   aprovado ──editar P, I, controles, tratamento, KRI, categoria ou objeto──► em_validacao_cg (reabertura)
--
-- Quem faz o quê (matriz de acesso, seção 7.1 da spec; mapa da semente):
--   FLONA de Caçador (UC com CT)  → valida ct@ (CT Curitiba), homologa gr@ (GR5);
--   FLONA do Tapajós (UC sem CT)  → valida e homologa gr1@ (GR1): "mesma chefia";
--   BAV Belterra (Base Avançada)  → valida gestor.uc-sem-ct@ (chefe da FLONA), homologa gr1@;
--   CNPT (Centro)                 → valida diretor.dibio@;
--   COFIS                         → valida cg.cgpro@, homologa diretor.diman@;
--   CGOV                          → valida cgge@, homologa presidente@.
-- Segregação "sobe um nível" (decisão D1, docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md):
-- quem ENVIOU o risco não o valida nem o homologa; se ele é o titular da
-- chefia, o degrau sobe para o nível seguinte (ver o bloco 8d).
--
-- Como as funções respondem quando recusam:
--   42501 → a pessoa não tem permissão (não é o titular da chefia certa);
--   55000 → o ESTADO do risco não permite a ação ("estado não permite"), ou a
--           ficha está TRAVADA (em validação ou homologação);
--   22023 → parâmetro inválido (devolver sem motivo).
--
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(118);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT')  as r_uc_ct,   -- rascunho, FLONA de Caçador
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as r_uc_sct,  -- em_validacao_cg, crítico, FLONA do Tapajós
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-BASE')   as r_base,    -- rascunho, crítico, BAV Belterra
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CT')     as r_ct,      -- em_validacao_cg, CT Curitiba
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-COFIS')  as r_cofis,   -- aprovado, crítico, COFIS
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CGPRO')  as r_cgpro,   -- aprovado, CGPRO
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CENTRO') as r_centro,  -- rascunho, não crítico, CNPT
  (select id from public.riscos where codigo_radar = 'RADAR-2026-001')    as r_cgov,    -- em_validacao_cg, crítico, CGOV
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-AUDIT')  as r_audit,   -- rascunho, não crítico, AUDIT
  (select id from public.unidades where icmbio_id = '23.1000') as gr1,
  (select id from public.unidades where icmbio_id = '10.0000') as presidencia
\gset

-- LAC-13 (migração 20261122002): os riscos da semente não têm ações 5W2H, e o
-- risco crítico sem ação não anda mais no fluxo. Este teste prova OUTRAS
-- regras; damos a todos o tratamento mínimo (ajudantes.psql). A trava é
-- provada em 100_lac13_trava_critico.test.sql.
select pg_temp.dar_tratamento_a_todos();

-- KRI e resposta de tratamento no risco APROVADO da CGPRO. Como o risco já
-- está aprovado, criar um KRI nele REABRIRIA o fluxo. Por isso o administrador
-- liga o sinal das funções do fluxo só durante a preparação.
select set_config('radar.fluxo', 'on', true);
insert into public.indicadores_kri
  (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo,
   limite_alerta, responsavel_medicao)
values ('00000000-0000-4000-d000-000000000050', :'r_cgpro', 'KRI de teste 050', 'a / b', 'Planilha',
        'Mensal', '0', '1', 'Coordenador-Geral');
insert into public.respostas_tratamento
  (id, risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
values ('00000000-0000-4000-e000-000000000050', :'r_cgpro', 'Mitigar', 'Ação de teste 050',
        'Coordenador-Geral', '2026-12-31', 'Procedimento de teste');
select set_config('radar.fluxo', '', true);

-- Um 2º titular ATIVO na GR1 (substituto em exercício) — ponto de atenção 4.
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-4000-a000-000000000050', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'gr1.substituto@radar.test', '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
insert into public.perfis_usuarios
  (id, nome_completo, email, cargo, unidade_id, papel_governanca, ativo, titular_chefia)
values ('00000000-0000-4000-a000-000000000050', 'Substituto Fictício GR1', 'gr1.substituto@radar.test',
        'Gerente Regional substituto', :'gr1', 'gerente_regional', true, true);

-- Um objeto e um risco da própria PRESIDÊNCIA (sem chefia imediata acima dela).
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000050', 'Unidade', 'Teste 050 — Presidência',
        :'presidencia', 'Objetivo de demonstração');

-- inserir_risco(objeto, código, P, I, categoria, estado): INSERT feito por QUEM
-- ESTIVER LOGADO (a RLS vale). O gatilho de cálculo preenche o resto.
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text, p_p int, p_i int,
                                                 p_cat int default 2, p_status text default 'rascunho')
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 'x', p_cat, p_p, p_i, 0, 'Baixo', 0, 'Baixo', p_status);
  -- LAC-13: tratamento mínimo (ver pg_temp.dar_tratamento em ajudantes.psql).
  select pg_temp.dar_tratamento(r.id) from public.riscos r where r.codigo_radar = p_codigo;
$$;

select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000050', 'RADAR-T050-PRES', 2, 2);

-- estado(id): lê o status_fluxo como administrador, sem depender do alcance
-- de quem está logado. SECURITY DEFINER não existe em pg_temp; por isso a
-- função "sai", lê e volta a ser quem estava logado.
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

-- historico(id, etapa): quantas linhas do histórico o risco tem nesta etapa
-- (lidas como administrador, como acima).
create or replace function pg_temp.historico(p_risco uuid, p_etapa text)
returns int
language plpgsql
as $$
declare
  v_role   text := current_setting('role', true);
  v_claims text := current_setting('request.jwt.claims', true);
  v_n      int;
begin
  perform set_config('role', 'none', true);
  select count(*) into v_n from public.historico_fluxo where risco_id = p_risco and etapa = p_etapa;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('role', coalesce(nullif(v_role, ''), 'none'), true);
  return v_n;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Caminho feliz da UC COM CT (risco crítico): gestor envia, ct valida, gr homologa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
-- Em rascunho, a ficha é livre: P=4, I=4 → 21 (Extremo) → crítico.
select is(pg_temp.linhas_afetadas(format($$update public.riscos set probabilidade = 4, impacto = 4 where id = %L$$, :'r_uc_ct')),
          1, 'gestor.uc edita o próprio risco em rascunho');
select is((select is_critico from public.riscos where id = :'r_uc_ct'), true,
          'P=4, I=4 → 21 (Extremo): risco crítico (fora do apetite)');
select is((select status_fluxo from public.enviar_para_validacao(:'r_uc_ct')), 'em_validacao_cg',
          'gestor.uc envia para validação: rascunho → em_validacao_cg');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_uc_ct'), '42501', null,
                 'gestor.uc NÃO valida o próprio risco');

select pg_temp.entrar_como('gr@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_uc_ct'), '42501', null,
                 'gr NÃO valida o risco da UC com CT (a chefia imediata é a CT)');

select pg_temp.entrar_como('ct@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_uc_ct', 'Ficha consistente.')), 'em_homologacao_dir',
          'ct valida o risco crítico da UC: em_validacao_cg → em_homologacao_dir');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'r_uc_ct'), '42501', null,
                 'ct NÃO homologa (quem homologa é a GR)');

select pg_temp.entrar_como('gr@radar.test');
select is((select status_fluxo from public.homologar_risco(:'r_uc_ct', 'Homologado.')), 'aprovado',
          'gr homologa: em_homologacao_dir → aprovado');
select is(pg_temp.historico(:'r_uc_ct', 'submissao_1a_linha') + pg_temp.historico(:'r_uc_ct', 'validacao_cg')
          + pg_temp.historico(:'r_uc_ct', 'homologacao_diretoria'), 3,
          'o histórico registra envio, validação e homologação (3 linhas)');

-- ----------------------------------------------------------------------------
-- 2. Reabertura: mudar a probabilidade de um risco APROVADO reabre o fluxo
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa reescrita' where id = %L$$, :'r_uc_ct')),
          1, 'em aprovado, mudar um texto que não é da avaliação não reabre...');
select is(pg_temp.estado(:'r_uc_ct'), 'aprovado', '...o risco continua aprovado');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set probabilidade = 3 where id = %L$$, :'r_uc_ct')),
          1, 'gestor.uc muda a probabilidade do risco aprovado');
select is(pg_temp.estado(:'r_uc_ct'), 'em_validacao_cg', 'mudar a probabilidade REABRE: aprovado → em_validacao_cg');
select is(pg_temp.historico(:'r_uc_ct', 'reabertura_nota'), 1, 'a reabertura fica registrada no histórico');
-- A partir do comando seguinte, a ficha reaberta está TRAVADA (em validação).
select throws_like(format($$update public.riscos set impacto = 5 where id = %L$$, :'r_uc_ct'),
                   'RADAR:%travad%', 'depois de reaberto, o risco fica travado em validação');

-- ----------------------------------------------------------------------------
-- 3. Trava: em validação, a ficha (risco, controles, tratamento, KRIs) não muda
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select throws_like(format($$update public.riscos set causas = 'mudança' where id = %L$$, :'r_uc_sct'),
                   'RADAR:%travad%', 'edição recusada em em_validacao_cg (risco)');
select throws_ok(format($$update public.riscos set causas = 'mudança' where id = %L$$, :'r_uc_sct'),
                 '55000', null, 'a trava usa o SQLSTATE 55000 (estado não permite)');
select throws_like(format($$delete from public.riscos where id = %L$$, :'r_uc_sct'),
                   'RADAR:%travad%', 'exclusão recusada em em_validacao_cg');
select throws_like(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                            values (%L, 'controle novo', 'evidência')$$, :'r_uc_sct'),
                   'RADAR:%travad%', 'incluir controle recusado em em_validacao_cg');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r_uc_sct'), '55000', null,
                 'reenviar um risco que já está em validação: estado não permite');

-- ----------------------------------------------------------------------------
-- 4. UC SEM CT: gr1 valida e o risco crítico vai direto para aprovado ("mesma chefia")
--    + ponto de atenção 4: dois titulares, só o primeiro valida
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('servidor.gr@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_ct'), '42501', null,
                 'servidor.gr (lotado na GR5, mas NÃO titular) não valida o risco da CT');

select pg_temp.entrar_como('gr1@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_uc_sct', 'Validado pelo GR.')), 'aprovado',
          'UC sem CT: gr1 valida e o risco crítico vai DIRETO para aprovado');
select is(pg_temp.historico(:'r_uc_sct', 'homologacao_diretoria'), 0,
          'não houve segundo passo de homologação');
select ok(exists(select 1 from public.historico_fluxo
                  where risco_id = :'r_uc_sct' and despacho_texto ilike '%validado e homologado pela mesma chefia%'),
          'o histórico registra "validado e homologado pela mesma chefia"');

select pg_temp.entrar_como('gr1.substituto@radar.test');
select throws_like(format($$select public.validar_risco(%L, 'ok')$$, :'r_uc_sct'),
                   'RADAR:%estado não permite%', 'o 2º titular da GR1 recebe "estado não permite"');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_uc_sct'), '55000', null,
                 '... com o SQLSTATE 55000');
select is(pg_temp.historico(:'r_uc_sct', 'validacao_cg'), 1, 'só UMA validação foi registrada');

-- O risco da CT: a chefia imediata (GR5) é também a homologadora → aprovado.
select pg_temp.entrar_como('gr@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_ct', 'ok')), 'aprovado',
          'gr (titular) valida o risco crítico da CT e, como também homologa, aprova');

-- ----------------------------------------------------------------------------
-- 5. Base Avançada: o titular da UC valida; gr1 homologa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.base@radar.test');
select is((select status_fluxo from public.enviar_para_validacao(:'r_base')), 'em_validacao_cg',
          'gestor.base envia o risco da Base');
select pg_temp.entrar_como('gr1@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_base'), '42501', null,
                 'gr1 NÃO valida o risco da Base (a chefia imediata é a UC)');
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_base', 'ok')), 'em_homologacao_dir',
          'o titular da UC (gestor.uc-sem-ct) valida o risco crítico da Base');
select throws_like(format($$update public.riscos set causas = 'x' where id = %L$$, :'r_base'),
                   'RADAR:%travad%', 'edição recusada em em_homologacao_dir');
select pg_temp.entrar_como('gr1@radar.test');
select is((select status_fluxo from public.homologar_risco(:'r_base', 'ok')), 'aprovado',
          'gr1 homologa o risco da Base');

-- ----------------------------------------------------------------------------
-- 6. Centro: diretor.dibio valida; risco NÃO crítico vai direto para aprovado
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('centro@radar.test');
select is((select is_critico from public.riscos where id = :'r_centro'), false,
          'o risco do Centro (P=2, I=2 → 5, Baixo) não é crítico');
select is((select status_fluxo from public.enviar_para_validacao(:'r_centro')), 'em_validacao_cg',
          'o Centro envia para validação');
select pg_temp.entrar_como('diretor.diman@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_centro'), '42501', null,
                 'diretor.diman NÃO valida o risco do Centro (é da DIBIO)');
select pg_temp.entrar_como('diretor.dibio@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_centro', 'ok')), 'aprovado',
          'diretor.dibio valida o risco do Centro → aprovado');

-- Outro risco não crítico: o da AUDIT, validado pela Presidência.
select pg_temp.entrar_como('auditor@radar.test');
select is((select status_fluxo from public.enviar_para_validacao(:'r_audit')), 'em_validacao_cg',
          'a AUDIT envia o próprio risco');
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_audit', 'ok')), 'aprovado',
          'risco NÃO crítico: a validação leva direto a aprovado');
select is(pg_temp.historico(:'r_audit', 'validacao_cg'), 1, 'a validação do risco não crítico fica no histórico');

-- ----------------------------------------------------------------------------
-- 7. Reabertura pelas tabelas filhas: KRI reabre; medição e status_execucao não
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cg.cgpro@radar.test');
select lives_ok($$insert into public.medicoes_kri (kri_id, valor_apurado)
                  values ('00000000-0000-4000-d000-000000000050', '0,4')$$,
                'cg.cgpro registra uma medição do KRI do risco aprovado');
select is(pg_temp.estado(:'r_cgpro'), 'aprovado', 'nova medição de KRI NÃO reabre o fluxo');
select is(pg_temp.linhas_afetadas($$update public.respostas_tratamento set status_execucao = 'em_andamento'
                                    where id = '00000000-0000-4000-e000-000000000050'$$),
          1, 'cg.cgpro atualiza o status_execucao da ação de tratamento');
select is(pg_temp.estado(:'r_cgpro'), 'aprovado', 'status_execucao NÃO reabre o fluxo');
select is(pg_temp.linhas_afetadas($$update public.indicadores_kri set meta_alvo = '0,5'
                                    where id = '00000000-0000-4000-d000-000000000050'$$),
          1, 'cg.cgpro muda a definição do KRI (meta)');
select is(pg_temp.estado(:'r_cgpro'), 'em_validacao_cg', 'mudar a definição do KRI REABRE o fluxo');
select is(pg_temp.historico(:'r_cgpro', 'reabertura_nota'), 1, 'a reabertura pelo KRI fica no histórico');
select throws_like($$update public.indicadores_kri set meta_alvo = '0,6'
                     where id = '00000000-0000-4000-d000-000000000050'$$,
                   'RADAR:%travad%', 'com o risco em validação, o KRI fica travado');
select throws_like($$update public.respostas_tratamento set acao_o_que = 'outra ação'
                     where id = '00000000-0000-4000-e000-000000000050'$$,
                   'RADAR:%travad%', 'com o risco em validação, o tratamento (fora o status) fica travado');
select lives_ok($$insert into public.medicoes_kri (kri_id, valor_apurado)
                  values ('00000000-0000-4000-d000-000000000050', '0,7')$$,
                'medição de KRI continua livre com o risco em validação');
select is(pg_temp.linhas_afetadas($$update public.respostas_tratamento set status_execucao = 'concluida'
                                    where id = '00000000-0000-4000-e000-000000000050'$$),
          1, 'status_execucao continua livre com o risco em validação');

-- ----------------------------------------------------------------------------
-- 8. COFIS: incluir 2 controles NUM SÓ comando reabre (sem travar o 2º);
--    cg.cgpro valida e diretor.diman homologa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('coord.cofis@radar.test');
select lives_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                         values (%L, 'controle A', 'evidência A'), (%L, 'controle B', 'evidência B')$$,
                       :'r_cofis', :'r_cofis'),
                'coord.cofis inclui 2 controles de uma vez no risco aprovado');
select is(pg_temp.estado(:'r_cofis'), 'em_validacao_cg', 'incluir controles REABRE o risco da COFIS');
select is(pg_temp.historico(:'r_cofis', 'reabertura_nota'), 1, 'uma só reabertura registrada para o comando');

select pg_temp.entrar_como('diretor.diman@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_cofis'), '42501', null,
                 'diretor.diman NÃO valida o risco da COFIS (a chefia imediata é a CGPRO)');
select pg_temp.entrar_como('cg.cgpro@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_cofis', 'ok')), 'em_homologacao_dir',
          'cg.cgpro valida o risco crítico da COFIS');
select pg_temp.entrar_como('diretor.diman@radar.test');
select is((select status_fluxo from public.homologar_risco(:'r_cofis', 'ok')), 'aprovado',
          'diretor.diman homologa o risco da COFIS');

-- ----------------------------------------------------------------------------
-- 8b. Excluir risco (decisão D2 da CGOV — ver docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md)
-- ----------------------------------------------------------------------------
-- Só se apaga risco em rascunho, devolvido ou preliminar_cgov. O risco
-- APROVADO faz parte do Plano de Gestão de Riscos: não se apaga (erro 55000);
-- se precisa mudar, a unidade EDITA a ficha (o que reabre o fluxo).
select pg_temp.entrar_como('coord.cofis@radar.test');
select throws_ok(format($$delete from public.riscos where id = %L$$, :'r_cofis'), '55000', null,
                 'D2: coord.cofis NÃO exclui o risco aprovado (55000)');
select throws_like(format($$delete from public.riscos where id = %L$$, :'r_cofis'),
                   'RADAR:%aprovado%', 'D2: a mensagem RADAR: explica que risco aprovado não se apaga');
-- A cascata não contorna a regra: apagar o OBJETO levaria o risco aprovado
-- (e o histórico dele) junto. O gatilho do risco roda também na cascata.
select throws_ok($$delete from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000006'$$,
                 '55000', null, 'D2: apagar o objeto de um risco aprovado também é recusado (cascata)');
select is(pg_temp.estado(:'r_cofis'), 'aprovado', 'D2: o risco aprovado continua lá');
-- Rascunho apaga normalmente.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000006', 'RADAR-T050-DEL', 2, 2);
select is(pg_temp.linhas_afetadas($$delete from public.riscos where codigo_radar = 'RADAR-T050-DEL'$$),
          1, 'D2: risco em rascunho pode ser apagado');

-- ----------------------------------------------------------------------------
-- 8c. Reabertura por troca de CATEGORIA ou de OBJETO (correção da revisão final)
-- ----------------------------------------------------------------------------
-- Trocar a categoria muda o apetite da DAR que vale para o risco: um risco
-- Médio "dentro do apetite" (categoria Operacional, moderado) pode virar
-- crítico numa categoria de apetite baixo (Legal). (Até a LAC-14 o exemplo
-- usava a categoria 1, Estratégico, que saiu do Quadro 2.) Isso precisa
-- voltar à validação — senão ficaria aprovado e crítico sem homologação.
select pg_temp.entrar_como('gestor.uc@radar.test');
-- P=3, I=2 → 8 (Médio); categoria 2 (Operacional, moderado) → não crítico.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T050-CAT', 3, 2, 2);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-CAT') as r_cat \gset
select is((select status_fluxo from public.enviar_para_validacao(:'r_cat')), 'em_validacao_cg',
          'risco Médio (não crítico) enviado');
select pg_temp.entrar_como('ct@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_cat', 'ok')), 'aprovado',
          'ct valida o risco não crítico → aprovado');
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set categoria_id = 4 where id = %L$$, :'r_cat')),
          1, 'gestor.uc troca a categoria do risco aprovado (para apetite baixo)');
select is(pg_temp.estado(:'r_cat'), 'em_validacao_cg', 'trocar a CATEGORIA reabre o risco aprovado');
select is((select is_critico from public.riscos where id = :'r_cat'), true,
          '... que agora está fora do apetite da DAR (crítico) e terá de subir à homologação');

-- Mover o risco para o objeto de outra unidade muda quem valida: também reabre.
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
-- P=2, I=2 → 5 (Baixo); categoria 2 → não crítico. Objeto 2 = FLONA do Tapajós.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000002', 'RADAR-T050-OBJ', 2, 2, 2);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-OBJ') as r_obj \gset
select is((select status_fluxo from public.enviar_para_validacao(:'r_obj')), 'em_validacao_cg',
          'risco da FLONA do Tapajós enviado');
select pg_temp.entrar_como('gr1@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_obj', 'ok')), 'aprovado',
          'gr1 valida → aprovado');
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set objeto_id = '00000000-0000-4000-b000-000000000003' where id = %L$$, :'r_obj')),
          1, 'gestor.uc-sem-ct move o risco aprovado para o objeto da BAV Belterra');
select is(pg_temp.estado(:'r_obj'), 'em_validacao_cg', 'trocar o OBJETO reabre o risco aprovado');
-- D1: quem reabriu (gestor.uc-sem-ct) é o titular da chefia da Base (a FLONA):
-- ele não valida a própria mudança; o degrau sobe para a GR1.
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_obj'), '42501', null,
                 'D1: quem reabriu e é titular da chefia (gestor.uc-sem-ct) NÃO valida');
select pg_temp.entrar_como('gr1@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_obj', 'ok')), 'aprovado',
          'D1: o nível seguinte (gr1) valida o risco reaberto');

-- ----------------------------------------------------------------------------
-- 8d. Segregação "sobe um nível" (decisão D1 da CGOV)
-- ----------------------------------------------------------------------------
-- Quem ENVIA não pode validar nem homologar o próprio risco. Se quem enviou é
-- o titular da chefia imediata (ou do homologador), o degrau SOBE para o
-- nível seguinte da árvore.
-- (a) gr@ cria e envia um risco crítico no SAT1-GR5 (Serviço interno da GR5).
--     Chefia imediata = GR5 (o próprio gr@) → sobe para a Presidência.
--     Homologador     = GR5 (o próprio gr@) → sobe para a Presidência.
--     Validador e homologador efetivos coincidem → "mesma chefia".
select pg_temp.sair();
select (select id from public.unidades where icmbio_id = '23.5008') as sat1_gr5,
       (select id from public.unidades where icmbio_id = '10.0038') as comet_pres \gset
select pg_temp.entrar_como('gr@radar.test');
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000051', 'Unidade', 'Teste 050 — SAT1-GR5', :'sat1_gr5', 'Objetivo de demonstração');
-- P=5, I=5 → 25 (Extremo) → crítico.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000051', 'RADAR-T050-SAT', 5, 5);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-SAT') as r_sat \gset
select is((select status_fluxo from public.enviar_para_validacao(:'r_sat')), 'em_validacao_cg',
          'D1 (a): gr envia o risco crítico do Serviço interno da GR5');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_sat'), '42501', null,
                 'D1 (a): gr NÃO valida o risco que ele mesmo enviou');
select throws_ok(format($$select public.devolver_risco(%L, 'motivo')$$, :'r_sat'), '42501', null,
                 'D1 (a): gr também NÃO devolve (devolver segue o validador efetivo)');
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_sat', 'Validado pela Presidência.')), 'aprovado',
          'D1 (a): a Presidência (nível seguinte) valida e homologa → aprovado');
select pg_temp.sair();
select is((select string_agg(h.acao || ' por ' || h.usuario_nome, '; ' order by h.sequencia)
             from public.historico_fluxo h where h.risco_id = :'r_sat'),
          'submetido por Gerente Fictício GR5; validado_e_homologado por Presidente Fictício',
          'D1 (a): o histórico mostra quem enviou (gr) e quem validou e homologou (presidente)');
select is((select p.email from public.historico_fluxo h join public.perfis_usuarios p on p.id = h.usuario_id
            where h.risco_id = :'r_sat' and h.etapa = 'submissao_1a_linha'),
          'gr@radar.test', 'D1: o histórico guarda o usuario_id de quem enviou');

-- (b) gestor.uc-sem-ct (titular da FLONA do Tapajós) envia um risco NÃO
--     crítico da BAV Belterra. A chefia da Base é a FLONA (ele mesmo) → sobe
--     para a GR1.
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000003', 'RADAR-T050-BAV', 2, 2, 2);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-BAV') as r_bav \gset
select is((select status_fluxo from public.enviar_para_validacao(:'r_bav')), 'em_validacao_cg',
          'D1 (b): gestor.uc-sem-ct envia o risco não crítico da Base');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_bav'), '42501', null,
                 'D1 (b): gestor.uc-sem-ct NÃO valida o risco que enviou');
select pg_temp.entrar_como('gr1@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_bav', 'ok')), 'aprovado',
          'D1 (b): gr1 (nível acima) valida → aprovado');

-- (c) Sem nível acima: presidente@ cria um risco no COMET (Setor interno da
--     Presidência). A chefia é a Presidência (ele mesmo); ANTES da B1.1 não
--     havia nada acima e o envio era recusado. Desde a P-B1-1 a chefia da
--     Presidência é o GABIN, então o D1 "sobe um nível" acha o titular do GABIN
--     para validar (a homologação de risco crítico continua sem ninguém acima).
select pg_temp.entrar_como('presidente@radar.test');
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000052', 'Unidade', 'Teste 050 — COMET', :'comet_pres', 'Objetivo de demonstração');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000052', 'RADAR-T050-COMET', 2, 2);
select is((select status_fluxo from public.enviar_para_validacao((select id from public.riscos where codigo_radar = 'RADAR-T050-COMET'))),
          'em_validacao_cg', 'D1 (c): o Presidente envia; sobe-se ao titular do GABIN (P-B1-1), que valida');

-- ----------------------------------------------------------------------------
-- 9. Risco crítico da CGOV: cgge valida e presidente homologa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_cgov'), '42501', null,
                 'cgov NÃO valida o próprio risco');
select pg_temp.entrar_como('cgge@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_cgov', 'ok')), 'em_homologacao_dir',
          'cgge valida o risco crítico da CGOV');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'r_cgov'), '42501', null,
                 'cgge NÃO homologa');
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.homologar_risco(:'r_cgov', 'ok')), 'aprovado',
          'presidente homologa o risco crítico da CGOV');

-- ----------------------------------------------------------------------------
-- 10. pendente_dar sobe para homologação; devolução com e sem motivo
-- ----------------------------------------------------------------------------
-- Desde a LAC-14 (2026-11-22) a semente TEM categorias sem apetite na DAR:
-- 9, 10 e 11 (as que entraram com o Quadro 2) nascem 'pendente_dar'. Usamos
-- a 9 (Riscos da visitação); antes o teste mudava a categoria 2 para isso.
select pg_temp.entrar_como('gestor.uc@radar.test');
-- P=3, I=2 → 8 (Médio). Com a categoria sem apetite definido → pendente_dar.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T050-PEND', 3, 2, 9);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-PEND') as r_pend \gset
select is((select status_critico from public.riscos where id = :'r_pend'), 'pendente_dar',
          'residual Médio em categoria sem apetite na DAR → pendente_dar');
select is((select status_fluxo from public.enviar_para_validacao(:'r_pend')), 'em_validacao_cg',
          'gestor.uc envia o risco pendente_dar');
select pg_temp.entrar_como('ct@radar.test');
select throws_ok(format($$select public.devolver_risco(%L, '   ')$$, :'r_pend'), '22023', null,
                 'devolver sem motivo (só espaços) é recusado');
select throws_ok(format($$select public.devolver_risco(%L, null)$$, :'r_pend'), '22023', null,
                 'devolver com motivo nulo é recusado');
select is((select status_fluxo from public.validar_risco(:'r_pend', 'ok')), 'em_homologacao_dir',
          'pendente_dar SOBE para homologação (não vai direto a aprovado)');
select pg_temp.entrar_como('ct@radar.test');
select throws_ok(format($$select public.devolver_risco(%L, 'motivo')$$, :'r_pend'), '42501', null,
                 'em homologação, a ct (que só valida) não devolve');
select pg_temp.entrar_como('gr@radar.test');
select is((select status_fluxo from public.devolver_risco(:'r_pend', 'Justificar melhor o impacto.')), 'devolvido',
          'gr devolve com motivo: em_homologacao_dir → devolvido');
select is((select despacho_texto from public.historico_fluxo
            where risco_id = :'r_pend' and etapa = 'devolucao_ajuste'), 'Justificar melhor o impacto.',
          'o motivo da devolução fica no histórico');
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set justificativa_impacto = 'revista' where id = %L$$, :'r_pend')),
          1, 'devolvido não está travado: gestor.uc corrige a ficha');
select is((select status_fluxo from public.enviar_para_validacao(:'r_pend')), 'em_validacao_cg',
          'gestor.uc reenvia o risco devolvido');

-- ----------------------------------------------------------------------------
-- 10b. A DAR muda DEPOIS do envio (correção da rodada 1)
-- ----------------------------------------------------------------------------
-- O risco foi enviado dentro do apetite (não crítico). Enquanto está em
-- validação, a CGOV registra apetite 'baixo' para a categoria. A validação
-- precisa decidir com a criticidade ATUAL: agora o risco é crítico e sobe
-- para homologação (não pode ser aprovado sem o 3º degrau).
select pg_temp.entrar_como('gestor.uc@radar.test');
-- P=3, I=2 → 8 (Médio); categoria 2 (Operacional) tem apetite 'moderado' → não crítico.
-- (Antes era a 8, Tecnologia da Informação, que saiu do Quadro 2 na LAC-14.)
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T050-DAR', 3, 2, 2);
select (select id from public.riscos where codigo_radar = 'RADAR-T050-DAR') as r_dar \gset
select is((select status_fluxo from public.enviar_para_validacao(:'r_dar')), 'em_validacao_cg',
          'risco Médio dentro do apetite enviado para validação');
select pg_temp.sair();
update public.categorias_risco set apetite_declarado = 'baixo' where id = 2;
select pg_temp.entrar_como('ct@radar.test');
select is((select status_fluxo from public.validar_risco(:'r_dar', 'ok')), 'em_homologacao_dir',
          'apetite mudou depois do envio: a validação usa a criticidade ATUAL e sobe para homologação');
select is((select is_critico from public.riscos where id = :'r_dar'), true,
          'o risco agora está fora do apetite da DAR (crítico)');
select ok(exists(select 1 from public.historico_fluxo
                  where risco_id = :'r_dar' and etapa = 'validacao_cg'
                    and despacho_texto ilike '%encaminhado para homologação%'
                    and despacho_texto not ilike '%não exige homologação%'),
          'o histórico registra o encaminhamento à homologação (decisão real)');

-- ----------------------------------------------------------------------------
-- 11. Preliminar da CGOV: a cgov cria, a unidade assume, a cgov não edita mais
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T050-PRE', 2, 2, 2, 'preliminar_cgov');
select (select id from public.riscos where codigo_radar = 'RADAR-T050-PRE') as r_pre \gset
select is(pg_temp.linhas_afetadas($$update public.riscos set causas = 'revista pela CGOV' where codigo_radar = 'RADAR-T050-PRE'$$),
          1, 'cgov edita o preliminar que criou');
select throws_ok(format($$select public.assumir_risco_preliminar(%L)$$, :'r_pre'), '42501', null,
                 'cgov NÃO assume o preliminar pela unidade');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r_pre'), '42501', null,
                 'cgov NÃO envia o preliminar para validação');
select pg_temp.entrar_como('gr@radar.test');
select throws_ok(format($$select public.assumir_risco_preliminar(%L)$$, :'r_pre'), '42501', null,
                 'gr (chefia acima) NÃO assume o preliminar da UC');
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r_pre'), '55000', null,
                 'preliminar não vai direto para validação: estado não permite (precisa assumir)');
select is((select status_fluxo from public.assumir_risco_preliminar(:'r_pre')), 'rascunho',
          'gestor.uc assume o preliminar: preliminar_cgov → rascunho');
select is(pg_temp.historico(:'r_pre', 'assuncao_preliminar'), 1, 'a assunção fica no histórico');
select throws_ok(format($$select public.assumir_risco_preliminar(%L)$$, :'r_pre'), '55000', null,
                 'assumir de novo: estado não permite');
select pg_temp.entrar_como('cgov@radar.test');
select is(pg_temp.linhas_afetadas($$update public.riscos set causas = 'nova revisão da CGOV' where codigo_radar = 'RADAR-T050-PRE'$$),
          0, 'depois de assumido, a cgov NÃO edita mais o risco');

-- ----------------------------------------------------------------------------
-- 12. Presidência: desde a B1.1 (P-B1-1) quem valida é o titular do GABIN
--     (antes, sem chefia imediata, o envio era recusado — R18). O fluxo
--     completo da Presidência é testado em 070_fluxo_presidencia.test.sql.
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('presidente@radar.test');
select is((select status_fluxo from public.enviar_para_validacao((select id from public.riscos where codigo_radar = 'RADAR-T050-PRES'))),
          'em_validacao_cg', 'risco da própria Presidência: o envio agora tem quem valide (o titular do GABIN)');

-- ----------------------------------------------------------------------------
-- 13. anon não executa as funções; ninguém chama o "atalho" interno
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como_anonimo();
select throws_ok(format($$select public.assumir_risco_preliminar(%L)$$, :'r_pre'), '42501', null, 'anon NÃO executa assumir_risco_preliminar');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r_pre'), '42501', null, 'anon NÃO executa enviar_para_validacao');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r_pre'), '42501', null, 'anon NÃO executa validar_risco');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'r_pre'), '42501', null, 'anon NÃO executa homologar_risco');
select throws_ok(format($$select public.devolver_risco(%L, 'motivo')$$, :'r_pre'), '42501', null, 'anon NÃO executa devolver_risco');

select pg_temp.sair();
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('fn_fluxo_mudar_estado', 'fn_fluxo_registrar_historico', 'fn_fluxo_aplicar_trava',
                        -- funções da segregação "sobe um nível" (D1)
                        'fn_fluxo_titular_da_unidade', 'fn_fluxo_quem_enviou', 'fn_fluxo_validador_efetivo',
                        'fn_fluxo_homologador_efetivo', 'fn_fluxo_exigir_validador_na_reabertura')
      and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
           or has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0, 'as funções internas do fluxo (mudar estado sem checar permissão) não são executáveis por ninguém logado');
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('assumir_risco_preliminar', 'enviar_para_validacao', 'validar_risco',
                        'homologar_risco', 'devolver_risco')
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and array_to_string(p.proconfig, ',') like '%search_path=""%'),
  5, 'as 5 RPCs são SECURITY DEFINER, com search_path vazio, executáveis por authenticated');

select * from finish();
rollback;
