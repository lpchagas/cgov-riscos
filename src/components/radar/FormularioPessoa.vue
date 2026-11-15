<script setup lang="ts">
/**
 * ============================================================================
 * FORMULÁRIO DE PESSOA (`FormularioPessoa.vue`) — cadastrar e editar
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Este formulário é usado dentro do painel lateral da tela "Usuários e perfis"
 * (só CGOV), nos dois modos:
 *   - `criar`  : nome, e-mail, unidade, perfil, titular, cargo e "Enviar o link agora";
 *   - `editar` : perfil, unidade, titular, ativo e cargo (o e-mail só aparece, não muda).
 *
 * Ele NÃO fala com o servidor: só valida e avisa a tela pai (`salvar`). Regras:
 *   1. Escolher a unidade já sugere o perfil pelo tipo dela (`sugerirPapel`).
 *      Ex.: unidade do tipo "gerencia-regional" -> perfil "gerente_regional".
 *   2. Se o tipo da unidade parece errado (`tipoSuspeito`), mostra um aviso.
 *   3. Ligar "Titular" numa unidade que já tem titular ativo avisa e oferece
 *      "Tirar a chave do titular anterior" (a tela pai grava os dois).
 *   4. Na própria linha da pessoa logada, "ativo" e perfil ficam travados, para
 *      ninguém se bloquear sem querer.
 *   5. A unidade é um campo de busca: mínimo de 2 letras, até 20 resultados,
 *      por nome ou sigla (a lista de unidades é grande).
 */
import { computed, ref } from 'vue';
import type { PapelGovernanca } from '../../types/radar.types';
import type { PerfilListado, UnidadeOpcao } from '../../services/acessoUsuarios';
import { PAPEIS, ROTULOS_PAPEL } from '../../utils/acessoPorPerfil';
import { sugerirPapel, tipoSuspeito } from '../../utils/perfilPorUnidade';
import FormField from '../ui/FormField.vue';
import BrMessage from '../govbr/BrMessage.vue';
import BrButton from '../govbr/BrButton.vue';

export interface ValoresPessoa {
  nome: string;
  email: string;
  unidadeId: string;
  papel: PapelGovernanca;
  titular: boolean;
  cargo: string | null;
  ativo: boolean;
  enviarLink: boolean;
  /** Id do titular anterior cuja "chave" deve ser tirada (ou null). */
  tirarTitularAnteriorId: string | null;
}

const props = defineProps<{
  modo: 'criar' | 'editar';
  pessoa: PerfilListado | null;
  unidades: UnidadeOpcao[];
  perfis: PerfilListado[];
  /** Id de quem está logado (para a trava de autobloqueio). */
  euId: string | null;
  erroEmail?: string;
  erroGeral?: string;
}>();

const emit = defineEmits<{ (e: 'salvar', valores: ValoresPessoa): void }>();

const editando = props.modo === 'editar' && props.pessoa !== null;
const ehEu = computed(() => editando && props.pessoa!.id === props.euId);

// --- Estado do formulário ---------------------------------------------------
const nome = ref(props.pessoa?.nome ?? '');
const email = ref(props.pessoa?.email ?? '');
const cargo = ref(props.pessoa?.cargo ?? '');
const papel = ref<PapelGovernanca>(props.pessoa?.papel ?? 'gestor');
const titular = ref(props.pessoa?.titularChefia ?? false);
const ativo = ref(props.pessoa?.ativo ?? true);
const enviarLink = ref(true);
const unidadeId = ref(props.pessoa?.unidadeId ?? '');
const buscaUnidade = ref(props.pessoa ? props.pessoa.unidadeSigla || props.pessoa.unidadeNome : '');
const tirarChave = ref(false);
const tentouSalvar = ref(false);

// --- Unidade (busca) --------------------------------------------------------
/** Tira acentos e maiúsculas para a busca ("goiania" acha "Goiânia"). */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const unidadeEscolhida = computed(() => props.unidades.find((u) => u.id === unidadeId.value) ?? null);

