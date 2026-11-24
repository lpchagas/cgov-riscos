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
 *
 * ALERTA DO KRI (tela P-02, LAC-03): quem decide se a leitura passou do limite é
 * o BANCO (compara o número com o limite do KRI e abre o alerta). A tela só mostra:
 *   - a lista por URGÊNCIA (prazo vencido, em alerta, comunicado, sem limite,
 *     dentro do limite), com filtro e páginas de 10 cartões: o que pede ação
 *     nunca cai na página 2;
 *   - no cartão em alerta, a faixa com o prazo de 10 dias úteis e os atalhos
 *     "Reavaliar" (um por risco) e "Comunicar à CGOV" (`FaixaAlertaKri`);
 *   - o filtro também fica na URL (`?situacao=alerta`): é o destino do
 *     indicador "Alertas abertos" do topo.
 */
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { AlertaKri, FichaRisco, IndicadorKri, MedicaoKri, RespostaTratamento5W2H } from '../types/radar.types';
import { dataCurta, diasAte } from '../utils/painelResumo';
import { alertaAtualDoKri, ordenarPorUrgencia, situacaoKri, type SituacaoKri } from '../utils/situacaoKri';
import { numeroDaLeitura, passaDoLimite, textoLimite } from '../utils/limiteAlerta';
import { hojeEmBrasilia } from '../utils/diasUteis';
import StatCard from '../components/ui/StatCard.vue';
import Chip from '../components/ui/Chip.vue';
import Dialog from '../components/ui/Dialog.vue';
import FormField from '../components/ui/FormField.vue';
import DataTable from '../components/ui/DataTable.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import BrTabs from '../components/govbr/BrTabs.vue';
import BrButton from '../components/govbr/BrButton.vue';
import FaixaAlertaKri from '../components/radar/FaixaAlertaKri.vue';
import type { TomVisual } from '../utils/rotulosInterface';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();
const hoje = new Date();

/** AUDIT (e quem só lê) vê a faixa e o prazo, sem os atalhos (Matriz §7, linha "Monitoramento"). */
const somenteLeitura = computed(() => authStore.capacidades.somenteLeituraForaDaUnidade);

// ---------------------------------------------------------------------------
// ABA ATIVA E FILTRO (os dois na URL)
// ---------------------------------------------------------------------------
type Filtro = 'todos' | 'alerta' | 'sem_limite' | 'dentro';
const FILTROS: Filtro[] = ['todos', 'alerta', 'sem_limite', 'dentro'];

/**
 * Troca UMA chave da URL e mantém as outras. Valor `undefined` apaga a chave.
 * Ex.: na URL `?situacao=alerta`, mudarConsulta('aba', 'plano') -> `?situacao=alerta&aba=plano`.
 */
function mudarConsulta(chave: string, valor: string | undefined): void {
  const consulta = { ...route.query };
  if (valor === undefined) delete consulta[chave];
  else consulta[chave] = valor;
  void router.replace({ query: consulta });
}

const aba = computed<string>({
  get: () => (route.query.aba === 'plano' ? 'plano' : 'indicadores'),
  set: (a) => mudarConsulta('aba', a === 'plano' ? 'plano' : undefined),
});

const filtro = computed<Filtro>({
  get: () => (FILTROS.includes(route.query.situacao as Filtro) ? (route.query.situacao as Filtro) : 'todos'),
  set: (f) => mudarConsulta('situacao', f === 'todos' ? undefined : f),
});

// ---------------------------------------------------------------------------
// INDICADORES (KRIs)
// ---------------------------------------------------------------------------
interface LinhaKri {
  /** Riscos ligados a este KRI (só os que a pessoa enxerga). Vazio = KRI sem risco ligado. */
  riscos: FichaRisco[];
  kri: IndicadorKri;
  /** Leituras da mais recente para a mais antiga. */
  leituras: MedicaoKri[];
  /** O alerta que vale para a tela (o aberto ou, se não houver, o último comunicado). */
  alerta?: AlertaKri;
  situacao: SituacaoKri;
}

/**
 * Selo do cartão (e cor da faixa à esquerda): vermelho em alerta, verde dentro
 * do limite ou comunicado, cinza sem limite. Sempre com ícone e texto.
 */
