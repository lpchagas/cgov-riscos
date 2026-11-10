/**
 * ============================================================================
 * ROTEADOR VUE ROUTER (`src/router/index.ts`) — TEMPLATE BASE GOV.BR DS
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Define todas as rotas do Sistema RADAR com metadados (`meta.titulo` e
 * `meta.categoriaBreadcrumb`) consumidos automaticamente pelo componente
 * `BrBreadcrumb.vue` no topo de `#main-content`.
 */
import { createRouter, createWebHistory } from 'vue-router';
import PainelConsolidadoCgovView from '../views/PainelConsolidadoCgovView.vue';
import DeclaracaoApetiteDarView from '../views/DeclaracaoApetiteDarView.vue';
import CatalogoObjetosView from '../views/CatalogoObjetosView.vue';
import FormularioRiscoView from '../views/FormularioRiscoView.vue';
import FichaDetalheBowTieView from '../views/FichaDetalheBowTieView.vue';
import MonitoramentoKriPlanoAcaoView from '../views/MonitoramentoKriPlanoAcaoView.vue';
import CaixaValidacaoUmCliqueView from '../views/CaixaValidacaoUmCliqueView.vue';
import TrilhaAuditoriaGovernancaView from '../views/TrilhaAuditoriaGovernancaView.vue';
import ImportadorSkillView from '../views/ImportadorSkillView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'painel-cgov',
      component: PainelConsolidadoCgovView,
      meta: {
        categoriaBreadcrumb: '1. Governança & Estratégia (2ª Linha)',
        titulo: 'Painel Consolidado do Plano de Gestão de Riscos',
      },
    },
    {
      path: '/dar-apetite',
      name: 'dar-apetite',
      component: DeclaracaoApetiteDarView,
      meta: {
        categoriaBreadcrumb: '1. Governança & Estratégia (2ª Linha)',
        titulo: 'Declaração de Apetite a Riscos (DAR — Anexo III)',
      },
    },
    {
      path: '/objetos',
      name: 'catalogo-objetos',
      component: CatalogoObjetosView,
      meta: {
        categoriaBreadcrumb: '2. Ciclo Operacional (1ª Linha)',
        titulo: 'Catálogo de Objetos de Gestão e Macroprocessos',
      },
    },
    {
      path: '/novo-risco',
      name: 'novo-risco',
      component: FormularioRiscoView,
      meta: {
        categoriaBreadcrumb: '2. Ciclo Operacional (1ª Linha)',
        titulo: 'Assistente Guiado de Cadastro de Risco (Bow Tie)',
      },
    },
    {
      path: '/riscos/:id',
      name: 'ficha-bowtie-detalhe',
      component: FichaDetalheBowTieView,
      meta: {
        categoriaBreadcrumb: '2. Ciclo Operacional (1ª Linha)',
        titulo: 'Ficha Executiva & Diagrama Visual Bow Tie',
      },
    },
    {
      path: '/monitoramento-kris',
      name: 'monitoramento-kris',
      component: MonitoramentoKriPlanoAcaoView,
      meta: {
        categoriaBreadcrumb: '2. Ciclo Operacional (1ª Linha)',
        titulo: 'Sala de Situação de KRIs e Planos 5W2H',
      },
    },
    {
      path: '/validacao-um-clique',
      name: 'validacao-um-clique',
      component: CaixaValidacaoUmCliqueView,
      meta: {
        categoriaBreadcrumb: '3. Deliberação (2º e 3º Degraus)',
        titulo: 'Caixa de Validação e Homologação em 1 Clique',
      },
    },
    {
      path: '/auditoria',
      name: 'trilha-auditoria',
      component: TrilhaAuditoriaGovernancaView,
      meta: {
        categoriaBreadcrumb: '3. Deliberação (2º e 3º Degraus)',
        titulo: 'Trilha de Auditoria e Rastreabilidade SEI',
      },
    },
    {
      path: '/importar-skill',
      name: 'importar-skill',
      component: ImportadorSkillView,
      meta: {
        categoriaBreadcrumb: '3. Deliberação (2º e 3º Degraus)',
        titulo: 'Passo 0: Importador de Tabelas da Skill CGOV',
      },
    },
  ],
});

export default router;
