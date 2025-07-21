// src/utils/browser-test-helper.ts - Helper para Teste no Browser Console

/**
 * Testa a extração de empresas com os títulos reais mostrados nas imagens
 */
export function testWithRealTitles() {
  console.clear();
  console.log('🧪 TESTE COM TÍTULOS REAIS DAS IMAGENS\n');
  
  // Títulos reais mostrados na Imagem 2 + casos adicionais
  const realTitles = [
    // Casos SEM parênteses (maioria dos casos)
    "122º WCB",
    "28º AGRIVALE", 
    "14º NATURALLY",
    "121º WCB",
    "120º WCB",
    "115º WCB",
    "13º.1 NATURALLY",
    "119º WCB", 
    "114º WCB",
    
    // Casos COM parênteses
    "17º AMZ (IMPORTAÇÃO)",
    "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)",
    
    // Casos adicionais para teste
    "001º TESTE",
    "999º EMPRESA LONGA COM NOME",
    "50º ABC",
    "OUTRA EMPRESA (SEM NUMERO)",
    "123º XYZ (DESCRICAO)",
    "456º MULTI WORD COMPANY"
  ];
  
  console.log('📋 Títulos para teste:', realTitles.length);
  
  // Simular estrutura de dados do Asana
  const mockTrackings = realTitles.map((title, index) => ({
    name: title,
    id: `task_${index}`,
    completed: false
  }));
  
  // Testar extração usando as funções locais (sem import para funcionar no browser)
  const extractedCompanies = testExtractCompanies(mockTrackings);
  
  console.log('\n✅ RESULTADOS:');
  console.log(`📊 Empresas extraídas: ${extractedCompanies.length}`);
  
  extractedCompanies.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name} (${company.displayName})`);
  });
  
  // Testar filtragem
  console.log('\n🔍 TESTE DE FILTRAGEM:');
  const wcbTrackings = mockTrackings.filter(tracking => {
    const company = extractCompanyFromTitle(tracking.name);
    return company === 'WCB';
  });
  
  console.log(`📊 Trackings WCB encontrados: ${wcbTrackings.length}`);
  wcbTrackings.forEach(t => console.log(`  - ${t.name}`));
  
  return { extractedCompanies, totalTitles: realTitles.length };
}

// Função local para testar no browser (cópia das funções principais CORRIGIDA)
function extractCompanyFromTitle(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  const cleanTitle = title.trim();
  
  // Padrão 1: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
  // Captura tudo após "número º" até encontrar "(" ou fim da string
  const pattern1 = /^\d+º(?:\.\d+)?\s+([^(]+?)(?:\s*\(.*)?$/i;
  const match1 = cleanTitle.match(pattern1);
  
  if (match1 && match1[1]) {
    const company = match1[1].trim().toUpperCase();
    // Validar se não é só números ou espaços
    if (company.length >= 2 && !company.match(/^[\d\s]*$/) && company.match(/[A-Z]/)) {
      return company;
    }
  }

  // Padrão 2: "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)" - empresa no início sem número
  // Captura empresa no início até encontrar "(" ou fim da string
  const pattern2 = /^([A-Z][^(]*?)(?:\s*\(.*)?$/i;
  const match2 = cleanTitle.match(pattern2);
  
  if (match2 && match2[1] && !match2[1].match(/^\d/)) {
    const company = match2[1].trim().toUpperCase();
    // Validar tamanho e que contém letras
    if (company.length >= 2 && company.length <= 50 && company.match(/[A-Z]/)) {
      return company;
    }
  }

  // Padrão 3: Fallback - qualquer sequência de letras maiúsculas
  const pattern3 = /([A-Z]{2,}(?:\s+[A-Z]+)*)/;
  const match3 = cleanTitle.match(pattern3);
  
  if (match3 && match3[1]) {
    const company = match3[1].trim().toUpperCase();
    if (company.length >= 2 && company.length <= 30) {
      return company;
    }
  }

  return null;
}

function testExtractCompanies(trackings: any[]) {
  const companySet = new Set<string>();
  
  trackings.forEach(tracking => {
    const title = tracking.name || tracking.title || '';
    const company = extractCompanyFromTitle(title);
    
    if (company) {
      companySet.add(company);
      console.log(`✅ "${title}" → "${company}"`);
    } else {
      console.log(`❌ "${title}" → NÃO EXTRAÍDO`);
    }
  });
  
  return Array.from(companySet).sort().map(name => ({
    id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: name,
    displayName: formatDisplayName(name)
  }));
}

function formatDisplayName(companyName: string): string {
  if (companyName.length <= 6) {
    return companyName;
  }
  
  return companyName
    .split(/[\s&-]+/)
    .map(word => {
      if (word.length <= 3) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Testa conectividade com as APIs
 */
export async function testApiEndpoints() {
  console.clear();
  console.log('🌐 TESTE DE CONECTIVIDADE DAS APIs\n');
  
  const endpoints = [
    '/api/asana/unified',
    '/api/asana/trackings',
    '/api/asana/enhanced-trackings',
    '/api/asana/diagnostic'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔄 Testando: ${endpoint}`);
      
      const start = Date.now();
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      const time = Date.now() - start;
      
      const result = {
        endpoint,
        status: response.status,
        ok: response.ok,
        time: `${time}ms`,
        data: null as any
      };
      
      if (response.ok) {
        try {
          const data = await response.json();
          result.data = {
            success: data.success,
            itemCount: data.data?.length || 0,
            hasData: !!(data.data && data.data.length > 0)
          };
          console.log(`✅ ${endpoint}: OK (${time}ms) - ${result.data.itemCount} items`);
        } catch (e) {
          console.log(`⚠️ ${endpoint}: Resposta não é JSON válido`);
        }
      } else {
        console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
      }
      
      results.push(result);
      
    } catch (error) {
      console.log(`💥 ${endpoint}: ERRO - ${error instanceof Error ? error.message : 'Unknown'}`);
      results.push({
        endpoint,
        status: 'ERROR',
        ok: false,
        time: '0ms',
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }
  
  console.log('\n📊 RESUMO:');
  console.table(results);
  
  return results;
}

/**
 * Executa todos os testes
 */
export async function runFullDiagnosis() {
  console.clear();
  console.log('🚀 DIAGNÓSTICO COMPLETO DO SISTEMA\n');
  
  // 1. Testar extração
  console.log('='.repeat(50));
  console.log('1. TESTE DE EXTRAÇÃO DE EMPRESAS');
  console.log('='.repeat(50));
  const extractionResults = testWithRealTitles();
  
  // 2. Testar APIs
  console.log('\n' + '='.repeat(50));
  console.log('2. TESTE DE CONECTIVIDADE');
  console.log('='.repeat(50));
  const apiResults = await testApiEndpoints();
  
  // 3. Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('3. RESUMO FINAL');
  console.log('='.repeat(50));
  
  const workingApis = apiResults.filter(r => r.ok).length;
  const extractionWorking = extractionResults.extractedCompanies.length > 0;
  
  console.log(`✅ Extração de empresas: ${extractionWorking ? 'FUNCIONANDO' : 'COM PROBLEMAS'}`);
  console.log(`✅ APIs funcionando: ${workingApis}/${apiResults.length}`);
  console.log(`✅ Empresas extraídas: ${extractionResults.extractedCompanies.length}`);
  
  if (workingApis === 0) {
    console.log('\n🚨 PROBLEMA: Nenhuma API está respondendo');
    console.log('💡 Verifique se o servidor está rodando e se o token do Asana está configurado');
  }
  
  if (!extractionWorking) {
    console.log('\n🚨 PROBLEMA: Extração de empresas não está funcionando');
    console.log('💡 Verifique os padrões de regex com os títulos reais');
  }
  
  return {
    extraction: extractionResults,
    apis: apiResults,
    summary: {
      extractionWorking,
      workingApis,
      totalApis: apiResults.length
    }
  };
}

// Auto-disponibilizar no window para uso no console
if (typeof window !== 'undefined') {
  (window as any).testDuriSystem = {
    testWithRealTitles,
    testApiEndpoints, 
    runFullDiagnosis
  };
  
  console.log('🔧 Funções de teste disponíveis no console:');
  console.log('- testDuriSystem.testWithRealTitles()');
  console.log('- testDuriSystem.testApiEndpoints()');
  console.log('- testDuriSystem.runFullDiagnosis()');
}