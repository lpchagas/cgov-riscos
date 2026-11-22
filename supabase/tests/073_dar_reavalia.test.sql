-- ============================================================================
-- TESTE DA ETAPA B1.1, TAREFA 4 (pgTAP) — DAR alterada reavalia os aprovados (P-B1-8)
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- O apetite da DAR (categorias_risco.apetite_declarado) só decide a
-- criticidade de um risco de residual MÉDIO (Quadro 8 + Anexo III):
--   Médio + apetite 'moderado' → dentro do apetite (não crítico);
--   Médio + apetite 'baixo'    → fora do apetite (Risco Crítico).
-- Regra P-B1-8: quando a CGOV muda o apetite de uma categoria, o banco
-- recalcula (pelo cálculo EXISTENTE) os riscos APROVADOS dela:
--   - os que passam a exigir homologação voltam para em_homologacao_dir,
--     com linha `reaberto_mudanca_dar` no histórico (autor = a CGOV);
--   - os que deixam de ser críticos só têm a criticidade atualizada e
--     continuam aprovados.
-- Riscos não aprovados e de outras categorias não mudam.
--
-- Exemplo usado abaixo: P=2, I=3 → inerente 9 (Quadro 7) → residual 9,00,
-- Médio (sem controle, fator 1,00).
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(52);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.unidades where icmbio_id = '10.0000') as presidencia,
  (select id from auth.users where email = 'cgov@radar.test')       as u_cgov,
  (select id from auth.users where email = 'presidente@radar.test') as u_presidente
\gset

-- LAC-13 e LAC-03 (migrações 20261122002 e 20261122004): o risco crítico só
-- anda no fluxo com ação 5W2H e KRI completo. Na semente, só os riscos
-- críticos têm ação e KRI (seção 5b); os outros não têm. Este teste prova
-- OUTRAS regras; damos a todos o tratamento mínimo (ajudantes.psql). A trava
-- é provada em 100_lac13_trava_critico.test.sql e 110_lac03_kri_obrigatorio.test.sql.
select pg_temp.dar_tratamento_a_todos();

-- Objeto na Presidência (para o caso "sem homologador efetivo").
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000073', 'Unidade', 'Teste 073 — Presidência',
        :'presidencia', 'Objetivo de demonstração');

-- inserir_risco(objeto, código, P, I, categoria, estado): o gatilho de cálculo
-- preenche inerente, residual e criticidade. O INSERT pode nascer em qualquer
-- estado (a trava de estado só vale para UPDATE).
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text, p_p int, p_i int,
                                                 p_cat int, p_status text)
returns void
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 'x', p_cat, p_p, p_i,
          0, 'Baixo', 0, 'Baixo', p_status);
  -- LAC-13: tratamento mínimo (ver pg_temp.dar_tratamento em ajudantes.psql).
  select pg_temp.dar_tratamento(r.id) from public.riscos r where r.codigo_radar = p_codigo;
$$;

-- Categorias "moderado" para C e G: depois da LAC-14 (2026-11-22) só a 2
-- (Operacional) tem apetite 'moderado' na semente; a 1 (Estratégico) e a 8
-- (Tecnologia da Informação), usadas antes, saíram do Quadro 2. Damos
-- 'moderado' às categorias 9 (Riscos da visitação) e 10 (Ocupacionais), que
-- nascem 'pendente_dar', só dentro deste teste (o rollback desfaz). Nenhum
-- risco aprovado usa essas categorias, então a reavaliação não mexe em nada.
update public.categorias_risco set apetite_declarado = 'moderado' where id in (9, 10);

-- FLONA de Caçador (objeto 01): homologa gr@ (GR5).
--   A: Médio, Operacional (2, moderado), APROVADO  → vira crítico → homologação
--   B: Médio, Operacional, RASCUNHO                → não muda (não aprovado)
--   C: Médio, Riscos da visitação (9, moderado), APROVADO → não muda (outra categoria)
--   D: Baixo, Operacional, APROVADO                → continua aprovado, não crítico
--   F: Médio, Orçamentário (3, baixo), APROVADO    → crítico; ao subir o apetite deixa de ser
--   G: Médio, Ocupacionais (10, moderado), APROVADO → moderado → pendente_dar (fica aprovado);
--                                                    depois 1ª publicação pendente_dar → baixo (crítico)
-- Presidência (objeto 73), enviado pelo próprio Presidente:
--   E: Médio, Operacional, APROVADO → vira crítico, mas não há homologador efetivo
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-A', 2, 3, 2, 'aprovado');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-B', 2, 3, 2, 'rascunho');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-C', 2, 3, 9, 'aprovado');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-D', 1, 2, 2, 'aprovado');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-F', 2, 3, 3, 'aprovado');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T073-G', 2, 3, 10, 'aprovado');
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000073', 'RADAR-T073-E', 2, 3, 2, 'aprovado');

