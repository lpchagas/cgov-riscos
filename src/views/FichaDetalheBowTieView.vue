<script setup lang="ts">
/**
 * ============================================================================
 * FICHA DO RISCO (`FichaDetalheBowTieView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Tudo sobre UM risco, organizado em abas (antes era uma página única e longa):
 *
 *   Resumo · Bow Tie · Controles · Monitoramento · Histórico
 *
 * No topo: código, nome, selos (nível, criticidade, situação) e a AÇÃO
 * principal do momento, que depende da situação no fluxo:
 *   - rascunho / devolvido / preliminar → "Enviar para validação"
 *   - aguardando validação              → "Validar risco"   (chefias que validam, ver acessoPorPerfil.ts)
 *   - aguardando homologação            → "Homologar risco" (chefias que homologam, ver acessoPorPerfil.ts)
 *
 * Se o código na URL não existir, a página diz isso (antes mostrava o
 * primeiro risco da lista sem avisar — dava para confundir uma ficha com outra).
 *
 * A aba aberta fica na URL (`/riscos/risco-x?aba=bowtie`).
 */
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { FichaRisco } from '../types/radar.types';
import { ROTULOS_CRITICIDADE, ROTULOS_STATUS_FLUXO, formatarDataHora } from '../utils/rotulosInterface';
import { dataCurta, descreverEventoFluxo } from '../utils/painelResumo';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import BrTabs from '../components/govbr/BrTabs.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';
import BowTieDiagram from '../components/radar/BowTieDiagram.vue';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();

const risco = computed<FichaRisco | undefined>(() => riscosStore.obterRiscoPorId(String(route.params.id ?? '')));

// ---------------------------------------------------------------------------
// ABAS (na URL)
// ---------------------------------------------------------------------------
const ABAS_VALIDAS = ['resumo', 'bowtie', 'controles', 'monitoramento', 'historico'];
const aba = computed<string>({
  get: () => (typeof route.query.aba === 'string' && ABAS_VALIDAS.includes(route.query.aba) ? route.query.aba : 'resumo'),
  set: (a) => router.replace({ query: a === 'resumo' ? {} : { aba: a } }),
});
const abas = computed(() => [
  { id: 'resumo', rotulo: 'Resumo' },
  { id: 'bowtie', rotulo: 'Bow Tie' },
  { id: 'controles', rotulo: 'Controles', contador: risco.value?.controlesExistentes.length },
  { id: 'monitoramento', rotulo: 'Monitoramento', contador: (risco.value?.kris.length ?? 0) + (risco.value?.respostasTratamento.length ?? 0) },
  { id: 'historico', rotulo: 'Histórico', contador: risco.value?.historicoFluxo.length },
]);

// ---------------------------------------------------------------------------
// AÇÃO PRINCIPAL CONFORME A SITUAÇÃO
// ---------------------------------------------------------------------------
const acao = computed(() => {
  const r = risco.value;
  if (!r) return null;
  if (['rascunho', 'devolvido', 'preliminar_cgov'].includes(r.statusFluxo)) {
    return { rotulo: 'Enviar para validação', icone: 'fa-solid fa-paper-plane', pode: true, executar: () => riscosStore.submeterParaValidacaoCg(r.id), aviso: 'enviado para validação da Coordenação-Geral' };
  }
  if (r.statusFluxo === 'em_validacao_cg') {
    return { rotulo: 'Validar risco', icone: 'fa-solid fa-check', pode: authStore.podeAprovarCg, executar: () => riscosStore.aprovarEmUmCliqueCg(r.id), aviso: 'validado' };
  }
  if (r.statusFluxo === 'em_homologacao_dir') {
    return { rotulo: 'Homologar risco', icone: 'fa-solid fa-stamp', pode: authStore.podeHomologarDiretoria, executar: () => riscosStore.homologarEmUmCliqueDiretoria(r.id), aviso: 'homologado e incluído no Plano' };
  }
  return null; // aprovado: nada a fazer aqui
});

