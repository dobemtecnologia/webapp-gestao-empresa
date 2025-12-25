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

# IDs dinâmicos (serão preenchidos durante os testes)
INFRAESTRUTURA_ID=""
ASSISTENTE_ID=""
CANAL_ID=""
VENDEDOR_ID=""
PERIODO_ID=""

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
    
    if [ -z "$AUTH_TOKEN" ] && [ "$endpoint" != "/api/authenticate" ] && [ "$endpoint" != "/api/custom/auth/context" ]; then
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
    # Tentar primeiro o endpoint customizado com contexto, depois o padrão
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/custom/auth/context" \
        -H "Content-Type: application/json" \
        -d "$login_data")
    
    # Se falhar, tentar o endpoint padrão do JHipster
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" != "200" ]; then
        print_info "Tentando endpoint padrão /api/authenticate..."
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/authenticate" \
            -H "Content-Type: application/json" \
            -d "$login_data")
    fi
    
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

# Função auxiliar: Buscar primeiro ID de uma entidade
get_first_id() {
    local endpoint=$1
    local response=$(curl -s -X GET "${API_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    # Tentar diferentes formatos de resposta
    local first_id=""
    
    # Formato 1: Array direto
    first_id=$(echo "$response" | jq -r 'if type == "array" and length > 0 then .[0].id else empty end' 2>/dev/null)
    
    # Formato 2: Objeto com content (paginação)
    if [ -z "$first_id" ] || [ "$first_id" == "null" ]; then
        first_id=$(echo "$response" | jq -r 'if .content and (.content | type == "array") and (.content | length > 0) then .content[0].id else empty end' 2>/dev/null)
    fi
    
    # Formato 3: Array dentro de outro objeto
    if [ -z "$first_id" ] || [ "$first_id" == "null" ]; then
        first_id=$(echo "$response" | jq -r 'if type == "object" then (.[] | select(type == "array") | .[0].id) else empty end' 2>/dev/null)
    fi
    
    if [ -n "$first_id" ] && [ "$first_id" != "null" ] && [ "$first_id" != "" ]; then
        echo "$first_id"
        return 0
    fi
    return 1
}

# Teste 2: Buscar Infraestruturas
test_get_infraestruturas() {
    echo ""
    echo "=== TESTE 2: BUSCAR INFRAESTRUTURAS ==="
    local response=$(make_request "GET" "/infraestruturas?sort=id,asc" "" "Buscar infraestruturas disponíveis")
    
    # Extrair primeiro ID
    INFRAESTRUTURA_ID=$(get_first_id "/infraestruturas?sort=id,asc")
    if [ -n "$INFRAESTRUTURA_ID" ]; then
        print_info "Usando infraestrutura ID: $INFRAESTRUTURA_ID"
    else
        print_error "Nenhuma infraestrutura encontrada!"
    fi
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
    
    # Extrair primeiro ID
    ASSISTENTE_ID=$(get_first_id "/assistentes?sort=id,asc&eagerload=true")
    if [ -n "$ASSISTENTE_ID" ]; then
        print_info "Usando assistente ID: $ASSISTENTE_ID"
    else
        print_error "Nenhum assistente encontrado!"
    fi
}

# Teste 5: Buscar Canais
test_get_canais() {
    echo ""
    echo "=== TESTE 5: BUSCAR CANAIS ==="
    make_request "GET" "/canals?sort=id,asc" "" "Buscar canais disponíveis"
    
    # Extrair primeiro ID
    CANAL_ID=$(get_first_id "/canals?sort=id,asc")
    if [ -n "$CANAL_ID" ]; then
        print_info "Usando canal ID: $CANAL_ID"
    else
        print_error "Nenhum canal encontrado!"
    fi
}

# Teste 6: Buscar Períodos de Contratação
test_get_periodos() {
    echo ""
    echo "=== TESTE 6: BUSCAR PERÍODOS DE CONTRATAÇÃO ==="
    make_request "GET" "/periodo-contratacaos?sort=id,asc" "" "Buscar períodos de contratação"
    
    # Extrair primeiro ID
    PERIODO_ID=$(get_first_id "/periodo-contratacaos?sort=id,asc")
    if [ -n "$PERIODO_ID" ]; then
        print_info "Usando período ID: $PERIODO_ID"
    fi
}

# Teste 7: Buscar Vendedores
test_get_vendedores() {
    echo ""
    echo "=== TESTE 7: BUSCAR VENDEDORES ==="
    make_request "GET" "/vendedors?sort=id,asc&page=0&size=20" "" "Buscar vendedores"
    
    # Extrair primeiro ID
    VENDEDOR_ID=$(get_first_id "/vendedors?sort=id,asc&page=0&size=20")
    if [ -n "$VENDEDOR_ID" ]; then
        print_info "Usando vendedor ID: $VENDEDOR_ID"
    else
        print_error "Nenhum vendedor encontrado!"
    fi
}

# Teste 8: Simular Plano
test_simular_plano() {
    echo ""
    echo "=== TESTE 8: SIMULAR GERAÇÃO DE PLANO ==="
    
    # Verificar se temos os IDs necessários
    if [ -z "$INFRAESTRUTURA_ID" ] || [ -z "$ASSISTENTE_ID" ] || [ -z "$CANAL_ID" ]; then
        print_error "IDs necessários não disponíveis. Execute os testes anteriores primeiro."
        return 1
    fi
    
    local simulacao_data=$(cat <<EOF
{
  "nomePlano": "Plano Teste E2E",
  "itens": [
    {
      "tipoItem": "INFRAESTRUTURA",
      "referenciaId": $INFRAESTRUTURA_ID,
      "quantidade": 1
    },
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": $ASSISTENTE_ID,
      "quantidade": 2
    },
    {
      "tipoItem": "CANAL",
      "referenciaId": $CANAL_ID,
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
    
    # Verificar se temos os IDs necessários
    if [ -z "$INFRAESTRUTURA_ID" ] || [ -z "$VENDEDOR_ID" ] || [ -z "$ASSISTENTE_ID" ] || [ -z "$CANAL_ID" ]; then
        print_error "IDs necessários não disponíveis. Execute os testes anteriores primeiro."
        return 1
    fi
    
    # Consultar CNPJ para obter dados da empresa
    print_info "Consultando CNPJ: 46418343000171"
    local cnpj_response=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/custom/cnpj/46418343000171" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    local cnpj_http_code=$(echo "$cnpj_response" | tail -n1)
    local cnpj_body=$(echo "$cnpj_response" | sed '$d')
    
    local empresa_json=""
    if [ "$cnpj_http_code" -ge 200 ] && [ "$cnpj_http_code" -lt 300 ]; then
        print_success "CNPJ consultado com sucesso"
        # Extrair dados da empresa do JSON de resposta
        # Usar uma abordagem mais robusta para lidar com campos opcionais
        empresa_json=$(echo "$cnpj_body" | jq -c '{
            cnpj: (.cnpj // ""),
            razaoSocial: (.razaoSocial // ""),
            nomeFantasia: (.nomeFantasia // ""),
            situacaoCadastral: (.situacaoCadastral // .descricaoSituacaoCadastral // ""),
            emailFinanceiro: (if .contato and .contato.email then .contato.email else "teste@example.com" end)
        }' 2>/dev/null)
        
        if [ -n "$empresa_json" ] && [ "$empresa_json" != "null" ] && [ "$empresa_json" != "{}" ]; then
            print_info "Dados da empresa extraídos com sucesso"
            # Debug: mostrar o JSON extraído
            echo "$empresa_json" | jq '.' 2>/dev/null || echo "$empresa_json"
        else
            print_error "Não foi possível extrair dados da empresa"
            print_info "Resposta da API:"
            echo "$cnpj_body" | jq '.' 2>/dev/null || echo "$cnpj_body"
            empresa_json=""
        fi
    else
        print_error "Falha ao consultar CNPJ (Status: $cnpj_http_code)"
        print_info "Resposta da API:"
        echo "$cnpj_body" | jq '.' 2>/dev/null || echo "$cnpj_body"
        empresa_json=""
    fi
    
    local periodo_json=""
    if [ -n "$PERIODO_ID" ]; then
        periodo_json=",\"periodoId\": $PERIODO_ID"
    fi
    
    local empresa_dados_json=""
    if [ -n "$empresa_json" ] && [ "$empresa_json" != "null" ]; then
        empresa_dados_json=",\"empresaDadosCnpj\": $empresa_json"
    fi
    
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
    "id": $INFRAESTRUTURA_ID
  },
  "vendedor": {
    "id": $VENDEDOR_ID
  }${periodo_json}${empresa_dados_json},
  "itens": [
    {
      "tipoItem": "INFRAESTRUTURA",
      "referenciaId": $INFRAESTRUTURA_ID,
      "descricao": "Infraestrutura Teste",
      "quantidade": 1,
      "precoUnitarioTabela": 1000.00,
      "precoUnitarioFechado": 1000.00,
      "totalMensalFechado": 1000.00,
      "totalSetupFechado": 500.00
    },
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": $ASSISTENTE_ID,
      "descricao": "Assistente Teste",
      "quantidade": 2,
      "precoUnitarioTabela": 1500.00,
      "precoUnitarioFechado": 1500.00,
      "totalMensalFechado": 3000.00,
      "totalSetupFechado": 0.00
    },
    {
      "tipoItem": "CANAL",
      "referenciaId": $CANAL_ID,
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
        
        # Extrair ID e Hash da resposta
        # Tentar diferentes formatos de resposta
        ORCAMENTO_ID=$(echo "$body" | jq -r '.id // empty' 2>/dev/null)
        ORCAMENTO_HASH=$(echo "$body" | jq -r '.codigoHash // empty' 2>/dev/null)
        
        # Se não encontrou no nível raiz, tentar dentro de 'orcamento'
        if [ -z "$ORCAMENTO_ID" ] || [ "$ORCAMENTO_ID" == "null" ] || [ "$ORCAMENTO_ID" == "" ]; then
            ORCAMENTO_ID=$(echo "$body" | jq -r '.orcamento.id // empty' 2>/dev/null)
        fi
        if [ -z "$ORCAMENTO_HASH" ] || [ "$ORCAMENTO_HASH" == "null" ] || [ "$ORCAMENTO_HASH" == "" ]; then
            ORCAMENTO_HASH=$(echo "$body" | jq -r '.orcamento.codigoHash // empty' 2>/dev/null)
        fi
        
        # Debug: mostrar estrutura da resposta se hash não foi encontrado
        if [ -z "$ORCAMENTO_HASH" ] || [ "$ORCAMENTO_HASH" == "null" ] || [ "$ORCAMENTO_HASH" == "" ]; then
            print_info "Estrutura da resposta (para debug):"
            echo "$body" | jq 'keys' 2>/dev/null || echo "$body" | head -n 5
        fi
        
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        
        if [ -n "$ORCAMENTO_ID" ] && [ "$ORCAMENTO_ID" != "null" ]; then
            print_info "ID do orçamento: $ORCAMENTO_ID"
        else
            print_error "Não foi possível extrair o ID do orçamento da resposta"
        fi
        
        if [ -n "$ORCAMENTO_HASH" ] && [ "$ORCAMENTO_HASH" != "null" ]; then
            print_info "Hash do orçamento: $ORCAMENTO_HASH"
        else
            print_error "Não foi possível extrair o hash do orçamento da resposta"
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
    
    if [ -z "$ASSISTENTE_ID" ] || [ -z "$VENDEDOR_ID" ] || [ -z "$INFRAESTRUTURA_ID" ]; then
        print_error "IDs necessários não disponíveis."
        return 1
    fi
    
    local periodo_json=""
    if [ -n "$PERIODO_ID" ]; then
        periodo_json=",\"periodoId\": $PERIODO_ID"
    fi
    
    local update_data=$(cat <<EOF
{
  "id": $ORCAMENTO_ID,
  "status": "RASCUNHO",
  "valorTotalTabela": 5500.00,
  "valorTotalMinimo": 0,
  "valorTotalFechado": 4950.00,
  "percentualDescontoAplicado": 10.0,
  "nomeProspect": "Cliente Teste E2E Atualizado",
  "emailProspect": "teste@example.com",
  "telefoneProspect": "(91) 99999-9999",
  "infraestrutura": {
    "id": $INFRAESTRUTURA_ID
  },
  "vendedor": {
    "id": $VENDEDOR_ID
  }${periodo_json},
  "itens": [
    {
      "tipoItem": "ASSISTENTE",
      "referenciaId": $ASSISTENTE_ID,
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

