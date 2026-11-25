# ADR-0021: Alerta do KRI e comunicações à CGOV calculados e guardados no banco

## Status

Accepted

Data: 2026-11-25 (decisões do responsável pelo projeto, pela CGOV, de 2026-11-23 a 2026-11-25).

Origem: [[2026-11-23-alerta-kri-comunicacoes-design]]; [[2026-11-23-alerta-kri-comunicacoes-plan]];
[[2026-11-23-p02-tratar-alerta-kri-design]]; [[2026-11-23-p03-comunicar-fato-cgov-design]];
[[UC-15-registrar-medicao-de-kri-e-tratar-alerta]]; [[UC-16-comunicar-fato-de-risco-a-cgov]];
[[lacunas-norma-sistema]] (LAC-03 e LAC-04); [[0005-usar-postgresql-supabase-com-rls]];
[[0017-lacunas-que-bloqueiam-homologacao-antes-da-cgti|ADR-0017]].

## Contexto

Pela Metodologia (SEI `024421455`), item 4.7.1 (parágrafo do alerta) e item 4.7.2, passado o limite de alerta do
KRI, o gestor tem **10 dias úteis** da ciência para reavaliar o risco e comunicar o resultado à CGOV; no mesmo
prazo, comunica os fatos das hipóteses I a VI. O RADAR só guardava uma marca "em alerta" posta à mão, com limite e
valor em texto livre: não havia comparação, prazo, comunicação nem ciência da CGOV (LAC-03, que bloqueava a
homologação, e LAC-04). A pergunta era **onde** a regra mora: se fosse só no navegador, outra porta de gravação
(importador, API direta) passaria sem ela, e a CGOV não teria onde ler.

## Decisão

1. **A regra mora no banco** (abordagem escolhida entre três; a norma vale na fronteira de dados, como na
   [[0005-usar-postgresql-supabase-com-rls|ADR-0005]]). Duas migrações, uma por lacuna, para a revisão e a
   aplicação na nuvem serem por partes: `20261123002_lac03_alerta_kri.sql` e `20261123003_lac04_comunicacoes_cgov.sql`.
2. **Limite numérico.** `indicadores_kri` ganha `limite_operador` (`>`, `>=`, `<`, `<=`), `limite_valor` e
   `limite_unidade`; o texto antigo (`limite_alerta`) fica só para leitura. A migração converte **só o que não
   deixa dúvida** (ex.: `> 10%`, "abaixo de 70%"); o resto aparece como "limite a converter", sem conversão no
   chute. A unidade convertida é `%` ou uma palavra de pelo menos 3 letras. KRI novo, também pela
   `salvar_ficha_risco`, é gravado com o número.
3. **O banco calcula o alerta.** `medicoes_kri.valor_numerico` é comparado com o limite por um gatilho que
   **ignora** o `em_alerta` enviado pelo cliente; a primeira leitura além do limite abre um registro em
   `alertas_kri` (um alerta aberto por KRI, índice único parcial). A ciência é o **dia do registro** da leitura.
   Leitura dentro do limite não encerra o alerta, e nova leitura em alerta não reinicia o prazo. As leituras
   antigas não ganham alerta retroativo.
4. **Dias úteis.** Segunda a sexta sem os feriados da tabela `feriados` (nacionais de 2026 e 2027, mantida pela
   CGOV sem nova migração), por `fn_somar_dias_uteis` e `fn_dias_uteis_entre`. Todo "hoje" é o dia de Brasília
   (`fn_hoje`), para o prazo não deslocar entre 21h e 24h. O front tem o mesmo cálculo, conferido por teste.
5. **Comunicação imutável.** `comunicacoes_cgov` e `comunicacoes_riscos` não têm política nem privilégio de
   `UPDATE` ou `DELETE`; um gatilho recusa mudar qualquer coluna além das três da ciência da CGOV, que se dá **uma
   vez** (`registrar_ciencia_comunicacao`, só da CGOV). A gravação é a RPC `enviar_comunicacao`, numa transação.
   Fora do prazo **grava** (o prazo é informação, não trava). Uma comunicação por alerta (`alerta_id` único); o envio
   **encerra** o alerta (gatilho). A hipótese `alerta_kri` pode suprir as hipóteses I a III.
6. **Alcance.** Riscos e alerta da comunicação são os da **unidade e das subunidades internas** (o mesmo alcance de
   `pode_escrever_unidade`); a AUDIT só lê; a CGOV vê tudo. A unidade que comunica é a do objeto do KRI; na falta,
   a do primeiro risco; na falta, a do perfil.
7. **Proteção do registro.** O banco recusa, com aviso em português, apagar risco já comunicado, a leitura que
   abriu um alerta e KRI com alerta (aberto ou comunicado). "Comunicado" vale na tela só até a próxima leitura em
   alerta. O vínculo de risco só entra na transação que criou a comunicação (`criada_na_transacao`, `xid8`).
8. **Decisões do responsável de 2026-11-25:** **D-6**, a CGOV mantém o botão "Nova comunicação" (o banco permite;
   a semente traz uma). **D-7**, alerta de KRI **sem risco ligado** continua sem "Comunicar à CGOV": a tela
   orienta ligar o KRI a um risco, e **não há migração nova** (o banco exige o risco na hipótese `alerta_kri`).
9. **Fora do escopo:** o RF-110 (propor a comunicação da hipótese I), a reavaliação própria (tela P-09: "Reavaliar"
   leva à ficha do risco), a cobrança pela CGOV (P-07) e o alerta no Painel.

Regras que valem a partir daqui: o cálculo dos Quadros 6, 7 e 8 **não muda**; o front mostra, não decide: o
"dia N de 10" é o `dia_atual` do banco (no dia da ciência, "dia 0 de 10"; vencido a partir do dia 11).

## Consequências

**Positivas**
- A regra vale para toda porta de gravação, e a P-07 (cobrança) poderá ler as mesmas visões
  (`alertas_kri_situacao`, `comunicacoes_cgov_situacao`).
- A comunicação enviada é prova: ninguém a edita nem a apaga pelo sistema; a trilha de auditoria cobre as tabelas.
- KRI antigo não é convertido no chute, e nenhum risco aprovado reabre por causa da migração (`fn_kri_completo`
  aceita o número ou o texto antigo).

**Negativas**
- O front de hoje depende das duas migrações: na nuvem, elas vão antes (ou junto) da publicação do front, uma por
  vez, com autorização a cada passo.
- A conversão do texto exige regra em dois lugares (função SQL e `limiteAlerta.ts`), mantidos iguais por teste.
- O alerta de KRI sem risco ligado só sai da fila quando alguém liga o KRI a um risco (D-7).

**Neutras**
- Os feriados de 2028 em diante precisam ser inseridos pela CGOV na tabela `feriados`.
- O bundle principal passou de ~487 kB para ~502 kB; a divisão em blocos fica para uma fase futura.

## Alternativas consideradas

- **Tudo calculado numa visão**, deduzindo o alerta das leituras e das comunicações. As regras "não reiniciar" e
  "encerrar só com comunicação" viram consulta difícil de testar.
- **Só no navegador.** Contraria "a norma vale no banco" e deixa a CGOV sem onde ler.
- **Converter todo texto de limite antigo.** Erraria em textos como "até 5 ou 6"; preferiu-se listar o que sobra.
- **Aceitar alerta de KRI sem risco ligado no banco (reverter D-7).** Exigiria migração nova e comunicação sem
  objeto de risco; o responsável preferiu orientar a ligar o KRI.
