<script setup lang="ts">
/**
 * ============================================================================
 * FAIXA DO ALERTA DO KRI (`FaixaAlertaKri.vue`) — tela P-02 (LAC-03)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Peça de apresentação do cartão do KRI no Monitoramento. Quando a leitura passa
 * do limite, o gestor tem 10 dias úteis, contados da CIÊNCIA do alerta, para
 * reavaliar os riscos ligados e comunicar o resultado à CGOV (Metodologia 4.7.1;
 * RN-084). A faixa mostra esse prazo e os atalhos:
 *
 *   - alerta no prazo (tom de AVISO):
 *       "Em alerta desde 18/11/2026 · dia 3 de 10 dias úteis (vence em 03/12/2026)"
 *     O número do dia vem do banco, SEM somar 1: no dia da ciência é "dia 0 de 10".
 *     (Vence em 03/12, e não 02/12: 20/11, Dia da Consciência Negra, é feriado.)
 *   - prazo vencido (tom de PERIGO): "Prazo vencido há 4 dias úteis" (não bloqueia nada);
 *   - alerta comunicado (tom de SUCESSO): "Alerta comunicado à CGOV em 20/11/2026".
 *
 * Atalhos (só no alerta aberto e só para quem pode agir; AUDIT só lê):
 *   - um "Reavaliar" por risco ligado: a reavaliação é por risco (leva à ficha);
 *   - um "Comunicar à CGOV": leva à tela de Comunicações já com o alerta escolhido.
 *
 * Acessibilidade: o estado está no TEXTO e no ícone (nunca só na cor). A faixa
 * NÃO é região "ao vivo" (role="alert"): ela já está na página ao abrir, e trocar
 * o filtro faria o leitor de tela anunciar todas de novo. Os links têm nome com o
 * risco ou o indicador (ex.: "Reavaliar RADAR-2026-001").
 *
 * Não é componente da biblioteca do Figma: é um pedaço da tela do Monitoramento.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { AlertaKri } from '../../types/radar.types';
import { dataCurta } from '../../utils/painelResumo';

const props = defineProps<{
  alerta: AlertaKri;
  /** Só as situações com alerta (as outras não têm faixa). */
  situacao: 'vencido' | 'alerta' | 'comunicado';
  nomeKri: string;
  /** Riscos ligados que a pessoa vê (pode ser vazio: KRI sem risco ligado). */
  riscos: { id: string; codigoRadar: string; eventoRisco?: string }[];
  /**
   * true = nenhum risco visível, mas o KRI serve a riscos FORA da visão da pessoa
   * (pela RLS, `totalRiscos` > 0). Muda só o texto: não há "Reavaliar" a mostrar.
   */
  riscosForaDaVisao?: boolean;
  /** true = só leitura (ex.: AUDIT): mostra a faixa e o prazo, sem os atalhos. */
  somenteLeitura?: boolean;
}>();

