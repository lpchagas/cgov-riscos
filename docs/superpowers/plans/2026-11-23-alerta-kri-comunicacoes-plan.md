# Alerta do KRI e Comunicações à CGOV: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o banco compara a leitura com o limite numérico do KRI, abre e encerra o alerta e conta 10 dias úteis; o Monitoramento mostra o alerta como na P-02; a tela de Comunicações (P-03) registra as 6 hipóteses e a ciência da CGOV.

**Architecture:** duas migrações (LAC-03 e LAC-04) com gatilhos, visões e RPCs, protegidas por RLS e testadas em pgTAP; utilitários puros em TypeScript, espelhando as regras para o modo de demonstração; telas em Vue com os componentes da biblioteca.

**Tech Stack:** PostgreSQL/Supabase (pgTAP), Vue 3 + TypeScript, Vitest, Playwright (a11y).

**Spec:** `docs/superpowers/specs/2026-11-23-alerta-kri-comunicacoes-design.md` (telas: P-02 e P-03 aprovadas).

## Global Constraints

- **[AUTORIZAÇÃO]** este plano cria as migrações `20261123002_lac03_alerta_kri.sql` e `20261123003_lac04_comunicacoes_cgov.sql`; só no banco local. Aplicar na nuvem do piloto é passo à parte, autorizado a cada vez.
- Não mudar os Quadros 6, 7 e 8, `calculadoraRiscoRadar.ts` nem o gatilho de cálculo.
- Comentários didáticos em pt-BR em todo código novo; "Plano de Gestão de Riscos" por extenso; "Risco Crítico" = fora do apetite da DAR.
- Dados só de demonstração (`@radar.test`); nunca `_temp/`.
- Operadores do limite: `>`, `>=`, `<`, `<=`; textos: "maior que", "maior ou igual a", "menor que", "menor ou igual a".
- Prazo: `vence_em = fn_somar_dias_uteis(ciencia, 10)`; `dia_atual = fn_dias_uteis_entre(ciencia, hoje)`; dentro do prazo quando `<= 10`.
- Hipóteses: `I`, `II`, `III`, `IV`, `V`, `VI`, `alerta_kri`; risco obrigatório em `I`, `II`, `III`, `V`, `alerta_kri`; `supre ⊆ {I, II, III}` só com `alerta_kri`.
- Revisão: uma por tarefa; as tarefas de migração e RLS têm revisão completa. `/code-review` (medium) no fim de cada fase e PR "Fase N: …" para a `main`.

## Review Focus

1. Duas leituras em alerta gravadas ao mesmo tempo no mesmo KRI: um só alerta aberto (índice único parcial; o segundo gatilho não falha) — teste em Task 3.
2. Comunicação enviada duas vezes para o mesmo alerta (clique duplo): a segunda é recusada com mensagem clara — teste em Task 5 e Task 11.
3. KRI com limite antigo em texto: nenhuma leitura gera alerta, a tela mostra "limite a converter" e o risco aprovado não reabre — testes em Task 3 e Task 8.
4. Ciência do alerta numa sexta-feira véspera de feriado: o prazo pula fim de semana e feriado — teste em Task 1 e Task 6.
5. Gestor da unidade B tenta ler ou comunicar fato da unidade A; CGOV tenta registrar ciência duas vezes — testes em Task 5.

---

## Fase 1 — Banco

### Task 1: Feriados e dias úteis

**Files:** Create `supabase/migrations/20261123002_lac03_alerta_kri.sql` (seção 1); Test `supabase/tests/120_lac03_alerta_kri.test.sql` (seção 1).

**Produces:** `public.feriados(data date PK, nome text)`; `public.fn_somar_dias_uteis(d date, n int) returns date`; `public.fn_dias_uteis_entre(inicio date, fim date) returns int`.

- [ ] **Step 1: testes que falham** (pgTAP): `fn_somar_dias_uteis('2026-11-19', 10) = '2026-12-04'` (pula 20/11 e dois fins de semana); `fn_somar_dias_uteis('2026-11-21', 10) = '2026-12-04'` (ciência num sábado); `fn_dias_uteis_entre('2026-11-19','2026-11-23') = 1`; `fn_dias_uteis_entre('2026-11-23','2026-11-20') = 0`; gestor não insere em `feriados`; CGOV insere.
- [ ] **Step 2:** `npm run db:reset && npm run test:db` → falha (função inexistente).
- [ ] **Step 3:** tabela, RLS (SELECT authenticated; INSERT/UPDATE/DELETE só `papel_governanca = 'cgov'`), semente 2026–2027 (1/1, Carnaval seg/ter, Paixão, 21/4, 1/5, Corpus Christi, 7/9, 12/10, 2/11, 15/11, 20/11, 25/12; 2026: 16–17/2, 3/4, 4/6; 2027: 8–9/2, 26/3, 27/5) e as duas funções (`STABLE`, `SET search_path = ''`).
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS.
- [ ] **Step 5:** commit `feat(lac-03): feriados e dias úteis no banco`.

