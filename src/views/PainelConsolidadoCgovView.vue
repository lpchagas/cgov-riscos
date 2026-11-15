<script setup lang="ts">
/**
 * ============================================================================
 * PAINEL (`PainelConsolidadoCgovView.vue`) — página inicial do RADAR
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O Painel é uma tela de SÍNTESE, para responder em poucos segundos:
 *   "Como está o Plano de Gestão de Riscos e o que precisa de mim agora?"
 *
 * Ordem dos blocos (do mais importante para o menos importante):
 *   1. 4 indicadores (cada um abre a lista de Riscos já filtrada);
 *   2. Matriz 5×5 (Quadro 7) + "Precisa da sua atenção" (muda com o perfil);
 *   3. Maiores riscos residuais + distribuição por nível + resumo da DAR
 *      + atividade recente.
 *
 * O QUE SAIU DAQUI (e para onde foi), na reformulação da Fase 2:
 *   - a carteira completa, com KRIs e planos dentro de cada card → página Riscos
 *     (`/riscos`) e Monitoramento (`/monitoramento`);
 *   - o simulador da DAR → página Apetite (DAR) (`/dar`);
 *   - "Enviar para validação" e "Reavaliar controle" → painel lateral da
 *     página Riscos.
 *
 * REGRA DE OURO: esta página não calcula nenhum nível de risco. Ela só lê os
 * valores que a calculadora oficial gravou nas fichas (ver `painelResumo.ts`).
 */
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import type { FichaRisco, NivelImpacto, NivelProbabilidade, PapelGovernanca } from '../types/radar.types';
import { MATRIZ_QUADRO_7, classificarNivelRisco } from '../utils/calculadoraRiscoRadar';
import {
  ROTULOS_CRITICIDADE,
  ROTULOS_STATUS_FLUXO,
  SUFIXO_CSS_CLASSE_RISCO,
  ICONES_CLASSE_RISCO,
  formatarDataHora,
} from '../utils/rotulosInterface';
import {
  descreverEventoFluxo,
  distribuicaoPorNivelResidual,
  itensDeAtencao,
  maioresRiscosResiduais,
  resumirDar,
  type TipoItemAtencao,
} from '../utils/painelResumo';
import PageHeader from '../components/ui/PageHeader.vue';
import StatCard from '../components/ui/StatCard.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import type { ColunaTabela, OpcaoSegmento } from '../components/ui/tipos';
import DataTable from '../components/ui/DataTable.vue';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import MatrizCalorAssimetrica from '../components/radar/MatrizCalorAssimetrica.vue';

const route = useRoute();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();

// ---------------------------------------------------------------------------
// PERFIL (demonstração): o mesmo simulador do menu do usuário, aqui à mão
// ---------------------------------------------------------------------------
const OPCOES_PERFIL: OpcaoSegmento<PapelGovernanca>[] = [
  { valor: 'cgov', rotulo: 'CGOV' },
  { valor: 'lider_cg', rotulo: 'Coordenação-Geral' },
  { valor: 'diretor', rotulo: 'Diretoria' },
  { valor: 'gestor', rotulo: 'Gestor' },
];

const perfil = computed<PapelGovernanca>({
  get: () => authStore.usuarioAtual.papel,
  set: (papel) => authStore.alternarPerfilDemo(papel),
});

// ---------------------------------------------------------------------------
// 1. INDICADORES
// ---------------------------------------------------------------------------
const riscos = computed(() => riscosStore.riscos);
const noPlano = computed(() => riscos.value.filter((r) => r.statusFluxo === 'aprovado').length);

// ---------------------------------------------------------------------------
// 2. MATRIZ — a seleção de célula é só desta página (não filtra outras telas)
// ---------------------------------------------------------------------------
const celulaSelecionada = ref<{ p: NivelProbabilidade; i: NivelImpacto } | null>(null);

