-- ============================================================================
-- TESTE DA TRILHA DE AUDITORIA (pgTAP) — Etapa B1, Tarefa 8
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A trilha (`auditoria_log`) é o "caderno de ocorrências" do RADAR: toda vez
-- que alguém cria, altera ou apaga um objeto, risco, controle, tratamento, KRI
-- ou medição, um GATILHO anota quem fez, quando, e como o registro era antes
-- e ficou depois. Ninguém escreve nesse caderno à mão: só o gatilho.
--
-- O que conferimos:
--   1. a estrutura (colunas, RLS ligada, gatilhos nas 8 tabelas: as 6 do
--      risco + perfis_usuarios e categorias_risco);
--   2. um UPDATE do gestor da FLONA gera 1 linha com o objeto_id certo;
--   3. INSERT/DELETE e a descoberta do objeto_id via risco e via KRI;
--   4. quem lê o quê: o gestor da UC lê só a trilha dos SEUS objetos; a CGOV
--      lê tudo (inclusive linhas sem objeto); quem tem alcance total lê o resto;
--   5. ninguém grava direto na trilha;
--   6. as funções do fluxo (enviar, validar...) também deixam rastro;
--   7. a troca de perfil/titularidade e a mudança da DAR ficam na trilha
--      (matriz de acesso, seção 5: "o registro da troca fica na trilha").
--
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(47);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT')  as r_uc_ct,   -- rascunho, FLONA de Caçador
  (select objeto_id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT')  as o_uc_ct,
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as r_uc_sct,  -- FLONA do Tapajós
  (select objeto_id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as o_uc_sct,
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CT')     as r_ct,      -- em_validacao_cg, CT Curitiba
  (select id from auth.users where email = 'gestor.uc@radar.test') as u_gestor_uc
\gset

-- ----------------------------------------------------------------------------
-- 1. Estrutura
-- ----------------------------------------------------------------------------
select has_column('public', 'auditoria_log', 'objeto_id',         'auditoria_log tem objeto_id');
select has_column('public', 'auditoria_log', 'usuario_id',        'auditoria_log tem usuario_id (auth.uid())');
select has_column('public', 'auditoria_log', 'dados_anteriores',  'auditoria_log tem dados_anteriores');
select is((select relrowsecurity from pg_class where oid = 'public.auditoria_log'::regclass), true,
          'RLS ligada em auditoria_log');
select is((select count(*)::int from pg_trigger
            where tgname like 'trg_auditoria_%' and not tgisinternal), 8,
          'oito gatilhos de auditoria (um por tabela, inclusive perfis e DAR)');
select is((select prosecdef from pg_proc where oid = 'public.fn_registrar_auditoria()'::regprocedure), true,
          'fn_registrar_auditoria é SECURITY DEFINER');
select is(has_function_privilege('authenticated', 'public.fn_registrar_auditoria()', 'EXECUTE'), false,
          'authenticated não executa a função do gatilho diretamente');
select is(has_table_privilege('authenticated', 'public.auditoria_log', 'INSERT')
       or has_table_privilege('authenticated', 'public.auditoria_log', 'UPDATE')
       or has_table_privilege('authenticated', 'public.auditoria_log', 'DELETE')
       or has_table_privilege('anon', 'public.auditoria_log', 'INSERT'), false,
          'anon/authenticated não têm INSERT/UPDATE/DELETE na trilha');

-- ----------------------------------------------------------------------------
-- 2. UPDATE do gestor da FLONA de Caçador
-- ----------------------------------------------------------------------------
select count(*)::int as antes_uc_ct from public.auditoria_log where registro_id = :'r_uc_ct' \gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa auditada' where id = %L$$, :'r_uc_ct')),
          1, 'gestor.uc altera o risco da própria FLONA');
select pg_temp.sair();

select is((select count(*)::int from public.auditoria_log where registro_id = :'r_uc_ct') - :antes_uc_ct, 1,
          'o UPDATE gerou exatamente 1 linha na trilha');
-- Sem depender de ordem: dentro de uma transação now() é constante e os ids são
-- aleatórios, então "a última linha" não é bem definida. Filtramos pelo conteúdo.
select is((select count(*)::int from public.auditoria_log
            where registro_id = :'r_uc_ct' and operacao = 'UPDATE'
              and dados_novos->>'causas' = 'causa auditada'), 1,
          'existe 1 linha de UPDATE com o valor novo das causas');
select is((select objeto_id from public.auditoria_log
            where registro_id = :'r_uc_ct' and operacao = 'UPDATE'
              and dados_novos->>'causas' = 'causa auditada'), :'o_uc_ct'::uuid,
          'a linha guarda o objeto_id do risco');
select is((select operacao || '/' || tabela_afetada || '/' || usuario_id::text from public.auditoria_log
            where registro_id = :'r_uc_ct' and dados_novos->>'causas' = 'causa auditada'),
          'UPDATE/riscos/' || :'u_gestor_uc', 'operação, tabela e usuário (auth.uid) corretos');
select ok((select dados_anteriores->>'causas' from public.auditoria_log
            where registro_id = :'r_uc_ct' and dados_novos->>'causas' = 'causa auditada') is distinct from 'causa auditada',
          'dados_anteriores guarda o valor ANTES (diferente do novo)');

-- ----------------------------------------------------------------------------
-- 3. objeto_id descoberto em cada tabela (INSERT/UPDATE/DELETE)
-- ----------------------------------------------------------------------------
-- Como administrador, mexemos no risco rascunho (não dispara reabertura).
update public.objetos_contexto set nome_objeto = nome_objeto || ' (rev)' where id = :'o_uc_ct';
select is((select objeto_id from public.auditoria_log
            where registro_id = :'o_uc_ct' and tabela_afetada = 'objetos_contexto' limit 1), :'o_uc_ct'::uuid,
          'objetos_contexto: objeto_id é o próprio id');

insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
values ('00000000-0000-4000-c000-000000000060', :'r_uc_ct', 'Controle de teste 060', 'Sem evidência');
select is((select objeto_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-c000-000000000060' and operacao = 'INSERT'), :'o_uc_ct'::uuid,
          'controles_existentes: objeto_id vem do risco (INSERT)');

insert into public.respostas_tratamento (id, risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
values ('00000000-0000-4000-e000-000000000060', :'r_uc_ct', 'Mitigar', 'Ação 060', 'Gestor', '2026-12-31', 'Como 060');
select is((select objeto_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-e000-000000000060' and operacao = 'INSERT'), :'o_uc_ct'::uuid,
          'respostas_tratamento: objeto_id vem do risco');

insert into public.indicadores_kri (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo, limite_alerta, responsavel_medicao)
values ('00000000-0000-4000-d000-000000000060', :'r_uc_ct', 'KRI 060', 'a / b', 'Planilha', 'Mensal', '0', '1', 'Gestor');
select is((select objeto_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-d000-000000000060' and operacao = 'INSERT'), :'o_uc_ct'::uuid,
          'indicadores_kri: objeto_id vem do risco');

insert into public.medicoes_kri (id, kri_id, valor_apurado)
values ('00000000-0000-4000-f000-000000000060', '00000000-0000-4000-d000-000000000060', '3');
select is((select objeto_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-f000-000000000060' and operacao = 'INSERT'), :'o_uc_ct'::uuid,
          'medicoes_kri: objeto_id vem do KRI e depois do risco');

delete from public.medicoes_kri where id = '00000000-0000-4000-f000-000000000060';
select is((select objeto_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-f000-000000000060' and operacao = 'DELETE'), :'o_uc_ct'::uuid,
          'DELETE: objeto_id calculado a partir do OLD');
select is((select dados_anteriores->>'valor_apurado' from public.auditoria_log
            where registro_id = '00000000-0000-4000-f000-000000000060' and operacao = 'DELETE'), '3',
          'DELETE guarda o registro apagado em dados_anteriores');
select is((select dados_novos from public.auditoria_log
            where registro_id = '00000000-0000-4000-f000-000000000060' and operacao = 'DELETE'), null,
          'DELETE não tem dados_novos');
select is((select usuario_id from public.auditoria_log
            where registro_id = '00000000-0000-4000-f000-000000000060' and operacao = 'DELETE'), null,
          'alteração direta pelo administrador grava usuario_id nulo (sem auth.uid)');

-- DELETE em cascata: apagar o risco leva junto o KRI. Nada pode quebrar.
-- A linha do KRI pode ficar sem objeto_id (o risco pai já não existe).
select lives_ok(format($$delete from public.riscos where id = %L$$, :'r_uc_ct'),
                'DELETE em cascata do risco não é quebrado pela auditoria');
select is((select objeto_id from public.auditoria_log
            where registro_id = :'r_uc_ct' and operacao = 'DELETE'), :'o_uc_ct'::uuid,
          'DELETE do risco: objeto_id vem do OLD');
select is((select count(*)::int from public.auditoria_log
            where registro_id = '00000000-0000-4000-d000-000000000060' and operacao = 'DELETE'), 1,
          'a exclusão em cascata do KRI também foi registrada');

-- ----------------------------------------------------------------------------
-- 4. Quem lê o quê
-- ----------------------------------------------------------------------------
select count(*)::int as total_trilha from public.auditoria_log \gset
select count(*)::int as total_nulos from public.auditoria_log where objeto_id is null \gset
-- Garante que os testes de "linhas sem objeto" abaixo NÃO passem vazios
-- (contar 0 = 0 não provaria nada). Há linhas sem objeto: o KRI apagado em
-- cascata acima e os perfis da semente (trilha de perfis_usuarios).
select ok(:total_nulos > 0, 'há linhas sem objeto na trilha (os testes abaixo não passam vazios)');

select pg_temp.entrar_como('gestor.uc@radar.test');
select ok((select count(*) from public.auditoria_log) > 0, 'gestor.uc lê a trilha dos seus objetos');
select is((select count(*)::int from public.auditoria_log where objeto_id is distinct from :'o_uc_ct'::uuid), 0,
          'gestor.uc NÃO lê trilha de outros objetos nem linhas sem objeto');
select pg_temp.sair();

select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is((select count(*)::int from public.auditoria_log where objeto_id = :'o_uc_ct'::uuid), 0,
          'gestor de outra UC não lê a trilha da FLONA de Caçador');
select pg_temp.sair();

select pg_temp.entrar_como('cgov@radar.test');
select is((select count(*)::int from public.auditoria_log), :total_trilha, 'cgov lê a trilha inteira');
select is((select count(*)::int from public.auditoria_log where objeto_id is null), :total_nulos,
          'cgov lê também as linhas sem objeto');
select pg_temp.sair();

select pg_temp.entrar_como('gabin@radar.test');
select is((select count(*)::int from public.auditoria_log where objeto_id = :'o_uc_ct'::uuid) > 0, true,
          'perfil de alcance total lê a trilha de qualquer objeto');
select pg_temp.sair();

select pg_temp.entrar_como('gabin@radar.test');
select is((select count(*)::int from public.auditoria_log where objeto_id is null), 0,
          'perfil de alcance total NÃO lê linhas sem objeto (só a cgov)');
select pg_temp.sair();

select pg_temp.entrar_como_anonimo();
select throws_ok($$select count(*) from public.auditoria_log$$, '42501', null, 'visitante sem login não lê a trilha');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 5. Ninguém grava direto na trilha
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$insert into public.auditoria_log (tabela_afetada, registro_id, operacao) values ('riscos', %L, 'INSERT')$$, :'r_ct'),
                 '42501', null, 'nem a cgov insere direto na trilha');
select throws_ok($$update public.auditoria_log set operacao = 'X'$$, '42501', null, 'nem a cgov altera a trilha');
select throws_ok($$delete from public.auditoria_log$$, '42501', null, 'nem a cgov apaga da trilha');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 6. As funções do fluxo também deixam rastro
-- ----------------------------------------------------------------------------
-- validar_risco faz um UPDATE "para o mesmo estado" (recalcula a criticidade)
-- ANTES da troca real. Por isso ela deixa 2 linhas de UPDATE em vez de 1.
-- É esperado e aceitável: a trilha registra tudo o que passou pela tabela.
select count(*)::int as antes_ct from public.auditoria_log where registro_id = :'r_ct' \gset
select pg_temp.entrar_como('gr@radar.test');
select lives_ok(format($$select public.validar_risco(%L, 'Validado no teste 060')$$, :'r_ct'), 'gr@ valida o risco da CT');
select pg_temp.sair();
select ok((select count(*) from public.auditoria_log where registro_id = :'r_ct') - :antes_ct >= 1,
          'validar_risco deixou rastro na trilha');
-- Sem depender de ordem: existe uma linha que TROCOU o estado (antes em_validacao_cg, depois outro).
select ok(exists(select 1 from public.auditoria_log
                  where registro_id = :'r_ct' and operacao = 'UPDATE'
                    and dados_anteriores->>'status_fluxo' = 'em_validacao_cg'
                    and dados_novos->>'status_fluxo' <> 'em_validacao_cg'),
          'alguma linha da trilha mostra a troca de estado do risco');

-- ----------------------------------------------------------------------------
-- 7. Troca de perfil/titularidade e mudança da DAR ficam na trilha
-- ----------------------------------------------------------------------------
-- `titular_chefia` decide QUEM valida e homologa. Se a CGOV troca o titular,
-- isso precisa ficar registrado (matriz de acesso, seção 5). O mesmo vale
-- para o apetite da DAR (categorias_risco), que decide o que é "crítico".
-- Essas linhas não pertencem a um objeto: objeto_id fica NULO e só a CGOV lê.
select (select id from auth.users where email = 'cgov@radar.test') as u_cgov,
       (select id from auth.users where email = 'servidor.gr@radar.test') as u_servidor_gr \gset
select pg_temp.entrar_como('cgov@radar.test');
select is(pg_temp.linhas_afetadas($$update public.perfis_usuarios set titular_chefia = true
                                     where email = 'servidor.gr@radar.test'$$),
          1, 'cgov torna servidor.gr titular (substituto em exercício)');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 1$$),
          1, 'cgov muda o apetite da categoria Estratégico na DAR');
select pg_temp.sair();

select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'perfis_usuarios' and operacao = 'UPDATE'
              and registro_id = :'u_servidor_gr'
              and dados_anteriores->>'titular_chefia' = 'false'
              and dados_novos->>'titular_chefia' = 'true'
              and usuario_id = :'u_cgov'
              and objeto_id is null), 1,
          'a troca de titularidade fica na trilha (antes/depois, quem fez, sem objeto)');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'categorias_risco' and operacao = 'UPDATE'
              and dados_novos->>'id' = '1'
              and dados_anteriores->>'apetite_declarado' = 'moderado'
              and dados_novos->>'apetite_declarado' = 'baixo'
              and usuario_id = :'u_cgov'
              and objeto_id is null), 1,
          'a mudança da DAR fica na trilha (antes/depois, quem fez, sem objeto)');

select pg_temp.entrar_como('gabin@radar.test');
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada in ('perfis_usuarios', 'categorias_risco')), 0,
          'perfil de alcance total NÃO lê a trilha de perfis e da DAR (só a cgov)');
select pg_temp.entrar_como('cgov@radar.test');
select ok((select count(*) from public.auditoria_log
            where tabela_afetada in ('perfis_usuarios', 'categorias_risco')) >= 2,
          'a cgov lê a trilha de perfis e da DAR');
select pg_temp.sair();

select * from finish();
rollback;
