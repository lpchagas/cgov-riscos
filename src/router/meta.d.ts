/**
 * ============================================================================
 * TIPOS DOS METADADOS DE ROTA (`src/router/meta.d.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Este arquivo "ensina" ao TypeScript quais campos existem em `route.meta`.
 * Assim, se alguém escrever `meta.titlo` (com erro de digitação), o build acusa.
 */
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Título curto da página (vira o <h1> e o título da aba). */
    titulo?: string;
    /** Uma frase dizendo para que serve a página. */
    descricao?: string;
    /** Base normativa, exibida no botão "ⓘ Fundamento". */
    fundamento?: string;
    /** Página "mãe" na trilha de navegação (ex.: Ficha do risco → Riscos). */
    migalhaPai?: { rotulo: string; nome: string };
    /** Quando true, a própria view desenha o PageHeader (para incluir ações). */
    cabecalhoProprio?: boolean;
    /** Quando true, a tela abre sem login (ex.: /entrar). */
    publica?: boolean;
    /** Quando true, o shell não mostra o menu lateral (telas de acesso). */
    semMenu?: boolean;
  }
}
