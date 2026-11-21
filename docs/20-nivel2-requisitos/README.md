# Nível 2 — Requisitos

Guarda **o que o sistema deve fazer e com que qualidade**, escrito conforme a ISO/IEC/IEEE 29148:2018
(sem histórias de usuário). Qualidade pela ISO/IEC 25010:2023 (9 características).

## Arquivos previstos no plano

- [[ERS-radar]] — Especificação de Requisitos de Software (documento-base; já existe).
- [[regras-negocio]] — catálogo de regras de negócio (`RN-001` a `RN-115`, com origem, implementação e teste; já existe).
- [[requisitos-funcionais]] — catálogo de requisitos funcionais (`RF-001` a `RF-195`, "O sistema deve…", com prioridade MoSCoW, origem, situação conferida no código e verificação; já existe).
- [[requisitos-nao-funcionais]] — catálogo de requisitos não funcionais (`RNF-001` a `RNF-051`, pelas 9 características da ISO/IEC 25010:2023, com critério mensurável, origem e verificação; já existe).
- `casos-de-uso/` — casos de uso `UC-01` a `UC-26` (índice por ator e situação em [[casos-de-uso/README|índice dos casos de uso]]; já existem); veja o [[_modelo]].
- `rastreabilidade.md` — liga norma, RN, RF, UC, tela e teste.

Cada catálogo é uma tabela Markdown cujas duas primeiras colunas são `ID` e `Enunciado`, com coluna
`Origem`. O teste `documentacao.spec.ts` confere IDs únicos e Origem preenchida.
