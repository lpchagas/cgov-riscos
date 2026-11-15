---
tipo: referencia
data: 2026-11-15
status: "Vigente — decisões P1 a P8 tomadas em 2026-11-15 (seção 9)"
fontes:
  - "Decreto nº 9.203/2017 — Política de Governança da APF (arts. 15-A a 19)"
  - "Portaria ICMBio nº 5.592/2025 — Regimento Interno (DOU 31/12/2025)"
  - "Minuta da Política de Gestão de Riscos — RADAR (SEI 024241420)"
  - "Minuta da Metodologia de Gestão de Riscos (SEI 024421455)"
  - "Orientações e decisões da CGOV (2026-11-15)"
relacionados: "[[matriz-regras-regime-b]] · [[modelo-dados-mer]] · [[ESTADO-ATUAL]]"
tags: [acesso, perfis, rls, raci, regimento-interno, governanca]
---

# Matriz de responsabilidades e tabela de acesso do RADAR

> **Em uma frase:** cada pessoa é **gestora de riscos da própria unidade**. O cargo dela
> acrescenta um **alcance de leitura** (quais outras unidades ela enxerga) e **permissões de
> fluxo** (validar, homologar, consolidar). Este documento é a regra de decisão para o login, o
> menu, as rotas e a segurança por linha (RLS) do banco.

> **Base normativa dos fluxos:** por decisão do responsável pelo projeto (2026-11-15), o RADAR é
> desenvolvido já na versão mais moderna, tendo como referência as **minutas** da Política (SEI
> 024241420) e da Metodologia (SEI 024421455). Quando forem publicadas, será feita uma **revisão
> sistêmica** destas regras de decisão e o projeto passará para uma nova versão.

**Como ler:** as seções 1 a 4 explicam a lógica. As seções 5 a 7 são as tabelas de consulta.
A seção 8 diz como isso vira regra técnica. A seção 9 registra as decisões da CGOV que
fundamentam as regras. Onde está escrito **(fluxo RADAR)**, a regra é uma escolha de desenho do
sistema, aprovada pela CGOV, e não um texto de norma.

---

## 1. Fontes e o que cada uma decide

| Fonte | O que ela decide aqui |
|---|---|
| **Decreto nº 9.203/2017** ([[20171122_Decreto 9203_Política de Governança APF]]), arts. 15-A a 19 | A **alta administração** mantém o sistema de gestão de riscos da organização inteira (art. 17). Os comitês internos de governança auxiliam a alta administração (art. 15-A). A auditoria interna avalia com independência (art. 18). |
| **Regimento Interno** (Portaria nº 5.592/2025) | Quem está abaixo de quem: a árvore de unidades (seção 3). |
| **Política RADAR** (minuta SEI 024241420), arts. 12 a 19 | Papéis na gestão de riscos: 1ª, 2ª e 3ª linha, CGOV, CGGE, CTGRIC, Comitê Interno de Governança, AUDIT. |
| **Metodologia** (minuta SEI 024421455), item 4.6 | Como o Plano de Gestão de Riscos é consolidado (CGOV) e aprovado (Comitê Interno de Governança). |
| **Decisões da CGOV** (2026-11-15) | Quem enxerga o quê e quem valida e homologa (seções 4 e 9). |

---

## 2. Dois conceitos que não podem se misturar

| Conceito | Pergunta | Exemplo |
|---|---|---|
| **Alcance** (visibilidade) | *De quais unidades eu vejo os riscos?* | A Gerente Regional vê os riscos da GR, das CTs, dos NGIs e das UCs vinculadas. |
| **Permissão de fluxo** | *O que eu posso fazer com um risco?* | Só a chefia imediata valida a ficha. Só a CGOV consolida o Plano de Gestão de Riscos. |

Ver os riscos de uma unidade **não** dá o direito de editá-los. A Metodologia (item 4.6) diz que a
consolidação ocorre "sem prejuízo do mérito das decisões de risco adotadas na 1ª linha". Por isso,
**quem está acima lê, valida ou homologa, mas não reescreve** a ficha da unidade de baixo.

---

## 3. A árvore de unidades segundo o Regimento Interno

A árvore abaixo resume a subordinação. Os artigos citados são do Anexo I da Portaria nº 5.592/2025.

