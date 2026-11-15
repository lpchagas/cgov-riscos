<script setup lang="ts">
/**
 * ============================================================================
 * DIAGRAMA BOW TIE — "GRAVATA-BORBOLETA" (`BowTieDiagram.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O método Bow Tie (Seção 4.2.1 da Metodologia) lê o risco da esquerda para a
 * direita, como uma gravata-borboleta com o EVENTO no nó do meio:
 *
 *   Causas → Controles (prevenção) → [ EVENTO ] → Resposta (5W2H) → Consequências
 *
 * No computador: 5 colunas com setas entre elas.
 * No celular: os 5 blocos empilhados, com setas para baixo.
 *
 * Para o leitor de tela é uma LISTA ORDENADA (1 a 5) — a ordem é o significado.
 * A cor do bloco do EVENTO acompanha o nível residual (com o nome do nível
 * escrito, nunca só a cor).
 */
import type { FichaRisco } from '../../types/radar.types';
import { SUFIXO_CSS_CLASSE_RISCO, formatarNivel } from '../../utils/rotulosInterface';
import { dataCurta } from '../../utils/painelResumo';
import RiskBadge from '../ui/RiskBadge.vue';

defineProps<{ risco: FichaRisco }>();

const ROTULO_SITUACAO: Record<string, string> = {
  nao_iniciada: 'não iniciada',
  em_andamento: 'em andamento',
  concluida: 'concluída',
  atrasada: 'atrasada',
};
</script>

<template>
  <ol class="bowtie" aria-label="Diagrama Bow Tie do risco">
    <!-- 1. CAUSAS -->
    <li class="bowtie__bloco bowtie__bloco--causas">
      <h3 class="bowtie__titulo"><span class="bowtie__numero">1</span> Causas</h3>
      <p class="bowtie__texto">{{ risco.causas }}</p>
      <p class="bowtie__rodape">Probabilidade <strong>{{ risco.probabilidade }}</strong></p>
    </li>

    <!-- 2. CONTROLES (barreira preventiva) -->
    <li class="bowtie__bloco bowtie__bloco--controles">
      <h3 class="bowtie__titulo"><span class="bowtie__numero">2</span> Controles</h3>
      <ul v-if="risco.controlesExistentes.length" class="bowtie__lista">
        <li v-for="c in risco.controlesExistentes" :key="c.id">{{ c.descricaoControle }}</li>
      </ul>
      <p v-else class="bowtie__texto bowtie__texto--vazio">Nenhum controle formal.</p>
      <p class="bowtie__rodape">
        {{ risco.nivelEficaciaControle }} · fator <strong>{{ formatarNivel(risco.fatorControle) }}</strong>
        <template v-if="!risco.possuiEvidenciaControle"> · sem evidência</template>
      </p>
    </li>

    <!-- 3. EVENTO (o nó da gravata) -->
    <li class="bowtie__bloco bowtie__evento" :class="`bowtie__evento--${SUFIXO_CSS_CLASSE_RISCO[risco.classificacaoResidual]}`">
      <h3 class="bowtie__titulo"><span class="bowtie__numero">3</span> Evento de risco</h3>
      <p class="bowtie__texto bowtie__texto--evento">{{ risco.eventoRisco }}</p>
      <p class="bowtie__rodape">
        <RiskBadge :classe="risco.classificacaoResidual" :valor="risco.nivelResidual" prefixo="Residual" tamanho="sm" />
      </p>
    </li>

    <!-- 4. RESPOSTA (5W2H) -->
    <li class="bowtie__bloco bowtie__bloco--resposta">
      <h3 class="bowtie__titulo"><span class="bowtie__numero">4</span> Resposta · {{ risco.estrategiaPrincipal }}</h3>
      <ul v-if="risco.respostasTratamento.length" class="bowtie__lista">
        <li v-for="t in risco.respostasTratamento" :key="t.id">
          {{ t.acaoOQue }}
          <span class="bowtie__detalhe">até {{ dataCurta(t.prazoQuando) }} · {{ ROTULO_SITUACAO[t.statusExecucao] }}</span>
        </li>
      </ul>
      <p v-else class="bowtie__texto bowtie__texto--vazio">Plano de ação em elaboração.</p>
      <p class="bowtie__rodape">{{ risco.kris.length }} {{ risco.kris.length === 1 ? 'indicador' : 'indicadores' }}</p>
    </li>

    <!-- 5. CONSEQUÊNCIAS -->
    <li class="bowtie__bloco bowtie__bloco--consequencias">
      <h3 class="bowtie__titulo"><span class="bowtie__numero">5</span> Consequências</h3>
      <p class="bowtie__texto">{{ risco.consequencias }}</p>
      <p class="bowtie__texto"><strong>Objetivo afetado:</strong> {{ risco.objetivoAfetado }}</p>
      <p class="bowtie__rodape">Impacto <strong>{{ risco.impacto }}</strong></p>
    </li>
  </ol>
