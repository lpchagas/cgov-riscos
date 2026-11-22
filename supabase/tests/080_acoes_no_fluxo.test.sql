-- ============================================================================
-- TESTE DA ETAPA B3, TAREFA 2 (pgTAP) — acoes_no_fluxo(riscos uuid[])
-- ============================================================================
-- O que se prova aqui:
--   A função só LÊ e diz, para cada risco, quais botões do fluxo a pessoa
--   logada veria (enviar, assumir, validar, homologar, devolver, editar,
--   excluir). A regra de ouro (spec §6.1) é: cada coluna diz "sim"
--   SE E SOMENTE SE a ação de verdade passaria.
--
-- Como provamos o "se e somente se" (varredura):
--   Para CADA pessoa com perfil na semente (inclusive inativo@, para quem tudo
--   é falso; sem-perfil@ fica de fora) e CADA risco existente:
--     1) entramos como a pessoa e lemos a coluna em acoes_no_fluxo(array[risco]);
--        linha omitida (a pessoa não lê o risco) = falso;
--     2) tentamos a ação DE VERDADE (enviar_para_validacao, validar_risco...;
--        editar = UPDATE de `causas`; excluir = DELETE) dentro de um bloco
--        BEGIN ... EXCEPTION (um SAVEPOINT implícito). Se passou, forçamos um
--        erro "de desfazer" para que nada fique gravado;
--     3) comparamos: coluna = passou?
--   Um is() por (pessoa × ação) junta todos os riscos: se algum discordar, a
--   mensagem de falha lista os códigos RADAR que discordaram.
--
-- Premissa da varredura (decisão do controlador, opção 1):
--   acoes_no_fluxo usa a criticidade GRAVADA no risco; as ações a recalculam.
--   Logo depois do `npm run db:reset` as duas são iguais — o teste 1 prova
--   isso para todos os riscos (recálculo de verdade dentro de um SAVEPOINT).
--
-- Pré-requisito: `npm run db:reset`. Tudo é desfeito no final (rollback).
-- ============================================================================

begin;

\ir ajudantes.psql

select plan(142);

-- ----------------------------------------------------------------------------
-- 0. Preparação (como administrador)
-- ----------------------------------------------------------------------------
select
  (select id from public.unidades where icmbio_id = '10.0000')       as presidencia,
  (select id from auth.users where email = 'presidente@radar.test')   as u_presidente,
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-COFIS')  as r_cofis,
  (select id from public.riscos where codigo_radar = 'RADAR-DEMO-UC-SCT') as r_uc_sct
\gset

-- LAC-13 e LAC-03 (migrações 20261122002 e 20261122004): o risco crítico só
-- anda no fluxo com ação 5W2H e KRI completo. Na semente, só os riscos
-- críticos têm ação e KRI (seção 5b); os outros não têm. Este teste prova
-- OUTRAS regras; damos a todos o tratamento mínimo (ajudantes.psql). A trava
-- é provada em 100_lac13_trava_critico.test.sql e 110_lac03_kri_obrigatorio.test.sql.
select pg_temp.dar_tratamento_a_todos();

-- Objeto na Presidência (para os casos "sem homologador efetivo").
insert into public.objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id, objetivo_estrategico_associado)
values ('00000000-0000-4000-b000-000000000080', 'Unidade', 'Teste 080 — Presidência',
        :'presidencia', 'Objetivo de demonstração');

-- inserir_risco(objeto, código, P, I, estado): categoria 2 (Operacional).
-- O gatilho de cálculo preenche inerente, residual e criticidade.
-- P=4, I=4 → inerente 21 (Extremo) → Risco Crítico (fora do apetite da DAR).
create or replace function pg_temp.inserir_risco(p_objeto uuid, p_codigo text, p_p int, p_i int, p_status text)
returns uuid
language sql
as $$
  insert into public.riscos
    (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
     objetivo_afetado, descricao_padrao, categoria_id, probabilidade, impacto,
     nivel_inerente, classificacao_inerente, nivel_residual, classificacao_residual, status_fluxo)
  values (p_codigo, p_objeto, 'Responsável de demonstração', 'causa de teste', 'evento de teste',
          'consequência de teste', 'objetivo de teste', 'x', 2, p_p, p_i,
          0, 'Baixo', 0, 'Baixo', p_status)
  returning id;