```text
Presidente
├── Assessoria do Presidente (art. 21)
├── GABIN — Gabinete (art. 22) ── SEAG, CGA, DAI, DPL (arts. 23–26)
├── PFE (art. 27) · CORR (art. 28) · AUDIT (art. 31) · OUV (art. 33) · SECET (art. 35)
├── CGGE (art. 36) ── CGOV (art. 37), DPAE (art. 38), DINFI (art. 39)
├── CGCS (art. 40) ── CCOM (art. 41)
├── DIPLAN (art. 42) ── COASA ── CGPLAN · CGGP (── ACADEBio, art. 62) · CGTI · CGADM · CGFIN
├── DIMAN (art. 90) ── COTAM ── CGCAP · CGPRO · CGEUP
├── DISAT (art. 120) ── COTAT ── CGTER · CGSAM · CGPT
├── DIBIO (art. 143) ── COTAB ── CGCON · CGIMP · CGPEQ
│     └── 14 Centros Nacionais de Pesquisa e Conservação (art. 143, XII) ── Bases Avançadas e Setores (art. 9º)
└── Gerências Regionais — GR (art. 10, § 2º: "subordinadas ao Presidente")
      ├── DAS-GR, SAT-GR (arts. 11–12)
      ├── COAGR (art. 13) ── DILOC, SEFIN (arts. 14–15)
      ├── Coordenações Territoriais — CT (art. 16) ── SAP-CT (art. 17)
      │     └── coordenam e orientam NGIs e UCs "nos limites da sua atuação e circunscrição" (art. 16)
      └── NGIs e UCs "vinculados às respectivas Gerências Regionais" (art. 18, § 2º; art. 19, § 2º)
            └── Serviços, Setores e Bases Avançadas (art. 20)
```

Abaixo de cada Coordenação-Geral ficam Coordenações, Divisões, Serviços e Setores (arts. 4º a 7º).

### Achados do Regimento e como foram resolvidos

**A1. As GRs respondem ao Presidente, não às Diretorias.**
O art. 10, § 2º, subordina as Gerências Regionais ao Presidente. Seguindo só a hierarquia, nenhum
Diretor ou Coordenador-Geral teria GRs, CTs ou UCs "abaixo" dele.
*Resolvido (P1 e P1b):* os **Diretores**, com o Presidente, ocupam as cadeiras do Comitê Interno de
Governança. Como alta administração (Decreto nº 9.203/2017, art. 17), eles **leem os riscos de todas
as unidades**. Os **Coordenadores-Gerais** leem a própria árvore e, pela **visão por processo**, os
riscos de qualquer unidade cujo processo pertença a um macroprocesso que supervisionam (Regimento,
art. 4º; Cadeia de Valor, Anexo II).

**A2. A única Diretoria com unidades descentralizadas subordinadas é a DIBIO.**
Os 14 Centros Nacionais de Pesquisa e Conservação são supervisionados pela DIBIO (art. 143, XII).
Com a decisão P1, isso não muda o alcance dos Diretores, que já leem tudo. A informação continua
valendo para a árvore: a **unidade superior de um Centro é a DIBIO**.

**A3. As CTs coordenam UCs *e* NGIs.**
O art. 16 fala em "Núcleos de Gestão Integrada e Unidades de Conservação".
*Resolvido (P2):* a CT vê os riscos dos **NGIs e das UCs** vinculados a ela.

**A4. Nem toda UC ou NGI fica abaixo de uma CT.**
A CT atua "nos limites da sua atuação e circunscrição" (art. 16), e o art. 16, VII, prevê a CT
gerindo UCs "quando estes não possuírem responsáveis designados". Na árvore, a unidade superior
de uma UC é a **CT, se existir; senão, a própria GR**.

**A5. Toda chefia é gestora de riscos.**
A Política (art. 17, § 1º) lista como gestores de riscos o Presidente, os Diretores, o
Procurador-Chefe, o Auditor-Chefe, o Corregedor, o Ouvidor, o Chefe de Gabinete, os CGs, os
Coordenadores, os Gerentes Regionais, os Coordenadores de Centros, o Chefe da ACADEBio, os Chefes
de NGI e de UC e os responsáveis por processos. Por isso **todo perfil tem, no mínimo, o papel de
gestor da própria unidade**.

**A6. Comitê Interno de Governança ou Comitê Gestor?**
A Política, a Metodologia e o Decreto nº 9.203/2017 (art. 15-A) usam "comitê interno de
governança". O Regimento fala em "Comitê Gestor" (arts. 22 e 177).
*Resolvido (P7):* nas telas do RADAR o nome é **Comitê Interno de Governança**.

