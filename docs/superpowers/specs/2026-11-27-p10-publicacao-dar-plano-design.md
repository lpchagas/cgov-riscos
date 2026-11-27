# P-10 — Registrar a publicação da DAR e do Plano de Gestão de Riscos (desenho no Figma)

> **Data:** 2026-11-27 · **Cartão:** "Modelagem — P-10 Registrar a publicação da DAR e do Plano" no [[quadro]] · **IDs:** UC-25, LAC-08 (RF-130), LAC-02 (RF-131, RF-132), RF-093, RN-060, RN-075, RN-066, RN-054
> **Fontes lidas:** [[mapa-telas]] §2 (linha P-10); [[UC-25-registrar-publicacao-da-dar-e-do-plano]]; LAC-08 em [[lacunas-norma-sistema]]; fluxo F3 (F3.10 a F3.12); [[2026-11-23-p01-dar-proposta-e-rito-design]] (P-01, aprovada).
> **Entrega deste cartão:** só o desenho no Figma, para a CGOV aprovar. Nenhum código, nenhuma migração.

## 1. Por que

Pela Política e pela Metodologia (4.6.7), o Presidente publica por portaria a DAR e o ato que aprova o Plano de
Gestão de Riscos, **fora do RADAR**. O apetite novo só vale depois da portaria (RN-060, RF-093). Hoje o RADAR
não registra portaria nenhuma, e o apetite gravado pela CGOV vale na hora (LAC-08). A P-01 separou a minuta do
apetite vigente; falta a tela em que a CGOV, como Secretaria-Executiva, **registra a publicação**. É esse
registro que faz a minuta virar o apetite vigente.

## 2. Objetivos, não-objetivos e o que seria fracasso

- **Objetivos:** a CGOV registra o número, a data e o link da portaria da DAR (RF-130); antes de confirmar, vê
  o efeito na criticidade; depois, pode **retificar** o registro com motivo, sem apagar nada.
- **Também desenhados, mas inativos:** o ato que aprova o Plano (RF-131) e a divulgação do Plano (RF-132).
  Aparecem com o aviso "depende da P-04", porque o Plano ainda não existe no RADAR (LAC-01, LAC-02).
- **Não-objetivos:** registrar a deliberação do CIG (P-05, UC-18); montar a minuta (P-01); as versões do Plano
  (P-04).
- **Fracasso, mesmo que funcione:** o apetite mudar sem portaria registrada; um registro ou retificação que
  apague o anterior; uma retificação que reavalie os riscos de novo; dados que pareçam uma portaria real.

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Página própria `/plano/publicacao`** (escolhida) | Três blocos empilhados (portaria da DAR, ato do Plano, divulgação), cada um com a sua situação | Um lugar só para os atos do Presidente; os blocos do Plano passam a funcionar ali quando a P-04 existir |
| B. Aba "Publicação" em `/dar` | Terceira aba, ao lado da minuta | O ato e a divulgação do Plano acabariam numa tela da DAR |
| C. Diálogo da etapa 4 da P-01 | Janela aberta pelo link da etapa "Portaria" | Não acomoda os blocos do Plano |

**Decisões do responsável (2026-11-27):**
- desenhar a tela inteira, com só o bloco da DAR ativo;
- página própria (A);
- erro de digitação se corrige por **"Retificar" com motivo obrigatório**: o registro antigo fica no histórico
  e o apetite não é recalculado, porque o conteúdo da DAR não mudou.

## 4. O desenho

### 4.1 A página `/plano/publicacao`

```
Publicação da DAR e do Plano de Gestão de Riscos
ⓘ O Presidente publica os atos fora do RADAR. A CGOV registra aqui o que foi publicado.

┌ 1. Portaria da DAR ───────────────────────── [Pronta para registrar] ┐
│ Aprovada pelo CIG em 05/12/2026 · ver o rito em Apetite (DAR)        │
│ Categorias que mudam:  Operacional  Moderado → Baixo                  │
│                        Integridade  Pendente → Moderado               │
│ Efeito ao publicar: 2 riscos entram e 1 sai do Risco Crítico [Ver]    │
│ Nº da portaria [________]  Data da publicação [__/__/____]            │
│ Link da publicação (opcional) [__________________]                    │
│                                            [Registrar portaria]       │
└───────────────────────────────────────────────────────────────────────┘
┌ 2. Ato que aprova o Plano ─────────────────── [Depende da P-04] ┐
┌ 3. Divulgação do Plano ────────────────────── [Depende da P-04] ┐
```

