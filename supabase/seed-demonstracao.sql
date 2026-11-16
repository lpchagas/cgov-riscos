-- ============================================================================
-- SEMENTE DE DEMONSTRAÇÃO — Etapa B1 / Tarefa 4
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Cria usuários FICTÍCIOS (e-mails @radar.test, nenhuma pessoa real) em
-- unidades REAIS da árvore importada do ICMBio, mais objetos e riscos de
-- demonstração. As Tarefas 5 a 8 (RLS e fluxo) usam estes usuários pelo e-mail.
--
-- QUANDO RODA: depois de `supabase db reset` e do importador
-- (`npm run sync:estrutura -- --sim`), pois precisa das unidades já
-- carregadas. O script npm `db:reset` já encadeia os três passos.
-- Se alguma unidade não for encontrada, o script FALHA (nada é gravado).
--
-- As unidades são localizadas por `icmbio_id` (as siglas se repetem).
--
-- UNIDADES ESCOLHIDAS (todas reais; pai -> vínculo com CT):
--   21.0078  FLONA de Caçador        uc        pai GR5, CT Curitiba  (= "UC com CT")
--   21.0123  FLONA do Tapajós        uc        pai GR1, sem CT       (= "UC sem CT")
--            GR5 não tem UC sem vínculo com CT; por isso a UC sem CT é da GR1
--            e há um 19º usuário, `gr1@radar.test` (gerente regional da GR1).
--   26.0112  BAV Belterra            base-avancada, filha da FLONA do Tapajós
--   23.5005  CT Curitiba             coordenacao-territorial, pai GR5
--   23.5000  GR5                     gerencia-regional (Sul)
--   23.1000  GR1                     gerencia-regional (Norte)
--   10.2019  CGPRO                   coordenacao-geral (Proteção), pai DIMAN
--   10.2024  COFIS                   coordenacao, pai CGPRO
--   10.4000  DIBIO / 10.2000 DIMAN   diretorias
--   24.0030  CNPT                    centro-pesquisa (Centro Nacional), pai DIBIO
--   10.0000  ICMBio (Presidência)    10.0034 AUDIT   10.0008 CGOV
--   10.0007  CGGE                    10.0002 GABIN
--   21.0070  ESEC do Taim            (só para o usuário inativo)
--
-- UUIDs FIXOS (para os testes serem determinísticos): padrão
--   00000000-0000-4000-a000-0000000000NN , com NN abaixo.
--   01 gestor.uc   02 gestor.uc-sem-ct   03 gestor.base   04 ct   05 gr
--   06 servidor.gr 07 cg.cgpro   08 coord.cofis   09 diretor.dibio
--   10 diretor.diman   11 centro   12 presidente   13 auditor   14 cgov
--   15 cgge   16 gabin   17 sem-perfil   18 inativo   19 gr1
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tabela temporária com os usuários (e-mail, papel, unidade, titular, ativo)
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _demo_usuarios (
  n INT, email TEXT, nome TEXT, cargo TEXT, papel TEXT,
  icmbio_id TEXT,            -- NULL = usuário só em auth.users (sem perfil)
  titular BOOLEAN, ativo BOOLEAN
) ON COMMIT DROP;

INSERT INTO _demo_usuarios VALUES
  (1,  'gestor.uc@radar.test',       'Gestor Fictício UC com CT',     'Chefe da UC',               'gestor',                  '21.0078', true,  true),
  (2,  'gestor.uc-sem-ct@radar.test','Gestor Fictício UC sem CT',     'Chefe da UC',               'gestor',                  '21.0123', true,  true),
  (3,  'gestor.base@radar.test',     'Gestor Fictício Base Avançada', 'Chefe da Base Avançada',    'gestor',                  '26.0112', true,  true),
  (4,  'ct@radar.test',              'Coordenador Fictício CT',       'Coordenador Territorial',   'coordenador_territorial', '23.5005', true,  true),
  (5,  'gr@radar.test',              'Gerente Fictício GR5',          'Gerente Regional',          'gerente_regional',        '23.5000', true,  true),
  (6,  'servidor.gr@radar.test',     'Servidor Fictício GR5',         'Servidor',                  'gestor',                  '23.5000', false, true),
  (7,  'cg.cgpro@radar.test',        'Coordenador-Geral Fictício CGPRO','Coordenador-Geral',       'coordenador_geral',       '10.2019', true,  true),
  (8,  'coord.cofis@radar.test',     'Coordenador Fictício COFIS',    'Coordenador',               'gestor',                  '10.2024', true,  true),
  (9,  'diretor.dibio@radar.test',   'Diretor Fictício DIBIO',        'Diretor',                   'diretor',                 '10.4000', true,  true),
  (10, 'diretor.diman@radar.test',   'Diretor Fictício DIMAN',        'Diretor',                   'diretor',                 '10.2000', true,  true),
  (11, 'centro@radar.test',          'Chefe Fictício Centro Nacional','Chefe de Centro',           'gestor',                  '24.0030', true,  true),
  (12, 'presidente@radar.test',      'Presidente Fictício',           'Presidente',                'presidencia',             '10.0000', true,  true),
  (13, 'auditor@radar.test',         'Auditor Fictício',              'Auditor',                   'auditoria',               '10.0034', false, true),
  (14, 'cgov@radar.test',            'Servidor Fictício CGOV',        'Servidor da CGOV',          'cgov',                    '10.0008', false, true),
  (15, 'cgge@radar.test',            'Coordenador-Geral Fictício CGGE','Coordenador-Geral',        'cgge',                    '10.0007', true,  true),
  (16, 'gabin@radar.test',           'Titular Fictício do GABIN',     'Chefe de Gabinete',         'gabin',                   '10.0002', true,  true),
  (17, 'sem-perfil@radar.test',      'Usuário Fictício sem Perfil',   NULL,                        NULL,                      NULL,      false, true),
  (18, 'inativo@radar.test',         'Gestor Fictício Inativo',       'Chefe da UC',               'gestor',                  '21.0070', false, false),
  (19, 'gr1@radar.test',             'Gerente Fictício GR1',          'Gerente Regional',          'gerente_regional',        '23.1000', true,  true);