### Task 2: Limite e leitura numéricos, com conversão

**Files:** Modify a migração `20261123002` (seção 2); Test `120` (seção 2).

**Produces:** colunas `indicadores_kri.limite_operador|limite_valor|limite_unidade`, `medicoes_kri.valor_numerico`; `public.fn_converter_limite_texto(t text) returns table(operador text, valor numeric, unidade text)`; `fn_kri_completo` aceitando numérico **ou** texto antigo.

- [ ] **Step 1: testes que falham:** conversão de `'< 80%'`→(`<`,80,`%`); `'Abaixo de 70%'`→(`<`,70,`%`); `'Acima de 5%'`→(`>`,5,`%`); `'>= 2,5 dias'`→(`>=`,2.5,`dias`); `'Até 10%'`, `'Entre 5 e 10'`, `'Abaixo de 70% ou acima de 90%'`, `''` → nenhuma linha; KRI da semente com `'Abaixo de 70%'` convertido; CHECK recusa operador sem valor; `fn_kri_completo` verdadeiro com só o texto antigo e com só o numérico.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** colunas, CHECKs, função de conversão (`IMMUTABLE`), `UPDATE` de conversão com `RAISE NOTICE` (convertidos × a converter), `valor_numerico` das leituras antigas (texto só número com `%` opcional), nova `fn_kri_completo`.
- [ ] **Step 4:** rodar `120` e a suíte inteira (`100`, `110`, `111` continuam verdes) → PASS.
- [ ] **Step 5:** commit `feat(lac-03): limite de alerta e leitura numéricos, com conversão do que é claro`.

### Task 3: Alerta calculado e aberto pelo banco

**Files:** migração `20261123002` (seção 3); Test `120` (seção 3).

**Produces:** gatilhos `fn_medicao_calcula_alerta` (BEFORE INSERT OR UPDATE OF valor_numerico) e `fn_medicao_abre_alerta` (AFTER INSERT, SECURITY DEFINER); tabela `public.alertas_kri(id, kri_id, medicao_id, ciencia_em, encerrado_em, comunicacao_id, criado_em)` com índice único parcial `WHERE encerrado_em IS NULL`; visão `public.alertas_kri_situacao` (+ `vence_em`, `dia_atual`, `vencido`, `dias_uteis_vencido`).

- [ ] **Step 1: testes que falham:** leitura 60 no KRI "menor que 70" grava `em_alerta = true` mesmo enviando `false`; leitura 85 grava `false` mesmo enviando `true`; a 1ª em alerta abre alerta com `ciencia_em = current_date`; a 2ª em alerta não abre outro; leitura dentro do limite não encerra; KRI só com texto antigo: `em_alerta = false` e nenhum alerta; inserir em `alertas_kri` direto como gestor é recusado; gestor de outra unidade não lê o alerta; registrar leitura não reabre o risco aprovado (RN-052).
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** tabela, RLS (SELECT pelo KRI no alcance; sem escrita), gatilhos, visão (`security_invoker = true`), auditoria.
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5:** commit `feat(lac-03): o banco calcula o alerta do KRI e abre o prazo de 10 dias úteis`.

### Task 4: `salvar_ficha_risco` com o limite numérico

**Files:** migração `20261123002` (seção 4, `CREATE OR REPLACE` a partir da definição vigente de `salvar_ficha_risco`); Test `120` (seção 4).

- [ ] **Step 1: testes que falham:** gravar ficha com `kris[0].limite_operador = '<'`, `limite_valor = 80`, `limite_unidade = '%'` persiste os três; KRI novo sem operador/valor em risco crítico continua travado pela LAC-03.
- [ ] **Step 2:** rodar → falha. **Step 3:** acrescentar os três campos ao INSERT/UPDATE de `indicadores_kri` (mudança mínima; nada mais na função). **Step 4:** suíte inteira → PASS.
- [ ] **Step 5:** commit `feat(lac-03): ficha do risco grava o limite de alerta numérico`.

### Task 5: Comunicações à CGOV

