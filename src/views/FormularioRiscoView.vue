<script setup lang="ts">
/**
 * ============================================================================
 * NOVO RISCO / EDITAR RISCO (`FormularioRiscoView.vue`) — assistente em 4 etapas
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O cadastro segue o ciclo da Metodologia RADAR, uma etapa por vez:
 *   1. Identificação (objeto de gestão + Bow Tie: causas → evento → consequências → objetivo)
 *   2. Categoria (Quadro 2) e Teste de Integridade (Integra+, Quadro 3)
 *   3. Análise: Probabilidade, Impacto e controle (Quadros 4 a 8)
 *   4. Tratamento: estratégia, ação 5W2H e indicador (KRI)
 *
 * A MESMA tela serve para dois usos (Etapa B3):
 *   - `/riscos/novo`               → risco NOVO. O objeto de gestão é escolhido
 *     num seletor que só mostra os objetos em que a pessoa pode gravar
 *     (`store.objetosOndeGravo()`, quem decide é o RADAR).
 *   - `/riscos/novo?editar=<id>`   → EDITAR a ficha de um risco que já existe.
 *     O formulário chega preenchido; só grava se o RADAR liberar
 *     (`store.acoes[id].podeEditar`). Editar um risco APROVADO o devolve para
 *     validação da chefia (o aviso aparece antes de salvar).
 *
 * Ao lado (embaixo, no celular) fica a PRÉVIA: a frase padronizada da Seção
 * 4.2.1 e a conta Inerente × Fator = Residual feita pela calculadora oficial.
 * É só uma PRÉVIA: o valor oficial é calculado pelo RADAR ao salvar.
 *
 * Gravar: "Salvar rascunho" grava; "Salvar e enviar" grava e, em seguida,
 * envia para validação. Enquanto grava, os botões ficam desligados e com
 * `aria-busy="true"` — um duplo clique NÃO cria dois riscos.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import { ErroRadar, traduzirErroBanco } from '../services/dados/errosBanco';
import type { EstrategiaTratamento, FichaRisco, NivelEficaciaControle, StatusFluxoRisco } from '../types/radar.types';
import {
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
} from '../utils/calculadoraRiscoRadar';
import {
  ETAPAS_NOVO_RISCO,
  dadosDeRisco,
  dadosExemplo,
  dadosParaFicha,
  dadosVazios,
  validarEtapa,
  type ErrosEtapa,
} from '../utils/formularioRisco';
import { ROTULOS_APETITE } from '../utils/darImpacto';
import FormField from '../components/ui/FormField.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import EstadoCarregamento from '../components/ui/EstadoCarregamento.vue';
import BrStep from '../components/govbr/BrStep.vue';
import BrButton from '../components/govbr/BrButton.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const route = useRoute();
const router = useRouter();
const riscosStore = useRiscosStore();
const { mostrar } = useToast();

const etapa = ref(1);
const d = ref(dadosVazios());
const erros = ref<ErrosEtapa>({});
const formulario = ref<HTMLElement | null>(null);

// ---------------------------------------------------------------------------
// MODO EDIÇÃO (`?editar=<id>`)
// ---------------------------------------------------------------------------
/** Id do risco em edição, ou null quando é um risco novo. */
const idEdicao = computed(() => {
  const v = route.query.editar;
  return typeof v === 'string' && v ? v : null;
});
const modoEdicao = computed(() => idEdicao.value !== null);

/** O risco em edição, como está na memória da store (undefined = não achado / fora do alcance). */
const riscoEditado = computed<FichaRisco | undefined>(() =>
  idEdicao.value ? riscosStore.riscos.find((r) => r.id === idEdicao.value) : undefined
);

/**
 * Pode gravar? Risco novo: sim. Edição: só se o RADAR disse `podeEditar`.
 * Ex.: risco em homologação → podeEditar=false → botões desligados + motivo.
 */
const podeSalvar = computed(() => !modoEdicao.value || riscosStore.acoes[idEdicao.value!]?.podeEditar === true);
const motivoBloqueio = computed(() =>
  podeSalvar.value ? null : riscosStore.acoes[idEdicao.value!]?.motivo ?? 'Este risco não pode ser editado agora.'
);