select
  (select id from public.riscos where codigo_radar = 'RADAR-T073-A') as r_a,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-B') as r_b,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-C') as r_c,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-D') as r_d,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-E') as r_e,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-F') as r_f,
  (select id from public.riscos where codigo_radar = 'RADAR-T073-G') as r_g
\gset

-- E foi "enviado" pelo próprio Presidente (linha de envio no histórico).
insert into public.historico_fluxo (risco_id, etapa, acao, usuario_nome, usuario_papel, despacho_texto, usuario_id)
values (:'r_e', 'submissao_1a_linha', 'submetido', 'Presidente Fictício', 'presidencia', 'Envio de teste', :'u_presidente');

-- Fotografia dos riscos que NÃO podem mudar quando a categoria 2 mudar:
-- tudo que não é (aprovado E categoria 2). Guardamos o estado e quantas
-- linhas cada um tem na trilha de auditoria (now() é o mesmo dentro da
-- transação, então atualizado_em não serviria para detectar mudança).
create temp table _antes as
select r.id, r.status_fluxo, r.is_critico, r.status_critico,
       (select count(*) from public.auditoria_log a where a.registro_id = r.id) as n_trilha
  from public.riscos r
 where not (r.status_fluxo = 'aprovado' and r.categoria_id = 2);

-- Conferência do ponto de partida.
select is((select status_critico from public.riscos where id = :'r_a'), 'nao',
          'A (Médio, Operacional moderado) começa dentro do apetite');
select is((select is_critico from public.riscos where id = :'r_f'), true,
          'F (Médio, Orçamentário baixo) começa crítico');

-- ----------------------------------------------------------------------------
-- 1. Quem não é CGOV não muda a DAR (RLS: 0 linhas) e nada se mexe
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('gestor.uc@radar.test');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$),
          0, 'gestor.uc@ não altera o apetite da DAR (RLS)');
select pg_temp.entrar_como('gr@radar.test');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$),
          0, 'gr@ (titular de GR) também não altera a DAR');
select pg_temp.sair();
select is((select apetite_declarado from public.categorias_risco where id = 2), 'moderado',
          'apetite da categoria 2 continua moderado');
select is((select status_fluxo from public.riscos where id = :'r_a'), 'aprovado',
          'A continua aprovado após a tentativa barrada');

-- ----------------------------------------------------------------------------
-- 2. Mudar só o texto da DAR (sem mudar o apetite) não reavalia nada
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select is(pg_temp.linhas_afetadas($$update public.categorias_risco
  set justificativa_dar = 'Texto revisto (teste 073).' where id = 2$$), 1,
  'CGOV altera só a justificativa da categoria 2');
select pg_temp.sair();
select is((select count(*)::int from public.historico_fluxo where acao = 'reaberto_mudanca_dar'), 0,
          'mudar só o texto da DAR não gera reabertura');
select is((select status_fluxo from public.riscos where id = :'r_a'), 'aprovado',
          'A continua aprovado após mudança só do texto');

-- ----------------------------------------------------------------------------
-- 3. Apetite mais BAIXO: Operacional moderado → baixo (pela CGOV)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 2$$,
                'CGOV baixa o apetite da categoria Operacional (moderado → baixo)');
select pg_temp.sair();

-- A: passa a crítico → em_homologacao_dir (NÃO em_validacao_cg)
select is((select status_fluxo from public.riscos where id = :'r_a'), 'em_homologacao_dir',
          'A (aprovado, Médio) vira crítico e volta para em_homologacao_dir');
select is((select is_critico from public.riscos where id = :'r_a'), true, 'A: is_critico = true');
select is((select status_critico from public.riscos where id = :'r_a'), 'sim', 'A: status_critico = sim');
select is((select nivel_residual from public.riscos where id = :'r_a'), 9.00::numeric(5,2),
          'A: residual continua 9,00 (cálculo não mudou)');
