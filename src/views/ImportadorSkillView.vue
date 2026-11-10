<script setup lang="ts">
/**
 * ============================================================================
 * IMPORTADOR DE TABELAS MARKDOWN DA SKILL `cgov-gestao-riscos-v4` (PASSO 0)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Quando a equipe da CGOV executa a skill `cgov-gestao-riscos-v4` no Claude Code
 * sobre Portarias e Instruções Normativas do ICMBio, o resultado é uma tabela
 * Markdown de 16 colunas. Basta colar a tabela abaixo para importar todas as
 * fichas preliminares (`preliminar_cgov`) e recalculá-las automaticamente pelo
 * motor RADAR!
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import BrCard from '../components/govbr/BrCard.vue';
import BrButton from '../components/govbr/BrButton.vue';

const router = useRouter();
const riscosStore = useRiscosStore();

const exemploMarkdownSkill = `| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-IN-01 | Autorização Direta em UC | Devido o(a) ausência de cruzamento automatizado de condicionantes, poderá ocorrer o(a) emissão de autorização sem validação prévia da chefia da UC, ocasionando o(a) sobreposição de usos incompatíveis e impactando o alcance do objetivo de conservação da biodiversidade. | Socioambiental | 3 | 4 | 18 | Extremo | Parecer técnico individual sem checklist padronizado | Fraco (0,9) | 16,2 | Alto | baixo | sim | Mitigar | % de autorizações com checklist validado no SEI |
| RSC-IN-02 | Fiscalização e Lavratura de Autos | Devido o(a) ausência de segregação de funções na revisão de autos de infração, poderá ocorrer o(a) arquivamento indevido por conflito de interesses, ocasionando o(a) prescrição punitiva e dano à credibilidade institucional e impactando o alcance do objetivo de integridade e combate a ilícitos ambientais. | Integridade: Conflito de Interesses e Nepotismo | 2 | 5 | 19 | Extremo | Inexistente | Inexistente (1,0) | 19 | Extremo | baixo | sim | Mitigar | % de processos revisados por colegiado técnico |`;

const markdownInput = ref(exemploMarkdownSkill);
const mensagemSucesso = ref('');
const listaErros = ref<string[]>([]);
const listaAvisos = ref<string[]>([]);

function carregarExemplo() {
  markdownInput.value = exemploMarkdownSkill;
  mensagemSucesso.value = '';
  listaErros.value = [];
}

function processarImportacao() {
  mensagemSucesso.value = '';
  listaErros.value = [];
  listaAvisos.value = [];

  const res = riscosStore.importarMarkdownDaSkill(markdownInput.value);
  listaAvisos.value = res.avisos;

  if (res.erros.length > 0) {
    listaErros.value = res.erros;
    return;
  }

  mensagemSucesso.value = `${res.importados} ficha(s) preliminar(es) importada(s) com sucesso (status: preliminar_cgov)! Redirecionando para o Painel...`;
  setTimeout(() => {
    router.push('/');
  }, 1200);
}
</script>

<template>
  <div>
    <BrCard
      titulo="Passo 0 (CGOV): Importador de Tabelas Markdown da Skill cgov-gestao-riscos-v4"
      subtitulo="Cole abaixo a tabela gerada pelo Claude Code a partir da análise de Portarias e Instruções Normativas do ICMBio"
      destaque-cor="#1351b4"
    >
      <p class="text-down-01 mb-2">
        O importador extrai automaticamente <strong>Causas, Evento, Consequências e Objetivo</strong> da sintaxe padrão, valida a proibição de categorias mistas (Programa Integra+) e recalcula todas as notas pelo <strong>Quadro 7 e Quadro 6</strong>.
      </p>

      <div
        v-if="mensagemSucesso"
        class="p-3 mb-3 rounded font-weight-bold"
        style="background: #e3f5e1; color: #168821; border: 1px solid #168821;"
      >
        <i class="fas fa-check-circle mr-1"></i>
        {{ mensagemSucesso }}
      </div>

      <div
        v-if="listaErros.length > 0"
        class="p-3 mb-3 rounded"
        style="background: #fde0db; color: #c91c00; border: 1px solid #e52207;"
      >
        <strong>Erros Normativos Encontrados na Tabela:</strong>
        <ul class="mb-0 mt-1">
          <li v-for="(err, idx) in listaErros" :key="idx">{{ err }}</li>
        </ul>
      </div>

      <textarea
        v-model="markdownInput"
        rows="9"
        class="w-100 p-2 rounded border mb-3"
        style="font-family: monospace; font-size: 0.85rem;"
      ></textarea>

      <div class="d-flex justify-content-between flex-wrap gap-2">
        <BrButton variant="secondary" icon="fas fa-magic" @click="carregarExemplo">
          Restaurar Tabela Exemplo (Regime B — 16 Colunas)
        </BrButton>
        <BrButton variant="primary" icon="fas fa-file-import" @click="processarImportacao">
          Importar e Recalcular Fichas Preliminares (Passo 0)
        </BrButton>
      </div>
    </BrCard>
  </div>
</template>
