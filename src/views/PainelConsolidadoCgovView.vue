<script setup lang="ts">
/**
 * ============================================================================
 * PAINEL CONSOLIDADO CGOV / CTGRIC (`PainelConsolidadoCgovView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta é a tela inicial do Sistema RADAR. Ela consolida o Plano de Gestão de
 * Riscos do ICMBio (por extenso, respeitando a disciplina de siglas), apresenta
 * a Matriz de Calor Assimétrica 5x5 (Quadro 7), permite simular/configurar a
 * Declaração de Apetite a Riscos (DAR — Anexo III) e acompanhar KRIs e Ações 5W2H.
 */
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import type { ApetiteDeclarado, NivelEficaciaControle, NivelImpacto, NivelProbabilidade } from '../types/radar.types';
import BrCard from '../components/govbr/BrCard.vue';
import BrBadge from '../components/govbr/BrBadge.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MatrizCalorAssimetrica from '../components/radar/MatrizCalorAssimetrica.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const riscosStore = useRiscosStore();
const authStore = useAuthStore();

const modalKriAbertoId = ref<string | null>(null);
const novoValorKri = ref('');
const novoAlertaKri = ref(false);
const novaObsKri = ref('');

function salvarLeituraKri(riscoId: string, kriId: string) {
  if (!novoValorKri.value.trim()) return;
  riscosStore.registrarMedicaoKri(riscoId, kriId, {
    dataMedicao: new Date().toISOString().slice(0, 10),
    valorApurado: novoValorKri.value.trim(),
    emAlerta: novoAlertaKri.value,
    observacao: novaObsKri.value.trim() || 'Leitura periódica registrada no painel.',
  });
  novoValorKri.value = '';
  novoAlertaKri.value = false;
  novaObsKri.value = '';
  modalKriAbertoId.value = null;
}

function simularReavaliacaoNota(
  riscoId: string,
  p: NivelProbabilidade,
  i: NivelImpacto,
  eficacia: NivelEficaciaControle,
  evidencia: boolean
) {
  riscosStore.reavaliarPontuacaoRiscoAprovado(riscoId, {
    probabilidade: p,
    impacto: i,
    nivelEficaciaControle: eficacia,
    possuiEvidenciaControle: evidencia,
  });
}
</script>

