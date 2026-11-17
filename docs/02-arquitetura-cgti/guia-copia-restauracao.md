# Guia da Cópia Cifrada e da Restauração (etapa D1)

> Este guia ensina a fazer a **cópia de segurança diária** do banco do RADAR, **cifrada**, e a
> **restaurá-la** num Supabase local para provar que ela funciona. Foi escrito para quem nunca fez
> isso: cada comando vem com uma frase dizendo o que ele faz. Desenho: seção 6.3 de
> [[2026-11-17-etapa-d0-d1-piloto-sede-design]]. Código: `scripts/copia/` (regras testadas em
> `tests/unit/copiaRegras.spec.ts`). Computador: [[guia-computador-de-trabalho]].

> [!warning] Prova completa ainda pendente
> Os scripts estão prontos e as regras (nome, rotação, máscara da senha, horas desde a última cópia)
> passam nos testes. Também já foi conferido, **sem cifrar**, que os comandos `pg_dump`/`pg_restore`
> montados pelo script restauram o banco local de demonstração com **contagens idênticas, inclusive a
> tabela de auditoria** (`auditoria_log` 46 → 46: os gatilhos não dispararam).
>
> **Falta a primeira prova completa, com o `age`** (Passo 5 do plano da D1), porque o `age` não estava
> instalado no computador em que os scripts foram escritos. Ela deve ser feita no **computador
> institucional**, seguindo a [seção 8](#8-primeira-prova-completa-pendente). Até lá, não conte com a
> cópia como testada.

## 1. Como funciona, em uma figura

```
Supabase (nuvem)                     seu computador (WSL)
   public + auth.users ──pg_dump──▶  /dev/shm (memória, nunca o disco)
                                         │ tar
                                         ▼
                                     age -r <chave PÚBLICA>
                                         │
                                         ▼
                           ~/radar-copias/radar-AAAA-MM-DD.tar.age  (cifrado)
```

- **O que vai na cópia:** os **dados** do esquema `public` e as contas (`auth.users` e
  `auth.identities`), porque `perfis_usuarios` aponta para `auth.users`. A **estrutura** (tabelas,
  funções, RLS) vem das migrações do repositório (`supabase/migrations/`).
- **Por que cifrar com chave pública:** o script só conhece a chave **pública**, que serve para
  trancar, não para abrir. A chave **privada** (a que abre) fica com você, fora do computador de uso
  diário. Quem tiver acesso à pasta das cópias não lê os dados.
- **Rotação automática:** ficam as **14 cópias mais recentes** e, das mais antigas, **a mais nova de
  cada semana** até **60 dias**. Arquivos que não seguem o padrão `radar-AAAA-MM-DD.tar.age`
  (ex.: `registro.log`, `notas.txt`) **nunca** são apagados.
- **Registro:** cada execução grava uma linha em `~/radar-copias/registro.log` com data, `OK` e tamanho
  ou `ERRO` e o motivo. **Nunca** grava dados nem a senha.

## 2. Instalar o `age`

O `age` é um programa livre e pequeno que cifra arquivos.

```bash
sudo apt update && sudo apt install age    # instala o age (pede a sua senha do Ubuntu)
age --version                              # confere: deve imprimir a versão (ex.: v1.1.1)
```

Sem o `age`, os comandos `copia:fazer` e `copia:restaurar` param com a mensagem
"o programa age não foi encontrado".

O `pg_dump`, o `pg_restore` e o `psql` **não** precisam ser instalados: o script os roda dentro de um
contêiner Docker descartável com a imagem `postgres:17`. Na primeira vez, o Docker baixa essa imagem
(cerca de 150 MB). Para usar outra imagem já baixada (versão 17 ou mais nova), ponha
`RADAR_COPIA_IMAGEM=<imagem>` no `config.env`.

## 3. Gerar a chave definitiva

Faça isto **uma vez**, no computador institucional.

```bash
age-keygen -o ~/radar-chave-privada.txt    # cria o par de chaves; imprime a chave PÚBLICA (age1...)
```

1. Copie a linha `Public key: age1...` — ela vai para o `config.env` (seção 4).
2. Abra `~/radar-chave-privada.txt`, copie o conteúdo inteiro (a linha `AGE-SECRET-KEY-...`) para o
   **gerenciador de senhas** (ou mídia separada guardada com você). **Sem ela, nenhuma cópia pode ser
   aberta.** Se ela se perder, todas as cópias viram lixo.
3. Apague o arquivo do computador:

```bash
shred -u ~/radar-chave-privada.txt         # sobrescreve e apaga o arquivo da chave privada
```

Na hora de restaurar, você recria o arquivo a partir do gerenciador de senhas (seção 6) e apaga de
novo no fim.

## 4. Configuração (`config.env` com permissão 600)

O arquivo guarda a **senha do banco da nuvem**. Fica **fora do repositório**, nunca no `.env` do
projeto.

```bash
mkdir -p ~/.config/radar-copias            # cria a pasta da configuração
chmod 700 ~/.config/radar-copias           # só você entra na pasta
nano ~/.config/radar-copias/config.env     # abre o editor (Ctrl+O salva, Ctrl+X sai)
```

Conteúdo (troque os valores entre `< >`):

```bash
# Conexão do POOLER DE SESSÃO do Supabase (Project Settings → Database → Connection string → Session pooler).
RADAR_COPIA_CONEXAO=postgresql://postgres.<ref>:<senha>@<maquina-do-pooler>:5432/postgres
# Pasta das cópias (fora do repositório).
RADAR_COPIA_DESTINO=/home/<seu-usuario>/radar-copias
# A chave PÚBLICA gerada na seção 3.
RADAR_COPIA_CHAVE_PUBLICA=age1<...>
```

Se a senha tiver caracteres especiais (`@`, `:`, `/`, `#`, `?`), escreva-os codificados na conexão:
`@` vira `%40`, `:` vira `%3A`, `/` vira `%2F`, `#` vira `%23`, `?` vira `%3F`.

```bash
chmod 600 ~/.config/radar-copias/config.env   # só você lê e escreve (OBRIGATÓRIO)
```

O script **se recusa a rodar** se a permissão não for exatamente `600`.

## 5. Fazer e conferir a cópia

```bash
npm run copia:fazer       # gera ~/radar-copias/radar-AAAA-MM-DD.tar.age, faz a rotação e grava o registro
npm run copia:conferir    # diz há quantas horas foi a última cópia; termina com erro se passou de 36 h
npm run copia:contar      # linhas por tabela na ORIGEM (nuvem), só nomes e números
```

- Uma cópia por dia: rodar de novo no mesmo dia **substitui** a do dia.
- As horas do `copia:conferir` contam a partir da **meia-noite (Brasília)** do dia da última cópia.
- **Agendamento diário** (decisão D0-10 / spec 6.3): Agendador de Tarefas do Windows chamando
  `wsl -d Ubuntu -- bash -lc "cd ~/projetos/cgov-riscos && npm run copia:fazer"`. Se a política da
  máquina não permitir, `cron` no WSL e `npm run copia:conferir` ao abrir o terminal.

## 6. Restaurar (no Supabase **local**, nunca na nuvem)

A restauração **só aceita** o banco deste computador (`127.0.0.1`/`localhost`), a mesma trava do
`sync:estrutura`. Ela exige o banco local **zerado e sem a semente de demonstração**.

```bash
npm run copia:contar                       # (1) anota as contagens da ORIGEM, para comparar no fim
npx supabase db reset --no-seed            # (2) zera o banco LOCAL e aplica só as migrações
nano /dev/shm/chave.txt                    # (3) cola a chave PRIVADA do gerenciador de senhas (na memória)
chmod 600 /dev/shm/chave.txt               #     só você lê
npm run copia:restaurar -- ~/radar-copias/radar-AAAA-MM-DD.tar.age --identidade /dev/shm/chave.txt
                                           # (4) decifra em /dev/shm, restaura auth e depois public
shred -u /dev/shm/chave.txt                # (5) apaga a chave privada
```

O que o `copia:restaurar` faz por dentro:

1. confere que o destino é local e que o banco está vazio (todas as contagens em zero);
2. `age -d` decifra e `tar -x` desempacota **direto em `/dev/shm`** (memória);
3. `pg_restore --data-only --disable-triggers --single-transaction` restaura **primeiro `auth`** e
   **depois `public`**, conectado como `supabase_admin` (o superusuário local, o único que pode
   desligar os gatilhos). Com os gatilhos desligados, a **trilha de auditoria e o recálculo não
   disparam**: a auditoria restaurada é a da origem, linha por linha;
4. apaga os arquivos decifrados (no `finally`, mesmo se der erro) e imprime as contagens.

**Conferência:** as contagens do fim devem ser **idênticas** às do passo (1), inclusive
`public.auditoria_log`. Se a auditoria tiver linhas a mais, os gatilhos dispararam: pare e avise.

Depois de terminar, volte o banco local para a demonstração com `npm run db:reset`.

## 7. Conta de teste local para a leitura de amostra pela RLS

Nunca use a credencial de uma pessoa real. Depois de restaurar uma cópia **real**, crie uma conta de
teste **só no banco local**, com o perfil CGOV, e entre no app local com ela para ler alguns riscos
(isso prova que a RLS e os perfis vieram certos):

1. Abra o Studio local (`http://127.0.0.1:54323`) → **Authentication → Add user** → e-mail
   `teste-restauracao@radar.test`, marcando "Auto confirm".
2. No **SQL Editor** do Studio, dê o perfil CGOV a essa conta (copie o `id` dela em Authentication):

```sql
-- Só no banco LOCAL: cria o perfil de teste com o papel da CGOV.
insert into public.perfis_usuarios (id, nome_completo, email, unidade_id, papel_governanca)
select '<id da conta>', 'Teste de restauração', 'teste-restauracao@radar.test', u.id, 'cgov'
from public.unidades u where u.sigla = 'CGOV' limit 1;
```

> Colunas conferidas em `supabase/migrations/20261115001_unidades_perfis_processos.sql` (papel `cgov`).
> Se a sigla da unidade for outra no banco restaurado, ajuste o `where`.

3. `npm run dev`, entre com `teste-restauracao@radar.test` (o link chega no Mailpit,
   `http://127.0.0.1:54324`) e abra a lista de riscos.
4. No fim, `npm run db:reset` apaga tudo (inclusive a conta de teste).

Na prova com dados de **demonstração** (seção 8), use a conta da semente `cgov@radar.test`.

## 8. Primeira prova completa (PENDENTE)

Passo 5 do plano da D1. Fazer **no computador institucional**, com dados de demonstração e **sem
nuvem**. Use uma chave **de teste** (não a definitiva) e uma pasta **de teste**.

```bash
npm run db:reset                                          # banco local com a demonstração
mkdir -p ~/.config/radar-copias && chmod 700 ~/.config/radar-copias
age-keygen -o /dev/shm/chave-teste.txt                    # par de chaves DE TESTE (anote o age1...)
cat > ~/.config/radar-copias/config.env <<'FIM'
RADAR_COPIA_CONEXAO=postgresql://postgres:postgres@127.0.0.1:54322/postgres
RADAR_COPIA_DESTINO=/home/<seu-usuario>/radar-copias-teste
RADAR_COPIA_CHAVE_PUBLICA=<age1... da chave de teste>
FIM
chmod 600 ~/.config/radar-copias/config.env
npm run copia:fazer                                       # gera a cópia cifrada de teste
npm run copia:conferir                                    # deve dizer "Última cópia há ... horas" (✔)
npm run copia:contar -- postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres > /dev/shm/antes.txt
npx supabase db reset --no-seed                           # zera o banco local, sem semente
npm run copia:restaurar -- ~/radar-copias-teste/radar-AAAA-MM-DD.tar.age --identidade /dev/shm/chave-teste.txt
npm run copia:contar -- postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres > /dev/shm/depois.txt
diff /dev/shm/antes.txt /dev/shm/depois.txt && echo "CONTAGENS IDÊNTICAS"
```

Critérios de aprovação:

- [ ] `diff` sem diferença (inclusive `public.auditoria_log`);
- [ ] `npm run dev` → entrar com `cgov@radar.test` (link no Mailpit) → os riscos aparecem;
- [ ] `ls /dev/shm | grep radar-copia` não mostra nada (os arquivos em claro foram apagados).

Limpeza:

```bash
rm -rf ~/radar-copias-teste                               # apaga a pasta de teste
shred -u /dev/shm/chave-teste.txt; rm -f /dev/shm/antes.txt /dev/shm/depois.txt
rm ~/.config/radar-copias/config.env                      # depois crie o definitivo (seção 4)
npm run db:reset                                          # banco local volta à demonstração
```

Anote o resultado (data, contagens iguais sim/não) em [[decisoes-tecnicas-d]] e tire o aviso do topo
deste guia.

## 9. Se a cópia falhar

1. Leia a última linha de `~/radar-copias/registro.log` (`tail -n 3 ~/radar-copias/registro.log`).
2. Erros comuns:

| Mensagem | Causa provável | O que fazer |
| --- | --- | --- |
| `o programa "age" não foi encontrado` | `age` não instalado | seção 2 |
| `precisa de permissão 600` | `config.env` legível por outros | `chmod 600 ~/.config/radar-copias/config.env` |
| `password authentication failed` | senha errada ou trocada no Supabase | atualizar `RADAR_COPIA_CONEXAO` |
| `could not translate host name` / `Network is unreachable` | sem internet ou conexão direta (IPv6) | usar a conexão do **pooler de sessão** |
| `server version mismatch` | imagem com `pg_dump` mais velho que o servidor | `RADAR_COPIA_IMAGEM` com versão igual ou maior |
| `Cannot connect to the Docker daemon` | Docker parado | `sudo service docker start` |
| `o banco local não está vazio` (restaurar) | faltou zerar | `npx supabase db reset --no-seed` |
| `column ... does not exist` (restaurar `auth`) | versão do Auth local diferente da nuvem | atualizar o Supabase CLI local e repetir |

3. Rode `npm run copia:fazer` de novo. Se falhar duas vezes seguidas, avise a CGOV: o piloto não deve
   seguir mais de 36 h sem cópia (o `copia:conferir` acusa isso).
4. **Nunca** cole a mensagem de erro com a conexão em chamados ou chats: as mensagens do script já
   vêm com `***` no lugar do usuário e da senha, mas confira antes.
