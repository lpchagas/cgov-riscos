<script setup lang="ts">
/**
 * ============================================================================
 * AUDITORIA (`TrilhaAuditoriaGovernancaView.vue`) — dados do banco
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Tudo o que foi alterado no RADAR (riscos, controles, DAR, objetos, KRI,
 * perfis e o fluxo de aprovação), do mais recente para o mais antigo. Serve à
 * CGOV, ao CTGRIC, ao CIG e à Auditoria Interna.
 *
 * Como a lista é lida:
 *   - o banco entrega 50 eventos por vez; "Carregar mais" pede os 50 seguintes
 *     usando o CURSOR (data e id do último evento já mostrado) — assim não
 *     repete nem pula nada, mesmo que apareçam eventos novos no meio;
 *   - mudar um filtro (período ou tabela) RECOMEÇA a lista do zero;
 *   - cada linha crua vira uma frase legível por `utils/auditoriaLegivel.ts`
 *     ("Controle do risco RADAR-2026-003 alterado" + "Causas: antes → depois");
 *   - "Exportar CSV" baixa os eventos que já estão carregados na tela.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import { ROTULOS_PAPEL, eventosAuditoriaParaCsv } from '../utils/auditoriaCsv';
import { descreverEvento, quemFez, ROTULOS_TABELA } from '../utils/auditoriaLegivel';
import type { EventoAuditoria, FiltrosAuditoria } from '../services/dados/tipos';
import type { ErroRadar } from '../services/dados/errosBanco';
import FormField from '../components/ui/FormField.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import BrButton from '../components/govbr/BrButton.vue';

const riscosStore = useRiscosStore();
const { mostrar } = useToast();

/** Tamanho da página do banco (o servidor devolve no máximo 50 por vez). */
const TAMANHO_PAGINA = 50;

// ---------------------------------------------------------------------------
// FILTROS
// ---------------------------------------------------------------------------
const filtro = ref({ tabela: '', de: '', ate: '' });
const temFiltro = computed(() => Object.values(filtro.value).some(Boolean));

/** Datas do filtro (AAAA-MM-DD) → instantes: "de" começa à 0h; "até" vai até 23h59 do dia. */
function filtrosDoBanco(): FiltrosAuditoria {
  const f: FiltrosAuditoria = {};
  if (filtro.value.tabela) f.tabela = filtro.value.tabela;
  if (filtro.value.de) f.de = new Date(`${filtro.value.de}T00:00:00`).toISOString();
  if (filtro.value.ate) f.ate = new Date(`${filtro.value.ate}T23:59:59.999`).toISOString();
  return f;
}

// ---------------------------------------------------------------------------
// LEITURA PAGINADA
// ---------------------------------------------------------------------------
const eventos = ref<EventoAuditoria[]>([]);
const estadoLista = ref<'carregando' | 'erro' | 'pronto'>('carregando');
const erroLista = ref<ErroRadar | null>(null);
const temMais = ref(false);
const carregandoMais = ref(false);
/** Número da leitura mais recente: resposta de leitura antiga (filtro já trocado) é descartada. */
let leitura = 0;

/** Começa a lista do zero (primeira carga, troca de filtro, "Tentar de novo"). */
async function recomecar(): Promise<void> {
  const minha = ++leitura;
  estadoLista.value = 'carregando';
  erroLista.value = null;
  try {
    const pagina = await riscosStore.lerAuditoria(filtrosDoBanco());
    if (minha !== leitura) return;
    eventos.value = pagina;
    temMais.value = pagina.length >= TAMANHO_PAGINA;
    estadoLista.value = 'pronto';
  } catch (e) {
    if (minha !== leitura) return;
    erroLista.value = e as ErroRadar;
    estadoLista.value = 'erro';
  }
}

