-- ============================================================================
-- TESTE DA FUNÇÃO DO IMPORTADOR: sincronizar_estrutura (pgTAP) — Etapa B1, Tarefa 3
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- O importador grava a árvore de unidades e os processos chamando UMA única
-- vez a função `public.sincronizar_estrutura`. Aqui provamos que:
--   (a) com dados válidos, a função insere mãe e filha e liga `unidade_pai_id`
--       (e os processos ao líder e ao supervisor);
--   (b) se um passo posterior falhar, NADA do que veio antes fica gravado
--       (atomicidade: uma chamada de função = uma transação);
--   (c) só o `service_role` pode executá-la — `anon` e `authenticated`, não.
-- Os códigos usados ('S-...', 'P-S...') são inventados e não colidem com a
-- estrutura real carregada pelo `npm run db:reset`.
-- Tudo roda dentro de uma transação e é desfeito no final (rollback).
-- ============================================================================

begin;

select plan(14);

-- (a) Carga válida: mãe S-1, filha S-2 e um processo -------------------------
select lives_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"S-1","nome":"Diretoria de Teste","tipo":"diretoria","ativa":true,"id_mae":null},
        {"icmbio_id":"S-2","nome":"Coordenação de Teste","tipo":"coordenacao","ativa":true,"id_mae":"S-1"}]'::jsonb,
      '[{"proc_id":"P-S1","nome":"Processo de teste","lider_icmbio_id":"S-2","supervisor_icmbio_id":"S-1","ativo":true}]'::jsonb)$$,
  'carga válida é aceita');

select is(
  (select m.icmbio_id from public.unidades f join public.unidades m on m.id = f.unidade_pai_id
    where f.icmbio_id = 'S-2'),
  'S-1',
  'filha S-2 ficou ligada à mãe S-1 (unidade_pai_id)');

select is(
  (select l.icmbio_id || '/' || s.icmbio_id
     from public.processos_cadeia_valor p
     join public.unidades l on l.id = p.unidade_lider_id
     join public.unidades s on s.id = p.unidade_supervisora_id
    where p.proc_id = 'P-S1'),
  'S-2/S-1',
  'processo ligado ao líder S-2 e ao supervisor S-1');

-- Reexecutar desativando a filha: a linha continua lá (nunca apaga), só inativa.
select lives_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"S-2","nome":"Coordenação de Teste","tipo":"coordenacao","ativa":false,"id_mae":"S-1"}]'::jsonb,
      '[]'::jsonb)$$,
  'desativação é aceita');
select is(
  (select ativa from public.unidades where icmbio_id = 'S-2'),
  false,
  'S-2 continua no banco, com ativa = false');

-- (b) Atomicidade -------------------------------------------------------------
-- A 1ª unidade (S-10) é válida e seria inserida; a 2ª (S-11) tem tipo inválido.
-- O CHECK recusa a S-11 e, como tudo é uma transação só, a S-10 também some.
select throws_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"S-10","nome":"Válida","tipo":"divisao","ativa":true},
        {"icmbio_id":"S-11","nome":"Inválida","tipo":"tipo-que-nao-existe","ativa":true}]'::jsonb,
      '[]'::jsonb)$$,
  '23514',
  null,
  'tipo inválido na 2ª unidade faz a chamada falhar');
select is(
  (select count(*)::int from public.unidades where icmbio_id in ('S-10', 'S-11')),
  0,
  'nenhuma unidade daquela chamada ficou gravada');

-- Falha no ÚLTIMO passo (processos): o líder não existe. As unidades S-20 e
-- S-21, gravadas nos passos 1 e 2 da mesma chamada, também são desfeitas.
select throws_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"S-20","nome":"Mãe","tipo":"diretoria","ativa":true},
        {"icmbio_id":"S-21","nome":"Filha","tipo":"divisao","ativa":true,"id_mae":"S-20"}]'::jsonb,
      '[{"proc_id":"P-S2","nome":"Processo","lider_icmbio_id":"NAO-EXISTE","ativo":true}]'::jsonb)$$,
  '23503',
  null,
  'processo com líder inexistente faz a chamada falhar');
select is(
  (select count(*)::int from public.unidades where icmbio_id in ('S-20', 'S-21')),
  0,
  'as unidades gravadas antes do passo dos processos foram desfeitas');
select is(
  (select count(*)::int from public.processos_cadeia_valor where proc_id = 'P-S2'),
  0,
  'o processo também não ficou gravado');

-- Mãe inexistente também é recusada (em vez de ficar sem mãe em silêncio).
select throws_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"S-30","nome":"Órfã","tipo":"divisao","ativa":true,"id_mae":"NAO-EXISTE"}]'::jsonb,
      '[]'::jsonb)$$,
  '23503',
  null,
  'mãe inexistente faz a chamada falhar');

-- (c) Quem pode executar --------------------------------------------------------
select ok(
  not has_function_privilege('anon', 'public.sincronizar_estrutura(jsonb, jsonb)', 'EXECUTE'),
  'anon NÃO pode executar');
select ok(
  not has_function_privilege('authenticated', 'public.sincronizar_estrutura(jsonb, jsonb)', 'EXECUTE'),
  'authenticated NÃO pode executar');
select ok(
  has_function_privilege('service_role', 'public.sincronizar_estrutura(jsonb, jsonb)', 'EXECUTE'),
  'service_role pode executar');

select * from finish();
rollback;
