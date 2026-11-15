# Aula 02 — Entendendo o Banco de Dados SQL e o Supabase

> **Caderno de Aprendizado — Projeto RADAR (`cgov-riscos`)**  
> **Objetivo:** Explicar sem jargões como o PostgreSQL/Supabase guarda os riscos do ICMBio com segurança.

---

## 1. O que é um Banco de Dados Relacional (PostgreSQL)?

Imagine que no Excel ou no SharePoint você tinha uma única planilha gigante onde precisava repetir o nome da Coordenação-Geral e a descrição da Categoria em todas as linhas. Se o nome mudasse, era preciso corrigir 200 linhas!

No **PostgreSQL** (o banco de dados por trás do **Supabase**), nós dividimos a informação em **tabelas conectadas**:
- A tabela `categorias_risco` guarda as 8 categorias oficiais do Quadro 2 e o apetite da **DAR** (Baixo ou Moderado).
- A tabela `riscos` guarda apenas o número da categoria (`categoria_id = 2`, por exemplo). Isso se chama **Chave Estrangeira (`FOREIGN KEY`)**.

---

## 2. O que é uma `TRIGGER` (Gatilho Automático)?

No arquivo `supabase/migrations/20261109001_schema_radar.sql`, criamos uma função chamada `trigger_calcular_risco_radar()`.

Pense nela como um **auditor automático dentro do banco de dados**: toda vez que alguém tenta salvar ou atualizar um risco (`BEFORE INSERT OR UPDATE ON riscos`), esse gatilho entra em ação antes de gravar no disco:
1. Consulta a Matriz Assimétrica do **Quadro 7** (`calcular_nivel_inerente_q7`);
2. Verifica se o controle tem evidência comprovada (se não tiver, trava o fator em `0.90`);
3. Multiplica o Risco Inerente pelo Fator para achar o **Risco Residual**;
4. Compara com a **DAR (Declaração de Apetite a Riscos)** para marcar se é um **Risco Crítico**.

---

## 3. O que é RLS (`Row Level Security`)?

*Row Level Security* significa **Segurança por Linha**. Em vez de proteger os dados apenas escondendo botões na tela, o próprio banco de dados verifica quem está logado antes de devolver ou alterar cada linha da tabela.

---

## 4. RLS com função de alcance e testes com pgTAP

### O problema

Na etapa B1 o RADAR passou a ter 10 perfis e 843 unidades. Cada pessoa só pode ver os riscos "do seu
pedaço" da árvore. Escrever essa conta dentro de cada política seria repetitivo e fácil de errar. A
solução: **uma função de alcance** que responde "quais unidades esta pessoa vê?", usada por todas as
políticas.

### Exemplo real da semente

`gestor.uc@radar.test` é o chefe fictício da **FLONA de Caçador**. Na semente existe também a **ESEC do
Taim**, uma UC vizinha. O resultado:

```sql
select pg_temp.entrar_como('gestor.uc@radar.test');
select * from public.unidades_visiveis();   -- devolve a FLONA de Caçador, e só ela
```

- a FLONA de Caçador **está** na lista: ele vê os riscos da própria unidade;
- a ESEC do Taim **não está**: ele não vê os riscos da vizinha, mesmo sendo da mesma região.

Já `ct@radar.test` (titular da CT Curitiba) vê as duas, porque as duas são vinculadas à CT.

### `SECURITY DEFINER` e `search_path = ''`

- **`SECURITY DEFINER`**: a função roda com os poderes do **dono** (o administrador do banco), e não
  com os de quem a chamou. Precisamos disso porque a função lê a tabela de unidades e de perfis, e
  essas tabelas também têm RLS. Sem isso, a função se "bloquearia" sozinha.
- **O risco**: uma função com poderes grandes precisa ser blindada. Alguém poderia criar uma tabela
  falsa de mesmo nome num esquema que a função consultasse antes da verdadeira.
- **`SET search_path = ''`**: esvazia a lista de lugares onde o banco procura nomes. Por isso, dentro
  da função, todo nome vem completo: `public.unidades`, e não só `unidades`. É como escrever
  endereço completo na carta, para ela não cair na caixa de correio errada.