**Files:** Create `supabase/migrations/20261123003_lac04_comunicacoes_cgov.sql`; Test `supabase/tests/121_lac04_comunicacoes_cgov.test.sql`.

**Produces:** `public.comunicacoes_cgov`, `public.comunicacoes_riscos`, `public.enviar_comunicacao(p jsonb) returns uuid`, `public.registrar_ciencia_comunicacao(p_id uuid, p_observacao text) returns void`, visão `public.comunicacoes_cgov_situacao(…, prazo_dias_uteis, no_prazo, vence_em, situacao)`; FK `alertas_kri.comunicacao_id`.

- [ ] **Step 1: testes que falham:** gestor envia hipótese IV sem risco → ok; hipótese I sem risco → erro "Informe o risco ligado"; `supre = {I}` com hipótese V → erro; comunicação do alerta aberto encerra o alerta (`encerrado_em`, `comunicacao_id`); 2ª comunicação do mesmo alerta → erro "Este alerta já foi comunicado"; ciência futura → erro; fora do prazo grava com `no_prazo = false`; UPDATE da descrição → erro; DELETE → nenhuma linha; gestor da unidade B não lê nem insere na A; AUDIT lê tudo e não insere; CGOV registra ciência; 2ª ciência → erro; gestor chamando `registrar_ciencia_comunicacao` → erro.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** tabelas, CHECKs, RLS, gatilho de imutabilidade, gatilho de encerramento do alerta (SECURITY DEFINER), as duas RPCs, visão, auditoria, `GRANT`/`REVOKE` como nas migrações anteriores.
- [ ] **Step 4:** `npm run db:reset && npm run test:db` → PASS (todos os arquivos).
- [ ] **Step 5:** commit `feat(lac-04): comunicações à CGOV, imutáveis, com ciência da CGOV`.
- [ ] **Step 6:** fim da Fase 1: `/code-review` (medium), correções, PR "Fase 1: Banco do alerta do KRI e das comunicações".

## Fase 2 — Alerta no Monitoramento

### Task 6: Utilitários puros

**Files:** Create `src/utils/limiteAlerta.ts`, `src/utils/diasUteis.ts`, `src/utils/feriadosNacionais.ts`, `src/utils/situacaoKri.ts`; Tests `tests/unit/limiteAlerta.spec.ts`, `tests/unit/diasUteis.spec.ts`, `tests/unit/situacaoKri.spec.ts`.

**Produces:**
- `type OperadorLimite = '>' | '>=' | '<' | '<='`; `passaDoLimite(valor: number, op: OperadorLimite, limite: number): boolean`; `textoLimite(op, valor, unidade?): string` ("menor que 80 %"); `converterLimiteTexto(t: string): { operador: OperadorLimite; valor: number; unidade?: string } | null`.
- `FERIADOS_NACIONAIS: readonly string[]` (ISO); `somarDiasUteis(d: string, n: number, feriados?: ReadonlySet<string>): string`; `diasUteisEntre(a: string, b: string, feriados?): number`.
- `type SituacaoKri = 'vencido' | 'alerta' | 'comunicado' | 'sem_limite' | 'dentro'`; `situacaoKri(kri: IndicadorKri, alerta?: AlertaKri): SituacaoKri`; `ordenarPorUrgencia<T>(itens: T[], situacao: (t: T) => SituacaoKri): T[]` (ordem da lista acima).

- [ ] **Step 1:** testes com os mesmos casos das Tasks 1 a 3 (conversão, prazo de 19/11 e de sábado 21/11 → 04/12) e um teste que lê `supabase/migrations/20261123002_lac03_alerta_kri.sql` e confere que as datas de `FERIADOS_NACIONAIS` são as mesmas da semente (como faz `schemaSql.spec.ts`).
- [ ] **Step 2:** `npx vitest run tests/unit/limiteAlerta.spec.ts tests/unit/diasUteis.spec.ts tests/unit/situacaoKri.spec.ts` → falha. **Step 3:** implementar. **Step 4:** → PASS. **Step 5:** commit `feat(lac-03): regras do alerta e dos dias úteis em utilitários`.

### Task 7: Dados do alerta (tipos, fontes e store)

**Files:** Modify `src/types/radar.types.ts`, `src/services/dados/tipos.ts`, `src/services/dados/conversores.ts`, `src/services/dados/fonteSupabase.ts`, `src/services/dados/fonteDemonstracao.ts`, `src/services/dadosSementeAnexoII.ts`, `src/stores/riscosStore.ts`; Tests `conversores.spec.ts`, `fonteDemonstracao.spec.ts`, `riscosStore.spec.ts`.

