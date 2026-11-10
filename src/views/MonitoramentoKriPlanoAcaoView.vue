<script setup lang="ts">
/**
 * ============================================================================
 * SALA DE SITUAÇÃO DE KRIs E PLANOS DE AÇÃO 5W2H (`MonitoramentoKriPlanoAcaoView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Operacionaliza as Seções 4.5 (Tratamento e Resposta 5W2H), 4.5.1 (Indicadores-Chave
 * de Risco — KRIs) e 4.6 (Monitoramento Contínuo) da Metodologia RADAR (SEI 024421455).
 * Regra de Governança: lançar medições de KRI ou atualizar o andamento de ações
 * 5W2H faz parte da rotina contínua e NÃO derruba o status 'aprovado' do risco.
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import BrCard from '../components/govbr/BrCard.vue';
import BrTabs from '../components/govbr/BrTabs.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrBadge from '../components/govbr/BrBadge.vue';
import BrMessage from '../components/govbr/BrMessage.vue';

const riscosStore = useRiscosStore();

const abaAtiva = ref('kris');
const kriEmEdicaoId = ref<string | null>(null);
const valorMedicao = ref('');
const alertaMedicao = ref(false);
const obsMedicao = ref('');

const listaConsolidadaKris = computed(() => {
  const itens: Array<{
    riscoId: string;
    codigoRadar: string;
    nomeObjeto: string;
    classificacaoResidual: any;
    statusFluxo: string;
    kri: (typeof riscosStore.riscos)[0]['kris'][0];
  }> = [];

  for (const r of riscosStore.riscos) {
    for (const k of r.kris) {
      itens.push({
        riscoId: r.id,
        codigoRadar: r.codigoRadar,
        nomeObjeto: r.nomeObjetoCache || '',
        classificacaoResidual: r.classificacaoResidual,
        statusFluxo: r.statusFluxo,
        kri: k,
      });
    }
  }
  return itens;
});

const listaConsolidada5w2h = computed(() => {
  const itens: Array<{
    riscoId: string;
    codigoRadar: string;
    nomeObjeto: string;
    classificacaoResidual: any;
    tratamento: (typeof riscosStore.riscos)[0]['respostasTratamento'][0];
  }> = [];

  for (const r of riscosStore.riscos) {
    for (const t of r.respostasTratamento) {
      itens.push({
        riscoId: r.id,
        codigoRadar: r.codigoRadar,
        nomeObjeto: r.nomeObjetoCache || '',
        classificacaoResidual: r.classificacaoResidual,
        tratamento: t,
      });
    }
  }
  return itens;
});

const totalKrisEmAlerta = computed(
  () =>
    listaConsolidadaKris.value.filter(
      (x) => x.kri.medicoes[0] && x.kri.medicoes[0].emAlerta
    ).length
);

function salvarLeituraRapida(riscoId: string, kriId: string) {
  if (!valorMedicao.value.trim()) return;
  riscosStore.registrarMedicaoKri(riscoId, kriId, {
    dataMedicao: new Date().toISOString().slice(0, 10),
    valorApurado: valorMedicao.value.trim(),
    emAlerta: alertaMedicao.value,
    observacao: obsMedicao.value.trim() || 'Medição lançada na Sala de Situação.',
  });
  valorMedicao.value = '';
  alertaMedicao.value = false;
  obsMedicao.value = '';
  kriEmEdicaoId.value = null;
}
</script>

<template>
  <div>
    <BrMessage
      state="info"
      titulo="Monitoramento Contínuo (Seção 4.6 da Metodologia SEI 024421455):"
    >
      O registro periódico de leituras de <strong>KRIs</strong> e a atualização do status de execução das ações
      <strong>5W2H</strong> mantêm intacta a homologação do risco no <strong>Plano de Gestão de Riscos</strong>.
      Apenas alterações nas notas de Probabilidade, Impacto ou Fator de Controle reabrem a validação da Coordenação-Geral.
    </BrMessage>

    <!-- KPIs de Monitoramento -->
    <div class="radar-grid-4 mb-3">
      <BrCard titulo="Total de KRIs Monitorados" destaque-cor="#1351b4">
        <div class="h2 mb-0 font-weight-bold" style="color: #1351b4;">
          {{ listaConsolidadaKris.length }}
        </div>
        <small class="text-muted">Indicadores-Chave de Risco ativos</small>
      </BrCard>

      <BrCard titulo="KRIs com Gatilho de Alerta" destaque-cor="#e52207">
        <div class="h2 mb-0 font-weight-bold" style="color: #e52207;">
          {{ totalKrisEmAlerta }}
        </div>
        <small class="text-muted">Última leitura fora do limite de tolerância</small>
      </BrCard>

      <BrCard titulo="Ações 5W2H Mapeadas" destaque-cor="#071d41">
        <div class="h2 mb-0 font-weight-bold" style="color: #071d41;">
          {{ listaConsolidada5w2h.length }}
        </div>
        <small class="text-muted">Planos de resposta vinculados aos riscos</small>
      </BrCard>

      <BrCard titulo="Ações 5W2H Concluídas" destaque-cor="#168821">
        <div class="h2 mb-0 font-weight-bold" style="color: #168821;">
          {{ listaConsolidada5w2h.filter((x) => x.tratamento.statusExecucao === 'concluida').length }}
        </div>
        <small class="text-muted">Entregas de mitigação finalizadas</small>
      </BrCard>
    </div>

    <!-- Abas: KRIs vs Planos 5W2H -->
    <BrTabs
      v-model:aba-ativa="abaAtiva"
      :abas="[
        {
          id: 'kris',
          rotulo: 'Semáforo de Indicadores-Chave de Risco (KRIs)',
          icone: 'fas fa-chart-line',
          contador: listaConsolidadaKris.length,
        },
        {
          id: '5w2h',
          rotulo: 'Acompanhamento de Planos de Ação (5W2H)',
          icone: 'fas fa-tasks',
          contador: listaConsolidada5w2h.length,
        },
      ]"
    />

    <!-- ABA 1: SEMÁFORO DE KRIs -->
    <BrCard
      v-if="abaAtiva === 'kris'"
      titulo="Semáforo Consolidado de Indicadores-Chave de Risco (KRIs — Seção 4.5.1)"
      subtitulo="Acompanhe metas, gatilhos de alerta e registre novas leituras trimestrais/mensais"
      destaque-cor="#1351b4"
    >
      <div
        v-for="item in listaConsolidadaKris"
        :key="item.kri.id"
        class="p-3 mb-3 rounded border bg-white"
      >
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <RouterLink
              :to="`/riscos/${item.riscoId}`"
              class="font-weight-bold text-decoration-none"
              style="color: #1351b4;"
            >
              [{{ item.codigoRadar }}]
            </RouterLink>
            <strong class="ml-1">{{ item.kri.nomeIndicador }}</strong>
            <span class="ml-2 px-2 py-0 rounded text-down-02" style="background: #e5e7eb;">
              {{ item.kri.periodicidade }}
            </span>
            <div class="text-down-01 text-muted mt-1">
              Fórmula: {{ item.kri.formulaCalculo }} | Fonte: {{ item.kri.fonteDados }}
            </div>
            <div class="text-down-01 mt-1">
              Meta Alvo: <strong>{{ item.kri.metaAlvo }}</strong> |
              Gatilho de Alerta: <strong style="color: #c91c00;">{{ item.kri.limiteAlerta }}</strong> |
              Responsável: {{ item.kri.responsavelMedicao }}
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <BrBadge :classe-risco="item.classificacaoResidual" />
            <BrButton
              variant="secondary"
              icon="fas fa-plus-circle"
              @click="kriEmEdicaoId = kriEmEdicaoId === item.kri.id ? null : item.kri.id"
            >
              Registrar Leitura
            </BrButton>
          </div>
        </div>

        <div v-if="kriEmEdicaoId === item.kri.id" class="mt-2 p-2 rounded border" style="background: #f8fafc;">
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <input
              v-model="valorMedicao"
              type="text"
              placeholder="Valor apurado (ex.: 92%)"
              class="p-2 rounded border"
            />
            <label class="d-flex align-items-center gap-1 text-down-01 font-weight-bold">
              <input v-model="alertaMedicao" type="checkbox" />
              Disparou gatilho de alerta?
            </label>
            <input
              v-model="obsMedicao"
              type="text"
              placeholder="Observação / providência"
              class="p-2 rounded border flex-fill"
            />
            <BrButton variant="primary" @click="salvarLeituraRapida(item.riscoId, item.kri.id)">
              Salvar Medição
            </BrButton>
          </div>
        </div>

        <div v-if="item.kri.medicoes.length > 0" class="mt-2 pt-2" style="border-top: 1px solid #f1f5f9;">
          <span
            v-for="m in item.kri.medicoes"
            :key="m.id"
            class="mr-2 mb-1 px-2 py-1 rounded d-inline-block text-down-01"
            :style="{
              backgroundColor: m.emAlerta ? '#fde0db' : '#e3f5e1',
              color: m.emAlerta ? '#c91c00' : '#168821',
            }"
          >
            <strong>{{ m.dataMedicao }}:</strong> {{ m.valorApurado }}
            <span v-if="m.observacao">({{ m.observacao }})</span>
          </span>
        </div>
      </div>
    </BrCard>

    <!-- ABA 2: PLANOS DE AÇÃO 5W2H -->
    <BrCard
      v-else
      titulo="Painel de Execução dos Planos de Ação e Resposta (5W2H — Seção 4.5)"
      subtitulo="Atualize o andamento das ações mitigatórias pactuadas pela 1ª Linha"
      destaque-cor="#071d41"
    >
      <div
        v-for="item in listaConsolidada5w2h"
        :key="item.tratamento.id"
        class="p-3 mb-2 rounded border bg-white d-flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <div>
          <RouterLink
            :to="`/riscos/${item.riscoId}`"
            class="font-weight-bold text-decoration-none"
            style="color: #1351b4;"
          >
            [{{ item.codigoRadar }}]
          </RouterLink>
          <strong class="ml-1">{{ item.tratamento.acaoOQue }}</strong>
          <div class="text-down-01 text-muted mt-1">
            <strong>Quem:</strong> {{ item.tratamento.responsavelQuem }} |
            <strong>Prazo (Quando):</strong> {{ item.tratamento.prazoQuando }} |
            <strong>Como:</strong> {{ item.tratamento.procedimentoComo }}
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <BrBadge :classe-risco="item.classificacaoResidual" />
          <select
            :value="item.tratamento.statusExecucao"
            class="p-2 rounded font-weight-bold"
            style="border: 1px solid #1351b4; color: #071d41;"
            @change="
              riscosStore.atualizarStatusTratamento(
                item.riscoId,
                item.tratamento.id,
                ($event.target as HTMLSelectElement).value as any
              )
            "
          >
            <option value="nao_iniciada">Não iniciada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
            <option value="atrasada">Atrasada</option>
          </select>
        </div>
      </div>
    </BrCard>
  </div>
</template>
