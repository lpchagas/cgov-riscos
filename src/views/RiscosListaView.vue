<script setup lang="ts">
/**
 * ============================================================================
 * LISTA DE RISCOS (`RiscosListaView.vue`) — rota `/riscos`
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Página NOVA. Antes, a carteira de riscos ficava espremida no fim do Painel,
 * com cada risco ocupando meia tela. Aqui seguimos o padrão "lista + detalhe"
 * dos sistemas modernos (Ant Design Pro, Material 3):
 *
 *   1. FILTROS no topo — e todos ficam na URL. Ex.:
 *        /riscos?critico=sim            → só os Críticos
 *        /riscos?p=3&i=5                → célula P3 × I5 da Matriz (Quadro 7)
 *        /riscos?q=contrato&nivel=Alto  → busca + nível residual
 *      Assim, os cartões do Painel e a Matriz podem trazer o usuário para cá
 *      já filtrado, e um link pode ser enviado a um colega.
 *   2. TABELA ordenável e paginada (`DataTable`).
 *   3. Clique numa linha → PAINEL LATERAL com o resumo e a memória de cálculo,
 *      sem perder o lugar na lista. "Ver ficha completa" abre a Ficha do risco.
 */
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import type { ClasseRisco, FichaRisco, StatusFluxoRisco } from '../types/radar.types';
import { filtrarRiscos, lerFiltrosDaQuery } from '../utils/filtrosRiscos';
import {
  ROTULOS_CRITICIDADE,
  ROTULOS_STATUS_FLUXO,
  formatarNivel,
} from '../utils/rotulosInterface';
import PageHeader from '../components/ui/PageHeader.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SideSheet from '../components/ui/SideSheet.vue';
import FormField from '../components/ui/FormField.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();

// ---------------------------------------------------------------------------
// FILTROS ↔ URL
// ---------------------------------------------------------------------------
const filtros = computed(() => lerFiltrosDaQuery(route.query));

/** Atualiza um ou mais filtros na URL (valor vazio remove o filtro). */
function atualizarFiltros(mudancas: Record<string, string | undefined>): void {
  const nova: LocationQueryRaw = { ...route.query };
  for (const [chave, valor] of Object.entries(mudancas)) {
    if (valor) nova[chave] = valor;
    else delete nova[chave];
  }
  router.replace({ query: nova });
}

function limparFiltros(): void {
  router.replace({ query: {} });
}

const riscosVisiveis = computed(() => filtrarRiscos(riscosStore.riscos, filtros.value));

/** Chips com os filtros ativos (cada um pode ser removido individualmente). */
const chipsAtivos = computed(() => {
  const f = filtros.value;
  const lista: { id: string; rotulo: string; remover: Record<string, undefined> }[] = [];
  if (f.termo) lista.push({ id: 'q', rotulo: `Busca: “${f.termo}”`, remover: { q: undefined } });
  if (f.probabilidade && f.impacto)
    lista.push({
      id: 'celula',
      rotulo: `Matriz: P${f.probabilidade} × I${f.impacto}`,
      remover: { p: undefined, i: undefined },
    });
  if (f.classeResidual) lista.push({ id: 'nivel', rotulo: `Residual: ${f.classeResidual}`, remover: { nivel: undefined } });
  if (f.statusFluxo)
    lista.push({ id: 'status', rotulo: ROTULOS_STATUS_FLUXO[f.statusFluxo].rotulo, remover: { status: undefined } });
  if (f.apenasCriticos) lista.push({ id: 'critico', rotulo: 'Só Críticos', remover: { critico: undefined } });
  return lista;
});

const OPCOES_NIVEL: ClasseRisco[] = ['Baixo', 'Médio', 'Alto', 'Extremo'];
const OPCOES_STATUS = Object.entries(ROTULOS_STATUS_FLUXO) as [StatusFluxoRisco, { rotulo: string }][];

// ---------------------------------------------------------------------------
// TABELA
// ---------------------------------------------------------------------------
const colunas: ColunaTabela<FichaRisco>[] = [
  { chave: 'codigoRadar', rotulo: 'Código', ordenavel: true, largura: '9.5rem' },
  { chave: 'nomeObjetoCache', rotulo: 'Objeto e evento de risco', ordenavel: true },
  { chave: 'categoriaNome', rotulo: 'Categoria', ordenavel: true, ocultarNoCelular: true },
  { chave: 'nivelInerente', rotulo: 'Inerente', ordenavel: true, ocultarNoCelular: true },
  { chave: 'nivelResidual', rotulo: 'Residual', ordenavel: true },
  {
    chave: 'statusCritico',
    rotulo: 'Apetite (DAR)',
    ordenavel: true,
    // Ordena colocando os Críticos primeiro.
    valorOrdenacao: (r) => ({ sim: 0, pendente_dar: 1, nao: 2 })[r.statusCritico],
  },
  {
    chave: 'statusFluxo',
    rotulo: 'Situação',
    ordenavel: true,
    valorOrdenacao: (r) => ROTULOS_STATUS_FLUXO[r.statusFluxo].rotulo,
    ocultarNoCelular: true,
  },
];

