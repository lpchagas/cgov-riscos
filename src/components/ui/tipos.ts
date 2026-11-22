/**
 * ============================================================================
 * TIPOS COMPARTILHADOS DOS COMPONENTES DE UI (`src/components/ui/tipos.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Os componentes `.vue` com `<script setup>` não podem exportar nada além do
 * próprio componente. Por isso, os "contratos" (interfaces) que as páginas
 * precisam conhecer ficam aqui.
 */

/** Configuração de uma coluna do `DataTable`. `L` é o tipo de cada linha. */
export interface ColunaTabela<L> {
  chave: string;
  rotulo: string;
  ordenavel?: boolean;
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  largura?: string;
  /** Valor usado para ordenar (padrão: `linha[chave]`). */
  valorOrdenacao?: (linha: L) => string | number;
  /** Esconde a coluna em telas estreitas (< 768 px). */
  ocultarNoCelular?: boolean;
}

/** Uma opção do `SegmentedControl`. */
export interface OpcaoSegmento<T> {
  valor: T;
  rotulo: string;
  icone?: string;
}

/** Uma opção do `GrupoOpcoesDescritas`: rótulo em destaque + descrição logo abaixo. */
export interface OpcaoDescrita<T> {
  valor: T;
  rotulo: string;
  descricao: string;
}
