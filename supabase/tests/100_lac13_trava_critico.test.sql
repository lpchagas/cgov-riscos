-- ============================================================================
-- TESTE DA LAC-13 (pgTAP) — risco crítico não aceita "Aceitar" e exige ação
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Pela Metodologia (4.5 e Anexo III), o Risco Crítico (fora do apetite da DAR,
-- ou com a DAR ainda pendente na categoria) precisa de TRATAMENTO:
--   - a estratégia principal não pode ser "Aceitar" (RN-019 / RF-049);
--   - a ficha precisa de pelo menos uma ação 5W2H que não seja "Aceitar"
--     (RN-020 / RF-050).
-- A migração 20261122002 põe essa trava no banco, nas passagens que levam o
-- risco em direção à aprovação (enviar, validar, homologar), na gravação da
-- ficha fora do rascunho e na reavaliação dos aprovados quando a DAR muda.
-- O rascunho continua livre: o gestor salva e corrige depois.
--
-- Exemplo usado abaixo: P=4, I=4 → Quadro 7 = 21 → residual 21,00, Extremo
-- (sem controle) → sempre fora do apetite (status_critico = 'sim').
-- (Extremo é a FAIXA 18 a 25; "crítico" é estar fora do apetite da DAR.)
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(46);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
-- FLONA de Caçador (objeto 01 da semente): envia gestor.uc@, valida ct@
-- (CT Curitiba), homologa gr@ (GR5).

-- ficha(responsável, P, I, estratégia, respostas): ficha nova para
-- salvar_ficha_risco. O "responsável" é único por caso e serve para achar o
-- risco depois (o código RADAR-<ano>-<NNN> é gerado pela função).
create or replace function pg_temp.ficha(p_resp text, p_p int, p_i int, p_estrategia text, p_respostas jsonb)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'objeto_id', '00000000-0000-4000-b000-000000000001',
    'responsavel_risco_nome', p_resp,
    'causas', 'falta de manual do processo',
    'evento_risco', 'erro na execução da rotina',
    'consequencias', 'retrabalho e atraso',
    'objetivo_afetado', 'objetivo de demonstração',
    'categoria_id', 2,
    'probabilidade', p_p,
    'impacto', p_i,
    'estrategia_principal', p_estrategia,
    'respostas', p_respostas);
$$;

-- Uma ação 5W2H válida, com a estratégia pedida.
create or replace function pg_temp.acao(p_estrategia text)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'estrategia', p_estrategia,
    'acao_o_que', 'elaborar o manual do processo',
    'responsavel_quem', 'Chefia da unidade',
    'prazo_quando', '2027-06-30',
    'procedimento_como', 'oficina com a equipe');
$$;

-- inserir_risco(código, P, I, categoria, estratégia, com_acao, estado):
-- risco inserido direto pelo administrador. Nasce em rascunho (a ação pode
-- ser incluída sem reabrir nada) e depois vai ao estado pedido por
-- fn_fluxo_mudar_estado — simula a ficha que já estava no caminho ANTES da
-- migração. Devolve o id.
create or replace function pg_temp.inserir_risco(p_codigo text, p_p int, p_i int, p_cat int,
                                                 p_estrategia text, p_com_acao boolean, p_status text)
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
          p_cat, p_p, p_i, 0, 'Baixo', 0, 'Baixo', 'rascunho', p_estrategia)
  returning id into v_id;
  if p_com_acao then
    insert into public.respostas_tratamento
      (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
    values (v_id, 'Mitigar', 'ação de teste', 'Chefia', '2027-06-30', 'como de teste');
  end if;
  if p_status <> 'rascunho' then
    perform public.fn_fluxo_mudar_estado(v_id, p_status);
  end if;
  return v_id;
end;
$$;

-- Texto fixo das recusas (o mesmo de errosBanco.ts).
create or replace function pg_temp.msg(p_id uuid, p_motivo text, p_devolva boolean)
returns text
language sql
as $$
  select format('RADAR: o risco %s é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %s.',
                (select codigo_radar from public.riscos where id = p_id), p_motivo)
         || case when p_devolva then ' Devolva a ficha à unidade para ajuste.' else '' end;
$$;

-- ----------------------------------------------------------------------------
-- 1 a 4. Rascunho livre; o ENVIO é que recusa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');

-- 1. Rascunho crítico com "Aceitar": salvar continua livre.
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       pg_temp.ficha('T100 caso 1', 4, 4, 'Aceitar', '[]'::jsonb)),
                '1. rascunho crítico com "Aceitar" é salvo por salvar_ficha_risco');
