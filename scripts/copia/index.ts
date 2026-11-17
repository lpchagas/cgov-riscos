/**
 * CÓPIA CIFRADA E RESTAURAÇÃO — `npm run copia:<subcomando>`
 * ============================================================================
 * EXPLICAÇÃO DIDÁTICA:
 * Este programa faz a cópia de segurança diária do banco do RADAR, cifrada
 * com a CHAVE PÚBLICA do `age` (quem tiver só a pasta das cópias não consegue
 * ler os dados), e restaura uma cópia num Supabase LOCAL para provar que ela
 * funciona. Guia passo a passo: docs/02-arquitetura-cgti/guia-copia-restauracao.md
 *
 * Subcomandos:
 *   npm run copia:fazer
 *       pg_dump (só dados) de `public` + `auth.users`/`auth.identities` →
 *       .tar → cifra com age → RADAR_COPIA_DESTINO/radar-AAAA-MM-DD.tar.age;
 *       depois apaga as cópias antigas (rotação) e grava uma linha no
 *       registro.log.
 *   npm run copia:restaurar -- <arquivo.tar.age> --identidade <chave privada> [--destino <conexão local>]
 *       decifra em /dev/shm e restaura no banco LOCAL (zerado sem semente).
 *   npm run copia:conferir
 *       diz há quantas horas foi a última cópia; sai com código 1 se > 36 h.
 *   npm run copia:contar -- [<conexão>]
 *       linhas por tabela (public + auth.users/identities), para comparar a
 *       origem com a restauração. Sem <conexão>, usa a do config.env.
 *
 * Configuração: ~/.config/radar-copias/config.env (permissão 600 obrigatória)
 *   RADAR_COPIA_CONEXAO=postgresql://usuario:senha@maquina:porta/postgres
 *   RADAR_COPIA_DESTINO=/home/<você>/radar-copias
 *   RADAR_COPIA_CHAVE_PUBLICA=age1...
 *   RADAR_COPIA_IMAGEM=postgres:17            (opcional; imagem Docker do pg_dump)
 *
 * Segurança (regras deste arquivo):
 *   - NENHUMA linha imprime a conexão: toda mensagem de erro passa por
 *     mascararConexao; a senha vai para o Docker por variável de ambiente
 *     (PGPASSWORD), nunca na linha de comando.
 *   - Dados em claro só existem em /dev/shm (memória RAM, não vai para o
 *     disco) e são apagados no `finally`, mesmo se algo der errado.
 * ============================================================================
 */
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { eEnderecoLocal } from '../sync-estrutura/destino';
import {
  bancoEstaVazio,
  escolherCopiasParaApagar,
  horasDesdeUltimaCopia,
  lerConfig,
  linhaDeRegistro,
  mascararConexao,
  nomeDaCopia,
  permissaoESegura,
  variaveisDeConexao,
  type Contagem,
} from './regras';

const ARQUIVO_CONFIG = join(homedir(), '.config', 'radar-copias', 'config.env');
const LIMITE_HORAS = 36;

/**
 * Destino padrão da restauração: o Supabase LOCAL do CLI (porta 54322), com o
 * usuário `supabase_admin` (superusuário local, necessário para desligar os
 * gatilhos). A senha "postgres" é a padrão pública do Supabase CLI local:
 * não é segredo e não abre nada fora deste computador.
 */
const DESTINO_LOCAL_PADRAO = 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';

/** Erro "esperado" (mensagem já pronta para a pessoa ler). */
class ErroRadar extends Error {}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/**
 * Lê o config.env. Recusa se o arquivo não existir ou se a permissão não for
 * 600 (o arquivo guarda a senha do banco: só o dono pode ler).
 */
