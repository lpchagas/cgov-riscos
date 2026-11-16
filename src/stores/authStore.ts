/**
 * ============================================================================
 * STORE DE AUTENTICAÇÃO E SIMULADOR DOS 10 PERFIS DO RADAR (MODO DEMONSTRAÇÃO)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Uma "Store" do Pinia é uma memória compartilhada entre todas as telas do
 * aplicativo. Aqui guardamos quem é a pessoa logada e qual perfil ela exerce.
 * São 10 perfis (mesmas chaves do banco): gestor, coordenador_territorial,
 * gerente_regional, coordenador_geral, diretor, presidencia, auditoria, cgov,
 * cgge e gabin. O que cada um pode fazer NÃO fica aqui: fica na tabela única
 * `src/utils/acessoPorPerfil.ts`, e a store só a consulta (`capacidades`).
 *
 * A store tem DOIS modos:
 *  - 'demonstracao': sem `.env` do Supabase. O perfil é simulado pelo menu da conta
 *    e lembrado no `localStorage` (chave `radar.perfil-demo.v1`).
 *  - 'real': com Supabase configurado. A pessoa entra por um LINK enviado ao e-mail
 *    (sem senha). Depois do login, lemos o perfil dela no banco (`meu_perfil()`).
 *    A `situacao` diz em que pé está: carregando, anonimo (não entrou), sem_perfil
 *    (tem conta, mas a CGOV não cadastrou perfil), inativo (suspensa), ativo ou erro.
 */

import { guardarVolta } from '../utils/voltaAposLogin';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PapelGovernanca } from '../types/radar.types';
import { isSupabaseConfigurado, supabaseClient } from '../services/supabase';
import { PAPEIS, capacidades as capacidadesDoPapel } from '../utils/acessoPorPerfil';

export interface PerfilUsuarioDemo {
  id: string;
  nome: string;
  cargo: string;
  unidadeSigla: string;
  papel: PapelGovernanca;
}

export type ModoAuth = 'real' | 'demonstracao';
export type SituacaoAcesso = 'carregando' | 'anonimo' | 'sem_perfil' | 'inativo' | 'ativo' | 'erro';
export type ResultadoEnvio = 'enviado' | 'limite' | 'falha_rede';

/** Perfil da pessoa logada (modo real): linha de `perfis_usuarios` + dados da unidade. */
export interface PerfilRadar {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  papel: PapelGovernanca;
  unidadeId: string;
  unidadeSigla: string;
  unidadeNome: string;
  titularChefia: boolean;
  ativo: boolean;
}

// A "volta após o login" mora em utils/voltaAposLogin.ts (localStorage com validade de 1 hora).
export { CHAVE_VOLTA } from '../utils/voltaAposLogin';

// Texto único da falha de rede: mora em services/dados/errosBanco.ts.
import { MENSAGEM_REDE } from '../services/dados/errosBanco';

/** Chave do localStorage onde fica o perfil simulado (a varredura de acessibilidade usa a mesma). */
export const CHAVE_PERFIL_DEMO = 'radar.perfil-demo.v1';