/** Na edição, "Salvar e enviar" só faz sentido para quem ainda não foi enviado. */
const SITUACOES_ENVIAVEIS: StatusFluxoRisco[] = ['rascunho', 'devolvido'];
const oferecerEnvio = computed(() => !modoEdicao.value || (!!riscoEditado.value && SITUACOES_ENVIAVEIS.includes(riscoEditado.value.statusFluxo)));
const editandoAprovado = computed(() => riscoEditado.value?.statusFluxo === 'aprovado');

/**
 * Apagar o nome do 1º KRI tira o KRI da ficha — e, no banco, as MEDIÇÕES dele
 * vão junto (exclusão em cascata). Se houver medições, a pessoa precisa
 * confirmar antes de salvar.
 * Ex.: KRI com 3 medições e campo "Indicador" vazio → medicoesQueSeraoApagadas = 3.
 */
const medicoesQueSeraoApagadas = computed(() => {
  const kri = riscoEditado.value?.kris[0];
  if (!modoEdicao.value || !kri || d.value.nomeKri.trim()) return 0;
  return kri.medicoes.length;
});
const confirmaApagarMedicoes = ref(false);
const avisoMedicoes = computed(() => {
  const n = medicoesQueSeraoApagadas.value;
  return `Este KRI tem ${n} ${n === 1 ? 'medição registrada' : 'medições registradas'}; ao salvar sem ele, o histórico será apagado.`;
});
// Voltou a preencher o nome: a confirmação antiga não vale mais.
watch(medicoesQueSeraoApagadas, (n) => { if (!n) confirmaApagarMedicoes.value = false; });

/** Nome do objeto (na edição o objeto não muda: aparece só para leitura). */
const nomeObjetoEditado = computed(() => {
  const r = riscoEditado.value;
  if (!r) return '';
  return riscosStore.objetosContexto.find((o) => o.id === r.objetoId)?.nomeObjeto ?? r.nomeObjetoCache ?? r.objetoId;
});

// Preenche o formulário UMA vez por risco (a releitura depois de salvar não
// apaga o que a pessoa está vendo).
const preenchidoCom = ref<string | null>(null);
watch(
  riscoEditado,
  (r) => {
    if (r && preenchidoCom.value !== r.id) {
      d.value = dadosDeRisco(r);
      erros.value = {};
      etapa.value = 1;
      preenchidoCom.value = r.id;
    }
  },
  { immediate: true }
);

// ---------------------------------------------------------------------------
// OBJETOS EM QUE A PESSOA GRAVA (só no risco novo)
// ---------------------------------------------------------------------------
const idsPermitidos = ref<string[] | null>(null);
const estadoObjetos = ref<'carregando' | 'erro' | 'pronto'>('carregando');
const erroObjetos = ref<ErroRadar | null>(null);

async function carregarObjetos(): Promise<void> {
  estadoObjetos.value = 'carregando';
  erroObjetos.value = null;
  try {
    idsPermitidos.value = await riscosStore.objetosOndeGravo();
    estadoObjetos.value = 'pronto';
  } catch (e) {
    erroObjetos.value = e instanceof ErroRadar ? e : traduzirErroBanco(e);
    estadoObjetos.value = 'erro';
  }
}

/**
 * Opções do seletor: SÓ os ids que o RADAR devolveu, com o nome do objeto.
 * Ex.: objetosOndeGravo() = ['obj-1'] → um único item, mesmo que a carteira
 * tenha 10 objetos (os outros a pessoa só pode ler).
 */
const opcoesObjeto = computed(() =>
  (idsPermitidos.value ?? [])
    .map((id) => riscosStore.objetosContexto.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o)
);

onMounted(() => {
  if (!modoEdicao.value) carregarObjetos();
});
// Mesma tela reaproveitada pelo roteador (ex.: de "Editar" para "Novo risco"):
// recomeça do zero.
watch(idEdicao, (novo, antigo) => {
  if (novo === antigo) return;
  preenchidoCom.value = null;
  d.value = dadosVazios();
  erros.value = {};
  etapa.value = 1;
  if (!novo && idsPermitidos.value === null) carregarObjetos();
});

// ---------------------------------------------------------------------------
// SITUAÇÃO DA PÁGINA (carregando / erro / pronta / não encontrado / vazia)
// ---------------------------------------------------------------------------
const estadoPagina = computed<'carregando' | 'erro' | 'pronto'>(() => {
  if (riscosStore.estado === 'erro') return 'erro';
  if (riscosStore.estado !== 'pronto') return 'carregando';
  if (!modoEdicao.value) return estadoObjetos.value;
  return 'pronto';
});
const erroPagina = computed(() => (riscosStore.estado === 'erro' ? riscosStore.erro : erroObjetos.value));
function tentarDeNovo(): void {
  if (riscosStore.estado === 'erro') riscosStore.tentarDeNovo();
  else carregarObjetos();
}

