<script setup lang="ts">
/**
 * ============================================================================
 * PÁGINA "SOBRE O RADAR" (`/sobre`) — informações técnicas e institucionais
 * ============================================================================
 *
 * EXPLICAÇÃO DIDÁTICA:
 * Reúne o que antes ficava espremido no rodapé: versão, normas correlatas,
 * fontes de dados, unidades responsáveis, painéis relacionados e o endereço
 * do código-fonte.
 *
 * O LAYOUT segue o "Template V3 — Relatórios" (Figma Community) indicado pela
 * CGOV: cada seção é uma "página de relatório" em duas colunas.
 *
 *   ┌──────────────────────────────┬──────────────────────────────┐
 *   │ 01                           │░ Ficha técnica (tabela)     ░│
 *   │ O QUE É O RADAR              │░ Versão        1.0.0        ░│
 *   │ Texto corrido…               │░ Dados         Demonstração ░│
 *   └──────────────────────────────┴──────────────────────────────┘
 *     texto à esquerda               painel cinza à direita
 *
 * No celular as duas colunas empilham (texto em cima, painel embaixo).
 *
 * Cada seção tem um `id` (ex.: `#normas`) — os atalhos do rodapé levam direto
 * a ela. Os dados vêm de `src/utils/sobreRadar.ts` (mesma fonte do rodapé).
 */
import {
  FONTES_DADOS_RADAR,
  NORMAS_RADAR,
  PAINEIS_INTEGRADOS,
  REPOSITORIO_RADAR,
  SECOES_SOBRE,
  UNIDADES_RADAR,
  VERSAO_RADAR,
} from '../utils/sobreRadar';

/** Número da seção com dois dígitos ("01", "02"…), como no template de relatório. */
const numero = (id: string) => String(SECOES_SOBRE.findIndex((s) => s.id === id) + 1).padStart(2, '0');
const titulo = (id: string) => SECOES_SOBRE.find((s) => s.id === id)?.titulo ?? '';

const FICHA_TECNICA: [string, string][] = [
  ['Versão', VERSAO_RADAR],
  ['Dados exibidos', 'Demonstração (casos do Anexo II da Metodologia)'],
  ['Unidade responsável', 'Coordenação de Governança (CGOV/CGGE)'],
  ['Tecnologia', 'Vue 3, TypeScript, gov.br Design System e Supabase'],
  ['Acessibilidade', 'WCAG 2.2 nível AA e eMAG, verificada com axe-core'],
];
</script>

