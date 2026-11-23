/**
 * ============================================================================
 * TESTES DA PÁGINA IMPORTAR RISCOS — Fase 3 (`tests/unit/importarPagina.spec.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 *   - "Ver prévia" NÃO grava nada (só lê e recalcula);
 *   - categoria mista proibida aparece como erro e bloqueia a importação;
 *   - confirmar grava as fichas como Preliminar CGOV e abre a lista filtrada;
 *   - (B3) o objeto de destino é obrigatório (sem ele, "Importar" fica bloqueado);
 *   - (B3) importação PARCIAL: 5 fichas, a 3ª recusada → "4 de 5 importados" e a
 *     recusada listada com o motivo já traduzido.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import type { FonteDados } from '../../src/services/dados/tipos';
import { useToast } from '../../src/composables/useToast';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ImportadorSkillView from '../../src/views/ImportadorSkillView.vue';

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/importar', name: 'importar-skill', component: ImportadorSkillView },
      { path: '/riscos', name: 'riscos-lista', component: { template: '<div />' } },
    ],
  });
  router.push('/importar');
  await router.isReady();
  const w = mount(ImportadorSkillView, { global: { plugins: [router] } });
  await flushPromises();
  return { w, router };
}
const botao = (w: ReturnType<typeof mount>, t: string) => w.findAll('button').find((b) => b.text().includes(t))!;

/** Escolhe o objeto de destino (passo "Objeto de destino"). */
async function escolherObjeto(w: ReturnType<typeof mount>, id = 'obj-anexo-ii') {
  await w.find('select').setValue(id);
}

/** Tabela da skill com `n` linhas (cabeçalho de 16 colunas). */
function tabelaCom(n: number): string {
  const cab = '| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const linhas = Array.from({ length: n }, (_, i) =>
    `| RSC-T-0${i + 1} | Objeto ${i + 1} | Devido o(a) causa ${i + 1}, poderá ocorrer o(a) evento ${i + 1}, ocasionando o(a) consequência ${i + 1} e impactando o alcance do objetivo ${i + 1}. | Operacional | 2 | 3 | 8 | Médio | Inexistente | Inexistente (1,0) | 8 | Médio | moderado | não | Mitigar | KRI ${i + 1} |`
  );
  return [cab, ...linhas].join('\n');
}

/** Lê uma tabela de demonstração de tests/unit/fixtures/skill. */
const fixtureSkill = (nome: string) => readFileSync(resolve(__dirname, 'fixtures/skill', nome), 'utf-8');

/** Simula o envio de um arquivo pelo botão "Enviar arquivo". */
async function enviarArquivo(w: ReturnType<typeof mount>, nome: string, conteudo: string) {
  const entrada = w.find('input[type="file"]');
  // O File do jsdom ainda não tem `.text()` (o do navegador tem): usamos um objeto com o mesmo formato.
  const arquivo = { name: nome, text: async () => conteudo };
  Object.defineProperty(entrada.element, 'files', { value: [arquivo], configurable: true });
  await entrada.trigger('change');
  await flushPromises();
}

