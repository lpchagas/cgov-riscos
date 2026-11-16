<script setup lang="ts">
/**
 * ============================================================================
 * COMPONENTE RAIZ — "APP SHELL" DO RADAR (`src/App.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O "app shell" é o esqueleto que fica parado enquanto as páginas trocam.
 * Mantemos a anatomia do Template Base gov.br (skip-link, cabeçalho, menu,
 * trilha, conteúdo e rodapé), reorganizada no padrão moderno dos sistemas
 * web (Material Design 3 / Ant Design Pro):
 *
 *   ┌──────────── Faixa gov.br (44 px, some ao rolar a página) ──────────────┐
 *   ├───────────────────────── Cabeçalho (64 px, fixo no topo) ─────────────┤
 *   ├──────────┬────────────────────────────────────────────────────────────┤
 *   │  Menu    │  Trilha › de › navegação                                    │
 *   │ lateral  │  <h1> Título da página        [ⓘ Fundamento]   [Ações]     │
 *   │ (rail)   │  ...conteúdo da página (RouterView)...                      │
 *   └──────────┴────────────────────────────────────────────────────────────┘
 *   ┌──────────── Rodapé institucional (largura total, azul-escuro) ─────────┐
 *
 * O título <h1> de cada página vem AUTOMATICAMENTE dos metadados da rota
 * (`src/router/index.ts`) — assim, todas as 9 páginas ganharam um <h1> sem
 * precisar mexer nelas (achado A6 do diagnóstico). Uma view pode desenhar o
 * próprio cabeçalho marcando `meta.cabecalhoProprio: true`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, START_LOCATION, useRoute, useRouter } from 'vue-router';
import BrSkiplink from './components/govbr/BrSkiplink.vue';
import BrHeader from './components/govbr/BrHeader.vue';
import BrMenu from './components/govbr/BrMenu.vue';
import BrBreadcrumb from './components/govbr/BrBreadcrumb.vue';
import BrFooter from './components/govbr/BrFooter.vue';
import PageHeader from './components/ui/PageHeader.vue';
import ToastRegion from './components/ui/ToastRegion.vue';
import BrMessage from './components/govbr/BrMessage.vue';
import BrButton from './components/govbr/BrButton.vue';
import { usePreferenciasInterface } from './composables/usePreferenciasInterface';
import { saidaExplicita } from './composables/useSaidaExplicita';
import { useAuthStore } from './stores/authStore';
import { useRiscosStore } from './stores/riscosStore';
import { useToast } from './composables/useToast';
import { AVISO_SO_CGOV } from './router/guarda';
import { podeAbrirRota } from './utils/acessoPorPerfil';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { menuRecolhido, alternarMenuRecolhido } = usePreferenciasInterface();
const { mostrar: mostrarToast } = useToast();

// ---------------------------------------------------------------------------
// COMPUTADOR × CELULAR
// `matchMedia` avisa quando a largura da janela cruza 992 px.
// ---------------------------------------------------------------------------
const consultaDesktop = window.matchMedia('(min-width: 992px)');
const ehDesktop = ref<boolean>(consultaDesktop.matches);
const atualizarTela = (e: MediaQueryListEvent) => {
  ehDesktop.value = e.matches;
};
onMounted(() => consultaDesktop.addEventListener('change', atualizarTela));
onBeforeUnmount(() => consultaDesktop.removeEventListener('change', atualizarTela));

// ---------------------------------------------------------------------------
// MODO E SESSÃO
// ---------------------------------------------------------------------------
/** Telas de acesso (entrar, retorno, acesso não liberado) não têm menu lateral nem trilha. */
const semMenu = computed(() => Boolean(route.meta.semMenu));

/** Faixa fixa avisando que nada ali é real (só no modo demonstração). */
const emDemonstracao = computed(() => authStore.modo === 'demonstracao');

/** Erro ao falar com o banco, numa tela protegida: mostramos a mensagem no lugar da página. */
const mostrarErro = computed(
  () => authStore.modo === 'real' && authStore.situacao === 'erro' && !route.meta.publica
);

