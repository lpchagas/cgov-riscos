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

const colunas: ColunaTabela<ObjetoContexto>[] = [
  { chave: 'nomeObjeto', rotulo: 'Objeto de gestão', ordenavel: true },
  { chave: 'unidadeId', rotulo: 'Unidade (1ª Linha)', ordenavel: true, valorOrdenacao: (o) => sigla(o.unidadeId) },
  { chave: 'macroprocessoSupervisorId', rotulo: 'Supervisão', ocultarNoCelular: true },
  { chave: 'id', rotulo: 'Riscos', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (o) => quantidadeRiscos(o.id) },
];

// ---------------------------------------------------------------------------
// CADASTRO (painel lateral)
// ---------------------------------------------------------------------------
const TIPOS: ObjetoContexto['tipoObjeto'][] = ['Macroprocesso', 'Processo', 'Projeto', 'Plano', 'Ação', 'Unidade'];
const porTipo = (...tipos: UnidadeOrganizacional['tipo'][]) => riscosStore.unidades.filter((u) => tipos.includes(u.tipo));

const cadastroAberto = ref(false);
const erroNome = ref<string | undefined>();
const novo = ref(formularioVazio());

function formularioVazio() {
  return {
    tipoObjeto: 'Processo' as ObjetoContexto['tipoObjeto'],
    nomeObjeto: '',
    unidadeId: riscosStore.unidades[0]?.id ?? '',
    macroprocessoSupervisorId: porTipo('coordenacao-geral', 'gerencia-regional')[0]?.id ?? '',
    diretoriaId: porTipo('diretoria')[0]?.id ?? '',
    objetivoEstrategicoAssociado: '',
    entregasPrincipais: '',
    partesInteressadas: '',
  };
}

function abrirCadastro(): void {
  novo.value = formularioVazio();
  erroNome.value = undefined;
  cadastroAberto.value = true;
}

function salvar(): void {
  if (novo.value.nomeObjeto.trim().length < 3) {
    erroNome.value = 'Informe o nome do objeto (pelo menos 3 caracteres).';
    return;
  }
  const obj = riscosStore.salvarNovoObjetoContexto({
    ...novo.value,
    nomeObjeto: novo.value.nomeObjeto.trim(),
    objetivoEstrategicoAssociado: novo.value.objetivoEstrategicoAssociado.trim() || undefined,
    entregasPrincipais: novo.value.entregasPrincipais.trim() || undefined,
    partesInteressadas: novo.value.partesInteressadas.trim() || undefined,
    cicloAno: 2026,
  });
  cadastroAberto.value = false;
  mostrar({ tom: 'sucesso', mensagem: `Objeto "${obj.nomeObjeto}" cadastrado.` });
}
</script>

<template>
  <div class="objetos">
    <PageHeader :titulo="route.meta.titulo ?? 'Objetos de gestão'" :descricao="route.meta.descricao" :fundamento="route.meta.fundamento">
      <template #acoes>
        <BrButton v-if="authStore.capacidades.editaCatalogoObjetos" variant="primary" icon="fa-solid fa-plus" @click="abrirCadastro">Novo objeto</BrButton>
      </template>
    </PageHeader>

    <FormField rotulo="Buscar objeto" class="objetos__busca" v-slot="{ attrs }">
      <input v-bind="attrs" v-model="busca" type="search" placeholder="Nome, tipo, unidade ou objetivo" />
    </FormField>

    <DataTable :colunas="colunas" :linhas="objetos" chave-linha="id" legenda="Objetos de gestão de riscos">
      <template #celula-nomeObjeto="{ linha }">
        <span class="objeto">
          <span class="objeto__nome">{{ linha.nomeObjeto }}</span>
          <span class="objeto__detalhe"><Chip tom="neutro">{{ linha.tipoObjeto }}</Chip> {{ linha.objetivoEstrategicoAssociado }}</span>
        </span>
      </template>
      <template #celula-unidadeId="{ linha }">{{ sigla(linha.unidadeId) }}</template>
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
        <FormField rotulo="Unidade responsável (1ª Linha)" v-slot="{ attrs }">
          <select v-bind="attrs" v-model="novo.unidadeId">
            <option v-for="u in riscosStore.unidades" :key="u.id" :value="u.id">{{ u.sigla }} — {{ u.nome }}</option>
          </select>
        </FormField>
        <FormField rotulo="Coordenação-Geral supervisora (2º degrau)" v-slot="{ attrs }">
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
        <BrButton variant="primary" type="submit" form="form-objeto">Salvar objeto</BrButton>
      </template>
    </SideSheet>
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

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}
</style>
