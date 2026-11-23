<script setup lang="ts">
/**
 * ============================================================================
 * IMPORTAR RISCOS (`ImportadorSkillView.vue`) — Fase 3
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * A CGOV roda a skill `cgov-gestao-riscos-v4` sobre normas do ICMBio e obtém
 * uma tabela Markdown de 18 colunas (ou 16, no formato antigo). Esta página traz essa tabela para o RADAR
 * em 3 passos:
 *
 *   1. COLAR a tabela (ou enviar/arrastar o arquivo .md ou .txt);
 *   2. ver a PRÉVIA: cada linha já recalculada pelo motor oficial (Quadros 6,
 *      7 e 8), com os ERROS (ex.: categoria mista proibida) e AVISOS
 *      (ex.: a skill escreveu 17 mas o Quadro 7 dá 14);
 *   3. escolher o OBJETO DE DESTINO (obrigatório; só objetos de unidades ativas);
 *   4. CONFIRMAR: as fichas entram como "Preliminar CGOV" (Passo 0) e vão
 *      para a 1ª Linha completar e enviar. O código da skill (ex.: RSC-IN-01)
 *      é DESCARTADO: quem dá o código é o RADAR (ex.: RADAR-2026-004).
 *
 * Nada é gravado antes do passo 4 — a prévia usa a função pura
 * `importarTabelaMarkdownSkill`, a mesma que a store usa ao importar.
 *
 * IMPORTAÇÃO PARCIAL: cada linha é gravada separadamente. Se o RADAR recusar
 * uma (ex.: a 3ª de 5), as outras entram normalmente e a tela mostra
 * "4 de 5 importados" + a linha recusada com o motivo em português claro.
 */
import { computed, nextTick, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useRiscosStore } from '../stores/riscosStore';
import { useToast } from '../composables/useToast';
import { traduzirErroBanco } from '../services/dados/errosBanco';
import { importarTabelaMarkdownSkill, type LinhaImportadaSkill } from '../utils/importadorSkillMarkdown';
import { avaliarCriticidadeDAR } from '../utils/calculadoraRiscoRadar';
import { ROTULOS_CRITICIDADE, formatarNivel } from '../utils/rotulosInterface';
import FormField from '../components/ui/FormField.vue';
import BrMessage from '../components/govbr/BrMessage.vue';
import DataTable from '../components/ui/DataTable.vue';
import type { ColunaTabela } from '../components/ui/tipos';
import RiskBadge from '../components/ui/RiskBadge.vue';
import Chip from '../components/ui/Chip.vue';
import BrButton from '../components/govbr/BrButton.vue';

const router = useRouter();
const riscosStore = useRiscosStore();
const { mostrar } = useToast();

const EXEMPLO = `| ID | Objeto de GR | Descrição na sintaxe | Categoria | P | I | Inerente | Classe | Controles e evidências | Eficácia e fator | Residual | Classe residual | Apetite da categoria | Crítico? | Estratégia | KRI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RSC-IN-01 | Autorização Direta em UC | Devido o(a) ausência de cruzamento automatizado de condicionantes, poderá ocorrer o(a) emissão de autorização sem validação prévia da chefia da UC, ocasionando o(a) sobreposição de usos incompatíveis e impactando o alcance do objetivo de conservação da biodiversidade. | Operacional | 3 | 4 | 18 | Extremo | Parecer técnico individual sem checklist padronizado | Fraco (0,9) | 16,2 | Alto | moderado | sim | Mitigar | % de autorizações com checklist validado no SEI |
| RSC-IN-02 | Fiscalização e Lavratura de Autos | Devido o(a) ausência de segregação de funções na revisão de autos de infração, poderá ocorrer o(a) arquivamento indevido por conflito de interesses, ocasionando o(a) prescrição punitiva e dano à credibilidade institucional e impactando o alcance do objetivo de integridade e combate a ilícitos ambientais. | Integridade: Conflito de interesses | 2 | 5 | 19 | Extremo | Inexistente | Inexistente (1,0) | 19 | Extremo | baixo | sim | Mitigar | % de processos revisados por colegiado técnico |`;

const texto = ref('');
const arrastando = ref(false);
const erroTexto = ref<string | undefined>();