</template>

<style scoped>
/* 5 colunas; o evento (meio) é um pouco mais largo. */
.bowtie {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
  gap: var(--esp-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bowtie__bloco {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  min-width: 0;
  padding: var(--esp-4);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-top: 4px solid var(--borda-forte);
  border-radius: var(--raio-md);
}

/* Seta entre os blocos (só decoração: a ordem já está na lista ordenada). */
.bowtie__bloco:not(:last-child)::after {
  content: '→';
  position: absolute;
  top: 50%;
  right: calc(-1 * var(--esp-5));
  width: var(--esp-5);
  transform: translateY(-50%);
  color: var(--texto-secundario);
  font-weight: var(--peso-forte);
  text-align: center;
}

.bowtie__bloco--causas { border-top-color: var(--borda-forte); }
.bowtie__bloco--controles { border-top-color: var(--cor-info); }
.bowtie__bloco--resposta { border-top-color: var(--cor-sucesso); }
.bowtie__bloco--consequencias { border-top-color: var(--cor-aviso); }

/* O nó da gravata: fundo e borda do nível residual (Quadro 8). */
.bowtie__evento { box-shadow: var(--elevacao-2); }
.bowtie__evento--baixo { background: var(--risco-baixo-fundo); border-color: var(--risco-baixo-borda); border-top-color: var(--risco-baixo-texto); }
.bowtie__evento--medio { background: var(--risco-medio-fundo); border-color: var(--risco-medio-borda); border-top-color: var(--risco-medio-texto); }
.bowtie__evento--alto { background: var(--risco-alto-fundo); border-color: var(--risco-alto-borda); border-top-color: var(--risco-alto-texto); }
.bowtie__evento--extremo { background: var(--risco-extremo-fundo); border-color: var(--risco-extremo-borda); border-top-color: var(--risco-extremo-texto); }

.bowtie__titulo {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
}

.bowtie__numero {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--superficie-inversa);
  color: var(--texto-inverso);
  font-size: var(--texto-xs);
}

.bowtie__texto {
  margin: 0;
  font-size: var(--texto-sm);
  line-height: 1.5;
}

.bowtie__texto--evento {
  font-weight: var(--peso-semi);
}

.bowtie__texto--vazio {
  color: var(--texto-secundario);
}

.bowtie__lista {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding-left: var(--esp-4);
  font-size: var(--texto-sm);
  line-height: 1.45;
}

.bowtie__detalhe {
  display: block;
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.bowtie__rodape {
  margin: auto 0 0;
  padding-top: var(--esp-2);
  border-top: 1px dashed var(--borda);
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* Telas médias e celular: blocos empilhados, setas para baixo. */
@media (max-width: 1180px) {
  .bowtie {
    grid-template-columns: minmax(0, 1fr);
  }
  .bowtie__bloco:not(:last-child)::after {
    content: '↓';
    top: auto;
    right: auto;
    bottom: calc(-1 * var(--esp-5));
    left: 50%;
    width: auto;
    height: var(--esp-5);
    transform: translateX(-50%);
    line-height: var(--esp-5);
  }
}
</style>
