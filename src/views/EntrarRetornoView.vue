<script setup lang="ts">
/**
 * ============================================================================
 * TELA "CONFERINDO SEU LINK" (`/entrar/retorno`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * É para cá que o link do e-mail leva, com `?token_hash=...&type=email` no
 * endereço. A tela pede à store que confira o link e, depois:
 *  - link bom   -> vai para a tela que a pessoa pediu antes de entrar (guardada
 *    no localStorage por até 1 hora, então funciona mesmo se o e-mail abrir em outra
 *    aba). Se não há nada guardado (ou venceu, ou o e-mail foi aberto em OUTRO
 *    navegador), vai ao Painel;
 *  - link ruim (usado ou vencido) -> volta a /entrar com o aviso de link expirado.
 *
 * A "volta" só vale se for um endereço interno (começa com "/" e não com "//").
 */
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { lerEApagarVolta } from '../utils/voltaAposLogin';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

onMounted(async () => {
  const resultado = await auth.concluirRetorno(texto(route.query.token_hash), texto(route.query.type));
  if (resultado !== 'ok') {
    await router.replace({ name: 'entrar', query: { motivo: 'link' } });
    return;
  }
  // Lê (e apaga) a volta guardada; vencida, insegura ou ausente vira o Painel.
  await router.replace(lerEApagarVolta());
});
</script>

<template>
  <div class="retorno" role="status">
    <h1 class="retorno__titulo">Conferindo seu link</h1>
    <p>Aguarde um instante, estamos abrindo o RADAR para você.</p>
  </div>
</template>

<style scoped>
.retorno {
  max-width: 32rem;
  margin: var(--esp-6) auto;
}

.retorno__titulo {
  margin: 0 0 var(--esp-2);
  font-size: var(--titulo-lg);
}
</style>
