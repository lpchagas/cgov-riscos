/**
 * ============================================================================
 * "HOJE" EM BRASÍLIA QUE VIRA SOZINHO (`src/composables/useHojeEmBrasilia.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Um formulário pode ficar aberto de um dia para o outro (a pessoa deixa a aba aberta
 * e volta depois da meia-noite). Se o "hoje" fosse lido uma vez só, o formulário
 * recusaria a data nova como "futura" e erraria a conta do prazo ("dia N de 10").
 *
 * Este composable guarda "hoje" (aaaa-mm-dd, calendário de Brasília) e o confere a
 * cada minuto enquanto o componente existe. Só troca o valor quando o dia muda de
 * verdade, então o que a pessoa digitou não é tocado.
 *
 * Uso:
 *   const { hoje, atualizar } = useHojeEmBrasilia();
 *   // no template: <input type="date" :max="hoje" />
 *   // antes de validar um envio: atualizar() (lê a data do MOMENTO do envio)
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { hojeEmBrasilia } from '../utils/diasUteis';

/** De quanto em quanto tempo conferimos se o dia virou (1 minuto). */
const INTERVALO_PADRAO_MS = 60_000;

export function useHojeEmBrasilia(intervaloMs = INTERVALO_PADRAO_MS): { hoje: Ref<string>; atualizar: () => string } {
  const hoje = ref(hojeEmBrasilia());

  /** Relê o dia agora. Ex.: às 00:01 de 02/12 → '2026-12-02'. Devolve o valor atual. */
  function atualizar(): string {
    const agora = hojeEmBrasilia();
    if (agora !== hoje.value) hoje.value = agora;
    return hoje.value;
  }

  let relogio: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    relogio = setInterval(atualizar, intervaloMs);
  });
  onUnmounted(() => clearInterval(relogio));

  return { hoje, atualizar };
}
