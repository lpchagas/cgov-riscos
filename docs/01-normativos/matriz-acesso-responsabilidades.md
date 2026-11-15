---
tipo: referencia
data: 2026-11-15
status: "Proposta — aguarda validação da CGOV nos pontos da seção 9"
fontes:
  - "Portaria ICMBio nº 5.592/2025 — Regimento Interno (DOU 31/12/2025)"
  - "Minuta da Política de Gestão de Riscos — RADAR (SEI 024241420)"
  - "Minuta da Metodologia de Gestão de Riscos (SEI 024421455)"
  - "Orientações da CGOV sobre visibilidade por cargo (2026-11-15)"
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
A seção 8 diz como isso vira regra técnica. A seção 9 lista o que a CGOV ainda precisa decidir.
Onde está escrito **(proposta)**, a regra não vem de norma nem das orientações da CGOV. É uma
sugestão deste documento e deve ser confirmada.

---

## 1. Fontes e o que cada uma decide

| Fonte | O que ela decide aqui |
|---|---|
| **Regimento Interno** (Portaria nº 5.592/2025) | Quem está abaixo de quem: a árvore de unidades (seção 3). |
| **Política RADAR** (minuta SEI 024241420), arts. 12 a 19 | Papéis na gestão de riscos: 1ª, 2ª e 3ª linha, CGOV, CGGE, CTGRIC, Comitê Interno de Governança, AUDIT. |
| **Metodologia** (minuta SEI 024421455), item 4.6 | Como o Plano de Gestão de Riscos é consolidado (CGOV) e aprovado (Comitê Interno de Governança). |
| **Orientações da CGOV** (2026-11-15) | Quem enxerga o quê (seção 4). |

---

## 2. Dois conceitos que não podem se misturar

| Conceito | Pergunta | Exemplo |
|---|---|---|
| **Alcance** (visibilidade) | *De quais unidades eu vejo os riscos?* | A Gerente Regional vê os riscos da GR, das CTs e das UCs vinculadas. |
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

### Achados do Regimento que afetam as regras de acesso

**A1. As GRs respondem ao Presidente, não às Diretorias.**
O art. 10, § 2º, subordina as Gerências Regionais ao Presidente. Seguindo só a hierarquia, nenhum
Diretor ou Coordenador-Geral teria GRs, CTs ou UCs "abaixo" dele. Mas as Diretorias têm a
incumbência de "orientar e supervisionar a execução das atividades finalísticas pelas unidades
descentralizadas" (art. 183, II), e as CGs supervisionam macroprocessos (art. 4º). Isso conflita
com a orientação da CGOV, que inclui CTs e GRs na visão de CGs e Diretores. É a **decisão pendente
P1** (seção 9).

**A2. A única Diretoria com unidades descentralizadas subordinadas é a DIBIO.**
Os 14 Centros Nacionais de Pesquisa e Conservação são supervisionados pela DIBIO
(art. 143, XII). Pela hierarquia, o Diretor da DIBIO vê os Centros e as Bases Avançadas deles.

**A3. As CTs coordenam UCs *e* NGIs.**
O art. 16 fala em "Núcleos de Gestão Integrada e Unidades de Conservação". A orientação da CGOV
citou só UCs. **(proposta)** Incluir os NGIs no alcance da CT (decisão **P2**).

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
A Política e a Metodologia usam "Comitê Interno de Governança". O Regimento fala em "Comitê Gestor"
(arts. 22 e 177), e o modelo de portaria da DAR (Anexo da Metodologia) diz "Comitê Gestor". O
sistema deve usar um nome só nas telas (decisão **P7**).

---

## 4. Orientações da CGOV traduzidas em regra

| Cargo | Orientação da CGOV (2026-11-15) | Regra de alcance (leitura) |
|---|---|---|
| **Gestor** (chefe de UC, NGI, Coordenação, Divisão, responsável por processo) | só vê riscos da própria unidade | `própria unidade` |
| **Coordenador Territorial** | própria unidade + UCs subordinadas | `própria CT` + UCs (e NGIs, **P2**) cuja unidade superior é a CT |
| **Gerente Regional** | própria unidade + CTs + UCs subordinadas | `própria GR` + todas as unidades descendentes (subunidades da GR, CTs, NGIs, UCs) |
| **Coordenador-Geral** | própria unidade + unidades subordinadas | `própria CG` + descendentes (Coordenações, Divisões…) + **P1** |
| **Diretor** | própria unidade + unidades subordinadas, envolvendo Centros, CTs e GRs | `própria Diretoria` + descendentes (CGs, Centros no caso da DIBIO) + **P1** |
| **CGOV, CGGE, GABIN** | veem tudo | `todas as unidades` |

