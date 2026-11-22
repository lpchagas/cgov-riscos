# Decisões técnicas da etapa B3 (telas lendo e gravando no banco)

> **Arquivo congelado em 2026-11-21 (histórico).** Decisões vigentes: ADR-0009 (camada de dados com duas fontes) e ADR-0003 (valores calculados e `fator_controle`). Não edite este arquivo; novas decisões vão em `docs/adr/`.

> **Para que serve este documento:** registrar, num lugar só e versionado, as decisões da etapa B3
> que **mudam o comportamento** das telas, da camada de dados e da migração `20261117001`. É o irmão de
> [[decisoes-tecnicas-b1]] e [[decisoes-tecnicas-b2]]. Cada linha diz **o que** foi decidido, **por quê**
> e **qual o custo ou efeito**.
>
> Base: spec [[2026-11-16-etapa-b3-telas-banco-design]], plano [[2026-11-16-etapa-b3-telas-banco-plan]].
> Normas: minutas da Política (SEI `024241420`) e da Metodologia (SEI `024421455`), até a publicação.
>
> Códigos: **B3-1 a B3-6** = decisões do dono do produto (CGOV) em 2026-11-16, antes da execução;
> **B3-7 em diante** = decisões tomadas durante a execução (cada uma com o custo se estiver errada).

## 1. Decisões do dono do produto (2026-11-16)

| Código | O que | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **B3-1** | **Abordagem A:** uma camada de dados (`src/services/dados/`) com duas fontes, **demonstração** (memória) e **Supabase** (banco). A store (`riscosStore.ts`) escolhe a fonte pelo modo (`authStore.modo`) e as telas não sabem de onde vêm os dados. | A varredura de acessibilidade e a apresentação offline continuam funcionando sem Docker (B2-1), e as telas são escritas uma vez só. | Duas implementações do mesmo contrato (`FonteDados`), mantidas por testes que comparam os dois lados. |
| **B3-2** | Função **`acoes_no_fluxo(riscos uuid[])`** (só leitura): para cada risco, diz se a pessoa logada pode enviar, assumir, validar, homologar, devolver, e o `motivo` quando não pode. | O botão só deve aparecer quando a ação passaria. Copiar a regra no front a deixaria diferente da do banco. | Uma função a mais no banco. As colunas chamam as **mesmas** funções internas do fluxo (sem regra repetida). |
| **B3-3** | Função **`salvar_ficha_risco(ficha jsonb)`**: grava a ficha inteira (risco, controles, respostas, KRIs, ações) **numa só transação**. | Gravar tabela por tabela pelo navegador deixaria fichas pela metade se a rede caísse. Uma chamada = tudo ou nada. | O formato do JSON é um contrato entre o front (`fichaParaJson`) e o banco. Testado nos dois lados. |
| **B3-4** | **Ampliação da migração** com `ler_auditoria` (leitura da trilha em páginas de 50, com cursor), as colunas `pode_editar` e `pode_excluir` em `acoes_no_fluxo` e `objetos_onde_gravo()`. | Auditoria sem paginação passaria de 1.000 linhas rápido; o botão "Editar"/"Excluir" deve seguir a regra do banco; o Objeto precisa saber onde a pessoa grava. | Tudo na mesma migração `20261117001` (a única da etapa). |
| **B3-5** | **Resumo de dados confirmado:** carregamento, auditoria, atividade recente, importar, erros e demonstração seguem o desenho da spec (seções 5 e 6). Referência visual nos Templates V3 do gov.br. | Uma única regra para as 7 telas. | Nenhum. |
| **B3-6** | **Calls registradas na spec (seção 10):** botão só aparece se a ação passar e a tela explica pelo `motivo`; "recalculado pela DAR" só quando campos calculados mudaram; código por sequência global; atividade recente pelo histórico do fluxo; auditoria em páginas de 50; chave de teste `radar.demo-estado.v1`; sem tempo real; reler depois de cada ação. | Simplicidade e previsibilidade. | Sem tempo real: quem quer ver o que outra pessoa fez usa "Atualizar" (ou muda de tela). |

## 2. Decisões da execução

