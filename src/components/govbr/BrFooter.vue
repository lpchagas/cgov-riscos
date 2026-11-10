<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE DE RODAPÉ OFICIAL GOV.BR (`footer.br-footer#footer`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Implementa o quarto bloco estrutural do Template Base (`gov.br/ds/templates/base`),
 * apresentando o mapa institucional de navegação do Sistema RADAR, as referências
 * normativas do SEI e a chancela da CGOV/CGGE/DIPLAN/ICMBio.
 */
import { RouterLink } from 'vue-router';

defineProps<{
  containerClass?: string;
}>();
</script>

<template>
  <footer id="footer" class="br-footer pt-4 mt-5" style="background-color: #071d41; color: #ffffff;">
    <div :class="containerClass || 'container-fluid'">
      <div class="row pb-3">
        <div class="col-12 col-md-4 mb-3">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span
              class="px-2 py-1 rounded font-weight-bold"
              style="background-color: #1351b4; color: #ffffff; font-size: 0.9rem;"
            >
              gov.br | ICMBio
            </span>
            <strong class="text-up-01">Sistema Web RADAR</strong>
          </div>
          <p class="text-down-01 mb-2" style="color: #dbe8fb; line-height: 1.45;">
            Rede de Avaliação, Diagnóstico e Ação em Riscos — Plataforma oficial de suporte ao
            <strong>Plano de Gestão de Riscos</strong> do Instituto Chico Mendes de Conservação da Biodiversidade.
          </p>
          <div class="text-down-02" style="color: #c5d4eb;">
            Coordenação de Governança e Gestão de Riscos (CGOV/CGGE/DIPLAN)
          </div>
        </div>

        <div class="col-6 col-md-3 mb-3">
          <div class="text-down-01 font-weight-bold text-uppercase mb-2" style="color: #c5d4eb;">
            Módulos de Governança
          </div>
          <ul class="list-unstyled text-down-01 mb-0" style="line-height: 1.8;">
            <li>
              <RouterLink to="/" class="text-white text-decoration-none">
                Painel do Plano de Gestão de Riscos
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/dar-apetite" class="text-white text-decoration-none">
                Declaração de Apetite a Riscos (DAR)
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/objetos" class="text-white text-decoration-none">
                Catálogo de Objetos &amp; Macroprocessos
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/monitoramento-kris" class="text-white text-decoration-none">
                Sala de Situação de KRIs &amp; Planos 5W2H
              </RouterLink>
            </li>
          </ul>
        </div>

        <div class="col-6 col-md-3 mb-3">
          <div class="text-down-01 font-weight-bold text-uppercase mb-2" style="color: #c5d4eb;">
            Arcabouço Normativo (Regime B)
          </div>
          <ul class="list-unstyled text-down-01 mb-0" style="color: #dbe8fb; line-height: 1.8;">
            <li>• Política RADAR — Minuta SEI <code>024241420</code></li>
            <li>• Metodologia RADAR — SEI <code>024421455</code></li>
            <li>• Programa Integra+ — Portaria nº 253/2026</li>
            <li>• Matriz Assimétrica 5×5 (Quadro 7) &amp; DAR</li>
          </ul>
        </div>

        <div class="col-12 col-md-2 mb-3">
          <div class="text-down-01 font-weight-bold text-uppercase mb-2" style="color: #c5d4eb;">
            Padrão Digital
          </div>
          <div class="text-down-02" style="color: #dbe8fb; line-height: 1.6;">
            Construído sobre o <strong>Template Base</strong> do <code>@govbr-ds/core</code>, com acessibilidade WCAG 2.1, suporte a Alto Contraste e segurança PostgreSQL RLS.
          </div>
        </div>
      </div>

      <span class="br-divider my-2" style="border-color: rgba(255, 255, 255, 0.2);"></span>

      <div class="info py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="text-down-01 text-medium">
          Ministério do Meio Ambiente e Mudança do Clima — <strong>ICMBio</strong> | Disciplina terminológica CGOV (Plano de Gestão de Riscos por extenso)
        </div>
        <div class="text-down-02" style="color: #c5d4eb;">
          Template Base GovBR-DS v3.x
        </div>
      </div>
    </div>
  </footer>
</template>