function selo(l: LinhaKri): { tom: TomVisual; icone: string; rotulo: string } {
  switch (l.situacao) {
    case 'vencido':
    case 'alerta':
      return { tom: 'perigo', icone: 'fa-solid fa-triangle-exclamation', rotulo: 'Em alerta' };
    case 'comunicado':
      return { tom: 'sucesso', icone: 'fa-solid fa-circle-check', rotulo: 'Alerta comunicado' };
    case 'sem_limite':
      return { tom: 'neutro', icone: 'fa-regular fa-circle', rotulo: 'Sem limite numérico' };
    default:
      // Tem limite e nenhum alerta; sem nenhuma leitura ainda, dizemos isso.
      return l.leituras.length
        ? { tom: 'sucesso', icone: 'fa-solid fa-circle-check', rotulo: 'Dentro do limite' }
        : { tom: 'neutro', icone: 'fa-regular fa-circle', rotulo: 'Sem leitura' };
  }
}

/** Limite numérico? (operador + número; 0 vale). Sem ele, o sistema não verifica o alerta. */
function temLimiteNumerico(k: IndicadorKri): boolean {
  return !!k.limiteOperador && typeof k.limiteValor === 'number' && Number.isFinite(k.limiteValor);
}

/** Nome do objeto do KRI (para o KRI sem risco ligado, que não tem `nomeObjetoCache`). */
function nomeObjeto(l: LinhaKri): string | undefined {
  return l.riscos[0]?.nomeObjetoCache ?? riscosStore.objetosContexto.find((o) => o.id === l.kri.objetoId)?.nomeObjeto;
}

/**
 * Uma linha por KRI (e não por risco x KRI). Um KRI compartilhado aparece nos
 * `kris` de cada risco ligado a ele, sempre com o mesmo `id`: agrupamos por `id`
 * e juntamos os riscos. Exemplo: o KRI ligado a RADAR-2026-001 e RADAR-2026-004
 * vira UM cartão com "Riscos: RADAR-2026-001, RADAR-2026-004".
 * Só entram os riscos que a tela já mostra à pessoa (os da carteira dela).
 * Também entram os KRIs SEM risco ligado que têm alerta (o alerta não pode sumir
 * antes de ser comunicado à CGOV).
 * Ordem: por urgência (vencido → alerta → comunicado → sem limite → dentro).
 */
const kris = computed<LinhaKri[]>(() => {
  const porId = new Map<string, { riscos: FichaRisco[]; kri: IndicadorKri }>();
  for (const risco of riscosStore.riscos) {
    for (const kri of risco.kris) {
      const existente = porId.get(kri.id);
      if (existente) existente.riscos.push(risco);
      else porId.set(kri.id, { riscos: [risco], kri });
    }
  }
  for (const kri of riscosStore.krisSemRisco) {
    if (!porId.has(kri.id) && alertaAtualDoKri(riscosStore.alertasKri, kri.id)) porId.set(kri.id, { riscos: [], kri });
  }
  const linhas = [...porId.values()].map(({ riscos, kri }) => {
    const alerta = alertaAtualDoKri(riscosStore.alertasKri, kri.id);
    return {
      riscos,
      kri,
      leituras: [...kri.medicoes].sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao)),
      alerta,
      situacao: situacaoKri(kri, alerta),
    };
  });
  return ordenarPorUrgencia(linhas, (l) => l.situacao);
});

/**
 * Em que opção do filtro cada situação cai. O prazo vencido também é "Em alerta".
 * O alerta já comunicado só aparece em "Todos" (não pede mais ação nem é "dentro").
 */
function grupoDoFiltro(s: SituacaoKri): Filtro | null {
  if (s === 'vencido' || s === 'alerta') return 'alerta';
  if (s === 'sem_limite' || s === 'dentro') return s;
  return null;
}

const contagem = computed<Record<Filtro, number>>(() => {
  const c: Record<Filtro, number> = { todos: kris.value.length, alerta: 0, sem_limite: 0, dentro: 0 };
  for (const l of kris.value) {
    const g = grupoDoFiltro(l.situacao);
    if (g) c[g]++;
  }
  return c;
});

