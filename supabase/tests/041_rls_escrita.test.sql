-- ============================================================================
-- TESTE DA RLS DE ESCRITA (pgTAP) — Etapa B1, Tarefa 6
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Regra de ouro da matriz de acesso (seção 2): "quem está acima lê, valida ou
-- homologa, mas NÃO reescreve a ficha da unidade de baixo" (Metodologia 4.6).
-- Cada pessoa grava só na PRÓPRIA unidade (e nas subunidades internas dela:
-- Divisão, Serviço, Setor, Base Avançada — decisão P8).
--
-- Como a RLS "responde" quando barra uma gravação?
--   - INSERT fora do alcance  → ERRO 42501 ("new row violates row-level
--     security policy"). Testamos com throws_ok(..., '42501', ...).
--   - UPDATE/DELETE fora do alcance → NENHUM erro: a linha simplesmente não é
--     encontrada e 0 linhas mudam. Testamos com pg_temp.linhas_afetadas(...).
--   - UPDATE que tenta LEVAR a linha para fora do alcance (trocar a unidade ou
--     o objeto) → ERRO 42501 (a linha nova não passa no WITH CHECK).
--
-- Também conferimos:
--   - a exceção da CGOV (cria objeto em qualquer unidade; cria e edita risco
--     `preliminar_cgov`, mas não edita o risco `rascunho` da unidade);
--   - que ninguém muda `status_fluxo` por UPDATE direto (só as funções do fluxo
--     da Tarefa 7, que ligam o sinal `radar.fluxo`);
--   - que o gatilho de cálculo (Quadros 6, 7 e 8) continua funcionando;
--   - DAR (`categorias_risco`) só a CGOV grava; `perfis_usuarios` só a CGOV
--     lê (de outras pessoas) e grava.
--
-- ATENÇÃO para a Tarefa 7: os UPDATEs "que devem passar" usam só riscos em
-- `rascunho` ou `preliminar_cgov` (ou criados aqui), porque a Tarefa 7 vai
-- travar a edição em `em_validacao_cg`/`em_homologacao_dir` e reabrir o fluxo
-- quando um `aprovado` for editado.
--
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(76);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
-- Ids das unidades e dos riscos da semente.
select
  (select id from public.unidades where icmbio_id = '21.0078') as flona_cacador,  -- UC com CT (GR5)
  (select id from public.unidades where icmbio_id = '21.0070') as esec_taim,      -- UC vizinha (GR5)
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-CT')  as r_uc_ct,   -- rascunho, FLONA de Caçador
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as r_uc_sct,  -- FLONA do Tapajós
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-BASE')   as r_base,    -- rascunho, BAV Belterra
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CGPRO')  as r_cgpro,
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-CENTRO') as r_centro,  -- rascunho, CNPT
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-AUDIT')  as r_audit,   -- rascunho, AUDIT
  (select count(*) from public.perfis_usuarios) as total_perfis
\gset

-- Um objeto e um risco na UC VIZINHA (ESEC do Taim), que a semente não tem.
-- Objetos da semente: ...b000-0000000000NN (01 FLONA de Caçador, 02 FLONA do
-- Tapajós, 03 BAV Belterra, 04 CT, 05 GR5, 06 COFIS, 07 CGPRO, 08 CNPT,
-- 09 CGOV, 10 AUDIT). O 11 é criado aqui.
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000011', 'Unidade', 'Teste 041 — ESEC do Taim (vizinha)',
        :'esec_taim', 'Objetivo de demonstração');

-- inserir_risco(objeto, código, estado): INSERT de um risco com os campos
-- mínimos, feito por QUEM ESTIVER LOGADO (a RLS vale). O gatilho de cálculo
-- preenche inerente, residual e classificação.
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text,
                                                 p_status text default 'rascunho')
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, categoria_id, probabilidade, impacto, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 2, 2, 2, p_status);
$$;

-- O risco da vizinha (criado como administrador) + um controle e um KRI nele.
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000011', 'RADAR-T041-TAIM');
select (select id from public.riscos where codigo_radar = 'RADAR-T041-TAIM') as r_taim \gset
insert into public.controles_existentes (id, risco_id, descricao_controle, evidencia_funcionamento)
values ('00000000-0000-4000-c000-000000000011', :'r_taim', 'Controle da vizinha', 'Evidência');
insert into public.indicadores_kri
  (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo,
   limite_alerta, responsavel_medicao)
