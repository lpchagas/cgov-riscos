# ADR-0001: Registrar decisões arquiteturalmente significativas em ADRs

## Status

Accepted

Data: 2026-11-20

## Contexto

Até aqui, as decisões técnicas do RADAR ficaram em quatro arquivos de `docs/02-arquitetura-cgti/`:
`decisoes-tecnicas-b1.md`, `decisoes-tecnicas-b2.md`, `decisoes-tecnicas-b3.md` e
`decisoes-tecnicas-c.md` (mais o `-d`, da etapa D). Juntos somam cerca de 70 decisões, com séries de
numeração diferentes (R, D, B11, B2, T, B3, C), sem formato comum e sem marca de "substituída por".
Quem chega agora (inclusive a CGTI, na homologação) não consegue saber qual decisão vale hoje, nem
por que foi tomada, sem ler os arquivos inteiros.

## Decisão

Nós vamos registrar decisões arquiteturalmente significativas em ADRs no modelo de Nygard, em
`docs/adr/`, numerados (`NNNN-slug-em-kebab-case.md`) e imutáveis: um ADR aceito não é reescrito; se a
decisão mudar, um ADR novo o substitui e só o campo Status do antigo passa a `Superseded by ADR-NNNN`.
O modelo está em `0000-modelo.md` e o índice em `README.md`. Os arquivos `decisoes-tecnicas-*` ficam
congelados como histórico e passam a apontar para os ADRs que migrarem as decisões ainda vigentes.

## Consequências

**Positivas**
- Cada decisão tem um endereço único (`ADR-NNNN`), um status e um motivo curto, fácil de citar.
- O teste `documentacao.spec.ts` protege a sequência, as seções e os status.

**Negativas**
- Custo de migração: transcrever as decisões vigentes dos arquivos antigos dá trabalho.
- Durante a transição existem dois lugares com decisões (ADRs e arquivos congelados).
- Imutabilidade exige escrever um ADR novo até para pequenas mudanças de rumo.

**Neutras**
- Decisões de execução miúdas (nome de variável, ajuste de tela) continuam fora dos ADRs.

## Alternativas consideradas

- Manter os arquivos `decisoes-tecnicas-*` e só padronizar o texto: não resolve a falta de marca de
  substituição nem a numeração em séries diferentes.
