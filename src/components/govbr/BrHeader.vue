<script setup lang="ts">
/**
 * ============================================================================
 * CABEÇALHO GOV.BR EM DUAS FAIXAS (`header.br-header#header`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O desenho segue o Painel BI da CGOV (aprovado no protótipo da Fase 2):
 *
 *   ┌ Faixa gov.br (44 px, azul-escuro) ────────────────────────────────────┐
 *   │ gov.br | Ministério do Meio Ambiente...     ÓRGÃOS | PARTICIPE | ...  │
 *   ├ Cabeçalho do sistema (64 px, branco) ─────────────────────────────────┤
 *   │ [☰] ICMBio | RADAR        [ 🔍 Buscar riscos (centro) ]   [◐] [👤 ▾] │
 *   └───────────────────────────────────────────────────────────────────────┘
 *
 * - A faixa gov.br SOME ao rolar a página; só o cabeçalho do sistema fica
 *   preso no topo. O truque: o <header> inteiro é `position: sticky` com
 *   `top` NEGATIVO (−44 px). Assim ele "gruda" já com a faixa fora da tela.
 * - ☰ abre/fecha o menu lateral (celular) ou recolhe/expande (computador).
 * - A BUSCA leva para a lista de Riscos já filtrada (`/riscos?q=termo`).
 *   Abaixo de 1024 px ela vira um botão de lupa que abre a lista.
 * - Nas telas de acesso (`meta.semMenu`: entrar, retorno, acesso não liberado) o
 *   cabeçalho fica enxuto: sem ☰ e sem busca (não há menu nem login ainda), e a conta
 *   se reduz a um botão "Sair" quando existe uma conta sem acesso liberado.
 * - A caixa da CONTA tem largura FIXA (240 px) para qualquer perfil; nomes
 *   longos terminam em "…" e o nome completo fica na dica e no leitor de tela.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { usePreferenciasInterface, TEMAS_DISPONIVEIS, ROTULOS_TEMA } from '../../composables/usePreferenciasInterface';
import { isSupabaseConfigurado } from '../../services/supabase';
import type { PapelGovernanca } from '../../types/radar.types';
import { PAPEIS, ROTULOS_PAPEL } from '../../utils/acessoPorPerfil';
import { saidaExplicita } from '../../composables/useSaidaExplicita';

defineProps<{
  menuAberto: boolean;
  /** Tela de acesso (sem menu lateral): esconde o ☰ e a busca. */
  semMenu?: boolean;
}>();
const emit = defineEmits<{ (e: 'alternar-menu'): void }>();

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { tema, alternarAltoContraste, escolherTema } = usePreferenciasInterface();

// ---------------------------------------------------------------------------
// LINKS DA FAIXA GOV.BR (padrão de todos os sites do Governo Federal)
// ---------------------------------------------------------------------------
const LINKS_GOVBR = [
  { rotulo: 'Órgãos do Governo', href: 'https://www.gov.br/pt-br/orgaos-do-governo' },
  { rotulo: 'Participe', href: 'https://www.gov.br/participamaisbrasil' },
  { rotulo: 'Acesso à Informação', href: 'https://www.gov.br/icmbio/pt-br/acesso-a-informacao' },
  { rotulo: 'Legislação', href: 'http://www4.planalto.gov.br/legislacao' },
];

// ---------------------------------------------------------------------------
// BUSCA GLOBAL → lista de Riscos filtrada
// ---------------------------------------------------------------------------
const termoBusca = ref<string>('');

// Mantém a caixa sincronizada quando o usuário chega por um link com ?q=.
watch(
  () => route.query.q,
  (q) => {
    termoBusca.value = typeof q === 'string' ? q : '';
  },
  { immediate: true }
);

function buscar(): void {
  const q = termoBusca.value.trim();
  router.push({ name: 'riscos-lista', query: q ? { q } : {} });
}