const opcoesFiltro = computed(() => [
  { valor: 'todos' as Filtro, rotulo: `Todos (${contagem.value.todos})` },
  { valor: 'alerta' as Filtro, rotulo: `Em alerta (${contagem.value.alerta})` },
  { valor: 'sem_limite' as Filtro, rotulo: `Sem limite (${contagem.value.sem_limite})` },
  { valor: 'dentro' as Filtro, rotulo: `Dentro do limite (${contagem.value.dentro})` },
]);

const krisFiltrados = computed(() =>
  filtro.value === 'todos' ? kris.value : kris.value.filter((l) => grupoDoFiltro(l.situacao) === filtro.value)
);

/** Alertas ABERTOS (prazo correndo ou vencido) dos KRIs da lista. O comunicado não conta. */
const alertasAbertos = computed(
  () => kris.value.filter((l) => l.situacao === 'vencido' || l.situacao === 'alerta').length
);

// Páginas numeradas de 10 cartões (como a paginação do DataTable, com os números).
const POR_PAGINA = 10;
const pagina = ref(1);
const totalPaginas = computed(() => Math.max(1, Math.ceil(krisFiltrados.value.length / POR_PAGINA)));
const krisDaPagina = computed(() => krisFiltrados.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA));
const faixaExibida = computed(() => {
  const total = krisFiltrados.value.length;
  const inicio = (pagina.value - 1) * POR_PAGINA + 1;
  return `${inicio}–${Math.min(pagina.value * POR_PAGINA, total)} de ${total} indicadores`;
});
// Trocar o filtro volta para a página 1; a lista encolher não deixa a página "vazia".
watch(filtro, () => (pagina.value = 1));
watch(totalPaginas, (t) => {
  if (pagina.value > t) pagina.value = t;
});

// Registrar leitura (janela)
const leituraDe = ref<LinhaKri | null>(null);
const formLeitura = ref({ data: '', valor: '', observacao: '' });
const erroValor = ref<string | undefined>();
/** Recusa vinda do banco (já traduzida). Fica no painel, com o formulário preenchido, para tentar de novo. */
const erroGravacao = ref<string | undefined>();
/** true enquanto a leitura está sendo gravada: evita duplo clique gravar duas medições. */
const gravandoLeitura = ref(false);

/** A tela segue o estado da carteira: carregando → esqueleto; erro → mensagem + "Tentar de novo". */
const estadoBloco = computed<'carregando' | 'erro' | 'pronto'>(() =>
  riscosStore.estado === 'erro' ? 'erro' : riscosStore.estado === 'pronto' ? 'pronto' : 'carregando'
);

/** Texto do limite no cartão e na janela. Ex.: "Alerta quando menor que 80 %". */
function textoAlerta(k: IndicadorKri): string {
  if (temLimiteNumerico(k)) return `Alerta quando ${textoLimite(k.limiteOperador!, k.limiteValor!, k.limiteUnidade)}`;
  return `Alerta: ${k.limiteAlerta?.trim() || 'limite não definido'}`;
}

/** A leitura digitada passa do limite? (`undefined` = não dá para saber: sem limite ou sem número). */
const leituraPassa = computed<boolean | undefined>(() => {
  const k = leituraDe.value?.kri;
  if (!k || !temLimiteNumerico(k)) return undefined;
  const n = numeroDaLeitura(formLeitura.value.valor);
  return n === undefined ? undefined : passaDoLimite(n, k.limiteOperador!, k.limiteValor!);
});

/**
 * Mensagem automática da janela (substitui a antiga caixa "passou do limite"):
 * muda enquanto a pessoa digita. Os 3 casos da P-02:
 *   - "Esta leitura passa do limite" (aviso);
 *   - "Dentro do limite (alerta quando menor que 80 %)" (sucesso);
 *   - "Sem limite numérico: o sistema não verifica o alerta" (informação).
 * Antes de digitar (ou sem número), só lembra qual é o limite.
 */
