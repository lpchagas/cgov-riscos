# LAC-13 — Trava do "Aceitar" e ação obrigatória no risco crítico: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir que um risco crítico (`statusCritico` `'sim'` ou `'pendente_dar'`) chegue à validação, à homologação ou à aprovação com a estratégia "Aceitar" ou sem ação de tratamento, por qualquer caminho: formulário, importador, chamada direta ao banco ou mudança da DAR.

**Architecture:** A regra tem uma versão em TypeScript (`src/utils/travaRiscoCritico.ts`), usada pelo formulário, pelo importador e pela fonte de demonstração, e uma versão no banco (`public.fn_trava_risco_critico`). No banco, as quatro funções públicas do fluxo (`enviar_para_validacao`, `validar_risco`, `homologar_risco` e `salvar_ficha_risco`) ganham um **envoltório**: a original é renomeada para `fn_base_*` e perde o `GRANT`; a nova, com o mesmo nome e a mesma assinatura, chama a base e confere a trava sobre a linha que a base devolveu. Se a ficha não passa, ela levanta a exceção, e a transação inteira é desfeita. Só a reavaliação da DAR (`fn_dar_reavaliar_aprovados`) é reescrita, porque nela a trava muda o destino do risco (`devolvido`).

**Tech Stack:** Vue 3 + TypeScript, Vitest + @vue/test-utils, PostgreSQL/plpgsql (Supabase), pgTAP (`npm run test:db`).

**Spec:** [[2026-11-22-lac-13-aceitar-risco-critico-design]] (`docs/superpowers/specs/2026-11-22-lac-13-aceitar-risco-critico-design.md`)

## Global Constraints

- Para esta trava, "risco crítico" é `status_critico IN ('sim', 'pendente_dar')`. A ficha passa na trava quando o risco não é crítico, ou quando `estrategia_principal <> 'Aceitar'` **e** existe pelo menos uma ação em `respostas_tratamento` com `estrategia <> 'Aceitar'`. A estratégia da ação não precisa ser igual à principal.
- Rascunho, `devolvido` e `preliminar_cgov` continuam livres para gravar. Devolver continua sempre possível.
- Não tocar em `src/utils/calculadoraRiscoRadar.ts`, em `trigger_calcular_risco_radar` nem na RLS. Só **uma** migração nova: `supabase/migrations/20261122002_lac13_trava_aceitar_critico.sql`.
- Nada na nuvem sem **[AUTORIZAÇÃO]** a cada passo (Tarefa 6). Nunca abrir `_temp/`.
- Comentários didáticos em português do Brasil. "Crítico" só como fora da DAR (nunca a faixa 18 a 25, que é **Extremo**). Nunca "PGR" para o Plano de Gestão de Riscos.
- Commit por tarefa, `tipo(lac-13): resumo` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O hook roda `vue-tsc` + `vitest`, mas **não** roda o pgTAP: na Tarefa 4, rode `npm run test:db` antes do commit (o banco local precisa estar no ar com `npm run db:reset`).
- Revisão: tarefas 1 a 5, uma revisão completa por tarefa (a 4 é banco e fluxo, revisão completa sempre); tarefa 7 (docs e Figma), revisor `sonnet`.

**Texto fixo** (o mesmo no front e no banco; o dicionário de `errosBanco.ts` reconhece o trecho em negrito):

- Banco: `RADAR: o risco <código> **é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento**: <motivo>.` O `<motivo>` é `a estratégia "Aceitar" não é permitida` ou `falta uma ação de tratamento (5W2H)`. Em `validar_risco` e `homologar_risco`, acrescentar ` Devolva a ficha à unidade para ajuste.`
- Frase mostrada ao usuário (`errosBanco.ts` e a demonstração): `Risco crítico (fora do apetite da DAR ou com DAR pendente) precisa de tratamento: escolha Mitigar, Compartilhar ou Evitar e inclua pelo menos uma ação 5W2H na etapa 4. Se a ficha estiver em validação ou homologação, devolva-a à unidade.`
- Ajuda no formulário (`'sim'`): `Este risco está fora do apetite da DAR. Pela Metodologia (4.5 e Anexo III), ele precisa de tratamento: escolha Mitigar, Compartilhar ou Evitar e descreva a ação.` Para `'pendente_dar'`, trocar a primeira frase por `A categoria deste risco ainda não tem apetite declarado na DAR, e o RADAR o trata como crítico.`
- Rótulo da opção desabilitada: `Aceitar — indisponível: risco crítico precisa de tratamento`.

