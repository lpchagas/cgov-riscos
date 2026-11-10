<script setup lang="ts">
/**
 * ============================================================================
 * MATRIZ DE CALOR ASSIMÉTRICA 5x5 (`MatrizCalorAssimetrica.vue`) — QUADRO 7
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta matriz desenha as 25 células exatas do Quadro 7 da Metodologia RADAR.
 * Repare que o Impacto (eixo vertical, de 5 até 1) pesa mais que a Probabilidade
 * (eixo horizontal, de 1 até 5). Cada célula mostra o valor normativo da célula
 * e quantos riscos da carteira estão naquela posição!
 */
import type { FichaRisco, NivelImpacto, NivelProbabilidade } from '../../types/radar.types';
import {
  MATRIZ_QUADRO_7,
  classificarNivelRisco,
} from '../../utils/calculadoraRiscoRadar';

const props = defineProps<{
  riscos: FichaRisco[];
}>();

const impactosDesc: NivelImpacto[] = [5, 4, 3, 2, 1];
const probabilidadesAsc: NivelProbabilidade[] = [1, 2, 3, 4, 5];

const rotulosImpacto: Record<NivelImpacto, string> = {
  5: '5 - Muito Alto',
  4: '4 - Alto',
  3: '3 - Médio',
  2: '2 - Baixo',
  1: '1 - Muito Baixo',
};

const rotulosProbabilidade: Record<NivelProbabilidade, string> = {
  1: '1 - Muito Baixa',
  2: '2 - Baixa',
  3: '3 - Média',
  4: '4 - Alta',
  5: '5 - Muito Alta',
};

function contarRiscosNaCelula(p: NivelProbabilidade, i: NivelImpacto): number {
  return props.riscos.filter((r) => r.probabilidade === p && r.impacto === i).length;
}

function estiloCelula(p: NivelProbabilidade, i: NivelImpacto): Record<string, string> {
  const valor = MATRIZ_QUADRO_7[i][p];
  const classe = classificarNivelRisco(valor);

  if (classe === 'Baixo') {
    return { backgroundColor: '#e3f5e1', color: '#168821', borderColor: '#a3d9a5' };
  }
  if (classe === 'Médio') {
    return { backgroundColor: '#fff5c2', color: '#7a5c00', borderColor: '#ffd966' };
  }
  if (classe === 'Alto') {
    return { backgroundColor: '#ffe2cc', color: '#b54708', borderColor: '#f4b183' };
  }
  return { backgroundColor: '#fde0db', color: '#c91c00', borderColor: '#f8a99f' };
}
</script>

<template>
  <div class="table-responsive">
    <table class="table table-bordered text-center mb-0" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #071d41; color: #fff;">
          <th class="p-2">Impacto \ Probabilidade</th>
          <th v-for="p in probabilidadesAsc" :key="p" class="p-2">
            {{ rotulosProbabilidade[p] }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in impactosDesc" :key="i">
          <th class="p-2 text-left" style="background-color: #f1f5f9; color: #071d41;">
            {{ rotulosImpacto[i] }}
          </th>
          <td
            v-for="p in probabilidadesAsc"
            :key="`${i}-${p}`"
            class="p-2"
            :style="{
              ...estiloCelula(p, i),
              border: '1px solid',
              minWidth: '95px',
            }"
          >
            <div class="font-weight-bold" style="font-size: 1.05rem;">
              Nota {{ MATRIZ_QUADRO_7[i][p] }}
            </div>
            <div class="text-down-02">
              {{ classificarNivelRisco(MATRIZ_QUADRO_7[i][p]) }}
            </div>
            <div
              v-if="contarRiscosNaCelula(p, i) > 0"
              class="mt-1 px-2 py-0 rounded-pill d-inline-block font-weight-bold"
              style="background-color: #071d41; color: #fff; font-size: 0.78rem;"
            >
              {{ contarRiscosNaCelula(p, i) }} risco(s)
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
