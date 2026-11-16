-- ============================================================================
-- TESTE DA SEMENTE DE DEMONSTRAÇÃO (pgTAP) — Etapa B1, Tarefa 4
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Confere que `supabase/seed-demonstracao.sql` criou os 19 usuários fictícios
-- (@radar.test) com o perfil, a unidade (buscada por icmbio_id) e o
-- `titular_chefia` esperados, e os objetos/riscos de demonstração.
-- Este teste lê o banco JÁ semeado (npm run db:reset); não insere nada.
-- ============================================================================

begin;

select plan(23);

-- 1) Os 19 e-mails existem em auth.users
select is((select count(*)::int from auth.users where email like '%@radar.test'), 19,
          '19 usuários fictícios em auth.users');

-- 2) Perfis (listados em ordem COLLATE "C"): e-mail -> papel, icmbio_id da unidade, titular, ativo
--    (18 usuários com perfil, incluindo o inativo; o "sem-perfil" não tem)
select results_eq($$
  select p.email, p.papel_governanca, u.icmbio_id, p.titular_chefia, p.ativo
    from perfis_usuarios p join unidades u on u.id = p.unidade_id
   where p.email like '%@radar.test'
   -- COLLATE "C" = ordem por código de caractere; sem isso a ordem depende da
   -- configuração de idioma do banco (que ignora pontuação: 'gr@' vs 'gr1@').
   order by p.email collate "C"
$$, $$ values
  ('auditor@radar.test',          'auditoria',               '10.0034', false, true),
  ('centro@radar.test',           'gestor',                  '24.0030', true,  true),
  ('cg.cgpro@radar.test',         'coordenador_geral',       '10.2019', true,  true),
  ('cgge@radar.test',             'cgge',                    '10.0007', true,  true),
  ('cgov@radar.test',             'cgov',                    '10.0008', false, true),
  ('coord.cofis@radar.test',      'gestor',                  '10.2024', true,  true),
  ('ct@radar.test',               'coordenador_territorial', '23.5005', true,  true),
  ('diretor.dibio@radar.test',    'diretor',                 '10.4000', true,  true),
  ('diretor.diman@radar.test',    'diretor',                 '10.2000', true,  true),
  ('gabin@radar.test',            'gabin',                   '10.0002', true,  true),
  ('gestor.base@radar.test',      'gestor',                  '26.0112', true,  true),
  ('gestor.uc-sem-ct@radar.test', 'gestor',                  '21.0123', true,  true),
  ('gestor.uc@radar.test',        'gestor',                  '21.0078', true,  true),
  ('gr1@radar.test',              'gerente_regional',        '23.1000', true,  true),
  ('gr@radar.test',               'gerente_regional',        '23.5000', true,  true),
  ('inativo@radar.test',          'gestor',                  '21.0070', false, false),
  ('presidente@radar.test',       'presidencia',             '10.0000', true,  true),
  ('servidor.gr@radar.test',      'gestor',                  '23.5000', false, true)
$$, 'perfis com papel, unidade e titular esperados');

-- 3) O usuário sem perfil existe só em auth.users
select is((select count(*)::int from perfis_usuarios where email = 'sem-perfil@radar.test'), 0,
          'sem-perfil não tem linha em perfis_usuarios');

-- 4) Todo perfil de demonstração tem o mesmo id do usuário de auth.users
select is((select count(*)::int from perfis_usuarios p join auth.users a on a.id = p.id and a.email = p.email
            where p.email like '%@radar.test'), 18, 'ids de perfis_usuarios = auth.users');

-- 5) Formas da árvore usadas pelos testes de acesso
select is((select count(*)::int from unidades uc
             join unidades gr on gr.id = uc.unidade_pai_id and gr.icmbio_id = '23.5000'
             join unidades ct on ct.id = uc.coordenacao_territorial_id and ct.icmbio_id = '23.5005'
            where uc.icmbio_id = '21.0078' and uc.tipo = 'uc'), 1,
          'UC com CT: mãe é GR5 e coordenacao_territorial_id é a CT Curitiba');
select is((select count(*)::int from unidades uc
             join unidades gr on gr.id = uc.unidade_pai_id and gr.icmbio_id = '23.1000'
            where uc.icmbio_id = '21.0123' and uc.coordenacao_territorial_id is null), 1,
          'UC sem CT: mãe é GR1 e não há vínculo com CT');
select is((select count(*)::int from unidades b join unidades uc on uc.id = b.unidade_pai_id
            where b.icmbio_id = '26.0112' and b.tipo = 'base-avancada' and uc.icmbio_id = '21.0123'), 1,
          'Base Avançada é filha da UC sem CT');

-- 6) Objeto de UC ligado a processo 2.02.x (Proteção, supervisor CGPRO)
select ok(exists (select 1 from objetos_contexto o
                    join processos_cadeia_valor pc on pc.id = o.processo_id
                    join unidades s on s.id = pc.unidade_supervisora_id
                    join unidades uc on uc.id = o.unidade_id
                   where pc.proc_id like '2.02.%' and uc.tipo = 'uc' and s.sigla = 'CGPRO'),
          'objeto de UC ligado a processo 2.02.x supervisionado pela CGPRO');

-- 7) Pelo menos um risco em cada unidade exigida (uma verificação por unidade)
select ok(exists (select 1 from riscos r join objetos_contexto o on o.id = r.objeto_id
                   join unidades u on u.id = o.unidade_id where u.icmbio_id = x.id), 'risco em ' || x.rotulo)
  from (values ('21.0078','UC com CT'), ('21.0123','UC sem CT'), ('26.0112','Base Avançada'),
               ('23.5005','CT Curitiba'), ('23.5000','GR5'), ('10.2024','COFIS'),
               ('10.2019','CGPRO'), ('24.0030','Centro CNPT'), ('10.0008','CGOV'),
               ('10.0034','AUDIT')) as x(id, rotulo);

-- 8) Caso de Controle do Anexo II: P=3, I=5, sem evidência -> 22 / 22 Extremo / crítico
select results_eq($$
  select probabilidade, impacto, nivel_inerente, nivel_residual::numeric, classificacao_residual,
         status_critico, is_critico
    from riscos where codigo_radar = 'RADAR-2026-001'
$$, $$ values (3, 5, 22, 22.00::numeric, 'Extremo', 'sim', true) $$,
  'Anexo II: gatilho calculou 22 Extremo crítico');

-- 9) Há ao menos um risco crítico e um não crítico
select ok(exists (select 1 from riscos where is_critico), 'existe risco crítico');
select ok(exists (select 1 from riscos where not is_critico), 'existe risco não crítico');

-- 10) Todo risco da semente tem a descrição padrão gerada pelo gatilho
select is((select count(*)::int from riscos where descricao_padrao not like 'Devido o(a) %'), 0,
          'descrição padrão gerada pelo gatilho em todos os riscos');

-- 11) Itens de nomenclatura: nenhuma sigla proibida na semente
select is((select count(*)::int from riscos where descricao_padrao ilike '%PGR%'
              or evento_risco ilike '%PGR%' or causas ilike '%PGR%'), 0,
          'semente não usa a sigla PGR para Plano de Gestão de Riscos');

select * from finish();
rollback;
