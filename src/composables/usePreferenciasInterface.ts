/**
 * ============================================================================
 * PREFERÊNCIAS DE INTERFACE (`src/composables/usePreferenciasInterface.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um "composable" é uma função do Vue 3 que guarda estado reativo e pode ser
 * usada por vários componentes. Aqui guardamos escolhas de APARÊNCIA do usuário:
 *   - tema (claro / escuro / alto contraste);
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
 * Temas oferecidos ao usuário. O 'escuro' foi liberado no fim da Fase 3,
 * quando todas as páginas passaram a usar só tokens (nenhuma cor fixa).
 */
export const TEMAS_DISPONIVEIS: TemaInterface[] = ['claro', 'escuro', 'contraste'];

/** Rótulos para o seletor de aparência (menu do usuário). */
export const ROTULOS_TEMA: Record<TemaInterface, string> = {
  claro: 'Claro',
  escuro: 'Escuro',
  contraste: 'Alto contraste',
};

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

/** Último tema "comum" (claro ou escuro), para o botão ◐ saber para onde voltar. */
let temaAntesDoContraste: TemaInterface = tema.value === 'contraste' ? 'claro' : tema.value;

export function usePreferenciasInterface() {
  /** Botão ◐ do cabeçalho: liga o alto contraste e, ao desligar, volta ao tema anterior. */
  function alternarAltoContraste(): void {
    if (tema.value === 'contraste') {
      tema.value = temaAntesDoContraste;
    } else {
      temaAntesDoContraste = tema.value;
      tema.value = 'contraste';
    }
  }

  /** Escolha direta no menu do usuário (Aparência). */
  function escolherTema(novo: TemaInterface): void {
    if (!TEMAS_DISPONIVEIS.includes(novo)) return;
    if (novo !== 'contraste') temaAntesDoContraste = novo;
    tema.value = novo;
  }

  function alternarMenuRecolhido(): void {
    menuRecolhido.value = !menuRecolhido.value;
  }

  return { tema, menuRecolhido, alternarAltoContraste, alternarMenuRecolhido, escolherTema };
}
