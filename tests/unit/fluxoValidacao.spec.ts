import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRiscosStore } from '../../src/stores/riscosStore';
import { useAuthStore } from '../../src/stores/authStore';

describe('Fluxo de Validação em 1 Clique (3 Degraus) e Monitoramento Contínuo', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('escala automaticamente um Risco Crítico do 2º degrau (CG) para o 3º degrau (Diretoria) ao aprovar em 1 clique', () => {
    const store = useRiscosStore();
    const auth = useAuthStore();
    const riscoAnexoII = store.riscos[0]; // Nota 22 Extremo (Crítico)

    auth.alternarPerfilDemo('gestor');
    store.submeterParaValidacaoCg(riscoAnexoII.id);
    expect(store.riscos[0].statusFluxo).toBe('em_validacao_cg');

    auth.alternarPerfilDemo('lider_cg');
    store.aprovarEmUmCliqueCg(riscoAnexoII.id);
    // Como é Risco Crítico, sobe para homologação da Diretoria:
    expect(store.riscos[0].statusFluxo).toBe('em_homologacao_dir');

    auth.alternarPerfilDemo('diretor');
    store.homologarEmUmCliqueDiretoria(riscoAnexoII.id);
    expect(store.riscos[0].statusFluxo).toBe('aprovado');
  });

  it('mantém status "aprovado" ao lançar medição de KRI, mas reabre para "em_validacao_cg" se alterar a nota do risco', () => {
    const store = useRiscosStore();
    const risco = store.riscos[0];
    risco.statusFluxo = 'aprovado';

    // Lançar medição de KRI não derruba o status aprovado:
    store.registrarMedicaoKri(risco.id, risco.kris[0].id, {
      dataMedicao: '2026-11-09',
      valorApurado: '15%',
      emAlerta: false,
      observacao: 'Leitura trimestral dentro da meta',
    });
    expect(store.riscos[0].statusFluxo).toBe('aprovado');

    // Alterar a nota reabre para validação da Coordenação-Geral:
    store.reavaliarPontuacaoRiscoAprovado(risco.id, {
      probabilidade: 3,
      impacto: 5,
      nivelEficaciaControle: 'Satisfatório',
      possuiEvidenciaControle: true,
    });
    expect(store.riscos[0].nivelResidual).toBe(13.2);
    expect(store.riscos[0].statusFluxo).toBe('em_validacao_cg');
  });
});
