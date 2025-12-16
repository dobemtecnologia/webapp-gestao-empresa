## Arquitetura de Planos, Wizard e Assinaturas

Este documento descreve a modelagem de domínio e o fluxo de ponta a ponta para **gestão de planos empresariais**, com base nos arquivos `diagrama.jdl` e `dobem-arquitetura-v2.jdl`.

O foco é explicar:

- **Catálogo (Template)**: como os planos são definidos pela Dobem.
- **Wizard / Simulação (Orçamento)**: como o plano é montado de forma interativa.
- **Assinatura (Instância)**: como o plano se torna uma assinatura viva por empresa.
- **Contrato**: como o fechamento é congelado para fins legais/financeiros.
- **Implicações para frontend e backend**.

---

## Conceitos de Domínio

### Catálogo (Template)

O catálogo representa o **"cardápio" de ofertas da Dobem**. Ele é gerido internamente (admin) e não é alterado diretamente pelo cliente.

#### Entidade `Plano` (Template de Plano)

- **Descrição**: define o plano como produto de catálogo, por exemplo:
  - "Plano Start", "Plano Scale", "Plano Personalizado Base".
- **Campos relevantes**:
  - `nome`: nome comercial do plano.
  - `visivelSite`: se o plano aparece na vitrine pública.
  - `ordemExibicao`: ordenação na tela.
  - `valorMensalSugerido`, `valorSetupSugerido`: preços de referência (marketing), não necessariamente o que o cliente irá pagar.
  - `ehPlanoBasePersonalizado`: marca qual plano serve de **base para o Wizard "Monte seu Plano"**.
  - `ativo`: se o plano está disponível no catálogo.
- **Papel**:
  - Funciona como o **template/base** sobre o qual planos de clientes serão derivados.
  - É imutável do ponto de vista do cliente.

#### Entidade `PlanoItem` (Itens Padrão do Template)

- **Descrição**: representa os **blocos de composição** de um `Plano`.
- **Campos relevantes**:
  - `tipoItem: TipoPlanoItem`: INFRAESTRUTURA, ASSISTENTE, CANAL, PACOTE_CREDITOS.
  - `referenciaId: Long`: ID do componente concreto (ex.: `Infraestrutura.id`, `Assistente.id`, `Canal.id`, etc.).
  - `quantidade: Integer`: quantidade padrão desse item no plano (ex.: 2 assistentes, 1 canal WhatsApp).
  - `valorUnitarioBase: BigDecimal`: preço de tabela base usado para composição.
  - `ativo: Boolean`: se o item faz parte do template atual.
- **Relacionamentos**:
  - `Plano` **1 → N** `PlanoItem`: um plano de catálogo possui vários itens padrão.

**Resumo**: `Plano` e `PlanoItem` formam o **catálogo de templates**. Eles definem o que é oferecido, mas não representam diretamente a assinatura de um cliente específico.

---

## Wizard / Simulação (Orçamento)

O wizard de venda/simulação permite que um usuário (vendedor ou cliente) **monte um plano customizado** a partir do catálogo.

Essa fase é representada por `Orcamento` e `ItemOrcamento`.

### Entidade `Orcamento`

- **Descrição**: funciona como o **carrinho de compras / proposta em construção**.
- **Campos relevantes**:
  - `nomeCliente`: identificação textual do cliente no orçamento.
  - `dataValidade`: até quando a proposta é válida.
  - `status: StatusOrcamento`: RASCUNHO, ENVIADO, APROVADO, REJEITADO.
  - Totais calculados:
    - `totalMensal`: soma dos valores mensais simulados.
    - `totalSetup`: soma dos valores de setup simulados.
    - `margemLucroEstimada`: estimativa de margem.
  - Metadados:
    - `observacoes`, `criadoEm`, `atualizadoEm`.
- **Relacionamentos**:
  - `Empresa` **1 → N** `Orcamento`: uma empresa pode ter vários orçamentos.

### Entidade `ItemOrcamento`

