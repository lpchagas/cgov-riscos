---
tags: [aprendizado, camada-de-dados, async, supabase, vue, pinia]
---

# 🎓 Aula 6: Camada de Dados, `async/await` e Estados de Tela

Até a Aula 5, os dados do RADAR viviam **dentro do navegador**, em memória. Agora as telas também
sabem **ler e gravar no banco**. Esta aula explica como isso foi organizado, em cinco ideias:

1. **camada de dados:** um "balcão" único que as telas usam;
2. **duas fontes:** demonstração e banco, com a mesma interface;
3. **`async/await`:** esperar o banco sem travar a tela;
4. **estados de tela:** carregando, erro e pronto;
5. **paginação e RPC:** por que 1.000 linhas é o limite e por que a ficha é gravada por **uma** função.

> Decisões e motivos: [[decisoes-tecnicas-b3]]. Como rodar: [[guia-supabase-local]], seção "Rodar o RADAR no modo real com a semente".

---

## 1. O que é uma camada de dados

Imagine um restaurante. A **cozinha** (o banco) tem os ingredientes, o **garçom** leva o pedido e traz
o prato, e o **cliente** (a tela) só diz "quero a feijoada". O cliente não entra na cozinha.

A **camada de dados** é o garçom. No RADAR ela mora em `src/services/dados/`. A tela nunca escreve
"vá à tabela `riscos` e traga as linhas"; ela pede à **store** (`riscosStore.ts`), e a store pede à
camada de dados: "carregue a carteira". Se um dia o banco mudar, só o garçom aprende o caminho novo.

---

## 2. Duas fontes, uma interface

A camada tem **duas fontes** que fazem a mesma coisa:

| Fonte | Arquivo | De onde vêm os dados | Quando é usada |
| --- | --- | --- | --- |
| Demonstração | `fonteDemonstracao.ts` | Memória do navegador (dados fictícios) | Sem `.env`; varredura de acessibilidade |
| Supabase | `fonteSupabase.ts` | O banco (PostgreSQL), com a segurança por linha (RLS) | Com `.env` (login real) |

As duas obedecem ao mesmo contrato, a interface `FonteDados` (`tipos.ts`). Quem escolhe é o
`criarFonteDados(modo)` em `index.ts`. Como o contrato é igual, **a tela não sabe qual fonte está
usando**. Isso é o que permite apresentar o sistema sem Docker e, no mesmo código, usá-lo de verdade.

---

## 3. `async/await`: esperar sem travar

Ler do banco **demora** (rede, consulta). Se o navegador ficasse parado esperando, a tela congelaria.
Por isso, funções que esperam são **assíncronas**:

```ts
// "async" = esta função pode esperar. "await" = espere ESTE pedido terminar, sem travar a tela.
async function carregar() {
  const carteira = await fonte.lerCarteira(); // só segue depois que o banco responder
  riscos.value = carteira.riscos;
}
```

Duas coisas que podem dar errado, e que o código trata:

- **Falha:** a rede caiu ou o banco recusou. A função "lança" um erro e usamos `try/catch`.
- **Mensagem técnica demais:** o banco diz coisas como `violates row-level security`. Isso **nunca** vai
  para a tela. `traduzirErroBanco` (`errosBanco.ts`) só deixa passar texto que começa por `RADAR:`
  (mensagens que nós mesmos escrevemos no banco); o resto vira uma frase clara.

---

## 4. Estados de tela: carregando, erro e pronto

Toda tela que depende de dados vive em **um de três momentos**:

| Estado | O que a pessoa vê | Componente |
| --- | --- | --- |
| `carregando` | Um esqueleto cinza e o anúncio "Carregando…" para leitor de tela | `EstadoCarregamento` |
| `erro` | Mensagem clara e o botão **Tentar de novo** | `EstadoCarregamento` (bloco) ou `ErroPagina` (página inteira) |
| `pronto` | O conteúdo | a própria tela |

Um caso sutil: e se a **ação** (validar um risco) deu certo, mas a **releitura** que atualiza a tela
falhou? Dizer "falhou" faria a pessoa clicar de novo. Então a store guarda um `avisoAtualizacao`
("A ação foi concluída, mas não foi possível atualizar a tela. Use Atualizar."), e o componente
`AvisoAtualizacao` o mostra em qualquer tela.

Como testar esses estados sem derrubar o banco? No modo demonstração, a chave
`radar.demo-estado.v1` do navegador aceita `carregando` ou `erro` e **simula** o estado. A varredura
de acessibilidade usa isso para conferir as duas telas (Painel e Riscos) em carregamento e em erro.

---

## 5. Paginação (o limite de 1.000) e a RPC da ficha

### O limite de 1.000

O servidor devolve **no máximo 1.000 linhas por pedido**. Se a tabela tem 2.345 linhas e você pede
"todas", as 1.345 últimas **somem sem aviso**. A solução é pedir em páginas e juntar:

```text
pedido 1: linhas 0 a 999     (1.000 linhas, página cheia → pede outra)
pedido 2: linhas 1000 a 1999 (1.000 linhas, página cheia → pede outra)
pedido 3: linhas 2000 a 2999 (345 linhas, página incompleta → terminou)
```

Isso é `lerTodasAsPaginas` (`paginacao.ts`). Regra de ouro: a **ordem precisa ser estável**
(terminar em `.order('id')`), senão linhas podem repetir ou faltar entre uma página e outra. A única
exceção é a **Auditoria**, que lê de 50 em 50 com um "cursor" (guarda onde parou) porque a trilha só
cresce.

### Por que uma função (RPC) para gravar a ficha

Uma ficha de risco mexe em **várias tabelas**: o risco, os controles, as respostas, os KRIs e as
ações. Se o navegador gravasse uma tabela por vez e a rede caísse no meio, ficaria uma ficha **pela
metade**. A função `salvar_ficha_risco(ficha jsonb)` recebe a ficha inteira e grava tudo **numa só
transação**: ou grava tudo, ou não grava nada.

E o cálculo? O **front não grava valores calculados**. Ele manda os dados (probabilidade, impacto,
eficácia do controle) e o **gatilho do banco** calcula o risco inerente (Quadro 7), o fator dos
controles (Quadro 6) e o nível (Quadro 8). Assim a regra mora num lugar só.

Do mesmo jeito, quem diz **se o botão aparece** é o banco: `acoes_no_fluxo` responde "esta pessoa
pode enviar/validar/homologar este risco? Se não, por quê?". A tela só obedece.

---

## Para praticar

1. Rode o RADAR em modo demonstração, abra o Painel e, no console do navegador, digite
   `localStorage.setItem('radar.demo-estado.v1', 'erro')` e recarregue. Que tela apareceu? Troque por
   `carregando`. Para voltar ao normal, `localStorage.removeItem('radar.demo-estado.v1')`.
2. Leia `lerTodasAsPaginas` e calcule quantas chamadas faria para 2.001 linhas (resposta: 3).
3. Rode o modo real ([[guia-supabase-local]]) e compare o que a CGOV e um gestor veem na lista de riscos.