-- Falha cedo e com mensagem clara se alguma unidade não existir (importador não rodou?).
DO $$
DECLARE v_faltam TEXT;
BEGIN
  SELECT string_agg(d.icmbio_id, ', ') INTO v_faltam
    FROM _demo_usuarios d
   WHERE d.icmbio_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.icmbio_id = d.icmbio_id);
  IF v_faltam IS NOT NULL THEN
    RAISE EXCEPTION 'Semente: unidades não encontradas (%). Rode antes: npm run sync:estrutura -- --sim', v_faltam;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. auth.users (login local; senha vazia — o login de teste usa JWT forjado)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
SELECT ('00000000-0000-4000-a000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', ''
  FROM _demo_usuarios;

-- ----------------------------------------------------------------------------
-- 3. perfis_usuarios (todos, exceto o usuário sem perfil)
-- ----------------------------------------------------------------------------
INSERT INTO public.perfis_usuarios
  (id, nome_completo, email, cargo, unidade_id, papel_governanca, ativo, titular_chefia)
SELECT ('00000000-0000-4000-a000-' || lpad(d.n::text, 12, '0'))::uuid,
       d.nome, d.email, d.cargo, u.id, d.papel, d.ativo, d.titular
  FROM _demo_usuarios d
  JOIN public.unidades u ON u.icmbio_id = d.icmbio_id
 WHERE d.papel IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Objetos de gestão de riscos (um por unidade; UUID fixo = ...b000-...NN)
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _demo_objetos (n INT, icmbio_id TEXT, tipo TEXT, nome TEXT, proc TEXT) ON COMMIT DROP;
INSERT INTO _demo_objetos VALUES
  (1,  '21.0078', 'Unidade',  'Demo — Gestão da FLONA de Caçador (UC com CT)',        NULL),
  (2,  '21.0123', 'Processo', 'Demo — Fiscalização ambiental na FLONA do Tapajós',     '2.02.3'),
  (3,  '26.0112', 'Unidade',  'Demo — Base Avançada Belterra',                         NULL),
  (4,  '23.5005', 'Unidade',  'Demo — Coordenação Territorial Curitiba',               NULL),
  (5,  '23.5000', 'Unidade',  'Demo — Gerência Regional Sul (GR5)',                    NULL),
  (6,  '10.2024', 'Processo', 'Demo — Fiscalização (COFIS)',                           NULL),
  (7,  '10.2019', 'Processo', 'Demo — Proteção ambiental (CGPRO)',                     NULL),
  (8,  '24.0030', 'Unidade',  'Demo — Centro Nacional CNPT',                           NULL),
  (9,  '10.0008', 'Processo', 'Gestão e Execução de Processos Críticos da Unidade (Caso de Controle Anexo II)', NULL),
  (10, '10.0034', 'Unidade',  'Demo — Auditoria Interna',                              NULL);

-- Objetos de UC/Centro/CT/GR: supervisor = CGPRO (para o 2.02.x) ou nulo; diretoria = DIMAN
-- no objeto ligado ao processo de Proteção, DIBIO no do Centro. Anexo II: supervisor CGGE.
INSERT INTO public.objetos_contexto
  (id, tipo_objeto, nome_objeto, unidade_id, processo_id, macroprocesso_supervisor_id,
   diretoria_id, objetivo_estrategico_associado, ciclo_ano)
SELECT ('00000000-0000-4000-b000-' || lpad(o.n::text, 12, '0'))::uuid,
       o.tipo, o.nome, u.id,
       (SELECT p.id FROM public.processos_cadeia_valor p WHERE p.proc_id = o.proc),
       CASE WHEN o.proc IS NOT NULL THEN (SELECT id FROM public.unidades WHERE icmbio_id = '10.2019')
            WHEN o.n = 9 THEN (SELECT id FROM public.unidades WHERE icmbio_id = '10.0007') END,
       CASE WHEN o.proc IS NOT NULL THEN (SELECT id FROM public.unidades WHERE icmbio_id = '10.2000')
            WHEN o.n = 8 THEN (SELECT id FROM public.unidades WHERE icmbio_id = '10.4000') END,
       'Garantir a continuidade operacional e a governança dos processos institucionais do ICMBio.',
       2026
  FROM _demo_objetos o
  JOIN public.unidades u ON u.icmbio_id = o.icmbio_id;

-- Falha se o processo 2.02.3 não existir (o objeto 2 ficaria sem processo).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.objetos_contexto WHERE processo_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Semente: processo 2.02.3 não encontrado (importador não rodou?)';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Riscos: inserimos só as ENTRADAS; o gatilho trigger_calcular_risco_radar
--    calcula inerente (Quadro 7), residual, classificação e criticidade.
--    Como o gatilho NÃO deriva o fator a partir do nível de eficácia, o fator
--    informado aqui segue o Quadro 6 (Inexistente 1,00 | Forte 0,50).
--    Nenhum risco 'pendente_dar': nenhuma categoria semeada tem esse apetite.
-- ----------------------------------------------------------------------------
-- (obj, código, P, I, evidência, eficácia, fator, categoria, fluxo)
CREATE TEMP TABLE _demo_riscos (
  obj INT, codigo TEXT, p INT, i INT, evid BOOLEAN, eficacia TEXT, fator NUMERIC,
  cat INT, fluxo TEXT
) ON COMMIT DROP;
INSERT INTO _demo_riscos VALUES
  (1,  'RADAR-DEMO-UC-CT',  2, 2, false, 'Inexistente', 1.00, 2, 'rascunho'),         -- Baixo, não crítico
  (2,  'RADAR-DEMO-UC-SCT', 4, 4, false, 'Inexistente', 1.00, 7, 'em_validacao_cg'),  -- Alto, crítico
  (3,  'RADAR-DEMO-BASE',   3, 3, false, 'Inexistente', 1.00, 2, 'rascunho'),
  (4,  'RADAR-DEMO-CT',     3, 4, false, 'Inexistente', 1.00, 2, 'em_validacao_cg'),
  (5,  'RADAR-DEMO-GR5',    2, 3, false, 'Inexistente', 1.00, 1, 'em_homologacao_dir'),
  (6,  'RADAR-DEMO-COFIS',  4, 5, true,  'Forte',       0.50, 4, 'aprovado'),
  (7,  'RADAR-DEMO-CGPRO',  1, 2, false, 'Inexistente', 1.00, 2, 'aprovado'),
  (8,  'RADAR-DEMO-CENTRO', 2, 2, false, 'Inexistente', 1.00, 7, 'rascunho'),
  (9,  'RADAR-2026-001',    3, 5, false, 'Inexistente', 1.00, 2, 'em_validacao_cg'),  -- Anexo II: 22 Extremo, crítico
  (10, 'RADAR-DEMO-AUDIT',  1, 1, false, 'Inexistente', 1.00, 2, 'rascunho');

INSERT INTO public.riscos
  (codigo_radar, objeto_id, responsavel_risco_nome, causas, evento_risco, consequencias,
   objetivo_afetado, descricao_padrao, categoria_id, probabilidade, justificativa_probabilidade,
   impacto, justificativa_impacto, nivel_inerente, classificacao_inerente,
   possui_evidencia_controle, nivel_eficacia_controle, fator_controle,
   nivel_residual, classificacao_residual, status_fluxo)
SELECT r.codigo,
       ('00000000-0000-4000-b000-' || lpad(r.obj::text, 12, '0'))::uuid,
       'Gestor de Riscos da Unidade (1ª Linha)',
       'concentração do conhecimento técnico em um único servidor, ausência de manuais operacionais padronizados e inexistência de substituto formalmente capacitado',
       'afastamento inesperado ou rotatividade do servidor responsável pela condução do processo crítico',
       'paralisação das entregas da unidade, atraso no cumprimento de prazos legais e perda de memória técnica institucional',
       'continuidade e tempestividade das entregas previstas no Planejamento Estratégico do ICMBio',
       'a recalcular pelo gatilho',               -- sobrescrito pelo gatilho
       r.cat, r.p, 'Justificativa de demonstração da probabilidade.',
       r.i, 'Justificativa de demonstração do impacto.',
       0, 'Baixo',                                 -- placeholders: o gatilho recalcula
       r.evid, r.eficacia, r.fator,
       0, 'Baixo',                                 -- placeholders: o gatilho recalcula
       r.fluxo
  FROM _demo_riscos r;

COMMIT;
