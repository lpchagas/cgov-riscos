# Nível 4 — Dados

Guarda **como os dados são organizados**: o modelo conceitual, o diagrama entidade-relacionamento (DER,
em `erDiagram` do Mermaid, notação pé-de-galinha), a normalização e o dicionário de dados do banco
PostgreSQL/Supabase.

## Arquivos previstos no plano

- [[mer-conceitual]] — entidades e relacionamentos do negócio, com as entidades propostas pelas lacunas.
- [[der-logico]] — DER do banco atual (pé-de-galinha), conferido por teste contra as migrações.
- `normalizacao.md` — análise das formas normais.
- `dicionario-dados.md` — tabelas, colunas, tipos e regras.

O documento anterior, [[modelo-dados-mer]] (`docs/02-arquitetura-cgti/`), fica como histórico das migrações.