select (select id from public.riscos where responsavel_risco_nome = 'T100 caso 1') as r1 \gset
select is((select status_critico from public.riscos where id = :'r1'), 'sim',
          '1. o rascunho salvo é crítico (fora do apetite da DAR)');

-- 2. Enviar: recusa com o motivo "Aceitar".
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r1'), '23514',
                 pg_temp.msg(:'r1', 'a estratégia "Aceitar" não é permitida', false),
                 '2. enviar rascunho crítico com "Aceitar" é recusado (23514)');
select is((select status_fluxo from public.riscos where id = :'r1'), 'rascunho',
          '2. o risco continua em rascunho (nada ficou pela metade)');

-- 3. Mitigar, mas sem nenhuma ação: recusa com o motivo "falta uma ação".
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       pg_temp.ficha('T100 caso 3', 4, 4, 'Mitigar', '[]'::jsonb)),
                '3. rascunho crítico com Mitigar e sem ação é salvo');
select (select id from public.riscos where responsavel_risco_nome = 'T100 caso 3') as r3 \gset
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r3'), '23514',
                 pg_temp.msg(:'r3', 'falta uma ação de tratamento (5W2H)', false),
                 '3. enviar crítico com Mitigar e sem ação é recusado (23514)');

-- 3b. Uma ação só com "Aceitar" também não conta como tratamento.
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
                         'id', :'r3', 'respostas', jsonb_build_array(pg_temp.acao('Aceitar')))),
                '3b. o rascunho recebe uma ação "Aceitar"');
select throws_ok(format($$select public.enviar_para_validacao(%L)$$, :'r3'), '23514',
                 pg_temp.msg(:'r3', 'falta uma ação de tratamento (5W2H)', false),
                 '3b. ação com "Aceitar" não conta: o envio continua recusado');

-- 4. Mitigar + 1 ação Mitigar: envia.
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       pg_temp.ficha('T100 caso 4', 4, 4, 'Mitigar', jsonb_build_array(pg_temp.acao('Mitigar')))),
                '4. rascunho crítico com Mitigar e uma ação é salvo');
select (select id from public.riscos where responsavel_risco_nome = 'T100 caso 4') as r4 \gset
select lives_ok(format($$select public.enviar_para_validacao(%L)$$, :'r4'),
                '4. enviar crítico com Mitigar + ação passa');
select is((select status_fluxo from public.riscos where id = :'r4'), 'em_validacao_cg',
          '4. o risco vai para em_validacao_cg');

-- 4b. A estratégia da ação não precisa ser igual à principal (Evitar + ação Compartilhar).
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       pg_temp.ficha('T100 caso 4b', 4, 4, 'Evitar', jsonb_build_array(pg_temp.acao('Compartilhar')))),
                '4b. rascunho crítico com Evitar e ação Compartilhar é salvo');
select (select id from public.riscos where responsavel_risco_nome = 'T100 caso 4b') as r4b \gset
select lives_ok(format($$select public.enviar_para_validacao(%L)$$, :'r4b'),
                '4b. o envio passa (estratégia da ação diferente da principal)');

-- 4c. Risco NÃO crítico (Baixo) continua aceitando "Aceitar" sem ação.
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                       pg_temp.ficha('T100 caso 4c', 1, 2, 'Aceitar', '[]'::jsonb)),
                '4c. rascunho Baixo com "Aceitar" é salvo');
select (select id from public.riscos where responsavel_risco_nome = 'T100 caso 4c') as r4c \gset
select is((select status_critico from public.riscos where id = :'r4c'), 'nao', '4c. o risco Baixo não é crítico');
select lives_ok(format($$select public.enviar_para_validacao(%L)$$, :'r4c'),
                '4c. risco não crítico com "Aceitar" e sem ação é enviado (nada muda para ele)');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 5 e 6. Fichas que já estavam no caminho antes da migração
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('RADAR-T100-VAL', 4, 4, 2, 'Aceitar', false, 'em_validacao_cg') as r5,
       pg_temp.inserir_risco('RADAR-T100-HOM', 4, 4, 2, 'Aceitar', false, 'em_homologacao_dir') as r6
