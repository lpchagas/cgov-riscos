/**
 * ============================================================================
 * FONTE DE DEMONSTRAÇÃO (`src/services/dados/fonteDemonstracao.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA (PARA INICIANTES EM PROGRAMAÇÃO):
 * Quando o RADAR roda SEM banco (sem `.env`), os dados ficam na memória do
 * navegador. Esta fonte faz o papel do banco nesse modo:
 *   - parte da semente do Anexo II (`dadosSementeAnexoII.ts`);
 *   - calcula o risco pela `calculadoraRiscoRadar.ts` (Quadros 6, 7 e 8 e DAR);
 *   - simula o fluxo de aprovação ("Aprovação em 1 Clique");
 *   - recalcula a criticidade quando a CGOV muda a DAR.
 *
 * Ela implementa a MESMA interface `FonteDados` da fonte Supabase, então a
 * store não precisa saber em qual modo está.
 *
 * Três cuidados importantes:
 *   1. Cada `criarFonteDemonstracao()` tem a SUA cópia dos dados (dois testes,
 *      ou duas abas de teste, nunca se misturam).
 *   2. Tudo o que sai daqui é CÓPIA: se a tela mexer no objeto recebido, a
 *      fonte não muda. Só as funções de gravação mudam os dados.
 *   3. As recusas usam as MESMAS frases do banco: passamos um texto
 *      "RADAR: ..." igual ao das migrações por `traduzirErroBanco`.
 *
 * Estados especiais (para ver as telas de carregamento e de erro sem banco):
 *   'carregando' -> carregarCarteira() nunca termina;
 *   'erro'       -> carregarCarteira() falha como se a rede tivesse caído.
 *
 * Exemplo:
 *   const fonte = criarFonteDemonstracao();
 *   const { id } = await fonte.salvarFicha({ objetoId: 'obj-anexo-ii', probabilidade: 1, impacto: 5 });
 *   await fonte.enviar(id);   // rascunho -> em_validacao_cg
 */
import type {
  AcoesFluxo,
  ApetiteDeclarado,
  CategoriaRisco,
  FichaRisco,
  HistoricoFluxoItem,
  IndicadorKri,
  NivelEficaciaControle,
  NivelImpacto,
  NivelProbabilidade,
  ObjetoContexto,
  StatusFluxoRisco,
  UnidadeOrganizacional,
} from '../../types/radar.types';
import {
  CATEGORIAS_QUADRO_2_SEMENTE,
  OBJETOS_CONTEXTO_SEMENTE,
  RISCOS_SEMENTE_ANEXO_II,
  UNIDADES_SEMENTE,
} from '../dadosSementeAnexoII';
import { calcularRiscoCompletoRadar, gerarSintaxePadraoRisco } from '../../utils/calculadoraRiscoRadar';
import { verificarTravaRiscoCritico, type MotivoTrava, type ResultadoTrava } from '../../utils/travaRiscoCritico';
import { capacidades, PAPEIS } from '../../utils/acessoPorPerfil';
import { CHAVE_PERFIL_DEMO, PERFIS_DEMO_ICMBIO, type PerfilUsuarioDemo } from '../../stores/authStore';
import { ErroRadar, MENSAGEM_REDE, traduzirErroBanco } from './errosBanco';
import type { Carteira, EventoAuditoria, EventoFluxo, FichaParaSalvar, FonteDados } from './tipos';

export type EstadoDemonstracao = 'normal' | 'carregando' | 'erro';

export interface OpcoesDemonstracao {
  /**
   * Quem está usando (nome e papel vão para o histórico; o papel decide os
   * botões). Padrão: o perfil simulado guardado no navegador pela authStore.
   */
  quemSou?: () => PerfilUsuarioDemo;
}

// ---------------------------------------------------------------------------
// AJUDANTES
// ---------------------------------------------------------------------------

/** Cópia profunda (os dados são JSON puro: texto, número, booleano, listas). */
const copiar = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Lê o perfil simulado (mesma chave e mesmo padrão `cgov` da authStore). */
function perfilGuardado(): PerfilUsuarioDemo {
  try {
    const valor = localStorage.getItem(CHAVE_PERFIL_DEMO);
    if (valor && (PAPEIS as readonly string[]).includes(valor)) {
      return PERFIS_DEMO_ICMBIO[valor as keyof typeof PERFIS_DEMO_ICMBIO];
    }
  } catch {
    // localStorage bloqueado (janela privada): segue com o padrão.
  }
  return PERFIS_DEMO_ICMBIO.cgov;
}

/**
 * Recusa com a MESMA frase que o banco daria.
 * Ex.: recusar('só se valida risco em validação') -> ErroRadar tipo 'estado'.
 */
function recusar(trechoDoBanco: string): never {
  throw traduzirErroBanco({ message: `RADAR: ${trechoDoBanco}` });
}

/** "Não encontrado" com frase própria (a do dicionário fala só em "Risco"). */
function naoEncontrado(frase: string): never {
  throw new ErroRadar(`${frase}. Atualize a página.`, 'nao_encontrado');
}

