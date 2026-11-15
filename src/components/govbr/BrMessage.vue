<script setup lang="ts">
/**
 * ============================================================================
 * MENSAGEM DE PÁGINA (`BrMessage.vue`) — padrão "message" do gov.br DS
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Aviso que FICA na página (ex.: "O CIG ainda não deliberou a DAR").
 * Para confirmar uma ação que a pessoa acabou de fazer, use o Toast
 * (`useToast().mostrar(...)`), que some sozinho.
 *
 * Acessibilidade:
 *   - 'danger' e 'warning' usam role="alert" (lido na hora pelo leitor de tela);
 *   - 'info' e 'success' usam role="status" (lido sem interromper);
 *   - o estado é comunicado por ÍCONE + TÍTULO, nunca só pela cor.
 *
 * Exemplo:
 *   <BrMessage state="warning" titulo="DAR pendente">A categoria Legal aguarda o CIG.</BrMessage>
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    state?: 'info' | 'success' | 'warning' | 'danger';
    titulo?: string;
  }>(),
  { state: 'info', titulo: '' }
);

const ICONES = {
  info: 'fa-solid fa-circle-info',
  success: 'fa-solid fa-circle-check',
  warning: 'fa-solid fa-triangle-exclamation',
  danger: 'fa-solid fa-circle-exclamation',
} as const;

const papel = computed(() => (props.state === 'danger' || props.state === 'warning' ? 'alert' : 'status'));
</script>

<template>
  <div class="mensagem" :class="`mensagem--${state}`" :role="papel">
    <i :class="ICONES[state]" class="mensagem__icone" aria-hidden="true"></i>
    <div class="mensagem__conteudo">
      <strong v-if="titulo" class="mensagem__titulo">{{ titulo }}</strong>
      <div class="mensagem__corpo"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.mensagem {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-3);
  margin-bottom: var(--esp-4);
  padding: var(--esp-3) var(--esp-4);
  border-left: 4px solid;
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
}

.mensagem__icone {
  margin-top: 3px;
}

.mensagem__conteudo {
  flex: 1;
  min-width: 0;
}

.mensagem__corpo {
  line-height: 1.5;
}

.mensagem__titulo {
  display: block;
  margin-bottom: var(--esp-1);
}

.mensagem--info { background: var(--cor-info-suave); border-color: var(--cor-info); color: var(--texto); }
.mensagem--info .mensagem__icone { color: var(--cor-info); }
.mensagem--success { background: var(--cor-sucesso-suave); border-color: var(--cor-sucesso); color: var(--texto); }
.mensagem--success .mensagem__icone { color: var(--cor-sucesso); }
.mensagem--warning { background: var(--cor-aviso-suave); border-color: var(--cor-aviso); color: var(--texto); }
.mensagem--warning .mensagem__icone { color: var(--cor-aviso); }
.mensagem--danger { background: var(--cor-perigo-suave); border-color: var(--cor-perigo); color: var(--texto); }
.mensagem--danger .mensagem__icone { color: var(--cor-perigo); }
</style>