/** Nomes genéricos de propósito: nenhuma pessoa real aparece no modo demonstração. */
export const PERFIS_DEMO_ICMBIO: Record<PapelGovernanca, PerfilUsuarioDemo> = {
  gestor: { id: 'usr-gestor-1', nome: 'Gestor(a) de unidade — demonstração', cargo: 'Chefia de UC ou unidade técnica', unidadeSigla: 'PARNA Exemplo', papel: 'gestor' },
  coordenador_territorial: { id: 'usr-ct-1', nome: 'Coordenador(a) Territorial — demonstração', cargo: 'Coordenação Territorial', unidadeSigla: 'CT Exemplo', papel: 'coordenador_territorial' },
  gerente_regional: { id: 'usr-gr-1', nome: 'Gerente Regional — demonstração', cargo: 'Gerência Regional', unidadeSigla: 'GR Exemplo', papel: 'gerente_regional' },
  coordenador_geral: { id: 'usr-cg-1', nome: 'Coordenador(a)-Geral — demonstração', cargo: 'Coordenação-Geral (supervisão de macroprocesso)', unidadeSigla: 'CGPRO', papel: 'coordenador_geral' },
  diretor: { id: 'usr-dir-1', nome: 'Diretor(a) — demonstração', cargo: 'Diretoria (Alta Administração)', unidadeSigla: 'DIPLAN', papel: 'diretor' },
  presidencia: { id: 'usr-pres-1', nome: 'Presidência — demonstração', cargo: 'Presidente ou Assessoria da Presidência', unidadeSigla: 'PRESI', papel: 'presidencia' },
  auditoria: { id: 'usr-audit-1', nome: 'Auditor(a) Interno(a) — demonstração', cargo: 'Auditoria Interna (3ª Linha)', unidadeSigla: 'AUDIT', papel: 'auditoria' },
  cgov: { id: 'usr-cgov-1', nome: 'Analista da CGOV — demonstração', cargo: 'Equipe Técnica de Governança e Gestão de Riscos', unidadeSigla: 'CGOV', papel: 'cgov' },
  cgge: { id: 'usr-cgge-1', nome: 'Analista da CGGE — demonstração', cargo: 'Coordenação-Geral de Gestão Estratégica', unidadeSigla: 'CGGE', papel: 'cgge' },
  gabin: { id: 'usr-gabin-1', nome: 'Gabinete — demonstração', cargo: 'Gabinete da Presidência', unidadeSigla: 'GABIN', papel: 'gabin' },
};

/** Lê o perfil simulado guardado. Qualquer falha (sem localStorage, valor estranho) cai no padrão `cgov`. */
function lerPapelGuardado(): PapelGovernanca {
  try {
    const valor = localStorage.getItem(CHAVE_PERFIL_DEMO);
    if (valor && (PAPEIS as readonly string[]).includes(valor)) return valor as PapelGovernanca;
  } catch {
    // localStorage pode estar bloqueado (janela privada): segue com o padrão.
  }
  return 'cgov';
}