\gset

-- 5. Em validação: ct@ não valida (deve devolver); devolver continua possível.
select pg_temp.entrar_como('ct@radar.test');
select throws_ok(format($$select public.validar_risco(%L, 'ok')$$, :'r5'), '23514',
                 pg_temp.msg(:'r5', 'a estratégia "Aceitar" não é permitida', true),
                 '5. validar ficha crítica com "Aceitar" é recusado e orienta a devolver');
select is((select status_fluxo from public.riscos where id = :'r5'), 'em_validacao_cg',
          '5. a ficha continua em validação após a recusa');
select lives_ok(format($$select public.devolver_risco(%L, 'Trocar a estratégia e incluir a ação.')$$, :'r5'),
                '5. devolver a ficha à unidade continua possível');
select is((select status_fluxo from public.riscos where id = :'r5'), 'devolvido', '5. a ficha foi devolvida');

-- 6. Em homologação: gr@ não homologa; devolver continua possível.
select pg_temp.entrar_como('gr@radar.test');
select throws_ok(format($$select public.homologar_risco(%L, 'ok')$$, :'r6'), '23514',
                 pg_temp.msg(:'r6', 'a estratégia "Aceitar" não é permitida', true),
                 '6. homologar ficha crítica com "Aceitar" é recusado e orienta a devolver');
select is((select status_fluxo from public.riscos where id = :'r6'), 'em_homologacao_dir',
          '6. a ficha continua em homologação após a recusa');
select lives_ok(format($$select public.devolver_risco(%L, 'Trocar a estratégia.')$$, :'r6'),
                '6. devolver em homologação continua possível');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 7. Aprovado crítico: salvar_ficha_risco não põe "Aceitar"
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('RADAR-T100-APR', 4, 4, 2, 'Mitigar', true, 'aprovado') as r7 \gset
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                        jsonb_build_object('id', :'r7', 'estrategia_principal', 'Aceitar')), '23514',
                 pg_temp.msg(:'r7', 'a estratégia "Aceitar" não é permitida', false),
                 '7. aprovado crítico editado para "Aceitar" é recusado');
-- Apagar a única ação (lista vazia) reabre o risco (em_validacao_cg) e cai na trava.
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
                        jsonb_build_object('id', :'r7', 'respostas', '[]'::jsonb)), '23514',
                 pg_temp.msg(:'r7', 'falta uma ação de tratamento (5W2H)', false),
                 '7. apagar a única ação de um aprovado crítico é recusado');
select pg_temp.sair();
select is((select status_fluxo || '/' || estrategia_principal from public.riscos where id = :'r7'),
          'aprovado/Mitigar', '7. a ficha continua aprovada, com a estratégia antiga');
select is((select count(*)::int from public.respostas_tratamento where risco_id = :'r7'), 1,
          '7. a ação continua gravada');

-- ----------------------------------------------------------------------------
-- 8. DAR: moderado → baixo (Review Focus 3)
-- ----------------------------------------------------------------------------
-- Categoria 9 (Riscos da visitação) nasce 'pendente_dar' e nenhum aprovado da
-- semente a usa. Damos 'moderado' só dentro deste teste (o rollback desfaz).
-- Os três são de residual Médio (P=2, I=3 → 9,00), menos C (Baixo, P=1, I=2).
update public.categorias_risco set apetite_declarado = 'moderado' where id in (9, 10);
select pg_temp.inserir_risco('RADAR-T100-DAR-A', 2, 3, 9, 'Aceitar', false, 'aprovado') as r8a,
       pg_temp.inserir_risco('RADAR-T100-DAR-B', 2, 3, 9, 'Mitigar', true,  'aprovado') as r8b,
       pg_temp.inserir_risco('RADAR-T100-DAR-C', 1, 2, 9, 'Aceitar', false, 'aprovado') as r8c
