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
 * - `novas`: comunicações sem ciência da CGOV (o número do menu da CGOV);
 * - `abrirTela()` / `fecharTela()`: a tela `/comunicacoes` avisa que está aberta. Assim,
 *   quando a sessão muda (ex.: F5 no modo real, em que a sessão só fica 'ativo' depois de a
 *   tela montar), a ligação com a sessão relê a lista para QUALQUER perfil (I-1).
 * Erros das ações são lançados (`ErroRadar`, mensagem pronta para a tela).
 */
import { defineStore } from 'pinia';
import { computed, ref, watch, type WatchStopHandle } from 'vue';
import type { ComunicacaoCgov } from '../types/radar.types';
import type { NovaComunicacao } from '../services/dados/tipos';
import { ErroRadar, traduzirErroBanco, traduzirErroComunicacao } from '../services/dados/errosBanco';
import { useRiscosStore, type SessaoParaCarteira } from './riscosStore';
import { useAuthStore } from './authStore';

export const useComunicacoesStore = defineStore('comunicacoes', () => {
  const comunicacoes = ref<ComunicacaoCgov[]>([]);
  const carregando = ref(false);
  const erro = ref<ErroRadar | null>(null);

  const novas = computed(() => comunicacoes.value.filter((c) => c.situacao === 'nova'));
  /** true enquanto a tela `/comunicacoes` está montada ("a página quer a lista"). */
  const telaAberta = ref(false);

  /** A fonte da riscosStore (a mesma instância, ver o comentário no topo). */
  const fonte = () => useRiscosStore().fonteDeDados();

  /**
   * "Geração" dos dados (mesma ideia da riscosStore): `limpar()` a avança, e uma leitura
   * que termina depois disso é descartada. Ex.: a CGOV sai enquanto a lista carrega →
   * a lista velha NÃO volta para a memória da próxima pessoa.
   */
  let geracao = 0;

  async function carregar(): Promise<void> {
    const minha = ++geracao;
    carregando.value = true;
    erro.value = null;
    try {
      const lidas = await fonte().listarComunicacoes();
      if (minha === geracao) comunicacoes.value = lidas;
    } catch (e) {
      if (minha === geracao) erro.value = traduzirErroBanco(e);
    } finally {
      if (minha === geracao) carregando.value = false;
    }
  }

  /** Grava a comunicação, relê a lista e devolve o id novo. */
  async function enviar(d: NovaComunicacao): Promise<string> {
    const id = await fonte().enviarComunicacao(d).catch((e: unknown) => {
      throw traduzirErroComunicacao(e);
    });
    await carregar();
    // Comunicar um alerta o encerra: o Monitoramento precisa ler os alertas de novo.
    if (d.alertaId) await useRiscosStore().relerAlertas();
    return id;
  }

  async function registrarCiencia(id: string, observacao?: string): Promise<void> {
    await fonte().registrarCiencia(id, observacao).catch((e: unknown) => {
      throw traduzirErroComunicacao(e);
    });
    await carregar();
  }

  /** A tela montou: marca que quer a lista e a lê (a tela sempre relê ao abrir). */
  function abrirTela(): Promise<void> {
    telaAberta.value = true;
    return carregar();
  }

  /** A tela desmontou: a lista não precisa mais ser relida ao mudar a sessão (salvo a CGOV). */
  function fecharTela(): void {
    telaAberta.value = false;
  }

  /** Ao sair da sessão: não deixa dados da pessoa anterior na memória. */
  function limpar(): void {
    geracao++;
    comunicacoes.value = [];
    carregando.value = false;
    erro.value = null;
  }

  return {
    comunicacoes,
    carregando,
    erro,
    novas,
    telaAberta,
    carregar,
    enviar,
    registrarCiencia,
    abrirTela,
    fecharTela,
    limpar,
  };
});

/** O mínimo da store de comunicações de que a ligação precisa (a store real serve). */
export interface ComunicacoesLigaveis {
  /** A tela `/comunicacoes` está aberta (ver `abrirTela`). */
  readonly telaAberta: boolean;
  carregar(): Promise<void>;
  limpar(): void;
}

/**
 * Liga as comunicações à sessão (chamada uma vez pelo `App.vue`, ao lado de `ligarCarteiraASessao`):
 *   - qualquer mudança de pessoa, perfil ou situação → `limpar()` primeiro (nada da pessoa
 *     anterior fica na memória, por exemplo ao sair ou trocar de perfil no simulador);
 *   - sessão 'ativo' e perfil CGOV → `carregar()`, para o menu mostrar o número de novas (R17);
 *   - sessão 'ativo' e a tela `/comunicacoes` aberta → `carregar()` para QUALQUER perfil (I-1).
 *     Ex.: F5 em /comunicacoes no modo real: a tela monta e pede a lista; a sessão só fica
 *     'ativo' depois, e o `limpar()` descarta aquela leitura. Sem esta regra, o gestor e a
 *     AUDIT ficariam com a lista vazia até sair e voltar à tela.
 * Os outros perfis, fora da tela, não leem nada (a lista só interessa a quem a abre).
 * Observa só textos (situação, id, papel), pelo mesmo motivo explicado em `ligarCarteiraASessao`.
 * Ex.: CGOV entra → carrega (menu "Comunicações à CGOV 1"); sai → limpa.
 */
export function ligarComunicacoesASessao(
  sessao: SessaoParaCarteira = useAuthStore(),
  comunicacoes: ComunicacoesLigaveis = useComunicacoesStore()
): WatchStopHandle {
  return watch(
    [() => sessao.situacao, () => sessao.usuarioAtual.id, () => sessao.usuarioAtual.papel],
    ([situacao, , papel]) => {
      comunicacoes.limpar();
      if (situacao === 'ativo' && (papel === 'cgov' || comunicacoes.telaAberta)) void comunicacoes.carregar();
    },
    { immediate: true }
  );
}
