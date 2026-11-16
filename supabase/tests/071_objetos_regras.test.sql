-- ============================================================================
-- TESTE DAS REGRAS DE OBJETOS (pgTAP) — Etapa B1.1, Tarefa 2
--   P-B1-2 unidade inativa | P-B1-3 processo inativo | P-B1-6 supervisor
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
--   P-B1-2: ninguém (nem a CGOV) cria objeto novo em unidade com ativa = false;
--           os objetos antigos continuam legíveis e a CGOV os reatribui a uma
--           unidade ativa.
--   P-B1-3: vínculo NOVO com processo só se o processo está ativo; objeto já
--           ligado a processo que ficou inativo continua editável, e o
--           Coordenador-Geral continua vendo o risco na visão por processo.
--   P-B1-6: com processo, o supervisor é preenchido pelo banco; sem processo,
--           só a CGOV mexe nele (os demais recebem erro `RADAR:`).
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(31);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.unidades where icmbio_id = '21.0078') as uc,       -- FLONA de Caçador
  (select id from public.unidades where icmbio_id = '26.0112') as base,     -- Base Belterra (objeto demo 3)
  (select id from public.unidades where icmbio_id = '10.2019') as cgpro,
  (select id from public.unidades where icmbio_id = '10.0007') as cgge
\gset

-- Dois processos fictícios: um ativo e outro inativo, ambos supervisionados pela CGPRO.
insert into public.processos_cadeia_valor (id, proc_id, nome, unidade_supervisora_id, ativo)
values ('00000000-0000-4000-c000-000000000071', 'T-071-ATIVO',   'Processo ativo (teste 071)',   :'cgpro', true),
       ('00000000-0000-4000-c000-000000000072', 'T-071-INATIVO', 'Processo inativo (teste 071)', :'cgpro', false);

-- A Base Avançada Belterra "deixa de existir" (unidade inativa); o objeto demo 3 é dela.
update public.unidades set ativa = false where id = :'base';

-- Objetos de apoio criados como administrador (auth.uid() nulo: o gatilho deixa passar,
-- como no importador e na semente).
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, processo_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000171', 'Processo', 'Teste 071 — objeto ligado ao processo',
        :'uc', '00000000-0000-4000-c000-000000000071', 'Objetivo de demonstração'),
       ('00000000-0000-4000-b000-000000000172', 'Unidade', 'Teste 071 — objeto sem processo',
        :'uc', null, 'Objetivo de demonstração');

