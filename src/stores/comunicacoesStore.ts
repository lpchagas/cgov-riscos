/**
 * ============================================================================
 * STORE DAS COMUNICAÇÕES À CGOV (`src/stores/comunicacoesStore.ts`) — LAC-04
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Guarda a lista de comunicações e conversa com a MESMA fonte de dados da
 * `riscosStore` (na demonstração é a fonte que guarda tudo na memória: alertas
 * e comunicações precisam morar juntos, pois comunicar um alerta o encerra).
 *
 * - `carregar()`: lê as comunicações (estado `carregando` e `erro` como as demais telas);
 * - `enviar(d)`: grava e relê a lista. Com `alertaId`, relê também os alertas da
 *   `riscosStore`, para o Monitoramento mostrar "comunicado" (R15);
 * - `registrarCiencia(id, obs?)`: só a CGOV, uma vez;
 * - `novas`: comunicações sem ciência da CGOV (o número do menu da CGOV).
 * Erros das ações são lançados (`ErroRadar`, mensagem pronta para a tela).
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ComunicacaoCgov } from '../types/radar.types';
import type { NovaComunicacao } from '../services/dados/tipos';
import { ErroRadar, traduzirErroBanco } from '../services/dados/errosBanco';
import { useRiscosStore } from './riscosStore';

export const useComunicacoesStore = defineStore('comunicacoes', () => {
  const comunicacoes = ref<ComunicacaoCgov[]>([]);
  const carregando = ref(false);
  const erro = ref<ErroRadar | null>(null);

  const novas = computed(() => comunicacoes.value.filter((c) => c.situacao === 'nova'));

  /** A fonte da riscosStore (a mesma instância, ver o comentário no topo). */
  const fonte = () => useRiscosStore().fonteDeDados();

  async function carregar(): Promise<void> {
    carregando.value = true;
    erro.value = null;
    try {
      comunicacoes.value = await fonte().listarComunicacoes();
    } catch (e) {
      erro.value = traduzirErroBanco(e);
    } finally {
      carregando.value = false;
    }
  }

  /** Grava a comunicação, relê a lista e devolve o id novo. */
  async function enviar(d: NovaComunicacao): Promise<string> {
    const id = await fonte().enviarComunicacao(d).catch((e: unknown) => {
      throw traduzirErroBanco(e);
    });
    await carregar();
    // Comunicar um alerta o encerra: o Monitoramento precisa ler os alertas de novo.
    if (d.alertaId) await useRiscosStore().relerAlertas();
    return id;
  }

  async function registrarCiencia(id: string, observacao?: string): Promise<void> {
    await fonte().registrarCiencia(id, observacao).catch((e: unknown) => {
      throw traduzirErroBanco(e);
    });
    await carregar();
  }

  /** Ao sair da sessão: não deixa dados da pessoa anterior na memória. */
  function limpar(): void {
    comunicacoes.value = [];
    carregando.value = false;
    erro.value = null;
  }

  return { comunicacoes, carregando, erro, novas, carregar, enviar, registrarCiencia, limpar };
});