**Regra geral para implementar:** "subordinada" significa **descendente na árvore da seção 3**,
em qualquer profundidade. Exemplo: a GR enxerga a UC mesmo quando existe uma CT entre as duas.

---

## 5. Perfis do RADAR (substituem os 4 perfis simulados)

Hoje o simulador tem `gestor`, `lider_cg`, `diretor` e `cgov`. O Regimento pede mais níveis.
**(proposta)**

| Perfil | Quem recebe (cargo no Regimento) | Linha (Política) | Alcance de leitura | Escreve fichas de | Fluxo extra |
|---|---|---|---|---|---|
| `gestor` | Chefes de UC e NGI, Coordenadores, Chefes de Divisão/Serviço/Setor, Coordenadores de Centro, Chefe da ACADEBio, responsáveis por processo; Procurador-Chefe, Corregedor, Ouvidor, CGCS | 1ª | própria unidade | própria unidade | — |
| `coordenador_territorial` | Coordenador Territorial (art. 193) | 1ª | CT + UCs/NGIs vinculados | própria CT | valida 2º degrau das UCs/NGIs da CT (**P4**) |
| `gerente_regional` | Gerente Regional (art. 191) | 1ª | GR + todas as descendentes | própria GR | valida 2º degrau das unidades sem CT; homologa riscos críticos da GR (**P4**) |
| `coordenador_geral` | Coordenadores-Gerais (art. 185) | 1ª | CG + descendentes + **P1** | própria CG | valida 2º degrau das Coordenações da CG |
| `diretor` | Diretores (arts. 182–183) | 1ª | Diretoria + descendentes + **P1** | própria Diretoria | homologa riscos críticos (3º degrau) |
| `cgov` | Servidores da CGOV (art. 37) | 2ª | tudo | própria CGOV | consolida o Plano de Gestão de Riscos, simula a DAR, importa tabelas, mantém o catálogo de objetos e administra usuários (**P6**) |
| `cgge` | Servidores da CGGE (art. 36) | supervisão | tudo | própria CGGE | — (só leitura fora da própria unidade) |
| `gabin` | Chefe de Gabinete e equipe (arts. 22 e 177) | apoio à alta administração | tudo | próprio GABIN | — |
| `presidencia` **(proposta)** | Presidente e Assessoria | alta administração | tudo | Presidência | — (**P3**) |
| `auditoria` **(proposta)** | Auditor-Chefe e AUDIT (art. 31; Política art. 16) | 3ª | tudo, **somente leitura** | própria AUDIT | — (avaliação independente, **P3**) |

**Uma pessoa, uma unidade, um perfil.** Quem acumula funções (por exemplo, substituto) recebe o
perfil do cargo de maior alcance enquanto durar a substituição. O registro da troca fica na
trilha de auditoria.

---

## 6. Matriz de responsabilidade (RACI)

**Legenda:** **R** = executa · **A** = responde pelo resultado (aprova) · **C** = é consultado ·
**I** = é informado. "Chefia superior" é a unidade imediatamente acima na árvore (CT, GR, CG ou
Diretor, conforme o caso).

| # | Atividade | Fundamento | Gestor de riscos | Chefia superior | Diretor | CGOV | CGGE | CTGRIC | Comitê Int. Governança | AUDIT |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Identificar, analisar e avaliar riscos dos seus processos | Política art. 17, I | **R/A** | I | — | C | — | — | — | — |
| 2 | Avaliar controles (com trava de evidência) | Metodologia, Quadro 6 | **R/A** | I | — | C | — | — | — | — |
| 3 | Definir tratamento e ao menos 1 KRI para risco crítico | Política art. 8º, § 2º | **R/A** | I | — | C | — | — | — | — |
| 4 | Validar a ficha de risco (2º degrau) **(proposta: fluxo RADAR)** | — | I | **R/A** | I | I | — | — | — | — |
| 5 | Homologar risco crítico (3º degrau) **(proposta: fluxo RADAR)** | — | I | C | **R/A** (ou GR, **P4**) | I | — | — | — | — |
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
| 19 | Avaliação independente (consultoria e auditoria) | Política art. 16 | C | C | C | C | I | I | I | **R/A** |
| 20 | Dirimir conflitos de atuação | Política art. 19 | C | C | C | C | C | C | **R/A** | — |

