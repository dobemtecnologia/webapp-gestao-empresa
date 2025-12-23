/**
 * Script para buscar dados de CNAE da API do IBGE
 * Baseado na API: https://servicodados.ibge.gov.br/api/docs/
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v2/cnae';

// Função para fazer requisição HTTP
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Erro ao parsear JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Função para salvar arquivo JSON
function saveJSON(filename, data) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Arquivo salvo: ${filename} (${data.length} registros)`);
}

// Função principal
async function fetchCNAEData() {
  console.log('🔍 Iniciando busca de dados CNAE do IBGE...\n');

  try {
    // 1. Buscar todas as classes CNAE
    console.log('📥 Buscando classes CNAE...');
    const classes = await fetchJSON(`${IBGE_API_BASE}/classes`);
    saveJSON('cnae-classes.json', classes);
    
    // 2. Buscar todas as subclasses CNAE
    console.log('📥 Buscando subclasses CNAE...');
    const subclasses = await fetchJSON(`${IBGE_API_BASE}/subclasses`);
    saveJSON('cnae-subclasses.json', subclasses);
    
    // 3. Buscar grupos CNAE
    console.log('📥 Buscando grupos CNAE...');
    const grupos = await fetchJSON(`${IBGE_API_BASE}/grupos`);
    saveJSON('cnae-grupos.json', grupos);
    
    // 4. Buscar divisões CNAE
    console.log('📥 Buscando divisões CNAE...');
    const divisoes = await fetchJSON(`${IBGE_API_BASE}/divisoes`);
    saveJSON('cnae-divisoes.json', divisoes);
    
    // 5. Buscar seções CNAE
    console.log('📥 Buscando seções CNAE...');
    const secoes = await fetchJSON(`${IBGE_API_BASE}/secoes`);
    saveJSON('cnae-secoes.json', secoes);
    
    // 6. Criar arquivo consolidado
    console.log('\n📦 Criando arquivo consolidado...');
    const consolidated = {
      metadata: {
        fonte: 'IBGE - Instituto Brasileiro de Geografia e Estatística',
        api: IBGE_API_BASE,
        dataColeta: new Date().toISOString(),
        versao: '2.3'
      },
      estatisticas: {
        totalSecoes: secoes.length,
        totalDivisoes: divisoes.length,
        totalGrupos: grupos.length,
        totalClasses: classes.length,
        totalSubclasses: subclasses.length
      },
      dados: {
        secoes: secoes,
        divisoes: divisoes,
        grupos: grupos,
        classes: classes,
        subclasses: subclasses
      }
    };
    
    saveJSON('cnae-consolidado.json', consolidated);
    
    console.log('\n✨ Busca concluída com sucesso!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Seções: ${secoes.length}`);
    console.log(`   - Divisões: ${divisoes.length}`);
    console.log(`   - Grupos: ${grupos.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Subclasses: ${subclasses.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error.message);
    
    // Tentar método alternativo se a API principal falhar
    console.log('\n🔄 Tentando método alternativo...');
    try {
      // Buscar estrutura completa
      const estrutura = await fetchJSON('https://servicodados.ibge.gov.br/api/v2/cnae/estrutura');
      saveJSON('cnae-estrutura.json', estrutura);
      console.log('✅ Dados de estrutura salvos como alternativa');
    } catch (altError) {
      console.error('❌ Método alternativo também falhou:', altError.message);
      process.exit(1);
    }
  }
}

// Executar
fetchCNAEData();