## Review Focus

1. **Risco antigo aberto para edição com "Aceitar" e crítico:** a etapa 4 abre com o erro no campo da estratégia, sem trocar o valor sozinha, e "Salvar alterações" não grava (teste na Tarefa 2).
2. **A etapa 3 muda depois da etapa 4:** o gestor escolhe "Aceitar" com risco Baixo, volta, sobe P e I até o residual ficar Alto e tenta avançar: o erro aparece na etapa 4 (teste na Tarefa 2).
3. **DAR muda com vários aprovados na categoria:** um com "Aceitar" vai para `devolvido`, um com Mitigar + ação vai para a homologação, e um de residual Baixo fica aprovado. A mudança da DAR **termina** sem exceção (teste pgTAP na Tarefa 4).
4. **Ficha que já estava em validação antes da migração**, crítica e com "Aceitar": validar é recusado com a mensagem, e devolver funciona (teste pgTAP na Tarefa 4).
5. **Chamada direta a `fn_base_*`:** `authenticated` não pode executá-la (teste pgTAP de privilégio na Tarefa 4).

---

### Task 1: A regra em TypeScript

**Files:**
- Create: `src/utils/travaRiscoCritico.ts`
- Test: `tests/unit/travaRiscoCritico.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MotivoTrava = 'aceitar_em_critico' | 'sem_acao_em_critico';
  export type ResultadoTrava = { ok: true } | { ok: false; motivo: MotivoTrava };
  export function exigeTratamento(statusCritico: StatusCriticidadeDAR): boolean; // 'sim' | 'pendente_dar'
  export function verificarTravaRiscoCritico(e: {
    statusCritico: StatusCriticidadeDAR;
    estrategiaPrincipal: EstrategiaTratamento;
    estrategiasDasAcoes: EstrategiaTratamento[];
  }): ResultadoTrava;
  export const MENSAGEM_TRAVA_CRITICO: string;   // a "frase mostrada ao usuário" das Global Constraints
  export function ajudaTravaCritico(statusCritico: StatusCriticidadeDAR): string | null; // texto de ajuda do formulário; null se não exige
  ```

- [ ] **Step 1: Testes que falham**

```ts
describe('trava do risco crítico (LAC-13)', () => {
  it.each([['sim', true], ['pendente_dar', true], ['nao', false]] as const)('exigeTratamento(%s) = %s', (s, esperado) => {
    expect(exigeTratamento(s)).toBe(esperado);
  });
  it('não crítico com Aceitar e sem ação passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'nao', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: [] })).toEqual({ ok: true });
  });
  it('crítico com Aceitar é recusado antes de olhar as ações', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Aceitar', estrategiasDasAcoes: ['Mitigar'] }))
      .toEqual({ ok: false, motivo: 'aceitar_em_critico' });
  });
  it('pendente de DAR com Mitigar e sem ação é recusado', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'pendente_dar', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: [] }))
      .toEqual({ ok: false, motivo: 'sem_acao_em_critico' });
  });
  it('ação só com Aceitar não conta como tratamento', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Mitigar', estrategiasDasAcoes: ['Aceitar'] }).ok).toBe(false);
  });
  it('crítico com Compartilhar e uma ação Evitar passa', () => {
    expect(verificarTravaRiscoCritico({ statusCritico: 'sim', estrategiaPrincipal: 'Compartilhar', estrategiasDasAcoes: ['Evitar'] })).toEqual({ ok: true });
  });
  it('ajuda: texto de sim, de pendente e null para não crítico', () => {
    expect(ajudaTravaCritico('sim')).toMatch(/^Este risco está fora do apetite da DAR\./);
    expect(ajudaTravaCritico('pendente_dar')).toMatch(/^A categoria deste risco ainda não tem apetite declarado na DAR/);
    expect(ajudaTravaCritico('nao')).toBeNull();
  });
  it('nenhum texto chama o risco de PGR nem usa "Crítico" para a faixa 18 a 25', () => {
    for (const t of [MENSAGEM_TRAVA_CRITICO, ajudaTravaCritico('sim')!, ajudaTravaCritico('pendente_dar')!]) {
      expect(t).not.toMatch(/PGR|18 a 25|Extremo/);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/travaRiscoCritico.spec.ts`. Esperado: FAIL, porque o módulo não existe.