// ---------------------------------------------------------------------------
// MENU DO USUÁRIO (simulador de perfil)
// ---------------------------------------------------------------------------
const menuUsuarioAberto = ref(false);
const areaMenuUsuario = ref<HTMLElement | null>(null);

/** Os 10 perfis do simulador, montados da tabela única de acesso. */
const OPCOES_PERFIL = PAPEIS.map((papel) => ({ papel, ...ROTULOS_PAPEL[papel], detalhe: ROTULOS_PAPEL[papel].linha }));

/** Modo demonstração: sem login; o perfil é simulado. */
const ehDemonstracao = computed(() => authStore.modo === 'demonstracao');

/** Caixa da conta completa: na demonstração ou com perfil ativo (modo real). */
const mostrarConta = computed(() => ehDemonstracao.value || authStore.situacao === 'ativo');

/**
 * Conta que existe, mas sem acesso liberado (sem perfil ou suspensa), ou com erro persistente
 * ao falar com o banco: só o botão "Sair" (quem está preso num erro precisa conseguir sair).
 */
const mostrarSoSair = computed(
  () =>
    !ehDemonstracao.value &&
    (authStore.situacao === 'sem_perfil' || authStore.situacao === 'inativo' || authStore.situacao === 'erro')
);

/** O que aparece na caixa da conta: papel em cima, unidade e linha embaixo. */
const conta = computed(() => {
  const u = authStore.usuarioAtual;
  const opcao = OPCOES_PERFIL.find((o) => o.papel === u.papel);
  const papel = opcao?.rotulo ?? u.cargo;
  const unidade = `${u.unidadeSigla} · ${opcao?.linha ?? ''}`;
  return { papel, unidade, completo: `${papel} — ${unidade}` };
});

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((p) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}

/**
 * "Sair" (só no modo real): levanta a bandeirinha de saída DE PROPÓSITO (para o App não
 * mostrar "Sua sessão terminou"), encerra a sessão e vai a /entrar sem motivo.
 */
async function sair(): Promise<void> {
  menuUsuarioAberto.value = false;
  saidaExplicita.value = true;
  try {
    await authStore.sair();
    await router.push({ name: 'entrar' });
  } finally {
    saidaExplicita.value = false;
  }
}

function escolherPerfil(papel: PapelGovernanca): void {
  authStore.alternarPerfilDemo(papel);
  menuUsuarioAberto.value = false;
}

// Fecha o menu do usuário ao clicar fora ou apertar Esc.
function aoClicarFora(evento: MouseEvent): void {
  if (areaMenuUsuario.value && !areaMenuUsuario.value.contains(evento.target as Node)) {
    menuUsuarioAberto.value = false;
  }
}
function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') menuUsuarioAberto.value = false;
}
onMounted(() => {
  document.addEventListener('click', aoClicarFora);
  document.addEventListener('keydown', aoTeclar);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', aoClicarFora);
  document.removeEventListener('keydown', aoTeclar);
});
</script>

