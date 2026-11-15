<script setup lang="ts">
/**
 * ============================================================================
 * ABAS (`BrTabs.vue`) — padrão WAI-ARIA "tabs"
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Abas separam conteúdos longos de uma mesma página (ex.: Indicadores | Plano
 * de ação). Para funcionar no teclado e no leitor de tela, seguimos o padrão
 * oficial do W3C:
 *   - a fileira de abas é um `role="tablist"`;
 *   - cada aba é um botão `role="tab"` com `aria-selected`;
 *   - só a aba ativa entra no Tab; as SETAS ← → trocam de aba (Home/End vão às pontas);
 *   - o conteúdo fica num `role="tabpanel"` ligado à aba por `aria-labelledby`.
 *
 * O conteúdo de cada aba vem pelo slot padrão, que recebe a aba ativa:
 *
 *   <BrTabs v-model:aba-ativa="aba" :abas="[{ id: 'kris', rotulo: 'Indicadores', contador: 3 }]" rotulo="Monitoramento">
 *     <template #default="{ aba }">
 *       <ListaKris v-if="aba === 'kris'" /> …
 *     </template>
 *   </BrTabs>
 */
import { ref, useId } from 'vue';

export interface ItemAba {
  id: string;
  rotulo: string;
  icone?: string;
  contador?: number;
}

const props = defineProps<{
  abas: ItemAba[];
  abaAtiva: string;
  /** Nome do conjunto de abas para o leitor de tela. */
  rotulo?: string;
}>();

const emit = defineEmits<{ (e: 'update:abaAtiva', id: string): void }>();

const base = `abas-${useId()}`;
const idAba = (id: string) => `${base}-aba-${id}`;
const idPainel = `${base}-painel`;
const botoes = ref<HTMLButtonElement[]>([]);

function ativar(indice: number): void {
  const aba = props.abas[indice];
  emit('update:abaAtiva', aba.id);
  botoes.value[indice]?.focus();
}

function aoTeclar(evento: KeyboardEvent, indice: number): void {
  const total = props.abas.length;
  const destino: Record<string, number> = {
    ArrowRight: (indice + 1) % total,
    ArrowLeft: (indice - 1 + total) % total,
    Home: 0,
    End: total - 1,
  };
  if (evento.key in destino) {
    evento.preventDefault();
    ativar(destino[evento.key]);
  }
}
</script>

<template>
  <div class="abas">
    <div class="abas__lista" role="tablist" :aria-label="rotulo">
      <button
        v-for="(aba, indice) in abas"
        :id="idAba(aba.id)"
        :key="aba.id"
        ref="botoes"
        type="button"
        role="tab"
        class="abas__aba"
        :aria-selected="aba.id === abaAtiva"
        :aria-controls="idPainel"
        :tabindex="aba.id === abaAtiva ? 0 : -1"
        @click="ativar(indice)"
        @keydown="aoTeclar($event, indice)"
      >
        <i v-if="aba.icone" :class="aba.icone" aria-hidden="true"></i>
        <span>{{ aba.rotulo }}</span>
        <span v-if="aba.contador !== undefined" class="abas__contador">{{ aba.contador }}</span>
      </button>
    </div>
    <div :id="idPainel" class="abas__painel" role="tabpanel" :aria-labelledby="idAba(abaAtiva)" tabindex="0">
      <slot :aba="abaAtiva" />
    </div>
  </div>
</template>

<style scoped>
.abas {
  min-width: 0;
}

.abas__lista {
  display: flex;
  gap: var(--esp-1);
  overflow-x: auto;
  border-bottom: 1px solid var(--borda);
}

.abas__aba {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--esp-2);
  min-height: 48px;
  padding: 0 var(--esp-4);
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--texto-secundario);
  font: inherit;
  font-weight: var(--peso-semi);
  cursor: pointer;
}

.abas__aba:hover {
  color: var(--texto);
  background: var(--superficie-alta);
}

.abas__aba[aria-selected='true'] {
  border-bottom-color: var(--cor-primaria);
  color: var(--cor-primaria);
}

.abas__contador {
  min-width: 1.5rem;
  padding: 0 var(--esp-2);
  border-radius: var(--raio-pilula);
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  text-align: center;
}

.abas__aba[aria-selected='true'] .abas__contador {
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
}

.abas__painel {
  padding-top: var(--esp-4);
}

/* Celular: abas dividem a largura; ícones somem (o texto já basta). */
@media (max-width: 639.98px) {
  .abas__aba {
    flex: 1 0 auto;
    justify-content: center;
    padding: 0 var(--esp-3);
  }
  .abas__aba > i {
    display: none;
  }
}

.abas__painel:focus-visible {
  outline: none;
  box-shadow: var(--anel-foco);
  border-radius: var(--raio-sm);
}
</style>
