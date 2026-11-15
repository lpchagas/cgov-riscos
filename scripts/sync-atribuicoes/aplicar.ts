/**
 * GRAVAÇÃO DA CARGA DE ATRIBUIÇÕES NO BANCO (Etapa B2, Tarefa 8)
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Aqui está a única parte do importador que ESCREVE no banco. Usa a chave de
 * serviço (ignora o RLS), por isso só roda na máquina da CGOV/CGTI.
 *
 * Ordem das gravações (importa!):
 *   1. desligar chaves de titular   (quem saiu da linha da unidade);
 *   2. mudar de unidade             (quem foi lotado em outra unidade);
 *   3. ligar chaves de titular      (a chave é "uma por unidade": desligar antes
 *                                    evita conflito com quem acabou de sair);
 *   4. criar contas novas.
 * Nenhum e-mail é enviado: a pessoa recebe o convite depois, na tela
 * "Usuários e perfis". Se algo falhar, paramos e dizemos o que já foi gravado;
 * como o planejamento é idempotente, basta rodar de novo.
 * Se uma execução anterior morreu entre criar o login e criar o perfil, o login
 * fica "órfão"; na próxima rodada reaproveitamos esse login e criamos só o perfil.
 * ============================================================================
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PerfilAtual, PlanoCarga, UnidadeRef } from './planejar';

/** Tamanho de cada página lida do banco (a API limita a 1.000 linhas por resposta). */
const TAMANHO_LOTE = 500;

/** Lê todas as linhas de uma tabela, página por página, em ordem estável por `id`. */
async function lerTudo(cliente: SupabaseClient, tabela: string, colunas: string): Promise<Record<string, any>[]> {
  const todas: Record<string, any>[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_LOTE) {
    const { data, error } = await cliente
      .from(tabela)
      .select(colunas)
      .order('id')
      .range(inicio, inicio + TAMANHO_LOTE - 1);
    if (error) throw new Error(`RADAR: não consegui ler ${tabela}: ${error.message}`);
    todas.push(...((data ?? []) as unknown as Record<string, any>[]));
    if (!data || data.length < TAMANHO_LOTE) return todas;
  }
}

/** Lê do banco as unidades e os perfis que o planejamento precisa (com paginação). */
export async function carregarEstado(
  cliente: SupabaseClient,
): Promise<{ unidades: UnidadeRef[]; perfis: PerfilAtual[] }> {
  const un = await lerTudo(cliente, 'unidades', 'id, icmbio_id, nome, tipo, ativa, unidade_pai_id');
  const pf = await lerTudo(cliente, 'perfis_usuarios', 'id, email, nome_completo, unidade_id, papel_governanca, ativo, titular_chefia');
  return {
    unidades: un.map((u) => ({
      id: u.id, icmbioId: u.icmbio_id, nome: u.nome, tipo: u.tipo, ativa: u.ativa, paiId: u.unidade_pai_id,
    })),
    perfis: pf.map((p) => ({
      id: p.id, email: p.email, nome: p.nome_completo, unidadeId: p.unidade_id,
      papel: p.papel_governanca, titular: p.titular_chefia, ativo: p.ativo,
    })),
  };
}

/** O erro do `createUser` quer dizer "este e-mail já tem login"? */
function jaCadastrado(erro: { code?: string; status?: number; message?: string }): boolean {
  return erro.code === 'email_exists' || (erro.status === 422 && /already/i.test(erro.message ?? ''));
}

/** Procura um login existente pelo e-mail, percorrendo as páginas do admin. */
async function acharLoginPorEmail(cliente: SupabaseClient, email: string): Promise<string | null> {
  const POR_PAGINA = 1000;
  for (let pagina = 1; ; pagina++) {
    const r = await cliente.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
    if (r.error) throw new Error(r.error.message);
    const achado = r.data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (achado) return achado.id;
    if (r.data.users.length < POR_PAGINA) return null;
  }
}

