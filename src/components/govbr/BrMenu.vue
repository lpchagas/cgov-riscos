<script setup lang="ts">
/**
 * ============================================================================
 * MENU LATERAL — "NAVIGATION RAIL" (`nav#main-navigation`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Substitui o menu "push" antigo, que no celular abria por cima do conteúdo
 * logo ao carregar a página (achado 2.1 do diagnóstico). Agora:
 *
 *   COMPUTADOR (≥ 992 px): barra fixa à esquerda. Pode ser RECOLHIDA para
 *     mostrar só os ícones (72 px), liberando espaço para tabelas largas.
 *   CELULAR/TABLET (< 992 px): "gaveta" que fica FECHADA por padrão e abre
 *     por cima da página com fundo escurecido; fecha com Esc, com clique fora
 *     ou ao escolher uma página.
 *
 * Os itens estão organizados nos mesmos 3 grupos das Linhas de governança,
 * com nomes curtos (glossário do diagnóstico). Os contadores mostram o que
 * precisa de atenção (ex.: quantos riscos aguardam a SUA aprovação).
 */
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useRiscosStore } from '../../stores/riscosStore';
import { useAuthStore } from '../../stores/authStore';
import { podeAbrirRota } from '../../utils/acessoPorPerfil';

const props = defineProps<{
  /** Gaveta aberta (só tem efeito no celular/tablet). */
  aberto: boolean;
  /** Barra recolhida, só com ícones (só tem efeito no computador). */
  recolhido: boolean;
}>();

const emit = defineEmits<{ (e: 'fechar'): void; (e: 'alternar-recolhido'): void }>();

const route = useRoute();
const riscosStore = useRiscosStore();
const authStore = useAuthStore();

interface ItemMenu {
  nomeRota: string;
  rotulo: string;
  icone: string;
  /** Rotas "filhas" que também acendem este item (ex.: a ficha acende "Riscos"). */
  rotasRelacionadas?: string[];
  contador?: number;
  tomContador?: 'neutro' | 'perigo' | 'aviso';
  descricaoContador?: string;
}

/**
 * Quantos riscos aguardam decisão do PERFIL ATUAL = para validar + para
 * homologar + sem quem decida (a CGOV devolve à unidade). As três filas da
 * store vêm das `acoes` (o que ESTA pessoa pode fazer), então não é preciso
 * conferir o perfil aqui. Ex.: 2 + 1 + 0 → o menu mostra "3".
 */
const pendentesDoPerfil = computed(
  () =>
    riscosStore.filaValidacaoCg.length +
    riscosStore.filaHomologacaoDiretoria.length +
    riscosStore.filaSemDecisor.length
);

/**
 * Lista COMPLETA de grupos e itens. O que a pessoa de fato vê é filtrado abaixo por
 * `grupos`, usando a tabela única de acesso (`podeAbrirRota`).
 */
const todosOsGrupos = computed<{ titulo: string; itens: ItemMenu[] }[]>(() => [
  {
    titulo: 'Visão geral',
    itens: [
      { nomeRota: 'painel-cgov', rotulo: 'Painel', icone: 'fa-solid fa-chart-pie' },
      {
        nomeRota: 'dar-apetite',
        rotulo: 'Apetite a riscos (DAR)',
        icone: 'fa-solid fa-sliders',
        contador: riscosStore.riscosCriticosCarteira.length,
        tomContador: 'perigo',
        descricaoContador: 'riscos Críticos',
      },
    ],
  },
  {
    titulo: 'Gestão de riscos',
    itens: [
      {
        nomeRota: 'riscos-lista',
        rotulo: 'Riscos',
        icone: 'fa-solid fa-list-check',
        rotasRelacionadas: ['ficha-bowtie-detalhe', 'novo-risco'],
        contador: riscosStore.riscos.length,
        descricaoContador: 'riscos no total',
      },
      { nomeRota: 'catalogo-objetos', rotulo: 'Objetos de gestão', icone: 'fa-solid fa-sitemap' },
      { nomeRota: 'monitoramento-kris', rotulo: 'Monitoramento', icone: 'fa-solid fa-heart-pulse' },
    ],
  },
  {
    titulo: 'Deliberação',
    itens: [
      {
        nomeRota: 'validacao-um-clique',
        rotulo: 'Aprovações',
        icone: 'fa-solid fa-check-double',
        contador: pendentesDoPerfil.value,
        tomContador: 'aviso',
        descricaoContador: 'aguardando sua decisão',
      },
      { nomeRota: 'trilha-auditoria', rotulo: 'Auditoria', icone: 'fa-solid fa-clock-rotate-left' },
    ],
  },
  {
    titulo: 'Ferramentas',
    itens: [
      { nomeRota: 'importar-skill', rotulo: 'Importar riscos', icone: 'fa-solid fa-file-import' },
      { nomeRota: 'usuarios-perfis', rotulo: 'Usuários e perfis', icone: 'fa-solid fa-users-gear' },
    ],
  },
]);