/** "1 dia útil" / "4 dias úteis". */
function diasUteis(n: number): string {
  return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`;
}

/** Tom (cor da faixa) e ícone de cada situação. */
const visual = computed(() => {
  if (props.situacao === 'comunicado') return { tom: 'sucesso', icone: 'fa-solid fa-circle-check' };
  if (props.situacao === 'vencido') return { tom: 'perigo', icone: 'fa-solid fa-circle-exclamation' };
  return { tom: 'aviso', icone: 'fa-solid fa-triangle-exclamation' };
});

/** Linha principal (em negrito) e linha de apoio. */
const textos = computed<{ titulo: string; apoio?: string }>(() => {
  const a = props.alerta;
  if (props.situacao === 'comunicado') {
    return { titulo: a.encerradoEm ? `Alerta comunicado à CGOV em ${dataCurta(a.encerradoEm)}` : 'Alerta comunicado à CGOV' };
  }
  if (props.situacao === 'vencido') {
    return {
      titulo: `Prazo vencido há ${diasUteis(a.diasUteisVencido)}`,
      apoio: `Em alerta desde ${dataCurta(a.cienciaEm)} (venceu em ${dataCurta(a.venceEm)}).`,
    };
  }
  return {
    titulo: `Em alerta desde ${dataCurta(a.cienciaEm)} · dia ${a.diaAtual} de 10 dias úteis (vence em ${dataCurta(a.venceEm)})`,
  };
});

/**
 * Orientação acima dos atalhos. Ex.: com riscos visíveis, "Reavalie os riscos ligados…";
 * sem nenhum, distingue o KRI órfão do KRI cujos riscos a pessoa não vê.
 */
const orientacao = computed(() => {
  if (props.riscos.length) return 'Reavalie os riscos ligados e comunique o resultado à CGOV.';
  if (props.riscosForaDaVisao) return 'Os riscos deste indicador estão fora da sua visão: comunique o alerta à CGOV.';
  return 'Este indicador não tem risco ligado: comunique o alerta à CGOV.';
});

/** Os atalhos aparecem só no alerta ABERTO (no prazo ou vencido) e para quem pode agir. */
const mostrarAtalhos = computed(() => props.situacao !== 'comunicado' && !props.somenteLeitura);
</script>

<template>
  <div class="faixa-alerta" :class="`faixa-alerta--${visual.tom}`">
    <i :class="visual.icone" class="faixa-alerta__icone" aria-hidden="true"></i>
    <div class="faixa-alerta__conteudo">
      <p class="faixa-alerta__titulo">{{ textos.titulo }}</p>
      <p v-if="textos.apoio" class="faixa-alerta__apoio">{{ textos.apoio }}</p>

      <template v-if="mostrarAtalhos">
        <p class="faixa-alerta__apoio">{{ orientacao }}</p>
        <ul v-if="riscos.length" class="faixa-alerta__riscos">
          <li v-for="r in riscos" :key="r.id">
            <span class="faixa-alerta__risco">
              <span class="faixa-alerta__codigo">{{ r.codigoRadar }}</span><template v-if="r.eventoRisco"> · {{ r.eventoRisco }}</template>
            </span>
            <RouterLink
              :to="{ name: 'ficha-bowtie-detalhe', params: { id: r.id } }"
              class="br-button secondary small faixa-alerta__botao"
              :aria-label="`Reavaliar ${r.codigoRadar}`"
            >Reavaliar</RouterLink>
          </li>
        </ul>
        <!-- A tela de Comunicações chega na Fase 3; até lá o endereço cai no "pega-tudo". -->
        <RouterLink
          :to="{ path: '/comunicacoes', query: { alerta: alerta.id } }"
          class="br-button primary small faixa-alerta__botao faixa-alerta__comunicar"
          :aria-label="`Comunicar à CGOV o alerta do indicador ${nomeKri}`"
        >Comunicar à CGOV</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.faixa-alerta {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-3);
  padding: var(--esp-3) var(--esp-4);
  border-left: 4px solid;
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
  color: var(--texto);
}

/* Mesmos tons do BrMessage (fundo suave + borda forte), que já passam no contraste. */
.faixa-alerta--aviso { background: var(--cor-aviso-suave); border-color: var(--cor-aviso); }
.faixa-alerta--perigo { background: var(--cor-perigo-suave); border-color: var(--cor-perigo); }
.faixa-alerta--sucesso { background: var(--cor-sucesso-suave); border-color: var(--cor-sucesso); }
.faixa-alerta--aviso .faixa-alerta__icone { color: var(--cor-aviso); }
.faixa-alerta--perigo .faixa-alerta__icone { color: var(--cor-perigo); }
.faixa-alerta--sucesso .faixa-alerta__icone { color: var(--cor-sucesso); }

.faixa-alerta__icone {
  margin-top: 3px;
}

.faixa-alerta__conteudo {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--esp-2);
  min-width: 0;
}

.faixa-alerta__titulo {
  margin: 0;
  font-weight: var(--peso-forte);
}

.faixa-alerta__apoio {
  margin: 0;
}

.faixa-alerta__riscos {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.faixa-alerta__riscos li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2) var(--esp-3);
}

.faixa-alerta__risco {
  flex: 1;
  min-width: 0;
}

.faixa-alerta__codigo {
  font-family: var(--fonte-mono);
  font-weight: var(--peso-semi);
  white-space: nowrap;
}

.faixa-alerta__comunicar {
  align-self: flex-end;
}

/* Celular (390): os "Reavaliar" ficam empilhados, um por risco, e o "Comunicar à
   CGOV" vem no fim, em largura total. */
@media (max-width: 639.98px) {
  .faixa-alerta__riscos li {
    flex-direction: column;
    align-items: stretch;
  }
  .faixa-alerta__botao {
    width: 100%;
    justify-content: center;
  }
  .faixa-alerta__comunicar {
    align-self: stretch;
  }
}
</style>
