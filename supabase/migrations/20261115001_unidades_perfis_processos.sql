-- ============================================================================
-- ETAPA B1 / TAREFA 2 — Unidades, perfis de acesso e processos da cadeia de valor
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- Esta migração prepara o banco para receber a árvore organizacional real do
-- ICMBio e os 10 perfis de acesso. NÃO mexe nas funções de cálculo de risco
-- (Quadros 6, 7 e 8) nem no gatilho de cálculo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UNIDADES: colunas novas, sigla opcional e mais tipos
-- ----------------------------------------------------------------------------

-- icmbio_id: identificador oficial da unidade no cadastro do ICMBio (único).
-- hierarquia / nome_completo / grupo_regional: dados descritivos da árvore.
-- atualizado_em: data da última carga/alteração da linha.
ALTER TABLE unidades
  ADD COLUMN icmbio_id TEXT UNIQUE,
  ADD COLUMN hierarquia TEXT,
  ADD COLUMN nome_completo TEXT,
  ADD COLUMN grupo_regional TEXT,
  ADD COLUMN atualizado_em TIMESTAMPTZ;

-- A sigla deixa de ser obrigatória e única: várias unidades reais repetem
-- sigla ou não têm sigla. A identidade passa a ser o icmbio_id.
ALTER TABLE unidades DROP CONSTRAINT unidades_sigla_key;
ALTER TABLE unidades ALTER COLUMN sigla DROP NOT NULL;

-- Amplia a lista de tipos aceitos (de 8 para 16 valores).
-- Nome real da constraint antiga: unidades_tipo_check.
ALTER TABLE unidades DROP CONSTRAINT unidades_tipo_check;
ALTER TABLE unidades ADD CONSTRAINT unidades_tipo_check CHECK (tipo IN (
  'presidencia', 'diretoria', 'coordenacao-geral', 'gerencia-regional',
  'coordenacao', 'centro-pesquisa', 'ngi', 'uc',
  'coordenacao-territorial', 'coordenacao-assessoramento', 'orgao-assistencia',
  'gabinete', 'divisao', 'servico', 'setor', 'base-avancada'
));

-- Índice para percorrer a árvore (buscar filhas de uma unidade) rapidamente.
CREATE INDEX idx_unidades_unidade_pai_id ON unidades (unidade_pai_id);

-- ----------------------------------------------------------------------------
-- 2. PROCESSOS DA CADEIA DE VALOR
-- ----------------------------------------------------------------------------
CREATE TABLE processos_cadeia_valor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proc_id TEXT NOT NULL UNIQUE,          -- código do processo na cadeia de valor
  nome TEXT NOT NULL,
  macro_id TEXT,                         -- código do macroprocesso
  macroprocesso TEXT,                    -- nome do macroprocesso
  proc_tipo TEXT,                        -- finalístico, apoio ou gerencial
  unidade_lider_id UUID REFERENCES unidades(id),
  unidade_supervisora_id UUID REFERENCES unidades(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  atualizado_em TIMESTAMPTZ
);

-- Liga (opcionalmente) um objeto de gestão de riscos a um processo.
ALTER TABLE objetos_contexto
  ADD COLUMN processo_id UUID REFERENCES processos_cadeia_valor(id);

CREATE INDEX idx_objetos_contexto_unidade_id ON objetos_contexto (unidade_id);
CREATE INDEX idx_objetos_contexto_processo_id ON objetos_contexto (processo_id);

-- ----------------------------------------------------------------------------
-- 3. PERFIS DE USUÁRIOS: vínculo com auth.users e os 10 papéis
-- ----------------------------------------------------------------------------

-- Se o usuário for apagado do Supabase Auth, o perfil some junto (CASCADE).
ALTER TABLE perfis_usuarios
  ADD CONSTRAINT perfis_usuarios_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE perfis_usuarios
  ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN titular_chefia BOOLEAN NOT NULL DEFAULT false;

