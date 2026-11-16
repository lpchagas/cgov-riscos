<script setup lang="ts">
/**
 * ============================================================================
 * APETITE A RISCOS — DAR (`DeclaracaoApetiteDarView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Aqui a CGOV (2ª Linha) calibra quanto risco o ICMBio aceita em cada uma das
 * 8 categorias do Quadro 2 (Declaração de Apetite a Riscos — Anexo III).
 *
 * O que mudou na reformulação:
 *   - cada categoria tem um controle segmentado Baixo | Moderado | Pendente
 *     (antes: um <select> sem rótulo);
 *   - antes de aplicar, uma janela mostra a PRÉVIA do impacto
 *     ("1 risco deixa de ser Crítico") — `utils/darImpacto.ts`;
 *   - depois de aplicar, um aviso oferece "Desfazer";
 *   - o simulador que ficava no Painel veio para cá.
 *
 * Regras mantidas: "Crítico" = residual fora do apetite da categoria (não é o
 * nível Extremo). A criticidade é recalculada pela STORE, com a calculadora
 * oficial — a tela só pede a mudança.
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../composables/useToast';
import type { ApetiteDeclarado, CategoriaRisco, FichaRisco } from '../types/radar.types';
import { SUBCATEGORIAS_INTEGRIDADE_QUADRO_3 } from '../utils/calculadoraRiscoRadar';
import { ROTULOS_APETITE, resumirImpactoDar, simularImpactoDar, type ImpactoDar } from '../utils/darImpacto';
import StatCard from '../components/ui/StatCard.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import type { ColunaTabela, OpcaoSegmento } from '../components/ui/tipos';
import FormField from '../components/ui/FormField.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import Dialog from '../components/ui/Dialog.vue';
import DataTable from '../components/ui/DataTable.vue';
import RiskBadge from '../components/ui/RiskBadge.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrMessage from '../components/govbr/BrMessage.vue';

const riscosStore = useRiscosStore();
const authStore = useAuthStore();
const { mostrar } = useToast();

// ---------------------------------------------------------------------------
// INDICADORES
// ---------------------------------------------------------------------------
const contarApetite = (a: ApetiteDeclarado) => riscosStore.categorias.filter((c) => c.apetiteDeclarado === a).length;

const contagemPorCategoria = computed(() => {
  const mapa = new Map<number, { total: number; criticos: number }>();
  for (const r of riscosStore.riscos) {
    const atual = mapa.get(r.categoriaId) ?? { total: 0, criticos: 0 };
    atual.total++;
    if (r.statusCritico === 'sim') atual.criticos++;
    mapa.set(r.categoriaId, atual);
  }
  return mapa;
});

// ---------------------------------------------------------------------------
// MUDANÇA DE APETITE: pedir → ver prévia → confirmar → (desfazer)
// ---------------------------------------------------------------------------
const OPCOES_APETITE: OpcaoSegmento<ApetiteDeclarado>[] = [
  { valor: 'baixo', rotulo: 'Baixo' },
  { valor: 'moderado', rotulo: 'Moderado' },
  { valor: 'pendente_dar', rotulo: 'Pendente' },
];

interface PedidoMudanca {
  categoria: CategoriaRisco;
  de: ApetiteDeclarado;
  para: ApetiteDeclarado;
  impacto: ImpactoDar;
}
const pedido = ref<PedidoMudanca | null>(null);

/**
 * Aviso FIXO (fica na página) exibido depois de salvar um apetite. No banco, mudar
 * o apetite recalcula todos os riscos da categoria: os aprovados que passam a
 * Crítico (fora do apetite) voltam para a homologação. A prévia do Dialog continua
 * existindo (é só uma prévia); este aviso confirma o que o RADAR de fato fez.
 */
const avisoRecalculo = ref(false);

/** Estado do bloco principal: a store 'ociosa' ainda vai carregar, então mostra o esqueleto. */
const estadoBloco = computed(() =>
  riscosStore.estado === 'erro' ? 'erro' : riscosStore.estado === 'pronto' ? 'pronto' : 'carregando'
);

function pedirMudanca(categoria: CategoriaRisco, para: ApetiteDeclarado): void {
  if (para === categoria.apetiteDeclarado) return;
  pedido.value = {
    categoria,
    de: categoria.apetiteDeclarado,
    para,
    impacto: simularImpactoDar(riscosStore.riscos, categoria.id, para),
  };
}

// Gravações na fonte de dados (assíncronas); recusa → mensagem já traduzida.
const avisarErro = (e: unknown) => mostrar({ tom: 'perigo', mensagem: (e as Error).message });

