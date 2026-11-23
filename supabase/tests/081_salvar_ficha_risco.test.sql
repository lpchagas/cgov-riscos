-- ============================================================================
-- TESTE DA ETAPA B3, TAREFA 3 (pgTAP) — salvar_ficha_risco(ficha jsonb)
-- ============================================================================
-- Regra (spec §6.2): a tela grava a ficha INTEIRA (risco + controles +
-- respostas 5W2H + KRIs) num ÚNICO comando, pela função salvar_ficha_risco.
-- Ela roda com as permissões de quem está logado (SECURITY INVOKER): a RLS, as
-- travas do fluxo, o gatilho de cálculo e a trilha de auditoria valem como num
-- UPDATE comum. Na criação, ela gera o código RADAR-<ano>-<NNN>.
--
-- O que este arquivo prova:
--   (a)/(b) criar ficha com filhos; o número do código novo é MAIOR que o de
--           todos os códigos RADAR-<ano>-<NNN> já gravados (a semente tem
--           RADAR-2026-001) e a sequência já está acima deles; o seguinte é maior;
--   (c) risco APROVADO: mudar P e trocar os controles numa chamada → reabre
--       UMA vez (uma linha reaberto_mudanca_nota) e troca os filhos;
--   (d) a MESMA alteração em dois UPDATEs separados é recusada no 2º (55000) —
--       é o motivo de a função existir;
--   (e) uma recusa no meio desfaz tudo;
--   (f) preliminar_cgov: só a CGOV; (g) quem não grava no objeto → 42501;
--   (h) valores calculados enviados no JSON são ignorados (e o fator segue o
--       Quadro 6, com a trava de evidência);
--   (i) anon não executa; filho de OUTRO risco é recusado (22023).
--
-- ATENÇÃO: a sequência riscos_codigo_seq NÃO volta no rollback (sequências
-- nunca voltam). Por isso o teste (b) não espera um número fixo (ex.: 002):
-- compara com o maior número já gravado, e passa mesmo rodando o arquivo
-- várias vezes seguidas sem `db:reset`.
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(53);