select is((select count(*)::int from public.historico_fluxo
            where risco_id = :'r_a' and acao = 'reaberto_mudanca_dar' and etapa = 'reabertura_nota'), 1,
          'A: uma linha reaberto_mudanca_dar no histórico');
select is((select usuario_id from public.historico_fluxo where risco_id = :'r_a' and acao = 'reaberto_mudanca_dar'),
          :'u_cgov'::uuid, 'A: autor da linha do histórico é a CGOV (auth.uid())');
select is((select usuario_papel from public.historico_fluxo where risco_id = :'r_a' and acao = 'reaberto_mudanca_dar'),
          'cgov', 'A: papel do autor = cgov');
select ok((select despacho_texto ilike '%Operacional%' and despacho_texto ilike '%baixo%'
             from public.historico_fluxo where risco_id = :'r_a' and acao = 'reaberto_mudanca_dar'),
          'A: o texto do histórico cita a categoria e o apetite novo');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_a' and acao = 'reaberto_mudanca_nota'), 0,
          'A: NÃO passou pela reabertura por edição');
-- Trilha de auditoria: a mudança da DAR e a do risco, ambas com a CGOV como autora.
select is((select count(*)::int from public.auditoria_log
            where tabela_afetada = 'categorias_risco' and operacao = 'UPDATE'
              and dados_novos->>'id' = '2' and dados_novos->>'apetite_declarado' = 'baixo'
              and dados_anteriores->>'apetite_declarado' = 'moderado' and usuario_id = :'u_cgov'), 1,
          'trilha: a mudança do apetite da categoria 2 registrada com a CGOV');
select ok((select count(*) from public.auditoria_log
            where tabela_afetada = 'riscos' and registro_id = :'r_a' and usuario_id = :'u_cgov'
              and dados_anteriores->>'status_fluxo' = 'aprovado'
              and dados_novos->>'status_fluxo' = 'em_homologacao_dir') = 1,
          'trilha: a volta de A para homologação registrada com a CGOV');

-- E: crítico, mas o Presidente enviou → não há homologador efetivo. Mesmo
-- assim vai para a fila de homologação (a CGOV resolve) e o texto avisa.
select is((select status_fluxo from public.riscos where id = :'r_e'), 'em_homologacao_dir',
          'E (Presidência, enviado pelo Presidente) também vai para em_homologacao_dir');
select ok((select despacho_texto ilike '%não há homologador%'
             from public.historico_fluxo where risco_id = :'r_e' and acao = 'reaberto_mudanca_dar'),
          'E: o histórico registra que não há homologador efetivo');
select ok((select despacho_texto ilike '%CGOV pode devolver a ficha%'
             from public.historico_fluxo where risco_id = :'r_e' and acao = 'reaberto_mudanca_dar'),
          'E: o histórico indica a saída (a CGOV pode devolver a ficha à unidade)');

-- D: Baixo → continua aprovado, sem histórico
select is((select status_fluxo from public.riscos where id = :'r_d'), 'aprovado', 'D (Baixo) continua aprovado');
select is((select is_critico from public.riscos where id = :'r_d'), false, 'D continua não crítico');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_d'), 0, 'D: nenhuma linha de histórico');

-- B (rascunho), C (outra categoria) e todos os demais não aprovados/de outras
-- categorias: nada mudou (estado, criticidade e nenhuma linha nova na trilha).
select is((select status_critico from public.riscos where id = :'r_b'), 'nao',
          'B (rascunho) não foi recalculado: status_critico continua nao');
select is((select status_fluxo from public.riscos where id = :'r_c'), 'aprovado', 'C (outra categoria) continua aprovado');
select is((select count(*)::int
             from _antes a join public.riscos r on r.id = a.id
            where r.status_fluxo is distinct from a.status_fluxo
               or r.is_critico is distinct from a.is_critico
               or r.status_critico is distinct from a.status_critico
               or (select count(*) from public.auditoria_log l where l.registro_id = r.id) <> a.n_trilha), 0,
          'nenhum risco não aprovado ou de outra categoria foi tocado');

-- ----------------------------------------------------------------------------
-- 3b. Saída do impasse: a CGOV devolve o risco SEM homologador efetivo (E)
-- ----------------------------------------------------------------------------
-- Quem não é CGOV não usa essa saída (nem o Presidente, nem um titular qualquer).
select pg_temp.entrar_como('presidente@radar.test');
select throws_ok(format($$select public.devolver_risco(%L, 'Ajustar.')$$, :'r_e'), '42501', null,
                 'presidente@ não devolve E (ele é quem enviou; não há ator efetivo)');