- **Quem vê:** os 10 perfis leem a página; só a CGOV registra e retifica *(chamada do Claude: a mesma regra
  aprovada na P-01)*.
- **Como se chega:** pelo link "Registrar publicação" da etapa 4 da P-01 e por um item no menu *(chamada do
  Claude)*.

### 4.2 Bloco 1 — Portaria da DAR (ativo)

- **Situação (`Chip`):** "Aguardando o CIG" (a DAR ainda não foi aprovada: o formulário fica travado, com um
  link para a P-01) · "Pronta para registrar" · "Publicada".
- **Antes de registrar:** a data da deliberação do CIG (só leitura, vinda da P-05); as categorias que mudam
  (vigente → minuta); o efeito na criticidade (quantos riscos aprovados entram e saem do Risco Crítico, pela
  mesma prévia da P-01, com "Ver" abrindo a lista num `Dialog`).
- **Campos (`FormField`):** número da portaria (obrigatório); data da publicação (obrigatória, nem no futuro
  nem antes da deliberação do CIG); link para o DOU ou o SEI (opcional) *(chamada do Claude: validações e
  link)*.
- **"Registrar portaria" (`BrButton` primário) → `Dialog` de confirmação:** repete os dados digitados para
  conferência e avisa: "A partir do registro, o apetite da minuta passa a valer no cálculo. Os riscos aprovados
  das categorias que mudaram são reavaliados, e os que passarem a ser críticos voltam à homologação" (RN-054).
- **Depois de registrar:** situação "Publicada", com o número, a data e o link; botão "Retificar"
  (secundário, só para a CGOV) e o **histórico** (registro e retificações, com data, perfil e motivo, sem
  nome de pessoa no desenho).
- **"Retificar" → `Dialog`:** muda só o número, a data ou o link, com motivo obrigatório. O aviso: "A
  retificação corrige o registro. O apetite e a criticidade não mudam."

### 4.3 Blocos 2 e 3 — Plano (inativos)

- **Ato que aprova o Plano (RF-131):** os mesmos campos (número, data, link), travados, com o `BrMessage`
  "Depende da tela do Plano de Gestão de Riscos (P-04)". Nota: falta o modelo de portaria do Plano no Anexo
  III (alerta F5-08b).
- **Divulgação do Plano (RF-132):** intranet e transparência ativa, cada uma com data e link; prazo de "dia N
  de 10 dias úteis" contado do ato do Plano (RN-066); aviso de que as informações com restrição de acesso da
  Lei nº 12.527/2011 não são divulgadas (RN-075). Tudo travado, com o mesmo aviso.

### 4.4 Quadros a desenhar

A tela é nova, então não há 📌 Original para comparar. Será criada a página **✏️ Trabalho — Publicação (DAR e
Plano)**, e a 📌 Original só depois do código (o mesmo caminho da P-03) *(chamada do Claude)*. Os quadros:

1. "P-10 · Pronta para registrar": computador 1440 e celular 390;
2. "P-10 · Confirmar o registro" (diálogo): computador 1440;
3. "P-10 · Publicada, com histórico": computador 1440 e celular 390;
4. "P-10 · Retificar" (diálogo): computador 1440.

Só componentes da biblioteca RADAR — Painel, pelas skills `figma:figma-use` e `figma:figma-generate-design`.
Se faltar componente ou variante, o quadro usa texto ao lado e a falta vira nota, sem criar componente novo
neste cartão. **Dados de demonstração claramente fictícios** (ex.: "Portaria nº 000/2026 (exemplo)"), sem
nome de pessoa e sem imitar um ato real.

## 5. Regras que o desenho respeita

Risco Crítico é o residual fora do apetite da DAR, nunca o nível Extremo (> 17 a 25); classes pelo Quadro 8,
sem arredondar; inerente pelo Quadro 7, nunca P × I; "Plano de Gestão de Riscos" por extenso; apetite só Baixo
ou Moderado, ou pendente de DAR (RN-055, RN-010).

## 6. O que fica para o código (cartão da LAC-08)

O modelo de dados (registro da portaria e das retificações, ligado à minuta da P-01), a regra no banco de que
o apetite só muda pelo registro da portaria e a reavaliação pelo gatilho atual (RN-054) ficam para o plano da
LAC-08, com a migração autorizada nele.
