-- ============================================================================
-- TESTE DA RLS DE LEITURA (pgTAP) — Etapa B1, Tarefa 6
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A RLS (Row Level Security, "segurança por linha") é a tranca que fica DENTRO
-- do banco: mesmo que o aplicativo esqueça um filtro, a pessoa só recebe as
-- linhas que a política deixa. Aqui conferimos, usuário por usuário da semente
-- (@radar.test), QUANTOS e QUAIS registros cada um lê em:
--
--   objetos_contexto, riscos, controles_existentes, respostas_tratamento,
--   indicadores_kri, medicoes_kri e historico_fluxo.
--
-- COMO O TESTE SABE O NÚMERO CERTO? Igual ao 030: antes de "logar" como cada
-- pessoa, o próprio teste monta, com uma CONSULTA DE REFERÊNCIA que não usa as
-- funções de alcance nem a RLS, o conjunto de objetos que cada pessoa deveria
-- ler (tabela `_ref_objetos`). Depois compara com o que a RLS devolve.
-- Além disso, os 7 "Exemplos práticos" da matriz
-- (docs/01-normativos/matriz-acesso-responsabilidades.md, seção 7) têm o
-- número de riscos escrito por extenso, com a justificativa pela semente.
--
-- ADAPTAÇÃO À SEMENTE (decisão R14 em decisoes-tecnicas-b1.md): a Base Avançada da semente (BAV Belterra)
-- é da UC SEM CT (FLONA do Tapajós, GR1). Por isso o exemplo "chefe do PARNA
-- vê o PARNA e as Bases Avançadas dele" é provado com gestor.uc-sem-ct@, e o
-- gestor.uc@ (FLONA de Caçador, UC com CT) prova "vê a própria UC e não a
-- vizinha". O "Gerente da GR 4" é provado com gr@ (GR5) e gr1@ (GR1).
--
-- A semente não tem controles, KRIs, medições, respostas nem histórico. Este
-- teste cria UM de cada para cada risco (como administrador) e desfaz tudo no
-- final (rollback).
--
-- Pré-requisito: `npm run db:reset`.
-- ============================================================================

begin;

-- Funções de apoio: entrar_como(email), entrar_como_anonimo(), sair(), linhas_afetadas(sql).
\ir ajudantes.psql

select plan(67);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select count(*) from public.unidades)               as total_unidades,
  (select count(*) from public.categorias_risco)       as total_categorias,
  (select count(*) from public.processos_cadeia_valor) as total_processos,
  (select count(*) from public.riscos)                 as total_riscos
\gset

-- 0.1 Um registro "filho" de cada tipo para cada risco da semente.
-- A partir da Tarefa 7, a ficha de risco em validação/homologação fica TRAVADA
-- e a de risco aprovado REABRE ao ganhar um filho. Para só PREPARAR os dados,
-- o administrador liga o sinal das funções do fluxo e o desliga em seguida.
select set_config('radar.fluxo', 'on', true);
insert into public.controles_existentes (risco_id, descricao_controle, evidencia_funcionamento)
select r.id, 'Controle de demonstração (teste 040)', 'Evidência de demonstração'
  from public.riscos r;

insert into public.respostas_tratamento
  (risco_id, estrategia, acao_o_que, responsavel_quem, prazo_quando, procedimento_como)
select r.id, 'Mitigar', 'Ação de demonstração (teste 040)', 'Gestor de Riscos', date '2027-06-30',
       'Procedimento de demonstração'
  from public.riscos r;

-- LAC-03: o KRI é do OBJETO e se liga ao risco por kri_riscos. O nome leva o
-- id do risco só para achar o par da ligação logo abaixo.
insert into public.indicadores_kri
  (objeto_id, nome_indicador, formula_calculo, fonte_dados, periodicidade, meta_alvo,
   limite_alerta, responsavel_medicao)
select r.objeto_id, 'KRI de demonstração (teste 040) ' || r.id, 'a / b', 'Planilha de demonstração', 'Mensal',
       '0', '1', 'Gestor de Riscos'
  from public.riscos r;
insert into public.kri_riscos (kri_id, risco_id)
select k.id, r.id
  from public.riscos r
  join public.indicadores_kri k on k.nome_indicador = 'KRI de demonstração (teste 040) ' || r.id;

insert into public.medicoes_kri (kri_id, valor_apurado)
select k.id, '0' from public.indicadores_kri k;
select set_config('radar.fluxo', '', true);

insert into public.historico_fluxo (risco_id, etapa, acao, usuario_nome, usuario_papel)
select r.id, 'rascunho', 'Registro de demonstração (teste 040)', 'Administrador do teste', 'cgov'
  from public.riscos r;