export async function aplicarPlano(
  cliente: SupabaseClient,
  plano: PlanoCarga,
): Promise<{ contasCriadas: number; perfisCriados: number; perfisAlterados: number }> {
  let contasCriadas = 0;
  let perfisCriados = 0;
  let perfisAlterados = 0;
  /** Mensagem padrão de parada: diz onde parou e o que já foi gravado. */
  const parar = (onde: string, motivo: string, extra = ''): never => {
    throw new Error(
      `RADAR: parei em ${onde}; já gravado: ${contasCriadas} contas criadas, ${perfisCriados} perfis criados em logins já existentes e ${perfisAlterados} perfis alterados. Motivo: ${motivo}${extra}`,
    );
  };

  // 1. Desligar chaves.
  for (const d of plano.desligarChave) {
    const r = await cliente.from('perfis_usuarios').update({ titular_chefia: false }).eq('id', d.perfilId);
    if (r.error) parar(d.email, r.error.message);
    perfisAlterados++;
  }
  // 2. Mudanças de unidade (e papel sugerido pela nova unidade).
  for (const m of plano.mudancasUnidade) {
    const r = await cliente
      .from('perfis_usuarios')
      .update({ unidade_id: m.paraUnidadeId, papel_governanca: m.papel })
      .eq('id', m.perfilId);
    if (r.error) parar(m.email, r.error.message);
    perfisAlterados++;
  }
  // 3. Ligar chaves.
  for (const l of plano.ligarChave) {
    const r = await cliente.from('perfis_usuarios').update({ titular_chefia: true }).eq('id', l.perfilId);
    if (r.error) parar(l.email, r.error.message);
    perfisAlterados++;
  }
  // 4. Contas novas: login (sem e-mail enviado) e depois o perfil.
  for (const c of plano.contasNovas) {
    const criado = await cliente.auth.admin.createUser({ email: c.email, email_confirm: true });
    let id: string;
    let reaproveitado = false;
    if (criado.error || !criado.data?.user) {
      if (!criado.error || !jaCadastrado(criado.error)) parar(c.email, criado.error?.message ?? 'usuário não criado');
      // O login já existe (ex.: execução anterior parou antes do perfil): reaproveita.
      let achado: string | null = null;
      try {
        achado = await acharLoginPorEmail(cliente, c.email);
      } catch (e) {
        parar(c.email, `não consegui procurar o login existente: ${(e as Error).message}`);
      }
      if (!achado) parar(c.email, 'o e-mail consta como cadastrado, mas não achei o login');
      const comPerfil = await cliente.from('perfis_usuarios').select('id').eq('id', achado!).maybeSingle();
      if (comPerfil.error) parar(c.email, comPerfil.error.message);
      if (comPerfil.data) parar(c.email, 'o login já tem perfil; rode o importador de novo para recalcular o plano');
      id = achado!;
      reaproveitado = true;
    } else {
      id = criado.data.user.id;
    }
    const perfil = await cliente.from('perfis_usuarios').insert({
      id,
      nome_completo: c.nome,
      email: c.email,
      unidade_id: c.unidadeId,
      papel_governanca: c.papel,
      titular_chefia: c.titular,
      ativo: true,
    });
    if (perfil.error) {
      // Só desfaz o login se foi criado agora; um login antigo não é nosso para apagar.
      let extra = '';
      if (!reaproveitado) {
        const apagado = await cliente.auth.admin.deleteUser(id);
        if (apagado.error) extra = ` Atenção: a conta de login ${c.email} ficou sem perfil (${apagado.error.message}); a próxima execução a reaproveita.`;
      } else {
        extra = ` A conta de login ${c.email} continua sem perfil; a próxima execução tenta de novo.`;
      }
      parar(c.email, perfil.error.message, extra);
    }
    if (reaproveitado) perfisCriados++;
    else contasCriadas++;
  }
  return { contasCriadas, perfisCriados, perfisAlterados };
}
