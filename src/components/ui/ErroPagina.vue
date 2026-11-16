<script setup lang="ts">
/**
 * ============================================================================
 * ERRO DE PÁGINA INTEIRA (`ErroPagina.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Segue o "Template V3 — Erro" do gov.br: ilustração decorativa (à esquerda no
 * computador, no topo no celular), título grande, texto e as ações
 * "Tentar de novo" e "Ir para a Página Principal". Sem caixa de busca e sem
 * "Envie um feedback" (decisão do projeto).
 *
 * É usada quando a página inteira não consegue mostrar nada, por exemplo
 * quando a carteira de riscos não carrega. O <h1> é o próprio título, por isso
 * a tela NÃO deve desenhar o PageHeader junto (a página teria dois <h1>).
 *
 * A ilustração é um SVG simples, pintado só com tokens de cor (zero cor fixa) e
 * escondido de leitores de tela (`aria-hidden`), pois é só enfeite.
 */
import { RouterLink } from 'vue-router';
import BrButton from '../govbr/BrButton.vue';

defineProps<{ titulo: string; texto: string }>();
defineEmits<{ (e: 'tentar-de-novo'): void }>();
</script>

<template>
  <section class="erro-pagina">
    <svg class="erro-pagina__ilustracao" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <circle class="forma-fundo" cx="80" cy="80" r="72" />
      <rect class="forma-janela" x="36" y="42" width="88" height="68" rx="8" />
      <rect class="forma-barra" x="36" y="42" width="88" height="16" rx="8" />
      <circle class="forma-alerta" cx="80" cy="90" r="14" />
      <rect class="forma-sinal" x="78" y="80" width="4" height="12" rx="2" />
      <circle class="forma-sinal" cx="80" cy="98" r="2.5" />
    </svg>

    <div class="erro-pagina__conteudo">
      <h1 class="erro-pagina__titulo">{{ titulo }}</h1>
      <p class="erro-pagina__texto">{{ texto }}</p>
      <div class="erro-pagina__acoes">
        <BrButton variant="primary" icon="fa-solid fa-rotate-right" @click="$emit('tentar-de-novo')">Tentar de novo</BrButton>
        <RouterLink to="/" class="erro-pagina__link">Ir para a Página Principal</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.erro-pagina {
  display: flex;
  flex-direction: column; /* celular: ilustração no topo */
  align-items: center;
  gap: var(--esp-6);
  padding: var(--esp-7) var(--esp-4);
}

.erro-pagina__ilustracao {
  width: 10rem;
  height: 10rem;
  flex: none;
}

.forma-fundo { fill: var(--cor-primaria-suave); }
.forma-janela { fill: var(--superficie); stroke: var(--borda); stroke-width: 2; }
.forma-barra { fill: var(--cor-primaria); }
.forma-alerta { fill: var(--cor-perigo-suave); stroke: var(--cor-perigo); stroke-width: 2; }
.forma-sinal { fill: var(--cor-perigo); }

.erro-pagina__conteudo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  max-width: 40rem;
  text-align: center;
}

.erro-pagina__titulo {
  margin: 0;
  font-size: var(--display);
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.erro-pagina__texto {
  margin: 0;
  color: var(--texto-secundario);
}

.erro-pagina__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--esp-4);
  margin-top: var(--esp-3);
}

.erro-pagina__link {
  color: var(--cor-primaria);
  font-weight: var(--peso-semi);
}

/* Computador: ilustração à esquerda, texto alinhado à esquerda. */
@media (min-width: 768px) {
  .erro-pagina {
    flex-direction: row;
    justify-content: center;
  }
  .erro-pagina__ilustracao { width: 14rem; height: 14rem; }
  .erro-pagina__conteudo { text-align: left; }
  .erro-pagina__acoes { justify-content: flex-start; }
}
</style>
