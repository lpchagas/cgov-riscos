# Sistema Web RADAR (`cgov-riscos`) — Plano de Implementação Detalhado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir do zero, em `/home/lpchagas/projetos/cgov-riscos`, o protótipo funcional completo do Sistema Web de Gestão de Riscos do ICMBio (**RADAR** — Regime B: Minutas SEI `024241420` e `024421455`), integrado ao Segundo Cérebro no Obsidian, com interface `@govbr-ds/core` em Vue.js 3, banco de dados PostgreSQL/Supabase, importador de tabelas Markdown da skill `cgov-gestao-riscos-v4`, fluxo de validação em 1 clique e empacotamento Docker para avaliação da CGTI/ICMBio.

**Architecture:** Aplicação Single-Page Application (SPA) em **Vue 3 (Composition API `<script setup>`) + TypeScript + Pinia + Vue Router** estilizada com o pacote CSS oficial **`@govbr-ds/core`** (Abordagem 1). As regras matemáticas e travas normativas da Metodologia RADAR (Matriz Assimétrica do Quadro 7, Fatores de Eficácia do Quadro 6 com trava de evidência, Teste de Integridade do Programa Integra+ e Avaliação de Apetite da DAR) vivem em módulos puros TypeScript (para resposta instantânea na tela e testes automatizados) e são espelhadas em funções/triggers SQL no **PostgreSQL (Supabase)**. Para garantir que o protótipo funcione em demonstrações à CGTI mesmo sem conexão externa, a camada de dados (`riscosStore`) opera com sincronização Supabase e *fallback* local pré-carregado com o Caso de Controle do Anexo II.

**Tech Stack:** Vue.js 3.5+, Vite 6+, TypeScript 5.6+, Pinia 2+, Vue Router 4+, `@govbr-ds/core` 3.7+, `@fortawesome/fontawesome-free`, `@supabase/supabase-js` 2+, Vitest (testes unitários), PostgreSQL 15+ (Supabase), Docker + Nginx Alpine (containerização para CGTI) e Vercel.

**Spec:** `/home/lpchagas/projetos/cgov-riscos/docs/superpowers/specs/2026-11-09-cgov-riscos-radar-design.md` (Versão 2.0)

---

## Global Constraints (Regras Invioláveis do Projeto)

- **Diretório raiz do código e cofre Obsidian:** `/home/lpchagas/projetos/cgov-riscos`.
- **Didática e Acessibilidade Obrigatórias:** Todo arquivo de código (`.ts`, `.vue`, `.sql`, `Dockerfile`) deve conter comentários explicativos em **português do Brasil**, sem jargões técnicos sem explicação, voltados a um iniciante em programação e aos analistas da CGOV/CGTI.
- **Disciplina de Siglas da CGOV:** É **proibido** usar a sigla `"PGR"` para se referir a riscos na interface, no código ou na documentação (`PGR` no ICMBio é o *Programa de Gestão para Resultados e Inovação*, Portaria 1.572/2023). Escreva sempre **Plano de Gestão de Riscos** por extenso e use **DAR** para a *Declaração de Apetite a Riscos*.
- **Proibição de Multiplicação Simétrica:** O nível do Risco Inerente nunca é obtido por `Probabilidade × Impacto`; deve ser lido exclusivamente da **Matriz Assimétrica de 25 células (Quadro 7 da Metodologia SEI 024421455)**.
- **Nomenclatura Oficial de Níveis e Estratégias:** Os níveis de classificação (Quadro 8) são estritamente `'Baixo' | 'Médio' | 'Alto' | 'Extremo'` (nunca chamar o nível 18–25 de "Crítico"; **Risco Crítico** é o risco cujo residual fica fora do apetite da DAR). As estratégias de tratamento (Tabela 8) são estritamente `'Mitigar' | 'Compartilhar' | 'Evitar' | 'Aceitar'`.
- **Sem Arredondamento Prévio nas Faixas:** O Risco Residual (`Inerente × Fator`) é classificado pelo seu valor decimal exato antes de qualquer arredondamento para inteiro (`10.2` é `> 10`, logo `'Alto'`; `17.1` é `> 17`, logo `'Extremo'`).

---

## Review Focus (Casos de Borda e Modos de Falha Críticos Testados)

1. **Valores decimais de fronteira no Risco Residual (`10.2` e `17.1`):** Quando `nivelInerente = 17` e `fatorControle = 0.6`, o residual é `10.2` — deve ser classificado como `'Alto'` (e não arredondado para `10` `'Médio'`). Quando `nivelInerente = 19` e `fatorControle = 0.9`, o residual é `17.1` — deve ser classificado como `'Extremo'` (Task 2).
2. **Controle existente cadastrado sem evidência de funcionamento:** Quando `possuiEvidenciaComprovada = false` e o usuário tenta escolher eficácia `'Forte'` (`0.5`), `'Satisfatório'` (`0.6`) ou `'Mediano'` (`0.75`), o sistema deve forçar `fatorFinal = 0.9` (`'Fraco'`) e retornar um aviso explicativo claro (Task 2).
3. **Tentativa de usar categoria mista `"Operacional com interface de Integridade"` ou omitir justificativa no Teste de Integridade:** Se `testeIntegridadeAplicavel = true` e a categoria escolhida for `'Operacional'` sem `justificativaNaoIntegridade`, ou se uma tabela Markdown importada trouxer `"Operacional com interface de Integridade"`, o validador/importador deve rejeitar ou sinalizar a exigência da Portaria nº 253/2026 — Integra+ (Tasks 2 e 3).
4. **Categoria com DAR ainda não aprovada pelo CIG (`apetite_declarado = 'pendente_dar'`) e Risco Residual `'Médio'`:** O sistema não pode dizer simplesmente `'sim'` ou `'nao'` para `statusCritico`; deve retornar `'pendente_dar'` enquanto classifica `'Alto'` e `'Extremo'` como `'sim'` (Task 2).
5. **Reabertura de Risco já Aprovado vs. Monitoramento Contínuo:** Lançar uma medição de KRI (`medicoes_kri`) ou atualizar o andamento de uma ação 5W2H (`status_execucao`) em um risco `'aprovado'` mantém `status_fluxo = 'aprovado'`, mas alterar a nota de probabilidade, impacto ou fator de controle reabre o status para `'em_validacao_cg'` (Task 7).

---

## Mapa de Arquivos a Criar (`File Structure`)

