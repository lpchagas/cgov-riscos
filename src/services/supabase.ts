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
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
