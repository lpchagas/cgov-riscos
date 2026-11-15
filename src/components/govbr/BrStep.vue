<script setup lang="ts">
/**
 * ============================================================================
 * INDICADOR DE ETAPAS (`BrStep.vue`) — "stepper"
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Mostra em que etapa de um processo a pessoa está (ex.: 2 de 4).
 *   - etapa atual: número em destaque + `aria-current="step"` (o leitor de tela
 *     anuncia "etapa atual");
 *   - etapas já feitas: ✓ e viram BOTÕES para voltar a elas;
 *   - etapas futuras: só texto (avança-se pelo botão "Continuar", que valida).
 *
 * No celular, os títulos somem e fica "Etapa 2 de 4 · Categoria".
 *
 * Exemplo:
 *   <BrStep :passos="ETAPAS" v-model:passo-ativo="etapa" />
 */
export interface PassoStep {
  numero: number;
  titulo: string;
  subtitulo?: string;
}

const props = defineProps<{
  passos: readonly PassoStep[];
  passoAtivo: number;
}>();

const emit = defineEmits<{ (e: 'update:passoAtivo', numero: number): void }>();

const atual = () => props.passos.find((p) => p.numero === props.passoAtivo);
</script>

<template>
  <nav class="etapas" aria-label="Etapas do cadastro">
    <ol class="etapas__lista">
      <li
        v-for="p in passos"
        :key="p.numero"
        class="etapa"
        :class="{ 'etapa--atual': p.numero === passoAtivo, 'etapa--feita': p.numero < passoAtivo }"
        :aria-current="p.numero === passoAtivo ? 'step' : undefined"
      >
        <button
          v-if="p.numero < passoAtivo"
          type="button"
          class="etapa__conteudo etapa__conteudo--botao"
          @click="emit('update:passoAtivo', p.numero)"
        >
          <span class="etapa__marca" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
          <span class="etapa__textos">
            <span class="etapa__titulo">{{ p.titulo }}<span class="radar-so-leitor"> (concluída — voltar)</span></span>
            <span v-if="p.subtitulo" class="etapa__subtitulo">{{ p.subtitulo }}</span>
          </span>
        </button>
        <span v-else class="etapa__conteudo">
          <span class="etapa__marca" aria-hidden="true">{{ p.numero }}</span>
          <span class="etapa__textos">
            <span class="etapa__titulo">{{ p.titulo }}</span>
            <span v-if="p.subtitulo" class="etapa__subtitulo">{{ p.subtitulo }}</span>
          </span>
        </span>
      </li>
    </ol>
    <p class="etapas__celular" aria-hidden="true">
      Etapa {{ passoAtivo }} de {{ passos.length }} · <strong>{{ atual()?.titulo }}</strong>
    </p>
  </nav>
</template>

<style scoped>
.etapas {
  min-width: 0;
}

.etapas__lista {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: etapa;
}

.etapa {
  position: relative;
  min-width: 0;
  padding-top: var(--esp-2);
  border-top: 4px solid var(--borda);
}

.etapa--feita {
  border-top-color: var(--cor-sucesso);
}

.etapa--atual {
  border-top-color: var(--cor-primaria);
}

.etapa__conteudo {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-2);
  width: 100%;
  min-height: var(--alvo-minimo);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--texto-secundario);
  font: inherit;
  text-align: left;
}

.etapa__conteudo--botao {
  cursor: pointer;
}

.etapa__conteudo--botao:hover .etapa__titulo {
  text-decoration: underline;
}

.etapa__marca {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
}

.etapa--feita .etapa__marca {
  background: var(--cor-sucesso);
  color: var(--texto-inverso);
}

.etapa--atual .etapa__marca {
  background: var(--cor-primaria);
  color: var(--cor-sobre-primaria);
}

.etapa__textos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.etapa__titulo {
  font-weight: var(--peso-semi);
}

.etapa--atual .etapa__titulo,
.etapa--feita .etapa__titulo {
  color: var(--texto);
}

.etapa__subtitulo {
  font-size: var(--texto-xs);
}

.etapas__celular {
  display: none;
  margin: var(--esp-2) 0 0;
  font-size: var(--texto-sm);
}

/* Celular: só as marcas (1 2 3 4) e a frase "Etapa 2 de 4 · Categoria". */
@media (max-width: 639.98px) {
  .etapa__textos {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  .etapas__celular {
    display: block;
  }
}
</style>
