/**
 * ============================================================================
 * PREFERÊNCIAS DE INTERFACE (`src/composables/usePreferenciasInterface.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um "composable" é uma função do Vue 3 que guarda estado reativo e pode ser
 * usada por vários componentes. Aqui guardamos escolhas de APARÊNCIA do usuário:
 *   - tema (claro / alto contraste; escuro virá na Fase 3);
 *   - menu lateral recolhido ou expandido (no computador).
 *
 * Essas escolhas ficam salvas no `localStorage` do navegador. Como o
 * `localStorage` pode estar bloqueado (janela anônima, política do órgão),
 * toda leitura e escrita fica dentro de `try/catch`: se falhar, o sistema
 * simplesmente usa o padrão.
 */
import { ref, watch } from 'vue';

export type TemaInterface = 'claro' | 'escuro' | 'contraste';

/**
 * Temas oferecidos ao usuário HOJE.
 * O tema 'escuro' já está definido em `tokens.css`, mas só será liberado
 * quando todas as views usarem tokens (fim da Fase 3 do plano de reformulação).
 */
export const TEMAS_DISPONIVEIS: TemaInterface[] = ['claro', 'contraste'];

const CHAVE_ARMAZENAMENTO = 'radar.preferencias-interface.v1';

interface PreferenciasSalvas {
  tema: TemaInterface;
  menuRecolhido: boolean;
}

function lerPreferencias(): PreferenciasSalvas {
  const padrao: PreferenciasSalvas = { tema: 'claro', menuRecolhido: false };
  try {
    const bruto = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return padrao;
    const salvo = JSON.parse(bruto) as Partial<PreferenciasSalvas>;
    return {
      tema: salvo.tema && TEMAS_DISPONIVEIS.includes(salvo.tema) ? salvo.tema : padrao.tema,
      menuRecolhido: Boolean(salvo.menuRecolhido),
    };
  } catch {
    return padrao;
  }
}

// Estado no nível do MÓDULO: todos os componentes compartilham o mesmo valor.
const inicial = lerPreferencias();
const tema = ref<TemaInterface>(inicial.tema);
const menuRecolhido = ref<boolean>(inicial.menuRecolhido);

/** Aplica o tema no elemento <html>; o CSS em `tokens.css` faz o resto. */
function aplicarTema(valor: TemaInterface): void {
  document.documentElement.setAttribute('data-theme', valor);
}

aplicarTema(tema.value);

watch([tema, menuRecolhido], () => {
  aplicarTema(tema.value);
  try {
    window.localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify({ tema: tema.value, menuRecolhido: menuRecolhido.value })
    );
  } catch {
    /* armazenamento indisponível: a preferência vale só nesta visita */
  }
});

export function usePreferenciasInterface() {
  function alternarAltoContraste(): void {
    tema.value = tema.value === 'contraste' ? 'claro' : 'contraste';
  }

  function alternarMenuRecolhido(): void {
    menuRecolhido.value = !menuRecolhido.value;
  }

  return { tema, menuRecolhido, alternarAltoContraste, alternarMenuRecolhido };
}