| Código | O que | Por quê | Custo / efeito |
| --- | --- | --- | --- |
| **B3-7** | **`acoes_no_fluxo` usa a criticidade GRAVADA** (`is_critico`/`status_critico`), não recalcula. | A criticidade "fresca" só existe dentro do gatilho de cálculo, que não pode ser tocado (regra: o cálculo é intocável). Copiar a regra "Médio × apetite" violaria o anti-objetivo de não repetir regra. | **Lacuna conhecida:** depois que a DAR muda, um risco **não aprovado e não editado** pode mostrar botão (enviar/validar) diferente do que a ação aceitaria. É raro; a recusa vem traduzida e, ao editar, o risco é recalculado. Ver Pendências. |
| **B3-8** | **`salvar_ficha_risco` deriva `fator_controle` da eficácia** pela tabela do Quadro 6 (Inexistente 1,0; Fraco 0,9; Mediano 0,75; Satisfatório 0,6; Forte 0,5), **sem aceitar o fator vindo do JSON**. O gatilho de cálculo **não mudou** e a trava de evidência segue nele. | O banco não tinha o mapeamento (a semente escrevia à mão) e aceitar o fator do navegador permitiria valor incoerente com a eficácia. No modo real o front **não grava valores calculados**. | Há uma cópia do Quadro 6 em SQL (num único `CASE`, usado no INSERT e no UPDATE). Mudou o Quadro 6? Atualize o `CASE` e o teste `081`. |
| **B3-9** | **Sequência do código RADAR global** (`riscos_codigo_seq`), **não recomeça por ano**; o ano é o de **Brasília** (`America/Sao_Paulo`). A semente deixa a sequência no maior NNN existente. | Duas pessoas salvando ao mesmo tempo não podem receber o mesmo número. O ano em UTC viraria 1º de janeiro 3 horas cedo. | O NNN do 1º risco de 2027 não é 001 (continua de onde parou). Testado como "NNN do novo código maior que o maior existente". |
| **B3-10** | **Ação concluída + releitura falha = sucesso com aviso.** A store guarda `avisoAtualizacao` ("A ação foi concluída, mas não foi possível atualizar a tela. Use Atualizar."), mostrado pelo `AvisoAtualizacao` no `App.vue`, e limpo na próxima leitura bem-sucedida. | Dizer "falhou" faria a pessoa repetir uma ação que já foi gravada (validar duas vezes, duplicar um risco). | Todas as telas dependem de um aviso global; a mensagem é única. |
| **B3-11** | **Modo de edição da ficha:** `/riscos/novo?editar=<id>`. O formulário edita **só o 1º controle, a 1ª ação e o 1º KRI**; os demais são **preservados** (enviados de volta sem mudança). Apagar um KRI que **tem medições** pede confirmação. Campos opcionais podem ser esvaziados (o front envia `null`, não omite). | O assistente de 4 etapas tem um campo de cada; editar a lista completa é outra tela. Omitir um campo significa "manter", então apagar texto exige `null`. | Quem precisa mexer no 2º controle ainda não tem tela para isso. Ver Pendências. |
| **B3-12** | **Importar: tentar de novo só as linhas recusadas.** A importação usa `salvarFicha` (risco `preliminar_cgov`), uma linha por vez. Depois de uma falha parcial, o botão repete **só as recusadas**. **Reimportar a tabela inteira depois de uma nova prévia duplica** os riscos, e isso é aceito, de propósito. | Repetir só o que falhou evita duplicar; bloquear a reimportação impediria a CGOV de importar de novo de propósito. | A CGOV precisa saber: nova prévia + confirmar = riscos novos. |
| **B3-13** | **A CGOV mantém os itens neutros de supervisão no Painel** ("Precisa da sua atenção"): as filas de validação/homologação aparecem como supervisão, não como tarefa dela. As contagens "a sua validação/homologação" usam só os riscos com `podeValidar`/`podeHomologar` verdadeiros. | A matriz de acesso dá à CGOV o papel de acompanhar as filas (R/A). | Mais itens no Painel da CGOV. |
| **B3-14** | **"Recalculado pela DAR"** = só campos **calculados** mudaram entre a leitura anterior e a nova (risco inerente, residual, nível, crítico), sem marca no banco. | Evita coluna nova e mantém o cálculo intocável. | Se alguém editar a ficha e mudar o cálculo ao mesmo tempo, a marca pode aparecer; é só um aviso informativo. |
| **B3-15** | **Toda lista no modo real usa `lerTodasAsPaginas`** (1.000 por página, ordem terminando em `id`), exceto a Auditoria (cursor de 50). | O PostgREST corta em 1.000 linhas sem avisar. | Mais chamadas ao abrir tela com muito dado. |
| **B3-16** | **Erros do banco passam por `traduzirErroBanco`:** só texto que começa por `RADAR:` aparece; o resto vira mensagem genérica (rede, permissão, estado, validação, não encontrado, desconhecido). | Nunca mostrar texto técnico do PostgreSQL. | Uma mensagem nova do banco precisa de linha no dicionário (`errosBanco.ts`). |
| **B3-17** | **Estados de carregamento e erro** têm componentes próprios (`EstadoCarregamento`, `ErroPagina`, `AvisoAtualizacao`) e entram na varredura de acessibilidade pela chave `radar.demo-estado.v1` (`carregando` ou `erro`). Total da varredura: (16 + 4) telas × 4 larguras × 3 temas. | O estado de erro precisa de teste de acessibilidade tanto quanto a tela normal. | 48 combinações a mais na varredura. |

