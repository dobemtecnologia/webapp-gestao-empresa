# Dados CNAE do IBGE

Esta pasta contém os dados da Classificação Nacional de Atividades Econômicas (CNAE) obtidos da API do IBGE.

## Como usar

### Opção 1: Executar o script Node.js

```bash
cd IBGE
node fetch-cnae.js
```

### Opção 2: Usar npm script (se adicionado ao package.json)

```bash
npm run fetch-cnae
```

## Arquivos gerados

- `cnae-secoes.json` - Seções da CNAE (nível mais alto)
- `cnae-divisoes.json` - Divisões da CNAE
- `cnae-grupos.json` - Grupos da CNAE
- `cnae-classes.json` - Classes da CNAE
- `cnae-subclasses.json` - Subclasses da CNAE (nível mais detalhado)
- `cnae-consolidado.json` - Arquivo com todos os dados consolidados

## Estrutura da CNAE

A CNAE é organizada hierarquicamente:

1. **Seções** (1 dígito) - Ex: A - Agricultura, pecuária, produção florestal, pesca e aquicultura
2. **Divisões** (2 dígitos) - Ex: 01 - Agricultura, pecuária e serviços relacionados
3. **Grupos** (3 dígitos) - Ex: 011 - Cultivo de cereais
4. **Classes** (4 dígitos) - Ex: 0111-3 - Cultivo de arroz
5. **Subclasses** (7 dígitos) - Ex: 0111-3/01 - Cultivo de arroz

## API do IBGE

Documentação completa: https://servicodados.ibge.gov.br/api/docs/

Endpoint usado: `https://servicodados.ibge.gov.br/api/v2/cnae`

## Exemplo de uso dos dados

```javascript
const cnaeData = require('./cnae-consolidado.json');

// Buscar todas as subclasses
const subclasses = cnaeData.dados.subclasses;

// Buscar por código
const cnae = subclasses.find(s => s.id === '0111-3/01');

// Buscar por descrição
const agricultura = subclasses.filter(s => 
  s.descricao.toLowerCase().includes('agricultura')
);
```

## Atualização dos dados

Os dados podem ser atualizados executando o script `fetch-cnae.js` novamente. A data da coleta é registrada no arquivo consolidado.


