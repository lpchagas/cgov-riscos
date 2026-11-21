/**
 * REGRAS DA CÓPIA CIFRADA E DA RESTAURAÇÃO — funções puras
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Aqui ficam as decisões da cópia de segurança que não precisam de banco,
 * disco nem relógio: o nome do arquivo, quais cópias antigas apagar, como
 * esconder a senha de uma conexão, a linha do registro e "há quantas horas foi
 * a última cópia". Quem lê disco e chama programas é o index.ts.
 *
 * Por serem puras, são testadas no Vitest (tests/unit/copiaRegras.spec.ts).
 *
 * Datas: o nome da cópia usa a data de BRASÍLIA (America/Sao_Paulo). O Brasil
 * não tem horário de verão desde 2019, então meia-noite de Brasília é sempre
 * 03:00 em UTC (deslocamento fixo -03:00).
 * ============================================================================
 */

const FUSO = 'America/Sao_Paulo';
const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

/** Padrão do nome: radar-AAAA-MM-DD.tar.age (ex.: radar-2026-11-17.tar.age). */
const PADRAO_NOME = /^radar-(\d{4})-(\d{2})-(\d{2})\.tar\.age$/;

/** Quantas cópias diárias guardar e por quantos dias guardar as semanais. */
export const DIARIAS_GUARDADAS = 14;
export const DIAS_DAS_SEMANAIS = 60;

/** Partes da data/hora em Brasília (ano, mês, dia, hora, minuto, segundo), com 2 dígitos. */
function partesEmBrasilia(data: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(fmt.formatToParts(data).map((p) => [p.type, p.value]));
}

/**
 * Nome do arquivo da cópia do dia (data local de Brasília).
 * Ex.: nomeDaCopia(new Date('2026-11-17T23:30:00-03:00')) → 'radar-2026-11-17.tar.age'
 * (em UTC já seria dia 18, mas o que vale é o dia de Brasília).
 */
export function nomeDaCopia(data: Date): string {
  const p = partesEmBrasilia(data);
  return `radar-${p.year}-${p.month}-${p.day}.tar.age`;
}

/**
 * Lê a data de volta do nome: meia-noite de Brasília daquele dia.
 * Devolve null para nomes fora do padrão (ex.: 'notas.txt') ou datas
 * impossíveis (ex.: 30 de fevereiro).
 */