/** Só procura com 2 letras ou mais e devolve no máximo 20 resultados. */
const resultadosBusca = computed(() => {
  const termo = normalizar(buscaUnidade.value.trim());
  if (termo.length < 2) return [];
  if (unidadeEscolhida.value && normalizar(rotuloUnidade(unidadeEscolhida.value)) === termo) return [];
  return props.unidades
    .filter((u) => normalizar(u.nome).includes(termo) || normalizar(u.sigla ?? '').includes(termo))
    .slice(0, 20);
});

function rotuloUnidade(u: UnidadeOpcao): string {
  return u.sigla ? `${u.sigla} — ${u.nome}` : u.nome;
}

function escolherUnidade(u: UnidadeOpcao): void {
  unidadeId.value = u.id;
  buscaUnidade.value = rotuloUnidade(u);
  // Ao CADASTRAR, o perfil já vem sugerido pelo tipo da unidade (pode ser trocado).
  if (props.modo === 'criar') papel.value = sugerirPapel(u);
}

function aoDigitarUnidade(): void {
  // Digitou de novo: a escolha anterior deixa de valer até clicar numa opção.
  unidadeId.value = '';
}

const avisoTipo = computed(() => (unidadeEscolhida.value ? tipoSuspeito(unidadeEscolhida.value) : null));

// --- Titular ----------------------------------------------------------------
/** Perfil sugerido para titular da unidade (só sugere; nunca troca sozinho). */
const sugestaoPapel = computed<PapelGovernanca | null>(() => {
  if (!titular.value || !unidadeEscolhida.value) return null;
  const s = sugerirPapel(unidadeEscolhida.value);
  return s !== papel.value ? s : null;
});

/** Outro titular ATIVO na mesma unidade (usa a lista já carregada na tela). */
const titularExistente = computed(() => {
  if (!titular.value || !unidadeId.value) return null;
  return (
    props.perfis.find(
      (p) => p.ativo && p.titularChefia && p.unidadeId === unidadeId.value && p.id !== props.pessoa?.id,
    ) ?? null
  );
});

// --- Validação e envio ------------------------------------------------------
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const erros = computed(() => ({
  nome: nome.value.trim() ? '' : 'Informe o nome da pessoa.',
  email: EMAIL_VALIDO.test(email.value.trim()) ? '' : 'Informe um e-mail válido.',
  unidade: unidadeId.value ? '' : 'Escolha a unidade na lista de resultados.',
}));

const erroEmailMostrado = computed(() => {
  if (props.erroEmail) return props.erroEmail;
  return tentouSalvar.value && props.modo === 'criar' ? erros.value.email : '';
});

function aoEnviar(): void {
  tentouSalvar.value = true;
  if (props.modo === 'criar' && (erros.value.nome || erros.value.email)) return;
  if (erros.value.unidade) return;
  emit('salvar', {
    nome: nome.value.trim(),
    email: email.value.trim(),
    unidadeId: unidadeId.value,
    papel: papel.value,
    titular: titular.value,
    cargo: cargo.value.trim() || null,
    ativo: ativo.value,
    enviarLink: enviarLink.value,
    tirarTitularAnteriorId: titularExistente.value && tirarChave.value ? titularExistente.value.id : null,
  });
}
</script>

