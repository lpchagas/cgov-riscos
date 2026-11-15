/**
 * ============================================================================
 * TESTES DA AUTHSTORE NO MODO REAL (LOGIN POR LINK NO E-MAIL)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Aqui NÃO falamos com o Supabase de verdade. Trocamos o cliente por um
 * "cliente de mentira" (um objeto com as mesmas funções, mas que devolve o que
 * o teste mandar). Assim testamos cada situação: sem sessão, sem perfil, perfil
 * suspenso, erro de rede, link vencido etc. Só e-mails fictícios (@radar.test).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// vi.hoisted cria o cliente falso ANTES do vi.mock (que o Vitest move para o topo do arquivo).
const falso = vi.hoisted(() => {
  const estado = {
    sessao: null as null | { user: { id: string } },
    perfilRpc: { data: null as unknown, error: null as unknown },
    propriaLinha: { data: null as unknown, error: null as unknown },
    unidade: { data: { sigla: 'GR5', nome: 'Gerência Regional 5' } as unknown, error: null as unknown },
    otp: { error: null as unknown },
    verify: { error: null as unknown },
    rpcLanca: false,
    ouvinte: null as null | ((evento: string, sessao: unknown) => void),
  };
  const cliente = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: estado.sessao }, error: null })),
      onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => {
        estado.ouvinte = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOtp: vi.fn(async () => estado.otp),
      verifyOtp: vi.fn(async () => estado.verify),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => {
      if (estado.rpcLanca) throw new TypeError('Failed to fetch');
      return estado.perfilRpc;
    }),
    from: vi.fn((tabela: string) => {
      const cadeia: Record<string, unknown> = {};
      cadeia.select = () => cadeia;
      cadeia.eq = () => cadeia;
      cadeia.maybeSingle = async () => estado.propriaLinha;
      cadeia.single = async () => (tabela === 'unidades' ? estado.unidade : estado.propriaLinha);
      return cadeia;
    }),
  };
  return { estado, cliente };
});

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigurado: true,
  supabaseClient: falso.cliente,
}));

import { useAuthStore, CHAVE_VOLTA } from '../../src/stores/authStore';

const LINHA_ATIVA = {
  id: 'u1', nome_completo: 'Ana Exemplo', email: 'ana@radar.test', cargo: 'Gerente',
  unidade_id: 'un1', papel_governanca: 'gerente_regional', titular_chefia: true, ativo: true,
};

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.clearAllMocks();
  Object.assign(falso.estado, {
    sessao: null, rpcLanca: false, ouvinte: null,
    perfilRpc: { data: null, error: null },
    propriaLinha: { data: null, error: null },
    unidade: { data: { sigla: 'GR5', nome: 'Gerência Regional 5' }, error: null },
    otp: { error: null }, verify: { error: null },
  });
});

describe('authStore no modo real', () => {
  it('sem sessão: situação anônima', async () => {
    const s = useAuthStore();
    expect(s.modo).toBe('real');
    await s.iniciar();
    expect(s.situacao).toBe('anonimo');
  });

  it('sessão sem perfil e sem linha própria: sem_perfil', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('sem_perfil');
  });

  it('sessão com linha própria inativa: inativo', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.propriaLinha = { data: { ativo: false }, error: null };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('inativo');
  });

  it('perfil ativo: situação ativa, sigla da unidade e papel no usuarioAtual', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('ativo');
    expect(s.perfil?.unidadeSigla).toBe('GR5');
    expect(s.usuarioAtual.papel).toBe('gerente_regional');
    expect(s.usuarioAtual.nome).toBe('Ana Exemplo');
  });

  it('sigla vazia: usa o nome da unidade', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    falso.estado.unidade = { data: { sigla: '', nome: 'Unidade Sem Sigla' }, error: null };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.perfil?.unidadeSigla).toBe('Unidade Sem Sigla');
  });

  it('papel desconhecido vindo do banco: situação erro, sem quebrar', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: { ...LINHA_ATIVA, papel_governanca: 'rei' }, error: null };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('erro');
  });

  it('erro de rede ao ler o perfil: situação erro com mensagem amigável', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.rpcLanca = true;
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('erro');
    expect(s.mensagemErro).toMatch(/^Não foi possível falar com o RADAR/);
  });

  it('enviarLink normaliza o e-mail, pede conta existente e guarda a volta', async () => {
    const s = useAuthStore();
    const r = await s.enviarLink('  Ana@Radar.TEST ', '/riscos');
    expect(r).toBe('enviado');
    expect(falso.cliente.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@radar.test', options: expect.objectContaining({ shouldCreateUser: false }) }),
    );
    expect(JSON.parse(localStorage.getItem(CHAVE_VOLTA)!)).toEqual({ volta: '/riscos', em: expect.any(Number) });
  });

  it.each(['Signups not allowed for otp', 'user not found'])(
    'enviarLink devolve enviado quando o Auth diz "%s" (não revela quem existe)',
    async (mensagem) => {
      falso.estado.otp = { error: { message: mensagem, status: 422 } };
      expect(await useAuthStore().enviarLink('x@radar.test', '/')).toBe('enviado');
    },
  );

  it('enviarLink: 429 vira limite', async () => {
    falso.estado.otp = { error: { message: 'rate limit', status: 429 } };
    expect(await useAuthStore().enviarLink('x@radar.test', '/')).toBe('limite');
  });

  it('enviarLink: chamada que lança erro vira falha_rede', async () => {
    falso.cliente.auth.signInWithOtp.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await useAuthStore().enviarLink('x@radar.test', '/')).toBe('falha_rede');
  });

  it('concluirRetorno confere o link com verifyOtp', async () => {
    const s = useAuthStore();
    expect(await s.concluirRetorno('abc', 'email')).toBe('ok');
    expect(falso.cliente.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'email' });
  });

  it('concluirRetorno: erro ou token nulo devolve link_invalido', async () => {
    const s = useAuthStore();
    falso.estado.verify = { error: { message: 'expired' } };
    expect(await s.concluirRetorno('abc', 'email')).toBe('link_invalido');
    expect(await s.concluirRetorno(null, 'email')).toBe('link_invalido');
  });

  it('TOKEN_REFRESHED relê o perfil: quem foi suspenso vira inativo', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    const s = useAuthStore();
    await s.iniciar();
    expect(s.situacao).toBe('ativo');
    // A CGOV suspende a pessoa: meu_perfil() passa a vir vazio e a própria linha, inativa.
    falso.estado.perfilRpc = { data: null, error: null };
    falso.estado.propriaLinha = { data: { ativo: false }, error: null };
    falso.estado.ouvinte!('TOKEN_REFRESHED', { user: { id: 'u1' } });
    await vi.waitFor(() => expect(s.situacao).toBe('inativo'));
    expect(s.perfil).toBeNull();
  });

  it('SIGNED_OUT: volta a anônimo e zera o perfil', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    const s = useAuthStore();
    await s.iniciar();
    falso.estado.ouvinte!('SIGNED_OUT', null);
    await vi.waitFor(() => expect(s.situacao).toBe('anonimo'));
    expect(s.perfil).toBeNull();
  });

  it('iniciar chamado duas vezes lê a sessão uma única vez', async () => {
    const s = useAuthStore();
    // (O Pinia embrulha cada ação, então não comparamos as promessas: o que importa é a leitura única.)
    await Promise.all([s.iniciar(), s.iniciar()]);
    await s.iniciar();
    expect(falso.cliente.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('sair chama signOut e deixa a pessoa anônima', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    const s = useAuthStore();
    await s.iniciar();
    await s.sair();
    // Sair encerra só a sessão deste navegador (scope 'local'), não a dos outros aparelhos.
    expect(falso.cliente.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(s.situacao).toBe('anonimo');
  });
  // --- Ajustes da revisão da Tarefa 2 ---------------------------------------
  it.each(['recovery', 'signup', 'invite', '', null])(
    'concluirRetorno: tipo %j não é aceito e nem chama o servidor',
    async (tipo) => {
      expect(await useAuthStore().concluirRetorno('abc', tipo)).toBe('link_invalido');
      expect(falso.cliente.auth.verifyOtp).not.toHaveBeenCalled();
    },
  );

  it('concluirRetorno: "magiclink" na URL também confere com type "email"', async () => {
    expect(await useAuthStore().concluirRetorno('abc', 'magiclink')).toBe('ok');
    expect(falso.cliente.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'email' });
  });

  it('concluirRetorno só devolve ok depois de carregar o perfil', async () => {
    const s = useAuthStore();
    await s.iniciar(); // anônimo
    // Depois do verifyOtp passa a existir sessão e perfil ativo.
    falso.cliente.auth.verifyOtp.mockImplementationOnce(async () => {
      falso.estado.sessao = { user: { id: 'u1' } };
      falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
      return { error: null };
    });
    expect(await s.concluirRetorno('abc', 'email')).toBe('ok');
    // Sem esperar nada: a situação já está resolvida quando a tela de retorno navega.
    expect(s.situacao).toBe('ativo');
  });

  it('carga lenta de perfil que termina depois do SIGNED_OUT é descartada', async () => {
    falso.estado.sessao = { user: { id: 'u1' } };
    falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
    const s = useAuthStore();
    await s.iniciar();
    // A próxima leitura do perfil fica "presa" até liberarmos.
    let liberar!: () => void;
    falso.cliente.rpc.mockImplementationOnce(
      () => new Promise((resolve) => { liberar = () => resolve({ data: LINHA_ATIVA, error: null }); }),
    );
    falso.estado.ouvinte!('TOKEN_REFRESHED', { user: { id: 'u1' } });
    await vi.waitFor(() => expect(falso.cliente.rpc).toHaveBeenCalledTimes(2));
    falso.estado.ouvinte!('SIGNED_OUT', null);
    expect(s.situacao).toBe('anonimo');
    liberar();
    await new Promise((r) => setTimeout(r, 20));
    // O resultado atrasado NÃO pode ressuscitar a sessão encerrada.
    expect(s.situacao).toBe('anonimo');
    expect(s.perfil).toBeNull();
  });

  it('concluirRetorno com SIGNED_IN disparado dentro do verifyOtp só devolve ok com o perfil resolvido', async () => {
    const s = useAuthStore();
    await s.iniciar(); // anônimo
    falso.cliente.auth.verifyOtp.mockImplementationOnce(async () => {
      falso.estado.sessao = { user: { id: 'u1' } };
      falso.estado.perfilRpc = { data: LINHA_ATIVA, error: null };
      // O Supabase avisa o login na hora; a store agenda a leitura (setTimeout 0).
      falso.estado.ouvinte!('SIGNED_IN', { user: { id: 'u1' } });
      return { error: null };
    });
    // A leitura do RPC é lenta: o timer do SIGNED_IN dispara enquanto a primeira ainda espera.
    const atrasar = () => new Promise((r) => setTimeout(r, 15));
    falso.cliente.rpc.mockImplementation(async () => { await atrasar(); return falso.estado.perfilRpc; });
    expect(await s.concluirRetorno('abc', 'email')).toBe('ok');
    expect(s.situacao).toBe('ativo');
    expect(s.perfil?.id).toBe('u1');
  });
});