export const useAuthStore = defineStore('auth', () => {
  // Sem cliente Supabase (sem .env) o app roda em demonstração, como sempre rodou.
  const modo: ModoAuth = isSupabaseConfigurado && supabaseClient ? 'real' : 'demonstracao';

  const situacao = ref<SituacaoAcesso>(modo === 'real' ? 'carregando' : 'ativo');
  const perfil = ref<PerfilRadar | null>(null);
  const mensagemErro = ref<string | null>(null);

  // --- Modo demonstração ---------------------------------------------------
  const perfilDemo = ref<PerfilUsuarioDemo>(PERFIS_DEMO_ICMBIO[lerPapelGuardado()]);

  function alternarPerfilDemo(papel: PapelGovernanca): void {
    perfilDemo.value = PERFIS_DEMO_ICMBIO[papel];
    try {
      localStorage.setItem(CHAVE_PERFIL_DEMO, papel);
    } catch {
      // Sem localStorage, o perfil vale só até recarregar a página.
    }
  }

  /**
   * Quem está usando o sistema, no mesmo formato nos dois modos.
   * No modo real sem perfil (ex.: ainda anônimo) devolvemos um "vazio" de menor privilégio.
   */
  const usuarioAtual = computed<PerfilUsuarioDemo>(() => {
    if (modo === 'demonstracao') return perfilDemo.value;
    const p = perfil.value;
    if (!p) return { id: '', nome: '', cargo: '', unidadeSigla: '', papel: 'gestor' };
    return { id: p.id, nome: p.nome, cargo: p.cargo ?? '', unidadeSigla: p.unidadeSigla, papel: p.papel };
  });

  // --- Modo real: leitura do perfil ---------------------------------------
  /** Contador das leituras de perfil (ver `lerPerfil`). */
  let sequenciaCarga = 0;
  /** Promessa da leitura mais recente (nula após SIGNED_OUT). Leituras velhas esperam por ela. */
  let ultimaCarga: Promise<void> | null = null;

  function carregarPerfil(userId: string | null): Promise<void> {
    const promessa = lerPerfil(userId);
    ultimaCarga = promessa;
    return promessa;
  }

  function definirErro(): void {
    perfil.value = null;
    situacao.value = 'erro';
    mensagemErro.value = MENSAGEM_REDE;
  }

  /**
   * Descobre em que situação a sessão está e preenche `perfil`.
   * 1) `meu_perfil()` só traz perfil ATIVO. 2) Se vier vazio, olhamos a própria linha
   * para separar "sem perfil" (linha não existe) de "inativo" (ativo = false).
   */
  async function lerPerfil(userId: string | null): Promise<void> {
    const cliente = supabaseClient;
    if (!cliente) return;
    // Numeramos cada leitura. Se, enquanto esta espera o banco, chegar uma leitura mais nova
    // ou um SIGNED_OUT (que também "avança" o contador), o resultado desta fica velho e é
    // descartado. Exemplo: leitura lenta termina depois da saída e NÃO pode voltar a 'ativo'.
    const minha = ++sequenciaCarga;
    const velha = () => minha !== sequenciaCarga;
    // Quando esta leitura fica velha, quem chamou ainda espera "o perfil resolvido": então
    // aguardamos a leitura MAIS NOVA terminar (se houve só SIGNED_OUT, não há nada a esperar).
    const aguardarMaisNova = () => ultimaCarga ?? undefined;
    if (!userId) {
      perfil.value = null;
      situacao.value = 'anonimo';
      return;
    }
    try {
      const { data, error } = await cliente.rpc('meu_perfil');
      if (velha()) return aguardarMaisNova();
      if (error) return definirErro();
      // A função devolve um objeto (ou nulo); aceitamos lista por garantia.
      const linha = Array.isArray(data) ? data[0] : data;
      if (!linha || !linha.id) {
        const propria = await cliente.from('perfis_usuarios').select('ativo').eq('id', userId).maybeSingle();
        if (velha()) return aguardarMaisNova();
        if (propria.error) return definirErro();
        perfil.value = null;
        situacao.value = propria.data ? 'inativo' : 'sem_perfil';
        mensagemErro.value = null;
        return;
      }
      // Papel que o front não conhece: tratamos como erro em vez de quebrar a tela.
      if (!(PAPEIS as readonly string[]).includes(linha.papel_governanca)) return definirErro();
      const und = await cliente.from('unidades').select('sigla,nome').eq('id', linha.unidade_id).single();
      if (velha()) return aguardarMaisNova();
      if (und.error || !und.data) return definirErro();
      perfil.value = {
        id: linha.id,
        nome: linha.nome_completo,
        email: linha.email,
        cargo: linha.cargo ?? null,
        papel: linha.papel_governanca as PapelGovernanca,
        unidadeId: linha.unidade_id,
        unidadeSigla: und.data.sigla || und.data.nome,
        unidadeNome: und.data.nome,
        titularChefia: Boolean(linha.titular_chefia),
        ativo: Boolean(linha.ativo),
      };
      situacao.value = 'ativo';
      mensagemErro.value = null;
    } catch {
      if (velha()) return aguardarMaisNova();
      definirErro();
    }
  }

  /** Relê a sessão guardada e o perfil (usado ao voltar à janela e ao tentar de novo). */
  async function recarregarPerfil(): Promise<void> {
    if (modo !== 'real' || !supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) return definirErro();
      await carregarPerfil(data.session?.user.id ?? null);
    } catch {
      definirErro();
    }
  }

  // iniciar() é idempotente: todas as chamadas devolvem a MESMA promessa.
  let promessaInicio: Promise<void> | null = null;

  function iniciar(): Promise<void> {
    if (promessaInicio) return promessaInicio;
    promessaInicio = (async () => {
      if (modo !== 'real' || !supabaseClient) return;
      const cliente = supabaseClient;
      // Escuta mudanças: login, renovação do token (aqui pegamos quem foi suspenso) e saída em outra aba.
      cliente.auth.onAuthStateChange((evento, sessao) => {
        if (evento === 'SIGNED_OUT') {
          sequenciaCarga++;
          ultimaCarga = null; // invalida qualquer leitura de perfil ainda em andamento
          perfil.value = null;
          situacao.value = 'anonimo';
        } else if (evento === 'TOKEN_REFRESHED' || evento === 'SIGNED_IN') {
          // setTimeout evita chamar o Supabase "dentro" do próprio aviso dele (pode travar).
          setTimeout(() => void carregarPerfil(sessao?.user.id ?? null), 0);
        }
      });
      await recarregarPerfil();
    })();
    return promessaInicio;
  }

  /**
   * Pede o link de acesso por e-mail. A resposta NÃO revela se o e-mail existe:
   * "conta inexistente" também vira 'enviado'.
   */
  async function enviarLink(email: string, volta: string): Promise<ResultadoEnvio> {
    if (!supabaseClient) return 'falha_rede';
    guardarVolta(volta);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/entrar/retorno` },
      });
      if (!error) return 'enviado';
      if (error.status === 429) return 'limite';
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('signups not allowed') || msg.includes('user not found')) return 'enviado';
      return 'falha_rede';
    } catch {
      return 'falha_rede';
    }
  }

  /** Confere o link recebido por e-mail (token de uso único) e abre a sessão. */
  async function concluirRetorno(tokenHash: string | null, tipo: string | null): Promise<'ok' | 'link_invalido'> {
    if (!supabaseClient || !tokenHash) return 'link_invalido';
    // Só aceitamos o tipo do nosso e-mail de acesso. Outros tipos do Supabase (recuperação de
    // senha, convite…) não fazem parte deste fluxo: nem chamamos o servidor.
    if (tipo !== 'email' && tipo !== 'magiclink') return 'link_invalido';
    try {
      // O Supabase só entende 'email' para este tipo de link, mesmo quando a URL diz 'magiclink'.
      const { error } = await supabaseClient.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
      if (error) return 'link_invalido';
      // Esperamos o perfil carregar: quem navega depois disto já encontra a situação resolvida.
      await recarregarPerfil();
      return 'ok';
    } catch {
      return 'link_invalido';
    }
  }

  async function sair(): Promise<void> {
    // Na demonstração não há login: "sair" não faz nada (a situação continua 'ativo').
    if (modo !== 'real') return;
    try {
      // scope 'local': encerra só a sessão DESTE navegador (não derruba os outros aparelhos).
      await supabaseClient?.auth.signOut({ scope: 'local' });
    } catch {
      // Mesmo sem rede, limpamos o estado local.
    }
    perfil.value = null;
    situacao.value = 'anonimo';
  }

  /** O que o perfil atual pode fazer (tabela única em acessoPorPerfil.ts). */
  const capacidades = computed(() => capacidadesDoPapel(usuarioAtual.value.papel));

  // Nomes antigos mantidos para não mexer nas telas.
  const podeAprovarCg = computed(() => capacidades.value.podeValidar);
  const podeHomologarDiretoria = computed(() => capacidades.value.podeHomologar);
  const isCgov = computed(() => usuarioAtual.value.papel === 'cgov');

  return {
    modo,
    situacao,
    perfil,
    mensagemErro,
    usuarioAtual,
    perfisDisponiveisDemo: PERFIS_DEMO_ICMBIO,
    alternarPerfilDemo,
    iniciar,
    recarregarPerfil,
    enviarLink,
    concluirRetorno,
    sair,
    capacidades,
    podeAprovarCg,
    podeHomologarDiretoria,
    isCgov,
  };
});
