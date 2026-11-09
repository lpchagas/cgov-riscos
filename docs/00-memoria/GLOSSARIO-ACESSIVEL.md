# 📖 Glossário Acessível — Negócio (CGOV) e Tecnologia (Web)

Este guia traduz tanto as siglas institucionais do ICMBio quanto os termos de programação para uma linguagem direta e sem jargões.

---

## Parte 1: Siglas Institucionais (Regras da CGOV)

| Termo / Sigla | O que significa | Atenção! |
|---|---|---|
| **RADAR** | **Rede de Avaliação, Diagnóstico e Ação em Riscos** — nome da nova Política de Gestão de Riscos do ICMBio (SEI `024241420`). | Substitui a antiga PGRI (Portaria 255/2020). |
| **Plano de Gestão de Riscos** | Documento operacional que consolida a carteira de **Riscos Críticos**, suas medidas de tratamento e seus KRIs. | ⛔ **Nunca use a sigla "PGR"** para este plano! No ICMBio, `PGR` é o *Programa de Gestão para Resultados e Inovação* (Portaria 1.572/2023). |
| **DAR** | **Declaração de Apetite a Riscos** (Anexo III da Metodologia). Define, por categoria, se o apetite do ICMBio é *Baixo* (trata Médios, Altos e Extremos) ou *Moderado* (trata Altos e Extremos). | Enquanto não for publicada pelo CIG, o sistema opera no modo `pendente_dar`, mostrando os dois cenários. |
| **Risco Crítico** | Qualquer risco cujo **Nível Residual** fique acima do limite de exposição definido na DAR para sua categoria. | Não confunda com o nível mais alto da matriz (que se chama **Extremo**, de 18 a 25). |
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
