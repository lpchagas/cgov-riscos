<script setup lang="ts">
/**
 * ============================================================================
 * BARRA VISUAL "MOSTRE A CONTA" (`MemoriaCalculoBar.vue`) — §5 DA SKILL CGOV
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Na Metodologia RADAR do ICMBio, nenhuma pontuação pode parecer uma "caixa-preta".
 * Este componente mostra passo a passo para o gestor, para o Coordenador-Geral
 * e para o Diretor como o sistema chegou ao Risco Residual e se ele é Crítico
 * frente à Declaração de Apetite a Riscos (DAR).
 */
import type {
  ApetiteDeclarado,
  ClasseRisco,
  FatorAvaliacaoControle,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  StatusCriticidadeDAR,
} from '../../types/radar.types';
import BrBadge from '../govbr/BrBadge.vue';

defineProps<{
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
</script>

<template>
  <div
    class="p-3 rounded mb-2"
    style="background-color: #f1f5f9; border-left: 4px solid #1351b4;"
  >
    <div class="text-down-01 font-weight-bold mb-2" style="color: #071d41;">
      <i class="fas fa-calculator mr-1"></i>
      Memória de Cálculo Auditável (Metodologia RADAR — Quadros 6, 7, 8 e DAR):
    </div>

    <div class="d-flex align-items-center flex-wrap gap-2 text-down-01">
      <span class="px-2 py-1 rounded bg-white border">
        <strong>P = {{ probabilidade }}</strong> &amp; <strong>I = {{ impacto }}</strong>
      </span>
      <span><i class="fas fa-arrow-right" style="color: #1351b4;"></i></span>

      <span class="px-2 py-1 rounded bg-white border">
        Inerente (Quadro 7): <strong>{{ nivelInerente }}</strong>
        <BrBadge :classe-risco="classificacaoInerente" class="ml-1" />
      </span>

      <span><i class="fas fa-times" style="color: #1351b4;"></i></span>

      <span class="px-2 py-1 rounded bg-white border">
        Fator (Quadro 6): <strong>{{ fatorControle }}</strong> ({{ eficaciaControle }} —
        {{ possuiEvidencia ? 'com evidência' : 'sem evidência' }})
      </span>

      <span><i class="fas fa-equals" style="color: #1351b4;"></i></span>

      <span class="px-2 py-1 rounded bg-white border">
        Residual (Quadro 8): <strong>{{ nivelResidual }}</strong>
        <BrBadge :classe-risco="classificacaoResidual" class="ml-1" />
      </span>

      <span><i class="fas fa-arrow-right" style="color: #1351b4;"></i></span>

      <span
        class="px-2 py-1 rounded font-weight-bold"
        :style="{
          // Tokens de `tokens.css` (contraste ≥ 6,5:1). Antes: #e52207 sobre #fde0db = 3,69:1.
          backgroundColor:
            statusCritico === 'sim'
              ? 'var(--cor-perigo-suave)'
              : statusCritico === 'pendente_dar'
              ? 'var(--cor-aviso-suave)'
              : 'var(--cor-sucesso-suave)',
          color:
            statusCritico === 'sim'
              ? 'var(--cor-perigo)'
              : statusCritico === 'pendente_dar'
              ? 'var(--cor-aviso)'
              : 'var(--cor-sucesso)',
        }"
      >
        <template v-if="statusCritico === 'sim'">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          RISCO CRÍTICO (Fora do Apetite da DAR)
        </template>
        <template v-else-if="statusCritico === 'pendente_dar'">
          <i class="fas fa-clock mr-1"></i>
          PENDENTE DE DAR (Aguarda deliberação do CIG)
        </template>
        <template v-else>
          <i class="fas fa-check-circle mr-1"></i>
          DENTRO DO APETITE DA DAR
        </template>
      </span>
    </div>

    <div
      v-if="travaAcionada"
      class="mt-2 p-2 rounded text-down-01"
      style="background-color: #fff5c2; color: #7a5c00; border: 1px solid #e6b800;"
    >
      <i class="fas fa-lock mr-1"></i>
      <strong>Trava de Evidência Acionada (Quadro 6):</strong> Como não há evidência documental comprovada de operação do controle, o fator foi limitado automaticamente a <strong>Fraco (0,9)</strong>.
    </div>
  </div>
</template>
