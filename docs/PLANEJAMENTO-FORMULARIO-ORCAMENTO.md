# Planejamento: Formulário Consolidado de Orçamento

## 📋 Visão Geral

Este documento descreve o planejamento completo para criar um formulário consolidado que contenha todos os requisitos e funcionalidades da página Wizard, mas em formato de formulário tradicional ao invés da interface de chat conversacional.

---

## 1. Estrutura Geral do Formulário

### 1.1. Organização em Seções

O formulário será dividido em **3 seções principais**:

1. **Seção 1: Dados do Cliente**
   - Informações pessoais e de contato
   - Dados da empresa (opcional)

2. **Seção 2: Configuração do Plano**
   - Setores
   - Assistentes
   - Canais
   - Infraestrutura
   - Volume (oculto, valores padrão)
   - Período de contratação

3. **Seção 3: Revisão e Finalização**
   - Resumo do plano
   - Resumo financeiro
   - Botão de finalização

---

## 2. Seção 1: Dados do Cliente

### 2.1. Campos Obrigatórios

#### Nome Completo
- **Tipo**: Campo de texto
- **Validação**: Obrigatório, mínimo 2 caracteres
- **Comportamento**: Campo livre para entrada do nome

#### Email
- **Tipo**: Campo de email
- **Validação**: 
  - Obrigatório
  - Formato de email válido (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Comportamento**: Validação em tempo real

#### Telefone/WhatsApp
- **Tipo**: Campo de texto com máscara
- **Validação**: Opcional
- **Máscara**: `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX`
- **Comportamento**: Formatação automática durante digitação

### 2.2. Dados da Empresa (Opcional, mas Recomendado)

#### CNPJ
- **Tipo**: Campo de texto com máscara
- **Máscara**: `XX.XXX.XXX/XXXX-XX`
- **Validação**: 
  - Se preenchido, deve ter 14 dígitos válidos
  - Validação de dígitos verificadores (opcional, mas recomendado)
- **Comportamento**: 
  - Formatação automática durante digitação
  - Ao completar 14 dígitos, dispara consulta automática à API

#### Consulta Automática de CNPJ
Quando o CNPJ é preenchido e validado, o sistema deve:

1. **Buscar dados na API** (`CnpjService.consultarCNPJ`)
2. **Preencher automaticamente**:
   - Razão Social (readonly)
   - Nome Fantasia (readonly)
   - Situação Cadastral (readonly)
   - Setor Sugerido (pré-selecionar na seção de Setores)

3. **Exibir feedback visual**:
   - Loading durante consulta
   - Mensagem de sucesso/erro
   - Dados da empresa exibidos em cards informativos

---

## 3. Seção 2: Configuração do Plano

### 3.1. Subseção: Setores

#### Características
- **Tipo**: Seleção múltipla (checkboxes)
- **Fonte de Dados**: API `SetorService.getAllSetors()`
- **Validação**: Pelo menos 1 setor deve ser selecionado
- **Exibição**: 
  - Lista de setores com ícones
  - Checkbox para cada setor
  - Nome do setor visível

#### Comportamento
- Se CNPJ foi preenchido e retornou setor sugerido, **pré-selecionar** automaticamente
- Permitir adicionar/remover setores manualmente
- Ao remover um setor, verificar se há assistentes dependentes e avisar o usuário
- Exibir ícones dos setores (se disponível na API)

#### Validação
- **Erro**: "Selecione pelo menos um setor"
- **Sucesso**: Habilitar próxima subseção (Assistentes)

---

### 3.2. Subseção: Assistentes

#### Características
- **Tipo**: Controles de quantidade (botões +/- ou input numérico)
- **Fonte de Dados**: Assistentes vinculados aos setores selecionados
- **Agrupamento**: Por setor
- **Validação**: Pelo menos 1 assistente com quantidade > 0

#### Estrutura de Exibição
Para cada setor selecionado:
- **Título do Setor**
- Lista de assistentes do setor:
  - Nome do assistente
  - Descrição (se disponível)
  - Controles de quantidade:
    - Botão "-" (desabilitado se quantidade = 0)
    - Campo/display de quantidade
    - Botão "+"
  - Indicador visual de quantidade selecionada

#### Comportamento
- Exibir **apenas assistentes** dos setores selecionados
- Atualizar dinamicamente quando setores são alterados
- Se um setor for removido:
  - Remover assistentes desse setor do estado
  - Avisar usuário sobre perda de configuração
- Preservar quantidades ao adicionar novos setores (se assistente já existir)

#### Validação
- **Erro**: "Selecione pelo menos um assistente"
- **Sucesso**: Habilitar próxima subseção (Canais)

---

### 3.3. Subseção: Canais de Comunicação

#### Características
- **Tipo**: Associação Assistente ↔ Canal (toggles)
- **Fonte de Dados**: API `PlanoService.getCanals()`
- **Validação**: Cada assistente ativo deve ter pelo menos 1 canal habilitado

#### Estrutura de Exibição
Para cada assistente com quantidade > 0:
- **Nome do Assistente** (e setor)
- Lista de canais disponíveis:
  - Ícone do canal (WhatsApp, Instagram, Web, API, etc.)
  - Nome do canal
  - Toggle switch para habilitar/desabilitar

#### Canais Comuns
- WhatsApp
- Instagram
- Web/Chat
- API

#### Comportamento
- Exibir apenas assistentes que têm quantidade > 0
- Permitir habilitar/desabilitar canais individualmente por assistente
- Atualizar automaticamente quando assistentes são alterados
- Exibir ícones apropriados para cada tipo de canal

#### Validação
- **Erro**: "Cada assistente deve ter pelo menos um canal habilitado"
- **Sucesso**: Habilitar próxima subseção (Infraestrutura)

---

### 3.4. Subseção: Infraestrutura

#### Características
- **Tipo**: Seleção única (radio buttons ou cards clicáveis)
- **Fonte de Dados**: API `PlanoService.getInfraestruturas()`
- **Validação**: Obrigatório selecionar uma opção

#### Tipos de Infraestrutura
- **Compartilhado Lite** (ID: 1001)
- **Dedicado Padrão**
- **Dedicado Performance**

#### Estrutura de Exibição
Para cada infraestrutura:
- Card clicável ou radio button
- Nome da infraestrutura
- Tipo (Compartilhado/Dedicado)
- Preço (se disponível na API)
- Descrição (se disponível)

#### Comportamento
- Seleção única (ao selecionar uma, desmarca a anterior)
- Feedback visual da seleção (destaque, borda, etc.)
- Ao selecionar, disparar simulação automática (se outros campos estiverem prontos)

#### Validação
- **Erro**: "Selecione uma infraestrutura"
- **Sucesso**: Habilitar cálculo de simulação

---

### 3.5. Subseção: Volume de Consumo

#### Características
- **Tipo**: Campos ocultos com valores padrão (ou sliders opcionais)
- **Valores Padrão**:
  - Mensagens WhatsApp/mês: `1000`
  - Tokens OpenAI/mês: `1.000.000`

#### Comportamento
- **Opção 1**: Manter oculto e usar apenas valores padrão
- **Opção 2**: Exibir sliders para ajuste manual (avançado)
- Se exibido, usar sliders com pontos de parada (snaps):
  - Mensagens: [1000, 5000, 10000, 50000, 100000]
  - Tokens: [1M, 5M, 10M, 50M, 100M]

#### Validação
- Valores mínimos e máximos (se editável)
- Valores devem ser números inteiros positivos

---

### 3.6. Subseção: Período de Contratação

#### Características
- **Tipo**: Seleção única (cards)
- **Fonte de Dados**: API `PlanoService.getPeriodosContratacao()`
- **Validação**: Obrigatório selecionar um período

#### Opções Disponíveis
- **Mensal** (1 mês)
- **Trimestral** (3 meses)
- **Semestral** (6 meses)
- **Anual** (12 meses)

#### Estrutura de Exibição
Para cada período:
- Card clicável
- Nome do período
- Número de meses
- **Preço Bruto Total**: `valorMensalBase × meses`
- **Desconto Aplicado**: 
  - Se tipo = PERCENTUAL: `precoBruto × (valorDesconto / 100)`
  - Se tipo = VALOR_FIXO: `valorDesconto`
- **Preço com Desconto**: `precoBruto - desconto`
- **Preço Mensal Equivalente**: `precoComDesconto / meses`
- **Economia**: Destaque visual se houver desconto
- **Badge "Recomendado"**: Para período ANUAL (ou outro critério)

#### Comportamento
- Calcular valores dinamicamente baseado no `valorMensalBase` da simulação
- Atualizar automaticamente quando simulação é recalculada
- Destaque visual do período selecionado
- Exibir economia de forma destacada

#### Validação
- **Erro**: "Selecione um período de contratação"
- **Sucesso**: Habilitar seção de revisão

---

## 4. Seção 3: Revisão e Finalização

### 4.1. Resumo do Plano

#### Informações Exibidas
- **Setores Selecionados**: Lista de nomes dos setores
- **Assistentes**: 
  - Nome do assistente
  - Quantidade
  - Setor ao qual pertence
- **Canais Configurados**: Lista de canais habilitados (agrupados ou por assistente)
- **Infraestrutura**: Nome da infraestrutura selecionada
- **Período**: Nome do período selecionado (ex: "Anual - 12 meses")
- **Consumo Estimado**:
  - Mensagens WhatsApp/mês: `X.XXX`
  - Tokens OpenAI/mês: `X.XXX.XXX`

### 4.2. Resumo Financeiro

#### Valores Exibidos
- **Valor Mensal Base**: Valor calculado pela simulação (sem desconto)
- **Valor Setup (Inicial)**: Valor único pago no início (se houver)
- **Desconto do Período**: 
  - Percentual ou valor fixo
  - Exibido em destaque se > 0
- **Valor Total do Período**: 
  - Com desconto aplicado
  - Exibido de forma destacada
- **Valor Mensal Equivalente**: 
  - `valorTotalPeriodo / meses`
  - Útil para comparação

#### Formatação
- Todos os valores em **Real (BRL)**: `R$ X.XXX,XX`
- Destaque visual para valores principais
- Cores diferentes para:
  - Valor mensal (azul)
  - Setup (amarelo/laranja)
  - Desconto (verde)

### 4.3. Simulação Automática

#### Quando Disparar
A simulação deve ser executada automaticamente quando:

1. **Infraestrutura é selecionada** (primeira vez que todos os campos obrigatórios estão preenchidos)
2. **Assistentes são alterados** (quantidade mudou)
3. **Canais são alterados** (configuração mudou)
4. **Infraestrutura é alterada**

#### Endpoint
- **Método**: `PlanoService.simularGeracao(planoBlueprint: PlanoBlueprint)`
- **Retorno**: `PlanoSimulacaoResponse`

#### Estrutura do PlanoBlueprint
```typescript
{
  nomePlano: string;
  itens: Array<{
    tipoItem: 'INFRAESTRUTURA' | 'ASSISTENTE' | 'CANAL';
    referenciaId: number;
    quantidade: number;
  }>;
  consumoEstimado: {
    tokensOpenAi: number;
    mensagensWhatsapp: number;
  };
}
```

#### Comportamento
- Exibir **loading** durante cálculo
- Atualizar valores financeiros automaticamente
- Se erro, exibir mensagem e permitir retry
- Desabilitar botão de finalização até simulação concluir

---

## 5. Validações e Regras de Negócio

### 5.1. Validações por Seção

#### Seção 1: Dados do Cliente
- ✅ **Nome**: Obrigatório, mínimo 2 caracteres
- ✅ **Email**: Obrigatório, formato válido
- ✅ **Telefone**: Opcional, mas se preenchido deve ter formato válido
- ✅ **CNPJ**: Se preenchido, deve ter 14 dígitos válidos

#### Seção 2: Configuração
- ✅ **Setores**: Pelo menos 1 setor selecionado
- ✅ **Assistentes**: Pelo menos 1 assistente com quantidade > 0
- ✅ **Canais**: Cada assistente ativo deve ter pelo menos 1 canal habilitado
- ✅ **Infraestrutura**: Obrigatório selecionar
- ✅ **Período**: Obrigatório selecionar

#### Seção 3: Finalização
- ✅ **Simulação**: Deve estar concluída e válida
- ✅ **Email**: Deve estar válido (revalidação final)

### 5.2. Dependências entre Campos

#### Hierarquia de Dependências
```
Setores
  └─> Assistentes (dependem dos setores selecionados)
      └─> Canais (dependem dos assistentes ativos)
          └─> Infraestrutura
              └─> Simulação (depende de: assistentes + canais + infraestrutura)
                  └─> Período (depende da simulação para calcular descontos)
```

#### Regras Específicas
1. **Assistentes** só aparecem se seus setores estiverem selecionados
2. **Canais** só podem ser configurados para assistentes com quantidade > 0
3. **Simulação** só pode ser executada quando:
   - Pelo menos 1 assistente com quantidade > 0
   - Pelo menos 1 canal habilitado para cada assistente ativo
   - Infraestrutura selecionada
4. **Período** só pode ser selecionado após simulação concluir
5. **Finalização** só pode ocorrer quando:
   - Todos os campos obrigatórios preenchidos
   - Simulação concluída
   - Email válido

---

## 6. Estrutura Técnica Sugerida

### 6.1. Componente Principal

#### `FormularioOrcamentoComponent`
- **Localização**: `src/app/formulario-orcamento/`
- **Tecnologia**: Angular Reactive Forms (FormBuilder)
- **Responsabilidades**:
  - Gerenciar estado do formulário
  - Coordenar subcomponentes
  - Validações de alto nível
  - Submissão final

### 6.2. Subcomponentes

#### `DadosClienteComponent`
- **Responsabilidade**: Seção 1 - Dados do cliente
- **Campos**: Nome, Email, Telefone, CNPJ
- **Validações**: Locais e assíncronas (CNPJ)

#### `ConfiguracaoPlanoComponent`
- **Responsabilidade**: Seção 2 - Configuração do plano
- **Subcomponentes**:
  - `SetoresSelectorComponent`
  - `AssistentesSelectorComponent`
  - `CanaisConfigComponent`
  - `InfraestruturaSelectorComponent`
  - `PeriodoSelectorComponent`

#### `ResumoOrcamentoComponent`
- **Responsabilidade**: Seção 3 - Revisão e finalização
- **Exibe**: Resumo do plano e valores financeiros

### 6.3. Serviços e Endpoints

#### Serviços Existentes (Reutilizar)

Todos os serviços abaixo são os mesmos utilizados pelo Wizard, garantindo consistência e reutilização de código:

##### `PlanoService`
**Localização**: `src/app/services/plano.service.ts`

**Endpoints utilizados**:

1. **Simular Geração de Plano**
   - **Método**: `simularGeracao(planoBlueprint: PlanoBlueprint)`
   - **Endpoint**: `POST /api/custom/planos/simular-geracao`
   - **Uso**: Calcular valores do plano baseado na configuração
   - **Retorno**: `PlanoSimulacaoResponse`

2. **Listar Infraestruturas**
   - **Método**: `getInfraestruturas(sort: string = 'id,asc')`
   - **Endpoint**: `GET /api/infraestruturas?sort={sort}`
   - **Uso**: Buscar todas as infraestruturas disponíveis
   - **Retorno**: `Infraestrutura[]`

3. **Listar Assistentes**
   - **Método**: `getAssistentes(sort: string = 'id,asc', eagerload: boolean = true)`
   - **Endpoint**: `GET /api/assistentes?sort={sort}&eagerload={eagerload}`
   - **Uso**: Buscar todos os assistentes (com relacionamentos se eagerload=true)
   - **Retorno**: `Assistente[]`

4. **Listar Assistentes por Setores**
   - **Método**: `getAssistentesPorSetores(setorIds: number[])`
   - **Endpoint**: `GET /api/custom/assistentes?setorIds={id1}&setorIds={id2}&eagerload=true`
   - **Uso**: Buscar assistentes vinculados a setores específicos
   - **Retorno**: `Assistente[]`

5. **Listar Canais**
   - **Método**: `getCanals(sort: string = 'id,asc')`
   - **Endpoint**: `GET /api/canals?sort={sort}`
   - **Uso**: Buscar todos os canais disponíveis
   - **Retorno**: `Canal[]`

6. **Listar Períodos de Contratação**
   - **Método**: `getPeriodosContratacao(sort: string = 'id,asc')`
   - **Endpoint**: `GET /api/periodo-contratacaos?sort={sort}`
   - **Uso**: Buscar todos os períodos disponíveis (Mensal, Trimestral, Semestral, Anual)
   - **Retorno**: `PeriodoContratacao[]`

7. **Listar Vendedores**
   - **Método**: `getVendedors(sort: string = 'id,asc', page: number = 0, size: number = 20)`
   - **Endpoint**: `GET /api/vendedors?sort={sort}&page={page}&size={size}`
   - **Uso**: Buscar vendedores (especialmente para encontrar vendedor tipo 'SISTEMA_IA')
   - **Retorno**: `VendedorDTO[]`

##### `OrcamentoService`
**Localização**: `src/app/services/orcamento.service.ts`

**Endpoints utilizados**:

1. **Criar Orçamento**
   - **Método**: `create(orcamento: OrcamentoDTO)`
   - **Endpoint**: `POST /api/custom/orcamentos/com-itens`
   - **Uso**: Criar novo orçamento com todos os itens
   - **Retorno**: `OrcamentoDTO` (com `codigoHash` gerado)

2. **Atualizar Orçamento**
   - **Método**: `update(id: number, orcamento: OrcamentoDTO)`
   - **Endpoint**: `PUT /api/custom/orcamentos/com-itens/{id}`
   - **Uso**: Atualizar orçamento existente (modo edição)
   - **Retorno**: `OrcamentoDTO`

3. **Buscar Orçamento por Hash**
   - **Método**: `getByHash(codigoHash: string)`
   - **Endpoint**: `GET /api/orcamentos/hash/{codigoHash}`
   - **Uso**: Buscar orçamento básico pelo hash
   - **Retorno**: `OrcamentoDTO`

4. **Buscar Orçamento com Itens por Hash**
   - **Método**: `getByHashComItens(codigoHash: string)`
   - **Endpoint**: `GET /api/custom/orcamentos/hash/{codigoHash}/com-itens`
   - **Uso**: Buscar orçamento completo com todos os itens (para modo edição)
   - **Retorno**: `{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }`

5. **Buscar Orçamento com Itens por ID**
   - **Método**: `getByIdComItens(id: number)`
   - **Endpoint**: `GET /api/custom/orcamentos/{id}/com-itens`
   - **Uso**: Buscar orçamento completo pelo ID (fallback)
   - **Retorno**: `{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }`

6. **Buscar Orçamento por ID**
   - **Método**: `getById(id: number)`
   - **Endpoint**: `GET /api/orcamentos/{id}`
   - **Uso**: Buscar orçamento básico pelo ID
   - **Retorno**: `OrcamentoDTO`

##### `CnpjService`
**Localização**: `src/app/services/cnpj.service.ts`

**Endpoints utilizados**:

1. **Consultar CNPJ**
   - **Método**: `consultarCNPJ(cnpj: string)`
   - **Endpoint**: `GET /api/custom/cnpj/{cnpj}`
   - **Uso**: Buscar dados da empresa pelo CNPJ (inclui setor sugerido)
   - **Parâmetros**: CNPJ sem formatação (apenas números)
   - **Retorno**: `CNPJResponse` (contém: cnpj, razaoSocial, nomeFantasia, situacaoCadastral, setorSugerido)

##### `SetorService`
**Localização**: `src/app/services/setor.service.ts`

**Endpoints utilizados**:

1. **Listar Todos os Setores**
   - **Método**: `getAllSetors(sort: string = 'id,asc', page: number = 0, size: number = 100, eagerload: boolean = true)`
   - **Endpoint**: `GET /api/setors?sort={sort}&page={page}&size={size}&eagerload={eagerload}`
   - **Uso**: Buscar todos os setores disponíveis (com assistentes se eagerload=true)
   - **Retorno**: `SetorDTO[]` (filtrado para apenas setores ativos)

2. **Buscar Setor por ID**
   - **Método**: `getSetorById(id: number, eagerload: boolean = true)`
   - **Endpoint**: `GET /api/setors/{id}` (ou via getAllSetors se eagerload=true)
   - **Uso**: Buscar setor específico com relacionamentos
   - **Retorno**: `SetorDTO`

##### `WizardStateService` (Opcional)
**Localização**: `src/app/services/wizard-state.service.ts`

**Uso**: 
- Pode ser reutilizado para gerenciamento de estado
- Ou criar novo serviço específico para o formulário
- **Decisão**: Avaliar se vale a pena criar `FormularioOrcamentoStateService` separado

#### Novo Serviço (Opcional)
- `FormularioOrcamentoService` - Lógica específica do formulário
  - Validações complexas
  - Transformação de dados
  - Gerenciamento de estado do formulário
  - Coordenação entre subcomponentes

#### Resumo de Endpoints por Funcionalidade

| Funcionalidade | Serviço | Método | Endpoint |
|----------------|---------|--------|----------|
| **Consultar CNPJ** | `CnpjService` | `consultarCNPJ` | `GET /api/custom/cnpj/{cnpj}` |
| **Listar Setores** | `SetorService` | `getAllSetors` | `GET /api/setors?sort={sort}&page={page}&size={size}&eagerload={eagerload}` |
| **Buscar Setor** | `SetorService` | `getSetorById` | `GET /api/setors/{id}` |
| **Listar Assistentes** | `PlanoService` | `getAssistentes` | `GET /api/assistentes?sort={sort}&eagerload={eagerload}` |
| **Assistentes por Setores** | `PlanoService` | `getAssistentesPorSetores` | `GET /api/custom/assistentes?setorIds={ids}&eagerload=true` |
| **Listar Canais** | `PlanoService` | `getCanals` | `GET /api/canals?sort={sort}` |
| **Listar Infraestruturas** | `PlanoService` | `getInfraestruturas` | `GET /api/infraestruturas?sort={sort}` |
| **Listar Períodos** | `PlanoService` | `getPeriodosContratacao` | `GET /api/periodo-contratacaos?sort={sort}` |
| **Simular Plano** | `PlanoService` | `simularGeracao` | `POST /api/custom/planos/simular-geracao` |
| **Criar Orçamento** | `OrcamentoService` | `create` | `POST /api/custom/orcamentos/com-itens` |
| **Atualizar Orçamento** | `OrcamentoService` | `update` | `PUT /api/custom/orcamentos/com-itens/{id}` |
| **Buscar Orçamento (Hash)** | `OrcamentoService` | `getByHashComItens` | `GET /api/custom/orcamentos/hash/{hash}/com-itens` |
| **Listar Vendedores** | `PlanoService` | `getVendedors` | `GET /api/vendedors?sort={sort}&page={page}&size={size}` |

#### Fluxo de Chamadas dos Endpoints

**Etapa 1: Dados do Cliente**
1. Usuário preenche CNPJ → `CnpjService.consultarCNPJ()` → Pré-seleciona setor sugerido

**Etapa 2: Configuração do Plano**

2. **Ao carregar a etapa**:
   - `SetorService.getAllSetors()` → Lista todos os setores disponíveis
   - Se CNPJ foi preenchido, setor já está pré-selecionado

3. **Ao selecionar setores**:
   - `PlanoService.getAssistentesPorSetores()` → Busca assistentes dos setores selecionados
   - Ou `SetorService.getSetorById()` para cada setor (com eagerload) → Para obter assistentes

4. **Ao configurar assistentes**:
   - `PlanoService.getAssistentes()` → Se precisar buscar detalhes completos dos assistentes

5. **Ao configurar canais**:
   - `PlanoService.getCanals()` → Lista todos os canais disponíveis

6. **Ao selecionar infraestrutura**:
   - `PlanoService.getInfraestruturas()` → Lista todas as infraestruturas disponíveis

7. **Após selecionar infraestrutura (primeira vez com tudo completo)**:
   - `PlanoService.simularGeracao()` → Calcula valores do plano

8. **Ao alterar configurações que afetam preço**:
   - `PlanoService.simularGeracao()` → Recalcula valores

9. **Ao selecionar período**:
   - `PlanoService.getPeriodosContratacao()` → Lista períodos disponíveis
   - Valores já calculados pela simulação anterior

**Etapa 3: Revisão e Finalização**

10. **Ao finalizar**:
    - `PlanoService.getVendedors()` → Busca vendedor tipo 'SISTEMA_IA'
    - `OrcamentoService.create()` → Cria orçamento na API

**Modo de Edição** (quando `?hash=XXX&action=edit`):

11. **Ao carregar para edição**:
    - `OrcamentoService.getByHashComItens()` → Busca orçamento completo
    - Preenche formulário com dados salvos
    - `SetorService.getAllSetors()` → Para validar setores
    - `PlanoService.getAssistentes()` → Para validar assistentes
    - `PlanoService.getCanals()` → Para validar canais
    - `PlanoService.simularGeracao()` → Recalcula valores atualizados

12. **Ao salvar edição**:
    - `OrcamentoService.update()` → Atualiza orçamento na API

---

## 7. Fluxo de Navegação

### 7.1. Opção A: Formulário em Uma Página (Scroll)

#### Características
- Todas as seções visíveis na mesma página
- Scroll suave entre seções
- Validação em tempo real
- Botão "Finalizar" fixo no final ou flutuante

#### Vantagens
- Visão geral completa
- Usuário controla o ritmo
- Fácil navegação

#### Desvantagens
- Pode ser longo em telas pequenas
- Requer scroll para ver tudo

### 7.2. Opção B: Formulário em Etapas (Stepper)

#### Características
- Stepper com 3 etapas principais
- Navegação: Botões "Anterior" / "Próximo"
- Validação por etapa
- Indicador de progresso

#### Vantagens
- Foco em uma etapa por vez
- Menos sobrecarga visual
- Bom para mobile

#### Desvantagens
- Menos visibilidade geral
- Requer navegação explícita

### 7.3. Opção C: Accordion/Abas

#### Características
- Seções em accordion ou abas
- Usuário escolhe a ordem de preenchimento
- Validação ao tentar avançar

#### Vantagens
- Flexibilidade para o usuário
- Organização clara

#### Desvantagens
- Pode confundir usuários menos experientes
- Requer indicação clara de progresso

### 7.4. Recomendação e Decisão

**✅ DECISÃO: Utilizar Opção B (Stepper)**

**Justificativa**:
- Melhor experiência em mobile
- Foco claro em cada etapa
- Validação progressiva
- Indicador de progresso visual
- Reduz sobrecarga cognitiva do usuário
- Facilita validação por etapas

**Estrutura do Stepper**:
- **Etapa 1**: Dados do Cliente
- **Etapa 2**: Configuração do Plano
  - Sub-etapas internas (Setores → Assistentes → Canais → Infraestrutura → Período)
- **Etapa 3**: Revisão e Finalização

**Navegação**:
- Botões "Anterior" / "Próximo" entre etapas principais
- Validação ao tentar avançar
- Indicador de progresso (ex: "Etapa 1 de 3")
- Possibilidade de voltar para editar etapas anteriores

---

## 8. Funcionalidades Extras

### 8.1. Modo de Edição

#### Carregamento de Orçamento Existente
- **Rota**: `/formulario-orcamento?hash=XXX&action=edit`
- **Processo**:
  1. Buscar orçamento por hash (`OrcamentoService.getByHashComItens`)
  2. Preencher formulário com dados salvos
  3. Restaurar estado completo:
     - Dados do cliente
     - Setores selecionados
     - Assistentes e quantidades
     - Canais configurados
     - Infraestrutura
     - Período
  4. Executar simulação para atualizar valores

#### Permissões de Edição
- Permitir edição de qualquer campo
- Recalcular simulação automaticamente ao alterar:
  - Assistentes
  - Canais
  - Infraestrutura
- Atualizar orçamento na API ao finalizar

### 8.2. Salvamento Automático

#### Estratégia
- Salvar estado no **Firebase** ou **localStorage**
- Restaurar ao retornar à página
- Evitar perda de dados em caso de fechamento acidental

#### Quando Salvar
- Ao preencher cada campo
- Ao alterar seleções
- Periodicamente (debounce de 2-3 segundos)

### 8.3. Feedback Visual

#### Indicadores de Campos Obrigatórios
- Asterisco (*) vermelho
- Label destacado

#### Mensagens de Erro
- Contextuais (próximo ao campo)
- Cores: Vermelho para erro, amarelo para aviso
- Ícones apropriados

#### Loading States
- Spinner durante:
  - Consulta de CNPJ
  - Busca de dados da API
  - Cálculo de simulação
  - Submissão do formulário

#### Confirmações
- Antes de ações críticas:
  - Remover setor com assistentes configurados
  - Finalizar orçamento
  - Sair sem salvar

---

## 9. Diferenças do Wizard Atual

| Aspecto | Wizard (Chat) | Formulário Consolidado |
|---------|---------------|------------------------|
| **Interface** | Chat conversacional com Eva | Formulário tradicional |
| **Navegação** | Passo a passo guiado pela assistente | Usuário controla a navegação |
| **Experiência** | Interativa, personalizada | Autônoma, direta |
| **Validação** | Por passo, com feedback da Eva | Em tempo real ou por seção |
| **Uso Ideal** | Primeira vez, precisa de orientação | Usuários experientes, edição rápida |
| **Tempo de Preenchimento** | Mais longo (conversacional) | Mais rápido (direto) |
| **Flexibilidade** | Ordem fixa de passos | Pode pular seções (com validação) |

---

## 10. Considerações de Implementação

### 10.1. Reutilização de Código

#### Componentes Reutilizáveis
- ✅ `WizardStepAssistantsComponent` - Adaptar para funcionar fora do contexto do chat
- ✅ `WizardStepChannelsComponent` - Adaptar para formulário
- ✅ `WizardStepInfrastructureComponent` - Reutilizar diretamente
- ✅ `WizardStepPeriodComponent` - Reutilizar diretamente

#### Lógica de Negócio
- ✅ Manter lógica nos serviços existentes
- ✅ Reutilizar métodos de validação
- ✅ Reutilizar transformações de dados

### 10.2. Performance

#### Otimizações
- **Lazy Loading**: Carregar dados da API sob demanda
- **Cache**: Cachear setores, assistentes, canais (evitar múltiplas chamadas)
- **Debounce**: Em campos de busca/filtro
- **Virtual Scrolling**: Se listas forem muito longas

### 10.3. Acessibilidade

#### Requisitos
- ✅ Labels descritivos em todos os campos
- ✅ Navegação por teclado (Tab, Enter, Esc)
- ✅ Feedback para leitores de tela (ARIA labels)
- ✅ Contraste adequado de cores
- ✅ Foco visível em elementos interativos

---

## 11. Estrutura de Dados do Formulário

### 11.1. Interface TypeScript

```typescript
interface FormularioOrcamento {
  // Dados do Cliente
  nome: string;
  email: string;
  telefone?: string;
  cnpj?: string;
  empresaData?: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    situacaoCadastral?: string;
  };
  
  // Configuração
  setores: number[]; // IDs dos setores selecionados
  assistentes: Array<{
    id: number;
    nome: string;
    quantity: number;
    sector: string;
  }>;
  canais: Array<{
    id: number;
    nome: string;
    enabled: boolean;
  }>;
  assistantChannels: Array<{
    assistantId: number;
    channelId: number;
    enabled: boolean;
  }>;
  infrastructure: number | null;
  monthlyCredits: number;
  tokensOpenAi: number;
  selectedPeriod: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null;
  
  // Resultado da simulação
  resultadoSimulacao?: PlanoSimulacaoResponse;
}
```

### 11.2. Transformação para OrcamentoDTO

```typescript
converterParaOrcamentoDTO(
  formData: FormularioOrcamento,
  periodoData: PeriodoContratacao | null,
  vendedorId: number
): OrcamentoDTO {
  // Lógica de conversão similar ao Wizard
  // Incluir todos os campos necessários
}
```

---

## 12. Próximos Passos de Implementação

### Fase 1: Estrutura Base
1. ✅ Criar módulo e rota do formulário
2. ✅ Criar componente principal `FormularioOrcamentoComponent`
3. ✅ Configurar Reactive Forms
4. ✅ Criar estrutura básica de seções

### Fase 2: Seção 1 - Dados do Cliente
1. ✅ Criar `DadosClienteComponent`
2. ✅ Implementar campos: Nome, Email, Telefone
3. ✅ Implementar campo CNPJ com máscara
4. ✅ Integrar consulta automática de CNPJ
5. ✅ Validações e feedback visual

### Fase 3: Seção 2 - Configuração do Plano
1. ✅ Criar subcomponentes:
   - `SetoresSelectorComponent`
   - `AssistentesSelectorComponent`
   - `CanaisConfigComponent`
   - `InfraestruturaSelectorComponent`
   - `PeriodoSelectorComponent`
2. ✅ Integrar com APIs
3. ✅ Implementar validações e dependências
4. ✅ Implementar simulação automática

### Fase 4: Seção 3 - Revisão e Finalização
1. ✅ Criar `ResumoOrcamentoComponent`
2. ✅ Exibir resumo do plano
3. ✅ Exibir resumo financeiro
4. ✅ Implementar botão de finalização
5. ✅ Integrar com `OrcamentoService.create()`

### Fase 5: Funcionalidades Extras
1. ✅ Implementar modo de edição
2. ✅ Implementar salvamento automático
3. ✅ Melhorar feedback visual
4. ✅ Testes e ajustes de UX

### Fase 6: Polimento
1. ✅ Ajustes de responsividade (mobile)
2. ✅ Melhorias de acessibilidade
3. ✅ Otimizações de performance
4. ✅ Testes finais

---

## 13. Notas Finais

### Decisões Pendentes
- [ ] Escolher tipo de navegação (Stepper recomendado)
- [ ] Decidir se Volume será editável ou oculto
- [ ] Definir estratégia de salvamento automático (Firebase vs localStorage)
- [ ] Decidir se reutiliza `WizardStateService` ou cria novo serviço

### Considerações Futuras
- Possibilidade de salvar rascunhos
- Histórico de orçamentos do usuário
- Comparação entre múltiplos orçamentos
- Exportação em PDF

---

**Documento criado em**: 2024  
**Versão**: 1.0  
**Autor**: Planejamento baseado na análise do Wizard existente

