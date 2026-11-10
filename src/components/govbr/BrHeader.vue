<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE CABEÇALHO OFICIAL GOV.BR (`br-header`) + SELETOR DE PERFIL
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Este componente aplica a estrutura HTML exata do Padrão Digital de Governo
 * (`header.br-header`) e inclui uma barra superior didática para você alternar
 * em 1 clique entre os 4 papéis das Portarias do ICMBio durante os testes e a
 * apresentação para a CGTI.
 */
import { useAuthStore } from '../../stores/authStore';
import type { PapelGovernanca } from '../../types/radar.types';
import { isSupabaseConfigurado } from '../../services/supabase';

const authStore = useAuthStore();

const opcoesPerfil: { papel: PapelGovernanca; rotulo: string }[] = [
  { papel: 'gestor', rotulo: '1º Degrau: Gestor (1ª Linha)' },
  { papel: 'lider_cg', rotulo: '2º Degrau: Coordenação-Geral (CG)' },
  { papel: 'diretor', rotulo: '3º Degrau: Diretoria' },
  { papel: 'cgov', rotulo: '2ª Linha: CGOV (Unidade Central)' },
];
</script>

<template>
  <header class="br-header mb-3" style="border-bottom: 3px solid #1351b4;">
    <div class="container-lg radar-container py-2">
      <div class="header-top d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="header-logo d-flex align-items-center gap-3">
          <span
            class="badge"
            style="background: #1351b4; color: #fff; font-weight: 700; padding: 0.45rem 0.8rem; border-radius: 4px;"
          >
            gov.br | ICMBio
          </span>
          <span class="text-up-01 text-weight-semi-bold" style="color: #071d41;">
            Instituto Chico Mendes de Conservação da Biodiversidade — MMA
          </span>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span
            class="br-tag"
            :style="{
              backgroundColor: isSupabaseConfigurado ? '#168821' : '#071d41',
              color: '#fff',
              padding: '0.25rem 0.65rem',
              borderRadius: '12px',
              fontSize: '0.78rem',
            }"
          >
            <i class="fas fa-database mr-1"></i>
            {{ isSupabaseConfigurado ? 'Conectado ao Supabase PostgreSQL' : 'Modo Demonstração CGTI (Seed Anexo II)' }}
          </span>
        </div>
      </div>

      <div class="header-bottom d-flex justify-content-between align-items-center flex-wrap mt-2 pt-2" style="border-top: 1px solid #e5e7eb;">
        <div>
          <h1 class="h4 mb-0" style="color: #1351b4; font-weight: 700;">
            RADAR — Rede de Avaliação, Diagnóstico e Ação em Riscos
          </h1>
          <p class="mb-0 text-down-01" style="color: #555;">
            Operacionalização da Política (SEI 024241420) e Metodologia de Gestão de Riscos (SEI 024421455) — Plano de Gestão de Riscos do ICMBio
          </p>
        </div>

        <!-- Alternador Didático de Perfil de Governança -->
        <div
          class="p-2 rounded"
          style="background-color: #dbe8fb; border: 1px solid #1351b4;"
        >
          <label for="seletor-perfil-demo" class="d-block text-down-01 font-weight-bold mb-1" style="color: #071d41;">
            <i class="fas fa-user-shield mr-1"></i>
            Simulador de Papel (3 Linhas de Governança):
          </label>
          <select
            id="seletor-perfil-demo"
            :value="authStore.usuarioAtual.papel"
            class="form-control form-control-sm"
            style="padding: 0.35rem 0.6rem; border-radius: 4px; border: 1px solid #1351b4; font-weight: 600;"
            @change="authStore.alternarPerfilDemo(($event.target as HTMLSelectElement).value as PapelGovernanca)"
          >
            <option v-for="op in opcoesPerfil" :key="op.papel" :value="op.papel">
              {{ op.rotulo }}
            </option>
          </select>
          <div class="text-down-02 mt-1" style="color: #071d41;">
            Atuando como: <strong>{{ authStore.usuarioAtual.nome }}</strong> ({{ authStore.usuarioAtual.unidadeSigla }})
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
