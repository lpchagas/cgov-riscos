<script setup lang="ts">
/**
 * ============================================================================
 * APROVAÇÕES (`CaixaValidacaoUmCliqueView.vue`) — Etapa B3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Padrão "caixa de entrada" (como um e-mail): a LISTA de pendências fica à
 * esquerda e o DETALHE do item escolhido à direita. No celular, um embaixo do
 * outro.
 *
 * QUEM DECIDE O QUE NÃO É A TELA: é o banco (função `acoes_no_fluxo`). A store
 * guarda, para cada risco, o que ESTA pessoa pode fazer (`acoes`) e monta as
 * filas a partir disso:
 *   - "Para validar"      → `filaValidacaoCg`        (acoes[id].podeValidar)
 *   - "Para homologar"    → `filaHomologacaoDiretoria` (acoes[id].podeHomologar)
 *   - "Sem quem decida"   → `filaSemDecisor`         (acoes[id].devolucaoCgov);
 *                           só aparece quando há itens.
 * Ex.: um risco `em_validacao_cg` que NÃO é da alçada de quem está logado não
 * aparece em lugar nenhum desta tela (antes, aparecia com botões desabilitados).
 *
 * Os botões (validar, homologar, devolver...) vêm do componente `AcoesDoRisco`,
 * o mesmo da Ficha: ele só desenha o que o banco liberou.
 *
 * A aba e o item escolhidos ficam na URL (`/aprovacoes?aba=homologar&id=…`):
 * dá para mandar o link de um item específico para outra pessoa.
 */
