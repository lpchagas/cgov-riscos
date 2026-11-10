-- ============================================================================
-- MIGRATION 002: SEGURANÇA POR LINHA (ROW LEVEL SECURITY — RLS)
-- ============================================================================
--
-- EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO E CGTI/ICMBio):
-- O "Row Level Security" (Segurança em Nível de Linha) é um recurso nativo do
-- PostgreSQL que funciona como um guarda de trânsito dentro da própria tabela:
-- - Todos os servidores autenticados podem consultar o painel para transparência;
-- - Apenas gestores da unidade dona do processo ou a CGOV podem editar o risco;
-- - Apenas Coordenadores-Gerais (`lider_cg`), Diretores (`diretor`) e a `cgov`
--   podem aprovar ou homologar riscos no fluxo em 3 degraus.
-- ============================================================================

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_risco ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetos_contexto ENABLE ROW LEVEL SECURITY;
ALTER TABLE riscos ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_existentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_tratamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_kri ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes_kri ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_fluxo ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Institucional para usuários autenticados:
CREATE POLICY "Leitura institucional de unidades"
  ON unidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de categorias"
  ON categorias_risco FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de objetos_contexto"
  ON objetos_contexto FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de riscos"
  ON riscos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de controles_existentes"
  ON controles_existentes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de respostas_tratamento"
  ON respostas_tratamento FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de indicadores_kri"
  ON indicadores_kri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de medicoes_kri"
  ON medicoes_kri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura institucional de historico_fluxo"
  ON historico_fluxo FOR SELECT TO authenticated USING (true);
