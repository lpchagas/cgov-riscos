# ADR-0009: Dois modos de execução: demonstração (sem `.env`) e real

## Status

Accepted

Data: 2026-11-15 (B2-1); estendida em 2026-11-16 pela camada de dados (B3-1); registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b2.md` B2-1; `decisoes-tecnicas-b3.md` B3-1; `src/stores/authStore.ts` (`modo`).

## Contexto

A varredura de acessibilidade, as apresentações offline e o desenvolvimento do dia a dia não devem depender
de Docker nem de banco. Ao mesmo tempo, o sistema precisa do login e dos dados reais do Supabase.

## Decisão

Nós vamos ter **dois modos**, escolhidos pelas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`:
**com `.env`**, login real e dados do banco (o simulador de perfis some); **sem `.env`**, "Modo
demonstração", com faixa de aviso, simulador dos 10 perfis e dados em memória. Uma camada de dados
(`src/services/dados/`) tem duas fontes, demonstração e Supabase, atrás do mesmo contrato `FonteDados`.

## Consequências

**Positivas**
- `npm run test:a11y` e a demonstração funcionam sem infraestrutura.
- As telas são escritas uma vez, sem saber a origem dos dados.

**Negativas**
- Duas implementações do contrato, mantidas por testes que comparam os dois lados.
- A varredura de acessibilidade não exercita o login real.

**Neutras**
- O modo é decidido na inicialização; a produção sempre traz `.env`.

## Alternativas consideradas

- **Só modo real:** exigiria Docker até para ver a interface.
- **Mocks espalhados nas telas:** a regra se repetiria em cada uma.
