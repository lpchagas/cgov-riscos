<script setup lang="ts">
/**
 * ============================================================================
 * MONITORAMENTO (`MonitoramentoKriPlanoAcaoView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Rotina contínua da 1ª Linha (Seções 4.5, 4.5.1 e 4.6 da Metodologia):
 *   - aba INDICADORES: o "semáforo" de cada KRI (Indicador-Chave de Risco)
 *     pela ÚLTIMA leitura, e o botão "Registrar leitura";
 *   - aba PLANO DE AÇÃO: as ações 5W2H com prazo e situação.
 *
 * Regra de governança mantida: registrar leitura ou atualizar o andamento de
 * uma ação NÃO reabre a validação do risco. Só mudar Probabilidade, Impacto ou
 * controle reabre (isso fica na Ficha do risco).
 *
 * A aba aberta fica na URL (`/monitoramento?aba=plano`), para o link
 * "Ver plano de ação" do Painel abrir direto no lugar certo.
 */
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import type { FichaRisco, IndicadorKri, MedicaoKri, RespostaTratamento5W2H } from '../types/radar.types';
import { dataCurta, diasAte } from '../utils/painelResumo';
import StatCard from '../components/ui/StatCard.vue';
import Chip from '../components/ui/Chip.vue';
import Dialog from '../components/ui/Dialog.vue';
import FormField from '../components/ui/FormField.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import EmptyState from '../components/ui/EmptyState.vue';
import BrTabs from '../components/govbr/BrTabs.vue';
import BrButton from '../components/govbr/BrButton.vue';
import type { TomVisual } from '../utils/rotulosInterface';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const { mostrar } = useToast();
const hoje = new Date();

// ---------------------------------------------------------------------------
// ABA ATIVA (na URL)
// ---------------------------------------------------------------------------
const aba = computed<string>({
  get: () => (route.query.aba === 'plano' ? 'plano' : 'indicadores'),
  set: (a) => router.replace({ query: a === 'plano' ? { aba: 'plano' } : {} }),
});

// ---------------------------------------------------------------------------
// INDICADORES (KRIs)
// ---------------------------------------------------------------------------
interface LinhaKri {
  risco: FichaRisco;
  kri: IndicadorKri;
  /** Leituras da mais recente para a mais antiga. */
  leituras: MedicaoKri[];
  semaforo: { tom: TomVisual; icone: string; rotulo: string };
}

function semaforo(ultima?: MedicaoKri): LinhaKri['semaforo'] {
  if (!ultima) return { tom: 'neutro', icone: 'fa-regular fa-circle', rotulo: 'Sem leitura' };
  return ultima.emAlerta
    ? { tom: 'perigo', icone: 'fa-solid fa-triangle-exclamation', rotulo: 'Em alerta' }
    : { tom: 'sucesso', icone: 'fa-solid fa-circle-check', rotulo: 'Dentro do limite' };
}

const kris = computed<LinhaKri[]>(() => {
  const linhas = riscosStore.riscos.flatMap((risco) =>
    risco.kris.map((kri) => {
      const leituras = [...kri.medicoes].sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao));
      return { risco, kri, leituras, semaforo: semaforo(leituras[0]) };
    })
  );
  // Em alerta primeiro, depois sem leitura, depois os demais.
  const peso = { perigo: 0, neutro: 1 } as Record<string, number>;
  return linhas.sort((a, b) => (peso[a.semaforo.tom] ?? 2) - (peso[b.semaforo.tom] ?? 2));
});
const krisEmAlerta = computed(() => kris.value.filter((k) => k.semaforo.tom === 'perigo').length);

// Registrar leitura (janela)
const leituraDe = ref<LinhaKri | null>(null);
const formLeitura = ref({ data: '', valor: '', emAlerta: false, observacao: '' });
const erroValor = ref<string | undefined>();

function abrirLeitura(linha: LinhaKri): void {
  leituraDe.value = linha;
  formLeitura.value = { data: hoje.toISOString().slice(0, 10), valor: '', emAlerta: false, observacao: '' };
  erroValor.value = undefined;
}

function salvarLeitura(): void {
  const l = leituraDe.value;
  if (!l) return;
  if (!formLeitura.value.valor.trim()) {
    erroValor.value = 'Informe o valor apurado (ex.: 85%).';
    return;
  }
  riscosStore.registrarMedicaoKri(l.risco.id, l.kri.id, {
    dataMedicao: formLeitura.value.data,
    valorApurado: formLeitura.value.valor.trim(),
    emAlerta: formLeitura.value.emAlerta,
    observacao: formLeitura.value.observacao.trim() || undefined,
  });
  leituraDe.value = null;
  mostrar({
    tom: formLeitura.value.emAlerta ? 'aviso' : 'sucesso',
    mensagem: `Leitura registrada em ${l.kri.nomeIndicador}${formLeitura.value.emAlerta ? ' (em alerta)' : ''}.`,
  });
}

