# ADR-0012: Mudança da DAR recalcula os aprovados e reabre os que viram Críticos

## Status

Accepted

Data: 2026-11-15 (decisão P-B1-8 da CGOV); implementada em 2026-11-16 (migração `20261116004`);
registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b1.md` § 4.1 item 8 e B11-5, B11-6; teste `supabase/tests/073`;
Política (SEI `024241420`), art. 8º, § 2º.

## Contexto

"Risco Crítico" é o risco cujo nível residual está fora do apetite definido na DAR (Declaração de Apetite a
Riscos); não é sinônimo de Extremo. Quando a CGOV muda o apetite de uma categoria, riscos já aprovados podem
passar a estar fora do apetite sem que ninguém os tenha reavaliado, e o Crítico exige tratamento, KRI e
homologação.

## Decisão

Nós vamos fazer o banco, ao salvar uma nova DAR, **recalcular a criticidade** de todos os riscos aprovados da
categoria; os que passam de não Crítico a **Crítico** voltam à homologação (ação `reaberto_mudanca_dar`); os
que deixam de ser Críticos só são atualizados. Isso vale também na 1ª publicação da DAR (saída de
`pendente_dar`).

## Consequências

**Positivas**
- Nenhum risco aprovado fica fora do apetite sem passar pela autoridade.
- O recálculo e a reabertura ficam na trilha de auditoria.

**Negativas**
- Ruído de auditoria: todo aprovado da categoria ganha uma linha e um `atualizado_em` novo (B11-6); a tela não
  deve ler isso como "ficha editada".
- Mudar a DAR pode reabrir muitos riscos de uma vez e sobrecarregar os homologadores.

**Neutras**
- Ir para `pendente_dar` sem virar Crítico não reabre o risco (B11-5).

## Alternativas consideradas

- **Só avisar a CGOV:** o risco continuaria aprovado fora do apetite.
- **Reabrir todos os aprovados:** pediria homologação sem necessidade.