> **Na linha 10**, o **A** da CGGE é uma **(proposta)**. A CGGE "supervisiona e orienta" a Política
> (art. 14, I) e é a unidade superior da CGOV no Regimento (art. 37). A norma não diz
> expressamente quem responde pelo Plano antes do Comitê.

---

## 7. Tabela de acesso: telas × perfis

**Legenda:**
- **E** = vê e edita, **só a própria unidade**
- **E+** = vê tudo do seu alcance e edita a própria unidade
- **V** = só vê, dentro do seu alcance
- **V\*** = vê tudo, sem limite de unidade
- **A** = age no fluxo (valida, homologa ou consolida)
- **—** = a tela não aparece no menu e a rota é bloqueada

| Tela (rota) | gestor | CT | GR | CG | Diretor | CGOV | CGGE | GABIN | Presid.\* | AUDIT\* |
|---|---|---|---|---|---|---|---|---|---|---|
| Entrar (login) | público | público | público | público | público | público | público | público | público | público |
| Painel (`/`) | V | V | V | V | V | V\* | V\* | V\* | V\* | V\* |
| Riscos — lista (`/riscos`) | E | E+ | E+ | E+ | E+ | E+ (V\*) | E+ (V\*) | E+ (V\*) | V\* | V\* |
| Ficha do risco (`/riscos/:id`) | E | E+ | E+ | E+ | E+ | E+ (V\*) | E+ (V\*) | E+ (V\*) | V\* | V\* |
| Novo risco (`/riscos/novo`) | E | E | E | E | E | E | E | E | E | E |
| Objetos de gestão (`/objetos`) | V | V | V | V | V | **E** (catálogo) | V\* | V\* | V\* | V\* |
| Monitoramento — KRIs e Plano de ação (`/monitoramento`) | E | E+ | E+ | E+ | E+ | V\* | V\* | V\* | V\* | V\* |
| Aprovações (`/aprovacoes`) | V (as próprias) | **A** | **A** | **A** | **A** | V\* | V\* | V\* | V\* | V\* |
| Apetite a riscos — DAR (`/dar`) | V (vigente) | V | V | V | V | **E** (simular e propor) | V | V | V | V |
| Auditoria — trilha (`/auditoria`) | V | V | V | V | V | V\* | V\* | V\* | V\* | V\* |
| Importar riscos (`/importar`) | — | — | — | — | — | **E** | — | — | — | — |
| Usuários e perfis (tela nova da etapa B) | — | — | — | — | — | **E** (**P6**) | — | — | — | — |
| Sobre o RADAR (`/sobre`) | V | V | V | V | V | V | V | V | V | V |

\* Perfis **(proposta)**, decisão **P3**.

**Por que "Novo risco" é E para todos:** pela Política (art. 17, § 1º), todas essas chefias são
gestoras de riscos dos próprios processos, inclusive a CGOV, a CGGE, o GABIN e a AUDIT.
**Por que o Importar é só da CGOV:** é a ferramenta da 2ª linha para trazer as tabelas da skill
`cgov-gestao-riscos-v4` (decisão **P5**, caso os gestores devam importar as próprias tabelas).

### Exemplos práticos

| Pessoa | O que vê | O que edita |
|---|---|---|
| Chefe de um PARNA vinculado à CT Y (GR 4) | só os riscos do PARNA | os riscos do PARNA |
| Coordenador da CT Y | CT Y + o PARNA + os demais NGIs e UCs da CT Y | só os riscos da CT Y; **valida** as fichas do PARNA |
| Gerente da GR 4 | GR 4, COAGR, CTs, NGIs e UCs da GR 4 | só os riscos da GR 4 |
| Diretor da DIBIO | DIBIO, COTAB, CGCON, CGIMP, CGPEQ e coordenações, 14 Centros e Bases Avançadas (+ **P1**) | só os riscos da DIBIO; **homologa** riscos críticos |
| Analista da CGOV | todas as unidades | riscos da CGOV; **consolida** o Plano de Gestão de Riscos |

---

## 8. Como isso vira regra técnica (para a etapa B)

Nada aqui foi implementado ainda. Qualquer mudança em `supabase/migrations/` segue a regra do
projeto: consultar [[matriz-regras-regime-b]] e avisar antes.

