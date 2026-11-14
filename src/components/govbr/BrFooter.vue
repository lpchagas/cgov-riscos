<script setup lang="ts">
/**
 * ============================================================================
 * RODAPÉ INSTITUCIONAL (`footer.br-footer#footer`) — versão compacta
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Em um sistema de trabalho (e não um portal de notícias), o rodapé deve ser
 * discreto: quem é o responsável, a base normativa e o padrão adotado.
 * Os atalhos de navegação que existiam aqui repetiam o menu lateral e foram
 * removidos.
 */
</script>

<template>
  <footer id="footer" class="rodape">
    <p class="rodape__linha">
      <strong>RADAR</strong> — Rede de Avaliação, Diagnóstico e Ação em Riscos ·
      Instituto Chico Mendes de Conservação da Biodiversidade (ICMBio) · CGOV/CGGE/DIPLAN
    </p>
    <p class="rodape__linha">
      Política RADAR (Minuta SEI 024241420) · Metodologia (Minuta SEI 024421455) ·
      Programa Integra+ (Portaria ICMBio nº 253/2026) · Padrão Digital de Governo (gov.br DS)
    </p>
  </footer>
</template>

<style scoped>
.rodape {
  margin-top: var(--esp-7);
  padding: var(--esp-5) 0 var(--esp-4);
  border-top: 1px solid var(--borda);
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.rodape__linha {
  margin: 0 0 var(--esp-1);
}

.rodape__linha strong {
  color: var(--texto);
}
</style>