$$;

-- Riscos criados só para este teste (entram na varredura):
--   PRELIM   preliminar_cgov na FLONA de Caçador (assumir; CGOV edita/exclui)
--   PRES-RAS rascunho crítico da Presidência (o Presidente não consegue enviar)
--   PRES-VAL em validação, crítico, enviado pelo Presidente (GABIN não valida: sem homologador)
--   PRES-HOM em homologação, enviado pelo Presidente (ninguém homologa: a CGOV devolve)
select
  pg_temp.inserir_risco('00000000-0000-4000-b000-000000000001', 'RADAR-T080-PRELIM',   2, 2, 'preliminar_cgov')     as r_prelim,
  pg_temp.inserir_risco('00000000-0000-4000-b000-000000000080', 'RADAR-T080-PRES-RAS', 4, 4, 'rascunho')            as r_pres_ras,
  pg_temp.inserir_risco('00000000-0000-4000-b000-000000000080', 'RADAR-T080-PRES-VAL', 4, 4, 'em_validacao_cg')     as r_pres_val,
  pg_temp.inserir_risco('00000000-0000-4000-b000-000000000080', 'RADAR-T080-PRES-HOM', 4, 4, 'em_homologacao_dir')  as r_pres_hom
\gset
select pg_temp.dar_tratamento_a_todos();   -- LAC-13: tratamento mínimo aos riscos criados acima

-- Os dois últimos foram "enviados" pelo próprio Presidente (linha de envio no histórico).
insert into public.historico_fluxo (risco_id, etapa, acao, usuario_nome, usuario_papel, despacho_texto, usuario_id)
values (:'r_pres_val', 'submissao_1a_linha', 'submetido', 'Presidente Fictício', 'presidencia', 'Envio de teste', :'u_presidente'),
       (:'r_pres_hom', 'submissao_1a_linha', 'submetido', 'Presidente Fictício', 'presidencia', 'Envio de teste', :'u_presidente');

-- ----------------------------------------------------------------------------
-- 1. Premissa: a criticidade GRAVADA é igual à RECALCULADA (semente recém-carregada)
-- ----------------------------------------------------------------------------
-- Para cada risco, refazemos o recálculo exatamente como as ações fazem
-- (fn_fluxo_mudar_estado(risco, mesmo_estado): UPDATE que reaciona o gatilho de
-- cálculo), comparamos e desfazemos (erro forçado dentro do BEGIN/EXCEPTION).
-- Devolve os códigos RADAR em que gravado ≠ recalculado (esperado: nenhum).
create or replace function pg_temp.criticidade_divergente()
returns text[]
language plpgsql
as $$
declare
  r          public.riscos;
  v_novo     public.riscos;
  v_diverge  text[] := '{}';
begin
  for r in select * from public.riscos order by codigo_radar loop
    begin
      v_novo := public.fn_fluxo_mudar_estado(r.id, r.status_fluxo);
      if v_novo.is_critico is distinct from r.is_critico
         or v_novo.status_critico is distinct from r.status_critico then
        v_diverge := v_diverge || r.codigo_radar;
      end if;
      raise exception using errcode = 'ZZ080', message = 'desfazer o recálculo';
    exception when sqlstate 'ZZ080' then
      null;   -- recálculo desfeito; seguimos para o próximo risco
    end;
  end loop;
  return v_diverge;
end;
$$;

select is(pg_temp.criticidade_divergente(), '{}'::text[],
  'premissa: em todos os riscos, a criticidade gravada é igual à recalculada pelas ações');

-- ----------------------------------------------------------------------------
-- 2. Varredura "se e somente se"
-- ----------------------------------------------------------------------------
-- tentar(risco, ação): tenta a ação de verdade como a pessoa logada.
-- Devolve true se passou (e desfaz tudo), false se foi recusada.
create or replace function pg_temp.tentar(p_risco uuid, p_acao text)
returns boolean
language plpgsql
as $$
declare
  v_linhas integer;
