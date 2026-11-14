<script setup lang="ts" generic="T extends object">
/**
 * ============================================================================
 * TABELA DE DADOS (`DataTable.vue`) — inspirada na Table do Ant Design
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Tabela reutilizável com o que as listas do RADAR precisam:
 *   - ORDENAÇÃO por coluna (clique no cabeçalho; o leitor de tela anuncia
 *     "ordenado crescente" graças ao atributo `aria-sort`);
 *   - PAGINAÇÃO (10 linhas por página, por padrão);
 *   - DENSIDADE padrão ou compacta;
 *   - ESTADO VAZIO (slot `vazio`) quando não há linhas;
 *   - ROLAGEM PRÓPRIA no celular: a tabela rola dentro da caixa, sem empurrar
 *     a página para os lados (achado A5 do diagnóstico).
 *
 * A BUSCA e os FILTROS ficam na página que usa a tabela (ela entrega as
 * `linhas` já filtradas). Assim a tabela fica simples e fácil de testar.
 *
 * Exemplo:
 *   <DataTable :colunas="colunas" :linhas="riscos" chave-linha="id"
 *              legenda="Riscos do Plano de Gestão de Riscos" linha-clicavel
 *              @clique-linha="abrirResumo">
 *     <template #celula-residual="{ linha }">
 *       <RiskBadge :classe="linha.classificacaoResidual" :valor="linha.nivelResidual" />
 *     </template>
 *   </DataTable>
 */
import { computed, ref, watch } from 'vue';
import type { ColunaTabela } from './tipos';

const props = withDefaults(
  defineProps<{
    colunas: ColunaTabela<T>[];
    linhas: T[];
    chaveLinha: keyof T & string;
    /** Descrição da tabela para leitor de tela (vira <caption>). */
    legenda: string;
    tamanhoPagina?: number;
    densidade?: 'padrao' | 'compacta';
    linhaClicavel?: boolean;
    ordenacaoInicial?: { chave: string; direcao: 'asc' | 'desc' };
  }>(),
  { tamanhoPagina: 10, densidade: 'padrao' }
);

const emit = defineEmits<{ (e: 'clique-linha', linha: T): void }>();

/** Lê `linha[chave]` de forma segura para qualquer tipo de objeto. */
function valorDaCelula(linha: T, chave: string): unknown {
  return (linha as Record<string, unknown>)[chave];
}

// ---------------------------------------------------------------------------
// ORDENAÇÃO
// ---------------------------------------------------------------------------
const ordenacao = ref<{ chave: string; direcao: 'asc' | 'desc' } | null>(
  props.ordenacaoInicial ?? null
);

/** 1º clique: crescente → 2º: decrescente → 3º: sem ordenação. */
function alternarOrdenacao(chave: string): void {
  const atual = ordenacao.value;
  if (!atual || atual.chave !== chave) ordenacao.value = { chave, direcao: 'asc' };
  else if (atual.direcao === 'asc') ordenacao.value = { chave, direcao: 'desc' };
  else ordenacao.value = null;
}

function ariaSort(chave: string): 'ascending' | 'descending' | 'none' {
  if (ordenacao.value?.chave !== chave) return 'none';
  return ordenacao.value.direcao === 'asc' ? 'ascending' : 'descending';
}

const linhasOrdenadas = computed<T[]>(() => {
  const ord = ordenacao.value;
  if (!ord) return props.linhas;
  const coluna = props.colunas.find((c) => c.chave === ord.chave);
  const obterValor = coluna?.valorOrdenacao ?? ((l: T) => valorDaCelula(l, ord.chave) as string | number);
  const fator = ord.direcao === 'asc' ? 1 : -1;
  // `[...]` cria uma cópia: nunca alteramos o array original da store.
  return [...props.linhas].sort((a, b) => {
    const va = obterValor(a);
    const vb = obterValor(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * fator;
  });
});

// ---------------------------------------------------------------------------
// PAGINAÇÃO
// ---------------------------------------------------------------------------
const pagina = ref(1);
const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(props.linhas.length / props.tamanhoPagina))
);

// Se os filtros reduzirem a lista, volta para uma página que exista.
watch(totalPaginas, (total) => {
  if (pagina.value > total) pagina.value = total;
});

const linhasVisiveis = computed(() => {
  const inicio = (pagina.value - 1) * props.tamanhoPagina;
  return linhasOrdenadas.value.slice(inicio, inicio + props.tamanhoPagina);
});

const faixaExibida = computed(() => {
  if (props.linhas.length === 0) return '0 itens';
  const inicio = (pagina.value - 1) * props.tamanhoPagina + 1;
  const fim = Math.min(pagina.value * props.tamanhoPagina, props.linhas.length);
  return `${inicio}–${fim} de ${props.linhas.length}`;
});

