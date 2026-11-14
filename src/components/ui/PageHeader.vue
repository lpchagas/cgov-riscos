<script setup lang="ts">
/**
 * ============================================================================
 * CABEÇALHO DE PÁGINA (`PageHeader.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Toda página do RADAR começa por aqui. Ele garante:
 *   - UM título principal `<h1>` por página (achado A6: nenhuma página tinha);
 *   - uma descrição curta, de uma linha, dizendo para que serve a página;
 *   - o botão "ⓘ Fundamento", que mostra a base normativa SÓ quando o usuário
 *     quer ver. Assim o título fica curto ("Aprovações") e a referência
 *     ("Fluxo de 3 degraus — Política SEI 024241420") continua acessível;
 *   - um espaço à direita para as ações principais da página (slot `acoes`).
 *
 * Exemplo:
 *   <PageHeader titulo="Riscos" descricao="Todos os riscos mapeados"
 *               fundamento="Seção 4.2 da Metodologia (SEI 024421455)">
 *     <template #acoes><BrButton>Novo risco</BrButton></template>
 *   </PageHeader>
 */
import { ref, useId } from 'vue';

defineProps<{
  titulo: string;
  descricao?: string;
  fundamento?: string;
}>();

const fundamentoAberto = ref(false);
const idFundamento = `fundamento-${useId()}`;
</script>

<template>
  <header class="cabecalho-pagina">
    <div class="cabecalho-pagina__texto">
      <div class="cabecalho-pagina__linha-titulo">
        <h1 class="cabecalho-pagina__titulo">{{ titulo }}</h1>
        <button
          v-if="fundamento"
          type="button"
          class="cabecalho-pagina__fundamento-botao"
          :aria-expanded="fundamentoAberto"
          :aria-controls="idFundamento"
          @click="fundamentoAberto = !fundamentoAberto"
        >
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          Fundamento
        </button>
      </div>
      <p v-if="descricao" class="cabecalho-pagina__descricao">{{ descricao }}</p>
      <p
        v-if="fundamento"
        v-show="fundamentoAberto"
        :id="idFundamento"
        class="cabecalho-pagina__fundamento"
      >
        <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
        {{ fundamento }}
      </p>
    </div>
    <div v-if="$slots.acoes" class="cabecalho-pagina__acoes">
      <slot name="acoes" />
    </div>
  </header>
</template>

<style scoped>
.cabecalho-pagina {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-4);
  margin-bottom: var(--esp-5);
}

.cabecalho-pagina__texto {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 0;
  flex: 1 1 28rem;
}

.cabecalho-pagina__linha-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-3);
}

.cabecalho-pagina__titulo {
  font-size: var(--titulo-lg);
  font-weight: var(--peso-forte);
  color: var(--texto);
}

.cabecalho-pagina__descricao {
  margin: 0;
  font-size: var(--texto-md); /* o gov.br DS aumenta <p>; fixamos 16 px */
  color: var(--texto-secundario);
}

.cabecalho-pagina__fundamento-botao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  min-height: 2rem;
  padding: 0 var(--esp-3);
  border: 1px solid var(--borda);
  border-radius: var(--raio-pilula);
  background: var(--superficie);
  color: var(--texto-secundario);
  font: inherit;
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  cursor: pointer;
}

.cabecalho-pagina__fundamento-botao:hover,
.cabecalho-pagina__fundamento-botao[aria-expanded='true'] {
  border-color: var(--cor-primaria);
  color: var(--cor-primaria);
}

.cabecalho-pagina__fundamento {
  margin: var(--esp-1) 0 0;
  padding: var(--esp-2) var(--esp-3);
  border-left: 3px solid var(--cor-primaria);
  border-radius: 0 var(--raio-sm) var(--raio-sm) 0;
  background: var(--cor-info-suave);
  font-size: var(--texto-sm);
  color: var(--texto);
}

.cabecalho-pagina__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}
</style>