-- 0.2 Consulta de referência: de quais UNIDADES cada pessoa vê os riscos.
--     (mesma regra do 030, escrita sem as funções de alcance)
create temp table _ref_alcance (email text, unidade_id uuid);

-- (a) gestor, gerente_regional, coordenador_geral: própria unidade + descendentes.
insert into _ref_alcance
with recursive d(email, id) as (
  select p.email, p.unidade_id
    from public.perfis_usuarios p
   where p.ativo and p.papel_governanca in ('gestor', 'gerente_regional', 'coordenador_geral')
  union
  select d.email, f.id from public.unidades f join d on f.unidade_pai_id = d.id
)
select email, id from d;

-- (b) coordenador_territorial: a CT + unidades vinculadas (coordenacao_territorial_id) + descendentes.
insert into _ref_alcance
with recursive d(email, id) as (
  select p.email, u.id
    from public.perfis_usuarios p
    join public.unidades u on u.id = p.unidade_id or u.coordenacao_territorial_id = p.unidade_id
   where p.ativo and p.papel_governanca = 'coordenador_territorial'
  union
  select d.email, f.id from public.unidades f join d on f.unidade_pai_id = d.id
)
select email, id from d;

-- (c) os 6 perfis de alcance total: todas as unidades.
insert into _ref_alcance
select p.email, u.id
  from public.perfis_usuarios p cross join public.unidades u
 where p.ativo and p.papel_governanca in ('diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin');

-- 0.3 Referência de OBJETOS: os da unidade no alcance...
create temp table _ref_objetos (email text, objeto_id uuid);
insert into _ref_objetos
select distinct a.email, o.id
  from _ref_alcance a
  join public.objetos_contexto o on o.unidade_id = a.unidade_id;

-- ...mais a VISÃO POR PROCESSO do Coordenador-Geral (P1b): objetos cujo
-- macroprocesso (ou processo da Cadeia de Valor) é supervisionado pela CG
-- dele ou por unidade abaixo dela. Ex.: cg.cgpro@ lê o objeto da FLONA do
-- Tapajós ligado ao processo 2.02.3 (Proteção).
insert into _ref_objetos
select distinct p.email, o.id
  from public.perfis_usuarios p
  join public.objetos_contexto o on true
  left join public.processos_cadeia_valor pc on pc.id = o.processo_id
 where p.ativo and p.papel_governanca = 'coordenador_geral'
   and (   o.macroprocesso_supervisor_id in (select a.unidade_id from _ref_alcance a where a.email = p.email)
        or pc.unidade_supervisora_id     in (select a.unidade_id from _ref_alcance a where a.email = p.email))
   and not exists (select 1 from _ref_objetos r where r.email = p.email and r.objeto_id = o.id);

-- 0.4 Referência de RISCOS (os riscos dos objetos acima).
create temp table _ref_riscos (email text, risco_id uuid);
insert into _ref_riscos
select r.email, x.id from _ref_objetos r join public.riscos x on x.objeto_id = r.objeto_id;

-- 0.5 Contagem esperada de cada tabela, por pessoa, num texto só. Assim, se
--     algo falhar, a mensagem mostra qual tabela divergiu. Ex.:
--     'objetos=2 riscos=2 controles=2 respostas=2 kris=2 medicoes=2 historico=2'
create temp table _ref_contagens (email text, texto text);
insert into _ref_contagens
select u.email,
       format('objetos=%s riscos=%s controles=%s respostas=%s kris=%s medicoes=%s historico=%s',
         (select count(*) from _ref_objetos r where r.email = u.email),
         (select count(*) from _ref_riscos r where r.email = u.email),
         (select count(*) from public.controles_existentes c
           where c.risco_id in (select r.risco_id from _ref_riscos r where r.email = u.email)),
         (select count(*) from public.respostas_tratamento t
           where t.risco_id in (select r.risco_id from _ref_riscos r where r.email = u.email)),
         -- LAC-03: o KRI (e a medição dele) é lido pelo OBJETO do KRI.
         (select count(*) from public.indicadores_kri k
           where k.objeto_id in (select r.objeto_id from _ref_objetos r where r.email = u.email)),
         (select count(*) from public.medicoes_kri m join public.indicadores_kri k on k.id = m.kri_id
           where k.objeto_id in (select r.objeto_id from _ref_objetos r where r.email = u.email)),
         (select count(*) from public.historico_fluxo h
           where h.risco_id in (select r.risco_id from _ref_riscos r where r.email = u.email)))
  from auth.users u
 where u.email like '%@radar.test';
