-- ============================================================================
-- TESTE DA LAC-08 (pgTAP) — o rito da DAR no banco
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Política (minuta SEI 024241420) e pela Metodologia (SEI 024421455), o
-- apetite da DAR só vale depois da PORTARIA do Presidente. Antes dela vêm a
-- MINUTA (feita pela CGOV), a manifestação do CTGRIC e a deliberação do CIG.
-- Este teste confere que o banco só aceita esse caminho:
--   1. tabelas, visão, RLS e o fim da gravação direta do apetite (Task 1);
--   2. minuta, CTGRIC e CIG (Task 2);
--   3. portaria e retificação (Task 3);
--   4. conversão dos apetites gravados sem portaria (Task 4).
-- Só dados de demonstração (@radar.test, "Portaria nº 000/2025 (exemplo)").
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(136);

-- ============================================================================
-- 1. Tabelas, visão, RLS e o fim do UPDATE direto (Task 1)
-- ============================================================================

-- 1.1 As peças existem.
select has_table('public', 'dar_minutas',           'tabela dar_minutas existe');
select has_table('public', 'dar_minuta_categorias', 'tabela dar_minuta_categorias existe');
select has_table('public', 'dar_rito_eventos',      'tabela dar_rito_eventos existe');
select has_table('public', 'dar_portarias',         'tabela dar_portarias existe');
select has_view ('public', 'dar_situacao',          'visão dar_situacao existe');

-- 1.2 A semente: uma DAR de exemplo já publicada, com os apetites de hoje.
select is((select count(*)::int from public.dar_minutas where etapa = 'publicada'), 1,
          'semente: 1 minuta publicada');
select is((select count(*)::int from public.dar_minutas where etapa <> 'publicada'), 0,
          'semente: nenhuma minuta em andamento');
select is((select p.numero from public.dar_portarias p), '000/2025 (exemplo)',
          'semente: a portaria de exemplo');
select is((select string_agg(id || '=' || apetite_declarado, ',' order by id) from public.categorias_risco),
          '2=moderado,3=baixo,4=baixo,5=baixo,6=baixo,9=pendente_dar,10=pendente_dar,11=pendente_dar',
          'semente: os apetites de hoje (2 moderado; 3 a 6 baixo; 9 a 11 pendentes)');
select is((select string_agg(categoria_id || '=' || apetite_proposto, ',' order by categoria_id)
             from public.dar_minuta_categorias),
          '2=moderado,3=baixo,4=baixo,5=baixo,6=baixo,9=pendente_dar,10=pendente_dar,11=pendente_dar',
          'semente: a minuta publicada guarda os mesmos apetites');

-- 1.3 Quem tem perfil lê; anônimo não.
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.dar_minutas), 1, 'gestor.uc lê a minuta');
select is((select count(*)::int from public.dar_minuta_categorias), 8, 'gestor.uc lê as 8 categorias da minuta');
select ok((select count(*) from public.dar_rito_eventos) >= 4, 'gestor.uc lê os eventos do rito');
select is((select count(*)::int from public.dar_portarias), 1, 'gestor.uc lê a portaria');
select is((select etapa || '/' || portaria_numero from public.dar_situacao), 'publicada/000/2025 (exemplo)',
          'gestor.uc lê a situação: publicada, com a portaria de exemplo');
select is((select dia_prazo from public.dar_situacao), null::int, 'fora de "ressalvas" não há contador de prazo');
select pg_temp.entrar_como('sem-perfil@radar.test');
select is((select count(*)::int from public.dar_minutas), 0, 'sem-perfil não lê nada');
select pg_temp.entrar_como_anonimo();
select throws_ok($$select count(*) from public.dar_minutas$$, '42501', null, 'anônimo: sem acesso');

-- 1.4 Ninguém grava direto: nem o gestor, nem a CGOV. Tudo passa pelas RPCs.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok($$insert into public.dar_minutas default values$$, '42501', null,
                 'gestor.uc não cria minuta direto');