-- Ano corrente pelo horário de Brasília (o mesmo que a função usa), o maior
-- NNN entre os códigos RADAR-<4 dígitos>-<NNN> já gravados, e ids da semente.
select extract(year from (now() at time zone 'America/Sao_Paulo'))::int as ano,
       (select coalesce(max((regexp_match(codigo_radar, '^RADAR-\d{4}-(\d+)$'))[1]::int), 0)
          from public.riscos) as maior_nnn,
       (select id from public.riscos where codigo_radar = 'RADAR-DEMO-COFIS') as r_cofis,
       (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CGPRO') as r_cgpro,
       (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT') as r_uc_ct
\gset

-- LAC-13 e LAC-03 (migrações 20261122002 e 20261122004): o risco crítico só
-- anda no fluxo com ação 5W2H e KRI completo. Na semente, só os riscos
-- críticos têm ação e KRI (seção 5b); os outros não têm. Este teste prova
-- OUTRAS regras; damos a todos o tratamento mínimo (ajudantes.psql). A trava
-- é provada em 100_lac13_trava_critico.test.sql e 110_lac03_kri_obrigatorio.test.sql.
select pg_temp.dar_tratamento_a_todos();

-- ficha_base(objeto): os campos de entrada obrigatórios de uma ficha nova.
-- P=2 e I=3 → Quadro 7 = 9 (Médio). Categoria 2 = a mesma dos riscos da semente.
create or replace function pg_temp.ficha_base(p_objeto uuid)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'objeto_id', p_objeto,
    'responsavel_risco_nome', 'Responsável fictício',
    'causas', 'falta de manual do processo',
    'evento_risco', 'erro na execução da rotina',
    'consequencias', 'retrabalho e atraso',
    'objetivo_afetado', 'objetivo de demonstração',
    'categoria_id', 2,
    'probabilidade', 2,
    'impacto', 3);
$$;

-- ----------------------------------------------------------------------------
-- 0. A função existe com o formato combinado
-- ----------------------------------------------------------------------------
select has_function('public', 'salvar_ficha_risco', array['jsonb'], 'salvar_ficha_risco(jsonb) existe');
select is((select prosecdef from pg_proc where oid = 'public.salvar_ficha_risco(jsonb)'::regprocedure),
          false, 'roda como quem está logado (SECURITY INVOKER)');
select has_sequence('public', 'riscos_codigo_seq', 'sequência riscos_codigo_seq existe');

-- ----------------------------------------------------------------------------
-- (a) e (b) gestor.uc@ cria ficha com 2 controles, 1 resposta e 1 KRI
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');

select f.id as r_a, f.codigo_radar as cod_a
  from public.salvar_ficha_risco(pg_temp.ficha_base('00000000-0000-4000-b000-000000000001') || jsonb_build_object(
    'controles', jsonb_build_array(
      jsonb_build_object('descricao_controle', 'Checklist da rotina', 'evidencia_funcionamento', 'Relatório mensal'),
      jsonb_build_object('descricao_controle', 'Dupla conferência', 'evidencia_funcionamento', 'Assinaturas',
                         'possui_evidencia_comprovada', true)),
    'respostas', jsonb_build_array(
      jsonb_build_object('estrategia', 'Mitigar', 'acao_o_que', 'Escrever o manual', 'responsavel_quem', 'Chefe da UC',
                         'prazo_quando', '2026-12-31', 'procedimento_como', 'Oficina com a equipe')),
    'kris', jsonb_build_array(
      jsonb_build_object('nome_indicador', 'Erros por mês', 'formula_calculo', 'contagem', 'fonte_dados', 'Planilha',
                         'periodicidade', 'Mensal', 'meta_alvo', '0', 'limite_alerta', '2',
                         'responsavel_medicao', 'Chefe da UC')))) as f
\gset

select matches(:'cod_a'::text, format('^RADAR-%s-\d{3,}$', :ano), '(a) código no padrão RADAR-<ano atual>-<NNN>');
select cmp_ok(substring(:'cod_a' from '(\d+)$')::int, '>', :maior_nnn,
              '(b) NNN do código novo é maior que o de todos os códigos RADAR-<ano>-<NNN> já gravados');
select pg_temp.sair();
select cmp_ok((select last_value from public.riscos_codigo_seq)::int, '>=', :maior_nnn,
              '(b) a sequência está acima do maior NNN já gravado (ajuste da semente)');

select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_a'), 'rascunho', '(a) ficha nova nasce em rascunho');
select is((select codigo_radar from public.riscos where id = :'r_a'), :'cod_a', '(a) código devolvido é o gravado');
select is((select count(*)::int from public.controles_existentes where risco_id = :'r_a'), 2, '(a) 2 controles gravados');
select is((select count(*)::int from public.respostas_tratamento where risco_id = :'r_a'), 1, '(a) 1 resposta gravada');
select is((select count(*)::int from public.kri_riscos where risco_id = :'r_a'), 1, '(a) 1 KRI gravado e ligado ao risco');
select is((select custo_quanto from public.respostas_tratamento where risco_id = :'r_a'), 'Sem custo adicional',
          '(a) coluna omitida do filho recebe o valor padrão da tabela');
select is((select count(*)::int from public.controles_existentes where risco_id = :'r_a' and possui_evidencia_comprovada),
          1, '(a) colunas do controle gravadas como enviadas');

-- O código seguinte é maior.
select pg_temp.entrar_como('gestor.uc@radar.test');
select f.id as r_a2, f.codigo_radar as cod_a2
  from public.salvar_ficha_risco(pg_temp.ficha_base('00000000-0000-4000-b000-000000000001')) as f
\gset
select cmp_ok(substring(:'cod_a2' from '(\d+)$')::int, '>', substring(:'cod_a' from '(\d+)$')::int,
              '(a) o código seguinte é maior');

-- ----------------------------------------------------------------------------
-- Sincronização dos filhos numa ficha existente (rascunho)
-- ----------------------------------------------------------------------------
select pg_temp.sair();
select (select id from public.controles_existentes where risco_id = :'r_a' and possui_evidencia_comprovada) as c_fica,
       (select id from public.respostas_tratamento where risco_id = :'r_a') as resp_a,
       (select kri_id from public.kri_riscos where risco_id = :'r_a') as kri_a
\gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
    'id', :'r_a',
    'causas', 'falta de manual revisada',
    'controles', jsonb_build_array(
      jsonb_build_object('id', :'c_fica', 'descricao_controle', 'Dupla conferência (revista)'),
      jsonb_build_object('descricao_controle', 'Controle novo', 'evidencia_funcionamento', 'Ata')),
    'kris', jsonb_build_array())),
  'sincroniza: atualiza 1 controle, insere 1, apaga 1; lista de KRIs vazia; respostas ausentes');

select pg_temp.sair();
select is((select count(*)::int from public.controles_existentes where risco_id = :'r_a'), 2,
          'sincroniza: continuam 2 controles (1 apagado, 1 novo)');
select is((select descricao_controle from public.controles_existentes where id = :'c_fica'), 'Dupla conferência (revista)',
          'sincroniza: controle com id foi atualizado');
select is((select evidencia_funcionamento from public.controles_existentes where id = :'c_fica'), 'Assinaturas',
          'sincroniza: chave omitida no filho mantém o valor anterior');
select is((select count(*)::int from public.controles_existentes
            where risco_id = :'r_a' and descricao_controle = 'Checklist da rotina'), 0,
          'sincroniza: controle que saiu da lista foi apagado');