// ---------------------------------------------------------------------------
// PLANO DE AÇÃO (5W2H)
// ---------------------------------------------------------------------------
interface LinhaAcao {
  id: string;
  risco: FichaRisco;
  acao: RespostaTratamento5W2H;
  dias: number;
}

const acoes = computed<LinhaAcao[]>(() =>
  riscosStore.riscos.flatMap((risco) =>
    risco.respostasTratamento.map((acao) => ({ id: acao.id, risco, acao, dias: diasAte(acao.prazoQuando, hoje) }))
  )
);
const concluidas = computed(() => acoes.value.filter((a) => a.acao.statusExecucao === 'concluida').length);
const atrasadas = computed(
  () => acoes.value.filter((a) => a.acao.statusExecucao !== 'concluida' && (a.dias < 0 || a.acao.statusExecucao === 'atrasada')).length
);

const SITUACOES: { valor: RespostaTratamento5W2H['statusExecucao']; rotulo: string }[] = [
  { valor: 'nao_iniciada', rotulo: 'Não iniciada' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluida', rotulo: 'Concluída' },
  { valor: 'atrasada', rotulo: 'Atrasada' },
];

function prazo(l: LinhaAcao): { texto: string; tom: TomVisual } {
  if (l.acao.statusExecucao === 'concluida') return { texto: 'concluída', tom: 'sucesso' };
  if (l.dias < 0) return { texto: `atrasada há ${-l.dias} ${-l.dias === 1 ? 'dia' : 'dias'}`, tom: 'perigo' };
  if (l.dias === 0) return { texto: 'vence hoje', tom: 'aviso' };
  return { texto: `vence em ${l.dias} ${l.dias === 1 ? 'dia' : 'dias'}`, tom: l.dias <= 15 ? 'aviso' : 'neutro' };
}

function mudarSituacao(l: LinhaAcao, valor: RespostaTratamento5W2H['statusExecucao']): void {
  riscosStore.atualizarStatusTratamento(l.risco.id, l.acao.id, valor);
  mostrar({ tom: 'sucesso', mensagem: `Ação de ${l.risco.codigoRadar}: ${SITUACOES.find((s) => s.valor === valor)?.rotulo}.` });
}

const colunasAcoes: ColunaTabela<LinhaAcao>[] = [
  { chave: 'acao', rotulo: 'Ação (o quê · quem)' },
  { chave: 'risco', rotulo: 'Risco', ocultarNoCelular: true },
  { chave: 'dias', rotulo: 'Prazo', ordenavel: true, valorOrdenacao: (l) => l.dias },
  { chave: 'situacao', rotulo: 'Situação' },
];
</script>

<template>
  <div class="monitoramento">
    <aside class="lembrete" aria-label="Regra do monitoramento">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <p>
        Registrar leituras e atualizar ações <strong>não reabre</strong> a validação do risco.
        Só mudar Probabilidade, Impacto ou controle reabre — isso é feito na ficha do risco.
      </p>
    </aside>

    <section class="monitoramento__kpis" aria-label="Resumo do monitoramento">
      <StatCard rotulo="Indicadores (KRIs)" :valor="kris.length" descricao="Indicadores-Chave de Risco ativos" />
      <StatCard rotulo="Em alerta" :valor="krisEmAlerta" tom="perigo" descricao="Última leitura passou do limite" />
      <StatCard rotulo="Ações do plano" :valor="acoes.length" tom="info" :descricao="`${concluidas} concluída${concluidas === 1 ? '' : 's'}`" />
      <StatCard rotulo="Ações atrasadas" :valor="atrasadas" tom="aviso" descricao="Prazo vencido e não concluídas" />
    </section>

    <section class="cartao">
      <BrTabs
        v-model:aba-ativa="aba"
        rotulo="Monitoramento"
        :abas="[
          { id: 'indicadores', rotulo: 'Indicadores', icone: 'fa-solid fa-wave-square', contador: kris.length },
          { id: 'plano', rotulo: 'Plano de ação', icone: 'fa-solid fa-list-check', contador: acoes.length },
        ]"
      >
        <template #default="{ aba: abaAtual }">
          <!-- ABA INDICADORES -->
          <template v-if="abaAtual === 'indicadores'">
            <ul v-if="kris.length" class="kris">
              <li v-for="l in kris" :key="l.kri.id" class="kri">
                <div class="kri__cabecalho">
                  <div>
                    <h2 class="kri__nome">{{ l.kri.nomeIndicador }}</h2>
                    <p class="texto-apoio">
                      <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: l.risco.id } }" class="codigo">
                        {{ l.risco.codigoRadar }}
                      </RouterLink>
                      · {{ l.risco.nomeObjetoCache }} · {{ l.kri.periodicidade }}
                    </p>
                  </div>
                  <Chip :tom="l.semaforo.tom" :icone="l.semaforo.icone">{{ l.semaforo.rotulo }}</Chip>
                </div>

                <dl class="kri__dados">
                  <div><dt>Meta</dt><dd>{{ l.kri.metaAlvo }}</dd></div>
                  <div><dt>Alerta</dt><dd>{{ l.kri.limiteAlerta }}</dd></div>
                  <div>
                    <dt>Última leitura</dt>
                    <dd>
                      <template v-if="l.leituras[0]">
                        <strong>{{ l.leituras[0].valorApurado }}</strong> em {{ dataCurta(l.leituras[0].dataMedicao) }}
                      </template>
                      <template v-else>—</template>
                    </dd>
                  </div>
                  <div><dt>Responsável</dt><dd>{{ l.kri.responsavelMedicao }}</dd></div>
                </dl>

                <details v-if="l.leituras.length > 1" class="kri__historico">
                  <summary>Histórico ({{ l.leituras.length }} leituras)</summary>
                  <ol>
                    <li v-for="m in l.leituras" :key="m.id">
                      {{ dataCurta(m.dataMedicao) }}: <strong>{{ m.valorApurado }}</strong>
                      <span v-if="m.emAlerta" class="kri__alerta">· em alerta</span>
                      <span v-if="m.observacao" class="texto-apoio"> — {{ m.observacao }}</span>
                    </li>
                  </ol>
                </details>

                <div class="kri__acoes">
                  <BrButton variant="secondary" icon="fa-solid fa-plus" @click="abrirLeitura(l)">Registrar leitura</BrButton>
                </div>
              </li>
            </ul>
            <EmptyState v-else titulo="Nenhum indicador cadastrado" descricao="Os indicadores são definidos na ficha de cada risco." icone="fa-solid fa-wave-square" />
          </template>

          <!-- ABA PLANO DE AÇÃO -->
          <template v-else>
            <p class="progresso" :aria-label="`${concluidas} de ${acoes.length} ações concluídas`">
              <span class="progresso__trilho" aria-hidden="true">
                <span class="progresso__barra" :style="{ width: acoes.length ? `${(concluidas / acoes.length) * 100}%` : '0%' }"></span>
              </span>
              <span aria-hidden="true">{{ concluidas }} de {{ acoes.length }} concluídas</span>
            </p>
            <DataTable
              :colunas="colunasAcoes"
              :linhas="acoes"
              chave-linha="id"
              legenda="Ações do plano de tratamento (5W2H)"
              :ordenacao-inicial="{ chave: 'dias', direcao: 'asc' }"
            >
              <template #celula-acao="{ linha }">
                <span class="acao">
                  <span class="acao__oque">{{ linha.acao.acaoOQue }}</span>
                  <span class="texto-apoio">{{ linha.acao.responsavelQuem }} · {{ linha.acao.estrategia }}</span>
                </span>
              </template>
              <template #celula-risco="{ linha }">
                <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: linha.risco.id } }" class="codigo">
                  {{ linha.risco.codigoRadar }}
                </RouterLink>
              </template>
              <template #celula-dias="{ linha }">
                <span class="prazo">
                  {{ dataCurta(linha.acao.prazoQuando) }}
                  <Chip :tom="prazo(linha).tom">{{ prazo(linha).texto }}</Chip>
                </span>
              </template>
              <template #celula-situacao="{ linha }">
                <select
                  class="situacao"
                  :value="linha.acao.statusExecucao"
                  :aria-label="`Situação da ação: ${linha.acao.acaoOQue}`"
                  @change="mudarSituacao(linha, ($event.target as HTMLSelectElement).value as RespostaTratamento5W2H['statusExecucao'])"
                >
                  <option v-for="s in SITUACOES" :key="s.valor" :value="s.valor">{{ s.rotulo }}</option>
                </select>
              </template>
              <template #vazio>
                <EmptyState titulo="Nenhuma ação cadastrada" descricao="As ações 5W2H são definidas na ficha de cada risco." />
              </template>
            </DataTable>
          </template>
        </template>
      </BrTabs>
    </section>

    <!-- REGISTRAR LEITURA -->
    <Dialog :aberto="leituraDe !== null" titulo="Registrar leitura" @fechar="leituraDe = null">
      <template v-if="leituraDe">
        <p class="texto-apoio dialogo-contexto">
          <strong>{{ leituraDe.kri.nomeIndicador }}</strong> · {{ leituraDe.risco.codigoRadar }}<br />
          Meta: {{ leituraDe.kri.metaAlvo }} · Alerta: {{ leituraDe.kri.limiteAlerta }}
        </p>
        <div class="formulario">
          <FormField rotulo="Data da leitura" obrigatorio v-slot="{ attrs }">
            <input v-bind="attrs" v-model="formLeitura.data" type="date" />
          </FormField>
          <FormField rotulo="Valor apurado" ajuda="Como na fórmula do indicador (ex.: 85%)." :erro="erroValor" obrigatorio v-slot="{ attrs }">
            <input v-bind="attrs" v-model="formLeitura.valor" type="text" />
          </FormField>
          <label class="formulario__marcar">
            <input v-model="formLeitura.emAlerta" type="checkbox" />
            A leitura passou do limite de alerta
          </label>
          <FormField rotulo="Observação ou providência" v-slot="{ attrs }">
            <textarea v-bind="attrs" v-model="formLeitura.observacao" rows="2"></textarea>
          </FormField>
        </div>
      </template>
      <template #acoes>
        <BrButton variant="secondary" @click="leituraDe = null">Cancelar</BrButton>
        <BrButton variant="primary" @click="salvarLeitura">Salvar leitura</BrButton>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.monitoramento {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

.lembrete {
  display: flex;
  gap: var(--esp-3);
  padding: var(--esp-3) var(--esp-4);
  background: var(--cor-info-suave);
  border-left: 4px solid var(--cor-info);
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
}

.lembrete p {
  margin: 0;
}

.lembrete > i {
  margin-top: 3px;
  color: var(--cor-info);
}

.monitoramento__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--esp-4);
}

