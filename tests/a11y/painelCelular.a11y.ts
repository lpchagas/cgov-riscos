/**
 * Teste de navegador do Painel no CELULAR (390 px) e no computador (1280 px). Etapa C.
 *
 * Rode com: `npx playwright test painelCelular`
 *
 * O jsdom (testes de unidade) não enxerga CSS, então ordem visual, tamanho dos alvos de
 * toque e rolagem lateral só podem ser conferidos num navegador de verdade.
 */
import { test, expect, type Page } from '@playwright/test';
import { CHAVE_PERFIL_DEMO, CHAVE_PREFERENCIAS, type PapelGovernanca } from './telas';

/** Abre o Painel já no perfil pedido e espera o título aparecer. */
async function abrirPainel(page: Page, perfil: PapelGovernanca): Promise<void> {
  await page.addInitScript(
    ([chave, valor]) => window.localStorage.setItem(chave, valor),
    [CHAVE_PREFERENCIAS, JSON.stringify({ tema: 'claro', menuRecolhido: false })],
  );
  await page.addInitScript(([chave, valor]) => window.localStorage.setItem(chave, valor), [CHAVE_PERFIL_DEMO, perfil]);
  await page.goto('/');
  await expect(page.locator('h1').first()).toHaveText('Painel', { timeout: 10_000 });
}

const TITULOS_BLOCOS = ['Riscos por nível residual', 'Apetite a riscos (DAR)', 'Atividade recente'];

for (const perfil of ['cgov', 'gestor'] as const) {
  test.describe(`celular 390 px · perfil ${perfil}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Atenção vem antes da Matriz', async ({ page }) => {
      await abrirPainel(page, perfil);
      const atencao = await page.getByRole('heading', { level: 2, name: 'Precisa da sua atenção' }).boundingBox();
      const matriz = await page.getByRole('heading', { level: 2, name: 'Matriz de riscos inerentes' }).boundingBox();
      expect(atencao, 'h2 da Atenção visível').not.toBeNull();
      expect(matriz, 'h2 da Matriz visível').not.toBeNull();
      expect(atencao!.y).toBeLessThan(matriz!.y);
    });

    test('blocos recolhíveis começam fechados e abrem ao tocar', async ({ page }) => {
      await abrirPainel(page, perfil);
      for (const nome of TITULOS_BLOCOS) {
        const botao = page.locator('.painel').getByRole('button', { name: nome });
        await expect(botao, `botão do bloco ${nome}`).toHaveAttribute('aria-expanded', 'false');
        await botao.click();
        await expect(botao).toHaveAttribute('aria-expanded', 'true');
      }
    });

    test('alvos de toque têm pelo menos 44 px', async ({ page }) => {
      await abrirPainel(page, perfil);
      // Abre os blocos e os "Mostrar mais" para medir também o que fica escondido por padrão.
      for (const nome of TITULOS_BLOCOS) {
        await page.locator('.painel').getByRole('button', { name: nome }).click();
      }
      const pequenos = await page.evaluate(() => {
        const achados: string[] = [];
        const alvos = document.querySelectorAll('.painel a, .painel button, .painel select');
        for (const el of alvos) {
          // Links dentro de frase ficam isentos (WCAG 2.5.8, exceção de texto corrido).
          if (el.closest('.painel__dica')) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // invisível (display: none)
          const menor = Math.min(r.width, r.height);
          if (menor < 44) {
            const texto = (el.textContent ?? '').trim().slice(0, 30);
            achados.push(
              `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${texto}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          }
        }
        return achados;
      });
      expect(pequenos, 'elementos com lado menor que 44 px').toEqual([]);
    });

    test('sem rolagem lateral e registra a altura do Painel', async ({ page }) => {
      await abrirPainel(page, perfil);
      const medidas = await page.evaluate(() => ({
        rola: document.documentElement.scrollWidth > window.innerWidth,
        altura: document.documentElement.scrollHeight,
      }));
      expect(medidas.rola, 'rolagem lateral').toBe(false);
      // Só informa (a meta de 3.500 px depende de decisão da CGOV).
      test.info().annotations.push({ type: 'altura do Painel (px)', description: String(medidas.altura) });
      console.log(`[info] 390 px · perfil ${perfil} · altura do Painel: ${medidas.altura} px`);
    });
  });
}

test.describe('computador 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Matriz antes da Atenção, sem botões de bloco e blocos finais visíveis', async ({ page }) => {
    await abrirPainel(page, 'cgov');
    const matriz = await page.getByRole('heading', { level: 2, name: 'Matriz de riscos inerentes' }).boundingBox();
    const atencao = await page.getByRole('heading', { level: 2, name: 'Precisa da sua atenção' }).boundingBox();
    // Lado a lado (7 + 5 colunas): a Matriz fica à esquerda, na mesma linha ou acima da Atenção.
    expect(matriz!.y).toBeLessThanOrEqual(atencao!.y);
    expect(matriz!.x).toBeLessThan(atencao!.x);
    for (const nome of TITULOS_BLOCOS) {
      await expect(page.locator('.painel').getByRole('button', { name: nome })).toHaveCount(0);
      await expect(page.locator('.painel').getByRole('heading', { level: 2, name: nome })).toBeVisible();
    }
  });
});