describe('Página Importar riscos', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    // A store agora lê da fonte de dados (assíncrona): carregamos antes de cada teste.
    await useRiscosStore().carregar();
  });

  it('sem texto, "Ver prévia" pede a tabela', async () => {
    const { w } = await montar();
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.find('[role="alert"]').text()).toContain('Cole a tabela');
  });

  it('a prévia não grava nada; confirmar importa como Preliminar CGOV', async () => {
    const { w, router } = await montar();
    const store = useRiscosStore();
    const antes = store.riscos.length;
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.findAll('tbody tr')).toHaveLength(2);
    expect(store.riscos.length).toBe(antes);

    await escolherObjeto(w);
    await botao(w, 'Importar 2 riscos').trigger('click');
    await flushPromises();
    expect(store.riscos.length).toBe(antes + 2);
    expect(store.riscos.filter((r) => r.statusFluxo === 'preliminar_cgov').every((r) => r.objetoId === 'obj-anexo-ii')).toBe(true);
    // O código RADAR agora é dado pela fonte de dados (o da skill, ex.: RSC-IN-01,
    // é descartado — spec B3 §5.3): conferimos os 2 riscos preliminares novos.
    expect(store.riscos.filter((r) => r.statusFluxo === 'preliminar_cgov')).toHaveLength(2);
    expect(store.riscos.some((r) => r.codigoRadar === 'RSC-IN-01')).toBe(false);
    expect(router.currentRoute.value.query.status).toBe('preliminar_cgov');
  });

  it('categoria mista proibida vira erro e bloqueia o botão de importar', async () => {
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    const area = w.find('textarea');
    await area.setValue((area.element as HTMLTextAreaElement).value.replace('| Operacional |', '| Operacional com interface de Integridade |'));
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.find('.mensagens--erro').text()).toContain('mista');
    expect(botao(w, 'Importar').attributes('disabled')).toBeDefined();
  });

  it('a prévia avisa que o código da skill será trocado pelo do RADAR', async () => {
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.text()).toContain('O código da skill será substituído pelo código do RADAR');
  });

  it('o seletor de destino só oferece objetos de unidades ativas', async () => {
    const store = useRiscosStore();
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    const valores = w.find('select').findAll('option').map((o) => o.attributes('value')).filter((v) => v);
    expect(valores.sort()).toEqual(store.objetosContexto.filter((o) => o.unidadeAtiva).map((o) => o.id).sort());
  });

  it('sem objeto escolhido, "Importar" não grava e mostra a mensagem de campo (só depois da tentativa)', async () => {
    const store = useRiscosStore();
    const antes = store.riscos.length;
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    // Antes de tentar: nenhum erro de campo.
    expect(w.text()).not.toContain('Escolha o objeto de destino');
    await botao(w, 'Importar 2 riscos').trigger('click');
    await flushPromises();
    expect(store.riscos.length).toBe(antes);
    expect(w.find('select').attributes('aria-invalid')).toBe('true');
    expect(w.text()).toContain('Escolha o objeto de destino para importar.');
    await escolherObjeto(w);
    expect(w.text()).not.toContain('Escolha o objeto de destino para importar.');
  });

  it('falha inesperada na importação mostra a mensagem traduzida (sem texto técnico)', async () => {
    const store = useRiscosStore();
    store.importarMarkdownDaSkill = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { w } = await montar();
    await botao(w, 'Usar tabela de exemplo').trigger('click');
    await botao(w, 'Ver prévia').trigger('click');
    await escolherObjeto(w);
    await botao(w, 'Importar 2 riscos').trigger('click');
    await flushPromises();
    const { toasts } = useToast();
    const ultima = toasts.value[toasts.value.length - 1];
    expect(ultima.tom).toBe('perigo');
    expect(ultima.mensagem).not.toContain('Failed to fetch');
    expect(ultima.mensagem.length).toBeGreaterThan(0);
  });

  it('categoria que não existe no banco aparece na lista de erros da linha (sem trocar por Operacional)', async () => {
    const store = useRiscosStore();
    const antes = store.riscos.length;
    // Simula um banco sem a categoria "Legal", mesmo ela sendo do Quadro 2.
    store.categorias = store.categorias.filter((c) => c.nome !== 'Legal');
    const { w } = await montar();
    await w.find('textarea').setValue(tabelaCom(1).replace('| Operacional |', '| Legal |'));
    await botao(w, 'Ver prévia').trigger('click');
    await escolherObjeto(w);
    await botao(w, 'Importar 1 risco').trigger('click');
    await flushPromises();
    const resultado = w.find('.resultado');
    expect(resultado.text()).toContain('RSC-T-01');
    expect(resultado.text()).toContain('A categoria "Legal" não existe no banco.');
    expect(store.riscos.length).toBe(antes);
  });

  describe('importação parcial', () => {
    afterEach(() => definirFonteParaTeste(null));

    it('5 fichas, a 3ª recusada → "4 de 5 importados" e a recusada listada com o motivo traduzido', async () => {
      const base = criarFonteDemonstracao('normal');
      let chamada = 0;
      const salvarFicha = vi.fn(async (f: Parameters<FonteDados['salvarFicha']>[0]) => {
        chamada++;
        // Erro "cru" do banco (RLS): a tela NUNCA pode mostrar este texto técnico.
        if (chamada === 3) throw { code: '42501', message: 'new row violates row-level security policy for table "riscos"' };
        return base.salvarFicha(f);
      });
      definirFonteParaTeste({ ...base, salvarFicha });
      setActivePinia(createPinia());
      const store = useRiscosStore();
      await store.carregar();
      const antes = store.riscos.length;

      const { w, router } = await montar();
      await w.find('textarea').setValue(tabelaCom(5));
      await botao(w, 'Ver prévia').trigger('click');
      await escolherObjeto(w);
      const importarBtn = botao(w, 'Importar 5 riscos');
      importarBtn.trigger('click');
      importarBtn.trigger('click'); // duplo clique: não importa duas vezes
      await flushPromises();

      expect(salvarFicha).toHaveBeenCalledTimes(5);
      expect(store.riscos.length).toBe(antes + 4);
      const resultado = w.find('.resultado');
      expect(resultado.text()).toContain('4 de 5 importados');
      expect(resultado.text()).toContain('RSC-T-03');
      expect(resultado.text()).toContain('Você não tem permissão');
      expect(resultado.text()).not.toMatch(/row-level|security policy/);
      // Fica na página para a CGOV ver o que faltou.
      expect(router.currentRoute.value.name).toBe('importar-skill');

      // Importar TUDO de novo duplicaria as 4 que entraram: o botão fica desligado.
      expect(botao(w, 'Importar 5 riscos').attributes('disabled')).toBeDefined();
      // Nova tentativa SÓ da recusada (agora a fonte aceita).
      const tentar = botao(w, 'Importar de novo só as recusadas (1)');
      await tentar.trigger('click');
      await flushPromises();
      expect(salvarFicha).toHaveBeenCalledTimes(6);
      expect(salvarFicha.mock.calls[5][0].causas).toContain('causa 3');
      expect(store.riscos.length).toBe(antes + 5);
      expect(router.currentRoute.value.name).toBe('riscos-lista');
    });

    it('mudar o texto depois de uma importação parcial descarta o resultado', async () => {
      const base = criarFonteDemonstracao('normal');
      let chamada = 0;
      const salvarFicha = vi.fn(async (f: Parameters<FonteDados['salvarFicha']>[0]) => {
        chamada++;
        if (chamada % 3 === 2) throw { code: '42501', message: 'rls' }; // recusa a 2ª linha de cada tentativa
        return base.salvarFicha(f);
      });
      definirFonteParaTeste({ ...base, salvarFicha });
      setActivePinia(createPinia());
      await useRiscosStore().carregar();

      const { w } = await montar();
      await w.find('textarea').setValue(tabelaCom(3));
      await botao(w, 'Ver prévia').trigger('click');
      await escolherObjeto(w);
      await botao(w, 'Importar 3 riscos').trigger('click');
      await flushPromises();
      expect(w.find('.resultado').exists()).toBe(true);

      // Ver a prévia de novo: resultado some e o botão de importar tudo volta.
      await botao(w, 'Ver prévia').trigger('click');
      expect(w.find('.resultado').exists()).toBe(false);
      expect(botao(w, 'Importar 3 riscos').attributes('disabled')).toBeUndefined();

      // Mudar o texto: a prévia (e o resultado) somem.
      await botao(w, 'Importar 3 riscos').trigger('click');
      await flushPromises();
      expect(w.find('.resultado').exists()).toBe(true);
      await w.find('textarea').setValue(tabelaCom(2));
      expect(w.find('.resultado').exists()).toBe(false);
      expect(w.findAll('button').some((b) => b.text().includes('recusadas'))).toBe(false);
    });
  });
});