async function confirmarMudanca(): Promise<void> {
  if (!pedido.value) return;
  const { categoria, de, para } = pedido.value;
  pedido.value = null;
  try {
    await riscosStore.alterarApetiteCategoriaDAR(categoria.id, para);
  } catch (e) {
    avisarErro(e);
    return;
  }
  avisoRecalculo.value = true;
  mostrar({
    tom: 'sucesso',
    mensagem: `Apetite de ${categoria.nome}: ${ROTULOS_APETITE[para].rotulo}.`,
    // "Desfazer" grava o apetite anterior pela MESMA via (o banco recalcula de novo).
    acao: {
      rotulo: 'Desfazer',
      executar: () =>
        riscosStore.alterarApetiteCategoriaDAR(categoria.id, de).then(() => { avisoRecalculo.value = true; }).catch(avisarErro),
    },
  });
}

async function salvarJustificativa(categoria: CategoriaRisco, texto: string): Promise<void> {
  if (texto.trim() === categoria.justificativaDar) return;
  try {
    await riscosStore.atualizarJustificativaCategoriaDAR(categoria.id, texto.trim());
  } catch (e) {
    avisarErro(e);
    return;
  }
  mostrar({ tom: 'sucesso', mensagem: `Justificativa de ${categoria.nome} salva.` });
}

// ---------------------------------------------------------------------------
// RISCOS CRÍTICOS
// ---------------------------------------------------------------------------
const colunasCriticos: ColunaTabela<FichaRisco>[] = [
  { chave: 'codigoRadar', rotulo: 'Código', ordenavel: true },
  { chave: 'nomeObjetoCache', rotulo: 'Objeto de gestão' },
  { chave: 'categoriaNome', rotulo: 'Categoria', ordenavel: true, ocultarNoCelular: true },
  { chave: 'nivelResidual', rotulo: 'Residual', ordenavel: true, alinhamento: 'direita' },
];
const apetiteDaCategoria = (id: number) =>
  ROTULOS_APETITE[riscosStore.categorias.find((c) => c.id === id)?.apetiteDeclarado ?? 'pendente_dar'].rotulo;
</script>