select throws_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$, '42501', null,
                 'gestor.uc não muda o apetite direto (42501)');
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok($$insert into public.dar_minutas default values$$, '42501', null,
                 'CGOV não cria minuta direto');
select throws_ok($$update public.dar_minutas set etapa = 'minuta'$$, '42501', null,
                 'CGOV não muda a etapa direto');
select throws_ok($$delete from public.dar_minuta_categorias$$, '42501', null,
                 'CGOV não apaga categorias da minuta direto');
select throws_ok($$update public.dar_rito_eventos set observacao = 'x'$$, '42501', null,
                 'CGOV não altera evento do rito direto');
select throws_ok($$update public.dar_portarias set numero = '1/2026'$$, '42501', null,
                 'CGOV não altera a portaria direto');
select throws_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$, '42501', null,
                 'CGOV também não muda o apetite direto: só pela portaria (42501)');
select throws_ok($$update public.categorias_risco set justificativa_dar = 'x' where id = 2$$, '42501', null,
                 'CGOV não muda a justificativa direto');
select throws_ok($$delete from public.categorias_risco where id = 9$$, '42501', null,
                 'CGOV não apaga categoria (apagar e recriar mudaria o apetite sem portaria)');
select pg_temp.sair();
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'o apetite da categoria 2 continua moderado');

-- 1.5 Regras que valem até para o dono do banco.
select lives_ok($$insert into public.dar_minutas (etapa) values ('minuta')$$,
                'dono: abre uma minuta em andamento');
select throws_ok($$insert into public.dar_minutas (etapa) values ('no_ctgric')$$, '23505', null,
                 'índice único: só uma minuta fora de "publicada" por vez');
select throws_ok($$insert into public.dar_minutas (etapa) values ('vigente')$$, '23514', null,
                 'etapa fora da lista é recusada (CHECK)');
select throws_ok($$update public.dar_rito_eventos set observacao = 'x'$$, 'P0001', null,
                 'evento do rito é imutável, até para o dono (update)');
select throws_ok($$delete from public.dar_rito_eventos$$, 'P0001', null,
                 'evento do rito é imutável, até para o dono (delete)');
select throws_ok($$delete from public.dar_portarias$$, 'P0001', null,
                 'a portaria não pode ser apagada, nem pelo dono');

-- 1.6 O ajudante de teste grava o apetite como dono e mantém o autor (auth.uid()).
select pg_temp.entrar_como('cgov@radar.test');
select pg_temp.publicar_dar_teste(9, 'moderado');
select is((select apetite_declarado from public.categorias_risco where id = 9), 'moderado',
          'ajudante publicar_dar_teste grava o apetite (só nos testes)');
select pg_temp.sair();

-- ============================================================================
-- 2. Minuta, CTGRIC e CIG (Task 2)
-- ============================================================================
-- Datas relativas a "hoje" em Brasília (fn_hoje()), para o teste valer em
-- qualquer dia. Ex.: :'d40' = hoje menos 40 dias.
select public.fn_hoje() as hoje,
       public.fn_hoje() - 41 as d41, public.fn_hoje() - 40 as d40, public.fn_hoje() - 35 as d35,
       public.fn_hoje() - 30 as d30, public.fn_hoje() - 20 as d20, public.fn_hoje() - 10 as d10,
       public.fn_hoje() - 9 as d9, public.fn_hoje() - 8 as d8, public.fn_hoje() - 5 as d5,
       public.fn_hoje() + 1 as amanha,
       (select id from auth.users where email = 'cgov@radar.test') as u_cgov
\gset
-- O bloco 1.5 abriu uma minuta de teste como dono; ela sai aqui (só no teste),
-- com o gatilho que impede apagar desligado por um instante.
alter table public.dar_minutas disable trigger trg_dar_minutas_sem_apagar;
delete from public.dar_minutas where etapa <> 'publicada';
alter table public.dar_minutas enable trigger trg_dar_minutas_sem_apagar;

-- 2.1 Só a CGOV conduz o rito: as outras pessoas recebem 42501.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok($$select public.salvar_minuta_dar('{"categorias": []}')$$, '42501', null,
                 'gestor.uc não salva minuta');
