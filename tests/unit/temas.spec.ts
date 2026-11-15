/**
 * ============================================================================
 * TESTES DOS TEMAS (`tests/unit/temas.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O tema escuro foi liberado no fim da Fase 3. Conferimos que:
 *   - os 3 temas podem ser escolhidos e vão para <html data-theme="…">;
 *   - o botão ◐ (alto contraste) volta para o tema que estava antes
 *     (escuro continua escuro, e não "pula" para o claro).
 */
import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { TEMAS_DISPONIVEIS, usePreferenciasInterface } from '../../src/composables/usePreferenciasInterface';

describe('Temas', () => {
  it('oferece claro, escuro e alto contraste', () => {
    expect(TEMAS_DISPONIVEIS).toEqual(['claro', 'escuro', 'contraste']);
  });

  it('escolher o tema escuro aplica data-theme no <html>', async () => {
    const { escolherTema } = usePreferenciasInterface();
    escolherTema('escuro');
    await nextTick();
    expect(document.documentElement.dataset.theme).toBe('escuro');
  });

  it('o botão ◐ liga o contraste e, ao desligar, volta ao tema anterior', async () => {
    const { escolherTema, alternarAltoContraste, tema } = usePreferenciasInterface();
    escolherTema('escuro');
    alternarAltoContraste();
    expect(tema.value).toBe('contraste');
    alternarAltoContraste();
    expect(tema.value).toBe('escuro');
  });
});