---

## 4. Regras de alcance (leitura)

"Subordinada" significa **descendente na árvore da seção 3**, em qualquer profundidade. Exemplo: a
GR enxerga a UC mesmo quando existe uma CT entre as duas. A "própria unidade" inclui as
subunidades internas dela, como Bases Avançadas, Serviços e Setores (P8).

| Cargo | Regra de alcance (leitura) | Fundamento |
|---|---|---|
| **Gestor** (chefe de UC, NGI, Coordenação, Divisão, Centro; responsável por processo) | própria unidade + subunidades internas | Orientação da CGOV; P8 |
| **Coordenador Territorial** | própria CT + NGIs e UCs vinculados à CT | Orientação da CGOV; Regimento art. 16; P2 |
| **Gerente Regional** | própria GR + todas as descendentes (DAS-GR, SAT-GR, COAGR, CTs, NGIs, UCs) | Orientação da CGOV |
| **Coordenador-Geral** | própria CG + descendentes **+ riscos de qualquer unidade cujo processo pertence a macroprocesso supervisionado pela CG** (visão por processo) | Regimento art. 4º; P1b |
| **Diretor** | **todas as unidades** | Decreto nº 9.203/2017, art. 17 (alta administração); Diretores integram o Comitê Interno de Governança; P1 |
| **Presidência** | todas as unidades | Decreto nº 9.203/2017, art. 17; P3 |
| **AUDIT** | todas as unidades, **somente leitura** | Decreto nº 9.203/2017, art. 18; Política art. 16; P3 |
| **CGOV, CGGE, GABIN** | todas as unidades | Orientação da CGOV |

---

## 5. Perfis do RADAR (substituem os 4 perfis simulados)

Hoje o simulador tem `gestor`, `lider_cg`, `diretor` e `cgov`. A partir da etapa B, são estes:

| Perfil | Quem recebe (cargo no Regimento) | Linha (Política) | Alcance de leitura | Escreve fichas de | Fluxo extra |
|---|---|---|---|---|---|
| `gestor` | Chefes de UC e NGI, Coordenadores, Chefes de Divisão/Serviço/Setor, Coordenadores de Centro, Chefe da ACADEBio, responsáveis por processo; Procurador-Chefe, Corregedor, Ouvidor, CGCS | 1ª | própria unidade + subunidades | própria unidade | — |
| `coordenador_territorial` | Coordenador Territorial (art. 193) | 1ª | CT + NGIs e UCs vinculados | própria CT | **valida** (2º degrau) as fichas dos NGIs e UCs da CT |
| `gerente_regional` | Gerente Regional (art. 191) | 1ª | GR + todas as descendentes | própria GR | **valida** (2º degrau) as fichas das unidades da GR sem CT; **homologa** (3º degrau) os riscos críticos de toda a GR |
| `coordenador_geral` | Coordenadores-Gerais (art. 185) | 1ª | CG + descendentes + visão por processo | própria CG | **valida** (2º degrau) as fichas das Coordenações da CG |
| `diretor` | Diretores (arts. 182–183) | 1ª e alta administração | todas as unidades | própria Diretoria | **homologa** (3º degrau) os riscos críticos das unidades da Sede na sua árvore |
| `presidencia` | Presidente e Assessoria (arts. 21 e 175) | alta administração | todas as unidades | Presidência | — |
| `auditoria` | Auditor-Chefe e AUDIT (art. 31) | 3ª | todas as unidades, somente leitura | própria AUDIT | — (avaliação independente) |
| `cgov` | Servidores da CGOV (art. 37) | 2ª | todas as unidades | própria CGOV | consolida o Plano de Gestão de Riscos, simula a DAR, importa tabelas, mantém o catálogo de objetos, cadastra usuários e atribui perfis |
| `cgge` | Servidores da CGGE (art. 36) | supervisão | todas as unidades | própria CGGE | — |
| `gabin` | Chefe de Gabinete e equipe (arts. 22 e 177) | apoio à alta administração | todas as unidades | próprio GABIN | — |

**Uma pessoa, uma unidade, um perfil.** Quem acumula funções (por exemplo, substituto) recebe o
perfil do cargo de maior alcance enquanto durar a substituição. O registro da troca fica na
trilha de auditoria.

