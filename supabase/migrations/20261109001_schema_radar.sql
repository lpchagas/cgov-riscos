-- ============================================================================
-- MIGRATION 001: SCHEMA OFICIAL DO SISTEMA RADAR — ICMBio (REGIME B)
-- ============================================================================
--
-- EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO E ANALISTAS DE NEGÓCIO):
-- Um banco de dados relacional (como o PostgreSQL usado pelo Supabase) funciona
-- como um conjunto de planilhas inteligentes conectadas entre si por "códigos
-- únicos" chamados Chaves Primárias (PRIMARY KEY) e Chaves Estrangeiras
-- (FOREIGN KEY).
--
-- A grande vantagem deste arquivo SQL sobre listas antigas do SharePoint é que
-- o próprio banco de dados conhece a Portaria da Metodologia RADAR:
-- 1. Ele impede que alguém salve valores inválidos (usando travas `CHECK`);
-- 2. Ele calcula sozinho o Risco Inerente pela Matriz Assimétrica do Quadro 7
--    e o Risco Residual pelos Fatores do Quadro 6 através de um "Gatilho"
--    automático (`TRIGGER`) chamado `trg_calcular_risco_radar`.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE UNIDADES ORGANIZACIONAIS DO ICMBio (`unidades`)
-- Inclui explicitamente o tipo 'coordenacao-geral' (supervisora de Macroprocessos)
-- ----------------------------------------------------------------------------
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'presidencia',
    'diretoria',
    'coordenacao-geral',
    'gerencia-regional',
    'coordenacao',
    'centro-pesquisa',
    'ngi',
    'uc'
  )),
  unidade_pai_id UUID REFERENCES unidades(id),
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE CATEGORIAS DE RISCO E APETITE DA DAR (`categorias_risco`)
-- Quadro 2 (8 Categorias), Quadro 3 (6 Subcategorias de Integridade) e Anexo III (DAR)
-- ----------------------------------------------------------------------------
CREATE TABLE categorias_risco (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao_normativa TEXT NOT NULL,
  apetite_declarado TEXT NOT NULL DEFAULT 'pendente_dar' CHECK (
    apetite_declarado IN ('baixo', 'moderado', 'pendente_dar')
  ),
  justificativa_dar TEXT,
  subcategorias_permitidas JSONB DEFAULT '[]'::jsonb
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE PERFIS DE USUÁRIOS (`perfis_usuarios`)
-- Vincula usuários autenticados ao seu papel nas 3 Linhas de Governança
-- ----------------------------------------------------------------------------
CREATE TABLE perfis_usuarios (
  id UUID PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cargo TEXT,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  papel_governanca TEXT NOT NULL CHECK (
    papel_governanca IN ('gestor', 'lider_cg', 'diretor', 'cgov')
  ),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE OBJETOS DE GESTÃO DE RISCOS E CONTEXTO (`objetos_contexto`)
-- Operacionaliza a Seção 4.1 e o Quadro 1 da Metodologia RADAR
-- ----------------------------------------------------------------------------
CREATE TABLE objetos_contexto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_objeto TEXT NOT NULL CHECK (
    tipo_objeto IN ('Macroprocesso', 'Processo', 'Projeto', 'Plano', 'Ação', 'Unidade')
  ),
  nome_objeto TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  macroprocesso_supervisor_id UUID REFERENCES unidades(id),
  diretoria_id UUID REFERENCES unidades(id),
  objetivo_estrategico_associado TEXT NOT NULL,
  insumos_principais TEXT,
  entregas_principais TEXT,
  partes_interessadas TEXT,
  ciclo_ano INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. TABELA CENTRAL DE RISCOS (`riscos`)
-- ----------------------------------------------------------------------------
CREATE TABLE riscos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_radar TEXT NOT NULL UNIQUE,
  objeto_id UUID NOT NULL REFERENCES objetos_contexto(id) ON DELETE CASCADE,
  responsavel_risco_nome TEXT NOT NULL,

  -- Identificação Bow Tie e Sintaxe Obrigatória (Seção 4.2.1):
  causas TEXT NOT NULL,
  evento_risco TEXT NOT NULL,
  consequencias TEXT NOT NULL,
  objetivo_afetado TEXT NOT NULL,
  descricao_padrao TEXT NOT NULL,

  -- Categorização e Programa Integra+ (Portaria ICMBio nº 253/2026):
  categoria_id INT NOT NULL REFERENCES categorias_risco(id),
  subcategoria_integridade TEXT,
  teste_integridade_aplicavel BOOLEAN NOT NULL DEFAULT false,
  justificativa_nao_integridade TEXT,

  -- Análise Inerente (Quadros 4, 5, 7 e 8):
  probabilidade INT NOT NULL CHECK (probabilidade BETWEEN 1 AND 5),
  justificativa_probabilidade TEXT,
  impacto INT NOT NULL CHECK (impacto BETWEEN 1 AND 5),
  justificativa_impacto TEXT,
  nivel_inerente INT NOT NULL,
  classificacao_inerente TEXT NOT NULL CHECK (
    classificacao_inerente IN ('Baixo', 'Médio', 'Alto', 'Extremo')
  ),

  -- Avaliação de Controles e Análise Residual (Quadros 6 e 8 + DAR):
  possui_evidencia_controle BOOLEAN NOT NULL DEFAULT false,
  nivel_eficacia_controle TEXT NOT NULL DEFAULT 'Inexistente' CHECK (
    nivel_eficacia_controle IN ('Inexistente', 'Fraco', 'Mediano', 'Satisfatório', 'Forte')
  ),
  fator_controle NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (
    fator_controle IN (1.00, 0.90, 0.75, 0.60, 0.50)
  ),
  nivel_residual NUMERIC(5,2) NOT NULL,
  classificacao_residual TEXT NOT NULL CHECK (
    classificacao_residual IN ('Baixo', 'Médio', 'Alto', 'Extremo')
  ),
  status_critico TEXT NOT NULL DEFAULT 'sim' CHECK (
    status_critico IN ('sim', 'nao', 'pendente_dar')
  ),
  is_critico BOOLEAN NOT NULL DEFAULT false,

  -- Origem Preliminar (Passo 0 Skill CGOV) e Fluxo de Governança em 3 Degraus:
  origem_preliminar_cgov BOOLEAN NOT NULL DEFAULT false,
  status_fluxo TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status_fluxo IN (
      'preliminar_cgov',
      'rascunho',
      'em_validacao_cg',
      'em_homologacao_dir',
      'aprovado',
      'devolvido'
    )
  ),
  estrategia_principal TEXT NOT NULL DEFAULT 'Mitigar' CHECK (
    estrategia_principal IN ('Mitigar', 'Compartilhar', 'Evitar', 'Aceitar')
  ),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE CONTROLES EXISTENTES (`controles_existentes`)
-- ----------------------------------------------------------------------------
CREATE TABLE controles_existentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_id UUID NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  descricao_controle TEXT NOT NULL,
  evidencia_funcionamento TEXT NOT NULL,
  possui_evidencia_comprovada BOOLEAN NOT NULL DEFAULT false,
  desenho_adequado BOOLEAN NOT NULL DEFAULT false,
  operacao_comprovada BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. TABELA DE RESPOSTAS E TRATAMENTO 5W2H (`respostas_tratamento`)
-- ----------------------------------------------------------------------------
CREATE TABLE respostas_tratamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_id UUID NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  estrategia TEXT NOT NULL CHECK (
    estrategia IN ('Mitigar', 'Compartilhar', 'Evitar', 'Aceitar')
  ),
  acao_o_que TEXT NOT NULL,
  justificativa_por_que TEXT,
  local_onde TEXT,
  responsavel_quem TEXT NOT NULL,
  prazo_quando DATE NOT NULL,
  procedimento_como TEXT NOT NULL,
  custo_quanto TEXT DEFAULT 'Sem custo adicional',
  status_execucao TEXT NOT NULL DEFAULT 'nao_iniciada' CHECK (
    status_execucao IN ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada')
  ),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. TABELA DE INDICADORES-CHAVE DE RISCO (`indicadores_kri`) E MEDIÇÕES (`medicoes_kri`)
-- ----------------------------------------------------------------------------
CREATE TABLE indicadores_kri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_id UUID NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  nome_indicador TEXT NOT NULL,
  formula_calculo TEXT NOT NULL,
  fonte_dados TEXT NOT NULL,
  periodicidade TEXT NOT NULL CHECK (
    periodicidade IN ('Mensal', 'Trimestral', 'Semestral', 'Anual')
  ),
  meta_alvo TEXT NOT NULL,
  limite_alerta TEXT NOT NULL,
  responsavel_medicao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE medicoes_kri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES indicadores_kri(id) ON DELETE CASCADE,
  data_medicao DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_apurado TEXT NOT NULL,
  em_alerta BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. TABELAS DE FLUXO DE GOVERNANÇA E LOG DE AUDITORIA (`historico_fluxo` e `auditoria_log`)
-- ----------------------------------------------------------------------------
CREATE TABLE historico_fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_id UUID NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  acao TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  usuario_papel TEXT NOT NULL,
  despacho_texto TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auditoria_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_afetada TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  dados_novos JSONB,
  realizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- FUNÇÕES INTERNAS E TRIGGERS DO MOTOR MATEMÁTICO RADAR NO POSTGRESQL
-- ============================================================================

-- Função 1: Matriz Assimétrica do Quadro 7 (Impacto pesa mais que Probabilidade)
CREATE OR REPLACE FUNCTION calcular_nivel_inerente_q7(p INT, i INT)
RETURNS INT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  matriz INT[][] := ARRAY[
    ARRAY[ 1,  2,  4,  7, 11], -- Impacto 1 (Muito baixo)
    ARRAY[ 3,  5,  8, 12, 16], -- Impacto 2 (Baixo)
    ARRAY[ 6,  9, 13, 17, 20], -- Impacto 3 (Médio)
    ARRAY[10, 14, 18, 21, 23], -- Impacto 4 (Alto)
    ARRAY[15, 19, 22, 24, 25]  -- Impacto 5 (Muito alto)
  ];
BEGIN
  RETURN matriz[i][p];
END;
$$;

-- Função 2: Classificação nas faixas do Quadro 8 sem arredondamento prévio
CREATE OR REPLACE FUNCTION classificar_nivel_q8(valor NUMERIC)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF valor <= 5 THEN RETURN 'Baixo';
  ELSIF valor <= 10 THEN RETURN 'Médio';
  ELSIF valor <= 17 THEN RETURN 'Alto';
  ELSE RETURN 'Extremo';
  END IF;
END;
$$;

-- Função 3: Trigger que recalcula automaticamente Inerente, Trava do Quadro 6 e Residual
CREATE OR REPLACE FUNCTION trigger_calcular_risco_radar()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  apetite_cat TEXT;
BEGIN
  -- 1. Gera a sintaxe padrão da Seção 4.2.1
  NEW.descricao_padrao := 'Devido o(a) ' || trim(NEW.causas) ||
                          ', poderá ocorrer o(a) ' || trim(NEW.evento_risco) ||
                          ', ocasionando o(a) ' || trim(NEW.consequencias) ||
                          ' e impactando o alcance do ' || trim(NEW.objetivo_afetado) || '.';

  -- 2. Calcula Risco Inerente pelo Quadro 7
  NEW.nivel_inerente := calcular_nivel_inerente_q7(NEW.probabilidade, NEW.impacto);
  NEW.classificacao_inerente := classificar_nivel_q8(NEW.nivel_inerente);

  -- 3. Aplica a Trava Normativa de Evidência do Quadro 6
  IF NOT NEW.possui_evidencia_controle AND NEW.fator_controle < 0.90 THEN
    NEW.nivel_eficacia_controle := 'Fraco';
    NEW.fator_controle := 0.90;
  END IF;

  -- 4. Calcula Risco Residual e classifica sem arredondar antes da faixa
  NEW.nivel_residual := ROUND(NEW.nivel_inerente * NEW.fator_controle, 2);
  NEW.classificacao_residual := classificar_nivel_q8(NEW.nivel_residual);

  -- 5. Avalia Criticidade frente à DAR (Anexo III)
  SELECT apetite_declarado INTO apetite_cat
  FROM categorias_risco WHERE id = NEW.categoria_id;

  IF NEW.classificacao_residual IN ('Alto', 'Extremo') THEN
    NEW.status_critico := 'sim';
    NEW.is_critico := true;
  ELSIF NEW.classificacao_residual = 'Baixo' THEN
    NEW.status_critico := 'nao';
    NEW.is_critico := false;
  ELSE
    -- Residual Médio:
    IF apetite_cat = 'baixo' THEN
      NEW.status_critico := 'sim';
      NEW.is_critico := true;
    ELSIF apetite_cat = 'moderado' THEN
      NEW.status_critico := 'nao';
      NEW.is_critico := false;
    ELSE
      NEW.status_critico := 'pendente_dar';
      NEW.is_critico := false;
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_risco_radar
BEFORE INSERT OR UPDATE ON riscos
FOR EACH ROW EXECUTE FUNCTION trigger_calcular_risco_radar();
