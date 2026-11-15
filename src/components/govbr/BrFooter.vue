<script setup lang="ts">
/**
 * ============================================================================
 * RODAPÉ INSTITUCIONAL (`footer.br-footer#footer`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Segue o rodapé do Painel BI da CGOV (aprovado no protótipo da Fase 2):
 *
 *   gov.br
 *   CGGE / CGOV      │ CTGRIC          ┃ Painéis Integrados ICMBio (links)
 *   Contato · fonte de dados · normas            DIGITECA ICMBio
 *   ─────────────────────────────────────────────────────────────────
 *   Créditos · © 2026 ICMBio                              [redes sociais]
 *
 * Os textos ficam em LISTAS (constantes) no topo do script: para trocar um
 * link ou incluir uma unidade, basta editar a lista — o HTML não muda.
 *
 * PENDENTE (decisão da CGOV): os endereços reais dos links internos e o
 * e-mail de contato. Enquanto isso, os itens sem endereço aparecem como texto
 * (e não como link "vazio", que confundiria quem usa leitor de tela).
 */

interface Unidade {
  sigla: string;
  nome: string;
}

/** Coluna 1: as unidades responsáveis pelo RADAR. */
const UNIDADES_RESPONSAVEIS: Unidade[] = [
  { sigla: 'CGGE', nome: 'Coordenação-Geral de Governança e Gestão Estratégica' },
  { sigla: 'CGOV', nome: 'Coordenação de Governança' },
];

/** Coluna 2: a instância colegiada que acompanha a gestão de riscos. */
const INSTANCIAS_COLEGIADAS: Unidade[] = [
  { sigla: 'CTGRIC', nome: 'Comitê Técnico de Governança, Riscos, Integridade e Controles' },
];

/** Coluna 3: painéis irmãos. `href` vazio = ainda sem endereço definido. */
const PAINEIS_INTEGRADOS: { rotulo: string; href?: string }[] = [
  { rotulo: 'Painéis Dinâmicos do ICMBio' },
  { rotulo: 'Painéis de Indicadores de Gestão de Pessoas' },
  { rotulo: 'Indicadores do Programa de Gestão e Desempenho' },
];

/**
 * Redes sociais oficiais do ICMBio. Preencha `href` com o endereço oficial
 * confirmado pela Ascom; sem `href`, o ícone aparece sem ser clicável.
 */
const REDES_SOCIAIS: { rotulo: string; icone: string; href?: string }[] = [
  { rotulo: 'Instagram do ICMBio', icone: 'fa-brands fa-instagram' },
  { rotulo: 'YouTube do ICMBio', icone: 'fa-brands fa-youtube' },
  { rotulo: 'Facebook do ICMBio', icone: 'fa-brands fa-facebook-f' },
  { rotulo: 'LinkedIn do ICMBio', icone: 'fa-brands fa-linkedin-in' },
];

const ANO = 2026;
</script>

<template>
  <footer id="footer" class="rodape">
    <div class="rodape__miolo">
      <span class="rodape__govbr" aria-hidden="true">gov.br</span>

      <div class="rodape__grade">
        <div>
          <p v-for="u in UNIDADES_RESPONSAVEIS" :key="u.sigla" class="rodape__unidade">
            <strong>{{ u.sigla }}</strong>
            <span>{{ u.nome }}</span>
          </p>
        </div>
        <div>
          <p v-for="u in INSTANCIAS_COLEGIADAS" :key="u.sigla" class="rodape__unidade">
            <strong>{{ u.sigla }}</strong>
            <span>{{ u.nome }}</span>
          </p>
        </div>
        <div class="rodape__linha-vertical" aria-hidden="true"></div>
        <nav aria-label="Painéis integrados do ICMBio">
          <p class="rodape__titulo">Painéis Integrados ICMBio</p>
          <ul class="rodape__lista">
            <li v-for="p in PAINEIS_INTEGRADOS" :key="p.rotulo">
              <a v-if="p.href" :href="p.href">{{ p.rotulo }}</a>
              <span v-else>{{ p.rotulo }}</span>
            </li>
          </ul>
        </nav>
      </div>

      <div class="rodape__meio">
        <div>
          <p>Contato: Coordenação de Governança (CGOV/CGGE)</p>
          <p>Fonte de dados: fichas de risco das unidades no Sistema RADAR</p>
          <p class="rodape__normas">
            Política RADAR (Minuta SEI 024241420) · Metodologia (Minuta SEI 024421455) ·
            Integra+ (Portaria ICMBio nº 253/2026)
          </p>
        </div>
        <div class="rodape__digiteca">
          <p class="rodape__digiteca-nome">DIGITECA ICMBio</p>
          <p class="rodape__suave">Biblioteca de Listas, Padrões e Soluções Digitais</p>
        </div>
      </div>

      <div class="rodape__base">
        <div>
          <p>Informações alimentadas pelas unidades (1ª Linha) e consolidadas pela Coordenação de Governança.</p>
          <p>© {{ ANO }} ICMBio. Todos os direitos reservados.</p>
        </div>
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
  padding: var(--esp-7) var(--esp-6) var(--esp-5);
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
  max-width: var(--largura-conteudo-max);
  margin: 0 auto;
}

.rodape__govbr {
  font-size: 2.125rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.rodape__grade {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 1px minmax(0, 1fr);
  gap: var(--esp-5) var(--esp-6);
  margin-top: var(--esp-6);
}

.rodape__linha-vertical {
  background: var(--faixa-divisor);
}

.rodape__unidade {
  margin-bottom: var(--esp-4) !important;
}

.rodape__unidade strong {
  display: block;
  font-size: var(--texto-lg);
  line-height: 1.2;
}

.rodape__unidade span,
.rodape__suave,
.rodape__normas {
  font-size: 0.8125rem;
  color: var(--faixa-texto-suave);
}

.rodape__normas {
  margin-top: var(--esp-2) !important;
}

.rodape__titulo {
  margin-bottom: var(--esp-3) !important;
  font-weight: var(--peso-forte);
}

.rodape__lista {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
  color: var(--faixa-texto-suave);
}

.rodape__lista a {
  color: var(--faixa-texto-suave);
  text-decoration: none;
}

.rodape__lista a:hover {
  color: var(--faixa-texto);
  text-decoration: underline;
}

.rodape__meio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--esp-4) var(--esp-6);
  align-items: end;
  margin-top: var(--esp-5);
  font-size: 0.8125rem;
}

.rodape__digiteca {
  text-align: right;
}

.rodape__digiteca-nome {
  font-size: var(--texto-lg);
  font-weight: var(--peso-forte);
}

.rodape__base {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-4);
  margin-top: var(--esp-6);
  padding-top: var(--esp-5);
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

@media (max-width: 991.98px) {
  .rodape__grade {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .rodape__linha-vertical {
    display: none;
  }
}

@media (max-width: 639.98px) {
  .rodape {
    padding: var(--esp-6) var(--esp-4) var(--esp-5);
  }
  .rodape__grade,
  .rodape__meio {
    grid-template-columns: minmax(0, 1fr);
  }
  .rodape__digiteca {
    text-align: left;
  }
}
</style>
