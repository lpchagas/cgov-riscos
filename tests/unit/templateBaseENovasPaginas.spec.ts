import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRiscosStore } from '../../src/stores/riscosStore';
import router from '../../src/router/index';
import fs from 'node:fs';
import path from 'node:path';

describe('Template Base Gov.br DS e Novas Páginas do Sistema RADAR', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('filtra riscos por termoBuscaGlobal e por célula selecionada da Matriz Assimétrica (Quadro 7)', () => {
    const store = useRiscosStore();
    expect(store.riscos.length).toBeGreaterThanOrEqual(3);

    // Filtra por célula P=3, I=5 (Caso de Controle Anexo II -> Inerente 22):
    store.alternarFiltroCelulaMatriz(3, 5);
    expect(store.celulaMatrizSelecionada).toEqual({ p: 3, i: 5 });
    expect(store.riscosFiltrados.every((r) => r.probabilidade === 3 && r.impacto === 5)).toBe(true);

    // Clicar novamente na mesma célula limpa o filtro:
    store.alternarFiltroCelulaMatriz(3, 5);
    expect(store.celulaMatrizSelecionada).toBeNull();

    // Filtra por termo de busca global:
    store.termoBuscaGlobal = 'RADAR-2026-001';
    expect(store.riscosFiltrados).toHaveLength(1);
    expect(store.riscosFiltrados[0].codigoRadar).toBe('RADAR-2026-001');
  });

  it('permite cadastrar novo Objeto de Gestão de Riscos no Catálogo (/objetos) e consultar trilha de auditoria global (/auditoria)', () => {
    const store = useRiscosStore();
    const qtdInicial = store.objetosContexto.length;

    const novoObj = store.salvarNovoObjetoContexto({
      tipoObjeto: 'Macroprocesso',
      nomeObjeto: 'Prevenção e Combate a Incêndios Florestais (MIF)',
      unidadeId: 'uni-dibio',
      macroprocessoSupervisorId: 'uni-cgge',
      diretoriaId: 'uni-dibio',
      objetivoEstrategicoAssociado: 'Reduzir danos socioambientais por incêndios em Unidades de Conservação.',
      insumosPrincipais: 'Brigadistas, equipamentos e alertas de satélite.',
      entregasPrincipais: 'Planos de Manejo Integrado do Fogo e operações de combate.',
      partesInteressadas: 'Unidades de Conservação, comunidades tradicionais e IBAMA.',
      cicloAno: 2026,
    });

    expect(store.objetosContexto.length).toBe(qtdInicial + 1);
    expect(novoObj.nomeObjeto).toContain('Incêndios Florestais');

    // Verifica a trilha de auditoria consolidada:
    expect(store.trilhaAuditoriaGlobal.length).toBeGreaterThanOrEqual(1);
    expect(store.trilhaAuditoriaGlobal[0]).toHaveProperty('codigoRadar');
    expect(store.trilhaAuditoriaGlobal[0]).toHaveProperty('despachoTexto');
  });

  it('registra todas as rotas das novas páginas com metadados de Breadcrumb no Vue Router', () => {
    const nomesRotas = router.getRoutes().map((r) => r.name);
    expect(nomesRotas).toContain('painel-cgov');
    expect(nomesRotas).toContain('dar-apetite');
    expect(nomesRotas).toContain('catalogo-objetos');
    expect(nomesRotas).toContain('novo-risco');
    expect(nomesRotas).toContain('ficha-bowtie-detalhe');
    expect(nomesRotas).toContain('monitoramento-kris');
    expect(nomesRotas).toContain('validacao-um-clique');
    expect(nomesRotas).toContain('trilha-auditoria');
    expect(nomesRotas).toContain('importar-skill');
  });

  it('possui a estrutura completa de componentes do Template Base Gov.br DS (@govbr-ds/core)', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const arquivosObrigatorios = [
      'src/components/govbr/BrSkiplink.vue',
      'src/components/govbr/BrHeader.vue',
      'src/components/govbr/BrMenu.vue',
      'src/components/govbr/BrBreadcrumb.vue',
      'src/components/govbr/BrFooter.vue',
      'src/components/govbr/BrStep.vue',
      'src/components/govbr/BrTabs.vue',
      'src/components/govbr/BrMessage.vue',
      'src/views/DeclaracaoApetiteDarView.vue',
      'src/views/CatalogoObjetosView.vue',
      'src/views/FichaDetalheBowTieView.vue',
      'src/views/MonitoramentoKriPlanoAcaoView.vue',
      'src/views/TrilhaAuditoriaGovernancaView.vue',
    ];

    for (const relPath of arquivosObrigatorios) {
      expect(fs.existsSync(path.join(rootDir, relPath)), `Arquivo ausente: ${relPath}`).toBe(true);
    }

    const appVue = fs.readFileSync(path.join(rootDir, 'src/App.vue'), 'utf-8');
    expect(appVue).toContain('template-base');
    expect(appVue).toContain('BrSkiplink');
    expect(appVue).toContain('BrMenu');
    expect(appVue).toContain('BrBreadcrumb');
    expect(appVue).toContain('BrFooter');
  });
});