/**
 * LAC-13 + LAC-03: aplica a trava do risco crítico a uma ficha (mesma regra do
 * banco). Risco crítico ('sim' ou 'pendente_dar') não aceita a estratégia
 * "Aceitar", exige pelo menos uma ação 5W2H que não seja "Aceitar" e exige
 * pelo menos um KRI completo ligado ao risco (`r.kris`).
 */
function travaDaFicha(r: FichaRisco): ResultadoTrava {
  return verificarTravaRiscoCritico({
    statusCritico: r.statusCritico,
    estrategiaPrincipal: r.estrategiaPrincipal,
    estrategiasDasAcoes: r.respostasTratamento.map((a) => a.estrategia),
    kris: r.kris,
  });
}

/** Texto do motivo da trava, igual ao devolvido por `fn_trava_risco_critico` no banco. */
function textoDoMotivo(motivo: MotivoTrava): string {
  if (motivo === 'aceitar_em_critico') return 'a estratégia "Aceitar" não é permitida';
  if (motivo === 'sem_acao_em_critico') return 'falta uma ação de tratamento (5W2H)';
  return 'falta um KRI completo (nome, fórmula, fonte, periodicidade, limite de alerta e responsável)';
}

/**
 * Recusa a ficha se ela não passa na trava, com o texto do banco (que o
 * dicionário de `errosBanco.ts` traduz para `MENSAGEM_TRAVA_CRITICO`).
 * `sufixo` é o complemento de validar/homologar. Ex.: ' Devolva a ficha à unidade para ajuste.'
 */
function exigirTrava(r: FichaRisco, sufixo = ''): void {
  const t = travaDaFicha(r);
  if (t.ok) return;
  recusar(
    `o risco ${r.codigoRadar} é crítico (fora do apetite da DAR ou com DAR pendente) e precisa de tratamento: ${textoDoMotivo(t.motivo)}.${sufixo}`
  );
}

/** Complemento do texto quando a recusa ocorre em validar/homologar. */
const SUFIXO_DEVOLVA = ' Devolva a ficha à unidade para ajuste.';

/** Estados em que a ficha está travada (em decisão da chefia). */
const TRAVADOS: StatusFluxoRisco[] = ['em_validacao_cg', 'em_homologacao_dir'];
/** Estados em que a 1ª linha pode enviar (hoje a demonstração envia o preliminar direto). */
const ENVIAVEIS: StatusFluxoRisco[] = ['rascunho', 'devolvido', 'preliminar_cgov'];
/** Estados em que o risco pode ser excluído (decisão D2). */
const EXCLUIVEIS: StatusFluxoRisco[] = ['rascunho', 'devolvido', 'preliminar_cgov'];

let contadorIds = 0;
/** Id único na memória. Ex.: novoId('risco') -> 'risco-1731760000000-1'. */
const novoId = (prefixo: string) => `${prefixo}-${Date.now()}-${++contadorIds}`;

// ---------------------------------------------------------------------------
// A FONTE
// ---------------------------------------------------------------------------