// A ação vai à fonte de dados (assíncrona). O `r` é o mesmo objeto da store,
// atualizado pela releitura: depois do `await` ele já mostra a nova situação.
async function executarAcao(): Promise<void> {
  const r = risco.value;
  const a = acao.value;
  if (!r || !a) return;
  try {
    await a.executar();
  } catch (e) {
    mostrar({ tom: 'perigo', mensagem: (e as Error).message });
    return;
  }
  mostrar({ tom: 'sucesso', mensagem: `${r.codigoRadar} ${a.aviso}. Situação: ${ROTULOS_STATUS_FLUXO[r.statusFluxo].rotulo}.` });
}

/** Leitura mais recente de um indicador. */
const ultimaLeitura = (kri: FichaRisco['kris'][number]) =>
  [...kri.medicoes].sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao))[0];
</script>

<template>
  <div v-if="risco" class="ficha">
    <!-- CABEÇALHO DA FICHA -->
    <header class="ficha__cabecalho">
      <div class="ficha__identificacao">
        <p class="codigo">{{ risco.codigoRadar }}</p>
        <h1 class="ficha__titulo">{{ risco.nomeObjetoCache }}</h1>
        <div class="ficha__selos">
          <RiskBadge :classe="risco.classificacaoResidual" :valor="risco.nivelResidual" prefixo="Residual" />
          <Chip :tom="ROTULOS_CRITICIDADE[risco.statusCritico].tom" :icone="ROTULOS_CRITICIDADE[risco.statusCritico].icone">
            {{ ROTULOS_CRITICIDADE[risco.statusCritico].rotulo }}
          </Chip>
          <Chip :tom="ROTULOS_STATUS_FLUXO[risco.statusFluxo].tom" :icone="ROTULOS_STATUS_FLUXO[risco.statusFluxo].icone">
            {{ ROTULOS_STATUS_FLUXO[risco.statusFluxo].rotulo }}
          </Chip>
        </div>
      </div>
      <div v-if="acao" class="ficha__acao">
        <BrButton variant="primary" :icon="acao.icone" :disabled="!acao.pode" @click="executarAcao">{{ acao.rotulo }}</BrButton>
        <span v-if="!acao.pode" class="texto-apoio">Seu perfil não pode fazer esta etapa.</span>
      </div>
    </header>

    <section class="cartao">
      <BrTabs v-model:aba-ativa="aba" :abas="abas" :rotulo="`Ficha do ${risco.codigoRadar}`">
        <template #default="{ aba: abaAtual }">
          <!-- RESUMO -->
          <div v-if="abaAtual === 'resumo'" class="painel-aba">
            <h2 class="titulo-secao">Descrição padronizada</h2>
            <p class="texto-longo">{{ risco.descricaoPadrao }}</p>

            <dl class="dados">
              <div><dt>Categoria</dt><dd>{{ risco.categoriaNome }}<template v-if="risco.subcategoriaIntegridade"> · {{ risco.subcategoriaIntegridade }}</template></dd></div>
              <div><dt>Responsável (1ª Linha)</dt><dd>{{ risco.responsavelRiscoNome }}</dd></div>
              <div><dt>Objetivo afetado</dt><dd>{{ risco.objetivoAfetado }}</dd></div>
              <div><dt>Estratégia</dt><dd>{{ risco.estrategiaPrincipal }}</dd></div>
              <div>
                <dt>Teste de Integridade</dt>
                <dd>{{ risco.testeIntegridadeAplicavel ? 'Aplicável' : 'Não aplicável' }}<template v-if="risco.justificativaNaoIntegridade"> — {{ risco.justificativaNaoIntegridade }}</template></dd>
              </div>
            </dl>

            <h2 class="titulo-secao">A conta</h2>
            <MemoriaCalculoBar
              :probabilidade="risco.probabilidade"
              :impacto="risco.impacto"
              :nivel-inerente="risco.nivelInerente"
              :classificacao-inerente="risco.classificacaoInerente"
              :eficacia-controle="risco.nivelEficaciaControle"
              :fator-controle="risco.fatorControle"
              :possui-evidencia="risco.possuiEvidenciaControle"
              :nivel-residual="risco.nivelResidual"
              :classificacao-residual="risco.classificacaoResidual"
              :status-critico="risco.statusCritico"
            />
            <dl class="dados">
              <div v-if="risco.justificativaProbabilidade"><dt>Por que esta probabilidade</dt><dd>{{ risco.justificativaProbabilidade }}</dd></div>
              <div v-if="risco.justificativaImpacto"><dt>Por que este impacto</dt><dd>{{ risco.justificativaImpacto }}</dd></div>
            </dl>
          </div>

          <!-- BOW TIE -->
          <div v-else-if="abaAtual === 'bowtie'" class="painel-aba">
            <BowTieDiagram :risco="risco" />
          </div>

          <!-- CONTROLES -->
          <div v-else-if="abaAtual === 'controles'" class="painel-aba">
            <p class="texto-apoio">
              Eficácia avaliada: <strong>{{ risco.nivelEficaciaControle }}</strong>.
              Sem evidência comprovada, o fator fica limitado a Fraco (0,9).
            </p>
            <ul v-if="risco.controlesExistentes.length" class="lista-cartoes">
              <li v-for="c in risco.controlesExistentes" :key="c.id" class="item-cartao">
                <p class="item-cartao__titulo">{{ c.descricaoControle }}</p>
                <p class="texto-apoio"><strong>Evidência:</strong> {{ c.evidenciaFuncionamento || '—' }}</p>
                <div class="ficha__selos">
                  <Chip :tom="c.possuiEvidenciaComprovada ? 'sucesso' : 'aviso'" :icone="c.possuiEvidenciaComprovada ? 'fa-solid fa-circle-check' : 'fa-solid fa-lock'">
                    {{ c.possuiEvidenciaComprovada ? 'Evidência comprovada' : 'Sem evidência (trava em Fraco)' }}
                  </Chip>
                  <Chip :tom="c.desenhoAdequado ? 'sucesso' : 'neutro'">Desenho {{ c.desenhoAdequado ? 'adequado' : 'a melhorar' }}</Chip>
                  <Chip :tom="c.operacaoComprovada ? 'sucesso' : 'neutro'">Operação {{ c.operacaoComprovada ? 'comprovada' : 'não comprovada' }}</Chip>
                </div>
              </li>
            </ul>
            <EmptyState v-else titulo="Nenhum controle cadastrado" descricao="Sem controle formal, o fator é 1,0 (Inexistente)." icone="fa-solid fa-shield-halved" />
          </div>

          <!-- MONITORAMENTO -->
          <div v-else-if="abaAtual === 'monitoramento'" class="painel-aba">
            <h2 class="titulo-secao">Indicadores (KRIs)</h2>
            <ul v-if="risco.kris.length" class="lista-cartoes">
              <li v-for="k in risco.kris" :key="k.id" class="item-cartao">
                <p class="item-cartao__titulo">{{ k.nomeIndicador }}</p>
                <p class="texto-apoio">Meta {{ k.metaAlvo }} · alerta {{ k.limiteAlerta }} · {{ k.periodicidade }}</p>
                <p v-if="ultimaLeitura(k)" class="texto-apoio">
                  Última leitura: <strong>{{ ultimaLeitura(k).valorApurado }}</strong> em {{ dataCurta(ultimaLeitura(k).dataMedicao) }}
                  <Chip v-if="ultimaLeitura(k).emAlerta" tom="perigo" icone="fa-solid fa-triangle-exclamation">Em alerta</Chip>
                </p>
              </li>
            </ul>
            <p v-else class="texto-apoio">Nenhum indicador cadastrado.</p>

            <h2 class="titulo-secao">Plano de ação (5W2H)</h2>
            <ul v-if="risco.respostasTratamento.length" class="lista-cartoes">
              <li v-for="t in risco.respostasTratamento" :key="t.id" class="item-cartao">
                <p class="item-cartao__titulo">{{ t.acaoOQue }}</p>
                <p class="texto-apoio">{{ t.responsavelQuem }} · até {{ dataCurta(t.prazoQuando) }} · {{ t.procedimentoComo }}</p>
              </li>
            </ul>
            <p v-else class="texto-apoio">Plano de ação em elaboração.</p>
            <RouterLink :to="{ name: 'monitoramento-kris' }" class="link-acao">
              Registrar leituras e atualizar ações em Monitoramento <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </RouterLink>
          </div>

          <!-- HISTÓRICO -->
          <div v-else class="painel-aba">
            <ol v-if="risco.historicoFluxo.length" class="linha-tempo">
              <li v-for="h in [...risco.historicoFluxo].reverse()" :key="h.id">
                <span class="linha-tempo__quando">{{ formatarDataHora(h.criadoEm) }} · {{ h.usuarioNome }}</span>
                <span class="linha-tempo__oque">{{ descreverEventoFluxo(h) }}</span>
                <span v-if="h.despachoTexto" class="linha-tempo__despacho">"{{ h.despachoTexto }}"</span>
              </li>
            </ol>
            <p v-else class="texto-apoio">Ainda sem tramitação.</p>
          </div>
        </template>
      </BrTabs>
    </section>
  </div>

  <!-- CÓDIGO INEXISTENTE -->
  <div v-else class="ficha">
    <h1 class="ficha__titulo">Risco não encontrado</h1>
    <EmptyState
      class="cartao"
      titulo="Não existe risco com este endereço"
      descricao="O risco pode ter sido removido, ou o link está incompleto."
      icone="fa-solid fa-magnifying-glass"
    >
      <template #acoes>
        <RouterLink :to="{ name: 'riscos-lista' }" class="br-button primary">Ver todos os riscos</RouterLink>
      </template>
    </EmptyState>
  </div>
