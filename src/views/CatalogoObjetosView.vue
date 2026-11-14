<script setup lang="ts">
/**
 * ============================================================================
 * CATÁLOGO DE OBJETOS DE GESTÃO DE RISCOS E CONTEXTO (`CatalogoObjetosView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Operacionaliza a Seção 4.1 (Estabelecimento do Contexto) e o Quadro 1 da
 * Metodologia RADAR (SEI 024421455), vinculando os Objetos de Gestão de Riscos
 * (Macroprocessos, Processos, Projetos, Planos, Ações e Unidades) às Unidades
 * Organizacionais do ICMBio (Presidência, Diretorias, Coordenações-Gerais,
 * Gerências Regionais e Unidades de Conservação).
 */
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import type { ObjetoContexto } from '../types/radar.types';
import BrCard from '../components/govbr/BrCard.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrBadge from '../components/govbr/BrBadge.vue';

const riscosStore = useRiscosStore();

const exibirFormularioNovo = ref(false);
const tipoObjeto = ref<ObjetoContexto['tipoObjeto']>('Processo');
const nomeObjeto = ref('');
const unidadeId = ref('uni-cgov');
const macroprocessoSupervisorId = ref('uni-cgge');
const diretoriaId = ref('uni-diplan');
const objetivoEstrategicoAssociado = ref('');
const insumosPrincipais = ref('');
const entregasPrincipais = ref('');
const partesInteressadas = ref('');

function obterSiglaUnidade(id: string): string {
  return riscosStore.unidades.find((u) => u.id === id)?.sigla || id;
}

function riscosDoObjeto(objetoId: string) {
  return riscosStore.riscos.filter((r) => r.objetoId === objetoId);
}