values ('00000000-0000-4000-d000-000000000011', :'r_taim', 'KRI da vizinha', 'a / b', 'Planilha',
        'Mensal', '0', '1', 'Gestor');

-- ----------------------------------------------------------------------------
-- 1. Gestores: gravam na própria unidade; na vizinha, erro ou 0 linhas
-- ----------------------------------------------------------------------------
-- gestor.uc@ — FLONA de Caçador
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa revista' where id = %L$$, :'r_uc_ct')),
          1, 'gestor.uc edita o risco da própria UC');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_taim')),
          0, 'gestor.uc NÃO edita o risco da UC vizinha (0 linhas)');
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'r_taim')),
          0, 'gestor.uc NÃO apaga o risco da UC vizinha (0 linhas)');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-UC')$$,
                'gestor.uc cria risco na própria UC');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000011', 'RADAR-T041-UC-X')$$,
                 '42501', null, 'gestor.uc NÃO cria risco na UC vizinha (erro 42501)');

-- gestor.uc-sem-ct@ — FLONA do Tapajós: grava também na Base (subunidade interna, P8)
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa revista' where id = %L$$, :'r_base')),
          1, 'gestor.uc-sem-ct edita o risco da Base Avançada da UC (P8)');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'gestor.uc-sem-ct NÃO edita o risco de outra UC');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000002', 'RADAR-T041-SCT')$$,
                'gestor.uc-sem-ct cria risco na própria UC');

-- gestor.base@ — BAV Belterra: não grava na UC-mãe
select pg_temp.entrar_como('gestor.base@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa revista' where id = %L$$, :'r_base')),
          1, 'gestor.base edita o risco da própria Base');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_sct')),
          0, 'gestor.base NÃO edita o risco da UC-mãe');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000002', 'RADAR-T041-BASE-X')$$,
                 '42501', null, 'gestor.base NÃO cria risco na UC-mãe');

-- coord.cofis@ — COFIS: não grava na CGPRO (unidade de cima)
select pg_temp.entrar_como('coord.cofis@radar.test');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000006', 'RADAR-T041-COFIS')$$,
                'coord.cofis cria risco na COFIS');
select is(pg_temp.linhas_afetadas($$update public.riscos set causas = 'causa revista' where codigo_radar = 'RADAR-T041-COFIS'$$),
          1, 'coord.cofis edita o risco que criou na COFIS');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000007', 'RADAR-T041-COFIS-X')$$,
                 '42501', null, 'coord.cofis NÃO cria risco na CGPRO');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_cgpro')),
          0, 'coord.cofis NÃO edita o risco da CGPRO');

-- centro@ — CNPT
select pg_temp.entrar_como('centro@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa revista' where id = %L$$, :'r_centro')),
          1, 'centro edita o risco do próprio Centro');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000010', 'RADAR-T041-CENTRO-X')$$,
                 '42501', null, 'centro NÃO cria risco na AUDIT');

-- servidor.gr@ — gestor (não titular) na GR5: grava na GR5, lê a UC mas não grava nela
select pg_temp.entrar_como('servidor.gr@radar.test');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000005', 'RADAR-T041-GR5')$$,
                'servidor.gr cria risco na GR5 (própria unidade)');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'servidor.gr NÃO edita o risco da UC (só lê)');

-- ----------------------------------------------------------------------------
-- 2. Chefias: leem, mas não reescrevem a ficha de baixo
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gr@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'gr NÃO edita o risco da UC (0 linhas)');
select is(pg_temp.linhas_afetadas(format($$delete from public.riscos where id = %L$$, :'r_uc_ct')),
          0, 'gr NÃO apaga o risco da UC');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-GR-X')$$,
                 '42501', null, 'gr NÃO cria risco na UC');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000005', 'RADAR-T041-GR')$$,
                'gr cria risco na própria GR');

select pg_temp.entrar_como('ct@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'ct NÃO edita o risco da UC vinculada');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000004', 'RADAR-T041-CT')$$,
                'ct cria risco na própria CT');

select pg_temp.entrar_como('cg.cgpro@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_sct')),
          0, 'cg.cgpro NÃO edita o risco da UC lido pela visão por processo');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000006', 'RADAR-T041-CG-X')$$,
                 '42501', null, 'cg.cgpro NÃO cria risco na COFIS (Coordenação não é subunidade interna)');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000007', 'RADAR-T041-CG')$$,
                'cg.cgpro cria risco na própria CGPRO');

