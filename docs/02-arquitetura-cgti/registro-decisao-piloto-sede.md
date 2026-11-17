# Registro de Decisão — Piloto do RADAR com dados reais da Sede (modelo)

> **Como usar este modelo:** é o texto-base para a **assinatura da Coordenação da CGOV**. Os campos entre
> colchetes são preenchidos antes da assinatura. A versão assinada vai ao **SEI**, nunca ao repositório.
> Este arquivo não contém nome, e-mail nem dado pessoal.
> Decisões de origem: [[decisoes-tecnicas-d]] (D0-1 a D0-16) e [[2026-11-17-etapa-d0-d1-piloto-sede-design]].

**Processo SEI:** [número do processo SEI] · **Data:** [data]
**Responsável pela decisão:** [nome do(a) Coordenador(a)], Coordenação de Governança (CGOV/ICMBio)
**Responsável técnico pelo piloto:** [nome do responsável técnico]

## 1. Finalidade

Testar e operacionalizar o Sistema RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos) com **dados reais**,
antes de levá-lo à CGTI. A CGOV processa atos normativos, importa as fichas de risco, as Coordenações-Gerais
validam e os Diretores homologam. O RADAR operacionaliza a Política de Gestão de Riscos (minuta SEI `024241420`)
e a Metodologia (minuta SEI `024421455`), até a publicação.

## 2. Recorte

**Sede**: 152 unidades ativas (Presidência, DIPLAN, DIMAN, DISAT e DIBIO). Ficam fora as Gerências Regionais,
Centros de Pesquisa, Coordenações Técnicas, Unidades de Conservação e Núcleos de Gestão Integrada.

## 3. Dados tratados

**Entram:**
- nome, e-mail institucional e unidade dos usuários;
- fichas de risco, inclusive as de **integridade** (Programa Integra+, Portaria ICMBio nº 253/2026).

**Não entram:** matrícula e CPF.

## 4. Onde os dados ficam

| Onde | O que | Observação |
| --- | --- | --- |
| Supabase, região São Paulo, plano gratuito | Banco do piloto (dados reais) | Conta do responsável técnico (D0-1) |
| Power Pages **ou** Cloudflare Pages | Só a tela (front); não guarda dados | Conta do responsável técnico; no Cloudflare, e-mail institucional e endereço `*.pages.dev` (D0-8, D0-11) |
| Máquina institucional do ICMBio | Cópias diárias **cifradas** do banco | Fora do repositório (D0-2, D0-10) |
| Computador pessoal do responsável técnico | Dados reais também, **até o encerramento da D5** (piloto assistido) | Depois, só no institucional; os do computador pessoal são apagados (D0-13) |

## 5. Quem acessa

- **Painel do Supabase (administração):** somente o responsável técnico (D0-6).
- **Sistema:** somente contas criadas pela CGOV, com os perfis da matriz de acesso ([[matriz-acesso-responsabilidades]]).
  Cada pessoa vê só o que o seu alcance permite (regras de acesso por linha no banco, RLS).

## 6. Retenção e exclusão

Até a homologação da CGTI e a migração, **no máximo 6 meses** contados da primeira carga real (D0-5). No fim:
exportação para a CGOV e **exclusão do projeto em nuvem**; as cópias cifradas são apagadas 2 meses depois.

## 7. Riscos aceitos e medidas

| Risco aceito | Medida |
| --- | --- |
| Pausa do projeto por inatividade (plano gratuito) | A cópia diária acessa o banco; se não bastar, consulta leve agendada (D0-3) |
| Ausência de backup restaurável do provedor | Cópia lógica diária **cifrada**, com **restauração testada** e repetida todo mês (D0-2) |
| Dia com o computador desligado = dia sem cópia | Aviso quando a última cópia passar de 36 horas |
| Dados reais em equipamento pessoal até a D5 | Disco protegido, uso restrito ao responsável técnico, apagamento ao fim da D5 |
| Acesso indevido às fichas | RLS no banco, senha forte e bloqueio por tentativas (D2), conta de administração só do responsável |
| Envio de e-mail a servidores | **Nenhum e-mail** do sistema é enviado a servidores do ICMBio durante o piloto |

## 8. Critérios de sucesso do piloto

Cobertura ampla da Sede em 2 a 3 meses (D0-7). **Números propostos, a confirmar pela CGOV:**

| Critério | Meta proposta | Situação |
| --- | --- | --- |
| Tempo de validação pela Coordenação-Geral | até 10 dias úteis | a confirmar pela CGOV |
| Tempo de homologação pelo Diretor | até 10 dias úteis | a confirmar pela CGOV |
| Taxa de recusa no Importar | até 10 % das linhas | a confirmar pela CGOV |
| Riscos homologados | ao menos um em cada uma das 5 áreas (Presidência, DIPLAN, DIMAN, DISAT, DIBIO) | a confirmar pela CGOV |

## 9. Base legal e normativa

- Lei nº 13.709/2018 (LGPD);
- Instrução Normativa GSI/PR nº 5/2021 (uso de computação em nuvem);
- Decreto nº 9.203/2017, art. 17 (gestão de riscos na governança pública).

## 10. Condição e fim do piloto

Nenhuma carga de dados reais ocorre **antes da assinatura** deste registro. O piloto termina com a homologação da
CGTI e a migração, ou ao fim do prazo de retenção, o que ocorrer primeiro.

**Assinatura:** [nome do(a) Coordenador(a)], Coordenação de Governança · [data] · SEI [número do documento]

---

## Aviso 1 — ao encarregado de dados do ICMBio

> **Assunto:** Aviso de piloto do Sistema RADAR com dados pessoais mínimos (Sede)
>
> Prezado(a) Encarregado(a) de dados, a Coordenação de Governança (CGOV) comunica o início de um piloto do
> Sistema RADAR (gestão de riscos) com dados reais da Sede, conforme o Registro de Decisão do processo SEI
> [número do processo SEI], de [data].
>
> Dados tratados: nome, e-mail institucional e unidade dos usuários, e fichas de risco (inclusive de
> integridade). Não são tratados matrícula nem CPF. Os dados ficam em banco na nuvem (Supabase, São Paulo), com
> cópias cifradas na máquina institucional, e serão excluídos em até 6 meses da primeira carga. Nenhum e-mail do
> sistema é enviado a servidores durante o piloto.
>
> O piloto não depende de resposta, mas a CGOV agradece qualquer orientação. Contato: [contato do responsável
> técnico].

## Aviso 2 — à CGTI

> **Assunto:** Aviso de piloto do Sistema RADAR (ambiente do piloto e etapa de avaliação)
>
> Prezados, a CGOV comunica que realiza piloto do Sistema RADAR com dados reais da Sede, conforme o Registro de
> Decisão do processo SEI [número do processo SEI], de [data].
>
> O banco do piloto roda no Supabase (plano gratuito, São Paulo), em conta do responsável técnico. A tela é
> publicada no Power Pages ou, se não for possível, no Cloudflare Pages (conta do responsável técnico, criada com
> e-mail institucional, endereço `*.pages.dev`). As cópias diárias são cifradas e ficam na máquina institucional.
> O mesmo sistema também roda em container Docker local, para a avaliação da CGTI ([[guia-docker-cgti]]).
>
> O piloto é uma etapa preparatória: a CGOV pretende levar o sistema à avaliação da CGTI e migrar para o
> ambiente institucional que a CGTI indicar. Contato: [contato do responsável técnico].