// ---------------------------------------------------------------------------
// PAINEL LATERAL DE RESUMO
// ---------------------------------------------------------------------------
const riscoEmResumo = ref<FichaRisco | null>(null);

// ---------------------------------------------------------------------------
// AÇÕES DO FLUXO (vieram do Painel antigo, que mostrava a carteira inteira)
// ---------------------------------------------------------------------------
// O `riscoEmResumo` aponta para o MESMO objeto da store; por isso, quando a
// store muda o status, o painel lateral se atualiza sozinho.
const { mostrar } = useToast();

/** Situações em que a 1ª Linha ainda pode enviar o risco à Coordenação-Geral. */
const STATUS_QUE_PODEM_SER_ENVIADOS: StatusFluxoRisco[] = ['rascunho', 'preliminar_cgov', 'devolvido'];

function enviarParaValidacao(risco: FichaRisco): void {
  riscosStore.submeterParaValidacaoCg(risco.id);
  mostrar({ tom: 'sucesso', mensagem: `${risco.codigoRadar} enviado para validação da Coordenação-Geral.` });
}

/**
 * DEMONSTRAÇÃO da regra de reabertura: mudar a avaliação de um risco já
 * aprovado (aqui, o controle passa a "Satisfatório", fator 0,6) devolve o
 * risco para nova validação da Coordenação-Geral. O cálculo é feito pela
 * store, com a calculadora oficial — a tela não calcula nada.
 */
function reavaliarControleDemonstracao(risco: FichaRisco): void {
  riscosStore.reavaliarPontuacaoRiscoAprovado(risco.id, {
    probabilidade: risco.probabilidade,
    impacto: risco.impacto,
    nivelEficaciaControle: 'Satisfatório',
    possuiEvidenciaControle: true,
  });
  mostrar({ tom: 'aviso', mensagem: `${risco.codigoRadar} foi reavaliado e voltou para validação da Coordenação-Geral.` });
}
</script>

