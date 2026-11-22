# ADR-0004: Usar Vue 3, TypeScript e `@govbr-ds/core` no front-end

## Status

Accepted

Data: 2026-11-09 (Documento de Design v2.0, § 5); registrada em ADR em 2026-11-21.

Origem: `docs/superpowers/specs/2026-11-09-cgov-riscos-radar-design.md` § 1.2, § 2.1 e § 5 ("Abordagem 1").

## Contexto

O RADAR precisa de uma interface web que a CGTI/ICMBio aceite avaliar e que a equipe da CGOV consiga manter.

- As tentativas anteriores usaram React dentro do Teams (v1.1) e Power Apps (v1.2); a primeira exigia
  permissões avançadas da TI corporativa antes de existir qualquer tela.
- O Padrão Digital de Governo (`@govbr-ds/core`) é o estilo esperado para sistemas públicos federais.
- O responsável pelo projeto é iniciante em programação e o código serve também de material de aprendizado.
- O cálculo do risco precisa responder na hora, enquanto a pessoa edita a ficha.

## Decisão

Nós vamos construir o front-end com **Vue 3** (Vite, Pinia e Vue Router) em **TypeScript**, usando componentes Vue
simples estilizados com o CSS oficial do **`@govbr-ds/core`**, sem biblioteca de componentes de terceiros.

## Consequências

**Positivas**
- Visual e acessibilidade alinhados ao padrão do governo federal.
- Vue tem curva de aprendizado suave; TypeScript pega erros de tipo antes de rodar.
- Sem dependência de Teams, SharePoint ou Azure: o app roda em qualquer servidor web.

**Negativas**
- O `@govbr-ds/core` entrega CSS, não componentes Vue prontos: foi preciso escrever os componentes
  (`src/components/ui/`) e uma camada de tokens próprios.
- Ficamos presos ao ritmo de atualização do padrão gov.br.

**Neutras**
- O cálculo também existe em TypeScript, como espelho do banco (ver [[0006-ler-inerente-do-quadro-7-no-banco-com-espelho-em-typescript]]).

## Alternativas consideradas

- **React dentro do Teams** (v1.1) e **Power Apps** (v1.2): bloqueio de permissão e limite de itens do SharePoint.
- **Vue + biblioteca de componentes pronta:** estilo diferente do padrão gov.br.