**Produces:** `IndicadorKri.limiteOperador?|limiteValor?|limiteUnidade?` (e `limiteAlerta?` = texto antigo); `MedicaoKri.valorNumerico?`; `interface AlertaKri { id; kriId; cienciaEm: string; venceEm: string; diaAtual: number; vencido: boolean; diasUteisVencido: number; encerradoEm?: string; comunicacaoId?: string }`; `FonteDados.listarAlertasKri(): Promise<AlertaKri[]>`; `registrarMedicao` envia `valor_numerico` e não envia `em_alerta`; store expõe `alertasKri` e `alertaAbertoDoKri(kriId)`.

- [ ] **Step 1:** testes: conversão de/para o banco dos campos novos; na demonstração, leitura 60 em "menor que 70" abre alerta com `cienciaEm` = hoje e a 2ª não abre outro; semente com os 4 estados da P-02 (dentro, alerta dia 3, vencido, comunicado) e um "limite a converter".
- [ ] **Step 2–4:** falha → implementar → PASS (`npm test`).
- [ ] **Step 5:** commit `feat(lac-03): alertas do KRI nas fontes de dados e na demonstração`.

### Task 8: Etapa 4 do formulário com limite numérico

**Files:** Modify `src/views/FormularioRiscoView.vue`, `src/utils/formularioRisco.ts`, `src/utils/travaRiscoCritico.ts`; Tests `formularioRisco.spec.ts`, `novoRiscoPagina.spec.ts`, `travaRiscoCritico.spec.ts`.

- [ ] **Step 1:** testes: operador + número + unidade gravam os três campos; a frase "Alerta quando o valor for menor que 80 %" aparece; KRI antigo mostra "Limite a converter: informe o operador e o número" com o texto antigo; `kriCompleto` aceita numérico ou texto antigo (como o banco); risco crítico com KRI novo sem número é travado.
- [ ] **Step 2–4:** falha → implementar (`FormField` lista + número + texto) → PASS.
- [ ] **Step 5:** commit `feat(lac-03): etapa 4 com limite de alerta numérico`.

### Task 9: Monitoramento como na P-02

**Files:** Modify `src/views/MonitoramentoKriPlanoAcaoView.vue`, `src/utils/painelResumo.ts`, `src/views/FichaDetalheBowTieView.vue`; Tests `monitoramentoPagina.spec.ts`, `painelPiloto.spec.ts`, `fichaPagina.spec.ts`.

- [ ] **Step 1:** testes: `StatCard` "Alertas abertos" conta só alertas abertos; filtro Todos · Em alerta · Sem limite · Dentro do limite com contagens; ordem vencido → alerta → comunicado → sem limite → dentro; 10 por página com números; faixa "Em alerta desde dd/mm/aaaa · dia N de 10 dias úteis (vence em dd/mm/aaaa)", vencida em tom perigo, comunicada em tom sucesso; um "Reavaliar" por risco ligado (link à ficha) e um "Comunicar à CGOV" (link `/comunicacoes?alerta=<id>`); AUDIT vê a faixa sem botões; janela de leitura sem a caixa "passou do limite", com mensagem automática nos 3 casos; "Ver detalhes" abre meta, responsável e histórico.
- [ ] **Step 2–4:** falha → implementar com `StatCard`, `SegmentedControl`, `BrMessage`, `BrButton`, `Chip`, `BlocoRecolhivel` (ou `<details>`), `Dialog` → PASS.
- [ ] **Step 5:** commit `feat(lac-03): Monitoramento com alerta, prazo e atalhos (P-02)`.
- [ ] **Step 6:** fim da Fase 2: `npm run test:a11y` (re-medir a etapa 4 e o Monitoramento), `/code-review` (medium), PR "Fase 2: Alerta do KRI no Monitoramento".

## Fase 3 — Tela de Comunicações

### Task 10: Dados das comunicações

**Files:** Create `src/utils/hipotesesComunicacao.ts`; Modify `src/types/radar.types.ts`, `src/services/dados/tipos.ts`, `conversores.ts`, `fonteSupabase.ts`, `fonteDemonstracao.ts`, `src/stores/` (store novo `comunicacoesStore.ts`); Tests `hipotesesComunicacao.spec.ts`, `comunicacoesStore.spec.ts`, `fonteDemonstracao.spec.ts`.