<template>
  <header id="header" class="cabecalho">
    <!-- FAIXA 1: barra gov.br (some ao rolar) -->
    <div class="faixa-gov">
      <div class="faixa-gov__esquerda">
        <a href="https://www.gov.br" class="faixa-gov__logo" aria-label="Portal gov.br">gov.br</a>
        <span class="faixa-gov__divisor" aria-hidden="true"></span>
        <span class="faixa-gov__ministerio">Ministério do Meio Ambiente e Mudança do Clima</span>
      </div>
      <nav class="faixa-gov__links" aria-label="Links do Governo Federal">
        <a v-for="link in LINKS_GOVBR" :key="link.href" :href="link.href">{{ link.rotulo }}</a>
      </nav>
    </div>

    <!-- FAIXA 2: cabeçalho do sistema (fica preso no topo) -->
    <div class="barra">
      <!-- Botão do menu lateral -->
      <button
        v-if="!semMenu"
        id="header-navigation"
        type="button"
        class="barra__icone-botao"
        :aria-expanded="menuAberto"
        aria-controls="main-navigation"
        aria-label="Menu principal"
        @click="emit('alternar-menu')"
      >
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>

      <!-- Marca: ICMBio + nome do sistema -->
      <RouterLink to="/" class="barra__marca" aria-label="RADAR — página inicial">
        <span class="barra__icmbio" aria-hidden="true">ICMBio</span>
        <span class="barra__divisor" aria-hidden="true"></span>
        <span class="barra__nome">
          <strong>RADAR</strong>
          <span class="barra__orgao">CGGE · CGOV · Gestão de Riscos</span>
        </span>
      </RouterLink>

      <!-- Busca global (centralizada, até 560 px) -->
      <form v-if="!semMenu" id="main-searchbox" class="barra__busca" role="search" @submit.prevent="buscar">
        <label for="searchbox-radar" class="radar-so-leitor">Buscar riscos</label>
        <i class="fa-solid fa-magnifying-glass barra__busca-icone" aria-hidden="true"></i>
        <input
          id="searchbox-radar"
          v-model="termoBusca"
          type="search"
          placeholder="Buscar riscos por código, objeto ou categoria"
          autocomplete="off"
        />
      </form>

      <div class="barra__ferramentas">
        <!-- Abaixo de 1024 px a caixa de busca vira este botão -->
        <RouterLink
          v-if="!semMenu"
          :to="{ name: 'riscos-lista' }"
          class="barra__icone-botao barra__busca-botao"
          aria-label="Buscar riscos"
          title="Buscar riscos"
        >
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        </RouterLink>

        <!-- Alto contraste -->
        <button
          type="button"
          class="barra__icone-botao"
          :aria-pressed="tema === 'contraste'"
          aria-label="Alto contraste"
          title="Alto contraste"
          @click="alternarAltoContraste"
        >
          <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
        </button>

        <!-- Menu do usuário (largura fixa) -->
        <!-- Conta sem acesso liberado: só "Sair" -->
        <button v-if="mostrarSoSair" type="button" class="barra__sair" @click="sair">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          Sair
        </button>

        <div v-if="mostrarConta" ref="areaMenuUsuario" class="barra__usuario">
          <button
            type="button"
            class="barra__usuario-botao"
            :aria-expanded="menuUsuarioAberto"
            aria-controls="menu-usuario"
            :aria-label="`Menu do usuário: ${conta.completo}`"
            :title="conta.completo"
            @click="menuUsuarioAberto = !menuUsuarioAberto"
          >
            <span class="barra__avatar" aria-hidden="true">{{ iniciais(authStore.usuarioAtual.nome) }}</span>
            <span class="barra__usuario-texto" aria-hidden="true">
              <span class="barra__usuario-papel">{{ conta.papel }}</span>
              <span class="barra__usuario-unidade">{{ conta.unidade }}</span>
            </span>
            <i class="fa-solid fa-chevron-down barra__usuario-seta" aria-hidden="true"></i>
          </button>

          <div v-show="menuUsuarioAberto" id="menu-usuario" class="barra__menu">
            <p class="barra__menu-titulo">{{ authStore.usuarioAtual.nome }}</p>
            <p class="barra__menu-sub">
              {{ authStore.usuarioAtual.cargo }} · {{ authStore.usuarioAtual.unidadeSigla }}
            </p>

            <!-- Simulador: SÓ na demonstração. No modo real o perfil vem do banco. -->
            <fieldset v-if="ehDemonstracao" class="barra__perfis">
              <legend>Simular perfil (demonstração)</legend>
              <label v-for="op in OPCOES_PERFIL" :key="op.papel" class="barra__perfil">
                <input
                  type="radio"
                  name="perfil-demo"
                  :value="op.papel"
                  :checked="authStore.usuarioAtual.papel === op.papel"
                  @change="escolherPerfil(op.papel)"
                />
                <span>
                  <span class="barra__perfil-rotulo">{{ op.rotulo }}</span>
                  <span class="barra__perfil-detalhe">{{ op.detalhe }}</span>
                </span>
              </label>
            </fieldset>

            <!-- Aparência: claro, escuro (liberado na Fase 3) ou alto contraste -->
            <fieldset class="barra__perfis">
              <legend>Aparência</legend>
              <label v-for="t in TEMAS_DISPONIVEIS" :key="t" class="barra__perfil">
                <input type="radio" name="tema-interface" :value="t" :checked="tema === t" @change="escolherTema(t)" />
                <span><span class="barra__perfil-rotulo">{{ ROTULOS_TEMA[t] }}</span></span>
              </label>
            </fieldset>

            <p class="barra__fonte-dados">
              <i class="fa-solid fa-database" aria-hidden="true"></i>
              {{ isSupabaseConfigurado ? 'Dados: Supabase (PostgreSQL)' : 'Dados de demonstração (Anexo II)' }}
            </p>

            <!-- Sair: só no modo real (na demonstração não há login) -->
            <button v-if="!ehDemonstracao" type="button" class="barra__menu-sair" @click="sair">
              <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* O cabeçalho inteiro gruda no topo com a faixa gov.br JÁ escondida (top negativo). */
