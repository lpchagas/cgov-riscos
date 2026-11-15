<script setup lang="ts">
/**
 * ============================================================================
 * AUDITORIA (`TrilhaAuditoriaGovernancaView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Tudo o que aconteceu no fluxo de governança, do mais recente para o mais
 * antigo: envios da 1ª Linha, validações da Coordenação-Geral, homologações da
 * Diretoria, devoluções e reaberturas. Serve à CGOV, ao CTGRIC, ao CIG e à
 * Auditoria Interna.
 *
 * O que mudou na reformulação:
 *   - LINHA DO TEMPO agrupada por dia (antes: tabela larga que estourava no celular);
 *   - filtros por tipo de evento, por quem agiu (papel) e por período;
 *   - "Exportar CSV" baixa exatamente o que está filtrado (`utils/auditoriaCsv.ts`).
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import { descreverEventoFluxo } from '../utils/painelResumo';
import { ROTULOS_PAPEL, eventosParaCsv } from '../utils/auditoriaCsv';
import FormField from '../components/ui/FormField.vue';
import RiskBadge from '../components/ui/RiskBadge.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import BrButton from '../components/govbr/BrButton.vue';

const riscosStore = useRiscosStore();
const { mostrar } = useToast();

// ---------------------------------------------------------------------------
// FILTROS
// ---------------------------------------------------------------------------
const TIPOS = [
  { valor: 'submissao_1a_linha', rotulo: 'Envio pela unidade' },
  { valor: 'validacao_cg', rotulo: 'Validação da Coordenação-Geral' },
  { valor: 'homologacao_diretoria', rotulo: 'Homologação da Diretoria' },
  { valor: 'devolucao_ajuste', rotulo: 'Devolução para ajuste' },
  { valor: 'reabertura_nota', rotulo: 'Reabertura por mudança na avaliação' },
];
const filtro = ref({ tipo: '', papel: '', de: '', ate: '' });
const temFiltro = computed(() => Object.values(filtro.value).some(Boolean));

const eventos = computed(() =>
  riscosStore.trilhaAuditoriaGlobal.filter((e) => {
    const dia = e.criadoEm.slice(0, 10);
    if (filtro.value.tipo && e.etapa !== filtro.value.tipo) return false;
    if (filtro.value.papel && e.usuarioPapel !== filtro.value.papel) return false;
    if (filtro.value.de && dia < filtro.value.de) return false;
    if (filtro.value.ate && dia > filtro.value.ate) return false;
    return true;
  })
);

/** Agrupa os eventos por dia ("09/11/2026") mantendo a ordem (mais recente primeiro). */
const porDia = computed(() => {
  const grupos: { dia: string; eventos: typeof eventos.value }[] = [];
  for (const e of eventos.value) {
    const dia = new Date(e.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.eventos.push(e);
    else grupos.push({ dia, eventos: [e] });
  }
  return grupos;
});

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Ícone por tipo de evento (sempre acompanhado do texto). */
const ICONE: Record<string, string> = {
  submissao_1a_linha: 'fa-solid fa-paper-plane',
  validacao_cg: 'fa-solid fa-check',
  homologacao_diretoria: 'fa-solid fa-stamp',
  devolucao_ajuste: 'fa-solid fa-rotate-left',
  reabertura_nota: 'fa-solid fa-arrows-rotate',
};

// ---------------------------------------------------------------------------
// EXPORTAR CSV (o que está filtrado)
// ---------------------------------------------------------------------------
function exportar(): void {
  const csv = eventosParaCsv(eventos.value);
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
      <FormField rotulo="Tipo de evento" v-slot="{ attrs }">
        <select v-bind="attrs" v-model="filtro.tipo">
          <option value="">Todos</option>
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.rotulo }}</option>
        </select>
      </FormField>
      <FormField rotulo="Quem agiu" v-slot="{ attrs }">
        <select v-bind="attrs" v-model="filtro.papel">
          <option value="">Todos</option>
          <option v-for="(rotulo, papel) in ROTULOS_PAPEL" :key="papel" :value="papel">{{ rotulo }}</option>
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
        <strong>{{ eventos.length }}</strong> {{ eventos.length === 1 ? 'evento' : 'eventos' }}{{ temFiltro ? ' com os filtros aplicados' : '' }}
      </p>
      <span class="barra__acoes">
        <BrButton v-if="temFiltro" variant="secondary" @click="filtro = { tipo: '', papel: '', de: '', ate: '' }">Limpar filtros</BrButton>
        <BrButton variant="secondary" icon="fa-solid fa-file-csv" :disabled="!eventos.length" @click="exportar">Exportar CSV</BrButton>
      </span>
    </div>

    <section v-if="eventos.length" class="cartao" aria-label="Linha do tempo">
      <div v-for="g in porDia" :key="g.dia" class="dia">
        <h2 class="dia__titulo">{{ g.dia }}</h2>
        <ol class="linha-tempo">
          <li v-for="e in g.eventos" :key="e.id" class="evento">
            <span class="evento__icone" aria-hidden="true"><i :class="ICONE[e.etapa] ?? 'fa-solid fa-circle'"></i></span>
            <div class="evento__corpo">
              <p class="evento__linha">
                <time :datetime="e.criadoEm" class="evento__hora">{{ hora(e.criadoEm) }}</time>
                <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: e.riscoId } }" class="codigo">{{ e.codigoRadar }}</RouterLink>
                <span>{{ descreverEventoFluxo(e) }}</span>
              </p>
              <p class="evento__quem">
                {{ e.usuarioNome }} · {{ ROTULOS_PAPEL[e.usuarioPapel] ?? e.usuarioPapel }}
                <RiskBadge :classe="e.classificacaoResidual" :valor="e.nivelResidual" tamanho="sm" />
              </p>
              <p v-if="e.despachoTexto" class="evento__despacho">"{{ e.despachoTexto }}"</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
    <EmptyState
      v-else
      class="cartao"
      titulo="Nenhum evento encontrado"
      :descricao="temFiltro ? 'Nenhum evento atende aos filtros. Tente ampliar o período.' : 'Ainda não há tramitação registrada.'"
      icone="fa-solid fa-clock-rotate-left"
    />
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

.evento__despacho {
  margin: var(--esp-2) 0 0;
  padding: var(--esp-2) var(--esp-3);
  border-left: 3px solid var(--borda-forte);
  background: var(--superficie-container);
  font-size: var(--texto-sm);
  font-style: italic;
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-4);
  }
}
</style>