function carregarConfig(): Record<string, string> {
  if (!existsSync(ARQUIVO_CONFIG)) {
    throw new ErroRadar(
      `RADAR: não achei ${ARQUIVO_CONFIG}. Crie o arquivo seguindo o guia ` +
        `docs/02-arquitetura-cgti/guia-copia-restauracao.md (seção "Configuração").`,
    );
  }
  if (!permissaoESegura(statSync(ARQUIVO_CONFIG).mode)) {
    throw new ErroRadar(
      `RADAR: ${ARQUIVO_CONFIG} precisa de permissão 600 (só você lê e escreve). ` +
        `Rode: chmod 600 ${ARQUIVO_CONFIG}`,
    );
  }
  return lerConfig(readFileSync(ARQUIVO_CONFIG, 'utf8'));
}

/** Pega uma chave obrigatória do config (sem nunca imprimir o valor). */
function exigir(config: Record<string, string>, chave: string): string {
  const valor = config[chave];
  if (!valor) throw new ErroRadar(`RADAR: falta ${chave} em ${ARQUIVO_CONFIG}.`);
  return valor;
}

/** Imagem Docker com pg_dump/pg_restore/psql 17 (igual ou mais nova que o servidor). */
function imagemPostgres(config: Record<string, string> = {}): string {
  return config.RADAR_COPIA_IMAGEM || 'postgres:17';
}

// ---------------------------------------------------------------------------
// Programas externos
// ---------------------------------------------------------------------------

/**
 * Confere se o programa `age` está instalado (ele cifra e decifra as cópias).
 * Comando: `age --version` (só imprime a versão).
 */
function exigirAge(): void {
  const r = spawnSync('age', ['--version'], { stdio: 'ignore' });
  if (r.error || r.status !== 0) {
    throw new ErroRadar(
      'RADAR: o programa "age" não foi encontrado. Instale o age: sudo apt install age ' +
        '(passo a passo em docs/02-arquitetura-cgti/guia-copia-restauracao.md).',
    );
  }
}

/** Roda um programa; se falhar, lança erro com a saída de erro MASCARADA. */
function rodar(programa: string, argumentos: string[], opcoes: SpawnSyncOptions = {}): string {
  const r = spawnSync(programa, argumentos, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opcoes });
  if (r.error) throw new ErroRadar(mascararConexao(`RADAR: não consegui rodar "${programa}": ${r.error.message}`));
  if (r.status !== 0) {
    const detalhe = String(r.stderr ?? '').trim() || `código de saída ${r.status}`;
    throw new ErroRadar(mascararConexao(`RADAR: "${programa}" falhou: ${detalhe}`));
  }
  return String(r.stdout ?? '');
}

/**
 * Roda uma ferramenta do PostgreSQL (pg_dump, pg_restore ou psql) dentro de um
 * contêiner Docker descartável, para não precisar instalar o PostgreSQL 17 no
 * computador.
 *
 * Comando montado:
 *   docker run --rm --network host --user <seu uid>:<seu gid>
 *     -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE
 *     [-v <pasta em /dev/shm>:/copia] <imagem> <ferramenta> <argumentos>
 *   --rm             apaga o contêiner ao terminar;
 *   --network host   o contêiner usa a rede do computador (enxerga 127.0.0.1);
 *   --user           os arquivos gerados ficam com o seu usuário (não root);
 *   -e PGPASSWORD    sem "=valor": o Docker copia o valor do NOSSO ambiente,
 *                    então a senha não aparece na linha de comando (`ps`);
 *   -v               monta a pasta temporária em /copia dentro do contêiner.
 */
function rodarPostgres(
  imagem: string,
  conexao: string,
  ferramenta: 'pg_dump' | 'pg_restore' | 'psql',
  argumentos: string[],
  pastaMontada?: string,
): string {
  const pg = variaveisDeConexao(conexao);
  const usuario = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
  const docker = ['run', '--rm', '--network', 'host', '--user', usuario];
  for (const nome of Object.keys(pg)) docker.push('-e', nome);
  if (pastaMontada) docker.push('-v', `${pastaMontada}:/copia`);
  docker.push(imagem, ferramenta, ...argumentos);
  return rodar('docker', docker, { env: { ...process.env, ...pg } });
}

