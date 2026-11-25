/**
 * ============================================================================
 * RESUMOS DO PAINEL (`src/utils/painelResumo.ts`)
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * O Painel é uma tela de SÍNTESE: ele não calcula riscos, só CONTA e ORDENA o
 * que a calculadora oficial (`calculadoraRiscoRadar.ts`) já gravou em cada
 * ficha. Separar essa lógica em funções "puras" (sem tela, sem store) traz
 * duas vantagens:
 *   1. dá para testar cada regra com Vitest, sem montar a página;
 *   2. a página (`PainelConsolidadoCgovView.vue`) fica curta e fácil de ler.
 *
 * Regra de ouro mantida aqui: NUNCA recalcular nível. Usamos sempre os campos
 * `nivelResidual`, `classificacaoResidual` e `statusCritico` da ficha.
 */
import type { RouteLocationRaw } from 'vue-router';
import type {
  AcoesFluxo,
  AlertaKri,
  CategoriaRisco,
  ClasseRisco,
  FichaRisco,
  HistoricoFluxoItem,
  IndicadorKri,
  NivelImpacto,
  NivelProbabilidade,
  PapelGovernanca,
} from '../types/radar.types';
import type { TomVisual } from './rotulosInterface';
import { alertaAtualDoKri, situacaoKri } from './situacaoKri';
import { descreverLimiteKri } from './limiteAlerta';

// ---------------------------------------------------------------------------
// 1. MATRIZ: quantos riscos há em cada célula (P × I)
// ---------------------------------------------------------------------------

/** Chave de uma célula da matriz. Ex.: P=3, I=5 → "3-5". */
export function chaveCelula(p: NivelProbabilidade, i: NivelImpacto): string {
  return `${p}-${i}`;
}

/**
 * Conta os riscos por célula da Matriz 5×5.
 * Ex.: dois riscos com P=2 e I=5 → { "2-5": 2 }.
 * A posição na matriz usa a avaliação INERENTE (P e I), como no Quadro 7.
 */
export function contarRiscosPorCelula(riscos: FichaRisco[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const r of riscos) {
    const chave = chaveCelula(r.probabilidade, r.impacto);
    contagem[chave] = (contagem[chave] ?? 0) + 1;
  }
  return contagem;
}

// ---------------------------------------------------------------------------
// 2. MAIORES RISCOS RESIDUAIS e DISTRIBUIÇÃO POR NÍVEL
// ---------------------------------------------------------------------------

/**
 * Os `quantidade` riscos com maior nível residual (empate: código em ordem
 * alfabética, para a lista não "pular" de uma visita para outra).
 * Não altera a lista original (`[...riscos]` faz uma cópia antes de ordenar).
 */
export function maioresRiscosResiduais(riscos: FichaRisco[], quantidade = 5): FichaRisco[] {
  return [...riscos]
    .sort((a, b) => b.nivelResidual - a.nivelResidual || a.codigoRadar.localeCompare(b.codigoRadar))
    .slice(0, quantidade);
}

export interface FaixaDistribuicao {
  classe: ClasseRisco;
  quantidade: number;
  /** Largura da barra (0 a 100), relativa ao nível com mais riscos. */
  percentual: number;
}

/**
 * Quantos riscos há em cada nível residual (Quadro 8), do mais grave ao mais
 * leve. A barra mais longa é sempre 100%; as outras são proporcionais a ela.
 */
export function distribuicaoPorNivelResidual(riscos: FichaRisco[]): FaixaDistribuicao[] {
  const ordem: ClasseRisco[] = ['Extremo', 'Alto', 'Médio', 'Baixo'];
  const contagem = ordem.map((classe) => ({
    classe,
    quantidade: riscos.filter((r) => r.classificacaoResidual === classe).length,
  }));
  const maior = Math.max(1, ...contagem.map((c) => c.quantidade));
  return contagem.map((c) => ({ ...c, percentual: Math.round((c.quantidade / maior) * 100) }));
}

// ---------------------------------------------------------------------------
// 3. RESUMO DA DAR (apetite das 8 categorias do Quadro 2)
// ---------------------------------------------------------------------------

export interface ResumoDar {
  totalCategorias: number;
  baixo: number;
  moderado: number;
  pendentes: number;
}

export function resumirDar(categorias: CategoriaRisco[]): ResumoDar {
  return {
    totalCategorias: categorias.length,
    baixo: categorias.filter((c) => c.apetiteDeclarado === 'baixo').length,
    moderado: categorias.filter((c) => c.apetiteDeclarado === 'moderado').length,
    pendentes: categorias.filter((c) => c.apetiteDeclarado === 'pendente_dar').length,
  };
}

