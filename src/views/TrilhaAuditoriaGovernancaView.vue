<script setup lang="ts">
/**
 * ============================================================================
 * TRILHA DE AUDITORIA E RASTREABILIDADE DE GOVERNANÇA (`TrilhaAuditoriaGovernancaView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Consolida em ordem cronológica reversa todos os eventos de governança do
 * Sistema RADAR (submissões da 1ª Linha, aprovações em 1 clique da Coordenação-Geral,
 * homologações executivas da Diretoria, devoluções para ajuste e reaberturas
 * automáticas por mudança de nota), garantindo transparência para a CGOV, CTGRIC,
 * CIG e Auditoria Interna.
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import BrCard from '../components/govbr/BrCard.vue';
import BrBadge from '../components/govbr/BrBadge.vue';

const riscosStore = useRiscosStore();
const filtroEtapa = ref<string>('todas');

const eventosFiltrados = computed(() => {
  if (filtroEtapa.value === 'todas') {
    return riscosStore.trilhaAuditoriaGlobal;
  }
  return riscosStore.trilhaAuditoriaGlobal.filter((e) => e.etapa === filtroEtapa.value);
});

function rotuloEtapa(etapa: string): string {
  switch (etapa) {
    case 'submissao_1a_linha':
      return '1º Degrau: Submissão da 1ª Linha';
    case 'validacao_cg':
      return '2º Degrau: Validação 1 Clique (CG)';
    case 'homologacao_diretoria':
      return '3º Degrau: Homologação Executiva (Diretoria)';
    case 'devolucao_ajuste':
      return 'Devolução para Ajuste Rápido';
    case 'reabertura_nota':
      return 'Reabertura Automática por Mudança de Nota';
    default:
      return etapa;
  }
}
</script>

<template>
  <div>
    <BrCard
      titulo="Trilha de Auditoria e Rastreabilidade das 3 Linhas de Governança"
      subtitulo="Registro cronológico de deliberações em 1 clique, despachos e alterações de pontuação no Plano de Gestão de Riscos"
      destaque-cor="#071d41"
    >
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div class="text-down-01">
          Total de eventos auditados: <strong>{{ eventosFiltrados.length }}</strong>
        </div>

        <div class="d-flex align-items-center gap-2">
          <label for="filtro-etapa-auditoria" class="text-down-01 font-weight-bold mb-0">
            Filtrar por Etapa:
          </label>
          <select
            id="filtro-etapa-auditoria"
            v-model="filtroEtapa"
            class="p-2 rounded border"
          >
            <option value="todas">Todas as etapas de governança</option>
            <option value="submissao_1a_linha">1º Degrau: Submissão 1ª Linha</option>
            <option value="validacao_cg">2º Degrau: Validação CG (1 Clique)</option>
            <option value="homologacao_diretoria">3º Degrau: Homologação Diretoria</option>
            <option value="devolucao_ajuste">Devolução para Ajuste Rápido</option>
            <option value="reabertura_nota">Reabertura por Mudança de Nota</option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-bordered" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #071d41; color: #ffffff;">
              <th class="p-2 text-left">Data / Hora</th>
              <th class="p-2 text-left">Ficha RADAR</th>
              <th class="p-2 text-left">Etapa de Governança</th>
              <th class="p-2 text-left">Responsável pelo Ato</th>
              <th class="p-2 text-left">Despacho / Memória Registrada</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ev in eventosFiltrados"
              :key="ev.id"
              style="border-bottom: 1px solid #e5e7eb;"
            >
              <td class="p-2 text-down-01" style="white-space: nowrap;">
                {{ ev.criadoEm.slice(0, 16).replace('T', ' ') }}
              </td>
              <td class="p-2">
                <RouterLink
                  :to="`/riscos/${ev.riscoId}`"
                  class="font-weight-bold text-decoration-none d-block"
                  style="color: #1351b4;"
                >
                  [{{ ev.codigoRadar }}]
                </RouterLink>
                <BrBadge
                  :classe-risco="ev.classificacaoResidual"
                  :texto="`${ev.nivelResidual} (${ev.classificacaoResidual})`"
                />
              </td>
              <td class="p-2 text-down-01 font-weight-bold" style="color: #071d41;">
                {{ rotuloEtapa(ev.etapa) }}
              </td>
              <td class="p-2 text-down-01">
                {{ ev.usuarioNome }}
              </td>
              <td class="p-2 text-down-01">
                {{ ev.despachoTexto }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BrCard>
  </div>
</template>
