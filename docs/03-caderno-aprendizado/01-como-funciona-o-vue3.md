# 🎓 Aula 1: Como Funciona o Vue.js 3 no Sistema RADAR

Como você está usando este projeto para aprender desenvolvimento web, esta nota explica os 3 conceitos do **Vue.js 3** que você verá nos arquivos da pasta `src/`.

---

## 1. O formato `.vue` (Single-File Component)
No Vue 3, cada parte da tela fica em um arquivo `.vue` dividido em 3 blocos fáceis de identificar:

```vue
<script setup lang="ts">
// 1. LÓGICA (TypeScript): onde ficam as variáveis e funções de cálculo
import { ref, computed } from 'vue';

const probabilidade = ref(3); // Variável reativa (se mudar, a tela atualiza sozinha!)
const impacto = ref(5);
</script>

<template>
  <!-- 2. ESTRUTURA VISUAL (HTML): o que o usuário vê na tela -->
  <div class="br-card">
    <p>Probabilidade escolhida: {{ probabilidade }}</p>
  </div>
</template>

<style scoped>
/* 3. ESTILO (CSS): cores e espaçamentos exclusivos deste componente */
.br-card {
  padding: 16px;
}
</style>
```

## 2. O que é `ref()` e `computed()`? (Reatividade)
- **`ref(valorInicial)`:** Cria uma variável "viva" (reativa). Em uma planilha Excel, quando você digita o número `3` na célula `A1`, a tela mostra `3`. No Vue, usamos `const probabilidade = ref(3)`.
- **`computed(() => ...)`:** Funciona exatamente como uma **fórmula do Excel**! Quando você escreve:
  ```typescript
  const resultado = computed(() => calcularRiscoCompletoRadar({
    probabilidade: probabilidade.value,
    impacto: impacto.value,
    ...
  }));
  ```
  Toda vez que o gestor trocar a Probabilidade ou o Impacto no formulário, o `resultado` recalcula sozinho em milissegundos e já muda a cor da Matriz de Calor na tela!
