/**
 * ============================================================================
 * DETECTAR CELULAR (`src/composables/useCelular.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Devolve uma `ref` booleana que é `true` quando a janela é estreita (celular)
 * e `false` no computador. Ela se atualiza sozinha se a largura mudar (ex.:
 * girar o celular ou redimensionar a janela).
 *
 * Uso:
 *   const celular = useCelular();
 *   // no template: <p v-if="celular">Versão compacta</p>
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** Celular = até 639,98 px de largura (logo abaixo do ponto de 640 px). */
export const CONSULTA_CELULAR = '(max-width: 639.98px)';

export function useCelular(consulta: string = CONSULTA_CELULAR): Ref<boolean> {
  // O jsdom (testes) e navegadores muito antigos não têm `matchMedia`:
  // nesse caso assumimos "computador" (false).
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return ref(false);
  }

  const lista = window.matchMedia(consulta);

  // POR QUE LER `matches` JÁ NA CRIAÇÃO EVITA O "PISCAR":
  // se começássemos com `false` e só corrigíssemos depois de montar, o celular
  // desenharia primeiro a tela de computador e logo trocaria (um "pisco").
  // Lendo o valor real na hora, a primeira renderização já sai certa.
  const celular = ref<boolean>(lista.matches);

  const atualizar = (e: MediaQueryListEvent) => {
    celular.value = e.matches;
  };
  onMounted(() => lista.addEventListener('change', atualizar));
  // Limpeza: sem isso o ouvinte ficaria "vivo" depois de a tela sumir.
  onBeforeUnmount(() => lista.removeEventListener('change', atualizar));

  return celular;
}