select is((select count(*)::int from public.kri_riscos where risco_id = :'r_a'), 0,
          'sincroniza: lista vazia desliga todos os KRIs');
select is((select count(*)::int from public.indicadores_kri where id = :'kri_a'), 0,
          'sincroniza: o KRI que ficou sem nenhum risco (órfão) foi apagado');
select is((select count(*)::int from public.respostas_tratamento where id = :'resp_a'), 1,
          'sincroniza: chave ausente (respostas) não mexe naquele grupo');
select is((select causas from public.riscos where id = :'r_a'), 'falta de manual revisada',
          'atualiza o campo de entrada do risco');
select ok((select descricao_padrao from public.riscos where id = :'r_a') like 'Devido o(a) falta de manual revisada,%',
          'gatilho de cálculo refaz a descrição padrão');

-- Filho de OUTRO risco não pode ser "puxado" para este: recusa 22023.
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
    'id', :'r_a2',
    'respostas', jsonb_build_array(jsonb_build_object('id', :'resp_a', 'acao_o_que', 'roubada')))),
  '22023', null, 'filho com id de outro risco é recusado (22023)');
select pg_temp.sair();
select is((select risco_id from public.respostas_tratamento where id = :'resp_a'), :'r_a'::uuid,
          'filho de outro risco continua no risco dele');

-- ----------------------------------------------------------------------------
-- (c) Risco APROVADO: o titular da COFIS muda P e troca os controles numa chamada
-- ----------------------------------------------------------------------------
-- Preparação (como administrador): um controle "antigo" no risco aprovado.
-- O sinal radar.fluxo = 'on' deixa a preparação passar sem reabrir o risco
-- (senão o próprio INSERT da preparação já o reabriria).
select set_config('radar.fluxo', 'on', true);
insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
values ('00000000-0000-4000-c000-000000000081', :'r_cofis', 'Controle antigo da COFIS', 'Relatório');
select set_config('radar.fluxo', '', true);
select is((select status_fluxo from public.riscos where id = :'r_cofis'), 'aprovado',
          '(c) preparação: RADAR-DEMO-COFIS continua aprovado');

select pg_temp.entrar_como('coord.cofis@radar.test');
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
    'id', :'r_cofis',
    'probabilidade', 3,
    'controles', jsonb_build_array(
      jsonb_build_object('descricao_controle', 'Controle novo A', 'evidencia_funcionamento', 'Ata'),
      jsonb_build_object('descricao_controle', 'Controle novo B', 'evidencia_funcionamento', 'Painel')))),
  '(c) aprovado: muda P e troca controles numa só chamada');

select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_cofis'), 'em_validacao_cg',
          '(c) o risco aprovado foi reaberto para validação');
select is((select probabilidade from public.riscos where id = :'r_cofis'), 3, '(c) P gravada');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'r_cofis' and acao = 'reaberto_mudanca_nota'), 1,
          '(c) UMA linha reaberto_mudanca_nota no histórico');
select is((select count(*)::int from public.controles_existentes where risco_id = :'r_cofis'), 2,
          '(c) controles trocados: 2 novos');
select is((select count(*)::int from public.controles_existentes where id = '00000000-0000-4000-c000-000000000081'), 0,
          '(c) controle antigo apagado');

-- ----------------------------------------------------------------------------
-- (d) Sem a função: dois UPDATEs separados → o 2º é recusado (55000)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cg.cgpro@radar.test');
select lives_ok(format($$update public.riscos set probabilidade = 2 where id = %L$$, :'r_cgpro'),
          '(d) 1º comando: mudar P reabre o risco aprovado');
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                          values (%L, 'Controle em outro comando', 'Ata')$$, :'r_cgpro'),
          '55000', null, '(d) 2º comando separado: ficha travada (por isso a função existe)');

-- ----------------------------------------------------------------------------
-- (e) Recusa no meio desfaz tudo
-- ----------------------------------------------------------------------------
select pg_temp.sair();
select count(*)::int as riscos_antes, (select count(*)::int from public.controles_existentes) as ctrl_antes
  from public.riscos
\gset

select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
    pg_temp.ficha_base('00000000-0000-4000-b000-000000000001') || jsonb_build_object(
      'controles', jsonb_build_array(
        jsonb_build_object('descricao_controle', 'Controle que não deve ficar', 'evidencia_funcionamento', 'Ata')),
      'kris', jsonb_build_array(
        jsonb_build_object('nome_indicador', 'KRI inválido', 'formula_calculo', 'a', 'fonte_dados', 'b',
                           'periodicidade', 'Diária', 'meta_alvo', '0', 'limite_alerta', '1',
                           'responsavel_medicao', 'x')))),
  '23514', null, '(e) KRI com periodicidade Diária é recusado');