select throws_ok(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'d40'), '42501', null,
                 'gestor.uc não encaminha ao CTGRIC');
select throws_ok(format($$select public.registrar_manifestacao_ctgric_dar('favoravel', %L, null)$$, :'d40'), '42501', null,
                 'gestor.uc não registra a manifestação do CTGRIC');
select throws_ok(format($$select public.encaminhar_minuta_dar_cig(%L)$$, :'d40'), '42501', null,
                 'gestor.uc não encaminha ao CIG');
select throws_ok(format($$select public.registrar_deliberacao_cig_dar('aprovada', %L, null)$$, :'d40'), '42501', null,
                 'gestor.uc não registra a deliberação do CIG');
select pg_temp.entrar_como('diretor.dibio@radar.test');
select throws_ok($$select public.salvar_minuta_dar('{"categorias": []}')$$, '42501', null,
                 'diretor também não salva minuta');

-- 2.2 A CGOV salva a minuta: a 1ª vez cria (com as 8 categorias, partindo do
-- vigente); o vigente NÃO muda.
select pg_temp.entrar_como('cgov@radar.test');
select public.salvar_minuta_dar(
  '{"categorias": [{"categoria_id": 2, "apetite_proposto": "baixo", "justificativa": "Proposta de teste (130)."}]}'
) as m1 \gset
select isnt(:'m1'::uuid, null::uuid, 'CGOV salva a minuta e recebe o id');
select is((select count(*)::int from public.dar_minutas where etapa <> 'publicada'), 1, 'uma minuta em andamento');
select is((select etapa from public.dar_minutas where id = :'m1'), 'minuta', 'a minuta nasce na etapa "minuta"');
select is((select count(*)::int from public.dar_minuta_categorias where minuta_id = :'m1'), 8,
          'a minuta tem as 8 categorias do Quadro 2');
select is((select apetite_proposto || '/' || justificativa from public.dar_minuta_categorias
            where minuta_id = :'m1' and categoria_id = 2), 'baixo/Proposta de teste (130).',
          'a categoria 2 tem o apetite e a justificativa propostos');
select is((select apetite_proposto from public.dar_minuta_categorias where minuta_id = :'m1' and categoria_id = 4), 'baixo',
          'as outras categorias partem do vigente');
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'o VIGENTE da categoria 2 não muda com a minuta');

-- 2.3 A 2ª vez atualiza a mesma minuta (sem duplicar).
select is(public.salvar_minuta_dar('{"categorias": [{"categoria_id": 3, "apetite_proposto": "moderado", "justificativa": "Outra proposta."}]}'),
          :'m1'::uuid, 'salvar de novo devolve a mesma minuta');
select is((select count(*)::int from public.dar_minutas where etapa <> 'publicada'), 1, 'continua uma minuta só');
select is((select string_agg(categoria_id || '=' || apetite_proposto, ',' order by categoria_id)
             from public.dar_minuta_categorias where minuta_id = :'m1' and categoria_id in (2, 3)),
          '2=baixo,3=moderado', 'a categoria 2 continua proposta e a 3 foi acrescentada');

-- 2.3b Item sem a chave "justificativa": a justificativa que já estava na
-- minuta (copiada do vigente) fica como está (revisão da Fase 1).
select lives_ok($$select public.salvar_minuta_dar('{"categorias": [{"categoria_id": 4, "apetite_proposto": "baixo"}]}')$$,
                'salvar um item só com o apetite');
select is((select justificativa from public.dar_minuta_categorias where minuta_id = :'m1' and categoria_id = 4),
          (select justificativa_dar from public.categorias_risco where id = 4),
          'sem a chave "justificativa", a justificativa da categoria não é apagada');

-- 2.4 Valores inválidos.
select throws_ok($$select public.salvar_minuta_dar('{"categorias": [{"categoria_id": 2, "apetite_proposto": "alto"}]}')$$,
                 '22023', null, 'apetite proposto fora da lista é recusado');