<template>
  <form id="form-pessoa" class="form-pessoa" novalidate @submit.prevent="aoEnviar">
    <BrMessage v-if="erroGeral" state="danger" titulo="Não foi possível salvar">{{ erroGeral }}</BrMessage>

    <FormField v-if="modo === 'criar'" rotulo="Nome completo" obrigatorio :erro="tentouSalvar ? erros.nome : ''" v-slot="{ attrs }">
      <input v-bind="attrs" v-model="nome" type="text" autocomplete="off" />
    </FormField>
    <p v-else class="form-pessoa__leitura">
      <strong>{{ pessoa?.nome }}</strong><br />
      {{ pessoa?.email }} <span class="form-pessoa__nota">(o e-mail não pode ser alterado)</span>
    </p>

    <FormField v-if="modo === 'criar'" rotulo="E-mail" obrigatorio :erro="erroEmailMostrado" v-slot="{ attrs }">
      <input v-bind="attrs" v-model="email" type="email" autocomplete="off" />
    </FormField>

    <FormField
      rotulo="Unidade"
      obrigatorio
      ajuda="Digite 2 letras ou mais do nome ou da sigla e escolha na lista."
      :erro="tentouSalvar ? erros.unidade : ''"
      v-slot="{ attrs }"
    >
      <input v-bind="attrs" v-model="buscaUnidade" type="search" autocomplete="off" @input="aoDigitarUnidade" />
    </FormField>
    <ul v-if="resultadosBusca.length" class="form-pessoa__resultados" aria-label="Unidades encontradas">
      <li v-for="u in resultadosBusca" :key="u.id">
        <button type="button" @click="escolherUnidade(u)">{{ rotuloUnidade(u) }}</button>
      </li>
    </ul>
    <BrMessage v-if="avisoTipo" state="warning" titulo="Confira o tipo da unidade">{{ avisoTipo }}</BrMessage>

    <FormField rotulo="Perfil" obrigatorio v-slot="{ attrs }">
      <select v-bind="attrs" v-model="papel" :disabled="ehEu">
        <option v-for="p in PAPEIS" :key="p" :value="p">{{ ROTULOS_PAPEL[p].rotulo }}</option>
      </select>
    </FormField>

    <label class="form-pessoa__caixa">
      <input v-model="titular" type="checkbox" />
      Titular (chefia) da unidade
    </label>

    <BrMessage v-if="titularExistente" state="warning" titulo="Titular duplicado">
      Esta unidade já tem titular: {{ titularExistente.nome }}.
      <label class="form-pessoa__caixa">
        <input v-model="tirarChave" type="checkbox" />
        Tirar a chave do titular anterior
      </label>
    </BrMessage>

    <p v-if="sugestaoPapel" class="form-pessoa__sugestao">
      Para titular dessa unidade, o perfil sugerido é <strong>{{ ROTULOS_PAPEL[sugestaoPapel].rotulo }}</strong>.
      <BrButton v-if="!ehEu" variant="secondary" @click="papel = sugestaoPapel">Usar este perfil</BrButton>
    </p>

    <FormField rotulo="Cargo (opcional)" v-slot="{ attrs }">
      <input v-bind="attrs" v-model="cargo" type="text" autocomplete="off" />
    </FormField>

    <label v-if="modo === 'editar'" class="form-pessoa__caixa">
      <input v-model="ativo" type="checkbox" :disabled="ehEu" />
      Perfil ativo (desmarque para suspender)
    </label>
    <p v-if="ehEu" class="form-pessoa__sugestao">Você não pode suspender nem mudar o próprio perfil.</p>

    <label v-if="modo === 'criar'" class="form-pessoa__caixa">
      <input v-model="enviarLink" type="checkbox" />
      Enviar o link agora
    </label>
  </form>
</template>

<style scoped>
.form-pessoa {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.form-pessoa__leitura {
  margin: 0;
  font-size: var(--texto-sm);
}

.form-pessoa__nota {
  color: var(--texto-secundario);
}

.form-pessoa__caixa {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  font-size: var(--texto-sm);
  cursor: pointer;
}

.form-pessoa__sugestao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.form-pessoa__resultados {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  background: var(--superficie);
  max-height: 14rem;
  overflow-y: auto;
}

.form-pessoa__resultados button {
  display: block;
  width: 100%;
  min-height: var(--alvo-minimo);
  padding: var(--esp-2) var(--esp-3);
  border: 0;
  background: transparent;
  color: var(--texto-link);
  font: inherit;
  font-size: var(--texto-sm);
  text-align: left;
  cursor: pointer;
}

.form-pessoa__resultados button:hover {
  text-decoration: underline;
}
</style>