/** Pede os próximos eventos a partir do último já mostrado (o "cursor"). */
async function carregarMais(): Promise<void> {
  const ultimo = eventos.value[eventos.value.length - 1];
  if (!ultimo || carregandoMais.value) return;
  const minha = leitura;
  carregandoMais.value = true;
  try {
    const pagina = await riscosStore.lerAuditoria({ ...filtrosDoBanco(), antesDe: { em: ultimo.realizadoEm, id: ultimo.id } });
    if (minha !== leitura) return;
    // Proteção extra: nunca repete um evento que já está na tela.
    const jaTem = new Set(eventos.value.map((e) => e.id));
    eventos.value = [...eventos.value, ...pagina.filter((e) => !jaTem.has(e.id))];
    temMais.value = pagina.length >= TAMANHO_PAGINA;
  } catch (e) {
    mostrar({ tom: 'perigo', mensagem: (e as Error).message });
  } finally {
    carregandoMais.value = false;
  }
}

onMounted(recomecar);
watch(filtro, recomecar, { deep: true });

// ---------------------------------------------------------------------------
// APRESENTAÇÃO
// ---------------------------------------------------------------------------
/** Cada evento já traduzido para texto (título + mudanças). */
const eventosLegiveis = computed(() => eventos.value.map((e) => ({ e, texto: descreverEvento(e) })));

