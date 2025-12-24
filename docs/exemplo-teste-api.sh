#!/bin/bash

# Script de Exemplo para Testes E2E da API
# Este script demonstra como testar os principais endpoints da API usando cURL

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
BASE_URL="${BASE_URL:-http://localhost:9000}"
API_URL="${BASE_URL}/api"
USERNAME="${USERNAME:-admin}"
PASSWORD="${PASSWORD:-admin}"

# Variáveis globais
AUTH_TOKEN=""
ORCAMENTO_ID=""
ORCAMENTO_HASH=""

# Função para imprimir resultados
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Função para fazer requisições
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    print_info "Testando: $description"
    
    if [ -z "$AUTH_TOKEN" ] && [ "$endpoint" != "/api/authenticate/context" ]; then
        print_error "Token de autenticação não encontrado. Execute o login primeiro."
        return 1
    fi
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$AUTH_TOKEN" ]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}${endpoint}" "${headers[@]}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${endpoint}" "${headers[@]}" -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "${API_URL}${endpoint}" "${headers[@]}" -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "$description (Status: $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "$description (Status: $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Teste 1: Login
test_login() {
    echo ""
    echo "=== TESTE 1: AUTENTICAÇÃO ==="
    
    local login_data=$(cat <<EOF
{
  "username": "$USERNAME",
  "password": "$PASSWORD",
  "rememberMe": false
}
EOF
)
    
    print_info "Fazendo login..."
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/authenticate/context" \
        -H "Content-Type: application/json" \
        -d "$login_data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        AUTH_TOKEN=$(echo "$body" | jq -r '.id_token' 2>/dev/null)
        if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
            print_success "Login realizado com sucesso"
            print_info "Token obtido: ${AUTH_TOKEN:0:50}..."
            return 0
        else
            print_error "Token não encontrado na resposta"
            return 1
        fi
    else
        print_error "Falha no login (Status: $http_code)"
        echo "$body"
        return 1
    fi
}

# Teste 2: Buscar Infraestruturas
test_get_infraestruturas() {
    echo ""
    echo "=== TESTE 2: BUSCAR INFRAESTRUTURAS ==="
    make_request "GET" "/infraestruturas?sort=id,asc" "" "Buscar infraestruturas disponíveis"
}

# Teste 3: Buscar Setores
test_get_setores() {
    echo ""
    echo "=== TESTE 3: BUSCAR SETORES ==="
    make_request "GET" "/setors?sort=id,asc&page=0&size=100&eagerload=true" "" "Buscar setores disponíveis"
}

# Teste 4: Buscar Assistentes
test_get_assistentes() {
    echo ""
    echo "=== TESTE 4: BUSCAR ASSISTENTES ==="
    make_request "GET" "/assistentes?sort=id,asc&eagerload=true" "" "Buscar assistentes disponíveis"
}

# Teste 5: Buscar Canais
test_get_canais() {
    echo ""
    echo "=== TESTE 5: BUSCAR CANAIS ==="
    make_request "GET" "/canals?sort=id,asc" "" "Buscar canais disponíveis"
}

# Teste 6: Buscar Períodos de Contratação
test_get_periodos() {
    echo ""
    echo "=== TESTE 6: BUSCAR PERÍODOS DE CONTRATAÇÃO ==="
    make_request "GET" "/periodo-contratacaos?sort=id,asc" "" "Buscar períodos de contratação"
}

# Teste 7: Buscar Vendedores
test_get_vendedores() {
    echo ""
    echo "=== TESTE 7: BUSCAR VENDEDORES ==="
    make_request "GET" "/vendedors?sort=id,asc&page=0&size=20" "" "Buscar vendedores"
}

# Teste 8: Simular Plano
test_simular_plano() {
    echo ""
    echo "=== TESTE 8: SIMULAR GERAÇÃO DE PLANO ==="
    
    local simulacao_data=$(cat <<EOF
{
  "nomePlano": "Plano Teste E2E",
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
EOF
)
    
    make_request "POST" "/custom/planos/simular-geracao" "$simulacao_data" "Simular geração de plano"
}

# Teste 9: Criar Orçamento
test_criar_orcamento() {
    echo ""
    echo "=== TESTE 9: CRIAR ORÇAMENTO ==="
    
    local orcamento_data=$(cat <<EOF
{
  "status": "RASCUNHO",
  "valorTotalTabela": 5000.00,
  "valorTotalMinimo": 0,
  "valorTotalFechado": 4500.00,
  "percentualDescontoAplicado": 10.0,
  "nomeProspect": "Cliente Teste E2E",
  "emailProspect": "teste@example.com",
  "telefoneProspect": "(91) 99999-9999",
  "infraestrutura": {
    "id": 1
  },
  "vendedor": {
    "id": 1
  },
  "itens": [
    {
      "tipoItem": "INFRAESTRUTURA",
      "referenciaId": 1,
      "descricao": "Infraestrutura Teste",
      "quantidade": 1,
      "precoUnitarioTabela": 1000.00,
      "precoUnitarioFechado": 1000.00,
      "totalMensalFechado": 1000.00,
      "totalSetupFechado": 500.00
    },
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": 1,
      "descricao": "Assistente Teste",
      "quantidade": 2,
      "precoUnitarioTabela": 1500.00,
      "precoUnitarioFechado": 1500.00,
      "totalMensalFechado": 3000.00,
      "totalSetupFechado": 0.00
    },
    {
      "tipoItem": "CANAL",
      "referenciaId": 1,
      "descricao": "Canal Teste",
      "quantidade": 1,
      "precoUnitarioTabela": 500.00,
      "precoUnitarioFechado": 500.00,
      "totalMensalFechado": 500.00,
      "totalSetupFechado": 0.00
    }
  ]
}
EOF
)
    
    print_info "Criando orçamento..."
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/custom/orcamentos/com-itens" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$orcamento_data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "Orçamento criado com sucesso (Status: $http_code)"
        ORCAMENTO_ID=$(echo "$body" | jq -r '.id' 2>/dev/null)
        ORCAMENTO_HASH=$(echo "$body" | jq -r '.codigoHash' 2>/dev/null)
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        
        if [ -n "$ORCAMENTO_ID" ] && [ "$ORCAMENTO_ID" != "null" ]; then
            print_info "ID do orçamento: $ORCAMENTO_ID"
        fi
        if [ -n "$ORCAMENTO_HASH" ] && [ "$ORCAMENTO_HASH" != "null" ]; then
            print_info "Hash do orçamento: $ORCAMENTO_HASH"
        fi
        return 0
    else
        print_error "Falha ao criar orçamento (Status: $http_code)"
        echo "$body"
        return 1
    fi
}

# Teste 10: Buscar Orçamento por Hash
test_get_orcamento_by_hash() {
    echo ""
    echo "=== TESTE 10: BUSCAR ORÇAMENTO POR HASH ==="
    
    if [ -z "$ORCAMENTO_HASH" ]; then
        print_error "Hash do orçamento não disponível. Execute o teste de criação primeiro."
        return 1
    fi
    
    make_request "GET" "/custom/orcamentos/hash/${ORCAMENTO_HASH}/com-itens" "" "Buscar orçamento por hash"
}

# Teste 11: Atualizar Orçamento
test_atualizar_orcamento() {
    echo ""
    echo "=== TESTE 11: ATUALIZAR ORÇAMENTO ==="
    
    if [ -z "$ORCAMENTO_ID" ]; then
        print_error "ID do orçamento não disponível. Execute o teste de criação primeiro."
        return 1
    fi
    
    local update_data=$(cat <<EOF
{
  "id": $ORCAMENTO_ID,
  "status": "RASCUNHO",
  "valorTotalTabela": 5500.00,
  "valorTotalFechado": 4950.00,
  "percentualDescontoAplicado": 10.0,
  "nomeProspect": "Cliente Teste E2E Atualizado",
  "emailProspect": "teste@example.com",
  "telefoneProspect": "(91) 99999-9999",
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
      "descricao": "Assistente Teste",
      "quantidade": 3,
      "precoUnitarioTabela": 1500.00,
      "precoUnitarioFechado": 1500.00,
      "totalMensalFechado": 4500.00,
      "totalSetupFechado": 0.00
    }
  ]
}
EOF
)
    
    make_request "PUT" "/custom/orcamentos/com-itens/${ORCAMENTO_ID}" "$update_data" "Atualizar orçamento"
}

