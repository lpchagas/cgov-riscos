<script setup lang="ts">
/**
 * ============================================================================
 * CABEÇALHO COMPACTO GOV.BR (`header.br-header#header`) — 64 px
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O cabeçalho antigo ocupava ~185 px e mostrava números de processo SEI e o
 * seletor de perfil logo de cara (achado 2.1 do diagnóstico). O novo segue o
 * padrão "top app bar" do Material Design 3, com a identidade gov.br:
 *
 *   [☰] gov.br | RADAR · ICMBio        [ 🔍 Buscar riscos ]   [◐] [👤 Perfil ▾]
 *
 *   - ☰  abre/fecha o menu lateral (no celular) ou recolhe/expande (no computador);
 *   - a BUSCA leva para a lista de Riscos já filtrada (`/riscos?q=termo`);
 *   - ◐  liga/desliga o alto contraste;
 *   - o MENU DO USUÁRIO guarda o simulador de perfil (demonstração) e a
 *     origem dos dados, que antes ocupavam espaço nobre no topo.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { usePreferenciasInterface } from '../../composables/usePreferenciasInterface';
import { isSupabaseConfigurado } from '../../services/supabase';
import type { PapelGovernanca } from '../../types/radar.types';

defineProps<{ menuAberto: boolean }>();
const emit = defineEmits<{ (e: 'alternar-menu'): void }>();

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { tema, alternarAltoContraste } = usePreferenciasInterface();

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

/** Rótulos curtos dos 4 perfis das 3 Linhas de governança. */
const OPCOES_PERFIL: { papel: PapelGovernanca; rotulo: string; detalhe: string }[] = [
  { papel: 'gestor', rotulo: 'Gestor da unidade', detalhe: '1ª Linha · cadastra riscos' },
  { papel: 'lider_cg', rotulo: 'Coordenação-Geral', detalhe: '2º degrau · valida riscos' },
  { papel: 'diretor', rotulo: 'Diretoria', detalhe: '3º degrau · homologa Críticos' },
  { papel: 'cgov', rotulo: 'Analista de governança', detalhe: '2ª Linha (CGOV) · governa a DAR' },
];

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((p) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
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
    <!-- Botão do menu lateral -->
    <button
      id="header-navigation"
      type="button"
      class="cabecalho__icone-botao"
      :aria-expanded="menuAberto"
      aria-controls="main-navigation"
      aria-label="Menu principal"
      @click="emit('alternar-menu')"
    >
      <i class="fa-solid fa-bars" aria-hidden="true"></i>
    </button>

    <!-- Marca: gov.br + nome do sistema -->
    <RouterLink to="/" class="cabecalho__marca" aria-label="RADAR — página inicial">
      <span class="cabecalho__govbr" aria-hidden="true">gov.br</span>
      <span class="cabecalho__divisor" aria-hidden="true"></span>
      <span class="cabecalho__nome">
        <strong>RADAR</strong>
        <span class="cabecalho__orgao">ICMBio · Gestão de Riscos</span>
      </span>
    </RouterLink>

    <!-- Busca global -->
    <form id="main-searchbox" class="cabecalho__busca" role="search" @submit.prevent="buscar">
      <label for="searchbox-radar" class="radar-so-leitor">Buscar riscos</label>
      <i class="fa-solid fa-magnifying-glass cabecalho__busca-icone" aria-hidden="true"></i>
      <input
        id="searchbox-radar"
        v-model="termoBusca"
        type="search"
        placeholder="Buscar riscos por código, objeto ou categoria"
        autocomplete="off"
      />
    </form>

    <div class="cabecalho__acoes">
      <!-- Alto contraste -->
      <button
        type="button"
        class="cabecalho__icone-botao"
        :aria-pressed="tema === 'contraste'"
        aria-label="Alto contraste"
        title="Alto contraste"
        @click="alternarAltoContraste"
      >
        <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
      </button>

      <!-- Menu do usuário -->
      <div ref="areaMenuUsuario" class="cabecalho__usuario">
        <button
          type="button"
          class="cabecalho__usuario-botao"
          :aria-expanded="menuUsuarioAberto"
          aria-controls="menu-usuario"
          @click="menuUsuarioAberto = !menuUsuarioAberto"
        >
          <span class="cabecalho__avatar" aria-hidden="true">{{ iniciais(authStore.usuarioAtual.nome) }}</span>
          <span class="cabecalho__usuario-texto">
            <span class="cabecalho__usuario-nome">{{ authStore.usuarioAtual.unidadeSigla }}</span>
            <span class="cabecalho__usuario-papel">
              {{ OPCOES_PERFIL.find((o) => o.papel === authStore.usuarioAtual.papel)?.rotulo }}
            </span>
          </span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>

        <div v-show="menuUsuarioAberto" id="menu-usuario" class="cabecalho__menu">
          <p class="cabecalho__menu-titulo">{{ authStore.usuarioAtual.nome }}</p>
          <p class="cabecalho__menu-sub">{{ authStore.usuarioAtual.cargo }}</p>

          <fieldset class="cabecalho__perfis">
            <legend>Simular perfil (demonstração)</legend>
            <label v-for="op in OPCOES_PERFIL" :key="op.papel" class="cabecalho__perfil">
              <input
                type="radio"
                name="perfil-demo"
                :value="op.papel"
                :checked="authStore.usuarioAtual.papel === op.papel"
                @change="escolherPerfil(op.papel)"
              />
              <span>
                <span class="cabecalho__perfil-rotulo">{{ op.rotulo }}</span>
                <span class="cabecalho__perfil-detalhe">{{ op.detalhe }}</span>
              </span>
            </label>
          </fieldset>

          <p class="cabecalho__fonte-dados">
            <i class="fa-solid fa-database" aria-hidden="true"></i>
            {{ isSupabaseConfigurado ? 'Dados: Supabase (PostgreSQL)' : 'Dados de demonstração (Anexo II)' }}
          </p>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cabecalho {
  position: sticky;
  top: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  height: var(--altura-cabecalho);
  padding: 0 var(--esp-4);
  background: var(--superficie);
  border-bottom: 1px solid var(--borda);
}

.cabecalho__icone-botao {
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
  cursor: pointer;
}

.cabecalho__icone-botao:hover,
.cabecalho__icone-botao[aria-pressed='true'] {
  background: var(--superficie-alta);
}

.cabecalho__marca {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  color: var(--texto);
  text-decoration: none;
  white-space: nowrap;
}

.cabecalho__govbr {
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: var(--cor-primaria);
}

.cabecalho__divisor {
  width: 1px;
  height: 28px;
  background: var(--borda);
}

.cabecalho__nome {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.cabecalho__nome strong {
  font-size: var(--texto-lg);
  color: var(--cor-marca-escura);
}

:root[data-theme='contraste'] .cabecalho__nome strong {
  color: var(--texto);
}

.cabecalho__orgao {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.cabecalho__busca {
  position: relative;
  flex: 1 1 auto;
  max-width: 36rem;
  margin-left: auto;
}

.cabecalho__busca input {
  width: 100%;
  padding-left: 2.5rem;
  border-radius: var(--raio-pilula);
  background: var(--superficie-container);
}

.cabecalho__busca-icone {
  position: absolute;
  top: 50%;
  left: var(--esp-4);
  transform: translateY(-50%);
  color: var(--texto-secundario);
  pointer-events: none;
}

.cabecalho__acoes {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
}

.cabecalho__usuario {
  position: relative;
}

.cabecalho__usuario-botao {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  padding: var(--esp-1) var(--esp-2) var(--esp-1) var(--esp-1);
  border: 1px solid var(--borda);
  border-radius: var(--raio-pilula);
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  cursor: pointer;
}

.cabecalho__avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
}

.cabecalho__usuario-texto {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
}

.cabecalho__usuario-nome {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.cabecalho__usuario-papel {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.cabecalho__menu {
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

.cabecalho__menu-titulo {
  margin: 0;
  font-weight: var(--peso-semi);
}

.cabecalho__menu-sub {
  margin: 0 0 var(--esp-3);
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.cabecalho__perfis {
  margin: 0;
  padding: var(--esp-3) 0 0;
  border: 0;
  border-top: 1px solid var(--borda);
}

.cabecalho__perfis legend {
  padding: 0;
  margin-bottom: var(--esp-2);
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cabecalho__perfil {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo);
  padding: var(--esp-1) var(--esp-2);
  border-radius: var(--raio-md);
  cursor: pointer;
}

.cabecalho__perfil:hover {
  background: var(--superficie-alta);
}

.cabecalho__perfil > span {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.cabecalho__perfil-rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.cabecalho__perfil-detalhe {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.cabecalho__fonte-dados {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: var(--esp-3) 0 0;
  padding-top: var(--esp-3);
  border-top: 1px solid var(--borda);
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* ---- Telas médias e pequenas: esconde textos secundários ---- */
@media (max-width: 991.98px) {
  .cabecalho__usuario-texto,
  .cabecalho__usuario-botao > .fa-chevron-down {
    display: none;
  }
  .cabecalho__usuario-botao {
    padding: var(--esp-1);
  }
}

@media (max-width: 639.98px) {
  .cabecalho {
    gap: var(--esp-2);
    padding: 0 var(--esp-2);
  }
  .cabecalho__orgao,
  .cabecalho__divisor,
  .cabecalho__govbr {
    display: none;
  }
  .cabecalho__busca input {
    padding-right: var(--esp-2);
  }
  .cabecalho__busca input::placeholder {
    color: transparent; /* no celular, o ícone de lupa já comunica a função */
  }
}
</style>