\gset
select is((select string_agg(status_critico, ',' order by codigo_radar) from public.riscos
            where id in (:'r8a', :'r8b', :'r8c')), 'nao,nao,nao',
          '8. ponto de partida: os três estão dentro do apetite (moderado)');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 9$$,
                '8. a mudança da DAR (moderado → baixo) termina, mesmo com riscos que não passam na trava');
select pg_temp.sair();

select is((select status_fluxo from public.riscos where id = :'r8a'), 'devolvido',
          '8. A (Médio, "Aceitar", sem ação) passa a crítico e volta para a unidade (devolvido)');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'r8a' and etapa = 'reabertura_nota' and acao = 'devolvido_mudanca_dar'), 1,
          '8. A: uma linha devolvido_mudanca_dar no histórico');
select ok((select despacho_texto like 'DAR alterada: categoria % com apetite moderado → baixo.%'
                  and despacho_texto like '%Voltou para a unidade escolher outra estratégia e incluir a ação.'
             from public.historico_fluxo where risco_id = :'r8a' and acao = 'devolvido_mudanca_dar'),
          '8. A: o texto do histórico explica a mudança da DAR e o que fazer');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r8a' and acao = 'reaberto_mudanca_dar'), 0,
          '8. A: não foi para a homologação');
select is((select status_fluxo from public.riscos where id = :'r8b'), 'em_homologacao_dir',
          '8. B (Médio, Mitigar + ação) segue o caminho de hoje: em_homologacao_dir');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r8b' and acao = 'reaberto_mudanca_dar'), 1,
          '8. B: uma linha reaberto_mudanca_dar');
select is((select status_fluxo from public.riscos where id = :'r8c'), 'aprovado',
          '8. C (Baixo, "Aceitar") não é crítico e continua aprovado');

-- ----------------------------------------------------------------------------
-- 9. DAR: moderado → pendente_dar
-- ----------------------------------------------------------------------------
select pg_temp.inserir_risco('RADAR-T100-PEN-D', 2, 3, 10, 'Aceitar', false, 'aprovado') as r9d,
       pg_temp.inserir_risco('RADAR-T100-PEN-E', 2, 3, 10, 'Mitigar', true,  'aprovado') as r9e
\gset
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'pendente_dar' where id = 10$$,
                '9. a CGOV põe a categoria Ocupacionais em pendente_dar');
select pg_temp.sair();
select is((select status_fluxo || '/' || status_critico from public.riscos where id = :'r9d'), 'devolvido/pendente_dar',
          '9. D (Médio, "Aceitar") com DAR pendente é tratado como crítico e volta para a unidade');
select is((select status_fluxo || '/' || status_critico from public.riscos where id = :'r9e'), 'aprovado/pendente_dar',
          '9. E (Médio, Mitigar + ação) continua aprovado (caminho de hoje)');

-- ----------------------------------------------------------------------------
-- 10. Privilégios
-- ----------------------------------------------------------------------------
select is(has_function_privilege('authenticated', 'public.fn_base_enviar_para_validacao(uuid)', 'execute'), false,
          '10. authenticated não executa fn_base_enviar_para_validacao');
select is(has_function_privilege('authenticated', 'public.fn_base_validar_risco(uuid, text)', 'execute'), false,
          '10. authenticated não executa fn_base_validar_risco');
select is(has_function_privilege('authenticated', 'public.fn_base_homologar_risco(uuid, text)', 'execute'), false,
          '10. authenticated não executa fn_base_homologar_risco');
select is(has_function_privilege('authenticated', 'public.fn_trava_risco_critico(uuid)', 'execute'), false,
          '10. authenticated não executa fn_trava_risco_critico');
select is(has_function_privilege('anon', 'public.fn_trava_risco_critico(uuid)', 'execute'), false,
          '10. anon não executa fn_trava_risco_critico');
select is(has_function_privilege('authenticated', 'public.validar_risco(uuid, text)', 'execute'), true,
          '10. authenticated continua executando validar_risco');
select is((select prosecdef from pg_proc where oid = 'public.salvar_ficha_risco(jsonb)'::regprocedure), false,
          '10. salvar_ficha_risco continua SECURITY INVOKER (a RLS de quem grava vale)');

select * from finish();
rollback;