-- O visitante anônimo não está em auth.users: ele nem chega a contar (não tem
-- privilégio nas tabelas — ver o bloco 5, no fim).

-- Quem estiver "logado" no teste precisa ler as tabelas de apoio.
grant select on _ref_riscos, _ref_contagens to authenticated, anon;

-- contagens(): o que a pessoa logada ENXERGA, no mesmo formato da referência.
-- Roda com os direitos de quem está logado (a RLS vale aqui dentro).
create or replace function pg_temp.contagens()
returns text
language sql
as $$
  select format('objetos=%s riscos=%s controles=%s respostas=%s kris=%s medicoes=%s historico=%s',
    (select count(*) from public.objetos_contexto),
    (select count(*) from public.riscos),
    (select count(*) from public.controles_existentes),
    (select count(*) from public.respostas_tratamento),
    (select count(*) from public.indicadores_kri),
    (select count(*) from public.medicoes_kri),
    (select count(*) from public.historico_fluxo));
$$;

-- ----------------------------------------------------------------------------
-- 1. Estrutura: as políticas antigas de "leitura total" sumiram
-- ----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and policyname like 'Leitura institucional%'),
  0, 'as 9 políticas "Leitura institucional" (leitura total) foram removidas');

select is(
  (select count(*)::int from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in ('perfis_usuarios', 'processos_cadeia_valor', 'auditoria_log')
      and relrowsecurity),
  3, 'RLS ligada em perfis_usuarios, processos_cadeia_valor e auditoria_log');

-- ----------------------------------------------------------------------------
-- 2. Os 7 "Exemplos práticos" da matriz (seção 7)
-- ----------------------------------------------------------------------------
-- Exemplo 1 — "Chefe de um PARNA vinculado à CT Y vê o PARNA e as Bases Avançadas dele".
-- (decisão R14 em decisoes-tecnicas-b1.md) gestor.uc@ = FLONA de Caçador (UC com CT, sem Base na semente): 1 risco
-- (RADAR-DEMO-UC-CT).
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*)::int from public.riscos), 1, 'exemplo 1 (UC com CT): gestor.uc lê 1 risco (o da própria UC)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'gestor.uc@radar.test'$$,
              'gestor.uc: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gestor.uc@radar.test'),
          'gestor.uc: objetos, controles, respostas, KRIs, medições e histórico = referência');

-- (decisão R14 em decisoes-tecnicas-b1.md) gestor.uc-sem-ct@ = FLONA do Tapajós + BAV Belterra: 2 riscos
-- (RADAR-DEMO-UC-SCT e RADAR-DEMO-BASE) — "o PARNA e as Bases Avançadas dele".
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is((select count(*)::int from public.riscos), 2, 'exemplo 1 (UC + Base): gestor.uc-sem-ct lê 2 riscos (UC e Base)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'gestor.uc-sem-ct@radar.test'$$,
              'gestor.uc-sem-ct: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gestor.uc-sem-ct@radar.test'),
          'gestor.uc-sem-ct: demais tabelas = referência');

-- Exemplo 2 — "Coordenador da CT Y vê CT Y + NGIs e UCs da CT Y".
-- ct@ (CT Curitiba): RADAR-DEMO-CT + RADAR-DEMO-UC-CT (FLONA de Caçador, vinculada) = 2.
select pg_temp.entrar_como('ct@radar.test');
select is((select count(*)::int from public.riscos), 2, 'exemplo 2: ct lê 2 riscos (a CT e a UC vinculada)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'ct@radar.test'$$,
              'ct: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'ct@radar.test'),
          'ct: demais tabelas = referência');

-- Exemplo 3 — "Gerente da GR vê GR, COAGR, CTs, NGIs e UCs da GR".
-- gr@ (GR5): RADAR-DEMO-GR5 + RADAR-DEMO-CT + RADAR-DEMO-UC-CT = 3.
select pg_temp.entrar_como('gr@radar.test');
select is((select count(*)::int from public.riscos), 3, 'exemplo 3: gr (GR5) lê 3 riscos (GR5, CT e UC)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'gr@radar.test'$$,
              'gr: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gr@radar.test'),
          'gr: demais tabelas = referência');

-- gr1@ (GR1): RADAR-DEMO-UC-SCT + RADAR-DEMO-BASE = 2 (UC sem CT e a Base dela).
select pg_temp.entrar_como('gr1@radar.test');
select is((select count(*)::int from public.riscos), 2, 'exemplo 3: gr1 (GR1) lê 2 riscos (UC sem CT e Base)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'gr1@radar.test'$$,
              'gr1: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gr1@radar.test'),
          'gr1: demais tabelas = referência');