const naoEncontrado = computed(() => modoEdicao.value && estadoPagina.value === 'pronto' && !riscoEditado.value);
const semObjetos = computed(() => !modoEdicao.value && estadoPagina.value === 'pronto' && opcoesObjeto.value.length === 0);

/** Título da página. Ex.: "Editar risco RADAR-2026-003". */
const titulo = computed(() => {
  if (!modoEdicao.value) return (route.meta.titulo as string | undefined) ?? 'Novo risco';
  if (naoEncontrado.value) return 'Risco não encontrado';
  return riscoEditado.value ? `Editar risco ${riscoEditado.value.codigoRadar}` : 'Editar risco';
});
const descricao = computed(() =>
  modoEdicao.value ? 'Altere a ficha nas mesmas 4 etapas do cadastro.' : (route.meta.descricao as string | undefined)
);
// A aba do navegador acompanha o título (o roteador só conhece "Novo risco").
watch(titulo, (t) => { document.title = `${t} · RADAR | ICMBio`; });

// ---------------------------------------------------------------------------
// OPÇÕES DOS CAMPOS (escalas da Metodologia)
// ---------------------------------------------------------------------------
const PROBABILIDADES = [
  { valor: 1, rotulo: '1 — Muito baixa (menos de 10%)' },
  { valor: 2, rotulo: '2 — Baixa (10% a 30%)' },
  { valor: 3, rotulo: '3 — Média (31% a 60%)' },
  { valor: 4, rotulo: '4 — Alta (61% a 90%)' },
  { valor: 5, rotulo: '5 — Muito alta (mais de 90%)' },
] as const;
const IMPACTOS = [
  { valor: 1, rotulo: '1 — Muito baixo' },
  { valor: 2, rotulo: '2 — Baixo' },
  { valor: 3, rotulo: '3 — Médio' },
  { valor: 4, rotulo: '4 — Alto' },
  { valor: 5, rotulo: '5 — Muito alto' },
] as const;
const EFICACIAS: { valor: NivelEficaciaControle; rotulo: string }[] = [
  { valor: 'Inexistente', rotulo: 'Inexistente (fator 1,0)' },
  { valor: 'Fraco', rotulo: 'Fraco (fator 0,9)' },
  { valor: 'Mediano', rotulo: 'Mediano (fator 0,75)' },
  { valor: 'Satisfatório', rotulo: 'Satisfatório (fator 0,6)' },
  { valor: 'Forte', rotulo: 'Forte (fator 0,5)' },
];
const ESTRATEGIAS: { valor: EstrategiaTratamento; rotulo: string }[] = [
  { valor: 'Mitigar', rotulo: 'Mitigar — reduzir a probabilidade ou o impacto' },
  { valor: 'Compartilhar', rotulo: 'Compartilhar — dividir com terceiros' },
  { valor: 'Evitar', rotulo: 'Evitar — deixar de fazer a atividade' },
  { valor: 'Aceitar', rotulo: 'Aceitar — conviver com o risco (sem ação)' },
];

const categoria = computed(() => riscosStore.categorias.find((c) => c.id === d.value.categoriaId));
const ehIntegridade = computed(() => categoria.value?.nome === 'Integridade');

// Só a categoria Integridade tem subcategoria (Quadro 3). Se a pessoa escolheu
// "Nepotismo" e depois trocou para "Operacional", a subcategoria antiga não
// pode ficar escondida no formulário (nem voltar sozinha se ela retornar a
// Integridade, nem ir parar no banco): zeramos o campo ao sair de Integridade.
watch(ehIntegridade, (ehAgora) => {
  if (!ehAgora) d.value.subcategoriaIntegridade = '';
});

// ---------------------------------------------------------------------------
// PRÉVIA (calculadora oficial — o valor oficial vem do RADAR ao salvar)
// ---------------------------------------------------------------------------
const frase = computed(() =>
  gerarSintaxePadraoRisco({
    causas: d.value.causas || '[causas]',
    eventoRisco: d.value.evento || '[evento de risco]',
    consequencias: d.value.consequencias || '[consequências]',
    objetivoAfetado: d.value.objetivo || '[objetivo afetado]',
  })
);

