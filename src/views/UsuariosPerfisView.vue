<script setup lang="ts">
/**
 * ============================================================================
 * USUÁRIOS E PERFIS (`UsuariosPerfisView.vue`) — rota `/usuarios`, só CGOV
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Aqui a CGOV vê quem acessa o RADAR, com qual perfil e em qual unidade, e pode:
 *   - CADASTRAR uma pessoa (e já enviar o link de acesso);
 *   - EDITAR perfil, unidade, titular, ativo e cargo;
 *   - ENVIAR o link de acesso (uma pessoa ou todas as "Convite pendente" filtradas).
 * Os filtros ficam na URL, como em `/riscos` (ex.: `?perfil=gestor&situacao=pendente`).
 *
 * Duas fontes de dados, de propósito separadas:
 *   1. `listarPerfis` / `listarUnidadesAtivas`: leitura direta (a segurança por linha
 *      do banco só deixa a CGOV ver todos);
 *   2. `listarSituacao`: pergunta à função do servidor se a pessoa já recebeu o link
 *      e se já entrou. Se essa parte falhar, a lista aparece mesmo assim, com "—".
 *
 * MODO DEMONSTRAÇÃO (sem Supabase): mostramos os 10 perfis simulados só para leitura;
 * nenhuma chamada ao serviço é feita e as ações avisam que estão indisponíveis.
 *
 * ATENÇÃO: esconder botão é conforto. Quem barra de verdade é o banco (RLS).
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import {
  atualizarPerfil,
  criarPessoa,
  enviarLinks,
  listarPerfis,
  listarSituacao,
  listarUnidadesAtivas,
  type PerfilListado,
  type UnidadeOpcao,
} from '../services/acessoUsuarios';
import { PAPEIS, ROTULOS_PAPEL } from '../utils/acessoPorPerfil';
import { rotuloSituacao, situacaoConta, type DadosAuthConta, type SituacaoConta } from '../utils/situacaoConta';
import PageHeader from '../components/ui/PageHeader.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import Chip from '../components/ui/Chip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SideSheet from '../components/ui/SideSheet.vue';
import Dialog from '../components/ui/Dialog.vue';
import FormField from '../components/ui/FormField.vue';
import Skeleton from '../components/ui/Skeleton.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import FormularioPessoa, { type ValoresPessoa } from '../components/radar/FormularioPessoa.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { mostrar } = useToast();

const ehDemo = auth.modo === 'demonstracao';
const MSG_DEMO = 'Indisponível no modo demonstração.';

// ---------------------------------------------------------------------------
// DADOS
// ---------------------------------------------------------------------------
const carregando = ref(true);
const erroCarga = ref('');
const perfis = ref<PerfilListado[]>([]);
const unidades = ref<UnidadeOpcao[]>([]);
/** `null` = ainda carregando ou não foi possível ler (a coluna mostra "—"). */
const situacoes = ref<Record<string, DadosAuthConta> | null>(null);
const avisoSituacao = ref(false);

/** No modo demonstração os 10 perfis simulados viram linhas só de leitura. */
function perfisDemonstracao(): PerfilListado[] {
  return Object.values(auth.perfisDisponiveisDemo).map((d) => ({
    id: d.id,
    nome: d.nome,
    email: '—',
    cargo: d.cargo,
    papel: d.papel,
    unidadeId: d.unidadeSigla,
    unidadeSigla: d.unidadeSigla,
    unidadeNome: d.unidadeSigla,
    titularChefia: false,
    ativo: true,
  }));
}

async function carregarSituacoes(): Promise<void> {
  avisoSituacao.value = false;
  try {
    situacoes.value = await listarSituacao(perfis.value.map((p) => p.id));
  } catch {
    situacoes.value = null;
    avisoSituacao.value = true;
  }
}

async function carregar(): Promise<void> {
  carregando.value = true;
  erroCarga.value = '';
  if (ehDemo) {
    perfis.value = perfisDemonstracao();
    carregando.value = false;
    return;
  }
  try {
    [perfis.value, unidades.value] = await Promise.all([listarPerfis(), listarUnidadesAtivas()]);
  } catch (e) {
    erroCarga.value = e instanceof Error ? e.message : 'RADAR: não foi possível carregar as pessoas.';
    carregando.value = false;
    return;
  }
  carregando.value = false;
  await carregarSituacoes();
}

