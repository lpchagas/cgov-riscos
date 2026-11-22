# UC-05 — Identificar e registrar risco (com Teste de Integridade)

> Origem: F1.01; Metodologia 4.2, 4.2.1, 4.2.2 e 4.2.2.1; Política art. 17, I; Portaria ICMBio nº 253/2026 (Programa Integra+) · RF: RF-030, RF-031, RF-032, RF-033, RF-034, RF-035, RF-036, RF-047, RF-013, RF-153 · RN: RN-014, RN-006, RN-015, RN-016, RN-017, RN-018, RN-027, RN-099, RN-095 · Situação: implementado

## Título

Identificar e registrar risco, com o Teste de Integridade.

## Ator principal

Gestor de riscos (1ª linha) da unidade dona do objeto: qualquer perfil grava riscos da própria unidade (Política art. 17, § 1º; [[matriz-acesso-responsabilidades]] §7, "Novo risco").

## Pré-condições

- O gestor entrou no RADAR com perfil ativo ([[UC-01-entrar-por-link-de-email]]).
- Há objeto de gestão da unidade do gestor ([[UC-04-cadastrar-objeto-de-gestao]]).

## Pós-condições

- Nenhum risco é gravado na categoria mista proibida (RN-016) nem fora da unidade do gestor (RN-027).
- Toda inclusão fica na trilha de auditoria (RN-095).

## Fluxo principal de sucesso

1. O gestor escolhe o objeto de gestão, entre os da própria unidade (RN-027).
2. O gestor descreve a causa, o evento de risco, a consequência e o objetivo afetado.
3. O sistema monta a descrição na sintaxe do item 4.2.1: "Devido o(a) <causa>, poderá ocorrer o(a) <evento de risco>, ocasionando o(a) <consequência> e…" (RN-014).
4. O gestor responde ao Teste de Integridade: o objeto envolve decisão sobre beneficiário, licença ou autorização, fiscalização ou sanção, ou contratação ou atestação? (RN-006)
5. O gestor escolhe uma única categoria, a dominante (RN-015).
6. O sistema confere a regra de Integridade: categoria mista recusada (RN-016); categoria Integridade com subcategoria (RN-017); teste aplicável e outra categoria com justificativa (RN-018).
7. O gestor segue para a análise ([[UC-06-analisar-risco-e-avaliar-controles]]) e grava a ficha.
8. O sistema grava o risco em rascunho, com o código `RADAR-<ano>-<NNN>` (RN-099), e registra a inclusão na trilha de auditoria (RN-095).

Na ficha do sistema, a identificação (este caso de uso), a análise (UC-06) e o tratamento (UC-07) são preenchidos em etapas e gravados de uma vez. Foram separados aqui porque a norma os separa (itens 4.2, 4.3 e 4.5).

## Fluxos alternativos e de exceção

- 1a. O gestor não escolhe objeto, ou falta causa, evento, consequência ou objetivo: o sistema não avança e diz o que falta.
- 4a. O teste se aplica e o gestor escolhe a categoria Integridade: segue no 6 com a exigência de subcategoria.
- 5a. O gestor tenta a categoria mista que junta Operacional e Integridade: o sistema recusa (RN-016).
- 5b. A lista de categorias é a do Quadro 2 (LAC-14, resolvida em 2026-11-22; RN-015). O banco do piloto na nuvem ainda aguarda a migração (Fase 2).
- 6a. Categoria Integridade sem subcategoria: o sistema não avança e pede uma das 6 subcategorias (RN-017). A lista oferecida é a do Quadro 3, e o banco recusa a gravação sem ela (LAC-15, resolvida em 2026-11-22). Ao trocar a categoria para outra que não Integridade, a tela limpa a subcategoria.
- 6b. O teste se aplica, a categoria não é Integridade e falta a justificativa de pelo menos 10 caracteres: o sistema não avança (RN-018).
- 8a. O banco recusa a gravação (por exemplo, objeto de outra unidade ou sessão vencida): nada é gravado e o sistema mostra o motivo.

## Pós-condição de sucesso

- O risco está gravado em rascunho, no objeto da unidade, com código do RADAR, descrição na sintaxe do 4.2.1, uma categoria, o Teste de Integridade respondido, e a inclusão na trilha de auditoria.
