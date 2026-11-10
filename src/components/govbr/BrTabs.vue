<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE NAVEGAÇÃO EM ABAS (`div.br-tab`) — @govbr-ds/core
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Permite alternar entre subvisões de uma página (ex.: 2º Degrau CG vs 3º Degrau
 * Diretoria na Caixa de Validação em 1 Clique, ou KRIs vs Planos 5W2H na Sala de
 * Situação) exibindo contadores numéricos (`counter`).
 */
export interface ItemAba {
  id: string;
  rotulo: string;
  icone?: string;
  contador?: number;
}

defineProps<{
  abas: ItemAba[];
  abaAtiva: string;
}>();

const emit = defineEmits<{
  (e: 'update:abaAtiva', id: string): void;
}>();
</script>

<template>
  <div class="br-tab mb-3">
    <nav class="tab-nav" aria-label="Abas de visualização">
      <ul class="d-flex flex-wrap list-unstyled mb-0 gap-2" style="border-bottom: 2px solid #d1d5db;">
        <li
          v-for="aba in abas"
          :key="aba.id"
          class="tab-item"
        >
          <button
            type="button"
            class="px-3 py-2 font-weight-bold d-flex align-items-center gap-2"
            :style="{
              border: 'none',
              borderBottom: abaAtiva === aba.id ? '4px solid #1351b4' : '4px solid transparent',
              backgroundColor: abaAtiva === aba.id ? '#dbe8fb' : 'transparent',
              color: abaAtiva === aba.id ? '#1351b4' : '#333333',
              cursor: 'pointer',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px',
            }"
            @click="emit('update:abaAtiva', aba.id)"
          >
            <i v-if="aba.icone" :class="aba.icone" aria-hidden="true"></i>
            <span>{{ aba.rotulo }}</span>
            <span
              v-if="aba.contador !== undefined"
              class="px-2 py-0 rounded-pill text-down-02"
              :style="{
                backgroundColor: abaAtiva === aba.id ? '#1351b4' : '#e5e7eb',
                color: abaAtiva === aba.id ? '#ffffff' : '#071d41',
                fontWeight: 700,
              }"
            >
              {{ aba.contador }}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