onMounted(carregar);

// ---------------------------------------------------------------------------
// LINHAS DA TABELA (com os textos já prontos para exibir e ordenar)
// ---------------------------------------------------------------------------
interface LinhaPessoa extends PerfilListado {
  papelRotulo: string;
  titularRotulo: string;
  /** `null` quando a situação ainda não pôde ser lida. */
  situacao: SituacaoConta | null;
  situacaoRotulo: string;
}

function situacaoDe(p: PerfilListado): SituacaoConta | null {
  if (!p.ativo) return 'suspenso';
  if (ehDemo || situacoes.value === null) return null;
  return situacaoConta(p, situacoes.value[p.id]);
}

const linhas = computed<LinhaPessoa[]>(() =>
  perfis.value.map((p) => {
    const s = situacaoDe(p);
    return {
      ...p,
      papelRotulo: ROTULOS_PAPEL[p.papel].rotulo,
      titularRotulo: p.titularChefia ? 'sim' : 'não',
      situacao: s,
      situacaoRotulo: s ? rotuloSituacao(s, situacoes.value?.[p.id]) : '—',
    };
  }),
);

// ---------------------------------------------------------------------------
// FILTROS ↔ URL
// ---------------------------------------------------------------------------
const filtros = computed(() => ({
  q: String(route.query.q ?? ''),
  unidade: String(route.query.unidade ?? ''),
  perfil: String(route.query.perfil ?? ''),
  situacao: String(route.query.situacao ?? ''),
}));

function atualizarFiltro(chave: string, valor: string): void {
  const nova: LocationQueryRaw = { ...route.query };
  if (valor) nova[chave] = valor;
  else delete nova[chave];
  router.replace({ query: nova });
}

function limparFiltros(): void {
  router.replace({ query: {} });
}

/** Tira acentos e maiúsculas para a busca. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const linhasFiltradas = computed(() => {
  const f = filtros.value;
  const termo = normalizar(f.q.trim());
  return linhas.value.filter(
    (l) =>
      (!termo || normalizar(l.nome).includes(termo) || normalizar(l.email).includes(termo)) &&
      (!f.unidade || l.unidadeId === f.unidade) &&
      (!f.perfil || l.papel === f.perfil) &&
      (!f.situacao || l.situacao === f.situacao),
  );
});

/** Unidades que aparecem entre as pessoas (para o filtro não listar milhares de opções). */
const opcoesUnidade = computed(() => {
  const mapa = new Map<string, string>();
  for (const p of perfis.value) mapa.set(p.unidadeId, p.unidadeSigla || p.unidadeNome);
  return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
});

const temFiltro = computed(() => Object.values(filtros.value).some(Boolean));

const OPCOES_SITUACAO: { valor: SituacaoConta; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Convite pendente' },
  { valor: 'enviado', rotulo: 'Convite enviado' },
  { valor: 'entrou', rotulo: 'Entrou' },
  { valor: 'suspenso', rotulo: 'Suspenso' },
];

const colunas: ColunaTabela<LinhaPessoa>[] = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  { chave: 'email', rotulo: 'E-mail', ordenavel: true, ocultarNoCelular: true },
  { chave: 'unidadeSigla', rotulo: 'Unidade', ordenavel: true },
  { chave: 'papelRotulo', rotulo: 'Perfil', ordenavel: true },
  { chave: 'titularRotulo', rotulo: 'Titular', ordenavel: true },
  { chave: 'situacaoRotulo', rotulo: 'Situação', ordenavel: true },
  { chave: 'acoes', rotulo: 'Ações' },
];

const TOM_SITUACAO = { pendente: 'aviso', enviado: 'info', entrou: 'sucesso', suspenso: 'perigo' } as const;
const ICONE_SITUACAO = {
  pendente: 'fa-solid fa-hourglass-half',
  enviado: 'fa-solid fa-paper-plane',
  entrou: 'fa-solid fa-circle-check',
  suspenso: 'fa-solid fa-ban',
} as const;