// ---------------------------------------------------------------------------
// PASSO 1: colar ou enviar
// ---------------------------------------------------------------------------
async function lerArquivo(arquivo?: File | null): Promise<void> {
  if (!arquivo) return;
  if (!/\.(md|txt|markdown)$/i.test(arquivo.name)) {
    erroTexto.value = 'Envie um arquivo .md ou .txt com a tabela da skill.';
    return;
  }
  texto.value = await arquivo.text();
  erroTexto.value = undefined;
  descartarPrevia();
  mostrar({ tom: 'info', mensagem: `Arquivo "${arquivo.name}" carregado.` });
}

function aoSoltar(evento: DragEvent): void {
  arrastando.value = false;
  lerArquivo(evento.dataTransfer?.files?.[0]);
}

// ---------------------------------------------------------------------------
// PASSO 2: prévia (nada é gravado)
// ---------------------------------------------------------------------------
const previa = ref<ReturnType<typeof importarTabelaMarkdownSkill> | null>(null);

/**
 * Texto mudou (digitou, enviou arquivo, usou o exemplo): a prévia e o
 * resultado da importação anterior deixam de valer. Assim um novo
 * "Importar" sempre corresponde ao texto que está na tela.
 */
function descartarPrevia(): void {
  previa.value = null;
  resultado.value = null;
  tentouImportar.value = false;
  algumImportado.value = false;
}

function usarExemplo(): void {
  texto.value = EXEMPLO;
  erroTexto.value = undefined;
  descartarPrevia();
}

function verPrevia(): void {
  // Nova prévia = nova importação: o resultado anterior some.
  resultado.value = null;
  tentouImportar.value = false;
  algumImportado.value = false;
  if (!texto.value.trim()) {
    erroTexto.value = 'Cole a tabela Markdown da skill (ou envie o arquivo).';
    previa.value = null;
    return;
  }
  erroTexto.value = undefined;
  previa.value = importarTabelaMarkdownSkill(texto.value);
  if (!previa.value.fichas.length && !previa.value.erros.length) {
    previa.value.erros.push('Nenhuma linha de risco encontrada. Confira se a tabela tem o cabeçalho de 18 colunas da skill (ou de 16, no formato antigo).');
  }
}

/** Linha que diz qual formato de tabela foi reconhecido (18, 16 ou misto). */
const textoFormato = computed(() => {
  switch (previa.value?.formato) {
    case '18':
      return 'Formato: 18 colunas (com Teste de Integridade)';
    case '16':
      return 'Formato: 16 colunas (sem Teste de Integridade; veja os avisos)';
    case 'misto':
      return 'Formato: misto (linhas de 16 e de 18 colunas)';
    default:
      return '';
  }
});

/** Criticidade com o apetite ATUAL da categoria na DAR (o mesmo que valerá após importar). */
function criticidade(f: LinhaImportadaSkill) {
  const nomeCategoria = f.categoriaNome.split(':')[0].trim().toLowerCase();
  const apetite = riscosStore.categorias.find((c) => c.nome.toLowerCase() === nomeCategoria)?.apetiteDeclarado ?? 'pendente_dar';
  return ROTULOS_CRITICIDADE[avaliarCriticidadeDAR(f.classificacaoResidual, apetite).statusCritico];
}

const colunas: ColunaTabela<LinhaImportadaSkill>[] = [
  { chave: 'codigoRadar', rotulo: 'Código da skill' },
  { chave: 'nomeObjeto', rotulo: 'Objeto e categoria' },
  { chave: 'nivelInerente', rotulo: 'P × I → Inerente', ocultarNoCelular: true },
  { chave: 'nivelResidual', rotulo: 'Residual' },
  { chave: 'statusCritico', rotulo: 'DAR' },
];

// ---------------------------------------------------------------------------
// PASSO 3: objeto de destino (obrigatório)
// ---------------------------------------------------------------------------
/** A CGOV importa para qualquer objeto de unidade ATIVA (spec B3 §5.3). */
const objetosDestino = computed(() => riscosStore.objetosContexto.filter((o) => o.unidadeAtiva));
const objetoDestino = ref('');
const campoObjeto = ref<HTMLElement | null>(null);
/** true depois que a pessoa apertou "Importar" (só então a falta do objeto vira erro de campo). */
const tentouImportar = ref(false);
const erroObjeto = computed(() =>
  tentouImportar.value && !objetoDestino.value ? 'Escolha o objeto de destino para importar.' : undefined
);

/** A tabela está pronta para importar (prévia sem erros e com ao menos uma linha)? */
const previaValida = computed(() => !!previa.value && previa.value.fichas.length > 0 && previa.value.erros.length === 0);

