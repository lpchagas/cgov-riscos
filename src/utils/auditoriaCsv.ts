/**
 * ============================================================================
 * EXPORTAÇÃO DA TRILHA DE AUDITORIA EM CSV (`src/utils/auditoriaCsv.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * CSV é uma planilha em texto puro: uma linha por evento, colunas separadas.
 * Três cuidados para o arquivo abrir certinho no Excel em português:
 *   1. separador PONTO E VÍRGULA (no Brasil a vírgula é decimal: "8,4");
 *   2. todo campo entre aspas, e aspas internas DOBRADAS (" vira "");
 *   3. começa com o "BOM" (﻿), que avisa o Excel de que o texto é UTF-8
 *      — sem ele, "Coordenação" aparece como "CoordenaÃ§Ã£o".
 */
import { formatarDataHora, formatarNivel } from './rotulosInterface';
import { descreverEventoFluxo } from './painelResumo';

export interface EventoAuditoria {
  criadoEm: string;
  codigoRadar: string;
  nomeObjeto: string;
  categoriaNome: string;
  nivelResidual: number;
  classificacaoResidual: string;
  etapa: string;
  acao: string;
  usuarioNome: string;
  usuarioPapel: string;
  despachoTexto?: string;
}

export const ROTULOS_PAPEL: Record<string, string> = {
  gestor: 'Gestor da unidade (1ª Linha)',
  lider_cg: 'Coordenação-Geral (2º degrau)',
  diretor: 'Diretoria (3º degrau)',
  cgov: 'CGOV (2ª Linha)',
};

/** Coloca o texto entre aspas e dobra as aspas de dentro. Ex.: a"b → "a""b" */
function campo(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function eventosParaCsv(eventos: EventoAuditoria[]): string {
  const cabecalho = ['Data e hora', 'Risco', 'Objeto', 'Categoria', 'Residual', 'Nível', 'O que aconteceu', 'Quem', 'Papel', 'Despacho'];
  const linhas = eventos.map((e) =>
    [
      formatarDataHora(e.criadoEm),
      e.codigoRadar,
      e.nomeObjeto,
      e.categoriaNome,
      formatarNivel(e.nivelResidual),
      e.classificacaoResidual,
      descreverEventoFluxo(e),
      e.usuarioNome,
      ROTULOS_PAPEL[e.usuarioPapel] ?? e.usuarioPapel,
      e.despachoTexto ?? '',
    ]
      .map(campo)
      .join(';')
  );
  return '﻿' + [cabecalho.map(campo).join(';'), ...linhas].join('\r\n');
}
