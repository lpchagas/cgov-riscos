<script setup lang="ts">
/**
 * ============================================================================
 * CARTÃO DE INDICADOR (`StatCard.vue`) — "KPI"
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Mostra UM número importante. A hierarquia é: NÚMERO grande primeiro, rótulo
 * curto depois. (Na interface antiga era o contrário: título enorme em caixa
 * alta e número pequeno — achado 2.2 do diagnóstico.)
 *
 * Se receber `para`, o cartão inteiro vira um link para a lista já filtrada
 * (ex.: clicar em "Críticos" abre /riscos?critico=sim).
 *
 * Exemplo:
 *   <StatCard rotulo="Críticos" :valor="3" tom="perigo"
 *             descricao="Fora do apetite da DAR"
 *             :para="{ name: 'riscos-lista', query: { critico: 'sim' } }" />
 */
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import type { TomVisual } from '../../utils/rotulosInterface';

const props = withDefaults(
  defineProps<{
    rotulo: string;
    valor: number | string;
    descricao?: string;
    icone?: string;
    tom?: TomVisual;
    para?: RouteLocationRaw;
    /** No celular, mostra só rótulo e número (descrição e "Ver lista" só p/ leitor de tela). */
    compacto?: boolean;
  }>(),
  { tom: 'neutro', compacto: false }
);

// Usa <RouterLink> quando há destino; senão, um <div> comum.
const componente = computed(() => (props.para ? RouterLink : 'div'));
</script>

<template>
  <component
    :is="componente"
    :to="para"
    class="stat-card"
    :class="[`stat-card--${tom}`, { 'stat-card--link': para, 'stat-card--compacto': compacto }]"
  >
    <div class="stat-card__topo">
      <span class="stat-card__rotulo">{{ rotulo }}</span>
      <i v-if="icone" :class="icone" class="stat-card__icone" aria-hidden="true"></i>
    </div>
    <span class="stat-card__valor radar-numero">{{ valor }}</span>
    <span v-if="descricao" class="stat-card__descricao">{{ descricao }}</span>
    <span v-if="para" class="stat-card__ver">
      Ver lista <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
    </span>
  </component>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  padding: var(--esp-4) var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
  color: var(--texto);
  text-decoration: none;
}

.stat-card--link {
  transition: box-shadow var(--duracao-media) var(--curva-padrao),
    border-color var(--duracao-media) var(--curva-padrao);
}

.stat-card--link:hover {
  border-color: var(--cor-primaria);
  box-shadow: var(--elevacao-2);
}

.stat-card__topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card__rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

.stat-card__icone {
  color: var(--texto-secundario);
}

.stat-card__valor {
  font-size: var(--display);
  font-weight: var(--peso-forte);
  line-height: 1.1;
}

/* A cor de destaque vai só no número; o resto fica neutro. */
.stat-card--info .stat-card__valor { color: var(--cor-primaria); }
.stat-card--sucesso .stat-card__valor { color: var(--cor-sucesso); }
.stat-card--aviso .stat-card__valor { color: var(--cor-aviso); }
.stat-card--perigo .stat-card__valor { color: var(--cor-perigo); }

.stat-card__descricao {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.stat-card__ver {
  margin-top: var(--esp-2);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
}

/* ---------------------------------------------------------------------------
   MODO COMPACTO (só no celular, < 640px). No computador nada muda.
   A descrição e o "Ver lista" saem da tela, mas continuam no DOM, lidos pelo
   leitor de tela (mesma técnica da classe global .radar-so-leitor, sem
   duplicar o texto). O cartão inteiro tem no mínimo 44px de altura (alvo de toque).
   --------------------------------------------------------------------------- */
@media (max-width: 639.98px) {
  .stat-card--compacto {
    padding: var(--esp-3);
    min-height: 44px;
  }

  .stat-card--compacto .stat-card__descricao,
  .stat-card--compacto .stat-card__ver {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
</style>