const calculo = computed(() => {
  if (!d.value.probabilidade || !d.value.impacto) return null;
  return calcularRiscoCompletoRadar({
    probabilidade: d.value.probabilidade,
    impacto: d.value.impacto,
    eficaciaControle: d.value.eficacia,
    possuiEvidenciaComprovada: d.value.possuiEvidencia,
    apetiteCategoria: categoria.value?.apetiteDeclarado ?? 'pendente_dar',
  });
});

// ---------------------------------------------------------------------------
// NAVEGAÇÃO ENTRE ETAPAS
// ---------------------------------------------------------------------------
async function focarPrimeiroErro(): Promise<void> {
  await nextTick();
  formulario.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

function validar(): boolean {
  erros.value = validarEtapa(etapa.value, d.value, riscosStore.categorias);
  if (Object.keys(erros.value).length) {
    focarPrimeiroErro();
    return false;
  }
  return true;
}

async function continuar(): Promise<void> {
  if (!validar()) return;
  etapa.value++;
  erros.value = {};
  await nextTick();
  formulario.value?.querySelector<HTMLElement>('h2')?.focus();
}

function voltar(): void {
  erros.value = {};
  etapa.value = Math.max(1, etapa.value - 1);
}

function preencherExemplo(): void {
  // O exemplo usa o objeto já escolhido, ou o 1º em que a pessoa pode gravar.
  d.value = dadosExemplo(d.value.objetoId || opcoesObjeto.value[0]?.id || '');
  erros.value = {};
  mostrar({ tom: 'info', mensagem: 'Formulário preenchido com um exemplo de demonstração.' });
}

/** "Enviar" do formulário (Enter ou botão principal): avança ou, na etapa 4, grava. */
function aoEnviarFormulario(): void {
  if (etapa.value < 4) continuar();
  else salvar(oferecerEnvio.value);
}

// ---------------------------------------------------------------------------
// SALVAR
// ---------------------------------------------------------------------------
/** true enquanto a gravação está em andamento (trava o duplo clique). */
const salvando = ref(false);

async function salvar(enviar: boolean): Promise<void> {
  // Já gravando (duplo clique) ou o RADAR não libera a edição: nada a fazer.
  if (salvando.value || !podeSalvar.value) return;

  // Ao enviar — ou ao editar um risco que já passou do rascunho (ex.: aprovado,
  // que volta para validação) — TODAS as etapas precisam estar válidas.
  // Um rascunho só precisa da 1ª.
  const status = riscoEditado.value?.statusFluxo;
  const fichaCompleta = enviar || (modoEdicao.value && !!status && !['rascunho', 'devolvido', 'preliminar_cgov'].includes(status));
  const etapasParaValidar = fichaCompleta ? [1, 2, 3, 4] : [1];
  for (const n of etapasParaValidar) {
    const e = validarEtapa(n, d.value, riscosStore.categorias);
    if (Object.keys(e).length) {
      etapa.value = n;
      erros.value = e;
      focarPrimeiroErro();
      mostrar({ tom: 'perigo', mensagem: `Corrija a etapa ${n} (${ETAPAS_NOVO_RISCO[n - 1].titulo}) antes de ${enviar ? 'enviar' : 'salvar'}.` });
      return;
    }
  }

  // KRI com medições sendo retirado: só com confirmação explícita.
  if (medicoesQueSeraoApagadas.value > 0 && !confirmaApagarMedicoes.value) {
    etapa.value = 4;
    await nextTick();
    formulario.value?.querySelector<HTMLElement>('#confirma-apagar-medicoes')?.focus();
    mostrar({ tom: 'perigo', mensagem: 'Confirme que o histórico de medições do KRI pode ser apagado, ou preencha o nome do indicador.' });
    return;
  }

  // A partir daqui a tela está "ocupada": os botões desligam na hora
  // (antes de qualquer `await`), então o 2º clique cai no `return` acima.
  salvando.value = true;
  try {
    const dadosDaFicha = dadosParaFicha(d.value, { ehIntegridade: ehIntegridade.value, existente: riscoEditado.value });

    // PASSO 1 — gravar. Se a fonte recusar, a mensagem já vem em português
    // claro e a pessoa continua no formulário (nada foi criado).
    let ficha: FichaRisco;
    try {
      ficha = await riscosStore.salvarOuAtualizarRisco(dadosDaFicha);
    } catch (e) {
      mostrar({ tom: 'perigo', mensagem: (e as Error).message });
      // Erro de "estado" (ficha travada, controle removido por outra pessoa...):
      // relemos o risco para `podeEditar` e o motivo refletirem a situação atual.
      if ((e as { tipo?: string }).tipo === 'estado' && idEdicao.value) void riscosStore.relerRiscos([idEdicao.value]);
      return;
    }

    // PASSO 2 — enviar (só em "Salvar e enviar"). O risco JÁ EXISTE: se o envio
    // for recusado, NÃO ficamos no formulário (apertar de novo criaria um
    // segundo risco). Levamos a pessoa à ficha, de onde ela tenta enviar de novo.
    // Ex.: "Rascunho salvo (RADAR-2026-004), mas não foi enviado: Esta unidade não tem chefia…"
    if (enviar) {
      try {
        await riscosStore.submeterParaValidacaoCg(ficha.id);
      } catch (e) {
        mostrar({ tom: 'aviso', mensagem: `Rascunho salvo (${ficha.codigoRadar}), mas não foi enviado: ${(e as Error).message}` });
        router.push({ name: 'ficha-bowtie-detalhe', params: { id: ficha.id } });
        return;
      }
    }

    let mensagem: string;
    if (enviar) mensagem = `${ficha.codigoRadar} enviado para validação da Coordenação-Geral.`;
    else if (!modoEdicao.value) mensagem = `${ficha.codigoRadar} salvo como rascunho.`;
    // Só avisa da reabertura se, DEPOIS da releitura, o risco deixou mesmo de estar aprovado
    // (salvar sem mudar nada não reabre a validação).
    else if (status === 'aprovado' && ficha.statusFluxo !== 'aprovado') mensagem = `${ficha.codigoRadar} salvo. O risco voltou para validação da chefia.`;
    else mensagem = `${ficha.codigoRadar} salvo.`;
    mostrar({ tom: 'sucesso', mensagem });
    router.push({ name: 'ficha-bowtie-detalhe', params: { id: ficha.id } });
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <div class="novo">
    <!-- A página desenha o próprio cabeçalho: o título muda na edição ("Editar risco RADAR-2026-003"). -->
    <PageHeader :titulo="titulo" :descricao="descricao" :fundamento="(route.meta.fundamento as string | undefined)" />

    <EstadoCarregamento :estado="estadoPagina" :erro="erroPagina" @tentar-de-novo="tentarDeNovo">
      <!-- Edição de um risco que não existe (ou fora do alcance): sem dizer qual dos dois. -->
      <EmptyState
        v-if="naoEncontrado"
        titulo="Este risco não existe ou você não tem acesso a ele."
        icone="fa-solid fa-magnifying-glass"
      >
        <template #acoes>
          <RouterLink :to="{ name: 'riscos-lista' }" class="br-button secondary">Voltar para a lista de riscos</RouterLink>
        </template>
      </EmptyState>

      <!-- Risco novo, mas a pessoa não grava em nenhum objeto. -->
      <EmptyState
        v-else-if="semObjetos"
        titulo="Nenhum objeto de gestão disponível"
        descricao="Você ainda não tem objeto de gestão em que possa criar riscos. Procure a CGOV."
      />

      <template v-else>
        <BrMessage v-if="motivoBloqueio" state="warning" titulo="Edição indisponível">{{ motivoBloqueio }}</BrMessage>
        <BrMessage v-else-if="editandoAprovado" state="info">Ao salvar, o risco volta para validação da chefia.</BrMessage>

        <div class="novo__topo">
          <BrStep v-model:passo-ativo="etapa" :passos="ETAPAS_NOVO_RISCO" />
          <button v-if="!modoEdicao" type="button" class="link-botao" @click="preencherExemplo">Preencher com exemplo (demonstração)</button>
        </div>

        <div class="novo__grade">
          <!-- FORMULÁRIO DA ETAPA -->
          <form ref="formulario" class="cartao formulario" novalidate @submit.prevent="aoEnviarFormulario">
            <!-- ETAPA 1 -->
            <fieldset v-if="etapa === 1" class="etapa">
              <h2 class="etapa__titulo" tabindex="-1">Identificação</h2>
              <p class="etapa__ajuda">Descreva o risco como um "Bow Tie": o que causa, o que pode acontecer e o que isso provoca.</p>
              <!-- Na edição o objeto não muda (aparece só para leitura). -->
              <FormField v-if="modoEdicao" rotulo="Objeto de gestão" ajuda="Na edição, o objeto de gestão não muda." v-slot="{ attrs }">
                <input v-bind="attrs" :value="nomeObjetoEditado" type="text" readonly />
              </FormField>
              <!-- Risco novo: só os objetos em que a pessoa pode gravar (quem decide é o RADAR). -->
              <FormField v-else rotulo="Objeto de gestão" ajuda="O processo, projeto ou unidade onde o risco está." :erro="erros.objetoId" obrigatorio v-slot="{ attrs }">
                <select v-bind="attrs" v-model="d.objetoId">
                  <option value="" disabled>Escolha…</option>
                  <option v-for="o in opcoesObjeto" :key="o.id" :value="o.id">{{ o.nomeObjeto }}</option>
                </select>
              </FormField>
              <FormField rotulo="Responsável pelo risco (1ª Linha)" ajuda="Opcional. Ex.: Chefe da unidade." v-slot="{ attrs }">
                <input v-bind="attrs" v-model="d.responsavel" type="text" />
              </FormField>
              <FormField rotulo="Causas" ajuda="Devido a… (o que pode provocar o evento)" :erro="erros.causas" obrigatorio v-slot="{ attrs }">
                <textarea v-bind="attrs" v-model="d.causas" rows="2"></textarea>
              </FormField>
              <FormField rotulo="Evento de risco" ajuda="…poderá ocorrer… (o que pode acontecer)" :erro="erros.evento" obrigatorio v-slot="{ attrs }">
                <textarea v-bind="attrs" v-model="d.evento" rows="2"></textarea>
              </FormField>
              <FormField rotulo="Consequências" ajuda="…ocasionando… (o que isso provoca)" :erro="erros.consequencias" obrigatorio v-slot="{ attrs }">
                <textarea v-bind="attrs" v-model="d.consequencias" rows="2"></textarea>
              </FormField>
              <FormField rotulo="Objetivo afetado" ajuda="…impactando o alcance de… (qual objetivo do ICMBio)" :erro="erros.objetivo" obrigatorio v-slot="{ attrs }">
                <input v-bind="attrs" v-model="d.objetivo" type="text" />
              </FormField>
            </fieldset>

            <!-- ETAPA 2 -->
            <fieldset v-else-if="etapa === 2" class="etapa">
              <h2 class="etapa__titulo" tabindex="-1">Categoria</h2>
              <p class="etapa__ajuda">Escolha uma das 8 categorias oficiais. Não existe categoria mista.</p>
              <FormField rotulo="Categoria (Quadro 2)" :erro="erros.categoriaId" obrigatorio v-slot="{ attrs }">
                <select v-bind="attrs" v-model.number="d.categoriaId">
                  <option :value="null" disabled>Escolha…</option>
                  <option v-for="c in riscosStore.categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
                </select>
              </FormField>
              <p v-if="categoria" class="etapa__ajuda">
                {{ categoria.descricaoNormativa }} Apetite na DAR: <strong>{{ ROTULOS_APETITE[categoria.apetiteDeclarado].rotulo }}</strong>
                ({{ ROTULOS_APETITE[categoria.apetiteDeclarado].limite }}).
              </p>

              <FormField v-if="ehIntegridade" rotulo="Subcategoria de Integridade (Quadro 3)" :erro="erros.subcategoriaIntegridade" obrigatorio v-slot="{ attrs }">
                <select v-bind="attrs" v-model="d.subcategoriaIntegridade">
                  <option value="" disabled>Escolha…</option>
                  <option v-for="s in SUBCATEGORIAS_INTEGRIDADE_QUADRO_3" :key="s" :value="s">{{ s }}</option>
                </select>
              </FormField>

              <template v-else-if="categoria">
                <label class="marcar">
                  <input v-model="d.decideSobreTerceiros" type="checkbox" />
                  <span>O processo decide sobre <strong>beneficiário, licença/autorização, fiscalização/sanção ou contratação/atestação</strong>?</span>
                </label>
                <FormField
                  v-if="d.decideSobreTerceiros"
                  rotulo="Por que não é risco de Integridade?"
                  ajuda="Teste de Integridade (Integra+). Se houver chance de favorecimento ou desvio ético, volte e escolha a categoria Integridade."
                  :erro="erros.justificativaNaoIntegridade"
                  obrigatorio
                  v-slot="{ attrs }"
                >
                  <textarea v-bind="attrs" v-model="d.justificativaNaoIntegridade" rows="3"></textarea>
                </FormField>
              </template>
            </fieldset>

            <!-- ETAPA 3 -->
            <fieldset v-else-if="etapa === 3" class="etapa">
              <h2 class="etapa__titulo" tabindex="-1">Análise</h2>
              <p class="etapa__ajuda">A nota inerente vem da tabela do Quadro 7 — o impacto pesa mais que a probabilidade.</p>
              <div class="duas-colunas">
                <FormField rotulo="Probabilidade" :erro="erros.probabilidade" obrigatorio v-slot="{ attrs }">
                  <select v-bind="attrs" v-model.number="d.probabilidade">
                    <option :value="null" disabled>Escolha…</option>
                    <option v-for="o in PROBABILIDADES" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
                  </select>
                </FormField>
                <FormField rotulo="Impacto" :erro="erros.impacto" obrigatorio v-slot="{ attrs }">
                  <select v-bind="attrs" v-model.number="d.impacto">
                    <option :value="null" disabled>Escolha…</option>
                    <option v-for="o in IMPACTOS" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
                  </select>
                </FormField>
              </div>
              <FormField rotulo="Eficácia do controle existente (Quadro 6)" v-slot="{ attrs }">
                <select v-bind="attrs" v-model="d.eficacia">
                  <option v-for="o in EFICACIAS" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
                </select>
              </FormField>
              <template v-if="d.eficacia !== 'Inexistente'">
                <FormField rotulo="Controle que existe hoje" :erro="erros.descricaoControle" obrigatorio v-slot="{ attrs }">
                  <textarea v-bind="attrs" v-model="d.descricaoControle" rows="2"></textarea>
                </FormField>
                <label class="marcar">
                  <input v-model="d.possuiEvidencia" type="checkbox" />
                  <span>Há <strong>evidência comprovada</strong> de que o controle funciona</span>
                </label>
                <FormField v-if="d.possuiEvidencia" rotulo="Onde está a evidência" ajuda="Ex.: processo SEI nº…, relatório trimestral." :erro="erros.evidenciaControle" obrigatorio v-slot="{ attrs }">
                  <input v-bind="attrs" v-model="d.evidenciaControle" type="text" />
                </FormField>
              </template>
            </fieldset>

            <!-- ETAPA 4 -->
            <fieldset v-else class="etapa">
              <h2 class="etapa__titulo" tabindex="-1">Tratamento</h2>
              <p class="etapa__ajuda">O plano de ação segue o 5W2H. Você pode completar os detalhes depois, na ficha.</p>
              <FormField rotulo="Estratégia" v-slot="{ attrs }">
                <select v-bind="attrs" v-model="d.estrategia">
                  <option v-for="o in ESTRATEGIAS" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
                </select>
              </FormField>
              <template v-if="d.estrategia !== 'Aceitar'">
                <FormField rotulo="Ação — o quê" :erro="erros.acaoOQue" obrigatorio v-slot="{ attrs }">
                  <textarea v-bind="attrs" v-model="d.acaoOQue" rows="2"></textarea>
                </FormField>
                <div class="duas-colunas">
                  <FormField rotulo="Responsável — quem" :erro="erros.acaoQuem" obrigatorio v-slot="{ attrs }">
                    <input v-bind="attrs" v-model="d.acaoQuem" type="text" />
                  </FormField>
                  <FormField rotulo="Prazo — quando" :erro="erros.acaoPrazo" obrigatorio v-slot="{ attrs }">
                    <input v-bind="attrs" v-model="d.acaoPrazo" type="date" />
                  </FormField>
                </div>
              </template>
              <FormField rotulo="Indicador de acompanhamento (KRI)" ajuda="Opcional. Ex.: % de processos com checklist assinado." v-slot="{ attrs }">
                <input v-bind="attrs" v-model="d.nomeKri" type="text" />
              </FormField>
              <!-- Edição: tirar o KRI apaga as medições dele (aviso + confirmação obrigatória). -->
              <template v-if="medicoesQueSeraoApagadas > 0">
                <BrMessage state="warning" titulo="Histórico do KRI">{{ avisoMedicoes }}</BrMessage>
                <label class="marcar">
                  <input id="confirma-apagar-medicoes" v-model="confirmaApagarMedicoes" type="checkbox" />
                  <span>Entendo que as medições serão apagadas e quero salvar sem este KRI.</span>
                </label>
              </template>
            </fieldset>

            <!-- AÇÕES -->
            <div class="formulario__acoes">
              <BrButton v-if="etapa > 1" variant="secondary" icon="fa-solid fa-arrow-left" @click="voltar">Voltar</BrButton>
              <span class="formulario__espaco"></span>
              <!-- Durante a gravação: desligados e com aria-busy (o leitor de tela anuncia "ocupado"). -->
              <BrButton variant="secondary" :disabled="salvando || !podeSalvar" :aria-busy="salvando" @click="salvar(false)">
                {{ modoEdicao ? 'Salvar alterações' : 'Salvar rascunho' }}
              </BrButton>
              <BrButton v-if="etapa < 4" variant="primary" type="submit">Continuar</BrButton>
              <BrButton
                v-else-if="oferecerEnvio"
                variant="primary"
                icon="fa-solid fa-paper-plane"
                type="submit"
                :disabled="salvando || !podeSalvar"
                :aria-busy="salvando"
              >Salvar e enviar</BrButton>
            </div>
          </form>

          <!-- PRÉVIA AO VIVO -->
          <aside class="cartao previa" aria-labelledby="titulo-previa">
            <h2 id="titulo-previa" class="previa__titulo">Prévia</h2>
            <h3 class="previa__subtitulo">Descrição padronizada (Seção 4.2.1)</h3>
            <p class="previa__frase">{{ frase }}</p>
            <h3 class="previa__subtitulo">A conta</h3>
            <p class="previa__aviso">Prévia — o valor oficial é calculado pelo RADAR ao salvar</p>
            <MemoriaCalculoBar
              v-if="calculo && d.probabilidade && d.impacto"
              :probabilidade="d.probabilidade"
              :impacto="d.impacto"
              :nivel-inerente="calculo.nivelInerente"
              :classificacao-inerente="calculo.classificacaoInerente"
              :eficacia-controle="calculo.eficaciaFinal"
              :fator-controle="calculo.fatorFinal"
              :possui-evidencia="d.possuiEvidencia"
              :nivel-residual="calculo.nivelResidual"
              :classificacao-residual="calculo.classificacaoResidual"
              :status-critico="calculo.statusCritico"
              :trava-acionada="calculo.travaEvidenciaAcionada"
            />
            <p v-else class="previa__vazia">Escolha probabilidade e impacto na etapa 3 para ver a conta.</p>
          </aside>
        </div>
      </template>
    </EstadoCarregamento>
  </div>
</template>

<style scoped>
.novo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.novo__topo {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
}

.link-botao {
  align-self: flex-end;
  min-height: var(--alvo-minimo);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--texto-link);
  font: inherit;
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  text-decoration: underline;
  cursor: pointer;
}

/* Formulário (3/5) + prévia (2/5); a prévia acompanha a rolagem no computador. */
.novo__grade {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--esp-4);
  align-items: start;
}

.cartao {
  padding: var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.formulario {
  min-width: 0;
}

.etapa {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.etapa__titulo {
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.etapa__titulo:focus {
  outline: none;
}

.etapa__ajuda {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.duas-colunas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--esp-4);
}

.marcar {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-2);
  min-height: var(--alvo-minimo);
  font-size: var(--texto-sm);
}

.marcar input {
  margin-top: 3px;
}

.formulario__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin-top: var(--esp-5);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--borda);
}

.formulario__espaco {
  flex: 1;
}

.previa {
  position: sticky;
  top: calc(var(--altura-cabecalho) + var(--esp-4));
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
}

.previa__titulo {
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.previa__subtitulo {
  margin: var(--esp-2) 0 0;
  font-size: var(--texto-xs);
  font-weight: var(--peso-forte);
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.previa__frase {
  margin: 0;
  font-size: var(--texto-sm);
  line-height: 1.55;
}

.previa__aviso {
  margin: 0;
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.previa__vazia {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

@media (max-width: 1180px) {
  .novo__grade {
    grid-template-columns: minmax(0, 1fr);
  }
  .previa {
    position: static;
  }
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-4);
  }
  .formulario__espaco {
    display: none;
  }
  .formulario__acoes :deep(.br-button) {
    flex: 1 1 100%;
  }
}
</style>
