<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE PASSOS / WIZARD (`div.br-step`) — @govbr-ds/core
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Este componente implementa o indicador visual de etapas do Padrão Digital de
 * Governo para conduzir o servidor da 1ª Linha nas 4 fases de preenchimento da
 * Ficha de Risco (Contexto/Bow Tie -> Categoria/Integra+ -> Quadros 6,7,8 -> 5W2H/KRI).
 */
export interface PassoStep {
  numero: number;
  titulo: string;
  subtitulo?: string;
}

defineProps<{
  passos: PassoStep[];
  passoAtivo: number;
}>();

const emit = defineEmits<{
  (e: 'selecionar-passo', numero: number): void;
}>();
</script>

<template>
  <nav class="br-step mb-3" aria-label="Etapas do Assistente">
    <div class="d-flex flex-wrap gap-2 w-100">
      <button
        v-for="passo in passos"
        :key="passo.numero"
        type="button"
        class="flex-fill p-2 rounded text-left d-flex align-items-center gap-2"
        :style="{
          backgroundColor:
            passoAtivo === passo.numero
              ? '#dbe8fb'
              : passoAtivo > passo.numero
                ? '#e3f5e1'
                : '#ffffff',
          border:
            passoAtivo === passo.numero
              ? '2px solid #1351b4'
              : passoAtivo > passo.numero
                ? '1px solid #168821'
                : '1px solid #d1d5db',
          cursor: 'pointer',
        }"
        @click="emit('selecionar-passo', passo.numero)"
      >
        <span
          class="d-inline-flex align-items-center justify-content-center rounded-circle font-weight-bold"
          :style="{
            width: '28px',
            height: '28px',
            flexShrink: 0,
            backgroundColor:
              passoAtivo === passo.numero
                ? '#1351b4'
                : passoAtivo > passo.numero
                  ? '#168821'
                  : '#6b7280',
            color: '#ffffff',
            fontSize: '0.82rem',
          }"
        >
          <i v-if="passoAtivo > passo.numero" class="fas fa-check" aria-hidden="true"></i>
          <template v-else>{{ passo.numero }}</template>
        </span>
        <div>
          <div class="text-down-01 font-weight-bold" style="color: #071d41; line-height: 1.2;">
            {{ passo.titulo }}
          </div>
          <div v-if="passo.subtitulo" class="text-down-02 text-muted" style="line-height: 1.2;">
            {{ passo.subtitulo }}
          </div>
        </div>
      </button>
    </div>
  </nav>
</template>
