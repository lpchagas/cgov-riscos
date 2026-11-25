/**
 * Varredura de acessibilidade do RADAR (axe-core + Playwright).
 *
 * Rode com: `npm run test:a11y` (guia: docs/30-nivel3-interface/varredura-acessibilidade.md).
 *
 * Como os testes são montados: três laços, um dentro do outro.
 *
 *   para cada TEMA (claro, escuro, contraste)
 *     para cada LARGURA (360, 390, 768, 1280, 1920)
 *       para cada TELA (painel, dar, riscos, ...)
 *         → 1 teste, com nome do tipo "claro › 360 px › painel"
 *
 * Cada teste: abre a tela já no tema certo → confere que ela carregou → roda o axe-core
 * → reprova se houver QUALQUER violação das regras WCAG 2.2 A/AA.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { CHAVE_ESTADO_DEMO, CHAVE_PERFIL_DEMO, CHAVE_PREFERENCIAS, LARGURAS, TAGS_WCAG, TELAS, TEMAS, type Tela, type Tema } from './telas';

/**
 * Abre uma tela do RADAR já no tema pedido e só termina quando ela estiver pronta.
 *
 * Quatro conferências evitam um "falso verde" (teste que passa sem ter testado nada):
 *   1. O `<h1>` tem EXATAMENTE o título esperado. Não basta existir um título: uma tela que
 *      quebrou ainda mostra o título do cabeçalho, e a Ficha de um risco que sumiu mostra
 *      "Risco não encontrado". Nos dois casos o axe acharia pouco para criticar.
 *   2. O endereço final é o mesmo que pedimos. Uma rota errada é redirecionada para o
 *      Painel, que tem o seu próprio `<h1>`, e o Painel seria testado no lugar da tela certa.
 *   3. Se a tela abre direto numa aba (`?aba=...`), essa aba precisa estar selecionada.
 *   4. O `<html>` precisa estar com `data-theme` igual ao tema pedido. Se alguém renomear
 *      a chave do navegador, os 3 temas testariam a mesma tela clara sem ninguém perceber.
 */
async function abrirTela(page: Page, tela: Tela, tema: Tema): Promise<void> {
  // `addInitScript` roda ANTES do código do RADAR, então o app já nasce no tema certo.
  await page.addInitScript(
    ([chave, valor]) => window.localStorage.setItem(chave, valor),
    [CHAVE_PREFERENCIAS, JSON.stringify({ tema, menuRecolhido: false })],
  );
  // Perfil de demonstração (padrão do app: cgov). Só gravamos quando a tela pede um perfil.
  if (tela.perfil) {
    await page.addInitScript(
      ([chave, valor]) => window.localStorage.setItem(chave, valor),
      [CHAVE_PERFIL_DEMO, tela.perfil],
    );
  }
  // Estado simulado da camada de dados (carregando/erro), também gravado antes de abrir.
  if (tela.estadoDemo) {
    await page.addInitScript(
      ([chave, valor]) => window.localStorage.setItem(chave, valor),
      [CHAVE_ESTADO_DEMO, tela.estadoDemo],
    );
  }
  await page.goto(tela.rota);

  // Espera o título certo aparecer (até 10 s), em vez de uma pausa fixa de tempo.
  await expect(page.locator('h1').first(), `a tela ${tela.rota} não mostrou o título esperado`).toHaveText(
    tela.titulo,
    { timeout: 10_000 },
  );

  // `pathname + search` = o endereço sem o "http://localhost:5199" (ex.: "/monitoramento?aba=plano").
  await expect(page, `a tela ${tela.rota} foi redirecionada`).toHaveURL((url) => url.pathname + url.search === tela.rota);

  if (tela.aba) {
    await expect(page.getByRole('tab', { selected: true }), 'aba selecionada').toContainText(tela.aba);
  }

  await expect(page.locator('html'), 'o tema não foi aplicado').toHaveAttribute('data-theme', tema);

  // Telas de assistente: avança etapa por etapa e confere que chegou (o título da etapa recebe o foco).
  for (let i = 0; i < (tela.avancarEtapas ?? 0); i++) {
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeFocused();
  }
  if (tela.avancarEtapas) {
    // Anti "falso verde": cada tela de assistente declara o elemento que prova a etapa certa.
    if (!tela.provaEtapa) throw new Error(`a tela ${tela.nome} usa avancarEtapas e precisa de provaEtapa`);
    await expect(
      page.getByRole(tela.provaEtapa.papel, { name: tela.provaEtapa.nome }),
      `a etapa de destino de ${tela.nome} não abriu`,
    ).toBeVisible();
  }
}

