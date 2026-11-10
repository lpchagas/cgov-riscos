-- ============================================================================
-- SEED OFICIAL: UNIDADES (COM COORDENAÇÕES-GERAIS), 8 CATEGORIAS E CASO ANEXO II
-- ============================================================================

-- 1. As 8 Categorias Oficiais do Quadro 2 + 6 Subcategorias de Integridade do Quadro 3
INSERT INTO categorias_risco (id, nome, descricao_normativa, apetite_declarado, justificativa_dar, subcategorias_permitidas)
VALUES
  (1, 'Estratégico', 'Eventos que afetam objetivos estratégicos e a missão institucional do ICMBio.', 'moderado', 'Admite-se risco residual até Médio em iniciativas estratégicas sob monitoramento.', '[]'::jsonb),
  (2, 'Operacional', 'Falhas, deficiências ou inadequações em processos internos, pessoas ou sistemas.', 'moderado', 'Processos operacionais toleram nível residual até Médio; níveis Alto e Extremo são críticos.', '[]'::jsonb),
  (3, 'Orçamentário/Financeiro', 'Eventos que comprometem a execução orçamentária, financeira ou contratual.', 'baixo', 'Rigor fiscal e conformidade na execução de recursos públicos.', '[]'::jsonb),
  (4, 'Conformidade/Legal', 'Descumprimento de leis, portarias, instruções normativas ou determinações de órgãos de controle.', 'baixo', 'Baixa tolerância a desvios normativos e sanções legais.', '[]'::jsonb),
  (5, 'Integridade', 'Vulnerabilidades relacionadas a corrupção, fraude, nepotismo, conflito de interesses ou assédio (Portaria 253/2026 — Integra+).', 'baixo', 'Tolerância zero/apetite baixo para desvios éticos e de integridade.', '["Corrupção e Fraude", "Conflito de Interesses e Nepotismo", "Assédio Moral, Sexual e Discriminação", "Vazamento ou Uso Indevido de Informação Restrita", "Quebra de Imparcialidade ou Favorecimento Indevido", "Desvio de Recursos Públicos ou Patrimoniais"]'::jsonb),
  (6, 'Imagem/Reputação', 'Eventos que abalam a credibilidade e a confiança da sociedade no ICMBio.', 'baixo', 'Preservação da credibilidade técnico-científica e socioambiental da Autarquia.', '[]'::jsonb),
  (7, 'Socioambiental', 'Eventos que impactam ecossistemas, unidades de conservação ou populações tradicionais.', 'baixo', 'Missão finalística de conservação da biodiversidade.', '[]'::jsonb),
  (8, 'Tecnologia da Informação', 'Indisponibilidade de sistemas, incidentes cibernéticos ou perda de dados institucionais.', 'moderado', 'Sistemas suportam risco residual até Médio com plano de contingência ativo.', '[]'::jsonb);