1. **Árvore de unidades:** a tabela `unidades` já tem `unidade_pai_id`. Falta ampliar o campo
   `tipo` com `coordenacao-territorial`, `divisao`, `servico`, `setor`, `base-avancada`,
   `orgao-assistencia` (PFE, CORR, AUDIT, OUV…) e `coordenacao-assessoramento`. A carga inicial
   segue a seção 3.
2. **Perfil do usuário:** a tabela `perfis_usuarios` já liga cada pessoa a uma `unidade_id`. O campo
   `papel_governanca` passa dos 4 valores atuais para os perfis da seção 5.
3. **Uma função de alcance, usada em todo lugar:** `unidades_visiveis(usuario)` devolve a própria
   unidade mais as descendentes (consulta recursiva na árvore), ou todas, para `cgov`, `cgge`,
   `gabin`, `presidencia` e `auditoria`.
4. **RLS (a tranca de verdade):**
   - `SELECT` em riscos, controles, KRIs e respostas: permitido se a unidade do risco está em
     `unidades_visiveis(auth.uid())`.
   - `INSERT` e `UPDATE`: só se a unidade do risco é a unidade do próprio usuário.
   - Validação e homologação: só pela chefia superior e pelo perfil indicado na seção 6.
5. **Visão por processo (se a CGOV escolher a opção B em P1):** a tabela `objetos_contexto` já tem
   `macroprocesso_supervisor_id` (CG) e `diretoria_id`. A função de alcance passaria a incluir os
   riscos de qualquer unidade cujo objeto aponte para a CG ou a Diretoria do usuário.
6. **Menu e rotas:** cada rota ganha a lista de perfis permitidos (coluna "—" da seção 7). O menu
   esconde o que a pessoa não pode abrir. Isso é conforto; a segurança está no item 4.
7. **Testes obrigatórios:** um teste por linha dos "Exemplos práticos" provando que cada pessoa
   **não** consegue ler nem gravar fora do seu alcance.

---

## 9. Decisões pendentes da CGOV

| # | Pergunta | Opções | Recomendação deste documento |
|---|---|---|---|
| **P1** | Diretores e CGs veem riscos das GRs, CTs e UCs? O Regimento subordina as GRs ao Presidente (art. 10, § 2º). | **A)** Só a hierarquia: a DIBIO vê os Centros; nenhuma Diretoria vê GRs. **B)** Hierarquia + visão por processo: veem os riscos de qualquer unidade quando o processo pertence ao seu macroprocesso (Cadeia de Valor, Anexo II). **C)** Diretores veem todas as GRs. | **B**, porque segue a supervisão finalística prevista no art. 183, II, e o dado já existe em `objetos_contexto`. |
| **P2** | O Coordenador Territorial vê os NGIs, além das UCs? | Sim / Não | **Sim** (art. 16 cita os dois). |
| **P3** | Presidência e AUDIT têm perfil próprio? | Sim, leitura total / Não, só a própria unidade | **Sim.** A AUDIT é a 3ª linha (Política art. 16) e precisa ler tudo para avaliar. Somente leitura preserva a independência. |
| **P4** | Quem valida (2º degrau) e quem homologa riscos críticos (3º degrau) nas unidades descentralizadas? | Validação: CT, ou GR quando não houver CT. Homologação: GR ou Diretoria finalística. | Validação pela **chefia imediata** na árvore; homologação pelo **Gerente Regional**, porque as GRs respondem ao Presidente. |
| **P5** | Gestores podem importar as próprias tabelas da skill? | Só CGOV / todos, para a própria unidade | Só CGOV no início; liberar depois. |
| **P6** | Quem cadastra usuários e atribui perfis? | CGOV / CGTI / ambos | **CGOV** atribui perfil e unidade. A CGTI cuida da conta institucional na homologação (etapa D). |
| **P7** | Nome do colegiado nas telas | "Comitê Interno de Governança" / "Comitê Gestor" | Seguir a Política: **Comitê Interno de Governança**. |
| **P8** | Uma "unidade" inclui as Divisões, Serviços, Setores e Bases Avançadas dela? Exemplo: o chefe de uma UC vê os riscos da Base Avançada da UC? | Sim / Não | **Sim**: a chefia vê as subunidades internas. Quem chefia só a Divisão vê só a Divisão. |

Quando a CGOV decidir, atualize esta tabela com a data e a resposta, retire as marcas
**(proposta)** correspondentes e registre a decisão no [[ESTADO-ATUAL]].