export function dataDaCopia(nome: string): Date | null {
  const m = PADRAO_NOME.exec(nome);
  if (!m) return null;
  const [, ano, mes, dia] = m;
  const data = new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`);
  // Confere a "volta": 2026-02-30 viraria 2026-03-02 e é recusado.
  if (Number.isNaN(data.getTime()) || nomeDaCopia(data) !== nome) return null;
  return data;
}

/**
 * Semana ISO (segunda a domingo) de uma data de cópia, como texto "2026-W44".
 * A semana ISO pertence ao ano da sua quinta-feira.
 */
function semanaIso(data: Date): string {
  // Trabalhamos com o dia de Brasília como se fosse uma data UTC "pura".
  const [ano, mes, dia] = nomeDaCopia(data).slice(6, 16).split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const diaDaSemana = (d.getUTCDay() + 6) % 7; // segunda = 0 ... domingo = 6
  d.setUTCDate(d.getUTCDate() - diaDaSemana + 3); // vai para a quinta-feira
  const anoIso = d.getUTCFullYear();
  const primeiraQuinta = new Date(Date.UTC(anoIso, 0, 4));
  const semana =
    1 + Math.round(((d.getTime() - primeiraQuinta.getTime()) / DIA_MS - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7);
  return `${anoIso}-W${String(semana).padStart(2, '0')}`;
}

/**
 * Rotação das cópias: quais arquivos apagar.
 *   1. As 14 cópias mais recentes ficam sempre.
 *   2. Das demais, fica só a MAIS NOVA de cada semana ISO, se tiver até 60 dias.
 *   3. O resto é apagado.
 *   4. Nomes fora do padrão (ex.: 'notas.txt', 'registro.log') NUNCA são apagados.
 * Ex.: 30 diárias de 18/10 a 16/11, hoje 17/11 → ficam 03/11 a 16/11 e as
 * semanais 18/10, 25/10, 01/11 e 02/11; as outras 12 são apagadas.
 */
export function escolherCopiasParaApagar(nomes: string[], hoje: Date): string[] {
  // Só as cópias válidas, da mais nova para a mais antiga (sem repetir nome).
  const copias = [...new Set(nomes)]
    .map((nome) => ({ nome, data: dataDaCopia(nome) }))
    .filter((c): c is { nome: string; data: Date } => c.data !== null)
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  // A idade é contada a partir da meia-noite de Brasília de "hoje".
  const inicioDeHoje = dataDaCopia(nomeDaCopia(hoje)) as Date;
  const semanasJaGuardadas = new Set<string>();
  const apagar: string[] = [];

  copias.forEach((c, posicao) => {
    if (posicao < DIARIAS_GUARDADAS) return; // regra 1
    const idadeEmDias = (inicioDeHoje.getTime() - c.data.getTime()) / DIA_MS;
    const semana = semanaIso(c.data);
    if (idadeEmDias <= DIAS_DAS_SEMANAIS && !semanasJaGuardadas.has(semana)) {
      semanasJaGuardadas.add(semana); // regra 2 (a primeira vista é a mais nova)
      return;
    }
    apagar.push(c.nome); // regra 3
  });
  return apagar;
}

/**
 * Esconde usuário e senha de qualquer conexão no texto.
 *   'postgresql://postgres.abc:S3nh@F0rte@host:5432/db' → 'postgresql://***:***@host:5432/db'
 *   'host=h password=segredo'                           → 'host=h password=***'
 * O trecho até a ÚLTIMA "@" antes do nome da máquina é trocado, então uma
 * senha com "@" dentro também some inteira.
 */
export function mascararConexao(texto: string): string {
  return texto
    .replace(/postgres(?:ql)?:\/\/[^\s/?#]*@/gi, 'postgresql://***:***@')
    .replace(/(password|PGPASSWORD)=\S+/gi, '$1=***');
}

/**
 * Uma linha do registro (registro.log): data/hora de Brasília, OK ou ERRO,
 * tamanho ou mensagem. Nunca guarda dados; o erro passa por mascararConexao
 * e vira uma linha só.
 * Ex.: '2026-11-17 15:00:00 (Brasília) OK 2048 bytes'
 */
export function linhaDeRegistro(r: { quando: Date; ok: boolean; bytes?: number; erro?: string }): string {
  const p = partesEmBrasilia(r.quando);
  const quando = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} (Brasília)`;
  if (r.ok) return `${quando} OK ${r.bytes ?? 0} bytes`;
  const erro = mascararConexao(r.erro ?? 'erro desconhecido').replace(/\s+/g, ' ').trim();
  return `${quando} ERRO ${erro}`;
}

/**
 * Há quantas horas foi a última cópia (contando da meia-noite de Brasília do
 * dia que está no nome). null se não houver nenhuma cópia.
 * Ex.: última 'radar-2026-11-16.tar.age', agora 17/11 12:00 → 36.
 */
export function horasDesdeUltimaCopia(nomes: string[], agora: Date): number | null {
  const datas = nomes.map(dataDaCopia).filter((d): d is Date => d !== null);
  if (datas.length === 0) return null;
  const maisNova = Math.max(...datas.map((d) => d.getTime()));
  return (agora.getTime() - maisNova) / HORA_MS;
}

/**
 * Lê o arquivo de configuração no formato CHAVE=valor (como um .env).
 * Ignora linhas vazias e comentários (#); tira aspas simples ou duplas.
 */
