---
tipo: uml
nivel: 5
data: 2026-11-21
---

# UML 3 — Classes (domínio, stores e camada de dados)

> `classDiagram` a partir de `src/types/radar.types.ts`, `src/services/dados/`, `src/stores/` e
> `src/utils/calculadoraRiscoRadar.ts`. Os nomes das operações são os **nomes reais** das funções (conferidos
> em 2026-11-21). Só os atributos principais aparecem; a lista completa está em
> [[dicionario-dados]] (banco) e no próprio arquivo de tipos. As stores do Pinia e os módulos de funções não são
> classes no código; aqui são desenhados como classes (estereótipos `«store»` e `«módulo»`) só para mostrar
> responsabilidades e dependências.

## 1. Domínio (tipos do front)

```mermaid
classDiagram
  direction LR
  class UnidadeOrganizacional {
    id
    sigla
    tipo : TipoUnidade
    unidadePaiId
    ativa
  }
  class ProcessoCadeiaValor
  class CategoriaRisco {
    id
    nome
    apetiteDeclarado : baixo, moderado, pendente_dar
    justificativaDar
  }
  class ObjetoContexto {
    id
    tipoObjeto
    nomeObjeto
    unidadeId
    processoId
    cicloAno
  }
  class FichaRisco {
    id
    codigoRadar
    causas / eventoRisco / consequencias
    probabilidade : 1..5
    impacto : 1..5
    nivelInerente
    nivelEficaciaControle
    fatorControle
    nivelResidual
    classificacaoResidual : Baixo, Médio, Alto, Extremo
    statusCritico : sim, nao, pendente_dar
    isCritico
    statusFluxo : StatusFluxoRisco
  }
  class ControleExistente {
    descricaoControle
    possuiEvidenciaComprovada
  }
  class RespostaTratamento5W2H {
    estrategia
    acaoOQue
    statusExecucao
  }
  class IndicadorKri {
    nomeIndicador
    periodicidade
    limiteAlerta
  }
  class MedicaoKri {
    dataMedicao
    valorApurado
    emAlerta
  }
  class HistoricoFluxoItem {
    etapa
    acao
    usuarioPapel
    criadoEm
  }
  class AcoesFluxo {
    podeEnviar / podeAssumir
    podeValidar / podeHomologar
    podeDevolver / devolucaoCgov
    podeEditar / podeExcluir
    motivo
  }
  UnidadeOrganizacional "1" o-- "*" UnidadeOrganizacional : unidadePai
  UnidadeOrganizacional "1" --> "*" ObjetoContexto : dona
  ProcessoCadeiaValor "0..1" --> "*" ObjetoContexto : vincula
  ObjetoContexto "1" --> "*" FichaRisco : tem
  CategoriaRisco "1" --> "*" FichaRisco : classifica
  FichaRisco "1" *-- "*" ControleExistente
  FichaRisco "1" *-- "*" RespostaTratamento5W2H
  FichaRisco "1" *-- "*" IndicadorKri
  IndicadorKri "1" *-- "*" MedicaoKri
  FichaRisco "1" *-- "*" HistoricoFluxoItem
  FichaRisco ..> AcoesFluxo : acoesNoFluxo
```

## 2. Stores, camada de dados e cálculo

```mermaid
classDiagram
  direction TB
  class FonteDados {
    <<interface>>
    carregarCarteira()
    relerRisco(id)
    acoesNoFluxo(ids)
    objetosOndeGravo()
    salvarFicha(f)
    excluirRisco(id)
    enviar(id)
    assumir(id)
    validar(id, parecer)
    homologar(id, parecer)
    devolver(id, motivo)
    registrarMedicao(kriId, m)
    atualizarStatusTratamento(respostaId, status)
    salvarObjeto(o)
    reatribuirObjeto(objetoId, novaUnidadeId)
    alterarApetite(categoriaId, apetite)
    alterarJustificativa(categoriaId, texto)
    lerAuditoria(f, limite)
    lerAtividadeRecente(n)
  }
  class fonteDemonstracao {
    <<módulo>>
    criarFonteDemonstracao()
  }
  class fonteSupabase {
    <<módulo>>
    criarFonteSupabase(cliente)
  }
  class index {
    <<módulo>>
    criarFonteDados(modo)
  }
  class conversores {
    <<módulo>>
    riscoDoBanco()
    acoesDoBanco()
    fichaParaJson()
    fichaDaSkillParaSalvar()
  }
  class errosBanco {
    <<módulo>>
    traduzirErroBanco()
    ErroRadar
  }
  class riscosStore {
    <<store>>
    riscos
    categorias
    acoes
    estado
    carregar()
    salvarOuAtualizarRisco()
    submeterParaValidacaoCg()
    assumirRisco()
    aprovarEmUmCliqueCg()
    homologarEmUmCliqueDiretoria()
    devolverRisco()
    importarMarkdownDaSkill()
    alterarApetiteCategoriaDAR()
  }
  class authStore {
    <<store>>
    modo
    perfil
    enviarLink()
    concluirRetorno()
    sair()
    alternarPerfilDemo()
  }
  class calculadoraRiscoRadar {
    <<módulo>>
    obterNivelInerente()
    classificarNivelRisco()
    validarFatorControle()
    avaliarCriticidadeDAR()
    calcularRiscoCompletoRadar()
    validarRegraIntegridade()
  }
  class formularioRisco {
    <<módulo>>
    prévia do cálculo na ficha
  }
  class importadorSkillMarkdown {
    <<módulo>>
    importarTabelaMarkdownSkill()
  }
  FonteDados <|.. fonteDemonstracao
  FonteDados <|.. fonteSupabase
  index ..> FonteDados : escolhe pelo modo
  fonteSupabase ..> conversores
  fonteSupabase ..> errosBanco
  riscosStore --> FonteDados : fonte()
  riscosStore ..> authStore : modo
  riscosStore ..> importadorSkillMarkdown
  fonteDemonstracao ..> calculadoraRiscoRadar : espelho do banco
  formularioRisco ..> calculadoraRiscoRadar : prévia na tela
  riscosStore ..> conversores : fichaDaSkillParaSalvar
  riscosStore ..> errosBanco
```

> **Regra de ouro:** o valor gravado vem do gatilho do banco; `calculadoraRiscoRadar` é só o **espelho** para
> a prévia e para o modo demonstração ([[0006-ler-inerente-do-quadro-7-no-banco-com-espelho-em-typescript]],
> [[0009-dois-modos-demonstracao-e-real]]).
