# 📖 Glossário Acessível — Negócio (CGOV) e Tecnologia (Web)

Este guia traduz tanto as siglas institucionais do ICMBio quanto os termos de programação para uma linguagem direta e sem jargões.

---

## Parte 1: Siglas Institucionais (Regras da CGOV)

| Termo / Sigla | O que significa | Atenção! |
|---|---|---|
| **RADAR** | **Rede de Avaliação, Diagnóstico e Ação em Riscos** — nome da nova Política de Gestão de Riscos do ICMBio (SEI `024241420`). | Substitui a antiga PGRI (Portaria 255/2020). |
| **Plano de Gestão de Riscos** | Documento operacional que consolida a carteira de **Riscos Críticos**, suas medidas de tratamento e seus KRIs. | ⛔ **Nunca use a sigla "PGR"** para este plano! No ICMBio, `PGR` é o *Programa de Gestão para Resultados e Inovação* (Portaria 1.572/2023). |
| **DAR** | **Declaração de Apetite a Riscos** (Anexo III da Metodologia). Define, por categoria, se o apetite do ICMBio é *Baixo* (trata Médios, Altos e Extremos) ou *Moderado* (trata Altos e Extremos). | Enquanto não for publicada pelo CIG, o sistema opera no modo `pendente_dar`, mostrando os dois cenários. |
| **Risco Crítico** | Qualquer risco cujo **Nível Residual** fique acima do limite de exposição definido na DAR para sua categoria. | Não confunda com o nível mais alto da matriz (que se chama **Extremo**: acima de 17 até 25, sem arredondar; 17,1 já é Extremo). |
| **KRI** | **Indicador-Chave de Risco** (*Key Risk Indicator*). Métrica com meta e limite de alerta que avisa se o risco está piorando. | Obrigatório ter pelo menos 1 KRI e 1 medida de tratamento para cada Risco Crítico. |
| **Integra+** | Programa de Integridade do ICMBio (Portaria nº 253/2026). | Trata os riscos da categoria **Integridade** (dividida nas 6 subcategorias do Quadro 3). |

---

## Parte 2: Termos de Programação Explicados com Analogias

| Termo Técnico | Explicação Simples | Exemplo no Sistema RADAR |
|---|---|---|
| **SPA (Single-Page Application)** | Um site que funciona como um aplicativo de celular: quando você clica em "Painel" ou "Novo Risco", ele troca apenas o miolo da tela instantaneamente, sem piscar o navegador inteiro. | O nosso aplicativo Vue.js 3. |
| **Componente (`.vue`)** | Uma peça de Lego visual que junta estrutura (HTML), aparência (CSS) e comportamento (TypeScript) no mesmo arquivo. | O arquivo `MatrizCalorAssimetrica.vue` é um componente que desenha o Quadro 7. |
| **Store (Pinia)** | Um "quadro de avisos central" na memória do navegador. Quando uma tela muda um dado na Store, todas as outras telas percebem na mesma hora. | `riscosStore.ts` guarda a lista de riscos e `authStore.ts` guarda qual perfil está ativo. |
| **Chave Estrangeira (`FK` — Foreign Key)** | Em vez de copiar o nome `"Coordenação de Governança"` dentro de 500 riscos (como fazia o SharePoint), salvamos apenas o código único (`id`) da unidade. | A coluna `unidade_id` na tabela `objetos_contexto`. |
| **RLS (Row Level Security)** | "Segurança por Linha" no banco PostgreSQL: uma regra que diz ao banco quais linhas cada servidor tem permissão de ver ou editar. | Um gestor de UC só edita riscos da própria UC; a CGOV visualiza todas as unidades. |
| **Container Docker** | Uma "caixa lacrada" que leva o aplicativo pronto junto com o servidor web Nginx configurado para rodar sem erros nos servidores da CGTI. | Gerado pelos arquivos `Dockerfile` e `docker-compose.yml`. |

---

## Parte 3: Termos da Documentação e do Quadro de Trabalho

A documentação do RADAR está em níveis (do negócio ao software) e o trabalho anda num quadro Kanban.
Estes são os nomes que aparecem nela.