select pg_temp.entrar_como('diretor.dibio@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_centro')),
          0, 'diretor.dibio NÃO edita o risco do Centro (lê e homologa, não reescreve)');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000008', 'RADAR-T041-DIR-X')$$,
                 '42501', null, 'diretor.dibio NÃO cria risco no Centro');

-- ----------------------------------------------------------------------------
-- 3. AUDIT: só grava na própria AUDIT (3ª linha, avaliação independente)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('auditor@radar.test');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'causa revista' where id = %L$$, :'r_audit')),
          1, 'auditor edita o risco da própria AUDIT');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'auditor NÃO edita risco fora da AUDIT');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-AUD-X')$$,
                 '42501', null, 'auditor NÃO cria risco fora da AUDIT');
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                          values (%L, 'controle', 'evidência')$$, :'r_uc_ct'),
                 '42501', null, 'auditor NÃO cria controle em risco fora da AUDIT');

-- ----------------------------------------------------------------------------
-- 4. CGOV: exceção dos riscos preliminares (spec 7.1) e do catálogo de objetos
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-PRE', 'preliminar_cgov')$$,
                'cgov cria risco preliminar_cgov numa UC');
select is(pg_temp.linhas_afetadas($$update public.riscos set causas = 'causa revista pela CGOV' where codigo_radar = 'RADAR-T041-PRE'$$),
          1, 'cgov edita o risco preliminar_cgov enquanto ele está nesse estado');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-CGOV-X', 'rascunho')$$,
                 '42501', null, 'cgov NÃO cria risco rascunho numa UC (só preliminar_cgov)');
select is(pg_temp.linhas_afetadas(format($$update public.riscos set causas = 'invasão' where id = %L$$, :'r_uc_ct')),
          0, 'cgov NÃO edita o risco rascunho da UC');
select lives_ok($$insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
                  values ('00000000-0000-4000-b000-0000000000c1', 'Processo', 'Teste 041 — objeto criado pela CGOV',
                          (select id from public.unidades where icmbio_id = '21.0078'), 'Objetivo de demonstração')$$,
                'cgov cria objeto numa UC (catálogo de objetos)');
select is(pg_temp.linhas_afetadas($$update public.objetos_contexto set nome_objeto = 'renomeado'
                                     where id = '00000000-0000-4000-b000-0000000000c1'$$),
          0, 'cgov NÃO edita o objeto depois de criado (ele é da UC — R19)');

-- O gestor da UC edita o objeto criado pela CGOV (é da unidade dele)...
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas($$update public.objetos_contexto set nome_objeto = 'Objeto assumido pela UC'
                                     where id = '00000000-0000-4000-b000-0000000000c1'$$),
          1, 'gestor.uc edita o objeto que a CGOV criou na UC dele');
-- ...e o risco preliminar da CGOV na UC dele (a unidade pode prepará-lo para assumir).
select is(pg_temp.linhas_afetadas($$update public.riscos set causas = 'revista pela UC' where codigo_radar = 'RADAR-T041-PRE'$$),
          1, 'gestor.uc edita o risco preliminar_cgov da própria UC');

-- ----------------------------------------------------------------------------
-- 5. Objetos: criar só na própria unidade; ninguém "leva" a linha para fora
-- ----------------------------------------------------------------------------
select lives_ok($$insert into public.objetos_contexto (tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
                  values ('Processo', 'Teste 041 — objeto da UC', (select id from public.unidades where icmbio_id = '21.0078'),
                          'Objetivo de demonstração')$$,
                'gestor.uc cria objeto na própria UC');
select throws_ok($$insert into public.objetos_contexto (tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
                   values ('Processo', 'Teste 041 — invasão', (select id from public.unidades where icmbio_id = '21.0070'),
                           'Objetivo de demonstração')$$,
                 '42501', null, 'gestor.uc NÃO cria objeto em outra unidade');
select throws_ok(format($$update public.objetos_contexto set unidade_id = %L
                          where id = '00000000-0000-4000-b000-000000000001'$$, :'esec_taim'),
                 '42501', null, 'gestor.uc NÃO "move" o próprio objeto para outra unidade (WITH CHECK)');
select throws_ok(format($$update public.riscos set objeto_id = '00000000-0000-4000-b000-000000000011' where id = %L$$, :'r_uc_ct'),
                 '42501', null, 'gestor.uc NÃO "move" o próprio risco para o objeto da vizinha');
select is(pg_temp.linhas_afetadas($$update public.objetos_contexto set nome_objeto = 'invasão'
                                     where id = '00000000-0000-4000-b000-000000000011'$$),
          0, 'gestor.uc NÃO edita o objeto da vizinha');

-- ----------------------------------------------------------------------------
-- 6. Controles, KRIs, medições e respostas seguem o objeto do risco
-- ----------------------------------------------------------------------------
select lives_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                         values (%L, 'controle da UC', 'evidência')$$, :'r_uc_ct'),
                'gestor.uc cria controle no risco da própria UC');
