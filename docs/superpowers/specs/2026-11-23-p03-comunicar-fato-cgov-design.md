# P-03 — Comunicações à CGOV (6 hipóteses do 4.7.2): desenho no Figma

> **Data:** 2026-11-23 · **Cartão:** "Modelagem — P-03 Comunicar fato de risco à CGOV" no [[quadro]] · **IDs:** UC-16, LAC-04, RF-107, RF-108, RF-109, RF-111, RF-192, RN-084, RN-085, RN-086
> **Fontes lidas:** [[mapa-telas]] §2 (linha P-03); [[UC-16-comunicar-fato-de-risco-a-cgov]]; LAC-04 em [[lacunas-norma-sistema]]; desenho P-02 (`2026-11-23-p02-tratar-alerta-kri-design.md`).
> **Entrega deste cartão:** só o desenho no Figma, para a CGOV aprovar. Nenhum código, nenhuma migração.

## 1. Por que

Pela Metodologia 4.7.2 (incisos I a VI) e pela Política (art. 17, IV), o gestor comunica à CGOV, em até 10
dias úteis da ciência, os fatos das 6 hipóteses. O RADAR não registra nada disso hoje (LAC-04, omissão). A
tela também é o destino do botão "Comunicar à CGOV" do alerta do KRI (P-02): o responsável decidiu (2026-11-23)
desenhar a P-03 antes do código do alerta, para que a comunicação tenha uma porta só.

## 2. Objetivos, não-objetivos e o que seria fracasso

- **Objetivos:** o gestor registra a comunicação com a hipótese, a data da ciência e o prazo de 10 dias úteis
  à vista (RF-107, RF-108, RF-192); a comunicação vinda do alerta do KRI marca as hipóteses I a III que supre
  (RF-109); a CGOV vê as comunicações e registra a ciência (RF-111).
- **Não-objetivos:** a sugestão automática de comunicar quando a gravação muda a criticidade (RF-110, Could:
  mexe na ficha do risco); a cobrança das pendências pela CGOV (P-07); a revisão do Plano (P-08).
- **Fracasso, mesmo que funcione:** duas portas para registrar a mesma comunicação (alerta do KRI e tela
  própria); apagar ou editar uma comunicação gravada; o prazo impedir a gravação (fora do prazo, o gestor
  ainda precisa comunicar).

## 3. Abordagens consideradas

| | Como seria | Troca |
| --- | --- | --- |
| **A. Página própria com lista e painel lateral** (escolhida) | `/comunicacoes` com a lista; "Nova comunicação" abre o formulário em `SideSheet`; a CGOV registra a ciência no mesmo painel | Uma porta para as 6 hipóteses; lista e formulário juntos |
| B. Lista e formulário em páginas separadas | `/comunicacoes` e `/comunicacoes/nova` | Mais espaço, mas vaivém entre páginas |
| C. Só na ficha do risco | Ação na ficha; a CGOV recebe no Painel | Não serve ao risco emergente (IV), que não tem ficha |

**Decisões do responsável (2026-11-23):** desenhar a P-03 antes do código do alerta do KRI (sem janela
provisória); a CGOV **registra ciência** (data e observação opcional), sem devolver nem reprovar; layout A.

## 4. O desenho

### 4.1 Lista (`/comunicacoes`)

```
Comunicações à CGOV                                  [+ Nova comunicação]
[ Todas | Novas (2) | Ciência registrada ]
Hipótese              Risco           Ciência   Comunicação  Prazo          Situação
I  Mudança de nível   RADAR-2026-001  21/11     25/11        no prazo        Nova
IV Risco emergente    —               10/11     26/11        fora do prazo   Ciência registrada
```

- `PageHeader`, `BrMessage` informativo com a regra ("Comunique à CGOV em até 10 dias úteis da ciência do fato
  (Metodologia 4.7.2). A comunicação gravada não se apaga."), filtro `SegmentedControl` (Todas · Novas ·
  Ciência registrada) e `DataTable` paginada.
- **Prazo** na lista: "no prazo" ou "fora do prazo", contado da ciência até a data da comunicação.
- **Gestor** vê as comunicações da própria unidade; **CGOV** vê todas, com a coluna Unidade; quem só consulta
  (ex.: AUDIT) vê sem botões *(chamada do Claude, pela linha "Monitoramento" da Matriz §7)*.
- **Menu:** item "Comunicações à CGOV" no grupo GESTÃO DE RISCOS, depois de Monitoramento; para a CGOV, com
  selo do número de novas *(chamada do Claude)*.

### 4.2 Painel "Nova comunicação" (`SideSheet`)

- **Hipótese** (`FormField` lista, obrigatória): I a VI, com a explicação curta de cada uma.
- **Data da ciência do fato** (obrigatória) e, logo abaixo, o prazo: "dia N de 10 dias úteis (vence em
  dd/mm)"; passado o prazo, `BrMessage` de aviso "Comunicação fora do prazo de 10 dias úteis" (não bloqueia).
- **Risco ligado** (`FormField` lista): obrigatório em I, II, III e V; opcional em IV e VI *(chamada do Claude:
  o risco emergente ainda não tem ficha)*.
- **Descrição do fato** (obrigatória), **Providências ou resultado da reavaliação** e **Documento SEI**
  (opcional).
- A **data da comunicação** é a da gravação, posta pelo sistema.
- **Vindo do alerta do KRI (P-02):** o painel abre com a hipótese "Resultado da reavaliação por alerta do KRI",
  a data da ciência do alerta e os riscos ligados ao KRI; caixas "Esta comunicação supre as hipóteses I, II,
  III" (RF-109, RN-085). Ao gravar, o alerta do KRI fica "comunicado".
- Ações: "Cancelar" e "Enviar à CGOV". Depois de enviada, a comunicação é só leitura.

### 4.3 Painel da comunicação recebida (CGOV)

- Mostra todos os campos, só leitura, com "Recebida em dd/mm" e o prazo cumprido ou não.
- **Registrar ciência:** observação opcional e botão "Registrar ciência"; a situação passa a "Ciência
  registrada em dd/mm". O gestor vê essa situação na lista e no painel.

### 4.4 Quadros a desenhar

Página nova **✏️ Trabalho — Comunicações** (a 📌 Original nasce depois do código), seção "P-03 · …":

1. Lista do gestor — computador 1440;
2. Nova comunicação vinda do alerta do KRI (painel aberto sobre a lista) — computador 1440;
3. Comunicação recebida, CGOV registra ciência — computador 1440;
4. Lista e painel no celular — 390.

Só componentes da biblioteca (`PageHeader`, `BrMessage`, `SegmentedControl`, `DataTable`, `SideSheet`,
`FormField`, `BrButton`, `Chip`, `ItemMenu`, `BrHeader`, `BrFooter`). Dados de demonstração, sem nome de
pessoa.

## 5. Regras que o desenho respeita

Risco Crítico é o residual fora do apetite da DAR, nunca o nível Extremo (> 17 a 25); "Plano de Gestão de
Riscos" por extenso; prazo em dias úteis, contado da ciência (RN-086).

## 6. O que fica para o código

Tabela de comunicações (hipótese, ciência, comunicação, risco opcional, hipóteses supridas, origem no alerta
do KRI, ciência da CGOV), sem apagar nem editar depois de enviada; RLS por unidade; calendário de dias úteis
(o mesmo do alerta do KRI); a ligação com o alerta do KRI.
