# Roteiro de Testes End-to-End da API

Este documento contém um roteiro completo e detalhado de testes end-to-end para a API, baseado nos endpoints utilizados pela aplicação web.

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Fluxo 1: Autenticação](#fluxo-1-autenticação)
3. [Fluxo 2: Criação Completa de Orçamento](#fluxo-2-criação-completa-de-orçamento)
4. [Fluxo 3: Edição de Orçamento Existente](#fluxo-3-edição-de-orçamento-existente)
5. [Fluxo 4: Visualização de Orçamento](#fluxo-4-visualização-de-orçamento)
6. [Testes de Endpoints Individuais](#testes-de-endpoints-individuais)
7. [Testes de Validação e Erros](#testes-de-validação-e-erros)
8. [Checklist Final](#checklist-final)

---

## Configuração Inicial

### Variáveis de Ambiente
```bash
BASE_URL=http://localhost:9000  # ou a URL da API em produção
API_URL=${BASE_URL}/api
USERNAME=admin
PASSWORD=admin
```

### Headers Padrão
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

### Token de Autenticação
- Armazenar o token JWT retornado no login
- Incluir no header: `Authorization: Bearer {token}`

---

## Fluxo 1: Autenticação

### 1.1 Login com Credenciais Válidas

**Endpoint:** `POST /api/authenticate/context`

**Request:**
```json
{
  "username": "admin",
  "password": "admin",
  "rememberMe": false
}
```

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém `id_token`
- ✅ Token é válido (não vazio, formato JWT)
- ✅ Response pode conter informações do usuário

**Exemplo de Response Esperado:**
```json
{
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "login": "admin",
    "email": "admin@example.com"
  }
}
```

### 1.2 Login com Credenciais Inválidas

**Request:**
```json
{
  "username": "admin",
  "password": "senha_errada",
  "rememberMe": false
}
```

**Validações:**
- ✅ Status Code: 401 (Unauthorized)
- ✅ Mensagem de erro apropriada

### 1.3 Verificar Autenticação

**Endpoint:** `GET /api/authenticate`

**Headers:**
```
Authorization: Bearer {token}
```

**Validações:**
- ✅ Status Code: 200 (se autenticado)
- ✅ Status Code: 401 (se token inválido/expirado)

---

## Fluxo 2: Criação Completa de Orçamento

Este fluxo testa o processo completo de criação de um orçamento, desde a busca de dados até a confirmação.

### 2.1 Buscar Infraestruturas Disponíveis

**Endpoint:** `GET /api/infraestruturas?sort=id,asc`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array
- ✅ Cada item contém: `id`, `nome`, `descricao`, `precoMensal`, `precoSetup`
- ✅ Ordenação está correta (id,asc)

### 2.2 Buscar Setores Disponíveis

**Endpoint:** `GET /api/setors?sort=id,asc&page=0&size=100&eagerload=true`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array ou objeto com `content` (array)
- ✅ Apenas setores com `ativo !== false` são retornados
- ✅ Cada setor contém: `id`, `nome`, `ativo`
- ✅ Se `eagerload=true`, deve incluir relacionamentos (assistentes, agentes)

### 2.3 Buscar Assistentes por Setores

**Endpoint:** `GET /api/custom/assistentes?setorIds=1&setorIds=2&eagerload=true`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array de assistentes
- ✅ Apenas assistentes dos setores especificados são retornados
- ✅ Cada assistente contém: `id`, `nome`, `setors` ou `setores`
- ✅ Se `eagerload=true`, deve incluir relacionamentos

### 2.4 Buscar Todos os Assistentes

**Endpoint:** `GET /api/assistentes?sort=id,asc&eagerload=true`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array
- ✅ Cada assistente contém informações completas

### 2.5 Buscar Canais Disponíveis

**Endpoint:** `GET /api/canals?sort=id,asc`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array
- ✅ Cada canal contém: `id`, `nome`, `descricao`

### 2.6 Buscar Períodos de Contratação

**Endpoint:** `GET /api/periodo-contratacaos?sort=id,asc`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array
- ✅ Cada período contém: `id`, `codigo`, `nome`, `meses`, `tipoDesconto`, `valorDesconto`, `ativo`
- ✅ Apenas períodos ativos devem ser considerados

### 2.7 Buscar Vendedores

**Endpoint:** `GET /api/vendedors?sort=id,asc&page=0&size=20`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array ou objeto com `content`
- ✅ Deve existir um vendedor com `tipo === 'SISTEMA_IA'`
- ✅ Cada vendedor contém: `id`, `nome`, `tipo`

### 2.8 Consultar CNPJ (Opcional)

**Endpoint:** `GET /api/custom/cnpj/{cnpj}`

**Exemplo:** `GET /api/custom/cnpj/46418343000171`

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém dados da empresa:
  - `cnpj`
  - `razaoSocial`
  - `nomeFantasia`
  - `situacaoCadastral`
  - `setorSugerido` (opcional)

### 2.9 Simular Geração de Plano

**Endpoint:** `POST /api/custom/planos/simular-geracao`

**Request:**
```json
{
  "nomePlano": "Plano Personalizado",
  "itens": [
    {
      "tipoItem": "INFRAESTRUTURA",
      "referenciaId": 1,
      "quantidade": 1
    },
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": 1,
      "quantidade": 2
    },
    {
      "tipoItem": "CANAL",
      "referenciaId": 1,
      "quantidade": 1
    }
  ],
  "consumoEstimado": {
    "tokensOpenAi": 1000000,
    "mensagensWhatsapp": 1000
  }
}
```

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém:
  - `valorMensalTotal`
  - `valorSetupTotal`
  - `itens` (array com detalhes de cada item)
- ✅ Cada item na response contém:
  - `tipoItem`
  - `referenciaId`
  - `nomeComponente`
  - `quantidade`
  - `valorUnitarioMensal`
  - `subtotalMensal`
  - `subtotalSetup`

### 2.10 Criar Orçamento Completo

**Endpoint:** `POST /api/custom/orcamentos/com-itens`

**Request:**
```json
{
  "status": "RASCUNHO",
  "valorTotalTabela": 5000.00,
  "valorTotalMinimo": 0,
  "valorTotalFechado": 4500.00,
  "percentualDescontoAplicado": 10.0,
  "nomeProspect": "Elton Gonçalves",
  "emailProspect": "elton.jd.goncalves@gmail.com",
  "telefoneProspect": "(91) 98353-8941",
  "infraestrutura": {
    "id": 1
  },
  "vendedor": {
    "id": 1
  },
  "empresaDadosCnpj": {
    "cnpj": "46418343000171",
    "razaoSocial": "Empresa Exemplo LTDA",
    "nomeFantasia": "Empresa Exemplo",
    "situacaoCadastral": "ATIVA",
    "emailFinanceiro": "elton.jd.goncalves@gmail.com"
  },
  "itens": [
    {
      "tipoItem": "INFRAESTRUTURA",
      "referenciaId": 1,
      "descricao": "Infraestrutura Básica",
      "quantidade": 1,
      "precoUnitarioTabela": 1000.00,
      "precoUnitarioFechado": 1000.00,
      "totalMensalFechado": 1000.00,
      "totalSetupFechado": 500.00
    },
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": 1,
      "descricao": "Assistente Virtual",
      "quantidade": 2,
      "precoUnitarioTabela": 1500.00,
      "precoUnitarioFechado": 1500.00,
      "totalMensalFechado": 3000.00,
      "totalSetupFechado": 0.00
    },
    {
      "tipoItem": "CANAL",
      "referenciaId": 1,
      "descricao": "WhatsApp",
      "quantidade": 1,
      "precoUnitarioTabela": 500.00,
      "precoUnitarioFechado": 500.00,
      "totalMensalFechado": 500.00,
      "totalSetupFechado": 0.00
    }
  ]
}
```

**Validações:**
- ✅ Status Code: 200 ou 201
- ✅ Response contém:
  - `id` (ID do orçamento criado)
  - `codigoHash` (hash único para compartilhamento)
  - Todos os campos enviados
  - `dataCriacao` ou `createdDate`
- ✅ O `codigoHash` não é vazio e tem formato válido
- ✅ Todos os itens foram salvos corretamente

---

## Fluxo 3: Edição de Orçamento Existente

### 3.1 Buscar Orçamento por Hash com Itens

**Endpoint:** `GET /api/custom/orcamentos/hash/{codigoHash}/com-itens`

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém:
  - `orcamento`: objeto com dados do orçamento
  - `itens`: array com todos os itens do orçamento
- ✅ O orçamento contém: `id`, `codigoHash`, `status`, valores, dados do prospect
- ✅ Cada item contém todos os campos necessários

### 3.2 Buscar Orçamento por Hash (Fallback)

**Endpoint:** `GET /api/orcamentos/hash/{codigoHash}`

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém dados básicos do orçamento
- ✅ Se não tiver itens, deve permitir buscar itens separadamente

### 3.3 Buscar Orçamento por ID com Itens

**Endpoint:** `GET /api/custom/orcamentos/{id}/com-itens`

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém `orcamento` e `itens`
- ✅ Dados estão completos e corretos

### 3.4 Atualizar Orçamento Existente

**Endpoint:** `PUT /api/custom/orcamentos/com-itens/{id}`

**Request:** (mesmo formato do POST, mas com `id` no objeto)

```json
{
  "id": 1,
  "status": "RASCUNHO",
  "valorTotalTabela": 5500.00,
  "valorTotalFechado": 4950.00,
  "percentualDescontoAplicado": 10.0,
  "nomeProspect": "Elton Gonçalves Atualizado",
  "emailProspect": "elton.jd.goncalves@gmail.com",
  "telefoneProspect": "(91) 98353-8941",
  "infraestrutura": {
    "id": 1
  },
  "vendedor": {
    "id": 1
  },
  "itens": [
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": 1,
      "descricao": "Assistente Virtual",
      "quantidade": 3,
      "precoUnitarioTabela": 1500.00,
      "precoUnitarioFechado": 1500.00,
      "totalMensalFechado": 4500.00,
      "totalSetupFechado": 0.00
    }
  ]
}
```

**Validações:**
- ✅ Status Code: 200
- ✅ Response contém o orçamento atualizado
- ✅ Valores foram recalculados corretamente
- ✅ Itens foram atualizados/removidos/adicionados conforme esperado
- ✅ `codigoHash` permanece o mesmo (ou é atualizado se necessário)

### 3.5 Teste de Edição Parcial

**Cenário:** Alterar apenas a quantidade de um item

**Validações:**
- ✅ Apenas o item alterado é modificado
- ✅ Valores totais são recalculados corretamente
- ✅ Outros itens permanecem inalterados

---

## Fluxo 4: Visualização de Orçamento

### 4.1 Buscar Orçamento por Hash para Visualização

**Endpoint:** `GET /api/custom/orcamentos/hash/{codigoHash}/com-itens`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados completos do orçamento
- ✅ Todos os itens estão presentes
- ✅ Valores calculados estão corretos

### 4.2 Buscar Orçamento por ID

**Endpoint:** `GET /api/orcamentos/{id}`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados básicos do orçamento
- ✅ Pode ou não incluir itens (depende da implementação)

### 4.3 Listar Todos os Orçamentos

**Endpoint:** `GET /api/orcamentos?sort=id,desc`

**Validações:**
- ✅ Status Code: 200
- ✅ Response é um array
- ✅ Ordenação está correta (id,desc)
- ✅ Cada orçamento contém dados básicos

---

## Testes de Endpoints Individuais

### 5.1 Buscar Setor por ID

**Endpoint:** `GET /api/setors/{id}`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados completos do setor
- ✅ Se `eagerload=true` na busca anterior, deve incluir relacionamentos

### 5.2 Buscar Assistente por ID

**Endpoint:** `GET /api/assistentes/{id}`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados completos do assistente

### 5.3 Buscar Canal por ID

**Endpoint:** `GET /api/canals/{id}`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados completos do canal

### 5.4 Buscar Infraestrutura por ID

**Endpoint:** `GET /api/infraestruturas/{id}`

**Validações:**
- ✅ Status Code: 200
- ✅ Dados completos da infraestrutura

---

## Testes de Validação e Erros

### 6.1 Criar Orçamento sem Itens

**Request:** Orçamento sem array `itens` ou array vazio

**Validações:**
- ✅ Status Code: 400 (Bad Request) ou 422 (Unprocessable Entity)
- ✅ Mensagem de erro apropriada

### 6.2 Criar Orçamento com Item Inválido

**Request:** Item com `referenciaId` inexistente

**Validações:**
- ✅ Status Code: 400 ou 404
- ✅ Mensagem de erro indicando item inválido

### 6.3 Criar Orçamento sem Campos Obrigatórios

**Request:** Sem `infraestrutura`, `vendedor`, ou `nomeProspect`

**Validações:**
- ✅ Status Code: 400
- ✅ Mensagem de erro indicando campos obrigatórios

### 6.4 Buscar Orçamento com Hash Inválido

**Endpoint:** `GET /api/custom/orcamentos/hash/hash_invalido_123/com-itens`

**Validações:**
- ✅ Status Code: 404 (Not Found)
- ✅ Mensagem de erro apropriada

### 6.5 Buscar Orçamento com ID Inexistente

**Endpoint:** `GET /api/orcamentos/999999`

**Validações:**
- ✅ Status Code: 404
- ✅ Mensagem de erro apropriada

### 6.6 Atualizar Orçamento Inexistente

**Endpoint:** `PUT /api/custom/orcamentos/com-itens/999999`

**Validações:**
- ✅ Status Code: 404
- ✅ Mensagem de erro apropriada

### 6.7 Simular Plano com Dados Inválidos

**Request:** Plano sem `itens` ou com `itens` vazio

**Validações:**
- ✅ Status Code: 400
- ✅ Mensagem de erro apropriada

### 6.8 Consultar CNPJ Inválido

**Endpoint:** `GET /api/custom/cnpj/12345678901234`

**Validações:**
- ✅ Status Code: 400 ou 404
- ✅ Mensagem de erro apropriada

### 6.9 Requisições sem Autenticação

**Testar:** Todos os endpoints (exceto login) sem token

**Validações:**
- ✅ Status Code: 401 (Unauthorized)
- ✅ Mensagem de erro apropriada

### 6.10 Requisições com Token Inválido/Expirado

**Headers:** `Authorization: Bearer token_invalido`

**Validações:**
- ✅ Status Code: 401
- ✅ Mensagem de erro apropriada

---

## Testes de Performance e Carga

### 7.1 Tempo de Resposta

**Validações:**
- ✅ Login: < 2 segundos
- ✅ Buscar listas (setores, assistentes, etc.): < 1 segundo
- ✅ Simular plano: < 3 segundos
- ✅ Criar orçamento: < 2 segundos
- ✅ Buscar orçamento: < 1 segundo
- ✅ Atualizar orçamento: < 2 segundos

### 7.2 Paginação

**Testar:** Endpoints com paginação (`page`, `size`)

**Validações:**
- ✅ Parâmetros `page` e `size` funcionam corretamente
- ✅ Resposta contém dados corretos para a página solicitada
- ✅ Valores padrão são aplicados quando parâmetros não são fornecidos

---

## Testes de Integridade de Dados

### 8.1 Consistência de Valores

**Cenário:** Criar orçamento e verificar cálculos

**Validações:**
- ✅ `valorTotalFechado` = soma de `totalMensalFechado` de todos os itens
- ✅ `valorTotalTabela` = soma de `precoUnitarioTabela * quantidade` de todos os itens
- ✅ `percentualDescontoAplicado` está correto baseado no período selecionado
- ✅ Valores de setup são calculados corretamente

### 8.2 Persistência de Dados

**Cenário:** Criar orçamento, buscar, editar, buscar novamente

**Validações:**
- ✅ Dados são persistidos corretamente
- ✅ Alterações são salvas
- ✅ Histórico de alterações (se existir) é mantido

### 8.3 Relacionamentos

**Validações:**
- ✅ Infraestrutura referenciada existe
- ✅ Vendedor referenciado existe
- ✅ Itens com `referenciaId` apontam para entidades válidas
- ✅ Setores dos assistentes estão corretos

---

## Checklist Final

### Autenticação
- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas
- [ ] Verificar autenticação
- [ ] Requisições sem token
- [ ] Requisições com token inválido

### Busca de Dados
- [ ] Buscar infraestruturas
- [ ] Buscar setores
- [ ] Buscar assistentes (todos)
- [ ] Buscar assistentes por setores
- [ ] Buscar canais
- [ ] Buscar períodos de contratação
- [ ] Buscar vendedores
- [ ] Consultar CNPJ

### Simulação
- [ ] Simular plano com dados válidos
- [ ] Simular plano com dados inválidos
- [ ] Verificar cálculos da simulação

### Criação de Orçamento
- [ ] Criar orçamento completo
- [ ] Criar orçamento sem itens (deve falhar)
- [ ] Criar orçamento com item inválido (deve falhar)
- [ ] Criar orçamento sem campos obrigatórios (deve falhar)
- [ ] Verificar hash gerado
- [ ] Verificar persistência dos dados

### Edição de Orçamento
- [ ] Buscar orçamento por hash com itens
- [ ] Buscar orçamento por hash (fallback)
- [ ] Buscar orçamento por ID com itens
- [ ] Atualizar orçamento existente
- [ ] Atualizar apenas quantidade de item
- [ ] Adicionar novo item
- [ ] Remover item
- [ ] Verificar recálculo de valores

### Visualização
- [ ] Buscar orçamento por hash
- [ ] Buscar orçamento por ID
- [ ] Listar todos os orçamentos

### Validações e Erros
- [ ] Hash inválido (404)
- [ ] ID inexistente (404)
- [ ] Dados inválidos (400)
- [ ] Campos obrigatórios faltando (400)

### Performance
- [ ] Tempos de resposta aceitáveis
- [ ] Paginação funcionando

### Integridade
- [ ] Cálculos corretos
- [ ] Relacionamentos válidos
- [ ] Persistência de dados

---

## Ferramentas Recomendadas

### Para Testes Manuais
- **Postman** ou **Insomnia**: Para testar endpoints individualmente
- **cURL**: Para testes via linha de comando
- **Browser DevTools**: Para inspecionar requisições da aplicação

### Para Testes Automatizados
- **Postman Collections**: Criar collection com todos os testes
- **Newman**: Executar collections do Postman via CLI
- **Jest + Supertest**: Para testes automatizados em Node.js
- **Cypress**: Para testes E2E incluindo frontend
- **REST Assured**: Para testes em Java

### Exemplo de Script Postman Collection

```json
{
  "info": {
    "name": "API Orçamentos E2E",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Autenticação",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"admin\",\n  \"password\": \"admin\",\n  \"rememberMe\": false\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/authenticate/context",
              "host": ["{{base_url}}"],
              "path": ["api", "authenticate", "context"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test(\"Response has id_token\", function () {",
                  "    var jsonData = pm.response.json();",
                  "    pm.expect(jsonData).to.have.property('id_token');",
                  "    pm.environment.set('auth_token', jsonData.id_token);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Notas Importantes

1. **Ordem de Execução**: Alguns testes dependem de outros (ex: criar orçamento antes de editar)
2. **Dados de Teste**: Manter dados de teste consistentes ou usar factories
3. **Limpeza**: Limpar dados de teste após execução (ou usar ambiente isolado)
4. **Ambiente**: Testar em ambiente de desenvolvimento/staging antes de produção
5. **Versionamento**: Manter este documento atualizado conforme a API evolui

---

## Contato e Suporte

Para dúvidas ou sugestões sobre este roteiro de testes, consulte a documentação da API ou entre em contato com a equipe de desenvolvimento.

