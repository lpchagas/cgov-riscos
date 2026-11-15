<script setup lang="ts">
/**
 * ============================================================================
 * NOVO RISCO (`FormularioRiscoView.vue`) — assistente em 4 etapas · Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O cadastro segue o ciclo da Metodologia RADAR, uma etapa por vez:
 *   1. Identificação (Bow Tie: causas → evento → consequências → objetivo)
 *   2. Categoria (Quadro 2) e Teste de Integridade (Integra+, Quadro 3)
 *   3. Análise: Probabilidade, Impacto e controle (Quadros 4 a 8)
 *   4. Tratamento: estratégia, ação 5W2H e indicador (KRI)
 *
 * Ao lado (embaixo, no celular) fica a PRÉVIA AO VIVO: a frase padronizada da
 * Seção 4.2.1 e a conta Inerente × Fator = Residual. A conta é feita pelo
 * MOTOR OFICIAL (`calcularRiscoCompletoRadar`) — a tela não calcula nada sozinha.
 * Se o controle não tiver evidência, a trava de Fraco (0,9) aparece explicada.
 *
 * "Continuar" valida a etapa (regras em `utils/formularioRisco.ts`); com erro,
 * as mensagens aparecem ao lado de cada campo e o foco vai para o primeiro.
 */
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import type { EstrategiaTratamento, NivelEficaciaControle } from '../types/radar.types';
import {
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
} from '../utils/calculadoraRiscoRadar';
import { ETAPAS_NOVO_RISCO, dadosExemplo, dadosVazios, validarEtapa, type ErrosEtapa } from '../utils/formularioRisco';
import { ROTULOS_APETITE } from '../utils/darImpacto';
import FormField from '../components/ui/FormField.vue';
import BrStep from '../components/govbr/BrStep.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const router = useRouter();
const riscosStore = useRiscosStore();
const { mostrar } = useToast();

const etapa = ref(1);
const d = ref(dadosVazios());
const erros = ref<ErrosEtapa>({});
const formulario = ref<HTMLElement | null>(null);

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

// ---------------------------------------------------------------------------
// PRÉVIA AO VIVO (motor oficial)
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
  d.value = dadosExemplo();
  erros.value = {};
  mostrar({ tom: 'info', mensagem: 'Formulário preenchido com um exemplo de demonstração.' });
}

// ---------------------------------------------------------------------------
// SALVAR
// ---------------------------------------------------------------------------
function salvar(enviar: boolean): void {
  // Ao enviar, TODAS as etapas precisam estar válidas; rascunho só precisa da 1ª.
  const etapasParaValidar = enviar ? [1, 2, 3, 4] : [1];
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

  const v = d.value;
  const agora = Date.now();
  const ficha = riscosStore.salvarOuAtualizarRisco({
    nomeObjetoCache: v.nomeObjeto,
    responsavelRiscoNome: v.responsavel || 'Gestor de riscos da unidade (1ª Linha)',
    causas: v.causas,
    eventoRisco: v.evento,
    consequencias: v.consequencias,
    objetivoAfetado: v.objetivo,
    categoriaId: v.categoriaId ?? undefined,
    subcategoriaIntegridade: ehIntegridade.value ? v.subcategoriaIntegridade : undefined,
    testeIntegridadeAplicavel: v.decideSobreTerceiros,
    justificativaNaoIntegridade: v.justificativaNaoIntegridade || undefined,
    probabilidade: v.probabilidade ?? undefined,
    impacto: v.impacto ?? undefined,
    possuiEvidenciaControle: v.possuiEvidencia,
    nivelEficaciaControle: v.eficacia,
    estrategiaPrincipal: v.estrategia,
    statusFluxo: 'rascunho',
    controlesExistentes: v.descricaoControle
      ? [{ id: `ctrl-${agora}`, descricaoControle: v.descricaoControle, evidenciaFuncionamento: v.evidenciaControle, possuiEvidenciaComprovada: v.possuiEvidencia, desenhoAdequado: v.possuiEvidencia, operacaoComprovada: v.possuiEvidencia }]
      : [],
    respostasTratamento: v.acaoOQue
      ? [{ id: `trat-${agora}`, estrategia: v.estrategia, acaoOQue: v.acaoOQue, responsavelQuem: v.acaoQuem, prazoQuando: v.acaoPrazo, procedimentoComo: 'Execução acompanhada via SEI', statusExecucao: 'nao_iniciada' }]
      : [],
    kris: v.nomeKri
      ? [{ id: `kri-${agora}`, nomeIndicador: v.nomeKri, formulaCalculo: 'A definir pela unidade', fonteDados: 'A definir', periodicidade: 'Trimestral', metaAlvo: 'A definir', limiteAlerta: 'A definir', responsavelMedicao: v.responsavel || 'Unidade', medicoes: [] }]
      : [],
  });

  if (enviar) riscosStore.submeterParaValidacaoCg(ficha.id);
  mostrar({
    tom: 'sucesso',
    mensagem: enviar ? `${ficha.codigoRadar} enviado para validação da Coordenação-Geral.` : `${ficha.codigoRadar} salvo como rascunho.`,
  });
  router.push({ name: 'ficha-bowtie-detalhe', params: { id: ficha.id } });
}
</script>

<template>
  <div class="novo">
    <div class="novo__topo">
      <BrStep v-model:passo-ativo="etapa" :passos="ETAPAS_NOVO_RISCO" />
      <button type="button" class="link-botao" @click="preencherExemplo">Preencher com exemplo (demonstração)</button>
    </div>

    <div class="novo__grade">
      <!-- FORMULÁRIO DA ETAPA -->
      <form ref="formulario" class="cartao formulario" novalidate @submit.prevent="etapa < 4 ? continuar() : salvar(true)">
        <!-- ETAPA 1 -->
        <fieldset v-if="etapa === 1" class="etapa">
          <h2 class="etapa__titulo" tabindex="-1">Identificação</h2>
          <p class="etapa__ajuda">Descreva o risco como um "Bow Tie": o que causa, o que pode acontecer e o que isso provoca.</p>
          <FormField rotulo="Objeto de gestão" ajuda="O processo, projeto ou unidade onde o risco está." :erro="erros.nomeObjeto" obrigatorio v-slot="{ attrs }">
            <input v-bind="attrs" v-model="d.nomeObjeto" type="text" />
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
        </fieldset>

        <!-- AÇÕES -->
        <div class="formulario__acoes">
          <BrButton v-if="etapa > 1" variant="secondary" icon="fa-solid fa-arrow-left" @click="voltar">Voltar</BrButton>
          <span class="formulario__espaco"></span>
          <BrButton variant="secondary" @click="salvar(false)">Salvar rascunho</BrButton>
          <BrButton v-if="etapa < 4" variant="primary" type="submit">Continuar</BrButton>
          <BrButton v-else variant="primary" icon="fa-solid fa-paper-plane" type="submit">Enviar para validação</BrButton>
        </div>
      </form>

      <!-- PRÉVIA AO VIVO -->
      <aside class="cartao previa" aria-labelledby="titulo-previa">
        <h2 id="titulo-previa" class="previa__titulo">Prévia</h2>
        <h3 class="previa__subtitulo">Descrição padronizada (Seção 4.2.1)</h3>
        <p class="previa__frase">{{ frase }}</p>
        <h3 class="previa__subtitulo">A conta</h3>
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
