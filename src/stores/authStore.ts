/**
 * ============================================================================
 * STORE DE AUTENTICAÇÃO E SIMULADOR DE PERFIS DE GOVERNANÇA (3 LINHAS)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Uma "Store" do Pinia é uma memória compartilhada entre todas as telas do
 * aplicativo. Aqui guardamos quem é o servidor logado e qual papel ele exerce
 * na governança de riscos do ICMBio:
 * - 'gestor': 1ª Linha (elabora a ficha de risco e registra medições de KRI);
 * - 'lider_cg': Coordenador-Geral supervisor de Macroprocesso (aprova em 1 clique no 2º degrau);
 * - 'diretor': Diretor (homologa Riscos Críticos em 1 clique no 3º degrau);
 * - 'cgov': 2ª Linha — Unidade Central (importa tabelas da skill, simula DAR e consolida o Plano de Gestão de Riscos).
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PapelGovernanca } from '../types/radar.types';

export interface PerfilUsuarioDemo {
  id: string;
  nome: string;
  cargo: string;
  unidadeSigla: string;
  papel: PapelGovernanca;
}

export const PERFIS_DEMO_ICMBIO: Record<PapelGovernanca, PerfilUsuarioDemo> = {
  gestor: {
    id: 'usr-gestor-1',
    nome: 'Servidor Ponto Focal (1ª Linha)',
    cargo: 'Analista Ambiental — Gestor de Processo',
    unidadeSigla: 'PARNA Brasília / Unidade Técnica',
    papel: 'gestor',
  },
  lider_cg: {
    id: 'usr-cg-1',
    nome: 'Coordenador(a)-Geral de Macroprocesso',
    cargo: 'Coordenador-Geral (CGGE / Supervisão de Macroprocesso)',
    unidadeSigla: 'CGGE',
    papel: 'lider_cg',
  },
  diretor: {
    id: 'usr-dir-1',
    nome: 'Diretor(a) Setorial (Alta Administração)',
    cargo: 'Diretor de Planejamento, Administração e Logística',
    unidadeSigla: 'DIPLAN',
    papel: 'diretor',
  },
  cgov: {
    id: 'usr-cgov-1',
    nome: 'Analista da CGOV (2ª Linha — Unidade Central)',
    cargo: 'Equipe Técnica de Governança e Gestão de Riscos',
    unidadeSigla: 'CGOV',
    papel: 'cgov',
  },
};

export const useAuthStore = defineStore('auth', () => {
  const usuarioAtual = ref<PerfilUsuarioDemo>(PERFIS_DEMO_ICMBIO.cgov);

  function alternarPerfilDemo(papel: PapelGovernanca): void {
    usuarioAtual.value = PERFIS_DEMO_ICMBIO[papel];
  }

  const podeAprovarCg = computed(
    () => usuarioAtual.value.papel === 'lider_cg' || usuarioAtual.value.papel === 'cgov'
  );

  const podeHomologarDiretoria = computed(
    () => usuarioAtual.value.papel === 'diretor' || usuarioAtual.value.papel === 'cgov'
  );

  const isCgov = computed(() => usuarioAtual.value.papel === 'cgov');

  return {
    usuarioAtual,
    perfisDisponiveisDemo: PERFIS_DEMO_ICMBIO,
    alternarPerfilDemo,
    podeAprovarCg,
    podeHomologarDiretoria,
    isCgov,
  };
});
