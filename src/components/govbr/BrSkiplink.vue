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
 * 2. Menu de navegação (`#main-navigation`)
 * 3. Busca do sistema (`#main-searchbox`)
 * 4. Rodapé institucional (`#footer`)
 *
 * PROBLEMA RESOLVIDO NA FASE 2:
 * No celular, o menu é uma gaveta FECHADA e a caixa de busca fica escondida
 * (vira um botão de lupa). Um link âncora comum (`href="#..."`) levaria o
 * foco para um elemento invisível — o usuário de teclado ficaria "perdido".
 * Por isso os atalhos 2 e 3 têm um comportamento extra:
 *   - "Ir para o menu" pede ao App para ABRIR a gaveta e põe o foco no 1º item;
 *   - "Ir para a busca", se a caixa estiver escondida, abre a lista de Riscos
 *     e põe o foco no campo de busca dela.
 * O `href` continua lá: sem JavaScript, o atalho ainda funciona como âncora.
 */
import { nextTick } from 'vue';
import { useRouter } from 'vue-router';

const emit = defineEmits<{ (e: 'abrir-menu'): void }>();
const router = useRouter();

/** Um elemento está visível se o navegador reservou espaço para ele. */
function estaVisivel(el: HTMLElement | null): el is HTMLElement {
  return Boolean(el && el.getClientRects().length > 0);
}

async function irParaMenu(): Promise<void> {
  emit('abrir-menu');
  await nextTick();
  // Espera a gaveta terminar de aparecer (ela fica `visibility: hidden` quando fechada).
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('#main-navigation a, #main-navigation button')?.focus();
  });
}

async function irParaBusca(): Promise<void> {
  const campo = document.getElementById('searchbox-radar');
  if (estaVisivel(campo)) {
    campo.focus();
    return;
  }
  await router.push({ name: 'riscos-lista' });
  await nextTick();
  // Depois da troca de página o App foca o conteúdo; em seguida focamos a busca.
  setTimeout(() => {
    document.querySelector<HTMLElement>('#main-content input[type="search"]')?.focus();
  }, 0);
}
</script>

<template>
  <nav class="br-skiplink" aria-label="Atalhos de navegação por teclado">
    <a class="br-item" href="#main-content" accesskey="1">
      Ir para o conteúdo <span aria-hidden="true">(1/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">1</span>
    </a>
    <a class="br-item" href="#main-navigation" accesskey="2" @click.prevent="irParaMenu">
      Ir para o menu <span aria-hidden="true">(2/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">2</span>
    </a>
    <a class="br-item" href="#main-searchbox" accesskey="3" @click.prevent="irParaBusca">
      Ir para a busca <span aria-hidden="true">(3/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">3</span>
    </a>
    <a class="br-item" href="#footer" accesskey="4">
      Ir para o rodapé <span aria-hidden="true">(4/4)</span>
      <span aria-hidden="true" class="br-tag text ml-1">4</span>
    </a>
  </nav>
</template>
