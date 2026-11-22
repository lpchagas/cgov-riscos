<script setup lang="ts">
/**
 * ============================================================================
 * MATRIZ DE CALOR ASSIMÉTRICA 5x5 (`MatrizCalorAssimetrica.vue`) — QUADRO 7
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta matriz desenha as 25 células EXATAS do Quadro 7 da Metodologia RADAR.
 * O valor de cada célula é LIDO da tabela `MATRIZ_QUADRO_7[impacto][probabilidade]`
 * — nunca calculado como P × I. Por isso o Impacto pesa mais:
 *   P=1, I=5 → 15 (Alto)      P=5, I=1 → 11 (Alto)
 *
 * Linhas = Impacto (de 5, no topo, até 1). Colunas = Probabilidade (de 1 a 5).
 *
 * ACESSIBILIDADE (novidade da reformulação):
 * - Cada célula é um <button> de verdade: funciona com Tab + Enter/Espaço.
 * - `aria-pressed` diz ao leitor de tela qual célula está selecionada.
 * - O `aria-label` lê a célula inteira: "Probabilidade 3 (Provável), impacto 5
 *   (Muito alto): nota 22, Extremo, 1 risco".
 * - A cor nunca é a única pista: a nota e a quantidade aparecem escritas.
 *
 * Exemplo de uso:
 *   <MatrizCalorAssimetrica :riscos="lista" :celula-ativa="sel"
 *     @selecionar-celula="({ p, i }) => alternar(p, i)" />
 */
import { computed } from 'vue';
import type { FichaRisco, NivelImpacto, NivelProbabilidade } from '../../types/radar.types';
import { MATRIZ_QUADRO_7, classificarNivelRisco } from '../../utils/calculadoraRiscoRadar';
import { SUFIXO_CSS_CLASSE_RISCO } from '../../utils/rotulosInterface';
import {
  ESCALA_IMPACTO_QUADRO_5,
  ESCALA_PROBABILIDADE_QUADRO_4,
  nomeDoNivel,
} from '../../utils/escalasProbabilidadeImpacto';
import { chaveCelula, contarRiscosPorCelula } from '../../utils/painelResumo';

const props = defineProps<{
  riscos: FichaRisco[];
  celulaAtiva?: { p: NivelProbabilidade; i: NivelImpacto } | null;
}>();

const emit = defineEmits<{
  (e: 'selecionar-celula', payload: { p: NivelProbabilidade; i: NivelImpacto }): void;
}>();

const IMPACTOS_DO_TOPO_PARA_BAIXO: NivelImpacto[] = [5, 4, 3, 2, 1];
const PROBABILIDADES: NivelProbabilidade[] = [1, 2, 3, 4, 5];

// Nomes literais dos Quadros 4 e 5, lidos do módulo único das escalas.
// Ex.: nomePorProbabilidade(1) -> "Raro"; nomePorImpacto(5) -> "Muito alto".
const nomePorProbabilidade = (p: NivelProbabilidade) => nomeDoNivel(ESCALA_PROBABILIDADE_QUADRO_4, p);
const nomePorImpacto = (i: NivelImpacto) => nomeDoNivel(ESCALA_IMPACTO_QUADRO_5, i);

// Conta uma única vez por mudança na lista (e não 25 vezes por desenho).
const contagem = computed(() => contarRiscosPorCelula(props.riscos));

/** Tudo o que uma célula precisa para ser desenhada. */
function celula(p: NivelProbabilidade, i: NivelImpacto) {
  const nota = MATRIZ_QUADRO_7[i][p]; // ← leitura da tabela, nunca P × I
  const classe = classificarNivelRisco(nota);
  const quantidade = contagem.value[chaveCelula(p, i)] ?? 0;
  const selecionada = props.celulaAtiva?.p === p && props.celulaAtiva?.i === i;
  return {
    nota,
    quantidade,
    selecionada,
    classeCss: `matriz__celula--${SUFIXO_CSS_CLASSE_RISCO[classe]}`,
    rotulo:
      `Probabilidade ${p} (${nomePorProbabilidade(p)}), impacto ${i} (${nomePorImpacto(i)}): ` +
      `nota ${nota}, ${classe}, ${quantidade} ${quantidade === 1 ? 'risco' : 'riscos'}`,
  };
}
</script>

