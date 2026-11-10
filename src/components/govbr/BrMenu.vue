<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE MENU PRINCIPAL GOV.BR (`div.br-menu.push#main-navigation`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Implementa o menu lateral hierárquico do Template Base (`gov.br/ds/templates/base`),
 * organizado em 3 pastas (`div.menu-folder`) correspondentes às Linhas de Governança
 * da Política RADAR (SEI 024241420) e da Metodologia (SEI 024421455):
 * - Pasta 1: Governança & Estratégia (2ª Linha — CGOV / CTGRIC / CIG)
 * - Pasta 2: Ciclo Operacional (1ª Linha — Unidades, Processos, Bow Tie, KRIs e 5W2H)
 * - Pasta 3: Supervisão, 1 Clique & Auditoria (2º e 3º Degraus — CGs e Diretorias)
 */
import { RouterLink, useRoute } from 'vue-router';
import { useRiscosStore } from '../../stores/riscosStore';

defineProps<{
  aberto: boolean;
}>();

const emit = defineEmits<{
  (e: 'fechar'): void;
}>();

const route = useRoute();
const riscosStore = useRiscosStore();

function isRotaAtiva(caminho: string): boolean {
  if (caminho === '/') return route.path === '/';
  return route.path.startsWith(caminho);
}
</script>

<template>
  <aside
    v-show="aberto"
    id="main-navigation"
    class="br-menu push active col-12 col-md-4 col-lg-3 pl-0 pr-md-3 mb-4"
    aria-label="Menu Principal do Sistema RADAR"
  >
    <div class="menu-container position-static">
      <div
        class="menu-panel h-auto position-static rounded shadow-sm"
        style="background-color: #ffffff; border: 1px solid #dcdcdc; overflow: hidden;"
      >
        <!-- Cabeçalho do Menu (.menu-header) -->
        <div
          class="menu-header d-flex justify-content-between align-items-center px-3 py-2"
          style="background-color: #071d41; color: #ffffff;"
        >
          <div class="menu-title d-flex align-items-center gap-2">
            <i class="fas fa-compass" aria-hidden="true"></i>
            <span class="font-weight-bold text-down-01">Navegação RADAR</span>
          </div>
          <div class="menu-close d-md-none">
            <button
              type="button"
              class="br-button circle small"
              aria-label="Fechar o menu"
              style="color: #fff;"
              @click="emit('fechar')"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <!-- Corpo Hierárquico do Menu (nav.menu-body) -->
        <nav class="menu-body p-2">
          <!-- PASTA 1: GOVERNANÇA & ESTRATÉGIA (2ª LINHA) -->
          <div class="menu-folder active mb-2">
            <div
              class="px-2 py-1 rounded text-down-02 font-weight-bold text-uppercase"
              style="background-color: #dbe8fb; color: #071d41;"
            >
              1. Governança &amp; Estratégia (2ª Linha)
            </div>
            <ul class="list-unstyled mt-1 mb-0">
              <li>
                <RouterLink
                  to="/"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-chart-pie mr-2" aria-hidden="true"></i>
                    Painel do Plano de Gestão de Riscos
                  </span>
                  <span
                    class="badge"
                    :style="{
                      backgroundColor: isRotaAtiva('/') ? '#ffffff' : '#dbe8fb',
                      color: '#071d41',
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '10px',
                    }"
                  >
                    {{ riscosStore.riscos.length }}
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  to="/dar-apetite"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/dar-apetite') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/dar-apetite') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-sliders-h mr-2" aria-hidden="true"></i>
                    Declaração de Apetite (DAR)
                  </span>
                  <span
                    class="badge"
                    style="background-color: #fde0db; color: #c91c00; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 10px;"
                    title="Total de Riscos Críticos fora do apetite da DAR"
                  >
                    {{ riscosStore.riscosCriticosCarteira.length }} crít.
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>

          <!-- PASTA 2: CICLO OPERACIONAL (1ª LINHA) -->
          <div class="menu-folder active mb-2">
            <div
              class="px-2 py-1 rounded text-down-02 font-weight-bold text-uppercase"
              style="background-color: #dbe8fb; color: #071d41;"
            >
              2. Ciclo Operacional (1ª Linha)
            </div>
            <ul class="list-unstyled mt-1 mb-0">
              <li>
                <RouterLink
                  to="/objetos"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/objetos') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/objetos') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-sitemap mr-2" aria-hidden="true"></i>
                    Catálogo de Objetos &amp; Processos
                  </span>
                  <span
                    class="badge"
                    style="background-color: #e5e7eb; color: #333; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 10px;"
                  >
                    {{ riscosStore.objetosContexto.length }}
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  to="/novo-risco"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/novo-risco') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/novo-risco') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-plus-circle mr-2" aria-hidden="true"></i>
                    Assistente Guiado Bow Tie
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  :to="`/riscos/${riscosStore.riscos[0]?.id || 'risco-anexo-ii-01'}`"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/riscos/') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/riscos/') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-project-diagram mr-2" aria-hidden="true"></i>
                    Ficha Visual Bow Tie &amp; Dossiê
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  to="/monitoramento-kris"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/monitoramento-kris') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/monitoramento-kris') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-heartbeat mr-2" aria-hidden="true"></i>
                    Sala de Situação KRIs &amp; 5W2H
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>

          <!-- PASTA 3: SUPERVISÃO, 1 CLIQUE & PASSO 0 -->
          <div class="menu-folder active">
            <div
              class="px-2 py-1 rounded text-down-02 font-weight-bold text-uppercase"
              style="background-color: #dbe8fb; color: #071d41;"
            >
              3. Deliberação (2º e 3º Degraus)
            </div>
            <ul class="list-unstyled mt-1 mb-0">
              <li>
                <RouterLink
                  to="/validacao-um-clique"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/validacao-um-clique') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/validacao-um-clique') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-check-double mr-2" aria-hidden="true"></i>
                    Caixa Validação em 1 Clique
                  </span>
                  <span
                    class="badge"
                    style="background-color: #fff5c2; color: #8a6d00; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 10px; font-weight: 700;"
                  >
                    CG:{{ riscosStore.filaValidacaoCg.length }} | Dir:{{ riscosStore.filaHomologacaoDiretoria.length }}
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  to="/auditoria"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/auditoria') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/auditoria') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-history mr-2" aria-hidden="true"></i>
                    Trilha de Auditoria
                  </span>
                  <span
                    class="badge"
                    style="background-color: #e5e7eb; color: #333; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 10px;"
                  >
                    {{ riscosStore.trilhaAuditoriaGlobal.length }}
                  </span>
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  to="/importar-skill"
                  class="menu-item d-flex justify-content-between align-items-center px-2 py-2 rounded text-decoration-none text-down-01 font-weight-semi-bold"
                  :style="{
                    backgroundColor: isRotaAtiva('/importar-skill') ? '#1351b4' : 'transparent',
                    color: isRotaAtiva('/importar-skill') ? '#ffffff' : '#071d41',
                  }"
                >
                  <span>
                    <i class="fas fa-file-import mr-2" aria-hidden="true"></i>
                    Passo 0: Importador Skill CGOV
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </nav>

        <!-- Rodapé do Menu (.menu-footer) -->
        <div
          class="menu-footer px-3 py-2 text-down-02"
          style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; color: #555;"
        >
          <div class="font-weight-bold" style="color: #071d41;">
            Regras Invioláveis Ativas:
          </div>
          <div>• Quadro 7: Matriz Assimétrica 5×5</div>
          <div>• Quadro 8: Sem arredondamento prévio</div>
          <div>• Quadro 6: Trava de Evidência (0,9)</div>
        </div>
      </div>
    </div>
  </aside>
</template>