<template>
  <div class="dar">
    <!-- Lembrete da regra mais confundida -->
    <aside class="lembrete" aria-label="Regra da DAR">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <p>
        <strong>Crítico não é o mesmo que Extremo.</strong> Um risco é <strong>Crítico</strong> quando o
        residual passa do apetite da sua categoria. Ex.: com apetite <strong>Baixo</strong>, um residual
        Médio (8,4) já é Crítico e sobe para homologação da Diretoria.
      </p>
    </aside>

    <BrMessage v-if="avisoRecalculo" state="info" titulo="Apetite salvo">
      Os riscos aprovados da categoria foram recalculados pelo RADAR; os que passaram a Crítico voltaram para homologação.
    </BrMessage>

    <EstadoCarregamento :estado="estadoBloco" :erro="riscosStore.erro" formato="tabela" @tentar-de-novo="riscosStore.tentarDeNovo()">
    <section class="dar__kpis" aria-label="Resumo da DAR">
      <StatCard rotulo="Categorias" :valor="riscosStore.categorias.length" descricao="Quadro 2 (sem categoria mista)" />
      <StatCard rotulo="Apetite Baixo" :valor="contarApetite('baixo')" tom="sucesso" descricao="Aceitam residual até 5" />
      <StatCard rotulo="Apetite Moderado" :valor="contarApetite('moderado')" tom="aviso" descricao="Aceitam residual até 10" />
      <StatCard
        rotulo="Riscos Críticos"
        :valor="riscosStore.riscosCriticosCarteira.length"
        tom="perigo"
        descricao="Fora do apetite da DAR"
        :para="{ name: 'riscos-lista', query: { critico: 'sim' } }"
      />
    </section>

    <!-- CALIBRAGEM -->
    <section class="cartao" aria-labelledby="titulo-calibragem">
      <div class="cartao__cabecalho">
        <div>
          <h2 id="titulo-calibragem" class="cartao__titulo">Apetite por categoria</h2>
          <p class="cartao__subtitulo">Antes de aplicar, você vê quantos riscos mudam de situação.</p>
        </div>
      </div>

      <p v-if="!authStore.isCgov" class="aviso-perfil" role="note">
        <i class="fa-solid fa-lock" aria-hidden="true"></i>
        Só a CGOV (2ª Linha) altera o apetite. Para testar, troque o perfil no menu do usuário (canto superior direito).
      </p>

      <ul class="categorias">
        <li v-for="cat in riscosStore.categorias" :key="cat.id" class="categoria">
          <div class="categoria__identificacao">
            <h3 class="categoria__nome">
              {{ cat.nome }}
              <span v-if="cat.nome === 'Integridade'" class="categoria__selo">Integra+</span>
            </h3>
            <p class="categoria__descricao">{{ cat.descricaoNormativa }}</p>
            <p class="categoria__contagem">
              {{ contagemPorCategoria.get(cat.id)?.total ?? 0 }}
              {{ (contagemPorCategoria.get(cat.id)?.total ?? 0) === 1 ? 'risco' : 'riscos' }} ·
              <strong :class="{ 'categoria__criticos': (contagemPorCategoria.get(cat.id)?.criticos ?? 0) > 0 }">
                {{ contagemPorCategoria.get(cat.id)?.criticos ?? 0 }}
                {{ (contagemPorCategoria.get(cat.id)?.criticos ?? 0) === 1 ? 'Crítico' : 'Críticos' }}
              </strong>
            </p>
          </div>

          <div class="categoria__apetite">
            <!-- Rótulo visual; o leitor de tela ouve o nome completo do grupo (prop "rotulo"). -->
            <span class="categoria__rotulo" aria-hidden="true">Apetite</span>
            <SegmentedControl
              :model-value="cat.apetiteDeclarado"
              :opcoes="OPCOES_APETITE"
              :rotulo="`Apetite da categoria ${cat.nome}`"
              :desabilitado="!authStore.isCgov"
              @update:model-value="pedirMudanca(cat, $event)"
            />
            <span class="categoria__limite">{{ ROTULOS_APETITE[cat.apetiteDeclarado].limite }}</span>
          </div>

          <FormField rotulo="Justificativa na DAR" class="categoria__justificativa" v-slot="{ attrs }">
            <input
              v-bind="attrs"
              type="text"
              :value="cat.justificativaDar"
              :disabled="!authStore.isCgov"
              @change="salvarJustificativa(cat, ($event.target as HTMLInputElement).value)"
            />
          </FormField>
        </li>
      </ul>
    </section>

    <!-- INTEGRA+ (recolhível) -->
    <details class="cartao integra">
      <summary class="integra__resumo">
        <span>
          <strong>Programa Integra+</strong> — as 6 subcategorias de Integridade (Quadro 3)
        </span>
        <i class="fa-solid fa-chevron-down integra__seta" aria-hidden="true"></i>
      </summary>
      <p class="integra__texto">
        Se o processo decide sobre <strong>beneficiário, licença/autorização, fiscalização/sanção ou
        contratação/atestação</strong>, aplica-se o Teste de Integridade com uma destas subcategorias.
        A categoria mista "Operacional com interface de Integridade" é proibida.
      </p>
      <ol class="integra__lista">
        <li v-for="sub in SUBCATEGORIAS_INTEGRIDADE_QUADRO_3" :key="sub">{{ sub }}</li>
      </ol>
      <p class="integra__fonte">Portaria ICMBio nº 253/2026.</p>
    </details>

    <!-- RISCOS CRÍTICOS -->
    <section class="cartao" aria-labelledby="titulo-criticos">
      <div class="cartao__cabecalho">
        <div>
          <h2 id="titulo-criticos" class="cartao__titulo">Riscos Críticos agora</h2>
          <p class="cartao__subtitulo">Residual acima do apetite da categoria.</p>
        </div>
        <RouterLink :to="{ name: 'riscos-lista', query: { critico: 'sim' } }" class="link-acao">
          Abrir na lista de Riscos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </RouterLink>
      </div>
      <DataTable
        :colunas="colunasCriticos"
        :linhas="riscosStore.riscosCriticosCarteira"
        chave-linha="id"
        legenda="Riscos Críticos frente à DAR"
        :ordenacao-inicial="{ chave: 'nivelResidual', direcao: 'desc' }"
      >
        <template #celula-codigoRadar="{ linha }">
          <RouterLink :to="{ name: 'ficha-bowtie-detalhe', params: { id: linha.id } }" class="codigo">
            {{ linha.codigoRadar }}
          </RouterLink>
        </template>
        <template #celula-categoriaNome="{ linha }">
          {{ linha.categoriaNome }} <span class="texto-apoio">· apetite {{ apetiteDaCategoria(linha.categoriaId) }}</span>
        </template>
        <template #celula-nivelResidual="{ linha }">
          <RiskBadge :classe="linha.classificacaoResidual" :valor="linha.nivelResidual" tamanho="sm" />
        </template>
        <template #vazio>
          <EmptyState
            titulo="Nenhum risco Crítico"
            descricao="Todos os riscos estão dentro do apetite declarado."
            icone="fa-regular fa-circle-check"
          />
        </template>
      </DataTable>
    </section>

    </EstadoCarregamento>

    <!-- PRÉVIA E CONFIRMAÇÃO -->
    <Dialog
      :aberto="pedido !== null"
      :titulo="pedido ? `Mudar o apetite de ${pedido.categoria.nome}?` : ''"
      @fechar="pedido = null"
    >
      <template v-if="pedido">
        <p class="previa__de-para">
          <strong>{{ ROTULOS_APETITE[pedido.de].rotulo }}</strong>
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          <span class="radar-so-leitor">para</span>
          <strong>{{ ROTULOS_APETITE[pedido.para].rotulo }}</strong>
          <span class="texto-apoio">({{ ROTULOS_APETITE[pedido.para].limite }})</span>
        </p>
        <p class="previa__resumo">{{ resumirImpactoDar(pedido.impacto) }}</p>
        <ul v-if="pedido.impacto.passamACriticos.length || pedido.impacto.deixamDeSerCriticos.length" class="previa__lista">
          <li v-for="m in pedido.impacto.passamACriticos" :key="m.risco.id">
            <i class="fa-solid fa-triangle-exclamation previa__sobe" aria-hidden="true"></i>
            <span class="codigo">{{ m.risco.codigoRadar }}</span> passa a ser Crítico
            <span class="texto-apoio">(residual {{ m.risco.classificacaoResidual }})</span>
          </li>
          <li v-for="m in pedido.impacto.deixamDeSerCriticos" :key="m.risco.id">
            <i class="fa-solid fa-circle-check previa__desce" aria-hidden="true"></i>
            <span class="codigo">{{ m.risco.codigoRadar }}</span> deixa de ser Crítico
            <span class="texto-apoio">(residual {{ m.risco.classificacaoResidual }})</span>
          </li>
        </ul>
      </template>
      <template #acoes>
        <BrButton variant="secondary" @click="pedido = null">Cancelar</BrButton>
        <BrButton variant="primary" @click="confirmarMudanca">Mudar apetite</BrButton>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.dar {
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

.dar__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--esp-4);
}

