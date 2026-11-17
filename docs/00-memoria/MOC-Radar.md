# 🧠 Mapa Central do Projeto RADAR (MOC — Map of Content)

Bem-vindo ao **Segundo Cérebro** do projeto `cgov-riscos` no Obsidian! Este arquivo conecta toda a documentação de negócio, arquitetura e aprendizado do sistema web **RADAR (Rede de Avaliação, Diagnóstico e Ação em Riscos)** do ICMBio.

## 📌 1. Memória Ativa do Projeto
- [[ESTADO-ATUAL]] — O que já foi construído, status dos testes e próximos passos.
- [[prompt-etapa-d-piloto-sede]] — Prompt de partida da etapa D (nova): piloto com dados reais só na Sede, dois ambientes e login por senha temporária; depois homologação da CGTI.
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
- [[decisoes-tecnicas-b2]] — Decisões técnicas da etapa B2 (B2-1 a B2-9 da CGOV e T1 a T11 da execução: link com `token_hash`, dois modos, Edge Function, importador de atribuições) e achados para a CGOV (CT Cuiabá, unidades sem titular).
- [[decisoes-tecnicas-b3]] — Decisões técnicas da etapa B3 (B3-1 a B3-17: camada de dados, `acoes_no_fluxo`, `salvar_ficha_risco`, estados de tela) e pendências.
- [[decisoes-tecnicas-c]] — Decisões técnicas da etapa C (Painel no celular: D-C1 a D-C3 da CGOV, calls C-1 a C-8, medição final e tabela do Code Connect) e pendências.
- [[decisoes-tecnicas-d]] — Decisões técnicas da etapa D (piloto da Sede: D0-1 a D0-16 e decisões da execução da D1); spec: [[2026-11-17-etapa-d0-d1-piloto-sede-design]].
- [[registro-decisao-piloto-sede]] — Modelo do Registro de Decisão do piloto (para assinatura da CGOV no SEI) e dos dois avisos (encarregado de dados e CGTI).
- [[2026-11-16-etapa-c-painel-celular-design]] — Design da etapa C (Painel no celular); plano: [[2026-11-16-etapa-c-painel-celular-plan]].
- [[2026-11-16-etapa-b3-telas-banco-design]] — Design da etapa B3 (telas lendo e gravando no banco); plano: [[2026-11-16-etapa-b3-telas-banco-plan]].
- [[guia-copia-restauracao]] — Cópia cifrada diária (`age`) e restauração no Supabase local (etapa D1); a primeira prova completa com o `age` ainda está pendente.
- [[guia-computador-de-trabalho]] — Montar o computador de trabalho (Windows + WSL + Docker Engine) e a rotina de trocar entre o computador institucional e o de casa (etapa D1).
- [[guia-supabase-local]] — Como rodar o banco local, testar com pgTAP, importar a estrutura do SharePoint e resolver os erros comuns (etapa B1); seções novas da B2: entrar localmente pelo Mailpit, Edge Function `gerenciar-acesso` e `sync:atribuicoes`.
- [[2026-11-15-etapa-b2-login-perfis-design]] — Design da etapa B2 (login por link de e-mail e perfis); plano: [[2026-11-15-etapa-b2-login-perfis-plan]].
- [[2026-11-15-etapa-b1-1-regras-banco-design]] — Design da etapa B1.1 (regras do banco: Presidência, objetos, preliminar da CGOV, DAR); plano: [[2026-11-15-etapa-b1-1-regras-banco-plan]]; decisões B11-1 a B11-9 em [[decisoes-tecnicas-b1]] seção 5.
- [[2026-11-15-etapa-b1-banco-rls-design]] — Design da etapa B1 (banco, alcance e RLS); plano: [[2026-11-15-etapa-b1-banco-rls-plan]].
- [[guia-docker-cgti]] — Dossiê executivo e instruções de implantação via Container Docker para a CGTI.

## 🎓 4. Caderno de Aprendizado (Do Zero ao Deploy)
- [[01-como-funciona-o-vue3]] — Aula 1: O que são Componentes, Estado Reativo (`ref`, `computed`) e Pinia no Vue.js 3.
- [[02-entendendo-o-supabase-sql]] — Aula 2: Como funcionam Tabelas Relacionais, Chaves Estrangeiras (`FK`) e Segurança por Linha (`RLS`), com a seção nova sobre função de alcance e testes com pgTAP.
- [[03-empacotando-com-docker]] — Aula 3: Como o `Dockerfile` empacota o Vue.js com o servidor Nginx para rodar em qualquer máquina.
- [[04-design-tokens-e-componentes]] — Aula 4: Tokens de design, componentes, telas responsivas (modo cartão das tabelas) e acessibilidade.
- [[05-login-sessao-e-guardas]] — Aula 5: link mágico, sessão e renovação, por que o menu não é segurança (a RLS é) e os dois modos (demonstração e real).
- [[06-camada-de-dados-e-async]] — Aula 6: camada de dados com duas fontes, `async/await`, estados de carregamento e erro, paginação de 1.000 linhas e por que a ficha é gravada por uma função.

## 🎨 5. Interface (Reformulação 2026-11)
- [[design-system]] — Tokens, componentes e resultados medidos das Fases 1 a 4.
- [[diagnostico-ui-2026-11]] — Diagnóstico inicial (heurísticas, WCAG e microcopy).
- [[manual-fluxo-figma-vscode]] — Como editar no Figma e levar a mudança para o código.
- [[varredura-acessibilidade]] — `npm run test:a11y`: como rodar, ler o relatório e incluir telas na varredura axe-core.