/**
 * O botão "Importar N riscos" só vale UMA vez por prévia. Depois de uma
 * importação (mesmo parcial), importar tudo de novo DUPLICARIA as linhas que
 * já entraram. Ex.: 4 de 5 importados → só resta "Importar de novo só as
 * recusadas (1)". Mudar o texto ou ver a prévia de novo libera o botão.
 */
const podeImportarTudo = computed(() => previaValida.value && resultado.value === null);

// ---------------------------------------------------------------------------
// PASSO 4: confirmar
// ---------------------------------------------------------------------------
/** true durante a gravação: o botão desliga e ganha aria-busy (sem duplo envio). */
const importando = ref(false);
/**
 * Resultado de uma importação com recusas, mostrado na página.
 * `recusadas` = posições das linhas recusadas (0 = 1ª), para tentar de novo só elas.
 */
const resultado = ref<{ importados: number; total: number; erros: string[]; recusadas: number[] } | null>(null);
/** true se alguma tentativa desta prévia já gravou risco (mostra o link para a lista). */
const algumImportado = ref(false);

/**
 * Grava as linhas no objeto de destino.
 * - `soRecusadas = false` → todas as linhas da prévia (1ª tentativa);
 * - `soRecusadas = true`  → só as linhas que o RADAR recusou na tentativa anterior.
 */
async function importar(soRecusadas = false): Promise<void> {
  if (importando.value) return;
  if (soRecusadas ? !resultado.value?.recusadas.length : !podeImportarTudo.value) return;
  if (!objetoDestino.value) {
    // Sem destino: nada é gravado; o campo mostra o erro e recebe o foco.
    tentouImportar.value = true;
    await nextTick();
    campoObjeto.value?.querySelector<HTMLElement>('select')?.focus();
    return;
  }
  importando.value = true;
  const linhas = soRecusadas ? resultado.value!.recusadas : undefined;
  try {
    const res = await riscosStore.importarMarkdownDaSkill(texto.value, objetoDestino.value, linhas);
    if (res.importados) algumImportado.value = true;
    if (res.erros.length) {
      // Alguma linha (ou todas) foi recusada: ficamos aqui, mostrando o que faltou.
      // Ex.: { importados: 4, total: 5, erros: ['Linha 3 (RSC-T-03): Você não tem permissão para esta ação.'], recusadas: [2] }
      resultado.value = { importados: res.importados, total: res.total, erros: res.erros, recusadas: res.recusadas };
      mostrar({
        tom: res.importados ? 'aviso' : 'perigo',
        mensagem: `${res.importados} de ${res.total} importados.`,
      });
      return;
    }
    mostrar({ tom: 'sucesso', mensagem: `${res.importados} ${res.importados === 1 ? 'risco importado' : 'riscos importados'} como Preliminar CGOV.` });
    router.push({ name: 'riscos-lista', query: { status: 'preliminar_cgov' } });
  } catch (e) {
    // Falha inesperada (ex.: rede): mensagem já em português claro, nunca texto técnico.
    mostrar({ tom: 'perigo', mensagem: traduzirErroBanco(e).message });
  } finally {
    importando.value = false;
  }
}
</script>

