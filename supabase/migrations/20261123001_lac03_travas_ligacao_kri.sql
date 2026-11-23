-- ============================================================================
-- LAC-03 (2ª migração) — travas de linha nos gatilhos da ligação do KRI
-- ============================================================================
-- EXPLICAÇÃO DIDÁTICA:
-- A migração 20261122004 (já aplicada no piloto, por isso não é editada)
-- criou a ligação KRI ↔ risco (kri_riscos) e três gatilhos que guardam as
-- regras do grupo "um KRI + os riscos que ele acompanha":
--   - fn_kri_riscos_mesmo_objeto: só liga KRI e risco do MESMO objeto;
--   - fn_kri_grupo_mesmo_objeto: KRI ou risco já ligados não mudam de objeto;
--   - fn_kri_riscos_apaga_orfao: o KRI que fica sem nenhuma ligação é apagado
--     (com as medições).
-- A triagem do CodeRabbit na PR #17 achou que essas regras valiam para UMA
-- pessoa de cada vez, mas podiam falhar com DUAS pessoas gravando ao mesmo
-- tempo. No PostgreSQL (nível "read committed"), cada comando só enxerga o
-- que já foi CONFIRMADO (commit) pelas outras transações. Duas gravações
-- simultâneas podem, cada uma, achar que está tudo certo, e juntas deixar o
-- banco num estado proibido:
--
--   a) LIGAR × MUDAR DE OBJETO. Ana liga o KRI K (FLONA de Caçador) ao risco
--      R-01 (FLONA de Caçador); ao mesmo tempo, Bruno leva R-01 para a CT
--      Curitiba. O gatilho de Ana lê o objeto antigo de R-01 (a mudança de
--      Bruno ainda não foi confirmada) → "mesmo objeto", passa. O gatilho de
--      Bruno procura ligações de R-01 e não vê a de Ana (ainda não
--      confirmada) → passa. Resultado: K (Caçador) ligado a R-01 (Curitiba).
--
--   b) DUAS REMOÇÕES DAS DUAS ÚLTIMAS LIGAÇÕES. K serve a R-01 e R-04. Ana
--      desliga R-01 e Bruno desliga R-04 ao mesmo tempo. Cada gatilho conta
--      as ligações que sobraram e ainda vê a do outro (a remoção do outro não
--      foi confirmada) → nenhum apaga o KRI. Resultado: K sem ligação nenhuma,
--      com as medições, que a regra manda apagar.
--
-- A CORREÇÃO: TRAVAS DE LINHA ("SELECT ... FOR SHARE" / "FOR UPDATE"). Uma
-- trava faz a 2ª transação ESPERAR a 1ª terminar; quando ela volta, o
-- comando relê a linha já confirmada.
--   1) fn_kri_riscos_mesmo_objeto trava a linha do KRI (FOR SHARE) e DEPOIS
--      a do risco (FOR NO KEY UPDATE) ao ler o objeto de cada um. O UPDATE que muda o objeto
--      também trava a linha que muda; então ligar e mudar de objeto passam a
--      acontecer um depois do outro, e o 2º vê o resultado do 1º:
--      no caso (a), se Bruno confirmar primeiro, Ana espera e relê R-01 já em
--      Curitiba → recusa (23514); se Ana confirmar primeiro, o UPDATE de
--      Bruno espera e o gatilho dele vê a ligação nova → recusa (23514).
--   2) fn_kri_grupo_mesmo_objeto: quando é o KRI que muda de objeto, trava
--      também os riscos ligados a ele (FOR SHARE) antes de comparar. Quando
--      é o RISCO que muda, o KRI não é travado aqui (ver "ordem" abaixo): a
--      trava que o próprio UPDATE já põe no risco basta, porque toda ligação
--      nova trava o risco (item 1) antes de ler o objeto dele.
--   3) fn_kri_riscos_apaga_orfao trava a linha do KRI (FOR UPDATE) antes de
--      contar as ligações que sobraram. No caso (b), Bruno espera Ana; quando
--      volta, a contagem já não vê a ligação de Ana → o KRI órfão é apagado.
--
-- ORDEM DAS TRAVAS (o "deadlock", ou impasse): se uma transação trava
-- "KRI depois risco" e outra "risco depois KRI", cada uma pode ficar
-- esperando a outra para sempre; o PostgreSQL percebe e cancela uma delas
-- com o erro 40P01. Os gatilhos DA LIGAÇÃO mantêm sempre a ordem KRI →
-- risco (por isso o ramo "risco muda de objeto" do item 2 não trava o KRI).
-- Mas outros caminhos podem travar na ordem contrária — salvar_ficha_risco
-- (que grava o risco antes dos KRIs), o DELETE de um risco (que desliga os
-- KRIs em cascata) e a edição da definição de um KRI (que reabre os riscos
-- ligados). Então um impasse raro ainda pode acontecer (ex.: alguém apaga
-- um risco enquanto outra pessoa liga um KRI a ele). Nesse caso o banco
-- cancela UMA das gravações inteira: nada fica pela metade, e a pessoa só
-- precisa gravar de novo.
--
-- QUAL TRAVA EM CADA LINHA:
--   - KRI: FOR SHARE. A "FOR KEY SHARE" (a da chave estrangeira) não segura
--     um UPDATE que muda só o objeto_id (que não é chave), então não
--     serializaria o caso (a). FOR SHARE segura qualquer UPDATE da linha, mas
--     deixa várias leituras ao mesmo tempo: duas pessoas podem ligar o MESMO
--     KRI a riscos diferentes juntas.
--   - Risco: FOR NO KEY UPDATE (e não FOR SHARE). O gatilho seguinte da
--     ligação (trg_kri_riscos_trava_reabertura → fn_fluxo_aplicar_trava)
--     trava o MESMO risco com FOR UPDATE. Com FOR SHARE, duas ligações
--     simultâneas de KRIs diferentes ao mesmo risco seguravam as duas a
--     trava compartilhada e travavam uma à outra ao tentar subi-la (40P01).
--     FOR NO KEY UPDATE não convive consigo mesma: a 2ª ligação espera a 1ª
--     terminar logo no começo, sem impasse. E ela continua segurando o UPDATE
--     que muda o risco de objeto (que também pede FOR NO KEY UPDATE).
--
-- O QUE NÃO MUDA: as regras (mesma mensagem e mesmo código 23514; o órfão
-- continua sendo apagado só na última ligação), os nomes e os gatilhos (só
-- as funções são recriadas, com CREATE OR REPLACE), a RLS, o fluxo, as
-- permissões (EXECUTE continua revogado: só o banco as chama, como gatilho)
-- e o cálculo (Quadros 6, 7 e 8; trigger_calcular_risco_radar).
-- Ex. de uso: nenhum. As travas são invisíveis para quem grava sozinho; só
-- fazem a 2ª gravação simultânea esperar alguns milissegundos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ligar: KRI e risco do mesmo objeto, lidos com trava (KRI antes do risco)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER (como antes): lê o KRI e o risco sem depender da RLS de
-- quem grava. Só devolve erro ou nada: não vaza dado.
-- Ex.: Ana liga K1 a R-01 e Bruno liga K2 a R-01 ao mesmo tempo → Bruno
--      espera Ana terminar (trava do risco) e depois segue normalmente.
-- Ex.: KRI da FLONA de Caçador + risco da CT Curitiba → recusa (23514).
CREATE OR REPLACE FUNCTION public.fn_kri_riscos_mesmo_objeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_objeto_kri   uuid;
  v_objeto_risco uuid;