<template>
  <div>
    <!-- Indicadores Resumo do Plano de Gestão de Riscos -->
    <div class="radar-grid-4 mb-3">
      <BrCard titulo="Total no Plano de Gestão de Riscos" destaque-cor="#1351b4">
        <div class="h2 mb-0 font-weight-bold" style="color: #1351b4;">
          {{ riscosStore.riscos.length }}
        </div>
        <small class="text-muted">Fichas de risco mapeadas nas unidades</small>
      </BrCard>

      <BrCard titulo="Carteira de Riscos Críticos (DAR)" destaque-cor="#e52207">
        <div class="h2 mb-0 font-weight-bold" style="color: #e52207;">
          {{ riscosStore.riscosCriticosCarteira.length }}
        </div>
        <small class="text-muted">Fora do apetite da Declaração de Apetite a Riscos</small>
      </BrCard>

      <BrCard titulo="Aguardando Validação 1 Clique (CG)" destaque-cor="#ffcd07">
        <div class="h2 mb-0 font-weight-bold" style="color: #8a6d00;">
          {{ riscosStore.filaValidacaoCg.length }}
        </div>
        <small class="text-muted">2º Degrau: Coordenações-Gerais de Macroprocesso</small>
      </BrCard>

      <BrCard titulo="Aguardando Homologação Diretoria" destaque-cor="#071d41">
        <div class="h2 mb-0 font-weight-bold" style="color: #071d41;">
          {{ riscosStore.filaHomologacaoDiretoria.length }}
        </div>
        <small class="text-muted">3º Degrau: Riscos Críticos escalados</small>
      </BrCard>
    </div>

    <!-- Matriz de Calor Assimétrica (Quadro 7) e Configurador da DAR (Anexo III) -->
    <div class="radar-grid-2 mb-3">
      <BrCard
        titulo="Matriz Assimétrica de Riscos 5×5 (Quadro 7 — SEI 024421455)"
        subtitulo="Clique em qualquer célula para filtrar a carteira abaixo (Impacto pesa mais que Probabilidade)"
        destaque-cor="#1351b4"
      >
        <MatrizCalorAssimetrica
          :riscos="riscosStore.riscos"
          :celula-ativa="riscosStore.celulaMatrizSelecionada"
          @selecionar-celula="({ p, i }) => riscosStore.alternarFiltroCelulaMatriz(p, i)"
        />
      </BrCard>

      <BrCard
        titulo="Declaração de Apetite a Riscos (DAR — Anexo III)"
        subtitulo="Simulador Institucional CGOV / CIG para as 8 Categorias do Quadro 2"
        destaque-cor="#071d41"
      >
        <p class="text-down-01 mb-2">
          Altere o apetite abaixo para ver como a <strong>Carteira de Riscos Críticos</strong> reage em tempo real:
        </p>
        <div class="table-responsive">
          <table class="table table-sm" style="width: 100%;">
            <thead>
              <tr style="border-bottom: 2px solid #071d41;">
                <th class="text-left py-1">Categoria (Quadro 2)</th>
                <th class="text-left py-1">Apetite na DAR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in riscosStore.categorias" :key="cat.id" style="border-bottom: 1px solid #eee;">
                <td class="py-1 font-weight-bold">
                  {{ cat.nome }}
                  <span v-if="cat.nome === 'Integridade'" class="badge ml-1" style="background: #071d41; color: #fff; font-size: 0.7rem;">
                    Integra+ (6 subcategorias)
                  </span>
                </td>
                <td class="py-1">
                  <select
                    :value="cat.apetiteDeclarado"
                    :disabled="!authStore.isCgov"
                    style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #1351b4;"
                    @change="
                      riscosStore.alterarApetiteCategoriaDAR(
                        cat.id,
                        ($event.target as HTMLSelectElement).value as ApetiteDeclarado
                      )
                    "
                  >
                    <option value="baixo">Baixo (Aceita até nota 5)</option>
                    <option value="moderado">Moderado (Aceita até nota 10)</option>
                    <option value="pendente_dar">Pendente de DAR (Aguarda CIG)</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BrCard>
    </div>

    <!-- Lista Detalhada de Fichas de Risco do Plano de Gestão de Riscos -->
    <BrCard
      titulo="Carteira de Riscos Mapeados — Plano de Gestão de Riscos do ICMBio"
      subtitulo="Inclui o Caso de Controle Oficial do Anexo II e fichas importadas da skill cgov-gestao-riscos-v4"
      destaque-cor="#1351b4"
    >
      <div
        v-if="riscosStore.celulaMatrizSelecionada || riscosStore.termoBuscaGlobal"
        class="p-2 mb-3 rounded d-flex justify-content-between align-items-center flex-wrap gap-2"
        style="background-color: #dbe8fb; border: 1px solid #1351b4; color: #071d41;"
      >
        <div class="text-down-01 font-weight-bold">
          <i class="fas fa-filter mr-1" aria-hidden="true"></i>
          Filtro ativo:
          <span v-if="riscosStore.celulaMatrizSelecionada" class="mr-2">
            Célula P={{ riscosStore.celulaMatrizSelecionada.p }}, I={{ riscosStore.celulaMatrizSelecionada.i }}
          </span>
          <span v-if="riscosStore.termoBuscaGlobal">
            Busca: "{{ riscosStore.termoBuscaGlobal }}"
          </span>
          ({{ riscosStore.riscosFiltrados.length }} registro(s))
        </div>
        <BrButton variant="secondary" icon="fas fa-times" @click="riscosStore.limparFiltrosPainel()">
          Limpar Filtros
        </BrButton>
      </div>

      <div
        v-for="risco in riscosStore.riscosFiltrados"
        :key="risco.id"
        class="p-3 mb-3 rounded"
        style="border: 1px solid #d1d5db; background-color: #ffffff;"
      >
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <RouterLink
              :to="`/riscos/${risco.id}`"
              class="font-weight-bold mr-2 text-decoration-none"
              style="color: #1351b4; font-size: 1.05rem;"
            >
              [{{ risco.codigoRadar }}]
            </RouterLink>
            <strong>{{ risco.nomeObjetoCache }}</strong>
            <span class="ml-2 px-2 py-1 rounded text-down-02" style="background: #e5e7eb;">
              Categoria: <strong>{{ risco.categoriaNome }}</strong>
              <template v-if="risco.subcategoriaIntegridade">
                ({{ risco.subcategoriaIntegridade }})
              </template>
            </span>
            <span
              v-if="risco.origemPreliminarCgov"
              class="ml-2 px-2 py-1 rounded text-down-02"
              style="background: #dbe8fb; color: #1351b4; font-weight: 600;"
            >
              Origem: Passo 0 Skill CGOV
            </span>
          </div>

          <div class="d-flex align-items-center flex-wrap gap-2">
            <RouterLink
              :to="`/riscos/${risco.id}`"
              class="px-2 py-1 rounded text-decoration-none font-weight-bold text-down-01"
              style="background-color: #dbe8fb; color: #1351b4; border: 1px solid #1351b4;"
            >
              <i class="fas fa-project-diagram mr-1" aria-hidden="true"></i>
              Abrir Ficha Bow Tie
            </RouterLink>
            <span class="px-2 py-1 rounded font-weight-bold text-down-01" style="background: #071d41; color: #fff;">
              Status do Fluxo: {{ risco.statusFluxo }}
            </span>
            <BrBadge :classe-risco="risco.classificacaoResidual" :texto="`Residual: ${risco.nivelResidual} (${risco.classificacaoResidual})`" />
          </div>
        </div>

        <!-- Sintaxe Obrigatória da Seção 4.2.1 -->
        <p class="p-2 rounded mb-2" style="background-color: #f8fafc; border-left: 3px solid #071d41;">
          <strong>Descrição Padronizada (Seção 4.2.1):</strong> {{ risco.descricaoPadrao }}
        </p>

        <!-- Barra "Mostre a Conta" (§5 da Skill) -->
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

        <!-- Indicadores-Chave de Risco (KRIs) e Monitoramento Contínuo -->
        <div class="mt-3">
          <h4 class="h6 font-weight-bold mb-2" style="color: #071d41;">
            <i class="fas fa-chart-line mr-1"></i>
            Indicadores-Chave de Risco (KRIs — Monitoramento Contínuo Seção 4.5.1):
          </h4>
          <div v-for="kri in risco.kris" :key="kri.id" class="p-2 mb-2 rounded" style="background: #f9fafb; border: 1px solid #e5e7eb;">
            <div class="d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <strong>{{ kri.nomeIndicador }}</strong> ({{ kri.periodicidade }})
                <div class="text-down-01 text-muted">
                  Meta: <strong>{{ kri.metaAlvo }}</strong> | Gatilho de Alerta: <strong>{{ kri.limiteAlerta }}</strong>
                </div>
              </div>
              <BrButton
                variant="secondary"
                icon="fas fa-plus-circle"
                @click="modalKriAbertoId = modalKriAbertoId === kri.id ? null : kri.id"
              >
                Lançar Medição de KRI
              </BrButton>
            </div>

            <!-- Formulário rápido de leitura de KRI (não derruba status aprovado) -->
            <div v-if="modalKriAbertoId === kri.id" class="mt-2 p-2 rounded bg-white border">
              <div class="d-flex gap-2 flex-wrap align-items-center">
                <input
                  v-model="novoValorKri"
                  type="text"
                  placeholder="Valor apurado (ex.: 85%)"
                  style="padding: 0.35rem; border: 1px solid #ccc; border-radius: 4px;"
                />
                <label class="d-flex align-items-center gap-1 text-down-01">
                  <input v-model="novoAlertaKri" type="checkbox" />
                  Ultrapassou limite de alerta?
                </label>
                <input
                  v-model="novaObsKri"
                  type="text"
                  placeholder="Observação da medição"
                  style="padding: 0.35rem; border: 1px solid #ccc; border-radius: 4px; flex: 1;"
                />
                <BrButton variant="primary" @click="salvarLeituraKri(risco.id, kri.id)">
                  Salvar Leitura
                </BrButton>
              </div>
            </div>

            <div v-if="kri.medicoes.length > 0" class="mt-2 text-down-01">
              <span
                v-for="med in kri.medicoes"
                :key="med.id"
                class="mr-2 px-2 py-1 rounded d-inline-block"
                :style="{
                  backgroundColor: med.emAlerta ? '#fde0db' : '#e3f5e1',
                  color: med.emAlerta ? '#c91c00' : '#168821',
                }"
              >
                {{ med.dataMedicao }}: <strong>{{ med.valorApurado }}</strong> ({{ med.observacao }})
              </span>
            </div>
          </div>
        </div>

        <!-- Ações de Resposta / Tratamento 5W2H -->
        <div v-if="risco.respostasTratamento.length > 0" class="mt-2">
          <h4 class="h6 font-weight-bold mb-2" style="color: #071d41;">
            <i class="fas fa-tasks mr-1"></i>
            Plano de Ação e Resposta 5W2H (Estratégia: {{ risco.estrategiaPrincipal }}):
          </h4>
          <div
            v-for="trat in risco.respostasTratamento"
            :key="trat.id"
            class="d-flex justify-content-between align-items-center flex-wrap p-2 mb-1 rounded"
            style="background: #f8fafc; border: 1px solid #e2e8f0;"
          >
            <div class="text-down-01">
              <strong>O quê:</strong> {{ trat.acaoOQue }} |
              <strong>Quem:</strong> {{ trat.responsavelQuem }} |
              <strong>Prazo:</strong> {{ trat.prazoQuando }}
            </div>
            <select
              :value="trat.statusExecucao"
              style="padding: 0.25rem; border-radius: 4px; border: 1px solid #1351b4;"
              @change="
                riscosStore.atualizarStatusTratamento(
                  risco.id,
                  trat.id,
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

        <!-- Botão Didático para testar reabertura automática ao mudar nota de risco aprovado -->
        <div class="mt-3 pt-2 d-flex justify-content-between align-items-center flex-wrap" style="border-top: 1px solid #eee;">
          <div class="text-down-02 text-muted">
            Responsável 1ª Linha: <strong>{{ risco.responsavelRiscoNome }}</strong>
          </div>
          <div class="d-flex gap-2">
            <BrButton
              v-if="risco.statusFluxo === 'rascunho' || risco.statusFluxo === 'preliminar_cgov' || risco.statusFluxo === 'devolvido'"
              variant="primary"
              icon="fas fa-paper-plane"
              @click="riscosStore.submeterParaValidacaoCg(risco.id)"
            >
              Submeter à Coordenação-Geral (2º Degrau)
            </BrButton>
            <BrButton
              v-if="risco.statusFluxo === 'aprovado'"
              variant="secondary"
              icon="fas fa-sync-alt"
              @click="simularReavaliacaoNota(risco.id, risco.probabilidade, risco.impacto, 'Satisfatório', true)"
            >
              Reavaliar Controle para Satisfatório (0,6) — Reabre Validação CG
            </BrButton>
          </div>
        </div>
      </div>
    </BrCard>
  </div>
</template>