describe('Importar: arquivo, formato reconhecido e gravação do Teste de Integridade', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useRiscosStore().carregar();
  });

  it.each(['matriz.md', 'matriz.txt', 'matriz.markdown'])('enviar o arquivo %s carrega a tabela e a prévia mostra os riscos (RF-162)', async (nome) => {
    const { w } = await montar();
    await enviarArquivo(w, nome, fixtureSkill('matriz-18-colunas.md'));
    expect((w.find('textarea').element as HTMLTextAreaElement).value).toContain('R-01');
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.findAll('tbody tr')).toHaveLength(3);
  });

  it('arquivo com outra extensão é recusado', async () => {
    const { w } = await montar();
    await enviarArquivo(w, 'matriz.pdf', 'x');
    expect(w.text()).toContain('Envie um arquivo .md ou .txt');
  });

  it('a tabela de 18 colunas mostra o formato e as contagens', async () => {
    const { w } = await montar();
    await w.find('textarea').setValue(fixtureSkill('matriz-18-colunas.md'));
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.text()).toContain('Formato: 18 colunas (com Teste de Integridade)');
    expect(w.find('.resumo').text()).toContain('3 riscos lidos');
  });

  it('a tabela de 16 colunas mostra o formato e o aviso da sintaxe (RF-171)', async () => {
    const { w } = await montar();
    await w.find('textarea').setValue(fixtureSkill('matriz-16-colunas.md'));
    await botao(w, 'Ver prévia').trigger('click');
    expect(w.text()).toContain('Formato: 16 colunas (sem Teste de Integridade; veja os avisos)');
    expect(w.find('.mensagens--aviso').text()).toContain('não segue a sintaxe do item 4.2.1');
  });

  it('o texto de ajuda cita as 18 colunas', async () => {
    const { w } = await montar();
    expect(w.text()).toContain('18 colunas');
  });

  it('importar a tabela de 18 colunas grava o Teste de Integridade e a evidência lidos', async () => {
    const { w } = await montar();
    const store = useRiscosStore();
    await w.find('textarea').setValue(fixtureSkill('matriz-18-colunas.md'));
    await botao(w, 'Ver prévia').trigger('click');
    await escolherObjeto(w);
    await botao(w, 'Importar 3 riscos').trigger('click');
    await flushPromises();
    const novos = store.riscos.filter((r) => r.statusFluxo === 'preliminar_cgov');
    expect(novos).toHaveLength(3);
    // Ordem da lista: o 1º da tabela fica no topo; procuramos pelo evento.
    const r02 = novos.find((r) => r.eventoRisco.includes('autorização indevida'))!;
    expect(r02.testeIntegridadeAplicavel).toBe(true);
    expect(r02.justificativaNaoIntegridade).toContain('requerente');
    const r03 = novos.find((r) => r.eventoRisco.includes('atendimentos atrasam'))!;
    expect(r03.testeIntegridadeAplicavel).toBe(false);
    // Frase fora da sintaxe: causa/consequência/objetivo em branco, evento = a frase.
    expect(r03.causas).toBe('');
    expect(r03.consequencias).toBe('');
    expect(r03.objetivoAfetado).toBe('');
    const r01 = novos.find((r) => r.eventoRisco.includes('nomeação de parente'))!;
    expect(r01.possuiEvidenciaControle).toBe(true);
    expect(r01.controlesExistentes[0].possuiEvidenciaComprovada).toBe(true);
    expect(r02.possuiEvidenciaControle).toBe(false);
  });
});
