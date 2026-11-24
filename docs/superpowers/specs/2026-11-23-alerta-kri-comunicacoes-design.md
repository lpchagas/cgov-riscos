# Alerta do KRI e Comunicações à CGOV: desenho técnico (código)

> **Data:** 2026-11-23 · **Cartões:** "Alerta do KRI" (Desenvolvimento) e "Comunicação à CGOV das 6 hipóteses" (LAC-04, Backlog) no [[quadro]]
> **IDs:** LAC-03, LAC-04 · RF-099, RF-102, RF-107, RF-108, RF-109, RF-111, RF-192 · RN-083, RN-084, RN-085, RN-086, RN-052 · UC-15, UC-16
> **Telas aprovadas:** P-02 (`2026-11-23-p02-tratar-alerta-kri-design.md`) e P-03 (`2026-11-23-p03-comunicar-fato-cgov-design.md`).
> **Entrega:** código, banco local e testes. A aplicação na nuvem do piloto fica para depois, passo a passo, com **[AUTORIZAÇÃO]**.

## 1. Por que

Pela Metodologia 4.7.1 (parágrafo do alerta) e 4.7.2, passado o limite de alerta do KRI, o gestor tem 10 dias
úteis da ciência para reavaliar o risco e comunicar o resultado à CGOV; e comunica, no mesmo prazo, os fatos das
hipóteses I a VI. Hoje o RADAR só guarda uma marca "em alerta" posta à mão, com limite e valor em texto livre; não
há prazo, comunicação nem ciência da CGOV (LAC-03, que bloqueia a homologação, e LAC-04).

## 2. Objetivos, não-objetivos e fracasso

- **Objetivos:** limite e leitura numéricos; o **banco** compara, abre o alerta, conta o prazo e encerra o alerta
  quando a comunicação é enviada; a tela de Comunicações completa (6 hipóteses + alerta do KRI), com a ciência
  da CGOV; o Monitoramento como aprovado na P-02.
- **Não-objetivos:** RF-110 (sugerir comunicação quando a criticidade muda); a reavaliação própria (P-09: o botão
  "Reavaliar" leva à ficha do risco); a cobrança pela CGOV (P-07); o alerta no Painel; mudar os Quadros 6, 7 e 8.
- **Fracasso, mesmo que funcione:** regra só no navegador (outra porta grava sem ela); comunicação editável ou
  apagável depois de enviada; KRI antigo convertido "no chute"; risco crítico aprovado devolvido à unidade só
  porque o limite antigo ainda é texto.

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Tabela de alertas mantida pelo banco** (escolhida) | Gatilho na leitura compara, marca e abre o alerta; gatilho na comunicação encerra; visão calcula prazo e "dia N" | Regra em um lugar, vale para toda porta; a P-07 lê direto |
| B. Tudo calculado numa visão | Deduz o alerta das leituras e comunicações | Regras de "não reiniciar" e "encerrar só com comunicação" viram consulta difícil de testar |
| C. Só no navegador | Front compara e conta | Contraria "a norma vale no banco"; a CGOV não teria onde ler |

**Decisões do responsável (2026-11-23):** P-03 inteira nesta fase (LAC-03 e LAC-04 juntas); a migração converte
só os limites em texto sem ambiguidade e lista os demais; dias úteis = segunda a sexta sem feriados nacionais
(tabela no banco, mantida pela CGOV); abordagem A.

## 4. Banco (2 migrações novas)

### 4.1 `20261123002_lac03_alerta_kri.sql`

- **Feriados:** tabela `feriados` (`data date` PK, `nome text`); leitura por todos os autenticados, escrita só
  pela CGOV (`meu_perfil().papel_governanca = 'cgov'`). Semente com os feriados nacionais de 2026 e 2027 (fixos,
  Carnaval segunda e terça, Paixão, Corpus Christi como ponto facultativo federal, 20 de novembro).
