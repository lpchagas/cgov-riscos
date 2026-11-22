-- ============================================================================
-- SEED OFICIAL: AS 8 CATEGORIAS DO QUADRO 2 (COM A DAR) E AS 6 SUBCATEGORIAS
-- DE INTEGRIDADE DO QUADRO 3
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Este arquivo roda depois das migrações, no `supabase db reset` (config.toml,
-- [db.seed]). Ele grava SÓ a parte normativa que todo ambiente precisa:
--   - as 8 categorias de risco do Quadro 2 da Metodologia (Minuta SEI
--     024421455, item 4.2.2), com o apetite da DAR (Anexo III);
--   - as 6 subcategorias de riscos para a integridade do Quadro 3 (item
--     4.2.2.1), na tabela `subcategorias_risco`.
-- Nomes e descrições são cópias LITERAIS da matriz-regras-regime-b (§4 e §5),
-- sem mudar uma vírgula (inclusive a "Lei nº 13.709/2013", erro material da
-- minuta: a LGPD é de 2018; não corrigir aqui).
--
-- O que NÃO está aqui (pendência D1-P4, comentário antigo corrigido):
--   - as unidades organizacionais vêm do importador
--     (`npm run sync:estrutura -- --sim`);
--   - os usuários, objetos e riscos de demonstração (inclusive o Caso de
--     Controle do Anexo II, RADAR-2026-001) vêm de
--     `supabase/seed-demonstracao.sql`.
--
-- ATENÇÃO: a migração 20261122001 (bloco 3) grava estes mesmos textos na
-- nuvem, e o teste tests/unit/schemaSql.spec.ts confere que os nomes daqui
-- são os de CATEGORIAS_OFICIAIS_QUADRO_2 e SUBCATEGORIAS_INTEGRIDADE_QUADRO_3
-- (calculadoraRiscoRadar.ts). Mudou aqui, mude lá.
-- ============================================================================

-- 1. As 8 categorias do Quadro 2.
-- Ids: 2 a 6 vêm da semente anterior (mantêm o apetite e a justificativa da
-- DAR); 1, 7 e 8 (Estratégico, Socioambiental, Tecnologia da Informação)
-- saíram; 9 a 11 entraram ainda sem DAR ('pendente_dar', sem justificativa).
INSERT INTO categorias_risco (id, nome, descricao_normativa, apetite_declarado, justificativa_dar)
VALUES
  (2, 'Operacional', 'Eventos que podem comprometer as atividades da ICMBio, normalmente associados a falhas, deficiência ou inadequação de processos internos, pessoas, infraestrutura e sistemas', 'moderado', 'Processos operacionais toleram nível residual até Médio; níveis Alto e Extremo são críticos.'),
  (3, 'Financeiro/Orçamentário', 'Eventos que podem comprometer a capacidade da ICMBio de contar com os recursos orçamentários e financeiros necessários à realização de suas atividades, ou eventos que possam comprometer a própria execução orçamentária, como atrasos no cronograma de licitações', 'baixo', 'Rigor fiscal e conformidade na execução de recursos públicos.'),
  (4, 'Legal', 'Eventos derivados de alterações legislativas ou normativas que podem comprometer as atividades da ICMBio', 'baixo', 'Baixa tolerância a desvios normativos e sanções legais.'),
  (5, 'Integridade', 'Eventos que podem favorecer ou facilitar a ocorrência de práticas de corrupção, fraudes, irregularidades e/ou desvios éticos e de conduta, podendo comprometer os objetivos da instituição', 'baixo', 'Tolerância zero/apetite baixo para desvios éticos e de integridade.'),
  (6, 'Reputação', 'Eventos que podem comprometer a confiança da sociedade em relação à capacidade do ICMBio em cumprir sua missão institucional, interferem diretamente na imagem da autarquia', 'baixo', 'Preservação da credibilidade técnico-científica e socioambiental da Autarquia.'),
  (9, 'Riscos da visitação', 'Eventos que podem comprometer a segurança dos visitantes durante atividades de uso público nas Unidades de Conservação, decorrentes de perigos inerentes ao ambiente natural ou das operações necessárias para a realização da visitação, tais como trilhas, atrativos, embarcações, atividades recreativas e serviços de apoio.', 'pendente_dar', NULL),
  (10, 'Ocupacionais', 'Eventos que podem comprometer a saúde, a integridade física ou a segurança dos servidores e colaboradores do ICMBio no desempenho de suas atividades institucionais.', 'pendente_dar', NULL),
  (11, 'Privacidade e Proteção de Dados', 'Eventos que possam comprometer a proteção, a privacidade e a segurança dos dados pessoais tratados pelo ICMBio, tais como vazamentos de informações, acessos não autorizados, uso inadequado de dados, falhas nos controles de segurança ou descumprimento das disposições da Lei nº 13.709/2013 - Lei Geral de Proteção de Dados Pessoais (LGPD)', 'pendente_dar', NULL);

-- 2. Acerta a sequência dos ids das categorias.
-- EXPLICAÇÃO DIDÁTICA: a coluna `id` de categorias_risco é SERIAL, ou seja,
-- ganha o próximo número de um "contador" (a sequência categorias_risco_id_seq).
-- Acima gravamos os ids À MÃO, e isso NÃO avança o contador: ele continuaria
-- em 1. O próximo cadastro pegaria um id já usado e daria erro de chave
-- duplicada (23505). O setval põe o contador no maior id existente (11); o
-- próximo cadastro recebe 12.
SELECT setval('categorias_risco_id_seq', (SELECT max(id) FROM categorias_risco));

-- 3. As 6 subcategorias de Integridade do Quadro 3 (categoria 5), na ordem do quadro.
-- Um risco da Integridade só grava com uma delas (chave estrangeira
-- riscos_subcategoria_fk e gatilho trg_riscos_exige_subcategoria).
INSERT INTO subcategorias_risco (categoria_id, nome, descricao_normativa, ordem)
VALUES
  (5, 'Abuso de posição ou poder em favor de interesses privados', 'Conduta contrária ao interesse público, valendo-se da condição para atender interesse privado, em benefício próprio ou de terceiros.', 1),
  (5, 'Nepotismo', 'Uma das formas de abuso de posição ou poder em favor de interesses privados, em que se favorecem familiares. Ele pode ser presumido ou requerer apuração específica.', 2),
  (5, 'Conflito de interesses', 'Situação gerada pelo confronto entre interesses públicos e privados, que possa comprometer o interesse coletivo ou influenciar, de maneira imprópria, o desempenho da função pública.', 3),
  (5, 'Pressão interna ou externa ilegal para influenciar agente público', 'Pressões explícitas ou implícitas de natureza hierárquica (interna), de colegas de trabalho (organizacional), política ou social (externa), que podem influenciar indevidamente atuação do agente público', 4),
  (5, 'Solicitação ou recebimento de vantagem indevida', 'Caracteriza-se por qualquer tipo de enriquecimento ilícito, seja dinheiro ou outra utilidade, dado que ao agente público não se permite colher vantagens em virtude do exercício de suas atividades', 5),
  (5, 'Utilização de recursos públicos em favor de interesses privados', 'Apropriação indevida, irregularidades em contratações públicas e outras formas de utilização de recursos públicos para uso privado (exemplos: veículos oficiais, utilização imprópria de tempo de trabalho, de equipamentos do escritório, entre outros).', 6);
