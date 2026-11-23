-- ============================================================================
-- TESTE DA LAC-03 (pgTAP) — travas de linha nos gatilhos da ligação do KRI
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A migração 20261123001 (triagem do CodeRabbit na PR #17) acrescenta TRAVAS
-- DE LINHA aos gatilhos da ligação KRI ↔ risco (kri_riscos), para que duas
-- pessoas gravando AO MESMO TEMPO não deixem o banco num estado proibido:
--   a) ligar um KRI a um risco enquanto outra pessoa muda um deles de objeto
--      (o grupo "KRI + riscos" sairia de objetos diferentes);
--   b) duas pessoas desligando, ao mesmo tempo, as DUAS últimas ligações de
--      um KRI (o KRI ficaria sem ligação nenhuma, com as medições, e não
--      seria apagado).
--
-- LIMITE DO pgTAP: um teste pgTAP roda numa sessão só, dentro de uma
-- transação; ele não consegue abrir uma SEGUNDA sessão para provocar a
-- corrida de verdade. Por isso a prova tem duas partes:
--   1) LEITURA DA DEFINIÇÃO: o corpo de cada função (sem os comentários, para
--      que um "-- FOR SHARE" comentado não conte) tem a trava, e na ORDEM
--      certa (KRI antes do risco; trava antes de ler o objeto ou contar as
--      ligações);
--   2) COMPORTAMENTO SEQUENCIAL: as mesmas regras de antes continuam valendo
--      (ligação entre objetos recusada, órfão apagado só na última ligação,
--      KRI ligado não muda de objeto).
-- Objetos (semente): A = ...b000-000000000001 (FLONA de Caçador) e
-- B = ...b000-000000000004 (CT Curitiba).
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(18);

-- ----------------------------------------------------------------------------
-- 0. Ajudantes
-- ----------------------------------------------------------------------------
-- sem_comentarios(função): o corpo da função sem os comentários de linha.
create or replace function pg_temp.sem_comentarios(p_funcao regprocedure)
returns text
language sql
as $$
  select regexp_replace(pg_get_functiondef(p_funcao), '--[^\n]*', '', 'g');
$$;

-- posicao(texto, trecho): onde o trecho aparece pela 1ª vez (0 = não aparece).
create or replace function pg_temp.posicao(p_texto text, p_trecho text)
returns int
language sql
as $$
  select strpos(p_texto, p_trecho);
$$;

-- inserir_risco(código, objeto): risco Baixo em rascunho (não crítico).
create or replace function pg_temp.inserir_risco(p_codigo text, p_objeto uuid)
returns uuid
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual,
     status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração',
          'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
          2, 1, 1, 0, 'Baixo', 0, 'Baixo', 'rascunho')
  returning id;
$$;

-- inserir_kri(nome, objeto): KRI do objeto, ainda sem ligação.
create or replace function pg_temp.inserir_kri(p_nome text, p_objeto uuid)
returns uuid
language sql
as $$
  insert into public.indicadores_kri (objeto_id, nome_indicador)
  values (p_objeto, p_nome)
  returning id;
$$;

select '00000000-0000-4000-b000-000000000001'::uuid as obj_a,
       '00000000-0000-4000-b000-000000000004'::uuid as obj_b
\gset

select pg_temp.sem_comentarios('public.fn_kri_riscos_mesmo_objeto()') as corpo_liga,
       pg_temp.sem_comentarios('public.fn_kri_grupo_mesmo_objeto()')  as corpo_grupo,
       pg_temp.sem_comentarios('public.fn_kri_riscos_apaga_orfao()')  as corpo_orfao
\gset

-- ----------------------------------------------------------------------------
-- 1. A própria procura: um "-- FOR SHARE" comentado não conta
-- ----------------------------------------------------------------------------
select is(pg_temp.posicao(regexp_replace(E'x\n-- FOR SHARE\ny', '--[^\n]*', '', 'g'), 'FOR SHARE'), 0,
          '1. o texto comentado sai antes da procura');

-- ----------------------------------------------------------------------------
-- 2. Ligar (fn_kri_riscos_mesmo_objeto): trava o KRI (FOR SHARE), DEPOIS o
--    risco (FOR NO KEY UPDATE), e só
--    então compara os objetos
-- ----------------------------------------------------------------------------
-- Cada trava é um comando só ("SELECT ... FROM <tabela> ... FOR SHARE;"),
-- então "[^;]*" não atravessa para outro comando.
select ok(:'corpo_liga' ~ 'FROM public\.indicadores_kri AS k[^;]*FOR SHARE;',
          '2. a leitura do objeto do KRI trava a linha do KRI (FOR SHARE)');
-- Risco com FOR NO KEY UPDATE (não FOR SHARE): o gatilho de reabertura, logo
-- depois, pede FOR UPDATE no mesmo risco; com FOR SHARE, duas ligações
-- simultâneas ao mesmo risco travariam uma à outra ao subir a trava.
select ok(:'corpo_liga' ~ 'FROM public\.riscos +AS r[^;]*FOR NO KEY UPDATE;',
          '2. a leitura do objeto do risco trava a linha do risco (FOR NO KEY UPDATE)');