BEGIN
  -- 1º o KRI, 2º o risco (a mesma ordem nos gatilhos da ligação).
  -- Se outra transação estiver mudando o objeto da linha, o comando espera
  -- ela terminar e lê o valor já confirmado.
  -- KRI: FOR SHARE (várias ligações do mesmo KRI podem andar juntas).
  SELECT k.objeto_id INTO v_objeto_kri
    FROM public.indicadores_kri AS k
   WHERE k.id = NEW.kri_id
     FOR SHARE;
  -- Risco: FOR NO KEY UPDATE, uma trava que não convive consigo mesma: a 2ª
  -- ligação ao mesmo risco espera aqui. O gatilho de reabertura, logo
  -- depois, sobe a trava para FOR UPDATE sem disputa (ver o cabeçalho).
  SELECT r.objeto_id INTO v_objeto_risco
    FROM public.riscos AS r
   WHERE r.id = NEW.risco_id
     FOR NO KEY UPDATE;
  -- KRI ou risco inexistente: quem recusa é a chave estrangeira (23503).
  IF v_objeto_kri IS DISTINCT FROM v_objeto_risco
     AND v_objeto_kri IS NOT NULL AND v_objeto_risco IS NOT NULL THEN
    RAISE EXCEPTION 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.'
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Mudar de objeto: o grupo continua no mesmo objeto
-- ----------------------------------------------------------------------------
-- Recusa (23514):
--   - indicadores_kri: trocar o objeto_id de um KRI ligado a risco de outro
--     objeto;
--   - riscos: levar para outro objeto um risco ligado a KRI do objeto antigo
--     (desligue o KRI antes de mudar o risco de objeto).
-- A linha que muda de objeto já está travada pelo próprio UPDATE.
CREATE OR REPLACE FUNCTION public.fn_kri_grupo_mesmo_objeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.objeto_id IS NOT DISTINCT FROM OLD.objeto_id THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'indicadores_kri' THEN
    -- O KRI (travado pelo UPDATE) vem antes; agora os riscos ligados a ele
    -- (FOR SHARE, em ordem de id), para ler o objeto já confirmado de cada um.
    PERFORM 1
       FROM public.riscos AS r
      WHERE r.id IN (SELECT l.risco_id FROM public.kri_riscos AS l WHERE l.kri_id = NEW.id)
      ORDER BY r.id
        FOR SHARE;
    -- (O PERFORM acima também mexe no FOUND; o que vale é o PERFORM abaixo.)
    PERFORM 1
       FROM public.kri_riscos AS l
       JOIN public.riscos AS r ON r.id = l.risco_id
      WHERE l.kri_id = NEW.id AND r.objeto_id IS DISTINCT FROM NEW.objeto_id;
  ELSE  -- riscos
    -- O KRI NÃO é travado aqui: o risco já está travado pelo UPDATE, e travar
    -- o KRI depois inverteria a ordem "KRI antes do risco". Não faz falta:
    -- toda ligação nova trava este risco (seção 1, FOR NO KEY UPDATE) e, por isso, espera este
    -- UPDATE terminar e relê o objeto novo.
    PERFORM 1
       FROM public.kri_riscos AS l
       JOIN public.indicadores_kri AS k ON k.id = l.kri_id
      WHERE l.risco_id = NEW.id AND k.objeto_id IS DISTINCT FROM NEW.objeto_id;
  END IF;
  IF FOUND THEN
    RAISE EXCEPTION 'RADAR: o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.'
      USING ERRCODE = 'check_violation';   -- 23514
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. KRI órfão: trava o KRI antes de contar as ligações que sobraram
-- ----------------------------------------------------------------------------
-- Depois de apagar uma ligação, se o KRI não tem mais nenhuma, ele é apagado
-- (e as medições vão junto, pela cascata de medicoes_kri).
-- SECURITY DEFINER (como antes): o KRI sem ligação não pode sobrar só porque
-- quem desligou não tem DELETE no KRI (ex.: o risco foi apagado em cascata).
-- Ex.: KRI ligado a R-01 e R-04; Ana desliga R-01 e Bruno desliga R-04 ao
--      mesmo tempo → Bruno espera Ana; quando volta, não há mais ligação
--      nenhuma → o KRI é apagado.
CREATE OR REPLACE FUNCTION public.fn_kri_riscos_apaga_orfao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- FOR UPDATE: só uma remoção de cada vez conta as ligações deste KRI.
  -- (Se o KRI já foi apagado nesta mesma transação — cascata do DELETE do
  -- próprio KRI —, não há linha a travar e o DELETE abaixo não acha nada.)
  PERFORM 1
     FROM public.indicadores_kri AS k
    WHERE k.id = OLD.kri_id
      FOR UPDATE;
  DELETE FROM public.indicadores_kri AS k
   WHERE k.id = OLD.kri_id
     AND NOT EXISTS (SELECT 1 FROM public.kri_riscos AS l WHERE l.kri_id = OLD.kri_id);
  RETURN NULL;   -- gatilho AFTER: o valor de retorno é ignorado
END;
$$;

-- As permissões não mudam com CREATE OR REPLACE, mas repetimos a revogação
-- para deixar claro: só o banco chama estas funções, como gatilho.
REVOKE EXECUTE ON FUNCTION public.fn_kri_riscos_mesmo_objeto() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_grupo_mesmo_objeto()  FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_kri_riscos_apaga_orfao()  FROM public, anon, authenticated;
