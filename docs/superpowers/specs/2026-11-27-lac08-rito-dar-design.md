# LAC-08 — Rito da DAR no banco e nas telas P-01 e P-10 (desenho)

> **Data:** 2026-11-27 · **Cartão:** "Rito da DAR" no [[quadro]] · **IDs:** LAC-08, RF-086, RF-089 a RF-093, RF-122, RF-124, RF-127, RF-130, RF-195, RN-054 a RN-061, RN-066
> **Telas aprovadas pela CGOV:** P-01 ([[2026-11-23-p01-dar-proposta-e-rito-design]], 2026-11-23) e P-10 ([[2026-11-27-p10-publicacao-dar-plano-design]], 2026-11-27), as duas sem ajustes.
> **Fontes lidas:** `20261109001` (tabela `categorias_risco`), `20261115003` (RLS), `20261116004` (gatilho que reavalia os aprovados), `20261123003` (padrão de RPC e de tabela imutável), `DeclaracaoApetiteDarView.vue`, `darImpacto.ts`, `fonteSupabase.ts` e `supabase/seed.sql`.

## 1. Por que

Hoje a CGOV grava o apetite em `categorias_risco` e ele vale na hora (LAC-08, contradição que bloqueia a
homologação). Pela norma, a CGOV elabora a **minuta**, o CTGRIC se manifesta, o CIG delibera e o apetite só vale
depois da **portaria** do Presidente. O banco precisa ter esse caminho como o **único** jeito de mudar o apetite.

## 2. Objetivos, não-objetivos e o que seria fracasso

- **Objetivos:** guardar a minuta separada do vigente (RF-092); registrar o encaminhamento ao CTGRIC (RF-122), a
  manifestação do CTGRIC (RF-124), a deliberação do CIG (RF-127) e a portaria (RF-130); aplicar o apetite só no
  registro da portaria (RF-093), reaproveitando o gatilho de reavaliação (RN-054); retificar a portaria com
  motivo; mostrar o prazo de "incorporar as ressalvas" (RF-195, em parte); telas P-01 e P-10.
- **Não-objetivos:** as telas de registro do CTGRIC e do CIG (P-05, a desenhar); o Plano de Gestão de Riscos
  (P-04, RF-131 e RF-132); mudar o cálculo (Quadros 6, 7 e 8) ou o gatilho de cálculo.
- **Fracasso, mesmo que funcione:** qualquer caminho, pela API, que mude `apetite_declarado` sem portaria; uma
  retificação que reavalie os riscos; apagar registro do rito; o nível 18–25 chamado de "Crítico".

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Banco completo; P-05 depois** (escolhida) | Migração com o rito inteiro da DAR, testado em pgTAP; telas P-01 e P-10 agora; botões do CTGRIC e do CIG com a P-05 | O rito fica certo e testado no banco; até a P-05, a minuta para na etapa 2 pela tela |
| B. Desenhar a P-05 antes | Plano da LAC-08 só depois da P-05 aprovada | Rito completo na tela, mas o código começa mais tarde |
| C. Registro provisório na P-10 | Datas do CTGRIC e do CIG digitadas na P-10 | Mais rápido, mas muda um desenho aprovado |

**Decisões do responsável (2026-11-27):**
- **A**, banco completo, com a P-05 depois;
- **os apetites gravados sem portaria voltam a "Pendente de DAR"**, como no quadro "Vigente" da P-01. Os valores
  atuais viram a **primeira minuta**, para a CGOV não perder o trabalho.

## 4. O desenho

### 4.1 Dados (migração `20261127001_lac08_rito_dar.sql`)

- **`dar_minutas`**: uma linha por rodada do rito. Colunas: `id uuid`, `etapa`, `criada_em`, `criada_por`.
  Etapas: `minuta` → `no_ctgric` → (`ressalvas` →) `no_cig` → `aprovada_cig` → `publicada`. Só **uma** minuta
  fora de `publicada` por vez (índice único parcial) *(chamada do Claude, da P-01)*.
- **`dar_minuta_categorias`**: `(minuta_id, categoria_id)` como chave, com `apetite_proposto` (`baixo`,
  `moderado` ou `pendente_dar`) e `justificativa`. Só muda nas etapas `minuta` e `ressalvas`.
- **`dar_rito_eventos`** (imutável): `minuta_id`, `tipo` (`encaminhada_ctgric`, `manifestacao_ctgric`,
  `encaminhada_cig`, `deliberacao_cig`, `portaria_registrada`, `portaria_retificada`), `data_evento`,
  `resultado` (`favoravel`, `com_ressalvas` ou `desfavoravel` no CTGRIC; `aprovada` ou `reprovada` no CIG),
  `observacao`, `antes jsonb`/`depois jsonb` (só na retificação), `motivo`, `registrado_por`,
  `registrado_em`. É o histórico da P-10 e a linha do tempo da P-01.