// ---------------------------------------------------------------------------
// CONVITES (envio de link)
// ---------------------------------------------------------------------------
const pendentesFiltrados = computed(() => linhasFiltradas.value.filter((l) => l.situacao === 'pendente'));
const confirmandoLote = ref(false);
const enviando = ref(false);
const falhasEnvio = ref<{ nome: string; motivo: string }[]>([]);

function avisarDemo(): void {
  mostrar({ tom: 'aviso', mensagem: MSG_DEMO });
}

function abrirConfirmacaoLote(): void {
  if (ehDemo) return avisarDemo();
  confirmandoLote.value = true;
}

/** Envia os links e mostra enviados e falhas SEM perder o resto do lote. */
async function executarEnvio(ids: string[]): Promise<void> {
  enviando.value = true;
  falhasEnvio.value = [];
  try {
    const r = await enviarLinks(ids);
    falhasEnvio.value = r.falhas.map((f) => ({
      nome: perfis.value.find((p) => p.id === f.id)?.nome ?? f.id,
      motivo: f.motivo,
    }));
    const n = r.enviados.length;
    const enviadosTexto = `${n} ${n === 1 ? 'convite enviado' : 'convites enviados'}`;
    if (r.falhas.length) {
      const f = r.falhas.length;
      mostrar({ tom: 'aviso', mensagem: `${enviadosTexto}; ${f} ${f === 1 ? 'falhou' : 'falharam'}` });
    } else {
      mostrar({ tom: 'sucesso', mensagem: enviadosTexto });
    }
    await carregarSituacoes();
  } catch (e) {
    mostrar({ tom: 'perigo', mensagem: e instanceof Error ? e.message : 'RADAR: não foi possível enviar os links.' });
  } finally {
    enviando.value = false;
  }
}

async function confirmarLote(): Promise<void> {
  confirmandoLote.value = false;
  await executarEnvio(pendentesFiltrados.value.map((l) => l.id));
}

function enviarLinkIndividual(l: LinhaPessoa): void {
  if (ehDemo) return avisarDemo();
  void executarEnvio([l.id]);
}

// ---------------------------------------------------------------------------
// PAINEL LATERAL: CADASTRAR / EDITAR
// ---------------------------------------------------------------------------
const painel = ref<null | { modo: 'criar' | 'editar'; pessoa: PerfilListado | null }>(null);
const salvando = ref(false);
const erroEmail = ref('');
const erroGeral = ref('');

function abrirCadastro(): void {
  if (ehDemo) return avisarDemo();
  erroEmail.value = '';
  erroGeral.value = '';
  painel.value = { modo: 'criar', pessoa: null };
}

function abrirEdicao(l: LinhaPessoa): void {
  if (ehDemo) return avisarDemo();
  erroEmail.value = '';
  erroGeral.value = '';
  painel.value = { modo: 'editar', pessoa: l };
}

function fecharPainel(): void {
  painel.value = null;
}

