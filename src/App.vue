<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE RAIZ DA APLICAÇÃO (`src/App.vue`)
 * ============================================================================
 */
import { RouterLink, RouterView, useRoute } from 'vue-router';
import BrHeader from './components/govbr/BrHeader.vue';
import { useRiscosStore } from './stores/riscosStore';

const route = useRoute();
const riscosStore = useRiscosStore();
</script>

<template>
  <div class="min-vh-100 d-flex flex-column">
    <BrHeader />

    <!-- Barra de Navegação Institucional -->
    <nav class="radar-container py-0 mb-3">
      <div
        class="d-flex flex-wrap gap-2 p-2 rounded"
        style="background-color: #071d41;"
      >
        <RouterLink
          to="/"
          class="px-3 py-2 rounded text-decoration-none font-weight-bold"
          :style="{
            backgroundColor: route.path === '/' ? '#1351b4' : 'transparent',
            color: '#ffffff',
          }"
        >
          <i class="fas fa-chart-pie mr-1"></i>
          Painel do Plano de Gestão de Riscos &amp; DAR
        </RouterLink>

        <RouterLink
          to="/novo-risco"
          class="px-3 py-2 rounded text-decoration-none font-weight-bold"
          :style="{
            backgroundColor: route.path === '/novo-risco' ? '#1351b4' : 'transparent',
            color: '#ffffff',
          }"
        >
          <i class="fas fa-plus-circle mr-1"></i>
          Cadastrar Ficha de Risco (1ª Linha)
        </RouterLink>

        <RouterLink
          to="/importar-skill"
          class="px-3 py-2 rounded text-decoration-none font-weight-bold"
          :style="{
            backgroundColor: route.path === '/importar-skill' ? '#1351b4' : 'transparent',
            color: '#ffffff',
          }"
        >
          <i class="fas fa-file-import mr-1"></i>
          Passo 0: Importar Tabela da Skill CGOV
        </RouterLink>

        <RouterLink
          to="/validacao-um-clique"
          class="px-3 py-2 rounded text-decoration-none font-weight-bold"
          :style="{
            backgroundColor: route.path === '/validacao-um-clique' ? '#1351b4' : 'transparent',
            color: '#ffffff',
          }"
        >
          <i class="fas fa-check-double mr-1"></i>
          Validação em 1 Clique (CG: {{ riscosStore.filaValidacaoCg.length }} | Dir: {{ riscosStore.filaHomologacaoDiretoria.length }})
        </RouterLink>
      </div>
    </nav>

    <!-- Conteúdo Principal da Rota Ativa -->
    <main class="radar-container flex-grow-1">
      <RouterView />
    </main>

    <!-- Rodapé Padrão Gov.br / ICMBio -->
    <footer
      class="mt-5 py-3 text-center text-down-01"
      style="background-color: #071d41; color: #ffffff;"
    >
      <div class="radar-container py-0">
        <strong>ICMBio — Instituto Chico Mendes de Conservação da Biodiversidade</strong> |
        Coordenação de Governança e Gestão de Riscos (CGOV/CGGE/DIPLAN) — Sistema Web RADAR (Regime B)
      </div>
    </footer>
  </div>
</template>