- [ ] **Step 3: Implementar** `src/utils/travaRiscoCritico.ts` com as assinaturas acima e os textos literais das Global Constraints. Importar `StatusCriticidadeDAR` e `EstrategiaTratamento` de `src/types/radar.types.ts`. O comentário do topo cita Metodologia 4.5 e 4.5.1, Anexo III, RN-019, RN-020, RF-049 e RF-050.
- [ ] **Step 4: Rodar e ver passar.** Mesmo comando. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(lac-13): regra da trava do risco crítico em TypeScript`.

---

### Task 2: Formulário (etapa 4)

**Files:**
- Modify: `src/utils/formularioRisco.ts:107` (`validarEtapa`) e `:144-150` (regra da ação)
- Modify: `src/views/FormularioRiscoView.vue:241-245` (`ESTRATEGIAS`), `:548-552` (lista e bloco da ação), `:291` e `:342` (chamadas a `validarEtapa`)
- Test: `tests/unit/novoRiscoPagina.spec.ts` (e o spec de `formularioRisco`, se houver; senão `tests/unit/travaRiscoCritico.spec.ts` ganha um `describe('validarEtapa')`)

**Interfaces:**
- Consumes: `exigeTratamento`, `verificarTravaRiscoCritico` e `ajudaTravaCritico` (Tarefa 1).
- Produces: `validarEtapa(etapa: number, d: DadosNovoRisco, categorias: CategoriaRisco[], statusCritico?: StatusCriticidadeDAR): ErrosEtapa`. Sem `statusCritico`, o comportamento é o de hoje.

- [ ] **Step 1: Testes que falham**
  - `validarEtapa(4, {…estrategia: 'Aceitar', ação vazia}, cats, 'sim')` → `erros.estrategia` igual a `'Risco crítico não pode ser aceito: escolha Mitigar, Compartilhar ou Evitar (Metodologia 4.5 e Anexo III).'`.
  - O mesmo com `'pendente_dar'` → mesmo erro.
  - `validarEtapa(4, {…estrategia: 'Aceitar', ação vazia}, cats, 'nao')` → `{}` (sem regressão).
  - `validarEtapa(4, {…estrategia: 'Mitigar', ação vazia}, cats, 'sim')` → `acaoOQue`, `acaoQuem` e `acaoPrazo` com as mensagens de hoje.
  - Página (`novoRiscoPagina.spec.ts`): com P = 5, I = 5 e controle Inexistente (residual 25, Extremo, crítico), na etapa 4 a `<option value="Aceitar">` tem `disabled` e o rótulo da opção desabilitada. A lista tem `aria-describedby` apontando para um elemento com o texto de `ajudaTravaCritico('sim')`, e o bloco da ação 5W2H está visível.
  - Página, Review Focus 1: abrir para edição uma ficha crítica com `estrategiaPrincipal: 'Aceitar'` e clicar "Salvar alterações" → o erro do campo estratégia aparece, `salvarFicha` não é chamado, e o valor da lista continua `'Aceitar'`.
  - Página, Review Focus 2: P = 1 e I = 1, etapa 4 com "Aceitar", voltar à etapa 3, P = 5 e I = 5, ir à etapa 4 e clicar "Continuar" (ou "Salvar e enviar") → erro na estratégia.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/novoRiscoPagina.spec.ts tests/unit/travaRiscoCritico.spec.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Em `validarEtapa`, quando `statusCritico` exige tratamento: "Aceitar" gera `erros.estrategia`, e a ação passa a ser obrigatória. Na view, passar `calculo.value?.statusCritico` nas duas chamadas. A opção "Aceitar" fica com `:disabled` e com o rótulo trocado quando `exigeTratamento`. O texto de ajuda fica num `<p :id>` ligado por `aria-describedby`. O bloco da ação aparece quando `d.estrategia !== 'Aceitar' || exige`. **Não** trocar o valor de `d.estrategia` sozinho.
- [ ] **Step 4: Rodar e ver passar.** Mesmo comando, mais `npx vitest run` completo. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(lac-13): formulário recusa Aceitar e exige ação no risco crítico`.

