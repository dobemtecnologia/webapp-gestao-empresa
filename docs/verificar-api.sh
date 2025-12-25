#!/bin/bash

# Script para verificar se a API está acessível

echo "=========================================="
echo "  VERIFICAÇÃO DE CONECTIVIDADE DA API"
echo "=========================================="
echo ""

API_URL="http://localhost:8080"
ENDPOINT_CNPJ="${API_URL}/api/custom/cnpj/46418343000171"
ENDPOINT_AUTH="${API_URL}/api/authenticate"

echo "1. Verificando se a API está rodando na porta 8080..."
echo "   URL: ${API_URL}"
echo ""

# Teste 1: Verificar se a porta está aberta
if command -v nc &> /dev/null; then
    if nc -z localhost 8080 2>/dev/null; then
        echo "   ✓ Porta 8080 está aberta"
    else
        echo "   ✗ Porta 8080 NÃO está aberta"
        echo "   → A API pode não estar rodando"
    fi
else
    echo "   ⚠ Comando 'nc' não encontrado. Pulando verificação de porta."
fi

echo ""
echo "2. Testando endpoint de autenticação..."
echo "   URL: ${ENDPOINT_AUTH}"
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${ENDPOINT_AUTH}" 2>/dev/null)
if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "   ✓ Endpoint acessível (Status: $response)"
else
    if [ -z "$response" ]; then
        echo "   ✗ Não foi possível conectar (timeout ou conexão recusada)"
    else
        echo "   ⚠ Status inesperado: $response"
    fi
fi

echo ""
echo "3. Testando endpoint de CNPJ (sem autenticação)..."
echo "   URL: ${ENDPOINT_CNPJ}"
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${ENDPOINT_CNPJ}" 2>/dev/null)
if [ "$response" = "200" ]; then
    echo "   ✓ Endpoint acessível (Status: $response)"
elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "   ⚠ Endpoint requer autenticação (Status: $response)"
elif [ "$response" = "404" ]; then
    echo "   ⚠ Endpoint não encontrado (Status: $response)"
    echo "   → Verifique se o endpoint /api/custom/cnpj/{cnpj} existe na API"
else
    if [ -z "$response" ]; then
        echo "   ✗ Não foi possível conectar (timeout ou conexão recusada)"
        echo "   → Verifique se a API está rodando na porta 8080"
    else
        echo "   ⚠ Status inesperado: $response"
    fi
fi

echo ""
echo "4. Testando endpoint de CNPJ com curl completo (para ver resposta)..."
echo "   URL: ${ENDPOINT_CNPJ}"
echo ""
curl -v --max-time 10 "${ENDPOINT_CNPJ}" 2>&1 | head -20
echo ""

echo "=========================================="
echo "  DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="
echo ""
echo "Se a API não estiver acessível:"
echo "  1. Verifique se a API está rodando:"
echo "     → Procure pelo processo Java/Spring Boot na porta 8080"
echo "  2. Verifique os logs da API"
echo "  3. Confirme que a porta 8080 não está sendo usada por outro processo"
echo ""