**Contas de acesso (P6):** a CGOV cadastra a pessoa no RADAR e define perfil e unidade. A CGTI
cuida da conta institucional (login gov.br ou ICMBio) na homologação (etapa D).

---

## 6. Matriz de responsabilidade (RACI)

**Legenda:** **R** = executa · **A** = responde pelo resultado (aprova) · **C** = é consultado ·
**I** = é informado. "Chefia superior" é a unidade imediatamente acima na árvore (CT, GR, CG ou
Diretor, conforme o caso). "Homologador" é o **Gerente Regional** para as unidades descentralizadas
e o **Diretor** para as unidades da Sede (P4).

| # | Atividade | Fundamento | Gestor de riscos | Chefia superior | Homologador (GR ou Diretor) | CGOV | CGGE | CTGRIC | Comitê Int. Governança | AUDIT |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Identificar, analisar e avaliar riscos dos seus processos | Política art. 17, I | **R/A** | I | — | C | — | — | — | — |
| 2 | Avaliar controles (com trava de evidência) | Metodologia, Quadro 6 | **R/A** | I | — | C | — | — | — | — |
| 3 | Definir tratamento e ao menos 1 KRI para risco crítico | Política art. 8º, § 2º | **R/A** | I | — | C | — | — | — | — |
| 4 | Validar a ficha de risco (2º degrau) **(fluxo RADAR)** | P4 | I | **R/A** | I | I | — | — | — | — |
| 5 | Homologar risco crítico (3º degrau) **(fluxo RADAR)** | P4 | I | C | **R/A** | I | — | — | — | — |
| 6 | Comunicar riscos críticos à CGOV | Política art. 17, II | **R/A** | I | I | I | — | — | — | — |
| 7 | Registrar medições de KRI e manter a ficha atualizada | Política art. 17, V | **R/A** | I | — | I | — | — | — | — |
| 8 | Comunicar riscos emergentes e falhas de controle | Política art. 17, IV | **R/A** | I | I | I | — | — | — | — |
| 9 | Orientar tecnicamente os gestores | Política art. 15, III | I | — | — | **R/A** | C | — | — | C (art. 15, par. único) |
| 10 | Consolidar o Plano de Gestão de Riscos único | Metodologia 4.6 | C | — | I | **R** | **A** | C (art. 13, II) | I | — |
| 11 | Aprovar o Plano de Gestão de Riscos | Metodologia 4.6 | I | I | I | C | C | C | **R/A** | — |
| 12 | Revisar o Plano de Gestão de Riscos | Política art. 9º | C | — | I | **R** | C | **C** (manifestação prévia) | **A** | — |
| 13 | Definir o apetite a riscos (DAR) | Política art. 12, V | I | I | C | C (subsídio e simulação) | C | C (art. 13, V) | **R/A** | — |
| 14 | Monitorar a carteira de riscos críticos | Política art. 15, IX | C | I | I | **R/A** | I | C (art. 13, II) | I | — |
| 15 | Reportar a carteira ao Comitê | Política art. 15, V | — | — | — | **R/A** | C | I | I | — |
| 16 | Avaliar a maturidade da gestão de riscos | Política art. 15, II e X | C | — | — | **R/A** | I | I (art. 13, VI) | I | C |
| 17 | Manter o histórico dos riscos por ciclo | Política art. 15, VI | C | — | — | **R/A** | — | — | — | — |
| 18 | Supervisionar a implementação da Política | Política art. 14, I | — | — | — | C | **R/A** | **R** | I | — |
| 19 | Avaliação independente (consultoria e auditoria) | Política art. 16; Decreto art. 18 | C | C | C | C | I | I | I | **R/A** |
| 20 | Dirimir conflitos de atuação | Política art. 19 | C | C | C | C | C | C | **R/A** | — |

> **Na linha 10**, o **A** da CGGE segue o Regimento: a CGGE é a unidade superior da CGOV (art. 37)
> e supervisiona e orienta a Política (Política, art. 14, I). A norma não diz expressamente quem
> responde pelo Plano antes do Comitê. Confirmar na revisão sistêmica, quando as minutas forem
> publicadas.

---

## 7. Tabela de acesso: telas × perfis

**Legenda:**
- **E** = vê e edita, **só a própria unidade**
- **E+** = vê tudo do seu alcance e edita a própria unidade
- **V** = só vê, dentro do seu alcance
- **V\*** = vê tudo, sem limite de unidade
- **A** = age no fluxo (valida, homologa ou consolida)
- **—** = a tela não aparece no menu e a rota é bloqueada