- **`dar_portarias`**: uma por minuta publicada: `numero`, `data_publicacao`, `link`. Só a RPC de retificação a
  altera, e cada mudança gera o evento `portaria_retificada`.
- **Visão `dar_situacao`**: a minuta em andamento (ou a última publicada), a etapa, as datas de cada passo e, na
  etapa `ressalvas`, `dia_prazo = fn_dias_uteis_entre(data da manifestação, fn_hoje())` com
  `dentro_prazo = dia_prazo <= 10` (decisão de 2026-11-23: só esse passo tem contador).
- **RLS:** todos com perfil ativo leem as quatro tabelas e a visão; ninguém grava direto (sem INSERT, UPDATE
  nem DELETE para `authenticated`); tudo passa pelas RPCs.
- **`categorias_risco`:** `REVOKE UPDATE` de `authenticated`. O apetite e a justificativa só mudam dentro da
  RPC da portaria. O gatilho `trg_categorias_dar_reavalia_aprovados` continua igual e faz a reavaliação.

### 4.2 Transições (RPCs `SECURITY DEFINER`, só a CGOV, `SET search_path = ''`)

| RPC | De → para | Regras |
| --- | --- | --- |
| `salvar_minuta_dar(p jsonb)` | cria a minuta, se não houver; `minuta` ou `ressalvas` | categorias do Quadro 2; apetite proposto válido |
| `encaminhar_minuta_dar_ctgric(p_data date)` | `minuta` → `no_ctgric` | data não futura |
| `registrar_manifestacao_ctgric_dar(p_resultado, p_data, p_observacao)` | `no_ctgric` → `ressalvas` (com ressalvas) ou `no_cig` | data não anterior ao encaminhamento |
| `encaminhar_minuta_dar_cig(p_data)` | `ressalvas` → `no_cig` | — |
| `registrar_deliberacao_cig_dar(p_resultado, p_data, p_observacao)` | `no_cig` → `aprovada_cig` ou, se reprovada, volta a `minuta` | ajuste em 30 dias (F3.13), sem contador |
| `registrar_portaria_dar(p_numero, p_data, p_link)` | `aprovada_cig` → `publicada` | data nem futura nem anterior à deliberação do CIG; aplica o apetite e a justificativa de cada categoria que mudou (o gatilho reavalia) |
| `retificar_portaria_dar(p_numero, p_data, p_link, p_motivo)` | `publicada` (a última) | motivo obrigatório; não toca no apetite |

Todas recusam quem não é CGOV (`42501`) e a etapa errada (mensagem em português, como na LAC-04). As do CTGRIC e
do CIG existem no banco, mas só ganham tela na P-05.

### 4.3 Os dados que já existem (decisão de 2026-11-27)

A migração, **só se houver** categoria com apetite diferente de `pendente_dar` e nenhuma portaria:
1. cria a minuta nº 1 na etapa `minuta` com os apetites e as justificativas de hoje;
2. põe todas as categorias em `pendente_dar`, sem justificativa. O gatilho reavalia os aprovados. Efeito
   esperado: só o residual **Médio** muda (de crítico ou não crítico para pendente); Alto e Extremo já eram
   críticos e continuam; nenhum risco **entra** no Risco Crítico, então nada volta à homologação;
3. `RAISE NOTICE` com quantas categorias e quantos riscos mudaram.

No `db:reset` local a migração roda antes da semente (as categorias ainda não existem) e não faz nada. A
**semente** (`seed.sql`) passa a gravar uma DAR **publicada de exemplo**, com minuta, eventos e
"Portaria nº 000/2025 (exemplo)", com os mesmos apetites de hoje. Assim os testes e a demonstração continuam com
apetite, e esse apetite tem portaria. A nuvem do piloto recebe a migração só com **[AUTORIZAÇÃO]**, e é lá que os
passos 1 a 3 têm efeito.

### 4.4 Telas

- **`/dar` (P-01):** abas Vigente (só leitura, com a portaria ou o selo "sem DAR publicada") e Proposta e rito
  (etapas, tabela "Vigente → Proposto" com a prévia de `simularImpactoDar`, "Salvar minuta", "Encaminhar ao
  CTGRIC"; nas etapas 2 a 4, links para a P-05, ainda sem tela, e para a P-10).
- **`/plano/publicacao` (P-10):** os três blocos da P-10, com o bloco da DAR ativo; item "Publicação (DAR e
  Plano)" no menu, no grupo Deliberação; leitura para os 10 perfis, ação só para a CGOV.
- **Modo demonstração:** a `fonteDemonstracao` imita as RPCs (etapas, recusas e reavaliação na memória).

## 5. O que fica para depois

A P-05 (telas do CTGRIC e do CIG, com o Plano), o contador de prazo nos outros passos da CGOV (RF-195 completo)
e o Plano de Gestão de Riscos (P-04).
