<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE ATALHOS DE ACESSIBILIDADE (`nav.br-skiplink`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Conforme a anatomia do Template Base do Padrão Digital de Governo
 * (`https://www.gov.br/ds/templates/base`), o primeiro elemento do DOM dentro
 * de `.template-base` deve ser o `nav.br-skiplink`, permitindo saltar via
 * teclado (Tecla Tab ou Alt+1..4) diretamente para:
 * 1. Conteúdo principal (`#main-content`)
 * 2. Menu de navegação (`#header-navigation`)
 * 3. Busca do sistema (`#main-searchbox`)
 * 4. Rodapé institucional (`#footer`)
 */
</script>

<template>
  <nav class="br-skiplink" aria-label="Atalhos de navegação por teclado">
    <a class="br-item" href="#main-content" accesskey="1">
      Ir para o conteúdo <span aria-hidden="true">(1/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">1</span>
    </a>
    <a class="br-item" href="#header-navigation" accesskey="2">
      Ir para o menu <span aria-hidden="true">(2/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">2</span>
    </a>
    <a class="br-item" href="#main-searchbox" accesskey="3">
      Ir para a busca <span aria-hidden="true">(3/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">3</span>
    </a>
    <a class="br-item" href="#footer" accesskey="4">
      Ir para o rodapé <span aria-hidden="true">(4/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">4</span>
    </a>
  </nav>
</template>
