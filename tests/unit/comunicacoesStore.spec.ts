/** Testes da store das comunicações à CGOV (LAC-04), com a fonte de demonstração. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { definirFonteParaTeste, useRiscosStore } from '../../src/stores/riscosStore';
import { ligarComunicacoesASessao, useComunicacoesStore } from '../../src/stores/comunicacoesStore';
import { criarFonteDemonstracao } from '../../src/services/dados';
import { PERFIS_DEMO_ICMBIO } from '../../src/stores/authStore';
import type { NovaComunicacao } from '../../src/services/dados/tipos';
import { ErroRadar } from '../../src/services/dados/errosBanco';
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
    const falha = await s.registrarCiencia(ciente.id).catch((e: unknown) => e);
    expect(falha).toBeInstanceOf(ErroRadar);
    expect((falha as ErroRadar).message).toContain('já foi registrada');
    expect((falha as ErroRadar).tipo).toBe('estado');
  });

  it('limpar esvazia a lista', async () => {
    usar('cgov');
    const s = useComunicacoesStore();
    await s.carregar();
    s.limpar();
    expect(s.comunicacoes).toHaveLength(0);
  });

  // m4 (fim da Fase 3): o 2º envio do MESMO alerta, pelo caminho real da store, chega como
  // mensagem clara (a do banco), e não como a frase genérica.
  it('2º envio do mesmo alerta (já encerrado): ErroRadar "Este alerta já foi comunicado"', async () => {
    usar('gestor');
    const riscos = useRiscosStore();
    await riscos.carregar();
    const alerta = riscos.alertasKri.find((a) => !a.encerradoEm)!;
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
    await s.enviar(nova);
    const falha = await s.enviar(nova).catch((e: unknown) => e);
    expect(falha).toBeInstanceOf(ErroRadar);
    expect((falha as ErroRadar).message).toBe('Este alerta já foi comunicado');
    expect((falha as ErroRadar).tipo).toBe('estado');
  });
});

// I-1 (fim da Fase 3): F5 em /comunicacoes no modo real. A tela pede a lista ao montar,
// mas a sessão só fica 'ativo' DEPOIS; a ligação limpa (descartando a leitura da tela) e,
// antes da correção, só recarregava para a CGOV: gestor e AUDIT ficavam com a lista vazia.
describe('ligarComunicacoesASessao', () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => definirFonteParaTeste(null));

  it('F5 na tela aberta: quando a sessão fica ativa, o GESTOR recebe a lista', async () => {
    usar('gestor');
    const sessao = reactive({ situacao: 'carregando', usuarioAtual: { id: '', papel: 'gestor' } });
    const s = useComunicacoesStore();
    const parar = ligarComunicacoesASessao(sessao, s);
    s.abrirTela(); // onMounted da tela (geração 1)
    sessao.situacao = 'ativo'; // a sessão chega depois → limpar() descarta a geração 1
    sessao.usuarioAtual.id = 'gestor-1';
    await nextTick();
    await flushPromises();
    expect(s.comunicacoes.length).toBeGreaterThan(0);
    parar();
  });

  it('sem a tela aberta, o gestor NÃO carrega (só a CGOV, pelo número do menu)', async () => {
    usar('gestor');
    const sessao = reactive({ situacao: 'carregando', usuarioAtual: { id: '', papel: 'gestor' } });
    const s = useComunicacoesStore();
    const parar = ligarComunicacoesASessao(sessao, s);
    s.abrirTela();
    s.fecharTela();
    sessao.situacao = 'ativo';
    await nextTick();
    await flushPromises();
    expect(s.comunicacoes).toHaveLength(0);
    parar();
  });
});