select pg_temp.sair();
select is((select count(*)::int from public.riscos), :riscos_antes, '(e) nenhum risco novo ficou gravado');
select is((select count(*)::int from public.controles_existentes), :ctrl_antes, '(e) nenhum controle novo ficou gravado');

-- ----------------------------------------------------------------------------
-- (f) preliminar_cgov: só a CGOV
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
    pg_temp.ficha_base('00000000-0000-4000-b000-000000000001') || '{"preliminar_cgov": true}'::jsonb),
  '42501', null, '(f) gestor.uc NÃO cria risco preliminar_cgov');

select pg_temp.entrar_como('cgov@radar.test');
select f.id as r_prelim
  from public.salvar_ficha_risco(pg_temp.ficha_base('00000000-0000-4000-b000-000000000002')
                                 || '{"preliminar_cgov": true}'::jsonb) as f
\gset
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_prelim'), 'preliminar_cgov',
          '(f) CGOV cria preliminar_cgov em objeto de outra unidade (FLONA do Tapajós)');
select is((select origem_preliminar_cgov from public.riscos where id = :'r_prelim'), true,
          '(f) risco preliminar marcado com origem_preliminar_cgov');

-- ----------------------------------------------------------------------------
-- (g) Quem não grava no objeto → 42501 (criar e alterar)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
    pg_temp.ficha_base('00000000-0000-4000-b000-000000000006')),
  '42501', null, '(g) gestor.uc NÃO cria ficha no objeto da COFIS');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
    jsonb_build_object('id', :'r_cgpro', 'causas', 'invasão')),
  '42501', null, '(g) gestor.uc NÃO altera ficha de risco de outra unidade');
select pg_temp.sair();
select isnt((select causas from public.riscos where id = :'r_cgpro'), 'invasão', '(g) a ficha alheia não mudou');

-- cgov@ LÊ o risco da FLONA de Caçador (rascunho) mas não grava nele. A
-- mensagem usa o código GRAVADO, nunca um "codigo_radar" enviado na ficha.
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$,
    jsonb_build_object('id', :'r_uc_ct', 'codigo_radar', 'RADAR-FALSO-999', 'causas', 'x')),
  '42501', 'RADAR: você não pode alterar a ficha do risco RADAR-DEMO-UC-CT.',
  '(g) recusa cita o código gravado, não o enviado no JSON');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- (h) Valores calculados enviados no JSON são ignorados
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select f.id as r_h
  from public.salvar_ficha_risco(pg_temp.ficha_base('00000000-0000-4000-b000-000000000001') || jsonb_build_object(
    'nivel_residual', 1, 'nivel_inerente', 1, 'classificacao_residual', 'Baixo',
    'fator_controle', 0.5, 'is_critico', true, 'status_fluxo', 'aprovado',
    'codigo_radar', 'RADAR-FALSO-001')) as f
\gset
select pg_temp.sair();
select is((select nivel_residual from public.riscos where id = :'r_h'), 9.00::numeric,
          '(h) nivel_residual vem do gatilho (P=2, I=3 → Quadro 7 = 9), não do JSON');
select is((select status_fluxo from public.riscos where id = :'r_h'), 'rascunho', '(h) status_fluxo do JSON é ignorado');
select isnt((select codigo_radar from public.riscos where id = :'r_h'), 'RADAR-FALSO-001', '(h) codigo_radar do JSON é ignorado');

-- O fator segue o Quadro 6 a partir da eficácia; sem evidência, trava em Fraco.
select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
    'id', :'r_h', 'nivel_eficacia_controle', 'Forte', 'possui_evidencia_controle', true)),
  '(h) eficácia Forte com evidência');
select pg_temp.sair();
select is((select nivel_residual from public.riscos where id = :'r_h'), 4.50::numeric,
          '(h) Forte com evidência → fator 0,5 → residual 9 × 0,5 = 4,5');
select pg_temp.entrar_como('gestor.uc@radar.test');
select lives_ok(format($$select public.salvar_ficha_risco(%L::jsonb)$$, jsonb_build_object(
    'id', :'r_h', 'nivel_eficacia_controle', 'Forte', 'possui_evidencia_controle', false)),
  '(h) eficácia Forte sem evidência');
select pg_temp.sair();
select is((select nivel_residual from public.riscos where id = :'r_h'), 8.10::numeric,
          '(h) Forte sem evidência → trava do Quadro 6 (Fraco, 0,9) → 9 × 0,9 = 8,1');

-- ----------------------------------------------------------------------------
-- (i) anon não executa
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como_anonimo();
select throws_ok($$select public.salvar_ficha_risco('{}'::jsonb)$$, '42501', null, '(i) anon não executa a função');
select pg_temp.sair();

select * from finish();
rollback;