.cabecalho {
  position: sticky;
  top: calc(-1 * var(--altura-faixa-gov));
  z-index: 900;
}

/* --- Faixa 1: gov.br --------------------------------------------------- */
.faixa-gov {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-4);
  height: var(--altura-faixa-gov);
  padding: 0 var(--esp-6);
  background: var(--faixa-fundo);
  color: var(--faixa-texto);
}

.faixa-gov__esquerda {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-width: 0;
}

.faixa-gov__logo {
  font-size: 1.375rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--faixa-texto);
  text-decoration: none;
}

.faixa-gov__divisor {
  flex: none;
  width: 1px;
  height: 20px;
  background: var(--faixa-divisor);
}

.faixa-gov__ministerio {
  overflow: hidden;
  font-size: var(--texto-xs);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.faixa-gov__links {
  display: flex;
  align-items: center;
}

.faixa-gov__links a {
  padding: var(--esp-1) var(--esp-5);
  border-left: 1px solid var(--faixa-divisor);
  color: var(--faixa-texto);
  font-size: 0.6875rem;
  font-weight: var(--peso-forte);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
}

.faixa-gov__links a:hover {
  text-decoration: underline;
}

/* --- Faixa 2: cabeçalho do sistema ------------------------------------- */
.barra {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  height: var(--altura-cabecalho);
  padding: 0 var(--esp-6) 0 var(--esp-4);
  background: var(--superficie);
  border-bottom: 1px solid var(--borda);
}

.barra__icone-botao {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--alvo-minimo);
  height: var(--alvo-minimo);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--texto);
  font-size: 1.1rem;
  text-decoration: none;
  cursor: pointer;
}

.barra__icone-botao:hover,
.barra__icone-botao[aria-pressed='true'] {
  background: var(--superficie-alta);
}

.barra__marca {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-width: 0;
  color: var(--texto);
  text-decoration: none;
  white-space: nowrap;
}

.barra__icmbio {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--cor-marca-icmbio);
}

.barra__divisor {
  flex: none;
  width: 1px;
  height: 32px;
  background: var(--borda-forte);
}