select throws_ok($$select public.salvar_minuta_dar('{"categorias": [{"categoria_id": 99, "apetite_proposto": "baixo"}]}')$$,
                 '22023', null, 'categoria fora do Quadro 2 é recusada');

-- 2.5 Encaminhar ao CTGRIC.
select throws_ok(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'amanha'), '22023',
                 'RADAR: a data do encaminhamento ao CTGRIC não pode ser futura.',
                 'encaminhar com data futura é recusado');
select throws_ok($$select public.encaminhar_minuta_dar_ctgric(null)$$, '22023', null,
                 'encaminhar sem data é recusado');
select lives_ok(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'d40'),
                'CGOV encaminha a minuta ao CTGRIC');
select is((select etapa from public.dar_minutas where id = :'m1'), 'no_ctgric', 'etapa: no_ctgric');
select is((select count(*)::int from public.dar_rito_eventos
            where minuta_id = :'m1' and tipo = 'encaminhada_ctgric' and registrado_por = :'u_cgov'), 1,
          'o encaminhamento vira 1 evento, com a CGOV como autora');

-- 2.6 Em no_ctgric, a minuta fica só para leitura, e não se abre outra.
select throws_ok($$select public.salvar_minuta_dar('{"categorias": []}')$$, '55000',
                 'RADAR: A minuta foi encaminhada ao CTGRIC e está só para leitura.',
                 'salvar em no_ctgric é recusado');
select is((select count(*)::int from public.dar_minutas where etapa <> 'publicada'), 1,
          'não se abre outra minuta com uma em andamento');
select throws_ok(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'d40'), '55000', null,
                 'encaminhar de novo ao CTGRIC é recusado (etapa errada)');
select throws_ok(format($$select public.registrar_deliberacao_cig_dar('aprovada', %L, null)$$, :'d40'), '55000', null,
                 'deliberação do CIG antes do CTGRIC é recusada');

-- 2.7 Manifestação do CTGRIC "com ressalvas": abre o prazo de 10 dias úteis.
select throws_ok(format($$select public.registrar_manifestacao_ctgric_dar('favoravel', %L, null)$$, :'d41'), '22023', null,
                 'manifestação com data anterior ao encaminhamento é recusada');
select throws_ok(format($$select public.registrar_manifestacao_ctgric_dar('otimo', %L, null)$$, :'d30'), '22023', null,
                 'resultado do CTGRIC fora da lista é recusado');
select lives_ok(format($$select public.registrar_manifestacao_ctgric_dar('com_ressalvas', %L, 'Ajustar a justificativa.')$$, :'d30'),
                'CGOV registra a manifestação "com ressalvas"');
select is((select etapa from public.dar_minutas where id = :'m1'), 'ressalvas', 'etapa: ressalvas');
select is((select dia_prazo from public.dar_situacao), public.fn_dias_uteis_entre(:'d30'::date, public.fn_hoje()),
          'dar_situacao conta os dias úteis desde a manifestação');
select is((select dentro_prazo from public.dar_situacao), false, '30 dias corridos depois: fora dos 10 dias úteis (aviso, sem bloqueio)');
select is((select resultado_ctgric from public.dar_situacao), 'com_ressalvas', 'a visão traz o resultado do CTGRIC');

-- 2.8 Em "ressalvas" a CGOV ainda edita a minuta; depois encaminha ao CIG.
select lives_ok($$select public.salvar_minuta_dar('{"categorias": [{"categoria_id": 2, "apetite_proposto": "baixo", "justificativa": "Ressalva incorporada."}]}')$$,
                'em "ressalvas" a minuta aceita ajustes');
select lives_ok(format($$select public.encaminhar_minuta_dar_cig(%L)$$, :'d20'), 'CGOV encaminha ao CIG');
select is((select etapa from public.dar_minutas where id = :'m1'), 'no_cig', 'etapa: no_cig');
select is((select dia_prazo from public.dar_situacao), null::int, 'fora de "ressalvas" o contador some');

