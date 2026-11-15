# 🧠 Mapa Central do Projeto RADAR (MOC — Map of Content)

Bem-vindo ao **Segundo Cérebro** do projeto `cgov-riscos` no Obsidian! Este arquivo conecta toda a documentação de negócio, arquitetura e aprendizado do sistema web **RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos)** do ICMBio.

## 📌 1. Memória Ativa do Projeto
- [[ESTADO-ATUAL]] — O que já foi construído, status dos testes e próximos passos.
- [[GLOSSARIO-ACESSIVEL]] — Explicação sem jargões dos termos de programação e das siglas oficiais da CGOV.

## 📜 2. Base Normativa e Regras de Cálculo (Regime B)
- [[matriz-regras-regime-b]] — Tabelas oficiais dos Quadros 1 a 8 da Metodologia (SEI `024421455`), Política RADAR (SEI `024241420`) e Tabela de Apoio 25×5 da skill `cgov-gestao-riscos-v4`.
- [[20171122_Decreto 9203_Política de Governança APF]] — Decreto nº 9.203/2017, norma que ancora o projeto (comitê interno de governança, alta administração e gestão de riscos, arts. 15-A a 19).
- [[matriz-acesso-responsabilidades]] — Quem vê e quem faz o quê: árvore de unidades do Regimento Interno, matriz RACI, tabela de acesso por tela e decisões pendentes da CGOV (base do login e da RLS).
- [[2026-11-09-cgov-riscos-radar-design]] — Documento completo de Design e Arquitetura (Versão 2.0).
- [[2026-11-09-cgov-riscos-radar-plan]] — Plano de Implementação em 8 tarefas.

## 🏛️ 3. Arquitetura e Entrega para a CGTI/ICMBio
- [[modelo-dados-mer]] — Planta baixa do Banco de Dados PostgreSQL/Supabase (11 tabelas de negócio, inclusive `processos_cadeia_valor`, + a trilha `auditoria_log`; seção 3: unidades reais, perfis, funções de alcance, fluxo de 3 degraus e trilha).
- [[decisoes-tecnicas-b1]] — Decisões técnicas da etapa B1 (R1 a R23) e decisões da CGOV na revisão final (D1 segregação "sobe um nível", D2 exclusão de risco, D3 alcance do gestor), com motivo, custo e as pendências para a CGOV.
- [[guia-supabase-local]] — Como rodar o banco local, testar com pgTAP, importar a estrutura do SharePoint e resolver os erros comuns (etapa B1).
- [[2026-11-15-etapa-b1-banco-rls-design]] — Design da etapa B1 (banco, alcance e RLS); plano: [[2026-11-15-etapa-b1-banco-rls-plan]].
- [[guia-docker-cgti]] — Dossiê executivo e instruções de implantação via Container Docker para a CGTI.

## 🎓 4. Caderno de Aprendizado (Do Zero ao Deploy)
- [[01-como-funciona-o-vue3]] — Aula 1: O que são Componentes, Estado Reativo (`ref`, `computed`) e Pinia no Vue.js 3.
- [[02-entendendo-o-supabase-sql]] — Aula 2: Como funcionam Tabelas Relacionais, Chaves Estrangeiras (`FK`) e Segurança por Linha (`RLS`), com a seção nova sobre função de alcance e testes com pgTAP.
- [[03-empacotando-com-docker]] — Aula 3: Como o `Dockerfile` empacota o Vue.js com o servidor Nginx para rodar em qualquer máquina.
- [[04-design-tokens-e-componentes]] — Aula 4: Tokens de design, componentes, telas responsivas (modo cartão das tabelas) e acessibilidade.

## 🎨 5. Interface (Reformulação 2026-11)
- [[design-system]] — Tokens, componentes e resultados medidos das Fases 1 a 4.
- [[diagnostico-ui-2026-11]] — Diagnóstico inicial (heurísticas, WCAG e microcopy).
- [[manual-fluxo-figma-vscode]] — Como editar no Figma e levar a mudança para o código.
- [[varredura-acessibilidade]] — `npm run test:a11y`: como rodar, ler o relatório e incluir telas na varredura axe-core.