# Função principal
main() {
    echo "=========================================="
    echo "  TESTES END-TO-END DA API - ORÇAMENTOS"
    echo "=========================================="
    echo ""
    echo "Base URL: $BASE_URL"
    echo "API URL: $API_URL"
    echo ""
    
    # Verificar se jq está instalado
    if ! command -v jq &> /dev/null; then
        print_error "jq não está instalado. Instale para melhor visualização dos resultados."
        print_info "No macOS: brew install jq"
        print_info "No Linux: sudo apt-get install jq"
    fi
    
    # Executar testes
    test_login || exit 1
    test_get_infraestruturas
    test_get_setores
    test_get_assistentes
    test_get_canais
    test_get_periodos
    test_get_vendedores
    test_simular_plano
    test_criar_orcamento
    test_get_orcamento_by_hash
    test_atualizar_orcamento
    
    echo ""
    echo "=========================================="
    echo "  TESTES CONCLUÍDOS"
    echo "=========================================="
    
    if [ -n "$ORCAMENTO_ID" ]; then
        echo ""
        print_info "Orçamento criado para testes:"
        print_info "  ID: $ORCAMENTO_ID"
        print_info "  Hash: $ORCAMENTO_HASH"
        print_info "  URL: ${BASE_URL}/resultado-orcamento?hash=${ORCAMENTO_HASH}"
    fi
}

# Executar função principal
main

