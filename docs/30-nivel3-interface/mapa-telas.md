---
tipo: mapa
nivel: 3
data: 2026-11-21
---

# Mapa de telas: rota, caso de uso, perfil e Figma

Este mapa liga cada **tela** do RADAR a quatro coisas: o **endereço** (rota) e o arquivo `.vue` que a desenha,
os **casos de uso** que ela atende ([[casos-de-uso/README|índice dos casos de uso]]), os **perfis** que a abrem
(tabela da seção 7 de [[matriz-acesso-responsabilidades]]) e a **página no Figma** (arquivo "RADAR — Painel",
pares 📌 Original × ✏️ Trabalho, ver [[manual-fluxo-figma-vscode]]).

**Como foi conferido (2026-11-21):**

- **Rota e View:** o nome antes do arquivo é o que a coluna **Tela** da [[rastreabilidade]] usa. Lidas em `src/router/index.ts` e `src/views/`. As rotas antigas (`/dar-apetite`,
  `/novo-risco`, `/monitoramento-kris`, `/validacao-um-clique`, `/importar-skill`) só redirecionam para as novas.
- **UC atendidos:** os casos de uso das linhas da [[rastreabilidade]] que citam a rota.
- **Perfis:** a legenda da matriz §7: **E** edita a própria unidade; **E+** vê o alcance e edita a própria
  unidade; **V** só vê no alcance; **V\*** vê tudo; **A** age no fluxo (valida, homologa); **—** não abre.
  No código, só `/importar` e `/usuarios` ficam restritas à CGOV (`ROTAS_SO_CGOV` em `src/utils/acessoPorPerfil.ts`);
  as demais abrem para os 10 perfis e o banco (RLS) limita o que cada um vê e grava.
- **Página Figma:** lista de páginas lida no arquivo pelo MCP do Figma, só leitura.
- **Componentes Code Connect:** só os componentes **da biblioteca do Figma** que a View importa (os que não estão na biblioteca, como `EstadoCarregamento`, `ErroPagina`, `AcoesDoRisco` e `FormularioPessoa`, ficam fora da coluna) e que estão ligados no Code
  Connect (mapa lido no Figma: os 23 conjuntos da biblioteca estão ligados; o conjunto `Icone` fica sem
  ligação de propósito, porque no código os ícones são Font Awesome). Toda tela também usa a moldura
  `BrHeader`, `BrMenu` (no Figma, `ItemMenu`), `BrFooter` e `ToastRegion` (no Figma, `Toast`), que vêm do
  `App.vue` e não se repetem na tabela.

## 1. Telas que existem