function salvarObjeto() {
  if (!nomeObjeto.value.trim()) return;
  riscosStore.salvarNovoObjetoContexto({
    tipoObjeto: tipoObjeto.value,
    nomeObjeto: nomeObjeto.value.trim(),
    unidadeId: unidadeId.value,
    macroprocessoSupervisorId: macroprocessoSupervisorId.value,
    diretoriaId: diretoriaId.value,
    objetivoEstrategicoAssociado:
      objetivoEstrategicoAssociado.value.trim() ||
      'Garantir conformidade, tempestividade e alcance de resultados institucionais.',
    insumosPrincipais: insumosPrincipais.value.trim() || 'Processos SEI e normativos vigentes.',
    entregasPrincipais: entregasPrincipais.value.trim() || 'Atos decisórios e relatórios técnicos.',
    partesInteressadas: partesInteressadas.value.trim() || 'Unidades do ICMBio e sociedade.',
    cicloAno: 2026,
  });

  nomeObjeto.value = '';
  objetivoEstrategicoAssociado.value = '';
  insumosPrincipais.value = '';
  entregasPrincipais.value = '';
  partesInteressadas.value = '';
  exibirFormularioNovo.value = false;
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h2 class="h4 font-weight-bold mb-0" style="color: #071d41;">
          Catálogo de Objetos de Gestão de Riscos &amp; Cadeia de Valor (Seção 4.1 e Quadro 1)
        </h2>
        <p class="text-down-01 text-muted mb-0">
          Mapeamento de Macroprocessos, Processos, Unidades e sua linha de supervisão (1ª Linha → CG → Diretoria)
        </p>
      </div>
      <BrButton
        variant="primary"
        icon="fas fa-plus-circle"
        @click="exibirFormularioNovo = !exibirFormularioNovo"
      >
        {{ exibirFormularioNovo ? 'Fechar Formulário' : 'Cadastrar Novo Objeto de Gestão' }}
      </BrButton>
    </div>

    <!-- Formulário de Novo Objeto de Contexto (Quadro 1) -->
    <BrCard
      v-if="exibirFormularioNovo"
      titulo="Novo Objeto de Gestão de Riscos (Quadro 1 — Estabelecimento do Contexto)"
      subtitulo="Defina a unidade responsável (1ª Linha), a Coordenação-Geral supervisora (2º Degrau) e a Diretoria (3º Degrau)"
      destaque-cor="#168821"
    >
      <div class="radar-grid-2 mb-3">
        <div>
          <label class="font-weight-bold d-block mb-1">Tipo de Objeto (Quadro 1):</label>
          <select v-model="tipoObjeto" class="w-100 p-2 rounded border">
            <option value="Macroprocesso">Macroprocesso</option>
            <option value="Processo">Processo</option>
            <option value="Projeto">Projeto</option>
            <option value="Plano">Plano</option>
            <option value="Ação">Ação</option>
            <option value="Unidade">Unidade</option>
          </select>
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Nome do Objeto / Processo:</label>
          <input
            v-model="nomeObjeto"
            type="text"
            placeholder="Ex.: Gestão de Contratos Continuados de Apoio às UCs"
            class="w-100 p-2 rounded border"
          />
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Unidade Responsável (1ª Linha):</label>
          <select v-model="unidadeId" class="w-100 p-2 rounded border">
            <option v-for="u in riscosStore.unidades" :key="u.id" :value="u.id">
              {{ u.sigla }} — {{ u.nome }} ({{ u.tipo }})
            </option>
          </select>
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Coordenação-Geral Supervisora (2º Degrau):</label>
          <select v-model="macroprocessoSupervisorId" class="w-100 p-2 rounded border">
            <option
              v-for="u in riscosStore.unidades.filter((x) => x.tipo === 'coordenacao-geral' || x.tipo === 'gerencia-regional')"
              :key="u.id"
              :value="u.id"
            >
              {{ u.sigla }} — {{ u.nome }}
            </option>
          </select>
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Objetivo Estratégico Associado:</label>
          <input
            v-model="objetivoEstrategicoAssociado"
            type="text"
            placeholder="Qual objetivo institucional este objeto sustenta?"
            class="w-100 p-2 rounded border"
          />
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Principais Entregas e Partes Interessadas:</label>
          <input
            v-model="entregasPrincipais"
            type="text"
            placeholder="Ex.: Termos de referência, atestes mensais e relatórios..."
            class="w-100 p-2 rounded border"
          />
        </div>
      </div>

      <div class="d-flex justify-content-end gap-2">
        <BrButton variant="secondary" @click="exibirFormularioNovo = false">
          Cancelar
        </BrButton>
        <BrButton variant="primary" icon="fas fa-save" @click="salvarObjeto">
          Salvar Objeto no Catálogo
        </BrButton>
      </div>
    </BrCard>

    <!-- Cards de Objetos Mapeados -->
    <div class="space-y-3">
      <BrCard
        v-for="obj in riscosStore.objetosContexto"
        :key="obj.id"
        :titulo="`[${obj.tipoObjeto}] ${obj.nomeObjeto}`"
        :subtitulo="`Ciclo ${obj.cicloAno} | 1ª Linha: ${obterSiglaUnidade(obj.unidadeId)} → 2º Degrau (CG): ${obterSiglaUnidade(obj.macroprocessoSupervisorId)} → 3º Degrau (Diretoria): ${obterSiglaUnidade(obj.diretoriaId)}`"
        destaque-cor="#1351b4"
      >
        <div class="radar-grid-2 mb-3 text-down-01">
          <div class="p-2 rounded" style="background-color: #f8fafc; border: 1px solid #e5e7eb;">
            <strong>Objetivo Estratégico Associado:</strong>
            <div>{{ obj.objetivoEstrategicoAssociado }}</div>
          </div>
          <div class="p-2 rounded" style="background-color: #f8fafc; border: 1px solid #e5e7eb;">
            <strong>Insumos &amp; Entregas Principais:</strong>
            <div>Insumos: {{ obj.insumosPrincipais }} | Entregas: {{ obj.entregasPrincipais }}</div>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2" style="border-top: 1px solid #eee;">
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span class="font-weight-bold text-down-01" style="color: #071d41;">
              Fichas de Risco Vinculadas ({{ riscosDoObjeto(obj.id).length }}):
            </span>
            <RouterLink
              v-for="r in riscosDoObjeto(obj.id)"
              :key="r.id"
              :to="`/riscos/${r.id}`"
              class="text-decoration-none d-inline-flex align-items-center gap-1 px-2 py-1 rounded border"
              style="background-color: #ffffff;"
            >
              <strong style="color: #1351b4;">{{ r.codigoRadar }}</strong>
              <BrBadge :classe-risco="r.classificacaoResidual" :texto="`${r.nivelResidual} (${r.classificacaoResidual})`" />
            </RouterLink>
          </div>

          <RouterLink
            :to="{ name: 'novo-risco' }"
            class="px-3 py-1 rounded-pill text-decoration-none font-weight-bold text-down-01"
            style="background-color: #dbe8fb; color: #1351b4;"
          >
            + Mapear Risco neste Objeto
          </RouterLink>
        </div>
      </BrCard>
    </div>
  </div>
</template>