/**
 * REAGE ÀS MUDANÇAS DA SESSÃO E DO PERFIL. Só mexe na navegação quando a rota atual NÃO é
 * pública (telas de acesso cuidam de si mesmas), com UMA exceção. Exemplos:
 *   - ativo -> anônimo sozinho (sessão venceu, ou saiu em outra aba): vai a
 *     `/entrar?motivo=sessao&volta=<tela atual>`, para voltar de onde parou;
 *   - virou 'inativo' ou 'sem_perfil' (a CGOV suspendeu a conta com a pessoa logada):
 *     vai a `/acesso-nao-liberado`;
 *   - EXCEÇÃO: a pessoa está em `/acesso-nao-liberado` e a situação virou 'ativo' (a CGOV
 *     reativou a conta): vai ao Painel, sem precisar apertar nada;
 *   - situação 'ativo' (ou demonstração) e o perfil da pessoa não pode abrir a tela atual
 *     (ex.: `erro` -> `ativo` numa tela só da CGOV; perfil trocado no simulador estando em
 *     /usuarios): vai ao Painel com o aviso "Esta tela é exclusiva da CGOV.".
 * Quando a pessoa clicou em "Sair" (`saidaExplicita`), o botão já leva a /entrar: não fazemos nada.
 */
watch(
  () => [authStore.situacao, authStore.usuarioAtual.papel] as const,
  ([nova, papel], [antiga]) => {
    if (saidaExplicita.value) return;
    const real = authStore.modo === 'real';

    // Conta reativada: quem esperava em /acesso-nao-liberado segue ao Painel.
    if (real && nova === 'ativo' && route.name === 'acesso-nao-liberado') {
      void router.push({ name: 'painel-cgov' });
      return;
    }
    if (route.meta.publica) return;

    // Reconferência da tela atual quando o perfil ou a situação mudam.
    if ((!real || nova === 'ativo') && !podeAbrirRota(papel, String(route.name ?? ''))) {
      mostrarToast({ mensagem: AVISO_SO_CGOV, tom: 'aviso' });
      void router.push({ name: 'painel-cgov' });
      return;
    }
    if (!real) return;

    const estavaLogada = antiga === 'ativo' || antiga === 'sem_perfil' || antiga === 'inativo';
    if (nova === 'anonimo' && estavaLogada) {
      void router.push({ name: 'entrar', query: { motivo: 'sessao', volta: route.fullPath } });
    } else if (nova === 'inativo' || nova === 'sem_perfil') {
      void router.push({ name: 'acesso-nao-liberado' });
    }
  }
);

/**
 * CARGA E LIMPEZA DA CARTEIRA DE RISCOS (etapa B3).
 * O App é o primeiro componente a existir, então é aqui que ligamos a store
 * de riscos à sessão:
 *   - sessão 'ativo' → `carregar()` (na demonstração a situação já nasce
 *     'ativo', então a carteira carrega assim que o sistema abre);
 *   - qualquer outra situação (saiu, sessão venceu, conta suspensa, erro) →
 *     `limpar()`: nenhum dado de uma pessoa fica na memória para a próxima;
 *   - outra pessoa (id) ou outro perfil (papel) com a sessão ativa → recarrega,
 *     porque o alcance e os botões (`acoes`) dependem de quem está usando.
 *     Ex.: na demonstração, trocar de "Gestor" para "Diretoria" no simulador
 *     recarrega a carteira e a fila de homologação aparece.
 * `immediate: true` roda a regra uma vez já na abertura.
 */
const riscosStore = useRiscosStore();
watch(
  () => [authStore.situacao, authStore.usuarioAtual.id, authStore.usuarioAtual.papel] as const,
  ([situacao]) => {
    if (situacao === 'ativo') void riscosStore.carregar();
    else riscosStore.limpar();
  },
  { immediate: true }
);

/**
 * Quando a janela volta ao foco, relemos o perfil: se a CGOV suspendeu a pessoa enquanto a
 * aba estava aberta, o `watch` acima a leva para `/acesso-nao-liberado`.
 */
function aoMudarVisibilidade(): void {
  if (document.visibilityState !== 'visible') return;
  if (authStore.modo !== 'real' || authStore.situacao === 'anonimo') return;
  void authStore.recarregarPerfil();
}
onMounted(() => document.addEventListener('visibilitychange', aoMudarVisibilidade));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', aoMudarVisibilidade));

/** Gaveta do menu no celular: FECHADA por padrão (antes abria sozinha). */
const gavetaAberta = ref<boolean>(false);

/** O botão ☰ recolhe o menu no computador e abre a gaveta no celular. */
function alternarMenu(): void {
  if (ehDesktop.value) alternarMenuRecolhido();
  else gavetaAberta.value = !gavetaAberta.value;
}