```text
/home/lpchagas/projetos/cgov-riscos/
├── CLAUDE.md                                      # Guia de contexto para Claude Code
├── AGENTS.md                                      # Guia de contexto para Google Antigravity
├── .obsidian/
│   └── app.json                                   # Filtro do Obsidian para ignorar node_modules/dist
├── docs/
│   ├── 00-memoria/
│   │   ├── MOC-Radar.md                           # Índice Central (Segundo Cérebro)
│   │   ├── ESTADO-ATUAL.md                        # Memória de sessão
│   │   └── GLOSSARIO-ACESSIVEL.md                 # Dicionário sem jargões + siglas da CGOV
│   ├── 01-normativos/
│   │   └── matriz-regras-regime-b.md              # Quadros 1 a 8 + Tabela 25x5 da Skill
│   ├── 02-arquitetura-cgti/
│   │   └── guia-docker-cgti.md                    # Dossiê técnico para a CGTI/ICMBio
│   └── 03-caderno-aprendizado/
│       ├── 01-como-funciona-o-vue3.md             # Aula 1: Componentes e Reatividade
│       ├── 02-entendendo-o-supabase-sql.md        # Aula 2: Tabelas, FKs e RLS no PostgreSQL
│       └── 03-empacotando-com-docker.md           # Aula 3: Como funciona o Container Docker
├── supabase/
│   ├── migrations/
│   │   ├── 20261109001_schema_radar.sql           # Tabelas, Funções SQL Quadro 6/7 e Triggers
│   │   └── 20261109002_rls_policies.sql           # Segurança por linha (RLS)
│   └── seed.sql                                   # 8 Categorias, Unidades (com CGs) e Caso Anexo II
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── vercel.json
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/
│   │   └── main.css                               # Importação do @govbr-ds/core + estilos do Heatmap
│   ├── types/
│   │   └── radar.types.ts                         # Todos os tipos e contratos de dados comentados
│   ├── utils/
│   │   ├── calculadoraRiscoRadar.ts               # Regras matemáticas Quadros 4 a 8 + Integra+ + DAR
│   │   └── importadorSkillMarkdown.ts             # Leitor de tabelas Markdown da skill cgov-gestao-riscos-v4
│   ├── services/
│   │   ├── dadosSementeAnexoII.ts                 # Dados iniciais (Unidades, 8 Categorias, Caso Anexo II)
│   │   └── supabase.ts                            # Cliente Supabase com fallback local seguro
│   ├── stores/
│   │   ├── authStore.ts                           # Estado do usuário logado e simulador de perfil
│   │   └── riscosStore.ts                         # CRUD de riscos, fluxo 1-clique, KRIs e importação
│   ├── router/
│   │   └── index.ts                               # Rotas das telas da aplicação
│   ├── components/
│   │   ├── govbr/
│   │   │   ├── BrHeader.vue                       # Cabeçalho Padrão Gov.br + Seletor de Perfil Didático
│   │   │   ├── BrButton.vue                       # Botão oficial br-button
│   │   │   ├── BrCard.vue                         # Card oficial br-card
│   │   │   └── BrBadge.vue                        # Etiqueta de cor oficial br-tag
│   │   └── radar/
│   │       ├── MemoriaCalculoBar.vue              # Barra visual "Mostre a Conta" (§5 da Skill)
│   │       └── MatrizCalorAssimetrica.vue         # Heatmap interativo 5x5 com os valores do Quadro 7
│   └── views/
│       ├── PainelConsolidadoCgovView.vue          # Painel CGOV/CTGRIC, Simulador DAR e Carteira Crítica
│       ├── FormularioRiscoView.vue                # Assistente guiado da 1ª Linha (Contexto -> Bow Tie -> KRI)
│       ├── ImportadorSkillView.vue                # Passo 0: Colar tabela Markdown da Skill do Claude Code
│       └── CaixaValidacaoUmCliqueView.vue         # Fila executiva de Aprovação em 1 Clique (CG e Diretoria)
└── tests/
    └── unit/
        ├── calculadoraRiscoRadar.spec.ts
        ├── importadorSkillMarkdown.spec.ts
        ├── schemaSql.spec.ts
        ├── authStore.spec.ts
        ├── fluxoValidacao.spec.ts
        └── deployConfig.spec.ts
```

---

### Task 1: Alicerce do Repositório, Segundo Cérebro no Obsidian e Base Vue 3 + `@govbr-ds/core`