// ---------------------------------------------------------------------------
// 4. "PRECISA DA SUA ATENÇÃO" — muda conforme o perfil
// ---------------------------------------------------------------------------

export type TipoItemAtencao = 'kri' | 'validacao' | 'homologacao' | 'devolvido' | 'prazo';

export interface ItemAtencao {
  id: string;
  tipo: TipoItemAtencao;
  tom: TomVisual;
  titulo: string;
  detalhe: string;
  /** Texto do link de ação (sempre um verbo: "Validar agora"). */
  acao: string;
  destino: RouteLocationRaw;
}

/** Ações com prazo até esta quantidade de dias aparecem como "vencendo". */
export const DIAS_AVISO_PRAZO = 45;

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Diferença em dias inteiros entre duas datas (só a parte AAAA-MM-DD conta). Ex.: hoje 14/11, prazo 15/12 → 31. */
export function diasAte(dataIso: string, hoje: Date): number {
  const alvo = Date.UTC(+dataIso.slice(0, 4), +dataIso.slice(5, 7) - 1, +dataIso.slice(8, 10));
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / UM_DIA_MS);
}

/** "2026-12-15" → "15/12/2026" (sem passar por fuso horário). */
export function dataCurta(dataIso: string): string {
  const [a, m, d] = dataIso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function listaCodigos(riscos: FichaRisco[]): string {
  return riscos.map((r) => r.codigoRadar).join(', ');
}

/**
 * Monta a lista "Precisa da sua atenção" para o perfil logado.
 *
 * Quem vê o quê (as 3 Linhas do RADAR):
 * - **Gestor (1ª Linha):** indicadores em alerta, riscos devolvidos e prazos.
 * - **Coordenação-Geral (2º degrau):** riscos aguardando a SUA validação, indicadores e prazos.
 * - **Diretoria (3º degrau):** riscos aguardando a SUA homologação e prazos dos riscos Críticos.
 * - **CGOV (2ª Linha):** supervisiona: itens neutros "aguardando ... nas unidades" para os
 *   riscos parados que ela não decide (os itens "a sua ..." seguem só `podeValidar`/`podeHomologar`).
 *
 * QUEM PODE O QUÊ vem de `acoes` (a resposta do banco: `podeValidar`,
 * `podeHomologar`, `podeEnviar`), e não mais do perfil. Ex.: um risco em validação
 * só aparece como "a sua validação" se `acoes[risco.id].podeValidar` for verdadeiro.
 * O perfil só decide quem SUPERVISIONA (CGOV) e quem vê indicadores (KRI) e prazos.
 * Risco sem entrada em `acoes` conta como "nada liberado".
 *
 * `hoje` é um parâmetro (e não `new Date()` lá dentro) para que o teste
 * consiga fixar a data e o resultado seja sempre o mesmo.
 *
 * `alertas` são os alertas dos KRIs (LAC-03, visão `alertas_kri_situacao`): só o
 * alerta ABERTO (no prazo ou vencido) vira item; o já comunicado à CGOV, não.
 *
 * `krisSemRisco` (N-8 da revisão da Fase 2) são os KRIs sem risco ligado à vista
 * (`riscosStore.krisSemRisco`): o alerta aberto deles também vira item, sem códigos de
 * risco. Ex.: o único risco do KRI foi excluído → "Sem risco ligado · … · dia 3 de 10".
 */
export function itensDeAtencao(
  riscos: FichaRisco[],
  papel: PapelGovernanca,
  hoje: Date,
  acoes: Record<string, AcoesFluxo> = {},
  alertas: AlertaKri[] = [],
  krisSemRisco: IndicadorKri[] = []
): ItemAtencao[] {
  const itens: ItemAtencao[] = [];

  // (a) Filas do fluxo de aprovação
  // REGRA: contamos e listamos SÓ os riscos que ESTA pessoa pode decidir agora
  // (`acoes[id].podeValidar` / `podeHomologar`, resposta do banco). Um risco
  // aguardando validação que não é da sua alçada não entra na contagem.
  // Ex.: 2 riscos em validação, só o RADAR-2026-001 com `podeValidar` → "1 risco
  // aguardando a sua validação" e só ele no detalhe.
  const aguardandoCg = riscos.filter((r) => r.statusFluxo === 'em_validacao_cg' && acoes[r.id]?.podeValidar);
  if (aguardandoCg.length) {
    itens.push({
      id: 'fila-cg',
      tipo: 'validacao',
      tom: 'info',
      titulo: `${plural(aguardandoCg.length, 'risco aguardando', 'riscos aguardando')} a sua validação`,
      detalhe: listaCodigos(aguardandoCg),
      acao: 'Validar agora',
      destino: { name: 'validacao-um-clique' },
    });
  }

  const aguardandoDiretoria = riscos.filter((r) => r.statusFluxo === 'em_homologacao_dir' && acoes[r.id]?.podeHomologar);
  if (aguardandoDiretoria.length) {
    itens.push({
      id: 'fila-diretoria',
      tipo: 'homologacao',
      tom: 'aviso',
      titulo: `${plural(aguardandoDiretoria.length, 'risco aguardando', 'riscos aguardando')} a sua homologação`,
      detalhe: listaCodigos(aguardandoDiretoria),
      acao: 'Homologar agora',
      destino: { name: 'validacao-um-clique' },
    });
  }

  // SUPERVISÃO da CGOV (2ª Linha): riscos parados no fluxo que ela NÃO decide.
  // Itens neutros ("nas unidades"), para não parecerem tarefa da pessoa.
  // Ex.: 2 riscos em validação, nenhum com `podeValidar` → "2 riscos aguardando validação nas unidades".
  if (papel === 'cgov') {
    const paradosCg = riscos.filter((r) => r.statusFluxo === 'em_validacao_cg' && !acoes[r.id]?.podeValidar);
    if (paradosCg.length) {
      itens.push({
        id: 'fila-cg-supervisao',
        tipo: 'validacao',
        tom: 'info',
        titulo: `${plural(paradosCg.length, 'risco aguardando', 'riscos aguardando')} validação nas unidades`,
        detalhe: listaCodigos(paradosCg),
        acao: 'Abrir aprovações',
        destino: { name: 'validacao-um-clique' },
      });
    }
    const paradosDir = riscos.filter((r) => r.statusFluxo === 'em_homologacao_dir' && !acoes[r.id]?.podeHomologar);
    if (paradosDir.length) {
      itens.push({
        id: 'fila-diretoria-supervisao',
        tipo: 'homologacao',
        tom: 'aviso',
        titulo: `${plural(paradosDir.length, 'risco aguardando', 'riscos aguardando')} homologação nas unidades`,
        detalhe: listaCodigos(paradosDir),
        acao: 'Abrir aprovações',
        destino: { name: 'validacao-um-clique' },
      });
    }
  }

  // Devolvidos: quem pode reenviar (`podeEnviar`) ou a CGOV, que supervisiona.
  const devolvidos = riscos.filter(
    (r) => r.statusFluxo === 'devolvido' && (papel === 'cgov' || acoes[r.id]?.podeEnviar)
  );
  if (devolvidos.length) {
    itens.push({
      id: 'devolvidos',
      tipo: 'devolvido',
      tom: 'aviso',
      titulo: `${plural(devolvidos.length, 'risco devolvido', 'riscos devolvidos')} para ajuste`,
      detalhe: listaCodigos(devolvidos),
      acao: 'Ver riscos devolvidos',
      destino: { name: 'riscos-lista', query: { status: 'devolvido' } },
    });
  }

  // (b) Indicadores (KRI) com alerta ABERTO (LAC-03): no prazo ("dia N de 10 dias
  // úteis") ou vencido. Quem decide é a situação do KRI (`situacaoKri`), e não a
  // marca "em alerta" da última leitura: o alerta já comunicado à CGOV não pede
  // mais nada da pessoa e por isso não aparece.
  // O KRI compartilhado aparece em CADA risco ligado (mesmo id). Aqui ele
  // entra UMA vez só, com os códigos de todos os riscos. Ex.: o KRI k1 dos riscos
  // 001 e 004 em alerta → um item "RADAR-2026-001, RADAR-2026-004 · 70% em ...".
  if (papel !== 'diretor') {
    const porKri = new Map<string, { kri: FichaRisco['kris'][number]; codigos: string[] }>();
    for (const r of riscos) {
      for (const kri of r.kris) {
        const grupo = porKri.get(kri.id);
        if (grupo) grupo.codigos.push(r.codigoRadar);
        else porKri.set(kri.id, { kri, codigos: [r.codigoRadar] });
      }
    }
    // KRIs sem risco ligado à vista: entram sem códigos (só os com alerta passam no filtro abaixo).
    for (const kri of krisSemRisco) if (!porKri.has(kri.id)) porKri.set(kri.id, { kri, codigos: [] });
    for (const { kri, codigos } of porKri.values()) {
      const alerta = alertaAtualDoKri(alertas, kri.id);
      const situacao = situacaoKri(kri, alerta);
      if (!alerta || (situacao !== 'vencido' && situacao !== 'alerta')) continue;
      const ultima = [...kri.medicoes].sort((a, b) => b.dataMedicao.localeCompare(a.dataMedicao))[0];
      // Prazo de 10 dias úteis com o número do banco (sem somar 1: no dia da ciência, "dia 0").
      const prazo =
        situacao === 'vencido'
          ? `prazo vencido há ${plural(alerta.diasUteisVencido, 'dia útil', 'dias úteis')}`
          : `dia ${alerta.diaAtual} de 10 dias úteis`;
      const leitura = ultima ? ` · ${ultima.valorApurado} em ${dataCurta(ultima.dataMedicao)}` : '';
      // Sem código de risco: diz por quê (órfão, ou riscos que a pessoa não vê — `totalRiscos`).
      const semCodigos = (kri.totalRiscos ?? 0) > 0 ? 'Riscos fora da sua visão' : 'Sem risco ligado';
      const riscosDoItem = codigos.length ? codigos.join(', ') : semCodigos;
      // Limite: o mesmo texto do Monitoramento (por extenso, "a converter" ou "limite não definido").
      itens.push({
        id: `kri-${kri.id}`,
        tipo: 'kri',
        tom: 'perigo',
        titulo: `Indicador em alerta: ${kri.nomeIndicador}`,
        detalhe: `${riscosDoItem}${leitura} (alerta: ${descreverLimiteKri(kri)}) · ${prazo}`,
        // Sem risco ligado não há onde registrar leitura (o Monitoramento só oferece "Comunicar à CGOV").
        acao: papel === 'gestor' && codigos.length ? 'Registrar nova leitura' : 'Ver indicador',
        destino: { name: 'monitoramento-kris' },
      });
    }
  }

  // (c) Ações do plano (5W2H) atrasadas ou vencendo em breve
  // A Diretoria só acompanha as ações dos riscos Críticos (fora da DAR).
  const riscosComPrazo = papel === 'diretor' ? riscos.filter((r) => r.statusCritico === 'sim') : riscos;
  const prazos: (ItemAtencao & { dias: number })[] = [];
  for (const r of riscosComPrazo) {
    for (const acao of r.respostasTratamento) {
      if (acao.statusExecucao === 'concluida' || !acao.prazoQuando) continue;
      const dias = diasAte(acao.prazoQuando, hoje);
      const atrasada = dias < 0 || acao.statusExecucao === 'atrasada';
      if (!atrasada && dias > DIAS_AVISO_PRAZO) continue;
      prazos.push({
        id: `prazo-${acao.id}`,
        tipo: 'prazo',
        tom: atrasada ? 'perigo' : 'neutro',
        titulo: atrasada
          ? `Ação atrasada: ${acao.acaoOQue}`
          : `Ação vence em ${plural(dias, 'dia', 'dias')}: ${acao.acaoOQue}`,
        detalhe: `${r.codigoRadar} · prazo ${dataCurta(acao.prazoQuando)}${
          acao.statusExecucao === 'nao_iniciada' ? ' · não iniciada' : ''
        }`,
        acao: papel === 'gestor' ? 'Atualizar andamento' : 'Ver plano de ação',
        destino: { name: 'monitoramento-kris', query: { aba: 'plano' } },
        dias,
      });
    }
  }
  // As mais urgentes primeiro.
  prazos.sort((a, b) => a.dias - b.dias);
  itens.push(...prazos.map(({ dias: _dias, ...item }) => item));

  return itens;
}

// ---------------------------------------------------------------------------
// 5. ATIVIDADE RECENTE — frase curta para cada evento do histórico
// ---------------------------------------------------------------------------

/**
 * Transforma um registro técnico do histórico em uma frase para pessoas.
 * Ex.: { etapa: 'homologacao_diretoria', acao: 'aprovado_1_clique' }
 *      → "homologado pela Diretoria e incluído no Plano".
 */
export function descreverEventoFluxo(evento: {
  etapa: HistoricoFluxoItem['etapa'] | string;
  acao: HistoricoFluxoItem['acao'] | string;
}): string {
  if (evento.acao === 'submetido') return 'enviado para validação pela unidade (1ª Linha)';
  if (evento.acao === 'devolvido_ajuste') return 'devolvido à unidade para ajuste';
  if (evento.acao === 'reaberto_mudanca_nota') return 'reaberto para nova validação após mudança na avaliação';
  if (evento.etapa === 'homologacao_diretoria') return 'homologado pela Diretoria e incluído no Plano';
  if (evento.etapa === 'validacao_cg') return 'validado pela Coordenação-Geral';
  return 'atualizado no fluxo de aprovação';
}
