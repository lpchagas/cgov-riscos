<script setup lang="ts">
/**
 * ============================================================================
 * AVISO GLOBAL DE "TELA DESATUALIZADA" (`AvisoAtualizacao.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando uma ação (ex.: validar um risco) é gravada, mas a releitura que
 * atualiza a tela falha, a store NÃO diz que a ação falhou (a pessoa não deve
 * repetir o que já foi feito). Ela guarda `avisoAtualizacao`. Este componente,
 * colocado uma vez no App, mostra o aviso em qualquer tela, com o botão
 * "Atualizar" que relê a carteira (`carregar()`). Quando a releitura dá certo,
 * a store apaga o aviso e este componente some sozinho.
 */
import { useRiscosStore } from '../../stores/riscosStore';
import BrMessage from '../govbr/BrMessage.vue';
import BrButton from '../govbr/BrButton.vue';

const store = useRiscosStore();
</script>

<template>
  <BrMessage v-if="store.avisoAtualizacao" state="warning">
    {{ store.avisoAtualizacao.message }}
    <div class="aviso-atualizacao__acao">
      <BrButton variant="secondary" @click="store.carregar()">Atualizar</BrButton>
    </div>
  </BrMessage>
</template>

<style scoped>
.aviso-atualizacao__acao {
  margin-top: var(--esp-3);
}
</style>