/**
 * Transforma a resposta do axe-core em linhas curtas e legíveis para a mensagem de falha.
 *
 * Exemplo de linha:
 *   "color-contrast (2 elementos) em .cartao__valor: Element has insufficient color contrast..."
 *     ↑ regra          ↑ quantos      ↑ 1º lugar     ↑ o que o axe diz para corrigir
 */
function resumirViolacoes(violacoes: Result[]): string[] {
  return violacoes.map((v) => {
    const primeiro = v.nodes[0];
    const seletor = primeiro?.target.join(' ') ?? '?';
    // O `failureSummary` começa com "Fix any of the following:" — a dica útil é a 2ª linha.
    const dica = primeiro?.failureSummary?.split('\n')[1]?.trim() ?? v.help;
    return `${v.id} (${v.nodes.length} elementos) em ${seletor}: ${dica}`;
  });
}

/**
 * Mede se a PÁGINA rola para o lado (o usuário teria de arrastar a tela na horizontal,
 * o que fere a WCAG 1.4.10 "Refluxo").
 *
 *   - `rola`: a largura do conteúdo passa da largura da janela?
 *   - `culpados`: até 3 elementos que vazam pela direita, no formato `tag.classe`, para
 *     a mensagem de falha já apontar onde procurar.
 *
 * Ficam de fora da lista de culpados (mesma regra das medições das Fases 3 e 4):
 *   - elementos `position: fixed` (ex.: gaveta do menu fechada, fora da tela de propósito);
 *   - a lista de abas (`abas__lista`), que rola DENTRO dela mesma, sem mexer na página.
 */
