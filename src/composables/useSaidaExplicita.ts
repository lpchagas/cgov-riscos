/**
 * ============================================================================
 * "SAÍ DE PROPÓSITO" (`src/composables/useSaidaExplicita.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES):
 * A sessão pode terminar de DOIS jeitos:
 *   1. a pessoa clica em "Sair" (foi de propósito);
 *   2. a sessão vence e não renova, ou ela sai em OUTRA aba (foi sem querer).
 * O `App.vue` precisa saber a diferença: no caso 2 ele leva a `/entrar?motivo=sessao`
 * ("Sua sessão terminou. Entre de novo."); no caso 1 NÃO mostra esse aviso.
 *
 * Este arquivo guarda só uma "bandeirinha" compartilhada. O botão "Sair" a levanta
 * ANTES de encerrar a sessão; o `App.vue` olha a bandeirinha ao notar a mudança.
 */
import { ref } from 'vue';

/** `true` enquanto um clique em "Sair" está em andamento. */
export const saidaExplicita = ref(false);