/**
 * Atalho de teclado "Ir para o menu": no celular, a gaveta precisa ABRIR antes
 * de receber o foco. No computador o menu já está visível; nada a fazer.
 */
function abrirMenuPeloAtalho(): void {
  if (!ehDesktop.value) gavetaAberta.value = true;
}

const menuVisivel = computed(() => (ehDesktop.value ? !menuRecolhido.value : gavetaAberta.value));

// Ao trocar de página, fecha a gaveta e leva o foco ao conteúdo novo
// (quem usa leitor de tela "ouve" que a página mudou).
// `START_LOCATION` é a "rota vazia" antes da primeira navegação: nesse caso
// (abertura do sistema) não movemos o foco.
router.afterEach(async (_para, de) => {
  gavetaAberta.value = false;
  if (de === START_LOCATION) return;
  await nextTick();
  document.getElementById('main-content')?.focus({ preventScroll: true });
});
</script>

<template>
  <div class="template-base">
    <!-- 1. Atalhos de teclado (Alt+1 conteúdo, Alt+2 menu, Alt+3 busca, Alt+4 rodapé) -->
    <BrSkiplink :sem-menu="semMenu" @abrir-menu="abrirMenuPeloAtalho" />

    <!-- 1b. Faixa do modo demonstração (sem Supabase configurado) -->
    <div v-if="emDemonstracao" class="faixa-demo" role="note">
      <i class="fa-solid fa-flask" aria-hidden="true"></i>
      Modo demonstração: dados fictícios, sem login
    </div>

    <!-- 2. Cabeçalho compacto -->
    <BrHeader :menu-aberto="menuVisivel" :sem-menu="semMenu" @alternar-menu="alternarMenu" />

    <div class="casca">
      <!-- 3. Menu lateral (navigation rail) -->
      <BrMenu
        v-if="!semMenu"
        :aberto="gavetaAberta"
        :recolhido="menuRecolhido"
        @fechar="gavetaAberta = false"
        @alternar-recolhido="alternarMenuRecolhido"
      />

      <!-- 4. Área principal -->
      <main id="main" class="casca__principal">
        <div class="casca__conteudo">
          <BrBreadcrumb v-if="!semMenu" />

          <!-- O skip-link "Ir para o conteúdo" e a troca de página trazem o foco
               para cá, onde o primeiro elemento lido é o <h1> da página. -->
          <div id="main-content" class="main-content" tabindex="-1">
            <PageHeader
              v-if="!route.meta.cabecalhoProprio && route.meta.titulo"
              :titulo="route.meta.titulo"
              :descricao="route.meta.descricao"
              :fundamento="route.meta.fundamento"
            />

            <!-- Sem conexão com o banco: mensagem + nova tentativa, no lugar da página -->
            <BrMessage v-if="mostrarErro" state="danger" titulo="Não foi possível carregar o RADAR">
              {{ authStore.mensagemErro }}
              <div class="faixa-erro__acao">
                <BrButton variant="secondary" @click="authStore.recarregarPerfil()">Tentar de novo</BrButton>
              </div>
            </BrMessage>
            <RouterView v-else />
          </div>
        </div>
      </main>
    </div>

    <!-- 5. Rodapé institucional: largura total, abaixo do menu e do conteúdo -->
    <BrFooter />

    <!-- Avisos rápidos (toasts) de toda a aplicação -->
    <ToastRegion />
  </div>
</template>

<style scoped>
/* Faixa do modo demonstração: cor de aviso do tema (sem cor fixa). */
.faixa-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--esp-2);
  padding: var(--esp-2) var(--esp-4);
  background: var(--cor-aviso-suave);
  color: var(--cor-aviso);
  border-bottom: 1px solid var(--borda);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  text-align: center;
}

.faixa-erro__acao {
  margin-top: var(--esp-3);
}

.casca {
  display: flex;
  align-items: flex-start;
}

.casca__principal {
  flex: 1;
  min-width: 0; /* permite que tabelas largas rolem dentro da área, sem estourar a página */
}

.casca__conteudo {
  max-width: var(--largura-conteudo-max);
  margin: 0 auto;
  padding: var(--esp-5) var(--esp-6) var(--esp-4);
}

/* O foco programático na troca de página serve ao leitor de tela; não
   desenhamos o anel de foco em volta da área inteira. */
.main-content:focus,
.main-content:focus-visible {
  outline: none;
  box-shadow: none;
}

@media (max-width: 767.98px) {
  .casca__conteudo {
    padding: var(--esp-4);
  }
}
</style>
