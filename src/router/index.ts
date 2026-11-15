/**
 * ============================================================================
 * ROTEADOR VUE ROUTER (`src/router/index.ts`) — NOVA ARQUITETURA DE INFORMAÇÃO
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Cada rota liga um ENDEREÇO (ex.: `/riscos`) a uma TELA (componente `.vue`).
 * Os metadados (`meta`) alimentam automaticamente:
 *   - o cabeçalho da página (`PageHeader`: título h1, descrição e fundamento);
 *   - a trilha de navegação (`BrBreadcrumb`);
 *   - o título da aba do navegador.
 *
 * MUDANÇAS DA FASE 1 DA REFORMULAÇÃO:
 *   - Endereços curtos e legíveis (`/aprovacoes` em vez de `/validacao-um-clique`).
 *   - Nova página `/riscos` (lista), que antes não existia.
 *   - Os NOMES das rotas (`name`) foram mantidos, para não quebrar links internos.
 *   - Os endereços antigos REDIRECIONAM para os novos (favoritos continuam valendo).
 *
 * As telas são carregadas "sob demanda" (`() => import(...)`): o navegador só
 * baixa o código de uma página quando o usuário a visita pela primeira vez.
 */
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  // Ao trocar de página, volta ao topo (ou à posição salva, no "voltar").
  scrollBehavior: (_para, _de, posicaoSalva) => posicaoSalva ?? { top: 0 },
  routes: [
    // ----------------------------------------------------------------------
    // VISÃO GERAL
    // ----------------------------------------------------------------------
    {
      path: '/',
      name: 'painel-cgov',
      component: () => import('../views/PainelConsolidadoCgovView.vue'),
      meta: {
        titulo: 'Painel',
        descricao: 'Situação geral do Plano de Gestão de Riscos do ICMBio · ciclo 2026',
        fundamento:
          'Política de Gestão de Riscos — RADAR (Minuta SEI 024241420) e Metodologia (Minuta SEI 024421455): Quadros 7 e 8 e Anexo III (DAR).',
        // O Painel desenha o próprio cabeçalho para pôr o simulador de perfil ao lado do título.
        cabecalhoProprio: true,
      },
    },
    {
      path: '/dar',
      name: 'dar-apetite',
      component: () => import('../views/DeclaracaoApetiteDarView.vue'),
      meta: {
        titulo: 'Apetite a riscos (DAR)',
        descricao: 'Quanto risco o ICMBio aceita em cada categoria.',
        fundamento: 'Declaração de Apetite a Riscos — Anexo III da Metodologia (Minuta SEI 024421455).',
      },
    },

    // ----------------------------------------------------------------------
    // GESTÃO DE RISCOS (1ª Linha)
    // ATENÇÃO À ORDEM: `/riscos/novo` precisa vir ANTES de `/riscos/:id`,
    // senão o roteador entenderia "novo" como o id de um risco.
    // ----------------------------------------------------------------------
    {
      path: '/riscos',
      name: 'riscos-lista',
      component: () => import('../views/RiscosListaView.vue'),
      meta: {
        titulo: 'Riscos',
        descricao: 'Todos os riscos mapeados, com nível residual e situação no fluxo.',
        fundamento: 'Seções 4.2 a 4.4 da Metodologia (Minuta SEI 024421455).',
        cabecalhoProprio: true, // a view desenha o próprio PageHeader (com ações)
      },
    },
    {
      path: '/riscos/novo',
      name: 'novo-risco',
      component: () => import('../views/FormularioRiscoView.vue'),
      meta: {
        titulo: 'Novo risco',
        descricao: 'Cadastre um risco em 4 etapas: contexto, categoria, análise e tratamento.',
        fundamento: 'Seções 4.1 a 4.5 da Metodologia; Quadros 2 a 8 (Minuta SEI 024421455).',
        migalhaPai: { rotulo: 'Riscos', nome: 'riscos-lista' },
      },
    },
    {
      path: '/riscos/:id',
      name: 'ficha-bowtie-detalhe',
      component: () => import('../views/FichaDetalheBowTieView.vue'),
      meta: {
        titulo: 'Ficha do risco',
        descricao: 'Bow Tie, memória de cálculo e histórico de tramitação.',
        fundamento: 'Sintaxe padronizada da Seção 4.2.1 e Quadros 6, 7 e 8 da Metodologia.',
        migalhaPai: { rotulo: 'Riscos', nome: 'riscos-lista' },
        // A ficha desenha o próprio <h1> (código + nome do risco) e a ação do momento.
        cabecalhoProprio: true,
      },
    },
    {
      path: '/objetos',
      name: 'catalogo-objetos',
      component: () => import('../views/CatalogoObjetosView.vue'),
      meta: {
        titulo: 'Objetos de gestão',
        descricao: 'Processos, projetos e unidades cujos riscos são gerenciados.',
        fundamento: 'Seção 4.1 e Quadro 1 da Metodologia (Estabelecimento do Contexto).',
        // A página desenha o próprio cabeçalho para pôr o botão "Novo objeto" ao lado do título.
        cabecalhoProprio: true,
      },
    },
    {
      path: '/monitoramento',
      name: 'monitoramento-kris',
      component: () => import('../views/MonitoramentoKriPlanoAcaoView.vue'),
      meta: {
        titulo: 'Monitoramento',
        descricao: 'Indicadores-chave de risco (KRIs) e andamento dos planos de ação.',
        fundamento: 'Seções 4.5 e 4.6 da Metodologia (Minuta SEI 024421455).',
      },
    },

    // ----------------------------------------------------------------------
    // DELIBERAÇÃO (2º e 3º degraus)
    // ----------------------------------------------------------------------
    {
      path: '/aprovacoes',
      name: 'validacao-um-clique',
      component: () => import('../views/CaixaValidacaoUmCliqueView.vue'),
      meta: {
        titulo: 'Aprovações',
        descricao: 'Riscos aguardando validação da Coordenação-Geral ou homologação da Diretoria.',
        fundamento: 'Fluxo de governança em 3 degraus da Política RADAR (Minuta SEI 024241420).',
      },
    },
    {
      path: '/auditoria',
      name: 'trilha-auditoria',
      component: () => import('../views/TrilhaAuditoriaGovernancaView.vue'),
      meta: {
        titulo: 'Auditoria',
        descricao: 'Histórico de envios, validações, devoluções e mudanças de nota.',
      },
    },

    // ----------------------------------------------------------------------
    // FERRAMENTAS
    // ----------------------------------------------------------------------
    {
      path: '/importar',
      name: 'importar-skill',
      component: () => import('../views/ImportadorSkillView.vue'),
      meta: {
        titulo: 'Importar riscos',
        descricao: 'Traga a tabela de riscos gerada pela skill da CGOV.',
        fundamento: 'Skill cgov-gestao-riscos-v4 (análise preliminar pela CGOV).',
      },
    },

    // ----------------------------------------------------------------------
    // ENDEREÇOS ANTIGOS → NOVOS (favoritos e links salvos continuam funcionando)
    // ----------------------------------------------------------------------
    { path: '/dar-apetite', redirect: { name: 'dar-apetite' } },
    { path: '/novo-risco', redirect: { name: 'novo-risco' } },
    { path: '/monitoramento-kris', redirect: { name: 'monitoramento-kris' } },
    { path: '/validacao-um-clique', redirect: { name: 'validacao-um-clique' } },
    { path: '/importar-skill', redirect: { name: 'importar-skill' } },

    // Qualquer endereço desconhecido volta ao Painel.
    { path: '/:caminho(.*)*', redirect: { name: 'painel-cgov' } },
  ],
});

// Atualiza o título da aba do navegador: "Riscos · RADAR | ICMBio".
router.afterEach((para) => {
  const titulo = para.meta.titulo;
  document.title = titulo ? `${titulo} · RADAR | ICMBio` : 'RADAR | ICMBio';
});

export default router;
