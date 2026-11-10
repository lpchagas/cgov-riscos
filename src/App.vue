<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE RAIZ DA APLICAÇÃO (`src/App.vue`) — TEMPLATE BASE GOV.BR DS
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Implementa a espinha dorsal exata do Template Base do Padrão Digital de
 * Governo (`https://www.gov.br/ds/templates/base?tab=visao-geral` / `base.pug`):
 * 1. Wrapper raiz `<div class="template-base">`
 * 2. Atalhos de acessibilidade `<BrSkiplink />` (`nav.br-skiplink`)
 * 3. Cabeçalho institucional `<BrHeader />` (`header.br-header[data-sticky]`)
 * 4. Corpo principal `<main id="main" class="d-flex flex-fill mb-5">` com:
 *    - Menu lateral `<BrMenu />` (`div.br-menu.push#main-navigation`)
 *    - Coluna de conteúdo (`.col.mb-5`) com `<BrBreadcrumb />` (`nav.br-breadcrumb`)
 *      e `<div id="main-content" class="main-content pl-sm-3 mt-3">`
 * 5. Rodapé institucional `<BrFooter />` (`footer.br-footer#footer`)
 */
import { computed, ref } from 'vue';
import { RouterView } from 'vue-router';
import BrSkiplink from './components/govbr/BrSkiplink.vue';
import BrHeader from './components/govbr/BrHeader.vue';
import BrMenu from './components/govbr/BrMenu.vue';
import BrBreadcrumb from './components/govbr/BrBreadcrumb.vue';
import BrFooter from './components/govbr/BrFooter.vue';

const menuAberto = ref<boolean>(true);
const altoContraste = ref<boolean>(false);
const layoutFluido = ref<boolean>(true);

const classeContainer = computed(() =>
  layoutFluido.value ? 'container-fluid px-3 px-md-4' : 'container-lg'
);
</script>

<template>
  <div
    class="template-base"
    :class="{ 'govbr-contrast': altoContraste }"
  >
    <!-- 1. Atalhos de Teclado (nav.br-skiplink) -->
    <BrSkiplink />

    <!-- 2. Cabeçalho Institucional (header.br-header#header) -->
    <BrHeader
      :menu-aberto="menuAberto"
      :alto-contraste="altoContraste"
      :layout-fluido="layoutFluido"
      :container-class="classeContainer"
      @alternar-menu="menuAberto = !menuAberto"
      @alternar-contraste="altoContraste = !altoContraste"
      @alternar-layout-fluido="layoutFluido = !layoutFluido"
    />

    <!-- 3. Corpo Principal (main#main.d-flex.flex-fill) -->
    <main id="main" class="d-flex flex-fill mb-4">
      <div :class="[classeContainer, 'd-flex w-100']">
        <div class="row w-100 mx-0">
          <!-- Menu Lateral Push / Off-Canvas (div.br-menu#main-navigation) -->
          <BrMenu
            :aberto="menuAberto"
            @fechar="menuAberto = false"
          />

          <!-- Coluna Principal de Conteúdo (.col) -->
          <div class="col px-0 pl-md-2" style="min-width: 0;">
            <!-- Trilha de Navegação (nav.br-breadcrumb) -->
            <BrBreadcrumb />

            <!-- Área de Conteúdo Principal (#main-content) -->
            <div id="main-content" class="main-content mt-3" tabindex="-1">
              <RouterView />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 4. Rodapé Institucional (footer.br-footer#footer) -->
    <BrFooter :container-class="classeContainer" />
  </div>
</template>
