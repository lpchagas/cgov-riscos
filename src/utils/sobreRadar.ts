/**
 * ============================================================================
 * INFORMAÇÕES INSTITUCIONAIS DO RADAR (`src/utils/sobreRadar.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O rodapé e a página "Sobre o RADAR" (`/sobre`) mostram as MESMAS
 * informações (unidades, normas, fontes de dados, painéis). Se cada tela
 * tivesse a sua cópia, um dia elas iam discordar. Por isso as listas moram
 * AQUI, num lugar só, e as duas telas apenas leem.
 *
 * Para incluir uma norma ou trocar um link, edite a lista — o HTML não muda.
 *
 * PENDENTE (decisão da CGOV): e-mail de contato e endereços dos Painéis
 * Integrados e das redes sociais. Item sem `href` aparece como texto simples
 * (link "vazio" confundiria quem usa leitor de tela).
 */
import { version } from '../../package.json';

/** Versão do sistema, lida do `package.json` (muda a cada entrega). */
export const VERSAO_RADAR = version;

/** Endereço do código-fonte (repositório Git do projeto). */
export const REPOSITORIO_RADAR = 'https://github.com/lpchagas/cgov-riscos';

export const ANO_RODAPE = 2026;

export interface Unidade {
  sigla: string;
  nome: string;
  /** O que a unidade faz no RADAR (usado na página Sobre). */
  papel: string;
}

/** Unidades e instância colegiada responsáveis pelo RADAR. */
export const UNIDADES_RADAR: Unidade[] = [
  {
    sigla: 'CGGE',
    nome: 'Coordenação-Geral de Governança e Gestão Estratégica',
    papel: 'Supervisiona a gestão de riscos e a elaboração do Plano de Gestão de Riscos.',
  },
  {
    sigla: 'CGOV',
    nome: 'Coordenação de Governança',
    papel: 'Mantém o RADAR, consolida as fichas das unidades e apoia a 1ª Linha.',
  },
  {
    sigla: 'CTGRIC',
    nome: 'Comitê Técnico de Governança, Riscos, Integridade e Controles',
    papel: 'Acompanha a gestão de riscos e as ações de integridade.',
  },
];

export interface Norma {
  nome: string;
  assunto: string;
  /** Onde a norma aparece no sistema, em linguagem simples. */
  usoNoRadar: string;
}

/**
 * Normas correlatas. As duas minutas SEI são a base do Regime B; as demais
 * são citadas por elas (ver `docs/01-normativos/`).
 */
export const NORMAS_RADAR: Norma[] = [
  {
    nome: 'Política de Gestão de Riscos — RADAR (Minuta SEI 024241420)',
    assunto: 'Princípios, papéis das 3 Linhas e fluxo de aprovação em 3 degraus.',
    usoNoRadar: 'Perfis, caixa de Aprovações e trilha de Auditoria.',
  },
  {
    nome: 'Metodologia de Gestão de Riscos (Minuta SEI 024421455)',
    assunto: 'Etapas da gestão de riscos, Quadros 1 a 8 e Anexo III (DAR).',
    usoNoRadar: 'Matriz assimétrica (Quadro 7), fator dos controles (Quadro 6) e níveis (Quadro 8).',
  },
  {
    nome: 'Portaria ICMBio nº 253/2026 — Programa Integra+',
    assunto: 'Programa de integridade do ICMBio.',
    usoNoRadar: 'Teste de Integridade e as 6 subcategorias do Quadro 3.',
  },
  {
    nome: 'Instrução Normativa Conjunta MP/CGU nº 01/2016',
    assunto: 'Controles internos, gestão de riscos e governança no Poder Executivo federal.',
    usoNoRadar: 'Base para o Plano de Gestão de Riscos.',
  },
  {
    nome: 'Decreto nº 9.203/2017',
    assunto: 'Política de governança da administração pública federal.',
    usoNoRadar: 'Instrumentos de gestão de riscos mantidos pela CGOV.',
  },
  {
    nome: 'Decreto nº 11.529/2023',
    assunto: 'Sistema de Integridade, Transparência e Acesso à Informação (SITAI).',
    usoNoRadar: 'Atuação conjunta com o CTGRIC nas ações de integridade.',
  },
];

export interface FonteDados {
  fonte: string;
  quemAlimenta: string;
}

/** De onde vem cada informação exibida no sistema. */
export const FONTES_DADOS_RADAR: FonteDados[] = [
  { fonte: 'Fichas de risco (Bow Tie, controles e plano de ação)', quemAlimenta: 'Unidades — 1ª Linha' },
  { fonte: 'Validação das fichas', quemAlimenta: 'Coordenações-Gerais — 2º degrau' },
  { fonte: 'Homologação e inclusão no Plano', quemAlimenta: 'Diretorias — 3º degrau' },
  { fonte: 'Apetite por categoria (DAR)', quemAlimenta: 'Deliberação do CIG' },
  { fonte: 'Leituras dos indicadores (KRIs)', quemAlimenta: 'Responsáveis de cada indicador' },
  { fonte: 'Análise preliminar (importação)', quemAlimenta: 'CGOV — skill cgov-gestao-riscos-v4' },
];

/** Painéis irmãos do RADAR. `href` vazio = ainda sem endereço definido. */
export const PAINEIS_INTEGRADOS: { rotulo: string; href?: string }[] = [
  { rotulo: 'Painéis Dinâmicos do ICMBio' },
  { rotulo: 'Painéis de Indicadores de Gestão de Pessoas' },
  { rotulo: 'Indicadores do Programa de Gestão e Desempenho' },
  { rotulo: 'DIGITECA ICMBio — Biblioteca de Listas, Padrões e Soluções Digitais' },
];

/**
 * Redes sociais oficiais do ICMBio. Preencha `href` com o endereço oficial
 * confirmado pela Ascom; sem `href`, o ícone aparece sem ser clicável.
 */
export const REDES_SOCIAIS: { rotulo: string; icone: string; href?: string }[] = [
  { rotulo: 'Instagram do ICMBio', icone: 'fa-brands fa-instagram' },
  { rotulo: 'YouTube do ICMBio', icone: 'fa-brands fa-youtube' },
  { rotulo: 'Facebook do ICMBio', icone: 'fa-brands fa-facebook-f' },
  { rotulo: 'LinkedIn do ICMBio', icone: 'fa-brands fa-linkedin-in' },
];

/** Seções da página Sobre — também usadas como atalhos (âncoras) no rodapé. */
export const SECOES_SOBRE = [
  { id: 'o-que-e', titulo: 'O que é o RADAR' },
  { id: 'normas', titulo: 'Normas correlatas' },
  { id: 'fontes-de-dados', titulo: 'Fontes de dados' },
  { id: 'governanca', titulo: 'Governança e contato' },
  { id: 'paineis', titulo: 'Painéis relacionados' },
] as const;