select throws_ok(format($$insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
                          values (%L, 'controle', 'evidência')$$, :'r_taim'),
                 '42501', null, 'gestor.uc NÃO cria controle no risco da vizinha');
select is(pg_temp.linhas_afetadas($$update public.controles_existentes set descricao_controle = 'invasão'
                                     where id = '00000000-0000-4000-c000-000000000011'$$),
          0, 'gestor.uc NÃO edita controle da vizinha');
select lives_ok(format($$insert into public.respostas_tratamento
                           (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
                         values (%L, 'Mitigar', 'ação', 'responsável', date '2027-06-30', 'como')$$, :'r_uc_ct'),
                'gestor.uc cria resposta (5W2H) no risco da própria UC');
select throws_ok(format($$insert into public.respostas_tratamento
                            (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
                          values (%L, 'Mitigar', 'ação', 'responsável', date '2027-06-30', 'como')$$, :'r_taim'),
                 '42501', null, 'gestor.uc NÃO cria resposta no risco da vizinha');
select lives_ok(format($$insert into public.indicadores_kri
                           (id, risco_id, nome_indicador, formula_calculo, fonte_dados, periodicidade,
                            meta_alvo, limite_alerta, responsavel_medicao)
                         values ('00000000-0000-4000-d000-000000000001', %L, 'KRI da UC', 'a / b', 'Planilha',
                                 'Mensal', '0', '1', 'Gestor')$$, :'r_uc_ct'),
                'gestor.uc cria KRI no risco da própria UC');
select lives_ok($$insert into public.medicoes_kri (kri_id, valor_apurado)
                  values ('00000000-0000-4000-d000-000000000001', '0,5')$$,
                'gestor.uc registra medição no KRI da própria UC');
select throws_ok($$insert into public.medicoes_kri (kri_id, valor_apurado)
                   values ('00000000-0000-4000-d000-000000000011', '9')$$,
                 '42501', null, 'gestor.uc NÃO registra medição no KRI da vizinha');

-- historico_fluxo: só as funções do fluxo (Tarefa 7) gravam; ninguém grava direto.
select throws_ok(format($$insert into public.historico_fluxo (risco_id, etapa, acao, usuario_nome, usuario_papel)
                          values (%L, 'aprovado', 'aprovação forjada', 'eu', 'gestor')$$, :'r_uc_ct'),
                 '42501', null, 'gestor.uc NÃO grava direto no histórico do fluxo');

-- ----------------------------------------------------------------------------
-- 7. status_fluxo NÃO muda por UPDATE direto (só pelas funções do fluxo)
-- ----------------------------------------------------------------------------
select throws_like(format($$update public.riscos set status_fluxo = 'aprovado' where id = %L$$, :'r_uc_ct'),
                   'RADAR:%status_fluxo%', 'gestor.uc NÃO aprova o próprio risco por UPDATE direto');
select pg_temp.entrar_como('cgov@radar.test');
select throws_like($$update public.riscos set status_fluxo = 'rascunho' where codigo_radar = 'RADAR-T041-PRE'$$,
                   'RADAR:%status_fluxo%', 'cgov NÃO tira o risco de preliminar_cgov por UPDATE direto');

-- Nem o administrador (postgres) muda o estado "na mão"...
select pg_temp.sair();
select throws_like(format($$update public.riscos set status_fluxo = 'aprovado' where id = %L$$, :'r_uc_ct'),
                   'RADAR:%status_fluxo%', 'nem o administrador muda status_fluxo por UPDATE direto');
-- ...a não ser com o sinal das funções do fluxo (Tarefa 7): set_config('radar.fluxo','on',true).
select set_config('radar.fluxo', 'on', true);
select is(pg_temp.linhas_afetadas(format($$update public.riscos set status_fluxo = 'em_validacao_cg' where id = %L$$, :'r_uc_ct')),
          1, 'com o sinal radar.fluxo = on (funções do fluxo), a mudança de estado passa');
select set_config('radar.fluxo', '', true);

-- O gatilho novo não atrapalha o cálculo: P=1, I=5 → 15 (Quadro 7, assimétrico).
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas($$update public.riscos set probabilidade = 1, impacto = 5 where codigo_radar = 'RADAR-T041-UC'$$),
          1, 'gestor.uc altera P e I do próprio risco');
select is((select nivel_inerente from public.riscos where codigo_radar = 'RADAR-T041-UC'), 15,
          'o gatilho de cálculo continua valendo: P=1, I=5 → 15');

-- ----------------------------------------------------------------------------
-- 8. DAR (categorias_risco): só a CGOV grava
-- ----------------------------------------------------------------------------
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set justificativa_dar = 'mudança indevida' where id = 2$$),
          0, 'gestor.uc NÃO altera a DAR (categorias_risco)');