<template>
  <div class="importar">
    <!-- PASSO 1 -->
    <section class="cartao" aria-labelledby="passo-1">
      <h2 id="passo-1" class="passo"><span class="passo__numero" aria-hidden="true">1</span> Cole a tabela da skill</h2>
      <p class="texto-apoio">
        A skill <code>cgov-gestao-riscos-v4</code> gera uma tabela Markdown de 18 colunas (as 16 de sempre mais o Teste de
        Integridade e a Justificativa); a de 16 colunas continua valendo, com avisos. Cole aqui ou arraste o arquivo
        <strong>.md</strong> para dentro da caixa.
      </p>
      <div
        class="zona"
        :class="{ 'zona--ativa': arrastando }"
        @dragover.prevent="arrastando = true"
        @dragleave="arrastando = false"
        @drop.prevent="aoSoltar"
      >
        <FormField rotulo="Tabela Markdown" :erro="erroTexto" obrigatorio v-slot="{ attrs }">
          <textarea v-bind="attrs" v-model="texto" rows="8" class="zona__texto" spellcheck="false" @input="descartarPrevia"></textarea>
        </FormField>
      </div>
      <div class="acoes">
        <label class="br-button secondary arquivo">
          <i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i>
          Enviar arquivo
          <input type="file" accept=".md,.txt,.markdown,text/markdown,text/plain" class="radar-so-leitor" @change="lerArquivo(($event.target as HTMLInputElement).files?.[0])" />
        </label>
        <BrButton variant="secondary" @click="usarExemplo">Usar tabela de exemplo</BrButton>
        <span class="acoes__espaco"></span>
        <BrButton variant="primary" icon="fa-solid fa-eye" @click="verPrevia">Ver prévia</BrButton>
      </div>
    </section>

    <!-- PASSO 2 -->
    <section v-if="previa" class="cartao" aria-labelledby="passo-2">
      <h2 id="passo-2" class="passo"><span class="passo__numero" aria-hidden="true">2</span> Confira a prévia</h2>
      <p class="resumo" role="status">
        <strong>{{ previa.fichas.length }}</strong> {{ previa.fichas.length === 1 ? 'risco lido' : 'riscos lidos' }} ·
        <strong :class="{ 'resumo--erro': previa.erros.length }">{{ previa.erros.length }}</strong> {{ previa.erros.length === 1 ? 'erro' : 'erros' }} ·
        <strong>{{ previa.avisos.length }}</strong> {{ previa.avisos.length === 1 ? 'aviso' : 'avisos' }}
      </p>

      <!-- Formato reconhecido (textos fixos do desenho do importador, §4.5). -->
      <p v-if="textoFormato" class="resumo">{{ textoFormato }}</p>

      <BrMessage v-if="previa.fichas.length" state="info">
        O código da skill será substituído pelo código do RADAR ao importar (ex.: RADAR-2026-004).
      </BrMessage>

      <div v-if="previa.erros.length" class="mensagens mensagens--erro" role="alert">
        <p class="mensagens__titulo"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Corrija antes de importar</p>
        <ul><li v-for="(e, i) in previa.erros" :key="i">{{ e }}</li></ul>
      </div>
      <details v-if="previa.avisos.length" class="mensagens mensagens--aviso" open>
        <summary class="mensagens__titulo"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Avisos (o RADAR recalculou)</summary>
        <ul><li v-for="(a, i) in previa.avisos" :key="i">{{ a }}</li></ul>
      </details>

      <DataTable v-if="previa.fichas.length" :colunas="colunas" :linhas="previa.fichas" chave-linha="codigoRadar" legenda="Riscos lidos da tabela (prévia, ainda não gravados)">
        <template #celula-codigoRadar="{ linha }"><span class="codigo">{{ linha.codigoRadar }}</span></template>
        <template #celula-nomeObjeto="{ linha }">
          <span class="objeto">
            <span class="objeto__nome">{{ linha.nomeObjeto }}</span>
            <span class="texto-apoio">
              {{ linha.categoriaNome }}<template v-if="linha.subcategoriaIntegridade"> · {{ linha.subcategoriaIntegridade }}</template>
            </span>
          </span>
        </template>
        <template #celula-nivelInerente="{ linha }">
          {{ linha.probabilidade }} × {{ linha.impacto }} → <strong>{{ formatarNivel(linha.nivelInerente) }}</strong>
        </template>
        <template #celula-nivelResidual="{ linha }">
          <RiskBadge :classe="linha.classificacaoResidual" :valor="linha.nivelResidual" tamanho="sm" />
        </template>
        <template #celula-statusCritico="{ linha }">
          <Chip :tom="criticidade(linha).tom" :icone="criticidade(linha).icone">{{ criticidade(linha).rotulo }}</Chip>
        </template>
      </DataTable>
    </section>

    <!-- PASSO 3 -->
    <section v-if="previa" class="cartao" aria-labelledby="passo-3">
      <h2 id="passo-3" class="passo"><span class="passo__numero" aria-hidden="true">3</span> Objeto de destino</h2>
      <p class="texto-apoio">Os riscos importados ficam neste objeto de gestão (só aparecem objetos de unidades ativas).</p>
      <div ref="campoObjeto">
        <FormField rotulo="Objeto de destino" :erro="erroObjeto" obrigatorio v-slot="{ attrs }">
          <select v-bind="attrs" v-model="objetoDestino">
            <option value="" disabled>Escolha…</option>
            <option v-for="o in objetosDestino" :key="o.id" :value="o.id">{{ o.nomeObjeto }}</option>
          </select>
        </FormField>
      </div>
    </section>

    <!-- PASSO 4 -->
    <section v-if="previa" class="cartao confirmar" aria-labelledby="passo-4">
      <h2 id="passo-4" class="passo"><span class="passo__numero" aria-hidden="true">4</span> Importe</h2>
      <p class="texto-apoio">As fichas entram como <strong>Preliminar CGOV</strong> e a 1ª Linha completa e envia para validação.</p>
      <BrButton
        variant="primary"
        icon="fa-solid fa-file-import"
        :disabled="!podeImportarTudo || importando"
        :aria-busy="importando"
        @click="importar()"
      >
        Importar {{ previa.fichas.length }} {{ previa.fichas.length === 1 ? 'risco' : 'riscos' }}
      </BrButton>

      <!-- Importação parcial: quantos entraram e quais foram recusados (motivo já traduzido). -->
      <div v-if="resultado" class="resultado">
        <BrMessage :state="resultado.importados ? 'warning' : 'danger'" :titulo="`${resultado.importados} de ${resultado.total} importados`">
          <p class="resultado__texto">{{ resultado.erros.length === 1 ? 'Esta linha foi recusada:' : 'Estas linhas foram recusadas:' }}</p>
          <ul class="resultado__lista">
            <li v-for="(e, i) in resultado.erros" :key="i">{{ e }}</li>
          </ul>
        </BrMessage>
        <BrButton
          v-if="resultado.recusadas.length"
          variant="primary"
          icon="fa-solid fa-rotate-right"
          :disabled="importando"
          :aria-busy="importando"
          @click="importar(true)"
        >Importar de novo só as recusadas ({{ resultado.recusadas.length }})</BrButton>
        <RouterLink
          v-if="algumImportado"
          :to="{ name: 'riscos-lista', query: { status: 'preliminar_cgov' } }"
          class="br-button secondary"
        >Ver os riscos importados</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.importar {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.cartao {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-5);
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
  box-shadow: var(--elevacao-1);
}

