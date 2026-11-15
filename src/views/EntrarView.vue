<script setup lang="ts">
/**
 * ============================================================================
 * TELA "ENTRAR NO RADAR" (`/entrar`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * O RADAR não usa senha. A pessoa digita o e-mail e recebe um LINK de acesso
 * (válido por 1 hora). Por segurança, a resposta é SEMPRE a mesma, exista ou
 * não o e-mail: assim ninguém descobre quem tem conta no sistema.
 *
 * Casos tratados aqui:
 *  - e-mail vazio ou sem "@": erro no próprio campo, sem falar com o servidor;
 *  - 'enviado'    -> "Se o e-mail estiver cadastrado, você receberá um link...";
 *  - 'limite'     -> "Muitas tentativas. Aguarde um minuto...";
 *  - 'falha_rede' -> "Não foi possível enviar agora...";
 *  - ?motivo=link   -> o link venceu ou já foi usado (vindo de /entrar/retorno);
 *  - ?motivo=sessao -> a sessão terminou e não renovou;
 *  - modo demonstração (sem Supabase): não há login. O botão vira
 *    "Entrar no modo demonstração" e leva ao Painel.
 *
 * `?volta=/riscos` diz para onde ir depois do login (só endereços internos).
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrButton from '../components/govbr/BrButton.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import FormField from '../components/ui/FormField.vue';
import { voltaSegura } from '../router/guarda';
import { useAuthStore } from '../stores/authStore';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const erroEmail = ref('');
const enviando = ref(false);
/** Resultado do último envio (nulo = ainda não enviou). */
const resultado = ref<'enviado' | 'limite' | 'falha_rede' | null>(null);

const emDemonstracao = computed(() => auth.modo === 'demonstracao');
const motivo = computed(() => (typeof route.query.motivo === 'string' ? route.query.motivo : ''));

async function enviar(): Promise<void> {
  if (emDemonstracao.value) {
    await router.push({ name: 'painel-cgov' });
    return;
  }
  const valor = email.value.trim();
  if (!valor || !valor.includes('@')) {
    erroEmail.value = 'Informe um e-mail válido, com "@".';
    resultado.value = null;
    return;
  }
  erroEmail.value = '';
  enviando.value = true;
  try {
    resultado.value = await auth.enviarLink(valor, voltaSegura(route.query.volta));
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="entrar">
    <h1 class="entrar__titulo">Entrar no RADAR</h1>

    <BrMessage v-if="motivo === 'link'" state="warning">
      Este link expirou ou já foi usado. Peça um novo.
    </BrMessage>
    <BrMessage v-else-if="motivo === 'sessao'" state="info">Sua sessão terminou. Entre de novo.</BrMessage>

    <BrMessage v-if="emDemonstracao" state="info" titulo="Modo demonstração">
      Os dados são fictícios e não há login. O botão abaixo abre o sistema.
    </BrMessage>

    <form class="entrar__form" novalidate @submit.prevent="enviar">
      <FormField
        v-if="!emDemonstracao"
        rotulo="E-mail institucional"
        ajuda="Você receberá um link de acesso, sem senha."
        :erro="erroEmail"
        obrigatorio
        v-slot="{ attrs }"
      >
        <input v-bind="attrs" v-model="email" type="email" autocomplete="email" />
      </FormField>

      <BrButton type="submit" :disabled="enviando">
        {{ emDemonstracao ? 'Entrar no modo demonstração' : 'Enviar link de acesso' }}
      </BrButton>
    </form>

    <BrMessage v-if="resultado === 'enviado'" state="success">
      Se o e-mail estiver cadastrado, você receberá um link em instantes. Ele vale por 1 hora.
    </BrMessage>
    <BrMessage v-else-if="resultado === 'limite'" state="warning">
      Muitas tentativas. Aguarde um minuto e tente de novo.
    </BrMessage>
    <BrMessage v-else-if="resultado === 'falha_rede'" state="danger">
      Não foi possível enviar agora. Confira sua conexão e tente de novo.
    </BrMessage>
  </div>
</template>

<style scoped>
.entrar {
  max-width: 32rem;
  margin: var(--esp-6) auto;
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.entrar__titulo {
  margin: 0 0 var(--esp-2);
  font-size: var(--titulo-lg);
}

.entrar__form {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
  align-items: flex-start;
}

.entrar__form :deep(.campo) {
  width: 100%;
}
</style>