- Por fim, `REVOKE EXECUTE ... FROM public, anon` e `GRANT EXECUTE ... TO authenticated`: visitantes
  sem login não podem nem chamar a função.

### Como testar: `entrar_como` e `throws_ok`

O **pgTAP** permite escrever testes em SQL. Dois ajudantes aparecem sempre:

- **`pg_temp.entrar_como('gestor.uc@radar.test')`**: "faz de conta" que aquela pessoa fez login
  (ajusta o papel `authenticated` e o crachá `sub`, que o `auth.uid()` lê). Vale só até o fim da
  transação do teste. Assim testamos a RLS como cada perfil enxerga.
- **`throws_ok(comando, '42501', ...)`**: o teste **passa se o comando der erro**, com aquele código.
  Serve para provar que algo está proibido. Exemplo: o gestor tentar criar um risco na ESEC do Taim
  deve dar `42501` (permissão negada).
- Já para `UPDATE`/`DELETE` fora do alcance não há erro: a linha simplesmente "não existe" para a
  pessoa e **0 linhas mudam**. Por isso contamos as linhas afetadas.

Outros comandos úteis: `ok(condição, 'o que protege')`, `is(valor, esperado, '...')` e
`set_eq(consulta, consulta, '...')` (compara conjuntos). Leia os testes reais em
`supabase/tests/030_alcance.test.sql` (alcance) e `041_rls_escrita.test.sql` (escrita). Para rodar:
`npm run db:reset && npm run test:db`.

### Segregação: quem envia não valida (decisão D1)

Uma regra de ouro da gestão de riscos é separar **quem executa** de **quem confere**. No RADAR, quem
**envia** um risco para validação nunca pode validá-lo nem homologá-lo. O problema aparece quando o
próprio chefe grava fichas numa subunidade interna dele. Exemplo da semente:

- `gr@radar.test` é o titular da **GR5** e pode gravar no **SAT1-GR5** (um Serviço da GR5);
- a chefia imediata do SAT1-GR5 é a **GR5** — ou seja, o próprio `gr@`;
- se nada mudasse, ele enviaria e validaria o próprio risco.

A solução foi "**subir um nível**": o banco guarda **quem enviou** (coluna `usuario_id` em
`historico_fluxo`) e, se essa pessoa é a titular da chefia, a validação passa para a chefia de cima
(no exemplo, a **Presidência**). Em SQL, a ideia é um laço simples:

```sql
-- parte da chefia imediata e sobe enquanto quem enviou for o titular dela
v_unidade := public.chefia_imediata(p_unidade);
WHILE v_unidade IS NOT NULL AND public.fn_fluxo_titular_da_unidade(p_quem_enviou, v_unidade) LOOP
  v_unidade := public.chefia_imediata(v_unidade);
END LOOP;
```

Se não houver ninguém acima (topo da árvore), o envio é recusado com o erro `55000` e uma mensagem
`RADAR:` clara. O teste `supabase/tests/050_fluxo.test.sql` (bloco 8d) mostra os três casos.

### Risco aprovado não se apaga (decisão D2)

Um **gatilho** (`trigger`) é uma função que o banco roda sozinho antes ou depois de um `INSERT`,
`UPDATE` ou `DELETE`. O gatilho `trg_riscos_trava_reabertura` recusa apagar um risco `aprovado`: ele
faz parte do Plano de Gestão de Riscos e o histórico iria junto. Detalhe importante: o gatilho roda
também na **exclusão em cascata** — apagar o objeto apagaria os riscos dele, então apagar o objeto de
um risco aprovado também é recusado.

### A trilha também guarda trocas de perfil e da DAR

A trilha de auditoria (`auditoria_log`) registra, além das fichas de risco, as mudanças em
`perfis_usuarios` (por exemplo, quando a CGOV torna alguém **substituto em exercício** — o que muda
quem valida) e em `categorias_risco` (o apetite da DAR). Essas linhas não pertencem a um objeto
(`objeto_id` nulo), e por isso só a CGOV as lê. Todas as decisões, com motivo e custo, estão em
[[decisoes-tecnicas-b1]].