Diretor, Presidência, AUDIT, CGOV, CGGE e GABIN têm alcance total (seção 4). Por isso **E+** neles
significa "vê tudo e edita só a própria unidade".

| Tela (rota) | gestor | CT | GR | CG | Diretor | Presid. | AUDIT | CGOV | CGGE | GABIN |
|---|---|---|---|---|---|---|---|---|---|---|
| Entrar (login) | público | público | público | público | público | público | público | público | público | público |
| Painel (`/`) | V | V | V | V | V\* | V\* | V\* | V\* | V\* | V\* |
| Riscos — lista (`/riscos`) | E | E+ | E+ | E+ | E+ | E+ | V\* | E+ | E+ | E+ |
| Ficha do risco (`/riscos/:id`) | E | E+ | E+ | E+ | E+ | E+ | V\* | E+ | E+ | E+ |
| Novo risco (`/riscos/novo`) | E | E | E | E | E | E | E | E | E | E |
| Objetos de gestão (`/objetos`) | V | V | V | V | V\* | V\* | V\* | **E** (catálogo) | V\* | V\* |
| Monitoramento — KRIs e Plano de ação (`/monitoramento`) | E | E+ | E+ | E+ | E+ | E+ | V\* | E+ | E+ | E+ |
| Aprovações (`/aprovacoes`) | V (as próprias) | **A** (valida) | **A** (valida e homologa) | **A** (valida) | **A** (homologa) | V\* | V\* | V\* | V\* | V\* |
| Apetite a riscos — DAR (`/dar`) | V (vigente) | V | V | V | V | V | V | **E** (simular e propor) | V | V |
| Auditoria — trilha (`/auditoria`) | V | V | V | V | V\* | V\* | V\* | V\* | V\* | V\* |
| Importar riscos (`/importar`) | — | — | — | — | — | — | — | **E** | — | — |
| Usuários e perfis (tela nova da etapa B) | — | — | — | — | — | — | — | **E** | — | — |
| Sobre o RADAR (`/sobre`) | V | V | V | V | V | V | V | V | V | V |

- **"Novo risco" é E para todos** porque, pela Política (art. 17, § 1º), todas essas chefias são
  gestoras de riscos dos próprios processos, inclusive a AUDIT para os processos dela.
- **O Importar é só da CGOV** (P5): é a ferramenta da 2ª linha para trazer as tabelas da skill
  `cgov-gestao-riscos-v4`. Pode ser liberado para os gestores numa versão futura.
- **AUDIT nunca edita riscos de outras unidades**, nem age em aprovações, para preservar a
  independência da 3ª linha (Decreto art. 18, I).

### Exemplos práticos

| Pessoa | O que vê | O que edita ou decide |
|---|---|---|
| Chefe de um PARNA vinculado à CT Y (GR 4) | o PARNA e as Bases Avançadas dele | os riscos do PARNA |
| Coordenador da CT Y | CT Y + todos os NGIs e UCs da CT Y | os riscos da CT Y; **valida** as fichas do PARNA |
| Gerente da GR 4 | GR 4, COAGR, CTs, NGIs e UCs da GR 4 | os riscos da GR 4; **valida** as fichas de UCs sem CT; **homologa** os riscos críticos de toda a GR 4 |
| Coordenador-Geral da CGPRO | CGPRO, COPRO, COFIS, CIAM, CEMIF e divisões **+** riscos de qualquer UC ou GR ligados aos processos de Proteção (2.02.x da Cadeia de Valor) | os riscos da CGPRO; **valida** as fichas das Coordenações da CGPRO |
| Diretor da DIBIO | todas as unidades | os riscos da DIBIO; **homologa** os riscos críticos das unidades da Sede na árvore da DIBIO, inclusive os 14 Centros |
| Auditor da AUDIT | todas as unidades | só os riscos da própria AUDIT |
| Analista da CGOV | todas as unidades | os riscos da CGOV; **consolida** o Plano de Gestão de Riscos |

---

## 8. Como isso vira regra técnica (para a etapa B)

Nada aqui foi implementado ainda. Qualquer mudança em `supabase/migrations/` segue a regra do
projeto: consultar [[matriz-regras-regime-b]] e avisar antes.

