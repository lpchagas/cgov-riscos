<script setup lang="ts">
/**
 * ============================================================================
 * BARRA "MOSTRE A CONTA" (`MemoriaCalculoBar.vue`) — §5 DA SKILL CGOV
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Na Metodologia RADAR nenhuma pontuação pode parecer uma "caixa-preta".
 * Esta barra mostra, passo a passo, como o sistema chegou ao Risco Residual:
 *
 *   P e I  →  Inerente (Quadro 7)  ×  Fator (Quadro 6)  =  Residual (Quadro 8)  →  DAR
 *
 * IMPORTANTE: este componente SÓ EXIBE. Todos os números chegam prontos da
 * ficha, gravados pela calculadora oficial (`calculadoraRiscoRadar.ts`):
 *   - o Inerente é LIDO da tabela do Quadro 7 (nunca P × I);
 *   - sem evidência comprovada o fator fica limitado a Fraco (0,9) — a "trava";
 *   - o Residual é classificado sem arredondar (10,2 é Alto; 8,4 é Médio).
 *
 * Desenho de referência: componente "MemoriaCalculoBar" da biblioteca Figma
 * RADAR (variantes status=critico | dentro | pendente).
 */
import { computed } from 'vue';
import type {
  ApetiteDeclarado,
  ClasseRisco,
  FatorAvaliacaoControle,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  StatusCriticidadeDAR,
} from '../../types/radar.types';
import { formatarNivel } from '../../utils/rotulosInterface';
import RiskBadge from '../ui/RiskBadge.vue';

const props = defineProps<{
  probabilidade: NivelProbabilidade;
  impacto: NivelImpacto;
  nivelInerente: number;
  classificacaoInerente: ClasseRisco;
  eficaciaControle: NivelEficaciaControle;
  fatorControle: FatorAvaliacaoControle;
  possuiEvidencia: boolean;
  nivelResidual: number;
  classificacaoResidual: ClasseRisco;
  apetiteCategoria?: ApetiteDeclarado;
  statusCritico: StatusCriticidadeDAR;
  travaAcionada?: boolean;
}>();

/** Texto, ícone e cor do último passo (a situação frente à DAR). */
const CRITICIDADE: Record<StatusCriticidadeDAR, { texto: string; icone: string; classe: string }> = {
  sim: { texto: 'Risco Crítico (fora do apetite da DAR)', icone: 'fa-solid fa-triangle-exclamation', classe: 'perigo' },
  nao: { texto: 'Dentro do apetite da DAR', icone: 'fa-solid fa-circle-check', classe: 'sucesso' },
  pendente_dar: { texto: 'Apetite não definido na DAR', icone: 'fa-solid fa-clock', classe: 'aviso' },
};
const fim = computed(() => CRITICIDADE[props.statusCritico]);
</script>

<template>
  <section class="memoria" aria-label="Memória de cálculo do risco">
    <p class="memoria__titulo">
      <i class="fa-solid fa-calculator" aria-hidden="true"></i>
      Memória de cálculo
    </p>

    <!-- Lista ordenada: o leitor de tela anuncia "1 de 5, 2 de 5…" — a ordem é a conta. -->
    <ol class="memoria__conta">
      <li class="memoria__passo">
        <strong>P = {{ probabilidade }}</strong> · <strong>I = {{ impacto }}</strong>
      </li>
      <li class="memoria__passo">
        <span class="memoria__op" aria-hidden="true">→</span>
        <span class="memoria__caixa">
          Inerente (Quadro 7): <strong class="radar-numero">{{ formatarNivel(nivelInerente) }}</strong>
          <RiskBadge :classe="classificacaoInerente" tamanho="sm" />
        </span>
      </li>
      <li class="memoria__passo">
        <span class="memoria__op" aria-label="vezes">×</span>
        <span class="memoria__caixa">
          Fator (Quadro 6): <strong class="radar-numero">{{ formatarNivel(fatorControle) }}</strong>
          — {{ eficaciaControle }}, {{ possuiEvidencia ? 'com evidência' : 'sem evidência' }}
        </span>
      </li>
      <li class="memoria__passo">
        <span class="memoria__op" aria-label="igual a">=</span>
        <span class="memoria__caixa">
          Residual (Quadro 8): <strong class="radar-numero">{{ formatarNivel(nivelResidual) }}</strong>
          <RiskBadge :classe="classificacaoResidual" tamanho="sm" />
        </span>
      </li>
      <li class="memoria__passo">
        <span class="memoria__op" aria-hidden="true">→</span>
        <span class="memoria__fim" :class="`memoria__fim--${fim.classe}`">
          <i :class="fim.icone" aria-hidden="true"></i>
          {{ fim.texto }}
        </span>
      </li>
    </ol>

    <!-- Trava de evidência (Quadro 6): explica por que o fator não passou de Fraco -->
    <p v-if="travaAcionada" class="memoria__trava" role="note">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      <span>
        <strong>Trava de evidência:</strong> sem evidência comprovada de que o controle
        funciona, o fator fica limitado a <strong>Fraco (0,9)</strong>.
      </span>
    </p>
  </section>
</template>

<style scoped>
.memoria {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin-bottom: var(--esp-2);
  padding: var(--esp-3) var(--esp-4);
  background: var(--superficie-container);
  border-left: 4px solid var(--cor-primaria);
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
}

.memoria__titulo {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  font-weight: var(--peso-forte);
  color: var(--cor-marca-escura);
}

:root[data-theme='contraste'] .memoria__titulo {
  color: var(--texto);
}

.memoria__conta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.memoria__passo {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
}

.memoria__passo:first-child,
.memoria__caixa {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-1) var(--esp-2);
  padding: var(--esp-1) var(--esp-3);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-sm);
}

.memoria__op {
  font-weight: var(--peso-forte);
  font-size: var(--texto-md);
  color: var(--cor-primaria);
}

.memoria__fim {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
  padding: var(--esp-1) var(--esp-3);
  border-radius: var(--raio-sm);
  font-weight: var(--peso-forte);
}

.memoria__fim--perigo { background: var(--cor-perigo-suave); color: var(--cor-perigo); }
.memoria__fim--sucesso { background: var(--cor-sucesso-suave); color: var(--cor-sucesso); }
.memoria__fim--aviso { background: var(--cor-aviso-suave); color: var(--cor-aviso); }

.memoria__trava {
  display: flex;
  gap: var(--esp-2);
  margin: 0;
  padding: var(--esp-2) var(--esp-3);
  background: var(--cor-aviso-suave);
  color: var(--cor-aviso);
  border: 1px solid var(--risco-medio-borda);
  border-radius: var(--raio-sm);
}
</style>