<template>
  <div>
    <PageHeader
      :titulo="route.meta.titulo ?? 'Riscos'"
      :descricao="route.meta.descricao"
      :fundamento="route.meta.fundamento"
    >
      <template #acoes>
        <RouterLink :to="{ name: 'novo-risco' }" class="br-button primary">
          <i class="fa-solid fa-plus mr-1" aria-hidden="true"></i>
          Novo risco
        </RouterLink>
      </template>
    </PageHeader>

    <!-- BARRA DE FILTROS -->
    <section class="filtros" aria-label="Filtros da lista de riscos">
      <FormField rotulo="Buscar" v-slot="{ attrs }">
        <input
          v-bind="attrs"
          type="search"
          :value="filtros.termo ?? ''"
          placeholder="Código, objeto, categoria ou responsável"
          @input="atualizarFiltros({ q: ($event.target as HTMLInputElement).value })"
        />
      </FormField>

      <FormField rotulo="Nível residual" v-slot="{ attrs }">
        <select
          v-bind="attrs"
          :value="filtros.classeResidual ?? ''"
          @change="atualizarFiltros({ nivel: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">Todos</option>
          <option v-for="n in OPCOES_NIVEL" :key="n" :value="n">{{ n }}</option>
        </select>
      </FormField>

      <FormField rotulo="Situação no fluxo" v-slot="{ attrs }">
        <select
          v-bind="attrs"
          :value="filtros.statusFluxo ?? ''"
          @change="atualizarFiltros({ status: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">Todas</option>
          <option v-for="[valor, r] in OPCOES_STATUS" :key="valor" :value="valor">{{ r.rotulo }}</option>
        </select>
      </FormField>

      <label class="filtros__alternador">
        <input
          type="checkbox"
          :checked="filtros.apenasCriticos"
          @change="atualizarFiltros({ critico: ($event.target as HTMLInputElement).checked ? 'sim' : undefined })"
        />
        Só Críticos (fora da DAR)
      </label>
    </section>

    <!-- Filtros ativos + contagem -->
    <div class="resumo-filtros">
      <p class="resumo-filtros__contagem" aria-live="polite">
        <strong>{{ riscosVisiveis.length }}</strong>
        {{ riscosVisiveis.length === 1 ? 'risco' : 'riscos' }}{{ chipsAtivos.length ? ' com os filtros aplicados' : '' }}
      </p>
      <div v-if="chipsAtivos.length" class="radar-cacho">
        <Chip
          v-for="c in chipsAtivos"
          :key="c.id"
          tom="info"
          removivel
          :rotulo-remover="`Remover filtro ${c.rotulo}`"
          @remover="atualizarFiltros(c.remover)"
        >
          {{ c.rotulo }}
        </Chip>
        <button type="button" class="link-botao" @click="limparFiltros">Limpar todos</button>
      </div>
    </div>

    <!-- TABELA -->
    <DataTable
      :colunas="colunas"
      :linhas="riscosVisiveis"
      chave-linha="id"
      legenda="Riscos do Plano de Gestão de Riscos do ICMBio"
      linha-clicavel
      :ordenacao-inicial="{ chave: 'nivelResidual', direcao: 'desc' }"
      @clique-linha="riscoEmResumo = $event"
    >
      <template #celula-codigoRadar="{ linha }">
        <button type="button" class="codigo-botao" @click="riscoEmResumo = linha">
          {{ linha.codigoRadar }}
        </button>
      </template>

      <template #celula-nomeObjetoCache="{ linha }">
        <div class="celula-objeto">
          <span class="celula-objeto__nome">{{ linha.nomeObjetoCache }}</span>
          <span class="celula-objeto__evento">{{ linha.eventoRisco }}</span>
        </div>
      </template>

      <template #celula-nivelInerente="{ linha }">
        <RiskBadge :classe="linha.classificacaoInerente" :valor="linha.nivelInerente" tamanho="sm" />
      </template>

      <template #celula-nivelResidual="{ linha }">
        <RiskBadge :classe="linha.classificacaoResidual" :valor="linha.nivelResidual" tamanho="sm" />
      </template>

      <template #celula-statusCritico="{ linha }">
        <Chip
          :tom="ROTULOS_CRITICIDADE[linha.statusCritico].tom"
          :icone="ROTULOS_CRITICIDADE[linha.statusCritico].icone"
          :titulo="ROTULOS_CRITICIDADE[linha.statusCritico].descricao"
        >
          {{ ROTULOS_CRITICIDADE[linha.statusCritico].rotulo }}
        </Chip>
      </template>

      <template #celula-statusFluxo="{ linha }">
        <Chip
          :tom="ROTULOS_STATUS_FLUXO[linha.statusFluxo].tom"
          :icone="ROTULOS_STATUS_FLUXO[linha.statusFluxo].icone"
          :titulo="ROTULOS_STATUS_FLUXO[linha.statusFluxo].descricao"
        >
          {{ ROTULOS_STATUS_FLUXO[linha.statusFluxo].rotulo }}
        </Chip>
      </template>

      <template #vazio>
        <EmptyState
          titulo="Nenhum risco encontrado"
          :descricao="
            chipsAtivos.length
              ? 'Nenhum risco atende a todos os filtros escolhidos. Tente remover algum filtro.'
              : 'Ainda não há riscos cadastrados. Comece cadastrando o primeiro risco da sua unidade.'
          "
          icone="fa-solid fa-magnifying-glass"
        >
          <template #acoes>
            <BrButton v-if="chipsAtivos.length" variant="secondary" @click="limparFiltros">Limpar filtros</BrButton>
            <RouterLink v-else :to="{ name: 'novo-risco' }" class="br-button primary">Novo risco</RouterLink>
          </template>
        </EmptyState>
      </template>
    </DataTable>

    <!-- RESUMO EM PAINEL LATERAL -->
    <SideSheet
      :aberto="riscoEmResumo !== null"
      :titulo="riscoEmResumo?.codigoRadar ?? ''"
      :subtitulo="riscoEmResumo?.nomeObjetoCache"
      largura="36rem"
      @fechar="riscoEmResumo = null"
    >
      <template v-if="riscoEmResumo">
        <div class="radar-cacho resumo__etiquetas">
          <RiskBadge :classe="riscoEmResumo.classificacaoResidual" :valor="riscoEmResumo.nivelResidual" prefixo="Residual" />
          <Chip
            :tom="ROTULOS_CRITICIDADE[riscoEmResumo.statusCritico].tom"
            :icone="ROTULOS_CRITICIDADE[riscoEmResumo.statusCritico].icone"
          >
            {{ ROTULOS_CRITICIDADE[riscoEmResumo.statusCritico].rotulo }}
          </Chip>
          <Chip
            :tom="ROTULOS_STATUS_FLUXO[riscoEmResumo.statusFluxo].tom"
            :icone="ROTULOS_STATUS_FLUXO[riscoEmResumo.statusFluxo].icone"
          >
            {{ ROTULOS_STATUS_FLUXO[riscoEmResumo.statusFluxo].rotulo }}
          </Chip>
        </div>

        <dl class="resumo__dados">
          <div>
            <dt>Categoria</dt>
            <dd>
              {{ riscoEmResumo.categoriaNome }}
              <template v-if="riscoEmResumo.subcategoriaIntegridade">· {{ riscoEmResumo.subcategoriaIntegridade }}</template>
            </dd>
          </div>
          <div>
            <dt>Responsável</dt>
            <dd>{{ riscoEmResumo.responsavelRiscoNome }}</dd>
          </div>
          <div>
            <dt>Inerente → Residual</dt>
            <dd class="radar-numero">
              {{ formatarNivel(riscoEmResumo.nivelInerente) }} → {{ formatarNivel(riscoEmResumo.nivelResidual) }}
            </dd>
          </div>
        </dl>

        <h3 class="resumo__subtitulo">Descrição padronizada</h3>
        <p class="resumo__descricao">{{ riscoEmResumo.descricaoPadrao }}</p>

        <h3 class="resumo__subtitulo">Memória de cálculo</h3>
        <MemoriaCalculoBar
          :probabilidade="riscoEmResumo.probabilidade"
          :impacto="riscoEmResumo.impacto"
          :nivel-inerente="riscoEmResumo.nivelInerente"
          :classificacao-inerente="riscoEmResumo.classificacaoInerente"
          :eficacia-controle="riscoEmResumo.nivelEficaciaControle"
          :fator-controle="riscoEmResumo.fatorControle"
          :possui-evidencia="riscoEmResumo.possuiEvidenciaControle"
          :nivel-residual="riscoEmResumo.nivelResidual"
          :classificacao-residual="riscoEmResumo.classificacaoResidual"
          :status-critico="riscoEmResumo.statusCritico"
        />
      </template>

      <template #acoes>
        <BrButton variant="secondary" @click="riscoEmResumo = null">Fechar</BrButton>
        <BrButton
          v-if="riscoEmResumo && STATUS_QUE_PODEM_SER_ENVIADOS.includes(riscoEmResumo.statusFluxo)"
          variant="secondary"
          @click="enviarParaValidacao(riscoEmResumo)"
        >
          Enviar para validação
        </BrButton>
        <BrButton
          v-if="riscoEmResumo && riscoEmResumo.statusFluxo === 'aprovado'"
          variant="secondary"
          @click="reavaliarControleDemonstracao(riscoEmResumo)"
        >
          Reavaliar controle (demonstração)
        </BrButton>
        <RouterLink
          v-if="riscoEmResumo"
          :to="{ name: 'ficha-bowtie-detalhe', params: { id: riscoEmResumo.id } }"
          class="br-button primary"
        >
          Ver ficha completa
        </RouterLink>
      </template>
    </SideSheet>
  </div>
