<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE TRILHA DE NAVEGAÇÃO (`nav.br-breadcrumb`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Segue a estrutura HTML oficial `nav.br-breadcrumb > ol.crumb-list > li.crumb`
 * do Template Base do `@govbr-ds/core`. Lê automaticamente os metadados da rota
 * ativa (`route.meta.categoriaBreadcrumb` e `route.meta.titulo`) para situar o
 * servidor dentro das 3 Linhas de Governança do ICMBio.
 */
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const categoriaAtual = computed(
  () => (route.meta.categoriaBreadcrumb as string) || 'Governança RADAR'
);

const tituloPaginaAtual = computed(
  () =>
    (route.meta.titulo as string) ||
    'Painel do Plano de Gestão de Riscos do ICMBio'
);
</script>

<template>
  <nav class="br-breadcrumb" aria-label="Breadcrumbs">
    <ol class="crumb-list" role="list">
      <li class="crumb home">
        <RouterLink to="/" class="br-button circle" title="Página inicial">
          <span class="sr-only">Página inicial</span>
          <i class="fas fa-home" aria-hidden="true"></i>
        </RouterLink>
      </li>
      <li class="crumb">
        <i class="icon fas fa-chevron-right" aria-hidden="true"></i>
        <RouterLink to="/">{{ categoriaAtual }}</RouterLink>
      </li>
      <li class="crumb" data-active="active">
        <i class="icon fas fa-chevron-right" aria-hidden="true"></i>
        <span tabindex="0" aria-current="page">{{ tituloPaginaAtual }}</span>
      </li>
    </ol>
  </nav>
</template>
