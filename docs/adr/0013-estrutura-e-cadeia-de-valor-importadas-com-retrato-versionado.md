# ADR-0013: Estrutura e Cadeia de Valor importadas do SharePoint, com retrato versionado

## Status

Accepted

Data: 2026-11-15 (spec B1 e importador `sync:estrutura`); registrada em ADR em 2026-11-21.

Origem: spec [[2026-11-15-etapa-b1-banco-rls-design]] (retrato versionado); `decisoes-tecnicas-b1.md` (R3, R5, R8);
[[guia-supabase-local]]; `supabase/referencia/`; `scripts/sync-estrutura/`.

## Contexto

A árvore de unidades e a Cadeia de Valor vivem em listas do SharePoint mantidas pela CGOV. O alcance de cada
pessoa depende da árvore. As listas de estrutura e de processos não têm dado pessoal (a estrutura é pública),
mas a CGTI e qualquer pessoa precisam recriar o banco sem acesso ao SharePoint. A lista tem defeitos (unidades
sem tipo, mãe inexistente, `id_mae` igual ao próprio id).

## Decisão

Nós vamos **importar** a estrutura e a Cadeia de Valor por um importador de terminal (`sync:estrutura`), que
grava tudo de uma vez pela função `sincronizar_estrutura` (uma transação), e **versionar no repositório um
retrato público** só com as colunas usadas (`supabase/referencia/*.csv`, com data no nome). O `db:reset` já o
importa. Atribuições de pessoas (dados pessoais) ficam fora do repositório (`_temp/`, ignorada pelo Git).

## Consequências

**Positivas**
- Banco recriável por qualquer pessoa, sem SharePoint; carga atômica (tudo ou nada).
- Defeitos da lista viram avisos no relatório, sem travar a importação.

**Negativas**
- O retrato envelhece: precisa ser atualizado quando a CGOV corrige a lista.
- O importador replica regras de limpeza (tipos, pai do grupo) que ficam fora do banco.
- Importar com `--sim` só grava sem perguntar em banco local; banco remoto exige `--permitir-remoto`.

**Neutras**
- A chave de unidade é o `icmbio_id`, porque a `sigla` não é única.

## Alternativas consideradas

- **Digitar a árvore à mão:** sujeito a erro e impossível de atualizar.
- **Ler o SharePoint ao vivo:** bloquearia testes e a CGTI.