- **Funções de dias úteis** (`IMMUTABLE` não, `STABLE`, leem `feriados`): `fn_somar_dias_uteis(d date, n int)
  returns date` (o n-ésimo dia útil depois de `d`) e `fn_dias_uteis_entre(inicio date, fim date) returns int`
  (dias úteis em `(inicio, fim]`; 0 se `fim <= inicio`).
- **Limite numérico** em `indicadores_kri`: `limite_operador text CHECK IN ('>','>=','<','<=')`,
  `limite_valor numeric`, `limite_unidade text`; CHECK "os dois ou nenhum" para operador e valor. A coluna
  `limite_alerta` (texto) fica como **limite antigo**, só para leitura.
- **Conversão** (`fn_converter_limite_texto(t text)` → `(operador, valor, unidade)` ou nulo, `IMMUTABLE`): aceita
  só `<`, `<=`, `>`, `>=` + número, "abaixo de N", "acima de N", "menor que N", "maior que N" (vírgula ou ponto,
  unidade opcional como `%`). "Até", intervalos, textos com dois números ou palavras extras: nulo ("a converter").
  A migração aplica nos KRIs existentes e mostra, por `RAISE NOTICE`, quantos converteu e quantos ficaram.
- **Leitura numérica** em `medicoes_kri`: `valor_numerico numeric` (as antigas ganham o número quando o texto é
  só número com `%` opcional). Gatilho `BEFORE INSERT OR UPDATE OF valor_numerico` (`fn_medicao_calcula_alerta`)
  **calcula** `em_alerta` pelo limite do KRI e ignora o que o cliente mandou; sem limite numérico ou sem valor,
  `em_alerta = false`. As leituras antigas não são recalculadas (histórico fica como foi gravado).
- **Alertas:** tabela `alertas_kri` (`id`, `kri_id` FK cascade, `medicao_id` FK, `ciencia_em date`,
  `encerrado_em date`, `comunicacao_id uuid` (FK na migração 4.2), `criado_em`). Índice único parcial: **um
  alerta aberto por KRI**. Gatilho `AFTER INSERT` em `medicoes_kri` (`fn_medicao_abre_alerta`,
  `SECURITY DEFINER`): leitura em alerta e nenhum aberto → abre com `ciencia_em = current_date` (dia do
  registro, não o da medição). Leitura dentro do limite não encerra; nova leitura em alerta não reinicia.
- **Visão** `alertas_kri_situacao` (`security_invoker`): colunas da tabela + `vence_em`, `dia_atual`
  (`least(fn_dias_uteis_entre(ciencia_em, current_date), 99)`), `vencido`, `dias_uteis_vencido`.
- **RLS** de `alertas_kri`: leitura quando o KRI está no alcance; nenhuma escrita direta (só pelos gatilhos).
- **`fn_kri_completo`:** o limite conta como preenchido se houver operador e valor **ou** o texto antigo — nada
  reabre por causa da migração. KRI novo só se grava com o limite numérico (front e `salvar_ficha_risco`).
- **`salvar_ficha_risco`:** a lista `kris` passa a ler e gravar `limite_operador`, `limite_valor` e
  `limite_unidade` (e deixa de gravar `limite_alerta` em KRI novo).
- Trilha de auditoria (`fn_registrar_auditoria`) nas tabelas novas.

### 4.2 `20261123003_lac04_comunicacoes_cgov.sql`

- **`comunicacoes_cgov`:** `id`, `unidade_id` (FK, obrigatória), `hipotese text CHECK IN
  ('I','II','III','IV','V','VI','alerta_kri')`, `supre text[] DEFAULT '{}'` (só `I`, `II`, `III`, e só com
  `alerta_kri`), `data_ciencia date`, `comunicada_em timestamptz DEFAULT now()`, `descricao text NOT NULL`,
  `providencias text`, `documento_sei text`, `alerta_id uuid UNIQUE` (FK `alertas_kri`), `autor_id uuid DEFAULT
  auth.uid()`, `ciencia_cgov_em timestamptz`, `ciencia_cgov_por uuid`, `observacao_cgov text`.
