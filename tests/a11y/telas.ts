/**
 * O QUE a varredura de acessibilidade verifica.
 *
 * Este arquivo só tem dados (nada de lógica), para ficar fácil de manter:
 *   - Página nova no RADAR? Acrescente UMA linha em `TELAS`.
 *   - Nova largura de tela ou novo tema? Acrescente em `LARGURAS` ou `TEMAS`.
 *
 * O total de testes é a multiplicação das três listas:
 *   (17 + 4) telas × 5 larguras × 3 temas = 315 combinações.
 *   As 4 telas a mais são os estados "carregando" e "erro" do Painel e de Riscos (Etapa B3).
 */

/** Os 3 temas do menu "Aparência". Precisam ser iguais a `TemaInterface` (usePreferenciasInterface.ts). */
export type Tema = 'claro' | 'escuro' | 'contraste';

/**
 * Uma tela da varredura.
 *   - `nome`: aparece no relatório ("claro › 360 px › painel").
 *   - `rota`: endereço dentro do sistema. A varredura confere que o navegador CONTINUOU nele
 *     (uma rota errada é redirecionada para o Painel e testaria a tela errada).
 *   - `titulo`: texto exato do `<h1>`. Prova que a tela certa carregou (e não, por exemplo,
 *     "Risco não encontrado").
 *   - `aba` (opcional): rótulo da aba que precisa estar selecionada, para telas abertas
 *     direto numa aba pelo endereço (`?aba=...`).
 */
export interface Tela {
  nome: string;
  rota: string;
  titulo: string;
  aba?: string;
  /**
   * Perfil de demonstração com que a tela abre (opcional). Sem ele, vale o padrão `cgov`.
   * É gravado no navegador ANTES da página abrir, como o tema. Ex.: "/usuarios" só abre para `cgov`.
   */
  perfil?: PapelGovernanca;
  /**
   * Estado simulado da camada de dados (opcional, só na demonstração). Com `'carregando'` a tela
   * fica no esqueleto de carregamento; com `'erro'`, na página de erro. É gravado no navegador
   * ANTES da página abrir (como o perfil), na chave `CHAVE_ESTADO_DEMO`.
   */
  estadoDemo?: 'carregando' | 'erro';
  /**
   * Quantas vezes clicar em "Continuar" depois de abrir a tela (opcional), para varrer uma
   * etapa do assistente. Ex.: 2 cliques no "Editar risco" levam à etapa 3 (Análise).
   */
  avancarEtapas?: number;
  /**
   * Elemento que PROVA que a etapa de destino abriu (obrigatório junto com `avancarEtapas`).
   * Sem isso, um clique que não avançasse deixaria a varredura medir a etapa errada
   * (falso verde). Ex.: na etapa 4, o campo "Alerta quando o valor for".
   */
  provaEtapa?: { papel: 'group' | 'combobox' | 'textbox'; nome: RegExp };
}

/**
 * Perfis possíveis (cópia dos 10 de `PapelGovernanca`, em `src/types/radar.types.ts`).
 * Duplicado de propósito: a varredura roda no Playwright e não importa código Vue/Vite.
 */
export type PapelGovernanca =
  | 'gestor'
  | 'coordenador_territorial'
  | 'gerente_regional'
  | 'coordenador_geral'
  | 'diretor'
  | 'presidencia'
  | 'auditoria'
  | 'cgov'
  | 'cgge'
  | 'gabin';

/**
 * Chave onde o modo demonstração guarda o perfil escolhido.
 * Igual a `CHAVE_PERFIL_DEMO` em `src/stores/authStore.ts` (mudou lá? mude aqui).
 */
export const CHAVE_PERFIL_DEMO = 'radar.perfil-demo.v1';

/**
 * Chave onde o modo demonstração guarda o estado simulado ("carregando" ou "erro").
 * Igual a `CHAVE_ESTADO_DEMO` em `src/services/dados/index.ts` (mudou lá? mude aqui).
 */
export const CHAVE_ESTADO_DEMO = 'radar.demo-estado.v1';

/** Nome do risco de demonstração usado na Ficha (Caso de Controle do Anexo II, `dadosSementeAnexoII.ts`). */
const RISCO_DEMONSTRACAO = 'Gestão e Execução de Processos Críticos da Unidade (Caso de Controle Anexo II)';

