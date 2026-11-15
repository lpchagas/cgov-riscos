-- ============================================================================
-- TESTE DO ESQUEMA DE UNIDADES, PERFIS E PROCESSOS (pgTAP) — Etapa B1, Tarefa 2
-- ============================================================================
-- Verifica que a migração 20261115001 criou as colunas/tabelas novas e que as
-- regras (CHECKs e unicidade) se comportam como combinado.
-- Tudo roda dentro de uma transação e é desfeito no final (rollback).
-- ============================================================================

begin;

select plan(13);

-- 1) Colunas novas em `unidades`
select has_column('public', 'unidades', 'icmbio_id', 'unidades tem icmbio_id');
select has_column('public', 'unidades', 'hierarquia', 'unidades tem hierarquia');
select has_column('public', 'unidades', 'nome_completo', 'unidades tem nome_completo');
select has_column('public', 'unidades', 'grupo_regional', 'unidades tem grupo_regional');
select has_column('public', 'unidades', 'atualizado_em', 'unidades tem atualizado_em');
select col_is_unique('public', 'unidades', 'icmbio_id', 'icmbio_id é único');

-- 2) Tabela nova e colunas novas em outras tabelas
select has_table('public', 'processos_cadeia_valor', 'tabela processos_cadeia_valor existe');
select has_column('public', 'objetos_contexto', 'processo_id', 'objetos_contexto tem processo_id');
select has_column('public', 'perfis_usuarios', 'titular_chefia', 'perfis_usuarios tem titular_chefia');

-- 3) Novo tipo de unidade aceito
select lives_ok(
  $$insert into unidades (sigla, nome, tipo, icmbio_id)
    values ('CT-TESTE', 'Coordenação Territorial de Teste', 'coordenacao-territorial', 'T-1')$$,
  'tipo coordenacao-territorial é aceito');

-- 4) Siglas repetidas são aceitas quando o icmbio_id é diferente
select lives_ok(
  $$insert into unidades (sigla, nome, tipo, icmbio_id) values
      ('DUP', 'Unidade A', 'uc', 'T-2'),
      ('DUP', 'Unidade B', 'uc', 'T-3')$$,
  'mesma sigla com icmbio_id diferente é aceita');

-- 5) Perfis: precisamos de um usuário em auth.users (a FK exige)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'teste-a1@exemplo.gov.br'),
  ('00000000-0000-0000-0000-0000000000a2', 'teste-a2@exemplo.gov.br');

select throws_ok(
  $$insert into perfis_usuarios (id, nome_completo, email, unidade_id, papel_governanca)
    select '00000000-0000-0000-0000-0000000000a1', 'Teste', 'teste-a1@exemplo.gov.br', id, 'lider_cg'
    from unidades where icmbio_id = 'T-1'$$,
  '23514', null, 'papel lider_cg é recusado');

select lives_ok(
  $$insert into perfis_usuarios (id, nome_completo, email, unidade_id, papel_governanca)
    select '00000000-0000-0000-0000-0000000000a2', 'Teste', 'teste-a2@exemplo.gov.br', id, 'coordenador_territorial'
    from unidades where icmbio_id = 'T-1'$$,
  'papel coordenador_territorial é aceito');

select * from finish();
rollback;
