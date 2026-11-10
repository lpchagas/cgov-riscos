<script setup lang="ts">
/**
 * ============================================================================
 * CAIXA DE VALIDAÇÃO EM 1 CLIQUE (`CaixaValidacaoUmCliqueView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Para não sobrecarregar Coordenadores-Gerais (2º degrau) e Diretores (3º degrau),
 * esta tela reúne apenas os cartões executivos pendentes de deliberação, com a
 * barra "Mostre a Conta" e os botões de Aprovação em 1 Clique!
 */
import { ref } from 'vue';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import BrCard from '../components/govbr/BrCard.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrBadge from '../components/govbr/BrBadge.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const motivoDevolucaoPorId = ref<Record<string, string>>({});
</script>

<template>
  <div>
    <!-- 2º DEGRAU: FILA DAS COORDENAÇÕES-GERAIS SUPERVISORAS DE MACROPROCESSOS -->
    <BrCard
      titulo="2º Degrau: Validação em 1 Clique — Coordenações-Gerais Supervisoras de Macroprocessos"
      subtitulo="Ao aprovar em 1 clique, Riscos Críticos sobem automaticamente para homologação da Diretoria (3º Degrau)"
      destaque-cor="#1351b4"
    >
      <div v-if="riscosStore.filaValidacaoCg.length === 0" class="p-3 text-muted">
        Nenhum risco pendente de validação pelas Coordenações-Gerais no momento.
      </div>

      <div
        v-for="risco in riscosStore.filaValidacaoCg"
        :key="risco.id"
        class="p-3 mb-3 rounded border bg-white"
      >
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <strong style="color: #1351b4;">[{{ risco.codigoRadar }}]</strong>
            <strong class="ml-1">{{ risco.nomeObjetoCache }}</strong>
          </div>
          <BrBadge :classe-risco="risco.classificacaoResidual" />
        </div>

        <p class="mb-2">{{ risco.descricaoPadrao }}</p>

        <MemoriaCalculoBar
          :probabilidade="risco.probabilidade"
          :impacto="risco.impacto"
          :nivel-inerente="risco.nivelInerente"
          :classificacao-inerente="risco.classificacaoInerente"
          :eficacia-controle="risco.nivelEficaciaControle"
          :fator-controle="risco.fatorControle"
          :possui-evidencia="risco.possuiEvidenciaControle"
          :nivel-residual="risco.nivelResidual"
          :classificacao-residual="risco.classificacaoResidual"
          :status-critico="risco.statusCritico"
        />

        <div class="d-flex gap-2 align-items-center flex-wrap mt-2">
          <BrButton
            variant="success"
            icon="fas fa-check"
            :disabled="!authStore.podeAprovarCg"
            @click="riscosStore.aprovarEmUmCliqueCg(risco.id)"
          >
            Aprovar em 1 Clique (Coordenação-Geral)
          </BrButton>

          <input
            v-model="motivoDevolucaoPorId[risco.id]"
            type="text"
            placeholder="Despacho rápido se desejar devolver para ajuste..."
            style="padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; flex: 1;"
          />
          <BrButton
            variant="danger"
            icon="fas fa-undo"
            :disabled="!authStore.podeAprovarCg"
            @click="
              riscosStore.solicitarAjusteRapido(
                risco.id,
                motivoDevolucaoPorId[risco.id] || 'Solicitado ajuste na descrição dos controles.'
              )
            "
          >
            Solicitar Ajuste Rápido
          </BrButton>
        </div>
      </div>
    </BrCard>

    <!-- 3º DEGRAU: FILA DA DIRETORIA (RISCOS CRÍTICOS) -->
    <BrCard
      titulo="3º Degrau: Homologação Executiva em 1 Clique — Diretoria (Riscos Críticos)"
      subtitulo="Homologação final dos Riscos Críticos para consolidação no Plano de Gestão de Riscos do ICMBio"
      destaque-cor="#071d41"
    >
      <div v-if="riscosStore.filaHomologacaoDiretoria.length === 0" class="p-3 text-muted">
        Nenhum Risco Crítico aguardando homologação da Diretoria no momento.
      </div>

      <div
        v-for="risco in riscosStore.filaHomologacaoDiretoria"
        :key="risco.id"
        class="p-3 mb-3 rounded border bg-white"
      >
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <strong style="color: #071d41;">[{{ risco.codigoRadar }}]</strong>
            <strong class="ml-1">{{ risco.nomeObjetoCache }}</strong>
          </div>
          <BrBadge :classe-risco="risco.classificacaoResidual" />
        </div>

        <p class="mb-2">{{ risco.descricaoPadrao }}</p>

        <MemoriaCalculoBar
          :probabilidade="risco.probabilidade"
          :impacto="risco.impacto"
          :nivel-inerente="risco.nivelInerente"
          :classificacao-inerente="risco.classificacaoInerente"
          :eficacia-controle="risco.nivelEficaciaControle"
          :fator-controle="risco.fatorControle"
          :possui-evidencia="risco.possuiEvidenciaControle"
          :nivel-residual="risco.nivelResidual"
          :classificacao-residual="risco.classificacaoResidual"
          :status-critico="risco.statusCritico"
        />

        <div class="d-flex gap-2 align-items-center mt-2">
          <BrButton
            variant="primary"
            icon="fas fa-stamp"
            :disabled="!authStore.podeHomologarDiretoria"
            @click="riscosStore.homologarEmUmCliqueDiretoria(risco.id)"
          >
            Homologar em 1 Clique para o Plano de Gestão de Riscos (Diretoria)
          </BrButton>
        </div>
      </div>
    </BrCard>
  </div>
</template>
