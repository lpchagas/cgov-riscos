# UC-06 — Analisar risco e avaliar controles existentes

> Origem: F1.02, F2.01 e F2.02; Metodologia 4.3 e 4.4 (Quadros 4 a 8); Política art. 8º, § 1º · RF: RF-037, RF-038, RF-039, RF-040, RF-041, RF-042, RF-043, RF-044, RF-045, RF-046, RF-087, RF-088 · RN: RN-011, RN-012, RN-001, RN-002, RN-003, RN-004, RN-005, RN-007, RN-008, RN-009, RN-010, RN-013, RN-037, RN-041, RN-051 · Situação: implementado

## Título

Analisar risco e avaliar controles existentes.

## Ator principal

Gestor de riscos (1ª linha) da unidade dona do risco.

## Pré-condições

- O risco foi identificado ([[UC-05-identificar-e-registrar-risco]]) e está em rascunho, devolvido ou preliminar da CGOV, ou aprovado (com a reabertura do 7b).

## Pós-condições

- Os valores calculados são sempre os do banco, nunca os informados por quem preenche (RN-013).
- Nenhum controle sem evidência fica com eficácia acima de Fraco (RN-004).
- A gravação recusada não deixa a ficha pela metade.

## Fluxo principal de sucesso

1. O gestor escolhe a probabilidade, de 1 a 5 (RN-011).
2. O gestor escolhe o impacto, de 1 a 5 (RN-012).
3. O gestor descreve o controle existente, escolhe a eficácia do Quadro 6 e informa se há evidência comprovada de funcionamento e onde ela está.
4. O sistema mostra a prévia: inerente lido na tabela do Quadro 7 (RN-001), fator do Quadro 6 (RN-003), residual = inerente × fator e classificação pelo Quadro 8 sem arredondar (RN-002), com o aviso de que o valor oficial é o do RADAR.
5. O gestor grava a ficha.
6. O sistema recalcula no banco, ignorando valores enviados (RN-013): inerente pelo Quadro 7 (RN-001), trava de evidência (RN-004), residual (RN-003) e classificação do inerente e do residual (RN-002).
7. O sistema compara o residual com o apetite da categoria na DAR e marca o risco como crítico ou não crítico (RN-005, RN-008, RN-009).

## Fluxos alternativos e de exceção

- 1a. A escala é mostrada com nomes e percentuais que não são os do Quadro 4 (LAC-12): o gestor escolhe pelo número (não tratado pelo sistema; cartão no Kanban).
- 3a. **Eficácia acima de Fraco sem evidência.** O gestor escolhe Mediano, Satisfatório ou Forte e não marca evidência comprovada: a prévia avisa a trava, e o banco grava a eficácia como Fraco, com fator 0,9 (RN-004). Exemplo: inerente 15 com "Forte" sem evidência dá residual 15 × 0,9 = 13,5 (Alto), e não 15 × 0,5 = 7,5 (Médio). Teste: `supabase/tests/000`, item 3.
- 3b. O gestor marca evidência e não diz onde ela está: o sistema não avança (RF-040).
- 3c. Eficácia diferente de Inexistente sem descrição do controle: o sistema pede a descrição.
- 3d. Não há controle: eficácia Inexistente, fator 1,0, e o residual é igual ao inerente (RN-003).
- 6a. O residual fica abaixo de 1 (inerente 1 com fator de 0,5 a 0,9): é classificado como Baixo (RN-007).
- 6b. A ficha está em validação ou em homologação: o banco recusa a gravação, porque a ficha está travada (RN-037).
- 7a. A categoria ainda não tem apetite declarado e o residual é Médio: o risco fica pendente de DAR, nem crítico nem aceito; o Alto e o Extremo continuam críticos (RN-010). Esse risco exige homologação ([[UC-09-validar-risco]], RN-041).
- 7b. O risco estava aprovado: a mudança de probabilidade, impacto ou controle o reabre para validação ([[UC-08-enviar-risco-para-validacao]], exceção 1a; RN-051).

## Pós-condição de sucesso

- A ficha tem probabilidade, impacto e controle gravados, e o banco calculou inerente, fator, residual, classificações e criticidade frente à DAR.