/**
 * Bash com `pipefail`: se QUALQUER parte do "cano" (|) falhar, o comando
 * inteiro falha (sem isso, um erro do tar seria escondido pelo age).
 * Os valores vão como $1, $2... (nunca colados no texto do comando).
 */
function rodarCano(script: string, valores: string[], opcoes: SpawnSyncOptions = {}): void {
  rodar('bash', ['-o', 'pipefail', '-c', script, 'radar-copia', ...valores], opcoes);
}

/** Cria uma pasta temporária em /dev/shm (memória RAM), só do dono (700). */
function pastaTemporariaNaMemoria(): string {
  if (!existsSync('/dev/shm')) {
    throw new ErroRadar('RADAR: /dev/shm não existe; sem ele não há onde guardar os dados em claro só na memória.');
  }
  return mkdtempSync(join('/dev/shm', 'radar-copia-')); // mkdtemp já cria com permissão 700
}

// ---------------------------------------------------------------------------
// Contagem de linhas por tabela
// ---------------------------------------------------------------------------

/**
 * SQL da contagem: para cada tabela de `public` (e auth.users/identities),
 * roda "select count(*)" (via query_to_xml, que executa uma consulta montada
 * como texto). Só devolve NOMES e NÚMEROS: nunca o conteúdo das linhas.
 */
const SQL_CONTAGEM = `
select schemaname || '.' || tablename,
       (xpath('/row/n/text()',
              query_to_xml(format('select count(*) as n from %I.%I', schemaname, tablename),
                           false, true, '')))[1]::text
from pg_tables
where schemaname = 'public'
   or (schemaname = 'auth' and tablename in ('users', 'identities'))
order by 1`;

/** Conta as linhas por tabela (comando: psql -X -A -t -c <SQL_CONTAGEM>). */
function contar(imagem: string, conexao: string): Contagem[] {
  const saida = rodarPostgres(imagem, conexao, 'psql', [
    '-X', // não lê ~/.psqlrc
    '-A', // sem alinhamento
    '-t', // sem cabeçalho/rodapé
    '-F', '\t', // separa colunas por TAB
    '-v', 'ON_ERROR_STOP=1',
    '-c', SQL_CONTAGEM,
  ]);
  return saida
    .split('\n')
    .filter((l) => l.includes('\t'))
    .map((l) => {
      const [tabela, linhas] = l.split('\t');
      return { tabela, linhas: Number(linhas) };
    });
}

function imprimirContagens(contagens: Contagem[]): void {
  for (const c of contagens) console.log(`${c.tabela.padEnd(40)} ${c.linhas}`);
}

// ---------------------------------------------------------------------------
// Subcomandos
// ---------------------------------------------------------------------------