/**
 * Só os itens que o PERFIL ATUAL pode abrir; grupo que ficou vazio some.
 * Exemplo: o gestor não tem "Importar riscos" nem "Usuários e perfis", então
 * o grupo "Ferramentas" inteiro desaparece para ele.
 */
const grupos = computed(() =>
  todosOsGrupos.value
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => podeAbrirRota(authStore.usuarioAtual.papel, item.nomeRota)),
    }))
    .filter((grupo) => grupo.itens.length > 0)
);

function estaAtivo(item: ItemMenu): boolean {
  const nome = String(route.name ?? '');
  return nome === item.nomeRota || Boolean(item.rotasRelacionadas?.includes(nome));
}

// Esc fecha a gaveta no celular.
function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key === 'Escape' && props.aberto) emit('fechar');
}
onMounted(() => document.addEventListener('keydown', aoTeclar));
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar));
</script>

<template>
  <!-- Fundo escurecido da gaveta (só aparece no celular com a gaveta aberta) -->
  <div v-if="aberto" class="menu-veu" aria-hidden="true" @click="emit('fechar')"></div>

  <nav
    id="main-navigation"
    class="menu-trilho"
    :class="{ 'menu-trilho--aberto': aberto, 'menu-trilho--recolhido': recolhido }"
    aria-label="Menu principal"
  >
    <!-- Ação principal (padrão "FAB" do navigation rail do M3) -->
    <RouterLink :to="{ name: 'novo-risco' }" class="menu-trilho__novo" :title="recolhido ? 'Novo risco' : undefined">
      <i class="fa-solid fa-plus" aria-hidden="true"></i>
      <span class="menu-trilho__texto">Novo risco</span>
    </RouterLink>

    <div v-for="grupo in grupos" :key="grupo.titulo">
      <p class="menu-trilho__titulo-grupo">{{ grupo.titulo }}</p>
      <ul role="list">
        <li v-for="item in grupo.itens" :key="item.nomeRota">
          <RouterLink
            :to="{ name: item.nomeRota }"
            class="menu-trilho__item"
            :class="{ 'menu-trilho__item--ativo': estaAtivo(item) }"
            :aria-current="estaAtivo(item) ? 'page' : undefined"
            :title="recolhido ? item.rotulo : undefined"
          >
            <i :class="item.icone" class="menu-trilho__icone" aria-hidden="true"></i>
            <span class="menu-trilho__texto">{{ item.rotulo }}</span>
            <span
              v-if="item.contador"
              class="menu-trilho__contador"
              :class="`menu-trilho__contador--${item.tomContador ?? 'neutro'}`"
            >
              {{ item.contador }}
              <span class="radar-so-leitor">{{ item.descricaoContador }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>

    <!-- Recolher/expandir (só no computador) -->
    <button
      type="button"
      class="menu-trilho__recolher"
      :aria-label="recolhido ? 'Expandir menu' : 'Recolher menu'"
      :aria-expanded="!recolhido"
      @click="emit('alternar-recolhido')"
    >
      <i class="fa-solid" :class="recolhido ? 'fa-angles-right' : 'fa-angles-left'" aria-hidden="true"></i>
      <span class="menu-trilho__texto">Recolher menu</span>
    </button>
  </nav>
</template>

<style scoped>
.menu-trilho {
  /* `flex: none`: o menu NUNCA encolhe, mesmo quando o conteúdo é largo
     (sem isso, a grade do Painel espremia o menu até ~18 px). */
  flex: none;
  position: sticky;
  top: var(--altura-cabecalho);
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  width: var(--largura-menu);
  height: calc(100vh - var(--altura-cabecalho));
  padding: var(--esp-4) var(--esp-3);
  overflow-y: auto;
  background: var(--superficie);
  border-right: 1px solid var(--borda);
  transition: width var(--duracao-media) var(--curva-padrao);
}

.menu-trilho ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Botão "Novo risco" */
.menu-trilho__novo {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-height: 3rem;
  margin-bottom: var(--esp-2);
  padding: 0 var(--esp-4);
  border-radius: var(--raio-lg);
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
  font-weight: var(--peso-semi);
  text-decoration: none;
  box-shadow: var(--elevacao-1);
}

.menu-trilho__novo:hover {
  background: var(--cor-primaria-hover);
  color: var(--cor-sobre-primaria);
}

.menu-trilho__titulo-grupo {
  margin: var(--esp-3) 0 var(--esp-1);
  padding: 0 var(--esp-3);
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--texto-secundario);
}

