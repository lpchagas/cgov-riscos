<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE RAIZ — "APP SHELL" DO RADAR (`src/App.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O "app shell" é o esqueleto que fica parado enquanto as páginas trocam.
 * Mantemos a anatomia do Template Base gov.br (skip-link, cabeçalho, menu,
 * trilha, conteúdo e rodapé), reorganizada no padrão moderno dos sistemas
 * web (Material Design 3 / Ant Design Pro):
 *
 *   ┌───────────────────────── Cabeçalho (64 px, fixo no topo) ─────────────┐
 *   ├──────────┬────────────────────────────────────────────────────────────┤
 *   │  Menu    │  Trilha › de › navegação                                    │
 *   │ lateral  │  <h1> Título da página        [ⓘ Fundamento]   [Ações]     │
 *   │ (rail)   │  ...conteúdo da página (RouterView)...                      │
 *   │          │  Rodapé                                                     │
 *   └──────────┴────────────────────────────────────────────────────────────┘
 *
 * O título <h1> de cada página vem AUTOMATICAMENTE dos metadados da rota
 * (`src/router/index.ts`) — assim, todas as 9 páginas ganharam um <h1> sem
 * precisar mexer nelas (achado A6 do diagnóstico). Uma view pode desenhar o
 * próprio cabeçalho marcando `meta.cabecalhoProprio: true`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView, START_LOCATION, useRoute, useRouter } from 'vue-router';
import BrSkiplink from './components/govbr/BrSkiplink.vue';
import BrHeader from './components/govbr/BrHeader.vue';
import BrMenu from './components/govbr/BrMenu.vue';
import BrBreadcrumb from './components/govbr/BrBreadcrumb.vue';
import BrFooter from './components/govbr/BrFooter.vue';
import PageHeader from './components/ui/PageHeader.vue';
import ToastRegion from './components/ui/ToastRegion.vue';
import { usePreferenciasInterface } from './composables/usePreferenciasInterface';

const route = useRoute();
const router = useRouter();
const { menuRecolhido, alternarMenuRecolhido } = usePreferenciasInterface();

// ---------------------------------------------------------------------------
// COMPUTADOR × CELULAR
// `matchMedia` avisa quando a largura da janela cruza 992 px.
// ---------------------------------------------------------------------------
const consultaDesktop = window.matchMedia('(min-width: 992px)');
const ehDesktop = ref<boolean>(consultaDesktop.matches);
const atualizarTela = (e: MediaQueryListEvent) => {
  ehDesktop.value = e.matches;
};
onMounted(() => consultaDesktop.addEventListener('change', atualizarTela));
onBeforeUnmount(() => consultaDesktop.removeEventListener('change', atualizarTela));

/** Gaveta do menu no celular: FECHADA por padrão (antes abria sozinha). */
const gavetaAberta = ref<boolean>(false);

/** O botão ☰ recolhe o menu no computador e abre a gaveta no celular. */
function alternarMenu(): void {
  if (ehDesktop.value) alternarMenuRecolhido();
  else gavetaAberta.value = !gavetaAberta.value;
}

const menuVisivel = computed(() => (ehDesktop.value ? !menuRecolhido.value : gavetaAberta.value));

// Ao trocar de página, fecha a gaveta e leva o foco ao conteúdo novo
// (quem usa leitor de tela "ouve" que a página mudou).
// `START_LOCATION` é a "rota vazia" antes da primeira navegação: nesse caso
// (abertura do sistema) não movemos o foco.
router.afterEach(async (_para, de) => {
  gavetaAberta.value = false;
  if (de === START_LOCATION) return;
  await nextTick();
  document.getElementById('main-content')?.focus({ preventScroll: true });
});
</script>

<template>
  <div class="template-base">
    <!-- 1. Atalhos de teclado (Alt+1 conteúdo, Alt+2 menu, Alt+3 busca, Alt+4 rodapé) -->
    <BrSkiplink />

    <!-- 2. Cabeçalho compacto -->
    <BrHeader :menu-aberto="menuVisivel" @alternar-menu="alternarMenu" />

    <div class="casca">
      <!-- 3. Menu lateral (navigation rail) -->
      <BrMenu
        :aberto="gavetaAberta"
        :recolhido="menuRecolhido"
        @fechar="gavetaAberta = false"
        @alternar-recolhido="alternarMenuRecolhido"
      />

      <!-- 4. Área principal -->
      <main id="main" class="casca__principal">
        <div class="casca__conteudo">
          <BrBreadcrumb />

          <!-- O skip-link "Ir para o conteúdo" e a troca de página trazem o foco
               para cá, onde o primeiro elemento lido é o <h1> da página. -->
          <div id="main-content" class="main-content" tabindex="-1">
            <PageHeader
              v-if="!route.meta.cabecalhoProprio && route.meta.titulo"
              :titulo="route.meta.titulo"
              :descricao="route.meta.descricao"
              :fundamento="route.meta.fundamento"
            />
            <RouterView />
          </div>

          <!-- 5. Rodapé -->
          <BrFooter />
        </div>
      </main>
    </div>

    <!-- Avisos rápidos (toasts) de toda a aplicação -->
    <ToastRegion />
  </div>
</template>

<style scoped>
.casca {
  display: flex;
  align-items: flex-start;
}

.casca__principal {
  flex: 1;
  min-width: 0; /* permite que tabelas largas rolem dentro da área, sem estourar a página */
}

.casca__conteudo {
  max-width: var(--largura-conteudo-max);
  margin: 0 auto;
  padding: var(--esp-5) var(--esp-6) var(--esp-4);
}

/* O foco programático na troca de página serve ao leitor de tela; não
   desenhamos o anel de foco em volta da área inteira. */
.main-content:focus,
.main-content:focus-visible {
  outline: none;
  box-shadow: none;
}

@media (max-width: 767.98px) {
  .casca__conteudo {
    padding: var(--esp-4);
  }
}
</style>