/** copia:fazer — gera a cópia cifrada do dia, aplica a rotação e registra. */
function fazer(): void {
  const config = carregarConfig();
  const conexao = exigir(config, 'RADAR_COPIA_CONEXAO');
  const destino = resolve(exigir(config, 'RADAR_COPIA_DESTINO'));
  const chavePublica = exigir(config, 'RADAR_COPIA_CHAVE_PUBLICA');
  const imagem = imagemPostgres(config);
  exigirAge();

  mkdirSync(destino, { recursive: true, mode: 0o700 });
  const registro = join(destino, 'registro.log');
  const agora = new Date();
  const nome = nomeDaCopia(agora);
  const final = join(destino, nome);
  const parcial = join(destino, `.${nome}.parcial`); // só vira o nome final se tudo der certo
  let temporaria: string | null = null;

  try {
    temporaria = pastaTemporariaNaMemoria();

    // (1) pg_dump dos DADOS do esquema public, em formato "custom" (binário,
    //     comprimido, lido pelo pg_restore). A estrutura vem das migrações.
    rodarPostgres(imagem, conexao, 'pg_dump',
      ['--format=custom', '--data-only', '--schema=public', '--file=/copia/public.dump'], temporaria);

    // (2) pg_dump dos DADOS das contas: auth.users e auth.identities
    //     (perfis_usuarios aponta para auth.users, então elas vão juntas).
    rodarPostgres(imagem, conexao, 'pg_dump',
      ['--format=custom', '--data-only', '--table=auth.users', '--table=auth.identities',
        '--file=/copia/auth.dump'], temporaria);

    // (3) tar junta os dois arquivos e manda pelo "cano" direto para o age,
    //     que cifra com a chave PÚBLICA e grava no destino. O .tar em claro
    //     nunca é gravado em disco.
    //     tar -C <pasta> -cf - ...  → empacota e escreve na saída padrão
    //     age -r <chave> -o <saida> → cifra para quem tem a chave privada
    rodarCano('tar -C "$1" -cf - auth.dump public.dump | age -r "$2" -o "$3"', [temporaria, chavePublica, parcial]);
    renameSync(parcial, final);

    const bytes = statSync(final).size;
    appendFileSync(registro, `${linhaDeRegistro({ quando: agora, ok: true, bytes })}\n`, { mode: 0o600 });
    console.log(`✔ Cópia gravada: ${final} (${bytes} bytes)`);

    // (4) Rotação: 14 diárias + a mais nova de cada semana até 60 dias.
    for (const velha of escolherCopiasParaApagar(readdirSync(destino), agora)) {
      rmSync(join(destino, velha), { force: true });
      console.log(`  apagada (rotação): ${velha}`);
    }
  } catch (e) {
    const mensagem = mascararConexao(e instanceof Error ? e.message : String(e));
    appendFileSync(registro, `${linhaDeRegistro({ quando: agora, ok: false, erro: mensagem })}\n`, { mode: 0o600 });
    throw new ErroRadar(mensagem);
  } finally {
    // Apaga os dumps em claro da memória e o arquivo parcial (se sobrou).
    if (temporaria) rmSync(temporaria, { recursive: true, force: true });
    rmSync(parcial, { force: true });
  }
}

/** Lê o valor de uma opção "--nome valor" da linha de comando. */
function opcao(args: string[], nome: string): string | undefined {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
}