<template>
  <div class="matriz">
    <div class="matriz__grade" role="group" aria-label="Matriz 5 por 5: impacto nas linhas, probabilidade nas colunas">
      <span class="matriz__eixo-y" aria-hidden="true">Impacto</span>

      <template v-for="i in IMPACTOS_DO_TOPO_PARA_BAIXO" :key="`linha-${i}`">
        <span class="matriz__rotulo-linha" aria-hidden="true">
          <strong>{{ i }}</strong>
          <span class="matriz__nome-escala">{{ nomePorImpacto(i) }}</span>
        </span>
        <button
          v-for="p in PROBABILIDADES"
          :key="`${p}-${i}`"
          type="button"
          class="matriz__celula"
          :class="[celula(p, i).classeCss, { 'matriz__celula--selecionada': celula(p, i).selecionada }]"
          :aria-pressed="celula(p, i).selecionada"
          :aria-label="celula(p, i).rotulo"
          @click="emit('selecionar-celula', { p, i })"
        >
          <span class="matriz__nota radar-numero">{{ celula(p, i).nota }}</span>
          <span v-if="celula(p, i).quantidade" class="matriz__quantidade" aria-hidden="true">
            {{ celula(p, i).quantidade }}
          </span>
        </button>
      </template>

      <!-- Última linha: rótulos das colunas (Probabilidade) -->
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span v-for="p in PROBABILIDADES" :key="`coluna-${p}`" class="matriz__rotulo-coluna" aria-hidden="true">
        <strong>{{ p }}</strong>
        <span class="matriz__nome-escala">{{ nomePorProbabilidade(p) }}</span>
      </span>
    </div>
    <p class="matriz__eixo-x" aria-hidden="true">Probabilidade</p>
  </div>
</template>

<style scoped>
/* Contêiner: pode encolher dentro de grades (sem estourar a largura do cartão). */
.matriz {
  min-width: 0;
}

/*
 * Grade: [eixo "Impacto"] [rótulo da linha] [5 células].
 * As células encolhem no celular, mas nunca abaixo do alvo mínimo de toque.
 */
.matriz__grade {
  display: grid;
  grid-template-columns: auto auto repeat(5, minmax(var(--alvo-minimo), 1fr));
  gap: var(--esp-1);
  align-items: stretch;
}

.matriz__eixo-y {
  grid-row: 1 / span 5;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  align-self: center;
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--texto-secundario);
}

.matriz__rotulo-linha {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: var(--esp-2);
  text-align: right;
  font-size: var(--texto-sm);
  line-height: 1.2;
}

.matriz__rotulo-coluna {
  /* Deixa "Praticamente certo" quebrar dentro da coluna em vez de estourá-la. */
  min-width: 0;
  overflow-wrap: anywhere;
  padding-top: var(--esp-1);
  text-align: center;
  font-size: var(--texto-sm);
  line-height: 1.2;
}

.matriz__nome-escala {
  display: block;
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.matriz__eixo-x {
  margin: var(--esp-1) 0 0;
  text-align: center;
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--texto-secundario);
}

/* --- Células ------------------------------------------------------------ */
.matriz__celula {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 56px;
  padding: var(--esp-1);
  border: 1px solid transparent;
  border-radius: var(--raio-md);
  font: inherit;
  cursor: pointer;
  transition: transform var(--duracao-rapida) var(--curva-padrao),
    box-shadow var(--duracao-rapida) var(--curva-padrao);
}

.matriz__celula:hover {
  box-shadow: var(--elevacao-2);
}

/* Cores dos níveis (Quadro 8) — sempre por token, nunca hex aqui. */
.matriz__celula--baixo { background: var(--risco-baixo-fundo); color: var(--risco-baixo-texto); border-color: var(--risco-baixo-borda); }
.matriz__celula--medio { background: var(--risco-medio-fundo); color: var(--risco-medio-texto); border-color: var(--risco-medio-borda); }
.matriz__celula--alto { background: var(--risco-alto-fundo); color: var(--risco-alto-texto); border-color: var(--risco-alto-borda); }
.matriz__celula--extremo { background: var(--risco-extremo-fundo); color: var(--risco-extremo-texto); border-color: var(--risco-extremo-borda); }

/* Selecionada: contorno grosso na cor do texto (não depende só da cor do fundo). */
.matriz__celula--selecionada {
  outline: 3px solid var(--texto);
  outline-offset: 1px;
}

.matriz__nota {
  font-size: var(--texto-lg);
  font-weight: var(--peso-forte);
}

/* Bolinha com a quantidade de riscos na célula. */
.matriz__quantidade {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: var(--raio-pilula);
  background: var(--superficie-inversa);
  color: var(--texto-inverso);
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  line-height: 20px;
  text-align: center;
}

/* Celular: esconde os nomes das escalas para caber; ficam só os números. */
@media (max-width: 575px) {
  .matriz__rotulo-linha .matriz__nome-escala,
  .matriz__rotulo-coluna .matriz__nome-escala {
    display: none;
  }
  .matriz__celula {
    min-height: 48px;
  }
  .matriz__nota {
    font-size: var(--texto-md);
  }
}
</style>