begin
  begin
    case p_acao
      when 'enviar'    then perform public.enviar_para_validacao(p_risco);
      when 'assumir'   then perform public.assumir_risco_preliminar(p_risco);
      when 'validar'   then perform public.validar_risco(p_risco, 'teste');
      when 'homologar' then perform public.homologar_risco(p_risco, 'teste');
      when 'devolver'  then perform public.devolver_risco(p_risco, 'teste');
      when 'editar' then
        update public.riscos set causas = causas || ' ' where id = p_risco;
        get diagnostics v_linhas = row_count;
        if v_linhas <> 1 then return false; end if;
      when 'excluir' then
        delete from public.riscos where id = p_risco;
        get diagnostics v_linhas = row_count;
        if v_linhas <> 1 then return false; end if;
    end case;
    -- Passou: força um erro só para desfazer o que a ação gravou.
    raise exception using errcode = 'ZZ080', message = 'desfazer a ação';
  exception
    when sqlstate 'ZZ080' then return true;
    when others           then return false;
  end;
end;
$$;

-- conferir_acao(email, ação): para todos os riscos, compara a coluna da
-- acoes_no_fluxo com a tentativa real. Devolve os códigos que discordaram.
create or replace function pg_temp.conferir_acao(p_email text, p_acao text)
returns text[]
language plpgsql
as $$
declare
  v_coluna   text := case p_acao when 'enviar'    then 'pode_enviar'
                                 when 'assumir'   then 'pode_assumir'
                                 when 'validar'   then 'pode_validar'
                                 when 'homologar' then 'pode_homologar'
                                 when 'devolver'  then 'pode_devolver'
                                 when 'editar'    then 'pode_editar'
                                 when 'excluir'   then 'pode_excluir' end;
  v_ids      uuid[];
  v_codigos  text[];
  v_diz      boolean;
  v_passou   boolean;
  v_diverge  text[] := '{}';
begin
  perform pg_temp.sair();          -- lista dos riscos como administrador
  select array_agg(id order by codigo_radar), array_agg(codigo_radar order by codigo_radar)
    into v_ids, v_codigos
    from public.riscos;

  for i in 1 .. cardinality(v_ids) loop
    perform pg_temp.entrar_como(p_email);
    execute format('select %I from public.acoes_no_fluxo($1)', v_coluna)
       into v_diz using array[v_ids[i]];
    v_diz := coalesce(v_diz, false);           -- linha omitida = não vê o botão
    v_passou := pg_temp.tentar(v_ids[i], p_acao);
    if v_diz is distinct from v_passou then
      v_diverge := v_diverge || format('%s (coluna=%s, ação=%s)', v_codigos[i], v_diz, v_passou);
    end if;
  end loop;
  perform pg_temp.sair();
  return v_diverge;
end;
$$;

-- Um is() por (pessoa × ação): 18 pessoas × 7 ações = 126 testes.
select is(pg_temp.conferir_acao(p.email, a.acao), '{}'::text[],
          format('%s: %s bate com a ação real em todos os riscos', p.email, a.acao))
  from (select email from public.perfis_usuarios order by email) as p
 cross join (values (1, 'enviar'), (2, 'assumir'), (3, 'validar'), (4, 'homologar'),
                    (5, 'devolver'), (6, 'editar'), (7, 'excluir')) as a(ordem, acao)
 order by p.email, a.ordem;

-- ----------------------------------------------------------------------------
-- 3. Casos nomeados
-- ----------------------------------------------------------------------------
-- 3.1 O Presidente não envia o risco crítico da Presidência (ninguém homologaria).
select pg_temp.entrar_como('presidente@radar.test');
select is((select pode_enviar from public.acoes_no_fluxo(array[:'r_pres_ras'::uuid])), false,
  'presidente@: risco crítico da Presidência → pode_enviar = false');
select is((select motivo from public.acoes_no_fluxo(array[:'r_pres_ras'::uuid])),
  'Não há quem homologue este risco; a CGOV pode devolvê-lo.',
  'presidente@: motivo explica que não há quem homologue');

-- 3.2 A CGOV devolve o risco em homologação sem homologador efetivo.
select pg_temp.entrar_como('cgov@radar.test');
select is((select devolucao_cgov from public.acoes_no_fluxo(array[:'r_pres_hom'::uuid])), true,
  'cgov@: risco em homologação sem homologador efetivo → devolucao_cgov = true');