</template>

<style scoped>
/* No celular: 1 coluna. A partir de 768 px a busca ocupa 2 colunas da grade. */
.filtros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  align-items: end;
  gap: var(--esp-3) var(--esp-4);
  padding: var(--esp-4);
  margin-bottom: var(--esp-3);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
}

@media (min-width: 768px) {
  .filtros > :first-child {
    grid-column: span 2;
  }
}

.filtros__alternador {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  cursor: pointer;
}

.resumo-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo);
  margin-bottom: var(--esp-3);
}

.resumo-filtros__contagem {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.link-botao {
  padding: var(--esp-1);
  border: 0;
  background: transparent;
  color: var(--texto-link);
  font: inherit;
  font-size: var(--texto-sm);
  text-decoration: underline;
  cursor: pointer;
}

.codigo-botao {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--texto-link);
  font: inherit;
  font-family: var(--fonte-mono);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  white-space: nowrap;
  cursor: pointer;
}

.codigo-botao:hover {
  text-decoration: underline;
}

.celula-objeto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 12rem;
  max-width: 24rem;
}

.celula-objeto__nome {
  font-weight: var(--peso-semi);
}

/* Evento em até 2 linhas, com "…" no fim (o texto completo está no painel). */
.celula-objeto__evento {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--texto-secundario);
}

.resumo__etiquetas {
  margin-bottom: var(--esp-4);
}

.resumo__dados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--esp-3);
  margin: 0 0 var(--esp-4);
}

.resumo__dados dt {
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

.resumo__dados dd {
  margin: 0;
  font-size: var(--texto-sm);
}

.resumo__subtitulo {
  margin: var(--esp-4) 0 var(--esp-2);
  font-size: var(--texto-md);
  font-weight: var(--peso-semi);
}

.resumo__descricao {
  margin: 0;
  font-size: var(--texto-sm);
}
</style>