.menu-trilho__item {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo); /* corrige o achado A4: antes eram 16 px */
  padding: 0 var(--esp-3);
  border-radius: var(--raio-pilula);
  color: var(--texto);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  text-decoration: none;
}

.menu-trilho__item:hover {
  background: var(--superficie-alta);
}

/* Item ativo: "indicador" em pílula, como no M3. */
.menu-trilho__item--ativo {
  background: var(--cor-primaria-suave);
  color: var(--cor-sobre-primaria-suave);
  font-weight: var(--peso-semi);
}

:root[data-theme='contraste'] .menu-trilho__item--ativo {
  outline: 2px solid var(--cor-primaria);
}

.menu-trilho__icone {
  flex: none;
  width: 1.25rem;
  text-align: center;
}

.menu-trilho__texto {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-trilho__contador {
  min-width: 1.5rem;
  padding: 0 var(--esp-2);
  border-radius: var(--raio-pilula);
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  text-align: center;
}

.menu-trilho__contador--perigo {
  background: var(--cor-perigo-suave);
  color: var(--cor-perigo);
}

.menu-trilho__contador--aviso {
  background: var(--cor-aviso-suave);
  color: var(--cor-aviso);
}

.menu-trilho__recolher {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo);
  margin-top: auto;
  padding: 0 var(--esp-3);
  border: 0;
  border-radius: var(--raio-pilula);
  background: transparent;
  color: var(--texto-secundario);
  font: inherit;
  font-size: var(--texto-sm);
  cursor: pointer;
}

.menu-trilho__recolher:hover {
  background: var(--superficie-alta);
}

/* ---- Modo recolhido (só ícones) ---- */
.menu-trilho--recolhido {
  width: var(--largura-menu-recolhido);
  padding-inline: var(--esp-2);
}

.menu-trilho--recolhido .menu-trilho__texto,
.menu-trilho--recolhido .menu-trilho__titulo-grupo {
  /* Some da tela, mas continua sendo lido pelo leitor de tela. */
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.menu-trilho--recolhido .menu-trilho__novo,
.menu-trilho--recolhido .menu-trilho__item,
.menu-trilho--recolhido .menu-trilho__recolher {
  justify-content: center;
  padding: 0;
  position: relative;
}

.menu-trilho--recolhido .menu-trilho__contador {
  position: absolute;
  top: 0;
  right: 2px;
  min-width: 1.1rem;
  padding: 0 4px;
  font-size: 0.65rem;
}

/* ---- Celular e tablet: gaveta fora da tela até ser aberta ---- */
.menu-veu {
  display: none;
}

@media (max-width: 991.98px) {
  .menu-trilho,
  .menu-trilho--recolhido {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: min(85vw, var(--largura-menu));
    height: 100vh;
    padding: var(--esp-4) var(--esp-3);
    transform: translateX(-100%);
    visibility: hidden;
    transition: transform var(--duracao-media) var(--curva-padrao),
      visibility var(--duracao-media);
    box-shadow: var(--elevacao-3);
  }

  /* Ao ABRIR, a visibilidade muda na hora (transição de 0 s); só o deslize é
     animado. Sem isso, o atalho "Ir para o menu" tentava focar um item ainda
     invisível e o foco se perdia. Ao FECHAR, vale a transição da regra acima. */
  .menu-trilho--aberto {
    transform: none;
    visibility: visible;
    transition: transform var(--duracao-media) var(--curva-padrao), visibility 0s;
  }

  /* No celular o modo "recolhido" não se aplica: os textos sempre aparecem. */
  .menu-trilho--recolhido .menu-trilho__texto,
  .menu-trilho--recolhido .menu-trilho__titulo-grupo {
    position: static;
    width: auto;
    height: auto;
    clip: auto;
  }
  .menu-trilho--recolhido .menu-trilho__item,
  .menu-trilho--recolhido .menu-trilho__novo {
    justify-content: flex-start;
    padding: 0 var(--esp-3);
  }

  .menu-trilho__recolher {
    display: none;
  }

  .menu-veu {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--veu-modal);
  }
}
</style>