---

### Task 3: Importador

**Files:**
- Modify: `src/utils/importadorSkillMarkdown.ts:367-412` (depois do cálculo, antes do `fichas.push`)
- Test: `tests/unit/importadorSkillMarkdown.spec.ts`

**Interfaces:**
- Consumes: `exigeTratamento` (Tarefa 1).

- [ ] **Step 1: Testes que falham**
  - Tabela com 3 linhas: R-01 crítica (P = 5, I = 5, Inexistente) com "Aceitar"; R-02 crítica com "Mitigar"; R-03 Baixo (P = 1, I = 1) com "Aceitar". Resultado: `fichas.map(f => f.codigoRadar)` é `['R-02', 'R-03']`, e `erros` contém exatamente uma linha que começa com `Linha R-01: risco crítico (residual 25` e contém `não pode ter a estratégia "Aceitar"; escolha Mitigar, Compartilhar ou Evitar na tabela da skill.`.
  - Linha de residual Médio com apetite `pendente` (coluna 13) e "Aceitar" → recusada (pendente de DAR também trava).
  - Variações de grafia: "aceitar", " Aceitar " e "Aceitar o risco" em linha crítica → recusadas (passam por `normalizarEstrategia`).
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Calcular `normalizarEstrategia(estrategiaTexto)` uma vez. Se for `'Aceitar'` e `exigeTratamento(calculo.statusCritico)`: `erros.push(\`Linha ${codigoRadar}: risco crítico (residual ${nivel}, ${classe}, ${fora do apetite da DAR | com DAR pendente}) não pode ter a estratégia "Aceitar"; escolha Mitigar, Compartilhar ou Evitar na tabela da skill.\`)` e `continue`. Formatar o residual como nas outras mensagens do importador (vírgula decimal, se for o padrão de lá).
- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(lac-13): importador recusa linha crítica com Aceitar`.

---

### Task 4: Banco — migração, testes pgTAP e mensagem no front

**Files:**
- Create: `supabase/migrations/20261122002_lac13_trava_aceitar_critico.sql`
- Create: `supabase/tests/100_lac13_trava_critico.test.sql`
- Modify: `src/services/dados/errosBanco.ts` (entrada no `DICIONARIO`, junto ao bloco da 20261122001)
- Test: `tests/unit/errosBanco.spec.ts`

**Interfaces:**
- Produces (SQL):
  - `public.fn_trava_risco_critico(p_risco uuid) RETURNS text`: `NULL` se passa; senão `'a estratégia "Aceitar" não é permitida'` ou `'falta uma ação de tratamento (5W2H)'`, nessa ordem de precedência. `STABLE SECURITY DEFINER SET search_path = ''`. `REVOKE EXECUTE … FROM public, anon, authenticated`. Lê `status_critico` da linha como ela está: quem chama garante que a criticidade é a atual.
  - `public.fn_base_enviar_para_validacao(uuid)`, `public.fn_base_validar_risco(uuid, text)`, `public.fn_base_homologar_risco(uuid, text)` e `public.fn_base_salvar_ficha_risco(jsonb)`: são as originais, com `ALTER FUNCTION … RENAME TO`. `REVOKE EXECUTE … FROM public, anon, authenticated`.
  - Envoltórios com os nomes, as assinaturas e os tipos de retorno originais (`SECURITY DEFINER SET search_path = ''`, mesmos `REVOKE` e `GRANT … TO authenticated` de hoje):
    - `enviar_para_validacao`, `validar_risco` e `homologar_risco`: `v := fn_base_…(…)`; `v_motivo := fn_trava_risco_critico(v.id)`; se não for nulo, `RAISE EXCEPTION 'RADAR: o risco % é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: %.'` (com ` Devolva a ficha à unidade para ajuste.` em validar e homologar), `USING ERRCODE = 'check_violation'`. Retornar `v`.
    - `salvar_ficha_risco(ficha jsonb)`: tem o mesmo retorno da base, `RETURNS TABLE (id uuid, codigo_radar text)` (`20261117001:401`). Ela chama a base, lê o `id` devolvido e relê o risco gravado em `public.riscos`. Só confere a trava se `status_fluxo NOT IN ('rascunho', 'devolvido', 'preliminar_cgov')`. Depois, devolve a mesma linha que recebeu.
  - `fn_dar_reavaliar_aprovados()`: `CREATE OR REPLACE` a partir de `20261116004`, com uma mudança no laço. Depois do recálculo, **primeiro** `IF fn_trava_risco_critico(v_novo.id) IS NOT NULL`: `fn_fluxo_mudar_estado(v_novo.id, 'devolvido')` + `fn_fluxo_registrar_historico(v_novo.id, 'reabertura_nota', 'devolvido_mudanca_dar', <texto>)`. **Senão**, o `IF v_exige AND NOT v_exigia` de hoje. O `<texto>` é `format('DAR alterada: categoria %s com apetite %s → %s. O risco aprovado (residual %s, %s) passou a Risco Crítico e está com a estratégia "Aceitar" ou sem ação de tratamento, que a Metodologia não permite para risco crítico. Voltou para a unidade escolher outra estratégia e incluir a ação.', …)`.
- Produces (TS): entrada no `DICIONARIO` de `errosBanco.ts` com o trecho `'é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento'` → `MENSAGEM_TRAVA_CRITICO` (importada da Tarefa 1), tipo `'validacao'`.

- [ ] **Step 1: Conferências antes de escrever** (registrar o resultado no cabeçalho da migração):
  - nenhuma migração depois de `20261116001` redefine `enviar_para_validacao` ou `validar_risco`, e nenhuma depois de `20261115004` redefine `homologar_risco` (`grep -n "FUNCTION public.<nome>" supabase/migrations/*.sql`);
  - nenhuma função chama essas quatro pelo nome (`grep -rn "public.validar_risco(" supabase/migrations`), porque um chamador interno passaria a cair no envoltório;
  - a passagem `aprovado → devolvido` por `fn_fluxo_mudar_estado` dentro do gatilho não é barrada por `fn_trava_reabertura_risco` nem por `trg_riscos_status_fluxo_so_pelo_fluxo`. Se for barrada, abrir a passagem só com o sinal `radar.fluxo` já usado e documentar.
- [ ] **Step 2: Testes pgTAP que falham** em `100_lac13_trava_critico.test.sql`. Seguir o padrão de `073_dar_reavalia.test.sql` (`begin`, `\ir ajudantes.psql`, usuários da semente, `rollback`). Casos, cada um com `throws_ok(..., '23514', <mensagem exata>)` ou `lives_ok`/`is`:
  1. Rascunho crítico com "Aceitar", salvo por `salvar_ficha_risco`: `lives_ok`.
  2. `enviar_para_validacao` dele: `throws_ok` com o motivo "Aceitar".
  3. Rascunho crítico com Mitigar e sem resposta: `throws_ok` com o motivo "falta uma ação".
  4. Crítico com Mitigar + 1 resposta Mitigar: envio `lives_ok`, e o estado vira `em_validacao_cg`.
  5. Ficha posta em `em_validacao_cg` com "Aceitar" pelo administrador (simula a ficha anterior à migração, via `fn_fluxo_mudar_estado`): `validar_risco` → `throws_ok` com `Devolva a ficha`; `devolver_risco` → `lives_ok`.
  6. O mesmo em `em_homologacao_dir`: `homologar_risco` → `throws_ok`.
  7. Aprovado crítico editado por `salvar_ficha_risco` para "Aceitar": `throws_ok`, e a ficha continua aprovada com a estratégia antiga.
  8. DAR (Review Focus 3): três aprovados de residual Médio na mesma categoria com apetite `moderado` (A: "Aceitar" sem ação; B: Mitigar + ação; C: residual Baixo com "Aceitar"). Mudar o apetite para `baixo`: `lives_ok`; A fica `devolvido` com histórico `devolvido_mudanca_dar`; B vai para `em_homologacao_dir` com `reaberto_mudanca_dar`; C continua `aprovado`.
  9. DAR para `pendente_dar`: aprovado Médio com "Aceitar" → `devolvido`; aprovado Médio com Mitigar + ação → continua `aprovado` (caminho de hoje).
  10. Privilégio: `has_function_privilege('authenticated', 'public.fn_base_validar_risco(uuid, text)', 'execute')` é falso, e o mesmo vale para as outras três bases e para `fn_trava_risco_critico`; `has_function_privilege('authenticated', 'public.validar_risco(uuid, text)', 'execute')` é verdadeiro.
  11. Regressão: `npm run test:db` inteiro continua passando (os testes 050, 070, 073, 080 e 081 usam essas funções).
- [ ] **Step 3: Rodar e ver falhar.** `npm run db:reset && npm run test:db`. Esperado: FAIL no 100, porque a migração não existe.
- [ ] **Step 4: Escrever a migração.** Cabeçalho didático como o das outras migrações: o porquê (LAC-13, RN-019 e RN-020), o desenho do envoltório, o que **não** muda e o resultado das conferências do Step 1.
- [ ] **Step 5: Teste unitário de `errosBanco`:** `traduzirErroBanco({ code: '23514', message: 'RADAR: o risco RADAR-2026-004 é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: a estratégia "Aceitar" não é permitida.' }).message` igual a `MENSAGEM_TRAVA_CRITICO`. Implementar a entrada no dicionário.
- [ ] **Step 6: Rodar e ver passar.** `npm run db:reset && npm run test:db` e `npx vitest run tests/unit/errosBanco.spec.ts`. Esperado: tudo PASS.
- [ ] **Step 7: Commit** `feat(lac-13): banco trava Aceitar e exige ação no risco crítico`.

---

### Task 5: Fonte de demonstração

**Files:**
- Modify: `src/services/dados/fonteDemonstracao.ts` (`salvarFicha` :330, `enviar` :413, `validar` :444, `homologar` :463, `alterarApetite` :557)
- Test: `tests/unit/fonteDemonstracao.spec.ts`, `tests/unit/dadosSementeConsistencia.spec.ts`

**Interfaces:**
- Consumes: `verificarTravaRiscoCritico` (Tarefa 1). O motivo da exceção sai por `recusar(<trecho do banco>)`, que já traduz pelo dicionário da Tarefa 4 para `MENSAGEM_TRAVA_CRITICO`.
- Produces: função local `travaDaFicha(r: FichaRisco): ResultadoTrava`, que monta a entrada a partir de `r.statusCritico`, `r.estrategiaPrincipal` e `r.respostasTratamento.map(a => a.estrategia)`.

- [ ] **Step 1: Testes que falham** (espelham os casos 2, 3, 4, 5, 6, 7, 8 e 9 da Tarefa 4):
  - `enviar` de rascunho crítico com "Aceitar" → rejeita com `MENSAGEM_TRAVA_CRITICO`; com Mitigar + ação → `em_validacao_cg`.
  - `validar` e `homologar` de ficha que não passa → rejeitam; `devolver` funciona.
  - `salvarFicha` de ficha aprovada crítica com "Aceitar" → rejeita, e a ficha guardada não muda.
  - `alterarApetite(cat, 'baixo')` com A, B e C da Tarefa 4, caso 8 → A `devolvido` (com histórico `devolvido_mudanca_dar`), B continua como a demonstração faz hoje e C `aprovado`.
  - `dadosSementeConsistencia`: nenhuma semente aprovada, em validação ou em homologação falha na trava.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/unit/fonteDemonstracao.spec.ts tests/unit/dadosSementeConsistencia.spec.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Mesma ordem do banco: a ação muda o estado e, se a ficha não passa, nada muda e a exceção é lançada (conferir a trava **antes** de mutar o objeto em memória). Em `alterarApetite`, depois do recálculo, um aprovado que não passa vai para `devolvido`. Corrigir as sementes que falharem no teste de consistência.
- [ ] **Step 4: Rodar e ver passar.** Mesmo comando, mais `npx vitest run`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(lac-13): demonstração aplica a trava do risco crítico`.

---

### Task 6: Nuvem do piloto **[AUTORIZAÇÃO]** (pare e peça a cada passo)

**Files:**
- Modify: `docs/02-arquitetura-cgti/guia-supabase-nuvem.md`

- [ ] **Step 1 [AUTORIZAÇÃO]: Contagem só de leitura**, antes de aplicar. Só números, sem nenhum dado pessoal nem descrição de risco:

```sql
select r.status_fluxo,
       count(*) filter (where r.estrategia_principal = 'Aceitar') as com_aceitar,
       count(*) filter (where not exists (select 1 from respostas_tratamento a
                                           where a.risco_id = r.id and a.estrategia <> 'Aceitar')) as sem_acao
  from riscos r
 where r.status_critico in ('sim', 'pendente_dar')
 group by r.status_fluxo order by 1;
```

- [ ] **Step 2: Registrar no guia** o resultado (só as contagens) e, se houver aprovados ou fichas em validação ou homologação na contagem, a orientação: a CGOV decide caso a caso. A migração não muda nada sozinha; a validação e a homologação dessas fichas passam a exigir a devolução.
- [ ] **Step 3 [AUTORIZAÇÃO]: Aplicar a migração** `20261122002` na nuvem. Depois, conferir com `list_migrations`.
- [ ] **Step 4: Commit** `docs(nuvem): migração da LAC-13 aplicada no piloto`.

---

### Task 7: Documentação e Figma

**Files:**
- Modify: `docs/20-nivel2-requisitos/requisitos-funcionais.md` (RF-049, RF-050: estado "implementado (LAC-13)"), `regras-negocio.md` (RN-019, RN-020: coluna de implementação), `rastreabilidade.md` (linha de RN-019 e RN-020), `casos-de-uso/UC-07-…md` (3a) e `casos-de-uso/UC-13-…md` (5b)
- Modify: `docs/10-nivel1-negocio/lacunas-norma-sistema.md` (LAC-13: resolvida, com a data), `docs/10-nivel1-negocio/fluxos/FS-02-analise-ato-por-skills.md` (col. 15 e lista de lacunas), `docs/40-nivel4-dados/mer-conceitual.md` (regra 11) e `normalizacao.md` (:372)
- Modify: `docs/90-kanban/quadro.md` (cartão da LAC-13 para "Homologação CGOV"), `docs/90-kanban/analise-lacunas-codigo-requisitos.md` (:51), `docs/00-memoria/ESTADO-ATUAL.md`
- Figma: na cópia ✏️ Trabalho da tela do formulário, etapa 4, no arquivo `RADAR — Painel` (fileKey `T1AuuL9jEfqkP7uoAPTUFF`), mostrar a opção desabilitada e o texto de ajuda, pelo [[manual-fluxo-figma-vscode]] (skills `figma:figma-use` e `figma:figma-generate-design`). A tela 📌 Original fica travada.

- [ ] **Step 1: Atualizar os documentos** citando o arquivo e a função de cada camada (`travaRiscoCritico.ts`, `fn_trava_risco_critico` e os envoltórios da migração `20261122002`). Registrar as decisões do responsável (Pendente de DAR trava; DAR alterada devolve à unidade).
- [ ] **Step 2: Rodar** `npx vitest run tests/unit/documentacao.spec.ts`. Esperado: PASS (siglas, IDs e seções).
- [ ] **Step 3: Figma.** Antes, rodar `search_design_system` para saber se algum componente da biblioteca muda. Se nenhum mudar, dizer que não é preciso republicar a biblioteca. Se mudar, terminar a resposta com o bloco "O que você precisa fazer no Figma" e a tabela de 4 colunas (`CLAUDE.md`).
- [ ] **Step 4: Commit** `docs(lac-13): trava do Aceitar no risco crítico documentada`.
