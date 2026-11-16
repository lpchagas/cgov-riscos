# Prompt de partida — Etapa D (nova): piloto com dados reais na Sede, depois homologação da CGTI

> Para colar na abertura de um chat novo neste projeto. Decisões de 2026-11-16: **dois ambientes** (nuvem = piloto; computador local do ICMBio = ensaio e avaliação da CGTI) e **login por senha temporária** durante o piloto. Substitui o prompt anterior da etapa D (que ia direto à homologação).

```text
Etapa D do RADAR (nova): piloto com dados reais, só para as unidades da Sede do ICMBio, e depois homologação na CGTI. Projeto cgov-riscos.

CONTEXTO
As etapas B1, B1.1, B2, B3 e C estão mescladas na main (C = PR #8, merge a127b08). Comece lendo docs/00-memoria/ESTADO-ATUAL.md e MOC-Radar.md, depois docs/02-arquitetura-cgti/ (guia-docker-cgti, guia-supabase-local, decisoes-tecnicas-b1, b2, b3 e c), docs/01-normativos/matriz-acesso-responsabilidades.md, Dockerfile, docker-compose.yml, nginx.conf, .env.example, supabase/config.toml, supabase/functions/gerenciar-acesso e scripts/sync-estrutura e sync-atribuicoes. Pendências das etapas anteriores: decisoes-tecnicas-b1 (cargo vago etc.), b3 seção 3 e c seção 3.

OBJETIVO
A CGOV vai registrar dados reais para testar e operacionalizar o sistema: ela processa atos normativos com a skill cgov-gestao-riscos, importa as fichas (tela Importar -> riscos preliminar_cgov), e as Coordenações-Gerais validam e os Diretores homologam. Primeiro só as unidades da SEDE (no retrato do SharePoint, macrogrupo "Sede": 152 unidades ativas; Presidência 40, DIPLAN 43, DIMAN 28, DISAT 23, DIBIO 18). Ficam fora GRs, Centros de Pesquisa, CTs, UCs e NGIs. Só depois do piloto vamos ao dossiê e à homologação da CGTI.

DECISÕES JÁ TOMADAS (não reabrir)
1. Infraestrutura "dois ambientes": (a) NUVEM (Supabase) = piloto da CGOV, com os dados reais da Sede; (b) COMPUTADOR LOCAL do ICMBio = o mesmo sistema em Docker (front + Supabase), para ensaio e para a CGTI avaliar, com dados de demonstração ou cópia autorizada por mim.
2. Login por SENHA TEMPORÁRIA no piloto (decisão minha, 2026-11-16; muda o desenho da B2, que era só link por e-mail). Restrições: nenhum e-mail é enviado pelo sistema; a CGOV cria a conta e gera/redefine a senha pela Edge Function gerenciar-acesso (service_role só no servidor); a senha aparece uma única vez para quem a gerou e é entregue fora do sistema; troca obrigatória no primeiro acesso; política de senha forte; bloqueio por tentativas; senha nunca em log, auditoria, arquivo ou commit; manter o link por e-mail pronto para voltar quando a CGTI aprovar; tudo com testes (TDD) e revisão de segurança.
3. Escopo Sede: perfis e atribuições SÓ da Sede (sync:atribuicoes com lista da Sede, em _temp/, nunca no repositório). RLS, cálculo e fluxo ficam como estão; o recorte vem do alcance. Decidir comigo se a CGOV continua vendo as unidades fora da Sede nos seletores.

FASES PROPOSTAS (ajustar comigo no brainstorming)
D0 Decisões e desenho: classificação dos dados reais e LGPD; plano do Supabase em nuvem (o gratuito pausa por inatividade e quase não tem backup: decidir plano e backup); retenção; quem acessa; critérios de sucesso do piloto; registro da decisão (engineering:architecture).
D1 Ambiente do piloto: banco remoto limpo (hoje tem 14 tabelas antigas vazias; zerar depende de AUTORIZAÇÃO MINHA) com as migrações; Edge Function publicada; variáveis e segredos; front em container; backup e RESTAURAÇÃO testados; ensaio da implantação no computador local.
D2 Acesso por senha temporária (decisão 2): desenho, testes, revisão de segurança, tela de gestão na página Usuários e perfis.
D3 Escopo Sede: carregar a estrutura, atribuições da Sede, perfis, conferência das chefias titulares (cargo vago trava o fluxo; avisos do importador).
D4 Operação da CGOV: roteiro (skill -> Importar -> revisão -> envio), regras de reimportação (reimportar a tabela inteira duplica; usar "tentar de novo só as recusadas"), registro de defeitos e melhorias, treinamento curto, runbook de operação e de incidentes.
D5 Piloto assistido: ciclos curtos, corrigir o que aparecer (uma onda por ciclo, com revisão), medir o que importa (fichas, tempo, erros).
D6 Dossiê e homologação da CGTI (o antigo D): arquitetura, segurança, checklist, roteiro de implantação, testes de aceite, reversão. Inclui SMTP e limites de produção e a volta ao link por e-mail.

REGRAS FIXAS (com os ajustes só do piloto, a confirmar comigo no D0 antes de gravar no AGENTS.md)
- Nunca abra, liste nem leia a pasta _temp/ (dados pessoais).
- Dados REAIS só existem no ambiente do piloto (nuvem) e em _temp/ quando precisar importar: nunca no repositório, nos testes, nas capturas, no Figma nem nos documentos. Testes, desenvolvimento e varredura continuam com dados de demonstração (@radar.test).
- Nenhum e-mail do sistema para servidores do ICMBio antes da aprovação da CGTI. Em desenvolvimento, só Mailpit. Envio real só para mim, com o meu aval.
- Não aplique nada no banco da nuvem, não publique Edge Function, não crie contas, não mude plano nem segredos sem a minha autorização explícita a cada passo. Push, merge e PR só quando eu pedir.
- Não altere o cálculo (Quadros 6, 7 e 8; calculadoraRiscoRadar.ts; trigger do banco), nem alcance, RLS ou fluxo, sem me perguntar. A mudança de login (D2) é autorizada; migração nova só se o plano a autorizar.
- Siglas: nunca "PGR" para Plano de Gestão de Riscos; nunca "Crítico" para o nível 18 a 25 (é "Extremo").
- Front com @govbr-ds/core e acessibilidade (0 violações no npm run test:a11y). Mudou biblioteca do Figma: entregar o bloco "O que você precisa fazer no Figma" (regra em AGENTS.md).
- Código e documentação com comentários didáticos em português do Brasil. Sou iniciante.

PROCESSO
superpowers:brainstorming -> spec (docs/superpowers/specs/) -> superpowers:writing-plans -> superpowers:subagent-driven-development (com test-driven-development e verification-before-completion) com revisão por tarefa e revisão final. Complementares: engineering:architecture, engineering:deploy-checklist, operations:runbook, operations:change-request, engineering:testing-strategy. Para as fichas: cgov-escritorio:cgov-gestao-riscos. Como é grande, trate D0 a D6 como etapas separadas: especifique e planeje uma de cada vez, começando por D0 e D1. Commits automáticos em português (tipo(escopo): resumo).

ANTES DE DIZER QUE TERMINOU (cada etapa de código)
npm test, npm run build, npm run test:a11y (0 violações), npm run test:integracao (com npm run db:funcoes) e npm run db:reset && npm run test:db. Ao terminar, resumo com decisões, autorizações usadas e pendências.
```