async function salvar(v: ValoresPessoa): Promise<void> {
  const atual = painel.value;
  if (!atual) return;
  salvando.value = true;
  erroEmail.value = '';
  erroGeral.value = '';
  try {
    // ORDEM DAS GRAVAÇÕES: primeiro a gravação PRINCIPAL (cadastrar ou editar esta pessoa);
    // só depois, se foi pedido, "tirar a chave do titular anterior". Assim, se a principal
    // falhar (ex.: e-mail já existe, 409), ninguém perde a chave e a unidade não fica sem titular.
    // (O banco aceita dois titulares por um instante; ver decisoes-tecnicas-b2.md.)
    if (atual.modo === 'criar') {
      await criarPessoa({
        nome: v.nome,
        email: v.email,
        unidadeId: v.unidadeId,
        papel: v.papel,
        titular: v.titular,
        cargo: v.cargo,
        enviarLink: v.enviarLink,
      });
      mostrar({ tom: 'sucesso', mensagem: 'Cadastro salvo.' });
    } else {
      const p = atual.pessoa!;
      // Só grava o que mudou (a trilha de auditoria registra quem mudou o quê).
      const mudancas: Parameters<typeof atualizarPerfil>[1] = {};
      if (v.papel !== p.papel) mudancas.papel = v.papel;
      if (v.unidadeId !== p.unidadeId) mudancas.unidadeId = v.unidadeId;
      if (v.titular !== p.titularChefia) mudancas.titularChefia = v.titular;
      if (v.ativo !== p.ativo) mudancas.ativo = v.ativo;
      if (v.cargo !== (p.cargo ?? null)) mudancas.cargo = v.cargo;
      if (Object.keys(mudancas).length) await atualizarPerfil(p.id, mudancas);
      mostrar({ tom: 'sucesso', mensagem: 'Perfil atualizado.' });
    }
    // 2ª gravação (só se pedida): desliga a chave de quem era titular antes.
    if (v.tirarTitularAnteriorId) await atualizarPerfil(v.tirarTitularAnteriorId, { titularChefia: false });
    painel.value = null;
    await carregar();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'RADAR: não foi possível salvar agora.';
    // 409 do servidor: já existe conta com este e-mail -> mensagem no campo e-mail.
    if (msg.includes('já existe uma conta com este e-mail')) erroEmail.value = msg;
    else erroGeral.value = msg;
    // Se a 1ª gravação já tinha passado e a 2ª falhou, a lista precisa refletir o banco.
    await carregar();
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :titulo="route.meta.titulo ?? 'Usuários e perfis'"
      :descricao="route.meta.descricao"
      :fundamento="route.meta.fundamento"
    >
      <template #acoes>
        <BrButton icon="fa-solid fa-plus" @click="abrirCadastro">Cadastrar pessoa</BrButton>
      </template>
    </PageHeader>

    <BrMessage v-if="ehDemo" state="info" titulo="Modo demonstração">
      Estes são os 10 perfis simulados, só para leitura. Cadastro, edição e convites exigem o banco de dados.
    </BrMessage>
    <BrMessage v-if="avisoSituacao" state="warning" titulo="Situação indisponível">
      Não foi possível ler a situação das contas agora. As pessoas aparecem normalmente, mas a coluna Situação fica com
      "—" e o envio de convites em lote fica indisponível.
    </BrMessage>
    <BrMessage v-if="erroCarga" state="danger" titulo="Não foi possível carregar">{{ erroCarga }}</BrMessage>
    <BrMessage v-if="falhasEnvio.length" state="warning" titulo="Alguns convites não foram enviados">
      <ul class="falhas">
        <li v-for="f in falhasEnvio" :key="f.nome">
          <strong>{{ f.nome }}</strong>: {{ f.motivo }}
        </li>
      </ul>
    </BrMessage>

    <Skeleton v-if="carregando" :linhas="6" altura="1.5rem" />

    <template v-else-if="!erroCarga">
      <!-- FILTROS -->
      <section class="filtros" aria-label="Filtros da lista de pessoas">
        <FormField rotulo="Buscar nome ou e-mail" v-slot="{ attrs }">
          <input
            v-bind="attrs"
            type="search"
            data-teste="filtro-busca"
            :value="filtros.q"
            @input="atualizarFiltro('q', ($event.target as HTMLInputElement).value)"
          />
        </FormField>
        <FormField rotulo="Unidade" v-slot="{ attrs }">
          <select
            v-bind="attrs"
            data-teste="filtro-unidade"
            :value="filtros.unidade"
            @change="atualizarFiltro('unidade', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todas</option>
            <option v-for="[id, sigla] in opcoesUnidade" :key="id" :value="id">{{ sigla }}</option>
          </select>
        </FormField>
        <FormField rotulo="Perfil" v-slot="{ attrs }">
          <select
            v-bind="attrs"
            data-teste="filtro-perfil"
            :value="filtros.perfil"
            @change="atualizarFiltro('perfil', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todos</option>
            <option v-for="p in PAPEIS" :key="p" :value="p">{{ ROTULOS_PAPEL[p].rotulo }}</option>
          </select>
        </FormField>
        <FormField rotulo="Situação" v-slot="{ attrs }">
          <select
            v-bind="attrs"
            data-teste="filtro-situacao"
            :value="filtros.situacao"
            @change="atualizarFiltro('situacao', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todas</option>
            <option v-for="o in OPCOES_SITUACAO" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
          </select>
        </FormField>
        <BrButton
          variant="secondary"
          :disabled="!ehDemo && pendentesFiltrados.length === 0"
          @click="abrirConfirmacaoLote"
        >
          Enviar convites ({{ pendentesFiltrados.length }})
        </BrButton>
      </section>

      <p class="contagem" aria-live="polite">
        <strong>{{ linhasFiltradas.length }}</strong>
        {{ linhasFiltradas.length === 1 ? 'pessoa' : 'pessoas' }}
        <button v-if="temFiltro" type="button" class="link-botao" @click="limparFiltros">Limpar filtros</button>
      </p>

      <!-- TABELA -->
      <DataTable
        :colunas="colunas"
        :linhas="linhasFiltradas"
        chave-linha="id"
        legenda="Pessoas com acesso ao RADAR"
        :tamanho-pagina="25"
        :ordenacao-inicial="{ chave: 'nome', direcao: 'asc' }"
      >
        <template #celula-situacaoRotulo="{ linha }">
          <Chip v-if="linha.situacao" :tom="TOM_SITUACAO[linha.situacao]" :icone="ICONE_SITUACAO[linha.situacao]">
            {{ linha.situacaoRotulo }}
          </Chip>
          <span v-else>—</span>
        </template>

        <template #celula-acoes="{ linha }">
          <div class="acoes-linha">
            <BrButton variant="secondary" @click="abrirEdicao(linha)">Editar</BrButton>
            <BrButton
              v-if="linha.situacao === 'pendente' || linha.situacao === 'enviado' || ehDemo"
              variant="secondary"
              @click="enviarLinkIndividual(linha)"
            >
              Enviar link
            </BrButton>
          </div>
        </template>

        <template #vazio>
          <EmptyState
            titulo="Nenhuma pessoa encontrada"
            :descricao="temFiltro ? 'Nenhuma pessoa atende a todos os filtros. Tente remover algum.' : 'Ainda não há pessoas cadastradas.'"
            icone="fa-solid fa-users"
          >
            <template v-if="temFiltro" #acoes>
              <BrButton variant="secondary" @click="limparFiltros">Limpar filtros</BrButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </template>

    <!-- CADASTRAR / EDITAR -->
    <SideSheet
      :aberto="painel !== null"
      :titulo="painel?.modo === 'editar' ? 'Editar pessoa' : 'Cadastrar pessoa'"
      :subtitulo="painel?.pessoa?.nome"
      largura="32rem"
      @fechar="fecharPainel"
    >
      <FormularioPessoa
        v-if="painel"
        :key="painel.pessoa?.id ?? 'novo'"
        :modo="painel.modo"
        :pessoa="painel.pessoa"
        :unidades="unidades"
        :perfis="perfis"
        :eu-id="auth.perfil?.id ?? null"
        :erro-email="erroEmail"
        :erro-geral="erroGeral"
        @salvar="salvar"
      />
      <template #acoes>
        <BrButton variant="secondary" @click="fecharPainel">Cancelar</BrButton>
        <button type="submit" form="form-pessoa" class="br-button primary" :disabled="salvando">
          {{ salvando ? 'Salvando…' : 'Salvar' }}
        </button>
      </template>
    </SideSheet>

    <!-- CONFIRMAÇÃO DO ENVIO EM LOTE -->
    <Dialog :aberto="confirmandoLote" titulo="Enviar convites" @fechar="confirmandoLote = false">
      <p>
        Enviar o link de acesso para {{ pendentesFiltrados.length }}
        {{ pendentesFiltrados.length === 1 ? 'pessoa' : 'pessoas' }}?
      </p>
      <template #acoes>
        <BrButton variant="secondary" @click="confirmandoLote = false">Cancelar</BrButton>
        <BrButton :disabled="enviando" @click="confirmarLote">Enviar links</BrButton>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
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

.contagem {
  margin: 0 0 var(--esp-3);
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.link-botao {
  padding: var(--esp-1);
  margin-left: var(--esp-2);
  border: 0;
  background: transparent;
  color: var(--texto-link);
  font: inherit;
  font-size: var(--texto-sm);
  text-decoration: underline;
  cursor: pointer;
}

.acoes-linha {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.falhas {
  margin: 0;
  padding-left: var(--esp-4);
}
</style>