-- ----------------------------------------------------------------------------
-- 1. P-B1-2 — unidade inativa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(
  format($q$insert into public.objetos_contexto (tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
            values ('Unidade', 'novo em unidade inativa', %L, 'x')$q$, :'base'),
  '55000', null, 'CGOV não cria objeto em unidade inativa');
select ok(not public.pode_criar_objeto_em(:'base'), 'pode_criar_objeto_em: false para unidade inativa');
select ok(public.pode_criar_objeto_em(:'uc'), 'pode_criar_objeto_em: continua true para a CGOV em unidade ativa');
select is((select count(*)::int from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000003'), 1,
          'objeto antigo em unidade inativa continua legível');
-- UPDATE direto da CGOV em objeto de unidade inativa: a RLS da B1 barra (0 linhas).
select is(pg_temp.linhas_afetadas(format(
  $q$update public.objetos_contexto set unidade_id = %L where id = '00000000-0000-4000-b000-000000000003'$q$, :'uc')),
  0, 'UPDATE direto da CGOV em objeto de unidade inativa continua barrado pela RLS');
-- Só pela função reatribuir_objeto.
select throws_ok(
  format($q$select public.reatribuir_objeto('00000000-0000-4000-b000-000000000172', %L)$q$, :'uc'),
  '55000', null, 'reatribuir_objeto recusa objeto que NÃO está em unidade inativa');
select throws_ok(
  format($q$select public.reatribuir_objeto('00000000-0000-4000-b000-000000000003', %L)$q$, :'base'),
  '55000', null, 'reatribuir_objeto recusa destino inativo');
select lives_ok(
  format($q$select public.reatribuir_objeto('00000000-0000-4000-b000-000000000003', %L)$q$, :'uc'),
  'CGOV reatribui o objeto de unidade inativa a uma unidade ativa (função)');
select is((select unidade_id from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000003'),
          :'uc'::uuid, 'o objeto passou para a unidade ativa');
select is((select nome_objeto from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000003'),
          'Demo — Base Avançada Belterra', 'só a unidade mudou (nome intacto)');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'objetos_contexto' and operacao = 'UPDATE'
              and registro_id = '00000000-0000-4000-b000-000000000003'
              and usuario_id = auth.uid()),
          1, 'a trilha registra a reatribuição com a CGOV como autora');
-- (como administrador, para o gatilho ser a única trava testada)
select pg_temp.sair();
select throws_ok(
  format($q$update public.objetos_contexto set unidade_id = %L where id = '00000000-0000-4000-b000-000000000172'$q$, :'base'),
  '55000', null, 'trocar PARA unidade inativa é recusado pelo gatilho');
-- Gestor não empurra o próprio objeto para outra unidade ativa (RLS da B1).
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($q$update public.objetos_contexto set unidade_id = %L where id = '00000000-0000-4000-b000-000000000172'$q$,
         (select id from public.unidades where icmbio_id = '21.0123')),
  '42501', null, 'gestor não move o próprio objeto para outra unidade ativa');
select throws_ok(
  format($q$select public.reatribuir_objeto('00000000-0000-4000-b000-000000000003', %L)$q$, :'uc'),
  '42501', null, 'quem não é da CGOV não chama reatribuir_objeto');

-- ----------------------------------------------------------------------------
-- 2. P-B1-3 e P-B1-6 — processo e supervisor (como gestor da UC)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(
  format($q$insert into public.objetos_contexto (tipo_objeto, nome_objeto, unidade_id, processo_id, objetivo_estrategico_associado)
            values ('Processo', 'vínculo inativo', %L, '00000000-0000-4000-c000-000000000072', 'x')$q$, :'uc'),
  '55000', null, 'INSERT com processo inativo é recusado');
select throws_ok(
  $q$update public.objetos_contexto set processo_id = '00000000-0000-4000-c000-000000000072'
      where id = '00000000-0000-4000-b000-000000000172'$q$,
  '55000', null, 'UPDATE que troca para processo inativo é recusado');

-- Com processo: o valor enviado pelo cliente é ignorado; vale o do processo.
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, processo_id,
                                     macroprocesso_supervisor_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000173', 'Processo', 'Teste 071 — supervisor forçado', :'uc',
        '00000000-0000-4000-c000-000000000071', :'cgge', 'x');
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000173'),
          :'cgpro'::uuid, 'com processo, o supervisor vem do processo (valor enviado é ignorado)');
select pg_temp.linhas_afetadas(format(
  $q$update public.objetos_contexto set macroprocesso_supervisor_id = %L
      where id = '00000000-0000-4000-b000-000000000173'$q$, :'cgge')) as _;
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000173'),
          :'cgpro'::uuid, 'UPDATE manual do supervisor não pega quando há processo');

-- Sem processo: gestor não preenche nem altera.
select throws_ok(
  format($q$insert into public.objetos_contexto (tipo_objeto, nome_objeto, unidade_id, macroprocesso_supervisor_id, objetivo_estrategico_associado)
            values ('Unidade', 'supervisor à mão', %L, %L, 'x')$q$, :'uc', :'cgge'),
  '42501', null, 'gestor não preenche supervisor em objeto sem processo (INSERT)');
select throws_ok(
  format($q$update public.objetos_contexto set macroprocesso_supervisor_id = %L
             where id = '00000000-0000-4000-b000-000000000172'$q$, :'cgge'),
  '42501', null, 'gestor não altera supervisor em objeto sem processo (UPDATE)');