| Rota | View (.vue) | UC atendidos | Perfis (matriz §7) | Página Figma (Original/Trabalho) | Componentes Code Connect | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| `/entrar` | Entrar: `EntrarView.vue` | UC-01 | público | — (sem página) | BrButton, FormField, BrMessage | implementada; sem par no Figma |
| `/entrar/retorno` | Retorno do link: `EntrarRetornoView.vue` | UC-01 | público | — (sem página) | nenhum | implementada; sem par no Figma |
| `/acesso-nao-liberado` | Acesso não liberado: `AcessoNaoLiberadoView.vue` | UC-01 | público | — (sem página) | BrButton, BrMessage | implementada; sem par no Figma |
| `/` | Painel: `PainelConsolidadoCgovView.vue` | UC-15, UC-20 | V (gestor, CT, GR, CG); V\* (demais) | 📌 Original — Painel / ✏️ Trabalho — Painel | RiskBadge, Chip, StatCard, MatrizCalorAssimetrica (no Figma, `MatrizCelula`), PageHeader, EmptyState, DataTable, BlocoRecolhivel, PainelConsolidadoCgovView (no Figma, `ItemAtencao`) | implementada |
| `/riscos` | Riscos (lista): `RiscosListaView.vue` | UC-06, UC-20 | E (gestor); V\* (AUDIT); E+ (demais) | — (sem página) | RiskBadge, Chip, BrButton, PageHeader, FormField, EmptyState, DataTable, SideSheet, MemoriaCalculoBar | implementada; sem par no Figma |
| `/riscos/novo` | Novo risco: `FormularioRiscoView.vue` | UC-05, UC-06, UC-07, UC-08, UC-11, UC-12, UC-24 | E (todos) | 📌 Original — Novo risco / ✏️ Trabalho — Novo risco | BrButton, PageHeader, FormField, EmptyState, MemoriaCalculoBar, BrStep, BrMessage | implementada (UC-24 é proposto: ver P-09) |
| `/riscos/:id` | Ficha do risco: `FichaDetalheBowTieView.vue` | UC-08, UC-09, UC-10, UC-11, UC-12, UC-20 | E (gestor); V\* (AUDIT); E+ (demais) | 📌 Original — Ficha do risco / ✏️ Trabalho — Ficha do risco | RiskBadge, Chip, EmptyState, MemoriaCalculoBar, BrTabs, BowTieDiagram | implementada |
| `/objetos` | Objetos de gestão: `CatalogoObjetosView.vue` | UC-04 | V (gestor, CT, GR, CG); E (CGOV); V\* (demais) | 📌 Original — Objetos de gestão / ✏️ Trabalho — Objetos de gestão | Chip, BrButton, PageHeader, FormField, EmptyState, DataTable, SideSheet, Dialog, BrMessage | implementada |
| `/monitoramento` | Monitoramento: `MonitoramentoKriPlanoAcaoView.vue` | UC-07, UC-08, UC-15 | E (gestor); V\* (AUDIT); E+ (demais) | 📌 Original — Monitoramento / ✏️ Trabalho — Monitoramento | Chip, StatCard, BrButton, FormField, EmptyState, DataTable, Dialog, BrTabs, BrMessage | implementada (UC-15 parcial, LAC-03: ver P-02) |
| `/aprovacoes` | Aprovações: `CaixaValidacaoUmCliqueView.vue` | UC-09, UC-10, UC-11 | V (gestor, as próprias); A (CT, GR, CG, Diretor, Presidência, GABIN); V\* (AUDIT, CGOV, CGGE) | 📌 Original — Aprovações / ✏️ Trabalho — Aprovações | RiskBadge, Chip, EmptyState, MemoriaCalculoBar, BrTabs, BrMessage | implementada |
| `/dar` | Apetite (DAR): `DeclaracaoApetiteDarView.vue` | UC-06, UC-10, UC-14, UC-25 | V (todos); E (CGOV: simular e propor) | 📌 Original — Apetite (DAR) / ✏️ Trabalho — Apetite (DAR) | RiskBadge, StatCard, BrButton, FormField, SegmentedControl, EmptyState, DataTable, Dialog, BrMessage | implementada; hoje a CGOV muda o apetite direto (LAC-08: ver P-01); UC-25 é proposto (ver P-10) |
| `/auditoria` | Auditoria: `TrilhaAuditoriaGovernancaView.vue` | UC-02, UC-05, UC-14, UC-20 | V (gestor, CT, GR, CG); V\* (demais) | 📌 Original — Auditoria / ✏️ Trabalho — Auditoria | BrButton, FormField, EmptyState | implementada |
| `/importar` | Importar riscos: `ImportadorSkillView.vue` | UC-12, UC-13 | E (só CGOV); — (demais) | 📌 Original — Importar riscos / ✏️ Trabalho — Importar riscos | RiskBadge, Chip, BrButton, FormField, DataTable, BrMessage | implementada |
| `/usuarios` | Usuários e perfis: `UsuariosPerfisView.vue` | UC-02 | E (só CGOV); — (demais) | — (sem página) | Chip, BrButton, PageHeader, FormField, EmptyState, Skeleton, DataTable, SideSheet, Dialog, BrMessage | implementada; sem par no Figma |
| `/sobre` | Sobre o RADAR: `SobreRadarView.vue` | — (página informativa) | V (todos) | 📌 Original — Sobre o RADAR / ✏️ Trabalho — Sobre o RADAR | nenhum | implementada |

Cinco telas implementadas não têm par no Figma: `/riscos`, `/usuarios` e as três de acesso (`/entrar`,
`/entrar/retorno`, `/acesso-nao-liberado`). Desenhá-las é o caminho inverso do manual (código → Figma,
Receita C), fica para quando a CGOV pedir mudança nelas.

## 2. Telas a prototipar (casos de uso propostos ou parciais)