select is((select count(*)::int from regexp_matches(:'corpo_liga', 'FOR SHARE', 'g')), 1,
          '2. só o KRI usa FOR SHARE (o risco não)');
select ok(pg_temp.posicao(:'corpo_liga', 'public.indicadores_kri') < pg_temp.posicao(:'corpo_liga', 'public.riscos'),
          '2. ordem das travas: KRI ANTES do risco (evita impasse entre duas gravações)');
select ok(pg_temp.posicao(:'corpo_liga', 'FOR SHARE') > 0
          and pg_temp.posicao(:'corpo_liga', 'FOR SHARE') < pg_temp.posicao(:'corpo_liga', 'public.riscos'),
          '2. o KRI já está travado quando o risco é lido');
select ok(pg_temp.posicao(:'corpo_liga', 'IS DISTINCT FROM') >
          pg_temp.posicao(:'corpo_liga', 'public.riscos'),
          '2. a comparação dos objetos vem depois das duas leituras travadas');

-- ----------------------------------------------------------------------------
-- 3. Mudar de objeto (fn_kri_grupo_mesmo_objeto)
-- ----------------------------------------------------------------------------
-- O próprio UPDATE já trava a linha que muda de objeto. Quando é o KRI que
-- muda, os riscos ligados a ele também ficam travados (KRI → risco, a mesma
-- ordem de cima). Quando é o risco que muda, o KRI NÃO é travado aqui (seria
-- risco → KRI, a ordem invertida): basta a trava do próprio UPDATE no risco,
-- porque toda ligação nova trava o risco (FOR NO KEY UPDATE) antes de ler o objeto.
select ok(:'corpo_grupo' ~ 'FROM public\.riscos AS r[^;]*kri_id = NEW\.id[^;]*FOR SHARE;',
          '3. KRI mudando de objeto: os riscos ligados ficam travados (FOR SHARE)');
select ok(pg_temp.posicao(:'corpo_grupo', 'FOR SHARE') > 0
          and pg_temp.posicao(:'corpo_grupo', 'FOR SHARE') < pg_temp.posicao(:'corpo_grupo', 'r.objeto_id IS DISTINCT FROM NEW.objeto_id'),
          '3. a trava vem antes de comparar o objeto dos riscos');
select is((select count(*)::int from regexp_matches(:'corpo_grupo', 'FOR SHARE', 'g')), 1,
          '3. o KRI não é travado depois do risco (só uma trava, no ramo do KRI)');

-- ----------------------------------------------------------------------------
-- 4. Órfão (fn_kri_riscos_apaga_orfao): trava o KRI (FOR UPDATE) antes de
--    contar as ligações que sobraram
-- ----------------------------------------------------------------------------
select ok(:'corpo_orfao' ~ 'FROM public\.indicadores_kri AS k[^;]*OLD\.kri_id[^;]*FOR UPDATE;',
          '4. a linha do KRI é travada (FOR UPDATE)');
select ok(pg_temp.posicao(:'corpo_orfao', 'FOR UPDATE') > 0
          and pg_temp.posicao(:'corpo_orfao', 'FOR UPDATE') < pg_temp.posicao(:'corpo_orfao', 'DELETE FROM'),
          '4. a trava vem antes de contar as ligações e apagar o órfão');

-- ----------------------------------------------------------------------------
-- 5. Comportamento sequencial: as regras de antes continuam valendo
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('T111-A-1', :'obj_a') as r_a1,
       pg_temp.inserir_risco('T111-A-2', :'obj_a') as r_a2,
       pg_temp.inserir_risco('T111-B-1', :'obj_b') as r_b1
\gset
select pg_temp.inserir_kri('T111 KRI do objeto A', :'obj_a') as k_a \gset
insert into public.kri_riscos (kri_id, risco_id) values (:'k_a', :'r_a1'), (:'k_a', :'r_a2');
insert into public.medicoes_kri (kri_id, valor_apurado) values (:'k_a', '3%');

select throws_ok(format($$insert into public.kri_riscos (kri_id, risco_id) values (%L, %L)$$, :'k_a', :'r_b1'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '5. ligar KRI do objeto A a risco do objeto B continua recusado (23514)');
select throws_ok(format($$update public.indicadores_kri set objeto_id = %L where id = %L$$, :'obj_b', :'k_a'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '5. KRI ligado não muda de objeto (23514)');
select throws_ok(format($$update public.riscos set objeto_id = %L where id = %L$$, :'obj_b', :'r_a1'),
                 '23514', 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.',
                 '5. risco ligado a KRI não muda de objeto (23514)');

delete from public.kri_riscos where kri_id = :'k_a' and risco_id = :'r_a1';
select is((select count(*)::int from public.indicadores_kri where id = :'k_a'), 1,
          '5. desligar a 1ª de duas ligações: o KRI fica (ainda serve a T111-A-2)');
delete from public.kri_riscos where kri_id = :'k_a' and risco_id = :'r_a2';
select is((select count(*)::int from public.indicadores_kri where id = :'k_a'), 0,
          '5. desligar a última ligação: o KRI órfão é apagado');
select is((select count(*)::int from public.medicoes_kri where kri_id = :'k_a'), 0,
          '5. as medições do KRI órfão vão junto (cascata)');

select * from finish();
rollback;