- **`comunicacoes_riscos`** (`comunicacao_id`, `risco_id`, PK dupla).
- **Gravação por RPC** `enviar_comunicacao(p jsonb) returns uuid` (`SECURITY INVOKER`): insere a comunicação e os
  riscos numa transação. Regras: risco obrigatório em I, II, III, V e `alerta_kri`; com `alerta_id`, a hipótese
  é `alerta_kri`, o alerta está aberto e a `data_ciencia` é a do alerta; `data_ciencia` não pode ser futura.
  Fora do prazo **grava** (o prazo é informação, não trava).
- **Encerramento do alerta:** gatilho `AFTER INSERT` (`SECURITY DEFINER`) põe `encerrado_em = current_date` e
  `comunicacao_id` no alerta.
- **Imutável:** sem política de UPDATE nem DELETE para `authenticated`; gatilho `BEFORE UPDATE` recusa mudar
  qualquer coluna além das três da ciência, e recusa a ciência já registrada. Ciência por
  `registrar_ciencia_comunicacao(p_id uuid, p_observacao text)` (`SECURITY DEFINER`, só `papel_governanca =
  'cgov'`).
- **RLS:** leitura com `unidade_id IN (SELECT unidades_visiveis())` (a AUDIT e a CGOV veem todas); inserção com
  `pode_escrever_unidade(unidade_id)`.
- **Visão** `comunicacoes_cgov_situacao`: `prazo_dias_uteis` (`fn_dias_uteis_entre(data_ciencia,
  comunicada_em::date)`), `no_prazo` (`<= 10`), `vence_em`, `situacao` (`'nova'` ou `'ciencia_registrada'`).

## 5. Front

- **Utilitários puros (com testes):** `src/utils/limiteAlerta.ts` (comparação, texto "menor que 80 %", conversão
  idêntica à do banco), `src/utils/diasUteis.ts` e `src/utils/feriadosNacionais.ts` (a mesma lista da semente,
  conferida por teste contra o arquivo da migração), `src/utils/situacaoKri.ts` (situação e ordem por urgência),
  `src/utils/hipotesesComunicacao.ts` (rótulos, exigência de risco).
- **Dados:** tipos novos (`AlertaKri`, `ComunicacaoCgov`, campos numéricos em `IndicadorKri` e `MedicaoKri`);
  `FonteDados` ganha `listarAlertasKri`, `listarComunicacoes`, `enviarComunicacao`, `registrarCiencia`; a fonte de
  demonstração usa os mesmos utilitários para imitar o banco.
- **Monitoramento (P-02):** "Alertas abertos"; filtro por situação com contagem; ordem por urgência; páginas de
  10 (`src/services/dados/paginacao.ts` ou o padrão do `DataTable`); cartão com faixa de cor; faixa de alerta com
  "Reavaliar" (vai à ficha do risco) e "Comunicar à CGOV" (vai a `/comunicacoes?alerta=<id>`); "Ver detalhes";
  janela de leitura com número e mensagem automática.
- **Etapa 4 do formulário:** operador, número e unidade; "limite a converter" com o texto antigo.
- **Comunicações (P-03):** rota `/comunicacoes` (`ComunicacoesView.vue`), painel `PainelComunicacao.vue` sobre o
  `SideSheet`; item "Comunicações" no menu, com o número de novas para a CGOV.
- Painel (`painelResumo.ts`) e ficha (`FichaDetalheBowTieView.vue`) passam a mostrar o limite pelo texto novo.

## 6. Chamadas do Claude (para conferir)

- `ciencia_em` é a data do registro da leitura (decisão da P-02) e as leituras antigas não ganham alerta
  retroativo.
- `fn_kri_completo` aceita o texto antigo para não reabrir riscos aprovados.
- "Reavaliar" leva à ficha do risco até existir a P-09.
- Uma comunicação por alerta (`alerta_id UNIQUE`).
- Duas migrações (uma por lacuna), para a revisão e a aplicação na nuvem serem por partes.
