<script setup lang="ts">
/**
 * ============================================================================
 * OBJETOS DE GESTÃO (`CatalogoObjetosView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * "Objeto de gestão" é ONDE o risco mora: um macroprocesso, processo, projeto,
 * plano, ação ou unidade (Seção 4.1 e Quadro 1 da Metodologia). Cada objeto tem
 * a sua linha de supervisão: unidade (1ª Linha) → Coordenação-Geral → Diretoria.
 *
 * Ligado ao banco (B3):
 *   - unidade INATIVA e processo INATIVO não aparecem nos seletores (só nos selos da tabela);
 *   - o "Supervisor do macroprocesso" é preenchido pelo RADAR quando há processo da Cadeia
 *     de Valor (aparece como TEXTO); só a CGOV, sem processo, escolhe à mão;
 *   - "Reatribuir objeto": só a CGOV, só objeto cuja unidade foi desativada.
 *
 * O que mudou na reformulação:
 *   - lista em TABELA com busca, em vez de um cartão grande por objeto;
 *   - o cadastro abre num PAINEL LATERAL (antes era um formulário fixo no topo);
 *   - todos os campos têm rótulo ligado (FormField) e o nome é obrigatório;
 *   - "Ver riscos" abre a lista de Riscos já filtrada por aquele objeto.
 */
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { ObjetoContexto, UnidadeOrganizacional } from '../types/radar.types';
import PageHeader from '../components/ui/PageHeader.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import FormField from '../components/ui/FormField.vue';
import SideSheet from '../components/ui/SideSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import Dialog from '../components/ui/Dialog.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import Chip from '../components/ui/Chip.vue';
import BrButton from '../components/govbr/BrButton.vue';

const route = useRoute();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();

// ---------------------------------------------------------------------------
// LISTA + BUSCA
// ---------------------------------------------------------------------------
const busca = ref('');
const sigla = (id: string) => riscosStore.unidades.find((u) => u.id === id)?.sigla ?? '—';
const quantidadeRiscos = (id: string) => riscosStore.riscos.filter((r) => r.objetoId === id).length;

const objetos = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) return riscosStore.objetosContexto;
  return riscosStore.objetosContexto.filter((o) =>
    [o.nomeObjeto, o.tipoObjeto, sigla(o.unidadeId), o.objetivoEstrategicoAssociado].some((t) => t.toLowerCase().includes(termo))
  );
});

/** A tela segue o estado da carteira: carregando → esqueleto; erro → mensagem + "Tentar de novo". */
const estadoBloco = computed<'carregando' | 'erro' | 'pronto'>(() =>
  riscosStore.estado === 'erro' ? 'erro' : riscosStore.estado === 'pronto' ? 'pronto' : 'carregando'
);
const ehCgov = computed(() => authStore.capacidades.editaCatalogoObjetos);

const colunas: ColunaTabela<ObjetoContexto>[] = [
  { chave: 'nomeObjeto', rotulo: 'Objeto de gestão', ordenavel: true },
  { chave: 'unidadeId', rotulo: 'Unidade (1ª Linha)', ordenavel: true, valorOrdenacao: (o) => sigla(o.unidadeId) },
  { chave: 'macroprocessoSupervisorId', rotulo: 'Supervisão', ocultarNoCelular: true },
  { chave: 'id', rotulo: 'Riscos', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (o) => quantidadeRiscos(o.id) },
  { chave: 'acoes', rotulo: 'Ações', ocultarNoCelular: true },
];

// ---------------------------------------------------------------------------
// CADASTRO (painel lateral)
// ---------------------------------------------------------------------------
const TIPOS: ObjetoContexto['tipoObjeto'][] = ['Macroprocesso', 'Processo', 'Projeto', 'Plano', 'Ação', 'Unidade'];
/** Só unidades ATIVAS entram nos seletores (unidade desativada some, mas o histórico continua). */
const porTipo = (...tipos: UnidadeOrganizacional['tipo'][]) => riscosStore.unidadesAtivas.filter((u) => tipos.includes(u.tipo));
/** Só processos ATIVOS da Cadeia de Valor podem ser vinculados a um objeto novo. */
const processosAtivos = computed(() => riscosStore.processos.filter((p) => p.ativo));

const cadastroAberto = ref(false);
const salvando = ref(false);
const erroNome = ref<string | undefined>();
const novo = ref(formularioVazio());