Os casos de uso UC-14 a UC-19 e UC-21 a UC-26 ainda não têm tela, ou têm só um pedaço dela. Cada linha
abaixo é uma tela a **prototipar** no Figma antes de qualquer código. As rotas são **sugestões** de
endereço, a confirmar no protótipo; os perfis não estão na matriz §7, que só cobre as telas de hoje, e
ficam para decidir com a CGOV (a tabela diz o ator principal do caso de uso). Cada tela tem um cartão
`[figma] Modelagem` no [[quadro]].

| Rota | View (.vue) | UC atendidos | Perfis (matriz §7) | Página Figma (Original/Trabalho) | Componentes Code Connect | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| P-01 `/dar` (nova aba "Proposta e rito") | `DeclaracaoApetiteDarView.vue` (ampliar) | UC-14 | fora da matriz; ator: CGOV (decisão de 2026-11-23: a CGOV edita e todos os perfis leem) | ✏️ Trabalho — Apetite (DAR), seção "P-01 · … para apresentar à CGOV" (`104:1846`), quadros "P-01 · …" (`102:931`, `102:1551`, `102:2428`, `102:3206`, `103:1552`, `103:2056`) | BrTabs, _BrStep · Etapa (5 etapas), SegmentedControl, Chip, StatCard, BrMessage, BrButton, Dialog, RiskBadge | desenhado e aprovado pela CGOV em 2026-11-23, sem ajustes; a 📌 Original é atualizada depois do código (LAC-08) |
| P-02 `/monitoramento` (tratar alerta de KRI) | `MonitoramentoKriPlanoAcaoView.vue` (ampliar) | UC-15 | fora da matriz; ator: gestor de riscos | ✏️ Trabalho — Monitoramento (a desenhar) | a definir no protótipo | a prototipar (LAC-03) |
| P-03 `/comunicacoes` (sugestão) | nova | UC-16 | fora da matriz; ator: gestor de riscos | página nova (a criar) | a definir no protótipo | a prototipar (LAC-04) |
| P-04 `/plano` (sugestão) | nova | UC-17, UC-21 | fora da matriz; atores: CGOV (UC-17) e gestor de riscos (UC-21) | página nova (a criar) | a definir no protótipo | a prototipar (LAC-01) |
| P-05 `/plano/rito` (sugestão) | nova | UC-18 | fora da matriz; ator: CGOV, como Secretaria-Executiva do CTGRIC | página nova (a criar) | a definir no protótipo | a prototipar (LAC-02) |
| P-06 `/relatorios` (sugestão) | nova | UC-19 | fora da matriz; ator: CGOV | página nova (a criar) | a definir no protótipo | a prototipar (LAC-05) |
| P-07 `/acompanhamento` (sugestão) | nova | UC-22 | fora da matriz; ator: CGOV | página nova (a criar) | a definir no protótipo | a prototipar (LAC-09) |
| P-08 `/plano/revisao` (sugestão) | nova | UC-23 | fora da matriz; ator: CGOV | página nova (a criar) | a definir no protótipo | a prototipar (LAC-07) |
| P-09 `/riscos/:id` (ação "Reavaliar") | `FichaDetalheBowTieView.vue` (ampliar) | UC-24 | fora da matriz; ator: gestor de riscos | ✏️ Trabalho — Ficha do risco (a desenhar) | a definir no protótipo | a prototipar (LAC-10) |
| P-10 `/plano/publicacao` (sugestão) | nova | UC-25 | fora da matriz; ator: CGOV, como Secretaria-Executiva | página nova (a criar) | a definir no protótipo | a prototipar (LAC-02) |
| P-11 `/relatorios/anual` (sugestão) | nova | UC-26 | fora da matriz; ator: CGOV | página nova (a criar) | a definir no protótipo | a prototipar (LAC-06) |

Regras que todo protótipo segue (as mesmas do código): o Risco Inerente vem da tabela fixa do Quadro 7
(nunca P × I); o residual é classificado pelo Quadro 8 sem arredondar; "Risco Crítico" é o residual fora do
apetite da DAR, nunca o nível Extremo (> 17 a 25); e "Plano de Gestão de Riscos" se escreve por extenso.
As telas P-04, P-05, P-08 e P-10 representam o rito da Política e da Metodologia (minutas SEI `024241420` e
`024421455`), que hoje acontece fora do RADAR: o CTGRIC, o CIG e o Presidente não usam o sistema, e a CGOV
registra o resultado ([[uml-01-casos-de-uso]], seção 4).
