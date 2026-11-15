-- ============================================================================
-- TESTE DE REGRESSÃO DO CÁLCULO RADAR (pgTAP)
-- ============================================================================
--
-- EXPLICAÇÃO DIDÁTICA:
-- Este teste NÃO cria uma regra nova. Ele "tira uma fotografia" das regras que
-- já existem no banco (Quadros 6, 7 e 8 da Metodologia SEI 024421455) e avisa
-- se alguém, sem querer, mudar o resultado delas no futuro.
--
-- Como rodar:  npm run test:db   (equivale a `supabase test db`)
--
-- Tudo acontece dentro de uma transação (`begin` ... `rollback`): os dados
-- criados aqui desaparecem no final e o banco local fica limpo.
-- ============================================================================

begin;

-- Anunciamos que serão executadas 7 verificações.
select plan(7);

-- ----------------------------------------------------------------------------
-- 1) Matriz assimétrica do Quadro 7: o Impacto pesa mais que a Probabilidade.
--    Se fosse P x I, os dois casos abaixo dariam 5. Na matriz oficial, não.
-- ----------------------------------------------------------------------------
select is(calcular_nivel_inerente_q7(1, 5), 15,
  'Quadro 7: P=1 e I=5 resulta em 15');

select is(calcular_nivel_inerente_q7(5, 1), 11,
  'Quadro 7: P=5 e I=1 resulta em 11');

-- ----------------------------------------------------------------------------
-- 2) Faixas do Quadro 8 aplicadas ao valor exato, sem arredondar.
-- ----------------------------------------------------------------------------
select is(classificar_nivel_q8(10.2), 'Alto',
  'Quadro 8: 10,2 é Alto (acima de 10)');

select is(classificar_nivel_q8(17.1), 'Extremo',
  'Quadro 8: 17,1 é Extremo (acima de 17)');

-- ----------------------------------------------------------------------------
-- 3) Trava de evidência do Quadro 6.
--    Montamos a cadeia mínima exigida pelas chaves estrangeiras:
--    unidade -> objeto de contexto -> risco.
-- ----------------------------------------------------------------------------
insert into unidades (id, sigla, nome, tipo)
values ('00000000-0000-0000-0000-0000000000a1', 'TESTE-REG',
        'Unidade de teste de regressão', 'coordenacao-geral');

insert into objetos_contexto (id, tipo_objeto, nome_objeto, unidade_id,
                              objetivo_estrategico_associado)
values ('00000000-0000-0000-0000-0000000000b1', 'Processo',
        'Objeto de teste de regressão',
        '00000000-0000-0000-0000-0000000000a1',
        'Objetivo de teste');

-- Risco com eficácia "Forte" (fator 0,50), mas SEM evidência de funcionamento.
-- Os campos nivel_inerente, classificacao_* e nivel_residual são obrigatórios
-- na tabela, então enviamos valores provisórios: o gatilho os recalcula.
insert into riscos (
  id, codigo_radar, objeto_id, responsavel_risco_nome,
  causas, evento_risco, consequencias, objetivo_afetado, descricao_padrao,
  categoria_id, probabilidade, impacto,
  nivel_inerente, classificacao_inerente,
  possui_evidencia_controle, nivel_eficacia_controle, fator_controle,
  nivel_residual, classificacao_residual
) values (
  '00000000-0000-0000-0000-0000000000c1', 'TESTE-REG-001',
  '00000000-0000-0000-0000-0000000000b1', 'Responsável de teste',
  'causa de teste', 'evento de teste', 'consequência de teste', 'objetivo de teste', 'provisório',
  2, 1, 5,
  1, 'Baixo',
  false, 'Forte', 0.50,
  1, 'Baixo'
);

-- Sem evidência, a eficácia cai para "Fraco".
select is(
  (select nivel_eficacia_controle from riscos
    where id = '00000000-0000-0000-0000-0000000000c1'),
  'Fraco',
  'Trava Quadro 6: sem evidência, a eficácia Forte vira Fraco');

-- ... e o fator sobe para 0,90.
select is(
  (select fator_controle from riscos
    where id = '00000000-0000-0000-0000-0000000000c1'),
  0.90,
  'Trava Quadro 6: sem evidência, o fator vira 0,90');

-- Conferência extra: P=1, I=5 dá inerente 15; 15 x 0,90 = 13,50 (Alto).
select is(
  (select nivel_residual from riscos
    where id = '00000000-0000-0000-0000-0000000000c1'),
  13.50,
  'Residual = 15 x 0,90 = 13,50');

select * from finish();

rollback;