const avisoLeitura = computed<{ estado: 'info' | 'success' | 'warning'; titulo?: string; texto: string } | null>(() => {
  const k = leituraDe.value?.kri;
  if (!k) return null;
  if (!temLimiteNumerico(k)) {
    return {
      estado: 'info',
      texto: k.limiteAlerta?.trim()
        ? 'Sem limite numérico: o sistema não verifica o alerta (limite a converter na ficha do risco).'
        : 'Sem limite numérico: o sistema não verifica o alerta.',
    };
  }
  const limite = textoLimite(k.limiteOperador!, k.limiteValor!, k.limiteUnidade);
  if (!formLeitura.value.valor.trim()) return { estado: 'info', texto: `Alerta quando o valor for ${limite}.` };
  if (leituraPassa.value === undefined) {
    return { estado: 'info', texto: `Escreva só o número (ex.: 72 ou 72%) para o sistema comparar com o limite (alerta quando ${limite}).` };
  }
  if (leituraPassa.value) {
    const aberto = riscosStore.alertaAbertoDoKri(k.id);
    return {
      estado: 'warning',
      titulo: 'Esta leitura passa do limite',
      texto: aberto
        ? `O alerta aberto em ${dataCurta(aberto.cienciaEm)} continua; o prazo de 10 dias úteis não recomeça.`
        : 'Ao gravar, o KRI entra em alerta e começa o prazo de 10 dias úteis.',
    };
  }
  return { estado: 'success', texto: `Dentro do limite (alerta quando ${limite}).` };
});

function abrirLeitura(linha: LinhaKri): void {
  leituraDe.value = linha;
  // "Hoje" no dia de Brasília (como o banco), e não no fuso UTC do `toISOString()`.
  formLeitura.value = { data: hojeEmBrasilia(), valor: '', observacao: '' };
  erroValor.value = undefined;
  erroGravacao.value = undefined;
}