| Termo / Sigla | Explicação Simples | Exemplo no Sistema RADAR |
|---|---|---|
| **RN (Regra de Negócio)** | Uma regra da norma ou da CGOV que vale **independentemente da tela**: o que pode, o que não pode e como se calcula. | RN-001: o inerente vem da tabela de 25 células do Quadro 7, nunca de P × I. Catálogo: [[regras-negocio]]. |
| **RF (Requisito Funcional)** | Uma frase "O sistema deve…" que diz **o que o sistema faz** para cumprir as regras. Cada RF tem uma Situação: implementado, parcial ou não iniciado. | RF-049: o sistema deve recusar "Aceitar" como resposta ao risco crítico. Catálogo: [[requisitos-funcionais]]. |
| **RNF (Requisito Não Funcional)** | Diz **como** o sistema deve ser (seguro, rápido, acessível, fácil de manter), e não o que ele faz. Segue as 9 características da ISO/IEC 25010:2023. | RNF-028: a chave `service_role` nunca vai para o navegador. Catálogo: [[requisitos-nao-funcionais]]. |
| **UC (Caso de Uso)** | A "receita" de uma tarefa do usuário, passo a passo: quem faz, o que precisa existir antes, o caminho normal e o que fazer quando algo dá errado (exceções). | UC-09: validar risco. Pasta `docs/20-nivel2-requisitos/casos-de-uso/`. |
| **LAC (Lacuna)** | Ponto em que a norma pede uma coisa e o RADAR ainda não faz, ou faz de outro jeito. Pode **bloquear a homologação** (contradição) ou ser **importante** (omissão). | LAC-14: as categorias do sistema não são as 8 do Quadro 2. Lista: [[lacunas-norma-sistema]]. |
| **ADR (Registro de Decisão de Arquitetura)** | Uma página curta que registra **uma** decisão: o contexto, o que foi decidido e o que se ganha e se perde. Depois de aceita, não se edita: se a decisão mudar, escreve-se outra ADR. | ADR-0017: as lacunas que bloqueiam a homologação entram antes da CGTI. Pasta `docs/adr/`. |
| **MER (Modelo Entidade-Relacionamento)** | O "mapa" das coisas do negócio e de como se ligam, sem se preocupar com o banco: Unidade **tem** Objetos, Objeto **tem** Riscos. | [[mer-conceitual]]. |
| **DER (Diagrama Entidade-Relacionamento)** | O mesmo mapa já no formato do banco: tabelas, colunas e chaves, com os "pés de galinha" mostrando "um para muitos". | [[der-logico]], com as 12 tabelas das migrações. |
| **Formas normais (1FN, 2FN, 3FN)** | Três testes para a tabela não repetir nem misturar informação. **1FN:** uma informação por célula (nada de lista dentro de um campo). **2FN:** cada coluna depende da chave inteira. **3FN:** nenhuma coluna depende de outra coluna que não seja a chave. | A subcategoria guardada como lista em JSONB fere a 1FN (cartão no Kanban). Ver [[normalizacao]]. |
| **Kanban e Backlog** | Kanban é o quadro em colunas por onde o trabalho anda (Backlog → Pronto → … → Concluído). O **Backlog** é a fila de tudo o que ainda vai ser feito, em ordem de prioridade. | [[quadro]] e [[politicas]]. |
| **WIP (*Work In Progress*, trabalho em andamento)** | O limite de cartões que uma coluna pode ter ao mesmo tempo. Coluna cheia: primeiro se termina o que está lá, depois se puxa outro. | "Desenvolvimento (WIP 2)": no máximo 2 cartões sendo programados. |
| **DoR (*Definition of Ready*, Definição de Pronto)** | A lista do que o cartão precisa ter **antes** de começar: aqui, ligar um RF, RN ou LAC e, se mexe em dados, citar a tabela. | Cartão sem ID fica no Backlog. |
| **DoD (*Definition of Done*, Definição de Concluído)** | A lista do que precisa estar feito **para dar por terminado**: testes verdes, rastreabilidade atualizada, ADR quando houve decisão e `ESTADO-ATUAL` atualizado. | Ver [[politicas]]. |
