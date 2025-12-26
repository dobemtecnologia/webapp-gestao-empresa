# Como Verificar e Corrigir o Token de Autenticação no LocalStorage

## 🔍 Problema Identificado

O erro **401 Unauthorized** ao consultar CNPJ indica que o token de autenticação não está sendo enviado ou não existe no localStorage.

## 📋 Verificação no DevTools

### Passo 1: Abrir DevTools
1. Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. Vá para a aba **Application** (ou **Aplicativo**)
3. No painel esquerdo, expanda **Storage** → **Local Storage**
4. Clique em `http://localhost:8100`

### Passo 2: Verificar Chaves Esperadas

Você deve ver as seguintes chaves:

#### ✅ Chaves que DEVEM existir após login:
- **`auth-token`** - Token JWT de autenticação
- **`auth-user`** - Dados do usuário autenticado

#### ⚠️ Chaves que podem existir:
- **`wizard_session_id`** - Sessão do wizard (não relacionado à autenticação)

### Passo 3: Verificar o Token

1. Procure pela chave **`auth-token`**
2. Se **NÃO existir** → O login automático não funcionou
3. Se **existir** → Verifique se o valor não está vazio ou expirado

## 🔧 Soluções

### Solução 1: Limpar e Fazer Login Novamente

1. **Limpar LocalStorage:**
   - No DevTools, clique com botão direito em `http://localhost:8100` (Local Storage)
   - Selecione **Clear** (Limpar)
   - Ou execute no Console: `localStorage.clear()`

2. **Recarregar a página:**
   - Pressione `F5` ou `Ctrl+R` / `Cmd+R`

3. **O login automático deve executar:**
   - O `formulario-orcamento.page.ts` faz login automático no `ngOnInit`
   - Verifique o console para ver se há erros

### Solução 2: Verificar Login Automático no Console

Abra o Console do DevTools e verifique:

1. **Mensagens de erro** relacionadas ao login
2. **Requisições de autenticação** na aba Network
3. **Token sendo salvo** - deve aparecer uma requisição para `/api/authenticate/context`

### Solução 3: Fazer Login Manualmente

Se o login automático não funcionar:

1. Vá para a página de login: `http://localhost:8100/login`
2. Faça login com:
   - **Usuário:** `admin`
   - **Senha:** `admin`
3. Após login, verifique se `auth-token` foi criado no localStorage

### Solução 4: Verificar se o Token Está Sendo Enviado

1. Abra a aba **Network** no DevTools
2. Tente consultar o CNPJ novamente
3. Clique na requisição para `/api/custom/cnpj/...`
4. Vá para a aba **Headers**
5. Procure por **Request Headers** → **Authorization**
6. Deve aparecer: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Se **NÃO aparecer** o header Authorization:
- O token não está sendo enviado
- Verifique se o interceptor está funcionando
- Verifique se o token existe no localStorage

## 🐛 Debug no Console

Execute no Console do DevTools para verificar:

```javascript
// Verificar se o token existe
console.log('Token:', localStorage.getItem('auth-token'));

// Verificar se o usuário está autenticado
console.log('User:', localStorage.getItem('auth-user'));

// Verificar todas as chaves do localStorage
console.log('Todas as chaves:', Object.keys(localStorage));

// Verificar se o token não está vazio
const token = localStorage.getItem('auth-token');
if (token) {
  console.log('Token encontrado:', token.substring(0, 50) + '...');
} else {
  console.log('Token NÃO encontrado!');
}
```

## ✅ Checklist de Verificação

- [ ] LocalStorage contém `auth-token`
- [ ] O valor de `auth-token` não está vazio
- [ ] O token não está expirado (verificar no JWT.io se necessário)
- [ ] O header `Authorization` está sendo enviado nas requisições
- [ ] O login automático está sendo executado (verificar console)
- [ ] Não há erros no console relacionados à autenticação

## 🔄 Fluxo Esperado

1. **Página carrega** → `formulario-orcamento.page.ts` executa `ngOnInit`
2. **Login automático** → Chama `loginAutomatico()`
3. **Requisição POST** → `/api/authenticate/context`
4. **Resposta com token** → `id_token` retornado
5. **Token salvo** → `localStorage.setItem('auth-token', token)`
6. **Próxima requisição** → Interceptor adiciona `Authorization: Bearer {token}`

## 📝 Notas Importantes

- O token é armazenado com a chave **`auth-token`** (não `token` ou `jwt`)
- O token deve começar com `eyJ` (base64 do JWT)
- Se o token expirar, será necessário fazer login novamente
- O login automático usa credenciais: `admin` / `admin`

## 🚨 Problemas Comuns

### Token não está sendo salvo
- Verifique se a API retorna `id_token` na resposta
- Verifique se há erros no console
- Verifique se o `TokenStorageService` está funcionando

### Token está sendo salvo mas não enviado
- Verifique se o `AuthInterceptor` está registrado no `app.module.ts`
- Verifique se o interceptor não está excluindo a rota de CNPJ
- Verifique se o token não está vazio

### Token expirado
- Faça login novamente
- O token JWT geralmente expira após algumas horas
- Verifique a data de expiração no token (pode decodificar em jwt.io)

