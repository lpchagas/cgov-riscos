-- ============================================================================
-- LAC-13 (2ª migração) — gatilho recusa "Aceitar" gravado direto na tabela
-- em risco crítico
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A migração 20261122002 pôs a trava do risco crítico nas portas do fluxo
-- (enviar, validar, homologar), em salvar_ficha_risco e na reavaliação da
-- DAR. A revisão final da branch achou uma porta que sobrou: a política de RLS
-- "Riscos: altera os do próprio objeto" (20261115003) deixa quem escreve na
-- unidade fazer um UPDATE DIRETO em public.riscos (pela API, sem passar por
-- salvar_ficha_risco). E o gatilho de reabertura (fn_trava_reabertura_risco)
-- não reabre o risco quando só muda estrategia_principal. Resultado: um risco
-- APROVADO e crítico podia virar "Aceitar" e continuar aprovado. A spec da
-- LAC-13 (§2, "Fracasso") diz que isso não pode acontecer "por qualquer
-- caminho (... chamada direta ao banco ...)".
--
-- A CORREÇÃO: um gatilho BEFORE UPDATE OF estrategia_principal em riscos que
-- recusa (23514, a mesma mensagem RADAR da 20261122002) quando TUDO isto vale:
--   - OLD.status_fluxo NÃO é rascunho, devolvido nem preliminar_cgov (esses
--     continuam livres: o gestor salva e corrige depois);
--   - NEW.estrategia_principal = 'Aceitar';
--   - a estratégia MUDOU (NEW IS DISTINCT FROM OLD). Esta condição é
--     obrigatória: o recálculo da DAR (fn_dar_reavaliar_aprovados faz um
--     UPDATE "aprovado → aprovado") de um risco antigo que JÁ estava com
--     "Aceitar" não muda a estratégia, então nunca é barrado aqui — a mudança
--     da DAR sempre termina (e ela mesma devolve esse risco à unidade);
--   - NEW.status_critico é 'sim' ou 'pendente_dar' (risco crítico PARA ESTA
--     TRAVA; "crítico" é estar fora do apetite da DAR, nunca a faixa 18 a 25,
--     que é "Extremo").
-- Ex.: gestor.uc@ faz
--     update public.riscos set estrategia_principal = 'Aceitar' where id = <aprovado crítico>;
--   → "RADAR: o risco RADAR-X é crítico (fora do apetite da DAR ou com DAR
--     pendente) e precisa de tratamento: a estratégia "Aceitar" não é
--     permitida." (código 23514). A linha não muda.
--   O mesmo UPDATE num rascunho crítico, ou num aprovado NÃO crítico, passa.
--
-- POR QUE NEW.status_critico É O VALOR NOVO (ordem dos gatilhos):
-- No PostgreSQL, gatilhos BEFORE do mesmo evento rodam em ordem ALFABÉTICA do
-- nome. Os gatilhos BEFORE UPDATE de riscos ficam assim:
--   1º trg_calcular_risco_radar              (calcula residual e criticidade)
--   2º trg_riscos_exige_subcategoria         (20261122001)
--   3º trg_riscos_status_fluxo_so_pelo_fluxo (20261115003)
--   4º trg_riscos_trava_aceitar_critico      (ESTE)
--   5º trg_riscos_trava_reabertura           (20261115004/20261116001)
-- Como este roda DEPOIS do cálculo, NEW.status_critico já é a criticidade
-- recalculada com o P, o I, os controles e a categoria NOVOS do mesmo UPDATE.
-- (Ex.: mudar para "Aceitar" e, no mesmo UPDATE, baixar P e I até o risco
-- deixar de ser crítico → passa.) O nome foi escolhido para cair nessa ordem.
--
-- E A AÇÃO DE TRATAMENTO? Apagar a única ação de um aprovado crítico já
-- reabre o risco (gatilho das tabelas filhas → em_validacao_cg), e daí ele
-- não anda no fluxo sem ação (enviar/validar/homologar recusam). Por isso
-- este gatilho cuida só da estratégia principal.
--
-- FUNÇÃO DO GATILHO: SECURITY INVOKER com search_path vazio, como
-- fn_bloquear_status_fluxo_direto (20261115003): ela só olha OLD e NEW, não lê
-- tabela nenhuma, então não precisa de privilégio extra. EXECUTE revogado de
-- todos (só o banco a chama, como gatilho).
--
-- O QUE NÃO MUDA: o cálculo (Quadros 6, 7 e 8; trigger_calcular_risco_radar),
-- a RLS, as funções da 20261122002 (já aplicada no piloto) e o risco que não
-- é crítico.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_trava_aceitar_critico_direto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status_fluxo NOT IN ('rascunho', 'devolvido', 'preliminar_cgov')
     AND NEW.estrategia_principal = 'Aceitar'
     AND NEW.estrategia_principal IS DISTINCT FROM OLD.estrategia_principal
     AND NEW.status_critico IN ('sim', 'pendente_dar') THEN
    RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: a estratégia "Aceitar" não é permitida.',
      OLD.codigo_radar
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN NEW;
END;
$$;

-- Só o banco chama esta função (como gatilho). Ninguém a executa direto.
REVOKE EXECUTE ON FUNCTION public.fn_trava_aceitar_critico_direto() FROM public, anon, authenticated;

-- BEFORE UPDATE OF estrategia_principal: dispara quando o UPDATE cita a
-- coluna (salvar_ficha_risco sempre a cita; um PATCH direto que a mude também).
-- A condição IS DISTINCT FROM, dentro da função, ignora quem a regrava igual.
CREATE TRIGGER trg_riscos_trava_aceitar_critico
BEFORE UPDATE OF estrategia_principal ON public.riscos
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_aceitar_critico_direto();