import { computed, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import type { FichaRisco } from '../types/radar.types';
import { ROTULOS_CRITICIDADE, formatarDataHora } from '../utils/rotulosInterface';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import BrTabs from '../components/govbr/BrTabs.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import AcoesDoRisco from '../components/radar/AcoesDoRisco.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

type Aba = 'validar' | 'homologar' | 'sem-decisor';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();

// ---------------------------------------------------------------------------
// ABA E ITEM ESCOLHIDOS (guardados na URL)
// ---------------------------------------------------------------------------
const filaDaAba = (a: Aba): FichaRisco[] =>
  a === 'validar'
    ? riscosStore.filaValidacaoCg
    : a === 'homologar'
      ? riscosStore.filaHomologacaoDiretoria
      : riscosStore.filaSemDecisor;

/**
 * Aba padrão: a primeira que tem algo para esta pessoa. A Diretoria prefere a
 * sua homologação; os demais, a validação. Sem nada em lugar nenhum, "Para validar".
 */
function abaPadrao(): Aba {
  const ordem: Aba[] =
    authStore.usuarioAtual.papel === 'diretor'
      ? ['homologar', 'validar', 'sem-decisor']
      : ['validar', 'homologar', 'sem-decisor'];
  return ordem.find((a) => filaDaAba(a).length > 0) ?? 'validar';
}

const aba = computed<Aba>({
  get: () => {
    const q = route.query.aba;
    if (q === 'validar' || q === 'homologar') return q;
    // "Sem quem decida" só vale na URL enquanto houver itens nela.
    if (q === 'sem-decisor' && riscosStore.filaSemDecisor.length) return q;
    return abaPadrao();
  },
  set: (a) => router.replace({ query: { aba: a } }),
});

const itens = computed<FichaRisco[]>(() => filaDaAba(aba.value));

const abas = computed(() => [
  { id: 'validar', rotulo: 'Para validar', icone: 'fa-solid fa-check', contador: riscosStore.filaValidacaoCg.length },
  { id: 'homologar', rotulo: 'Para homologar', icone: 'fa-solid fa-stamp', contador: riscosStore.filaHomologacaoDiretoria.length },
  // A terceira aba só existe quando há riscos sem validador/homologador efetivo.
  ...(riscosStore.filaSemDecisor.length
    ? [{ id: 'sem-decisor', rotulo: 'Sem quem decida', icone: 'fa-solid fa-user-slash', contador: riscosStore.filaSemDecisor.length }]
    : []),
]);

const apoioDaAba = computed(() =>
  aba.value === 'validar'
    ? '2º degrau: a Coordenação-Geral valida. Críticos seguem para a Diretoria.'
    : aba.value === 'homologar'
      ? '3º degrau: a Diretoria homologa os riscos Críticos.'
      : ''
);

const vazio = computed(() =>
  aba.value === 'homologar'
    ? { titulo: 'Nada aguardando homologação', descricao: 'Quando um risco chegar à sua homologação, ele aparece aqui.' }
    : { titulo: 'Nada aguardando validação', descricao: 'Quando uma unidade enviar um risco para a sua validação, ele aparece aqui.' }
);

/** Item aberto: o da URL, se ainda estiver na fila; senão, o primeiro. */
const selecionado = computed<FichaRisco | null>(() => {
  const id = typeof route.query.id === 'string' ? route.query.id : null;
  return itens.value.find((r) => r.id === id) ?? itens.value[0] ?? null;
});

function abrir(risco: FichaRisco): void {
  router.replace({ query: { aba: aba.value, id: risco.id } });
  // No celular, leva a pessoa até o detalhe (que fica abaixo da lista).
  requestAnimationFrame(() => document.getElementById('detalhe-aprovacao')?.focus({ preventScroll: false }));
}

// Se a fila esvaziar ou o item sair dela, limpa o id da URL.
watch(selecionado, (s) => {
  if (!s && route.query.id) router.replace({ query: { aba: aba.value } });
});

/** Estado da carteira para o bloco: carregando, erro ou pronto. */
const estadoBloco = computed<'carregando' | 'erro' | 'pronto'>(() =>
  riscosStore.estado === 'erro' ? 'erro' : riscosStore.estado === 'pronto' ? 'pronto' : 'carregando'
);

/** Data em que o risco entrou na fila atual (último evento do histórico). */
const enviadoEm = (r: FichaRisco) => {
  const ultimo = r.historicoFluxo[r.historicoFluxo.length - 1];
  return ultimo ? formatarDataHora(ultimo.criadoEm) : '—';
};
</script>

<template>
  <div class="aprovacoes">
    <EstadoCarregamento
      :estado="estadoBloco"
      :erro="riscosStore.erro"
      formato="tabela"
      :linhas="6"
      @tentar-de-novo="riscosStore.tentarDeNovo()"
    >
      <BrTabs v-model:aba-ativa="aba" rotulo="Fila de aprovação" :abas="abas">
        <template #default="{ aba: abaAtual }">
          <p v-if="apoioDaAba" class="texto-apoio">{{ apoioDaAba }}</p>
          <BrMessage v-else state="info">
            Estes riscos não têm validador ou homologador efetivo. A CGOV pode devolvê-los à unidade.
          </BrMessage>

          <div v-if="itens.length" class="caixa" :data-aba="abaAtual">
            <!-- LISTA -->
            <nav class="caixa__lista" aria-label="Pendências">
              <ul>
                <li v-for="r in itens" :key="r.id">
                  <button
                    type="button"
                    class="item"
                    :class="{ 'item--ativo': selecionado?.id === r.id }"
                    :aria-current="selecionado?.id === r.id ? 'true' : undefined"
                    @click="abrir(r)"
                  >
                    <span class="item__linha">
                      <span class="codigo">{{ r.codigoRadar }}</span>
                      <RiskBadge :classe="r.classificacaoResidual" :valor="r.nivelResidual" tamanho="sm" />
                    </span>
                    <span class="item__objeto">{{ r.nomeObjetoCache }}</span>
                    <span class="item__meta">{{ r.categoriaNome }} · enviado em {{ enviadoEm(r) }}</span>
                  </button>
                </li>
              </ul>
            </nav>

            <!-- DETALHE -->
            <section
              v-if="selecionado"
              id="detalhe-aprovacao"
              class="caixa__detalhe"
              tabindex="-1"
              :aria-label="`Detalhe de ${selecionado.codigoRadar}`"
            >
              <header class="detalhe__cabecalho">
                <div>
                  <p class="codigo">{{ selecionado.codigoRadar }}</p>
                  <h2 class="detalhe__titulo">{{ selecionado.nomeObjetoCache }}</h2>
                  <p class="texto-apoio">
                    {{ selecionado.categoriaNome }}
                    <template v-if="selecionado.subcategoriaIntegridade">· {{ selecionado.subcategoriaIntegridade }}</template>
                    · {{ selecionado.responsavelRiscoNome }}
                  </p>
                </div>
                <Chip :tom="ROTULOS_CRITICIDADE[selecionado.statusCritico].tom" :icone="ROTULOS_CRITICIDADE[selecionado.statusCritico].icone">
                  {{ ROTULOS_CRITICIDADE[selecionado.statusCritico].rotulo }}
                </Chip>
              </header>

              <h3 class="detalhe__subtitulo">O risco</h3>
              <p class="detalhe__texto">{{ selecionado.descricaoPadrao }}</p>

              <h3 class="detalhe__subtitulo">A conta</h3>
              <MemoriaCalculoBar
                :probabilidade="selecionado.probabilidade"
                :impacto="selecionado.impacto"
                :nivel-inerente="selecionado.nivelInerente"
                :classificacao-inerente="selecionado.classificacaoInerente"
                :eficacia-controle="selecionado.nivelEficaciaControle"
                :fator-controle="selecionado.fatorControle"
                :possui-evidencia="selecionado.possuiEvidenciaControle"
                :nivel-residual="selecionado.nivelResidual"
                :classificacao-residual="selecionado.classificacaoResidual"
                :status-critico="selecionado.statusCritico"
              />

              <footer class="detalhe__acoes">
                <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: selecionado.id } }" class="link-acao">
                  Ver ficha completa <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </RouterLink>
                <!-- Os botões vêm do banco (`acoes`); aqui só decidir, sem "Editar ficha". -->
                <AcoesDoRisco :risco="selecionado" :acoes="riscosStore.acoes[selecionado.id]" :mostrar-edicao="false" />
              </footer>
            </section>
          </div>

          <EmptyState
            v-else
            class="cartao"
            :titulo="vazio.titulo"
            :descricao="vazio.descricao"
            icone="fa-regular fa-circle-check"
          />
        </template>
      </BrTabs>
    </EstadoCarregamento>
  </div>