**Produces:** `type HipoteseComunicacao = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'alerta_kri'`; `HIPOTESES: Record<HipoteseComunicacao, { rotulo: string; explicacao: string; exigeRisco: boolean }>`; `interface ComunicacaoCgov { id; unidadeId; hipotese; supre: ('I'|'II'|'III')[]; dataCiencia; comunicadaEm; descricao; providencias?; documentoSei?; alertaId?; riscoIds: string[]; prazoDiasUteis: number; noPrazo: boolean; venceEm: string; situacao: 'nova' | 'ciencia_registrada'; cienciaCgovEm?; observacaoCgov? }`; `FonteDados.listarComunicacoes()`, `enviarComunicacao(d: NovaComunicacao): Promise<string>`, `registrarCiencia(id: string, observacao?: string): Promise<void>`.

- [ ] **Step 1:** testes: rótulos com o texto do UC-16; `exigeRisco` em I, II, III, V e `alerta_kri`; na demonstração, enviar a comunicação do alerta encerra o alerta; 2ª do mesmo alerta é recusada; ciência muda a situação; 2ª ciência recusada.
- [ ] **Step 2–4:** falha → implementar → PASS. **Step 5:** commit `feat(lac-04): comunicações à CGOV nas fontes de dados`.

### Task 11: Página `/comunicacoes` e painel lateral

**Files:** Create `src/views/ComunicacoesView.vue`, `src/components/radar/PainelComunicacao.vue`; Modify `src/router/index.ts`, `src/components/govbr/BrMenu.vue`, o mapa de acesso por perfil (`src/utils/acessoPorPerfil` ou equivalente); Tests `comunicacoesPagina.spec.ts`, `shellPorPerfil.spec.ts`, `guardaRotas.spec.ts`, `acessoPorPerfil.spec.ts`; Playwright: incluir `/comunicacoes` nas combinações de `test:a11y`.

- [ ] **Step 1:** testes: lista com filtro Todas · Novas · Ciência registrada; colunas da P-03 (CGOV com a unidade); "Nova comunicação" abre o painel; hipótese I exige risco, IV não; prazo "dia N de 10" e aviso fora do prazo sem bloquear; `/comunicacoes?alerta=<id>` abre o painel preenchido (hipótese, ciência do alerta, riscos, caixas I–III); enviar duas vezes não duplica (botão desabilitado enquanto grava + recusa do banco); CGOV vê "Registrar ciência"; gestor e AUDIT não; menu "Comunicações" com o número de novas para a CGOV; celular: cartões e painel em tela cheia.
- [ ] **Step 2–4:** falha → implementar → PASS (`npm test`, `npm run build`).
- [ ] **Step 5:** commit `feat(lac-04): tela de Comunicações à CGOV (P-03)`.
- [ ] **Step 6:** fim da Fase 3: `npm run test:a11y`, `/code-review` (medium), PR "Fase 3: Comunicações à CGOV".

## Fase 4 — Documentação

### Task 12: Requisitos, dados, decisões e quadro

**Files:** Modify `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-099, RF-102, RF-107, RF-108, RF-109, RF-111, RF-192: situação e teste), `regras-negocio.md` (RN-083 a RN-086), `rastreabilidade.md`, `casos-de-uso/UC-15…` e `UC-16…` (tirar o "hoje não existe"), `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (LAC-03 e LAC-04), `docs/40-nivel4-dados/` (DER, dicionário: 5 tabelas, 2 visões), `docs/30-nivel3-interface/mapa-telas.md` (rotas novas), matriz de acesso; Create `docs/adr/0021-alerta-do-kri-e-comunicacoes-no-banco.md`; Update `ESTADO-ATUAL.md`, `historico-etapas.md`, [[quadro]] (alerta do KRI e LAC-04 em "Homologação CGOV").

- [ ] **Step 1:** atualizar os documentos; `npx vitest run tests/unit/documentacao.spec.ts` → PASS.
- [ ] **Step 2:** commit `docs(lac-03,lac-04): requisitos, dados, ADR-0021 e quadro`.
- [ ] **Step 3:** Figma: copiar as telas aprovadas para as páginas 📌 Original (Monitoramento, Novo risco e a nova 📌 Original — Comunicações) e travar; bloco "O que você precisa fazer no Figma" se a biblioteca mudar.
- [ ] **Step 4:** PR "Fase 4: Documentação do alerta do KRI e das comunicações".
- [ ] **Step 5 [AUTORIZAÇÃO]:** aplicar `20261123002` e `20261123003` na nuvem do piloto, uma por vez, com o registro no [[guia-supabase-nuvem]].