function alternarCelula(celula: { p: NivelProbabilidade; i: NivelImpacto }): void {
  const mesma = celulaSelecionada.value?.p === celula.p && celulaSelecionada.value?.i === celula.i;
  celulaSelecionada.value = mesma ? null : celula;
}

/** Resumo da célula escolhida: nota do Quadro 7, nível e os riscos que estão nela. */
const resumoCelula = computed(() => {
  const c = celulaSelecionada.value;
  if (!c) return null;
  const nota = MATRIZ_QUADRO_7[c.i][c.p]; // leitura da tabela, nunca P × I
  const lista = riscos.value.filter((r) => r.probabilidade === c.p && r.impacto === c.i);
  return { ...c, nota, classe: classificarNivelRisco(nota), riscos: lista };
});

// ---------------------------------------------------------------------------
// 3. PRECISA DA SUA ATENÇÃO
// ---------------------------------------------------------------------------
const LIMITE_ATENCAO = 6;
const atencao = computed(() => itensDeAtencao(riscos.value, perfil.value, new Date()));

const ICONE_ATENCAO: Record<TipoItemAtencao, string> = {
  kri: 'fa-solid fa-wave-square',
  validacao: 'fa-solid fa-check-double',
  homologacao: 'fa-solid fa-gavel',
  devolvido: 'fa-solid fa-rotate-left',
  prazo: 'fa-regular fa-clock',
};

// ---------------------------------------------------------------------------
// 4. MAIORES RISCOS, DISTRIBUIÇÃO, DAR E ATIVIDADE
// ---------------------------------------------------------------------------
const maiores = computed(() => maioresRiscosResiduais(riscos.value, 5));

const colunasMaiores: ColunaTabela<FichaRisco>[] = [
  { chave: 'codigoRadar', rotulo: 'Código' },
  { chave: 'nomeObjetoCache', rotulo: 'Objeto de gestão' },
  { chave: 'nivelResidual', rotulo: 'Residual', alinhamento: 'direita' },
  { chave: 'statusCritico', rotulo: 'Apetite (DAR)' },
  // A situação no fluxo aparece numa 2ª linha da coluna "Objeto" (economiza
  // uma coluna inteira no cartão, que ocupa só 7/12 da largura).
];

const distribuicao = computed(() => distribuicaoPorNivelResidual(riscos.value));
const dar = computed(() => resumirDar(riscosStore.categorias));
const atividade = computed(() => riscosStore.trilhaAuditoriaGlobal.slice(0, 4));
</script>

