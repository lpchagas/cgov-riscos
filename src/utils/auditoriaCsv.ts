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
import { formatarDataHora } from './rotulosInterface';
import { descreverEvento, quemFez, ROTULOS_TABELA } from './auditoriaLegivel';
import type { EventoAuditoria as EventoAuditoriaBanco } from '../services/dados/tipos';

export const ROTULOS_PAPEL: Record<string, string> = {
  gestor: 'Gestor da unidade (1ª Linha)',
  coordenador_territorial: 'Coordenação Territorial (1º degrau)',
  gerente_regional: 'Gerência Regional (2º degrau)',
  coordenador_geral: 'Coordenação-Geral (2º degrau)',
  diretor: 'Diretoria (3º degrau)',
  presidencia: 'Presidência (3º degrau)',
  auditoria: 'Auditoria Interna (3ª Linha)',
  cgov: 'CGOV (2ª Linha)',
  cgge: 'CGGE (2ª Linha)',
  gabin: 'Gabinete',
};

/**
 * Coloca o texto entre aspas e dobra as aspas de dentro. Ex.: a"b → "a""b"
 * SEGURANÇA: o Excel executa como fórmula todo texto que começa com = + - @
 * (ou tab / retorno de carro). Um nome de objeto como `=HYPERLINK(...)` viraria
 * ataque. Por isso esses textos ganham um apóstrofo na frente, que o torna texto.
 */
export function campo(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/**
 * CSV da Auditoria "de verdade": uma linha por evento carregado na tela, com
 * as mesmas colunas legíveis que a pessoa vê (título e mudanças em texto).
 * Ex.: "Risco RADAR-2026-003 criado" · "Causas: A → B".
 */
export function eventosAuditoriaParaCsv(eventos: EventoAuditoriaBanco[]): string {
  const cabecalho = ['Data e hora', 'Tabela', 'Risco', 'O que aconteceu', 'Mudanças', 'Quem', 'Papel'];
  const linhas = eventos.map((e) => {
    const { titulo, mudancas } = descreverEvento(e);
    return [
      formatarDataHora(e.realizadoEm),
      ROTULOS_TABELA[e.tabela] ?? e.tabela,
      e.codigoRadar ?? '',
      titulo,
      mudancas.map((m) => `${m.campo}: ${m.antes} → ${m.depois}`).join(' | '),
      quemFez(e),
      e.quemPapel ? (ROTULOS_PAPEL[e.quemPapel] ?? e.quemPapel) : '',
    ]
      .map(campo)
      .join(';');
  });
  return '﻿' + [cabecalho.map(campo).join(';'), ...linhas].join('\r\n');
}
