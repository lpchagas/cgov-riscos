# ADR-0008: Login por link de e-mail só para convidados (`token_hash`)

## Status

Accepted

Data: 2026-11-15 (etapa B2; a spec previa PKCE e a execução trocou para `token_hash`, decisão T1);
registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b2.md` (B2-3, B2-7, T1, T2); spec [[2026-11-15-etapa-b2-login-perfis-design]].

## Contexto

Só servidores convidados pela CGOV devem entrar; não há cadastro livre nem senha a guardar. O convite é
enviado pelo servidor, e a pessoa costuma abrir o e-mail em outro navegador ou aba. O fluxo PKCE exige abrir
o link no mesmo navegador que pediu o login, e `[auth.email] enable_signup = false` desliga todo login por
e-mail na CLI 2.122.

## Decisão

Nós vamos usar **link de acesso por e-mail** com **`token_hash` + `verifyOtp`** (rota `/entrar/retorno`),
sem senha. O cadastro livre fica barrado por `[auth] enable_signup = false` e por `shouldCreateUser: false`
no pedido de link; `[auth.email] enable_signup` fica `true` (T2). A rota pedida antes do login é guardada em
`localStorage` por 1 hora. O importador cria contas e perfis, mas **não envia e-mail**: a CGOV envia pela tela.

## Consequências

**Positivas**
- Sem senha para vazar ou redefinir; a conta existe só para quem a CGOV cadastrou.
- O link funciona mesmo aberto em outro navegador.

**Negativas**
- Link aberto em outro navegador, ou depois de 1 hora, entra no Painel (perde a rota de destino) ou expira.
- O acesso depende da entrega do e-mail; em produção, do SMTP institucional (etapa D, sem envio antes da CGTI aprovar).

**Neutras**
- A situação do convite fica no Supabase Auth (`app_metadata.convite_enviado_em`).

## Alternativas consideradas

- **PKCE:** quebra quando o link abre em outro navegador.
- **E-mail e senha:** mais superfície de ataque e de suporte.