</template>

<style scoped>
.aprovacoes {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.cartao {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
}

.codigo {
  margin: 0;
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
}

.link-acao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

/* --- Caixa de entrada: lista (1/3) + detalhe (2/3) --- */
.caixa {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) minmax(0, 2fr);
  overflow: hidden;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.caixa__lista {
  border-right: 1px solid var(--borda);
  background: var(--superficie-container);
}

.caixa__lista ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  width: 100%;
  padding: var(--esp-3) var(--esp-4);
  border: 0;
  border-bottom: 1px solid var(--borda);
  border-left: 4px solid transparent;
  background: transparent;
  color: var(--texto);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.item:hover {
  background: var(--superficie-alta);
}

.item--ativo {
  border-left-color: var(--cor-primaria);
  background: var(--superficie);
}

.item__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2);
}

.item__objeto {
  font-weight: var(--peso-semi);
  line-height: 1.3;
}

.item__meta {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.caixa__detalhe {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  min-width: 0;
  padding: var(--esp-5);
}

.caixa__detalhe:focus {
  outline: none;
}

.detalhe__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-3);
}

.detalhe__titulo {
  margin: var(--esp-1) 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
  line-height: 1.3;
}

.detalhe__subtitulo {
  margin: var(--esp-2) 0 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detalhe__texto {
  margin: 0;
  line-height: 1.55;
}

.detalhe__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  margin-top: var(--esp-2);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--borda);
}

@media (max-width: 991.98px) {
  .caixa {
    grid-template-columns: minmax(0, 1fr);
  }
  .caixa__lista {
    border-right: 0;
    border-bottom: 1px solid var(--borda);
  }
  .caixa__detalhe {
    padding: var(--esp-4);
  }
}
</style>
