/// <reference types="vite/client" />
/**
 * ============================================================================
 * CLIENTE SUPABASE COM FALLBACK LOCAL SEGURO PARA DEMONSTRAÇÕES À CGTI
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Quando você configurar as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * no arquivo .env, o aplicativo se conecta ao banco de dados PostgreSQL na nuvem.
 * Caso contrário (por exemplo, durante uma apresentação offline para a CGTI),
 * o sistema opera automaticamente com persistência local no navegador
 * (localStorage) pré-carregada com o Caso de Controle do Anexo II!
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient: SupabaseClient | null = isSupabaseConfigurado
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // Nós mesmos tratamos o link do e-mail na tela /entrar/retorno (authStore.concluirRetorno),
        // então o cliente NÃO deve procurar sozinho a sessão na barra de endereço.
        detectSessionInUrl: false,
        // Guarda a sessão no navegador para a pessoa não precisar entrar a cada visita.
        persistSession: true,
        // Renova o token de acesso sozinho antes de vencer.
        autoRefreshToken: true,
      },
    })
  : null;

// IMPORTANTE: aqui só entra a chave ANON (pública). A chave `service_role` NUNCA vai para o front.
