/**
 * ============================================================================
 * ROTEADOR VUE ROUTER (`src/router/index.ts`) — NAVEGAÇÃO ENTRE AS 4 TELAS
 * ============================================================================
 */
import { createRouter, createWebHistory } from 'vue-router';
import PainelConsolidadoCgovView from '../views/PainelConsolidadoCgovView.vue';
import FormularioRiscoView from '../views/FormularioRiscoView.vue';
import ImportadorSkillView from '../views/ImportadorSkillView.vue';
import CaixaValidacaoUmCliqueView from '../views/CaixaValidacaoUmCliqueView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'painel-cgov',
      component: PainelConsolidadoCgovView,
    },
    {
      path: '/novo-risco',
      name: 'novo-risco',
      component: FormularioRiscoView,
    },
    {
      path: '/importar-skill',
      name: 'importar-skill',
      component: ImportadorSkillView,
    },
    {
      path: '/validacao-um-clique',
      name: 'validacao-um-clique',
      component: CaixaValidacaoUmCliqueView,
    },
  ],
});

export default router;
