<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE CABEÇALHO OFICIAL GOV.BR (`header.br-header`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Segue rigorosamente a anatomia do Template Base (`gov.br/ds/templates/base`):
 * 1. `.header-top`:
 *    - `.header-logo` + `.br-divider.vertical` + `.header-sign` (MMA — ICMBio)
 *    - `.header-actions`: Links Rápidos Normativos, Funcionalidades do Sistema
 *      (incluindo Alternador de Alto Contraste, Modo de Layout Fluido/Centralizado
 *      e Status do Banco Supabase) e `.header-login` (Simulador de Papel das 3 Linhas).
 * 2. `.header-bottom`:
 *    - `.header-menu`: Gatilho `#header-navigation` (`button#navigation`) para
 *      abrir/recolher o `br-menu` lateral + `.header-info` (`.header-title` e `.header-subtitle`).
 *    - `.header-search#main-searchbox`: Busca global em tempo real integrada à `riscosStore`.
 */
import { useAuthStore } from '../../stores/authStore';
import { useRiscosStore } from '../../stores/riscosStore';
import type { PapelGovernanca } from '../../types/radar.types';
import { isSupabaseConfigurado } from '../../services/supabase';

defineProps<{
  menuAberto: boolean;
  altoContraste: boolean;
  layoutFluido: boolean;
  containerClass?: string;
}>();

const emit = defineEmits<{
  (e: 'alternar-menu'): void;
  (e: 'alternar-contraste'): void;
  (e: 'alternar-layout-fluido'): void;
}>();

const authStore = useAuthStore();
const riscosStore = useRiscosStore();

const opcoesPerfil: { papel: PapelGovernanca; rotulo: string }[] = [
  { papel: 'gestor', rotulo: '1º Degrau: Gestor (1ª Linha)' },
  { papel: 'lider_cg', rotulo: '2º Degrau: Coordenação-Geral (CG)' },
  { papel: 'diretor', rotulo: '3º Degrau: Diretoria' },
  { papel: 'cgov', rotulo: '2ª Linha: CGOV (Unidade Central)' },
];
</script>

<template>
  <header id="header" class="br-header mb-3" data-sticky style="border-bottom: 3px solid #1351b4;">
    <div :class="containerClass || 'container-fluid'">
      <!-- BLOCO SUPERIOR DO HEADER (.header-top) -->
      <div class="header-top d-flex justify-content-between align-items-center flex-wrap gap-2 py-1">
        <div class="header-logo d-flex align-items-center gap-2">
          <span
            class="badge"
            style="background: #1351b4; color: #fff; font-weight: 800; padding: 0.4rem 0.75rem; border-radius: 4px; letter-spacing: -0.02em;"
          >
            gov.br
          </span>
          <span class="br-divider vertical mx-1" style="height: 20px;"></span>
          <span class="header-sign text-down-01 font-weight-semi-bold" style="color: #071d41;">
            Ministério do Meio Ambiente e Mudança do Clima — <strong>ICMBio</strong>
          </span>
        </div>

        <div class="header-actions d-flex align-items-center flex-wrap gap-2">
          <!-- Status de Conexão Supabase / Seed Anexo II -->
          <span
            class="br-tag"
            :style="{
              backgroundColor: isSupabaseConfigurado ? '#168821' : '#071d41',
              color: '#fff',
              padding: '0.2rem 0.65rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
            }"
          >
            <i class="fas fa-database mr-1" aria-hidden="true"></i>
            {{ isSupabaseConfigurado ? 'Supabase PostgreSQL Ativo' : 'Modo CGTI (Seed Oficial Anexo II)' }}
          </span>

          <span class="br-divider vertical mx-1 d-none d-md-inline-block" style="height: 20px;"></span>

          <!-- Funcionalidades do Sistema (.header-functions) -->
          <div class="header-functions d-flex align-items-center gap-1">
            <button
              type="button"
              class="br-button circle small"
              :title="layoutFluido ? 'Alternar para Container Centralizado (container-lg)' : 'Alternar para Container Fluido (container-fluid)'"
              aria-label="Alternar largura do layout"
              @click="emit('alternar-layout-fluido')"
            >
              <i class="fas" :class="layoutFluido ? 'fa-compress-arrows-alt' : 'fa-expand-arrows-alt'" aria-hidden="true"></i>
            </button>

            <button
              type="button"
              class="br-button circle small"
              title="Alternar Modo de Alto Contraste (Acessibilidade Gov.br)"
              aria-label="Alternar Alto Contraste"
              @click="emit('alternar-contraste')"
            >
              <i class="fas fa-adjust" aria-hidden="true"></i>
            </button>
          </div>

          <span class="br-divider vertical mx-1 d-none d-md-inline-block" style="height: 20px;"></span>

          <!-- Simulador de Perfil nas 3 Linhas (.header-login) -->
          <div
            class="header-login d-flex align-items-center gap-2 px-2 py-1 rounded"
            style="background-color: #dbe8fb; border: 1px solid #1351b4;"
          >
            <label
              for="seletor-perfil-demo"
              class="mb-0 text-down-02 font-weight-bold d-none d-sm-inline"
              style="color: #071d41;"
            >
              <i class="fas fa-user-shield mr-1" aria-hidden="true"></i>
              Papel:
            </label>
            <select
              id="seletor-perfil-demo"
              :value="authStore.usuarioAtual.papel"
              aria-label="Simulador de Papel nas 3 Linhas de Governança"
              style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #1351b4; font-weight: 700; font-size: 0.78rem; color: #071d41; background: #fff;"
              @change="authStore.alternarPerfilDemo(($event.target as HTMLSelectElement).value as PapelGovernanca)"
            >
              <option v-for="op in opcoesPerfil" :key="op.papel" :value="op.papel">
                {{ op.rotulo }}
              </option>
            </select>
            <span class="badge d-none d-xl-inline-block" style="background: #071d41; color: #fff; font-size: 0.72rem; padding: 0.2rem 0.45rem; border-radius: 4px;">
              {{ authStore.usuarioAtual.unidadeSigla }}
            </span>
          </div>
        </div>
      </div>

      <!-- BLOCO INFERIOR DO HEADER (.header-bottom) -->
      <div
        class="header-bottom d-flex justify-content-between align-items-center flex-wrap gap-3 mt-1 pt-2 pb-1"
        style="border-top: 1px solid #e5e7eb;"
      >
        <div class="header-menu d-flex align-items-center gap-3">
          <div id="header-navigation" class="header-menu-trigger">
            <button
              id="navigation"
              type="button"
              class="br-button small circle"
              aria-label="Alternar Menu Principal"
              :aria-expanded="menuAberto"
              data-toggle="menu"
              data-target="#main-navigation"
              style="border: 1px solid #1351b4; color: #1351b4; background-color: #dbe8fb;"
              @click="emit('alternar-menu')"
            >
              <i class="fas" :class="menuAberto ? 'fa-times' : 'fa-bars'" aria-hidden="true"></i>
            </button>
          </div>

          <div class="header-info">
            <div class="header-title h5 mb-0 font-weight-bold" style="color: #1351b4;">
              RADAR — Rede de Avaliação, Diagnóstico e Ação em Riscos
            </div>
            <div class="header-subtitle text-down-01" style="color: #555;">
              Plano de Gestão de Riscos do ICMBio — Política (SEI 024241420) e Metodologia (SEI 024421455)
            </div>
          </div>
        </div>

        <!-- Caixa de Busca Oficial (#main-searchbox) -->
        <div id="main-searchbox" class="header-search d-flex align-items-center" style="min-width: 280px; flex: 0 1 360px;">
          <div class="br-input has-icon w-100">
            <label for="searchbox-radar" class="sr-only">Pesquisar no Sistema RADAR</label>
            <input
              id="searchbox-radar"
              v-model="riscosStore.termoBuscaGlobal"
              type="search"
              placeholder="Buscar por código RADAR, objeto, categoria ou KRI..."
              style="width: 100%; padding: 0.45rem 2.2rem 0.45rem 0.75rem; border-radius: 20px; border: 1px solid #1351b4; font-size: 0.82rem;"
            />
            <button
              v-if="riscosStore.termoBuscaGlobal"
              type="button"
              class="br-button circle small"
              aria-label="Limpar pesquisa"
              style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%);"
              @click="riscosStore.termoBuscaGlobal = ''"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
