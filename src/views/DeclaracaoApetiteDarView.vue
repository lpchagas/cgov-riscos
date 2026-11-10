<script setup lang="ts">
/**
 * ============================================================================
 * GOVERNANÇA DA DECLARAÇÃO DE APETITE A RISCOS — DAR (`DeclaracaoApetiteDarView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta página operacionaliza o Anexo III (Declaração de Apetite a Riscos — DAR) e os
 * Quadros 2 e 3 da Metodologia RADAR (SEI 024421455), incluindo o Teste de
 * Integridade do Programa Integra+ (Portaria ICMBio nº 253/2026).
 * Nela, a CGOV (2ª Linha) e o Comitê Interno de Governança (CIG) visualizam e
 * calibram o limite de apetite das 8 categorias e simulam o impacto em tempo real
 * sobre a Carteira de Riscos Críticos do Plano de Gestão de Riscos.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import type { ApetiteDeclarado } from '../types/radar.types';
import { SUBCATEGORIAS_INTEGRIDADE_QUADRO_3 } from '../utils/calculadoraRiscoRadar';
import BrCard from '../components/govbr/BrCard.vue';
import BrBadge from '../components/govbr/BrBadge.vue';
import BrMessage from '../components/govbr/BrMessage.vue';

const riscosStore = useRiscosStore();
const authStore = useAuthStore();

const totalApetiteBaixo = computed(
  () => riscosStore.categorias.filter((c) => c.apetiteDeclarado === 'baixo').length
);

const totalApetiteModerado = computed(
  () => riscosStore.categorias.filter((c) => c.apetiteDeclarado === 'moderado').length
);

function contarRiscosDaCategoria(categoriaId: number): number {
  return riscosStore.riscos.filter((r) => r.categoriaId === categoriaId).length;
}

function contarCriticosDaCategoria(categoriaId: number): number {
  return riscosStore.riscos.filter(
    (r) => r.categoriaId === categoriaId && r.statusCritico === 'sim'
  ).length;
}
</script>

<template>
  <div>
    <BrMessage
      state="info"
      titulo="Regra Normativa da DAR (Anexo III — SEI 024421455):"
    >
      <strong>Risco Crítico</strong> não é sinônimo de risco "Extremo (18–25)". No Sistema RADAR,
      <strong>Risco Crítico</strong> é todo risco cujo <strong>Nível Residual</strong> ultrapassa o limite
      declarado na <strong>DAR</strong> para a sua categoria (ex.: em categoria de apetite <strong>Baixo</strong>,
      qualquer residual acima de 5,0 — Médio, Alto ou Extremo — torna-se imediatamente Crítico e exige
      homologação do 3º Degrau / Diretoria).
    </BrMessage>

    <!-- KPIs da DAR -->
    <div class="radar-grid-4 mb-3">
      <BrCard titulo="Categorias do Quadro 2" destaque-cor="#1351b4">
        <div class="h2 mb-0 font-weight-bold" style="color: #1351b4;">
          {{ riscosStore.categorias.length }}
        </div>
        <small class="text-muted">Categorias oficiais (vedada categoria mista)</small>
      </BrCard>

      <BrCard titulo="Categorias com Apetite Baixo (≤ 5)" destaque-cor="#168821">
        <div class="h2 mb-0 font-weight-bold" style="color: #168821;">
          {{ totalApetiteBaixo }}
        </div>
        <small class="text-muted">Inclui Integridade, Socioambiental e Legal</small>
      </BrCard>

      <BrCard titulo="Categorias com Apetite Moderado (≤ 10)" destaque-cor="#ffcd07">
        <div class="h2 mb-0 font-weight-bold" style="color: #8a6d00;">
          {{ totalApetiteModerado }}
        </div>
        <small class="text-muted">Toleram residual Baixo e Médio sob KRI</small>
      </BrCard>

      <BrCard titulo="Carteira Atual de Riscos Críticos" destaque-cor="#e52207">
        <div class="h2 mb-0 font-weight-bold" style="color: #e52207;">
          {{ riscosStore.riscosCriticosCarteira.length }}
        </div>
        <small class="text-muted">Exigem tratamento prioritário e 3º Degrau</small>
      </BrCard>
    </div>

    <!-- Destaque Programa Integra+ (Quadro 3) -->
    <BrCard
      titulo="Programa Integra+ (Portaria ICMBio nº 253/2026) — As 6 Subcategorias Obrigatórias do Quadro 3"
      subtitulo="É expressamente vedado utilizar a categoria mista 'Operacional com interface de Integridade'"
      destaque-cor="#071d41"
    >
      <p class="text-down-01 mb-2">
        Sempre que o processo envolver decisão sobre beneficiário, licença/autorização, fiscalização/sanção
        ou contratação/atestação, aplica-se o <strong>Teste de Integridade</strong> com uma das 6 subcategorias abaixo:
      </p>
      <div class="d-flex flex-wrap gap-2">
        <span
          v-for="(sub, idx) in SUBCATEGORIAS_INTEGRIDADE_QUADRO_3"
          :key="sub"
          class="px-3 py-1 rounded font-weight-semi-bold text-down-01"
          style="background-color: #dbe8fb; color: #071d41; border: 1px solid #1351b4;"
        >
          {{ idx + 1 }}. {{ sub }}
        </span>
      </div>
    </BrCard>

    <!-- Tabela e Simulador Interativo das 8 Categorias na DAR -->
    <BrCard
      titulo="Matriz de Calibragem da Declaração de Apetite a Riscos (DAR — Anexo III)"
      subtitulo="No perfil CGOV (2ª Linha), altere o apetite abaixo para recalcular instantaneamente toda a Carteira de Riscos Críticos"
      destaque-cor="#1351b4"
    >
      <div class="table-responsive">
        <table class="table table-bordered" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #071d41; color: #ffffff;">
              <th class="p-2 text-left">Categoria (Quadro 2)</th>
              <th class="p-2 text-left">Definição e Diretriz na DAR</th>
              <th class="p-2 text-left" style="min-width: 230px;">Apetite Declarado (DAR)</th>
              <th class="p-2 text-center">Riscos / Críticos</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cat in riscosStore.categorias"
              :key="cat.id"
              style="border-bottom: 1px solid #e5e7eb;"
            >
              <td class="p-2 align-top">
                <strong style="color: #071d41;">{{ cat.id }}. {{ cat.nome }}</strong>
                <div v-if="cat.nome === 'Integridade'" class="mt-1">
                  <span
                    class="badge"
                    style="background-color: #071d41; color: #fff; font-size: 0.7rem; padding: 0.2rem 0.45rem; border-radius: 4px;"
                  >
                    Integra+ (Port. 253/2026)
                  </span>
                </div>
              </td>

              <td class="p-2 align-top text-down-01">
                <div class="mb-1">{{ cat.descricaoNormativa }}</div>
                <input
                  :value="cat.justificativaDar"
                  :disabled="!authStore.isCgov"
                  type="text"
                  class="w-100 p-1 rounded border text-down-01"
                  style="background-color: #f8fafc;"
                  @change="
                    riscosStore.atualizarJustificativaCategoriaDAR(
                      cat.id,
                      ($event.target as HTMLInputElement).value
                    )
                  "
                />
              </td>

              <td class="p-2 align-top">
                <select
                  :value="cat.apetiteDeclarado"
                  :disabled="!authStore.isCgov"
                  class="w-100 p-2 rounded font-weight-bold"
                  style="border: 1px solid #1351b4; color: #071d41;"
                  @change="
                    riscosStore.alterarApetiteCategoriaDAR(
                      cat.id,
                      ($event.target as HTMLSelectElement).value as ApetiteDeclarado
                    )
                  "
                >
                  <option value="baixo">Baixo (Aceita até nota 5,0)</option>
                  <option value="moderado">Moderado (Aceita até nota 10,0)</option>
                  <option value="pendente_dar">Pendente de DAR (Aguarda CIG)</option>
                </select>
                <small v-if="!authStore.isCgov" class="d-block text-muted mt-1">
                  Selecione o perfil "2ª Linha: CGOV" no topo para editar.
                </small>
              </td>

              <td class="p-2 align-top text-center">
                <span class="px-2 py-1 rounded font-weight-bold mr-1" style="background: #e5e7eb;">
                  {{ contarRiscosDaCategoria(cat.id) }} total
                </span>
                <span
                  class="px-2 py-1 rounded font-weight-bold"
                  :style="{
                    backgroundColor: contarCriticosDaCategoria(cat.id) > 0 ? '#fde0db' : '#e3f5e1',
                    color: contarCriticosDaCategoria(cat.id) > 0 ? '#c91c00' : '#168821',
                  }"
                >
                  {{ contarCriticosDaCategoria(cat.id) }} crítico(s)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BrCard>

    <!-- Lista de Riscos Críticos Impactados pela DAR -->
    <BrCard
      titulo="Riscos Atualmente Enquadrados como Críticos frente à DAR"
      subtitulo="Fichas cujo Nível Residual supera o apetite institucional definido acima"
      destaque-cor="#e52207"
    >
      <div
        v-for="risco in riscosStore.riscosCriticosCarteira"
        :key="risco.id"
        class="p-3 mb-2 rounded d-flex justify-content-between align-items-center flex-wrap gap-2"
        style="border: 1px solid #f8a99f; background-color: #fffafa;"
      >
        <div>
          <strong style="color: #1351b4;">[{{ risco.codigoRadar }}]</strong>
          <strong class="ml-1">{{ risco.nomeObjetoCache }}</strong>
          <span class="ml-2 text-down-01 text-muted">
            ({{ risco.categoriaNome }} — Residual: <strong>{{ risco.nivelResidual }}</strong>)
          </span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <BrBadge :classe-risco="risco.classificacaoResidual" />
          <RouterLink
            :to="`/riscos/${risco.id}`"
            class="px-3 py-1 rounded-pill text-decoration-none font-weight-bold text-down-01"
            style="background-color: #1351b4; color: #ffffff;"
          >
            Abrir Dossiê Bow Tie
          </RouterLink>
        </div>
      </div>
    </BrCard>
  </div>
</template>
