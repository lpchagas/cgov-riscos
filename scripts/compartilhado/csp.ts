// =============================================================================
// CSP — Política de Segurança de Conteúdo do RADAR (fonte única da verdade)
// =============================================================================
// O que é a CSP? Um cabeçalho HTTP que diz ao navegador DE ONDE a página pode
// carregar scripts, estilos, fontes, imagens e para QUEM pode enviar dados.
// Se um invasor conseguir injetar um <script> malicioso, o navegador recusa.
//
// Este arquivo é usado pelo teste automatizado e pelo template do Nginx
// (nginx/default.conf.template) deve conter exatamente o mesmo texto.
// =============================================================================

/** Servidor do Padrão Digital de Governo (folha de estilo e fontes do gov.br). */
const CDN_GOVBR = 'https://cdngovbr-ds.estaleiro.serpro.gov.br';

/**
 * Monta a CSP.
 * @param origemSupabase endereço do Supabase que o navegador pode chamar
 *   (ex.: 'https://abc.supabase.co'). Vazio = modo demonstração, sem banco:
 *   o app só pode falar com o próprio servidor.
 */
export function montarCsp(origemSupabase: string): string {
  // Com origem vazia não deixamos espaço sobrando: "connect-src 'self';".
  const conexoes = origemSupabase ? `'self' ${origemSupabase}` : "'self'";
  return [
    "default-src 'self'",
    // Scripts só do próprio servidor: NADA de 'unsafe-inline' aqui.
    "script-src 'self'",
    // 'unsafe-inline' só em estilos: o Vue grava style="..." em alguns elementos.
    `style-src 'self' 'unsafe-inline' ${CDN_GOVBR}`,
    `font-src 'self' data: ${CDN_GOVBR}`,
    "img-src 'self' data:",
    `connect-src ${conexoes}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

/** Demais cabeçalhos de segurança (a CSP é separada porque depende da origem). */
export const CABECALHOS_SEGURANCA: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