async function salvarLeitura(): Promise<void> {
  const l = leituraDe.value;
  if (!l || !l.riscos.length) return;
  if (!formLeitura.value.valor.trim()) {
    erroValor.value = 'Informe o valor apurado (ex.: 85%).';
    return;
  }
  if (gravandoLeitura.value) return;
  gravandoLeitura.value = true;
  erroGravacao.value = undefined;
  // Guardado antes de gravar, para o aviso rápido (o formulário fecha depois).
  const passou = leituraPassa.value === true;
  // Grava no banco. Se recusar, a mensagem traduzida aparece no painel e o que a pessoa
  // digitou continua lá (ex.: "85%" não se perde por uma falha de rede).
  // NÃO mandamos "em alerta": o banco compara a leitura com o limite e abre o alerta.
  try {
    // O 1º risco ligado só serve para reler; a medição vale para o KRI (e vale para todos os riscos dele).
    await riscosStore.registrarMedicaoKri(l.riscos[0].id, l.kri.id, {
      dataMedicao: formLeitura.value.data,
      valorApurado: formLeitura.value.valor.trim(),
      observacao: formLeitura.value.observacao.trim() || undefined,
    });
  } catch (e) {
    erroGravacao.value = (e as Error).message;
    return;
  } finally {
    gravandoLeitura.value = false;
  }
  leituraDe.value = null;
  mostrar({
    tom: passou ? 'aviso' : 'sucesso',
    mensagem: `Leitura registrada em ${l.kri.nomeIndicador}${passou ? ' (passou do limite)' : ''}.`,
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

/** Ids das ações que estão sendo gravadas agora (o seletor delas fica desligado). */
const gravandoAcao = ref<string[]>([]);

async function mudarSituacao(l: LinhaAcao, valor: RespostaTratamento5W2H['statusExecucao'], seletor?: HTMLSelectElement): Promise<void> {
  if (gravandoAcao.value.includes(l.acao.id)) return;
  gravandoAcao.value.push(l.acao.id);
  try {
    await riscosStore.atualizarStatusTratamento(l.risco.id, l.acao.id, valor);
  } catch (e) {
    // O banco recusou: volta o seletor para a situação que continua valendo e avisa o motivo.
    if (seletor) seletor.value = l.acao.statusExecucao;
    mostrar({ tom: 'perigo', mensagem: (e as Error).message });
    return;
  } finally {
    gravandoAcao.value = gravandoAcao.value.filter((id) => id !== l.acao.id);
  }
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
    <EstadoCarregamento v-if="estadoBloco !== 'pronto'" :estado="estadoBloco" :erro="riscosStore.erro" formato="tabela" :linhas="6" @tentar-de-novo="riscosStore.tentarDeNovo()" />
    <template v-else>
    <aside class="lembrete" aria-label="Regra do monitoramento">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <p>
        Registrar leituras e atualizar ações <strong>não reabre</strong> a validação do risco.
        Só mudar Probabilidade, Impacto ou controle reabre — isso é feito na ficha do risco.
      </p>
    </aside>

    <section class="monitoramento__kpis" aria-label="Resumo do monitoramento">
      <StatCard rotulo="Indicadores (KRIs)" :valor="kris.length" descricao="Indicadores-Chave de Risco ativos" />
      <!-- "Alertas abertos" (e não "Em alerta"): conta o prazo de 10 dias úteis correndo; o
           filtro "Em alerta" é outra coisa (os cartões cuja leitura passou do limite). -->
      <StatCard
        rotulo="Alertas abertos"
        :valor="alertasAbertos"
        tom="perigo"
        descricao="Prazo de 10 dias úteis para reavaliar e comunicar"
        :para="{ name: 'monitoramento-kris', query: { situacao: 'alerta' } }"
      />
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
            <template v-if="kris.length">
            <SegmentedControl v-model="filtro" rotulo="Mostrar indicadores" :opcoes="opcoesFiltro" class="kris__filtro" />
            <ul v-if="krisDaPagina.length" class="kris">
              <li v-for="l in krisDaPagina" :key="l.kri.id" class="kri" :class="`kri--${selo(l).tom}`">
                <div class="kri__cabecalho">
                  <div>
                    <h2 class="kri__nome">{{ l.kri.nomeIndicador }}</h2>
                    <p class="texto-apoio">
                      <template v-if="l.riscos.length">
                        {{ l.riscos.length === 1 ? 'Risco:' : 'Riscos:' }}
                        <template v-for="(r, i) in l.riscos" :key="r.id">
                          <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: r.id } }" class="codigo">{{ r.codigoRadar }}</RouterLink><template v-if="i < l.riscos.length - 1">, </template>
                        </template>
                      </template>
                      <template v-else>Sem risco ligado</template>
                      <template v-if="nomeObjeto(l)"> · {{ nomeObjeto(l) }}</template> · {{ l.kri.periodicidade ?? 'periodicidade não definida' }}
                    </p>
                  </div>
                  <Chip :tom="selo(l).tom" :icone="selo(l).icone">{{ selo(l).rotulo }}</Chip>
                </div>

                <!-- Cartão compacto: limite e última leitura; o resto fica em "Ver detalhes". -->
                <p class="kri__resumo">
                  <span>{{ textoAlerta(l.kri) }}</span>
                  <span>
                    Última leitura:
                    <template v-if="l.leituras[0]"><strong>{{ l.leituras[0].valorApurado }}</strong> ({{ dataCurta(l.leituras[0].dataMedicao) }})</template>
                    <template v-else>nenhuma</template>
                  </span>
                </p>
                <p v-if="!temLimiteNumerico(l.kri) && l.kri.limiteAlerta?.trim()" class="kri__converter">
                  <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                  Limite a converter: informe o operador e o número na ficha do risco.
                </p>

                <FaixaAlertaKri
                  v-if="l.alerta && (l.situacao === 'vencido' || l.situacao === 'alerta' || l.situacao === 'comunicado')"
                  :alerta="l.alerta"
                  :situacao="l.situacao"
                  :nome-kri="l.kri.nomeIndicador"
                  :riscos="l.riscos"
                  :somente-leitura="somenteLeitura"
                />

                <details class="kri__detalhes">
                  <summary>Ver detalhes</summary>
                  <dl class="kri__dados">
                    <div><dt>Meta</dt><dd>{{ l.kri.metaAlvo ?? 'meta não definida' }}</dd></div>
                    <div><dt>Responsável</dt><dd>{{ l.kri.responsavelMedicao ?? 'responsável não definido' }}</dd></div>
                  </dl>
                  <h3 class="kri__subtitulo">Histórico ({{ l.leituras.length }} {{ l.leituras.length === 1 ? 'leitura' : 'leituras' }})</h3>
                  <ol v-if="l.leituras.length" class="kri__historico">
                    <li v-for="m in l.leituras" :key="m.id">
                      {{ dataCurta(m.dataMedicao) }}: <strong>{{ m.valorApurado }}</strong>
                      <span v-if="m.emAlerta" class="kri__alerta">· passou do limite</span>
                      <span v-if="m.observacao" class="texto-apoio"> — {{ m.observacao }}</span>
                    </li>
                  </ol>
                  <p v-else class="texto-apoio">Nenhuma leitura registrada.</p>
                </details>

                <div v-if="l.riscos.length" class="kri__acoes">
                  <BrButton variant="secondary" icon="fa-solid fa-plus" @click="abrirLeitura(l)">Registrar leitura</BrButton>
                </div>
              </li>
            </ul>
            <EmptyState v-else titulo="Nenhum indicador nesta situação" descricao="Escolha outra opção do filtro." icone="fa-solid fa-filter" />

            <!-- Páginas numeradas (10 cartões por página). -->
            <nav v-if="krisFiltrados.length > POR_PAGINA" class="paginacao" aria-label="Páginas dos indicadores">
              <span class="texto-apoio">{{ faixaExibida }}</span>
              <div class="paginacao__botoes">
                <button type="button" class="paginacao__botao" :disabled="pagina === 1" aria-label="Página anterior" @click="pagina--">
                  <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                </button>
                <button
                  v-for="n in totalPaginas"
                  :key="n"
                  type="button"
                  class="paginacao__botao"
                  :aria-label="`Página ${n}`"
                  :aria-current="n === pagina ? 'page' : undefined"
                  @click="pagina = n"
                >{{ n }}</button>
                <button type="button" class="paginacao__botao" :disabled="pagina === totalPaginas" aria-label="Próxima página" @click="pagina++">
                  <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
              </div>
              <span class="radar-so-leitor" aria-live="polite">Página {{ pagina }} de {{ totalPaginas }}</span>
            </nav>
            </template>
            <EmptyState v-else titulo="Nenhum indicador cadastrado" descricao="Os indicadores são definidos na ficha de cada risco." icone="fa-solid fa-wave-square" />
          </template>

          <!-- ABA PLANO DE AÇÃO -->
          <template v-else>
            <!-- Progresso do plano. A barra é só decoração (aria-hidden); quem informa é o TEXTO,
                 lido igual por quem enxerga e por quem usa leitor de tela. Não use `aria-label`
                 em <p>: leitores de tela o ignoram (regra axe "aria-prohibited-attr"). -->
            <p class="progresso">
              <span class="progresso__trilho" aria-hidden="true">
                <span class="progresso__barra" :style="{ width: acoes.length ? `${(concluidas / acoes.length) * 100}%` : '0%' }"></span>
              </span>
              <span>{{ concluidas }} de {{ acoes.length }} ações concluídas</span>
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
                  :disabled="gravandoAcao.includes(linha.acao.id)"
                  :aria-busy="gravandoAcao.includes(linha.acao.id)"
                  @change="mudarSituacao(linha, ($event.target as HTMLSelectElement).value as RespostaTratamento5W2H['statusExecucao'], $event.target as HTMLSelectElement)"
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
    </template>

    <!-- REGISTRAR LEITURA -->
    <Dialog :aberto="leituraDe !== null" titulo="Registrar leitura" @fechar="leituraDe = null">
      <template v-if="leituraDe">
        <p class="texto-apoio dialogo-contexto">
          <strong>{{ leituraDe.kri.nomeIndicador }}</strong> · {{ leituraDe.riscos.map((r) => r.codigoRadar).join(', ') }}<br />
          Meta: {{ leituraDe.kri.metaAlvo ?? 'meta não definida' }} · {{ textoAlerta(leituraDe.kri) }}
        </p>
        <BrMessage v-if="erroGravacao" state="danger">{{ erroGravacao }}</BrMessage>
        <div class="formulario">
          <FormField rotulo="Data da leitura" obrigatorio v-slot="{ attrs }">
            <input v-bind="attrs" v-model="formLeitura.data" type="date" />
          </FormField>
          <FormField rotulo="Valor apurado" ajuda="Como na fórmula do indicador (ex.: 85%)." :erro="erroValor" obrigatorio v-slot="{ attrs }">
            <input v-bind="attrs" v-model="formLeitura.valor" type="text" />
          </FormField>
          <!-- Mensagem automática (P-02): quem decide o alerta é o banco; aqui só antecipamos. -->
          <BrMessage v-if="avisoLeitura" class="leitura-aviso" :state="avisoLeitura.estado" :titulo="avisoLeitura.titulo">
            {{ avisoLeitura.texto }}
          </BrMessage>
          <FormField rotulo="Observação ou providência" v-slot="{ attrs }">
            <textarea v-bind="attrs" v-model="formLeitura.observacao" rows="2"></textarea>
          </FormField>
        </div>
      </template>
      <template #acoes>
        <BrButton variant="secondary" @click="leituraDe = null">Cancelar</BrButton>
        <BrButton variant="primary" :disabled="gravandoLeitura" :aria-busy="gravandoLeitura" @click="salvarLeitura">Salvar leitura</BrButton>
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

.kris__filtro {
  margin: var(--esp-3) 0 var(--esp-4);
}

/* Lista sobre fundo cinza-claro; cada KRI é um cartão com borda, cantos
   arredondados e uma faixa à esquerda na cor do selo (P-02, revisão do responsável). */
.kris {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-3);
  background: var(--superficie-alta);
  border-radius: var(--raio-md);
}

.kri {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-4);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-left: 4px solid var(--borda-forte);
  border-radius: var(--raio-md);
}

