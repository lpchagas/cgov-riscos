-- ============================================================================
-- ETAPA B1 / TAREFA 7 — Fluxo de 3 degraus, trava e reabertura
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- O risco passa por 3 "degraus" antes de entrar no Plano de Gestão de Riscos:
--   1º degrau — a unidade (1ª linha) preenche a ficha e ENVIA;
--   2º degrau — o TITULAR da chefia imediata VALIDA (ou devolve);
--   3º degrau — se o risco exige homologação, o TITULAR da GR, da Diretoria ou
--               da Presidência HOMOLOGA (ou devolve).
--
-- Mapa dos estados (`riscos.status_fluxo`, nomes mantidos para não quebrar a store):
--
--   preliminar_cgov ──assumir──► rascunho ──enviar──► em_validacao_cg
--                                   ▲                    │ validar
--                                   │                    ├──► aprovado  (não exige homologação,
--                                devolvido ◄──devolver───┤              ou "mesma chefia")
--                                   ▲                    ▼
--                                   └──devolver── em_homologacao_dir ──homologar──► aprovado
--
--   aprovado ──editar P, I, controles, tratamento, KRI, categoria ou objeto──► em_validacao_cg (REABERTURA)
--
-- SEGREGAÇÃO "SOBE UM NÍVEL" (decisão D1 da CGOV — ver
-- docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md): quem ENVIOU o risco
-- (ou o reabriu ao editar a ficha) nunca valida nem homologa o próprio risco.
-- Se quem enviou é o titular da chefia imediata, o 2º degrau SOBE para a
-- chefia da chefia; o mesmo vale para o homologador (3º degrau).
--   Ex.: gr@ (titular da GR5) envia um risco do SAT1-GR5 (Serviço da GR5):
--        chefia imediata = GR5 = ele mesmo → sobe para a Presidência;
--        homologador     = GR5 = ele mesmo → sobe para a Presidência.
--   Ex.: gestor.uc-sem-ct@ (titular da FLONA do Tapajós) envia um risco da
--        BAV Belterra: chefia imediata = FLONA = ele mesmo → sobe para a GR1.
-- Por isso a tabela abaixo fala em validador/homologador EFETIVO.
--
-- Tabela de transições (quem pode, de onde, para onde):
--   função                    | de                     | para                         | quem
--   --------------------------+------------------------+------------------------------+-------------------------------
--   assumir_risco_preliminar  | preliminar_cgov        | rascunho                     | quem grava no objeto (unidade)
--   enviar_para_validacao     | rascunho, devolvido    | em_validacao_cg              | quem grava no objeto (unidade)
--   validar_risco             | em_validacao_cg        | em_homologacao_dir/aprovado  | titular do validador efetivo
--   homologar_risco           | em_homologacao_dir     | aprovado                     | titular do homologador efetivo
--   devolver_risco            | em_validacao_cg        | devolvido                    | titular do validador efetivo
--                             | em_homologacao_dir     | devolvido                    | titular do homologador efetivo
--   (gatilho de reabertura)   | aprovado               | em_validacao_cg              | quem editou a ficha
--
-- EXCLUIR risco (decisão D2 da CGOV): só em rascunho, devolvido ou
-- preliminar_cgov. Risco aprovado NÃO se apaga (55000) — nem pela cascata de
-- apagar o objeto; para mudá-lo, edita-se a ficha (o que reabre o fluxo).
--
-- "Exige homologação" (spec 7.1): is_critico = true (residual fora do apetite
-- da DAR — o "risco crítico") OU status_critico = 'pendente_dar' (a DAR ainda
-- não definiu o apetite da categoria; por prudência, sobe ao 3º degrau).
--
-- CÓDIGOS DE ERRO (SQLSTATE) — o aplicativo (B2) pode decidir a mensagem por eles:
--   42501 (insufficient_privilege)            → a pessoa não tem permissão;
--   55000 (object_not_in_prerequisite_state)  → o ESTADO do risco não permite
--                                               a ação ("estado não permite"),
--                                               ou a ficha está TRAVADA;
--   22023 (invalid_parameter_value)           → devolver sem motivo;
--   P0002 (no_data_found)                     → risco inexistente.
-- Todas as mensagens começam com "RADAR:".
--
-- SEGURANÇA:
--   - As 5 funções chamadas pelo app (RPC) são SECURITY DEFINER: rodam como o
--     dono (postgres) e, por isso, IGNORAM a RLS. A checagem de quem pode agir
--     está escrita DENTRO de cada uma (e_titular_de, pode_escrever_objeto...).
--   - SET search_path = '' e nomes sempre com `public.`.
--   - EXECUTE revogado de public/anon e concedido só a `authenticated`.
--   - As funções internas (mudar estado, gravar histórico, aplicar trava) NÃO
--     são executáveis por ninguém logado: se fossem, alguém chamaria "mudar
--     estado" direto e pularia a checagem de permissão.
--
-- O SINAL `radar.fluxo` (Tarefa 6): o gatilho trg_riscos_status_fluxo_so_pelo_fluxo
-- recusa mudar status_fluxo sem o sinal. Aqui o sinal é LIGADO só em volta do
-- UPDATE de estado e DESLIGADO logo depois (fn_fluxo_mudar_estado), para não
-- "vazar" para o resto da transação.
--
-- NÃO mexe no cálculo do risco (Quadros 6, 7 e 8 / trg_calcular_risco_radar)
-- nem reescreve migrações anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Funções internas (não chamadas pelo app)
-- ----------------------------------------------------------------------------