/** copia:restaurar — decifra em /dev/shm e restaura no Supabase LOCAL. */
function restaurar(args: string[]): void {
  const arquivo = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const identidade = opcao(args, '--identidade');
  const destino = opcao(args, '--destino') ?? DESTINO_LOCAL_PADRAO;
  // A configuração é opcional aqui (só para a imagem Docker): a restauração não usa a conexão da origem.
  const imagem = imagemPostgres(existsSync(ARQUIVO_CONFIG) ? carregarConfig() : {});

  if (!arquivo || !existsSync(arquivo)) {
    throw new ErroRadar('RADAR: informe o arquivo da cópia. Ex.: npm run copia:restaurar -- ~/radar-copias/radar-2026-11-17.tar.age --identidade <chave privada>');
  }
  if (!identidade || !existsSync(identidade)) {
    throw new ErroRadar('RADAR: informe o arquivo da chave PRIVADA com --identidade <arquivo> (ver o guia).');
  }
  // Trava: restauração só no banco deste computador (mesma regra do sync:estrutura).
  if (!eEnderecoLocal(destino)) {
    throw new ErroRadar('RADAR: a restauração só é aceita no banco LOCAL (127.0.0.1/localhost). Nunca restaure por cima da nuvem.');
  }
  exigirAge();

  // Trava: o banco local precisa estar zerado (migrações aplicadas, sem semente).
  if (!bancoEstaVazio(contar(imagem, destino))) {
    throw new ErroRadar(
      'RADAR: o banco local não está vazio. Rode antes: npx supabase db reset --no-seed ' +
        '(zera o banco local e aplica só as migrações, sem os dados de demonstração).',
    );
  }

  let temporaria: string | null = null;
  try {
    temporaria = pastaTemporariaNaMemoria();

    // (1) age decifra com a chave PRIVADA e o tar desempacota direto na
    //     pasta da memória (/dev/shm). Nada em claro vai para o disco.
    //     age -d -i <chave> <arquivo> → decifra e escreve na saída padrão
    //     tar -x -C <pasta>           → desempacota a entrada padrão na pasta
    rodarCano('age -d -i "$1" "$2" | tar -x -C "$3"', [identidade, resolve(arquivo), temporaria], {
      stdio: ['inherit', 'pipe', 'pipe'], // se a chave tiver senha, o age pergunta no terminal
    });

    // (2) pg_restore restaura PRIMEIRO as contas (auth) e DEPOIS public
    //     (perfis_usuarios aponta para auth.users).
    //     --data-only          só dados (a estrutura já veio das migrações);
    //     --disable-triggers   desliga os gatilhos durante a carga: a trilha de
    //                          auditoria e o recálculo NÃO disparam (a cópia já
    //                          traz a auditoria original, idêntica);
    //     --single-transaction tudo ou nada (se falhar, nada fica pela metade);
    //     --dbname             o nome do banco (a senha vai por PGPASSWORD).
    const nomeBanco = variaveisDeConexao(destino).PGDATABASE;
    for (const dump of ['auth.dump', 'public.dump']) {
      rodarPostgres(imagem, destino, 'pg_restore',
        ['--data-only', '--disable-triggers', '--single-transaction', '--no-owner',
          `--dbname=${nomeBanco}`, `/copia/${dump}`], temporaria);
      console.log(`✔ Restaurado: ${dump.replace('.dump', '')}`);
    }
  } finally {
    // Apaga os arquivos decifrados da memória, dê certo ou não.
    if (temporaria) rmSync(temporaria, { recursive: true, force: true });
  }

  console.log('\nContagem no banco local depois da restauração (compare com a origem):');
  imprimirContagens(contar(imagem, destino));
}

/** copia:conferir — há quantas horas foi a última cópia? */
function conferir(): void {
  const config = carregarConfig();
  const destino = resolve(exigir(config, 'RADAR_COPIA_DESTINO'));
  const nomes = existsSync(destino) ? readdirSync(destino) : [];
  const horas = horasDesdeUltimaCopia(nomes, new Date());
  if (horas === null) {
    console.error(`✘ Nenhuma cópia encontrada em ${destino}.`);
    process.exit(1);
  }
  const texto = `Última cópia há ${horas.toFixed(1)} horas.`;
  if (horas > LIMITE_HORAS) {
    console.error(`✘ ${texto} Passou de ${LIMITE_HORAS} h: veja ${join(destino, 'registro.log')} e o guia.`);
    process.exit(1);
  }
  console.log(`✔ ${texto}`);
}

/** copia:contar — linhas por tabela (nunca o conteúdo). */
function contarComando(args: string[]): void {
  const informada = args.find((a) => !a.startsWith('--'));
  const config = informada ? {} : carregarConfig();
  const conexao = informada ?? exigir(config, 'RADAR_COPIA_CONEXAO');
  imprimirContagens(contar(imagemPostgres(config), conexao));
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

const [subcomando, ...resto] = process.argv.slice(2);
try {
  if (subcomando === 'fazer') fazer();
  else if (subcomando === 'restaurar') restaurar(resto);
  else if (subcomando === 'conferir') conferir();
  else if (subcomando === 'contar') contarComando(resto);
  else {
    console.error(`Uso: npm run copia:<fazer|restaurar|conferir|contar> (veja ${basename(import.meta.url)} e o guia).`);
    process.exit(1);
  }
} catch (e) {
  // Toda mensagem de erro passa pela máscara antes de ir para a tela.
  console.error(`✘ ${mascararConexao(e instanceof Error ? e.message : String(e))}`);
  process.exit(1);
}