select pg_temp.entrar_como('gr@radar.test');
select throws_ok(format($$select public.devolver_risco(%L, 'Ajustar.')$$, :'r_e'), '42501', null,
                 'gr@ (não CGOV) não devolve E');
-- A CGOV não devolve risco que TEM homologador efetivo (A → gr@).
select pg_temp.entrar_como('cgov@radar.test');
select throws_ok(format($$select public.devolver_risco(%L, 'Ajustar.')$$, :'r_a'), '42501', null,
                 'CGOV NÃO devolve A, que tem homologador efetivo (gr@)');
select throws_ok(format($$select public.devolver_risco(%L, '   ')$$, :'r_e'), '22023', null,
                 'CGOV: motivo continua obrigatório');
select is((select status_fluxo from public.devolver_risco(:'r_e', 'Reenviar por outro servidor da unidade.')),
          'devolvido', 'CGOV devolve E (sem homologador efetivo) → devolvido');
select pg_temp.sair();
select is((select usuario_id from public.historico_fluxo
            where risco_id = :'r_e' and acao = 'devolvido_ajuste' and etapa = 'devolucao_ajuste'),
          :'u_cgov'::uuid, 'E: devolução registrada no histórico com a CGOV como autora');
select is((select status_fluxo from public.riscos where id = :'r_a'), 'em_homologacao_dir',
          'A continua em homologação (a tentativa da CGOV foi recusada)');

-- O homologador de A (gr@, titular da GR5) homologa de novo → aprovado.
select pg_temp.entrar_como('gr@radar.test');
select is((select status_fluxo from public.homologar_risco(:'r_a', 'Ciente da nova DAR.')), 'aprovado',
          'gr@ homologa A novamente: em_homologacao_dir → aprovado');
select pg_temp.sair();

-- ----------------------------------------------------------------------------
-- 4. Apetite mais ALTO: Orçamentário baixo → moderado (F deixa de ser crítico)
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'moderado' where id = 3$$,
                'CGOV sobe o apetite da categoria Financeiro/Orçamentário (baixo → moderado)');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_f'), 'aprovado', 'F continua aprovado');
select is((select is_critico from public.riscos where id = :'r_f'), false, 'F: is_critico = false');
select is((select status_critico from public.riscos where id = :'r_f'), 'nao', 'F: status_critico = nao');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_f'), 0,
          'F: nenhuma linha de histórico (só a criticidade mudou)');
select ok((select count(*) from public.auditoria_log
            where tabela_afetada = 'riscos' and registro_id = :'r_f' and usuario_id = :'u_cgov'
              and dados_novos->>'is_critico' = 'false' and dados_anteriores->>'is_critico' = 'true') = 1,
          'trilha: a mudança de criticidade de F registrada com a CGOV');

-- ----------------------------------------------------------------------------
-- 5. pendente_dar: ir para pendente_dar sem virar crítico NÃO reabre;
--    a 1ª publicação da DAR que torna o risco crítico reabre
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'pendente_dar' where id = 10$$,
                'CGOV põe a categoria Ocupacionais em pendente_dar (moderado → pendente_dar)');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_g'), 'aprovado',
          'G (Médio) continua aprovado: pendente_dar não é Risco Crítico');
select is((select status_critico from public.riscos where id = :'r_g'), 'pendente_dar',
          'G: status_critico atualizado para pendente_dar');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_g'), 0,
          'G: nenhuma linha de histórico');

select pg_temp.entrar_como('cgov@radar.test');
select lives_ok($$update public.categorias_risco set apetite_declarado = 'baixo' where id = 10$$,
                'CGOV publica a DAR da categoria Ocupacionais (pendente_dar → baixo)');
select pg_temp.sair();
select is((select status_fluxo from public.riscos where id = :'r_g'), 'em_homologacao_dir',
          'G vira Risco Crítico na 1ª publicação → em_homologacao_dir');
select ok((select is_critico and status_critico = 'sim' from public.riscos where id = :'r_g'),
          'G: is_critico = true, status_critico = sim');
select is((select count(*)::int from public.historico_fluxo where risco_id = :'r_g' and acao = 'reaberto_mudanca_dar'), 1,
          'G: uma linha reaberto_mudanca_dar');

select * from finish();
rollback;