<template>
  <div class="sobre">
    <!-- Índice da página: atalhos para cada seção -->
    <nav class="sobre__indice" aria-label="Nesta página">
      <ul>
        <li v-for="s in SECOES_SOBRE" :key="s.id">
          <a :href="`#${s.id}`">{{ s.titulo }}</a>
        </li>
      </ul>
    </nav>

    <article class="relatorio">
      <!-- 01. O QUE É O RADAR -->
      <section id="o-que-e" class="relatorio__secao" aria-labelledby="titulo-o-que-e">
        <div class="relatorio__texto">
          <span class="relatorio__numero" aria-hidden="true">{{ numero('o-que-e') }}</span>
          <h2 id="titulo-o-que-e" class="relatorio__titulo">{{ titulo('o-que-e') }}</h2>
          <p>
            O <strong>RADAR</strong> (Rede de Avaliação, Diagnóstico e Ação em Riscos) é o sistema da
            Coordenação de Governança para mapear, avaliar e acompanhar os riscos do ICMBio. Ele põe em
            prática a Política e a Metodologia de Gestão de Riscos do Instituto.
          </p>
          <p>
            Cada risco é descrito pela unidade (1ª Linha), validado pela Coordenação-Geral e homologado
            pela Diretoria antes de entrar no Plano de Gestão de Riscos. As contas seguem as tabelas da
            Metodologia: o nível inerente é lido do Quadro 7, e nunca calculado multiplicando
            probabilidade por impacto.
          </p>
        </div>
        <div class="relatorio__painel">
          <table class="relatorio__tabela">
            <caption class="relatorio__legenda">Ficha técnica</caption>
            <tbody>
              <tr v-for="[rotulo, valor] in FICHA_TECNICA" :key="rotulo">
                <th scope="row">{{ rotulo }}</th>
                <td>{{ valor }}</td>
              </tr>
              <tr>
                <th scope="row">Código-fonte</th>
                <td>
                  <a :href="REPOSITORIO_RADAR" rel="noopener">
                    github.com/lpchagas/cgov-riscos
                    <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 02. NORMAS CORRELATAS -->
      <section id="normas" class="relatorio__secao" aria-labelledby="titulo-normas">
        <div class="relatorio__texto">
          <span class="relatorio__numero" aria-hidden="true">{{ numero('normas') }}</span>
          <h2 id="titulo-normas" class="relatorio__titulo">{{ titulo('normas') }}</h2>
          <p>
            As duas primeiras normas da tabela são a base do sistema. Enquanto não forem publicadas, o
            RADAR segue o texto das minutas registradas no SEI. As demais são citadas por elas.
          </p>
          <p>
            Quando uma norma muda, a regra correspondente muda em um único lugar do código (a calculadora
            oficial) e os testes automáticos conferem os casos de controle da Metodologia.
          </p>
        </div>
        <div class="relatorio__painel">
          <table class="relatorio__tabela">
            <caption class="relatorio__legenda">Normas e onde aparecem no sistema</caption>
            <thead>
              <tr>
                <th scope="col">Norma</th>
                <th scope="col">Como o RADAR usa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in NORMAS_RADAR" :key="n.nome">
                <td>
                  <span class="relatorio__destaque">{{ n.nome }}</span>
                  <span class="relatorio__suave">{{ n.assunto }}</span>
                </td>
                <td>{{ n.usoNoRadar }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 03. FONTES DE DADOS -->
      <section id="fontes-de-dados" class="relatorio__secao" aria-labelledby="titulo-fontes-de-dados">
        <div class="relatorio__texto">
          <span class="relatorio__numero" aria-hidden="true">{{ numero('fontes-de-dados') }}</span>
          <h2 id="titulo-fontes-de-dados" class="relatorio__titulo">{{ titulo('fontes-de-dados') }}</h2>
          <p>
            Nenhum número do RADAR é digitado direto no Painel. Tudo vem das fichas preenchidas pelas
            unidades e das decisões registradas no fluxo de aprovação.
          </p>
          <p>
            Cada envio, validação, devolução e mudança de nota fica gravado com data, hora e autor na
            página <RouterLink :to="{ name: 'trilha-auditoria' }">Auditoria</RouterLink>.
          </p>
        </div>
        <div class="relatorio__painel">
          <table class="relatorio__tabela">
            <caption class="relatorio__legenda">Quem alimenta cada informação</caption>
            <thead>
              <tr>
                <th scope="col">Informação</th>
                <th scope="col">Quem alimenta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in FONTES_DADOS_RADAR" :key="f.fonte">
                <td>{{ f.fonte }}</td>
                <td>{{ f.quemAlimenta }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 04. GOVERNANÇA E CONTATO -->
      <section id="governanca" class="relatorio__secao" aria-labelledby="titulo-governanca">
        <div class="relatorio__texto">
          <span class="relatorio__numero" aria-hidden="true">{{ numero('governanca') }}</span>
          <h2 id="titulo-governanca" class="relatorio__titulo">{{ titulo('governanca') }}</h2>
          <p>
            <strong>Contato:</strong> Coordenação de Governança (CGOV/CGGE). O e-mail institucional será
            publicado aqui assim que for definido.
          </p>
          <p>Dúvidas sobre uma ficha de risco devem ir primeiro ao ponto focal de riscos da sua unidade.</p>
        </div>
        <div class="relatorio__painel">
          <table class="relatorio__tabela">
            <caption class="relatorio__legenda">Unidades responsáveis</caption>
            <thead>
              <tr>
                <th scope="col">Unidade</th>
                <th scope="col">Papel no RADAR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in UNIDADES_RADAR" :key="u.sigla">
                <td>
                  <span class="relatorio__destaque">{{ u.sigla }}</span>
                  <span class="relatorio__suave">{{ u.nome }}</span>
                </td>
                <td>{{ u.papel }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 05. PAINÉIS RELACIONADOS -->
      <section id="paineis" class="relatorio__secao" aria-labelledby="titulo-paineis">
        <div class="relatorio__texto">
          <span class="relatorio__numero" aria-hidden="true">{{ numero('paineis') }}</span>
          <h2 id="titulo-paineis" class="relatorio__titulo">{{ titulo('paineis') }}</h2>
          <p>Soluções irmãs do RADAR no ICMBio. Os endereços serão incluídos quando confirmados.</p>
        </div>
        <div class="relatorio__painel">
          <ul class="relatorio__lista">
            <li v-for="p in PAINEIS_INTEGRADOS" :key="p.rotulo">
              <a v-if="p.href" :href="p.href">{{ p.rotulo }}</a>
              <span v-else>{{ p.rotulo }}</span>
            </li>
          </ul>
        </div>
      </section>
    </article>

    <!-- Fecho no estilo "número de página" do template -->
    <p class="relatorio__fecho">RADAR · versão {{ VERSAO_RADAR }}</p>
  </div>
</template>

<style scoped>
.sobre {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

/* --- Índice ------------------------------------------------------------- */
.sobre__indice ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.sobre__indice a {
  display: inline-flex;
  align-items: center;
  min-height: var(--alvo-minimo);
  padding: 0 var(--esp-4);
  border: 1px solid var(--borda-forte);
  border-radius: var(--raio-pilula);
  color: var(--texto-link);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  text-decoration: none;
}

.sobre__indice a:hover {
  background: var(--superficie-alta);
}

/* --- Relatório em duas colunas ----------------------------------------- */
.relatorio {
  overflow: hidden;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--raio-lg);
}

/* Cada seção: texto (esq.) + painel cinza (dir.). Sem espaço entre seções,
   para o cinza formar uma faixa contínua, como no template. */
.relatorio__secao {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.relatorio__secao + .relatorio__secao .relatorio__texto {
  border-top: 1px solid var(--borda);
}

.relatorio__texto {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-6);
}

.relatorio__texto p {
  margin: 0;
  line-height: 1.6;
}

.relatorio__numero {
  font-size: var(--titulo-sm);
  font-weight: var(--peso-forte);
  color: var(--texto-link);
}

/* Título "de relatório": caixa alta, leve, com um traço cinza embaixo. */
.relatorio__titulo {
  margin: 0;
  padding-bottom: var(--esp-3);
  border-bottom: 3px solid var(--borda);
  font-size: var(--titulo-md);
  font-weight: var(--peso-medio);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.relatorio__painel {
  padding: var(--esp-6) var(--esp-5);
  background: var(--superficie-container);
}

.relatorio__tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--texto-sm);
}

.relatorio__legenda {
  padding-bottom: var(--esp-2);
  font-weight: var(--peso-forte);
  text-align: left;
}

/* Cabeçalhos azuis e linhas finas (referência do template). */
.relatorio__tabela th {
  /* O gov.br DS pinta o fundo do <th> de cinza fixo; no alto contraste o texto
     amarelo sumia (1,06:1). O fundo vem do painel (token), não do core. */
  background: transparent;
  color: var(--texto-link);
  font-weight: var(--peso-semi);
  text-align: left;
  vertical-align: top;
}

.relatorio__tabela th,
.relatorio__tabela td {
  padding: var(--esp-3) var(--esp-2);
  border-bottom: 1px solid var(--borda);
}

.relatorio__tabela th[scope='row'] {
  width: 38%;
}

.relatorio__destaque {
  display: block;
  font-weight: var(--peso-semi);
}

.relatorio__suave {
  display: block;
  font-size: var(--texto-xs);
  color: var(--texto-secundario);
}

.relatorio__lista {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
}

.relatorio__lista li {
  padding: var(--esp-3) var(--esp-2);
  border-bottom: 1px solid var(--borda);
}

/* "Número de página" do template: texto à direita sobre uma barra azul-clara. */
.relatorio__fecho {
  align-self: flex-end;
  margin: 0;
  padding: var(--esp-1) var(--esp-4);
  border-bottom: 4px solid var(--cor-primaria-suave);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-secundario);
}

/* --- Celular: colunas empilhadas -------------------------------------- */
@media (max-width: 899.98px) {
  .relatorio__secao {
    grid-template-columns: minmax(0, 1fr);
  }
  .relatorio__texto {
    padding: var(--esp-5) var(--esp-4) var(--esp-4);
  }
  .relatorio__painel {
    padding: var(--esp-4);
  }
  .relatorio__titulo {
    font-size: var(--titulo-sm);
  }
}
</style>