-- Primeiro remove a regra antiga (senão o UPDATE abaixo seria recusado)...
ALTER TABLE perfis_usuarios DROP CONSTRAINT perfis_usuarios_papel_governanca_check;

-- ...depois converte o nome antigo 'lider_cg' para 'coordenador_geral'...
UPDATE perfis_usuarios SET papel_governanca = 'coordenador_geral'
 WHERE papel_governanca = 'lider_cg';

-- ...e por fim cria a regra nova com os 10 perfis.
ALTER TABLE perfis_usuarios ADD CONSTRAINT perfis_usuarios_papel_governanca_check CHECK (
  papel_governanca IN (
    'gestor', 'coordenador_territorial', 'gerente_regional', 'coordenador_geral',
    'diretor', 'presidencia', 'auditoria', 'cgov', 'cgge', 'gabin'
  )
);

-- ----------------------------------------------------------------------------
-- 3-A. VÍNCULO DA UNIDADE COM A COORDENAÇÃO TERRITORIAL (decisão R9 em decisoes-tecnicas-b1.md)
-- ----------------------------------------------------------------------------
-- EXPLICAÇÃO DIDÁTICA:
-- A CT (Coordenação Territorial) acompanha as UCs de uma região, mas na lista
-- do SharePoint ela NÃO aparece como mãe das UCs: a UC fica sob um NGI ou
-- direto sob a GR (`unidade_pai_id`). O vínculo com a CT vem só no texto do
-- `microgrupo` (ex.: "CT Curitiba"). Por isso ele ganha uma coluna própria,
-- separada da árvore:
--
--   PARNA X ──mãe──▶ GR5          (unidade_pai_id: árvore hierárquica)
--   PARNA X ──CT───▶ CT Curitiba  (coordenacao_territorial_id: vínculo de CT)
--
-- A coluna é opcional (a maioria das unidades não tem CT). A regra "o alvo tem
-- de ser do tipo coordenacao-territorial" é conferida pela função
-- `sincronizar_estrutura` (abaixo), que é o único caminho de carga; não usamos
-- gatilho para não pesar nas outras gravações da tabela.
ALTER TABLE unidades
  ADD COLUMN coordenacao_territorial_id UUID NULL REFERENCES public.unidades(id);

-- Índice para listar rapidamente as unidades vinculadas a uma CT.
CREATE INDEX idx_unidades_coordenacao_territorial_id ON unidades (coordenacao_territorial_id);

