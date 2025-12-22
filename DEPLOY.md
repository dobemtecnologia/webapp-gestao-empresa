# Guia de Deploy - Firebase Hosting

## Pré-requisitos

✅ Firebase CLI já está instalado  
✅ Projeto Firebase já está configurado (`webapp-gestao-empresa`)

## Passos para Deploy

### 1. Autenticar no Firebase (se ainda não estiver autenticado)

```bash
firebase login
```

### 2. Fazer o Build de Produção

```bash
npm run build:prod
```

Isso irá gerar os arquivos otimizados na pasta `www/`.

### 3. Fazer o Deploy

**Opção A: Deploy apenas do Hosting (recomendado)**
```bash
npm run deploy
```
ou
```bash
firebase deploy --only hosting
```

**Opção B: Deploy de tudo (Hosting + Firestore + Storage)**
```bash
npm run deploy:all
```
ou
```bash
firebase deploy
```

### 4. Verificar o Deploy

Após o deploy, você receberá uma URL como:
```
https://webapp-gestao-empresa.web.app
```
ou
```
https://webapp-gestao-empresa.firebaseapp.com
```

## Configurações Aplicadas

- ✅ **Rewrites configurados** para SPA (Single Page Application) - todas as rotas redirecionam para `/index.html`
- ✅ **Cache otimizado** para assets estáticos (JS, CSS, imagens) - 1 ano
- ✅ **Service Worker** com cache desabilitado
- ✅ **Pasta de build**: `www/` (conforme configuração do Angular/Ionic)

## Troubleshooting

### Erro de permissão
Se receber erro de permissão, verifique se está logado:
```bash
firebase login
```

### Erro "Firebase project not found"
Verifique o projeto no arquivo `.firebaserc` e certifique-se que o projeto existe no console do Firebase.

### Build falha
Certifique-se de que todas as dependências estão instaladas:
```bash
npm install
```

### Deploy apenas de arquivos específicos
```bash
# Apenas arquivos alterados (mais rápido)
firebase deploy --only hosting --project webapp-gestao-empresa
```