-- 1.0 Duas colunas novas em historico_fluxo (decisão D1):
--   usuario_id → QUEM agiu (auth.uid()). É por ela que o fluxo sabe quem
--                ENVIOU o risco e, portanto, quem não pode validá-lo.
--                Nula quando quem agiu foi o administrador do banco.
--   sequencia  → número crescente, dado pelo banco, que diz a ORDEM das
--                linhas. Não usamos `criado_em` para isso porque, dentro de
--                uma mesma transação, now() devolve sempre o mesmo instante
--                (duas linhas "empatariam").
-- Ninguém grava nelas à mão: historico_fluxo não tem política de escrita
-- (migração 20261115003, item 7.5); só as funções do fluxo gravam.
ALTER TABLE public.historico_fluxo
  ADD COLUMN IF NOT EXISTS usuario_id uuid,
  ADD COLUMN IF NOT EXISTS sequencia  bigint GENERATED ALWAYS AS IDENTITY;

CREATE INDEX IF NOT EXISTS idx_historico_fluxo_risco_sequencia
  ON public.historico_fluxo (risco_id, sequencia);

-- 1.1 fn_fluxo_registrar_historico: grava uma linha em historico_fluxo.
-- Quem agiu vem de meu_perfil() (nome e papel) e de auth.uid() (usuario_id).
-- Se não houver perfil (administrador do banco, importador), grava
-- "Administração do banco de dados" / "sistema" e usuario_id nulo.
-- Valores de `etapa`/`acao` seguem os da store (src/types/radar.types.ts):
--   assuncao_preliminar / assumido               (novo)
--   submissao_1a_linha  / submetido
--   validacao_cg        / validado | validado_e_homologado (novos)
--   homologacao_diretoria / homologado            (novo)
--   devolucao_ajuste    / devolvido_ajuste
--   reabertura_nota     / reaberto_mudanca_nota
CREATE OR REPLACE FUNCTION public.fn_fluxo_registrar_historico(
  p_risco uuid, p_etapa text, p_acao text, p_despacho text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil public.perfis_usuarios;
BEGIN
  v_perfil := public.meu_perfil();
  INSERT INTO public.historico_fluxo
    (risco_id, etapa, acao, usuario_nome, usuario_papel, despacho_texto, usuario_id)
  VALUES (p_risco, p_etapa, p_acao,
          coalesce(v_perfil.nome_completo, 'Administração do banco de dados'),
          coalesce(v_perfil.papel_governanca, 'sistema'),
          p_despacho,
          auth.uid());
END;
$$;

-- 1.2 fn_fluxo_mudar_estado: o ÚNICO lugar que muda status_fluxo.
-- Liga o sinal, faz o UPDATE e devolve o sinal ao valor anterior (normalmente
-- vazio = desligado). Exemplo do efeito:
--   select set_config('radar.fluxo','on',true);  -- liga
--   update public.riscos set status_fluxo = 'aprovado' where id = ...;
--   select set_config('radar.fluxo','',true);    -- desliga
-- Se o UPDATE der erro, a transação (ou o SAVEPOINT) é desfeita e o sinal
-- volta junto — set_config "local" acompanha o rollback.
CREATE OR REPLACE FUNCTION public.fn_fluxo_mudar_estado(p_risco uuid, p_novo_estado text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sinal_anterior text := coalesce(current_setting('radar.fluxo', true), '');
  v_risco          public.riscos;
BEGIN
  PERFORM set_config('radar.fluxo', 'on', true);
  -- O UPDATE dispara o gatilho de cálculo da migração 20261109001
  -- (trigger_calcular_risco_radar), escrito SEM `public.` nos nomes
  -- (calcular_nivel_inerente_q7, categorias_risco...). Com o search_path vazio
  -- desta função, ele não acharia esses nomes. Por isso, SÓ durante o UPDATE,
  -- o caminho passa a ser "public, pg_temp" (pg_temp por ÚLTIMO: uma tabela
  -- temporária de mesmo nome não "engana" o cálculo). O SET search_path = ''
  -- da função restaura o caminho vazio ao sair.
  PERFORM set_config('search_path', 'public, pg_temp', true);
  UPDATE public.riscos AS r
     SET status_fluxo = p_novo_estado
   WHERE r.id = p_risco
  RETURNING r.* INTO v_risco;
  PERFORM set_config('search_path', '', true);
  PERFORM set_config('radar.fluxo', v_sinal_anterior, true);
  RETURN v_risco;
END;
$$;

-- 1.3 Reaberto "neste comando": evita que um único comando que inclui VÁRIAS
-- linhas (ex.: INSERT de 2 controles de uma vez num risco aprovado) seja
-- recusado na 2ª linha. A 1ª linha reabre o risco (→ em_validacao_cg) e a 2ª
-- encontraria o risco "travado". Guardamos, num sinal local, o carimbo de hora
-- do comando atual (statement_timestamp) e os ids reabertos por ele:
--     radar.reabertos = '2026-11-15 10:00:00.123+00|<id1>,<id2>'
-- No PRÓXIMO comando o carimbo muda e a ficha volta a ficar travada.
CREATE OR REPLACE FUNCTION public.fn_fluxo_reaberto_neste_comando(p_risco uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT split_part(coalesce(current_setting('radar.reabertos', true), ''), '|', 1) = statement_timestamp()::text
     AND p_risco::text = ANY (string_to_array(
           split_part(coalesce(current_setting('radar.reabertos', true), ''), '|', 2), ','));
$$;

CREATE OR REPLACE FUNCTION public.fn_fluxo_marcar_reaberto(p_risco uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_atual   text := coalesce(current_setting('radar.reabertos', true), '');
  v_carimbo text := statement_timestamp()::text;
BEGIN
  IF split_part(v_atual, '|', 1) = v_carimbo THEN
    PERFORM set_config('radar.reabertos', v_atual || ',' || p_risco::text, true);
  ELSE
    PERFORM set_config('radar.reabertos', v_carimbo || '|' || p_risco::text, true);
  END IF;
END;
$$;

-- 1.3b Validador e homologador EFETIVOS (decisão D1 — "sobe um nível")
--
-- fn_fluxo_titular_da_unidade(pessoa, unidade): a pessoa é titular (chefe ou
-- substituto em exercício) da unidade? Diferente de e_titular_de(), que olha
-- quem está LOGADO, esta olha uma pessoa qualquer (quem ENVIOU o risco).
-- Não exige perfil ativo: para a segregação, basta ter sido o titular.
CREATE OR REPLACE FUNCTION public.fn_fluxo_titular_da_unidade(p_pessoa uuid, p_unidade uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_pessoa IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.perfis_usuarios AS p
     WHERE p.id = p_pessoa
       AND p.titular_chefia
       AND p.unidade_id = p_unidade);
$$;

-- fn_fluxo_quem_enviou(risco): quem pôs o risco em validação pela última
-- vez — o autor da linha mais recente do histórico que seja um ENVIO
-- ("submetido") ou uma REABERTURA ("reaberto_mudanca_nota": quem editou a
-- ficha aprovada também não valida a própria mudança).
-- Nulo quando não há essa linha (ex.: riscos da semente de demonstração, que
-- já nascem em validação) ou quando foi o administrador do banco.
CREATE OR REPLACE FUNCTION public.fn_fluxo_quem_enviou(p_risco uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT h.usuario_id
    FROM public.historico_fluxo AS h
   WHERE h.risco_id = p_risco
     AND h.acao IN ('submetido', 'reaberto_mudanca_nota')
   ORDER BY h.sequencia DESC
   LIMIT 1;
$$;

-- fn_fluxo_validador_efetivo(unidade, quem_enviou): parte de
-- chefia_imediata(unidade) e, enquanto quem enviou for o titular da unidade
-- encontrada, SOBE (chefia_imediata da chefia...). Nulo = não há ninguém
-- acima (topo da árvore).
--   Ex.: (SAT1-GR5, gr@)            → GR5 é do gr@ → sobe → Presidência;
--        (BAV Belterra, gestor.uc-sem-ct@) → FLONA é dele → sobe → GR1;
--        (FLONA de Caçador, gestor.uc@)    → CT Curitiba (não sobe).
-- Proteção contra ciclo na árvore: no máximo 50 subidas (a árvore real tem
-- menos de 10 níveis); passou disso, devolve nulo (ninguém valida → recusa).
CREATE OR REPLACE FUNCTION public.fn_fluxo_validador_efetivo(p_unidade uuid, p_quem_enviou uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unidade uuid := public.chefia_imediata(p_unidade);
  v_subidas int  := 0;
BEGIN
  WHILE v_unidade IS NOT NULL AND public.fn_fluxo_titular_da_unidade(p_quem_enviou, v_unidade) LOOP
    v_unidade := public.chefia_imediata(v_unidade);
    v_subidas := v_subidas + 1;
    IF v_subidas > 50 THEN
      RETURN NULL;
    END IF;
  END LOOP;
  RETURN v_unidade;
END;
$$;

-- fn_fluxo_homologador_efetivo(unidade, quem_enviou): o mesmo raciocínio,
-- partindo de homologador_de(unidade) e subindo com homologador_de.
--   Ex.: (SAT1-GR5, gr@) → GR5 é do gr@ → sobe → homologador_de(GR5) = Presidência.
CREATE OR REPLACE FUNCTION public.fn_fluxo_homologador_efetivo(p_unidade uuid, p_quem_enviou uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unidade uuid := public.homologador_de(p_unidade);
  v_subidas int  := 0;
BEGIN
  WHILE v_unidade IS NOT NULL AND public.fn_fluxo_titular_da_unidade(p_quem_enviou, v_unidade) LOOP
    v_unidade := public.homologador_de(v_unidade);
    v_subidas := v_subidas + 1;
    IF v_subidas > 50 THEN
      RETURN NULL;
    END IF;
  END LOOP;
  RETURN v_unidade;
END;
$$;

-- fn_fluxo_exigir_validador_na_reabertura(risco, unidade): a reabertura põe o
-- risco em validação tendo como "quem enviou" a pessoa que editou. Se acima
-- dela não houver ninguém para validar (ex.: o presidente edita um risco
-- aprovado de um Setor interno da Presidência), o risco ficaria preso em
-- validação. Nesse caso a edição é RECUSADA (55000) com mensagem clara.
CREATE OR REPLACE FUNCTION public.fn_fluxo_exigir_validador_na_reabertura(p_codigo text, p_unidade uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.fn_fluxo_validador_efetivo(p_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: a alteração reabriria o risco % para validação, mas não há chefia acima de quem alterou para validá-lo (quem altera não valida a própria mudança). Procure a CGOV.',
      p_codigo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
END;
$$;

-- 1.4 fn_fluxo_aplicar_trava: chamada pelos gatilhos das tabelas FILHAS
-- (controles, tratamento, KRIs) antes de gravar.
--   - risco em validação/homologação → RECUSA (ficha travada);
--   - risco aprovado                 → REABRE (→ em_validacao_cg) e registra;
--   - outros estados                 → libera.
-- `p_origem` explica o que mudou, para o histórico.
-- Risco inexistente (ex.: o próprio risco está sendo excluído e os filhos
-- saem em cascata) → libera, sem reabrir nada.
CREATE OR REPLACE FUNCTION public.fn_fluxo_aplicar_trava(p_risco uuid, p_origem text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
BEGIN
  -- FOR UPDATE: segura a linha do risco até o fim da transação, para que uma
  -- validação simultânea não "passe por baixo" da edição.
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = p_risco FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_risco.status_fluxo IN ('em_validacao_cg', 'em_homologacao_dir') THEN
    IF public.fn_fluxo_reaberto_neste_comando(p_risco) THEN
      RETURN;                      -- reaberto por este mesmo comando (várias linhas)
    END IF;
    RAISE EXCEPTION 'RADAR: a ficha do risco % está travada (estado "%"): não é permitida a % enquanto o risco está em validação ou homologação. Peça à chefia que devolva o risco para ajuste.',
      v_risco.codigo_radar, v_risco.status_fluxo, p_origem
      USING ERRCODE = 'object_not_in_prerequisite_state';
  ELSIF v_risco.status_fluxo = 'aprovado' THEN
    SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
    PERFORM public.fn_fluxo_exigir_validador_na_reabertura(v_risco.codigo_radar, v_unidade);
    PERFORM public.fn_fluxo_mudar_estado(p_risco, 'em_validacao_cg');
    PERFORM public.fn_fluxo_registrar_historico(p_risco, 'reabertura_nota', 'reaberto_mudanca_nota',
      format('Risco aprovado reaberto para validação da chefia imediata (alteração: %s).', p_origem));
    PERFORM public.fn_fluxo_marcar_reaberto(p_risco);
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Gatilho de trava e reabertura na tabela `riscos`
-- ----------------------------------------------------------------------------
-- BEFORE UPDATE OR DELETE. Regras:
--   - DELETE (decisão D2 da CGOV): só se apaga risco em rascunho, devolvido
--     ou preliminar_cgov. Risco aprovado faz parte do Plano de Gestão de
--     Riscos: recusa com 55000, orientando a EDITAR (o que reabre o fluxo).
--     Esta regra vem ANTES do sinal `radar.fluxo` (nenhuma função do fluxo
--     apaga risco) e vale também na CASCATA: apagar o objeto apagaria os
--     riscos dele, e o gatilho de cada risco roda nessa hora — então apagar o
--     objeto de um risco aprovado também é recusado.
--   - sinal `radar.fluxo` ligado → é uma função do fluxo mudando o estado:
--     libera (nada a travar);
--   - risco em em_validacao_cg / em_homologacao_dir → recusa UPDATE e DELETE;
--   - risco aprovado e mudou algo que AVALIA o risco — probabilidade,
--     impacto, possui_evidencia_controle, nivel_eficacia_controle,
--     fator_controle, categoria_id (muda o apetite da DAR que vale), objeto_id
--     (muda a unidade e, com ela, quem valida) ou, depois do cálculo,
--     is_critico/status_critico → o próprio UPDATE leva o risco para
--     em_validacao_cg (NEW.status_fluxo) e registra no histórico.
--     Ex.: gestor muda P de 4 para 3 num risco aprovado → volta à validação.
--     Ex.: gestor troca a categoria de Estratégico (apetite moderado) para
--          Conformidade/Legal (apetite baixo): o risco Médio vira crítico →
--          volta à validação (e depois sobe à homologação).
--     Mudar só um texto (ex.: `causas`) não reabre.
--
-- ORDEM DOS GATILHOS: no PostgreSQL, gatilhos BEFORE do mesmo evento rodam em
-- ordem ALFABÉTICA do nome:
--   1º trg_calcular_risco_radar               (calcula inerente/residual)
--   2º trg_riscos_status_fluxo_so_pelo_fluxo  (Tarefa 6: barra troca direta de estado)
--   3º trg_riscos_trava_reabertura            (este)
-- Como este roda DEPOIS do da Tarefa 6, a troca de estado que ele faz em NEW
-- (aprovado → em_validacao_cg) não é barrada por aquele. Não renomeie sem
-- conferir essa ordem. E, como roda depois do cálculo, compara os valores já
-- recalculados (inclusive a trava de evidência do Quadro 6).
CREATE OR REPLACE FUNCTION public.fn_trava_reabertura_risco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mudou   text[] := ARRAY[]::text[];
  v_unidade uuid;
BEGIN
  -- D2: só se apaga risco em rascunho, devolvido ou preliminar_cgov.
  -- (Em validação/homologação continua valendo a mensagem de "travada", abaixo.)
  IF TG_OP = 'DELETE' AND OLD.status_fluxo NOT IN ('rascunho', 'devolvido', 'preliminar_cgov',
                                                   'em_validacao_cg', 'em_homologacao_dir') THEN
    RAISE EXCEPTION 'RADAR: o risco % está % e faz parte do Plano de Gestão de Riscos: não pode ser excluído (só se exclui risco em rascunho, devolvido ou preliminar da CGOV). Para mudá-lo, edite a ficha — a edição reabre o fluxo de validação. Isso vale também para excluir o objeto do risco.',
      OLD.codigo_radar, OLD.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF coalesce(current_setting('radar.fluxo', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF OLD.status_fluxo IN ('em_validacao_cg', 'em_homologacao_dir') THEN
    IF TG_OP = 'UPDATE' AND public.fn_fluxo_reaberto_neste_comando(OLD.id) THEN
      RETURN NEW;                  -- reaberto por este mesmo comando
    END IF;
    RAISE EXCEPTION 'RADAR: a ficha do risco % está travada (estado "%"): não é possível % o risco enquanto ele está em validação ou homologação. Peça à chefia que devolva o risco para ajuste.',
      OLD.codigo_radar, OLD.status_fluxo, CASE TG_OP WHEN 'DELETE' THEN 'excluir' ELSE 'alterar' END
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF OLD.status_fluxo = 'aprovado' THEN
    IF NEW.probabilidade IS DISTINCT FROM OLD.probabilidade THEN
      v_mudou := v_mudou || format('probabilidade %s → %s', OLD.probabilidade, NEW.probabilidade);
    END IF;
    IF NEW.impacto IS DISTINCT FROM OLD.impacto THEN
      v_mudou := v_mudou || format('impacto %s → %s', OLD.impacto, NEW.impacto);
    END IF;
    IF NEW.possui_evidencia_controle IS DISTINCT FROM OLD.possui_evidencia_controle THEN
      v_mudou := v_mudou || format('evidência de controle %s → %s', OLD.possui_evidencia_controle, NEW.possui_evidencia_controle);
    END IF;
    IF NEW.nivel_eficacia_controle IS DISTINCT FROM OLD.nivel_eficacia_controle THEN
      v_mudou := v_mudou || format('eficácia do controle %s → %s', OLD.nivel_eficacia_controle, NEW.nivel_eficacia_controle);
    END IF;
    IF NEW.fator_controle IS DISTINCT FROM OLD.fator_controle THEN
      v_mudou := v_mudou || format('fator de controle %s → %s', OLD.fator_controle, NEW.fator_controle);
    END IF;
    IF NEW.categoria_id IS DISTINCT FROM OLD.categoria_id THEN
      v_mudou := v_mudou || format('categoria %s → %s', OLD.categoria_id, NEW.categoria_id);
    END IF;
    IF NEW.objeto_id IS DISTINCT FROM OLD.objeto_id THEN
      v_mudou := v_mudou || 'objeto de gestão de riscos (unidade)'::text;
    END IF;
    -- Já recalculados pelo gatilho de cálculo (que roda antes deste). Pegam,
    -- por exemplo, a DAR que mudou desde a aprovação.
    IF NEW.is_critico IS DISTINCT FROM OLD.is_critico THEN
      v_mudou := v_mudou || format('risco crítico %s → %s', OLD.is_critico, NEW.is_critico);
    END IF;
    IF NEW.status_critico IS DISTINCT FROM OLD.status_critico THEN
      v_mudou := v_mudou || format('situação perante a DAR %s → %s', OLD.status_critico, NEW.status_critico);
    END IF;

    IF cardinality(v_mudou) > 0 THEN
      -- D1: quem editou passa a ser "quem enviou"; precisa haver alguém acima
      -- dele para validar (senão o risco ficaria preso em validação).
      SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = NEW.objeto_id;
      PERFORM public.fn_fluxo_exigir_validador_na_reabertura(OLD.codigo_radar, v_unidade);
      NEW.status_fluxo := 'em_validacao_cg';
      PERFORM public.fn_fluxo_registrar_historico(OLD.id, 'reabertura_nota', 'reaberto_mudanca_nota',
        format('Risco aprovado reaberto para validação da chefia imediata (alteração: %s; residual %s → %s).',
               array_to_string(v_mudou, '; '), OLD.nivel_residual, NEW.nivel_residual));
      PERFORM public.fn_fluxo_marcar_reaberto(OLD.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_riscos_trava_reabertura
BEFORE UPDATE OR DELETE ON public.riscos
FOR EACH ROW
EXECUTE FUNCTION public.fn_trava_reabertura_risco();

-- ----------------------------------------------------------------------------
-- 3. Gatilho de trava e reabertura nas tabelas filhas da ficha
-- ----------------------------------------------------------------------------
-- controles_existentes, respostas_tratamento e indicadores_kri (definição do
-- KRI). BEFORE INSERT, UPDATE ou DELETE — incluir um controle também é
-- "mexer na ficha".
--   - respostas_tratamento: mudar SÓ o status_execucao é livre em qualquer
--     estado (a execução do plano 5W2H não é reavaliação do risco);
--   - medicoes_kri NÃO tem este gatilho: medir o KRI é livre em qualquer estado.
-- Ex.: cg.cgpro muda a meta do KRI de um risco aprovado → o risco volta a
--      em_validacao_cg; registra uma medição → nada muda no fluxo.
CREATE OR REPLACE FUNCTION public.fn_trava_reabertura_ficha()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_origem text;
BEGIN
  IF coalesce(current_setting('radar.fluxo', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- UPDATE que não muda nada: nada a travar nem reabrir.
    IF to_jsonb(NEW) = to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;
    -- Só o status de execução da ação de tratamento mudou: livre.
    IF TG_TABLE_NAME = 'respostas_tratamento'
       AND (to_jsonb(NEW) - 'status_execucao') = (to_jsonb(OLD) - 'status_execucao') THEN
      RETURN NEW;
    END IF;
  END IF;

  v_origem := CASE TG_OP WHEN 'INSERT' THEN 'inclusão' WHEN 'UPDATE' THEN 'alteração' ELSE 'exclusão' END
              || ' em '
              || CASE TG_TABLE_NAME
                   WHEN 'controles_existentes' THEN 'controles existentes'
                   WHEN 'respostas_tratamento' THEN 'tratamento (5W2H)'
                   WHEN 'indicadores_kri'      THEN 'definição do KRI'
                   ELSE TG_TABLE_NAME
                 END;

  -- O risco "de antes" (UPDATE/DELETE) e o "de depois" (INSERT, ou UPDATE que
  -- troca o risco_id) passam pela trava.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.fn_fluxo_aplicar_trava(OLD.risco_id, v_origem);
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.risco_id IS DISTINCT FROM OLD.risco_id) THEN
    PERFORM public.fn_fluxo_aplicar_trava(NEW.risco_id, v_origem);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_controles_trava_reabertura
BEFORE INSERT OR UPDATE OR DELETE ON public.controles_existentes
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_reabertura_ficha();

CREATE TRIGGER trg_respostas_trava_reabertura
BEFORE INSERT OR UPDATE OR DELETE ON public.respostas_tratamento
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_reabertura_ficha();

CREATE TRIGGER trg_kris_trava_reabertura
BEFORE INSERT OR UPDATE OR DELETE ON public.indicadores_kri
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_reabertura_ficha();

-- ----------------------------------------------------------------------------
-- 4. Funções do fluxo chamadas pelo aplicativo (RPC)
-- ----------------------------------------------------------------------------
-- Roteiro comum de cada função:
--   a) trava a linha do risco com SELECT ... FOR UPDATE (ver "dois titulares");
--   b) confere a PERMISSÃO de quem chamou (erro 42501);
--   c) confere o ESTADO atual (erro 55000, "estado não permite");
--   d) muda o estado (fn_fluxo_mudar_estado) e grava o histórico;
--   e) devolve o risco atualizado.
--
-- DOIS TITULARES (ponto de atenção 4): titular e substituto em exercício da
-- mesma unidade podem clicar "validar" ao mesmo tempo. O FOR UPDATE faz o 2º
-- ESPERAR o 1º terminar; quando o 2º relê a linha, o risco já saiu de
-- em_validacao_cg e ele recebe "estado não permite". Assim o risco é validado
-- uma vez só, e o histórico tem uma linha só.

-- 4.1 assumir_risco_preliminar: preliminar_cgov → rascunho
-- Quem: o titular ou um gestor da unidade do risco (quem grava no objeto).
-- A CGOV, que criou o preliminar, não assume pela unidade (Metodologia 4.6:
-- o mérito é da 1ª linha). Ex.: cgov@ cria na FLONA de Caçador; gestor.uc@ assume.
CREATE OR REPLACE FUNCTION public.assumir_risco_preliminar(risco uuid)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco public.riscos;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = assumir_risco_preliminar.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', assumir_risco_preliminar.risco USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.pode_escrever_objeto(v_risco.objeto_id) THEN
    RAISE EXCEPTION 'RADAR: só o titular ou um gestor da unidade do risco % pode assumi-lo.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo <> 'preliminar_cgov' THEN
    RAISE EXCEPTION 'RADAR: estado não permite assumir o risco % (está em "%"; só se assume risco preliminar da CGOV).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'rascunho');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'assuncao_preliminar', 'assumido',
    'Risco preliminar da CGOV assumido pela unidade como rascunho próprio.');
  RETURN v_risco;
END;
$$;

-- 4.2 enviar_para_validacao: rascunho ou devolvido → em_validacao_cg
-- Quem: quem grava no objeto (a própria unidade).
-- Recusa também quando NÃO HÁ QUEM VALIDE (55000):
--   - a unidade não tem chefia imediata (só a Presidência, topo da árvore —
--     ver docs/02-arquitetura-cgti/decisoes-tecnicas-b1.md, R18); ou
--   - quem envia é o titular de todas as chefias acima até o topo (D1), ex.:
--     o presidente enviando um risco do COMET (Setor interno da Presidência).
-- Sem isso, o risco ficaria travado em validação sem ninguém para validá-lo.
CREATE OR REPLACE FUNCTION public.enviar_para_validacao(risco uuid)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = enviar_para_validacao.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', enviar_para_validacao.risco USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.pode_escrever_objeto(v_risco.objeto_id) THEN
    RAISE EXCEPTION 'RADAR: só a unidade dona do risco % pode enviá-lo para validação.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo NOT IN ('rascunho', 'devolvido') THEN
    RAISE EXCEPTION 'RADAR: estado não permite enviar o risco % para validação (está em "%"; só se envia rascunho ou devolvido).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  IF public.chefia_imediata(v_unidade) IS NULL THEN
    RAISE EXCEPTION 'RADAR: a unidade do risco % não tem chefia imediata acima dela na árvore; não há quem valide. Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  -- D1: quem envia não valida o próprio risco. Se, subindo a partir da chefia
  -- imediata, só houver unidades de que quem envia é o titular, não sobra
  -- ninguém para validar.
  IF public.fn_fluxo_validador_efetivo(v_unidade, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'RADAR: não há quem valide o risco %: quem envia é o titular da chefia imediata e não existe nível acima na árvore (quem envia não valida o próprio risco). Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'em_validacao_cg');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'submissao_1a_linha', 'submetido',
    'Ficha enviada pela 1ª linha para validação da chefia imediata.');
  RETURN v_risco;
END;
$$;

-- 4.3 validar_risco: em_validacao_cg → em_homologacao_dir ou aprovado
-- Quem: SÓ o titular (chefe ou substituto em exercício) do VALIDADOR EFETIVO:
-- a chefia_imediata, ou o nível acima se quem enviou é o titular dela (D1).
-- Para onde vai:
--   - não exige homologação (residual dentro do apetite da DAR) → aprovado;
--   - exige, e o validador efetivo é também o homologador efetivo (ex.: UC
--     sem CT, em que a GR valida e homologa; Coordenação-Geral, cujo Diretor
--     valida e homologa) → aprovado, com "validado e homologado pela mesma
--     chefia". Como os dois são EFETIVOS, quem enviou nunca está entre eles;
--   - exige, e o homologador efetivo é outro → em_homologacao_dir.
-- Ex.: FLONA de Caçador (crítico): ct@ valida → em_homologacao_dir;
--      FLONA do Tapajós (crítico): gr1@ valida → aprovado (mesma chefia);
--      SAT1-GR5 enviado por gr@ (crítico): presidente@ valida → aprovado.
CREATE OR REPLACE FUNCTION public.validar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco      public.riscos;
  v_unidade    uuid;
  v_enviou     uuid;    -- quem enviou (ou reabriu) o risco — D1
  v_chefia     uuid;    -- validador EFETIVO
  v_homologa   uuid;    -- homologador EFETIVO
  v_exige      boolean;
  v_parecer    text := nullif(btrim(coalesce(validar_risco.parecer, '')), '');
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = validar_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', validar_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  v_enviou   := public.fn_fluxo_quem_enviou(v_risco.id);
  v_chefia   := public.fn_fluxo_validador_efetivo(v_unidade, v_enviou);
  v_homologa := public.fn_fluxo_homologador_efetivo(v_unidade, v_enviou);

  IF v_chefia IS NULL THEN
    RAISE EXCEPTION 'RADAR: não há quem valide o risco %: não existe chefia acima de quem o enviou (quem envia não valida o próprio risco). Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NOT public.e_titular_de(v_chefia) THEN
    RAISE EXCEPTION 'RADAR: só o titular da chefia que valida o risco % pode validá-lo (quem enviou o risco não o valida).', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo <> 'em_validacao_cg' THEN
    RAISE EXCEPTION 'RADAR: estado não permite validar o risco % (está em "%"; só se valida risco em validação). Ele pode já ter sido validado por outro titular.',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- CRITICIDADE ATUAL (correção da rodada 1 da revisão): enquanto o risco
  -- esperava a validação (ficha travada), a CGOV pode ter mudado o apetite da
  -- categoria na DAR. O is_critico gravado seria VELHO. Ex.: risco Médio
  -- enviado com apetite 'moderado' (não crítico); a DAR passa a 'baixo' →
  -- agora ele é crítico e precisa do 3º degrau.
  -- Para não duplicar a regra do cálculo, pedimos ao PRÓPRIO gatilho de
  -- cálculo (trigger_calcular_risco_radar) que recalcule: um UPDATE que
  -- "troca" o estado pelo mesmo estado, pelo caminho seguro de
  -- fn_fluxo_mudar_estado. A linha devolvida já vem recalculada.
  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, v_risco.status_fluxo);

  v_exige := v_risco.is_critico OR v_risco.status_critico = 'pendente_dar';

  IF NOT v_exige THEN
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado',
      concat_ws(' ', 'Validado pela chefia imediata. Risco dentro do apetite da DAR: não exige homologação.', v_parecer));

  ELSIF v_homologa IS NULL THEN
    -- Só aconteceria com uma unidade fora da árvore da Presidência (erro de
    -- cadastro): não há quem homologue. Recusa em vez de aprovar sem o 3º degrau.
    RAISE EXCEPTION 'RADAR: o risco % exige homologação, mas a unidade não tem Gerência Regional, Diretoria ou Presidência acima dela. Procure a CGOV.',
      v_risco.codigo_radar
      USING ERRCODE = 'object_not_in_prerequisite_state';

  ELSIF v_homologa = v_chefia THEN
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado_e_homologado',
      concat_ws(' ', 'Validado e homologado pela mesma chefia.', v_parecer));

  ELSE
    v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'em_homologacao_dir');
    PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'validacao_cg', 'validado',
      concat_ws(' ', 'Validado pela chefia imediata e encaminhado para homologação.', v_parecer));
  END IF;

  RETURN v_risco;
END;
$$;

-- 4.4 homologar_risco: em_homologacao_dir → aprovado
-- Quem: SÓ o titular do HOMOLOGADOR EFETIVO: homologador_de (GR, Diretoria ou
-- Presidência), ou o nível acima se quem enviou é o titular dele (D1).
-- Ex.: risco crítico da CGOV, validado por cgge@ → presidente@ homologa.
CREATE OR REPLACE FUNCTION public.homologar_risco(risco uuid, parecer text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco    public.riscos;
  v_unidade  uuid;
  v_homologa uuid;
BEGIN
  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = homologar_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', homologar_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;
  v_homologa := public.fn_fluxo_homologador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));

  IF v_homologa IS NULL OR NOT public.e_titular_de(v_homologa) THEN
    RAISE EXCEPTION 'RADAR: só o titular da Gerência Regional, da Diretoria ou da Presidência responsável pode homologar o risco %.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_risco.status_fluxo <> 'em_homologacao_dir' THEN
    RAISE EXCEPTION 'RADAR: estado não permite homologar o risco % (está em "%"; só se homologa risco em homologação).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'aprovado');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'homologacao_diretoria', 'homologado',
    concat_ws(' ', 'Homologado para integrar o Plano de Gestão de Riscos.',
              nullif(btrim(coalesce(homologar_risco.parecer, '')), '')));
  RETURN v_risco;
END;
$$;

-- 4.5 devolver_risco: em_validacao_cg ou em_homologacao_dir → devolvido
-- Quem: quem pode agir NAQUELE estado — o titular do validador efetivo (em
-- validação) ou o titular do homologador efetivo (em homologação). São os
-- mesmos de validar_risco/homologar_risco (D1): quem enviou não devolve.
-- O motivo é OBRIGATÓRIO: nulo ou só espaços → erro 22023.
-- Ex.: gr@ devolve com "Justificar melhor o impacto." → devolvido; a unidade
--      corrige (devolvido não é travado) e reenvia.
CREATE OR REPLACE FUNCTION public.devolver_risco(risco uuid, motivo text)
RETURNS public.riscos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_risco   public.riscos;
  v_unidade uuid;
  v_quem    uuid;    -- unidade cujo titular pode devolver no estado atual
  v_motivo  text := nullif(btrim(coalesce(devolver_risco.motivo, '')), '');
BEGIN
  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'RADAR: informe o motivo da devolução (é obrigatório).'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT r.* INTO v_risco FROM public.riscos AS r WHERE r.id = devolver_risco.risco FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RADAR: risco % não encontrado.', devolver_risco.risco USING ERRCODE = 'no_data_found';
  END IF;

  SELECT o.unidade_id INTO v_unidade FROM public.objetos_contexto AS o WHERE o.id = v_risco.objeto_id;

  IF v_risco.status_fluxo = 'em_validacao_cg' THEN
    v_quem := public.fn_fluxo_validador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));
  ELSIF v_risco.status_fluxo = 'em_homologacao_dir' THEN
    v_quem := public.fn_fluxo_homologador_efetivo(v_unidade, public.fn_fluxo_quem_enviou(v_risco.id));
  ELSE
    RAISE EXCEPTION 'RADAR: estado não permite devolver o risco % (está em "%"; só se devolve risco em validação ou homologação).',
      v_risco.codigo_radar, v_risco.status_fluxo
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF v_quem IS NULL OR NOT public.e_titular_de(v_quem) THEN
    RAISE EXCEPTION 'RADAR: só o titular que valida ou homologa o risco % neste estado pode devolvê-lo.', v_risco.codigo_radar
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_risco := public.fn_fluxo_mudar_estado(v_risco.id, 'devolvido');
  PERFORM public.fn_fluxo_registrar_historico(v_risco.id, 'devolucao_ajuste', 'devolvido_ajuste', v_motivo);
  RETURN v_risco;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Quem pode executar