export const TELAS: Tela[] = [
  { nome: 'painel', rota: '/', titulo: 'Painel' },
  { nome: 'dar', rota: '/dar', titulo: 'Apetite a riscos (DAR)' },
  { nome: 'riscos', rota: '/riscos', titulo: 'Riscos' },
  // Ficha de um risco da semente (Caso de Controle do Anexo II), na aba inicial e na aba Bow Tie.
  { nome: 'ficha', rota: '/riscos/risco-anexo-ii-01', titulo: RISCO_DEMONSTRACAO },
  { nome: 'ficha-bowtie', rota: '/riscos/risco-anexo-ii-01?aba=bowtie', titulo: RISCO_DEMONSTRACAO, aba: 'Bow Tie' },
  // Etapa 3 (Análise) do formulário, com os botões de opção dos Quadros 4 e 5. Abre a ficha da semente.
  { nome: 'novo-etapa3', rota: '/riscos/novo?editar=risco-anexo-ii-01', titulo: 'Editar risco RADAR-2026-001', avancarEtapas: 2, provaEtapa: { papel: 'group', nome: /Probabilidade/ } },
  // Etapa 4 (Tratamento e KRI), com os campos do limite numérico de alerta do KRI (LAC-03).
  { nome: 'novo-etapa4', rota: '/riscos/novo?editar=risco-anexo-ii-01', titulo: 'Editar risco RADAR-2026-001', avancarEtapas: 3, provaEtapa: { papel: 'combobox', nome: /Alerta quando o valor for/ } },
  { nome: 'novo', rota: '/riscos/novo', titulo: 'Novo risco' },
  { nome: 'objetos', rota: '/objetos', titulo: 'Objetos de gestão' },
  // Monitoramento tem duas abas com conteúdos bem diferentes (KRIs e Plano de ação).
  { nome: 'monitoramento', rota: '/monitoramento', titulo: 'Monitoramento' },
  { nome: 'plano', rota: '/monitoramento?aba=plano', titulo: 'Monitoramento', aba: 'Plano de ação' },
  { nome: 'aprovacoes', rota: '/aprovacoes', titulo: 'Aprovações' },
  { nome: 'auditoria', rota: '/auditoria', titulo: 'Auditoria' },
  { nome: 'importar', rota: '/importar', titulo: 'Importar riscos' },
  { nome: 'sobre', rota: '/sobre', titulo: 'Sobre o RADAR' },
  // Telas da Etapa B2 (login e perfis). As duas primeiras não têm menu lateral (`meta.semMenu`).
  { nome: 'entrar', rota: '/entrar', titulo: 'Entrar no RADAR' },
  { nome: 'acesso-nao-liberado', rota: '/acesso-nao-liberado?exemplo=inativo', titulo: 'Acesso não liberado' },
  // Só a CGOV abre "Usuários e perfis".
  { nome: 'usuarios', rota: '/usuarios', titulo: 'Usuários e perfis', perfil: 'cgov' },
  // Estados de carregamento e de erro (Etapa B3). Em erro, o <h1> é o da página de erro.
  { nome: 'painel-carregando', rota: '/', titulo: 'Painel', estadoDemo: 'carregando' },
  { nome: 'painel-erro', rota: '/', titulo: 'Não foi possível carregar os riscos', estadoDemo: 'erro' },
  { nome: 'riscos-carregando', rota: '/riscos', titulo: 'Riscos', estadoDemo: 'carregando' },
  { nome: 'riscos-erro', rota: '/riscos', titulo: 'Não foi possível carregar os riscos', estadoDemo: 'erro' },
];

/** Larguras em pixels: celular pequeno, celular comum (390), tablet, notebook e monitor grande. */
export const LARGURAS: number[] = [360, 390, 768, 1280, 1920];

export const TEMAS: Tema[] = ['claro', 'escuro', 'contraste'];

/**
 * Chave onde o RADAR guarda o tema no navegador (ver `usePreferenciasInterface.ts`).
 * A varredura grava o tema aqui ANTES de abrir a página, como se o usuário já o tivesse escolhido.
 */
export const CHAVE_PREFERENCIAS = 'radar.preferencias-interface.v1';

/**
 * Conjuntos de regras do axe-core: WCAG 2.0, 2.1 e 2.2, níveis A e AA.
 * É o nível exigido pelo eMAG/gov.br para sistemas do governo federal.
 */
export const TAGS_WCAG: string[] = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
