# Análise de lacunas: código × requisitos (2026-11-22)

Esta nota responde a uma pergunta: **o que os requisitos pedem e o código ainda não faz, e em que ordem
fazer?** Ela é a Tarefa 19 do [[2026-11-20-reestruturacao-documentacao-plan]] e alimenta o [[quadro]].

## 1. De onde vêm os números

A fonte é a coluna **Situação** do catálogo [[requisitos-funcionais]], conferida contra o código na
Tarefa 10 e nas revisões seguintes. Em 2026-11-22, os **195 RF** estão assim:

| Situação | Quantos | O que significa |
| --- | --- | --- |
| implementado | 106 | O código faz, e há teste que prova (unidade, banco ou integração). |
| parcial | 13 | O código faz só uma parte, ou faz tudo mas **falta o teste** que prova. |
| não iniciado | 76 | Não há tabela, campo, função nem tela para aquilo. |

Esta análise não muda nenhum RF, nem `src/`, nem as migrações: ela só liga cada RF pendente a um cartão.

## 2. Como foi priorizado

A ordem segue o plano (Tarefa 19, Step 1) e o [[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]]:

1. **`#normativo` que bloqueia a homologação**: as 6 lacunas em que o RADAR contradiz a norma (LAC-03, 08,
   12, 13, 14 e 15). Elas vêm antes da homologação na CGTI. Junto com elas vai o cartão do importador,
   porque as mesmas regras (categorias, subcategorias, rótulos, KRI) precisam valer antes da primeira
   carga real.
2. **Dívida de dados que muda o esquema**: fazer antes de crescer a base do piloto, para não migrar duas
   vezes. A subcategoria em JSONB vai junto com a LAC-15 (mesma tabela nova).
3. **O restante**: as 8 lacunas omissas ainda abertas (LAC-01, 02, 04 a 07, 09 e 10), que passam à frente
   quando a portaria for publicada (classe `#normativo`), os ajustes funcionais, os testes que faltam, o
   Figma e a documentação.

A LAC-11 saiu da lista: a CGOV decidiu manter o fluxo interno como etapa anterior ao 4.6.1
([[0018-manter-fluxo-interno-como-etapa-anterior-ao-4-6-1|ADR-0018]]).

## 3. RF pendentes × cartão

Cada RF "parcial" ou "não iniciado" tem cartão. Um mesmo RF pode aparecer em duas lacunas (ex.: RF-109
liga a LAC-03 e a LAC-04). Nesse caso ele fica num cartão só: o de maior prioridade e, na mesma
prioridade, o da lacuna de que ele mais depende (o RF-149, da LAC-05 e da LAC-09, ficou com a LAC-09,
porque trata da pendência que persiste depois da cobrança).

### 3.1 Prioridade 1: bloqueiam a homologação

| Cartão | RF | Tabelas | Coluna |
| --- | --- | --- | --- |
| LAC-14 — 8 categorias do Quadro 2 | RF-032, RF-173 | `categorias_risco`, `riscos` | Pronto para iniciar |
| LAC-15 — 6 subcategorias do Quadro 3 (com a dívida da subcategoria em JSONB) | RF-036, RF-174, RF-175 | `categorias_risco`, `riscos` | Pronto para iniciar |
| LAC-12 — rótulos do Quadro 4 | RF-037, RF-176 | — (rótulos no front e no importador) | Pronto para iniciar |
| LAC-13 — "Aceitar" e ação obrigatória no risco crítico | RF-049, RF-050 | `riscos`, `respostas_tratamento` | Pronto para iniciar |
| LAC-03 — KRI obrigatório e completo no risco crítico, por grupo | RF-094, RF-095, RF-096, RF-097, RF-109, RF-183, RF-184 | `indicadores_kri`, `medicoes_kri` | Pronto para iniciar |
| LAC-03 — alerta do KRI (prazo de 10 dias úteis) | RF-102 | `medicoes_kri` | Backlog (depois do Figma P-02) |
| LAC-08 — rito da DAR (minuta, CTGRIC, CIG, portaria) | RF-092, RF-093, RF-122, RF-124, RF-127, RF-130, RF-195 | `categorias_risco` e tabela nova da minuta | Backlog (depois do Figma P-01) |
| Importador antes da primeira carga real | RF-162, RF-171, RF-172, RF-177 a RF-182, RF-185 a RF-188, RF-194 (o RF-183 e o RF-184 ficam na LAC-03) | `riscos`, `controles_existentes`, `indicadores_kri` | Backlog |