- **Descrição**: representa cada **linha dentro do carrinho de simulação**.
- **Campos relevantes**:
  - `tipoItem: TipoPlanoItem`: o mesmo enum usado em `PlanoItem` e em `PlanoEmpresaItem` (INFRAESTRUTURA, ASSISTENTE, CANAL, PACOTE_CREDITOS).
  - `referenciaId: Long`: ID do componente selecionado na simulação.
  - `descricao: String`: texto amigável para exibição.
  - `quantidade: Integer`: quantidade simulada (min. 1).
  - `precoUnitarioMensal`, `precoUnitarioSetup`: preços negociados neste orçamento.
  - `totalMensal`, `totalSetup`: totais calculados (quantidade \* preço unitário).
- **Relacionamentos**:
  - `Orcamento` **1 → N** `ItemOrcamento`.

### Papel do Wizard

- O wizard usa `Orcamento` + `ItemOrcamento` para representar o estado da simulação.
- A combinação de `tipoItem` + `referenciaId` nos `ItemOrcamento` já é pensada para **permitir conversão direta** desses itens em `PlanoEmpresaItem` quando o orçamento for aprovado.

---

## Assinatura (Instância Viva)

Depois que o cliente (ou vendedor) **aprova a simulação**, o sistema precisa criar uma **assinatura viva**, separada do catálogo.

Essa assinatura é representada por `PlanoEmpresa` e `PlanoEmpresaItem`.

### Entidade `PlanoEmpresa` (Assinatura)

- **Descrição**: é a **assinatura ativa da empresa**, ou seja, o plano em produção.
- **Campos relevantes**:
  - `apelido`: nome amigável da assinatura (ex.: "Assinatura Principal 2025").
  - `dataInicio`, `dataFim`: vigência da assinatura.
  - `valorMensalFinal`: valor mensal fechado em contrato.
  - `valorSetupFinal`: valor de setup fechado em contrato.
  - `ativo`: se a assinatura está ativa.
- **Relacionamentos**:
  - `Empresa` **1 → N** `PlanoEmpresa`: uma empresa pode ter várias assinaturas (histórico, múltiplas unidades, etc.).
  - `PlanoEmpresa` **1 → N** `PlanoEmpresaItem`: cada assinatura possui seus itens contratados.
  - `PlanoEmpresa` **N → 1** `Plano{planoBase}`: a assinatura sabe de qual template de `Plano` se originou.

### Entidade `PlanoEmpresaItem` (Itens Reais da Assinatura)

- **Descrição**: é o **espelho instanciado** de um item de plano, representando exatamente o que o cliente contratou.
- **Campos relevantes**:
  - `tipoItem: TipoPlanoItem`: INFRAESTRUTURA, ASSISTENTE, CANAL, PACOTE_CREDITOS.
  - `referenciaId: Long`: ID do componente realmente contratado.
  - `quantidade: Integer`: quantidade efetiva (pode ser diferente da quantidade padrão do catálogo).
  - `valorUnitarioFinal: BigDecimal`: preço unitário final (negociado) para aquele cliente.
  - `valorTotalMensal: BigDecimal`: total mensal congelado (quantidade \* valor unitário final).
  - `ativo: Boolean`: controle fino de ativação/desativação do item na assinatura.
- **Relacionamentos**:
  - `PlanoEmpresa` **1 → N** `PlanoEmpresaItem`.

### Benefícios desta separação

- **Catálogo (`Plano`/`PlanoItem`) é imutável** do ponto de vista do cliente.
- **Assinatura (`PlanoEmpresa`/`PlanoEmpresaItem`) é a instância viva**:
  - Guarda preços e quantidades congelados para aquele cliente.
  - Permite mudanças futuras no catálogo sem quebrar o histórico de contratos.
- Facilita **upgrade/downgrade**:
  - Podem ser criadas novas instâncias de `PlanoEmpresa`/`PlanoEmpresaItem`, mantendo histórico das anteriores.

---

## Contrato (Congelamento Legal/Financeiro)

A camada de contratos registra formalmente as condições da venda.

