# Diagnóstico: Erro 504 Gateway Timeout - Consulta CNPJ

## 🔴 Problema Identificado

**Erro:** `504 Gateway Timeout` ao consultar CNPJ  
**URL da Requisição:** `http://localhost:8100/proxy/api/custom/cnpj/46418343000171`  
**Status:** O proxy não consegue se conectar à API na porta 8080

## 📋 Fluxo da Requisição

1. **Frontend (Angular)** → Faz requisição para: `/proxy/api/custom/cnpj/46418343000171`
2. **Proxy (porta 8100)** → Redireciona para: `http://localhost:8080/api/custom/cnpj/46418343000171`
3. **API Backend** → Deveria responder na porta 8080
4. **❌ Problema:** O proxy não consegue alcançar a API (timeout)

## 🔍 Possíveis Causas

### 1. API não está rodando na porta 8080
- **Sintoma:** Timeout ao tentar conectar
- **Solução:** Inicie a API Spring Boot na porta 8080

### 2. API está rodando em outra porta
- **Sintoma:** Timeout, mas a API está rodando
- **Solução:** Verifique em qual porta a API está rodando e atualize o `proxy.conf.json`

### 3. Firewall ou bloqueio de porta
- **Sintoma:** Porta 8080 não acessível
- **Solução:** Verifique configurações de firewall

### 4. Endpoint não existe na API
- **Sintoma:** 404 Not Found (se conseguir conectar)
- **Solução:** Verifique se o endpoint `/api/custom/cnpj/{cnpj}` está implementado

### 5. Timeout muito curto
- **Sintoma:** Timeout antes da API responder
- **Solução:** Já corrigido - aumentado para 30 segundos

## ✅ Correções Aplicadas

### 1. Atualização do `proxy.conf.json`
- ✅ Porta corrigida de 9000 para 8080
- ✅ Timeout aumentado para 30 segundos
- ✅ Adicionado `proxyTimeout` de 30 segundos
- ✅ Adicionado header `Connection: keep-alive`

### 2. Melhorias no Tratamento de Erros
- ✅ Logs detalhados no console
- ✅ Mensagens de erro mais específicas
- ✅ Tratamento para diferentes status HTTP

### 3. Logs Adicionados
- ✅ Logs no `CnpjService` mostrando URL completa
- ✅ Logs no componente mostrando erros detalhados

## 🧪 Como Verificar

### Passo 1: Verificar se a API está rodando

```bash
# Executar o script de verificação
./docs/verificar-api.sh
```

Ou manualmente:

```bash
# Verificar se a porta 8080 está aberta
nc -z localhost 8080

# Testar endpoint diretamente
curl -v http://localhost:8080/api/custom/cnpj/46418343000171
```

### Passo 2: Verificar logs da API

Verifique os logs do Spring Boot para ver se:
- A API está rodando
- O endpoint está registrado
- Há erros ao processar a requisição

### Passo 3: Verificar no navegador

1. Abra o DevTools (F12)
2. Vá para a aba **Network**
3. Tente consultar o CNPJ novamente
4. Verifique:
   - Status da requisição
   - URL completa sendo chamada
   - Headers da requisição
   - Resposta (se houver)

## 🔧 Soluções

### Solução 1: Reiniciar o servidor Angular

O proxy só é carregado quando o servidor inicia. Após alterar o `proxy.conf.json`:

```bash
# Parar o servidor (Ctrl+C)
# Reiniciar
npm start
```

### Solução 2: Verificar se a API está rodando

```bash
# Ver processos na porta 8080
lsof -i :8080

# Ou no Windows
netstat -ano | findstr :8080
```

### Solução 3: Testar endpoint diretamente

Abra no navegador ou use curl:

```bash
# Teste direto (sem proxy)
curl http://localhost:8080/api/custom/cnpj/46418343000171

# Com autenticação (se necessário)
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:8080/api/custom/cnpj/46418343000171
```

### Solução 4: Verificar se o endpoint requer autenticação

Se o endpoint requer autenticação, você precisa:

1. Fazer login primeiro
2. O interceptor adicionará o token automaticamente
3. Tentar consultar o CNPJ novamente

### Solução 5: Usar configuração alternativa (sem proxy)

Se o proxy continuar com problemas, você pode:

1. Alterar `environment.ts` temporariamente:
```typescript
apiUrl: 'http://localhost:8080'
```

2. Configurar CORS na API para permitir `http://localhost:8100`

3. Usar extensão do navegador para desabilitar CORS (apenas desenvolvimento)

## 📝 Checklist de Verificação

- [ ] API está rodando na porta 8080
- [ ] Endpoint `/api/custom/cnpj/{cnpj}` existe na API
- [ ] Servidor Angular foi reiniciado após alterar `proxy.conf.json`
- [ ] Porta 8080 não está bloqueada por firewall
- [ ] Teste direto do endpoint funciona (sem proxy)
- [ ] Logs da API não mostram erros
- [ ] Console do navegador mostra logs detalhados do erro

## 🐛 Debug Avançado

### Ver logs do proxy

O `proxy.conf.json` está configurado com `logLevel: "debug"`. Os logs aparecem no terminal onde você executou `npm start`.

### Verificar requisição completa

No DevTools do navegador:
1. Aba **Network**
2. Clique na requisição que falhou
3. Verifique:
   - **General**: URL, método, status
   - **Headers**: Request e Response headers
   - **Preview/Response**: Resposta da API (se houver)
   - **Timing**: Tempo de cada etapa

### Testar com Postman/Insomnia

Teste diretamente na API (sem passar pelo proxy):

```
GET http://localhost:8080/api/custom/cnpj/46418343000171
Headers:
  Authorization: Bearer {token} (se necessário)
```

## 📞 Próximos Passos

1. Execute o script de verificação: `./docs/verificar-api.sh`
2. Verifique os logs da API Spring Boot
3. Teste o endpoint diretamente com curl
4. Reinicie o servidor Angular
5. Tente consultar o CNPJ novamente
6. Verifique o console do navegador para logs detalhados

## 🔗 Arquivos Relacionados

- `proxy.conf.json` - Configuração do proxy
- `src/environments/environment.ts` - URL base da API
- `src/app/services/cnpj.service.ts` - Serviço de CNPJ
- `src/app/formulario-orcamento/components/dados-cliente.component.ts` - Componente que usa o serviço