-- Exemplo 4 — "Coordenador-Geral da CGPRO vê CGPRO, Coordenações... + riscos de
-- qualquer UC ligados aos processos de Proteção (2.02.x)".
-- cg.cgpro@: RADAR-DEMO-CGPRO + RADAR-DEMO-COFIS (árvore) + RADAR-DEMO-UC-SCT
-- (FLONA do Tapajós, processo 2.02.3 — visão por processo) = 3.
select pg_temp.entrar_como('cg.cgpro@radar.test');
select is((select count(*)::int from public.riscos), 3, 'exemplo 4: cg.cgpro lê 3 riscos (CGPRO, COFIS e UC pelo processo 2.02.3)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'cg.cgpro@radar.test'$$,
              'cg.cgpro: riscos lidos = referência (árvore + visão por processo)');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'cg.cgpro@radar.test'),
          'cg.cgpro: demais tabelas = referência');

-- Exemplo 5 — "Diretor da DIBIO vê todas as unidades": os 10 riscos da semente.
select pg_temp.entrar_como('diretor.dibio@radar.test');
select is((select count(*)::int from public.riscos), :'total_riscos'::int, 'exemplo 5: diretor.dibio lê todos os riscos');
select is((select count(*)::int from public.riscos), 10, 'exemplo 5: ... que na semente são 10');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'diretor.dibio@radar.test'),
          'diretor.dibio: demais tabelas = referência');

-- Exemplo 6 — "Auditor da AUDIT vê todas as unidades" (só lê; a escrita é o 041).
select pg_temp.entrar_como('auditor@radar.test');
select is((select count(*)::int from public.riscos), 10, 'exemplo 6: auditor lê os 10 riscos');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'auditor@radar.test'),
          'auditor: demais tabelas = referência');

-- Exemplo 7 — "Analista da CGOV vê todas as unidades".
select pg_temp.entrar_como('cgov@radar.test');
select is((select count(*)::int from public.riscos), 10, 'exemplo 7: cgov lê os 10 riscos');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'cgov@radar.test'),
          'cgov: demais tabelas = referência');

-- ----------------------------------------------------------------------------
-- 3. Os demais usuários da semente (todos comparados com a referência)
-- ----------------------------------------------------------------------------
-- gestor.base@: só a BAV Belterra → 1 risco (RADAR-DEMO-BASE); não lê a UC-mãe.
select pg_temp.entrar_como('gestor.base@radar.test');
select is((select count(*)::int from public.riscos), 1, 'gestor.base lê 1 risco (só a Base, não a UC-mãe)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'gestor.base@radar.test'$$,
              'gestor.base: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gestor.base@radar.test'),
          'gestor.base: demais tabelas = referência');

-- servidor.gr@: gestor (não titular) na GR5 → mesma árvore da GR5 (decisão R16 em decisoes-tecnicas-b1.md) = 3.
select pg_temp.entrar_como('servidor.gr@radar.test');
select is((select count(*)::int from public.riscos), 3, 'servidor.gr lê 3 riscos (árvore da GR5, R16)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'servidor.gr@radar.test'$$,
              'servidor.gr: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'servidor.gr@radar.test'),
          'servidor.gr: demais tabelas = referência');

-- coord.cofis@: só a COFIS → 1 (RADAR-DEMO-COFIS). Não lê a CGPRO (unidade de cima).
select pg_temp.entrar_como('coord.cofis@radar.test');
select is((select count(*)::int from public.riscos), 1, 'coord.cofis lê 1 risco (só a COFIS)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'coord.cofis@radar.test'$$,
              'coord.cofis: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'coord.cofis@radar.test'),
          'coord.cofis: demais tabelas = referência');

-- centro@: só o CNPT → 1 (RADAR-DEMO-CENTRO).
select pg_temp.entrar_como('centro@radar.test');
select is((select count(*)::int from public.riscos), 1, 'centro lê 1 risco (só o Centro)');
select set_eq('select id from public.riscos',
              $$select risco_id from _ref_riscos where email = 'centro@radar.test'$$,
              'centro: riscos lidos = referência');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'centro@radar.test'),
          'centro: demais tabelas = referência');

-- Alcance total: diretor.diman, presidente, cgge, gabin → todos.
select pg_temp.entrar_como('diretor.diman@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'diretor.diman@radar.test'),
          'diretor.diman: lê tudo (= referência)');
select pg_temp.entrar_como('presidente@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'presidente@radar.test'),
          'presidente: lê tudo (= referência)');
select pg_temp.entrar_como('cgge@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'cgge@radar.test'),
          'cgge: lê tudo (= referência)');