O alerta do KRI (RF-102) saiu do cartão da LAC-03 para um cartão próprio, porque pede a tela P-02 aprovada
antes do código. A LAC-08 não foi para "Pronto para iniciar" porque também pede tela nova: antes do código, a CGOV aprova o desenho
P-01 no Figma ([[mapa-telas]] §2). O cartão `[figma] Modelagem — P-01` abre o Backlog.

### 3.2 Prioridade 3: lacunas omissas (puxadas quando a portaria for publicada)

| Cartão | RF |
| --- | --- |
| LAC-01 — Plano de Gestão de Riscos único | RF-112 a RF-121 |
| LAC-02 — CTGRIC, CIG, publicação e reapresentação | RF-123, RF-125, RF-126, RF-128, RF-129, RF-131, RF-132, RF-133, RF-135 |
| LAC-04 — comunicação das 6 hipóteses do 4.7.2 | RF-107, RF-108, RF-110, RF-111, RF-192 |
| LAC-05 — relatório trimestral | RF-147, RF-148 |
| LAC-06 — avaliação gerencial anual | RF-150, RF-151, RF-152 |
| LAC-07 — revisão do Plano | RF-134, RF-136 a RF-139 |
| LAC-09 — carteira crítica e cobrança | RF-140 a RF-143, RF-149 |
| LAC-10 — reavaliação anual | RF-103 a RF-106 |

O RF-120 está no cartão da LAC-01 e também serve à LAC-02. O RF-123 cita as duas na Origem, mas a Situação
do catálogo o põe na LAC-02, e ele ficou lá.

### 3.3 RF pendentes sem lacuna normativa

| RF | Situação | Cartão |
| --- | --- | --- |
| RF-035, RF-038, RF-048, RF-099 | parcial: o código faz, falta o teste | `[dívida] Testes que faltam` (novo) |
| RF-162, RF-171, RF-172 | parcial: o código faz, falta o teste | cartão do importador (prioridade 1) |
| RF-177 a RF-182, RF-185 a RF-188, RF-194 | não iniciado | cartão do importador (prioridade 1); o RF-183 e o RF-184 estão no cartão da LAC-03 |
| RF-063 | parcial: falta o teste pgTAP da unidade sem chefia | `[dívida] Teste pgTAP para a recusa do envio…` |
| RF-078 | parcial: falta o teste pgTAP da devolução pela CGOV em validação | `[dívida] Teste pgTAP para a devolução pela CGOV…` |
| RF-085 | não iniciado: o ator depende de decisão da CGOV | `[funcional] Cargo vago trava o fluxo` |
| RF-189 | Won't (fica fora do escopo) | `[documentação] Decidir onde fica o "um clique"` (só o ADR) |

## 4. Os 6 cartões da revisão da Fase 5

A revisão final da Fase 5 (`/code-review`, 2026-11-21) achou 8 problemas em código já mesclado, agrupados
em 6 cartões. Nenhum é lacuna normativa nem muda o esquema; todos ficam na prioridade 3, em ordem de risco:

| Cartão | Por que nesta posição |
| --- | --- |
| Perfil `real-local` com CSP que bloqueia `localhost` | Quebra o ensaio local do piloto; correção pequena no `docker-compose.yml`. |
| `copia:conferir` acusa cópia atrasada em dia | Alarme falso no aviso de 36 horas (RNF-024); vem antes da cópia agendada (D1, Task 8). |
| `copia:restaurar` e `copia:contar` com `--network host` | Impede a restauração de teste no computador de casa (Docker Desktop). |
| Senha do banco na linha de comando do `copia:contar` | Segurança: a credencial fica no histórico e no `ps`. |
| `ref` do projeto do piloto no repositório público | Decisão de documentação; o `ref` sozinho não dá acesso, mas expõe o alvo. |
| Detalhes da cópia e do ambiente (`[::1]`, duas transações, mensagem do WSL) | Casos raros; juntar à próxima mudança nos scripts. |

## 5. Pendências que estavam fora do quadro

A conferência achou 4 pendências da D1 (Task 6, banco na nuvem) que só estavam em
[[decisoes-tecnicas-d]] e agora têm cartão: D1-P1 (`rls_auto_enable` chamável sem login), D1-P2
(`search_path` das funções do cálculo: perguntar antes), D1-P3 (índices, rever com dados reais) e D1-P4
(comentário do `seed.sql`).

## 6. O que fica para o responsável

- Os cartões de "Pronto para iniciar" mudam banco e regras (LAC-13 e LAC-03 mexem no fluxo, LAC-14 e LAC-15
  em dados do piloto): cada um precisa de plano autorizado antes do código (`AGENTS.md`).
- A grafia final das 8 categorias do Quadro 2 (pendência D3-01) e a regra de conversão das categorias e
  subcategorias já gravadas no piloto são decisões da CGOV, a tomar no plano da LAC-14 e da LAC-15.
