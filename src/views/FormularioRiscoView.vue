<script setup lang="ts">
/**
 * ============================================================================
 * ASSISTENTE GUIADO DE CADASTRO DE RISCO (`FormularioRiscoView.vue`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Esta tela guia o servidor da 1ª Linha pelas etapas exatas da Metodologia RADAR:
 * 1. Identificação Bow Tie (Causas -> Evento -> Consequências -> Objetivo afetado)
 *    montando a frase obrigatória da Seção 4.2.1 em tempo real;
 * 2. Categorização (Quadro 2) + Teste de Integridade do Programa Integra+
 *    (Portaria ICMBio nº 253/2026 e Quadro 3);
 * 3. Análise Inerente (Quadro 7) e Residual (Quadro 6) com Trava de Evidência;
 * 4. Tratamento 5W2H e Indicador KRI.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import type {
  EstrategiaTratamento,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
} from '../types/radar.types';
import {
  SUBCATEGORIAS_INTEGRIDADE_QUADRO_3,
  calcularRiscoCompletoRadar,
  gerarSintaxePadraoRisco,
  validarRegraIntegridade,
} from '../utils/calculadoraRiscoRadar';
import BrCard from '../components/govbr/BrCard.vue';
import BrButton from '../components/govbr/BrButton.vue';
import MemoriaCalculoBar from '../components/radar/MemoriaCalculoBar.vue';

const router = useRouter();
const riscosStore = useRiscosStore();

const nomeObjeto = ref('Processo de Concessão e Autorização Ambiental');
const responsavelNome = ref('Gestor Ponto Focal (1ª Linha)');
const causas = ref('ausência de roteiro padronizado de conferência documental');
const eventoRisco = ref('aprovação de processo com instrução incompleta');
const consequencias = ref('questionamento pelos órgãos de controle e retrabalho');
const objetivoAfetado = ref('segurança jurídica e tempestividade dos atos autorizativos');

const categoriaId = ref<number>(2);
const subcategoriaIntegridade = ref<string>('');
const testeIntegridadeAplicavel = ref<boolean>(false);
const justificativaNaoIntegridade = ref<string>('');

const probabilidade = ref<NivelProbabilidade>(3);
const impacto = ref<NivelImpacto>(4);
const possuiEvidenciaControle = ref<boolean>(false);
const nivelEficaciaControle = ref<NivelEficaciaControle>('Inexistente');
const descricaoControleExistente = ref<string>('');
const evidenciaControleTexto = ref<string>('');

const estrategiaPrincipal = ref<EstrategiaTratamento>('Mitigar');
const acao5w2hOQue = ref<string>('Instituir lista de verificação obrigatória no SEI.');
const acao5w2hQuem = ref<string>('Coordenador do Processo');
const acao5w2hQuando = ref<string>('2026-12-20');
const nomeKri = ref<string>('% de processos instruídos com checklist assinado');

const erroFormulario = ref<string>('');

const categoriaAtual = computed(
  () =>
    riscosStore.categorias.find((c) => c.id === categoriaId.value) ??
    riscosStore.categorias[1]
);

const frasePadraoEmTempoReal = computed(() =>
  gerarSintaxePadraoRisco({
    causas: causas.value || '[causas]',
    eventoRisco: eventoRisco.value || '[evento de risco]',
    consequencias: consequencias.value || '[consequências]',
    objetivoAfetado: objetivoAfetado.value || '[objetivo afetado]',
  })
);

const calculoTempoReal = computed(() =>
  calcularRiscoCompletoRadar({
    probabilidade: probabilidade.value,
    impacto: impacto.value,
    eficaciaControle: nivelEficaciaControle.value,
    possuiEvidenciaComprovada: possuiEvidenciaControle.value,
    apetiteCategoria: categoriaAtual.value.apetiteDeclarado,
  })
);

function salvarRisco(submeterDiretoParaCg: boolean) {
  erroFormulario.value = '';
  const validacaoIntegridade = validarRegraIntegridade({
    categoriaNome: categoriaAtual.value.nome,
    subcategoriaIntegridade: subcategoriaIntegridade.value,
    testeIntegridadeAplicavel: testeIntegridadeAplicavel.value,
    justificativaNaoIntegridade: justificativaNaoIntegridade.value,
  });

  if (!validacaoIntegridade.valido) {
    erroFormulario.value = validacaoIntegridade.erro || 'Erro de validação normativa.';
    return;
  }

  const ficha = riscosStore.salvarOuAtualizarRisco({
    nomeObjetoCache: nomeObjeto.value,
    responsavelRiscoNome: responsavelNome.value,
    causas: causas.value,
    eventoRisco: eventoRisco.value,
    consequencias: consequencias.value,
    objetivoAfetado: objetivoAfetado.value,
    categoriaId: categoriaId.value,
    subcategoriaIntegridade:
      categoriaAtual.value.nome === 'Integridade'
        ? subcategoriaIntegridade.value
        : undefined,
    testeIntegridadeAplicavel: testeIntegridadeAplicavel.value,
    justificativaNaoIntegridade: justificativaNaoIntegridade.value,
    probabilidade: probabilidade.value,
    impacto: impacto.value,
    possuiEvidenciaControle: possuiEvidenciaControle.value,
    nivelEficaciaControle: nivelEficaciaControle.value,
    estrategiaPrincipal: estrategiaPrincipal.value,
    statusFluxo: submeterDiretoParaCg ? 'em_validacao_cg' : 'rascunho',
    controlesExistentes: descricaoControleExistente.value
      ? [
          {
            id: `ctrl-${Date.now()}`,
            descricaoControle: descricaoControleExistente.value,
            evidenciaFuncionamento: evidenciaControleTexto.value,
            possuiEvidenciaComprovada: possuiEvidenciaControle.value,
            desenhoAdequado: possuiEvidenciaControle.value,
            operacaoComprovada: possuiEvidenciaControle.value,
          },
        ]
      : [],
    respostasTratamento: acao5w2hOQue.value
      ? [
          {
            id: `trat-${Date.now()}`,
            estrategia: estrategiaPrincipal.value,
            acaoOQue: acao5w2hOQue.value,
            responsavelQuem: acao5w2hQuem.value,
            prazoQuando: acao5w2hQuando.value,
            procedimentoComo: 'Execução acompanhada via SEI',
            statusExecucao: 'nao_iniciada',
          },
        ]
      : [],
    kris: nomeKri.value
      ? [
          {
            id: `kri-${Date.now()}`,
            nomeIndicador: nomeKri.value,
            formulaCalculo: '(Processos conformes / Total de processos) × 100',
            fonteDados: 'Relatório Trimestral SEI',
            periodicidade: 'Trimestral',
            metaAlvo: '100%',
            limiteAlerta: 'Abaixo de 85%',
            responsavelMedicao: responsavelNome.value,
            medicoes: [],
          },
        ]
      : [],
  });

  if (submeterDiretoParaCg) {
    riscosStore.submeterParaValidacaoCg(ficha.id);
  }
  router.push('/');
}
</script>

<template>
  <div>
    <BrCard
      titulo="Assistente Guiado de Identificação e Análise de Risco (1ª Linha)"
      subtitulo="Ciclo RADAR: Contexto → Identificação (Bow Tie) → Análise (Quadros 6, 7 e 8) → Tratamento 5W2H e KRI"
      destaque-cor="#1351b4"
    >
      <div
        v-if="erroFormulario"
        class="p-3 mb-3 rounded font-weight-bold"
        style="background-color: #fde0db; color: #c91c00; border: 1px solid #e52207;"
      >
        <i class="fas fa-exclamation-circle mr-1"></i>
        {{ erroFormulario }}
      </div>

      <!-- ETAPA 1: CONTEXTO E BOW TIE -->
      <h4 class="h6 font-weight-bold mb-2" style="color: #1351b4;">
        1. Contexto e Identificação (Método Bow Tie + Sintaxe Seção 4.2.1)
      </h4>
      <div class="radar-grid-2 mb-3">
        <div>
          <label class="font-weight-bold d-block mb-1">Objeto de Gestão de Riscos (Processo/Macroprocesso):</label>
          <input v-model="nomeObjeto" type="text" class="w-100 p-2 rounded border" />
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Servidor Responsável (1ª Linha):</label>
          <input v-model="responsavelNome" type="text" class="w-100 p-2 rounded border" />
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Causas (Fontes antes do evento):</label>
          <textarea v-model="causas" rows="2" class="w-100 p-2 rounded border"></textarea>
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Evento de Risco (O que pode acontecer):</label>
          <textarea v-model="eventoRisco" rows="2" class="w-100 p-2 rounded border"></textarea>
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Consequências (Desdobramentos após o evento):</label>
          <textarea v-model="consequencias" rows="2" class="w-100 p-2 rounded border"></textarea>
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Objetivo ou Resultado Afetado:</label>
          <textarea v-model="objetivoAfetado" rows="2" class="w-100 p-2 rounded border"></textarea>
        </div>
      </div>

      <div class="p-3 mb-3 rounded" style="background-color: #dbe8fb; border-left: 4px solid #1351b4;">
        <div class="text-down-01 font-weight-bold" style="color: #071d41;">
          Sintaxe Obrigatória Gerada Automaticamente (Seção 4.2.1 da Metodologia):
        </div>
        <div class="mt-1">{{ frasePadraoEmTempoReal }}</div>
      </div>

      <!-- ETAPA 2: CATEGORIA E TESTE DE INTEGRIDADE (INTEGRA+) -->
      <h4 class="h6 font-weight-bold mb-2" style="color: #1351b4;">
        2. Categorização (Quadro 2) e Teste de Integridade (Portaria ICMBio nº 253/2026 — Integra+)
      </h4>
      <div class="radar-grid-2 mb-3">
        <div>
          <label class="font-weight-bold d-block mb-1">Categoria Principal do Risco (Quadro 2 — vedada categoria mista):</label>
          <select v-model="categoriaId" class="w-100 p-2 rounded border">
            <option v-for="cat in riscosStore.categorias" :key="cat.id" :value="cat.id">
              {{ cat.nome }} (Apetite na DAR: {{ cat.apetiteDeclarado }})
            </option>
          </select>
        </div>

        <div v-if="categoriaAtual.nome === 'Integridade'">
          <label class="font-weight-bold d-block mb-1" style="color: #c91c00;">
            Subcategoria Obrigatória de Integridade (Quadro 3 — Programa Integra+):
          </label>
          <select v-model="subcategoriaIntegridade" class="w-100 p-2 rounded border">
            <option value="">-- Selecione uma das 6 subcategorias do Quadro 3 --</option>
            <option v-for="sub in SUBCATEGORIAS_INTEGRIDADE_QUADRO_3" :key="sub" :value="sub">
              {{ sub }}
            </option>
          </select>
        </div>

        <div v-else>
          <label class="d-flex align-items-center gap-2 font-weight-bold mb-1">
            <input v-model="testeIntegridadeAplicavel" type="checkbox" />
            Há vulnerabilidade de fraude, favorecimento, conflito de interesses ou pressão indevida?
          </label>
          <input
            v-if="testeIntegridadeAplicavel"
            v-model="justificativaNaoIntegridade"
            type="text"
            placeholder="Justifique formalmente por que NÃO foi classificado como Integridade..."
            class="w-100 p-2 rounded border"
          />
        </div>
      </div>

      <!-- ETAPA 3: ANÁLISE INERENTE E RESIDUAL COM TRAVA DE EVIDÊNCIA -->
      <h4 class="h6 font-weight-bold mb-2" style="color: #1351b4;">
        3. Análise de Riscos Inerente (Quadro 7) e Residual (Quadro 6 com Trava de Evidência)
      </h4>
      <div class="radar-grid-2 mb-3">
        <div>
          <label class="font-weight-bold d-block mb-1">Probabilidade (Quadro 4 — 1 a 5):</label>
          <select v-model.number="probabilidade" class="w-100 p-2 rounded border">
            <option :value="1">1 — Muito baixa (&lt; 10%)</option>
            <option :value="2">2 — Baixa (10% a 30%)</option>
            <option :value="3">3 — Média (31% a 60%)</option>
            <option :value="4">4 — Alta (61% a 90%)</option>
            <option :value="5">5 — Muito alta (&gt; 90%)</option>
          </select>
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Impacto (Quadro 5 — 1 a 5):</label>
          <select v-model.number="impacto" class="w-100 p-2 rounded border">
            <option :value="1">1 — Muito baixo</option>
            <option :value="2">2 — Baixo</option>
            <option :value="3">3 — Médio</option>
            <option :value="4">4 — Alto</option>
            <option :value="5">5 — Muito alto</option>
          </select>
        </div>

        <div>
          <label class="font-weight-bold d-block mb-1">Nível de Eficácia dos Controles Existentes (Quadro 6):</label>
          <select v-model="nivelEficaciaControle" class="w-100 p-2 rounded border">
            <option value="Inexistente">Inexistente (Fator 1,0)</option>
            <option value="Fraco">Fraco (Fator 0,9)</option>
            <option value="Mediano">Mediano (Fator 0,75 — exige evidência)</option>
            <option value="Satisfatório">Satisfatório (Fator 0,6 — exige evidência)</option>
            <option value="Forte">Forte (Fator 0,5 — exige evidência)</option>
          </select>
        </div>

        <div class="d-flex flex-column justify-content-center">
          <label class="d-flex align-items-center gap-2 font-weight-bold">
            <input v-model="possuiEvidenciaControle" type="checkbox" />
            Possui evidência documental comprovada de funcionamento do controle?
          </label>
          <small class="text-muted">
            Sem evidência comprovada, o sistema trava automaticamente o fator no máximo em Fraco (0,9).
          </small>
        </div>
      </div>

      <MemoriaCalculoBar
        :probabilidade="probabilidade"
        :impacto="impacto"
        :nivel-inerente="calculoTempoReal.nivelInerente"
        :classificacao-inerente="calculoTempoReal.classificacaoInerente"
        :eficacia-controle="calculoTempoReal.eficaciaFinal"
        :fator-controle="calculoTempoReal.fatorFinal"
        :possui-evidencia="possuiEvidenciaControle"
        :nivel-residual="calculoTempoReal.nivelResidual"
        :classificacao-residual="calculoTempoReal.classificacaoResidual"
        :status-critico="calculoTempoReal.statusCritico"
        :trava-acionada="calculoTempoReal.travaEvidenciaAcionada"
      />

      <!-- ETAPA 4: PLANO DE AÇÃO 5W2H E KRI -->
      <h4 class="h6 font-weight-bold mt-3 mb-2" style="color: #1351b4;">
        4. Estratégia de Resposta (Tabela 8), Ação 5W2H e Indicador KRI
      </h4>
      <div class="radar-grid-2 mb-3">
        <div>
          <label class="font-weight-bold d-block mb-1">Estratégia Oficial (Tabela 8):</label>
          <select v-model="estrategiaPrincipal" class="w-100 p-2 rounded border">
            <option value="Mitigar">Mitigar</option>
            <option value="Compartilhar">Compartilhar</option>
            <option value="Evitar">Evitar</option>
            <option value="Aceitar">Aceitar</option>
          </select>
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Indicador-Chave de Risco (KRI):</label>
          <input v-model="nomeKri" type="text" class="w-100 p-2 rounded border" />
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Ação de Tratamento (O que será feito — 5W2H):</label>
          <input v-model="acao5w2hOQue" type="text" class="w-100 p-2 rounded border" />
        </div>
        <div>
          <label class="font-weight-bold d-block mb-1">Responsável pela Ação e Prazo:</label>
          <div class="d-flex gap-2">
            <input v-model="acao5w2hQuem" type="text" class="w-100 p-2 rounded border" />
            <input v-model="acao5w2hQuando" type="date" class="p-2 rounded border" />
          </div>
        </div>
      </div>

      <div class="d-flex gap-2 justify-content-end pt-2" style="border-top: 1px solid #eee;">
        <BrButton variant="secondary" icon="fas fa-save" @click="salvarRisco(false)">
          Salvar como Rascunho (1ª Linha)
        </BrButton>
        <BrButton variant="primary" icon="fas fa-paper-plane" @click="salvarRisco(true)">
          Salvar e Submeter à Coordenação-Geral (1 Clique)
        </BrButton>
      </div>
    </BrCard>
  </div>
</template>
