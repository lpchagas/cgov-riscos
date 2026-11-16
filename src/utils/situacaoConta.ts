/**
 * ============================================================================
 * SITUAÇÃO DA CONTA (`src/utils/situacaoConta.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Na tela "Usuários e perfis", cada pessoa está em uma destas situações:
 *   - suspenso : a CGOV desativou o perfil (`ativo = false`). Vence todas as outras;
 *   - entrou   : a pessoa já abriu o link e acessou o RADAR;
 *   - enviado  : o link foi enviado, mas ela ainda não entrou;
 *   - pendente : a conta existe, mas nenhum link foi enviado ainda.
 * São funções "puras" (só recebem dados e devolvem texto), por isso fáceis de testar.
 */

export type SituacaoConta = 'pendente' | 'enviado' | 'entrou' | 'suspenso';

export interface DadosAuthConta {
  conviteEnviadoEm: string | null;
  ultimoAcessoEm: string | null;
}

/** Ex.: ({ativo:true}, {conviteEnviadoEm:'2026-11-01…', ultimoAcessoEm:null}) -> 'enviado'. */
export function situacaoConta(p: { ativo: boolean }, auth: DadosAuthConta | undefined): SituacaoConta {
  if (!p.ativo) return 'suspenso';
  if (auth?.ultimoAcessoEm) return 'entrou';
  if (auth?.conviteEnviadoEm) return 'enviado';
  return 'pendente';
}

/** Data no formato brasileiro (dd/mm/aaaa), no fuso de Brasília para não "pular" de dia. */
function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/** Texto que a pessoa lê na coluna "Situação". */
export function rotuloSituacao(s: SituacaoConta, auth?: DadosAuthConta): string {
  switch (s) {
    case 'suspenso':
      return 'Suspenso';
    case 'entrou':
      return `Entrou em ${formatarData(auth?.ultimoAcessoEm)}`;
    case 'enviado':
      return `Convite enviado em ${formatarData(auth?.conviteEnviadoEm)}`;
    default:
      return 'Convite pendente';
  }
}