<template>
  <div class="painel">
    <!-- CABEÇALHO DA PÁGINA, com o simulador de perfil à direita -->
    <PageHeader
      :titulo="route.meta.titulo ?? 'Painel'"
      :descricao="route.meta.descricao"
      :fundamento="route.meta.fundamento"
    >
      <template #acoes>
        <div class="painel__perfil">
          <span class="painel__perfil-rotulo" aria-hidden="true">Ver o painel como (demonstração)</span>
          <SegmentedControl v-model="perfil" :opcoes="OPCOES_PERFIL" rotulo="Ver o painel como (demonstração)" />
        </div>
      </template>
    </PageHeader>

    <!-- 1. INDICADORES -->
    <section class="painel__kpis" aria-label="Indicadores do Plano de Gestão de Riscos">
      <StatCard
        rotulo="Riscos mapeados"
        :valor="riscos.length"
        :descricao="`${noPlano} já ${noPlano === 1 ? 'integrado' : 'integrados'} ao Plano de Gestão de Riscos`"
        :para="{ name: 'riscos-lista' }"
      />
      <StatCard
        rotulo="Críticos"
        :valor="riscosStore.riscosCriticosCarteira.length"
        tom="perigo"
        descricao="Residual acima do apetite da DAR"
        :para="{ name: 'riscos-lista', query: { critico: 'sim' } }"
      />
      <StatCard
        rotulo="Aguardando validação"
        :valor="riscosStore.filaValidacaoCg.length"
        tom="info"
        descricao="Com a Coordenação-Geral (2º degrau)"
        :para="{ name: 'riscos-lista', query: { status: 'em_validacao_cg' } }"
      />
      <StatCard
        rotulo="Aguardando homologação"
        :valor="riscosStore.filaHomologacaoDiretoria.length"
        tom="aviso"
        descricao="Com a Diretoria (3º degrau)"
        :para="{ name: 'riscos-lista', query: { status: 'em_homologacao_dir' } }"
      />
    </section>

    <!-- 2. MATRIZ + ATENÇÃO -->
    <div class="painel__dupla">
      <section class="cartao painel__principal" aria-labelledby="titulo-matriz">
        <div class="cartao__cabecalho">
          <div>
            <h2 id="titulo-matriz" class="cartao__titulo">Matriz de riscos inerentes</h2>
            <p class="cartao__subtitulo">
              O impacto pesa mais que a probabilidade. Escolha uma célula para ver os riscos dela.
            </p>
          </div>
        </div>

        <MatrizCalorAssimetrica
          :riscos="riscos"
          :celula-ativa="celulaSelecionada"
          @selecionar-celula="alternarCelula"
        />

        <!-- Legenda do Quadro 8: ícone + texto (não depende só da cor) -->
        <ul class="legenda" aria-label="Legenda dos níveis">
          <li><RiskBadge classe="Baixo" tamanho="sm" /> 1 a 5</li>
          <li><RiskBadge classe="Médio" tamanho="sm" /> acima de 5 a 10</li>
          <li><RiskBadge classe="Alto" tamanho="sm" /> acima de 10 a 17</li>
          <li><RiskBadge classe="Extremo" tamanho="sm" /> acima de 17 a 25</li>
        </ul>

        <!-- Resultado da célula escolhida (anunciado pelo leitor de tela) -->
        <div class="painel__celula" role="status">
          <template v-if="resumoCelula">
            <p class="painel__celula-titulo">
              Probabilidade {{ resumoCelula.p }} × Impacto {{ resumoCelula.i }} · nota {{ resumoCelula.nota }}
              ({{ resumoCelula.classe }}) —
              {{
                resumoCelula.riscos.length === 0
                  ? 'nenhum risco nesta célula'
                  : resumoCelula.riscos.length === 1
                    ? '1 risco'
                    : `${resumoCelula.riscos.length} riscos`
              }}
            </p>
            <ul v-if="resumoCelula.riscos.length" class="painel__celula-lista">
              <li v-for="r in resumoCelula.riscos" :key="r.id">
                <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: r.id } }" class="codigo">
                  {{ r.codigoRadar }}
                </RouterLink>
                {{ r.nomeObjetoCache }}
              </li>
            </ul>
            <RouterLink
              v-if="resumoCelula.riscos.length"
              :to="{ name: 'riscos-lista', query: { p: String(resumoCelula.p), i: String(resumoCelula.i) } }"
              class="link-acao"
            >
              Ver na lista de Riscos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </RouterLink>
          </template>
          <p v-else class="painel__dica">O número no círculo escuro é a quantidade de riscos na célula.</p>
        </div>
      </section>

      <section class="cartao painel__lateral" aria-labelledby="titulo-atencao">
        <div class="cartao__cabecalho">
          <h2 id="titulo-atencao" class="cartao__titulo">Precisa da sua atenção</h2>
          <Chip v-if="atencao.length" tom="info">
            {{ atencao.length }} {{ atencao.length === 1 ? 'item' : 'itens' }}
          </Chip>
        </div>

        <ul v-if="atencao.length" class="atencao">
          <li v-for="item in atencao.slice(0, LIMITE_ATENCAO)" :key="item.id" class="atencao__item">
            <span class="atencao__icone" :class="`atencao__icone--${item.tom}`" aria-hidden="true">
              <i :class="ICONE_ATENCAO[item.tipo]"></i>
            </span>
            <div class="atencao__texto">
              <p class="atencao__titulo">{{ item.titulo }}</p>
              <p class="atencao__detalhe">{{ item.detalhe }}</p>
              <RouterLink :to="item.destino" class="link-acao">
                {{ item.acao }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </RouterLink>
            </div>
          </li>
        </ul>
        <p v-if="atencao.length > LIMITE_ATENCAO" class="painel__dica">
          E mais {{ atencao.length - LIMITE_ATENCAO }} em
          <RouterLink :to="{ name: 'monitoramento-kris' }">Monitoramento</RouterLink>.
        </p>
        <EmptyState
          v-if="!atencao.length"
          titulo="Nada pendente para você"
          descricao="Nenhum indicador em alerta, aprovação parada ou prazo próximo."
          icone="fa-regular fa-circle-check"
        />
      </section>
    </div>

    <!-- 3. MAIORES RISCOS + COLUNA DE RESUMOS -->
    <div class="painel__dupla">
      <section class="cartao painel__principal" aria-labelledby="titulo-maiores">
        <div class="cartao__cabecalho">
          <div>
            <h2 id="titulo-maiores" class="cartao__titulo">Maiores riscos residuais</h2>
            <p class="cartao__subtitulo">Ordenados pelo nível residual, depois dos controles.</p>
          </div>
          <RouterLink :to="{ name: 'riscos-lista' }" class="link-acao">
            Ver todos os riscos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </div>

        <DataTable
          :colunas="colunasMaiores"
          :linhas="maiores"
          chave-linha="id"
          legenda="Os riscos com maior nível residual"
          :tamanho-pagina="5"
        >
          <template #celula-codigoRadar="{ linha }">
            <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: linha.id } }" class="codigo">
              {{ linha.codigoRadar }}
            </RouterLink>
          </template>
          <template #celula-nomeObjetoCache="{ linha }">
            <span class="objeto">
              <span class="objeto__nome">{{ linha.nomeObjetoCache }}</span>
              <span class="objeto__categoria">
                {{ linha.categoriaNome }} · {{ ROTULOS_STATUS_FLUXO[linha.statusFluxo].rotulo }}
              </span>
            </span>
          </template>
          <template #celula-nivelResidual="{ linha }">
            <RiskBadge :classe="linha.classificacaoResidual" :valor="linha.nivelResidual" tamanho="sm" />
          </template>
          <template #celula-statusCritico="{ linha }">
            <Chip :tom="ROTULOS_CRITICIDADE[linha.statusCritico].tom" :icone="ROTULOS_CRITICIDADE[linha.statusCritico].icone">
              {{ ROTULOS_CRITICIDADE[linha.statusCritico].rotulo }}
            </Chip>
          </template>
          <template #vazio>
            <EmptyState titulo="Nenhum risco cadastrado" descricao="Comece pelo botão Novo risco, no menu." />
          </template>
        </DataTable>
      </section>

      <div class="painel__lateral painel__pilha">
        <section class="cartao" aria-labelledby="titulo-distribuicao">
          <h2 id="titulo-distribuicao" class="cartao__titulo cartao__titulo--sozinho">Riscos por nível residual</h2>
          <ul class="barras">
            <li v-for="faixa in distribuicao" :key="faixa.classe" class="barras__linha">
              <span class="barras__rotulo">
                <i :class="ICONES_CLASSE_RISCO[faixa.classe]" aria-hidden="true"></i>
                {{ faixa.classe }}
              </span>
              <span class="barras__trilho" aria-hidden="true">
                <span
                  class="barras__preenchimento"
                  :class="`barras__preenchimento--${SUFIXO_CSS_CLASSE_RISCO[faixa.classe]}`"
                  :style="{ width: `${faixa.percentual}%` }"
                ></span>
              </span>
              <strong class="barras__numero radar-numero">{{ faixa.quantidade }}</strong>
            </li>
          </ul>
        </section>

        <section class="cartao" aria-labelledby="titulo-dar">
          <div class="cartao__cabecalho">
            <h2 id="titulo-dar" class="cartao__titulo">Apetite a riscos (DAR)</h2>
            <RouterLink :to="{ name: 'dar-apetite' }" class="link-acao">Abrir DAR</RouterLink>
          </div>
          <p class="painel__texto">
            {{ dar.totalCategorias }} categorias ·
            <strong>{{ dar.baixo }}</strong> com apetite <strong>Baixo</strong> (até 5) ·
            <strong>{{ dar.moderado }}</strong> <strong>Moderado</strong> (até 10) ·
            <strong>{{ dar.pendentes }}</strong> {{ dar.pendentes === 1 ? 'pendente' : 'pendentes' }}.
          </p>
          <p class="painel__dica">
            A calibragem do apetite fica na página da DAR, com prévia do impacto antes de confirmar.
          </p>
        </section>

        <section class="cartao" aria-labelledby="titulo-atividade">
          <div class="cartao__cabecalho">
            <h2 id="titulo-atividade" class="cartao__titulo">Atividade recente</h2>
            <RouterLink :to="{ name: 'trilha-auditoria' }" class="link-acao">Auditoria</RouterLink>
          </div>
          <ol v-if="atividade.length" class="linha-tempo">
            <li v-for="ev in atividade" :key="ev.id">
              <span class="linha-tempo__quando">{{ formatarDataHora(ev.criadoEm) }}</span>
              <span>
                <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: ev.riscoId } }" class="codigo">
                  {{ ev.codigoRadar }}
                </RouterLink>
                {{ descreverEventoFluxo(ev) }}
              </span>
            </li>
          </ol>
          <p v-else class="painel__dica">Nenhuma movimentação registrada ainda.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.painel {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

/* --- Simulador de perfil ------------------------------------------------ */
.painel__perfil {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-1);
}

