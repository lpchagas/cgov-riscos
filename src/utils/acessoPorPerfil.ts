/**
 * ============================================================================
 * TABELA ÚNICA DE ACESSO POR PERFIL (`src/utils/acessoPorPerfil.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * O RADAR tem 10 perfis (papéis). Em vez de cada tela decidir sozinha "quem
 * pode o quê", todas leem ESTE arquivo. Assim, mudar uma regra de acesso é
 * mudar um lugar só. São funções "puras": recebem o papel e devolvem sim/não,
 * sem depender de tela, store ou banco (por isso são fáceis de testar).
 *
 * Duas perguntas diferentes:
 *   1. "Este perfil pode ABRIR esta tela?"  -> `podeAbrirRota`
 *   2. "Este perfil pode FAZER esta ação?"  -> `capacidades` (botões)
 *
 * ATENÇÃO: esconder tela ou botão é só conforto. Quem barra de verdade é a
 * segurança por linha (RLS) do banco, criada na etapa B1.
 *
 * Fontes: matriz de responsabilidades (seção 7) para as telas; spec B1 7.1
 * (que o banco já aplica) para quem valida e quem homologa.
 */
import type { PapelGovernanca } from '../types/radar.types';

export type { PapelGovernanca };

/** Os 10 perfis, na ordem de exibição (mesmas chaves do CHECK do banco). */
export const PAPEIS: readonly PapelGovernanca[] = [
  'gestor',
  'coordenador_territorial',
  'gerente_regional',
  'coordenador_geral',
  'diretor',
  'presidencia',
  'auditoria',
  'cgov',
  'cgge',
  'gabin',
];

/** Nome para a pessoa ver e a linha/degrau de governança a que o perfil pertence. */
export const ROTULOS_PAPEL: Record<PapelGovernanca, { rotulo: string; linha: string }> = {
  gestor: { rotulo: 'Gestor da unidade', linha: '1ª Linha' },
  coordenador_territorial: { rotulo: 'Coordenação Territorial', linha: '1º degrau' },
  gerente_regional: { rotulo: 'Gerência Regional', linha: '2º degrau' },
  coordenador_geral: { rotulo: 'Coordenação-Geral', linha: '2º degrau' },
  diretor: { rotulo: 'Diretoria', linha: '3º degrau' },
  presidencia: { rotulo: 'Presidência', linha: '3º degrau' },
  auditoria: { rotulo: 'Auditoria Interna (AUDIT)', linha: '3ª Linha' },
  cgov: { rotulo: 'Analista de governança (CGOV)', linha: '2ª Linha' },
  cgge: { rotulo: 'CGGE', linha: '2ª Linha' },
  gabin: { rotulo: 'Gabinete', linha: 'Gabinete' },
};

/** Telas (pelo nome da rota) que só a CGOV abre. As demais abrem para os 10 perfis. */
export const ROTAS_SO_CGOV: readonly string[] = ['importar-skill', 'usuarios-perfis'];

/** Ex.: podeAbrirRota('gestor', 'importar-skill') -> false; ('cgov', ...) -> true. */
export function podeAbrirRota(papel: PapelGovernanca, nomeRota: string): boolean {
  return ROTAS_SO_CGOV.includes(nomeRota) ? papel === 'cgov' : true;
}

/** O que cada perfil pode fazer (usado para habilitar ou esconder botões). */
export interface Capacidades {
  podeValidar: boolean; // 2º degrau (validação pela chefia imediata)
  podeHomologar: boolean; // 3º degrau (homologação de Risco Crítico)
  editaDar: boolean; // Declaração de Apetite a Riscos
  editaCatalogoObjetos: boolean; // botão "Novo objeto"
  importa: boolean; // Importar riscos
  gerenciaUsuarios: boolean; // Usuários e perfis
  somenteLeituraForaDaUnidade: boolean; // AUDIT enxerga tudo, mas não altera
  /** Comunicações à CGOV (LAC-04): botão "Nova comunicação". Todos, menos a AUDIT (só lê). */
  enviaComunicacao: boolean;
  /** Botão "Registrar ciência" da comunicação recebida: só a CGOV. */
  registraCienciaComunicacao: boolean;
}

// Spec B1 7.1: quem valida e quem homologa (o banco já aplica).
const VALIDAM: readonly PapelGovernanca[] = ['coordenador_territorial', 'gerente_regional', 'coordenador_geral', 'diretor', 'presidencia'];
const HOMOLOGAM: readonly PapelGovernanca[] = ['gerente_regional', 'diretor', 'presidencia'];

export function capacidades(papel: PapelGovernanca): Capacidades {
  const ehCgov = papel === 'cgov';
  return {
    podeValidar: VALIDAM.includes(papel),
    podeHomologar: HOMOLOGAM.includes(papel),
    editaDar: ehCgov,
    editaCatalogoObjetos: ehCgov,
    importa: ehCgov,
    gerenciaUsuarios: ehCgov,
    somenteLeituraForaDaUnidade: papel === 'auditoria',
    // O banco confere de novo (RLS e `enviar_comunicacao`): a unidade precisa estar no alcance.
    enviaComunicacao: papel !== 'auditoria',
    registraCienciaComunicacao: ehCgov,
  };
}