// ---------------------------------------------------------------------------
// CLIQUE NA LINHA (ignora cliques em links/botões dentro da linha)
// ---------------------------------------------------------------------------
function aoClicarLinha(evento: MouseEvent, linha: T): void {
  if (!props.linhaClicavel) return;
  const alvo = evento.target as HTMLElement;
  if (alvo.closest('a, button, input, select, textarea, label')) return;
  emit('clique-linha', linha);
}
</script>

<template>
  <div class="tabela-dados" :data-density="densidade === 'compacta' ? 'compact' : undefined">
    <div class="tabela-dados__rolagem" tabindex="0" :aria-label="`${legenda} (role para os lados se necessário)`">
      <table class="tabela-dados__tabela">
        <caption class="radar-so-leitor">{{ legenda }}</caption>
        <thead>
          <tr>
            <th
              v-for="col in colunas"
              :key="col.chave"
              scope="col"
              :aria-sort="col.ordenavel ? ariaSort(col.chave) : undefined"
              :style="{ width: col.largura }"
              :class="[`alinhar-${col.alinhamento ?? 'esquerda'}`, { 'ocultar-celular': col.ocultarNoCelular }]"
            >
              <button
                v-if="col.ordenavel"
                type="button"
                class="tabela-dados__ordenar"
                @click="alternarOrdenacao(col.chave)"
              >
                {{ col.rotulo }}
                <i
                  class="fa-solid"
                  :class="{
                    'fa-sort': ariaSort(col.chave) === 'none',
                    'fa-sort-up': ariaSort(col.chave) === 'ascending',
                    'fa-sort-down': ariaSort(col.chave) === 'descending',
                  }"
                  aria-hidden="true"
                ></i>
              </button>
              <template v-else>{{ col.rotulo }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="linha in linhasVisiveis"
            :key="String(linha[chaveLinha])"
            :class="{ 'linha-clicavel': linhaClicavel }"
            @click="aoClicarLinha($event, linha)"
          >
            <td
              v-for="col in colunas"
              :key="col.chave"
              :class="[`alinhar-${col.alinhamento ?? 'esquerda'}`, { 'ocultar-celular': col.ocultarNoCelular }]"
            >
              <!-- Slot por coluna: #celula-<chave>. Sem slot, mostra o valor bruto. -->
              <slot :name="`celula-${col.chave}`" :linha="linha">
                {{ valorDaCelula(linha, col.chave) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="linhas.length === 0" class="tabela-dados__vazio">
        <slot name="vazio">
          <p>Nenhum item para mostrar.</p>
        </slot>
      </div>
    </div>

    <nav v-if="linhas.length > tamanhoPagina" class="tabela-dados__paginacao" aria-label="Paginação da tabela">
      <span class="radar-texto-secundario">{{ faixaExibida }}</span>
      <div class="radar-cacho">
        <button
          type="button"
          class="tabela-dados__pagina-botao"
          :disabled="pagina === 1"
          aria-label="Página anterior"
          @click="pagina--"
        >
          <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
        <span aria-live="polite">Página {{ pagina }} de {{ totalPaginas }}</span>
        <button
          type="button"
          class="tabela-dados__pagina-botao"
          :disabled="pagina === totalPaginas"
          aria-label="Próxima página"
          @click="pagina++"
        >
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.tabela-dados {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  overflow: hidden;
}

.tabela-dados__rolagem {
  overflow-x: auto;
}

.tabela-dados__tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--texto-sm);
}

th,
td {
  padding: var(--densidade-celula-y) var(--esp-3);
  border-bottom: 1px solid var(--borda);
  vertical-align: middle;
}

th {
  height: var(--densidade-linha);
  background: var(--superficie-container);
  color: var(--texto-secundario);
  font-weight: var(--peso-semi);
  text-align: left;
  white-space: nowrap;
}

tbody tr {
  height: var(--densidade-linha);
}

tbody tr:last-child td {
  border-bottom: 0;
}

tbody tr:hover {
  background: var(--superficie-container);
}

.linha-clicavel {
  cursor: pointer;
}

.alinhar-direita { text-align: right; }
.alinhar-centro { text-align: center; }

.tabela-dados__ordenar {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.tabela-dados__ordenar i {
  font-size: 0.8em;
  opacity: 0.7;
}

.tabela-dados__vazio {
  padding: var(--esp-4);
}

.tabela-dados__paginacao {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  padding: var(--esp-2) var(--esp-4);
  border-top: 1px solid var(--borda);
  font-size: var(--texto-sm);
}

.tabela-dados__pagina-botao {
  display: grid;
  place-items: center;
  width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  border: 1px solid var(--borda);
  border-radius: 50%;
  background: var(--superficie);
  color: var(--texto);
  cursor: pointer;
}

.tabela-dados__pagina-botao:disabled {
  color: var(--texto-desabilitado);
  cursor: not-allowed;
}

@media (max-width: 767.98px) {
  .ocultar-celular {
    display: none;
  }
}
</style>