select is(pg_temp.linhas_afetadas(
  $q$update public.objetos_contexto set nome_objeto = 'renomeado' where id = '00000000-0000-4000-b000-000000000172'$q$),
  1, 'gestor segue editando os outros campos do objeto sem processo');

-- ----------------------------------------------------------------------------
-- 3. CGOV pode preencher o supervisor quando não há processo
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok(
  format($q$insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, macroprocesso_supervisor_id, objetivo_estrategico_associado)
            values ('00000000-0000-4000-b000-000000000174', 'Unidade', 'CGOV preenche supervisor', %L, %L, 'x')$q$, :'uc', :'cgge'),
  'CGOV preenche o supervisor de objeto sem processo');
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000174'),
          :'cgge'::uuid, 'o supervisor da CGOV foi gravado');

-- ----------------------------------------------------------------------------
-- 4. Processo que ficou inativo depois do vínculo (histórico)
-- ----------------------------------------------------------------------------
select pg_temp.sair();
update public.processos_cadeia_valor set ativo = false where id = '00000000-0000-4000-c000-000000000071';
insert into public.riscos (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
                           objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
                           nivel_inerente, classificacao_inerente)
values ('RADAR-T071', '00000000-0000-4000-b000-000000000171', 'Fictício', 'c', 'e', 'q', 'o', 'd', 2, 2, 2, 0, 'Baixo');

select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(
  $q$update public.objetos_contexto set nome_objeto = 'histórico editado' where id = '00000000-0000-4000-b000-000000000171'$q$),
  1, 'objeto ligado a processo que ficou inativo continua editável (sem trocar o processo)');

select pg_temp.entrar_como('cg.cgpro@radar.test');
select is((select count(*)::int from public.objetos_contexto where id = '00000000-0000-4000-b000-000000000171'),
          1, 'o Coordenador-Geral continua lendo o objeto do processo inativo');
select is((select count(*)::int from public.riscos where codigo_radar = 'RADAR-T071'),
          1, 'e continua lendo o risco dele');

-- ----------------------------------------------------------------------------
-- 5. Supervisor do processo mudou / objeto saiu do processo
-- ----------------------------------------------------------------------------
select pg_temp.sair();
update public.processos_cadeia_valor set unidade_supervisora_id = :'cgge'
 where id = '00000000-0000-4000-c000-000000000071';
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000171'),
          :'cgge'::uuid, 'troca do supervisor do processo atualiza os objetos ligados');
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000173'),
          :'cgge'::uuid, '... inclusive o de outro gestor');
update public.objetos_contexto set processo_id = null where id = '00000000-0000-4000-b000-000000000173';
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000173'),
          null, 'objeto que sai do processo perde o supervisor herdado');

-- Cliente que desvincula o processo E manda o supervisor explicitamente nulo
-- (ex.: formulário que envia todos os campos): não pode dar 42501 para o gestor.
select pg_temp.sair();
-- (o processo 071 pode ter sido inativado acima; este é um processo ativo à parte)
insert into public.processos_cadeia_valor (id, proc_id, nome, unidade_supervisora_id, ativo)
values ('00000000-0000-4000-c000-000000000073', 'T-071-ATIVO-2', 'Processo ativo 2 (teste 071)', :'cgpro', true);
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, processo_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000175', 'Processo', 'Teste 071 — desvínculo com supervisor nulo',
        :'uc', '00000000-0000-4000-c000-000000000073', 'Objetivo de demonstração');
select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(
  $q$update public.objetos_contexto set processo_id = null, macroprocesso_supervisor_id = null
      where id = '00000000-0000-4000-b000-000000000175'$q$,
  'gestor desvincula o processo mandando o supervisor como nulo (sem 42501)');
select is((select macroprocesso_supervisor_id from public.objetos_contexto
            where id = '00000000-0000-4000-b000-000000000175'),
          null, '... e o supervisor herdado fica limpo');

select * from finish();
rollback;