export function criarFonteDemonstracao(
  estado: EstadoDemonstracao = 'normal',
  opcoes: OpcoesDemonstracao = {}
): FonteDados {
  const quemSou = opcoes.quemSou ?? perfilGuardado;

  // Os dados DESTA fonte (cópias da semente: nada é compartilhado).
  const riscos: FichaRisco[] = copiar(RISCOS_SEMENTE_ANEXO_II);
  const categorias: CategoriaRisco[] = copiar(CATEGORIAS_QUADRO_2_SEMENTE);
  const unidades: UnidadeOrganizacional[] = copiar(UNIDADES_SEMENTE);
  const objetos: ObjetoContexto[] = copiar(OBJETOS_CONTEXTO_SEMENTE);

  // LAC-03: como no banco, o KRI é do OBJETO e se liga a um ou mais riscos dele
  // (muitos para muitos). A lista central abaixo é a "tabela" de KRIs; o campo
  // `kris` de cada risco é só uma VISÃO dela, refeita por `sincronizarKris()`.
  // A semente repete o KRI compartilhado em cada risco: juntamos pelo id.
  const kris: IndicadorKri[] = [];
  for (const r of riscos) {
    for (const k of r.kris) {
      if (!kris.some((x) => x.id === k.id)) kris.push(copiar(k));
    }
  }
  sincronizarKris();

  /** Refaz `risco.kris` a partir da lista central (mesmos objetos: sem cópia solta). */
  function sincronizarKris(): void {
    for (const r of riscos) r.kris = kris.filter((k) => k.riscoIds.includes(r.id));
  }

  /** Apaga KRI órfão (sem nenhum risco ligado) junto com as medições, como o banco. */
  function apagarOrfaos(): void {
    for (let i = kris.length - 1; i >= 0; i--) if (kris[i].riscoIds.length === 0) kris.splice(i, 1);
  }

  /** Foto do estado que a gravação pode mexer, para desfazer tudo numa recusa. */
  function tirarFoto() {
    return { riscos: copiar(riscos), kris: copiar(kris) };
  }

  /**
   * Volta ao que era na foto. Object.assign só copia as chaves da foto; um
   * campo opcional que a ficha não tinha e que entrou depois (ex.:
   * justificativaProbabilidade) precisa ser apagado. KRIs e ligações voltam
   * junto (e as medições de um KRI apagado também).
   */
  function restaurarFoto(foto: ReturnType<typeof tirarFoto>): void {
    kris.splice(0, kris.length, ...foto.kris);
    for (const antes of foto.riscos) {
      const r = riscos.find((x) => x.id === antes.id);
      if (!r) continue;
      const ficha = r as unknown as Record<string, unknown>;
      for (const chave of Object.keys(ficha)) {
        if (!(chave in antes)) delete ficha[chave];
      }
      Object.assign(r, antes);
    }
    sincronizarKris();
  }

  /** Campos da definição do KRI que, se mudarem, contam como "alterar o indicador". */
  const DEFINICAO_KRI = [
    'nomeIndicador',
    'formulaCalculo',
    'fonteDados',
    'periodicidade',
    'metaAlvo',
    'limiteAlerta',
    'responsavelMedicao',
  ] as const;

  // --- buscas que falham com a frase do banco ------------------------------
  function acharRisco(id: string): FichaRisco {
    const r = riscos.find((x) => x.id === id);
    if (!r) recusar('risco não encontrado ou fora do seu alcance.');
    return r;
  }

  function apetiteDa(categoriaId: number): ApetiteDeclarado {
    return categorias.find((c) => c.id === categoriaId)?.apetiteDeclarado ?? 'pendente_dar';
  }

  /** Acrescenta um passo ao histórico do risco, em nome de quem está usando. */
  function registrar(
    r: FichaRisco,
    etapa: HistoricoFluxoItem['etapa'],
    acao: HistoricoFluxoItem['acao'],
    despachoTexto?: string
  ): void {
    const eu = quemSou();
    r.historicoFluxo.push({
      id: novoId('hist'),
      etapa,
      acao,
      usuarioNome: eu.nome,
      usuarioPapel: eu.papel,
      despachoTexto,
      criadoEm: new Date().toISOString(),
    });
  }

  /**
   * Recalcula os campos calculados do risco pela calculadora oficial
   * (Quadro 7 → trava de evidência/Quadro 6 → Quadro 8 → DAR).
   */
  function recalcular(r: FichaRisco): void {
    const c = calcularRiscoCompletoRadar({
      probabilidade: r.probabilidade,
      impacto: r.impacto,
      eficaciaControle: r.nivelEficaciaControle,
      possuiEvidenciaComprovada: r.possuiEvidenciaControle,
      apetiteCategoria: apetiteDa(r.categoriaId),
    });
    r.nivelInerente = c.nivelInerente;
    r.classificacaoInerente = c.classificacaoInerente;
    r.nivelEficaciaControle = c.eficaciaFinal;
    r.fatorControle = c.fatorFinal;
    r.nivelResidual = c.nivelResidual;
    r.classificacaoResidual = c.classificacaoResidual;
    r.statusCritico = c.statusCritico;
    r.isCritico = c.isCritico;
    r.memoriaCalculo = c.memoriaCalculo;
    r.descricaoPadrao = gerarSintaxePadraoRisco({
      causas: r.causas,
      eventoRisco: r.eventoRisco,
      consequencias: r.consequencias,
      objetivoAfetado: r.objetivoAfetado,
    });
  }

  /**
   * Próximo código RADAR-<ano>-NNN: o MAIOR número já usado + 1 (como a
   * sequência do banco, nunca repete mesmo depois de excluir).
   * Ex.: existem RADAR-2026-001..003 -> RADAR-2026-004.
   */
  function proximoCodigo(): string {
    const maior = riscos.reduce((max, r) => {
      const m = /^RADAR-\d{4}-(\d+)$/.exec(r.codigoRadar);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    return `RADAR-${new Date().getFullYear()}-${String(maior + 1).padStart(3, '0')}`;
  }

  /** Aplica os campos de ENTRADA presentes em `f` sobre o risco `r` (undefined = mantém). */
  function aplicarEntradas(r: FichaRisco, f: FichaParaSalvar): void {
    const objeto = objetos.find((o) => o.id === f.objetoId);
    if (!objeto) recusar('objeto não encontrado.');
    // Categoria informada e desconhecida: recusa ANTES de mexer no risco
    // (como a chave estrangeira do banco). Ex.: categoriaId 99 -> recusado.
    const cat = f.categoriaId === undefined ? undefined : categorias.find((c) => c.id === f.categoriaId);
    if (f.categoriaId !== undefined && !cat) recusar('categoria não encontrada.');
    r.objetoId = objeto.id;
    r.unidadeId = objeto.unidadeId;
    r.nomeObjetoCache = objeto.nomeObjeto;

    // null = "apagar" -> no front vira undefined.
    const opcional = (v: string | null | undefined, atual: string | undefined) =>
      v === undefined ? atual : v === null ? undefined : v;

    if (f.responsavelRiscoNome !== undefined) r.responsavelRiscoNome = f.responsavelRiscoNome;
    if (f.causas !== undefined) r.causas = f.causas;
    if (f.eventoRisco !== undefined) r.eventoRisco = f.eventoRisco;
    if (f.consequencias !== undefined) r.consequencias = f.consequencias;
    if (f.objetivoAfetado !== undefined) r.objetivoAfetado = f.objetivoAfetado;
    if (cat) {
      r.categoriaId = cat.id;
      r.categoriaNome = cat.nome;
    }
    // Subcategoria em branco = "sem subcategoria" (como o gatilho do banco,
    // que grava texto em branco como nulo). Ex.: '' -> apaga; null -> apaga.
    const sub = f.subcategoriaIntegridade;
    r.subcategoriaIntegridade = opcional(
      typeof sub === 'string' && !sub.trim() ? null : sub,
      r.subcategoriaIntegridade ?? undefined
    );
    if (f.testeIntegridadeAplicavel !== undefined) r.testeIntegridadeAplicavel = f.testeIntegridadeAplicavel;
    r.justificativaNaoIntegridade = opcional(f.justificativaNaoIntegridade, r.justificativaNaoIntegridade);
    if (f.probabilidade !== undefined) r.probabilidade = f.probabilidade;
    r.justificativaProbabilidade = opcional(f.justificativaProbabilidade, r.justificativaProbabilidade);
    if (f.impacto !== undefined) r.impacto = f.impacto;
    r.justificativaImpacto = opcional(f.justificativaImpacto, r.justificativaImpacto);
    if (f.possuiEvidenciaControle !== undefined) r.possuiEvidenciaControle = f.possuiEvidenciaControle;
    if (f.nivelEficaciaControle !== undefined) r.nivelEficaciaControle = f.nivelEficaciaControle;
    if (f.estrategiaPrincipal !== undefined) r.estrategiaPrincipal = f.estrategiaPrincipal;

    // Filhos: lista presente SUBSTITUI o grupo; item sem id ganha um id novo.
    if (f.controles !== undefined) {
      r.controlesExistentes = f.controles.map((c) => ({ ...c, id: c.id ?? novoId('ctrl') }));
    }
    if (f.respostas !== undefined) {
      // Nos textos opcionais, null ("apagar") vira campo ausente (undefined) na memória.
      r.respostasTratamento = f.respostas.map((x) => ({
        ...x,
        id: x.id ?? novoId('trat'),
        justificativaPorQue: x.justificativaPorQue ?? undefined,
        localOnde: x.localOnde ?? undefined,
        custoQuanto: x.custoQuanto ?? undefined,
      }));
    }
  }

  /**
   * LAC-03: aplica a lista de KRIs da ficha ao risco `r` (que já está no objeto certo).
   *  - sem id: cria o KRI no objeto do risco e liga;
   *  - id + `apenasLigar`: só liga (o KRI tem de ser do mesmo objeto);
   *  - id sem `apenasLigar`: edita a definição (mesmo objeto). Se algo mudou, o
   *    KRI serve a todos os riscos ligados: recusa se algum está em validação
   *    ou homologação; senão reabre os aprovados. Edição que não muda nada é livre;
   *  - KRI ligado ao risco e ausente da lista: é desligado (órfão some).
   * As medições nunca vêm na ficha: o KRI que já existia mantém as suas.
   */
  function aplicarKris(r: FichaRisco, lista: NonNullable<FichaParaSalvar['kris']>): void {
    const mantidos = new Set<string>();
    for (const item of lista) {
      if (!item.id) {
        const novo: IndicadorKri = {
          nomeIndicador: item.nomeIndicador,
          formulaCalculo: item.formulaCalculo,
          fonteDados: item.fonteDados,
          periodicidade: item.periodicidade,
          metaAlvo: item.metaAlvo,
          limiteAlerta: item.limiteAlerta,
          responsavelMedicao: item.responsavelMedicao,
          id: novoId('kri'),
          objetoId: r.objetoId,
          riscoIds: [r.id],
          medicoes: [],
        };
        kris.push(novo);
        mantidos.add(novo.id);
        continue;
      }
      const existente = kris.find((k) => k.id === item.id);
      if (!existente) naoEncontrado('Indicador (KRI) não encontrado');
      if (existente.objetoId !== r.objetoId) {
        recusar('o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.');
      }
      mantidos.add(existente.id);
      if (!existente.riscoIds.includes(r.id)) existente.riscoIds.push(r.id);
      if (item.apenasLigar) continue;

      const mudou = DEFINICAO_KRI.some((campo) => (item[campo] ?? '') !== (existente[campo] ?? ''));
      if (!mudou) continue;
      const ligados = riscos.filter((x) => x.id !== r.id && existente.riscoIds.includes(x.id));
      const travado = ligados.find((x) => TRAVADOS.includes(x.statusFluxo));
      if (travado) recusar(`a ficha do risco ${travado.codigoRadar} está travada`);
      for (const campo of DEFINICAO_KRI) {
        // Campo ausente ou vazio na ficha vira "não definido" (o sistema não inventa valor).
        (existente as unknown as Record<string, unknown>)[campo] = item[campo] || undefined;
      }
      for (const x of ligados) {
        if (x.statusFluxo !== 'aprovado') continue;
        x.statusFluxo = 'em_validacao_cg';
        registrar(
          x,
          'reabertura_nota',
          'reaberto_mudanca_nota',
          `KRI "${existente.nomeIndicador}" alterado (ele é compartilhado). Reaberto para validação da Coordenação-Geral.`
        );
      }
    }
    // Desligar: o que estava ligado a este risco e não veio na lista.
    for (const k of kris) {
      if (!mantidos.has(k.id)) k.riscoIds = k.riscoIds.filter((id) => id !== r.id);
    }
    apagarOrfaos();
  }

  // --- a interface FonteDados ----------------------------------------------
  return {
    async carregarCarteira(): Promise<Carteira> {
      if (estado === 'carregando') return new Promise<Carteira>(() => {}); // nunca termina
      if (estado === 'erro') throw new ErroRadar(MENSAGEM_REDE, 'rede');
      return copiar({ riscos, objetos, categorias, unidades, processos: [] });
    },

    async relerRisco(id) {
      const r = riscos.find((x) => x.id === id);
      return r ? copiar(r) : null;
    },

    /**
     * Botões como as telas decidem HOJE (antes da B3):
     *  - Enviar: risco em rascunho, devolvido ou preliminar (qualquer perfil);
     *  - Validar / Devolver em validação: perfis que validam (capacidades);
     *  - Homologar / Devolver em homologação: perfis que homologam;
     *  - Editar: fora das travas; Excluir: rascunho, devolvido ou preliminar;
     *    a Auditoria Interna só lê.
     * Assumir não existe na demonstração (o preliminar é enviado direto).
     */
    async acoesNoFluxo(ids) {
      const eu = quemSou();
      const cap = capacidades(eu.papel);
      const soLeitura = cap.somenteLeituraForaDaUnidade;
      const resultado: AcoesFluxo[] = [];
      for (const id of ids) {
        const r = riscos.find((x) => x.id === id);
        if (!r) continue; // id desconhecido: ignorado, sem erro (como o banco)
        const s = r.statusFluxo;
        const podeValidar = s === 'em_validacao_cg' && cap.podeValidar;
        const podeHomologar = s === 'em_homologacao_dir' && cap.podeHomologar;
        let motivo: string | null = null;
        if (s === 'em_validacao_cg' && !cap.podeValidar) {
          motivo = 'Seu perfil não valida riscos. Quem valida é a chefia imediata da unidade.';
        } else if (s === 'em_homologacao_dir' && !cap.podeHomologar) {
          motivo = 'Só a Gerência Regional, a Diretoria ou a Presidência homologa este risco.';
        }
        resultado.push({
          riscoId: r.id,
          podeEnviar: ENVIAVEIS.includes(s),
          podeAssumir: false,
          podeValidar,
          podeHomologar,
          podeDevolver: podeValidar || podeHomologar,
          devolucaoCgov: false,
          podeEditar: !soLeitura && !TRAVADOS.includes(s),
          podeExcluir: !soLeitura && EXCLUIVEIS.includes(s),
          motivo,
        });
      }
      return resultado;
    },

    async objetosOndeGravo() {
      return objetos.filter((o) => o.unidadeAtiva).map((o) => o.id);
    },

    /**
     * Cria (sem id) ou altera (com id) uma ficha e recalcula pela calculadora.
     * Como no banco: ficha travada é recusada e alterar risco APROVADO o
     * reabre para validação da Coordenação-Geral.
     */
    async salvarFicha(f) {
      if (f.id) {
        const r = acharRisco(f.id);
        if (TRAVADOS.includes(r.statusFluxo)) {
          recusar(`a ficha do risco ${r.codigoRadar} está travada`);
        }
        // LAC-13 e LAC-03: rascunho, devolvido e preliminar continuam livres.
        // Nos demais estados (hoje, só o aprovado chega aqui) a ficha não pode
        // ficar crítica com "Aceitar", sem ação ou sem KRI completo. Tiramos
        // uma foto e, se algo for recusado (trava, KRI de outro objeto, KRI
        // compartilhado em validação), devolvemos TUDO ao que era: ficha, KRIs,
        // ligações, medições e os riscos reabertos. Nada muda na recusa.
        const estavaLivre = ENVIAVEIS.includes(r.statusFluxo);
        const foto = tirarFoto();
        try {
          const objetoAntes = r.objetoId;
          aplicarEntradas(r, f);
          if (f.kris !== undefined) aplicarKris(r, f.kris);
          // Trocar o objeto com KRI do objeto ANTIGO ainda ligado quebraria "KRI só liga a riscos
          // do mesmo objeto" (o banco recusa). Recusa tudo (rollback abaixo).
          if (r.objetoId !== objetoAntes && kris.some((k) => k.riscoIds.includes(r.id) && k.objetoId !== r.objetoId)) {
            recusar('o KRI só pode ser ligado a riscos do mesmo objeto de gestão de riscos.');
          }
          sincronizarKris();
          recalcular(r);
          if (!estavaLivre) exigirTrava(r);
        } catch (e) {
          restaurarFoto(foto);
          throw e;
        }
        if (r.statusFluxo === 'aprovado') {
          r.statusFluxo = 'em_validacao_cg';
          registrar(
            r,
            'reabertura_nota',
            'reaberto_mudanca_nota',
            `Ficha alterada (${r.memoriaCalculo}). Reaberto para validação da Coordenação-Geral.`
          );
        }
        return { id: r.id, codigoRadar: r.codigoRadar };
      }

      // Ficha nova: valores padrão iguais aos da store de hoje.
      const objetoPadrao = objetos.find((o) => o.id === f.objetoId);
      if (!objetoPadrao) recusar('objeto não encontrado.');
      // Sem categoria na ficha nova: Operacional (id 2), o padrão de hoje.
      // Categoria que não existe é RECUSADA (no banco, a chave estrangeira
      // recusaria): nada de cair numa categoria qualquer sem ninguém ver.
      // Ex.: categoriaId 99 -> "Categoria não encontrada."
      const categoria = categorias.find((c) => c.id === (f.categoriaId ?? 2));
      if (!categoria) recusar('categoria não encontrada.');
      const nova: FichaRisco = {
        id: novoId('risco'),
        codigoRadar: proximoCodigo(),
        objetoId: objetoPadrao.id,
        unidadeId: objetoPadrao.unidadeId,
        atualizadoEm: null,
        nomeObjetoCache: objetoPadrao.nomeObjeto,
        responsavelRiscoNome: 'Gestor de Riscos (1ª Linha)',
        causas: 'Causa em detalhamento',
        eventoRisco: 'Evento de risco identificado',
        consequencias: 'Impacto nas entregas',
        objetivoAfetado: 'Alcance dos objetivos institucionais',
        descricaoPadrao: '',
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        testeIntegridadeAplicavel: false,
        probabilidade: 3 as NivelProbabilidade,
        impacto: 3 as NivelImpacto,
        nivelInerente: 0,
        classificacaoInerente: 'Baixo',
        possuiEvidenciaControle: false,
        nivelEficaciaControle: 'Inexistente' as NivelEficaciaControle,
        fatorControle: 1.0,
        nivelResidual: 0,
        classificacaoResidual: 'Baixo',
        statusCritico: 'pendente_dar',
        isCritico: false,
        memoriaCalculo: '',
        origemPreliminarCgov: Boolean(f.preliminarCgov),
        statusFluxo: f.preliminarCgov ? 'preliminar_cgov' : 'rascunho',
        estrategiaPrincipal: 'Mitigar',
        controlesExistentes: [],
        respostasTratamento: [],
        kris: [],
        historicoFluxo: [],
      };
      // Se a ligação de KRI for recusada, desfazemos o que ela já tenha feito.
      const fotoKris = copiar(kris);
      try {
        aplicarEntradas(nova, f);
        if (f.kris !== undefined) aplicarKris(nova, f.kris);
      } catch (e) {
        kris.splice(0, kris.length, ...fotoKris);
        sincronizarKris();
        throw e;
      }
      recalcular(nova);
      riscos.unshift(nova); // o mais novo aparece primeiro, como hoje
      sincronizarKris();
      return { id: nova.id, codigoRadar: nova.codigoRadar };
    },

    async excluirRisco(id) {
      const r = acharRisco(id);
      if (r.statusFluxo === 'aprovado') {
        recusar(`o risco ${r.codigoRadar} faz parte do Plano de Gestão de Riscos: não pode ser excluído`);
      }
      if (!EXCLUIVEIS.includes(r.statusFluxo)) {
        recusar('não é possível excluir o risco enquanto ele está em validação ou homologação');
      }
      riscos.splice(riscos.indexOf(r), 1);
      // LAC-03: desliga os KRIs dele; o KRI que ficar sem nenhum risco some (com as medições).
      for (const k of kris) k.riscoIds = k.riscoIds.filter((rid) => rid !== r.id);
      apagarOrfaos();
      sincronizarKris();
    },

    /** 1º degrau: a 1ª linha envia para validação da Coordenação-Geral. */
    async enviar(id) {
      const r = acharRisco(id);
      if (!ENVIAVEIS.includes(r.statusFluxo)) recusar('só se envia rascunho ou devolvido');
      exigirTrava(r); // LAC-13: antes de mudar o estado
      r.statusFluxo = 'em_validacao_cg';
      registrar(
        r,
        'submissao_1a_linha',
        'submetido',
        'Ficha submetida pela 1ª Linha para validação da Coordenação-Geral supervisora do Macroprocesso.'
      );
    },

    /** A unidade assume o risco preliminar da CGOV (vira rascunho dela). */
    async assumir(id) {
      const r = acharRisco(id);
      if (r.statusFluxo !== 'preliminar_cgov') recusar('só se assume risco preliminar da CGOV');
      r.statusFluxo = 'rascunho';
      registrar(r, 'assuncao_preliminar', 'assumido', 'Risco preliminar da CGOV assumido pela unidade.');
    },

    /**
     * 2º degrau: validação em 1 clique (comportamento de `aprovarEmUmCliqueCg`).
     * Risco Crítico (fora do apetite da DAR) sobe para a Diretoria; os demais
     * já ficam aprovados.
     *
     * Igual ao banco (`fn_fluxo_validar`, migração 20261115004): o risco cuja
     * categoria ainda não tem apetite na DAR (`statusCritico = 'pendente_dar'`)
     * também sobe para a Diretoria. Ex.: residual Médio (P=3, I=2 → 8) em
     * "Ocupacionais", que nasce `pendente_dar`, não pode ficar aprovado antes de
     * a DAR decidir o apetite dessa categoria.
     */
    async validar(id, parecer) {
      const r = acharRisco(id);
      if (r.statusFluxo !== 'em_validacao_cg') recusar('só se valida risco em validação');
      exigirTrava(r, SUFIXO_DEVOLVA); // LAC-13: ficha antiga com "Aceitar" tem de ser devolvida
      const exigeHomologacao = r.isCritico || r.statusCritico === 'sim' || r.statusCritico === 'pendente_dar';
      r.statusFluxo = exigeHomologacao ? 'em_homologacao_dir' : 'aprovado';
      registrar(
        r,
        'validacao_cg',
        'aprovado_1_clique',
        parecer ||
          (r.statusFluxo !== 'em_homologacao_dir'
            ? 'Aprovado em 1 clique pela Coordenação-Geral (Risco dentro do apetite da DAR).'
            : r.statusCritico === 'pendente_dar' && !r.isCritico
              ? 'Validado em 1 clique pela Coordenação-Geral e encaminhado à Diretoria: a categoria ainda não tem apetite declarado na DAR.'
              : 'Validado em 1 clique pela Coordenação-Geral e encaminhado à Diretoria por se tratar de Risco Crítico.')
      );
    },

    /** 3º degrau: a Diretoria homologa o Risco Crítico para o Plano de Gestão de Riscos. */
    async homologar(id, parecer) {
      const r = acharRisco(id);
      if (r.statusFluxo !== 'em_homologacao_dir') recusar('só se homologa risco em homologação');
      exigirTrava(r, SUFIXO_DEVOLVA); // LAC-13
      r.statusFluxo = 'aprovado';
      registrar(
        r,
        'homologacao_diretoria',
        'aprovado_1_clique',
        parecer || 'Homologado em 1 clique pela Diretoria para integrar o Plano de Gestão de Riscos do ICMBio.'
      );
    },

    /** Devolução para ajuste: o motivo é obrigatório (como no banco). */
    async devolver(id, motivo) {
      if (!motivo || !motivo.trim()) recusar('informe o motivo da devolução');
      const r = acharRisco(id);
      if (!TRAVADOS.includes(r.statusFluxo)) recusar('só se devolve risco em validação ou homologação');
      r.statusFluxo = 'devolvido';
      registrar(r, 'devolucao_ajuste', 'devolvido_ajuste', motivo.trim());
    },

    /** Monitoramento: lançar medição de KRI NÃO reabre o risco aprovado. */
    async registrarMedicao(kriId, m) {
      const kri = kris.find((k) => k.id === kriId);
      if (!kri) naoEncontrado('Indicador (KRI) não encontrado');
      kri.medicoes.unshift({ id: novoId('med'), ...m });
    },

    /** Monitoramento: andamento da ação 5W2H também mantém o risco aprovado. */
    async atualizarStatusTratamento(respostaId, status) {
      const resposta = riscos.flatMap((r) => r.respostasTratamento).find((t) => t.id === respostaId);
      if (!resposta) naoEncontrado('Ação de tratamento não encontrada');
      resposta.statusExecucao = status;
    },

    /** Cria (sem id) ou altera (com id) um objeto de gestão de riscos. */
    async salvarObjeto(o) {
      const unidade = unidades.find((u) => u.id === o.unidadeId);
      const existente = o.id ? objetos.find((x) => x.id === o.id) : undefined;
      if (o.id && !existente) recusar('objeto não encontrado.');
      const base: ObjetoContexto = existente ?? {
        id: o.id ?? novoId('obj'),
        tipoObjeto: 'Processo',
        nomeObjeto: 'Novo Objeto de Gestão de Riscos',
        unidadeId: o.unidadeId,
        macroprocessoSupervisorId: 'uni-cgge',
        diretoriaId: 'uni-diplan',
        objetivoEstrategicoAssociado: 'Objetivo estratégico institucional do ICMBio',
        insumosPrincipais: 'Processos SEI e normativos',
        entregasPrincipais: 'Atos técnicos e relatórios',
        partesInteressadas: 'Unidades do ICMBio e sociedade',
        cicloAno: 2026,
        processoId: null,
        processoNome: null,
        processoAtivo: null,
        unidadeAtiva: true,
      };
      // Campos undefined não sobrescrevem (mantêm o valor atual ou o padrão).
      const definidos = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
      const salvo: ObjetoContexto = { ...base, ...definidos, unidadeAtiva: unidade ? unidade.ativa : base.unidadeAtiva };
      if (existente) {
        objetos[objetos.indexOf(existente)] = salvo;
        // O nome do objeto aparece nos riscos: mantém em dia.
        for (const r of riscos) {
          if (r.objetoId === salvo.id) {
            r.nomeObjetoCache = salvo.nomeObjeto;
            r.unidadeId = salvo.unidadeId;
          }
        }
      } else {
        objetos.unshift(salvo);
      }
      return copiar(salvo);
    },

    /**
     * Leva o objeto (e os riscos dele) para outra unidade ativa.
     * Na demonstração não exigimos que a unidade antiga esteja inativa
     * (a semente não tem unidade inativa para testar a tela).
     */
    async reatribuirObjeto(objetoId, novaUnidadeId) {
      const objeto = objetos.find((o) => o.id === objetoId);
      if (!objeto) recusar('objeto não encontrado.');
      const unidade = unidades.find((u) => u.id === novaUnidadeId && u.ativa);
      if (!unidade) recusar('a unidade de destino não existe ou está inativa');
      objeto.unidadeId = unidade.id;
      objeto.unidadeAtiva = true;
      for (const r of riscos) if (r.objetoId === objetoId) r.unidadeId = unidade.id;
    },

    /**
     * DAR: muda o apetite da categoria e recalcula NA MEMÓRIA a criticidade
     * de todos os riscos dela (comportamento de hoje).
     */
    async alterarApetite(categoriaId, apetite) {
      const cat = categorias.find((c) => c.id === categoriaId);
      if (!cat) naoEncontrado('Categoria não encontrada');
      const apetiteAnterior = cat.apetiteDeclarado;
      cat.apetiteDeclarado = apetite;
      for (const r of riscos) {
        if (r.categoriaId !== categoriaId) continue;
        const c = calcularRiscoCompletoRadar({
          probabilidade: r.probabilidade,
          impacto: r.impacto,
          eficaciaControle: r.nivelEficaciaControle,
          possuiEvidenciaComprovada: r.possuiEvidenciaControle,
          apetiteCategoria: apetite,
        });
        r.statusCritico = c.statusCritico;
        r.isCritico = c.isCritico;
        r.memoriaCalculo = c.memoriaCalculo;
        // LAC-13: risco aprovado que passou a crítico e está com "Aceitar" (ou
        // sem ação de tratamento) não pode continuar aprovado: volta para a
        // unidade. Os demais mantêm o comportamento de hoje da demonstração.
        if (r.statusFluxo === 'aprovado' && !travaDaFicha(r).ok) {
          r.statusFluxo = 'devolvido';
          // Texto fixo, igual ao do banco: situação + motivo devolvido pela trava.
          const situacao =
            r.statusCritico === 'sim'
              ? 'fora do apetite da DAR'
              : 'com DAR pendente; por regra do sistema, a trava do risco crítico também se aplica';
          const trava = travaDaFicha(r);
          registrar(
            r,
            'reabertura_nota',
            'devolvido_mudanca_dar',
            `DAR alterada: categoria ${cat.nome} com apetite ${apetiteAnterior} → ${apetite}. O risco aprovado (residual ${r.nivelResidual}, ${r.classificacaoResidual}, ${situacao}) não passa na trava do risco crítico: ${trava.ok ? '' : textoDoMotivo(trava.motivo)}. Voltou para a unidade ajustar.`
          );
        }
      }
    },

    async alterarJustificativa(categoriaId, texto) {
      const cat = categorias.find((c) => c.id === categoriaId);
      if (!cat) naoEncontrado('Categoria não encontrada');
      cat.justificativaDar = texto;
    },

    /**
     * Na demonstração não há tabela de auditoria: a trilha é montada a partir
     * do histórico do fluxo (tabela 'historico_fluxo', operação INSERT),
     * do mais novo para o mais antigo, com o mesmo cursor do banco.
     */
    async lerAuditoria(f, limite = 50) {
      const eventos: EventoAuditoria[] = riscos.flatMap((r) =>
        r.historicoFluxo.map((h) => ({
          id: h.id,
          realizadoEm: h.criadoEm,
          tabela: 'historico_fluxo',
          operacao: 'INSERT' as const,
          quemNome: h.usuarioNome,
          quemPapel: String(h.usuarioPapel),
          codigoRadar: r.codigoRadar,
          anteriores: null,
          novos: { etapa: h.etapa, acao: h.acao, despacho_texto: h.despachoTexto ?? null },
        }))
      );
      // Ordem decrescente por data e, no empate, por id (ordem estável).
      const ordenados = eventos.sort(
        (a, b) => b.realizadoEm.localeCompare(a.realizadoEm) || b.id.localeCompare(a.id)
      );
      return copiar(
        ordenados
          .filter((e) => !f.de || e.realizadoEm >= f.de)
          .filter((e) => !f.ate || e.realizadoEm <= f.ate)
          .filter((e) => !f.tabela || e.tabela === f.tabela)
          .filter(
            (e) =>
              !f.antesDe ||
              e.realizadoEm < f.antesDe.em ||
              (e.realizadoEm === f.antesDe.em && e.id < f.antesDe.id)
          )
          .slice(0, limite)
      );
    },

    async lerAtividadeRecente(n) {
      const eventos: EventoFluxo[] = riscos.flatMap((r) =>
        r.historicoFluxo.map((h) => ({ ...h, usuarioPapel: String(h.usuarioPapel), riscoId: r.id, codigoRadar: r.codigoRadar }))
      );
      eventos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id));
      return copiar(eventos.slice(0, n));
    },
  };
}