-- ----------------------------------------------------------------------------
-- 4. FUNÇÃO DO IMPORTADOR: sincronizar_estrutura (aplicação ATÔMICA)
-- ----------------------------------------------------------------------------
-- EXPLICAÇÃO DIDÁTICA:
-- O importador (`npm run sync:estrutura`) monta, em TypeScript, a lista das
-- unidades e dos processos que mudaram e chama ESTA função UMA única vez.
--
-- Por que uma função? Porque no PostgreSQL uma chamada de função é um único
-- comando, e todo comando roda dentro de uma transação: ou tudo dá certo, ou
-- nada fica gravado. Exemplo: se a 2ª unidade vier com um tipo inválido, a 1ª
-- (que já tinha sido inserida dentro da função) também é desfeita. Antes, o
-- importador fazia várias chamadas separadas à API, e uma falha no meio
-- deixava o banco pela metade.
--
-- Formato dos parâmetros (listas JSON, os mesmos nomes do importador):
--   p_unidades:  [{ "icmbio_id", "id_mae", "sigla", "nome", "nome_completo",
--                   "tipo", "hierarquia", "grupo_regional", "ativa",
--                   "coordenacao_territorial_icmbio_id" }, ...]
--   p_processos: [{ "proc_id", "nome", "macro_id", "macroprocesso", "proc_tipo",
--                   "lider_icmbio_id", "supervisor_icmbio_id", "ativo" }, ...]
--   As unidades e os processos são ligados pelo `icmbio_id` (chave natural); a
--   própria função troca esse código pelo UUID interno.
--
-- Regras:
--   - NUNCA apaga linhas. Unidade/processo que sumiu da lista chega aqui com
--     `ativa`/`ativo` = false (Política, art. 15, VI: o histórico continua).
--   - Mãe, líder ou supervisor que não existam no banco nem na lista → erro
--     (e, portanto, nada é gravado).
--   - Vínculo de CT que aponte para unidade inexistente → erro 23503; para
--     unidade que não seja do tipo 'coordenacao-territorial' → erro 23514.
--
-- Segurança: SECURITY DEFINER roda com os direitos do dono (ignora o RLS), por
-- isso (1) `search_path` vazio e nomes sempre com `public.`, para ninguém
-- "trocar" uma tabela por outra de mesmo nome; e (2) só o `service_role` (o
-- importador, na máquina da CGOV) pode executar — `anon` e `authenticated`, não.
CREATE OR REPLACE FUNCTION public.sincronizar_estrutura(p_unidades jsonb, p_processos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unidades  integer := 0;
  v_processos integer := 0;
  v_faltando  text;
BEGIN
  -- Passo 1: grava os dados das unidades (ainda sem a mãe, porque a mãe de
  -- uma unidade nova pode ser nova também e ainda não ter UUID).
  INSERT INTO public.unidades AS dest
    (icmbio_id, sigla, nome, nome_completo, tipo, hierarquia, grupo_regional, ativa, atualizado_em)
  SELECT u.icmbio_id, u.sigla, u.nome, u.nome_completo, u.tipo, u.hierarquia,
         u.grupo_regional, coalesce(u.ativa, true), now()
    FROM jsonb_to_recordset(coalesce(p_unidades, '[]'::jsonb)) AS u(
           icmbio_id text, sigla text, nome text, nome_completo text, tipo text,
           hierarquia text, grupo_regional text, ativa boolean)
  ON CONFLICT (icmbio_id) DO UPDATE SET
    sigla          = EXCLUDED.sigla,
    nome           = EXCLUDED.nome,
    nome_completo  = EXCLUDED.nome_completo,
    tipo           = EXCLUDED.tipo,
    hierarquia     = EXCLUDED.hierarquia,
    grupo_regional = EXCLUDED.grupo_regional,
    ativa          = EXCLUDED.ativa,
    atualizado_em  = EXCLUDED.atualizado_em;
  GET DIAGNOSTICS v_unidades = ROW_COUNT;

  -- Passo 2: confere se toda mãe informada existe (no banco ou nesta carga)...
  SELECT string_agg(u.icmbio_id || ' → ' || u.id_mae, ', ') INTO v_faltando
    FROM jsonb_to_recordset(coalesce(p_unidades, '[]'::jsonb)) AS u(icmbio_id text, id_mae text)
   WHERE u.id_mae IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.unidades m WHERE m.icmbio_id = u.id_mae);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: unidade-mãe inexistente: %', v_faltando
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ...confere o vínculo de CT (decisão R9 em decisoes-tecnicas-b1.md): o alvo tem de existir...
  SELECT string_agg(u.icmbio_id || ' → ' || u.coordenacao_territorial_icmbio_id, ', ') INTO v_faltando
    FROM jsonb_to_recordset(coalesce(p_unidades, '[]'::jsonb))
           AS u(icmbio_id text, coordenacao_territorial_icmbio_id text)
   WHERE u.coordenacao_territorial_icmbio_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.unidades c
                      WHERE c.icmbio_id = u.coordenacao_territorial_icmbio_id);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: Coordenação Territorial inexistente: %', v_faltando
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ...e tem de ser do tipo 'coordenacao-territorial'. Exemplo de erro: uma UC
  -- vinculada por engano à GR (tipo 'gerencia-regional') é recusada.
  SELECT string_agg(u.icmbio_id || ' → ' || c.icmbio_id || ' (' || c.tipo || ')', ', ') INTO v_faltando
    FROM jsonb_to_recordset(coalesce(p_unidades, '[]'::jsonb))
           AS u(icmbio_id text, coordenacao_territorial_icmbio_id text)
    JOIN public.unidades AS c ON c.icmbio_id = u.coordenacao_territorial_icmbio_id
   WHERE c.tipo <> 'coordenacao-territorial';
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: vínculo com unidade que não é Coordenação Territorial: %', v_faltando
      USING ERRCODE = 'check_violation';
  END IF;

  -- Liga cada unidade à sua mãe e à sua CT, trocando os icmbio_id pelos UUIDs.
  -- (Se o campo não vier, o LEFT JOIN dá null: a unidade fica sem mãe/sem CT,
  -- porque o importador sempre manda a linha completa.)
  UPDATE public.unidades AS f
     SET unidade_pai_id             = m.id,
         coordenacao_territorial_id = c.id
    FROM jsonb_to_recordset(coalesce(p_unidades, '[]'::jsonb))
           AS u(icmbio_id text, id_mae text, coordenacao_territorial_icmbio_id text)
    LEFT JOIN public.unidades AS m ON m.icmbio_id = u.id_mae
    LEFT JOIN public.unidades AS c ON c.icmbio_id = u.coordenacao_territorial_icmbio_id
   WHERE f.icmbio_id = u.icmbio_id;

  -- Passo 3: confere líder e supervisor dos processos...
  SELECT string_agg(p.proc_id, ', ') INTO v_faltando
    FROM jsonb_to_recordset(coalesce(p_processos, '[]'::jsonb)) AS p(
           proc_id text, lider_icmbio_id text, supervisor_icmbio_id text)
   WHERE (p.lider_icmbio_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.unidades l WHERE l.icmbio_id = p.lider_icmbio_id))
      OR (p.supervisor_icmbio_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.unidades s WHERE s.icmbio_id = p.supervisor_icmbio_id));
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: processo com líder ou supervisor inexistente: %', v_faltando
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ...e grava os processos pela chave natural proc_id.
  INSERT INTO public.processos_cadeia_valor AS dest
    (proc_id, nome, macro_id, macroprocesso, proc_tipo,
     unidade_lider_id, unidade_supervisora_id, ativo, atualizado_em)
  SELECT p.proc_id, p.nome, p.macro_id, p.macroprocesso, p.proc_tipo,
         (SELECT l.id FROM public.unidades l WHERE l.icmbio_id = p.lider_icmbio_id),
         (SELECT s.id FROM public.unidades s WHERE s.icmbio_id = p.supervisor_icmbio_id),
         coalesce(p.ativo, true), now()
    FROM jsonb_to_recordset(coalesce(p_processos, '[]'::jsonb)) AS p(
           proc_id text, nome text, macro_id text, macroprocesso text, proc_tipo text,
           lider_icmbio_id text, supervisor_icmbio_id text, ativo boolean)
  ON CONFLICT (proc_id) DO UPDATE SET
    nome                   = EXCLUDED.nome,
    macro_id               = EXCLUDED.macro_id,
    macroprocesso          = EXCLUDED.macroprocesso,
    proc_tipo              = EXCLUDED.proc_tipo,
    unidade_lider_id       = EXCLUDED.unidade_lider_id,
    unidade_supervisora_id = EXCLUDED.unidade_supervisora_id,
    ativo                  = EXCLUDED.ativo,
    atualizado_em          = EXCLUDED.atualizado_em;
  GET DIAGNOSTICS v_processos = ROW_COUNT;

  RETURN jsonb_build_object('unidades', v_unidades, 'processos', v_processos);
END;
$$;

-- Só o importador (service_role) pode chamar a função.
REVOKE EXECUTE ON FUNCTION public.sincronizar_estrutura(jsonb, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sincronizar_estrutura(jsonb, jsonb) TO service_role;