.kri--perigo { border-left-color: var(--cor-perigo); }
.kri--sucesso { border-left-color: var(--cor-sucesso); }

.kri__resumo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-4);
  margin: 0;
  font-size: var(--texto-sm);
}

.kri__converter {
  display: flex;
  gap: var(--esp-2);
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.kri__converter > i {
  margin-top: 3px;
  color: var(--cor-info);
}

.kri__subtitulo {
  margin: var(--esp-3) 0 var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.kri__detalhes {
  font-size: var(--texto-sm);
}

.kri__detalhes summary {
  min-height: var(--alvo-minimo);
  display: flex;
  align-items: center;
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  cursor: pointer;
}

.kri__historico {
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

/* Páginas numeradas (mesmo desenho dos botões da paginação do DataTable). */
.paginacao {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  margin-top: var(--esp-4);
  font-size: var(--texto-sm);
}

.paginacao__botoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.paginacao__botao {
  display: grid;
  place-items: center;
  min-width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  padding: 0 var(--esp-2);
  border: 1px solid var(--borda);
  border-radius: var(--raio-pilula);
  background: var(--superficie);
  color: var(--texto);
  font-weight: var(--peso-semi);
  cursor: pointer;
}

.paginacao__botao[aria-current='page'] {
  background: var(--cor-primaria);
  border-color: var(--cor-primaria);
  color: var(--texto-inverso);
}

.paginacao__botao:disabled {
  color: var(--texto-desabilitado);
  cursor: not-allowed;
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

/* A mensagem automática já fica no espaçamento do formulário (sem a margem própria do BrMessage). */
.leitura-aviso {
  margin-bottom: 0;
}

@media (max-width: 1180px) {
  .monitoramento__kpis {
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
  /* Celular (390): as 4 opções do filtro não cabem numa linha; quebram em duas
     (sem cortar nenhuma), cada uma esticando para ocupar a largura. */
  .kris__filtro {
    display: flex;
    flex-wrap: wrap;
    border-radius: var(--raio-md);
  }
  .kris__filtro :deep(.segmentado__opcao) {
    flex: 1 1 auto;
    justify-content: center;
  }
  .kris {
    padding: var(--esp-2);
  }
  .kri {
    padding: var(--esp-3);
  }
}
</style>