.painel__perfil-rotulo {
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

/* --- Indicadores -------------------------------------------------------- */
.painel__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--esp-4);
}

/* --- Grade de 12 colunas: 7 + 5 ---------------------------------------- */
.painel__dupla {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--esp-4);
  align-items: start;
}

.painel__principal {
  grid-column: span 7;
  min-width: 0;
}

.painel__lateral {
  grid-column: span 5;
  min-width: 0;
}

.painel__pilha {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

/* --- Cartão genérico ---------------------------------------------------- */
.cartao {
  padding: var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.cartao__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--esp-2);
  margin-bottom: var(--esp-4);
}

.cartao__titulo {
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
  line-height: 1.25;
}

.cartao__titulo--sozinho {
  margin-bottom: var(--esp-4);
}

.cartao__subtitulo {
  margin: var(--esp-1) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.link-acao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

.link-acao:hover {
  text-decoration: underline;
}

.codigo {
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
  white-space: nowrap;
}

.painel__texto {
  margin: 0;
  font-size: var(--texto-sm);
}

.painel__dica {
  margin: var(--esp-3) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

/* --- Matriz: legenda e resultado da célula ----------------------------- */
.legenda {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2) var(--esp-4);
  margin: var(--esp-4) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.legenda li {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
}

.painel__celula:has(.painel__celula-titulo) {
  margin-top: var(--esp-4);
  padding: var(--esp-3) var(--esp-4);
  border: 1px solid var(--cor-primaria-suave);
  border-radius: var(--raio-md);
  background: var(--cor-info-suave);
  font-size: var(--texto-sm);
}

.painel__celula-titulo {
  margin: 0 0 var(--esp-2);
  font-weight: var(--peso-semi);
}

.painel__celula-lista {
  margin: 0 0 var(--esp-2);
  padding: 0;
  list-style: none;
}

/* --- Precisa da sua atenção ------------------------------------------- */
.atencao {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.atencao__item {
  display: flex;
  gap: var(--esp-3);
  padding: var(--esp-3) 0;
  border-top: 1px solid var(--borda);
}

.atencao__item:first-child {
  padding-top: 0;
  border-top: 0;
}

.atencao__icone {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.atencao__icone--perigo { background: var(--cor-perigo-suave); color: var(--cor-perigo); }
.atencao__icone--aviso { background: var(--cor-aviso-suave); color: var(--cor-aviso); }
.atencao__icone--info { background: var(--cor-info-suave); color: var(--cor-info); }
.atencao__icone--sucesso { background: var(--cor-sucesso-suave); color: var(--cor-sucesso); }
.atencao__icone--neutro { background: var(--superficie-alta); color: var(--texto); }

.atencao__texto {
  min-width: 0;
}

.atencao__titulo {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: var(--peso-semi);
  line-height: 1.35;
}

.atencao__detalhe {
  margin: 2px 0 var(--esp-1);
  font-size: 0.8125rem;
  color: var(--texto-secundario);
}

/* --- Tabela: nome do objeto + categoria -------------------------------- */
.objeto {
  display: flex;
  flex-direction: column;
  min-width: 10rem;
}

.objeto__nome {
  font-weight: var(--peso-semi);
}

.objeto__categoria {
  font-size: 0.8125rem;
  color: var(--texto-secundario);
}

/* --- Barras de distribuição ------------------------------------------- */
.barras {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.barras__linha {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr) 2rem;
  align-items: center;
  gap: var(--esp-3);
  font-size: var(--texto-sm);
}

.barras__rotulo {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
}

.barras__trilho {
  height: 12px;
  overflow: hidden;
  border-radius: var(--raio-pilula);
  background: var(--superficie-alta);
}

.barras__preenchimento {
  display: block;
  height: 100%;
  border-radius: var(--raio-pilula);
}

/* A barra usa a cor de TEXTO do nível (mais escura), para contrastar com o trilho. */
.barras__preenchimento--baixo { background: var(--risco-baixo-texto); }
.barras__preenchimento--medio { background: var(--risco-medio-texto); }
.barras__preenchimento--alto { background: var(--risco-alto-texto); }
.barras__preenchimento--extremo { background: var(--risco-extremo-texto); }

.barras__numero {
  text-align: right;
}

/* --- Linha do tempo --------------------------------------------------- */
.linha-tempo {
  margin: 0;
  padding: 0;
  list-style: none;
}

.linha-tempo li {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0 0 var(--esp-3) var(--esp-5);
  font-size: var(--texto-sm);
}

.linha-tempo li::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cor-primaria);
}

.linha-tempo li::after {
  content: '';
  position: absolute;
  top: 18px;
  bottom: 0;
  left: 8px;
  width: 2px;
  background: var(--borda);
}

.linha-tempo li:last-child::after {
  display: none;
}

.linha-tempo__quando {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* --- Responsivo ------------------------------------------------------- */
@media (max-width: 1180px) {
  .painel__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .painel__principal,
  .painel__lateral {
    grid-column: span 12;
  }
}

@media (max-width: 639.98px) {
  .painel {
    gap: var(--esp-4);
  }
  .painel__perfil {
    width: 100%;
  }
  /* Simulador de perfil em grade 2×2 no celular (achado do protótipo). */
  .painel__perfil :deep(.segmentado) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--esp-2);
    width: 100%;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .painel__perfil :deep(.segmentado__opcao) {
    justify-content: center;
    border: 1px solid var(--borda-forte);
    border-radius: var(--raio-pilula);
    white-space: normal;
    text-align: center;
    line-height: 1.2;
  }
  .cartao {
    padding: var(--esp-4);
  }
  .painel__kpis {
    gap: var(--esp-3);
  }
}
</style>
