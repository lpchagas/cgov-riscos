<script setup lang="ts">
/**
 * ============================================================================
 * TELA "ACESSO NÃO LIBERADO" (`/acesso-nao-liberado`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Aparece para quem conseguiu entrar (o e-mail é válido), mas ainda não pode
 * usar o RADAR. Há duas variantes:
 *  - `sem_perfil`: a CGOV ainda não cadastrou o perfil da pessoa;
 *  - `inativo`: o acesso foi suspenso pela CGOV.
 * Nos dois casos a orientação é procurar a CGOV, e há o botão "Sair".
 *
 * No modo demonstração ninguém está nessas situações; por isso a tela deixa
 * escolher a variante pelo endereço (`?exemplo=inativo`), útil para a varredura
 * de acessibilidade e para mostrar a tela.
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrButton from '../components/govbr/BrButton.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import { useAuthStore } from '../stores/authStore';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const suspenso = computed(() =>
  auth.modo === 'demonstracao' ? route.query.exemplo === 'inativo' : auth.situacao === 'inativo',
);

async function sair(): Promise<void> {
  await auth.sair();
  await router.push({ name: 'entrar' });
}
</script>

<template>
  <div class="bloqueio">
    <h1 class="bloqueio__titulo">Acesso não liberado</h1>

    <BrMessage state="warning" :titulo="suspenso ? 'Seu acesso está suspenso' : 'Sua conta ainda não tem acesso ao RADAR'">
      Procure a CGOV: <a href="mailto:planejamento@icmbio.gov.br">planejamento@icmbio.gov.br</a>
    </BrMessage>

    <BrButton variant="secondary" @click="sair">Sair</BrButton>
  </div>
</template>

<style scoped>
.bloqueio {
  max-width: 32rem;
  margin: var(--esp-6) auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-3);
}

.bloqueio__titulo {
  margin: 0 0 var(--esp-2);
  font-size: var(--titulo-lg);
}

.bloqueio :deep(.mensagem) {
  width: 100%;
}
</style>