> **Explicação Didática (Para Iniciantes):**  
> Todo projeto web moderno começa com um arquivo chamado `package.json` (que funciona como a "lista de ingredientes" do projeto, dizendo quais bibliotecas vamos usar, como o Vue 3 e o padrão visual do Governo Federal) e com a estrutura de pastas. Nesta primeira tarefa, também criamos o seu **Segundo Cérebro no Obsidian** (`docs/` + `CLAUDE.md` + `AGENTS.md`), garantindo que o Claude Code e o Google Antigravity conheçam todas as regras da Portaria desde o primeiro minuto.

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/package.json`
- Create: `/home/lpchagas/projetos/cgov-riscos/tsconfig.json`
- Create: `/home/lpchagas/projetos/cgov-riscos/vite.config.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/index.html`
- Create: `/home/lpchagas/projetos/cgov-riscos/.gitignore`
- Create: `/home/lpchagas/projetos/cgov-riscos/.obsidian/app.json`
- Create: `/home/lpchagas/projetos/cgov-riscos/CLAUDE.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/AGENTS.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/00-memoria/MOC-Radar.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/00-memoria/ESTADO-ATUAL.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/00-memoria/GLOSSARIO-ACESSIVEL.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/01-normativos/matriz-regras-regime-b.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/03-caderno-aprendizado/01-como-funciona-o-vue3.md`

**Interfaces:**
- Consumes: Nenhuma (primeira tarefa do projeto).
- Produces: Ambiente Node/Vite/Vitest configurado em `/home/lpchagas/projetos/cgov-riscos` e cofre Obsidian inicializado.

- [ ] **Step 1: Inicializar `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` e `.gitignore` em `/home/lpchagas/projetos/cgov-riscos`**

Criar `package.json` com scripts `dev`, `build`, `preview`, `test` (`vitest run`) e dependências `vue`, `vue-router`, `pinia`, `@supabase/supabase-js`, `@govbr-ds/core` (apontando para `^3.7.0`), `@fortawesome/fontawesome-free`, e `devDependencies` `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`, `vitest`, `@vue/test-utils`, `jsdom`. Configurar `vite.config.ts` com alias `@` para `./src` e ambiente de teste `jsdom`.

- [ ] **Step 2: Criar `.obsidian/app.json`, `CLAUDE.md`, `AGENTS.md` e as notas iniciais do Segundo Cérebro em `docs/`**

Configurar `.obsidian/app.json` com `"userIgnoreFilters": ["node_modules/", "dist/", ".git/"]`. Criar `CLAUDE.md` e `AGENTS.md` espelhados com as regras invioláveis do Regime B (proibição da sigla "PGR" para riscos, Matriz Assimétrica do Quadro 7, Fator de Controle do Quadro 6 com trava de evidência, Teste de Integridade da Portaria 253/2026 e links para `docs/00-memoria/MOC-Radar.md` e `ESTADO-ATUAL.md`).

- [ ] **Step 3: Instalar as dependências do projeto**

Run (em `/home/lpchagas/projetos/cgov-riscos`): `npm install`
Expected: `added ... packages` sem erros fatais e criação da pasta `node_modules/`.

- [ ] **Step 4: Inicializar o repositório Git e realizar o primeiro commit da estrutura base**

```bash
cd /home/lpchagas/projetos/cgov-riscos
git init
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html .obsidian/ CLAUDE.md AGENTS.md docs/
git commit -m "chore: inicializa repositorio cgov-riscos, cofre Obsidian e configuracao Vite/Vue3"
```

---

### Task 2: Motor Matemático e Regras Normativas RADAR (Regime B + Travas da Skill `cgov-gestao-riscos-v4`)

> **Explicação Didática (Para Iniciantes):**  
> Antes de desenhar qualquer botão ou tela, nós criamos o "cérebro matemático" do sistema em arquivos TypeScript bem pequenos e fáceis de ler (`radar.types.ts` e `calculadoraRiscoRadar.ts`). Além disso, usamos uma técnica profissional chamada **TDD (Desenvolvimento Guiado por Testes)**: primeiro escrevemos um teste automático com os exemplos da Portaria (como o Caso de Controle do Anexo II, que tem que dar nota **22 — Extremo**), vemos o teste rodar e confirmar que nossa fórmula bate 100% com a norma!

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/src/types/radar.types.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/utils/calculadoraRiscoRadar.ts`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/calculadoraRiscoRadar.spec.ts`

**Interfaces:**
- Consumes: Nenhuma.
- Produces:
  - `src/types/radar.types.ts`: tipos exportados `NivelProbabilidade` (`1|2|3|4|5`), `NivelImpacto` (`1|2|3|4|5`), `ClasseRisco` (`'Baixo'|'Médio'|'Alto'|'Extremo'`), `NivelEficaciaControle` (`'Inexistente'|'Fraco'|'Mediano'|'Satisfatório'|'Forte'`), `FatorAvaliacaoControle` (`1.0|0.9|0.75|0.6|0.5`), `ApetiteDeclarado` (`'baixo'|'moderado'|'pendente_dar'`), `StatusCriticidadeDAR` (`'sim'|'nao'|'pendente_dar'`), `EstrategiaTratamento` (`'Mitigar'|'Compartilhar'|'Evitar'|'Aceitar'`), `StatusFluxoRisco` (`'preliminar_cgov'|'rascunho'|'em_validacao_cg'|'em_homologacao_dir'|'aprovado'|'devolvido'`), `TipoUnidade` (`'presidencia'|'diretoria'|'coordenacao-geral'|'gerencia-regional'|'coordenacao'|'centro-pesquisa'|'ngi'|'uc'`), e interfaces `UnidadeOrganizacional`, `CategoriaRisco`, `ObjetoContexto`, `ControleExistente`, `RespostaTratamento5W2H`, `IndicadorKri`, `MedicaoKri`, `HistoricoFluxoItem`, `FichaRisco`.
  - `src/utils/calculadoraRiscoRadar.ts`:
    - `MATRIZ_QUADRO_7: Record<NivelImpacto, Record<NivelProbabilidade, number>>`
    - `FATORES_QUADRO_6: Record<NivelEficaciaControle, FatorAvaliacaoControle>`
    - `SUBCATEGORIAS_INTEGRIDADE_QUADRO_3: readonly string[]`
    - `obterNivelInerente(probabilidade: NivelProbabilidade, impacto: NivelImpacto): number`
    - `classificarNivelRisco(valorExato: number): ClasseRisco`
    - `validarFatorControle(eficaciaEscolhida: NivelEficaciaControle, possuiEvidenciaComprovada: boolean): { eficaciaFinal: NivelEficaciaControle; fatorFinal: FatorAvaliacaoControle; travaAcionada: boolean; avisoTrava?: string }`
    - `avaliarCriticidadeDAR(classeResidual: ClasseRisco, apetiteCategoria: ApetiteDeclarado): { statusCritico: StatusCriticidadeDAR; explicacao: string }`
    - `calcularRiscoCompletoRadar(params: { probabilidade: NivelProbabilidade; impacto: NivelImpacto; eficaciaControle: NivelEficaciaControle; possuiEvidenciaComprovada: boolean; apetiteCategoria: ApetiteDeclarado }): ResultadoCalculoRadar`
    - `gerarSintaxePadraoRisco(params: { causas: string; eventoRisco: string; consequencias: string; objetivoAfetado: string }): string`
    - `validarRegraIntegridade(params: { categoriaNome: string; subcategoriaIntegridade?: string; testeIntegridadeAplicavel: boolean; justificativaNaoIntegridade?: string }): { valido: boolean; erro?: string }`

- [ ] **Step 1: Escrever o teste automatizado `tests/unit/calculadoraRiscoRadar.spec.ts` cobrindo o Caso de Controle do Anexo II e as 5 regras críticas**

```typescript
import { describe, it, expect } from 'vitest';
import {
  obterNivelInerente,
  classificarNivelRisco,
  validarFatorControle,
  avaliarCriticidadeDAR,
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
  validarRegraIntegridade,
} from '../../src/utils/calculadoraRiscoRadar';

