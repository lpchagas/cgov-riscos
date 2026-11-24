/** Testes da store das comunicações à CGOV (LAC-04), com a fonte de demonstração. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { useComunicacoesStore } from '../../src/stores/comunicacoesStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import { PERFIS_DEMO_ICMBIO } from '../../src/stores/authStore';
import type { NovaComunicacao } from '../../src/services/dados/tipos';
import type { PapelGovernanca } from '../../src/types/radar.types';

const usar = (papel: PapelGovernanca) =>
  definirFonteParaTeste(criarFonteDemonstracao('normal', { quemSou: () => PERFIS_DEMO_ICMBIO[papel] }));

describe('comunicacoesStore', () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => definirFonteParaTeste(null));

  it('carrega as comunicações e expõe as "novas" (sem ciência da CGOV)', async () => {
    usar('cgov');
    const s = useComunicacoesStore();
    expect(s.comunicacoes).toHaveLength(0);
    await s.carregar();
    expect(s.carregando).toBe(false);
    expect(s.erro).toBeNull();
    expect(s.comunicacoes.length).toBeGreaterThanOrEqual(3);
    expect(s.novas.length).toBeGreaterThan(0);
    expect(s.novas.every((c) => c.situacao === 'nova')).toBe(true);
  });

  it('enviar a comunicação de um alerta encerra o alerta na riscosStore (R15)', async () => {
    usar('gestor');
    const riscos = useRiscosStore();
    await riscos.carregar();
    const alerta = riscos.alertasKri.find((a) => !a.encerradoEm)!;
    expect(alerta).toBeDefined();
    const kri = riscos.riscos.flatMap((r) => r.kris).find((k) => k.id === alerta.kriId)!;
    const nova: NovaComunicacao = {
      unidadeId: riscos.riscos.find((r) => r.id === kri.riscoIds[0])!.unidadeId,
      hipotese: 'alerta_kri',
      dataCiencia: alerta.cienciaEm,
      descricao: 'Reavaliamos o risco.',
      alertaId: alerta.id,
      riscoIds: [kri.riscoIds[0]],
      supre: [],
    };
    const s = useComunicacoesStore();
    const id = await s.enviar(nova);
    expect(s.comunicacoes.some((c) => c.id === id)).toBe(true);
    const relido = riscos.alertasKri.find((a) => a.id === alerta.id)!;
    expect(relido.comunicacaoId).toBe(id);
    expect(relido.encerradoEm).toBeTruthy();
  });

  it('registrar ciência reduz as novas; erro da fonte chega à tela como ErroRadar', async () => {
    usar('cgov');
    const s = useComunicacoesStore();
    await s.carregar();
    const antes = s.novas.length;
    await s.registrarCiencia(s.novas[0].id, 'Ciente.');
    expect(s.novas.length).toBe(antes - 1);
    const ciente = s.comunicacoes.find((c) => c.observacaoCgov === 'Ciente.')!;
    await expect(s.registrarCiencia(ciente.id)).rejects.toThrow('já foi registrada');
  });

  it('limpar esvazia a lista', async () => {
    usar('cgov');
    const s = useComunicacoesStore();
    await s.carregar();
    s.limpar();
    expect(s.comunicacoes).toHaveLength(0);
  });
});