.barra__nome {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.barra__nome strong {
  font-size: 1.0625rem;
  color: var(--texto-marca);
}

:root[data-theme='contraste'] .barra__nome strong {
  color: var(--texto);
}

.barra__orgao {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* Busca CENTRALIZADA: cresce até 560 px e nunca fica menor que 260 px. */
.barra__busca {
  position: relative;
  flex: 0 1 560px;
  min-width: 260px;
  margin: 0 auto;
}

.barra__busca input {
  width: 100%;
  height: var(--alvo-minimo);
  padding-left: 2.6rem;
  border-radius: var(--raio-pilula);
  background: var(--superficie-container);
  color: var(--texto); /* o gov.br DS fixa cinza-escuro, ilegível no alto contraste */
}

.barra__busca-icone {
  position: absolute;
  top: 50%;
  left: var(--esp-4);
  transform: translateY(-50%);
  color: var(--texto-secundario);
  pointer-events: none;
}

.barra__busca-botao {
  display: none;
}

.barra__ferramentas {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin-left: auto;
}

.barra__usuario {
  position: relative;
}

/* Largura FIXA: o mesmo tamanho para "CGOV" ou "PARNA Brasília / Unidade Técnica". */
.barra__usuario-botao {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  width: 240px;
  height: 44px;
  padding: 0 var(--esp-2) 0 var(--esp-1);
  border: 1px solid var(--borda);
  border-radius: var(--raio-pilula);
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.barra__usuario-botao:hover {
  border-color: var(--cor-primaria);
}

.barra__avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
}

.barra__usuario-texto {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.barra__usuario-texto > span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.barra__usuario-papel {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.barra__usuario-unidade {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.barra__usuario-seta {
  flex: none;
  font-size: var(--texto-xs);
}

.barra__menu {
  position: absolute;
  top: calc(100% + var(--esp-2));
  right: 0;
  width: min(20rem, calc(100vw - 2 * var(--esp-4)));
  padding: var(--esp-4);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-3);
}

.barra__menu-titulo {
  margin: 0;
  font-weight: var(--peso-semi);
}

.barra__menu-sub {
  margin: 0 0 var(--esp-3);
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.barra__perfis {
  margin: 0;
  padding: var(--esp-3) 0 0;
  border: 0;
  border-top: 1px solid var(--borda);
}

.barra__perfis + .barra__perfis {
  margin-top: var(--esp-3);
}

.barra__perfis legend {
  padding: 0;
  margin-bottom: var(--esp-2);
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.barra__perfil {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo);
  padding: var(--esp-1) var(--esp-2);
  border-radius: var(--raio-md);
  cursor: pointer;
}

.barra__perfil:hover {
  background: var(--superficie-alta);
}

.barra__perfil > span {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.barra__perfil-rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.barra__perfil-detalhe {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.barra__sair,
.barra__menu-sair {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  padding: 0 var(--esp-4);
  border: 1px solid var(--borda-forte);
  border-radius: var(--raio-pilula);
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  cursor: pointer;
}

.barra__sair:hover,
.barra__menu-sair:hover {
  border-color: var(--cor-primaria);
  background: var(--superficie-alta);
}

.barra__menu-sair {
  width: 100%;
  justify-content: center;
  margin-top: var(--esp-3);
}

.barra__fonte-dados {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: var(--esp-3) 0 0;
  padding-top: var(--esp-3);
  border-top: 1px solid var(--borda);
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* ---- Telas menores ---------------------------------------------------- */
@media (max-width: 1180px) {
  .faixa-gov__links {
    display: none;
  }
}

/* < 1024 px: busca e conta viram botões redondos (sem tamanhos intermediários). */
@media (max-width: 1023.98px) {
  .barra__busca {
    display: none;
  }
  .barra__busca-botao {
    display: grid;
  }
  .barra__usuario-botao {
    justify-content: center;
    width: 44px;
    padding: 0;
  }
  .barra__usuario-texto,
  .barra__usuario-seta {
    display: none;
  }
}

@media (max-width: 639.98px) {
  .faixa-gov {
    padding: 0 var(--esp-4);
  }
  .faixa-gov__ministerio {
    font-size: 0.6875rem;
  }
  .barra {
    gap: var(--esp-1);
    padding: 0 var(--esp-2);
  }
  .barra__orgao,
  .barra__divisor {
    display: none;
  }
  .barra__ferramentas {
    gap: 2px;
  }
}
</style>
