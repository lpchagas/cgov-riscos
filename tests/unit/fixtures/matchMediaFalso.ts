/**
 * ============================================================================
 * FIXTURE: `window.matchMedia` FALSO PARA TESTES
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O jsdom (o "navegador de mentira" do Vitest) NÃO tem `window.matchMedia`.
 * Esta fixture instala um falso cujo `matches` começa no valor escolhido e
 * permite "mudar a largura da janela" no teste, disparando os ouvintes `change`.
 *
 * Exemplo:
 *   const tela = instalarMatchMediaFalso(true);   // começa como celular
 *   tela.definir(false);                          // "alargou" a janela
 *   tela.restaurar();                             // devolve o matchMedia original
 */
export interface MatchMediaFalso {
  /** Muda `matches` e avisa os ouvintes `change`. */
  definir(casa: boolean): void;
  /** Quantos ouvintes `change` ainda estão registrados. */
  ouvintes(): number;
  /** Devolve o `window.matchMedia` que existia antes. */
  restaurar(): void;
}

export function instalarMatchMediaFalso(inicial: boolean): MatchMediaFalso {
  const original = window.matchMedia;
  let casa = inicial;
  const ouvintes = new Set<(e: MediaQueryListEvent) => void>();

  window.matchMedia = ((consulta: string) => ({
    get matches() {
      return casa;
    },
    media: consulta,
    addEventListener: (_tipo: string, fn: (e: MediaQueryListEvent) => void) => ouvintes.add(fn),
    removeEventListener: (_tipo: string, fn: (e: MediaQueryListEvent) => void) =>
      ouvintes.delete(fn),
  })) as unknown as typeof window.matchMedia;

  return {
    definir(novo: boolean) {
      casa = novo;
      ouvintes.forEach((fn) => fn({ matches: novo } as MediaQueryListEvent));
    },
    ouvintes: () => ouvintes.size,
    restaurar() {
      window.matchMedia = original;
    },
  };
}