/* --- Cartão genérico (mesmo padrão do Painel) --- */
.cartao {
  padding: var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.cartao__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--esp-2);
  margin-bottom: var(--esp-4);
}

.cartao__titulo {
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.cartao__subtitulo {
  margin: var(--esp-1) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.link-acao {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-link);
  text-decoration: none;
}

.link-acao:hover {
  text-decoration: underline;
}

.codigo {
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
  white-space: nowrap;
}

.texto-apoio {
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.aviso-perfil {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0 0 var(--esp-4);
  padding: var(--esp-2) var(--esp-3);
  background: var(--superficie-container);
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

/* --- Lista de categorias: 3 colunas no computador, empilhada no celular --- */
.categorias {
  margin: 0;
  padding: 0;
  list-style: none;
}

.categoria {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) auto minmax(0, 1fr);
  gap: var(--esp-3) var(--esp-5);
  align-items: start;
  padding: var(--esp-4) 0;
  border-top: 1px solid var(--borda);
}

.categoria:first-child {
  border-top: 0;
  padding-top: 0;
}

.categoria__identificacao {
  min-width: 0;
}

.categoria__nome {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  font-size: var(--texto-md);
  font-weight: var(--peso-forte);
}

.categoria__selo {
  padding: 0 var(--esp-2);
  border-radius: var(--raio-pilula);
  background: var(--cor-primaria-suave);
  color: var(--cor-sobre-primaria-suave);
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
}

.categoria__descricao,
.categoria__contagem {
  margin: var(--esp-1) 0 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.categoria__criticos {
  color: var(--cor-perigo);
}

.categoria__apetite {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
}

.categoria__rotulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.categoria__limite {
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

/* --- Integra+ recolhível --- */
.integra {
  padding: 0;
}

.integra__resumo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  min-height: var(--alvo-minimo);
  padding: var(--esp-4) var(--esp-5);
  cursor: pointer;
  list-style: none;
}

.integra__resumo::-webkit-details-marker {
  display: none;
}

.integra[open] .integra__seta {
  transform: rotate(180deg);
}

.integra__texto,
.integra__lista,
.integra__fonte {
  margin: 0 var(--esp-5) var(--esp-3);
  font-size: var(--texto-sm);
}

.integra__lista {
  padding-left: var(--esp-5);
}

.integra__fonte {
  margin-bottom: var(--esp-5);
  color: var(--texto-secundario);
}

/* --- Prévia no diálogo --- */
.previa__de-para {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin: 0 0 var(--esp-3);
}

.previa__resumo {
  margin: 0 0 var(--esp-2);
  font-weight: var(--peso-semi);
}

.previa__lista {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
}

.previa__sobe { color: var(--cor-perigo); }
.previa__desce { color: var(--cor-sucesso); }

@media (max-width: 1180px) {
  .dar__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .categoria {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .categoria__justificativa {
    grid-column: 1 / -1;
  }
}

@media (max-width: 639.98px) {
  .categoria {
    grid-template-columns: minmax(0, 1fr);
  }
  .cartao {
    padding: var(--esp-4);
  }
  .dar__kpis {
    gap: var(--esp-3);
  }
}
</style>
