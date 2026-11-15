-- ============================================================================
-- TESTE DO VÍNCULO COM A COORDENAÇÃO TERRITORIAL (pgTAP) — Etapa B1, decisão R9 em decisoes-tecnicas-b1.md
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Na lista do SharePoint, as UCs não têm a CT como mãe (`id_mae`): o vínculo
-- com a CT vem só no `microgrupo` (ex.: "CT Curitiba"). O importador manda
-- esse vínculo no campo `coordenacao_territorial_icmbio_id`, e a função
-- `sincronizar_estrutura` o grava na coluna `unidades.coordenacao_territorial_id`.
-- Aqui provamos que:
--   (a) o vínculo é gravado (e a mãe continua sendo a GR, sem mudança);
--   (b) apontar para uma unidade que NÃO é Coordenação Territorial é recusado,
--       e nada daquela chamada fica gravado (atomicidade);
--   (c) apontar para uma unidade inexistente também é recusado.
-- Os códigos 'V-...' são inventados e não colidem com a estrutura real.
-- Tudo roda dentro de uma transação e é desfeito no final (rollback).
-- ============================================================================

begin;

select plan(8);

select has_column('public', 'unidades', 'coordenacao_territorial_id',
  'unidades tem a coluna coordenacao_territorial_id');

-- (a) GR V-1 → CT V-2 (filha da GR) e UC V-3 (filha da GR, vinculada à CT V-2)
select lives_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"V-1","nome":"GR de Teste","tipo":"gerencia-regional","ativa":true},
        {"icmbio_id":"V-2","nome":"CT de Teste","tipo":"coordenacao-territorial","ativa":true,"id_mae":"V-1"},
        {"icmbio_id":"V-3","nome":"PARNA de Teste","tipo":"uc","ativa":true,"id_mae":"V-1",
         "coordenacao_territorial_icmbio_id":"V-2"}]'::jsonb,
      '[]'::jsonb)$$,
  'carga com vínculo de CT é aceita');

select is(
  (select ct.icmbio_id || '/' || m.icmbio_id
     from public.unidades u
     join public.unidades ct on ct.id = u.coordenacao_territorial_id
     join public.unidades m  on m.id  = u.unidade_pai_id
    where u.icmbio_id = 'V-3'),
  'V-2/V-1',
  'UC V-3 vinculada à CT V-2, e a mãe continua sendo a GR V-1');

select is(
  (select coordenacao_territorial_id from public.unidades where icmbio_id = 'V-1'),
  null,
  'unidade sem vínculo informado fica com coordenacao_territorial_id nulo');

-- (b) Alvo que não é CT: V-11 aponta para a GR V-1. A unidade nova V-10, da
-- mesma chamada, também tem de ser desfeita.
select throws_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"V-10","nome":"Válida","tipo":"uc","ativa":true,"id_mae":"V-1"},
        {"icmbio_id":"V-11","nome":"Vínculo errado","tipo":"uc","ativa":true,"id_mae":"V-1",
         "coordenacao_territorial_icmbio_id":"V-1"}]'::jsonb,
      '[]'::jsonb)$$,
  '23514',
  null,
  'vínculo com unidade que não é Coordenação Territorial faz a chamada falhar');
select is(
  (select count(*)::int from public.unidades where icmbio_id in ('V-10', 'V-11')),
  0,
  'nenhuma unidade daquela chamada ficou gravada');

-- (c) Alvo inexistente.
select throws_ok(
  $$select public.sincronizar_estrutura(
      '[{"icmbio_id":"V-20","nome":"Órfã de CT","tipo":"uc","ativa":true,"id_mae":"V-1",
         "coordenacao_territorial_icmbio_id":"NAO-EXISTE"}]'::jsonb,
      '[]'::jsonb)$$,
  '23503',
  null,
  'vínculo com CT inexistente faz a chamada falhar');
select is(
  (select count(*)::int from public.unidades where icmbio_id = 'V-20'),
  0,
  'a unidade com CT inexistente não ficou gravada');

select * from finish();
rollback;
