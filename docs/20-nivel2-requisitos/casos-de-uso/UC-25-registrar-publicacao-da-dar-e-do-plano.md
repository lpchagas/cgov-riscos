# UC-25 — Registrar a publicação da DAR e do Plano

> Origem: F3.11 e F3.12 ([[F3-aprovacao-dar-plano]]); Metodologia 4.6.7; decisão F5-11 (não aplicada ao texto) · RF: RF-130, RF-131, RF-132, RF-093, RF-121, RF-091 · RN: RN-060, RN-075, RN-066, RN-054
>
> Situação: proposto (LAC-02)

## Título

Registrar a publicação da DAR e do Plano de Gestão de Riscos.

## Ator principal

CGOV, como Secretaria-Executiva. O Presidente do ICMBio **não usa o sistema**: publica os atos, e a CGOV registra a publicação no RADAR.

## Pré-condições

- O CIG aprovou a DAR e o Plano ([[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig]]).

## Pós-condições

- O apetite da DAR nova só passa a valer no cálculo depois de registrada a portaria.
- O registro da publicação não é apagado.

## Fluxo principal de sucesso

1. O Presidente publica a DAR por portaria e o ato de aprovação do Plano (fora do sistema) (RN-060).
2. A CGOV registra o número e a data da portaria que publica a DAR.
3. A CGOV registra o número e a data do ato que aprova o Plano.
4. O sistema passa a aplicar o apetite da DAR publicada ao cálculo da criticidade e reavalia os riscos aprovados das categorias que mudaram (RN-054).
5. O sistema marca a versão aprovada do Plano como vigente.
6. A CGOV divulga o Plano na intranet e em transparência ativa, resguardadas as informações com restrição de acesso da Lei nº 12.527/2011, em até 10 dias úteis (RN-075, RN-066); o sistema registra a divulgação.

## Fluxos alternativos e de exceção

- 1a. O Presidente não tem prazo para publicar (alerta F5-11, prazo do Presidente aberto): enquanto não há registro da portaria, o apetite vigente continua o anterior.
- 3a. Falta o modelo de portaria que aprova o Plano no Anexo III (alerta F5-08b, aberto): a CGOV registra o ato que tiver sido publicado.
- 4a. Um risco aprovado passa a ser crítico com o novo apetite: volta à homologação ([[UC-10-homologar-risco]], exceção 1a); sem homologador efetivo, só a CGOV o devolve ([[UC-11-devolver-risco-para-ajuste]], exceção 3d).
- 6a. Há informações com restrição de acesso no Plano: elas não são divulgadas (RN-075).
- 6b. **Hoje:** o RADAR não registra portaria, ato nem divulgação, e o apetite gravado pela CGOV vale na hora ([[UC-14-propor-declaracao-de-apetite-a-riscos]], exceção 4a) (LAC-02, LAC-08; não tratado pelo sistema; cartões LAC-02 e LAC-08 no Kanban).

## Pós-condição de sucesso

- A portaria da DAR e o ato de aprovação do Plano estão registrados, o apetite publicado vale no cálculo, o Plano aprovado é o vigente e a divulgação está registrada.