-- 2.9 CIG reprova: a minuta volta à etapa "minuta", editável.
select throws_ok(format($$select public.registrar_deliberacao_cig_dar('aprovada', %L, null)$$, :'d35'), '22023', null,
                 'deliberação com data anterior à manifestação é recusada');
select throws_ok(format($$select public.registrar_deliberacao_cig_dar('talvez', %L, null)$$, :'d10'), '22023', null,
                 'resultado do CIG fora da lista é recusado');
select lives_ok(format($$select public.registrar_deliberacao_cig_dar('reprovada', %L, 'Rever a categoria 2.')$$, :'d10'),
                'CGOV registra a reprovação pelo CIG');
select is((select etapa from public.dar_minutas where id = :'m1'), 'minuta', 'reprovada: volta à etapa "minuta"');
select lives_ok($$select public.salvar_minuta_dar('{"categorias": [{"categoria_id": 2, "apetite_proposto": "baixo", "justificativa": "Versão revista."}]}')$$,
                'reprovada: a minuta volta a aceitar edição');
select is((select etapa || '/' || coalesce(data_encaminhada_ctgric::text, 'sem data')
             from public.dar_situacao), 'minuta/sem data',
          'a visão mostra a rodada nova (sem as datas da rodada reprovada)');

-- 2.10 Nova rodada: CTGRIC favorável vai direto ao CIG; o CIG aprova.
select lives_ok(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'d9'), 'nova rodada: encaminha ao CTGRIC');
select lives_ok(format($$select public.registrar_manifestacao_ctgric_dar('favoravel', %L, null)$$, :'d8'),
                'CTGRIC favorável');
select is((select etapa from public.dar_minutas where id = :'m1'), 'no_cig', 'favorável: vai direto a no_cig');
select throws_ok(format($$select public.encaminhar_minuta_dar_cig(%L)$$, :'d8'), '55000', null,
                 'encaminhar ao CIG só existe depois das ressalvas');
select lives_ok(format($$select public.registrar_deliberacao_cig_dar('aprovada', %L, null)$$, :'d5'), 'CIG aprova');
select is((select etapa from public.dar_minutas where id = :'m1'), 'aprovada_cig', 'etapa: aprovada_cig');
select throws_ok($$select public.salvar_minuta_dar('{"categorias": []}')$$, '55000', null,
                 'aprovada pelo CIG: a minuta fica só para leitura');
select is((select count(*)::int from public.dar_rito_eventos where minuta_id = :'m1'), 7,
          'cada passo gravou 1 evento (7 no total, com a rodada reprovada)');
select is((select count(*)::int from public.dar_rito_eventos where minuta_id = :'m1' and registrado_por = :'u_cgov'), 7,
          'todos os eventos têm a CGOV como autora (auth.uid())');
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'aprovada pelo CIG, mas sem portaria: o vigente continua moderado');
select pg_temp.sair();

-- ============================================================================
-- 3. Portaria e retificação (Task 3)
-- ============================================================================
-- A minuta m1 está "aprovada_cig" (CIG em :'d5'), propondo Operacional (2)
-- "baixo" e Financeiro/Orçamentário (3) "moderado".
-- R: risco APROVADO, Operacional, P=2 e I=3 → residual 9,00 (Médio). Com o
-- apetite "moderado" ele está dentro do apetite; com "baixo", vira Risco Crítico.
select public.fn_hoje() - 4 as d4, public.fn_hoje() - 3 as d3 \gset
insert into public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
   nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
values ('RADAR-T130-R', '00000000-0000-4000-b000-000000000001', 'Responsável de demonstração',
        'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'x',
        2, 2, 3, 0, 'Baixo', 0, 'Baixo', 'aprovado');
select id as r_r from public.riscos where codigo_radar = 'RADAR-T130-R' \gset
select pg_temp.dar_tratamento(:'r_r');
select is((select status_critico || '/' || status_fluxo from public.riscos where id = :'r_r'), 'nao/aprovado',
          'R começa aprovado e dentro do apetite (Médio, Operacional moderado)');