function formularioVazio() {
  return {
    tipoObjeto: 'Processo' as ObjetoContexto['tipoObjeto'],
    nomeObjeto: '',
    unidadeId: riscosStore.unidadesAtivas[0]?.id ?? '',
    processoId: '',
    macroprocessoSupervisorId: porTipo('coordenacao-geral', 'gerencia-regional')[0]?.id ?? '',
    diretoriaId: porTipo('diretoria')[0]?.id ?? '',
    objetivoEstrategicoAssociado: '',
    entregasPrincipais: '',
    partesInteressadas: '',
  };
}

/**
 * O supervisor é SOMENTE LEITURA quando:
 *   - há processo da Cadeia de Valor escolhido (o banco o preenche a partir do processo), ou
 *   - a pessoa não é CGOV (só a CGOV escolhe supervisor à mão).
 * Ex.: processo "Autorização de pesquisa" supervisionado pela CGEUP → texto "CGEUP — ...".
 */
const supervisorSomenteLeitura = computed(() => !!novo.value.processoId || !ehCgov.value);
/** Unidade supervisora que o RADAR vai usar (prévia antes de salvar). */
const supervisorPrevio = computed(() => {
  const proc = riscosStore.processos.find((p) => p.id === novo.value.processoId);
  const id = proc ? proc.unidadeSupervisoraId : novo.value.macroprocessoSupervisorId;
  const u = riscosStore.unidades.find((x) => x.id === id);
  return u ? `${u.sigla} — ${u.nome}` : 'Será definida pelo RADAR';
});

function abrirCadastro(): void {
  novo.value = formularioVazio();
  erroNome.value = undefined;
  cadastroAberto.value = true;
}

async function salvar(): Promise<void> {
  if (novo.value.nomeObjeto.trim().length < 3) {
    erroNome.value = 'Informe o nome do objeto (pelo menos 3 caracteres).';
    return;
  }
  if (salvando.value) return; // duplo clique não cria dois objetos
  salvando.value = true;
  // Grava no banco; recusa → mensagem já traduzida.
  let obj: ObjetoContexto;
  try {
    const { processoId, macroprocessoSupervisorId, ...resto } = novo.value;
    obj = await riscosStore.salvarNovoObjetoContexto({
      ...resto,
      // Com processo: o supervisor NÃO é enviado (o banco preenche pelo processo).
      // Sem processo: só a CGOV escolhe.
      processoId: processoId || null,
      ...(processoId || !ehCgov.value ? {} : { macroprocessoSupervisorId }),
      nomeObjeto: novo.value.nomeObjeto.trim(),
      objetivoEstrategicoAssociado: novo.value.objetivoEstrategicoAssociado.trim() || undefined,
      entregasPrincipais: novo.value.entregasPrincipais.trim() || undefined,
      partesInteressadas: novo.value.partesInteressadas.trim() || undefined,
      cicloAno: 2026,
    });
  } catch (e) {
    mostrar({ tom: 'perigo', mensagem: (e as Error).message });
    return;
  } finally {
    salvando.value = false;
  }
  cadastroAberto.value = false;
  mostrar({ tom: 'sucesso', mensagem: `Objeto "${obj.nomeObjeto}" cadastrado.` });
}

// ---------------------------------------------------------------------------
// REATRIBUIR OBJETO (só CGOV, só objeto cuja unidade foi desativada)
// ---------------------------------------------------------------------------
const objetoAReatribuir = ref<ObjetoContexto | null>(null);
const unidadeDestino = ref('');
const erroDestino = ref<string | undefined>();
const reatribuindo = ref(false);

const podeReatribuir = (o: ObjetoContexto) => ehCgov.value && o.unidadeAtiva === false;

function abrirReatribuir(o: ObjetoContexto): void {
  objetoAReatribuir.value = o;
  unidadeDestino.value = '';
  erroDestino.value = undefined;
}

async function confirmarReatribuicao(): Promise<void> {
  const o = objetoAReatribuir.value;
  if (!o || reatribuindo.value) return;
  if (!unidadeDestino.value) {
    erroDestino.value = 'Escolha a unidade ativa que passa a responder por este objeto.';
    return;
  }
  reatribuindo.value = true;
  erroDestino.value = undefined;
  try {
    await riscosStore.reatribuirObjeto(o.id, unidadeDestino.value);
  } catch (e) {
    // Recusa do banco (ex.: unidade de origem ainda ativa): o painel fica aberto com o motivo.
    erroDestino.value = (e as Error).message;
    return;
  } finally {
    reatribuindo.value = false;
  }
  objetoAReatribuir.value = null;
  mostrar({ tom: 'sucesso', mensagem: `Objeto "${o.nomeObjeto}" reatribuído para ${sigla(unidadeDestino.value)}.` });
}
</script>

