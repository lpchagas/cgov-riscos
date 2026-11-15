<script setup lang="ts">
/**
 * ============================================================================
 * RODAPÉ INSTITUCIONAL (`footer#footer`) — versão enxuta (Fase 4)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O rodapé antigo repetia em TODA página contato, fonte de dados, normas,
 * painéis e DIGITECA — no celular ele sozinho tinha ~860 px. Agora ele traz só
 * o essencial e aponta para a página "Sobre o RADAR" (`/sobre`), onde essas
 * informações ficam completas e organizadas:
 *
 *   gov.br   Sistema RADAR · ICMBio
 *   CGGE · CGOV · CTGRIC  (sigla + nome)
 *   Sobre o RADAR · Normas · Fontes de dados · Governança e contato · Painéis
 *   ─────────────────────────────────────────────────────────────────────
 *   © 2026 ICMBio · versão 1.0.0                          [redes sociais]
 *
 * Os textos vêm de `src/utils/sobreRadar.ts` — a MESMA fonte da página Sobre,
 * para as duas nunca discordarem.
 */
import { RouterLink } from 'vue-router';
import { ANO_RODAPE, REDES_SOCIAIS, SECOES_SOBRE, UNIDADES_RADAR, VERSAO_RADAR } from '../../utils/sobreRadar';
</script>

<template>
  <footer id="footer" class="rodape">
    <div class="rodape__miolo">
      <div class="rodape__topo">
        <span class="rodape__govbr" aria-hidden="true">gov.br</span>
        <p class="rodape__sistema">Sistema RADAR · ICMBio</p>
      </div>

      <ul class="rodape__unidades" aria-label="Unidades responsáveis">
        <li v-for="u in UNIDADES_RADAR" :key="u.sigla" class="rodape__unidade">
          <strong>{{ u.sigla }}</strong>
          <span>{{ u.nome }}</span>
        </li>
      </ul>

      <!-- Atalhos para cada seção da página Sobre (âncoras #id). -->
      <nav class="rodape__atalhos" aria-label="Informações sobre o RADAR">
        <ul class="rodape__lista">
          <li v-for="s in SECOES_SOBRE" :key="s.id">
            <RouterLink :to="{ name: 'sobre-radar', hash: `#${s.id}` }">
              {{ s.id === 'o-que-e' ? 'Sobre o RADAR' : s.titulo }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="rodape__base">
        <p>© {{ ANO_RODAPE }} ICMBio · Sistema RADAR versão {{ VERSAO_RADAR }}</p>
        <div class="rodape__redes">
          <template v-for="r in REDES_SOCIAIS" :key="r.rotulo">
            <a v-if="r.href" :href="r.href" class="rodape__rede" :aria-label="r.rotulo" :title="r.rotulo">
              <i :class="r.icone" aria-hidden="true"></i>
            </a>
            <span v-else class="rodape__rede" role="img" :aria-label="r.rotulo" :title="r.rotulo">
              <i :class="r.icone" aria-hidden="true"></i>
            </span>
          </template>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.rodape {
  margin-top: var(--esp-7);
  padding: var(--esp-6) var(--esp-6) var(--esp-4);
  background: var(--faixa-fundo);
  color: var(--faixa-texto);
}

/* O gov.br DS pinta <p> e <strong> de cinza-escuro; na faixa azul isso some
   (contraste 1,3:1). Aqui eles herdam a cor clara do rodapé. */
.rodape p,
.rodape strong {
  margin: 0;
  color: inherit;
}

.rodape a {
  color: var(--faixa-texto);
}

.rodape__miolo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
  max-width: var(--largura-conteudo-max);
  margin: 0 auto;
}

.rodape__topo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--esp-2) var(--esp-4);
}

.rodape__govbr {
  font-size: 2.125rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.rodape__sistema {
  font-weight: var(--peso-semi);
}

/* Unidades: 3 colunas no computador, empilhadas no celular. */
.rodape__unidades {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--esp-3) var(--esp-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rodape__unidade strong {
  display: block;
  font-size: var(--texto-md);
  line-height: 1.3;
}

.rodape__unidade span {
  font-size: 0.8125rem;
  color: var(--faixa-texto-suave);
}

/* Faixa de atalhos para a página Sobre, separada das unidades por um traço. */
.rodape__atalhos {
  padding-top: var(--esp-2);
  border-top: 1px solid var(--faixa-divisor);
}

.rodape__lista {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-5);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
}

/* Link com altura mínima de toque (WCAG 2.5.8) e sublinhado ao passar o mouse. */
.rodape__lista a {
  display: inline-flex;
  align-items: center;
  min-height: var(--alvo-minimo);
  color: var(--faixa-texto);
  text-decoration: underline;
  text-decoration-color: var(--faixa-divisor);
  text-underline-offset: 3px;
}

.rodape__lista a:hover {
  text-decoration-color: currentColor;
}

.rodape__base {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  padding-top: var(--esp-3);
  border-top: 1px solid var(--faixa-divisor);
  font-size: var(--texto-xs);
  color: var(--faixa-texto-suave);
}

.rodape__redes {
  display: flex;
  gap: var(--esp-1);
}

.rodape__rede {
  display: grid;
  place-items: center;
  width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  border-radius: 50%;
  font-size: 1.1rem;
  text-decoration: none;
}

a.rodape__rede:hover {
  background: var(--faixa-hover);
}

@media (max-width: 639.98px) {
  .rodape {
    padding: var(--esp-5) var(--esp-4) var(--esp-4);
  }
  .rodape__unidades {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--esp-2);
  }
  .rodape__lista {
    gap: 0 var(--esp-4);
  }
}
</style>
