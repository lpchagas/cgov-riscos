# Nível 2 — Requisitos

Guarda **o que o sistema deve fazer e com que qualidade**, escrito conforme a ISO/IEC/IEEE 29148:2018
(sem histórias de usuário). Qualidade pela ISO/IEC 25010:2023 (9 características).

## Arquivos previstos no plano

- [[ERS-radar]] — Especificação de Requisitos de Software (documento-base; já existe).
- [[regras-negocio]] — catálogo de regras de negócio (`RN-001` a `RN-103`, com origem, implementação e teste; já existe).
- `requisitos-funcionais.md` — catálogo de requisitos funcionais (`RF-NNN`, "O sistema deve…").
- `requisitos-nao-funcionais.md` — catálogo de requisitos não funcionais (`RNF-NNN`).
- `casos-de-uso/` — casos de uso `UC-01` a `UC-26`; veja o [[_modelo]].
- `rastreabilidade.md` — liga norma, RN, RF, UC, tela e teste.

Cada catálogo é uma tabela Markdown cujas duas primeiras colunas são `ID` e `Enunciado`, com coluna
`Origem`. O teste `documentacao.spec.ts` confere IDs únicos e Origem preenchida.
