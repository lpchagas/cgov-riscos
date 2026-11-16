<script setup lang="ts">
/**
 * ============================================================================
 * ESTADO DE CARREGAMENTO DE UM BLOCO (`EstadoCarregamento.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Com a store assíncrona, todo bloco de tela (cartões, tabela, lista) vive em
 * um de três momentos. Este componente desenha os três, para a tela não repetir:
 *
 *   - 'carregando' → esqueleto cinza (`Skeleton`), anunciado como "Carregando…"
 *                    ao leitor de tela;
 *   - 'erro'       → mensagem vermelha com o texto do `ErroRadar` e o botão
 *                    "Tentar de novo" (emite `tentar-de-novo`);
 *   - 'pronto'     → o conteúdo de verdade (slot padrão).
 *
 * Exemplo de uso:
 *   <EstadoCarregamento :estado="store.estado" :erro="store.erro" formato="tabela"
 *                       @tentar-de-novo="store.tentarDeNovo()">
 *     <MinhaTabela />
 *   </EstadoCarregamento>
 *
 * `formato` só muda a forma do esqueleto: 'cartao' = bloco alto e curto;
 * 'tabela' = várias linhas finas.
 */
import { computed } from 'vue';
import Skeleton from './Skeleton.vue';
import BrMessage from '../govbr/BrMessage.vue';
import BrButton from '../govbr/BrButton.vue';
import type { ErroRadar } from '../../services/dados/errosBanco';

const props = withDefaults(
  defineProps<{
    estado: 'carregando' | 'erro' | 'pronto';
    erro?: ErroRadar | null;
    linhas?: number;
    formato?: 'cartao' | 'tabela';
  }>(),
  { erro: null, linhas: undefined, formato: 'cartao' }
);

defineEmits<{ (e: 'tentar-de-novo'): void }>();

/** Cartão: poucas linhas altas. Tabela: muitas linhas finas. */
const linhasEsqueleto = computed(() => props.linhas ?? (props.formato === 'tabela' ? 5 : 2));
const alturaEsqueleto = computed(() => (props.formato === 'tabela' ? '1.75rem' : '2.5rem'));
</script>

<template>
  <Skeleton v-if="estado === 'carregando'" :linhas="linhasEsqueleto" :altura="alturaEsqueleto" />

  <BrMessage v-else-if="estado === 'erro'" state="danger">
    {{ erro?.message ?? 'Não foi possível carregar esta parte da tela.' }}
    <div class="estado-erro__acao">
      <BrButton variant="secondary" @click="$emit('tentar-de-novo')">Tentar de novo</BrButton>
    </div>
  </BrMessage>

  <slot v-else />
</template>

<style scoped>
.estado-erro__acao {
  margin-top: var(--esp-3);
}
</style>