/** Agrupa por dia ("16 de novembro de 2026") mantendo a ordem (mais recente primeiro). */
const porDia = computed(() => {
  const grupos: { dia: string; itens: typeof eventosLegiveis.value }[] = [];
  for (const item of eventosLegiveis.value) {
    const dia = new Date(item.e.realizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.itens.push(item);
    else grupos.push({ dia, itens: [item] });
  }
  return grupos;
});

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Id do risco (para o link) a partir do código RADAR; sem risco na carteira, sem link. */
const riscoIdPorCodigo = (codigo: string | null) =>
  codigo ? riscosStore.riscos.find((r) => r.codigoRadar === codigo)?.id : undefined;

const ICONE_OPERACAO = {
  INSERT: 'fa-solid fa-plus',
  UPDATE: 'fa-solid fa-pen',
  DELETE: 'fa-solid fa-trash',
} as const;

// ---------------------------------------------------------------------------
// EXPORTAR CSV (os eventos já carregados)
// ---------------------------------------------------------------------------
function exportar(): void {
  const csv = eventosAuditoriaParaCsv(eventos.value);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `radar-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  mostrar({ tom: 'sucesso', mensagem: `${eventos.value.length} eventos exportados em CSV.` });
}
</script>

<template>
  <div class="auditoria">
    <section class="filtros" aria-label="Filtros da auditoria">
      <FormField rotulo="Tabela" v-slot="{ attrs }">
        <select v-bind="attrs" v-model="filtro.tabela">
          <option value="">Todas</option>
          <option v-for="(rotulo, tabela) in ROTULOS_TABELA" :key="tabela" :value="tabela">{{ rotulo }}</option>
        </select>
      </FormField>
      <FormField rotulo="De" v-slot="{ attrs }">
        <input v-bind="attrs" v-model="filtro.de" type="date" />
      </FormField>
      <FormField rotulo="Até" v-slot="{ attrs }">
        <input v-bind="attrs" v-model="filtro.ate" type="date" />
      </FormField>
    </section>

    <div class="barra">
      <p class="barra__contagem" aria-live="polite">
        <template v-if="estadoLista === 'pronto'">
          <strong>{{ eventos.length }}</strong> {{ eventos.length === 1 ? 'evento' : 'eventos' }}{{ temMais ? ' carregados (há mais)' : '' }}{{ temFiltro ? ' com os filtros aplicados' : '' }}
        </template>
      </p>
      <span class="barra__acoes">
        <BrButton v-if="temFiltro" variant="secondary" @click="filtro = { tabela: '', de: '', ate: '' }">Limpar filtros</BrButton>
        <BrButton variant="secondary" icon="fa-solid fa-file-csv" :disabled="!eventos.length" @click="exportar">Exportar CSV</BrButton>
      </span>
    </div>

    <EstadoCarregamento :estado="estadoLista" :erro="erroLista" formato="tabela" @tentar-de-novo="recomecar">
      <section v-if="eventos.length" class="cartao" aria-label="Linha do tempo">
        <div v-for="g in porDia" :key="g.dia" class="dia">
          <h2 class="dia__titulo">{{ g.dia }}</h2>
          <ol class="linha-tempo">
            <li v-for="{ e, texto } in g.itens" :key="e.id" class="evento">
              <span class="evento__icone" aria-hidden="true"><i :class="ICONE_OPERACAO[e.operacao]"></i></span>
              <div class="evento__corpo">
                <p class="evento__linha">
                  <time :datetime="e.realizadoEm" class="evento__hora">{{ hora(e.realizadoEm) }}</time>
                  <span>{{ texto.titulo }}</span>
                  <RouterLink
                    v-if="riscoIdPorCodigo(e.codigoRadar)"
                    :to="{ name: 'ficha-bowtie-detalhe', params: { id: riscoIdPorCodigo(e.codigoRadar) } }"
                    class="codigo"
                  >{{ e.codigoRadar }}</RouterLink>
                </p>
                <p class="evento__quem">
                  {{ quemFez(e) }}<template v-if="e.quemPapel"> · {{ ROTULOS_PAPEL[e.quemPapel] ?? e.quemPapel }}</template>
                  · {{ ROTULOS_TABELA[e.tabela] ?? e.tabela }}
                </p>
                <p v-if="texto.recalculadoPelaDar" class="evento__nota">
                  Recalculado automaticamente pelo RADAR depois de uma mudança na DAR; ninguém editou o risco.
                </p>
                <ul v-if="texto.mudancas.length" class="evento__mudancas">
                  <li v-for="m in texto.mudancas" :key="m.campo">
                    <strong>{{ m.campo }}:</strong> {{ m.antes }} → {{ m.depois }}
                  </li>
                </ul>
              </div>
            </li>
          </ol>
        </div>
        <div v-if="temMais" class="mais">
          <BrButton variant="secondary" :disabled="carregandoMais" @click="carregarMais">Carregar mais</BrButton>
        </div>
      </section>
      <EmptyState
        v-else
        class="cartao"
        titulo="Nenhum evento encontrado"
        :descricao="temFiltro ? 'Nenhum evento atende aos filtros. Tente ampliar o período.' : 'Ainda não há alterações registradas.'"
        icone="fa-solid fa-clock-rotate-left"
      />
    </EstadoCarregamento>
  </div>
</template>

<style scoped>
.auditoria {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.filtros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: var(--esp-3) var(--esp-4);
}

.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2);
}

.barra__contagem {
  margin: 0;
  font-size: var(--texto-sm);
}

.barra__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.cartao {
  padding: var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.dia + .dia {
  margin-top: var(--esp-5);
}

.dia__titulo {
  margin: 0 0 var(--esp-3);
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.linha-tempo {
  margin: 0;
  padding: 0;
  list-style: none;
}

.evento {
  position: relative;
  display: flex;
  gap: var(--esp-3);
  padding-bottom: var(--esp-4);
}

/* Linha vertical ligando os eventos do dia. */
.evento:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 36px;
  bottom: 0;
  left: 17px;
  width: 2px;
  background: var(--borda);
}

.evento__icone {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--cor-info-suave);
  color: var(--cor-info);
}

.evento__corpo {
  min-width: 0;
}

.evento__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--esp-1) var(--esp-2);
  margin: 0;
  font-weight: var(--peso-semi);
}

.evento__hora {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
  font-weight: var(--peso-regular);
}

.codigo {
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
}

.evento__quem {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin: var(--esp-1) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.evento__nota {
  margin: var(--esp-2) 0 0;
  padding: var(--esp-2) var(--esp-3);
  border-left: 3px solid var(--borda-forte);
  background: var(--superficie-container);
  font-size: var(--texto-sm);
}

.evento__mudancas {
  margin: var(--esp-2) 0 0;
  padding-left: var(--esp-4);
  font-size: var(--texto-sm);
  overflow-wrap: anywhere;
}

.mais {
  display: flex;
  justify-content: center;
  margin-top: var(--esp-4);
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-4);
  }
}
</style>