</template>

<style scoped>
.ficha {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.ficha__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--esp-3) var(--esp-5);
}

.ficha__identificacao {
  min-width: 0;
}

.codigo {
  margin: 0;
  font-family: var(--fonte-mono);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

.ficha__titulo {
  margin: var(--esp-1) 0 var(--esp-2);
  font-size: var(--titulo-lg);
  font-weight: var(--peso-forte);
  line-height: 1.25;
}

.ficha__selos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
}

.ficha__acao {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--esp-1);
}

.cartao {
  padding: var(--esp-2) var(--esp-5) var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.painel-aba {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.titulo-secao {
  margin: var(--esp-3) 0 0;
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.titulo-secao:first-child {
  margin-top: 0;
}

.texto-longo {
  margin: 0;
  max-width: 75ch;
  line-height: 1.6;
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.dados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--esp-3) var(--esp-5);
  margin: 0;
}

.dados dt {
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dados dd {
  margin: 2px 0 0;
  font-size: var(--texto-sm);
}

.lista-cartoes {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-cartao {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  padding: var(--esp-3) var(--esp-4);
  border: 1px solid var(--borda);
  border-radius: var(--raio-md);
}

.item-cartao__titulo {
  margin: 0;
  font-weight: var(--peso-semi);
}

.link-acao {
  display: inline-flex;
  align-self: flex-start; /* não estica na coluna: alvo do tamanho do texto */
  align-items: center;
  min-height: var(--alvo-minimo);
  gap: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

.linha-tempo {
  margin: 0;
  padding: 0;
  list-style: none;
}

.linha-tempo li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 var(--esp-4) var(--esp-5);
  font-size: var(--texto-sm);
}

.linha-tempo li::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cor-primaria);
}

.linha-tempo li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 20px;
  bottom: 0;
  left: 8px;
  width: 2px;
  background: var(--borda);
}

.linha-tempo__quando {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.linha-tempo__oque {
  font-weight: var(--peso-semi);
}

.linha-tempo__despacho {
  font-style: italic;
  color: var(--texto-secundario);
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-1) var(--esp-4) var(--esp-4);
  }
  .ficha__titulo {
    font-size: var(--titulo-md);
  }
  .ficha__acao {
    align-items: stretch;
    width: 100%;
  }
}
</style>