### Entidade `ContratoAssinatura`

- **Descrição**: representa o **fechamento formal** da venda de uma assinatura.
- **Campos relevantes**:
  - `codigoContrato`: identificador único do contrato.
  - `valorMensalFinal`, `valorSetupFinal`: valores finais acordados.
  - `snapshotPrecos: TextBlob`: JSON com cópia das informações de preços/itens no momento da assinatura.
  - `dataAssinatura`, `dataInicioVigencia`, `dataFimVigencia`.
  - `status: StatusContrato`: ATIVO, SUSPENSO, CANCELADO, FINALIZADO.
- **Relacionamentos**:
  - `Empresa` **1 → N** `ContratoAssinatura`.
  - No modelo mais recente, um `ContratoAssinatura` pode referenciar opcionalmente um `PlanoEmpresa` (a assinatura que originou o contrato).

### Papel do snapshot

- O `snapshotPrecos` garante que mesmo se o catálogo mudar depois, o sistema sabe **exatamente quais eram as condições** do contrato no momento da assinatura.

---

## Fluxo Funcional Completo (Backend + Frontend)

A seguir, um fluxo típico de ponta a ponta.

### 1. Gestão de Catálogo (Admin)

**Backend**

- CRUD de:
  - `Infraestrutura`, `Assistente`, `Agente`, `Canal`, `CreditoApi` etc.
  - `Plano` e `PlanoItem` (definição dos planos de catálogo).
  - `RegraPrecificacao` (governa preços dinâmicos por provedor, unidade, escala).

**Frontend (Admin)**

- Telas do tipo:
  - **"Planos de Catálogo"**:
    - Criar/editar `Plano`.
    - Inserir/remover `PlanoItem` (componentes e quantidades padrão).
  - **"Componentes"**:
    - Cadastros de `Infraestrutura`, `Assistente`, `Canal`, `Agente` etc.

### 2. Escolha do Ponto de Partida (Vitrine → Wizard)

**Backend**

- Endpoints para listar:
  - Planos visíveis (`Plano` com `visivelSite = true`).
  - Itens padrão (`PlanoItem`) de um plano específico.
- Uso do campo `ehPlanoBasePersonalizado` para identificar o **plano base do Wizard**.

**Frontend**

- Tela de **Vitrine de Planos**:
  - Lista os `Plano` do catálogo.
  - Mostra preço sugerido, itens principais (via `PlanoItem`).
  - Botões:
    - "Ver detalhes".
    - "Começar no Wizard com este plano".
- Ao iniciar o wizard, o frontend pode:
  - Criar um `Orcamento` novo (RASCUNHO).
  - Carregar itens iniciais (`ItemOrcamento`) a partir de um plano base (template).

### 3. Wizard de Customização (Orçamento/ItemOrcamento)

**Backend**

- Serviços customizados (ex.: `PlanoFactoryService`, serviços de simulação de custos):
  - Recebem uma entrada (DTO) com:
    - Empresa (opcionalmente, para vincular o orçamento).
    - Plano base escolhido (se aplicável).
    - Infraestrutura, assistentes, canais e demais parâmetros desejados.
  - Montam/atualizam um `Orcamento` + lista de `ItemOrcamento`.
  - Calculam:
    - `totalMensal`, `totalSetup`, `margemLucroEstimada`.
- Persistem o `Orcamento` e seus `ItemOrcamento` com status `RASCUNHO`.

**Frontend**

- Wizard multi-step, por exemplo:
  1. Selecionar **Infraestrutura** (nível, capacidade etc.).
  2. Escolher **Assistentes** e quantidades.
  3. Selecionar **Canais** e integrações.
  4. Ajustar **créditos de API**, período de contratação, descontos.
- A cada alteração relevante:
  - O frontend envia o estado atual (ou o delta) para o backend.
  - O backend recalcula preços e retorna o `Orcamento` atualizado.
- O frontend mantém o **ID do `Orcamento` em andamento** para permitir retomada.

### 4. Aprovação da Simulação → Criação da Assinatura