-- 3.1 Só a CGOV registra e retifica.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.registrar_portaria_dar('1/2026', %L, null)$$, :'d3'), '42501', null,
                 'gestor.uc não registra a portaria');
select throws_ok(format($$select public.retificar_portaria_dar('1/2026', %L, null, 'x')$$, :'d3'), '42501', null,
                 'gestor.uc não retifica a portaria');

-- 3.2 Valores recusados.
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$select public.registrar_portaria_dar('   ', %L, null)$$, :'d3'), '22023',
                 'RADAR: informe o número da portaria.', 'número vazio é recusado');
select throws_ok(format($$select public.registrar_portaria_dar('1/2026', %L, null)$$, :'amanha'), '22023',
                 'RADAR: a data da portaria não pode ser futura.', 'portaria com data futura é recusada');
select throws_like(format($$select public.registrar_portaria_dar('1/2026', %L, null)$$, :'d10'),
                   'RADAR: a data da portaria não pode ser anterior à do passo anterior%',
                   'portaria com data anterior à deliberação do CIG é recusada');
select throws_ok(format($$select public.registrar_portaria_dar('1/2026', %L, 'ftp://exemplo')$$, :'d3'), '22023', null,
                 'link que não começa com http:// ou https:// é recusado');
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'as tentativas recusadas não mudaram o apetite');

-- 3.3 A CGOV registra a portaria: o apetite da minuta passa a valer, e o
-- gatilho de hoje reavalia os riscos aprovados.
create temp table _crit_antes as select id, is_critico, status_fluxo from public.riscos;
select lives_ok(format($$select public.registrar_portaria_dar('001/2026 (teste)', %L, 'https://exemplo.invalid/portaria')$$, :'d3'),
                'CGOV registra a portaria');
select is((select etapa from public.dar_minutas where id = :'m1'), 'publicada', 'etapa: publicada');
select is((select count(*)::int from public.dar_portarias where minuta_id = :'m1'), 1, 'a portaria da minuta foi gravada');
select is((select apetite_declarado || '/' || justificativa_dar from public.categorias_risco where id = 2),
          'baixo/Versão revista.', 'Operacional passa a "baixo", com a justificativa da minuta');
select is((select apetite_declarado from public.categorias_risco where id = 3), 'moderado',
          'Financeiro/Orçamentário passa a "moderado"');
select is((select apetite_declarado || '/' || justificativa_dar from public.categorias_risco where id = 4),
          (select apetite_proposto || '/' || justificativa from public.dar_minuta_categorias
            where minuta_id = :'m1' and categoria_id = 4),
          'Legal, que não mudou na minuta, continua igual');
select is((select status_critico || '/' || status_fluxo from public.riscos where id = :'r_r'), 'sim/em_homologacao_dir',
          'R passa a Risco Crítico e volta para homologação (o gatilho de hoje)');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_r' and acao = 'reaberto_mudanca_dar'), 1,
          'R: uma linha reaberto_mudanca_dar no histórico');
select is((select count(*)::int from public.dar_rito_eventos where minuta_id = :'m1' and tipo = 'portaria_registrada'), 1,
          'o registro da portaria vira 1 evento');
select is((select etapa || '|' || portaria_numero || '|' || portaria_vigente_numero || '|' || portaria_data
             from public.dar_situacao),
          'publicada|001/2026 (teste)|001/2026 (teste)|' || :'d3',
          'dar_situacao: a minuta publicada e a portaria nova como vigente');

-- 3.4 Clique duplo: o 2º registro acha a minuta já publicada e é recusado,
-- sem reavaliar ninguém de novo.
select throws_ok(format($$select public.registrar_portaria_dar('001/2026 (teste)', %L, null)$$, :'d3'), '55000',
                 'RADAR: não há minuta aprovada pelo CIG aguardando portaria (a última já foi publicada). Atualize a página.',
                 '2º registro da portaria é recusado com mensagem clara');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_r' and acao = 'reaberto_mudanca_dar'), 1,
          'R não foi reavaliado duas vezes');
select is((select count(*)::int from public.dar_portarias), 2, 'continua uma portaria por minuta publicada');