select is((select motivo from public.acoes_no_fluxo(array[:'r_pres_hom'::uuid])),
  'Não há quem decida este risco agora; a CGOV pode devolvê-lo à unidade.',
  'cgov@: motivo explica que não há quem decida');

-- 3.3 Preliminar da CGOV: a unidade assume; a CGOV edita e exclui, mas não assume.
select is((select array[pode_assumir, pode_editar, pode_excluir]
             from public.acoes_no_fluxo(array[:'r_prelim'::uuid])),
  array[false, true, true],
  'cgov@: preliminar → não assume, edita e exclui');
select pg_temp.entrar_como('gestor.uc@radar.test');
select is((select pode_assumir from public.acoes_no_fluxo(array[:'r_prelim'::uuid])), true,
  'gestor.uc@: assume o preliminar da própria UC');
select is((select pode_editar from public.acoes_no_fluxo(array[:'r_prelim'::uuid])), true,
  'gestor.uc@: edita o preliminar da própria UC');
select is((select pode_excluir from public.acoes_no_fluxo(array[:'r_prelim'::uuid])), true,
  'gestor.uc@: exclui o preliminar da própria UC');

-- 3.4 Fora do alcance: linha omitida (sem erro). Também id inexistente.
-- (O brief citava auditor@, mas a Auditoria tem alcance total pela matriz de
-- alcance — pode_ler_objeto devolve verdadeiro. Usamos gestor.uc@, que não lê a COFIS.)
select is((select count(*)::int from public.acoes_no_fluxo(
             array[:'r_cofis'::uuid, :'r_prelim'::uuid, '00000000-0000-4000-9999-000000000000'::uuid])),
  1, 'gestor.uc@: risco fora do alcance e id inexistente são omitidos');

-- 3.5 Ficha travada: a unidade vê o motivo.
select pg_temp.entrar_como('gestor.uc-sem-ct@radar.test');
select is((select motivo from public.acoes_no_fluxo(array[:'r_uc_sct'::uuid])),
  'Ficha em validação ou homologação: peça a devolução para editar.',
  'gestor.uc-sem-ct@: risco em validação → motivo de ficha travada');

-- 3.6 Limite de 1.000 ids.
select throws_ok(
  $$select * from public.acoes_no_fluxo(array(select gen_random_uuid() from generate_series(1, 1001)))$$,
  '22023', 'RADAR: no máximo 1000 riscos por consulta de ações.',
  'mais de 1.000 ids → erro 22023');

-- 3.7 Visitante sem login não executa.
select pg_temp.entrar_como_anonimo();
select throws_ok(format($$select * from public.acoes_no_fluxo(array[%L::uuid])$$, :'r_prelim'),
  '42501', null, 'anon não executa acoes_no_fluxo');

-- 3.8 Risco APROVADO e crítico da Presidência: editar (ex.: mudar P) o reabriria,
-- mas não haveria homologador (o Presidente não homologa o próprio risco).
-- Criado DEPOIS da varredura: lá, "editar" é só um texto (que não reabre).
select pg_temp.sair();
select pg_temp.inserir_risco('00000000-0000-4000-b000-000000000080', 'RADAR-T080-PRES-APR', 4, 4, 'aprovado') as r_pres_apr
\gset
select pg_temp.dar_tratamento(:'r_pres_apr');   -- LAC-13: tratamento mínimo
select pg_temp.entrar_como('presidente@radar.test');
select is((select pode_editar from public.acoes_no_fluxo(array[:'r_pres_apr'::uuid])), false,
  'presidente@: aprovado crítico da Presidência → pode_editar = false (reabertura seria recusada)');
select is((select motivo from public.acoes_no_fluxo(array[:'r_pres_apr'::uuid])),
  'Não há quem homologue este risco; a CGOV pode devolvê-lo.',
  'presidente@: motivo da edição recusada');
select throws_ok(format($$update public.riscos set probabilidade = 3 where id = %L$$, :'r_pres_apr'),
  '55000', null, 'presidente@: a edição real que reabriria o risco é recusada');

select * from finish();
rollback;