Quando o orçamento é aprovado pelo cliente/vendedor:

**Backend**

1. **Validação** do `Orcamento`:
   - Status compatível (ex.: RASCUNHO ou ENVIADO).
   - Não expirado (`dataValidade`).
2. **Criação de `PlanoEmpresa`**:
   - `apelido`: ex.: "Plano Gold - Loja X 2025".
   - `dataInicio` / `dataFim`: conforme período escolhido.
   - `valorMensalFinal` / `valorSetupFinal`: derivados dos totais do `Orcamento` (com possíveis ajustes).
   - `ativo = true`.
   - `planoBase`: vínculo ao `Plano` de catálogo, se a oferta foi baseada em um template.
3. **Conversão dos `ItemOrcamento` em `PlanoEmpresaItem`**:
   - Para cada `ItemOrcamento`:
     - Cria um `PlanoEmpresaItem` com:
       - `tipoItem` = `ItemOrcamento.tipoItem`.
       - `referenciaId` = `ItemOrcamento.referenciaId`.
       - `quantidade` = `ItemOrcamento.quantidade`.
       - `valorUnitarioFinal` e `valorTotalMensal` derivados dos preços do orçamento.
       - `ativo = true`.
4. Atualiza `Orcamento.status` para `APROVADO`.
5. (Opcional, mas recomendado) Cria um `ContratoAssinatura`:
   - Preenche `snapshotPrecos` com JSON contendo:
     - Dados do `PlanoEmpresa`.
     - Lista de `PlanoEmpresaItem`.
     - Resumo do `Orcamento` original.

**Frontend**

- Botão "Aprovar Proposta" no wizard:
  - Chama um endpoint do backend que executa os passos acima.
- Após sucesso:
  - Exibe confirmação da criação da assinatura.
  - Oferece link para:
    - Tela de detalhes da assinatura (`PlanoEmpresa`).
    - Visualizar/assinar contrato (`ContratoAssinatura`).

### 5. Gestão da Assinatura (Pós-Venda)

**Backend**

- Endpoints para:
  - Listar `PlanoEmpresa` por empresa (minhas assinaturas).
  - Detalhar uma assinatura com seus `PlanoEmpresaItem`.
  - Alterar status (pausar/cancelar).
  - Suportar upgrade/downgrade:
    - Por exemplo, via novo `Orcamento` que gera uma nova `PlanoEmpresa`.

**Frontend**

- Telas de **"Minhas Assinaturas"**:
  - Lista de `PlanoEmpresa` com status, vigência e valores.
- Tela de **detalhes da assinatura**:
  - Tabela de `PlanoEmpresaItem` com:
    - Tipo (Infra, Assistente, Canal, Créditos).
    - Nome amigável (resgatado via `referenciaId` do catálogo).
    - Quantidade, preço unitário, total mensal.
- Ações possíveis:
  - Solicitar upgrade/downgrade (gerando novo `Orcamento`).
  - Ver contratos relacionados (`ContratoAssinatura`).

---

## Implicações Arquiteturais

- A separação entre:

  - **Template** (`Plano`/`PlanoItem`),
  - **Simulação** (`Orcamento`/`ItemOrcamento`),
  - **Assinatura** (`PlanoEmpresa`/`PlanoEmpresaItem`),
  - **Contrato** (`ContratoAssinatura`),
    segue o padrão **Type Object Pattern** e boas práticas de DDD.

- Principais benefícios:
  - **Catálogo imutável** do ponto de vista do cliente, permitindo evolução segura no tempo.
  - **Assinatura com estado próprio**, incluindo preços e quantidades congelados.
  - **Fluxo de Wizard limpo**, com conversão natural de `ItemOrcamento` em `PlanoEmpresaItem`.
  - **Histórico consistente** de contratos e assinaturas, com snapshots que sobrevivem a mudanças futuras no catálogo.

Este documento deve servir como referência tanto para o **time de backend** quanto para o **time de frontend**, alinhando a visão de domínio com a implementação gerada a partir dos arquivos `.jdl`.