async function medirRolagemLateral(page: Page): Promise<{ rola: boolean; culpados: string[] }> {
  return page.evaluate(() => {
    const culpados: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (
        r.right > window.innerWidth + 1 &&
        r.width > 0 &&
        getComputedStyle(el).position !== 'fixed' &&
        !el.closest('[class*=abas__lista]')
      ) {
        culpados.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
      }
    }
    return {
      rola: document.documentElement.scrollWidth > window.innerWidth,
      culpados: culpados.slice(0, 3),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Autoverificação: prova que a varredura ENXERGA problemas. Se o axe não fosse carregado
// direito, todas as telas dariam "0 violações" e ninguém saberia que o teste está cego.
// ---------------------------------------------------------------------------------------------
test('autoverificação: o axe acusa uma imagem sem texto alternativo', async ({ page }) => {
  await abrirTela(page, TELAS[0], 'claro');
  // Colocamos de propósito uma imagem sem `alt` (erro clássico da WCAG 1.1.1).
  await page.evaluate(() => {
    const img = document.createElement('img');
    img.src = 'x.png';
    document.querySelector('main')!.appendChild(img);
  });
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  expect(resultado.violations.map((v) => v.id)).toContain('image-alt');
});

// Uma rota errada é redirecionada para o Painel (que também tem <h1>). A varredura tem de
// perceber que caiu na tela errada, senão testaria o Painel duas vezes sem avisar ninguém.
test('autoverificação: rota inexistente não passa por engano', async ({ page }) => {
  const rotaErrada: Tela = { nome: 'inexistente', rota: '/rota-que-nao-existe', titulo: 'Painel' };
  await expect(abrirTela(page, rotaErrada, 'claro')).rejects.toThrow(/redirecionada/);
});

// Se o risco de demonstração mudar de identificador, a Ficha mostra "Risco não encontrado".
// A varredura tem de falhar, e não varrer uma página quase vazia achando que é a Ficha.
test('autoverificação: ficha de risco inexistente não passa por engano', async ({ page }) => {
  const fichaSumida: Tela = { nome: 'ficha', rota: '/riscos/nao-existe', titulo: TELAS.find((t) => t.nome === 'ficha')!.titulo };
  await expect(abrirTela(page, fichaSumida, 'claro')).rejects.toThrow(/título esperado/);
});

// Mesma ideia para a rolagem lateral: um bloco de 3.000 px num celular TEM de ser acusado.
test('autoverificação: a checagem acusa rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await abrirTela(page, TELAS[0], 'claro');
  await page.evaluate(() => {
    const bloco = document.createElement('div');
    bloco.style.width = '3000px';
    bloco.style.height = '1px';
    document.querySelector('main')!.appendChild(bloco);
  });
  expect((await medirRolagemLateral(page)).rola).toBe(true);
});

// Menu por perfil: o gestor não vê as ferramentas da CGOV e é mandado de volta ao Painel.
test('menu do gestor não mostra ferramentas da CGOV', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const painelGestor: Tela = { nome: 'painel', rota: '/', titulo: 'Painel', perfil: 'gestor' };
  await abrirTela(page, painelGestor, 'claro');
  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  // Prova que o menu carregou (senão "0 links proibidos" passaria num menu vazio).
  await expect(menu.getByRole('link', { name: 'Painel', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Importar riscos' })).toHaveCount(0);
  await expect(menu.getByRole('link', { name: 'Usuários e perfis' })).toHaveCount(0);

  // Abrir /importar pela barra de endereço: a guarda devolve ao Painel com aviso.
  await page.goto('/importar');
  await expect(page, 'o gestor deveria voltar ao Painel').toHaveURL((url) => url.pathname === '/');
  await expect(page.locator('h1').first()).toHaveText('Painel');
});

// ---------------------------------------------------------------------------------------------
// As 360 combinações ((20 + 4) telas × 5 larguras × 3 temas).
// ---------------------------------------------------------------------------------------------
for (const tema of TEMAS) {
  test.describe(tema, () => {
    for (const largura of LARGURAS) {
      test.describe(`${largura} px`, () => {
        // Altura de 900 px, como nas medições das Fases 3 e 4.
        test.use({ viewport: { width: largura, height: 900 } });

        for (const tela of TELAS) {
          test(tela.nome, async ({ page }) => {
            await abrirTela(page, tela, tema);

            const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
            // Lista vazia = nenhuma violação. Se falhar, a mensagem mostra cada regra quebrada.
            // `expect.soft` anota a falha mas deixa o teste seguir, para que a rolagem lateral
            // também seja medida e as duas falhas apareçam juntas no relatório.
            expect.soft(resumirViolacoes(resultado.violations), 'violações WCAG').toEqual([]);

            const rolagem = await medirRolagemLateral(page);
            expect(rolagem.rola, `rolagem lateral: ${rolagem.culpados.join(', ')}`).toBe(false);

            // Altura do Painel no celular: SÓ INFORMA, não reprova. A meta de 3.500 px
            // continua só informando: a CGOV decidiu (D-C1) não tirar cartões do Painel.
            // Os números atuais estão em design-system.md §11.
            if (tela.nome === 'painel' && (largura === 360 || largura === 390)) {
              const altura = await page.evaluate(() => document.documentElement.scrollHeight);
              test.info().annotations.push({ type: 'altura do Painel (px)', description: String(altura) });
              console.log(`[info] ${tema} · ${largura} px · altura do Painel: ${altura} px (meta da CGOV: 3.500 px)`);
            }
          });
        }
      });
    }
  });
}
