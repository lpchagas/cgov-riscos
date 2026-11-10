# Aula 02 — Entendendo o Banco de Dados SQL e o Supabase

> **Caderno de Aprendizado — Projeto RADAR (`cgov-riscos`)**  
> **Objetivo:** Explicar sem jargões como o PostgreSQL/Supabase guarda os riscos do ICMBio com segurança.

---

## 1. O que é um Banco de Dados Relacional (PostgreSQL)?

Imagine que no Excel ou no SharePoint você tinha uma única planilha gigante onde precisava repetir o nome da Coordenação-Geral e a descrição da Categoria em todas as linhas. Se o nome mudasse, era preciso corrigir 200 linhas!

No **PostgreSQL** (o banco de dados por trás do **Supabase**), nós dividimos a informação em **tabelas conectadas**:
- A tabela `categorias_risco` guarda as 8 categorias oficiais do Quadro 2 e o apetite da **DAR** (Baixo ou Moderado).
- A tabela `riscos` guarda apenas o número da categoria (`categoria_id = 2`, por exemplo). Isso se chama **Chave Estrangeira (`FOREIGN KEY`)**.

---

## 2. O que é uma `TRIGGER` (Gatilho Automático)?

No arquivo `supabase/migrations/20261109001_schema_radar.sql`, criamos uma função chamada `trigger_calcular_risco_radar()`.

Pense nela como um **auditor automático dentro do banco de dados**: toda vez que alguém tenta salvar ou atualizar um risco (`BEFORE INSERT OR UPDATE ON riscos`), esse gatilho entra em ação antes de gravar no disco:
1. Consulta a Matriz Assimétrica do **Quadro 7** (`calcular_nivel_inerente_q7`);
2. Verifica se o controle tem evidência comprovada (se não tiver, trava o fator em `0.90`);
3. Multiplica o Risco Inerente pelo Fator para achar o **Risco Residual**;
4. Compara com a **DAR (Declaração de Apetite a Riscos)** para marcar se é um **Risco Crítico**.

---

## 3. O que é RLS (`Row Level Security`)?

*Row Level Security* significa **Segurança por Linha**. Em vez de proteger os dados apenas escondendo botões na tela, o próprio banco de dados verifica quem está logado antes de devolver ou alterar cada linha da tabela.