<template>
  <div class="objetos">
    <PageHeader :titulo="route.meta.titulo ?? 'Objetos de gestão'" :descricao="route.meta.descricao" :fundamento="route.meta.fundamento">
      <template #acoes>
        <BrButton v-if="authStore.capacidades.editaCatalogoObjetos" variant="primary" icon="fa-solid fa-plus" @click="abrirCadastro">Novo objeto</BrButton>
      </template>
    </PageHeader>

    <EstadoCarregamento v-if="estadoBloco !== 'pronto'" :estado="estadoBloco" :erro="riscosStore.erro" formato="tabela" :linhas="6" @tentar-de-novo="riscosStore.tentarDeNovo()" />
    <template v-else>
    <FormField rotulo="Buscar objeto" class="objetos__busca" v-slot="{ attrs }">
      <input v-bind="attrs" v-model="busca" type="search" placeholder="Nome, tipo, unidade ou objetivo" />
    </FormField>

    <DataTable :colunas="colunas" :linhas="objetos" chave-linha="id" legenda="Objetos de gestão de riscos">
      <template #celula-nomeObjeto="{ linha }">
        <span class="objeto">
          <span class="objeto__nome">{{ linha.nomeObjeto }}</span>
          <span class="objeto__detalhe">
            <Chip tom="neutro">{{ linha.tipoObjeto }}</Chip>
            <Chip v-if="linha.processoId && linha.processoAtivo === false" tom="aviso" icone="fa-solid fa-triangle-exclamation">Processo inativo</Chip>
            {{ linha.objetivoEstrategicoAssociado }}
          </span>
        </span>
      </template>
      <template #celula-unidadeId="{ linha }">
        {{ sigla(linha.unidadeId) }}
        <Chip v-if="!linha.unidadeAtiva" tom="aviso" icone="fa-solid fa-triangle-exclamation">Unidade inativa</Chip>
      </template>
      <template #celula-macroprocessoSupervisorId="{ linha }">
        <span class="texto-apoio">{{ linha.macroprocessoSupervisorId ? sigla(linha.macroprocessoSupervisorId) : "—" }} → {{ linha.diretoriaId ? sigla(linha.diretoriaId) : "—" }}</span>
      </template>
      <template #celula-id="{ linha }">
        <RouterLink
          v-if="quantidadeRiscos(linha.id)"
          :to="{ name: 'riscos-lista', query: { q: linha.nomeObjeto } }"
          class="link-acao"
          :aria-label="`Ver ${quantidadeRiscos(linha.id)} riscos de ${linha.nomeObjeto}`"
        >
          {{ quantidadeRiscos(linha.id) }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </RouterLink>
        <span v-else class="texto-apoio">0</span>
      </template>
      <template #celula-acoes="{ linha }">
        <BrButton v-if="podeReatribuir(linha)" variant="secondary" icon="fa-solid fa-right-left" :aria-label="`Reatribuir objeto ${linha.nomeObjeto}`" @click="abrirReatribuir(linha)">Reatribuir objeto</BrButton>
      </template>
      <template #vazio>
        <EmptyState
          :titulo="busca ? 'Nenhum objeto encontrado' : 'Nenhum objeto cadastrado'"
          :descricao="busca ? 'Tente outra palavra na busca.' : 'Cadastre o primeiro processo, projeto ou unidade.'"
        />
      </template>
    </DataTable>

    <!-- CADASTRO -->
    <SideSheet :aberto="cadastroAberto" titulo="Novo objeto de gestão" subtitulo="Quadro 1 — Estabelecimento do contexto" @fechar="cadastroAberto = false">
      <form id="form-objeto" class="formulario" novalidate @submit.prevent="salvar">
        <FormField rotulo="Tipo" v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.tipoObjeto">
            <option v-for="t in TIPOS" :key="t" :value="t">{{ t }}</option>
          </select>
        </FormField>
        <FormField rotulo="Nome" ajuda="Ex.: Gestão de contratos continuados de apoio às UCs." :erro="erroNome" obrigatorio v-slot="{ attrs }">
          <input v-bind="attrs" v-model="novo.nomeObjeto" type="text" />
        </FormField>
        <FormField rotulo="Unidade responsável (1ª Linha)" ajuda="Só unidades ativas." v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.unidadeId">
            <option v-for="u in riscosStore.unidadesAtivas" :key="u.id" :value="u.id">{{ u.sigla }} — {{ u.nome }}</option>
          </select>
        </FormField>
        <FormField rotulo="Processo da Cadeia de Valor" ajuda="Opcional. Só processos ativos." v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.processoId">
            <option value="">Sem processo vinculado</option>
            <option v-for="p in processosAtivos" :key="p.id" :value="p.id">{{ p.procId }} — {{ p.nome }}</option>
          </select>
        </FormField>
        <!-- Supervisor: texto quando há processo ou quando não é CGOV; seletor só para a CGOV sem processo. -->
        <div v-if="supervisorSomenteLeitura" id="supervisor-leitura" class="formulario__supervisor">
          <p class="formulario__supervisor-rotulo">Supervisor do macroprocesso</p>
          <p class="formulario__supervisor-valor">{{ supervisorPrevio }}</p>
          <p class="texto-apoio">Preenchido pelo RADAR a partir do processo da Cadeia de Valor.</p>
        </div>
        <FormField v-else rotulo="Supervisor do macroprocesso (2º degrau)" v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.macroprocessoSupervisorId">
            <option v-for="u in porTipo('coordenacao-geral', 'gerencia-regional')" :key="u.id" :value="u.id">{{ u.sigla }} — {{ u.nome }}</option>
          </select>
        </FormField>
        <FormField rotulo="Diretoria (3º degrau)" v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.diretoriaId">
            <option v-for="u in porTipo('diretoria')" :key="u.id" :value="u.id">{{ u.sigla }} — {{ u.nome }}</option>
          </select>
        </FormField>
        <FormField rotulo="Objetivo estratégico" ajuda="Qual objetivo do ICMBio este objeto sustenta?" v-slot="{ attrs }">
          <input v-bind="attrs" v-model="novo.objetivoEstrategicoAssociado" type="text" />
        </FormField>
        <FormField rotulo="Principais entregas" v-slot="{ attrs }">
          <input v-bind="attrs" v-model="novo.entregasPrincipais" type="text" />
        </FormField>
        <FormField rotulo="Partes interessadas" v-slot="{ attrs }">
          <input v-bind="attrs" v-model="novo.partesInteressadas" type="text" />
        </FormField>
      </form>
      <template #acoes>
        <BrButton variant="secondary" @click="cadastroAberto = false">Cancelar</BrButton>
        <BrButton variant="primary" type="submit" form="form-objeto" :disabled="salvando" :aria-busy="salvando">Salvar objeto</BrButton>
      </template>
    </SideSheet>

    <!-- REATRIBUIR OBJETO -->
    <Dialog :aberto="objetoAReatribuir !== null" titulo="Reatribuir objeto" @fechar="objetoAReatribuir = null">
      <template v-if="objetoAReatribuir">
        <p class="texto-apoio">
          <strong>{{ objetoAReatribuir.nomeObjeto }}</strong> pertence a uma unidade desativada
          ({{ sigla(objetoAReatribuir.unidadeId) }}). Os riscos do objeto passam junto para a nova unidade.
        </p>
        <BrMessage v-if="erroDestino && unidadeDestino" state="danger">{{ erroDestino }}</BrMessage>
        <FormField rotulo="Nova unidade (ativa)" :erro="unidadeDestino ? undefined : erroDestino" obrigatorio v-slot="{ attrs }">
          <select v-bind="attrs" v-model="unidadeDestino">
            <option value="">Selecione a unidade</option>
            <option v-for="u in riscosStore.unidadesAtivas" :key="u.id" :value="u.id">{{ u.sigla }} — {{ u.nome }}</option>
          </select>
        </FormField>
      </template>
      <template #acoes>
        <BrButton variant="secondary" @click="objetoAReatribuir = null">Cancelar</BrButton>
        <BrButton variant="primary" :disabled="reatribuindo" :aria-busy="reatribuindo" @click="confirmarReatribuicao">Confirmar reatribuição</BrButton>
      </template>
    </Dialog>
    </template>
  </div>
</template>

<style scoped>
.objetos {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.objetos__busca {
  max-width: 28rem;
}

.objeto {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 14rem;
}

.objeto__nome {
  font-weight: var(--peso-semi);
}

.objeto__detalhe {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.texto-apoio {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.link-acao {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--esp-1);
  min-width: var(--alvo-minimo);
  min-height: var(--alvo-minimo);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

.formulario__supervisor {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  padding: var(--esp-3);
  background: var(--superficie-container);
  border: 1px solid var(--borda);
  border-radius: var(--raio-md);
}

.formulario__supervisor p {
  margin: 0;
}

.formulario__supervisor-valor {
  font-weight: var(--peso-semi);
}

.formulario__supervisor-rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}
</style>
