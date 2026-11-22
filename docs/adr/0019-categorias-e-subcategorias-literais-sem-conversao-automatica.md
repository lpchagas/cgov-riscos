# ADR-0019: Categorias e subcategorias literais do Quadro 2 e do Quadro 3, sem conversão automática

## Status

Accepted

Data: 2026-11-22 (decisões do responsável pelo projeto, pela CGOV, na abertura do plano da LAC-14 e da LAC-15).

Origem: [[2026-11-22-lac-14-15-categorias-subcategorias-plan]]; [[lacunas-norma-sistema]] (LAC-14 e LAC-15);
[[pendencias-ui-piloto]] (D3-01 e D3-02); [[matriz-regras-regime-b]] (seções 4 e 5);
[[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]].

## Contexto

A Metodologia (SEI `024421455`) manda classificar cada risco em **uma das 8 categorias do Quadro 2** e, na
categoria Integridade, em **uma das 6 subcategorias do Quadro 3**. O RADAR gravava outra lista: 8 categorias
em que sobravam Estratégico, Socioambiental e Tecnologia da Informação e faltavam Riscos da visitação,
Ocupacionais e Privacidade e Proteção de Dados (D3-01, LAC-14); e subcategorias de Integridade com nomes
próprios, como "Corrupção e Fraude" (D3-02, LAC-15). Além disso, `riscos.subcategoria_integridade` aceitava
texto livre, a lista ficava numa coluna JSONB (`categorias_risco.subcategorias_permitidas`, dívida de 1FN em
[[normalizacao]] §2.1) e o importador trocava em silêncio uma categoria ou subcategoria desconhecida por um
padrão. O Anexo III da Metodologia usa grafias diferentes das do Quadro 2 ("Financeiro ou Orçamentário",
"Reputação ou Imagem", "Visitação").

A conferência de 2026-11-22 mostrou que a nuvem do piloto só tinha o `seed.sql` (categorias 1 a 8) e
**nenhum risco**; localmente, os riscos de demonstração foram reclassificados à mão.

## Decisão

O responsável decidiu, em 2026-11-22:

1. **Grafia: Quadro 2 literal.** As categorias e as descrições são as do Quadro 2, como estão na
   [[matriz-regras-regime-b]] §4 (inclusive o erro material "Lei nº 13.709/2013", que não é corrigido aqui).
   O importador aceita a grafia do Anexo III **como sinônimo** e grava a do Quadro 2.
2. **Riscos em Estratégico, Socioambiental ou Tecnologia da Informação: recusar e reclassificar.** A migração
   para com erro e lista os códigos; nada muda de categoria sem decisão humana.
3. **Riscos com subcategoria antiga: recusar e reclassificar**, pela mesma regra; vale exatamente o Quadro 3.
4. **Garantia no banco:** tabela `subcategorias_risco` (migração `20261122001`), chave estrangeira composta
   (`categoria_id`, `subcategoria_integridade`) em `riscos` e um gatilho que exige a subcategoria na
   Integridade. A coluna JSONB `subcategorias_permitidas` sai, e isso resolve junto o cartão de dívida da 1FN.

Regras que valem a partir daqui:

- Os ids 2 a 6 continuam (Operacional, Financeiro/Orçamentário, Legal, Integridade, Reputação) com o apetite e a
  justificativa que tinham; saem os ids 1, 7 e 8; entram 9 (Riscos da visitação), 10 (Ocupacionais) e
  11 (Privacidade e Proteção de Dados), nascidos como `pendente_dar`, sem justificativa. O zeramento geral dos
  apetites é a D3-03, fora deste ADR.
- **Nenhum ponto do código troca categoria ou subcategoria por um padrão.** A coluna de categoria vazia ou
  desconhecida na importação é recusada; a ficha gravada com categoria inexistente falha com mensagem clara.
- Os sinônimos do Anexo III ficam **só no importador** (comparação sem diferença de maiúsculas, de espaços nas
  pontas ou repetidos no meio e da forma Unicode do acento, e nenhum outro sinônimo). O banco, a tela e a calculadora conhecem só a grafia do Quadro 2.
- O cálculo (Quadros 6, 7 e 8) não muda. Em `calculadoraRiscoRadar.ts` só mudam as duas listas.

## Consequências

**Positivas**
- O apetite da DAR passa a ser lido das categorias do Quadro 2, e a LAC-14 e a LAC-15 (que bloqueavam a
  homologação, ADR-0017) ficam resolvidas.
- O banco recusa categoria fora do Quadro 2 (restrição `CHECK` no nome), subcategoria fora do Quadro 3 (chave
  estrangeira) e Integridade sem subcategoria (gatilho), com a mensagem "RADAR: risco da categoria … exige uma
  das subcategorias do Quadro 3." traduzida pela tela. Subcategoria em branco (`''` ou só espaços) conta como
  "sem subcategoria": o gatilho a grava como nula antes da chave estrangeira, e o front já a envia como nula.
- A dívida de 1FN fica resolvida: a lista deixa de ser JSON.

**Negativas**
- **A migração recusa** se houver risco nas categorias 1, 7 ou 8, com subcategoria fora do Quadro 3, de
  Integridade sem subcategoria ou com subcategoria fora da Integridade. Ela lista os `codigo_radar`, e a
  reclassificação é manual. Também recusa se `categorias_risco` tiver categoria que o alinhamento não conhece
  (id fora de 1 a 8, ou nome que não é dos 8 antigos nem dos 8 do Quadro 2), listando "id - nome". Na nuvem do piloto não deve disparar (não há risco); em bancos com dados, é passo
  obrigatório antes de aplicar.
- Salvar um rascunho de Integridade sem subcategoria passa a falhar no banco (o formulário já exige a
  subcategoria; ao sair da Integridade, ele limpa a subcategoria).
- Nenhuma conversão automática de dados antigos: quem tiver planilha com grafia diferente do Anexo III e dos
  sinônimos aceitos terá a linha recusada na importação.
- O alinhamento do banco do piloto na nuvem é um passo à parte, com **[AUTORIZAÇÃO]** (plano, Fase 2).

**Neutras**
- As 3 categorias novas nascem sem apetite declarado, e o risco nelas só vira Crítico depois da DAR (RN-005).
- Os ids 1, 7 e 8 não são reaproveitados.

## Alternativas consideradas

- **Converter os riscos antigos automaticamente** (Estratégico para Operacional, por exemplo). Esconde uma
  decisão de classificação que cabe a um humano e muda o apetite aplicado ao risco sem aviso.
- **Aceitar a grafia do Anexo III no banco.** Duas grafias para a mesma categoria obrigariam telas, DAR e
  relatórios a tratá-las como uma só.
- **Manter a lista JSON e só corrigir os nomes.** O banco continuaria sem garantir que a subcategoria do risco
  seja uma das 6.
