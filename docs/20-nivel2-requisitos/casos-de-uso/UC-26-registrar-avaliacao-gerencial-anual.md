# UC-26 — Registrar a avaliação gerencial anual

> Origem: F4.15 e F4.16 ([[F4-monitoramento-relato-avaliacao]]); Metodologia item 5; Política art. 15, X · RF: RF-150, RF-151, RF-152 · RN: RN-092, RN-093, RN-094
>
> Situação: proposto (LAC-06)

## Título

Registrar a avaliação gerencial anual.

## Ator principal

CGOV (perfil `cgov`).

## Pré-condições

- Terminou o ano de gestão de riscos a avaliar.

## Pós-condições

- A avaliação registrada não altera os dados de risco.
- Se o registro falhar, nenhuma avaliação parcial fica gravada, e a ciência à AUDIT só é registrada depois da avaliação.

## Fluxo principal de sucesso

1. A CGOV pede os dados do ano da gestão de riscos.
2. O sistema fornece os dados do ano.
3. A CGOV avalia a efetividade, a adequação e a maturidade da gestão de riscos (RN-092).
4. A CGOV registra a avaliação e o relatório gerencial com recomendações ao CTGRIC e ao CIG (RN-092).
5. A CGOV dá ciência da avaliação à AUDIT, para subsidiar o PAINT; o sistema registra a ciência, com a data (RN-094).

## Fluxos alternativos e de exceção

- 1a. A data-base da avaliação anual não está definida (alerta F4-17, aberto); o sistema não tem regra para isso até a CGOV decidir.
- 5a. A norma não fixa prazo para a ciência à AUDIT (alerta F4-17, aberto).
- 5b. A AUDIT prioriza ou não a avaliação independente no PAINT: decisão dela, fora do sistema (RN-093).
- 5c. **Hoje:** a avaliação é feita fora do RADAR, que não fornece os dados do ano nem registra a avaliação ou a ciência à AUDIT (LAC-06; não tratado pelo sistema; cartão LAC-06 no Kanban).

## Pós-condição de sucesso

- A avaliação gerencial anual e o relatório com recomendações estão registrados, e a ciência à AUDIT está registrada com a data.