select pg_temp.entrar_como('gabin@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'gabin@radar.test'),
          'gabin: lê tudo (= referência)');

-- ----------------------------------------------------------------------------
-- 4. Tabelas "públicas por dentro": árvore, Cadeia de Valor e DAR
-- ----------------------------------------------------------------------------
-- Qualquer pessoa logada COM PERFIL ATIVO lê todas as unidades, todos os
-- processos e todas as categorias (spec 8.1, item 3).
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select count(*) from public.unidades), :'total_unidades'::bigint, 'gestor.uc lê toda a árvore de unidades');
select is((select count(*) from public.processos_cadeia_valor), :'total_processos'::bigint, 'gestor.uc lê toda a Cadeia de Valor');
select is((select count(*) from public.categorias_risco), :'total_categorias'::bigint, 'gestor.uc lê todas as categorias (DAR)');
select pg_temp.entrar_como('auditor@radar.test');
select is((select count(*) from public.unidades), :'total_unidades'::bigint, 'auditor lê toda a árvore de unidades');
select is((select count(*) from public.categorias_risco), :'total_categorias'::bigint, 'auditor lê todas as categorias');

-- A trilha de auditoria (Tarefa 8): a cgov lê tudo. Os testes finos da trilha
-- (alcance por objeto, escrita fechada) ficam em 060_auditoria.test.sql.
select pg_temp.entrar_como('cgov@radar.test');
select ok((select count(*) from public.auditoria_log) > 0, 'auditoria_log: a cgov lê a trilha (Tarefa 8)');

-- ----------------------------------------------------------------------------
-- 5. Quem NÃO deve ver nada: sem perfil, perfil inativo e visitante anônimo
-- ----------------------------------------------------------------------------
select pg_temp.entrar_como('sem-perfil@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'sem-perfil@radar.test'),
          'sem-perfil: lê 0 em todas as tabelas de risco');
select is((select count(*) from public.riscos), 0::bigint, 'sem-perfil: 0 riscos');
select is((select count(*) from public.unidades), 0::bigint, 'sem-perfil: 0 unidades');
select is((select count(*) from public.categorias_risco), 0::bigint, 'sem-perfil: 0 categorias');
select is((select count(*) from public.perfis_usuarios), 0::bigint, 'sem-perfil: 0 perfis');

select pg_temp.entrar_como('inativo@radar.test');
select is(pg_temp.contagens(), (select texto from _ref_contagens where email = 'inativo@radar.test'),
          'inativo: lê 0 em todas as tabelas de risco');
select is((select count(*) from public.riscos), 0::bigint, 'inativo: 0 riscos');
select is((select count(*) from public.unidades), 0::bigint, 'inativo: 0 unidades');
select is((select count(*) from public.categorias_risco), 0::bigint, 'inativo: 0 categorias');
select is((select count(*) from public.processos_cadeia_valor), 0::bigint, 'inativo: 0 processos');

-- Visitante anônimo (sem login): além da RLS, o anon NÃO TEM NENHUM
-- privilégio nas tabelas de negócio (defesa em profundidade — REVOKE ALL na
-- migração 20261115003). Em vez de "0 linhas", ele recebe erro de permissão.
select pg_temp.sair();
select is(
  (select count(*)::int from unnest(array['unidades', 'categorias_risco', 'perfis_usuarios', 'objetos_contexto',
                                          'riscos', 'controles_existentes', 'respostas_tratamento', 'indicadores_kri',
                                          'medicoes_kri', 'historico_fluxo', 'auditoria_log', 'processos_cadeia_valor']) t
    where has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')),
  0, 'anon: nenhum privilégio nas 12 tabelas de negócio');
select pg_temp.entrar_como_anonimo();
select throws_ok($$select pg_temp.contagens()$$, '42501', null, 'anon: sem acesso às tabelas de risco');
select throws_ok($$select count(*) from public.riscos$$, '42501', null, 'anon: sem acesso a riscos');
select throws_ok($$select count(*) from public.unidades$$, '42501', null, 'anon: sem acesso a unidades');
select throws_ok($$select count(*) from public.categorias_risco$$, '42501', null, 'anon: sem acesso a categorias');
select throws_ok($$select count(*) from public.perfis_usuarios$$, '42501', null, 'anon: sem acesso a perfis');
select throws_ok($$select count(*) from public.processos_cadeia_valor$$, '42501', null, 'anon: sem acesso a processos');
-- A trilha também: sem privilégio (migrações 20261115003 e 20261115005).
select throws_ok($$select count(*) from public.auditoria_log$$, '42501', null, 'anon: sem acesso à trilha');
select pg_temp.sair();

select * from finish();
rollback;
