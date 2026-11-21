# ADR-0005: Usar PostgreSQL/Supabase com RLS como fronteira de segurança

## Status

Accepted

Data: 2026-11-09 (escolha do Supabase, design v2.0 § 5); 2026-11-15 (RLS por alcance de unidade, etapa B1);
registrada em ADR em 2026-11-21.

Origem: `decisoes-tecnicas-b1.md` (D1 a D3, R16 a R19); [[matriz-acesso-responsabilidades]] § 4 e § 8;
`supabase/migrations/20261109002_rls_policies.sql` e `20261115003`.

## Contexto

Cada pessoa deve ver e alterar só os riscos do seu alcance (unidade própria e descendentes, ou todas as
unidades para perfis como Diretor, CGOV e Auditoria). Esconder botões no navegador é só conforto: quem
fala direto com a API ignora a tela. O projeto também precisa de cálculo auditável e de uma rota de
entrega para a CGTI.

## Decisão

Nós vamos usar **PostgreSQL no Supabase** e fazer a **RLS (Row Level Security)** do banco ser a fronteira de
segurança. As regras de alcance (`unidades_visiveis`, chefia imediata, homologador), do fluxo de aprovação e
da auditoria ficam em funções e políticas SQL; o front só reflete o que o banco permite. O visitante sem
login (`anon`) não tem acesso às tabelas de negócio.

## Consequências

**Positivas**
- A regra vale para qualquer cliente (tela, importador, API); o teste é feito no banco (ver [[0007-supabase-local-docker-e-pgtap]]).
- Um ponto só decide o alcance, em vez de repetir a regra em cada tela.

**Negativas**
- A lógica de segurança fica em SQL, mais difícil de ler para quem está começando.
- Política de RLS errada vaza dados em silêncio; exige testes por perfil (`supabase/tests/040`, `041`).
- Dependência do Supabase; a migração para outro PostgreSQL exigiria adaptar autenticação e funções.

**Neutras**
- Funções `SECURITY DEFINER` precisam de `search_path` fixo e permissão restrita.

## Alternativas consideradas

- **Autorização só na camada de aplicação:** descartada; qualquer chamada direta contornaria a regra.
- **SharePoint com listas** (v1.1 e v1.2): limite de 5.000 itens e textos repetidos entre listas.
