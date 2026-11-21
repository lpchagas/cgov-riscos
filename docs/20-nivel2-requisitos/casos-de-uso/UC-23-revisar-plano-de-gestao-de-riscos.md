# UC-23 — Revisar o Plano de Gestão de Riscos

> Origem: F4.10 a F4.12 ([[F4-monitoramento-relato-avaliacao]]); Política art. 9º; Metodologia 4.6.9 e 4.7.2 (último parágrafo); decisões F4-14, F4-15 e F5-15 (não aplicadas ao texto) · RF: RF-134, RF-136, RF-137, RF-138, RF-139, RF-121 · RN: RN-073, RN-074, RN-077, RN-078, RN-079, RN-080, RN-081, RN-109, RN-110, RN-111
>
> Situação: proposto (LAC-07)

## Título

Revisar o Plano de Gestão de Riscos.

## Ator principal

CGOV (perfil `cgov`).

## Pré-condições

- Há Plano de Gestão de Riscos vigente.
- Chegou à CGOV uma situação que pode pedir revisão: comunicação do gestor ([[UC-16-comunicar-fato-de-risco-a-cgov]]) ou achado do acompanhamento ([[UC-22-acompanhar-carteira-critica-e-cobrar-pendencias]]).

## Pós-condições

- Enquanto a revisão substancial não é aprovada, o Plano anterior segue vigente (RN-110).
- Toda decisão e toda nova versão do Plano ficam registradas com a data.

## Fluxo principal de sucesso

1. A CGOV analisa a situação comunicada.
2. A CGOV decide se a situação demanda revisão do Plano: sem revisão, revisão não substancial ou revisão substancial (RN-078), em até 10 dias úteis (RN-079); o sistema mostra o prazo.
3. O sistema indica se a mudança é substancial pelos critérios do item 4.6.9: altera o apetite de uma categoria, inclui ou exclui risco crítico, ou altera a resposta ao risco crítico (RN-073, RN-074).
4. O sistema registra a decisão, com a data, e dá ciência ao gestor (RN-079).
5. A revisão não é substancial: a CGOV atualiza o Plano, e o sistema registra a nova versão, para ser informada nos relatórios trimestrais (RN-109; [[UC-19-emitir-relatorio-trimestral]]).

## Fluxos alternativos e de exceção

- 2a. A CGOV decide que não há revisão: o sistema registra a decisão e a ciência ao gestor. O caso de uso termina.
- 3a. **Revisão substancial:** segue o rito do CTGRIC e do CIG (RN-077; [[UC-18-registrar-manifestacao-ctgric-e-deliberacao-cig]]); o sistema mantém vigente o Plano anterior enquanto a revisão não for aprovada (RN-110).
- 3a.1. O CIG reprova a revisão substancial: a CGOV a ajusta e a reapresenta conforme os itens 4.6.8 e 4.6.9, com o Plano anterior vigente (RN-080, RN-110).
- 3b. A revisão inclui risco crítico com urgência: a CGOV pode pedir reunião extraordinária do CTGRIC e do CIG; a convocação do CIG cabe ao seu Presidente (RN-081). Enquanto a revisão tramita, o gestor mantém o monitoramento e o KRI desse risco (RN-111).
- 3c. A base de comparação da "mudança substancial" na revisão não está definida (alerta F5-14, aberto); o critério do sistema é o do 4.6.9.
- 5a. **Hoje:** o RADAR não tem versões do Plano nem decisão de revisão; a edição de um risco aprovado só reabre o fluxo interno ([[UC-08-enviar-risco-para-validacao]], exceção 1a), sem separar revisão substancial de não substancial (LAC-07; não tratado pelo sistema; cartão LAC-07 no Kanban).

## Pós-condição de sucesso

- A decisão sobre a revisão está registrada e o gestor foi avisado; a revisão não substancial virou nova versão do Plano, ou a substancial está no rito do CTGRIC e do CIG com o Plano anterior vigente.