-- ----------------------------------------------------------------------------
-- RPCs: só quem fez login (authenticated). Cada uma confere a permissão dentro.
REVOKE EXECUTE ON FUNCTION public.assumir_risco_preliminar(uuid)  FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.enviar_para_validacao(uuid)     FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.validar_risco(uuid, text)       FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.homologar_risco(uuid, text)     FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.devolver_risco(uuid, text)      FROM public, anon;

GRANT EXECUTE ON FUNCTION public.assumir_risco_preliminar(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_para_validacao(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_risco(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.homologar_risco(uuid, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.devolver_risco(uuid, text)       TO authenticated;

-- Funções internas e de gatilho: NINGUÉM de fora. O Supabase concede EXECUTE
-- a anon e authenticated por padrão em funções novas do esquema public; por
-- isso revogamos também de authenticated. (As RPCs e os gatilhos acima rodam
-- como o dono, postgres, e continuam conseguindo chamá-las.)
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_registrar_historico(uuid, text, text, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_mudar_estado(uuid, text)                   FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_reaberto_neste_comando(uuid)               FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_marcar_reaberto(uuid)                      FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_aplicar_trava(uuid, text)                  FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_reabertura_risco()                         FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_reabertura_ficha()                         FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_titular_da_unidade(uuid, uuid)              FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_quem_enviou(uuid)                           FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_validador_efetivo(uuid, uuid)               FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_homologador_efetivo(uuid, uuid)             FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fluxo_exigir_validador_na_reabertura(text, uuid)  FROM public, anon, authenticated;
