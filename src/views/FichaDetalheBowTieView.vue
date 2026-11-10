<script setup lang="ts">
/**
 * ============================================================================
 * FICHA EXECUTIVA E DIAGRAMA VISUAL BOW TIE (`FichaDetalheBowTieView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta página apresenta a anatomia gráfica completa de um Risco pelo Método
 * Bow Tie (Gravata-Borboleta — Seção 4.2.1 da Metodologia SEI 024421455):
 * [1. Causas] -> [2. Barreira Preventiva / Controles (Quadro 6)] -> [3. EVENTO DE RISCO]
 * -> [4. Plano de Resposta 5W2H (Tabela 8)] -> [5. Consequências & Objetivo Afetado].
 * Inclui também a Barra "Mostre a Conta" (§5), os botões de deliberação em 1 clique
 * e a Trilha de Auditoria específica da ficha.
 */
import { computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import BrCard from '../components/govbr/BrCard.vue';
import BrBadge from '../components/govbr/BrBadge.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();

const riscoAtivo = computed(() => {
  const idParam = String(route.params.id || '');
  return (
    riscosStore.obterRiscoPorId(idParam) ||
    riscosStore.riscos[0]
  );
});

function selecionarOutroRisco(id: string) {
  router.push(`/riscos/${id}`);
}
</script>

<template>
  <div v-if="riscoAtivo">
    <!-- Barra Superior de Seleção de Ficha e Navegação -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div class="d-flex align-items-center flex-wrap gap-2">
        <RouterLink
          to="/"
          class="px-3 py-1 rounded-pill text-decoration-none font-weight-bold text-down-01"
          style="border: 1px solid #1351b4; color: #1351b4; background: #fff;"
        >
          ← Voltar ao Painel
        </RouterLink>
        <label for="seletor-ficha-bowtie" class="font-weight-bold text-down-01 mb-0" style="color: #071d41;">
          Inspecionar Ficha:
        </label>
        <select
          id="seletor-ficha-bowtie"
          :value="riscoAtivo.id"
          class="p-2 rounded font-weight-bold"
          style="border: 1px solid #1351b4; color: #071d41; background: #fff;"
          @change="selecionarOutroRisco(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="r in riscosStore.riscos" :key="r.id" :value="r.id">
            [{{ r.codigoRadar }}] {{ r.nomeObjetoCache }} — Residual {{ r.nivelResidual }} ({{ r.classificacaoResidual }})
          </option>
        </select>
      </div>

      <div class="d-flex align-items-center gap-2">
        <span
          class="px-3 py-1 rounded font-weight-bold text-down-01"
          style="background-color: #071d41; color: #ffffff;"
        >
          Status: {{ riscoAtivo.statusFluxo }}
        </span>
        <BrBadge
          :classe-risco="riscoAtivo.classificacaoResidual"
          :texto="`Residual: ${riscoAtivo.nivelResidual} (${riscoAtivo.classificacaoResidual})`"
        />
      </div>
    </div>

    <!-- Memória de Cálculo RADAR (§5 — "Mostre a Conta") -->
    <MemoriaCalculoBar
      :probabilidade="riscoAtivo.probabilidade"
      :impacto="riscoAtivo.impacto"
      :nivel-inerente="riscoAtivo.nivelInerente"
      :classificacao-inerente="riscoAtivo.classificacaoInerente"
      :eficacia-controle="riscoAtivo.nivelEficaciaControle"
      :fator-controle="riscoAtivo.fatorControle"
      :possui-evidencia="riscoAtivo.possuiEvidenciaControle"
      :nivel-residual="riscoAtivo.nivelResidual"
      :classificacao-residual="riscoAtivo.classificacaoResidual"
      :status-critico="riscoAtivo.statusCritico"
    />

    <!-- DIAGRAMA VISUAL BOW TIE (GRAVATA-BORBOLETA) -->
    <BrCard
      :titulo="`Diagrama Visual Bow Tie — [${riscoAtivo.codigoRadar}] ${riscoAtivo.nomeObjetoCache}`"
      subtitulo="Encadeamento Lógico Causas → Controles Preventivos → Evento Central → Resposta 5W2H → Consequências e Objetivo (Seção 4.2.1)"
      destaque-cor="#1351b4"
    >
      <div
        class="p-3 mb-3 rounded"
        style="background-color: #dbe8fb; border-left: 4px solid #1351b4; color: #071d41;"
      >
        <strong>Sintaxe Padronizada Oficial (Seção 4.2.1):</strong>
        <div class="mt-1">{{ riscoAtivo.descricaoPadrao }}</div>
      </div>

      <div
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.85rem; align-items: stretch;"
      >
        <!-- Coluna 1: Causas -->
        <div
          class="p-3 rounded d-flex flex-column justify-content-between"
          style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #1351b4;"
        >
          <div>
            <div class="text-down-01 font-weight-bold text-uppercase mb-1" style="color: #1351b4;">
              1. Causas (Fontes)
            </div>
            <p class="text-down-01 mb-2">{{ riscoAtivo.causas }}</p>
          </div>
          <span class="badge align-self-start" style="background: #dbe8fb; color: #071d41; padding: 0.2rem 0.5rem; border-radius: 4px;">
            Probabilidade P = {{ riscoAtivo.probabilidade }}
          </span>
        </div>

        <!-- Coluna 2: Barreira de Controles (Quadro 6) -->
        <div
          class="p-3 rounded d-flex flex-column justify-content-between"
          style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #8a6d00;"
        >
          <div>
            <div class="text-down-01 font-weight-bold text-uppercase mb-1" style="color: #8a6d00;">
              2. Controles (Quadro 6)
            </div>
            <div v-if="riscoAtivo.controlesExistentes.length > 0" class="text-down-01 mb-2">
              <div v-for="ctrl in riscoAtivo.controlesExistentes" :key="ctrl.id" class="mb-1">
                • {{ ctrl.descricaoControle }}
                <small class="d-block text-muted">Evidência: {{ ctrl.evidenciaFuncionamento }}</small>
              </div>
            </div>
            <p v-else class="text-down-01 mb-2 text-muted">
              Sem controle formal evidenciado (Fator 1,0 — Inexistente).
            </p>
          </div>
          <span class="badge align-self-start" style="background: #fff5c2; color: #8a6d00; padding: 0.2rem 0.5rem; border-radius: 4px;">
            {{ riscoAtivo.nivelEficaciaControle }} (× {{ String(riscoAtivo.fatorControle).replace('.', ',') }})
          </span>
        </div>

        <!-- Coluna 3: EVENTO CENTRAL DE RISCO -->
        <div
          class="p-3 rounded d-flex flex-column justify-content-center text-center shadow-sm"
          style="background-color: #fde0db; border: 2px solid #e52207; color: #071d41;"
        >
          <div class="text-down-01 font-weight-bold text-uppercase mb-1" style="color: #c91c00;">
            🎯 3. Evento Central de Risco
          </div>
          <p class="font-weight-bold text-down-01 my-2">
            {{ riscoAtivo.eventoRisco }}
          </p>
          <div class="mt-1">
            <span class="px-2 py-1 rounded text-down-02 font-weight-bold bg-white" style="color: #071d41;">
              Categoria: {{ riscoAtivo.categoriaNome }}
              <template v-if="riscoAtivo.subcategoriaIntegridade">
                ({{ riscoAtivo.subcategoriaIntegridade }})
              </template>
            </span>
          </div>
        </div>

        <!-- Coluna 4: Plano de Ação 5W2H -->
        <div
          class="p-3 rounded d-flex flex-column justify-content-between"
          style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #168821;"
        >
          <div>
            <div class="text-down-01 font-weight-bold text-uppercase mb-1" style="color: #168821;">
              4. Resposta ({{ riscoAtivo.estrategiaPrincipal }})
            </div>
            <div v-if="riscoAtivo.respostasTratamento.length > 0" class="text-down-01 mb-2">
              <div v-for="t in riscoAtivo.respostasTratamento" :key="t.id" class="mb-1">
                • {{ t.acaoOQue }}
                <small class="d-block text-muted">Prazo: {{ t.prazoQuando }} ({{ t.statusExecucao }})</small>
              </div>
            </div>
            <p v-else class="text-down-01 mb-2 text-muted">
              Ação de tratamento em elaboração pela 1ª Linha.
            </p>
          </div>
          <span class="badge align-self-start" style="background: #e3f5e1; color: #168821; padding: 0.2rem 0.5rem; border-radius: 4px;">
            {{ riscoAtivo.kris.length }} KRI(s) vinculado(s)
          </span>
        </div>

        <!-- Coluna 5: Consequências & Objetivo Afetado -->
        <div
          class="p-3 rounded d-flex flex-column justify-content-between"
          style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #071d41;"
        >
          <div>
            <div class="text-down-01 font-weight-bold text-uppercase mb-1" style="color: #071d41;">
              5. Consequências &amp; Objetivo
            </div>
            <p class="text-down-01 mb-1">
              <strong>Consequência:</strong> {{ riscoAtivo.consequencias }}
            </p>
            <p class="text-down-01 mb-2">
              <strong>Objetivo afetado:</strong> {{ riscoAtivo.objetivoAfetado }}
            </p>
          </div>
          <span class="badge align-self-start" style="background: #071d41; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px;">
            Impacto I = {{ riscoAtivo.impacto }} (Inerente {{ riscoAtivo.nivelInerente }})
          </span>
        </div>
      </div>

      <!-- Ações Executivas em 1 Clique no Rodapé do Dossiê -->
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 pt-3" style="border-top: 1px solid #e5e7eb;">
        <div class="text-down-01">
          Responsável 1ª Linha: <strong>{{ riscoAtivo.responsavelRiscoNome }}</strong>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <BrButton
            v-if="riscoAtivo.statusFluxo === 'em_validacao_cg'"
            variant="success"
            icon="fas fa-check"
            :disabled="!authStore.podeAprovarCg"
            @click="riscosStore.aprovarEmUmCliqueCg(riscoAtivo.id)"
          >
            Validar em 1 Clique (2º Degrau — CG)
          </BrButton>

          <BrButton
            v-if="riscoAtivo.statusFluxo === 'em_homologacao_dir'"
            variant="primary"
            icon="fas fa-stamp"
            :disabled="!authStore.podeHomologarDiretoria"
            @click="riscosStore.homologarEmUmCliqueDiretoria(riscoAtivo.id)"
          >
            Homologar em 1 Clique (3º Degrau — Diretoria)
          </BrButton>
        </div>
      </div>
    </BrCard>

    <!-- Trilha de Auditoria da Ficha -->
    <BrCard
      titulo="Trilha de Auditoria e Despachos desta Ficha de Risco"
      subtitulo="Histórico cronológico de submissões, validações em 1 clique e revisões de nota"
      destaque-cor="#071d41"
    >
      <div v-if="riscoAtivo.historicoFluxo.length === 0" class="text-muted text-down-01">
        Nenhuma tramitação registrada ainda para esta ficha.
      </div>
      <div
        v-for="item in riscoAtivo.historicoFluxo"
        :key="item.id"
        class="p-2 mb-2 rounded"
        style="background-color: #f8fafc; border-left: 3px solid #1351b4;"
      >
        <div class="d-flex justify-content-between text-down-01 font-weight-bold" style="color: #071d41;">
          <span>{{ item.usuarioNome }} ({{ item.etapa }})</span>
          <span>{{ item.criadoEm.slice(0, 16).replace('T', ' ') }}</span>
        </div>
        <div class="text-down-01 mt-1">{{ item.despachoTexto }}</div>
      </div>
    </BrCard>
  </div>
</template>
