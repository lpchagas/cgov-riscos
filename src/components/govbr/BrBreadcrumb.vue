<script setup lang="ts">
/**
 * ============================================================================
 * TRILHA DE NAVEGAÇÃO — "BREADCRUMB" (`nav.br-breadcrumb`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Mostra ONDE o usuário está e permite voltar um nível com um clique:
 *
 *     Início › Riscos › RADAR-2026-001
 *
 * Só aparecem páginas REAIS. (A versão antiga mostrava "1. Governança &
 * Estratégia (2ª Linha)", que não era uma página — achado 2.1.)
 * No Painel (página inicial) a trilha não aparece, pois não há para onde voltar.
 */
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useRiscosStore } from '../../stores/riscosStore';

const route = useRoute();
const riscosStore = useRiscosStore();

const ehPaginaInicial = computed(() => route.name === 'painel-cgov');

/** Último elo: na ficha, usa o código do risco; nas demais, o título da página. */
const tituloAtual = computed(() => {
  if (route.name === 'ficha-bowtie-detalhe') {
    const risco = riscosStore.riscos.find((r) => r.id === route.params.id);
    if (risco) return risco.codigoRadar;
  }
  return route.meta.titulo ?? '';
});
</script>

<template>
  <nav v-if="!ehPaginaInicial" class="trilha" aria-label="Você está em">
    <ol role="list">
      <li>
        <RouterLink :to="{ name: 'painel-cgov' }">
          <i class="fa-solid fa-house" aria-hidden="true"></i>
          Início
        </RouterLink>
      </li>
      <li v-if="route.meta.migalhaPai">
        <RouterLink :to="{ name: route.meta.migalhaPai.nome }">{{ route.meta.migalhaPai.rotulo }}</RouterLink>
      </li>
      <li>
        <span aria-current="page">{{ tituloAtual }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.trilha {
  margin-bottom: var(--esp-3);
  font-size: var(--texto-sm);
}

.trilha ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trilha li {
  display: inline-flex;
  align-items: center;
}

/* Separador "›" desenhado pelo CSS (o leitor de tela não o lê). */
.trilha li + li::before {
  content: '›';
  margin: 0 var(--esp-2);
  color: var(--texto-secundario);
}

.trilha a {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  min-height: 1.5rem; /* alvo mínimo WCAG 2.5.8 */
  color: var(--texto-link);
  text-decoration: none;
}

.trilha a:hover {
  text-decoration: underline;
}

.trilha [aria-current='page'] {
  color: var(--texto-secundario);
}
</style>