.passo {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  margin: 0;
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
}

.passo__numero {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
  font-size: var(--texto-md);
}

.texto-apoio {
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--texto-secundario);
}

.zona {
  padding: var(--esp-3);
  border: 2px dashed var(--borda-forte);
  border-radius: var(--raio-md);
  background: var(--superficie-container);
}

.zona--ativa {
  border-color: var(--cor-primaria);
  background: var(--cor-info-suave);
}

.zona__texto {
  font-family: var(--fonte-mono);
  font-size: var(--texto-sm);
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
}

.acoes__espaco {
  flex: 1;
}

/* O <label> estiliza o botão; o <input type=file> fica visível só para leitor de tela. */
.arquivo {
  position: relative;
  gap: var(--esp-2);
  cursor: pointer;
}

.arquivo:focus-within {
  box-shadow: var(--anel-foco);
}

.resumo {
  margin: 0;
}

.resumo--erro {
  color: var(--cor-perigo);
}

.mensagens {
  padding: var(--esp-3) var(--esp-4);
  border-radius: var(--raio-md);
  font-size: var(--texto-sm);
}

.mensagens ul {
  margin: var(--esp-2) 0 0;
  padding-left: var(--esp-5);
}

.mensagens--erro {
  background: var(--cor-perigo-suave);
  color: var(--cor-perigo);
}

.mensagens--aviso {
  background: var(--cor-aviso-suave);
  color: var(--cor-aviso);
}

.mensagens__titulo {
  margin: 0;
  font-weight: var(--peso-forte);
  cursor: default;
}

summary.mensagens__titulo {
  min-height: var(--alvo-minimo);
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  cursor: pointer;
}

.codigo {
  font-family: var(--fonte-mono);
  font-size: 0.8125rem;
  font-weight: var(--peso-semi);
  white-space: nowrap;
}

.objeto {
  display: flex;
  flex-direction: column;
  min-width: 12rem;
}

.objeto__nome {
  font-weight: var(--peso-semi);
}

.confirmar {
  align-items: flex-start;
}

.resultado {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-2);
  width: 100%;
}

.resultado :deep(.mensagem) {
  width: 100%;
  margin-bottom: 0;
}

.resultado__texto {
  margin: 0;
}

.resultado__lista {
  margin: var(--esp-1) 0 0;
  padding-left: var(--esp-5);
}

@media (max-width: 639.98px) {
  .cartao {
    padding: var(--esp-4);
  }
  .acoes__espaco {
    display: none;
  }
}
</style>