-- 3.5 Retificação: corrige o registro, sem mexer no apetite nem na criticidade.
create temp table _depois_portaria as
  select r.id, r.is_critico, r.status_critico, r.status_fluxo from public.riscos r;
create temp table _cat_depois as select id, apetite_declarado, justificativa_dar from public.categorias_risco;
select throws_ok(format($$select public.retificar_portaria_dar('001/2026 (teste)', %L, null, '  ')$$, :'d4'), '22023',
                 'RADAR: informe o motivo da retificação.', 'retificar sem motivo é recusado');
select throws_ok(format($$select public.retificar_portaria_dar('001/2026 (teste)', %L, null, 'x')$$, :'amanha'), '22023', null,
                 'retificar com data futura é recusado');
select throws_like(format($$select public.retificar_portaria_dar('001/2026 (teste)', %L, null, 'x')$$, :'d10'),
                   'RADAR: a data da portaria não pode ser anterior à deliberação do CIG%',
                   'retificar com data anterior à deliberação do CIG é recusado');
select throws_ok(format($$select public.retificar_portaria_dar('001/2026 (teste)', %L, 'https://exemplo.invalid/portaria', 'x')$$, :'d3'), '22023',
                 'RADAR: a retificação não muda nada: confira o número, a data e o link.', 'retificar sem mudar nada é recusado');
select lives_ok(format($$select public.retificar_portaria_dar('001/2026 (teste)', %L, 'https://exemplo.invalid/portaria', 'A data foi digitada errada.')$$, :'d4'),
                'CGOV retifica a data da portaria');
select is((select data_publicacao from public.dar_portarias where minuta_id = :'m1'), :'d4'::date,
          'a portaria fica com a data corrigida');
select is((select (antes ->> 'data_publicacao') || '→' || (depois ->> 'data_publicacao') || '|' || motivo
             from public.dar_rito_eventos where minuta_id = :'m1' and tipo = 'portaria_retificada'),
          :'d3' || '→' || :'d4' || '|A data foi digitada errada.',
          'o evento portaria_retificada guarda o antes, o depois e o motivo');
select is((select count(*)::int from _depois_portaria d join public.riscos r on r.id = d.id
            where r.is_critico is distinct from d.is_critico
               or r.status_critico is distinct from d.status_critico
               or r.status_fluxo is distinct from d.status_fluxo), 0,
          'a retificação não mudou a criticidade nem o estado de nenhum risco');
select is((select count(*)::int from _cat_depois c join public.categorias_risco k on k.id = c.id
            where k.apetite_declarado is distinct from c.apetite_declarado
               or k.justificativa_dar is distinct from c.justificativa_dar), 0,
          'a retificação não mudou o apetite nem a justificativa de nenhuma categoria');

-- 3.6 Só a ÚLTIMA portaria publicada é retificada (a função não recebe id):
-- a de exemplo, anterior, fica intacta.
select is((select p.numero || '|' || p.data_publicacao from public.dar_portarias p
             join public.dar_minutas m on m.id = p.minuta_id where m.id <> :'m1'),
          '000/2025 (exemplo)|2025-04-15', 'a portaria de exemplo, anterior, não foi tocada');

-- 3.7 Publicada a minuta, a CGOV pode abrir a próxima.
select isnt(public.salvar_minuta_dar('{"categorias": []}'), :'m1'::uuid,
            'depois da portaria, salvar abre uma minuta nova');
-- A minuta nova não pode ter passo com data anterior à portaria vigente
-- (revisão da Fase 1). A vigente, retificada, é de :'d4'.
select throws_like(format($$select public.encaminhar_minuta_dar_ctgric(%L)$$, :'d5'),
                   'RADAR: a data do encaminhamento ao CTGRIC não pode ser anterior à portaria vigente%',
                   'minuta nova: encaminhar antes da portaria vigente é recusado');
select pg_temp.sair();