select throws_ok($$insert into public.categorias_risco (nome, descricao_normativa) values ('Categoria indevida', 'x')$$,
                 '42501', null, 'gestor.uc NÃO cria categoria');
select pg_temp.entrar_como('diretor.dibio@radar.test');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set justificativa_dar = 'mudança indevida' where id = 2$$),
          0, 'diretor NÃO altera a DAR direto (ela é aprovada no Comitê; a CGOV registra)');
select pg_temp.entrar_como('cgov@radar.test');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set justificativa_dar = 'Simulação da CGOV (teste 041)' where id = 2$$),
          1, 'cgov altera a DAR (simular e propor)');
-- Desde a LAC-14 (migração 20261122001) o nome da categoria só pode ser um
-- dos 8 do Quadro 2 (CHECK categorias_risco_nome_quadro_2), e os 8 já estão
-- gravados. Então nem a CGOV cria categoria nova: a RLS deixa, o CHECK
-- recusa (23514). (O acerto do contador de ids, que este teste conferia,
-- agora é conferido no 090: o próximo id é 12.)
select throws_ok($$insert into public.categorias_risco (nome, descricao_normativa) values ('Categoria de teste 041', 'x')$$,
                 '23514', null, 'cgov não cria categoria fora do Quadro 2 (CHECK do nome)');

-- ----------------------------------------------------------------------------
-- 9. perfis_usuarios: cada um lê a própria linha; só a CGOV lê e grava todas
-- ----------------------------------------------------------------------------
select is((select count(*) from public.perfis_usuarios), :'total_perfis'::bigint, 'cgov lê todos os perfis');
select is(pg_temp.linhas_afetadas($$update public.perfis_usuarios set cargo = 'Chefe da UC (revisado)'
                                     where email = 'gestor.uc@radar.test'$$),
          1, 'cgov altera o perfil de outra pessoa (P6)');

select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*) from public.perfis_usuarios), 1::bigint, 'gestor.uc lê só o próprio perfil');
select is((select email from public.perfis_usuarios), 'gestor.uc@radar.test', '... e é mesmo o dele');
select is(pg_temp.linhas_afetadas($$update public.perfis_usuarios set papel_governanca = 'cgov'
                                     where email = 'gestor.uc@radar.test'$$),
          0, 'gestor.uc NÃO se promove a cgov (não grava nem o próprio perfil)');
select is(pg_temp.linhas_afetadas($$update public.perfis_usuarios set ativo = false
                                     where email = 'gr@radar.test'$$),
          0, 'gestor.uc NÃO altera o perfil de outra pessoa');

select pg_temp.entrar_como('auditor@radar.test');
select is((select count(*) from public.perfis_usuarios), 1::bigint, 'auditor (alcance total) lê só o próprio perfil');

-- ----------------------------------------------------------------------------
-- 10. Sem perfil não grava nada; TRUNCATE (que ignora a RLS) não é concedido
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('sem-perfil@radar.test');
select throws_ok($$select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T041-SP-X')$$,
                 '42501', null, 'sem-perfil NÃO cria risco');
select pg_temp.sair();
select is(
  (select count(*)::int from unnest(array['riscos', 'objetos_contexto', 'controles_existentes', 'respostas_tratamento',
                                          'indicadores_kri', 'medicoes_kri', 'historico_fluxo', 'auditoria_log',
                                          'categorias_risco', 'perfis_usuarios', 'unidades', 'processos_cadeia_valor']) t
    where has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE')
       or has_table_privilege('anon', 'public.' || t, 'TRUNCATE')),
  0, 'ninguém logado (nem anon) pode TRUNCATE (o TRUNCATE passaria por cima da RLS)');

select * from finish();
rollback;
