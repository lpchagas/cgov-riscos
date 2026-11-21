# ADR-0011: Fluxo em 3 degraus com segregação "sobe um nível"

## Status

Accepted

Data: 2026-11-15 (D1 da B1, revisão final; B11-7 e B11-8 em 2026-11-16); registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b1.md` D1, D2 e seção 5 (B11-4, B11-7, B11-8); migrações `20261115004` e `20261116001`;
testes `supabase/tests/050` e `070`; Metodologia (SEI `024421455`), 4.6; Decreto nº 9.203/2017.

## Contexto

O risco passa por três degraus: o gestor envia, a chefia imediata valida e a autoridade superior homologa
(sempre para risco Crítico, ou seja, fora do apetite da DAR). Antes da revisão final, o Gerente Regional que
criava um risco no próprio Serviço o enviava e o validava sozinho, inclusive de nível Extremo. Isso quebra a
segregação entre quem executa e quem valida.

## Decisão

Nós vamos aplicar a regra **"sobe um nível"**: quem enviou o risco (ou o reabriu ao editar a ficha aprovada)
nunca o valida nem o homologa; se for o titular da chefia imediata, a validação sobe à chefia da chefia, e
assim por diante. Sem nível acima, o banco recusa (`55000`) já no envio. Os Riscos da Presidência são
validados pelo titular do GABIN e homologados pelo Presidente. Risco aprovado não se exclui (só se edita, o
que reabre o fluxo). Quando não há ator efetivo, só a CGOV devolve o risco.

## Consequências

**Positivas**
- Ninguém aprova o que ele mesmo enviou; a regra vale no banco, não só na tela.
- A tela só mostra o botão quando a ação passaria (`acoes_no_fluxo`).

**Negativas**
- Mais trabalho para o nível de cima; cargo vago sem titular trava o fluxo (só a CGOV desbloqueia, no caso sem ator).
- A Presidência depende de IDs fixos (`10.0000`, `10.0001`, `10.0002`) que o importador precisa manter.

**Neutras**
- Riscos da semente sem linha de envio seguem a chefia imediata normal.

## Alternativas consideradas

- **Validar e homologar pela mesma chefia:** vale só quando os atores efetivos coincidem e nenhum enviou.
- **Delegação e substituto:** adiada; está nas pendências.