.cartao {
  padding: var(--esp-2) var(--esp-5) var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.codigo {
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
  white-space: nowrap;
}

/* --- Indicadores --- */
.kris {
  margin: 0;
  padding: 0;
  list-style: none;
}

.kri {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-4) 0;
  border-top: 1px solid var(--borda);
}

.kri:first-child {
  border-top: 0;
  padding-top: 0;
}

.kri__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-2) var(--esp-4);
}

.kri__nome {
  margin: 0 0 var(--esp-1);
  font-size: var(--texto-md);
  font-weight: var(--peso-forte);
}

.kri__dados {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--esp-3);
  margin: 0;
  font-size: var(--texto-sm);
}

.kri__dados dt {
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kri__dados dd {
  margin: 0;
}

.kri__historico {
  font-size: var(--texto-sm);
}

.kri__historico summary {
  min-height: var(--alvo-minimo);
  display: flex;
  align-items: center;
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  cursor: pointer;
}

.kri__historico ol {
  margin: 0;
  padding-left: var(--esp-5);
}

.kri__alerta {
  color: var(--cor-perigo);
  font-weight: var(--peso-semi);
}

.kri__acoes {
  display: flex;
}

/* --- Plano de ação --- */
.progresso {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  margin: 0 0 var(--esp-4);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.progresso__trilho {
  flex: 1;
  max-width: 20rem;
  height: 10px;
  overflow: hidden;
  border-radius: var(--raio-pilula);
  background: var(--superficie-alta);
}

.progresso__barra {
  display: block;
  height: 100%;
  background: var(--cor-sucesso);
}

.acao {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 14rem;
}

.acao__oque {
  font-weight: var(--peso-semi);
}

.prazo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-1);
  white-space: nowrap;
}

.situacao {
  min-width: 10rem;
}

/* --- Janela de leitura --- */
.dialogo-contexto {
  margin-bottom: var(--esp-4);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.formulario__marcar {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  font-weight: var(--peso-semi);
}

@media (max-width: 1180px) {
  .monitoramento__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .kri__dados {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-1) var(--esp-4) var(--esp-4);
  }
  .monitoramento__kpis {
    gap: var(--esp-3);
  }
}
</style>