-- ============================================================================
-- 4. Conversão dos apetites gravados sem portaria (Task 4)
-- ============================================================================
-- Decisão do responsável (2026-11-27): onde houver apetite e NENHUMA portaria
-- (a nuvem do piloto hoje), o apetite volta a "Pendente de DAR" e os valores
-- de antes viram a 1ª minuta, para a CGOV não perder o trabalho.

-- 4.1 Com portaria (a semente local), a função não faz nada.
select results_eq($$select * from public.fn_dar_converter_sem_portaria()$$,
                  $$values (0, 0)$$, 'com portaria: (0, 0), nada muda');
-- (São 6: as 5 da semente e a 9, que o bloco 1.6 pôs em "moderado".)
select is((select count(*)::int from public.categorias_risco where apetite_declarado <> 'pendente_dar'), 6,
          'com portaria: as 6 categorias com apetite continuam com apetite');

-- 4.2 Só o dono do banco a executa.
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok($$select * from public.fn_dar_converter_sem_portaria()$$, '42501', null,
                 'a CGOV não executa a conversão');
select pg_temp.sair();

-- 4.3 Sem portaria (como na nuvem): apagamos o rito inteiro, como dono e só
-- dentro do teste, com os gatilhos de imutabilidade desligados por um instante.
alter table public.dar_rito_eventos      disable trigger trg_dar_evento_imutavel;
alter table public.dar_portarias         disable trigger trg_dar_portarias_sem_apagar;
alter table public.dar_minuta_categorias disable trigger trg_dar_minuta_categorias_sem_apagar;
alter table public.dar_minutas           disable trigger trg_dar_minutas_sem_apagar;
delete from public.dar_rito_eventos;
delete from public.dar_portarias;
delete from public.dar_minuta_categorias;
delete from public.dar_minutas;
alter table public.dar_rito_eventos      enable trigger trg_dar_evento_imutavel;
alter table public.dar_portarias         enable trigger trg_dar_portarias_sem_apagar;
alter table public.dar_minuta_categorias enable trigger trg_dar_minuta_categorias_sem_apagar;
alter table public.dar_minutas           enable trigger trg_dar_minutas_sem_apagar;

create temp table _cat_antes as select id, apetite_declarado, justificativa_dar from public.categorias_risco;
create temp table _aprov_antes as
  select id, status_critico from public.riscos where status_fluxo = 'aprovado';

select * from public.fn_dar_converter_sem_portaria() as conv \gset conv_
select is(:conv_categorias::int, 6, 'sem portaria: as 6 categorias com apetite voltaram a Pendente de DAR');
select is(:conv_riscos_mudados::int,
          (select count(*)::int from _aprov_antes a join public.riscos r on r.id = a.id
            where r.status_critico is distinct from a.status_critico or r.status_fluxo <> 'aprovado'),
          'sem portaria: a contagem de riscos mudados confere com o banco');
select is((select string_agg(distinct apetite_declarado, ',') || '|' || count(justificativa_dar)
             from public.categorias_risco), 'pendente_dar|0',
          'as 8 categorias ficam em pendente_dar, sem justificativa');
select is((select count(*)::int from public.dar_minutas where etapa = 'minuta'), 1,
          'nasce uma minuta na etapa "minuta"');
select results_eq(
  $$ select categoria_id, apetite_proposto, justificativa from public.dar_minuta_categorias order by categoria_id $$,
  $$ select id, apetite_declarado, justificativa_dar from _cat_antes order by id $$,
  'a minuta guarda os apetites e as justificativas de antes');
select is((select count(*)::int from _aprov_antes a join public.riscos r on r.id = a.id
            where r.status_fluxo = 'em_homologacao_dir'), 0,
          'nenhum risco aprovado volta para homologação (ninguém ENTRA no Risco Crítico)');
select is((select count(*)::int from public.dar_portarias), 0, 'nenhuma portaria é inventada');

-- 4.4 Chamar de novo não faz nada (as categorias já estão pendentes).
select results_eq($$select * from public.fn_dar_converter_sem_portaria()$$,
                  $$values (0, 0)$$, '2ª chamada: (0, 0)');

select * from finish();
rollback;