describe('Motor Matemático RADAR — Metodologia SEI 024421455 e Skill cgov-gestao-riscos-v4', () => {
  it('reproduz exatamente o Caso de Controle do Anexo II (P=3, I=5 -> Inerente 22 Extremo, Fator 1.0 -> Residual 22 Extremo)', () => {
    const resultado = calcularRiscoCompletoRadar({
      probabilidade: 3,
      impacto: 5,
      eficaciaControle: 'Inexistente',
      possuiEvidenciaComprovada: false,
      apetiteCategoria: 'moderado',
    });
    expect(resultado.nivelInerente).toBe(22);
    expect(resultado.classificacaoInerente).toBe('Extremo');
    expect(resultado.fatorFinal).toBe(1.0);
    expect(resultado.nivelResidual).toBe(22);
    expect(resultado.classificacaoResidual).toBe('Extremo');
    expect(resultado.statusCritico).toBe('sim');
  });

  it('respeita a assimetria do Quadro 7 (Impacto pesa mais que Probabilidade: P=1,I=5 é 15; P=5,I=1 é 11)', () => {
    expect(obterNivelInerente(1, 5)).toBe(15);
    expect(obterNivelInerente(5, 1)).toBe(11);
  });

  it('classifica decimais de fronteira sem arredondar antes das faixas (10.2 é Alto; 17.1 é Extremo)', () => {
    expect(classificarNivelRisco(5.0)).toBe('Baixo');
    expect(classificarNivelRisco(5.1)).toBe('Médio');
    expect(classificarNivelRisco(10.0)).toBe('Médio');
    expect(classificarNivelRisco(10.2)).toBe('Alto');
    expect(classificarNivelRisco(17.0)).toBe('Alto');
    expect(classificarNivelRisco(17.1)).toBe('Extremo');
  });

  it('aciona a trava de evidência: controle sem evidência não passa de Fraco (0.9)', () => {
    const semEvidencia = validarFatorControle('Forte', false);
    expect(semEvidencia.travaAcionada).toBe(true);
    expect(semEvidencia.eficaciaFinal).toBe('Fraco');
    expect(semEvidencia.fatorFinal).toBe(0.9);
    expect(semEvidencia.avisoTrava).toContain('Fraco');

    const comEvidencia = validarFatorControle('Forte', true);
    expect(comEvidencia.travaAcionada).toBe(false);
    expect(comEvidencia.fatorFinal).toBe(0.5);
  });

  it('avalia corretamente o estado pendente_dar para riscos Médios vs Altos/Extremos', () => {
    expect(avaliarCriticidadeDAR('Médio', 'pendente_dar').statusCritico).toBe('pendente_dar');
    expect(avaliarCriticidadeDAR('Alto', 'pendente_dar').statusCritico).toBe('sim');
    expect(avaliarCriticidadeDAR('Médio', 'baixo').statusCritico).toBe('sim');
    expect(avaliarCriticidadeDAR('Médio', 'moderado').statusCritico).toBe('nao');
  });

  it('valida as regras do Programa Integra+ (Portaria 253/2026) e proíbe categoria mista', () => {
    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional com interface de Integridade',
        testeIntegridadeAplicavel: true,
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Integridade',
        subcategoriaIntegridade: '',
        testeIntegridadeAplicavel: true,
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional',
        testeIntegridadeAplicavel: true,
        justificativaNaoIntegridade: '',
      }).valido
    ).toBe(false);

    expect(
      validarRegraIntegridade({
        categoriaNome: 'Operacional',
        testeIntegridadeAplicavel: true,
        justificativaNaoIntegridade: 'Trata-se apenas de erro material de digitação sem margem para favorecimento.',
      }).valido
    ).toBe(true);
  });

  it('gera a sintaxe obrigatória da seção 4.2.1 da Metodologia', () => {
    const frase = gerarSintaxePadraoRisco({
      causas: 'concentração do conhecimento em um único servidor',
      eventoRisco: 'afastamento do servidor responsável',
      consequencias: 'paralisação do processo',
      objetivoAfetado: 'execução contínua das atividades da unidade',
    });
    expect(frase).toBe(
      'Devido o(a) concentração do conhecimento em um único servidor, poderá ocorrer o(a) afastamento do servidor responsável, ocasionando o(a) paralisação do processo e impactando o alcance do execução contínua das atividades da unidade.'
    );
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que ele falha antes da implementação**

Run: `npx vitest run tests/unit/calculadoraRiscoRadar.spec.ts`
Expected: FAIL (`Cannot find module '../../src/utils/calculadoraRiscoRadar'`)

- [ ] **Step 3: Implementar `src/types/radar.types.ts` e `src/utils/calculadoraRiscoRadar.ts` amplamente comentados**

Implementar todas as interfaces e funções listadas no bloco `Interfaces` desta tarefa, incluindo comentários didáticos explicando cada Quadro da Portaria (`Quadro 2` a `Quadro 8`) e a memória de cálculo (`memoriaCalculo: string`).

- [ ] **Step 4: Executar os testes unitários para confirmar que todos passam**

Run: `npx vitest run tests/unit/calculadoraRiscoRadar.spec.ts`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit do motor matemático RADAR**

```bash
git add src/types/radar.types.ts src/utils/calculadoraRiscoRadar.ts tests/unit/calculadoraRiscoRadar.spec.ts
git commit -m "feat: implementa motor matematico RADAR (Quadro 6, 7, 8, DAR e trava de evidencia)"
```

---

### Task 3: Importador de Tabelas Markdown da Skill `cgov-gestao-riscos-v4` (Passo 0 da CGOV)

> **Explicação Didática (Para Iniciantes):**  
> Como você vai usar o Claude Code com a skill `cgov-gestao-riscos-v4` sobre as Portarias e INs do ICMBio, o resultado gerado pelo Claude será uma tabela em formato Markdown (texto com barras verticais `| coluna 1 | coluna 2 |`). Esta tarefa cria um "tradutor" (`importadorSkillMarkdown.ts`) que lê esse texto colado por você e transforma cada linha em uma Ficha de Risco preliminar dentro do sistema web!

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/src/utils/importadorSkillMarkdown.ts`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/importadorSkillMarkdown.spec.ts`

**Interfaces:**
- Consumes: `calcularRiscoCompletoRadar`, `validarRegraIntegridade`, `NivelProbabilidade`, `NivelImpacto`, `NivelEficaciaControle` de `src/utils/calculadoraRiscoRadar.ts` e `src/types/radar.types.ts`.
- Produces:
  - `LinhaImportadaSkill`: `{ codigoRadar: string; nomeObjeto: string; descricaoPadrao: string; causas: string; eventoRisco: string; consequencias: string; objetivoAfetado: string; categoriaNome: string; subcategoriaIntegridade?: string; probabilidade: NivelProbabilidade; impacto: NivelImpacto; nivelInerente: number; classificacaoInerente: ClasseRisco; controlesTexto: string; possuiEvidenciaControle: boolean; nivelEficaciaControle: NivelEficaciaControle; fatorControle: FatorAvaliacaoControle; nivelResidual: number; classificacaoResidual: ClasseRisco; estrategiaTratamento: EstrategiaTratamento; kriSugerido: string; origemPreliminarCgov: true; statusFluxo: 'preliminar_cgov' }`
  - `importarTabelaMarkdownSkill(markdownBruto: string, apetitePadrao?: ApetiteDeclarado): { fichas: LinhaImportadaSkill[]; avisos: string[]; erros: string[] }`

- [ ] **Step 1: Escrever o teste `tests/unit/importadorSkillMarkdown.spec.ts` com uma tabela no formato do §4 (Regime B) da skill `cgov-gestao-riscos-v4`**

```typescript
import { describe, it, expect } from 'vitest';
import { importarTabelaMarkdownSkill } from '../../src/utils/importadorSkillMarkdown';

describe('Importador de Tabelas Markdown da Skill cgov-gestao-riscos-v4', () => {
  it('converte uma tabela Markdown do Regime B em fichas preliminares recalculadas pelo motor oficial', () => {
    const markdown = `
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-01 | Concessão de Autorização | Devido o(a) ausência de checklist documental, poderá ocorrer o(a) emissão de autorização indevida, ocasionando o(a) dano ambiental em UC e impactando o alcance do objetivo de conservação da biodiversidade. | Operacional | 3 | 4 | 18 | Extremo | Conferência manual sem registro formal | Fraco (0,9) | 16,2 | Alto | pendente_dar | sim | Mitigar | % de processos revisados no trimestre |
    `;

    const resultado = importarTabelaMarkdownSkill(markdown);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.fichas).toHaveLength(1);
    const ficha = resultado.fichas[0];
    expect(ficha.codigoRadar).toBe('RSC-01');
    expect(ficha.causas).toContain('ausência de checklist documental');
    expect(ficha.eventoRisco).toContain('emissão de autorização indevida');
    expect(ficha.consequencias).toContain('dano ambiental em UC');
    expect(ficha.nivelInerente).toBe(18);
    expect(ficha.nivelResidual).toBe(16.2);
    expect(ficha.classificacaoResidual).toBe('Alto');
    expect(ficha.origemPreliminarCgov).toBe(true);
    expect(ficha.statusFluxo).toBe('preliminar_cgov');
  });

  it('rejeita linha que utilize a categoria proibida "Operacional com interface de Integridade"', () => {
    const markdownInvalido = `
| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-02 | Fiscalização | Devido a pressão externa, poderá ocorrer omissão em auto, ocasionando impunidade e impactando a proteção. | Operacional com interface de Integridade | 3 | 5 | 22 | Extremo | Inexistente | Inexistente (1,0) | 22 | Extremo | baixo | sim | Mitigar | Nº de autos auditados |
    `;
    const resultado = importarTabelaMarkdownSkill(markdownInvalido);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('Operacional com interface de Integridade');
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

Run: `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts`
Expected: FAIL (`Cannot find module '../../src/utils/importadorSkillMarkdown'`)

- [ ] **Step 3: Implementar `src/utils/importadorSkillMarkdown.ts` com extração da sintaxe (`Devido a ... poderá ocorrer ... ocasionando ... impactando ...`) e recálculo seguro**

Implementar o parser de tabelas Markdown (ignorando linhas separadoras `|---|`), extraindo `causas`, `eventoRisco`, `consequencias` e `objetivoAfetado` por expressão regular sobre a frase padrão (ou mantendo o texto integral se estiver fora do padrão, gerando um aviso metodológico) e recalculando `nivelInerente` e `nivelResidual` com `calcularRiscoCompletoRadar`.

- [ ] **Step 4: Executar o teste para confirmar que passa**

Run: `npx vitest run tests/unit/importadorSkillMarkdown.spec.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit do importador da skill CGOV**

```bash
git add src/utils/importadorSkillMarkdown.ts tests/unit/importadorSkillMarkdown.spec.ts
git commit -m "feat: adiciona importador de tabelas Markdown da skill cgov-gestao-riscos-v4"
```

---

### Task 4: Banco de Dados PostgreSQL no Supabase (Migrations SQL, RLS, Dados Semente e Aula 2 no Obsidian)

> **Explicação Didática (Para Iniciantes):**  
> Aqui criamos a estrutura do banco de dados em linguagem **SQL** dentro da pasta `supabase/migrations/`. Mesmo que o navegador tente enviar um cálculo errado, o próprio banco de dados PostgreSQL terá funções internas (`calcular_nivel_inerente_q7` e `trigger_calcular_risco_radar`) que recalculam a Matriz Assimétrica do Quadro 7 e aplicam a trava de evidência do Quadro 6 antes de salvar! Também criamos os dados iniciais (`seed.sql` e `dadosSementeAnexoII.ts`) com as Coordenações-Gerais (`coordenacao-geral`), as 8 Categorias oficiais e o Caso de Controle do Anexo II.

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/supabase/migrations/20261109001_schema_radar.sql`
- Create: `/home/lpchagas/projetos/cgov-riscos/supabase/migrations/20261109002_rls_policies.sql`
- Create: `/home/lpchagas/projetos/cgov-riscos/supabase/seed.sql`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/services/dadosSementeAnexoII.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/02-arquitetura-cgti/modelo-dados-mer.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/03-caderno-aprendizado/02-entendendo-o-supabase-sql.md`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/schemaSql.spec.ts`

**Interfaces:**
- Consumes: Tipos de `src/types/radar.types.ts`.
- Produces:
  - Scripts SQL completos para o Supabase/PostgreSQL (`20261109001_schema_radar.sql`, `20261109002_rls_policies.sql`, `seed.sql`).
  - `src/services/dadosSementeAnexoII.ts`: exporta `UNIDADES_SEMENTE: UnidadeOrganizacional[]`, `CATEGORIAS_QUADRO_2_SEMENTE: CategoriaRisco[]`, `OBJETOS_CONTEXTO_SEMENTE: ObjetoContexto[]`, `RISCOS_SEMENTE_ANEXO_II: FichaRisco[]`.

- [ ] **Step 1: Escrever o teste `tests/unit/schemaSql.spec.ts` verificando a integridade das migrations SQL e dos dados semente do Anexo II**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UNIDADES_SEMENTE,
  CATEGORIAS_QUADRO_2_SEMENTE,
  RISCOS_SEMENTE_ANEXO_II,
} from '../../src/services/dadosSementeAnexoII';

describe('Migrations SQL e Dados Semente (Anexo II e Quadros 2/3)', () => {
  it('contém todas as tabelas nucleares e a função da Matriz Assimétrica no SQL de migração', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20261109001_schema_radar.sql'),
      'utf-8'
    );
    expect(sql).toContain('CREATE TABLE unidades');
    expect(sql).toContain("'coordenacao-geral'");
    expect(sql).toContain('CREATE TABLE categorias_risco');
    expect(sql).toContain('CREATE TABLE objetos_contexto');
    expect(sql).toContain('CREATE TABLE riscos');
    expect(sql).toContain('CREATE TABLE controles_existentes');
    expect(sql).toContain('CREATE TABLE respostas_tratamento');
    expect(sql).toContain('CREATE TABLE indicadores_kri');
    expect(sql).toContain('CREATE TABLE medicoes_kri');
    expect(sql).toContain('CREATE TABLE historico_fluxo');
    expect(sql).toContain('CREATE TABLE auditoria_log');
    expect(sql).toContain('calcular_nivel_inerente_q7');
  });

  it('possui as 8 categorias oficiais do Quadro 2 e unidades com coordenacao-geral no seed', () => {
    expect(CATEGORIAS_QUADRO_2_SEMENTE).toHaveLength(8);
    expect(UNIDADES_SEMENTE.some((u) => u.tipo === 'coordenacao-geral')).toBe(true);
    expect(RISCOS_SEMENTE_ANEXO_II[0].nivelInerente).toBe(22);
    expect(RISCOS_SEMENTE_ANEXO_II[0].kris).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

Run: `npx vitest run tests/unit/schemaSql.spec.ts`
Expected: FAIL (`Cannot find module '../../src/services/dadosSementeAnexoII'`)

- [ ] **Step 3: Criar `supabase/migrations/20261109001_schema_radar.sql`, `20261109002_rls_policies.sql`, `supabase/seed.sql`, `src/services/dadosSementeAnexoII.ts` e a nota didática `02-entendendo-o-supabase-sql.md`**

Incluir comentários didáticos em cada bloco SQL explicando o que é `PRIMARY KEY`, `FOREIGN KEY`, `CHECK`, `TRIGGER` e `ROW LEVEL SECURITY (RLS)`. Em `dadosSementeAnexoII.ts`, cadastrar unidades reais do ICMBio (`PRESIDENCIA`, `DIPLAN`, `CGGE` como `coordenacao-geral`, `CGOV` como `coordenacao`, `DIBIO`, `CGFIN`, `GR-1`, `PARNA-BRASILIA`), as 8 categorias do Quadro 2 com as 6 subcategorias do Quadro 3 em `Integridade`, e o Caso de Controle completo do Anexo II com seus 3 KRIs trimestrais.

- [ ] **Step 4: Executar o teste para confirmar que passa**

Run: `npx vitest run tests/unit/schemaSql.spec.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit do banco de dados e seeds**

```bash
git add supabase/ src/services/dadosSementeAnexoII.ts docs/02-arquitetura-cgti/modelo-dados-mer.md docs/03-caderno-aprendizado/02-entendendo-o-supabase-sql.md tests/unit/schemaSql.spec.ts
git commit -m "feat: adiciona migrations SQL PostgreSQL, politicas RLS e seed com Caso Anexo II"
```

---

### Task 5: Identidade Visual Gov.br (`@govbr-ds/core`), Conexão Supabase e Simulador de Perfis

> **Explicação Didática (Para Iniciantes):**  
> Nesta tarefa construímos os blocos visuais do Padrão Digital de Governo (`BrHeader`, `BrButton`, `BrCard`, `BrBadge`) e o controle de quem está usando o sistema (`authStore.ts`). Para facilitar seus estudos e a apresentação para a CGTI, incluímos no cabeçalho um **"Alternador Didático de Perfil"** que permite trocar em 1 clique entre *Gestor de Riscos (1ª Linha)*, *Coordenador-Geral de Macroprocesso*, *Diretor* e *Analista da CGOV (2ª Linha)*, vendo imediatamente como o sistema se comporta para cada papel!

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/src/assets/main.css`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/services/supabase.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/stores/authStore.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/govbr/BrHeader.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/govbr/BrButton.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/govbr/BrCard.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/govbr/BrBadge.vue`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/authStore.spec.ts`

**Interfaces:**
- Consumes: `UNIDADES_SEMENTE` de `src/services/dadosSementeAnexoII.ts`.
- Produces:
  - `src/services/supabase.ts`: `supabaseClient` (instância do `@supabase/supabase-js` quando `VITE_SUPABASE_URL` estiver definido, ou `null` operando em modo demonstração local persistido em `localStorage`).
  - `src/stores/authStore.ts`: Pinia store `useAuthStore` com `usuarioAtual`, `perfisDisponiveisDemo`, `alternarPerfilDemo(papel: 'gestor' | 'lider_cg' | 'diretor' | 'cgov')`, `podeAprovarCg`, `podeHomologarDiretoria`, `isCgov`.

- [ ] **Step 1: Escrever o teste `tests/unit/authStore.spec.ts` validando as permissões por perfil da 1ª e 2ª linhas**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/authStore';

describe('AuthStore — Perfis de Governança RADAR (1ª Linha, CG, Diretoria e CGOV)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('alterna corretamente entre Gestor (1ª linha), Líder CG, Diretor e CGOV (2ª linha)', () => {
    const store = useAuthStore();
    store.alternarPerfilDemo('gestor');
    expect(store.usuarioAtual.papel).toBe('gestor');
    expect(store.podeAprovarCg).toBe(false);

    store.alternarPerfilDemo('lider_cg');
    expect(store.podeAprovarCg).toBe(true);
    expect(store.podeHomologarDiretoria).toBe(false);

    store.alternarPerfilDemo('diretor');
    expect(store.podeHomologarDiretoria).toBe(true);

    store.alternarPerfilDemo('cgov');
    expect(store.isCgov).toBe(true);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

Run: `npx vitest run tests/unit/authStore.spec.ts`
Expected: FAIL (`Cannot find module '../../src/stores/authStore'`)

- [ ] **Step 3: Implementar `src/assets/main.css`, `src/services/supabase.ts`, `src/stores/authStore.ts` e os componentes `BrHeader.vue`, `BrButton.vue`, `BrCard.vue` e `BrBadge.vue`**

Importar `@govbr-ds/core/dist/core.min.css` e `@fortawesome/fontawesome-free/css/all.min.css` em `src/assets/main.css`, criando estilos limpos nas cores oficiais Gov.br (`#1351b4`, `#071d41`, `#168821`, `#ffcd07`, `#e52207`) para os níveis *Baixo, Médio, Alto e Extremo*.

- [ ] **Step 4: Executar o teste para confirmar que passa**

Run: `npx vitest run tests/unit/authStore.spec.ts`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit dos componentes Gov.br e store de autenticação**

```bash
git add src/assets/main.css src/services/supabase.ts src/stores/authStore.ts src/components/govbr/ tests/unit/authStore.spec.ts
git commit -m "feat: adiciona componentes visuais Gov.br e store de perfis de governanca"
```

---

### Task 6: Store de Riscos, Fluxo de "Aprovação em 1 Clique" e Monitoramento Contínuo

> **Explicação Didática (Para Iniciantes):**  
> O arquivo `riscosStore.ts` é o coração operacional da aplicação no navegador. Ele guarda a lista de riscos, conversa com o banco de dados e executa as ações de negócio: cadastrar um risco novo, importar uma tabela vinda da skill do Claude Code, executar a **Aprovação em 1 Clique** da Coordenação-Geral e da Diretoria, registrar leituras de KRIs e reabrir o risco caso alguém altere a nota depois de aprovado.

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/src/stores/riscosStore.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/radar/MemoriaCalculoBar.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/components/radar/MatrizCalorAssimetrica.vue`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/fluxoValidacao.spec.ts`

**Interfaces:**
- Consumes: `calcularRiscoCompletoRadar`, `importarTabelaMarkdownSkill`, `RISCOS_SEMENTE_ANEXO_II`, `CATEGORIAS_QUADRO_2_SEMENTE`, `UNIDADES_SEMENTE`, `OBJETOS_CONTEXTO_SEMENTE`, `useAuthStore`.
- Produces:
  - `useRiscosStore` com:
    - Estado: `riscos`, `categorias`, `unidades`, `objetosContexto`
    - Getters: `riscosCriticosCarteira`, `filaValidacaoCg`, `filaHomologacaoDiretoria`, `resumoPorClasse`
    - Actions:
      - `salvarOuAtualizarRisco(ficha: Partial<FichaRisco>): FichaRisco`
      - `submeterParaValidacaoCg(riscoId: string): void`
      - `aprovarEmUmCliqueCg(riscoId: string, despachoOpcional?: string): void`
      - `homologarEmUmCliqueDiretoria(riscoId: string, despachoOpcional?: string): void`
      - `solicitarAjusteRapido(riscoId: string, despachoMotivo: string): void`
      - `registrarMedicaoKri(riscoId: string, kriId: string, medicao: { dataMedicao: string; valorApurado: string; emAlerta: boolean; observacao?: string }): void`
      - `atualizarStatusTratamento(riscoId: string, tratamentoId: string, novoStatus: RespostaTratamento5W2H['statusExecucao']): void`
      - `reavaliarPontuacaoRiscoAprovado(riscoId: string, novosDados: { probabilidade: NivelProbabilidade; impacto: NivelImpacto; nivelEficaciaControle: NivelEficaciaControle; possuiEvidenciaControle: boolean }): void`
      - `importarMarkdownDaSkill(markdown: string, objetoIdPadrao: string, responsavelIdPadrao: string): { importados: number; erros: string[] }`
      - `alterarApetiteCategoriaDAR(categoriaId: number, novoApetite: ApetiteDeclarado): void`

- [ ] **Step 1: Escrever o teste `tests/unit/fluxoValidacao.spec.ts` cobrindo o fluxo em 3 degraus (1 clique), escalonamento automático de Riscos Críticos e preservação de status no monitoramento de KRI vs. reabertura na mudança de nota**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';

describe('Fluxo de Validação em 1 Clique (3 Degraus) e Monitoramento Contínuo', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('escala automaticamente um Risco Crítico do 2º degrau (CG) para o 3º degrau (Diretoria) ao aprovar em 1 clique', () => {
    const store = useRiscosStore();
    const auth = useAuthStore();
    const riscoAnexoII = store.riscos[0]; // Nota 22 Extremo (Crítico)

    auth.alternarPerfilDemo('gestor');
    store.submeterParaValidacaoCg(riscoAnexoII.id);
    expect(store.riscos[0].statusFluxo).toBe('em_validacao_cg');

    auth.alternarPerfilDemo('lider_cg');
    store.aprovarEmUmCliqueCg(riscoAnexoII.id);
    // Como é Risco Crítico, sobe para homologação da Diretoria:
    expect(store.riscos[0].statusFluxo).toBe('em_homologacao_dir');

    auth.alternarPerfilDemo('diretor');
    store.homologarEmUmCliqueDiretoria(riscoAnexoII.id);
    expect(store.riscos[0].statusFluxo).toBe('aprovado');
  });

  it('mantém status "aprovado" ao lançar medição de KRI, mas reabre para "em_validacao_cg" se alterar a nota do risco', () => {
    const store = useRiscosStore();
    const risco = store.riscos[0];
    risco.statusFluxo = 'aprovado';

    // Lançar medição de KRI não derruba o status aprovado:
    store.registrarMedicaoKri(risco.id, risco.kris[0].id, {
      dataMedicao: '2026-11-09',
      valorApurado: '15%',
      emAlerta: false,
      observacao: 'Leitura trimestral dentro da meta',
    });
    expect(store.riscos[0].statusFluxo).toBe('aprovado');

    // Alterar a nota reabre para validação da Coordenação-Geral:
    store.reavaliarPontuacaoRiscoAprovado(risco.id, {
      probabilidade: 3,
      impacto: 5,
      nivelEficaciaControle: 'Satisfatório',
      possuiEvidenciaControle: true,
    });
    expect(store.riscos[0].nivelResidual).toBe(13.2);
    expect(store.riscos[0].statusFluxo).toBe('em_validacao_cg');
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

Run: `npx vitest run tests/unit/fluxoValidacao.spec.ts`
Expected: FAIL (`Cannot find module '../../src/stores/riscosStore'`)

- [ ] **Step 3: Implementar `src/stores/riscosStore.ts`, `src/components/radar/MemoriaCalculoBar.vue` e `src/components/radar/MatrizCalorAssimetrica.vue`**

Implementar `riscosStore.ts` com todas as ações tipadas e comentadas, o componente `MemoriaCalculoBar.vue` (que exibe a derivação completa da nota exigida pelo §5 da skill: `P -> I -> Inerente Quadro 7 -> Evidência + Fator Quadro 6 -> Residual Exato -> Comparação com DAR`) e `MatrizCalorAssimetrica.vue` (exibindo a matriz 5×5 com os valores exatos do Quadro 7 e quantos riscos estão em cada célula).

- [ ] **Step 4: Executar o teste para confirmar que passa**

Run: `npx vitest run tests/unit/fluxoValidacao.spec.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit da store de riscos e componentes visuais RADAR**

```bash
git add src/stores/riscosStore.ts src/components/radar/ tests/unit/fluxoValidacao.spec.ts
git commit -m "feat: implementa riscosStore, fluxo de aprovacao em 1 clique e matriz de calor Quadro 7"
```

---

### Task 7: Telas do Sistema (Painel CGOV/CTGRIC, Assistente 1ª Linha, Importador da Skill e Caixa "1 Clique")

> **Explicação Didática (Para Iniciantes):**  
> Agora conectamos nossos componentes e o motor matemático nas 4 telas principais (`views/`) do aplicativo e configuramos o `Vue Router` (`router/index.ts`) para permitir navegar entre elas sem recarregar a página (é por isso que chamamos de *Single-Page Application — SPA*).

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/src/views/PainelConsolidadoCgovView.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/views/FormularioRiscoView.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/views/ImportadorSkillView.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/views/CaixaValidacaoUmCliqueView.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/router/index.ts`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/App.vue`
- Create: `/home/lpchagas/projetos/cgov-riscos/src/main.ts`

**Interfaces:**
- Consumes: `useRiscosStore`, `useAuthStore`, componentes `BrHeader`, `BrButton`, `BrCard`, `BrBadge`, `MemoriaCalculoBar`, `MatrizCalorAssimetrica`.
- Produces: Aplicação Vue 3 completa com 4 rotas (`/`, `/novo-risco`, `/importar-skill`, `/validacao-um-clique`).

- [ ] **Step 1: Criar `src/views/PainelConsolidadoCgovView.vue`, `src/views/FormularioRiscoView.vue`, `src/views/ImportadorSkillView.vue` e `src/views/CaixaValidacaoUmCliqueView.vue`**

Garantir que:
- `PainelConsolidadoCgovView.vue` exiba os indicadores do **Plano de Gestão de Riscos** (por extenso, nunca "PGR"), a Matriz de Calor Assimétrica 5×5, a configuração/simulação da **DAR (Declaração de Apetite a Riscos)** por categoria (`baixo | moderado | pendente_dar`), a lista de riscos com a barra "Mostre a Conta" e o acompanhamento de KRIs e ações 5W2H.
- `FormularioRiscoView.vue` guie o preenchimento das etapas da Metodologia RADAR (Contexto Quadro 1 → Identificação *Bow Tie* com frase automática e Teste de Integridade do Integra+ → Análise Inerente/Residual com trava de evidência em tempo real → Tratamento 5W2H e KRIs).
- `ImportadorSkillView.vue` traga um botão de exemplo pré-carregado com uma tabela Markdown da skill `cgov-gestao-riscos-v4` para testar a importação em 1 clique.
- `CaixaValidacaoUmCliqueView.vue` apresente os cartões executivos com os botões **Aprovar em 1 Clique**, **Homologar para o Plano de Gestão de Riscos** e **Solicitar Ajuste Rápido**.

- [ ] **Step 2: Criar `src/router/index.ts`, `src/App.vue` e `src/main.ts`**

Conectar `createPinia()` e `router` em `src/main.ts` e incluir a navegação principal no padrão Gov.br em `src/App.vue`.

- [ ] **Step 3: Executar a compilação TypeScript + Vite (`npm run build`) e a suíte de testes para validar que todas as telas compilam sem erros**

Run: `npm run build && npx vitest run`
Expected: `built in ...` (gerando `dist/`) e todos os testes unitários passando.

- [ ] **Step 4: Commit das telas e roteamento Vue 3**

```bash
git add src/views/ src/router/ src/App.vue src/main.ts
git commit -m "feat: adiciona telas do Painel CGOV, Assistente Bow-Tie, Importador da Skill e Validacao 1-Clique"
```

---

### Task 8: Configuração Vercel + Empacotamento Docker (`Dockerfile`, `docker-compose.yml`, `nginx.conf`) e Dossiê CGTI/ICMBio

> **Explicação Didática (Para Iniciantes):**  
> Nesta última tarefa fechamos o ciclo completo de entrega: preparamos o arquivo `vercel.json` (para publicação gratuita na nuvem Vercel) e criamos a receita oficial de **Container Docker** (`Dockerfile` + `docker-compose.yml` + `nginx.conf`) toda comentada linha por linha, acompanhada do guia executivo para você apresentar à **Coordenação-Geral de Tecnologia da Informação (CGTI) do ICMBio**.

**Files:**
- Create: `/home/lpchagas/projetos/cgov-riscos/vercel.json`
- Create: `/home/lpchagas/projetos/cgov-riscos/Dockerfile`
- Create: `/home/lpchagas/projetos/cgov-riscos/docker-compose.yml`
- Create: `/home/lpchagas/projetos/cgov-riscos/nginx.conf`
- Create: `/home/lpchagas/projetos/cgov-riscos/.env.example`
- Create: `/home/lpchagas/projetos/cgov-riscos/README.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/02-arquitetura-cgti/guia-docker-cgti.md`
- Create: `/home/lpchagas/projetos/cgov-riscos/docs/03-caderno-aprendizado/03-empacotando-com-docker.md`
- Test: `/home/lpchagas/projetos/cgov-riscos/tests/unit/deployConfig.spec.ts`

**Interfaces:**
- Consumes: Build de produção (`dist/`) gerado pelo Vite.
- Produces: Artefatos de containerização Docker (`Dockerfile`, `docker-compose.yml`, `nginx.conf`), configuração `vercel.json` e documentação executiva para a CGTI.

- [ ] **Step 1: Escrever o teste `tests/unit/deployConfig.spec.ts` validando os arquivos de deploy (Docker, Nginx, Vercel) e a ausência da sigla proibida "PGR" para riscos**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Artefatos de Implantação (Docker para CGTI e Vercel)', () => {
  it('possui Dockerfile multi-stage (Node build + Nginx Alpine) e docker-compose.yml comentados', () => {
    const dockerfile = readFileSync(resolve(__dirname, '../../Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('FROM node:22-alpine AS construtor');
    expect(dockerfile).toContain('FROM nginx:1.27-alpine');
    expect(existsSync(resolve(__dirname, '../../docker-compose.yml'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../nginx.conf'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../vercel.json'))).toBe(true);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha**

Run: `npx vitest run tests/unit/deployConfig.spec.ts`
Expected: FAIL (`ENOENT: no such file or directory, open '.../Dockerfile'`)

- [ ] **Step 3: Criar `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `vercel.json`, `.env.example`, `README.md`, `guia-docker-cgti.md` e `03-empacotando-com-docker.md`**

Comentar cada instrução do `Dockerfile` (`FROM`, `WORKDIR`, `COPY`, `RUN npm ci`, `RUN npm run build`, `EXPOSE 80`) explicando em linguagem acessível como funciona o *multi-stage build* e por que a imagem final fica super leve e segura para os servidores do ICMBio. Atualizar `docs/00-memoria/ESTADO-ATUAL.md` registrando a conclusão do protótipo base.

- [ ] **Step 4: Executar toda a suíte de testes unitários e o build final de produção**

Run: `npx vitest run && npm run build`
Expected: Todas as 6 suítes de testes (`PASS`) e diretório `dist/` compilado sem erros.

- [ ] **Step 5: Commit final da configuração Docker, Vercel e documentação CGTI**

```bash
git add Dockerfile docker-compose.yml nginx.conf vercel.json .env.example README.md docs/ tests/unit/deployConfig.spec.ts
git commit -m "feat: adiciona empacotamento Docker para CGTI, configuracao Vercel e caderno de aprendizado"
```