### 2.1 Julgamentos da revisão final (custo zero)

- **Varredura `acoes_no_fluxo` ⇔ regra de negócio:** o teste percorre TODAS as pessoas de `perfis_usuarios` da semente, inclusive `inativo@` (todas as ações falsas) e excluindo `sem-perfil@` (não tem perfil). O número "18" do plano era aproximado; vale a lista real da semente.
- **Aprovações e Painel:** ficaram listando por `statusFluxo` até as Tarefas 9 e 12 trocarem por `acoes_no_fluxo`. Resolvido: hoje as filas vêm das ações liberadas pelo banco.
- **Tradução dos erros 22023:** as mensagens novas da migração `20261117001` (ficha fora do formato, controle/resposta/KRI que não pertence ao risco, mais de 1000 riscos) usam o código `22023`, que o plano B por código traduzia como "Informe o motivo.". Entradas no dicionário de `errosBanco.ts` (antes do plano B) corrigem isso, com teste que passa todas as mensagens da migração.
- **Corrigidos na revisão final** (antes adiados): coluna "Ações" visível no celular em Objetos; erro de destino some ao trocar a unidade; CSV da auditoria com guarda contra fórmula (`'` antes de `=`, `+`, `-`, `@`, tab, CR).

## 3. Pendências

### 3.1 Que dependem da CGOV ou ainda estão abertas desde a B1.1

- **Cargo vago trava o fluxo** (B1.1): sem titular na chefia, o risco não sobe. A tela mostra o `motivo`, mas a solução é completar a lista de atribuições.
- Ramo "validador sem ator efetivo" ainda sem teste nomeado; errata dos comentários das migrações `004` e `005`; IDs fixos `10.0000`, `10.0001` e `10.0002` que o `sync:estrutura` precisa manter (ver [[decisoes-tecnicas-b1]]).
- ~~**Painel no celular**~~ — feito na etapa C (ver [[decisoes-tecnicas-c]]; a meta de 3.500 px não foi atingida, mediu 3.690 px).
- **Homologação na CGTI** (etapa D, SMTP e limites de produção).

### 3.2 Adiadas na B3 (pequenas, mas que o usuário pode notar)

- **Criticidade gravada** (B3-7): botão pode divergir da ação em risco não aprovado e não editado depois de mudança da DAR.
- **Formulário edita só o 1º controle/ação/KRI** (B3-11): os demais são preservados, mas não editáveis ali.
- **Salvar sem mudança em risco travado** dá a recusa `55000` (o `UPDATE` sempre roda). Mensagem traduzida.
- **"Carregando mais" preso** após trocar o filtro da auditoria; aviso da DAR não some sozinho.
- **Texto "0 de 1"** na nova tentativa do Importar; reenvio usa o objeto selecionado no momento.
- Ao carregar, a tela troca tudo pelo esqueleto (sem manter o conteúdo antigo enquanto relê).