export function lerConfig(texto: string): Record<string, string> {
  const config: Record<string, string> = {};
  for (const linhaBruta of texto.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith('#')) continue;
    const igual = linha.indexOf('=');
    if (igual <= 0) continue;
    const chave = linha.slice(0, igual).trim();
    let valor = linha.slice(igual + 1).trim();
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    config[chave] = valor;
  }
  return config;
}

/**
 * A permissão do arquivo é exatamente 600 (só o dono lê e escreve)?
 * Recebe o `mode` do fs.statSync. Ex.: 0o100600 → true; 0o100644 → false.
 */
export function permissaoESegura(mode: number): boolean {
  return (mode & 0o777) === 0o600;
}

/**
 * Separa a conexão em variáveis PG* (as que o pg_dump/pg_restore/psql leem).
 * Assim a senha vai por variável de ambiente e NUNCA aparece na linha de
 * comando (que qualquer usuário da máquina veria com `ps`).
 * A senha pode vir "codificada" na URL (%40 = @): aqui ela é decodificada.
 */
export function variaveisDeConexao(conexao: string): Record<string, string> {
  let url: URL;
  try {
    url = new URL(conexao);
  } catch {
    throw new Error('RADAR: a conexão não é um endereço válido (formato esperado: postgresql://usuario:senha@maquina:porta/banco).');
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    // Não repetimos o texto recebido: ele poderia conter uma senha.
    throw new Error('RADAR: a conexão precisa começar com postgresql:// (ou postgres://).');
  }
  const variaveis: Record<string, string> = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres',
  };

  // TLS (a "cifra" da conexão). Sem isso, o cliente do PostgreSQL usa o modo
  // "prefer": cifra se o servidor aceitar, mas não exige nem confere quem é o
  // servidor. Regras:
  //   - se a URL trouxer ?sslmode=..., respeitamos (ex.: verify-full, que também
  //     confere o certificado do servidor);
  //   - sem sslmode e com banco REMOTO (a nuvem), exigimos "require";
  //   - banco LOCAL (127.0.0.1/localhost) fica sem TLS: o Supabase local não usa.
  const pedido = url.searchParams.get('sslmode');
  if (pedido !== null) {
    if (!MODOS_SSL.has(pedido)) {
      // Não repetimos a URL: ela tem a senha.
      throw new Error(`RADAR: sslmode inválido na conexão (use um destes: ${[...MODOS_SSL].join(', ')}).`);
    }
    // Banco remoto: só modos que GARANTEM a cifra. "disable" nunca cifra;
    // "allow" e "prefer" podem cair para conexão sem cifra.
    if (!HOSTS_LOCAIS.has(url.hostname) && !MODOS_SSL_REMOTOS.has(pedido)) {
      throw new Error(`RADAR: com o banco da nuvem, a conexão precisa de TLS (use sslmode=${[...MODOS_SSL_REMOTOS].join(', ')}).`);
    }
    variaveis.PGSSLMODE = pedido;
  } else if (!HOSTS_LOCAIS.has(url.hostname)) {
    variaveis.PGSSLMODE = 'require';
  }
  return variaveis;
}

/** Modos de TLS aceitos pelo cliente do PostgreSQL (libpq). */
const MODOS_SSL = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);

/** Modos que garantem TLS: os únicos aceitos com banco remoto. */
const MODOS_SSL_REMOTOS = new Set(['require', 'verify-ca', 'verify-full']);

/** Endereços que apontam para o próprio computador (banco local). */
const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** Uma linha da contagem por tabela (ex.: { tabela: 'public.riscos', linhas: 42 }). */
export interface Contagem {
  tabela: string;
  linhas: number;
}

/** O banco está "zerado" (todas as tabelas contadas com 0 linhas)? */
export function bancoEstaVazio(contagens: Contagem[]): boolean {
  return contagens.every((c) => c.linhas === 0);
}