1. **Árvore de unidades:** a tabela `unidades` já tem `unidade_pai_id`. Falta ampliar o campo
   `tipo` com `coordenacao-territorial`, `divisao`, `servico`, `setor`, `base-avancada`,
   `orgao-assistencia` (PFE, CORR, AUDIT, OUV…) e `coordenacao-assessoramento`. A carga inicial
   segue a seção 3, só com dados de demonstração até a confirmação da CGTI.
2. **Perfil do usuário:** a tabela `perfis_usuarios` já liga cada pessoa a uma `unidade_id`. O campo
   `papel_governanca` passa dos 4 valores atuais para os 10 perfis da seção 5.
3. **Uma função de alcance, usada em todo lugar:** `unidades_visiveis(usuario)` devolve:
   - **todas as unidades** para `diretor`, `presidencia`, `auditoria`, `cgov`, `cgge` e `gabin`;
   - a própria unidade mais as descendentes (consulta recursiva na árvore) para os demais.
4. **Visão por processo (P1b):** para `coordenador_geral`, a leitura inclui também os riscos cujo
   objeto (`objetos_contexto`) tem `macroprocesso_supervisor_id` igual à CG do usuário.
5. **RLS (a tranca de verdade):**
   - `SELECT` em riscos, controles, KRIs e respostas: permitido se a unidade do risco está no
     alcance (itens 3 e 4).
   - `INSERT` e `UPDATE`: só se a unidade do risco é a unidade do próprio usuário. `auditoria`
     nunca grava fora da própria unidade.
   - Validação (2º degrau): só a chefia imediata na árvore (CT; GR quando não houver CT; CG para
     as Coordenações).
   - Homologação (3º degrau): Gerente Regional para unidades descendentes de uma GR; Diretor para
     as unidades da Sede na árvore dele.
6. **Menu e rotas:** cada rota ganha a lista de perfis permitidos (coluna "—" da seção 7). O menu
   esconde o que a pessoa não pode abrir. Isso é conforto; a segurança está no item 5.
7. **Testes obrigatórios:** um teste por linha dos "Exemplos práticos" provando que cada pessoa
   **não** consegue ler nem gravar fora do seu alcance.

---

## 9. Registro de decisões da CGOV

Decisões tomadas em **2026-11-15** pelo responsável pelo projeto na CGOV.

| # | Pergunta | Decisão | Fundamento |
|---|---|---|---|
| **P1** | Diretores veem os riscos das GRs, CTs e UCs? | **Sim, veem todas as unidades.** | Presidente e Diretores ocupam as cadeiras do Comitê Interno de Governança; a alta administração mantém o sistema de gestão de riscos da organização inteira (Decreto nº 9.203/2017, arts. 15-A e 17). |
| **P1b** | E os Coordenadores-Gerais? | **Própria árvore + visão por processo.** | Regimento, art. 4º (supervisão de macroprocessos) e Cadeia de Valor (Anexo II). |
| **P2** | A CT vê os NGIs, além das UCs? | **Sim, NGIs e UCs.** | Regimento, art. 16. |
| **P3** | Presidência e AUDIT têm perfil próprio? | **Sim, ambos leem tudo.** A AUDIT só lê. | Decreto nº 9.203/2017, arts. 17 e 18; Política, art. 16. |
| **P4** | Quem valida e quem homologa nas unidades descentralizadas? | **Valida a chefia imediata** (CT, ou GR quando não houver CT). **Homologa o Gerente Regional.** | As GRs respondem ao Presidente (Regimento, art. 10, § 2º). |
| **P5** | Quem usa o Importar riscos? | **Só a CGOV, por ora.** | 2ª linha confere a consistência metodológica (Metodologia 4.6). |
| **P6** | Quem cadastra usuários e perfis? | **A CGOV atribui perfil e unidade; a CGTI cuida da conta institucional.** | Regimento, arts. 37 (CGOV) e 67 (CGTI). |
| **P7** | Nome do colegiado nas telas | **Comitê Interno de Governança.** | Política, Metodologia e Decreto nº 9.203/2017, art. 15-A. |
| **P8** | A unidade inclui as subunidades internas? | **Sim, a chefia vê as subunidades.** Quem chefia só a Divisão vê só a Divisão. | Regimento, arts. 9º e 20. |

**Revisão prevista:** quando as minutas da Política e da Metodologia forem publicadas, revisar
esta matriz inteira (seções 4 a 9) contra o texto oficial e registrar as mudanças aqui.
